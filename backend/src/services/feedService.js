const prisma = require('../utils/prisma');
const redis = require('../utils/redis');

const FEED_TTL = 300; // 5 minutes

async function getFeed(userId, category = null, cursor = null, limit = 10) {
  const cacheKey = `feed:${userId}:${category || 'all'}:${cursor || 'start'}`;

  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch {
    // Redis unavailable, continue to DB
  }

  const seenCardIds = await prisma.userCardInteraction.findMany({
    where: { userId },
    select: { cardId: true },
  });
  const seenIds = seenCardIds.map((i) => i.cardId);

  const where = {
    status: 'APPROVED',
    id: { notIn: seenIds.length > 0 ? seenIds : ['00000000-0000-0000-0000-000000000000'] },
    ...(category ? { category } : {}),
    ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}),
  };

  const cards = await prisma.card.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit + 1,
    select: {
      id: true,
      title: true,
      body: true,
      sourceTitle: true,
      sourceUrl: true,
      category: true,
      confidenceScore: true,
      version: true,
      createdAt: true,
      approvedAt: true,
    },
  });

  const hasMore = cards.length > limit;
  const items = hasMore ? cards.slice(0, limit) : cards;
  const nextCursor = hasMore ? items[items.length - 1].createdAt.toISOString() : null;

  const result = { cards: items, nextCursor, hasMore };

  try {
    await redis.setex(cacheKey, FEED_TTL, JSON.stringify(result));
  } catch {
    // Redis unavailable
  }

  return result;
}

async function getPersonalisedFeed(userId, cursor = null, limit = 10) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  const prefs = user?.preferences || {};
  const preferredCategories = prefs.categories || [];

  if (preferredCategories.length === 0) {
    return getFeed(userId, null, cursor, limit);
  }

  const interactions = await prisma.userCardInteraction.findMany({
    where: { userId, OR: [{ liked: true }, { saved: true }] },
    include: { card: { select: { category: true } } },
  });

  const categoryCounts = {};
  for (const inter of interactions) {
    const cat = inter.card.category;
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
  }

  const allCategories = [
    'HISTORY', 'SCIENCE', 'SPACE', 'NATURE',
    'GEOGRAPHY', 'PHILOSOPHY', 'TECHNOLOGY', 'ART',
  ];

  const discoveryCategories = allCategories.filter(
    (c) => !preferredCategories.includes(c)
  );

  const preferredCount = Math.ceil(limit * 0.7);
  const discoveryCount = limit - preferredCount;

  const [preferred, discovery] = await Promise.all([
    getFeed(userId, null, cursor, preferredCount * 2),
    discoveryCategories.length > 0
      ? getFeed(userId, discoveryCategories[Math.floor(Math.random() * discoveryCategories.length)], cursor, discoveryCount * 2)
      : Promise.resolve({ cards: [], hasMore: false }),
  ]);

  const preferredFiltered = preferred.cards
    .filter((c) => preferredCategories.includes(c.category))
    .slice(0, preferredCount);

  const discoveryFiltered = discovery.cards.slice(0, discoveryCount);

  const combined = [...preferredFiltered, ...discoveryFiltered]
    .sort(() => Math.random() - 0.5)
    .slice(0, limit);

  return {
    cards: combined,
    nextCursor: preferred.nextCursor,
    hasMore: preferred.hasMore || discovery.hasMore,
  };
}

async function invalidateFeedCache(userId) {
  try {
    const keys = await redis.keys(`feed:${userId}:*`);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch {
    // Redis unavailable
  }
}

module.exports = { getFeed, getPersonalisedFeed, invalidateFeedCache };
