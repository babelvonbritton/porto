// Email forwarding via Resend (plain HTTPS API, no SDK needed).
// Sends a plain-text email only — no HTML part, so a crafted message
// can never render as markup in the inbox. The only subrequest the
// Worker makes (1 of the 50 allowed on the free tier).

import type { ContactSubmission } from './validate.ts';

export interface MailConfig {
  apiKey: string;
  from: string;
  to: string;
  // Override for local testing (point at a stub server). Defaults to
  // the Resend API.
  apiUrl?: string;
}

const RESEND_API_URL = 'https://api.resend.com/emails';
const SEND_TIMEOUT_MS = 10_000;

export async function sendContactEmail(
  config: MailConfig,
  data: ContactSubmission,
): Promise<{ ok: boolean; status: number }> {
  const kindLabel = data.contactKind === 'email' ? 'Email' : 'WhatsApp';
  const text = [
    'New message from the Porto contact chat.',
    '',
    `Name: ${data.name}`,
    `Contact (${kindLabel}): ${data.contact}`,
    `Language: ${data.lang}`,
    '',
    'Message:',
    data.message,
  ].join('\n');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SEND_TIMEOUT_MS);
  try {
    const response = await fetch(config.apiUrl || RESEND_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: config.from,
        to: [config.to],
        subject: `New message from ${data.name} — Porto contact`,
        text,
        // Replying to the email answers the visitor directly, when
        // they left an email address.
        ...(data.contactKind === 'email' ? { reply_to: data.contact } : {}),
      }),
      signal: controller.signal,
    });
    return { ok: response.ok, status: response.status };
  } finally {
    clearTimeout(timer);
  }
}
