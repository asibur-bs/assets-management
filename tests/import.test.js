'use strict';

const { openDatabase } = require('../src/db');
const { createApp } = require('../src/app');
const { openSession } = require('./helpers/auth');
const { clientFor } = require('./helpers/http');
const repo = require('../src/repositories/assets-repo');
const { manualBuffer, readAssetRows, reviewRows, templateBuffer } = require('../src/import/workbook');

async function sheet(rows) {
  const ExcelJS = require('exceljs');
  const workbook = new ExcelJS.Workbook();
  const assets = workbook.addWorksheet('Assets');
  assets.addRow(['Category', 'Name', 'Serial / Key', 'Model', 'Notes']);
  rows.forEach((row) => assets.addRow(row));
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

describe('asset import', () => {
  let db;
  let app;
  let auth;
  let client;

  beforeEach(() => {
    delete process.env.ASSET_ACTOR;
    db = openDatabase(':memory:');
    app = createApp(db);
    auth = openSession(db, {
      username: 'ada',
      displayName: 'Ada',
      password: 'password-1',
      role: 'administrator',
    });
    client = clientFor(app, auth);
  });

  afterEach(() => {
    if (db) db.close();
  });

  function postWorkbook(buffer, filename) {
    return client.post('/assets/import').field('_csrf', auth.csrf).attach('workbook', buffer, filename);
  }

  it('downloads an excel manual and an excel template', async () => {
    const manual = await client.get('/assets/import/manual');
    expect(manual.status).toBe(200);
    expect(manual.headers['content-type']).toContain('spreadsheetml.sheet');
    expect(manual.headers['content-disposition']).toContain('asset-import-manual.xlsx');
    const manualFile = await manualBuffer();
    expect(manualFile.slice(0, 2).toString()).toBe('PK');
    const manualRows = await readAssetRows(await manualBuffer());
    expect(manualRows.problems[0]).toContain('template heading');

    const template = await client.get('/assets/import/template');
    expect(template.status).toBe(200);
    expect(template.headers['content-disposition']).toContain('asset-import-template.xlsx');
    const parsed = await readAssetRows(await templateBuffer());
    expect(parsed.problems).toEqual([]);
    expect(parsed.rows[0].serialOrKey).toBe('EXAMPLE-0001');
  });

  it('imports a valid workbook and refuses a repeated or existing serial', async () => {
    repo.createAsset(db, { category: 'hardware', name: 'Already There', serialOrKey: 'SN-TAKEN' });

    const clean = await postWorkbook(
      await sheet([
        ['hardware', 'Dock', 'SN-DOCK', 'TS4', ''],
        ['Software license', 'Suite', 'KEY-1', '', 'seats'],
      ]),
      'assets.xlsx'
    );
    expect(clean.status).toBe(200);
    expect(clean.text).toContain('data-testid="import-report"');
    expect(clean.text).toContain('Imported 2 assets');
    expect(clean.text).toContain('Dock');
    expect(repo.listAssets(db, {}).some((asset) => asset.serial_or_key === 'SN-DOCK')).toBe(true);

    const duplicated = await postWorkbook(
      await sheet([
        ['hardware', 'One', 'SN-DOCK', '', ''],
        ['hardware', 'Two', 'sn-dock', '', ''],
        ['hardware', 'Three', 'SN-TAKEN', '', ''],
        ['gadgets', 'Four', 'SN-NEW', '', ''],
        ['hardware', '', 'SN-EMPTY', '', ''],
      ]),
      'broken.xlsx'
    );
    expect(duplicated.status).toBe(400);
    expect(duplicated.text).toContain('No assets were added');
    expect(duplicated.text).toContain('Rows 2, 3 use the same serial or key');
    expect(duplicated.text).toContain('already registered on');
    expect(duplicated.text).toContain('Already There');
    expect(duplicated.text).toContain('is not one of the two accepted values');
    expect(duplicated.text).toContain('the Name cell is empty');
    expect(repo.listAssets(db, {}).some((asset) => asset.name === 'One')).toBe(false);
    expect(repo.listAssets(db, {}).some((asset) => asset.name === 'Three')).toBe(false);
  });

  it('refuses a file that is not an xlsx workbook', async () => {
    const refused = await postWorkbook(Buffer.from('not a workbook'), 'assets.csv');
    expect(refused.status).toBe(400);
    expect(refused.text).toContain('.xlsx');
    expect(refused.text).toContain('No assets were added');
  });

  it('explains a repeated serial before anything is saved', () => {
    const reviewed = reviewRows(
      [
        { rowNumber: 2, category: 'hardware', name: 'A', serialOrKey: 'Same', model: '', notes: '' },
        { rowNumber: 5, category: 'hardware', name: 'B', serialOrKey: ' same ', model: '', notes: '' },
      ],
      () => null
    );
    expect(reviewed.records).toEqual([]);
    expect(reviewed.problems[0]).toContain('Rows 2, 5');
    expect(reviewed.problems[0]).toContain('once in a category');
  });
});
