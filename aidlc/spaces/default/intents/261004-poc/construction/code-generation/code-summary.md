# Code Generation Summary

This stage implemented the asset-tracking web application end-to-end as a single vertical slice. Every functional and non-functional requirement from `requirements.md` is bound to a concrete file in `traceability.json`. The active scope is `poc` with the Minimal test strategy (test-after), so the suite covers one happy-path test per requirement plus a handful of error and edge cases.

This run was a **conformance pass** over an earlier implementation. Steps 1–14 of the plan were already satisfied by the files on disk; Steps 15–18 are the work described below. All existing files were modified in place — no `*_modified.js` duplicates were created.

This attempt was then **replayed** after Build and Test (3.6) found one applicable target — **T-FR3.3** — Not Met. The human authorized the loop-back ("Retry with fix"), re-approved the plan, and Steps 19–21 applied the repair. That repair is described under "Build-and-Test Repair Pass" below.

## Files Created

- `package.json` — npm manifest with `start`, `test`, and per-layer `test:*` scripts.
- `vitest.config.js` — Node-environment Vitest configuration.
- `.gitignore` — appended `node_modules/`, `data/`, `*.sqlite*`, and `coverage/`.
- `README.md` — Quick start, run commands, configuration env vars, lifecycle description.

### Application code (workspace root)

- `src/db/migrate.js` — migration runner.
- `src/db/index.js` — `openDatabase(filename)` factory with WAL + foreign keys.
- `src/repositories/assets-repo.js` — CRUD + audit + filtering for the `assets` table; validates inputs; detects duplicates.
- `src/services/asset-service.js` — state machine (`TRANSITIONS` map), lifecycle actions (`assignAsset`, `returnAsset`, `markLost`), audit emission, `registerAsset` happy path.
- `src/routes/assets.js` — Express router with `GET /`, `GET /new`, `POST /`, `GET /:id`, `POST /:id/assign`, `POST /:id/return`, `POST /:id/lost`. Renders EJS templates.
- `src/app.js` — Express app factory. Sets EJS view engine, mounts static, mounts the router, and handles known error codes with the `error` view.
- `src/server.js` — entry point. Reads `PORT` and `DB_PATH` from env, opens DB, starts server.

### Views

- `views/_header.ejs`, `views/_footer.ejs` — chrome and closing markup.
- `views/list.ejs` — list view with the FR2 columns, search, filters, sort.
- `views/new.ejs` — registration form with the FR1 fields.
- `views/detail.ejs` — full asset record with FR3 fields, FR3.2 audit entry, FR3.3 action buttons per state.
- `views/error.ejs` — shared error surface.

### Tests

- `tests/db.test.js` — schema + unique constraint + audit timestamps.
- `tests/assets-repo.test.js` — happy path, validation, duplicate detection, filtering, audit retrieval.
- `tests/asset-service.test.js` — every lifecycle transition + invalid transitions + edge cases (FR4).
- `tests/routes.test.js` — integration via supertest: list, create, redirect, assign, return, error page, data-testid presence.
- `tests/views.test.js` — view content for FR2 + FR3 (FR3.2 audit display).

## Conformance Pass — What Changed (Steps 15–18)

### Step 15 — Schema migration for the lifecycle timestamps (FR4.6, FR4.7)

The `assets` table had no assignment-timestamp or return-timestamp column. Because the table already existed in databases written by the earlier pass, this had to be a **migration over the existing table**, not a fresh table definition.

- **New file `src/db/migrations.sql`** holds the schema SQL, including the two new columns: `assigned_at TEXT` (FR4.6) and `returned_at TEXT` (FR4.7).
- **`src/db/migrate.js` rewritten** as a versioned migration runner. Migrations are applied in order, each exactly once, and recorded in a new `schema_migrations` table. The `lifecycle-timestamps` migration uses `PRAGMA table_info` to add the two columns only when missing — SQLite has no `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`, so the check is done in code.

### Step 16 — Registration conformance (FR1.5, FR1.4)

- **`src/repositories/assets-repo.js`**: `createAsset` previously derived the state from the presence of an assignee (`status = input.assignedTo ? 'assigned' : 'in-stock'`). It now always persists `status = 'in-stock'`; the optional `assigned-to` is stored as a plain field on the record and no longer moves the asset out of `in-stock`.
- **`src/routes/assets.js`**: a successful registration previously redirected to `/assets/:id` (the detail view). It now redirects to `/assets` — the asset LIST view, where the new asset is visible (FR1.4).
- **`src/services/asset-service.js`**: the registration audit entry no longer claims an assignment happened. A registration with an assignee records a `create` action noting the recorded assignee, because no state transition occurred.

### Step 17 — Lifecycle timestamps (FR4.6, FR4.7)

- **`src/services/asset-service.js`**: `assignAsset` now records `assigned_at` alongside the assignee name and clears the stale `returned_at`; `returnAsset` now records `returned_at` and clears the assignee. Both read the timestamp through the newly exported `repo.nowIso(db)`, so the value comes from the same database clock as the other timestamps.
- **`src/repositories/assets-repo.js`**: `updateAsset` now persists `assigned_at` and `returned_at` alongside the other fields, and always writes `updated_at` (FR4.8).
- **`views/detail.ejs`**: the details grid shows the `Assigned at` and `Returned at` fields (FR3.1 — all asset fields), with `data-testid="asset-assigned-at"` and `data-testid="asset-returned-at"`.

### Step 18 — Test suite correction and extension

- **The FR1.5-violating assertion was replaced.** `tests/asset-service.test.js` asserted that a registration with an assignee yields `status = 'assigned'`. It now asserts `status = 'in-stock'` with the assignee stored as a field, and the same property is asserted at the repository level.
- **New coverage added** for the assignment timestamp (FR4.6), the return timestamp (FR4.7), the clearing of a stale return timestamp on re-assignment, `updated-at` on both transitions (FR4.8), the FR1.4 list-view redirect, the FR1.5 list-view rendering, the schema columns, and the migration over a pre-existing `assets` table.

### Two corrections that were needed to make the suite runnable

These were not in the plan, but the suite could not be collected at all without them, so no test was running and the conformance work above would have been unverifiable.

1. **The test runner could not load the test files.** The test files used `require('vitest')`, which Vitest 2.x rejects under CommonJS: *"Vitest cannot be imported in a CommonJS module using `require()`"*. The application is CommonJS (`"type": "commonjs"`), so the fix was to enable `globals: true` in `vitest.config.js` and use the global test functions. The `include` pattern was also widened to `**/*.test.js` so the documented `npx vitest run --dir tests` command finds the same files as the bare run.
2. **Eight error assertions checked the wrong property.** They used `toThrow(/VALIDATION_ERROR/)`-style patterns against the error *message*, but the application's error contract is the `code` property on the error object — the messages are human-facing prose (`"name is required."`, `"Asset not found."`). These now assert on `err.code` via a small `catchError` helper. The assertions never ran before, because the suite could not be collected. The intent of each original assertion is preserved; no case was dropped, skipped, or weakened.

### New Files

- `src/db/migrations.sql` — the schema SQL (base schema + the two lifecycle timestamp columns).
- `tests/helpers/seed.js` — the seed helper the unit-test instructions describe. It inserts one hardware and one software asset through the service layer, provides `resetState(db)`, and provides `latestAssetId(db)` — needed because the registration redirect now targets the list view (FR1.4), so the new asset's id is not in the `Location` header.
- `package-lock.json` — generated by `npm install`.

### Resolved Inconsistency

`unit-test-instructions.md` referred to a seed helper at `tests/helpers/seed.js` and a `migrations.sql` file, neither of which existed. Rather than correcting the instructions to match the code, the files were created to match the instructions — `tests/helpers/seed.js` as the seed helper, and the schema SQL as `src/db/migrations.sql`. The instructions were then updated for the details that legitimately changed (Vitest 2.x, `globals: true`, the error-code assertion convention, the per-test database lifecycle, and the acceptance-mapping rows for FR1.5 / FR4.6–FR4.8 / NFR5).

## Build-and-Test Repair Pass (Steps 19–21)

Build and Test (3.6) verified the code against every FR and NFR and found one
applicable target — **T-FR3.3** — Not Met. The full diagnosis is in
`../build-and-test/test-results.md` (Loop-Back Log, entry 1) and
`../build-and-test/cross-unit-traceability.md` (Findings 1 and 2). The human
authorized a loop-back to Code Generation, re-approved the plan, and the
following repairs were applied.

### Step 19 — FR3.3 detail-view repair (view-only defect)

`views/detail.ejs` merged the `assigned` and `returned` states into one
template branch, so a `returned` asset rendered the "Mark returned" form. The
POST was then rejected with HTTP 400, because `returned → returned` is not in
the FR4.4 transition set. The state machine in `src/services/asset-service.js`
was **already correct** and was not touched.

The branch is now split by state:

| State | Forms offered |
|-------|---------------|
| `in-stock` | assign (`action-assign`) |
| `assigned` | mark returned (`action-return`), mark lost (`action-lost`) |
| `returned` | mark lost (`action-lost`), re-assign (`action-reassign`) — **no** `action-return` |
| `lost` | none (static message) |

Every offered action is now a valid transition from the asset's current state.
All existing `data-testid` attributes were preserved; an EJS comment records
why the "Mark returned" form is deliberately absent in the `returned` state.

### Step 20 — The missing `returned`-state view test

The suite stayed green through the defect because `tests/views.test.js`
covered the `in-stock`, `assigned`, and `lost` states but had **no
`returned`-state case**. The new test
(`detail view offers the lost and re-assign actions but not return for a
returned asset (FR3.3)`) registers an asset, assigns it, returns it, then
asserts that `data-testid="action-return"` is absent and that
`data-testid="action-lost"` and `data-testid="action-reassign"` are present.
It uses the file's existing `toContain` / `not.toContain` style.

### Step 21 — Traceability-note corrections

Two notes in `traceability.json` overstated the implementation. Only the note
text changed; every id, status, and target path is untouched.

- **FR3.3** now describes the per-state form set accurately, including why
  no "Mark returned" form is offered for a returned asset.
- **NFR2** dropped the unsupported "**Indexed** search" claim. The search is
  `LOWER(name) LIKE ? OR LOWER(serial_or_key) LIKE ?` — a leading-wildcard
  `LIKE`, which would not use a B-tree index even if one existed. The NFR2
  requirement itself is met: it is a user-perception bound ("locatable in 5
  seconds or fewer"), not an indexing requirement, and it holds for a
  `poc`-sized dataset. **No index and no schema migration was added** — a
  real fix would need SQLite FTS5 or a trigram table, which expands the `poc`
  scope and touches every developer's existing database.

### Result of the repair pass

`npx vitest run --dir tests` → **5 files passed, 66 tests passed** (65 before
the repair, +1 for the new `returned`-state case, zero regressions). The
informational coverage figures in the summary below were measured before this
repair and are superseded by the Build and Test re-run.

## Key Implementation Decisions

1. **SQLite via `better-sqlite3`** — synchronous, embedded, single-file. Matches the chosen C4/C8 constraints and the `poc` scope's "no external services" goal.
2. **State machine as a frozen table** — `TRANSITIONS` map in `asset-service.js` is the single source of truth for valid moves; any new transition requires editing the map.
3. **`data-testid` attributes on every interactive element** — required by the stage protocol for test automation.
4. **EJS partials (`_header`, `_footer`)** — kept server-rendered simple. No client-side JS, no SPA.
5. **Server-side error mapping** — known failure codes (`VALIDATION_ERROR`, `DUPLICATE_ASSET`, `INVALID_TRANSITION`, `NOT_FOUND`) map to HTTP 400/404 and surface a user-facing message; everything else is a 500.
6. **Audit trail as a single `audit_log` table** — every transition appends a row. Full UI exposure of the log is deferred (FR5.3 status: `Deferred`); the most recent entry is rendered on the detail view.
7. **One README, one entry point** — `npm install && npm start` runs the app; `npm test` runs the suite.
8. **Versioned, additive migrations** — a database written by the earlier release is migrated in place on the next start, with its rows preserved. Verified against a hand-built legacy database.

## Test Coverage Summary

The Minimal strategy requires one verifiable test per requirement and a happy-path unit test per component. The implemented suite provides:

- 7 schema tests (FR1.5 + FR4.6/FR4.7 columns + audit table existence + timestamp format + migration over a legacy table).
- 15 repository tests (FR1.1, FR1.2, FR1.3, FR2.2, FR2.3, FR2.4, FR5.1, FR5.2, NFR5).
- 18 service tests (FR4.1–FR4.8 lifecycle coverage + FR1.5 + FR2).
- 14 route tests (FR1.4, FR1.5, FR3.3, FR4.6, FR4.7, NFR1).
- 12 view tests (FR2.1–FR2.5, FR3.1–FR3.3, FR4.5, FR4.6, FR4.7, FR5.2).

Total: 66 tests across 5 files. The `poc` scope adds no coverage floor.

The informational coverage report (`npm run test:coverage`) reports 93.38% line coverage across `src/`, with the three FR/NFR target files all reached: `src/services/asset-service.js` 98.26%, `src/repositories/assets-repo.js` 98.62%, `src/routes/assets.js` 97.87%. `src/server.js` shows 0% because it is the process entry point and is covered by the live boot check below rather than by a unit test.

## Deviations From the Plan

- **Two unplanned corrections**, both documented above: the CommonJS/globals test-runner fix, and the eight error assertions that were checking the error message instead of the error code. Neither was in the plan, but the suite was uncollectable without them.
- The schema SQL moved from an inline string in `src/db/migrate.js` into `src/db/migrations.sql`, so the file the unit-test instructions named actually exists.

## Verification Commands

Run `npm install` once, then:

- `npm test` — full suite (66 tests).
- `npm start` — boot the app on port 3000.
- `npm run test:db` — schema + migrations.
- `npm run test:repo` — repository CRUD.
- `npm run test:service` — business logic.
- `npm run test:routes` — endpoint integration.
- `npm run test:views` — view rendering.
- `npm run test:coverage` — informational coverage report.

The unit-scoped commands in `unit-test-instructions.md` were all executed and all pass:

- `npx vitest run tests/db.test.js` — 7 passed
- `npx vitest run tests/assets-repo.test.js` — 15 passed
- `npx vitest run tests/asset-service.test.js` — 18 passed
- `npx vitest run tests/routes.test.js` — 14 passed
- `npx vitest run tests/views.test.js` — 12 passed
- `npx vitest run --dir tests` — 66 passed

### Live end-to-end check

The app was booted with `node src/server.js` against a fresh SQLite file and driven over HTTP with `curl`, confirming the conformance corrections in the running system rather than only in the test suite:

- `GET /` → `302` to `/assets`.
- `POST /assets` (with an assignee) → `302` to `/assets` — the LIST view (FR1.4). The list shows the asset with status `in-stock` and the assignee name (FR1.5).
- `POST /assets/:id/assign` → `302`; the detail view shows `Assigned at` populated (FR4.6).
- `POST /assets/:id/return` → `302`; the detail view shows `Assigned to` empty and `Returned at` populated (FR4.7).

The app was also booted against a hand-built legacy database (an `assets` table without the two timestamp columns). The migration added `assigned_at` and `returned_at` to the existing table, preserved the pre-existing row, and the assign action worked against it.

### Blocked Commands

None of the commands listed above were blocked. `npm install`, `npm test`, `npx vitest`, and `node --version` all ran successfully in this environment, and the results quoted above are from actual executions rather than from reading the code.

The Construction Verification Command, when set later by Build and Test, is expected to be `npm test && npm start` (the application must run end-to-end after tests pass).
