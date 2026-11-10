**Collaborator:** aidlc-quality-agent

## Contribution

Blind review of the lead's `## Testing Posture` draft, plus the CI quality-gate
design, the test/code patterns the draft preserves, and the gaps the interview
must resolve. Everything technical below was measured or read directly in the
workspace, not inferred from the artifacts. All commands were read-only; the
only files written were the gitignored `coverage/` directory and a temporary
probe config that has been deleted (`git status` is back to its prior state).

### 1. The 80% coverage floor is measurable now, and the lead's framing needs correcting

`evidence.md:252-256` flags the 80% floor as "unproven" and names the quality
agent as the party to close it. I ran it.

```
cd /home/bs00790/PycharmProjects/E2E_Training/assets_management
npx vitest run --coverage
```

Result — **66 passed / 66 across 5 files**, reproduced again, with coverage:

```
 % Coverage report from v8
-------------------|---------|----------|---------|---------|
File               | % Stmts | % Branch | % Funcs | % Lines |
-------------------|---------|----------|---------|---------|
All files          |   93.38 |    83.33 |   96.42 |   93.38 |
 src               |   53.84 |       70 |      50 |   53.84 |
  app.js           |   96.55 |    77.77 |     100 |   96.55 |
  server.js        |       0 |        0 |       0 |       0 |
 src/db            |   96.77 |       75 |     100 |   96.77 |
  index.js         |   85.71 |       40 |     100 |   85.71 |
  migrate.js       |     100 |     90.9 |     100 |     100 |
 src/repositories  |   98.62 |     97.5 |     100 |   98.62 |
  assets-repo.js   |   98.62 |     97.5 |     100 |   98.62 |
 src/routes        |   97.87 |    73.33 |     100 |   97.87 |
  assets.js        |   97.87 |    73.33 |     100 |   97.87 |
 src/services      |   98.26 |    88.88 |     100 |   98.26 |
  asset-service.js |   98.26 |    88.88 |     100 |   98.26 |
```

**The whole-tree line coverage is 93.38%. The gap to the 80% floor is 13.38
points in the *surplus*, not a shortfall.** The floor is met today, before a
single line of MVP code is written. This is the single most important
correction to the draft, and it changes the draft's conclusion materially:

`team-practices.md:134-142` says "We hold an 80% line-coverage floor for the
MVP... We set the threshold in `vitest.config.js` so that `npm run
test:coverage` can actually fail". The draft correctly records that the floor
is *new work, not enforcement of an existing standard* — that part is right and
I endorse it. But the draft never says whether the repository currently
satisfies it, and it leaves the impression that the floor is a stretch
target requiring test work on existing modules. It is not. It is a **floor
that the existing suite already clears by 13.38 points**, and the work is
simply to make it *enforceable* (set `thresholds`) rather than to *reach* it.

`evidence.md:254-256` says the floor "may require test work on the *existing*
modules, not only on the new ones". That hypothesis is now **disproved**. The
gap is not in the existing modules; the existing modules are at 85.71% to 100%
each, except `src/server.js`.

### 2. The `src/server.js` hole is a coverage-scoping decision, not a coverage gap

`src/server.js` is at **0% lines, 0% functions, 0% statements** (lines 1-23
uncovered). It is the process bootstrap: `openDatabase` -> `createApp` ->
`app.listen(PORT, ...)`. Nothing imports it in tests — the route tests build
the app through `createApp(db)` directly and never boot a listener. This is a
deliberate and correct testing choice (the suite has no network listener and
no filesystem writes, which the quality assessment praises at
`code-quality-assessment.md:465`), but it means the file is structurally
untestable under the current idiom: to cover it you must either bind a real
port or stub `app.listen`.

The critical consequence for the draft's open question at
`team-practices.md:201-206` — "whether the coverage floor applies to the whole
`src/` tree or to the modules the MVP touches":

- The `coverage.include` is already `['src/**/*.js']` (`vitest.config.js:21`),
  so `server.js` is inside the measured set.
- **Vitest's `thresholds.lines` is a global (aggregate) threshold.** I verified
  this by probe: with `thresholds: { lines: 80 }` the run **passed** with exit
  code 0, using the 93.38% "All files" aggregate — *not* the 53.84% `src`
  directory row, which is what the textual report displays.
- I confirmed the threshold is genuinely enforced rather than silently ignored
  by probing an unreachable value: `thresholds: { lines: 99 }` produced
  `ERROR: Coverage for lines (93.38%) does not meet global threshold (99%)`
  and exit code 1.

So the draft's **whole-tree reading is the one that passes today**, and it is
also the one the `feature` scope's unqualified "80% line coverage" implies.

However — and this is the finding the interview must resolve — the
`perFile: true` variant is a materially different gate. I probed it:

```
thresholds: { lines: 80, perFile: true }
ERROR: Coverage for lines (0%) does not meet global threshold (80%) for src/server.js
exit code 1
```

**`perFile: true` fails today, on `src/server.js` alone.** Everything else
clears 80% per file with room to spare. So the real choice for the interview
is not "whole tree vs. touched modules" — it is **global threshold (passes
today) vs. per-file threshold (fails today on one file)**. The draft's
framing of the question (`team-practices.md:201-206`) does not surface this
option, and it should: a per-file floor is the stronger guarantee and it is
the one that catches a single untested new module hiding behind a healthy
aggregate — which is precisely the risk the five greenfield MVP surfaces carry.

My recommendation to put to the human: **global `thresholds.lines: 80` as
the enforced gate, plus an explicit decision on `server.js`.** Two clean
options for `server.js`: (a) add it to `coverage.exclude` with a comment
recording that the process bootstrap is exercised by the deployment smoke test
rather than by a unit test; or (b) write one test that boots `main()` against
a temp `DB_PATH` on an ephemeral port and asserts the listener starts. Option
(b) is about 15 lines and also closes the 0% hole; option (a) is honest but
leaves the file permanently unmeasured. Either way the exclusion must be a
**declared, commented decision**, not a silent gap that the aggregate hides.

Note the second-order effect: with a global threshold, a future release that
adds a large untested module could be masked by the 93.38% surplus elsewhere.
The surplus is a buffer, not a guarantee.

### 3. The methodology inversion is coherent, but the draft's reasoning is partly wrong

`team-practices.md:125-132` proposes test-after as the methodology with one
deliberate inversion to test-first for the concurrency-safe uniqueness check.
**I endorse the inversion and its reasoning.** A race that reproduces only
under interleaved writes is not reliably reproducible by a test written after
the code; a test-first specification of the `IMMEDIATE` transaction, the
non-zero `busy_timeout`, and the `SQLITE_BUSY` -> retryable-error mapping is
the only way to pin the retry path. The reasoning is sound and I have no
objection to it.

But two supporting claims in the draft need correcting, because they are
stated as load-bearing evidence and they do not hold:

**(a) The "test-after" justification is partly circular.** `team-practices.md:112-118`
argues test-after because "the existing suite is comprehensive for what the
code does... and it was written alongside the implementation". But
`code-quality-assessment.md` and the artifact trail show the existing suite is
test-**after** in the sense that matters: it was written *with* the
implementation, and it has seven named coverage gaps, a legacy-migration test
that could not have caught the cascade data loss, and a "burst" test that is
not a concurrency test. A suite that "was written alongside the implementation"
is not evidence that test-after produces good outcomes. The genuinely
defensible reason for test-after here is the one the draft gives second: the
hardest MVP work is **schema and migration**, not application logic, and the
migration-ordering constraint was discovered by *probing a live database*
rather than by writing a test first (`team-practices.md:119-123`). That
argument stands on its own and is the right argument. The first argument
should be dropped rather than left as a second, weaker plank.

**(b) The draft does not recognise that the migration work needs test-first
just as much as the concurrency work.** The draft inverts the ordering for
exactly one item. But the scan's highest-severity defect — the
`ON DELETE CASCADE` that silently destroys every audit row — is exactly the
class of defect a test written *before* the rebuild would pin. The migration
must be written to a specification the test already states: "given a legacy
database with N audit rows, after the rebuild, N audit rows still exist, and
`PRAGMA foreign_key_check` returns `[]`". That is a *testable specification
that exists before the code*, which is the definition of test-first, and it
is the highest-value place to spend the inversion in this release — far more
so than the uniqueness check, because the cascade failure is **silent**
(committed, no error raised; `code-quality-assessment.md:209-213`) whereas a
`SQLITE_BUSY` mis-mapping is at least observable.

So: the draft inverts for the concurrency check and not for the migration
rebuild. I would invert for **both**, and rank the migration rebuild first on
risk grounds.

**(c) The `Methodology: test-after` + one inversion is not expressible as a
`custom` posture.** The org's Testing Posture (`org.md`) says Code Generation
resolves `Methodology` and `Ordering` from the affirmed fields, and that
`custom` is a value available to the team. `evidence.md:119-124` raises the
question of whether the release warrants `custom` rather than `test-after`
with a carve-out. My position: **`test-after` is correct, and the carve-out
should be expressed in `Ordering`, not by re-classifying `Methodology`.** The
org rule's own default ordering is "implement each applicable testable layer,
then write and run that layer's tests" — the carve-out is a *deviation from
the ordering for named layers*, which is exactly what `Ordering` is for. Calling
the whole posture `custom` would make the two words describe one carve-out
badly and would lose the plain statement of "test-after" for the 95% of the
release that is ordinary application logic. I recommend the lead put
`custom` to the human only as the framing question, and I recommend the
answer be `test-after` with an explicit named-layers exception in `Ordering`.

### 4. The test pyramid in the draft is not stated, and the actual suite does not match the standard shape

The draft never states a test pyramid, though it discusses layer coverage. The
actual suite's shape is:

| Layer | File | Tests | Lines of test code |
|---|---|---|---|
| Infrastructure | `tests/db.test.js` | 7 | 102 |
| Data access | `tests/assets-repo.test.js` | 15 | 168 |
| Domain | `tests/asset-service.test.js` | 18 | 177 |
| HTTP | `tests/routes.test.js` | 14 | 147 |
| Presentation | `tests/views.test.js` | 12 | 152 |

All 66 tests sit in **one `describe` block per file**, with a single
`beforeEach`/`afterEach` pair per file opening and closing a fresh `:memory:`
database. There is **no** mocking layer: `tests/helpers/seed.js` (81 lines)
provides four JSDoc'd helpers and seeds through the *service* path rather than
hand-written SQL.

Two observations that bear on posture:

- **There is no true unit-test tier.** Every test in the repository exercises
  real SQLite against a real in-memory database. There are no isolated
  pure-function tests because the code has almost no pure functions — the
  domain logic is inseparable from its SQL. So the pyramid is not
  "many fast units, fewer integration tests"; it is a **flat, single-tier
  integration suite** whose "units" are all database-backed. This is a
  legitimate and disciplined choice for a synchronous SQLite app, and the
  draft's claim that the existing suite is comprehensive (`team-practices.md:115-118`)
  is fair on its own terms. But the draft should not imply a unit/integration
  distinction the suite does not have.
- **The draft's new test layers are consistent with the suite, and that is
  right.** `team-practices.md:180-185` proposes repository-level tests for the
  shared counting function, service- and route-level tests for CSV export, and
  route-level tests for actor attribution. Each names the layer the existing
  suite already uses for that kind of behaviour. Good.
- **One gap in the draft's own list.** `team-practices.md:180-185` names three
  new test layers but omits the **view/UI layer** for the four new count-consuming
  surfaces. The existing suite has a presentation tier (`tests/views.test.js`, 12
  tests) that asserts rendered HTML via `data-testid`. The dashboard, the
  assignee directory, and the asset list's result count all render numbers, and
  the workbook's section 9 amendments cover Screens 01-04 and 10. The draft
  also does not mention that the MVP's *empty states* are deferred to a later
  increment while the existing suite has exactly one empty state
  (`views/list.ejs:40`, per `code-quality-assessment.md:429`) — so a
  view-level test asserting the empty state of a new surface would be testing
  deferred behaviour. The interview should settle whether new surfaces get
  view-level coverage in this release.

### 5. The `tests/db.test.js` legacy-migration gap needs a mandated rule, not just a table row

The brief asks me directly whether this needs a mandated rule. **It does.**

The draft handles the legacy-migration gap at `team-practices.md:163` and
`:167` as two rows in the "gaps we know about" table, both "closed by" the
`audit_log` rebuild work. That is the right *closure*, but it is recorded in
the wrong *place*, and the difference matters.

I verified the defect. `tests/db.test.js:59-93` builds a legacy `assets` table
on a raw `better-sqlite3` handle and inserts **exactly one asset row and zero
audit rows**:

```js
// tests/db.test.js:79
legacy.exec(`INSERT INTO assets (id, category, name, serial_or_key) VALUES ('legacy','hardware','Legacy','L-1')`);
```

There is no `audit_log` table in the legacy fixture at all. The cascade data
loss — `DROP TABLE assets` firing `ON DELETE CASCADE` and taking every audit
row with it, silently, with the transaction committed
(`code-quality-assessment.md:209-213`) — is therefore **structurally
unreachable** from this test. The test would still pass with the cascade
intact, with the cascade reversed, and with no cascade at all. It pins the
*column-addition* behaviour and nothing about *history preservation*.

That is not a gap that "closing it as part of the rebuild work" prevents from
recurring. It is a gap in the **fixture's shape**, and the fixture is the
thing most likely to be copied. The five greenfield MVP surfaces and the
rebuild migration will each want a "legacy database" fixture; if the fixture
pattern carries no audit rows, the next migration test inherits the same blind
spot.

**Recommended rule for the interview (it should become a `## Mandated` entry
once the human affirms it):**

> ALWAYS seed a migration or rebuild fixture with representative rows in
> **every** table the migration touches — including `audit_log` — and ALWAYS
> assert the post-migration row count and contents of those rows, not only the
> columns that were added. A migration test that carries no rows in the
> affected table cannot detect silent data loss.

This generalises beyond the specific cascade: it is the fixture-shape rule
that makes the *audit-log* rebuild, the *index* rebuild, and any future
migration test capable of failing for the right reason. It also subsumes
three of the seven gaps in the draft's table at `team-practices.md:159-167`
("no test asserts an audit row count", "no test asserts audit ordering across
many transitions", "the legacy-migration test carries no audit rows") into
one durable rule rather than three one-off work items.

Two supporting points the draft should carry:

- **The audit-row-count gap is confirmed and is broader than the draft says.**
  I grepped the whole suite for count assertions over `audit_log`: **there are
  none**. `tests/asset-service.test.js:107-112` is titled "records an audit
  entry per transition" but asserts only `data.audit.action` — the *latest*
  action, not a count. `tests/assets-repo.test.js:112-118` asserts only that
  `latestAuditFor` returns the most recent row. So the MVP's own success
  measure — **Audit Completeness**, the intent's primary metric per
  `discovered-rules.md:167` — has **no test anywhere that counts audit rows**.
  That is the sharpest statement of the gap and the draft should use it.
- **The "audit ordering across many transitions" gap is the one that
  distinguishes append-only history from a log that merely grows.** A row
  count proves rows exist; ordering proves they are a *history*. The MVP's
  invariant is append-only history, so the ordering assertion is the one that
  carries the invariant, and it should be specified test-first.

### 6. The remaining four gaps are confirmed, but two need dedicated tests rather than "closed by the work"

I verified each of the seven gaps in the draft's table directly.

| Gap | Verified | Assessment |
|---|---|---|
| No audit row count | Confirmed — zero count assertions on `audit_log` anywhere in `tests/` | Dedicated test; carries Audit Completeness |
| No audit ordering across transitions | Confirmed — no test performs a transition sequence and checks order | Dedicated test; carries the append-only invariant |
| No cascade assertion either way | Confirmed | Dedicated test, in the rebuild work |
| Legacy-migration test carries no audit rows | Confirmed — `tests/db.test.js:63-79` has no `audit_log` at all | Fixture-shape rule (section 5) |
| No case-insensitive duplicate rejected | Confirmed — `tests/db.test.js:27-33` inserts identical `'X'` twice, never a case variant; no `lower()`/`toLowerCase` in `tests/` | Dedicated test, written **before** the functional index (test-first) |
| No concurrent writers | Confirmed — the "burst" test at `tests/assets-repo.test.js:158-167` is a **sequential `for` loop** of 25 writes, self-described as "concurrent-style"; no `worker_threads`, no `child_process`, no `Promise.all` in `tests/` | Dedicated test; the draft's inversion target |
| No index list asserted after migration | Confirmed — no `PRAGMA index_list` anywhere in `tests/` | Dedicated test in the rebuild work |

The draft's table (`team-practices.md:159-167`) says these are each "closed by"
the work they guard, which is the right instinct and the right scoping for a
single-developer team. **But "closed by the work" is not the same as "tested".**
Two of these need a *named, dedicated* test obligation rather than an
assumption that the feature work will incidentally produce one:

- **The concurrent-writers test** cannot be produced incidentally. It needs a
  test harness that does not exist today: two connections to the same file
  database (not `:memory:`, which is per-connection and would not exercise
  locking at all — this is a real trap for whoever writes it), one holding a
  write transaction while the other attempts an insert, asserting the second
  receives a *retryable* error rather than a generic failure. **The test
  harness for this is new work** and should be estimated as such, exactly as
  the draft does for the linter and the CI pipeline. The draft does not flag
  it. Note also that the whole-tree `coverage.include` is `src/**/*.js` and the
  concurrency code will live in the repository layer, so a `:memory:`-only
  test suite would need a file-backed database fixture introduced for this one
  test.
- **The index-list-after-migration test** is a two-line `PRAGMA index_list`
  assertion, but it must run *after* the rebuild migration in the same
  process, against the migration ledger. It is cheap and it is the only thing
  that would catch the index-loss failure mode the scan verified
  (`code-quality-assessment.md:239-246`).

### 7. The CI quality-gate design is right in shape but has three unstated prerequisites

`team-practices.md:187-199` proposes lint -> test -> coverage against the 80%
floor, on every push and every pull request. I agree with the shape and the
ordering (lint before test is correct — a lint failure is faster feedback).

However, the draft describes a pipeline with **no host**. `evidence.md:257-261`
notices "CI platform is undecided... With no remote configured, there is nowhere
for a hosted runner to run against yet", but `team-practices.md` presents the
pipeline as a settled shape and only marks the *sign-off* question as
**To confirm**. Three prerequisites the draft does not state:

**(a) There is no remote.** `git remote -v` returns empty. There is no
`origin`, no push target, and therefore no hosted CI has anything to check
out. Every CI platform the draft implies (`.github/`, `.gitlab-ci.yml`,
`Jenkinsfile`, `azure-pipelines.yml`) is **pull-request-based and needs a
remote to exist before it can run even once**. This is a hard prerequisite on
the *release*, not a detail of the pipeline: until a remote is configured, the
`feature` scope's "CI execution before merge" cannot be satisfied by any of the
four platforms. **The interview must ask whether a remote will be configured in
this release, and on which host** — because the answer determines the entire
CI design, not just its config file.

**(b) A local pre-commit gate is the only thing that works today, and it is
free.** There are no active git hooks (`ls .git/hooks` shows only `.sample`
files) and `husky` is not a dependency. But the *realistic minimal gate* for a
single-developer team with no remote is **not** a CI pipeline at all — it is a
**local pre-commit hook** running the suite and the coverage check, which
works immediately, needs no remote, no runner, and no platform account, and
costs one dependency. The draft's pipeline-only answer leaves the team with
*no enforceable gate at all* for the whole period before a remote exists,
which given the release's single-developer, no-second-reviewer shape is the
window where a silent audit-history regression is most likely to land.

My recommendation: the posture should name **both** — a local pre-commit hook
as the *immediate* gate (available now, enforced by the tool) and a hosted CI
pipeline as the *durable* gate (available once a remote exists), with the
`feature` scope's "CI execution before merge" discharged by the hosted pipeline
once the remote exists, and the local hook covering the interval. If the
human declines to configure a remote in this release, the local hook becomes
the *only* gate and the practice should say so explicitly rather than leaving
the pipeline aspirational. I would put this to the human as a distinct
question — it is not covered by Q1-Q5 in `evidence.md:213-219`.

**(c) `better-sqlite3` is a native addon and the pipeline must be written for
it.** `better-sqlite3@11.10.0` has `"install": "prebuild-install ||
node-gyp rebuild --release"` — it downloads a prebuilt binary, falling back to
a **native compile**. On a CI runner this means: the image must have a matching
toolchain (or `prebuild-install` must be able to reach a prebuilt for the
runner's Node version and platform), and `npm ci` may compile from source,
which takes minutes. The draft's claim that "the suite runs in well under a
second, so the whole pipeline is comfortably inside the 'fast pipelines, fast
feedback' principle without any caching or parallelisation work"
(`team-practices.md:196-199`) measures the *test* time, not the *install* time.
The install step is the dominant cost of this pipeline and it is the step that
varies most between a developer's laptop and a runner. The npm registry is
reachable from this workspace (verified: `npm ping` -> PONG 766 ms), so
`prebuild-install` should succeed rather than fall back to `node-gyp`, but the
pipeline should pin the Node version to the `engines.node >= 20.0.0` floor
(`package.json:30`) and the `better-sqlite3` prebuild for that version, and
should not assume the install is fast. I would add a note that the pipeline's
budget is dominated by dependency installation, not by the 1.0 s suite.

### 8. What is missing from `discovered-rules.md` under testing posture

The draft's `discovered-rules.md` `## Mandated` carries three testing-posture
rules: the 66/66 baseline gate, CI before merge, and the 80% floor
(`discovered-rules.md:23-27`, `:129-138`). `## Forbidden` carries one: never
claim a coverage floor, linter, or CI pipeline as an existing practice
(`discovered-rules.md:197-203`). That last one is excellent — it is exactly the
"new work, not enforcement of an existing standard" distinction the draft
insists on elsewhere, promoted to a rule.

Three rules I believe are missing, all of which are candidates for the
interview to affirm:

**(a) The fixture-shape rule from section 5.** "ALWAYS seed a migration or
rebuild fixture with representative rows in every table the migration touches,
and ALWAYS assert the post-migration row count and contents of those rows."
This is the one that turns the cascade defect from a one-time finding into a
class of defect that cannot recur silently.

**(b) A rule that the coverage floor's scope is declared, not inherited.**
The floor's scope (global vs. per-file, and whether `src/server.js` is
excluded) is currently a **To confirm** item in `team-practices.md:201-206`
and an explicitly-not-yet-stated item in `discovered-rules.md:214-215`. Once
the human answers, this belongs as a `## Mandated` rule, because it is the
parameter that makes the floor enforceable at all. If the answer is
"per-file", it must also record the `server.js` treatment, or the rule is
stated in a form that fails on day one.

**(c) A rule that asserts on `err.code`, never on message text.** The draft
records this as a *preserved convention* in `## Code Style`
(`team-practices.md:336-343`), which is the right place for it as a code
convention. But it has a second, load-bearing testing meaning that the draft
misses: the scan's debt item 3 is that the current duplicate detection is a
**message-string match** — `String(e.message).includes('UNIQUE constraint
failed')` (`src/repositories/assets-repo.js:70`, per
`code-quality-assessment.md:281-292`). The MVP replaces this with a
functional index and a shared definition, and the error text is explicitly
"not part of SQLite's stable contract". A test that asserts on the *message*
of a duplicate error would be a test that breaks on a SQLite version bump and
that cannot distinguish a functional-index violation from a plain one — the
exact defect the MVP is fixing. The `err.code` discipline is therefore not
only a style preference; it is a **regression guard against reintroducing
message-coupled detection**. I recommend it be promoted to a `## Mandated`
rule in the form: "ALWAYS assert on `err.code` and NEVER on error message
text, in both application code and tests" — and that the MVP's uniqueness work
additionally assert the **specific** code/path so a functional-index violation
is distinguishable from a plain unique violation.

### 9. Two smaller items for the lead's integration

**(a) The inline FR/NFR traceability convention is thinner than the draft
implies.** `team-practices.md:174-178` calls it "a genuine traceability asset"
and commits to extending it. I measured its actual breadth: the suite
references **13 distinct ids** — `FR1.4, FR1.5, FR2, FR2.1, FR2.5, FR3, FR3.3,
FR4.5, FR4.6, FR4.7, FR4.8, NFR1, NFR5`. The bare group headings `FR2` and
`FR3` appear in `views.test.js:8` as file-level context. The MVP's approved
requirement set is far larger, and the draft's promise to "extend it" is a
real, unbudgeted obligation across every new test file. Two options for the
interview: mandate that **every** new MVP requirement id appears in at least
one `it(...)` title (a traceability gate that a human or a grep can check),
or scope it to the requirements the MVP actually implements. Left unstated,
this is a silent source of either drift or unbudgeted work.

**(b) The 66/66 baseline is correctly stated as a merge gate, but the count is
brittle.** `team-practices.md:144-150` states the baseline as "66 passed / 66
across 5 files" with a per-file breakdown. That is the right framing (a gate,
not a starting point) and I endorse it. But a rule that pins the *number* 66
breaks the moment the MVP adds its first regression test — and the MVP adds
many, by the standing condition (`discovered-rules.md:23-27`). The durable
form is: **the existing 66 tests must remain, unmodified in intent, and
passing; the count rises from 66.** A rule written as "66/66 must pass" would
need editing on the first feature commit and would then be wrong. I recommend
the lead phrase the rule in terms of "the pre-existing 66 tests", not the
literal number as a threshold. This also keeps the standing condition in
`discovered-rules.md:23-27` intact, since it says "the existing 66/66 passing
test baseline" in the past tense and does not need to change.

### 10. Summary of the position on each open question

- **Is `test-after` right?** Yes, with named-layer exceptions in `Ordering`.
  See section 3. I recommend against `custom`.
- **Is the 80% whole-tree floor achievable?** It is **already met** at 93.38%
  global line coverage. See sections 1-2. The gap is not in the existing
  modules.
- **Whole tree vs. touched modules?** The draft's binary is the wrong axis. The
  real axis is **global vs. per-file threshold**, and per-file fails today on
  `src/server.js` alone. See section 2.
- **Are the seven gaps each covered by the work that closes them?** Five, yes.
  Two need dedicated test obligations: the concurrent-writers test (needs a
  new file-backed-database harness) and the audit-row-count test (carries the
  Audit Completeness metric). See section 6.
- **Is the 66/66 baseline correctly a merge gate?** Yes in framing, no in
  form — pin "the existing 66 tests", not the literal count. See section 9(b).
- **Are the scope's testing additions recorded as new work?** Yes, and well:
  `discovered-rules.md:197-203` is exactly right. See section 7.

## Positions

- AGREE: The 80% floor is recorded as new work rather than an enforced existing standard — `discovered-rules.md:133-138` and `:197-203` draw exactly the right distinction, and the Forbidden rule against claiming a coverage floor, linter, or CI pipeline as an existing practice is the sharpest formulation of it in the draft.
- AGREE: The deliberate test-first inversion for the concurrency-safe uniqueness check — a race is not reliably reproducible by a test written after the code, so the inversion at `team-practices.md:125-132` is the correct call and the reasoning is sound.
- AGREE: The 66/66 baseline is a standing merge gate and the newly approved behaviour gets regression tests added alongside it, never in place of it — this matches the standing condition in `aidlc/spaces/default/memory/project.md` `## Decided` and is stated correctly.
- AGREE: The existing test idiom is preserved and extended — fresh `:memory:` database per spec, seeds through the service path, no test touching `data/`, and inline `FR`/`NFR` markers — this is a genuine traceability asset and keeping it costs nothing.
- AGREE: The seven named coverage gaps are real — I confirmed all seven directly in `tests/`, including that the "burst" test at `tests/assets-repo.test.js:158-167` is a sequential loop and that no count assertion over `audit_log` exists anywhere in the suite.
- AGREE: The new MVP test layers named at `team-practices.md:180-185` match the layer the existing suite already uses for that kind of behaviour, and the CI pipeline shape of lint -> test -> coverage is correct.
- OBJECT: The framing of the coverage-floor scope question at `team-practices.md:201-206` — the real choice is a global threshold versus a per-file threshold, and per-file fails today on `src/server.js` at 0%, so the drafted whole-tree-vs-touched-modules binary hides the only decision that actually matters.
- OBJECT: The implication that the 80% floor may require test work on the existing modules — the measured whole-tree line coverage is 93.38%, so the floor is met today with 13.38 points of surplus and the work is to make it enforceable rather than to reach it.
- OBJECT: The test-first inversion is applied to exactly one item — the migration rebuild needs it at least as much, and more, because the cascade data loss is silent and committed while a `SQLITE_BUSY` mis-mapping is observable, so the rebuild's "history preserved, `PRAGMA foreign_key_check` empty" specification is the highest-value place to write the test first.
- OBJECT: The "the existing suite is comprehensive and was written alongside the implementation" plank of the test-after justification at `team-practices.md:112-118` — a suite written with its implementation has seven named gaps and a legacy-migration test that could not have detected the defect it sat next to, so the argument is circular and the draft should rest on the schema-and-migration argument alone.
- OBJECT: The legacy-migration gap is handled only as a table row at `team-practices.md:163` and `:167` — the fixture at `tests/db.test.js:63-79` contains no `audit_log` table at all, so the blind spot lives in the fixture shape and will be copied by every future migration test unless a durable fixture-shape rule is mandated.
- OBJECT: The CI section omits that `git remote -v` is empty, so no pull-request-based CI platform can run even once — the absence of a remote is a prerequisite on the release, not a detail of the pipeline config, and the realistic minimal gate available today is a local pre-commit hook rather than a hosted runner.
- OBJECT: The CI section's speed claim at `team-practices.md:196-199` measures the 1.0 s suite but not the dominant cost — `better-sqlite3@11.10.0` installs via `prebuild-install || node-gyp rebuild --release`, so dependency installation, not the test run, is the pipeline's budget.
- OBJECT: `discovered-rules.md` has no rule requiring assertions on `err.code` rather than error message text — this is not only the style convention at `team-practices.md:336-343` but a regression guard against reintroducing the message-coupled duplicate detection at `src/repositories/assets-repo.js:70` that the MVP exists to replace.
- OBJECT: `discovered-rules.md` has no rule on the inline FR/NFR traceability obligation's breadth — the suite references only 13 distinct ids today and the MVP's requirement set is far larger, so "extend the convention" is unbudgeted work unless the scope of the obligation is decided.
- OBJECT: The 66/66 baseline is stated as a literal count in `team-practices.md:144-150` — that count rises on the MVP's first regression test, so the durable form is "the existing 66 tests must remain and pass", with the number rising from 66.
- OBJECT: The draft's new test layers at `team-practices.md:180-185` omit a view/UI layer for the four new count-consuming surfaces, even though the existing suite has a presentation tier that asserts rendered HTML via `data-testid` and the MVP adds numbers to three screens.
