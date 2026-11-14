#!/usr/bin/env bash
# Post-deploy smoke: register → transition → require non-empty audit.actor on
# newly appended rows → require every pre-migration audit row from
# SMOKE_AUDIT_BASELINE to remain intact → require post count >= baseline + smoke
# appends. On success, prune backups to three. A missing baseline, or a baseline
# whose rows are gone, exits non-zero and does not prune.
# Does not invent the actor mechanism (OQ1): reads whatever non-empty actor the
# server stored in audit_log.actor. Fail-closed when the column is missing or empty.
set -eu

if [[ -z "${SMOKE_BASE_URL:-}" ]]; then
  echo "smoke-deploy: SMOKE_BASE_URL is required" >&2
  exit 1
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export DB_PATH="${DB_PATH:-${ROOT_DIR}/data/assets.sqlite}"
export BACKUP_ROOT="${BACKUP_ROOT:-${ROOT_DIR}/backups}"
export SMOKE_ROOT="${ROOT_DIR}"
export SMOKE_SERIAL="SMOKE-$(date +%s)-$$"
export SMOKE_BASE_URL

cd "${ROOT_DIR}"

node <<'NODE'
'use strict';

const http = require('node:http');
const { URL } = require('node:url');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const Database = require('better-sqlite3');

const base = process.env.SMOKE_BASE_URL.replace(/\/$/, '');
const dbPath = process.env.DB_PATH;
const serial = process.env.SMOKE_SERIAL;
const backupRoot = process.env.BACKUP_ROOT;
const rootDir = process.env.SMOKE_ROOT;

function request(method, urlString, fields) {
  const url = new URL(urlString);
  const body = fields ? new URLSearchParams(fields).toString() : null;
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        protocol: url.protocol,
        hostname: url.hostname,
        port: url.port,
        path: `${url.pathname}${url.search}`,
        method,
        headers: body
          ? {
              'content-type': 'application/x-www-form-urlencoded',
              'content-length': Buffer.byteLength(body),
            }
          : {},
      },
      (res) => {
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
          resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString('utf8') });
        });
      }
    );
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

function openReadonly() {
  return new Database(dbPath, { readonly: true, fileMustExist: true });
}

function requireActorColumn() {
  const db = openReadonly();
  try {
    const cols = db.prepare('PRAGMA table_info(audit_log)').all().map((c) => c.name);
    if (!cols.includes('actor')) {
      console.error('smoke-deploy: audit_log has no actor column');
      process.exit(2);
    }
  } finally {
    db.close();
  }
}

function loadBaseline() {
  const file = process.env.SMOKE_AUDIT_BASELINE;
  if (!file) {
    console.error('smoke-deploy: SMOKE_AUDIT_BASELINE is required (pre-migration snapshot)');
    process.exit(1);
  }
  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    console.error('smoke-deploy: cannot read SMOKE_AUDIT_BASELINE');
    process.exit(1);
  }
  if (!Array.isArray(parsed)) {
    console.error('smoke-deploy: SMOKE_AUDIT_BASELINE must be a JSON array');
    process.exit(1);
  }
  return parsed;
}

function loadAuditByIds(ids) {
  const db = openReadonly();
  try {
    const stmt = db.prepare(
      'SELECT id, asset_id, action, description, created_at, actor FROM audit_log WHERE id = ?'
    );
    return ids.map((id) => stmt.get(id) || null);
  } finally {
    db.close();
  }
}

function latestActor() {
  const db = openReadonly();
  try {
    const row = db.prepare('SELECT actor FROM audit_log ORDER BY id DESC LIMIT 1').get();
    if (!row || row.actor == null || String(row.actor).trim() === '') {
      console.error('smoke-deploy: latest audit actor is empty');
      process.exit(3);
    }
    return String(row.actor).trim();
  } finally {
    db.close();
  }
}

function auditCount() {
  const db = openReadonly();
  try {
    return db.prepare('SELECT COUNT(*) AS n FROM audit_log').get().n;
  } finally {
    db.close();
  }
}

function findAssetId() {
  const db = openReadonly();
  try {
    const row = db.prepare('SELECT id FROM assets WHERE serial_or_key = ?').get(serial);
    if (!row) {
      console.error('smoke-deploy: registered asset not found');
      process.exit(5);
    }
    return row.id;
  } finally {
    db.close();
  }
}

async function main() {
  requireActorColumn();
  const preRows = loadBaseline();
  const preIds = preRows.map((r) => r.id);
  const preCount = preRows.length;

  const registered = await request('POST', `${base}/assets`, {
    category: 'hardware',
    name: `Smoke Asset ${serial}`,
    serial_or_key: serial,
  });
  if (registered.status !== 302 && registered.status !== 303 && registered.status !== 200) {
    console.error(`smoke-deploy: register failed (${registered.status})`);
    process.exit(1);
  }

  const assetId = findAssetId();

  const transitioned = await request('POST', `${base}/assets/${encodeURIComponent(assetId)}/assign`, {
    assigned_to: 'Smoke Operator',
  });
  if (transitioned.status !== 302 && transitioned.status !== 303 && transitioned.status !== 200) {
    console.error(`smoke-deploy: transition failed (${transitioned.status})`);
    process.exit(1);
  }

  const actor = latestActor();
  console.error(`smoke-deploy: actor present (length=${actor.length})`);

  const afterRows = loadAuditByIds(preIds);
  for (let i = 0; i < preRows.length; i += 1) {
    const before = preRows[i];
    const after = afterRows[i];
    if (!after) {
      console.error(`smoke-deploy: pre-deploy audit id ${before.id} is missing`);
      process.exit(1);
    }
    const keys = Object.keys(before);
    const changed = keys.some((key) => after[key] !== before[key]);
    if (changed) {
      console.error(`smoke-deploy: pre-deploy audit id ${before.id} was altered`);
      process.exit(1);
    }
  }

  const postCount = auditCount();
  // Register writes one audit row; assign writes one more.
  const expectedMin = preCount + 2;
  if (postCount < expectedMin) {
    console.error(
      `smoke-deploy: expected at least ${expectedMin} audit rows (pre=${preCount} + smoke appends), got ${postCount}`
    );
    process.exit(1);
  }

  const prune = spawnSync('bash', [path.join(rootDir, 'scripts', 'prune-backups.sh')], {
    env: { ...process.env, BACKUP_ROOT: backupRoot },
    encoding: 'utf8',
  });
  if (prune.status !== 0) {
    console.error('smoke-deploy: prune-backups failed');
    process.exit(1);
  }

  console.log(`smoke-deploy: ok pre=${preCount} post=${postCount}`);
}

main().catch((err) => {
  console.error(`smoke-deploy: ${err.message}`);
  process.exit(1);
});
NODE
