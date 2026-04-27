const { Expo } = require('expo-server-sdk');
const prisma = require('../utils/prisma');

const expo = new Expo({ accessToken: process.env.EXPO_ACCESS_TOKEN });

async function sendPushNotifications(messages) {
  const validMessages = messages.filter(
    (msg) => msg.to && Expo.isExpoPushToken(msg.to)
  );

  if (validMessages.length === 0) return;

  const chunks = expo.chunkPushNotifications(validMessages);
  for (const chunk of chunks) {
    try {
      await expo.sendPushNotificationsAsync(chunk);
    } catch (err) {
      console.error('[Notifications] Push error:', err.message);
    }
  }
}

async function notifyCardUpdated(cardId, reason) {
  const card = await prisma.card.findUnique({
    where: { id: cardId },
    select: { title: true },
  });

  if (!card) return;

  const savedUsers = await prisma.userCardInteraction.findMany({
    where: { cardId, saved: true },
    include: { user: { select: { pushToken: true } } },
  });

  const messages = savedUsers
    .filter((i) => i.user.pushToken)
    .map((i) => ({
      to: i.user.pushToken,
      title: 'Luminary — Fact Updated',
      body: `A fact you saved was updated: ${card.title}`,
      data: { cardId, type: 'CARD_UPDATED' },
    }));

  await sendPushNotifications(messages);
}

async function notifyDailyStreak(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { pushToken: true, streakCount: true, preferences: true },
  });

  if (!user?.pushToken) return;

  const prefs = user.preferences || {};
  if (prefs.notificationsEnabled === false) return;

  await sendPushNotifications([
    {
      to: user.pushToken,
      title: 'Keep your streak alive! 🔥',
      body: `You're on a ${user.streakCount}-day streak. Open Luminary to keep it going!`,
      data: { type: 'STREAK_REMINDER', userId },
    },
  ]);
}

async function notifyEditorsForReview(cardId, flagCount) {
  const card = await prisma.card.findUnique({
    where: { id: cardId },
    select: { title: true },
  });

  const editors = await prisma.user.findMany({
    where: { role: { in: ['EDITOR', 'ADMIN'] }, pushToken: { not: null } },
    select: { pushToken: true },
  });

  const messages = editors.map((e) => ({
    to: e.pushToken,
    title: 'Luminary — Card Flagged',
    body: `"${card?.title}" has been flagged ${flagCount} times and needs review.`,
    data: { cardId, type: 'FLAG_REVIEW' },
  }));

  await sendPushNotifications(messages);
}

module.exports = { notifyCardUpdated, notifyDailyStreak, notifyEditorsForReview };
