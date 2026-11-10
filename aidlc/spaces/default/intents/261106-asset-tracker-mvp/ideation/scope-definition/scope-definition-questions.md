# Scope Definition Questions — Asset Tracker MVP

## Sources

- [desc] Initial description: "Build the Asset Tracker MVP from the approved Asset Tracker MVP Development Workbook, the POC-vs-MVP gap analysis, the decision brief, and the fully approved 17-item decision set. The MVP adds actor-attributed append-only audit history, previous-holder preservation via last_assigned_to, lost-asset recovery (lost to in-stock), an assigned to discarded transition that resolves the assignment inline, five exclusive status buckets with Active Inventory and Total Records computed by one shared counting function and filter builder, case-insensitive category-scoped serial uniqueness via a functional index with a concurrency-safe application-level fallback, CSV export with formula-injection protection, and an amendment to workbook section 4.1 and section 21.1 Scenario 3 recording Returned as a distinct resting state."
- [scope] Workflow-selected scope: `feature`.
- [Q1] The primary customer is internal IT asset administrators who register, assign, and write off assets on behalf of the organisation.
- [Q2] The primary success measure is Audit Completeness — 100% of audit entries carry an actor attribution, and history is never destroyed.
- [Q6] Scope is fixed for this MVP; the approved decision set and the workbook define it, and changes require a new approval round.
- [Q7] Progress is reported to stakeholders as a periodic summary covering delivered scope and outstanding decisions.
- [Q8] The product boundary includes the operation phase; the workflow scope was changed from `mvp` to `feature`, which runs 33 of 33 stages with no stage skipped, and no completed stage was invalidated.
- [memory:M2] `aidlc/spaces/default/memory/project.md#Decided`: "The fully approved 17-item Asset Tracker MVP decision set, together with the Asset Tracker MVP Development Workbook, is the binding technical and product contract for the `asset-tracker-mvp` intent; it is not reopened at any stage of that intent, and it carries seven standing conditions — the uniqueness check uses an IMMEDIATE transaction and a non-zero SQLite `busy_timeout` with `SQLITE_BUSY` mapped to a retryable error; the functional-index expression and the application-level comparison predicate use one shared definition; registration and serial/key updates enforce the same uniqueness policy; historical backfills preserve original records and audit traceability and report failures; dashboard, assignee, asset-list, and CSV counts use consistent filtering and counting definitions; every lifecycle transition has explicit validation and audit behaviour; and the existing 66/66 passing test baseline is preserved with regression tests added for newly approved behaviour. Traceability must be maintained between the approved MVP requirements and the POC requirements FR1.3, FR4.4, FR4.5, and FR5.3, and actor identity is resolved from trusted server-side context so actor information supplied in a write request is never trusted. (Stage intent-capture, 2026-11-06)"
- [memory:M3] `aidlc/spaces/default/memory/project.md#Decided`: "The decision set's amendment table names the workbook amendment surface as section 4.1 (transition table, recovery, `in-stock → lost`, `assigned → discarded`), section 4.2.5, section 4.3 (the actor-trust rule), section 4.4, section 6.1, section 6.4, section 6.5, section 9 (Screens 01, 02, 03, 04, 10), section 10, section 21.1, section 21.2, section 22, section 24 (the metric qualifiers the Audit Completeness population relies on), and the two new section 27 sections (Inventory Counting Definitions and Audit Action Vocabulary). The section 24 amendment carries the Audit Completeness qualifier verbatim: pre-MVP history is backfilled to a `system` actor and excluded from this metric. Section 4.1 records the `lost → in-stock` recovery transition with a required recovery reason drawn from the shared loss-reason vocabulary, and requires a distinct `recovered` audit action rather than `assign` or `return`, whose description names the recovery and the prior holder. It also records that complex recovery workflows — partial recovery, credit assignment, dispute handling — remain deferred, distinct from the single included recovery transition. The workbook's remaining MVP feature set is the reconciliation dashboard, the assignee directory, asset editing, duplicate-detection UX, empty states, result counts, pagination, improved search, responsive UI, and a design system. The design-system enumeration is indicative, not exhaustive: workbook section 11 is the authoritative source for the complete design-system requirements, covering semantic color tokens, a typography scale, spacing tokens, radius and shadow scales, iconography, and a light-theme implementation designed for future dark-theme extension. (Stage intent-capture, 2026-11-06)"
- [memory:M4] `aidlc/spaces/default/memory/project.md#Decided`: "The `assigned → discarded` transition resolves the assignment inline and records it: `assigned_to` is cleared, `last_assigned_to` is retained so the holder at discard time stays visible, and a `discarded` audit action records the discard, the prior holder, and the fact that the assignment was resolved by the discard. A discard reason is always required, drawn from the shared loss-reason vocabulary plus retirement-specific values. The asset row and its full history are never deleted; a discarded asset is excluded from Active Inventory but remains present in the `discarded` bucket and in Total Records, and stays accessible at its detail URL with its history intact. (Stage intent-capture, 2026-11-06)"

## What has already been established

The upstream ideation stages have already answered several questions this stage would
otherwise need to ask. They are recorded here so the questions below are asked against
facts rather than re-asking settled ground.

| Already settled | Where it was settled |
|---|---|
| The business problem is unauditable asset accountability; the POC's data-integrity gaps block real use | Intent capture Q1, Q4 |
| The primary customer is internal IT asset administrators | Intent capture Q2 |
| Audit Completeness is the primary success measure; 0 audit rows destroyed is the measurable form of "history is never destroyed" | Intent capture Q3 |
| All four stakeholder groups shape the MVP: asset administrators, finance, IT leadership, asset holders | Intent capture Q5 |
| Scope is fixed; changes require a new approval round | Intent capture Q6 |
| Progress is reported as a periodic stakeholder summary | Intent capture Q7 |
| The workflow runs all 33 stages with no stage skipped, including the whole operation phase | Intent capture Q8, confirmed as `feature` scope |
| Auditability is the differentiator; registration, assignment/return, loss marking, and per-asset history are table-stakes | Market research Q3, Q4 |
| Build position: extend the existing POC | Market research Q5 |
| No external regulatory driver; the driver is operational efficiency | Market research Q6 |
| Scale is medium: several internal teams, hundreds to low thousands of assets | Market research Q7 |
| The MVP is self-contained; it integrates with no other system | Feasibility Q1 |
| Only a general internal audit expectation attaches; no external framework is imposed | Feasibility Q2 |
| The actor-trust *rule* is fixed; the *mechanism* is a shortlist with application-managed login leading, undecided | Feasibility Q3 |
| One single developer builds it, with full POC context | Feasibility Q4 |
| No fixed deadline and no separate budget | Feasibility Q5 |
| Deployment target: the same single internal host with a machine-local SQLite file | Feasibility Q6 |
| Organizational adoption readiness is unknown and stays open | Feasibility Q7, RAID R-02 |
| Pre-MVP records are backfilled in place with a `system` actor and excluded from Audit Completeness | Feasibility Q8 |
| All ten approved capability areas are technically feasible; two need a structural table rebuild, eight are additive | Feasibility verdict |
| The design system is the largest single body of unestimated work, and the gap analysis's 6–8 week estimate is conditional on scoping it | Feasibility qualification 2 |

Three upstream questions remain genuinely open and are carried into this stage rather than
re-asked: whether an existing trusted authentication mechanism exists (I-01 / I-03), whether
a records-retention schedule applies to custody records (I-02), and the licence cost that
would make a buy position re-openable (I-04).

## Q1. Minimum viable scope — the floor that must ship

The approved decision set fixes what the MVP *may* contain. This question fixes the floor:
the smallest set that still delivers the primary success measure, Audit Completeness [Q2],
without which the MVP would not be worth building.

Which capability set is the minimum viable scope?

- A. **Audit-first floor** — the actor-attributed append-only audit history, `last_assigned_to` preservation, the two structural table changes, and the backfill. Everything else (dashboard, assignee directory, editing, design system, CSV export, pagination, improved search, responsive UI) is optional. Note: this floor would leave the product's visible surface almost unchanged from the POC.
- B. **Audit + lifecycle floor** — the audit-first floor plus the recovery and discard transitions and the five exclusive status buckets with the shared counting function. The lifecycle becomes complete and the counts become trustworthy; the presentation layer stays minimal.
- C. **Audit + lifecycle + operator surface floor** — option B plus the reconciliation dashboard and the assignee directory, so an administrator can see custody and counts without reading raw data. The design system, editing, pagination, improved search, and responsive UI remain outside the floor.
- D. **Full approved set** — the complete approved decision set and the full workbook MVP feature set, as one indivisible deliverable. The floor and the whole are the same thing.
- E. Not yet defined
- X. Other (please specify)

[Answer]: B. Audit + lifecycle floor.

## Q2. Must-have versus nice-to-have within the approved set

Even with the floor fixed, the approved set contains items that could be split across
releases without breaking the floor. The feasibility assessment singled out the design
system as the largest body of work on a 40-line stylesheet, and it is the item most likely
to be mistaken for table-stakes when it is not.

Which of the following are genuinely *must-have* for the MVP release, as opposed to
deliverable in a later increment?

Choose all that apply.

- A. The design system (section 11: semantic colour tokens, typography scale, spacing tokens, radius and shadow scales, iconography, light theme with dark-theme extension)
- B. Responsive UI
- C. Improved search
- D. Pagination and result counts
- E. Empty states
- F. Duplicate-detection UX
- G. Asset editing
- H. The reconciliation dashboard
- I. The assignee directory
- J. CSV export with formula-injection protection
- K. None of the above — all of these are nice-to-have and none is required for the MVP release
- X. Other (please specify)

[Answer]: H, I, J, G, F — the reconciliation dashboard and the assignee directory, CSV
export with formula-injection protection, asset editing, and duplicate-detection UX are
must-have for the MVP release. A, B, C, D, and E — the design system, responsive UI,
improved search, pagination and result counts, and empty states — are not must-have, and
are deliverable in a later increment.

## Q3. Dependencies between capabilities

The feasibility assessment grouped the work into seven workstreams and found that the
migration runner is load-bearing for both structural changes and the actor column, and
that the shared counting function's "by construction" consistency guarantee only holds if
all four surfaces — dashboard, assignee, asset list, and CSV export — actually consume it.
Those two dependencies constrain the order in which capabilities can be delivered, and
they decide whether any capability can ship independently.

Which dependency structure should the scope assume?

- A. **Foundation-gated** — the foundation workstream (audit-table replacement, `assets` table rebuild, `last_assigned_to`, actor column, backfill) must complete and be verified before any other capability can be built on top of it. The counting guarantee similarly requires all four count-consuming surfaces to land together, so they form a second indivisible group.
- B. **Foundation-gated, counts allowed to land in stages** — the foundation is a hard gate as in A, but the four count-consuming surfaces may ship incrementally, accepting that the counts are only guaranteed consistent once all four are present.
- C. **Capability-independent delivery** — each capability is independently deliverable and verifiable, with no cross-capability gate beyond the foundation, so that partial releases each carry independent user value.
- D. Not yet defined
- X. Other (please specify)

[Answer]: A. Foundation-gated. The foundation workstream is a hard gate before any other
capability is built on it, and the four count-consuming surfaces — dashboard, assignee
directory, asset list, and CSV export — form a second indivisible group, because the
shared counting function's consistency guarantee holds only if all four consume it.

## Q4. Sequencing preference

The delivery lead's guidance is that sequencing is an economic judgement rather than a
topological one: the dependency order falls out of the analysis, but the *path* through it
is chosen by what the team most needs to learn or prove first. Four heuristics are
available, and this intent's confirmed constraints shape which of them fits.

Which sequencing preference should the intent backlog be ranked by?

- A. **Risk-first** — the highest-uncertainty capabilities come first, so the actor-identity mechanism (I-01) and the design-system estimate are resolved before dependent work commits to them. This is the default recommended by the feasibility assessment, which recommended resolving I-01 and I-02 before the actor mechanism is selected.
- B. **Value-first** — the capabilities that deliver the most user-visible value come first, so a demonstrable custody-and-audit product exists early, accepting that the actor-identity uncertainty sits unresolved for longer.
- C. **Dependency-first** — strictly follow the dependency chain, delivering the foundation and the count-consistency group before anything else, and letting user-visible value accumulate afterwards.
- D. **Walking-skeleton-first** — the first delivery is a minimal end-to-end slice that proves the whole system works — a single asset registered, assigned, returned, and audited with an actor — before any capability is deepened.
- E. Not yet defined
- X. Other (please specify)

[Answer]: A. Risk-first. The highest-uncertainty capabilities are sequenced first, so the
actor-identity mechanism (I-01) and the design-system estimate are resolved before
dependent work commits to them. This follows the feasibility assessment's recommendation
to resolve I-01 and I-02 before the actor mechanism is selected.

## Q5. Hard deadlines tied to specific capabilities

The confirmed position is that there is no fixed deadline and no separate budget, and that
the MVP proceeds at the team's own pace [Q5 of feasibility]. This question asks the
narrower question that the earlier answer did not cover: whether any *specific capability*
is nonetheless tied to a date, event, or commitment — a stocktake, a budget cycle, an office
move, an audit, or a committed delivery to a named party.

Does any capability carry a hard deadline or a fixed commitment?

- A. No — no capability is tied to a date or a committed delivery; the whole MVP is paced as ordinary engineering work.
- B. Yes — a specific capability has a date or commitment attached. Please name the capability, the date or event, and what happens if it slips.
- C. Not yet defined
- X. Other (please specify)

[Answer]: A. No capability is tied to a date or a committed delivery; the whole MVP is
paced as ordinary engineering work. No hard deadline constrains the scope, and no
capability is constrained by a date, event, or committed delivery to a named party.

## Q6. The actor-identity mechanism's place in scope

The feasibility stage left the actor mechanism as an undecided shortlist, with
application-managed login leading, and carried three unresolved items: whether an existing
trusted authentication mechanism exists anywhere in the organisation (I-01 / I-03), whether
a records-retention schedule applies (I-02), and the licence cost that would make a buy
position re-openable (I-04). The Audit Completeness metric depends on the mechanism being
resolved one way or another, but *this stage's* scope question is narrower: where does the
mechanism sit relative to the MVP release, and what does the intent backlog carry as its
own unresolved item?

Which is the right scope treatment for the actor-identity mechanism?

- A. **In scope, mechanism undecided** — the MVP release includes actor attribution, and the mechanism is resolved during the inception stages once I-01 is answered. The intent backlog carries the mechanism decision as an explicit open item with the shortlist attached.
- B. **In scope, decision deferred to the inception stages as a formal gate** — as A, but the mechanism decision is carried as a named blocking dependency of the foundation workstream, so no foundation work is planned against an unresolved actor model.
- C. **Split into two increments** — the MVP release carries the cheapest mechanism that satisfies the actor-trust rule, and the richer mechanism (login, sessions, authorisation) is a named follow-on increment. Note: this requires naming the cheapest mechanism now, which would close a decision the feasibility stage deliberately left open.
- D. Not yet defined
- X. Other (please specify)

[Answer]: B. In scope, decision deferred to the inception stages as a formal gate. The MVP
release includes actor attribution, and the mechanism is resolved during the inception
stages once I-01 is answered. The mechanism decision is carried as a named **blocking
dependency of the foundation workstream**, so no foundation work is planned against an
unresolved actor model. The intent backlog records it as an explicit open item with the
feasibility stage's candidate shortlist attached: server-configured single operator,
trusted request header from an authenticating proxy, operator selection, and
application-managed login and session (the leading candidate).

## Q7. Who the stakeholder summary is addressed to, and what it must carry

The confirmed position is that progress is reported as a periodic summary covering delivered
scope and outstanding decisions, but the audience was never named, and the relative
influence of the four stakeholder groups over prioritisation was never answered either.
Both are scope-relevant: the summary's audience determines what "outstanding decisions"
must be legible to, and the influence question determines whose concerns break a tie in
the backlog ranking.

Which stakeholder group is the primary audience for the periodic summary, and how do the
four groups' influences compare when a prioritisation tie has to be broken?

- A. Asset administrators as the primary audience, with finance, IT leadership, and asset holders as secondary; when a tie is broken, IT leadership's decision wins, because approval is theirs to give.
- B. IT leadership as the primary audience, since the MVP must be demonstrable and credible to approve; when a tie is broken, finance's preference wins, because write-off defensibility is the property they need.
- C. A shared summary addressed to all four groups together, with no primary audience and no fixed tie-break — the intent's own product owner decides ties directly.
- D. Not yet defined
- X. Other (please specify)

[Answer]: C. A shared summary addressed to all four stakeholder groups together, with no
primary audience and no fixed tie-break. The intent's own product owner decides
prioritisation ties directly.

## Q8. The scope boundary's treatment of the POC's existing behaviour

The approved decision set adds capabilities to the POC rather than replacing it, and the
POC's 66/66 test baseline is a standing constraint. The intent capture already ruled out
any change to the POC's code, database, tests, or configuration *during Stage 1*. This
question asks the forward-looking boundary: what happens to POC behaviour that the MVP
does not explicitly cover.

How should POC behaviour that is not explicitly covered by the approved decision set be
treated?

- A. **Preserve as-is** — every existing POC behaviour remains, and the MVP is purely additive. Any behaviour the decision set implies must change (for example, the POC's asset deletion) is changed only where the approved set requires it, and everything else is untouched.
- B. **Preserve unless it contradicts an approved invariant** — POC behaviour is kept by default, but where it conflicts with an approved invariant (append-only history, exclusive buckets, the shared counting definition), the invariant wins and the conflicting POC behaviour is retired, with the retirement recorded.
- C. **Re-derive from the workbook** — the workbook is the authority, and any POC behaviour that the workbook does not describe is treated as unspecified rather than preserved.
- D. Not yet defined
- X. Other (please specify)

[Answer]:

## Assumption Confirmation

- A. Accept assumptions
- B. Convert to follow-up questions

- [assumption] The minimum viable scope (Q1) is the audit + lifecycle floor, and the must-have set (Q2) adds the operator-facing surfaces — the reconciliation dashboard, the assignee directory, CSV export, asset editing, and duplicate-detection UX. The presentation-polish items — the design system, responsive UI, improved search, pagination and result counts, and empty states — are explicitly outside the MVP release and are deliverable in a later increment. This is a prioritisation judgement recorded at the scope stage, not a reopening of the approved decision set: the approved set remains the ceiling, and the intent backlog records the presentation-polish items as named follow-on items rather than as rejected scope.
- [assumption] The foundation-gated dependency structure (Q3) means the intent backlog's proto-Units cannot be delivered in an arbitrary order: the foundation workstream is a hard predecessor of everything else, and the four count-consuming surfaces form a second indivisible group. The backlog therefore records two grouping constraints that the inception stages' Unit DAG must respect, and the risk-first sequencing preference (Q4) determines the order within and across those constraints.
- [assumption] The actor-identity mechanism is a **blocking dependency of the foundation workstream** (Q6), not merely an open item. Because the actor column is part of the foundation's `audit_log` replacement, and because the feasibility assessment found the foundation workstream's size genuinely unresolved depending on the branch, no foundation work can be planned against an unresolved actor model. The backlog therefore records the mechanism as a named gate that precedes the foundation workstream, and the feasibility stage's candidate shortlist travels with it. The actor-trust *rule* remains fixed throughout and is not reopened: every audit entry derives its actor from trusted server-side context, and client-supplied identity is never trusted.
- [assumption] The risk-first sequencing preference (Q4) is applied to the intent backlog as a ranking heuristic. It does not require that every high-uncertainty item be fully resolved before any delivery begins; it requires that the highest-uncertainty items be sequenced early enough that the uncertainty is resolved before dependent work commits to them. Where a capability can proceed without the uncertain item being closed, it may proceed.
- [assumption] No capability is date-tied (Q5). The absence of a deadline is treated as an absence of a constraint on scope or sequencing, not as a licence to expand scope: the MVP release's content is bounded by the floor plus the must-have set from Q1 and Q2, and the risk-first sequencing preference is not a proxy for urgency.
- [assumption] The stakeholder summary is shared across all four groups with no primary audience (Q7), and prioritisation ties are decided by the intent's product owner directly. The tie-break mechanism is recorded rather than inferred from the earlier, unanswered question about relative stakeholder influence. The consequence for this stage is that the backlog's ranking ties are not resolved by this document; they are reserved to the product owner at the point the tie arises.
- [assumption] The treatment of uncovered POC behaviour (Q8) — preserve unless it contradicts an approved invariant — means the scope boundary is defined by the approved invariants rather than by a behaviour-by-behaviour audit of the POC. The intent backlog therefore records the three invariants that can retire POC behaviour — append-only audit history, the five exclusive status buckets, and the shared counting definition — and does not enumerate POC behaviours for retirement. The Stage 1 prohibition on modifying POC code, database, tests, or configuration remains in force and is unaffected by this answer, which governs the forward-looking release boundary only.
- [assumption] Three upstream items remain genuinely open and are carried into this stage rather than re-asked: I-01 / I-03 (whether an existing trusted authentication mechanism exists anywhere in the organisation, which determines the size of the actor-identity workstream and whether candidate B is viable), I-02 (whether a records-retention or disposal schedule applies to asset custody records), and I-04 (the unquoted licence cost that would make a buy position re-openable). None is settled by this stage's questions, and none is assumed resolved in either direction.
- [assumption] Organizational adoption readiness remains open (RAID R-02), and the confirmed position that it is unknown is carried unchanged. The scope decisions in this stage do not retire it: the MVP release is bounded by the floor and the must-have set, and the adoption risk — that teams continue using the spreadsheet — is a rollout risk rather than a scope-defect one.

[Answer]: A. Accept assumptions

## Consolidated Summary Confirmation

- Looks correct
- Request changes

[Answer]: Looks correct
