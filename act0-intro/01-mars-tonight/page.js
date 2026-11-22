// @ts-check
/* ==========================================================================
   PAGE 0.1 · THE INTRO - SCRIPT (page.js)
   Sample of the first scene: the backward loop of Mars, animated among
   the stars. The other two scenes (Ptolemy's and Copernicus' models side
   by side; Kepler's eight arcminutes) come after approval.
   Shared code: common.js, time.js, ephemeris.js, stars.js,
   plate-stars.js, plate.js (for its figures of the constellations),
   plot2d.js, components.js. Every number quoted in the prose comes from
   tools/numbers/0.1-mars-tonight.js.

   TABLE OF CONTENTS
	 1. Figure 1: the loop and its dates
	 2. Figure 1: the strip
	 3. Page start
   ========================================================================== */

/* ==========================================================================
   1. FIGURE 1: THE LOOP AND ITS DATES
   The loop shown is the one around the first opposition of Mars that is
   less than LOOP_PAST_DAYS before the visit: the loop under way, or the
   coming one. The animation runs over the days around that opposition
   during which Mars stays inside the strip, 40° of ecliptic longitude
   centered on Mars at opposition (28° on a phone, LOOP_STRIP), so that
   each loop is seen whole, with its approach and its departure. Positions are sampled once a day, at 0h
   UT, and the figure moves between them in a straight line.
   ========================================================================== */

/* The example moment of the prose and the smoke test: 20 November 2026,
   21:00 UT. Used when the device's clock is outside the reference's
   range. */
const EXAMPLE_UT = Time.fromDate(new Date('2026-11-20T21:00:00Z'));

/* A loop whose opposition is less than this many days past is still
   shown: the backward run lasts until about 40 days after it. */
const LOOP_PAST_DAYS = 40;

/* Half the strip's width and height (deg): one degree of ecliptic
   longitude is as long as one of ecliptic latitude. On a narrow screen
   (a phone) the strip is narrower, so that the loop is drawn larger; the
   choice is made once, when the page opens. The backward arc is at most
   19.5° long and Mars' ecliptic latitude stays within 3.1° of the strip's
   middle (AD 2026 - 2060, tools/numbers/0.1-mars-tonight.js), so the
   whole loop fits even in the narrow strip. */
const LOOP_STRIP = {
	wide: { halfWidth: 20, halfHeight: 10 },
	narrow: { halfWidth: 14, halfHeight: 7 }
};

/* Below this width (px) of the figure, the narrow strip. */
const LOOP_NARROW_BELOW = 520;

/* Mars leaves the animation this far (deg) inside the strip's ends. */
const LOOP_EDGE = 1;

/* The animation runs at this many days a second: a loop of about 200
   days takes some 17 seconds. */
const LOOP_DAYS_PER_SECOND = 12;

/* The radius (px) of the halo around Mars. */
const HALO_RADIUS = 22;

/* A daily motion smaller than this (deg a day) is read as standing
   still. */
const STANDING_STILL = 0.02;

/* Mars' elongation from the Sun (deg, -180 to 180; negative west). */
function elongation(jdTT) {
	return norm180(Ephem.longitude('mars', jdTT) - Ephem.longitude('sun', jdTT));
}

/* The first opposition of Mars after jdTT (JD TT): the elongation goes
   from about -180° to about +180° through 180°. */
function nextOpposition(jdTT) {
	const step = 2;
	let previous = elongation(jdTT);

	for (let jd = jdTT; jd < jdTT + 800; jd += step) {
		const next = elongation(jd + step);

		if (previous < -150 && next > 150) {
			let a = jd;
			let b = jd + step;

			for (let i = 0; i < 40; i++) {
				const middle = (a + b) / 2;

				if (elongation(middle) < 0) {
					a = middle;
				} else {
					b = middle;
				}
			}

			return (a + b) / 2;
		}

		previous = next;
	}

	return NaN;
}

/* The days of the loop: { opposition (JD TT), center (Mars' ecliptic
   longitude at opposition), days: [{ jdUT, lon, lat, sun }] from the
   first day to the last, once a day at 0h UT }. */
function loopDays(opposition, halfWidth) {
	const center = Ephem.planet('mars', opposition).lon;
	const inside = jd => Math.abs(norm180(Ephem.longitude('mars', jd) - center)) <= halfWidth - LOOP_EDGE;
	const oppositionDay = Math.floor(Time.utFromTt(opposition) - 0.5) + 0.5;
	let first = oppositionDay;
	let last = oppositionDay;

	while (inside(Time.ttFromUt(first - 1)) && oppositionDay - first < 200) {
		first -= 1;
	}

	while (inside(Time.ttFromUt(last + 1)) && last - oppositionDay < 200) {
		last += 1;
	}

	const days = [];

	for (let jdUT = first; jdUT <= last; jdUT += 1) {
		const jdTT = Time.ttFromUt(jdUT);
		const mars = Ephem.planet('mars', jdTT);

		days.push({ jdUT, lon: mars.lon, lat: mars.lat, sun: Ephem.longitude('sun', jdTT) });
	}

	return { opposition, center, days };
}

/* The days (indices) where the daily motion changes sign: the stations. */
function stations(days) {
	const found = [];

	for (let i = 1; i < days.length - 1; i++) {
		const before = norm180(days[i].lon - days[i - 1].lon);
		const after = norm180(days[i + 1].lon - days[i].lon);

		if (before * after <= 0) {
			found.push(i);
		}
	}

	return found;
}

/* ==========================================================================
   2. FIGURE 1: THE STRIP
   A strip of the zodiac in ink on parchment, east to the left as seen
   looking south: the plate stars (plate-stars.js) at their places of the
   opposition, the stick figures of the zodiac (Plate.FIGURES), the names
   of the constellations along the bottom, the ecliptic. Mars leaves a
   trail from the first day of the loop to the date of the slider; the
   two stations are rings. The slider runs over the days of the loop, and
   Play advances it; the animation starts by itself the first time the
   figure comes into view, unless the reader asks for reduced motion.
   ========================================================================== */

/* The stars drawn: brighter than this, or on a figure's line. */
const LOOP_MAG_LIMIT = 4.8;

/* A constellation's name stays this far (deg) inside the strip's ends,
   and this far (px) from the next name. */
const NAME_INSET = 3;
const NAME_GAP = 6;

/* The figures of the zodiac. */
const ZODIAC = [
	'ARIES',
	'TAURUS',
	'GEMINI',
	'CANCER',
	'LEO',
	'VIRGO',
	'LIBRA',
	'SCORPIUS',
	'SAGITTARIUS',
	'CAPRICORNUS',
	'AQUARIUS',
	'PISCES'
];

/* "Leo" from "LEO", "Capricornus" from "CAPRICORNUS". */
const titleCase = name => name.charAt(0) + name.slice(1).toLowerCase();

const loopFigure = {
	plot: null,

	init() {
		const now = Time.now();
		const nowTT = Ephem.inRange(Time.ttFromUt(now)) ? Time.ttFromUt(now) : Time.ttFromUt(EXAMPLE_UT);

		const canvas = byId('loop-strip');

		this.strip = canvas.parentElement.clientWidth < LOOP_NARROW_BELOW ? LOOP_STRIP.narrow : LOOP_STRIP.wide;
		this.loop = loopDays(nextOpposition(nowTT - LOOP_PAST_DAYS), this.strip.halfWidth);
		this.stations = stations(this.loop.days);
		this.yCenter = this.middleLatitude();
		this.placeStars();

		const slider = /** @type {HTMLInputElement} */ (byId('loop-day'));

		slider.max = String(this.loop.days.length - 1);
		slider.value = '0';

		this.plot = new Plot2D(canvas, {
			x: [-this.strip.halfWidth, this.strip.halfWidth],
			y: [this.yCenter - this.strip.halfHeight, this.yCenter + this.strip.halfHeight],
			xTicks: () => this.longitudeTicks(),
			yTicks: () => this.latitudeTicks(),
			xLabel: 'ecliptic longitude',
			yLabel: 'ecliptic latitude',
			aspect: 0.5,
			minHeight: 180,
			maxHeight: 520,
			onDraw: () => this.draw()
		});

		wireSlider(
			slider,
			() => this.update(),
			value => Time.formatDate(this.loop.days[Math.round(Number(value))].jdUT)
		);
		wirePresets(slider.closest('figure'));
		this.player = wirePlayButton(byId('loop-play'), slider, LOOP_DAYS_PER_SECOND);
		this.autoplay(slider.closest('figure'));
		this.update();
	},

	/* Press Play the first time the figure comes into view, unless the
	   reader asks for reduced motion. */
	autoplay(figure) {
		const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		let started = false;

		if (reduced) {
			return;
		}

		whenOffScreen(figure, onScreen => {
			if (onScreen && !started) {
				started = true;
				byId('loop-play').click();
			}
		});
	},

	/* The middle of Mars' ecliptic latitudes over the loop, to 1°: the
	   strip is centered on it. */
	middleLatitude() {
		const lats = this.loop.days.map(day => day.lat);

		return Math.round((Math.min(...lats) + Math.max(...lats)) / 2);
	},

	/* Every plate star in ecliptic coordinates of the opposition. */
	placeStars() {
		const jd = this.loop.opposition;
		const eps = Ephem.meanObliquity(jd);

		/** @type {Map<string, { lon: number, lat: number, mag: number }>} */
		this.stars = new Map();

		PLATE_STARS.forEach(star => {
			const eq = Stars.ofDate(star, jd);
			const ecl = Ephem.equatorialToEcliptic(eq.ra, eq.dec, eps);

			this.stars.set(star.id, { lon: ecl.lon, lat: ecl.lat, mag: star.mag });
		});
	},

	/* The x of the strip for an ecliptic longitude: degrees west of Mars
	   at opposition, so that east is to the left. */
	x(lon) {
		return norm180(this.loop.center - lon);
	},

	/* Is a place inside the strip? */
	inside(x, lat) {
		return Math.abs(x) <= this.strip.halfWidth && Math.abs(lat - this.yCenter) <= this.strip.halfHeight;
	},

	/* Ticks every 10° of ecliptic longitude, from left to right. */
	longitudeTicks() {
		const ticks = [];
		const first = Math.ceil((this.loop.center - this.strip.halfWidth) / 10) * 10;

		for (let lon = first; lon <= this.loop.center + this.strip.halfWidth; lon += 10) {
			ticks.push({ value: this.x(lon), label: `${norm360(lon)}°` });
		}

		return ticks.sort((a, b) => a.value - b.value);
	},

	/* Ticks every 5° of ecliptic latitude. */
	latitudeTicks() {
		const ticks = [];

		for (
			let lat = Math.ceil((this.yCenter - this.strip.halfHeight) / 5) * 5;
			lat <= this.yCenter + this.strip.halfHeight;
			lat += 5
		) {
			ticks.push({ value: lat, label: `${lat}°` });
		}

		return ticks;
	},

	/* The place of Mars at a fractional day of the loop, between the two
	   daily samples around it. */
	placeAt(day) {
		const days = this.loop.days;
		const i = clamp(Math.floor(day), 0, days.length - 1);
		const j = Math.min(i + 1, days.length - 1);
		const f = day - i;

		return {
			x: this.x(days[i].lon) + f * norm180(this.x(days[j].lon) - this.x(days[i].lon)),
			lat: days[i].lat + f * (days[j].lat - days[i].lat)
		};
	},

	update() {
		this.day = clamp(readNumber('loop-day'), 0, this.loop.days.length - 1);
		this.showReadout();
		this.plot.redraw();
	},

	draw() {
		const p = this.plot;

		p.frame();
		this.drawFigures(p);
		this.drawStars(p);
		this.drawEcliptic(p);
		this.drawMars(p);
	},

	/* The stick figures of the zodiac, faint, and their names. */
	drawFigures(p) {
		const line = { color: COL.ink, alpha: 0.28, width: 1, clip: true };
		const names = [];

		ZODIAC.forEach(name => {
			const xs = [];

			Plate.FIGURES[name].lines.forEach(([a, b]) => {
				const s1 = this.stars.get(a);
				const s2 = this.stars.get(b);

				if (!s1 || !s2) {
					return;
				}

				const x1 = this.x(s1.lon);
				const x2 = this.x(s2.lon);

				// a line across the edge of the strip is cut there; a line
				// that would wrap round the sky is not drawn
				if (Math.abs(x1 - x2) < 90 && (this.inside(x1, s1.lat) || this.inside(x2, s2.lat))) {
					p.curve([x1, x2], [s1.lat, s2.lat], line);
					xs.push(x1, x2);
				}
			});

			const middle = this.figureMiddle(xs);

			if (middle !== null) {
				names.push({ text: titleCase(name), middle });
			}
		});

		this.nameFigures(p, names);
	},

	/* The middle of a figure's stars in the strip (x), kept off the
	   strip's ends; null for a figure outside the strip. */
	figureMiddle(xs) {
		const inside = xs.filter(x => Math.abs(x) <= this.strip.halfWidth);

		if (inside.length === 0) {
			return null;
		}

		const end = this.strip.halfWidth - NAME_INSET;

		return clamp((Math.min(...inside) + Math.max(...inside)) / 2, -end, end);
	},

	/* The names along the bottom of the strip, the central ones first; a
	   name that would overlap one already written (on a phone) is left
	   out. The names do not move: the stars are fixed for the loop. */
	nameFigures(p, names) {
		const font = labelFont('Leo', 'name');
		const taken = [];

		p.ctx.font = font;
		names.sort((a, b) => Math.abs(a.middle) - Math.abs(b.middle));
		names.forEach(name => {
			const half = p.ctx.measureText(name.text).width / 2 + NAME_GAP;
			const center = p.px(name.middle);

			if (taken.some(([left, right]) => center + half > left && center - half < right)) {
				return;
			}

			taken.push([center - half, center + half]);
			p.text(name.text, name.middle, this.yCenter - this.strip.halfHeight, {
				color: COL.muted,
				align: 'center',
				baseline: 'bottom',
				dx: 0,
				dy: -4,
				font: font
			});
		});
	},

	/* The stars, four-pointed, sized by magnitude, and the names of the
	   bright stars of the site's catalogue on their left. */
	drawStars(p) {
		const onFigure = new Set(ZODIAC.flatMap(name => Plate.FIGURES[name].lines.flat()));

		this.stars.forEach((star, id) => {
			const x = this.x(star.lon);

			if (!this.inside(x, star.lat) || (star.mag > LOOP_MAG_LIMIT && !onFigure.has(id))) {
				return;
			}

			p.star(x, star.lat, { size: starSize(star.mag) });
		});

		Stars.LIST.forEach(bright => {
			const star = this.stars.get(bright.id);

			if (star && this.inside(this.x(star.lon), star.lat)) {
				p.text(bright.name, this.x(star.lon), star.lat, { align: 'right', dx: -7, dy: -5 });
			}
		});
	},

	/* The ecliptic, named under it at the western end of the strip. */
	drawEcliptic(p) {
		p.hline(0, { color: COL.sun, width: 1.5 });
		p.text('ecliptic', this.strip.halfWidth, 0, { color: COL.sun, align: 'right', baseline: 'top', dx: -6, dy: 4 });
	},

	/* The two stations (rings), the trail from the first day to the
	   slider's date, and Mars. */
	drawMars(p) {
		const days = this.loop.days;
		const xs = [];
		const ys = [];

		this.stations.forEach(i => {
			p.marker(this.x(days[i].lon), days[i].lat, { color: COL.planet, radius: 6, ring: false });
			p.marker(this.x(days[i].lon), days[i].lat, { color: COL.card, radius: 4, ring: false });
		});

		for (let i = 0; i <= Math.floor(this.day); i++) {
			xs.push(this.x(days[i].lon));
			ys.push(days[i].lat);
		}

		const now = this.placeAt(this.day);

		xs.push(now.x);
		ys.push(now.lat);
		p.curve(xs, ys, { color: COL.planet, width: 2.4 });
		this.drawHalo(p, now);
		p.marker(now.x, now.lat, { color: COL.planet, radius: 6.5 });
	},

	/* A soft halo around Mars, so that the eye follows it: a disc of the
	   planet's colour fading outwards. */
	drawHalo(p, place) {
		const ctx = p.ctx;
		const x = p.px(place.x);
		const y = p.py(place.lat);
		const glow = ctx.createRadialGradient(x, y, 0, x, y, HALO_RADIUS);

		glow.addColorStop(0, withAlpha(COL.planet, 0.35));
		glow.addColorStop(1, withAlpha(COL.planet, 0));
		ctx.fillStyle = glow;
		ctx.beginPath();
		ctx.arc(x, y, HALO_RADIUS, 0, TAU);
		ctx.fill();
	},

	/* Three lines: the date, Mars' daily motion, and the days to or from
	   its opposition. */
	showReadout() {
		const days = this.loop.days;
		const i = clamp(Math.round(this.day), 0, days.length - 1);
		const j = i < days.length - 1 ? i + 1 : i - 1;
		const motion = norm180(days[j].lon - days[i].lon) * (j > i ? 1 : -1);
		const toOpposition = Math.round(this.loop.opposition - Time.ttFromUt(days[i].jdUT));

		showLines('loop-readout', [
			`\\text{${Time.formatDate(days[i].jdUT)}}`,
			`\\text{${this.motionText(motion)}}`,
			`\\text{${this.oppositionText(toOpposition)}}`
		]);
	},

	/* "Moving east, 0.42° a day", "Standing still", "Moving west, ...". */
	motionText(motion) {
		if (Math.abs(motion) < STANDING_STILL) {
			return 'Standing still';
		}

		return `Moving ${motion > 0 ? 'east' : 'west'}, ${Math.abs(motion).toFixed(2)}° a day`;
	},

	/* "Opposite the Sun in 23 days", "today", "23 days ago". */
	oppositionText(days) {
		if (days === 0) {
			return 'Opposite the Sun today';
		}

		const count = `${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'}`;

		return days > 0 ? `Opposite the Sun in ${count}` : `Opposite the Sun ${count} ago`;
	}
};

/* ==========================================================================
   3. PAGE START
   Shared components first (they typeset the prose), then the figures.
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
	Site.initPage();
	startFigures([loopFigure]);
});
