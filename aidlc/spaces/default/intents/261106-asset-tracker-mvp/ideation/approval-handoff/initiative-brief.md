# Initiative Brief — Asset Tracker MVP

Stage: `approval-handoff` (Ideation, 1.7)
Intent: `261106-asset-tracker-mvp`
Scope: `feature` — 33 of 33 stages, no stage skipped
Phase boundary: **IDEATION → INCEPTION**

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

## 1. Intent and Problem Statement

**The problem.** The Asset Tracker proof of concept destroys the record it exists to
keep. Three failures compound each other:

- **A loss destroys the previous holder.** When an asset is marked lost, the POC
  clears the holder and keeps nothing about who had it before. The asset leaves
  the organisation's knowledge of its own custody.
- **A reassignment overwrites custody history.** The same field holds "who has it
  now" and "who had it", so a second assignment erases the first.
- **A deletion destroys the audit trail.** Deleting an asset cascades away its
  audit rows. The record of what happened to it does not survive the record of
  the asset itself.

Two further defects sit alongside them. Serial uniqueness is case-sensitive, so
`SN-4471` and `sn-4471` are two different assets to the database. And the
interface has no counts at all, so nobody can reconcile what the organisation
holds against what any one screen says.

**The intent.** Build the Asset Tracker MVP from the approved 17-item decision
set and the Asset Tracker MVP Development Workbook, adding to the POC:

- Actor-attributed, append-only audit history.
- Previous-holder preservation via `last_assigned_to`.
- Lost-asset recovery (`lost → in-stock`) and an `assigned → discarded`
  transition that resolves the assignment inline.
- Five exclusive status buckets, with Active Inventory and Total Records computed
  by one shared counting function behind a reusable filter builder.
- Case-insensitive, category-scoped serial uniqueness through a functional index
  with a concurrency-safe application-level fallback.
- CSV export with formula-injection protection.
- The workbook amendment surface: sections 4.1, 4.2.5, 4.3, 4.4, 6.1, 6.4, 6.5,
  9, 10, 21.1, 21.2, 22, 24, and the two new section 27 sections.

**The success measure.** Audit Completeness — 100% of audit entries carry an
actor attribution, and no asset deletion destroys an audit row. Pre-MVP history
is backfilled to a `system` actor and excluded from that population, per the
section 24 qualifier [memory:M3].

**The customer.** Internal IT asset administrators who register, assign, and
write off assets on behalf of the organisation [Q1].

---

## 2. Market Validation Summary

**The incumbent is a spreadsheet-and-email process.** There is no system of
record; custody lives in documents that are copied, forwarded, and reconciled by
hand.

**The differentiator is auditability, not feature count.** The competitive
analysis separates four table-stakes capabilities — registration, assignment,
status tracking, write-off — from the nine properties that make the custody
record defensible. Each of the nine is an architectural invariant, a domain rule,
or a consistency-by-construction guarantee rather than a feature:

| # | Auditability property | How it is achieved |
|---|---|---|
| 1 | Every audit entry names an actor | Actor column, resolved from trusted server-side context |
| 2 | History is never rewritten | Append-only, insert-only to the application |
| 3 | Deleting an asset does not delete its history | Cascade removal from `audit_log` |
| 4 | The previous holder is always visible | `last_assigned_to`, retained and separately displayed |
| 5 | A write-off is attributable | `discarded` action naming the prior holder and the inline resolution |
| 6 | A loss is attributable | `mark-lost` action naming the prior holder |
| 7 | A recovery is its own event | `recovered` action, distinct from `assign` and `return` |
| 8 | The counts agree everywhere | One shared counting function, four consuming surfaces |
| 9 | A duplicate cannot be created silently | One shared uniqueness definition, enforced on registration and on edit |

The four table-stakes capabilities are Modify/Modify/Extend/Replace dispositions
against the incumbent, and roughly **35–40% of the foundational work already
exists** in the POC. That is why the build extends the POC rather than replacing
it.

**The build-vs-buy position is Build.** Four alternatives were evaluated against
seven criteria. The off-the-shelf comparison is recorded at **Hypothesis**
confidence only — no vendor survey was performed — and the licence cost is
indeterminate (I-04), so the Build position rests on the capability and
auditability grounds rather than on that comparison [Q12]. The comparison is
carried forward as a recorded uncertainty, not as a resolved finding.

**Four hypotheses remain open**, and one of them is the initiative's highest-
leverage question: whether the actor mechanism can be settled without introducing
deferred authentication.

---

## 3. Feasibility and Risk Highlights

### The verdict

**Feasible**, with two qualifications.

All ten capability areas were assessed against a **verified** technical baseline
— ten baseline facts established by execution rather than by reading source
(probing the schema constraint behaviour, the index support, the pragma
defaults, a migration over a legacy database, and the test baseline against a
live instance). Two capabilities need a **structural table rebuild**; the other
eight are additive.

| Group | Capabilities | Change shape |
|---|---|---|
| Foundation | Actor-attributed audit history; previous-holder preservation; asset-row rebuild for the `discarded` bucket | Two structural rebuilds |
| Lifecycle | Five exclusive buckets; `lost → in-stock` recovery; `assigned → discarded`; per-transition validation and audit | Additive |
| Integrity | Case-insensitive category-scoped uniqueness; concurrency safety | Additive |
| Surfaces | Reconciliation dashboard; assignee directory; asset editing; duplicate-detection UX; CSV export | Additive |

### The two qualifications

**Qualification 1 — the migration runner is load-bearing and least-covered.**
Both structural rebuilds run through it, and it is the least-covered of the three
areas under change. The approval makes this a **gate**: before either structural
rebuild is applied, the migration runner is tested against a representative copy
of the existing populated SQLite database, demonstrating successful `assets`-table
rebuilding, row-for-row preservation of existing asset data, preservation of audit
history, and successful migration completion. The live operational database is
never the test target, and the test evidence is recorded before the foundation
migrations proceed [Q9].

**Qualification 2 — the design system is the largest unestimated body of work.**
It is deferred from this release. Its estimate is retired early under the
risk-first heuristic, because the gap analysis's 6–8 week figure is explicitly
conditional on scoping that workstream. Learning the estimate before the release
schedule is committed is cheaper than learning it afterwards.

### The risk position

**Sixteen risks are open. None is closed.** The approval acknowledges them as
recorded, preserving their status, mitigations, and named ownership [Q9].

| Risk | Rating | Position |
|---|---|---|
| **R-01** — migration runner is the single point of failure | High | Foundation implementation is **gated on demonstrated migration safety**, evidenced before the rebuilds land [Q9] |
| **R-02** — organisational adoption readiness | High | **Stays open.** Resolved through the stakeholder process before operational readiness is accepted; adoption risk is not assumed low or resolved [Q9] |
| **R-15** — single-developer concentration | High | ADR practice and the mandatory design-board checkpoint retained; no second implementation author is introduced and no uncommitted external support is assumed [Q9] |
| R-03, R-04, R-05, R-06, R-07, R-08, R-09, R-10, R-11, R-12, R-13, R-14, R-16 | Various | Existing status, owners, and recorded mitigations retained |

The remaining thirteen risks are covered by the skill-gap remediation plan — each
with a **trigger** (the arrival of the work that depends on it) and a closing
mechanism from the three the team confirmed: research, consultation outside the
team, or specialist help — and by the ADR obligation and the design-board
checkpoint.

**Twelve assumptions, six issues, and thirteen dependencies are open**, and the
aggregate position is that nothing is closed. Three items warrant attention:
I-01 / D-08 (the actor decision), R-01, and R-02 / I-05.

### The actor-identity evaluation

The actor-trust **rule** is fixed and is not reopened at any stage of this
intent: actor identity is resolved from trusted server-side context, and actor
information supplied in a write request is never trusted [memory:M2]. What is
undecided is the **mechanism**.

The verified baseline shows the estate contains no authentication code, no
session handling, no user store, no identity provider, and no authenticating
proxy. **That is a fact about the codebase, not a finding about the organisation.**
No candidate is assumed available, and no candidate is assumed unavailable. Four
candidates were assessed on cost:

| Candidate | Shape | Cost |
|---|---|---|
| A | Server-configured single operator | Negligible |
| B | Trusted request header from an authenticating proxy | Low, but requires a proxy that must already exist |
| C | Operator selection | Weak — the operator remains self-declared |
| D | Application-managed login | Substantial — sessions, credential storage, a password lifecycle, an authorisation surface |

The recommendation is a **sequencing** recommendation, not a mechanism choice:
resolve I-01 first, then decide against the shortlist.

---

## 4. Scope Boundary

**The approved set is the ceiling. This release sets the floor.**

### In the release

| # | Area | Contents |
|---|---|---|
| 1 | **Audit-first floor** | Actor-attributed append-only history; `last_assigned_to`; `audit_log` table replacement; `assets` table rebuild; historical backfill to a `system` actor preserving originals and reporting failures |
| 2 | **Lifecycle floor** | Five exclusive buckets; `lost → in-stock` recovery; `assigned → discarded` resolving the assignment inline; explicit validation and audit behaviour on every transition |
| 3 | **Five operator must-haves** | Reconciliation dashboard; assignee directory; CSV export with formula-injection protection; asset editing; duplicate-detection UX |
| 4 | **Integrity and safety** | Case-insensitive category-scoped uniqueness; concurrency safety |
| 5 | **Workbook amendment surface** | The fourteen amended and added workbook sections [memory:M3] |

### Deferred — not rejected

Each keeps its approved standing, is a named follow-on item in the backlog, and
carries a pull-forward trigger:

| Item | Trigger for pulling it forward |
|---|---|
| **C-01** — design system (workbook §11) | The start of the deferred increment. Its estimate is retired early under the risk-first heuristic |
| **C-02** — responsive UI | C-01's breakpoints and spacing tokens land |
| **C-03** — improved search | C-01's control vocabulary lands |
| **C-04** — pagination and result counts | The asset count grows beyond the confirmed medium scale |
| **C-05** — empty states | C-01's vocabulary lands |

The POC's existing search and the POC's bare empty row remain in the release.

### Explicitly out of scope

Complex recovery workflows (partial recovery, credit assignment, dispute
handling) — distinct from the single included `lost → in-stock` transition
[memory:M3]. Stage-1 POC modification. Scope changes. Integration with other
systems. An external regulatory framework. Dark theme.

### The actor-identity boundary

The mechanism is **in scope; the choice is deferred**. The rule is fixed; the
mechanism is a named blocking dependency of the foundation workstream.

### The three approved invariants

These are the only things that may retire existing POC behaviour. Everything the
POC does is preserved by default; the boundary is these three, not a
behaviour-by-behaviour audit.

- **INV-1** — audit history is append-only and survives asset deletion.
- **INV-2** — the five status buckets are exclusive, and a discarded asset's row
  and history are never deleted.
- **INV-3** — dashboard, assignee, asset-list, and CSV counts share one
  filtering and counting definition.

Two further standing conditions travel with the release and are not invariants:
the uniqueness definition is shared between the functional-index expression and
the application-level comparison predicate and applies equally on registration
and on edit [memory:M2], and the actor-trust rule is fixed and never reopened
[memory:M2].

### The dependency structure

```
Group 0  actor decision (PB-00)          ── blocked on I-01
    |
Group 1  foundation (PB-01 + PB-02)      ── indivisible, gated on the design board
    |
Group 2  lifecycle (PB-03)               ── the shared counting function lives here
    |
Group 3  count-consistency group (PB-04) ── four surfaces or none
    |
Group 4  remaining must-haves (PB-05, PB-06)
    +
Cross-cutting: PB-07 amendments, PB-08 operational readiness, PB-09 traceability
```

Two groups are **indivisible** and are delivered whole. A group shipping all but
one of its members has no guarantee at all — it ships the exact defect the group
exists to remove.

---

## 5. Concept Visuals

The concept is eight screens and seven flows, drawn in `wireframes.md` and
`user-flow.md` and accepted as the Product Owner-approved concept [Q11].

### The navigation and the shared frame

```
+------------------------------------------------------------------+
| ASSET TRACKER     Dashboard | Assets | Holders      [New asset]  |
|                                                  Acting as: ... |
+------------------------------------------------------------------+
```

### W1 — The reconciliation dashboard

```
|  Active Inventory      243        |   Total Records     248      |
|  available to assign   37         |   every asset ever            |
|                                    |   registered, never deleted    |
|  In stock 37 | Assigned 191 | Returned 9 | Lost 6 | Discarded 5   |
|  Attention: 6 assets marked lost — no recovery recorded           |
```

Every number on this screen, on the asset list, in the holder directory, and in
the CSV export is a read from **one** shared counting function through **one**
filter builder. The frame reconciles under both readings: the five bucket tiles
sum to 248, which is Total Records, and 248 − 5 discarded = 243, which is
Active Inventory.

### W6 — The assignee directory

```
| Dana Reyes             | Unassigned                  |
| 4 assets               | 37 assets                   |
| [Assigned 3] [Lost 1]  | [In stock 37]               |
|  ThinkPad  SN-4471  [Assigned]    |
|  Dell     SN-4468  [Assigned]    |
|  iPhone 14 SN-4512 [Assigned]    |
|  USB-C    SN-4503  [Lost]        |
|             last holder           |
```

The directory shows what is **and was** Dana's. The `USB-C Dock` is under Dana
because Dana was its last holder — it is not in Dana's hands. "Unassigned" is a
row, not an absence: it holds only assets that have never been held by anybody.

### F5a — The lifecycle map

Exactly five states and eight drawn edges, out of the ten edges of the approved
§4.1 transition table [memory:M3]:

```
| From         | To         | Action        | Reason required |
|--------------|------------|---------------|------------------|
| in-stock     | assigned   | Assign        | No               |
| in-stock     | lost       | Mark lost     | Yes              |
| assigned     | returned   | Mark returned | No               |
| assigned     | lost       | Mark lost     | Yes              |
| assigned     | discarded  | Discard       | Yes              |
| returned     | assigned   | Re-assign     | No               |
| returned     | lost       | Mark lost     | Yes              |
| lost         | in-stock   | Recover       | Yes              |
```

**The edge-count reconciliation: ten approved = eight drawn + two omitted.**
The two omitted are `in-stock → discarded` and `returned → discarded`. Both are
omitted deliberately, not withdrawn: a discard resolves a live assignment
inline, and neither source state holds one. Their approved standing is intact
and they remain tracked as Q19 [Q11].

`discarded` is terminal — no edge leaves it. `lost` is no longer a dead end: the
recovery path replaces the POC's "cannot be transitioned" message. `in-stock →
lost` exists so an asset registered into stock and later found missing has a way
to record the loss.

### The actor rule, applied to every write

```
| any write flow (F1, F5b, F5b2, F5c, F5d, F5e, F5g, F5h)   |
| the actor on the audit entry is resolved from trusted      |
| server-side context; never read from the request, never    |
| typed by an operator, never a picker on any screen         |
```

There is no branch here, and that is the point: no screen in this release offers
an actor control, so no write flow can be given a forged actor.

### The accessibility floor

**WCAG 2.1 AA** — colour is never the only carrier of meaning, every control is
keyboard-reachable, form errors are associated with their field, one `h1` per
screen with landmarks, and a skip link as the first focusable element on every
screen. This is the first point in the initiative where an accessibility level is
stated at all; it was established at Rough Mockups and accepted as the design
floor [Q11].

### What the concept deliberately does not show

No login screen. No operator-selection picker. No loading state — the application
is synchronous and server-rendered, and a drawn spinner would misdescribe how it
behaves. No empty states — they are deferred. No responsive variants. No holder
detail page. No bulk-edit surface.

---

## 6. Team Plan

### The roster

One developer plus a small number of named reviewers from IT leadership,
finance, and operations. **The reviewers are not authors.** Their participation
is structured around three defined points and no more:

| Review point | Who | What is decided or checked |
|---|---|---|
| The actor-mechanism decision | IT leadership, with the Product Owner deciding | Which candidate establishes the trusted actor, once I-01 is answered |
| The operational-readiness sign-off | Operations and IT leadership, Product Owner signing off | That the operation phase's obligations are discharged |
| The internal-reviewer demonstration | The internal reviewer | That the custody record is defensible end to end by someone outside the build team |

This makes the reviewer load **event-driven rather than continuous**. The
specific individuals must be named before the first review point is scheduled;
until then the groups are staffed but not scheduled.

### The topology

**A single-owner stream with an explicit design-board checkpoint before the
foundation** — not a mob programme. A mob requires two or more people working
together in real time, and the confirmed facts are one person, one location, and
no working overlap. There is nobody to rotate the driver with.

The design board is a **condition of proceeding**, not a ceremony: the
foundation is not built until the board has reviewed its design. It is chaired by
the Product Owner, with the developer presenting and IT leadership consulted —
the constituency whose answer to I-01 the foundation depends on.

### The capacity position

**No new resource commitment** [Q10]. There is no date, no velocity figure, and
no separate budget. Capacity is finite and unquantified; the position is
expressed as an **allocation rule**:

> The actor-identity resolution and the design-board checkpoint take precedence
> over every other item in the queue, and no other work is allowed to displace
> them, because the entire dependency structure hangs off them.

Where risk-first ordering and capacity pressure would conflict, the allocation
rule wins for the actor-mechanism item and the design board, because those two
are the items whose failure is unrecoverable.

### The working groups and their order

| Stage | Group | Backlog item | Gate |
|---|---|---|---|
| A | The resolution | — | I-01 / I-03 answered |
| B | The actor-mechanism decision | PB-00 | The Product Owner decides |
| — | **DESIGN BOARD** | — | **No foundation is built until this passes** |
| C | The foundation | PB-01 + PB-02 | Live-database proof that deleting an asset no longer destroys its audit rows |
| D | The lifecycle | PB-03 | The shared counting function and filter builder |
| E | The count-consistency group | PB-04 | All four surfaces or none |
| F | The remaining must-haves | PB-05, PB-06 | The uniqueness policy and the bucket model |
| G | Cross-cutting | PB-07, PB-08, PB-09 | Amendments, operational readiness, traceability |

### The inherited obligations

| Obligation | Why it lands on this team | Discharge |
|---|---|---|
| The 66/66 passing test baseline | A standing condition of the approved decision set [memory:M2] | The existing suite stays green on every change; no test weakened or removed. Enforced in the build pipeline, not by intent |
| The absence of CI | A pre-existing gap the MVP inherits rather than creates | The build-and-test stage delivers it, or the scope's coverage floor and merge gate are unverifiable |
| The single-copy database file | The SQLite file is the entire system of record, in a gitignored `data/` directory | A backup-and-restore procedure that is **exercised**, not merely written |
| The migration runner's coverage | Both structural changes run through it | Strengthen the runner's coverage before the rebuilds land [Q9] |
| The unconditional update path | The repository writes every column unconditionally, so a partial update clears one | Make the update path explicit, so `last_assigned_to` retention and `assigned_to` clearing during a discard are deliberate |

### The skill position

**The build skills are covered; the operational skills are where the gaps are.**
Every gap — backup-and-restore design, backup-and-restore rehearsal, CI
authoring, incident response — sits in the operation phase, which is inside the
release because the scope is `feature`. The design system's partial coverage is
recorded against the *deferred increment*, where it belongs, and does not count
against the release.

No gap is a blocker on the foundation: the foundation's needs — migration work,
schema rebuild, repository corrections — are covered skills with correctable
weaknesses. That matters, because the foundation is where the actor-identity
block bites.

---

## 7. Go / No-Go Recommendation

### Recommendation: **GO**, with one gated entry.

The initiative is feasible, the scope is bounded and defensible, the market
position is sound on grounds that do not depend on the un-surveyed vendor
comparison, and the sequencing retires the highest uncertainty first.

### The conditions attached to the go

| # | Condition | Why |
|---|---|---|
| 1 | **I-01 is resolved as the first Inception action**, and the actor decision (PB-00) is taken against the four-candidate shortlist | It is the foundation's blocking dependency, and it cannot be closed by the team working harder — it needs an answer from the organisation [Q14] |
| 2 | **The design board reviews the foundation's design before any foundation work is built** | Its mechanism determines everything above it, and the actor model is unresolved when the board sits |
| 3 | **Foundation implementation is gated on demonstrated migration safety** | R-01 is the single point of failure for both structural rebuilds and the least-covered area under change [Q9] |
| 4 | **R-02 stays open until the stakeholder process has resolved it**, before operational readiness is accepted | Adoption readiness is a rollout risk, not a scope defect, and approval does not retire it [Q9] |
| 5 | **The actor-independent work is specified in parallel** | The shared counting definition's specification, the CSV export's formula-injection contract, and the workbook amendment surface do not depend on the actor model and are not held hostage to it [Q14] |

### The cost of the gate

The team is **not** preparing both branches of the actor mechanism in parallel.
If I-01 resolves late, the actor-dependent work starts late. That cost is
accepted deliberately: preparing both branches spends effort on a branch that may
never be needed, and the risk-first heuristic prefers retiring the actual
uncertainty over insuring against it.

### What is not committed by this approval

- No date, no throughput figure, no effort estimate, and no budget.
- No closure of any of the sixteen risks, twelve assumptions, six issues, or
  thirteen dependencies.
- No independent endorsement by the four stakeholder groups — the Product
  Owner's approval establishes the project baseline; the groups receive the
  agreed periodic summary, and any material objection or proposed scope change
  comes back through the human approval process [Q8].
- No choice of the actor-identity mechanism.
- No re-opening of the approved decision set or the workbook.

### The first Inception actions

1. Gather the internal existing-tool inventory — this resolves I-01 and I-03
   together, and it is the single unblocking action in the initiative.
2. Confirm stakeholder availability and expected response times, which gates the
   foundation's schedule.
3. Take the actor-mechanism decision (PB-00) against the candidate shortlist.
4. Convene the design board on the foundation's design.
5. In parallel and not held hostage to I-01: specify the shared counting
   definition and its filter builder, the CSV export's formula-injection
   contract, and the workbook amendment surface.

---

## Assumptions & Open Questions

- [assumption] The approved decision set and the Asset Tracker MVP Development Workbook remain the binding technical and product contract for this intent. This stage does not reopen them, and the seven standing conditions they carry are treated as release requirements rather than as suggestions. (memory:M2, memory:M3, memory:M4)
- [assumption] The release boundary recorded in the scope document is the release contents, and the five deferrals — design system, responsive UI, improved search, pagination and result counts, and empty states — are deferred rather than rejected. Each keeps its approved standing and carries a named pull-forward trigger. (Q11)
- [assumption] The three open items ride with the release unchanged: I-01 / I-03 (whether a trusted authentication mechanism exists anywhere in the organisation), I-02 (whether a records-retention or disposal schedule applies to asset custody records), and I-04 (the unquoted licence cost). None is assumed resolved in either direction by this approval. (Q9, Q14)
- [assumption] Organisational adoption readiness (R-02) remains open at the human's direction. It is a rollout risk, not a scope defect, and no scope or priority decision retires it. (Q9)
- [assumption] The ten proto-Units and their risk-first ordering are the release's delivery shape. The two indivisible groups — the foundation workstream and the count-consistency group — are delivered whole and are never split across increments. (Q13)
- [assumption] The capacity position is an allocation rule rather than a figure: the actor-identity resolution and the design-board checkpoint take precedence over every other item in the queue, and no date, throughput, or effort figure is committed by this approval. (Q10)
- [assumption] The reviewer constituency is recorded by constituency rather than by individual, because the confirmed team-formation answer names IT leadership, finance, and operations without naming the people. The specific individuals must be named before the first review point is scheduled, and until then the groups are staffed but not scheduled. (Q13)
- [assumption] The off-the-shelf comparison in the market research remains at hypothesis confidence. It is recorded as an uncertainty in this brief, not presented as a surveyed finding, and the Build position rests on the capability and auditability grounds rather than on that comparison. (Q12)
- [assumption] The rough mockups are the concept the stakeholders review, with the actor indicator drawn read-only and marked provisional. If PB-00 selects the operator-selection candidate, the indicator becomes interactive and the wireframes change; that consequence is recorded rather than pre-empted. (Q11)
- [assumption] The two omitted discard edges — `in-stock → discarded` and `returned → discarded` — keep their approved standing and are not withdrawn, reclassified, or deferred by this stage. The release-boundary question they raise was carried to the scope stage as a named open question (Q19) and remains one. (Q11, memory:M3, memory:M4)
- [assumption] The existing 66/66 passing test baseline is a merge gate the release preserves, and the absence of any CI workflow is an inherited obligation the build-and-test stage owns rather than a skill gap the current team cannot cover. (memory:M2)
- [assumption] The design system remains the largest single body of unestimated work in the initiative and is deferred from this release, with its estimate retired early under the risk-first heuristic. It is not a release deliverable and no later stage may read it as one. (memory:M3)
- [assumption] The single-developer concentration risk is accepted with its mitigation — the architectural decisions recorded as ADRs and the design-board checkpoint before the foundation — rather than by adding a second author. The confirmed answers are explicit that the reviewers are not authors. (Q9, Q13)
- [assumption] This brief presents the Ideation phase's conclusions as they stand. This stage does not open new technical questions, and any issue it surfaces that needs a decision is recorded as an open item rather than resolved here. (Q8, Q14)

---

## Sources Consumed

- **intent-statement** (`aidlc/spaces/default/intents/261106-asset-tracker-mvp/ideation/intent-capture/intent-statement.md`) — the problem statement, the target customer, the Audit Completeness metric and its measurable form, the confirmed scope bounds, and the actor-trust rule.
- **stakeholder-map** (`aidlc/spaces/default/intents/261106-asset-tracker-mvp/ideation/intent-capture/stakeholder-map.md`) — the four stakeholder groups, their interests, the decision-maker/influencer split, and the periodic summary cadence.
- **competitive-analysis** (`aidlc/spaces/default/intents/261106-asset-tracker-mvp/ideation/market-research/competitive-analysis.md`) — the table-stakes and differentiator split, the nine auditability properties, and the off-the-shelf comparison at hypothesis confidence.
- **market-trends** (`aidlc/spaces/default/intents/261106-asset-tracker-mvp/ideation/market-research/market-trends.md`) — the six trends and the four open hypotheses.
- **build-vs-buy** (`aidlc/spaces/default/intents/261106-asset-tracker-mvp/ideation/market-research/build-vs-buy.md`) — the four alternatives, the seven-criterion evaluation, the Build position, and the indeterminate total-cost row.
- **feasibility-assessment** (`aidlc/spaces/default/intents/261106-asset-tracker-mvp/ideation/feasibility/feasibility-assessment.md`) — the verified baseline, the ten-capability viability table, the actor-trust evaluation and candidate shortlist, the effort and sequencing table, and the two qualifications.
- **constraint-register** (`aidlc/spaces/default/intents/261106-asset-tracker-mvp/ideation/feasibility/constraint-register.md`) — the binding technical, organisational, deployment, and data constraints.
- **raid-log** (`aidlc/spaces/default/intents/261106-asset-tracker-mvp/ideation/feasibility/raid-log.md`) — the sixteen risks, twelve assumptions, six issues, thirteen dependencies, and their named owners.
- **scope-document** (`aidlc/spaces/default/intents/261106-asset-tracker-mvp/ideation/scope-definition/scope-document.md`) — the release boundary, the two indivisible groups, the three invariants, the actor-identity boundary, and the open items that ride with the release.
- **intent-backlog** (`aidlc/spaces/default/intents/261106-asset-tracker-mvp/ideation/scope-definition/intent-backlog.md`) — the ten ranked proto-Units, the deferred set C-01 through C-05 with their triggers, and the value stream map.
- **team-assessment** (`aidlc/spaces/default/intents/261106-asset-tracker-mvp/ideation/team-formation/team-assessment.md`) — the roster, the capacity allocation agreement, the RACI matrix, and the inherited obligations.
- **mob-composition** (`aidlc/spaces/default/intents/261106-asset-tracker-mvp/ideation/team-formation/mob-composition.md`) — the topology decision, the working groups, the sequence of work, the checkpoints, and the onboarding checklist.
- **skill-matrix** (`aidlc/spaces/default/intents/261106-asset-tracker-mvp/ideation/team-formation/skill-matrix.md`) — the skill coverage position, the gap analysis, and the thirteen trigger-based remediations.
- **team-formation-questions** (`aidlc/spaces/default/intents/261106-asset-tracker-mvp/ideation/team-formation/team-formation-questions.md`) — the nine confirmed team-formation answers and the nine accepted assumptions.
- **wireframes** (`aidlc/spaces/default/intents/261106-asset-tracker-mvp/ideation/rough-mockups/wireframes.md`) — the eight screens, the shared frame, the per-screen accessibility notes, the screen-state table, the accessibility commitments, and the deferred-and-absent table.
- **user-flow** (`aidlc/spaces/default/intents/261106-asset-tracker-mvp/ideation/rough-mockups/user-flow.md`) — the seven flows, the F5a transition map and its ten-eight-two edge reconciliation, the reason-dialog contract, and the cross-cutting paths.
- **rough-mockups-questions** (`aidlc/spaces/default/intents/261106-asset-tracker-mvp/ideation/rough-mockups/rough-mockups-questions.md`) — the nineteen confirmed answers (Q1–Q19) and the thirty-four accepted assumptions the concept is drawn against.

---

## Review

Reserved for the reviewer at the approval gate.
