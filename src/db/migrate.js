'use strict';

const fs = require('node:fs');
const path = require('node:path');

const MIGRATIONS_SQL = fs.readFileSync(path.join(__dirname, 'migrations.sql'), 'utf8');

/**
 * Every migration is applied exactly once, in order, and recorded in
 * `schema_migrations`. The base schema uses `IF NOT EXISTS` throughout, so it
 * is also safe to apply over a database created by an earlier release.
 */
const MIGRATIONS = [
  {
    version: 1,
    name: 'base-schema',
    up(db) {
      db.exec(MIGRATIONS_SQL);
    },
  },
  {
    version: 2,
    name: 'lifecycle-timestamps',
    up(db) {
      // FR4.6 / FR4.7: the assignment and return timestamps are columns on
      // `assets`. SQLite cannot express "add column if not exists", so the
      // check is done here. A database created before this migration still
      // has the original table, and picks up the two columns here.
      addColumnIfMissing(db, 'assets', 'assigned_at', 'TEXT');
      addColumnIfMissing(db, 'assets', 'returned_at', 'TEXT');
    },
  },
];

function addColumnIfMissing(db, table, column, type) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all();
  const exists = columns.some((c) => c.name === column);
  if (exists) return false;
  db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
  return true;
}

function ensureMigrationsTable(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    );
  `);
}

function applyMigrations(db) {
  ensureMigrationsTable(db);
  const applied = new Set(
    db.prepare('SELECT version FROM schema_migrations').all().map((row) => row.version)
  );
  for (const migration of MIGRATIONS) {
    if (applied.has(migration.version)) continue;
    const run = db.transaction(() => {
      migration.up(db);
      db.prepare('INSERT INTO schema_migrations (version, name) VALUES (?, ?)').run(
        migration.version,
        migration.name
      );
    });
    run();
  }
  return db;
}

module.exports = { applyMigrations, MIGRATIONS, MIGRATIONS_SQL };
