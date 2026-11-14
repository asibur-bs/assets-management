'use strict';

const { ERROR_CODES, isErrorCode } = require('./vocabulary');

/** Code-to-status mapping — owned here; codes/retryable come from vocabulary. */
const STATUS_BY_CODE = Object.freeze({
  VALIDATION_ERROR: 400,
  DUPLICATE_ASSET: 409,
  NOT_FOUND: 404,
  INVALID_TRANSITION: 400,
  INVALID_STATE: 400,
  ASSET_DELETE_REFUSED: 405,
  BUSY_RETRYABLE: 503,
  INTERNAL: 500,
});

/**
 * Translate a domain code to the boundary reading.
 * Returns exactly { code, status, retryable } — never a message field.
 */
function translate(domainCode) {
  if (!isErrorCode(domainCode)) {
    return unknownFailure();
  }
  return Object.freeze({
    code: domainCode,
    status: STATUS_BY_CODE[domainCode],
    retryable: ERROR_CODES[domainCode].retryable,
  });
}

function unknownFailure() {
  return Object.freeze({
    code: 'INTERNAL',
    status: 500,
    retryable: false,
  });
}

/**
 * Map a SQLite driver code to a domain code, or null when not busy.
 * Consumers detect the driver code themselves; this helper stays pure.
 */
function mapDriverCode(sqliteCode) {
  return sqliteCode === 'SQLITE_BUSY' ? 'BUSY_RETRYABLE' : null;
}

module.exports = {
  STATUS_BY_CODE,
  translate,
  unknownFailure,
  mapDriverCode,
};
