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
    // Same tags in Indonesian, in the same order. The Indonesian cards
    // render this list; keep the two lists the same length.
    tagsId: z.array(z.string()).default([]),
    live: z.string().optional(),
    repo: z.string().optional(),
    // Optional screenshot: path of a file under public/ (e.g. projects/eigakan.png),
    // or a full URL. Omit it and the card shows the monogram tile instead.
    image: z.string().optional(),
    featured: z.boolean().default(false),
    // Carousel sequence among featured projects: lowest first.
    // Non-featured projects render in the Earlier work list instead.
    order: z.number().default(99),
    // One-line note shown in the Earlier work list (e.g. what
    // superseded this project). Only used when featured is false.
    earlierNote: z.string().optional(),
    earlierNoteId: z.string().optional(),
  }),
});

export const collections = { projects };
