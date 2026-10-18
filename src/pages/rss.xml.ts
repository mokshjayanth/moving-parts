import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';
import site from '../data/site.json';

/**
 * Essays only. Side quests are edited continuously as the work
 * progresses, and a feed that re-fires on every tweak is a nuisance.
 */
export async function GET(context: APIContext) {
  const essays = (await getCollection('essays', ({ data }) => !data.draft)).sort(
    (a, b) => b.data.date.valueOf() - a.data.date.valueOf()
  );

  // context.site is the bare origin; the channel link must carry the
  // base path too, or a reader clicking through lands off the site.
  const origin = (context.site ?? new URL('https://mokshjayanth.github.io'))
    .toString()
    .replace(/\/$/, '');
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');

  return rss({
    title: site.title,
    description: site.description,
    site: `${origin}${base}/`,
    items: essays.map((essay) => ({
      title: essay.data.title,
      description: essay.data.description,
      pubDate: essay.data.date,
      link: `${base}/essays/${essay.id}/`,
      categories: essay.data.tags,
    })),
    customData: '<language>en</language>',
  });
}
