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

Reads is hand-maintained in `src/data/reads.json` — four shelves:
`current`, `finished`, `queue`, `recommended`. Goodreads' API was retired
in 2020; if this outgrows a JSON file, look at Open Library, Hardcover or
Literal.

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
