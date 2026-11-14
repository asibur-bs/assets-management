# Code Summary — `u1-foundation`

**Unit**: Foundation
**Kind**: `service`
**Status**: Implemented under the approved plan

## What landed

| Path | Role |
|---|---|
| `src/db/migrate.js` | Migration version 3, `foundation-rebuild`, in one transaction. Audit rows are copied out before `assets` is rebuilt. Foreign keys are toggled outside that transaction and turned back on if it throws. |
| `src/db/index.js` | `busy_timeout = 5000` once, at open, before migrations. |
| `src/actor.js` | `resolveActor()` reads `ASSET_ACTOR`. A blank value is `system`. No request argument and no import of `src/domain/vocabulary.js`. |
| `tests/foundation/rebuild.test.js` | Nine rebuild tests. The first eight were written before the migration. |
| `tests/foundation/connection.test.js` | Five connection tests. |
| `tests/foundation/actor.test.js` | Five actor tests. |
| `tests/tooling/gates.test.js` | The smoke fixture no longer adds `actor`. An empty actor is supplied by a test shim. The lost-history fixture drops `audit_log_no_delete` only so the smoke gate can see a missing baseline row. |
| `vitest.config.js` | The pool is one thread. Node 24 aborts a recycled fork inside the `better-sqlite3` destructor. The line-coverage floor stays 80. |

## Unit-scoped test command

```text
npx vitest run --maxWorkers=1 --no-file-parallelism tests/foundation/rebuild.test.js tests/foundation/connection.test.js tests/foundation/actor.test.js
```

## Existing suite

`npm test` is the existing-suite check. On this workspace it is 12 files and 115 tests, including the original repository insert that omits `actor` and stores `system`.

## Decisions

`resolveActor()` uses the server environment variable `ASSET_ACTOR`, or `system` when that variable is unset or blank. The rebuilt `actor` column is `TEXT NOT NULL DEFAULT 'system'`, so the current audit insert keeps working. U3 passes `resolveActor()` explicitly. This unit does not change the repository, the routes, or `recordAudit`.

The foreign key on `audit_log.asset_id` has no `ON DELETE` action. A parent delete fails the foreign-key check and leaves the audit rows in place. The `BEFORE DELETE` trigger blocks a direct delete of an audit row. `action` is constrained to `AUDIT_ACTIONS`. A serial collision or a copy-count mismatch names the row identifiers and rolls back.

## Left for U3

AC4.2.4, the machine-readable refusal when a caller deletes an asset, stays with the write path. The trigger already keeps the rows. AC4.2.5, one audit row per write with a non-empty actor, stays with the write path. This unit only guarantees that an insert which omits `actor` stores `system`.
