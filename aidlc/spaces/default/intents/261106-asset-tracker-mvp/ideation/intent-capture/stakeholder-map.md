# Stakeholder Map — Asset Tracker MVP

## Sources

- [desc] Initial description: "Build the Asset Tracker MVP from the approved Asset Tracker MVP Development Workbook, the POC-vs-MVP gap analysis, the decision brief, and the fully approved 17-item decision set. The MVP adds actor-attributed append-only audit history, previous-holder preservation via last_assigned_to, lost-asset recovery (lost to in-stock), an assigned to discarded transition that resolves the assignment inline, five exclusive status buckets with Active Inventory and Total Records computed by one shared counting function and filter builder, case-insensitive category-scoped serial uniqueness via a functional index with a concurrency-safe application-level fallback, CSV export with formula-injection protection, and an amendment to workbook section 4.1 and section 21.1 Scenario 3 recording Returned as a distinct resting state."
- [scope] Workflow-selected scope: `feature`.
- [Q2] The primary customer is internal IT asset administrators who register, assign, and write off assets on behalf of the organisation.
- [Q3] The primary success measure is Audit Completeness — 100% of audit entries carry an actor attribution, and history is never destroyed.
- [Q5] The key stakeholders are all four identified groups: asset administrators, the finance function, IT leadership, and the end user holding the asset; what each cares about is accurate custody records and defensible write-offs, a demonstrable system, and clarity about what they hold.
- [Q6] Scope is fixed for this MVP; the approved decision set and the workbook define it, and changes require a new approval round.
- [Q7] Progress is reported to stakeholders as a periodic summary covering delivered scope and outstanding decisions.
- [Q8] The product boundary includes the operation phase; the workflow scope was changed from `mvp` to `feature`, which runs 33 of 33 stages with no stage skipped, and no completed stage was invalidated.
- [memory:M1] `aidlc/spaces/default/memory/org.md#Mandated`: "**Conversation language \u2014 resolution**: Every artifact a person reads or reviews is written in the workflow's established conversation language. The orchestrator resolves that language from the human's substantive prose and MUST state it as a `Conversation language: <language>` line in every delegated brief, because a delegated agent or reviewer never sees the conversation and some stages hand it nothing else (a greenfield run of a stage whose `consumes` are all `conditional_on: brownfield` reaches its lead with no upstream artifact at all). Delegated agents and reviewers resolve the language in this order and stop at the first source that answers: (1) the `Conversation language:` line in your brief \u2014 AUTHORITATIVE for delegated work, because the orchestrator regenerates it on every dispatch from the live conversation and it is therefore never staler than a persisted rule; (2) an explicit conversation-language rule in `aidlc/spaces/<active-space>/memory/project.md` \u2014 the FALLBACK for a brief that states no language, and the ONLY file a language switch is ever persisted to, so `project.md` ALWAYS outranks a conversation-language rule in `team.md`, which can only ever be a team default and NEVER the record of a switch (cross-file position is NOT recency: the runtime rule chain concatenates `org \u2192 team \u2192 project \u2192 phase`, so `team.md` reaches you before `project.md` in every bundle no matter which was written last, and the winner is this stated precedence rather than the later position); within `project.md`, when it carries more than one conversation-language rule the LAST one under `## Corrections` is the current one (this tie-break governs conversation-language rules ONLY and leaves the additive rule model untouched; the learnings write path appends and never replaces, so a superseded language rule can still be on disk); (3) the verbatim initial description decoded from `<record>/project-description.json`, falling back to `## Project Information` \u2192 `**Project**` in legacy records, when it carries a real language signal (not the `[Project description]` placeholder, not a bare identifier or path); (4) any artifact or draft you were handed \u2014 the directive's `consumes[]` contracts, the artifact you were dispatched to review, or the lead draft you were dispatched against. Every source is readable on every harness: the rule bundle carries (2) through the dispatch-rules hook on Claude, Codex, and opencode and through always-included agent resources or workspace steering on Kiro, and neither `aidlc-state.md` nor the handed artifacts fall inside the per-unit reviewer read-scope bound."
- [memory:M2] `aidlc/spaces/default/memory/project.md#Decided`: "The fully approved 17-item Asset Tracker MVP decision set, together with the Asset Tracker MVP Development Workbook, is the binding technical and product contract for the `asset-tracker-mvp` intent; it is not reopened at any stage of that intent, and it carries seven standing conditions \u2014 the uniqueness check uses an IMMEDIATE transaction and a non-zero SQLite `busy_timeout` with `SQLITE_BUSY` mapped to a retryable error; the functional-index expression and the application-level comparison predicate use one shared definition; registration and serial/key updates enforce the same uniqueness policy; historical backfills preserve original records and audit traceability and report failures; dashboard, assignee, asset-list, and CSV counts use consistent filtering and counting definitions; every lifecycle transition has explicit validation and audit behaviour; and the existing 66/66 passing test baseline is preserved with regression tests added for newly approved behaviour. Traceability must be maintained between the approved MVP requirements and the POC requirements FR1.3, FR4.4, FR4.5, and FR5.3, and actor identity is resolved from trusted server-side context so actor information supplied in a write request is never trusted. (Stage intent-capture, 2026-11-06)"
- [memory:M3] `aidlc/spaces/default/memory/project.md#Decided`: "The decision set's amendment table names the workbook amendment surface as section 4.1 (transition table, recovery, `in-stock \u2192 lost`, `assigned \u2192 discarded`), section 4.2.5, section 4.3 (the actor-trust rule), section 4.4, section 6.1, section 6.4, section 6.5, section 9 (Screens 01, 02, 03, 04, 10), section 10, section 21.1, section 21.2, section 22, section 24 (the metric qualifiers the Audit Completeness population relies on), and the two new section 27 sections (Inventory Counting Definitions and Audit Action Vocabulary). The section 24 amendment carries the Audit Completeness qualifier verbatim: pre-MVP history is backfilled to a `system` actor and excluded from this metric. Section 4.1 records the `lost \u2192 in-stock` recovery transition with a required recovery reason drawn from the shared loss-reason vocabulary, and requires a distinct `recovered` audit action rather than `assign` or `return`, whose description names the recovery and the prior holder. It also records that complex recovery workflows \u2014 partial recovery, credit assignment, dispute handling \u2014 remain deferred, distinct from the single included recovery transition. The workbook's remaining MVP feature set is the reconciliation dashboard, the assignee directory, asset editing, duplicate-detection UX, empty states, result counts, pagination, improved search, responsive UI, and a design system. The design-system enumeration is indicative, not exhaustive: workbook section 11 is the authoritative source for the complete design-system requirements, covering semantic color tokens, a typography scale, spacing tokens, radius and shadow scales, iconography, and a light-theme implementation designed for future dark-theme extension. (Stage intent-capture, 2026-11-06)"
- [memory:M4] `aidlc/spaces/default/memory/project.md#Decided`: "The `assigned \u2192 discarded` transition resolves the assignment inline and records it: `assigned_to` is cleared, `last_assigned_to` is retained so the holder at discard time stays visible, and a `discarded` audit action records the discard, the prior holder, and the fact that the assignment was resolved by the discard. A discard reason is always required, drawn from the shared loss-reason vocabulary plus retirement-specific values. The asset row and its full history are never deleted; a discarded asset is excluded from Active Inventory but remains present in the `discarded` bucket and in Total Records, and stays accessible at its detail URL with its history intact. (Stage intent-capture, 2026-11-06)"

## Key Stakeholders and Their Interests

| Stakeholder | What they care about | Source |
|---|---|---|
| Asset administrators | Accurate custody records, fast lookup, and a usable dashboard | [Q5] |
| The organisation's finance function | Asset values and write-offs must be defensible | [Q5] |
| The organisation's IT leadership | The MVP must be demonstrable and credible to approve | [Q5] |
| The end user holding the asset | Clarity about what they have and how to return it | [Q5] |

The asset administrators are also the primary customer: they register, assign, and write off assets on behalf of the organisation [Q2].

### How each stakeholder group is affected

- **Asset administrators** are the direct beneficiaries of the corrected data model — the MVP preserves the previous holder instead of erasing them, and offers recovery and write-off as first-class, audited actions rather than workarounds [desc] [memory:M3] [memory:M4].
- **The finance function** can defend a write-off because a discarded asset requires a discard reason, resolves its assignment inline, and records who discarded what and when in the audit trail [memory:M4].
- **IT leadership** receives a single checkable claim rather than a list of features: Audit Completeness — 100% of audit entries carry an actor attribution, and history is never destroyed [Q3].
- **The end user holding the asset** gets a distinct `returned` resting state in the model and in the workbook amendment, so an asset that is with its holder is not conflated with one that is on the shelf [desc].

## Decision-Makers vs. Influencers

| Aspect | Position | Source |
|---|---|---|
| Scope authority | Scope is fixed for this MVP. The approved 17-item decision set and the workbook define it, and changes require a new approval round | [Q6] |
| Reporting cadence | A periodic summary to stakeholders covering delivered scope and outstanding decisions | [Q7] |

## Communication Requirements

| Requirement | Detail | Source |
|---|---|---|
| Progress reporting | A periodic summary to stakeholders covering delivered scope and outstanding decisions | [Q7] |
| Scope-change communication | Any scope change requires a new approval round | [Q6] |
| Product boundary | The MVP includes the operation phase; the workflow scope was changed from `mvp` to `feature` | [Q8] |

## Initial Scope Signal

- **Workflow-selected scope**: `feature` — the full-lifecycle run, 33 of 33 stages, no stage skipped [scope].
- **User-confirmed product boundary**: The MVP must also include the operation phase (deployment, environment provisioning, observability, incident response, performance validation, feedback); the workflow scope was changed from `mvp` to `feature` accordingly [Q8].

## Constraints Carried by This Map

- Artefacts are written in the workflow's established conversation language [memory:M1].
- The POC's committed scope, approval fingerprints, code, database, tests, and configuration are not modified during ideation [Q6].
- New MVP work is isolated in the `asset-tracker-mvp` intent and traceable to POC requirements FR1.3, FR4.4, FR4.5, and FR5.3 [memory:M2].

## Assumptions & Open Questions

- Which stakeholder group or role holds scope-change authority, and who the periodic stakeholder summary is addressed to, was not answered by the confirmed questions. The confirmed answers settle only that scope is fixed and that a periodic summary is produced [Q6] [Q7]. [assumption]
- The relative influence of each stakeholder group over the MVP's prioritisation was not answered by the confirmed questions; only what each group cares about was confirmed [Q5]. [assumption]

## Review

Reserved for the reviewer at the approval gate.
