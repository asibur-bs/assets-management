'use strict';

const request = require('supertest');
const { openDatabase } = require('../src/db');
const { createApp } = require('../src/app');
const { seedTwoAssets, latestAssetId } = require('./helpers/seed');

describe('asset routes (integration)', () => {
  let app;
  let db;

  beforeEach(() => {
    db = openDatabase(':memory:');
    app = createApp(db);
  });

  afterEach(() => {
    if (db) db.close();
  });

  it('GET / redirects to /assets', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/assets');
  });

  it('GET /assets renders an empty list initially', async () => {
    const res = await request(app).get('/assets');
    expect(res.status).toBe(200);
    expect(res.text).toContain('Assets');
    expect(res.text).toContain('No assets yet.');
  });

  // FR1.4 — a successful registration redirects to the asset LIST view, and the
  // new asset is visible in that list.
  it('POST /assets creates an asset and redirects to the asset list (FR1.4)', async () => {
    const res = await request(app)
      .post('/assets')
      .type('form')
      .send({ category: 'hardware', name: 'ThinkPad', serial_or_key: 'TP-001' });
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/assets');

    const list = await request(app).get('/assets');
    expect(list.status).toBe(200);
    expect(list.text).toContain('ThinkPad');
    expect(list.text).toContain('TP-001');
  });

  // FR1.5 — a registration that carries an assignee still lands on the list
  // view, and the asset is listed in the `in-stock` state.
  it('POST /assets stores the assignee as a field and lists the asset as in-stock (FR1.5)', async () => {
    const res = await request(app)
      .post('/assets')
      .type('form')
      .send({ category: 'hardware', name: 'ThinkPad', serial_or_key: 'TP-002', assigned_to: 'Alice' });
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/assets');

    const list = await request(app).get('/assets');
    expect(list.text).toContain('in-stock');
    expect(list.text).toContain('Alice');
  });

  it('POST /assets with duplicate serial returns the form with an error', async () => {
    await request(app).post('/assets').type('form').send({ category: 'hardware', name: 'A', serial_or_key: 'X' });
    const res = await request(app).post('/assets').type('form').send({ category: 'hardware', name: 'B', serial_or_key: 'X' });
    expect(res.status).toBe(400);
    expect(res.text).toContain('already exists');
  });

  it('POST /assets with a missing required field returns the form with an error', async () => {
    const res = await request(app).post('/assets').type('form').send({ category: 'hardware', name: '' });
    expect(res.status).toBe(400);
    expect(res.text).toContain('required');
  });

  it('POST /assets/:id/assign transitions to assigned', async () => {
    const create = await request(app).post('/assets').type('form').send({ category: 'hardware', name: 'A', serial_or_key: 'X' });
    const id = latestAssetId(db);
    const res = await request(app).post(`/assets/${id}/assign`).type('form').send({ assigned_to: 'Alice' });
    expect(res.status).toBe(302);
    const detail = await request(app).get(`/assets/${id}`);
    expect(detail.text).toContain('assigned');
  });

  it('POST /assets/:id/return transitions assigned -> returned', async () => {
    const create = await request(app)
      .post('/assets')
      .type('form')
      .send({ category: 'hardware', name: 'A', serial_or_key: 'X' });
    const id = latestAssetId(db);
    await request(app).post(`/assets/${id}/assign`).type('form').send({ assigned_to: 'Alice' });
    const res = await request(app).post(`/assets/${id}/return`);
    expect(res.status).toBe(302);
    const detail = await request(app).get(`/assets/${id}`);
    expect(detail.text).toContain('returned');
  });

  it('POST /assets/:id/lost transitions to the terminal lost state', async () => {
    const create = await request(app)
      .post('/assets')
      .type('form')
      .send({ category: 'hardware', name: 'A', serial_or_key: 'X' });
    const id = latestAssetId(db);
    await request(app).post(`/assets/${id}/assign`).type('form').send({ assigned_to: 'Alice' });
    const res = await request(app).post(`/assets/${id}/lost`);
    expect(res.status).toBe(302);
    const detail = await request(app).get(`/assets/${id}`);
    expect(detail.text).toContain('lost');
  });

  it('POST /assets/:id/return on an in-stock asset is rejected as an invalid transition', async () => {
    const create = await request(app)
      .post('/assets')
      .type('form')
      .send({ category: 'hardware', name: 'A', serial_or_key: 'X' });
    const id = latestAssetId(db);
    const res = await request(app).post(`/assets/${id}/return`);
    expect(res.status).toBe(400);
    expect(res.text).toContain('cannot transition');
  });

  it('GET /assets/:id for unknown id returns 404', async () => {
    const res = await request(app).get('/assets/missing');
    expect(res.status).toBe(404);
  });

  it('renders the create form with the data-testid attributes required by NFR/UI automation', async () => {
    const res = await request(app).get('/assets/new');
    expect(res.text).toContain('data-testid="new-form"');
    expect(res.text).toContain('data-testid="field-category"');
    expect(res.text).toContain('data-testid="submit"');
  });

  it('renders list with a search input', async () => {
    const res = await request(app).get('/assets');
    expect(res.text).toContain('data-testid="filter-q"');
  });

  // NFR1 — registration is reachable from the list view in 2 clicks or fewer:
  // the list view links straight to the form.
  it('links the registration form from the list view (NFR1)', async () => {
    const res = await request(app).get('/assets');
    expect(res.text).toContain('href="/assets/new"');
  });
});
