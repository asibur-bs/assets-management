## Developer Code Scan Results

**Intent**: `261106-asset-tracker-mvp` — Asset Tracker MVP
**Repo root / workspace root**: `.` (the whole repository)
**Project type**: brownfield (existing proof-of-concept application)
**Breadth**: full rescan
**Depth**: Standard
**Scan date**: 2026-11-09
**HEAD at scan time**: `de8c18d` ("Create the asset-tracker-mvp intent")
**Language / runtime**: JavaScript (CommonJS), Node.js >= 20.0.0

### Scan Coverage

- **Analyzed deeply**:
  - `src/app.js`
  - `src/server.js`
  - `src/db/index.js`
  - `src/db/migrate.js`
  - `src/db/migrations.sql`
  - `src/repositories/assets-repo.js`
  - `src/services/asset-service.js`
  - `src/routes/assets.js`
  - `views/_header.ejs`
  - `views/_footer.ejs`
  - `views/_layout.ejs`
  - `views/list.ejs`
  - `views/new.ejs`
  - `views/detail.ejs`
  - `views/error.ejs`
  - `public/styles.css`
  - `tests/db.test.js`
  - `tests/assets-repo.test.js`
  - `tests/asset-service.test.js`
  - `tests/routes.test.js`
  - `tests/views.test.js`
  - `tests/helpers/seed.js`
  - `package.json`
  - `vitest.config.js`
  - `README.md`
  - `README.MD`
  - `.gitignore`
- **Skimmed only**:
  - `data/` — gitignored live SQLite database (`assets.sqlite`, `-wal`, `-shm`). Read-only; never a test target.
  - `coverage/` — generated V8 HTML coverage report (gitignored).
  - `node_modules/` — installed dependencies (204 top-level entries).
  - `package-lock.json` — npm lockfile, 134 KB.
  - `f1-diagram.txt`, `f5a-diagram.txt` — untracked mermaid diagram scratch files at repo root.
  - `help` — zero-byte file at repo root.
  - `.mcp.json` — MCP server registrations (context7, aws-mcp, aws-pricing, aws-iac, aws-serverless).
  - `.claude/`, `.puku-cli/` — AIDLC workflow tooling and knowledge base, not application source.
  - `aidlc/spaces/default/intents/261004-poc/inception/requirements-analysis/requirements.md` — read for FR/NFR identifier cross-reference only.

### Packages Found

Single-package repository. There is no monorepo, no workspaces declaration in `package.json`, and no `packages/` directory.

- `assets-management` — application — JavaScript (CommonJS) — internal asset-tracking web application: Express HTTP layer, EJS server-rendered views, SQLite persistence via `better-sqlite3`, single-package proof-of-concept.

### Build System

- **Type**: npm (no compile/bundler step — plain Node.js CommonJS executed directly)
- **Config Files**:
  - `package.json` — npm manifest, scripts, dependency ranges, `engines.node >= 20.0.0`
  - `vitest.config.js` — test runner + coverage configuration
  - `src/db/migrations.sql` — base DDL applied by the migration runner
  - `package-lock.json` — lockfile (npm, lockfileVersion present)
- **Build Dependencies**: no build step exists. `npm install` → `npm start` runs `node src/server.js` directly (`package.json:9-10`). No TypeScript, no transpiler, no bundler, no `tsconfig.json`.

**Dependency graph** (internal, `require` edges):

```
src/server.js      -> src/db/index.js, src/app.js
src/app.js         -> src/routes/assets.js, express
src/routes/assets.js -> src/services/asset-service.js, express
src/services/asset-service.js -> src/repositories/assets-repo.js
src/repositories/assets-repo.js -> node:crypto, better-sqlite3 (via db handle only)
src/db/index.js    -> better-sqlite3, src/db/migrate.js
src/db/migrate.js  -> src/db/migrations.sql (read at module load)
```

No circular references. `views/` are reached by the EJS engine, not by `require`.

### APIs Discovered

- **HTTP (server-rendered form API)** — `src/routes/assets.js`, mounted at `/assets` by `src/app.js:15`, plus a root redirect at `src/app.js:14` — **7 endpoints**
  | Method | Path | Handler | Success | Error |
  |---|---|---|---|---|
  | GET | `/` | `src/app.js:14` | 302 → `/assets` | — |
  | GET | `/assets` | `src/routes/assets.js:9` | 200 render `list` | next(err) |
  | GET | `/assets/new` | `src/routes/assets.js:31` | 200 render `new` | — |
  | POST | `/assets` | `src/routes/assets.js:35` | 302 → `/assets` | 400 render `new` on `VALIDATION_ERROR` / `DUPLICATE_ASSET` |
  | GET | `/assets/:id` | `src/routes/assets.js:57` | 200 render `detail` | 404 render `error` on `NOT_FOUND` |
  | POST | `/assets/:id/assign` | `src/routes/assets.js:69` | 302 → `/assets/:id` | 400 on `INVALID_TRANSITION` / `VALIDATION_ERROR` |
  | POST | `/assets/:id/return` | `src/routes/assets.js:77` | 302 → `/assets/:id` | 400 on `INVALID_TRANSITION` |
  | POST | `/assets/:id/lost` | `src/routes/assets.js:84` | 302 → `/assets/:id` | 400 on `INVALID_TRANSITION` |

  Query parameters accepted by `GET /assets`: `q`, `category`, `status`, `sort` (`name` \| `created_at`), `dir` (`asc` \| `desc`) — `src/routes/assets.js:11-26`. Request body on `POST /assets`: `category`, `name`, `serial_or_key`, `model`, `notes`, `assigned_to` — `src/routes/assets.js:37-44`.

- **Internal module API — repository layer** — `src/repositories/assets-repo.js` — **7 exported functions**
  `listAssets(db, filters)` (`:13`), `getAsset(db, id)` (`:34`), `createAsset(db, input)` (`:38`), `updateAsset(db, id, patch)` (`:80`), `recordAudit(db, assetId, action, description)` (`:109`), `latestAuditFor(db, assetId)` (`:116`), `nowIso(db)` (`:8`), plus exported constants `ALLOWED_CATEGORIES` (`:5`), `ALLOWED_STATUSES` (`:6`) and helper `validateCreate(input)` (`:126`).

- **Internal module API — service layer** — `src/services/asset-service.js` — **6 exported functions**
  `registerAsset` (`:34`), `assignAsset` (`:52`), `returnAsset` (`:72`), `markLost` (`:87`), `getAssetWithAudit` (`:96`), `listAssets` (`:103`), plus exported transition table `TRANSITIONS` (`:5`).

- **Internal module API — data access** — `src/db/index.js` exports `openDatabase(filename)` (`:8`); `src/db/migrate.js` exports `applyMigrations(db)` (`:53`), `MIGRATIONS` (`:13`), `MIGRATIONS_SQL` (`:6`); `src/app.js` exports `createApp(db)` (`:7`); `src/server.js` exports `main()` (`:10`).

- **No JSON/REST API, no GraphQL, no OpenAPI spec, no external service integration, no outbound network calls.** The application is entirely self-contained; there are no third-party API clients.

- **Authentication / authorization**: none. No session middleware, no auth router, no CSRF protection, no rate limiting. `README.md:67` states this explicitly as a POC limitation ("no authentication, no bulk operations, no notifications, no multi-tenant"). This is a fact about the codebase, not a judgement about the organisation.

### Frameworks & Libraries

| Name | Version (declared) | Purpose |
|---|---|---|
| express | `^4.21.0` (dependency) | HTTP server, routing, `urlencoded` body parsing, static file serving |
| better-sqlite3 | `^11.3.0` (dependency) | Synchronous SQLite driver; `db.pragma`, `db.prepare`, `db.transaction` |
| ejs | `^3.1.10` (dependency) | Server-side templating for `views/*.ejs` |
| vitest | `^2.1.2` (devDependency) | Test runner |
| @vitest/coverage-v8 | `^2.1.9` (devDependency) | V8 coverage provider |
| supertest | `^7.0.0` (devDependency) | HTTP-level integration testing against the Express app |

Runtime environment confirmed live: Node.js v20.20.0, SQLite 3.49.2, better-sqlite3 bound against that SQLite build.

### Test Coverage

- **Test Directories**: `tests/` (flat) and `tests/helpers/`
- **Test Frameworks**: Vitest 2.1.x with `globals: true` (`vitest.config.js:10`, required because Vitest 2.x rejects `describe`/`it`/`expect` globals under CommonJS), `pool: 'forks'` (`vitest.config.js:15`). `supertest` drives the Express app in-process.
- **Coverage Config**: **Present but with no floor.** `vitest.config.js:16-22` sets `provider: 'v8'`, `reporter: ['text','html']`, `include: ['src/**/*.js']`. The inline comment at `vitest.config.js:17-18` states "The `poc` scope has no coverage floor — this is informational only". There is no `thresholds` key, so `npm run test:coverage` cannot fail the build.
- **Verified baseline**: `npx vitest run` executed read-only during this scan — **66 passed / 66, 5 test files, 751 ms**. Per file: `db.test.js` 7, `assets-repo.test.js` 15, `asset-service.test.js` 18, `views.test.js` 12, `routes.test.js` 14. This confirms the 66/66 merge gate stated in the intent context.
- **Test layout by layer**: `db.test.js` (schema + migration behaviour, incl. a hand-built legacy-schema migration test at `:59-93`), `assets-repo.test.js` (repository CRUD/filter/sort/audit), `asset-service.test.js` (state machine + timestamps), `routes.test.js` (HTTP integration), `views.test.js` (rendered HTML assertions). `tests/helpers/seed.js` provides `seedTwoAssets`, `seedAsset`, `resetState`, `latestAssetId`.
- **Testing idiom**: every test opens a fresh `:memory:` database via `openDatabase(':memory:')` in `beforeEach` and closes it in `afterEach` — no test touches the `data/` directory. Assertions on the error contract use the `err.code` property, not the message (`tests/assets-repo.test.js:9-12` documents this explicitly).
- **Coverage of the audit surface**: `audit_log` writes are asserted only in the aggregate — `tests/assets-repo.test.js:112-118` (`latestAuditFor` returns the most recent) and `tests/asset-service.test.js:107-112` (one entry per transition). **No test asserts an audit row count, an audit ordering across many transitions, or the cascade behaviour.** No test asserts that an asset deletion does or does not remove its audit rows.

### Code Quality Indicators

- **Linting**: **absent.** No ESLint, Prettier, StandardJS, or Biome configuration and no lint dependency anywhere in `package.json`. No `.eslintrc*`, `eslint.config.*`, `.prettierrc*`, `.prettierignore`. `package.json:8-18` defines seven test scripts and two run scripts — no `lint` script. The org rule "we defer to project-level configurations" therefore has nothing to defer to here; a later stage that adds a linter is adding a new capability, not enforcing an existing one.
- **CI/CD**: **absent.** No `.github/` directory, no `.gitlab-ci.yml`, `Jenkinsfile`, `azure-pipelines.yml`, `Dockerfile`, `docker-compose.yml`, `Makefile`, or `Procfile`. No deployment configuration of any kind. `README.md` documents only local `npm install` / `npm start` / `npm test`.
- **Documentation**: `README.md` is **good** — 93 lines, accurately describing quick start, all six test scripts, feature behaviour, the closed state machine with the four transition rules spelled out (`README.md:38-44`), the migration model (`:50-56`), an environment-variable table (`:58-63`), an explicit "Why this exists" section (`:65-67`), and a code-layout tree (`:69-93`). A second file `README.MD` (uppercase extension) contains only the text "Excercise project" — a duplicate-name artefact on a case-insensitive filesystem, worth deleting but harmless on Linux.
  - **Doc comments**: `src/db/migrate.js:8-12` and `:24-29`, `src/repositories/assets-repo.js:48-52`, `src/services/asset-service.js:35-37` and `:59-60`, `tests/helpers/seed.js` (JSDoc on all four exports), and `tests/assets-repo.test.js:7-12` / `tests/asset-service.test.js:7-12` (documenting the `err.code` error contract). Comments are purposeful and explain *why*, not *what*.
  - **Requirement traceability in code**: tests carry inline `FR`/`NFR` markers (e.g. `tests/asset-service.test.js:39`, `tests/routes.test.js:34`, `tests/views.test.js:78`) tying each assertion to the POC requirement IDs.
- **Formatting**: consistently 2-space indent, single quotes, semicolons, trailing commas — uniform across all 12 source files. No formatter config, but the style is self-consistent.
- **Error handling**: a coherent, documented contract. Errors are `Error` instances carrying a `code` property — `VALIDATION_ERROR`, `DUPLICATE_ASSET`, `NOT_FOUND`, `INVALID_TRANSITION`, `INVALID_STATE` (`src/services/asset-service.js:28-32`, `src/repositories/assets-repo.js:41-44`, `:71-73`, `:83-85`). The Express error middleware (`src/app.js:17-24`) maps `NOT_FOUND` → 404 and `DUPLICATE_ASSET` / `VALIDATION_ERROR` / `INVALID_TRANSITION` → 400, and falls through to a 500 with a generic message.
  - **Gap**: `INVALID_STATE` (`src/services/asset-service.js:21`) is thrown by `assertTransition` but is **not** in the `app.js:20` handled-code list, so an unknown-state error surfaces as a 500 rather than a 400.

### Technical Debt Signals

1. **Audit history is destroyed by any asset-row deletion, by schema design.** `src/db/migrations.sql:35` — `FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE`. Verified live: inserting an asset plus an audit row and deleting the asset leaves **0** audit rows. This directly contradicts the MVP's append-only, actor-attributed history requirement, and it is the reason the `audit_log` rebuild is needed at all.
2. **The serial-uniqueness constraint is case-sensitive and category-scoped exactly as specified, but case-*insensitively* is not enforced.** `src/db/migrations.sql:26` — `UNIQUE (category, serial_or_key)` is a plain column-pair unique index. Verified live: inserting `hardware`/`'AbC'` and then `hardware`/`'abc'` **both succeed** — SQLite's default `BINARY` collation treats them as distinct. The MVP requires case-insensitive, category-scoped uniqueness. There is **no** functional index (`lower(serial_or_key)`) anywhere in the schema, and `src/repositories/assets-repo.js:70-74` catches the unique violation by string-matching `'UNIQUE constraint failed'` in the error message — a brittle, message-dependent detection that will not distinguish a category-scoped duplicate from any other unique violation.
3. **The application-level duplicate check does not exist; only the database constraint does.** `createAsset` (`src/repositories/assets-repo.js:38-78`) inserts and relies on the DB to reject; there is no pre-check query, no `IMMEDIATE` transaction, and no `busy_timeout` configured. `src/db/index.js:15-16` sets only `journal_mode = WAL` and `foreign_keys = ON`; `busy_timeout` is left at SQLite's default (0). The MVP's concurrency-safe uniqueness policy (IMMEDIATE transaction, non-zero `busy_timeout`, `SQLITE_BUSY` → retryable error) must be built from nothing here.
4. **Status vocabulary is duplicated across four independent locations and must be extended in all of them.** The set `('in-stock','assigned','returned','lost')` appears at: `src/db/migrations.sql:17` (CHECK constraint), `src/repositories/assets-repo.js:6` (`ALLOWED_STATUSES`), `src/services/asset-service.js:5-10` (`TRANSITIONS`), `views/list.ejs:10-16` (status filter `<select>`), `views/detail.ejs:26-49` (per-status action forms), and `public/styles.css:27-30` (`.status-*` colour tokens). The MVP's five exclusive buckets plus `discarded` require a change in **all** of these. There is no single shared vocabulary constant.
5. **`updateAsset` bypasses the state machine entirely.** `src/repositories/assets-repo.js:80-107` writes `status` from an arbitrary patch with no transition validation and no audit write. It is safe today only because the DB CHECK constraint rejects unknown status values — verified live: `updateAsset(db, id, {status:'bogus-status'})` throws `CHECK constraint failed`. But it means the state machine in `asset-service.js` is enforced by *call discipline*, not by the layer boundary, and any new caller (e.g. the MVP's asset-editing feature) can write `status` directly.
6. **No counting, dashboard, assignee-directory, CSV export, or actor concept exists.** Verified by exhaustive grep across `src/`, `tests/`, `views/` for `csv`, `export`, `count`, `dashboard`, `actor`, `operator`, `acting`: the only hits are `module.exports` lines. **All five MVP surfaces are greenfield.** There is no partial implementation to extend and no existing counting definition to unify — the "one shared counting function" must be authored from scratch.
7. **Audit rows carry no actor.** `src/db/migrations.sql:29-36` — `audit_log` has `(id, asset_id, action, description, created_at)` and nothing else. The action vocabulary in use is `create`, `assign`, `return`, `mark-lost` (`src/services/asset-service.js:40,47,68,83,92`). The MVP requires a `recovered` action and a distinct `discarded` action, plus an actor column. Note the existing action string is `mark-lost` (hyphenated) while the service function is `markLost` (camel) — the vocabulary is stringly-typed with no constant.
8. **Audit write path is not transactional with the asset write.** `assignAsset`, `returnAsset`, `markLost` (`src/services/asset-service.js:52-94`) each perform two separate statements — an `UPDATE` then an `INSERT INTO audit_log` — with no enclosing `db.transaction()`. `better-sqlite3` is synchronous, so a thrown error between the two statements leaves the asset updated and the audit entry missing. The audit log is therefore not reliably append-only *per operation* today, and the MVP's "every lifecycle transition has explicit … audit behaviour" must add transactional wrapping.
9. **Only the most recent audit entry is ever read.** `latestAuditFor` (`src/repositories/assets-repo.js:116-124`) does `ORDER BY id DESC LIMIT 1`. `getAssetWithAudit` (`src/services/asset-service.js:96-101`) returns that single row, and `views/detail.ejs:16-23` renders it as "Recent activity". The MVP's history surface (previous holder, full history at the detail URL) has no retrieval path — a full-history query does not exist.
10. **`assigned_to` is a bare free-text string with no referential integrity.** `src/db/migrations.sql:18` — `assigned_to TEXT`, no FK, no directory table. The MVP's `last_assigned_to` and the assignee directory are therefore both greenfield, and the current holder value has no authoritative source to copy from other than the raw string.
11. **`views/_layout.ejs` is dead code.** Nothing includes it — every template includes `_header`/`_footer` instead (`views/list.ejs:1,54`, `views/new.ejs:1,40`, `views/detail.ejs:1,53`, `views/error.ejs:1,5`). It duplicates the header markup.
12. **`views/list.ejs:40` empty-state row has `colspan="5"`** but the table has 5 columns — correct — however the empty state message "No assets yet." (`views/list.ejs:40`) is the only empty state in the application. The MVP requires empty states on several new surfaces.
13. **No `busy_timeout`, no `PRAGMA foreign_keys` re-verification inside migrations.** `src/db/index.js:16` enables foreign keys, but `applyMigrations` (`src/db/migrate.js:53-70`) can be called on a raw handle (as `tests/db.test.js:82` does) where foreign keys are off. The MVP's create-copy-drop-rename rebuild must control the `foreign_keys` pragma explicitly — see the handoff finding.
14. **Zero TODO/FIXME/HACK markers, zero `eslint-disable`/`noqa` suppressions** across `src/`, `tests/`, `views/`, `public/`. The codebase is clean of the usual debt markers; its debt is structural, not annotated.

#### Verified platform constraints (probed live against SQLite 3.49.2 / better-sqlite3 11.x)

These are facts about the toolchain, established by execution rather than by reading:

- `ALTER TABLE … DROP CONSTRAINT` → **`near "CONSTRAINT": syntax error`**. SQLite cannot drop or amend a CHECK constraint. The `assets` table must be rebuilt to admit `discarded`.
- `ALTER TABLE … ADD COLUMN … IF NOT EXISTS` does not exist — which is exactly why `migrate.js:35-41` implements `addColumnIfMissing` in code.
- **Functional unique indexes are supported.** `CREATE UNIQUE INDEX … ON assets (category, lower(serial_or_key))` succeeds and enforces case-insensitive uniqueness. (The probe's uniqueness error was the *expected* rejection of the deliberately-conflicting `'abc'` insert.)
- `PRAGMA legacy_alter_table = 1` does **not** suppress the FK-rewrite behaviour of `ALTER TABLE … RENAME` (see handoff finding).
- `PRAGMA foreign_key_check` returns `[]` on a correctly rebuilt schema — a usable post-migration assertion.
- `busy_timeout` is settable at runtime (`db.pragma('busy_timeout = 5000')` → `5000`) but is **not** set anywhere in `src/`.

---

## Handoff Summary

### Intent-relevant finding

**The two mandated structural rebuilds cannot be performed in the order the intent context assumes, and the naive ordering silently destroys the entire audit history — the exact asset the MVP exists to protect.**

The intent context states: "the `audit_log` table must lose its `ON DELETE CASCADE` from `assets` and gain an actor column (SQLite cannot drop a FK action or a CHECK constraint via `ALTER TABLE`, so a create-copy-drop-rename path is required), and the `assets` table must be rebuilt to admit `discarded` in its `status` CHECK constraint."

Live probing against the real schema established the following, which the architect must design around:

1. **Rebuilding `assets` first destroys all audit rows.** `src/db/migrations.sql:35` declares `FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE`. In the create-copy-drop-rename sequence, the `DROP TABLE assets` step fires that cascade and deletes every `audit_log` row for the dropped assets. Verified: 1 audit row in → **0** audit rows out, transaction committed, no error raised.
2. **Rebuilding `audit_log` first makes the `assets` rebuild fail outright.** Once `audit_log`'s FK no longer cascades, `DROP TABLE assets` is blocked: `FOREIGN KEY constraint failed`. Verified by isolating the four steps individually — `CREATE assets_new` OK, `INSERT … SELECT` OK, `DROP TABLE assets` **FAILS**.
3. **Renaming the old table aside is not a safe workaround.** `ALTER TABLE assets RENAME TO assets_old` **rewrites the referencing FK in the other table** — `audit_log` ends up pointing at `REFERENCES "assets_old"(id) ON DELETE CASCADE`. Dropping `assets_old` afterwards then cascades the audit rows away anyway (verified: audit rows → 0). `PRAGMA legacy_alter_table = 1` does **not** suppress this rewrite (verified).
4. **The one ordering that works is: rebuild `audit_log` with no FK clause → rebuild `assets` → re-add the FK to `audit_log` after the `assets` rename.** Verified end-to-end: audit history preserved (`id:1, asset_id:'a', actor:'system', action:'create'`), `PRAGMA foreign_key_check` → `[]`, and the final `assets` DDL carries the widened CHECK (`'in-stock','assigned','returned','lost','discarded'`) plus a `last_assigned_to` column.
5. **That rebuild loses the indexes on the rebuilt table.** `idx_assets_status` and `idx_assets_category` (`src/db/migrations.sql:39-40`) are attached to `assets` and are destroyed by the drop; `idx_audit_asset_recent` (`:38`) survives because it is on `audit_log`. Verified: after a full rebuild, the index list is empty. The migration must re-create the lost indexes — and `migrations.sql` uses `CREATE INDEX IF NOT EXISTS` (`src/db/migrations.sql:38-40`), but that file is applied as **migration v1 only** (`src/db/migrate.js:13-20`), so a new v3 migration must re-issue the index DDL itself rather than relying on the base file.

**The second intent-relevant finding, on the uniqueness policy:** the existing constraint is case-sensitive in practice. `src/db/migrations.sql:26` (`UNIQUE (category, serial_or_key)`) does not prevent `hardware`/`'AbC'` and `hardware`/`'abc'` from coexisting — verified by live insert; both rows were accepted. The MVP's case-insensitive, category-scoped uniqueness therefore needs a *new* functional index (`lower(serial_or_key)` — confirmed supported by SQLite 3.49.2), and the existing duplicate detection at `src/repositories/assets-repo.js:70-74` will need to distinguish the new functional-index violation from the old plain one, since both surface only as the generic string `'UNIQUE constraint failed'`. The standing condition requiring one *shared* definition between the index expression and the application-level comparison predicate cannot be satisfied by the current code, which has no application-level predicate at all — `createAsset` performs no pre-check query, there is no `IMMEDIATE` transaction, and `busy_timeout` is never set (`src/db/index.js:15-16` sets only `journal_mode` and `foreign_keys`).

### Risks / follow-up

- **Migration ordering is the highest-risk item in the release.** Any design that rebuilds `assets` without first taking `audit_log` out of cascade reach — or that rebuilds `audit_log` without dropping its FK clause during the window in which `assets` is dropped — destroys pre-MVP audit history silently. The requirement that "historical backfills preserve original records and audit traceability and report failures" is at risk from the migration itself, not only from application code.
- **The FK-removal side effect must be decided explicitly.** Once the cascade is gone, `DELETE FROM assets` is blocked by the FK constraint whenever audit rows exist (verified: `SQLITE_CONSTRAINT_FOREIGNKEY`). `ON DELETE SET NULL` on `audit_log.asset_id` is the one alternative that permits deletion while preserving the audit row — verified working (the audit row survives with `asset_id` set to `NULL`) — but it changes `asset_id` from `NOT NULL` to nullable, which is a schema decision the architect must surface rather than assume. The MVP requires that "the asset row and its full history are never deleted", so this path may not be needed, but the architect must confirm that no code path deletes assets (none currently does — there is no delete endpoint, no delete repository function, and no delete test).
- **The status vocabulary is duplicated in six places** (`src/db/migrations.sql:17`, `src/repositories/assets-repo.js:6`, `src/services/asset-service.js:5-10`, `views/list.ejs:10-16`, `views/detail.ejs:26-49`, `public/styles.css:27-30`). Introducing `discarded` and the five exclusive buckets requires all six to change in lockstep. There is no shared constant to extend, so the architect must decide whether to introduce one — a decision that also creates the shared definition the counting invariant depends on.
- **The counting invariant has no existing implementation to unify.** Verified by exhaustive grep: there is no `COUNT`, no dashboard, no assignee directory, no CSV export, and no actor concept anywhere in `src/`, `tests/`, or `views/`. The dashboard, assignee directory, asset list, and CSV counts required by the standing condition are four greenfield surfaces, and the "one shared counting function and a reusable filter builder" must be authored from scratch. The architect should not plan to *refactor* existing counting logic — there is none.
- **Audit writes are not transactional with the asset write** (`src/services/asset-service.js:52-94` — three separate `UPDATE`/`INSERT` pairs, no `db.transaction()`), and only the *latest* audit row is ever retrievable (`src/repositories/assets-repo.js:116-124`, `LIMIT 1`). Both must change for an append-only, actor-attributed, full-history MVP.
- **The `audit_log` table has no actor column and the action vocabulary is stringly-typed** (`create`, `assign`, `return`, `mark-lost` — `src/services/asset-service.js:40,47,68,83,92`). The MVP requires a distinct `recovered` action and a distinct `discarded` action. Note the existing hyphenation (`mark-lost`) versus camelCase function name (`markLost`) — the architect must pick the convention rather than infer one.
- **The `updateAsset` path bypasses the state machine** (`src/repositories/assets-repo.js:80-107`): it writes `status` from an arbitrary patch with no transition validation and no audit write. The MVP's asset-editing feature will reach this path, so the architect must decide whether to close it, and must ensure the MVP's "every lifecycle transition has explicit validation and audit behaviour" is enforced at the layer boundary rather than by call discipline.
- **No linting and no CI exist.** Verified: no ESLint/Prettier config, no `.github/`, no pipeline file, no `lint` npm script. The org rule "we defer to project-level configurations" has no project-level configuration to defer to. A later stage must treat a linter as a *new* capability, and the "CI execution before merge" expectation for the `feature` scope will require building a pipeline from scratch — a delivery-estimation input the architect should surface rather than assume is free.
- **The `data/` directory is a live, gitignored SQLite file** (`data/assets.sqlite` plus `-wal` and `-shm`, 4096 + 292552 + 32768 bytes) and must be treated as read-only. It is also the only place a real migration would be exercised against non-empty data; the `migrations.sql` base file's `IF NOT EXISTS` idiom (`src/db/migrations.sql:10,29,38-40`) means the base migration is safe to re-apply, but the planned rebuild migrations are not inherently idempotent and must be written to be re-runnable.
- **The existing 66/66 baseline is confirmed live** (`npx vitest run` → 66 passed, 5 files, 751 ms; per-file 7/15/18/12/14). The rebuild migration must be proven against a *populated* database, not only a fresh `:memory:` one — the existing legacy-migration test at `tests/db.test.js:59-93` is the pattern to extend, and it currently builds only a legacy `assets` table with no `audit_log` rows, so it would not have caught the cascade data loss.
- **The `INVALID_STATE` error code is unhandled at the HTTP boundary** (`src/services/asset-service.js:21` throws it; `src/app.js:20` does not list it), so an unknown-state asset surfaces as a 500 rather than a 400.
- **`views/_layout.ejs` is dead code** (nothing includes it) and duplicates `_header.ejs`; `README.MD` duplicates `README.md` with a one-line placeholder on a case-insensitive filesystem. Both are trivial cleanups but should be recorded rather than silently deleted, since the release's diff will be reviewed.
- **The active-space intent artifacts under `aidlc/spaces/default/intents/261106-asset-tracker-mvp/ideation/`** (feasibility, scope-definition, rough-mockups, approval-handoff) were **not** read during this scan — they are upstream design artifacts, not application source, and reading them is the architect's job in link 2. This scan's factual claims about the codebase are independent of them; where the intent context and the code disagree, the code evidence above is authoritative.
