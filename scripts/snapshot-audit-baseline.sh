#!/usr/bin/env bash
# Writes pre-migration audit_log rows to SMOKE_AUDIT_BASELINE.
# Point DB_PATH at the backup copy taken before migrate, not at the live
# database after migrations have run.
set -eu

if [[ -z "${DB_PATH:-}" ]]; then
  echo "snapshot-audit-baseline: DB_PATH is required" >&2
  exit 1
fi
if [[ -z "${SMOKE_AUDIT_BASELINE:-}" ]]; then
  echo "snapshot-audit-baseline: SMOKE_AUDIT_BASELINE is required" >&2
  exit 1
fi

export DB_PATH
export SMOKE_AUDIT_BASELINE

node <<'NODE'
'use strict';

const fs = require('node:fs');
const Database = require('better-sqlite3');

const dbPath = process.env.DB_PATH;
const outPath = process.env.SMOKE_AUDIT_BASELINE;
const db = new Database(dbPath, { readonly: true, fileMustExist: true });
try {
  const cols = db.prepare('PRAGMA table_info(audit_log)').all().map((column) => column.name);
  if (!cols.includes('id')) {
    console.error('snapshot-audit-baseline: audit_log has no id column');
    process.exit(1);
  }
  const selected = ['id', 'asset_id', 'action', 'description', 'created_at'].filter((name) =>
    cols.includes(name)
  );
  if (cols.includes('actor')) selected.push('actor');
  const rows = db.prepare(`SELECT ${selected.join(', ')} FROM audit_log ORDER BY id`).all();
  fs.writeFileSync(outPath, `${JSON.stringify(rows)}\n`);
} finally {
  db.close();
}
NODE
