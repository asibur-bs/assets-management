'use strict';

const js = require('@eslint/js');

// Node built-ins are not in the language's default globals. Declaring them
// here keeps `no-undef` on, for src and for tests.
const nodeGlobals = {
  __dirname: 'readonly',
  __filename: 'readonly',
  Buffer: 'readonly',
  clearImmediate: 'readonly',
  clearInterval: 'readonly',
  clearTimeout: 'readonly',
  console: 'readonly',
  exports: 'writable',
  global: 'readonly',
  module: 'readonly',
  process: 'readonly',
  require: 'readonly',
  setImmediate: 'readonly',
  setInterval: 'readonly',
  setTimeout: 'readonly',
};

module.exports = [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: nodeGlobals,
    },
    rules: {
      strict: ['error', 'global'],
    },
  },
  {
    // One exception: tests bind `const create = await request(...)` and then
    // read the new id from the database, so the response itself is unused.
    files: ['tests/**/*.js'],
    languageOptions: {
      globals: {
        afterEach: 'readonly',
        beforeEach: 'readonly',
        describe: 'readonly',
        expect: 'readonly',
        it: 'readonly',
      },
    },
    rules: {
      'no-unused-vars': [
        'error',
        {
          args: 'after-used',
          varsIgnorePattern: '^create$',
        },
      ],
    },
  },
];
