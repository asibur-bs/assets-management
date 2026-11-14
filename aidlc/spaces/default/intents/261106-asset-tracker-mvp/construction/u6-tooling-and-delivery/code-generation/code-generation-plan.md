# Code Generation Plan — `u6-tooling-and-delivery`

**Unit**: Tooling and Delivery  
**Kind**: `packaging`  
**Intent**: 261106-asset-tracker-mvp  
**Scope**: feature · **Test strategy**: standard · **Project type**: brownfield

## Testing Contract

```json
{
  "version": 1,
  "methodology": "test-after",
  "source": "team",
  "ordering": "implement each applicable testable layer, then write and run that layer's tests, except that the tests are written **first** for the concurrency-safe duplicate check and for the two-table rebuild, whose tests are specified before the code that satisfies them.",
  "scope": "feature",
  "test_strategy": "standard",
  "project_type": "brownfield",
  "applicable_notes": [
    {
      "layer": "org",
      "text": "We treat tests as a first-class deliverable in every Bolt. The specific\nmethodology (TDD, BDD, ATDD, or classic test-after) is affirmed at\npractices-discovery and recorded in `team.md` under this heading with explicit\n`Methodology` and `Ordering` fields; Code Generation resolves those fields\nindependently from coverage, tooling, and scope notes.\n\nWhen no posture has been affirmed, our default per scope is:\n- **Methodology**: test-after\n- **Ordering**: implement each applicable testable layer, then write and run\n  that layer's tests.\n- `mvp`, `enterprise`, `feature`, `infra`, `classic` add an 80% line-coverage\n  floor and CI execution before merge.\n- `bugfix`, `security-patch` add a targeted regression for the specific\n  bug/vulnerability and require the existing suite to remain green.\n- `express` uses the Minimal strategy: requirement-driven unit tests (one per\n  requirement, with a happy-path floor per component); existing tests remain\n  green.\n- `poc`, `refactor`, `workshop` add no extra new-test floor and require the\n  existing suite to remain green.\n\nThe active `Test Strategy` still applies in every scope and determines test\nvolume/types. Scope floors are additive; they never reduce or replace the\nselected strategy.\n\nBuild and Test verifies defined coverage floors and affirmed quality targets;\nthey may not be weakened to make a step pass.\n\nAffirm a stricter posture in `team.md` if the team commits to one."
    },
    {
      "layer": "team",
      "text": "- **Methodology**: test-after\n- **Ordering**: implement each applicable testable layer, then write and run that layer's tests, except that the tests are written **first** for the concurrency-safe duplicate check and for the two-table rebuild, whose tests are specified before the code that satisfies them.\n\n**The two exceptions are named, and they are the only two.** Both are\nexceptions to the ordering, not to the method. The concurrency-safe uniqueness\ncheck is written test-first because the defect it guards against is a race\nthat a test written after the code will not reliably reproduce. The table\nrebuild is written test-first because its defect is silent history loss with\nthe transaction committed \u2014 the test that states the specification (\"given a\nlegacy database with N audit rows, after the rebuild, N audit rows still\nexist\") must exist before the code that could silently violate it.\n\n**Why test-after.** The methodology is `test-after` because the hardest work\nin this release is **schema and migration**, not application logic. The\n`architecture` artifact's migration-ordering constraint was discovered by\n*probing a live database*, not by writing a test first, and the `feature`\nscope's standing additions are enforcement work rather than method work.\n\n**Coverage.** We hold a **single project-wide threshold of 80% line\ncoverage**. This is one number across the tree, not a per-file floor. The\n`code-quality-assessment` artifact records that `vitest.config.js` has **no\n`coverage.thresholds` key** today, and the inline comment explains why: the\n`poc` scope had no coverage floor, so coverage was informational only. We set\n`coverage.thresholds.lines = 80` so `npm run test:coverage` can actually fail.\n\n**The floor is already met.** The measured whole-project line coverage is\n**93.38%** (`npx vitest run --coverage`: 66 passed across 5 files; `All files`\n93.38% statements and lines). The gap to the floor is 13.38 points in the\nsurplus, not a shortfall \u2014 the existing modules sit between 85.71% and 100%\neach, except `src/server.js` at 0%. The work is therefore to make the floor\n**enforceable**, not to reach it. `src/server.js` is the four-line process\nbootstrap that no test imports; it is covered by the deployment smoke test\nrather than by a unit test, and it stays inside the measured set.\n\n**The baseline is the first gate.** The `code-quality-assessment` artifact\nrecords the verified baseline of **66 passed / 66 across 5 files**\n(`tests/db.test.js` 7, `tests/assets-repo.test.js` 15, `tests/asset-service.test.js`\n18, `tests/views.test.js` 12, `tests/routes.test.js` 14), reproduced live at\nthis stage. That baseline is a **standing merge gate**: the existing suite\nmust stay green, and the newly approved behaviour gets regression tests added\nalongside it, never in place of it. The count rises from 66 with the first new\nregression test, so the durable form of the gate is \"the existing 66 tests must\nremain and pass\", not the literal number as a threshold. The\n`business-overview` and `architecture` artifacts both record that POC\nbehaviour the MVP does not explicitly cover is preserved by default.\n\n**The gaps we know about, and how we close them.** The\n`code-quality-assessment` artifact names seven test gaps that matter for the\nMVP. We close each of them as part of the work it guards, not as a separate\ntesting task. Two of them need a **named, dedicated** test rather than the\nhope that the feature work incidentally produces one:\n\n| Gap the artifact records | Closed by |\n|---|---|\n| No test asserts an audit row count | **Dedicated test.** This carries Audit Completeness, the release's primary success measure, and there is no count assertion over `audit_log` anywhere in the suite today. |\n| No test asserts audit ordering across many transitions | **Dedicated test.** A row count proves rows exist; ordering proves they are a history. This is the assertion that carries the append-only invariant. |\n| No test asserts the cascade behaviour either way | The `audit_log` rebuild \u2014 the `architecture` artifact records the legacy-migration test at `tests/db.test.js:59-93` carries no audit rows and would not have caught the cascade data loss |\n| No test asserts a case-insensitive duplicate is rejected | The functional-index uniqueness work, **written test-first** |\n| No test exercises concurrent writers | The `IMMEDIATE` transaction and `busy_timeout` work, **written test-first**. It needs a **file-backed database harness**: `:memory:` is per-connection and would not exercise locking at all. |\n| No test asserts the index list after a migration | The rebuild \u2014 the `architecture` artifact records the rebuild destroys the rebuilt table's indexes and the base SQL file is applied as migration v1 only |\n| The legacy-migration test carries no audit rows | The same rebuild work |\n\n**A migration fixture carries rows in every table it touches.** The legacy\nfixture at `tests/db.test.js:63-79` has no `audit_log` table at all, so the\nblind spot lives in the *fixture's shape* \u2014 and the fixture is the thing most\nlikely to be copied by every future migration test. A migration test must run\nagainst a database populated with audit history and assert the history survives.\n\n**Test tooling and test types.** We keep the existing toolchain: Vitest 2.1.9\nwith the V8 coverage provider and `supertest` for HTTP-level tests, exactly as\nthe `dependencies` artifact records. We keep the existing test idiom, because\nthe artifact records it as a genuine traceability asset: every spec opens a\nfresh `:memory:` database in `beforeEach` and closes it in `afterEach`, no\ntest touches the `data/` directory, seeds go through the service path rather\nthan hand-written SQL, and requirement traceability is carried inline in the\ntest code as `FR` / `NFR` markers in `it(...)` titles.\n\n**Every new test carries its requirement identifier, same as today.** The\nsuite currently references 13 distinct requirement ids; the MVP's requirement\nset is larger, and the marker is what makes a test traceable to the behaviour\nit pins. We extend the convention rather than scoping it down.\n\n**The new surfaces need their own test layers, and we name them so they are\nnot left to the 80% floor alone:**\n\n- The shared counting definition and filter builder get repository-level tests\n  asserting the four count-consuming surfaces agree with each other.\n- CSV export gets service- and route-level tests asserting the\n  formula-injection protection.\n- The actor attribution gets route-level tests asserting a request-supplied\n  actor is never trusted.\n- The four count-consuming surfaces get a **view/UI layer** of tests, because\n  the existing suite already has a presentation tier that asserts rendered\n  HTML via `data-testid`, and the MVP adds numbers to three screens.\n\n**Where the automated checks run.** We run the checks in **both** places: a\n**local pre-commit hook now**, and a **hosted pipeline before the MVP merges**.\n\nThe repository has no CI configuration and no remote configured, so the\n66-test suite is currently enforced only by whoever remembers to run it. The\nlocal pre-commit hook is the gate that works today, with no remote, no runner,\nand no platform account. The hosted pipeline is the durable gate, and the\n`feature` scope's \"CI execution before merge\" is discharged by it. **A\nconfigured git remote is a prerequisite this release must satisfy** \u2014 every\nhosted pipeline platform is pull-request-based, and none of them can run even\nonce until a remote exists.\n\nThe pipeline runs, in order: **lint \u2192 test \u2192 coverage check \u2192 dependency\naudit**. The dependency audit step is `npm audit --audit-level=high --omit=dev`,\nwhich is a blocking gate; it exits 0 today because the production dependency\ntree is clean across 113 packages. The `--omit=dev` flag is deliberate: the\nproduction closure is what ships, and the development tree is triaged\nseparately.\n\n**Supply chain.** We install with **`npm ci`**, not `npm install`, in CI, in the\ndeploy procedure, and in the documented setup path. `npm ci` installs exactly\nthe lockfile tree and fails on lockfile drift. We keep the `^` ranges in\n`package.json` rather than pinning exact versions: the lockfile already pins\nthe exact tree for every install that uses `npm ci`, and exact-version ranges\nfight the ecosystem's security-update path. Three packages execute install-time\ncode \u2014 `better-sqlite3` (production), `esbuild` and `fsevents` (development) \u2014\nand `better-sqlite3`'s install script is `prebuild-install || node-gyp rebuild\n--release`, so a failed prebuilt download silently converts a binary download\ninto a source compilation on the host. That `node-gyp` fallback is an\n**accepted, recorded risk** for a single-host internal tool, not an\neliminated one.\n\nThe pipeline's budget is dominated by dependency installation, not by the\n~1-second suite, and the runner's Node version and platform must match the\ndeploy host's so the native addon is built the same way in both places.\n\n---"
    }
  ],
  "obligations": {
    "strategy": "standard",
    "strategy_volume": [
      "Five to eight tests per component.",
      "Unit tests plus integration tests for key boundaries.",
      "Add E2E, performance, or security tests when requirements demand them."
    ],
    "scope_floor": [
      "Meet an 80% line-coverage floor.",
      "Run the selected tests in CI before merge."
    ],
    "combination_rule": "Apply every selected-strategy obligation and every scope-floor obligation; neither replaces the other, and a targeted scope regression may add the narrowest necessary test type beyond the strategy default."
  },
  "plan_profile": {
    "methodology": "test-after",
    "runner_step": "Verify the existing test runner/configuration and record the exact unit-scoped command.",
    "runner_ready_before_first_test": true,
    "testable_layers": [
      "Data model / database behavior",
      "Repository / data access",
      "Business logic",
      "API / endpoint",
      "Frontend behavior"
    ],
    "steps": [
      "Project structure and production configuration skeleton.",
      "Verify the existing test runner/configuration and record the exact unit-scoped command.",
      "Data model / database behavior - implement.",
      "Data model / database behavior - write and run its tests after implementation.",
      "Repository / data access - implement.",
      "Repository / data access - write and run its tests after implementation.",
      "Business logic - implement.",
      "Business logic - write and run its tests after implementation.",
      "API / endpoint - implement.",
      "API / endpoint - write and run its tests after implementation.",
      "Frontend behavior - implement.",
      "Frontend behavior - write and run its tests after implementation.",
      "Environment/build configuration.",
      "Documentation and traceability."
    ]
  },
  "input_sha256": "sha256:500962c1ffae261bf188401f243c6637781c98cfc46ff41cead20186f07f4d5f",
  "contract_sha256": "sha256:cae4317dec10c8dde37afaa46445ff90f5d3b9c7f5c7d55981437c63c6179eca"
}
```

## Applicability (this unit)

U6 is a **packaging** unit. It owns formatter and linter configuration, the
local pre-commit gate, the hosted pipeline file, and the deploy procedure
with its backup, smoke, and rollback steps. It owns no application runtime
and no domain component.

The contract methodology stays **test-after**. The two named test-first
exceptions (concurrency-safe duplicate check; two-table rebuild) belong to
**U3** and **U1**. They are not executed here.

Omitted layers, and why:

| Contract layer | Why it does not apply |
|---|---|
| Data model / database behavior | No schema and no migration. Backup copies an existing database file; it does not change the schema. |
| Repository / data access | No repository. |
| Business logic | No domain rule. |
| API / endpoint | No new route. The smoke script calls the existing process over HTTP. |
| Frontend behavior | No UI. `views/` and `public/` are excluded from the formatter. |

Applicable layers:

| Contract layer | What this unit does |
|---|---|
| Project structure and production configuration skeleton | Dev-only packages and npm scripts. No new production dependency. |
| Test runner | Keep Vitest. Record the unit-scoped command before the new tests. |
| Environment/build configuration | Prettier, ESLint, coverage floor, Lefthook, GitHub Actions, secret scan, backup, smoke, deploy runbook. |
| Documentation and traceability | `docs/deploy.md`, code summary, traceability, source manifest. |

The standing suite must remain and pass. At the start of this unit that suite
is the original 66 POC tests plus the 15 domain tests from U2 (81 total).
New tooling tests are added beside them. `src/server.js` stays in the measured
coverage set at 0%; the project-wide line floor is 80%, not a per-file floor.

A configured git remote is a human prerequisite. This unit authors the
workflow in the tree. It does not create the remote, and it does not treat a
live Actions run as the unit gate.

## Unit-scoped test command

```text
npx vitest run tests/tooling/config.test.js tests/tooling/gates.test.js
```

`npm test` remains the full-suite command. `npm run test:coverage` remains
the coverage command, and after this unit it fails when project-wide line
coverage is below 80%.

## Steps

### 1. Project structure — implement

- [x] Add **devDependencies** only: `prettier`, `eslint`, `@eslint/js`, and `lefthook`. Do not add a production dependency. Do not add a secret-scanner package.
- [x] Add npm scripts: `lint` scoped to `src tests vitest.config.js`; `format:check` as one Prettier glob; `secret-scan` invoking `bash scripts/secret-scan.sh`. Documented setup, CI, and deploy use `npm ci`, never `npm install`.
- [x] Do not add a Dockerfile, Compose file, or infrastructure-as-code file.

### 2. Test runner — verify, before any new test

- [x] Confirm `npx vitest run` still discovers the existing suite, and record the unit-scoped command above in `code-summary.md`.
- [x] Do not change `include` in a way that drops existing `*.test.js` files.

### 3. Environment and delivery configuration — implement

- [x] `.prettierrc.json`: `printWidth` 120, `singleQuote` true, `trailingComma` `"es5"`, `semi` true, `tabWidth` 2, `arrowParens` `"always"`, `endOfLine` `"lf"`.
- [x] `.prettierignore` excludes `views/` and `public/`. Those exclusions do not move into the npm script.
- [x] `eslint.config.js`: ESLint flat config, `@eslint/js` recommended, `strict: ['error', 'global']`, and exactly one documented exception scoped to `tests/**/*.js` for an unused binding that is a discarded response. No `eslint-disable` comments in application or test source. If `src/` fails a recommended rule, stop and report it; do not weaken the recommended set to get a green run.
- [x] `vitest.config.js`: set `coverage.thresholds.lines` to `80`. Keep the V8 provider, the text and html reporters, and `include: ['src/**/*.js']`.
- [x] `scripts/secret-scan.sh`: dependency-free, `set -eu`. Local mode reads `git diff --cached`. CI mode (`CI=true` or `GITHUB_ACTIONS=true`) reads `git diff` from `origin/$GITHUB_BASE_REF` when that ref exists, otherwise `HEAD~1` when that commit exists. A match exits 1. An empty clean diff exits 0. If git cannot produce the diff the script exits 1. Stdout and stderr name the path, the line, and a rule id. They never print the matched line or the matched secret text. Rules, all in this one script: a diff that adds `.env`, a `.pem`, or a `.key`, including a rename or copy onto that path; a line matching `AKIA[0-9A-Z]{16}`; a line matching `BEGIN (RSA |OPENSSH |EC )?PRIVATE KEY`.
- [x] `lefthook.yml` pre-commit order: numeric command names `01-secret-scan`, `02-lint`, `03-test`, `04-coverage`, `05-audit`, with `piped: true`, so Lefthook's name sort runs the secret scan first and a non-zero exit skips the rest. `package.json` `prepare` and `hooks:install` are `lefthook install`, and that command still runs when `CI=true`.
- [x] `.github/workflows/ci.yml`: one workflow. Top-level `permissions: contents: read`. `actions/setup-node` pins `node-version` to `20.20.0` (quoted string, not `20` and not `20.x`). Job order: secret scan, `npm ci`, `npm run lint`, `npm test`, `npm run test:coverage`, `npm audit --audit-level=high --omit=dev`. No `pull_request_target`. No upload of `data/`, `*.sqlite*`, `.env`, `*.pem`, or `*.key`. No credential in the workflow.
- [x] `scripts/backup-database.sh`: requires the caller to have stopped the Node process first; refuses to run when a `node src/server.js` process is still alive. Copies the database path from `DB_PATH` (default `data/assets.sqlite`) and, when present, the `-wal` and `-shm` sidecars into `<backup-root>/YYYYMMDD-HHMMSS/`. Default backup root is `backups/` under the repo, overridable by `BACKUP_ROOT`. The backup script does not prune. Never prints file contents.
- [x] `scripts/smoke-deploy.sh`: requires `SMOKE_BASE_URL` and `SMOKE_AUDIT_BASELINE`. The baseline is a JSON file written by `scripts/snapshot-audit-baseline.sh` from the pre-migrate backup, before migrations run. Registers one asset, transitions it, then fails unless those baseline rows are still present and unchanged, the latest audit actor is non-empty, and the post-deploy count is at least the baseline count plus the two rows this smoke appended. A missing baseline, or a non-zero baseline whose rows are gone, exits non-zero and does not prune. Exit 0 only when all of those checks pass. On exit 0, prune `BACKUP_ROOT` to the three newest timestamp directories. Does not invent the actor mechanism (`OQ1`): it accepts whatever non-empty actor the server stored.
- [x] `docs/deploy.md`: ordered procedure — stop the process and leave it stopped; `scripts/backup-database.sh`; snapshot that backup with `scripts/snapshot-audit-baseline.sh`; `npm ci` only after the backup exits 0; apply migrations; start the process in another session or under a supervisor (`npm start` does not return); `scripts/smoke-deploy.sh` against that live process with the baseline file; record the deployed commit SHA; product-owner sign-off only after the smoke exits 0. A non-zero smoke withholds sign-off. On smoke failure the only next action is restore the pre-migrate backup (database plus WAL and SHM), check out the previous commit, `npm ci` if needed, and restart. A failed smoke is recorded as failed and is not a successful deploy. Host Node is documented as `20.20.0`. No second host, no container, no staging split. Backups stay on the host and are not CI artifacts. Older backup directories are pruned only after the smoke exits 0.

### 4. Environment and delivery configuration — tests after implementation

- [x] `tests/tooling/config.test.js`: six to eight cases for Prettier options, the ignore file, ESLint's strict rule and single test-scoped exception, the lint script scope, the coverage threshold, and the absence of a Dockerfile.
- [x] `tests/tooling/gates.test.js`: six to eight cases for the secret scan (clean diff passes; a planted key fails and the secret text is absent from output; a scanner that cannot read git fails), Lefthook dump order with `piped: true` and a `CI=true` hook install, workflow permissions, the Node pin, `npm ci` before audit, the backup script's sidecar copy without pruning, and the smoke script's non-zero exit when `SMOKE_BASE_URL` is unset.
- [x] One integration case inside `tests/tooling/gates.test.js` starts `node src/server.js` with `PORT` and `DB_PATH` pointed at a temporary directory outside `data/`. The actor column has no default. The case asserts a non-zero exit when the actor is empty, then exit 0 when a test-local require writes a non-empty actor, and it does not modify application source. It also asserts the pre-existing audit row is unchanged, that backup directories prune to three only after exit 0, and that a baseline taken before `DELETE FROM audit_log` makes the smoke exit non-zero and skip pruning. The secret-scan case also asserts `git mv` of a tracked file onto `.env` exits 1 and does not print the file contents.
- [x] Run the unit-scoped command. Then run `npm test` and confirm the previous 81 tests still pass.

### 5. Documentation and traceability

- [x] `code-summary.md`: what was generated, the unit-scoped command, and the result of that command plus `npm test`.
- [x] `traceability.json`: one row per in-scope requirement below. Status `OK` only when the named file exists. `N/A` only for a requirement this packaging unit must not implement, with the reason in `target`.
- [x] `source-manifest.json`: every source and test file this unit adds or edits.

## Requirements this unit covers

| Id | Proof |
|---|---|
| NFR2.4.1 | `scripts/secret-scan.sh` fails closed with no scanner package, and Lefthook runs it before lint. |
| NFR2.4.2 | The same script is the first CI step; output has no secret body; the workflow uploads no secret-bearing artifact. |
| NFR2.4.3 | CI, the runbook, and setup use `npm ci`. Both gates run `npm audit --audit-level=high --omit=dev` after coverage. |
| NFR2.4.4 | Workflow `permissions` is `contents: read` only. |
| NFR2.4.5 | `node-version` is `20.20.0` in the workflow, and `docs/deploy.md` requires the same host pin. |
| NFR2.4.6 | No credential file is added. New packages are devDependencies. |
| NFR3.5.1 | `scripts/backup-database.sh` copies the database plus WAL and SHM after the process is stopped, and keeps the last three copies. |
| NFR3.5.2 | `scripts/smoke-deploy.sh` registers, transitions, checks the actor, and checks the pre-deploy audit count. |
| NFR5.1.1 | No Dockerfile, Compose file, or second-host definition. |
| NFR6.1.1 | Existing tests stay in the suite and both gates run them after lint. |
| NFR6.2.1 | `coverage.thresholds.lines` is 80, and both gates run `npm run test:coverage` before audit. |

## Non-goals

- Creating the git remote or running GitHub Actions.
- Changing application behaviour, including the actor mechanism (`OQ1`).
- The U1 table rebuild and the U3 concurrency-safe duplicate check.
- Per-file coverage floors, or removing `src/server.js` from coverage.
- `eslint-disable` comments, or a second documented ESLint exception.
