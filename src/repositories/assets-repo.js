'use strict';

const { randomUUID } = require('node:crypto');
const {
  CATEGORY_VALUES,
  STATUS_VALUES,
  SERIAL_OR_KEY_INDEX_EXPRESSION,
  normalizeSerialOrKey,
} = require('../domain/vocabulary');

const ALLOWED_CATEGORIES = new Set(CATEGORY_VALUES);
const ALLOWED_STATUSES = new Set(STATUS_VALUES);

function makeError(message, code) {
  const err = new Error(message);
  err.code = code;
  return err;
}

/**
 * Map a driver failure by err.code alone. Message text is not a signal:
 * SQLITE_CONSTRAINT_UNIQUE and SQLITE_BUSY are the only codes translated here.
 */
function mapSqliteError(err) {
  const code = err && err.code;
  if (code === 'SQLITE_CONSTRAINT_UNIQUE') {
    return makeError('An asset with this category and serial-or-key already exists.', 'DUPLICATE_ASSET');
  }
  if (code === 'SQLITE_BUSY') {
    return makeError('The database is busy; retry the write.', 'BUSY_RETRYABLE');
  }
  return err;
}

function bind(value) {
  return value === undefined ? null : value;
}

function nowIso(db) {
  const row = db.prepare("SELECT strftime('%Y-%m-%dT%H:%M:%fZ', 'now') AS ts").get();
  return row.ts;
}

function optionalAssignee(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function listAssets(db, { q = null, category = null, status = null, sort = 'name', dir = 'asc' } = {}) {
  const where = [];
  const args = [];
  if (typeof q === 'string' && q.length > 0) {
    where.push('(LOWER(name) LIKE ? OR LOWER(serial_or_key) LIKE ?)');
    const needle = `%${q.toLowerCase()}%`;
    args.push(needle, needle);
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

/**
 * Application uniqueness check. The candidate is folded with
 * normalizeSerialOrKey; stored rows are compared with the same expression the
 * unique index uses. excludeId drops the row being edited. A null serial
 * (non-string) does not collide. This read does not take a write lock.
 */
function findSerialCollision(db, { category, serialOrKey, excludeId } = {}) {
  const normalized = normalizeSerialOrKey(serialOrKey);
  if (normalized === null) return null;
  if (excludeId == null) {
    return (
      db
        .prepare(
          `SELECT * FROM assets
            WHERE category = ?
              AND ${SERIAL_OR_KEY_INDEX_EXPRESSION} = ?`
        )
        .get(category, normalized) || null
    );
  }
  return (
    db
      .prepare(
        `SELECT * FROM assets
          WHERE category = ?
            AND ${SERIAL_OR_KEY_INDEX_EXPRESSION} = ?
            AND id != ?`
      )
      .get(category, normalized, excludeId) || null
  );
}

function assertSerialAvailable(db, spec) {
  if (findSerialCollision(db, spec)) {
    throw makeError('An asset with this category and serial-or-key already exists.', 'DUPLICATE_ASSET');
  }
}

function previewSerialCollision(db, { category, serialOrKey, excludeId } = {}) {
  const existingAsset = findSerialCollision(db, { category, serialOrKey, excludeId });
  return {
    collision: existingAsset != null,
    existingAsset,
  };
}

function createAsset(db, input) {
  const errors = validateCreate(input);
  if (errors.length) {
    const err = makeError(errors.join('; '), 'VALIDATION_ERROR');
    err.details = errors;
    throw err;
  }
  assertSerialAvailable(db, {
    category: input.category,
    serialOrKey: input.serialOrKey,
    excludeId: null,
  });
  const id = randomUUID();
  const now = nowIso(db);
  // Registration is always in-stock. assignedTo is a stored field only.
  try {
    db.prepare(
      `INSERT INTO assets (
         id, category, name, serial_or_key, model, notes, status,
         assigned_to, assigned_at, returned_at, last_assigned_to, created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      input.category,
      input.name,
      input.serialOrKey,
      bind(input.model),
      bind(input.notes),
      'in-stock',
      optionalAssignee(input.assignedTo),
      null,
      null,
      null,
      now,
      now
    );
  } catch (err) {
    throw mapSqliteError(err);
  }
  return getAsset(db, id);
}

function updateAsset(db, id, patch) {
  const current = getAsset(db, id);
  if (!current) {
    throw makeError('Asset not found.', 'NOT_FOUND');
  }
  const merged = { ...current, ...patch };
  assertSerialAvailable(db, {
    category: merged.category,
    serialOrKey: merged.serial_or_key,
    excludeId: id,
  });
  try {
    db.prepare(
      `UPDATE assets
          SET name = ?, serial_or_key = ?, model = ?, notes = ?, category = ?,
              assigned_to = ?, last_assigned_to = ?, status = ?,
              assigned_at = ?, returned_at = ?, updated_at = ?
        WHERE id = ?`
    ).run(
      bind(merged.name),
      bind(merged.serial_or_key),
      bind(merged.model),
      bind(merged.notes),
      bind(merged.category),
      bind(merged.assigned_to),
      bind(merged.last_assigned_to),
      bind(merged.status),
      bind(merged.assigned_at),
      bind(merged.returned_at),
      nowIso(db),
      id
    );
  } catch (err) {
    throw mapSqliteError(err);
  }
  return getAsset(db, id);
}

function recordAudit(db, assetId, action, description, actor) {
  if (typeof actor !== 'string' || actor.length === 0) {
    throw makeError('actor is required.', 'VALIDATION_ERROR');
  }
  try {
    db.prepare(
      `INSERT INTO audit_log (asset_id, action, description, actor)
       VALUES (?, ?, ?, ?)`
    ).run(assetId, action, description, actor);
  } catch (err) {
    throw mapSqliteError(err);
  }
}

function latestAuditFor(db, assetId) {
  return db
    .prepare(
      `SELECT id, action, description, actor, created_at
         FROM audit_log
        WHERE asset_id = ?
        ORDER BY id DESC
        LIMIT 1`
    )
    .get(assetId);
}

function listAudit(db, assetId) {
  return db
    .prepare(
      `SELECT id, asset_id, action, description, actor, created_at
         FROM audit_log
        WHERE asset_id = ?
        ORDER BY id DESC`
    )
    .all(assetId);
}

function validateCreate(input) {
  const errors = [];
  const value = input && typeof input === 'object' ? input : {};
  if (!value.category || !ALLOWED_CATEGORIES.has(value.category)) {
    errors.push('category must be one of hardware or software-license.');
  }
  if (!value.name || typeof value.name !== 'string' || value.name.trim().length === 0) {
    errors.push('name is required.');
  }
  if (!value.serialOrKey || typeof value.serialOrKey !== 'string' || value.serialOrKey.trim().length === 0) {
    errors.push('serial-or-key is required.');
  }
  return errors;
}

module.exports = {
  listAssets,
  getAsset,
  createAsset,
  updateAsset,
  recordAudit,
  latestAuditFor,
  listAudit,
  previewSerialCollision,
  nowIso,
  ALLOWED_CATEGORIES,
  ALLOWED_STATUSES,
  validateCreate,
};
