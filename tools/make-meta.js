/* ==========================================================================
   THE ALMAGEST IN MOTION - SEARCH AND LINK PREVIEWS (tools/make-meta.js)
   Writes, from the site map (shared/site-map.js), what search engines and
   link previews read from the pages without running their scripts:

	 1. in the <head> of every page and its Italian twin, a marked block
	    with the description, the canonical address and the Open Graph
	    tags (title, description, image) of the link previews;
	 2. sitemap.xml at the root, with each page's English and Italian
	    addresses as alternates of each other.

   The block lies between the two comments of BLOCK_START and BLOCK_END,
   after the page's <link rel="alternate" hreflang> (which components.js
   reads for the flag): never edit it by hand, run the script again. The
   preview images are made by tools/make-preview.js.

	 node tools/make-meta.js           write the blocks and the sitemap
	 node tools/make-meta.js --check   exit 1 if one is out of date

   Run it after adding a page, or changing a page's title or question.

   TABLE OF CONTENTS
	 1. The site's address and words
	 2. Reading the site map in each language
	 3. The entries: the hub, the pages, the simulator
	 4. The block in a page's head
	 5. The sitemap
	 6. Main
   ========================================================================== */

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');

/* ==========================================================================
   1. THE SITE'S ADDRESS AND WORDS
   ========================================================================== */

/* Where GitHub Pages serves the site; every address in the tags is
   absolute, as the previews and the sitemap require. */
const SITE_URL = 'https://marcobarb00.github.io/almagest_in_motion/';

const BLOCK_START = '<!-- Search and link previews: written by tools/make-meta.js, do not edit -->';
const BLOCK_END = '<!-- /Search and link previews -->';

/* The words of each language: the site's name, the hub's description,
   the sentence after a page's question, and the preview image. */
const WORDS = {
	en: {
		site: 'The Almagest in Motion',
		locale: 'en_US',
		hub: 'From the celestial sphere to Kepler: an interactive course in classical positional astronomy.',
		course: 'an interactive course in classical positional astronomy',
		page: number => `Page ${number} of The Almagest in Motion`,
		intro: 'The introduction to The Almagest in Motion',
		beyond: 'The epilogue of The Almagest in Motion',
		simulator: 'The simulator of The Almagest in Motion',
		image: 'shared/preview.png',
		imageAlt:
			'The Almagest in Motion: a blue star chart of the sky around the north celestial pole beside the title.'
	},
	it: {
		site: "L'Almagesto in movimento",
		locale: 'it_IT',
		hub: 'Dalla sfera celeste a Keplero: un corso interattivo di astronomia di posizione classica.',
		course: 'un corso interattivo di astronomia di posizione classica',
		page: number => `Pagina ${number} dell'Almagesto in movimento`,
		intro: "L'introduzione all'Almagesto in movimento",
		beyond: "L'epilogo dell'Almagesto in movimento",
		simulator: "Il simulatore dell'Almagesto in movimento",
		image: 'shared/preview.it.png',
		imageAlt: "L'Almagesto in movimento: una carta blu del cielo attorno al polo nord celeste accanto al titolo."
	}
};

const IMAGE_SIZE = { width: 1200, height: 630 };

/* ==========================================================================
   2. READING THE SITE MAP IN EACH LANGUAGE
   site-map.js picks its words with tr() and its Italian paths with
   ITALIAN (common.js); here both are given for one language at a time.
   ========================================================================== */

function readSiteMap(lang) {
	const italian = lang === 'it';
	const source = fs.readFileSync(path.join(ROOT, 'shared', 'site-map.js'), 'utf8');
	const context = {
		ITALIAN: italian,
		tr: (english, italianText) => (italian ? italianText : english)
	};

	vm.createContext(context);
	vm.runInContext(`${source}\nthis.SITE_MAP = SITE_MAP;`, context);

	return context.SITE_MAP;
}

/* ==========================================================================
   3. THE ENTRIES: THE HUB, THE PAGES, THE SIMULATOR
   One entry per page and language: the file, its address, its title and
   its description, and the address of its twin in the other language.
   ========================================================================== */

/* The address of a file: a folder's index.html is served as the folder. */
function urlOf(file) {
	return SITE_URL + file.replace(/(^|\/)index\.html$/, '$1');
}

/* "1.1 · The turning sky"; the intro, the epilogue and the simulator
   have no number. */
function titleOf(page) {
	return /^\d/.test(page.number) ? `${page.number} · ${page.title}` : page.title;
}

/* The question of the page, then what the page is: "What moves, and
   around what? Page 1.1 of The Almagest in Motion, an interactive
   course in classical positional astronomy." */
function descriptionOf(page, words) {
	let what = words.page(page.number);

	if (page.number === 'intro') {
		what = words.intro;
	} else if (page.number === 'beyond') {
		what = words.beyond;
	} else if (page.number === 'simulator') {
		what = words.simulator;
	}

	const question = /[.?!]$/.test(page.question) ? page.question : `${page.question}.`;

	return `${question} ${what}, ${words.course}.`;
}

/* Every entry, English first, each with its twin. */
function collectEntries() {
	const english = readSiteMap('en');
	const italian = readSiteMap('it');
	const entries = [];

	// The hub
	entries.push(
		{ lang: 'en', file: 'index.html', twin: 'index.it.html', title: WORDS.en.site, description: WORDS.en.hub },
		{ lang: 'it', file: 'index.it.html', twin: 'index.html', title: WORDS.it.site, description: WORDS.it.hub }
	);

	// The pages, then the simulator; an Italian twin only where one exists
	const pagesEn = [...english.PAGES, english.SIMULATOR];
	const pagesIt = [...italian.PAGES, italian.SIMULATOR];

	pagesEn.forEach((pageEn, i) => {
		const pageIt = pagesIt[i];
		const hasTwin = Boolean(pageEn.italian);
		const fileIt = pageEn.path.replace(/index\.html$/, 'index.it.html');

		if (!pageEn.ready) {
			return;
		}

		entries.push({
			lang: 'en',
			file: pageEn.path,
			twin: hasTwin ? fileIt : null,
			title: titleOf(pageEn),
			description: descriptionOf(pageEn, WORDS.en)
		});

		if (hasTwin) {
			entries.push({
				lang: 'it',
				file: fileIt,
				twin: pageEn.path,
				title: titleOf(pageIt),
				description: descriptionOf(pageIt, WORDS.it)
			});
		}
	});

	return entries;
}

/* ==========================================================================
   4. THE BLOCK IN A PAGE'S HEAD
   ========================================================================== */

/* Text for an HTML attribute. */
function attr(text) {
	return text.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

function makeBlock(entry) {
	const words = WORDS[entry.lang];
	const other = WORDS[entry.lang === 'en' ? 'it' : 'en'];
	const url = urlOf(entry.file);
	const lines = [
		BLOCK_START,
		`<meta name="description" content="${attr(entry.description)}">`,
		`<link rel="canonical" href="${url}">`,
		'<meta property="og:type" content="website">',
		`<meta property="og:site_name" content="${attr(words.site)}">`,
		`<meta property="og:title" content="${attr(entry.title)}">`,
		`<meta property="og:description" content="${attr(entry.description)}">`,
		`<meta property="og:url" content="${url}">`,
		`<meta property="og:locale" content="${words.locale}">`
	];

	if (entry.twin) {
		lines.push(`<meta property="og:locale:alternate" content="${other.locale}">`);
	}

	lines.push(
		`<meta property="og:image" content="${SITE_URL}${words.image}">`,
		`<meta property="og:image:width" content="${IMAGE_SIZE.width}">`,
		`<meta property="og:image:height" content="${IMAGE_SIZE.height}">`,
		`<meta property="og:image:alt" content="${attr(words.imageAlt)}">`,
		'<meta name="twitter:card" content="summary_large_image">',
		BLOCK_END
	);

	return lines.map(line => `\t${line}`).join('\n');
}

/* The page with its block written: replaced where it is, otherwise
   inserted after the hreflang link. A description written by hand
   outside the block (the hub's, before this script) is removed. */
function withBlock(html, entry) {
	const block = makeBlock(entry);
	const start = html.indexOf(`\t${BLOCK_START}`);

	if (start >= 0) {
		const end = html.indexOf(BLOCK_END, start) + BLOCK_END.length;

		return html.slice(0, start) + block + html.slice(end);
	}

	const cleaned = html.replace(/^\t<meta name="description"[^>]*>\n/m, '');
	const anchor = cleaned.match(/^.*<link rel="alternate" hreflang="[a-z]+"[^>]*>\n/m);

	if (!anchor) {
		throw new Error(`${entry.file}: no <link rel="alternate" hreflang> to place the block after`);
	}

	const at = anchor.index + anchor[0].length;

	return cleaned.slice(0, at) + block + '\n' + cleaned.slice(at);
}

/* ==========================================================================
   5. THE SITEMAP
   Each address with its alternates in both languages (and x-default, the
   English page), as search engines read them (hreflang in a sitemap).
   ========================================================================== */

function makeSitemap(entries) {
	const lines = [
		'<?xml version="1.0" encoding="UTF-8"?>',
		'<!-- Written by tools/make-meta.js from shared/site-map.js: do not edit by hand. -->',
		'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">'
	];

	entries.forEach(entry => {
		lines.push('\t<url>', `\t\t<loc>${urlOf(entry.file)}</loc>`);

		if (entry.twin) {
			const english = entry.lang === 'en' ? entry.file : entry.twin;
			const italian = entry.lang === 'it' ? entry.file : entry.twin;

			lines.push(
				`\t\t<xhtml:link rel="alternate" hreflang="en" href="${urlOf(english)}"/>`,
				`\t\t<xhtml:link rel="alternate" hreflang="it" href="${urlOf(italian)}"/>`,
				`\t\t<xhtml:link rel="alternate" hreflang="x-default" href="${urlOf(english)}"/>`
			);
		}

		lines.push('\t</url>');
	});

	lines.push('</urlset>');

	return lines.join('\n') + '\n';
}

/* ==========================================================================
   6. MAIN
   ========================================================================== */

/* Every file to write, with its new content. */
function plan() {
	const entries = collectEntries();
	const files = entries.map(entry => {
		const file = path.join(ROOT, entry.file);
		const html = fs.readFileSync(file, 'utf8');

		return { name: entry.file, file, before: html, after: withBlock(html, entry) };
	});

	const sitemap = path.join(ROOT, 'sitemap.xml');

	files.push({
		name: 'sitemap.xml',
		file: sitemap,
		before: fs.existsSync(sitemap) ? fs.readFileSync(sitemap, 'utf8') : '',
		after: makeSitemap(entries)
	});

	return files;
}

function main() {
	const check = process.argv.includes('--check');
	const stale = plan().filter(file => file.before !== file.after);

	if (check) {
		stale.forEach(file => console.log(`out of date: ${file.name}`));
		console.log(stale.length ? 'make-meta: run node tools/make-meta.js' : 'make-meta: up to date');
		process.exit(stale.length ? 1 : 0);
	}

	stale.forEach(file => {
		fs.writeFileSync(file.file, file.after);
		console.log(`wrote ${file.name}`);
	});

	console.log(`make-meta: ${stale.length} file(s) written`);
}

main();
