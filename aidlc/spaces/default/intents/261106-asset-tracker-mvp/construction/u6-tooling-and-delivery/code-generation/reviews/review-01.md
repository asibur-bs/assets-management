## Review

**Verdict:** NOT-READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-11-13T11:19:08Z
**Iteration:** 1

### Findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| R-01 | Critical | lefthook.yml > pre-commit commands | Installed Lefthook 2.2.2 sorts `commands` by name when `priority` is unset, and `npx lefthook dump` prints this hook as audit, then coverage, then lint, then secret-scan, then test. Secret scan is fourth. The same version's `piped` default is false, and `lefthook.yml` does not set `piped: true`, so a failing command does not skip the commands after it. `tests/tooling/gates.test.js` only compares character indexes in the YAML text, so that test stays green while the runtime order is reversed. `.git/hooks` contains only `*.sample` files, so the local gate is also not installed; Lefthook's postinstall skips `lefthook install` when `CI=true`, and no `package.json` script calls it. This breaks security-design NFR2.4.1 (secret scan is the first local step and a hit never proceeds to lint, test, coverage, or audit) and the plan's step 3 order. | Set `piped: true` and an explicit order (`priority` or numeric command names) so secret-scan runs first and a non-zero exit skips lint, test, coverage, and audit. Assert that order from `lefthook dump` (or the same runtime listing), and install the git hook from a setup command that still runs when `CI=true`. | New |
| R-02 | Critical | scripts/smoke-deploy.sh > post-deploy audit count | The script fails the history check only when `post_count` is less than `pre_count`. On the success path it POSTs `/assets` and `/assets/:id/assign`. `src/services/asset-service.js` `registerAsset` and `assignAsset` each call `recordAudit` before `src/routes/assets.js` returns 302, so a green smoke appends two audit rows. Deleting one or two pre-existing audit rows still leaves `post_count >= pre_count` and the script exits 0. The script never records pre-deploy row ids or content. NFR3.5 requires every seeded audit row to remain with its content intact, and security-design NFR3.5.2 requires the pre-deploy audit count to be intact. Traceability marks both NFR3.5 and NFR3.5.2 `OK`. | Before the smoke writes, record the pre-deploy audit row ids (or a content checksum). Fail unless those rows are still present afterward. Any count check has to require the pre-deploy rows plus the rows this smoke itself appended. | New |
| R-03 | Major | docs/deploy.md > Ordered deploy steps | Step 1 collects product-owner sign-off, and step 7 runs `scripts/smoke-deploy.sh`. Step 9 only confirms that the sign-off is already logged. The plan's step 3 places product-owner sign-off after the smoke and the recorded SHA. security-design stance 3 requires the smoke to exit 0 before product-owner sign-off, and the component layout orders the runbook as stop, copy, migrate, restart, smoke, sign-off. | Collect product-owner sign-off only after `scripts/smoke-deploy.sh` exits 0, and state that a non-zero smoke withholds sign-off. | New |
| R-04 | Major | tests/tooling/gates.test.js > NFR3.5.2 live boundary | The live test executes `ALTER TABLE audit_log ADD COLUMN actor TEXT NOT NULL DEFAULT 'system'` and then asserts only that `scripts/smoke-deploy.sh` exits 0. The script accepts any non-empty `actor`. The column default fills an insert that never writes `actor`, so the actor check cannot fail on this fixture. Removing the actor check from the script would still exit 0 when both POSTs return 302 and the count does not drop. `code-summary.md` records this default as the way the test avoids an application actor. The unit command reported this test passed (429ms). | Run the live boundary against an `actor` column with no default, and add an assertion that fails when the script skips the actor check. | New |
| R-05 | Minor | scripts/backup-database.sh > retention prune | After a successful copy the script keeps the three lexicographically newest directories under `BACKUP_ROOT` and deletes the rest, before any smoke. security-design Q4 prunes older copies after a successful smoke, so an unproven backup does not evict a prior good copy. The newest directory, which `docs/deploy.md` uses for rollback, is retained. | Prune to three directories only after `scripts/smoke-deploy.sh` exits 0. | New |
| R-06 | Minor | eslint.config.js > tests override no-unused-vars | The single test-scoped override sets `varsIgnorePattern` to `.+`, which matches every variable name under `tests/**/*.js`. The plan's one exception is an unused binding that is a discarded response. This pattern turns `no-unused-vars` off for every test binding. `npm run lint` exits 0 with this config. | Narrow `varsIgnorePattern` to the discarded-response names the exception documents. | New |

### Validation Tool Results

| Tool | Result | Interpretation |
|---|---|---|
| required-sections (code-generation-plan.md) | PASS, h2_count 6 | Planning artifact meets the two-H2 floor. |
| required-sections (unit-test-instructions.md) | PASS, h2_count 3 | Instructions meet the two-H2 floor. |
| required-sections (code-summary.md) | PASS, h2_count 5 | Summary meets the two-H2 floor. |
| traceability | PASS, findings_count 0 | IDs and `OK` file paths resolve. The sensor checks that an `OK` target exists; it does not check that the file enforces the requirement. R-02 stands against that pass. |
| linter (`aidlc engine sensor-linter` on eslint.config.js) | PASS, errorCount 0 | Flat config loads and reports no errors for that file. |
| npm run lint | PASS, exit 0 | `eslint src tests vitest.config.js` is green, including the broad test override in R-06. |
| type-check (`aidlc engine sensor-type-check` on eslint.config.js) | exit 1, stderr `no-tsconfig-found` | This unit is JavaScript and the repo has no `tsconfig.json`. Treated as not applicable, not as a product failure. |
| Unit-scoped tests | PASS, 2 files, 15 tests | `npx vitest run tests/tooling/config.test.js tests/tooling/gates.test.js` passed, including the live smoke in R-04. |
| npx lefthook dump | pre-commit order audit, coverage, lint, secret-scan, test | Confirms R-01. Source order in `lefthook.yml` is secret-scan, lint, test, coverage, audit. |

### Summary

The packaging unit's local merge gate does not run the secret scan first and does not stop when the scan fails, and the deploy smoke can exit 0 after historical audit rows have been removed. Those two controls are the unit's reason to exist, so the generated plan and scripts are not ready to build from.
