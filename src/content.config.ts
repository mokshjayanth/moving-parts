import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const essays = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/essays' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    draft: z.boolean().default(false),
    tags: z.array(z.string()).default([]),
  }),
});

const sidequests = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/sidequests' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    started: z.coerce.date(),
    status: z.enum(['active', 'paused', 'done']).default('active'),
    draft: z.boolean().default(false),
  }),
});

export const collections = { essays, sidequests };
