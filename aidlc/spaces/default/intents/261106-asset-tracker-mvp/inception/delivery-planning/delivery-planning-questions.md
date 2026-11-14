# Delivery Planning — Clarifying Questions

**Stage**: delivery-planning (inception)
**Intent**: 261106-asset-tracker-mvp
**Space**: default
**Scope**: feature
**Depth**: Standard

This file holds the questions that shape the Asset Tracker MVP's delivery
plan. The answers recorded below drive the generation of `bolt-plan.md`,
`team-allocation.md`, `risk-and-sequencing-rationale.md`,
`external-dependency-map.md` and `traceability.json` in this directory.

**What this stage decides.** The sequence of **Bolts** — the increments the
release is delivered in — how the confirmed team is allocated across them,
which risks drive the ordering, and what the release depends on from outside
the team. A Bolt is one increment of delivered, mergeable work that carries
its own proof.

**What this stage does not decide.** It does not re-plan the units. Stage 2.7
already produced the **dependency DAG** — the topology — and this stage chooses
the **economic path through it**. It does not reopen the approved decision set,
the workbook, the requirements, or the stories. It commits no date, no
throughput figure, and no effort estimate.

---

## The Inputs This Stage Starts From

Six facts from the upstream artifacts constrain the plan and are **not**
reopened here:

- **The unit DAG is the topology.** Stage 2.7 produced six units and ten code
  edges. The authoritative edge block is in `unit-of-work-dependency.md`:
  `u6` and `u2` depend on nothing; `u1` depends on `u2`; `u3` depends on
  `u2` and `u1`; `u4` depends on `u2`, `u1` and `u3`; `u5` depends on `u2`,
  `u1`, `u3` and `u4`. The only independent pairs in the graph are `u6` with
  each of the five domain units.
- **The tool unit's relation is a merge gate, not a code edge.** `C11` makes
  the hosted pipeline a blocking merge gate that must be configured before the
  MVP work merges. It owns no catalogue component, so the derivation rule
  cannot produce an edge for it.
- **The two indivisible groups stay whole.** The foundation workstream (U1)
  and the count-consistency group (U4 + U5's three count-consuming surfaces)
  ship as one unit each. A group shipping all but one of its members has no
  guarantee at all.
- **The foundation is blocked.** `OQ1` — the actor-identity mechanism — is
  unresolved, and U1 cannot be built until it is chosen. The team's confirmed
  position (D-44) is to sequence the resolution forward and work around the
  block rather than prepare both branches in parallel.
- **The contracts are already specified.** Twelve contracts across the six
  units: six shared-schema, five in-process-interface, and one OpenAPI
  document for the external public web surface. Eight domain error codes, of
  which `BUSY_RETRYABLE` is the only retryable one.
- **The capacity position is an allocation rule, not a figure.** There is no
  deadline, no budget, and an unquantified capacity constraint. The rule is
  that the actor-identity resolution and the design-board checkpoint take
  precedence over every other item in the queue.

### The three resolved practices

Delivery Planning resolves three practice sections, most-specific non-empty
first, from project → team → org:

| Section | Resolution |
|---|---|
| **Way of Working** | Trunk-based on `main`, renamed from `master` as the release's first act (`C13`). Short-lived feature branches, squash-merged into `main` as one commit named by the Bolt slug. A behaviour change and its proof land in the same commit. **No git remote is configured today**, so "squash-merge" is in practice "do not create a merge commit" until a remote exists. |
| **Walking Skeleton** | **No skeleton ceremony.** The scope does not declare `skeleton: on`. The foundation workstream itself acts as the walking slice — the smallest change that proves the audit properties end to end. The intent's human-authorized Construction Verification Command demonstrates the project's real end-to-end result before any skeleton checkpoint. |
| **Deployment** | One single internal host, one long-running Node process, one machine-local SQLite file with `PORT` / `DB_PATH` overrides. Deploy on merge; every deploy carries the product owner's sign-off and the deployed commit SHA. No staging environment. Deploy order: `npm ci` → WAL-aware backup → migrations → restart → smoke test, with a manual documented rollback. |

---

## Embedded Questions

### Q1 — How the release is cut into Bolts

A Bolt is one increment of delivered, mergeable work that carries its own
proof. The six units and their ten edges describe what can be built from what;
the cut decides what is delivered together.

**A.** **One Bolt per unit, except where an upstream rule forces a split or a
join** — U2, U1, U3, U4+U5's count surfaces, and U6 as the first Bolt. Six
Bolts, one per unit, with the count-consistency group's two units held
together by the delivery-grouping constraint.

**B.** **One Bolt per unit, split further where a unit is too large** — the
write path (U3, the only XL band) split into its registration, uniqueness,
editing and lifecycle increments, giving roughly nine to ten Bolts.

**C.** **One Bolt for the whole release** — a single increment carrying all six
units, because the release has one developer and no deadline, so increment
boundaries cost more than they buy.

**Recommendation:** A. The units already carry the release's own boundaries:
the indivisible groups are indivisible, the shared transaction discipline keeps
the write path together, and the complexity bands are relative ordering aids
rather than commitments. Option B splits the one component family that owns
the eight released edges and would put two units both editing the transition
table — which the team's own chunking constraint already forbids. Option C
gives back every incremental proof the release's success measure depends on:
Audit Completeness is demonstrated per increment, and a single Bolt at the end
demonstrates it once.

**X. Other (please specify)**

[Answer]: A

---

### Q2 — Where the tooling and delivery work sits in the sequence

`C12` requires the formatter and linter configuration to land as its own first
commit, before any MVP work. `C11` requires the hosted pipeline to be
configured before the MVP work merges. The team's rule that a behaviour change
and its proof land in the same commit means the pipeline's own proof is part of
the tooling increment.

**A.** **The tooling increment lands first, and it is split into its own
sub-parts** — the formatter and linter configuration and the pre-commit hook
as the first increment, and the hosted pipeline definition and the deploy
procedure as a later increment that still precedes the first MVP merge. The
two sub-parts are ordered by `C12` and `C11` respectively, and the second
gates the merge rather than the build.

**B.** **The whole tooling increment lands first** — formatter, linter, hook,
pipeline, and deploy procedure as one Bolt before any domain work begins.

**C.** **The tooling work runs alongside the first domain Bolt, and only the
formatter and linter configuration is sequenced first** — the pipeline and the
deploy procedure are completed just before the first MVP merge, as part of
that merge's preparation.

**Recommendation:** A. `C12` names the formatter and linter configuration
specifically, and says it lands as its own first commit before any MVP work —
so it cannot be folded into a Bolt that also carries domain work. But the
hosted pipeline cannot be built before a remote exists, and the remote is a
prerequisite the release has not yet satisfied (it is recorded as an open item
in Ideation). Option B would make the release's first Bolt depend on a remote
nobody has created, which would block the release on an infrastructure
arrangement rather than on the work itself. Option C is close to A but
blurs the merge gate into the domain Bolt, and the gate is a fact about when
work may merge — it deserves its own increment so that its completion is
visible rather than implicit.

**X. Other (please specify)**

[Answer]: A

---

### Q3 — What the first Bolt delivers, given that the foundation is blocked

U1 cannot be built until `OQ1` — the actor-identity mechanism — is chosen.
That choice is not the team's to make: it needs an answer from the
organisation, and the team's confirmed position (D-44) is to sequence the
resolution forward rather than prepare both branches in parallel. Meanwhile
several units are actor-independent.

**A.** **The first Bolt is the tooling increment; the actor-independent domain
work follows in parallel and is deliberately small** — the domain vocabulary
(U2) is built next, because it depends on nothing and holds the actor-independent
vocabulary; the resolution of `OQ1` proceeds alongside it.

**B.** **The first Bolt is the actor decision itself** — the first Bolt
delivers the mechanism decision and its recorded rationale as its artifact,
and no code is written until it lands.

**C.** **The first Bolt is the vocabulary and the tooling together** — one
Bolt carrying U2's domain vocabulary and U6's formatter and linter
configuration, since both depend on nothing and can be built in one sitting.

**Recommendation:** A. The actor decision is a decision, not a unit of work,
and it is not the team's to make — it is blocked on I-01/I-03, an inventory of
the organisation's internal tooling. Making it the first Bolt would put a
Bolt whose deliverable is somebody else's answer into a delivery plan.
Option C is attractive on the graph — `u6` and `u2` are independent — but
`C12` requires the formatter and linter configuration to land as its own first
commit, and `C12`'s own rationale is that a formatting-only change is far
easier to read on its own than the same change mixed with domain work. A
Bolt mixing the two defeats the reason the constraint exists.

**X. Other (please specify)**

[Answer]: A

---

### Q4 — How the count-consistency group's two units are delivered

The four count-consuming surfaces — the dashboard, the assignee directory, the
asset list, and the CSV export — must ship together: a group that ships all
but one of its members has no consistency guarantee at all. The dashboard,
the directory and the list live in U5 (Presentation); the export lives in U4
(Reporting). The two units change for different reasons and are tested
against different criteria.

**A.** **One delivery Bolt spanning U4 and U5's count surfaces** — the two
units are built and merged as a single indivisible group, and the release
ships all four surfaces or none.

**B.** **Two Bolts, with the surfaces built in one unit and released only when
the other lands** — U4's query, counting and export are developed first, then
U5's three surfaces are developed, and the merge of both is held until the
fourth surface exists.

**C.** **One delivery Bolt covering all of U4 and all of U5** — the whole
reporting unit and the whole presentation unit ship together.

**Recommendation:** A. The grouping constraint is about *delivery*, not about
code ownership, and the units-generation stage already recorded that reading.
Option B risks the exact failure the group exists to prevent: two branches
exist, each holding part of the guarantee, and the window where one has
merged and the other has not is the window where the counts disagree. Option C
conflates the grouping with the unit boundary and would make the release's
last Bolt carry five screens and the query layer, which are separately
reviewable bodies of work.

**X. Other (please specify)**

[Answer]: A

---

### Q5 — Where the two test-first exceptions sit

`NFR6.4` names two exceptions to the test-after ordering: the concurrency-safe
uniqueness check and the two-table rebuild have their tests written *before*
the code that satisfies them. The first guards a race that a test written after
the code will not reliably reproduce; the second guards a silent history loss
with the transaction committed.

**A.** **The test files land in their own Bolt, before the Bolt that
implements them** — the uniqueness-check test and the rebuild test each land
as a separate, reviewable commit ahead of the implementation they pin.

**B.** **The test file lands in the same Bolt as the implementation, at the
front of it** — the history is correct within the Bolt, but the two files are
in one commit.

**C.** **The tests are written first but committed with their
implementation** — the authoring order satisfies `NFR6.4` and the commit
structure does not distinguish them.

**Recommendation:** A. `NFR6.4` is a requirement about the two exceptions, and
the team's rule that a behaviour change and its proof land in the same commit
points at the proof being *in the history* — but for these two, the proof's
whole value is that it was written first, and a commit that contains both
files cannot demonstrate the ordering to a reviewer. The team's own stated
reason for the two exceptions is that the defect each guards is one a later
test will not reliably reproduce, which is a property of *when* the test was
written, not of when it was committed. Option C records an intention with no
mechanism that a reviewer can check.

**X. Other (please specify)**

[Answer]: A

---

### Q6 — What each Bolt is allowed to assume from the ones before it

Every Bolt is built on the ones before it. What a Bolt may assume is what
determines whether it can be reviewed in isolation and whether a merge is safe.

**A.** **Each Bolt may assume only the contracts its predecessors published,
and nothing about their internals** — the twelve contracts from stage 2.8 are
the whole surface between Bolts, and no Bolt may read another's internals to
work around a missing contract.

**B.** **Each Bolt may assume whatever its predecessors made available, with
the contracts as the preferred surface** — the contract set is the default
interface, but a Bolt may reach into a predecessor's internals when that is
faster, and the plan records the reach as a debt.

**C.** **Each Bolt may assume only that its predecessor's Bolt is merged, and
nothing about its interfaces** — the interfaces are re-established at the
start of each Bolt.

**Recommendation:** A. The contract set is the artefact that makes a
single-developer release reviewable at all: with one author, the reviewer
cannot read the code and the plan together, so the seam between two Bolts has
to be a written, published thing. Option B makes the contracts advisory, and a
contract that is advisory is not a contract. Option C discards the work of
stage 2.8 and makes every Bolt rediscover its predecessor's surface.

**X. Other (please specify)**

[Answer]: A

---

### Q7 — How the deployment position enters the plan

The release deploys to one host as one process with one SQLite file. Deploys
happen on merge, every deploy carries the product owner's sign-off, and the
deployed commit SHA is recorded. The deploy order is `npm ci` → WAL-aware
backup → migrations → restart → smoke test, and the smoke test exercises the
release's own success measure.

**A.** **Each Bolt that changes runtime behaviour deploys and smoke-tests
before the next Bolt begins** — the deploy is part of the Bolt's completion,
not a separate batch at the end.

**B.** **Deployment happens at the end of the release, or at named
milestones** — the Bolts are merged to `main` as they land, and the host runs
the release at a named point.

**C.** **Deployment is a separate track, owned by the tooling increment** —
the deploy procedure is built once and applied on the team's schedule,
independent of the Bolt boundaries.

**Recommendation:** A. The deploy order's backup step exists precisely to
absorb the migration's silent failure mode, and the smoke test is the
instrument that proves Audit Completeness against the live database. If the
deploy is decoupled from the Bolt, the proof that the release's primary
success measure holds is deferred to a point where a defect would be
attributable to several Bolts at once. Option C is the one the team's own
practice warns against: the backup exists because the failure it absorbs
raises no error, so it has to be exercised on the change that could cause it.

**X. Other (please specify)**

[Answer]: A

---

### Q8 — How the reviewer checkpoints are placed

The roster is one developer plus reviewers from IT leadership, finance and
operations, who are **not** authors. Their participation is event-driven
around three defined points: the actor-mechanism decision, the
operational-readiness sign-off, and the internal-reviewer demonstration. The
specific individuals are not yet named, which gates the first review point
from being *scheduled*.

**A.** **The three review points are attached to named Bolts** — the
actor-mechanism decision to the first, the operational-readiness sign-off to
the last, and the internal-reviewer demonstration to the release's closing
increment; the design-board checkpoint is a gate on the foundation Bolt
rather than a review of a Bolt.

**B.** **The three review points are attached to the release's phases rather
than to Bolts** — the actor decision is an Ideation/Inception boundary
event, the readiness sign-off is an Operation-phase event, and the
demonstration is a post-release event.

**C.** **The review points are not scheduled into the plan at all** — they are
recorded as standing obligations that happen when the team reaches them, and
the plan carries only the design-board gate on the foundation.

**Recommendation:** A. The design board is already recorded as a *condition of
proceeding* — the foundation is not built until it has reviewed the
foundation's design — so it is a gate on a Bolt rather than a review of one.
The other three points have a natural home on the plan: the actor decision
precedes every Bolt that carries an actor, the readiness sign-off is the
release's closing increment, and the demonstration follows it. Option C loses
the requirement that the individuals be named before the first review point is
scheduled, which is an open item the plan should surface rather than hide.

**X. Other (please specify)**

[Answer]: A

---

### Q9 — What the plan says about the risks it retires

Sixteen risks are open, none closed. `R-01` (migration runner) gates the
foundation; `R-02` (adoption readiness) stays open until the stakeholder
process resolves it; `R-15` (single-developer concentration) is mitigated by
the ADR practice and the design-board checkpoint. The remaining thirteen are
covered by the trigger-based skill-gap remediation plan.

**A.** **The plan names the risk each Bolt retires, or the risk it
deliberately does not retire** — every Bolt carries a risk line, and a Bolt
that retires no risk says so.

**B.** **The plan carries the three headline risks only** — `R-01`, `R-02` and
`R-15`, which are the ones the approval named, and the rest stay in the
Ideation RAID log.

**C.** **The plan carries no risk content** — risk is the
`risk-and-sequencing-rationale.md` artifact's job, and the Bolt plan stays
purely about sequence.

**Recommendation:** A. The sequencing is the mechanism by which the risks are
addressed, and a reader asking "what does this Bolt retire?" is asking about
the sequencing. A Bolt that retires no risk is not a defect — the tooling
increment retires a build-pipeline risk rather than a domain one — but saying
so is what makes the absence legible. Option B drops thirteen risks that the
approval explicitly acknowledged as open. Option C is a division of labour
that does not survive the reader: the risk artifact would have to reference
Bolts it does not own, and the Bolt plan would have to explain its order
without saying why.

**X. Other (please specify)**

[Answer]: A

---

### Q10 — How the plan's timing position is stated

There is no deadline, no budget, and no throughput figure. The capacity
position is an allocation rule: the actor-identity resolution and the
design-board checkpoint take precedence over every other item in the queue.
The unit complexity bands (S/M/L/XL) are relative ordering aids, not
commitments.

**A.** **No timing at all** — the plan is a strict order with the allocation
rule stated, and no duration, effort estimate or date appears anywhere.

**B.** **Relative size bands per Bolt** — each Bolt carries its unit's
S/M/L/XL band, labelled explicitly as a relative ordering aid rather than an
estimate.

**C.** **A dependency-driven earliest-start description** — each Bolt is
described as starting "after the previous Bolt merges", with no durations.

**Recommendation:** B. The bands already exist, they are already defined
against auditable criteria, and the units stage recorded them as relative
ordering aids. Carrying them onto the Bolts gives the reader a way to see
where the effort is concentrated — the write path is the only XL band — while
the explicit label keeps them from being read as commitments. Option A
withholds a fact the upstream artifacts already establish, and option C
describes a schedule the plan does not make.

**X. Other (please specify)**

[Answer]: B

---

### Q11 — What the plan does about the remote, the CI gap and the migration-runner gate

Three items constrain what the first Bolts can physically deliver. The
repository has **no configured git remote**, and every hosted pipeline
platform is pull-request-based, so the hosted pipeline cannot run until a
remote exists. There is **no CI workflow** today, so the 66/66 baseline is
enforced only by whoever remembers to run it. And `R-01` gates the foundation
on demonstrated migration safety against a representative copy of the
populated database, not the live one.

**A.** **All three are named as preconditions with named owners and a named
first action**, recorded in the external-dependency map and the risk
rationale rather than solved inside a Bolt.

**B.** **The remote and the pipeline are solved inside the tooling Bolt** —
the tooling increment creates the remote, configures the hosted pipeline and
enables the merge gate in one body of work.

**C.** **They are deferred to the Operation phase** — the remote, the hosted
pipeline and the migration-runner proof are operational concerns that belong
to deployment.

**Recommendation:** A. A remote is an organisational arrangement, not a
deliverable a developer can produce in a Bolt, and the tooling increment that
depends on it would either be blocked or would have to do something outside
its own scope. The migration-runner proof is a *test*, and it belongs with
the foundation work it gates — but the gate itself is a condition on the
foundation's start, which is a fact the plan must state rather than a Bolt.
Option C is wrong on the pipeline in particular: `C11` makes it a merge gate
before the MVP work merges, which places it before the release's own
construction work, not in the Operation phase.

**X. Other (please specify)**

[Answer]: A

---

### Q12 — What the plan records about the work already done

Three Inception stages have produced design artifacts that no Bolt yet
consumes: the reverse-engineering scan's nine-article knowledge base, the
requirements analysis, the user stories, the refined mockups, and the domain
design's 21-component catalogue with 15 ADRs. The construction phase will
re-derive much of this.

**A.** **The plan references the design artifacts as the input to each Bolt
and does not schedule any re-design** — the construction stages consume them.

**B.** **The plan schedules a verification increment** that re-checks the
design artifacts against the codebase before the first construction Bolt, so
that a stale assumption is found before code is written against it.

**C.** **The plan treats the design artifacts as advisory** — the construction
stages may revise them, and the plan carries no dependency on them.

**Recommendation:** A. The design artifacts are the inputs the construction
stages are declared to consume, and the reverse-engineering scan's scope was
recorded as `kind: partial` deliberately — the nodes_modules, data directory,
lockfile and scratch files were only skimmed — so a re-verification increment
would be an unbounded exercise. What the plan owes the reader is the
dependency: which Bolt consumes which design artifact. Option C would let
construction silently rewrite the design, which is exactly the failure the
`upstream-coverage` sensor exists to prevent.

**X. Other (please specify)**

[Answer]: A

---

## Consolidated Summary Confirmation

**The cut.** One Bolt per unit, with the tooling increment split into the
formatter and linter configuration plus the pre-commit hook, and the hosted
pipeline plus the deploy procedure. The count-consistency group's two units
are delivered as one indivisible increment.

**The first Bolt.** The tooling increment's formatter, linter and hook —
`C12` requires it to land as its own first commit before any MVP work. The
actor-identity decision is not a Bolt; it is a blocking dependency that
proceeds in parallel with the actor-independent domain work.

**The two test-first exceptions.** The uniqueness-check test and the
rebuild test each land in their own commit, ahead of the implementation they
pin, so that the ordering `NFR6.4` requires is visible in the history.

**The interface between Bolts.** Only the twelve published contracts. No Bolt
reads another's internals.

**The deployment.** Every Bolt that changes runtime behaviour deploys and
smoke-tests before the next Bolt begins; the deploy is part of the Bolt's
completion.

**The review points.** The actor-mechanism decision, the operational-readiness
sign-off, and the internal-reviewer demonstration are attached to named
Bolts; the design board is a gate on the foundation Bolt.

**The risk content.** Every Bolt names the risk it retires or the risk it
deliberately does not retire.

**The timing position.** No date, no duration, no effort estimate. The
relative complexity band is carried per Bolt and labelled as an ordering aid.

**The preconditions.** The unconfigured git remote, the absent CI workflow and
the migration-runner safety proof are named with owners and first actions, in
the external-dependency map and the risk rationale rather than inside a Bolt.

**The design inputs.** Each Bolt names the design artifact it consumes; no
re-design is scheduled and no design artifact is advisory.

[Answer]: Looks correct
