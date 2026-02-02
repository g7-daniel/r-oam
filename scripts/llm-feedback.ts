/**
 * LLM Feedback Script
 * Queries Groq and Gemini for code review and suggestions
 */

import * as fs from 'fs';
import * as path from 'path';

// Load .env.local manually
function loadEnv() {
  const envPath = path.join(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf-8');
    for (const line of content.split('\n')) {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        let value = match[2].trim();
        // Remove quotes if present
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        process.env[key] = value;
      }
    }
  }
}

loadEnv();

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

interface LLMResponse {
  source: 'groq' | 'gemini';
  model: string;
  response: string;
  error?: string;
}

/**
 * Query Groq API (Llama/Mixtral)
 */
async function queryGroq(prompt: string, systemPrompt?: string): Promise<LLMResponse> {
  if (!GROQ_API_KEY) {
    return { source: 'groq', model: 'none', response: '', error: 'No API key' };
  }

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 4096,
      }),
    });

    const data = await response.json();

    if (data.error) {
      return { source: 'groq', model: 'llama-3.1-70b', response: '', error: data.error.message };
    }

    return {
      source: 'groq',
      model: 'llama-3.1-70b',
      response: data.choices?.[0]?.message?.content || '',
    };
  } catch (error: any) {
    return { source: 'groq', model: 'llama-3.1-70b', response: '', error: error.message };
  }
}

/**
 * Query Gemini API
 */
async function queryGemini(prompt: string, systemPrompt?: string): Promise<LLMResponse> {
  if (!GEMINI_API_KEY) {
    return { source: 'gemini', model: 'none', response: '', error: 'No API key' };
  }

  try {
    const fullPrompt = systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: fullPrompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 4096,
          },
        }),
      }
    );

    const data = await response.json();

    if (data.error) {
      return { source: 'gemini', model: 'gemini-2.0-flash', response: '', error: data.error.message };
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return {
      source: 'gemini',
      model: 'gemini-2.0-flash',
      response: text,
    };
  } catch (error: any) {
    return { source: 'gemini', model: 'gemini-2.0-flash', response: '', error: error.message };
  }
}

/**
 * Query both LLMs and combine responses
 */
async function queryBothLLMs(prompt: string, systemPrompt?: string): Promise<LLMResponse[]> {
  const [groqResponse, geminiResponse] = await Promise.all([
    queryGroq(prompt, systemPrompt),
    queryGemini(prompt, systemPrompt),
  ]);

  return [groqResponse, geminiResponse];
}

/**
 * Format responses for display
 */
function formatResponses(responses: LLMResponse[]): string {
  let output = '';

  for (const r of responses) {
    output += `\n${'='.repeat(60)}\n`;
    output += `SOURCE: ${r.source.toUpperCase()} (${r.model})\n`;
    output += `${'='.repeat(60)}\n`;

    if (r.error) {
      output += `ERROR: ${r.error}\n`;
    } else {
      output += r.response + '\n';
    }
  }

  return output;
}

// Export for use
export { queryGroq, queryGemini, queryBothLLMs, formatResponses };
export type { LLMResponse };

// CLI mode
if (require.main === module) {
  const args = process.argv.slice(2);
  const prompt = args.join(' ') || 'Hello, can you help me review some code?';

  console.log('Querying LLMs with prompt:', prompt.slice(0, 100) + '...\n');

  queryBothLLMs(prompt, 'You are a senior software engineer reviewing code for a travel planning app built with Next.js, TypeScript, and React.')
    .then(responses => {
      console.log(formatResponses(responses));
    })
    .catch(console.error);
}
