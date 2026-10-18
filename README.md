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
`to-read` → up next, `did-not-finish` → put down, everything else →
read. Goodreads does not emit an explicit `read` shelf, which is why
that last case is a fallback. If a book lands in the wrong place, fix
its shelves on Goodreads and re-sync.

## Theme

Light and dark, toggled in the header, defaulting to the system setting
and remembered in `localStorage`. Every colour is a custom property in
`src/styles/global.css` — defined on `:root`, redefined under
`prefers-color-scheme: dark` and again under `:root[data-theme='dark']`.
Changing the palette means editing that one block.

The visual design is deliberately plain for now. The background is the
next decision.

## Deploying

`.github/workflows/deploy.yml` builds and publishes on push to `main`.
It needs Pages enabled on the repo with source set to GitHub Actions.

The site is configured for a project site at
`mokshjayanth.github.io/movingparts/` — `base: '/movingparts'` in
`astro.config.mjs`. Attaching a custom domain later means dropping `base`
and adding a `CNAME`.
