'use strict';

// Node 24 aborts a long-lived Vitest worker inside the better-sqlite3
// destructor. One process per test file exits cleanly. The files still run
// under the project Vitest config, including the line-coverage floor when
// --coverage is passed to a single full run on Node 20 in CI.
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const vitest = path.join(root, 'node_modules', 'vitest', 'vitest.mjs');

function collect(dir, files) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) collect(full, files);
    else if (name.endsWith('.test.js')) files.push(full);
  }
}

const files = [];
collect(path.join(root, 'tests'), files);
files.sort();

function runFile(file) {
  return spawnSync(
    process.execPath,
    [vitest, 'run', '--pool=threads', '--maxWorkers=1', '--no-file-parallelism', file],
    { cwd: root, stdio: 'inherit' }
  );
}

let failed = 0;
for (const file of files) {
  let result = runFile(file);
  // The native addon can abort the worker after the assertions have passed.
  // A second process is a clean isolate. A real test failure stays exit 1.
  if (result.status === null || result.status === 134) {
    console.error(`run-tests: ${path.basename(file)} aborted; retrying once`);
    result = runFile(file);
  }
  if (result.status !== 0) failed += 1;
}

if (failed > 0) {
  console.error(`run-tests: ${failed} file(s) failed`);
  process.exit(1);
}
