const Anthropic = require('@anthropic-ai/sdk');
const prisma = require('../utils/prisma');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are a fact curator for an educational app. Your job is to find genuine, surprising, well-sourced facts that make people say "I never knew that."

Rules:
- Always use web search to find a real source before writing anything
- Only write facts that can be verified at the source URL you retrieve
- If you cannot find a reliable source, say so — never invent a source
- Avoid facts that are commonly known (no "humans share DNA with bananas")
- Prioritise facts that are counterintuitive, historically significant, or scientifically remarkable
- Respond ONLY with a raw JSON object, no markdown, no backticks:
  { "title": "...", "body": "...", "sourceTitle": "...", "sourceUrl": "..." }`;

async function generateCard(category, topic = null) {
  const topicHint = topic ? ` Focus on this specific topic: ${topic}.` : '';
  const userPrompt = `Find a genuine, surprising fact from the ${category} category.${topicHint}

Requirements:
- Title: maximum 10 words, punchy and intriguing
- Body: 60-90 words, 2-3 sentences, genuinely surprising, no fluff
- Must use web search to retrieve a real source first
- Return ONLY raw JSON: { "title": "...", "body": "...", "sourceTitle": "...", "sourceUrl": "..." }`;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    tools: [
      {
        type: 'web_search_20250305',
        name: 'web_search',
      },
    ],
    messages: [{ role: 'user', content: userPrompt }],
  });

  const textBlock = response.content.find((block) => block.type === 'text');
  if (!textBlock) {
    throw new Error('No text response from Claude');
  }

  let parsed;
  try {
    const cleaned = textBlock.text.trim().replace(/^```json?\n?/, '').replace(/\n?```$/, '');
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error(`Failed to parse Claude response as JSON: ${textBlock.text.substring(0, 200)}`);
  }

  const { title, body, sourceTitle, sourceUrl } = parsed;

  if (!title || !body || !sourceUrl) {
    throw new Error('Claude response missing required fields');
  }

  if (!sourceUrl.startsWith('http')) {
    throw new Error('Claude returned invalid source URL');
  }

  const card = await prisma.card.create({
    data: {
      title: title.trim(),
      body: body.trim(),
      sourceTitle: (sourceTitle || '').trim(),
      sourceUrl: sourceUrl.trim(),
      category,
      status: 'PENDING_AUTO',
      generationMetadata: {
        prompt: userPrompt,
        model: 'claude-sonnet-4-20250514',
        topic,
        generatedAt: new Date().toISOString(),
        inputTokens: response.usage?.input_tokens,
        outputTokens: response.usage?.output_tokens,
      },
    },
  });

  return card;
}

module.exports = { generateCard };
