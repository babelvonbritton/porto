// ── Porto — every custom thing lives here. ─────────────────────────────
// Change the values in this file and the whole site follows. Nothing else
// needs editing for a name change, a tagline change, or contact details.
//
export const SITE_NAME = 'Keykaku';

// Footer copyright holder name
export const FOOTER_NAME = 'Alzam A';

// Hero tagline
export const TAGLINE = {
  en: 'Your imagination, one step closer to reality!',
  id: 'Berawal dari ide sederhana menjadi sesuatu yang nyata!',
} as const;

// Projects section heading
export const PROJECTS_HEADING = {
  en: 'Things I\'ve Brought to Life.',
  id: 'Beberapa karya yang telah saya bangun.',
} as const;

// Navigation + section copy
export const COPY = {
  en: {
    navHome: 'Home',
    navProjects: 'Projects',
    navAbout: 'About',
    navContact: 'Contact',
    heroEyebrow: 'Alzam A. — IT Enthusiast',
    heroCtaProjects: 'See what I\'ve built!',
    heroCtaContact: 'Get in touch or hit the Chat Bot!',
    aboutHeading: 'About',
    aboutBody: [
      'I\'ve spent around four years working in the IT field. These days, I focus on turning ideas into practical websites and applications that people can actually use.',
      'My projects range from productivity tools and watch-together platforms to business websites and inventory management systems. Each one gives me a chance to explore new ideas, solve problems, and build something useful.',
      'This portfolio is where I share the projects I\'ve worked on and brought to life.',
    ],
    contactHeading: 'Contact',
    contactBody: 'Have a project in mind, a question, or an idea you\'d like to discuss?\nI\'m always open to new opportunities and interesting conversations. Feel free to reach out!',
    contactEmpty: 'Contact details will live here.',
    footerRights: 'All rights reserved.',
  },
  id: {
    navHome: 'Beranda',
    navProjects: 'Proyek',
    navAbout: 'Tentang',
    navContact: 'Kontak',
    heroEyebrow: 'Alzam A. — Petualang dunia IT',
    heroCtaProjects: 'Lihat yang saya kerjakan disini!',
    heroCtaContact: 'Kontak saya atau melalui Chat Bot di pojok layar ~',
    aboutHeading: 'Tentang',
    aboutBody: [
      'Saya telah berkecimpung di bidang IT selama kurang lebih empat tahun. Saat ini, saya berfokus membangun berbagai aplikasi dan website yang berangkat dari ide sederhana menjadi sesuatu yang benar-benar bisa digunakan.',
      'Mulai dari aplikasi produktivitas, platform nonton bareng, hingga sistem kasir dan pengelolaan bisnis. Bagi saya, setiap proyek adalah kesempatan untuk mencoba ide baru, memecahkan masalah, dan menciptakan sesuatu yang bermanfaat.',
      'Website ini menjadi tempat saya memperkenalkan berbagai karya yang telah saya bangun.',
    ],
    contactHeading: 'Kontak',
    contactBody: 'Punya ide, pertanyaan, atau tertarik bekerja sama? Mari kita diskusikan!',
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
  github: '',
  linkedin: '',
  // whatsapp: '',
} as const;

export type Lang = keyof typeof COPY;
