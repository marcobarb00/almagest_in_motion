# The Almagest in Motion · Developing

Notes for reading and changing the code. The site is static (plain HTML,
CSS and JavaScript, no build step), served by GitHub Pages. The plan for
the whole site is in [`STRUCTURE.md`](STRUCTURE.md), the choices already
made in [`DECISIONS.md`](DECISIONS.md), the look in [`STYLE.md`](STYLE.md),
the writing rules in [`WRITING.md`](WRITING.md), the Italian conventions
in [`TRANSLATION.md`](TRANSLATION.md), and the coding rules in
[`CLAUDE.md`](CLAUDE.md).

## Layout

| Path | Contents |
|---|---|
| `index.html`, `hub.js` | The hub: the opening, tonight's sky, the astronomers, the acts as chapters. |
| `act0-intro/` | Act 0 · From Ptolemy to Kepler. |
| `act1-stage/` | Pages 1.1 to 1.3: the turning sky, frames, clocks. |
| `act2-sun/` | Pages 2.1 to 2.3: the uneven year, the equation of time, precession. |
| `act3-moon/` | Pages 3.1 to 3.3: the first anomaly, evection, eclipses. |
| `act4-planets/` | Pages 4.1 to 4.5: going backwards, the equant, a new center, phases and parallax, Kepler. |
| `beyond-kepler/` | The epilogue. |
| `simulator/` | The simulator, reached only from the hub. |
| `shared/` | Theme, shared components, the reference sky and its tests (`shared/tests.html`). |
| `shared/models/` | Models built on one page and reused by later pages. |
| `shared/site-map.js` | The acts, the pages, the detour topics and the origins. |
| `templates/` | The page template (`page.html`) and a demo of the shared widgets (`demo.html`). |
| `design/references/` | The reference page of the visual style. |
| `archive/` | Earlier pages, kept for reference and not linked from the site. |
| `tools/numbers/` | The script behind each page's numbers, run with Node. |
| `tools/check/` | The checks run after every change ([`tools/check/README.md`](tools/check/README.md)). |

Each page is an `index.html` with its Italian twin `index.it.html`, sharing
the page's `page.js` and `page.css`.

## Running locally

Any static server from the repository root, for example
`python3 -m http.server`, then open <http://localhost:8000/>. Run
`shared/tests.html` after changing `shared/time.js`, `shared/ephemeris.js`,
`shared/stars.js` or a model in `shared/models/`.

## Checks

`npm install` installs the development tools (lint, format, type check,
Playwright); `npm run check` runs them all. The golden values and the
smoke test are described in [`tools/check/README.md`](tools/check/README.md).

## Publishing a page

Set `ready: true` on the page's entry in `shared/site-map.js`: the hub and
the previous / next links follow. Then run `node tools/make-meta.js`.

## Search and link previews

Search engines and link previews (Mastodon, Reddit, messaging apps) read
a page without running its scripts, so what they need is written into
each page's `<head>` by `tools/make-meta.js`, from the site map: the
description (the page's question and what the page is), the canonical
address, and the Open Graph tags with the preview image. It also writes
`sitemap.xml`, with each page's English and Italian addresses as
alternates. The block between its two comments is never edited by hand:
change the site map and run the script again. `--check` reports a page
that is out of date, and CI runs it.

The preview images, `shared/preview.png` and `shared/preview.it.png`
(1200 × 630 px), are rendered from `design/preview/card.html` by
`node tools/make-preview.js`; run it after changing the card or the
site's title.
