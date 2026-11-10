# Team Practices — Asset Tracker MVP

> FINAL. Written by the Practices Discovery lead from the verified repository
> baseline, the six upstream reverse-engineering artifacts, three blind support
> reviews, and the human's answers to all 22 interview questions. Every
> statement below is a decision the human has made or an observation verified
> in the workspace. Nothing here is marked as undecided.

We are one developer, one location, with the full context of the Asset Tracker
POC in our heads. We are extending that POC into the Asset Tracker MVP without
discarding the parts of it that work. There is no second pair of eyes on the
code, so every practice below has to be enforceable by one person working
alone: automation and gates, not peer review.

Our governing constraint is the one the `technology-stack` artifact records:
`better-sqlite3` is a synchronous driver, so the HTTP request, the SQL, and
the render are one uninterrupted synchronous sequence. Our practices are built
around that — a check that runs in the pipeline beats a check that runs in
someone's head.

**Upstream artifacts this practice set is derived from:** `business-overview`,
`architecture`, `code-structure`, `code-quality-assessment`, `technology-stack`,
and `dependencies`. Each is named in the section that draws on it.

---

## Way of Working

We work trunk-based, on a single branch.

**The trunk is `main`, and we rename it from `master` before the MVP work
starts.** The organisation-wide default names the trunk `main`, and the
repository's only branch today is `master`. The human has decided to rename it
as the first act of this release, so every document, script, and CI
configuration in the MVP names `main`. The `code-structure` artifact records a
single-package repository with strictly downward dependencies and no cycles, so
there is nothing in the architecture that needs an integration branch to hold
separate work apart.

**We squash-merge feature branches into `main`.** Each merged body of work
becomes one commit on the trunk, named after what it delivers, with the full
commit history preserved on the source branch until the branch is discarded.
This gives us a linear `main` history that maps one-to-one onto the delivery
sequence, and we accept losing the intermediate commits on the trunk because
the audit log preserves the full event sequence anyway.

**Where the merge actually happens.** `git remote -v` is empty — no remote is
configured — so there is no server-side merge to trigger. "Squash-merge" is
therefore, in practice, "do not create a merge commit": the feature branch's
commits are collapsed before the branch lands, or the branch is merged
fast-forward and the intermediate commits live only in the branch's reflog. We
state this so the practice is executable rather than aspirational.

**Commit granularity.** We commit at the granularity of a reviewable unit of
work, and we keep the commit subject in the imperative mood. This is a **new**
convention, not a match to the existing history: the three application commits
are `Initial Commit`, `Second Commit`, and `Third Commit`, which are neither
imperative nor descriptive of content. Only the later workflow commits are
imperative. We are establishing the convention from here on.

**A behaviour change and its proof land in the same commit. Never split them.**
This is the discipline that makes the trunk safe. The `architecture` artifact
records that the `DROP TABLE assets` ordering **destroys every audit row
silently, with the transaction committed and no error raised**. A commit that
lands the rebuild migration without the audit-row assertion is a commit that
ships a silent data-loss path. The same rule applies to any behaviour change
whose defect is silent.

**The foundation workstream is one indivisible unit.** The actor decision, the
`audit_log` rebuild, and the `assets` rebuild are never split across commits
that are individually deployable — a commit that rebuilds `assets` without
rebuilding `audit_log` first destroys the audit history. A commit is only
finished when the tree is in a state that could be deployed.

**Commit evidence.** `git rev-list --count HEAD` returns **11** commits, every
one by a single author (`asibur-bs`), all landing directly on `master` with no
merge commits and no pull-request review. The history is already trunk-shaped.
What it lacks is *enforcement* — nothing in the repository forces the next
commit to pass the tests.

---

## Walking Skeleton

We do **not** run a walking skeleton ceremony for this initiative.

The scope does not declare `skeleton: on`, and the org rule is explicit:
select the walking skeleton only when the active scope declares it. The
verified baseline also gives a concrete reason beyond the rule. A walking
skeleton is a minimal end-to-end slice built first to prove the whole system
works. We already have the end-to-end system — the `architecture` artifact
records a working three-layer monolith with a closed state machine, an audit
trail, an HTTP surface, and a live 66/66 test baseline. What we do not have
is the *foundation* the MVP needs: the `audit_log` rebuild with an actor
column, the widened `assets` status check, `last_assigned_to`, and the
case-insensitive functional unique index.

A walking skeleton here would mean deliberately building a second, throwaway
end-to-end path through a schema that we already know must be rebuilt. The
`architecture` artifact records that the only migration ordering that preserves
audit history is a specific four-step sequence with a controlled
`foreign_keys` pragma window; a skeleton would have to either avoid that
sequence or exercise it twice.

**What we do instead is the foundation workstream, built and verified end to
end.** The actor identity decision and the two table rebuilds are a hard
predecessor of every other capability, and the four count-consuming surfaces
(dashboard, assignee directory, asset list, CSV export) form a second
indivisible group. Because we run with construction checkpoints enabled, the
foundation workstream itself acts as the walking slice: it is the smallest
change that proves the audit properties end to end, and it is the first thing
we build and verify.

---

## Testing Posture

- **Methodology**: test-after
- **Ordering**: implement each applicable testable layer, then write and run that layer's tests, except that the tests are written **first** for the concurrency-safe duplicate check and for the two-table rebuild, whose tests are specified before the code that satisfies them.

**The two exceptions are named, and they are the only two.** Both are
exceptions to the ordering, not to the method. The concurrency-safe uniqueness
check is written test-first because the defect it guards against is a race
that a test written after the code will not reliably reproduce. The table
rebuild is written test-first because its defect is silent history loss with
the transaction committed — the test that states the specification ("given a
legacy database with N audit rows, after the rebuild, N audit rows still
exist") must exist before the code that could silently violate it.

**Why test-after.** The methodology is `test-after` because the hardest work
in this release is **schema and migration**, not application logic. The
`architecture` artifact's migration-ordering constraint was discovered by
*probing a live database*, not by writing a test first, and the `feature`
scope's standing additions are enforcement work rather than method work.

**Coverage.** We hold a **single project-wide threshold of 80% line
coverage**. This is one number across the tree, not a per-file floor. The
`code-quality-assessment` artifact records that `vitest.config.js` has **no
`coverage.thresholds` key** today, and the inline comment explains why: the
`poc` scope had no coverage floor, so coverage was informational only. We set
`coverage.thresholds.lines = 80` so `npm run test:coverage` can actually fail.

**The floor is already met.** The measured whole-project line coverage is
**93.38%** (`npx vitest run --coverage`: 66 passed across 5 files; `All files`
93.38% statements and lines). The gap to the floor is 13.38 points in the
surplus, not a shortfall — the existing modules sit between 85.71% and 100%
each, except `src/server.js` at 0%. The work is therefore to make the floor
**enforceable**, not to reach it. `src/server.js` is the four-line process
bootstrap that no test imports; it is covered by the deployment smoke test
rather than by a unit test, and it stays inside the measured set.

**The baseline is the first gate.** The `code-quality-assessment` artifact
records the verified baseline of **66 passed / 66 across 5 files**
(`tests/db.test.js` 7, `tests/assets-repo.test.js` 15, `tests/asset-service.test.js`
18, `tests/views.test.js` 12, `tests/routes.test.js` 14), reproduced live at
this stage. That baseline is a **standing merge gate**: the existing suite
must stay green, and the newly approved behaviour gets regression tests added
alongside it, never in place of it. The count rises from 66 with the first new
regression test, so the durable form of the gate is "the existing 66 tests must
remain and pass", not the literal number as a threshold. The
`business-overview` and `architecture` artifacts both record that POC
behaviour the MVP does not explicitly cover is preserved by default.

**The gaps we know about, and how we close them.** The
`code-quality-assessment` artifact names seven test gaps that matter for the
MVP. We close each of them as part of the work it guards, not as a separate
testing task. Two of them need a **named, dedicated** test rather than the
hope that the feature work incidentally produces one:

| Gap the artifact records | Closed by |
|---|---|
| No test asserts an audit row count | **Dedicated test.** This carries Audit Completeness, the release's primary success measure, and there is no count assertion over `audit_log` anywhere in the suite today. |
| No test asserts audit ordering across many transitions | **Dedicated test.** A row count proves rows exist; ordering proves they are a history. This is the assertion that carries the append-only invariant. |
| No test asserts the cascade behaviour either way | The `audit_log` rebuild — the `architecture` artifact records the legacy-migration test at `tests/db.test.js:59-93` carries no audit rows and would not have caught the cascade data loss |
| No test asserts a case-insensitive duplicate is rejected | The functional-index uniqueness work, **written test-first** |
| No test exercises concurrent writers | The `IMMEDIATE` transaction and `busy_timeout` work, **written test-first**. It needs a **file-backed database harness**: `:memory:` is per-connection and would not exercise locking at all. |
| No test asserts the index list after a migration | The rebuild — the `architecture` artifact records the rebuild destroys the rebuilt table's indexes and the base SQL file is applied as migration v1 only |
| The legacy-migration test carries no audit rows | The same rebuild work |

**A migration fixture carries rows in every table it touches.** The legacy
fixture at `tests/db.test.js:63-79` has no `audit_log` table at all, so the
blind spot lives in the *fixture's shape* — and the fixture is the thing most
likely to be copied by every future migration test. A migration test must run
against a database populated with audit history and assert the history survives.

**Test tooling and test types.** We keep the existing toolchain: Vitest 2.1.9
with the V8 coverage provider and `supertest` for HTTP-level tests, exactly as
the `dependencies` artifact records. We keep the existing test idiom, because
the artifact records it as a genuine traceability asset: every spec opens a
fresh `:memory:` database in `beforeEach` and closes it in `afterEach`, no
test touches the `data/` directory, seeds go through the service path rather
than hand-written SQL, and requirement traceability is carried inline in the
test code as `FR` / `NFR` markers in `it(...)` titles.

**Every new test carries its requirement identifier, same as today.** The
suite currently references 13 distinct requirement ids; the MVP's requirement
set is larger, and the marker is what makes a test traceable to the behaviour
it pins. We extend the convention rather than scoping it down.

**The new surfaces need their own test layers, and we name them so they are
not left to the 80% floor alone:**

- The shared counting definition and filter builder get repository-level tests
  asserting the four count-consuming surfaces agree with each other.
- CSV export gets service- and route-level tests asserting the
  formula-injection protection.
- The actor attribution gets route-level tests asserting a request-supplied
  actor is never trusted.
- The four count-consuming surfaces get a **view/UI layer** of tests, because
  the existing suite already has a presentation tier that asserts rendered
  HTML via `data-testid`, and the MVP adds numbers to three screens.

**Where the automated checks run.** We run the checks in **both** places: a
**local pre-commit hook now**, and a **hosted pipeline before the MVP merges**.

The repository has no CI configuration and no remote configured, so the
66-test suite is currently enforced only by whoever remembers to run it. The
local pre-commit hook is the gate that works today, with no remote, no runner,
and no platform account. The hosted pipeline is the durable gate, and the
`feature` scope's "CI execution before merge" is discharged by it. **A
configured git remote is a prerequisite this release must satisfy** — every
hosted pipeline platform is pull-request-based, and none of them can run even
once until a remote exists.

The pipeline runs, in order: **lint → test → coverage check → dependency
audit**. The dependency audit step is `npm audit --audit-level=high --omit=dev`,
which is a blocking gate; it exits 0 today because the production dependency
tree is clean across 113 packages. The `--omit=dev` flag is deliberate: the
production closure is what ships, and the development tree is triaged
separately.

**Supply chain.** We install with **`npm ci`**, not `npm install`, in CI, in the
deploy procedure, and in the documented setup path. `npm ci` installs exactly
the lockfile tree and fails on lockfile drift. We keep the `^` ranges in
`package.json` rather than pinning exact versions: the lockfile already pins
the exact tree for every install that uses `npm ci`, and exact-version ranges
fight the ecosystem's security-update path. Three packages execute install-time
code — `better-sqlite3` (production), `esbuild` and `fsevents` (development) —
and `better-sqlite3`'s install script is `prebuild-install || node-gyp rebuild
--release`, so a failed prebuilt download silently converts a binary download
into a source compilation on the host. That `node-gyp` fallback is an
**accepted, recorded risk** for a single-host internal tool, not an
eliminated one.

The pipeline's budget is dominated by dependency installation, not by the
~1-second suite, and the runner's Node version and platform must match the
deploy host's so the native addon is built the same way in both places.

---

## Deployment

We deploy the MVP to the **same single internal host** the POC runs on today,
as the upstream feasibility stage confirmed: a long-running Node process with a
machine-local SQLite file, launched with `PORT` and `DB_PATH` overrides. The
`technology-stack` artifact records that there is no container definition, no
infrastructure-as-code, and no deployment configuration of any kind — only the
local `npm install` / `npm start` / `npm test` sequence the `README.md`
documents (we change that sequence to `npm ci`). The `dependencies` artifact
records that the application makes no outbound network requests, holds no
credentials, and needs no secret store, so there is no environment-specific
secret wiring to design.

**We deploy on merge to the single host, and every deployment is preceded by
the passing test suite.** We are not introducing a staging environment: the
feasibility stage recorded that **no dev/staging/prod split exists today**, and
that splitting a single-host SQLite deployment into three would multiply the
migration-ordering risk for no operational gain at this scale. One environment,
one target, and a gate before the deploy.

**Schema changes follow the expand-contract pattern, with one hard exception
this release forces on us.** The `architecture` artifact records that the MVP
requires a `CHECK` constraint change (the new `discarded` status) and a
foreign-key change (dropping the `ON DELETE CASCADE` on `audit_log`), and that
**SQLite cannot amend either in place** — `ALTER TABLE … DROP CONSTRAINT` fails
with `near "CONSTRAINT": syntax error`. A table rebuild is therefore mandatory
for both tables.

Two consequences bind our deployment practice for this release:

1. **The migration must control the `foreign_keys` pragma explicitly.**
   `src/db/index.js:16` sets `foreign_keys = ON` at open time, but
   `applyMigrations` can and does run against a raw handle where foreign keys
   are off. The rebuild needs foreign keys off during the drop window and on
   afterwards, and the current runner has no per-migration pragma window. The
   rebuild migration therefore carries its own pragma window, and the runner is
   changed to support one.
2. **The rebuild drops the indexes on the rebuilt table.** `migrations.sql` uses
   `CREATE INDEX IF NOT EXISTS`, but that file is applied as migration v1 only,
   so the new migration must re-issue the index DDL itself. The artifact
   records that after a full rebuild the index list is empty.

**The general rule.** A table with a cascading reference must never be dropped
while the referencing rows exist. This applies to every schema change in this
repository, not only to the MVP's rebuild.

**Our practice on the deploy is: install with `npm ci`, back up the database,
apply migrations, restart the process, then smoke-test.**

**The backup must be WAL-aware.** `src/db/index.js:15` sets
`journal_mode = WAL`, so committed rows can still be sitting in the
`*.sqlite-wal` sidecar file next to the main database. Copying only the main
file while the process is running can capture an incomplete snapshot — exactly
the case the backup exists to cover. The backup therefore either **stops the
process** or **uses the database's own backup mechanism**, so that no committed
row is missed.

The backup is not ceremony. The `architecture` artifact records that the
`DROP TABLE assets` ordering **destroys audit history silently, with the
transaction committed and no error raised** — the failure mode is invisible,
which is exactly the failure mode a backup exists to absorb. And the operation
phase's rollback requirement gives the backup its purpose: the MVP's own
invariant is that the asset row and its full history are never destroyed.

**Smoke test.** A deployment is not finished when the process starts. The
smoke test exercises the MVP's own success measure — Audit Completeness, that
100% of audit entries carry an actor attribution and history is never
destroyed — by registering an asset, transitioning it, and confirming the audit
entry carries an actor and that the pre-deploy row count is intact. A
deployment that starts the process but does not pass this smoke test is rolled
back, not reported as successful.

**Rollback.** Our rollback is restoring the database from the pre-deploy backup
and restarting the previous commit. It is a manual procedure, and it is
documented rather than automated, because there is exactly one host and one
database — a scripted rollback that ran unattended could not distinguish "the
deploy failed" from "the rollback failed". The procedure has to be written down
and exercised, because the `architecture` artifact records that the failure it
protects against raises no error.

**Sign-off is required for every deploy to the host, not only for
schema-carrying deploys.** The single host is where the stakeholders use the
system, so every deploy needs the product owner's sign-off. On a
schema-carrying deploy the product owner signs off **on its own**; the
reviewers are not authors and are consulted at defined points, not
continuously. The reviewer individuals are not yet named — we record the
**role**, not a name.

**The deploy records the commit SHA it deployed**, so the code on the host can
be tied to the code that was tested.

**Bind address.** `app.listen(PORT, ...)` in `src/server.js:14` binds
`0.0.0.0`, not `127.0.0.1`. On a single-host internal deployment we state the
bind address explicitly rather than inheriting it by accident: the deployment
is an internal tool, and whether all-interfaces is intended is recorded here as
a deliberate position to be confirmed against the host's network.

**Header hardening.** `x-powered-by: Express` leaks on every response today,
and no `X-Content-Type-Options` is set. We disable `x-powered-by` and set
`X-Content-Type-Options: nosniff`. The `nosniff` header and the CSV export's
content type are one control, not two: a CSV served without `nosniff` and
without a correct `Content-Type` can be sniffed by the browser as HTML.

**The dependency audit gate.** `npm audit --audit-level=high --omit=dev` is a
blocking merge gate. It exits 0 today: the production tree reports **0
vulnerabilities across 113 packages**. The `--omit=dev` flag is deliberate —
the production closure is what ships, and the development tree is triaged
separately.

**Secrets.** The application holds no credentials and makes no outbound network
calls. This is a property to be **preserved**, not a starting state to be
improved. If the actor-identity mechanism introduces a credential, a token, a
session signing key, or any outbound call, that change is security-relevant:
it requires the audit gate to pass and must not introduce a committed secret
file. `.env`, `*.pem`, and `*.key` are never tracked, and a dependency-free
pre-commit secret scan over the staged diff covers MCP server registrations in
`.mcp.json` as well as application files.

**CSRF is conditional on the mechanism.** There is no session and no cookie
today, so there is no credential to abuse and the classic CSRF attack does not
apply. But if the actor mechanism turns out to be a cookie, a session, or any
other browser-attached credential, CSRF becomes a live attack — and one that
corrupts the attribution record the MVP's primary success measure depends on.
**If and only if** the chosen mechanism relies on a browser-attached
credential, the write path must reject state-changing requests that do not
carry a recognised origin, or must carry a CSRF token, and a route-level test
asserts that a state-changing POST without it is rejected.

**The procedure above is documented but untested.** This stage did not execute
it end to end against a live copy of the database. The `architecture`
artifact's verified ordering is the evidence, and that ordering was probed live
at scan time — but the procedure as described here has not been run.

---

## Code Style

We defer to the project's linter and formatter configuration — and **we have
to create that configuration first**, because it does not exist.

The org rule is to defer to project-level configurations: Prettier for
JavaScript, ESLint for linting, `gofmt` for Go, and so on, with the
configuration living in the repository root. The `technology-stack` artifact
records that this repository has **no ESLint, Prettier, StandardJS, or Biome
configuration, no `.eslintrc*`, no `eslint.config.*`, no `.prettierrc*`, no
`.prettierignore`, and no lint dependency in `package.json`** — and no `lint`
script in the scripts block. The `code-structure` artifact records the same
absence from the other direction: the style is *self-consistent by convention*
— 2-space indent, single quotes, semicolons, uniform across all twelve source
files — but **there is no formatter configuration, so the style is convention
rather than tooling**.

So the org rule currently has nothing to defer to. Adding a linter and a
formatter configuration is **new capability work**, and it is estimated as
such. The `architecture` artifact's opportunity O9 says the same thing.

**What we adopt.** We adopt Prettier for formatting and ESLint for linting,
because they are the org rule's named defaults for JavaScript.

**Prettier.** The existing code is **not** Prettier-clean: all 14 tracked JS
files fail `prettier --check`. The gap is `printWidth` — the codebase is
hand-formatted at roughly 120 columns and Prettier's default is 80 — plus about
120 lines of mechanical re-layout (the single-line `catch` idiom, the
template-literal hug, a handful of long conditions, and missing trailing
newlines). We set the formatter to **120 columns to match the existing code**,
so adoption stays a configuration change plus a mechanical re-layout rather
than a stylistic rewrite.

The configuration is `singleQuote: true`, `printWidth: 120`,
**`trailingComma: "es5"`**, `semi: true`, `tabWidth: 2`, `arrowParens:
"always"`, `endOfLine: "lf"`. The `trailingComma` value is `"es5"` and not
`"all"` because the codebase uses trailing commas in object and array literals
but **not** in function call arguments — `"all"` would reformat every
multi-line call in the repository.

**ESLint.** We adopt the **recommended rule set**, with exactly **one
documented exception scoped to test files**. It was verified that
`js.configs.recommended` passes `src/` cleanly and fires on exactly one rule
(`no-unused-vars`) in 13 sites, all in `tests/`, all of the same shape — a
deliberately discarded response — which a config-level test override handles
without touching a line of code. We add `strict: ['error', 'global']`, because
`'use strict';` is the first line of all 14 tracked JS files and is the only
universal, mechanically enforceable convention in the repository. We leave
`require-atomic-updates` explicitly off, because the application is fully
synchronous and the rule is a false-positive generator here. The linter
configuration also carries the **security rules** — the SAST value rides in the
same config and the same pipeline step rather than in a parallel scanner.

**The scripts.** We add `lint`, `lint:fix`, `format`, and `format:check`, and a
combined `check` that runs lint, format check, and coverage. Their scope is
deliberate and narrow:

- `lint` is scoped to **`src tests vitest.config.js`**, so it does not lint the
  `aidlc/`, `.claude/`, and `.puku-cli/` workflow tooling, which is not
  application source.
- `format:check` **excludes `views/`** (Prettier cannot parse EJS — it fails
  with "No parser could be inferred", and forcing the HTML parser fails on
  EJS interpolation inside a tag attribute) **and excludes `public/`** (the
  stylesheet uses one-line rules and Prettier would rewrite all 45 lines as 200).
  A `.prettierignore` carrying those paths is the expression of the rule, so
  the script itself stays a single glob and cannot drift.

**The configuration lands as its own first commit, before any MVP work.** A
formatting-only change is far easier to read on its own than the same change
mixed in with a table rebuild.

**What we preserve.** The `code-structure` artifact records several repo-wide
conventions that are not the formatter's business and that we keep:

- **The error contract.** Errors are `Error` instances carrying a `code`
  property drawn from `VALIDATION_ERROR`, `DUPLICATE_ASSET`, `NOT_FOUND`,
  `INVALID_TRANSITION`, `INVALID_STATE`. The Express error middleware is the
  single translation point from domain error to HTTP status. **Tests assert on
  `err.code`, never on the message** — the artifact records that
  `tests/assets-repo.test.js:7-12` documents this as a contract: "the message
  is human-facing prose and is not part of the contract". We keep the codes and
  we keep the assertion discipline.
- **The error vocabulary gains a retryable code.** None of the five current
  codes is retryable, and the MVP's standing condition requires one. The
  MVP's `SQLITE_BUSY` mapping depends on a retryable domain error existing.
- **Every code in the vocabulary must be mapped in the error middleware.**
  `INVALID_STATE` is thrown but is not in the middleware's handled set today, so
  an unknown-state asset surfaces as a 500 rather than a 400. The MVP widens the
  status set, which increases the chance of another unmapped state.
- **Layering, with one new leaf.** `routes → services → repositories → db`,
  strictly downward, no cycles, no upward imports. The MVP adds one new
  layer — **`src/domain/`** — that owns the shared domain vocabulary: the
  status set, the transition table, the loss-reason vocabulary, the uniqueness
  comparison predicate, and the shared count/filter definition. It is a leaf:
  it depends on nothing but `node:` built-ins, and every other layer may
  import it. It must not import from `services/`, `repositories/`, `routes/`,
  or `db/`. The current code has no such layer, which is *why* the vocabulary
  is duplicated six times (schema `CHECK`, repository `Set`, service
  `TRANSITIONS`, list filter `<select>`, detail action forms, stylesheet
  `.status-*` tokens) — `ALLOWED_STATUSES`, `ALLOWED_CATEGORIES`, and
  `TRANSITIONS` are exported today with zero consumers.
- **A shared vocabulary a template renders arrives as render data.** EJS
  cannot `require` JavaScript, so the status `<option>` list at
  `views/list.ejs:10-16` and the per-status action forms at
  `views/detail.ejs:26-49` become loops over the shared vocabulary supplied by
  the route. The template keeps no literal copy.
- **One transaction per transition.** In a synchronous driver a `try/catch`
  around two statements is **not** a rollback: a throw between the asset write
  and the audit write leaves the asset updated and the audit row missing. The
  asset write and its audit write are one transaction, for Audit Completeness
  to be achievable.
- **The SQL style.** All queries are prepared statements with `?`
  placeholders. Dynamic SQL is limited to a `WHERE` clause assembled from fixed
  fragments with bound arguments, and a sort column whitelisted to a literal.
  **We never interpolate a user value into SQL.** The prepared-statement rule
  is the SQL-injection control and is mandatory, not a convention.
- **One shared CSV export-escaping function, applied to every string cell.** A
  CSV cell is interpreted as a formula by Excel, LibreOffice Calc, and Google
  Sheets when its content begins with `=`, `+`, `-`, `@`, or a leading tab or
  carriage return. The export prefixes every such cell with a single quote
  before quoting, applied to **all** string cells — not a selected subset of
  columns — because `name` and `notes` are user-typed free text and the
  property that gets lost when someone adds a column later is exactly the
  "all cells" property. The protection lives in one shared function used by
  the CSV writer; it is not reimplemented per column or per surface. A
  regression test asserts that a cell beginning with `=` is exported with the
  prefix and that a benign cell is exported unchanged.
- **The actor-trust rule.** The actor is resolved by the server from a context
  the client cannot influence. A request-supplied actor is **ignored** — not
  rejected, not sanitised, ignored — and the server-side value is used. **No
  client-settable field or header may be the actor's source**: not a request
  body field, not a query-string parameter, not a header the client can set
  directly. This constrains the outcome of the still-open mechanism decision
  without choosing the mechanism, and it is verified by route-level tests that
  assert a request-supplied actor is never trusted. The actor decision and the
  `audit_log` rebuild are one indivisible workstream: `audit_log` has no actor
  column today and `recordAudit` takes no actor parameter, so the rule cannot
  be implemented as a code change alone.
- **Append-only is enforced by the database, not by application code.** An
  `UPDATE` against `audit_log` succeeds today, so append-only is a convention
  one line of code breaks. Two SQLite triggers — `BEFORE UPDATE` and
  `BEFORE DELETE` — make it a guarantee. Both were verified to work, and the
  `BEFORE DELETE` trigger additionally blocks the cascading delete of a parent
  asset row. The triggers are installed by the same migration that rebuilds
  `audit_log` for the actor column.
- **The timestamp format.** Timestamps come from SQLite, not JavaScript, and
  are ISO-8601 with millisecond precision and a `Z` suffix.
- **The view idiom.** EJS templates include `_header` / `_footer` rather than a
  shared layout, and all user-supplied values are interpolated with `<%= %>`
  (escaped), never `<%- %>` (unescaped). **The `<%= %>` rule is the XSS
  control** — it must hold for the MVP's new surfaces, all of which render
  user-controlled strings. The dead `views/_layout.ejs` uses `<%- body %>` for
  a value that does not exist, so the MVP's new templates must not copy that
  pattern.
- **The `data-testid` convention.** Interactive elements carry a `data-testid`
  so the HTTP and view tests can assert on structure without brittle
  selectors. The `views` tests depend on it.
- **The comment discipline.** Comments explain *why*, not *what*. The
  `code-structure` artifact records that there are **zero `TODO`, `FIXME`, or
  `HACK` markers and zero lint-suppression comments** across `src/`, `tests/`,
  `views/`, and `public/`. We do not introduce the first ones, and we do not
  add an `eslint-disable` to silence a rule — if a rule is wrong for this
  codebase, we change the rule's configuration, not the code.
- **`'use strict';` as the first line of every JS file**, and the
  `module.exports = { … }` named-object shape — with one deliberate exception
  at `src/routes/assets.js:94`, which exports a bare function. One consistent
  shape with one stated exception is a convention; we record the exception
  rather than normalising it in this release.

**Naming.** We use language-idiomatic naming — camelCase for JavaScript
identifiers and functions, snake_case for database columns. The one
inconsistency the `code-quality-assessment` artifact flags is the audit action
vocabulary: the action string is hyphenated (`mark-lost`) while the service
function is camelCase (`markLost`) and the description-builder key is
`markLost`. The MVP adds a `recovered` action and a `discarded` action, so we
**choose the hyphenated-string convention for audit action values** — the
values are data, they appear in the database and in the audit vocabulary
section of the workbook, and hyphenated is what the existing data uses. We do
not rename the existing four values.

**Two files are undecided, and we flag them so a tooling sweep does not remove
them accidentally.** `views/_layout.ejs` is dead code (nothing includes it) and
`README.MD` is a 17-byte case-differing duplicate of `README.md`. Both are
pre-existing, trivially removable, and unrelated to the MVP. `README.MD` and
`README.md` differ only in case, which is a hazard on a case-insensitive
filesystem. We have not decided whether they are removed in this release.

### What we did not adopt, and why

We did not adopt a pull-request review requirement, because there is no second
author and no second reviewer in the confirmed roster — a required review that
nobody can perform is a gate that either blocks the work or gets waived on
every merge, and either way it protects nothing. The `team-formation`
artifacts record the three review points that do exist, and they are about
decisions and demonstrations, not about approving code.

We did not adopt a staging environment, because the deployment target is a
single host and the operation phase's rollback requirement is discharged by a
verified backup-and-restore procedure rather than by a second environment.

We did not adopt a canary or blue/green rollout, because there is one
instance, one database file, and no traffic-shifting layer. The
`deployment-strategies` guidance's own precondition — a load balancer or DNS
in front of two instances — does not exist here, and inventing one to satisfy
a strategy would be more work than the rollout it protects.

We did not adopt a feature-flag service, because the MVP's scope is a fixed
release and the `business-overview` artifact records that the five new
surfaces are greenfield capabilities delivered in one release rather than
rolled out gradually behind flags.

---

## Security

> **Promotion note.** The promotion tool replaces only the five team sections
> (`## Way of Working`, `## Walking Skeleton`, `## Testing Posture`,
> `## Deployment`, `## Code Style`) and appends only `discovered-rules.md`'s
> rules to `project.md`. A sixth section here is therefore a reading
> convenience: **the canonical copy of every rule below is duplicated into
> `## Code Style`, `## Deployment`, and `discovered-rules.md`**, which is where
> it survives promotion. This section is the single place a human reads the
> security posture as a whole.

The three MVP security obligations are code-and-test obligations that happen
to have a deployment consequence. They live here, not under `## Deployment`.
The `architecture` artifact records that the codebase has no identity
provider, no session, no cookie handling, and no outbound network call — a
fact about this codebase, not a finding about the organisation.

**The actor-trust rule.** The actor is resolved by the server from a context
the client cannot influence. A request-supplied actor is **ignored** — not
rejected, not sanitised, ignored — and the server-side value is used. **No
client-settable field or header may be the actor's source**: not a request
body field, not a query-string parameter, not a header the client can set
directly. This constrains the outcome of the still-open mechanism decision
(I-01 / I-03) without choosing the mechanism, and it is compatible with all
four candidates. It is verified by route-level tests that assert a
request-supplied actor is never trusted.

**The actor decision and the `audit_log` rebuild are one indivisible
workstream.** `audit_log` has no actor column today (`id, asset_id, action,
description, created_at`) and `recordAudit` takes no actor parameter, so the
actor-trust rule cannot be implemented as a code change alone — it requires
the same table rebuild. A clean shape that is compatible with every candidate:
the router resolves the actor once from trusted context and passes it down
through the service to the repository, so there is exactly one resolution point.

**Append-only is enforced by the database, not by application code.** Append-only
is currently a convention that one line of code breaks: an `UPDATE` against
`audit_log` succeeds today. Two SQLite triggers — `BEFORE UPDATE` and
`BEFORE DELETE` — make it a guarantee. Both were verified to work, and the
`BEFORE DELETE` trigger additionally blocks the cascading delete of a parent
asset row, because the cascade executes as an implicit delete on the child
table and the trigger intercepts it. The triggers are installed by the same
migration that rebuilds `audit_log` for the actor column; they are not
retrofitted afterwards.

**Named escaping rules — these are security controls, not style.** The
prepared-statement rule is the SQL-injection control and the `<%= %>` escaping
rule is the stored-XSS control. Both are **mandatory and named** rather than
conventions, and both must hold for the MVP's new surfaces.

**One shared CSV export-escaping function, applied to every string cell.** A
CSV cell is interpreted as a formula by Excel, LibreOffice Calc, and Google
Sheets when its content begins with `=`, `+`, `-`, `@`, or a leading tab or
carriage return. The export prefixes every such cell with a single quote
before quoting, applied to **all** string cells — not a selected subset of
columns — because `name` and `notes` are user-typed free text and the property
that gets lost when someone adds a column later is exactly the "all cells"
property. The protection lives in one shared function used by the CSV writer;
it is not reimplemented per column or per surface. A regression test asserts
that a cell beginning with `=` is exported with the prefix and that a benign
cell is exported unchanged.

**Secrets.** The application holds no credentials and makes no outbound network
calls. This is a property to be **preserved**, not a starting state to be
improved. If the actor-identity mechanism introduces a credential, a token, a
session signing key, or any outbound call, that change is security-relevant:
it requires the audit gate to pass and must not introduce a committed secret
file. `.env`, `*.pem`, and `*.key` are never tracked. A dependency-free
pre-commit secret scan over the staged diff covers MCP server registrations in
`.mcp.json` as well as application files.

**CSRF is conditional on the mechanism.** There is no session and no cookie
today, so there is no credential to abuse and the classic CSRF attack does not
apply. But if the actor mechanism turns out to be a cookie, a session, or any
other browser-attached credential, CSRF becomes a live attack — and one that
corrupts the attribution record the MVP's primary success measure depends on.
**If and only if** the chosen mechanism relies on a browser-attached
credential, the write path must reject state-changing requests that do not
carry a recognised origin, or must carry a CSRF token, and a route-level test
asserts that a state-changing POST without it is rejected.

**The dependency audit gate.** `npm audit --audit-level=high --omit=dev` is a
blocking merge gate. It exits 0 today: the production tree reports **0
vulnerabilities across 113 packages**. The development toolchain carries **10
findings (3 critical, 1 high, 6 moderate)**, all in the Vitest 2.x tree
(`vitest`, `@vitest/coverage-v8`, `tinypool`, `vite`, and their transitive
dependencies). No runtime package is affected. The fix is two semver majors
across, which would change coverage semantics and perturb the baseline the
whole release is gated on, so it is a **named follow-on** with its two risks
named: globals-under-CommonJS behaviour, and the coverage-threshold semantics
the 80% floor depends on. We do not upgrade Vitest in this release.

### The security tooling we adopt — and what we reject

We adopt the **small set that fits this project**: the production-dependency
audit, a dependency-free secret scan before each commit, and the linter's
security rules.

We explicitly **reject** the following, so their absence reads as a decision
rather than an oversight:

- **A standalone SAST product** (Semgrep, CodeQL, Fortify). The codebase has no
  SQL injection, command execution, deserialisation, template injection,
  authentication, or crypto code — each sink was checked for specifically.
  There is nothing for a SAST product to find that the targeted ESLint rules
  will not find, and a first-run report of hundreds of findings is a report a
  single developer learns to ignore.
- **DAST.** The application has no authentication and no session, so almost
  every meaningful DAST check is inapplicable. The two classes that would
  apply — CSRF and header hardening — are better handled by construction than
  by scanning: assert the absence of `x-powered-by` and the presence of the
  headers we want in a `supertest` test.
- **Container image scanning.** There is no `Dockerfile`, no `docker-compose.yml`,
  and no container definition anywhere. Scanning an image that does not exist
  is theatre.
- **Infrastructure-as-code scanning.** There is no IaC. The MVP deploys to one
  existing host with a documented `npm ci` / `npm start` sequence.
- **A secrets manager.** The application holds no credentials and makes no
  outbound calls. Adding a secrets manager for zero secrets is pure cost; the
  rule that keeps it at zero is the right control.
- **Exact version pinning in `package.json`.** The lockfile plus `npm ci`
  already pin the exact tree, and exact ranges fight the ecosystem's
  security-update path.
- **A Content Security Policy.** The application serves no inline scripts and
  no third-party assets, and EJS escapes everything, so the marginal attack
  surface a CSP would close is close to zero. The design system with inline
  styles is the trigger to revisit.
