# Intent Backlog — Asset Tracker MVP

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

## Purpose and Scope of This Backlog

This is the **prioritised intent backlog** for the Asset Tracker MVP: a set of proto-Units,
each with a priority, a dependency position, and a one-line statement of what it
delivers. It is the input to the inception stages' Units Generation, which will turn
these proto-Units into formal Units with their own definitions of done.

Three conventions govern it:

- **Proto-Units, not Units.** A proto-Unit here names a capability and its intent. The
  inception stage decides the Unit boundaries, the estimates, and the DAG. What this
  document fixes is the *content* and the *ranking*, so the inception stage does not have
  to re-open what was decided here.
- **Risk-first ranking.** The ordering is by uncertainty reduction, then by dependency
  position, then by value [Q4]. This is not the delivery order — the Delivery Planning
  stage owns that — but it is the order in which uncertainty is retired.
- **Priority uses MoSCoW.** MoSCoW is the right framework for an MVP release with a
  confirmed floor and a confirmed ceiling, because it draws exactly the boundary this
  stage was asked to draw: what is non-negotiable for this release, what is important but
  deferrable, and what is explicitly not in this release. A second framework is applied
  selectively where it adds information the MoSCoW category does not carry — see the
  WSJF note below.

## The Prioritisation Method

**MoSCoW is the primary framework** — Must, Should, Could, Won't (this time). The
confirmed floor and ceiling make it the natural fit: the release boundary is
already fixed on both sides, so the framework's job is only to classify what sits
between them.

| MoSCoW category | Meaning here | Source |
|---|---|---|
| **Must Have** | In the MVP release. Removing it makes the release fail its primary success measure or its confirmed floor | [Q1] [Q2] |
| **Should Have** | In the MVP release, but a named consequence follows if it is cut late | [Q2] and the deferral reasoning |
| **Could Have** | Not in the MVP release. A candidate for the next increment | [Q2] |
| **Won't Have (this time)** | Explicitly out — including the complex recovery workflows and the deferred item set | [Q1] and the intent's out-of-scope list |

**WSJF is applied where it adds information MoSCoW does not.** WSJF
(`Cost of Delay ÷ Job Duration`, with Cost of Delay = User-Business Value + Time
Criticality + Risk Reduction) is the ranking heuristic the backlog is ordered by, and it
is what makes "risk-first" operational rather than rhetorical: the Risk Reduction term is
what pushes the uncertain items up. The backlog below gives each proto-Unit a relative
value, a relative time-criticality, a relative risk-reduction, and a relative size, on the
1–10 Fibonacci-ish scale the framework uses.

Two honesty notes on the scoring, because a priority document that presents estimates as
measurements is worse than one that labels them:

- **Reach is not scored.** RICE is deliberately *not* used here: the MVP's audience is
  internal asset administrators at a confirmed scale of hundreds to low thousands of
  assets, and no usage telemetry exists for a system that has not been built. RICE's
  Reach term would be a fabricated number, and a fabricated number in a priority
  document is worse than no number.
- **The scores are relative judgements between items in this backlog, not estimates of
  delivery effort.** "Size 3" means "larger than most of the items in this list", not
  "three days". The Delivery Planning stage replaces them with real estimates.

**Ties are not broken by this document.** The confirmed tie-break is the intent's
product owner, directly [Q7]. Where the scores below produce a tie, that tie is marked
and reserved rather than resolved here.

## The Backlog

### Rank 1 — PB-00 · The actor-identity mechanism decision

| Field | Value |
|---|---|
| **MoSCoW** | Must Have |
| **Type** | Decision item (not a deliverable) |
| **Group** | Group 0 — blocks the foundation |
| **Blocks** | PB-01 entirely |
| **Value** | 6 | 
| **Time criticality** | 4 |
| **Risk reduction** | 10 |
| **Size** | 2 |
| **WSJF** | (6 + 4 + 10) ÷ 2 = **10.0** |

**Delivers:** a decision on which mechanism establishes the trusted actor, made at the
inception stages once I-01 is answered.

**Why it ranks first.** Every other item's plan depends on it. The actor column is part
of the foundation's `audit_log` replacement, and the feasibility assessment found the
foundation's size genuinely unresolved across the four candidates — from negligible for a
server-configured single operator to substantial for application-managed login, with
session management, credential storage, a password lifecycle, and an authorisation
surface. The foundation cannot be planned against an unresolved model, so this item gates
PB-01 and therefore everything downstream [Q6].

**The candidate shortlist travels with it** (from the feasibility stage, unresolved):

| Candidate | Satisfies the actor-trust rule | Additional scope |
|---|---|---|
| A. Server-configured single operator | Yes | Negligible; attributes every entry to one identity |
| B. Trusted request header from an authenticating proxy | Yes, only if the proxy is genuinely present and direct requests can be prevented | Small in-app; conditional on infrastructure the estate does not contain |
| C. Operator selection | Weakly — still self-declared | Negligible, but does not meet the rule as written |
| D. Application-managed login and session | Yes | Substantial; none of it named in the approved decision set |

**The rule is fixed and is not reopened by this item.** Every audit entry derives its
actor from trusted server-side context; actor information supplied in a write request is
never trusted [memory:M2]. **Its resolution depends on I-01 / I-03** — whether an existing
trusted authentication mechanism exists anywhere in the organisation. That absence in the
verified baseline is a fact about the current codebase, not a finding about the
organisation, and no candidate is assumed available or unavailable.

---

### Rank 2 — PB-01 · The foundation workstream

| Field | Value |
|---|---|
| **MoSCoW** | Must Have |
| **Type** | Deliverable group (indivisible) |
| **Group** | Group 1 — hard predecessor of everything |
| **Blocks** | Every proto-Unit below it |
| **Value** | 9 |
| **Time criticality** | 5 |
| **Risk reduction** | 9 |
| **Size** | 8 |
| **WSJF** | (9 + 5 + 9) ÷ 8 = **2.9** |

**Delivers:** a schema in which audit history survives, actor attribution exists, and the
previous holder is preserved — with the data intact.

**Contents (all five are in this one indivisible group):**

| # | Element | Why it cannot be split out |
|---|---|---|
| 1 | `audit_log` table replacement — drop `ON DELETE CASCADE` from `assets`, add the actor column, make the table insert-only to the application | The cascade is the defect; the actor column is the metric's subject; a partial replacement leaves either history destroyable or unattributed |
| 2 | `assets` table rebuild — extend the `status` CHECK to admit `discarded` | SQLite cannot alter a CHECK in place. The create-copy-drop-rename path is already proven against this exact SQLite version and this exact migration runner |
| 3 | `last_assigned_to` column | Additive, but it belongs with the same migration that establishes the bucket model it serves |
| 4 | Actor column population | Depends on PB-00's outcome; hence the blocking dependency |
| 5 | Historical backfill — pre-MVP rows given a `system` actor, in place, originals preserved, failures reported | The standing condition requires backfills to preserve originals and report failures. The §24 amendment excludes this population from Audit Completeness [memory:M3] |

**Why it is one group.** Elements 1 and 2 are the two structural changes, and both run
through the same migration runner. The feasibility assessment named that runner the
least-covered of the three areas under change and the first thing to strengthen, and
required that the "no audit rows destroyed" property be **verified against a live
database rather than asserted**. Splitting the foundation would mean shipping an
unverified schema and verifying it later, when the layers above make a defect
expensive to fix.

**The verification this item must carry.** The live-database check that deleting an
asset no longer destroys its audit rows. This is the single most important proof in the
MVP, because it is the difference between a promise and a fact.

---

### Rank 3 — PB-02 · The migration runner hardening

| Field | Value |
|---|---|
| **MoSCoW** | Must Have |
| **Type** | Deliverable |
| **Group** | Group 1 — sequenced immediately after PB-01, before it |
| **Depends on** | — (ships *with* PB-01, as its verification) |
| **Value** | 7 |
| **Time criticality** | 5 |
| **Risk reduction** | 10 |
| **Size** | 3 |
| **WSJF** | (7 + 5 + 10) ÷ 3 = **7.3** |

**Delivers:** the migration runner proven able to carry the two structural changes
against both a fresh database and a legacy one — with the "no audit rows destroyed"
property verified against a live instance rather than asserted.

**Why it ranks above PB-01's own delivery.** The feasibility assessment's first
qualification was that the migration runner is load-bearing and is the least-covered of
the three areas under change. PB-02 is the verification harness for PB-01, and the
feasibility stage's evidence — that a v1-only database opens cleanly under the current
runner and that the table rebuild succeeded against SQLite 3.49.2 — is the reason the
work is judged feasible at all. Strengthening it is how the qualification is discharged.

**Note on the ordering.** PB-02 is listed after PB-00 and before PB-01 in rank because
its *risk reduction* is what discharges the assessment's load-bearing qualification, but
it is a **component of** PB-01's delivery rather than a separate increment. The
inception stage should model it as the verification half of the foundation group, not as
an independent proto-Unit.

---

### Rank 4 — PB-03 · The lifecycle: five exclusive buckets and the full transition set

| Field | Value |
|---|---|
| **MoSCoW** | Must Have |
| **Type** | Deliverable group |
| **Group** | Group 2 |
| **Depends on** | PB-01 |
| **Blocks** | PB-04 (the count-consistency group) |
| **Value** | 9 |
| **Time criticality** | 3 |
| **Risk reduction** | 4 |
| **Size** | 5 |
| **WSJF** | (9 + 3 + 4) ÷ 5 = **3.2** |

**Delivers:** the complete, validated, audited lifecycle — every status in the exclusive
set, every legal transition between them, and every one of them recorded.

**Contents:**

| Element | Detail |
|---|---|
| Five exclusive status buckets | `in-stock`, `assigned`, `returned`, `lost`, `discarded` |
| `lost → in-stock` recovery | Required recovery reason from the shared loss-reason vocabulary; a distinct `recovered` audit action whose description names the recovery and the prior holder — not `assign`, not `return` [memory:M3] |
| `assigned → discarded` transition | The assignment is resolved inline: `assigned_to` is cleared, `last_assigned_to` is retained so the holder at discard time stays visible, and a `discarded` audit action records the discard, the prior holder, and the fact that the assignment was resolved by the discard. A discard reason is always required, from the shared loss-reason vocabulary plus retirement-specific values. The asset row and its full history are never deleted; a discarded asset is excluded from Active Inventory but stays in the `discarded` bucket and in Total Records, and stays accessible at its detail URL with its history intact [memory:M4] |
| Per-transition validation and audit behaviour | Every lifecycle transition has explicit validation and explicit audit behaviour — a standing condition [memory:M2] |
| The shared counting function and filter builder | The single definition that Active Inventory and Total Records are computed from, and the reusable filter builder behind it |
| The Audit Action Vocabulary (workbook §27) | The complete action vocabulary the transitions write into |

**Why the counting function lives here, not in PB-04.** The function and the filter
builder are the *mechanism*; PB-04's four surfaces are the *consumers*. Splitting the
mechanism from its consumers would leave the shared definition unused, which is exactly
the state in which the counts disagree.

---

### Rank 5 — PB-04 · The count-consistency group

| Field | Value |
|---|---|
| **MoSCoW** | Must Have |
| **Type** | Deliverable group (indivisible) |
| **Group** | Group 3 |
| **Depends on** | PB-03 |
| **Value** | 8 |
| **Time criticality** | 3 |
| **Risk reduction** | 5 |
| **Size** | 6 |
| **WSJF** | (8 + 3 + 5) ÷ 6 = **2.7** |

**Delivers:** four surfaces whose counts agree, because they all read from one shared
function — the reconciliation dashboard, the assignee directory, the asset list, and CSV
export.

**Why this is one indivisible group.** The standing condition is that dashboard,
assignee, asset-list, and CSV counts use consistent filtering and counting definitions
[memory:M2]. The feasibility assessment made the mechanism precise: the "by construction"
guarantee holds *only if* all four surfaces actually consume the shared function [Q3]. A
group shipping three of four has no guarantee at all — it has three surfaces that agree
with each other and a fourth that does not, which is the exact defect the group exists to
remove. Splitting it would ship the bug it is meant to fix.

**The CSV export's formula-injection protection is in this group**, not elsewhere: the
export is one of the four count-consuming surfaces, and its cell sanitisation is part of
the same capability.

---

### Rank 6 — PB-05 · Asset editing

| Field | Value |
|---|---|
| **MoSCoW** | Must Have |
| **Type** | Deliverable |
| **Group** | Group 4 |
| **Depends on** | PB-01 (uniqueness policy), PB-03 (bucket model) |
| **Value** | 6 |
| **Time criticality** | 2 |
| **Risk reduction** | 3 |
| **Size** | 3 |
| **WSJF** | (6 + 2 + 3) ÷ 3 = **3.7** |

**Delivers:** the ability to correct an existing asset's details, under the same rules
that govern creating one.

**The constraint that shapes it.** Registration and serial/key updates enforce **the same
uniqueness policy** [memory:M2]. An edit that changes a serial or key must therefore run
the same case-insensitive, category-scoped comparison — the same shared definition, not a
parallel one — or the MVP will ship a hole where the duplicate-registration defect returns
through the edit path. The uniqueness check on an edit runs in an IMMEDIATE transaction
against the non-zero `busy_timeout`, with `SQLITE_BUSY` mapped to a retryable error, in
both paths.

---

### Rank 7 — PB-06 · Duplicate-detection UX

| Field | Value |
|---|---|
| **MoSCoW** | Must Have |
| **Type** | Deliverable |
| **Group** | Group 4 |
| **Depends on** | PB-05 (shares the uniqueness definition and the shared predicate) |
| **Value** | 6 |
| **Time criticality** | 2 |
| **Risk reduction** | 4 |
| **Size** | 3 |
| **WSJF** | (6 + 2 + 4) ÷ 3 = **4.0** |

**Delivers:** the user is told about a serial or key collision — case-insensitive,
whitespace-trimmed, scoped to the asset's category — at the moment of entry, rather than
discovering the duplicate after the fact.

**Why it ranks above PB-05 despite the dependency.** The score reflects its risk-reduction
weight: the underlying defect the MVP exists to remove is *the same physical asset
registered twice*, and the UX is what makes the invariant observable to the person
registering the asset. The functional-index enforcement in PB-01 is what guarantees the
invariant; this is what makes it comprehensible.

**Note.** The *enforcement* of the uniqueness invariant is part of PB-01 and PB-05, not
of this item. This item is the user-facing layer only. The two must not be conflated in
the inception stage — the enforcement is a correctness property and belongs with the
schema and the shared predicate.

---

### Rank 8 — PB-07 · The approved workbook amendment surface

| Field | Value |
|---|---|
| **MoSCoW** | Must Have |
| **Type** | Deliverable (cross-cutting) |
| **Group** | Spans Groups 1–4 |
| **Depends on** | Resolved alongside the capabilities it amends |
| **Value** | 7 |
| **Time criticality** | 3 |
| **Risk reduction** | 5 |
| **Size** | 4 |
| **WSJF** | (7 + 3 + 5) ÷ 4 = **3.8** |

**Delivers:** the amended workbook sections — 4.1 (transition table, recovery,
`in-stock → lost`, `assigned → discarded`), 4.2.5, 4.3 (the actor-trust rule), 4.4, 6.1,
6.4, 6.5, 9 (Screens 01, 02, 03, 04, 10), 10, 21.1, 21.2, 22, 24 (the metric qualifiers
the Audit Completeness population relies on), and the two new §27 sections — Inventory
Counting Definitions and Audit Action Vocabulary [memory:M3].

**Why it is cross-cutting rather than a final item.** It is not a document to be written
at the end; it is the amendment to each capability's own specification. Screen amendments
in §9 attach to the surfaces in PB-04, the transition amendments in §4.1 attach to
PB-03, and the actor-trust amendment in §4.3 attaches to PB-01. The inception stage
should distribute the amendment surface across the Units that implement it, rather than
making it a trailing deliverable.

---

### Rank 9 — PB-08 · The operational readiness workstream

| Field | Value |
|---|---|
| **MoSCoW** | Must Have |
| **Type** | Deliverable group |
| **Group** | Cross-cutting — spans the operation phase |
| **Depends on** | PB-01 (the database file is the system of record) |
| **Value** | 8 |
| **Time criticality** | 4 |
| **Risk reduction** | 6 |
| **Size** | 5 |
| **WSJF** | (8 + 4 + 6) ÷ 5 = **3.6** |

**Delivers:** the MVP running in a way the organisation can actually rely on — process
lifecycle, backups, observability, incident response, performance validation, and
feedback — on the confirmed single-host, machine-local-SQLite target.

**Why it is in the backlog.** The workflow scope is `feature`, which runs all 33 stages
with no stage skipped, and the product boundary explicitly includes the operation phase
[desc]. The feasibility stage identified three consequences of the deployment target that
this item must discharge:

| Concern | Position |
|---|---|
| **Backups** | The highest-value operational item. The SQLite file *is* the system of record, and `data/` is gitignored, so the file exists in exactly one place with no replication. A backup-and-restore procedure that is **exercised**, not merely written, is the minimum credible posture |
| **Process lifecycle** | One long-running Node process. The POC already exposes `PORT` and `DB_PATH` environment overrides, so the process is parameterisable without a code change |
| **Observability** | The POC emits one startup line to stdout. The audit trail is the natural health and activity signal, and it is an application-level asset rather than an infrastructure one |
| **Environment parity** | No dev/staging/prod split exists today. The operation stages must decide whether one is introduced or the single instance is treated as the only target |
| **Horizontal scaling** | Not applicable and not required. Hundreds to low thousands of assets across several internal teams is well inside single-instance capacity |

---

### Rank 10 — PB-09 · The traceability and regression baseline

| Field | Value |
|---|---|
| **MoSCoW** | Must Have |
| **Type** | Deliverable (cross-cutting) |
| **Group** | Spans Groups 1–4 |
| **Depends on** | Resolved alongside the capabilities it traces |
| **Value** | 7 |
| **Time criticality** | 3 |
| **Risk reduction** | 7 |
| **Size** | 3 |
| **WSJF** | (7 + 3 + 7) ÷ 3 = **5.7** |

**Delivers:** the existing 66/66 passing test baseline preserved, regression tests added
for newly approved behaviour, and traceability maintained between the approved MVP
requirements and the POC requirements FR1.3, FR4.4, FR4.5, and FR5.3 [memory:M2].

**Why it ranks above its value would suggest.** The Risk Reduction term carries it. A
brownfield MVP that changes the schema under a live audit trail has exactly one thing
protecting it from silent regression: the test suite. The baseline is a standing
constraint, and the standing condition is that it is *preserved*, not merely re-established
after the fact.

---

## Deferred — Could Have (not in the MVP release)

These keep their approved standing. They are **not rejected scope** — the approved set
remains the ceiling — and each is a candidate for the next increment [Q2].

| # | Item | MoSCoW | What it needs when its turn comes | First trigger to pull it forward |
|---|---|---|---|---|
| C-01 | **Design system** (workbook §11) | Could Have | The authoritative source for the complete requirements: semantic colour tokens, a typography scale, spacing tokens, radius and shadow scales, iconography, and a light theme designed for future dark-theme extension. The enumeration in the workbook is indicative, not exhaustive [memory:M3] | Every other presentation item below depends on it, so it gates them — and the estimate must be settled early even while deferred (see the sequencing note) |
| C-02 | **Responsive UI** | Could Have | C-01's breakpoints and spacing tokens | C-01 |
| C-03 | **Improved search** | Could Have | C-01's control vocabulary | C-01 |
| C-04 | **Pagination and result counts** | Could Have | The shared counting function and filter builder (PB-03) — already in the release | The asset count growing beyond the confirmed medium scale of hundreds to low thousands |
| C-05 | **Empty states** | Could Have | C-01's vocabulary for what an empty state looks like | C-01 |

### The sequencing note on C-01

C-01 is **deferred from the release but not deferred from the risk assessment**. The
gap analysis's 6–8 week estimate is explicitly conditional on scoping the design-system
workstream, and the feasibility stage confirmed that condition is load-bearing rather
than optimistic. Under the risk-first heuristic [Q4], the *estimate* is therefore
retired early — before the release's own schedule is committed — even though the
*delivery* is out of this release. If the estimate turns out to be far larger than the
conditional assumed, that is a fact the release planning needs, and it is cheaper to
learn before the plan is fixed than after.

This is the one place where a deferred item still appears in the risk-first ordering,
and it is worth stating plainly so the inception stage does not read C-01 as a
release deliverable.

## Won't Have (this time)

| Item | Basis |
|---|---|
| Complex recovery workflows — partial recovery, credit assignment, dispute handling | Deferred by the decision set, distinct from the single included `lost → in-stock` recovery transition [memory:M3] |
| A dark theme | The design system is deferred entirely from this release; its light theme is specified for future dark-theme extension rather than delivering one [memory:M3] |
| Integration with any other system | The MVP is self-contained [Q1] |
| Any external regulatory framework compliance posture | Only a general internal audit expectation attaches; no external framework is imposed |
| A managed relational database | The deployment target is confirmed as the single host with a machine-local SQLite file, and the concurrency contract of the approved decision set is written against that target |

## The Value Stream Map

The map runs capability → customer outcome, and each link names the proto-Unit that
delivers it.

```
TRUSTED ACTOR                THE ASSET RECORD            THE LIFECYCLE            THE VIEW
──────────────────            ──────────────────          ───────────────          ──────────
                                                                                  
  PB-00 ──────────┐           PB-01 ────────┐         PB-03 ────────┐      PB-04 ──────────┐
  Decide how      │           Audit rows    │         Five buckets  │      Dashboard       │
  the actor       │           survive;      │         and every    │      Assignee dir    │
  is trusted      │           the prior     │         legal        │      Asset list      │
       │          │           holder is     │         transition,  │      CSV export      │
       │          │           preserved     │         each one     │            │        │
       │          │           │             │         validated    │            │        │
       ▼          │           ▼             │         and audited  │            ▼        │
  ┌───────────┐   │      ┌────────────┐    │      ┌────────────┐    │      ┌────────────┐    │
  │Every audit │   │      │An asset    │    │      │A holder    │    │      │One set of │    │
  │entry names │───┴─────▶│cannot lose │────┴─────▶│can always │────┴─────▶│numbers,   │────┴──▶
  │who did it  │          │its history │            │say what   │            │the same   │         │
  └───────────┘          └────────────┘            │happened   │            │everywhere │         │
       │                        │                   └────────────┘            └────────────┘         │
       │                        │                          │                       │                │
       │                        │                          │                       │                │
       │                   ┌────▼─────┐              ┌─────▼─────┐          ┌──────▼──────┐         │
       │                   │ PB-05    │              │ PB-06     │          │ PB-07      │         │
       │                   │ Edit an  │              │ Duplicate │          │ Workbook   │         │
       │                   │ asset    │              │ caught    │          │ amendments │         │
       │                   └──────────┘              │ before    │          └─────────────┘         │
       │                                           │ it exists │                    │           │
       │                   ┌───────────────────────▶└───────────┘                    │           │
       │                   │                                                     ┌────▼─────┐   │
       │                   │                                                     │ PB-08   │   │
       │                   │                                                     │ Operable│   │
       │                   │                                                     └──────────┘   │
       │                   │                                                      ┌────────────┐ │
       └───────────────────┴──────────────────────────────────────────────────────▶│  PB-09    │─┘
                                                                           │Traceability│
                                                                           │+ regression│
                                                                           └────────────┘
```

**Reading the map.** The left column is the enabling decision; the middle columns carry
the record and the lifecycle; the right column is what the administrator sees. The
outcome chain reads: *a trusted actor produces audit entries that survive; a surviving
record preserves the prior holder; a complete lifecycle means the holder can always say
what happened; one shared counting function means the numbers are the same everywhere.*
A break anywhere in that chain breaks the outcome, which is why the foundation and the
count-consistency group are indivisible rather than merely ordered.

The bottom band — PB-09's traceability and regression baseline — is not a capability but
a **guard on every capability**: it is what makes each link in the chain verifiable
rather than merely intended.

## The Open Items That Travel With the Backlog

None of these is a proto-Unit. Each is an open question that rides with the ranked work
and must be resolved at the point named.

| Item | Gates | Resolves at |
|---|---|---|
| **I-01 / I-03** — whether an existing trusted authentication mechanism exists anywhere in the organisation | PB-00, and therefore PB-01 | The inception stages, before PB-00 is decided |
| **I-02** — whether a records-retention or disposal schedule applies to asset custody records | The audit history's lifecycle, within PB-01 | In parallel with I-01 |
| **I-04** — the unquoted licence cost | Nothing in this backlog — the Build position holds | Carried unchanged |
| **R-02** — organisational adoption readiness | The rollout, not the build | Remains open at the human's direction |

## Assumptions & Open Questions

- [assumption] The backlog's proto-Units are content decisions, not delivery decisions. The inception stages' Units Generation owns the Unit boundaries, the DAG, and the estimates; this document fixes the content, the MoSCoW classification, and the risk-first ranking so that stage does not have to re-open what was decided here. (Q3, Q4)
- [assumption] The WSJF scores are relative judgements between items in this backlog, not estimates of delivery effort. Reach is deliberately not scored, because no usage telemetry exists for a system that has not been built and a fabricated Reach number would be worse than no number. The Delivery Planning stage replaces these with real estimates. (Q4)
- [assumption] PB-02 is ranked as a separate item for its risk-reduction weight, but it is a verification component of PB-01's delivery rather than an independent increment. The inception stage should model it as the verification half of the foundation group, and its live-database proof that deleting an asset no longer destroys its audit rows is the single most important verification in the MVP. (Q1, Q4)
- [assumption] The uniqueness *enforcement* — the functional unique index, the shared comparison predicate, the IMMEDIATE transaction, and the `SQLITE_BUSY` → retryable mapping — belongs to PB-01 and PB-05 as a correctness property. PB-06 is the user-facing layer only. Conflating the two would put a correctness requirement in a UX unit and leave the edit path unconstrained by the registration path's policy. (Q2, memory:M2)
- [assumption] The shared counting function and filter builder are modelled with PB-03, as the mechanism, and PB-04's four surfaces are its consumers. Splitting the mechanism from its consumers would leave the shared definition unused, which is the state in which the counts disagree — the defect the group exists to remove. (Q1, Q3)
- [assumption] The count-consistency group and the foundation group are each indivisible, and the delivery order between the two is the inception stage's to decide; this document fixes that both must land whole, not which lands first. (Q3)
- [assumption] The design-system estimate is retired early under the risk-first heuristic even though C-01's delivery is out of this release, because the gap analysis's 6–8 week estimate is explicitly conditional on scoping that workstream. Learning the estimate before the release schedule is committed is cheaper than learning it afterwards. C-01 is not a release deliverable and is not in the MVP release. (Q2, Q4)
- [assumption] The backlog's ranking ties are not resolved by this document. The confirmed tie-break is the intent's product owner, directly, and any tie arising in the ranking is reserved to that person at the point it arises. (Q7)
- [assumption] PB-07's workbook amendment surface is distributed across the Units that implement it rather than treated as a trailing document. Screen amendments in §9 attach to PB-04's surfaces, the transition amendments in §4.1 attach to PB-03, and the actor-trust amendment in §4.3 attaches to PB-01. (Q2, memory:M3)
- [assumption] PB-08 is included because the workflow scope is `feature`, running all 33 stages with no stage skipped, and the confirmed product boundary includes the operation phase. It is a backlog item because the deployment target's consequences — the single-copy machine-local database file, the absent environment split, the minimal observability — are operational commitments of the MVP, not incidental deployment work. (Q5)
- [assumption] The deferred items C-01 through C-05 keep their approved standing and are not rejected scope. The approved decision set remains the ceiling; the MVP release's contents are the floor plus the must-have set. The backlog records the deferral, the reason, and the trigger that would pull each item forward. (Q2)
- [assumption] I-01 / I-03, I-02, and I-04 remain open and are carried forward unresolved. None is assumed resolved in either direction. Organisational adoption readiness (R-02) remains open at the human's direction, and no priority decision in this backlog retires it. (Q6)

## Sources Consumed

- **scope-document** (`aidlc/spaces/default/intents/261106-asset-tracker-mvp/ideation/scope-definition/scope-document.md`) — the in/out boundary, the two grouping constraints, the three approved invariants, the actor-identity boundary, and the delivery constraints this backlog ranks against.
- **scope-definition-questions** (`aidlc/spaces/default/intents/261106-asset-tracker-mvp/ideation/scope-definition/scope-definition-questions.md`) — the eight confirmed scope answers and the nine accepted assumptions.
- **feasibility-assessment** (`aidlc/spaces/default/intents/261106-asset-tracker-mvp/ideation/feasibility/feasibility-assessment.md`) — the workstream decomposition, the actor-trust evaluation and its candidate shortlist, the platform perspective's operational consequences, and the two qualifications this backlog carries.
- **constraint-register** (`aidlc/spaces/default/intents/261106-asset-tracker-mvp/ideation/feasibility/constraint-register.md`) — the technical and deployment constraints that bound each proto-Unit.
- **raid-log** (`aidlc/spaces/default/intents/261106-asset-tracker-mvp/ideation/feasibility/raid-log.md`) — the risks, assumptions, issues, and dependencies that travel with the ranked work.
- **intent-statement** (`aidlc/spaces/default/intents/261106-asset-tracker-mvp/ideation/intent-capture/intent-statement.md`) — the Audit Completeness metric, the confirmed scope bounds, and the actor-trust rule.

## Review

Reserved for the reviewer at the approval gate.
