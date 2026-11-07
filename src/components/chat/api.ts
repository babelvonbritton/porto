// API client for the contact endpoint (POST /api/contact).
// One submission = one request. The request is sent as text/plain (the
// body is still JSON) so the browser treats it as a CORS "simple
// request": no preflight OPTIONS call, which halves the number of
// Cloudflare Worker invocations per submission (free-tier request
// budget). The Worker accepts text/plain and application/json alike.

import type { ContactPayload } from './types';

export type ApiErrorKind =
  | 'not-configured'
  | 'network'
  | 'timeout'
  | 'validation'
  | 'rate-limited'
  | 'server';

export class ApiError extends Error {
  constructor(public kind: ApiErrorKind) {
    super(kind);
  }
}

const TIMEOUT_MS = 10000;

export class ContactApiClient {
  constructor(private apiUrl: string) {}

  get configured(): boolean {
    return this.apiUrl.length > 0;
  }

  async send(payload: ContactPayload): Promise<void> {
    if (!this.configured) throw new ApiError('not-configured');

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    let response: Response;
    try {
      response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
    } catch (err) {
      if ((err as Error).name === 'AbortError') throw new ApiError('timeout');
      throw new ApiError('network');
    } finally {
      clearTimeout(timer);
    }

    if (response.ok) return;
    if (response.status === 400) throw new ApiError('validation');
    if (response.status === 429) throw new ApiError('rate-limited');
    if (response.status === 503) throw new ApiError('not-configured');
    throw new ApiError('server');
  }
}
