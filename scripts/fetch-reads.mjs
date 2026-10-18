/**
 * Fetches the Goodreads RSS shelf and writes src/data/reads.json.
 *
 * Goodreads retired its API in 2020 but the per-user RSS feeds still
 * work. The feed URL carries a personal key, so it lives in the
 * environment rather than in the repo:
 *
 *   GOODREADS_RSS_URL=... node scripts/fetch-reads.mjs
 *
 * The written file is committed. If a later run cannot reach Goodreads
 * the build simply keeps using the committed copy, so an outage there
 * never breaks a deploy.
 */

import { writeFile, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const OUT = fileURLToPath(new URL('../src/data/reads.json', import.meta.url));
const PER_PAGE = 100;
const MAX_PAGES = 20;

const feedUrl = process.env.GOODREADS_RSS_URL;

/** Pull one tag out of an item, unwrapping CDATA and decoding entities. */
function field(item, tag) {
  const m = item.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`));
  if (!m) return '';
  return decode(m[1].replace(/^<!\[CDATA\[/, '').replace(/\]\]>$/, '').trim());
}

function decode(s) {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&amp;/g, '&');
}

/** Goodreads titles carry the series in parentheses; drop it. */
function cleanTitle(t) {
  return t.replace(/\s*\([^)]*#[^)]*\)\s*$/, '').trim();
}

function parseDate(s) {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.valueOf()) ? null : d.toISOString().slice(0, 10);
}

/**
 * Decide which shelf a book belongs on.
 *
 * Every Goodreads book sits on exactly one exclusive shelf — read,
 * currently-reading or to-read — alongside any number of custom tags
 * like "fiction". The feed omits the implicit "read", so anything not
 * explicitly to-read or currently-reading has been read. Custom tags
 * carry no status and must not be treated as one.
 */
function classify(shelves, readAt) {
  const s = shelves.split(',').map((x) => x.trim()).filter(Boolean);
  if (s.includes('currently-reading')) return 'current';
  if (s.includes('did-not-finish') || s.includes('abandoned')) return 'abandoned';
  if (s.includes('to-read')) return 'queue';
  return 'finished';
}

async function fetchPage(url, page) {
  const u = new URL(url);
  u.searchParams.set('page', String(page));
  u.searchParams.set('per_page', String(PER_PAGE));

  const res = await fetch(u, {
    headers: { 'user-agent': 'moving-parts-site/1.0' },
  });
  if (!res.ok) throw new Error(`Goodreads returned HTTP ${res.status}`);
  return res.text();
}

async function main() {
  if (!feedUrl) {
    console.error(
      'GOODREADS_RSS_URL is not set — keeping the existing src/data/reads.json.'
    );
    return;
  }

  const items = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const xml = await fetchPage(feedUrl, page);
    const found = xml.match(/<item>[\s\S]*?<\/item>/g) ?? [];
    items.push(...found);
    if (found.length < PER_PAGE) break;
  }

  const books = items.map((item) => {
    const readAt = parseDate(field(item, 'user_read_at'));
    // Personal ratings are deliberately not published.
    const book = {
      id: field(item, 'book_id'),
      title: cleanTitle(field(item, 'title')),
      author: field(item, 'author_name'),
      link: field(item, 'link'),
      cover: field(item, 'book_medium_image_url'),
      readAt,
      addedAt: parseDate(field(item, 'user_date_added')),
      review: field(item, 'user_review'),
    };
    return { shelf: classify(field(item, 'user_shelves'), readAt), ...book };
  });

  const strip = ({ shelf, ...rest }) => rest;
  const by = (shelf) => books.filter((b) => b.shelf === shelf).map(strip);

  const newest = (a, b) => (b.readAt ?? '').localeCompare(a.readAt ?? '');
  const added = (a, b) => (b.addedAt ?? '').localeCompare(a.addedAt ?? '');

  const data = {
    updated: new Date().toISOString(),
    source: 'goodreads-rss',
    current: by('current').sort(added),
    finished: by('finished').sort(newest),
    queue: by('queue').sort(added),
    abandoned: by('abandoned').sort(added),
  };

  await writeFile(OUT, JSON.stringify(data, null, 2) + '\n');

  const n = (k) => data[k].length;
  console.log(
    `Wrote ${path.basename(OUT)} — ${books.length} books ` +
      `(current ${n('current')}, finished ${n('finished')}, ` +
      `queue ${n('queue')}, abandoned ${n('abandoned')}).`
  );
}

main().catch(async (err) => {
  console.error(`Goodreads fetch failed: ${err.message}`);
  try {
    await readFile(OUT);
    console.error('Keeping the committed src/data/reads.json.');
  } catch {
    console.error('No cached reads.json either — writing an empty shelf.');
    await writeFile(
      OUT,
      JSON.stringify(
        { updated: null, source: 'none', current: [], finished: [], queue: [], abandoned: [] },
        null,
        2
      ) + '\n'
    );
  }
});
