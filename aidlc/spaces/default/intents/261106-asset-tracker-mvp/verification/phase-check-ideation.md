# Phase Check — Ideation → Inception

Intent: `261106-asset-tracker-mvp` — Asset Tracker MVP
Scope: `feature` — 33 of 33 stages, no stage skipped
Produced at: `ideation/approval-handoff` (Ideation, 1.7), the final Ideation stage

---

## The check being performed

The Ideation → Inception boundary check has two parts:

1. **Intent → Scope → Intent Backlog consistency** — the scope the release
   carries is the scope the intent asked for, and the backlog delivers that scope
   rather than a different one.
2. **All scope items have feasibility backing** — every capability in the release
   was assessed for technical viability, and no release item rests on an
   assessment that never covered it.

Both parts are checked against the artifacts themselves, not against a summary of
them. Where a finding required reading two artifacts side by side, both are
named.

---

## Part 1 — Intent → Scope → Intent Backlog consistency

### 1.1 Every in-scope intent item is either in the release or explicitly deferred

The intent statement lists ten in-scope items. Each is traced to the scope
document and then to the backlog.

| # | Intent-statement in-scope item [desc] [memory:M3] | Scope document | Intent backlog | Consistent |
|---|---|---|---|---|
| 1 | Actor-attributed, append-only audit history | In scope, §1 the audit-first floor | PB-01 (foundation) | Yes |
| 2 | Previous-holder preservation via `last_assigned_to` | In scope, §1 | PB-01 (foundation) | Yes |
| 3 | `lost → in-stock` recovery with a distinct audit action | In scope, §2 the lifecycle floor | PB-03 (lifecycle) | Yes |
| 4 | `assigned → discarded` resolving the assignment inline | In scope, §2 | PB-03 (lifecycle) | Yes |
| 5 | Five exclusive buckets with one shared counting function and filter builder | In scope, §2 | PB-03 (the shared function lives here) | Yes |
| 6 | Case-insensitive, category-scoped uniqueness via a functional index with a concurrency-safe fallback | In scope, §4 integrity and safety | PB-02 / PB-05, and the uniqueness policy in PB-06's group | Yes |
| 7 | CSV export with formula-injection protection | In scope, §3 the operator-facing must-haves | PB-04 (count-consistency group) | Yes |
| 8 | The workbook amendment surface — the fourteen sections | In scope, §5 | PB-07 | Yes |
| 9 | The remainder of the workbook's MVP feature set — dashboard, assignee directory, asset editing, duplicate-detection UX, empty states, result counts, pagination, improved search, responsive UI, design system | The first four are in scope, §3; the remaining six are deferred to a later increment | PB-04 (dashboard, directory), PB-05 (editing), PB-06 (duplicate-detection UX); the remaining six are C-01 to C-05 in the deferred set | Yes — with the deferral recorded |
| 10 | The design-system enumeration is indicative, not exhaustive; workbook §11 is the authoritative source | Carried into the scope of C-01 | C-01 carries the authoritative-source note | Yes |

**Finding 1 — no intent item is dropped.** Every one of the ten appears in the
release or in the deferred set with a named follow-on and a pull-forward
trigger. Nothing is silently absent.

**Finding 2 — the six deferrals are deferrals, not rejections.** The intent
statement places the remainder of the workbook's MVP feature set in scope. The
scope document places six of those ten items in a later increment, and the
backlog records them as C-01 to C-05 with their approved standing intact and
their triggers stated. The intent's own §Out of scope does not contradict this,
because the intent in-scope list enumerates the workbook's feature set as
something this intent *will specify* in Requirements Analysis, not as something
the MVP release must deliver in full.

This is the one point where a reader could reasonably expect a conflict and
there is none — but the resolution is worth stating, because the intent
statement's wording is broader than the release's. The intent names the
remainder of the workbook's MVP feature set as in scope *for the intent*; the
scope definition allocates a subset of it to the *release*. The intent's own
boundary is the approved decision set, and the scope document's boundary is
inside it. Both are honoured.

### 1.2 The out-of-scope lists agree

| Out-of-scope item | Intent statement | Scope document | Intent backlog |
|---|---|---|---|
| Complex recovery workflows (partial recovery, credit assignment, dispute handling) | Out | Out (§B) | Won't Have |
| Stage-1 POC modification — scope, fingerprints, code, database, tests, configuration | Out | Out (§B) | Not present (correctly — it is a phase constraint, not a scope item) |
| Scope change beyond the approved decision set | Out | Out (§B) | Not present (correctly — a change control, not a scope item) |
| A dark theme | Not named in the intent statement | Out (§B) | Won't Have |
| Integration with any other system | Not named in the intent statement | Out (§B) | Won't Have |
| An external regulatory framework obligation | Not named in the intent statement | Out (§B) | Won't Have |
| A managed relational database | Not named in the intent statement | Not named — it is fixed by the deployment target | Won't Have |

**Finding 3 — the out-of-scope lists are nested, not divergent.** Every item the
scope document excludes is also excluded by the intent statement, and three
exclusions the intent did not name (dark theme, external system integration,
external regulatory framework) are *consequences* of items the intent did name:
the design system is deferred, so its dark-theme extension is not delivered; the
deployment target is a single self-contained host, so no integration exists to
build; and the intent's constraint section records that only a general internal
audit expectation attaches to the custody records.

### 1.3 The dependency structure is identical across the two artifacts

The scope document's dependency diagram and the intent backlog's working groups
are checked edge by edge, because a dependency that differs between the two
artifacts would produce an Inception Unit DAG that contradicts one of them.

| Edge | Scope document | Intent backlog | Consistent |
|---|---|---|---|
| Group 0 (actor decision) blocks Group 1 (foundation) | Yes — "blocking dependency" | PB-00 precedes PB-01 | Yes |
| Group 1 (foundation) is a hard predecessor of Group 2 (lifecycle) | Yes | PB-01/PB-02 precede PB-03 | Yes |
| Group 3 (count-consistency group) follows Group 2 | Yes | PB-04 follows PB-03 | Yes |
| Group 3 is indivisible — all four surfaces or none | Yes | PB-04 carries the indivisibility rule | Yes |
| Group 4 (remaining must-haves) follows Group 3 | Yes | PB-05, PB-06 follow PB-04 | Yes |
| Group 1 is indivisible | Yes | PB-01 + PB-02 are a single Unit | Yes |
| Cross-cutting work is not on the critical chain | Yes | PB-07, PB-08, PB-09 | Yes |

**Finding 4 — the dependency structures agree, edge for edge.** This matters
because the Inception stage builds a Unit DAG from the backlog, and a DAG built
against a different edge set than the scope document states would ship a
foundation before its own predecessor.

### 1.4 The three invariants agree

The scope document's `## The Three Approved Invariants` section defines the
three invariants that are the only things permitted to retire existing POC
behaviour. The intent backlog's source register names them in the same order
and with the same content: append-only history, the five exclusive status
buckets, and the shared counting definition. The team-formation artifacts
reference `INV-1`, `INV-2`, `INV-3` without restating or renumbering them.

**Finding 5 — the invariant labels are stable across all four artifacts.** A
defect was found and corrected during this check: the approval-handoff
deliverables initially restated the three invariants using the *standing
conditions'* phrasing — the shared uniqueness definition and the actor-trust
rule — where the scope document's labels are append-only history, exclusive
buckets, and the shared counting definition. The standing conditions are
binding requirements, but they are not the three invariants, and a reader
comparing the brief against the scope document would have found two different
lists under the same labels. Both approval-handoff deliverables now carry the
scope document's definitions, with the uniqueness and actor-trust conditions
named separately as standing conditions rather than as invariants.

This is a correction to this stage's own deliverables, made before the
approval gate. It changes no scope decision, no backlog item, and no invariant.

### 1.5 The actor-identity boundary agrees in both halves

The boundary has two halves that the scope document explicitly warns must not be
confused, and both are checked in the intent statement, the scope document, the
backlog, the feasibility assessment, and the team-formation artifacts.

| Half | Intent statement | Scope document | Backlog | Feasibility | Team formation |
|---|---|---|---|---|---|
| The **rule** — actor identity from trusted server-side context, never from the write request | Fixed, in Constraints | Fixed, "not reopened by anything in this document" | Carried as fixed | Fixed | Carried as fixed |
| The **mechanism** — which of the four candidates | Not settled; an open assumption | In scope, deferred, a named blocking dependency | PB-00, Rank 1 | Four candidates, shortlist unresolved, a sequencing recommendation | The blocking dependency, not a skill gap |

**Finding 6 — the boundary is stated identically in all five artifacts.** The
rule is never presented as open anywhere, and the mechanism is never presented
as closed anywhere. The approval-handoff deliverables preserve both halves and
add a third statement that the four-candidate shortlist and the sequencing
recommendation are what travels forward, not a mechanism choice.

---

## Part 2 — All scope items have feasibility backing

### 2.1 Every release capability appears in the feasibility assessment's viability table

The feasibility assessment assesses ten capabilities. Each release capability is
matched to its assessment row.

| Release capability (scope document) | Feasibility row | Verdict | Backed |
|---|---|---|---|
| Actor-attributed append-only audit history | "Actor-attributed append-only audit history" | Feasible — structural change required | Yes |
| Previous-holder preservation via `last_assigned_to` | "Previous-holder preservation via `last_assigned_to`" | Feasible — additive change | Yes |
| Audit-log table replacement (structural) | Same row as the first — the replacement is the stated requirement of that row | Feasible — structural change required | Yes |
| `assets` table rebuild (structural) | "Five exclusive status buckets…" and "assigned → discarded transition" — the rebuild is the stated requirement of the `assigned → discarded` row | Feasible — structural change required | Yes |
| Historical backfill | Covered by the audit-history row's table-replacement requirement, and by the standing condition on backfills | Feasible | Yes |
| Five exclusive status buckets, one shared counting function and filter builder | "Five exclusive status buckets, one shared counting function and filter builder" | Feasible — additive change | Yes |
| `lost → in-stock` recovery | "lost → in-stock recovery transition" | Feasible — additive change | Yes |
| `assigned → discarded` transition | "assigned → discarded transition" | Feasible — structural change required | Yes |
| Per-transition validation and audit behaviour | Covered by the recovery and discard rows' stated requirements (the transition map and `ACTION_DESCRIPTIONS` vocabulary) | Feasible | Yes |
| Reconciliation dashboard | "Reconciliation dashboard" | Feasible — but the design-system work is the largest unestimated item | Yes |
| Assignee directory | "Assignee directory, asset editing, duplicate-detection UX, empty states, result counts, pagination, improved search, responsive UI" | Feasible — additive change | Yes |
| CSV export with formula-injection protection | "CSV export with formula-injection protection" | Feasible — additive change | Yes |
| Asset editing | Same grouped row as the assignee directory | Feasible — additive change | Yes |
| Duplicate-detection UX | Same grouped row | Feasible — additive change | Yes |
| Case-insensitive, category-scoped serial uniqueness via a functional index | "Case-insensitive, category-scoped serial uniqueness via a functional index" | Feasible — additive change | Yes |
| Concurrency safety | The same row — the standing conditions' IMMEDIATE transaction, non-zero `busy_timeout`, and `SQLITE_BUSY` mapping are named in that row's requirements | Feasible | Yes |
| The workbook amendment surface | Not a technical capability; it is a specification surface, and its requirements are the capabilities already assessed | n/a — assessed through the capabilities it amends | Yes |

**Finding 7 — every release capability is backed.** No capability in the scope
document's five in-scope areas lacks a feasibility row. The one scope item that
does not appear as a named row — the workbook amendment surface — is a
specification of changes to capabilities that *are* assessed, so it inherits its
backing rather than needing its own.

### 2.2 The feasibility assessment's qualifications are carried forward, not dropped

| Qualification | Carried into the scope document | Carried into the backlog | Carried into the approval-handoff deliverables |
|---|---|---|---|
| The migration runner is the single point of failure and the least-covered area under change | Yes — "Delivery Constraints Carried Forward" names it; the dependency structure makes the foundation a hard predecessor | Yes — PB-02 is the migration runner hardening, Rank 3 | Yes — D-15 is a release condition and a gating condition of the go |
| The design system is the largest unestimated body of work | Yes — deferred, with the estimate retired early under the risk-first heuristic | Yes — C-01 with its sequencing note | Yes — D-16, and the five deferrals table |

**Finding 8 — both qualifications survive the phase transition with their force
intact.** Neither is softened into a note. The migration runner remains a gate
on the foundation, and the design system remains the initiative's largest
unknown.

### 2.3 The deferred set is backed too

The five deferrals are excluded from the release but were assessed before
deferral, which is what makes deferring them defensible rather than an
unexamined cut.

| Deferred item | Feasibility backing |
|---|---|
| C-01 — design system | Assessed in its own right: "approximately 30 components … on a 40-line stylesheet (B10)" — Feasible, largest single body of new work |
| C-02 — responsive UI | Covered by the grouped presentation row — Feasible, additive change |
| C-03 — improved search | Covered by the grouped presentation row — Feasible, additive change |
| C-04 — pagination and result counts | Covered by the grouped presentation row — Feasible, additive change |
| C-05 — empty states | Covered by the grouped presentation row — Feasible, additive change |

**Finding 9 — nothing was deferred without being assessed.** Deferring an
unassessed capability would be an open question wearing a deferral's clothes.
Every one of the five was assessed and found feasible; the deferral is a
prioritisation decision, recorded as such, with its trigger.

### 2.4 The out-of-scope set does not need feasibility backing

Complex recovery workflows, a dark theme, external system integration, external
regulatory compliance, and a managed relational database are excluded. An
excluded item needs no feasibility assessment — but each exclusion is recorded
with a basis rather than a preference, and each basis traces to the approved
decision set, the deployment target, or the compliance scan's finding that only
a general internal audit expectation attaches to these records.

---

## The verdict

**The Ideation → Inception boundary is verified.**

- **Part 1 — Intent → Scope → Intent Backlog consistency: PASS.** All ten
  in-scope intent items are accounted for; the out-of-scope lists are nested
  rather than divergent; the dependency structures agree edge for edge; the
  three invariants are labelled identically across all four artifacts; and the
  actor-identity boundary is stated identically in both halves in all five
  artifacts.
- **Part 2 — all scope items have feasibility backing: PASS.** Every one of
  the seventeen release capabilities maps to a feasibility row; both
  qualifications carry forward with their force intact; and all five deferred
  items were assessed before deferral.

**One defect was found and corrected during the check.** The approval-handoff
deliverables initially mislabelled the three invariants, using the standing
conditions' phrasing instead of the scope document's definitions. The
correction was applied to both deliverables before the approval gate. It
changed no scope decision, no backlog item, and no invariant.

**Nothing in this check closes an open item.** I-01 / I-03, I-02, I-04, R-02,
Q19, the reviewer individuals, and stakeholder availability all remain open and
are carried into Inception with their next actions recorded in the decision
log.

---

## What Inception inherits

| Item | State at the boundary |
|---|---|
| The approved decision set and the workbook | The ceiling, unchanged, not reopened |
| The seven standing conditions | Carried unchanged, each with its enforcing surface |
| The release contents | The floor plus the five operator must-haves, in five areas |
| The five deferrals | C-01 to C-05, each with its pull-forward trigger |
| The two indivisible groups | The foundation workstream and the count-consistency group, delivered whole |
| The three invariants | The only things that may retire existing POC behaviour |
| The actor-identity mechanism | Open, and a named blocking dependency of the foundation |
| The 66/66 test baseline | A merge gate, preserved |
| The sixteen risks, twelve assumptions, six issues, thirteen dependencies | All open, with their owners and mitigations |
| The single-developer topology | The design-board checkpoint before the foundation, as a condition of proceeding |
| The capacity position | An allocation rule, not a figure |
| The five go/no-go conditions | Attached to the approval and binding on Inception |

---

## Review

Reserved for the reviewer at the approval gate.
