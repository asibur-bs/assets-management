'use strict';

const ExcelJS = require('exceljs');
const { normalizeSerialOrKey } = require('../domain/vocabulary');

const HEADERS = Object.freeze(['Category', 'Name', 'Serial / Key', 'Model', 'Notes']);
const MAX_IMPORT_ROWS = 500;
const MAX_PROBLEM_MESSAGES = 40;
const XLSX_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

const MANUAL_LINES = Object.freeze([
  'How to import assets',
  'Fill in the import template and upload that workbook from the asset list. This manual is not the file you import.',
  'Save the workbook as Excel (.xlsx). Other formats are refused.',
  'Keep the first row of the Assets sheet exactly as: Category, Name, Serial / Key, Model, Notes.',
  'Category must be hardware or software-license.',
  'Name is required. Serial / Key is required. Model and Notes may be left blank.',
  'Put one asset on each row, starting at row 2. Leave unused rows blank. One file can hold at most 500 assets.',
  'A serial or key can be used once in each category. Capital letters and spaces at the ends do not make a different serial. The same serial may be used again only in the other category.',
  'If two rows share a serial in the same category, or a serial is already registered, the import stops. No row from that file is added. The message names the rows to change.',
  'Delete the example row in the template before you import, or replace it with a real asset.',
  'Each imported asset is registered as In stock. Assign it from the asset page when someone should hold it.',
]);

function cellText(value) {
  if (value == null) return '';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : '';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object') {
    if (typeof value.text === 'string') return value.text;
    if (Array.isArray(value.richText)) return value.richText.map((part) => part.text || '').join('');
    if (Object.prototype.hasOwnProperty.call(value, 'result')) return cellText(value.result);
  }
  return String(value);
}

function canonicalCategory(value) {
  const text = value.trim().toLowerCase().replace(/\s+/g, ' ');
  if (text === 'hardware') return 'hardware';
  if (text === 'software-license' || text === 'software license') return 'software-license';
  return '';
}

function headerProblem() {
  return `The first row is not the template heading. Download the import template and keep this first row unchanged: ${HEADERS.join(', ')}.`;
}

function quote(value) {
  return `"${String(value).replaceAll('"', "'")}"`;
}

async function workbookBuffer(fill) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Asset Tracker';
  fill(workbook);
  const out = await workbook.xlsx.writeBuffer();
  return Buffer.from(out);
}

function templateBuffer() {
  return workbookBuffer((workbook) => {
    const sheet = workbook.addWorksheet('Assets');
    sheet.addRow([...HEADERS]);
    sheet.getRow(1).font = { bold: true };
    sheet.addRow([
      'hardware',
      'Example laptop',
      'EXAMPLE-0001',
      'Latitude',
      'Delete this example row before you import.',
    ]);
    sheet.columns = [{ width: 22 }, { width: 28 }, { width: 24 }, { width: 22 }, { width: 48 }];
    const note = workbook.addWorksheet('Read me');
    note.getColumn(1).width = 88;
    note.addRow(['Replace the example row on the Assets sheet. Download the import manual for the full rules.']);
    note.getRow(1).alignment = { wrapText: true };
  });
}

function manualBuffer() {
  return workbookBuffer((workbook) => {
    const sheet = workbook.addWorksheet('How to import');
    sheet.getColumn(1).width = 108;
    MANUAL_LINES.forEach((line, index) => {
      const row = sheet.addRow([line]);
      row.alignment = { wrapText: true, vertical: 'top' };
      if (index === 0) row.font = { bold: true };
    });
  });
}

async function readAssetRows(buffer) {
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(buffer);
  } catch {
    return {
      rows: [],
      problems: [
        'This file could not be read as an Excel workbook. Download the template and save your changes as .xlsx.',
      ],
    };
  }
  const sheet = workbook.getWorksheet('Assets') || workbook.worksheets[0];
  if (!sheet) {
    return { rows: [], problems: [headerProblem()] };
  }
  const heading = HEADERS.map((label, index) => cellText(sheet.getRow(1).getCell(index + 1).value).trim());
  if (heading.some((label, index) => label !== HEADERS[index])) {
    return { rows: [], problems: [headerProblem()] };
  }
  const rows = [];
  const last = Math.min(sheet.rowCount, MAX_IMPORT_ROWS + 2);
  for (let number = 2; number <= last; number += 1) {
    const row = sheet.getRow(number);
    const values = HEADERS.map((_, index) => cellText(row.getCell(index + 1).value).trim());
    if (values.every((value) => value.length === 0)) continue;
    rows.push({
      rowNumber: number,
      category: values[0],
      name: values[1],
      serialOrKey: values[2],
      model: values[3],
      notes: values[4],
    });
  }
  if (sheet.rowCount > MAX_IMPORT_ROWS + 1) {
    let extra = 0;
    for (let number = MAX_IMPORT_ROWS + 2; number <= sheet.rowCount; number += 1) {
      const row = sheet.getRow(number);
      const filled = HEADERS.some((_, index) => cellText(row.getCell(index + 1).value).trim().length > 0);
      if (filled) extra += 1;
    }
    if (rows.length + extra > MAX_IMPORT_ROWS) {
      return {
        rows: [],
        problems: [
          `This workbook has more than ${MAX_IMPORT_ROWS} asset rows. Split it into files of ${MAX_IMPORT_ROWS} assets or fewer, then import each file.`,
        ],
      };
    }
  }
  if (rows.length === 0) {
    return {
      rows: [],
      problems: [
        'There are no asset rows under the heading. Add one asset per row, starting on row 2, then import the file again.',
      ],
    };
  }
  return { rows, problems: [] };
}

function reviewRows(rows, findExisting) {
  const problems = [];
  const ready = [];
  const seen = new Map();

  rows.forEach((row) => {
    const category = canonicalCategory(row.category);
    const name = row.name.trim();
    const serialOrKey = row.serialOrKey.trim();
    if (!category) {
      problems.push(
        `Row ${row.rowNumber}: category ${quote(row.category || '')} is not one of the two accepted values. Enter hardware or software-license.`
      );
    }
    if (!name) {
      problems.push(`Row ${row.rowNumber}: the Name cell is empty. Enter the name of the asset.`);
    }
    if (!serialOrKey) {
      problems.push(`Row ${row.rowNumber}: the Serial / Key cell is empty. Every asset needs a serial or licence key.`);
    }
    if (!category || !name || !serialOrKey) return;
    const key = `${category}\u0000${normalizeSerialOrKey(serialOrKey)}`;
    const group = seen.get(key) || [];
    group.push({ rowNumber: row.rowNumber, category, serialOrKey });
    seen.set(key, group);
    ready.push({
      rowNumber: row.rowNumber,
      category,
      name,
      serialOrKey,
      model: row.model.trim() || null,
      notes: row.notes.trim() || null,
      key,
    });
  });

  const repeated = new Set();
  for (const group of seen.values()) {
    if (group.length < 2) continue;
    group.forEach((row) => repeated.add(row.rowNumber));
    const numbers = group.map((row) => row.rowNumber).join(', ');
    const sample = group[0];
    problems.push(
      `Rows ${numbers} use the same serial or key ${quote(sample.serialOrKey)} in category ${sample.category}. A serial or key can be used once in a category. Capital letters and spaces at the ends do not count as a difference. Change the repeated rows so each one is unique.`
    );
  }

  ready.forEach((row) => {
    if (repeated.has(row.rowNumber)) return;
    const existing = findExisting(row.category, row.serialOrKey);
    if (!existing) return;
    problems.push(
      `Row ${row.rowNumber}: serial or key ${quote(row.serialOrKey)} is already registered on ${quote(existing.name)} in category ${row.category}. Choose a different serial or key, or leave this row out and edit that asset instead.`
    );
  });

  const records = ready
    .filter((row) => !repeated.has(row.rowNumber))
    .map(({ category, name, serialOrKey, model, notes }) => ({
      category,
      name,
      serialOrKey,
      model,
      notes,
    }));

  return {
    problems: capProblems(problems),
    records: problems.length === 0 ? records : [],
  };
}

function capProblems(problems) {
  if (problems.length <= MAX_PROBLEM_MESSAGES) return problems;
  const shown = problems.slice(0, MAX_PROBLEM_MESSAGES);
  const more = problems.length - shown.length;
  shown.push(`There are ${more} more problems in this file. Fix the rows listed here, then import the file again.`);
  return shown;
}

function isXlsxName(filename) {
  return typeof filename === 'string' && filename.trim().toLowerCase().endsWith('.xlsx');
}

module.exports = {
  HEADERS,
  MAX_IMPORT_ROWS,
  XLSX_TYPE,
  templateBuffer,
  manualBuffer,
  readAssetRows,
  reviewRows,
  isXlsxName,
};
