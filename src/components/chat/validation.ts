// Input validation for the contact chat widget (frontend mirror).
// The backend enforces the same rules again in worker/src/validate.ts —
// frontend checks are for fast feedback only, never for trust.

import type { ContactKind, ValidationResult } from './types';

export const LIMITS = {
  messageMin: 1,
  messageMax: 2000,
  nameMin: 2,
  nameMax: 100,
} as const;

// A pragmatic email check: one @, a domain with a dot, no spaces.
// Deliberately not the full RFC — a contact form needs "looks like an
// email", not a proof.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// WhatsApp-style phone: optional leading +, then 7–15 digits. Spaces,
// dashes, parentheses, and dots are ignored before the check.
const PHONE_RE = /^\+?[0-9]{7,15}$/;

export function validateMessage(text: string): ValidationResult {
  const value = text.trim();
  if (value.length < LIMITS.messageMin) return { ok: false, errorKey: 'errMessageEmpty' };
  if (value.length > LIMITS.messageMax) return { ok: false, errorKey: 'errMessageTooLong' };
  return { ok: true };
}

export function validateName(text: string): ValidationResult {
  const value = text.trim();
  if (value.length < LIMITS.nameMin) return { ok: false, errorKey: 'errNameTooShort' };
  if (value.length > LIMITS.nameMax) return { ok: false, errorKey: 'errNameTooLong' };
  return { ok: true };
}

function normalizePhone(text: string): string {
  return text.replace(/[\s\-().]/g, '');
}

export function detectContactKind(text: string): ContactKind | null {
  const value = text.trim();
  if (EMAIL_RE.test(value)) return 'email';
  if (PHONE_RE.test(normalizePhone(value))) return 'whatsapp';
  return null;
}

export function validateContact(text: string): ValidationResult {
  if (detectContactKind(text) === null) {
    return { ok: false, errorKey: 'errContactInvalid' };
  }
  return { ok: true };
}
