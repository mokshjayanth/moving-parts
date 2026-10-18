---
title: Castlevania Atlas
description: An interactive map of the places in Netflix's Castlevania, set on real geography.
blurb: A fan map that admits what it doesn't know.
started: 2026-09-01
finished: 2026-10-17
status: done
stack: ['JavaScript', 'D3 projections', 'Natural Earth', 'esbuild']
links:
  - label: Source
    href: https://github.com/mokshjayanth/castlevania-atlas
draft: false
---

Netflix's *Castlevania* is set in a real place — fifteenth-century
Wallachia — and names real towns. Târgoviște, Brăila, Genoa, Paris. But
it also invents places, and gives them away in dialogue: Gresit is
"close to Arges," the Magician's town is "thirty miles up the road" from
Genoa.

So the question is where you put them on a map. And the honest answer is
that you don't always know.

## Drawing the uncertainty

Most fan maps put a pin on everything and look equally confident about
all of it. This one grades each of its 27 places by how much is actually
known:

- **Real place** — a real town at its real coordinates.
- **Placed from clues** — invented, positioned from what characters say,
  and drawn with a dashed ring showing how wrong it might be.
- **Region only** — the show names a region, not a place.
- **Location unrevealed** — drawn in a labelled box rather than guessed.

The dashed rings are the part worth the effort. A pin says *here*. A
ring says *somewhere in this area, and here's how big the area is* —
which is the truthful thing to say about a town described as thirty
miles from somewhere else.

## The rest of it

The map is a Lambert conformal conic projection centred on 14°E, with
Natural Earth layers processed ahead of time and committed so the build
needs no network. Story mode steps through all 66 scenes in episode
order. Search covers place names, summaries, characters and events, so
"guillotine" finds a place as readily as "Paris". There's a check
comparing the show's stated distances against real ones.

Unofficial fan project, not affiliated with Konami or Netflix.
