'use strict';

const crypto = require('node:crypto');
const { hashPassword } = require('./passwords');

const ROLES = Object.freeze(['administrator', 'reader']);
const USERNAME_PATTERN = /^[a-z0-9][a-z0-9._-]{0,63}$/;

const PUBLIC_COLUMNS = `id, username, display_name AS displayName, role, disabled_at AS disabledAt,
  created_at AS createdAt, updated_at AS updatedAt`;

function validationError(errors) {
  const err = new Error(errors.join(' '));
  err.code = 'VALIDATION_ERROR';
  err.details = errors;
  return err;
}

function normalizeUsername(value) {
  if (typeof value !== 'string') return '';
  return value.trim().toLowerCase();
}

function normalizeDisplayName(value) {
  if (typeof value !== 'string') return '';
  return value.trim();
}

function displayInitials(displayName) {
  const parts = String(displayName || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return '?';
  const letters = parts.length === 1 ? parts[0].slice(0, 2) : `${parts[0][0]}${parts[parts.length - 1][0]}`;
  return letters.toUpperCase();
}

function normalizeRole(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function usernameError(username) {
  if (!USERNAME_PATTERN.test(username)) {
    return 'Username must start with a letter or number and use only letters, numbers, dots, underscores, or hyphens.';
  }
  return null;
}

function displayNameError(displayName) {
  if (displayName.length < 1 || displayName.length > 80) {
    return 'Display name must be between 1 and 80 characters.';
  }
  if (displayName.toLowerCase() === 'system') {
    return 'Display name system is reserved.';
  }
  return null;
}

function roleError(role) {
  if (!ROLES.includes(role)) return 'Role must be administrator or reader.';
  return null;
}

function passwordError(password) {
  if (typeof password !== 'string' || password.length < 8 || password.length > 200) {
    return 'Password must be between 8 and 200 characters.';
  }
  return null;
}

function getUser(db, id) {
  return db.prepare(`SELECT ${PUBLIC_COLUMNS} FROM users WHERE id = ?`).get(id) || null;
}

function getUserByUsername(db, username) {
  return (
    db
      .prepare(
        `SELECT id, username, display_name AS displayName, password_hash AS passwordHash, role,
                disabled_at AS disabledAt
         FROM users WHERE username = ?`
      )
      .get(normalizeUsername(username)) || null
  );
}

function listUsers(db) {
  return db.prepare(`SELECT ${PUBLIC_COLUMNS} FROM users ORDER BY created_at DESC, username COLLATE NOCASE`).all();
}

function countActiveAdministrators(db) {
  return db.prepare(`SELECT COUNT(*) AS n FROM users WHERE role = 'administrator' AND disabled_at IS NULL`).get().n;
}

function insertUser(db, fields) {
  const id = crypto.randomUUID();
  db.prepare(
    `INSERT INTO users (id, username, display_name, password_hash, role, disabled_at)
     VALUES (?, ?, ?, ?, ?, NULL)`
  ).run(id, fields.username, fields.displayName, hashPassword(fields.password), fields.role);
  return getUser(db, id);
}

function createUser(db, input) {
  const source = input && typeof input === 'object' ? input : {};
  const username = normalizeUsername(source.username);
  const displayName = normalizeDisplayName(source.displayName);
  const role = normalizeRole(source.role);
  const errors = [
    usernameError(username),
    displayNameError(displayName),
    roleError(role),
    passwordError(source.password),
  ].filter(Boolean);
  if (errors.length) throw validationError(errors);
  if (getUserByUsername(db, username)) {
    throw validationError(['That username is already in use.']);
  }
  return insertUser(db, { username, displayName, role, password: source.password });
}

function updateUser(db, id, input, actorId) {
  const source = input && typeof input === 'object' ? input : {};
  const current = getUser(db, id);
  if (!current) {
    const err = new Error('User not found.');
    err.code = 'NOT_FOUND';
    throw err;
  }
  const displayName = Object.prototype.hasOwnProperty.call(source, 'displayName')
    ? normalizeDisplayName(source.displayName)
    : current.displayName;
  const role = Object.prototype.hasOwnProperty.call(source, 'role') ? normalizeRole(source.role) : current.role;
  const disabled = Object.prototype.hasOwnProperty.call(source, 'disabled')
    ? Boolean(source.disabled)
    : Boolean(current.disabledAt);
  const errors = [displayNameError(displayName), roleError(role)];
  let nextPassword = null;
  if (typeof source.password === 'string' && source.password.length > 0) {
    const passwordProblem = passwordError(source.password);
    if (passwordProblem) errors.push(passwordProblem);
    else nextPassword = source.password;
  }
  const problems = errors.filter(Boolean);
  if (problems.length) throw validationError(problems);

  if (actorId === id && disabled) {
    throw validationError(['You cannot disable the account you are signed in with.']);
  }
  const activeAdmin = current.role === 'administrator' && !current.disabledAt;
  const staysActiveAdmin = role === 'administrator' && !disabled;
  if (activeAdmin && !staysActiveAdmin && countActiveAdministrators(db) <= 1) {
    throw validationError(['The last active administrator must stay an active administrator.']);
  }

  const disabledAt = disabled ? current.disabledAt || new Date().toISOString() : null;
  if (nextPassword) {
    db.prepare(
      `UPDATE users
       SET display_name = ?, role = ?, disabled_at = ?, password_hash = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
       WHERE id = ?`
    ).run(displayName, role, disabledAt, hashPassword(nextPassword), id);
  } else {
    db.prepare(
      `UPDATE users
       SET display_name = ?, role = ?, disabled_at = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
       WHERE id = ?`
    ).run(displayName, role, disabledAt, id);
  }
  if (disabled) {
    db.prepare('DELETE FROM sessions WHERE user_id = ?').run(id);
  }
  return getUser(db, id);
}

module.exports = {
  ROLES,
  countActiveAdministrators,
  createUser,
  displayInitials,
  getUser,
  getUserByUsername,
  listUsers,
  updateUser,
};
