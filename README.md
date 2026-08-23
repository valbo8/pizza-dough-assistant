# Pizza Dough Assistant 🍕

A lightweight installable PWA built around the golden baseline pizza dough recipe.

## Baseline

- 6 × approximately 260 g dough balls
- Approximately 12-inch pizzas
- 940 g 00 flour
- 592 g water
- 26 g fine sea salt
- Poolish: 300 g flour + 300 g water + approximately 0.5 g IDY
- Hydration: approximately 63%
- Salt: approximately 2.77%
- Poolish flour: approximately 32% of total flour

## Current version

- Scales the golden baseline by pizza count and diameter
- Generates a backwards fermentation schedule from pizza time
- Supports multiple unavailable periods
- Highlights schedule clashes
- Includes an active dough-session step tracker
- Installable as a PWA
- Works offline after the first successful load

## Important current limitation

Unavailable periods are currently detected and flagged, but the app does not yet intelligently
re-optimise the fermentation schedule around those periods. That is the next major scheduler feature.

## Deploy on Netlify

This is a static site. No build command is required.

- Publish directory: repository root
- Build command: leave blank
