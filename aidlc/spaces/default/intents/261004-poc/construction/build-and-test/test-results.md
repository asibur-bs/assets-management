# Test Results

**Stage:** Build and Test (3.6) · **Scope:** `poc` · **Strategy:** Minimal
**Executed:** 2026-11-05 (first run) · **Re-executed:** 2026-11-05 (after the
loop-back repair to code generation)
**Outcome:** Build and all test commands **succeeded**. Every applicable
target is now **Met**, except **T-FR5.3**, which was deliberately deferred by
Code Generation and is not a regression. The stage's failure predicate no
longer fires. See "Replay Outcome" below and the preserved "Failure Ladder
Outcome" and "Loop-Back Log" sections.

## Replay Outcome (after the loop-back repair)

This document was originally written by the first run of this stage, which
found a live defect (T-FR3.3) and looped back to code generation under the
human's "Retry with fix" authorization. Code generation repaired the defect
and the stage was approved; this run re-executes the full build and test
suite against the repaired source.

**Everything below was re-run fresh against the repaired workspace.** The
first run's evidence is preserved verbatim in "Failure Ladder Outcome" and
"Loop-Back Log" so the diagnosis that produced the repair remains auditable.

**The repair, verified independently.** A separate verification pass
re-constructed the pre-repair `views/detail.ejs` in a throwaway copy of the
project and re-ran `tests/views.test.js` against it: **1 failed / 11 passed**,
failing exactly on the assertion that `data-testid="action-return"` is absent
for a `returned` asset. The new regression test is therefore non-vacuous — it
pins the defect rather than passing regardless of implementation. The same
pass confirmed that `src/services/asset-service.js`'s `TRANSITIONS` map is
byte-identical to its pre-repair state (`returned → {assigned, lost}`,
`lost → {}`), so the repair was view-only and the state machine was not
weakened.

## Build Status

**SUCCESS.**

| # | Check | Command | Result |
|---|-------|---------|--------|
| B1 | Dependencies installed | `npm ls --depth=0` | All 6 declared packages present (`better-sqlite3@11.10.0`, `ejs@3.1.10`, `express@4.22.3`, `vitest@2.1.9`, `@vitest/coverage-v8@2.1.9`, `supertest@7.3.1`); no unmet dependency |
| B2 | Entry point parses | `node --check src/server.js` | Exit 0, no output |
| B3 | Database opens and migrates | `node -e "…openDatabase(':memory:')…select count(*) from assets"` | Printed `0`, exit 0 |
| B4 | App boots and serves | `node src/server.js` on `PORT=3197`, `curl /assets` | `200` |
| B5 | Root redirects to the list | `curl /` | `302` → `http://localhost:3197/assets` |
| — | Static assets served | `curl /static/styles.css` | `200` |

Boot log: `Asset tracker listening on http://localhost:3197`. The server was
stopped and the throwaway database removed after the check.

**Replay re-run (2026-11-05, post-repair).** B1–B5 and the static-asset check
were all re-executed against the repaired workspace and returned identical
results: B1 all 6 declared packages present with no unmet dependency; B2 exit
0 with no output; B3 printed `0`; B4 `200`; B5 `302` →
`http://localhost:3197/assets`; static assets `200`. The boot log was the
same. The server was stopped and the throwaway database removed afterwards.

## Test Results

Each distinct command from `unit-test-instructions.md` was run once.

| # | Command | Test files | Tests | Result |
|---|---------|-----------|-------|--------|
| T1 | `npx vitest run tests/db.test.js` | 1 | 7 | **PASS** |
| T2 | `npx vitest run tests/assets-repo.test.js` | 1 | 15 | **PASS** |
| T3 | `npx vitest run tests/asset-service.test.js` | 1 | 18 | **PASS** |
| T4 | `npx vitest run tests/routes.test.js` | 1 | 14 | **PASS** |
| T5 | `npx vitest run tests/views.test.js` | 1 | 12 | **PASS** |
| T6 | `npx vitest run --dir tests` | 5 | 66 | **PASS** |

**Totals: 5 test files, 66 tests — 66 passed, 0 failed, 0 skipped.**

> The first run of this stage recorded 65 tests (T5 = 11, T6 = 65). The
> loop-back repair added one `returned`-state view case to
> `tests/views.test.js`, so T5 is now 12 and T6 is 66.

Whole-unit duration 766 ms; coverage run 1.0 s.

No command failed. The `poc` scope adds no coverage floor and no extra
new-test obligation; the Testing Contract's "keep the existing suite green"
obligation is met.

## Coverage Report

`npx vitest run --coverage --dir tests` → 66/66 pass.

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
-------------------|---------|----------|---------|---------|
```

`src/server.js` shows 0% because it is the process entry point. It is covered
by the live boot check (B4/B5) rather than by a unit test — acceptable under
the `poc` scope's absence of a coverage floor, and already documented in
`code-summary.md`.

## Failure Details

> This section preserves the **first run's** failure diagnosis, which produced
> the loop-back repair. The defect has since been fixed and re-verified; the
> resolution is recorded in "Replay Outcome" above and in the T-FR3.3 row of
> the matrix below. The original evidence is kept verbatim so the diagnosis
> that drove the repair stays auditable.

### T-FR3.3 — the detail view offers an action the service rejects

**Verdict on the first run: Not Met. Verdict on the replay: Met.**

**Reproduction (first run).** A live HTTP probe drove one asset into each of
the four states on its own asset, read the action forms the detail page
rendered, and POSTed each offered action against a **fresh** asset in the
same state so no transition could contaminate the next result.

```
--- state in-stock (db status: in-stock) ---
  offers: assign[assign-input]
  POST /assign on a fresh in-stock asset -> HTTP 302 (state now assigned)

--- state assigned (db status: assigned) ---
  offers: return[form-return], lost[form-lost]
  POST /return on a fresh assigned asset -> HTTP 302 (state now returned)
  POST /lost   on a fresh assigned asset -> HTTP 302 (state now lost)

--- state returned (db status: returned) ---
  offers: return[form-return], lost[form-lost], assign[reassign-input]
  POST /return on a fresh returned asset -> HTTP 400 (state now returned)   <<< OFFERED BUT REJECTED
  POST /lost   on a fresh returned asset -> HTTP 302 (state now lost)
  POST /assign on a fresh returned asset -> HTTP 302 (state now assigned)

--- state lost (db status: lost) ---
  offers: (none)

=== FR3.3 FINDINGS ===
  DEFECT: state 'returned': detail page offers return (form-return) but POST /return -> HTTP 400
```

**Root cause.** `views/detail.ejs:31` merges the `assigned` and `returned`
states into a single branch:

```ejs
  <% } else if (asset.status === 'assigned' || asset.status === 'returned') { %>
    <form method="post" action="/assets/<%= asset.id %>/return" class="inline" data-testid="form-return">
      <button type="submit" class="btn" data-testid="action-return">Mark returned</button>
    </form>
```

The "Mark returned" form is therefore rendered for a `returned` asset. The
service's transition table (`src/services/asset-service.js:8`) allows
`returned → assigned` and `returned → lost` only — `returned → returned` is
not a valid transition, so `assertTransition` throws `INVALID_TRANSITION`
and the route surfaces HTTP 400.

**Requirement impact.** FR3.3 requires the detail view to offer the actions
appropriate to the asset's current state; FR4.4 defines the valid transitions
out of `returned` as `assigned` and `lost` only. The view contradicts the
state machine. FR4.4 itself is enforced correctly at the service layer — the
defect is view-only.

**Why the suite stayed green.** `tests/views.test.js` covers the action
forms for `in-stock` (line 86), `assigned` (line 97), and `lost` (line 109).
There is **no test case for the `returned` state**, so the one state in which
the view and the state machine disagree is the one state that is untested.

**Scope of the defect.** One template branch. The `in-stock`, `assigned`, and
`lost` states all render exactly the valid actions, and every action they
offer succeeds.

### T-FR3.3 — resolution (replay run)

**Verdict: Met.** The repair applied by code generation is verified complete
and correct by three independent means.

**1 — The live per-state probe (re-run).** The same probe that found the
defect was re-run against the repaired workspace. Every offered action now
returns HTTP 302; no offered action is rejected.

```
=== state: in-stock ===
  offered actions (data-testid): action-assign
  action-assign: POST /assets/:id/assign -> HTTP 302

=== state: assigned ===
  offered actions (data-testid): action-return, action-lost
  action-return: POST /assets/:id/return -> HTTP 302
  action-lost:   POST /assets/:id/lost   -> HTTP 302

=== state: returned ===
  offered actions (data-testid): action-lost, action-reassign
  action-lost:     POST /assets/:id/lost   -> HTTP 302
  action-reassign: POST /assets/:id/assign -> HTTP 302

=== state: lost ===
  offered actions (data-testid): (none)

RESULT: ALL OFFERED ACTIONS RETURNED HTTP 302
```

The `returned` state no longer offers `action-return`. The `assigned` branch
and the `lost` branch are unchanged.

**2 — The live end-to-end smoke (re-run).** The application was booted with
`node src/server.js` against a fresh SQLite file and driven over HTTP with
`curl`:

```
POST /assets              -> 302 -> http://localhost:3197/assets
  detail (in-stock)       -> data-testid="action-assign"
POST /assets/:id/assign   -> 302
  detail (assigned)       -> data-testid="action-lost", "action-return"
POST /assets/:id/return   -> 302
  detail (returned)       -> data-testid="action-lost", "action-reassign"   <<< no action-return
  asset-assigned-at       -> 2026-11-05T13:48:36.895Z
  asset-returned-at       -> 2026-11-05T13:48:36.927Z
POST /assets (duplicate)  -> 400
```

Duplicate detection still returns 400 and both lifecycle timestamps populate,
so the repair introduced no regression in FR1.3, FR4.6 or FR4.7.

**3 — The regression test is non-vacuous.** The pre-repair template branch
was reconstructed in a throwaway copy of the project and
`tests/views.test.js` was run against it: **1 failed / 11 passed**, failing
exactly on `expect(res.text).not.toContain('data-testid="action-return"')` at
`tests/views.test.js:120`. The new test fails against the broken view and
passes against the repaired view, so it pins the defect rather than passing
regardless of implementation.

**The state machine was not weakened.** `src/services/asset-service.js`'s
`TRANSITIONS` map is byte-identical to its pre-repair state — `in-stock →
{assigned}`, `assigned → {returned, lost}`, `returned → {assigned, lost}`,
`lost → {}`. The repair was view-only. Runtime enforcement was re-confirmed:
`returned → returned`, `lost → lost`, `lost → assigned` and `lost → returned`
all still raise `INVALID_TRANSITION`.

### Other findings

No other command failure, and no other target failure. The static security
review for NFR6 found nothing:

- no outbound HTTP client (`https`, `axios`, `node-fetch`, `got`, `request` —
  none required or called);
- no `eval`, `new Function`, `innerHTML`, or `document.write`;
- no hardcoded credential, secret, API key, or token;
- no unescaped template output — every user-supplied value is rendered with
  `<%= %>` (which escapes), and the only `<%- %>` uses are `include()`
  directives and the `_layout.ejs` body passthrough;
- the two SQL string interpolations in `src/db/migrate.js:36,39` interpolate
  only the hardcoded literals `'assets'`, `'assigned_at'`, `'returned_at'`,
  and `'TEXT'`; no user input reaches them. All user-supplied query values in
  `src/repositories/assets-repo.js` use `?` placeholders, and the two
  interpolated sort variables are constrained by a whitelist.

## Finalized Target Verification Matrix

Exactly one final verdict per applicable target. No `Pending` remains.

| Target ID | Source | Expected | Actual | Evidence | Owning Stage | Verdict |
|-----------|--------|----------|--------|----------|--------------|---------|
| T-FR1.1 | `requirements.md` §FR1.1 | Missing required fields → `VALIDATION_ERROR` | `VALIDATION_ERROR` raised | `npx vitest run tests/routes.test.js` — PASS (14/14) | — | **Met** |
| T-FR1.2 | `requirements.md` §FR1.2 | Optional fields stored and rendered | Stored and rendered | `npx vitest run tests/routes.test.js` — PASS | — | **Met** |
| T-FR1.3 | `requirements.md` §FR1.3 | Duplicate `(category, serial_or_key)` → `DUPLICATE_ASSET` | `DUPLICATE_ASSET` raised; live duplicate POST → HTTP 400 | `npx vitest run tests/assets-repo.test.js` — PASS (15/15); live smoke | — | **Met** |
| T-FR1.4 | `requirements.md` §FR1.4 | Redirect to `/assets` on success | HTTP 302 → `/assets` | `npx vitest run tests/routes.test.js` — PASS; live smoke `POST /assets` → 302 | — | **Met** |
| T-FR1.5 | `requirements.md` §FR1.5 | UUID + timestamps + `status='in-stock'` | Random UUID, `created_at`/`updated_at` set, `status='in-stock'` | `npx vitest run tests/db.test.js` — PASS (7/7) | — | **Met** |
| T-FR2.1 | `requirements.md` §FR2.1 | List columns present | All five columns present | `npx vitest run tests/views.test.js` — PASS (12/12) | — | **Met** |
| T-FR2.2 | `requirements.md` §FR2.2 | Case-insensitive search on name / serial | Works on both fields | `npx vitest run tests/assets-repo.test.js` — PASS | — | **Met** |
| T-FR2.3 | `requirements.md` §FR2.3 | Filter by category and status | Both filters work | `npx vitest run tests/assets-repo.test.js` — PASS | — | **Met** |
| T-FR2.4 | `requirements.md` §FR2.4 | Sort by name / created_at, asc / desc | Both sorts and both directions work | `npx vitest run tests/assets-repo.test.js` — PASS | — | **Met** |
| T-FR2.5 | `requirements.md` §FR2.5 | Row links to `/assets/:id` | Links present | `npx vitest run tests/views.test.js` — PASS | — | **Met** |
| T-FR3.1 | `requirements.md` §FR3.1 | All asset fields shown, incl. both timestamps | All fields shown, incl. `assigned_at` / `returned_at` | `npx vitest run tests/views.test.js` — PASS | — | **Met** |
| T-FR3.2 | `requirements.md` §FR3.2 | Most recent audit entry shown | Shown in the audit section | `npx vitest run tests/views.test.js` — PASS | — | **Met** |
| T-FR3.3 | `requirements.md` §FR3.3 | Action forms match the current state; every offered action is valid | `in-stock` offers `action-assign`; `assigned` offers `action-return` + `action-lost`; `returned` offers `action-lost` + `action-reassign` and **no** `action-return`; `lost` offers none. Every offered action POSTs to HTTP 302 — no offered action is rejected. | `npx vitest run tests/views.test.js` — PASS (12/12); live per-state HTTP probe (transcript in "T-FR3.3 — resolution"); live end-to-end smoke; mutation check against the reconstructed pre-repair view — 1 failed / 11 passed | — | **Met** |
| T-FR4.1 | `requirements.md` §FR4.1 | Exactly four states | Four states in `TRANSITIONS` | `npx vitest run tests/asset-service.test.js` — PASS (18/18) | — | **Met** |
| T-FR4.2 | `requirements.md` §FR4.2 | `in-stock → assigned` only | Enforced | `npx vitest run tests/asset-service.test.js` — PASS | — | **Met** |
| T-FR4.3 | `requirements.md` §FR4.3 | `assigned → returned` / `assigned → lost` | Enforced | `npx vitest run tests/asset-service.test.js` — PASS | — | **Met** |
| T-FR4.4 | `requirements.md` §FR4.4 | `returned → assigned` / `returned → lost` | Enforced correctly in the service (`TRANSITIONS.returned = {assigned, lost}`). The view-side violation found on the first run has been repaired: the `returned` state no longer offers `returned → returned`, and the `TRANSITIONS` map is byte-identical to its pre-repair state. | `npx vitest run tests/asset-service.test.js` — PASS; live probe; runtime confirmation that `returned → returned` still raises `INVALID_TRANSITION` | — | **Met** |
| T-FR4.5 | `requirements.md` §FR4.5 | `lost` is terminal | Terminal; the detail page renders no action form | `npx vitest run tests/asset-service.test.js` — PASS; live probe (offers none) | — | **Met** |
| T-FR4.6 | `requirements.md` §FR4.6 | Assignee + `assigned_at` recorded | Both recorded | `npx vitest run tests/asset-service.test.js` — PASS | — | **Met** |
| T-FR4.7 | `requirements.md` §FR4.7 | Assignee cleared + `returned_at` recorded | Both recorded | `npx vitest run tests/asset-service.test.js` — PASS | — | **Met** |
| T-FR4.8 | `requirements.md` §FR4.8 | `updated_at` written on every update | Written on every update | `npx vitest run tests/assets-repo.test.js` — PASS | — | **Met** |
| T-FR5.1 | `requirements.md` §FR5.1 | Audit rows carry timestamp, action, description | All three fields present | `npx vitest run tests/assets-repo.test.js` — PASS | — | **Met** |
| T-FR5.2 | `requirements.md` §FR5.2 | Most recent audit entry shown | Shown | `npx vitest run tests/views.test.js` — PASS | — | **Met** |
| T-FR5.3 | `requirements.md` §FR5.3 | Full audit log exposed in the UI | Deferred by Code Generation: only the most recent entry is exposed, on the detail view | `construction/code-generation/traceability.json` (`status: Deferred`) | — (deferred in `poc`) | **Not Met** (deferred by design) |
| T-NFR1 | `requirements.md` §NFR1 | Registration ≤2 clicks from the list | `data-testid="nav-new"` present on the list view; registration reachable in 1 click from the list | Live smoke `GET /assets` | — | **Met** |
| T-NFR2 | `requirements.md` §NFR2 | Asset locatable in ≤5 s | Case-insensitive search over `name` / `serial_or_key` returns the filtered list. No supporting index exists: the search is a leading-wildcard `LIKE`, which would not use a B-tree index even if one were created — `EXPLAIN QUERY PLAN` returns `SCAN assets` + `USE TEMP B-TREE FOR ORDER BY`. The requirement is a user-perception bound ("locatable in 5 seconds or fewer"), not an indexing requirement, and it holds for a `poc`-sized dataset. | `npx vitest run tests/assets-repo.test.js` — PASS; index inspection in `src/db/migrations.sql`; `EXPLAIN QUERY PLAN` | `performance-validation` (skipped in this scope) | **Met** (searchable; the ≤5 s perception bound is not independently measured — no owning stage in this scope) |
| T-NFR3 | `requirements.md` §NFR3 | One `npm start`, no external service | Booted; `GET /` → 302; no external service contacted | Build checks B4/B5; static scan found no outbound client | — | **Met** |
| T-NFR4 | `requirements.md` §NFR4 | Single Linux/macOS host | Runs on Linux with `npm install && npm start`; steps documented | `README.md`; B1–B5 | — | **Met** |
| T-NFR5 | `requirements.md` §NFR5 | Concurrent access from ≤5 users consistent | Write-burst consistency test passes; WAL journalling and foreign keys enabled | `npx vitest run tests/assets-repo.test.js` — PASS | `performance-validation` (skipped in this scope) | **Met** |
| T-NFR6 | `requirements.md` §NFR6 | No PII beyond assignee name; nothing sent externally | No outbound client, no `eval`/`innerHTML`, no hardcoded secret, all user output escaped via `<%= %>` | Static source review (see "Other findings") | `security-review` (skipped in this scope) | **Met** |
| T-NFR7 | `requirements.md` §NFR7 | Runnable end-to-end with a README | Boot, list, registration (unique → 302, duplicate → 400), and static assets all verified live | `README.md`; B4/B5; live smoke | — | **Met** |

**Summary:** 31 applicable targets — **30 Met, 1 Not Met** (T-FR5.3). T-FR5.3
was deliberately deferred by Code Generation and is not a regression; it is
recorded as `Not Met (deferred by design)` against a `poc` scope that
requires no full audit-log UI. T-FR3.3, which was a live defect on the first
run of this stage, has been repaired and re-verified as **Met**.

> **Correction to the first run's tally.** The first run reported "36
> applicable targets — 34 Met, 2 Not Met". 36 is the number of upstream IDs
> in `traceability.json` (the `FR1`–`FR5` group headings plus their member
> rows), not the number of testable targets. The inventory's
> "Applicable / Non-Applicable Determination" section states **31** leaf
> targets (24 FR + 7 NFR), all applicable, with no `N/A` row — and the matrix
> below carries exactly 31 rows. The tally is corrected here to 31
> applicable targets. The first run's per-target verdicts were not affected;
> only the count was wrong.

**The failure predicate does not fire on this replay.** Every build command
and every test command succeeded, and the only non-`Met` applicable target is
the deliberately deferred T-FR5.3.

## Failure Ladder Outcome (first run — preserved)

> This section preserves the first run's failure-ladder analysis, which
> produced the loop-back to code generation. The ladder's rung 4 (halt-and-ask)
> fired and the human chose "Retry with fix"; the loop-back has since been
> executed and its repair verified. No ladder rung fires on this replay.

The failure predicate fires: T-FR3.3 is `Not Met`.

**Rung 1 — in-stage fix (max 2 attempts): NOT APPLICABLE.** The root cause is
not in this stage's test configuration, build scripts, environment setup, or
executable check. The build configuration and the test scaffolding are
correct; the defect is in generated application source (`views/detail.ejs`),
which this stage's own remit does not cover. Applying a fix here would
exceed the stage's remit.

**Rung 2 — classify and estimate impact.** The root cause lies in the
generated source, not in a swappable build dimension (library/version,
container image, instance type, algorithm, flag). The correct fix is a
one-line template change, not a swap. Estimated impact is recorded below
and in the halt-and-ask question.

**Rung 3 — autonomous bounded loop-back: NOT APPLICABLE.** `aidlc-state.md`
records no `Construction Autonomy Mode` field, so the mode is unset and rung
3 does not apply. (It applies only when the mode is `autonomous`.)

**Rung 4 — halt-and-ask: APPLIES.** The mode is unset, the failure must be
put to the human, and giving up is the human's decision. The candidate fix
and its estimated impact are presented in the halt-and-ask question.

### Candidate Fixes and Estimated Impact

**Candidate 1 — Split the `assigned` and `returned` branches in the template**
(recommended).

- Change `views/detail.ejs:31` from
  `asset.status === 'assigned' || asset.status === 'returned'` to a separate
  `assigned` branch and a separate `returned` branch, so the `returned`
  branch renders only the "Mark lost" and "Re-assign" forms and not the
  "Mark returned" form.
- Add a `tests/views.test.js` case asserting that the detail page of a
  `returned` asset does **not** contain `data-testid="action-return"` and
  does contain `data-testid="action-reassign"` and `data-testid="action-lost"`.
- Correct the FR3.3 note in `construction/code-generation/traceability.json`,
  which currently describes the action forms as "correct for the current
  state".
- **Estimated impact — effort:** ~15 minutes; one template branch, one test
  case, one traceability note. **Financial cost:** none. **Risk:** low. The
  change removes a form that always fails; no valid transition is affected,
  because `returned → returned` is not a valid transition in FR4.4. The
  `assigned` branch and the `lost` branch are untouched. The added test
  asserts the corrected behaviour and closes the untested-state gap that let
  the defect through.
- **Verification:** re-run `npx vitest run tests/views.test.js`,
  `npx vitest run --dir tests`, and the live per-state FR3.3 probe.

**Candidate 2 — Accept the failure and proceed to the approval gate.**

- **Estimated impact — effort:** none. **Financial cost:** none.
  **Risk:** medium. A user who clicks "Mark returned" on a returned asset
  gets a 400 error page. FR3.3 is not met; the poc ships with one broken
  action in the primary lifecycle view, and the untested-state gap remains.

**Candidate 3 — Relax the target.**

- Not offered. The stage file states plainly: *"Weakening, relaxing, lowering,
  or disabling a defined quality target is never an acceptable fix."*

### What is NOT required

No library, version, image, instance type, algorithm, or flag swap is
involved. The service layer, the state machine, the database schema, and the
test framework are all correct and stay as they are. This is a one-line
view-layer correction plus one regression test.

## Loop-Back Log

No loop-back has been attempted yet. The bound is 3 entries per intent; this
log is append-only and survives re-runs of this stage.

<!-- Entries are appended below by the loop-back procedure. -->

### Loop-back 1 — 2026-11-05T12:45:00Z

- **Diagnosis:** T-FR3.3 is `Not Met`. The `returned` state's detail page
  renders a "Mark returned" form whose POST is rejected with HTTP 400
  (`INVALID_TRANSITION`), because `views/detail.ejs:31` merges the `assigned`
  and `returned` states into one branch while the service's transition table
  allows only `returned → assigned` and `returned → lost` (FR4.4). The
  `returned` state has no test case in `tests/views.test.js`, so the suite
  stayed green at 65/65 and did not surface it.
- **Root-cause stage:** code-generation. The defect is in generated
  application source (`views/detail.ejs`) and in the traceability note that
  describes it (`construction/code-generation/traceability.json`), both of
  which belong to code generation's remit — not to this stage's test
  configuration, build scripts, or environment setup.
- **Planned fix:** (1) In `views/detail.ejs`, split the merged
  `assigned || returned` branch into two, so the `returned` branch renders
  only the "Mark lost" and "Re-assign" forms and not the "Mark returned" form.
  (2) In `tests/views.test.js`, add a `returned`-state case asserting the
  detail page does **not** contain `data-testid="action-return"` and does
  contain `data-testid="action-reassign"` and `data-testid="action-lost"`.
  (3) In `construction/code-generation/traceability.json`, correct the FR3.3
  note so it no longer claims the actions are rendered for the current state
  unconditionally. (4) In `construction/code-generation/cross-unit-traceability.md`'s
  source artifact, apply the Finding 2 note correction for NFR2 — change
  "Indexed search over name and serial_or_key" to an accurate description, or
  record the decision to add an index, as the human directs.
- **Estimated impact:** effort ~15 minutes for items 1–3; financial cost none;
  risk low. The change removes a form that always fails and leaves every valid
  transition (`returned → assigned`, `returned → lost`) working. The `assigned`
  and `lost` branches are untouched. The added test asserts the corrected
  behaviour and closes the untested-state gap. Item 4 is a documentation
  correction with no runtime effect.
- **Authorized by:** the human's "Retry with fix" answer to the Build-and-Test
  failure halt-and-ask. This is a human-directed loop-back and therefore
  consumes one of the 3 permitted entries.

### Loop-back 1 — resolution (2026-11-05T13:50:00Z)

- **Resolution:** the planned fix was applied in full, in code generation, and
  was independently re-approved at that stage's own gate (reviewer verdict
  READY) before this stage replayed.
  - *Item 1* — `views/detail.ejs`: the merged `assigned || returned` branch
    was split. The `returned` branch renders only the "Mark lost" and
    "Re-assign" forms; the "Mark returned" form is gone.
  - *Item 2* — `tests/views.test.js`: a `returned`-state case was added,
    asserting `data-testid="action-return"` is absent and that
    `data-testid="action-lost"` and `data-testid="action-reassign"` are
    present. The file now holds 12 tests (was 11).
  - *Item 3* — `construction/code-generation/traceability.json`: the FR3.3
    note now describes the per-state form set accurately.
  - *Item 4* — the NFR2 note was corrected to drop the unsupported "Indexed
    search" claim and to record that no supporting index exists, because the
    search is a leading-wildcard `LIKE`. No schema change or index was added;
    the NFR2 requirement itself (a user-perception bound) is met.
- **Verification on this replay:** the full suite re-ran at **66/66**; the
  live per-state HTTP probe shows every offered action POSTing to HTTP 302
  with no invalid transition offered; the live end-to-end smoke confirms the
  `returned` detail page offers `action-lost` and `action-reassign` only;
  and a mutation check against a reconstructed pre-repair view makes the new
  test **fail** (1 failed / 11 passed), proving it is non-vacuous.
- **T-FR3.3 verdict:** **Met** (was: Not Met).
- **Impact realized:** as estimated — no valid transition was affected, no
  target was weakened, and the untested-state gap that let the defect through
  is now closed. The `TRANSITIONS` map is byte-identical to its pre-repair
  state.
- **Remaining `Not Met`:** T-FR5.3 only — deferred by Code Generation by
  design, not a regression.
- **Loop-back budget:** 1 of the 3 permitted entries consumed.
