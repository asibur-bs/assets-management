'use strict';

const { DUMMY_HASH, verifyPassword } = require('../auth/passwords');
const { noteFailure, noteSuccess, tooManyAttempts } = require('../auth/throttle');
const { getUserByUsername } = require('../auth/users');
const { COOKIE_NAME, HOME_PATH, cookieOptions, createSession, deleteSession, readCookie, safeNext } = require('../auth/sessions');

const SIGN_IN_FAILURE = 'The username or password is not valid.';

function signInPage(res, status, fields) {
  res.status(status).render('sign-in', {
    username: fields.username || '',
    next: fields.next || HOME_PATH,
    error: fields.error || '',
  });
}

function mountAuthRoutes(app, db) {
  app.get('/sign-in', (req, res) => {
    if (req.principal) {
      res.redirect(safeNext(req.query.next));
      return;
    }
    signInPage(res, 200, { next: safeNext(typeof req.query.next === 'string' ? req.query.next : HOME_PATH) });
  });

  app.post('/sign-in', (req, res) => {
    const username = typeof req.body.username === 'string' ? req.body.username : '';
    const password = typeof req.body.password === 'string' ? req.body.password : '';
    const next = safeNext(typeof req.body.next === 'string' ? req.body.next : HOME_PATH);
    if (tooManyAttempts(username)) {
      signInPage(res, 401, { username, next, error: SIGN_IN_FAILURE });
      return;
    }
    const user = getUserByUsername(db, username);
    const passwordOk = verifyPassword(password, user ? user.passwordHash : DUMMY_HASH);
    if (!user || !passwordOk || user.disabledAt) {
      noteFailure(username);
      signInPage(res, 401, { username, next, error: SIGN_IN_FAILURE });
      return;
    }
    noteSuccess(username);
    deleteSession(db, readCookie(req, COOKIE_NAME));
    const session = createSession(db, user.id);
    res.cookie(COOKIE_NAME, session.id, cookieOptions(session.maxAgeMs));
    res.redirect(303, next);
  });
}

function signOut(db) {
  return function endSession(req, res) {
    deleteSession(db, readCookie(req, COOKIE_NAME));
    res.clearCookie(COOKIE_NAME, cookieOptions(0));
    res.redirect(303, '/sign-in');
  };
}

module.exports = { mountAuthRoutes, signOut, SIGN_IN_FAILURE };
