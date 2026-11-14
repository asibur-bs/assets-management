# Unit Dependencies — Asset Tracker MVP

**Stage**: units-generation (inception)
**Intent**: 261106-asset-tracker-mvp
**Space**: default

This file is the **topology** of the Asset Tracker MVP's units of work: which
unit depends on which, where the seams between units are, and which units
have no dependency between them.

**This artifact does not pick a build order.** Stage 2.7 produces the
dependency DAG. Stage 2.9 Delivery Planning chooses the economic path
through it — the Bolt sequence. No implementation order, no critical path,
and no "ship this first" recommendation appears here. Where this file names
a set of units with no dependency between them, that is a statement about
the shape of the graph, not a proposal about what to do first.

---

## The Dependency DAG

```
code edges, read as "A depends on B" — the ten code edges

  u6-tooling-and-delivery   depends on  (nothing)                        [merge gate: predecessor of every unit]
  u2-domain-vocabulary      depends on  (nothing)
  u1-foundation             depends on  u2-domain-vocabulary
  u3-write-path             depends on  u1-foundation, u2-domain-vocabulary
  u4-reporting              depends on  u1-foundation, u2-domain-vocabulary, u3-write-path
  u5-presentation           depends on  u1-foundation, u2-domain-vocabulary, u3-write-path, u4-reporting
```

**Why the graph is written this way rather than drawn.** The catalogue's own
rule for a hand-drawn diagram is that it "is generated from the catalogue's
`depends_on` lists rather than drawn by hand — the two are the same data
presented twice, and a diagram drawn by hand is a second claim that can
drift from the first". The adjacency form above is that generated form: one
row per unit, one listed dependency per edge, so every edge can be checked
against the edge block below without tracing a line. A drawn graph with ten
edges would present the same data as ten paths through a picture, and the
picture is the part that can be wrong.

**How the ten edges were derived.** Every edge is derived from the
component catalogue's own dependency relations, not from a preference about
ordering. A unit depends on another when it contains a component that reads
from a component in the other unit. Applying that rule to the catalogue's
`Depends On` column and mapping each of the twenty-one components to its
unit yields exactly the ten edges listed here, with none missing and none
extra.

**The ten edges, stated as "A depends on B":**

| A depends on | Why |
|---|---|
| `u1-foundation` → `u2-domain-vocabulary` | `SchemaMigration` reads the vocabulary for the values the schema's `CHECK` text and the backfill's actor value are drawn from. |
| `u3-write-path` → `u1-foundation` | `AssetRepository`, `AuditRepository`, and `UniquenessCheck` all write through the connection U1 owns, and depend on the rebuilt schema and its functional unique index. |
| `u3-write-path` → `u2-domain-vocabulary` | The write path reads the statuses, the transition table, the loss reasons, the audit actions, the uniqueness predicate, and the error codes. |
| `u4-reporting` → `u1-foundation` | `CountingQuery` reads `DatabaseConnection` for the aggregation it performs in the database. |
| `u4-reporting` → `u2-domain-vocabulary` | The filter definition, the status values, and the display-holder definition are all read from the vocabulary. |
| `u4-reporting` → `u3-write-path` | `AssetQuery` reads `AssetRepository`, so the reporting unit reads the assets the write path owns. |
| `u5-presentation` → `u1-foundation` | `ScreenPresenter` and `AssetHistory` read `ActorResolver`, whose mechanism is resolved as part of the foundation workstream. |
| `u5-presentation` → `u2-domain-vocabulary` | The presenter reads the transition table and the display vocabulary; the screens read the status values and the loss reasons. |
| `u5-presentation` → `u3-write-path` | The detail and form screens call the lifecycle, the registration, the editing, and the uniqueness components. |
| `u5-presentation` → `u4-reporting` | The list, dashboard, and directory screens read the query and the counts; the list's export control calls the export. |

**And the tooling edge, which is a merge gate rather than a code dependency:**

| A depends on | Why |
|---|---|
| `u6-tooling-and-delivery` → every other unit | `C11` makes the hosted pipeline a blocking merge gate that must be configured before the MVP work merges, and the MVP merges branch by branch. The formatter, the linter, and the pipeline are therefore a predecessor of every domain unit, not merely of the release. |

**The graph is acyclic.** The vocabulary and the tooling unit depend on
nothing; the foundation depends on the vocabulary; the write path depends on
the vocabulary and the foundation; the reporting depends on the vocabulary,
the foundation, and the write path; the presentation depends on the
vocabulary, the foundation, the write path, and the reporting. No edge points
back. The acyclicity was checked by traversal of the edge block below, not by
reading the rows above: every `depends_on` entry resolves to a declared unit,
no unit depends on itself, and no cycle is reachable from any entry point.

**The edge block is the authoritative form.** The adjacency list and the
prose table are two renderings of the fenced yaml below. When they disagree,
the yaml block governs, because it is the form a machine reads — and the
machine that reads it is the one that computes the downstream fan-out. The
block carries the ten code edges and only the ten; the tooling unit's
merge-gate relation is stated in prose above because it is not a dependency
between components, so it is absent from the block by design rather than by
omission.

---

## Machine-Readable Edge Block

```yaml
units:
  - name: u6-tooling-and-delivery
    kind: packaging
    depends_on: []
  - name: u2-domain-vocabulary
    kind: library
    depends_on: []
  - name: u1-foundation
    kind: service
    depends_on: [u2-domain-vocabulary]
  - name: u3-write-path
    kind: service
    depends_on: [u2-domain-vocabulary, u1-foundation]
  - name: u4-reporting
    kind: service
    depends_on: [u2-domain-vocabulary, u1-foundation, u3-write-path]
  - name: u5-presentation
    kind: ui
    depends_on: [u2-domain-vocabulary, u1-foundation, u3-write-path, u4-reporting]
```

**The block carries the ten code edges and nothing else.** The tooling
unit appears in it with an empty `depends_on` because it owns no
catalogue component, so the derivation rule cannot produce an edge into
or out of it. The merge gate between the tooling unit and the domain
units is a fact about when work may *merge*, not a relation between
components, and it is stated in prose below — it is deliberately not a
`depends_on` entry here.

`u1-foundation`, `u3-write-path`, and `u4-reporting` carry `kind: service`
because each contains executable runtime code that is deployed as part of
the one application. The stage's `unit-of-work.md` records their deployment
model as `embedded`, which is not a contradiction: `kind` says what the unit
*is* — a deployed executable — and the deployment model says how it is
*distributed* — built into the single application rather than deployed on
its own. The domain vocabulary is `library` because it is reusable code with
no standalone runtime, and the tooling unit is `packaging` because it
produces build and merge artefacts rather than runtime behaviour.

---

## Integration Points Between Units

The seams are the component boundaries the domain design already drew. A
unit's public surface is the set of components it exposes upward, and every
call crosses a boundary the catalogue already defines — a repository call, a
vocabulary read, a query call. No new interface is invented at the unit
boundary, and no facade layer is added over components that are already
single-purpose.

### U6 — Tooling and Delivery

| Seam | What crosses it |
|---|---|
| Formatter and linter → the application source | The configuration is applied to `src`, `tests`, and `vitest.config.js`; it changes no behaviour, only how the source is written and checked. |
| Pre-commit hook → the working tree | The hook runs the ordered pipeline steps against the staged change and refuses the commit if a step fails. |
| Hosted pipeline → the branch | The pipeline runs lint, test, coverage check, and dependency audit on the branch, and blocks the merge on failure. |
| Deploy procedure → the host | The procedure installs with `npm ci`, backs up the database, applies migrations, restarts the process, and smoke-tests. It reads the commit SHA to record what was deployed. |

### U2 — Domain Vocabulary and Error Contract

| Seam | What crosses it |
|---|---|
| → U1 | The status values, the audit-action vocabulary, and the backfill actor value are read to build the schema's `CHECK` text and to stamp the backfill. |
| → U3 | The transition table, the loss reasons, the audit actions, the uniqueness normalisation predicate, the display-holder definition, and the error codes are read by the write path. |
| → U4 | The filter definition, the status values, and the display-holder definition are read by the query and the counting component. |
| → U5 | The transition table, the display vocabulary, the status values, and the loss reasons are read by the presenter and the screens. |
| → the HTTP boundary | `ErrorTranslation` maps a domain refusal carrying a domain code onto the boundary's reading of it. The boundary reads the translation; the direction is stated in prose rather than drawn as a graph edge, because a direction edge from outside the component model into it would make the graph's shape depend on where the HTTP layer happens to live. |

### U1 — Foundation

| Seam | What crosses it |
|---|---|
| → U3 | The rebuilt schema, the functional unique index, the append-only triggers, the connection handle, and the connection-level `busy_timeout`. |
| → U4 | The same connection and the same schema, for the counting aggregation. |
| → the deploy procedure | The migration that the procedure applies, and the row-count assertion the smoke test checks. |

### U3 — Write Path

| Seam | What crosses it |
|---|---|
| → U5 | The lifecycle transitions, the registration, the editing, the uniqueness comparison (both the advisory read and the authoritative check), and the history read. The presenter does **not** appear here: it reads the transition table from the vocabulary, and giving it a second source for the same table would make a presentation component depend on the write path. |

### U4 — Reporting

| Seam | What crosses it |
|---|---|
| → U1 | The database connection, for the aggregation that computes every count. |
| → U3 | The asset repository, for the rows the query filters and returns. |
| → U5 | The query, the counts, and the CSV export. The four count-consuming surfaces are four renderings of one definition, and none derives a figure from another — but the list depends on the export, because the export is a control *of* the list. Being a peer and being independent are different things. |

### U5 — Presentation

| Seam | What crosses it |
|---|---|
| → U1 | The resolved actor, for the read-only acting-as indicator the presenter renders and for the actor each history entry carries. |
| → U3 | The lifecycle transitions, the registration, the editing, and the uniqueness comparison. |
| → U4 | The query and the counts that the list, the dashboard, and the directory render. |

---

## Parallel Development Opportunities

Several sets of units have **no dependency between them**. The graph admits
more than one valid topological ordering because of these sets. Naming them
is a statement about the graph; choosing which to work on is Delivery
Planning's decision.

**Set 1 — the vocabulary and the tooling.** `u2-domain-vocabulary` and
`u6-tooling-and-delivery` have no dependency between them. The vocabulary
depends on nothing but Node built-ins, and the tooling unit produces build
and merge artefacts rather than runtime behaviour.

**Set 2 — the foundation and the tooling.** `u1-foundation` and
`u6-tooling-and-delivery` have no dependency between them, for the same
reason. The foundation reaches into the vocabulary, but the vocabulary is a
separate unit with its own edge.

**Set 3 — the presentation and the tooling.** `u5-presentation` and
`u6-tooling-and-delivery` have no dependency between them.

**The complete set.** The enumeration was checked against the edge block
rather than read off it: the only pairs of units with no dependency in
either direction are the tooling unit paired with each of the five domain
units — the vocabulary, the foundation, the write path, the reporting, and
the presentation. That is five pairs, and the three sets named above are
the three of them that pair the tooling unit with a domain unit whose
dependency set is otherwise non-trivial; the two remaining pairs —
`u6` with `u3-write-path` and `u6` with `u4-reporting` — have the same
property and are not repeated here. There are **no** independent pairs among
the five domain units themselves.

**Why the tooling unit is independent of every other unit in the graph.**
It owns no component in the catalogue, so the derivation rule cannot
produce an edge into or out of it. That is a statement about the topology;
the merge gate that `C11` places on the tooling unit is a separate fact
about when the domain work may merge, and it is stated in the edge table
above rather than in this section. The two are deliberately not merged: a
merge gate constrains when a branch lands, and a dependency edge constrains
what a unit can be built from.

**What is not a set.** The three domain units above the foundation do not
form a parallel set: `u1-foundation` depends on `u2-domain-vocabulary`,
`u3-write-path` depends on both the vocabulary and the foundation, and
`u4-reporting` depends on the vocabulary, the foundation, and the write
path. Every pair among them is ordered by an edge. The only genuine
parallelism in this graph is between the tooling unit and each of the five
domain units — and the tooling unit's pipeline requirement makes that
parallelism a merge gate rather than a convenience, so in practice it
constrains rather than enables.

**What the parallelism is worth, stated honestly.** The release has one
developer and no deadline, so the benefit of parallelisable units — short
cycles, concurrent review — is largely unavailable, while the coordination
cost of units that share a transaction is paid in full. The parallelism is
recorded because it is a real property of the graph and a reader
sequencing the release needs to see it, not because a second pair of hands
is expected to exploit it.

---

## The Walking Skeleton

**Not applicable.** The scope does not declare `skeleton: on`, and the
team's affirmed practice states that this initiative does **not** run a
walking skeleton ceremony. The verified baseline already gives the reason
beyond the rule: the end-to-end system exists — a working three-layer
monolith with a closed state machine, an audit trail, an HTTP surface, and a
live 66/66 test baseline. What is missing is the *foundation* the MVP
needs, and a walking skeleton here would mean deliberately building a second,
throwaway end-to-end path through a schema that must be rebuilt anyway.

The foundation workstream itself acts as the walking slice: it is the
smallest change that proves the audit properties end to end. Because
Construction Checkpoints are enabled and the Unit DAG is non-empty, that
slice is built and verified through the applicable per-unit stages, and
the intent's recorded, human-authorized Construction Verification Command
demonstrates the project's real end-to-end result before the skeleton
checkpoint is requested.

---

## Sources Consumed

- `components.md` — the twenty-one-component catalogue and its dependency
  edges, from which every edge above is derived (the domain design stage).
- `decisions.md` — the fifteen ADRs that keep components apart, and the
  ADRs that keep them together (the domain design stage).
- `requirements.md` — `NFR5.1`, `C4`, `C5`, `C6`, `C11`, `C12`, `FR3.2`,
  `FR6.8` (the requirements analysis stage).
- `stories.md` — the released and deferred story set (the user stories
  stage).
- The team's affirmed practices in `aidlc/spaces/default/memory/team.md` —
  the two indivisible groups, the trunk, and the deployment practice.
