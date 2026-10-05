'use strict';

const express = require('express');
const service = require('../services/asset-service');

function assetsRouter(db) {
  const router = express.Router();

  router.get('/', (req, res, next) => {
    try {
      const assets = service.listAssets(db, {
        q: req.query.q ? String(req.query.q) : null,
        category: req.query.category ? String(req.query.category) : null,
        status: req.query.status ? String(req.query.status) : null,
        sort: req.query.sort === 'created_at' ? 'created_at' : 'name',
        dir: req.query.dir === 'desc' ? 'desc' : 'asc',
      });
      res.render('list', {
        assets,
        filters: {
          q: req.query.q ? String(req.query.q) : '',
          category: req.query.category ? String(req.query.category) : '',
          status: req.query.status ? String(req.query.status) : '',
          sort: req.query.sort === 'created_at' ? 'created_at' : 'name',
          dir: req.query.dir === 'desc' ? 'desc' : 'asc',
        },
      });
    } catch (err) { next(err); }
  });

  router.get('/new', (req, res) => {
    res.render('new', { values: {}, errors: [] });
  });

  router.post('/', (req, res, next) => {
    try {
      const input = {
        category: req.body.category ? String(req.body.category) : '',
        name: req.body.name ? String(req.body.name).trim() : '',
        serialOrKey: req.body.serial_or_key ? String(req.body.serial_or_key).trim() : '',
        model: req.body.model ? String(req.body.model).trim() : null,
        notes: req.body.notes ? String(req.body.notes).trim() : null,
        assignedTo: req.body.assigned_to ? String(req.body.assigned_to).trim() : null,
      };
      const asset = service.registerAsset(db, input);
      res.redirect(`/assets/${asset.id}`);
    } catch (err) {
      if (err.code === 'VALIDATION_ERROR' || err.code === 'DUPLICATE_ASSET') {
        return res.status(400).render('new', { values: req.body, errors: [err.message] });
      }
      next(err);
    }
  });

  router.get('/:id', (req, res, next) => {
    try {
      const data = service.getAssetWithAudit(db, req.params.id);
      if (!data) {
        const err = new Error('Asset not found.');
        err.code = 'NOT_FOUND';
        throw err;
      }
      res.render('detail', { asset: data.asset, audit: data.audit });
    } catch (err) { next(err); }
  });

  router.post('/:id/assign', (req, res, next) => {
    try {
      const assignee = req.body.assigned_to ? String(req.body.assigned_to).trim() : '';
      service.assignAsset(db, req.params.id, assignee);
      res.redirect(`/assets/${req.params.id}`);
    } catch (err) { next(err); }
  });

  router.post('/:id/return', (req, res, next) => {
    try {
      service.returnAsset(db, req.params.id);
      res.redirect(`/assets/${req.params.id}`);
    } catch (err) { next(err); }
  });

  router.post('/:id/lost', (req, res, next) => {
    try {
      service.markLost(db, req.params.id);
      res.redirect(`/assets/${req.params.id}`);
    } catch (err) { next(err); }
  });

  return router;
}

module.exports = assetsRouter;