'use strict';

const {
  STATUS_VALUES,
  STATUS_LABELS,
  TRANSITION_EDGES,
  LOSS_REASONS,
  RETIREMENT_REASONS,
  AUDIT_ACTIONS,
  ERROR_CODES,
  BACKFILL_ACTOR,
  UNASSIGNED_DESIGNATION,
  FORM_FILTER_DIMENSIONS,
  FILTER_STATE_HOLDER_DIMENSION,
  HOLDER_SEARCH_DIMENSION,
  DERIVED_FIGURES,
  isStatus,
  statusLabel,
  findTransition,
  isLegalTransition,
  acceptableReasonsFor,
  isAcceptableReason,
  normalizeSerialOrKey,
  serialOrKeyCollides,
  SERIAL_OR_KEY_INDEX_EXPRESSION,
  deriveDisplayHolder,
  projectHolderColumns,
  countDisplayHolders,
  isBackfillActor,
  isRetryableCode,
  sanitizeAssetFilter,
  sanitizeHolderSearch,
  holderRowMatchesSearch,
  FILTER_DIMENSIONS,
  assetMatchesSearchText,
  holderDimensionMatches,
  sumStatusBuckets,
  totalRecordCount,
  activeInventoryCount,
  availableToAssignCount,
  bucketsSumToTotal,
} = require('../../src/domain/vocabulary');

describe('DomainVocabulary', () => {
  it('FR3.1 BR1.1 — exactly five status buckets with display labels', () => {
    expect(STATUS_VALUES).toEqual([
      'in-stock',
      'assigned',
      'returned',
      'lost',
      'discarded',
    ]);
    expect(STATUS_VALUES).toHaveLength(5);
    for (const status of STATUS_VALUES) {
      expect(isStatus(status)).toBe(true);
      expect(statusLabel(status)).toBe(STATUS_LABELS[status]);
    }
    expect(isStatus('unknown')).toBe(false);
  });

  it('FR3.2 BR2.1 BR2.3 — exactly eight released edges; deferred edges absent', () => {
    expect(TRANSITION_EDGES).toHaveLength(8);
    const expected = [
      { from: 'in-stock', to: 'assigned', auditAction: 'assign', reasonRequired: false, reasonSet: null },
      { from: 'in-stock', to: 'lost', auditAction: 'mark-lost', reasonRequired: true, reasonSet: 'loss' },
      { from: 'assigned', to: 'returned', auditAction: 'return', reasonRequired: false, reasonSet: null },
      { from: 'assigned', to: 'lost', auditAction: 'mark-lost', reasonRequired: true, reasonSet: 'loss' },
      { from: 'assigned', to: 'discarded', auditAction: 'discarded', reasonRequired: true, reasonSet: 'retirement' },
      { from: 'returned', to: 'assigned', auditAction: 'assign', reasonRequired: false, reasonSet: null },
      { from: 'returned', to: 'lost', auditAction: 'mark-lost', reasonRequired: true, reasonSet: 'loss' },
      { from: 'lost', to: 'in-stock', auditAction: 'recovered', reasonRequired: true, reasonSet: 'recovery' },
    ];
    for (const edge of expected) {
      expect(findTransition(edge.from, edge.to)).toEqual(edge);
      expect(isLegalTransition(edge.from, edge.to)).toBe(true);
    }
    expect(isLegalTransition('in-stock', 'discarded')).toBe(false);
    expect(isLegalTransition('returned', 'discarded')).toBe(false);
  });

  it('US3.3 BR3 — loss and retirement reason sets; retirement accepts union', () => {
    expect(LOSS_REASONS).toEqual(['damaged', 'lost', 'stolen']);
    expect(RETIREMENT_REASONS).toEqual([
      'superseded',
      'returned-to-supplier',
      'written-off',
    ]);
    expect(isAcceptableReason('loss', 'damaged')).toBe(true);
    expect(isAcceptableReason('loss', 'superseded')).toBe(false);
    expect(isAcceptableReason('recovery', 'stolen')).toBe(true);
    expect(acceptableReasonsFor('retirement')).toEqual(
      LOSS_REASONS.concat(RETIREMENT_REASONS),
    );
    expect(isAcceptableReason('retirement', 'written-off')).toBe(true);
    const discard = findTransition('assigned', 'discarded');
    expect(isAcceptableReason(discard.reasonSet, 'damaged')).toBe(true);
    expect(isAcceptableReason(discard.reasonSet, 'written-off')).toBe(true);
    expect(isAcceptableReason(discard.reasonSet, 'not-a-reason')).toBe(false);
    const recovery = findTransition('lost', 'in-stock');
    expect(isAcceptableReason(recovery.reasonSet, 'stolen')).toBe(true);
    expect(isAcceptableReason(recovery.reasonSet, 'superseded')).toBe(false);
  });

  it('US3.6 BR4.1 — exactly seven audit actions including recovered and discarded', () => {
    expect(AUDIT_ACTIONS).toEqual([
      'create',
      'assign',
      'return',
      'mark-lost',
      'recovered',
      'discarded',
      'edit',
    ]);
    expect(AUDIT_ACTIONS).toHaveLength(7);
  });

  it('US1.2 BR5 — serial normalisation: trim, ASCII fold, non-ASCII unchanged', () => {
    expect(normalizeSerialOrKey('  AbC-1  ')).toBe('abc-1');
    expect(normalizeSerialOrKey('\tAbC')).toBe('\tabc');
    expect(normalizeSerialOrKey('École')).toBe('École');
    expect(
      serialOrKeyCollides('abc', 'hardware', [
        { id: 1, category: 'hardware', serial_or_key: 'ABC' },
      ]),
    ).toBe(true);
    expect(
      serialOrKeyCollides('abc', 'hardware', [
        { id: 1, category: 'hardware', serialOrKey: 'ABC' },
      ]),
    ).toBe(true);
    expect(
      serialOrKeyCollides('abc', 'hardware', [
        { id: 1, category: 'software-license', serialOrKey: 'ABC' },
      ]),
    ).toBe(false);
    expect(
      serialOrKeyCollides(
        'abc',
        'hardware',
        [{ id: 1, category: 'hardware', serialOrKey: 'ABC' }],
        1,
      ),
    ).toBe(false);
    expect(normalizeSerialOrKey(null)).toBeNull();
    expect(serialOrKeyCollides(null, 'hardware', [
      { id: 1, category: 'hardware', serialOrKey: null },
    ])).toBe(false);
    expect(serialOrKeyCollides('', 'hardware', [
      { id: 1, category: 'hardware', serialOrKey: null },
    ])).toBe(false);
    expect(serialOrKeyCollides('  ', 'hardware', [
      { id: 1, category: 'hardware', serialOrKey: '' },
    ])).toBe(true);

    const Database = require('better-sqlite3');
    const db = new Database(':memory:');
    try {
      db.exec(`
        CREATE TABLE t (
          id INTEGER PRIMARY KEY,
          category TEXT NOT NULL,
          serial_or_key TEXT
        );
        CREATE UNIQUE INDEX ux_serial ON t (category, ${SERIAL_OR_KEY_INDEX_EXPRESSION});
      `);
      const insert = db.prepare('INSERT INTO t (category, serial_or_key) VALUES (?, ?)');
      const indexAllows = (category, serial) => {
        try {
          insert.run(category, serial);
          return true;
        } catch (err) {
          if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') return false;
          throw err;
        }
      };
      const rows = () => db.prepare('SELECT id, category, serial_or_key FROM t').all();
      const cases = [
        ['ABC', 'hardware', 'abc', true],
        ['abc', 'hardware', '  ABC  ', true],
        ['École', 'hardware', 'école', false],
        [null, 'hardware', null, false],
        [null, 'hardware', '', false],
        ['', 'software-license', '  ', true],
        ['abc', 'hardware', '\tabc', false],
        ['\tabc', 'hardware', 'abc', false],
      ];
      for (const [stored, category, candidate, collides] of cases) {
        db.exec('DELETE FROM t');
        insert.run(category, stored);
        const before = rows();
        expect(indexAllows(category, candidate)).toBe(!collides);
        expect(serialOrKeyCollides(candidate, category, before)).toBe(collides);
      }
      db.exec('DELETE FROM t');
      insert.run('hardware', 'ABC');
      const otherCategory = rows();
      expect(indexAllows('software-license', 'abc')).toBe(true);
      expect(serialOrKeyCollides('abc', 'software-license', otherCategory)).toBe(false);
    } finally {
      db.close();
    }
  });

  it('US5.6 BR7.1 BR7.2 BR7.4 — fallback derivation, non-echo columns, holder count', () => {
    expect(deriveDisplayHolder('Alice', 'Bob')).toEqual({
      displayHolder: 'Alice',
      neverHeld: false,
      isHolder: true,
    });
    expect(deriveDisplayHolder(null, 'Bob')).toEqual({
      displayHolder: 'Bob',
      neverHeld: false,
      isHolder: true,
    });
    expect(deriveDisplayHolder(null, null)).toEqual({
      displayHolder: UNASSIGNED_DESIGNATION,
      neverHeld: true,
      isHolder: false,
    });

    expect(projectHolderColumns('Alice', null)).toEqual({
      currentHolder: 'Alice',
      lastHolder: null,
    });
    expect(projectHolderColumns(null, 'Bob')).toEqual({
      currentHolder: null,
      lastHolder: 'Bob',
    });
    expect(projectHolderColumns('Alice', 'Bob')).toEqual({
      currentHolder: 'Alice',
      lastHolder: 'Bob',
    });
    expect(projectHolderColumns(null, null)).toEqual({
      currentHolder: null,
      lastHolder: null,
    });
    expect(projectHolderColumns(null, 'Bob').currentHolder).toBeNull();

    const alice = deriveDisplayHolder('Alice', null);
    const bob = deriveDisplayHolder(null, 'Bob');
    const neverHeld = deriveDisplayHolder(null, null);
    const namedUnassigned = deriveDisplayHolder(UNASSIGNED_DESIGNATION, null);
    expect(countDisplayHolders([alice, alice, bob, neverHeld])).toEqual({
      holderCount: 2,
      reservedRow: true,
      renderedRowCount: 3,
    });
    expect(countDisplayHolders([alice])).toEqual({
      holderCount: 1,
      reservedRow: false,
      renderedRowCount: 1,
    });
    expect(namedUnassigned.isHolder).toBe(true);
    expect(countDisplayHolders([namedUnassigned, neverHeld])).toEqual({
      holderCount: 1,
      reservedRow: true,
      renderedRowCount: 2,
    });
  });

  it('NFR2.1 / BR6 / BR11 — eight error codes; only BUSY_RETRYABLE; backfill actor', () => {
    expect(Object.keys(ERROR_CODES)).toHaveLength(8);
    expect(isRetryableCode('BUSY_RETRYABLE')).toBe(true);
    expect(isRetryableCode('VALIDATION_ERROR')).toBe(false);
    expect(isRetryableCode('INTERNAL')).toBe(false);
    expect(BACKFILL_ACTOR).toBe('system');
    expect(isBackfillActor('system')).toBe(true);
    expect(isBackfillActor('alice')).toBe(false);
  });

  it('US5.1 BR8 BR9 — filter dimensions; invalid enums omit one dimension; counting predicates', () => {
    expect(FORM_FILTER_DIMENSIONS).toEqual([
      'search_text',
      'category',
      'status',
      'sort_column',
      'sort_direction',
    ]);
    expect(FILTER_STATE_HOLDER_DIMENSION).toBe('holder');
    expect(HOLDER_SEARCH_DIMENSION).toBe('holder_search');

    const cleaned = sanitizeAssetFilter({
      search_text: 'laptop',
      category: 'not-a-category',
      status: 'assigned',
      sort_column: 'created_at',
      sort_direction: 'sideways',
      holder: 'Alice',
      holder_search: 'should-not-land',
    });
    expect(cleaned).toEqual({
      search_text: 'laptop',
      status: 'assigned',
      sort_column: 'created_at',
      holder: 'Alice',
    });
    expect(cleaned).not.toHaveProperty('category');
    expect(cleaned).not.toHaveProperty('sort_direction');
    expect(cleaned).not.toHaveProperty('holder_search');

    expect(sanitizeHolderSearch('')).toBeNull();
    expect(sanitizeHolderSearch('Al')).toBe('Al');
    expect(holderRowMatchesSearch('Alice', 'Al')).toBe(true);
    expect(holderRowMatchesSearch('Bob', 'Al')).toBe(false);
    expect(holderRowMatchesSearch('Alice', '')).toBe(true);
    const search = FILTER_DIMENSIONS.find((dim) => dim.name === 'search_text');
    expect(search.applies_to).toEqual(['name', 'serial_or_key']);
    expect(assetMatchesSearchText({ name: 'Laptop', serialOrKey: 'ZZ' }, 'Lap')).toBe(true);
    expect(assetMatchesSearchText({ name: 'Laptop', serialOrKey: 'ZZ' }, 'laptop')).toBe(true);
    expect(assetMatchesSearchText({ name: 'Laptop', serialOrKey: 'ZZ' }, 'ZZ')).toBe(true);
    expect(assetMatchesSearchText({ name: 'Laptop', serialOrKey: 'ZZ' }, 'nope')).toBe(false);
    const holder = FILTER_DIMENSIONS.find((dim) => dim.name === 'holder');
    expect(holder.applies_to).toEqual(['display_holder']);
    expect(holderDimensionMatches(null, 'Bob', 'Bob')).toBe(true);
    expect(holderDimensionMatches(null, 'Bob', 'Alice')).toBe(false);

    expect(DERIVED_FIGURES).toEqual([
      'in_stock_count',
      'assigned_count',
      'returned_count',
      'lost_count',
      'discarded_count',
      'active_inventory_count',
      'total_record_count',
      'available_to_assign_count',
    ]);

    const buckets = {
      'in-stock': 3,
      assigned: 2,
      returned: 1,
      lost: 1,
      discarded: 2,
    };
    expect(sumStatusBuckets(buckets)).toBe(9);
    expect(totalRecordCount(buckets)).toBe(9);
    expect(activeInventoryCount(buckets)).toBe(7);
    expect(availableToAssignCount(buckets)).toBe(3);
    expect(bucketsSumToTotal(buckets, 9)).toBe(true);
    expect(bucketsSumToTotal(buckets, 8)).toBe(false);
    expect(bucketsSumToTotal(buckets, undefined)).toBe(false);
    expect(activeInventoryCount(buckets)).toBe(
      totalRecordCount(buckets) - buckets.discarded,
    );
    expect(acceptableReasonsFor('unknown-op')).toEqual([]);
  });
});
