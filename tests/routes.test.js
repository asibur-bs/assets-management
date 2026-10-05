'use strict';

const { describe, it, expect, beforeEach } = require('vitest');
const request = require('supertest');
const { openDatabase } = require('../src/db');
const { createApp } = require('../src/app');

describe('asset routes (integration)', () => {
  let app; let db;
  beforeEach(() => {
    db = openDatabase(':memory:');
    app = createApp(db);
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

  it('POST /assets creates an asset and redirects to its detail page', async () => {
    const res = await request(app)
      .post('/assets')
      .type('form')
      .send({ category: 'hardware', name: 'ThinkPad', serial_or_key: 'TP-001' });
    expect(res.status).toBe(302);
    const id = res.headers.location.split('/').pop();
    const detail = await request(app).get(`/assets/${id}`);
    expect(detail.status).toBe(200);
    expect(detail.text).toContain('ThinkPad');
  });

  it('POST /assets with duplicate serial returns the form with an error', async () => {
    await request(app).post('/assets').type('form').send({ category: 'hardware', name: 'A', serial_or_key: 'X' });
    const res = await request(app).post('/assets').type('form').send({ category: 'hardware', name: 'B', serial_or_key: 'X' });
    expect(res.status).toBe(400);
    expect(res.text).toContain('already exists');
  });

  it('POST /assets/:id/assign transitions to assigned', async () => {
    const create = await request(app).post('/assets').type('form').send({ category: 'hardware', name: 'A', serial_or_key: 'X' });
    const id = create.headers.location.split('/').pop();
    const res = await request(app).post(`/assets/${id}/assign`).type('form').send({ assigned_to: 'Alice' });
    expect(res.status).toBe(302);
    const detail = await request(app).get(`/assets/${id}`);
    expect(detail.text).toContain('assigned');
  });

  it('POST /assets/:id/return transitions assigned -> returned', async () => {
    const create = await request(app).post('/assets').type('form').send({ category: 'hardware', name: 'A', serial_or_key: 'X', assigned_to: 'Alice' });
    const id = create.headers.location.split('/').pop();
    const res = await request(app).post(`/assets/${id}/return`);
    expect(res.status).toBe(302);
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
});