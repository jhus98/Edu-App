const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../utils/prisma');

const JWT_SECRET = process.env.JWT_SECRET || 'luminary-jwt-secret';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'luminary-refresh-secret';
const JWT_EXPIRES_IN = '15m';
const REFRESH_EXPIRES_IN = '30d';

function generateTokens(userId, role) {
  const token = jwt.sign({ userId, role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  const refreshToken = jwt.sign({ userId, role }, JWT_REFRESH_SECRET, { expiresIn: REFRESH_EXPIRES_IN });
  return { token, refreshToken };
}

async function register(email, username, password) {
  const existing = await prisma.user.findFirst({
    where: { OR: [{ email }, { username }] },
  });

  if (existing) {
    throw new Error(existing.email === email ? 'Email already registered' : 'Username taken');
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: { email, username, passwordHash },
    select: { id: true, email: true, username: true, role: true, streakCount: true, preferences: true, createdAt: true },
  });

  const tokens = generateTokens(user.id, user.role);
  return { ...tokens, user };
}

async function login(email, password) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new Error('Invalid credentials');

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw new Error('Invalid credentials');

  const tokens = generateTokens(user.id, user.role);
  const { passwordHash: _, ...safeUser } = user;
  return { ...tokens, user: safeUser };
}

async function refreshTokens(refreshToken) {
  let payload;
  try {
    payload = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
  } catch {
    throw new Error('Invalid refresh token');
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, role: true, email: true, username: true },
  });

  if (!user) throw new Error('User not found');

  return generateTokens(user.id, user.role);
}

async function updateStreak(userId) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return;

  const now = new Date();
  const last = new Date(user.lastActiveAt);
  const diffDays = Math.floor((now - last) / (1000 * 60 * 60 * 24));

  let streakCount = user.streakCount;
  if (diffDays === 1) {
    streakCount += 1;
  } else if (diffDays >= 2) {
    streakCount = 1;
  }

  await prisma.user.update({
    where: { id: userId },
    data: { lastActiveAt: now, streakCount },
  });

  return streakCount;
}

async function getUserStats(userId) {
  const [seen, liked, saved] = await Promise.all([
    prisma.userCardInteraction.count({ where: { userId } }),
    prisma.userCardInteraction.count({ where: { userId, liked: true } }),
    prisma.userCardInteraction.count({ where: { userId, saved: true } }),
  ]);

  const categoryBreakdown = await prisma.$queryRaw`
    SELECT c.category, COUNT(*)::int as count
    FROM user_card_interactions uci
    JOIN cards c ON uci.card_id = c.id
    WHERE uci.user_id = ${userId}::uuid AND uci.liked = true
    GROUP BY c.category
    ORDER BY count DESC
  `;

  return { seen, liked, saved, categoryBreakdown };
}

async function updatePreferences(userId, preferences) {
  return prisma.user.update({
    where: { id: userId },
    data: { preferences },
    select: { id: true, email: true, username: true, role: true, streakCount: true, preferences: true },
  });
}

async function updatePushToken(userId, pushToken) {
  await prisma.user.update({ where: { id: userId }, data: { pushToken } });
}

module.exports = {
  register,
  login,
  refreshTokens,
  updateStreak,
  getUserStats,
  updatePreferences,
  updatePushToken,
  JWT_SECRET,
  JWT_REFRESH_SECRET,
};
