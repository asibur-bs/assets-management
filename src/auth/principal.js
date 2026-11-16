'use strict';

const { AsyncLocalStorage } = require('node:async_hooks');

const storage = new AsyncLocalStorage();

function runAsPrincipal(principal, fn) {
  storage.run(principal || null, fn);
}

function currentPrincipal() {
  const value = storage.getStore();
  if (!value || typeof value !== 'object') return null;
  return value;
}

function signedInDisplayName() {
  const principal = currentPrincipal();
  if (!principal || typeof principal.displayName !== 'string') return null;
  const name = principal.displayName.trim();
  return name.length > 0 ? name : null;
}

function signedInRole() {
  const principal = currentPrincipal();
  if (!principal || typeof principal.role !== 'string') return null;
  return principal.role;
}

module.exports = {
  currentPrincipal,
  runAsPrincipal,
  signedInDisplayName,
  signedInRole,
};
