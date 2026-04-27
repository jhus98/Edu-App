const express = require('express');
const { authenticate } = require('../middleware/auth');
const { defaultLimiter } = require('../middleware/rateLimiter');
const { updatePreferences, updatePushToken, getUserStats } = require('../services/userService');
const { getSavedCards } = require('../services/interactionService');
const prisma = require('../utils/prisma');

const router = express.Router();

router.use(authenticate, defaultLimiter);

router.get('/me', async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        streakCount: true,
        lastActiveAt: true,
        preferences: true,
        createdAt: true,
      },
    });

    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch {
    res.status(500).json({ error: 'Failed to get user' });
  }
});

router.get('/me/saved', async (req, res) => {
  try {
    const cards = await getSavedCards(req.user.userId);
    res.json(cards);
  } catch {
    res.status(500).json({ error: 'Failed to get saved cards' });
  }
});

router.get('/me/stats', async (req, res) => {
  try {
    const stats = await getUserStats(req.user.userId);
    res.json(stats);
  } catch {
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

router.patch('/me', async (req, res) => {
  const { preferences, pushToken } = req.body;

  try {
    if (pushToken !== undefined) {
      await updatePushToken(req.user.userId, pushToken);
    }

    if (preferences !== undefined) {
      const updated = await updatePreferences(req.user.userId, preferences);
      return res.json(updated);
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { id: true, email: true, username: true, role: true, streakCount: true, preferences: true },
    });
    res.json(user);
  } catch {
    res.status(500).json({ error: 'Failed to update user' });
  }
});

module.exports = router;
