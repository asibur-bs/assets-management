# Team Assessment — Asset Tracker MVP

## Sources

- [desc] Initial description: "Build the Asset Tracker MVP from the approved Asset Tracker MVP Development Workbook, the POC-vs-MVP gap analysis, the decision brief, and the fully approved 17-item decision set. The MVP adds actor-attributed append-only audit history, previous-holder preservation via last_assigned_to, lost-asset recovery (lost to in-stock), an assigned to discarded transition that resolves the assignment inline, five exclusive status buckets with Active Inventory and Total Records computed by one shared counting function and filter builder, case-insensitive category-scoped serial uniqueness via a functional index with a concurrency-safe application-level fallback, CSV export with formula-injection protection, and an amendment to workbook section 4.1 and section 21.1 Scenario 3 recording Returned as a distinct resting state."
- [scope] Workflow-selected scope: `feature`.
- [Q1] Who actually staffs the MVP: one developer plus named reviewers. The developer does the build; a small number of named people — from IT leadership, finance, and operations — act as reviewers and advisors at defined points: the actor-mechanism decision, the operational-readiness sign-off, and the internal-reviewer demonstration of the audit properties. They are not authors.
- [Q2] Capacity and utilisation: partially constrained. The developer has other commitments — other projects, operational duties, or leave — that limit how much time is available in any period. The constraint is real but not quantified here.
- [Q3] Skills required versus skills available: covered by the developer, with gaps handled by escalation or research. The developer covers the build skills; a genuine gap — a skill the work needs and nobody on the team has — is handled by researching it, consulting outside the team, or bringing in specialist help at that point. No standing skill gap is accepted as unresolved.
- [Q4] Competing initiatives and the same talent pool: not yet established. The availability and competing commitments of IT, HR, Finance, and Operations stakeholders have not been assessed. In particular, it is not yet known whether the people needed to resolve I-01 (actor identity), I-02 (design-system estimate), and I-03 (existing-tool inventory) are committed to competing initiatives or deadlines. Treat stakeholder availability as an open dependency. Confirm their availability and expected response times before committing to the foundation schedule. I-01 remains a blocking dependency until resolved.
- [Q5] Preferred team topology and how the work is organised: single-owner stream with an explicit design-board checkpoint before the foundation. One owner throughout, but the foundation's design is reviewed as a board before any of it is built, because its mechanism determines everything above it and the actor model is still unresolved.
- [Q6] Handling the work that cannot start yet: sequence the resolution forward and work around the block. Treat the actor decision as the very first deliverable, resolve I-01 as the first action of the inception stages, and plan no foundation work until it is answered. Meanwhile the work that does not depend on it proceeds.
- [Q7] Time zones, locations, and working overlap: one person, one location. There is no overlap to arrange and no time-zone constraint. Any coordination with the four stakeholder groups is asynchronous.
- [Q8] External partners, contractors, and specialist help: available if needed, not committed. Outside help could be brought in for specific areas — most plausibly the operational backup procedure or the design system — but nothing is committed and nothing is needed yet.
- [Q9] Decision-makers for each phase: one decision-maker throughout — the intent's product owner. The product owner decides prioritisation, accepts the team and capacity plan, resolves the actor mechanism once I-01 answers, and signs off the operation-phase readiness. The four stakeholder groups are consulted at the gates where their concerns apply, and the internal reviewer who must be able to demonstrate custody is consulted on the audit properties.
- [memory:M2] `aidlc/spaces/default/memory/project.md#Decided`: "The fully approved 17-item Asset Tracker MVP decision set, together with the Asset Tracker MVP Development Workbook, is the binding technical and product contract for the `asset-tracker-mvp` intent; it is not reopened at any stage of that intent, and it carries seven standing conditions — the uniqueness check uses an IMMEDIATE transaction and a non-zero SQLite `busy_timeout` with `SQLITE_BUSY` mapped to a retryable error; the functional-index expression and the application-level comparison predicate use one shared definition; registration and serial/key updates enforce the same uniqueness policy; historical backfills preserve original records and audit traceability and report failures; dashboard, assignee, asset-list, and CSV counts use consistent filtering and counting definitions; every lifecycle transition has explicit validation and audit behaviour; and the existing 66/66 passing test baseline is preserved with regression tests added for newly approved behaviour. Traceability must be maintained between the approved MVP requirements and the POC requirements FR1.3, FR4.4, FR4.5, and FR5.3, and actor identity is resolved from trusted server-side context so actor information supplied in a write request is never trusted. (Stage intent-capture, 2026-11-06)"
- [memory:M3] `aidlc/spaces/default/memory/project.md#Decided`: "The decision set's amendment table names the workbook amendment surface as section 4.1 (transition table, recovery, `in-stock → lost`, `assigned → discarded`), section 4.2.5, section 4.3 (the actor-trust rule), section 4.4, section 6.1, section 6.4, section 6.5, section 9 (Screens 01, 02, 03, 04, 10), section 10, section 21.1, section 21.2, section 22, section 24 (the metric qualifiers the Audit Completeness population relies on), and the two new section 27 sections (Inventory Counting Definitions and Audit Action Vocabulary). The section 24 amendment carries the Audit Completeness qualifier verbatim: pre-MVP history is backfilled to a `system` actor and excluded from this metric. Section 4.1 records the `lost → in-stock` recovery transition with a required recovery reason drawn from the shared loss-reason vocabulary, and requires a distinct `recovered` audit action rather than `assign` or `return`, whose description names the recovery and the prior holder. It also records that complex recovery workflows — partial recovery, credit assignment, dispute handling — remain deferred, distinct from the single included recovery transition. The workbook's remaining MVP feature set is the reconciliation dashboard, the assignee directory, asset editing, duplicate-detection UX, empty states, result counts, pagination, improved search, responsive UI, and a design system. The design-system enumeration is indicative, not exhaustive: workbook section 11 is the authoritative source for the complete design-system requirements, covering semantic color tokens, a typography scale, spacing tokens, radius and shadow scales, iconography, and a light-theme implementation designed for future dark-theme extension. (Stage intent-capture, 2026-11-06)"
- [memory:M4] `aidlc/spaces/default/memory/project.md#Decided`: "The `assigned → discarded` transition resolves the assignment inline and records it: `assigned_to` is cleared, `last_assigned_to` is retained so the holder at discard time stays visible, and a `discarded` audit action records the discard, the prior holder, and the fact that the assignment was resolved by the discard. A discard reason is always required, drawn from the shared loss-reason vocabulary plus retirement-specific values. The asset row and its full history are never deleted; a discarded asset is excluded from Active Inventory but remains present in the `discarded` bucket and in Total Records, and stays accessible at its detail URL with its history intact. (Stage intent-capture, 2026-11-06)"

## Purpose and Scope of This Assessment

This assessment answers a narrower question than the scope and feasibility stages did.
Those stages asked *what* the MVP contains and *whether it can be built*. This one asks
*who builds it, with what capacity, at what skill level, under whose authority, and what
happens when the work is blocked*.

It therefore covers the team availability assessment, the capacity allocation
agreement, and the RACI matrix. The skill matrix with its gap analysis lives in
**skill-matrix.md**; the composition of the working groups and the sequencing of their
work lives in **mob-composition.md**.

Two things this assessment deliberately does not do:

- It does **not** re-open who builds the POC. The upstream confirmation stands: one
  developer, with full POC context and no ramp-up cost. That fact is carried forward as
  the build-side position [Q3] [memory:M2].
- It does **not** produce a schedule, a set of estimates, or a Bolt plan. The backlog's
  WSJF scores are explicitly *relative judgements between items*, not effort estimates,
  and the Delivery Planning stage replaces them with real ones. This assessment bounds
  the team; it does not plan the work.

## The Team in One Table

| Dimension | Position | Source |
|---|---|---|
| **Composition** | One developer (author) plus a small number of named reviewers and advisors. The reviewers are not authors. | [Q1] |
| **Reviewer constituencies** | IT leadership, finance, operations — plus the internal reviewer who must be able to demonstrate custody | [Q1] |
| **Build context** | The developer holds the full POC context; no ramp-up cost on the existing codebase | [Q3] [memory:M2] |
| **Capacity** | Partially constrained by other commitments; real but unquantified | [Q2] |
| **Skill coverage** | Covered by the developer; gaps handled by escalation or research; no standing gap accepted as unresolved | [Q3] |
| **Stakeholder competition** | Not yet established; treat as an open dependency | [Q4] |
| **Topology** | Single-owner stream with an explicit design-board checkpoint before the foundation | [Q5] |
| **Location** | One person, one location; stakeholder coordination is asynchronous | [Q7] |
| **External help** | Available if needed, not committed | [Q8] |
| **Decision authority** | The intent's product owner, throughout; stakeholder groups consulted where their concerns apply | [Q9] |
| **Working overlap** | None to arrange — a single-owner stream does not require it | [Q7] |

## Team Availability Assessment

### The author

One developer performs all authoring work. The upstream stages confirmed this position
and its reason: the developer holds the full POC context and there is no ramp-up cost,
because the work lands on an existing codebase the developer already knows [Q3]
[memory:M2].

This is a genuine strength and a genuine risk, and the assessment records both rather
than only the comfortable one.

| Strength | Risk |
|---|---|
| No knowledge-transfer cost before the first change lands | Single-developer concentration: one person holds the full context of a codebase that is about to change substantially. The absence of schedule pressure means there is no forcing function to distribute knowledge |
| Architectural decisions can be made and implemented by the same mind in the same sitting | If the developer's capacity is consumed by other commitments at the wrong moment, the whole initiative stops — there is no second author to pick it up |
| The migration runner, the repository update path, and the counting surfaces can be changed coherently | The same concentration that makes coherence possible also makes a bad decision expensive to unwind, because no second person holds an independent reading of the design |

The upstream mitigation for the concentration risk is to record the architectural decisions
as ADRs at the design stage, so the reasoning survives independently of the person. That
mitigation is carried forward into this assessment and appears in the onboarding
checklist in **mob-composition.md**.

### The reviewers and advisors

The reviewers are a small number of named people drawn from IT leadership, finance, and
operations, and — importantly — the internal reviewer who must be able to demonstrate
that custody is defensible [Q1]. They are **not authors**. Their participation is
structured around three defined points, and no more:

| Review point | Who | What is being decided or checked |
|---|---|---|
| **The actor-mechanism decision** | IT leadership, with the product owner deciding | Which of the four candidate mechanisms establishes the trusted actor, once I-01 is answered |
| **The operational-readiness sign-off** | Operations and IT leadership, with the product owner signing off | That the operation phase's obligations are discharged — backups exercised, observability in place, incident response defined |
| **The internal-reviewer demonstration** | The internal reviewer | That the audit properties can be demonstrated end to end by someone outside the build team — that the custody record is defensible |

This structure matters because it makes the reviewer load **event-driven rather than
continuous**. A reviewer asked to attend design discussions continuously would be a
second author in all but name, and the answers record explicitly that the reviewers are
not authors [Q1]. Instead, the reviewers are consulted at the gates where their
concerns apply [Q9], which is consistent with the asynchronous coordination the location
answer requires [Q7].

### Stakeholder availability is an open dependency

The availability of the IT, HR, Finance, and Operations stakeholders has **not** been
assessed [Q4]. This is recorded as a dependency, not as a risk that has been closed, and
it is stated in the sharpest available terms: it is not yet known whether the people who
must answer I-01 (actor identity), I-02 (records-retention schedule), and I-03 (the
existing-tool inventory) are committed to competing initiatives or deadlines.

The confirmed response to that is procedural and it is a gate on the foundation's
schedule: **confirm their availability and expected response times before committing to
the foundation schedule** [Q4]. I-01 remains a blocking dependency until resolved.

## Capacity Allocation Agreement

There is no fixed deadline and no separate budget, and no capability is date-tied. The
capacity position is therefore a **planning input, not a delivery commitment** — the
absence of a quantified capacity figure is not itself a risk, because there is no date
against which the shortfall would be measured. What matters is whether capacity is
competing with other work, because that is what determines whether the risk-first
sequencing preference is achievable.

| Commitment | Statement | Owner |
|---|---|---|
| **No date commitment** | No capability in the MVP release is tied to a date, an event, or a committed delivery. The MVP is paced as ordinary engineering work | Product owner |
| **No velocity commitment** | The backlog's WSJF scores are relative judgements between items, not estimates of delivery effort. No throughput or burn-down figure is committed at this stage | Product owner |
| **Capacity is finite and unquantified** | The developer's availability is limited by other commitments in any period. The assessment does not attempt to quantify it, and the delivery plan must not assume a figure that has not been established | Developer |
| **Risk-first sequencing is conditional on capacity** | The risk-first heuristic requires the actor-identity decision to be retired before dependent work commits to it. If capacity is consumed elsewhere, the correct response is to preserve the ordering and let the schedule extend — not to reorder | Product owner |
| **No foundation work against an unresolved actor model** | Under the blocked-work position, the actor decision is sequenced forward as the first deliverable, I-01 is the first action of the inception stages, and no foundation work is planned until it is answered [Q6] | Developer |
| **The foundation is gated by a design board, not by a date** | The foundation's design is reviewed as a board before any of it is built [Q5]. The board is a condition of proceeding, not a scheduling item | Product owner |

### The capacity allocation in practice

Because the capacity is unquantified, the agreement is expressed as an **allocation
rule** rather than as a number. The rule is: *the actor-identity resolution and the
design-board checkpoint take precedence over every other item in the queue, and no other
work is allowed to displace them, because the entire dependency structure hangs off
them.* Everything else is scheduled around the resulting constraint.

This is what makes the risk-first heuristic and the partially-constrained capacity
compatible rather than in tension. Risk-first ordering is a claim about what must go
first; the allocation rule is the commitment to make that true under capacity pressure.
Where the two would conflict — that is, where the highest-uncertainty item is not the
most urgent to the people competing for capacity — the allocation rule wins for the
actor-mechanism item and the design-board checkpoint, because those two are the items
whose failure is unrecoverable: an unresolved actor model produces foundation work that
must be redone, and an unreviewed foundation produces a schema that every layer above it
inherits.

## The RACI Matrix

One decision-maker throughout: the intent's product owner [Q9]. The matrix below
allocates the remaining roles across the phases.

| Activity | Responsible | Accountable | Consulted | Informed |
|---|---|---|---|---|
| **Prioritisation and backlog ranking** | Developer (produces the technical ranking input) | **Product owner** | The four stakeholder groups, where their concerns apply | The reviewer constituency |
| **Prioritisation ties** | — | **Product owner**, directly | — | Developer |
| **Team and capacity plan** | Developer | **Product owner** (accepts it) | Operations, IT leadership | The reviewer constituency |
| **Resolving I-01 (existing trusted mechanism)** | Developer (gathers the internal inventory) | **Product owner** | IT leadership, HR, Finance, Operations | — |
| **The actor-mechanism selection** | Developer (recommends) | **Product owner**, on the design board | IT leadership | The reviewer constituency |
| **The foundation design board** | Developer (presents) | **Product owner** (chairs) | IT leadership, the Architect role for R-01 and R-05 | The reviewer constituency |
| **The lifecycle and transition specification** | Developer | **Product owner** | Finance — where write-off defensibility applies | Operations |
| **The count-consistency guarantee** | Developer | **Product owner** | Architect role for R-05 | — |
| **CSV export's formula-injection protection** | Developer | **Product owner** | Developer role for R-14 — no external consult named | — |
| **Records-retention answer (I-02)** | Compliance, as the named RAID owner | **Product owner** | Compliance | Operations |
| **The existing-tool inventory (I-03)** | Product owner, as the named RAID owner | **Product owner** | IT, HR, Finance, Operations | Developer |
| **Operation-phase readiness** | Developer and Operations | **Product owner** (signs off) | IT leadership | The reviewer constituency |
| **The internal-reviewer demonstration of audit properties** | Developer (prepares the demonstrable state) | **Product owner** | The internal reviewer | Finance |
| **Test-baseline preservation (66/66)** | Developer | **Quality engineer**, as the named RAID owner for R-12 and R-16 | — | Product owner |
| **CI pipeline delivery** | Quality engineer, as the named RAID owner for R-16 | **Quality engineer** | Developer | Product owner |
| **The design-system estimate (C-01)** | Designer, as the named RAID owner for R-04 | **Product owner** | Developer | — |
| **Any change to the approved scope** | — | **A new human approval round** — not a delivery-stage decision | Product owner convenes | The whole team |
| **Adoption readiness (R-02)** | Product owner, as the named RAID owner | **Product owner** | IT, HR, Finance, Operations | Developer |

### What the RACI makes visible

Three things stand out, and they are worth stating because the matrix is the clearest
place the upstream position shows through.

**The Architect, Developer, Operations, Quality engineer, Product owner, Compliance, and
Designer roles in the last two columns are RAID ownership labels, not team members.**
The upstream RAID log names a role as the owner of each risk, issue, and assumption, and
this matrix carries those owners forward unchanged. Several of those role-holders are the
same single developer wearing different hats — R-01 and R-05 are owned by the Architect
role and R-03 and R-06 by the Developer role, and in a one-developer team those are one
person. The matrix shows them in one place so the delivery stages can see the
concentration rather than discover it.

**Nobody is Responsible for the decision to change scope.** The scope ceiling is fixed,
and a change requires a new human approval round rather than a delivery-stage decision.
The cell is deliberately empty on the Responsible side: there is no agent of the team
authorised to open that change.

**The internal reviewer has no decision authority.** The answer to the decision-rights
question placed the internal reviewer as a consulted party on the audit properties, not
as a decision-maker [Q9]. Their row shows them as Consulted and never as Responsible or
Accountable — the reviewer demonstrates the custody record is defensible, and does not
decide whether it is.

## The Blocking Dependency and What the Team Does About It

This is the single most consequential fact the assessment records, and it has a team
shape as well as a technical one.

**The actor-identity mechanism decision (PB-00) blocks the foundation (PB-01), which
blocks everything else.** It cannot be resolved internally, because it depends on I-01 —
whether an existing trusted authentication mechanism exists anywhere in the organisation.
The verified baseline's lack of an identity provider is a fact about the codebase, not a
finding about the organisation.

The team's answer is to **sequence the resolution forward and work around the block**
[Q6]. Concretely, three commitments:

1. **The actor decision is the first deliverable.** I-01 is the first action of the
   inception stages, and the foundation's design is reviewed as a board before any of it
   is built [Q5] [Q6].
2. **No foundation work is planned against an unresolved actor model.** The actor column
   is part of the foundation's `audit_log` replacement, and the foundation's size is
   genuinely unresolved depending on the branch taken — from negligible for a
   server-configured single operator to substantial for application-managed login, with
   session management, credential storage, a password lifecycle, and an authorisation
   surface.
3. **The actor-independent work proceeds in the meantime.** The shared counting
   definition's specification, the CSV export's formula-injection contract, and the
   workbook amendment surface do not depend on the actor model and are not held hostage to
   it. They proceed while I-01 is open.

The trade-off this accepts is worth naming. The team is not preparing both branches in
parallel, so if I-01 resolves late, the actor-dependent work starts late. That cost is
accepted because the alternative — preparing both branches — spends effort on a branch
that may never be needed, and the risk-first heuristic prefers retiring the actual
uncertainty over insuring against it.

**Note on the I-02 discrepancy in the Q4 answer.** The recorded Q4 answer names
"I-02 (design-system estimate)" as one of the three items whose resolution depends on
stakeholder availability. Upstream, I-02 is the **records-retention or disposal
schedule** question, and the design-system estimate is a separate item — C-01 in the
backlog's deferred set, with the design-system sequencing note and RAID risk R-04. The
answer is recorded verbatim as given, and this assessment preserves the upstream
identifiers rather than the paraphrase: **the design-system estimate is C-01/R-04, and I-02
is the records-retention question.** The practical consequence is that the RACI above
routes I-02 to Compliance and C-01's estimate to the Designer role, and neither routing
depends on the stakeholder-availability question being re-asked.

## Inherited Obligations the Team Must Discharge

These are not skill gaps and not risks the team has accepted. They are obligations the
team inherits and must discharge, and they are listed here so that the operation and
construction stages do not have to rediscover them.

| Obligation | Why it lands on this team | Discharge |
|---|---|---|
| **The 66/66 passing test baseline** | A standing condition of the approved decision set: the baseline is preserved and regression tests are added for newly approved behaviour [memory:M2] | The existing suite stays green on every change, with no test weakened or removed. Enforced in the build pipeline rather than by intent |
| **The absence of CI** | A pre-existing gap the MVP inherits rather than creates. No CI workflow exists | The build-and-test stage must deliver it, or the scope's coverage floor and merge gate are unverifiable |
| **The single-copy database file** | The SQLite file is the entire system of record and `data/` is gitignored, so it exists in exactly one place with no replication | A backup-and-restore procedure that is **exercised**, not merely written, is the minimum credible operational posture. A restore that has not been rehearsed is not a backup |
| **The migration runner's coverage** | Both structural changes run through it, and it is the least-covered of the three areas under change | Strengthen the runner's coverage before the rebuilds land; require a live-database test that rebuilds `assets` with existing rows and proves row-for-row preservation |
| **The unconditional update path** | The `assets` repository's update path writes every column unconditionally, so a partial update that omits a column will clear it | Make the update path explicit about which columns it writes, so `last_assigned_to` retention and `assigned_to` clearing during a discard are deliberate rather than incidental |

## The Open Items That Travel With the Team

None of these is resolved by this stage, and none is assumed resolved in either direction.

| Item | Who owns the answer | What the team does meanwhile |
|---|---|---|
| **I-01 / I-03** — whether an existing trusted authentication mechanism exists anywhere in the organisation; and the internal existing-tool inventory | Product owner, with IT, HR, Finance, Operations consulted | I-01 blocks PB-00 and therefore PB-01 and everything downstream. Gather the inventory — it resolves both. Nothing about the foundation is planned until I-01 is answered |
| **I-02** — whether a records-retention or disposal schedule applies to asset custody records | Compliance, as the named RAID owner | Resolve in parallel with I-01. It affects the audit history's lifecycle design, not the actor mechanism |
| **I-04** — the unquoted licence cost | Product owner | Carried unchanged. The Build position holds on other grounds; no action is required |
| **R-02 / I-05** — organisational adoption readiness | Product owner | Remains open at the human's direction. This is a rollout risk, not a scope defect, and no scope or priority decision retires it |
| **Stakeholder availability** | Product owner | Confirm availability and expected response times before committing to the foundation schedule [Q4] |

## Assumptions & Open Questions

- [assumption] The team is composed of the people named in the confirmed Q1 answer, and that answer is the authoritative roster. The upstream confirmation that a single developer with full POC context builds this is carried forward as the build-side fact; these artifacts record the roster, its capacity, and its skill gaps, and do not re-open who builds the POC.
- [assumption] The capacity position in the confirmed Q2 answer is a planning input, not a delivery commitment. Because no deadline and no separate budget exist, the absence of a quantified capacity figure is not itself a risk; what these artifacts record is whether capacity is competing with other work, because that is what determines whether the risk-first sequencing preference is achievable.
- [assumption] The competition position in the confirmed Q4 answer applies to the people who must answer I-01, I-02, and I-03 — IT, HR, Finance, and Operations — and not to the development team itself. Where the answer records competition, these artifacts record it as a schedule risk on the actor-mechanism decision, because I-01 blocks the foundation and therefore every downstream item.
- [assumption] The topology in the confirmed Q5 answer respects the two grouping constraints the scope stage established: the foundation workstream and the count-consistency group are each indivisible and are delivered whole, never split across owners or increments. The actor-identity decision remains a blocking dependency of the foundation, and no topology arrangement is read as permitting foundation work to begin against an unresolved actor model.
- [assumption] The blocked-work position in the confirmed Q6 answer governs only the actor-mechanism dependency. The scope document's own statement stands: a capability named in the approved set but absent from the MVP release is deferred rather than rejected, and the intent backlog records it as a named follow-on item with its approved standing intact.
- [assumption] The decision-rights position in the confirmed Q9 answer is consistent with the authority the upstream stages already fixed: prioritisation ties belong to the intent's product owner directly, the actor-trust rule is fixed and is not reopened at any stage of this intent, and any change to the approved scope requires a new human approval round rather than a delivery-stage decision.
- [assumption] The three open items carried from upstream remain open and unresolved by this stage: I-01 / I-03 (whether an existing trusted authentication mechanism exists anywhere in the organisation), I-02 (whether a records-retention or disposal schedule applies to asset custody records), and I-04 (the unquoted licence cost). None is assumed resolved in either direction. Organisational adoption readiness (R-02) also remains open at the human's direction.
- [assumption] The confirmed test baseline of 66/66 passing tests and the absence of any CI posture are carried into these artifacts as inherited obligations the team must discharge — the baseline as a merge gate, the CI gap as work the build-and-test stage owns — rather than as skill gaps that the current team cannot cover.
- [assumption] The reviewer and advisor names implied by the confirmed Q1 answer — from IT leadership, finance, and operations — are recorded by constituency rather than by individual, because the confirmed answer names the constituencies and not the people. The specific individuals must be named before the first review point is scheduled.

## Sources Consumed

- **scope-document** (`aidlc/spaces/default/intents/261106-asset-tracker-mvp/ideation/scope-definition/scope-document.md`) — the release boundary, the two indivisible groups, the actor-identity boundary, the delivery constraints, and the open items that ride with the release.
- **intent-backlog** (`aidlc/spaces/default/intents/261106-asset-tracker-mvp/ideation/scope-definition/intent-backlog.md`) — the risk-first ranking, the proto-Units PB-00 through PB-09, the deferred set C-01 through C-05, and the sequencing note on the design-system estimate.
- **feasibility-assessment** (`aidlc/spaces/default/intents/261106-asset-tracker-mvp/ideation/feasibility/feasibility-assessment.md`) — the verified baseline, the actor-trust evaluation and its candidate shortlist, the workstream decomposition, and the two qualifications the release carries.
- **constraint-register** (`aidlc/spaces/default/intents/261106-asset-tracker-mvp/ideation/feasibility/constraint-register.md`) — the technical, organisational, deployment, and data constraints that bound the team.
- **raid-log** (`aidlc/spaces/default/intents/261106-asset-tracker-mvp/ideation/feasibility/raid-log.md`) — the sixteen risks, the named RAID owners carried into the RACI matrix, and the open issues.
- **team-formation-questions** (`aidlc/spaces/default/intents/261106-asset-tracker-mvp/ideation/team-formation/team-formation-questions.md`) — the nine confirmed team-formation answers and the nine accepted assumptions.

## Review

Reserved for the reviewer at the approval gate.
