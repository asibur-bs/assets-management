'use strict';

const crypto = require('node:crypto');

const COOKIE_NAME = 'asset_session';
const SESSION_MS = 12 * 60 * 60 * 1000;

function cookieOptions(maxAgeMs) {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.COOKIE_SECURE === '1',
    path: '/',
    maxAge: maxAgeMs,
  };
}

function sessionHash(sessionId) {
  return crypto.createHash('sha256').update(sessionId).digest('hex');
}

function tokensMatch(supplied, expected) {
  if (typeof supplied !== 'string' || typeof expected !== 'string') return false;
  const left = Buffer.from(supplied);
  const right = Buffer.from(expected);
  if (left.length === 0 || left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

function createSession(db, userId) {
  const now = Date.now();
  db.prepare(`DELETE FROM sessions WHERE expires_at <= ?`).run(new Date(now).toISOString());
  const id = crypto.randomBytes(32).toString('base64url');
  const csrf = crypto.randomBytes(32).toString('base64url');
  const createdAt = new Date(now).toISOString();
  const expiresAt = new Date(now + SESSION_MS).toISOString();
  db.prepare(
    `INSERT INTO sessions (id_hash, user_id, csrf_token, created_at, expires_at)
     VALUES (?, ?, ?, ?, ?)`
  ).run(sessionHash(id), userId, csrf, createdAt, expiresAt);
  return { id, csrf, expiresAt, maxAgeMs: SESSION_MS };
}

function deleteSession(db, sessionId) {
  if (typeof sessionId !== 'string' || sessionId.length === 0) return;
  db.prepare('DELETE FROM sessions WHERE id_hash = ?').run(sessionHash(sessionId));
}

function readSession(db, sessionId) {
  if (typeof sessionId !== 'string' || sessionId.length === 0) return null;
  const row = db
    .prepare(
      `SELECT sessions.csrf_token AS csrf, sessions.expires_at AS expiresAt,
              users.id AS id, users.username AS username, users.display_name AS displayName,
              users.role AS role, users.disabled_at AS disabledAt
       FROM sessions
       JOIN users ON users.id = sessions.user_id
       WHERE sessions.id_hash = ?`
    )
    .get(sessionHash(sessionId));
  if (!row) return null;
  if (row.disabledAt || Date.parse(row.expiresAt) <= Date.now()) {
    deleteSession(db, sessionId);
    return null;
  }
  return {
    id: row.id,
    username: row.username,
    displayName: row.displayName,
    role: row.role,
    csrf: row.csrf,
  };
}

function readCookie(req, name) {
  const header = req.headers && req.headers.cookie;
  if (typeof header !== 'string' || header.length === 0) return '';
  const parts = header.split(';');
  for (const part of parts) {
    const index = part.indexOf('=');
    if (index === -1) continue;
    if (part.slice(0, index).trim() !== name) continue;
    try {
      return decodeURIComponent(part.slice(index + 1).trim());
    } catch {
      return '';
    }
  }
  return '';
}

const HOME_PATH = '/dashboard';

function safeNext(value) {
  if (typeof value !== 'string') return HOME_PATH;
  if (!value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return HOME_PATH;
  if (value.includes('://') || value.includes('\\')) return HOME_PATH;
  return value;
}

module.exports = {
  COOKIE_NAME,
  cookieOptions,
  createSession,
  deleteSession,
  readCookie,
  readSession,
  HOME_PATH,
  safeNext,
  tokensMatch,
};
