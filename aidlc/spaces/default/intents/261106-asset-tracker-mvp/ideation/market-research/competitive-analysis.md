# Competitive Analysis — Asset Tracker MVP

## Sources

- [desc] Initial description: "Build the Asset Tracker MVP from the approved Asset Tracker MVP Development Workbook, the POC-vs-MVP gap analysis, the decision brief, and the fully approved 17-item decision set. The MVP adds actor-attributed append-only audit history, previous-holder preservation via last_assigned_to, lost-asset recovery (lost to in-stock), an assigned to discarded transition that resolves the assignment inline, five exclusive status buckets with Active Inventory and Total Records computed by one shared counting function and filter builder, case-insensitive category-scoped serial uniqueness via a functional index with a concurrency-safe application-level fallback, CSV export with formula-injection protection, and an amendment to workbook section 4.1 and section 21.1 Scenario 3 recording Returned as a distinct resting state."
- [scope] Workflow-selected scope: `feature`.
- [Q1] The MVP's real competitor is a shared spreadsheet or document plus email threads — the spreadsheet holds the record, email carries the changes.
- [Q2] The competitive landscape is framed as both the internal-build option and the off-the-shelf products, with the off-the-shelf set as the reference point for feature parity.
- [Q3] The table-stakes capabilities are: asset registration with category and serial/key plus a list view with search, filter, and sort; assignment of an asset to a named holder and recording its return; marking an asset lost with a captured reason; and a per-asset view showing every event that ever happened to it.
- [Q4] Auditability — an actor-attributed, append-only, never-destroyed history with defensible write-offs — is the MVP's primary differentiator; everything else is table-stakes.
- [Q6] There is no specific external driver; the driver is operational efficiency and the absence of a system of record.
- [Q7] The realistic scale is medium — several internal teams (IT, HR, Finance, Operations) sharing a single record, hundreds to low thousands of assets.
- [memory:M2] `aidlc/spaces/default/memory/project.md#Decided`: "The fully approved 17-item Asset Tracker MVP decision set, together with the Asset Tracker MVP Development Workbook, is the binding technical and product contract for the `asset-tracker-mvp` intent; it is not reopened at any stage of that intent, and it carries seven standing conditions — the uniqueness check uses an IMMEDIATE transaction and a non-zero SQLite `busy_timeout` with `SQLITE_BUSY` mapped to a retryable error; the functional-index expression and the application-level comparison predicate use one shared definition; registration and serial/key updates enforce the same uniqueness policy; historical backfills preserve original records and audit traceability and report failures; dashboard, assignee, asset-list, and CSV counts use consistent filtering and counting definitions; every lifecycle transition has explicit validation and audit behaviour; and the existing 66/66 passing test baseline is preserved with regression tests added for newly approved behaviour. Traceability must be maintained between the approved MVP requirements and the POC requirements FR1.3, FR4.4, FR4.5, and FR5.3, and actor identity is resolved from trusted server-side context so actor information supplied in a write request is never trusted. (Stage intent-capture, 2026-11-06)"

## Scope of This Analysis

This analysis is derived from the upstream `intent-statement` artifact produced by the
intent-capture stage (`aidlc/spaces/default/intents/261106-asset-tracker-mvp/ideation/intent-capture/intent-statement.md`),
whose problem framing, target customer, success metric, and confirmed scope bounds are the
premise throughout.

This is an **internal-tool competitive analysis**, not external revenue-market research. The MVP
serves internal IT asset administrators [Q2] and has no external market positioning. Its
"market" is the set of alternatives an internal team could reasonably choose instead of this
system, and the measure of success is whether the MVP is demonstrably better than those
alternatives for the work this organisation actually does.

The off-the-shelf product set is carried as a **feature-parity reference point**, not as a
purchase shortlist [Q2]. The build-vs-buy calculus itself is assessed separately in
`build-vs-buy.md`.

> **Evidence standard.** This analysis is grounded in the approved upstream artifacts — the
> Development Workbook, the POC-vs-MVP gap analysis, the decision brief, the 17-item decision
> set — and in the POC source. Characterisations of named off-the-shelf products are **explicit
> hypotheses** (see [Q8], and the `## Hypotheses` section below), not verified claims; no
> product was evaluated, licensed, or trialled in producing this artifact. An internal
> existing-tool inventory is required before any product characterisation in this document is
> relied upon for a purchase decision.

## The Incumbent — Spreadsheet Plus Email

The MVP's real competitor is not a software product. It is a shared spreadsheet or document
that holds the record, with email threads carrying the changes [Q1].

This incumbent is the baseline against which every capability claim must be measured, and it
is worth being precise about why it fails, because the failure modes are exactly what the
approved decision set was written to fix:

| Incumbent property | Consequence for asset custody | What the MVP does instead |
|---|---|---|
| The spreadsheet holds the *current* state only | There is no history. A prior holder who cannot be reconstructed from the row is simply lost | Actor-attributed append-only history, with every lifecycle event recorded [desc] |
| A change arrives by email | The change and the record can disagree. It is unknown whether the spreadsheet was updated | The record is the system of truth; an event that is not written is not a change |
| Updates are manual and per-team | The same physical asset can be registered twice, in two spreadsheets | Case-insensitive, category-scoped serial uniqueness enforced by a functional unique index with a concurrency-safe application-level fallback [desc] |
| The spreadsheet has no "status" authority | Counts are computed by whoever opens the file, and different people get different numbers | Five exclusive status buckets, with Active Inventory and Total Records computed by one shared counting function and a reusable filter builder [desc] |
| A row is edited in place or deleted | A written-off asset leaves no trace that it existed or who wrote it off | The asset row and its full history are never deleted; a discarded asset stays in the `discarded` bucket and in Total Records, reachable at its detail URL with its history intact |
| Loss is recorded as a note | A loss event destroys the previous holder's identity | Previous-holder preservation via `last_assigned_to`, so a loss or reassignment never erases the prior holder [desc] |

The incumbent's failure is not that it is clumsy. It is that it is **not accountable**. It
cannot answer the three questions that asset accountability exists to answer — who had this
asset, when, and what happened to it — because it was never designed to hold the answers.
That is the same framing the approved intent statement settles on: asset accountability is not
auditable, and when an asset goes missing or is written off, the organisation cannot say who
had it, when, and what happened.

## Table-Stakes Parity

The four capabilities the organisation treats as table-stakes [Q3] are the ones whose absence
would get the tool rejected outright. All four are within the approved MVP scope, and all four
already exist in the POC in some form.

| Capability | POC status | MVP disposition | Source |
|---|---|---|---|
| Registration with category and serial/key, plus list with search, filter, and sort | Registration, list/search/filter/sort fully implemented | Modify — serial uniqueness changes to case-insensitive and category-scoped, and the same policy applies on serial/key updates | [Q3] [desc] [memory:M2] |
| Assignment and return to a named holder | Both implemented in the service layer's transition map | Modify — `last_assigned_to` is added so the previous holder survives, and `returned` becomes a distinct resting state rather than collapsing to `in-stock` | [Q3] [desc] |
| Loss marking with a reason | Implemented | Extend — `in-stock → lost` becomes a permitted transition with a required reason, and a single `lost → in-stock` recovery transition is added | [Q3] [desc] |
| Per-asset history view | Audit rows exist but carry no actor | Replace — the audit table is replaced outright: `actor_id`, `old_values`/`new_values`, append-only enforcement, and `ON DELETE RESTRICT` so history is never destroyed by a cascade | [Q3] [desc] |

The pattern across the four is consistent: **the POC already has the shape of each capability,
and the MVP corrects its data-integrity behaviour.** Roughly 35–40% of the MVP's foundational
work already exists, and the pieces that exist are the hard architectural ones — the
route → service → repository → SQLite split, the versioned migration runner, the enforced
state machine, and the server-rendered view layer.

## The Differentiator — Auditability

The table-stakes are the parity set. The differentiator is auditability: an actor-attributed,
append-only, never-destroyed history with defensible write-offs [Q4]. Nothing in the off-the-shelf
product set is a substitute for this, because it is not a feature request — it is a set of
organisation-specific rules:

| Auditability property | Why it is not a configuration option |
|---|---|
| Every audit entry carries an actor attribution resolved from trusted server-side context, and actor information supplied in a write request is never trusted | A commercial product's actor model is whatever its identity provider supplies. The rule that a write-request body is never trusted is an architectural invariant of this system, and the POC deliberately deferred authentication entirely, so the mechanism that establishes a trusted actor is not yet settled |
| Audit rows are append-only and the asset deletion path cannot cascade to them | The POC's current `audit_log` carries `ON DELETE CASCADE` from `assets`, which silently destroys history — deleting one asset row removed its audit row. Removing a cascade is a schema-level change to a third-party product's own table |
| The `discarded` transition resolves the assignment inline: `assigned_to` is cleared, `last_assigned_to` is retained, and the `discarded` audit action records the discard, the prior holder, and the fact that the assignment was resolved by the discard | This is a compound, organisation-specific write semantics. It is not a status field a vendor exposes for configuration |
| A discard reason is always required, drawn from a shared loss-reason vocabulary plus retirement-specific values | The vocabulary is this organisation's own taxonomy |
| The `recovered` audit action is distinct from `assign` and `return`, and its description names the recovery and the prior holder | A discrete audit-action vocabulary with these exact semantics is an internal standard |
| The five status buckets, Active Inventory, and Total Records are computed by one shared counting function and one reusable filter builder, so dashboard, assignee, asset-list, and CSV counts cannot disagree | Counts must agree across four surfaces by construction. Whether a product can be configured to derive all four from one definition is a per-product question that has not been verified |
| Case-insensitive, category-scoped serial uniqueness via a functional unique index, with the index expression and the application-level comparison predicate sharing one definition, under an IMMEDIATE transaction with a non-zero `busy_timeout` and `SQLITE_BUSY` mapped to a retryable error | The concurrency-safety contract is written against SQLite's locking behaviour specifically. It is a correctness requirement of this codebase, not a product setting |
| Pre-MVP audit history is backfilled to a `system` actor and excluded from the Audit Completeness metric | A backfill that rewrites existing history to satisfy a metric is a one-off migration decision about this organisation's own records |

The pattern: each differentiator property is either an **architectural invariant** (the audit
table's deletion behaviour, the actor-trust rule), a **domain rule** (the reason vocabularies,
the audit-action semantics), or a **consistency-by-construction** requirement (the shared
counting function). All three categories are properties of a system, not of a configuration.

## The Off-the-Shelf Set — Parity Reference

This section characterises the off-the-shelf set as a **parity reference point** [Q2]. The
following are **hypotheses**, not verified claims — see [Q8] and `## Hypotheses`. No product was
evaluated, licensed, or trialled in producing this artifact.

| Reference product | Table-stakes it plausibly covers | Differentiator coverage | Confidence |
|---|---|---|---|
| Open-source IT asset management (e.g. Snipe-IT-class tools) | Registration, assignment, return, history view, reporting | Partial at best — a generic audit trail records that an action happened, but the organisation's actor-trust rule, compound discard semantics, and single-definition count consistency are not known to be configurable | Hypothesis |
| Commercial ITSM / asset modules (e.g. ServiceNow-class tools) | Broad — registration, assignment, workflow, reporting are all standard ITSM territory, with mature enterprise integration | Partial at best — heavyweight; the organisation-specific audit-action vocabulary and vocabulary-driven reason requirements are not known to be configurable | Hypothesis |
| ERP / fixed-asset modules (e.g. Odoo-class tools) | Accounting-grade fixed-asset register with depreciation and write-off workflow | Partial — an ERP module is strong on defensible write-offs for financial purposes and weak on per-asset operational custody history | Hypothesis |
| Device discovery / MDM (e.g. Lansweeper-class tools) | Discovery-driven inventory; strong on "what hardware do we have" | Different purpose — discovers endpoints rather than tracking custody, so it does not answer who-has-what | Hypothesis |
| Configuration management databases (e.g. GLPI / CMDB-class tools) | Item inventory with history, assignment to entities, lifecycle states | Partial — the entity model and the state vocabulary are generic, so the five-bucket definition and the shared counting function are not known to be derivable | Hypothesis |

**What the parity reference establishes.** Two things, both of which support the Build
position rather than pre-empting it:

1. **The table-stakes are genuinely commoditised.** Every table-stakes capability [Q3] appears
   in at least one mature product category. If the MVP delivered only the table-stakes, a
   purchase would be a reasonable answer. This is the strongest argument *against* building, and
   it is why the table-stakes cannot be where the MVP's value is argued.
2. **The differentiator is not commoditised.** No mature product is known to offer the
   organisation-specific audit-action vocabulary, the compound inline discard resolution, the
   single-definition count consistency, or the SQLite-specific concurrency contract — because
   these are not features, they are this organisation's rules expressed as system invariants.

**The internal inventory changes the picture and is not yet available.** The evidence standard
selected for this stage requires the upstream artifacts *plus* an internal inventory of what is
actually in use at the organisation [Q8]. A spreadsheet-plus-email incumbent [Q1] is established
as the dominant alternative, but the inventory that would show whether a second system — an
ERP, an ITSM, an identity directory — already holds some asset custody data is **not yet in
hand**. Until that inventory is gathered, the competitive set is partially characterised, and
any statement that "no existing system already covers this" would be an unsupported claim.

## Positioning

On the two axes that matter for an internal custody tool — **accountability depth** (can it
demonstrate who had what, when, and what happened) against **operational completeness** (does it
cover the whole lifecycle without workarounds) — the incumbent spreadsheet-plus-email scores low
on both: it has neither an accountability record nor a complete lifecycle, and it is a
spreadsheet.

The off-the-shelf set scores high on operational completeness by category, and is *plausibly*
moderate on accountability depth — a generic audit trail records that something happened, but
whether it is actor-attributed, append-only, and impossible to cascade away is exactly what
these products differ on and what has not been verified.

The MVP positions at high accountability depth and high operational completeness, and its
claim to that quadrant rests entirely on the differentiator properties [Q4] rather than on the
table-stakes. This is an uncomfortable position to defend if the differentiator is not
demonstrable in the product — but it is the position the approved decision set has already
taken, and it is the reason the MVP's primary success measure is Audit Completeness.

## SWOT

| | Helpful | Harmful |
|---|---|---|
| **Internal** | **Strengths** — an approved, fully specified decision set and workbook as the binding contract; a working POC with a layered architecture and a 66/66 passing test baseline; the audit-and-custody rules expressed as a specific, testable contract rather than as intent | **Weaknesses** — the POC's design system baseline is effectively zero (40 lines of CSS, no tokens) and ~30 workbook-required components are new; the mechanism that establishes a trusted actor is not yet settled, and it is a precondition for the primary success metric; the build is a serial chain of many approval points |
| **External** | **Opportunities** — the table-stakes are commoditised, so the MVP's value does not have to compete on breadth; there is no regulatory deadline creating urgency, so the build can be sequenced against real need rather than a fixed date | **Threats** — off-the-shelf products are broadly capable and an off-the-shelf purchase would meet the table-stakes; the spreadsheet-plus-email incumbent has near-zero switching cost and no incumbent contract to displace; without an internal existing-tool inventory, a second system may already cover part of the custody need |

## Hypotheses

Per the ideation phase evidence standard and the evidence standard selected for this stage
[Q8], the following are recorded as **hypotheses to be validated**, not as findings:

| # | Hypothesis | How it would be validated | Consequence if false |
|---|---|---|---|
| H1 | No system already in use at the organisation holds asset custody data | Internal existing-tool inventory with the IT, HR, and Finance functions | The MVP's scope narrows or changes materially, and the competitive framing changes |
| H2 | Mature off-the-shelf products do not offer the organisation's audit-action vocabulary, compound discard resolution, and single-definition count consistency as configuration | Product evaluation or documentation review against the §27 Audit Action Vocabulary and Inventory Counting Definitions | The Build position weakens; a hybrid or buy position becomes defensible |
| H3 | A commercially off-the-shelf product would meet the four table-stakes capabilities | Feature-parity review of one reference product against the table-stakes list | The parity reference strengthens; the MVP's value argument must lean harder on the differentiator |
| H4 | Medium scale (hundreds to low thousands of assets, several teams) does not require capabilities beyond those in the approved scope | Asset-count inventory and a user-count estimate from the internal inventory | Pagination, search, and the reconciliation dashboard may need revisiting in scope-definition |

## Sources

The following upstream artifacts were read to ground this analysis:

- **Asset Tracker MVP Development Workbook** — the source of the workbook feature set, the §27
  additions, and the amendment surface.
- **POC-vs-MVP gap analysis** (`aidlc/spaces/default/intents/261004-poc/analysis/gap-analysis.md`)
  — the POC baseline, the requirement classification, the audit-table cascade finding, the
  `status` CHECK-constraint finding, the component and design-system baselines, and the 35–40%
  foundational-work estimate.
- **Decision brief** (`aidlc/spaces/default/intents/261004-poc/analysis/decision-brief.md`) —
  the four decision areas, the ten open questions, and the proposed workbook amendments.
- **Consolidated decision review** (`aidlc/spaces/default/intents/261004-poc/analysis/consolidated-decision-review.md`)
  — the fully approved 17-item decision set.
- **POC source** (`src/`, `tests/`, `package.json`) — the existing implementation, verified
  architecture, and test baseline.

## Assumptions & Open Questions

- The competitive landscape, the product comparisons, and the market-size figures are internal-tool characterisations rather than external revenue-market research, because the MVP serves internal IT asset administrators and has no external market positioning. Any figure, product capability, or pricing statement that is not already established in the approved upstream artifacts is carried as an explicit hypothesis and labelled as such, per the ideation phase's evidence standard.
- The build-vs-buy position is not settled by the approved decision set, which fixes the MVP's scope and technical contract but does not record a buy, partner, or hybrid alternative as a considered-and-rejected option. The assessment therefore presents the calculus rather than recording it as a settled decision, and no option is adopted here.
- The sizing question is answered in terms of internal usage and asset count rather than in revenue, because there is no external revenue market for this tool; whether any external sale or licensing is contemplated at all was not answered by the confirmed intent-capture questions.
- The stage's own condition — execute on external market positioning or build-vs-buy considerations, skip for internal tools — is satisfied because the approved scope is `feature` with no stage skipped, and because the intent-capture Q8 answer explicitly requires the operation phase and no stage skipped. The build-vs-buy consideration is genuine, and skipping the stage would require a new human approval round.

## Review

Reserved for the reviewer at the approval gate.
