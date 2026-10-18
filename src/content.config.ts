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
    finished: z.coerce.date().optional(),
    status: z.enum(['active', 'paused', 'done']).default('active'),
    /** One line on what the thing actually is. Shown under the title. */
    blurb: z.string().optional(),
    /** Tools, languages, instruments — whatever the quest is made of. */
    stack: z.array(z.string()).default([]),
    links: z
      .array(z.object({ label: z.string(), href: z.string().url() }))
      .default([]),
    draft: z.boolean().default(false),
  }),
});

export const collections = { essays, sidequests };
