'use strict';

const crypto = require('node:crypto');

const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEY_LEN = 32;
const SCRYPT_OPTIONS = Object.freeze({
  N: SCRYPT_N,
  r: SCRYPT_R,
  p: SCRYPT_P,
  maxmem: 64 * 1024 * 1024,
});

function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, KEY_LEN, SCRYPT_OPTIONS);
  return ['scrypt', SCRYPT_N, SCRYPT_R, SCRYPT_P, salt.toString('base64url'), hash.toString('base64url')].join('$');
}

function verifyPassword(password, stored) {
  if (typeof password !== 'string' || typeof stored !== 'string') return false;
  const parts = stored.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
  if (parts[1] !== String(SCRYPT_N) || parts[2] !== String(SCRYPT_R) || parts[3] !== String(SCRYPT_P)) {
    return false;
  }
  const salt = Buffer.from(parts[4], 'base64url');
  const expected = Buffer.from(parts[5], 'base64url');
  if (salt.length !== 16 || expected.length !== KEY_LEN) return false;
  const actual = crypto.scryptSync(password, salt, KEY_LEN, SCRYPT_OPTIONS);
  return crypto.timingSafeEqual(actual, expected);
}

const DUMMY_HASH = hashPassword('placeholder-not-a-password');

module.exports = {
  DUMMY_HASH,
  hashPassword,
  verifyPassword,
};
