# Intent Capture — Asset Tracker MVP

## Sources

- [desc] Initial description: "Build the Asset Tracker MVP from the approved Asset Tracker MVP Development Workbook, the POC-vs-MVP gap analysis, the decision brief, and the fully approved 17-item decision set. The MVP adds actor-attributed append-only audit history, previous-holder preservation via last_assigned_to, lost-asset recovery (lost to in-stock), an assigned to discarded transition that resolves the assignment inline, five exclusive status buckets with Active Inventory and Total Records computed by one shared counting function and filter builder, case-insensitive category-scoped serial uniqueness via a functional index with a concurrency-safe application-level fallback, CSV export with formula-injection protection, and an amendment to workbook section 4.1 and section 21.1 Scenario 3 recording Returned as a distinct resting state."
- [scope] Workflow-selected scope: `feature`.
- [memory:M1] `aidlc/spaces/default/memory/org.md#Mandated`: "**Conversation language \u2014 resolution**: Every artifact a person reads or reviews is written in the workflow's established conversation language. The orchestrator resolves that language from the human's substantive prose and MUST state it as a `Conversation language: <language>` line in every delegated brief, because a delegated agent or reviewer never sees the conversation and some stages hand it nothing else (a greenfield run of a stage whose `consumes` are all `conditional_on: brownfield` reaches its lead with no upstream artifact at all). Delegated agents and reviewers resolve the language in this order and stop at the first source that answers: (1) the `Conversation language:` line in your brief \u2014 AUTHORITATIVE for delegated work, because the orchestrator regenerates it on every dispatch from the live conversation and it is therefore never staler than a persisted rule; (2) an explicit conversation-language rule in `aidlc/spaces/<active-space>/memory/project.md` \u2014 the FALLBACK for a brief that states no language, and the ONLY file a language switch is ever persisted to, so `project.md` ALWAYS outranks a conversation-language rule in `team.md`, which can only ever be a team default and NEVER the record of a switch (cross-file position is NOT recency: the runtime rule chain concatenates `org \u2192 team \u2192 project \u2192 phase`, so `team.md` reaches you before `project.md` in every bundle no matter which was written last, and the winner is this stated precedence rather than the later position); within `project.md`, when it carries more than one conversation-language rule the LAST one under `## Corrections` is the current one (this tie-break governs conversation-language rules ONLY and leaves the additive rule model untouched; the learnings write path appends and never replaces, so a superseded language rule can still be on disk); (3) the verbatim initial description decoded from `<record>/project-description.json`, falling back to `## Project Information` \u2192 `**Project**` in legacy records, when it carries a real language signal (not the `[Project description]` placeholder, not a bare identifier or path); (4) any artifact or draft you were handed \u2014 the directive's `consumes[]` contracts, the artifact you were dispatched to review, or the lead draft you were dispatched against. Every source is readable on every harness: the rule bundle carries (2) through the dispatch-rules hook on Claude, Codex, and opencode and through always-included agent resources or workspace steering on Kiro, and neither `aidlc-state.md` nor the handed artifacts fall inside the per-unit reviewer read-scope bound."
- [memory:M2] `aidlc/spaces/default/memory/project.md#Decided`: "The fully approved 17-item Asset Tracker MVP decision set, together with the Asset Tracker MVP Development Workbook, is the binding technical and product contract for the `asset-tracker-mvp` intent; it is not reopened at any stage of that intent, and it carries seven standing conditions \u2014 the uniqueness check uses an IMMEDIATE transaction and a non-zero SQLite `busy_timeout` with `SQLITE_BUSY` mapped to a retryable error; the functional-index expression and the application-level comparison predicate use one shared definition; registration and serial/key updates enforce the same uniqueness policy; historical backfills preserve original records and audit traceability and report failures; dashboard, assignee, asset-list, and CSV counts use consistent filtering and counting definitions; every lifecycle transition has explicit validation and audit behaviour; and the existing 66/66 passing test baseline is preserved with regression tests added for newly approved behaviour. Traceability must be maintained between the approved MVP requirements and the POC requirements FR1.3, FR4.4, FR4.5, and FR5.3, and actor identity is resolved from trusted server-side context so actor information supplied in a write request is never trusted. (Stage intent-capture, 2026-11-06)"
- [memory:M3] `aidlc/spaces/default/memory/project.md#Decided`: "The decision set's amendment table names the workbook amendment surface as section 4.1 (transition table, recovery, `in-stock \u2192 lost`, `assigned \u2192 discarded`), section 4.2.5, section 4.3 (the actor-trust rule), section 4.4, section 6.1, section 6.4, section 6.5, section 9 (Screens 01, 02, 03, 04, 10), section 10, section 21.1, section 21.2, section 22, section 24 (the metric qualifiers the Audit Completeness population relies on), and the two new section 27 sections (Inventory Counting Definitions and Audit Action Vocabulary). The section 24 amendment carries the Audit Completeness qualifier verbatim: pre-MVP history is backfilled to a `system` actor and excluded from this metric. Section 4.1 records the `lost \u2192 in-stock` recovery transition with a required recovery reason drawn from the shared loss-reason vocabulary, and requires a distinct `recovered` audit action rather than `assign` or `return`, whose description names the recovery and the prior holder. It also records that complex recovery workflows \u2014 partial recovery, credit assignment, dispute handling \u2014 remain deferred, distinct from the single included recovery transition. The workbook's remaining MVP feature set is the reconciliation dashboard, the assignee directory, asset editing, duplicate-detection UX, empty states, result counts, pagination, improved search, responsive UI, and a design system. The design-system enumeration is indicative, not exhaustive: workbook section 11 is the authoritative source for the complete design-system requirements, covering semantic color tokens, a typography scale, spacing tokens, radius and shadow scales, iconography, and a light-theme implementation designed for future dark-theme extension. (Stage intent-capture, 2026-11-06)"
- [memory:M4] `aidlc/spaces/default/memory/project.md#Decided`: "The `assigned \u2192 discarded` transition resolves the assignment inline and records it: `assigned_to` is cleared, `last_assigned_to` is retained so the holder at discard time stays visible, and a `discarded` audit action records the discard, the prior holder, and the fact that the assignment was resolved by the discard. A discard reason is always required, drawn from the shared loss-reason vocabulary plus retirement-specific values. The asset row and its full history are never deleted; a discarded asset is excluded from Active Inventory but remains present in the `discarded` bucket and in Total Records, and stays accessible at its detail URL with its history intact. (Stage intent-capture, 2026-11-06)"

## Q1. The business problem this MVP solves

The POC's own requirements analysis states that internal teams (IT, HR, Finance, Operations)
track company assets through spreadsheets, email, and paper, with no system of record. The
gap analysis adds three concrete, evidence-backed failures in the POC that motivate this
MVP: a loss event destroys the previous holder's identity, a returned asset's history is
overwritten on reassignment, and the audit trail is destroyed when an asset is deleted.

Which framing best describes the problem this MVP must solve?

- A. Asset accountability is not auditable — when an asset goes missing or is written off, the organisation cannot say who had it, when, and what happened.
- B. Asset records are lost — the audit trail is destroyed on asset deletion, so historical information disappears entirely.
- C. Inventory counts are inconsistent — dashboard, assignee, list, and export counts can disagree, so no one trusts the numbers.
- D. Duplicate assets are created — serial/key uniqueness is case-sensitive and does not survive whitespace, so the same physical asset gets registered twice.
- E. Not yet defined
- X. Other (please specify)

[Answer]: A. Asset accountability is not auditable

## Q2. Who the customer is and what pain they experience

The POC served "a single shared internal user (no authentication)". The MVP adds actor
identity and an actor-attributed audit trail, which implies named internal users.

Which customer group is the primary user of this MVP?

- A. Internal IT asset administrators who register, assign, and write off assets on behalf of the organisation.
- B. A broader internal audience spanning IT, HR, Finance, and Operations, all needing to look up asset custody.
- C. External customers or clients who track assets issued to them.
- D. Not identified
- X. Other (please specify)

[Answer]: A. Internal IT asset administrators

## Q3. What success looks like and which metrics matter

The workbook defines success metrics and a Definition of Done. Which of these should be the
MVP's primary success measures?

- A. Audit Completeness — 100% of audit entries carry an actor attribution, and history is never destroyed.
- B. Count Consistency — dashboard, assignee, list, and export counts always agree.
- C. Data Integrity — no duplicate assets created through the application, under concurrent use.
- D. Transition Coverage — the full lifecycle (including recovery and discard) is available and every transition is recorded.
- E. Not yet defined
- X. Other (please specify)

[Answer]: A. Audit Completeness

## Q4. What triggered this initiative now

The POC was completed and validated the workflow shape. What is the driving pressure for
promoting it to an MVP?

- A. The POC's data-integrity gaps are now blocking real use — the organisation has assets it must account for, and the POC destroys holder history.
- B. Technical debt — the POC's schema and audit design must be corrected before it can carry production data.
- C. Opportunity — the POC proved the shape and the organisation wants to extend it to the full feature set.
- D. Regulation or compliance — an internal or external audit now requires asset custody to be demonstrable.
- E. Not yet defined
- X. Other (please specify)

[Answer]: A. The POC data-integrity gaps block real use

## Q5. Who the key stakeholders are and what each cares about

Which stakeholders shape this MVP, and what does each care about? Choose all that apply.

- A. Asset administrators — accurate custody records, fast lookup, and a usable dashboard.
- B. The organisation's finance function — asset values and write-offs must be defensible.
- C. The organisation's IT leadership — the MVP must be demonstrable and credible to approve.
- D. The end user holding the asset — clarity about what they have and how to return it.
- E. Not identified
- X. Other (please specify)

[Answer]: A, B, C, D

## Q6. Who decides scope and priority, and who influences those decisions

The 17-item decision set was already approved in full, which settles the technical and
product questions. Who retains authority over scope changes from here?

- A. The product owner named in this project — they can add, remove, or re-prioritise scope at any point.
- B. A shared decision between the product owner and the technical lead, where either can veto.
- C. Scope is fixed for this MVP — the approved decision set and the workbook define it, and changes require a new approval round.
- D. Not yet defined
- X. Other (please specify)

[Answer]: C. Scope is fixed for this MVP

## Q7. Communication and reporting cadence

Who needs to see MVP progress, and in what form?

- A. No formal reporting — the product owner reviews at each workflow approval gate.
- B. A periodic summary to stakeholders (for example, a weekly status covering delivered scope and outstanding decisions).
- C. A one-time stakeholder demonstration at MVP completion.
- D. Not applicable
- X. Other (please specify)

[Answer]: B. A periodic summary to stakeholders

## Q8. Whether the workflow-selected scope matches the intended product boundary

The workflow was started with the `mvp` scope, which runs 23 of 33 stages: it skips
market research, team formation, and approval handoff in ideation, and skips the entire
operation phase (deployment, environment provisioning, observability, incident response,
performance validation, feedback). The asset-tracker-mvp workbook itself proposes a 9-stage
AI-DLC execution strategy.

Does the `mvp` scope match your intended product boundary, or do you want a different one?

- A. Confirm the `mvp` scope as selected — the workbook's design gates and stage plan are advisory, and this workflow's own stages govern.
- B. Use a different scope — the MVP must also include the operation phase (deployment, observability, incident response) before it is considered done.
- C. Use a different scope — the MVP must include market research and a formal team/approval handoff ceremony.
- D. Not yet defined
- X. Other (please specify)

[Answer]: B. Use a different scope — the MVP must also include the operation phase (deployment, environment provisioning, observability, incident response, performance validation, feedback). Resolved: the workflow scope was changed from `mvp` to `feature`, which runs 33 of 33 stages with no stage skipped. No completed stage was invalidated.

## Assumption Confirmation

- A. Accept assumptions
- B. Convert to follow-up questions

- [assumption] The mechanism by which a trusted actor identity is established is not settled by the approved decision set — the POC deferred authentication entirely (constraint C3) and the 17-item decision set does not mention it. Whether the MVP introduces a login, a session, an operator-selection control, or a configured single actor is a product decision with user-visible consequence, and the Audit Completeness metric depends on it. The workbook's rule that actor identity comes from trusted server-side context and never from the write request body still holds.
- [assumption] The full workbook amendment surface is the list given under `### In scope`; the decision set's amendment table names more locations than the two recorded in the initial description, and the §24 metric qualifier that the Audit Completeness population relies on is among them.
- [assumption] Which stakeholder group or role holds scope-change authority, and who the periodic stakeholder summary is addressed to, was not answered by the confirmed questions. The confirmed answers settle only that scope is fixed and that a periodic summary is produced [Q6] [Q7].
- [assumption] The relative influence of each stakeholder group over the MVP's prioritisation was not answered by the confirmed questions; only what each group cares about was confirmed [Q5].

[Answer]: A. Accept assumptions

## Consolidated Summary Confirmation

- Looks correct
- Request changes

[Answer]: Looks correct
