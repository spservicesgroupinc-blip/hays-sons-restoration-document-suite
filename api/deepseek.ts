/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Server-side DeepSeek proxy (Vercel Function).
 *
 * The browser never sees the API key. The client posts a task id plus a plain
 * text digest of the loaded estimate; this function attaches the system prompt
 * for that task, holds the credential, and calls the DeepSeek chat endpoint.
 *
 * Required environment variable: DEEPSEEK_API_KEY
 * Optional: DEEPSEEK_MODEL (default "deepseek-flash"),
 *           DEEPSEEK_BASE_URL (default "https://api.deepseek.com")
 */

/* Minimal structural types so the function does not need @vercel/node. */
interface ApiRequest {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
}

interface ApiResponse {
  status(code: number): ApiResponse;
  json(body: unknown): void;
  setHeader(name: string, value: string): void;
}

type TaskId = 'estimate-review' | 'narrative' | 'question';

const TASK_IDS: readonly TaskId[] = ['estimate-review', 'narrative', 'question'];

const MAX_CONTEXT_CHARS = 12_000;
const MAX_PROMPT_CHARS = 2_000;
const MAX_TOKENS = 2_048;
const REQUEST_TIMEOUT_MS = 55_000;

const SYSTEM_PROMPTS: Record<TaskId, string> = {
  'estimate-review': [
    'You are a restoration estimating auditor working inside Hays + Sons Complete Restoration.',
    'You audit Xactimate scope and line items against IICRC and Haag practice.',
    'Answer in four short headed sections and nothing else:',
    '1. Quantity and scope sanity flags',
    '2. Trades that look missing or thin for the stated loss type',
    '3. Pricing, tax, overhead and profit checks',
    '4. The three highest-value risks before this scope is sent out',
    'Cite line items by category and selector. Use the totals exactly as given.',
    'Never invent a quantity, price or field. When the digest does not carry a value, write "not in estimate".',
    'No preamble, no closing pleasantries, no markdown tables.',
  ].join(' '),
  narrative: [
    'You are drafting narrative copy for a Hays + Sons restoration document.',
    'Use only the facts in the supplied estimate digest. Do not invent scope, quantities, dates or dollar amounts.',
    'Write in the third person, past tense, plain professional English. No marketing language, no exclamation marks.',
    'Structure: one short opening paragraph naming the claim, insured and loss type; then bullet lines covering the affected assemblies and the measured quantities; then one short closing paragraph on the basis of the estimate.',
    'Where the digest lacks a detail, leave it out rather than guessing. Output the draft only.',
  ].join(' '),
  question: [
    'You answer an estimator\'s question about a single estimate.',
    'Ground every statement in the supplied digest and cite the line items or fields you used.',
    'If the digest cannot answer the question, say exactly what is missing instead of reasoning around it.',
    'Be brief and direct. If asked for a figure, give the figure from the digest and show the arithmetic.',
  ].join(' '),
};

function getApiKey(): string {
  return (process.env.DEEPSEEK_API_KEY || '').trim();
}

function getModel(): string {
  return (process.env.DEEPSEEK_MODEL || 'deepseek-flash').trim();
}

function getBaseUrl(): string {
  return (process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com').trim().replace(/\/+$/, '');
}

function clamp(value: unknown, maxChars: number): string {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  return trimmed.length > maxChars ? `${trimmed.slice(0, maxChars)}\n[digest truncated]` : trimmed;
}

function isTaskId(value: unknown): value is TaskId {
  return typeof value === 'string' && (TASK_IDS as readonly string[]).includes(value);
}

function parseBody(raw: unknown): Record<string, unknown> | null {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) return raw as Record<string, unknown>;
  if (typeof raw === 'string' && raw.trim()) {
    try {
      const parsed: unknown = JSON.parse(raw);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : null;
    } catch {
      return null;
    }
  }
  return null;
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

export default async function handler(req: ApiRequest, res: ApiResponse): Promise<void> {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Allow', 'GET, POST');

  const apiKey = getApiKey();
  const model = getModel();

  // Health probe: lets the UI tell "not configured" apart from "broken".
  // Reports only whether a key exists — never the key itself.
  if (req.method === 'GET') {
    res.status(200).json({ configured: Boolean(apiKey), model });
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed. Use POST.' });
    return;
  }

  if (!apiKey) {
    res.status(503).json({
      error:
        'DeepSeek is not configured on the server. Add DEEPSEEK_API_KEY to the Vercel project ' +
        '(Settings > Environment Variables) or to .env.local when running vercel dev, then redeploy.',
    });
    return;
  }

  const body = parseBody(req.body);
  if (!body) {
    res.status(400).json({ error: 'Request body must be a JSON object.' });
    return;
  }

  const task = body.task;
  if (!isTaskId(task)) {
    res.status(400).json({ error: `Unknown task. Expected one of: ${TASK_IDS.join(', ')}.` });
    return;
  }

  const context = clamp(body.context, MAX_CONTEXT_CHARS);
  if (context.length < 20) {
    res.status(400).json({ error: 'A claim context digest is required.' });
    return;
  }

  const prompt = clamp(body.prompt, MAX_PROMPT_CHARS);
  if (task === 'question' && !prompt) {
    res.status(400).json({ error: 'A question is required for the question task.' });
    return;
  }

  const userMessage =
    task === 'question'
      ? `ESTIMATE DIGEST\n${context}\n\nQUESTION\n${prompt}`
      : `ESTIMATE DIGEST\n${context}\n\nTASK\n${
          task === 'narrative'
            ? `Draft the narrative for this document: ${prompt || 'Client Narrative Proposal'}.`
            : 'Audit this scope now.'
        }`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const upstream = await fetch(`${getBaseUrl()}/chat/completions`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPTS[task] },
          { role: 'user', content: userMessage },
        ],
        max_tokens: MAX_TOKENS,
        temperature: task === 'narrative' ? 0.4 : 0.1,
        stream: false,
      }),
    });

    const payload: unknown = await upstream.json().catch(() => null);
    const data = (payload ?? {}) as {
      choices?: { message?: { content?: unknown } }[];
      usage?: { prompt_tokens?: number; completion_tokens?: number };
      error?: { message?: unknown };
    };

    if (!upstream.ok) {
      const detail =
        typeof data.error?.message === 'string' ? data.error.message : `HTTP ${upstream.status}`;
      const hint =
        upstream.status === 401
          ? 'DeepSeek rejected the credentials — check DEEPSEEK_API_KEY in Vercel.'
          : upstream.status === 402
            ? 'DeepSeek reports insufficient balance for this account.'
            : upstream.status === 429
              ? 'DeepSeek rate limit or quota reached — retry shortly.'
              : 'Upstream DeepSeek error.';
      res.status(upstream.status === 401 ? 502 : 502).json({ error: `${hint} (${detail})` });
      return;
    }

    const content = data.choices?.[0]?.message?.content;
    if (typeof content !== 'string' || !content.trim()) {
      res.status(502).json({ error: 'DeepSeek returned an empty completion.' });
      return;
    }

    res.status(200).json({ text: content.trim(), model, usage: data.usage ?? null });
  } catch (err) {
    const aborted = err instanceof Error && err.name === 'AbortError';
    res.status(aborted ? 504 : 502).json({
      error: aborted
        ? 'The DeepSeek request timed out before it answered. Try again or shorten the digest.'
        : `Could not reach DeepSeek: ${errorMessage(err)}`,
    });
  } finally {
    clearTimeout(timer);
  }
}
