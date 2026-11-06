# Unit Test Instructions

## Scope

This unit-scoped test plan covers every layer of the asset-tracking web application. The unit is the entire `poc`; there is no Unit DAG, and the directive carries no `unit`. All commands below operate on the project root and are scoped to specific test files or directories so that Build and Test does not rerun the same tests once per `n`.

An earlier pass already wrote the workspace test files. This plan therefore
extends and corrects that suite rather than creating it from scratch: the
conformance corrections in `code-generation-plan.md` (FR1.4, FR1.5, FR4.6,
FR4.7) each need a test, and one existing assertion that encodes the FR1.5
violation has to be replaced.

## Test Strategy

- **Strategy**: Minimal — one verifiable test per requirement at the narrowest effective level, plus a happy-path unit test per component.
- **Scope floor**: `poc` adds no extra new-test floor beyond the strategy; the existing test suite must remain green.
- **Methodology**: test-after — every layer is implemented first, then its tests are written and run.

## Test Framework

- **Runner**: Vitest 2.x with the Node environment enabled.
- **Module system**: the application is CommonJS (`"type": "commonjs"` in `package.json`), and so are the test files. Vitest 2.x refuses `require('vitest')` under CommonJS, so `vitest.config.js` sets `globals: true` and the test files use the global `describe`/`it`/`expect`/`beforeEach`/`afterEach` directly.
- **HTTP testing**: `supertest` for endpoint integration tests against the Express app in test mode.
- **Coverage**: `@vitest/coverage-v8` is configured but not enforced as a floor for `poc`; the runner remains runnable without `--coverage`.
- **Mocking/stubbing**: prefer real SQLite (in-memory `:memory:`) for repository and business-logic tests; supertest for endpoint tests. No mocking of internal modules is required for the `poc`.
- **Test data**: each test uses a fresh in-memory SQLite instance created via `better-sqlite3` `:memory:`, with the schema applied by `src/db/migrate.js` from `src/db/migrations.sql`.

## Files

- `tests/db.test.js` — schema + migration tests (FR1.5, FR4.6, FR4.7, FR5.1)
- `tests/assets-repo.test.js` — repository CRUD + lookup tests (FR1.1, FR1.3, FR2, FR5)
- `tests/asset-service.test.js` — business-logic / state machine tests (FR4.1–FR4.8)
- `tests/routes.test.js` — endpoint tests via supertest (FR1.4, FR3.3, FR4.6, FR4.7)
- `tests/views.test.js` — render/contains tests against the EJS templates (FR2, FR3.2)
- `tests/helpers/seed.js` — seed helper inserting one hardware and one software asset, plus `latestAssetId(db)` for tests that need the id of a freshly registered asset (the registration redirect target is the list view, so the id is not in the `Location` header).
- `vitest.config.js` — Vitest configuration with the Node environment enabled, `globals: true`, and the test directory restricted to `tests/`.
- `src/db/migrations.sql` — the schema SQL applied by `src/db/migrate.js`.

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

- Each test file opens its own `:memory:` SQLite database in `beforeEach` and closes it in `afterEach`. A fresh database per test gives isolation without any reset step.
- No fixtures on disk; everything is in-memory for speed and isolation.
- A small seed helper (`tests/helpers/seed.js`) inserts one hardware and one software asset for tests that need an existing row.
- Error assertions check the `code` property of the thrown error (`VALIDATION_ERROR`, `DUPLICATE_ASSET`, `NOT_FOUND`, `INVALID_TRANSITION`), which is the application's error contract. The message is human-facing prose and is not asserted on.

## Acceptance Mapping

| Requirement | Test file |
|-------------|-----------|
| FR1.1, FR1.2 | `tests/routes.test.js` |
| FR1.3 | `tests/assets-repo.test.js` |
| FR1.4, FR1.5 | `tests/routes.test.js`, `tests/db.test.js`, `tests/asset-service.test.js` |
| FR2.1–FR2.5 | `tests/routes.test.js`, `tests/views.test.js` |
| FR3.1–FR3.3 | `tests/views.test.js`, `tests/routes.test.js` |
| FR4.1–FR4.5 | `tests/asset-service.test.js` |
| FR4.6–FR4.8 | `tests/asset-service.test.js`, `tests/routes.test.js`, `tests/assets-repo.test.js` |
| FR5.1–FR5.3 | `tests/asset-service.test.js`, `tests/views.test.js` |
| NFR1, NFR2 | `tests/routes.test.js` |
| NFR3, NFR4 | covered by `package.json` scripts and `README.md` |
| NFR5 | `tests/assets-repo.test.js` (write-burst consistency) |
| NFR6 | code review, no test required |
| NFR7 | `README.md` and `package.json` |

## Conformance Test Additions

These cover the requirement gaps the existing suite does not catch. Each is a
requirement-driven test at the narrowest effective level.

| Requirement | Test | Level |
|-------------|------|-------|
| FR1.5 | A registration that supplies an assignee is persisted with `status = 'in-stock'` and the assignee stored as a field | `tests/asset-service.test.js` (replaces the assertion that expected `assigned`); also asserted at the repository level in `tests/assets-repo.test.js` |
| FR1.4 | A successful registration redirects to the asset LIST view, and the new asset is present in that view | `tests/routes.test.js` |
| FR4.6 | Assigning records the assignee name and a non-null assignment timestamp | `tests/asset-service.test.js` |
| FR4.7 | Returning clears the assignee and records a non-null return timestamp | `tests/asset-service.test.js` |

The `poc` scope floor adds no further new-test requirement; the existing suite
must remain green once these four are in place.

## Build-and-Test Repair Test Addition (loop-back 1)

Build and Test (3.6) found that T-FR3.3 is **Not Met** and that the suite
missed it because there is no `returned`-state view test. The diagnosis is in
`../build-and-test/test-results.md` (Loop-Back Log, entry 1).

| Requirement | Test | Level |
|-------------|------|-------|
| FR3.3 | A `returned` asset's detail view renders **no** `data-testid="action-return"` form, and renders both `data-testid="action-lost"` and `data-testid="action-reassign"` — every offered action is a valid transition from `returned` | `tests/views.test.js` |

This is a requirement-driven test at the narrowest effective level (template
render, asserting on the returned HTML string for `data-testid` attributes),
which is the level the strategy's "narrowest effective level" obligation
requires. It closes the specific gap that let the defect through: the
existing view tests cover the `in-stock`, `assigned`, and `lost` states but
not `returned`.

The state machine in `src/services/asset-service.js` is already correct and
needs no change; only `views/detail.ejs` does. The existing suite must remain
green after this addition.

## Result

All four conformance tests are in place, along with the surrounding coverage
they need. The whole suite is green:

```
 Test Files  5 passed (5)
      Tests  65 passed (65)
```

Two further corrections were needed to make the suite runnable at all, and are
recorded here because they changed assertions the earlier pass had written:

1. **The runner could not load the test files.** The test files used
   `require('vitest')`, which Vitest 2.x rejects under CommonJS ("Vitest cannot
   be imported in a CommonJS module using `require()`"). `vitest.config.js` now
   sets `globals: true` and the test files use the global test functions.
2. **Eight error assertions checked the wrong property.** They asserted a
   `toThrow(/VALIDATION_ERROR/)`-style pattern against the error *message*,
   but the application's contract is the `code` property on the error object —
   the messages are human-facing prose (`"name is required."`). These now
   assert on `err.code`. The assertions never ran before, because the suite
   could not be collected.

Both corrections keep the intent of the original assertions; neither weakens a
threshold or skips a case. The `poc` scope adds no coverage floor, and none
was introduced.