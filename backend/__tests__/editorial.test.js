const request = require('supertest');
const jwt = require('jsonwebtoken');

jest.mock('../src/utils/prisma', () => ({
  card: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    create: jest.fn(),
  },
  cardVersion: {
    create: jest.fn(),
  },
  verificationLog: {
    createMany: jest.fn(),
    create: jest.fn(),
    findMany: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  userCardInteraction: {
    findMany: jest.fn().mockResolvedValue([]),
    findUnique: jest.fn(),
    upsert: jest.fn(),
  },
  flag: {
    findFirst: jest.fn(),
    create: jest.fn(),
    count: jest.fn(),
  },
}));

jest.mock('../src/utils/redis', () => ({
  get: jest.fn().mockResolvedValue(null),
  setex: jest.fn().mockResolvedValue('OK'),
  keys: jest.fn().mockResolvedValue([]),
  del: jest.fn().mockResolvedValue(0),
  on: jest.fn(),
}));

jest.mock('node-cron', () => ({ schedule: jest.fn() }));

jest.mock('expo-server-sdk', () => ({
  Expo: jest.fn().mockImplementation(() => ({
    chunkPushNotifications: jest.fn().mockReturnValue([]),
    sendPushNotificationsAsync: jest.fn().mockResolvedValue([]),
    isExpoPushToken: jest.fn().mockReturnValue(true),
  })),
}));

const { JWT_SECRET } = require('../src/services/userService');
const prisma = require('../src/utils/prisma');
const app = require('../src/index');

const makeToken = (role = 'EDITOR') =>
  jwt.sign({ userId: 'editor-uuid', role }, JWT_SECRET, { expiresIn: '1h' });

describe('GET /api/editorial/pending', () => {
  it('returns pending cards for editor', async () => {
    const mockCards = [
      {
        id: 'card-1',
        title: 'Test Card',
        body: 'Test body',
        category: 'SCIENCE',
        status: 'PENDING_HUMAN',
        confidenceScore: 65,
        createdAt: new Date(),
        verifications: [],
      },
    ];
    prisma.card.findMany.mockResolvedValue(mockCards);

    const res = await request(app)
      .get('/api/editorial/pending')
      .set('Authorization', `Bearer ${makeToken()}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('returns 401 without auth', async () => {
    const res = await request(app).get('/api/editorial/pending');
    expect(res.status).toBe(401);
  });

  it('returns 403 for regular user', async () => {
    const userToken = jwt.sign({ userId: 'user-uuid', role: 'USER' }, JWT_SECRET, { expiresIn: '1h' });
    const res = await request(app)
      .get('/api/editorial/pending')
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(403);
  });
});

describe('POST /api/editorial/cards/:id/approve', () => {
  it('approves a card', async () => {
    prisma.card.update.mockResolvedValue({
      id: 'card-1',
      status: 'APPROVED',
      approvedAt: new Date(),
    });

    const res = await request(app)
      .post('/api/editorial/cards/card-1/approve')
      .set('Authorization', `Bearer ${makeToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('APPROVED');
  });
});

describe('POST /api/editorial/cards/:id/reject', () => {
  it('rejects a card with reason', async () => {
    prisma.card.update.mockResolvedValue({ id: 'card-1', status: 'REJECTED' });
    prisma.verificationLog.create.mockResolvedValue({});

    const res = await request(app)
      .post('/api/editorial/cards/card-1/reject')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ reason: 'Factually incorrect' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('REJECTED');
  });

  it('returns 400 when reason missing', async () => {
    const res = await request(app)
      .post('/api/editorial/cards/card-1/reject')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({});

    expect(res.status).toBe(400);
  });
});

describe('PATCH /api/editorial/cards/:id', () => {
  it('updates card and creates version snapshot', async () => {
    const existingCard = {
      id: 'card-1',
      title: 'Old Title',
      body: 'Old body',
      sourceTitle: 'Old Source',
      sourceUrl: 'https://old.url',
      version: 1,
    };

    prisma.card.findUnique.mockResolvedValue(existingCard);
    prisma.cardVersion.create.mockResolvedValue({ id: 'version-1', version: 1 });
    prisma.card.update.mockResolvedValue({ id: 'card-1', title: 'New Title', version: 2, status: 'APPROVED' });
    prisma.userCardInteraction.findMany.mockResolvedValue([]);
    prisma.user.findMany.mockResolvedValue([]);

    const res = await request(app)
      .patch('/api/editorial/cards/card-1')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({
        title: 'New Title',
        body: 'New body content here',
        reason: 'Correcting factual error',
      });

    expect(res.status).toBe(200);
    expect(prisma.cardVersion.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          cardId: 'card-1',
          version: 1,
          title: 'Old Title',
          reason: 'Correcting factual error',
        }),
      })
    );
  });

  it('returns 400 when reason missing', async () => {
    const res = await request(app)
      .patch('/api/editorial/cards/card-1')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ title: 'New Title' });

    expect(res.status).toBe(400);
  });
});
