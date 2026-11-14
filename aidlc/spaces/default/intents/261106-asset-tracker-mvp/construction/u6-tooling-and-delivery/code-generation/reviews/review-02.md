## Review

**Verdict:** NOT-READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-11-14T19:26:43Z
**Iteration:** 1

### Findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| R-01 | Critical | scripts/smoke-deploy.sh > snapshotPreDeploy and main | The smoke records audit rows only after the server is already up. It has no pre-migration baseline. Against a database created by `openDatabase`, with `actor` added and zero audit rows, and with the same test-local require this unit uses to store a non-empty actor, the script exited 0, printed `smoke-deploy: ok pre=0 post=2`, and pruned `BACKUP_ROOT` from four timestamp directories to three. NFR3.5's pass/fail is that a database seeded with audit history, then migrated, still contains every seeded row. security-requirements NFR3.5.2 says a migration that quietly lost history must not report green. An empty post-migration table satisfies this script once the two smoke inserts carry an actor. `docs/deploy.md` step 6 describes that same post-start snapshot, and traceability marks NFR3.5 and NFR3.5.2 `OK`. | Capture audit row ids and content before migration, from the live database or from the backup just taken, and pass that baseline into the smoke. Fail unless those rows are still present after restart. A non-zero pre-migration count with a zero post-migration count must exit non-zero and must not prune. | New |
| R-02 | Major | scripts/secret-scan.sh > new file mode and is_secret_filename | A secret filename is reported only when the diff contains `new file mode` or `--- /dev/null`. A staged `git mv README .env` is a rename (`rename from` / `rename to`) and the script exits 0 with empty output. The plan's rule is that a diff which adds `.env`, a `.pem`, or a `.key` exits 1. The same path misses a rename onto `*.pem` or `*.key`. | Treat a rename or copy whose new path is `.env`, or ends in `.pem` or `.key`, as an added secret file. Add a regression that `git mv` of a tracked file onto `.env` exits 1 and does not print file contents. | New |
| R-03 | Major | docs/deploy.md > ## Deploy step 1 | Step 1 runs `npm ci` while the process is still up. Steps 2 and 3 then stop and back up. security-design NFR3.5.1 orders stop, then copy the database plus WAL and SHM, then `npm ci` / migrate. `npm ci` deletes `node_modules` before that stop, so a failed install happens before any backup and can disturb the live `better-sqlite3` process. | Run `npm ci` only after `scripts/backup-database.sh` has exited 0. Keep the process stopped from before the copy until the install and migration finish. | New |
| R-04 | Major | docs/deploy.md > ## Deploy step 5 | Step 5 is `PORT=3000 DB_PATH=data/assets.sqlite npm start`. `src/server.js` `app.listen` does not return. Step 6 runs the smoke as the next command in the same numbered sequence. Stopping the process to regain a shell makes the smoke fail, and the failure section then requires restoring the backup and checking out the previous commit. | State that the process stays running in another session or under a supervisor, and that the smoke runs against that live process. Do not present `npm start` as a command that returns before the smoke. | New |

### Validation Tool Results

| Tool | Result | Interpretation |
|---|---|---|
| required-sections | PASS on code-generation-plan.md (6 H2), code-summary.md (6 H2), and unit-test-instructions.md (3 H2). FAIL on code-generation-questions.md (`h2_count` 1, heading `## Plan Approval` only) | The questions file misses the generic two-H2 floor. Its only stage section is Plan Approval. That shape miss is not a product defect and does not add a finding. |
| linter | PASS. `aidlc engine sensor-linter` on `tests/tooling/gates.test.js`, `eslint.config.js`, and `vitest.config.js` returned `errorCount` 0. `npx eslint src tests vitest.config.js --max-warnings 0` exited 0 | Recommended rules plus the test-only `varsIgnorePattern` `^create$` are clean on the lint scope. |
| type-check | Script exit 1, stderr `no-tsconfig-found` | This unit ships JavaScript and the repo has no `tsconfig.json`. The dispatcher treats that script result as a non-TypeScript pass. Not a product defect. |
| traceability | PASS `findings_count` 0 | Declared ids, coverage rows, and `OK` file targets resolve. The `OK` rows for NFR3.5 and NFR3.5.2 still overclaim the smoke, which is R-01. |
| vitest | PASS. `npx vitest run tests/tooling/config.test.js tests/tooling/gates.test.js --maxWorkers=1 --no-file-parallelism` — 2 files, 15 tests passed | The live smoke case seeds one audit row, so it does not catch the empty post-migration log in R-01. |

### Summary

Formatter, lint, hook, and CI wiring match the packaging scope, and the 15 unit tests pass. The deploy smoke still exits 0 when audit history is already gone, so a migration that drops every audit row can be signed off, and the secret-scan filename rule misses a rename onto `.env`.
