'use strict';

const fs = require('node:fs');
const path = require('node:path');
const {
  AUDIT_ACTIONS,
  BACKFILL_ACTOR,
  SERIAL_OR_KEY_INDEX_EXPRESSION,
  STATUS_VALUES,
} = require('../domain/vocabulary');

const MIGRATIONS_SQL = fs.readFileSync(path.join(__dirname, 'migrations.sql'), 'utf8');

/**
 * Every migration is applied exactly once, in order, and recorded in
 * `schema_migrations`. The base schema uses `IF NOT EXISTS` throughout, so it
 * is also safe to apply over a database created by an earlier release.
 *
 * `foundation-rebuild` is one transaction on purpose. Dropping `assets` while
 * `audit_log` still references it with ON DELETE CASCADE destroys the history
 * with the transaction committed and no error. The audit rows are copied out
 * first, and a count mismatch or an unbuildable serial index throws before
 * commit so that history is not rewritten.
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
  {
    version: 3,
    name: 'foundation-rebuild',
    up: foundationRebuild,
  },
  {
    version: 4,
    name: 'users-and-sessions',
    up: usersAndSessions,
  },
];

function sqlString(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

function addColumnIfMissing(db, table, column, type) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all();
  const exists = columns.some((c) => c.name === column);
  if (exists) return false;
  db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
  return true;
}

const COUNT_TABLES = new Set(['assets', 'assets_next', 'audit_log', 'audit_log_holding']);

function rowCount(db, table) {
  if (!COUNT_TABLES.has(table)) {
    throw new Error(`refusing to count ${table}`);
  }
  return db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n;
}

function idsMissingFrom(db, source, destination) {
  if (!COUNT_TABLES.has(source) || !COUNT_TABLES.has(destination)) {
    throw new Error(`refusing to compare ${source} and ${destination}`);
  }
  return db
    .prepare(`SELECT id FROM ${source} WHERE id NOT IN (SELECT id FROM ${destination}) ORDER BY id`)
    .all()
    .map((row) => row.id);
}

function assertCopied(db, source, destination, label) {
  const sourceCount = rowCount(db, source);
  const destinationCount = rowCount(db, destination);
  if (sourceCount === destinationCount) return;
  const missing = idsMissingFrom(db, source, destination);
  const extra = idsMissingFrom(db, destination, source);
  throw new Error(
    `${label} count mismatch: source ${sourceCount}, destination ${destinationCount}; ` +
      `missing ids [${missing.join(', ')}]; extra ids [${extra.join(', ')}]`
  );
}

function foundationRebuild(db) {
  copyAuditToHolding(db);
  rebuildAssets(db);
  restoreAudit(db);
  createIndexesAndTriggers(db);
}

function copyAuditToHolding(db) {
  const actor = sqlString(BACKFILL_ACTOR);
  db.exec(`
    CREATE TABLE audit_log_holding (
      id INTEGER PRIMARY KEY,
      asset_id TEXT NOT NULL,
      action TEXT NOT NULL,
      description TEXT NOT NULL,
      created_at TEXT NOT NULL,
      actor TEXT NOT NULL DEFAULT ${actor}
    );
  `);
  db.prepare(
    `
    INSERT INTO audit_log_holding (id, asset_id, action, description, created_at, actor)
    SELECT id, asset_id, action, description, created_at, ?
    FROM audit_log
  `
  ).run(BACKFILL_ACTOR);
  assertCopied(db, 'audit_log', 'audit_log_holding', 'audit holding');
  db.exec('DROP TABLE audit_log');
}

function rebuildAssets(db) {
  const statusList = STATUS_VALUES.map(sqlString).join(', ');
  db.exec(`
    CREATE TABLE assets_next (
      id TEXT PRIMARY KEY,
      category TEXT NOT NULL CHECK (category IN ('hardware', 'software-license')),
      name TEXT NOT NULL,
      serial_or_key TEXT NOT NULL,
      model TEXT,
      notes TEXT,
      status TEXT NOT NULL CHECK (status IN (${statusList})) DEFAULT 'in-stock',
      assigned_to TEXT,
      assigned_at TEXT,
      returned_at TEXT,
      last_assigned_to TEXT,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
      updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    );
  `);
  db.exec(`
    INSERT INTO assets_next (
      id, category, name, serial_or_key, model, notes, status, assigned_to,
      assigned_at, returned_at, last_assigned_to, created_at, updated_at
    )
    SELECT
      id, category, name, serial_or_key, model, notes, status, assigned_to,
      assigned_at, returned_at, NULL, created_at, updated_at
    FROM assets
  `);
  assertCopied(db, 'assets', 'assets_next', 'assets');
  db.exec('DROP TABLE assets');
  db.exec('ALTER TABLE assets_next RENAME TO assets');
}

function restoreAudit(db) {
  const actor = sqlString(BACKFILL_ACTOR);
  const actionList = AUDIT_ACTIONS.map(sqlString).join(', ');
  db.exec(`
    CREATE TABLE audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      asset_id TEXT NOT NULL,
      action TEXT NOT NULL CHECK (action IN (${actionList})),
      description TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
      actor TEXT NOT NULL DEFAULT ${actor},
      FOREIGN KEY (asset_id) REFERENCES assets(id)
    );
  `);
  db.exec(`
    INSERT INTO audit_log (id, asset_id, action, description, created_at, actor)
    SELECT id, asset_id, action, description, created_at, actor
    FROM audit_log_holding
  `);
  assertCopied(db, 'audit_log_holding', 'audit_log', 'audit_log');
  db.exec('DROP TABLE audit_log_holding');
}

function throwIfSerialsCollide(db) {
  const rows = db
    .prepare(
      `SELECT id, category, serial_or_key
       FROM assets
       WHERE (category, ${SERIAL_OR_KEY_INDEX_EXPRESSION}) IN (
         SELECT category, ${SERIAL_OR_KEY_INDEX_EXPRESSION}
         FROM assets
         GROUP BY category, ${SERIAL_OR_KEY_INDEX_EXPRESSION}
         HAVING COUNT(*) > 1
       )
       ORDER BY id`
    )
    .all();
  if (rows.length === 0) return;
  const detail = rows
    .map((row) => `${row.id} category=${row.category} serial_or_key=${JSON.stringify(row.serial_or_key)}`)
    .join('; ');
  const err = new Error(`case-insensitive serial collision: ${detail}`);
  err.code = 'SQLITE_CONSTRAINT_UNIQUE';
  throw err;
}

function createIndexesAndTriggers(db) {
  db.exec(`
    CREATE INDEX idx_assets_status ON assets(status);
    CREATE INDEX idx_assets_category ON assets(category);
    CREATE INDEX idx_audit_asset_recent ON audit_log(asset_id, id DESC);
  `);
  // Built inside the same transaction. A collision is reported with the row
  // identifiers, then the transaction rolls back and the source rows stay.
  throwIfSerialsCollide(db);
  db.exec(`CREATE UNIQUE INDEX idx_assets_serial_ci ON assets (category, ${SERIAL_OR_KEY_INDEX_EXPRESSION})`);
  db.exec(`
    CREATE TRIGGER audit_log_no_update
    BEFORE UPDATE ON audit_log
    BEGIN
      SELECT RAISE(ABORT, 'audit_log is append-only');
    END;

    CREATE TRIGGER audit_log_no_delete
    BEFORE DELETE ON audit_log
    BEGIN
      SELECT RAISE(ABORT, 'audit_log is append-only');
    END;
  `);
}

function usersAndSessions(db) {
  db.exec(`
    CREATE TABLE users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL COLLATE NOCASE UNIQUE,
      display_name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('administrator', 'reader')),
      disabled_at TEXT,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
      updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    );

    CREATE TABLE sessions (
      id_hash TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      csrf_token TEXT NOT NULL,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE INDEX idx_sessions_user ON sessions(user_id);
    CREATE INDEX idx_sessions_expires ON sessions(expires_at);
  `);
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
    db
      .prepare('SELECT version FROM schema_migrations')
      .all()
      .map((row) => row.version)
  );
  for (const migration of MIGRATIONS) {
    if (applied.has(migration.version)) continue;
    // SQLite ignores this pragma inside a transaction, so the window stays
    // outside BEGIN/COMMIT and is restored when the migration throws.
    db.pragma('foreign_keys = OFF');
    try {
      const run = db.transaction(() => {
        migration.up(db);
        db.prepare('INSERT INTO schema_migrations (version, name) VALUES (?, ?)').run(
          migration.version,
          migration.name
        );
      });
      run();
    } finally {
      db.pragma('foreign_keys = ON');
    }
  }
  return db;
}

module.exports = { applyMigrations, MIGRATIONS, MIGRATIONS_SQL };
