const cron = require('node-cron');
const { generateCard } = require('../services/contentService');
const { verifyCard } = require('../services/verificationService');
const prisma = require('../utils/prisma');
const { notifyDailyStreak } = require('../services/notificationService');

const CATEGORIES = [
  'HISTORY', 'SCIENCE', 'SPACE', 'NATURE',
  'GEOGRAPHY', 'PHILOSOPHY', 'TECHNOLOGY', 'ART',
];
const CARDS_PER_CATEGORY = 5;
const STAGGER_MS = 500;

async function generateDailyContent() {
  console.log('[Jobs] Starting daily content generation');
  let generated = 0;
  let errors = 0;

  for (const category of CATEGORIES) {
    for (let i = 0; i < CARDS_PER_CATEGORY; i++) {
      await new Promise((resolve) => setTimeout(resolve, STAGGER_MS));
      try {
        const card = await generateCard(category);
        setImmediate(() => verifyCard(card.id).catch((e) => console.error('[Jobs] Verify error:', e.message)));
        generated++;
      } catch (err) {
        console.error(`[Jobs] Generation failed for ${category}:`, err.message);
        errors++;
      }
    }
  }

  console.log(`[Jobs] Daily generation complete: ${generated} cards, ${errors} errors`);
}

async function processVerificationQueue() {
  const cutoff = new Date(Date.now() - 2 * 60 * 1000);

  const stale = await prisma.card.findMany({
    where: { status: 'PENDING_AUTO', createdAt: { lt: cutoff } },
    select: { id: true },
    take: 20,
  });

  if (stale.length === 0) return;

  console.log(`[Jobs] Processing ${stale.length} stale cards`);

  for (const { id } of stale) {
    try {
      await verifyCard(id);
    } catch (err) {
      console.error(`[Jobs] Verification failed for ${id}:`, err.message);
    }
  }
}

async function sendDailyStreakReminders() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const inactiveUsers = await prisma.user.findMany({
    where: {
      lastActiveAt: { lt: today },
      pushToken: { not: null },
    },
    select: { id: true },
  });

  console.log(`[Jobs] Sending streak reminders to ${inactiveUsers.length} users`);

  for (const user of inactiveUsers) {
    try {
      await notifyDailyStreak(user.id);
    } catch (err) {
      console.error(`[Jobs] Streak reminder failed for ${user.id}:`, err.message);
    }
  }
}

async function deduplicationCheck(cardId) {
  try {
    const card = await prisma.card.findUnique({ where: { id: cardId } });
    if (!card || card.status !== 'APPROVED') return;

    const similar = await prisma.$queryRaw`
      SELECT id, title, 1 - (embedding <=> (
        SELECT embedding FROM cards WHERE id = ${cardId}::uuid
      )) as similarity
      FROM cards
      WHERE id != ${cardId}::uuid
        AND status = 'APPROVED'
        AND embedding IS NOT NULL
      ORDER BY embedding <=> (SELECT embedding FROM cards WHERE id = ${cardId}::uuid)
      LIMIT 1
    `;

    if (similar.length > 0 && similar[0].similarity > 0.92) {
      await prisma.card.update({
        where: { id: cardId },
        data: { status: 'REJECTED' },
      });

      await prisma.verificationLog.create({
        data: {
          cardId,
          checkType: 'AI_FACTCHECK',
          passed: false,
          details: {
            reason: 'Duplicate detected',
            similarCardId: similar[0].id,
            similarity: similar[0].similarity,
          },
        },
      });

      console.log(`[Jobs] Rejected duplicate card ${cardId} (similarity: ${similar[0].similarity})`);
    }
  } catch (err) {
    console.error('[Jobs] Deduplication error:', err.message);
  }
}

function startScheduler() {
  // Daily content generation at 2am UTC
  cron.schedule('0 2 * * *', generateDailyContent, { timezone: 'UTC' });

  // Verification queue every 5 minutes
  cron.schedule('*/5 * * * *', processVerificationQueue);

  // Streak reminders at 6pm UTC
  cron.schedule('0 18 * * *', sendDailyStreakReminders, { timezone: 'UTC' });

  console.log('[Jobs] Scheduler started');
}

module.exports = { startScheduler, generateDailyContent, processVerificationQueue, deduplicationCheck };
