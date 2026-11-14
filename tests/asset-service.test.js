'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { openDatabase } = require('../src/db');
const service = require('../src/services/asset-service');
const repo = require('../src/repositories/assets-repo');
const { seedTwoAssets } = require('./helpers/seed');
const { STATUS_VALUES, TRANSITION_EDGES } = require('../src/domain/vocabulary');

const SERVICE_SOURCE = fs.readFileSync(path.join(__dirname, '../src/services/asset-service.js'), 'utf8');

function catchError(fn) {
  try {
    fn();
  } catch (err) {
    return err;
  }
  throw new Error('expected the call to throw, but it did not');
}

function audits(database, id) {
  return database
    .prepare(
      `SELECT id, action, description, actor
         FROM audit_log
        WHERE asset_id = ?
        ORDER BY id ASC`
    )
    .all(id);
}

function countRows(database, table) {
  return database.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n;
}

function countImmediateCalls(database, run) {
  const original = database.transaction.bind(database);
  const calls = [];
  database.transaction = (fn) => {
    const wrapped = original(fn);
    const realImmediate = wrapped.immediate;
    return {
      immediate(...args) {
        calls.push('immediate');
        return realImmediate.apply(wrapped, args);
      },
    };
  };
  try {
    return { result: run(), calls };
  } finally {
    delete database.transaction;
  }
}

function hideSerialLookup(database) {
  const original = database.prepare.bind(database);
  const state = { hidden: 0 };
  database.prepare = (sql) => {
    const stmt = original(sql);
    if (String(sql).includes('LOWER(TRIM(serial_or_key))')) {
      state.hidden += 1;
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
  return {
    state,
    restore() {
      delete database.prepare;
    },
  };
}

function spawnNode(scriptPath, args) {
  return spawn(process.execPath, [scriptPath, ...args], {
    cwd: path.join(__dirname, '..'),
    env: process.env,
    stdio: ['pipe', 'pipe', 'pipe'],
  });
}

function collectChild(child) {
  return new Promise((resolve, reject) => {
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error(`child timed out: ${stderr}`));
    }, 8000);
    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.once('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
    child.once('exit', (code) => {
      clearTimeout(timer);
      resolve({ code, stdout, stderr });
    });
  });
}

function registerInput(serial, extras = {}) {
  return {
    category: 'hardware',
    name: 'A',
    serialOrKey: serial,
    ...extras,
  };
}

describe('asset service write path', () => {
  let db;
  let dir;
  let filename;
  const originalActor = Object.prototype.hasOwnProperty.call(process.env, 'ASSET_ACTOR')
    ? process.env.ASSET_ACTOR
    : undefined;

  beforeEach(() => {
    process.env.ASSET_ACTOR = 'Ada';
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'assets-svc-'));
    filename = path.join(dir, 'test.sqlite');
    expect(path.resolve(filename).endsWith(`${path.sep}data${path.sep}assets.sqlite`)).toBe(false);
    db = openDatabase(filename);
  });

  afterEach(() => {
    if (originalActor === undefined) delete process.env.ASSET_ACTOR;
    else process.env.ASSET_ACTOR = originalActor;
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

  it('registers an in-stock asset, stamps it, and appends one create audit', () => {
    const asset = service.registerAsset(db, registerInput('X', { model: 'M1', notes: 'n1' }));
    expect(asset.status).toBe('in-stock');
    expect(asset.assigned_to).toBeNull();
    expect(asset.last_assigned_to).toBeNull();
    expect(asset.assigned_at).toBeNull();
    expect(asset.returned_at).toBeNull();
    expect(asset.model).toBe('M1');
    expect(asset.notes).toBe('n1');
    expect(asset.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    expect(asset.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(asset.updated_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    const rows = audits(db, asset.id);
    expect(rows).toHaveLength(1);
    expect(rows[0].action).toBe('create');
    expect(rows[0].actor).toBe('Ada');
    expect(rows[0].description).toContain('A');
    expect(rows[0].description).toContain('hardware');
    expect(rows[0].description).toContain('X');
  });

  it('stores an optional assignee without leaving in-stock and still writes one create audit', () => {
    const asset = service.registerAsset(
      db,
      registerInput('X', { assignedTo: '  Alice  ', status: 'assigned', actor: 'Mallory' })
    );
    expect(asset.status).toBe('in-stock');
    expect(asset.assigned_to).toBe('Alice');
    expect(asset.assigned_at).toBeNull();
    expect(asset.last_assigned_to).toBeNull();
    const rows = audits(db, asset.id);
    expect(rows).toHaveLength(1);
    expect(rows[0].actor).toBe('Ada');
    expect(rows[0].description).not.toContain('Mallory');
  });

  it('stores a blank assignee as null', () => {
    const asset = service.registerAsset(db, registerInput('X', { assignedTo: '   ' }));
    expect(asset.assigned_to).toBeNull();
    expect(asset.status).toBe('in-stock');
  });

  it('uses the server actor when ASSET_ACTOR is unset and ignores a supplied actor', () => {
    delete process.env.ASSET_ACTOR;
    const asset = service.registerAsset(db, registerInput('X', { actor: 'Mallory' }));
    expect(audits(db, asset.id)[0].actor).toBe('system');
    expect(audits(db, asset.id)[0].description).not.toContain('Mallory');
  });

  it('rejects an invalid registration before opening a transaction', () => {
    const fake = {
      transaction() {
        throw new Error('transaction was started');
      },
    };
    const err = catchError(() => service.registerAsset(fake, { category: 'chair', name: ' ', serialOrKey: '' }));
    expect(err.code).toBe('VALIDATION_ERROR');
  });

  it('refuses a duplicate serial inside the category, including case and surrounding spaces', () => {
    service.registerAsset(db, registerInput('AbC'));
    const err = catchError(() => service.registerAsset(db, registerInput('  abc  ', { name: 'B' })));
    expect(err.code).toBe('DUPLICATE_ASSET');
    expect(err.message).not.toMatch(/UNIQUE constraint failed/);
    expect(countRows(db, 'assets')).toBe(1);
    expect(countRows(db, 'audit_log')).toBe(1);
  });

  it('allows the same serial under a different category', () => {
    service.registerAsset(db, registerInput('X'));
    const other = service.registerAsset(db, {
      category: 'software-license',
      name: 'B',
      serialOrKey: '  x  ',
    });
    expect(other.category).toBe('software-license');
    expect(other.status).toBe('in-stock');
    expect(countRows(db, 'audit_log')).toBe(2);
  });

  it('maps a unique-index rejection to DUPLICATE_ASSET when the lookup is blind', () => {
    service.registerAsset(db, registerInput('Serial-1'));
    const hidden = hideSerialLookup(db);
    try {
      const err = catchError(() => service.registerAsset(db, registerInput('  serial-1  ', { name: 'B' })));
      expect(hidden.state.hidden).toBeGreaterThan(0);
      expect(err.code).toBe('DUPLICATE_ASSET');
      expect(err.message).not.toMatch(/UNIQUE constraint failed/);
    } finally {
      hidden.restore();
    }
    expect(countRows(db, 'assets')).toBe(1);
    expect(countRows(db, 'audit_log')).toBe(1);
  });

  it('rolls the asset insert back when the audit append fails', () => {
    const original = repo.recordAudit;
    try {
      repo.recordAudit = () => {
        throw new Error('audit failed');
      };
      const err = catchError(() => service.registerAsset(db, registerInput('X')));
      expect(err.message).toBe('audit failed');
    } finally {
      repo.recordAudit = original;
    }
    expect(countRows(db, 'assets')).toBe(0);
    expect(countRows(db, 'audit_log')).toBe(0);
  });

  it('runs each mutating write in one immediate transaction', () => {
    const created = countImmediateCalls(db, () => service.registerAsset(db, registerInput('X')));
    expect(created.calls).toEqual(['immediate']);
    const same = countImmediateCalls(db, () =>
      service.editAsset(db, created.result.id, { name: 'A', notes: null, actor: 'Mallory' })
    );
    expect(same.calls).toEqual(['immediate']);
    expect(audits(db, created.result.id)).toHaveLength(1);
    expect(same.result.updated_at).toBe(created.result.updated_at);
    const moved = countImmediateCalls(db, () =>
      service.transitionAsset(db, created.result.id, { to: 'assigned', assignee: 'Bob', actor: 'Mallory' })
    );
    expect(moved.calls).toEqual(['immediate']);
    expect(audits(db, created.result.id)).toHaveLength(2);
    expect(audits(db, created.result.id)[1].actor).toBe('Ada');
  });

  it('previews a serial collision without a transaction or a write', () => {
    const asset = service.registerAsset(db, registerInput('AbC'));
    const original = db.transaction.bind(db);
    let calls = 0;
    db.transaction = (fn) => {
      calls += 1;
      return original(fn);
    };
    try {
      const hit = service.previewSerialCollision(db, { category: 'hardware', serialOrKey: '  abc  ' });
      const self = service.previewSerialCollision(db, {
        category: 'hardware',
        serialOrKey: 'ABC',
        excludeId: asset.id,
      });
      const otherCategory = service.previewSerialCollision(db, {
        category: 'software-license',
        serialOrKey: 'abc',
      });
      expect(hit.collision).toBe(true);
      expect(hit.existingAsset.id).toBe(asset.id);
      expect(self.collision).toBe(false);
      expect(self.existingAsset).toBeNull();
      expect(otherCategory.collision).toBe(false);
      expect(calls).toBe(0);
      expect(countRows(db, 'assets')).toBe(1);
      expect(countRows(db, 'audit_log')).toBe(1);
    } finally {
      delete db.transaction;
    }
  });

  it('edits only the editable fields and appends one edit audit naming previous values', () => {
    const asset = service.registerAsset(db, registerInput('X', { model: 'Old', notes: 'first' }));
    const createdAudit = audits(db, asset.id)[0];
    const updated = service.editAsset(db, asset.id, {
      name: 'Renamed',
      notes: 'second',
      status: 'lost',
      assigned_to: 'Eve',
      last_assigned_to: 'Eve',
      actor: 'Mallory',
    });
    expect(updated.name).toBe('Renamed');
    expect(updated.notes).toBe('second');
    expect(updated.model).toBe('Old');
    expect(updated.status).toBe('in-stock');
    expect(updated.assigned_to).toBeNull();
    expect(updated.last_assigned_to).toBeNull();
    expect(updated.category).toBe('hardware');
    const rows = audits(db, asset.id);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual(createdAudit);
    expect(rows[1].action).toBe('edit');
    expect(rows[1].actor).toBe('Ada');
    expect(rows[1].description).toContain('name from "A" to "Renamed"');
    expect(rows[1].description).toContain('notes from "first" to "second"');
    expect(rows[1].description).not.toContain('Mallory');
    expect(rows[1].description).not.toContain('status');
  });

  it('appends no edit audit and does not touch updated_at when nothing changed', () => {
    const asset = service.registerAsset(db, registerInput('X'));
    const again = service.editAsset(db, asset.id, {
      name: 'A',
      category: 'hardware',
      serialOrKey: 'X',
      status: 'discarded',
      actor: 'Mallory',
    });
    expect(again.updated_at).toBe(asset.updated_at);
    expect(again.status).toBe('in-stock');
    expect(audits(db, asset.id)).toHaveLength(1);
  });

  it('returns NOT_FOUND when editing a missing asset and writes nothing', () => {
    const err = catchError(() => service.editAsset(db, 'missing', { name: 'B' }));
    expect(err.code).toBe('NOT_FOUND');
    expect(countRows(db, 'assets')).toBe(0);
    expect(countRows(db, 'audit_log')).toBe(0);
  });

  it('rejects an edit that clears the name', () => {
    const asset = service.registerAsset(db, registerInput('X'));
    const err = catchError(() => service.editAsset(db, asset.id, { name: '   ' }));
    expect(err.code).toBe('VALIDATION_ERROR');
    expect(repo.getAsset(db, asset.id).name).toBe('A');
    expect(audits(db, asset.id)).toHaveLength(1);
  });

  it('applies uniqueness to an edit, excluding the row itself and using the new category', () => {
    const hardware = service.registerAsset(db, registerInput('ABC'));
    const software = service.registerAsset(db, {
      category: 'software-license',
      name: 'Lic',
      serialOrKey: 'ABC',
    });
    const renamed = service.editAsset(db, hardware.id, { serialOrKey: '  abc  ' });
    expect(renamed.serial_or_key).toBe('  abc  ');
    const clash = catchError(() => service.editAsset(db, software.id, { category: 'hardware' }));
    expect(clash.code).toBe('DUPLICATE_ASSET');
    expect(repo.getAsset(db, software.id).category).toBe('software-license');
    const moved = service.editAsset(db, software.id, { category: 'hardware', serialOrKey: 'OTHER' });
    expect(moved.category).toBe('hardware');
    expect(moved.serial_or_key).toBe('OTHER');
    expect(audits(db, software.id).at(-1).action).toBe('edit');
    expect(audits(db, software.id).at(-1).description).toContain('category from "software-license" to "hardware"');
    expect(audits(db, software.id).at(-1).description).toContain('serialOrKey from "ABC" to "OTHER"');
  });

  it('assigns, returns, and assigns again with holder columns and one audit each', async () => {
    const asset = service.registerAsset(db, registerInput('X'));
    const before = asset.updated_at;
    await new Promise((resolve) => setTimeout(resolve, 20));
    const assigned = service.transitionAsset(db, asset.id, {
      to: 'assigned',
      assignee: '  Bob  ',
      actor: 'Mallory',
    });
    expect(assigned.status).toBe('assigned');
    expect(assigned.assigned_to).toBe('Bob');
    expect(assigned.assigned_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(assigned.returned_at).toBeNull();
    expect(assigned.last_assigned_to).toBeNull();
    expect(assigned.updated_at >= before).toBe(true);
    expect(assigned.updated_at).not.toBe(before);
    const assignAudit = audits(db, asset.id).at(-1);
    expect(assignAudit.action).toBe('assign');
    expect(assignAudit.description).toContain('Bob');
    expect(assignAudit.actor).toBe('Ada');

    const returned = service.transitionAsset(db, asset.id, { to: 'returned', reason: 'ignored' });
    expect(returned.status).toBe('returned');
    expect(returned.assigned_to).toBeNull();
    expect(returned.last_assigned_to).toBe('Bob');
    expect(returned.returned_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(returned.assigned_at).toBe(assigned.assigned_at);
    expect(audits(db, asset.id).at(-1).action).toBe('return');
    expect(audits(db, asset.id).at(-1).description).toContain('Bob');

    const again = service.transitionAsset(db, asset.id, { to: 'assigned', assignee: 'Carol' });
    expect(again.status).toBe('assigned');
    expect(again.assigned_to).toBe('Carol');
    expect(again.returned_at).toBeNull();
    expect(again.last_assigned_to).toBe('Bob');
    expect(again.assigned_at).not.toBeNull();
    expect(audits(db, asset.id)).toHaveLength(4);
  });

  it('requires a non-blank assignee for assign and writes nothing when it is missing', () => {
    const asset = service.registerAsset(db, registerInput('X'));
    const err = catchError(() => service.transitionAsset(db, asset.id, { to: 'assigned', assignee: '   ' }));
    expect(err.code).toBe('VALIDATION_ERROR');
    expect(repo.getAsset(db, asset.id).status).toBe('in-stock');
    expect(audits(db, asset.id)).toHaveLength(1);
  });

  it('copies a registration assignee into last_assigned_to on mark-lost and clears the current holder', () => {
    const asset = service.registerAsset(db, registerInput('X', { assignedTo: 'Alice' }));
    const lost = service.transitionAsset(db, asset.id, { to: 'lost', reason: 'damaged', actor: 'Mallory' });
    expect(lost.status).toBe('lost');
    expect(lost.assigned_to).toBeNull();
    expect(lost.last_assigned_to).toBe('Alice');
    const entry = audits(db, asset.id).at(-1);
    expect(entry.action).toBe('mark-lost');
    expect(entry.description).toContain('damaged');
    expect(entry.description).toContain('Alice');
    expect(entry.actor).toBe('Ada');
    expect(audits(db, asset.id)).toHaveLength(2);
  });

  it('marks a never-held asset lost without inventing a holder', () => {
    const asset = service.registerAsset(db, registerInput('X'));
    const lost = service.transitionAsset(db, asset.id, { to: 'lost', reason: 'stolen' });
    expect(lost.assigned_to).toBeNull();
    expect(lost.last_assigned_to).toBeNull();
    const entry = audits(db, asset.id).at(-1);
    expect(entry.action).toBe('mark-lost');
    expect(entry.description.toLowerCase()).not.toContain('prior holder');
    expect(entry.description).toContain('stolen');
  });

  it('keeps the preserved holder on a loss from returned and does not copy it back', () => {
    const asset = service.registerAsset(db, registerInput('X'));
    service.transitionAsset(db, asset.id, { to: 'assigned', assignee: 'Bob' });
    service.transitionAsset(db, asset.id, { to: 'returned' });
    const lost = service.transitionAsset(db, asset.id, { to: 'lost', reason: 'lost' });
    expect(lost.status).toBe('lost');
    expect(lost.assigned_to).toBeNull();
    expect(lost.last_assigned_to).toBe('Bob');
    expect(audits(db, asset.id).at(-1).description).toContain('Bob');
    expect(audits(db, asset.id).at(-1).description).toContain('lost');
  });

  it('overwrites last_assigned_to with the departing holder when one is set', () => {
    const asset = service.registerAsset(db, registerInput('X'));
    service.transitionAsset(db, asset.id, { to: 'assigned', assignee: 'Bob' });
    service.transitionAsset(db, asset.id, { to: 'returned' });
    service.transitionAsset(db, asset.id, { to: 'assigned', assignee: 'Carol' });
    const lost = service.transitionAsset(db, asset.id, { to: 'lost', reason: 'stolen' });
    expect(lost.assigned_to).toBeNull();
    expect(lost.last_assigned_to).toBe('Carol');
    expect(audits(db, asset.id).at(-1).description).toContain('Carol');
    expect(audits(db, asset.id).at(-1).description).not.toContain('Bob');
  });

  it('discards an assigned asset, keeps the holder at discard, and audits the resolution', () => {
    const asset = service.registerAsset(db, registerInput('X'));
    service.transitionAsset(db, asset.id, { to: 'assigned', assignee: 'Bob' });
    service.transitionAsset(db, asset.id, { to: 'returned' });
    service.transitionAsset(db, asset.id, { to: 'assigned', assignee: 'Carol' });
    const discarded = service.transitionAsset(db, asset.id, {
      to: 'discarded',
      reason: 'written-off',
      actor: 'Mallory',
    });
    expect(discarded.status).toBe('discarded');
    expect(discarded.assigned_to).toBeNull();
    expect(discarded.last_assigned_to).toBe('Carol');
    const entry = audits(db, asset.id).at(-1);
    expect(entry.action).toBe('discarded');
    expect(entry.actor).toBe('Ada');
    expect(entry.description).toContain('Carol');
    expect(entry.description.toLowerCase()).toContain('discard');
    expect(entry.description).toContain('assignment was resolved by the discard');
    expect(entry.description).not.toContain('Bob');
    expect(entry.description).not.toContain('Mallory');
  });

  it('recovers a lost asset to in-stock without copying the preserved holder into the current holder', () => {
    const asset = service.registerAsset(db, registerInput('X'));
    service.transitionAsset(db, asset.id, { to: 'assigned', assignee: 'Bob' });
    service.transitionAsset(db, asset.id, { to: 'lost', reason: 'stolen' });
    const recovered = service.transitionAsset(db, asset.id, { to: 'in-stock', reason: 'damaged', actor: 'Mallory' });
    expect(recovered.status).toBe('in-stock');
    expect(recovered.assigned_to).toBeNull();
    expect(recovered.last_assigned_to).toBe('Bob');
    const entry = audits(db, asset.id).at(-1);
    expect(entry.action).toBe('recovered');
    expect(entry.description).toContain('Recovered');
    expect(entry.description).toContain('Bob');
    expect(entry.description).toContain('damaged');
    expect(entry.actor).toBe('Ada');
  });

  it('names recovery with no prior holder when the asset was never held', () => {
    const asset = service.registerAsset(db, registerInput('X'));
    service.transitionAsset(db, asset.id, { to: 'lost', reason: 'stolen' });
    const recovered = service.transitionAsset(db, asset.id, { to: 'in-stock', reason: 'lost' });
    expect(recovered.assigned_to).toBeNull();
    expect(recovered.last_assigned_to).toBeNull();
    expect(audits(db, asset.id).at(-1).action).toBe('recovered');
    expect(audits(db, asset.id).at(-1).description).toContain('No prior holder');
  });

  it('accepts a loss reason on discard and rejects a retirement reason on loss', () => {
    const discarded = service.registerAsset(db, registerInput('D1'));
    service.transitionAsset(db, discarded.id, { to: 'assigned', assignee: 'Bob' });
    const retired = service.transitionAsset(db, discarded.id, { to: 'discarded', reason: 'stolen' });
    expect(retired.status).toBe('discarded');

    const lost = service.registerAsset(db, registerInput('D2'));
    const err = catchError(() => service.transitionAsset(db, lost.id, { to: 'lost', reason: 'written-off' }));
    expect(err.code).toBe('VALIDATION_ERROR');
    expect(repo.getAsset(db, lost.id).status).toBe('in-stock');
    expect(audits(db, lost.id)).toHaveLength(1);
  });

  it('rejects a recovery reason outside the loss vocabulary', () => {
    const asset = service.registerAsset(db, registerInput('X'));
    service.transitionAsset(db, asset.id, { to: 'lost', reason: 'stolen' });
    const before = audits(db, asset.id);
    const err = catchError(() => service.transitionAsset(db, asset.id, { to: 'in-stock', reason: 'superseded' }));
    expect(err.code).toBe('VALIDATION_ERROR');
    expect(repo.getAsset(db, asset.id).status).toBe('lost');
    expect(audits(db, asset.id)).toEqual(before);
  });

  it('refuses the deferred discard edges', () => {
    const stock = service.registerAsset(db, registerInput('S'));
    const fromStock = catchError(() =>
      service.transitionAsset(db, stock.id, { to: 'discarded', reason: 'written-off' })
    );
    expect(fromStock.code).toBe('INVALID_TRANSITION');
    expect(repo.getAsset(db, stock.id).status).toBe('in-stock');

    const returned = service.registerAsset(db, registerInput('R'));
    service.transitionAsset(db, returned.id, { to: 'assigned', assignee: 'Bob' });
    service.transitionAsset(db, returned.id, { to: 'returned' });
    const fromReturned = catchError(() =>
      service.transitionAsset(db, returned.id, { to: 'discarded', reason: 'superseded' })
    );
    expect(fromReturned.code).toBe('INVALID_TRANSITION');
    expect(repo.getAsset(db, returned.id).status).toBe('returned');
  });

  it('returns NOT_FOUND for a missing asset before judging the transition', () => {
    const err = catchError(() => service.transitionAsset(db, 'missing', { to: 'nowhere', assignee: 'X' }));
    expect(err.code).toBe('NOT_FOUND');
    expect(countRows(db, 'audit_log')).toBe(0);
  });

  it('rolls a transition back when its audit append fails', () => {
    const asset = service.registerAsset(db, registerInput('X'));
    const original = repo.recordAudit;
    try {
      repo.recordAudit = () => {
        throw new Error('audit failed');
      };
      const err = catchError(() => service.transitionAsset(db, asset.id, { to: 'assigned', assignee: 'Bob' }));
      expect(err.message).toBe('audit failed');
    } finally {
      repo.recordAudit = original;
    }
    const stored = repo.getAsset(db, asset.id);
    expect(stored.status).toBe('in-stock');
    expect(stored.assigned_to).toBeNull();
    expect(audits(db, asset.id)).toHaveLength(1);
    expect(audits(db, asset.id)[0].action).toBe('create');
  });

  it('walks every released edge and refuses every other pair', () => {
    function place(status, serial) {
      const asset = service.registerAsset(db, registerInput(serial, { name: serial }));
      if (status === 'in-stock') return asset;
      if (status === 'assigned') {
        return service.transitionAsset(db, asset.id, { to: 'assigned', assignee: 'Bob' });
      }
      if (status === 'returned') {
        service.transitionAsset(db, asset.id, { to: 'assigned', assignee: 'Bob' });
        return service.transitionAsset(db, asset.id, { to: 'returned' });
      }
      if (status === 'lost') {
        return service.transitionAsset(db, asset.id, { to: 'lost', reason: 'stolen' });
      }
      service.transitionAsset(db, asset.id, { to: 'assigned', assignee: 'Bob' });
      return service.transitionAsset(db, asset.id, { to: 'discarded', reason: 'written-off' });
    }

    TRANSITION_EDGES.forEach((edge) => {
      const asset = place(edge.from, `ok-${edge.from}-${edge.to}`);
      const before = audits(db, asset.id).length;
      const input = { to: edge.to, actor: 'Mallory' };
      if (edge.to === 'assigned') input.assignee = 'Carol';
      if (edge.reasonRequired) {
        if (edge.to === 'lost') input.reason = 'damaged';
        else if (edge.to === 'discarded') input.reason = 'returned-to-supplier';
        else input.reason = 'lost';
      }
      const updated = service.transitionAsset(db, asset.id, input);
      expect(updated.status).toBe(edge.to);
      const rows = audits(db, asset.id);
      expect(rows).toHaveLength(before + 1);
      expect(rows.at(-1).action).toBe(edge.auditAction);
      expect(rows.at(-1).actor).toBe('Ada');
      expect(rows.at(-1).description).not.toContain('Mallory');
    });

    STATUS_VALUES.forEach((from) => {
      STATUS_VALUES.forEach((to) => {
        const released = TRANSITION_EDGES.some((edge) => edge.from === from && edge.to === to);
        if (released) return;
        const asset = place(from, `no-${from}-${to}`);
        const before = audits(db, asset.id);
        const err = catchError(() =>
          service.transitionAsset(db, asset.id, {
            to,
            assignee: 'Carol',
            reason: 'stolen',
            actor: 'Mallory',
          })
        );
        expect(err.code).toBe('INVALID_TRANSITION');
        expect(repo.getAsset(db, asset.id).status).toBe(from);
        expect(audits(db, asset.id)).toEqual(before);
      });
    });

    TRANSITION_EDGES.filter((edge) => edge.reasonRequired).forEach((edge) => {
      const asset = place(edge.from, `why-${edge.from}-${edge.to}`);
      const before = audits(db, asset.id);
      const err = catchError(() =>
        service.transitionAsset(db, asset.id, { to: edge.to, assignee: 'Carol', reason: 'not-a-reason' })
      );
      expect(err.code).toBe('VALIDATION_ERROR');
      expect(repo.getAsset(db, asset.id).status).toBe(edge.from);
      expect(audits(db, asset.id)).toEqual(before);
    });
  });

  it('refuses delete before any statement and leaves the asset and its audit intact', () => {
    const asset = service.registerAsset(db, registerInput('X'));
    service.transitionAsset(db, asset.id, { to: 'assigned', assignee: 'Bob' });
    const before = audits(db, asset.id);
    const trap = new Proxy(
      {},
      {
        get() {
          throw new Error('database was touched');
        },
      }
    );
    expect(catchError(() => service.deleteAsset(trap, asset.id)).code).toBe('ASSET_DELETE_REFUSED');
    const err = catchError(() => service.deleteAsset(db, asset.id));
    expect(err.code).toBe('ASSET_DELETE_REFUSED');
    expect(repo.getAsset(db, asset.id).status).toBe('assigned');
    expect(repo.getAsset(db, asset.id).assigned_to).toBe('Bob');
    expect(audits(db, asset.id)).toEqual(before);
  });

  it('lists assets through the service', () => {
    seedTwoAssets(db);
    const all = service.listAssets(db, {});
    expect(all).toHaveLength(2);
    const filtered = service.listAssets(db, { category: 'hardware' });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].category).toBe('hardware');
  });

  it('returns the latest audit entry with its actor', () => {
    const asset = service.registerAsset(db, registerInput('X'));
    service.transitionAsset(db, asset.id, { to: 'assigned', assignee: 'Bob' });
    const data = service.getAssetWithAudit(db, asset.id);
    expect(data.asset.id).toBe(asset.id);
    expect(data.audit.action).toBe('assign');
    expect(data.audit.actor).toBe('Ada');
    expect(service.getAssetWithAudit(db, 'missing')).toBeNull();
  });

  it('maps SQLITE_BUSY by code and ignores busy wording on any other code', () => {
    const busy = catchError(() =>
      service.registerAsset(
        {
          transaction() {
            return {
              immediate() {
                const err = new Error('nope');
                err.code = 'SQLITE_BUSY';
                throw err;
              },
            };
          },
        },
        registerInput('X')
      )
    );
    expect(busy.code).toBe('BUSY_RETRYABLE');

    const unique = catchError(() =>
      service.registerAsset(
        {
          transaction() {
            return {
              immediate() {
                const err = new Error('nope');
                err.code = 'SQLITE_CONSTRAINT_UNIQUE';
                throw err;
              },
            };
          },
        },
        registerInput('Y')
      )
    );
    expect(unique.code).toBe('DUPLICATE_ASSET');
    expect(unique.message).not.toMatch(/nope/);

    const other = catchError(() =>
      service.registerAsset(
        {
          transaction() {
            return {
              immediate() {
                const err = new Error('UNIQUE constraint failed: database is locked');
                err.code = 'SQLITE_ERROR';
                throw err;
              },
            };
          },
        },
        registerInput('Z')
      )
    );
    expect(other.code).toBe('SQLITE_ERROR');
  });

  it('maps a real write-lock timeout to BUSY_RETRYABLE', async () => {
    db.pragma('busy_timeout = 200');
    const scriptPath = path.join(dir, 'hold-lock.js');
    fs.writeFileSync(
      scriptPath,
      `'use strict';
const Database = require(${JSON.stringify(require.resolve('better-sqlite3'))});
const locked = new Database(process.argv[2]);
locked.pragma('busy_timeout = 2000');
locked.exec('BEGIN IMMEDIATE');
process.stdout.write('locked\\n');
process.stdin.resume();
process.stdin.on('data', () => {
  locked.exec('ROLLBACK');
  locked.close();
  process.stdout.write('released\\n');
  process.exit(0);
});
`
    );
    const child = spawnNode(scriptPath, [filename]);
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    try {
      await new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          child.kill();
          reject(new Error(`lock child timed out: ${stderr}`));
        }, 8000);
        child.stdout.on('data', () => {
          if (stdout.includes('locked')) {
            clearTimeout(timer);
            resolve();
          }
        });
        child.once('exit', (code) => {
          clearTimeout(timer);
          reject(new Error(`lock child exited ${code}: ${stderr || stdout}`));
        });
      });
      const err = catchError(() => service.registerAsset(db, registerInput('BUSY-1')));
      expect({ code: err.code, message: err.message }).toMatchObject({ code: 'BUSY_RETRYABLE' });
      expect(countRows(db, 'assets')).toBe(0);
    } finally {
      const finished = collectChild(child);
      child.stdin.write('release\n');
      const result = await finished;
      expect(result.stdout).toContain('released');
    }
  });

  it('lets only one of two concurrent registrations of the same serial succeed', async () => {
    const scriptPath = path.join(dir, 'register-child.js');
    fs.writeFileSync(
      scriptPath,
      `'use strict';
const { openDatabase } = require(${JSON.stringify(require.resolve('../src/db'))});
const workerService = require(${JSON.stringify(require.resolve('../src/services/asset-service'))});
const workerDb = openDatabase(process.argv[2]);
try {
  const asset = workerService.registerAsset(workerDb, JSON.parse(process.argv[3]));
  process.stdout.write(JSON.stringify({ ok: true, id: asset.id }) + '\\n');
} catch (err) {
  process.stdout.write(JSON.stringify({
    ok: false,
    code: err && err.code ? err.code : null,
    message: err && err.message ? err.message : String(err),
  }) + '\\n');
} finally {
  workerDb.close();
}
`
    );
    const input = JSON.stringify(registerInput('RACE-1'));
    const results = await Promise.all(
      [0, 1].map(async () => {
        const child = spawnNode(scriptPath, [filename, input]);
        const finished = await collectChild(child);
        if (!finished.stdout.trim()) {
          throw new Error(`register child exited ${finished.code}: ${finished.stderr}`);
        }
        return JSON.parse(finished.stdout.trim());
      })
    );
    const succeeded = results.filter((result) => result.ok);
    const failed = results.filter((result) => !result.ok);
    expect(succeeded).toHaveLength(1);
    expect(failed).toHaveLength(1);
    expect(failed[0].code).toBe('DUPLICATE_ASSET');
    expect(countRows(db, 'assets')).toBe(1);
    expect(countRows(db, 'audit_log')).toBe(1);
  });

  it('follows the vocabulary transition table and resolves the actor with no arguments', () => {
    expect(SERVICE_SOURCE).toContain('db.transaction(fn).immediate()');
    expect(SERVICE_SOURCE).toContain('resolveActor()');
    expect(SERVICE_SOURCE).toContain('findTransition(');
    expect(SERVICE_SOURCE).toContain('isAcceptableReason(edge.reasonSet, request.reason)');
    expect(SERVICE_SOURCE).not.toMatch(/resolveActor\([^)]/);
    expect(SERVICE_SOURCE).not.toMatch(/from:\s*'in-stock'/);
    expect(SERVICE_SOURCE).not.toMatch(/\.message/);
    expect(SERVICE_SOURCE).not.toMatch(/UNIQUE constraint failed/);
    expect(SERVICE_SOURCE).not.toMatch(/DELETE\s+FROM/i);
    expect(SERVICE_SOURCE).toContain("code === 'SQLITE_CONSTRAINT_UNIQUE'");
    expect(SERVICE_SOURCE).toContain("code === 'SQLITE_BUSY'");
  });
});
