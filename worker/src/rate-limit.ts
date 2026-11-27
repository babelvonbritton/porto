
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
    if (this.perIp.size > 5000) this.perIp.clear();
    return 0;
  }
}
