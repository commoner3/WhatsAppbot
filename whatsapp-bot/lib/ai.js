// lib/ai.js
// Talks to the Anthropic API for AI-powered replies and translation.
// Requires ANTHROPIC_API_KEY in your environment (see .env.example).

const MODEL = process.env.CLAUDE_MODEL || 'claude-sonnet-5';
const DEFAULT_SYSTEM_PROMPT =
  'You are a friendly, upbeat WhatsApp bot assistant. Keep replies short (2-4 sentences), casual, and fun for a chat app.';

async function askClaude(systemPrompt, userMessage) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return "AI features aren't set up yet — add ANTHROPIC_API_KEY to your .env file (see .env.example).";
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 300,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Anthropic API error:', response.status, errText);
      return 'The AI is having trouble right now — try again in a bit.';
    }

    const data = await response.json();
    const textBlock = data.content?.find((block) => block.type === 'text');
    return textBlock?.text?.trim() || "I didn't get a usable response back — try rephrasing.";
  } catch (err) {
    console.error('AI request failed:', err);
    return 'Could not reach the AI right now.';
  }
}

// language: one of the values in lib/language.js's SUPPORTED_LANGUAGES
async function callAI(userMessage, language = 'english') {
  const systemPrompt =
    language === 'english'
      ? DEFAULT_SYSTEM_PROMPT
      : `${DEFAULT_SYSTEM_PROMPT} Respond in ${language}, the way a native speaker would naturally text it — not a stiff textbook translation.`;
  return askClaude(systemPrompt, userMessage);
}

async function translateText(text, targetLanguage) {
  const systemPrompt = `You are a translator. Translate the user's message into ${targetLanguage}, the way a native speaker would naturally write it. Reply with only the translation — no notes, no explanation.`;
  return askClaude(systemPrompt, text);
}

module.exports = { callAI, translateText };
