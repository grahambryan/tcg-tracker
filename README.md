# TCG Tracker

Personal TCG business tracker — single-file PWA deployable to Netlify.

## Project structure

```
tcg-tracker.html      ← the entire app (edit this)
public/
  index.html          ← built output (auto-generated, don't edit)
  manifest.json
  sw.js
  icon-192.svg
  icon-512.svg
scripts/
  build.js            ← copies tcg-tracker.html → public/index.html
  test.js             ← 98-test suite
  ci.js               ← build + test (run before every commit)
.github/workflows/
  ci.yml              ← auto build/test/deploy on push to main
```

## Local development

```bash
# Run CI pipeline (build + all tests) — do this before every commit
node scripts/ci.js

# Build only
node scripts/build.js

# Test only
node scripts/test.js
```

No npm install needed — zero dependencies.

## GitHub + Netlify setup (auto-deploy)

1. Push this repo to GitHub
2. Go to [app.netlify.com](https://app.netlify.com) → Add new site → Import from Git
3. Select your repo
4. Set **build command**: `node scripts/build.js`
5. Set **publish directory**: `public`
6. Click Deploy

Every push to `main` will:
1. Run `node scripts/ci.js` (build + 98 tests)
2. Block deploy if any test fails
3. Auto-deploy to Netlify if tests pass

## GitHub Actions secrets (for CI badge / status checks)

No secrets required for Netlify — it handles deployment directly from the Git integration.

Optional: add `ANTHROPIC_API_KEY` as a Netlify environment variable if you want the AI market lookup feature enabled server-side (it's also settable in-app).

## Workflow for making changes

```bash
# 1. Edit tcg-tracker.html
# 2. Test locally
node scripts/ci.js
# 3. Commit and push
git add tcg-tracker.html
git commit -m "feat: your change"
git push
# Netlify auto-deploys on push to main
```

## PWA installation

On mobile: open the site in Safari/Chrome → Share → "Add to Home Screen"
The app works fully offline once installed.
