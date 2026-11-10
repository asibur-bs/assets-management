# Architecture Decision Records — Domain Design

**Intent:** `261106-asset-tracker-mvp`
**Space:** `default`
**Stage:** `domain-design`
**Phase:** `inception`
**Lead agent:** `aidlc-architect-agent`
**Companion artifact:** `components.md`

---

## Scope of These Records

These ADRs record the design choices made **at this stage**. They cover the
decomposition of the release into components, the ownership of entities, the
interaction styles across component boundaries, and the boundaries this stage
deliberately did not cross.

Three kinds of decision are **not** in this file, because they belong to
other stages or to other artifacts:

| Decision | Where it belongs |
|---|---|
| The product's approved scope, the seventeen-item decision set, the standing conditions | `requirements.md` and the `## Decided` record in `aidlc/spaces/default/memory/project.md` |
| The actor-identity **mechanism** (OQ1) | Open; deferred to the stage that resolves it. ADR-005 fixes only the **boundary** the mechanism sits behind |
| The migration's exact SQL, pragma windows, and per-step DDL | `SchemaMigration` implementation, under the `architecture` artifact's verified ordering constraint |

Each record follows the Inception phase guardrails' required structure:
**Context**, **Decision**, **Consequences**, **Alternatives Rejected**.

---

## ADR-001 — One component catalogue covering the changed existing blocks and the new blocks

**Context.** The CodeKB already publishes `component-inventory.md`: twelve
existing components (C1–C12) and a list of nine absent capabilities. The
release changes some of the existing components and adds the nine. Two
catalogues were possible — one of the changed existing blocks, one of the new
blocks — and a third was a catalogue restricted to the new blocks alone.

The `upstream-coverage` sensor requires the consumed artifacts to be cited by
slug, so whichever shape was chosen had to name `component-inventory` and
`architecture` explicitly; that constraint is satisfied by citation and does
not decide the shape.

**Decision.** The catalogue in `components.md` is **one** catalogue of
**twenty-one components**. It covers the changed existing blocks and the new
blocks together, and each component is **named for what it does** rather than
for the file it currently lives in.

**Consequences.**

- The catalogue describes the release's design rather than the repository's
  current directory layout, so a reader comparing it with `component-inventory.md`
  sees a design, not a diff.
- A reader who wants to know what exists today reads `component-inventory.md`;
  a reader who wants to know what the release builds reads `components.md`.
  Two answers to one question would drift, and the CodeKB's answer is the
  authoritative one for the present state.
- The names are not file names, so the mapping from a component to a future
  module is a delivery decision rather than a design decision. This is
  deliberate: the release's structure is decided in Units Generation, and a
  catalogue that fixed module paths here would be decided twice.
- Existing components whose responsibility does not change — the Express app
  factory, the template engine, the stylesheet, the test suite — do not appear
  as components. They appear in the External Dependencies table, because
  infrastructure and framework code are dependencies, not building blocks.

**Alternatives Rejected.**

- *Two catalogues — one of changed existing blocks, one of new blocks.* A
  reader would have to hold both open to answer "what does the release
  consist of", and the boundary between "changed existing" and "new" is a
  judgement call that two documents would make differently. One catalogue
  makes the judgement once.
- *A catalogue restricted to the nine new capabilities only.* It would omit
  the components the release materially changes — `AssetRepository`,
  `AssetLifecycle`'s predecessor, the migration runner — which are exactly the
  components whose behaviour the release's invariants constrain. A catalogue
  of only what is added cannot express "this component's responsibility grew
  to include the transaction", which is the release's central structural change.
- *A catalogue named for the files it maps to (`src/services/asset-service.js`).*
  It would lock the release's module layout at a stage whose purpose is
  decomposition, and it would make every later structural change a change to
  the design record rather than to the code.

---

## ADR-002 — The shared counting definition is split into a domain-layer filter definition and a data-access-layer counting component

**Context.** The release's third approved invariant is that the dashboard,
the assignee directory, the asset list, and the CSV export all count from one
shared definition, so that the four surfaces agree (FR6.1–FR6.8). Two things
must be shared for them to agree: the *definition* of what a matching asset
is, and the *construction* of the query that selects matching rows.

Constraint C8 grants the new `src/domain/` layer the property of a leaf: it
depends on nothing but Node built-ins, and every other layer may import it.
Constraint C9 requires the shared definitions to exist exactly once.

**Decision.** The definition is split across a boundary that follows the
data, not the layer:

- `DomainVocabulary` (the domain leaf) owns the **filter definition** — the
  five dimensions, their accepted values, and the display-holder rule. It
  holds no SQL and no database handle.
- `CountingQuery` (the data-access layer) owns the **aggregation** and the
  **SQL**, and it depends on `AssetQuery`, which owns the query construction.

**Consequences.**

- The domain layer stays a true leaf. It holds no SQL, opens no handle, and
  depends on nothing but Node built-ins, so the layering constraint survives.
- The consistency guarantee is structural rather than conventional. A count and
  the rows it counts are built from the same filter definition and the same
  query construction, so they agree by construction rather than by review.
- The counting path's own row count does not grow with the number of assets:
  the figures come from an aggregation in the database, not from the asset set
  loaded into memory (NFR5.2).
- The domain layer's filter definition is directly renderable, which is what
  lets the list's filter form, the directory, and the export select from one
  definition.
- The cost is one extra hop in the path from a filter to a number. That hop is
  the price of the domain layer's leaf property, and it is paid once, in one
  place, rather than four times in four surfaces.

**Alternatives Rejected.**

- *One component in the domain layer owning both the filter and the SQL.* It
  breaks the leaf property C8 grants the domain layer by giving it a database
  handle, and it puts SQL outside the data-access layer against the team's
  code-style practice.
- *One component in the data-access layer, with the domain layer holding only
  statuses, transitions, and reasons.* It places the filter's vocabulary and
  the filter's SQL in the same layer, which reopens the single-sourcing
  question the vocabulary layer exists to close: the filter's accepted values
  would live next to the code that consumes them and could drift from it.
- *One counting component per surface.* This is the shape the POC already has
  for the status vocabulary — six copies of one set, each free to drift.
  Adopting it for the counting definition would rebuild the exact defect
  INV-3 exists to remove.

---

## ADR-003 — The four count-consuming surfaces are four peer components, none of them counts anything itself, and the export is invoked by the list

**Context.** The four surfaces — dashboard, holder directory, asset list, CSV
export — are one **indivisible group for delivery** (FR6.8, assumption A13):
shipping all but one of them leaves no consistency guarantee at all. That is a
delivery constraint. It does not by itself determine the component structure.

The design question is what is shared. What must be shared is the *definition*,
not the rendering: the dashboard's five tiles, the directory's holder counts,
the list's shown and matching figures, and the export's row count are four
different renderings of one counting definition.

The four are also not in the same relationship to one another. The export is
**a control of the asset list** — the interaction specification describes the
export CSV control as a control *of* the list, offered on the list's screen and
acting on the list's current filter. The other three are pages a person
arrives at.

**Decision.** The four surfaces are **four distinct peer components** —
`DashboardScreen`, `HolderDirectoryScreen`, `AssetListScreen`, and
`CsvExport`. **None of them computes a count of its own.** Each reads the
figures it renders from `CountingQuery`.

`CsvExport` is a component rather than a screen because a file producer has
its own lifecycle — its scope, its column set, its row count, its empty case —
and because the release's prior mockup stage established that "not a screen"
is not the same as "no states".

**Being a peer is not the same as being independent, and the difference is
recorded rather than smoothed over.** The four are peers in the sense that
matters for the counting guarantee: they are four renderings of one shared
definition, they change for different reasons, and none of them derives its
figures from another. They are not peers in the sense of having no edges
between them. `AssetListScreen` **depends on** `CsvExport`, because the list
is the surface that offers the export and the export acts on the filter the
list holds. The dependency runs one way, from the list to the export; the
export does not depend on the list, does not know which screen offered it, and
does not read the list's state.

**Consequences.**

- The delivery grouping and the component grouping are different things, and
  this record keeps them distinct: the four ship together (A13), and they share
  a definition (ADR-002) — but they are separate components because they change
  for different reasons and at different rates.
- A figure cannot disagree with another figure, because no surface has a figure
  of its own to disagree with. A change to the counting definition propagates
  to all four surfaces through one component.
- The dashboard, which is new in this release, is a component with no
  predecessor; the list and the directory are new or materially changed in the
  same way the release treats them.
- The export's row count and the list's matching figure come from the same
  source, so a user who compares the exported file against the list on screen
  sees one number.
- The export is reachable only through the list, which is what the interaction
  specification describes. A request that asks for a CSV of an arbitrary filter
  is not offered, because the release does not specify one.
- The cost is that a figure a surface needs but `CountingQuery` does not
  produce must be added to `CountingQuery` rather than computed locally. That
  is the intended pressure: it makes every figure a shared one.

**Alternatives Rejected.**

- *One reporting component owning the dashboard, the directory, and the
  export.* It couples three surfaces with different reasons to change, and it
  would not have covered the asset list anyway, because the list is an existing
  surface. The list would have had to reach into a component that does not
  know about it.
- *Counting inside each surface.* The POC's shape, and the one INV-3 forbids.
- *A reporting component plus a thin screen wrapper per surface.* This adds a
  layer without removing a coupling: the reporting component would still own
  three surfaces' logic, and the wrappers would be indirection with no
  behaviour of their own.
- *Make the export depend on the list, so that the export can read the list's
  filter directly.* It would make the export's row set a function of a screen
  rather than of the shared filter definition, which reintroduces exactly the
  divergence the shared definition exists to remove: the export would then
  agree with the list only for as long as the list's copy of the filter stayed
  identical to the shared one.
- *Give the export its own screen, so that the four are peers with no edges
  between them.* The release specifies the export as a control of the list, and
  no export screen exists in the mockups. Inventing one would add a surface
  the release does not contain.

---

## ADR-004 — The shared domain vocabulary is one component, and the schema's `CHECK` text and the stylesheet's class names stay literal copies

**Context.** The status vocabulary is currently duplicated six times: the
schema's `CHECK` constraint, the repository's `Set`, the service's transition
table, the list filter's `<option>` list, the detail screen's per-status action
forms, and the stylesheet's `.status-*` classes. Requirement C9 requires the
shared definitions to exist once. The codebase has no build step, no
preprocessor, and no generator, and the team's code-style practice defers to
the project's own linter and formatter configuration.

Two of the six copies are not JavaScript: the `CHECK` constraint inside a SQL
file, and the class names inside a stylesheet.

**Decision.** `DomainVocabulary` owns, exactly once each: the status set, the
display-label mapping, the transition table, the loss-reason vocabulary with
its retirement-specific values, the uniqueness comparison predicate, the audit
action vocabulary, the filter dimensions' vocabulary, and the **domain
error-code vocabulary**.

The error-code vocabulary is a vocabulary like the others: a set of named
values, each with a meaning. It is held here because a component that raises
`INVALID_TRANSITION` and a component that renders `INVALID_TRANSITION` must
agree on what that name denotes, and because the set of codes is a domain
fact rather than an HTTP fact — the codes are named for what went wrong in the
domain, and the HTTP status they map to is one attribute of each code rather
than the code's identity. The vocabulary carries each code's HTTP status and
its retryable flag, so a code's meaning is stated once (ADR-012).

The schema's `CHECK` text and the stylesheet's `.status-*` class names **remain
literal copies** and are recorded as a **boundary**, not as a defect.

**Consequences.**

- The four JavaScript copies collapse into one. The two non-JavaScript copies
  remain, and this record says so explicitly rather than leaving a reader to
  assume the single-sourcing is complete.
- A vocabulary a template renders arrives as **render data**: the status
  `<option>` list and the per-status action forms are loops over the shared
  vocabulary supplied by the route, and the template keeps no literal copy.
- The `CHECK` constraint's text and the stylesheet's class names are drift
  risks, and the drift risk is now *visible* — it is named here and in
  `components.md`'s Rationale, rather than being an unremarked sixth copy.
  Each of the two is a single-line literal whose correctness is checked by a
  test in the release's build.
- No code-generation step enters a release that has none. Turning the SQL file
  and the stylesheet into build artefacts of the JavaScript layer would be a
  larger change than the vocabulary single-sourcing it was meant to achieve,
  and it would make the schema's correctness depend on a toolchain the project
  does not have.
- The stylesheet's colours are separately constrained: the fifth `discarded`
  chip's foreground cannot reuse `--muted` (4.28:1 against the neutral tint it
  needs, below the 4.5:1 AA floor), so the pair is fixed at `#4b5563` on
  `#f0f1f3` (6.69:1). The design system's deferral does not change the
  accessibility floor.

**Alternatives Rejected.**

- *The domain layer also owns the SQL `CHECK` text and the stylesheet class
  names, as exported strings.* It introduces a build step into a release with
  none, and turns the schema and the stylesheet into artefacts of the
  JavaScript layer. The vocabulary's single-sourcing would cost more than the
  duplication it removed.
- *A generator that writes the `CHECK` constraint and the stylesheet from the
  domain layer.* The same objection, and it would additionally make a
  hand-edited migration file a build output — the migration is a record of
  what happened to a live database, and records are not generated.
- *Leave all six copies alone.* It contradicts C9 outright, and it is the
  shape that let the POC's status set drift in the first place.

---

## ADR-005 — Actor attribution is one component with a fixed interface; the mechanism behind it stays open

**Context.** The release requires that the actor of every write be resolved
from trusted server-side context, and that a request-supplied actor be
**ignored** — not rejected, not sanitised into acceptance — with the
server-resolved value used in its place (FR2.2, NFR2.1, and the `## Mandated`
and `## Forbidden` rules in `project.md`). No client-settable field or header
may be the actor's source.

The **mechanism** that produces the trusted context is a separate, still-open
decision (OQ1). The actor-identity decision and the `audit_log` rebuild are one
indivisible workstream, because `audit_log` has no actor column today and
`recordAudit` takes no actor parameter — so the rule cannot be implemented as a
code change alone.

**Decision.** One component, `ActorResolver`, owns the trust rule and the
actor's attribution on every write. Its interface is: *resolve the actor for
this request and return a stable display identity*. The **mechanism sits behind
that interface** and is not chosen at this stage.

`ActorResolver` owns **no entity**: the actor is an attribute recorded on an
audit entry, not a record with its own identity, its own lifecycle, and its own
relations.

**Consequences.**

- The trust rule is implemented **once**. A caller that reaches a write path
  cannot bypass it, because every write path resolves its actor through this
  one component.
- The rule's *mechanism* can change without touching any caller, which is what
  makes it safe to leave OQ1 open while the rest of the design proceeds.
- The actor's identity is a **stable display identity** that a person reading
  the history can recognise — which is what the history panel needs, and
  which a bare internal key would not be.
- The read-only `Acting as` indicator the mockups specify renders from the same
  resolved identity, so the indicator cannot disagree with what the audit
  entries recorded.
- Because no `Actor` entity exists, an unchosen mechanism cannot become a
  table. If OQ1 resolves to a plain string, the design has no dangling entity.
- The cost is that the design cannot yet say *how* the identity is derived. The
  dependency-audit gate must therefore treat the actor-resolution dependency
  closure as a real constraint on OQ1's answer, and the stage that resolves OQ1
  inherits this interface.

**Alternatives Rejected.**

- *An `Actor` entity the component owns.* The mechanism is not chosen (OQ1).
  If it turns out to be a plain string, an actor entity is a table for a value
  that was never an entity — and if it turns out to be a directory-backed
  identity, the entity can be introduced then, at the stage that knows the
  answer.
- *Resolve the actor inline in each write path.* That is four copies of the
  trust rule, and the rule is the release's most security-relevant single
  sentence. It would also be four places for OQ1's answer to land
  inconsistently.
- *Choose the mechanism at this stage.* The stage's questions record the
  mechanism as an open question because the evidence to choose it is not yet in
  hand. Choosing it here would produce a design that looks more complete and
  is less honest.

---

## ADR-006 — The write path is one component that owns the eight released transitions, and each write is one transaction

**Context.** The release's second approved invariant is that the asset write
and the audit append are one all-or-nothing transaction on every write path.
The `architecture` artifact records that in the POC's synchronous driver a
`try/catch` around two statements is **not** a rollback: a throw between the
asset write and the audit write leaves the asset updated and the audit row
missing.

The release adds three edges to the POC's transition set — `in-stock → lost`,
`returned → assigned`, `returned → lost` — and keeps `discarded` terminal.
The eight released edges are the whole set; no ninth edge may be inferred.

**Decision.** One component, `AssetLifecycle`, owns the eight released edges.
Every write it performs — the asset write and its audit append — happens inside
**one transaction**, and the component exposes no operation that writes an
asset without appending its audit entry.

Registration (`AssetRegistration`) and editing (`AssetEditing`) are **separate
components** from `AssetLifecycle`: registration creates an asset and its first
entry, and editing changes fields but not status. Each is also one
transaction. The repositories (`AssetRepository`, `AuditRepository`) write rows
but **validate no transition and append no audit entry**, so that a caller
reaching a repository directly cannot bypass the invariant.

`AssetLifecycle` also owns the **refusal of a delete** against an asset row.
The release requires that such an attempt be refused with a clear,
machine-readable error rather than a bare database failure, and that the refusal
be distinguishable from a validation error and from an internal error by its
code (FR2.6, AC4.2.4). The delete is refused by the component that owns the
asset's lifecycle, with the delete-refusal code; the row and its whole history
are left intact. This is the same structural move as the transaction rule: the
capability that would break the invariant is removed rather than documented as
a prohibition.

**Consequences.**

- The "asset write + audit append are one unit" invariant becomes a
  **component boundary** rather than a convention. The release's own
  requirement that every lifecycle transition have explicit validation and
  explicit audit behaviour is then structurally guaranteed: the transition
  validation lives in the component that owns the edge, and the audit append
  lives in the same component.
- The POC's weakness — a transition that can be performed without an audit
  entry — is closed by removing the capability rather than by convention.
- The eight edges are stated once, in one place, and the `discarded` terminal
  state is stated with them.
- The `mark-lost` and `discard` edges write the departing current holder into
  the preserved previous-holder field before clearing the current holder, so
  the holder at the time of loss or discard stays visible (FR3.6, FR3.9).
- Recovery from `lost` back to `in-stock` is recorded as a distinct
  `recovered` audit action, never as `assign` or `return`, and its description
  names the recovery and the prior holder (FR3.7).
- The delete refusal has one owner, so a refusal's code is stated once and the
  middleware cannot be handed an unrecognised refusal. The refusal's code is
  distinct from the validation and internal codes by construction, because it is
  a different code in the vocabulary (ADR-012) rather than a different message.
- The cost is that the repositories are not usable for a write on their own.
  That is the point: a write that needs no audit entry does not exist in this
  release.

**Alternatives Rejected.**

- *Keep the transition table in the service layer and the audit append beside
  it as two statements.* That is the POC's shape, and the `architecture`
  artifact records the failure it produces: a mutated asset with no audit row,
  with no error raised.
- *One write component covering registration, editing, and transitions.* It
  would be one large component with three different responsibilities — create,
  correct, move — and it would grow the surface through which the transaction
  discipline has to hold.
- *Let the repositories own the transition validation.* It would put the
  release's most important business rule in the persistence layer, and it
  would let a caller write an asset in any status without an audit entry.
- *Let the database's foreign key refuse the delete and let that refusal
  surface as it comes.* The `architecture` artifact records that the current
  schema's `ON DELETE CASCADE` destroys audit history silently — no error is
  raised at all — and that removing the cascade leaves the foreign key refusing
  the delete with a raw driver error. A raw driver error is exactly the "bare
  database failure" the requirement rules out, and it carries no domain code,
  so it cannot be distinguished from any other internal error.
- *Refuse the delete in the route layer.* The route would then be the only
  place the refusal exists, and a caller reaching the service directly would
  not meet it.

---

## ADR-007 — Two entities: `Asset` and `AuditEntry`. No `Holder` entity and no `Actor` entity

**Context.** The release's domain has three things that could be entities:
the asset, the person holding it, and the person who caused a write. The
refined mockups and the story set establish two facts about the first two: a
holder is a **display name**, not an identity (assumption A4), and the
directory's holders are **derived from the asset rows** (assumption A16). The
`project.md` rules state that a holder name is a display name and that the
release's assets live in the exclusive five-bucket status set.

The audit entry has no ambiguity: the release requires exactly seven audit
actions (`create`, `assign`, `return`, `mark-lost`, `recovered`, `discarded`,
`edit`) and a full history rather than a single latest entry (FR3.12, FR4.4,
FR4.5).

**Decision.** Two entities.

| Entity | Owner | Identifier | Attributes |
|---|---|---|---|
| `Asset` | `AssetRepository` | `id` | name, category, serial_or_key, model, notes, status, assigned_to, last_assigned_to, assigned_at, returned_at, created_at, updated_at |
| `AuditEntry` | `AuditRepository` | `id` | asset_id, action, description, actor, created_at |

**No `Holder` entity.** The current holder and the preserved previous holder
are **attributes of the asset**, and the directory derives its rows from the
assets. **No `Actor` entity** — the actor is an attribution on an audit entry,
and its mechanism is not yet chosen (ADR-005).

`AuditEntry` references `Asset`; the reference is declared, and the owning
component of the referenced entity is named on the reference itself.

**Consequences.**

- "Who held it before" is an **attribute**, read directly, not a join. The
  question the preserved previous-holder field exists to answer is answered by
  reading the field, which is why the field is populated on the two edges where
  the departing holder must be preserved.
- The directory's rows are derived from the assets, so a holder with no assets
  does not appear, and a holder whose assets all move away disappears. The
  directory's count of distinct display holders excludes the "Unassigned" row,
  which is reserved for never-held assets.
- The two holder fields are **strictly non-falling-back**: `Holder` is the
  current holder, `Last holder` is the preserved previous holder, and neither
  ever echoes the other. A currently-assigned asset shows an empty last
  holder.
- An `AuditEntry` survives its asset's history being preserved; the entry is
  never updated and never deleted, and the database enforces that with
  `BEFORE UPDATE` and `BEFORE DELETE` triggers rather than with application
  code.
- Because the actor has no entity, the choice of mechanism at OQ1 cannot
  require a schema change to the audit table beyond the actor attribute this
  design already specifies.
- The cost is that a holder is free text. That is the release's existing
  reality (A4), and a holder table would make the display name an identity,
  which the release explicitly rejects.

**Alternatives Rejected.**

- *A `Holder` entity the directory owns.* A holder is free text today (A4),
  and the directory's holders are derived from the assets (A16). A holder
  table would make "who held it before" a join rather than an attribute, and
  it would introduce an entity whose lifecycle the release never defines.
- *An `Actor` entity.* Rejected in ADR-005: the mechanism is not chosen, and
  an entity introduced now would be a guess about a table's shape.
- *A separate `AssetStatus` entity for the five buckets.* The buckets are a
  closed vocabulary of attribute values, not records with identities.

---

## ADR-008 — One uniqueness component owns the comparison definition and the collision lookup, and serves its two callers under two named transaction disciplines

**Context.** The release requires one shared definition between the
application-level comparison predicate and the database's functional unique
index, applied identically to registration and to serial/key updates
(FR1.4–FR1.9, and the standing condition in `project.md`). The comparison is
trimmed, case-folded, and category-scoped.

The check must run inside an `IMMEDIATE` transaction with a non-zero
`busy_timeout`; `SQLITE_BUSY` maps to a retryable error code and
`SQLITE_CONSTRAINT_UNIQUE` maps to the duplicate-serial code; both are
detected by their machine-readable `err.code` and never by matching message
text (FR1.6, FR1.6a).

The mockups additionally require an **inline duplicate warning** before
submission and a **submit-time collision block** naming and linking the
existing asset.

Those two requirements pull in different directions on the transaction
discipline. The **authoritative** check — the one the registration path and the
edit path act on — must take a write lock, or two concurrent writers can each
read "free" and each write. The **advisory** lookup — the one the inline
warning shows, fired when the serial field loses focus — has no such need: it
takes no write lock, so it cannot block another writer on the single database
file, and it cannot surface a busy condition to a person who is still typing.

**Decision.** One component, `UniquenessCheck`, owns the shared normalisation
predicate, the collision lookup, the `SQLITE_BUSY` mapping, and the two-tier
error mapping. It exposes **one** notion of "does this collide", used by the
registration path, the edit path, and the inline warning alike.

The component serves that one notion under **two named transaction
disciplines**:

- The **authoritative** check runs inside an `IMMEDIATE` transaction with a
  non-zero `busy_timeout`, so a concurrent writer waits for the lock rather
  than failing immediately, and a lock that cannot be acquired within the
  timeout surfaces as the retryable busy condition.
- The **advisory** lookup runs inside a **deferred read transaction** and takes
  no write lock, so it cannot block another writer and cannot raise a busy
  condition.

The two disciplines differ. The **comparison** they perform does not, which is
what keeps the advisory answer and the authoritative answer in agreement.

The two error codes are separated along the same line: a busy condition is
raised only by the authoritative check, and a collision is raised by both tiers
under one code.

**Consequences.**

- There is exactly one answer to "is this serial or key taken", so the inline
  warning and the authoritative check **cannot** disagree — which is what the
  mockups specify and what two definitions would guarantee they would.
- The `IMMEDIATE` discipline and the `busy_timeout` live with the check rather
  than with each caller, so a new write path inherits them rather than
  reimplementing them.
- The advisory lookup does not take a write lock, so a person typing a serial
  never blocks a colleague registering an asset, and never receives a retryable
  busy code for something that is not busy.
- The two error codes are distinguished by mechanism, not by message: a busy
  database is retryable and a collision is not, and a caller can act on the
  distinction without parsing prose.
- The edit path uses the same check as registration, so the standing condition
  that both enforce the same uniqueness policy is structural.
- The cost is that the component holds two transaction disciplines, and a
  reader must learn which tier they are calling. The alternative — two
  components — buys tidiness at the price of the guarantee the component
  exists to provide.
- The cost is that the component's authoritative callers must accept the check's
  transaction boundary. That is the point of the `IMMEDIATE` discipline — the
  check is not correct outside it.

**Alternatives Rejected.**

- *A separate lightweight component for the inline-warning lookup.* It would
  create two definitions of "does this collide" — one advisory and one
  authoritative — which is precisely what lets the two disagree. The two
  disciplines are a property of the *call*, not a property of the *definition*.
- *One discipline for both tiers.* Running the advisory lookup inside an
  `IMMEDIATE` transaction would take a write lock on every blur, blocking other
  writers for the sake of a warning. Running the authoritative check in a
  deferred transaction would remove the write lock the check exists to hold.
- *Let each write path run its own uniqueness SQL.* Two callers today, three
  surfaces tomorrow, and each free to normalise slightly differently. The
  requirement is one definition; two implementations of it is two definitions.
- *Detect the collision by matching the error message.* A message-coupled test
  cannot distinguish a functional-index violation from a plain one, and the
  standing condition in `project.md` requires detection by `err.code`.

---

## ADR-009 — The schema rebuild is one component and one indivisible migration

**Context.** The release requires a table rebuild of **both** `audit_log` and
`assets`, because SQLite cannot amend either a `CHECK` constraint or a
foreign-key clause in place. The `architecture` artifact records the verified
ordering constraint: rebuild `audit_log` **without** its foreign-key clause,
then rebuild `assets`, then re-add the foreign key. Rebuilding `assets` first
fires `ON DELETE CASCADE` and destroys every audit row **silently, with the
transaction committed and no error raised**; the reverse order fails with a
foreign-key error.

A rebuild also destroys the indexes on the rebuilt table, so the migration
must re-issue the index DDL itself. The migration must control the
`foreign_keys` pragma explicitly, because the current runner can apply a
migration against a raw handle where foreign keys are off. The backfill is
idempotent, counts and reports failures with row identifiers, and **fails the
migration** on any failing row and rolls back (NFR3.3–NFR3.6).

**Decision.** One component, `SchemaMigration`, owns the whole rebuild as
**one indivisible unit**. The ordering is inside the component, not spread
across separate migrations or separate runner features.

**Consequences.**

- There is no state in which one table has been rebuilt and the other has not.
  Splitting the rebuild across two migrations would place exactly that state
  between them, and the ordering that is safe inside one transaction is not
  safe across two.
- The `foreign_keys` pragma window, the index re-issue, the actor-column
  backfill, the failure reporting, and the fail-and-rollback rule are all
  properties of **one** migration, and a reader of the migration sees the
  whole ordering in one place.
- The backfill's failure rule is strict: a failing row fails the migration and
  rolls it back, so a partially backfilled audit table cannot be committed.
- The component depends on the domain layer for the status vocabulary and the
  audit action vocabulary, so the rebuilt `CHECK` constraint and the rebuilt
  audit table's action values come from one definition — this is the one place
  where the domain layer's vocabulary legitimately reaches a non-JavaScript
  artefact, and it reaches it as a value at migration time rather than as a
  generated file (ADR-004).
- The cost is that the migration is large and runs once. That is appropriate
  for a foundation change whose failure mode is silent history loss.
- The component's dependency set is deliberately small, and it has no
  dependents: nothing in the running application depends on it.

**Alternatives Rejected.**

- *Two migrations — one rebuilding `assets`, one rebuilding `audit_log` and
  backfilling it.* The two rebuilds interfere. Between them there is a state in
  which one table is rebuilt and the other is not, and the ordering that is
  safe inside one transaction is not safe across two.
- *Rebuild `assets` first.* This is the ordering that destroys every audit row
  silently, with the transaction committed and no error raised. It is not a
  risk to be mitigated; it is a data-loss path.
- *Let the migration runner support the pragma window instead of the
  migration carrying it.* The runner's pragma state is a property of how the
  handle was opened, and a migration that depends on the runner's opening
  behaviour rather than controlling its own is a migration whose correctness
  is a property of its caller.
- *Apply the schema's `CHECK` text as a literal rather than from the domain
  vocabulary.* Rejected in ADR-004: this is the one exception, and it is
  justified because the migration is the one artefact that must be readable
  without running the application.

---

## ADR-010 — The screen layer is five screen components over one presenter

**Context.** The release's user-facing surface is five screens: the asset
list, the asset detail, the reconciliation dashboard, the holder directory,
and the asset form (which has two modes — registration and edit). The
`refined-mockups` stage produced eight frames and twenty-one component
contracts.

The status **display** vocabulary is separate from the status **domain**
vocabulary: the domain layer owns which statuses exist and what they mean;
the display layer owns how each one is presented — the chip, the label, the
action controls available from each status.

**Decision.** Five screen components — `AssetListScreen`, `AssetDetailScreen`,
`DashboardScreen`, `HolderDirectoryScreen`, `AssetFormScreen` — over one
`ScreenPresenter`, which owns the status display mapping and the shared
rendering concerns.

A vocabulary a template renders arrives as **render data**: the status
`<option>` list and the per-status action forms are loops over the shared
vocabulary supplied by the route. The template keeps no literal copy of either.

The presenter reads the transition table **from the domain vocabulary, and
only from there**. It does not depend on `AssetLifecycle`. The per-status
action controls a screen offers are derived from the same transition table the
lifecycle validates against, and the domain leaf is where that table lives;
adding an edge to the lifecycle would have given the presenter a second source
for the same table — the six-copies defect ADR-004 exists to close,
reintroduced at the component level — and would have made a presentation
component depend on the write-path component, which ADR-006 makes the
component whose operations cannot be used without an audit append.

The screens are peers **among themselves**; they are not peers of every other
component in the catalogue. The list depends on `CsvExport`, because the list
is the surface that offers the export and the export acts on the list's filter
(ADR-003). Every screen's refusals reach the client through one
`ErrorTranslation`, so no screen carries its own status mapping and no screen
invents its own HTTP status (ADR-012).

**Consequences.**

- The five screens are peers. None depends on another; each depends on
  `ScreenPresenter`, on the query components it reads from, and on the write
  components it acts through.
- The status display mapping exists once, so the chip on the list, the chip on
  the detail, the filter option, and the action form cannot drift apart — the
  fourth of the six copies the `architecture` artifact records.
- The transition table reaches the screens through one path — the domain leaf
  — so a presenter that renders an action and a lifecycle that validates it
  cannot disagree about which actions exist.
- The four count-consuming surfaces read their figures from `CountingQuery`
  (ADR-003) rather than computing them.
- The editor's own inline duplicate warning comes from `UniquenessCheck`
  (ADR-008), so it agrees with the submit-time block by construction.
- The `detail` screen reaches `AssetLifecycle` for its legal actions and
  `AssetHistory` for the full sequence, so the transition table and the history
  are read from one place.
- A screen cannot map a refusal to the wrong status, because no screen maps a
  refusal to any status.
- The cost is that a screen is not a self-contained page: it needs the
  presenter and the query components wired to it. That is the price of a
  shared vocabulary and a shared counting definition.

**Alternatives Rejected.**

- *One screen component per existing template file.* It would name components
  after the files, freezing the module layout at this stage (ADR-001).
- *Let each screen read the status set directly.* That is the fifth and sixth
  copies, and the release's vocabulary is exactly what the duplication has
  already made unreliable.
- *Merge the asset form into the list screen.* Registration and editing are
  one form with two modes, and both have their own duplicate-detection
  behaviour; merging them would put two write paths on one component and make
  the "no self-collision" rule ambiguous.
- *Let each screen translate its own domain errors into HTTP statuses.* That
  would make the status mapping a per-screen decision, and the same code could
  carry two statuses on two screens.
- *Let `ScreenPresenter` depend on `AssetLifecycle` for the per-status action
  controls.* It would give the presenter a second source for the transition
  table it already reads from the domain leaf, and it would make a
  presentation component depend on the write path — the inversion C8's
  downward flow rules out and ADR-006's capability separation depends on.

---

## ADR-011 — The deferred presentation work is recorded as constraints, not designed

**Context.** Four capabilities are **deferred out of this release** by the
approved scope: the design system, responsive UI, improved search,
pagination and result counts, and empty states. The `project.md` `## Forbidden`
rule states that none of them may enter this release.

A design stage may still be tempted to specify them — a breakpoint treatment
is easy to sketch, and a "future-state" frame beside a deferred frame reads as
a requirement to anyone who skims it.

**Decision.** The release's responsive behaviour is recorded as **three
constraints the release must not break** — the container width, the
two-column stacking order, and the table's horizontal-scroll affordance —
and **not** as a breakpoint treatment. The deferred-presentation cases are
drawn as the release actually renders them, annotated with the deferral; the
intended design is carried as a note, not as a frame a reader could mistake
for a requirement.

**Consequences.**

- A constrained spec is honest about what this stage decided. A full
  three-breakpoint specification would have been a design-system deliverable
  in disguise.
- The deferred work inherits a documented starting point rather than a blank
  page.
- The same applies to the stylesheet's **complete absence of a focus rule**.
  That is recorded as a recorded gap (D1), and the browser default is accepted
  as the release's mechanism — a one-off focus rule specified now would be
  replaced by the tokenised version, and the release's commitment is met by a
  fallback rather than by a designed indicator.
- The accessibility checker's selection remains a **Domain Design dependency**
  rather than a decision at this stage. Until a checker exists, the checklist's
  manual and rendered rows are the executable verification and its automated
  rows are aspirational; the dependency-audit gate makes the checker's
  dependency closure a real constraint on that choice.

**Alternatives Rejected.**

- *Specify the three breakpoints now.* It is the deferred design system's
  deliverable, and specifying it here would pre-empt that increment's
  decisions.
- *Draw the future-state treatment beside the release's rendering.* A reader
  would reasonably read a frame as a requirement, and the frames are the
  release's contract.
- *Add a one-off focus rule to close D1.* A rule specified now would be
  replaced by the tokenised version, and it would add a styling decision to a
  stage that is explicitly not designing the visual system.

---

## ADR-012 — The error-code vocabulary is one owned list, and one component translates it into HTTP statuses

**Context.** The existing application raises five domain error codes —
`VALIDATION_ERROR`, `DUPLICATE_ASSET`, `NOT_FOUND`, `INVALID_TRANSITION`, and
`INVALID_STATE` — and the Express error middleware translates four of them.
`INVALID_STATE` is thrown by the service layer and is **not** in the
middleware's handled set, so an asset in an unknown state surfaces as a 500
rather than as a 400.

The release adds three codes the codebase does not have: a **retryable** code
(the standing condition in `project.md` requires one, and the `SQLITE_BUSY`
mapping depends on it), a **delete-refusal** code (FR2.6, AC4.2.4), and a
**duplicate-serial** code — but the last of these is **not** a code distinct
from `DUPLICATE_ASSET`. FR1.5 requires that both tiers "carry the same
duplicate-serial error code", FR1.7 requires that the two tiers be
"indistinguishable to a caller", and AC1.3.1 states it as "the same
duplicate-serial error code as the application's check would have". The
existing code already behaves this way: `src/repositories/assets-repo.js:70-73`
raises `DUPLICATE_ASSET` **from** the unique-index violation, so the POC
already has one both-tiers code.

Nothing in the current design owns the set. A code raised by the service layer
and a code rendered by the middleware are two statements about the same
vocabulary, held in two places, with nothing requiring them to agree.

**Decision.** The error-code vocabulary is **one owned list**, held by
`DomainVocabulary` (ADR-004), carrying exactly **eight** codes, each with its
HTTP status and its retryable flag. The list is set out literally in
`components.md` under `## Error Vocabulary`.

`DUPLICATE_ASSET` is **the one duplicate-serial code**, and both tiers raise
it. The application's comparison predicate detects a collision and raises this
code directly; the functional unique index is the backstop, and its
`SQLITE_CONSTRAINT_UNIQUE` refusal is detected by `err.code` and raised as the
same code. A caller cannot tell which tier caught the collision, which is
exactly what FR1.5, FR1.7 and AC1.3.1 require. The vocabulary therefore holds
one duplicate-serial entry, not two.

One component, `ErrorTranslation`, is the **single translation point** from a
domain code to an HTTP status. It reads the code off the error's
machine-readable `code` property and never off its message text. Every code in
the vocabulary is mapped; there is no code that reaches the client as an
unmapped internal error.

A driver error carrying **no** domain code is **not** translated into a domain
code: it stays an internal error. Translating an unknown failure into a domain
code would invent a meaning the release has not defined. The delete refusal is
the one case where this rule has a named owner: `AssetLifecycle` raises
`ASSET_DELETE_REFUSED` **before** any statement runs, so the driver's foreign
key is never reached and a raw `SQLITE_CONSTRAINT_FOREIGNKEY` is never
translated into a domain code (ADR-006).

**The direction of the dependency is part of the decision.** The domain
components — `AssetLifecycle`, `AssetRegistration`, `AssetEditing`,
`UniquenessCheck` — **raise refusals carrying a domain code**; they do not ask
for an HTTP status. `ErrorTranslation` is read by the **HTTP boundary**: the
Express error middleware, which ADR-001 places in the External Dependencies
rather than in the component model. The boundary, not the service layer, turns
a raised domain error into a response. The domain layer therefore never learns
what an HTTP status is, and the services' dependency on `ErrorTranslation` is a
dependency on the *vocabulary of codes*, not an upward reach into HTTP (C8).

**Consequences.**

- The gap the current application leaves open — an unknown-state asset
  surfacing as a 500 — is closed, because the invalid-state code is now in the
  vocabulary and every code in the vocabulary is mapped.
- The retryable code's retryability is stated once, in the vocabulary, rather
  than inferred by a caller from the status code it happened to receive.
- The delete refusal is distinguishable from a validation error and from an
  internal error **by its code**, as FR2.6 and AC4.2.4 require, because it is a
  separate entry in the vocabulary rather than a differently-worded message.
- The two collision tiers are **indistinguishable to a caller**, which is what
  FR1.5, FR1.7 and AC1.3.1 require. The vocabulary holds one duplicate-serial
  code, so a caller cannot branch on *which tier* caught the collision, and the
  `src/repositories/assets-repo.js:70-73` behaviour that already raised
  `DUPLICATE_ASSET` from the index violation is the behaviour the release
  keeps.
- The refusal's owner is named: `AssetLifecycle` raises `ASSET_DELETE_REFUSED`
  before any statement runs, so the refusal is a **presence** in the domain
  rather than an absence at the database. The driver's foreign key is never
  reached, and the translation point is never handed a raw driver error to
  interpret.
- The cost is that adding a code means editing the vocabulary and the
  translation point together. That is the intended cost: a new code with no
  mapping would be exactly the unmapped-500 defect this closes.
- The cost is that a caller cannot invent an ad-hoc code outside the list
  without the translation point rejecting it.

**Alternatives Rejected.**

- *Leave the code list where each raiser declares it, and extend the
  middleware's switch.* That is the current shape, and it is why
  `INVALID_STATE` reaches the client as a 500: the list and the mapping are
  separate, so a code can exist without being mapped.
- *Map codes to statuses in the route layer.* Each route would then decide
  what a refusal means to the client, and the same code could carry two
  statuses on two routes.
- *Translate an unrecognised driver error into the retryable code.* It would
  tell a caller to retry a failure the release does not understand, which is
  the opposite of what a retryable code is for.
- *Give the duplicate-serial collision a code distinct from `DUPLICATE_ASSET`,
  so that a collision caught by the application's predicate and a collision
  caught by the database's index are distinguishable.* FR1.5 requires both
  tiers to carry the *same* code, FR1.7 requires the two tiers to be
  indistinguishable to a caller, and AC1.3.1 states it in the first person —
  "the refusal surfaces the same duplicate-serial error code as the
  application's check would have". Two codes would make the caller
  distinguish what the requirement says it must not have to distinguish.
- *Let the delete refusal reach the client as the driver's foreign-key
  error, and let the translation point recognise it.* A raw driver error
  carries no domain code, so it cannot be distinguished from any other
  internal error (FR2.6, AC4.2.4), and it leaves the refusal's meaning
  dependent on a driver's error string. The refusal is raised by
  `AssetLifecycle` instead, and the translation point is never asked to
  recognise a driver error (ADR-006).
- *Name the translation point only as "the error boundary".* The boundary is
  not a component in this catalogue — ADR-001 places the Express error
  middleware in the External Dependencies — so a decision that named no
  component would leave the single-translation-point property with no owner
  in the design. `ErrorTranslation` is the component, and the boundary is what
  reads it.

---

## ADR-013 — One component opens the connection and owns the connection-level pragmas

**Context.** The release's uniqueness guarantee depends on a **non-zero
SQLite `busy_timeout`** set on the handle at open time. The standing condition
in `project.md` requires the uniqueness check to run inside an `IMMEDIATE`
transaction with a non-zero `busy_timeout`. The `architecture` artifact
records that `busy_timeout` is at SQLite's default of 0, and a grep of `src/`
confirms it is never set anywhere in the application today.

`busy_timeout` is a **connection-level** pragma, not a per-call discipline. It
is read by SQLite when a lock attempt begins, and there is no statement that
sets it for one transaction only. A component that wanted to guarantee the
timeout for one check would have to set it on the shared handle, which is a
mutation of shared state — and the moment a second component sets it to
something else, the guarantee is gone and nobody can tell.

The journal mode and the foreign-keys pragma are in the same position: both
are set once, on the handle, at open time.

**Decision.** One component, `DatabaseConnection`, opens the handle and owns
the connection-level pragmas — the **explicit non-zero `busy_timeout`**, the
journal mode, and the foreign-keys setting. The components that run statements
receive the configured handle from it.

`UniquenessCheck` depends on `DatabaseConnection` for the timeout its
`IMMEDIATE` transaction depends on, rather than setting the pragma itself.

**Consequences.**

- The busy timeout has exactly one owner, so no component can set it to a
  value that breaks the uniqueness guarantee, and the guarantee's precondition
  is visible in one place rather than implied by a caller's discipline.
- The `busy_timeout`'s value is stated once, so a reader of the catalogue can
  find the concurrency precondition without reading the check.
- The cost is that the connection component is the one place that knows about
  the SQLite file, and every component that runs statements depends on it.
  That is a narrower surface than the one the POC has, where the handle is
  opened in the database module and passed implicitly.
- The connection component depends on nothing, so it is a leaf with no upward
  knowledge of the release's domain.
- The component is **not** the migration: `SchemaMigration` receives the
  handle and owns the rebuild's ordering, while this component owns only how
  the handle was opened. The two are separate because a migration that
  controls its own pragmas must be able to change them for its duration
  (ADR-009).

**Alternatives Rejected.**

- *Have each component that needs a lock set `busy_timeout` for itself.* The
  pragma is connection-level, so "for itself" means "for everybody", and the
  last setter wins. Two components setting it differently would produce a
  guarantee that depends on call order.
- *Set the pragma once in the application bootstrap, outside the component
  model.* The guarantee would then have no owner in the catalogue, and a
  reader of the design would have to guess where it was set.
- *Use `PRAGMA locking_mode` or a retry loop instead of a timeout.* A retry
  loop moves the busy condition from a driver error into application control
  flow, and the standing condition requires the `SQLITE_BUSY` code to reach a
  retryable domain error.

---

## ADR-014 — The filter form's dimensions and the filter state's dimensions are two different sets

**Context.** The release requires one shared filtering and counting definition
behind the four count-consuming surfaces. The asset list's filter form carries
**five** dimensions — category, status, holder, search text, and sort — and
AC5.4.8 states that the release adds **no sixth** dimension to the form.

The holder directory, however, must offer a **holder row that links to the
asset list filtered to that holder** (FR8.3). A link that carries a filter must
carry it in the filter state, and the holder dimension is the one the link
carries.

Both statements are true at once, because they are about two different
things: AC5.4.8 constrains the **form** — the controls a person types into —
and the link sets the **filter state** — everything a filter can carry. The
requirement that "every filter dimension the form carries" be cleared by the
same predicate (AC5.4.5) is likewise about the form.

**Decision.** The filter definition carries **one more dimension than the form
exposes**: a **holder** dimension, applied to the display holder rather than to
the asset's own fields. The form's five dimensions are untouched — the list's
filter form is unchanged, and AC5.4.8's "no sixth dimension" holds without
qualification.

The holder dimension is set by the directory's holder-row link, and it is not
a control on the list's filter form.

**The Reset action clears the whole filter state, including the holder
dimension.** AC5.4.5 requires that Reset "returns the list to the unfiltered
state, whose matching count equals the total record count". The form's five
dimensions are the ones a person can clear by editing a control, but a list
reached from the directory's holder-row link carries a holder filter that no
control displays — and leaving that filter in place after a Reset would
produce a Reset that does not reset on exactly the path the release's new
navigation creates, and a matching count that is not the total record count.
So Reset clears the holder dimension too, and the list returns to the
unfiltered state on **every** path into it.

The distinction the two sets draw is therefore about **what a person types
into**, not about what a filter state may carry. It is not a licence for a
dimension that survives a reset.

The distinction is stated in the catalogue rather than left implicit, so that
a later reader who finds only one of the two sets cannot mistake the other for
a violation.

The directory's own **holder search** is a **separate, directory-scoped**
filter. It filters the **holder rows**, not the assets: a holder whose name
does not match is removed from the directory even when that holder holds
assets. It is not a sixth dimension of the asset filter either, and it is not
the holder dimension of the asset filter.

**Consequences.**

- The directory's searched-population count is a count of **holders** for the
  **searched** population, and it is computed by `CountingQuery` from the
  directory's holder-search filter — not from the asset filter, because it
  counts holders and not assets. It is computed there rather than on the
  screen, so the count line and the rendered rows cannot disagree.
- The asset list's form is unchanged, so the release adds no control to it and
  AC5.4.8 holds as written.
- The list's Reset has **one** reading. It clears the form's five dimensions
  and the holder dimension together, so the list returns to the unfiltered
  state and its matching count equals the total record count on every path
  into the list — including the path the directory's holder-row link creates.
  A Reset that cleared only the visible controls would leave a filter behind
  that no person could see or remove.
- The asset list's holder dimension and the directory's holder search are two
  different filters with two different populations. A reader who treats them
  as one filter will mis-count the directory.
- The cost is that the filter concept now has three sets rather than one:
  the form's five, the state's extra holder dimension, and the directory's
  holder search. The catalogue names all three and says which is which, which
  is the price of a filter that three surfaces use for three purposes.

**Alternatives Rejected.**

- *Add a holder control to the list's filter form.* It would add a sixth
  dimension to the form, which AC5.4.8 forbids, and the release does not
  specify such a control.
- *Make the directory's holder search the same filter as the asset list's
  holder dimension.* The directory filters **holders**; the asset filter
  filters **assets**. One filter over two populations would make the
  directory's count a count of assets.
- *Give the directory its own counting logic, outside `CountingQuery`.* It
  would reintroduce the divergence the shared counting definition exists to
  remove, on the one surface whose figure is hardest to check by eye.
- *Let Reset clear only the form's five dimensions, leaving the holder
  dimension in place.* AC5.4.5 requires the Reset to return the list to the
  unfiltered state "whose matching count equals the total record count". A
  Reset that leaves a holder filter behind does not return the list to the
  unfiltered state, and on the directory's link path it leaves a filter that
  no control on the page displays and no person can remove.

---

## ADR-015 — The holder display rule states that the two holder fields never echo one another

**Context.** The `Asset` entity carries two holder fields: the **current**
holder and the **preserved previous** holder. The release requires that the
display holder be derived — the current holder where one exists, otherwise the
preserved previous holder, otherwise a reserved "Unassigned" designation — and
that "Unassigned" be reserved for assets that have **never** been held by
anyone (FR5.6, A16).

A rule stated only as "the display holder is the current holder, else the
previous holder, else Unassigned" is ambiguous in one place: read quickly, it
sounds like the previous holder might sometimes equal the current holder. It
also leaves open whether "Unassigned" is a holder name that happens to read
"Unassigned" or a reserved designation.

**Decision.** The display-holder rule states three things explicitly:

1. The two holder fields **never echo one another**. The current holder is
   the current holder; the preserved previous holder is the preserved previous
   holder. A transition that empties one writes the departing value into the
   other, and a transition that empties both leaves the asset never-held.
2. The reserved designation is a **distinct value**, not a holder name that
   happens to read "Unassigned".
3. The reserved designation applies **only** to an asset that has never been
   held by anyone.

The two holder fields are **strictly non-falling-back**: neither falls back to
the other's value.

**Consequences.**

- The directory's holders are derived from the asset rows under one stated
  rule, and a reader cannot arrive at a second reading of it.
- The reserved designation is a value in the vocabulary rather than free text,
  so an asset whose holder name is literally "Unassigned" is distinguishable
  from one that has never been held.
- The cost is a rule that is longer than the one-line summary it replaces. The
  one-line summary is the part that was ambiguous, and the length is what
  removes the ambiguity.

**Alternatives Rejected.**

- *State the rule as a plain conditional and leave the echo case to the
  reader.* The echo case is precisely the one a display rule must not leave
  open, because it decides whether the directory shows one row or two for an
  asset held by the same person twice.
- *Make "Unassigned" an ordinary holder string.* It would be
  indistinguishable from a person whose name is "Unassigned", and the
  directory's distinct-holder count would count a real holder and a reserved
  designation as one.

---

## Traceability

Each ADR is realised by components in `components.md`.

| ADR | Realised by |
|---|---|
| ADR-001 | The single `components.md` catalogue, cross-referenced against `component-inventory.md` in `## Sources Consumed` |
| ADR-002 | `DomainVocabulary` (filter definition), `AssetQuery`, `CountingQuery` |
| ADR-003 | `DashboardScreen`, `HolderDirectoryScreen`, `AssetListScreen`, `CsvExport` — four peers, none counting, with the list depending on the export |
| ADR-004 | `DomainVocabulary`, with the `CHECK` text and the stylesheet classes recorded as a boundary |
| ADR-005 | `ActorResolver`, owning the trust rule and no entity |
| ADR-006 | `AssetLifecycle`, `AssetRegistration`, `AssetEditing`, with `AssetRepository` and `AuditRepository` unable to write without an audit entry, and the delete refusal owned by `AssetLifecycle` and raised as `ASSET_DELETE_REFUSED` before any statement runs |
| ADR-007 | The `Asset` entity owned by `AssetRepository`, the `AuditEntry` entity owned by `AuditRepository` |
| ADR-008 | `UniquenessCheck`, with one notion of collision served to the registration path, the edit path, and the inline warning under two named transaction disciplines |
| ADR-009 | `SchemaMigration`, owning the whole rebuild as one unit |
| ADR-010 | `ScreenPresenter` and the five screen components |
| ADR-011 | The responsive constraints and the recorded gap D1, recorded in `components.md`'s Rationale and in the traceability targets |
| ADR-012 | `DomainVocabulary` (the eight-code vocabulary, holding one duplicate-serial code raised by both tiers) and `ErrorTranslation` (the single translation point, read by the HTTP boundary) |
| ADR-013 | `DatabaseConnection`, owning the busy timeout, the journal mode, and the foreign-keys setting |
| ADR-014 | `AssetQuery` (the holder dimension, the directory's holder search, and the holder dimension's clearance by the list's reset), `CountingQuery` (the searched-population figure), `HolderDirectoryScreen` (the holder-row link), `AssetListScreen` (the reset action) |
| ADR-015 | `DomainVocabulary` (the display-holder rule) and the `Asset` entity's two holder fields |

---

## Sources Consumed

- `aidlc/spaces/default/intents/261106-asset-tracker-mvp/inception/requirements-analysis/requirements.md`
  — FR1–FR11 and NFR1–NFR6, the three approved invariants, the actor-trust
  rule, and constraints C8 (layering) and C9 (vocabulary single-sourcing).
- `aidlc/spaces/default/intents/261106-asset-tracker-mvp/inception/user-stories/stories.md`
  — the 30 released stories and the 10 deferred follow-on items.
- `aidlc/spaces/default/codekb/assets_management/architecture.md`
  — the verified migration-ordering constraint, the layering, the error-code
  contract, and the transaction-safety finding.
- `aidlc/spaces/default/codekb/assets_management/component-inventory.md`
  — the twelve existing components, the nine absent capabilities, and the six
  copies of the status vocabulary.
- `aidlc/spaces/default/intents/261106-asset-tracker-mvp/inception/practices-discovery/team-practices.md`
  — the `## Testing Posture` section's affirmed `Methodology` and `Ordering`
  fields, and the `## Code Style` section's layering, error-contract,
  prepared-statement, and view-idiom practices.
- `aidlc/spaces/default/intents/261106-asset-tracker-mvp/inception/refined-mockups/mockups.md`
  and `.../refined-mockups/interaction-spec.md`
  — the eight screens, the twenty-one component contracts, the display-holder
  rule, and the shared counting and CSV column definitions.
- `aidlc/spaces/default/memory/project.md`
  — the `## Decided` record and the `## Mandated` / `## Forbidden` rules that
  fix the actor-trust rule, the shared uniqueness definition, the shared
  counting definition, and the append-only history invariant.
