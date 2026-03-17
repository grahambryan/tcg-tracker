# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TCG Tracker is a zero-dependency, single-file PWA for tracking trading card game business (buys, sells, inventory, expenses, analytics). The entire application lives in `tcg-tracker.html` (~8,000 lines of vanilla JS/CSS/HTML).

## Commands

```bash
make build             # Build production (public/index.html) + demo (public/demo.html)
make test              # Build then run 156-test suite
make ci                # Full CI pipeline (build + test, gates deployments)
make deploy-prod       # CI + deploy production to gh-pages branch
make deploy-demo       # CI + deploy demo to tcg-tracker-demo repo
npm test -- --bail     # Stop on first failure
npm test -- --quiet    # Only show failures + summary
```

Tests run via a custom Node.js VM sandbox (`scripts/test.js`) — no test framework dependencies. The test runner extracts JS from the built HTML, so **you must build before running tests** if you've changed `tcg-tracker.html` (the `make test` target handles this automatically).

## Architecture

**Single-file app** — `tcg-tracker.html` contains all markup, styles, and logic. Major sections are delimited by `// ════` comment dividers:

- **Data Layer** — `DB` object (buys, sells, inventory, expenses), `load()`/`save()` via `localStorage[tcg_v2]`
- **Helpers** — formatting, date math, game normalization, hashing
- **Nav** — 6-page SPA routing (dash, cards, activity, more, sched, help)
- **Dashboard** — portfolio stats, P&L, charts
- **Inventory** — card holdings, trade pile, Smart Drop filtering
- **Buys/Sells** — purchase & sale records, CSV import, duplicate detection via content hashing
- **Analytics** — market intelligence, pricing signals

**Build system** (`scripts/build.js`):
- Copies `tcg-tracker.html` → `public/index.html` (clean production)
- Generates `public/demo.html` with mock data injected into localStorage before app init
- Validates PWA assets exist (manifest.json, sw.js, icons)

**Mock data** (`scripts/mock-data.js`) is shared between the test suite and demo build.

## Deployment

Three GitHub Actions workflows:
- `ci.yml` — runs `node scripts/ci.js` on push/PR to main
- `deploy-prod.yml` — deploys `public/index.html` to this repo's GitHub Pages
- `deploy-demo.yml` — deploys `public/demo.html` to a separate `tcg-tracker-demo` repo via SSH deploy key

## Testing Details

The test sandbox mocks DOM APIs (`getElementById`, `querySelector`, `createElement`, `addEventListener`), localStorage, and fetch. Tests are organized into 15 suites covering imports, trade pile, market intelligence, dupe detection, CRUD operations, business logic, rendering, and more.

When adding features, test by calling the function directly in the sandbox environment — the DOM mocks are minimal, so test logic/data rather than DOM manipulation.

## Development

- always make sure to hot reload the dev-preview and say its back up
- Always make sure docs represent how the app is used, if it doesnt update them
- write new tests for any new features

## Key Conventions

- No external runtime dependencies — everything is vanilla JS loaded from CDN (only xlsx.js for Excel parsing)
- Claude API integration is opt-in and feature-gated behind an AI toggle
- 5 CSS themes via custom properties (Night Owl, Robinhood, Coastal, Ember, Glacial)
- PWA with service worker for offline support (`public/sw.js`)
