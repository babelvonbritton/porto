// @ts-check
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: process.env.PUBLIC_SITE_URL || undefined,
  base: process.env.PUBLIC_SITE_BASE || '/porto',
  build: {
    inlineStylesheets: 'never',
  },
});
