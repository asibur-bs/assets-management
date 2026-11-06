'use strict';

const { randomUUID } = require('node:crypto');

const ALLOWED_CATEGORIES = new Set(['hardware', 'software-license']);
const ALLOWED_STATUSES = new Set(['in-stock', 'assigned', 'returned', 'lost']);

function nowIso(db) {
  const row = db.prepare("SELECT strftime('%Y-%m-%dT%H:%M:%fZ', 'now') AS ts").get();
  return row.ts;
}

function listAssets(db, { q = null, category = null, status = null, sort = 'name', dir = 'asc' } = {}) {
  const where = [];
  const args = [];
  if (q) {
    where.push('(LOWER(name) LIKE ? OR LOWER(serial_or_key) LIKE ?)');
    args.push(`%${q.toLowerCase()}%`, `%${q.toLowerCase()}%`);
  }
  if (category && ALLOWED_CATEGORIES.has(category)) {
    where.push('category = ?');
    args.push(category);
  }
  if (status && ALLOWED_STATUSES.has(status)) {
    where.push('status = ?');
    args.push(status);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const sortCol = sort === 'created_at' ? 'created_at' : 'name';
  const sortDir = dir === 'desc' ? 'DESC' : 'ASC';
  return db.prepare(`SELECT * FROM assets ${whereSql} ORDER BY ${sortCol} ${sortDir}`).all(...args);
}

function getAsset(db, id) {
  return db.prepare('SELECT * FROM assets WHERE id = ?').get(id);
}

function createAsset(db, input) {
  const errors = validateCreate(input);
  if (errors.length) {
    const err = new Error(errors.join('; '));
    err.code = 'VALIDATION_ERROR';
    err.details = errors;
    throw err;
  }
  const id = randomUUID();
  const now = nowIso(db);
  // FR1.5: a newly registered asset is ALWAYS persisted in the `in-stock`
  // state. An optional `assigned-to` is stored as a plain field on the record
  // and does not move the asset into the `assigned` state — the asset only
  // enters `assigned` through the assign action (FR4.2).
  const status = 'in-stock';
  try {
    db.prepare(`
      INSERT INTO assets (id, category, name, serial_or_key, model, notes, status, assigned_to, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      input.category,
      input.name,
      input.serialOrKey,
      input.model ?? null,
      input.notes ?? null,
      status,
      input.assignedTo ?? null,
      now,
      now
    );
  } catch (e) {
    if (String(e.message).includes('UNIQUE constraint failed')) {
      const err = new Error('An asset with this category and serial-or-key already exists.');
      err.code = 'DUPLICATE_ASSET';
      throw err;
    }
    throw e;
  }
  return getAsset(db, id);
}

function updateAsset(db, id, patch) {
  const current = getAsset(db, id);
  if (!current) {
    const err = new Error('Asset not found.');
    err.code = 'NOT_FOUND';
    throw err;
  }
  const merged = { ...current, ...patch };
  db.prepare(`
    UPDATE assets
       SET name = ?, serial_or_key = ?, model = ?, notes = ?, category = ?, assigned_to = ?,
           status = ?, assigned_at = ?, returned_at = ?, updated_at = ?
     WHERE id = ?
  `).run(
    merged.name,
    merged.serial_or_key,
    merged.model,
    merged.notes,
    merged.category,
    merged.assigned_to,
    merged.status,
    merged.assigned_at ?? null,
    merged.returned_at ?? null,
    nowIso(db),
    id
  );
  return getAsset(db, id);
}

function recordAudit(db, assetId, action, description) {
  db.prepare(`
    INSERT INTO audit_log (asset_id, action, description)
    VALUES (?, ?, ?)
  `).run(assetId, action, description);
}

function latestAuditFor(db, assetId) {
  return db.prepare(`
    SELECT action, description, created_at
      FROM audit_log
     WHERE asset_id = ?
     ORDER BY id DESC
     LIMIT 1
  `).get(assetId);
}

function validateCreate(input) {
  const errors = [];
  if (!input.category || !ALLOWED_CATEGORIES.has(input.category)) errors.push('category must be one of hardware or software-license.');
  if (!input.name || typeof input.name !== 'string' || input.name.trim().length === 0) errors.push('name is required.');
  if (!input.serialOrKey || typeof input.serialOrKey !== 'string' || input.serialOrKey.trim().length === 0) errors.push('serial-or-key is required.');
  return errors;
}

module.exports = {
  listAssets,
  getAsset,
  createAsset,
  updateAsset,
  recordAudit,
  latestAuditFor,
  nowIso,
  ALLOWED_CATEGORIES,
  ALLOWED_STATUSES,
  validateCreate,
};