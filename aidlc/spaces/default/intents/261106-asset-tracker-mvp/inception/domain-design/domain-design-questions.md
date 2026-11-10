# Domain Design — Design Plan and Interview Questions

**Stage**: domain-design (inception)
**Intent**: 261106-asset-tracker-mvp
**Space**: default
**Scope**: feature
**Depth**: Standard

This file holds the design plan for the Asset Tracker MVP's domain design and
the questions that shape it. The answers recorded below drive the generation of
`components.md`, `decisions.md` and `traceability.json` in this directory.

Five upstream facts constrain the plan and are **not** reopened here:

- **The requirements are the contract.** `requirements.md` states the release as
  FR1–FR11, NFR1–NFR6, C1–C13, with three approved invariants (INV-1
  append-only history, INV-2 five exclusive buckets, INV-3 one shared counting
  definition), the actor-trust rule, and normalised category-scoped uniqueness.
- **The stories are the behavioural surface.** `stories.md` carries 30 released
  stories across US0–US7 and 10 deferred follow-on items (US8.1–US8.10), each
  with acceptance criteria.
- **The wireframes and refined mockups define the screens.** Eight screens (W1
  dashboard, W2 asset list, W3 asset detail, W4 new-asset form, W5 edit form,
  W6 holder directory, W7 reason dialog, W8a discard and W8b recovery
  dialogs), plus a shared frame, and 21 component contracts.
- **The code is brownfield.** `component-inventory.md` records twelve existing
  components (C1–C12) and nine **absent** capabilities — counting, dashboard,
  directory, CSV export, actor concept, shared filter/count definition, full
  history retrieval, linting config, CI pipeline. The absent ones are greenfield
  building blocks, not refactors.
- **The migration ordering is binding.** `architecture.md` records the one
  verified-safe rebuild sequence: rebuild `audit_log` without its foreign-key
  clause → rebuild `assets` → re-add the foreign key, with the `foreign_keys`
  pragma controlled by the migration itself. The reverse order destroys every
  audit row silently.

---

## Design Approach

**What a component is here.** A component is a bounded piece of software with
its own business logic, entities, and lifecycle — code the team writes.
Databases, caches, queues, and third-party services are dependencies *of*
components, never components themselves.

**What this stage decides.** Which logical building blocks the system is made
of; which component owns which entity; what business rules each block owns;
which component calls which, and why; and the durable Architecture Decision
Records behind those calls.

**What this stage does not decide.** Deployment topology (monolith,
microservices, serverless) — that is Units Generation's job. The tech stack.
NFR patterns — those belong to the NFR and infrastructure stages. The actor
mechanism itself, which remains an open question (OQ1) constrained but not
chosen. The full data schema, data types, validation constraints, and
relationship cardinality — those belong to Functional Design. Method and API
signatures — those belong to Contract Design.

**The entity capture depth is deliberate.** Entities are captured at the
**ownership + shape** level only: which component owns it, its identifier, its
attribute names, and any cross-component reference. Data types, allowed values,
and cardinality belong to Functional Design, and this stage does not
pre-empt them.

**The brownfield constraint shapes the catalogue.** The release is a layered
monolith with strictly downward dependencies and no cycles. The component
catalogue must respect that shape: components call downward only, and the
dependency graph is acyclic. Where the release needs a new building block, it
is either a new component in the same shape or a new leaf layer — constraint
C8 already commits the release to one new leaf layer, `src/domain/`, owning the
shared domain vocabulary and depending on nothing but Node built-ins.

---

## Embedded Questions

### Q1 — What the catalogue is a catalogue of

The release's work splits into two kinds of building block: **changed existing
blocks** (the assets router grows new endpoints, the asset service gains new
transitions, the repository gains new queries, the schema gains a rebuilt
table) and **new blocks** (the counting definition, the filter builder, the
dashboard, the directory, the CSV export, the actor resolution, the
duplicate-detection check).

**A.** One catalogue of logical building blocks covering the whole system the
release delivers — the existing blocks and the new ones — with each block
named for what it does rather than for the file it lives in, so that the
catalogue describes the design rather than the current directory layout.
**B.** Two catalogues: one of the existing blocks to be changed, one of the
new blocks to be built.

**Recommendation:** A. The stage's question is "what are the building blocks
of the system", and the existing component inventory already answers "what
exists" — the CodeKB holds it, and duplicating it here would create a second
answer to the same question that could drift. What this stage must add is the
*release's* building blocks, and the release's building blocks include the
changed existing ones: the assets router of the release is not the assets
router of the POC, and a catalogue that named only the greenfield blocks would
not describe the system the release delivers.

[Answer]: A. One catalogue of logical building blocks covering the whole system the release delivers — the existing blocks and the new ones — with each block named for what it does rather than for the file it lives in, so that the catalogue describes the design rather than the current directory layout.

### Q2 — Where the shared counting definition and the filter builder live

INV-3 requires the dashboard, the directory, the asset list, and the CSV export
to compute their counts from **one shared definition**, and the project rules
record that "a shared definition with no consumers leaves the counts
disagreeing". The scope stage already decided the shape: model the definition
and the filter builder with the group that owns the domain semantics, and
consume them from the consuming surfaces.

The team rules place the shared vocabulary in a new leaf layer, `src/domain/`,
that depends on nothing but Node built-ins. But a filter builder that
assembles a SQL `WHERE` clause cannot live in a layer that owns no SQL, and a
counting function that must issue a database query (NFR5.2 forbids loading the
asset set into memory) needs the database handle.

**A.** Two components: a **filter definition** in the domain layer (the five
filter dimensions, their normalisation, and the vocabulary they draw on) and a
**counting and query component** that owns the SQL, takes the filter
definition as input, and is consumed by all four surfaces. The domain layer
stays a pure leaf; the SQL stays in the data-access layer.
**B.** One component in the domain layer owning both the filter definition and
the SQL, with the domain layer taking a database handle — which breaks the
leaf property C8 grants it.
**C.** The counting and filter builder as one component in the data-access
layer, with the domain layer holding only the status set, transition table,
and reason vocabulary.

**Recommendation:** A. It keeps the leaf property C8 grants the domain layer,
it keeps every SQL statement inside the data-access layer as the team's
code-style practice requires, and it gives the shared definition exactly one
implementation that four surfaces consume. C would put the filter's
vocabulary in the same layer as its SQL, which reopens the single-sourcing
question the vocabulary layer exists to close.

[Answer]: A. Two components: a **filter definition** in the domain layer (the five filter dimensions, their normalisation, and the vocabulary they draw on) and a **counting and query component** that owns the SQL, takes the filter definition as input, and is consumed by all four surfaces. The domain layer stays a pure leaf; the SQL stays in the data-access layer.

### Q3 — The domain layer's contents

C9 requires the status set, the transition table, the loss-reason vocabulary,
the uniqueness comparison predicate, and the shared count and filter definition
to each exist once. The component inventory records that the status set is
currently **duplicated six times** — schema `CHECK`, repository `Set`, service
`TRANSITIONS`, list filter `<option>`, detail action forms, stylesheet
`.status-*` classes.

**A.** The domain layer owns the status set, the display-label mapping, the
transition table, the loss-reason vocabulary plus the retirement-specific
values, the uniqueness comparison predicate, the audit action vocabulary, and
the filter dimensions' vocabulary. It owns **no** data access, no SQL, and no
HTTP. The schema `CHECK` constraint and the stylesheet's `.status-*` classes
remain literal copies, because a SQL `CHECK` cannot read a JavaScript constant
and a CSS class name cannot either — and that duplication is recorded as a
recorded boundary rather than as a defect.
**B.** The domain layer owns the above and additionally owns the SQL
`CHECK` constraint text and the stylesheet class names, as exported strings,
so that a generator writes them.

**Recommendation:** A. The requirement (C9) is single-sourcing *in code* —
the vocabulary a template renders must arrive as render data rather than
copied into the template. B introduces a code-generation step the release
does not otherwise have, and the team rules record that the repository has no
build step, no preprocessor, and no generator. A generated artefact would be a
new deployment concern for a single-host release.

[Answer]: A. The domain layer owns the status set, the display-label mapping, the transition table, the loss-reason vocabulary plus the retirement-specific values, the uniqueness comparison predicate, the audit action vocabulary, and the filter dimensions' vocabulary. It owns **no** data access, no SQL, and no HTTP. The schema `CHECK` constraint and the stylesheet's `.status-*` classes remain literal copies, because a SQL `CHECK` cannot read a JavaScript constant and a CSS class name cannot either — and that duplication is recorded as a recorded boundary rather than as a defect.

### Q4 — Where the four count-consuming surfaces live

The four surfaces are one indivisible group (FR6.8, assumption A13); a group
that ships all but one of its members leaves the counts with no consistency
guarantee at all. Two of them are **new screens** (the dashboard, the
directory); two are **existing surfaces gaining a number** (the asset list,
the CSV export).

**A.** Four distinct screen components — Dashboard, Holder Directory, Asset
List, CSV Export — each consuming the one counting component and rendering
its own surface, with the counting component as the single source of every
figure. The screens are peers of each other and none of them computes a
count of its own.
**B.** One "reporting" component owning the dashboard, the directory, and the
CSV export, with the asset list counting through it too — fewer components, but
one component owning three unrelated surfaces.
**C.** The dashboard and the directory as screen components, with the CSV
export and the asset list's count line handled inside the existing assets
service and router, since neither is a screen of its own.

**Recommendation:** A. The four surfaces are indivisible for *delivery*, not
for *implementation*: what must be shared is the definition, not the
rendering. B binds three surfaces that change at different rates and for
different reasons — the dashboard and the directory are new screens, the CSV
export is a file producer — into one unit whose changes are coupled for no
reason. C is what the POC already does badly: the four copies of the status
vocabulary are exactly the symptom of each surface owning its own definition,
and adopting it for the counting definition would rebuild the defect the
release exists to remove.

[Answer]: A. Four distinct screen components — Dashboard, Holder Directory, Asset List, CSV Export — each consuming the one counting component and rendering its own surface, with the counting component as the single source of every figure. The screens are peers of each other and none of them computes a count of its own.

### Q5 — The actor resolution boundary

The actor-trust rule (FR2.2, NFR2.1) constrains *any* mechanism: the actor is
resolved server-side, a request-supplied actor is ignored rather than
rejected, and no client-settable field or header may be the actor's source.
The mechanism itself is **not chosen** (OQ1, open items I-01 / I-03), and the
release must not re-open it.

**A.** A single **actor resolution** component in the release, whose interface
is "resolve the actor for this request and return a stable display identity",
with the mechanism behind it left open behind that interface. The component
owns the trust rule — the rule that a request-supplied actor is ignored — so
that the rule is implemented once and cannot be implemented differently by two
callers. Every write path calls it; the read-only "Acting as" indicator
renders its result.
**B.** No actor component: the actor is resolved inline at each write path
until the mechanism is chosen.

**Recommendation:** A. B makes the trust rule a convention enforced by call
discipline rather than by a component — which is the same weakness the code
inventory records about the state machine living in the service layer with an
unguarded repository behind it. A records the *shape* of the mechanism as a
component boundary while leaving the mechanism open, and it gives the
design-system increment and the OQ1 resolution a single place to change.

[Answer]: A. A single **actor resolution** component in the release, whose interface is "resolve the actor for this request and return a stable display identity", with the mechanism behind it left open behind that interface. The component owns the trust rule — the rule that a request-supplied actor is ignored — so that the rule is implemented once and cannot be implemented differently by two callers. Every write path calls it; the read-only "Acting as" indicator renders its result.

### Q6 — The write path and the audit entry

FR2.5, NFR3.1, and the standing conditions require the asset change and its
audit append to be **one all-or-nothing unit** on every write path. The POC
performs them as two statements with no enclosing transaction, so a throw
between them leaves a mutated asset with no audit row — a silent failure. The
release's own success measure, Audit Completeness, is achievable only if this
holds.

**A.** A single **lifecycle transition** component that owns the eight released
edges, and whose every write is one transaction covering the asset write and
the audit append together. The transition component calls the audit component
inside the transaction; it does not call the repository twice and hope.
**B.** Keep the transition logic in the asset service and add the transaction
there, leaving the audit append as a separate repository call.

**Recommendation:** A. A transaction is a boundary, and the only way to make it
hold on every write path is to have one component that *is* the write path.
B is the POC's shape with a transaction added, and it leaves the invariant
dependent on every future caller remembering to open one — the same
call-discipline weakness the inventory records in the state machine, and the
same weakness that produced the silent audit-loss defect in the first place.

[Answer]: A. A single **lifecycle transition** component that owns the eight released edges, and whose every write is one transaction covering the asset write and the audit append together. The transition component calls the audit component inside the transaction; it does not call the repository twice and hope.

### Q7 — The entity ownership of the actor and of the holder

Every entity must be owned by exactly one component; ambiguous ownership is a
design smell. Two candidates could be read as separate entities: the **actor**
(a person who caused a write) and the **holder** (a free-text display name on
an asset). Assumption A4 separates them explicitly — the holder is *not* a
person account and the actor is *not* a holder. FR5.3 forbids presenting a
holder name as though it identified a person in a directory of accounts.

**A.** The **Asset** entity owns the holder fields as attributes of the asset
(`assigned_to`, `last_assigned_to`) — the holder is a display name recorded on
the asset, not an entity of its own. The **AuditEntry** entity owns the
`actor` attribute — the actor is a recorded attribution on an audit entry, not
an entity. No `Holder` entity and no `Actor` entity exist. The directory
derives its holder rows from the assets, as assumption A16 requires.
**B.** A `Holder` entity the directory owns, joined to assets.
**C.** An `Actor` entity the actor component owns, joined to audit entries.

**Recommendation:** A. B would create a holder record for a name that is free
text today, contradicting assumption A4 and assumption A16, and would make
"who held it before" a join rather than an attribute — which is the
question the release's preserved previous-holder field exists to answer
directly. C would create an actor record for a mechanism that is not chosen;
if the chosen mechanism turns out to be a plain string in a header, an actor
entity is a table for a value that was never an entity.

[Answer]: A. The **Asset** entity owns the holder fields as attributes of the asset (`assigned_to`, `last_assigned_to`) — the holder is a display name recorded on the asset, not an entity of its own. The **AuditEntry** entity owns the `actor` attribute — the actor is a recorded attribution on an audit entry, not an entity. No `Holder` entity and no `Actor` entity exist. The directory derives its holder rows from the assets, as assumption A16 requires.

### Q8 — The duplicate-detection component and the collision check's placement

FR1.4–FR1.9 require one shared normalisation-and-comparison definition used by
both the application-level predicate and the database's functional unique index,
applied identically to registration and to serial/key edits. FR1.6 additionally
requires the check to run inside an `IMMEDIATE` transaction with a non-zero
`busy_timeout`, with `SQLITE_BUSY` mapped to a retryable code. The refined
mockups add two *user-facing* surfaces on top: an inline warning as the serial
field is typed, and a submit-time block naming the existing asset.

**A.** A single **uniqueness check** component owning the shared normalisation
predicate, the collision lookup, the `IMMEDIATE`-transaction discipline, the
`SQLITE_BUSY` → retryable mapping, and the two-tier error codes. The
registration path, the edit path, and the inline-warning lookup all call it.
**B.** The inline-warning lookup as a separate lightweight component, because
it runs on every keystroke-ish event and must not open a transaction.

**Recommendation:** A. B creates two definitions of "does this collide" — one
for the advisory check and one for the authoritative one — which is exactly
the shape that lets the two disagree. The mockups' own copy states that a
dismissed inline warning does not waive the submit-time refusal, so the two
checks are already specified to agree. A single component with a shared
predicate can serve both, and can be asked for an advisory answer and an
authoritative answer without redefining collision.

[Answer]: A. A single **uniqueness check** component owning the shared normalisation predicate, the collision lookup, the `IMMEDIATE`-transaction discipline, the `SQLITE_BUSY` → retryable mapping, and the two-tier error codes. The registration path, the edit path, and the inline-warning lookup all call it.

### Q9 — The migration component and the schema rebuild

NFR3.5a makes the migration ordering binding: rebuild `audit_log` without its
foreign-key clause → rebuild `assets` → re-add the foreign key, with the
migration controlling the `foreign_keys` pragma itself. NFR3.5 requires that no
audit history is lost; NFR3.3/NFR3.4 require the backfill to be idempotent,
to report its failures with row identifiers, and to **fail the migration** if
any row cannot be given the `system` actor. The team's deployment practice adds
that the rebuild must re-issue the index DDL itself, because a rebuild destroys
the indexes on the rebuilt table.

**A.** A single **schema migration** component owning the whole rebuild — the
ordered statements, the pragma window, the index re-issue, the audit backfill
with its failure count and its fail-the-migration rule — as one indivisible
migration unit, because splitting it across two migrations would put the
history-destroying window between them.
**B.** Two migrations: one rebuilding `assets`, one rebuilding `audit_log` and
backfilling it.

**Recommendation:** A. B is the ordering that fails. The verified constraint is
that dropping `assets` first fires the cascade and destroys every audit row
with the transaction committed and no error raised; the reverse order fails with
a foreign-key error. If the two rebuilds are two separate migrations, then
between them there is a state in which one table has been rebuilt and the other
has not, and the ordering that is safe in one transaction is not safe across
two. A records what the verified constraint actually requires: one indivisible
unit.

[Answer]: A. A single **schema migration** component owning the whole rebuild — the ordered statements, the pragma window, the index re-issue, the audit backfill with its failure count and its fail-the-migration rule — as one indivisible migration unit, because splitting it across two migrations would put the history-destroying window between them.

### Q10 — What the traceability file maps onto

The traceability sensor resolves this stage's upstream set from `stories.md`,
so all 40 `USx.y` identifiers must be declared and covered. Thirty are
released stories with an observable surface; ten (US8.1–US8.10) are the
deferred follow-on items the story set records.

**A.** Every one of the 30 released stories maps `OK` to the component (or
entity) that realises it. The 10 deferred follow-on items map `Deferred` with
a target naming the component the follow-on work would attach to — not an
empty target, and not a gap, because they are approved work with a later
delivery date rather than missing work.
**B.** The deferred items are omitted from the file.

**Recommendation:** A. The sensor requires every declared upstream ID to be
covered, and `Deferred` is a first-class status in it precisely because
omitting a story is indistinguishable from forgetting it. The ten deferred
items each name a real attachment point — US8.6 (design system) attaches to
the presentation layer, US8.9 (pager) to the asset list, US8.4/US8.5 (the two
deferred discard edges) to the lifecycle transition component — and recording
those attachment points is more useful to the later increment than omitting
them.

[Answer]: A. Every one of the 30 released stories maps `OK` to the component (or entity) that realises it. The 10 deferred follow-on items map `Deferred` with a target naming the component the follow-on work would attach to — not an empty target, and not a gap, because they are approved work with a later delivery date rather than missing work.

### Q11 — The reviewer's attention

The previous stages' reviewers found silent arithmetic and cross-reference
defects: a table whose row count was right and whose status breakdown was
wrong; a count line rendering a figure the requirement never asked for; three
requirement references pointing at criteria that did not assert what the
reference claimed.

**A.** Concentrate the review on the consistency of the catalogue itself:
that every story's mapped component exists and owns what the mapping claims;
that every entity has exactly one owner; that `depends_on` and `dependents`
are symmetric and the graph is acyclic; that no infrastructure is a component;
and that every requirement the catalogue claims to satisfy is actually
satisfied by the component the mapping names — with the references checked
against `requirements.md`, not against a restatement.
**B.** A general review of the catalogue's completeness against the
requirements.

**Recommendation:** A. A general completeness review asks "is anything
missing?", which passes on a catalogue that is complete in coverage and wrong
in ownership — the defect class the previous rounds found every time. The
specific check is cheap to perform and is the one that has caught defects in
each prior stage.

[Answer]: A. Concentrate the review on the consistency of the catalogue itself: that every story's mapped component exists and owns what the mapping claims; that every entity has exactly one owner; that `depends_on` and `dependents` are symmetric and the graph is acyclic; that no infrastructure is a component; and that every requirement the catalogue claims to satisfy is actually satisfied by the component the mapping names — with the references checked against `requirements.md`, not against a restatement.

---

## Consolidated Summary Confirmation

**The catalogue.** One catalogue of logical building blocks covering the whole
system the release delivers — the changed existing blocks and the new ones —
named for what each does rather than for the file it lives in.

**The new leaf.** A `src/domain/` layer that depends on nothing but Node
built-ins, owning the status set, the display-label mapping, the transition
table, the loss-reason vocabulary and the retirement-specific values, the
uniqueness comparison predicate, the audit action vocabulary, and the filter
dimensions' vocabulary. The schema `CHECK` and the stylesheet's `.status-*`
classes remain literal copies, recorded as a boundary rather than a defect.

**The shared definition.** Two components: a filter definition in the domain
layer, and a counting and query component owning the SQL and consuming the
filter definition. All four count-consuming surfaces read every figure from
the counting component; none computes a count of its own.

**The four surfaces.** Four peer screen components — Dashboard, Holder
Directory, Asset List, CSV Export — delivered as one indivisible group.

**The actor.** One actor resolution component owning the trust rule, with the
mechanism left open behind its interface.

**The write path.** One lifecycle transition component owning the eight
released edges, whose every write is one transaction covering the asset write
and the audit append.

**The entities.** `Asset` owns its holder fields; `AuditEntry` owns its actor.
No `Holder` entity and no `Actor` entity.

**The uniqueness.** One uniqueness check component owning the shared
normalisation predicate, the collision lookup, the `IMMEDIATE` discipline, the
`SQLITE_BUSY` mapping, and the two-tier error codes — serving registration,
edit, and the inline warning alike.

**The migration.** One schema migration component owning the whole ordered
rebuild, the pragma window, the index re-issue, and the failing backfill, as
one indivisible unit.

**The traceability.** 30 released stories map `OK`; the 10 deferred
follow-on items map `Deferred` to their attachment points.

**The review focus.** The catalogue's internal consistency and its
consistency with `requirements.md` — checked against the requirement text,
not against a restatement.

[Answer]: Looks correct
