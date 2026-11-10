# Market Trends Report — Asset Tracker MVP

## Sources

- [desc] Initial description: "Build the Asset Tracker MVP from the approved Asset Tracker MVP Development Workbook, the POC-vs-MVP gap analysis, the decision brief, and the fully approved 17-item decision set. The MVP adds actor-attributed append-only audit history, previous-holder preservation via last_assigned_to, lost-asset recovery (lost to in-stock), an assigned to discarded transition that resolves the assignment inline, five exclusive status buckets with Active Inventory and Total Records computed by one shared counting function and filter builder, case-insensitive category-scoped serial uniqueness via a functional index with a concurrency-safe application-level fallback, CSV export with formula-injection protection, and an amendment to workbook section 4.1 and section 21.1 Scenario 3 recording Returned as a distinct resting state."
- [scope] Workflow-selected scope: `feature`.
- [Q4] Auditability — an actor-attributed, append-only, never-destroyed history with defensible write-offs — is the MVP's primary differentiator; everything else is table-stakes.
- [Q6] There is no specific external driver; the driver is operational efficiency and the absence of a system of record.
- [Q7] The realistic scale is medium — several internal teams (IT, HR, Finance, Operations) sharing a single record, hundreds to low thousands of assets.
- [Q8] The competitive analysis and build-vs-buy assessment are grounded in the approved upstream artifacts plus internal input — a stakeholder or existing-tool inventory of what is actually in use at the organisation.
- [memory:M2] `aidlc/spaces/default/memory/project.md#Decided`: "The fully approved 17-item Asset Tracker MVP decision set, together with the Asset Tracker MVP Development Workbook, is the binding technical and product contract for the `asset-tracker-mvp` intent; it is not reopened at any stage of that intent, and it carries seven standing conditions — the uniqueness check uses an IMMEDIATE transaction and a non-zero SQLite `busy_timeout` with `SQLITE_BUSY` mapped to a retryable error; the functional-index expression and the application-level comparison predicate use one shared definition; registration and serial/key updates enforce the same uniqueness policy; historical backfills preserve original records and audit traceability and report failures; dashboard, assignee, asset-list, and CSV counts use consistent filtering and counting definitions; every lifecycle transition has explicit validation and audit behaviour; and the existing 66/66 passing test baseline is preserved with regression tests added for newly approved behaviour. Traceability must be maintained between the approved MVP requirements and the POC requirements FR1.3, FR4.4, FR4.5, and FR5.3, and actor identity is resolved from trusted server-side context so actor information supplied in a write request is never trusted. (Stage intent-capture, 2026-11-06)"

## Scope of This Report

This report is derived from the upstream `intent-statement` artifact produced by the
intent-capture stage (`aidlc/spaces/default/intents/261106-asset-tracker-mvp/ideation/intent-capture/intent-statement.md`),
whose initiative trigger, success metric, and confirmed scope bounds are the premise throughout.

The Asset Tracker is an internal IT tool with no external market positioning. A conventional
trends report — market growth rates, analyst positioning, regulatory calendars — does not apply
to it, and inventing one would produce exactly the kind of speculation the ideation phase's
evidence standard forbids.

What does apply is a report on **the trends that bear on this system's design and sequencing**:
the operational trends visible in the organisation's own evidence, and the technology
directions the approved technical contract has already committed to. Every trend below is
grounded either in the approved upstream artifacts or in the verified POC baseline. Where a
trend would normally require external market data, this report says so explicitly rather than
substituting an unsourced figure.

A note on the pressure picture: there is **no regulatory deadline and no external driver**
creating urgency [Q6]. The driver is operational efficiency and the absence of a system of
record. That is a materially different trend environment from a compliance-driven initiative,
and it has direct consequences for sequencing.

## Trend 1 — Auditability as an organisational expectation, not a compliance obligation

The dominant trend visible in this organisation's own material is the movement of "who had this
asset" from a question asked occasionally to a property expected of the system at all times.

The evidence is the approved decision set itself. The decision set's substance is not a feature
list; it is a set of invariants about accountability — actor attribution on every entry,
append-only history, history never destroyed, previous-holder preservation, defensible
write-offs. That the organisation invested an approval round in specifying *the exact semantics
of a `recovered` audit action*, or that a `discarded` audit action must record "the fact that
the assignment was resolved by the discard", is the clearest possible evidence that
accountability semantics are being treated as a first-class product requirement rather than an
implementation detail.

**But the driver is internal, not external** [Q6]. This matters for the trend's read:

| If the driver were external compliance | If the driver is internal efficiency (the actual case) |
|---|---|
| A deadline would fix the sequencing | The sequencing is set by the organisation's own priorities |
| Requirements would be scoped by the auditor's checklist | Requirements are scoped by what accountability actually demands |
| Audit depth would be a compliance floor | Audit depth is a **design standard** — the differentiator the product is chosen for [Q4] |

The practical consequence: **auditability is a design standard here, not a compliance floor.**
It must be delivered exactly — an append-only audit table, an actor on every entry, a discard
that resolves its assignment inline — because that exactness is the product's reason to exist.
It must also be *demonstrable*, because it is the claim being made to users who could otherwise
keep using a spreadsheet. The Audit Completeness metric — 100% of audit entries carrying an
actor attribution, and 0 audit rows destroyed by any asset deletion — is therefore the right
primary measure: it is the organisation's own articulation of the differentiator, and it is
checkable by the users it is meant to convince.

A design consequence follows that is easy to miss: because auditability is the differentiator
rather than a compliance checkbox, the history view is a **primary interface**, not a debugging
affordance. The per-asset history view is already table-stakes [Q3], but the *quality* of that
view — actor attribution visible, prior holder visible, the reason visible — is where the
differentiator reaches the user.

## Trend 2 — Lifecycle completeness as the antidote to spreadsheet workarounds

The second trend is the move from partial lifecycle tracking toward complete lifecycle
tracking, driven by the specific workarounds spreadsheets force.

The verified POC evidence shows the workaround pattern directly. The POC supports four
statuses and a fixed transition map; the `in-stock → lost` transition does not exist in it at
all, and the MVP workbook §4.1 proposes it. A tool that cannot express "this asset was lost"
forces the administrator to record loss as a note, or to leave the asset sitting in `assigned`
forever with a comment. Both are workarounds that make the record wrong.

The approved decision set closes the gap deliberately, and the shape of the closure is
instructive:

- `returned` becomes a **distinct resting state** rather than collapsing to `in-stock` —
  because an asset that came back is in a materially different condition from one that was
  never issued.
- A single `lost → in-stock` recovery transition is included, with a required recovery reason.
- An `assigned → discarded` transition resolves the assignment **inline**: `assigned_to` is
  cleared, `last_assigned_to` is retained, and the `discarded` audit action records the discard,
  the prior holder, and the fact that the assignment was resolved by the discard.
- Complex recovery workflows — partial recovery, credit assignment, dispute handling — remain
  **deferred**, explicitly distinct from the single included recovery transition.

That last point is the trend's discipline made visible: complete-lifecycle tracking is the
direction, but completeness is applied at the level of *states and transitions*, not at the
level of *business workflows*. The deferral is recorded rather than left implicit, which is what
keeps the transition table complete and testable.

The trend's design consequence: the transition table is the product's core model, and every
transition needs explicit validation and audit behaviour. A transition that exists without a
defined audit action is an incomplete transition, and the vocabulary of audit actions is a
first-class artifact — which is why the approved amendment surface adds a new section 27 for
the Audit Action Vocabulary and another for Inventory Counting Definitions.

## Trend 3 — Count consistency as a trust prerequisite, moving from "a number" to "the number"

The third trend is the shift from producing counts to guaranteeing that they agree.

The gap analysis records count consistency as a cross-cutting requirement (R6) rather than a
single feature, and the decision set's standing conditions carry the same rule: dashboard,
assignee, asset-list, and CSV counts use consistent filtering and counting definitions. The
approved mechanism is specific — one shared counting function and one reusable filter builder,
feeding five exclusive status buckets, Active Inventory, and Total Records.

The direction of travel is away from four independent implementations that happen to agree,
and toward one definition that cannot disagree. The POC today has **no aggregation, counting, or
export code at all**, so the dashboard, the assignee drill-down, and the CSV export are all
net-new work; building them from one shared definition rather than three parallel ones is the
choice the decision set makes in advance.

This trend has a direct dependency on Trend 2. Counts can only be consistent if the buckets
they count are exhaustive and mutually exclusive — which is what the five exclusive status
buckets establish, and what makes `discarded` (excluded from Active Inventory, present in the
`discarded` bucket and in Total Records) a definitional requirement rather than a display
choice.

## Trend 4 — Data integrity hardening under concurrent use

The fourth trend is the move from "the application prevents duplicates" to "the system prevents
duplicates, including when two administrators act at the same moment".

The POC's uniqueness rule is `UNIQUE(category, serial_or_key)` — case-sensitive, and blind to
surrounding whitespace. The approved rule is case-insensitive and category-scoped, enforced by
a **functional unique index**, with the index expression and the application-level comparison
predicate sharing one definition, and with the check running inside an IMMEDIATE transaction
against a non-zero SQLite `busy_timeout`, mapping `SQLITE_BUSY` to a retryable error.

Two things are worth reading in that specification. First, "one shared definition" between the
index expression and the application predicate — this is the same consistency-by-construction
principle as Trend 3, applied to uniqueness. Second, the explicit treatment of `SQLITE_BUSY` as
retryable rather than fatal: the trend is toward a system that degrades gracefully under
contention instead of failing a registration outright.

The trend's design consequence: the concurrency contract is part of the requirement, not an
implementation detail. It is testable, and it is in the approved scope with the 66/66 baseline
preserved and regression tests added for newly approved behaviour.

## Trend 5 — Scale-appropriate, not scale-anticipating

The fifth trend is the calibration of ambition to actual scale. The expected scale is medium:
several internal teams (IT, HR, Finance, Operations) sharing a single record, hundreds to low
thousands of assets [Q7].

This sits in a useful position between two failure modes. It is large enough that the
reconciliation dashboard, pagination, improved search, and the assignee directory are all
justified — a spreadsheet-plus-email incumbent at several teams and hundreds of assets is
exactly the configuration where "search the spreadsheet" stops working and a real list view
with counts earns its place. It is small enough that the MVP does not need capabilities
designed for a much larger estate.

The design consequence is that the approved scope's usability features — result counts,
pagination, empty states, improved search — are proportionate rather than premature, and that
no further scale-driven capability is warranted. What remains genuinely open is the *measured*
scale: the sizing above is an expectation, and the internal existing-tool inventory [Q8] is
what would turn it into a number.

## Trend 6 — Technology direction: server-rendered, embedded, and SQLite-native

The technical direction is settled by the approved contract rather than by market movement, and
it is worth stating because it is a deliberate constraint rather than an accident of the POC.

The stack is Node.js ≥20, Express 4.21, EJS 3.1, better-sqlite3 11.10.0 (SQLite 3.49.2), with
Vitest 2.1.9 and @vitest/coverage-v8. This is a synchronous, embedded, server-rendered
architecture with a single-file database and a versioned migration runner.

Three properties of this direction matter for the trends above:

- **Embedded, single-writer SQLite makes the concurrency contract explicit.** The IMMEDIATE
  transaction and `busy_timeout` treatment in Trend 4 exist *because* the database is SQLite
  and its locking model is known. A hosted document database would make this problem disappear
  at the cost of the deployment simplicity and the 66/66 baseline.
- **Server-rendered views with a `data-testid` layer make the audit surface testable.** The
  differentiator (Trend 1) is a visible property of the interface, and the design-system and
  component work it needs has a testable hook already in place.
- **The migration runner is the mechanism for the data-integrity corrections.** Trends 2, 3,
  and 4 are all schema changes — the audit table replacement, the `status` CHECK constraint
  that requires a table rebuild, the `last_assigned_to` column, the functional unique index.
  A versioned migration runner is what makes them safely applyable.

The design consequence is that the "do we need a different platform" question does not arise
at this scale. The trend lines are upward in the direction of *more correctness on the existing
stack*, not toward a different stack.

## Trend Summary

| # | Trend | Direction | Driver | Design consequence |
|---|---|---|---|---|
| T1 | Auditability as an organisational expectation | Internal, not regulatory [Q6] | Operational efficiency | Audit depth is a design standard and a demonstrated claim; the history view is a primary interface |
| T2 | Lifecycle completeness | Toward complete transition coverage, with complexity deferred | The workarounds a spreadsheet forces | The transition table is the core model; every transition needs an explicit audit action |
| T3 | Count consistency | From "a number" to "the number" | Trust across four surfaces | One shared counting function and filter builder; five exclusive buckets make it definable |
| T4 | Data integrity under concurrency | From application-level to system-level uniqueness | Concurrent administration | The concurrency contract is a testable requirement |
| T5 | Scale calibration | Proportionate to medium scale [Q7] | Actual estate size | Dashboard, pagination, search, and result counts are justified; no further scale-driven scope |
| T6 | Platform direction | More correctness on the existing stack | The approved contract | Embedded SQLite, server-rendered views, and a versioned migration runner are the delivery mechanism |

## Hypotheses

Per the ideation phase evidence standard and the evidence standard selected for this stage
[Q8], the following are recorded as **hypotheses to be validated**, not as findings:

| # | Hypothesis | How it would be validated | Consequence if false |
|---|---|---|---|
| H1 | The measured asset count and user count fall within the medium-scale expectation | Internal existing-tool inventory with the IT, HR, and Finance functions | Pagination, search, and the reconciliation dashboard may need revisiting in scope-definition |
| H2 | No system already in use holds asset custody data | Internal existing-tool inventory | The MVP's scope narrows or changes materially |
| H3 | The organisation's asset taxonomy maps cleanly onto the two categories the POC already supports (`hardware`, `software-license`) | Internal existing-tool inventory plus a category sample | The uniqueness policy's category scoping, which is deliberately category-scoped and case-insensitive, may need a wider category model — a change that would reach the requirements stage, not this one |
| H4 | The audit-actor mechanism can be settled without introducing authentication the POC deliberately deferred | The mechanism is a precondition of the Audit Completeness metric and is recorded as an open question | The MVP's primary success measure cannot be evaluated; this is the single highest-leverage open item carried into the next stage |

## Sources

The following upstream artifacts were read to ground this report:

- **Asset Tracker MVP Development Workbook** — sections 4.1, 4.2.5, 4.3, 4.4, 6.1, 6.5, 9, 10,
  21.1, 21.2, 22, 24, and the two new section 27 sections.
- **POC-vs-MVP gap analysis** (`aidlc/spaces/default/intents/261004-poc/analysis/gap-analysis.md`)
  — the POC baseline, the audit-cascade finding, the `status` CHECK-constraint finding, the
  missing `in-stock → lost` transition, the count-consistency requirement, and the design-system
  baseline.
- **Decision brief** (`aidlc/spaces/default/intents/261004-poc/analysis/decision-brief.md`) —
  the four decision areas and the ten open questions.
- **Consolidated decision review** (`aidlc/spaces/default/intents/261004-poc/analysis/consolidated-decision-review.md`)
  — the fully approved 17-item decision set.
- **POC source** (`src/`, `tests/`, `package.json`) — the verified architecture, schema,
  transition map, and test baseline.

## Assumptions & Open Questions

- The competitive landscape, the product comparisons, and the market-size figures are internal-tool characterisations rather than external revenue-market research, because the MVP serves internal IT asset administrators and has no external market positioning. Any figure, product capability, or pricing statement that is not already established in the approved upstream artifacts is carried as an explicit hypothesis and labelled as such, per the ideation phase's evidence standard.
- The build-vs-buy position is not settled by the approved decision set, which fixes the MVP's scope and technical contract but does not record a buy, partner, or hybrid alternative as a considered-and-rejected option. The assessment therefore presents the calculus rather than recording it as a settled decision, and no option is adopted here.
- The sizing question is answered in terms of internal usage and asset count rather than in revenue, because there is no external revenue market for this tool; whether any external sale or licensing is contemplated at all was not answered by the confirmed intent-capture questions.
- The stage's own condition — execute on external market positioning or build-vs-buy considerations, skip for internal tools — is satisfied because the approved scope is `feature` with no stage skipped, and because the intent-capture Q8 answer explicitly requires the operation phase and no stage skipped. The build-vs-buy consideration is genuine, and skipping the stage would require a new human approval round.

## Review

Reserved for the reviewer at the approval gate.
