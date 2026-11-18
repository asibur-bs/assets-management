'use strict';

const path = require('node:path');
const fs = require('node:fs');
const Database = require('better-sqlite3');
const { applyMigrations } = require('./migrate');

// Node 24.19.0 through 24.21.x abort in RemoveEnvironmentCleanupHook when V8
// collects a better-sqlite3 Statement. That assertion is gone in 24.22.0.
function assertSupportedNode() {
  const [major, minor] = process.versions.node.split('.').map(Number);
  if (major === 24 && minor >= 19 && minor < 22) {
    throw new Error(
      `Node.js ${process.versions.node} aborts while garbage-collecting better-sqlite3 statements. Use Node.js 24.22.0 or newer (.nvmrc pins 24.22.3), or any release before 24.19.0.`
    );
  }
}

function openDatabase(filename) {
  assertSupportedNode();
  const isMemory = filename === ':memory:' || filename === undefined;
  if (!isMemory) {
    const dir = path.dirname(filename);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  }
  const db = new Database(filename || ':memory:');
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 5000');
  applyMigrations(db);
  return db;
}

module.exports = { openDatabase };
