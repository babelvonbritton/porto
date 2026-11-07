// Porto contact API — POST /api/contact.
//
// Free-tier design (Cloudflare Workers Free: 100,000 requests/day,
// 10 ms CPU per request, 50 subrequests per request):
//   - No KV, Durable Objects, R2, or database — rate limiting is
//     in-memory, so no storage quota is ever touched.
//   - One subrequest per valid submission (the Resend call); every
//     rejected request is answered without any subrequest.
//   - The frontend sends text/plain, so the browser skips the CORS
//     preflight — one submission costs one Worker invocation, not two.
//   - Rejects are ordered cheapest-first: origin, then rate limit,
//     then body, so abuse burns almost no CPU (well under 10 ms).
//   - Only failures are logged; request contents are never logged.

import { RateLimiter } from './rate-limit.ts';
import { validateSubmission } from './validate.ts';
import { sendContactEmail } from './mail.ts';

interface Env {
  RESEND_API_KEY?: string;
  CONTACT_TO?: string;
  CONTACT_FROM?: string;
  ALLOWED_ORIGINS?: string;
  RESEND_API_URL?: string;
}

const MAX_BODY_BYTES = 10 * 1024;
// A submission completed faster than this after opening the chat is
// almost certainly a bot (a human has to type three answers).
const MIN_HUMAN_MS = 3000;

const DEFAULT_ORIGINS = [
  'https://porto.bvbritton.bond',
  'http://localhost:4321',
  'http://127.0.0.1:4321',
];

const limiter = new RateLimiter();

function allowedOrigins(env: Env): string[] {
  const raw = env.ALLOWED_ORIGINS?.trim();
  if (!raw) return DEFAULT_ORIGINS;
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function corsHeaders(origin: string | null, allowed: string[]): Record<string, string> {
  const headers: Record<string, string> = {
    Vary: 'Origin',
    'X-Content-Type-Options': 'nosniff',
  };
  if (origin && allowed.includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
  }
  return headers;
}

function json(
  data: unknown,
  status: number,
  origin: string | null,
  allowed: string[],
  extra?: Record<string, string>,
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(origin, allowed), ...extra },
  });
}

function clientIp(request: Request): string {
  return (
    request.headers.get('CF-Connecting-IP') ||
    request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() ||
    'unknown'
  );
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin');
    const allowed = allowedOrigins(env);

    if (request.method === 'GET' && url.pathname === '/') {
      return json({ ok: true, service: 'porto-contact' }, 200, origin, allowed);
    }

    // CORS preflight. The frontend avoids it (text/plain), but a
    // preflight from any other client is answered properly.
    if (request.method === 'OPTIONS') {
      if (!origin || !allowed.includes(origin)) {
        return json({ ok: false, error: 'forbidden' }, 403, origin, allowed);
      }
      return new Response(null, {
        status: 204,
        headers: {
          ...corsHeaders(origin, allowed),
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    if (request.method !== 'POST' || url.pathname !== '/api/contact') {
      return json({ ok: false, error: 'not-found' }, 404, origin, allowed);
    }

    // 1. Origin validation — before reading the body (cheapest reject).
    if (!origin || !allowed.includes(origin)) {
      return json({ ok: false, error: 'forbidden' }, 403, origin, allowed);
    }

    // 2. Rate limiting — before any expensive work.
    const wait = limiter.check(clientIp(request), Date.now());
    if (wait > 0) {
      return json({ ok: false, error: 'rate-limited' }, 429, origin, allowed, {
        'Retry-After': String(wait),
      });
    }

    // 3. Body: size cap, then JSON parse. Accepts text/plain (what the
    // frontend sends) and application/json.
    const contentType = request.headers.get('Content-Type') || '';
    if (!contentType.includes('application/json') && !contentType.includes('text/plain')) {
      return json({ ok: false, error: 'invalid-content-type' }, 400, origin, allowed);
    }
    const declaredLength = Number(request.headers.get('Content-Length') || '0');
    if (declaredLength > MAX_BODY_BYTES) {
      return json({ ok: false, error: 'too-large' }, 413, origin, allowed);
    }
    let raw: unknown;
    try {
      const text = await request.text();
      if (new TextEncoder().encode(text).length > MAX_BODY_BYTES) {
        return json({ ok: false, error: 'too-large' }, 413, origin, allowed);
      }
      raw = JSON.parse(text);
    } catch {
      return json({ ok: false, error: 'invalid-json' }, 400, origin, allowed);
    }

    // 4. Honeypot + impossibly-fast submission: bots get a silent
    // success (no email sent, no hint they were caught).
    const body = raw as Record<string, unknown>;
    const honeypot = typeof body.website === 'string' ? body.website : '';
    const openedAt = typeof body.openedAt === 'number' ? body.openedAt : 0;
    if (honeypot.trim() !== '' || (openedAt > 0 && Date.now() - openedAt < MIN_HUMAN_MS)) {
      return json({ ok: true }, 200, origin, allowed);
    }

    // 5. Validation + sanitization (same rules as the frontend).
    const result = validateSubmission(raw);
    if (!result.ok) {
      return json({ ok: false, error: 'validation', fields: result.errors }, 400, origin, allowed);
    }

    // 6. Configuration check — a Worker without its secrets must say
    // so clearly instead of failing on the email call.
    if (!env.RESEND_API_KEY || !env.CONTACT_TO || !env.CONTACT_FROM) {
      return json({ ok: false, error: 'not-configured' }, 503, origin, allowed);
    }

    // 7. Forward the email — the only subrequest this Worker makes.
    try {
      const sent = await sendContactEmail(
        {
          apiKey: env.RESEND_API_KEY,
          from: env.CONTACT_FROM,
          to: env.CONTACT_TO,
          apiUrl: env.RESEND_API_URL,
        },
        result.data,
      );
      if (!sent.ok) {
        console.error(`porto-contact: resend failed (status ${sent.status})`);
        return json({ ok: false, error: 'email-failed' }, 502, origin, allowed);
      }
    } catch (err) {
      console.error('porto-contact: resend error', err);
      return json({ ok: false, error: 'email-failed' }, 502, origin, allowed);
    }

    return json({ ok: true }, 200, origin, allowed);
  },
};
