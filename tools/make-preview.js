/* ==========================================================================
   THE ALMAGEST IN MOTION - LINK PREVIEW IMAGES (tools/make-preview.js)
   Renders design/preview/card.html in Chromium (Playwright) to the two
   images that the pages give as og:image (tools/make-meta.js):

	 shared/preview.png      the English card
	 shared/preview.it.png   the Italian card (card.html?lang=it)

   Both 1200 × 630 px, the size the link previews expect. Run from the
   repository root after changing the card or the title of the site:

	 node tools/make-preview.js

   The fonts come from Google Fonts, so the run needs the network.
   ========================================================================== */

'use strict';

const fs = require('fs');
const http = require('http');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..');
const CARD = 'design/preview/card.html';

const SIZE = { width: 1200, height: 630 };

const OUTPUTS = [
	{ query: '', file: 'shared/preview.png' },
	{ query: '?lang=it', file: 'shared/preview.it.png' }
];

const TYPES = {
	'.html': 'text/html',
	'.js': 'text/javascript',
	'.css': 'text/css',
	'.svg': 'image/svg+xml'
};

/* ==========================================================================
   1. A STATIC SERVER FOR THE REPOSITORY
   ========================================================================== */

function serve() {
	const server = http.createServer((request, response) => {
		const file = path.join(ROOT, decodeURIComponent(request.url.split('?')[0]));

		fs.readFile(file, (error, data) => {
			if (error) {
				response.writeHead(404);
				response.end();
				return;
			}

			response.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
			response.end(data);
		});
	});

	return new Promise(resolve => {
		server.listen(0, '127.0.0.1', () => {
			resolve({ server, base: `http://127.0.0.1:${server.address().port}/` });
		});
	});
}

/* ==========================================================================
   2. MAIN
   ========================================================================== */

/* Chromium as installed for the checks; the path of a cloud session's
   own browser when that one is missing. */
async function launch() {
	try {
		return await chromium.launch();
	} catch {
		return chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
	}
}

async function main() {
	const { server, base } = await serve();
	const browser = await launch();
	const page = await browser.newPage({ viewport: SIZE, deviceScaleFactor: 1 });

	for (const output of OUTPUTS) {
		await page.goto(base + CARD + output.query, { waitUntil: 'networkidle' });
		await page.waitForSelector('body[data-ready="true"]');
		await page.screenshot({ path: path.join(ROOT, output.file), clip: { x: 0, y: 0, ...SIZE } });
		console.log(`wrote ${output.file}`);
	}

	await browser.close();
	server.close();
}

main().catch(error => {
	console.error(error);
	process.exit(1);
});
