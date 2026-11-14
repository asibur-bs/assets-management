'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..', '..');

describe('tooling configuration', () => {
  it('NFR6.2.1 — coverage.thresholds.lines is 80 and include covers src/**/*.js', () => {
    const vitestConfig = require(path.join(root, 'vitest.config.js'));
    expect(vitestConfig.test.coverage.thresholds.lines).toBe(80);
    expect(vitestConfig.test.coverage.include).toContain('src/**/*.js');
  });

  it('C12 / D-TS-03 — Prettier options match the affirmed set', () => {
    const prettier = JSON.parse(fs.readFileSync(path.join(root, '.prettierrc.json'), 'utf8'));
    expect(prettier.printWidth).toBe(120);
    expect(prettier.singleQuote).toBe(true);
    expect(prettier.trailingComma).toBe('es5');
    expect(prettier.semi).toBe(true);
    expect(prettier.tabWidth).toBe(2);
    expect(prettier.arrowParens).toBe('always');
    expect(prettier.endOfLine).toBe('lf');
  });

  it('D-TS-10 — .prettierignore excludes views/ and public/; format:check does not list them', () => {
    const ignore = fs.readFileSync(path.join(root, '.prettierignore'), 'utf8');
    expect(ignore).toMatch(/views\//);
    expect(ignore).toMatch(/public\//);
    const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
    expect(pkg.scripts['format:check']).toBeDefined();
    expect(pkg.scripts['format:check']).not.toMatch(/views/);
    expect(pkg.scripts['format:check']).not.toMatch(/public/);
  });

  it('D-TS-04 — ESLint sets strict global and one test-scoped override', () => {
    const source = fs.readFileSync(path.join(root, 'eslint.config.js'), 'utf8');
    expect(source).toMatch(/strict:\s*\[\s*'error'\s*,\s*'global'\s*\]/);
    expect(source).toMatch(/files:\s*\[\s*'tests\/\*\*\/\*\.js'\s*\]/);
    // Exactly one files-glob override for the test tree; src/ is not in that override.
    const overrideBlocks = source.match(/files:\s*\[[^\]]+\]/g) || [];
    const testOverrides = overrideBlocks.filter((b) => b.includes('tests/**/*.js'));
    expect(testOverrides).toHaveLength(1);
    expect(testOverrides[0]).not.toMatch(/src\//);
  });

  it('D-TS-11 — lint script is scoped to src tests vitest.config.js', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
    const lint = pkg.scripts.lint;
    expect(lint).toMatch(/^eslint(\s+--\S+)*\s+src\s+tests\s+vitest\.config\.js$/);
    expect(lint).not.toMatch(/aidlc/);
    expect(lint).not.toMatch(/\.claude/);
    expect(lint).not.toMatch(/\.puku-cli/);
  });

  it('NFR5.1.1 — no Dockerfile, docker-compose.yml, or compose.yml at repo root', () => {
    expect(fs.existsSync(path.join(root, 'Dockerfile'))).toBe(false);
    expect(fs.existsSync(path.join(root, 'docker-compose.yml'))).toBe(false);
    expect(fs.existsSync(path.join(root, 'compose.yml'))).toBe(false);
  });

  it('NFR2.4.6 — production deps unchanged; tooling packages are devDependencies', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
    expect(Object.keys(pkg.dependencies).sort()).toEqual(['better-sqlite3', 'ejs', 'express']);
    for (const name of ['prettier', 'eslint', '@eslint/js', 'lefthook']) {
      expect(pkg.devDependencies[name]).toBeDefined();
      expect(pkg.dependencies[name]).toBeUndefined();
    }
  });
});
