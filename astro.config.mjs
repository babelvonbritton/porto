// @ts-check
import { defineConfig } from 'astro/config';

// Deployment variables (same two-variable pattern as Brewfolio):
//   PUBLIC_SITE_URL  — e.g. https://<owner>.github.io (set by the Pages workflow)
//   PUBLIC_SITE_BASE — e.g. /porto for a project site, or / for a custom domain
// Local dev defaults to base /porto so links resolve the same way as on Pages.
export default defineConfig({
  site: process.env.PUBLIC_SITE_URL || undefined,
  base: process.env.PUBLIC_SITE_BASE || '/porto',
  // Never inline stylesheets: the chat widget's CSS must stay a
  // separate file so it only downloads when the widget opens. (The
  // default 'auto' inlines small stylesheets into the HTML, which
  // would ship the widget CSS with every page load.)
  build: {
    inlineStylesheets: 'never',
  },
});
