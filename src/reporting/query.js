'use strict';

const {
  sanitizeAssetFilter,
  sanitizeHolderSearch,
  DERIVED_FIGURES,
  deriveDisplayHolder,
  STATUS_VALUES,
  UNASSIGNED_DESIGNATION,
  assetMatchesSearchText,
} = require('../domain/vocabulary');

/**
 * Display holder as SQL. The reserved designation is a bound parameter, so a
 * holder whose name is that word stays distinguishable from a never-held asset
 * when grouping, and the asset-list filter still matches the derived text.
 * Empty string is not a holder — the same rule as holderText.
 */
const DISPLAY_HOLDER_SQL = `CASE
  WHEN assigned_to IS NOT NULL AND assigned_to <> '' THEN assigned_to
  WHEN last_assigned_to IS NOT NULL AND last_assigned_to <> '' THEN last_assigned_to
  ELSE ?
END`;

/** Grouping key. Never-held assets stay NULL here and are flagged apart from any real holder. */
const HOLDER_KEY_SQL = `CASE
  WHEN assigned_to IS NOT NULL AND assigned_to <> '' THEN assigned_to
  WHEN last_assigned_to IS NOT NULL AND last_assigned_to <> '' THEN last_assigned_to
  ELSE NULL
END`;

const NEVER_HELD_SQL = `CASE
  WHEN (assigned_to IS NULL OR assigned_to = '')
   AND (last_assigned_to IS NULL OR last_assigned_to = '')
  THEN 1
  ELSE 0
END`;

/** Whitelisted ORDER BY literals. User text is never concatenated into SQL. */
const SORT_COLUMN_SQL = Object.freeze({
  name: 'name',
  created_at: 'created_at',
});

const SORT_DIRECTION_SQL = Object.freeze({
  asc: 'ASC',
  desc: 'DESC',
});

/**
 * One WHERE for the asset list and the figures. Fragments are fixed SQL;
 * every value is a bound parameter. Sort is not part of the filter predicate.
 */
function sharedAssetWhere(rawFilter) {
  const filter = sanitizeAssetFilter(rawFilter);
  const fragments = [];
  const params = [];

  if (typeof filter.search_text === 'string') {
    // ASCII fold via SQLite LOWER, containment via INSTR. Same match as
    // assetMatchesSearchText, without LIKE wildcards.
    fragments.push('(INSTR(LOWER(name), LOWER(?)) > 0 OR INSTR(LOWER(serial_or_key), LOWER(?)) > 0)');
    params.push(filter.search_text, filter.search_text);
  }

  if (typeof filter.category === 'string') {
    fragments.push('category = ?');
    params.push(filter.category);
  }

  if (typeof filter.status === 'string') {
    fragments.push('status = ?');
    params.push(filter.status);
  }

  if (typeof filter.holder === 'string') {
    fragments.push(`INSTR(${DISPLAY_HOLDER_SQL}, ?) > 0`);
    params.push(UNASSIGNED_DESIGNATION, filter.holder);
  }

  return {
    filter,
    whereSql: fragments.length === 0 ? '' : `WHERE ${fragments.join(' AND ')}`,
    params,
  };
}

function orderBySql(filter) {
  const column = SORT_COLUMN_SQL[filter.sort_column] ?? SORT_COLUMN_SQL.name;
  const direction = SORT_DIRECTION_SQL[filter.sort_direction] ?? SORT_DIRECTION_SQL.asc;
  return `ORDER BY ${column} ${direction}`;
}

function bucketAlias(status) {
  const alias = `${String(status).replaceAll('-', '_')}_count`;
  if (!STATUS_VALUES.includes(status) || !DERIVED_FIGURES.includes(alias)) {
    throw new Error(`refusing to aggregate unknown status ${status}`);
  }
  return alias;
}

function queryAssets(db, rawFilter) {
  const { filter, whereSql, params } = sharedAssetWhere(rawFilter);
  const rows = db.prepare(`SELECT * FROM assets ${whereSql} ${orderBySql(filter)}`).all(...params);
  if (typeof filter.search_text === 'string') {
    const agreed = rows.every((row) => assetMatchesSearchText(row, filter.search_text));
    if (!agreed) {
      throw new Error('search SQL disagreed with assetMatchesSearchText');
    }
  }
  return rows;
}

function countFigures(db, rawFilter) {
  const { whereSql, params } = sharedAssetWhere(rawFilter);
  const buckets = STATUS_VALUES.map((status) => ({
    status,
    alias: bucketAlias(status),
  }));
  const inner = buckets
    .map(({ alias }) => `COALESCE(SUM(CASE WHEN status = ? THEN 1 ELSE 0 END), 0) AS ${alias}`)
    .join(',\n');
  const totalExpr = buckets.map(({ alias }) => alias).join(' + ');
  const activeExpr = buckets
    .filter(({ status }) => status !== 'discarded')
    .map(({ alias }) => alias)
    .join(' + ');
  const inStockAlias = buckets.find(({ status }) => status === 'in-stock').alias;
  const outer = [
    ...buckets.map(({ alias }) => alias),
    `(${activeExpr}) AS active_inventory_count`,
    `(${totalExpr}) AS total_record_count`,
    `${inStockAlias} AS available_to_assign_count`,
  ].join(',\n');
  const row = db
    .prepare(
      `SELECT
         ${outer}
       FROM (
         SELECT
           ${inner}
         FROM assets
         ${whereSql}
       )`
    )
    .get(...STATUS_VALUES, ...params);

  const figures = {};
  for (const key of DERIVED_FIGURES) {
    figures[key] = Number(row[key]);
  }
  return figures;
}

function listHolders(db, holderSearch) {
  const groups = db
    .prepare(
      `SELECT
         ${HOLDER_KEY_SQL} AS holder_key,
         ${NEVER_HELD_SQL} AS never_held,
         COUNT(*) AS asset_count
       FROM assets
       GROUP BY ${HOLDER_KEY_SQL}, ${NEVER_HELD_SQL}`
    )
    .all();

  const needle = sanitizeHolderSearch(holderSearch);
  const rows = [];
  for (const group of groups) {
    const derived =
      group.never_held === 1 ? deriveDisplayHolder(null, null) : deriveDisplayHolder(group.holder_key, null);
    if (needle !== null && !derived.displayHolder.includes(needle)) continue;
    rows.push({
      displayHolder: derived.displayHolder,
      count: Number(group.asset_count),
      neverHeld: derived.neverHeld === true,
    });
  }

  rows.sort((a, b) => {
    if (a.displayHolder < b.displayHolder) return -1;
    if (a.displayHolder > b.displayHolder) return 1;
    if (a.neverHeld === b.neverHeld) return 0;
    return a.neverHeld ? 1 : -1;
  });

  return rows.map(({ displayHolder, count }) => ({ displayHolder, count }));
}

module.exports = {
  queryAssets,
  countFigures,
  listHolders,
};
