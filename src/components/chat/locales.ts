// All user-facing strings for the contact chat widget, in both
// languages. Written natively per language — not word-for-word
// translations — following the site's copy convention in site.ts.

import type { Lang } from './types';

export interface ChatStrings {
  openChat: string;
  closeChat: string;
  title: string;
  subtitle: string;
  greeting: string;
  askName: string;
  askContact: string;
  askCountryCode: string;
  confirmIntro: string;
  sending: string;
  success: string;
  error: string;
  notConfigured: string;
  placeholderMessage: string;
  placeholderName: string;
  placeholderContact: string;
  placeholderCountryCode: string;
  send: string;
  sendMessage: string;
  startOver: string;
  retry: string;
  close: string;
  newMessage: string;
  labelMessage: string;
  labelName: string;
  labelContact: string;
  errMessageEmpty: string;
  errMessageTooLong: string;
  errNameTooShort: string;
  errNameTooLong: string;
  errContactInvalid: string;
  errCountryCodeInvalid: string;
  typing: string;
  emailMe: string;
}

export const STRINGS: Record<Lang, ChatStrings> = {
  en: {
    openChat: 'Open chat',
    closeChat: 'Close chat',
    title: 'Chat with Alzam',
    subtitle: 'Leave a message below.',
    greeting:
      "Hi there! Leave a message for Alzam and he'll get back to you. What's your message?",
    askName: 'Thanks! What should I call you?',
    askContact: 'And how can Alzam reach you — your email or WhatsApp number?',
    askCountryCode: 'What is your country calling code? For example, +1 for USA or Canada.',
    confirmIntro: "Here's what I'll send — take a quick look, then hit send.",
    sending: 'Sending…',
    success: 'Message sent! Thanks, {name} — Alzam will get back to you soon.',
    error: 'Something went wrong while sending. Please try again.',
    notConfigured:
      "The contact form isn't connected yet — you can email Alzam directly instead.",
    placeholderMessage: 'Type your message…',
    placeholderName: 'Your name',
    placeholderContact: 'Email or WhatsApp number',
    placeholderCountryCode: 'Country calling code, e.g. +1',
    send: 'Send',
    sendMessage: 'Send message',
    startOver: 'Start over',
    retry: 'Try again',
    close: 'Close',
    newMessage: 'Send another message',
    labelMessage: 'Message',
    labelName: 'Name',
    labelContact: 'Contact',
    errMessageEmpty: 'Please write a message first.',
    errMessageTooLong: 'Please keep your message under 2000 characters.',
    errNameTooShort: 'Please tell me your name (at least 2 characters).',
    errNameTooLong: 'Please keep your name under 100 characters.',
    errContactInvalid:
      "That doesn't look like an email or WhatsApp number — could you check it?",
    errCountryCodeInvalid:
      "I couldn't match that number and country code. Please check both and try again.",
    typing: 'Alzam is typing',
    emailMe: 'Email Alzam',
  },
  id: {
    openChat: 'Buka obrolan',
    closeChat: 'Tutup obrolan',
    title: 'Ngobrol dengan Alzam',
    subtitle: 'Tinggalkan pesan di bawah.',
    greeting:
      'Halo! Tinggalkan pesan untuk Alzam, nanti dia akan membalasmu. Apa pesanmu?',
    askName: 'Terima kasih! Siapa namamu?',
    askContact: 'Terakhir, bagaimana Alzam bisa menghubungimu — email atau nomor WhatsApp?',
    askCountryCode: 'Apa kode telepon negaramu? Contohnya, +62 untuk Indonesia.',
    confirmIntro: 'Ini pesan yang akan dikirim — kirim jika sudah yakin.',
    sending: 'Mengirim…',
    success: 'Pesan terkirim! Terima kasih, {name} — Alzam akan segera membalasmu.',
    error: 'Terjadi kesalahan saat mengirim. Silakan coba lagi.',
    notConfigured:
      'Formulir kontak belum terhubung — kamu bisa mengirim email langsung ke Alzam.',
    placeholderMessage: 'Tulis pesanmu…',
    placeholderName: 'Namamu',
    placeholderContact: 'Email atau nomor WhatsApp',
    placeholderCountryCode: 'Kode telepon negara, mis. +62',
    send: 'Kirim',
    sendMessage: 'Kirim pesan',
    startOver: 'Mulai dari awal',
    retry: 'Coba lagi',
    close: 'Tutup',
    newMessage: 'Kirim pesan lain',
    labelMessage: 'Pesan',
    labelName: 'Nama',
    labelContact: 'Kontak',
    errMessageEmpty: 'Tulis pesanmu dulu ya.',
    errMessageTooLong: 'Pesanmu maksimal 2000 karakter ya.',
    errNameTooShort: 'Sebutkan namamu (minimal 2 karakter).',
    errNameTooLong: 'Namamu maksimal 100 karakter ya.',
    errContactInvalid:
      'Itu tidak terlihat seperti email atau nomor WhatsApp — bisa dicek lagi?',
    errCountryCodeInvalid:
      'Nomor dan kode negara tersebut tidak cocok. Coba periksa kembali, ya.',
    typing: 'Alzam sedang mengetik',
    emailMe: 'Email Alzam',
  },
};

export function getStrings(lang: Lang): ChatStrings {
  return STRINGS[lang];
}

// Detects the visitor's language from the browser. Returns 'id' for
// Indonesian locales, 'en' otherwise.
export function detectLang(): Lang {
  if (typeof navigator === 'undefined') return 'en';
  const tag = (navigator.language || 'en').toLowerCase();
  return tag.startsWith('id') ? 'id' : 'en';
}
