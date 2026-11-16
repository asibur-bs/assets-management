'use strict';

const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 8;

const attempts = new Map();

function bucket(username, now) {
  const key = typeof username === 'string' ? username.trim().toLowerCase() : '';
  const current = attempts.get(key);
  if (!current || now - current.startedAt > WINDOW_MS) {
    const fresh = { startedAt: now, count: 0 };
    attempts.set(key, fresh);
    return fresh;
  }
  return current;
}

function tooManyAttempts(username, now = Date.now()) {
  return bucket(username, now).count >= MAX_FAILURES;
}

function noteFailure(username, now = Date.now()) {
  bucket(username, now).count += 1;
}

function noteSuccess(username) {
  const key = typeof username === 'string' ? username.trim().toLowerCase() : '';
  attempts.delete(key);
}

function resetAttempts() {
  attempts.clear();
}

module.exports = {
  MAX_FAILURES,
  noteFailure,
  noteSuccess,
  resetAttempts,
  tooManyAttempts,
};
