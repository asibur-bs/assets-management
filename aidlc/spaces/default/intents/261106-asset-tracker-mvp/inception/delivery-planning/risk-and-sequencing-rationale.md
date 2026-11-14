# Risk and Sequencing Rationale — Asset Tracker MVP

**Stage**: delivery-planning (inception)
**Intent**: 261106-asset-tracker-mvp
**Space**: default
**Scope**: feature

This file states why the release is delivered in the order it is, and what
each increment does about the release's open risks.

**A Bolt** is one increment of delivered, mergeable work that carries its own
proof. Later mentions read as "Bolt".

**What this file is.** The reasoning behind the order, checked against the
dependency DAG the units stage produced and against the sixteen risks the
feasibility stage recorded.

**What this file is not.** It is not a risk register, and it does not close a
risk. Sixteen risks are open and none of them is closed by this plan. It
records which Bolt acts on which risk, and which risks no Bolt can retire.

---

## The Three Forces That Fix the Order

The sequence is not a preference. Three constraints determine it, and they
are stated here before any Bolt, because a reader who checks the order
against only one of them will find an apparent inconsistency.

### Force one — the dependency DAG

Stage 2.7 produced six units and ten code edges. The authoritative form is
the machine-readable edge block in `unit-of-work-dependency.md`:

```yaml
units:
  - name: u6-tooling-and-delivery
    kind: packaging
    depends_on: []
  - name: u2-domain-vocabulary
    kind: library
    depends_on: []
  - name: u1-foundation
    kind: service
    depends_on: [u2-domain-vocabulary]
  - name: u3-write-path
    kind: service
    depends_on: [u2-domain-vocabulary, u1-foundation]
  - name: u4-reporting
    kind: service
    depends_on: [u2-domain-vocabulary, u1-foundation, u3-write-path]
  - name: u5-presentation
    kind: ui
    depends_on: [u2-domain-vocabulary, u1-foundation, u3-write-path, u4-reporting]
```

**The check was run against this block, not against the prose table above
it.** A dependency graph whose stated derivation rule is mechanical must be
checked by running the rule, because a reader checking by eye checks a
different rule than the one the file claims to follow.

### Force two — three project-wide ordering constraints

| Constraint | What it orders | Why it exists |
|---|---|---|
| `C13` | The trunk rename from `master` to `main` is the release's **first act**. | The organisation-wide default names the trunk `main`; the repository's only branch today is `master`. The human decided to rename it before the MVP work starts, so every document, script and CI configuration in the MVP names `main`. |
| `C12` | The formatter and linter configuration lands as its **own first commit, before any MVP work**. | A formatting-only change is far easier to read on its own than the same change mixed in with a table rebuild. |
| `C11` | The hosted pipeline is configured **before the MVP work merges**. | The scope's coverage floor and merge gate are otherwise unverifiable, and the 66/66 baseline would be checked only by whoever remembers to run it. |

**`C13` is discharged inside B1.** The trunk rename is part of the toolchain
establishment, because it is a repository-level act that has to precede every
branch the release opens.

### Force three — the risk-first ordering the Ideation phase approved

The approval attached five conditions to its go, and the first of them is
that the actor-identity decision is resolved first. The ordering this plan
follows is the one the approval recorded:

> actor decision → design board → foundation → lifecycle → count-consistency
> group → remaining must-haves → cross-cutting work

**The plan's order is that order, expressed as Bolts.** B4 is the foundation,
B5 the lifecycle, B6 the count-consistency group, B7 the remaining
must-haves. B1 through B3 are the cross-cutting work that must precede them,
and the actor decision is a precondition rather than a step.

---

## The Order, and the Reason for Each Position

| # | Bolt | Why here |
|---|---|---|
| **B1** | `establish-the-toolchain` | `C12` requires it first, and `C13`'s trunk rename belongs with it. Nothing else can be checked until the formatter, the linter and the hook exist, and `C12`'s own rationale — that a formatting-only change reads better alone — is the reason it is not folded into a later Bolt. |
| **B2** | `lock-the-merge-gate` | The pipeline enforces the formatter and linter, so it cannot be configured before they exist. `C11` requires it before the MVP work merges, which places it after B1 and before the domain work — not in the Operation phase, where the CI work would otherwise sit. |
| **B3** | `define-the-domain-vocabulary` | It depends on nothing, so the DAG permits it anywhere. It is sequenced here because it is actor-independent — the approval's fifth go condition is that the actor-independent work proceeds in parallel rather than being held hostage to I-01 — and because every later Bolt reads from it. |
| **B4** | `rebuild-the-history` | It is the release's first hard dependency: everything above it inherits the schema it produces. It is also the Bolt with the most consequential failure mode, since the wrong rebuild order destroys audit history **silently, with the transaction committed and no error raised**. |
| **B5** | `write-the-lifecycle` | The DAG orders it after the foundation and the vocabulary. The write path's own transition table must not be split across two units, so the whole of it lands together. |
| **B6** | `agree-on-the-counts` | The DAG orders the reporting unit after the write path, because the query reads the assets the write path owns. The count group is the indivisible one: the dashboard, the directory, the list and the export ship together or not at all. |
| **B7** | `complete-the-surfaces` | The last, because it depends on everything above it — including the counts it renders. |

**The one position the DAG does not fix** is B3's. The vocabulary depends on
nothing, so it could have been first, second or fourth. It is third because
B1 and B2 are short, because the vocabulary's contents do not depend on
anything the release has to decide, and because getting the vocabulary
committed before the foundation means the foundation's `CHECK` text and
backfill actor value are drawn from a settled source rather than an unsettled
one.

---

## The DAG Conformance Check

**Every Bolt's unit set is a subset of what the edge block permits, and no
Bolt precedes a unit it depends on.**

| Bolt | Units | Required predecessors | Present? |
|---|---|---|---|
| B1 | `u6` (part 1) | none | ✓ |
| B2 | `u6` (part 2) | none in the DAG; B1 in the tool's own order | ✓ |
| B3 | `u2` | none | ✓ |
| B4 | `u1` | `u2` | ✓ (B3) |
| B5 | `u3` | `u2`, `u1` | ✓ (B3, B4) |
| B6 | `u4`, `u5` (count surfaces) | `u2`, `u1`, `u3`, `u4` | ✓ (B3, B4, B5) |
| B7 | `u5` (remainder) | `u2`, `u1`, `u3`, `u4` | ✓ (B3, B4, B5, B6) |

**No deviation from the DAG.** Every edge in the block is respected by the
order, and the order introduces no edge the block forbids.

**The tooling unit's relation is not an edge, and the check says so.** `u6`
appears in the block with an empty `depends_on` because it owns no catalogue
component, so the derivation rule cannot produce an edge into or out of it.
Its relation to the domain units is the **merge gate** `C11` places on
merging, not a relation between components. The two are deliberately not
merged in this file either: B2's position relative to B4 is a fact about
when work may merge, and B1 → B2 is a fact about the tool's own internal
order.

**The only independent pairs in the graph are `u6` with each of the five
domain units.** The plan does not exploit that parallelism, and says so: the
release has one developer, so the benefit parallelisable units buy — short
cycles, concurrent review — is largely unavailable, while the coordination
cost of units that share a transaction is paid in full. The parallelism is
recorded because it is a real property of the graph, not because a second
pair of hands is expected to use it.

---

## The Risk Position, Bolt by Bolt

**Sixteen risks are open. None of them is closed by this plan.** What the
plan records is which Bolt acts on which risk, and where acting on a risk is
not the same as retiring it.

### R-01 — the migration runner is the single point of failure

**Severity** High · **Owner** Architect · **Acted on in: B4**.

Both structural rebuilds run through the migration runner, and it is the
least-covered of the three areas under change. **Foundation implementation is
gated on demonstrated migration safety**: before either rebuild is applied,
the runner is tested against a representative copy of the existing populated
SQLite database, demonstrating the `assets` rebuild, row-for-row asset
preservation, audit-history preservation, and successful completion. **The
live operational database is never the test target**, and the evidence is
recorded before the rebuilds proceed.

**B4 is where this is retired, and not before.** It is the only Bolt that
touches the rebuild path.

### R-02 — organisational adoption readiness

**Severity** High · **Owner** Product owner · **Acted on in: no Bolt.**

**No technical mitigation exists for this risk.** It is a rollout risk, not a
scope defect, and it is resolved by gathering stakeholder input on what
would make the tool the easier path than the incumbent spreadsheet. That
happens through the stakeholder process, before operational readiness is
accepted — not through a Bolt. The plan records it as open and states that
no Bolt closes it.

### R-03 — the repository's update path writes every column unconditionally

**Severity** High · **Owner** Developer · **Acted on in: B5**.

The repository writes every column, so a partial update that omits a column
clears it. This is the mechanism behind the clobber risk that POC
requirement `FR5.3` addresses, and it is why `last_assigned_to` retention
and `assigned_to` clearing during a discard have to be **deliberate**. The
update path is made explicit about which columns it writes, with regression
tests covering both cases.

**This is why the discard transition sits in B5 and not earlier.** The discard
resolves the assignment inline; an unconditional update path would clear the
field as a side effect rather than by decision.

### R-04 — the design system is the largest unestimated body of work

**Severity** High · **Owner** Designer · **Acted on in: no Bolt — deferred.**

The design system is deferred from this release, and its estimate is retired
early under the risk-first heuristic because the gap analysis's 6–8 week
figure is explicitly conditional on scoping that workstream. It maps to no
Bolt, and no Bolt depends on it. When it is pulled forward, its trigger is
the start of the deferred increment.

### R-05 — the shared counting function is bypassed by some surfaces

**Severity** High · **Owner** Architect · **Acted on in: B6, with the
definition in B3.**

A surface computing its own count breaks the guarantee silently, with no
error and no failing test. **B3 owns the shared definition and the filter
builder; B6 owns the aggregation and the four surfaces that consume it.**
The mitigation is that the shared function is the only way to produce a
count, backed by a test asserting that all four surfaces route through it —
a surface that cannot obtain its count from the shared function should fail
to build.

**This is the risk the indivisible group exists to prevent.** A group that
ships all but one of its members has no guarantee at all, which is why B6
delivers all four surfaces together.

### R-06 — `SQLITE_BUSY` is not distinguished from a genuine duplicate

**Severity** Medium · **Owner** Developer · **Acted on in: B5.**

The standing condition requires `SQLITE_BUSY` to map to a retryable error,
and the busy window is real rather than theoretical. The two error paths are
mapped distinctly in the repository layer and covered separately: one
retries, the other reports a duplicate. Detection is by the
machine-readable `err.code`, never by message text.

### R-07 — the entire system of record lives in one un-replicated file

**Severity** Medium · **Owner** Operations · **Acted on in: B2 (procedure)
and from B4 onward (exercise).**

A backup and restore procedure that is **exercised**, not merely written, is
the minimum credible operational posture. **B2 writes the WAL-aware backup
step**, because `journal_mode = WAL` means committed rows can still be
sitting in the sidecar file next to the main database. **From B4 onward the
backup is exercised on every deploy** — the deploy order's backup step
precedes the migration it protects.

**The backup must be exercised on the change that could cause the loss.** The
failure the backup absorbs raises no error, so deferring the exercise to the
end of the release would leave the whole release's schema changes unbacked.

### R-08 — the pre-MVP audit rows are actor-less

**Severity** Medium · **Owner** Developer · **Acted on in: B4.**

The POC's audit table has no actor column, so the backfill synthesises
attribution rather than preserving it. The backfill assigns a `system` actor,
and the approved section 24 amendment **excludes those rows from the Audit
Completeness metric**, so the metric is measured against a defined, stated
population. The backfill preserves the original rows and reports failures.

### R-09 — the rebuilds touch production data with no staging copy

**Severity** Medium · **Owner** Operations · **Acted on in: B2 and B4.**

A copy of the live database is taken and verified before any migration runs
against it. **A restore that has not been rehearsed is not a backup** — which
is why the rehearsal (remediation R6) is explicitly separate from the
procedure design (remediation R5), and why both precede the operational
readiness sign-off.

### R-10 — the audit trail has no tamper-evidence beyond the cascade removal

**Severity** Medium · **Owner** Architect · **Acted on in: B4 and B5.**

Removing `ON DELETE CASCADE` prevents accidental deletion. It does not make
the audit rows append-only at the storage layer, and the POC's error handler
maps a generic failure to a 500 with no audit of the failure. **B4 installs
the two `BEFORE UPDATE` and `BEFORE DELETE` triggers**, so append-only is
enforced by the database rather than by application code. The `BEFORE DELETE`
trigger additionally blocks the cascading delete of a parent asset row.

### R-11 — the status value set and the schema's CHECK constraint diverge

**Severity** Medium · **Owner** Developer · **Acted on in: B3 and B4.**

The repository's allowed set and the schema's `CHECK` agree today. Adding
`discarded` to one but not the other reproduces the divergence. **B3 owns
the single status vocabulary; B4 extends the schema's `CHECK` from it**, and
a test asserts that the repository's allowed set and the schema's `CHECK`
agree.

**The two literal copies are a recorded boundary, not a defect.** The
stylesheet's `.status-*` class names are the third copy, and generating the
SQL file and the stylesheet from the JavaScript layer would introduce a build
step into a release that has none.

### R-12 — the 66/66 baseline is treated as a floor rather than as a gate

**Severity** Medium · **Owner** Quality engineer · **Acted on in: B1.**

A "preserve" condition is only meaningful if it is enforced. **B1 installs
the pre-commit hook** that runs the ordered steps against the staged change
and refuses the commit if a step fails, and makes the coverage floor
enforceable with `coverage.thresholds.lines = 80`. From B2 the hosted
pipeline enforces it on the branch.

### R-13 — the app is unauthenticated and the actor-trust rule is unimplemented

**Severity** Medium · **Owner** Architect · **Acted on in: none until the
decision; then B4 and B5.**

This is the risk the whole plan turns on. The rule is fixed; the mechanism
is unset. The mitigation is an ordering, not a technique: **the audit-table
replacement lands first, so the actor column is in place before the mechanism
writes to it, and then the mechanism is implemented before any lifecycle
transition work depends on it.**

**B4 and B5 are therefore both downstream of the actor-mechanism decision,
and the decision is downstream of I-01.** The plan does not prepare both
branches. The team's confirmed position is to sequence the resolution forward
and accept the cost of a late answer, because preparing both branches spends
effort on a branch that may never be needed.

### R-14 — the CSV export emits bulk asset data into spreadsheet consumers

**Severity** Medium · **Owner** Developer · **Acted on in: B6.**

A formula-injection defect would only be discovered when someone opens the
file. The protection is implemented as a required part of the export: one
shared escaping function applied to **every** string cell, covering a leading
`=`, `+`, `-`, `@`, tab or carriage return — not a selected subset of
columns, because `name` and `notes` are user-typed free text and the
property that gets lost when someone adds a column later is exactly the "all
cells" property. Tests assert that a cell beginning with `=` is exported with
the prefix and that a benign cell is exported unchanged.

### R-15 — single-developer concentration

**Severity** Low · **Owner** Architect · **Acted on in: the whole plan.**

One person holds the full context of a codebase about to change substantially.
The mitigation is **not** a second author and **not** uncommitted external
support. It is: the architectural decisions recorded as ADRs, so the reasoning
survives independently of the person; the mandatory design-board checkpoint
before the foundation; and the plan's own discipline that every inter-Bolt
seam is a published contract, so a reviewer can check the plan against the
contracts without reading the implementation.

### R-16 — the absence of CI means the baseline is verified only when someone remembers

**Severity** Medium · **Owner** Quality engineer · **Acted on in: B2.**

The pipeline is a pre-existing gap the MVP inherits rather than creates. The
build-and-test stage owns it, and **B2** delivers it: lint → test → coverage
check → dependency audit, in that order, with the dependency audit a blocking
gate.

**The constraint B2 cannot satisfy alone.** The repository has **no
configured git remote**, and every hosted pipeline platform is
pull-request-based. The pipeline *definition* can be written; the hosted
pipeline cannot *run* until a remote exists. That is an organisational
arrangement, and it is carried in `external-dependency-map.md` with a named
owner and a named first action.

---

## The Risks No Bolt Retires

| Risk | Why no Bolt retires it |
|---|---|
| **R-02** — organisational adoption readiness | Resolved by the stakeholder process, not by engineering. No technical mitigation exists: no feasibility finding retires an incumbent process. |
| **R-04** — the design system's size | Deferred from the release. Its trigger is the start of the deferred increment. |
| **R-13** — the actor mechanism | The decision is upstream of every Bolt that acts on it, and the decision belongs to the organisation, not to a Bolt. |

**Three risks are not closed by this plan, and saying so is the point.** The
plan's risk content is a sequencing statement: it says which Bolt acts on
which risk, and it says plainly where the engineering cannot reach.

---

## The Ordering Constraints That Are Not Risks

Four requirements order the release without being risks in the register.
They are recorded here because a reader checking the sequence against the
risks alone would find them unexplained.

| Requirement | What it orders |
|---|---|
| `C13` — the trunk rename from `master` to `main` | The release's first act, inside B1. |
| `C12` — the formatter and linter as its own first commit | B1's position and its separation from any domain work. |
| `C11` — the hosted pipeline before the MVP merges | B2's position, and B2's split from B1. |
| `NFR6.4` — the two test-first exceptions | The uniqueness-check test lands in its own commit inside B5, ahead of the implementation it pins; the rebuild test lands in its own commit inside B4, ahead of its implementation. |

**Why the test-first exceptions get their own commits.** The team's rule is
that a behaviour change and its proof land in the same commit, and these two
are exceptions to the *ordering* within that rule. Their defects are ones a
test written after the code will not reliably reproduce — a race, and a silent
history loss with the transaction committed — which is a property of *when*
the test was written, not of when it was committed. A commit containing both
files cannot demonstrate the ordering to a reviewer.

---

## The Open Items That Shape the Order

| Item | What it is | How the plan treats it |
|---|---|---|
| **I-01 / I-03** | Whether a trusted authentication mechanism exists anywhere in the organisation, and the internal existing-tool inventory that would answer it | The **first** unblocking action, ahead of every other item by the allocation rule. Not a Bolt: the answer belongs to the organisation. |
| **I-02** | Whether a records-retention or disposal schedule applies to asset custody records | Routed to Compliance, in parallel with I-01. It does not gate any Bolt in this plan. |
| **I-04** | The unquoted licence cost of the off-the-shelf alternative | Closed as irrelevant to the Build position unless the comparison is reopened. A recorded uncertainty. |
| **I-05** | Organisational adoption readiness | The same item as R-02. No Bolt. |
| **I-06** | The actor-trust rule is unimplementable until the mechanism is chosen | Handled by the ordering: the audit-table replacement lands first, so the actor column exists before the mechanism writes to it. |
| **Q19** | The release-boundary question raised by the two omitted discard transitions | Resolved at the Scope stage in Inception. The transitions keep their approved standing; both are refused with the invalid-transition code in this release, and no Bolt changes that. |
| **D-39 / reviewers** | The specific individuals behind the three review points | Named before the first review point is scheduled. Until then the groups are staffed but not scheduled. |
| **Stakeholder availability** | The response times the four stakeholder groups will commit to | Confirmed in Inception; it gates the foundation's schedule. |

---

## Why the Order Is Not the Only Valid One

**The DAG admits more than one topological ordering.** `u2` and `u6` depend on
nothing, and the only independent pairs in the graph are `u6` with each of
the five domain units. An order that put B3 first, or B2 after B4, would
also satisfy every edge.

**The chosen order is the one the risk-first heuristic selects**, and the
three forces above each contribute a reason. The order was not chosen for
convenience and it was not chosen to maximise parallelism — with one
developer, parallelism buys nothing here.

**What would change the order.** If capacity is consumed elsewhere, the
correct response is to preserve the ordering and let the schedule extend, not
to reorder. If the actor decision lands late, B4 and everything above it
wait; the cost of a late answer is accepted rather than spending effort on a
branch that may never be needed.

---

## Sources Consumed

- `aidlc/spaces/default/intents/261106-asset-tracker-mvp/inception/units-generation/unit-of-work-dependency.md`
  — the ten-edge DAG, the authoritative machine-readable edge block, the seam
  table, and the parallel-development analysis.
- `aidlc/spaces/default/intents/261106-asset-tracker-mvp/inception/units-generation/unit-of-work.md`
  — the six units, their complexity bands, and each unit's component
  assignment.
- `aidlc/spaces/default/intents/261106-asset-tracker-mvp/inception/contract-design/contract-summary.md`
  — the twelve contracts, the eight-code failure model, and the six open
  questions.
- `aidlc/spaces/default/intents/261106-asset-tracker-mvp/ideation/feasibility/raid-log.md`
  — the sixteen risks, the twelve assumptions, the six issues, the thirteen
  dependencies, and the dependency chain.
- `aidlc/spaces/default/intents/261106-asset-tracker-mvp/ideation/feasibility/feasibility-assessment.md`
  — the two qualifications, the actor-mechanism candidate shortlist, and the
  sequencing recommendation.
- `aidlc/spaces/default/intents/261106-asset-tracker-mvp/ideation/scope-definition/scope-document.md`
  and `intent-backlog.md` — the release boundary, the two indivisible groups,
  the three invariants, and the ten proto-Units' risk-first ordering.
- `aidlc/spaces/default/intents/261106-asset-tracker-mvp/ideation/team-formation/team-assessment.md`
  and `skill-matrix.md` — the capacity allocation rule, the inherited
  obligations, and the trigger-based remediation plan.
- `aidlc/spaces/default/intents/261106-asset-tracker-mvp/ideation/approval-handoff/decision-log.md`
  and `initiative-brief.md` — the fifty-two Ideation decisions, the five go
  conditions, and the open items that ride with the release.
- `aidlc/spaces/default/memory/team.md` and `project.md` — the affirmed
  practices and the binding product-behaviour contracts.
