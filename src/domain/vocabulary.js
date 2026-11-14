'use strict';

/** Closed status buckets — stored values, never rendered to a person. */
const STATUS_VALUES = Object.freeze([
  'in-stock',
  'assigned',
  'returned',
  'lost',
  'discarded',
]);

/** Display labels resolved from the same mapping as chip classes. */
const STATUS_LABELS = Object.freeze({
  'in-stock': 'In stock',
  assigned: 'Assigned',
  returned: 'Returned',
  lost: 'Lost',
  discarded: 'Discarded',
});

/**
 * Exactly eight released edges. Deferred edges (in-stock→discarded,
 * returned→discarded) are absent and refused by callers via INVALID_TRANSITION.
 */
const TRANSITION_EDGES = Object.freeze([
  Object.freeze({ from: 'in-stock', to: 'assigned', auditAction: 'assign', reasonRequired: false, reasonSet: null }),
  Object.freeze({ from: 'in-stock', to: 'lost', auditAction: 'mark-lost', reasonRequired: true, reasonSet: 'loss' }),
  Object.freeze({ from: 'assigned', to: 'returned', auditAction: 'return', reasonRequired: false, reasonSet: null }),
  Object.freeze({ from: 'assigned', to: 'lost', auditAction: 'mark-lost', reasonRequired: true, reasonSet: 'loss' }),
  Object.freeze({ from: 'assigned', to: 'discarded', auditAction: 'discarded', reasonRequired: true, reasonSet: 'retirement' }),
  Object.freeze({ from: 'returned', to: 'assigned', auditAction: 'assign', reasonRequired: false, reasonSet: null }),
  Object.freeze({ from: 'returned', to: 'lost', auditAction: 'mark-lost', reasonRequired: true, reasonSet: 'loss' }),
  Object.freeze({ from: 'lost', to: 'in-stock', auditAction: 'recovered', reasonRequired: true, reasonSet: 'recovery' }),
]);

const LOSS_REASONS = Object.freeze(['damaged', 'lost', 'stolen']);
const RETIREMENT_REASONS = Object.freeze([
  'superseded',
  'returned-to-supplier',
  'written-off',
]);

const AUDIT_ACTIONS = Object.freeze([
  'create',
  'assign',
  'return',
  'mark-lost',
  'recovered',
  'discarded',
  'edit',
]);

/** Sole frozen source of the eight error codes and retryable flags. */
const ERROR_CODES = Object.freeze({
  VALIDATION_ERROR: Object.freeze({ retryable: false }),
  DUPLICATE_ASSET: Object.freeze({ retryable: false }),
  NOT_FOUND: Object.freeze({ retryable: false }),
  INVALID_TRANSITION: Object.freeze({ retryable: false }),
  INVALID_STATE: Object.freeze({ retryable: false }),
  ASSET_DELETE_REFUSED: Object.freeze({ retryable: false }),
  BUSY_RETRYABLE: Object.freeze({ retryable: true }),
  INTERNAL: Object.freeze({ retryable: false }),
});

const BACKFILL_ACTOR = 'system';
const UNASSIGNED_DESIGNATION = 'Unassigned';

const FORM_FILTER_DIMENSIONS = Object.freeze([
  'search_text',
  'category',
  'status',
  'sort_column',
  'sort_direction',
]);

/** Carried in filter state; set by a directory row link — not a form field. */
const FILTER_STATE_HOLDER_DIMENSION = 'holder';

/**
 * Directory holder-row search (BR8.5 / contract 10). Not an asset-filter
 * dimension; filters holder rows, not assets.
 */
const HOLDER_SEARCH_DIMENSION = 'holder_search';

const CATEGORY_VALUES = Object.freeze(['hardware', 'software-license']);
const SORT_COLUMNS = Object.freeze(['name', 'created_at']);
const SORT_DIRECTIONS = Object.freeze(['asc', 'desc']);

const DERIVED_FIGURES = Object.freeze([
  'in_stock_count',
  'assigned_count',
  'returned_count',
  'lost_count',
  'discarded_count',
  'active_inventory_count',
  'total_record_count',
  'available_to_assign_count',
]);

const ENUM_FILTER_ACCEPTANCE = Object.freeze({
  category: CATEGORY_VALUES,
  status: STATUS_VALUES,
  sort_column: SORT_COLUMNS,
  sort_direction: SORT_DIRECTIONS,
});

/**
 * Contract 3 dimension records. search_text matches name and serial-or-key.
 * holder matches the derived display holder, not the raw current-holder column.
 */
const FILTER_DIMENSIONS = Object.freeze([
  Object.freeze({
    name: 'search_text',
    kind: 'free-text',
    applies_to: Object.freeze(['name', 'serial_or_key']),
    whitelisted_literal: false,
  }),
  Object.freeze({
    name: 'category',
    kind: 'enumerated',
    accepted_values: CATEGORY_VALUES,
    whitelisted_literal: false,
  }),
  Object.freeze({
    name: 'status',
    kind: 'enumerated',
    accepted_values: STATUS_VALUES,
    whitelisted_literal: false,
  }),
  Object.freeze({
    name: 'sort_column',
    kind: 'enumerated',
    accepted_values: SORT_COLUMNS,
    whitelisted_literal: true,
  }),
  Object.freeze({
    name: 'sort_direction',
    kind: 'enumerated',
    accepted_values: SORT_DIRECTIONS,
    whitelisted_literal: true,
  }),
  Object.freeze({
    name: 'holder',
    kind: 'free-text',
    applies_to: Object.freeze(['display_holder']),
    whitelisted_literal: false,
  }),
]);

function isStatus(value) {
  return STATUS_VALUES.includes(value);
}

function statusLabel(status) {
  return STATUS_LABELS[status];
}

function findTransition(from, to) {
  return TRANSITION_EDGES.find((edge) => edge.from === from && edge.to === to) || null;
}

function isLegalTransition(from, to) {
  return findTransition(from, to) !== null;
}

function acceptableReasonsFor(operation) {
  if (operation === 'loss' || operation === 'recovery') {
    return LOSS_REASONS.slice();
  }
  if (operation === 'retirement') {
    return LOSS_REASONS.concat(RETIREMENT_REASONS);
  }
  return [];
}

function isAcceptableReason(operation, reason) {
  return acceptableReasonsFor(operation).includes(reason);
}

/**
 * Expression the functional unique index must use, within a category.
 * SQLite LOWER is ASCII-only, matching the fold below. NULL stays NULL, so
 * a missing serial does not collide with a blank one.
 */
const SERIAL_OR_KEY_INDEX_EXPRESSION = 'LOWER(TRIM(serial_or_key))';

/**
 * Serial/licence-key normalisation: trim U+0020 only, then ASCII A–Z fold.
 * SQLite TRIM and LOWER are the other tier of this same definition. TRIM
 * removes only U+0020, and LOWER leaves non-ASCII letters unchanged.
 * A non-string is not a serial; it stays null, the same as LOWER(TRIM(NULL)).
 */
function normalizeSerialOrKey(value) {
  if (typeof value !== 'string') return null;
  return value.replace(/^[ ]+|[ ]+$/g, '').replace(/[A-Z]/g, (ch) => ch.toLowerCase());
}

function storedSerialOrKey(row) {
  if (row.serialOrKey !== undefined) return row.serialOrKey;
  return row.serial_or_key;
}

function serialOrKeyCollides(candidate, category, existingRows, excludeAssetId) {
  const normalized = normalizeSerialOrKey(candidate);
  if (normalized === null) return false;
  return existingRows.some((row) => {
    if (excludeAssetId != null && row.id === excludeAssetId) return false;
    if (row.category !== category) return false;
    const stored = normalizeSerialOrKey(storedSerialOrKey(row));
    if (stored === null) return false;
    return stored === normalized;
  });
}

function holderText(value) {
  if (value == null) return null;
  const text = String(value);
  return text.length > 0 ? text : null;
}

/**
 * Display-holder derivation: current → previous → reserved Unassigned.
 * Directory and holder-dimension use only. Do not use this for the two raw
 * holder columns — those must not fall back (projectHolderColumns).
 * Returns { displayHolder, neverHeld, isHolder }.
 */
function deriveDisplayHolder(currentHolder, previousHolder) {
  const current = holderText(currentHolder);
  if (current !== null) {
    return {
      displayHolder: current,
      neverHeld: false,
      isHolder: true,
    };
  }
  const previous = holderText(previousHolder);
  if (previous !== null) {
    return {
      displayHolder: previous,
      neverHeld: false,
      isHolder: true,
    };
  }
  return {
    displayHolder: UNASSIGNED_DESIGNATION,
    neverHeld: true,
    isHolder: false,
  };
}

/**
 * BR7.2 — the two raw holder columns. Neither field copies the other.
 * An empty field stays empty; Unassigned is not filled in here.
 */
function projectHolderColumns(currentHolder, previousHolder) {
  return {
    currentHolder: holderText(currentHolder),
    lastHolder: holderText(previousHolder),
  };
}

/**
 * BR7.4 — distinct display holders, excluding the reserved Unassigned row.
 * `derivedHolders` are deriveDisplayHolder results. renderedRowCount is the
 * holder count plus one when that reserved row is present. This does not
 * render a directory and does not apply a reconciliation seed.
 */
function countDisplayHolders(derivedHolders) {
  const rows = Array.isArray(derivedHolders) ? derivedHolders : [];
  const holders = new Set();
  let reservedRow = false;
  for (const row of rows) {
    if (!row || row.isHolder !== true) {
      if (row && row.neverHeld === true) reservedRow = true;
      continue;
    }
    const text = holderText(row.displayHolder);
    if (text !== null) holders.add(text);
  }
  const holderCount = holders.size;
  return {
    holderCount,
    reservedRow,
    renderedRowCount: holderCount + (reservedRow ? 1 : 0),
  };
}

function isBackfillActor(value) {
  return value === BACKFILL_ACTOR;
}

function isErrorCode(code) {
  return Object.prototype.hasOwnProperty.call(ERROR_CODES, code);
}

function isRetryableCode(code) {
  return isErrorCode(code) ? ERROR_CODES[code].retryable === true : false;
}

/**
 * BR8.2–BR8.3: build the effective asset-filter dimensions.
 * Invalid enum values omit that dimension only; free-text kept if non-empty.
 * `holder_search` is never part of the asset filter (BR8.5).
 */
function sanitizeAssetFilter(raw) {
  const input = raw && typeof raw === 'object' ? raw : {};
  const out = {};

  if (typeof input.search_text === 'string' && input.search_text.length > 0) {
    out.search_text = input.search_text;
  }

  for (const [dim, accepted] of Object.entries(ENUM_FILTER_ACCEPTANCE)) {
    const value = input[dim];
    if (accepted.includes(value)) out[dim] = value;
  }

  if (typeof input.holder === 'string' && input.holder.length > 0) {
    out.holder = input.holder;
  }

  return out;
}

/** BR8.5 — holder-row search; returns null when blank (no filter). */
function sanitizeHolderSearch(text) {
  if (typeof text !== 'string' || text.length === 0) return null;
  return text;
}

function textContains(haystack, searchText) {
  const needle = sanitizeHolderSearch(searchText);
  if (needle === null) return true;
  return String(haystack ?? '').includes(needle);
}

function foldAscii(value) {
  return String(value).replace(/[A-Z]/g, (ch) => ch.toLowerCase());
}

function assetMatchesSearchText(asset, searchText) {
  if (typeof searchText !== 'string' || searchText.length === 0) return true;
  const needle = foldAscii(searchText);
  const name = foldAscii(asset && asset.name != null ? String(asset.name) : '');
  const serialRaw = asset && (asset.serialOrKey != null ? asset.serialOrKey : asset.serial_or_key);
  const serial = foldAscii(serialRaw != null ? String(serialRaw) : '');
  return name.includes(needle) || serial.includes(needle);
}

function holderDimensionMatches(currentHolder, previousHolder, searchText) {
  return textContains(
    deriveDisplayHolder(currentHolder, previousHolder).displayHolder,
    searchText,
  );
}

function holderRowMatchesSearch(currentOrDisplay, searchText, previousHolder) {
  return holderDimensionMatches(currentOrDisplay, previousHolder, searchText);
}

/**
 * BR9 counting predicates — definitions only (aggregation is U4).
 * `bucketCounts` is a map status → non-negative integer.
 */
/** Sum of the five status-bucket counts (BR9.1 left-hand side). */
function sumStatusBuckets(bucketCounts) {
  return STATUS_VALUES.reduce((sum, status) => sum + (bucketCounts[status] || 0), 0);
}

/** BR9.1 — total records equals the sum of the five exclusive buckets. */
function totalRecordCount(bucketCounts) {
  return sumStatusBuckets(bucketCounts);
}

function activeInventoryCount(bucketCounts) {
  return totalRecordCount(bucketCounts) - (bucketCounts.discarded || 0);
}

function availableToAssignCount(bucketCounts) {
  return bucketCounts['in-stock'] || 0;
}

/**
 * BR9.1 check against an independently supplied total (e.g. COUNT(*)).
 * Returns false when `declaredTotal` is not a finite number.
 */
function bucketsSumToTotal(bucketCounts, declaredTotal) {
  if (typeof declaredTotal !== 'number' || !Number.isFinite(declaredTotal)) {
    return false;
  }
  return sumStatusBuckets(bucketCounts) === declaredTotal;
}

module.exports = {
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
  CATEGORY_VALUES,
  SORT_COLUMNS,
  SORT_DIRECTIONS,
  DERIVED_FIGURES,
  ENUM_FILTER_ACCEPTANCE,
  FILTER_DIMENSIONS,
  SERIAL_OR_KEY_INDEX_EXPRESSION,
  isStatus,
  statusLabel,
  findTransition,
  isLegalTransition,
  acceptableReasonsFor,
  isAcceptableReason,
  normalizeSerialOrKey,
  serialOrKeyCollides,
  assetMatchesSearchText,
  holderDimensionMatches,
  deriveDisplayHolder,
  projectHolderColumns,
  countDisplayHolders,
  isBackfillActor,
  isErrorCode,
  isRetryableCode,
  sanitizeAssetFilter,
  sanitizeHolderSearch,
  holderRowMatchesSearch,
  sumStatusBuckets,
  totalRecordCount,
  activeInventoryCount,
  availableToAssignCount,
  bucketsSumToTotal,
};
