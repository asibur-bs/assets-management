'use strict';

const { describe, it, expect, beforeAll, afterAll } = require('vitest');
const { openDatabase } = require('../src/db');

describe('database schema', () => {
  let db;
  afterAll(() => { if (db) db.close(); });

  it('creates the assets and audit_log tables on a fresh database', () => {
    db = openDatabase(':memory:');
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all().map(r => r.name);
    expect(tables).toContain('assets');
    expect(tables).toContain('audit_log');
  });

  it('enforces the unique constraint on (category, serial_or_key)', () => {
    db.prepare(`INSERT INTO assets (id, category, name, serial_or_key) VALUES ('a','hardware','A','X')`).run();
    expect(() => db.prepare(`INSERT INTO assets (id, category, name, serial_or_key) VALUES ('b','hardware','B','X')`).run()).toThrow(/UNIQUE constraint/);
  });

  it('records audit entries with timestamps', () => {
    db.prepare(`INSERT INTO assets (id, category, name, serial_or_key) VALUES ('c','software-license','C','Y')`).run();
    db.prepare(`INSERT INTO audit_log (asset_id, action, description) VALUES ('c', 'create', 'created')`).run();
    const row = db.prepare(`SELECT * FROM audit_log WHERE asset_id = 'c'`).get();
    expect(row.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});