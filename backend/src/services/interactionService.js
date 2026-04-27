const prisma = require('../utils/prisma');
const { invalidateFeedCache } = require('./feedService');
const { notifyEditorsForReview } = require('./notificationService');

const FLAG_THRESHOLD = 5;

async function markSeen(userId, cardId) {
  await prisma.userCardInteraction.upsert({
    where: { userId_cardId: { userId, cardId } },
    create: { userId, cardId, seenAt: new Date() },
    update: { seenAt: new Date() },
  });
}

async function likeCard(userId, cardId) {
  const existing = await prisma.userCardInteraction.findUnique({
    where: { userId_cardId: { userId, cardId } },
  });

  const liked = !(existing?.liked ?? false);

  const interaction = await prisma.userCardInteraction.upsert({
    where: { userId_cardId: { userId, cardId } },
    create: { userId, cardId, liked, seenAt: new Date() },
    update: { liked },
  });

  await invalidateFeedCache(userId);
  return interaction;
}

async function saveCard(userId, cardId) {
  const existing = await prisma.userCardInteraction.findUnique({
    where: { userId_cardId: { userId, cardId } },
  });

  const saved = !(existing?.saved ?? false);

  const interaction = await prisma.userCardInteraction.upsert({
    where: { userId_cardId: { userId, cardId } },
    create: { userId, cardId, saved, seenAt: new Date() },
    update: { saved },
  });

  return interaction;
}

async function flagCard(userId, cardId, reason) {
  const existingFlag = await prisma.flag.findFirst({
    where: { userId, cardId, resolved: false },
  });

  if (existingFlag) {
    return { message: 'Already flagged', flag: existingFlag };
  }

  const flag = await prisma.flag.create({
    data: { userId, cardId, reason },
  });

  await prisma.userCardInteraction.upsert({
    where: { userId_cardId: { userId, cardId } },
    create: { userId, cardId, flagged: true, flagReason: reason, seenAt: new Date() },
    update: { flagged: true, flagReason: reason },
  });

  const flagCount = await prisma.flag.count({
    where: { cardId, resolved: false },
  });

  if (flagCount >= FLAG_THRESHOLD) {
    await prisma.card.update({
      where: { id: cardId },
      data: { status: 'FLAGGED' },
    });

    await notifyEditorsForReview(cardId, flagCount);
  }

  return { flag, flagCount };
}

async function getSavedCards(userId) {
  const interactions = await prisma.userCardInteraction.findMany({
    where: { userId, saved: true },
    include: {
      card: {
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
        },
      },
    },
    orderBy: { seenAt: 'desc' },
  });

  return interactions.map((i) => i.card).filter(Boolean);
}

module.exports = { markSeen, likeCard, saveCard, flagCard, getSavedCards };
