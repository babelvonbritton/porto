import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// One Markdown file per project. Adding a project = adding one file here.
// Titles and descriptions are bilingual by design: write each language
// natively, not translated word for word.
const projects = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/projects' }),
  schema: z.object({
    title: z.string(),
    titleId: z.string(),
    description: z.string(),
    descriptionId: z.string(),
    tags: z.array(z.string()).default([]),
    live: z.string().optional(),
    repo: z.string().optional(),
    // Optional screenshot: path of a file under public/ (e.g. projects/eigakan.png),
    // or a full URL. Omit it and the card shows the monogram tile instead.
    image: z.string().optional(),
    featured: z.boolean().default(false),
  }),
});

export const collections = { projects };
