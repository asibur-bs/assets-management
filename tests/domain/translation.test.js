'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { ERROR_CODES } = require('../../src/domain/vocabulary');
const {
  STATUS_BY_CODE,
  translate,
  unknownFailure,
  mapDriverCode,
} = require('../../src/domain/translation');

describe('ErrorTranslation', () => {
  it('NFR2.1.1 / NFR2.1.3 — every code maps to expected HTTP status including INVALID_STATE→400', () => {
    expect(translate('VALIDATION_ERROR')).toMatchObject({ code: 'VALIDATION_ERROR', status: 400, retryable: false });
    expect(translate('DUPLICATE_ASSET')).toMatchObject({ code: 'DUPLICATE_ASSET', status: 409, retryable: false });
    expect(translate('NOT_FOUND')).toMatchObject({ code: 'NOT_FOUND', status: 404, retryable: false });
    expect(translate('INVALID_TRANSITION')).toMatchObject({ code: 'INVALID_TRANSITION', status: 400, retryable: false });
    expect(translate('INVALID_STATE')).toMatchObject({ code: 'INVALID_STATE', status: 400, retryable: false });
    expect(translate('ASSET_DELETE_REFUSED')).toMatchObject({ code: 'ASSET_DELETE_REFUSED', status: 405, retryable: false });
    expect(translate('BUSY_RETRYABLE')).toMatchObject({ code: 'BUSY_RETRYABLE', status: 503, retryable: true });
    expect(translate('INTERNAL')).toMatchObject({ code: 'INTERNAL', status: 500, retryable: false });
    expect(STATUS_BY_CODE.INVALID_STATE).toBe(400);
  });

  it('NFR2.1.2 — return shape is exactly { code, status, retryable } with no message', () => {
    const result = translate('NOT_FOUND');
    expect(Object.keys(result).sort()).toEqual(['code', 'retryable', 'status']);
    expect(result).not.toHaveProperty('message');
  });

  it('NFR2.1.2 — unknown or absent code becomes INTERNAL / 500 / not retryable', () => {
    expect(translate('NOPE')).toEqual({ code: 'INTERNAL', status: 500, retryable: false });
    expect(translate(undefined)).toEqual({ code: 'INTERNAL', status: 500, retryable: false });
    expect(unknownFailure()).toEqual({ code: 'INTERNAL', status: 500, retryable: false });
  });

  it('NFR2.1.5 / Q2 — mapDriverCode maps SQLITE_BUSY only', () => {
    expect(mapDriverCode('SQLITE_BUSY')).toBe('BUSY_RETRYABLE');
    expect(mapDriverCode('SQLITE_CONSTRAINT_UNIQUE')).toBeNull();
    expect(mapDriverCode('SQLITE_ERROR')).toBeNull();
    expect(mapDriverCode(null)).toBeNull();
  });

  it('NFR2.1.5 — busy path is retryable after translate', () => {
    const domain = mapDriverCode('SQLITE_BUSY');
    expect(domain).toBe('BUSY_RETRYABLE');
    expect(translate(domain).retryable).toBe(true);
    expect(ERROR_CODES.BUSY_RETRYABLE.retryable).toBe(true);
  });

  it('NFR2.4.1 — translation may require vocabulary; empty third-party/upward closure on both modules', () => {
    const vocabSrc = fs.readFileSync(
      path.join(__dirname, '../../src/domain/vocabulary.js'),
      'utf8',
    );
    const translationSrc = fs.readFileSync(
      path.join(__dirname, '../../src/domain/translation.js'),
      'utf8',
    );
    expect(translationSrc).toMatch(/require\('\.\/vocabulary'\)/);
    expect(vocabSrc).not.toMatch(/require\(['"]\.\/translation['"]\)/);
    const forbidden = [
      /require\(['"]express['"]\)/,
      /require\(['"]better-sqlite3['"]\)/,
      /require\(['"][^'"]*\/(services|repositories|routes|db)\//,
      /require\(['"]\.\.\/(?!domain)/,
    ];
    for (const src of [vocabSrc, translationSrc]) {
      for (const pattern of forbidden) {
        expect(src).not.toMatch(pattern);
      }
    }
  });

  it('NFR2.4.1 — package entry re-exports both modules', () => {
    const domain = require('../../src/domain');
    expect(typeof domain.translate).toBe('function');
    expect(typeof domain.normalizeSerialOrKey).toBe('function');
    expect(domain.STATUS_VALUES).toHaveLength(5);
  });
});
