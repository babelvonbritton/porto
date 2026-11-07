// The predefined finite-state conversation flow (not AI-powered).
// Pure logic: no DOM access. The widget drives it and renders the
// messages it returns. States:
//   greeting -> awaitingMessage -> awaitingName -> awaitingContact
//   -> awaitingCountryCode (for local phone numbers)
//   -> confirming -> submitting -> done | error

import type { ContactKind, ContactPayload, FlowState, ValidationResult } from './types';
import {
  detectContactKind,
  normalizeInternationalPhone,
  normalizePhoneWithCountryCode,
  validateContact,
  validateMessage,
  validateName,
} from './validation';

export interface FlowStep {
  // Bot message keys (into locales.ts) to show after this transition.
  botKeys: string[];
  // The input the widget should show next: 'text' (free typing),
  // 'confirm' (Send / Start over buttons), or 'none'.
  input: 'text' | 'confirm' | 'none';
  // Placeholder key for the text input, when input is 'text'.
  placeholderKey?:
    | 'placeholderMessage'
    | 'placeholderName'
    | 'placeholderContact'
    | 'placeholderCountryCode';
  // Error key to show when the user's input failed validation.
  errorKey?: string;
}

const INPUT_FOR_STATE: Record<FlowState, FlowStep['input']> = {
  greeting: 'none',
  awaitingMessage: 'text',
  awaitingName: 'text',
  awaitingContact: 'text',
  awaitingCountryCode: 'text',
  confirming: 'confirm',
  submitting: 'none',
  done: 'none',
  error: 'none',
};

const PLACEHOLDER_FOR_STATE: Partial<Record<FlowState, FlowStep['placeholderKey']>> = {
  awaitingMessage: 'placeholderMessage',
  awaitingName: 'placeholderName',
  awaitingContact: 'placeholderContact',
  awaitingCountryCode: 'placeholderCountryCode',
};

export class ConversationFlow {
  state: FlowState = 'greeting';
  name = '';
  message = '';
  contact = '';
  contactKind: ContactKind | null = null;
  private phoneAwaitingCountryCode = '';

  // The first bot message, shown when the chat window opens.
  greetingStep(): FlowStep {
    this.state = 'awaitingMessage';
    return { botKeys: ['greeting'], input: 'text', placeholderKey: 'placeholderMessage' };
  }

  // Handles one line of user input in a text state. Returns the next
  // step, or an error key when the input failed validation (state stays).
  submitText(raw: string): FlowStep {
    const text = raw.trim();
    switch (this.state) {
      case 'awaitingMessage': {
        const check = validateMessage(text);
        if (!check.ok) return this.invalid(check);
        this.message = text;
        this.state = 'awaitingName';
        return { botKeys: ['askName'], input: 'text', placeholderKey: 'placeholderName' };
      }
      case 'awaitingName': {
        const check = validateName(text);
        if (!check.ok) return this.invalid(check);
        this.name = text;
        this.state = 'awaitingContact';
        return { botKeys: ['askContact'], input: 'text', placeholderKey: 'placeholderContact' };
      }
      case 'awaitingContact': {
        const check = validateContact(text);
        if (!check.ok) return this.invalid(check);
        const kind = detectContactKind(text);
        if (kind === 'email') {
          this.contact = text;
          this.contactKind = kind;
          this.state = 'confirming';
          return { botKeys: ['confirmIntro'], input: 'confirm' };
        }

        if (text.startsWith('+')) {
          const normalized = normalizeInternationalPhone(text);
          if (!normalized) return this.invalid({ ok: false, errorKey: 'errContactInvalid' });
          this.contact = normalized;
          this.contactKind = 'whatsapp';
          this.state = 'confirming';
          return { botKeys: ['confirmIntro'], input: 'confirm' };
        }

        this.phoneAwaitingCountryCode = text;
        this.state = 'awaitingCountryCode';
        return {
          botKeys: ['askCountryCode'],
          input: 'text',
          placeholderKey: 'placeholderCountryCode',
        };
      }
      case 'awaitingCountryCode': {
        const normalized = normalizePhoneWithCountryCode(this.phoneAwaitingCountryCode, text);
        if (!normalized) {
          return this.invalid({ ok: false, errorKey: 'errCountryCodeInvalid' });
        }
        this.contact = normalized;
        this.contactKind = 'whatsapp';
        this.state = 'confirming';
        return { botKeys: ['confirmIntro'], input: 'confirm' };
      }
      default:
        return { botKeys: [], input: INPUT_FOR_STATE[this.state] };
    }
  }

  // The visitor confirmed the summary: ready to submit.
  confirm(): FlowStep {
    if (this.state !== 'confirming') return { botKeys: [], input: INPUT_FOR_STATE[this.state] };
    this.state = 'submitting';
    return { botKeys: ['sending'], input: 'none' };
  }

  // The submission succeeded.
  markDone(): FlowStep {
    this.state = 'done';
    return { botKeys: ['success'], input: 'none' };
  }

  // The submission failed (network, server, or not configured).
  // `key` selects the error message: 'error' or 'notConfigured'.
  markError(key: 'error' | 'notConfigured'): FlowStep {
    this.state = 'error';
    return { botKeys: [key], input: 'none' };
  }

  // Retry after an error: back to the confirmation step.
  retry(): FlowStep {
    this.state = 'confirming';
    return { botKeys: [], input: 'confirm' };
  }

  // Start over from the beginning (also used for "send another message").
  reset(): FlowStep {
    this.state = 'greeting';
    this.name = '';
    this.message = '';
    this.contact = '';
    this.contactKind = null;
    this.phoneAwaitingCountryCode = '';
    return this.greetingStep();
  }

  // Builds the submission payload. Only valid once the flow reached
  // 'confirming' or beyond (message, name, and contact all collected).
  buildPayload(lang: 'en' | 'id', website: string, openedAt: number): ContactPayload {
    return {
      message: this.message,
      name: this.name,
      contact: this.contact,
      contactKind: this.contactKind ?? 'email',
      lang,
      website,
      openedAt,
    };
  }

  private invalid(check: ValidationResult): FlowStep {
    return {
      botKeys: [],
      input: INPUT_FOR_STATE[this.state],
      placeholderKey: PLACEHOLDER_FOR_STATE[this.state],
      errorKey: check.errorKey,
    };
  }
}
