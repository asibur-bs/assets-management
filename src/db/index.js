'use strict';

const path = require('node:path');
const fs = require('node:fs');
const Database = require('better-sqlite3');
const { applyMigrations } = require('./migrate');

function openDatabase(filename) {
  const isMemory = filename === ':memory:' || filename === undefined;
  if (!isMemory) {
    const dir = path.dirname(filename);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  }
  const db = new Database(filename || ':memory:');
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  applyMigrations(db);
  return db;
}

module.exports = { openDatabase };