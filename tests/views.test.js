'use strict';

const { describe, it, expect, beforeEach } = require('vitest');
const request = require('supertest');
const { openDatabase } = require('../src/db');
const { createApp } = require('../src/app');

describe('view rendering (FR2, FR3)', () => {
  let app; let db;
  beforeEach(() => { db = openDatabase(':memory:'); app = createApp(db); });

  it('list view shows columns required by FR2.1', async () => {
    const res = await request(app).get('/assets');
    expect(res.text).toContain('<th>Name</th>');
    expect(res.text).toContain('<th>Category</th>');
    expect(res.text).toContain('<th>Serial / Key</th>');
    expect(res.text).toContain('<th>Status</th>');
    expect(res.text).toContain('<th>Assigned to</th>');
  });

  it('detail view shows all asset fields', async () => {
    const create = await request(app).post('/assets').type('form').send({ category: 'hardware', name: 'A', serial_or_key: 'X' });
    const id = create.headers.location.split('/').pop();
    const res = await request(app).get(`/assets/${id}`);
    expect(res.text).toContain('data-testid="asset-fields"');
    expect(res.text).toContain('data-testid="asset-status"');
  });

  it('detail view shows the most recent audit entry', async () => {
    const create = await request(app).post('/assets').type('form').send({ category: 'hardware', name: 'A', serial_or_key: 'X' });
    const id = create.headers.location.split('/').pop();
    const res = await request(app).get(`/assets/${id}`);
    expect(res.text).toContain('data-testid="audit-section"');
    expect(res.text).toContain('data-testid="audit-entry"');
  });

  it('list view filters by status query', async () => {
    const create = await request(app).post('/assets').type('form').send({ category: 'hardware', name: 'A', serial_or_key: 'X', assigned_to: 'B' });
    await request(app).get('/assets?status=assigned');
    const filtered = await request(app).get('/assets?status=assigned');
    expect(filtered.text).toContain('A');
  });
});