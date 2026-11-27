export const SITE_NAME = 'Techne';

export const FOOTER_NAME = 'Alzam A';

export const TAGLINE = {
  en: 'Your imagination, one step closer to reality!',
  id: 'Berawal dari ide sederhana menjadi sesuatu yang nyata!',
} as const;

export const PROJECTS_HEADING = {
  en: 'Things I\'ve Brought to Life.',
  id: 'Beberapa karya yang telah saya bangun.',
} as const;

export const COPY = {
  en: {
    navHome: 'Home',
    navProjects: 'Projects',
    navAbout: 'About',
    navContact: 'Contact',
    heroEyebrow: 'Alzam A. — IT Enthusiast',
    heroCtaProjects: 'Explore projects',
    heroCtaContact: 'Discuss a project',
    heroIntro:
      'Turning ideas into practical digital solutions through thoughtful design, engineering, and technology.',
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
    earlierHeading: 'Earlier work',
  },
  id: {
    navHome: 'Beranda',
    navProjects: 'Proyek',
    navAbout: 'Tentang',
    navContact: 'Kontak',
    heroEyebrow: 'Alzam A. — Petualang dunia IT',
    heroCtaProjects: 'Lihat-lihat proyek disini',
    heroCtaContact: 'Diskusi proyek kesini',
    heroIntro:
      'Mengubah ide menjadi solusi digital yang praktis melalui desain, rekayasa, dan teknologi yang dirancang dengan matang.',
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
    earlierHeading: 'Karya sebelumnya',
  },
} as const;

export const CONTACT = {
  email: 'alzamakbar2510@gmail.com',
  github: 'https://github.com/babelvonbritton',
  linkedin: '',
} as const;

export type Lang = keyof typeof COPY;
