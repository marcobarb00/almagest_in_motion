# The Almagest in Motion

*From the celestial sphere to Kepler's ellipse: an interactive course in
classical positional astronomy.*

**Read it at <https://marcobarb00.github.io/almagest_in_motion/>**, in
English or in Italian.

## What the course is

The old models of the sky (Hipparchus' Sun on an off-center circle,
Ptolemy's epicycles and equant, Copernicus' circles about the Sun, Kepler's
ellipse) usually get a paragraph and a drawing in astronomy books before
the modern theory takes over. A drawing shows the shape of a model, but not
how its author found it or where its numbers came from.

Each page of this course rebuilds one model as its author conceived it: the
observations it starts from, its geometry, and how its parameters are
fitted to the sky. The model is then tested against a modern reference sky,
to see how close it comes and where it fails, and the next page starts from
what it still gets wrong.

By the end you can compute where the Sun, the Moon and a planet are on any
date, with models you have derived yourself, and you know how wrong each one
is and why.

## Who it is for

Readers with a mathematical education (trigonometry, linear algebra,
calculus) who want to learn the subject properly. The mathematics is shown
in full, and results are derived rather than quoted. The figures are
instruments for checking the mathematics: you move a date, a latitude or a
parameter and see what the model predicts and how far it is from the sky.

## How a page is built

Most pages follow the same five steps:

1. **Observation**: what is seen in the sky, with numbers.
2. **Model**: the geometric idea, derived.
3. **Fit**: which observation fixes each parameter, and why.
4. **Test**: the fitted model against the reference sky, usually as an
   error curve, the model's longitude minus the sky's, over years or
   centuries.
5. **Residual**: what the model still lacks, which the next page takes up.

Short history blocks tell how the astronomer measured and checked his own
model. Margin notes give the origin of each idea (Babylonian, Greek,
Ptolemy, Kepler, modern…) and say what replaces the model today. Each page
of Acts I to IV ends with two or three exercises, with hints and worked
answers.

## Contents

| | Page | Question |
|---|---|---|
| **Act 0** | From Ptolemy to Kepler | Why did it take fifteen centuries to predict Mars? |
| **Act I · The stage** | 1.1 The turning sky | What moves, and around what? |
| | 1.2 Frames | How do we point to stars? |
| | 1.3 Clocks | What time is it according to the sky? |
| **Act II · The Sun** | 2.1 The uneven year | Why are the seasons not equal? |
| | 2.2 The equation of time | Why does the sundial disagree with the clock? |
| | 2.3 Precession | Why do the stars' ecliptic longitudes grow? |
| **Act III · The Moon** | 3.1 The first anomaly | Why does the Moon's speed vary, and with what period? |
| | 3.2 Evection and the distance problem | What goes wrong at the quarters? |
| | 3.3 Eclipses | When does a new Moon become a solar eclipse? |
| **Act IV · The planets** | 4.1 Going backwards | Why do planets loop, and why always at opposition? |
| | 4.2 The equant | What does the simple model miss? |
| | 4.3 Same geometry, new center | What changes when the Sun is fixed? |
| | 4.4 Phases and parallax | Can the observations decide which body is at rest? |
| | 4.5 Kepler | What shape removes the last error? |
| **Epilogue** | Beyond Kepler | Where does the story go next? |

The **simulator**, reached from the home page, gathers every model of the
course: the positions of the Sun, the Moon and the five naked-eye planets on
any date, with their rising and setting times at any place, each beside the
reference sky's position and its error.

## Sources

The historical models follow Ptolemy's *Almagest* (transl. G. J. Toomer),
Copernicus' *De Revolutionibus* (transl. E. Rosen), O. Neugebauer's *A
History of Ancient Mathematical Astronomy*, R. Fitzpatrick's *A Modern
Almagest* and J. Voelkel's *Johannes Kepler and the New Astronomy*. The
reference sky is computed from J. Meeus' *Astronomical Algorithms*, the
VSOP87 theory and JPL's planetary elements, and checked against JPL
Horizons. Each page lists its own sources at the end.

## Reading it offline

The site is plain HTML, CSS and JavaScript with no build step. Download or
clone the repository, serve its folder with any static server, for example

```
python3 -m http.server
```

and open <http://localhost:8000/>. The fonts and the formula typesetting
(KaTeX) are loaded from the web.

## Privacy

The site counts page views with [GoatCounter](https://www.goatcounter.com),
which sets no cookies and collects no personal data. Nothing else is
tracked.

## Licence

The text, figures, exercises and charts are © 2026 Marco Barbieri, under
[CC BY-NC-SA 4.0](LICENSE-CONTENT.md). The code is under the
[MIT License](LICENSE).

Notes on how the site is built, for anyone reading the code, are in
[`DEVELOPING.md`](DEVELOPING.md).
