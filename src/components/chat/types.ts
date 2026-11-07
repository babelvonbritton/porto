// Shared types for the contact chat widget (frontend only).
// The backend mirrors these shapes in worker/src/validate.ts.

export type Lang = 'en' | 'id';

export type ContactKind = 'email' | 'whatsapp';

export type FlowState =
  | 'greeting'
  | 'awaitingMessage'
  | 'awaitingName'
  | 'awaitingContact'
  | 'awaitingCountryCode'
  | 'confirming'
  | 'submitting'
  | 'done'
  | 'error';

export interface ContactPayload {
  message: string;
  name: string;
  contact: string;
  contactKind: ContactKind;
  lang: Lang;
  // Honeypot field: always empty for a human visitor. A filled value
  // means a bot — the backend accepts it silently and sends nothing.
  website: string;
  // Epoch ms when the visitor first opened the chat window. The backend
  // uses it to reject submissions completed impossibly fast (bots).
  openedAt: number;
}

export interface ValidationResult {
  ok: boolean;
  // Key into the localized error strings (locales.ts), not a message.
  errorKey?: string;
}
