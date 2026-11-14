## Review

**Verdict:** NOT-READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-11-14T21:16:55Z
**Iteration:** 1

### Findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| R-01 | Critical | aidlc/spaces/default/intents/261106-asset-tracker-mvp/construction/u1-foundation/code-generation/code-generation-plan.md > Step 4 | Step 4 orders the rebuilt `audit_log` foreign key as `ON DELETE CASCADE`, and `restoreAudit` in `src/db/migrate.js` creates that clause. AC0.1.5 requires the rebuilt table to carry an `actor` column and no `ON DELETE CASCADE` clause. `tests/foundation/rebuild.test.js` asserts `on_delete: 'CASCADE'`, and `traceability.json` marks AC0.1.5 `OK` against that test. An in-memory open shows the same DDL. A parent `DELETE` is aborted by `audit_log_no_delete` (`SQLITE_CONSTRAINT_TRIGGER`) and both rows remain, so history survives only while that trigger stays installed. The summary records the story and then follows the plan. The green suite cannot catch the broken criterion because the test requires the forbidden clause. | Rebuild `audit_log.asset_id` as a foreign key with no `ON DELETE CASCADE` clause. Keep the append-only triggers. Change the drop-assets test so it expects the clause to be absent and still proves a parent delete removes no audit row. Mark AC0.1.5 `OK` only after that schema is what the test asserts. | New |
| R-02 | Major | src/db/migrate.js > restoreAudit | Contract 1 gives U1 `audit_actions` (seven values) as the audit table's action constraint, and `SchemaMigration` in `components.md` reads that vocabulary to rebuild the audit table. `restoreAudit` declares `action TEXT NOT NULL` and never reads `AUDIT_ACTIONS`. The same migration builds `assets.status` from `STATUS_VALUES`. An in-memory insert of action `not-an-action` succeeds. SQLite cannot add that check later without another `audit_log` rebuild. | In this same migration, constrain `audit_log.action` to the `AUDIT_ACTIONS` list from the domain vocabulary, the same way `assets.status` is constrained to `STATUS_VALUES`. Add a regression that an action outside that list is rejected and that each of the seven values is accepted. | New |
| R-03 | Minor | src/db/migrate.js > createIndexesAndTriggers | The unique index is the literal `LOWER(TRIM(serial_or_key))`. `src/domain/vocabulary.js` already exports that text as `SERIAL_OR_KEY_INDEX_EXPRESSION`, and Contract 2 requires one definition shared by the functional index and the comparison predicate. The two strings match today. A later edit to either copy can make registration and the index disagree. | Create `idx_assets_serial_ci` from `SERIAL_OR_KEY_INDEX_EXPRESSION` so the migration and the vocabulary cannot drift. | New |
| R-04 | Minor | src/db/migrate.js > assertSameCount | Contract 5 `backfill.on_failure`, NFR3.3, and AC0.1.10 require a failing backfill to be reported with row identifiers and reasons, then rolled back. A count mismatch throws `source N, destination M` with no identifiers. The case-variant failure throws `SQLITE_CONSTRAINT_UNIQUE` and names neither asset id nor serial. Rollback itself is covered and passes. | Before the transaction rolls back, include the failing row identifiers and the reason in the error the migration raises. | New |

### Validation Tool Results

| Tool | Result | Interpretation |
|---|---|---|
| npx vitest run --maxWorkers=1 --no-file-parallelism tests/foundation/rebuild.test.js tests/foundation/connection.test.js tests/foundation/actor.test.js | PASS, 3 files, 18 tests | The unit command is green. It does not clear R-01: the rebuild test asserts `ON DELETE CASCADE`. |
| npm test | PASS, 12 files, 114 tests | The existing suite stays green, including the original tests. It does not assert AC0.1.5. |
| npm run lint | PASS | `eslint src tests vitest.config.js` reports no defect. |
| in-memory schema probe via openDatabase(':memory:') | `on_delete` is `CASCADE`; `PRAGMA foreign_key_check` is empty; action `not-an-action` and actor `''` both insert; `DELETE FROM assets` raises `SQLITE_CONSTRAINT_TRIGGER` and leaves the asset and audit rows | Confirms R-01 and R-02. Foreign keys are consistent on an empty migrated database. History survives a parent delete only through the trigger. |

### Summary

The foundation migration preserves history and the suite is green, but the rebuilt `audit_log` still declares `ON DELETE CASCADE`, which AC0.1.5 forbids, and the unit test locks that clause in. The action column is also unconstrained against the seven-value vocabulary, so a value outside that set can be stored without another rebuild to stop it.
