#!/usr/bin/env node
/**
 * TCG Tracker — Build Script
 * Copies tcg-tracker.html → public/index.html
 * Validates that all required public assets exist.
 */
const fs   = require('fs');
const path = require('path');

const ROOT   = path.resolve(__dirname, '..');
const SRC    = path.join(ROOT, 'tcg-tracker.html');
const PUBLIC = path.join(ROOT, 'public');
const OUT    = path.join(PUBLIC, 'index.html');

const COL = { green:'\x1b[32m', red:'\x1b[31m', reset:'\x1b[0m', bold:'\x1b[1m' };

function ok(msg)   { console.log(`${COL.green}✓${COL.reset} ${msg}`); }
function fail(msg) { console.error(`${COL.red}✗${COL.reset} ${msg}`); process.exit(1); }

console.log(`${COL.bold}TCG Tracker — Build${COL.reset}\n`);

// 1. Source file exists
if (!fs.existsSync(SRC)) fail(`Source not found: ${SRC}`);
ok('Source file found');

// 2. Ensure public/ dir
if (!fs.existsSync(PUBLIC)) fs.mkdirSync(PUBLIC, { recursive: true });

// 3. Copy to public/index.html
fs.copyFileSync(SRC, OUT);
const size = (fs.statSync(OUT).size / 1024).toFixed(1);
ok(`Copied → public/index.html (${size}kb)`);

// 4. Validate required assets
const required = [
  'manifest.json',
  'sw.js',
  'icon-192.svg',
  'icon-512.svg',
];
for (const f of required) {
  const p = path.join(PUBLIC, f);
  if (!fs.existsSync(p)) fail(`Missing required asset: public/${f}`);
  ok(`Asset present: public/${f}`);
}

// 5. Basic HTML sanity checks
const html = fs.readFileSync(OUT, 'utf8');
if (!html.includes('manifest.json'))  fail('manifest.json not linked in HTML');
if (!html.includes('sw.js'))          fail('sw.js not referenced in HTML');
if (!html.includes('serviceWorker'))  fail('serviceWorker registration missing');
ok('PWA references present in HTML');

// 6. Validate JS can be extracted and parsed
const { Script } = require('vm');
const matches = [...html.matchAll(/<script[^>]*>/g)];
if (matches.length < 2) fail('Could not find second <script> block');
const pos = matches[1].index + matches[1][0].length;
const end = html.indexOf('</script>', pos);
const js  = html.slice(pos, end);
try { new Script(js); ok('App JS syntax valid'); }
catch(e) { fail('JS syntax error: ' + e.message); }

console.log(`\n${COL.green}${COL.bold}Build complete ✓${COL.reset}`);
