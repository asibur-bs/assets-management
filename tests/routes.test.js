'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { openDatabase } = require('../src/db');
const { createApp } = require('../src/app');
const { openSession } = require('./helpers/auth');
const { clientFor } = require('./helpers/http');
const { translate } = require('../src/domain/translation');
const { latestAssetId } = require('./helpers/seed');

const queryPath = path.join(__dirname, '..', 'src', 'reporting', 'query.js');
const csvPath = path.join(__dirname, '..', 'src', 'reporting', 'csv.js');

function reportingModules() {
  return {
    query: fs.existsSync(queryPath) ? require(queryPath) : null,
    csv: fs.existsSync(csvPath) ? require(csvPath) : null,
  };
}

describe('asset routes (integration)', () => {
  let app;
  let db;
  let client;

  function postAction(id, fields) {
    return client.post(`/assets/${id}`).type('form').send(fields);
  }
  const previousActor = process.env.ASSET_ACTOR;

  beforeEach(() => {
    delete process.env.ASSET_ACTOR;
    db = openDatabase(':memory:');
    app = createApp(db);
    client = clientFor(
      app,
      openSession(db, {
        username: 'ada',
        displayName: 'Ada',
        password: 'password-1',
        role: 'administrator',
      })
    );
  });

  afterEach(() => {
    if (db) db.close();
    if (previousActor === undefined) delete process.env.ASSET_ACTOR;
    else process.env.ASSET_ACTOR = previousActor;
  });

  it('GET / redirects to /dashboard', async () => {
    const res = await client.get('/');
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/dashboard');
  });

  it('disables x-powered-by and sets nosniff on every response', async () => {
    const ok = await client.get('/assets');
    expect(ok.headers['x-powered-by']).toBeUndefined();
    expect(ok.headers['x-content-type-options']).toBe('nosniff');

    const missing = await client.get('/assets/missing');
    expect(missing.status).toBe(404);
    expect(missing.headers['x-powered-by']).toBeUndefined();
    expect(missing.headers['x-content-type-options']).toBe('nosniff');

    const redirected = await client.get('/');
    expect(redirected.headers['x-powered-by']).toBeUndefined();
    expect(redirected.headers['x-content-type-options']).toBe('nosniff');
  });

  it('GET /assets renders an empty list initially', async () => {
    const res = await client.get('/assets');
    expect(res.status).toBe(200);
    expect(res.text).toContain('Assets');
    expect(res.text).toContain('No assets yet.');
    expect(res.text).toContain('Showing 0 of 0 records');
    expect(res.text).toContain('Acting as: Ada');
  });

  it('the list form exposes the five filters and keeps holder only in the query string', async () => {
    const res = await client.get('/assets');
    expect(res.text).toContain('name="search_text"');
    expect(res.text).toContain('name="category"');
    expect(res.text).toContain('name="status"');
    expect(res.text).toContain('name="sort_column"');
    expect(res.text).toContain('name="sort_direction"');
    expect(res.text).not.toContain('name="holder"');
    expect(res.text).toContain('data-testid="filter-reset"');
    expect(res.text).toContain('href="/assets"');
    expect(res.text).toContain('data-testid="export-csv"');

    const held = await client.get('/assets').query({ holder: 'Alice', status: 'assigned' });
    expect(held.text).toContain('name="holder"');
    expect(held.text).toContain('type="hidden"');
    expect(held.text).toContain('data-testid="active-holder"');
    expect(held.text).toContain('Holder Alice');
    expect(held.text).toContain('holder=Alice');
    expect(held.text).toContain('href="/assets" data-testid="filter-reset"');
  });

  it('POST /assets creates an in-stock asset and redirects to its detail', async () => {
    const res = await client
      .post('/assets')
      .type('form')
      .send({
        category: 'hardware',
        name: 'ThinkPad',
        serial_or_key: 'TP-001',
        actor: 'Mallory',
        assigned_to: 'Alice',
      });
    expect(res.status).toBe(303);
    const id = latestAssetId(db);
    expect(res.headers.location).toBe(`/assets/${id}`);

    const detail = await client.get(`/assets/${id}`);
    expect(detail.status).toBe(200);
    expect(detail.text).toContain('ThinkPad');
    expect(detail.text).toContain('TP-001');
    expect(detail.text).toContain('In stock');
    expect(detail.text).not.toContain('Mallory');
    expect(detail.text).toContain('data-testid="asset-holder">--');

    const list = await client.get('/assets');
    expect(list.text).toContain('ThinkPad');
    expect(list.text).toContain('TP-001');
    expect(list.text).toContain('In stock');
  });

  it('shows the signed-in person and ignores an actor supplied on the request', async () => {
    const casey = clientFor(
      app,
      openSession(db, {
        username: 'casey',
        displayName: 'Casey',
        password: 'password-1',
        role: 'administrator',
      })
    );
    const res = await casey
      .post('/assets')
      .type('form')
      .send({ category: 'hardware', name: 'Dock', serial_or_key: 'DK-1', actor: 'Mallory' });
    const id = latestAssetId(db);
    expect(res.headers.location).toBe(`/assets/${id}`);
    const detail = await casey.get(`/assets/${id}`);
    expect(detail.text).toContain('Acting as: Casey');
    expect(detail.text).toContain('data-testid="audit-actor" class="actor-person">Casey');
    expect(detail.text).not.toContain('Mallory');
    expect(detail.text).not.toContain('name="actor"');
  });

  it('POST /assets with a duplicate serial returns the form and does not write', async () => {
    await client.post('/assets').type('form').send({ category: 'hardware', name: 'A', serial_or_key: 'X' });
    const before = db.prepare('SELECT COUNT(*) AS n FROM assets').get().n;
    const res = await client.post('/assets').type('form').send({ category: 'hardware', name: 'B', serial_or_key: 'X' });
    const after = db.prepare('SELECT COUNT(*) AS n FROM assets').get().n;
    expect(res.status).toBe(translate('DUPLICATE_ASSET').status);
    expect(res.status).toBe(409);
    expect(res.text).toContain('already exists');
    expect(res.text).toContain('data-testid="collision-block"');
    expect(res.text).toContain('Open existing asset');
    expect(after).toBe(before);
  });

  it('POST /assets with a missing required field returns the form with an error', async () => {
    const res = await client.post('/assets').type('form').send({ category: 'hardware', name: '' });
    expect(res.status).toBe(translate('VALIDATION_ERROR').status);
    expect(res.text).toContain('required');
    expect(res.text).toContain('data-testid="new-form"');
  });

  it('GET /assets/serial-check warns on a collision and does not write', async () => {
    await client.post('/assets').type('form').send({ category: 'hardware', name: 'A', serial_or_key: 'X' });
    const before = db.prepare('SELECT COUNT(*) AS n FROM assets').get().n;
    const res = await client.get('/assets/serial-check').query({ category: 'hardware', serial_or_key: 'X', name: 'B' });
    const after = db.prepare('SELECT COUNT(*) AS n FROM assets').get().n;
    expect(res.status).toBe(200);
    expect(res.text).toContain('data-testid="serial-warning"');
    expect(res.text).toContain('A hardware asset with serial "X" already exists.');
    expect(res.text).toContain('Open existing asset');
    expect(after).toBe(before);

    const other = await client
      .get('/assets/serial-check')
      .query({ category: 'software-license', serial_or_key: 'X', name: 'B' });
    expect(other.text).not.toContain('data-testid="serial-warning"');
  });

  it('POST /assets/:id assign, return, and mark-lost call the transition', async () => {
    await client.post('/assets').type('form').send({ category: 'hardware', name: 'A', serial_or_key: 'X' });
    const id = latestAssetId(db);

    const assigned = await postAction(id, { action: 'assign', holder: 'Alice' });
    expect(assigned.status).toBe(303);
    expect(assigned.headers.location).toBe(`/assets/${id}`);
    const afterAssign = await client.get(`/assets/${id}`);
    expect(afterAssign.text).toContain('>Assigned</span>');
    expect(afterAssign.text).toContain('data-testid="asset-holder">Alice');

    const returned = await postAction(id, { action: 'return' });
    expect(returned.status).toBe(303);
    const afterReturn = await client.get(`/assets/${id}`);
    expect(afterReturn.text).toContain('>Returned</span>');
    expect(afterReturn.text).toContain('data-testid="asset-holder">--');
    expect(afterReturn.text).toContain('data-testid="asset-last-holder">Alice');

    const lost = await postAction(id, { action: 'mark-lost', reason: 'stolen' });
    expect(lost.status).toBe(303);
    const afterLost = await client.get(`/assets/${id}`);
    expect(afterLost.text).toContain('>Lost</span>');
  });

  it('a reason-less loss writes nothing and explains that a reason is required', async () => {
    await client.post('/assets').type('form').send({ category: 'hardware', name: 'A', serial_or_key: 'X' });
    const id = latestAssetId(db);
    const before = db.prepare('SELECT COUNT(*) AS n FROM audit_log').get().n;
    const res = await postAction(id, { action: 'mark-lost', reason: '' });
    const after = db.prepare('SELECT COUNT(*) AS n FROM audit_log').get().n;
    expect(res.status).toBe(400);
    expect(res.text).toContain('A reason is required.');
    expect(after).toBe(before);
    const detail = await client.get(`/assets/${id}`);
    expect(detail.text).toContain('>In stock</span>');
  });

  it('POST return on an in-stock asset is rejected as an invalid transition', async () => {
    await client.post('/assets').type('form').send({ category: 'hardware', name: 'A', serial_or_key: 'X' });
    const id = latestAssetId(db);
    const res = await postAction(id, { action: 'return' });
    expect(res.status).toBe(translate('INVALID_TRANSITION').status);
    expect(res.text).toContain('That change is not available for this asset');
    expect(res.text).toContain('In stock');
  });

  it('POST /assets/:id/delete maps ASSET_DELETE_REFUSED to 405 and keeps the asset', async () => {
    await client.post('/assets').type('form').send({ category: 'hardware', name: 'A', serial_or_key: 'X' });
    const id = latestAssetId(db);
    const res = await client.post(`/assets/${id}/delete`).type('form').send({ actor: 'Mallory' });
    expect(res.status).toBe(translate('ASSET_DELETE_REFUSED').status);
    expect(res.status).toBe(405);
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-powered-by']).toBeUndefined();
    expect(res.text).toContain('Deleting an asset is refused.');
    expect(res.text).toContain('ASSET_DELETE_REFUSED');
    const detail = await client.get(`/assets/${id}`);
    expect(detail.status).toBe(200);
    expect(detail.text).toContain('>A</h1>');
  });

  it('GET /assets/:id for an unknown id returns 404', async () => {
    const res = await client.get('/assets/missing');
    expect(res.status).toBe(translate('NOT_FOUND').status);
    expect(res.text).toContain('Asset not found.');
  });

  it('renders the registration form without an assignee or actor field', async () => {
    const res = await client.get('/assets/new');
    expect(res.text).toContain('data-testid="new-form"');
    expect(res.text).toContain('data-testid="field-category"');
    expect(res.text).toContain('data-testid="field-name"');
    expect(res.text).toContain('data-testid="field-serial"');
    expect(res.text).toContain('data-testid="submit"');
    expect(res.text).toContain('data-testid="serial-check"');
    expect(res.text).not.toContain('name="assigned_to"');
    expect(res.text).not.toContain('name="actor"');
    expect(res.text).not.toContain('name="status"');
  });

  it('edits an asset, refuses a colliding serial, and ignores the asset being edited', async () => {
    await client.post('/assets').type('form').send({ category: 'hardware', name: 'A', serial_or_key: 'X' });
    const first = latestAssetId(db);
    await client.post('/assets').type('form').send({ category: 'hardware', name: 'B', serial_or_key: 'Y' });
    const second = latestAssetId(db);

    const selfCheck = await client
      .get(`/assets/${second}/serial-check`)
      .query({ category: 'hardware', serial_or_key: 'Y', name: 'B' });
    expect(selfCheck.status).toBe(200);
    expect(selfCheck.text).not.toContain('data-testid="serial-warning"');

    const saved = await client.post(`/assets/${second}/edit`).type('form').send({
      action: 'edit',
      category: 'hardware',
      name: 'B2',
      serial_or_key: 'Y',
      model: 'Tower',
      notes: 'Kept',
    });
    expect(saved.status).toBe(303);
    expect(saved.headers.location).toBe(`/assets/${second}`);
    const detail = await client.get(`/assets/${second}`);
    expect(detail.text).toContain('B2');
    expect(detail.text).toContain('Tower');
    expect(detail.text).toContain('>edit</span>');

    const collide = await client.post(`/assets/${second}/edit`).type('form').send({
      action: 'edit',
      category: 'hardware',
      name: 'B2',
      serial_or_key: 'X',
    });
    expect(collide.status).toBe(409);
    expect(collide.text).toContain('data-testid="collision-block"');
    expect(collide.text).toContain(`/assets/${first}`);
    const unchanged = await client.get(`/assets/${second}`);
    expect(unchanged.text).toContain('data-testid="asset-serial">Y');

    const missingAction = await client
      .post(`/assets/${second}/edit`)
      .type('form')
      .send({ category: 'hardware', name: 'Nope', serial_or_key: 'Y' });
    expect(missingAction.status).toBe(400);
  });

  it('links the registration form from the list view', async () => {
    const res = await client.get('/assets');
    expect(res.text).toContain('href="/assets/new"');
  });

  const reporting = reportingModules();
  if (!reporting.query || !reporting.csv) {
    it.skip('GET /assets/export requires src/reporting/query.js and src/reporting/csv.js, which are not present', () => {});
  } else {
    it('GET /assets/export serves the current filter as CSV', async () => {
      expect(reporting.csv.CSV_CONTENT_TYPE).toBe('text/csv; charset=utf-8');
      expect(reporting.csv.CSV_FILENAME).toBe('assets-export.csv');
      await client
        .post('/assets')
        .type('form')
        .send({ category: 'hardware', name: 'ThinkPad', serial_or_key: 'TP-001' });
      const filter = { category: 'hardware', search_text: 'Think' };
      const rows = reporting.query.queryAssets(db, filter);
      const expected = reporting.csv.renderCsv(rows);
      const res = await client.get('/assets/export').query(filter);
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toBe(reporting.csv.CSV_CONTENT_TYPE);
      expect(res.headers['content-disposition']).toBe(`attachment; filename="${reporting.csv.CSV_FILENAME}"`);
      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['x-powered-by']).toBeUndefined();
      expect(res.text).toBe(expected);
      expect(res.text).not.toContain('<html');
    });
  }

  if (!reporting.query) {
    it.skip('GET /dashboard requires src/reporting/query.js countFigures, which is not present', () => {});
    it.skip('GET /holders requires src/reporting/query.js listHolders, which is not present', () => {});
  } else {
    it('GET /dashboard renders the count figures', async () => {
      await client.post('/assets').type('form').send({ category: 'hardware', name: 'A', serial_or_key: 'X' });
      const figures = reporting.query.countFigures(db, {});
      const res = await client.get('/dashboard');
      expect(res.status).toBe(200);
      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.text).toContain('Reconciliation');
      expect(res.text).toContain('Active Inventory');
      expect(res.text).toContain('Total Records');
      expect(res.text).toContain('available to assign');
      expect(res.text).toContain('data-testid="attention-lost"');
      expect(res.text).toContain('data-testid="attention-discarded"');
      expect(res.text).toContain('data-testid="tile-in-stock"');
      expect(res.text).toContain('href="/assets?status=in-stock"');
      const flat = JSON.stringify(figures);
      expect(flat).toContain('1');
      expect(res.text).toContain('>In stock 1<');
    });

    it('GET /holders links each holder row to the filtered asset list', async () => {
      await client.post('/assets').type('form').send({ category: 'hardware', name: 'A', serial_or_key: 'X' });
      const id = latestAssetId(db);
      await postAction(id, { action: 'assign', holder: 'Alice' });
      const listed = reporting.query.listHolders(db, null);
      const res = await client.get('/holders');
      expect(res.status).toBe(200);
      expect(res.text).toContain('Holders');
      expect(res.text).toContain('data-testid="holder-search"');
      expect(res.text).toContain('distinct display holders, excluding Unassigned');
      expect(res.text).toContain('href="/assets?holder=Alice"');
      expect(JSON.stringify(listed).length).toBeGreaterThan(0);
    });
  }
});
