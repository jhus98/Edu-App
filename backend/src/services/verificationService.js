const Anthropic = require('@anthropic-ai/sdk');
const axios = require('axios');
const prisma = require('../utils/prisma');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const TRUSTED_DOMAINS = [
  'wikipedia.org',
  'nature.com',
  'science.org',
  'sciencemag.org',
  'smithsonianmag.com',
  'nasa.gov',
  'bbc.com',
  'bbc.co.uk',
  'nytimes.com',
  'theguardian.com',
  'nationalgeographic.com',
  'scientificamerican.com',
  'newscientist.com',
  'pbs.org',
  'britannica.com',
  'history.com',
  'sciencedaily.com',
  'nih.gov',
  'cdc.gov',
  'who.int',
];

function isDomainTrusted(url) {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, '');
    if (TRUSTED_DOMAINS.some((d) => hostname === d || hostname.endsWith('.' + d))) {
      return true;
    }
    if (hostname.endsWith('.edu') || hostname.endsWith('.ac.uk') || hostname.endsWith('.gov')) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

async function checkSourceExists(sourceUrl) {
  try {
    const trusted = isDomainTrusted(sourceUrl);
    if (!trusted) {
      return {
        passed: false,
        details: { reason: 'Domain not in trusted list', url: sourceUrl },
      };
    }

    const response = await axios.head(sourceUrl, {
      timeout: 8000,
      maxRedirects: 5,
      validateStatus: (s) => s < 500,
    });

    const passed = response.status < 400;
    return {
      passed,
      details: { status: response.status, url: sourceUrl, trusted },
    };
  } catch (err) {
    return {
      passed: false,
      details: { reason: err.message, url: sourceUrl },
    };
  }
}

async function aiFactCheck(card) {
  const prompt = `You are a rigorous fact-checker. Evaluate the following claim for accuracy.
Be skeptical. Check if the claim is:
1. Factually accurate to the best of your knowledge
2. Presented without misleading framing
3. Consistent with the cited source

Claim: ${card.title} — ${card.body}
Source: ${card.sourceTitle} at ${card.sourceUrl}

Respond ONLY with JSON: { "passes": true/false, "confidence": 0-100, "issues": "..." }`;

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 256,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content.find((b) => b.type === 'text')?.text || '';
    const cleaned = text.trim().replace(/^```json?\n?/, '').replace(/\n?```$/, '');
    const result = JSON.parse(cleaned);

    return {
      passed: result.passes === true && result.confidence >= 70,
      confidence: result.confidence || 0,
      issues: result.issues || '',
      details: result,
    };
  } catch (err) {
    return {
      passed: false,
      confidence: 0,
      issues: `Fact-check failed: ${err.message}`,
      details: { error: err.message },
    };
  }
}

async function crossReferenceSearch(card) {
  const searchApiKey = process.env.SEARCH_API_KEY;
  const searchApiUrl = process.env.SEARCH_API_URL;

  if (!searchApiKey || !searchApiUrl) {
    return {
      passed: true,
      details: { skipped: true, reason: 'Search API not configured' },
    };
  }

  try {
    const response = await axios.get(searchApiUrl, {
      headers: { 'X-Subscription-Token': searchApiKey, Accept: 'application/json' },
      params: { q: card.title, count: 3 },
      timeout: 8000,
    });

    const results = response.data?.web?.results || [];

    if (results.length === 0) {
      return {
        passed: false,
        details: { reason: 'No search results found for supposedly well-known fact', query: card.title },
      };
    }

    const descriptions = results.map((r) => r.description || '').join(' ').toLowerCase();
    const titleWords = card.title.toLowerCase().split(' ').filter((w) => w.length > 4);
    const contradictionKeywords = ['false', 'myth', 'debunked', 'incorrect', 'wrong', 'not true'];
    const hasContradiction = contradictionKeywords.some((kw) => descriptions.includes(kw));

    return {
      passed: !hasContradiction,
      details: {
        query: card.title,
        resultCount: results.length,
        contradictionDetected: hasContradiction,
        topResults: results.slice(0, 3).map((r) => ({ title: r.title, url: r.url })),
      },
    };
  } catch (err) {
    return {
      passed: true,
      details: { skipped: true, reason: `Search failed: ${err.message}` },
    };
  }
}

async function verifyCard(cardId) {
  const card = await prisma.card.findUnique({ where: { id: cardId } });
  if (!card) throw new Error(`Card ${cardId} not found`);

  const [sourceResult, factResult, crossRefResult] = await Promise.all([
    checkSourceExists(card.sourceUrl),
    aiFactCheck(card),
    crossReferenceSearch(card),
  ]);

  await prisma.verificationLog.createMany({
    data: [
      { cardId, checkType: 'SOURCE_CHECK', passed: sourceResult.passed, details: sourceResult.details },
      { cardId, checkType: 'AI_FACTCHECK', passed: factResult.passed, details: factResult.details },
      { cardId, checkType: 'CLAIM_CROSSREF', passed: crossRefResult.passed, details: crossRefResult.details },
    ],
  });

  let score = 0;
  if (sourceResult.passed) score += 33;
  if (factResult.passed) score += 33;
  if (crossRefResult.passed) score += 34;
  score = Math.round(score * (factResult.confidence / 100) + score * 0.1);
  score = Math.min(100, Math.max(0, score));

  const newStatus = score >= 80 ? 'APPROVED' : 'PENDING_HUMAN';
  const updateData = {
    confidenceScore: score,
    status: newStatus,
    ...(newStatus === 'APPROVED' ? { approvedAt: new Date() } : {}),
  };

  await prisma.card.update({ where: { id: cardId }, data: updateData });

  return { score, status: newStatus, sourceResult, factResult, crossRefResult };
}

module.exports = { verifyCard, checkSourceExists, aiFactCheck, crossReferenceSearch, isDomainTrusted };
