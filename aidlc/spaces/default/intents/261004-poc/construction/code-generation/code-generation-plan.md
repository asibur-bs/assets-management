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
| FR1 (registration) | Steps 4, 6, 8, 10, 12 |
| FR2 (list view) | Steps 4, 8, 10, 12 |
| FR3 (detail view) | Steps 4, 8, 10, 12 |
| FR4 (lifecycle) | Steps 5, 7, 9, 10, 12 |
| FR5 (audit) | Steps 5, 7, 10, 12 |
| NFR1–NFR7 | Steps 1, 13, 14 |

## Plan Steps

- [ ] Step 1: Project structure and production configuration skeleton.
- [ ] Step 2: Bootstrap the minimal test runner/configuration (Vitest) and record the exact unit-scoped command.
- [ ] Step 3: Data model / database behavior — implement (schema, migrations, audit table).
- [ ] Step 4: Data model / database behavior — write and run its tests after implementation.
- [ ] Step 5: Repository / data access — implement (`assets`, `audit_log` repositories).
- [ ] Step 6: Repository / data access — write and run its tests after implementation.
- [ ] Step 7: Business logic — implement (asset lifecycle state machine, audit emission).
- [ ] Step 8: Business logic — write and run its tests after implementation.
- [ ] Step 9: API / endpoint — implement (Express routes for register, list, detail, assign, return, mark-lost).
- [ ] Step 10: API / endpoint — write and run its tests after implementation (super-test).
- [ ] Step 11: Frontend behavior — implement (EJS templates: list, new, detail, _layout, partials).
- [ ] Step 12: Frontend behavior — write and run its tests after implementation (HTTP smoke tests against routes; data-testid attributes on interactive elements).
- [ ] Step 13: Environment/build configuration (README, package.json scripts, .gitignore).
- [ ] Step 14: Documentation and traceability (`source-manifest.json`, `traceability.json`, `code-summary.md`).

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

[Approval Fingerprint]: sha256:v3:a44ec315b9967f76c1d3db281550ebe93b486a13ca74342db5c912da22beb515
[Planned Source]: 81ac1982cdedaad24d9fd8abf620ecc0a2c5e0a2bb82b13f09a52a01bc865a0d

- Approve Plan
- Request Changes

[Answer]: Approve Plan