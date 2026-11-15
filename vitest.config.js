'use strict';

const { defineConfig } = require('vitest/config');

module.exports = defineConfig({
  test: {
    environment: 'node',
    // `globals: true` lets the CommonJS test files use `describe`/`it`/`expect`
    // without `require('vitest')`, which Vitest 2.x rejects under CommonJS.
    globals: true,
    // Relative to the project root, and also relative to a `--dir` override,
    // so `npx vitest run --dir tests` finds the same files as `npx vitest run`.
    include: ['**/*.test.js'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/data/**', '**/coverage/**'],
    pool: 'forks',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.js'],
      thresholds: {
        lines: 80,
      },
    },
  },
});
