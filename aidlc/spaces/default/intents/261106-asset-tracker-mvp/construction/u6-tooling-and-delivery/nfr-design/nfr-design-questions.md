# NFR Design Questions — `u6-tooling-and-delivery`

**Stage**: nfr-design (construction)
**Intent**: 261106-asset-tracker-mvp
**Unit**: `u6-tooling-and-delivery` — Tooling and Delivery
**Unit kind**: `packaging`

This unit owns no application runtime. NFR Design here is how the **merge
gates and the deploy procedure** enforce the already-approved security and
testability requirements — not middleware, caches, or scaling topology.

Upstream NFR Requirements for this unit bind:
- Security leaves under `NFR2.4.*` (secret scan, CI log hygiene, `npm ci` +
  blocking audit, least-privilege Actions permissions, pinned Node, no
  tooling credentials)
- Migration-survival leaves `NFR3.5.1`, `NFR3.5.2` (stop-then-copy backup;
  smoke-gated deploy success)
- Testability leaves `NFR6.1.1`, `NFR6.2.1` (suite + 80% coverage enforced by
  tooling)
- Topology leaf `NFR5.1.1` (no second host / container / IaC)

Technology stack already fixed: GitHub Actions, Lefthook, Prettier options,
ESLint flat config, Node `20.20.0`, stop-then-copy backup.

---

## Q1 — Where the secret scan runs for pull requests

The approved requirement that secrets must not appear in CI logs
(NFR2.4.2) also asserted that a deliberate secret in a PR fails the gate.
Today the dependency-free secret scan is specified only on the **local**
Lefthook path before lint (NFR2.4.1). A developer who skips hooks has no
hosted scan unless we add one. This question fixes the design.

**A.** **Hosted fail-closed scan in GitHub Actions.** The workflow runs the
same dependency-free scan (or an equivalent fail-closed step) before lint in
CI. A secret in a PR fails the job; the step must not print the secret
value into the job log.

**B.** **Local scan only; CI asserts log/artifact hygiene.** Keep the scan
on Lefthook only. Rewrite the NFR2.4.2 pass/fail in design terms to assert
only that workflows never echo credentials or upload secret-bearing
artifacts — without claiming CI rejects a secret that never hit the local
hook.

**C.** **Both, with CI as the merge authority.** Local Lefthook still scans
first for developer feedback; CI always re-runs the same fail-closed scan so
a skipped hook cannot land a secret on `main`.

[Answer]: C

X. Other (please specify)

---

## Q2 — How the secret-scan rules are owned

The scan must be dependency-free and fail closed. We still need a durable
place for the patterns / rules so reviewers can see what is blocked.

**A.** **Committed patterns file in-repo.** A small checked-in rules file
(e.g. regex list or allowlist) is the single source the Lefthook step and
any CI step both read. Changes to patterns go through normal PR review.

**B.** **Inline in the hook / workflow script.** Patterns live inside the
shell step(s) that run the scan — no separate file. Simpler tree; harder to
review pattern diffs in isolation.

**C.** **Hook script owns patterns; CI only invokes the same script.** One
executable entry (e.g. `scripts/secret-scan.sh`) holds the rules; Lefthook
and Actions both call that script — no duplicated pattern lists.

[Answer]: C

X. Other (please specify)

---

## Q3 — How the smoke test is packaged for deploy

Deploy success requires registering an asset, transitioning it, confirming
an audit actor is present, and confirming pre-deploy audit row count
(NFR3.5.2). Actor *production* remains open (`OQ1`); the check itself must
be mechanism-agnostic. This question fixes **how operators run the smoke**.

**A.** **Documented manual checklist only.** The deploy runbook lists the
exact steps and expected observations; the operator executes them by hand
and records pass/fail + commit SHA.

**B.** **Committed smoke script + runbook.** A script in-repo performs the
register / transition / actor-visible / row-count checks against the local
app; the runbook requires the script to exit 0 before sign-off. Actor check
accepts any trusted server-side actor value on the audit row.

**C.** **Runbook checklist that shells out to existing test helpers.** No
new smoke binary; the runbook names specific existing suite commands or
`node` one-liners already in the tree, with the same mechanism-agnostic
actor rule.

[Answer]: B

X. Other (please specify)

---

## Q4 — Where backups live and how long they are kept

Stop-then-copy backup (NFR3.5.1) protects audit history before migrate.
Retention and location are not yet designed; they affect rollback and
disclosure risk (backups must not become CI artifacts — NFR2.4.2).

**A.** **Host-local dated directory, retain last N backups.** e.g.
`/var/backups/asset-tracker/YYYYMMDD-HHMM/` (or a path under the deploy
home), keep the last **3** successful pre-migrate copies (DB + WAL + SHM),
prune older ones after a successful smoke. Never upload to CI.

**B.** **Host-local single rolling slot.** One `pre-migrate` backup
directory overwritten each deploy; simpler, but only the immediately
previous deploy is restorable.

**C.** **Host-local dated directory, retain until manual prune.** No
automatic prune in MVP; the runbook requires the operator to delete old
copies when disk pressure appears.

[Answer]: A

X. Other (please specify)

---

## Q5 — Shape of the GitHub Actions workflow

The hosted gate is lint → test → coverage → dependency audit on pinned Node
`20.20.0`, with least-privilege `permissions` (NFR2.4.3–NFR2.4.5). Job
shape affects blast radius and how we add the secret-scan decision from Q1.

**A.** **Single job, ordered steps.** One job on `ubuntu-latest` with
explicit `permissions: contents: read`, pinned Node, then the ordered
steps. Simplest for a solo trunk-based repo.

**B.** **Two jobs: scan+lint, then test+coverage+audit.** Fail-fast on scan
or lint before paying for the heavier suite; both jobs still read-only
permissions and the same Node pin.

**C.** **Reusable workflow later; for MVP a single in-repo workflow file.**
Same as A for behaviour, but the design states a future extract to
`.github/workflows/reusable-*.yml` is allowed without changing the control
set.

[Answer]: C

X. Other (please specify)

---

## Q6 — How rollback is designed when smoke fails

A failed smoke must restore the backup and the previous commit, and must
not be reported successful (NFR3.5.2). Manual deploy is fixed by C5/C6.

**A.** **Ordered restore runbook only.** Document: stop process → restore
DB+WAL+SHM from the pre-migrate backup → check out previous commit SHA →
`npm ci` if needed → restart → re-smoke or abort with recorded failure.
No automation beyond the documented steps.

**B.** **Restore script + runbook.** A committed `scripts/rollback-deploy.sh`
(or equivalent) performs the file restore and reminds the operator of the
git checkout; the runbook still requires product-owner acknowledgement of
the failed deploy.

**C.** **Runbook with explicit "do not migrate forward" hold.** After smoke
failure, the only allowed next action is restore+previous commit; the
design forbids attempting a forward fix on the migrated DB without a fresh
backup cycle.

[Answer]: C

X. Other (please specify)

---

## Consolidated Summary Confirmation

- **Secret scan placement (Q1):** Both — Lefthook scans first for developer feedback; CI re-runs the same fail-closed scan as the merge authority so a skipped hook cannot land a secret on `main`.
- **Secret-scan ownership (Q2):** One committed script (e.g. `scripts/secret-scan.sh`) holds the rules; Lefthook and Actions both invoke it — no duplicated pattern lists.
- **Smoke packaging (Q3):** Committed smoke script + runbook; script must exit 0 before sign-off. Actor check is mechanism-agnostic (any trusted server-side actor on the audit row).
- **Backup retention (Q4):** Host-local dated directories; retain the last **3** successful pre-migrate copies (DB + WAL + SHM); prune older ones after a successful smoke; never upload to CI.
- **Actions shape (Q5):** Single in-repo workflow with ordered steps for MVP (`contents: read`, Node `20.20.0`); a later extract to a reusable workflow is allowed without changing the control set.
- **Rollback on smoke failure (Q6):** Runbook with an explicit “do not migrate forward” hold — after smoke failure the only allowed next action is restore backup + previous commit; no forward fix on the migrated DB without a fresh backup cycle.

Does this all look correct before I generate the artifact?

- Looks correct — Generate the artifact from these answers
- Request changes — Revise one or more answers before generation

[Answer]: Looks correct

