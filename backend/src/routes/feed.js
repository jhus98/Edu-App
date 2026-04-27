const express = require('express');
const { authenticate } = require('../middleware/auth');
const { defaultLimiter } = require('../middleware/rateLimiter');
const { getFeed, getPersonalisedFeed } = require('../services/feedService');
const { updateStreak } = require('../services/userService');

const router = express.Router();

router.use(authenticate, defaultLimiter);

router.get('/', async (req, res) => {
  const { category, cursor, limit } = req.query;

  try {
    await updateStreak(req.user.userId);
    const result = await getFeed(
      req.user.userId,
      category || null,
      cursor || null,
      Math.min(parseInt(limit) || 10, 50)
    );
    res.json(result);
  } catch (err) {
    console.error('[Feed]', err.message);
    res.status(500).json({ error: 'Failed to get feed' });
  }
});

router.get('/personalised', async (req, res) => {
  const { cursor } = req.query;

  try {
    const result = await getPersonalisedFeed(req.user.userId, cursor || null);
    res.json(result);
  } catch (err) {
    console.error('[Feed/Personalised]', err.message);
    res.status(500).json({ error: 'Failed to get personalised feed' });
  }
});

module.exports = router;
