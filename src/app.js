'use strict';

const path = require('node:path');
const express = require('express');
const { resolveActor } = require('./actor');
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
  app.locals.isSystemActor = isBackfillActor;

  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.locals.actor = resolveActor();
    res.locals.path = req.path;
    next();
  });
  app.use(express.urlencoded({ extended: false }));
  app.use('/static', express.static(path.join(__dirname, '..', 'public')));

  app.get('/', (req, res) => res.redirect('/assets'));
  assetsRouter.mountAuxiliaryRoutes(app, db);
  app.use('/assets', assetsRouter(db));

  app.use((err, req, res, next) => {
    if (res.headersSent) return next(err);
    const translated = translate(err && err.code);
    const known = err && err.code && translated.code === err.code;
    const status = known ? translated.status : 500;
    const message = known ? err.message : 'Unexpected error.';
    res.status(status).render('error', { message, code: known ? translated.code : 'INTERNAL' });
  });

  return app;
}

module.exports = { createApp };
