# Unit Test Instructions

## Scope

This unit-scoped test plan covers every layer of the asset-tracking web application. The unit is the entire `poc`; there is no Unit DAG, and the directive carries no `unit`. All commands below operate on the project root and are scoped to specific test files or directories so that Build and Test does not rerun the same tests once per `n`.

## Test Strategy

- **Strategy**: Minimal — one verifiable test per requirement at the narrowest effective level, plus a happy-path unit test per component.
- **Scope floor**: `poc` adds no extra new-test floor beyond the strategy; the existing test suite must remain green.
- **Methodology**: test-after — every layer is implemented first, then its tests are written and run.

## Test Framework

- **Runner**: Vitest 1.x with the Node environment enabled.
- **HTTP testing**: `supertest` for endpoint integration tests against the Express app in test mode.
- **Coverage**: `@vitest/coverage-v8` is configured but not enforced as a floor for `poc`; the runner remains runnable without `--coverage`.
- **Mocking/stubbing**: prefer real SQLite (in-memory `:memory:`) for repository and business-logic tests; supertest for endpoint tests. No mocking of internal modules is required for the `poc`.
- **Test data**: each test uses a fresh in-memory SQLite instance created via `better-sqlite3` `:memory:` and seeded with `migrations.sql`.

## Files To Be Created

- `tests/db.test.js` — schema + migration tests (FR1.5, FR4.8, FR5.1)
- `tests/assets-repo.test.js` — repository CRUD + lookup tests (FR1.1, FR1.3, FR2, FR5)
- `tests/asset-service.test.js` — business-logic / state machine tests (FR4.1–FR4.8)
- `tests/routes.test.js` — endpoint tests via supertest (FR1.4, FR3.3, FR4.6, FR4.7)
- `tests/views.test.js` — render/contains tests against the EJS templates (FR2, FR3.2)
- `vitest.config.js` — Vitest configuration with the Node environment enabled and the test directory restricted to `tests/`.

## Run Commands

Every command below is unit-scoped (no bare `npm test`). Build and Test will run them.

- Schema + migrations: `npx vitest run tests/db.test.js`
- Repository: `npx vitest run tests/assets-repo.test.js`
- Business logic: `npx vitest run tests/asset-service.test.js`
- Routes (supertest): `npx vitest run tests/routes.test.js`
- Views: `npx vitest run tests/views.test.js`
- Whole unit: `npx vitest run --dir tests`

The first executable test step (the schema test) cannot begin until Vitest is installed and `vitest.config.js` exists. The Step 2 runner bootstrap creates both.

## Expected Coverage Targets

The `poc` scope has no coverage floor; coverage is informational only. The default Vitest coverage report, when run with `--coverage`, should show every FR/NFR target file exercised. Specifically, the asset service (`src/services/asset-service.js`), the assets repository (`src/repositories/assets-repo.js`), and the route handlers (`src/routes/assets.js`) should all be reached.

## Mocking / Stubbing Guidance

- Use `better-sqlite3(':memory:')` directly inside repository and service tests.
- Do not mock the database layer; do not mock Express.
- For route tests, instantiate the Express app via the exported factory from `src/app.js`, passing the in-memory database handle.
- For view tests, render EJS templates through the `views/` directory and assert on the returned HTML string for required headings, columns, and `data-testid` attributes.

## Test Data Management

- Each test file opens its own `:memory:` SQLite database at `beforeAll` and closes it at `afterAll`.
- Each individual test resets state via `db.exec('DELETE FROM ...')` inside `beforeEach`.
- No fixtures on disk; everything is in-memory for speed and isolation.
- A small seed helper (`tests/helpers/seed.js`) inserts one hardware and one software asset for tests that need an existing row.

## Acceptance Mapping

| Requirement | Test file |
|-------------|-----------|
| FR1.1, FR1.2 | `tests/routes.test.js` |
| FR1.3 | `tests/assets-repo.test.js` |
| FR1.4, FR1.5 | `tests/routes.test.js`, `tests/db.test.js` |
| FR2.1–FR2.5 | `tests/routes.test.js`, `tests/views.test.js` |
| FR3.1–FR3.3 | `tests/views.test.js`, `tests/routes.test.js` |
| FR4.1–FR4.5 | `tests/asset-service.test.js` |
| FR4.6–FR4.8 | `tests/asset-service.test.js`, `tests/routes.test.js` |
| FR5.1–FR5.3 | `tests/asset-service.test.js`, `tests/views.test.js` |
| NFR1, NFR2 | `tests/routes.test.js` (timing assertions) |
| NFR3, NFR4 | covered by `package.json` scripts and `README.md` |
| NFR5 | `tests/assets-repo.test.js` (concurrency notes) |
| NFR6 | code review, no test required |
| NFR7 | `README.md` and `package.json` |