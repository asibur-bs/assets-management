# Market Research Questions — Asset Tracker MVP

## Sources

- [desc] Initial description: "Build the Asset Tracker MVP from the approved Asset Tracker MVP Development Workbook, the POC-vs-MVP gap analysis, the decision brief, and the fully approved 17-item decision set. The MVP adds actor-attributed append-only audit history, previous-holder preservation via last_assigned_to, lost-asset recovery (lost to in-stock), an assigned to discarded transition that resolves the assignment inline, five exclusive status buckets with Active Inventory and Total Records computed by one shared counting function and filter builder, case-insensitive category-scoped serial uniqueness via a functional index with a concurrency-safe application-level fallback, CSV export with formula-injection protection, and an amendment to workbook section 4.1 and section 21.1 Scenario 3 recording Returned as a distinct resting state."
- [scope] Workflow-selected scope: `feature`.
- [Q2] The primary customer is internal IT asset administrators who register, assign, and write off assets on behalf of the organisation.
- [Q6] Scope is fixed for this MVP; the approved decision set and the workbook define it, and changes require a new approval round.
- [Q8] The product boundary includes the operation phase; the workflow scope was changed from `mvp` to `feature`, which runs 33 of 33 stages with no stage skipped, and no completed stage was invalidated.
- [memory:M1] `aidlc/spaces/default/memory/org.md#Mandated`: "**Conversation language — resolution**: Every artifact a person reads or reviews is written in the workflow's established conversation language. The orchestrator resolves that language from the human's substantive prose and MUST state it as a `Conversation language: <language>` line in every delegated brief, because a delegated agent or reviewer never sees the conversation and some stages hand it nothing else (a greenfield run of a stage whose `consumes` are all `conditional_on: brownfield` reaches its lead with no upstream artifact at all). Delegated agents and reviewers resolve the language in this order and stop at the first source that answers: (1) the `Conversation language:` line in your brief — AUTHORITATIVE for delegated work, because the orchestrator regenerates it on every dispatch from the live conversation and it is therefore never staler than a persisted rule; (2) an explicit conversation-language rule in `aidlc/spaces/<active-space>/memory/project.md` — the FALLBACK for a brief that states no language, and the ONLY file a language switch is ever persisted to, so `project.md` ALWAYS outranks a conversation-language rule in `team.md`, which can only ever be a team default and NEVER the record of a switch (cross-file position is NOT recency: the runtime rule chain concatenates `org → team → project → phase`, so `team.md` reaches you before `project.md` in every bundle no matter which was written last, and the winner is this stated precedence rather than the later position); within `project.md`, when it carries more than one conversation-language rule the LAST one under `## Corrections` is the current one (this tie-break governs conversation-language rules ONLY and leaves the additive rule model untouched; the learnings write path appends and never replaces, so a superseded language rule can still be on disk); (3) the verbatim initial description decoded from `<record>/project-description.json`, falling back to `## Project Information` → `**Project**` in legacy records, when it carries a real language signal (not the `[Project description]` placeholder, not a bare identifier or path); (4) any artifact or draft you were handed — the directive's `consumes[]` contracts, the artifact you were dispatched to review, or the lead draft you were dispatched against. Every source is readable on every harness: the rule bundle carries (2) through the dispatch-rules hook on Claude, Codex, and opencode and through always-included agent resources or workspace steering on Kiro, and neither `aidlc-state.md` nor the handed artifacts fall inside the per-unit reviewer read-scope bound."
- [memory:M2] `aidlc/spaces/default/memory/project.md#Decided`: "The fully approved 17-item Asset Tracker MVP decision set, together with the Asset Tracker MVP Development Workbook, is the binding technical and product contract for the `asset-tracker-mvp` intent; it is not reopened at any stage of that intent, and it carries seven standing conditions — the uniqueness check uses an IMMEDIATE transaction and a non-zero SQLite `busy_timeout` with `SQLITE_BUSY` mapped to a retryable error; the functional-index expression and the application-level comparison predicate use one shared definition; registration and serial/key updates enforce the same uniqueness policy; historical backfills preserve original records and audit traceability and report failures; dashboard, assignee, asset-list, and CSV counts use consistent filtering and counting definitions; every lifecycle transition has explicit validation and audit behaviour; and the existing 66/66 passing test baseline is preserved with regression tests added for newly approved behaviour. Traceability must be maintained between the approved MVP requirements and the POC requirements FR1.3, FR4.4, FR4.5, and FR5.3, and actor identity is resolved from trusted server-side context so actor information supplied in a write request is never trusted. (Stage intent-capture, 2026-11-06)"

## Q1. Existing internal alternatives to the spreadsheet and email approach

The intent statement grounds the status quo: internal teams (IT, HR, Finance, Operations) track
company assets through spreadsheets, email, and paper, with no system of record. Before this
MVP can claim a differentiator, the alternative that most of these teams actually use today
has to be named.

Which existing internal alternative or incumbent process is the MVP's real competitor — the
thing it must be measurably better than?

- A. A shared spreadsheet (Excel/Google Sheets) per team or per office, maintained by hand.
- B. A shared spreadsheet or document plus email threads — the spreadsheet holds the record, email carries the changes.
- C. An existing general-purpose system already in use (ERP, ITSM, ticketing, identity/directory, MDM) that holds some asset custody data.
- D. No tracked alternative at all in most cases — assets are simply not systematically accounted for, and the gap is discovered at audit time.
- E. Not yet defined
- X. Other (please specify)

[Answer]: B. A shared spreadsheet or document plus email threads — the spreadsheet holds the record, email carries the changes.

## Q2. The competitive landscape the MVP is measured against

The Asset Tracker is an internal IT tool with a named internal customer, so the "market" is a
market of internal build-vs-buy alternatives rather than an external revenue market. The
question that governs this stage is which outside options are genuinely on the table.

Given the internal IT context, how should the competitive landscape be framed for this MVP?

- A. Open-source and commercial asset-tracking products only (e.g. Snipe-IT, GLPI, Odoo, ServiceNow, Zendesk, Lansweeper), compared on capability and cost.
- B. Internal-tool landscape only — compare against what a capable in-house team would build, and against generic internal system options.
- C. Both: the internal-build option and the off-the-shelf products, with the off-the-shelf set as the reference point for feature parity.
- D. Not yet defined
- X. Other (please specify)

[Answer]: C. Both: the internal-build option and the off-the-shelf products, with the off-the-shelf set as the reference point for feature parity.

## Q3. Table-stakes versus differentiators

The approved decision set already fixes what the MVP must do. The question here is what a
stakeholder would treat as table-stakes — the features that, if missing, would make the tool
rejected outright regardless of how good the audit trail is.

Which capabilities are table-stakes for an internal asset-tracking tool at this organisation?

- A. Asset registration with a category and serial/key, plus a list view with search, filter, and sort.
- B. Assignment and return of an asset to a named holder.
- C. Loss marking with a reason.
- D. A per-asset history view showing every event.
- E. A dashboard with counts.
- F. Export of asset data.
- G. Not yet defined
- X. Other (please specify)

[Answer]: A, B, C, D — registration with list/search/filter/sort; assignment and return; loss marking with a reason; a per-asset history view.

## Q4. What the MVP actually differentiates on

The approved decision set's substance is auditability: actor-attributed append-only history,
previous-holder preservation, recovery, discard, and consistent counts. If a competitor product
can be bought and configured to deliver registration, assignment, and return, then the MVP's
entire value rests on the audit properties.

Is auditability — an actor-attributed, append-only, never-destroyed history with defensible
write-offs — the MVP's primary differentiator, or is something else the differentiator?

- A. Yes — auditability and defensible custody history are the differentiator; everything else is table-stakes.
- B. No — the differentiator is the reconciliation dashboard and count consistency.
- C. No — the differentiator is the lifecycle completeness (recovery and discard) rather than the audit trail itself.
- D. Not yet defined
- X. Other (please specify)

[Answer]: A. Yes — auditability and defensible custody history are the differentiator; everything else is table-stakes.

## Q5. The build-vs-buy calculus

This is the stage's central question. The POC already exists as a working application with a
layered architecture and a 66/66 passing test baseline; roughly 35–40% of the MVP's
foundational work is already done. Against that, a mature product could be bought and
configured.

What is the build-vs-buy position for the MVP?

- A. Build — extend the existing POC. The audit, uniqueness, and counting semantics are specific to this organisation's rules and are not a configuration option in any off-the-shelf product.
- B. Buy — adopt an off-the-shelf product and configure it, accepting that some workbook-specific rules (the audit action vocabulary, the five buckets, the `last_assigned_to` preservation) would be approximated.
- C. Partner/integrate — keep the POC as the system of record but integrate with an existing enterprise system for the adjacent needs (identity, ticketing, finance).
- D. Hybrid — build the audit-and-custody core (which is where the differentiator lives) and buy/adopt off-the-shelf capability for the table-stakes periphery.
- E. Not yet defined
- X. Other (please specify)

[Answer]: A. Build — extend the existing POC. The audit, uniqueness, and counting semantics are specific to this organisation's rules and are not a configuration option in any off-the-shelf product.

## Q6. Industry trends, regulatory shifts, and internal pressure

The MVP's Audit Completeness metric — 100% of audit entries carry an actor attribution — is the
kind of property that gets asked for when someone needs to demonstrate custody to an auditor,
a regulator, or an internal review. That changes what the design has to be able to show.

What external or internal pressure drives the need for demonstrable asset custody?

- A. An internal or external audit now requires demonstrable custody records — the driver behind the initiative.
- B. A data-protection, retention, or records-management regulation applies to asset records (e.g. records-retention schedules, SOX-style write-off defensibility, GDPR-style erasure obligations).
- C. Security and loss-prevention programme — device loss and unreturned assets are the business driver.
- D. No specific external driver — the driver is operational efficiency and the absence of a system of record.
- E. Not yet defined
- X. Other (please specify)

[Answer]: D. No specific external driver — the driver is operational efficiency and the absence of a system of record.

## Q7. Addressable audience and market sizing

This is an internal tool, so the sizing question is about how many people will actually use it
and how many assets it must account for — which determines whether the reconciliation dashboard
and pagination matter at this scale or are premature.

What is the realistic scale the MVP must serve?

- A. Small — one team, tens of assets, a handful of asset administrators.
- B. Medium — several internal teams (IT, HR, Finance, Operations) sharing a single record, hundreds to low thousands of assets.
- C. Large — organisation-wide, thousands of assets across multiple offices.
- D. Not yet defined
- X. Other (please specify)

[Answer]: B. Medium — several internal teams (IT, HR, Finance, Operations) sharing a single record, hundreds to low thousands of assets.

## Q8. Evidence standard for this stage

The ideation phase rules require that market research claims carry citations or explicit
source attribution, that estimates be conservative, and that speculation be labelled as
hypothesis rather than stated as fact. Several questions above ask for judgements that a
general-purpose product survey alone cannot settle for an internal tool.

How should the competitive analysis and build-vs-buy assessment be grounded?

- A. From the approved upstream artifacts only — the workbook, the gap analysis, the decision brief, the 17-item decision set, and the POC source — with any product landscape characterised from what is already established and everything else labelled as an explicit hypothesis.
- B. From the approved upstream artifacts plus a web survey of the named off-the-shelf products, cited as external sources.
- C. From the approved upstream artifacts plus internal input — a stakeholder or existing-tool inventory of what is actually in use at the organisation.
- D. Not yet defined
- X. Other (please specify)

[Answer]: C. From the approved upstream artifacts plus internal input — a stakeholder or existing-tool inventory of what is actually in use at the organisation.

## Assumption Confirmation

- A. Accept assumptions
- B. Convert to follow-up questions

- [assumption] The competitive landscape, the product comparisons, and the market-size figures are internal-tool characterisations rather than external revenue-market research, because the MVP serves internal IT asset administrators and has no external market positioning. Any figure, product capability, or pricing statement that is not already established in the approved upstream artifacts is carried as an explicit hypothesis and labelled as such, per the ideation phase's evidence standard.
- [assumption] The build-vs-buy position is not settled by the approved decision set, which fixes the MVP's scope and technical contract but does not record a buy, partner, or hybrid alternative as a considered-and-rejected option. The assessment therefore presents the calculus rather than recording it as a settled decision, and no option is adopted here.
- [assumption] The sizing question is answered in terms of internal usage and asset count rather than in revenue, because there is no external revenue market for this tool; whether any external sale or licensing is contemplated at all was not answered by the confirmed intent-capture questions.
- [assumption] The stage's own condition — execute on external market positioning or build-vs-buy considerations, skip for internal tools — is satisfied because the approved scope is `feature` with no stage skipped, and because the intent-capture Q8 answer explicitly requires the operation phase and no stage skipped. The build-vs-buy consideration is genuine, and skipping the stage would require a new human approval round.

[Answer]: A. Accept assumptions

## Consolidated Summary Confirmation

- Looks correct
- Request changes

[Answer]: Looks correct
