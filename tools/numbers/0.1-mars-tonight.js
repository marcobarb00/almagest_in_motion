/* ==========================================================================
   NUMBERS FOR PAGE 0.1 · THE INTRO (tools/numbers/0.1-mars-tonight.js)
   Loads the site's shared code in a Node vm context and prints every
   number the page quotes, in page order, and the bounds of the strip of
   its Figure 1. Sample of the first scene, the backward loop of Mars.
   The real Mars and Sun are the reference sky (shared/ephemeris.js).

   Run from the repository root:  node tools/numbers/0.1-mars-tonight.js

   TABLE OF CONTENTS
	 1. Loading the shared code
	 2. Helpers: the oppositions and stations of Mars
	 3. Lead: the loops of 2026 - 2060
	 4. Figure 1: the speed of the animation and the strip
	 5. After Figure 1: the loops' march along the zodiac
   ========================================================================== */

'use strict';

const { loadFiles } = require('../check/load.js');

/* ==========================================================================
   1. LOADING THE SHARED CODE
   ========================================================================== */

const shared = loadFiles(['shared/common.js', 'shared/time.js', 'shared/ephemeris.js']);
const { norm180, Time, Ephem } = shared;

/* ==========================================================================
   2. HELPERS: THE OPPOSITIONS AND STATIONS OF MARS
   ========================================================================== */

const title = text => console.log(`\n=== ${text} ===`);
const f = (x, digits) => x.toFixed(digits);
const JD = (y, m, d) => Time.julianDay(y, m, d);
const date = jd => Time.formatDate(jd);
const mean = list => list.reduce((a, b) => a + b, 0) / list.length;

/* Mars' elongation from the Sun (deg, negative west). */
const elongation = jd => norm180(Ephem.longitude('mars', jd) - Ephem.longitude('sun', jd));

/* The oppositions of Mars in [start, end) (JD TT), by bisection on the
   elongation's jump from about -180° to about +180°. */
function oppositions(start, end) {
	const found = [];
	let previous = elongation(start);

	for (let jd = start; jd < end; jd += 2) {
		const next = elongation(jd + 2);

		if (previous < -150 && next > 150) {
			let a = jd;
			let b = jd + 2;

			for (let i = 0; i < 40; i++) {
				const middle = (a + b) / 2;

				if (elongation(middle) < 0) {
					a = middle;
				} else {
					b = middle;
				}
			}

			found.push((a + b) / 2);
		}

		previous = next;
	}

	return found;
}

/* The two stations around an opposition: where the daily motion in
   ecliptic longitude changes sign, to 0.01 day. */
function stationsAround(opposition) {
	const motion = jd => norm180(Ephem.longitude('mars', jd + 0.5) - Ephem.longitude('mars', jd - 0.5));
	const root = (a, b) => {
		for (let i = 0; i < 30; i++) {
			const middle = (a + b) / 2;

			if (motion(a) * motion(middle) <= 0) {
				b = middle;
			} else {
				a = middle;
			}
		}

		return (a + b) / 2;
	};
	let first = null;
	let second = null;

	for (let t = opposition - 120; t < opposition; t += 1) {
		if (motion(t) > 0 && motion(t + 1) <= 0) {
			first = root(t, t + 1);
		}
	}

	for (let t = opposition; t < opposition + 120; t += 1) {
		if (motion(t) < 0 && motion(t + 1) >= 0 && second === null) {
			second = root(t, t + 1);
		}
	}

	return { first, second };
}

const OPPOSITIONS = oppositions(JD(2026, 1, 1), JD(2061, 1, 1));

/* ==========================================================================
   3. LEAD: THE LOOPS OF 2026 - 2060
   ========================================================================== */

title('Lead: the oppositions and loops of AD 2026 - 2060');
{
	const loops = OPPOSITIONS.map(opposition => {
		const s = stationsAround(opposition);
		const arc = norm180(Ephem.longitude('mars', s.first) - Ephem.longitude('mars', s.second));

		return { opposition, days: s.second - s.first, arc };
	});

	loops.forEach(loop => {
		console.log(`${date(loop.opposition)}: backward ${f(loop.days, 0)} days over ${f(loop.arc, 1)}°`);
	});

	const gaps = OPPOSITIONS.slice(1).map((jd, i) => jd - OPPOSITIONS[i]);
	const durations = loops.map(loop => loop.days);

	console.log(
		`from one opposition to the next: ${f(Math.min(...gaps), 0)} to ${f(Math.max(...gaps), 0)} days, on average ${f(mean(gaps), 1)} days = ${f(mean(gaps) / 365.25, 2)} years`
	);
	console.log(
		`the backward run: ${f(Math.min(...durations), 0)} to ${f(Math.max(...durations), 0)} days = ${f(Math.min(...durations) / 30.44, 1)} to ${f(Math.max(...durations) / 30.44, 1)} months`
	);
}

/* ==========================================================================
   4. FIGURE 1: THE SPEED OF THE ANIMATION AND THE STRIP
   The page's LOOP_DAYS_PER_SECOND is 12; the strip is 40° wide and 20°
   high (28° and 14° on a phone), centered on Mars at opposition and on
   the middle of its ecliptic latitudes over the loop, rounded to 1°.
   ========================================================================== */

title('Figure 1: the animation and the strip');
{
	const daysPerSecond = 12;

	console.log(`one day in 1/${daysPerSecond} of a second`);

	let reach = 0;
	let spread = 0;
	let offEcliptic = 0;

	OPPOSITIONS.forEach(opposition => {
		const center = Ephem.planet('mars', opposition).lon;
		const lats = [];

		for (let t = opposition - 90; t <= opposition + 90; t += 1) {
			const p = Ephem.planet('mars', t);

			reach = Math.max(reach, Math.abs(norm180(p.lon - center)));
			lats.push(p.lat);
		}

		const middle = Math.round((Math.min(...lats) + Math.max(...lats)) / 2);

		spread = Math.max(spread, Math.max(...lats) - middle, middle - Math.min(...lats));
		offEcliptic = Math.max(offEcliptic, Math.abs(middle));
	});

	console.log(`within 90 days of opposition Mars reaches ${f(reach, 1)}° from its place at opposition (2026 - 2060)`);
	console.log(
		`its ecliptic latitude stays within ${f(spread, 1)}° of the strip's middle, which is at most ${f(offEcliptic, 0)}° from the ecliptic (the narrow strip's half-height is 7°)`
	);
}

/* ==========================================================================
   5. AFTER FIGURE 1: THE LOOPS' MARCH ALONG THE ZODIAC
   ========================================================================== */

title("After Figure 1: each loop further east; 37 loops in 79 years");
{
	const shifts = OPPOSITIONS.slice(1).map((jd, i) =>
		norm180(Ephem.longitude('mars', jd) - Ephem.longitude('mars', OPPOSITIONS[i]))
	);

	console.log(`from one opposition to the next, Mars' ecliptic longitude: ${shifts.map(s => f(s, 0)).join(', ')}°`);
	console.log(`on average ${f(mean(shifts), 1)}° further east`);

	// 37 synodic periods of the mean motions (the reference's mean Sun and
	// mean Mars), against 79 years
	const synodic = 360 / (Ephem.sunMeanLongitude(2451546.0) - Ephem.sunMeanLongitude(2451545.0) - 0.524039);

	console.log(
		`37 mean synodic periods: ${f((37 * mean(OPPOSITIONS.slice(1).map((jd, i) => jd - OPPOSITIONS[i]))) / 365.25, 2)} years (from the oppositions above); ${f((37 * synodic) / 365.25, 2)} years (mean motions)`
	);
}
