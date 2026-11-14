# Units of Work — Asset Tracker MVP

**Stage**: units-generation (inception)
**Intent**: 261106-asset-tracker-mvp
**Space**: default
**Scope**: feature
**Depth**: Standard

This file defines the units of work the Asset Tracker MVP decomposes into.
The twenty-one components of the domain design's catalogue are the building
blocks; the units below are the boxes those building blocks are delivered
in. Each unit is a slice the team can build, test, and deliver as a coherent
body of work, with its own construction directory.

**What this stage decides.** How the twenty-one components group into units
of work; which unit owns which story; what each unit depends on; and what
kind of construction artifact each unit will carry.

**What this stage does not decide.** Which unit ships first. The stage file
is explicit: this stage produces the **dependency DAG** — the topology — and
Stage 2.9 Delivery Planning chooses the **economic path through it**, the
Bolt sequence. No implementation order, no critical path, and no "ship this
first" recommendation appears anywhere in this file or in its siblings.

---

## Unit Boundary Strategy

**By domain capability.** A unit is a coherent body of domain work, with
the components that serve that capability inside it. Not by service, not by
feature, not by deployment target.

Three facts make this the only strategy that fits the release:

- `NFR5.1` and `C4` fix the deployment target as one host, one process, one
  SQLite file. A service boundary carries no information the deployment
  model does not already carry.
- The four count-consuming surfaces — the dashboard, the assignee directory,
  the asset list, the CSV export — are four user-visible features and one
  indivisible group. A feature boundary would deliver a subset of the group
  the project's own rule forbids splitting.
- The team's standing rule that a behaviour change and its proof land in the
  same commit, and that the foundation workstream is one indivisible unit,
  both draw boundaries that a feature boundary would cut through.

**Granularity is coarse.** Six units, one per domain capability. The write
path's lifecycle, registration, editing, and uniqueness stay in one unit
because they share the transaction discipline that makes the
audit-completeness guarantee hold — splitting them splits a guarantee that
only exists as one mechanism. The release has one developer and no deadline,
so the benefit fine units buy (short cycles, parallel review) is largely
unavailable while their cost (coordination between units that share a
transaction) is paid in full.

---

## The Unit Table

| Unit ID | Directory | Unit name | Kind | Deployment model | Relative complexity | Stories |
|---|---|---|---|---|---|---|
| U1 | `u1-foundation` | Foundation | `service` | embedded | L | 2 |
| U2 | `u2-domain-vocabulary` | Domain Vocabulary and Error Contract | `library` | embedded | M | 5 |
| U3 | `u3-write-path` | Write Path | `service` | embedded | XL | 14 |
| U4 | `u4-reporting` | Reporting | `service` | embedded | L | 2 |
| U5 | `u5-presentation` | Presentation | `ui` | embedded | L | 7 |
| U6 | `u6-tooling-and-delivery` | Tooling and Delivery | `packaging` | embedded | M | 0 |

**On Kind versus Deployment model.** `Kind` says what the unit *is* and is
drawn from `service | spec | ui | packaging | library` — it determines which
construction design artifacts apply to it. `Deployment model` says how the
unit is *distributed*. U1, U3, and U4 are `service` because each contains
executable runtime code that is deployed as part of the one application;
they are `embedded` because that application is one process on one host, not
a set of separately deployed units. The two are not in conflict, and the
dependency artifact's yaml block carries the same `kind:` values.

**On the zero story count.** U6 carries zero released stories. It is the
release's two non-feature workstreams — the formatter and linter
configuration, the pre-commit hook, the hosted pipeline definition, the
backup-and-restore procedure, and the deploy smoke test — which have
acceptance criteria drawn from `C5`, `C6`, `C11`, and `C12` rather than from
the story set. The story-map's coverage rule ("every unit has stories") is
therefore satisfied by the story set's own exclusions rather than by
inventing stories for it; `unit-of-work-story-map.md` records the exclusion
explicitly.

---

## U1 — Foundation

**Directory**: `u1-foundation` · **Kind**: `service` · **Deployment**: embedded · **Complexity**: L

**Components owned**: `SchemaMigration`, `DatabaseConnection`, `ActorResolver`.

**What it owns and delivers.** The release's history guarantee. U1 rebuilds
the `audit_log` table with an actor column, rebuilds the `assets` table with
the widened `status` check, the `last_assigned_to` column, and the
case-insensitive category-scoped functional unique index, backfills the
pre-MVP history to a `system` actor, installs the two append-only triggers,
and owns the database connection — including the connection-level
`busy_timeout` that the uniqueness guarantee depends on. It also owns the
actor resolution: the component that resolves the actor from trusted
server-side context, behind which the mechanism sits.

**Boundaries.** U1 reaches upward only into the domain vocabulary for the
values the schema's `CHECK` text and the backfill's actor value are drawn
from. It exposes the rebuilt schema and the connection to U3, U4, and U2.
It owns no asset behaviour: it does not validate a transition, append an
audit entry, or read an asset for a screen.

**Why it is one unit.** A commit that rebuilds `assets` without rebuilding
`audit_log` first destroys the audit history — silently, with the transaction
committed and no error raised. The two rebuilds interfere: split across two
migrations there is a state between them in which one table is rebuilt and
the other is not, and the ordering that is safe inside one transaction is not
safe across two. The team's standing rule makes the foundation workstream
one indivisible unit for exactly this reason.

**Implementation notes and constraints.**

- The migration must control the `foreign_keys` pragma explicitly. The
  rebuild needs foreign keys off during the drop window and on afterwards,
  and the current runner has no per-migration pragma window, so the rebuild
  migration carries its own and the runner is changed to support one.
- The rebuild drops the indexes on the rebuilt table. The new migration must
  re-issue the index DDL itself.
- The `audit_log` rebuild must precede the `assets` rebuild, and the foreign
  key is re-added after the `assets` rebuild.
- The backfill preserves the original records and reports failures; it never
  rewrites a row's history.
- The backfilled rows carry a `system` actor, and pre-MVP history is
  excluded from the Audit Completeness metric.
- The connection's `busy_timeout` is set once, at open, by this unit's
  connection component. The pragma is read by SQLite at the moment a lock is
  attempted and has no per-transaction form, so it has to have an owner.
- The `BEFORE DELETE` trigger also blocks the cascading delete of a parent
  asset row. The delete refusal is raised by the component that owns the
  asset's lifecycle (U3), before any statement runs, so the driver's foreign
  key is never reached.

**Blocking dependency.** The actor-identity mechanism (`OQ1`) is unresolved.
The team's practice requires it resolved before the foundation is built, and
the `audit_log` table has no actor column today while `recordAudit` takes no
actor parameter — so the rule cannot be implemented as a code change alone.
U1 cannot be built until the mechanism is chosen. This stage does not choose
it: the approved decision set names the constraint, not the answer.

---

## U2 — Domain Vocabulary and Error Contract

**Directory**: `u2-domain-vocabulary` · **Kind**: `library` · **Deployment**: embedded · **Complexity**: M

**Components owned**: `DomainVocabulary`, `ErrorTranslation`.

**What it owns and delivers.** The leaf layer every other component must
agree with. U2 holds the five status values, the transition table of exactly
eight released edges, the loss-reason vocabulary with its retirement-specific
values, the audit-action vocabulary of exactly seven actions, the
normalisation predicate the uniqueness check shares with the database's
functional index, the shared counting definition and filter builder, the
display-holder definition, the display vocabulary of the five literal labels,
and the eight-code error vocabulary. `ErrorTranslation` maps a domain refusal
carrying a domain code onto the HTTP boundary's reading of it.

**Boundaries.** U2 depends on nothing but Node built-ins. It holds no SQL,
no HTTP, and no data access. The counting *definition* is here; the
*aggregation* that evaluates it is in U4, because the split follows the data
rather than the layer — which is what lets the domain layer stay a true leaf
while still giving the four count-consuming surfaces one definition by
construction rather than by review.

**Why it is a `library`.** It is reusable code with no standalone runtime,
consumed in place by every other unit, depending on nothing but Node
built-ins. It is not a `spec`: it is executable code, and a contract it
cannot enforce is a comment.

**Implementation notes and constraints.**

- The domain layer must not import from `services/`, `repositories/`,
  `routes/`, or `db/`.
- The vocabulary is single-sourced from one place, and the schema's `CHECK`
  text and the stylesheet's `.status-*` class names are two literal copies
  recorded as an explicit boundary rather than generated. Generating a SQL
  file and a stylesheet from the JavaScript layer would introduce a build step
  into a release that has no build step, no preprocessor, and no generator.
- A template that renders a vocabulary receives it as render data. EJS
  cannot `require` JavaScript, so the status option list and the per-status
  action forms become loops over the shared vocabulary supplied by the route.
  The template keeps no literal copy.
- Every code in the vocabulary is mapped in the translation. `INVALID_STATE`
  is thrown today and is not in the middleware's handled set, so an
  unknown-state asset surfaces as a 500 rather than a 400 — the widened
  vocabulary must not repeat that.
- The transition table holds exactly the eight released edges. The two
  deferred edges — `in-stock → discarded` and `returned → discarded` — are
  not in it and are refused with the invalid-transition code in this release.

---

## U3 — Write Path

**Directory**: `u3-write-path` · **Kind**: `service` · **Deployment**: embedded · **Complexity**: XL

**Components owned**: `AssetLifecycle`, `AssetRegistration`, `AssetEditing`,
`UniquenessCheck`, `AssetRepository`, `AuditRepository`.

**What it owns and delivers.** Every path that mutates an asset, and the
audit append that must accompany each one. U3 owns the transition table's
enforcement, the registration path, the editing path, the uniqueness
comparison with its three callers — the registration path, the edit path,
and the inline warning — the asset repository, and the audit repository.

**Boundaries.** U3 reads the domain vocabulary, the error translation, and
the actor resolution; it writes through the asset repository and the audit
repository. It exposes the write operations — the lifecycle transitions, the
registration, and the editing — to U5, and no other unit calls those write
operations. The reporting unit reads the asset repository through
`AssetQuery`, but it reads: it reaches the repository and never a write
path. The repositories validate no transition and append no audit entry: the
capability that would break the audit-completeness guarantee is removed from
the repositories rather than prohibited to their callers.

**Why it is one unit.** The asset write and its audit append are one
transaction, and `AssetLifecycle`, `AssetRegistration`, and `AssetEditing`
all share the same repositories and the same transaction discipline. Splitting
them across units splits a guarantee that only exists as one mechanism. In a
synchronous driver a `try/catch` around two statements is **not** a rollback:
a throw between the asset write and the audit write leaves the asset updated
and the audit row missing. The team's rule that a behaviour change and its
proof land in the same commit applies to this unit as a whole.

**Implementation notes and constraints.**

- The uniqueness check runs inside an `IMMEDIATE` transaction with the
  non-zero `busy_timeout` owned by U1's connection component. `SQLITE_BUSY`
  maps to the retryable domain code.
- A SQLite error is detected by its machine-readable `err.code`
  (`SQLITE_CONSTRAINT_UNIQUE`, `SQLITE_BUSY`), never by matching
  `err.message` text.
- The two collision tiers — the functional index and the application-level
  comparison — raise the *same* code and are indistinguishable to a caller.
  The mechanism is visible in the log, not in the code the caller reads.
- The advisory inline collision lookup takes no write lock and the
  authoritative check takes the `IMMEDIATE` transaction; both answer the same
  comparison definition, so the inline warning and the submit-time block
  cannot disagree.
- The same uniqueness policy applies to registration and to serial/key
  updates.
- The `assigned → discarded` transition resolves the assignment inline:
  `assigned_to` is cleared, `last_assigned_to` is retained so the holder at
  discard time stays visible, and the `discarded` audit action records the
  discard, the prior holder, and the fact that the assignment was resolved
  by the discard.
- The `lost → in-stock` recovery is recorded as the distinct `recovered`
  audit action, never as `assign` or `return`, and its description names the
  recovery and the prior holder.
- A discard reason and a recovery reason are always required, drawn from the
  shared loss-reason vocabulary plus the retirement-specific values.
- The two holder fields are strictly non-falling-back: `assigned_to` is the
  current holder, `last_assigned_to` is the preserved previous holder, and
  neither ever echoes the other.
- The delete is refused by `AssetLifecycle` with the delete-refusal code
  before any statement runs. An asset row and its history are never deleted.
- All queries are prepared statements with `?` placeholders. Dynamic SQL is
  limited to a `WHERE` clause assembled from fixed fragments with bound
  arguments, and a sort column whitelisted to a literal. A user value is
  never interpolated into SQL.
- The two exception tests in the team's testing posture apply here: the
  concurrency-safe duplicate check and the two-table rebuild are written
  test-first. The concurrency test needs a file-backed database harness —
  `:memory:` is per-connection and would not exercise locking at all.

---

## U4 — Reporting

**Directory**: `u4-reporting` · **Kind**: `service` · **Deployment**: embedded · **Complexity**: L

**Components owned**: `AssetQuery`, `CountingQuery`, `CsvExport`.

**What it owns and delivers.** Every path that reads assets for display and
every figure the release displays. U4 owns the asset query, the counting
component that evaluates the shared counting definition by aggregation in
the database, and the CSV export.

**Boundaries.** U4 reads the domain vocabulary for the filter definition, the
status values, and the display-holder definition. It exposes the query, the
counts, and the export to U5, which is the only unit that renders them. It
owns no screen and no template.

**Why it is one unit.** The shared counting definition lives in U2 and the
aggregation that evaluates it lives here, and the export consumes the same
query and the same counts as the list. Splitting the export away from the
query would give the CSV its own notion of which rows the list contains.

**Implementation notes and constraints.**

- The figures are computed by aggregation in the database, not by counting
  the asset set in memory. The counting component and the query agree on the
  filter definition.
- The filter state carries a holder dimension that the list's filter *form*
  does not expose. The form carries five dimensions; the state carries the
  holder dimension too, and the Reset clears the whole filter state on every
  path into the list — including the directory's holder-row link, where a
  Reset that cleared only the visible controls would leave the matching count
  unequal to the total record count.
- The CSV export applies one shared escaping function to **every** string
  cell, covering a leading `=`, `+`, `-`, `@`, tab, or carriage return. The
  protection is not reimplemented per column or per surface: the property
  that gets lost when someone adds a column later is exactly the "all cells"
  property.
- The export's six columns, its filename, and its content type are fixed.
- The export's content type and the `X-Content-Type-Options: nosniff`
  header are one control, not two: a CSV served without `nosniff` and
  without a correct `Content-Type` can be sniffed by the browser as HTML.

---

## U5 — Presentation

**Directory**: `u5-presentation` · **Kind**: `ui` · **Deployment**: embedded · **Complexity**: L

**Components owned**: `ScreenPresenter`, `AssetListScreen`,
`AssetDetailScreen`, `DashboardScreen`, `HolderDirectoryScreen`,
`AssetFormScreen`, `AssetHistory`.

**What it owns and delivers.** The five screens the release renders and the
presenter they render through, plus the history read the detail screen shows.
U5 owns the asset list, the asset detail, the dashboard, the holder
directory, the asset form, and the full ordered history sequence.

**Boundaries.** U5 reads the domain vocabulary for the transition table, the
status values, the loss reasons, and the display labels; it reads the actor
resolution for the acting-as context; it calls U4 for the query, the counts,
and the export; it calls U3 for the write path. It exposes the routes to the
HTTP boundary, which the domain design places in the External Dependencies
rather than in the component catalogue.

**Why the history lives here.** `AssetHistory` is a leaf over the audit
repository, and the detail screen is the only thing that renders it. Giving
it its own unit would create two units that both touch the detail screen, and
the release's own rule keeps the screens together. It sits with the screens
that consume it.

**Implementation notes and constraints.**

- All user-supplied values are interpolated with `<%= %>` (escaped), never
  `<%- %>` (unescaped). The `<%= %>` rule is the XSS control and it must
  hold for every new surface, all of which render user-controlled strings.
  The dead `views/_layout.ejs` uses `<%- body %>` for a value that does not
  exist, so the new templates must not copy that pattern.
- Interactive elements carry a `data-testid` so the HTTP and view tests can
  assert on structure without brittle selectors.
- The presenter reads the transition table from the domain leaf. It does not
  read it from the write path — that would give it a second source for the
  same table and make a presentation component depend on the write path.
- The four count-consuming surfaces — dashboard, holder directory, asset
  list, CSV export — are rendered from one shared counting definition.
  **They ship as one indivisible group.** U5 carries three of them and U4
  carries the fourth; the two units are therefore one delivery group, and a
  release that ships all but one of its members has no consistency guarantee
  at all. This is recorded as a delivery-grouping constraint rather than as a
  unit boundary, because U4 and U5 change for different reasons and are
  tested against different criteria.
- The reason dialog's consequence paragraph is rendered from the asset's
  current status, and the dialog is shared across the loss transitions — so
  the paragraph is a function of the status, not a fixed string.
- The accessible rendering of the five screens and the reason dialog is part
  of this unit's acceptance criteria. The accessibility checker's selection
  remains a Domain Design dependency; until a checker exists, the checklist's
  Manual and Rendered rows are the executable verification and the Automated
  rows are aspirational.
- The stylesheet's total absence of a focus rule is a recorded gap (D1).
  The browser default is the release's mechanism; a one-off focus rule
  specified now would be replaced by the tokenised version in the deferred
  design-system increment.
- The three responsive constraints the release must not break are the
  container width, the two-column stacking order, and the table's
  horizontal-scroll affordance. The responsive treatment itself is deferred.
- The loading state is absent by design: the application is synchronous and
  server-rendered, and the release adds no client-side rendering.

---

## U6 — Tooling and Delivery

**Directory**: `u6-tooling-and-delivery` · **Kind**: `packaging` · **Deployment**: embedded · **Complexity**: M

**Components owned**: none — this unit is outside the component catalogue and
carries the release's two non-feature workstreams.

**What it owns and delivers.** The formatter and linter configuration, the
pre-commit hook, the hosted pipeline definition, and the deploy procedure
with its backup-and-restore step and its smoke test.

**Boundaries.** U6 produces build and merge artefacts rather than runtime
behaviour. It touches no application source's behaviour, and no domain
component depends on it. It depends on the application only to know what to
lint, format, test, and deploy.

**Why it is a separate unit.** `C12` requires the formatter and linter
configuration to land as its own first commit, before any MVP work — folding
it into another unit would contradict an explicit constraint, and the team's
rule that a behaviour change and its proof land in the same commit does not
make a formatting-only change less readable on its own. `C11` makes the
hosted pipeline a blocking merge gate that must be configured before the MVP
work merges, which makes it release work rather than later work.

**Implementation notes and constraints.**

- **The configuration lands first.** Prettier at 120 columns with
  `singleQuote: true`, `trailingComma: "es5"`, `semi: true`, `tabWidth: 2`,
  `arrowParens: "always"`, `endOfLine: "lf"`; ESLint's recommended rule set
  with `strict: ['error', 'global']` and exactly one documented exception
  scoped to test files.
- `lint` is scoped to `src tests vitest.config.js` — it does not lint the
  `aidlc/`, `.claude/`, and `.puku-cli/` workflow tooling.
- `format:check` excludes `views/` (Prettier cannot parse EJS) and `public/`
  (the stylesheet uses one-line rules), expressed through a `.prettierignore`
  so the script itself stays a single glob and cannot drift.
- The pipeline runs in order: **lint → test → coverage check → dependency
  audit**. The dependency audit is `npm audit --audit-level=high --omit=dev`
  and is a blocking gate. The `--omit=dev` flag is deliberate: the
  production closure is what ships.
- The 80% project-wide line-coverage floor is enforced by
  `coverage.thresholds.lines = 80`, which does not exist today.
- `npm ci` is the install command in the pipeline, the deploy procedure, and
  the documented setup path — never `npm install`.
- **A configured git remote is a prerequisite.** The repository has no
  remote, so no hosted pipeline platform can run even once. The remote must
  be created before this unit's pipeline can be verified.
- The pre-commit hook is the gate that works today, with no remote, no
  runner, and no platform account. It runs the same ordered steps.
- The deploy procedure is: install with `npm ci`, back up the database, apply
  migrations, restart the process, then smoke-test. The backup is WAL-aware
  — it either stops the process or uses the database's own backup mechanism,
  so no committed row is missed.
- The smoke test exercises the release's own success measure: it registers an
  asset, transitions it, and confirms the audit entry carries an actor and
  the pre-deploy row count is intact. A deployment that starts the process
  but does not pass this smoke test is rolled back, not reported successful.
- The rollback restores the database from the pre-deploy backup and restarts
  the previous commit. It is a manual, documented procedure.
- The deploy records the commit SHA it deployed.

---

## Complexity Bands

The estimate is a **relative ordering aid**, not a commitment. The release has
no deadline, no budget, and an unquantified capacity constraint, so the
capacity position is recorded as an allocation rule rather than as a number.
No hours, no days, no dates.

| Band | Definition |
|---|---|
| **S** | One component, one story, no new behaviour — a change to an existing definition only. |
| **M** | One or two components, up to three stories, a new definition or a new configuration with no new runtime behaviour. |
| **L** | Three to eight components, **or** a domain capability with several stories, involving new runtime behaviour across more than one layer. |
| **XL** | Nine or more components, **or** a capability whose guarantee only holds as one mechanism across the whole of it. |

Each band is a **disjunction**: a unit qualifies on either of its two
clauses, and the two clauses are not alternatives between units but two
independent ways of satisfying the same band. A unit that exceeds one
clause's bound is still in the band if it satisfies the other, and the
sizing rationale below names the clause each unit qualifies on so the
band is auditable rather than asserted.

The component clause is a **range, not a threshold**, so the bands
partition the scale rather than overlap: the M clause's upper bound of two
components and the L clause's lower bound of three are adjacent, and the L
clause's upper bound of eight and the XL clause's lower bound of nine are
adjacent too. A unit with more than eight components therefore satisfies
XL's component clause outright, and the guarantee clause is the only way
into XL for a unit with fewer.

**How a unit's band is decided.** A unit is assigned the **highest band it
qualifies for**. Because a band is a disjunction, a unit that satisfies a
higher band's clause is in that band — and a unit may satisfy more than one
band, so the disjunction alone does not determine the assignment; the
assignment is the highest qualification. U3 satisfies XL's guarantee clause
and L's component clause, and is XL because XL is the higher. U5 satisfies
L's component clause and L's several-stories clause, and is L because it
satisfies neither higher band's clause.

**Sizing by unit.** U1 is **L** — three components and two stories, but the
schema rebuild is the release's highest-risk change and its failure mode is
silent; it qualifies on the component clause, and the risk is the stated
reason the band is not lowered to **M**. U2 is **M** — two components and
five stories; it qualifies on the *new definition* clause rather than on
the story clause, because it holds no new runtime behaviour beyond the leaf.
U3 is **XL** — six components and fourteen stories; it qualifies on the
guarantee clause, because its audit-completeness guarantee only exists as
one mechanism across all of it. U4 is **L** — three components and two
stories across the query, the counts, and the export; it qualifies on the
component clause. U5 is **L** — seven components and seven stories, within
the L band's component clause, and it qualifies on that clause as well as on
the *several stories* clause: seven stories across five screens and one
presenter, with new runtime behaviour spanning the template layer and the
route layer. It is not **XL** because no guarantee it owns holds only as
one mechanism across the whole unit — the screens are independent of each
other, and the one guarantee that does span them, the shared counting
definition, lives in U2 and is consumed rather than implemented here. U6 is
**M** — no components and no stories; it qualifies on the *new
configuration* clause, because it holds a configuration surface and an
operational procedure with no new runtime behaviour.

---

## Deferred Capabilities

Ten capabilities are approved and deferred: US8.1 partial recovery, US8.2
credit assignment, US8.3 dispute handling, US8.4 the `in-stock → discarded`
edge, US8.5 the `returned → discarded` edge, US8.6 the design system, US8.7
responsive UI, US8.8 improved search, US8.9 pagination, and US8.10 the
designed empty state.

**They map to no unit.** Each is recorded in the story map as deferred with
its attachment point named, exactly as the domain design's traceability did.
A placeholder unit with no stories is a unit every downstream stage has to
carry through. The two deferred transition edges do not join the foundation
unit's rebuild either: `FR3.2` states the released transitions are exactly
eight edges and that no other edge shall be legal, so a test asserting their
refusal states the release boundary rather than the design.

---

## Sources Consumed

- `components.md` — the twenty-one-component catalogue, its dependency edges,
  and its entity ownership (the domain design stage).
- `decisions.md` — the fifteen ADRs and their realising components (the
  domain design stage).
- `requirements.md` — FR1–FR11, NFR1–NFR6, C1–C13, A1–A16, and the three
  approved invariants (the requirements analysis stage).
- `stories.md` — the thirty released stories and the ten deferred items (the
  user stories stage).
- The team's affirmed practices in `aidlc/spaces/default/memory/team.md` —
  the trunk, the squash-merge, the behaviour-and-proof rule, the two
  indivisible groups, the testing posture, and the deployment practice.
- The project's product-behaviour contracts in
  `aidlc/spaces/default/memory/project.md`.
