jest.mock('../src/utils/prisma', () => ({
  userCardInteraction: {
    findMany: jest.fn(),
  },
  card: {
    findMany: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
  },
}));

jest.mock('../src/utils/redis', () => ({
  get: jest.fn(),
  setex: jest.fn(),
  keys: jest.fn(),
  del: jest.fn(),
}));

const prisma = require('../src/utils/prisma');
const redis = require('../src/utils/redis');
const { getFeed, invalidateFeedCache } = require('../src/services/feedService');

const MOCK_CARDS = [
  { id: 'card-1', title: 'Fact 1', body: 'Body 1', category: 'SCIENCE', createdAt: new Date('2024-01-03') },
  { id: 'card-2', title: 'Fact 2', body: 'Body 2', category: 'SPACE', createdAt: new Date('2024-01-02') },
  { id: 'card-3', title: 'Fact 3', body: 'Body 3', category: 'HISTORY', createdAt: new Date('2024-01-01') },
];

describe('getFeed', () => {
  const userId = 'user-uuid-123';

  beforeEach(() => {
    jest.clearAllMocks();
    redis.get.mockResolvedValue(null);
    redis.setex.mockResolvedValue('OK');
    prisma.userCardInteraction.findMany.mockResolvedValue([]);
  });

  it('returns cards from database on cache miss', async () => {
    prisma.card.findMany.mockResolvedValue(MOCK_CARDS.slice(0, 2));

    const result = await getFeed(userId, null, null, 10);

    expect(result.cards).toHaveLength(2);
    expect(result.cards[0].id).toBe('card-1');
    expect(prisma.card.findMany).toHaveBeenCalledTimes(1);
  });

  it('returns cached result on cache hit', async () => {
    const cached = { cards: MOCK_CARDS, nextCursor: null, hasMore: false };
    redis.get.mockResolvedValue(JSON.stringify(cached));

    const result = await getFeed(userId, null, null, 10);

    expect(result.cards).toHaveLength(3);
    expect(prisma.card.findMany).not.toHaveBeenCalled();
  });

  it('excludes already seen cards', async () => {
    prisma.userCardInteraction.findMany.mockResolvedValue([
      { cardId: 'card-1' },
    ]);
    prisma.card.findMany.mockResolvedValue([MOCK_CARDS[1]]);

    await getFeed(userId, null, null, 10);

    const callArgs = prisma.card.findMany.mock.calls[0][0];
    expect(callArgs.where.id.notIn).toContain('card-1');
  });

  it('filters by category when provided', async () => {
    prisma.card.findMany.mockResolvedValue([MOCK_CARDS[0]]);

    await getFeed(userId, 'SCIENCE', null, 10);

    const callArgs = prisma.card.findMany.mock.calls[0][0];
    expect(callArgs.where.category).toBe('SCIENCE');
  });

  it('uses cursor for pagination', async () => {
    const cursor = '2024-01-02T00:00:00.000Z';
    prisma.card.findMany.mockResolvedValue([MOCK_CARDS[2]]);

    await getFeed(userId, null, cursor, 10);

    const callArgs = prisma.card.findMany.mock.calls[0][0];
    expect(callArgs.where.createdAt).toBeDefined();
    expect(callArgs.where.createdAt.lt).toEqual(new Date(cursor));
  });

  it('indicates hasMore when more cards available', async () => {
    const elevenCards = Array.from({ length: 11 }, (_, i) => ({
      id: `card-${i}`,
      title: `Fact ${i}`,
      body: `Body ${i}`,
      category: 'SCIENCE',
      createdAt: new Date(`2024-01-${String(i + 1).padStart(2, '0')}`),
    }));
    prisma.card.findMany.mockResolvedValue(elevenCards);

    const result = await getFeed(userId, null, null, 10);

    expect(result.hasMore).toBe(true);
    expect(result.cards).toHaveLength(10);
    expect(result.nextCursor).toBeDefined();
  });

  it('indicates hasMore:false when fewer cards than limit', async () => {
    prisma.card.findMany.mockResolvedValue(MOCK_CARDS.slice(0, 2));

    const result = await getFeed(userId, null, null, 10);

    expect(result.hasMore).toBe(false);
    expect(result.nextCursor).toBeNull();
  });
});

describe('invalidateFeedCache', () => {
  beforeEach(() => jest.clearAllMocks());

  it('deletes all feed cache keys for user', async () => {
    redis.keys.mockResolvedValue(['feed:user1:all:start', 'feed:user1:SCIENCE:start']);
    redis.del.mockResolvedValue(2);

    await invalidateFeedCache('user1');

    expect(redis.keys).toHaveBeenCalledWith('feed:user1:*');
    expect(redis.del).toHaveBeenCalledWith('feed:user1:all:start', 'feed:user1:SCIENCE:start');
  });

  it('does nothing when no cache keys exist', async () => {
    redis.keys.mockResolvedValue([]);

    await invalidateFeedCache('user1');

    expect(redis.del).not.toHaveBeenCalled();
  });

  it('handles Redis errors gracefully', async () => {
    redis.keys.mockRejectedValue(new Error('Redis down'));

    await expect(invalidateFeedCache('user1')).resolves.not.toThrow();
  });
});
