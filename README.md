# Moving Parts

Personal site and blog. Astro, static output, deployed to GitHub Pages.

## Running it

```sh
nvm use        # Node 22.23.3, pinned in .nvmrc
npm install
npm run dev    # http://localhost:4321/movingparts/
npm run build  # -> dist/
```

Astro 7 requires Node >= 22.22.0.

## Sections

| Route          | Source                        |
| -------------- | ----------------------------- |
| `/`            | `src/pages/index.astro`       |
| `/essays`      | `src/content/essays/*.md`     |
| `/reads`       | `src/data/reads.json`         |
| `/sidequests`  | `src/content/sidequests/*.md` |

## Writing

Essays and side quests are Markdown with typed frontmatter — the schemas
live in `src/content.config.ts` and the build fails if a field is missing
or the wrong shape.

An essay:

```yaml
---
title: Physics and Computation
description: One line, used on the index and in meta tags.
date: 2026-10-18
draft: true
tags: []
---
```

`draft: true` keeps a piece off the index and out of production builds.

A side quest:

```yaml
---
title: Castlevania Atlas
description: Used in meta tags.
blurb: One line, shown on the index.
started: 2026-09-01
finished: 2026-10-17     # omit while in progress
status: done             # active | paused | done
stack: ['JavaScript', 'esbuild']
links:
  - label: Source
    href: https://github.com/...
---
```

The index groups them: in-progress first, finished below.

## Reads

`src/data/reads.json` is generated from the Goodreads RSS feed and
committed. Goodreads retired its API in 2020, but the per-user RSS feeds
still work.

```sh
cp .env.example .env   # paste your feed URL
npm run sync:reads
```

The feed URL carries a private key, so it lives in `.env` locally and in
the `GOODREADS_RSS_URL` repository secret on CI — never in the repo.

CI re-syncs on every deploy and on a daily cron. If Goodreads is
unreachable the script logs it, exits 0 and leaves the committed JSON in
place, so an outage there cannot fail a deploy.

Shelves are inferred from `user_shelves`: `currently-reading` → current,
`to-read` → reading list, `did-not-finish` → put down, everything else
→ read.

Every Goodreads book sits on exactly one exclusive shelf — read,
currently-reading or to-read — alongside any number of custom tags like
`fiction`. The feed omits the implicit `read`, so anything not
explicitly to-read or currently-reading has been read, whatever custom
tags it carries. If a book lands in the wrong place, fix its shelves on
Goodreads and re-sync.

## Feed

`/rss.xml` carries published essays only — side quests are edited as the
work goes on, and a feed that re-fires on every tweak is a nuisance.
Autodiscovery is declared in the base layout, so readers find it from
any page.

## Links

Name, description and the Elsewhere links live in `src/data/site.json`
and are used by the home page, the footer and the feed. Edit them in
that one place.

## Theme

Light and dark, toggled in the header, defaulting to the system setting
and remembered in `localStorage`. There is no Auto control: Auto is what
a visitor gets until they choose otherwise, and a tap is a deliberate
choice. Clearing the stored value means clearing site data. Every colour is a custom property in
`src/styles/global.css` — defined on `:root`, redefined under
`prefers-color-scheme: dark` and again under `:root[data-theme='dark']`.
Changing the palette means editing that one block.

The visual design is deliberately plain for now. The background is the
next decision.

## Type and shared patterns

Serif throughout — body and headings share one face, so a page reads as
a piece of writing rather than a document with a UI bolted on. Sans is
kept for small chrome (nav, meta, labels), where a serif at 13px
smears.

Three patterns live in `global.css` rather than in each page, so they
cannot drift apart: `.section-heading` (the ruled heading on Reads and
Side Quests), `.lede` (the opening line under a page title), and
`.link-row` (Elsewhere and the footer — navigation, so underlines
appear on hover only).

## Deploying

`.github/workflows/deploy.yml` builds and publishes on push to `main`.
It needs Pages enabled on the repo with source set to GitHub Actions.

The site is configured for a project site at
`mokshjayanth.github.io/movingparts/` — `base: '/movingparts'` in
`astro.config.mjs`. Attaching a custom domain later means dropping `base`
and adding a `CNAME`.
