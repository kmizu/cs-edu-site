import { glob } from 'astro/loaders';
import { defineCollection, z } from 'astro:content';

const lessons = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/lessons' }),
  schema: z.object({
    title: z.string(),
    course: z.enum(['kotoba', 'tsukuru']),
    order: z.number().int().min(1),
    description: z.string(),
    /** ふしぎの種：レッスン末に置く、次レッスンへつながる問い */
    seed: z.string().optional(),
    /** 所要時間の目安（分） */
    minutes: z.number().int().default(25),
  }),
});

export const collections = { lessons };
