# Decision Log — Asset Tracker MVP, Ideation Phase

Stage: `approval-handoff` (Ideation, 1.7)
Intent: `261106-asset-tracker-mvp`
Scope: `feature` — 33 of 33 stages, no stage skipped
Phase boundary: **IDEATION → INCEPTION**

This log records every decision made during the Ideation phase, in the order it
was taken, with the stage that owns it, the substance of the decision, and its
standing in the release.

---

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
- [Q8] The Product Owner's approval in this round authorizes the intent and scope as the agreed project baseline. It does not represent or imply that all four stakeholder groups have independently reviewed or endorsed the documents. Asset administrators, Finance, IT leadership, and asset holders will receive the agreed periodic progress summary. Any material objection or proposed scope change raised by a stakeholder will be recorded and brought to the Product Owner for consideration through the established human approval process. No additional pre-approval consultation round is required.
- [Q9] Acknowledge all sixteen risks as recorded, preserving their current open status, mitigations, and named ownership. R-01 — Migration runner: gate foundation implementation on demonstrated migration safety. Before either structural rebuild is applied, test the migration runner against a representative copy of the existing populated SQLite database. The test must demonstrate successful assets-table rebuilding, row-for-row preservation of existing asset data, preservation of audit history, and successful migration completion. Do not use the live operational database as the test target. Record the test evidence before proceeding with the foundation migrations. R-02 — Organisational adoption readiness: keep this risk open. Resolve adoption readiness through the established stakeholder process before operational readiness is accepted. Do not assume adoption risk is low or resolved. R-15 — Single-developer concentration: retain the documented ADR practice and mandatory design-board checkpoint before foundation implementation. Use stakeholder and specialist consultation where needed, without introducing a second implementation author or assuming uncommitted external support. All remaining risks retain their existing status, owners, and recorded mitigations. Approval of this initiative does not mean that the sixteen risks are closed or that their mitigations have already been completed.
- [Q10] No new resource commitment. The MVP proceeds on existing capacity, with the actor-identity resolution and the design-board checkpoint taking precedence over every other item in the queue, and no date or throughput figure committed.
- [Q11] Yes. The eight screens and documented flows are accepted as the Product Owner-approved concept and reflect the approved intent, scope, and design decisions. The two deliberately omitted discard transitions retain their approved standing and remain tracked as Q19 for the Scope stage. WCAG 2.1 AA is accepted as the design floor established during Rough Mockups. The actor indicator remains a provisional presentation element, not a decision on the actor-identity mechanism. This acceptance does not claim independent endorsement by all four stakeholder groups; their periodic progress summaries and feedback remain part of the stakeholder process.
- [Q12] Yes, as recorded. The Build position stands on the capability and auditability grounds recorded, and the hypothesis-confidence off-the-shelf comparison is accepted as a recorded uncertainty rather than a resolved finding.
- [Q13] Staffed, and scheduled by dependency order. The groups are staffed as recorded — one developer, with reviewers at three defined points — and the order is the risk-first sequence: actor decision, design board, foundation, lifecycle, count-consistency group, remaining must-haves, cross-cutting work.
- [Q14] As the first Inception action, with the actor-independent work specified in parallel. The shared counting definition's specification, the CSV export's formula-injection contract, and the workbook amendment surface proceed while I-01 is open, because none of them depends on the actor model.
- [memory:M2] `aidlc/spaces/default/memory/project.md#Decided`: "The fully approved 17-item Asset Tracker MVP decision set, together with the Asset Tracker MVP Development Workbook, is the binding technical and product contract for the `asset-tracker-mvp` intent; it is not reopened at any stage of that intent, and it carries seven standing conditions — the uniqueness check uses an IMMEDIATE transaction and a non-zero SQLite `busy_timeout` with `SQLITE_BUSY` mapped to a retryable error; the functional-index expression and the application-level comparison predicate use one shared definition; registration and serial/key updates enforce the same uniqueness policy; historical backfills preserve original records and audit traceability and report failures; dashboard, assignee, asset-list, and CSV counts use consistent filtering and counting definitions; every lifecycle transition has explicit validation and audit behaviour; and the existing 66/66 passing test baseline is preserved with regression tests added for newly approved behaviour. Traceability must be maintained between the approved MVP requirements and the POC requirements FR1.3, FR4.4, FR4.5, and FR5.3, and actor identity is resolved from trusted server-side context so actor information supplied in a write request is never trusted. (Stage intent-capture, 2026-11-06)"
- [memory:M3] `aidlc/spaces/default/memory/project.md#Decided`: "The decision set's amendment table names the workbook amendment surface as section 4.1 (transition table, recovery, `in-stock → lost`, `assigned → discarded`), section 4.2.5, section 4.3 (the actor-trust rule), section 4.4, section 6.1, section 6.4, section 6.5, section 9 (Screens 01, 02, 03, 04, 10), section 10, section 21.1, section 21.2, section 22, section 24 (the metric qualifiers the Audit Completeness population relies on), and the two new section 27 sections (Inventory Counting Definitions and Audit Action Vocabulary). The section 24 amendment carries the Audit Completeness qualifier verbatim: pre-MVP history is backfilled to a `system` actor and excluded from this metric. Section 4.1 records the `lost → in-stock` recovery transition with a required recovery reason drawn from the shared loss-reason vocabulary, and requires a distinct `recovered` audit action rather than `assign` or `return`, whose description names the recovery and the prior holder. It also records that complex recovery workflows — partial recovery, credit assignment, dispute handling — remain deferred, distinct from the single included recovery transition. The workbook's remaining MVP feature set is the reconciliation dashboard, the assignee directory, asset editing, duplicate-detection UX, empty states, result counts, pagination, improved search, responsive UI, and a design system. The design-system enumeration is indicative, not exhaustive: workbook section 11 is the authoritative source for the complete design-system requirements, covering semantic color tokens, a typography scale, spacing tokens, radius and shadow scales, iconography, and a light-theme implementation designed for future dark-theme extension. (Stage intent-capture, 2026-11-06)"
- [memory:M4] `aidlc/spaces/default/memory/project.md#Decided`: "The `assigned → discarded` transition resolves the assignment inline and records it: `assigned_to` is cleared, `last_assigned_to` is retained so the holder at discard time stays visible, and a `discarded` audit action records the discard, the prior holder, and the fact that the assignment was resolved by the discard. A discard reason is always required, drawn from the shared loss-reason vocabulary plus retirement-specific values. The asset row and its full history are never deleted; a discarded asset is excluded from Active Inventory but remains present in the `discarded` bucket and in Total Records, and stays accessible at its detail URL with its history intact. (Stage intent-capture, 2026-11-06)"

---

## How to read this log

A decision in this log is **binding** unless its standing column says
otherwise. Four standings appear:

| Standing | Meaning |
|---|---|
| **Binding** | Fixed for the whole initiative. No later stage reopens it; a change requires a new human approval round. |
| **Release condition** | A constraint the release must satisfy, recorded as a release requirement and checked by the consuming stage. |
| **Deferred** | Approved but not in this release. Keeps its approved standing and carries a named pull-forward trigger. |
| **Open** | Not decided. Carried forward with a named next action. An open decision is never silently closed by a later stage. |

A decision taken in Ideation is not a schedule, an estimate, or a budget. Nothing
in this log commits a date, a throughput figure, or an effort number.

---

## Part 1 — Intent Capture

**Owner:** `aidlc-product-agent` · **Artifact:** `intent-statement.md`, `stakeholder-map.md`

| # | Decision | Standing |
|---|---|---|
| D-01 | The customer is the internal IT asset administrator who registers, assigns, and writes off assets on behalf of the organisation. | Binding |
| D-02 | Audit Completeness is the primary success measure: 100% of audit entries carry an actor attribution, and no asset deletion destroys an audit row. Pre-MVP history is backfilled to a `system` actor and excluded from that population, per the section 24 qualifier [memory:M3]. | Binding |
| D-03 | Four stakeholder groups are in scope for this intent: asset administrators, the finance function, IT leadership, and the end user holding the asset. | Binding |
| D-04 | Scope is fixed for this MVP. The approved decision set and the workbook define it; a change requires a new approval round [Q4]. | Binding |
| D-05 | Progress is reported to stakeholders as a periodic summary covering delivered scope and outstanding decisions [Q5]. | Binding |
| D-06 | The product boundary includes the operation phase. The workflow scope was changed from `mvp` to `feature`, which runs 33 of 33 stages with no stage skipped; no completed stage was invalidated [Q6]. | Binding |
| D-07 | There is no fixed deadline and no separate budget. The MVP proceeds as ordinary engineering time; the deployment target is a single internal host with a machine-local SQLite file [Q7]. | Binding |
| D-08 | The actor-trust rule is fixed: actor identity is resolved from trusted server-side context, and actor information supplied in a write request is never trusted [memory:M2]. The **mechanism** is not fixed here — it is a blocking dependency of the foundation workstream (see D-24). | Binding (rule) / Open (mechanism) |

---

## Part 2 — Market Research

**Owner:** `aidlc-product-agent` · **Artifacts:** `competitive-analysis.md`, `market-trends.md`, `build-vs-buy.md`

| # | Decision | Standing |
|---|---|---|
| D-09 | The incumbent is a spreadsheet-and-email process; there is no system of record, and custody lives in documents that are copied, forwarded, and reconciled by hand. | Binding |
| D-10 | The differentiator is auditability, not feature count. Four capabilities are table stakes (registration, assignment, status tracking, write-off); nine properties make the custody record defensible, and each is an architectural invariant, a domain rule, or a consistency-by-construction guarantee. | Binding |
| D-11 | Roughly 35–40% of the foundational work already exists in the POC. The build extends the POC rather than replacing it. | Binding |
| D-12 | **Build**, not buy. The position rests on capability and auditability grounds. The off-the-shelf comparison is recorded at **hypothesis** confidence only — no vendor survey was performed — and the licence cost is indeterminate (I-04) [Q12]. | Binding (position) / Open (hypothesis comparison) |
| D-13 | Four market hypotheses remain open. The highest-leverage one is whether the actor mechanism can be settled without introducing deferred authentication. | Open |

---

## Part 3 — Feasibility and Constraint Analysis

**Owner:** `aidlc-architect-agent`, supported by `aidlc-compliance-agent` · **Artifacts:** `feasibility-assessment.md`, `constraint-register.md`, `raid-log.md`

| # | Decision | Standing |
|---|---|---|
| D-14 | The initiative is **Feasible**, with two qualifications (D-15 and D-16). The technical claims were verified by execution against a live instance, not by reading source. | Binding |
| D-15 | **Qualification 1.** The migration runner is load-bearing and least-covered: both structural rebuilds run through it. Foundation implementation is gated on demonstrated migration safety against a representative copy of the populated SQLite database — demonstrating `assets`-table rebuilding, row-for-row data preservation, audit-history preservation, and successful completion. The live operational database is never the test target, and the evidence is recorded before the rebuilds proceed [Q9]. | Release condition |
| D-16 | **Qualification 2.** The design system is the largest unestimated body of work. It is deferred from this release, and its estimate is retired early under the risk-first heuristic because the gap analysis's 6–8 week figure is explicitly conditional on scoping that workstream. | Deferred (estimate retired early) |
| D-17 | Sixteen risks are open. None is closed. R-01 (migration runner), R-02 (organisational adoption readiness), and R-15 (single-developer concentration) carry the named positions recorded at D-15, D-18, and D-27 respectively; the other thirteen retain their recorded status, owners, and mitigations [Q9]. | Open (all sixteen) |
| D-18 | **R-02 stays open.** Organisational adoption readiness is resolved through the established stakeholder process before operational readiness is accepted. It is not assumed low or resolved [Q9]. | Open |
| D-19 | The verified baseline shows the estate contains no authentication code, no session handling, no user store, no identity provider, and no authenticating proxy. This is recorded as a fact about the codebase, not as a finding about the organisation — no candidate is assumed available, and none is assumed unavailable. | Binding (as a baseline fact) |
| D-20 | The actor-mechanism candidate shortlist is four options: a server-configured single operator (negligible cost); a trusted request header from an authenticating proxy (low cost, but requires a proxy that must already exist); operator selection (weak — the operator remains self-declared); application-managed login (substantial — sessions, credential storage, a password lifecycle, an authorisation surface). The recommendation is a **sequencing** recommendation, not a mechanism choice. | Binding (shortlist) / Open (choice) |

---

## Part 4 — Scope Definition

**Owner:** `aidlc-product-agent` · **Artifacts:** `scope-document.md`, `intent-backlog.md`

| # | Decision | Standing |
|---|---|---|
| D-21 | The approved set is the **ceiling**; the release sets the **floor**. Five areas are in the release: the audit-first floor, the lifecycle floor, the five operator must-haves, integrity and safety, and the workbook amendment surface [memory:M3]. | Binding |
| D-22 | Five capabilities are deferred, not rejected. Each keeps its approved standing, is a named follow-on backlog item, and carries a pull-forward trigger: **C-01** design system (§11) — the start of the deferred increment; **C-02** responsive UI — when C-01's breakpoints and spacing tokens land; **C-03** improved search — when C-01's control vocabulary lands; **C-04** pagination and result counts — when the asset count grows beyond the confirmed medium scale; **C-05** empty states — when C-01's vocabulary lands. The POC's existing search and the POC's bare empty row remain in the release. | Deferred |
| D-23 | Three invariants are approved and hold for the whole release. **INV-1** — audit history is append-only and survives asset deletion. **INV-2** — the five status buckets are exclusive, and a discarded asset's row and history are never deleted. **INV-3** — dashboard, assignee, asset-list, and CSV counts share one filtering and counting definition. These are the **only** things that may retire existing POC behaviour; everything the POC does is preserved by default, and the boundary is these three rather than a behaviour-by-behaviour audit. | Binding |
| D-24 | The actor-identity mechanism is **in scope; the choice is deferred**. The rule is fixed (D-08), the mechanism is a named **blocking dependency** of the foundation workstream, and it is not resolved by narrowing the work. | Open (blocking) |
| D-25 | Two groups are **indivisible** and are delivered whole: the foundation workstream (PB-01 + PB-02) and the count-consistency group (PB-04). A group shipping all but one of its members has no guarantee at all — it ships the exact defect the group exists to remove. | Binding |
| D-26 | The release's delivery shape is the ten ranked proto-Units in the intent backlog, ordered risk-first: actor decision → design board → foundation → lifecycle → count-consistency group → remaining must-haves → cross-cutting work [Q13]. The release boundary is set with MoSCoW and the backlog ordered with WSJF; RICE's Reach term is not scored, because no usage telemetry exists for the system being prioritised, and the relative scores are judgements between backlog items rather than effort estimates. | Binding |

---

## Part 5 — Rough Mockups

**Owner:** `aidlc-design-agent` · **Artifacts:** `wireframes.md`, `user-flow.md`

| # | Decision | Standing |
|---|---|---|
| D-27 | The concept is **eight screens (W1–W8) and seven flows (F1–F6 with F5's variants)**, and is accepted as the Product Owner-approved concept [Q11]. | Binding |
| D-28 | The lifecycle map is drawn from the **approved amendment surface**, not from the rendering artifact: exactly five states and eight drawn edges, out of the ten edges of the approved §4.1 transition table. **Ten approved = eight drawn + two omitted.** The two omitted — `in-stock → discarded` and `returned → discarded` — are omitted deliberately, not withdrawn, because a discard resolves a live assignment inline and neither source state holds one. Their approved standing is intact and they remain tracked as Q19 for the Scope stage [Q11], [memory:M3], [memory:M4]. | Binding |
| D-29 | `discarded` is terminal — no edge leaves it. `lost` is no longer a dead end: the recovery path replaces the POC's "cannot be transitioned" message. `in-stock → lost` exists so an asset registered into stock and later found missing has a way to record the loss. | Binding |
| D-30 | Every count on the dashboard, the asset list, the holder directory, and the CSV export is a read from **one** shared counting function through **one** filter builder [memory:M2]. The dashboard frame reconciles: the five bucket tiles sum to Total Records, and Total Records minus the discarded bucket equals Active Inventory. | Release condition |
| D-31 | The reason dialog is rendered from the asset's current status, and each variant is drawn — a dialog shared across several transitions does not have one set of copy. | Binding |
| D-32 | **WCAG 2.1 AA** is the design floor: colour is never the only carrier of meaning, every control is keyboard-reachable, form errors are associated with their field, one `h1` per screen with landmarks, and a skip link as the first focusable element on every screen [Q11]. | Binding |
| D-33 | The concept deliberately shows **no** login screen, **no** operator-selection picker, **no** loading state (the application is synchronous and server-rendered), **no** empty states (deferred), **no** responsive variants, **no** holder detail page, and **no** bulk-edit surface. The `Acting as` indicator is drawn read-only, reserving the layout without asserting a mechanism. | Binding |
| D-34 | The design system's partial coverage is recorded against the *deferred increment*, where it belongs, and does not count against the release. The fifth `discarded` status chip reuses the stylesheet's existing muted grey rather than introducing a new semantic token, because the design system is deferred and a token specified now would be reworked when the tokens land. | Binding |

---

## Part 6 — Team Formation

**Owner:** `aidlc-delivery-agent` · **Artifacts:** `team-assessment.md`, `mob-composition.md`, `skill-matrix.md`

| # | Decision | Standing |
|---|---|---|
| D-35 | The roster is **one developer** plus named reviewers from IT leadership, finance, and operations. The reviewers are **not authors**. | Binding |
| D-36 | The topology is a **single-owner stream with an explicit design-board checkpoint before the foundation** — not a mob programme. A mob requires two or more people working together in real time; the confirmed facts are one person, one location, and no working overlap, so there is nobody to rotate the driver with. | Binding |
| D-37 | The design board is a **condition of proceeding**, not a ceremony: the foundation is not built until the board has reviewed its design. It is chaired by the Product Owner, with the developer presenting and IT leadership consulted — the constituency whose answer to I-01 the foundation depends on. | Release condition |
| D-38 | The capacity position is an **allocation rule**, not a figure. There is no date, no velocity, and no budget; capacity is finite and unquantified. The rule: the actor-identity resolution and the design-board checkpoint take precedence over every other item in the queue, and no other work may displace them [Q10]. | Binding |
| D-39 | Reviewer participation is **event-driven rather than continuous**, structured around three review points: the actor-mechanism decision, the operational-readiness sign-off, and the internal-reviewer demonstration. The specific individuals must be named before the first review point is scheduled; until then the groups are staffed but not scheduled. | Binding (structure) / Open (individuals) |
| D-40 | The skill position: the **build skills are covered; the operational skills are where the gaps are**. Every gap — backup-and-restore design and rehearsal, CI authoring, incident response — sits in the operation phase, which is inside the release because the scope is `feature`. No gap is a blocker on the foundation. | Binding |
| D-41 | Skill-gap remediation is routed to a **trigger** — the arrival of the work that depends on it — rather than to a calendar date, because that is the only form compatible with an unquantified capacity and no deadline. The closing mechanisms are the three the team confirmed: research, consultation outside the team, or specialist help. | Binding |
| D-42 | Five inherited obligations land on this team: the 66/66 passing test baseline as a merge gate [memory:M2]; the absence of any CI workflow; the single-copy database file (backup-and-restore must be **exercised**, not merely written); the migration runner's coverage; and the unconditional update path, which makes `last_assigned_to` retention and `assigned_to` clearing during a discard deliberate rather than incidental. | Binding |
| D-43 | The actor-identity block is **not** a skill gap. It is a decision the organisation has to answer, and it is routed as a blocking dependency rather than as remediation work. | Binding |
| D-44 | Where a decision whose outcome changes the size of a foundational change is still open, the resolution is **sequenced forward** and the block is worked around, rather than every branch being prepared in parallel. | Binding |

---

## Part 7 — Approval and Handoff

**Owner:** `aidlc-delivery-agent`, supported by `aidlc-product-agent` · **Artifacts:** `initiative-brief.md`, `approval-handoff-questions.md`

| # | Decision | Standing |
|---|---|---|
| D-45 | **Stakeholder agreement.** The Product Owner's approval in this round authorizes the intent and scope as the agreed project baseline. It does **not** represent that all four stakeholder groups have independently reviewed or endorsed the documents. The four groups receive the agreed periodic progress summary, and any material objection or proposed scope change is recorded and brought to the Product Owner through the established human approval process. No additional pre-approval consultation round is required [Q8]. | Binding |
| D-46 | **Risk acknowledgment.** All sixteen risks are acknowledged as recorded, preserving their current open status, mitigations, and named ownership. Approval of the initiative does not mean the risks are closed or their mitigations completed [Q9]. | Binding |
| D-47 | **Resource.** No new resource commitment. The MVP proceeds on existing capacity under the allocation rule at D-38, with no date or throughput figure committed [Q10]. | Binding |
| D-48 | **Concept acceptance.** The eight screens and documented flows are accepted as the Product Owner-approved concept; the two omitted discard transitions keep their approved standing and remain tracked as Q19; WCAG 2.1 AA is accepted as the design floor; the actor indicator remains a provisional presentation element, not a decision on the mechanism [Q11]. | Binding |
| D-49 | **Market position.** The Build position stands on the capability and auditability grounds recorded, and the hypothesis-confidence off-the-shelf comparison is accepted as a recorded uncertainty rather than a resolved finding [Q12]. | Binding |
| D-50 | **Working groups.** The groups are staffed as recorded and scheduled by dependency order, following the risk-first sequence [Q13]. | Binding |
| D-51 | **The actor dependency.** I-01 is resolved as the **first Inception action**, and the actor-independent work — the shared counting definition's specification, the CSV export's formula-injection contract, and the workbook amendment surface — is specified in parallel, because none of it depends on the actor model [Q14]. | Binding |
| D-52 | **Go / No-Go.** **GO**, with a gated entry. Five conditions attach: I-01 resolved first; the design board reviews the foundation's design before any foundation work is built; foundation implementation gated on demonstrated migration safety; R-02 stays open until the stakeholder process resolves it; the actor-independent work is specified in parallel. | Binding |

---

## The condition set carried into Inception

The approved decision set is the binding technical and product contract, and it is
not reopened at any stage of this intent. Seven standing conditions travel with
it [memory:M2]:

| # | Standing condition | Enforced by |
|---|---|---|
| C-1 | The uniqueness check uses an IMMEDIATE transaction and a non-zero SQLite `busy_timeout`, with `SQLITE_BUSY` mapped to a retryable error. | Code generation, build and test |
| C-2 | The functional-index expression and the application-level comparison predicate use one shared definition. | INV-3's shared-definition discipline (D-23) |
| C-3 | Registration and serial/key updates enforce the same uniqueness policy. | INV-3's shared-definition discipline (D-23) |
| C-4 | Historical backfills preserve original records and audit traceability and report failures. | Foundation workstream (PB-01/PB-02) |
| C-5 | Dashboard, assignee, asset-list, and CSV counts use consistent filtering and counting definitions. | INV-3 (D-23), D-30 |
| C-6 | Every lifecycle transition has explicit validation and audit behaviour. | Lifecycle workstream (PB-03) |
| C-7 | The existing 66/66 passing test baseline is preserved, with regression tests added for newly approved behaviour. | Merge gate (D-42) |

Traceability must be maintained between the approved MVP requirements and the POC
requirements FR1.3, FR4.4, FR4.5, and FR5.3 [memory:M2].

---

## The open items that travel with the release

None of these is closed by this approval. Each is recorded with its owner and
its next action.

| Item | What it is | Next action | Owner |
|---|---|---|---|
| **I-01 / I-03** | Whether a trusted authentication mechanism exists anywhere in the organisation. The blocking dependency on the actor decision (PB-00, D-24). | Gather the internal existing-tool inventory. This is the first Inception action (D-51) | Product Owner, with IT leadership |
| **I-02** | Whether a records-retention or disposal schedule applies to asset custody records. | Route to the compliance function; do not assume in either direction | Compliance |
| **I-04** | The unquoted licence cost of the off-the-shelf alternative. | Closed as irrelevant to the Build position unless the comparison is reopened; remains a recorded uncertainty | Product Owner |
| **R-02** | Organisational adoption readiness. | Resolve through the stakeholder process before operational readiness is accepted (D-18) | Product Owner |
| **Q19** | The release-boundary question raised by the two omitted discard transitions. | Resolve at the Scope stage in Inception; the transitions keep their approved standing meanwhile (D-28) | Product Owner |
| **D-39 / reviewers** | The specific individuals behind the three review points. | Name them before the first review point is scheduled | Product Owner |
| **Stakeholder availability** | The response times the four stakeholder groups will commit to. | Confirm in Inception; it gates the foundation's schedule | Product Owner |

---

## What this log does not decide

- **No date, no velocity figure, no effort estimate, no budget.** The only
  timing-adjacent decision is the allocation rule at D-38.
- **No closure** of any of the sixteen risks, twelve assumptions, six issues, or
  thirteen dependencies.
- **No independent stakeholder endorsement.** D-45 is explicit that the Product
  Owner's approval establishes the project baseline and nothing more.
- **No choice of the actor-identity mechanism.** D-24 keeps the mechanism open and
  names it a blocking dependency.
- **No re-opening** of the approved decision set, the workbook, or the POC code.
  Stage-1 POC modification is out of scope, and the POC's implementation is not
  touched by any decision in this log.

---

## Assumptions & Open Questions

- [assumption] The approved decision set and the Asset Tracker MVP Development Workbook remain the binding technical and product contract for this intent, with their seven standing conditions treated as release requirements rather than as suggestions. (memory:M2, memory:M3, memory:M4)
- [assumption] The release boundary recorded in the scope document is the release contents, and the five deferrals — design system, responsive UI, improved search, pagination and result counts, and empty states — are deferred rather than rejected. Each keeps its approved standing and carries a named pull-forward trigger. (Q11)
- [assumption] The three open items ride with the release unchanged: I-01 / I-03 (whether a trusted authentication mechanism exists anywhere in the organisation), I-02 (whether a records-retention or disposal schedule applies to asset custody records), and I-04 (the unquoted licence cost). None is assumed resolved in either direction by this approval. (Q9, Q14)
- [assumption] Organisational adoption readiness (R-02) remains open at the human's direction. It is a rollout risk, not a scope defect, and no scope or priority decision retires it. (Q9)
- [assumption] The ten proto-Units and their risk-first ordering are the release's delivery shape. The two indivisible groups — the foundation workstream and the count-consistency group — are delivered whole and are never split across increments. (Q13)
- [assumption] The capacity position is an allocation rule rather than a figure: the actor-identity resolution and the design-board checkpoint take precedence over every other item in the queue, and no date, throughput, or effort figure is committed by this approval. (Q10)
- [assumption] The reviewer constituency is recorded by constituency rather than by individual, because the confirmed team-formation answer names IT leadership, finance, and operations without naming the people. The specific individuals must be named before the first review point is scheduled, and until then the groups are staffed but not scheduled. (Q13)
- [assumption] The off-the-shelf comparison in the market research remains at hypothesis confidence. It is recorded as an uncertainty in this log, not presented as a surveyed finding, and the Build position rests on the capability and auditability grounds rather than on that comparison. (Q12)
- [assumption] The rough mockups are the concept the stakeholders review, with the actor indicator drawn read-only and marked provisional. If PB-00 selects the operator-selection candidate, the indicator becomes interactive and the wireframes change; that consequence is recorded rather than pre-empted. (Q11)
- [assumption] The two omitted discard edges — `in-stock → discarded` and `returned → discarded` — keep their approved standing and are not withdrawn, reclassified, or deferred by this stage. The release-boundary question they raise was carried to the scope stage as a named open question (Q19) and remains one. (Q11, memory:M3, memory:M4)
- [assumption] The existing 66/66 passing test baseline is a merge gate the release preserves, and the absence of any CI workflow is an inherited obligation the build-and-test stage owns rather than a skill gap the current team cannot cover. (memory:M2)
- [assumption] The design system remains the largest single body of unestimated work in the initiative and is deferred from this release, with its estimate retired early under the risk-first heuristic. It is not a release deliverable and no later stage may read it as one. (memory:M3)
- [assumption] The single-developer concentration risk is accepted with its mitigation — the architectural decisions recorded as ADRs and the design-board checkpoint before the foundation — rather than by adding a second author. The confirmed answers are explicit that the reviewers are not authors. (Q9, Q13)
- [assumption] This log presents the Ideation phase's decisions as they stand. This stage does not open new technical questions, and any issue it surfaces that needs a decision is recorded as an open item rather than resolved here. (Q8, Q14)

---

## Sources Consumed

- **intent-statement** (`ideation/intent-capture/intent-statement.md`) — the problem statement, the target customer, the Audit Completeness metric and its measurable form, the confirmed scope bounds, and the actor-trust rule.
- **stakeholder-map** (`ideation/intent-capture/stakeholder-map.md`) — the four stakeholder groups, their interests, the decision-maker/influencer split, and the periodic summary cadence.
- **competitive-analysis** (`ideation/market-research/competitive-analysis.md`) — the table-stakes and differentiator split, the nine auditability properties, and the off-the-shelf comparison at hypothesis confidence.
- **market-trends** (`ideation/market-research/market-trends.md`) — the six trends and the four open hypotheses.
- **build-vs-buy** (`ideation/market-research/build-vs-buy.md`) — the four alternatives, the seven-criterion evaluation, the Build position, and the indeterminate total-cost row.
- **feasibility-assessment** (`ideation/feasibility/feasibility-assessment.md`) — the verified baseline, the ten-capability viability table, the actor-trust evaluation and candidate shortlist, the effort and sequencing table, and the two qualifications.
- **constraint-register** (`ideation/feasibility/constraint-register.md`) — the binding technical, organisational, deployment, and data constraints.
- **raid-log** (`ideation/feasibility/raid-log.md`) — the sixteen risks, twelve assumptions, six issues, thirteen dependencies, and their named owners.
- **scope-document** (`ideation/scope-definition/scope-document.md`) — the release boundary, the two indivisible groups, the three invariants, the actor-identity boundary, and the open items that ride with the release.
- **intent-backlog** (`ideation/scope-definition/intent-backlog.md`) — the ten ranked proto-Units, the deferred set C-01 through C-05 with their triggers, and the value stream map.
- **team-assessment** (`ideation/team-formation/team-assessment.md`) — the roster, the capacity allocation agreement, the RACI matrix, and the inherited obligations.
- **mob-composition** (`ideation/team-formation/mob-composition.md`) — the topology decision, the working groups, the sequence of work, the checkpoints, and the onboarding checklist.
- **skill-matrix** (`ideation/team-formation/skill-matrix.md`) — the skill coverage position, the gap analysis, and the thirteen trigger-based remediations.
- **team-formation-questions** (`ideation/team-formation/team-formation-questions.md`) — the nine confirmed team-formation answers and the nine accepted assumptions.
- **wireframes** (`ideation/rough-mockups/wireframes.md`) — the eight screens, the shared frame, the per-screen accessibility notes, the screen-state table, the accessibility commitments, and the deferred-and-absent table.
- **user-flow** (`ideation/rough-mockups/user-flow.md`) — the seven flows, the F5a transition map and its ten-eight-two edge reconciliation, the reason-dialog contract, and the cross-cutting paths.
- **rough-mockups-questions** (`ideation/rough-mockups/rough-mockups-questions.md`) — the nineteen confirmed answers (Q1–Q19) and the thirty-four accepted assumptions the concept is drawn against.

---

## Review

Reserved for the reviewer at the approval gate.
