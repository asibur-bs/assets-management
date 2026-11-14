'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const Database = require('better-sqlite3');
const { openDatabase } = require('../../src/db');
const { applyMigrations, MIGRATIONS } = require('../../src/db/migrate');
const { AUDIT_ACTIONS, BACKFILL_ACTOR } = require('../../src/domain/vocabulary');

const DATA_DIR = path.resolve(__dirname, '../../data');

const ASSETS = [
  {
    id: 'asset-1',
    category: 'hardware',
    name: 'Laptop',
    serial_or_key: 'Sn-100',
    model: 'T14',
    notes: 'dock',
    status: 'assigned',
    assigned_to: 'Dana Reyes',
    assigned_at: '2024-02-03T04:05:06.007Z',
    returned_at: null,
    created_at: '2024-01-02T03:04:05.006Z',
    updated_at: '2024-02-03T04:05:06.007Z',
  },
  {
    id: 'asset-2',
    category: 'software-license',
    name: 'Editor',
    serial_or_key: 'LIC-200',
    model: null,
    notes: null,
    status: 'in-stock',
    assigned_to: null,
    assigned_at: null,
    returned_at: null,
    created_at: '2024-03-04T05:06:07.008Z',
    updated_at: '2024-03-04T05:06:07.008Z',
  },
];

const AUDIT = [
  {
    id: 1,
    asset_id: 'asset-1',
    action: 'create',
    description: 'created hardware',
    created_at: '2024-01-02T03:04:05.006Z',
  },
  {
    id: 2,
    asset_id: 'asset-1',
    action: 'assign',
    description: 'assigned to Dana Reyes',
    created_at: '2024-02-03T04:05:06.007Z',
  },
  {
    id: 3,
    asset_id: 'asset-2',
    action: 'create',
    description: 'created license',
    created_at: '2024-03-04T05:06:07.008Z',
  },
];

// Case fold and surrounding U+0020 are the only differences. LOWER(TRIM())
// maps both serials to the same key inside one category.
const CASE_VARIANT_ASSETS = [
  {
    id: 'cv-1',
    category: 'hardware',
    name: 'Case',
    serial_or_key: 'AbC',
    model: null,
    notes: null,
    status: 'in-stock',
    assigned_to: null,
    assigned_at: null,
    returned_at: null,
    created_at: '2024-04-05T06:07:08.009Z',
    updated_at: '2024-04-05T06:07:08.009Z',
  },
  {
    id: 'cv-2',
    category: 'hardware',
    name: 'Spaced',
    serial_or_key: ' abc ',
    model: null,
    notes: null,
    status: 'returned',
    assigned_to: null,
    assigned_at: null,
    returned_at: '2024-05-06T07:08:09.010Z',
    created_at: '2024-05-06T07:08:09.010Z',
    updated_at: '2024-05-06T07:08:09.010Z',
  },
];

const CASE_VARIANT_AUDIT = [
  {
    id: 11,
    asset_id: 'cv-1',
    action: 'create',
    description: 'created case-variant',
    created_at: '2024-04-05T06:07:08.009Z',
  },
  {
    id: 12,
    asset_id: 'cv-2',
    action: 'create',
    description: 'created spaced serial',
    created_at: '2024-05-06T07:08:09.010Z',
  },
];

function migrateThroughVersion2(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    );
  `);
  const applied = new Set(
    db
      .prepare('SELECT version FROM schema_migrations')
      .all()
      .map((row) => row.version)
  );
  for (const migration of MIGRATIONS) {
    if (migration.version > 2) continue;
    if (applied.has(migration.version)) continue;
    const run = db.transaction(() => {
      migration.up(db);
      db.prepare('INSERT INTO schema_migrations (version, name) VALUES (?, ?)').run(migration.version, migration.name);
    });
    run();
  }
}

function seedAssets(db, rows) {
  const insert = db.prepare(`
    INSERT INTO assets (
      id, category, name, serial_or_key, model, notes, status, assigned_to,
      assigned_at, returned_at, created_at, updated_at
    ) VALUES (
      @id, @category, @name, @serial_or_key, @model, @notes, @status, @assigned_to,
      @assigned_at, @returned_at, @created_at, @updated_at
    )
  `);
  for (const row of rows) insert.run(row);
}

function seedAudit(db, rows) {
  const insert = db.prepare(`
    INSERT INTO audit_log (id, asset_id, action, description, created_at)
    VALUES (@id, @asset_id, @action, @description, @created_at)
  `);
  for (const row of rows) insert.run(row);
}

function auditHistory(db) {
  return db.prepare('SELECT id, asset_id, action, description, created_at FROM audit_log ORDER BY id').all();
}

describe('foundation schema rebuild', () => {
  const cleanups = [];

  afterEach(() => {
    while (cleanups.length > 0) cleanups.pop()();
  });

  function temporaryDatabase() {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'u1-foundation-'));
    const file = path.join(dir, 'foundation.sqlite');
    if (path.resolve(file).startsWith(`${DATA_DIR}${path.sep}`)) {
      throw new Error('refusing to create a database under data/');
    }
    let db = null;
    cleanups.push(() => {
      if (db && db.open) db.close();
      fs.rmSync(dir, { recursive: true, force: true });
    });
    return {
      file,
      own(next) {
        if (db && db.open) db.close();
        db = next;
        return db;
      },
    };
  }

  function prepareVersion2(assetRows, auditRows) {
    const fixture = temporaryDatabase();
    const setup = fixture.own(new Database(fixture.file));
    migrateThroughVersion2(setup);
    seedAssets(setup, assetRows);
    seedAudit(setup, auditRows);
    fixture.own(null);
    return fixture;
  }

  function openMigrated(fixture) {
    const db = fixture.own(openDatabase(fixture.file));
    const version = db.prepare('SELECT name FROM schema_migrations WHERE version = 3').get();
    expect(version, 'version 3 foundation-rebuild does not exist yet').toBeTruthy();
    expect(version.name).toBe('foundation-rebuild');
    return db;
  }

  it('preserves audit row count and the original history columns (FR2.1)', () => {
    const db = openMigrated(prepareVersion2(ASSETS, AUDIT));
    expect(auditHistory(db)).toEqual(AUDIT);
  });

  it('backfills every actor to system and keeps the pre-MVP rows (FR2.1)', () => {
    const db = openMigrated(prepareVersion2(ASSETS, AUDIT));
    const rows = db.prepare('SELECT id, actor FROM audit_log ORDER BY id').all();
    expect(rows).toEqual(AUDIT.map((row) => ({ id: row.id, actor: BACKFILL_ACTOR })));
    expect(BACKFILL_ACTOR).toBe('system');
  });

  it('copies last_assigned_to as null and accepts discarded (FR3.1)', () => {
    const db = openMigrated(prepareVersion2(ASSETS, AUDIT));
    const columns = db
      .prepare('PRAGMA table_info(assets)')
      .all()
      .map((column) => column.name);
    expect(columns).toContain('last_assigned_to');
    const copied = db
      .prepare('SELECT id, serial_or_key, status, assigned_to, last_assigned_to FROM assets ORDER BY id')
      .all();
    expect(copied).toEqual([
      {
        id: 'asset-1',
        serial_or_key: 'Sn-100',
        status: 'assigned',
        assigned_to: 'Dana Reyes',
        last_assigned_to: null,
      },
      {
        id: 'asset-2',
        serial_or_key: 'LIC-200',
        status: 'in-stock',
        assigned_to: null,
        last_assigned_to: null,
      },
    ]);

    db.prepare(`UPDATE assets SET status = 'discarded' WHERE id = 'asset-1'`).run();
    expect(db.prepare(`SELECT status FROM assets WHERE id = 'asset-1'`).get().status).toBe('discarded');

    const ddl = db.prepare(`SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'assets'`).get().sql;
    expect(ddl).toContain("'discarded'");
    expect(ddl).not.toContain('UNIQUE (category, serial_or_key)');
  });

  it('reissues the lookup indexes and adds the case-insensitive serial index (FR1.4)', () => {
    const db = openMigrated(prepareVersion2(ASSETS, AUDIT));
    const assetIndexes = db.prepare('PRAGMA index_list(assets)').all();
    const assetNames = assetIndexes.map((index) => index.name);
    expect(assetNames).toEqual(
      expect.arrayContaining(['idx_assets_status', 'idx_assets_category', 'idx_assets_serial_ci'])
    );
    const serial = assetIndexes.find((index) => index.name === 'idx_assets_serial_ci');
    expect(serial.unique).toBe(1);

    const auditNames = db
      .prepare('PRAGMA index_list(audit_log)')
      .all()
      .map((index) => index.name);
    expect(auditNames).toContain('idx_audit_asset_recent');

    const ddl = db.prepare(`SELECT sql FROM sqlite_master WHERE name = 'idx_assets_serial_ci'`).get().sql;
    expect(ddl).toContain('category');
    expect(ddl).toContain('LOWER(TRIM(serial_or_key))');
  });

  it('aborts audit updates and deletes and leaves foreign keys on (FR2.7)', () => {
    const db = openMigrated(prepareVersion2(ASSETS, AUDIT));
    const before = auditHistory(db);
    let updateError;
    try {
      db.prepare(`UPDATE audit_log SET description = 'rewritten' WHERE id = 1`).run();
    } catch (err) {
      updateError = err;
    }
    let deleteError;
    try {
      db.prepare('DELETE FROM audit_log WHERE id = 1').run();
    } catch (err) {
      deleteError = err;
    }
    expect(updateError.code).toBe('SQLITE_CONSTRAINT_TRIGGER');
    expect(deleteError.code).toBe('SQLITE_CONSTRAINT_TRIGGER');
    expect(db.pragma('foreign_keys', { simple: true })).toBe(1);
    expect(auditHistory(db)).toEqual(before);
  });

  it('rolls back when serials differ only by ASCII case or surrounding spaces (FR1.4)', () => {
    const fixture = temporaryDatabase();
    const db = fixture.own(new Database(fixture.file));
    migrateThroughVersion2(db);
    seedAssets(db, CASE_VARIANT_ASSETS);
    seedAudit(db, CASE_VARIANT_AUDIT);
    const assetsBefore = db.prepare('SELECT * FROM assets ORDER BY id').all();
    const auditBefore = db.prepare('SELECT * FROM audit_log ORDER BY id').all();

    let thrown;
    try {
      applyMigrations(db);
    } catch (err) {
      thrown = err;
    }

    expect(thrown, 'version 3 must reject the case-variant serial pair').toBeTruthy();
    expect(thrown.code).toBe('SQLITE_CONSTRAINT_UNIQUE');
    expect(thrown.message).toContain('cv-1');
    expect(thrown.message).toContain('cv-2');
    expect(thrown.message).toContain('AbC');
    expect(thrown.message).toContain(' abc ');
    expect(db.prepare('SELECT * FROM assets ORDER BY id').all()).toEqual(assetsBefore);
    expect(db.prepare('SELECT * FROM audit_log ORDER BY id').all()).toEqual(auditBefore);
    expect(
      db
        .prepare('SELECT version FROM schema_migrations ORDER BY version')
        .all()
        .map((row) => row.version)
    ).toEqual([1, 2]);
  });

  it('does not delete copied audit rows when assets is dropped (FR2.7)', () => {
    const db = openMigrated(prepareVersion2(ASSETS, AUDIT));
    const foreignKeys = db.prepare('PRAGMA foreign_key_list(audit_log)').all();
    expect(foreignKeys).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          table: 'assets',
          from: 'asset_id',
          to: 'id',
          on_delete: 'NO ACTION',
        }),
      ])
    );
    const before = auditHistory(db);
    expect(before).toEqual(AUDIT);

    let deleteError;
    try {
      db.prepare('DELETE FROM assets WHERE id = ?').run('asset-1');
    } catch (err) {
      deleteError = err;
    }
    expect(deleteError).toBeTruthy();
    expect(deleteError.code).toBe('SQLITE_CONSTRAINT_FOREIGNKEY');
    expect(auditHistory(db)).toEqual(before);
    expect(db.prepare('SELECT id FROM assets WHERE id = ?').get('asset-1')).toEqual({ id: 'asset-1' });
  });

  it('accepts each released audit action and rejects any other (FR2.1)', () => {
    const db = openMigrated(prepareVersion2(ASSETS, AUDIT));
    const insert = db.prepare(
      `INSERT INTO audit_log (asset_id, action, description) VALUES (?, ?, ?)`
    );
    for (const action of AUDIT_ACTIONS) {
      insert.run('asset-1', action, `recorded ${action}`);
    }
    let rejected;
    try {
      insert.run('asset-1', 'not-an-action', 'outside the vocabulary');
    } catch (err) {
      rejected = err;
    }
    expect(rejected.code).toBe('SQLITE_CONSTRAINT_CHECK');
    expect(AUDIT_ACTIONS).toHaveLength(7);
  });

  it('accepts the repository audit insert that omits actor and stores system (FR2.1)', () => {
    const db = openMigrated(prepareVersion2(ASSETS, AUDIT));
    db.prepare(`INSERT INTO audit_log (asset_id, action, description) VALUES (?, ?, ?)`).run(
      'asset-1',
      'edit',
      'edited the name'
    );
    const stored = db.prepare(`SELECT actor FROM audit_log WHERE asset_id = ? AND action = ?`).get('asset-1', 'edit');
    expect(stored.actor).toBe('system');
    expect(stored.actor).toBe(BACKFILL_ACTOR);
  });
});
