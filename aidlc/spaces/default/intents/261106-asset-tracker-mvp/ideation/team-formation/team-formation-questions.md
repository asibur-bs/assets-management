# Team Formation Questions — Asset Tracker MVP

## Sources

- [desc] Initial description: "Build the Asset Tracker MVP from the approved Asset Tracker MVP Development Workbook, the POC-vs-MVP gap analysis, the decision brief, and the fully approved 17-item decision set. The MVP adds actor-attributed append-only audit history, previous-holder preservation via last_assigned_to, lost-asset recovery (lost to in-stock), an assigned to discarded transition that resolves the assignment inline, five exclusive status buckets with Active Inventory and Total Records computed by one shared counting function and filter builder, case-insensitive category-scoped serial uniqueness via a functional index with a concurrency-safe application-level fallback, CSV export with formula-injection protection, and an amendment to workbook section 4.1 and section 21.1 Scenario 3 recording Returned as a distinct resting state."
- [scope] Workflow-selected scope: `feature`.
- [Q1] The primary customer is internal IT asset administrators who register, assign, and write off assets on behalf of the organisation.
- [Q2] The primary success measure is Audit Completeness — 100% of audit entries carry an actor attribution, and history is never destroyed.
- [Q5] The key stakeholders are all four identified groups: asset administrators, the finance function, IT leadership, and the end user holding the asset; what each cares about is accurate custody records and defensible write-offs, a demonstrable system, and clarity about what they hold.
- [Q6] Scope is fixed for this MVP; the approved decision set and the workbook define it, and changes require a new approval round.
- [Q7] Progress is reported to stakeholders as a periodic summary covering delivered scope and outstanding decisions.
- [Q8] The product boundary includes the operation phase; the workflow scope was changed from `mvp` to `feature`, which runs 33 of 33 stages with no stage skipped, and no completed stage was invalidated.
- [memory:M2] `aidlc/spaces/default/memory/project.md#Decided`: "The fully approved 17-item Asset Tracker MVP decision set, together with the Asset Tracker MVP Development Workbook, is the binding technical and product contract for the `asset-tracker-mvp` intent; it is not reopened at any stage of that intent, and it carries seven standing conditions — the uniqueness check uses an IMMEDIATE transaction and a non-zero SQLite `busy_timeout` with `SQLITE_BUSY` mapped to a retryable error; the functional-index expression and the application-level comparison predicate use one shared definition; registration and serial/key updates enforce the same uniqueness policy; historical backfills preserve original records and audit traceability and report failures; dashboard, assignee, asset-list, and CSV counts use consistent filtering and counting definitions; every lifecycle transition has explicit validation and audit behaviour; and the existing 66/66 passing test baseline is preserved with regression tests added for newly approved behaviour. Traceability must be maintained between the approved MVP requirements and the POC requirements FR1.3, FR4.4, FR4.5, and FR5.3, and actor identity is resolved from trusted server-side context so actor information supplied in a write request is never trusted. (Stage intent-capture, 2026-11-06)"
- [memory:M3] `aidlc/spaces/default/memory/project.md#Decided`: "The decision set's amendment table names the workbook amendment surface as section 4.1 (transition table, recovery, `in-stock → lost`, `assigned → discarded`), section 4.2.5, section 4.3 (the actor-trust rule), section 4.4, section 6.1, section 6.4, section 6.5, section 9 (Screens 01, 02, 03, 04, 10), section 10, section 21.1, section 21.2, section 22, section 24 (the metric qualifiers the Audit Completeness population relies on), and the two new section 27 sections (Inventory Counting Definitions and Audit Action Vocabulary). The section 24 amendment carries the Audit Completeness qualifier verbatim: pre-MVP history is backfilled to a `system` actor and excluded from this metric. Section 4.1 records the `lost → in-stock` recovery transition with a required recovery reason drawn from the shared loss-reason vocabulary, and requires a distinct `recovered` audit action rather than `assign` or `return`, whose description names the recovery and the prior holder. It also records that complex recovery workflows — partial recovery, credit assignment, dispute handling — remain deferred, distinct from the single included recovery transition. The workbook's remaining MVP feature set is the reconciliation dashboard, the assignee directory, asset editing, duplicate-detection UX, empty states, result counts, pagination, improved search, responsive UI, and a design system. The design-system enumeration is indicative, not exhaustive: workbook section 11 is the authoritative source for the complete design-system requirements, covering semantic color tokens, a typography scale, spacing tokens, radius and shadow scales, iconography, and a light-theme implementation designed for future dark-theme extension. (Stage intent-capture, 2026-11-06)"
- [memory:M4] `aidlc/spaces/default/memory/project.md#Decided`: "The `assigned → discarded` transition resolves the assignment inline and records it: `assigned_to` is cleared, `last_assigned_to` is retained so the holder at discard time stays visible, and a `discarded` audit action records the discard, the prior holder, and the fact that the assignment was resolved by the discard. A discard reason is always required, drawn from the shared loss-reason vocabulary plus retirement-specific values. The asset row and its full history are never deleted; a discarded asset is excluded from Active Inventory but remains present in the `discarded` bucket and in Total Records, and stays accessible at its detail URL with its history intact. (Stage intent-capture, 2026-11-06)"

## What has already been established

The upstream ideation stages have already answered most of what this stage would otherwise need
to ask. They are recorded here so the questions below are asked against facts rather than
re-asking settled ground.

| Already settled | Where it was settled |
|---|---|
| One single developer builds the MVP, with full context on the POC and no ramp-up cost | Feasibility Q4 |
| No fixed deadline and no separate budget — the MVP proceeds as ordinary engineering time | Feasibility Q5, scope Q5 |
| The deployment target is a single internal host with a machine-local SQLite file | Feasibility Q6 |
| Four stakeholder groups shape the MVP: asset administrators, finance, IT leadership, asset holders | Intent capture Q5 |
| The periodic stakeholder summary is shared across all four groups, with no primary audience | Scope Q7 |
| Prioritisation ties are decided by the intent's product owner directly | Scope Q7 |
| The release is foundation-gated: the foundation precedes everything, and the four count-consuming surfaces form one indivisible group | Scope Q3 |
| Sequencing is risk-first: uncertainty is retired before dependent work commits to it | Scope Q4 |
| The actor-identity mechanism is a blocking dependency of the foundation workstream, undecided pending I-01 | Scope Q6 |
| The MVP's ten capability areas are all technically feasible; two need a structural table rebuild, eight are additive | Feasibility verdict |
| The migration runner is the load-bearing component and the least-covered of the three areas under change | Feasibility qualification 1, RAID R-01 |
| The design system is the largest single body of unestimated work | Feasibility qualification 2, RAID R-04 |
| The 66/66 test baseline is a standing constraint and a merge gate | Feasibility B7, constraint TC-13, RAID R-12 |
| No CI, container, cloud, or infrastructure-as-code posture exists | Feasibility B8, constraint DC-03 |
| The whole system of record lives in one un-replicated file | Feasibility B9, constraint DC-02, RAID R-07 |
| Single-developer concentration is a known, accepted trade-off | RAID R-15 |

Two upstream items remain genuinely open and are carried into this stage rather than re-asked:
whether an existing trusted authentication mechanism exists anywhere in the organisation
(I-01 / I-03), and whether a records-retention or disposal schedule applies to asset custody
records (I-02). Both are named in the RAID log as requiring input from the human and from
four named teams (IT, HR, Finance, Operations).

## Q1. Who actually staffs the MVP

The feasibility stage confirmed a single developer with full POC context. That answers
"who has the context", but it does not answer "who is on the team" — because a team is not
only its authors. The MVP has four stakeholder groups, an operation phase with real
operational obligations (a backup-and-restore procedure that must be *exercised*, not merely
written), and an audit trail that must be demonstrable to an internal reviewer. Those
obligations need owners, and a lone developer's time is finite.

Which people are available to work on this MVP, and in what capacity?

- A. **One developer only.** The same developer who built the POC does all the build work, and owns the operational obligations too. No one else is formally on the team; other groups are consulted rather than contributing.
- B. **One developer plus named reviewers.** The developer does the build; a small number of named people — from IT leadership, finance, and operations — act as reviewers and advisors at defined points (the actor-mechanism decision, the operational-readiness sign-off, the internal-reviewer demonstration). They are not authors.
- C. **One developer plus contributors for specific capabilities.** The developer remains the core, and additional people contribute in specific, named areas — for example an operations person for the backup-and-restore procedure, or a designer for the deferred design system if it is pulled forward.
- D. **A small multi-person team.** Two or more people share the build work, with the POC developer as one of them.
- E. Not yet defined
- X. Other (please specify)

[Answer]: B. One developer plus named reviewers. The developer does the build; a small number
of named people — from IT leadership, finance, and operations — act as reviewers and advisors
at defined points: the actor-mechanism decision, the operational-readiness sign-off, and the
internal-reviewer demonstration of the audit properties. They are not authors.

## Q2. Capacity and utilisation

The feasibility stage confirmed no deadline and no separate budget, which means the MVP is
paced as ordinary engineering time. That is a freedom, but it is not an infinite amount of
time: the six-to-eight week gap-analysis figure is conditional, and the design system alone
is the largest unestimated body of work. A team-formation record that says "capacity is
unconstrained" would be less useful than one that says what is realistically available.

What capacity is realistically available for this MVP?

- A. **Unconstrained ordinary engineering time.** No competing initiatives draw from this developer; capacity is whatever the work needs, spread over however long it takes. The MVP is not competing for anything.
- B. **Partially constrained.** The developer has other commitments — other projects, operational duties, or leave — that limit how much time is available in any period. The constraint is real but not quantified here.
- C. **Substantially constrained.** The developer has significant competing obligations, and the MVP's throughput will be materially constrained by them.
- D. Not yet defined
- X. Other (please specify)

[Answer]: B. Partially constrained. The developer has other commitments — other projects,
operational duties, or leave — that limit how much time is available in any period. The
constraint is real but not quantified here.

## Q3. Skills required versus skills available

The MVP's work spans well beyond application code: SQLite schema migration and the
create-copy-drop-rename rebuild path, concurrent-write error handling, a shared counting
function consumed by four surfaces, server-side session or trusted-header handling if the
actor mechanism lands that way, and an operational backup-and-restore procedure on a
machine-local file. The RAID log also names a design-system workstream whose authoritative
specification is workbook section 11.

Which of these skill areas does the team need to have covered, and how are the gaps handled?

- A. **Covered by the developer, with gaps handled by escalation or research.** The developer covers the build skills; a genuine gap — a skill the work needs and nobody on the team has — is handled by researching it, consulting outside the team, or bringing in specialist help at that point. No standing skill gap is accepted as unresolved.
- B. **Covered by the developer, with named gaps accepted.** There are skill areas the team does not have and is not going to acquire — most plausibly the design-system work and the operational backup procedure — and the MVP proceeds with them acknowledged as gaps rather than closed.
- C. **Specific gaps identified and closed before the dependent work starts.** The gaps are named in advance, and the remedy — training, a contractor, a partner team, or a scope decision to defer the dependent work — is agreed before the work that needs the skill begins.
- D. Not yet defined
- X. Other (please specify)

[Answer]: A. Covered by the developer, with gaps handled by escalation or research. The
developer covers the build skills; a genuine gap — a skill the work needs and nobody on the
team has — is handled by researching it, consulting outside the team, or bringing in
specialist help at that point. No standing skill gap is accepted as unresolved.

## Q4. Competing initiatives and the same talent pool

The RAID log carries I-01 and I-03 as issues requiring input from four named teams — IT, HR,
Finance, and Operations. The internal existing-tool inventory (I-03) has never been
gathered, and the actor-mechanism question (I-01) is blocked on the same inquiry. Both
require people outside the development team to spend time on an internal question. If those
same people are also carrying the initiative this MVP replaces, or another initiative with
a competing deadline, the answers may arrive late — and I-01 blocks the foundation.

Are there competing initiatives drawing from the same people, and specifically the same
people whose input I-01, I-02, and I-03 need?

- A. **No competing initiatives.** The people who must answer the three open questions are not simultaneously committed to something that competes with this MVP. The answers are obtainable on the MVP's own timescale.
- B. **Some competition exists, and it is manageable.** Other work shares attention with the named teams, but not enough to threaten the answers arriving before the actor mechanism must be decided.
- C. **Material competition exists.** The same people are on other initiatives with their own deadlines, and the answers may be delayed — which means the actor-identity decision, and therefore the foundation, waits on an external input the team does not control.
- D. Not yet defined
- X. Other (please specify)

[Answer]: Not yet established. The availability and competing commitments of IT, HR,
Finance, and Operations stakeholders have not been assessed. In particular, it is not yet
known whether the people needed to resolve I-01 (actor identity), I-02 (design-system
estimate), and I-03 (existing-tool inventory) are committed to competing initiatives or
deadlines. Treat stakeholder availability as an open dependency. Confirm their availability
and expected response times before committing to the foundation schedule. I-01 remains a
blocking dependency until resolved.

## Q5. Preferred team topology and how the work is organised

The stage needs a topology, not just a headcount. The choice matters here because of two
structural facts the upstream stages established: the foundation and the count-consistency
group are each **indivisible** — a group shipping all but one of its members has no
guarantee at all — and the actor-mechanism decision is a **blocking dependency** of the
foundation, so no foundation work can be planned against an unresolved actor model. A
topology that optimises for task parallelism would break both. A topology that optimises for
single-owner coherence has to accommodate that some work simply cannot start yet.

How should the work be organised?

- A. **Single-owner stream with review checkpoints.** One developer owns the work end to end, in dependency order, with the mob's review roles performed by the AI participants in the workflow and by the human at the approval gates. Indivisible groups are delivered whole by the one owner, and blocked work waits rather than being split.
- B. **Mob-style ensemble on the indivisible groups.** The developer drives, and the AI agents act as navigators on the two indivisible groups specifically — the foundation and the count-consistency group — where a shared understanding of the mechanism is the point. Elsewhere the developer works alone.
- C. **Single-owner stream with an explicit design-board checkpoint before the foundation.** One owner throughout, but the foundation's design is reviewed as a board before any of it is built, because its mechanism determines everything above it and the actor model is still unresolved.
- D. Not yet defined
- X. Other (please specify)

[Answer]: C. Single-owner stream with an explicit design-board checkpoint before the
foundation. One owner throughout, but the foundation's design is reviewed as a board before
any of it is built, because its mechanism determines everything above it and the actor model
is still unresolved.

## Q6. Handling the work that cannot start yet

The actor-identity mechanism decision (PB-00) blocks the foundation (PB-01), which blocks
everything else. It cannot be resolved internally, because it depends on I-01 — whether an
existing trusted authentication mechanism exists anywhere in the organisation. This is the
concrete instance of a team-topology question: a stream-aligned team's work is blocked on
input from outside the team, and the useful thing to record is what the team does with the
blocked time and what the decision costs in each direction.

What should the team do about work that is blocked on the unresolved actor mechanism?

- A. **Sequence the resolution forward and work around the block.** Treat the actor decision as the very first deliverable, resolve I-01 as the first action of the inception stages, and plan no foundation work until it is answered. Meanwhile the work that does not depend on it — the shared counting definition's specification, the CSV export's formula-injection contract, the workbook amendment surface — proceeds.
- B. **Prepare both branches in parallel.** Prepare the foundation for each of the two realistic branches (a low-cost server-configured or trusted-header actor, and a higher-cost application-managed session), so that whichever way I-01 resolves the start is immediate. The cost is that some preparation is wasted.
- C. **Accept the wait explicitly.** Do no parallel preparation. Record the block, name the cost of waiting, and begin the foundation only once the answer arrives.
- D. Not yet defined
- X. Other (please specify)

[Answer]: A. Sequence the resolution forward and work around the block. Treat the actor decision as the very first deliverable, resolve I-01 as the first action of the inception stages, and plan no foundation work until it is answered. Meanwhile the work that does not depend on it — the shared counting definition's specification, the CSV export's formula-injection contract, the workbook amendment surface — proceeds.

## Q7. Time zones, locations, and working overlap

A mob-style ensemble needs overlap to work — a single navigator can think while the driver
types, and rotating the driver needs shared time. A single-owner stream does not. If
additional people are on the team, whether they can work at the same time is a real
constraint on whether a mob is possible at all.

Where are the people on this team located, and how much working overlap is there?

- A. **One person, one location.** There is no overlap to arrange and no time-zone constraint. Any coordination with the four stakeholder groups is asynchronous.
- B. **Several people, with partial overlap.** The team spans locations or time zones, and there is some common working hours, enough for a limited form of synchronisation.
- C. **Several people, with good overlap.** The team can work together in real time, which makes a mob-style ensemble viable if that is the chosen topology.
- D. Not yet defined
- X. Other (please specify)

[Answer]: A. One person, one location. There is no overlap to arrange and no time-zone constraint. Any coordination with the four stakeholder groups is asynchronous.

## Q8. External partners, contractors, and specialist help

The feasibility stage found the estate contains no cloud, container, or CI posture, and the
RAID log carries the backup gap (R-07) and the CI gap (R-16) as inherited obligations the
MVP must discharge. The design system is the largest unestimated body of work and its
authoritative specification is a workbook section rather than an implementation. Whether
outside help is available changes what the skill-gap answer in Q3 can be.

Are external partners, contractors, or professional services needed or available?

- A. **None — internal only.** No external help is wanted or available. Every skill gap is closed by the team learning it or by a scope decision.
- B. **Available if needed, not committed.** Outside help could be brought in for specific areas — most plausibly the operational backup procedure or the design system — but nothing is committed and nothing is needed yet.
- C. **Needed for specific named areas.** The MVP cannot succeed without outside help in at least one named area, and that need is recorded with its scope and cost.
- D. Not yet defined
- X. Other (please specify)

[Answer]: B. Available if needed, not committed. Outside help could be brought in for specific areas — most plausibly the operational backup procedure or the design system — but nothing is committed and nothing is needed yet.

## Q9. Decision-makers for each phase

The upstream stages have settled several decision rights already: prioritisation ties go to
the intent's product owner directly, the actor-trust rule is fixed and is not reopened by
any stage, and scope changes require a new human approval round. The RAID log also assigns
named owners to specific items — Architect for R-01 and R-05, Developer for R-03 and R-06,
Operations for R-07 and R-09, Quality engineer for R-12 and R-16, Product owner for R-02
and I-03, Compliance for I-02. What is not yet settled is who decides the things this
stage's own artifacts will need decided later.

Who holds decision authority for each phase?

- A. **One decision-maker throughout — the intent's product owner.** The product owner decides prioritisation, accepts the team and capacity plan, resolves the actor mechanism once I-01 answers, and signs off the operation-phase readiness. The four stakeholder groups are consulted at the gates where their concerns apply, and the internal reviewer who must be able to demonstrate custody is consulted on the audit properties.
- B. **Split by phase and concern.** Different people decide different things: the product owner for prioritisation and scope, IT leadership for the deployment target and operation-phase readiness, finance for write-off defensibility, and compliance for the records-retention question (I-02) once it is asked. The internal reviewer has no decision authority at all.
- C. **Split, with a named escalation path.** Authority is split as above, and where two decision-makers disagree the matter escalates to a named tie-breaker rather than being resolved by whoever is nearest.
- D. Not yet defined
- X. Other (please specify)

[Answer]: A. One decision-maker throughout — the intent's product owner. The product owner decides prioritisation, accepts the team and capacity plan, resolves the actor mechanism once I-01 answers, and signs off the operation-phase readiness. The four stakeholder groups are consulted at the gates where their concerns apply, and the internal reviewer who must be able to demonstrate custody is consulted on the audit properties.

## Assumption Confirmation

- A. Accept assumptions
- B. Convert to follow-up questions

- [assumption] The team is composed of the people named in Q1, and Q1's answer is the authoritative roster. The upstream confirmation that a single developer with full POC context builds this is carried forward as the build-side fact; the team-formation artifacts record the roster, its capacity, and its skill gaps, and do not re-open who builds the POC.
- [assumption] The capacity position in Q2 is a planning input, not a delivery commitment. Because no deadline and no separate budget exist, the absence of a quantified capacity figure is not itself a risk; what the artifacts record is whether capacity is competing with other work, because that is what determines whether the risk-first sequencing preference is achievable.
- [assumption] The skill-gap position in Q3 is recorded against the work the release actually contains. The design system is deferred from the MVP release by the scope stage, so a design-skill gap is recorded as a gap in the deferred increment rather than as a gap in the MVP release — while the operational skill areas (backup-and-restore, observability, CI) are inside the release because the operation phase is in scope.
- [assumption] The competition position in Q4 applies to the people who must answer I-01, I-02, and I-03 — IT, HR, Finance, and Operations — and not to the development team itself. Where the answer records competition, the artifacts record it as a schedule risk on the actor-mechanism decision, because I-01 blocks the foundation and therefore every downstream item.
- [assumption] The topology in Q5 respects the two grouping constraints the scope stage established: the foundation workstream and the count-consistency group are each indivisible and are delivered whole, never split across owners or increments. The actor-identity decision remains a blocking dependency of the foundation, and no topology arrangement is read as permitting foundation work to begin against an unresolved actor model.
- [assumption] The blocked-work position in Q6 governs only the actor-mechanism dependency. The scope document's own statement stands: a capability named in the approved set but absent from the MVP release is deferred rather than rejected, and the intent backlog records it as a named follow-on item with its approved standing intact.
- [assumption] The decision-rights position in Q9 is consistent with the authority the upstream stages already fixed: prioritisation ties belong to the intent's product owner directly, the actor-trust rule is fixed and is not reopened at any stage of this intent, and any change to the approved scope requires a new human approval round rather than a delivery-stage decision.
- [assumption] The three open items carried from upstream remain open and unresolved by this stage: I-01 / I-03 (whether an existing trusted authentication mechanism exists anywhere in the organisation), I-02 (whether a records-retention or disposal schedule applies to asset custody records), and I-04 (the unquoted licence cost). None is assumed resolved in either direction. Organisational adoption readiness (R-02) also remains open at the human's direction.
- [assumption] The confirmed test baseline of 66/66 passing tests and the absence of any CI posture are carried into the team-formation artifacts as inherited obligations the team must discharge — the baseline as a merge gate, the CI gap as work the build-and-test stage owns — rather than as skill gaps that the current team cannot cover.

[Answer]: A. Accept assumptions

## Consolidated Summary Confirmation

- Looks correct
- Request changes

[Answer]: Looks correct
