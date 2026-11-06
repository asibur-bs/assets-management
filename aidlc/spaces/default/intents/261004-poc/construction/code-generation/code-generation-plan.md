# Code Generation Plan

**Target**: AIDLC-STAGE: code-generation (zero-Unit stage-level path; `poc` scope, greenfield, test-after, Minimal strategy).

This plan implements the asset-tracking web application described in `aidlc/spaces/default/intents/261004-poc/inception/requirements-analysis/requirements.md`. It is a single vertical slice that exercises every layer end-to-end: data model, repository, business logic, HTTP endpoints, and HTML views.

## Stack Decisions

- **Runtime**: Node.js 20.x
- **Web framework**: Express 4.x (server-rendered, minimal middleware stack)
- **Templating**: EJS (no client-side JS framework, per Q10)
- **CSS**: Plain hand-written CSS in `public/styles.css` (no Tailwind/UI library)
- **Persistence**: SQLite via `better-sqlite3` (synchronous, embedded, single-file)
- **Tests**: Vitest (chosen over Jest for native ESM support and speed; one runner config covers unit and integration tests)
- **Project layout**: single-repo, files at workspace root

## Story-to-Step Traceability

| Requirement | Plan Step(s) |
|-------------|---------------|
| FR1 (registration) | Steps 4, 6, 8, 10, 12, 16 |
| FR2 (list view) | Steps 4, 8, 10, 12 |
| FR3 (detail view) | Steps 4, 8, 10, 12, 19, 20, 21 |
| FR4 (lifecycle) | Steps 5, 7, 9, 10, 12, 15, 17 |
| FR5 (audit) | Steps 5, 7, 10, 12 |
| NFR1–NFR7 | Steps 1, 13, 14, 21 |

## Requirement-Conformance Corrections

An earlier pass already wrote the workspace files listed in
`source-manifest.json`. That pass did not satisfy every requirement in
`requirements.md`, so Step 4 is a conformance pass over the existing code, not
a greenfield write. Each item below names the requirement, what the current
code does, and the behaviour the implementation must have.

| Requirement | Current code | Required behaviour |
|-------------|---------------|--------------------|
| FR1.5 | `assets-repo.js` sets `status = 'assigned'` when `assignedTo` is supplied, so a registered asset can start outside `in-stock` | Every newly registered asset is persisted with `status = 'in-stock'`, a UUID, and timestamps. An optional `assigned-to` is stored as a field only; it does not change the state |
| FR1.4 | `routes/assets.js` redirects to `/assets/:id` (the detail view) after a successful registration | Redirect to the asset LIST view, with the new asset visible in it |
| FR4.6 | `assets` table has no assignment-timestamp column | Assigning records the assignee name and the assignment timestamp |
| FR4.7 | `assets` table has no return-timestamp column | Returning clears the assignee and records the return timestamp |

Two supporting corrections follow from the above:

- `tests/asset-service.test.js` currently asserts that a registration with an
  assignee yields `status = 'assigned'`. That assertion encodes the FR1.5
  violation and must be replaced with one asserting `in-stock`.
- The schema change (assignment and return timestamp columns) is a migration on
  the existing `assets` table, not a fresh table definition, so a database
  created by the earlier pass still works.

Not in scope for this pass: the `poc` scope carries no coverage floor, and the
existing suite must stay green after these corrections.

## Build-and-Test Repair Corrections (loop-back 1)

Build and Test (3.6) verified the code and found one applicable target —
**T-FR3.3** — **Not Met**, plus two inaccurate traceability notes. The
diagnosis is recorded in
`../build-and-test/test-results.md` (Loop-Back Log, entry 1) and in
`../build-and-test/cross-unit-traceability.md` (Findings 1 and 2). This
replayed attempt applies those repairs. The state machine in
`src/services/asset-service.js` is already correct — `returned → {assigned,
lost}` — so the defect is view-only.

| Requirement | Current code | Required behaviour |
|-------------|---------------|--------------------|
| FR3.3 | `views/detail.ejs` merges the `assigned` and `returned` states into one branch, so a `returned` asset renders the "Mark returned" form. The POST is rejected with HTTP 400 because `returned → returned` is not in the FR4.4 transition set | The action forms offered on the detail view must match the asset's current state, and every offered action must be a valid transition. A `returned` asset offers "Mark lost" and "Re-assign" only — never "Mark returned" |
| FR3.3 (test) | `tests/views.test.js` covers the `in-stock`, `assigned`, and `lost` states but has no `returned`-state case, which is why the suite stayed green | Add a `returned`-state view test asserting that `action-return` is absent and that `action-lost` and `action-reassign` are present |
| FR3.3 (traceability) | `traceability.json` records FR3.3 with status `OK` and the note "The actions section renders the assign / return / mark-lost forms for the current state" — inaccurate for the `returned` state | Correct the note to describe the per-state form set accurately |
| NFR2 (traceability) | `traceability.json` records NFR2 with status `OK` and the note "**Indexed** search over name and serial_or_key returns a filtered list on request" — there is no index on `name` or `serial_or_key`, and the pattern is a leading-wildcard `LIKE` that would not use a B-tree index anyway | Correct the note to "Case-insensitive search over name and serial_or_key returns a filtered list on request", and record that no supporting index exists because the pattern is a leading-wildcard `LIKE` |

**Scope of the NFR2 repair.** The NFR2 requirement itself is met — it is a
user-perception bound ("locatable in 5 seconds or fewer"), not an indexing
requirement, and it holds for a `poc`-sized dataset. Only the *note* is
inaccurate. Adding a real index would require SQLite FTS5 or a trigram table
(a plain B-tree index does not accelerate a leading-wildcard `LIKE`), which
materially expands the `poc` scope and touches every developer's existing
database via a migration. The **note correction** is therefore the selected
repair; no schema change and no index is added.

The `poc` scope carries no coverage floor, and the existing suite must stay
green after these repairs.

## Plan Steps

- [x] Step 1: Project structure and production configuration skeleton.
- [x] Step 2: Bootstrap the minimal test runner/configuration (Vitest) and record the exact unit-scoped command.
- [x] Step 3: Data model / database behavior — implement (schema, migrations, audit table).
- [x] Step 4: Data model / database behavior — write and run its tests after implementation.
- [x] Step 5: Repository / data access — implement (`assets`, `audit_log` repositories).
- [x] Step 6: Repository / data access — write and run its tests after implementation.
- [x] Step 7: Business logic — implement (asset lifecycle state machine, audit emission).
- [x] Step 8: Business logic — write and run its tests after implementation.
- [x] Step 9: API / endpoint — implement (Express routes for register, list, detail, assign, return, mark-lost).
- [x] Step 10: API / endpoint — write and run its tests after implementation (super-test).
- [x] Step 11: Frontend behavior — implement (EJS templates: list, new, detail, _layout, partials).
- [x] Step 12: Frontend behavior — write and run its tests after implementation (HTTP smoke tests against routes; data-testid attributes on interactive elements).
- [x] Step 13: Environment/build configuration (README, package.json scripts, .gitignore).
- [x] Step 14: Documentation and traceability (`source-manifest.json`, `traceability.json`, `code-summary.md`).
- [x] Step 15: Conform the schema to FR4.6/FR4.7 — add assignment and return timestamp columns to `assets` as a migration over the existing table.
- [x] Step 16: Conform registration to FR1.5/FR1.4 — always persist a new asset as `in-stock`, store `assigned-to` as a field only, and redirect to the asset list view after a successful registration.
- [x] Step 17: Conform the lifecycle actions to FR4.6/FR4.7 — record the assignment timestamp on assign and the return timestamp on return.
- [x] Step 18: Correct the test suite — replace the assertion that encodes the FR1.5 violation, and add coverage for the assignment and return timestamps.
- [x] Step 19: Repair FR3.3 in the detail view — split the `assigned` / `returned` branch in `views/detail.ejs` so a `returned` asset renders only the "Mark lost" and "Re-assign" forms, never the "Mark returned" form. The state machine in `src/services/asset-service.js` is unchanged.
- [x] Step 20: Add the `returned`-state view test — assert that `data-testid="action-return"` is absent for a `returned` asset and that `data-testid="action-lost"` and `data-testid="action-reassign"` are present, closing the coverage gap that let the defect through.
- [x] Step 21: Correct the traceability notes — fix the FR3.3 note in `traceability.json` to describe the per-state form set accurately, and fix the NFR2 note to drop the unsupported "Indexed" claim and record the absence of a supporting index.

## Testing Contract

The full contract from `aidlc engine testing-posture render --stage-level` is pasted below verbatim — its hash binds to this plan's approval.

```json
{
  "version": 1,
  "methodology": "test-after",
  "source": "org",
  "ordering": "implement each applicable testable layer, then write and run that layer's tests.",
  "scope": "poc",
  "test_strategy": "minimal",
  "project_type": "greenfield",
  "applicable_notes": [
    {
      "layer": "org",
      "text": "We treat tests as a first-class deliverable in every Bolt. The specific\nmethodology (TDD, BDD, ATDD, or classic test-after) is affirmed at\npractices-discovery and recorded in `team.md` under this heading with explicit\n`Methodology` and `Ordering` fields; Code Generation resolves those fields\nindependently from coverage, tooling, and scope notes.\n\nWhen no posture has been affirmed, our default per scope is:\n- **Methodology**: test-after\n- **Ordering**: implement each applicable testable layer, then write and run\n  that layer's tests.\n- `mvp`, `enterprise`, `feature`, `infra`, `classic` add an 80% line-coverage\n  floor and CI execution before merge.\n- `bugfix`, `security-patch` add a targeted regression for the specific\n  bug/vulnerability and require the existing suite to remain green.\n- `express` uses the Minimal strategy: requirement-driven unit tests (one per\n  requirement, with a happy-path floor per component); existing tests remain\n  green.\n- `poc`, `refactor`, `workshop` add no extra new-test floor and require the\n  existing suite to remain green.\n\nThe active `Test Strategy` still applies in every scope and determines test\nvolume/types. Scope floors are additive; they never reduce or replace the\nselected strategy.\n\nBuild and Test verifies defined coverage floors and affirmed quality targets;\nthey may not be weakened to make a step pass.\n\nAffirm a stricter posture in `team.md` if the team commits to one."
    }
  ],
  "obligations": {
    "strategy": "minimal",
    "strategy_volume": [
      "One verifiable test per requirement at the narrowest effective level.",
      "At least one happy-path unit test per component.",
      "Unit tests are the default; a bugfix/security scope floor may require an integration or E2E regression when that is the narrowest level that reproduces the defect."
    ],
    "scope_floor": [
      "Keep the existing test suite green.",
      "This scope adds no extra new-test floor beyond the selected test strategy."
    ],
    "combination_rule": "Apply every selected-strategy obligation and every scope-floor obligation; neither replaces the other, and a targeted scope regression may add the narrowest necessary test type beyond the strategy default."
  },
  "plan_profile": {
    "methodology": "test-after",
    "runner_step": "Bootstrap the minimal test runner/configuration and record the exact unit-scoped command.",
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
      "Bootstrap the minimal test runner/configuration and record the exact unit-scoped command.",
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
  "input_sha256": "sha256:c5db1280ba0333b655bcf97bdcaeaa0fd9cc0f50807a6ee879935b8aff3e17e0",
  "contract_sha256": "sha256:be5041ec2297dded1a31f328fae6a86555cf649f231018ea8168c9bb8dd811a5"
}
```

## Plan Approval

Presented in `code-generation-questions.md`. The approval tags and the human's
answer are recorded there, not here: this file is the stage's review artifact
and its content is bound by the approval fingerprint, so writing a fingerprint
into it would change the value it is supposed to state.