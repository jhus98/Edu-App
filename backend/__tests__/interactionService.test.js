jest.mock('../src/utils/prisma', () => ({
  userCardInteraction: {
    findUnique: jest.fn(),
    upsert: jest.fn(),
    findMany: jest.fn(),
  },
  flag: {
    findFirst: jest.fn(),
    create: jest.fn(),
    count: jest.fn(),
  },
  card: {
    update: jest.fn(),
    findUnique: jest.fn(),
  },
}));

jest.mock('../src/services/feedService', () => ({
  invalidateFeedCache: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../src/services/notificationService', () => ({
  notifyEditorsForReview: jest.fn().mockResolvedValue(undefined),
}));

const prisma = require('../src/utils/prisma');
const { notifyEditorsForReview } = require('../src/services/notificationService');
const { likeCard, saveCard, flagCard, markSeen, getSavedCards } = require('../src/services/interactionService');

describe('likeCard', () => {
  const userId = 'user-1';
  const cardId = 'card-1';

  beforeEach(() => jest.clearAllMocks());

  it('toggles like on (was false)', async () => {
    prisma.userCardInteraction.findUnique.mockResolvedValue({ liked: false });
    prisma.userCardInteraction.upsert.mockResolvedValue({ liked: true });

    const result = await likeCard(userId, cardId);
    expect(result.liked).toBe(true);
    expect(prisma.userCardInteraction.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ update: { liked: true } })
    );
  });

  it('toggles like off (was true)', async () => {
    prisma.userCardInteraction.findUnique.mockResolvedValue({ liked: true });
    prisma.userCardInteraction.upsert.mockResolvedValue({ liked: false });

    const result = await likeCard(userId, cardId);
    expect(prisma.userCardInteraction.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ update: { liked: false } })
    );
  });

  it('handles first-time like (no existing interaction)', async () => {
    prisma.userCardInteraction.findUnique.mockResolvedValue(null);
    prisma.userCardInteraction.upsert.mockResolvedValue({ liked: true });

    const result = await likeCard(userId, cardId);
    expect(prisma.userCardInteraction.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ create: expect.objectContaining({ liked: true }) })
    );
  });
});

describe('flagCard', () => {
  const userId = 'user-1';
  const cardId = 'card-1';
  const reason = 'Inaccurate information';

  beforeEach(() => jest.clearAllMocks());

  it('creates a flag and returns flag count', async () => {
    prisma.flag.findFirst.mockResolvedValue(null);
    prisma.flag.create.mockResolvedValue({ id: 'flag-1', userId, cardId, reason });
    prisma.userCardInteraction.upsert.mockResolvedValue({});
    prisma.flag.count.mockResolvedValue(2);

    const result = await flagCard(userId, cardId, reason);

    expect(result.flag).toBeDefined();
    expect(result.flagCount).toBe(2);
    expect(prisma.card.update).not.toHaveBeenCalled();
  });

  it('does not create duplicate flag from same user', async () => {
    prisma.flag.findFirst.mockResolvedValue({ id: 'existing-flag' });

    const result = await flagCard(userId, cardId, reason);

    expect(result.message).toBe('Already flagged');
    expect(prisma.flag.create).not.toHaveBeenCalled();
  });

  it('sets card status to FLAGGED when flag count reaches threshold (5)', async () => {
    prisma.flag.findFirst.mockResolvedValue(null);
    prisma.flag.create.mockResolvedValue({ id: 'flag-5', userId, cardId, reason });
    prisma.userCardInteraction.upsert.mockResolvedValue({});
    prisma.flag.count.mockResolvedValue(5);
    prisma.card.update.mockResolvedValue({ id: cardId, status: 'FLAGGED' });

    await flagCard(userId, cardId, reason);

    expect(prisma.card.update).toHaveBeenCalledWith({
      where: { id: cardId },
      data: { status: 'FLAGGED' },
    });
    expect(notifyEditorsForReview).toHaveBeenCalledWith(cardId, 5);
  });

  it('does not flag card when count is below threshold', async () => {
    prisma.flag.findFirst.mockResolvedValue(null);
    prisma.flag.create.mockResolvedValue({ id: 'flag-3', userId, cardId, reason });
    prisma.userCardInteraction.upsert.mockResolvedValue({});
    prisma.flag.count.mockResolvedValue(3);

    await flagCard(userId, cardId, reason);

    expect(prisma.card.update).not.toHaveBeenCalled();
    expect(notifyEditorsForReview).not.toHaveBeenCalled();
  });
});

describe('getSavedCards', () => {
  it('returns cards for saved interactions', async () => {
    const mockSaved = [
      {
        card: { id: 'card-1', title: 'Fact 1', body: 'Body', category: 'SCIENCE', sourceTitle: 'Wikipedia', sourceUrl: 'https://en.wikipedia.org', confidenceScore: 90, version: 1, createdAt: new Date() },
      },
    ];
    prisma.userCardInteraction.findMany.mockResolvedValue(mockSaved);

    const result = await getSavedCards('user-1');

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('card-1');
  });

  it('returns empty array when no saves', async () => {
    prisma.userCardInteraction.findMany.mockResolvedValue([]);

    const result = await getSavedCards('user-1');
    expect(result).toHaveLength(0);
  });
});
