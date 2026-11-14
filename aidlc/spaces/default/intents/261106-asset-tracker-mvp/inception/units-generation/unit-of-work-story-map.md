# Unit–Story Map — Asset Tracker MVP

**Stage**: units-generation (inception)
**Intent**: 261106-asset-tracker-mvp
**Space**: default

This file maps every released user story to the unit that implements it,
names the cross-cutting stories that span more than one unit, gives the
implementation order *within* each unit, and verifies coverage in both
directions.

**Note on "implementation order".** The order given below is the order
*inside* a unit — the sequence in which a unit's own stories are built,
which is a property of the unit and not a statement about which unit is
built first. The order *between* units is Delivery Planning's decision, and
this file does not state it.

---

## Story Assignment Table

| Story | Title | Unit | Directory |
|---|---|---|---|
| US0.1 | The custody history survives the release's own migration | U1 | `u1-foundation` |
| US1.1 | Register a new asset | U3 | `u3-write-path` |
| US1.2 | One definition of a serial or licence key | U2 | `u2-domain-vocabulary` |
| US1.3 | The database refuses the same collision | U3 | `u3-write-path` |
| US1.4 | Two concurrent registrations cannot both succeed | U3 | `u3-write-path` |
| US2.1 | Assign an asset to a colleague | U3 | `u3-write-path` |
| US2.2 | Take an asset back | U3 | `u3-write-path` |
| US3.1 | The asset lifecycle's legal transitions | U3 | `u3-write-path` |
| US3.2 | Record the loss of an asset | U3 | `u3-write-path` |
| US3.3 | The shared reason vocabulary | U2 | `u2-domain-vocabulary` |
| US3.4 | Retire an asset and resolve its assignment | U3 | `u3-write-path` |
| US3.5 | Recover a lost asset | U3 | `u3-write-path` |
| US3.6 | The audit action vocabulary | U2 | `u2-domain-vocabulary` |
| US3.7 | The reason dialog explains the transition before it asks | U5 | `u5-presentation` |
| US4.1 | Read an asset's complete history | U5 | `u5-presentation` |
| US4.2 | The record of an asset cannot be rewritten | U1 | `u1-foundation` |
| US4.3 | An edit is recorded as a history entry | U3 | `u3-write-path` |
| US5.1 | Every count comes from one shared definition | U2 | `u2-domain-vocabulary` |
| US5.2 | Reconcile the inventory at a glance | U5 | `u5-presentation` |
| US5.3 | See what a named holder has | U5 | `u5-presentation` |
| US5.4 | Browse and filter the asset list | U5 | `u5-presentation` |
| US5.5 | Export the asset list to a CSV file | U4 | `u4-reporting` |
| US5.6 | One definition of a holder | U2 | `u2-domain-vocabulary` |
| US5.7 | The release's performance is measured, not assumed | U4 | `u4-reporting` |
| US6.1 | Correct an asset's details | U3 | `u3-write-path` |
| US6.2 | Be told about a duplicate serial before submitting | U5 | `u5-presentation` |
| US6.3 | Have a duplicate serial refused with a way forward | U3 | `u3-write-path` |
| US6.4 | Register without choosing an assignee | U3 | `u3-write-path` |
| US7.1 | Every write is attributed to a trusted actor | U3 | `u3-write-path` |
| US7.2 | Every screen is operable and readable without a mouse | U5 | `u5-presentation` |

### Deferred stories

The ten approved and deferred capabilities map to **no unit**. Each is
recorded here with its attachment point — the component it would join, and
the unit that component belongs to — exactly as the domain design's
traceability did.

The attachment point is a statement about *where the work would land*, not
an assignment of the story to a unit. None of these stories is delivered in
this release, none consumes any of that unit's capacity, and the unit is not
a placeholder holding an empty slot in the DAG.

| Story | Title | Attachment point | Deferred to |
|---|---|---|---|
| US8.1 | Partial recovery | U3 `u3-write-path` — `AssetLifecycle`, the recovery family's attachment point; the single `lost → in-stock` edge is released by US3.5 and this item extends it to partial recovery | A later increment |
| US8.2 | Credit assignment | U3 `u3-write-path` — `AssetLifecycle`, the recovery family's attachment point; attributing a recovered asset's value to a person or cost centre has no released component | A later increment |
| US8.3 | Dispute handling | U5 `u5-presentation` — `AssetHistory`, the recovery family's attachment point; a contested claim over who held an asset has no released component | A later increment |
| US8.4 | The `in-stock → discarded` edge | U3 `u3-write-path` — `AssetLifecycle` and U2 `u2-domain-vocabulary`, the transition table's attachment point; the edge is refused by the released table and joins it here | A later increment |
| US8.5 | The `returned → discarded` edge | U3 `u3-write-path` — `AssetLifecycle` and U2 `u2-domain-vocabulary`, the transition table's attachment point; the edge is refused by the released table and joins it here | A later increment |
| US8.6 | The design system | U5 `u5-presentation` — `ScreenPresenter`, the presentation layer's attachment point; the release renders from the existing stylesheet's vocabulary | A later increment |
| US8.7 | Responsive UI | U5 `u5-presentation` — `ScreenPresenter`, the presentation layer's attachment point; the release's three recorded responsive constraints are the starting point | A later increment |
| US8.8 | Improved search | U4 `u4-reporting` — `AssetQuery`, the search dimension's attachment point; the release keeps the existing free-text search over name and serial or key | A later increment |
| US8.9 | Pagination | U5 `u5-presentation` — `AssetListScreen`, the list's attachment point; the released count lines are the starting point | A later increment |
| US8.10 | The designed empty state | U5 `u5-presentation` — `ScreenPresenter`, the presentation layer's attachment point; the release's zero cases are handled | A later increment |

---

## Cross-Cutting Stories

Three stories are implemented by more than one unit, because each names a
guarantee that only holds when several units act together.

### US7.1 — Every write is attributed to a trusted actor

**Units**: U1 (the resolution and the schema's actor column), U3 (every
write path carries the resolved actor into the audit append), U5 (the
acting-as context is rendered read-only).

U1 owns the resolution mechanism behind the `ActorResolver` component and
the `audit_log` actor column it rebuilds. U3 owns the trust rule at every
call site: the actor is resolved from trusted server-side context, and a
request-supplied actor is **ignored** — not rejected, not sanitised, ignored
— and the server-side value is used. U5 renders the acting-as element
read-only, so the layout reserves the place without asserting a mechanism
the release has not chosen.

**Why it is not one unit.** The rule cannot be implemented as a code change
alone: `audit_log` has no actor column today and `recordAudit` takes no
actor parameter. The actor decision and the `audit_log` rebuild are one
indivisible workstream — which is why they sit together in U1 — but the
rule's enforcement at the write sites belongs to the unit that owns the
write path.

### The four count-consuming surfaces — `FR6.8` and `A13`

The requirement `FR6.8` and acceptance criterion `A13` make the dashboard,
the assignee directory, the asset list, and the CSV export one indivisible
group. They are split across two units — U5 renders three of them and U4
owns the export — because they change for different reasons and are tested
against different criteria. **They ship together.** The delivery grouping
and the unit grouping are different things, and this record keeps them
distinct: the unit boundary is a build boundary, and the group is a
delivery constraint that binds U4 and U5 into one delivery unit.

### The audit-completeness guarantee

Not a single story, but the guarantee several stories depend on: an asset
write and its audit append are one transaction. U1 provides the schema and
the append-only triggers that make the history unrewritable; U3 provides
the single-transaction write path; U5 displays the result. The guarantee
only holds as one mechanism across all three, which is why it is not
attributed to any one unit's acceptance criteria alone.

---

## Implementation Order Within Each Unit

The order inside a unit. It is the unit's own internal sequence and carries
no statement about the order between units.

### U1 — Foundation (`u1-foundation`)

1. **US0.1** — the schema rebuild and the backfill. The `audit_log` rebuild
   precedes the `assets` rebuild, the foreign key is re-added after it, and
   the backfill stamps the pre-MVP rows with a `system` actor.
2. **US4.2** — the record cannot be rewritten. The `BEFORE UPDATE` and
   `BEFORE DELETE` triggers are installed by the same migration that
   rebuilds `audit_log`.

US0.1 precedes US4.2 because the triggers are installed by the rebuild
migration: the second story's guarantee is a property of the first story's
artefact.

### U2 — Domain Vocabulary and Error Contract (`u2-domain-vocabulary`)

1. **The transition table and the error vocabulary** — no single story owns
   them. US3.1's eight released edges and the eight-code error vocabulary
   are read by U3's transition enforcement and by U5's action controls, so
   they are defined first and are recorded here as the unit's baseline
   rather than as a story.
2. **US3.3** — the shared reason vocabulary, with its retirement-specific
   values.
3. **US3.6** — the audit action vocabulary of exactly seven actions.
4. **US1.2** — one definition of a serial or licence key, the normalisation
   predicate shared with the database's functional index.
5. **US5.1** — every count comes from one shared definition: the filter
   definition and the counting definition.
6. **US5.6** — one definition of a holder, strictly non-falling-back.

### U3 — Write Path (`u3-write-path`)

1. **The repositories** — `AssetRepository` and `AuditRepository` over the
   rebuilt schema, with prepared statements throughout.
2. **US3.1** — the asset lifecycle's legal transitions: the transition table
   enforced, with the validation and the audit behaviour explicit for every
   released edge.
3. **US1.3** — the database refuses the same collision, through the
   functional index's violation detected by `err.code`.
4. **US1.4** — two concurrent registrations cannot both succeed. The
   `IMMEDIATE` transaction and the non-zero `busy_timeout`. **This story's
   test is written first**, because the defect it guards against is a race
   that a test written after the code will not reliably reproduce.
5. **US1.1** — register a new asset, in one transaction with its first
   audit entry and no assignee field.
6. **US6.4** — register without choosing an assignee. It shares the
   registration path with US1.1 and is delivered with it.
7. **US6.3** — have a duplicate serial refused with a way forward, naming
   and linking the existing asset.
8. **US6.1** — correct an asset's details: the editable field set, with
   status and both holder fields left uneditable.
9. **US4.3** — an edit is recorded as a history entry, in the same
   transaction as the asset update.
10. **US2.1** — assign an asset to a colleague.
11. **US2.2** — take an asset back.
12. **US3.2** — record the loss of an asset.
13. **US3.4** — retire an asset and resolve its assignment: the assignment
    resolved inline, `last_assigned_to` retained, the discard recorded with
    the prior holder.
14. **US3.5** — recover a lost asset, as the distinct `recovered` audit
    action.
15. **US7.1** — every write is attributed to a trusted actor, applied at
    every write site. It comes last in this list because it is a property
    applied across the paths above, not a separate path.

### U4 — Reporting (`u4-reporting`)

1. **US5.5** — export the asset list to a CSV file, with the shared
   formula-injection escaping applied to every string cell.
2. **US5.7** — the release's performance is measured, not assumed: the
   counting component aggregates in the database rather than counting the
   asset set in memory.

### U5 — Presentation (`u5-presentation`)

1. **US4.1** — read an asset's complete history: the full ordered
   sequence, newest first, not a single latest entry.
2. **US3.7** — the reason dialog explains the transition before it asks,
   with the consequence paragraph rendered from the asset's current status.
3. **US5.4** — browse and filter the asset list: the five filter dimensions
   the form exposes, the holder dimension the filter state carries, the
   shown and matching figures, and the results table.
4. **US5.2** — reconcile the inventory at a glance: the reconciliation tiles,
   the active inventory figure, and the total record count.
5. **US5.3** — see what a named holder has: the holder rows derived from
   the asset rows, with the per-bucket breakdown and the
   searched-population holder figure.
6. **US6.2** — be told about a duplicate serial before submitting, from the
   advisory read that takes no write lock.
7. **US7.2** — every screen is operable and readable without a mouse.
8. **The acting-as context** — rendered read-only, as part of US7.1's
   presentation half.

### U6 — Tooling and Delivery (`u6-tooling-and-delivery`)

No released user stories. This unit's acceptance criteria are drawn from
`C5`, `C6`, `C11`, and `C12` rather than from the story set:

1. The formatter and linter configuration exists and passes. `C12` — it
   lands as its own first commit, before any MVP work.
2. The pre-commit hook is installed and enforces the ordered steps.
3. The hosted pipeline is defined and runs lint → test → coverage check →
   dependency audit, blocking the merge on failure. `C11` — it is
   configured before the MVP work merges.
4. The deploy procedure is written: `npm ci`, WAL-aware backup, apply
   migrations, restart, smoke-test, with a manual rollback.
5. The coverage floor is enforceable: `coverage.thresholds.lines = 80`.

---

## Coverage Verification

### Every released story is assigned

| Check | Result |
|---|---|
| Released stories in `stories.md` | 30 |
| Stories assigned to a unit in the table above | 30 |
| Stories with no unit | 0 |
| Stories assigned to a unit that is not in the Unit Table | 0 |
| Every assigned story's directory matches the Unit Table's `Directory` column | yes, all 30 |

### Every unit has stories or a recorded exclusion

| Unit | Stories | Note |
|---|---|---|
| U1 `u1-foundation` | US0.1, US4.2 | — |
| U2 `u2-domain-vocabulary` | US1.2, US3.3, US3.6, US5.1, US5.6 | — |
| U3 `u3-write-path` | US1.1, US1.3, US1.4, US2.1, US2.2, US3.1, US3.2, US3.4, US3.5, US4.3, US6.1, US6.3, US6.4, US7.1 | 14 |
| U4 `u4-reporting` | US5.5, US5.7 | — |
| U5 `u5-presentation` | US3.7, US4.1, US5.2, US5.3, US5.4, US6.2, US7.2 | 7 |
| U6 `u6-tooling-and-delivery` | 0 | **Recorded exclusion.** The unit carries the release's two non-feature workstreams, whose acceptance criteria come from `C5`, `C6`, `C11`, and `C12` rather than from the story set. The requirement that every unit has stories is satisfied by the story set's own scope, which does not contain a story for build tooling. |

**Verified per-unit assignment.** The recount gives **U1 = 2, U2 = 5,
U3 = 14, U4 = 2, U5 = 7, U6 = 0** — thirty released stories in total. The
Unit Table in `unit-of-work.md` carries the same figures, so the two
artifacts agree. The count was derived by recounting the Story Assignment
Table above rather than by reading the Unit Table back, because a total
that agrees with itself proves nothing: an earlier split of 1 + 2 + 16 + 7
+ 4 + 0 also summed to thirty while assigning two stories to the wrong
unit.

### Every unit is reachable in the dependency graph

The check is **set equality**, not count agreement: the six unit IDs are
listed from each of the three sources and compared. Six in each place
would still pass if the Unit Table named U1–U6 and the yaml block named
U1, U2, U3, U4, U5 and U7.

| Check | Result |
|---|---|
| Unit IDs in the Unit Table (`unit-of-work.md`) | U1, U2, U3, U4, U5, U6 |
| Unit IDs in the yaml edge block (`unit-of-work-dependency.md`) | U1, U2, U3, U4, U5, U6 |
| Unit IDs named in this story map | U1, U2, U3, U4, U5, U6 |
| The three sets are identical | yes — same six IDs, no member of one set absent from another |
| Units in the Unit Table that appear in no story | 1 — U6, with the recorded exclusion above |
| Units with no implementation order given | 0 — U2's and U5's internal lists end with a non-story baseline item, and those items *are* implementation order: they fix where a unit's baseline definitions and presentation context are placed relative to that unit's own stories |
| Cross-cutting stories with every involved unit named | 3 of 3 |
| Deferred stories with an attachment point named | 10 of 10 |

**Note on the reachability claim.** The section heading says the units are
*reachable*, and the check above is the part that establishes it: every
unit in the Unit Table appears in the dependency artifact's edge block, so
every unit has an entry in the graph that Stage 2.9 consumes. Reachability
in the strict graph-theoretic sense — that a directed path exists from
every unit to every other — is a different property, and it holds here for
a different reason: the graph is a chain of the tooling unit into the
vocabulary, the foundation, the write path, the reporting, and the
presentation, so every unit except the tooling unit reaches every unit
below it.

---

## Sources Consumed

- `stories.md` — the thirty released stories, their acceptance criteria, the
  reconciliation seed, and the ten deferred items (the user stories stage).
- `components.md` — the component each story's behaviour is implemented by
  (the domain design stage).
- `decisions.md` — the fifteen ADRs that keep components apart, and the ADRs
  that keep them together; a story's unit assignment follows the component
  its ADR binds, not the story's own subject area (the domain design
  stage).
- `requirements.md` — `FR6.8`, `A13`, and the shared counting definition
  (the requirements analysis stage).
- The team's affirmed practices in `aidlc/spaces/default/memory/team.md` —
  the two indivisible groups.
