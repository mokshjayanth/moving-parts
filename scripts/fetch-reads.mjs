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

// Trim whitespace and any stray surrounding quotes: a .env file needs
// them, GitHub's secret field does not, and pasting one into the other
// is an easy way to store a URL that cannot be parsed.
const feedUrl = (process.env.GOODREADS_RSS_URL ?? '')
  .trim()
  .replace(/^['"]|['"]$/g, '');

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
 * Shelves to query, in priority order. A book is filed under the first
 * one it appears on.
 *
 * These are queried individually rather than read from the #ALL# feed's
 * user_shelves field, which Goodreads does not reliably update: moving
 * a book to currently-reading shows up immediately on that shelf's own
 * feed while #ALL# still reports the old shelves. The per-shelf feeds
 * are the source of truth.
 */
const SHELVES = [
  { name: 'currently-reading', bucket: 'current' },
  { name: 'did-not-finish', bucket: 'abandoned' },
  { name: 'to-read', bucket: 'queue' },
  { name: 'read', bucket: 'finished' },
];

async function fetchPage(url, shelf, page) {
  const u = new URL(url);
  u.searchParams.set('shelf', shelf);
  u.searchParams.set('page', String(page));
  u.searchParams.set('per_page', String(PER_PAGE));

  const res = await fetch(u, {
    headers: { 'user-agent': 'moving-parts-site/1.0' },
  });
  if (!res.ok) throw new Error(`Goodreads returned HTTP ${res.status}`);
  return res.text();
}

/** Every item on one shelf, following pagination. */
async function fetchShelf(url, shelf) {
  const items = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const xml = await fetchPage(url, shelf, page);
    const found = xml.match(/<item>[\s\S]*?<\/item>/g) ?? [];
    items.push(...found);
    if (found.length < PER_PAGE) break;
  }
  return items;
}

function toBook(item) {
  const readAt = parseDate(field(item, 'user_read_at'));
  // Personal ratings are deliberately not published.
  return {
    id: field(item, 'book_id'),
    title: cleanTitle(field(item, 'title')),
    author: field(item, 'author_name'),
    link: field(item, 'link'),
    cover: field(item, 'book_medium_image_url'),
    readAt,
    addedAt: parseDate(field(item, 'user_date_added')),
    review: field(item, 'user_review'),
  };
}

async function main() {
  if (!feedUrl) {
    console.error(
      'GOODREADS_RSS_URL is not set — keeping the existing src/data/reads.json.'
    );
    return;
  }

  // Fail early and legibly on a malformed URL rather than reporting a
  // bare "Invalid URL" from deep inside fetch().
  try {
    const u = new URL(feedUrl);
    if (!/^https?:$/.test(u.protocol)) {
      throw new Error(`unexpected protocol ${u.protocol}`);
    }
  } catch (err) {
    throw new Error(
      `GOODREADS_RSS_URL is not a usable URL (${err.message}). ` +
        'Store it without surrounding quotes.'
    );
  }

  const buckets = { current: [], finished: [], queue: [], abandoned: [] };
  const seen = new Set();

  for (const { name, bucket } of SHELVES) {
    for (const item of await fetchShelf(feedUrl, name)) {
      const book = toBook(item);
      if (seen.has(book.id)) continue; // first shelf wins
      seen.add(book.id);
      buckets[bucket].push(book);
    }
  }

  // Anything on no status shelf at all — Goodreads omits the implicit
  // "read" for some older entries — is treated as read.
  for (const item of await fetchShelf(feedUrl, '#ALL#')) {
    const book = toBook(item);
    if (seen.has(book.id)) continue;
    seen.add(book.id);
    buckets.finished.push(book);
  }

  const newest = (a, b) => (b.readAt ?? '').localeCompare(a.readAt ?? '');
  const added = (a, b) => (b.addedAt ?? '').localeCompare(a.addedAt ?? '');

  const data = {
    updated: new Date().toISOString(),
    source: 'goodreads-rss',
    current: buckets.current.sort(added),
    finished: buckets.finished.sort(newest),
    queue: buckets.queue.sort(added),
    abandoned: buckets.abandoned.sort(added),
  };

  await writeFile(OUT, JSON.stringify(data, null, 2) + '\n');

  const n = (k) => data[k].length;
  console.log(
    `Wrote ${path.basename(OUT)} — ${seen.size} books ` +
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
