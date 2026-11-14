# Unit Test Instructions — `u1-foundation`

**Unit**: Foundation  
**Framework**: Vitest 2.1.9, V8 coverage, `better-sqlite3`  
**Strategy**: standard (5–8 tests per component) plus the feature-scope 80% line floor  
**Ordering**: test-after, except the two-table rebuild, which is written first

## How to run this unit

```bash
npx vitest run --maxWorkers=1 --no-file-parallelism tests/foundation/rebuild.test.js tests/foundation/connection.test.js tests/foundation/actor.test.js
```

That command is the only unit-scoped command. It is runnable before the rebuild tests are written: the runner already exists. Do not open `data/assets.sqlite`. Every database is `:memory:` or a file under the test's own temporary directory.

`npm test` is the existing-suite check, not this unit's command. Run it once after the migration lands. Do not lower `coverage.thresholds.lines`.

## Components and files

| Component | Production | Tests | Count |
|---|---|---|---|
| SchemaMigration | `src/db/migrate.js` | `tests/foundation/rebuild.test.js` | 9, the rebuild cases written first |
| DatabaseConnection | `src/db/index.js` | `tests/foundation/connection.test.js` | 5, after implementation |
| ActorResolver | `src/actor.js` | `tests/foundation/actor.test.js` | 5, after implementation |

## Rebuild tests (written before `migrate.js` changes)

Fixture: a temporary database migrated only through version 2, with asset rows and audit rows whose ids, action, description, and `created_at` are known. Opening it through `openDatabase` applies version 3.

1. Audit row count is unchanged, and each original id, asset id, action, description, and `created_at` is unchanged.
2. Every backfilled `actor` equals `BACKFILL_ACTOR` (`system`). Pre-MVP rows stay in the table.
3. `last_assigned_to` exists and is null on copied asset rows. `discarded` is accepted by the status check. The old four-value check is gone.
4. `PRAGMA index_list` includes the recreated status, category, and audit indexes, plus `idx_assets_serial_ci` on `(category, LOWER(TRIM(serial_or_key)))`.
5. `UPDATE` and `DELETE` on `audit_log` abort. `PRAGMA foreign_keys` is on after open.
6. Two legacy rows whose serials differ only by ASCII case or surrounding U+0020 fail the migration, and the source rows are unchanged because the transaction rolled back.
7. Dropping `assets` does not delete the copied audit rows. The foreign key from `audit_log.asset_id` to `assets.id` exists again after the migration.
8. The current repository insert `INSERT INTO audit_log (asset_id, action, description)` still succeeds, and the stored actor is `system`.
9. Each of the seven `AUDIT_ACTIONS` values is accepted. Any other action is rejected.

## Connection tests (after `openDatabase` changes)

1. `PRAGMA busy_timeout` is `5000`.
2. `PRAGMA journal_mode` is `wal`.
3. `PRAGMA foreign_keys` is on after migrations.
4. A missing parent directory for a file database is created.
5. `:memory:` still migrates, including version 3.

## Actor tests (after `src/actor.js`)

1. A non-empty `ASSET_ACTOR` is returned unchanged, aside from trimming surrounding spaces.
2. An unset `ASSET_ACTOR` returns `system`.
3. A blank or whitespace-only `ASSET_ACTOR` returns `system`.
4. That fallback equals the imported `BACKFILL_ACTOR`. The resolver module itself does not import `src/domain/vocabulary.js`.
5. `resolveActor` takes no arguments. The tests never pass a request, body, query, or header.

## Coverage and data

The project floor stays 80% lines. These tests cover the migration, the connection pragmas, and the resolver. No test writes the live database under `data/`.
