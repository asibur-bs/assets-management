'use strict';

const { createUser } = require('../../src/auth/users');
const { COOKIE_NAME, createSession } = require('../../src/auth/sessions');

function openSession(db, fields) {
  const user = createUser(db, {
    username: fields.username,
    displayName: fields.displayName,
    password: fields.password,
    role: fields.role,
  });
  const session = createSession(db, user.id);
  return {
    user,
    csrf: session.csrf,
    cookie: `${COOKIE_NAME}=${encodeURIComponent(session.id)}`,
  };
}

module.exports = { openSession };
