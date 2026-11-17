'use strict';

const path = require('node:path');
const express = require('express');
const { attachPrincipal, requireCsrf, requireUser } = require('./auth/guard');
const { translate } = require('./domain/translation');
const {
  CATEGORY_VALUES,
  SORT_COLUMNS,
  SORT_DIRECTIONS,
  STATUS_VALUES,
  isBackfillActor,
  statusLabel,
} = require('./domain/vocabulary');
const assetsRouter = require('./routes/assets');
const { mountAuthRoutes, signOut } = require('./routes/auth');
const { mountPeopleRoutes } = require('./routes/people');
const { mountUserRoutes } = require('./routes/users');

const SORT_LABELS = {
  name: 'Name',
  created_at: 'Created',
};

const DIRECTION_LABELS = {
  asc: 'Ascending',
  desc: 'Descending',
};

function showValue(value) {
  if (value == null || value === '') return '--';
  return value;
}

function showWhen(value) {
  if (value == null || value === '') return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const day = String(date.getUTCDate()).padStart(2, '0');
  const hour = String(date.getUTCHours()).padStart(2, '0');
  const minute = String(date.getUTCMinutes()).padStart(2, '0');
  return `${day} ${months[date.getUTCMonth()]} ${date.getUTCFullYear()}, ${hour}:${minute}`;
}

function createApp(db) {
  const app = express();
  app.disable('x-powered-by');
  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, '..', 'views'));
  app.locals.statusLabel = statusLabel;
  app.locals.categories = CATEGORY_VALUES;
  app.locals.statuses = STATUS_VALUES;
  app.locals.sortColumns = SORT_COLUMNS.map((value) => ({ value, label: SORT_LABELS[value] || value }));
  app.locals.sortDirections = SORT_DIRECTIONS.map((value) => ({
    value,
    label: DIRECTION_LABELS[value] || value,
  }));
  app.locals.showValue = showValue;
  app.locals.showWhen = showWhen;
  app.locals.isSystemActor = isBackfillActor;

  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.locals.path = req.path;
    next();
  });
  app.use(express.urlencoded({ extended: false }));
  app.use('/static', express.static(path.join(__dirname, '..', 'public')));
  app.use(attachPrincipal(db));
  mountAuthRoutes(app, db);
  app.use(requireUser);
  app.use(requireCsrf);
  app.post('/sign-out', signOut(db));

  app.get('/', (req, res) => res.redirect('/dashboard'));
  mountPeopleRoutes(app, db);
  mountUserRoutes(app, db);
  assetsRouter.mountAuxiliaryRoutes(app, db);
  app.use('/assets', assetsRouter(db));

  app.use((err, req, res, next) => {
    if (res.headersSent) return next(err);
    if (err && err.code === 'FORBIDDEN') {
      res.status(403).render('error', { message: err.message, code: 'FORBIDDEN' });
      return;
    }
    const translated = translate(err && err.code);
    const known = err && err.code && translated.code === err.code;
    const status = known ? translated.status : 500;
    const message = known ? err.message : 'Unexpected error.';
    res.status(status).render('error', { message, code: known ? translated.code : 'INTERNAL' });
  });

  return app;
}

module.exports = { createApp };
