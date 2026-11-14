# Infrastructure Design Questions — `u2-domain-vocabulary`

**Stage**: infrastructure-design (construction)
**Intent**: 261106-asset-tracker-mvp
**Unit**: `u2-domain-vocabulary` — Domain Vocabulary and Error Contract
**Unit kind**: `library`

This unit has **no deployable process**, no host, no container, and no cloud
resource of its own. For a `library` unit the stage produces only
`cicd-pipeline.md` and `traceability.json` — not an infrastructure
specification or monitoring design. Questions therefore focus on how this
unit's modules are built, tested, and gated in the shared pipeline.

Upstream NFR Design already fixed: `vocabulary.js` / `translation.js` /
`index.js`, one-way `translation → vocabulary`, empty third-party closure,
Vitest pure unit tests, live busy acceptance deferred to the write path.

---

## Q1 — Where this unit's CI jobs live

The release already has (or will have) one CI entry for the monolith. This
unit must not invent a second pipeline host.

**A.** **Jobs are stages inside the release's single CI pipeline** (the tooling
and delivery unit owns the workflow file). This unit's design names the
required stages and gates; it does not add a second CI product.

**B.** **A dedicated workflow file only for this unit**, triggered on changes
under its path, separate from the release pipeline.

**C.** **No CI design for this unit** — rely entirely on ad-hoc local runs until
code-generation.

[Answer]: A

---

## Q2 — What the pipeline must run for this unit before merge

**A.** **Lint (tooling config) + unit tests + coverage contribution to the
project 80% floor.** No image build, no deploy, no integration harness here.
Busy-mapping table tests run; live `SQLITE_BUSY` stays in the write-path job.

**B.** **Unit tests only** — lint and coverage are deferred entirely to the
tooling unit's global job with no unit-specific mention.

**C.** **Full monolith test suite on every change to this unit**, including
HTTP and SQLite integration, as the only acceptable gate.

[Answer]: A

---

## Q3 — How consumers get the modules

**A.** **Same-repo CommonJS require from the package entry** (`index.js`) —
no publish to a registry, no separate versioning for this leaf. CI only
proves the modules load and tests pass inside the monolith checkout.

**B.** **Publish to an internal npm registry** with a semver for this unit
alone, and pin consumers to that version.

**C.** **Copy-paste / vendoring** into each consumer tree (reject unless there
is a hard reason).

[Answer]: A

---

## Q4 — Failure and rollback meaning for a library with no deploy

**A.** **Merge is the release unit.** A red job blocks merge. Rollback means
reverting the merge commit on `main` (trunk-based). There is no separate
deploy rollback for this unit.

**B.** **Feature flags around vocabulary changes** so a bad constant can be
disabled without revert.

**C.** **Hotfix the running Node process** without a git revert.

[Answer]: A

---

## Ambiguity Analysis

### Vague answers

**None.** All four answers are a single option letter.

### Contradictions between answers

**None.** Q1's single release pipeline, Q2's lint+unit+coverage gate, Q3's
same-repo require, and Q4's merge/revert rollback form one consistent
trunk-based story for a leaf with no deployable.

### Missing details needed for artifact generation

**M1 — Workflow ownership.** Fixed by Q1: the tooling and delivery unit owns
the workflow file; this unit names stages and gates only.

**M2 — What "coverage contribution" means.** Fixed by Q2 together with
NFR6.2 / tech-stack: this unit's tests feed the project-wide 80% floor; there
is no separate per-unit coverage gate.

**No follow-up question is raised.**

---

## Consolidated Summary Confirmation

- **CI home (Q1):** Jobs are stages inside the release's single CI pipeline;
  tooling/delivery owns the workflow file.
- **Pre-merge gate (Q2):** Lint + unit tests + coverage toward the 80% floor;
  no image/deploy/integration harness here; live busy stays with write-path.
- **Distribution (Q3):** Same-repo CommonJS require from `index.js`; no
  registry publish.
- **Failure/rollback (Q4):** Red job blocks merge; rollback = revert the merge
  on `main`.

Does this all look correct before I generate the artifact?

- Looks correct — Generate the artifact from these answers
- Request changes — Revise one or more answers before generation

[Answer]: Looks correct
