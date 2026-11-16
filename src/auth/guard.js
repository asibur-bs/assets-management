'use strict';

const { runAsPrincipal } = require('../auth/principal');
const { COOKIE_NAME, cookieOptions, readCookie, readSession, tokensMatch } = require('../auth/sessions');

function forbidden(message) {
  const err = new Error(message);
  err.code = 'FORBIDDEN';
  return err;
}

function attachPrincipal(db) {
  return function attach(req, res, next) {
    res.setHeader('Cache-Control', 'no-store');
    const sessionId = readCookie(req, COOKIE_NAME);
    const principal = readSession(db, sessionId);
    if (sessionId && !principal) {
      res.clearCookie(COOKIE_NAME, cookieOptions(0));
    }
    req.principal = principal;
    res.locals.principal = principal;
    res.locals.actor = principal ? principal.displayName : '';
    res.locals.canWrite = Boolean(principal && principal.role === 'administrator');
    res.locals.csrfToken = principal ? principal.csrf : '';
    runAsPrincipal(principal, () => next());
  };
}

function requireUser(req, res, next) {
  if (req.principal) return next();
  if (req.method === 'GET' || req.method === 'HEAD') {
    const nextPath = encodeURIComponent(req.originalUrl || '/assets');
    res.redirect(`/sign-in?next=${nextPath}`);
    return;
  }
  res.status(401).render('error', { message: 'Sign in to continue.', code: 'UNAUTHENTICATED' });
}

function requireCsrf(req, res, next) {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') return next();
  const supplied = req.body && typeof req.body._csrf === 'string' ? req.body._csrf : '';
  const expected = req.principal ? req.principal.csrf : '';
  if (!tokensMatch(supplied, expected)) {
    res.status(403).render('error', {
      message: 'The form could not be confirmed. Go back and submit it again.',
      code: 'FORBIDDEN',
    });
    return;
  }
  next();
}

function requireWriter(req, res, next) {
  if (req.principal && req.principal.role === 'administrator') return next();
  next(forbidden('You do not have permission to change assets.'));
}

module.exports = {
  attachPrincipal,
  requireCsrf,
  requireUser,
  requireWriter,
};
