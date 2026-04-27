const express = require('express');
const { authenticate, requireRole } = require('../middleware/auth');
const { defaultLimiter } = require('../middleware/rateLimiter');
const { getPendingCards, approveCard, rejectCard, updateCard } = require('../services/editorialService');

const router = express.Router();

router.use(authenticate, requireRole('EDITOR', 'ADMIN'), defaultLimiter);

router.get('/pending', async (req, res) => {
  try {
    const cards = await getPendingCards();
    res.json(cards);
  } catch {
    res.status(500).json({ error: 'Failed to get pending cards' });
  }
});

router.post('/cards/:id/approve', async (req, res) => {
  try {
    const card = await approveCard(req.params.id, req.user.userId);
    res.json(card);
  } catch (err) {
    res.status(500).json({ error: 'Failed to approve card' });
  }
});

router.post('/cards/:id/reject', async (req, res) => {
  const { reason } = req.body;
  if (!reason) return res.status(400).json({ error: 'reason is required' });

  try {
    const card = await rejectCard(req.params.id, req.user.userId, reason);
    res.json(card);
  } catch {
    res.status(500).json({ error: 'Failed to reject card' });
  }
});

router.patch('/cards/:id', async (req, res) => {
  const { title, body, sourceTitle, sourceUrl, reason } = req.body;

  if (!reason) return res.status(400).json({ error: 'reason is required' });

  try {
    const card = await updateCard(
      req.params.id,
      req.user.userId,
      { title, body, sourceTitle, sourceUrl },
      reason
    );
    res.json(card);
  } catch (err) {
    if (err.message.includes('not found')) {
      return res.status(404).json({ error: err.message });
    }
    res.status(500).json({ error: 'Failed to update card' });
  }
});

module.exports = router;
