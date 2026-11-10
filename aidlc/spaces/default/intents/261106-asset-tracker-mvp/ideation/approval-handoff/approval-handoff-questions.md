# Approval & Handoff Questions — Asset Tracker MVP

Stage: `approval-handoff` (Ideation, 1.7)
Intent: `261106-asset-tracker-mvp`

## Sources

- [desc] Initial description: "Build the Asset Tracker MVP from the approved Asset Tracker MVP Development Workbook, the POC-vs-MVP gap analysis, the decision brief, and the fully approved 17-item decision set. The MVP adds actor-attributed append-only audit history, previous-holder preservation via last_assigned_to, lost-asset recovery (lost to in-stock), an assigned to discarded transition that resolves the assignment inline, five exclusive status buckets with Active Inventory and Total Records computed by one shared counting function and filter builder, case-insensitive category-scoped serial uniqueness via a functional index with a concurrency-safe application-level fallback, CSV export with formula-injection protection, and an amendment to workbook section 4.1 and section 21.1 Scenario 3 recording Returned as a distinct resting state."
- [scope] Workflow-selected scope: `feature`.
- [Q1] The primary customer is internal IT asset administrators who register, assign, and write off assets on behalf of the organisation.
- [Q2] The primary success measure is Audit Completeness — 100% of audit entries carry an actor attribution, and history is never destroyed.
- [Q3] The key stakeholders are all four identified groups: asset administrators, the finance function, IT leadership, and the end user holding the asset; what each cares about is accurate custody records and defensible write-offs, a demonstrable system, and clarity about what they hold.
- [Q4] Scope is fixed for this MVP; the approved decision set and the workbook define it, and changes require a new approval round.
- [Q5] Progress is reported to stakeholders as a periodic summary covering delivered scope and outstanding decisions.
- [Q6] The product boundary includes the operation phase; the workflow scope was changed from `mvp` to `feature`, which runs 33 of 33 stages with no stage skipped, and no completed stage was invalidated.
- [Q7] There is no fixed deadline and no separate budget for this MVP; it proceeds as ordinary engineering time, and the deployment target is a single internal host with a machine-local SQLite file.
- [memory:M2] `aidlc/spaces/default/memory/project.md#Decided`: "The fully approved 17-item Asset Tracker MVP decision set, together with the Asset Tracker MVP Development Workbook, is the binding technical and product contract for the `asset-tracker-mvp` intent; it is not reopened at any stage of that intent, and it carries seven standing conditions — the uniqueness check uses an IMMEDIATE transaction and a non-zero SQLite `busy_timeout` with `SQLITE_BUSY` mapped to a retryable error; the functional-index expression and the application-level comparison predicate use one shared definition; registration and serial/key updates enforce the same uniqueness policy; historical backfills preserve original records and audit traceability and report failures; dashboard, assignee, asset-list, and CSV counts use consistent filtering and counting definitions; every lifecycle transition has explicit validation and audit behaviour; and the existing 66/66 passing test baseline is preserved with regression tests added for newly approved behaviour. Traceability must be maintained between the approved MVP requirements and the POC requirements FR1.3, FR4.4, FR4.5, and FR5.3, and actor identity is resolved from trusted server-side context so actor information supplied in a write request is never trusted. (Stage intent-capture, 2026-11-06)"
- [memory:M3] `aidlc/spaces/default/memory/project.md#Decided`: "The decision set's amendment table names the workbook amendment surface as section 4.1 (transition table, recovery, `in-stock → lost`, `assigned → discarded`), section 4.2.5, section 4.3 (the actor-trust rule), section 4.4, section 6.1, section 6.4, section 6.5, section 9 (Screens 01, 02, 03, 04, 10), section 10, section 21.1, section 21.2, section 22, section 24 (the metric qualifiers the Audit Completeness population relies on), and the two new section 27 sections (Inventory Counting Definitions and Audit Action Vocabulary). The section 24 amendment carries the Audit Completeness qualifier verbatim: pre-MVP history is backfilled to a `system` actor and excluded from this metric. Section 4.1 records the `lost → in-stock` recovery transition with a required recovery reason drawn from the shared loss-reason vocabulary, and requires a distinct `recovered` audit action rather than `assign` or `return`, whose description names the recovery and the prior holder. It also records that complex recovery workflows — partial recovery, credit assignment, dispute handling — remain deferred, distinct from the single included recovery transition. The workbook's remaining MVP feature set is the reconciliation dashboard, the assignee directory, asset editing, duplicate-detection UX, empty states, result counts, pagination, improved search, responsive UI, and a design system. The design-system enumeration is indicative, not exhaustive: workbook section 11 is the authoritative source for the complete design-system requirements, covering semantic color tokens, a typography scale, spacing tokens, radius and shadow scales, iconography, and a light-theme implementation designed for future dark-theme extension. (Stage intent-capture, 2026-11-06)"
- [memory:M4] `aidlc/spaces/default/memory/project.md#Decided`: "The `assigned → discarded` transition resolves the assignment inline and records it: `assigned_to` is cleared, `last_assigned_to` is retained so the holder at discard time stays visible, and a `discarded` audit action records the discard, the prior holder, and the fact that the assignment was resolved by the discard. A discard reason is always required, drawn from the shared loss-reason vocabulary plus retirement-specific values. The asset row and its full history are never deleted; a discarded asset is excluded from Active Inventory but remains present in the `discarded` bucket and in Total Records, and stays accessible at its detail URL with its history intact. (Stage intent-capture, 2026-11-06)"

---

## What has already been established

The seven Ideation stages before this one have already settled most of what an
approval round would ask. They are recorded here so the questions below are asked
against facts rather than re-asking settled ground.

| Already settled | Where it was settled |
|---|---|
| The problem the initiative exists to solve: the POC destroys the previous holder on loss, overwrites custody history on reassignment, and destroys the audit trail on deletion | Intent capture |
| The success measure: Audit Completeness — 100% of audit entries carry an actor attribution, and 0 audit rows destroyed by any asset deletion | Intent capture |
| The approved decision set is the ceiling and is not reopened at any stage of this intent | Intent capture |
| The four stakeholder groups and the periodic summary cadence | Intent capture, stakeholder map |
| The market position: Build (extend the existing POC), not Buy; the differentiator is auditability, not features | Market research |
| All ten capability areas are feasible; two need a structural table rebuild, eight are additive | Feasibility assessment |
| The verdict is **Feasible**, with two qualifications: the migration runner is load-bearing and least-covered, and the design system is the largest unestimated body of work | Feasibility assessment |
| The release boundary: five operator must-haves, the audit-first floor, the lifecycle floor, the integrity/safety capabilities, and the workbook amendment surface | Scope definition |
| The five deferrals (design system, responsive UI, improved search, pagination and result counts, empty states) — deferred, not rejected, each with a pull-forward trigger | Scope definition, intent backlog |
| The ten proto-Units PB-00 through PB-09, ranked risk-first, with the two indivisible groups marked | Intent backlog |
| The topology: one developer plus named reviewers, a single-owner stream with a design-board checkpoint before the foundation, and no mob programme | Team formation |
| The capacity position: partially constrained, unquantified, expressed as an allocation rule rather than a number | Team formation |
| The eight screens and seven flows, drawn and reconciled against the approved §4.1 transition table | Rough mockups |

Three items remain genuinely open and are carried into this stage rather than
re-asked or silently closed: whether an existing trusted authentication mechanism
exists anywhere in the organisation (I-01 / I-03), whether a records-retention or
disposal schedule applies to asset custody records (I-02), and organisational
adoption readiness (R-02).

---

## Q1. Stakeholder agreement on the intent and the scope

The intent statement, the scope document, and the wireframes have been through six
Ideation stages, but no stakeholder group has yet been recorded as having confirmed
them. The stakeholder map names four groups — asset administrators, finance, IT
leadership, and asset holders — and the confirmed answer is that progress is
reported to them as a periodic summary rather than consulted at each stage.

How should this approval round treat stakeholder agreement?

- A. **The approval round is the agreement.** Approving this initiative records the
  intent and the scope as agreed, and the periodic summary carries them from here.
- B. **Consult the four groups before approving.** The intent statement and scope
  document go out to the stakeholder groups first, and their responses are recorded
  before this stage is approved.
- C. **Partially.** Some groups are consulted before approval and others are
  informed afterwards — specify which, and what each is asked to confirm.
- D. Not yet defined
- X. Other (please specify)

[Answer]: X. The Product Owner's approval in this round authorizes the intent and scope as the agreed project baseline. It does not represent or imply that all four stakeholder groups have independently reviewed or endorsed the documents. Asset administrators, Finance, IT leadership, and asset holders will receive the agreed periodic progress summary. Any material objection or proposed scope change raised by a stakeholder will be recorded and brought to the Product Owner for consideration through the established human approval process. No additional pre-approval consultation round is required.

## Q2. Critical risks and their mitigations

The RAID log holds sixteen open risks. None is closed. Three carry a named
mitigation that this release depends on: R-01 (the migration runner is the single
point of failure for both structural rebuilds and the least-covered area under
change), R-02 (organisational adoption readiness, which was preserved as an open
item at your direction), and R-15 (single-developer concentration). The remaining
risks are covered by the skill-gap remediation plan, the ADR obligation, and the
design-board checkpoint.

Does the risk position need to change before this initiative is approved?

- A. **Acknowledge as recorded.** The sixteen risks, their mitigations, and their
  named owners stand as they are, and the mitigation for the highest-uncertainty
  one — R-01 — is strengthened before the rebuilds land.
- B. **Acknowledge, but the initiative proceeds only once the mitigation lands.**
  No build work on the foundation starts until R-01's mitigation (a live-database
  test that rebuilds the assets table with existing rows and proves row-for-row
  preservation) is in place.
- C. **Escalate specific risks for a separate decision.** Name the risks that
  need a decision of their own rather than being carried into the release as
  mitigations.
- D. Not yet defined
- X. Other (please specify)

[Answer]: X. Acknowledge all sixteen risks as recorded, preserving their current open status, mitigations, and named ownership.

**R-01 — Migration runner:** Gate foundation implementation on demonstrated migration safety. Before either structural rebuild is applied, test the migration runner against a representative copy of the existing populated SQLite database. The test must demonstrate successful assets-table rebuilding, row-for-row preservation of existing asset data, preservation of audit history, and successful migration completion. Do not use the live operational database as the test target. Record the test evidence before proceeding with the foundation migrations.

**R-02 — Organisational adoption readiness:** Keep this risk open. Resolve adoption readiness through the established stakeholder process before operational readiness is accepted. Do not assume adoption risk is low or resolved.

**R-15 — Single-developer concentration:** Retain the documented ADR practice and mandatory design-board checkpoint before foundation implementation. Use stakeholder and specialist consultation where needed, without introducing a second implementation author or assuming uncommitted external support.

All remaining risks retain their existing status, owners, and recorded mitigations. Approval of this initiative does not mean that the sixteen risks are closed or that their mitigations have already been completed.

## Q3. Budget and resource commitment

There is no separate budget and no fixed deadline: the MVP is paced as ordinary
engineering time on one developer who has other commitments, with no quantified
capacity figure committed. The build-vs-buy evaluation's total-cost row is
indeterminate because no licence was quoted (I-04), and the Build position holds
on other grounds.

What commitment is being made here?

- A. **No new resource commitment.** The MVP proceeds on existing capacity, with
  the actor-identity resolution and the design-board checkpoint taking precedence
  over every other item in the queue, and no date or throughput figure committed.
- B. **A commitment of named reviewer time.** The reviewer participation at the
  three defined points — the actor-mechanism decision, the operational-readiness
  sign-off, and the internal-reviewer demonstration — is committed by the people
  concerned, with their names recorded.
- C. **A commitment of capacity.** A specific amount of developer time per period
  is made available, which converts the capacity position from an allocation rule
  into a figure.
- D. Not yet defined
- X. Other (please specify)

[Answer]: A. No new resource commitment.

## Q4. Whether the rough mockups reflect the shared vision

Eight screens (W1–W8) and seven flows (F1–F6, plus F5h) have been drawn, with the
lifecycle map reconciled edge-by-edge against the approved §4.1 transition table
— ten approved edges, eight drawn, two deliberately omitted with their approved
standing intact. The wireframes carry a WCAG 2.1 AA floor that no upstream
artifact names, and the actor indicator is drawn read-only and marked provisional.

Do the rough mockups reflect the shared vision?

- A. **Yes.** The screens and flows are accepted as the concept the stakeholders
  review, and the two omitted discard edges and the WCAG floor are accepted as
  recorded.
- B. **Yes, with one change.** The screens and flows are accepted except for a
  named part that is to be revised before the next stage.
- C. **Not yet.** The concept is to be shown to the stakeholder groups and their
  feedback gathered before it is accepted.
- D. Not yet defined
- X. Other (please specify)

[Answer]: X. Yes. The eight screens and documented flows are accepted as the Product Owner-approved concept and reflect the approved intent, scope, and design decisions. The two deliberately omitted discard transitions retain their approved standing and remain tracked as Q19 for the Scope stage. WCAG 2.1 AA is accepted as the design floor established during Rough Mockups. The actor indicator remains a provisional presentation element, not a decision on the actor-identity mechanism. This acceptance does not claim independent endorsement by all four stakeholder groups; their periodic progress summaries and feedback remain part of the stakeholder process.

## Q5. Whether the market research supports the investment

The competitive analysis concludes that the incumbent is a spreadsheet-and-email
process, that roughly 35–40% of the foundational work already exists in the POC,
and that the differentiator is auditability — nine properties, each an
architectural invariant, a domain rule, or a consistency-by-construction guarantee
— rather than feature count. The four off-the-shelf alternatives are recorded at
**Hypothesis** confidence only, because no vendor survey was performed. The
Build position is taken; the licence cost is indeterminate.

Does the market research support the investment?

- A. **Yes.** The Build position stands on the capability and auditability grounds
  recorded, and the hypothesis-confidence off-the-shelf comparison is accepted as
  a recorded uncertainty rather than a resolved finding.
- B. **Yes, but a vendor survey is commissioned first** — the off-the-shelf
  comparison is to be verified before the Inception phase begins, because the
  comparison currently rests on hypotheses rather than on a survey.
- C. **The research is sufficient for the intent but not for the mechanism
  decision.** The Build position is accepted for the MVP release, while the
  actor-identity mechanism (PB-00) additionally requires the internal
  existing-tool inventory (I-03) before it can be decided.
- D. Not yet defined
- X. Other (please specify)

[Answer]: A. Yes, as recorded.

## Q6. Whether the working groups are staffed and scheduled

The confirmed topology is a single-owner stream with a design-board checkpoint
before the foundation — not a mob programme, which the confirmed answers rule out
on the facts of one person, one location, and no working overlap. The six working
groups (PB-00 through PB-09, with the two indivisible groups intact) each have
one developer; the reviewers are event-driven and advisory. Stakeholder
availability is an open dependency, and no schedule has been committed.

Are the working groups staffed and scheduled?

- A. **Staffed, and scheduled by dependency order.** The groups are staffed as
  recorded — one developer, with reviewers at three defined points — and the
  order is the risk-first sequence: actor decision, design board, foundation,
  lifecycle, count-consistency group, remaining must-haves, cross-cutting work.
- B. **Staffed, and the schedule is gated on stakeholder availability.**
  Availability and expected response times are confirmed before the foundation's
  schedule is committed, and the schedule extends rather than reorders if
  capacity is consumed elsewhere.
- C. **Not staffed yet.** The reviewer individuals are not yet named, and the
  groups cannot be considered staffed until they are.
- D. Not yet defined
- X. Other (please specify)

[Answer]: A. Staffed, and scheduled by dependency order.

## Q7. The blocking dependency on the actor-identity decision

I-01 — whether a trusted authentication mechanism exists anywhere in the
organisation — is a blocking dependency of the foundation workstream (PB-01),
which blocks every downstream group. It cannot be closed by the team working
harder; it needs an answer from outside. The confirmed position is to sequence
the resolution forward: I-01 is the first action of the Inception stages, the
actor decision (PB-00) is the first deliverable, and no foundation work is
planned until it is answered.

How should this dependency be carried into Inception?

- A. **As the first Inception action.** I-01 is resolved first, PB-00 is decided
  against the four-candidate shortlist, and the design board reviews the
  foundation's design before any foundation work is built.
- B. **As the first Inception action, with the actor-independent work specified in
  parallel.** The shared counting definition's specification, the CSV export's
  formula-injection contract, and the workbook amendment surface proceed while
  I-01 is open, because none of them depends on the actor model.
- C. **As a gate on the whole phase.** No Inception-stage work starts until I-01
  is answered.
- D. Not yet defined
- X. Other (please specify)

[Answer]: B. As the first Inception action, with the actor-independent work specified in parallel.

## Assumption Confirmation
The following assumptions are carried into the initiative brief and the decision
log. Confirm them, or convert them to follow-up questions.

- [assumption] The approved decision set and the Asset Tracker MVP Development Workbook remain the binding technical and product contract for this intent. This stage does not reopen them, and the seven standing conditions they carry are treated as release requirements rather than as suggestions.
- [assumption] The release boundary recorded in the scope document is the release contents, and the five deferrals (design system, responsive UI, improved search, pagination and result counts, empty states) are deferred rather than rejected — each keeps its approved standing and carries a named pull-forward trigger.
- [assumption] The three open items ride with the release unchanged: I-01 / I-03 (whether a trusted authentication mechanism exists anywhere in the organisation), I-02 (whether a records-retention or disposal schedule applies to asset custody records), and I-04 (the unquoted licence cost). None is assumed resolved in either direction by this approval.
- [assumption] Organisational adoption readiness (R-02) remains open at the human's direction. It is a rollout risk, not a scope defect, and no scope or priority decision retires it.
- [assumption] The ten proto-Units and their risk-first ordering are the release's delivery shape. The two indivisible groups — the foundation workstream and the count-consistency group — are delivered whole and are never split across increments.
- [assumption] The capacity position is an allocation rule rather than a figure: the actor-identity resolution and the design-board checkpoint take precedence over every other item in the queue, and no date, throughput, or effort figure is committed by this approval.
- [assumption] The reviewer constituency is recorded by constituency rather than by individual, because the confirmed team-formation answer names IT leadership, finance, and operations without naming the people. The specific individuals must be named before the first review point is scheduled, and until then the groups are staffed but not scheduled.
- [assumption] The off-the-shelf comparison in the market research remains at hypothesis confidence. It is recorded as an uncertainty in the initiative brief, not presented as a surveyed finding, and the Build position rests on the capability and auditability grounds rather than on that comparison.
- [assumption] The rough mockups are the concept the stakeholders review, with the actor indicator drawn read-only and marked provisional. If PB-00 selects the operator-selection candidate, the indicator becomes interactive and the wireframes change; that consequence is recorded rather than pre-empted.
- [assumption] The two omitted discard edges — `in-stock → discarded` and `returned → discarded` — keep their approved standing and are not withdrawn, reclassified, or deferred by this stage. The release-boundary question they raise was carried to the scope stage as a named open question and remains one.
- [assumption] The existing 66/66 passing test baseline is a merge gate the release preserves, and the absence of any CI workflow is an inherited obligation the build-and-test stage owns rather than a skill gap the current team cannot cover.
- [assumption] The design system remains the largest single body of unestimated work in the initiative and is deferred from this release, with its estimate retired early under the risk-first heuristic. It is not a release deliverable and no later stage may read it as one.
- [assumption] The single-developer concentration risk is accepted with its mitigation — the architectural decisions recorded as ADRs and the design-board checkpoint before the foundation — rather than by adding a second author. The confirmed answers are explicit that the reviewers are not authors.
- [assumption] The initiative brief and the decision log present the Ideation phase's conclusions as they stand. This stage does not open new technical questions, and any issue it surfaces that needs a decision is recorded as an open item rather than resolved here.

[Answer]: A. Accept assumptions

## Consolidated Summary Confirmation

- Looks correct
- Request changes

[Answer]: Looks correct
