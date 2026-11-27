
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
  website: string;
  openedAt: number;
}

export interface ValidationResult {
  ok: boolean;
  errorKey?: string;
}
