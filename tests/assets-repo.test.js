'use strict';

const { openDatabase } = require('../src/db');
const repo = require('../src/repositories/assets-repo');
const { seedTwoAssets } = require('./helpers/seed');

/**
 * Run `fn` and return the error it threw.
 *
 * The application's error contract is the `code` property (`VALIDATION_ERROR`,
 * `DUPLICATE_ASSET`, `NOT_FOUND`, …); the message is human-facing prose and is
 * not part of the contract.
 */
function catchError(fn) {
  try {
    fn();
  } catch (err) {
    return err;
  }
  throw new Error('expected the call to throw, but it did not');
}

describe('assets repository', () => {
  let db;

  beforeEach(() => {
    db = openDatabase(':memory:');
  });

  afterEach(() => {
    if (db) db.close();
  });

  it('creates an asset and returns it', () => {
    const asset = repo.createAsset(db, { category: 'hardware', name: 'ThinkPad', serialOrKey: 'TP-001' });
    expect(asset.name).toBe('ThinkPad');
    expect(asset.status).toBe('in-stock');
  });

  it('rejects invalid category', () => {
    const err = catchError(() =>
      repo.createAsset(db, { category: 'chair', name: 'X', serialOrKey: 'A' })
    );
    expect(err.code).toBe('VALIDATION_ERROR');
  });

  it('rejects missing name', () => {
    const err = catchError(() =>
      repo.createAsset(db, { category: 'hardware', name: '', serialOrKey: 'A' })
    );
    expect(err.code).toBe('VALIDATION_ERROR');
  });

  it('detects duplicate (category, serial_or_key) pairs', () => {
    repo.createAsset(db, { category: 'hardware', name: 'A', serialOrKey: 'X' });
    const err = catchError(() =>
      repo.createAsset(db, { category: 'hardware', name: 'B', serialOrKey: 'X' })
    );
    expect(err.code).toBe('DUPLICATE_ASSET');
  });

  it('allows the same serial-or-key under a different category', () => {
    repo.createAsset(db, { category: 'hardware', name: 'A', serialOrKey: 'X' });
    const other = repo.createAsset(db, { category: 'software-license', name: 'B', serialOrKey: 'X' });
    expect(other.category).toBe('software-license');
  });

  it('lists assets with text search', () => {
    repo.createAsset(db, { category: 'hardware', name: 'ThinkPad', serialOrKey: 'TP' });
    repo.createAsset(db, { category: 'hardware', name: 'MacBook', serialOrKey: 'MB' });
    const rows = repo.listAssets(db, { q: 'think' });
    expect(rows.length).toBe(1);
    expect(rows[0].name).toBe('ThinkPad');
  });

  it('searches on the serial-or-key as well as the name', () => {
    repo.createAsset(db, { category: 'hardware', name: 'ThinkPad', serialOrKey: 'TP-001' });
    repo.createAsset(db, { category: 'hardware', name: 'MacBook', serialOrKey: 'MB-002' });
    const rows = repo.listAssets(db, { q: 'mb-002' });
    expect(rows.length).toBe(1);
    expect(rows[0].name).toBe('MacBook');
  });

  it('lists assets with category filter', () => {
    repo.createAsset(db, { category: 'hardware', name: 'A', serialOrKey: 'A' });
    repo.createAsset(db, { category: 'software-license', name: 'B', serialOrKey: 'B' });
    const rows = repo.listAssets(db, { category: 'software-license' });
    expect(rows.length).toBe(1);
    expect(rows[0].category).toBe('software-license');
  });

  it('lists assets with status filter', () => {
    const a = repo.createAsset(db, { category: 'hardware', name: 'A', serialOrKey: 'A' });
    repo.createAsset(db, { category: 'hardware', name: 'B', serialOrKey: 'B' });
    repo.updateAsset(db, a.id, { status: 'assigned' });
    const rows = repo.listAssets(db, { status: 'assigned' });
    expect(rows.length).toBe(1);
    expect(rows[0].name).toBe('A');
  });

  it('sorts by name and by creation date', () => {
    repo.createAsset(db, { category: 'hardware', name: 'Zebra', serialOrKey: 'Z' });
    repo.createAsset(db, { category: 'hardware', name: 'Apple', serialOrKey: 'A' });
    const byName = repo.listAssets(db, { sort: 'name' });
    expect(byName[0].name).toBe('Apple');
    const desc = repo.listAssets(db, { sort: 'name', dir: 'desc' });
    expect(desc[0].name).toBe('Zebra');
    const byDate = repo.listAssets(db, { sort: 'created_at' });
    expect(byDate.length).toBe(2);
  });

  it('records audit entries and returns the most recent', () => {
    const a = repo.createAsset(db, { category: 'hardware', name: 'A', serialOrKey: 'X' });
    repo.recordAudit(db, a.id, 'create', 'first');
    repo.recordAudit(db, a.id, 'assign', 'second');
    const latest = repo.latestAuditFor(db, a.id);
    expect(latest.action).toBe('assign');
  });

  // FR1.5 — the repository never derives the state from the presence of an
  // assignee; every new row starts in `in-stock`.
  it('always persists a new asset as in-stock, assignee or not (FR1.5)', () => {
    const withAssignee = repo.createAsset(db, {
      category: 'hardware',
      name: 'A',
      serialOrKey: 'X',
      assignedTo: 'Alice',
    });
    expect(withAssignee.status).toBe('in-stock');
    expect(withAssignee.assigned_to).toBe('Alice');
  });

  // FR4.6 / FR4.7 — the update path persists the lifecycle timestamps.
  it('persists the assignment and return timestamps through updateAsset (FR4.6, FR4.7)', () => {
    const a = repo.createAsset(db, { category: 'hardware', name: 'A', serialOrKey: 'X' });
    const assigned = repo.updateAsset(db, a.id, {
      status: 'assigned',
      assigned_to: 'Bob',
      assigned_at: '2026-01-01T00:00:00.000Z',
    });
    expect(assigned.assigned_at).toBe('2026-01-01T00:00:00.000Z');
    const returned = repo.updateAsset(db, a.id, {
      status: 'returned',
      assigned_to: null,
      returned_at: '2026-01-02T00:00:00.000Z',
    });
    expect(returned.returned_at).toBe('2026-01-02T00:00:00.000Z');
    expect(returned.assigned_to).toBeNull();
  });

  it('raises NOT_FOUND when updating an unknown asset', () => {
    const err = catchError(() => repo.updateAsset(db, 'missing', { status: 'assigned' }));
    expect(err.code).toBe('NOT_FOUND');
  });

  // NFR5 — SQLite's single-writer assumption is acknowledged for the `poc`.
  // The check here is that a sequential burst of writes leaves consistent state.
  it('keeps state consistent across a burst of concurrent-style writes (NFR5)', () => {
    const { hardware } = seedTwoAssets(db);
    for (let i = 0; i < 25; i += 1) {
      repo.updateAsset(db, hardware.id, { notes: `edit-${i}` });
    }
    const rows = repo.listAssets(db, {});
    expect(rows.length).toBe(2);
    const reloaded = repo.getAsset(db, hardware.id);
    expect(reloaded.notes).toBe('edit-24');
  });
});
