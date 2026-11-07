# Porto contact API

A standalone Cloudflare Worker that receives the contact chat widget's
submissions (`POST /api/contact`) and forwards them by email. It deploys
independently from the static site — the site never talks to anything
except this one endpoint.

## Free-tier budget

The Worker is designed to live inside the **Cloudflare Workers Free**
plan, verified against Cloudflare's limits docs
(`developers.cloudflare.com/workers/platform/limits`):

| Limit (Free) | This Worker |
| --- | --- |
| 100,000 requests/day (resets 00:00 UTC; past it, Error 1027 — never a bill) | One invocation per submission. A personal contact form sees a handful a day; even 1,000 submissions/day is 1% of the budget. |
| 10 ms CPU per request (network waits don't count) | Validation is string ops + regex — well under 1 ms of CPU. The Resend call is network I/O, not CPU. |
| 50 subrequests per request | Exactly 1 (Resend), only for valid submissions. Rejected requests make none. |
| 128 MB memory per isolate | One small Map for rate limiting. |
| KV 1,000 writes/day, 100,000 reads/day | **Not used.** A KV-backed rate limiter would burn its write budget after 1% of the request budget — that's why the limiter is in-memory (see `src/rate-limit.ts`). |
| No KV / Durable Objects / R2 / D1 bindings | None. Nothing to provision, nothing to bill. |

Six choices keep it inside the budget:

1. **One invocation per submission.** The frontend sends `Content-Type:
   text/plain` (the body is still JSON), so the browser treats the POST
   as a CORS "simple request" and skips the preflight OPTIONS call —
   two invocations become one.
2. **No polling, no prefetch.** The widget makes zero API calls until
   the visitor hits "Send message".
3. **Cheapest rejects first.** Origin → rate limit → body → honeypot →
   validation. Abuse is answered without a subrequest and with almost
   no CPU.
4. **In-memory rate limiting** (5 submissions per IP per 10 minutes,
   plus a 1,000/minute per-isolate circuit breaker). No storage quota.
5. **Minimal logging.** Only failures are logged; message contents are
   never logged.
6. **No paid bindings.** See the table above.

**Optional outer shield (recommended):** the Cloudflare Free plan
includes one rate-limiting rule. It runs at the edge *before* the
Worker, so blocked floods never become Worker invocations at all.
Dashboard → Security → WAF → Rate limiting rules → Create rule:

- If: Hostname equals `<your-worker-subdomain>.workers.dev` **and**
  URI Path contains `/api/contact`
- When: more than **20 requests per 1 minute** from the same IP
- Then: Block for 10 minutes

20/minute per IP is far above any human (one message per visit) and
stops a single-IP flood cold.

## Setup

### 1. Resend account + API key

The Worker forwards mail through [Resend](https://resend.com) (plain
HTTPS API, no SDK). Create an account, then create an API key with
**Sending access** only.

### 2. Verify the sender domain

Resend only sends from domains you verify. In Resend → Domains, add
`your-domain` and add the DKIM/SPF records it shows to the
Cloudflare DNS zone (DNS-only records — they don't affect the site).
The `CONTACT_FROM` address (`contact@porto.your-domain`) must use
that verified domain. Until it's verified, Resend rejects the send and
the Worker answers `502 email-failed` (the widget shows the retry
message).

For a first smoke test you can instead set `CONTACT_FROM` to
`onboarding@resend.dev` — Resend only delivers those to the account
owner's own inbox, so switch to the verified domain before going live.

### 3. Secrets and variables

Secrets (never in a file, never in git):

```sh
cd worker
npx wrangler login
npx wrangler secret put RESEND_API_KEY
```

Variables live in `wrangler.toml` (`[vars]`) — they are not secrets:

- `CONTACT_TO` — the inbox that receives the messages.
- `CONTACT_FROM` — the verified sender address (see step 2).
- `ALLOWED_ORIGINS` — comma-separated origins allowed to call the API.
  The site's origin must be listed; `localhost` entries are for local
  testing only.

### 4. Deploy

```sh
npx wrangler deploy
```

Wrangler prints the Worker URL, e.g.
`https://porto-contact.<your-subdomain>.workers.dev`. The API lives at
`<that-url>/api/contact`.

### 5. Wire the site

Set the Worker URL as a **repository variable** (not a secret — it's a
public endpoint): repo → Settings → Secrets and variables → Actions →
Variables → New variable, name `CONTACT_API_URL`, value the full
`https://…/api/contact` URL. The Pages workflow passes it to the build
as `PUBLIC_CONTACT_API_URL`. Push (or re-run the workflow) and the
widget starts submitting.

Until the variable is set, the widget still opens and collects input —
submitting shows a "not connected yet" message with a mailto link
instead of failing silently.

## Local development

```sh
cd worker
cp .dev.vars.example .dev.vars   # fill in your key (gitignored)
npx wrangler dev                 # serves http://localhost:8787
```

Then point the site at it for a local test:

```sh
PUBLIC_CONTACT_API_URL=http://localhost:8787/api/contact npm run dev
```

## Testing

Against the deployed Worker (replace the host):

```sh
API=https://porto-contact.<your-subdomain>.workers.dev/api/contact
ORIGIN=https://porto.your-domain

# 1. Valid submission (expect 200 {"ok":true}; an email arrives)
curl -s -X POST "$API" -H "Origin: $ORIGIN" -H "Content-Type: text/plain" \
  -d '{"message":"Hello from the test","name":"Test","contact":"test@example.com","contactKind":"email","lang":"en","website":"","openedAt":0}'

# 2. Bad contact (expect 400 validation)
curl -s -X POST "$API" -H "Origin: $ORIGIN" -H "Content-Type: text/plain" \
  -d '{"message":"Hi","name":"Test","contact":"not-an-email","contactKind":"email","lang":"en","website":"","openedAt":0}'

# 3. Honeypot filled (expect 200 {"ok":true} — but NO email arrives)
curl -s -X POST "$API" -H "Origin: $ORIGIN" -H "Content-Type: text/plain" \
  -d '{"message":"Spam","name":"Bot","contact":"bot@example.com","contactKind":"email","lang":"en","website":"http://spam.example","openedAt":0}'

# 4. Wrong origin (expect 403 forbidden)
curl -s -X POST "$API" -H "Origin: https://evil.example" -H "Content-Type: text/plain" \
  -d '{"message":"Hi","name":"Test","contact":"test@example.com","contactKind":"email","lang":"en","website":"","openedAt":0}'

# 5. No origin at all (expect 403 — browsers always send one on POST)
curl -s -X POST "$API" -H "Content-Type: text/plain" \
  -d '{"message":"Hi","name":"Test","contact":"test@example.com","contactKind":"email","lang":"en","website":"","openedAt":0}'

# 6. Rate limit: six quick valid submissions from one IP —
# the first five return 200, the sixth returns 429 rate-limited.
for i in 1 2 3 4 5 6; do
  curl -s -o /dev/null -w "%{http_code}\n" -X POST "$API" -H "Origin: $ORIGIN" \
    -H "Content-Type: text/plain" \
    -d '{"message":"Rate test","name":"Test","contact":"test@example.com","contactKind":"email","lang":"en","website":"","openedAt":0}'
done
```

## Swapping the mail provider

Only `src/mail.ts` knows about Resend. Replace `sendContactEmail`
with a call to another provider (MailChannels, SendGrid, SES, …) — it
takes the config + the validated submission and returns
`{ ok, status }`. Nothing else changes.

## Honest limits

- **Rate limiting is per isolate, not global.** A flood spread across
  many Cloudflare isolates can exceed 5/10min per IP in aggregate.
  The dashboard rate-limiting rule above is the real outer shield.
- **The email is only as reliable as Resend.** If Resend is down or
  the sender domain isn't verified, submissions fail with a retry
  message — nothing is queued or stored. (By design: no database.)
- **In-memory state resets on deploy** and varies by isolate — that's
  fine for a limiter; it holds no data the site depends on.
