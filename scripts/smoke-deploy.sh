#!/usr/bin/env bash
# Deploy smoke: register, assign, then confirm a non-empty server-written
# actor and that the audit row count did not drop. No actor column is added.
# The actor is the assignee the server stored in the assign audit description.
set -eu

if [ -z "${SMOKE_BASE_URL:-}" ]; then
  echo 'smoke-deploy: SMOKE_BASE_URL is required' >&2
  exit 1
fi

cd "$(dirname "$0")/.."

export SMOKE_DB="${DB_PATH:-data/assets.sqlite}"
export SMOKE_NAME="smoke-$(date +%Y%m%d%H%M%S)-$$"
export SMOKE_SERIAL="SMK-$$-$(date +%Y%m%d%H%M%S)"
export SMOKE_ASSIGNEE='Smoke Actor'

node <<'NODE'
'use strict';

const http = require('node:http');
const { URL } = require('node:url');
const Database = require('better-sqlite3');

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

function auditCount(dbPath) {
  const db = new Database(dbPath, { readonly: true, fileMustExist: true });
  try {
    return db.prepare('SELECT COUNT(*) AS n FROM audit_log').get().n;
  } finally {
    db.close();
  }
}

function actorFromAssign(dbPath) {
  const db = new Database(dbPath, { readonly: true, fileMustExist: true });
  try {
    const row = db
      .prepare("SELECT description FROM audit_log WHERE action = 'assign' ORDER BY id DESC LIMIT 1")
      .get();
    if (!row || typeof row.description !== 'string') return '';
    const match = row.description.match(/ to (.+)\.$/);
    return match ? match[1].trim() : '';
  } finally {
    db.close();
  }
}

async function main() {
  const base = process.env.SMOKE_BASE_URL.replace(/\/$/, '');
  const dbPath = process.env.SMOKE_DB;
  const before = auditCount(dbPath);

  const registered = await request('POST', `${base}/assets`, {
    category: 'hardware',
    name: process.env.SMOKE_NAME,
    serial_or_key: process.env.SMOKE_SERIAL,
  });
  if (registered.status !== 302 && registered.status !== 303) {
    console.error(`smoke-deploy: register failed (${registered.status})`);
    process.exit(1);
  }

  const list = await request('GET', `${base}/assets`);
  if (list.status !== 200) {
    console.error(`smoke-deploy: asset list failed (${list.status})`);
    process.exit(1);
  }
  const name = process.env.SMOKE_NAME.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const link = list.body.match(new RegExp(`href="(/assets/[^"]+)"[^>]*>${name}`));
  if (!link) {
    console.error('smoke-deploy: list page does not link the new asset');
    process.exit(1);
  }
  const id = link[1].slice('/assets/'.length);
  if (!id || id === 'new') {
    console.error('smoke-deploy: register did not yield an asset id');
    process.exit(1);
  }

  const transitioned = await request('POST', `${base}/assets/${encodeURIComponent(id)}/assign`, {
    assigned_to: process.env.SMOKE_ASSIGNEE,
  });
  if (transitioned.status !== 302 && transitioned.status !== 303) {
    console.error(`smoke-deploy: transition failed (${transitioned.status})`);
    process.exit(1);
  }

  const actor = actorFromAssign(dbPath);
  if (!actor) {
    console.error('smoke-deploy: assign audit row has an empty actor');
    process.exit(1);
  }
  const after = auditCount(dbPath);
  if (after < before) {
    console.error('smoke-deploy: audit row count dropped');
    process.exit(1);
  }
  console.log('smoke-deploy: ok');
}

main().catch((err) => {
  console.error(`smoke-deploy: ${err.message}`);
  process.exit(1);
});
NODE
