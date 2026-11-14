'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { resolveActor } = require('../../src/actor');
const { BACKFILL_ACTOR } = require('../../src/domain/vocabulary');

describe('actor resolver', () => {
  const original = Object.prototype.hasOwnProperty.call(process.env, 'ASSET_ACTOR')
    ? process.env.ASSET_ACTOR
    : undefined;

  afterEach(() => {
    if (original === undefined) delete process.env.ASSET_ACTOR;
    else process.env.ASSET_ACTOR = original;
  });

  it('returns a non-empty ASSET_ACTOR with surrounding spaces removed (FR2.2, FR2.3)', () => {
    process.env.ASSET_ACTOR = '  Ada Lovelace  ';
    expect(resolveActor()).toBe('Ada Lovelace');
    process.env.ASSET_ACTOR = 'Ada Lovelace';
    expect(resolveActor()).toBe('Ada Lovelace');
  });

  it('returns system when ASSET_ACTOR is unset (FR2.2)', () => {
    delete process.env.ASSET_ACTOR;
    expect(resolveActor()).toBe('system');
  });

  it('returns system when ASSET_ACTOR is blank or whitespace (FR2.2)', () => {
    process.env.ASSET_ACTOR = '';
    expect(resolveActor()).toBe('system');
    process.env.ASSET_ACTOR = '   ';
    expect(resolveActor()).toBe('system');
    process.env.ASSET_ACTOR = '\t\n';
    expect(resolveActor()).toBe('system');
  });

  it('uses the same fallback literal as BACKFILL_ACTOR and does not import the vocabulary (FR2.2)', () => {
    delete process.env.ASSET_ACTOR;
    expect(resolveActor()).toBe(BACKFILL_ACTOR);
    const source = fs.readFileSync(path.join(__dirname, '../../src/actor.js'), 'utf8');
    expect(source).not.toContain('domain/vocabulary');
    expect(source).not.toMatch(/require\s*\(/);
  });

  it('resolveActor takes no arguments (FR2.2)', () => {
    expect(resolveActor.length).toBe(0);
    process.env.ASSET_ACTOR = 'operator';
    expect(resolveActor()).toBe('operator');
  });
});
