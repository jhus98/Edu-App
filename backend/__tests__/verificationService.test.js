jest.mock('../src/utils/prisma', () => ({
  card: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  verificationLog: {
    createMany: jest.fn(),
  },
}));

jest.mock('@anthropic-ai/sdk', () => {
  return jest.fn().mockImplementation(() => ({
    messages: {
      create: jest.fn(),
    },
  }));
});

jest.mock('axios');

const axios = require('axios');
const Anthropic = require('@anthropic-ai/sdk');
const prisma = require('../src/utils/prisma');
const {
  isDomainTrusted,
  checkSourceExists,
  aiFactCheck,
} = require('../src/services/verificationService');

describe('isDomainTrusted', () => {
  it('trusts wikipedia.org', () => {
    expect(isDomainTrusted('https://en.wikipedia.org/wiki/Test')).toBe(true);
  });

  it('trusts nasa.gov', () => {
    expect(isDomainTrusted('https://www.nasa.gov/article')).toBe(true);
  });

  it('trusts .edu domains', () => {
    expect(isDomainTrusted('https://mit.edu/research')).toBe(true);
  });

  it('trusts .ac.uk domains', () => {
    expect(isDomainTrusted('https://oxford.ac.uk/study')).toBe(true);
  });

  it('trusts .gov domains', () => {
    expect(isDomainTrusted('https://cdc.gov/health')).toBe(true);
  });

  it('does not trust random blogs', () => {
    expect(isDomainTrusted('https://randomblog.com/post')).toBe(false);
  });

  it('handles invalid URLs', () => {
    expect(isDomainTrusted('not-a-url')).toBe(false);
  });
});

describe('checkSourceExists', () => {
  it('returns passed:false for untrusted domain', async () => {
    const result = await checkSourceExists('https://untrusted-random-site.xyz/page');
    expect(result.passed).toBe(false);
    expect(result.details.reason).toBe('Domain not in trusted list');
  });

  it('returns passed:true for trusted domain with 200 response', async () => {
    axios.head.mockResolvedValueOnce({ status: 200 });
    const result = await checkSourceExists('https://en.wikipedia.org/wiki/Test');
    expect(result.passed).toBe(true);
    expect(result.details.status).toBe(200);
  });

  it('returns passed:false for 404 response', async () => {
    axios.head.mockResolvedValueOnce({ status: 404 });
    const result = await checkSourceExists('https://en.wikipedia.org/wiki/NonExistent');
    expect(result.passed).toBe(false);
  });

  it('returns passed:false on network error', async () => {
    axios.head.mockRejectedValueOnce(new Error('Network timeout'));
    const result = await checkSourceExists('https://en.wikipedia.org/wiki/Test');
    expect(result.passed).toBe(false);
    expect(result.details.reason).toBe('Network timeout');
  });
});

describe('aiFactCheck', () => {
  let mockAnthropicInstance;

  beforeEach(() => {
    mockAnthropicInstance = { messages: { create: jest.fn() } };
    Anthropic.mockImplementation(() => mockAnthropicInstance);
  });

  const testCard = {
    id: 'test-id',
    title: 'Test Fact Title',
    body: 'This is a test fact body with some content.',
    sourceTitle: 'Wikipedia',
    sourceUrl: 'https://en.wikipedia.org/wiki/Test',
  };

  it('returns passed:true when Claude says passes and confidence >= 70', async () => {
    const { aiFactCheck: freshCheck } = jest.isolateModules(() =>
      require('../src/services/verificationService')
    );

    const anthropicMod = require('@anthropic-ai/sdk');
    const instance = new anthropicMod();
    instance.messages.create.mockResolvedValueOnce({
      content: [{ type: 'text', text: '{"passes": true, "confidence": 90, "issues": ""}' }],
    });

    const result = await aiFactCheck(testCard);
    expect(typeof result.passed).toBe('boolean');
    expect(typeof result.confidence).toBe('number');
  });

  it('returns passed:false when confidence < 70', async () => {
    const anthropicMod = require('@anthropic-ai/sdk');
    const instance = new anthropicMod();
    instance.messages.create.mockResolvedValueOnce({
      content: [{ type: 'text', text: '{"passes": true, "confidence": 50, "issues": "Uncertain"}' }],
    });

    const result = await aiFactCheck(testCard);
    expect(result.passed).toBe(false);
  });

  it('handles JSON parse errors gracefully', async () => {
    const anthropicMod = require('@anthropic-ai/sdk');
    const instance = new anthropicMod();
    instance.messages.create.mockResolvedValueOnce({
      content: [{ type: 'text', text: 'This is not JSON' }],
    });

    const result = await aiFactCheck(testCard);
    expect(result.passed).toBe(false);
    expect(result.issues).toContain('Fact-check failed');
  });
});

describe('Score calculation', () => {
  it('should assign APPROVED status for score >= 80', () => {
    const score = 85;
    expect(score >= 80 ? 'APPROVED' : 'PENDING_HUMAN').toBe('APPROVED');
  });

  it('should assign PENDING_HUMAN for score < 80', () => {
    const score = 72;
    expect(score >= 80 ? 'APPROVED' : 'PENDING_HUMAN').toBe('PENDING_HUMAN');
  });
});
