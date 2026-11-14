# Technology Stack Decisions — Tooling and Delivery (`u6-tooling-and-delivery`)

**Stage**: nfr-requirements (construction)
**Intent**: 261106-asset-tracker-mvp
**Space**: default
**Scope**: feature
**Unit**: `u6-tooling-and-delivery` — Tooling and Delivery
**Unit kind**: `packaging`

This file records the technology selections that bind the
`u6-tooling-and-delivery` unit, and the reasoning for each. A decision that
belongs to the release as a whole is named here as **Inherited**, with its
owner, and is not re-decided. A decision this unit makes is marked
**Unit-local** and is the unit's to own.

**The frame.** This unit is a **packaging** unit. It owns no application
runtime process and no domain component. Its technology surface is the
formatter/linter configuration, the local pre-commit mechanism, the hosted
pipeline platform, the install/audit commands those gates run, and the
deploy backup mechanism. Constraint `C4` (single host, no container/IaC) and
`C5`/`C6` (manual deploy with sign-off) are **not** reopened here.

---

## The Decisions

### D-TS-01 — Hosted pipeline is GitHub Actions under `.github/workflows/`

**Decision.** The hosted lint → test → coverage → dependency-audit pipeline
is implemented as a GitHub Actions workflow under `.github/workflows/`.

**Category.** Unit-local (Q1 A).

**Rationale.** C11 requires a hosted pipeline before MVP merges. The
repository has no CI config today and no remote yet; once a remote exists,
Actions is the lowest-friction fit for a Node repository already oriented
around `package.json` scripts. The workflow is authored in-tree so it
activates when the human prerequisite remote is created.

**Alternatives rejected.**

| Alternative | Why rejected |
|---|---|
| GitLab CI (`.gitlab-ci.yml`) | Q1 rejected; would require a GitLab remote and a second mental model for a solo trunk-based repo. |
| Other hosted CI | No organisational mandate for a third platform; adds account and YAML surface without benefit for MVP. |

---

### D-TS-02 — Local pre-commit gate is Lefthook with a committed config

**Decision.** The local ordered checks are installed and maintained with
**Lefthook**, using a committed configuration that runs the ordered gate.

**Category.** Unit-local (Q2 B).

**Rationale.** C11 requires the same ordered checks in a local pre-commit
hook **immediately**, before any remote exists. A committed Lefthook config
is reviewable, versioned with the tree, and keeps step order explicit —
including the secret scan before lint. It is the gate that works today with
no runner and no platform account.

**Alternatives rejected.**

| Alternative | Why rejected |
|---|---|
| Husky + `pre-commit` script | Q2 rejected; Husky is common but the team preferred a committed ordered-config tool over a package-script-only hook. |
| Manual `.git/hooks/pre-commit` template | Easy to skip on a fresh clone; not enforced by install; drifts silently. |
| No local hook (CI only) | Violates C11's "local pre-commit now"; the repo has no remote yet so CI-only would mean no gate at all. |

---

### D-TS-03 — Prettier at 120 columns with the unit-of-work option set

**Decision.** Prettier is the formatter. Options are final:
`printWidth: 120`, `singleQuote: true`, `trailingComma: "es5"`, `semi: true`,
`tabWidth: 2`, `arrowParens: "always"`, `endOfLine: "lf"`.

**Category.** Inherited from C12 / unit-of-work / accepted assumptions —
not reopened.

**Rationale.** Org and team Code Style name Prettier for JavaScript. The
codebase is hand-formatted near 120 columns; adopting Prettier's default 80
would force a stylistic rewrite rather than a configuration change. The
option set matches existing trailing-comma practice (`es5`, not `all`).

**Alternatives rejected.**

| Alternative | Why rejected |
|---|---|
| Biome / StandardJS | Team affirmed Prettier + ESLint; switching now reopens C12. |
| `printWidth: 80` | Conflicts with existing layout; rejected at practices-discovery. |
| `trailingComma: "all"` | Would reformat every multi-line call; codebase omits trailing commas in call args. |

---

### D-TS-04 — ESLint flat config (`eslint.config.js`) with `@eslint/js` recommended

**Decision.** ESLint uses **flat config** in `eslint.config.js` with
`@eslint/js` recommended, `strict: ['error', 'global']`, and exactly one
documented exception scoped to test files (discarded-response
`no-unused-vars` shape). Security-relevant rules ride in the same config and
the same pipeline step.

**Category.** Unit-local format choice (Q6 A); rule posture Inherited from
C12.

**Rationale.** ESLint 9 defaults to flat config; there is no legacy
`.eslintrc*` to migrate. The recommended set was verified to pass `src/`
cleanly with a single documented test override. Configuration lands as its
own first commit before MVP behaviour work (C12).

**Alternatives rejected.**

| Alternative | Why rejected |
|---|---|
| Legacy `.eslintrc.cjs` / `.eslintrc.json` | Q6 rejected; legacy format on a greenfield config adds debt for no compatibility need. |
| Multiple ad-hoc `eslint-disable` comments | Team forbids silencing rules in code; change the config if a rule is wrong. |

---

### D-TS-05 — Pipeline Node pinned to exact patch `20.20.0`

**Decision.** GitHub Actions pins Node to **`20.20.0`**. The deploy host is
documented to match that patch.

**Category.** Unit-local (Q5 B).

**Rationale.** `engines.node` is `>= 20.0.0`; scan-time verified runtime was
v20.20.0. The runner and host must match so `better-sqlite3`'s native addon
is built consistently. An exact pin removes silent ABI drift across the
LTS line.

**Alternatives rejected.**

| Alternative | Why rejected |
|---|---|
| Pin major only (`node-version: '20'`) | Allows runner/host patch skew; rejected by Q5. |
| `.nvmrc` / `engines` only without workflow pin | Insufficiently explicit for Actions; Q5 rejected. |

---

### D-TS-06 — Vitest coverage threshold `coverage.thresholds.lines = 80`

**Decision.** Enforce the project-wide 80% line-coverage floor via
`coverage.thresholds.lines = 80` in `vitest.config.js`, invoked by the
coverage step in both Lefthook and GitHub Actions.

**Category.** Inherited from NFR6.2 / team Testing Posture — packaging owns
**enforcement**, not the number.

**Rationale.** Measured coverage already exceeds 80%; the floor was
informational under the prior `poc` scope. Tooling must make it fail the
build. The threshold is project-wide, not per-file.

**Alternatives rejected.**

| Alternative | Why rejected |
|---|---|
| Per-file floors | Team affirmed one project-wide number. |
| Informational coverage only | Violates NFR6.2 ("enforced by the tooling rather than observed"). |

---

### D-TS-07 — `npm ci` only in CI, deploy, and documented setup

**Decision.** Every non-interactive install uses **`npm ci`**. `npm install`
is never the documented path for CI, deploy, or setup. Dependency audit is
`npm audit --audit-level=high --omit=dev`, blocking.

**Category.** Inherited from team Testing Posture / C11 — packaging
implements it.

**Rationale.** Lockfile-exact installs fail on drift; production-only audit
matches "what ships". `^` ranges in `package.json` remain; the lockfile is
the pin.

**Alternatives rejected.**

| Alternative | Why rejected |
|---|---|
| `npm install` in CI | Allows lockfile drift; team explicitly forbids. |
| Exact pins in `package.json` | Fights ecosystem security updates; lockfile already pins the tree under `npm ci`. |
| Non-blocking audit | Theatre; C11 makes the audit a blocking gate. |

---

### D-TS-08 — WAL-aware backup is stop-process then copy DB including WAL/SHM

**Decision.** Deploy backup **stops the Node process**, then copies the
database file(s) including WAL and SHM sidecars when present, then proceeds.

**Category.** Unit-local (Q3 A); obligation Inherited from C5.

**Rationale.** WAL mode means committed rows may live in `*.sqlite-wal`.
Stop-then-copy is the simplest complete snapshot for a single-host tool and
avoids depending on an online backup API path during a manual procedure.
Downtime is accepted for MVP.

**Alternatives rejected.**

| Alternative | Why rejected |
|---|---|
| Online SQLite backup API while process stays up | Q3 rejected for this release; more moving parts in a manual runbook. |
| Copy main file only while process runs | Can miss committed WAL rows; explicitly forbidden. |

---

### D-TS-09 — Secret scan sits before lint in local pre-commit and in GitHub Actions, fail-closed

**Decision.** A dependency-free secret scan over the staged diff is wired
into Lefthook **before** lint and fails closed on suspected secrets. The
**same** scan runs as an early GitHub Actions step **before** lint so a PR
fails closed even when local hooks were skipped. It covers application
files and `.mcp.json`.

**Category.** Unit-local (Q4 A; hosted alignment for NFR2.4.2); obligation
Inherited from team secrets practice.

**Rationale.** C11's four steps do not name secret scanning. Before-lint
placement prevents format/test noise around a refused secret. Fail-closed
matches the team's Mandated posture. Hosting the same control closes the
skip-hooks gap that would otherwise leave NFR2.4.2's PR-fail claim
unimplemented.

**Alternatives rejected.**

| Alternative | Why rejected |
|---|---|
| After dependency audit | Lets lint/test run on a tree that should never commit. |
| Documented-only, not in the hook | Will be skipped; Q4 rejected. |
| Local-only scan (CI trust the developer) | A skipped hook would let a secret reach PR CI without a fail-closed gate. |
| npm-packaged scanner as a hard dependency of the hook | Team requires dependency-free scan. |

---

### D-TS-10 — `.prettierignore` excludes `views/` and `public/`

**Decision.** `.prettierignore` excludes `views/` and `public/` so
`format:check` stays a single glob without drifting exclusions into the
script.

**Category.** Inherited from unit-of-work / accepted assumptions.

**Rationale.** Prettier cannot parse EJS; forcing HTML parsing fails on EJS
inside attributes. `public/` CSS is intentionally one-line rules; Prettier
would explode the stylesheet. Ignore-file expression keeps the npm script
stable.

**Alternatives rejected.**

| Alternative | Why rejected |
|---|---|
| Script-level path carve-outs only | Drift-prone; two places to forget. |
| Force HTML parser on EJS | Verified to fail on interpolation inside tag attributes. |

---

### D-TS-11 — Lint scope is `src tests vitest.config.js`

**Decision.** The `lint` script (and therefore pre-commit / CI lint) is
scoped to **`src tests vitest.config.js`**. It does not lint `aidlc/`,
`.claude/`, or `.puku-cli/` workflow tooling.

**Category.** Inherited from unit-of-work / accepted assumptions.

**Rationale.** Workflow Markdown and agent tooling are not application
source. Scoping keeps the gate meaningful and fast, and avoids false
ownership of AI-DLC tree conventions.

**Alternatives rejected.**

| Alternative | Why rejected |
|---|---|
| Lint the whole repository | Pulls workflow tooling into the application quality gate. |
| Lint `src` only | Would skip tests and `vitest.config.js`, where the documented ESLint exception and coverage config live. |

---

## What This Unit Inherits, and From Whom

| Decision | Owner | How it binds this unit |
|---|---|---|
| Single host, no container/IaC (`C4`, `NFR5.1`) | Release / feasibility | D-TS-08 deploy target; forbids Docker/IaC deliverables |
| Deploy order, smoke, rollback, SHA, PO sign-off (`C5`, `C6`) | Team Deployment | Runbook content this unit authors |
| Check order lint → test → coverage → audit (`C11`) | Team Testing Posture | Lefthook + Actions step order (+ secret scan prepended locally and in Actions) |
| Prettier/ESLint adoption and first-commit rule (`C12`) | Team Code Style | D-TS-03, D-TS-04 |
| `npm ci` and blocking production audit | Team Testing Posture | D-TS-07 |
| Vitest 2.1.9 + V8 coverage | Release toolchain | D-TS-06 enforcement surface |
| Squash-merge to `main` (rename from `master` first) | Team Way of Working | Pipeline targets `main` PR/merge checks |
| Git remote creation | Human prerequisite | Actions cannot run until remote exists |

---

## The Complete Technology Stack for This Unit

| Layer | Selection | Third-party? |
|---|---|---|
| Hosted CI | GitHub Actions (`.github/workflows/`) | Platform |
| Local hooks | Lefthook with committed config | Dev |
| Formatter | Prettier (120 cols, option set above) | Dev |
| Linter | ESLint flat config + `@eslint/js` recommended | Dev |
| Secret scan | Dependency-free staged-diff scan before lint (Lefthook + GitHub Actions) | No |
| Runtime pin (CI/host) | Node `20.20.0` | No |
| Install | `npm ci` only | — |
| Audit | `npm audit --audit-level=high --omit=dev` | — |
| Tests / coverage | Vitest 2.1.9, V8 coverage, `thresholds.lines = 80` | Dev |
| Deploy backup | Stop process → copy DB + WAL/SHM | — |
| Deploy topology | Single existing host; no container; no IaC | — |
| Application runtime deps added by this unit | **None** | — |

---

## Sources Consumed

| Upstream artifact | What this file takes from it |
|---|---|
| `nfr-requirements-questions` | Q1–Q6 answers and accepted assumptions. |
| `functional-spec` | N/A for this packaging unit — no unit-local functional-spec; tooling choices are not driven by application functional design. |
| `rules` | N/A for this packaging unit — no unit-local domain rules produce; ESLint "security rules" here are linter config, not functional-design `rules`. |
| `contract-summary` | N/A for this packaging unit — optional consume; no inter-unit contract or SLA owned by packaging. |
| `unit-of-work` | U6 ownership, Prettier options, lint scope, ignore rules, `npm ci`, coverage floor, deploy notes. |
| `requirements` | C4–C6, C11–C12, NFR5.1, NFR6.1, NFR6.2. |
| `team.md` | Testing posture, deployment procedure, code style, secrets practice. |
| `technology-stack` / RE | Absent CI/hooks/linter today; Node verified at 20.20.0; WAL mode. |
