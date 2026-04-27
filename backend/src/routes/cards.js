const express = require('express');
const { authenticate } = require('../middleware/auth');
const { defaultLimiter } = require('../middleware/rateLimiter');
const { likeCard, saveCard, flagCard, markSeen } = require('../services/interactionService');
const prisma = require('../utils/prisma');

const router = express.Router();

router.use(defaultLimiter);

router.get('/:id', async (req, res) => {
  try {
    const card = await prisma.card.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        title: true,
        body: true,
        sourceTitle: true,
        sourceUrl: true,
        category: true,
        status: true,
        confidenceScore: true,
        version: true,
        createdAt: true,
        approvedAt: true,
      },
    });

    if (!card) return res.status(404).json({ error: 'Card not found' });
    res.json(card);
  } catch {
    res.status(500).json({ error: 'Failed to get card' });
  }
});

router.get('/:id/versions', async (req, res) => {
  try {
    const versions = await prisma.cardVersion.findMany({
      where: { cardId: req.params.id },
      orderBy: { version: 'asc' },
    });
    res.json(versions);
  } catch {
    res.status(500).json({ error: 'Failed to get card versions' });
  }
});

router.post('/:id/seen', authenticate, async (req, res) => {
  try {
    await markSeen(req.user.userId, req.params.id);
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Failed to mark card as seen' });
  }
});

router.post('/:id/like', authenticate, async (req, res) => {
  try {
    const interaction = await likeCard(req.user.userId, req.params.id);
    res.json({ liked: interaction.liked });
  } catch {
    res.status(500).json({ error: 'Failed to like card' });
  }
});

router.post('/:id/save', authenticate, async (req, res) => {
  try {
    const interaction = await saveCard(req.user.userId, req.params.id);
    res.json({ saved: interaction.saved });
  } catch {
    res.status(500).json({ error: 'Failed to save card' });
  }
});

router.post('/:id/flag', authenticate, async (req, res) => {
  const { reason } = req.body;
  if (!reason) return res.status(400).json({ error: 'reason is required' });

  try {
    const result = await flagCard(req.user.userId, req.params.id, reason);
    res.json(result);
  } catch {
    res.status(500).json({ error: 'Failed to flag card' });
  }
});

module.exports = router;
