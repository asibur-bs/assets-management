'use strict';

const { deriveDisplayHolder } = require('../domain/vocabulary');

const CSV_FILENAME = 'assets-export.csv';
const CSV_CONTENT_TYPE = 'text/csv; charset=utf-8';

const HEADER = 'Name, Category, Serial / Key, Status, Holder, Last holder';

/** Formula-injection triggers. A carriage return is not a newline for quoting. */
const FORMULA_START = new Set(['=', '+', '-', '@', '\t', '\r']);

function cellText(value) {
  if (value == null) return '';
  return String(value);
}

function field(row, snake, camel) {
  if (row && row[snake] !== undefined) return row[snake];
  if (camel && row && row[camel] !== undefined) return row[camel];
  return undefined;
}

/**
 * Prefix one single quote when the cell would be read as a formula, then
 * quote the cell when it contains a comma, a quote, or a newline.
 */
function escapeCell(value) {
  const text = cellText(value);
  const guarded = text.length > 0 && FORMULA_START.has(text[0]) ? `'${text}` : text;
  if (/[",\n]/.test(guarded)) {
    return `"${guarded.replaceAll('"', '""')}"`;
  }
  return guarded;
}

function cellsFor(row) {
  const current = field(row, 'assigned_to', 'assignedTo');
  const previous = field(row, 'last_assigned_to', 'lastAssignedTo');
  const derived = deriveDisplayHolder(current, previous);
  return [
    field(row, 'name'),
    field(row, 'category'),
    field(row, 'serial_or_key', 'serialOrKey'),
    field(row, 'status'),
    derived.displayHolder,
    previous == null ? '' : previous,
  ];
}

function renderCsv(rows) {
  const list = Array.isArray(rows) ? rows : [];
  const lines = [HEADER];
  for (const row of list) {
    lines.push(cellsFor(row).map(escapeCell).join(','));
  }
  return `${lines.join('\n')}\n`;
}

module.exports = {
  renderCsv,
  CSV_FILENAME,
  CSV_CONTENT_TYPE,
};
