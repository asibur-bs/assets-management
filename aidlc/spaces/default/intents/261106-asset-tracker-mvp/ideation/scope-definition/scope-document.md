# Scope Document — Asset Tracker MVP

## Sources

- [desc] Initial description: "Build the Asset Tracker MVP from the approved Asset Tracker MVP Development Workbook, the POC-vs-MVP gap analysis, the decision brief, and the fully approved 17-item decision set. The MVP adds actor-attributed append-only audit history, previous-holder preservation via last_assigned_to, lost-asset recovery (lost to in-stock), an assigned to discarded transition that resolves the assignment inline, five exclusive status buckets with Active Inventory and Total Records computed by one shared counting function and filter builder, case-insensitive category-scoped serial uniqueness via a functional index with a concurrency-safe application-level fallback, CSV export with formula-injection protection, and an amendment to workbook section 4.1 and section 21.1 Scenario 3 recording Returned as a distinct resting state."
- [scope] Workflow-selected scope: `feature`.
- [Q1] The minimum viable scope is the audit + lifecycle floor: the actor-attributed append-only audit history, `last_assigned_to` preservation, the two structural table changes, and the backfill, plus the recovery and discard transitions and the five exclusive status buckets with the shared counting function.
- [Q2] The reconciliation dashboard, the assignee directory, CSV export with formula-injection protection, asset editing, and duplicate-detection UX are must-have for the MVP release. The design system, responsive UI, improved search, pagination and result counts, and empty states are deliverable in a later increment.
- [Q3] The dependency structure is foundation-gated: the foundation workstream is a hard predecessor of every other capability, and the four count-consuming surfaces — dashboard, assignee directory, asset list, CSV export — form a second indivisible group.
- [Q4] The sequencing preference is risk-first: the highest-uncertainty capabilities are sequenced first, so the actor-identity mechanism and the design-system estimate are resolved before dependent work commits to them.
- [Q5] No capability is tied to a date, an event, or a committed delivery; the whole MVP is paced as ordinary engineering work.
- [Q6] The actor-identity mechanism is in scope and is carried as a named blocking dependency of the foundation workstream; the mechanism decision itself is deferred to the inception stages and travels with the feasibility stage's candidate shortlist.
- [Q7] The periodic stakeholder summary is shared across all four stakeholder groups with no primary audience, and prioritisation ties are decided by the intent's product owner directly.
- [Q8] POC behaviour that the MVP does not explicitly cover is preserved by default, but where it conflicts with an approved invariant — append-only history, the five exclusive status buckets, or the shared counting definition — the invariant wins and the conflicting POC behaviour is retired with the retirement recorded.
- [memory:M2] `aidlc/spaces/default/memory/project.md#Decided`: "The fully approved 17-item Asset Tracker MVP decision set, together with the Asset Tracker MVP Development Workbook, is the binding technical and product contract for the `asset-tracker-mvp` intent; it is not reopened at any stage of that intent, and it carries seven standing conditions — the uniqueness check uses an IMMEDIATE transaction and a non-zero SQLite `busy_timeout` with `SQLITE_BUSY` mapped to a retryable error; the functional-index expression and the application-level comparison predicate use one shared definition; registration and serial/key updates enforce the same uniqueness policy; historical backfills preserve original records and audit traceability and report failures; dashboard, assignee, asset-list, and CSV counts use consistent filtering and counting definitions; every lifecycle transition has explicit validation and audit behaviour; and the existing 66/66 passing test baseline is preserved with regression tests added for newly approved behaviour. Traceability must be maintained between the approved MVP requirements and the POC requirements FR1.3, FR4.4, FR4.5, and FR5.3, and actor identity is resolved from trusted server-side context so actor information supplied in a write request is never trusted. (Stage intent-capture, 2026-11-06)"
- [memory:M3] `aidlc/spaces/default/memory/project.md#Decided`: "The decision set's amendment table names the workbook amendment surface as section 4.1 (transition table, recovery, `in-stock → lost`, `assigned → discarded`), section 4.2.5, section 4.3 (the actor-trust rule), section 4.4, section 6.1, section 6.4, section 6.5, section 9 (Screens 01, 02, 03, 04, 10), section 10, section 21.1, section 21.2, section 22, section 24 (the metric qualifiers the Audit Completeness population relies on), and the two new section 27 sections (Inventory Counting Definitions and Audit Action Vocabulary). The section 24 amendment carries the Audit Completeness qualifier verbatim: pre-MVP history is backfilled to a `system` actor and excluded from this metric. Section 4.1 records the `lost → in-stock` recovery transition with a required recovery reason drawn from the shared loss-reason vocabulary, and requires a distinct `recovered` audit action rather than `assign` or `return`, whose description names the recovery and the prior holder. It also records that complex recovery workflows — partial recovery, credit assignment, dispute handling — remain deferred, distinct from the single included recovery transition. The workbook's remaining MVP feature set is the reconciliation dashboard, the assignee directory, asset editing, duplicate-detection UX, empty states, result counts, pagination, improved search, responsive UI, and a design system. The design-system enumeration is indicative, not exhaustive: workbook section 11 is the authoritative source for the complete design-system requirements, covering semantic color tokens, a typography scale, spacing tokens, radius and shadow scales, iconography, and a light-theme implementation designed for future dark-theme extension. (Stage intent-capture, 2026-11-06)"
- [memory:M4] `aidlc/spaces/default/memory/project.md#Decided`: "The `assigned → discarded` transition resolves the assignment inline and records it: `assigned_to` is cleared, `last_assigned_to` is retained so the holder at discard time stays visible, and a `discarded` audit action records the discard, the prior holder, and the fact that the assignment was resolved by the discard. A discard reason is always required, drawn from the shared loss-reason vocabulary plus retirement-specific values. The asset row and its full history are never deleted; a discarded asset is excluded from Active Inventory but remains present in the `discarded` bucket and in Total Records, and stays accessible at its detail URL with its history intact. (Stage intent-capture, 2026-11-06)"

## Purpose and Scope of This Document

This document defines the **in** and **out** boundary of the Asset Tracker MVP release and
records the scope decisions taken at the Scope Definition stage. It is the boundary
document that the Requirements Analysis stage specifies against, the Domain Design stage
decomposes within, and the Delivery Planning stage sequences.

Three things it deliberately does not do:

- It does **not** reopen the approved 17-item decision set or the Asset Tracker MVP
  Development Workbook. Those remain the binding technical and product contract [memory:M2].
- It does **not** specify requirements, acceptance criteria, or test cases. The
  requirements themselves are produced by the Requirements Analysis stage; this document
  fixes which capabilities the MVP release contains and which it defers.
- It does **not** name an implementation. The feasibility stage already established the
  technical position; this document records scope, not architecture.

The relationship between the approved set and this document is worth stating plainly,
because it is the shape most likely to be misread. **The approved set is the ceiling; this
document sets the floor and the release contents.** A capability that appears in the
approved set but not in this document's MVP release is not rejected — it is deferred, and
the intent backlog carries it as a named follow-on item.

## The Scope Decision in One Table

| Decision | Confirmed answer | Effect on the release |
|---|---|---|
| Minimum viable scope | Audit + lifecycle floor | The release cannot ship without audit integrity and a complete lifecycle |
| Must-have within the approved set | Dashboard, assignee directory, CSV export, asset editing, duplicate-detection UX | These five join the floor as release content |
| Deferred to a later increment | Design system, responsive UI, improved search, pagination and result counts, empty states | Named follow-on items, not rejected scope |
| Dependency structure | Foundation-gated | The foundation precedes everything; the four count-consuming surfaces are one indivisible group |
| Sequencing | Risk-first | The backlog is ranked by uncertainty reduction first |
| Deadlines | None capability-specific | No date constrains scope, sequencing, or content |
| Actor-identity mechanism | In scope, blocking dependency of the foundation | The mechanism decision gates the foundation; the actor-trust rule is untouched |
| Summary audience and tie-break | Shared across all four groups; product owner breaks ties | The backlog's ranking ties are reserved to the product owner |
| Uncovered POC behaviour | Preserve unless it contradicts an approved invariant | Three named invariants can retire POC behaviour, with the retirement recorded |

## In Scope — the MVP Release

### 1. The audit-first floor

These are the elements that make Audit Completeness — the primary success measure —
achievable at all. None of them is optional in the release.

| Capability | What it delivers | Why it is in the floor |
|---|---|---|
| **Actor-attributed append-only audit history** | Every asset lifecycle event produces an audit entry that carries an actor attribution, and the application has no update or delete path over audit rows | The primary success measure. Without actor attribution there is no defensible custody record; without append-only there is no evidence of what happened [Q1] |
| **Previous-holder preservation via `last_assigned_to`** | A loss event or a reassignment records the prior holder instead of erasing them | Directly answers "who had this asset, and when?" — the question the whole initiative exists to answer [Q1] |
| **Audit-log table replacement (structural)** | The `audit_log` table loses its `ON DELETE CASCADE` from `assets`, gains an actor column, and becomes insert-only to the application | The cascade is what destroys history on asset deletion. SQLite cannot drop a CHECK constraint or a foreign-key action via `ALTER TABLE`, so the create-copy-drop-rename path — already proven against this exact SQLite version — is required, not optional [Q1] |
| **`assets` table rebuild (structural)** | The `status` CHECK constraint is extended to admit `discarded` as a fifth bucket | The POC's constraint rejects `discarded` at the database level, and SQLite cannot alter a CHECK in place. The same rebuild path serves both structural changes [Q1] |
| **Historical backfill** | Pre-MVP audit rows are given a `system` actor in place; the original records are preserved and failures are reported | The standing conditions require backfills to preserve originals and report failures. The §24 amendment excludes this population from the Audit Completeness metric, so the metric is measured against a stated population [memory:M3] |

### 2. The lifecycle floor

The five exclusive status buckets and the transitions that reach them.

| Capability | What it delivers | Notes |
|---|---|---|
| **Five exclusive status buckets** | `in-stock`, `assigned`, `returned`, `lost`, `discarded` — mutually exclusive, with Active Inventory and Total Records computed from one shared counting function behind a reusable filter builder | The standing conditions require dashboard, assignee, asset-list, and CSV counts to use consistent filtering and counting definitions [memory:M2] |
| **`lost → in-stock` recovery** | A lost asset can be brought back, with a required recovery reason drawn from the shared loss-reason vocabulary, recorded as a distinct `recovered` audit action whose description names the recovery and the prior holder | Not `assign` and not `return` — the action vocabulary distinguishes it [memory:M3] |
| **`assigned → discarded` transition** | An assigned asset can be written off; the assignment is resolved inline, `assigned_to` is cleared, `last_assigned_to` is retained so the holder at discard time stays visible, and a `discarded` audit action records the discard, the prior holder, and the fact that the assignment was resolved by the discard | A discard reason is always required, drawn from the shared loss-reason vocabulary plus retirement-specific values. The asset row and its full history are never deleted; the asset is excluded from Active Inventory but remains in the `discarded` bucket and in Total Records, and stays accessible at its detail URL with its history intact [memory:M4] |
| **Per-transition validation and audit behaviour** | Every lifecycle transition has explicit validation and explicit audit behaviour | A standing condition of the approved decision set [memory:M2] |

### 3. The operator-facing must-haves

These join the floor as release content. Each is a surface an asset administrator
operates directly, and each is listed in the workbook's MVP feature set [memory:M3].

| Capability | What it delivers |
|---|---|
| **Reconciliation dashboard** | A view of custody and counts that reads from the shared counting function |
| **Assignee directory** | A per-holder view of what each holder has |
| **CSV export with formula-injection protection** | Asset data exportable for spreadsheet use, with cells sanitised so a value cannot be interpreted as a formula |
| **Asset editing** | Existing assets can be corrected, subject to the same uniqueness policy as registration |
| **Duplicate-detection UX** | The user is told about a case-insensitive, category-scoped serial or key collision before it is created, rather than after |

### 4. The integrity and safety capabilities

These are named in the approved decision set and the intent's in-scope list, and they
remain in scope as part of the release even though the floor does not single them out —
they are not optional features of a floor that omits them.

| Capability | What it delivers |
|---|---|
| **Case-insensitive, category-scoped serial or key uniqueness** | Enforced by a functional unique index, with a concurrency-safe application-level fallback. The functional-index expression and the application-level comparison predicate use **one shared definition**, and registration and serial/key updates enforce **the same** uniqueness policy [memory:M2] |
| **Concurrency safety** | The uniqueness check runs in an IMMEDIATE transaction against a non-zero SQLite `busy_timeout`, with `SQLITE_BUSY` mapped to a retryable error [memory:M2] |

### 5. The approved workbook amendment surface

The workbook sections the decision set requires be amended, carried into the release
without exception: section 4.1 (transition table, recovery, `in-stock → lost`,
`assigned → discarded`), section 4.2.5, section 4.3 (the actor-trust rule), section 4.4,
section 6.1, section 6.4, section 6.5, section 9 (Screens 01, 02, 03, 04, 10), section 10,
section 21.1, section 21.2, section 22, section 24 (the metric qualifiers the Audit
Completeness population relies on), and the two new section 27 sections — Inventory
Counting Definitions and Audit Action Vocabulary [memory:M3].

## Out of Scope — the MVP Release

### A. Deferred to a later increment (not rejected)

These are in the workbook's approved MVP feature set, and this stage places them outside
the MVP release. They are **named follow-on items** in the intent backlog, and each keeps
its approved standing [Q2].

| Deferred item | Why it is deferred, and what it costs |
|---|---|
| **Design system (workbook section 11)** | The largest single body of new work in the MVP, and the item most likely to be mistaken for table-stakes when it is not. Roughly 30 components — semantic colour tokens, a typography scale, spacing tokens, radius and shadow scales, iconography, and a light theme designed for dark-theme extension — against a 40-line stylesheet with no CSS custom properties and no breakpoints. The workbook's enumeration is indicative rather than exhaustive, so section 11 remains the authoritative source for the complete requirements [Q2] [memory:M3] |
| **Responsive UI** | Presentation-layer work on a desktop-first interface. Deferred with the design system, because a responsive surface built on an ad-hoc stylesheet is re-worked when the tokens land [Q2] |
| **Improved search** | The POC's list view already provides search. The MVP release keeps the existing search; the improved form waits for the design system to give it a consistent control [Q2] |
| **Pagination and result counts** | The confirmed scale is medium — hundreds to low thousands of assets across several internal teams. The MVP release's result sets fit the medium scale without pagination. Deferred, and it is the first item to be pulled forward if the asset count grows beyond that scale [Q2] |
| **Empty states** | Presentation polish, and it depends on the design system's vocabulary for what an empty state looks like [Q2] |

### B. Explicitly out of scope

| Out | Basis |
|---|---|
| **Complex recovery workflows** — partial recovery, credit assignment, dispute handling | The decision set records these as deferred, distinct from the single included `lost → in-stock` recovery transition [memory:M3] |
| **Any change to the POC's approved scope, approval fingerprints, code, database, tests, or configuration during Stage 1** | Confirmed at intent capture; the ideation phase produces no implementation [desc] |
| **Any scope change beyond the approved decision set** | Scope is fixed for this MVP; changes require a new approval round [desc] |
| **Integration with any other system** | The MVP is self-contained — no external system holds data it needs, and it publishes nothing outward |
| **Any external regulatory framework obligation** | Only a general internal audit expectation attaches to the custody records; no external framework is imposed |
| **A dark theme** | The design system is deferred entirely from this release, and its light theme is specified for future dark-theme extension rather than delivering one [memory:M3] |

### C. The named open items that ride with the release

These are **not** out of scope — they are in scope and unresolved. Each is carried forward
with a named next action, and none is assumed resolved in either direction.

| Open item | What it gates | Next action |
|---|---|---|
| **I-01 / I-03 — whether an existing trusted authentication mechanism exists anywhere in the organisation** | The size of the actor-identity workstream, and whether the trusted-proxy candidate is viable at all | Resolve before the actor mechanism is selected at the inception stages. The absence of an identity provider in the verified baseline is a fact about the current codebase, not a finding about the organisation [Q6] |
| **I-02 — whether a records-retention or disposal schedule applies to asset custody records** | Whether a retention rule must be specified into the audit history's lifecycle | Resolve in parallel with I-01 |
| **I-04 — the unquoted licence cost** | Whether a buy position could become re-openable | Carry unchanged; the Build position holds at the market research stage and this does not reopen it |
| **R-02 — organisational adoption readiness** | The rollout, not the build. The practical failure mode is that teams continue using the spreadsheet | Remains open at the human's direction; no technical scope decision retires it |

## The Actor-Identity Boundary in Scope

This is the single most important boundary in the document, and it has two halves that
must not be confused.

**The rule is fixed and is not reopened by anything in this document.** Every audit entry
derives its actor from trusted server-side context, and actor information supplied in a
write request is never trusted [memory:M2].

**The mechanism is a scope decision, and the decision is deferred.** The MVP release
includes actor attribution, so the mechanism is in scope. The mechanism itself is
resolved during the inception stages, once I-01 is answered, and it is carried as a
**named blocking dependency of the foundation workstream** [Q6]. This has a concrete
consequence for the plan: the actor column is part of the foundation's `audit_log`
replacement, and the feasibility assessment found the foundation's size genuinely
unresolved depending on which branch is taken. No foundation work may be planned against
an unresolved actor model.

The candidate shortlist travels with the item, unresolved, in the order the feasibility
stage left it:

| Candidate | Satisfies the actor-trust rule | Additional scope relative to the approved set |
|---|---|---|
| A. Server-configured single operator | Yes | Negligible, but attributes every entry to one identity |
| B. Trusted request header from an authenticating proxy | Yes, only if the proxy is genuinely present and direct requests can be prevented | Small in-application, conditional on infrastructure the estate does not contain |
| C. Operator selection | Weakly — the operator remains self-declared | Negligible, but does not meet the rule as written |
| D. Application-managed login and session | Yes | Substantial — credential storage, password lifecycle, session management, authorisation surface, none of it named in the approved decision set |

## The Three Approved Invariants

These are the invariants that may retire existing POC behaviour. Nothing else may. Each
retirement is recorded [Q8].

| # | Invariant | What it retires in the POC |
|---|---|---|
| **INV-1** | Audit history is append-only and survives asset deletion | The `audit_log` table's `ON DELETE CASCADE` from `assets`, and the application path that deletes assets |
| **INV-2** | The five status buckets are exclusive, and a discarded asset's row and history are never deleted | Any behaviour that deletes or removes an asset record outright, and the four-bucket status vocabulary |
| **INV-3** | Dashboard, assignee, asset-list, and CSV counts share one filtering and counting definition | Any count computed independently of the shared counting function, and any count that disagrees across surfaces |

Everything else the POC does is preserved by default. The boundary is defined by these
three invariants, not by a behaviour-by-behaviour audit of the POC — and the backlog does
not enumerate POC behaviours for retirement.

## The Dependency Structure

Two grouping constraints, both confirmed [Q3].

```
   ┌──────────────────────────────────────────────────────────────┐
   │  GROUP 0 — the actor-identity mechanism decision            │
   │  Blocks the foundation. Undecided until I-01 is answered.    │
   └───────────────────────────┬──────────────────────────────────┘
                               │ blocking dependency
                               ▼
   ┌──────────────────────────────────────────────────────────────┐
   │  GROUP 1 — the foundation workstream                         │
   │  audit_log replacement · assets rebuild · last_assigned_to   │
   │  actor column · backfill                                    │
   │  Indivisible. Nothing else may be built on top of it first. │
   └───────────────────────────┬──────────────────────────────────┘
                               │ hard predecessor of everything
                               ▼
   ┌──────────────────────────────────────────────────────────────┐
   │  GROUP 2 — the lifecycle                                    │
   │  five exclusive buckets · recovery · discard · per-         │
   │  transition validation and audit behaviour                   │
   └───────────────────────────┬──────────────────────────────────┘
                               │
                               ▼
   ┌──────────────────────────────────────────────────────────────┐
   │  GROUP 3 — the count-consistency group (indivisible)        │
   │  reconciliation dashboard · assignee directory · asset list  │
   │  · CSV export                                                │
   │  All four or none: the shared counting guarantee holds      │
   │  only if every count-consuming surface uses it.              │
   └───────────────────────────┬──────────────────────────────────┘
                               │
                               ▼
   ┌──────────────────────────────────────────────────────────────┐
   │  GROUP 4 — the remaining must-haves                          │
   │  asset editing · duplicate-detection UX                     │
   └──────────────────────────────────────────────────────────────┘

   DEFERRED, in a later increment (not in the MVP release):
   design system · responsive UI · improved search ·
   pagination and result counts · empty states
```

**Why the count-consistency group is indivisible.** The standing condition is that
dashboard, assignee, asset-list, and CSV counts use consistent filtering and counting
definitions [memory:M2]. The feasibility assessment made the mechanism precise: the
"by construction" guarantee holds *only if* all four surfaces actually consume the shared
function [Q3]. A group that ships three of four has no guarantee at all — it has three
surfaces that agree with each other and a fourth that does not, which is the exact defect
the group exists to remove. Splitting it would ship the bug it is meant to fix.

**Why the foundation is a hard predecessor.** Both structural changes and the actor
column depend on the migration runner, which the feasibility assessment identified as the
least-covered of the three areas under change and named as the first thing to strengthen.
The "no audit rows destroyed" property must be verified against a live database rather
than asserted. Building anything on top of an unverified foundation means the property
is verified late, when the layers above make a defect expensive.

## The Sequencing Heuristic

**Risk-first** [Q4]. The backlog is ranked by uncertainty reduction before value
delivery, so that the highest-uncertainty items are resolved before dependent work
commits to them.

This does not mean every uncertain item must be closed before any delivery begins. It
means an item is sequenced early enough that its uncertainty is retired before the work
that depends on it starts. Two consequences follow:

- The actor-identity mechanism (Group 0) comes first, because the foundation's size
  depends on it.
- The design-system estimate is resolved early even though the design system is
  **deferred** from the MVP release. Deferring a capability does not defer the need to
  know what it would cost — and the gap analysis's 6–8 week estimate is explicitly
  conditional on scoping that workstream, so the estimate must be sound even for work
  this release does not contain.

Where a capability can proceed without an uncertain item being closed, it may proceed.

## Delivery Constraints Carried Forward

These bound the release without being capabilities in it.

| Constraint | Statement |
|---|---|
| **Scope ceiling** | The approved 17-item decision set and the workbook are the ceiling; this document sets the floor and the release contents [desc] |
| **Standing conditions** | All seven conditions of the approved decision set carry into the release unchanged [memory:M2] |
| **Test baseline** | The existing 66/66 passing test baseline is preserved, and regression tests are added for newly approved behaviour [memory:M2] |
| **Traceability** | Traceability is maintained between the approved MVP requirements and the POC requirements FR1.3, FR4.4, FR4.5, and FR5.3 [memory:M2] |
| **Workflow breadth** | The workflow runs all 33 stages with no stage skipped, including the whole operation phase through to feedback and optimization [desc] |
| **Build and test** | One single developer, with full POC context and no ramp-up cost [Q3] [memory:M2] |
| **Deployment target** | A single internal host with a machine-local SQLite file, launched as a long-running process. The operation phase covers the process lifecycle, backups, and observability of one instance |
| **Budget and timeline** | No fixed deadline and no separate budget; no capability is date-tied [Q5] |
| **Environment posture** | No cloud, container, or CI posture exists today. The operation phase must decide whether a dev/staging/prod split is introduced or the single instance is treated as the only target |
| **Data-loss exposure** | The `data/` directory is gitignored, so the SQLite file — which is the entire system of record — exists in exactly one place with no replication. A backup-and-restore procedure that is *exercised*, not merely written, is the minimum credible operational posture |

## Assumptions & Open Questions

- [assumption] The minimum viable scope is the audit + lifecycle floor, and the must-have set adds the reconciliation dashboard, the assignee directory, CSV export, asset editing, and duplicate-detection UX. The presentation-polish items — the design system, responsive UI, improved search, pagination and result counts, and empty states — are outside the MVP release and are deliverable in a later increment. This is a prioritisation judgement recorded at the scope stage, not a reopening of the approved decision set: the approved set remains the ceiling, and the backlog records the presentation-polish items as named follow-on items rather than as rejected scope. (Q1, Q2)
- [assumption] The foundation-gated dependency structure means the backlog's proto-Units cannot be delivered in an arbitrary order: the foundation workstream is a hard predecessor of everything else, and the four count-consuming surfaces form a second indivisible group. The backlog records both grouping constraints for the inception stages' Unit DAG to respect, and the risk-first sequencing preference determines the order within and across them. (Q3, Q4)
- [assumption] The actor-identity mechanism is a blocking dependency of the foundation workstream, not merely an open item. Because the actor column is part of the foundation's `audit_log` replacement, and because the foundation's size is genuinely unresolved depending on the branch, no foundation work is planned against an unresolved actor model. The actor-trust rule remains fixed throughout and is not reopened: every audit entry derives its actor from trusted server-side context, and client-supplied identity is never trusted. (Q6)
- [assumption] The risk-first sequencing preference is applied as a ranking heuristic. It does not require every high-uncertainty item to be fully resolved before any delivery begins; it requires the highest-uncertainty items to be sequenced early enough that the uncertainty is retired before dependent work commits to them. Where a capability can proceed without the uncertain item being closed, it may proceed. (Q4)
- [assumption] No capability is date-tied. The absence of a deadline is an absence of a constraint on scope or sequencing, not a licence to expand scope: the MVP release's content is bounded by the floor plus the must-have set, and the risk-first preference is not a proxy for urgency. (Q5)
- [assumption] The stakeholder summary is shared across all four groups with no primary audience, and prioritisation ties are decided by the intent's product owner directly. The backlog's ranking ties are therefore not resolved by this document; they are reserved to the product owner at the point the tie arises. (Q7)
- [assumption] The treatment of uncovered POC behaviour is defined by the approved invariants rather than by a behaviour-by-behaviour audit of the POC. The backlog records the three invariants that can retire POC behaviour and does not enumerate POC behaviours for retirement. The Stage 1 prohibition on modifying POC code, database, tests, or configuration remains in force and is unaffected by this answer, which governs the forward-looking release boundary only. (Q8)
- [assumption] I-01 / I-03 (whether an existing trusted authentication mechanism exists anywhere in the organisation), I-02 (whether a records-retention or disposal schedule applies to asset custody records), and I-04 (the unquoted licence cost) remain open and are carried forward unresolved. None is assumed resolved in either direction. (Q6)
- [assumption] Organisational adoption readiness remains open (RAID R-02), and the confirmed position that it is unknown is carried unchanged. The scope decisions in this stage do not retire it: the MVP release is bounded by the floor and the must-have set, and the adoption risk is a rollout risk rather than a scope-defect one. (Q5)

## Sources Consumed

- **intent-statement** (`aidlc/spaces/default/intents/261106-asset-tracker-mvp/ideation/intent-capture/intent-statement.md`) — the problem framing, the target customer, the Audit Completeness metric, the confirmed scope bounds, and the actor-trust rule.
- **competitive-analysis** (`aidlc/spaces/default/intents/261106-asset-tracker-mvp/ideation/market-research/competitive-analysis.md`) — the table-stakes/differentiator split, which establishes that the operator-facing must-haves are table-stakes and the audit properties are the differentiator.
- **build-vs-buy** (`aidlc/spaces/default/intents/261106-asset-tracker-mvp/ideation/market-research/build-vs-buy.md`) — the Build position and its residual uncertainties, which ground the release's build-in-place boundary and the carried I-04 item.
- **feasibility-assessment** (`aidlc/spaces/default/intents/261106-asset-tracker-mvp/ideation/feasibility/feasibility-assessment.md`) — the verified baseline, the ten-capability technical viability table, the actor-trust evaluation and its candidate shortlist, the workstream decomposition, and the platform and compliance perspectives.
- **constraint-register** (`aidlc/spaces/default/intents/261106-asset-tracker-mvp/ideation/feasibility/constraint-register.md`) — the technical, scope, organisational, deployment, and data constraints that bound the release.
- **raid-log** (`aidlc/spaces/default/intents/261106-asset-tracker-mvp/ideation/feasibility/raid-log.md`) — the sixteen risks, twelve assumptions, six issues, and thirteen dependencies that the release carries forward.
- **scope-definition-questions** (`aidlc/spaces/default/intents/261106-asset-tracker-mvp/ideation/scope-definition/scope-definition-questions.md`) — the eight confirmed scope answers and the nine accepted assumptions.

## Review

Reserved for the reviewer at the approval gate.
