'use strict';

const { randomUUID } = require('node:crypto');

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validationError(errors) {
  const err = new Error(errors.join(' '));
  err.code = 'VALIDATION_ERROR';
  err.details = errors;
  return err;
}

function clean(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function nowIso(db) {
  return db.prepare("SELECT strftime('%Y-%m-%dT%H:%M:%fZ', 'now') AS ts").get().ts;
}

function validate(input) {
  const name = clean(input.name);
  const email = clean(input.email).toLowerCase();
  const note = clean(input.note);
  const errors = [];
  if (name.length < 1 || name.length > 80) errors.push('Name must be between 1 and 80 characters.');
  if (!EMAIL_PATTERN.test(email) || email.length > 200) errors.push('Enter a valid email address.');
  if (note.length > 120) errors.push('Note must be 120 characters or fewer.');
  return { name, email, note: note.length ? note : null, errors };
}

const COLUMNS = `id, name, email, note, created_at AS createdAt, updated_at AS updatedAt`;

function getPerson(db, id) {
  return db.prepare(`SELECT ${COLUMNS} FROM people WHERE id = ?`).get(id) || null;
}

function searchClause(search) {
  const needle = clean(search).toLowerCase().replace(/[\\%_]/g, '');
  if (!needle) return { sql: '', args: [] };
  const like = `%${needle}%`;
  return {
    sql: `WHERE LOWER(name) LIKE ? OR LOWER(email) LIKE ? OR LOWER(COALESCE(note, '')) LIKE ?`,
    args: [like, like, like],
  };
}

function listPeople(db, search) {
  const filter = searchClause(search);
  return db
    .prepare(
      `SELECT ${COLUMNS} FROM people ${filter.sql} ORDER BY created_at DESC, name COLLATE NOCASE, email COLLATE NOCASE`
    )
    .all(...filter.args);
}

function countPeople(db) {
  return db.prepare('SELECT COUNT(*) AS n FROM people').get().n;
}

function listPeoplePage(db, search, offset, limit) {
  const size = Number.isInteger(limit) && limit > 0 ? Math.min(limit, 20) : 4;
  const start = Number.isInteger(offset) && offset > 0 ? offset : 0;
  const filter = searchClause(search);
  const total = Number(db.prepare(`SELECT COUNT(*) AS n FROM people ${filter.sql}`).get(...filter.args).n);
  const people = db
    .prepare(
      `SELECT ${COLUMNS} FROM people ${filter.sql}
        ORDER BY name COLLATE NOCASE, email COLLATE NOCASE
        LIMIT ? OFFSET ?`
    )
    .all(...filter.args, size, start);
  return { people, total, offset: start, limit: size };
}

function holdingCounts(db) {
  const rows = db
    .prepare(
      `SELECT assigned_person_id AS id, COUNT(*) AS n
         FROM assets
        WHERE status = 'assigned' AND assigned_person_id IS NOT NULL
        GROUP BY assigned_person_id`
    )
    .all();
  const counts = new Map();
  for (const row of rows) counts.set(row.id, Number(row.n));
  return counts;
}

function insertPerson(db, fields) {
  const id = randomUUID();
  const now = nowIso(db);
  try {
    db.prepare(
      `INSERT INTO people (id, name, email, note, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`
    ).run(id, fields.name, fields.email, fields.note, now, now);
  } catch (err) {
    if (err && err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      throw validationError(['That email is already used.']);
    }
    throw err;
  }
  return getPerson(db, id);
}

function createPerson(db, input) {
  const fields = validate(input || {});
  if (fields.errors.length) throw validationError(fields.errors);
  return insertPerson(db, fields);
}

function updatePerson(db, id, input) {
  const current = getPerson(db, id);
  if (!current) {
    const err = new Error('Person not found.');
    err.code = 'NOT_FOUND';
    throw err;
  }
  const fields = validate(input || {});
  if (fields.errors.length) throw validationError(fields.errors);
  try {
    db.prepare(`UPDATE people SET name = ?, email = ?, note = ?, updated_at = ? WHERE id = ?`).run(
      fields.name,
      fields.email,
      fields.note,
      nowIso(db),
      id
    );
  } catch (err) {
    if (err && err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      throw validationError(['That email is already used.']);
    }
    throw err;
  }
  if (current.name !== fields.name) {
    db.prepare(`UPDATE assets SET assigned_to = ? WHERE assigned_person_id = ?`).run(fields.name, id);
    db.prepare(`UPDATE assets SET last_assigned_to = ? WHERE last_assigned_person_id = ?`).run(fields.name, id);
  }
  return getPerson(db, id);
}

module.exports = {
  countPeople,
  createPerson,
  getPerson,
  holdingCounts,
  listPeople,
  listPeoplePage,
  updatePerson,
};
