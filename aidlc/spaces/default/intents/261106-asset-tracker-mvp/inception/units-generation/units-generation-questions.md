# Units Generation — Decomposition Plan and Interview Questions

**Stage**: units-generation (inception)
**Intent**: 261106-asset-tracker-mvp
**Space**: default
**Scope**: feature
**Depth**: Standard

This file holds the decomposition plan for the Asset Tracker MVP's units and the
questions that shape it. The answers recorded below drive the generation of
`unit-of-work.md`, `unit-of-work-dependency.md`,
`unit-of-work-story-map.md` and `traceability.json` in this directory.

**What this stage decides.** How the release's twenty-one components group
into units of work; which unit owns which story; what each unit depends on;
and what kind of construction artifact each unit will carry.

**What this stage does not decide.** Which unit ships first. The stage file
is explicit: this stage produces the **dependency DAG** — the topology — and
Stage 2.9 Delivery Planning chooses the **economic path through it**, the Bolt
sequence. No implementation order, no critical path, no "ship this first"
recommendation appears in the artifacts this stage produces.

Four upstream facts constrain the plan and are **not** reopened here:

- **The component catalogue is the contract.** `components.md` names
  twenty-one components, their entities, their dependency edges, and the
  fifteen ADRs in `decisions.md` that constrain how they may be grouped. An
  ADR that keeps two things apart forbids bundling them into one unit.
- **The requirements are the contract.** `requirements.md` states the release
  as FR1–FR11 and NFR1–NFR6, with three approved invariants, the actor-trust
  rule, and normalised category-scoped uniqueness.
- **The stories are the behavioural surface.** `stories.md` carries 30
  released stories across US0–US7 and 10 deferred follow-on items.
- **The deployment target is one host.** `NFR5.1` requires the release to
  remain a single-process application on a single host with one local
  database file, and `C4` names that host. The team's deployment practice
  confirms it: one environment, one target, a gate before the deploy.

---

## Decomposition Approach

**What a unit is here.** A unit is a slice of the release that a team can
build, test, and deliver as a coherent body of work, with its own
construction directory. It is *not* a component: the components are the
building blocks, and the units are the boxes the building blocks are
delivered in.

**The unit boundary is drawn where the team's own rules already draw one.**
The team's practice states two boundaries that are not negotiable:

- **The foundation workstream is one indivisible unit.** The actor decision,
  the `audit_log` rebuild, and the `assets` rebuild are never split across
  commits that are individually deployable — a commit that rebuilds `assets`
  without rebuilding `audit_log` first destroys the audit history. The
  scope document records the same thing as GROUP 1: a hard predecessor of
  every other capability.
- **The four count-consuming surfaces ship as one indivisible group.** They
  are the dashboard, the assignee directory, the asset list, and the CSV
  export. A group that ships all but one of its members leaves the counts
  with no consistency guarantee at all, which is the exact defect the shared
  counting definition exists to remove.

These two boundaries are not this stage's invention. They are already
recorded as standing product-behaviour contracts in the project rules, and
they are what the decomposition has to honour.

**The unit boundary strategy this plan proposes is by domain capability.**
The twenty-one components cluster into a small number of capabilities that
change for different reasons and can be tested against different criteria:

1. **Foundation** — the schema rebuild, the backfill, the connection
   ownership, and the actor resolution. The release's history guarantee
   depends on this, and its failure mode is silent.
2. **Domain vocabulary and error contract** — the leaf layer every other
   component must agree with.
3. **Persistence and the write path** — the repositories, the lifecycle, the
   registration, the editing, the uniqueness check.
4. **Reporting** — the query and counting components, and the four surfaces
   that consume them.
5. **Presentation** — the presenter, the screens, the accessibility work.
6. **Delivery and operations** — the formatter and linter configuration, the
   pre-commit hook, the hosted pipeline, the deploy procedure.

**The deployment model is monolithic throughout.** `NFR5.1` and `C4` fix it:
one process, one host, one SQLite file. Every unit is `embedded` — built into
the single application — except the packaging and tooling units, which
produce artefacts consumed at build and deploy time rather than running as
services of their own.

---

## Embedded Questions

### Q1 — What a unit boundary follows in this release

The stage offers four boundary strategies. The release's own facts point at
one of them.

**A.** **By domain capability** — a unit is a coherent body of domain work
(the foundation, the vocabulary, the write path, the reporting, the
presentation), with the components that serve that capability inside it.
**B.** **By service** — a unit is a deployable service. With one process and
one host, this produces units that are not separately deployable, so the
"service" boundary carries no information the deployment model does not
already carry.
**C.** **By feature** — a unit is one user-visible feature. This is the
shape that produces the defect the release exists to remove: the four
count-consuming surfaces are four features, and delivering them as four
features is delivering a subset of the group the project's own rule forbids
splitting.
**D.** **By deployment target** — a unit is what goes into one deployment.
There is one deployment target, so this produces exactly one unit.

**Recommendation:** A. It is the only strategy that honours both of the
team's indivisibility rules without inventing a boundary the release does
not have, and it produces units that each have their own testable outcome.
The "domain capability" is not an invented abstraction here: each cluster
maps onto a group of the twenty-one components and a set of acceptance
criteria that stand on their own.

**X. Other (please specify)**

[Answer]: A

---

### Q2 — How coarse or fine the units are

Coarse units are cheaper to plan and cheaper to hand over; fine units are
cheaper to deliver in a short cycle and easier to review.

**A.** **Coarse** — one unit per domain capability, about six units in total,
with the two indivisible groups kept whole. Each unit is a substantial body
of work, and the Foundation unit is the smallest thing that can be deployed
without endangering the history guarantee.
**B.** **Fine** — one unit per component or per closely-related pair, about
twelve to fifteen units, splitting the write path's lifecycle, registration,
editing, and uniqueness into separate units.
**C.** **Coarse, but with the write path split by story group** — custody
(assign and return) separate from the loss and recovery family separate from
editing, while the reporting and presentation groups stay whole.

**Recommendation:** A. Two facts push against B. First, the transaction
rule: the asset write and its audit append are one transaction, and
`AssetLifecycle`, `AssetRegistration` and `AssetEditing` all share the same
repositories and the same transaction discipline — splitting them across
units splits a guarantee that only exists as one mechanism. Second, the
release has one developer and no deadline, so the benefit fine units buy
(short cycles, parallel review) is largely unavailable while their cost —
coordination between units that share a transaction — is paid in full. C
splits the one component that owns the eight released edges, which would
mean two units both editing the transition table.

**X. Other (please specify)**

[Answer]: A

---

### Q3 — Whether independent units may be worked in parallel

The dependency DAG admits several valid orderings, because many units have no
dependency between them.

**A.** **Record the DAG and let the parallelism be visible** — the artifact
lists every dependency edge and explicitly names the sets of units with no
dependency between them, so a reader can see which units could proceed
concurrently, and the choice of which to start is left to Delivery Planning.
**B.** **Record a strict single sequence** — one linear order in which every
unit follows the previous one, so there is no ambiguity about what comes
next.
**C.** **Record the DAG but make the sequence explicit** — list both the
dependency edges and a recommended build order.

**Recommendation:** A. This stage's job is topology, and the stage file is
explicit that the economic path through the topology is Delivery Planning's
decision. C would smuggle that decision in — a recommended build order is
the thing 2.9 exists to decide with the value and risk information this
stage does not have. B loses the parallelism that is real: after the
foundation, the reporting work and the presentation work are genuinely
independent, and a plan that hides that is less useful to the person
sequencing the release than one that shows it.

**X. Other (please specify)**

[Answer]: A

---

### Q4 — What the integration points between units are

Units in one monolith still have seams, and the seams need a stated contract
so that a unit can be built without knowing how another one is built
internally.

**A.** **The seams are the component boundaries from the domain design.**
Each unit's public surface is the set of components it exposes to the units
above it, and the call is the one the catalogue already defines — a
repository call, a vocabulary read, a query call. No new interface is
invented at the unit boundary; the unit boundary is drawn so that a unit's
components only depend on components in units below it.
**B.** **Each unit gets an explicit published interface** — a new facade
layer over the unit's components, so that the units can be reorganised
independently later.
**C.** **The seams are the existing HTTP routes and the database schema**
— a unit is complete when its routes respond and its tables are in place,
with no internal contract at all.

**Recommendation:** A. The domain design already drew every seam in the
system, with a stated reason for each, and the team rules forbid inventing a
layer that duplicates one that exists. B adds a facade over components that
are already single-purpose, and it is the mechanism that would let a unit
change its internals without touching its callers — which, in a
single-process release with one developer, is a flexibility nobody is
exercising. C makes the schema a public contract, and the schema is
explicitly *not* stable: the foundation unit rebuilds both tables.

**X. Other (please specify)**

[Answer]: A

---

### Q5 — The deployment model each unit carries

The release deploys to one host as one process, so the interesting question
is not *which* topology but what each unit's own artefact is.

**A.** **Monolithic and embedded, with two exceptions** — every domain unit
is `embedded`: its code is built into the single application and deployed
with it. The tooling unit is `packaging` (the formatter, linter, and hook
configuration, and the pipeline definition) because it produces build and
merge artefacts rather than runtime behaviour. The domain vocabulary unit is
`library` — reusable code with no standalone runtime, consumed in place.
Every screen is `ui`.
**B.** **Every unit is `service`** — a deployable unit of its own.
**C.** **Monolithic and embedded throughout, with no unit kinds at all** —
each unit simply contributes code to the one application.

**Recommendation:** A. The unit's kind determines which construction design
artifacts apply to it, and an untagged unit receives the full matrix. A
tooling unit that carries a scalability document it does not need, or a
vocabulary library that carries an infrastructure design, is noise that
costs review attention. The `library` kind for the domain vocabulary is
accurate in a specific way: it is the leaf layer C8 commits to, it depends
on nothing but Node built-ins, and it is consumed in place rather than run.
B is not available — `NFR5.1` requires a single process and forbids an
additional deployment topology, so a unit cannot be separately deployable.

**X. Other (please specify)**

[Answer]: A

---

### Q6 — Where the release's two non-feature workstreams sit

The release contains work that is not a user-visible feature but is still
work that has to be done and has to be verified: the formatter and linter
configuration (required by `C12` to land as its own first commit, before any
MVP work), the pre-commit hook, the hosted pipeline, the backup-and-restore
procedure, and the deploy smoke test.

**A.** **A separate tooling and delivery unit** — one unit holding the
formatter and linter configuration, the pre-commit hook, the hosted pipeline
definition, and the deploy procedure, with its own acceptance criteria drawn
from `C11`, `C12`, `C5`, and `C6`.
**B.** **Each non-feature workstream folded into the unit it serves** — the
formatter and linter into the first unit that needs them, the pipeline into
the last, the deploy procedure into the foundation.
**C.** **Defer all of it to the Operation phase** — the delivery pipeline
and the deploy procedure belong to Deployment and Environment Provisioning
anyway.

**Recommendation:** A. `C12` says the formatter and linter configuration
lands as its own first commit, before any MVP work — folding it into
another unit would contradict an explicit constraint, and the project's own
rule says a behaviour change and its proof land together. `C11` makes the
pipeline a blocking merge gate that must be configured before the MVP work
merges, which means it is release work, not later work. B contradicts C12
directly, and C contradicts C11: "the hosted pipeline is configured before the
MVP work merges" is a statement about when it must exist. The deploy
procedure's backup and smoke test also belong with the migration unit's
verification story, because the backup exists precisely to absorb the
migration's silent failure mode — but the procedure itself is a unit of
operational work with its own acceptance criteria.

**X. Other (please specify)**

[Answer]: A

---

### Q7 — How the deferred capabilities are represented

Ten capabilities are approved and deferred (US8.1–US8.10): partial
recovery, credit assignment, dispute handling, the `in-stock` →
`discarded` edge, the `returned` → `discarded` edge, the design system,
responsive UI, improved search, pagination, and the designed empty state.

**A.** **Deferred capabilities map to no unit** — they are recorded in the
story map as deferred, with the attachment point named, exactly as the
domain design's traceability did.
**B.** **Each deferred capability gets a placeholder unit** — an empty unit
that reserves its directory and its slot in the DAG.
**C.** **The two deferred transition edges join the foundation unit** — the
migration rebuilds the schema anyway, so the edges are added to the
transition table at the same time.

**Recommendation:** A. A placeholder unit with no stories is a unit that
every downstream stage has to carry through, and the domain design already
established the precedent: the deferred items map to their attachment points,
not to placeholders. C would contradict `FR3.2`, which states the released
transitions are exactly eight edges and that no other edge shall be legal —
the two deferred edges are refused with the invalid-transition code in this
release, and a test asserting their refusal states the release boundary, not
the design.

**X. Other (please specify)**

[Answer]: A

---

### Q8 — How the units are sized, and what the size estimate means

The stage requires a relative complexity estimate per unit (S/M/L/XL). For a
single-developer release with no deadline, the estimate is a relative
ordering aid, not a commitment.

**A.** **Relative complexity only** — S/M/L/XL, sized by the number of
components, the number of stories, and the amount of new behaviour, with the
definition of each band stated. No hours, no days, no dates.
**B.** **Complexity plus an effort range in days** — so that Delivery
Planning has something to schedule against.
**C.** **Complexity plus a story count** — the number of stories the unit
carries, with the complexity band derived from it.

**Recommendation:** A. The team's practices already record the position on
commitments without evidence: with no deadline, no budget, and an
unquantified capacity constraint, the capacity position is recorded as an
allocation rule rather than as a number. A duration estimate here would be
a fabricated commitment that Delivery Planning would then either rely on or
correct. C is worth adding *inside* A — the story count is a fact rather
than an estimate, and it makes the band auditable — but it is not a
substitute for the band, because a unit carrying four trivial stories is not
the same work as one carrying one deep story.

**X. Other (please specify)**

[Answer]: A

---

## Consolidated Summary Confirmation

**The unit boundary strategy.** By domain capability — a unit is a coherent
body of domain work, with the components that serve that capability inside
it. Not by service, not by feature, not by deployment target.

**The two indivisible groups stay whole.** The foundation workstream — the
schema rebuild, the backfill, the connection ownership, and the actor
resolution — is one unit, because a commit that rebuilds `assets` without
rebuilding `audit_log` first destroys the audit history. The four
count-consuming surfaces — the dashboard, the assignee directory, the asset
list, the CSV export — are one unit, because a group that ships all but one
of its members leaves the counts with no consistency guarantee at all.

**Granularity.** Coarse: one unit per domain capability, about six in total.
The write path's lifecycle, registration, editing, and uniqueness stay in
one unit because they share the transaction discipline that makes the
audit-completeness guarantee hold.

**The dependency structure.** A DAG, with the parallelism made visible as
the sets of units with no dependency between them. No recommended build
order and no critical path — those are Delivery Planning's decisions.

**The integration points.** The seams the domain design already drew: a
unit's public surface is the set of components it exposes upward, and every
call crosses a boundary the catalogue already defines. No new facade layer
is invented at the unit boundary.

**The deployment model.** Monolithic and embedded throughout, with two
exceptions the unit kinds capture honestly: the tooling and delivery unit is
`packaging` because it produces build and merge artefacts rather than
runtime behaviour, and the domain vocabulary unit is `library` because it is
reusable code consumed in place with no standalone runtime. Screens are
`ui`.

**The delivery workstream.** A separate tooling and delivery unit holding
the formatter and linter configuration, the pre-commit hook, the hosted
pipeline, and the deploy procedure — because `C12` requires the formatter
and linter to land as their own first commit, and `C11` requires the
hosted pipeline to be configured before the MVP work merges.

**The deferred capabilities.** Ten named follow-on items map to no unit.
Each is recorded with its attachment point, as the domain design's
traceability did.

**The size estimate.** Relative complexity only — S/M/L/XL with the band
definitions stated, plus each unit's story count as a fact that makes the
band auditable. No durations, because the release has no deadline, no
budget, and an unquantified capacity constraint.

[Answer]:
