'use strict';

const { openDatabase } = require('../src/db');
const service = require('../src/services/asset-service');
const { seedTwoAssets } = require('./helpers/seed');

/**
 * Run `fn` and return the error it threw.
 *
 * The application's error contract is the `code` property (`VALIDATION_ERROR`,
 * `DUPLICATE_ASSET`, `NOT_FOUND`, `INVALID_TRANSITION`, …); the message is
 * human-facing prose and is not part of the contract.
 */
function catchError(fn) {
  try {
    fn();
  } catch (err) {
    return err;
  }
  throw new Error('expected the call to throw, but it did not');
}

describe('asset service state machine', () => {
  let db;

  beforeEach(() => {
    db = openDatabase(':memory:');
  });

  afterEach(() => {
    if (db) db.close();
  });

  it('registers an asset in the in-stock state', () => {
    const a = service.registerAsset(db, { category: 'hardware', name: 'A', serialOrKey: 'X' });
    expect(a.status).toBe('in-stock');
  });

  // FR1.5 — a registration that supplies an assignee is still persisted in the
  // `in-stock` state; the assignee is stored as a field only.
  it('registers an asset as in-stock even when an assignee is given', () => {
    const a = service.registerAsset(db, {
      category: 'hardware',
      name: 'A',
      serialOrKey: 'X',
      assignedTo: 'Alice',
    });
    expect(a.status).toBe('in-stock');
    expect(a.assigned_to).toBe('Alice');
  });

  it('gives a newly registered asset a UUID and both timestamps', () => {
    const a = service.registerAsset(db, { category: 'hardware', name: 'A', serialOrKey: 'X' });
    expect(a.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    expect(a.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(a.updated_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('allows in-stock -> assigned', () => {
    const a = service.registerAsset(db, { category: 'hardware', name: 'A', serialOrKey: 'X' });
    const updated = service.assignAsset(db, a.id, 'Bob');
    expect(updated.status).toBe('assigned');
  });

  it('allows assigned -> returned', () => {
    const a = service.registerAsset(db, { category: 'hardware', name: 'A', serialOrKey: 'X' });
    service.assignAsset(db, a.id, 'Bob');
    const updated = service.returnAsset(db, a.id);
    expect(updated.status).toBe('returned');
    expect(updated.assigned_to).toBeNull();
  });

  it('allows returned -> assigned', () => {
    const a = service.registerAsset(db, { category: 'hardware', name: 'A', serialOrKey: 'X' });
    service.assignAsset(db, a.id, 'Bob');
    service.returnAsset(db, a.id);
    const updated = service.assignAsset(db, a.id, 'Carol');
    expect(updated.status).toBe('assigned');
    expect(updated.assigned_to).toBe('Carol');
  });

  it('rejects invalid transition in-stock -> returned', () => {
    const a = service.registerAsset(db, { category: 'hardware', name: 'A', serialOrKey: 'X' });
    const err = catchError(() => service.returnAsset(db, a.id));
    expect(err.code).toBe('INVALID_TRANSITION');
  });

  it('rejects transition from lost (terminal)', () => {
    const a = service.registerAsset(db, { category: 'hardware', name: 'A', serialOrKey: 'X' });
    service.assignAsset(db, a.id, 'Bob');
    service.markLost(db, a.id);
    const err = catchError(() => service.returnAsset(db, a.id));
    expect(err.code).toBe('INVALID_TRANSITION');
  });

  it('returns NOT_FOUND for unknown id', () => {
    const err = catchError(() => service.assignAsset(db, 'unknown', 'X'));
    expect(err.code).toBe('NOT_FOUND');
  });

  it('rejects assign with empty assignee name', () => {
    const a = service.registerAsset(db, { category: 'hardware', name: 'A', serialOrKey: 'X' });
    const err = catchError(() => service.assignAsset(db, a.id, ''));
    expect(err.code).toBe('VALIDATION_ERROR');
  });

  it('records an audit entry per transition', () => {
    const a = service.registerAsset(db, { category: 'hardware', name: 'A', serialOrKey: 'X' });
    service.assignAsset(db, a.id, 'Bob');
    const data = service.getAssetWithAudit(db, a.id);
    expect(data.audit.action).toBe('assign');
  });

  // FR4.6 — assigning records the assignee name AND the assignment timestamp.
  it('records the assignee name and the assignment timestamp on assign (FR4.6)', () => {
    const a = service.registerAsset(db, { category: 'hardware', name: 'A', serialOrKey: 'X' });
    const updated = service.assignAsset(db, a.id, 'Bob');
    expect(updated.assigned_to).toBe('Bob');
    expect(updated.assigned_at).not.toBeNull();
    expect(updated.assigned_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  // FR4.7 — returning clears the assignee AND records the return timestamp.
  it('clears the assignee and records the return timestamp on return (FR4.7)', () => {
    const a = service.registerAsset(db, { category: 'hardware', name: 'A', serialOrKey: 'X' });
    service.assignAsset(db, a.id, 'Bob');
    const updated = service.returnAsset(db, a.id);
    expect(updated.assigned_to).toBeNull();
    expect(updated.returned_at).not.toBeNull();
    expect(updated.returned_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('leaves both lifecycle timestamps empty until the asset is transitioned', () => {
    const a = service.registerAsset(db, { category: 'hardware', name: 'A', serialOrKey: 'X' });
    expect(a.assigned_at).toBeNull();
    expect(a.returned_at).toBeNull();
  });

  it('clears the stale return timestamp when the asset is assigned again', () => {
    const a = service.registerAsset(db, { category: 'hardware', name: 'A', serialOrKey: 'X' });
    service.assignAsset(db, a.id, 'Bob');
    service.returnAsset(db, a.id);
    const reAssigned = service.assignAsset(db, a.id, 'Carol');
    expect(reAssigned.status).toBe('assigned');
    expect(reAssigned.returned_at).toBeNull();
    expect(reAssigned.assigned_at).not.toBeNull();
  });

  // FR4.8 — every transition updates `updated-at`.
  it('updates the updated-at timestamp on an assignment (FR4.8)', async () => {
    const a = service.registerAsset(db, { category: 'hardware', name: 'A', serialOrKey: 'X' });
    const before = a.updated_at;
    // The ISO timestamps have millisecond resolution; wait for the next tick
    // so the new value is observably different.
    await new Promise((resolve) => setTimeout(resolve, 5));
    const assigned = service.assignAsset(db, a.id, 'Bob');
    expect(assigned.updated_at).not.toBe(before);
    expect(assigned.updated_at >= before).toBe(true);
  });

  it('updates the updated-at timestamp on a return (FR4.8)', async () => {
    const a = service.registerAsset(db, { category: 'hardware', name: 'A', serialOrKey: 'X' });
    const assigned = service.assignAsset(db, a.id, 'Bob');
    await new Promise((resolve) => setTimeout(resolve, 5));
    const returned = service.returnAsset(db, a.id);
    expect(returned.updated_at).not.toBe(assigned.updated_at);
  });

  it('lists assets through the service (FR2)', () => {
    seedTwoAssets(db);
    const all = service.listAssets(db, {});
    expect(all.length).toBe(2);
    const filtered = service.listAssets(db, { category: 'hardware' });
    expect(filtered.length).toBe(1);
    expect(filtered[0].category).toBe('hardware');
  });
});
