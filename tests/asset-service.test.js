'use strict';

const { describe, it, expect, beforeEach } = require('vitest');
const { openDatabase } = require('../src/db');
const service = require('../src/services/asset-service');

describe('asset service state machine', () => {
  let db;
  beforeEach(() => { db = openDatabase(':memory:'); });

  it('registers an asset in the in-stock state', () => {
    const a = service.registerAsset(db, { category: 'hardware', name: 'A', serialOrKey: 'X' });
    expect(a.status).toBe('in-stock');
  });

  it('registers an asset as assigned when an assignee is given', () => {
    const a = service.registerAsset(db, { category: 'hardware', name: 'A', serialOrKey: 'X', assignedTo: 'Alice' });
    expect(a.status).toBe('assigned');
    expect(a.assigned_to).toBe('Alice');
  });

  it('allows in-stock -> assigned', () => {
    const a = service.registerAsset(db, { category: 'hardware', name: 'A', serialOrKey: 'X' });
    const updated = service.assignAsset(db, a.id, 'Bob');
    expect(updated.status).toBe('assigned');
  });

  it('allows assigned -> returned', () => {
    const a = service.registerAsset(db, { category: 'hardware', name: 'A', serialOrKey: 'X', assignedTo: 'Bob' });
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
    expect(() => service.returnAsset(db, a.id)).toThrow(/INVALID_TRANSITION/);
  });

  it('rejects transition from lost (terminal)', () => {
    const a = service.registerAsset(db, { category: 'hardware', name: 'A', serialOrKey: 'X' });
    service.assignAsset(db, a.id, 'Bob');
    service.markLost(db, a.id);
    expect(() => service.returnAsset(db, a.id)).toThrow(/INVALID_TRANSITION/);
  });

  it('returns NOT_FOUND for unknown id', () => {
    expect(() => service.assignAsset(db, 'unknown', 'X')).toThrow(/NOT_FOUND/);
  });

  it('rejects assign with empty assignee name', () => {
    const a = service.registerAsset(db, { category: 'hardware', name: 'A', serialOrKey: 'X' });
    expect(() => service.assignAsset(db, a.id, '')).toThrow(/VALIDATION_ERROR/);
  });

  it('records an audit entry per transition', () => {
    const a = service.registerAsset(db, { category: 'hardware', name: 'A', serialOrKey: 'X' });
    service.assignAsset(db, a.id, 'Bob');
    const data = service.getAssetWithAudit(db, a.id);
    expect(data.audit.action).toBe('assign');
  });
});