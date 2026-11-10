# Code Quality Assessment

## Verdict

The Asset Tracker POC is a **clean, small, well-tested proof of concept with
structural debt that only shows up under the MVP's requirements**. Its own
scope is well served: the test suite is comprehensive for what the code does,
the error contract is coherent and documented, the comments explain *why*, and
the code has no lint suppressions, no TODO markers, and no dead branches.

The debt is **structural, not annotated** — and it concentrates in exactly the
places the MVP must change. The audit log is destroyed by a schema-level
cascade; the uniqueness constraint is case-sensitive with no application-level
guard; the status vocabulary is duplicated six times; audit writes are not
transactional; only the latest audit row is ever readable; and `updateAsset`
bypasses the state machine. Five of the MVP's surfaces do not exist at all.

**No linter and no CI exist.** Both are new capability work, not the
enforcement of an existing standard.

---

## Test Coverage

### Configuration

`vitest.config.js` is present and configured:

| Setting | Value | Line |
|---|---|---|
| `environment` | `'node'` | `:7` |
| `globals` | `true` | `:10` — required because Vitest 2.x rejects `describe`/`it`/`expect` globals under CommonJS |
| `include` | `['**/*.test.js']` | `:13` |
| `exclude` | `node_modules`, `dist`, `data`, `coverage` | `:14` |
| `pool` | `'forks'` | `:15` |
| `coverage.provider` | `'v8'` | `:18` |
| `coverage.reporter` | `['text', 'html']` | `:19` |
| `coverage.include` | `['src/**/*.js']` | `:21` |
| `coverage.thresholds` | **absent** | — |

**The coverage configuration has no floor.** There is no `thresholds` key, so
`npm run test:coverage` **cannot fail the build**. The inline comment at
`vitest.config.js:17-18` states the intent: "The `poc` scope has no coverage
floor — this is informational only". The generated report is written to
`coverage/` (gitignored).

### Verified baseline

`npx vitest run` was executed read-only at scan time and reproduced
independently of the developer's scan:

```
 ✓ tests/db.test.js          ( 7 tests)
 ✓ tests/assets-repo.test.js (15 tests)
 ✓ tests/asset-service.test.js (18 tests)
 ✓ tests/views.test.js       (12 tests)
 ✓ tests/routes.test.js      (14 tests)

 Test Files  5 passed (5)
      Tests  66 passed (66)
   Duration  ~711-751 ms
```

**66 passed / 66, 5 files.** This confirms the 66/66 merge gate the MVP release
must preserve.

### Test layout by layer

| Layer | File | Tests | Focus |
|---|---|---|---|
| Infrastructure | `tests/db.test.js` | 7 | Schema creation, the unique constraint, audit timestamps, the `assigned_at`/`returned_at` columns, the default `in-stock` state, a hand-built legacy-schema migration, the migration ledger |
| Data access | `tests/assets-repo.test.js` | 15 | CRUD, validation, filtering, sorting, audit insert, `latestAuditFor`, `updateAsset` timestamp persistence, `NOT_FOUND`, a 25-write burst consistency check |
| Domain | `tests/asset-service.test.js` | 18 | Every legal and illegal state-machine edge, the lifecycle timestamps, `updated_at` refresh, the list passthrough |
| HTTP | `tests/routes.test.js` | 14 | Status codes, redirects, form re-render on error, `data-testid` attributes |
| Presentation | `tests/views.test.js` | 12 | Rendered-HTML assertions — list columns, row links, per-status action forms, displayed timestamps |

`tests/helpers/seed.js` provides `seedTwoAssets`, `seedAsset`, `resetState`,
`latestAssetId`, all with JSDoc. Seeds go through the **service** path rather
than hand-written SQL, so a seeded row is a fully-formed record.

### Testing idiom

- Every spec opens a **fresh `:memory:` database** in `beforeEach` and closes
  it in `afterEach`. **No test touches the `data/` directory** — the live
  database is never a test target.
- HTTP tests use `supertest` against the app built by `createApp(db)` with an
  in-memory handle — the real Express stack, no network listener.
- Assertions use the error `code`, never the message.
  `tests/assets-repo.test.js:7-12` documents this as a contract:
  "the message is human-facing prose and is not part of the contract".
- Requirement traceability is carried inline in the test code — `FR`/`NFR`
  markers in `it(...)` titles and comments, e.g.
  `tests/asset-service.test.js:115` (FR4.6), `tests/routes.test.js:36` (FR1.4),
  `tests/views.test.js:111` (FR3.3), `tests/assets-repo.test.js` (FR1.5,
  FR4.6, FR4.7, NFR5). This is a genuine traceability asset that the MVP's
  requirement mapping can build on.

### Coverage gaps that matter for the MVP

| Gap | Evidence |
|---|---|
| **No test asserts an audit row count.** | `tests/assets-repo.test.js:112-118` asserts only that `latestAuditFor` returns the most recent; `tests/asset-service.test.js:107-112` asserts one entry per transition. Nothing counts rows. |
| **No test asserts audit ordering across many transitions.** | There is no test that performs a sequence of transitions and checks the resulting order. |
| **No test asserts the cascade behaviour either way.** | Nothing asserts that deleting an asset does — or does not — remove its audit rows. |
| **The legacy-migration test carries no audit rows.** | `tests/db.test.js:59-93` builds only a legacy `assets` table with no `audit_log` rows. **It would not have caught the cascade data loss** — this is the single most important test gap for the migration work. |
| **No test asserts a case-insensitive duplicate is rejected.** | The unique-constraint test at `tests/db.test.js:27-33` inserts the same exact string twice, not a case-variant. |
| **No test exercises concurrent writers.** | The "burst" test at `tests/assets-repo.test.js` is a sequential loop of 25 writes, explicitly acknowledged as an `NFR5` acknowledgement of SQLite's single-writer model — not a concurrency test. |
| **No test asserts the index list after a migration.** | Nothing verifies that `idx_assets_status` / `idx_assets_category` survive a rebuild. |

---

## Linting

**Absent.** Verified: no ESLint, Prettier, StandardJS, or Biome configuration
anywhere in the repository — no `.eslintrc*`, no `eslint.config.*`, no
`.prettierrc*`, no `.prettierignore` — and no lint dependency in
`package.json`. `package.json:8-18` defines seven test scripts and two run
scripts; **there is no `lint` script**.

**This matters for planning.** The organisation rule "we defer to
project-level configurations" (formatter, linter) has **nothing to defer to
here**. Adding a linter or a formatter configuration is *new capability work*,
not the enforcement of an existing standard. It must be estimated as such.

What exists instead is a **self-consistent convention**: 2-space indent, single
quotes, semicolons, trailing commas, uniform across all twelve source files.
The convention is real but unenforced — nothing would catch a regression.

---

## CI/CD

**Absent.** Verified: no `.github/` directory, no `.gitlab-ci.yml`, no
`Jenkinsfile`, no `azure-pipelines.yml`, no `Dockerfile`, no
`docker-compose.yml`, no `Makefile`, no `Procfile`. There is **no deployment
configuration of any kind**.

`README.md` documents only local operation: `npm install` / `npm start` /
`npm test` (`README.md:5-24`). There is no staging environment, no production
environment, no release process, and no rollback procedure.

**Consequence**: the `feature`-scope expectation of "CI execution before merge"
requires building a pipeline from scratch. The 66/66 baseline is currently
enforced by nothing but a developer's local `npm test` run — it is a
**convention**, not a gate. This is a delivery-estimation input, not a
free assumption.

---

## Documentation Quality

### README.md — good

93 lines, and accurate throughout:

| Section | Lines | Assessment |
|---|---|---|
| Quick start | `:5-12` | Correct — `npm install`, `npm start`, port 3000, `data/assets.sqlite` created on first run |
| Tests | `:14-24` | All six test scripts listed with accurate descriptions, including the honest note that coverage is "informational coverage report (no floor for the poc)" |
| What it does | `:26-31` | Accurate feature list |
| Lifecycle | `:38-44` | The four transition rules spelled out — matches `TRANSITIONS` exactly |
| Migrations | `:50-56` | Accurate — describes the ledger and the additive model. **Note**: this section's "Migrations are additive" claim is true of the two current migrations but will need revision when a rebuild migration is added, since a rebuild is not additive. |
| Configuration | `:58-63` | Accurate env-var table (`PORT`, `DB_PATH`) |
| Why this exists | `:65-67` | Accurate — names the POC's deliberate omissions |
| Code layout | `:69-93` | Matches the directory structure exactly |

### README.MD — an artefact

17 bytes, containing only the text "Excercise project". It duplicates
`README.md` under a case-differing extension — a hazard on a case-insensitive
filesystem, harmless on Linux. Trivially deletable; recorded rather than
silently removed, because the release's diff will be reviewed.

### Doc comments — purposeful

Comments explain *why*, not *what*. The strongest examples:

| Location | What it explains |
|---|---|
| `src/db/migrate.js:8-12` | Why the base schema uses `IF NOT EXISTS` |
| `src/db/migrate.js:25-30` | Why the column-add is JavaScript, not SQL |
| `src/repositories/assets-repo.js:48-52` | Why a registration with an assignee is still `in-stock` |
| `src/services/asset-service.js:35-37` | The same rule at the service layer |
| `src/services/asset-service.js:59-60` | Why `returned_at` is cleared on assignment |
| `tests/helpers/seed.js` | JSDoc on all four exports; why the seed uses the service path |
| `tests/assets-repo.test.js:7-12` | The `err.code` error contract |
| `tests/asset-service.test.js:7-12` | The same contract at the service layer |
| `views/detail.ejs:39` | Why a returned asset must not offer the return form |

**Zero** `TODO`, `FIXME`, or `HACK` markers and **zero** `eslint-disable` /
`noqa` suppressions across `src/`, `tests/`, `views/`, and `public/`. The
codebase's debt is structural, not annotated.

### Gap: no API documentation

The API surface is documented only implicitly — by the README's prose and by
the code. There is no OpenAPI spec, no endpoint reference, no data-dictionary
document. The `audit_log` action vocabulary, the error `code` list, and the
filter parameter semantics are documented nowhere outside the source.

---

## Technical Debt

Fourteen items. The first is the highest-risk item in the release.

### 1. Audit history is destroyed by any asset-row deletion, by schema design — HIGH

`src/db/migrations.sql:35` — `FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE`.

**Verified by execution** in a throwaway database: inserting one asset plus one
audit row and then deleting the asset leaves **0** audit rows — the transaction
commits and no error is raised. The loss is silent.

This directly contradicts the MVP's append-only, actor-attributed history
requirement, and it is the reason the `audit_log` rebuild is needed at all.

**Design constraint on the migration mechanism** — this is not a passing note.
SQLite cannot drop or amend a CHECK constraint (`ALTER TABLE … DROP CONSTRAINT`
→ `near "CONSTRAINT": syntax error`, verified) or a foreign-key action, so both
tables must be rebuilt. The two rebuilds interfere, and the interference was
probed live:

| Ordering | Verified result |
|---|---|
| Rebuild `assets` first | `DROP TABLE assets` **succeeds** and fires the cascade — audit rows go **1 → 0**, silently |
| Rebuild `audit_log` first, then rebuild `assets` | `DROP TABLE assets` **fails**: `FOREIGN KEY constraint failed` |
| Rename the old table aside (`ALTER TABLE assets RENAME TO assets_old`) | **Unsafe.** SQLite rewrites the *referencing* FK, so `audit_log` ends up pointing at `REFERENCES "assets_old"(id) ON DELETE CASCADE`. Dropping `assets_old` cascades the audit rows away anyway. `PRAGMA legacy_alter_table = 1` does **not** suppress the rewrite (verified) |
| **Rebuild `audit_log` with no FK clause → rebuild `assets` → re-add the FK afterwards** | **The one ordering that works.** Verified end to end: history preserved, `PRAGMA foreign_key_check` → `[]`, widened CHECK constraint applied, `last_assigned_to` added |

Two planning consequences:

1. **The migration must control the `foreign_keys` pragma explicitly.**
   `src/db/index.js:16` sets `foreign_keys = ON` at open time, but
   `applyMigrations` can be called on a raw handle where it is off
   (`tests/db.test.js:82` does exactly that). The rebuild needs foreign keys
   **off** during the drop window and **on** afterwards. The current runner has
   no per-migration pragma window (`src/db/migrate.js:53-70`).
2. **The rebuild destroys the rebuilt table's indexes.**
   `idx_assets_status` and `idx_assets_category` (`src/db/migrations.sql:39-40`)
   are dropped with `assets`; `idx_audit_asset_recent` (`:38`) survives on
   `audit_log`. Verified: after a full rebuild the index list is empty. The
   `CREATE INDEX IF NOT EXISTS` idiom in `migrations.sql` does **not** help,
   because that file is applied as **migration v1 only**
   (`src/db/migrate.js:13-20`) — a new migration must re-issue the index DDL
   itself.

**Open questions — recorded, not answered:**

- **Does removing the cascade leave `DELETE FROM assets` blocked?** **Yes.**
  Verified: with `audit_log.asset_id` referencing `assets(id)` and no cascade,
  `DELETE FROM assets` fails with `SQLITE_CONSTRAINT_FOREIGNKEY` whenever audit
  rows exist. This is a behaviour change from today, where the delete succeeds
  and silently takes the audit rows with it.
- **Is `ON DELETE SET NULL` on `audit_log.asset_id` acceptable?** It is the one
  alternative that permits deletion while preserving the audit row — verified
  working, the audit row survives with `asset_id` set to `NULL`. But it changes
  `asset_id` from `NOT NULL` to **nullable**, which is a schema decision with
  downstream consequences for any query assuming every audit row points at a
  live asset. This is a decision for the architect; it must not be assumed.
  Relevant mitigating fact: the MVP requires that the asset row and its full
  history are never deleted, and **no code path deletes assets today** — no
  delete endpoint, no delete repository function, no delete test — so the
  `SET NULL` path may not be needed at all. It must be **confirmed**, not
  assumed away.

### 2. The uniqueness constraint is case-sensitive in practice — HIGH

`src/db/migrations.sql:26` — `UNIQUE (category, serial_or_key)` is a plain
column-pair unique index using SQLite's default `BINARY` collation.

**Verified by execution**: inserting `hardware`/`'AbC'` and then
`hardware`/`'abc'` **both succeed**. The MVP requires case-insensitive,
category-scoped uniqueness.

There is **no** functional index (`lower(serial_or_key)`) anywhere in the
schema — but SQLite **does** support it (verified: the functional index
rejects the conflicting insert with
`UNIQUE constraint failed: index 'idx_assets_serial_ci'`).

### 3. Duplicate detection is a brittle message string match — HIGH

`src/repositories/assets-repo.js:70` — the repository catches the unique
violation by testing `String(e.message).includes('UNIQUE constraint failed')`.

This is a **message-dependent** detection that **cannot distinguish a
functional-index violation from a plain one** — both surface only as that
generic string, and the error text is not part of SQLite's stable contract.
The MVP's requirement that one *shared* definition govern both the index
expression and the application-level comparison predicate cannot be satisfied
by the current code, because **the current code has no application-level
predicate at all**.

### 4. There is no application-level duplicate check — HIGH

`createAsset` (`src/repositories/assets-repo.js:38-78`) inserts and relies on
the database to reject. There is **no pre-check query**, **no `IMMEDIATE`
transaction**, and **no `busy_timeout` configured**.

`src/db/index.js:15-16` sets only `journal_mode = WAL` and
`foreign_keys = ON`. `busy_timeout` is never set anywhere in `src/` — the
effective 5000 ms value comes from the `better-sqlite3` default, i.e. from the
driver, not from an application decision. The MVP's concurrency-safe uniqueness
policy must therefore be built from nothing.

### 5. The status vocabulary is duplicated across six locations — HIGH

The set `('in-stock', 'assigned', 'returned', 'lost')` appears independently at:

| # | Location | Form |
|---|---|---|
| 1 | `src/db/migrations.sql:17` | `CHECK (status IN (...))` |
| 2 | `src/repositories/assets-repo.js:6` | `ALLOWED_STATUSES` `Set` |
| 3 | `src/services/asset-service.js:5-10` | `TRANSITIONS` object of `Set`s |
| 4 | `views/list.ejs:10-16` | status filter `<select>` |
| 5 | `views/detail.ejs:26-49` | per-status action forms |
| 6 | `public/styles.css:27-30` | `.status-*` colour tokens |

**There is no single shared vocabulary constant.** Extending the vocabulary
requires changing all six in lockstep, and a partial change is silent — a
status present in `TRANSITIONS` but missing from the filter `<select>` simply
cannot be filtered on, and one present in the CHECK constraint but missing
from the stylesheet renders with the default `.status` colour.

Note that the MVP's five exclusive buckets plus `discarded` are a *superset*
change, not a replacement: the existing four remain. A single shared
definition is also the natural home for the counting invariant's shared
filter definition.

### 6. Audit writes are not transactional with the asset write — HIGH

`assignAsset`, `returnAsset`, and `markLost` (`src/services/asset-service.js:52-94`)
each perform two separate statements — an `UPDATE` then an
`INSERT INTO audit_log` — with **no enclosing `db.transaction()`**.

`better-sqlite3` is synchronous, so a thrown error between the two statements
leaves the asset updated and the audit entry missing. The audit log is
therefore not reliably append-only *per operation* today, even though
`recordAudit` only ever inserts.

The MVP's "every lifecycle transition has explicit … audit behaviour" requires
transactional wrapping.

### 7. Only the most recent audit entry is ever retrievable — MEDIUM

`latestAuditFor` (`src/repositories/assets-repo.js:116-124`) does
`ORDER BY id DESC LIMIT 1`. `getAssetWithAudit`
(`src/services/asset-service.js:96-101`) returns that single row, and
`views/detail.ejs:16-23` renders it as "Recent activity". `README.md:48`
states the limitation plainly: "the full audit log is not exposed in the UI".

The MVP's history surface — previous holder, full history at the detail URL —
has **no retrieval path**. A full-history query does not exist.

### 8. Audit rows carry no actor, and the action vocabulary is stringly-typed — MEDIUM

`src/db/migrations.sql:29-36` — `audit_log` has
`(id, asset_id, action, description, created_at)` and nothing else. There is no
actor column and no actor concept anywhere in the codebase.

The action vocabulary in use is `create`, `assign`, `return`, `mark-lost`
(`src/services/asset-service.js:40,47,68,83,92`). It is stringly-typed with no
constant. Note the naming inconsistency: the action string is hyphenated
(`mark-lost`) while the service function is camelCase (`markLost`) and the
description-builder key is `markLost` (`src/services/asset-service.js:15`). The
MVP requires a distinct `recovered` action and a distinct `discarded` action,
so a convention must be chosen rather than inferred.

### 9. `updateAsset` bypasses the state machine — MEDIUM

`src/repositories/assets-repo.js:80-107` writes `status` from an arbitrary patch
with **no transition validation and no audit write**. It merges the patch over
the current row and writes every column.

It is safe today only because the DB `CHECK` constraint rejects unknown status
values — verified live: `updateAsset(db, id, {status:'bogus-status'})` throws
`CHECK constraint failed`. But that constrains the *value*, not the
*transition*: `updateAsset` will happily move an asset from `lost` (terminal)
to `in-stock` with no error and no audit row.

The consequence is that the state machine in `asset-service.js` is enforced by
**call discipline**, not by the layer boundary — and any new caller (the MVP's
asset-editing feature is exactly that) can write `status` directly.

### 10. `assigned_to` is a bare free-text string with no referential integrity — MEDIUM

`src/db/migrations.sql:18` — `assigned_to TEXT`, with no foreign key and no
directory table. It is a name typed into a form field
(`views/new.ejs:31`, `views/detail.ejs:28`).

The MVP's `last_assigned_to` and the assignee directory are therefore both
greenfield, and the current holder value has no authoritative source other
than the raw string.

### 11. Five MVP surfaces do not exist at all — MEDIUM

Verified by exhaustive grep across `src/`, `tests/`, and `views/` for `csv`,
`export`, `count`, `dashboard`, `actor`, `operator`, and `acting` — the only
hits are `module.exports` lines.

| MVP surface | Status |
|---|---|
| Shared counting function + reusable filter builder | **Absent.** No `COUNT` query, no aggregation, no reusable filter construction — each query builds its own `WHERE` inline |
| Reconciliation dashboard | **Absent** |
| Assignee directory | **Absent** |
| CSV export | **Absent** |
| Actor concept | **Absent** |

**All five are greenfield.** There is no partial implementation to extend, no
existing counting definition to unify, and no existing code to refactor. The
"one shared counting function" must be authored from scratch.

### 12. `INVALID_STATE` is unhandled at the HTTP boundary — LOW

`src/services/asset-service.js:21` throws `INVALID_STATE` for an unknown
current state, but `src/app.js:20` does not list it in the handled-code set. An
unknown-state asset therefore surfaces as a **500** rather than a 400 — a
server fault reported for what is a client-visible data condition.

### 13. `views/_layout.ejs` is dead code — LOW

Nothing includes it. Every template includes `_header`/`_footer` instead
(`views/list.ejs:1,54`, `views/new.ejs:1,40`, `views/detail.ejs:1,53`,
`views/error.ejs:1,5`). It duplicates the header markup.

### 14. Single empty state, and a near-duplicate README — LOW

- `views/list.ejs:40` — "No assets yet." is the **only** empty state in the
  application. The MVP requires empty states on several new surfaces.
- `README.MD` duplicates `README.md` with a one-line placeholder under a
  case-differing extension — a hazard on a case-insensitive filesystem.

---

## Debt Summary

| Severity | Items |
|---|---|
| **High** | 1 (cascade destroys audit history — the migration-ordering constraint), 2 (case-sensitive uniqueness), 3 (message-matched duplicate detection), 4 (no application-level check, no IMMEDIATE transaction, no explicit `busy_timeout`), 5 (six-copy status vocabulary), 6 (non-transactional audit writes) |
| **Medium** | 7 (latest-entry-only retrieval), 8 (no actor, stringly-typed actions), 9 (`updateAsset` bypasses the state machine), 10 (free-text `assigned_to`), 11 (five absent MVP surfaces) |
| **Low** | 12 (unhandled `INVALID_STATE`), 13 (dead `_layout.ejs`), 14 (single empty state, duplicate README) |

Plus two **absent capabilities** that are new build work rather than debt:
**no linter** and **no CI pipeline**.

---

## What the POC does well

Recording this matters, because the MVP extends this code and the strengths are
worth preserving:

1. **A coherent, documented error contract** — `Error` + `code`, with a
   single translation point at the HTTP boundary and tests that assert on
   `code` rather than on prose.
2. **Real layering** — no cycles, no upward imports, SQL confined to one
   module, business rules confined to another.
3. **Requirement traceability in the test code** — inline `FR`/`NFR` markers
   that the MVP's requirement mapping can build directly on.
4. **A usable legacy-migration test pattern** at `tests/db.test.js:59-93` —
   building an old schema on a raw handle to simulate a pre-migration
   database. It needs extending with audit rows, not replacing.
5. **Comments that explain *why***, and zero TODO/FIXME/HACK markers.
6. **A fast, deterministic suite** — 66 tests in ~711 ms, entirely in-memory,
   with no network listener and no filesystem writes.
7. **Uniform formatting and a real Post/Redirect/Get flow.**

## Cross-References

- Component responsibilities: [component-inventory.md](component-inventory.md)
- The migration-ordering constraint in full, with the verified ordering table
  and interaction diagrams: [architecture.md](architecture.md)
- API surfaces and error contracts: [api-documentation.md](api-documentation.md)
- Versions, tooling, and platform constraints:
  [technology-stack.md](technology-stack.md)
