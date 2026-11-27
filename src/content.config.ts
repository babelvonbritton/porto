import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const projects = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/projects' }),
  schema: z.object({
    title: z.string(),
    titleId: z.string(),
    description: z.string(),
    descriptionId: z.string(),
    tags: z.array(z.string()).default([]),
    tagsId: z.array(z.string()).default([]),
    live: z.string().optional(),
    repo: z.string().optional(),
    image: z.string().optional(),
    featured: z.boolean().default(false),
    order: z.number().default(99),
    earlierNote: z.string().optional(),
    earlierNoteId: z.string().optional(),
  }),
});

export const collections = { projects };
