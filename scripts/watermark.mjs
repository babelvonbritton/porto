// Stamps project screenshots with identity: a baked-in "© Alzam A."
// wordmark (bottom-right) plus copyright metadata in the file itself.
// Runs automatically before `dev` and `build` (see package.json).
//
// Sources live in public/projects/; files that already carry the mark
// are skipped, so keep your originals on your own device — the copies
// here are the stamped ones. Never fails the build: any problem only
// warns and the images are served unstamped (the on-screen tag in the
// carousel still brands the display).
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.join(root, 'public', 'projects');
const markPath = path.join(root, 'scripts', 'watermark.png');
const year = new Date().getFullYear();
const COPYRIGHT = `(C) ${year} Alzam A. - porto.bvbritton.bond`;
const EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp']);

const warn = (msg) => console.warn(`[watermark] ${msg}`);

async function checkReferences() {
  // Warn about `image:` paths in project files that have no matching file.
  const projectsDir = path.join(root, 'src', 'content', 'projects');
  let entries;
  try {
    entries = await fs.readdir(projectsDir);
  } catch {
    return;
  }
  for (const entry of entries.filter((f) => f.endsWith('.md'))) {
    const text = await fs.readFile(path.join(projectsDir, entry), 'utf8');
    const match = text.match(/^image:\s*(.+)$/m);
    if (!match) continue;
    const value = match[1].trim();
    if (/^https?:\/\//.test(value)) continue;
    const target = path.join(dir, value.replace(/^\/+/, '').replace(/^projects\//, ''));
    try {
      await fs.access(target);
    } catch {
      warn(`${entry}: image "${value}" has no file in public/projects/.`);
    }
  }
}

async function main() {
  await checkReferences();

  let sharp;
  try {
    ({ default: sharp } = await import('sharp'));
  } catch {
    warn('sharp is not installed — run `npm install` to enable stamping; images served unstamped.');
    return;
  }

  let mark;
  try {
    mark = await fs.readFile(markPath);
  } catch {
    warn('scripts/watermark.png is missing — images served unstamped.');
    return;
  }

  let files;
  try {
    files = (await fs.readdir(dir)).filter((f) =>
      EXTENSIONS.has(path.extname(f).toLowerCase()),
    );
  } catch {
    return; // No public/projects/ yet — nothing to stamp.
  }

  let stamped = 0;
  let skipped = 0;
  for (const file of files) {
    const filePath = path.join(dir, file);
    const ext = path.extname(file);
    try {
      const image = sharp(filePath);
      const meta = await image.metadata();
      const exifText = meta.exif ? Buffer.from(meta.exif).toString('latin1') : '';
      if (exifText.includes('Alzam')) {
        skipped++;
        continue;
      }
      const width = meta.width || 0;
      const height = meta.height || 0;
      if (!width || !height) {
        skipped++;
        continue;
      }
      const markWidth = Math.max(120, Math.round(width * 0.18));
      const overlay = await sharp(mark).resize(markWidth).toBuffer();
      const overlayMeta = await sharp(overlay).metadata();
      const margin = Math.max(12, Math.round(width * 0.015));
      const tmp = path.join(dir, `.${file}.tmp${ext}`);
      await sharp(filePath)
        .composite([
          {
            input: overlay,
            left: width - (overlayMeta.width || markWidth) - margin,
            top: height - (overlayMeta.height || 0) - margin,
          },
        ])
        .withMetadata({ exif: { IFD0: { Copyright: COPYRIGHT } } })
        .toFile(tmp);
      await fs.rename(tmp, filePath);
      stamped++;
    } catch (err) {
      warn(`could not stamp ${file} (${err.message}) — served unstamped.`);
    }
  }
  if (stamped > 0 || skipped > 0) {
    console.log(`[watermark] stamped ${stamped}, skipped ${skipped} (already marked).`);
  }
}

main().catch((err) => warn(`unexpected error (${err.message}) — images served unstamped.`));
