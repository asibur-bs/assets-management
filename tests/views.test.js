'use strict';

const fs = require('node:fs');
const path = require('node:path');
const request = require('supertest');
const { openDatabase } = require('../src/db');
const { createApp } = require('../src/app');
const { TRANSITION_EDGES, statusLabel } = require('../src/domain/vocabulary');
const { seedTwoAssets, latestAssetId } = require('./helpers/seed');
const repo = require('../src/repositories/assets-repo');

const queryPath = path.join(__dirname, '..', 'src', 'reporting', 'query.js');

const ACTION_TEST_ID = {
  assign: 'action-assign',
  return: 'action-return',
  'mark-lost': 'action-mark-lost',
  discarded: 'action-discard',
  recovered: 'action-recover',
};

function postAction(app, id, fields) {
  return request(app).post(`/assets/${id}`).type('form').send(fields);
}

describe('view rendering', () => {
  let app;
  let db;

  beforeEach(() => {
    delete process.env.ASSET_ACTOR;
    db = openDatabase(':memory:');
    app = createApp(db);
  });

  afterEach(() => {
    if (db) db.close();
  });

  it('escapes user-controlled values and does not unescaped-include them', () => {
    const dir = path.join(__dirname, '..', 'views');
    const files = fs.readdirSync(dir).filter((name) => name.endsWith('.ejs') && name !== '_layout.ejs');
    for (const name of files) {
      const text = fs.readFileSync(path.join(dir, name), 'utf8');
      const unescaped = text.match(/<%-[\s\S]*?%>/g) || [];
      for (const tag of unescaped) {
        expect(tag.startsWith('<%- include(')).toBe(true);
      }
    }
  });

  it('list view shows the six columns and status labels', async () => {
    const res = await request(app).get('/assets');
    expect(res.text).toContain('<th>Name</th>');
    expect(res.text).toContain('<th>Category</th>');
    expect(res.text).toContain('<th>Serial / Key</th>');
    expect(res.text).toContain('<th>Status</th>');
    expect(res.text).toContain('<th>Holder</th>');
    expect(res.text).toContain('<th>Last holder</th>');
    expect(res.text).toContain('In stock');
    expect(res.text).toContain('Discarded');
    expect(res.text).toContain('data-testid="filter-search-text"');
    expect(res.text).toContain('data-testid="filter-category"');
    expect(res.text).toContain('data-testid="filter-status"');
    expect(res.text).toContain('data-testid="filter-sort-column"');
    expect(res.text).toContain('data-testid="filter-sort-direction"');
    expect(res.text).toContain('data-testid="filter-apply"');
    expect(res.text).toContain('data-testid="nav-new"');
    expect(res.text).toContain('data-testid="sidebar-collapse"');
    expect(res.text).toContain('class="nav-icon"');
    expect(res.text).toContain('class="nav-label">Dashboard');
    expect(res.text).toContain('class="nav-label">Assets');
    expect(res.text).toContain('class="nav-label">Holders');
    expect(res.text).toContain('data-testid="acting-as"');
    expect(res.text).toContain('data-testid="skip-link"');
    expect(res.text).toContain('data-testid="theme-select"');
    expect(res.text).toContain('>System</option>');
    expect(res.text).toContain('>Light</option>');
    expect(res.text).toContain('>Dark</option>');
    expect(res.text).toContain('>Ocean</option>');
    expect(res.text).toContain('>Forest</option>');
    expect(res.text).toContain('>Sunset</option>');
    expect(res.text).toContain('>High contrast</option>');
  });

  it('escapes a name that looks like markup', async () => {
    await request(app)
      .post('/assets')
      .type('form')
      .send({ category: 'hardware', name: '<script>alert(1)</script>', serial_or_key: 'X&Y' });
    const list = await request(app).get('/assets');
    expect(list.text).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(list.text).toContain('X&amp;Y');
    expect(list.text).not.toContain('<script>alert(1)</script>');
    const id = latestAssetId(db);
    const detail = await request(app).get(`/assets/${id}`);
    expect(detail.text).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(detail.text).not.toContain('<script>alert(1)</script>');
  });

  it('detail view shows the asset fields and the full history newest first', async () => {
    await request(app).post('/assets').type('form').send({ category: 'hardware', name: 'A', serial_or_key: 'X' });
    const id = latestAssetId(db);
    await postAction(app, id, { action: 'assign', holder: 'Alice' });
    const res = await request(app).get(`/assets/${id}`);
    expect(res.text).toContain('data-testid="asset-fields"');
    expect(res.text).toContain('data-testid="asset-status"');
    expect(res.text).toContain('data-testid="asset-holder">Alice');
    expect(res.text).toContain('data-testid="asset-assigned-at"');
    expect(res.text).toContain('data-testid="asset-returned-at"');
    expect(res.text).toContain('data-testid="audit-section"');
    const actions = [...res.text.matchAll(/data-testid="audit-action">([^<]*)</g)].map((match) => match[1]);
    expect(actions[0]).toBe('assign');
    expect(actions).toContain('create');
    expect(actions.indexOf('assign')).toBeLessThan(actions.indexOf('create'));
    expect(res.text).toContain('data-testid="audit-actor"');
  });

  it('list view filters by the five form fields and by the holder query', async () => {
    const { hardware } = seedTwoAssets(db);
    await postAction(app, hardware.id, { action: 'assign', holder: 'Alice' });

    const byStatus = await request(app).get('/assets').query({ status: 'assigned' });
    expect(byStatus.text).toContain('ThinkPad X1');
    expect(byStatus.text).toContain('Assigned');
    expect(byStatus.text).not.toContain('Design Suite');

    const byCategory = await request(app).get('/assets').query({ category: 'software-license' });
    expect(byCategory.text).toContain('Design Suite');
    expect(byCategory.text).not.toContain('ThinkPad X1');

    const byName = await request(app).get('/assets').query({ search_text: 'thinkpad' });
    expect(byName.text).toContain('ThinkPad X1');
    expect(byName.text).not.toContain('Design Suite');

    const byHolder = await request(app).get('/assets').query({ holder: 'Alice' });
    expect(byHolder.text).toContain('ThinkPad X1');
    expect(byHolder.text).not.toContain('Design Suite');
    expect(byHolder.text).toContain('data-testid="active-holder"');

    const reset = await request(app).get('/assets');
    expect(reset.text).toContain('ThinkPad X1');
    expect(reset.text).toContain('Design Suite');
    expect(reset.text).not.toContain('name="holder"');

    const desc = await request(app).get('/assets').query({ sort_column: 'name', sort_direction: 'desc' });
    const think = desc.text.indexOf('ThinkPad X1');
    const design = desc.text.indexOf('Design Suite');
    expect(think).toBeGreaterThan(-1);
    expect(think).toBeLessThan(design);
  });

  it('list view pages matching assets and leaves the export unpaged', async () => {
    for (let i = 1; i <= 21; i += 1) {
      repo.createAsset(db, {
        category: 'hardware',
        name: `Paged ${String(i).padStart(2, '0')}`,
        serialOrKey: `PAGE-${String(i).padStart(2, '0')}`,
      });
    }

    const first = await request(app).get('/assets');
    expect(first.text).toContain('Showing 1–20 of 21 records');
    expect(first.text).toContain('Paged 01');
    expect(first.text).toContain('Paged 20');
    expect(first.text).not.toContain('Paged 21');
    expect(first.text).toContain('data-testid="pagination"');
    expect(first.text).toContain('href="/assets?page=2"');
    expect(first.text).toContain('Page 1 of 2');
    expect(first.text).toContain('href="/assets/export?sort_column=name&amp;sort_direction=asc"');
    expect(first.text).not.toMatch(/\/assets\/export\?[^"]*page=/);

    const second = await request(app).get('/assets').query({ page: '2' });
    expect(second.text).toContain('Showing 21–21 of 21 records');
    expect(second.text).toContain('Paged 21');
    expect(second.text).not.toContain('Paged 01');
    expect(second.text).toContain('Page 2 of 2');
    expect(second.text).not.toMatch(/\/assets\/export\?[^"]*page=/);

    const filtered = await request(app).get('/assets').query({ status: 'in-stock', page: '2', sort_column: 'name' });
    expect(filtered.text).toContain('Paged 21');
    expect(filtered.text).toContain('status=in-stock');
    expect(filtered.text).toContain('href="/assets?status=in-stock"');
    expect(filtered.text).not.toContain('Paged 01');

    const bogus = await request(app).get('/assets').query({ page: 'nope' });
    expect(bogus.text).toContain('Showing 1–20 of 21 records');
    expect(bogus.text).toContain('Paged 01');
    expect(bogus.text).not.toContain('Paged 21');
  });

  it('list view links each asset row to its detail view', async () => {
    const { hardware } = seedTwoAssets(db);
    const res = await request(app).get('/assets');
    expect(res.text).toContain(`href="/assets/${hardware.id}"`);
    expect(res.text).toContain(`>${statusLabel('in-stock')}<`);
  });

  it('detail view offers only the transitions legal from the current status', async () => {
    await request(app).post('/assets').type('form').send({ category: 'hardware', name: 'A', serial_or_key: 'X' });
    const id = latestAssetId(db);

    async function expectEdges(status) {
      const res = await request(app).get(`/assets/${id}`);
      const legal = new Set(
        TRANSITION_EDGES.filter((edge) => edge.from === status).map((edge) => ACTION_TEST_ID[edge.auditAction])
      );
      for (const testId of Object.values(ACTION_TEST_ID)) {
        if (legal.has(testId)) expect(res.text).toContain(`data-testid="${testId}"`);
        else expect(res.text).not.toContain(`data-testid="${testId}"`);
      }
      expect(res.text).toContain('data-testid="action-edit"');
      return res;
    }

    const inStock = await expectEdges('in-stock');
    expect(inStock.text).toContain(
      'This asset is in stock. It has not been assigned to anyone. Marking it lost records it as missing, and there is no holder to keep.'
    );
    expect(inStock.text).toContain('value="stolen"');
    expect(inStock.text).not.toContain('value="written-off"');

    await postAction(app, id, { action: 'assign', holder: 'Alice' });
    const assigned = await expectEdges('assigned');
    expect(assigned.text).toContain(
      'This asset is currently assigned to Alice. Marking it lost records who had it and ends the assignment. Alice is kept as the last holder.'
    );
    expect(assigned.text).toContain(
      'This asset is currently assigned to Alice. Discarding it resolves the assignment: Alice is cleared as the current holder and kept as the last holder.'
    );
    expect(assigned.text).toContain('value="written-off"');
    expect(assigned.text).toContain('data-testid="reason-consequence-mark-lost"');
    expect(assigned.text).toContain('aria-describedby="reason-consequence-mark-lost"');

    await postAction(app, id, { action: 'return' });
    const returned = await expectEdges('returned');
    expect(returned.text).toContain(
      'This asset was returned by Alice and is not currently assigned. Marking it lost records the loss and keeps Alice as the last holder.'
    );
    expect(returned.text).toContain('data-testid="asset-assigned-at"');
    expect(returned.text).toContain('data-testid="asset-returned-at"');
    expect(returned.text).not.toContain('value="written-off"');

    await postAction(app, id, { action: 'mark-lost', reason: 'lost' });
    const lost = await expectEdges('lost');
    expect(lost.text).toContain('Recovering it returns it to stock');
    expect(lost.text).toContain('Recovery reason');

    await postAction(app, id, { action: 'recovered', reason: 'damaged' });
    await expectEdges('in-stock');

    await postAction(app, id, { action: 'assign', holder: 'Alice' });
    await postAction(app, id, { action: 'discarded', reason: 'written-off' });
    const discarded = await expectEdges('discarded');
    expect(discarded.text).toContain('>Discarded</span>');
    expect(discarded.text).toContain('data-testid="discarded-note"');
    expect(discarded.text).toContain('its record and its history are kept');
  });

  it('the edit form has the five editable fields and no status or holder field', async () => {
    await request(app).post('/assets').type('form').send({
      category: 'hardware',
      name: 'A',
      serial_or_key: 'X',
      model: 'M1',
      notes: 'Note',
    });
    const id = latestAssetId(db);
    const res = await request(app).get(`/assets/${id}/edit`);
    expect(res.status).toBe(200);
    expect(res.text).toContain('Edit asset — A');
    expect(res.text).toContain('data-testid="edit-form"');
    expect(res.text).toContain('data-testid="field-category"');
    expect(res.text).toContain('data-testid="field-name"');
    expect(res.text).toContain('data-testid="field-serial"');
    expect(res.text).toContain('data-testid="field-model"');
    expect(res.text).toContain('data-testid="field-notes"');
    expect(res.text).toContain('value="A"');
    expect(res.text).toContain('value="X"');
    expect(res.text).not.toContain('name="status"');
    expect(res.text).not.toContain('name="holder"');
    expect(res.text).not.toContain('name="assigned_to"');
    expect(res.text).not.toContain('name="actor"');
  });

  const hasReporting = fs.existsSync(queryPath);
  if (!hasReporting) {
    it.skip('dashboard and holder directory require src/reporting/query.js, which is not present', () => {});
  } else {
    it('dashboard and holder directory render the reporting results', async () => {
      const reporting = require(queryPath);
      await request(app).post('/assets').type('form').send({ category: 'hardware', name: 'A', serial_or_key: 'X' });
      const id = latestAssetId(db);
      await postAction(app, id, { action: 'assign', holder: 'Alice' });

      const dashboard = await request(app).get('/dashboard');
      expect(dashboard.status).toBe(200);
      expect(dashboard.text).toContain('data-testid="tile-assigned"');
      expect(dashboard.text).toContain('href="/assets?status=assigned"');
      expect(dashboard.text).toContain('data-testid="figure-active-inventory"');
      expect(dashboard.text).toContain('data-testid="figure-total"');
      expect(dashboard.text).toContain('data-testid="figure-available"');
      const figures = reporting.countFigures(db, {});
      expect(figures).toBeTruthy();

      const holders = await request(app).get('/holders');
      expect(holders.status).toBe(200);
      expect(holders.text).toContain('data-testid="holder-link"');
      expect(holders.text).toContain('href="/assets?holder=Alice"');
      expect(holders.text).toContain('Showing');
    });
  }
});
