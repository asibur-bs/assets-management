'use strict';

const { describe, it, expect, beforeEach } = require('vitest');
const { openDatabase } = require('../src/db');
const repo = require('../src/repositories/assets-repo');

describe('assets repository', () => {
  let db;
  beforeEach(() => { db = openDatabase(':memory:'); });

  it('creates an asset and returns it', () => {
    const asset = repo.createAsset(db, { category: 'hardware', name: 'ThinkPad', serialOrKey: 'TP-001' });
    expect(asset.name).toBe('ThinkPad');
    expect(asset.status).toBe('in-stock');
  });

  it('rejects invalid category', () => {
    expect(() => repo.createAsset(db, { category: 'chair', name: 'X', serialOrKey: 'A' })).toThrow(/VALIDATION_ERROR/);
  });

  it('rejects missing name', () => {
    expect(() => repo.createAsset(db, { category: 'hardware', name: '', serialOrKey: 'A' })).toThrow(/VALIDATION_ERROR/);
  });

  it('detects duplicate (category, serial_or_key) pairs', () => {
    repo.createAsset(db, { category: 'hardware', name: 'A', serialOrKey: 'X' });
    expect(() => repo.createAsset(db, { category: 'hardware', name: 'B', serialOrKey: 'X' })).toThrow(/DUPLICATE_ASSET/);
  });

  it('lists assets with text search', () => {
    repo.createAsset(db, { category: 'hardware', name: 'ThinkPad', serialOrKey: 'TP' });
    repo.createAsset(db, { category: 'hardware', name: 'MacBook', serialOrKey: 'MB' });
    const rows = repo.listAssets(db, { q: 'think' });
    expect(rows.length).toBe(1);
    expect(rows[0].name).toBe('ThinkPad');
  });

  it('lists assets with category filter', () => {
    repo.createAsset(db, { category: 'hardware', name: 'A', serialOrKey: 'A' });
    repo.createAsset(db, { category: 'software-license', name: 'B', serialOrKey: 'B' });
    const rows = repo.listAssets(db, { category: 'software-license' });
    expect(rows.length).toBe(1);
    expect(rows[0].category).toBe('software-license');
  });

  it('records audit entries and returns the most recent', () => {
    const a = repo.createAsset(db, { category: 'hardware', name: 'A', serialOrKey: 'X' });
    repo.recordAudit(db, a.id, 'create', 'first');
    repo.recordAudit(db, a.id, 'assign', 'second');
    const latest = repo.latestAuditFor(db, a.id);
    expect(latest.action).toBe('assign');
  });
});