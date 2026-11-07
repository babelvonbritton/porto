// The contact chat widget: DOM wiring around the ConversationFlow.
// Owns bubbles, timestamps, typing indicator, language switching,
// focus management, and the submission lifecycle. No business rules
// live here — validation is in validation.ts, the state machine in
// flow.ts, strings in locales.ts, transport in api.ts.
//
// This module is loaded lazily (dynamic import on first open), so its
// code only downloads when a visitor actually opens the chat. Its
// stylesheet is loaded the same way: the constructor injects a <link>
// to public/chat-widget.css (Astro hoists imported stylesheets into
// the page head, so an import here would ship the CSS with every
// page load).

import { ConversationFlow, type FlowStep } from './flow';
import { ApiError, ContactApiClient } from './api';
import { getStrings, type ChatStrings } from './locales';
import type { Lang } from './types';

export interface WidgetOptions {
  // Page language (from the Astro prop): the visitor's chosen language.
  lang: Lang;
  // Contact API URL (PUBLIC_CONTACT_API_URL). '' when not configured —
  // the widget still opens and collects input, but submitting shows the
  // not-configured message with a mailto fallback.
  apiUrl: string;
  // Contact email for the not-configured fallback.
  email: string;
  // URL of public/chat-widget.css (base-aware, from the Astro prop).
  cssUrl: string;
}

const BOT_REPLY_DELAY_MS = 650;

function required<T extends Element>(el: T | null, name: string): T {
  if (!el) throw new Error(`Chat widget: missing element ${name}`);
  return el;
}

export class ChatWidget {
  private root: HTMLElement;
  private flow = new ConversationFlow();
  private api: ContactApiClient;
  private lang: Lang;
  private strings: ChatStrings;
  private email: string;

  private isOpen = false;
  private greeted = false;
  private openedAt = 0;
  private sending = false;
  private busy = false;

  private toggleBtn: HTMLButtonElement;
  private windowEl: HTMLElement;
  private messagesEl: HTMLElement;
  private formEl: HTMLFormElement;
  private inputEl: HTMLInputElement;
  private sendBtn: HTMLButtonElement;
  private confirmBox: HTMLElement;
  private confirmSendBtn: HTMLButtonElement;
  private startOverBtn: HTMLButtonElement;
  private honeypotEl: HTMLInputElement;
  private titleEl: HTMLElement;
  private subtitleEl: HTMLElement;
  private closeBtn: HTMLButtonElement;
  private langButtons: HTMLButtonElement[];
  private typingEl: HTMLElement | null = null;

  constructor(root: HTMLElement, options: WidgetOptions) {
    this.root = root;
    this.lang = options.lang;
    this.strings = getStrings(this.lang);
    this.email = options.email;
    this.api = new ContactApiClient(options.apiUrl);
    this.loadStylesheet(options.cssUrl);

    this.toggleBtn = required(root.querySelector<HTMLButtonElement>('[data-chat-toggle]'), 'toggle');
    this.windowEl = required(root.querySelector<HTMLElement>('[data-chat-window]'), 'window');
    this.messagesEl = required(root.querySelector<HTMLElement>('[data-chat-messages]'), 'messages');
    this.formEl = required(root.querySelector<HTMLFormElement>('[data-chat-form]'), 'form');
    this.inputEl = required(root.querySelector<HTMLInputElement>('[data-chat-input]'), 'input');
    this.sendBtn = required(root.querySelector<HTMLButtonElement>('[data-chat-send]'), 'send');
    this.confirmBox = required(root.querySelector<HTMLElement>('[data-chat-confirm]'), 'confirm box');
    this.confirmSendBtn = required(
      root.querySelector<HTMLButtonElement>('[data-chat-confirm-send]'),
      'confirm send',
    );
    this.startOverBtn = required(
      root.querySelector<HTMLButtonElement>('[data-chat-start-over]'),
      'start over',
    );
    this.honeypotEl = required(
      root.querySelector<HTMLInputElement>('[data-chat-honeypot]'),
      'honeypot',
    );
    this.titleEl = required(root.querySelector<HTMLElement>('[data-chat-title]'), 'title');
    this.subtitleEl = required(root.querySelector<HTMLElement>('[data-chat-subtitle]'), 'subtitle');
    this.closeBtn = required(root.querySelector<HTMLButtonElement>('[data-chat-close]'), 'close');
    this.langButtons = [...root.querySelectorAll<HTMLButtonElement>('[data-chat-lang]')];

    this.closeBtn.addEventListener('click', () => this.close());
    this.formEl.addEventListener('submit', (event) => {
      event.preventDefault();
      void this.handleTextSubmit();
    });
    this.confirmSendBtn.addEventListener('click', () => void this.handleConfirmSend());
    this.startOverBtn.addEventListener('click', () => this.handleStartOver());
    this.langButtons.forEach((btn) =>
      btn.addEventListener('click', () => {
        const next = btn.dataset.chatLang === 'id' ? 'id' : 'en';
        this.setLang(next);
      }),
    );
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && this.isOpen) this.close();
    });

    this.renderChrome();
  }

  // Injects the widget stylesheet on first open (once per page).
  // Kept out of the module graph so Astro doesn't hoist it into the
  // page head — see the header comment.
  private loadStylesheet(cssUrl: string): void {
    if (!cssUrl) return;
    if (document.querySelector(`link[href="${cssUrl}"]`)) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = cssUrl;
    document.head.appendChild(link);
  }

  toggle(): void {
    if (this.isOpen) this.close();
    else this.open();
  }

  open(): void {
    if (this.isOpen) return;
    this.isOpen = true;
    this.windowEl.hidden = false;
    this.root.classList.add('is-open');
    this.toggleBtn.setAttribute('aria-expanded', 'true');
    this.toggleBtn.setAttribute('aria-label', this.strings.closeChat);
    if (!this.greeted) {
      this.greeted = true;
      this.openedAt = Date.now();
      void this.applyStep(this.flow.greetingStep());
    }
    this.inputEl.focus();
  }

  close(): void {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.windowEl.hidden = true;
    this.root.classList.remove('is-open');
    this.toggleBtn.setAttribute('aria-expanded', 'false');
    this.toggleBtn.setAttribute('aria-label', this.strings.openChat);
    this.toggleBtn.focus();
  }

  setLang(next: Lang): void {
    if (next === this.lang) return;
    this.lang = next;
    this.strings = getStrings(next);
    this.renderChrome();
    // Nothing typed yet: restart the greeting in the new language so
    // the visitor never reads a half-translated conversation. History
    // is kept once the visitor has said something.
    if (this.flow.message === '' && this.flow.name === '') {
      this.messagesEl.innerHTML = '';
      void this.applyStep(this.flow.reset());
    }
  }

  // -- Conversation driving ------------------------------------------

  private async handleTextSubmit(): Promise<void> {
    if (this.sending || this.busy) return;
    const value = this.inputEl.value;
    if (value.trim() === '') return;
    const step = this.flow.submitText(value);
    if (step.errorKey) {
      this.addBubble(this.strings[step.errorKey as keyof ChatStrings] as string, 'bot');
      return;
    }
    this.inputEl.value = '';
    this.addBubble(value.trim(), 'user');
    await this.applyStep(step);
  }

  private async handleConfirmSend(): Promise<void> {
    if (this.sending) return; // Duplicate-submission guard.
    this.sending = true;
    this.setFormEnabled(false);
    this.confirmBox.hidden = true;
    this.flow.confirm();
    const status = this.addBubble(this.strings.sending, 'bot');
    try {
      const payload = this.flow.buildPayload(this.lang, this.honeypotEl.value, this.openedAt);
      await this.api.send(payload);
      this.flow.markDone();
      status.textContent = this.strings.success.replace('{name}', this.flow.name);
      this.updateBubbleTime(status);
      this.showActions([{ label: this.strings.newMessage, onClick: () => this.handleStartOver() }]);
    } catch (err) {
      const kind = err instanceof ApiError ? err.kind : 'server';
      this.flow.markError(kind === 'not-configured' ? 'notConfigured' : 'error');
      status.textContent =
        kind === 'not-configured' ? this.strings.notConfigured : this.strings.error;
      this.updateBubbleTime(status);
      if (kind === 'not-configured' && this.email) {
        this.showActions([
          { label: this.strings.emailMe, href: `mailto:${this.email}` },
          { label: this.strings.startOver, onClick: () => this.handleStartOver() },
        ]);
      } else {
        this.showActions([
          { label: this.strings.retry, onClick: () => this.handleRetry() },
          { label: this.strings.startOver, onClick: () => this.handleStartOver() },
        ]);
      }
    } finally {
      this.sending = false;
      this.setFormEnabled(true);
    }
  }

  private handleRetry(): void {
    this.clearActions();
    const step = this.flow.retry();
    this.applyConfirmMode(step);
  }

  private handleStartOver(): void {
    this.clearActions();
    this.messagesEl.innerHTML = '';
    this.inputEl.value = '';
    void this.applyStep(this.flow.reset());
  }

  // -- Rendering ------------------------------------------------------

  private async applyStep(step: FlowStep): Promise<void> {
    if (step.botKeys.length > 0) {
      this.setBusy(true);
      await this.say(step.botKeys);
      this.setBusy(false);
    }
    if (this.flow.state === 'confirming') {
      this.addSummaryBubble();
      this.applyConfirmMode(step);
      return;
    }
    this.applyTextMode(step);
  }

  private applyTextMode(step: FlowStep): void {
    this.confirmBox.hidden = true;
    this.formEl.hidden = false;
    this.inputEl.disabled = false;
    this.sendBtn.disabled = false;
    this.inputEl.placeholder =
      this.strings[step.placeholderKey ?? 'placeholderMessage'];
    this.inputEl.focus();
  }

  private applyConfirmMode(_step: FlowStep): void {
    this.formEl.hidden = true;
    this.confirmBox.hidden = false;
    this.confirmSendBtn.focus();
  }

  private async say(keys: string[]): Promise<void> {
    for (const key of keys) {
      if (!this.isOpen) return;
      this.showTyping();
      await this.sleep(BOT_REPLY_DELAY_MS);
      this.hideTyping();
      if (!this.isOpen) return;
      this.addBubble(this.strings[key as keyof ChatStrings] as string, 'bot');
    }
  }

  private addBubble(text: string, who: 'bot' | 'user'): HTMLElement {
    const bubble = document.createElement('div');
    bubble.className = `chat-bubble chat-bubble-${who}`;
    const body = document.createElement('span');
    body.textContent = text;
    bubble.appendChild(body);
    bubble.appendChild(this.timeElement());
    this.messagesEl.appendChild(bubble);
    this.scrollToBottom();
    return bubble;
  }

  private addSummaryBubble(): void {
    const s = this.strings;
    const bubble = document.createElement('div');
    bubble.className = 'chat-bubble chat-bubble-bot chat-summary';
    const rows: Array<[string, string]> = [
      [s.labelMessage, this.flow.message],
      [s.labelName, this.flow.name],
      [s.labelContact, this.flow.contact],
    ];
    for (const [label, value] of rows) {
      const row = document.createElement('div');
      row.className = 'chat-summary-row';
      const labelEl = document.createElement('b');
      labelEl.textContent = label;
      const valueEl = document.createElement('span');
      valueEl.textContent = value;
      row.appendChild(labelEl);
      row.appendChild(valueEl);
      bubble.appendChild(row);
    }
    bubble.appendChild(this.timeElement());
    this.messagesEl.appendChild(bubble);
    this.scrollToBottom();
  }

  private showActions(
    actions: Array<{ label: string; onClick?: () => void; href?: string }>,
  ): void {
    this.clearActions();
    const row = document.createElement('div');
    row.className = 'chat-actions';
    row.dataset.chatActions = '';
    actions.forEach((action, i) => {
      const el = document.createElement(action.href ? 'a' : 'button');
      el.className = `chat-btn${i === 0 ? '' : ' chat-btn-ghost'}`;
      el.textContent = action.label;
      if (action.href) (el as HTMLAnchorElement).href = action.href;
      else {
        (el as HTMLButtonElement).type = 'button';
        el.addEventListener('click', () => action.onClick?.());
      }
      row.appendChild(el);
    });
    this.messagesEl.appendChild(row);
    this.scrollToBottom();
  }

  private clearActions(): void {
    this.messagesEl.querySelector('[data-chat-actions]')?.remove();
  }

  private showTyping(): void {
    if (this.typingEl) return;
    const el = document.createElement('div');
    el.className = 'chat-bubble chat-bubble-bot chat-typing';
    el.setAttribute('aria-label', this.strings.typing);
    for (let i = 0; i < 3; i++) el.appendChild(document.createElement('span'));
    this.messagesEl.appendChild(el);
    this.typingEl = el;
    this.scrollToBottom();
  }

  private hideTyping(): void {
    this.typingEl?.remove();
    this.typingEl = null;
  }

  private timeElement(): HTMLElement {
    const time = document.createElement('time');
    time.className = 'chat-time';
    const now = new Date();
    time.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    time.dateTime = now.toISOString();
    return time;
  }

  private updateBubbleTime(bubble: HTMLElement): void {
    const time = bubble.querySelector('time');
    if (!time) return;
    const now = new Date();
    time.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    time.dateTime = now.toISOString();
  }

  private currentPlaceholderKey():
    | 'placeholderMessage'
    | 'placeholderName'
    | 'placeholderContact'
    | 'placeholderCountryCode' {
    switch (this.flow.state) {
      case 'awaitingName':
        return 'placeholderName';
      case 'awaitingContact':
        return 'placeholderContact';
      case 'awaitingCountryCode':
        return 'placeholderCountryCode';
      default:
        return 'placeholderMessage';
    }
  }

  private renderChrome(): void {
    const s = this.strings;
    this.titleEl.textContent = s.title;
    this.subtitleEl.textContent = s.subtitle;
    this.toggleBtn.setAttribute(
      'aria-label',
      this.isOpen ? s.closeChat : s.openChat,
    );
    this.closeBtn.setAttribute('aria-label', s.closeChat);
    this.inputEl.placeholder = s[this.currentPlaceholderKey()];
    this.inputEl.setAttribute('aria-label', s[this.currentPlaceholderKey()]);
    this.sendBtn.setAttribute('aria-label', s.send);
    this.confirmSendBtn.textContent = s.sendMessage;
    this.startOverBtn.textContent = s.startOver;
    this.langButtons.forEach((btn) => {
      const active = btn.dataset.chatLang === this.lang;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
  }

  private setBusy(busy: boolean): void {
    this.busy = busy;
    this.inputEl.disabled = busy;
    this.sendBtn.disabled = busy;
  }

  private setFormEnabled(enabled: boolean): void {
    this.inputEl.disabled = !enabled;
    this.sendBtn.disabled = !enabled;
    this.confirmSendBtn.disabled = !enabled;
  }

  private scrollToBottom(): void {
    this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
