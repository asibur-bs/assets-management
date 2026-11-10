# Evidence — Practices Discovery

> FINAL. This file records what each participant inspected, the 22 interview
> decisions, the factual corrections the reviews forced on the draft, and what
> remains uncertain. It is written after the three support agents completed
> their blind reviews and after the human answered every question.

## Status of this document

This stage runs as a hub-and-spoke ensemble: the lead (aidlc-pipeline-deploy-agent)
inspects and drafts first, three support agents review the draft independently,
the human is interviewed, and the lead integrates. This file is the integrated
record of all four phases.

---

## What each participant inspected

### The lead (aidlc-pipeline-deploy-agent)

The lead read the repository and the published reverse-engineering artifacts
directly rather than relying on a summary, and re-verified the load-bearing
facts rather than trusting them on the strength of the scan.

**Upstream artifacts read in full** — all six published reverse-engineering
artifacts in the CodeKB store at `aidlc/spaces/default/codekb/assets_management/`:

| Artifact slug | What the lead took from it |
|---|---|
| `business-overview` | The POC's domain shape, the four-state closed machine, the deliberate-omissions framing, and the statement that POC behaviour the MVP does not cover is preserved by default. |
| `architecture` | The layering, the synchronous-everything constraint (D1), the error contract (D3), the append-only-intent-but-not-enforced audit trail (D4), the cascading foreign key (D5), and the full migration-ordering constraint with its verified ordering table. |
| `code-structure` | The single-package layout, the route/service/repository idioms, the `Set`-based vocabulary, the SQL construction style, the timestamp handling, the EJS and `data-testid` idioms, the test idiom, and the comment discipline. |
| `code-quality-assessment` | The verified 66/66 baseline, the coverage configuration with its absent thresholds, the seven named coverage gaps, the linting and CI absences, the fourteen-item debt register, and the seven strengths worth preserving. |
| `technology-stack` | Node v20.20.0, CommonJS, Express 4, better-sqlite3 11, EJS, Vitest 2.1.9, the two env vars, and the full table of absent tooling — linter, formatter, type checker, container, CI, IaC, hooks. |
| `dependencies` | The complete internal `require` graph (a strict tree, no cycles, no layering violations), the six external packages, the absence of any outbound network call or secret, and the dependency gaps the MVP will need. |

**Direct repository inspection** (workspace root
`/home/bs00790/PycharmProjects/E2E_Training/assets_management`):

| Inspection | Result |
|---|---|
| `git rev-list --count HEAD` | **11 commits**, all by `asibur-bs`. No merge commits. (The draft said 12 — corrected below.) |
| `git branch -a` | `master` only. |
| `git remote -v` | Empty — **no remote is configured**. |
| `git log --pretty` with dates | Three POC commits Oct 4-11 2026; eight workflow/decision commits on 2026-11-06. All direct to `master`. |
| `git rev-parse HEAD` | `de8c18da2fd268efe7cd32f69e23c8540acfc36c` |
| Root listing | `src`, `tests`, `views`, `public`, `package.json`, `package-lock.json`, `vitest.config.js`, `README.md`, `README.MD`, `.gitignore`, `.mcp.json`, `aidlc/`, `.claude/`, `.puku-cli/`, `.puku/`, plus three scratch files. |
| Presence check for 15 config paths | `.github`, `.gitlab-ci.yml`, `Jenkinsfile`, `azure-pipelines.yml`, `Dockerfile`, `docker-compose.yml`, `Makefile`, `Procfile`, `.eslintrc.json`, `eslint.config.js`, `.prettierrc`, `.prettierignore`, `biome.json`, `tsconfig.json`, `.husky`, `lefthook.yml` — **every one absent**. |
| `.git/hooks` | No non-sample hooks. |
| `package.json` | Seven `test:*` scripts plus `start` and `dev`. **No `lint` script.** `engines.node >= 20.0.0`. |
| `vitest.config.js` | `globals: true`, `pool: 'forks'`, `coverage.provider: 'v8'`, `coverage.include: ['src/**/*.js']`. **`coverage.thresholds` absent.** |
| `src/db/index.js` | `journal_mode = WAL` (line 15), `foreign_keys = ON` (line 16). |
| `src/repositories/assets-repo.js` | `ALLOWED_STATUSES`/`ALLOWED_CATEGORIES` exported at lines 142-143 with **zero external consumers**; the duplicate check at line 70 is a **message-text match** on `'UNIQUE constraint failed'`; `recordAudit` takes no actor parameter. |
| `src/services/asset-service.js` | `TRANSITIONS` exported at line 114 with **zero external consumers**; five domain error codes, none retryable. |
| `src/app.js` | The error middleware maps four codes; `INVALID_STATE` is thrown but **unmapped**, so it surfaces as a 500. |
| `src/server.js` | `app.listen(PORT, ...)` with no host argument — binds `0.0.0.0`. |
| `src/db/migrations.sql` | `audit_log` columns are `id, asset_id, action, description, created_at` — **no actor column**. |
| `views/list.ejs:10-16`, `views/detail.ejs:26-49` | The status list and the per-status action forms are **hardcoded literals** in the templates. |
| `npx vitest run --coverage` | **66 passed / 66 across 5 files**; whole-tree line coverage **93.38%**; `src/server.js` at 0%. |
| `npm audit --omit=dev` | **0 vulnerabilities** across 113 production packages. |
| `npm audit` (all) | **10 vulnerabilities: 3 critical, 1 high, 6 moderate** — all in the Vitest dev toolchain. |
| `npm audit --audit-level=high --omit=dev` | Exit code 0 — usable directly as a CI gate. |
| `node --version` / `npm --version` | v20.20.0 / 10.8.2. |

**Upstream Ideation artifacts read**: `aidlc-state.md` (scope `feature`, depth
`Standard`, guard policy `relaxed`, sensors on, learnings on, summary
confirmation on, construction checkpoints enabled, 33 stages with **none
skipped**); `.../ideation/scope-definition/intent-backlog.md` (the `[Q1]`-`[Q8]`
answers, the MoSCoW boundary, the WSJF ranking, the two indivisible groups);
`.../ideation/scope-definition/scope-document.md`; `.../ideation/feasibility/feasibility-assessment.md`
(the `[Q6]` deployment-target answer); `.../ideation/team-formation/team-assessment.md`
(the confirmed roster: one developer plus reviewers who are not authors, one
location, no working overlap, a design-board checkpoint before the foundation).

**Rule layers read**: `aidlc/spaces/default/memory/org.md` (the framework
defaults, including the `feature`-scope testing additions, the trunk-based and
squash-merge defaults, the walking-skeleton rule, the deployment default, the
code-style default); `aidlc/spaces/default/memory/team.md` (**empty in every
section**); `aidlc/spaces/default/memory/project.md` (the `## Decided` record
of the approved 17-item decision set and its seven standing conditions).

**Tooling read at integration**: `.claude/tools/aidlc-state.ts` and
`.claude/tools/aidlc-lib.ts`, to establish exactly how `practices-promote`
handles the artifact shapes before writing them. See the "Promotion mechanics"
section below.

### `aidlc-quality-agent`

Focused on `## Testing Posture` and the CI gate design. Measured or read
directly in the workspace.

- Ran `npx vitest run --coverage` and produced the **93.38%** whole-tree line
  coverage figure, with the per-file breakdown showing `src/server.js` at 0%
  and every other `src/` file between 85.71% and 100%.
- Probed Vitest's threshold semantics with a throwaway config: `thresholds:
  { lines: 80 }` **passes** (global aggregate), `thresholds: { lines: 99 }`
  **fails** with `Coverage for lines (93.38%) does not meet global threshold
  (99%)`, and `perFile: true` **fails today on `src/server.js` alone**. This
  established that the real choice is global-versus-per-file, not
  whole-tree-versus-touched-modules.
- Verified all seven coverage gaps directly in `tests/`, including that the
  "burst" test at `tests/assets-repo.test.js:158-167` is a sequential `for`
  loop and that **no count assertion over `audit_log` exists anywhere** in the
  suite.
- Confirmed the legacy-migration fixture at `tests/db.test.js:63-79` has **no
  `audit_log` table at all**, making the cascade data loss structurally
  unreachable from that test.
- Measured the traceability convention's actual breadth: **13 distinct**
  `FR`/`NFR` ids across the suite.
- Established that `better-sqlite3@11.10.0` installs via
  `prebuild-install || node-gyp rebuild --release`, so dependency installation,
  not the ~1-second suite, is the pipeline's budget.
- Showed the pipeline cannot run at all without a remote, and that the
  realistic minimal gate available today is a local pre-commit hook.

### `aidlc-developer-agent`

Focused on `## Code Style` and `## Way of Working`. Installed Prettier 3 and
ESLint 9 in throwaway directories and ran them against the real repository;
probed `better-sqlite3`'s error shape against a live SQLite database.

- Ran `prettier --check` with `{ singleQuote: true }` against all 14 tracked
  JS files: **every file fails**. Measured the diff at ~180 changed lines in
  `src/` alone at Prettier's default width, and **120** at
  `{ singleQuote: true, printWidth: 120, trailingComma: "es5" }`.
- Established the cause is `printWidth` (the codebase is hand-formatted at
  ~120 columns; only 5 lines in the repository exceed 120 characters), not
  quote style, and decomposed the residual 120 lines into four mechanical
  categories: the single-line `catch` idiom, the template-literal hug, three
  long conditions, and 14 files missing a trailing newline.
- Verified Prettier **cannot parse EJS** (`No parser could be inferred`;
  forcing the HTML parser fails on EJS interpolation inside a tag attribute)
  and that it would rewrite `public/styles.css` from 45 lines to 200.
- Verified `trailingComma: "es5"` is correct and `"all"` is not: trailing
  commas appear in object and array literals but **not** in function call
  arguments.
- Ran ESLint 9 with `js.configs.recommended` against `src/`, `tests/`, and
  `vitest.config.js`: **exit 0 on `src/`**, with the only rule firing being
  `no-unused-vars` in exactly **13 sites across two test files**, all one
  shape — a deliberately discarded response.
- Probed `better-sqlite3` live: `err.code` is `SQLITE_CONSTRAINT_UNIQUE` for
  a unique violation and `SQLITE_BUSY` for lock contention, while
  `err.message` is `'database is locked'` and is not stable.
- Confirmed `ALLOWED_STATUSES`, `ALLOWED_CATEGORIES`, and `TRANSITIONS` are
  exported with **zero external consumers**, and that EJS cannot `require` at
  all — which is why the vocabulary is duplicated six times.
- Confirmed 14/14 JS files open with `'use strict';'`, and that the
  named-object export shape holds in 7 of 8 `src/` files with
  `src/routes/assets.js:94` the sole bare-function exception.
- Found that `src/routes/assets.js:50-51` handles `VALIDATION_ERROR` and
  `DUPLICATE_ASSET` locally only to re-render the form, not to choose a
  status, and that the asset write and the audit write are two separate
  statements with no enclosing transaction.

### `aidlc-devsecops-agent`

Focused on `## Security`, supply chain, and audit-history integrity. Verified
by execution against live databases and live HTTP responses.

- `npm audit --omit=dev`: **0 vulnerabilities across 113 production packages**;
  `npm audit` (all): **10 vulnerabilities (3 critical, 1 high, 6 moderate)**, all
  in the Vitest toolchain, with `vitest`, `@vitest/coverage-v8`, `tinypool`,
  and `vite` named.
- `npm audit --audit-level=high --omit=dev` exits **0**, so it gates a
  pipeline directly.
- Probed `UPDATE audit_log SET description='tampered'` — **it succeeded**.
  Append-only is a convention, not a guarantee.
- Created and fired `BEFORE UPDATE` and `BEFORE DELETE` triggers on
  `audit_log` — **both fire**, and the `BEFORE DELETE` trigger also **blocks
  the cascading `DELETE FROM assets`**, because the cascade executes as an
  implicit delete on the child table.
- `PRAGMA table_info(audit_log)`: no actor column. Grepped `src/` for
  `req.headers`, `req.get`, `req.user`: **zero hits** — no session, no cookie,
  no header handling.
- Live HTTP response: **`x-powered-by: Express` present**; no
  `content-security-policy`, no `x-content-type-options`, no
  `x-frame-options`, no `strict-transport-security`.
- Every form in `views/` is a bare `<form method="post">` with no CSRF token,
  and there is no CSRF middleware.
- Verified all user-supplied values in the templates use `<%= %>`, and every
  SQL value uses a `?` placeholder — **no injection surface in either**.
- No `.env`, no credential-like string in `src/`, `views/`, or `public/`.
- Lockfile: version 3, 292 entries — 113 prod, 179 dev, 51 optional.
- `hasInstallScript` inventory: **three** — `better-sqlite3` (prod), `esbuild`
  and `fsevents` (dev, macOS-only optional). `better-sqlite3`'s install script
  is `prebuild-install || node-gyp rebuild --release`.

---

## Interview decisions

**The interview happened.** It was conducted in **self-guided file mode**: the
human was presented with `practices-discovery-questions.md`, read it, edited
the file directly to record each answer in its `[Answer]:` field, and returned
the file. The mode is recorded here because it changes the provenance of the
answers — they are the human's own written selections, not a live
question-by-question exchange. All 22 questions were answered, and the
consolidated summary was confirmed ("Looks correct").

| # | Question | Answer | Evidence behind the recommendation |
|---|---|---|---|
| Q1 | The trunk branch name | **B** — rename the trunk to `main` before the MVP work starts | The org default names the trunk `main`; the repository's only branch is `master`. The draft had proposed keeping `master`; the human reversed that, so the rename is a decided practice. |
| Q2 | How a piece of work lands on the trunk | **A** — squash-merge | The history has no merge commits, so it cannot settle it. Squash gives a linear trunk that maps 1:1 onto the delivery sequence. |
| Q3 | How a change is chunked into commits | **A** — a behaviour change and its proof land together, never split | The `DROP TABLE assets` ordering destroys every audit row **silently, with the transaction committed and no error raised** (`architecture`). A commit that lands the rebuild without the assertion ships a silent data-loss path. |
| Q4 | Walking skeleton | **A** — no skeleton; the foundation workstream is built and verified end to end | The scope does not declare `skeleton: on`, and the org rule selects it only when it does. A skeleton would build a throwaway path through a schema we already know must be rebuilt. |
| Q5 | The testing method | **A** — `test-after`, with the tests written **first** for the duplicate check **and** the table rebuild | A race is not reliably reproducible by a test written afterwards; the cascade loss is silent and committed. The human chose "test-after as the method with named exceptions", so `Methodology` stays `test-after` and the carve-out is stated in `Ordering`. |
| Q6 | Where the 80% coverage floor applies | **A** — one project-wide threshold of 80% line coverage | The measured whole-tree coverage is **93.38%**, so the floor is already met with 13.38 points of surplus; the work is to make it **enforceable**. A per-file floor fails today on `src/server.js` at 0%, so the project-wide reading is the one that passes. |
| Q7 | Where the automated checks run | **C** — both a local pre-commit hook now **and** a hosted pipeline before the MVP merges | The repository has no CI configuration and **no remote**, so no pull-request-based platform can run even once. The hook is the gate that works today; the hosted pipeline discharges the `feature` scope's CI-before-merge expectation. A configured remote is a prerequisite this release must satisfy. |
| Q8 | What the migration test fixture must contain | **A** — a migration test must run against a database populated with audit history and assert the history survives | The existing legacy fixture has **no `audit_log` table at all**, so the cascade loss is structurally unreachable from it; the fixture shape is what future migration tests will copy. |
| Q9 | How far the traceability convention reaches | **A** — every new test carries its requirement identifier, same as today | The suite currently references 13 distinct ids; the MVP's requirement set is larger, and the marker is what makes a test traceable to the behaviour it pins. |
| Q10 | When the sign-off is required | **A** — sign-off is required for **every** deploy to the host | The org rule gates production deploys on a separate manual approval; with one environment and one host, the human chose the broader reading rather than the draft's narrower schema-only one. |
| Q11 | What the backup must capture | **A** — the backup stops the process or uses the database's own backup mechanism | `src/db/index.js:15` sets `journal_mode = WAL`, so committed rows can still sit in the `*.sqlite-wal` sidecar. Copying only the main file while the process runs can capture an incomplete snapshot. The draft's "copy the database file" was too weak. |
| Q12 | The sign-off role | **A** — the product owner signs off on a schema-carrying deploy, on its own | The reviewers are not authors and are consulted at defined points, not continuously. The reviewer individuals are unnamed, so the artifact records the **role**, not a name. |
| Q13 | The formatter's line width | **A** — 120 columns, to match the existing code | The codebase is hand-formatted at ~120 columns; Prettier's default 80 would re-wrap ~120 lines across the 14 tracked files. Matching the code keeps adoption a configuration change. |
| Q14 | How strict the linter should be | **A** — the recommended rule set, with **one** documented exception scoped to test files | `js.configs.recommended` was verified to pass `src/` cleanly and to fire on exactly one rule in 13 test-file sites, fixable by a config-only test-scoped override. The draft's "starting set with an allow-list" premise was false. |
| Q15 | When the configuration lands | **A** — as its own first commit, before any MVP work | A formatting-only change is far easier to read on its own than the same change mixed in with a table rebuild. |
| Q16 | The dependency audit gate | **A** — the production-dependency audit is blocking; dev-toolchain advisories are a separate follow-on with their risks named | `npm audit --omit=dev` reports 0 vulnerabilities across 113 production packages; the dev tree carries 3 critical + 1 high in Vitest 2.x, whose fix is two semver majors across. |
| Q17 | Making audit history genuinely append-only | **A** — enforce append-only with **SQLite triggers**, so it does not depend on application code | `UPDATE audit_log` succeeds today, so append-only is a convention one line of code breaks. Both triggers were verified to work, and the `BEFORE DELETE` trigger also blocks the destructive cascade. |
| Q18 | The shared escaping rules for the new surfaces | **A** — make the prepared-statement rule and the EJS-escaping rule mandatory and named, plus one shared export-escaping function applied to every cell | Both existing rules are security controls (SQL injection; stored XSS) framed as style. The export needs formula-injection protection covering `=`, `+`, `-`, `@`, tab, and CR, applied to every string cell. |
| Q19 | How much security tooling to adopt | **A** — the small set: the production-dependency audit, a dependency-free pre-commit secret scan, and the linter's security rules | Twelve files, one author, no remote, no container, no IaC. The rejections (standalone SAST, DAST, container scanning, IaC scanning, a secrets manager, exact version pinning) are recorded explicitly so the absence reads as a decision. |
| Q20 | The trust boundary for who the actor is | **A** — a request-supplied actor is **ignored**, and no client-settable field or header may be the actor's source | The mechanism is still open (I-01 / I-03), but the shared property of all four candidates can be constrained now. The rule is a code-layer invariant on the request path, so it belongs in a security section, not under `## Deployment`. |
| Q21 | Which rules belong to the team and which to this project | **A** — product-behaviour contracts to the project file, working practices to the team file | Applied when writing `discovered-rules.md` and `team-practices.md`; see "Promotion mechanics" below for what the promotion tool can actually do with that split. |
| Q22 | The tooling configuration as its own commit | **A** — estimate it as part of this release's delivery work | There is no formatter or linter configuration in the repository today, so adopting the org's named defaults is new work to build, not an existing standard to enforce. |

### The consolidated summary was confirmed

The human was shown the consolidated summary of all 22 decisions and answered
**"Looks correct"**. The summary-confirmation receipt is recorded in the
questions file.

---

## Corrections the reviews forced on the draft

Each of these was a factual error in the lead's draft. A correction recorded
explicitly is worth more than a silently fixed sentence.

| # | The draft's claim | What is actually true | How it was resolved |
|---|---|---|---|
| 1 | "The `git log --oneline -30` output shows **12 commits**" | `git rev-list --count HEAD` returns **11**. The draft's own shortlog row ("11 by `asibur-bs`") contradicted the count in the row above it. | Corrected to 11 in `team-practices.md` `## Way of Working` and in this file's inspection table. |
| 2 | Commit subjects are imperative, "matching the existing history (`Implement asset lifecycle timestamps, ...`)" | The three application commits are `Initial Commit`, `Second Commit`, `Third Commit` — neither imperative nor descriptive of content. Only the later workflow commits are imperative. | The rule is kept; the claim of an existing match is removed, and the artifact now states the convention is **new**. |
| 3 | "the existing code already conforms to Prettier's defaults with only one deliberate exception" | **False.** All 14 tracked JS files fail `prettier --check`. The gap is `printWidth` (~120 columns used vs Prettier's 80) plus ~120 lines of mechanical re-layout — not quote style. | The artifact now states the code is not Prettier-clean, names the four mechanical categories, and sets `printWidth: 120` to keep adoption a configuration change plus a mechanical re-layout. |
| 4 | "Trailing commas" listed as a repo-wide convention | Trailing commas appear in object and array literals but **not** in function call arguments. | The formatter configuration now specifies **`trailingComma: "es5"`** and the artifact explains why `"all"` is wrong. |
| 5 | "The floor may require test work on the existing modules" | The measured whole-tree line coverage is **93.38%**; the floor is met today with 13.38 points of surplus. | Corrected in `## Testing Posture`: the work is to make the floor **enforceable**, not to reach it. |
| 6 | The CI pipeline runs "lint → test → coverage check" | The **dependency audit step was omitted entirely** — the highest-value zero-cost control in the release. | The pipeline is now **lint → test → coverage → dependency audit**, with the exact command `npm audit --audit-level=high --omit=dev`. |
| 7 | The draft deferred the ESLint strictness question on the premise that a strict set causes "an unrelated mass diff" | `js.configs.recommended` produces **zero** diff in `src/` and fires on exactly one rule in 13 test-file sites. | The Q14 answer adopts the recommended set with one documented test-scoped exception; the draft's "starting set" framing is removed. |
| 8 | The draft proposed `lint` and `format:check` scripts without scoping them | Prettier cannot parse EJS, and would rewrite `public/styles.css` from 45 lines to 200; an unscoped `eslint .` would lint the `aidlc/` and `.claude/` workflow tooling. | `format:check` now **excludes `views/` and `public/`**; `lint` is **scoped to `src tests vitest.config.js`**. |
| 9 | The draft treated the actor-trust rule as a `## Deployment` matter | It is a request-path trust-boundary invariant with a test-level verification. | It now has its own **`## Security`** section, and the negative specification (no client-settable field or header) was added. |
| 10 | The draft's `## Forbidden` migration-ordering rule was a one-off instruction for this rebuild | The general constraint is stronger and does not go stale when a third table is added. | Rewritten generally: a table with a cascading reference must never be dropped while the referencing rows exist. |
| 11 | The draft's error-code list was presented as a complete vocabulary | None of the five codes is retryable, and the `SQLITE_BUSY` standing condition requires one; `INVALID_STATE` is thrown but unmapped in the middleware. | The artifact now requires a retryable code and requires every code in the vocabulary to be mapped. |
| 12 | The draft's layering convention was "the new MVP modules live in the same layers" | With no shared-definition layer, the four count-consuming surfaces and the templates cannot consume one vocabulary — which is the structural cause of the six-way duplication. | A `src/domain/` leaf layer is now part of the practice, together with the rule that a template-consumed vocabulary arrives as **render data**. |
| 13 | The draft's backup practice was "copy the database file" | WAL mode means committed rows can still sit in `*.sqlite-wal`. | The backup must stop the process or use the database's own backup mechanism. |
| 14 | The draft's `## Deployment` procedure was stated as if verified | The procedure was never executed end to end by this stage. | Recorded explicitly as documented-but-untested, and carried into unresolved uncertainty. |
| 15 | The draft listed the seven coverage gaps as all "closed by the work that guards them" | "Closed by the work" is not "tested". The concurrent-writers test needs a **file-backed** database harness (`:memory:` is per-connection), and the audit-row-count test carries the Audit Completeness metric. | Both are now named dedicated test obligations, with the harness named as new work. |
| 16 | The draft's coverage question was framed as whole-tree versus touched modules | The real axis is global versus per-file threshold, and per-file fails today on `src/server.js` alone. | Corrected to a single project-wide 80% threshold, with `src/server.js` explicitly named and its coverage route stated. |
| 17 | The draft's test-after justification leaned on "the existing suite is comprehensive and was written alongside the implementation" | A suite written with its implementation has seven named gaps and a legacy-migration test that could not have detected the defect it sat next to — the argument is circular. | The justification now rests on the schema-and-migration argument alone. |
| 18 | The draft listed "the existing 66/66" as a literal threshold | The count rises on the first new regression test. | The gate is now "the existing 66 tests must remain and pass"; the count rises from 66. |

---

## Promotion mechanics — what `practices-promote` actually does

The lead read `.claude/tools/aidlc-state.ts` (the `handlePracticesPromote`
function) and `.claude/tools/aidlc-lib.ts` (`extractMarkdownSection`,
`replaceSection`, `appendUnderHeading`) before writing the artifacts, and
reproduced the tool's behaviour against a fixture. The findings are load-bearing
for how these artifacts are shaped.

**1. A `## Security` section beyond the five would be silently dropped.**
`handlePracticesPromote` iterates a fixed list of five headings — `## Way of
Working`, `## Walking Skeleton`, `## Testing Posture`, `## Deployment`, `## Code
Style` — and calls `replaceSection` on each. `replaceSection` replaces the
entire body of the heading up to the next `## ` heading. A sixth `## Security`
section placed after `## Code Style` is therefore never extracted, and its
content is **not** carried into `team.md` at all: the `## Code Style`
replacement stops at the `## Security` heading, and `## Security` itself is
never read. The result is silent data loss — no error, no warning, no audit
entry. The reproduction confirmed it: `## Security` present in the draft,
**absent** from the promoted `team.md`, along with everything under it.

**Consequence for this stage.** The `## Security` section is written into
`team-practices.md` because it is the right artifact for a human to read and
because the stage's deliverable set is fixed, but its content is **duplicated**
into the five promoted sections so that it survives promotion:

- the actor-trust rule, the append-only trigger enforcement, the CSV escaping
  rule, the named escaping controls, the conditional CSRF rule, the secrets
  rule, and the audit gate are recorded in `## Code Style` and `## Deployment`
  of `team-practices.md` as well;
- the actor-trust rule, the append-only enforcement, the CSV escaping rule, and
  the retryable-error and `err.code` requirements are also recorded in
  `discovered-rules.md`, which **does** reach `project.md`.

**2. `practices-promote` cannot split `team.md` from `project.md` by bucket.**
It has no notion of "team rule" versus "project rule". Every line parsed from
`discovered-rules.md`'s `## Mandated` and `## Forbidden` sections is appended to
`project.md`'s `## Mandated` and `## Forbidden` sections with an
`(affirmed YYYY-MM-DD)` stamp; the five team sections come only from
`team-practices.md`. A working practice written into `discovered-rules.md`
would therefore land in `project.md` and nowhere else.

**Consequence for this stage.** Per Q21, `discovered-rules.md` carries **only**
the product-behaviour contracts, each tagged with its bucket inline
("Bucket: project"), and the working practices live in `team-practices.md`'s
five sections. This is the split the human chose and the split the tool can
actually deliver.

**3. Each rule must be a single line.** The rule parser filters
`sectionContent.split("\n")` line by line, skipping blank lines, comment
lines, and lines starting with `#`. A rule wrapped across two lines is split
into two rules, and the continuation line becomes a malformed rule of its own
("that continues here." would be appended to `project.md` as a rule). Every
rule in `discovered-rules.md` is therefore written on one line, with the
source in parentheses at the end.

**4. The promotion is atomic and fails closed.** It validates that every
declared support contribution carries its identity-marker first line, reads
both drafts and both targets, builds both new contents in memory, writes
`project.md` first and `team.md` second, and emits `PRACTICES_AFFIRMED` with
the state timestamp in one audit-locked transaction. Any failure emits
`PRACTICES_OVERRIDE` and halts the gate.

---

## Unresolved uncertainty

### Carried from upstream, not resolvable here

- **I-01 / I-03 — actor identity.** Whether a trusted authentication mechanism
  exists anywhere in the organisation is still open. The `architecture` and
  `code-quality-assessment` artifacts record that the codebase has no identity
  provider, and the devsecops review independently confirmed **zero** hits for
  `req.headers`, `req.get`, or `req.user` across `src/`. That is a fact about
  this codebase, not a finding about the organisation. **The actor-trust rule
  now has a stated trust boundary** — a request-supplied actor is ignored and
  no client-settable field or header may be the actor's source — but the
  mechanism that provides the trusted context is still undecided among four
  candidates. The decision and the `audit_log` rebuild remain **one indivisible
  workstream**, because `audit_log` has no actor column and `recordAudit` takes
  no actor parameter.
- **I-02 — records retention.** Whether a retention or disposal schedule
  applies to asset custody records is open, and it is **in tension** with the
  append-only rule rather than compatible with it: if a schedule requires
  disposal, then "never delete an asset row or its history" and the retention
  obligation pull against each other. The tension is recorded, not resolved.
  The append-only trigger makes it loud — the delete fails with a clear error
  — rather than silent, which is a reason to prefer it over the convention.
- **I-04 — unquoted licence cost.** Unquoted; the build position holds on
  other grounds. Not a practices question.
- **R-02 — organisational adoption readiness.** Carried from the
  team-formation stage and still open; it bears on whether the practices are
  adoptable by a wider team rather than by this one.

### Arising from the interview and the reviews

- **The two omitted discard transitions.** `in-stock → discarded` and
  `returned → discarded` are absent from the approved amendment surface. They
  remain open; Q19 chose a security-tooling set and did not settle them.
- **The reviewer individuals are unnamed.** Q12 records a **role** — the
  product owner signs off on a schema-carrying deploy, on its own — not a
  name. The three review points the team-formation stage defined still need
  named holders before they can be exercised.
- **No git remote is configured.** `git remote -v` is empty. Q7=C commits the
  team to a hosted pipeline before the MVP merges, so a configured remote is a
  **prerequisite this release must satisfy**, and the hosted platform is not
  yet chosen.
- **The `## Deployment` procedure is documented but untested.** This stage did
  not execute it end to end against a live copy of the database. The
  `architecture` artifact's verified ordering is the evidence — that ordering
  was probed live at scan time — but the procedure as the artifact describes it
  has not been run.
- **The deploy host's outbound network access is unknown.** This determines
  whether `prebuild-install` can fetch a prebuilt binary or whether every
  install takes the `node-gyp` fallback and compiles the native addon from
  source. It is a question for whoever operates the host, and it changes
  whether the addon is a download-time or a compile-time artefact.
- **The bind address is a recorded position, not a confirmed one.**
  `app.listen(PORT, ...)` binds `0.0.0.0`. The artifact states this
  explicitly as a deliberate position to be confirmed against the host's
  network, rather than leaving it inherited by accident.
- **`views/_layout.ejs` and `README.MD` are undecided.** The first is dead
  code (nothing includes it) and the second is a 17-byte case-differing
  duplicate of `README.md` — a hazard on a case-insensitive filesystem. Both
  are flagged so a tooling sweep does not remove them accidentally; neither is
  decided.
- **`src/server.js` stays at 0% coverage by a declared decision.** It is the
  four-line process bootstrap, covered by the deployment smoke test rather
  than by a unit test. With a global 80% threshold it does not block, but the
  surplus it represents could mask a large untested module added later.
- **The environment-parity question is deferred, not answered.** The
  feasibility stage recorded that "no dev/staging/prod split exists today" and
  that the operation phases would decide whether one is introduced. This stage
  recommends not introducing one, on the single-host fact.
