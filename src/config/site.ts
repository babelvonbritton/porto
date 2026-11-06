// ── Porto — every custom thing lives here. ─────────────────────────────
// Change the values in this file and the whole site follows. Nothing else
// needs editing for a name change, a tagline change, or contact details.
//
// SITE_NAME is a placeholder: the website's name is not decided yet.
// Change this one line when it is.
export const SITE_NAME = 'Porto';

// Footer copyright holder name.
export const FOOTER_NAME = 'Alzam A.';

// Hero tagline, written natively in each language — not a word-for-word
// translation. Keep both versions natural-sounding in their own language;
// do not derive one from the other.
export const TAGLINE = {
  en: 'Your imagination, one step closer to reality.',
  id: 'Imajinasimu, selangkah lebih dekat menjadi nyata.',
} as const;

// Projects section heading — the companion to the tagline:
// EN pairs reality/realized, ID pairs menjadi nyata.
export const PROJECTS_HEADING = {
  en: 'Imaginations, already realized.',
  id: 'Imajinasi yang sudah menjadi nyata.',
} as const;

// Navigation + section copy, native in each language.
export const COPY = {
  en: {
    navHome: 'Home',
    navProjects: 'Projects',
    navAbout: 'About',
    navContact: 'Contact',
    heroEyebrow: 'Portfolio',
    heroCtaProjects: 'See the projects',
    heroCtaContact: 'Get in touch',
    aboutHeading: 'About',
    aboutBody: [
      'I build websites that turn ideas into things people can actually use — a watch-together theater, business profile, and shop that run entirely in the browser.',
      'This site collects the work so far. Each project above is an idea already realized, not a concept.',
    ],
    contactHeading: 'Contact',
    contactBody: 'The fastest way to reach me — links below!',
    contactEmpty: 'Contact details will live here.',
    footerRights: 'All rights reserved.',
  },
  id: {
    navHome: 'Beranda',
    navProjects: 'Proyek',
    navAbout: 'Tentang',
    navContact: 'Kontak',
    heroEyebrow: 'Portofolio',
    heroCtaProjects: 'Lihat proyek',
    heroCtaContact: 'Hubungi saya',
    aboutHeading: 'Tentang',
    aboutBody: [
      'Saya membangun situs yang mengubah ide menjadi sesuatu yang benar-benar bisa dipakai sebagai alat atau perantara — bioskop nonton bareng, profil bisnis, dan toko yang berjalan sepenuhnya di browser.',
      'Situs ini mengumpulkan karya-karya tersebut. Setiap proyek di atas adalah sesuatu yang sudah dibangun, bukan sekadar konsep.',
    ],
    contactHeading: 'Kontak',
    contactBody: 'Cara tercepat menghubungi saya — klik tautan di bawah!',
    contactEmpty: 'Detail kontak akan ada di sini.',
    footerRights: 'Hak cipta dilindungi.',
  },
} as const;

// ── Contact details ────────────────────────────────────────────────────
// Leave a field empty and its link is simply not rendered; when every
// field is empty the contact section shows the placeholder line instead.
// No fake addresses, no placeholder links.
export const CONTACT = {
  email: 'alzamakbar2510@gmail.com',
  github: 'https://github.com/babelvonbritton',
  linkedin: '',
  // whatsapp: '',
} as const;

export type Lang = keyof typeof COPY;
