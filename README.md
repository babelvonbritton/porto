# Porto

A personal portfolio website — bilingual designed.

## Run locally

```sh
npm install
npm run dev
```

## Deploy

1. Create a GitHub repo (suggested name: `porto`) and push this project to
   its `main` branch.
2. In the repo: Settings → Pages → Build and deployment → Source →
   **GitHub Actions**, then Custom domain → `porto.<your-domain>`.
3. In Cloudflare DNS for `<your-domain>`: one CNAME record, name `porto`,
   target `<your-account>.github.io`, proxy off (DNS-only).
4. Push to `main` (or run the workflow manually). Once GitHub verifies the
   DNS and provisions the certificate, tick Enforce HTTPS in the Pages
   settings.

Order matters: set the DNS record and the Pages custom domain before (or in
the same sitting as) pushing — the build uses base `/`, so the site only
resolves correctly once the custom domain is live.

No secrets are needed.

## Change everything custom in one file

All customizable things live in `src/config/site.ts`:

| What | Where |
|---|---|
| Website name (currently the placeholder `Porto`) | `SITE_NAME` |
| Footer copyright holder | `FOOTER_NAME` |
| Hero tagline (EN + ID) | `TAGLINE` |
| Projects heading (EN + ID) | `PROJECTS_HEADING` |
| Navigation, about text, contact copy (EN + ID) | `COPY` |
| Contact links (email, GitHub, LinkedIn, WhatsApp) | `CONTACT` |

Contact fields start empty on purpose: an empty field renders no link, and
when all are empty the contact section shows a placeholder line instead of
fake links. Fill them in when ready.

## Add a project

Add one Markdown file to `src/content/projects/`, for example
`my-project.md`:

```md
---
title: My Project
titleId: Proyek Saya
description: One or two sentences, in English.
descriptionId: Satu atau dua kalimat, dalam Bahasa Indonesia.
tags: [Astro, TypeScript]
live: https://example.com
repo: https://github.com/you/my-project
image: projects/my-project.png
featured: true
---

Optional longer write-up (not shown on the card yet).
```

Omit `live` or `repo` and that link simply doesn't render.

## Project images

Screenshots are optional — a project without one shows the monogram tile.
To add one, drop the file in `public/projects/` and set the `image` field
to its path under `public/` (for example `projects/eigakan.png`), or to a
full URL. Aim for around 1200×675 (16:9) or larger; the carousel crops to
16:9, so an exact crop isn't needed, but similar ratios look best. Prefer
WebP or JPG to keep the file light; PNG is fine for crisp interface shots.

## If the custom domain is ever dropped

Remove `public/CNAME`, set `PUBLIC_SITE_BASE` back to `/<repo>` in the
workflow (and `PUBLIC_SITE_URL` to `https://<your-account>.github.io`), and clear
the custom domain in the repo's Pages settings. Nothing else in the code
needs to change.
