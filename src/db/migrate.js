'use strict';

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS assets (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL CHECK (category IN ('hardware', 'software-license')),
  name TEXT NOT NULL,
  serial_or_key TEXT NOT NULL,
  model TEXT,
  notes TEXT,
  status TEXT NOT NULL CHECK (status IN ('in-stock', 'assigned', 'returned', 'lost')) DEFAULT 'in-stock',
  assigned_to TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (category, serial_or_key)
);

CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  asset_id TEXT NOT NULL,
  action TEXT NOT NULL,
  description TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_audit_asset_recent ON audit_log(asset_id, id DESC);
CREATE INDEX IF NOT EXISTS idx_assets_status ON assets(status);
CREATE INDEX IF NOT EXISTS idx_assets_category ON assets(category);
`;

function applyMigrations(db) {
  db.exec(SCHEMA_SQL);
  return db;
}

module.exports = { applyMigrations, SCHEMA_SQL };