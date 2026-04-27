const prisma = require('../utils/prisma');
const { notifyCardUpdated } = require('./notificationService');

async function getPendingCards() {
  return prisma.card.findMany({
    where: { status: 'PENDING_HUMAN' },
    orderBy: { createdAt: 'asc' },
    include: {
      verifications: { orderBy: { createdAt: 'desc' } },
    },
  });
}

async function approveCard(cardId, editorId) {
  return prisma.card.update({
    where: { id: cardId },
    data: {
      status: 'APPROVED',
      approvedById: editorId,
      approvedAt: new Date(),
    },
  });
}

async function rejectCard(cardId, editorId, reason) {
  const card = await prisma.card.update({
    where: { id: cardId },
    data: { status: 'REJECTED' },
  });

  await prisma.verificationLog.create({
    data: {
      cardId,
      checkType: 'AI_FACTCHECK',
      passed: false,
      details: { rejectedBy: editorId, reason, rejectedAt: new Date().toISOString() },
    },
  });

  return card;
}

async function updateCard(cardId, editorId, { title, body, sourceTitle, sourceUrl }, reason) {
  const existing = await prisma.card.findUnique({ where: { id: cardId } });
  if (!existing) throw new Error(`Card ${cardId} not found`);

  await prisma.cardVersion.create({
    data: {
      cardId,
      version: existing.version,
      title: existing.title,
      body: existing.body,
      sourceTitle: existing.sourceTitle,
      sourceUrl: existing.sourceUrl,
      reason,
    },
  });

  const updated = await prisma.card.update({
    where: { id: cardId },
    data: {
      title: title ?? existing.title,
      body: body ?? existing.body,
      sourceTitle: sourceTitle ?? existing.sourceTitle,
      sourceUrl: sourceUrl ?? existing.sourceUrl,
      version: existing.version + 1,
      status: 'APPROVED',
      approvedById: editorId,
      approvedAt: new Date(),
    },
  });

  await notifyCardUpdated(cardId, reason);

  return updated;
}

module.exports = { getPendingCards, approveCard, rejectCard, updateCard };
