const express = require('express');
const { authenticate, requireRole } = require('../middleware/auth');
const { generateLimiter, defaultLimiter } = require('../middleware/rateLimiter');
const { generateCard } = require('../services/contentService');
const { verifyCard } = require('../services/verificationService');
const prisma = require('../utils/prisma');

const router = express.Router();

router.use(authenticate, requireRole('ADMIN'));

router.post('/generate', generateLimiter, async (req, res) => {
  const { category, topic } = req.body;

  const validCategories = [
    'HISTORY', 'SCIENCE', 'SPACE', 'NATURE',
    'GEOGRAPHY', 'PHILOSOPHY', 'TECHNOLOGY', 'ART',
  ];

  if (!category || !validCategories.includes(category)) {
    return res.status(400).json({ error: `category must be one of: ${validCategories.join(', ')}` });
  }

  try {
    const card = await generateCard(category, topic);
    res.status(202).json({ message: 'Card generation started', cardId: card.id, card });

    setImmediate(async () => {
      try {
        await verifyCard(card.id);
      } catch (err) {
        console.error('[Admin/Generate] Verification failed:', err.message);
      }
    });
  } catch (err) {
    console.error('[Admin/Generate]', err.message);
    res.status(500).json({ error: 'Card generation failed', details: err.message });
  }
});

router.get('/stats', defaultLimiter, async (req, res) => {
  try {
    const [totalCards, byStatus, byCategory, flagRate, avgConfidence] = await Promise.all([
      prisma.card.count(),
      prisma.card.groupBy({ by: ['status'], _count: true }),
      prisma.card.groupBy({ by: ['category'], _count: true }),
      prisma.flag.count({ where: { resolved: false } }),
      prisma.card.aggregate({ _avg: { confidenceScore: true }, where: { status: 'APPROVED' } }),
    ]);

    res.json({
      totalCards,
      byStatus: byStatus.reduce((acc, s) => ({ ...acc, [s.status]: s._count }), {}),
      byCategory: byCategory.reduce((acc, c) => ({ ...acc, [c.category]: c._count }), {}),
      openFlags: flagRate,
      avgConfidenceScore: Math.round(avgConfidence._avg.confidenceScore || 0),
    });
  } catch {
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

router.get('/search', defaultLimiter, async (req, res) => {
  const { q } = req.query;
  if (!q) return res.status(400).json({ error: 'q is required' });

  try {
    const cards = await prisma.$queryRaw`
      SELECT id, title, body, category, status, confidence_score, created_at
      FROM cards
      WHERE to_tsvector('english', title || ' ' || body) @@ plainto_tsquery('english', ${q})
      ORDER BY ts_rank(to_tsvector('english', title || ' ' || body), plainto_tsquery('english', ${q})) DESC
      LIMIT 20
    `;
    res.json(cards);
  } catch {
    res.status(500).json({ error: 'Search failed' });
  }
});

module.exports = router;
