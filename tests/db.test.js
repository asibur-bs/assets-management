'use strict';

const Database = require('better-sqlite3');
const { openDatabase } = require('../src/db');
const { applyMigrations } = require('../src/db/migrate');

describe('database schema', () => {
  let db;

  beforeEach(() => {
    db = openDatabase(':memory:');
  });

  afterEach(() => {
    if (db) db.close();
  });

  it('creates the assets and audit_log tables on a fresh database', () => {
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
      .all()
      .map((r) => r.name);
    expect(tables).toContain('assets');
    expect(tables).toContain('audit_log');
  });

  it('enforces the unique constraint on (category, serial_or_key)', () => {
    db.prepare(`INSERT INTO assets (id, category, name, serial_or_key) VALUES ('a','hardware','A','X')`).run();
    expect(() =>
      db.prepare(`INSERT INTO assets (id, category, name, serial_or_key) VALUES ('b','hardware','B','X')`).run()
    ).toThrow(/UNIQUE constraint/);
  });

  it('records audit entries with timestamps', () => {
    db.prepare(`INSERT INTO assets (id, category, name, serial_or_key) VALUES ('c','software-license','C','Y')`).run();
    db.prepare(`INSERT INTO audit_log (asset_id, action, description) VALUES ('c', 'create', 'created')`).run();
    const row = db.prepare(`SELECT * FROM audit_log WHERE asset_id = 'c'`).get();
    expect(row.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  // FR4.6 / FR4.7 — the lifecycle timestamp columns exist on the `assets` table.
  it('provides the assigned_at and returned_at columns (FR4.6, FR4.7)', () => {
    const columns = db.prepare('PRAGMA table_info(assets)').all().map((c) => c.name);
    expect(columns).toContain('assigned_at');
    expect(columns).toContain('returned_at');
  });

  it('defaults a new asset to the in-stock state with both timestamps empty (FR1.5)', () => {
    db.prepare(`INSERT INTO assets (id, category, name, serial_or_key) VALUES ('e','hardware','E','Z')`).run();
    const row = db.prepare(`SELECT * FROM assets WHERE id = 'e'`).get();
    expect(row.status).toBe('in-stock');
    expect(row.assigned_at).toBeNull();
    expect(row.returned_at).toBeNull();
  });

  // The lifecycle timestamps are a MIGRATION over the existing `assets` table,
  // not a fresh table definition, so a database created by the earlier release
  // still works.
  it('migrates a pre-existing assets table by adding the timestamp columns', () => {
    // Built directly rather than through `openDatabase`, so no migration is
    // recorded as applied yet — this is the state of a database written by the
    // earlier release.
    const legacy = new Database(':memory:');
    legacy.exec(`
      CREATE TABLE assets (
        id TEXT PRIMARY KEY,
        category TEXT NOT NULL CHECK (category IN ('hardware', 'software-license')),
        name TEXT NOT NULL,
        serial_or_key TEXT NOT NULL,
        model TEXT,
        notes TEXT,
        status TEXT NOT NULL CHECK (status IN ('in-stock', 'assigned', 'returned', 'lost')) DEFAULT 'in-stock',
        assigned_to TEXT,
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
        updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
        UNIQUE (category, serial_or_key)
      );
    `);
    legacy.exec(`INSERT INTO assets (id, category, name, serial_or_key) VALUES ('legacy','hardware','Legacy','L-1')`);

    // Applying the migrations must add the two columns without losing data.
    applyMigrations(legacy);

    const columns = legacy.prepare('PRAGMA table_info(assets)').all().map((c) => c.name);
    expect(columns).toContain('assigned_at');
    expect(columns).toContain('returned_at');

    const row = legacy.prepare(`SELECT * FROM assets WHERE id = 'legacy'`).get();
    expect(row.name).toBe('Legacy');
    expect(row.assigned_at).toBeNull();
    expect(row.returned_at).toBeNull();
    legacy.close();
  });

  it('applies each migration exactly once and records it', () => {
    const applied = db.prepare('SELECT version, name FROM schema_migrations ORDER BY version').all();
    expect(applied.length).toBeGreaterThan(0);
    const versions = applied.map((r) => r.version);
    expect(new Set(versions).size).toBe(versions.length);
    expect(applied.some((r) => r.name === 'lifecycle-timestamps')).toBe(true);
  });
});
