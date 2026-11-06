'use strict';

/**
 * Small seed helper for tests that need an existing asset row.
 *
 * The seed goes through the same repository/service path as production code,
 * so a seeded asset is a fully-formed record (UUID, timestamps, `in-stock`
 * state) rather than a hand-written SQL row.
 */

const { registerAsset } = require('../../src/services/asset-service');

/**
 * Insert one hardware asset and one software-license asset.
 *
 * @param {object} db An open better-sqlite3 database handle.
 * @returns {{hardware: object, software: object}} The two created assets.
 */
function seedTwoAssets(db) {
  const hardware = registerAsset(db, {
    category: 'hardware',
    name: 'ThinkPad X1',
    serialOrKey: 'TP-001',
    model: 'ThinkPad X1 Carbon',
  });

  const software = registerAsset(db, {
    category: 'software-license',
    name: 'Design Suite',
    serialOrKey: 'LIC-001',
    model: 'Annual',
  });

  return { hardware, software };
}

/**
 * Insert a single asset.
 *
 * @param {object} db An open better-sqlite3 database handle.
 * @param {object} overrides Fields to override on the seeded asset.
 * @returns {object} The created asset.
 */
function seedAsset(db, overrides = {}) {
  const input = {
    category: 'hardware',
    name: 'Seeded Asset',
    serialOrKey: 'SEED-001',
    ...overrides,
  };
  return registerAsset(db, input);
}

/**
 * Remove every row from the tables used by the tests. The schema itself and
 * the applied-migrations ledger are left intact.
 *
 * @param {object} db An open better-sqlite3 database handle.
 */
function resetState(db) {
  db.exec('DELETE FROM audit_log;');
  db.exec('DELETE FROM assets;');
}

/**
 * Look up the id of the most recently created asset.
 *
 * A successful registration redirects to the asset LIST view (FR1.4), so the
 * new asset's id is not in the redirect target. Tests that need the id read
 * it back from the database instead.
 *
 * @param {object} db An open better-sqlite3 database handle.
 * @returns {string} The asset id.
 */
function latestAssetId(db) {
  const row = db.prepare('SELECT id FROM assets ORDER BY rowid DESC LIMIT 1').get();
  if (!row) throw new Error('no asset has been registered yet');
  return row.id;
}

module.exports = { seedTwoAssets, seedAsset, resetState, latestAssetId };
