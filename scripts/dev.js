#!/usr/bin/env node
/**
 * TCG Tracker — Dev Server
 * Watches tcg-tracker.html, rebuilds on change, serves public/ with live reload.
 * Zero install — uses Node built-ins only.
 *
 * Usage: node scripts/dev.js
 */
const fs   = require('fs');
const path = require('path');
const http = require('http');
const { execSync } = require('child_process');

const ROOT   = path.resolve(__dirname, '..');
const SRC    = path.join(ROOT, 'tcg-tracker.html');
const PUBLIC = path.join(ROOT, 'public');
const PORT   = 3000;

const COL = { green:'\x1b[32m', red:'\x1b[31m', cyan:'\x1b[36m', dim:'\x1b[2m', reset:'\x1b[0m', bold:'\x1b[1m' };

// ── SSE clients for live reload ─────────────────────────────────────────────
const clients = [];

function notifyReload() {
  clients.forEach(res => {
    try { res.write('data: reload\n\n'); } catch {}
  });
}

// ── Build ───────────────────────────────────────────────────────────────────
function build() {
  try {
    execSync('node scripts/build.js', { cwd: ROOT, stdio: 'pipe' });
    const now = new Date().toLocaleTimeString();
    console.log(`${COL.green}✓${COL.reset} Built ${COL.dim}${now}${COL.reset}`);
    return true;
  } catch (e) {
    const now = new Date().toLocaleTimeString();
    console.error(`${COL.red}✗ Build failed${COL.reset} ${COL.dim}${now}${COL.reset}`);
    console.error(e.stderr?.toString() || e.message);
    return false;
  }
}

// ── Inject live-reload script into HTML responses ───────────────────────────
const RELOAD_SCRIPT = `<script>
(function(){var es=new EventSource('/__reload');es.onmessage=function(){location.reload()};es.onerror=function(){es.close();setTimeout(function(){location.reload()},2000)};})();
</script>`;

function injectReload(html) {
  return html.replace('</body>', RELOAD_SCRIPT + '\n</body>');
}

// ── Static file server ──────────────────────────────────────────────────────
const MIME = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.webp': 'image/webp', '.woff2': 'font/woff2',
};

const server = http.createServer((req, res) => {
  // SSE endpoint for live reload
  if (req.url === '/__reload') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });
    res.write('data: connected\n\n');
    clients.push(res);
    req.on('close', () => {
      const i = clients.indexOf(res);
      if (i >= 0) clients.splice(i, 1);
    });
    return;
  }

  let urlPath = req.url.split('?')[0];
  const isTopLevel = urlPath === '/' || urlPath === '/prod' || urlPath === '/dev-preview.html';
  if (urlPath === '/') urlPath = '/demo.html';
  if (urlPath === '/prod') urlPath = '/index.html';

  const filePath = path.join(PUBLIC, urlPath);
  const ext = path.extname(filePath);

  if (!fs.existsSync(filePath)) {
    res.writeHead(404);
    res.end('Not found');
    return;
  }

  const content = fs.readFileSync(filePath);
  const mime = MIME[ext] || 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': mime, 'Cache-Control': 'no-store' });

  if (ext === '.html' && isTopLevel) {
    const html = content.toString();
    if (urlPath === '/dev-preview.html') {
      // Dev-preview: reload iframes instead of full page reload
      const reloaded = html.replace('</body>',
        `<script>
(function(){var es=new EventSource('/__reload');es.onmessage=function(){
  document.getElementById('desktop-frame').contentWindow.location.reload();
  document.getElementById('mobile-frame').contentWindow.location.reload();
};es.onerror=function(){es.close();setTimeout(function(){location.reload()},3000)};})();
</script>\n</body>`);
      res.end(reloaded);
    } else {
      // Standalone page: simple reload
      res.end(injectReload(html));
    }
  } else {
    res.end(ext === '.html' ? content.toString() : content);
  }
});

// ── Watch for changes ───────────────────────────────────────────────────────
let debounce = null;

function onChange() {
  if (debounce) clearTimeout(debounce);
  debounce = setTimeout(() => {
    if (build()) notifyReload();
  }, 200);
}

// Initial build
console.log(`\n${COL.bold}${COL.cyan}TCG Tracker — Dev Server${COL.reset}\n`);
build();

// Poll for changes (fs.watch is unreliable on macOS with some editors)
const watchFiles = [SRC, path.join(ROOT, 'scripts', 'mock-data.js')];
const mtimes = {};
watchFiles.forEach(f => { try { mtimes[f] = fs.statSync(f).mtimeMs; } catch {} });

setInterval(() => {
  watchFiles.forEach(f => {
    try {
      const mt = fs.statSync(f).mtimeMs;
      if (mt !== mtimes[f]) {
        mtimes[f] = mt;
        onChange();
      }
    } catch {}
  });
}, 500);

server.listen(PORT, () => {
  console.log(`\n${COL.green}${COL.bold}Dev server running:${COL.reset}`);
  console.log(`  Demo:       ${COL.cyan}http://localhost:${PORT}/${COL.reset}`);
  console.log(`  Production: ${COL.cyan}http://localhost:${PORT}/prod${COL.reset}`);
  console.log(`  Preview:    ${COL.cyan}http://localhost:${PORT}/dev-preview.html${COL.reset}`);
  console.log(`\n${COL.dim}Watching tcg-tracker.html for changes…${COL.reset}\n`);
});
