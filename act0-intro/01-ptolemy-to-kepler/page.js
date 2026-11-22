// @ts-check
/* ==========================================================================
   PAGE 0.1 · THE INTRO - SCRIPT (page.js)
   Three animated scenes: the backward loop of Mars among the stars;
   Ptolemy's and Copernicus' models of Mars, animated together; Kepler's
   eight arcminutes, the gap between a circle with an equant and the
   ellipse.
   Shared code: common.js, time.js, ephemeris.js, stars.js,
   plate-stars.js, plate.js (for its figures of the constellations),
   models/mean-sun.js, models/precession.js, models/planet-epicycle.js,
   models/planet-equant.js, models/planet-arrangement.js,
   models/kepler.js, plot2d.js, components.js. Every number quoted in the prose comes from
   tools/numbers/0.1-ptolemy-to-kepler.js.

   TABLE OF CONTENTS
	 1. Figure 1: the loop and its dates
	 2. Figure 1: the strip
	 3. Figure 2: Ptolemy's and Copernicus' models, animated together
	 4. Figure 3: Kepler's eight arcminutes
	 5. Page start
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
   middle (AD 2026 - 2060, tools/numbers/0.1-ptolemy-to-kepler.js), so the
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

/* Press a figure's Play button the first time the figure comes into
   view, unless the reader asks for reduced motion (Figures 1 and 2). */
function autoplayOnView(figure, button) {
	const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	let started = false;

	if (reduced) {
		return;
	}

	whenOffScreen(figure, onScreen => {
		if (onScreen && !started) {
			started = true;
			button.click();
		}
	});
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
			xLabel: tr('ecliptic longitude', 'longitudine eclittica'),
			yLabel: tr('ecliptic latitude', 'latitudine eclittica'),
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
		autoplayOnView(slider.closest('figure'), byId('loop-play'));
		this.update();
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
				p.text(Stars.label(bright.name), this.x(star.lon), star.lat, { align: 'right', dx: -7, dy: -5 });
			}
		});
	},

	/* The ecliptic, named under it at the western end of the strip. */
	drawEcliptic(p) {
		p.hline(0, { color: COL.sun, width: 1.5 });
		p.text(tr('ecliptic', 'eclittica'), this.strip.halfWidth, 0, {
			color: COL.sun,
			align: 'right',
			baseline: 'top',
			dx: -6,
			dy: 4
		});
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
			return tr('Standing still', 'Fermo');
		}

		const speed = Math.abs(motion).toFixed(2);

		return motion > 0
			? tr(`Moving east, ${speed}° a day`, `Verso est, ${speed}° al giorno`)
			: tr(`Moving west, ${speed}° a day`, `Verso ovest, ${speed}° al giorno`);
	},

	/* "Opposite the Sun in 23 days", "today", "23 days ago". */
	oppositionText(days) {
		if (days === 0) {
			return tr('Opposite the Sun today', 'Opposto al Sole oggi');
		}

		const n = Math.abs(days);
		const count = n === 1 ? tr('1 day', '1 giorno') : tr(`${n} days`, `${n} giorni`);

		return days > 0
			? tr(`Opposite the Sun in ${count}`, `Opposto al Sole fra ${count}`)
			: tr(`Opposite the Sun ${count} ago`, `Opposto al Sole ${count} fa`);
	}
};

/* ==========================================================================
   3. FIGURE 2: PTOLEMY'S AND COPERNICUS' MODELS, ANIMATED TOGETHER
   Mars of page 4.2's equant (PlanetEquant.MARS_FIT) in the two
   descriptions of page 4.3 (PlanetArrangement.moment): (a) Ptolemy's,
   the Earth O at rest at the center, the deferent (green, centered at C)
   and the epicycle (violet, centered at K), the point of the Sun at the
   corner of the parallelogram O K P sun, the path of P over the last
   synodic period; (b) Copernicus', the Sun at rest at the center, the
   Earth's circle (violet, as the epicycle it comes from) and Mars'
   (green, as the deferent). Seen from the north ecliptic pole, γ to the
   right. In both, the line of sight from O through P runs to a dial of
   ecliptic longitude round the drawing (in (b), centered on the Sun, a
   parallel through the Sun marks the direction on the dial, which
   stands for the distant stars), and the dial carries Mars'
   direction over the last TRAIL_DAYS, older further in, so that the
   backward run draws a hook. Each drawing has its own scale; each
   read-out line computes the direction from its own drawing.
   The date slider runs over about one synodic period around the
   opposition of Figure 1, and Play advances it; the animation starts by
   itself the first time the figure comes into view, unless the reader
   asks for reduced motion.
   ========================================================================== */

/* The days of the slider: from this many days before the opposition of
   Figure 1, over MACHINE_SPAN days. */
const MACHINE_BEFORE = 400;
const MACHINE_SPAN = 800;

/* The animation runs at this many days a second: one synodic period of
   Mars (780 days) in about 26 seconds. */
const MACHINE_DAYS_PER_SECOND = 30;

/* The dial's trail: its length (days), its step (days), and how far in
   (px) the oldest point is drawn. */
const TRAIL_DAYS = 300;
const TRAIL_STEP = 2;
const TRAIL_DEPTH = 26;

/* The path of P in (a): over one synodic period, every PATH_STEP days. */
const PATH_DAYS = 780;
const PATH_STEP = 3;

/* The farthest point of each drawing from its center, in its own units
   (deferent radius in (a), au in (b)), with a little room: Ptolemy's
   OP reaches 1 + OC + r, Mars' distance from the Sun a (1 + OC). */
const MACHINE_REACH = {
	ptolemy: 1 + PlanetEquant.MARS_FIT.e + PlanetEquant.MARS_FIT.r + 0.06,
	copernicus: (1 + PlanetEquant.MARS_FIT.e) / PlanetEquant.MARS_FIT.r + 0.06
};

/* The room (px) round the dial for its labels, and the distance of a
   label's center outside the dial. */
const DIAL_MARGIN = 26;
const DIAL_LABEL = 14;

/* In (a), the mean Sun's mark stands this far (px) inside the dial. */
const SUN_MARK_INSET = 40;

/* The line of sight beyond Mars is drawn this faint. */
const SIGHT_BEYOND_ALPHA = 0.45;

/* The drawing fills this fraction of the dial's radius. */
const MACHINE_FILL = 0.8;

/* Ptolemy's and Copernicus' Mars: JD(TT) -> ecliptic longitude (deg),
   the same function, since the two give the same direction. */
const machineLongitude = PlanetArrangement.make('mars');

const machineFigure = {
	init() {
		this.ptolemy = { labels: new LabelPlacer(), draw: () => this.drawPtolemy() };
		this.copernicus = { labels: new LabelPlacer(), draw: () => this.drawCopernicus() };
		squareCanvas(this.ptolemy, byId('ptolemy-machine'), 420, DIAL_MARGIN);
		squareCanvas(this.copernicus, byId('copernicus-machine'), 420, DIAL_MARGIN);

		this.start = Time.utFromTt(loopFigure.loop.opposition) - MACHINE_BEFORE;

		const slider = /** @type {HTMLInputElement} */ (byId('machine-day'));

		slider.max = String(MACHINE_SPAN);
		slider.value = '0';
		wireSlider(
			slider,
			() => this.update(),
			value => Time.formatDate(this.start + Math.round(Number(value)))
		);
		wirePresets(slider.closest('figure'));
		wirePlayButton(byId('machine-play'), slider, MACHINE_DAYS_PER_SECOND);
		autoplayOnView(slider.closest('figure'), byId('machine-play'));
		this.update();
	},

	update() {
		const jdUT = this.start + readNumber('machine-day');
		const jdTT = Time.ttFromUt(jdUT);

		this.state = { jdUT, jdTT, now: PlanetArrangement.moment('mars', jdTT) };
		this.trail = this.dialTrail(jdTT);
		this.showReadout();
		this.ptolemy.draw();
		this.copernicus.draw();
	},

	/* Mars' direction over the last TRAIL_DAYS: [{ lon, age (0 to 1) }]. */
	dialTrail(jdTT) {
		const trail = [];

		for (let days = TRAIL_DAYS; days >= 0; days -= TRAIL_STEP) {
			trail.push({ lon: machineLongitude(jdTT - days), age: days / TRAIL_DAYS });
		}

		trail.push({ lon: this.state ? this.state.now.lambda : machineLongitude(jdTT), age: 0 });

		return trail;
	},

	/* Three lines: the date, and the direction of P from O computed in
	   each drawing on its own. */
	showReadout() {
		const { geostatic: g, heliostatic: h } = this.state.now;
		const direction = points => norm360(atan2d(points.P[1] - points.O[1], points.P[0] - points.O[0]));

		showLines('machine-readout', [
			`\\text{${Time.formatDate(this.state.jdUT)}}`,
			`\\lambda = ${direction(g).toFixed(2)}^\\circ \\text{ in (a)}`,
			`\\lambda = ${direction(h).toFixed(2)}^\\circ \\text{ in (b)}`
		]);
	},

	/* Start a drawing: clear it, and return its scale (px per unit) and
	   the function from its units to the canvas. */
	begin(owner, reach) {
		const scale = (MACHINE_FILL * owner.R) / reach;
		const center = { x: owner.cx, y: owner.cy };

		owner.ctx.clearRect(0, 0, owner.width, owner.width);
		owner.labels.begin({ x0: 0, y0: 0, x1: owner.width, y1: owner.width });

		return { scale, center, at: point => ({ x: center.x + scale * point[0], y: center.y - scale * point[1] }) };
	},

	/* The dial round a drawing: a circle, a tick every 30° and, outside
	   it, a label every 90°; Mars' trail, older further in. */
	drawDial(owner, center) {
		const ctx = owner.ctx;
		const R = owner.R;

		circle(ctx, center, R, { color: COL.muted, width: 1 });

		for (let lon = 0; lon < 360; lon += 30) {
			segment(ctx, towards(center, lon, R), towards(center, lon, R - (lon % 90 === 0 ? 9 : 5)), {
				color: COL.muted,
				width: 1
			});
		}

		[0, 90, 180, 270].forEach(lon => {
			centeredLabel(ctx, `${lon}°`, towards(center, lon, R + DIAL_LABEL), COL.muted, owner.labels, 'symbol');
		});

		// the trail: a polyline from the oldest direction to now, each
		// piece fainter with age
		for (let i = 1; i < this.trail.length; i++) {
			const a = this.trail[i - 1];
			const b = this.trail[i];

			ctx.globalAlpha = 0.25 + 0.75 * (1 - b.age);
			segment(
				ctx,
				towards(center, a.lon, R - 4 - TRAIL_DEPTH * a.age),
				towards(center, b.lon, R - 4 - TRAIL_DEPTH * b.age),
				{
					color: COL.planet,
					width: 2.2
				}
			);
		}

		ctx.globalAlpha = 1;
	},

	/* The line of sight from O through P, solid to P and fainter beyond it
	   to the dial, and Mars with its halo. */
	drawSight(owner, O, P, lambda) {
		const ctx = owner.ctx;
		const end = towards(O, lambda, 2 * owner.R);

		ctx.save();
		ctx.beginPath();
		ctx.arc(owner.cx, owner.cy, owner.R, 0, TAU);
		ctx.clip();
		segment(ctx, O, P, { color: COL.planet, width: 1.5 });
		ctx.globalAlpha = SIGHT_BEYOND_ALPHA;
		segment(ctx, P, end, { color: COL.planet, width: 1.5 });
		ctx.restore();

		const glow = ctx.createRadialGradient(P.x, P.y, 0, P.x, P.y, HALO_RADIUS);

		glow.addColorStop(0, withAlpha(COL.planet, 0.35));
		glow.addColorStop(1, withAlpha(COL.planet, 0));
		ctx.fillStyle = glow;
		ctx.beginPath();
		ctx.arc(P.x, P.y, HALO_RADIUS, 0, TAU);
		ctx.fill();
		drawDot(ctx, P.x, P.y, 6.5, COL.planet);
	},

	/* (a) Ptolemy's model about the Earth O. */
	drawPtolemy() {
		const owner = this.ptolemy;
		const ctx = owner.ctx;

		if (!ctx || !this.state) {
			return;
		}

		const { now, jdTT } = this.state;
		const g = now.geostatic;
		const { scale, center, at } = this.begin(owner, MACHINE_REACH.ptolemy);
		const O = at(g.O);
		const K = at(g.K);
		const P = at(g.P);

		this.drawDial(owner, center);

		// the path of P relative to the Earth over the last synodic period
		const path = [];

		for (let days = PATH_DAYS; days >= 0; days -= PATH_STEP) {
			path.push(at(PlanetArrangement.moment('mars', jdTT - days).geostatic.P));
		}

		ctx.globalAlpha = 0.35;
		ctx.strokeStyle = COL.planet;
		ctx.lineWidth = 1;
		ctx.beginPath();
		path.forEach((point, i) => (i === 0 ? ctx.moveTo(point.x, point.y) : ctx.lineTo(point.x, point.y)));
		ctx.lineTo(P.x, P.y);
		ctx.stroke();
		ctx.globalAlpha = 1;

		// the deferent and the epicycle, the sides OK and KP, and the
		// direction of the mean Sun from O (dashed) out to the dial: Ptolemy
		// gives the Sun no place in his model of Mars, only this direction,
		// to which KP stays parallel (Almagest X 6)
		const sunEnd = towards(O, now.sun, owner.R);

		circle(ctx, at(g.C), scale, { color: COL.deferent, width: 2 });
		circle(ctx, K, PlanetEquant.MARS_FIT.r * scale, { color: COL.epicycle, width: 2 });
		segment(ctx, O, K, { color: COL.deferent, width: 1.6 });
		segment(ctx, K, P, { color: COL.epicycle, width: 2 });
		segment(ctx, O, sunEnd, { color: COL.sun, width: 1.6, dash: [5, 4] });

		this.drawSight(owner, O, P, now.lambda);
		drawDot(ctx, K.x, K.y, 3.5, COL.epicycle);
		drawDot(ctx, O.x, O.y, 6, COL.earth);

		// O below the Earth, fixed; ☉ inside the dial at the end of the
		// mean Sun's direction; K outward from the deferent's center; P off
		// its line of sight
		labelOutside(ctx, 'O', O, 7, 250, COL.earth, owner.labels);
		centeredLabel(ctx, '☉', towards(O, now.sun, owner.R - SUN_MARK_INSET), COL.sun, owner.labels);
		labelOutside(ctx, 'K', K, 5, screenDirection(at(g.C), K), COL.epicycle, owner.labels);
		labelOutside(ctx, 'P', P, 7, now.lambda + SIGHT_NAME_TURN, COL.planet, owner.labels);
	},

	/* (b) Copernicus' arrangement about the Sun. */
	drawCopernicus() {
		const owner = this.copernicus;
		const ctx = owner.ctx;

		if (!ctx || !this.state) {
			return;
		}

		const { now } = this.state;
		const h = now.heliostatic;
		const { scale, center, at } = this.begin(owner, MACHINE_REACH.copernicus);
		const S = at(h.S);
		const O = at(h.O);
		const P = at(h.P);
		const C = at(h.C);

		this.drawDial(owner, center);

		// the Earth's circle (violet, as Ptolemy's epicycle) and Mars'
		// (green, as his deferent); the sides sun O and sun P; the
		// direction of the Sun from the Earth (dashed)
		circle(ctx, S, scale, { color: COL.epicycle, width: 2 });
		circle(ctx, C, now.scale * scale, { color: COL.deferent, width: 2 });
		segment(ctx, S, P, { color: COL.deferent, width: 1.6 });
		segment(ctx, O, S, { color: COL.sun, width: 1.6, dash: [5, 4] });

		// the parallel to the line of sight through the Sun, dashed, to the
		// dial: the dial stands for the stars, so far away that parallel
		// lines meet them at the same place, and it is centered on the Sun
		segment(ctx, S, towards(S, now.lambda, owner.R), { color: COL.planet, width: 1.3, dash: [6, 4] });

		this.drawSight(owner, O, P, now.lambda);
		drawDot(ctx, S.x, S.y, 6, COL.sun);
		drawDot(ctx, O.x, O.y, 6, COL.earth);

		// ☉ below the Sun, fixed; O and P a quarter turn from the line to
		// the Sun, on opposite sides, clear of the line of sight, which
		// near opposition runs out from the Sun through both
		labelOutside(ctx, '☉', S, 7, 250, COL.sun, owner.labels);
		labelOutside(ctx, 'O', O, 7, screenDirection(S, O) - 90, COL.earth, owner.labels);
		labelOutside(ctx, 'P', P, 7, screenDirection(S, P) + 90, COL.planet, owner.labels);
	}
};

/* ==========================================================================
   4. FIGURE 3: KEPLER'S EIGHT ARCMINUTES
   Mars about the Sun, in the frame of its apsidal line, on the ellipse of
   page 4.5 (Kepler.MARS_FIT: e, a, the period) and on a circle with a
   bisected equant of the same a and its own eccentricity e', fitted to
   the ellipse (CIRCLE_E): the center C at a e' from the Sun
   towards the aphelion, the equant at 2 a e', Mars moving uniformly as
   seen from the equant (PlanetEquant.zodiacal). Both start at the
   aphelion together and keep the same mean anomaly. (a) The orbit, the
   aphelion up, and a loupe in the top right corner that enlarges the
   region round the ellipse's Mars, with the line from the Sun through
   each Mars; (b) the gap, the circle's heliocentric longitude less the
   ellipse's, in arcminutes, over one revolution: within ±7.5′, largest
   at the four octants
   (tools/numbers/0.1-ptolemy-to-kepler.js), so the axis is ±12′. The day
   slider runs over one revolution from the aphelion, and Play advances
   it; the animation starts by itself the first time the figure comes
   into view, unless the reader asks for reduced motion.
   ========================================================================== */

/* Mars' parameters: the eccentricity, the semi-major axis (au) and the
   period from aphelion to aphelion (days). */
const KEPLER_E = Kepler.MARS_FIT.e;

/* The circle's eccentricity: fitted, as Kepler fitted his circle to the
   observations, here to the ellipse it stands beside, so that the largest
   difference in direction over a revolution is as small as it can be
   (circleEccentricity, below). */
const KEPLER_A = Kepler.MARS_FIT.a;
const KEPLER_PERIOD = 360 / (Kepler.MARS_FIT.n - Kepler.MARS_FIT.apogeeRate);

/* The animation runs at this many days a second: one revolution in about
   23 seconds. */
const KEPLER_DAYS_PER_SECOND = 30;

/* The axis of (b) (arcminutes), and Kepler's 8′, marked on it. */
const GAP_RANGE = 12;
const KEPLER_GAP = 8;

/* The loupe: its radius as a fraction of the drawing's width, and the
   gap (arcminutes) that spans GAP_FILL of its radius. */
const LOUPE_SIZE = 0.24;
const LOUPE_GAP = 10;
const LOUPE_FILL = 0.55;

/* The arcs of the two orbits in the loupe: drawn this many times the
   loupe's radius on each side of Mars, so that they reach its edge, in
   this many pieces. */
const LOUPE_ARC = 1.3;
const LOUPE_ARC_STEPS = 60;

/* The largest difference in direction (arcminutes) over a revolution
   between a circle with a bisected equant of eccentricity e and the
   ellipse, at the same mean anomaly. */
function largestDifference(e) {
	let largest = 0;

	for (let M = 0; M < 360; M += 1) {
		const q = PlanetEquant.zodiacal(M, e, 2 * e).q - Kepler.atAnomaly(M, KEPLER_E).q;

		largest = Math.max(largest, Math.abs(norm180(q)) * 60);
	}

	return largest;
}

/* The eccentricity that makes that largest difference smallest, by a
   golden-section search between 0.8 and 1.2 times the ellipse's. */
function circleEccentricity() {
	const g = (Math.sqrt(5) - 1) / 2;
	let a = 0.8 * KEPLER_E;
	let b = 1.2 * KEPLER_E;

	for (let i = 0; i < 40; i++) {
		const c = b - g * (b - a);
		const d = a + g * (b - a);

		if (largestDifference(c) < largestDifference(d)) {
			b = d;
		} else {
			a = c;
		}
	}

	return (a + b) / 2;
}

const CIRCLE_E = circleEccentricity();

/* The places of the two Marses at a mean anomaly M (deg, from the
   aphelion), in the frame of the apsidal line, x towards the aphelion,
   au: { circle, ellipse }, each { x, y, lon (deg, from the aphelion) }. */
function keplerPlaces(M) {
	const z = PlanetEquant.zodiacal(M, CIRCLE_E, 2 * CIRCLE_E);
	const k = Kepler.atAnomaly(M, KEPLER_E);
	const place = (lon, r) => ({ x: r * cos(lon), y: r * sin(lon), lon });

	return {
		circle: place(M + z.q, KEPLER_A * z.distance),
		ellipse: place(M + k.q, KEPLER_A * k.distance)
	};
}

/* The gap (arcminutes) at a mean anomaly M: the circle's heliocentric
   longitude less the ellipse's. */
function keplerGap(M) {
	const places = keplerPlaces(M);

	return norm180(places.circle.lon - places.ellipse.lon) * 60;
}

const keplerFigure = {
	init() {
		this.orbit = { labels: new LabelPlacer(), draw: () => this.drawOrbit() };
		squareCanvas(this.orbit, byId('kepler-orbit'), 420, 8);

		this.plot = new Plot2D(byId('kepler-gap'), {
			x: [0, KEPLER_PERIOD],
			y: [-GAP_RANGE, GAP_RANGE],
			xTicks: () => [0, 100, 200, 300, 400, 500, 600].map(v => ({ value: v, label: String(v) })),
			yTicks: () => [-12, -8, -4, 0, 4, 8, 12].map(v => ({ value: v, label: `${v}′` })),
			xLabel: tr('days after the aphelion', "giorni dopo l'afelio"),
			yLabel: tr('circle less ellipse', 'cerchio meno ellisse'),
			aspect: 0.8,
			minHeight: 240,
			maxHeight: 420,
			onDraw: () => this.drawGap()
		});
		this.curve = [];

		for (let day = 0; day <= KEPLER_PERIOD; day += 2) {
			this.curve.push({ day, gap: keplerGap((360 * day) / KEPLER_PERIOD) });
		}

		const slider = /** @type {HTMLInputElement} */ (byId('kepler-day'));

		slider.max = String(Math.floor(KEPLER_PERIOD));
		wireSlider(
			slider,
			() => this.update(),
			value => tr(`day ${Math.round(Number(value))}`, `giorno ${Math.round(Number(value))}`)
		);
		wirePresets(slider.closest('figure'));
		wirePlayButton(byId('kepler-play'), slider, KEPLER_DAYS_PER_SECOND);
		autoplayOnView(slider.closest('figure'), byId('kepler-play'));
		this.update();
	},

	update() {
		this.day = readNumber('kepler-day');
		this.M = (360 * this.day) / KEPLER_PERIOD;
		this.places = keplerPlaces(this.M);
		this.gap = keplerGap(this.M);
		this.showReadout();
		this.orbit.draw();
		this.plot.redraw();
	},

	/* Two lines: the day, and the gap with its sense. */
	showReadout() {
		const sense =
			this.gap >= 0
				? tr('ahead of the ellipse', "davanti all'ellisse")
				: tr('behind the ellipse', "dietro l'ellisse");

		showLines('kepler-readout', [
			tr(
				`\\text{Day ${Math.round(this.day)} after the aphelion}`,
				`\\text{Giorno ${Math.round(this.day)} dopo l'afelio}`
			),
			tr(
				`\\text{Circle } ${Math.abs(this.gap).toFixed(1)}' \\text{ ${sense}}`,
				`\\text{Cerchio } ${Math.abs(this.gap).toFixed(1)}' \\text{ ${sense}}`
			)
		]);
	},

	/* (a) The orbit, the aphelion up, the Sun at the center of the
	   drawing; the loupe in the top right corner. */
	drawOrbit() {
		const owner = this.orbit;
		const ctx = owner.ctx;

		if (!ctx || !this.places) {
			return;
		}

		ctx.clearRect(0, 0, owner.width, owner.width);
		owner.labels.begin({ x0: 0, y0: 0, x1: owner.width, y1: owner.width });

		// the farthest point, the aphelion a (1 + e), fills the drawing;
		// the Sun a little below the center, so that the orbit is centered
		const scale = (0.86 * owner.R) / KEPLER_A;
		const sun = { x: owner.cx, y: owner.cy + scale * KEPLER_A * KEPLER_E };
		const at = point => ({ x: sun.x - scale * point.y, y: sun.y - scale * point.x });
		const ellipse = at(this.places.ellipse);
		const circlePlace = at(this.places.circle);

		// the two orbits, which coincide at this scale: the circle about C,
		// and the ellipse traced from its points
		circle(ctx, at({ x: KEPLER_A * CIRCLE_E, y: 0 }), scale * KEPLER_A, { color: COL.deferent, width: 2.4 });
		ctx.strokeStyle = COL.planet;
		ctx.lineWidth = 1.2;
		ctx.beginPath();

		for (let M = 0; M <= 360; M += 2) {
			const point = at(keplerPlaces(M).ellipse);

			if (M === 0) {
				ctx.moveTo(point.x, point.y);
			} else {
				ctx.lineTo(point.x, point.y);
			}
		}

		ctx.stroke();

		// the line from the Sun to Mars, the Sun and the two Marses
		segment(ctx, sun, ellipse, { color: COL.muted, width: 1 });
		drawDot(ctx, sun.x, sun.y, 7, COL.sun);
		drawDot(ctx, circlePlace.x, circlePlace.y, 5, COL.deferent);
		drawDot(ctx, ellipse.x, ellipse.y, 5, COL.planet);
		labelOutside(ctx, '☉', sun, 8, 250, COL.sun, owner.labels);
		centeredLabel(
			ctx,
			tr('aphelion', 'afelio'),
			{ x: sun.x, y: at({ x: KEPLER_A * (1 + KEPLER_E), y: 0 }).y - 12 },
			COL.muted,
			owner.labels,
			'name'
		);
		centeredLabel(
			ctx,
			tr('perihelion', 'perielio'),
			{ x: sun.x, y: at({ x: -KEPLER_A * (1 - KEPLER_E), y: 0 }).y + 14 },
			COL.muted,
			owner.labels,
			'name'
		);

		this.drawLoupe(owner, sun, scale, ellipse);
	},

	/* The loupe: a circle in the top right corner, joined to the
	   ellipse's Mars, showing the region round it enlarged, with the line
	   from the Sun through each Mars. */
	drawLoupe(owner, sun, scale, ellipse) {
		const ctx = owner.ctx;
		const radius = LOUPE_SIZE * owner.width;
		const center = { x: owner.width - radius - 4, y: radius + 4 };
		// a fixed enlargement, set at the mean distance a, so that it never
		// changes while the slider moves
		const zoom = (LOUPE_FILL * radius) / (KEPLER_A * ((LOUPE_GAP / 60) * D2R));
		const magnification = zoom / scale;
		const local = point => ({
			x: center.x - zoom * (point.y - this.places.ellipse.y),
			y: center.y - zoom * (point.x - this.places.ellipse.x)
		});

		// the joining line, under the loupe
		segment(ctx, ellipse, center, { color: COL.muted, width: 1, dash: [3, 3] });

		ctx.save();
		ctx.beginPath();
		ctx.arc(center.x, center.y, radius, 0, TAU);
		ctx.fillStyle = COL.card;
		ctx.fill();
		ctx.clip();

		// the two orbits near Mars, enlarged as the region they cross, in
		// the same orientation as outside the loupe: each arc sampled over
		// the mean anomalies that reach the loupe's edge
		const distance = Math.hypot(this.places.ellipse.x, this.places.ellipse.y);
		const span = (LOUPE_ARC * radius) / zoom / distance / D2R;

		['circle', 'ellipse'].forEach(name => {
			ctx.strokeStyle = name === 'circle' ? COL.deferent : COL.planet;
			ctx.lineWidth = 2;
			ctx.beginPath();

			for (let i = 0; i <= LOUPE_ARC_STEPS; i++) {
				const M = this.M - span + (2 * span * i) / LOUPE_ARC_STEPS;
				const point = local(keplerPlaces(M)[name]);

				if (i === 0) {
					ctx.moveTo(point.x, point.y);
				} else {
					ctx.lineTo(point.x, point.y);
				}
			}

			ctx.stroke();
		});

		// the line from the Sun through each Mars, thin and dashed: the
		// difference in direction is the angle between them
		['circle', 'ellipse'].forEach(name => {
			const place = this.places[name];
			const p = local(place);
			const lon = place.lon;
			const dx = -sin(lon);
			const dy = -cos(lon);

			segment(
				ctx,
				{ x: p.x - 2 * radius * dx, y: p.y - 2 * radius * dy },
				{ x: p.x + 2 * radius * dx, y: p.y + 2 * radius * dy },
				{ color: name === 'circle' ? COL.deferent : COL.planet, width: 1, dash: [4, 3] }
			);
		});

		const c = local(this.places.circle);
		const e = local(this.places.ellipse);

		drawDot(ctx, c.x, c.y, 6, COL.deferent);
		drawDot(ctx, e.x, e.y, 6, COL.planet);
		ctx.restore();

		circle(ctx, center, radius, { color: COL.ink, width: 1.5 });
		ctx.fillStyle = textColor(COL.muted);
		ctx.font = FONT_TICK;
		ctx.textAlign = 'center';
		ctx.textBaseline = 'top';
		canvasText(ctx, `× ${Math.round(magnification / 10) * 10}`, center.x, center.y + radius + 4);
	},

	/* (b) The gap over one revolution, Kepler's 8′ dashed, and the day of
	   the slider. */
	drawGap() {
		const p = this.plot;

		p.frame();
		[-KEPLER_GAP, KEPLER_GAP].forEach(v => p.hline(v, { color: COL.muted, width: 1, dash: [5, 4] }));
		p.text(tr("Kepler's 8′", '8′ di Keplero'), KEPLER_PERIOD, KEPLER_GAP, {
			color: COL.muted,
			align: 'right',
			dx: -4,
			dy: -4
		});
		p.curve(
			this.curve.map(point => point.day),
			this.curve.map(point => point.gap),
			{ color: COL.ink, width: 2 }
		);

		if (this.gap !== undefined) {
			p.marker(this.day, this.gap, { color: COL.planet, radius: 5.5 });
		}
	}
};

/* ==========================================================================
   5. PAGE START
   Shared components first (they typeset the prose), then the figures.
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
	Site.initPage();
	startFigures([loopFigure, machineFigure, keplerFigure]);
});
