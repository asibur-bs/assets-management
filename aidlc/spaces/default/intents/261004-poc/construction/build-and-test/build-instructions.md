# Build Instructions

Build and run instructions for the `poc` scope of the assets-management
application. These are the commands Build and Test executes and re-runs on a
clean checkout.

## 1. Prerequisites

| Requirement | Version | Check |
|-------------|---------|-------|
| Node.js | ≥ 20.0.0 (`engines.node` in `package.json`) | `node --version` |
| npm | ships with Node ≥ 20 | `npm --version` |
| OS | Linux or macOS (NFR4 — a single host) | `uname -s` |

No database server, container runtime, or other external service is required.
The application uses an embedded SQLite file (`better-sqlite3`), which is
consistent with NFR3 ("no external services").

`better-sqlite3` is a native addon. A prebuilt binary is downloaded for the
common platforms; if no prebuild matches, a C++ toolchain (`python3`,
`make`, `g++`) is needed for the fallback compile.

## 2. Dependency Installation

From the project root:

```bash
npm install
```

This installs the three runtime dependencies (`better-sqlite3`, `ejs`,
`express`) and the four dev dependencies (`vitest`, `@vitest/coverage-v8`,
`supertest`, plus their transitive packages).

`package-lock.json` is committed, so a repeatable install is:

```bash
npm ci
```

## 3. Environment Setup

The application reads two environment variables, both optional:

| Variable | Default | Purpose |
|----------|---------|---------|
| `PORT` | `3000` | TCP port the server listens on |
| `DB_PATH` | `data/assets.sqlite` (relative to the project root) | SQLite database file |

There is **no** configuration file, no secret, and no credential in this
project. Nothing needs to be provisioned before the app starts.

```bash
# Optional: run on a different port against a throwaway database
PORT=3197 DB_PATH=/tmp/assets-smoke.sqlite npm start
```

The `data/` directory is created on demand by `src/db/index.js` when the
database file is opened. The `data/` path is git-ignored.

### Schema migration

`src/db/migrate.js` runs automatically at startup through `src/db/index.js` →
`openDatabase()`. Migrations are versioned and recorded in a
`schema_migrations` table, so a database written by an earlier release is
migrated in place on the next start, preserving its rows. **No manual
migration step is required.**

## 4. Build Commands

This is a plain CommonJS Node.js application. There is no compile, bundle, or
transpile step — "building" means installing dependencies and letting the
migration runner prepare the database.

```bash
npm install     # 1. install dependencies
node --check src/server.js   # 2. syntax-check the entry point
```

The syntax check is the build gate: it fails loudly on a parse error in any
entry module without needing the server to bind a port. The full set of
modules is exercised by the test suite in Step 5.

## 5. Build Verification Steps

| # | Check | Command | Expected |
|---|-------|---------|----------|
| B1 | Dependencies installed | `npm ls --depth=0` | Every declared dependency present, no `UNMET DEPENDENCY` |
| B2 | Entry point parses | `node --check src/server.js` | Exit 0, no output |
| B3 | Database opens and migrates | `node -e "const {openDatabase}=require('./src/db');const db=openDatabase(':memory:');console.log(db.prepare('select count(*) c from assets').get().c)"` | Prints `0` (exit 0) |
| B4 | App boots and serves | `npm start` then `curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/assets` | `200` |
| B5 | Root redirects to the list view | `curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/` | `302` |

B4 and B5 together are the live end-to-end boot check that satisfies NFR3
(one `npm start`, no external service) and NFR7 (runnable end-to-end).

## 6. Test Commands

From `unit-test-instructions.md`, deduplicated — each distinct command is run
once:

```bash
npx vitest run tests/db.test.js
npx vitest run tests/assets-repo.test.js
npx vitest run tests/asset-service.test.js
npx vitest run tests/routes.test.js
npx vitest run tests/views.test.js
npx vitest run --dir tests
```

Equivalent per-layer aliases exist as npm scripts (`npm run test:db`,
`test:repo`, `test:service`, `test:routes`, `test:views`,
`test:coverage`). The `npx vitest` form is the canonical one because it is
what the unit-test instructions record.

Coverage is **informational** for this scope — `poc` sets no coverage floor:

```bash
npx vitest run --coverage --dir tests
```

## 7. Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| `Vitest cannot be imported in a CommonJS module using require()` | A test file calls `require('vitest')`. Vitest 2.x rejects this under CommonJS. | Do not add such an import. `vitest.config.js` already sets `globals: true`; use the global `describe`/`it`/`expect` directly. |
| `Error: Cannot find module 'supertest'` | A script was run from outside the project root, so `node_modules` did not resolve. | Run from the project root. |
| `Error: Cannot find module 'better-sqlite3'` | Native addon did not build. | `npm rebuild better-sqlite3`. If it compiles from source, install `python3`, `make`, `g++`. |
| `EADDRINUSE :::3000` | Port 3000 is occupied. | `PORT=3197 npm start`. |
| `SQLITE_CANTOPEN` on start | The `data/` directory does not exist and the file path is not creatable. | `mkdir -p data`, or point `DB_PATH` at a writable path. |
| `SQLITE_BUSY` under write load | A long-running write transaction is holding the lock. | WAL journalling is already enabled (`src/db/index.js`). Keep transactions short; do not run the server and a heavy writer against the same file. |
| Migration error on an old database | The `schema_migrations` table is out of step with `src/db/migrations.sql`. | Back up the file, then start the app once — `src/db/migrate.js` applies each migration exactly once and records it. |
| Test file not picked up | The `include` pattern does not match the file. | `vitest.config.js` includes `**/*.test.js` under `tests/`. Name test files `*.test.js` inside `tests/`. |

## 8. Cleanup

```bash
rm -rf data/            # remove the local SQLite database
rm -rf coverage/        # remove a coverage report
rm -rf node_modules/    # remove installed dependencies
```

Both `data/` and `coverage/` are git-ignored.
