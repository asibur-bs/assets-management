'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { openDatabase } = require('../src/db');
const { DERIVED_FIGURES, assetMatchesSearchText, UNASSIGNED_DESIGNATION } = require('../src/domain/vocabulary');
const { queryAssets, countFigures, listHolders } = require('../src/reporting/query');
const { renderCsv, CSV_FILENAME, CSV_CONTENT_TYPE } = require('../src/reporting/csv');

const HEADER = 'Name, Category, Serial / Key, Status, Holder, Last holder';

function insertAsset(db, row) {
  db.prepare(
    `INSERT INTO assets (
       id, category, name, serial_or_key, model, notes, status,
       assigned_to, assigned_at, returned_at, last_assigned_to, created_at, updated_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    row.id,
    row.category,
    row.name,
    row.serial_or_key,
    row.model ?? null,
    row.notes ?? null,
    row.status,
    row.assigned_to ?? null,
    row.assigned_at ?? null,
    row.returned_at ?? null,
    row.last_assigned_to ?? null,
    row.created_at,
    row.updated_at ?? row.created_at
  );
}

function seedInventory(db) {
  const rows = [
    {
      id: 'n1',
      category: 'hardware',
      name: 'Alpha Mouse',
      serial_or_key: 'SN-ALPHA',
      status: 'in-stock',
      notes: 'secret-note',
      created_at: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'n2',
      category: 'hardware',
      name: 'Beta Keyboard',
      serial_or_key: 'SN-BETA',
      status: 'in-stock',
      assigned_to: 'Alice',
      created_at: '2026-01-02T00:00:00.000Z',
    },
    {
      id: 'n3',
      category: 'software-license',
      name: 'Gamma License',
      serial_or_key: 'SN-GAMMA',
      status: 'assigned',
      assigned_to: 'Alice',
      last_assigned_to: 'Zoe',
      created_at: '2026-01-03T00:00:00.000Z',
    },
    {
      id: 'n4',
      category: 'hardware',
      name: 'Delta Screen',
      serial_or_key: 'SN-DELTA',
      status: 'returned',
      last_assigned_to: 'Bob',
      created_at: '2026-01-04T00:00:00.000Z',
    },
    {
      id: 'n5',
      category: 'hardware',
      name: 'Epsilon Dock',
      serial_or_key: 'SN-EPSILON',
      status: 'lost',
      last_assigned_to: 'Alice',
      created_at: '2026-01-05T00:00:00.000Z',
    },
    {
      id: 'n6',
      category: 'hardware',
      name: 'Zeta Phone',
      serial_or_key: 'SN-ZETA',
      status: 'discarded',
      last_assigned_to: 'Cara',
      created_at: '2026-01-06T00:00:00.000Z',
    },
  ];
  for (const row of rows) insertAsset(db, row);
  return rows;
}

function expectFigures(actual, expected) {
  expect(Object.keys(actual)).toEqual([...DERIVED_FIGURES]);
  expect(actual).toEqual(expected);
  const bucketSum = DERIVED_FIGURES.slice(0, 5).reduce((sum, key) => sum + actual[key], 0);
  expect(actual.total_record_count).toBe(bucketSum);
  expect(actual.active_inventory_count).toBe(actual.total_record_count - actual.discarded_count);
  expect(actual.available_to_assign_count).toBe(actual.in_stock_count);
}

describe('reporting', () => {
  let db;
  let dir;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'assets-reporting-'));
    const filename = path.join(dir, 'reporting.sqlite');
    expect(path.resolve(filename).endsWith(`${path.sep}data${path.sep}assets.sqlite`)).toBe(false);
    db = openDatabase(filename);
  });

  afterEach(() => {
    if (db) {
      try {
        db.close();
      } catch {
        // The connection may already be closed.
      }
    }
    if (dir) fs.rmSync(dir, { recursive: true, force: true });
    db = undefined;
    dir = undefined;
  });

  it('aggregates the eight figures in SQL from one shared filter', () => {
    const source = fs.readFileSync(path.join(__dirname, '../src/reporting/query.js'), 'utf8');
    expect(source).toContain('SUM(CASE WHEN status = ?');
    expect(source).toContain('sharedAssetWhere');
    expect(source).not.toContain('assets.sqlite');

    expectFigures(countFigures(db, null), {
      in_stock_count: 0,
      assigned_count: 0,
      returned_count: 0,
      lost_count: 0,
      discarded_count: 0,
      active_inventory_count: 0,
      total_record_count: 0,
      available_to_assign_count: 0,
    });

    seedInventory(db);
    expectFigures(countFigures(db, {}), {
      in_stock_count: 2,
      assigned_count: 1,
      returned_count: 1,
      lost_count: 1,
      discarded_count: 1,
      active_inventory_count: 5,
      total_record_count: 6,
      available_to_assign_count: 2,
    });
    expect(queryAssets(db, {}).length).toBe(countFigures(db, {}).total_record_count);
    expect(countFigures(db, { sort_column: 'created_at', sort_direction: 'desc' })).toEqual(countFigures(db, {}));
    expect(countFigures(db, { holder_search: 'nobody' })).toEqual(countFigures(db, {}));
  });

  it('applies the same where to the list and the figures', () => {
    seedInventory(db);

    const alice = { holder: 'Alice' };
    const listed = queryAssets(db, alice);
    expect(listed.map((row) => row.id)).toEqual(['n2', 'n5', 'n3']);
    expectFigures(countFigures(db, alice), {
      in_stock_count: 1,
      assigned_count: 1,
      returned_count: 0,
      lost_count: 1,
      discarded_count: 0,
      active_inventory_count: 3,
      total_record_count: 3,
      available_to_assign_count: 1,
    });
    expect(listed).toHaveLength(3);

    expect(queryAssets(db, { holder: 'Zoe' })).toEqual([]);
    expect(countFigures(db, { holder: 'Zoe' }).total_record_count).toBe(0);
    expect(queryAssets(db, { holder: 'alice' })).toEqual([]);

    expect(queryAssets(db, { holder: 'Bob' }).map((row) => row.id)).toEqual(['n4']);
    expect(queryAssets(db, { category: 'software-license' }).map((row) => row.id)).toEqual(['n3']);
    expect(queryAssets(db, { status: 'discarded' }).map((row) => row.id)).toEqual(['n6']);
    expectFigures(countFigures(db, { status: 'discarded' }), {
      in_stock_count: 0,
      assigned_count: 0,
      returned_count: 0,
      lost_count: 0,
      discarded_count: 1,
      active_inventory_count: 0,
      total_record_count: 1,
      available_to_assign_count: 0,
    });

    const dropped = { category: 'chair', status: 'lost', sort_column: 'not-a-column', sort_direction: 'sideways' };
    expect(queryAssets(db, dropped).map((row) => row.id)).toEqual(['n5']);
    expect(countFigures(db, dropped).total_record_count).toBe(1);

    const searched = queryAssets(db, { search_text: 'gAmMa' });
    expect(searched.map((row) => row.id)).toEqual(['n3']);
    expect(countFigures(db, { search_text: 'gAmMa' }).total_record_count).toBe(1);
    expect(queryAssets(db, { search_text: 'sn-delta' }).map((row) => row.id)).toEqual(['n4']);

    const stored = db.prepare('SELECT * FROM assets').all();
    const jsIds = stored
      .filter((row) => assetMatchesSearchText(row, 'gAmMa'))
      .map((row) => row.id)
      .sort();
    expect(searched.map((row) => row.id).sort()).toEqual(jsIds);
  });

  it('treats search metacharacters as text and keeps sort on the whitelist', () => {
    seedInventory(db);
    insertAsset(db, {
      id: 'n7',
      category: 'hardware',
      name: '100%_ready',
      serial_or_key: 'SN-WILD',
      status: 'in-stock',
      created_at: '2026-02-01T00:00:00.000Z',
    });
    insertAsset(db, {
      id: 'n8',
      category: 'hardware',
      name: 'Äther',
      serial_or_key: 'SN-AETHER',
      status: 'returned',
      last_assigned_to: 'Bob',
      created_at: '2026-02-02T00:00:00.000Z',
    });

    expect(queryAssets(db, { search_text: '%' }).map((row) => row.id)).toEqual(['n7']);
    expect(queryAssets(db, { search_text: '_' }).map((row) => row.id)).toEqual(['n7']);
    expect(queryAssets(db, { search_text: 'äther' })).toEqual([]);
    expect(queryAssets(db, { search_text: 'Äther' }).map((row) => row.id)).toEqual(['n8']);
    expect(countFigures(db, { search_text: '%' }).total_record_count).toBe(1);

    expect(queryAssets(db, { holder: "x' OR '1'='1" })).toEqual([]);
    expect(db.prepare('SELECT COUNT(*) AS n FROM assets').get().n).toBe(8);

    const byName = queryAssets(db, {}).map((row) => row.name);
    const injected = queryAssets(db, {
      sort_column: 'name; DROP TABLE assets; --',
      sort_direction: 'asc; DROP TABLE assets',
    });
    expect(injected.map((row) => row.name)).toEqual(byName);
    expect(db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'assets'").get().name).toBe(
      'assets'
    );

    expect(queryAssets(db, { sort_column: 'name', sort_direction: 'asc' }).map((row) => row.id)).toEqual([
      'n7',
      'n1',
      'n2',
      'n4',
      'n5',
      'n3',
      'n6',
      'n8',
    ]);
    expect(queryAssets(db, { sort_column: 'name', sort_direction: 'desc' }).map((row) => row.id)).toEqual([
      'n8',
      'n6',
      'n3',
      'n5',
      'n4',
      'n2',
      'n1',
      'n7',
    ]);
    expect(queryAssets(db, { sort_column: 'name', sort_direction: 'DESC' }).map((row) => row.id)[0]).toBe('n7');
    expect(queryAssets(db, { sort_column: 'created_at', sort_direction: 'desc' }).map((row) => row.id)).toEqual([
      'n8',
      'n7',
      'n6',
      'n5',
      'n4',
      'n3',
      'n2',
      'n1',
    ]);
  });

  it('lists display holders, including Unassigned only when an asset was never held', () => {
    expect(listHolders(db, null)).toEqual([]);

    seedInventory(db);
    expect(listHolders(db, '')).toEqual([
      { displayHolder: 'Alice', count: 3 },
      { displayHolder: 'Bob', count: 1 },
      { displayHolder: 'Cara', count: 1 },
      { displayHolder: UNASSIGNED_DESIGNATION, count: 1 },
    ]);
    expect(listHolders(db, 'Ali')).toEqual([{ displayHolder: 'Alice', count: 3 }]);
    expect(listHolders(db, 'ali')).toEqual([]);
    expect(listHolders(db, 'Zoe')).toEqual([]);

    insertAsset(db, {
      id: 'blank',
      category: 'hardware',
      name: 'Blank Holder',
      serial_or_key: 'SN-BLANK',
      status: 'in-stock',
      assigned_to: '',
      last_assigned_to: '',
      created_at: '2026-03-01T00:00:00.000Z',
    });
    insertAsset(db, {
      id: 'spaces',
      category: 'hardware',
      name: 'Spaces',
      serial_or_key: 'SN-SPACES',
      status: 'assigned',
      assigned_to: '   ',
      created_at: '2026-03-02T00:00:00.000Z',
    });
    const withBlanks = listHolders(db);
    expect(withBlanks.find((row) => row.displayHolder === UNASSIGNED_DESIGNATION).count).toBe(2);
    expect(withBlanks.find((row) => row.displayHolder === '   ')).toEqual({ displayHolder: '   ', count: 1 });

    const freshDir = fs.mkdtempSync(path.join(os.tmpdir(), 'assets-reporting-holders-'));
    const fresh = openDatabase(path.join(freshDir, 'holders.sqlite'));
    try {
      insertAsset(fresh, {
        id: 'named',
        category: 'hardware',
        name: 'Named Unassigned',
        serial_or_key: 'SN-NAMED',
        status: 'assigned',
        assigned_to: UNASSIGNED_DESIGNATION,
        created_at: '2026-04-01T00:00:00.000Z',
      });
      insertAsset(fresh, {
        id: 'never',
        category: 'hardware',
        name: 'Never Held',
        serial_or_key: 'SN-NEVER',
        status: 'in-stock',
        created_at: '2026-04-02T00:00:00.000Z',
      });
      expect(listHolders(fresh)).toEqual([
        { displayHolder: UNASSIGNED_DESIGNATION, count: 1 },
        { displayHolder: UNASSIGNED_DESIGNATION, count: 1 },
      ]);
      expect(
        queryAssets(fresh, { holder: UNASSIGNED_DESIGNATION })
          .map((row) => row.id)
          .sort()
      ).toEqual(['named', 'never']);
      expect(countFigures(fresh, { holder: UNASSIGNED_DESIGNATION }).total_record_count).toBe(2);
      const heldOnly = listHolders(fresh, UNASSIGNED_DESIGNATION);
      expect(heldOnly).toHaveLength(2);
      expect(heldOnly.every((row) => row.count === 1)).toBe(true);
    } finally {
      fresh.close();
      fs.rmSync(freshDir, { recursive: true, force: true });
    }
  });

  it('renders the six-column CSV with formula prefixes and no metadata', () => {
    expect(CSV_FILENAME).toBe('assets-export.csv');
    expect(CSV_CONTENT_TYPE).toBe('text/csv; charset=utf-8');
    expect(renderCsv([])).toBe(`${HEADER}\n`);
    expect(renderCsv()).toBe(`${HEADER}\n`);
    expect(renderCsv([]).startsWith('\uFEFF')).toBe(false);

    const simple = {
      name: 'Alpha Mouse',
      category: 'hardware',
      serial_or_key: 'SN-ALPHA',
      status: 'in-stock',
      notes: 'secret-note',
      model: 'hidden-model',
    };
    expect(renderCsv([simple])).toBe(`${HEADER}\nAlpha Mouse,hardware,SN-ALPHA,in-stock,${UNASSIGNED_DESIGNATION},\n`);
    expect(renderCsv([simple])).not.toContain('secret-note');
    expect(renderCsv([simple])).not.toContain('hidden-model');
    expect(renderCsv([simple])).not.toContain('In stock');

    expect(
      renderCsv([
        {
          name: 'Alpha',
          category: 'hardware',
          serial_or_key: 'SN-1',
          status: 'assigned',
          assigned_to: 'Alice',
          last_assigned_to: 'Bob',
        },
      ])
    ).toBe(`${HEADER}\nAlpha,hardware,SN-1,assigned,Alice,Bob\n`);

    expect(
      renderCsv([
        {
          name: 'Alpha',
          category: 'software-license',
          serial_or_key: 'SN-1',
          status: 'returned',
          last_assigned_to: 'Bob',
        },
      ])
    ).toBe(`${HEADER}\nAlpha,software-license,SN-1,returned,Bob,Bob\n`);

    expect(
      renderCsv([
        {
          name: 'Widget, Pro',
          category: 'hardware',
          serial_or_key: 'SN-1',
          status: 'in-stock',
        },
      ])
    ).toBe(`${HEADER}\n"Widget, Pro",hardware,SN-1,in-stock,${UNASSIGNED_DESIGNATION},\n`);

    expect(
      renderCsv([
        {
          name: 'say "hi"',
          category: 'hardware',
          serial_or_key: 'SN-1',
          status: 'in-stock',
        },
      ])
    ).toBe(`${HEADER}\n"say ""hi""",hardware,SN-1,in-stock,${UNASSIGNED_DESIGNATION},\n`);

    expect(
      renderCsv([
        {
          name: 'a\nb',
          category: 'hardware',
          serial_or_key: 'SN-1',
          status: 'in-stock',
        },
      ])
    ).toBe(`${HEADER}\n"a\nb",hardware,SN-1,in-stock,${UNASSIGNED_DESIGNATION},\n`);

    expect(
      renderCsv([
        {
          name: '=1+2',
          category: '+cat',
          serial_or_key: '-ser',
          status: '@status',
          assigned_to: '\tlead',
          last_assigned_to: '\rlast',
        },
      ])
    ).toBe(`${HEADER}\n'=1+2,'+cat,'-ser,'@status,'\tlead,'\rlast\n`);

    expect(
      renderCsv([
        {
          name: '=1,2',
          category: 'hardware',
          serial_or_key: 'SN-1',
          status: 'in-stock',
        },
      ])
    ).toBe(`${HEADER}\n"'=1,2",hardware,SN-1,in-stock,${UNASSIGNED_DESIGNATION},\n`);

    expect(
      renderCsv([
        {
          name: '=say "hi"',
          category: 'hardware',
          serialOrKey: 'SN-1',
          status: 'lost',
          assignedTo: 'Alice',
          lastAssignedTo: '=Bob',
        },
      ])
    ).toBe(`${HEADER}\n"'=say ""hi""",hardware,SN-1,lost,Alice,'=Bob\n`);

    seedInventory(db);
    const exported = renderCsv(queryAssets(db, { status: 'discarded' }));
    expect(exported.split('\n')[0]).toBe(HEADER);
    expect(exported).toContain('Zeta Phone,hardware,SN-ZETA,discarded,Cara,Cara\n');
    expect(exported).not.toContain('secret-note');
    const unmatched = renderCsv(queryAssets(db, { search_text: 'no-such-asset' }));
    expect(unmatched).toBe(`${HEADER}\n`);
  });
});
