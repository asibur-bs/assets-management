# Build and Test Summary

**Stage:** Build and Test (3.6) — Construction phase
**Scope:** `poc` · **Depth:** Minimal · **Test Strategy:** Minimal
**Methodology:** test-after
**Lead:** aidlc-quality-agent · **Support:** aidlc-devsecops-agent
**Run:** replayed on 2026-11-05 after the loop-back repair to code generation

## Overall Build Status

**Build: SUCCESS. Tests: SUCCESS (66/66). Target verification: PASSED — 30 of
31 applicable targets `Met`; the one exception (T-FR5.3) was deferred by
Code Generation by design.**

The application builds, installs, boots, and passes every test command in the
contract. The first run of this stage found a live defect — **T-FR3.3**, a
`returned` asset's detail page offering a "Mark returned" action the service
rejects with HTTP 400 — and looped back to code generation under the human's
"Retry with fix" authorization. That repair has been applied, independently
re-verified, and approved. This replay re-executes the full build and test
suite against the repaired source; **T-FR3.3 is now `Met`**.

The full evidence, the preserved first-run diagnosis, and the loop-back log
are in `test-results.md`.

## Prerequisites

- Node.js ≥ 20.0.0 (verified on v20.20.0, Linux)
- npm (ships with Node ≥ 20)
- No database server, container runtime, or other external service

## Test Type Inventory

| Test type | Generated at this stage? | Source of the obligation |
|-----------|--------------------------|---------------------------|
| Unit — database/schema/migration | No — covered by Code Generation | Testing Contract, strategy `minimal` |
| Unit — repository CRUD/search/filter/sort | No — covered by Code Generation | Testing Contract, strategy `minimal` |
| Unit — service state machine | No — covered by Code Generation | Testing Contract, strategy `minimal` |
| Route integration (supertest) | No — covered by Code Generation | Testing Contract, strategy `minimal` |
| View rendering | No — covered by Code Generation | Testing Contract, strategy `minimal` |
| Live end-to-end boot check | Yes — as a build-verification command in `build-instructions.md` | NFR3, NFR7 |
| Cross-unit requirement traceability | Yes — `cross-unit-traceability.md` | Step 10 of this stage |
| Performance / load suite | No | No performance NFR; NFR5's ≤5-user bound is met by the repository write-burst test |
| Security test suite | No | No security NFR; NFR6's privacy constraint is met by static review (no outbound client, no `eval`/`innerHTML`, no hardcoded secret, no unescaped template output) |

**Why no additional test instruction files were generated.** The active test
strategy in `aidlc-state.md` is `Minimal`. The stage file is explicit:
*"Minimal strategy — generate no additional test instruction files. Unit tests
are covered per-unit by Code Generation."* The stage file also allows the LLM
to generate additional types when context demands it; the context here did not
demand one. The Testing Contract's two obligations are both still satisfied —
the existing suite is green (66/66) and the `poc` scope adds no extra new-test
floor.

The `produces` list of this stage names `integration-test-instructions`,
`performance-test-instructions`, and `security-test-instructions`. Under the
Minimal strategy these are **not generated**; the strategy determines which
instruction files exist, and the stage's `required-sections` sensor is
disarmed in this scope (`ceremony.sensors: off`). The absence is recorded
here explicitly rather than left implicit.

## Coverage Expectations Per Unit

There is a single Unit — the entire `poc` application; there is no Unit DAG
and the directive carries no `unit`.

| Unit | Strategy | Coverage floor | Expected coverage |
|------|----------|-----------------|-------------------|
| `poc` (whole application) | Minimal | None — `poc` adds no coverage floor | Informational only: every FR/NFR target file exercised |

Measured coverage (informational, `npx vitest run --coverage --dir tests`):

| File | % Stmts | % Branch | % Funcs |
|------|---------|----------|---------|
| All files | 93.38 | 83.33 | 96.42 |
| `src/app.js` | 96.55 | 77.77 | 100 |
| `src/server.js` | 0 | 0 | 0 |
| `src/db/index.js` | 85.71 | 40 | 100 |
| `src/db/migrate.js` | 100 | 90.9 | 100 |
| `src/repositories/assets-repo.js` | 98.62 | 97.5 | 100 |
| `src/routes/assets.js` | 97.87 | 73.33 | 100 |
| `src/services/asset-service.js` | 98.26 | 88.88 | 100 |

`src/server.js` shows 0% because it is the process entry point; it is covered
by the live boot check (B4/B5) rather than by a unit test.

## Target Verification Matrix

One row per applicable target. Actual values, evidence, and the final verdict
for every row are finalized in `test-results.md`; the table below is that same
matrix. No `Pending` verdict remains.

**31 applicable targets — 30 `Met`, 1 `Not Met` (T-FR5.3, deferred by
Code Generation by design).**

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

No target qualifies for the single explanatory `N/A` row: every applicable
target has an executable local check or a documented static/live verification.

## Readiness Assessment

| Dimension | Assessment |
|-----------|------------|
| **Build-ready** | **Yes.** `npm install` succeeds; `node --check src/server.js` exits 0; the database opens and migrates (B1–B3 all pass). Re-verified on the replay run. |
| **Test-ready** | **Yes.** All six documented test commands pass; 66/66 tests green across 5 files. The coverage report generates cleanly. |
| **Deployment-ready** | **Yes**, for the `poc` scope. Every build and test command passes, the defect found on the first run is repaired and independently re-verified, and the only non-`Met` target (T-FR5.3) was deferred by design. The stage's failure predicate does not fire. |

## Known Limitations and Outstanding Items

1. **FR5.3 — Deferred by Code Generation.** The full audit log is not exposed
   in the UI; only the most recent entry appears on the detail view. Carried
   forward from `traceability.json` and surfaced again at the coverage gate.
   This is the one applicable target that is not `Met`, and it is a
   deliberate deferral, not a defect.
2. **`src/server.js` at 0% line coverage.** The process entry point is
   covered by the live boot check rather than by a unit test. This is
   acceptable for the `poc` scope (no coverage floor) and is documented in
   `code-summary.md`.
3. **NFR2's latency bound, NFR5's load bound, and NFR6's privacy bound are not
   enforced by an automated harness.** Their measurable parts are covered
   (case-insensitive search, write-burst consistency, static review). The
   owning stages (`performance-validation`, `security-review`) are skipped in
   this scope.
4. **NFR2's search is not indexed, and cannot be cheaply.** The search is
   `LOWER(name) LIKE ? OR LOWER(serial_or_key) LIKE ?` — a leading-wildcard
   `LIKE` that `EXPLAIN QUERY PLAN` shows as `SCAN assets`. A B-tree index
   would not accelerate it; a real fix needs SQLite FTS5 or a trigram table,
   which expands the `poc` scope and requires a migration on every
   developer's existing database. NFR2 is a user-perception bound ("locatable
   in 5 seconds or fewer"), not an indexing requirement, and it holds at
   `poc` scale. The traceability note now states this honestly rather than
   claiming an index that does not exist.
5. **`unit-test-instructions.md` carries two Minor documentation
   inconsistencies** flagged by the code-generation reviewer: its `## Result`
   section still reports the pre-repair suite size (65 rather than 66), and
   its `## Files` row for `tests/views.test.js` omits FR3.3. Neither affects
   a command, a threshold, or runtime behaviour. They were left open because
   that file is byte-bound by the code-generation Plan Approval fingerprint,
   so correcting them would require a further Plan Approval round. The
   authoritative test counts are in `test-results.md` and `code-summary.md`.
