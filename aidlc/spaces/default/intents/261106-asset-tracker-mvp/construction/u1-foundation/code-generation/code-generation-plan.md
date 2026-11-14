# Code Generation Plan — `u1-foundation`

**Unit**: Foundation  
**Kind**: `service`  
**Intent**: 261106-asset-tracker-mvp  
**Scope**: feature · **Test strategy**: standard · **Project type**: brownfield

U1 has no user stories. `unit-of-work.md` records that exclusion: acceptance comes from the foundation constraints, not from the story set. Each step below names the requirement or constraint it implements.

## Decisions locked by approving this plan

`OQ1` is still open in the inception artifacts. Approving this plan resolves it for the foundation, behind the `ActorResolver` interface from ADR-005.

- **Actor mechanism.** `src/actor.js` exports `resolveActor()` with no parameters. It reads `process.env.ASSET_ACTOR` and trims surrounding spaces. A non-empty value is the actor. An unset, empty, or whitespace-only value returns the literal `system`, the same characters as `BACKFILL_ACTOR`. The module does not import `src/domain/vocabulary.js`, so the resolver stays a leaf. It never reads a request body, query, or header. This mechanism uses no browser-attached credential, so this unit does not add CSRF handling.
- **busy_timeout.** Contract 5 requires a non-zero timeout and leaves the number open. This plan sets `5000` milliseconds once, in `openDatabase`, before migrations.
- **Existing writes keep working.** `src/repositories/assets-repo.js` still inserts `audit_log` without an actor column. The rebuilt column is `actor TEXT NOT NULL DEFAULT 'system'`. U3 must pass `resolveActor()` explicitly. This unit does not edit the repository, the routes, or the write path.

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

## Applicability

Methodology stays **test-after**. The ordering names one exception this unit owns: the two-table rebuild is written first. The concurrency-safe duplicate check is U3, not this unit.

Inapplicable layers, omitted rather than implemented empty: repository and data access (U3), API and endpoint (U5), frontend behavior (U5). No Dockerfile and no new runner. The 80% line threshold in `vitest.config.js` stays as it is.

## Steps

- [x] **Step 1 — Runner.** Confirm Vitest already runs. Record the unit command in `unit-test-instructions.md`. Do not add a runner and do not change the coverage threshold. (Testing Contract runner step)

- [x] **Step 2 — Rebuild tests first.** Write `tests/foundation/rebuild.test.js` and run it. It must fail because version 3 does not exist yet. The fixture is a temporary database at version 2 with known asset and audit rows, including a case-variant serial pair. Tests must not open `data/assets.sqlite`. (Ordering exception for the two-table rebuild; FR2 history; the migration-ordering constraint)

- [x] **Step 3 — One rebuild migration.** Add migration version 3, `foundation-rebuild`, in `src/db/migrate.js`. Leave `migrations.sql` as the historical version-1 schema. The runner gains a per-migration foreign-key window: `PRAGMA foreign_keys = OFF` before the transaction and `PRAGMA foreign_keys = ON` after it, including when the transaction throws. SQLite ignores that pragma inside a transaction, so the window stays outside `BEGIN`/`COMMIT`. (Unit-of-work implementation note)

- [x] **Step 4 — Copy, then swap, in one transaction.** Inside that transaction, with foreign keys off: copy `audit_log` into a holding table with `actor` set to `system` and the original id, asset id, action, description, and `created_at` preserved; drop `audit_log`; rebuild `assets` with `last_assigned_to`, the five status values from `STATUS_VALUES` (`in-stock`, `assigned`, `returned`, `lost`, `discarded`) as a literal `CHECK`, and no table-level `UNIQUE (category, serial_or_key)`; copy asset rows with `last_assigned_to` null; drop the old `assets`; create the final `audit_log` with `actor TEXT NOT NULL DEFAULT 'system'`, `action` constrained to `AUDIT_ACTIONS`, and `FOREIGN KEY (asset_id) REFERENCES assets(id)` with no `ON DELETE` action; copy the holding rows; drop the holding table. If a source count and a destination count differ, or serials collide under the case-insensitive index, throw before commit and name the row identifiers and the reason, so the transaction rolls back and no history is rewritten. (Audit completeness; backfill reports failure)

- [x] **Step 5 — Indexes and triggers.** Re-issue `idx_assets_status`, `idx_assets_category`, and `idx_audit_asset_recent`. Add `CREATE UNIQUE INDEX idx_assets_serial_ci ON assets (category, SERIAL_OR_KEY_INDEX_EXPRESSION)`. Add `BEFORE UPDATE` and `BEFORE DELETE` triggers on `audit_log` that abort. The foreign key has no `ON DELETE CASCADE`, so a parent delete cannot remove audit rows. The delete trigger blocks a direct audit delete. Run the Step 2 tests until they pass. (Append-only history; functional uniqueness shared with `normalizeSerialOrKey`)

- [x] **Step 6 — Connection, then its tests.** In `openDatabase`, set `busy_timeout = 5000` once, before migrations, beside the existing WAL and foreign-keys pragmas. Then write and run `tests/foundation/connection.test.js`. (Contract 5; DatabaseConnection)

- [x] **Step 7 — Actor resolver, then its tests.** Add `src/actor.js` as decided above. Then write and run `tests/foundation/actor.test.js`. (FR2.2, FR2.3, ADR-005, OQ1)

- [x] **Step 8 — Existing suite.** Run `npm test`. The current tests stay green, including inserts that omit `actor`. Do not delete a baseline test to make the new index pass. (Standing baseline)

- [x] **Step 9 — Records.** Write `source-manifest.json`, `code-summary.md`, and `traceability.json` for this unit. No repository, route, view, or deploy artifact. (Testing Contract documentation step)

## Out of scope

Asset transitions, registration, editing, uniqueness transactions, audit appends, screens, CSRF, and the concurrency test. Those are U3 and U5. This unit does not read a request-supplied actor and does not change `recordAudit`.

