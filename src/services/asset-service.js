'use strict';

const repo = require('../repositories/assets-repo');

const TRANSITIONS = {
  'in-stock': new Set(['assigned']),
  assigned: new Set(['returned', 'lost']),
  returned: new Set(['assigned', 'lost']),
  lost: new Set(),
};

const ACTION_DESCRIPTIONS = {
  assign: (name, assignee) => `Assigned "${name}" to ${assignee}.`,
  return: (name) => `"${name}" returned to stock.`,
  markLost: (name) => `"${name}" marked as lost.`,
};

function assertTransition(from, to) {
  const allowed = TRANSITIONS[from];
  if (!allowed) {
    throw makeError(`unknown current state: ${from}`, 'INVALID_STATE');
  }
  if (!allowed.has(to)) {
    throw makeError(`cannot transition asset from ${from} to ${to}.`, 'INVALID_TRANSITION');
  }
}

function makeError(message, code) {
  const err = new Error(message);
  err.code = code;
  return err;
}

function registerAsset(db, input) {
  // FR1.5: the asset is always created in the `in-stock` state. An optional
  // `assigned-to` is stored as a plain field on the record; it does not perform
  // an assignment and does not move the asset out of `in-stock`.
  const asset = repo.createAsset(db, input);
  if (input.assignedTo) {
    repo.recordAudit(
      db,
      asset.id,
      'create',
      `Registered "${asset.name}" (recorded assignee: ${input.assignedTo}).`
    );
  } else {
    repo.recordAudit(db, asset.id, 'create', `Registered "${asset.name}".`);
  }
  return asset;
}

function assignAsset(db, id, assignee) {
  if (!assignee || typeof assignee !== 'string' || assignee.trim().length === 0) {
    throw makeError('assignee is required.', 'VALIDATION_ERROR');
  }
  const current = repo.getAsset(db, id);
  if (!current) throw makeError('Asset not found.', 'NOT_FOUND');
  assertTransition(current.status, 'assigned');
  // FR4.6: record the assignee name AND the assignment timestamp. FR4.7: the
  // previous return no longer applies once the asset goes back out.
  const assignedAt = repo.nowIso(db);
  const updated = repo.updateAsset(db, id, {
    status: 'assigned',
    assigned_to: assignee.trim(),
    assigned_at: assignedAt,
    returned_at: null,
  });
  repo.recordAudit(db, id, 'assign', ACTION_DESCRIPTIONS.assign(updated.name, assignee.trim()));
  return updated;
}

function returnAsset(db, id) {
  const current = repo.getAsset(db, id);
  if (!current) throw makeError('Asset not found.', 'NOT_FOUND');
  assertTransition(current.status, 'returned');
  // FR4.7: clear the assignee AND record the return timestamp.
  const returnedAt = repo.nowIso(db);
  const updated = repo.updateAsset(db, id, {
    status: 'returned',
    assigned_to: null,
    returned_at: returnedAt,
  });
  repo.recordAudit(db, id, 'return', ACTION_DESCRIPTIONS.return(updated.name));
  return updated;
}

function markLost(db, id) {
  const current = repo.getAsset(db, id);
  if (!current) throw makeError('Asset not found.', 'NOT_FOUND');
  assertTransition(current.status, 'lost');
  const updated = repo.updateAsset(db, id, { status: 'lost', assigned_to: null });
  repo.recordAudit(db, id, 'mark-lost', ACTION_DESCRIPTIONS.markLost(updated.name));
  return updated;
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
  assignAsset,
  returnAsset,
  markLost,
  getAssetWithAudit,
  listAssets,
  TRANSITIONS,
};