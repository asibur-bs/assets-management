'use strict';

const request = require('supertest');
const { openDatabase } = require('../src/db');
const { createApp } = require('../src/app');
const { seedTwoAssets, latestAssetId } = require('./helpers/seed');

describe('view rendering (FR2, FR3)', () => {
  let app;
  let db;

  beforeEach(() => {
    db = openDatabase(':memory:');
    app = createApp(db);
  });

  afterEach(() => {
    if (db) db.close();
  });

  it('list view shows columns required by FR2.1', async () => {
    const res = await request(app).get('/assets');
    expect(res.text).toContain('<th>Name</th>');
    expect(res.text).toContain('<th>Category</th>');
    expect(res.text).toContain('<th>Serial / Key</th>');
    expect(res.text).toContain('<th>Status</th>');
    expect(res.text).toContain('<th>Assigned to</th>');
  });

  it('detail view shows all asset fields', async () => {
    const create = await request(app)
      .post('/assets')
      .type('form')
      .send({ category: 'hardware', name: 'A', serial_or_key: 'X' });
    const id = latestAssetId(db);
    const res = await request(app).get(`/assets/${id}`);
    expect(res.text).toContain('data-testid="asset-fields"');
    expect(res.text).toContain('data-testid="asset-status"');
  });

  it('detail view shows the most recent audit entry', async () => {
    const create = await request(app)
      .post('/assets')
      .type('form')
      .send({ category: 'hardware', name: 'A', serial_or_key: 'X' });
    const id = latestAssetId(db);
    const res = await request(app).get(`/assets/${id}`);
    expect(res.text).toContain('data-testid="audit-section"');
    expect(res.text).toContain('data-testid="audit-entry"');
  });

  it('list view filters by status query', async () => {
    const create = await request(app)
      .post('/assets')
      .type('form')
      .send({ category: 'hardware', name: 'A', serial_or_key: 'X' });
    const id = latestAssetId(db);
    await request(app).post(`/assets/${id}/assign`).type('form').send({ assigned_to: 'B' });
    const filtered = await request(app).get('/assets?status=assigned');
    expect(filtered.text).toContain('A');
    expect(filtered.text).toContain('assigned');
  });

  it('list view filters by category query', async () => {
    seedTwoAssets(db);
    const filtered = await request(app).get('/assets?category=software-license');
    expect(filtered.text).toContain('Design Suite');
    expect(filtered.text).not.toContain('ThinkPad X1');
  });

  it('list view searches by name', async () => {
    seedTwoAssets(db);
    const filtered = await request(app).get('/assets?q=thinkpad');
    expect(filtered.text).toContain('ThinkPad X1');
    expect(filtered.text).not.toContain('Design Suite');
  });

  // FR2.5 — every asset row links to the detail view.
  it('list view links each asset row to its detail view (FR2.5)', async () => {
    const { hardware } = seedTwoAssets(db);
    const res = await request(app).get('/assets');
    expect(res.text).toContain(`href="/assets/${hardware.id}"`);
  });

  // FR3.3 — the detail view offers the actions appropriate to the current state.
  it('detail view offers the assign action for an in-stock asset (FR3.3)', async () => {
    const create = await request(app)
      .post('/assets')
      .type('form')
      .send({ category: 'hardware', name: 'A', serial_or_key: 'X' });
    const id = latestAssetId(db);
    const res = await request(app).get(`/assets/${id}`);
    expect(res.text).toContain('data-testid="action-assign"');
    expect(res.text).not.toContain('data-testid="action-return"');
  });

  it('detail view offers the return and lost actions for an assigned asset (FR3.3)', async () => {
    const create = await request(app)
      .post('/assets')
      .type('form')
      .send({ category: 'hardware', name: 'A', serial_or_key: 'X' });
    const id = latestAssetId(db);
    await request(app).post(`/assets/${id}/assign`).type('form').send({ assigned_to: 'B' });
    const res = await request(app).get(`/assets/${id}`);
    expect(res.text).toContain('data-testid="action-return"');
    expect(res.text).toContain('data-testid="action-lost"');
  });

  // FR3.3 — a returned asset offers only the transitions valid from `returned`
  // (mark-lost and re-assign); `returned -> returned` is not a valid transition.
  it('detail view offers the lost and re-assign actions but not return for a returned asset (FR3.3)', async () => {
    const create = await request(app)
      .post('/assets')
      .type('form')
      .send({ category: 'hardware', name: 'A', serial_or_key: 'X' });
    const id = latestAssetId(db);
    await request(app).post(`/assets/${id}/assign`).type('form').send({ assigned_to: 'B' });
    await request(app).post(`/assets/${id}/return`);
    const res = await request(app).get(`/assets/${id}`);
    expect(res.text).not.toContain('data-testid="action-return"');
    expect(res.text).toContain('data-testid="action-lost"');
    expect(res.text).toContain('data-testid="action-reassign"');
  });

  it('detail view offers no transitions for a lost asset (FR4.5, FR3.3)', async () => {
    const create = await request(app)
      .post('/assets')
      .type('form')
      .send({ category: 'hardware', name: 'A', serial_or_key: 'X' });
    const id = latestAssetId(db);
    await request(app).post(`/assets/${id}/assign`).type('form').send({ assigned_to: 'B' });
    await request(app).post(`/assets/${id}/lost`);
    const res = await request(app).get(`/assets/${id}`);
    expect(res.text).toContain('data-testid="asset-status"');
    expect(res.text).not.toContain('data-testid="action-return"');
    expect(res.text).not.toContain('data-testid="action-assign"');
  });

  // FR4.6 / FR4.7 — the lifecycle timestamps are displayed on the detail view.
  it('detail view shows the assignment and return timestamps (FR4.6, FR4.7)', async () => {
    const create = await request(app)
      .post('/assets')
      .type('form')
      .send({ category: 'hardware', name: 'A', serial_or_key: 'X' });
    const id = latestAssetId(db);
    await request(app).post(`/assets/${id}/assign`).type('form').send({ assigned_to: 'B' });
    await request(app).post(`/assets/${id}/return`);
    const res = await request(app).get(`/assets/${id}`);
    expect(res.text).toContain('data-testid="asset-assigned-at"');
    expect(res.text).toContain('data-testid="asset-returned-at"');
  });
});
