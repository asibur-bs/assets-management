# NFR Requirements — Tooling and Delivery (`u6-tooling-and-delivery`)

**Stage**: nfr-requirements (construction)
**Intent**: 261106-asset-tracker-mvp
**Space**: default
**Scope**: feature
**Unit**: `u6-tooling-and-delivery` — Tooling and Delivery
**Unit kind**: `packaging`

This file holds the questions that shape the NFR Requirements of the
`u6-tooling-and-delivery` unit. The answers recorded below drive the generation
of `security-requirements.md`, `tech-stack-decisions.md`, and `traceability.json`
in this directory.

**What this stage decides.** The non-functional constraints and technology
choices for the release's formatter/linter configuration, local pre-commit
gate, hosted pipeline, and deploy/backup/smoke/rollback procedure. NFR
Requirements is the last stage that decides *what constraints the tooling must
satisfy*; later stages decide *how the configs and scripts are written*.

**What this stage does not decide.** It does not reopen C4–C6, C11–C13, the
Prettier option set already recorded in the unit-of-work artifact, the
lint → test → coverage → dependency-audit order, the 80% line-coverage floor,
or `npm ci` as the only install path. It does not choose the actor-identity
mechanism (`OQ1`). It does not write application runtime code.

**Why this unit's NFR set is narrow.** U6 is a **packaging** unit with zero
released stories. The stage's `produces_kinds` filter drops performance,
scalability, reliability, and observability artifacts for packaging. What
remains is **security** (supply chain, secrets, pipeline trust) and
**tech-stack decisions** (tooling and delivery platform choices).

---

## The Inputs This Stage Starts From

Facts from the upstream artifacts constrain this design and are **not**
reopened here:

- **C11** — Automated checks run lint → test → coverage check → dependency
  audit (`npm audit --audit-level=high --omit=dev`). Local pre-commit now;
  hosted pipeline once a remote exists; pipeline configured before MVP merges.
- **C12** — Prettier at 120 columns; ESLint recommended plus one documented
  test-file exception; configuration lands as its own first commit.
- **C5 / C6** — Deploy: `npm ci`, WAL-aware backup, migrate, restart,
  smoke-test; product-owner sign-off; record deployed commit SHA; manual
  rollback from pre-deploy backup.
- **Unit-of-work U6 notes** — Prettier options
  (`singleQuote`, `trailingComma: "es5"`, `semi`, `tabWidth: 2`,
  `arrowParens: "always"`, `endOfLine: "lf"`); lint scoped to
  `src tests vitest.config.js`; `.prettierignore` excludes `views/` and
  `public/`; coverage floor via `coverage.thresholds.lines = 80`; git remote
  is a prerequisite.
- **Technology-stack (brownfield)** — Node `>= 20`, CommonJS, Express,
  better-sqlite3, EJS, Vitest 2.1.9; today there is **no** linter, formatter,
  CI, or git-hook configuration in the repo.
- **Team Mandated** — squash-merge to `main` (rename from `master` first);
  behaviour change and its proof land in the same commit; dependency-free
  pre-commit secret scan over the staged diff.

---

## Embedded Questions

The unit's tooling posture is largely determined upstream. The questions below
are the **gaps those artifacts left open** and that only this stage can close.

---

### Q1 — Hosted pipeline platform

**Context.** C11 requires a hosted pipeline before MVP merges, and the
repository currently has **no remote** and **no CI config**. The platform
choice drives the workflow file shape and the authentication model for the
runner.

**Question.** Which hosted CI platform should this unit target for the
lint → test → coverage → dependency-audit pipeline?

- **A.** GitHub Actions (workflow under `.github/workflows/`)
- **B.** GitLab CI (`.gitlab-ci.yml`)
- **C.** Other (please specify the platform and why)

[Answer]: A. GitHub Actions (workflow under `.github/workflows/`)

---

### Q2 — Local pre-commit hook mechanism

**Context.** C11 requires the same ordered checks in a **local pre-commit hook
immediately**, before any remote exists. The repository has no hook framework
today (no Husky, Lefthook, or committed `.git/hooks`).

**Question.** How should the local pre-commit gate be installed and maintained?

- **A.** Husky + a `pre-commit` script that runs the ordered checks
- **B.** Lefthook (or equivalent) with a committed config that runs the ordered checks
- **C.** A documented plain `.git/hooks/pre-commit` template the developer installs manually (no npm hook dependency)
- **D.** Other (please specify)

[Answer]: B. Lefthook (or equivalent) with a committed config that runs the ordered checks

---

### Q3 — WAL-aware backup mechanism for deploy

**Context.** C5 requires a WAL-aware backup before migrations. Team practice
says the backup either **stops the process** or **uses the database's own
backup mechanism**, so committed rows in the `*.sqlite-wal` sidecar are not
missed. The choice affects whether deploy requires downtime.

**Question.** Which WAL-aware backup approach should the documented deploy
procedure require?

- **A.** Stop the Node process, then copy the database file(s) (including WAL/SHM if present), then proceed
- **B.** Keep the process up and use SQLite's online backup API (via `better-sqlite3` or `sqlite3` CLI `.backup`) to a timestamped file
- **C.** Other (please specify)

[Answer]: A. Stop the Node process, then copy the database file(s) (including WAL/SHM if present), then proceed

---

### Q4 — Secret scanning in the local gate

**Context.** Team Mandated practice requires a **dependency-free pre-commit
secret scan** over the staged diff (covering application files and `.mcp.json`).
C11's ordered checks do not name secret scanning; this question decides
whether it is part of U6's local gate and where it sits in the order.

**Question.** How should the dependency-free secret scan relate to U6's local
pre-commit gate?

- **A.** Add it to the local pre-commit sequence **before** lint (fail closed on suspected secrets)
- **B.** Add it to the local pre-commit sequence **after** the dependency audit
- **C.** Keep it as a documented separate check outside the C11 ordered four; do not wire it into the hook in this unit
- **D.** Other (please specify)

[Answer]: A. Add it to the local pre-commit sequence before lint (fail closed on suspected secrets)

---

### Q5 — Pipeline Node version pin

**Context.** The technology-stack artifact records `engines.node: >= 20.0.0`
and a scan-time verified runtime of Node v20.20.0. The team notes the runner's
Node version and platform must match the deploy host so `better-sqlite3`'s
native addon is built the same way. The host's exact Node version is not
locked in the requirements.

**Question.** How should the hosted pipeline pin Node for install and test?

- **A.** Pin to the current LTS line with `node-version: '20'` (or equivalent) and document that the deploy host must stay on Node 20.x
- **B.** Pin to an exact patch (e.g. `20.20.0`) matching the verified scan-time runtime
- **C.** Read `engines.node` / `.nvmrc` only (no hard pin in the workflow beyond what those files declare) — and we will add `.nvmrc` as part of this unit
- **D.** Other (please specify)

[Answer]: B. Pin to an exact patch (e.g. `20.20.0`) matching the verified scan-time runtime

---

### Q6 — ESLint configuration format

**Context.** C12 requires ESLint's recommended rule set with
`strict: ['error', 'global']` and exactly one documented exception scoped to
test files. The repository has no ESLint config today. ESLint 9 defaults to
flat config (`eslint.config.js`); older projects use `.eslintrc.*`.

**Question.** Which ESLint config format should this unit adopt?

- **A.** Flat config (`eslint.config.js`) with `@eslint/js` recommended + the documented test-file exception
- **B.** Legacy `.eslintrc.cjs` / `.eslintrc.json` with `eslint:recommended` + the documented test-file exception
- **C.** Other (please specify)

[Answer]: A. Flat config (`eslint.config.js`) with `@eslint/js` recommended + the documented test-file exception

---

## Assumptions & Open Questions

### Assumptions (confirm or convert)

1. Prettier options already recorded in the unit-of-work artifact
   (120 columns, `singleQuote: true`, `trailingComma: "es5"`, `semi: true`,
   `tabWidth: 2`, `arrowParens: "always"`, `endOfLine: "lf"`) are final for
   this unit and are not reopened here.
2. Lint scope remains `src tests vitest.config.js`; workflow tooling under
   `aidlc/`, `.claude/`, and `.puku-cli/` stays out of the lint gate.
3. `.prettierignore` excludes `views/` and `public/` so `format:check` stays a
   single glob.
4. The dependency audit stays `npm audit --audit-level=high --omit=dev` and is
   blocking in both pre-commit and the hosted pipeline.
5. Creating the git remote is a **human prerequisite** outside code generation;
   this unit's pipeline artifacts are authored so they activate once the remote
   exists, and verification of a live hosted run may wait on that remote.
6. Performance, scalability, reliability, and observability NFR artifacts are
   correctly out of scope for this packaging unit (`produces_kinds`).

### Assumption Confirmation

- **A.** Accept assumptions
- **B.** Convert to follow-up questions

[Answer]: A. Accept assumptions

---

## Positions

None.

---

## Consolidated Summary Confirmation

**The unit.** `u6-tooling-and-delivery` is a packaging unit with zero released
stories. It owns the formatter/linter configuration, local pre-commit gate,
hosted pipeline, and deploy/backup/smoke/rollback procedure. It produces no
application runtime behaviour.

**Decisions from this interview.**

- Hosted pipeline: **GitHub Actions** (`.github/workflows/`).
- Local gate: **Lefthook** with a committed config running the ordered checks.
- WAL-aware backup: **stop the Node process**, then copy the database file(s)
  including WAL/SHM if present.
- Secret scan: dependency-free scan over the staged diff, wired into local
  pre-commit **before lint**, fail closed.
- Pipeline Node pin: **exact patch `20.20.0`** matching the verified scan-time
  runtime.
- ESLint: **flat config** (`eslint.config.js`) with `@eslint/js` recommended
  plus the documented test-file exception.

**Accepted assumptions.** Prettier options already recorded in unit-of-work are
final; lint scope stays `src tests vitest.config.js`; `.prettierignore`
excludes `views/` and `public/`; dependency audit stays
`npm audit --audit-level=high --omit=dev` and is blocking; creating the git
remote is a human prerequisite; performance/scalability/reliability/observability
artifacts stay out of scope for this packaging unit.

**Artifacts to generate.** `security-requirements.md`,
`tech-stack-decisions.md`, `traceability.json`.

- Looks correct
- Request changes

[Answer]: Looks correct
