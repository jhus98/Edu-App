const request = require('supertest');

jest.mock('../src/utils/prisma', () => ({
  user: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
}));

jest.mock('../src/utils/redis', () => ({
  get: jest.fn().mockResolvedValue(null),
  setex: jest.fn().mockResolvedValue('OK'),
  keys: jest.fn().mockResolvedValue([]),
  del: jest.fn().mockResolvedValue(0),
  on: jest.fn(),
}));

jest.mock('node-cron', () => ({
  schedule: jest.fn(),
}));

const bcrypt = require('bcryptjs');
const prisma = require('../src/utils/prisma');
const app = require('../src/index');

describe('POST /api/auth/register', () => {
  beforeEach(() => jest.clearAllMocks());

  it('registers a new user and returns tokens', async () => {
    prisma.user.findFirst.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue({
      id: 'user-uuid',
      email: 'test@example.com',
      username: 'testuser',
      role: 'USER',
      streakCount: 0,
      preferences: { categories: [], notificationsEnabled: true },
      createdAt: new Date(),
    });

    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'test@example.com', username: 'testuser', password: 'password123' });

    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();
    expect(res.body.user.email).toBe('test@example.com');
    expect(res.body.user.passwordHash).toBeUndefined();
  });

  it('returns 409 when email already exists', async () => {
    prisma.user.findFirst.mockResolvedValue({ email: 'test@example.com' });

    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'test@example.com', username: 'testuser', password: 'password123' });

    expect(res.status).toBe(409);
    expect(res.body.error).toContain('already');
  });

  it('returns 400 when required fields missing', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'test@example.com' });

    expect(res.status).toBe(400);
  });

  it('returns 400 when password too short', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'test@example.com', username: 'testuser', password: 'short' });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('8 characters');
  });
});

describe('POST /api/auth/login', () => {
  beforeEach(() => jest.clearAllMocks());

  it('logs in with valid credentials', async () => {
    const passwordHash = await bcrypt.hash('correctpassword', 12);
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-uuid',
      email: 'test@example.com',
      username: 'testuser',
      role: 'USER',
      passwordHash,
      streakCount: 0,
      preferences: {},
      createdAt: new Date(),
      lastActiveAt: new Date(),
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'correctpassword' });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe('test@example.com');
    expect(res.body.user.passwordHash).toBeUndefined();
  });

  it('returns 401 for wrong password', async () => {
    const passwordHash = await bcrypt.hash('correctpassword', 12);
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-uuid',
      email: 'test@example.com',
      passwordHash,
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'wrongpassword' });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid credentials');
  });

  it('returns 401 when user does not exist', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: 'password123' });

    expect(res.status).toBe(401);
  });

  it('returns 400 when required fields missing', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com' });

    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/refresh', () => {
  it('returns 400 when refreshToken missing', async () => {
    const res = await request(app).post('/api/auth/refresh').send({});
    expect(res.status).toBe(400);
  });

  it('returns 401 for invalid refresh token', async () => {
    const res = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: 'invalid-token' });

    expect(res.status).toBe(401);
  });
});
