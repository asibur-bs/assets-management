# Mob Composition — Asset Tracker MVP

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

## Purpose and Scope of This Document

This document records how the work is organised: the working groups, the order in which
they run, the checkpoints between them, and the onboarding steps a person joining the
team needs to be able to work.

The stage's own terminology is worth addressing first, because the artifact is called
**mob composition** and the confirmed topology is not a mob.

**This is not a mob programme, and the confirmed answer rules one out.** A mob requires
two or more people working together in real time, with a driver typing and a navigator
thinking, rotating on a short cycle. The team here is one developer, in one location,
with no working overlap to arrange [Q7]. There is nobody to rotate the driver with. A
mob-style ensemble is therefore not merely a poor fit — it is unavailable.

What the confirmed topology actually is, is a **single-owner stream with an explicit
design-board checkpoint before the foundation** [Q5]. One owner throughout; a board
convened at the one point where the mechanism determines everything above it. This
document records the groups that work follows, the checkpoints between them, and the
onboarding checklist.

## The Topology Decision and Its Consequences

### The topology in one table

| Dimension | Position | Source |
|---|---|---|
| **Form** | Single-owner stream | [Q5] |
| **Owner** | The developer, throughout — one owner, no handover of authorship | [Q5] [Q1] |
| **Checkpoint** | An explicit design board before the foundation | [Q5] |
| **Working overlap** | None to arrange; one person, one location | [Q7] |
| **Reviewer load** | Event-driven, at three defined points; the reviewers are not authors | [Q1] |
| **Coordination mode** | Asynchronous with the four stakeholder groups | [Q7] |
| **Mob programme** | Not applicable — a mob needs two people in real time | [Q7] [Q1] |
| **Decision authority** | The intent's product owner, throughout | [Q9] |

### What the topology buys

**Coherence across the two structural changes.** Both the `audit_log` replacement and the
`assets` table rebuild run through the same migration runner, and the two changes must
land together — one introduces the actor column, the other extends the `status` CHECK to
admit `discarded`. A single owner makes the coordination cost zero, which is exactly
what an indivisible group needs.

**Continuity of the POC context.** The developer already holds the full context of the
codebase being changed. No ramp-up cost, no re-reading phase, no translation loss
between two authors who would each need to understand the whole.

**A single place where the actor-trust rule is implemented.** The rule that every audit
entry derives its actor from trusted server-side context, and that actor information
supplied in a write request is never trusted [memory:M2], is a rule about a single code
path. One owner means one implementation of it, not two.

### What the topology costs

**The concentration risk.** One person holds the full context of a codebase that is about
to change substantially. The absence of schedule pressure means there is no forcing
function to distribute knowledge. The upstream mitigation stands: record the
architectural decisions as ADRs at the design stage, so the reasoning survives
independently of the person.

**The blocking dependency lands on one person.** I-01 is not a skill gap and cannot be
closed by the team working harder; it needs an answer from the organisation. When the
answer is late, the whole initiative is late, because the foundation is gated on it.

**No independent reading of the design.** A single author reviews their own work. This
is precisely why the design board exists — it is the one place where an independent
reading happens before the most consequential and most expensive-to-reverse change
lands.

### The board is a condition, not a ceremony

The design board before the foundation is the topology's single formal checkpoint, and
it is worth being precise about what it is and is not.

**It is a condition of proceeding.** The foundation is not built until the board has
reviewed its design. This is a gate, not a status update.

**It is the only multi-party engagement in the build.** Everything else about the
reviewers is asynchronous and event-driven [Q1] [Q7]; the board is where the people
whose concerns apply are in the same conversation.

**Its composition is narrow.** The board sits around the foundation's *design*, which is
where the actor mechanism, the `audit_log` replacement shape, the `assets` rebuild, and
the backfill's approach are decided. The board is not a retrospective and not a general
review forum.

**It is chaired by the product owner**, who is the accountable decision-maker throughout
[Q9], with the developer presenting, and IT leadership consulted — the constituency
whose answer to I-01 the foundation depends on.

## The Working Groups

The groups below are the composition of the work. They are **not** teams in the sense of
separate owners with separate queues; there is one author. They are the units of work
that the upstream dependency structure has already fixed, and each group's boundary is a
consequence of a guarantee that must hold across it.

### Group 0 — The actor-identity mechanism decision

| Property | Value |
|---|---|
| **Members** | The developer (recommends); IT leadership (consulted, and the source of the I-01 answer); the product owner (decides) |
| **Backlog item** | PB-00 — Rank 1, WSJF 10.0, Must Have, a decision item rather than a deliverable |
| **Gates** | Everything. It blocks PB-01 entirely |
| **Dependency** | External: I-01 / I-03, the internal existing-tool inventory |
| **Status** | **Blocked** — awaiting I-01 |

This group exists as a distinct unit because it is the only work whose output is a
decision rather than code, and because it is the only group with an external
dependency. It is also the only group that cannot be made smaller by splitting it.

The confirmed blocked-work position governs it: I-01 is the first action of the
inception stages, the actor decision is the first deliverable, and no foundation work is
planned until it is answered [Q6].

### Group 1 — The foundation workstream

| Property | Value |
|---|---|
| **Members** | The developer |
| **Backlog item** | PB-01 (Rank 2, WSJF 2.9, Must Have) with PB-02 as its verification half |
| **Contents** | The `audit_log` replacement (cascade removal, actor column, insert-only to the application); the `assets` table rebuild (the `status` CHECK extended to admit `discarded`); the `last_assigned_to` column; actor column population; the pre-MVP backfill assigning a `system` actor, preserving originals and reporting failures |
| **Gates** | Every other group. It is a hard predecessor of everything |
| **Dependency** | Group 0 |
| **Status** | **Blocked on Group 0** |

**This group is indivisible and is not split across increments.** The scope stage fixed
that, and the reason is worth restating because it is the kind of thing a delivery plan
can quietly erode: splitting the foundation would mean shipping an unverified schema
and verifying it later, when the layers above it make a defect expensive to fix.

The group's completion is gated by the design board [Q5]. The board reviews the design
before any of the foundation is built.

The group's exit condition is not "the schema is changed." It is the live-database
proof that deleting an asset no longer destroys its audit rows — verified against a live
instance rather than asserted. This is the single most important verification in the
MVP, because it is the difference between a promise and a fact.

### Group 2 — The lifecycle

| Property | Value |
|---|---|
| **Members** | The developer |
| **Backlog item** | PB-03 — Rank 4, WSJF 3.2, Must Have |
| **Contents** | The five exclusive status buckets; the `lost → in-stock` recovery with its required recovery reason and its distinct `recovered` audit action; the `assigned → discarded` transition resolving the assignment inline; per-transition validation and audit behaviour; the shared counting function and filter builder; the Audit Action Vocabulary (workbook §27) |
| **Gates** | Group 3 |
| **Dependency** | Group 1 |
| **Status** | Sequenced after the foundation |

**The shared counting function and filter builder live here, not in Group 3.** This is
the single most consequential placement decision in this document, and it is the direct
consequence of how a shared definition behaves.

The standing condition is that dashboard, assignee, asset-list, and CSV counts use
consistent filtering and counting definitions [memory:M2]. The feasibility assessment
made the mechanism precise: the "by construction" guarantee holds *only if* all four
surfaces actually consume the shared function. A shared definition with no consumers
leaves the counts disagreeing — the exact state the guarantee exists to prevent.

So the definition and the builder are modelled with the group that owns the domain
semantics (the lifecycle, because the buckets and the counting definitions are the same
domain vocabulary), and the four consuming surfaces are a separate group. If the
mechanism were modelled with the consumers instead, the definition would arrive as part
of a group's output and the group's own internal consistency would depend on a
definition owned elsewhere.

### Group 3 — The count-consistency group

| Property | Value |
|---|---|
| **Members** | The developer |
| **Backlog item** | PB-04 — Rank 5, WSJF 2.7, Must Have |
| **Contents** | The reconciliation dashboard; the assignee directory; the asset list; CSV export, including its formula-injection protection |
| **Gates** | — |
| **Dependency** | Group 2 |
| **Status** | Sequenced after the lifecycle |

**This group is indivisible, and all four or none.** A group shipping three of its four
members has no consistency guarantee at all — it has three surfaces that agree with each
other and a fourth that does not, which is the exact defect the group exists to remove.
Splitting it ships the bug it is meant to fix.

This is also where the count-consistency guarantee is *proved* rather than asserted: a
test that asserts all four surfaces route through the shared function. A surface that
cannot obtain its count from the shared function should fail to build.

### Group 4 — The remaining must-haves

| Property | Value |
|---|---|
| **Members** | The developer |
| **Backlog items** | PB-05 (asset editing, Rank 6, WSJF 3.7) and PB-06 (duplicate-detection UX, Rank 7, WSJF 4.0) |
| **Gates** | — |
| **Dependency** | Group 1 (the uniqueness policy) and Group 2 (the bucket model); PB-06 depends on PB-05's shared predicate |
| **Status** | Sequenced after the foundation and the lifecycle |

PB-05's constraint is that registration and serial/key updates enforce the **same**
uniqueness policy [memory:M2]. An edit that changes a serial or key must run the same
case-insensitive, category-scoped comparison — the same shared definition, not a
parallel one — or the duplicate-registration defect returns through the edit path.

PB-06 is the user-facing layer only. The *enforcement* of the uniqueness invariant is
part of Group 1 and PB-05, not of the duplicate-detection UX. The two must not be
conflated: enforcement is a correctness property and belongs with the schema and the
shared predicate.

### The cross-cutting groups

| Group | Backlog item | Composition | Note |
|---|---|---|---|
| **The workbook amendment surface** | PB-07 — Rank 8, WSJF 3.8 | The developer, distributed across Groups 1–4 | Not a trailing document. It is the amendment to each capability's own specification: §9 screen amendments attach to Group 3's surfaces, §4.1 transition amendments to Group 2, §4.3's actor-trust amendment to Group 1. The amendment surface is distributed across the groups that implement it [memory:M3] |
| **The operational readiness workstream** | PB-08 — Rank 9, WSJF 3.6 | The developer, with Operations and IT leadership consulted | Inside the release because the workflow scope is `feature`, which runs all 33 stages with no stage skipped, and the product boundary includes the operation phase. It is a backlog item because the deployment target's consequences are operational commitments of the MVP, not incidental deployment work |
| **The traceability and regression baseline** | PB-09 — Rank 10, WSJF 5.7 | The developer, with the Quality engineer as the named RAID owner for R-12 and R-16 | Not a capability but a **guard on every capability** — the bottom band of the value stream map. It is what makes each link in the chain verifiable rather than merely intended |

### The deferred increment — a group that is not in this release

| Item | MoSCoW | Composition note |
|---|---|---|
| **C-01 — the design system** (workbook §11) | Could Have | **Deferred from the release, but not deferred from the risk assessment.** The estimate is retired early under the risk-first heuristic, because the gap analysis's 6–8 week estimate is explicitly conditional on scoping that workstream. Learning the estimate before the release schedule is committed is cheaper than learning it afterwards. C-01 is not a release deliverable, and the inception stage must not read it as one |
| **C-02 — responsive UI** | Could Have | Deferred with C-01; depends on C-01's breakpoints and spacing tokens |
| **C-03 — improved search** | Could Have | Deferred; depends on C-01's control vocabulary. The POC's existing search stays in the release |
| **C-04 — pagination and result counts** | Could Have | Deferred; depends on the shared counting function, which is already in the release. First to be pulled forward if the asset count grows beyond the confirmed medium scale |
| **C-05 — empty states** | Could Have | Deferred; depends on C-01's vocabulary |

## The Sequence of Work

The order follows the risk-first heuristic: the highest-uncertainty items are sequenced
early enough that their uncertainty is retired before the work depending on it starts.

```
  ┌───────────────────────────────────────────────────────────┐
  │  STAGE A — The resolution, while the rest waits          │
  │  Gather the internal existing-tool inventory (I-03/I-01)  │
  │  Confirm stakeholder availability and response times      │
  └──────────────────────────┬────────────────────────────────┘
                             │ I-01 answered
                             ▼
  ┌───────────────────────────────────────────────────────────┐
  │  STAGE B — The actor-mechanism decision (Group 0, PB-00)   │
  │  Select the mechanism against the candidate shortlist      │
  │  The product owner decides on the board's advice           │
  └──────────────────────────┬────────────────────────────────┘
                             │
                             ▼
  ┌───────────────────────────────────────────────────────────┐
  │  DESIGN BOARD — the checkpoint before the foundation [Q5]   │
  │  Reviews the foundation's design, chaired by the PO         │
  │  Consulted: IT leadership                                  │
  │  Gate: no foundation is built until this passes             │
  └──────────────────────────┬────────────────────────────────┘
                             │
                             ▼
  ┌───────────────────────────────────────────────────────────┐
  │  STAGE C — The foundation (Group 1, PB-01 + PB-02)         │
  │  Indivisible. Exit condition: the live-database proof      │
  │  that deleting an asset no longer destroys its audit rows.  │
  └──────────────────────────┬────────────────────────────────┘
                             │
                             ▼
  ┌───────────────────────────────────────────────────────────┐
  │  STAGE D — The lifecycle (Group 2, PB-03)                  │
  │  Five buckets, recovery, discard, the shared counting      │
  │  function and filter builder, the audit action vocabulary  │
  └──────────────────────────┬────────────────────────────────┘
                             │
                             ▼
  ┌───────────────────────────────────────────────────────────┐
  │  STAGE E — The count-consistency group (Group 3, PB-04)    │
  │  All four surfaces or none.                                │
  └──────────────────────────┬────────────────────────────────┘
                             │
                             ▼
  ┌───────────────────────────────────────────────────────────┐
  │  STAGE F — The remaining must-haves (Group 4)              │
  │  PB-05 asset editing · PB-06 duplicate-detection UX        │
  └──────────────────────────┬────────────────────────────────┘
                             │
                             ▼
  ┌───────────────────────────────────────────────────────────┐
  │  STAGE G — The cross-cutting work                          │
  │  PB-07 amendments distributed · PB-09 traceability ·        │
  │  PB-08 operational readiness                               │
  └───────────────────────────────────────────────────────────┘
```

### The actor-independent work that runs in parallel

Under the blocked-work position, the following work does not depend on the actor
mechanism and is not held hostage to it [Q6]:

- The shared counting definition's **specification** — the filter builder's semantics and
  the counting rules can be written down before the actor model exists. The
  implementation is Group 2's, but the specification is not actor-dependent.
- The CSV export's **formula-injection contract** — the sanitisation rule (a leading
  `=`, `+`, `-`, or `@` neutralised) is independent of who the actor is.
- The **workbook amendment surface** — the sections to be amended, and their content,
  do not depend on the actor mechanism. §4.3's actor-trust amendment is fixed already;
  it is the *mechanism*, not the *rule*, that is pending.
- The **design-system estimate** (C-01) — the early retirement of a deferred item's
  estimate, which is an estimation task with no dependency on the actor model.

### The checkpoints

| Checkpoint | When | Who | What it gates |
|---|---|---|---|
| **Stakeholder availability confirmed** | Before the foundation schedule is committed | Product owner | The foundation's schedule, and the expectation of I-01's response time [Q4] |
| **The design board** | After the actor-mechanism decision, before any foundation work is built | Chaired by the product owner; the developer presents; IT leadership consulted | The foundation's entire implementation [Q5] |
| **The live-database audit-survival proof** | At the end of the foundation | The developer, verified against a live instance | Every layer above the foundation |
| **The count-consistency proof** | At the end of the count-consistency group | The developer | The consistency guarantee across the four surfaces |
| **The operational-readiness sign-off** | In the operation phase | Operations and IT leadership; the product owner signs off | The MVP's release as operable |
| **The internal-reviewer demonstration** | At the operation phase's end | The internal reviewer demonstrates; the developer prepares the demonstrable state | The claim that custody is defensible |

## The Onboarding Checklist

This checklist exists for two reasons. The immediate one is that a single-owner team
means every reader of this document may be a person who is not the developer — the
reviewers, the product owner, and the eventual successor to the developer. The standing
one is that the concentration risk's only mitigation is that the reasoning survives
independently of the person, which requires the reasoning to be written down.

### For the developer, at the start of the work

- [ ] **Read the approved decision set and the workbook** as the binding contract. They are
      the ceiling and are not reopened at any stage of this intent [memory:M2].
- [ ] **Read the scope document's boundary** — the floor, the five deferrals, and the
      three invariants (INV-1, INV-2, INV-3) that are the only things that may retire
      existing POC behaviour.
- [ ] **Read the intent backlog's ranking** — PB-00 through PB-09, the deferred set
      C-01 through C-05, and the sequencing note on the design-system estimate.
- [ ] **Know the actor-trust rule before writing any audit code**: every audit entry
      derives its actor from trusted server-side context, and actor information
      supplied in a write request is never trusted [memory:M2].
- [ ] **Know that the actor column arrives before the actor mechanism** — the
      `audit_log` replacement lands first, so there is somewhere to write an actor even
      if one is not yet known. This ordering removes the dependency.
- [ ] **Know the 66/66 baseline is a gate, not a floor to re-establish later.** No test
      is weakened or removed.

### For the reviewers, at each review point

- [ ] **Actor-mechanism decision** — bring the answer to I-01, and the constraints that
      would rule a candidate in or out. This is the review that unblocks everything.
- [ ] **Operational-readiness sign-off** — bring the operational standard the running
      service must meet, and the evidence that it is met.
- [ ] **Internal-reviewer demonstration** — bring the custody-defensibility standard.
      The question is whether someone outside the build team can demonstrate the audit
      properties end to end.

### The documentation obligations

These are not optional onboarding steps. They are the mitigation for the concentration
risk, and they are the reason a one-person team is acceptable at all.

- [ ] **Record the architectural decisions as ADRs** at the design stage, so the
      reasoning survives independently of the person. This is the upstream mitigation for
      single-developer concentration and it is carried forward unchanged.
- [ ] **Record the design board's outcome** — the decision, the alternatives considered,
      and the reason — before the foundation is built. The board is the only place where
      an independent reading of the foundation's design happens.
- [ ] **Record the actor-mechanism decision and its reasoning**, including why the
      rejected candidates were rejected. It is the decision the whole initiative is
      sequenced around.
- [ ] **Keep the audit trail as the operational signal.** The audit trail is an
      application-level asset and the natural health and activity signal for the running
      service — not something to bolt on during the operation phase.

## Assumptions & Open Questions

- [assumption] The topology in the confirmed Q5 answer respects the two grouping constraints the scope stage established: the foundation workstream and the count-consistency group are each indivisible and are delivered whole, never split across owners or increments. The actor-identity decision remains a blocking dependency of the foundation, and no topology arrangement is read as permitting foundation work to begin against an unresolved actor model.
- [assumption] The blocked-work position in the confirmed Q6 answer governs only the actor-mechanism dependency. The scope document's own statement stands: a capability named in the approved set but absent from the MVP release is deferred rather than rejected, and the intent backlog records it as a named follow-on item with its approved standing intact.
- [assumption] The shared counting function and filter builder are modelled with the lifecycle group as the mechanism, and the four count-consuming surfaces are modelled as its consumers in a separate group. Splitting the mechanism from its consumers would leave the shared definition unused, which is the state in which the counts disagree — the defect the group exists to remove.
- [assumption] The single-owner topology is accepted with its concentration risk, which is mitigated by recording the architectural decisions as ADRs and by the design-board checkpoint, and not by adding a second author. The confirmed answer is explicit that the reviewers are not authors, and the stage's own skill position records no standing skill gap as unresolved.
- [assumption] No mob-style ensemble is composed. The confirmed topology is a single-owner stream, the team is one person in one location with no working overlap to arrange, and the reviewer constituency is event-driven and advisory. A rotating driver-navigator arrangement requires two people working together in real time, and no such pairing is available in the confirmed roster.
- [assumption] The operation phase's work (PB-08) is composed as a cross-cutting group within the release rather than as a separate team, because the operation phase's stages are workflow stages in the same intent and the deployment target's consequences are operational commitments of the MVP rather than incidental deployment work.
- [assumption] The stage's own deliverable naming uses "mob composition" as the artifact name, and this document records the confirmed topology's composition rather than a mob programme. A mob programme would contradict the confirmed Q5 and Q7 answers and the confirmed Q1 answer's statement that the reviewers are not authors.
- [assumption] The onboarding checklist's documentation obligations are treated as mitigation for the upstream-recorded single-developer concentration risk rather than as new process invented here, and they are carried forward unchanged.

## Sources Consumed

- **scope-document** (`aidlc/spaces/default/intents/261106-asset-tracker-mvp/ideation/scope-definition/scope-document.md`) — the five grouping constraints, the actor-identity boundary, the delivery constraints, and the operation-phase scope that put PB-08 inside the release.
- **intent-backlog** (`aidlc/spaces/default/intents/261106-asset-tracker-mvp/ideation/scope-definition/intent-backlog.md`) — the proto-Units PB-00 through PB-09 with their ranks and groupings, the deferred set C-01 through C-05, the value stream map, and the sequencing note on the design-system estimate.
- **feasibility-assessment** (`aidlc/spaces/default/intents/261106-asset-tracker-mvp/ideation/feasibility/feasibility-assessment.md`) — the workstream decomposition, the actor-trust evaluation and its candidate shortlist, and the qualification that the migration runner is the least-covered area under change.
- **constraint-register** (`aidlc/spaces/default/intents/261106-asset-tracker-mvp/ideation/feasibility/constraint-register.md`) — the deployment and data constraints that shape the operational group's work.
- **raid-log** (`aidlc/spaces/default/intents/261106-asset-tracker-mvp/ideation/feasibility/raid-log.md`) — the named RAID owners, the open issues, and the dependency chains including D-08, the open external dependency on the actor decision.
- **team-assessment** (`aidlc/spaces/default/intents/261106-asset-tracker-mvp/ideation/team-formation/team-assessment.md`) — the roster, the capacity allocation rule, the RACI matrix, and the inherited obligations.
- **skill-matrix** (`aidlc/spaces/default/intents/261106-asset-tracker-mvp/ideation/team-formation/skill-matrix.md`) — the skill coverage position and the remediation triggers that gate the groups' work.
- **team-formation-questions** (`aidlc/spaces/default/intents/261106-asset-tracker-mvp/ideation/team-formation/team-formation-questions.md`) — the nine confirmed team-formation answers and the nine accepted assumptions.

## Review

Reserved for the reviewer at the approval gate.
