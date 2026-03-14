# TCG Tracker

Personal TCG business tracker — single-file PWA deployed to GitHub Pages.

## Project structure

```
tcg-tracker.html       <- the entire app (edit this)
public/
  index.html           <- built output (production, clean — auto-generated)
  demo.html            <- built output (demo with mock data — auto-generated)
  dev-preview.html     <- side-by-side desktop + mobile preview
  manifest.json
  sw.js
  icon-192.svg
  icon-512.svg
scripts/
  build.js             <- builds index.html + demo.html
  mock-data.js          <- shared mock data (used by demo + tests)
  test.js              <- 132-test suite
  ci.js                <- build + test (run before every commit)
.github/workflows/
  ci.yml               <- build + test on every push/PR
  deploy-prod.yml      <- deploy production to GitHub Pages (this repo)
  deploy-demo.yml      <- deploy demo to separate repo (tcg-tracker-demo)
```

## Local development

```bash
# Run CI pipeline (build + all tests)
node scripts/ci.js

# Build only
node scripts/build.js

# Test only
node scripts/test.js
```

No npm install needed — zero dependencies.

## Deployment — GitHub Pages

Production and demo are **separate GitHub Pages deployments**:

| Site | Repo | URL |
|------|------|-----|
| **Production** | `tcg-tracker` | `https://<user>.github.io/tcg-tracker/` |
| **Demo** | `tcg-tracker-demo` | `https://<user>.github.io/tcg-tracker-demo/` |

### Setup steps

#### 1. Production (this repo)

1. Go to repo Settings -> Pages
2. Set Source to **GitHub Actions**
3. Push to `main` — the `deploy-prod.yml` workflow handles the rest

#### 2. Demo (separate repo)

1. Create a new empty repo called `tcg-tracker-demo` on GitHub
2. Go to that repo's Settings -> Pages -> set Source to **Deploy from a branch** -> `gh-pages`
3. Generate an SSH deploy key:
   ```bash
   ssh-keygen -t ed25519 -C "demo-deploy" -f demo_deploy_key -N ""
   ```
4. Add the **public key** (`demo_deploy_key.pub`) as a Deploy Key in `tcg-tracker-demo` repo settings (check "Allow write access")
5. Add the **private key** (`demo_deploy_key`) as a secret called `DEMO_DEPLOY_KEY` in **this** repo's Settings -> Secrets
6. Push to `main` — the `deploy-demo.yml` workflow builds and pushes demo to `tcg-tracker-demo`

### What deploys where

Every push to `main`:
1. CI runs (build + 132 tests) — blocks deploy if tests fail
2. Production deploys to `tcg-tracker` GitHub Pages (clean app, no data)
3. Demo deploys to `tcg-tracker-demo` GitHub Pages (pre-filled mock data)

## Demo site

The demo site is pre-filled with realistic mock data:
- 12 buy records across One Piece, Pokemon, MTG, and Lorcana
- 9 sell records with realistic P&L
- 16 inventory cards (15 business + 1 personal)
- 6 expense records

Mock data is defined in `scripts/mock-data.js` and shared between the demo build and test suite. The demo has a purple banner with a "Reset Data" button.

## AI features

AI features (market lookup via Claude API) require a proxy server. These are opt-in and disabled by default. The app works fully without them.

## PWA installation

On mobile: open the site in Safari/Chrome -> Share -> "Add to Home Screen"
The app works fully offline once installed.
