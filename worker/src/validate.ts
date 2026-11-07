// Validation + sanitization for the contact submission (backend).
// Mirrors the frontend rules in src/components/chat/validation.ts —
// the frontend checks are for fast feedback only; these are the ones
// that count. Never trust the client: every field is re-checked here.

export type ContactKind = 'email' | 'whatsapp';

export interface ContactSubmission {
  message: string;
  name: string;
  contact: string;
  contactKind: ContactKind;
  lang: 'en' | 'id';
  website: string;
  openedAt: number;
}

export interface FieldError {
  field: string;
  code: string;
}

export type ValidationOutcome =
  | { ok: true; data: ContactSubmission }
  | { ok: false; errors: FieldError[] };

export const LIMITS = {
  messageMin: 1,
  messageMax: 2000,
  nameMin: 2,
  nameMax: 100,
} as const;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^\+?[0-9]{7,15}$/;

// Strips control characters. Multiline fields (the message) keep
// newlines; single-line fields (name, contact) lose them, so a crafted
// value can never inject a line into the email headers or body.
export function sanitizeText(value: unknown, multiline: boolean): string {
  if (typeof value !== 'string') return '';
  const stripped = multiline
    ? value.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    : value.replace(/[\x00-\x1F\x7F]/g, '');
  return stripped.trim();
}

function detectContactKind(value: string): ContactKind | null {
  if (EMAIL_RE.test(value)) return 'email';
  const phone = value.replace(/[\s\-().]/g, '');
  if (PHONE_RE.test(phone)) return 'whatsapp';
  return null;
}

export function validateSubmission(raw: unknown): ValidationOutcome {
  const errors: FieldError[] = [];
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return { ok: false, errors: [{ field: 'body', code: 'not-an-object' }] };
  }
  const body = raw as Record<string, unknown>;

  const message = sanitizeText(body.message, true).replace(/\n{3,}/g, '\n\n');
  if (message.length < LIMITS.messageMin) {
    errors.push({ field: 'message', code: 'too-short' });
  } else if (message.length > LIMITS.messageMax) {
    errors.push({ field: 'message', code: 'too-long' });
  }

  const name = sanitizeText(body.name, false);
  if (name.length < LIMITS.nameMin) {
    errors.push({ field: 'name', code: 'too-short' });
  } else if (name.length > LIMITS.nameMax) {
    errors.push({ field: 'name', code: 'too-long' });
  }

  const contact = sanitizeText(body.contact, false);
  const contactKind = detectContactKind(contact);
  if (!contactKind) {
    errors.push({ field: 'contact', code: 'invalid' });
  }

  // Honeypot and timing are handled by the caller (index.ts) before
  // this runs; here they are only normalized, never trusted.
  const website = typeof body.website === 'string' ? body.website : '';
  const openedAt = typeof body.openedAt === 'number' ? body.openedAt : 0;

  if (errors.length > 0) return { ok: false, errors };

  return {
    ok: true,
    data: {
      message,
      name,
      contact,
      contactKind: contactKind as ContactKind,
      lang: body.lang === 'id' ? 'id' : 'en',
      website,
      openedAt,
    },
  };
}
