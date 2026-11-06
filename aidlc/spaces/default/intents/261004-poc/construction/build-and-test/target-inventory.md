# Target Inventory

Source-complete inventory of every measurable quality target for the
`poc` scope of the assets-management application, built before generating any
build or test instruction file.

## Sources Read

| Source | Status |
|--------|--------|
| `inception/requirements-analysis/requirements.md` | Read — 31 leaf requirements (FR1.1–FR5.3) + 5 group headings (FR1–FR5) + 7 NFRs |
| `inception/nfr-requirements/` | Stage skipped — no artifacts |
| `inception/nfr-design/` | Stage skipped — no artifacts |
| `construction/code-generation/code-generation-plan.md` | Read — `## Testing Contract` (contract_sha256 `sha256:be5041ec2297dded1a31f328fae6a86555cf649f231018ea8168c9bb8dd811a5`) |
| `construction/code-generation/unit-test-instructions.md` | Read — 6 run commands, acceptance mapping |
| `construction/code-generation/code-summary.md` | Read — file inventory, 66 tests, coverage baseline |
| `construction/code-generation/traceability.json` | Read — 36 upstream IDs, 36 coverage rows, 31 reverse rows |
| `construction/code-generation/reviews/review-01.md` | Read — 6 findings, all dispositioned `Accepted risk` at the Code Generation gate |
| `inception/user-stories/stories.md` | Stage skipped — no `AC` ids to enumerate |

### Testing Contract (bound to the approved plan)

- `methodology`: `test-after`
- `strategy`: `minimal`
- `scope_floor`: `["Keep the existing test suite green.", "This scope adds no extra new-test floor beyond the selected test strategy."]`
- `combination_rule`: apply every strategy obligation AND every scope-floor obligation.

The Minimal strategy generates **no additional test instruction files** at this
stage. Unit tests are covered per-unit by Code Generation. This is a
strategy-level decision, not a coverage reduction: the contract's two
obligations (existing suite green; no extra new-test floor) are both still
enforced below.

## Required Test Types Catalogued

| Test type | Required by | Source | Generated at this stage? |
|-----------|-------------|--------|------------------------|
| Unit (db, repository, service) | Testing Contract — strategy `minimal`, scope floor | `unit-test-instructions.md` | No — covered by Code Generation |
| Route / endpoint integration (supertest) | Testing Contract — strategy `minimal` | `unit-test-instructions.md` | No — covered by Code Generation |
| View rendering | Testing Contract — strategy `minimal` | `unit-test-instructions.md` | No — covered by Code Generation |
| Live end-to-end boot smoke | NFR3, NFR7 | `requirements.md` | Yes — as a build-verification command, not a new test file |
| Cross-unit / requirement traceability | FR1–FR5, NFR1–NFR7 | `requirements.md` + `traceability.json` | Yes — `cross-unit-traceability.md` |
| Integration (cross-module) | — | Not present in the contract | Not generated (Minimal strategy) |
| Performance / load | NFR5 is a concurrency requirement, not a throughput target | `requirements.md` | Not generated — see NFR5 row |
| Security (SAST/DAST) | NFR6 is a privacy constraint, not a security-test requirement | `requirements.md` | Not generated — see NFR6 row |

## Target Inventory

Target IDs are derived from the source path and the requirement ID, because
`requirements.md` carries no explicit target IDs of its own.

### Functional requirements

| Target ID | Source | Expected value | Check that produces the actual value | Owning stage (when not executable locally) |
|-----------|--------|----------------|--------------------------------------|--------------------------------------|
| T-FR1.1 | `requirements.md` §FR1.1 | Registration rejects a missing name/category/serial with `VALIDATION_ERROR` | `npx vitest run tests/routes.test.js` | — |
| T-FR1.2 | `requirements.md` §FR1.2 | Optional `model`, `notes`, `assigned_to` are stored and rendered | `npx vitest run tests/routes.test.js` | — |
| T-FR1.3 | `requirements.md` §FR1.3 | Duplicate `(category, serial_or_key)` raises `DUPLICATE_ASSET` | `npx vitest run tests/assets-repo.test.js` | — |
| T-FR1.4 | `requirements.md` §FR1.4 | Successful registration redirects to `/assets` (list view) | `npx vitest run tests/routes.test.js` + live smoke `POST /assets` → 302 | — |
| T-FR1.5 | `requirements.md` §FR1.5 | New row: random UUID, `created_at`/`updated_at`, `status = 'in-stock'` | `npx vitest run tests/db.test.js` | — |
| T-FR2.1 | `requirements.md` §FR2.1 | List shows name, category, serial/key, status, assigned-to | `npx vitest run tests/views.test.js` | — |
| T-FR2.2 | `requirements.md` §FR2.2 | Search matches name or serial/key, case-insensitively | `npx vitest run tests/assets-repo.test.js` | — |
| T-FR2.3 | `requirements.md` §FR2.3 | Filters by category and by status | `npx vitest run tests/assets-repo.test.js` | — |
| T-FR2.4 | `requirements.md` §FR2.4 | Sort by name or created_at, asc or desc | `npx vitest run tests/assets-repo.test.js` | — |
| T-FR2.5 | `requirements.md` §FR2.5 | Each list row links to `/assets/:id` | `npx vitest run tests/views.test.js` | — |
| T-FR3.1 | `requirements.md` §FR3.1 | Detail view lists every asset field incl. `assigned_at`/`returned_at` | `npx vitest run tests/views.test.js` | — |
| T-FR3.2 | `requirements.md` §FR3.2 | Detail view shows the most recent audit entry | `npx vitest run tests/views.test.js` | — |
| T-FR3.3 | `requirements.md` §FR3.3 | Action forms render for the asset's current state and only valid transitions are offered | `npx vitest run tests/views.test.js` + live smoke of each state | — |
| T-FR4.1 | `requirements.md` §FR4.1 | Exactly four states: `in-stock`, `assigned`, `returned`, `lost` | `npx vitest run tests/asset-service.test.js` | — |
| T-FR4.2 | `requirements.md` §FR4.2 | `in-stock → assigned` only | `npx vitest run tests/asset-service.test.js` | — |
| T-FR4.3 | `requirements.md` §FR4.3 | `assigned → returned` or `assigned → lost` | `npx vitest run tests/asset-service.test.js` | — |
| T-FR4.4 | `requirements.md` §FR4.4 | `returned → assigned` or `returned → lost` | `npx vitest run tests/asset-service.test.js` | — |
| T-FR4.5 | `requirements.md` §FR4.5 | `lost` is terminal | `npx vitest run tests/asset-service.test.js` | — |
| T-FR4.6 | `requirements.md` §FR4.6 | Assignment records assignee name and `assigned_at` | `npx vitest run tests/asset-service.test.js` | — |
| T-FR4.7 | `requirements.md` §FR4.7 | Return clears the assignee and records `returned_at` | `npx vitest run tests/asset-service.test.js` | — |
| T-FR4.8 | `requirements.md` §FR4.8 | `updated_at` is written on every update | `npx vitest run tests/assets-repo.test.js` | — |
| T-FR5.1 | `requirements.md` §FR5.1 | Audit rows carry timestamp, action type, description | `npx vitest run tests/assets-repo.test.js` | — |
| T-FR5.2 | `requirements.md` §FR5.2 | Most recent audit entry shown on the detail view | `npx vitest run tests/views.test.js` | — |
| T-FR5.3 | `requirements.md` §FR5.3 | Full audit log exposed in the UI | Deferred by Code Generation (`traceability.json` status `Deferred`) — the poc exposes only the most recent entry | — (deferred, not executable locally) |

### Non-functional requirements

| Target ID | Source | Expected value | Check that produces the actual value | Owning stage (when not executable locally) |
|-----------|--------|----------------|--------------------------------------|--------------------------------------|
| T-NFR1 | `requirements.md` §NFR1 | Registration reachable in ≤2 clicks from the list view | Live smoke: `GET /assets` contains `data-testid="nav-new"` and a link to `/assets/new` | — |
| T-NFR2 | `requirements.md` §NFR2 | An asset locatable in ≤5 s (case-insensitive search over name / serial key) | `npx vitest run tests/assets-repo.test.js` (search filter) + schema index inspection in `src/db/migrations.sql` | `performance-validation` (skipped in this scope) |
| T-NFR3 | `requirements.md` §NFR3 | One `npm start` boots the app with no external service | Live smoke: `npm start` → server listening on `:3000`, `GET /` → 302 | — |
| T-NFR4 | `requirements.md` §NFR4 | Runs on a single Linux/macOS host | `README.md` setup steps; verified locally on Linux | — |
| T-NFR5 | `requirements.md` §NFR5 | Concurrent access from ≤5 users is consistent | `npx vitest run tests/assets-repo.test.js` (write-burst consistency) | `performance-validation` (skipped in this scope) |
| T-NFR6 | `requirements.md` §NFR6 | No PII beyond the assignee name; nothing sent to an external service | Static source review: no outbound HTTP client, no `eval`, no `innerHTML`; assignee name is the only free-text personal field | `security-review` (skipped in this scope) |
| T-NFR7 | `requirements.md` §NFR7 | Runnable end-to-end with a README | `README.md` + live smoke sequence | — |

### Group headings

`FR1`–`FR5` are section headings in `requirements.md`, not independently
testable requirements. They carry no target rows; their member rows above
carry the traceability.

## Targets Not Executable Locally

| Target | Why not executable here | Owning stage |
|--------|------------------------|---------------|
| T-NFR2 (latency dimension) | The ≤5-second clause is a human-perception bound; the measurable part (case-insensitive search) is verified locally. No later stage in this scope owns it. | `performance-validation` — skipped in this scope, so the latency bound is carried as informational only and the searchable-search part is the executable evidence. |
| T-NFR5 (load dimension) | The ≤5-user concurrency bound is verified by the write-burst test; no load harness is required by the contract. | `performance-validation` — skipped in this scope. |
| T-NFR6 | Privacy is verified by static review, not an automated test; the contract defines no security test type at Minimal strategy. | `security-review` — skipped in this scope. |
| T-FR5.3 | Explicitly deferred by Code Generation; the poc exposes only the most recent audit entry. | None in this scope — carried as a finding at the approval gate. |

## Applicable / Non-Applicable Determination

All 31 leaf FR targets and 7 NFR targets are **applicable** to this stage: each
has an executable local check or a documented static/live verification. No
target qualifies for the single explanatory `N/A` row.
