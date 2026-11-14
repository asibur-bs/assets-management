'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { openDatabase } = require('../../src/db');

const DATA_DIR = path.resolve(__dirname, '../../data');

describe('database connection', () => {
  const cleanups = [];

  afterEach(() => {
    while (cleanups.length > 0) cleanups.pop()();
  });

  function temporaryFile() {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'u1-foundation-'));
    const file = path.join(dir, 'connection.sqlite');
    if (path.resolve(file).startsWith(`${DATA_DIR}${path.sep}`)) {
      throw new Error('refusing to create a database under data/');
    }
    let db = null;
    cleanups.push(() => {
      if (db && db.open) db.close();
      fs.rmSync(dir, { recursive: true, force: true });
    });
    return {
      dir,
      open(target = file) {
        db = openDatabase(target);
        return db;
      },
    };
  }

  it('sets busy_timeout to 5000 (FR1.6a)', () => {
    const db = temporaryFile().open();
    expect(db.pragma('busy_timeout', { simple: true })).toBe(5000);
  });

  it('sets journal_mode to wal', () => {
    const db = temporaryFile().open();
    expect(db.pragma('journal_mode', { simple: true })).toBe('wal');
  });

  it('leaves foreign_keys on after migrations', () => {
    const db = temporaryFile().open();
    expect(db.prepare(`SELECT name FROM schema_migrations WHERE version = 3`).get().name).toBe('foundation-rebuild');
    expect(db.pragma('foreign_keys', { simple: true })).toBe(1);
  });

  it('creates a missing parent directory for a file database', () => {
    const fixture = temporaryFile();
    const nested = path.join(fixture.dir, 'missing', 'nested', 'assets.sqlite');
    expect(fs.existsSync(path.dirname(nested))).toBe(false);
    const db = fixture.open(nested);
    expect(fs.existsSync(path.dirname(nested))).toBe(true);
    expect(db.open).toBe(true);
  });

  it('migrates an in-memory database through version 3', () => {
    const db = openDatabase(':memory:');
    cleanups.push(() => {
      if (db.open) db.close();
    });
    const applied = db.prepare('SELECT version, name FROM schema_migrations WHERE version = 3').get();
    expect(applied).toEqual({ version: 3, name: 'foundation-rebuild' });
    const assets = db
      .prepare('PRAGMA table_info(assets)')
      .all()
      .map((column) => column.name);
    const audit = db
      .prepare('PRAGMA table_info(audit_log)')
      .all()
      .map((column) => column.name);
    expect(assets).toContain('last_assigned_to');
    expect(audit).toContain('actor');
  });
});
