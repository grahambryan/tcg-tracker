#!/usr/bin/env node
/**
 * TCG Tracker — Build Script
 * Copies tcg-tracker.html → public/index.html (production, clean)
 * Also generates public/demo.html (pre-filled with mock data)
 * Validates that all required public assets exist.
 */
const fs   = require('fs');
const path = require('path');

const ROOT   = path.resolve(__dirname, '..');
const SRC    = path.join(ROOT, 'tcg-tracker.html');
const PUBLIC = path.join(ROOT, 'public');
const OUT    = path.join(PUBLIC, 'index.html');
const DEMO   = path.join(PUBLIC, 'demo.html');

const COL = { green:'\x1b[32m', red:'\x1b[31m', reset:'\x1b[0m', bold:'\x1b[1m' };

function ok(msg)   { console.log(`${COL.green}✓${COL.reset} ${msg}`); }
function fail(msg) { console.error(`${COL.red}✗${COL.reset} ${msg}`); process.exit(1); }

console.log(`${COL.bold}TCG Tracker — Build${COL.reset}\n`);

// 1. Source file exists
if (!fs.existsSync(SRC)) fail(`Source not found: ${SRC}`);
ok('Source file found');

// 2. Ensure public/ dir
if (!fs.existsSync(PUBLIC)) fs.mkdirSync(PUBLIC, { recursive: true });

// 3. Copy to public/index.html (production — clean, no data)
fs.copyFileSync(SRC, OUT);
const size = (fs.statSync(OUT).size / 1024).toFixed(1);
ok(`Copied → public/index.html (${size}kb)`);

// 4. Generate demo.html with mock data injected
const { MOCK_DB } = require('./mock-data');
const srcHtml = fs.readFileSync(SRC, 'utf8');

// Build the demo script as a standalone block.
// The JSON data goes into a separate <script> before the app loads,
// so it seeds localStorage before the app's load() runs.
const demoDataScript = '<script>/* demo-seed */\n'
  + '(function(){'
  + 'window.__TCG_DEMO__=true;'
  + 'var K="tcg_v2_demo";'
  + 'if(!localStorage.getItem(K)){'
  + 'localStorage.setItem(K,JSON.stringify(' + JSON.stringify(MOCK_DB) + '));'
  + '}'
  + '})();\n'
  + '<' + '/script>';

const demoBannerScript = '<script>/* demo-banner */\n'
  + 'window.addEventListener("load",function(){'
  + 'var b=document.createElement("div");b.id="demo-banner";'
  + 'b.style.cssText="position:fixed;top:0;left:0;right:0;z-index:9999;background:linear-gradient(90deg,#a855f7,#6366f1);color:#fff;font-size:12px;font-family:system-ui,sans-serif;padding:6px 16px;display:flex;align-items:center;gap:12px;box-shadow:0 2px 8px rgba(0,0,0,.3)";'
  + 'b.innerHTML=\'<span style="font-weight:700">DEMO MODE</span>'
  + '<span style="opacity:.8">Pre-filled with sample TCG business data</span>'
  + '<button onclick="localStorage.removeItem(\\x27tcg_v2_demo\\x27);location.reload()" style="margin-left:auto;background:rgba(255,255,255,.2);border:1px solid rgba(255,255,255,.3);color:#fff;border-radius:6px;padding:3px 10px;font-size:11px;cursor:pointer">Reset Data</button>'
  + '<button onclick="this.parentElement.remove()" style="background:none;border:none;color:rgba(255,255,255,.6);cursor:pointer;font-size:16px;padding:0 4px">\\u2715</button>\';'
  + 'document.body.prepend(b);'
  + 'var h=document.querySelector(".hdr");if(h)h.style.marginTop="34px";'
  + '});\n'
  + '<' + '/script>';

// Inject data seed BEFORE the main app <script> (the second one — first bare
// <script> without src, which is the app JS). The xlsx CDN tag has src= so
// we target the first <script> that has NO src attribute.
// This ensures localStorage is populated before the app's load() runs.
let count = 0;
let demoHtml = srcHtml.replace(/<script>/g, (match) => {
  count++;
  // The first bare <script> (no src) is the main app JS
  if (count === 1) {
    return demoDataScript + '\n' + match;
  }
  return match;
});
// Replace only the LAST </body> (there's one inside printSchedC template literal)
const lastBody = demoHtml.lastIndexOf('</body>');
demoHtml = demoHtml.slice(0, lastBody) + demoBannerScript + '\n</body>' + demoHtml.slice(lastBody + 7);
fs.writeFileSync(DEMO, demoHtml);
const demoSize = (fs.statSync(DEMO).size / 1024).toFixed(1);
ok(`Generated → public/demo.html (${demoSize}kb) with mock data`);

// 5. Stamp sw.js with build timestamp so each deploy busts the SW cache
const SW_TPL = path.join(ROOT, 'sw.js');
const SW_OUT = path.join(PUBLIC, 'sw.js');
if (!fs.existsSync(SW_TPL)) fail('Missing: sw.js (service worker template)');
const buildTs = Date.now();
const swSrc = fs.readFileSync(SW_TPL, 'utf8');
fs.writeFileSync(SW_OUT, swSrc.replace('__BUILD_TS__', String(buildTs)));
ok(`Stamped sw.js cache version → tcg-v${buildTs}`);

// 6. Validate required assets
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

// 6. Basic HTML sanity checks
const html = fs.readFileSync(OUT, 'utf8');
if (!html.includes('manifest.json'))  fail('manifest.json not linked in HTML');
if (!html.includes('sw.js'))          fail('sw.js not referenced in HTML');
if (!html.includes('serviceWorker'))  fail('serviceWorker registration missing');
ok('PWA references present in HTML');

// 7. Validate JS can be extracted and parsed
const { Script } = require('vm');
const matches = [...html.matchAll(/<script[^>]*>/g)];
if (matches.length < 2) fail('Could not find second <script> block');
const pos = matches[1].index + matches[1][0].length;
const end = html.indexOf('</script>', pos);
const js  = html.slice(pos, end);
try { new Script(js); ok('App JS syntax valid'); }
catch(e) { fail('JS syntax error: ' + e.message); }

console.log(`\n${COL.green}${COL.bold}Build complete ✓${COL.reset}`);
console.log(`  Production: public/index.html (clean, no data)`);
console.log(`  Demo:       public/demo.html (pre-filled mock data)`);
