# Security Design — Tooling and Delivery (`u6-tooling-and-delivery`)

**Stage**: nfr-design (construction)
**Intent**: 261106-asset-tracker-mvp
**Space**: default
**Scope**: feature
**Unit**: `u6-tooling-and-delivery` — Tooling and Delivery
**Unit kind**: `packaging`

This file designs how the packaging unit enforces its approved NFR
Requirements. It owns **no application runtime**. Security here is the
shape of the merge gates, the shared secret-scan entrypoint, the host-local
backup/smoke/rollback procedure, and the constraints that keep tooling from
introducing credentials or a second topology.

---

## Design Stance

1. **CI is the merge authority for secrets (Q1).** Lefthook runs the scan
   first for developer feedback; GitHub Actions always re-runs the same
   fail-closed scan before lint so a skipped hook cannot land a secret on
   `main`. The step must not print matching secret values into job logs.

2. **One script owns the rules (Q2).** `scripts/secret-scan.sh` (name
   illustrative) holds the dependency-free patterns and exit semantics.
   Lefthook and Actions both invoke that script — no duplicated pattern
   lists and no third-party scanner package required to run it.

3. **Smoke is a committed script gated by the runbook (Q3).** Deploy success
   requires the smoke script to exit 0 before product-owner sign-off. The
   actor assertion is mechanism-agnostic: any trusted server-side actor
   value visible on the audit row satisfies the check; how that value is
   produced remains blocked on `OQ1`, not on whether the smoke step exists.

4. **Backups are host-local, dated, retain last 3 (Q4).** Pre-migrate copies
   include DB + WAL + SHM after process stop. Older copies prune after a
   successful smoke. Backups never become CI artifacts.

5. **One in-repo Actions workflow for MVP (Q5).** Ordered steps, explicit
   `permissions: contents: read`, Node pinned to `20.20.0`. A later extract
   to a reusable workflow is allowed without changing the control set.

6. **Smoke failure forbids forward migration repair (Q6).** The only allowed
   next action is restore the pre-migrate backup and check out the previous
   commit. No forward fix on the migrated DB without a fresh backup cycle.

---

## Component Layout (packaging)

```
u6-tooling-and-delivery (design surface)
  scripts/secret-scan.sh     # sole pattern + fail-closed entry (Q2)
  scripts/smoke-deploy.sh    # register / transition / actor / row-count (Q3)
  lefthook.yml               # ordered local gate; first step = secret-scan
  .github/workflows/*.yml    # single MVP workflow; calls same secret-scan
  deploy runbook (docs)      # stop→copy→migrate→restart→smoke→sign-off
  prettier / eslint configs  # no credentials; views/ excluded from Prettier
```

Illustrative control surface (≤15 lines, not implementation):

```sh
# scripts/secret-scan.sh — sole entry; Lefthook + Actions call this
# reads staged/PR diff; matches committed patterns; exit 1 on hit; never echoes match body
set -eu
# ... dependency-free scan ...

# Actions (ordered): secret-scan → npm ci → lint → test → coverage → audit
# Deploy: stop → copy DB+WAL+SHM to dated dir → migrate → restart → smoke → sign-off
# Smoke fail: restore backup + previous commit only (no forward fix)
```

---

## Security Patterns by Requirement

### NFR2.1–NFR2.3, NFR2.5–NFR2.7 — do not bind packaging enforcement

**Pattern.** Negative design: tooling introduces no actor resolver, SQL
authoring, XSS surface, CSRF credential, response-header middleware, or
append-only triggers. Ownership stays with application units as adjudicated
in security-requirements. Packaging must not add a reverse-proxy or gateway
that reintroduces `X-Powered-By` or strips `nosniff` (C4: neither is in
scope).

### NFR2.4.1 — Dependency-free secret scan fails closed before lint

**Pattern.** Lefthook's first local step invokes `scripts/secret-scan.sh`
over the staged diff. On a hit the hook exits non-zero and never proceeds to
lint, test, coverage, or audit. No npm package is required to execute the
scan.

### NFR2.4.2 — Secrets must not appear in CI logs or pipeline artifacts

**Pattern.** Dual control (Q1 + workflow hygiene):
- **Fail-closed hosted scan:** the same `scripts/secret-scan.sh` runs as the
  first CI step before lint; a secret in a PR fails the job.
- **Log/artifact hygiene:** workflow steps never `cat` credential files;
  never upload `data/`, `*.sqlite*`, `.env`, `*.pem`, or `*.key`; never write
  secret values to `GITHUB_STEP_SUMMARY` or debug logs. Scan output reports
  path/line class only, not the matched secret body.

### NFR2.4.3 — `npm ci` and blocking production audit

**Pattern.** Every non-interactive install path (CI, deploy, documented
setup) uses `npm ci`. After coverage, both Lefthook and Actions run
`npm audit --audit-level=high --omit=dev` as a blocking step. Lockfile drift
fails `npm ci`.

### NFR2.4.4 — Least-privilege pipeline permissions

**Pattern.** Top-level workflow `permissions: contents: read` only. No write
tokens, no `packages: write`, no deployment credentials, no
`pull_request_target` with untrusted checkout that exposes secrets. The
hosted gate is a merge check, not a deployer.

### NFR2.4.5 — Node pinned to `20.20.0`

**Pattern.** `setup-node` (or equivalent) pins exact patch `20.20.0`. Deploy
notes require the same host pin so `better-sqlite3`'s native addon ABI matches
CI. Floating `node-version: '20'` is forbidden in this design.

### NFR2.4.6 — Tooling ships no credentials

**Pattern.** Formatter, linter, hook, workflow, and script configs introduce
no `.env`, `*.pem`, `*.key`, token, or session signing key. New runtime
production dependencies from this unit are forbidden; lint/format/hook tools
remain **dev** tooling. Secret-scan (NFR2.4.1/2) is the automated guard.

---

## Deploy / History-Preservation Design

### NFR3.5.1 — Stop-process WAL-aware backup

**Pattern.** Ordered runbook: stop Node → copy main DB **and** WAL/SHM when
present into a host-local dated directory → then `npm ci` / migrate →
restart → smoke. Copying only the main file while the process runs is
forbidden.

**Retention (Q4).** Path shape:
`<deploy-home>/backups/YYYYMMDD-HHMMSS/` (exact root is operator-chosen on
the single host). Keep the last **3** successful pre-migrate copies; prune
older after a successful smoke. Never upload backups to CI.

### NFR3.5.2 — Smoke gates deploy success

**Pattern.** `scripts/smoke-deploy.sh` (Q3) must:
1. Register an asset
2. Transition it
3. Confirm the audit entry carries an actor (mechanism-agnostic: any trusted
   server-side actor visible on the row; production of that value remains
   `OQ1`)
4. Confirm pre-deploy audit row count is intact

Exit non-zero ⇒ deploy is **not** successful. Product-owner sign-off and
commit SHA recording remain mandatory (C6).

### Rollback hold (Q6) — binds NFR3.5.2 failure path

**Pattern.** On smoke failure the runbook's only allowed next action is:
stop → restore DB+WAL+SHM from the pre-migrate backup just taken → check out
the previous commit SHA → `npm ci` if needed → restart. Forward repair on the
migrated database without a fresh stop-then-copy backup cycle is forbidden.
The failed deploy is recorded as failed (SHA + smoke result); it is never
reported successful.

---

## Testability Design

| Leaf | Design |
|---|---|
| NFR6.1.1 | Lefthook and Actions both run the existing suite after lint; tooling must not delete or replace baseline tests to pass a gate |
| NFR6.2.1 | `vitest.config.js` sets `coverage.thresholds.lines = 80`; both gates run `npm run test:coverage` before audit |

---

## Topology Constraint

### NFR5.1.1 — No second topology

**Pattern.** This unit's deliverables exclude Dockerfile, compose, IaC, a
second host, and a staging split. The Actions workflow and deploy runbook
target the existing single-process, single-host, machine-local SQLite
deployment (C4 / NFR5.1). Q5's "reusable workflow later" means YAML
factoring only — not a new deployment topology.

---

## Threat Alignment (STRIDE → design control)

| STRIDE | Control in this design |
|---|---|
| Spoofing (CI identity) | `contents: read` only; no deploy secrets in the merge workflow |
| Tampering (lockfile / deps) | `npm ci` + blocking high production audit; pinned Node |
| Repudiation (false green deploy) | Smoke script + sign-off + SHA; Q6 rollback hold |
| Information disclosure | Shared secret-scan in Lefthook + CI; log/artifact hygiene; no backup uploads |
| Denial of service (addon ABI skew) | Exact Node `20.20.0` pin CI and host |
| Elevation of privilege | Least-privilege Actions permissions; no `pull_request_target` secret exposure |

**Accepted residual risk.** `better-sqlite3`'s `prebuild-install \|\| node-gyp
rebuild` fallback remains accepted for a single-host internal tool. The Node
pin reduces ABI skew; it does not remove install-script execution.

---

## What This Design Does Not Decide

- Actor-identity mechanism (`OQ1`) and conditional CSRF
- Application XSS, SQL binding, response headers, append-only triggers
- Creating the git remote (human prerequisite)
- Exact absolute backup root path on the host (operator chooses under the
  single-host constraint; retention policy is fixed)
- Concrete regex pattern set inside `scripts/secret-scan.sh` (owned by that
  script at code-generation; design requires dependency-free fail-closed
  behaviour and shared invocation)

---

## Sources Consumed

| Upstream | What this file takes |
|---|---|
| `security-requirements` | All unit adjudications and binding leaves NFR2.4.*, NFR3.5.*, NFR5.1.1, NFR6.1.1, NFR6.2.1 |
| `tech-stack-decisions` | GitHub Actions, Lefthook, Prettier options, ESLint flat config, Node `20.20.0`, `npm ci`, stop-then-copy |
| `contract-summary` | N/A for packaging design surface — no inter-unit runtime contract is implemented by this unit; deploy/smoke protect audit history that contracts assume exists |
| `functional-spec` | N/A — packaging owns no functional-design produces; application behaviours are enforced by other units' gates this unit hosts |
| `rules` | N/A as a functional-design artifact for this unit; business/security rules that bind packaging are carried via `security-requirements` and team Mandated practices already reflected there |
| `nfr-design-questions` | Q1–Q6 confirmed answers |

**Stage-level consumes not produced for this unit.** The stage definition also
lists `performance-requirements`, `scalability-requirements`,
`reliability-requirements`, and `observability-requirements`. For a
`packaging` unit those artifacts are excluded by `produces_kinds` at
nfr-requirements and were never written under this unit. Reliability and
topology leaves that bind packaging (`NFR3.5.*`, `NFR5.1.1`) are carried
inside `security-requirements` and this file, not separate NFR requirement
files. Performance / scalability / observability design files are likewise
out of this unit's `produces_kinds`.
