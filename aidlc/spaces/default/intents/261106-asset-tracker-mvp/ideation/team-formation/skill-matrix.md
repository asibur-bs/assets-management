# Skill Matrix — Asset Tracker MVP

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

## Purpose and Scope of This Matrix

This matrix records the skills the Asset Tracker MVP's work actually requires, whether the
team has them, and — where the coverage is not obvious — what closes the difference.

It covers the **skill gap analysis and the skill gap remediation plan**. The team
availability, capacity allocation, and RACI material lives in **team-assessment.md**;
the working-group composition lives in **mob-composition.md**.

The matrix is deliberately **not** a competency assessment of a person. It is an
assessment of the work. Each row names a skill the release needs, ties it to the
proto-Unit that consumes it, and states the coverage position. Where the coverage is
partial, the row names the closing mechanism — and because the confirmed answer is that
no standing skill gap is accepted as unresolved, every partial row carries a named
remediation with a trigger.

## The Skill Coverage Position

The confirmed position on skills is a **policy**, not a measurement: the developer covers
the build skills, and a genuine gap — a skill the work needs and nobody on the team has
— is handled by researching it, consulting outside the team, or bringing in specialist
help at that point [Q3]. **No standing skill gap is accepted as unresolved.**

Two consequences shape the matrix below.

**The matrix is scoped to the release's actual contents.** The design system is
**deferred from the MVP release** by the scope stage, so a design-skill gap is recorded
as a gap in the *deferred increment*, not as a gap in the MVP release. The design
system's authoritative requirement is a workbook section rather than an implementation,
and it is the largest single body of unestimated work in the initiative. The operational
skill areas — backup-and-restore, observability, CI — are, by contrast, **inside** the
release, because the workflow scope is `feature` and the product boundary explicitly
includes the operation phase.

**Every remediation is event-triggered.** The confirmed position names three closing
mechanisms — research, consultation outside the team, and specialist help — and none of
them is a standing arrangement. The matrix therefore does not commit the team to
acquiring a skill in advance of the work that needs it. It commits the team to closing
the gap *before* the work that depends on it lands, which is what "no standing skill gap
is accepted as unresolved" means in practice.

## The Skill Matrix

Coverage is stated as: **Covered** (the team holds the skill), **Partial** (the skill is
held but the depth needed for a specific requirement is not established), or **Gap**
(the skill is not held by anyone on the team).

### A. The build skills the release needs

| # | Skill | Consumed by | Coverage | Basis and notes |
|---|---|---|---|---|
| **A1** | **Node.js and Express application development** | PB-01, PB-03, PB-04, PB-05, PB-06 | **Covered** | The developer holds the full POC context: Node.js v20.20.0, Express 4.21, EJS 3.1. No ramp-up cost on the existing codebase |
| **A2** | **SQLite schema design and migration** | PB-01, PB-02 | **Covered, with a named weakness** | The create-copy-drop-rename path for the `assets` rebuild is already proven against this exact SQLite version (3.49.2) and this exact migration runner. The weakness is not the skill but its *coverage* — the runner is the least-covered of the three areas under change, which is R-01. Handled by the remediation in C1, not by acquiring a skill |
| **A3** | **Functional-index and SQLite constraint work** | PB-01, PB-05, PB-06 | **Covered** | Functional-index support is verified in the baseline. The technical requirement is one shared definition used by both the functional-index expression and the application-level comparison predicate [memory:M2] — a design discipline within an existing skill |
| **A4** | **Concurrency handling in a synchronous SQLite driver** | PB-01, PB-05 | **Covered, with a named weakness** | better-sqlite3 11.10.0 with a non-zero default `busy_timeout` of 5000. The skill is held; the *error-mapping* discipline is the gap — `SQLITE_BUSY` is currently not distinguished from a genuine duplicate (R-06). Handled by C2 |
| **A5** | **Repository-layer data access** | PB-01, PB-03, PB-05 | **Covered, with a named weakness** | The `assets` repository's update path writes every column unconditionally, so a partial update that omits a column will clear it (R-03). The skill is held; the path is incorrect. Handled by C3 |
| **A6** | **EJS view development** | PB-04 | **Covered** | EJS 3.1 against the POC's existing views |
| **A7** | **Audit-history and lifecycle domain modelling** | PB-01, PB-03 | **Covered** | The domain semantics — five exclusive buckets, the transition table, the audit action vocabulary — are specified by the approved decision set and the workbook. The task is implementation against a fixed specification, not discovery |
| **A8** | **CSV generation with formula-injection sanitisation** | PB-04 | **Partial** | The CSV generation itself is ordinary. The sanitisation discipline — neutralising a leading `=`, `+`, `-`, or `@` in every cell — is a specific and easily-forgotten technique (R-14), and it is a correctness property rather than a formatting preference. Remediated by C4 |

### B. The operational skills the release needs

These are inside the release because the workflow scope is `feature` and the operation
phase is in scope. They are the part of the skill matrix most likely to be underestimated,
because the work is delivered by one developer whose instinct is to build rather than to
operate.

| # | Skill | Consumed by | Coverage | Basis and notes |
|---|---|---|---|---|
| **B1** | **Backup-and-restore procedure design** | PB-08 | **Gap** | The MVP's central promise is that history is never destroyed, and the entire system of record is one un-replicated file in a gitignored `data/` directory. A backup procedure that is written but never rehearsed is not a backup. This is the highest-value operational item in the release. Remediated by C5 |
| **B2** | **Backup-and-restore rehearsal** | PB-08 | **Gap** | Distinct from B1 and separable from it: designing a procedure and *exercising* it are different skills, and the standing requirement is for the exercise. Remediated by C6 |
| **B3** | **Application-level observability** | PB-08 | **Partial** | The POC emits one startup line to stdout. The audit trail is the natural health and activity signal, and it is an application-level asset rather than an infrastructure one. The partial is in instrumentation and signal design, not in the platform. Remediated by C7 |
| **B4** | **CI pipeline authoring** | PB-09, and the merge gate for every other item | **Gap** | Verified: no CI workflow exists, and no cloud or container posture exists to host one. This is a pre-existing gap the MVP inherits rather than creates, and without it the scope's coverage floor and merge gate are unverifiable (R-16). Remediated by C8 |
| **B5** | **Release and deployment procedure** | PB-08 | **Partial** | The POC already exposes `PORT` and `DB_PATH` environment overrides, so the process is parameterisable without a code change. The partial is in the deployment-and-rollback procedure itself, including the rollback steps the operation phase requires. Remediated by C9 |
| **B6** | **Incident response and runbook authorship** | PB-08 | **Gap** | The operation phase requires runbooks with escalation paths. Remediated by C10 |
| **B7** | **Performance validation against the medium scale** | PB-08 | **Partial** | The confirmed scale is hundreds to low thousands of assets across several internal teams, well inside single-instance capacity. The partial is that the target has not been load-tested at the upper end of that scale. Remediated by C11 |

### C. The skills the deferred increment needs — recorded, not in the release

| # | Skill | Consumed by | Coverage | Basis and notes |
|---|---|---|---|---|
| **C1** | **Design-system authoring** | C-01 (deferred) | **Partial** | The design system is deferred from the MVP release. Its authoritative requirement is a workbook section covering semantic colour tokens, a typography scale, spacing tokens, radius and shadow scales, iconography, and a light theme designed for dark-theme extension, with the enumeration indicative rather than exhaustive [memory:M3]. Roughly 30 components against a 40-line stylesheet with no CSS custom properties and no breakpoints. The partial is in design-system craft and token architecture, and it is a gap **in a deferred increment**, not a gap in the MVP release. External help is available if needed but not committed [Q8]. Remediated by C12 |
| **C2** | **Responsive front-end implementation** | C-02 (deferred) | **Partial** | Deferred with the design system, because a responsive surface built on an ad-hoc stylesheet is re-worked when the tokens land. It depends on C-01's breakpoints and spacing tokens |
| **C3** | **Search and result-pagination UX** | C-03, C-04 (deferred) | **Covered** | The POC's list view already provides search. The MVP release keeps the existing search. Pagination and result counts are deferred, and the shared counting function and filter builder they need are already inside the release |

### D. The skills the reviewers and advisors contribute

These are not build skills and the team does not need to acquire them — they are the
reasons the reviewer constituency exists. They are listed because a skill matrix that
only covers the author hides the fact that the release's acceptance depends on judgement
the author does not hold alone.

| # | Skill | Held by | Why it is on the team |
|---|---|---|---|
| **D1** | **Custody defensibility judgement** | The internal reviewer | The internal reviewer must be able to demonstrate that the custody record is defensible. This is the acceptance criterion the whole audit effort serves, and it is not a self-assessment |
| **D2** | **Write-off and finance defensibility** | Finance | The `assigned → discarded` transition and the audit history that supports it must satisfy a write-off defensibility standard. Finance's concern applies at the review points where it is consulted [Q9] |
| **D3** | **Operational readiness judgement** | Operations and IT leadership | The operation phase's obligations — the exercised backup, the observability, the incident response — are signed off by people who are accountable for the running service, not by the person who built it |
| **D4** | **Records-retention and disposal knowledge** | Compliance | I-02 asks whether an internal records-retention or disposal schedule applies to asset custody records. This is a compliance knowledge question, and the RAID log assigns it to Compliance |

## The Gap Analysis

Reading the matrix as a whole, the pattern is clear and it is worth stating plainly
rather than leaving it implicit in the table.

**The build skills are covered. The operational skills are where the gaps are.** Every
gap — B1, B2, B4, B6, and the partials B3, B5, B7 — sits in the operation phase, which
is inside the release because the workflow scope is `feature`. This is not a coincidence
of the roster; it is the consequence of the workload being dominated by schema and
lifecycle work that a full-context developer is well equipped to do, while the
operational discipline is a different kind of work.

**The deferred design-system gap is real but correctly placed.** C-01's partial coverage
is recorded against the deferred increment, where it belongs. It is not counted against
the MVP release's skill position, and it does not block the release.

**The single largest unestimated body of work is outside the release.** The design
system's estimate is retired early under the risk-first heuristic even though the
delivery is deferred — because the gap analysis's estimate is explicitly conditional on
scoping that workstream. That is an estimation task, not a delivery task, and it is the
one place where outside help is most plausibly needed [Q8].

**No gap is a blocker on the foundation.** Every gap in the matrix sits downstream of the
foundation, in the operation phase or the deferred increment. The foundation's needs —
migration work, schema rebuild, repository corrections — are covered skills with correctable
weaknesses. This matters because the foundation is where the actor-identity block bites,
and a skill gap there would compound the delay rather than sit beside it.

## The Skill Gap Remediation Plan

Each remediation closes a specific gap, and each has a **trigger** — the point at which
the gap becomes a team's problem — and a **closing mechanism**, which is one of the
three the confirmed position names: research, consultation outside the team, or
specialist help [Q3].

| # | Gap or partial | Trigger — when it must be closed | Closing mechanism | Who |
|---|---|---|---|---|
| **R1** | **A2 — the migration runner's coverage** | Before the structural rebuilds land. The runner is the single point of failure for both the `assets` table rebuild and the `audit_log` replacement, and the rebuild path is exercised only once in this codebase | **Research, then code.** Strengthen the runner's test coverage; require a live-database test that rebuilds `assets` with existing rows and proves row-for-row preservation | Developer, in the Architect role for R-01 |
| **R2** | **A4 — the `SQLITE_BUSY` / duplicate error mapping** | Before the uniqueness check ships on either the registration path or the edit path | **Code.** Map the two error paths distinctly in the repository layer and cover both: one retries, the other reports a duplicate | Developer, in the Developer role for R-06 |
| **R3** | **A5 — the unconditional update path** | Before the discard transition lands, because the discard resolves the assignment inline | **Code.** Make the update path explicit about which columns it writes, so `last_assigned_to` retention and `assigned_to` clearing during a discard are deliberate rather than incidental. Add regression tests covering both | Developer, in the Developer role for R-03 |
| **R4** | **A8 — CSV formula-injection sanitisation** | Before the CSV export ships. The export is one of the four count-consuming surfaces and sits inside the indivisible count-consistency group | **Research, then code.** The technique is narrow and well documented; cover it with tests asserting a leading `=`, `+`, `-`, and `@` are neutralised | Developer, in the Developer role for R-14 |
| **R5** | **B1 — backup-and-restore procedure design** | Before the operation phase's durability sign-off | **Research, with specialist help if needed.** The external-help answer records the operational backup procedure as one of the two most plausible areas for outside help [Q8]. The procedure must specify what is backed up, how, where, and on what cadence | Developer, with Operations; specialist help if the research does not close it |
| **R6** | **B2 — backup-and-restore rehearsal** | Before the operational-readiness sign-off, and explicitly *after* R5 — designing the procedure is not exercising it | **Code and operation.** Rehearse a restore against a copy of the live database. A restore that has not been rehearsed is not a backup | Developer, with Operations |
| **R7** | **B3 — application-level observability** | Before the operational-readiness sign-off | **Research, then code.** The audit trail is the natural health and activity signal and is an application-level asset. Define what is emitted, at what level, and what constitutes the health metric and the error-rate metric the operation phase requires | Developer |
| **R8** | **B4 — CI pipeline authoring** | Before the merge gate is claimed for any Unit. Without CI the 66/66 baseline is verified only when someone remembers to run it, and the scope's coverage floor is unverifiable | **Research, then code.** No CI workflow and no cloud or container posture exist, so the pipeline must be authored against whatever the estate permits. This is a pre-existing gap the build-and-test stage owns | Quality engineer, in the Quality role for R-16, with the Developer |
| **R9** | **B5 — deployment and rollback procedure** | Before the operation phase's deployment step | **Research, then code.** The process is already parameterisable via `PORT` and `DB_PATH`; the procedure must add the rollback steps and the smoke test the operation phase requires | Developer, with Operations |
| **R10** | **B6 — incident response and runbooks** | Before the operation phase's incident-response step | **Research.** Escalation paths and contact information cannot be inferred from the codebase; they come from the organisation | Developer, with Operations and IT leadership |
| **R11** | **B7 — performance validation** | Before the operational-readiness sign-off | **Code and measurement.** Validate against the upper end of the confirmed medium scale. A scale finding would reopen the deployment-target question, which is a scope-level matter requiring a new approval round | Developer, with Quality |
| **R12** | **C1 — design-system craft and token architecture** | **Not triggered inside this release.** C-01 is deferred. Its trigger is the start of the deferred increment, at which point it becomes the first item pulled forward | **Specialist help is the plausible route.** The design system is the second most plausible area for outside help [Q8], and the workbook's enumeration is indicative rather than exhaustive, so workbook section 11 is the authoritative requirement and the work must not be built from the indicative list | Developer, with the Designer role for R-04 |
| **R13** | **D4 — records-retention knowledge** | Triggered by I-02's being asked, in parallel with I-01 | **Consultation outside the team.** Compliance holds this knowledge and the RAID log already assigns I-02 to Compliance | Product owner, with Compliance |

### The remediation rule

The rule the confirmed position establishes is **escalate or research**, and the matrix
operationalises it with one addition: **the trigger, not the calendar.** A gap is
closed when the work that depends on it arrives, not before. This is consistent with the
risk-first sequencing the backlog applies to capabilities, and it is the only form of the
rule that is compatible with a partially-constrained capacity and an unquantified
delivery schedule.

It has one hard boundary. **The actor-identity block is not a skill gap and is not
remediated by any of these mechanisms.** The gap in the actor mechanism is a missing
*answer* from the organisation, not a missing *skill*. I-01 is resolved by gathering the
internal existing-tool inventory and establishing whether a trusted authentication
mechanism is reachable — and until it is answered, no foundation work is planned.

## Assumptions & Open Questions

- [assumption] The skill-gap position in the confirmed Q3 answer is recorded against the work the release actually contains. The design system is deferred from the MVP release by the scope stage, so a design-skill gap is recorded as a gap in the deferred increment rather than as a gap in the MVP release — while the operational skill areas (backup-and-restore, observability, CI) are inside the release because the operation phase is in scope.
- [assumption] The remediation mechanism for each gap is drawn from the three the confirmed Q3 answer names — research, consultation outside the team, or specialist help — and the trigger for each gap is the arrival of the work that depends on it, not a calendar date. The confirmed position that no standing skill gap is accepted as unresolved is carried forward as a rule about closing gaps before dependent work lands, not as a commitment to acquire skills in advance of need.
- [assumption] The absence of CI is recorded as an inherited obligation that the build-and-test stage owns, and the 66/66 baseline as a merge gate, rather than as skill gaps the current team cannot cover. A pre-existing estate gap that the workflow's own stages own is not a roster gap, and recording it as one would misattribute it.
- [assumption] The partial coverage recorded for the design system and the responsive UI reflects the position that workbook section 11 is the authoritative requirement and the enumeration elsewhere is indicative. The skill assessment is therefore against the specification, not against the shorter list. (memory:M3)
- [assumption] The reader of this matrix is assumed to understand that the skill coverage of the operational areas is thin because the workload is dominated by schema and lifecycle work. This is recorded as a finding about the workload's shape rather than as a finding about the developer's competence, which the upstream stages confirmed positively.
- [assumption] The reviewer constituencies' skills — custody defensibility, write-off defensibility, operational readiness, and records-retention knowledge — are recorded as held by named reviewer roles and not as gaps the team must close. No remediation is planned for them, and the confirmed Q1 answer records that the reviewers are not authors.

## Sources Consumed

- **scope-document** (`aidlc/spaces/default/intents/261106-asset-tracker-mvp/ideation/scope-definition/scope-document.md`) — the release contents that determine which skills the release needs, the deferral of the design system and the responsive UI, and the delivery constraints including the operation phase's scope.
- **intent-backlog** (`aidlc/spaces/default/intents/261106-asset-tracker-mvp/ideation/scope-definition/intent-backlog.md`) — the proto-Units that consume each skill, the deferred set C-01 through C-05, the risk-first ordering, and the sequencing note on the design-system estimate.
- **feasibility-assessment** (`aidlc/spaces/default/intents/261106-asset-tracker-mvp/ideation/feasibility/feasibility-assessment.md`) — the verified technical baseline the build skills rest on, the two qualifications, the actor-trust candidate shortlist, and the operational consequences of the single-host deployment target.
- **constraint-register** (`aidlc/spaces/default/intents/261106-asset-tracker-mvp/ideation/feasibility/constraint-register.md`) — the technical, deployment, and data constraints that bound the operational skills.
- **raid-log** (`aidlc/spaces/default/intents/261106-asset-tracker-mvp/ideation/feasibility/raid-log.md`) — the risks whose mitigations are the named remediation targets, and the named RAID owners carried into the remediation plan.
- **team-assessment** (`aidlc/spaces/default/intents/261106-asset-tracker-mvp/ideation/team-formation/team-assessment.md`) — the roster, capacity, RACI, and inherited obligations this matrix's coverage statements rest on.
- **team-formation-questions** (`aidlc/spaces/default/intents/261106-asset-tracker-mvp/ideation/team-formation/team-formation-questions.md`) — the nine confirmed team-formation answers and the nine accepted assumptions.

## Review

Reserved for the reviewer at the approval gate.
