
import type { ContactKind, ValidationResult } from './types';
import {
  getCountries,
  getCountryCallingCode,
  parsePhoneNumberFromString,
} from 'libphonenumber-js';

export const LIMITS = {
  messageMin: 1,
  messageMax: 2000,
  nameMin: 2,
  nameMax: 100,
} as const;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

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

export function normalizeInternationalPhone(text: string): string | null {
  const phone = parsePhoneNumberFromString(text.trim());
  return phone?.isValid() ? phone.number : null;
}

export function normalizePhoneWithCountryCode(
  phoneText: string,
  countryCodeText: string,
): string | null {
  const match = /^\+?([1-9]\d{0,2})$/.exec(countryCodeText.trim());
  if (!match) return null;

  const countryCode = match[1];
  const countries = getCountries().filter(
    (country) => getCountryCallingCode(country) === countryCode,
  );
  for (const country of countries) {
    const phone = parsePhoneNumberFromString(phoneText.trim(), country);
    if (phone?.isValid() && phone.countryCallingCode === countryCode) return phone.number;
  }
  return null;
}

export function validateContact(text: string): ValidationResult {
  if (detectContactKind(text) === null) {
    return { ok: false, errorKey: 'errContactInvalid' };
  }
  return { ok: true };
}
