'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { openDatabase } = require('../src/db');
const repo = require('../src/repositories/assets-repo');
const { seedTwoAssets } = require('./helpers/seed');

const REPO_SOURCE = fs.readFileSync(path.join(__dirname, '../src/repositories/assets-repo.js'), 'utf8');

function catchError(fn) {
  try {
    fn();
  } catch (err) {
    return err;
  }
  throw new Error('expected the call to throw, but it did not');
}

function statementDb(onInsert) {
  return {
    prepare(sql) {
      const text = String(sql);
      if (text.includes('strftime')) {
        return { get: () => ({ ts: '2026-01-01T00:00:00.000Z' }) };
      }
      if (text.includes('INSERT INTO assets')) {
        return { run: onInsert };
      }
      return {
        get() {
          return undefined;
        },
        all() {
          return [];
        },
        run() {
          return { changes: 1 };
        },
      };
    },
  };
}

describe('assets repository', () => {
  let db;
  let dir;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'assets-repo-'));
    const filename = path.join(dir, 'test.sqlite');
    expect(path.resolve(filename).endsWith(`${path.sep}data${path.sep}assets.sqlite`)).toBe(false);
    db = openDatabase(filename);
  });

  afterEach(() => {
    if (db) {
      try {
        db.close();
      } catch {
        // The connection may already be closed.
      }
    }
    if (dir) fs.rmSync(dir, { recursive: true, force: true });
    db = undefined;
    dir = undefined;
  });

  it('creates an in-stock asset and returns it', () => {
    const asset = repo.createAsset(db, { category: 'hardware', name: 'ThinkPad', serialOrKey: 'TP-001' });
    expect(asset.name).toBe('ThinkPad');
    expect(asset.status).toBe('in-stock');
    expect(asset.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    expect(asset.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(asset.last_assigned_to).toBeNull();
    expect(db.prepare('SELECT COUNT(*) AS n FROM audit_log').get().n).toBe(0);
  });

  it('rejects an invalid category and a missing name', () => {
    const category = catchError(() => repo.createAsset(db, { category: 'chair', name: 'X', serialOrKey: 'A' }));
    expect(category.code).toBe('VALIDATION_ERROR');
    const name = catchError(() => repo.createAsset(db, { category: 'hardware', name: '   ', serialOrKey: 'A' }));
    expect(name.code).toBe('VALIDATION_ERROR');
    expect(db.prepare('SELECT COUNT(*) AS n FROM assets').get().n).toBe(0);
  });

  it('always persists a new asset as in-stock, assignee or not', () => {
    const withAssignee = repo.createAsset(db, {
      category: 'hardware',
      name: 'A',
      serialOrKey: 'X',
      assignedTo: '  Alice  ',
      status: 'assigned',
    });
    expect(withAssignee.status).toBe('in-stock');
    expect(withAssignee.assigned_to).toBe('Alice');
    expect(withAssignee.assigned_at).toBeNull();
    expect(withAssignee.last_assigned_to).toBeNull();
    const blank = repo.createAsset(db, {
      category: 'hardware',
      name: 'B',
      serialOrKey: 'Y',
      assignedTo: '   ',
    });
    expect(blank.assigned_to).toBeNull();
    expect(blank.status).toBe('in-stock');
  });

  it('detects a duplicate serial in the same category after case and space folding', () => {
    repo.createAsset(db, { category: 'hardware', name: 'A', serialOrKey: 'AbC' });
    const err = catchError(() => repo.createAsset(db, { category: 'hardware', name: 'B', serialOrKey: '  abc  ' }));
    expect(err.code).toBe('DUPLICATE_ASSET');
    expect(err.message).not.toMatch(/UNIQUE constraint failed/);
    expect(db.prepare('SELECT COUNT(*) AS n FROM assets').get().n).toBe(1);
  });

  it('allows the same serial-or-key under a different category', () => {
    repo.createAsset(db, { category: 'hardware', name: 'A', serialOrKey: 'X' });
    const other = repo.createAsset(db, { category: 'software-license', name: 'B', serialOrKey: '  x ' });
    expect(other.category).toBe('software-license');
  });

  it('excludes the current id when the same asset keeps its serial', () => {
    const asset = repo.createAsset(db, { category: 'hardware', name: 'A', serialOrKey: 'abc' });
    const other = repo.createAsset(db, { category: 'hardware', name: 'B', serialOrKey: 'other' });
    const renamed = repo.updateAsset(db, asset.id, { serial_or_key: '  ABC  ', name: 'A2' });
    expect(renamed.serial_or_key).toBe('  ABC  ');
    expect(renamed.name).toBe('A2');
    const err = catchError(() => repo.updateAsset(db, other.id, { serial_or_key: 'abc' }));
    expect(err.code).toBe('DUPLICATE_ASSET');
    expect(repo.getAsset(db, other.id).serial_or_key).toBe('other');
  });

  it('maps a blinded unique-index failure by driver code', () => {
    repo.createAsset(db, { category: 'hardware', name: 'A', serialOrKey: 'Serial-1' });
    const original = db.prepare.bind(db);
    let hidden = 0;
    db.prepare = (sql) => {
      const stmt = original(sql);
      if (String(sql).includes('LOWER(TRIM(serial_or_key))')) {
        hidden += 1;
        return {
          get() {
            return undefined;
          },
          all() {
            return [];
          },
          run(...args) {
            return stmt.run(...args);
          },
        };
      }
      return stmt;
    };
    try {
      const err = catchError(() =>
        repo.createAsset(db, { category: 'hardware', name: 'B', serialOrKey: '  serial-1 ' })
      );
      expect(hidden).toBeGreaterThan(0);
      expect(err.code).toBe('DUPLICATE_ASSET');
      expect(err.message).not.toMatch(/UNIQUE constraint failed/);
    } finally {
      delete db.prepare;
    }
    expect(db.prepare('SELECT COUNT(*) AS n FROM assets').get().n).toBe(1);
  });

  it('maps SQLITE_CONSTRAINT_UNIQUE by code even when the message does not mention it', () => {
    const err = catchError(() =>
      repo.createAsset(
        statementDb(() => {
          const failure = new Error('nope');
          failure.code = 'SQLITE_CONSTRAINT_UNIQUE';
          throw failure;
        }),
        { category: 'hardware', name: 'A', serialOrKey: 'X' }
      )
    );
    expect(err.code).toBe('DUPLICATE_ASSET');
    expect(err.message).not.toMatch(/nope/);
  });

  it('does not treat a UNIQUE message with a different driver code as a duplicate', () => {
    const err = catchError(() =>
      repo.createAsset(
        statementDb(() => {
          const failure = new Error('UNIQUE constraint failed: assets.serial_or_key');
          failure.code = 'SQLITE_CONSTRAINT';
          throw failure;
        }),
        { category: 'hardware', name: 'A', serialOrKey: 'X' }
      )
    );
    expect(err.code).toBe('SQLITE_CONSTRAINT');
  });

  it('maps SQLITE_BUSY by code and leaves other lock wording unchanged', () => {
    const busy = catchError(() =>
      repo.createAsset(
        statementDb(() => {
          const failure = new Error('nope');
          failure.code = 'SQLITE_BUSY';
          throw failure;
        }),
        { category: 'hardware', name: 'A', serialOrKey: 'X' }
      )
    );
    expect(busy.code).toBe('BUSY_RETRYABLE');

    const other = catchError(() =>
      repo.createAsset(
        statementDb(() => {
          const failure = new Error('database is locked');
          failure.code = 'SQLITE_ERROR';
          throw failure;
        }),
        { category: 'hardware', name: 'A', serialOrKey: 'Y' }
      )
    );
    expect(other.code).toBe('SQLITE_ERROR');
  });

  it('lists assets with text search on the name and the serial', () => {
    repo.createAsset(db, { category: 'hardware', name: 'ThinkPad', serialOrKey: 'TP-001' });
    repo.createAsset(db, { category: 'hardware', name: 'MacBook', serialOrKey: 'MB-002' });
    const byName = repo.listAssets(db, { q: 'think' });
    expect(byName).toHaveLength(1);
    expect(byName[0].name).toBe('ThinkPad');
    const bySerial = repo.listAssets(db, { q: 'mb-002' });
    expect(bySerial).toHaveLength(1);
    expect(bySerial[0].name).toBe('MacBook');
  });

  it('lists assets with a category filter and a discarded status filter', () => {
    repo.createAsset(db, { category: 'hardware', name: 'A', serialOrKey: 'A' });
    const license = repo.createAsset(db, { category: 'software-license', name: 'B', serialOrKey: 'B' });
    const discarded = repo.updateAsset(db, license.id, { status: 'discarded' });
    expect(discarded.status).toBe('discarded');
    const byCategory = repo.listAssets(db, { category: 'software-license' });
    expect(byCategory).toHaveLength(1);
    expect(byCategory[0].category).toBe('software-license');
    const byStatus = repo.listAssets(db, { status: 'discarded' });
    expect(byStatus).toHaveLength(1);
    expect(byStatus[0].name).toBe('B');
    const ignored = repo.listAssets(db, { status: "discarded' OR '1'='1", sort: 'name; DROP TABLE assets' });
    expect(ignored).toHaveLength(2);
    expect(repo.ALLOWED_STATUSES.has('discarded')).toBe(true);
  });

  it('sorts by name and by creation date using whitelisted columns only', () => {
    repo.createAsset(db, { category: 'hardware', name: 'Zebra', serialOrKey: 'Z' });
    repo.createAsset(db, { category: 'hardware', name: 'Apple', serialOrKey: 'A' });
    const byName = repo.listAssets(db, { sort: 'name' });
    expect(byName[0].name).toBe('Apple');
    const desc = repo.listAssets(db, { sort: 'name', dir: 'desc' });
    expect(desc[0].name).toBe('Zebra');
    const byDate = repo.listAssets(db, { sort: 'created_at', dir: 'desc; DELETE FROM assets' });
    expect(byDate).toHaveLength(2);
    expect(db.prepare('SELECT COUNT(*) AS n FROM assets').get().n).toBe(2);
  });

  it('persists holder columns and lifecycle timestamps without copying one holder into the other', () => {
    const asset = repo.createAsset(db, { category: 'hardware', name: 'A', serialOrKey: 'X' });
    const assigned = repo.updateAsset(db, asset.id, {
      status: 'assigned',
      assigned_to: 'Bob',
      assigned_at: '2026-01-01T00:00:00.000Z',
      last_assigned_to: null,
    });
    expect(assigned.assigned_to).toBe('Bob');
    expect(assigned.assigned_at).toBe('2026-01-01T00:00:00.000Z');
    expect(assigned.last_assigned_to).toBeNull();
    const returned = repo.updateAsset(db, asset.id, {
      status: 'returned',
      assigned_to: null,
      returned_at: '2026-01-02T00:00:00.000Z',
      last_assigned_to: 'Bob',
    });
    expect(returned.returned_at).toBe('2026-01-02T00:00:00.000Z');
    expect(returned.assigned_to).toBeNull();
    expect(returned.last_assigned_to).toBe('Bob');
    expect(returned.assigned_at).toBe('2026-01-01T00:00:00.000Z');
    const noted = repo.updateAsset(db, asset.id, { notes: 'kept' });
    expect(noted.notes).toBe('kept');
    expect(noted.last_assigned_to).toBe('Bob');
    expect(noted.assigned_to).toBeNull();
  });

  it('raises NOT_FOUND when updating an unknown asset', () => {
    const err = catchError(() => repo.updateAsset(db, 'missing', { status: 'assigned' }));
    expect(err.code).toBe('NOT_FOUND');
  });

  it('records the actor on each audit row and returns the newest entry first', () => {
    const asset = repo.createAsset(db, { category: 'hardware', name: 'A', serialOrKey: 'X' });
    repo.recordAudit(db, asset.id, 'create', 'first', 'Ada');
    repo.recordAudit(db, asset.id, 'assign', 'second', 'Grace');
    const latest = repo.latestAuditFor(db, asset.id);
    expect(latest.action).toBe('assign');
    expect(latest.actor).toBe('Grace');
    expect(latest.description).toBe('second');
    const history = repo.listAudit(db, asset.id);
    expect(history.map((row) => row.action)).toEqual(['assign', 'create']);
    expect(history[0].actor).toBe('Grace');
    expect(history[1].actor).toBe('Ada');
    const missingActor = catchError(() => repo.recordAudit(db, asset.id, 'edit', 'third', ''));
    expect(missingActor.code).toBe('VALIDATION_ERROR');
    expect(repo.listAudit(db, asset.id)).toHaveLength(2);
  });

  it('previews a collision with no write lock and no write', () => {
    const asset = repo.createAsset(db, { category: 'hardware', name: 'A', serialOrKey: 'AbC' });
    const original = db.transaction.bind(db);
    let calls = 0;
    db.transaction = (fn) => {
      calls += 1;
      return original(fn);
    };
    try {
      const hit = repo.previewSerialCollision(db, { category: 'hardware', serialOrKey: '  abc ' });
      const excluded = repo.previewSerialCollision(db, {
        category: 'hardware',
        serialOrKey: 'abc',
        excludeId: asset.id,
      });
      const other = repo.previewSerialCollision(db, { category: 'software-license', serialOrKey: 'abc' });
      const blank = repo.previewSerialCollision(db, { category: 'hardware', serialOrKey: null });
      expect(hit).toEqual({ collision: true, existingAsset: expect.objectContaining({ id: asset.id }) });
      expect(excluded).toEqual({ collision: false, existingAsset: null });
      expect(other.collision).toBe(false);
      expect(blank.collision).toBe(false);
      expect(calls).toBe(0);
      expect(db.prepare('SELECT COUNT(*) AS n FROM assets').get().n).toBe(1);
    } finally {
      delete db.transaction;
    }
  });

  it('keeps state consistent across a burst of writes', () => {
    const { hardware } = seedTwoAssets(db);
    for (let i = 0; i < 25; i += 1) {
      repo.updateAsset(db, hardware.id, { notes: `edit-${i}` });
    }
    const rows = repo.listAssets(db, {});
    expect(rows).toHaveLength(2);
    expect(repo.getAsset(db, hardware.id).notes).toBe('edit-24');
  });

  it('uses prepared statements, the shared serial expression, and code-only driver mapping', () => {
    expect(REPO_SOURCE).toContain('normalizeSerialOrKey');
    expect(REPO_SOURCE).toContain('SERIAL_OR_KEY_INDEX_EXPRESSION');
    expect(REPO_SOURCE).toContain('INSERT INTO audit_log (asset_id, action, description, actor)');
    expect(REPO_SOURCE).toContain("code === 'SQLITE_CONSTRAINT_UNIQUE'");
    expect(REPO_SOURCE).toContain("code === 'SQLITE_BUSY'");
    expect(REPO_SOURCE).not.toMatch(/\.message/);
    expect(REPO_SOURCE).not.toMatch(/UNIQUE constraint failed/);
    expect(REPO_SOURCE).not.toMatch(/DELETE\s+FROM/i);
    expect(REPO_SOURCE).not.toMatch(/\.exec\(/);
  });
});
