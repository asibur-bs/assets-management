'use strict';

const path = require('node:path');
const express = require('express');
const assetsRouter = require('./routes/assets');

function createApp(db) {
  const app = express();
  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, '..', 'views'));
  app.use(express.urlencoded({ extended: false }));
  app.use('/static', express.static(path.join(__dirname, '..', 'public')));

  app.get('/', (req, res) => res.redirect('/assets'));
  app.use('/assets', assetsRouter(db));

  app.use((err, req, res, next) => {
    if (res.headersSent) return next(err);
    const code = err.code;
    if (code === 'DUPLICATE_ASSET' || code === 'VALIDATION_ERROR' || code === 'INVALID_TRANSITION' || code === 'NOT_FOUND') {
      return res.status(code === 'NOT_FOUND' ? 404 : 400).render('error', { message: err.message, code });
    }
    res.status(500).render('error', { message: 'Unexpected error.', code: 'INTERNAL' });
  });

  return app;
}

module.exports = { createApp };