# Intent Statement — Asset Tracker MVP

## Sources

- [desc] Initial description: "Build the Asset Tracker MVP from the approved Asset Tracker MVP Development Workbook, the POC-vs-MVP gap analysis, the decision brief, and the fully approved 17-item decision set. The MVP adds actor-attributed append-only audit history, previous-holder preservation via last_assigned_to, lost-asset recovery (lost to in-stock), an assigned to discarded transition that resolves the assignment inline, five exclusive status buckets with Active Inventory and Total Records computed by one shared counting function and filter builder, case-insensitive category-scoped serial uniqueness via a functional index with a concurrency-safe application-level fallback, CSV export with formula-injection protection, and an amendment to workbook section 4.1 and section 21.1 Scenario 3 recording Returned as a distinct resting state."
- [scope] Workflow-selected scope: `feature`.
- [Q1] The business problem is that asset accountability is not auditable — when an asset goes missing or is written off, the organisation cannot say who had it, when, and what happened.
- [Q2] The primary customer is internal IT asset administrators who register, assign, and write off assets on behalf of the organisation.
- [Q3] The primary success measure is Audit Completeness — 100% of audit entries carry an actor attribution, and history is never destroyed.
- [Q4] The trigger is that the POC's data-integrity gaps are now blocking real use; the organisation has assets it must account for, and the POC destroys holder history.
- [Q5] The key stakeholders are all four identified groups: asset administrators, the finance function, IT leadership, and the end user holding the asset; what each cares about is accurate custody records and defensible write-offs, a demonstrable system, and clarity about what they hold.
- [Q6] Scope is fixed for this MVP; the approved decision set and the workbook define it, and changes require a new approval round.
- [Q7] Progress is reported to stakeholders as a periodic summary covering delivered scope and outstanding decisions.
- [Q8] The product boundary includes the operation phase; the workflow scope was changed from `mvp` to `feature`, which runs 33 of 33 stages with no stage skipped, and no completed stage was invalidated.
- [memory:M2] `aidlc/spaces/default/memory/project.md#Decided`: "The fully approved 17-item Asset Tracker MVP decision set, together with the Asset Tracker MVP Development Workbook, is the binding technical and product contract for the `asset-tracker-mvp` intent; it is not reopened at any stage of that intent, and it carries seven standing conditions \u2014 the uniqueness check uses an IMMEDIATE transaction and a non-zero SQLite `busy_timeout` with `SQLITE_BUSY` mapped to a retryable error; the functional-index expression and the application-level comparison predicate use one shared definition; registration and serial/key updates enforce the same uniqueness policy; historical backfills preserve original records and audit traceability and report failures; dashboard, assignee, asset-list, and CSV counts use consistent filtering and counting definitions; every lifecycle transition has explicit validation and audit behaviour; and the existing 66/66 passing test baseline is preserved with regression tests added for newly approved behaviour. Traceability must be maintained between the approved MVP requirements and the POC requirements FR1.3, FR4.4, FR4.5, and FR5.3, and actor identity is resolved from trusted server-side context so actor information supplied in a write request is never trusted. (Stage intent-capture, 2026-11-06)"
- [memory:M3] `aidlc/spaces/default/memory/project.md#Decided`: "The decision set's amendment table names the workbook amendment surface as section 4.1 (transition table, recovery, `in-stock \u2192 lost`, `assigned \u2192 discarded`), section 4.2.5, section 4.3 (the actor-trust rule), section 4.4, section 6.1, section 6.4, section 6.5, section 9 (Screens 01, 02, 03, 04, 10), section 10, section 21.1, section 21.2, section 22, section 24 (the metric qualifiers the Audit Completeness population relies on), and the two new section 27 sections (Inventory Counting Definitions and Audit Action Vocabulary). The section 24 amendment carries the Audit Completeness qualifier verbatim: pre-MVP history is backfilled to a `system` actor and excluded from this metric. Section 4.1 records the `lost \u2192 in-stock` recovery transition with a required recovery reason drawn from the shared loss-reason vocabulary, and requires a distinct `recovered` audit action rather than `assign` or `return`, whose description names the recovery and the prior holder. It also records that complex recovery workflows \u2014 partial recovery, credit assignment, dispute handling \u2014 remain deferred, distinct from the single included recovery transition. The workbook's remaining MVP feature set is the reconciliation dashboard, the assignee directory, asset editing, duplicate-detection UX, empty states, result counts, pagination, improved search, responsive UI, and a design system. The design-system enumeration is indicative, not exhaustive: workbook section 11 is the authoritative source for the complete design-system requirements, covering semantic color tokens, a typography scale, spacing tokens, radius and shadow scales, iconography, and a light-theme implementation designed for future dark-theme extension. (Stage intent-capture, 2026-11-06)"
- [memory:M4] `aidlc/spaces/default/memory/project.md#Decided`: "The `assigned \u2192 discarded` transition resolves the assignment inline and records it: `assigned_to` is cleared, `last_assigned_to` is retained so the holder at discard time stays visible, and a `discarded` audit action records the discard, the prior holder, and the fact that the assignment was resolved by the discard. A discard reason is always required, drawn from the shared loss-reason vocabulary plus retirement-specific values. The asset row and its full history are never deleted; a discarded asset is excluded from Active Inventory but remains present in the `discarded` bucket and in Total Records, and stays accessible at its detail URL with its history intact. (Stage intent-capture, 2026-11-06)"

## Problem Statement

Internal teams track company assets through spreadsheets, email, and paper, with no system of record [Q1]. The Asset Tracker POC established a working application shape, but its evidence-backed data-integrity gaps prevent real use [Q1] [Q4]:

- A loss event destroys the previous holder's identity — the assignment is nulled and only the audit prose survives [Q1].
- A returned asset's history is overwritten on reassignment, so the prior holder is unrecoverable [Q1].
- The audit trail is destroyed when an asset is deleted [Q1].

Together these mean the organisation cannot answer the questions that asset accountability exists to answer: who had this asset, when, and what happened to it [Q1].

Two further integrity defects are carried as approved MVP work rather than as the framing that won approval: serial or key uniqueness is case-sensitive and does not survive surrounding whitespace, so the same physical asset can be registered twice [desc]; and dashboard, assignee, list, and export counts can disagree, so no one trusts the numbers [desc].

## Initiative Trigger

The initiative is being promoted from POC to MVP because the POC's data-integrity and auditability gaps are blocking its use as a reliable system of record for organisational assets [Q4]. The organisation has hardware assets that must be accounted for, but the current implementation can destroy previous holder information during loss events, overwrite historical custody records during reassignment, and remove audit history when assets are deleted [Q1] [Q4].

A production-ready MVP is therefore required to establish reliable asset accountability, preserve historical records, and provide an auditable record of asset custody and lifecycle events [Q3] [Q4].

## Intent

Build the Asset Tracker MVP on the approved Asset Tracker MVP Development Workbook, the POC-vs-MVP gap analysis, the decision brief, and the fully approved 17-item decision set [desc]. The MVP corrects the POC's data-integrity defects rather than replacing its application shape: audit history becomes actor-attributed and append-only, previous-holder information survives loss and reassignment, the full lifecycle including recovery and write-off becomes available and recorded, uniqueness becomes case-insensitive and category-scoped under concurrent use, counts become consistent, and export becomes safe to open in a spreadsheet [desc].

## Success Metrics

The MVP's primary success measure is Audit Completeness: 100% of audit entries carry an actor attribution [Q3]. The measurable form of the "history is never destroyed" property is **0 audit rows destroyed by any asset deletion** [Q3]. Pre-MVP audit records are excluded from the metric and backfilled with a clearly identifiable System actor, so the metric is measured against a defined, stated population [memory:M3].

## Target Customer

- **Asset administrators** [Q2] register assets with a category and serial or key, assign them to a holder, record returns, mark losses with a reason, recover lost assets, and discard written-off assets with a reason [Q2].
- **Anyone holding an asset** needs clarity about what they have and how to return it [Q5].
- **Finance and IT leadership** need custody records, write-offs, and counts that are defensible and demonstrable [Q5].

## Initial Scope Signal

- **Workflow-selected scope**: `feature` — the full-lifecycle run, 33 of 33 stages, no stage skipped [scope].
- **User-confirmed product boundary**: The MVP must also include the operation phase (deployment, environment provisioning, observability, incident response, performance validation, feedback); the workflow scope was changed from `mvp` to `feature` accordingly [Q8].

## Scope

### In scope

- Actor-attributed, append-only audit history for every asset lifecycle event [desc] [Q3].
- Previous-holder preservation via `last_assigned_to` so a loss or reassignment never erases the prior holder [desc] [Q1].
- Lost-asset recovery as a `lost` → `in-stock` transition, with the recovery reason captured and recorded as a distinct audit action [memory:M3].
- An `assigned` → `discarded` transition that resolves the assignment inline and records the previous assignment in the audit history [desc] [memory:M4].
- Five exclusive status buckets — in stock, assigned, returned, lost, discarded — with Active Inventory and Total Records computed by one shared counting function and a reusable filter builder [desc].
- Case-insensitive, category-scoped serial or key uniqueness enforced by a functional unique index with a concurrency-safe application-level fallback [desc].
- CSV export with formula-injection protection [desc].
- The approved workbook amendment surface: section 4.1 (transition table, recovery, `in-stock → lost`, `assigned → discarded`), section 4.2.5, section 4.3 (actor-trust rule), section 4.4, section 6.1, section 6.4, section 6.5, section 9 (Screens 01, 02, 03, 04, 10), section 10, section 21.1, section 21.2, section 22, section 24 (metric qualifiers), and the two new sections 27 (Inventory Counting Definitions and Audit Action Vocabulary) [memory:M3].
- The remainder of the workbook's MVP feature set — the reconciliation dashboard, the assignee directory, asset editing, duplicate-detection UX, empty states, result counts, pagination, improved search, responsive UI, and a design system — which the workbook specifies and which this intent will specify in Requirements Analysis [memory:M3].
- The design-system entry above is an indicative enumeration, not an exhaustive specification: workbook section 11 is the authoritative source for the complete design-system requirements, covering semantic color tokens, a typography scale, spacing tokens, radius and shadow scales, iconography, and a light-theme implementation designed for future dark-theme extension [memory:M3].

### Out of scope

- Complex recovery workflows — partial recovery, credit assignment, dispute handling — which remain deferred and are distinct from the single included `lost → in-stock` recovery transition [memory:M3].
- Any change to the POC's approved scope, approval fingerprints, code, database, tests, or configuration during Stage 1 [Q6].
- Any scope change beyond the approved decision set; scope is fixed for this MVP and changes require a new approval round [Q6].

## Constraints

- The approved decision set is the binding technical and product contract; it is not reopened at this stage [Q6].
- The approved decisions carry seven standing conditions: the uniqueness check uses an IMMEDIATE transaction and a non-zero SQLite `busy_timeout`, mapping `SQLITE_BUSY` to a retryable error; the functional-index expression and the application-level comparison predicate use one shared definition; registration and serial/key updates enforce the same uniqueness policy; historical backfills preserve original records and audit traceability and report failures; dashboard, assignee, asset-list, and CSV counts use consistent filtering and counting definitions; every lifecycle transition has explicit validation and audit behaviour; the existing 66/66 passing test baseline is preserved and regression tests are added for newly approved behaviour [memory:M2].
- Traceability must be maintained between the approved MVP requirements and the POC requirements FR1.3, FR4.4, FR4.5, and FR5.3 [memory:M2].
- The workflow runs all 33 stages with no stage skipped, covering the full operation phase through to feedback and optimization [Q8].
- Actor identity is resolved from trusted server-side context; actor information supplied in a write request is never trusted [memory:M2].

## Assumptions & Open Questions

- The mechanism by which a trusted actor identity is established is not settled by the approved decision set — the POC deferred authentication entirely (constraint C3) and the 17-item decision set does not mention it. Whether the MVP introduces a login, a session, an operator-selection control, or a configured single actor is a product decision with user-visible consequence, and the Audit Completeness metric depends on it. The workbook's rule that actor identity comes from trusted server-side context and never from the write request body still holds. [assumption]
- The full workbook amendment surface is the list given under `### In scope`; the decision set's amendment table names more locations than the two recorded in the initial description, and the §24 metric qualifier that the Audit Completeness population relies on is among them. [assumption]

## Review

Reserved for the reviewer at the approval gate.
