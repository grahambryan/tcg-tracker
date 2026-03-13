#!/usr/bin/env node
/**
 * TCG Tracker — CI Pipeline
 * Runs: build → test
 * Exits 0 only if both pass. Used by GitHub Actions and local `npm run ci`.
 */
const { execSync } = require('child_process');
const path = require('path');

const COL = {
  green:'\x1b[32m', red:'\x1b[31m', yellow:'\x1b[33m',
  bold:'\x1b[1m', reset:'\x1b[0m', cyan:'\x1b[36m'
};

function step(name, cmd) {
  console.log(`\n${COL.cyan}${COL.bold}▶ ${name}${COL.reset}`);
  const t0 = Date.now();
  try {
    execSync(cmd, {
      cwd: path.resolve(__dirname, '..'),
      stdio: 'inherit',
      env: { ...process.env, FORCE_COLOR: '1' }
    });
    console.log(`${COL.green}✓ ${name} passed${COL.reset} (${Date.now()-t0}ms)`);
  } catch(e) {
    console.error(`\n${COL.red}${COL.bold}✗ ${name} FAILED${COL.reset}`);
    console.error(`${COL.red}CI pipeline aborted — fix failures before deploying${COL.reset}\n`);
    process.exit(1);
  }
}

console.log(`${COL.bold}═══════════════════════════════════════`);
console.log(`  TCG Tracker — CI Pipeline`);
console.log(`═══════════════════════════════════════${COL.reset}`);
console.log(`Node: ${process.version}  |  ${new Date().toISOString()}`);

step('Build', 'node scripts/build.js');
step('Test',  'node scripts/test.js');

console.log(`\n${COL.green}${COL.bold}✓ CI PASSED — safe to deploy${COL.reset}\n`);
