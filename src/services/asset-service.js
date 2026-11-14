'use strict';

const repo = require('../repositories/assets-repo');
const { resolveActor } = require('../actor');
const { findTransition, isAcceptableReason } = require('../domain/vocabulary');

function makeError(message, code) {
  const err = new Error(message);
  err.code = code;
  return err;
}

/**
 * Driver failures are classified by err.code only. A domain error already
 * carries its own code and is returned unchanged.
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

function inImmediate(db, fn) {
  try {
    return db.transaction(fn).immediate();
  } catch (err) {
    throw mapSqliteError(err);
  }
}

function asObject(input) {
  return input && typeof input === 'object' ? input : {};
}

function storedHolder(value) {
  if (typeof value !== 'string' || value.length === 0) return null;
  return value;
}

function quoted(value) {
  if (value == null || value === '') return '(empty)';
  return `"${value}"`;
}

function registerFields(input) {
  const source = asObject(input);
  return {
    category: source.category,
    name: source.name,
    serialOrKey: source.serialOrKey,
    model: source.model,
    notes: source.notes,
    assignedTo: source.assignedTo,
  };
}

function describeCreate(asset) {
  return `Registered "${asset.name}" in category ${asset.category} with serial-or-key "${asset.serial_or_key}".`;
}

function projectEdit(current, input) {
  const source = asObject(input);
  const take = (key, fallback) => {
    if (!Object.prototype.hasOwnProperty.call(source, key) || source[key] === undefined) return fallback;
    return source[key];
  };
  return {
    name: take('name', current.name),
    category: take('category', current.category),
    serial_or_key: take('serialOrKey', current.serial_or_key),
    model: take('model', current.model),
    notes: take('notes', current.notes),
  };
}

function validateEdit(next) {
  const errors = repo.validateCreate({
    category: next.category,
    name: next.name,
    serialOrKey: next.serial_or_key,
  });
  if (next.model != null && typeof next.model !== 'string') errors.push('model must be a string.');
  if (next.notes != null && typeof next.notes !== 'string') errors.push('notes must be a string.');
  return errors;
}

function changedFields(current, next) {
  const pairs = [
    ['name', current.name, next.name],
    ['category', current.category, next.category],
    ['serialOrKey', current.serial_or_key, next.serial_or_key],
    ['model', current.model, next.model],
    ['notes', current.notes, next.notes],
  ];
  return pairs
    .filter(([, previous, value]) => previous !== value)
    .map(([field, previous, value]) => ({ field, previous, value }));
}

function describeEdit(changes) {
  const parts = changes.map((change) => `${change.field} from ${quoted(change.previous)} to ${quoted(change.value)}`);
  return `Edited ${parts.join('; ')}.`;
}

function requiredAssignee(value) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw makeError('assignee is required.', 'VALIDATION_ERROR');
  }
  return value.trim();
}

/**
 * Column updates copy assigned_to onto last_assigned_to only when a transition
 * says to record the departing current holder. Neither column is ever filled
 * from the other as a fallback.
 */
function transitionPatch(db, current, edge, request) {
  const patch = { status: edge.to };
  if (edge.auditAction === 'assign') {
    patch.assigned_to = requiredAssignee(request.assignee);
    patch.assigned_at = repo.nowIso(db);
    patch.returned_at = null;
    return patch;
  }
  if (edge.auditAction === 'return') {
    const departing = storedHolder(current.assigned_to);
    patch.assigned_to = null;
    patch.returned_at = repo.nowIso(db);
    if (departing !== null) patch.last_assigned_to = departing;
    return patch;
  }
  if (edge.auditAction === 'mark-lost' || edge.auditAction === 'discarded') {
    const departing = storedHolder(current.assigned_to);
    patch.assigned_to = null;
    if (departing !== null) patch.last_assigned_to = departing;
    return patch;
  }
  if (edge.auditAction === 'recovered') {
    return patch;
  }
  throw makeError(`unsupported audit action ${edge.auditAction}.`, 'INTERNAL');
}

function describeTransition(current, edge, request) {
  const name = current.name;
  if (edge.auditAction === 'assign') {
    return `Assigned "${name}" to ${requiredAssignee(request.assignee)}.`;
  }
  if (edge.auditAction === 'return') {
    const holder = storedHolder(current.assigned_to);
    return holder ? `Returned "${name}" from ${holder}.` : `Returned "${name}" from no current holder.`;
  }
  if (edge.auditAction === 'mark-lost') {
    const departing = storedHolder(current.assigned_to);
    const preserved = storedHolder(current.last_assigned_to);
    const prior = departing !== null ? departing : preserved;
    const base = `Marked "${name}" as lost (${request.reason}).`;
    return prior ? `${base} Prior holder ${prior}.` : base;
  }
  if (edge.auditAction === 'discarded') {
    const holder = storedHolder(current.assigned_to);
    const who = holder === null ? 'none' : holder;
    return `Discarded "${name}" (${request.reason}). Prior holder ${who}. The assignment was resolved by the discard.`;
  }
  if (edge.auditAction === 'recovered') {
    const prior = storedHolder(current.last_assigned_to);
    const base = `Recovered "${name}" (${request.reason}).`;
    return prior ? `${base} Prior holder ${prior}.` : `${base} No prior holder.`;
  }
  throw makeError(`unsupported audit action ${edge.auditAction}.`, 'INTERNAL');
}

function registerAsset(db, input) {
  const fields = registerFields(input);
  const errors = repo.validateCreate(fields);
  if (errors.length) {
    const err = makeError(errors.join('; '), 'VALIDATION_ERROR');
    err.details = errors;
    throw err;
  }
  return inImmediate(db, () => {
    const actor = resolveActor();
    const asset = repo.createAsset(db, fields);
    repo.recordAudit(db, asset.id, 'create', describeCreate(asset), actor);
    return asset;
  });
}

function editAsset(db, id, input) {
  return inImmediate(db, () => {
    const actor = resolveActor();
    const current = repo.getAsset(db, id);
    if (!current) throw makeError('Asset not found.', 'NOT_FOUND');
    const next = projectEdit(current, input);
    const errors = validateEdit(next);
    if (errors.length) {
      const err = makeError(errors.join('; '), 'VALIDATION_ERROR');
      err.details = errors;
      throw err;
    }
    const changes = changedFields(current, next);
    if (changes.length === 0) return current;
    const updated = repo.updateAsset(db, id, {
      name: next.name,
      category: next.category,
      serial_or_key: next.serial_or_key,
      model: next.model,
      notes: next.notes,
    });
    repo.recordAudit(db, id, 'edit', describeEdit(changes), actor);
    return updated;
  });
}

function transitionAsset(db, id, input) {
  const request = asObject(input);
  return inImmediate(db, () => {
    const actor = resolveActor();
    const current = repo.getAsset(db, id);
    if (!current) throw makeError('Asset not found.', 'NOT_FOUND');
    const edge = findTransition(current.status, request.to);
    if (!edge) {
      throw makeError(`cannot transition asset from ${current.status} to ${request.to}.`, 'INVALID_TRANSITION');
    }
    if (edge.reasonRequired && !isAcceptableReason(edge.reasonSet, request.reason)) {
      throw makeError('reason is not acceptable for this transition.', 'VALIDATION_ERROR');
    }
    const patch = transitionPatch(db, current, edge, request);
    const updated = repo.updateAsset(db, id, patch);
    repo.recordAudit(db, id, edge.auditAction, describeTransition(current, edge, request), actor);
    return updated;
  });
}

function deleteAsset(db, id) {
  void db;
  void id;
  throw makeError('Deleting an asset is refused.', 'ASSET_DELETE_REFUSED');
}

function previewSerialCollision(db, query) {
  return repo.previewSerialCollision(db, asObject(query));
}

function getAssetWithAudit(db, id) {
  const asset = repo.getAsset(db, id);
  if (!asset) return null;
  const audit = repo.latestAuditFor(db, id);
  return { asset, audit };
}

function listAssets(db, filters) {
  return repo.listAssets(db, filters);
}

module.exports = {
  registerAsset,
  editAsset,
  transitionAsset,
  deleteAsset,
  previewSerialCollision,
  getAssetWithAudit,
  listAssets,
};
