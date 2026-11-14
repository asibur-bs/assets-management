# Security Requirements — Tooling and Delivery (`u6-tooling-and-delivery`)

**Stage**: nfr-requirements (construction)
**Intent**: 261106-asset-tracker-mvp
**Space**: default
**Scope**: feature
**Unit**: `u6-tooling-and-delivery` — Tooling and Delivery
**Unit kind**: `packaging`

This file states the non-functional security requirements that bind the
`u6-tooling-and-delivery` unit. Every requirement carries an inherited
inception NFR identifier and a sub-number, so that the requirement can be
traced back to the requirement it derives from and forward to the configs,
hooks, pipeline steps, and deploy procedure that satisfy it.

**What this unit's security surface is.** This unit is a **packaging** unit.
It owns no application runtime behaviour, no HTTP surface, no domain
vocabulary, and no database schema. Its entire attack surface is the
**toolchain that decides what may merge and what may be declared deployed**:
the formatter and linter configuration, the local pre-commit gate, the hosted
pipeline, and the documented deploy / backup / smoke / rollback procedure.

1. **The merge gate is a trust boundary.** Whatever passes the local hook and
   the hosted pipeline is what the release treats as safe to land on `main`.
   A secret that slips through, a lockfile that drifts, or a high-severity
   production vulnerability that is waved through is not a tooling defect
   alone — it becomes a release defect the moment it merges.

2. **The deploy procedure is the last defence of audit history.** Constraint
   `C5` and team practice require a WAL-aware backup before migrations, and
   the architecture artifact records that the wrong migration ordering
   destroys every audit row silently. The backup, the smoke test, and the
   rollback procedure are therefore security controls on the attribution
   record, not operational ceremony.

**What this unit does not decide.** Actor identity (`OQ1`), CSRF (`NFR2.5`),
SQL binding (`NFR2.2`), XSS escaping (`NFR2.3`), response headers (`NFR2.6`),
and the append-only triggers (`NFR2.7`) belong to application units. Where
this file names such a requirement, it records **why it does not bind this
unit** and names the owning unit, because a requirement that vanishes without
a stated reason is indistinguishable from one that was forgotten.

**What this stage's `produces_kinds` filter excludes.** Performance,
scalability, reliability, and observability artifacts are out of scope for a
`packaging` unit. Backup and smoke-test obligations that protect audit
history are recorded here under the security and reliability *leaves they
actually discharge* (`NFR2.4`, `NFR3.5`), not as separate reliability or
observability files.

---

## The Inherited Security Requirements

`NFR2` in the inception requirements document is the release's security group.
Its seven requirements are reproduced here with their pass/fail criteria, and
each is then adjudicated against this unit.

### NFR2.1 — The system shall not accept an actor identity from the client

*Pass/fail:* as specified in FR2.2.

**Adjudication: does not bind this unit.** The actor-trust rule is enforced
on the write path (`u3-write-path`) and constrained by the vocabulary unit
(`u2-domain-vocabulary`). This unit ships no route, no request parser, and no
actor resolver. Its contribution is negative: tooling must never introduce a
committed secret, token, or session signing key that would become a new
actor-source candidate by accident.

### NFR2.2 — The system shall not interpolate a user-supplied value into a SQL statement

*Pass/fail:* inspection of the query layer shows no string interpolation of a
user value into SQL.

**Adjudication: does not bind this unit.** SQL lives in the data and write
path units. This unit may lint and format those files; it does not author
queries. The ESLint security rules that ride in the same config are a
supporting control, not ownership of the prepared-statement obligation.

### NFR2.3 — The system shall escape user-supplied values in rendered output

*Pass/fail:* a name, note, model or serial containing HTML markup is rendered
as text, not as markup, on every surface that renders it.

**Adjudication: does not bind this unit.** Rendering belongs to
`u5-presentation`. This unit deliberately excludes `views/` from Prettier
because EJS cannot be parsed as HTML; that exclusion is a tooling correctness
decision, not an XSS control.

### NFR2.4 — The system shall not ship a credential, a token, a session signing key, or a committed secret file, and shall make no outbound network call

*Pass/fail:* the production dependency tree contains no committed secret, and
the application opens no outbound connection.

**Adjudication: binds this unit as its primary security surface.** The
application already holds no credentials and makes no outbound calls; this
unit's job is to **preserve** that property through the merge and deploy
gates. The unit-local requirements below — secret scan, CI log hygiene,
`npm ci`, blocking production audit, least-privilege pipeline permissions,
pinned Node for native-addon integrity, and no credentials introduced by
tooling itself — are the enforceable form of `NFR2.4` for packaging.

### NFR2.5 — CSRF, conditional on the actor mechanism

*Pass/fail:* a state-changing POST without the credential is rejected, and a
route-level test asserts the rejection.

**Adjudication: does not bind this unit.** The obligation fires only if the
chosen actor mechanism relies on a browser-attached credential, and it binds
the write path. Mechanism choice is open question `OQ1`.

### NFR2.6 — `X-Content-Type-Options: nosniff` and no `X-Powered-By`

*Pass/fail:* every response carries the `nosniff` header and no
`X-Powered-By` header.

**Adjudication: does not bind this unit.** Headers are set by presentation
middleware (`u5-presentation`). Pipeline and deploy tooling must not add a
reverse-proxy or gateway that reintroduces `X-Powered-By` or strips
`nosniff`; under constraint `C4` this release introduces neither.

### NFR2.7 — The system shall refuse an attempt to update or delete an audit entry, at the database level

*Pass/fail:* as specified in FR2.7.

**Adjudication: does not bind enforcement; partially binds preservation.**
The `BEFORE UPDATE` / `BEFORE DELETE` triggers are owned by the foundation
unit (`u1-foundation`). This unit's obligation is the **operational
preservation** of the history those triggers protect: a WAL-aware
stop-then-copy backup before migrate, and a smoke test that refuses to call a
deploy successful if audit completeness or pre-deploy row count is broken.
Those controls are stated as `NFR3.5.1` and `NFR3.5.2` because they discharge
the migration-survival leaf rather than the trigger leaf.

---

## The Unit's Security Requirements

### NFR2.4.1 — Dependency-free secret scan fails closed before lint

**Requirement.** The local pre-commit gate shall run a **dependency-free**
secret scan over the staged diff **before** lint. The scan covers application
files and MCP registrations in `.mcp.json`. On a suspected secret the hook
**fails closed** — the commit is refused — and never proceeds to lint, test,
coverage, or dependency audit.

**Why.** Team practice requires the scan; C11's ordered four do not name it.
Placing it before lint means a secret never reaches a formatter rewrite or a
test run that could echo content into local logs. Fail-closed is mandatory:
warn-and-continue is the same as no scan once a developer is in a hurry.

**Enforcement.** Lefthook committed config sequences the scan as the first
local step; the scan itself uses only platform tools / shell (no npm package
required to run it).

**Pass/fail.** A staged diff containing a synthetic secret pattern is refused
before lint runs; a clean staged diff proceeds; the scan does not require a
third-party install to execute.

**Source.** NFR2.4 (adjudicated), team Mandated secrets practice, Q4 A.

---

### NFR2.4.2 — Hosted secret scan fails closed; secrets must not appear in CI logs or pipeline artifacts

**Requirement.** The hosted GitHub Actions pipeline shall run the **same
dependency-free, fail-closed secret scan** required by NFR2.4.1 as an early
workflow step **before** lint, so a pull request that introduces a suspected
secret is refused even when a developer skipped local hooks. Independently,
the pipeline shall not print secret values, environment credentials, or
private key material into job logs, and shall not upload artifacts that
contain secrets, database backups, or `.env` files. Workflow steps that echo
diagnostics shall redact or omit sensitive content.

**Why.** NFR2.4.1 alone is only as strong as the developer's local hook. A
hosted fail-closed scan is what makes "a deliberate secret in a PR fails the
gate" true for every merge path. A pipeline that catches a secret but then
prints it to a log has converted a blocked commit into a durable disclosure.
Artifact uploads of `data/` or backup tarballs would do the same for the
production database's content.

**Enforcement.** Workflow step order: secret-scan → lint → test → coverage →
dependency audit. The scan uses the same dependency-free pattern as
NFR2.4.1. Workflow authoring rules: no `cat` of credential files; no upload
of `data/`, `*.sqlite*`, `.env`, `*.pem`, or `*.key`; Actions secrets (if any
are ever introduced) are referenced only via `${{ secrets.* }}` and never
written to `GITHUB_STEP_SUMMARY` or debug logs. On a scan hit the job fails
closed without dumping the matched file contents as cleartext.

**Pass/fail.** A PR whose diff contains a synthetic secret pattern fails the
hosted secret-scan step before lint; inspection of the workflow shows no path
that uploads database or credential files; a refused secret does not appear
in the job log as cleartext content of the matched file.

**Source.** NFR2.4 (adjudicated), NFR2.4.1 (aligned), Q1 A, Q4 A.

---

### NFR2.4.3 — Install with `npm ci` and block on high production audit findings

**Requirement.** Every non-interactive install in CI, in the deploy
procedure, and in the documented setup path shall use **`npm ci`**, never
`npm install`. The pipeline and the local pre-commit ordered checks shall run
`npm audit --audit-level=high --omit=dev` as a **blocking** gate after
coverage. A high or critical finding in the production closure fails the
gate.

**Why.** `npm ci` installs the lockfile tree exactly and fails on lockfile
drift — the supply-chain control the release chose over pinning every
`package.json` range. The `--omit=dev` flag is deliberate: the production
closure is what ships; the development tree is triaged separately. A
non-blocking audit is theatre.

**Enforcement.** C11 order extended for secrets (local and hosted):
secret-scan → lint → test → coverage → dependency audit. Scripts and
workflow steps name `npm ci` and the exact audit command.

**Pass/fail.** CI and deploy docs contain no `npm install` for application
install; `npm audit --audit-level=high --omit=dev` exits non-zero on a
simulated high finding and blocks the gate; lockfile drift fails `npm ci`.

**Source.** NFR2.4 (adjudicated), C11, team Testing Posture / Deployment,
accepted assumptions.

---

### NFR2.4.4 — Pipeline permissions are least privilege

**Requirement.** The GitHub Actions workflow shall declare the minimum
`permissions` needed for the lint → test → coverage → audit job — typically
`contents: read` only — and shall not grant `write` tokens, `packages: write`,
or deployment credentials for this MVP gate. The workflow shall not use
`pull_request_target` with an untrusted checkout in a way that exposes
secrets to fork PRs.

**Why.** The release has no staging/prod CD robot in this unit's scope; the
hosted gate is a **merge check**, not a deployer. Excess permissions convert
a compromised workflow or a malicious PR into a write foothold on the
repository.

**Enforcement.** Explicit top-level `permissions` block in the workflow file;
no repository secrets required for the default audit/test path.

**Pass/fail.** The workflow YAML declares a restrictive `permissions` map;
the job completes without needing write scopes; no secret is required for
the default lint/test/coverage/audit path.

**Source.** NFR2.4 (adjudicated), Q1 A, C11.

---

### NFR2.4.5 — Pipeline Node is pinned to exact patch `20.20.0`

**Requirement.** The hosted pipeline shall pin Node to exact patch
**`20.20.0`**, matching the verified scan-time runtime. The deploy host is
documented to stay on the same patch so `better-sqlite3`'s native addon is
built the same way in CI and on the host.

**Why.** Three packages execute install-time code; `better-sqlite3`'s install
script falls back to `node-gyp rebuild` when a prebuild is missing. A floating
`node-version: '20'` lets the runner and the host diverge on ABI, which is a
integrity and availability risk for the only production native addon. Exact
pin is the control; the `node-gyp` fallback itself remains an accepted,
recorded risk for a single-host internal tool.

**Enforcement.** Workflow `setup-node` (or equivalent) uses `20.20.0`;
README / deploy notes state the host pin.

**Pass/fail.** The workflow file pins `20.20.0`; CI logs show that version;
documentation names the same pin for the deploy host.

**Source.** NFR2.4 (adjudicated), Q5 B, technology-stack verified runtime.

---

### NFR2.4.6 — Tooling ships no credentials

**Requirement.** Formatter, linter, hook, and pipeline configuration shall
introduce **no** credential, token, session signing key, committed `.env`,
`*.pem`, or `*.key`. `.env`, `*.pem`, and `*.key` remain untracked. Tooling
must not add an outbound network call from the application runtime as a side
effect of configuration.

**Why.** `NFR2.4`'s pass/fail is that the production tree contains no
committed secret and the application opens no outbound connection. Packaging
is the unit most likely to accidentally violate that by adding a CI token
file, a webhook secret in-repo, or a telemetry dependency "for the pipeline".

**Enforcement.** Secret scan (NFR2.4.1); review of new config files; no new
runtime dependency added by this unit beyond lint/format/hook **dev**
tooling.

**Pass/fail.** No credential file is tracked; application production
dependencies gain no secret-bearing package from this unit; the application
still opens no outbound connection after tooling lands.

**Source.** NFR2.4 (adjudicated), team Deployment secrets practice.

---

### NFR3.5.1 — Stop-process WAL-aware backup preserves audit history

**Requirement.** The documented deploy procedure shall **stop the Node
process**, then copy the database file(s) **including WAL and SHM sidecars
when present**, then proceed to migrate, restart, and smoke-test. Copying
only the main `*.sqlite` file while the process is running is forbidden.

**Why.** `src/db/index.js` sets `journal_mode = WAL`, so committed rows can
sit in `*.sqlite-wal`. A running-process copy of the main file alone can miss
committed audit rows — exactly the rows the backup exists to protect. The
architecture artifact records that a bad `DROP TABLE assets` ordering
destroys history silently; the backup is the operational absorption of that
failure mode. Q3 selected stop-then-copy over online backup API for this
release.

**Enforcement.** Deploy runbook steps are ordered: stop → copy DB+WAL+SHM →
`npm ci` / migrate → restart → smoke. Rollback restores the backup and the
previous commit (manual, documented).

**Pass/fail.** The procedure text requires process stop before copy; the copy
set names WAL/SHM; a review checklist refuses a deploy doc that copies only
the main file while the process runs.

**Source.** NFR3.5 (adjudicated for packaging), C5, Q3 A, team Deployment.

---

### NFR3.5.2 — Smoke test gates deploy success

**Requirement.** A deployment is not successful when the process merely
starts. The smoke test shall register an asset, transition it, confirm the
audit entry carries an actor, and confirm the pre-deploy audit row count is
intact. A deployment that fails the smoke test is **rolled back** (restore
backup + previous commit) and is not reported as successful. Product-owner
sign-off is required; the deployed commit SHA is recorded.

**Why.** Audit Completeness is the release's primary success measure. Starting
the process after a migration that quietly lost history would report green
while violating the invariant the backup exists to protect. The smoke test is
the post-condition check; sign-off and SHA recording are the human and
forensic controls around it (C6). The smoke assertion that "the audit entry
carries an actor" is **mechanism-agnostic**: it requires any trusted
server-side actor value visible on the audit row. Open question `OQ1` blocks
only *how* that value is produced, not whether this smoke step exists.

**Enforcement.** Deploy runbook; manual rollback procedure; deploy record
includes commit SHA and smoke result.

**Pass/fail.** A simulated smoke failure triggers rollback rather than a
success report; a successful deploy record names the commit SHA; sign-off is
documented as required for every host deploy; the actor check accepts any
non-empty trusted server-side actor on the audit row pending `OQ1`.

**Source.** NFR3.5 (adjudicated for packaging), C5, C6, team Deployment.

---

## The Unit's Testability Requirements

Inception `NFR6` is the release's Testability group. Two leaves bind this
packaging unit directly; the others bind application units and are recorded
in coverage as owned elsewhere.

### NFR6.1.1 — Pipeline and pre-commit preserve the POC suite baseline

**Requirement.** The local pre-commit gate and the hosted pipeline shall run
the existing test suite and shall refuse a commit or merge when it fails.
Tooling changes shall not delete or replace pre-existing tests to make a gate
pass.

**Why.** `NFR6.1` requires the POC suite to remain present and passing, with
new behaviour covered by additional tests. This unit owns the **enforcement
point** that makes that obligation real when a developer forgets to run
tests.

**Enforcement.** Lefthook and GitHub Actions both execute the test step in
the C11 order after lint.

**Pass/fail.** A deliberately failing test fails pre-commit and CI; the
pre-existing suite remains in the tree after tooling lands.

**Source.** NFR6.1, C11.

---

### NFR6.2.1 — Coverage floor of 80% lines is enforced by tooling

**Requirement.** `vitest.config.js` shall set `coverage.thresholds.lines = 80`
so `npm run test:coverage` fails the build when measured line coverage falls
below 80%. Both local pre-commit and the hosted pipeline run the coverage
check as a blocking step before the dependency audit.

**Why.** `NFR6.2` requires the floor to be **enforced by tooling rather than
observed**. Measured coverage already exceeds 80%; the gap is enforcement, and
enforcement is this unit's job.

**Enforcement.** Config threshold + pipeline/pre-commit coverage step.

**Pass/fail.** Lowering the threshold test (or a coverage drop below 80%)
fails the coverage step; CI and pre-commit both invoke it.

**Source.** NFR6.2, C11, team Testing Posture.

---

## Scalability aspect that binds packaging

### NFR5.1.1 — Tooling introduces no second topology

**Requirement.** This unit shall not add a container definition,
infrastructure-as-code, a second host, or a staging split. Pipeline and
deploy artifacts target the existing single-process, single-host,
machine-local SQLite deployment fixed by `C4` and `NFR5.1`.

**Why.** Packaging is the unit that could accidentally "modernise" delivery
into Docker or a cloud pipeline deploy. The release explicitly forbids that
topology for MVP.

**Enforcement.** Absence of Dockerfile / compose / IaC in this unit's
deliverables; deploy procedure documents the single host only.

**Pass/fail.** No container or IaC file is introduced by this unit; deploy
docs describe one host, one process, one local database file.

**Source.** NFR5.1, C4.

---

## Threat Assessment — STRIDE for This Unit

The threat model for this unit centres on **CI/supply-chain, secrets, and
history-loss at deploy time**. The unit has no application request surface;
the threats that survive are those that attack the gates and the procedure.

| # | STRIDE | Threat | Unit's exposure | Requirement |
|---|---|---|---|---|
| S — Spoofing | A forged actor or stolen CI identity writes to the tree | Pipeline token over-privilege; no app actor surface here | NFR2.4.4 |
| T — Tampering | Lockfile drift, malicious dependency, or altered workflow | Supply chain at install; workflow permissions | NFR2.4.3, NFR2.4.4, NFR2.4.5 |
| R — Repudiation | A deploy that lost audit history is reported successful | Missing smoke gate or unsigned deploy | NFR3.5.2 |
| I — Information Disclosure | Secrets in commits, CI logs, or uploaded artifacts | Primary packaging disclosure channel | NFR2.4.1, NFR2.4.2, NFR2.4.6 |
| D — Denial of Service | Native addon mismatch / install script fallback breaks deploy host | Unpinned Node across CI and host | NFR2.4.5 |
| E — Elevation of Privilege | Compromised workflow gains write or secret access | Excess Actions permissions | NFR2.4.4 |

**History-loss note (Tampering / Repudiation).** A live-file copy under WAL
without stopping the process can capture an incomplete snapshot; a migration
that then fails mid-flight leaves the operator without a trustworthy restore
point. Stop-then-copy (`NFR3.5.1`) and smoke-gated success (`NFR3.5.2`) are
the packaging answers; trigger-level append-only enforcement remains
`u1-foundation`'s.

**Accepted residual risk.** `better-sqlite3`'s `prebuild-install \|\| node-gyp
rebuild` fallback remains an accepted, recorded supply-chain risk for a
single-host internal tool. Pinning Node reduces ABI skew; it does not remove
the install-script execution surface.

---

## What This File Does Not Decide

- **The actor-identity mechanism** (`OQ1`) and conditional CSRF (`NFR2.5`).
- **Application XSS, SQL binding, and response headers** — presentation /
  write-path / data units.
- **Append-only trigger DDL and migration statement order** — foundation unit
  (`NFR2.7`, `NFR3.5a`).
- **Performance, accessibility, and observability NFR files** — excluded by
  `produces_kinds` for packaging; not omitted by forgetfulness.
- **Creating the git remote** — human prerequisite; pipeline artifacts are
  authored to activate once the remote exists.

---

## Sources Consumed

| Upstream artifact | What this file takes from it |
|---|---|
| `requirements` | NFR2.1–NFR2.7, NFR3.5, NFR5.1, NFR6.1, NFR6.2; constraints C4–C6, C11–C12. |
| `functional-spec` | N/A for this packaging unit — `functional-design` `produces_kinds` excludes packaging, so U6 has no unit-local functional-spec. Security obligations here derive from inception `requirements`, unit-of-work packaging boundary, and team deploy/secrets practice rather than from a U6 functional design. |
| `rules` | N/A for this packaging unit — no unit-local business/domain rules artifact. Where this file mentions security rules, it means ESLint/pipeline controls, not the functional-design `rules` produce. |
| `contract-summary` | N/A for this packaging unit — optional consume; U6 owns no inter-unit runtime contracts, SLAs, or integration mechanisms. Pipeline and deploy gates are packaging controls, not contract endpoints. |
| `unit-of-work` | U6 packaging boundary; Prettier options; lint scope; `.prettierignore`; `npm ci`; coverage floor; deploy/backup/smoke/rollback notes. |
| `nfr-requirements-questions` | Q1–Q6 answers and accepted assumptions (GitHub Actions, Lefthook, stop-then-copy, secret-scan-before-lint, Node `20.20.0`, ESLint flat config). |
| `team.md` / `project.md` | Trunk-based squash-merge; local pre-commit now + hosted pipeline before MVP merges; secrets practice; WAL-aware backup; smoke test; product-owner sign-off. |
| `technology-stack` / RE | No existing CI/hooks/linter; Node ≥ 20 verified at v20.20.0; WAL mode; `better-sqlite3` install-script risk. |
