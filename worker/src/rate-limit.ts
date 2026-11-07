// In-memory rate limiting (per isolate, no storage bindings).
//
// Deliberately NOT backed by KV: Workers KV Free allows only 1,000
// writes/day, so a KV-backed limiter would exhaust its write budget
// after 1% of the 100,000 requests/day the Worker itself allows.
// In-memory counters cost nothing but a Map lookup, and the limiter's
// job is only to keep abuse cheap — a determined attacker hitting many
// isolates is stopped by the Cloudflare dashboard rate-limiting rule
// documented in the README instead.
//
// Two caps:
//   - Per IP: 5 submissions per 10 minutes (a human sends one).
//   - Global (per isolate): 1,000 requests per minute — a circuit
//     breaker against a distributed flood; far above any legitimate
//     rate for a personal contact form.

export class RateLimiter {
  private perIp = new Map<string, number[]>();
  private windowStart = 0;
  private windowCount = 0;
  private maxPerIp: number;
  private windowMs: number;
  private maxGlobalPerMinute: number;

  constructor(maxPerIp = 5, windowMs = 10 * 60 * 1000, maxGlobalPerMinute = 1000) {
    this.maxPerIp = maxPerIp;
    this.windowMs = windowMs;
    this.maxGlobalPerMinute = maxGlobalPerMinute;
  }

  // Returns 0 when the request may proceed, or the seconds to wait
  // when it is limited.
  check(ip: string, now: number): number {
    if (now - this.windowStart >= 60_000) {
      this.windowStart = now;
      this.windowCount = 0;
    }
    this.windowCount += 1;
    if (this.windowCount > this.maxGlobalPerMinute) return 60;

    const recent = (this.perIp.get(ip) ?? []).filter((t) => now - t < this.windowMs);
    if (recent.length >= this.maxPerIp) {
      this.perIp.set(ip, recent);
      return Math.ceil((recent[0] + this.windowMs - now) / 1000);
    }
    recent.push(now);
    this.perIp.set(ip, recent);
    // Bound memory: a flood of distinct IPs never grows the map past
    // this. Clearing only resets limits, never blocks anyone.
    if (this.perIp.size > 5000) this.perIp.clear();
    return 0;
  }
}
