# User Stories — Asset Tracker MVP

**Stage**: user-stories (inception)
**Intent**: 261106-asset-tracker-mvp
**Space**: default
**Scope**: feature
**Date**: 2026-11-09
**Review**: advisory (aidlc-product-lead-agent) — iteration 1: 10 findings, all verified and resolved; iteration 2: 10 confirmed resolved, 5 further findings raised and resolved
**Criteria**: 204 acceptance criteria across 30 released stories

**Personas**: Priya Raman (Asset Administrator, primary), Marcus Webb (Asset
Owner / Requester, secondary). Defined in `personas.md`.

**Conventions**

- Story IDs are `US{group}.{seq}`. Acceptance criterion IDs are
  `AC{story-group}.{story-seq}.{criterion-seq}`.
- Priorities are MoSCoW: **Must Have**, **Should Have**, **Could Have**,
  **Won't Have**. The MVP boundary is formally decided in Delivery Planning;
  these priorities inform that decision.
- Every story carries an INVEST note. *Independent* means no story depends on
  another story's work being complete; dependencies recorded below are data or
  ordering dependencies, not "must be built first" dependencies.
- The actor-trust rule is stated once in **US7.1** and asserted by every write
  story's own acceptance criteria. No story names an actor-identity
  mechanism; that mechanism is an open decision (I-01 / I-03) resolved in
  Domain Design.
- A **vocabulary** story — US3.3, US3.6 — depends on nothing. A vocabulary is
  data, not behaviour: it exists before the behaviour that consumes it, and the
  consuming stories depend on it, never the other way round.
- Criteria assert on **observable outcomes**. Where a rule is verified by
  inspection rather than by a test — a single-source delivery rule, an
  implementation technique — the criterion says so rather than pretending to
  assert something a test cannot see.

**Error codes under test**

Every criterion in this set that refers to an error code refers to a code from
one named error vocabulary.

- The vocabulary is fixed by **Domain Design**. This document does **not**
  invent the names, because the error vocabulary is a domain-design concern
  and the existing vocabulary in the codebase (`VALIDATION_ERROR`,
  `DUPLICATE_ASSET`, `NOT_FOUND`, `INVALID_TRANSITION`, `INVALID_STATE`) is
  not this document's to change.
- **The names are bound into this document before Code Generation begins.**
  The affirmed testing posture requires every new test to assert on
  `err.code` and never on message prose (NFR6.6), so a criterion that names
  an unbound code cannot be tested. At binding time each generic phrase in
  this document — "the validation error code", "the invalid-transition error
  code", "the duplicate-serial error code", "the retryable busy code" — is
  replaced with the literal code string.
- Every code in the vocabulary is mapped in the error middleware to a specific
  HTTP status. This includes the invalid-state code, which the codebase today
  throws but does not map, so it falls through to a 500 (AC7.1.6).

**Test data and seeds**

The count-consuming surfaces are one indivisible group and the shared counting
definition is the release's third invariant. Those claims are only verifiable
against a **named** dataset, so the set names one.

**The reconciliation seed.** A dataset of eight assets:

| # | Status | Current holder | Preserved previous holder |
|---|---|---|---|
| 1 | `in-stock` | null | null |
| 2 | `in-stock` | null | null |
| 3 | `assigned` | Dana Reyes | null |
| 4 | `assigned` | Dana Reyes | null |
| 5 | `returned` | null | Dana Reyes |
| 6 | `lost` | null | Dana Reyes |
| 7 | `lost` | null | null |
| 8 | `discarded` | null | Chris Patel |

Against this seed:

- **Total Records = 8.**
- **Active Inventory = 7** — every bucket except `discarded`.
- The five bucket counts are **2 / 2 / 1 / 2 / 1**, and their sum is **8**.
- The `discarded` bucket count is **1**.
- The count of assets available to assign is the `in-stock` count, **2**.
- The directory renders **three** rows — Dana Reyes, Chris Patel and
  "Unassigned" — and its count line reads **2** distinct display holders,
  because "Unassigned" is excluded from that count.
- Dana Reyes's row carries **4** assets — two `assigned`, one `returned` and
  one `lost`, the last attributed by its preserved previous holder.
- Chris Patel's row carries **1** asset — the `discarded` one, attributed by
  its preserved previous holder.
- The "Unassigned" row carries **3** assets — two `in-stock` and the
  never-held `lost` one. A `lost` asset that has never been held is
  "Unassigned", because that designation is reserved for never-held assets.
- The "Unassigned" row's chips are therefore **`[In stock 2] [Lost 1]`**, and
  they sum to the row's **3**.

> **The Unassigned row's chip set is not always `in-stock` alone.** The
> wireframes state that the row carries a single `in-stock` chip, and give
> the reason that "every bucket other than `in-stock` requires a prior holder
> to reach". That reason does not hold in this release: `in-stock → lost` is a
> released edge, so an asset that was registered and never handed to anybody
> can be marked lost, and it then has neither a current holder nor a
> preserved previous holder. The requirements are explicit — FR3.5's pass/fail
> says that after such a mark-lost "both holder fields are null and the asset
> falls in the 'Unassigned' row", and FR5.1 attributes an asset with neither
> holder to no holder at all. The Unassigned row's chips therefore break down
> by the bucket of the never-held assets it holds, and on this seed that
> includes a `lost` chip.
- The CSV export for the unfiltered list produces **8** data rows.

Criteria that assert a reconciliation cite this seed by name rather than
"a seeded dataset".

**Group map**

| Group | Area | Persona focus |
|---|---|---|
| US0 | The foundation — the schema rebuild and the historical backfill | None — a release-gating workstream, not a persona's work |
| US1 | Registration and serial/key uniqueness | Priya |
| US2 | Custody — assignment and return | Priya |
| US3 | Lifecycle families, reasons, and recovery | Priya |
| US4 | Audit history and its display | Priya + Marcus |
| US5 | Inventory reporting — counting definition, holder definition, dashboard, directory, list, CSV | Marcus + Priya |
| US6 | Editing and duplicate detection | Priya |
| US7 | Actor attribution, the write path, and accessibility across all surfaces | Both |

---

## US0 — The foundation: the schema rebuild and the historical backfill

### US0.1 — The custody history survives the release's own migration

The foundation workstream. This story records the outcome the release
depends on; it is not written in a persona's voice, because no persona
performs it.

**Priority**: Must Have

**Note**: this is the foundation workstream the scope document records as
**GROUP 1** — indivisible, and a hard predecessor of every other capability.
It is a release-gating workstream rather than a user-facing feature, and it
is written here in story form because its acceptance criteria are what the
release's own testing posture makes test-first: *"the table rebuild is
written test-first because its defect is silent history loss with the
transaction committed."* The failure this story exists to prevent is silent —
a migration that drops the asset table first fires the audit table's
`ON DELETE CASCADE`, destroys every audit row, and commits the transaction
with no error raised.

**Acceptance criteria**

- **AC0.1.1** — Given a database carrying N rows in `audit_log` and M rows in
  `assets`, when the foundation migration runs, then N audit rows and M asset
  rows are still present afterwards, with their content intact.
- **AC0.1.2** — Given the foundation migration runs, then its statements are
  ordered so that `audit_log` is rebuilt **first and without its foreign-key
  clause**, then `assets` is rebuilt, and only then is the foreign key
  re-added — the reverse order destroys every audit row silently with the
  transaction committed and no error raised.
- **AC0.1.3** — Given the foundation migration runs against a connection whose
  `foreign_keys` pragma is off, then the migration sets the pragma itself for
  its own window and leaves it consistent afterwards — the database's
  foreign-key check reports no violations after the migration.
- **AC0.1.4** — Given the foundation migration runs, then the rebuilt `assets`
  table carries a `status` check admitting all five buckets — `in-stock`,
  `assigned`, `returned`, `lost`, `discarded` — and carries a
  `last_assigned_to` column.
- **AC0.1.5** — Given the foundation migration runs, then the rebuilt
  `audit_log` table carries an `actor` column and **no** `ON DELETE CASCADE`
  clause.
- **AC0.1.6** — Given the foundation migration runs, then an `UPDATE` and a
  `DELETE` against `audit_log` are both refused by the database itself, and
  the refusal carries a machine-readable error code distinguishable from a
  validation error and from an internal error.
- **AC0.1.7** — Given the foundation migration runs, then the indexes the
  rebuilt tables lost are re-issued by the migration itself — the base schema
  file is applied as migration v1 only and cannot be relied on to restore
  them.
- **AC0.1.8** — Given a pre-existing audit row that predates the release,
  when the foundation migration runs, then the row is given the `system` actor
  **in place**, its original content and traceability preserved.
- **AC0.1.9** — Given the backfill runs a second time, then the state is
  identical to running it once.
- **AC0.1.10** — Given any backfill row cannot be given the `system` actor
  while preserving its original content and traceability, then the row is
  counted as a failure and reported with its identifier and reason, and the
  migration **fails and rolls its backfill transaction back** rather than
  proceeding with a partial backfill — a failed row is never silently
  skipped, deleted, overwritten or partially modified.
- **AC0.1.11** — Given the `system` actor is written by the backfill, then it
  resolves to a stable, displayable identity distinct from any person's, and
  it is the only actor that may appear without a human behind it.

**Depends on**: the actor-identity mechanism decision (open items I-01 /
I-03), which the scope document records as a blocking dependency of the
foundation workstream. The *rule* that the actor comes from trusted
server-side context is fixed and is not reopened; only the mechanism is
undecided, and it is a Domain Design decision.

**INVEST**: *Independent* — a migration is not a sequence of stories.
*Negotiable* — the migration mechanism is not prescribed beyond the ordering
and the pragma control, both of which are binding. *Valuable* — the release's
history guarantee is worthless on a schema that can destroy it. *Estimable* —
one migration and one backfill. *Small* — one indivisible workstream.
*Testable* — each criterion is a database assertion, and the criteria that
carry the silent-loss failure mode are written test-first.

---

## US1 — Asset registration and serial/key uniqueness

### US1.1 — Register a new asset

> As an **asset administrator**, I want to register a new asset with its
> category, name, serial or licence key, and optional model and notes, so that
> the organisation has a single accurate record of it from the day it arrives.

**Priority**: Must Have

**Acceptance criteria**

- **AC1.1.1** — Given the registration form is open, when I submit a valid
  category (`hardware` or `software-license`), a non-empty name and a
  non-empty serial or key, with or without model and notes, then exactly one
  asset row and exactly one `create` audit entry exist.
- **AC1.1.2** — Given I submit a category other than `hardware` or
  `software-license`, then the registration is refused with the validation
  error code and no asset row is written.
- **AC1.1.3** — Given a registration whose name is empty, or whose serial or
  key is empty, or whose name or serial or key is only whitespace, then the
  registration is refused with the validation error code and no asset row and
  no audit entry is written.
- **AC1.1.4** — Given a registration succeeds, then the persisted status is
  `in-stock` and the current holder is null — the asset is not assigned to
  anybody at registration.
- **AC1.1.5** — Given a registration succeeds, then the `create` audit entry's
  description names the asset's name, its category, and the serial or key it
  was registered under.
- **AC1.1.6** — Given a registration succeeds, then the asset list shows the
  new asset and its count line reflects it, and the asset's detail screen
  shows the status chip `In stock` and a `create` history entry at the top of
  the history.
- **AC1.1.7** — Given a registration succeeds, then the audit entry carries
  an actor resolved from the server's trusted context.

**Depends on**: US7.1 (actor attribution), US0.1 (the foundation migration)

**INVEST**: *Independent* — needs no other story complete. *Negotiable* — the
outcome is a recorded asset, not a particular form. *Valuable* — the asset
becomes trackable. *Estimable* — one form and one write. *Small* — one screen,
one write. *Testable* — each criterion has a countable result.

---

### US1.2 — One definition of a serial or licence key

> As an **asset administrator**, I want a serial or licence key to be unique
> within its category, so that I cannot register two records for the same
> physical device by typing it slightly differently.

**Priority**: Must Have

**Acceptance criteria**

- **AC1.2.1** — Given a hardware asset with serial `AbC` exists, when I
  register a second hardware asset with serial `abc`, then the second
  registration is refused as a duplicate-serial failure — the comparison trims
  leading and trailing whitespace and folds case.
- **AC1.2.2** — Given the same string exists in `hardware`, when I register a
  `software-license` asset with that string, then the registration succeeds —
  uniqueness is scoped to the category.
- **AC1.2.3** — Given a registration with serial `AbC` succeeds, then the
  stored and displayed serial preserves my original casing and spacing, even
  though the comparison folded them.
- **AC1.2.4** — Given the uniqueness check runs, then the same comparison
  definition produces both the functional unique index's expression and the
  application-level predicate — there is one definition in the system, not two
  that happen to agree. *(The single-source delivery rule is a Domain Design
  requirement and is verified by inspection, not by a product criterion.)*

**Depends on**: US0.1 (the functional unique index is created by the
foundation migration)

**INVEST**: *Independent* — one predicate. *Negotiable* — the comparison's
mechanism is not prescribed beyond its result. *Valuable* — the inventory
stays trustworthy. *Estimable* — one definition. *Small* — one rule.
*Testable* — each criterion names a determinate outcome.

---

### US1.3 — The database refuses the same collision

> As an **asset administrator**, I want the database to refuse a duplicate
> serial even when my own check misses it, so that the uniqueness rule cannot
> be bypassed by a race.

**Priority**: Must Have

**Acceptance criteria**

- **AC1.3.1** — Given the application's own uniqueness check finds no
  collision, when the database's unique index still refuses the write, then the
  refusal surfaces the same duplicate-serial error code as the application's
  check would have — the two tiers are indistinguishable to me.
- **AC1.3.2** — Given the database refuses the write, then the refusal is
  reported on the error's machine-readable code rather than on its message
  text, and the code is the same duplicate-serial code the application's own
  check raises. *(The NFR6.6 discipline — no new test matches on error
  message prose — is a test-suite rule and is verified by inspection of the
  suite, not by a product criterion.)*

**Depends on**: US1.2, US0.1

**INVEST**: *Independent* — one arbiter. *Negotiable* — the detection
technique is not prescribed. *Valuable* — the rule cannot be raced past.
*Estimable* — one index. *Small* — one rule. *Testable* — each criterion
names an error code and an indistinguishability property.

---

### US1.4 — Two concurrent registrations cannot both succeed

> As an **asset administrator**, I want two people registering the same serial
> at the same time to produce one asset and one clear rejection, so that the
> uniqueness rule holds under contention.

**Priority**: Must Have

**Acceptance criteria**

- **AC1.4.1** — Given two concurrent registrations of the same normalised
  serial in the same category, then exactly one asset row and one rejection
  result — the database's index decides which writer succeeds, and the
  rejection names the collision rather than reporting a generic failure.
- **AC1.4.2** — Given the uniqueness check runs, then a concurrent writer
  waits for the lock rather than failing immediately, and the wait is bounded
  by a busy timeout that the application **sets explicitly** rather than
  inheriting from the driver's default. *(The lock is taken for the duration
  of the check, so that two concurrent registrations of the same serial cannot
  both succeed — asserted by AC1.4.1.)*
- **AC1.4.3** — Given a concurrent writer cannot obtain the lock within the
  timeout, then it receives the retryable busy error code, which is
  distinguishable from the duplicate-serial code and from a generic internal
  error by its code alone.
- **AC1.4.4** — Given a write is refused because the database was busy, then
  the administrator is not shown a failure for a transient condition — the
  operation is retried, and because the application renders no loading state,
  the write simply takes an indeterminate moment and then succeeds.

**Depends on**: US1.3, US0.1

**INVEST**: *Independent* — one concurrency guarantee. *Negotiable* — the
locking mechanism is not prescribed beyond its outcome. *Valuable* — the rule
survives two people at once. *Estimable* — one transaction boundary.
*Small* — one rule. *Testable* — each criterion names a count, a code or a
user-visible outcome.

**Note**: US1.4 AC1.4.2 names an explicit `busy_timeout` setting because the
codebase today inherits the driver's default rather than making a decision, so
a criterion that only required "a non-zero `busy_timeout`" would pass against
code that changes nothing. The observable consequence — a concurrent writer
waits rather than failing immediately — is asserted separately.

---

## US2 — Custody: assignment and return

### US2.1 — Assign an asset to a colleague

> As an **asset administrator**, I want to record that an asset is now held by
> a named colleague, so that the next person who asks knows where it is.

**Priority**: Must Have

**Acceptance criteria**

- **AC2.1.1** — Given an asset in `in-stock`, when I assign it, then the
  status becomes `assigned`, the current holder is set to the assignee, the
  assignment timestamp is set to the transition time, and the return timestamp
  is null.
- **AC2.1.2** — Given an asset in `returned`, when I assign it, then the same
  fields are set — a returned asset can be handed out again.
- **AC2.1.3** — Given an assignment succeeds, then exactly one `assign` audit
  entry is appended and its description names the assignee.
- **AC2.1.4** — Given an asset in any other status — `assigned`, `lost` or
  `discarded` — when I attempt to assign it, then the attempt is refused with
  the invalid-transition error code and no audit entry is appended.
- **AC2.1.5** — Given an assignment succeeds, then the detail screen shows the
  status chip `Assigned`, the `Holder` field naming the assignee, and a new
  `assign` history entry at the top of the history.
- **AC2.1.6** — Given an assignment succeeds, then the audit entry carries an
  actor resolved from the server's trusted context.

**Depends on**: US7.1, US0.1

**Note**: US2.1 and US2.2 specify behaviour the POC already implements. They
are stated here because the release changes what *surrounds* them — the asset
write becomes one transaction with its audit append (AC7.1.6), the audit
entry carries an actor (US7.1), and the assignment write gains the
`last_assigned_to` preservation (US0.1). The field effects below are
preserved POC behaviour, not new work.

**INVEST**: *Independent* — one edge, no dependency on other stories.
*Negotiable* — the outcome is a recorded assignment. *Valuable* — custody is
knowable. *Estimable* — one field set and one write. *Small* — one action.
*Testable* — each criterion is a field assertion.

---

### US2.2 — Take an asset back

> As an **asset administrator**, I want to record that a colleague has returned
> an asset, so that the asset is available again without losing the record of
> who had it.

**Priority**: Must Have

**Acceptance criteria**

- **AC2.2.1** — Given an asset in `assigned`, when it is returned, then the
  status becomes `returned`, the current holder is cleared, the return
  timestamp is set to the transition time, and the assignment timestamp still
  holds its previous value.
- **AC2.2.2** — Given a return succeeds, then exactly one `return` audit entry
  is appended and its description names the returning holder.
- **AC2.2.3** — Given an asset in any other status, when a return is
  attempted, then the attempt is refused with the invalid-transition error
  code and no audit entry is appended.
- **AC2.2.4** — Given a return succeeds, then the audit entry carries an
  actor resolved from the server's trusted context.
- **AC2.2.5** — Given a return succeeds, then the detail screen shows the
  status chip `Returned`, an empty `Holder` field, a `Last holder` field
  naming the returning holder, and a new `return` history entry at the top of
  the history.

**Depends on**: US7.1, US0.1

**INVEST**: *Independent* — one edge. *Negotiable* — the outcome is a recorded
return. *Valuable* — the asset is available again. *Estimable* — one field set.
*Small* — one action. *Testable* — each criterion is a field assertion.

---

## US3 — Lifecycle families, reasons, and recovery

### US3.1 — The asset lifecycle's legal transitions

> As an **asset administrator**, I want the application to permit exactly the
> approved set of status changes, so that the record never shows a state
> combination nobody authorised.

**Priority**: Must Have

**Acceptance criteria**

- **AC3.1.1** — Given each of the eight released edges — `in-stock` →
  `assigned`, `in-stock` → `lost`, `assigned` → `returned`, `assigned` →
  `lost`, `assigned` → `discarded`, `returned` → `assigned`, `returned` →
  `lost`, and `lost` → `in-stock` — when the transition is attempted from its
  stated origin status, then it succeeds.
- **AC3.1.2** — Given each of the eight released edges, when the transition
  is attempted from each of the four other statuses, then it is refused with
  the invalid-transition error code and no audit entry is appended. *(A
  refusal from a status that the two deferred edges name — `in-stock` or
  `returned` to `discarded` — is a release-boundary refusal, not a statement
  that the edge is withdrawn. See US8.4 and US8.5.)*
- **AC3.1.3** — Given a transition that is not one of the eight released
  edges, when it is attempted, then it is refused with the invalid-transition
  error code and no audit entry is appended. *(The two approved-but-deferred
  edges are refused in this release for this reason and not because the edge
  is withdrawn; a test asserting their refusal states the release boundary,
  not the design.)*
- **AC3.1.4** — Given every asset row, then it carries exactly one status
  drawn from the five exclusive buckets `in-stock`, `assigned`, `returned`,
  `lost` and `discarded` — the buckets are mutually exclusive and their union
  is the set of all asset rows.
- **AC3.1.5** — Given a legal transition succeeds, then exactly one audit
  entry is appended naming the action and the transition.
- **AC3.1.6** — Given any legal transition succeeds, then the audit entry
  carries an actor resolved from the server's trusted context.
- **AC3.1.7** — Given an asset's current status, then the detail screen's
  action controls are exactly those released edges whose origin is that
  status — the screen offers no control for an edge whose origin is a
  different status, and a `discarded` asset offers no lifecycle control at
  all.
- **AC3.1.8** — Given the status of an asset is displayed on any surface, then
  it is displayed with the shared display label for that status — `In stock`,
  `Assigned`, `Returned`, `Lost`, `Discarded` — and never with the stored
  value `in-stock`, `assigned`, `returned`, `lost` or `discarded`. The same
  mapping is used by the asset list's status chips, the asset list's status
  filter options, the detail screen's status chip, and the directory's
  per-holder chips.
- **AC3.1.9** — Given a transition is refused because the asset is no longer
  in a status that allows it, then the detail screen is re-rendered with the
  asset's current status and the action controls that status allows, and the
  refusal is stated in words on the screen — no error code is displayed to the
  user.

**Depends on**: US7.1, US0.1

**INVEST**: *Independent* — a table of edges, not a sequence of work.
*Negotiable* — how the table is stored is not prescribed. *Valuable* — the
record stays coherent. *Estimable* — eight edges. *Small* — one table.
*Testable* — every criterion is an exhaustive enumeration.

---

### US3.2 — Record the loss of an asset

> As an **asset administrator**, I want to record that an asset has been lost,
> with the reason, so that the loss is accounted for and the person who last
> held it stays visible.

**Priority**: Must Have

**Acceptance criteria**

- **AC3.2.1** — Given an asset in `in-stock`, `assigned` or `returned`, when
  I mark it lost with a reason drawn from the shared loss-reason vocabulary,
  then the status becomes `lost` and exactly one `mark-lost` audit entry is
  appended naming the loss and its reason **and the prior holder where one
  applies** — that is, the entry names the holder from `assigned`, the
  preserved previous holder from `returned`, and no holder at all from
  `in-stock`, because a never-held asset has no prior holder to name.
- **AC3.2.2** — Given a mark-lost is submitted without a reason, from any of
  the three origins, then it is refused with no status change, no holder
  change and no audit entry.
- **AC3.2.3** — Given the asset's current holder was set and its preserved
  previous-holder field was empty, when the asset is marked lost, then the
  current holder is cleared and the preserved previous-holder field now names
  the departing holder — and the asset is counted in the directory under that
  holder.
- **AC3.2.4** — Given an asset that has never been held by anybody, when it
  is marked lost, then both holder fields are null and the asset falls in the
  "Unassigned" row.
- **AC3.2.5** — Given an asset that has been held before, when it is marked
  lost, then the preserved previous-holder field still names the last holder.
- **AC3.2.6** — Given a loss from `in-stock`, from `assigned` and from
  `returned`, then each appends exactly one `mark-lost` entry and no action
  specific to the origin — the three edges share one action.
- **AC3.2.7** — Given a mark-lost succeeds, then the detail screen shows the
  status chip `Lost`, an empty `Holder` field, a `Last holder` field naming
  the prior holder where one applies, and a new `mark-lost` history entry at
  the top of the history.

**Depends on**: US3.1, US3.3 (the reason vocabulary), US7.1

**INVEST**: *Independent* — the loss family stands without the other
families. *Negotiable* — the outcome is an accounted-for loss. *Valuable* —
losses stop being invisible. *Estimable* — three edges, one action.
*Small* — one action. *Testable* — each criterion names a field or an entry.

---

### US3.3 — The shared reason vocabulary

> As an **asset administrator**, I want the reasons I can give for a loss, a
> recovery or a retirement to come from one shared list, so that the same
> reason always means the same thing wherever it appears.

**Priority**: Must Have

**Acceptance criteria**

- **AC3.3.1** — Given the loss-reason vocabulary, then it is a single list, and
  the reasons offered for a loss and the reasons offered for a recovery are
  that same list — a reason offered in one surface and absent from the other
  is a failure.
- **AC3.3.2** — Given a retirement, then its reasons are drawn from the
  shared loss-reason vocabulary plus the retirement-specific values.
- **AC3.3.3** — Given a reason is required by one of the three transitions
  that require one, when it is not supplied, then the transition is refused
  with no status change and no audit entry.
- **AC3.3.4** — Given the vocabulary is offered for selection on a screen or
  in a dialog, then the options offered are exactly the vocabulary's values,
  and no reason outside the vocabulary is offered. *(The single-source
  delivery rule — the vocabulary is supplied to the template as render data
  rather than copied into it — is a Domain Design requirement and is verified
  by inspection, not by a product criterion.)*

**Depends on**: none. This story is a vocabulary — data, not behaviour — so
it depends on nothing and is consumed by US3.2, US3.4 and US3.5.

**INVEST**: *Independent* — a vocabulary, not a behaviour. *Negotiable* — the
list's contents are a content decision. *Valuable* — reasons stay comparable.
*Estimable* — one list. *Small* — one constant. *Testable* — every criterion
is an enumeration or a refusal.

---

### US3.4 — Retire an asset and resolve its assignment

> As an **asset administrator**, I want to retire an asset with a reason, so
> that it leaves the active inventory while the record of who held it and why
> it was retired stays intact.

**Priority**: Must Have

**Acceptance criteria**

- **AC3.4.1** — Given an asset in `assigned`, when it is discarded with a
  reason, then the status becomes `discarded`, the current holder is cleared,
  and the preserved previous-holder field names the holder at discard time.
- **AC3.4.2** — Given a discard succeeds, then exactly one `discarded` audit
  entry is appended whose description contains the discard, the prior holder,
  and the fact that the assignment was resolved by the discard.
- **AC3.4.3** — Given a discard is submitted without a reason, then it is
  refused with no status change and no audit entry.
- **AC3.4.4** — Given a discarded asset, then it appears in the `discarded`
  bucket count and in the total record count, and does not appear in the
  active inventory count.
- **AC3.4.5** — Given a discard succeeds, then the audit entry carries an
  actor resolved from the server's trusted context.
- **AC3.4.6** — Given an asset in any status other than `assigned`, when a
  discard is attempted, then it is refused with the invalid-transition error
  code and no audit entry is appended.
- **AC3.4.7** — Given a discarded asset, then its detail URL returns the asset
  and its full history, unchanged.
- **AC3.4.8** — Given a discard succeeds, then the detail screen shows the
  status chip `Discarded`, an empty `Holder` field, a `Last holder` field
  naming the holder at discard time, and a note stating that the asset is no
  longer part of Active Inventory while its record and its history are kept.

**Depends on**: US3.1, US3.3 (the reason vocabulary), US7.1, US0.1

**INVEST**: *Independent* — the retirement family stands alone.
*Negotiable* — the outcome is an accounted retirement. *Valuable* — the
inventory stops counting dead assets as live. *Estimable* — one edge.
*Small* — one action. *Testable* — each criterion names a field or an entry.

---

### US3.5 — Recover a lost asset

> As an **asset administrator**, I want to record that a lost asset has been
> found and put back into stock, so that the loss is closed with a reason
> rather than left open.

**Priority**: Must Have

**Acceptance criteria**

- **AC3.5.1** — Given an asset in `lost`, when it is recovered with a reason
  drawn from the shared loss-reason vocabulary, then the status becomes
  `in-stock`.
- **AC3.5.2** — Given a recovery succeeds, then exactly one audit entry is
  appended whose action is `recovered` — it is neither `assign` nor `return` —
  and whose description names the recovery and the prior holder.
- **AC3.5.3** — Given a recovery is submitted without a reason, then it is
  refused with no status change and no audit entry.
- **AC3.5.4** — Given an asset in any status other than `lost`, when a
  recovery is attempted, then it is refused with the invalid-transition error
  code and no audit entry is appended.
- **AC3.5.5** — Given a recovery succeeds, then the audit entry carries an
  actor resolved from the server's trusted context.
- **AC3.5.6** — Given a recovery succeeds, then the detail screen shows the
  status chip `In stock`, a `Last holder` field that still names the prior
  holder, and a new `recovered` history entry at the top of the history.

**Depends on**: US3.1, US3.3 (the reason vocabulary), US7.1

**INVEST**: *Independent* — the recovery family stands alone. *Negotiable* —
the outcome is a closed loss. *Valuable* — found assets return to service.
*Estimable* — one edge. *Small* — one action. *Testable* — each criterion
names a status or an entry.

---

### US3.6 — The audit action vocabulary

> As an **asset administrator**, I want each kind of action to leave exactly
> one clearly-named history entry, so that reading the history tells me what
> happened without interpretation.

**Priority**: Must Have

**Acceptance criteria**

- **AC3.6.1** — Given the audit action vocabulary, when it is read, then it
  contains exactly `create`, `assign`, `return`, `mark-lost`, `recovered`,
  `discarded` and `edit`, and no other value.
- **AC3.6.2** — Given the four pre-existing action values, then none of them
  is renamed.
- **AC3.6.3** — Given the vocabulary exists, then it exists **once** in the
  system, in the shared domain vocabulary, and every write path and every
  audit-description builder reads it from there — no write path hard-codes an
  action string. *(The single-source delivery rule is a Domain Design
  requirement and is verified by inspection, not by a product criterion.)*
- **AC3.6.4** — Given an audit entry is written, then its description is
  non-empty and names at least one specific of its event beyond the action
  name — an entry whose description equals its action alone is a failure. The
  specifics each entry must name are carried by the criterion of the story
  that owns the behaviour: AC1.1.5 for `create`, AC2.1.3 for `assign`,
  AC2.2.2 for `return`, AC3.2.1 for `mark-lost`, AC3.5.2 for `recovered`,
  AC3.4.2 for `discarded` and AC6.1.5 for `edit`.

**Depends on**: none. This story is a vocabulary — data, not behaviour — so
it depends on nothing and is consumed by every write story.

**INVEST**: *Independent* — a vocabulary, not a behaviour. *Negotiable* — the
entries' wording is not prescribed beyond naming the specifics.
*Valuable* — the history reads itself. *Estimable* — seven values.
*Small* — one constant. *Testable* — every criterion is an enumeration.

---

### US3.7 — The reason dialog explains the transition before it asks

> As an **asset administrator**, I want the dialog that asks for a reason to
> tell me what the transition will do before I give the reason, so that the
> reason I record is attached to the right event.

**Priority**: Must Have

**Acceptance criteria**

- **AC3.7.1** — Given a transition that requires a reason, then it opens a
  dialog whose heading names the transition and the asset, and whose body
  states the consequence of the transition before the reason control.
- **AC3.7.2** — Given the asset's current status, then the consequence
  sentence is rendered from that status: a loss from `assigned` states that
  the assignment ends and that the holder is kept as the last holder; a loss
  from `in-stock` states that the asset has never been assigned and that
  there is no holder to keep; and a loss from `returned` states that the
  assignment has already ended and that the previous holder is kept as the
  last holder.
- **AC3.7.3** — Given the discard dialog, then its consequence states that
  the assignment is resolved — the holder cleared and kept as the last holder
  — and that the asset leaves Active Inventory while its row and full history
  are kept and remain reachable.
- **AC3.7.4** — Given the recovery dialog, then its consequence states that
  the asset returns to stock and that the recovery is recorded as its own
  event naming the prior holder, and the dialog offers no holder field.
- **AC3.7.5** — Given the reason control, then it is a single-choice control
  populated from the shared vocabulary, showing a placeholder until a reason
  is chosen.
- **AC3.7.6** — Given the dialog is open, then the submit control is enabled
  and submitting with no reason chosen shows `A reason is required.` beneath
  the reason control, moves focus to it, and writes nothing — no status
  change, no holder change and no history entry.
- **AC3.7.7** — Given the dialog is open, then `Escape`, the cancel control
  and the close control each dismiss it without acting, and focus returns to
  the control that opened it.
- **AC3.7.8** — Given the dialog is open, then the focus order stays inside
  it and the consequence sentence is read before the reason control.
- **AC3.7.9** — Given the submit control, then it is labelled with the
  transition's own verb — `Mark lost`, `Discard asset`, `Recover asset` —
  and never with a generic `Confirm`.

**Depends on**: US3.3 (the reason vocabulary), US3.1

**INVEST**: *Independent* — one dialog contract. *Negotiable* — the wording of
the consequence sentence is not prescribed, only what it must state.
*Valuable* — the reason is attached to the right event. *Estimable* — one
dialog with three variants. *Small* — one interaction. *Testable* — each
criterion names a rendered element or a dismissal behaviour.

---

## US4 — Audit history and its display

### US4.1 — Read an asset's complete history

> As an **asset owner or requester**, I want to see everything that has
> happened to an asset in one place, so that I can answer "what happened to
> it?" without asking anyone.

**Priority**: Must Have

**Acceptance criteria**

- **AC4.1.1** — Given an asset with four writes in its history, when I open
  its detail screen, then I see four history entries, newest first.
- **AC4.1.2** — Given the history is rendered, then every entry shows an
  actor.
- **AC4.1.3** — Given an entry attributed to the `system` actor, then it is
  rendered with a marker distinguishable from an entry attributed to a person.
- **AC4.1.4** — Given an asset with four writes, then all four entries are
  shown — the history is not replaced by a single latest entry.
- **AC4.1.5** — Given the history list, then it is a semantic ordered list,
  each entry is reachable and readable in order by keyboard, and its order is
  conveyed to assistive technology.
- **AC4.1.6** — Given an entry attributed to the `system` actor, then the
  marker distinguishing it from a person-attributed entry is carried by text
  or by a non-colour cue, and not by colour alone.
- **AC4.1.7** — Given the release, then **no released screen lists audit
  entries across assets** and the release adds no screen whose subject is the
  audit log itself — the audit entry is read only in the context of the
  asset it belongs to. The release therefore withdraws the POC's deferral of
  a system-wide audit log in neither direction: it neither adds that screen
  nor removes the deferral's standing.

**Depends on**: US3.6, US0.1

**INVEST**: *Independent* — the read path stands without further work.
*Negotiable* — the rendering is not prescribed. *Valuable* — history becomes
answerable. *Estimable* — one screen section. *Small* — one read surface.
*Testable* — each criterion names a count or a property.

---

### US4.2 — The record of an asset cannot be rewritten

> As an **asset owner or requester**, I want the history to be impossible to
> edit or delete, so that I can rely on what it says.

**Priority**: Must Have

**Acceptance criteria**

- **AC4.2.1** — Given an asset with a history, when an `UPDATE` is attempted
  against the audit table, then the database refuses it.
- **AC4.2.2** — Given an asset with a history, when a `DELETE` is attempted
  against the audit table, then the database refuses it.
- **AC4.2.3** — Given an asset with a history, when a `DELETE` is attempted
  against the asset row, then no audit row is removed.
- **AC4.2.4** — Given an attempt to delete an asset row outright, then the
  asset row and all its audit entries remain intact and the refusal carries a
  clear, machine-readable error code that is distinguishable from a
  validation error and from an internal error.
- **AC4.2.5** — Given a sequence of writes to one asset, then the number of
  audit entries equals the number of writes, each entry carries a non-empty
  actor, and the pre-existing entries are unchanged.

**Depends on**: US4.1, US7.1

**INVEST**: *Independent* — a constraint on storage. *Negotiable* — the
mechanism is not prescribed. *Valuable* — the history is trustworthy.
*Estimable* — one constraint. *Small* — one rule set. *Testable* — each
criterion is a database assertion.

---

### US4.3 — An edit is recorded as a history entry

> As an **asset administrator**, I want an edit to leave a record naming what
> changed and what it was before, so that a correction is as traceable as an
> original entry.

**Priority**: Must Have

**Note**: the edit's *behaviour* is US6.1; this story owns the edit's
*audit behaviour* and the display of that entry. The two are not independent —
an edit that appends no entry has no entry to display — so US6.1 depends on
this story, never the other way round. The field effects are stated once, in
US6.1, and are not restated here.

**Acceptance criteria**

- **AC4.3.1** — Given an edit succeeds, then the history entry it appends is
  displayed in the asset's history, and it is presented as an `edit` entry
  alongside the entries the earlier writes produced.
- **AC4.3.2** — Given a save changes nothing, then the asset's history is
  unchanged — no entry is appended and the asset's update timestamp does not
  change.
- **AC4.3.3** — Given an edit succeeds, then the audit entry's action is
  `edit` and it carries an actor resolved from the server's trusted context.
- **AC4.3.4** — Given an edit succeeds, then the detail screen shows the new
  values, a new `edit` history entry at the top of the history, and an
  unchanged status chip — an edit changes no bucket.

**Depends on**: US6.1 (the edit path), US3.6, US7.1

**INVEST**: *Independent* — the edit's own audit behaviour.
*Negotiable* — the wording of the entry is not prescribed. *Valuable* —
corrections are traceable. *Estimable* — one entry. *Small* — one rule.
*Testable* — each criterion names a count or a field.

---

## US5 — Inventory reporting: one counting definition

### US5.1 — Every count comes from one shared definition

> As an **asset owner or requester**, I want every number the application
> shows me to come from the same definition, so that I can trust any figure I
> read without cross-checking it against another screen.

**Priority**: Must Have

**Acceptance criteria**

- **AC5.1.1** — Given the dashboard, the assignee directory, the asset list
  and the CSV export, then all four compute their counts from one shared
  filtering and counting definition, and for the same filter they report the
  same count.
- **AC5.1.2** — Given the shared definition distinguishes active inventory
  from total records, then with one discarded asset and no others the total
  count is one greater than the active inventory count, and the difference is
  exactly the discarded count.
- **AC5.1.3** — Given the reconciliation seed, then the sum of the five
  bucket counts equals the total record count — 2 + 2 + 1 + 2 + 1 = 8 — and
  the same property holds for any dataset.
- **AC5.1.4** — Given the asset list, then it reports both how many records
  are being shown and how many records match the applied filter, and the
  shown figure never exceeds the matching figure.
- **AC5.1.5** — Given the assignee directory's count line, then it counts
  distinct display holders excluding the "Unassigned" row, and the directory
  renders one row per display holder plus the "Unassigned" row — so the
  rendered row count is one greater than that figure. Against the
  reconciliation seed the count line reads 2 and the directory renders 3 rows.
- **AC5.1.6** — Given any holder row, then the sum of its per-bucket chips
  equals that row's total, and the chips break down by the bucket of the
  assets whose display holder is that holder. Against the reconciliation seed,
  Dana Reyes's row carries 4 assets and Chris Patel's row carries 1, and the
  "Unassigned" row's chips read `[In stock 2] [Lost 1]` and sum to its 3. A
  row's chip set is never restricted to `in-stock`, because a never-held
  asset can reach any bucket the release permits a never-held asset to
  reach — `in-stock → lost` is one such edge.
- **AC5.1.7** — Given any of the four count-consuming surfaces, then its
  counts are produced by calling the shared counting function — no surface
  computes a count by any other route. The four surfaces are delivered
  together as one indivisible group; the delivery constraint is stated in
  *Story Relationships* below, and the property that makes it necessary is
  asserted here.
- **AC5.1.8** — Given the counting path, then it returns an aggregate rather
  than the asset rows, and the number of rows the counting query returns is
  the same for a dataset of ten assets as for a dataset of a thousand.
  *(The application-side memory profile of the counting path is NFR5.2's
  second half and is verified by inspection; the returned-row-count property
  is the observable half and is asserted here.)*
- **AC5.1.9** — Given any surface that shows a holder, then it shows the
  current holder and the preserved last holder as two separate values, and
  neither falls back to the other's value: a lost asset shows an empty current
  holder and a populated last holder, and a currently-held asset shows a
  populated current holder and an empty last holder. The asset list's two
  holder columns, the detail screen's two holder fields, the directory's
  expansion rows and the CSV export's two holder columns follow this one rule.
- **AC5.1.10** — Given the reconciliation seed, then every figure the four
  surfaces report for the unfiltered list matches the seed's stated counts —
  Total Records 8, Active Inventory 7, bucket counts 2 / 2 / 1 / 2 / 1, assets
  available to assign 2, directory holders 2 and rendered rows 3, and 8 CSV
  data rows.

**Depends on**: none. This story owns the shared definition; US5.2, US5.3,
US5.4 and US5.5 depend on it.

**INVEST**: *Independent* — a definition, not a screen. *Negotiable* — the
implementation is not prescribed. *Valuable* — every figure is comparable.
*Estimable* — one definition. *Small* — one rule. *Testable* — each criterion
is a reconciliation check.

---

### US5.2 — Reconcile the inventory at a glance

> As an **asset owner or requester**, I want a dashboard showing how many
> assets are in each state and which need attention, so that I know the
> organisation's assets are accounted for without running a report myself.

**Priority**: Must Have

**Acceptance criteria**

- **AC5.2.1** — Given the dashboard, then it renders the active inventory,
  the total record count, the count of assets available to assign, and the
  five bucket counts.
- **AC5.2.2** — Given the dashboard's attention panel, then it carries two
  separate items — one equal to the `lost` bucket count and one equal to the
  `discarded` bucket count — and neither item is qualified by a time window
  or by a partial-bucket filter. A summed attention figure may appear in
  addition to the two, and if it does it equals their sum, but it does not
  replace them.
- **AC5.2.3** — Given the reconciliation seed, then the bucket tiles sum to the
  total record count — 2 + 2 + 1 + 2 + 1 = 8 — and the active inventory
  equals the sum of the buckets it covers — 7 — and the same two properties
  hold for any dataset.
- **AC5.2.4** — Given each figure on the dashboard, then it offers a direct
  path to the assets behind it — each bucket tile links to the asset list
  filtered to that bucket.

**Depends on**: US5.1, US0.1

**INVEST**: *Independent* — one screen, one definition. *Negotiable* — the
layout is not prescribed. *Valuable* — accountability at a glance.
*Estimable* — one screen. *Small* — one read surface. *Testable* — each
criterion names a figure or a link.

---

### US5.3 — See what a named holder has

> As an **asset owner or requester**, I want to look up a colleague by name
> and see what they hold, so that I can answer "what does Dana hold?" without
> asking Dana or the administrator.

**Priority**: Must Have

**Acceptance criteria**

- **AC5.3.1** — Given the assignee directory, then it renders one row per
  distinct display holder plus an "Unassigned" row for assets that have never
  been held by anyone.
- **AC5.3.2** — Given the directory, then the set of listed holders is derived
  from the assets' display holders — a name that appears on no asset does not
  appear as a row.
- **AC5.3.3** — Given each holder row, then it carries the holder's total and
  per-bucket chips, and the chips sum to the total.
- **AC5.3.4** — Given a holder row, then the row **as a whole** is the link
  element: activating the row — its name, its total, or its chips — navigates
  to the asset list filtered to that holder, and that filtered list is a
  filter state of the asset list, not a separate holder screen.
- **AC5.3.5** — Given the directory, then no route responds to a holder-detail
  URL, and each holder name carries **no account affordance** — no avatar, no
  personal profile link, no sign-in prompt, no `mailto:` — a holder name is a
  display name and the directory carries no person account. The name *is* the
  row's link to the filtered asset list (AC5.3.4), which is a navigation to
  assets and not an account link.
- **AC5.3.6** — Given the display-holder definition, then an asset with a
  current holder is attributed to that holder; an asset with no current holder
  but a preserved previous holder is attributed to its previous holder; and an
  asset with neither is attributed to no holder. The definition itself is
  owned by **US5.6**; this criterion asserts that the directory consumes it.
- **AC5.3.7** — Given a recovered asset and a discarded asset, then each
  appears under its preserved previous holder and neither appears under
  "Unassigned"; an asset that has never been assigned appears under
  "Unassigned".
- **AC5.3.8** — Given the directory's count line, then it says what it
  counts — it counts distinct display holders excluding the "Unassigned" row.
  The figure it reports is the count of the holders **currently listed on the
  screen**, so the count line and the rendered rows can never disagree: with
  no search applied the listed holders are every holder in the estate, and
  with a search applied the listed holders are the matching ones. The
  "Unassigned" row is excluded from the figure and is rendered as an
  additional row, so the rendered row count is one greater than the figure
  whenever that row is present.
- **AC5.3.9** — Given a holder row, then it expands in place to show the
  assets whose display holder is that holder, and the expansion reports its
  own expanded state programmatically rather than by appearance alone. The
  expansion is a disclosure within the directory row and is **separate from**
  the row's navigation (AC5.3.4): expanding a row reveals the assets inline
  and does not navigate, and following the row's link leaves the directory for
  the filtered asset list.
- **AC5.3.10** — Given an expanded holder row, then each asset in it shows
  whether the asset is currently held or last-held by that holder, and each
  asset links to its detail screen.
- **AC5.3.11** — Given a holder whose assets are all last-held, then the
  row's bucket chips show only the buckets those assets are actually in — no
  zero-count chip is shown for a bucket the holder has no asset in.
- **AC5.3.12** — Given the directory, then it carries a **`Search holders`**
  input, and activating it filters the directory's rows to the holders whose
  display-holder name matches the entered text. The search filters the
  **holder rows**, not the assets: a holder whose name does not match is
  removed from the directory even when that holder holds assets, and a
  matching holder's row — with its total, its chips and its expansion — is
  unaffected by the search. The count line reports the **searched**
  population (AC5.3.8): with a search applied it reads the number of
  matching holders, so it counts the rows on the screen rather than the
  holders in the estate.
- **AC5.3.13** — Given the `Search holders` search matches no holder, then
  the directory shows no holder row, and the **"Unassigned" row is also
  absent** — "Unassigned" is not a holder name and is not a search result.
  The count line reads **0** (AC5.3.8), and the rendered row count is
  therefore 0 as well, not 1. The row set is otherwise unchanged: the search
  never alters a holder's total or chip counts, and never alters which
  assets appear in an expansion.
- **AC5.3.14** — Given the `Search holders` search, then the matching rule is
  the POC's existing free-text pattern — case-insensitive substring matching
  over the holder name — applied to the holder list. The improved search
  form is a deferred increment, so the release does not add fuzzy matching,
  tokenisation or field-scoped search. The search is **a new control in this
  release**: the POC's directory screen does not have it.
- **AC5.3.15** — Given an estate with **no assets at all**, then the
  directory still renders the "Unassigned" row, and its count line reads
  **0** — because "Unassigned" is a row rather than a holder, the row count
  is one greater than the count line's figure, and the count line counts
  distinct display holders excluding it. The release builds no empty-estate
  message for the directory, so a directory over an empty estate renders a
  single row above a count of zero, and the reader is not told which of the
  two cases the count line describes. *(The designed empty-state treatment
  is deferred — US8.10.)*

**Depends on**: US5.1, US5.6 (the display-holder definition), US0.1

**INVEST**: *Independent* — one screen, one definition. *Negotiable* — the
layout is not prescribed. *Valuable* — custody is findable. *Estimable* — one
screen. *Small* — one read surface. *Testable* — each criterion names a row,
a chip sum or a link.

---

### US5.4 — Browse and filter the asset list

> As an **asset owner or requester**, I want to browse the assets and filter
> them, so that I can narrow to the ones I care about.

**Priority**: Must Have

**Acceptance criteria**

- **AC5.4.1** — Given the asset list, then it renders the assets matching the
  applied filter, and reports both the shown count and the matching count.
- **AC5.4.2** — Given a dataset at the confirmed medium scale — hundreds to
  low thousands of assets, with a distribution across all five buckets and a
  holder set large enough to exercise the directory's grouping — then the
  asset list renders the full dataset, and renders every matching row without
  truncation or an error, without degradation that would require pagination.
  *(The performance ceiling itself is not asserted here: NFR1.2's ceilings are
  unfixed (OQ5). The measured list retrieval and render time for this dataset
  is recorded against NFR1.1, and the acceptance check against NFR1.2 is
  performed only once the Product Owner approves the ceiling.)*
- **AC5.4.3** — Given the asset list, then it offers a CSV export of the
  assets matching its current filter, and that export is the subject of
  US5.5.
- **AC5.4.4** — Given the filter matches no assets, then the list shows the
  application's existing bare empty row — the release builds no empty-state
  message — and the count line's matching figure reports zero while its shown
  figure is also zero.
- **AC5.4.5** — Given the asset list, then it carries a **Reset** control
  alongside the existing Apply control, and activating it clears **every**
  filter dimension the form carries — search text, category, status, sort and
  direction — and returns the list to the unfiltered state, whose matching
  count equals the total record count. Reset is a **new control in this
  release**: the POC's filter form carries Apply but no Reset, and the
  wireframes add it because the screen now holds more filter state than one
  apply can make obvious.
- **AC5.4.6** — Given a filter has been applied and then Reset is activated,
  then the list is re-rendered from the cleared filter without requiring a
  second Apply, and the count line reports the cleared figures. Reset is
  therefore a single action that both clears and re-applies; it is not a
  second, separate submit step.
- **AC5.4.7** — Given the Reset control, then it is reachable and operable
  from the keyboard, and it carries an accessible name that identifies it as
  resetting the filters — a control named only by its position or by a
  glyph fails this criterion.
- **AC5.4.8** — Given the filter form, then it carries an **Apply** control,
  and activating it commits the values currently entered in the filter
  controls and re-renders the list against them. The form's filter
  dimensions are **search text, category, status, sort and direction** —
  the five the POC's filter form already carries — and the release adds no
  sixth. Apply is not a new control; it is the POC's existing button, and
  this criterion states its behaviour so that Reset (AC5.4.5) has something
  to be contrasted against.
- **AC5.4.9** — Given the **status** filter, then its option set offers a
  choice for **each of the five buckets** — `in-stock`, `assigned`,
  `returned`, `lost` and `discarded` — plus an "all statuses" option. A
  filter that omits the `discarded` option fails this criterion, because a
  discarded asset is a bucket of the estate and the filter must be able to
  select it; the `discarded` bucket is filtered by the same shared
  definition every other surface uses (US5.1). The release adds no filter
  dimension beyond these five.
- **AC5.4.10** — Given the **category** filter, then its option set offers
  `hardware` and `software-license` plus an "all categories" option — the
  same two categories the registration form accepts (AC1.1.1, AC1.1.2), so
  the filter and the form cannot disagree about what a category is. The
  category filter selects assets by their category; it does not affect the
  uniqueness scope, which is settled by the shared uniqueness definition
  (US1.2) and not by the filter.

**Depends on**: US5.1

**INVEST**: *Independent* — one screen. *Negotiable* — the filter controls'
visual treatment is not prescribed, but the Reset control's behaviour is
(AC5.4.5 – AC5.4.7), because a new control with no stated behaviour is not
implementable. *Valuable* — assets are browsable. *Estimable* — one screen.
*Small* — one read surface. *Testable* — each criterion names a count, a
ceiling, or a control's effect on the filter state.

---

### US5.5 — Export the asset list to a CSV file

> As an **asset owner or requester**, I want to export the filtered asset list
> as a spreadsheet I can open elsewhere, so that I can work with the inventory
> without the application.

**Priority**: Must Have

**Acceptance criteria**

- **AC5.5.1** — Given the asset list's current filter, then the export's row
  set equals the list's matching row set for that filter — both are computed
  from the shared definition US5.1 owns, so the equality holds without either
  surface depending on the other's implementation.
- **AC5.5.2** — Given the export, then it is served with the filename
  `assets-export.csv`, the content type `text/csv; charset=utf-8`, and UTF-8
  encoding.
- **AC5.5.3** — Given the export's header row, then it is exactly `Name,
  Category, Serial / Key, Status, Holder, Last holder` in that order, every
  data row carries exactly those six fields, and no seventh column is present.
  Notes and audit history are not exported.
- **AC5.5.4** — Given any dataset tested, including the representative
  upper-end dataset, then the exported row count equals the matching row count
  — the export never silently truncates its row set.
- **AC5.5.5** — Given the export's contents, then no cell carries a filter
  description, a comment or a metadata block.
- **AC5.5.6** — Given no rows match the filter, then the file contains the
  header row and no data rows.
- **AC5.5.7** — Given a string cell whose content begins with `=`, `+`, `-`,
  `@`, a tab or a carriage return, then it is prefixed with a single quote
  before quoting — the protection applies to every string cell rather than to
  a selected subset of columns.
- **AC5.5.8** — Given the export is validated against the representative
  upper-end dataset, then it produces the full row set (asserted by AC5.5.4)
  and the export generation time for that dataset is recorded against NFR1.1.
  *(The ceiling check is performed only once the Product Owner approves it
  under NFR1.2; OQ5 is open.)*
- **AC5.5.9** — Given the export response, then it carries a
  `Content-Disposition` header naming the file `assets-export.csv`, and it
  carries `X-Content-Type-Options: nosniff` — a CSV served without `nosniff`
  and without a correct `Content-Type` can be sniffed by the browser as HTML.
  *(The application-wide property — every response carries `nosniff` and no
  `X-Powered-By` — is asserted by US7.2's AC7.2.15, not here; this criterion
  covers only what is specific to the export response.)*

**Depends on**: US5.1, US5.4, US5.6

**INVEST**: *Independent* — one action, one file. *Negotiable* — the
generation mechanism is not prescribed. *Valuable* — the inventory leaves the
application. *Estimable* — one action. *Small* — one read surface.
*Testable* — each criterion names an exact header, a count or a prefix.

---

### US5.6 — One definition of a holder

> As an **asset owner or requester**, I want every surface that names a holder
> to mean the same thing by "holder", so that the directory and the asset's
> own record never disagree about who holds it.

**Priority**: Must Have

**Note**: this is one of the release's shared definitions. It is stated once
here, in the group that owns the reporting semantics, and consumed by US5.3
(the directory), US4.1 (the asset detail screen) and US5.5 (the CSV export's
holder columns).

**Acceptance criteria**

- **AC5.6.1** — Given the display-holder definition, then an asset with a
  current holder is attributed to that holder; an asset with no current holder
  but a preserved previous holder is attributed to its previous holder; and an
  asset with neither is attributed to no holder.
- **AC5.6.2** — Given the display-holder definition, then it is the same
  definition in the assignee directory and on the asset detail screen — an
  asset attributed to a holder in one is attributed to the same holder in the
  other.
- **AC5.6.3** — Given the "Unassigned" designation, then it is reserved for
  assets that have never been held by anyone.

**Depends on**: none. This story owns the definition; its consumers depend on
it.

**INVEST**: *Independent* — a definition, not a screen. *Negotiable* — the
implementation is not prescribed. *Valuable* — every holder figure is
comparable. *Estimable* — one definition. *Small* — one rule. *Testable* —
each criterion names an attribution.

---

### US5.7 — The release's performance is measured, not assumed

> As an **asset owner or requester**, I want the release's performance to be
> measured against a stated dataset rather than assumed, so that the
> acceptance ceilings are derived from evidence.

**Priority**: Must Have

**Note**: NFR1.1 names **six** measured quantities. Three of the six —
dashboard retrieval and rendering, directory grouping and retrieval, filtered
list retrieval, and the CSV generation — are exercised by the four
count-consuming surfaces. The remaining two — the write and audit-entry
completion time, and the SQLite lock-wait behaviour under concurrent writes —
are not represented by any other story, and the lock-wait measurement is the
one that demonstrates US1.4's busy-timeout behaviour.

**Acceptance criteria**

- **AC5.7.1** — Given the six quantities NFR1.1 names, then a measured value
  exists for each, taken against a dataset whose row count, bucket
  distribution and holder count are recorded alongside the result.
- **AC5.7.2** — Given the measured values, then the acceptance ceilings are
  derived from them and approved by the Product Owner before the release is
  considered to have met its performance criteria (open question OQ5).
- **AC5.7.3** — Given the response-time quantities, then the recorded results
  include their percentiles, and the export result includes its generation
  time.
- **AC5.7.4** — Given the SQLite lock-wait measurement, then it records the
  wait a concurrent writer experiences under the busy timeout US1.4 sets.

**Depends on**: US5.1, US1.4

**INVEST**: *Independent* — measurement, not a feature. *Negotiable* — the
harness is not prescribed. *Valuable* — the ceilings have evidence behind
them. *Estimable* — six measurements. *Small* — one measurement pass.
*Testable* — each criterion names a recorded result.

---

## US6 — Editing and duplicate detection

### US6.1 — Correct an asset's details

> As an **asset administrator**, I want to correct an asset's details after
> registration, so that a typo does not permanently misdescribe the record.

**Priority**: Must Have

**Acceptance criteria**

- **AC6.1.1** — Given an asset, when I edit its category, name, model, notes
  or serial or licence key, then the new values persist.
- **AC6.1.2** — Given an edit request carrying a status, a current holder or
  a preserved previous holder, then those values are left unchanged — they
  are not directly editable.
- **AC6.1.3** — Given an edit that does not change the serial or key, or
  that changes it only in casing or surrounding whitespace, then it is
  accepted and does not report a collision with the asset being edited.
- **AC6.1.4** — Given an edit that changes the category, then the new
  category is stored and the uniqueness check for that edit runs against the
  new category.
- **AC6.1.5** — Given an edit changes two fields, then exactly one `edit`
  audit entry is appended naming both fields and both previous values, and
  that entry carries an actor resolved from the server's trusted context.
- **AC6.1.6** — Given a save changes nothing, then no entry is appended and
  the asset's update timestamp does not change.
- **AC6.1.7** — Given an edit sets a serial or key, then the same uniqueness
  policy the registration path applies is applied to that edit — one
  comparison definition, one database arbiter, one error code.

**Depends on**: US1.2, US7.1

**INVEST**: *Independent* — the edit path. *Negotiable* — the outcome is a
corrected record. *Valuable* — errors are fixable. *Estimable* — one form.
*Small* — one screen. *Testable* — each criterion names a field.

---

### US6.2 — Be told about a duplicate serial before submitting

> As an **asset administrator**, I want to be warned while I am typing that a
> serial or key already exists in this category, so that I do not have to
> submit a form I know will be refused.

**Priority**: Must Have

**Acceptance criteria**

- **AC6.2.1** — Given I enter a serial or key that collides with an existing
  asset in the same category, then the collision is surfaced to me before the
  asset is created — the response identifies the colliding serial as such and
  no asset row is written. The collision check runs on the **server**, and
  the request that triggers it is issued when the field loses focus
  (`blur`), so the warning is produced by a server round-trip rather than by
  client-side rendering.
- **AC6.2.2** — Given a serial or key that exists in `hardware` but not in
  `software-license`, then no collision is reported and nothing is blocked.
- **AC6.2.3** — Given an edit that sets a serial or key colliding with
  another asset in the same category, then it is refused; the same edit
  against a different category is accepted.
- **AC6.2.4** — Given the collision warning is showing, then it names the
  colliding asset and offers a link to its detail screen, and dismissing it
  leaves the form as typed and the submit control available — the warning is
  advisory.
- **AC6.2.5** — Given the warning was dismissed and the form is then
  submitted with the same colliding serial, then the submit-time refusal of
  US6.3 still applies — a dismissal is not a waiver.

**Depends on**: US1.2

**Negotiable note**: the technique by which the pre-submission warning is
produced is not prescribed beyond the fact that it is a server round-trip
(AC6.2.1). The release adds no client-side rendering, so the warning is
produced by the server. The warning's *presentation* is not prescribed.

**INVEST**: *Independent* — the warning path. *Negotiable* — the warning's
presentation is not prescribed. *Valuable* — mistakes are caught early.
*Estimable* — one check. *Small* — one interaction. *Testable* — each
criterion names a warning or an acceptance.

---

### US6.3 — Have a duplicate serial refused with a way forward

> As an **asset administrator**, I want a duplicate serial to be blocked with
> a link to the existing asset, so that I can open it or correct my entry
> rather than work around the rule.

**Priority**: Must Have

**Acceptance criteria**

- **AC6.3.1** — Given a submitted colliding serial or key, then the form is
  refused — no asset row is written.
- **AC6.3.2** — Given the refusal, then it names the existing asset and links
  to its detail page.
- **AC6.3.3** — Given the refusal, then it offers a way to open the existing
  asset and a way to change the serial or key, and it offers **no** override
  that would create the asset despite the collision — no "create anyway"
  option and no equivalent.
- **AC6.3.4** — Given the refusal, then it carries the duplicate-serial error
  code, which is a permanent validation-class failure and is not reported as
  retryable.

**Depends on**: US1.2

**INVEST**: *Independent* — the refusal path. *Negotiable* — the wording is
not prescribed. *Valuable* — the dead end has an exit. *Estimable* — one
refusal. *Small* — one interaction. *Testable* — each criterion names a
refusal and its contents.

---

### US6.4 — Register without choosing an assignee

> As an **asset administrator**, I want registration to not ask who the asset
> is for, so that an asset is only ever held through a recorded assignment.

**Priority**: Must Have

**Acceptance criteria**

- **AC6.4.1** — Given the registration screen, then it contains no assignee
  input — the POC's optional "Assigned to" field is removed, and a
  registration request that supplies one does not assign the asset.
- **AC6.4.2** — Given an asset registered through that screen, then its status
  is `in-stock` and its current holder is null.

**Depends on**: US1.1

**INVEST**: *Independent* — the registration form's fields. *Negotiable* —
the outcome is an unassigned asset. *Valuable* — one way to assign, not two.
*Estimable* — one form change. *Small* — one rule. *Testable* — each
criterion names a field or a status.

---

## US7 — Actor attribution and accessibility across all surfaces

### US7.1 — Every write is attributed to a trusted actor

> As an **asset owner or requester**, I want every recorded action to be
> attributed to the person who actually caused it, so that the history is
> evidence and not just a log.

**Priority**: Must Have

**Acceptance criteria**

- **AC7.1.1** — Given any write to an asset, then exactly one audit entry is
  appended carrying the identity of the actor who caused the write, and no
  existing audit entry is ever replaced or modified.
- **AC7.1.2** — Given a write request supplies an actor in a body field, a
  query parameter or a directly settable header, then the write still
  succeeds, the audit entry records the server-resolved actor rather than the
  supplied one, and the supplied value is neither persisted nor logged — it is
  ignored, not rejected.
- **AC7.1.3** — Given an audit entry, then its actor resolves to a stable
  identity that can be displayed to a person reading the history.
- **AC7.1.4** — Given any released screen, then it renders a read-only
  "Acting as" indicator showing the resolved actor, and the indicator is not
  interactive.
- **AC7.1.5** — Given a failure occurring between the asset write and the
  audit append, then the asset row and the audit trail are both unchanged —
  the asset change and its audit entry are one all-or-nothing unit.
- **AC7.1.6** — Given any write path, then the asset change and its audit
  entry are committed as one unit, so that a failure injected between the
  asset write and the audit append leaves the asset row unchanged and appends
  no audit entry. Each write path is exercised individually. *(This is the
  per-path assertion of FR2.5 and NFR3.1; the criteria that assert "exactly
  one audit entry" — AC1.1.1, AC2.1.3, AC2.2.2, AC3.1.5, AC3.2.1, AC3.4.2,
  AC3.5.2, AC6.1.5, AC7.1.1 and AC4.2.5 — assert that count against this
  criterion, not against a count taken alone.)*
- **AC7.1.7** — Given a write path, then the asset change and its audit
  append execute inside **one** database transaction — the asset write and the
  audit write are not two separate statements, and a `try`/`catch` around two
  statements is not a rollback.
- **AC7.1.8** — Given the domain's error vocabulary, then it carries a
  retryable code for a busy condition, distinct from the permanent
  duplicate-serial code, and every code in the vocabulary is mapped in the
  error middleware to a specific HTTP status — including the invalid-state
  code, which the codebase today throws but does not map, so it falls through
  to a 500.
- **AC7.1.9** — Given a write fails, then the screen shows the asset
  unchanged and no new history entry — nothing appears to have happened, and
  the failure is stated to the administrator in words rather than as an error
  code.
- **AC7.1.10** — Given the `Acting as` indicator, then it displays the same
  actor value the server writes into an audit entry for a write made in that
  session — the indicator and the history never name different actors.
- **AC7.1.11** — Given the `Acting as` indicator, then it is present on every
  released screen, including the read-only ones, because it is a property of
  the session rather than of a write — and it carries no control that would
  let a user change it.
- **AC7.1.12** — Given an audit entry, then its actor resolves to a stable
  identity that can be displayed to a person reading the history, and the
  `system` actor used by the historical backfill resolves to a stable,
  displayable identity distinct from any person's.
- **AC7.1.13** — Given the actor mechanism chosen for this release relies on a
  **browser-attached credential**, then the write path refuses a
  state-changing request that carries neither a recognised origin nor a valid
  token, and a route-level test asserts that rejection. **This criterion is
  conditional on the mechanism**: if the chosen mechanism carries no
  browser-attached credential — a server-configured operator, for instance —
  then there is no credential to abuse and the criterion does not bind. It
  does not assert that the mechanism *is* a credential, and it does not
  assert that a credential-free mechanism is unsafe. The requirement is
  carried here because the actor mechanism is this story's subject; the
  mechanism itself is the open decision (I-01 / I-03).

**Depends on**: the actor-identity mechanism decision (open items I-01 /
I-03), which the scope document records as a blocking dependency of the
foundation workstream. The *rule* is fixed and is not reopened — the actor
comes from trusted server-side context, and a write request's actor field is
never trusted; the mechanism is a Domain Design decision, not a story-level
one.

**INVEST**: *Independent* — the rule, not a mechanism. *Negotiable* — the
mechanism that establishes the trusted actor is not prescribed here.
*Valuable* — the history is evidence. *Estimable* — one rule, applied
everywhere. *Small* — a cross-cutting concern. *Testable* — each criterion
names an observable property.

---

### US7.2 — Every screen is operable and readable without a mouse

> As an **asset owner or requester who uses assistive technology**, I want
> every screen to be operable by keyboard and to convey its structure
> programmatically, so that I can use the application without it.

**Priority**: Must Have

**Acceptance criteria**

- **AC7.2.1** — Given any released screen, then colour is never the only
  carrier of meaning.
- **AC7.2.2** — Given any released screen, then every interactive element is
  reachable and operable by keyboard.
- **AC7.2.3** — Given any released screen, then focus is visible wherever it
  rests; while a modal is open, focus is inside the modal and cannot be moved
  out of it; and when the modal closes, focus is not left trapped and returns
  to a determinate element outside it.
- **AC7.2.4** — Given a form error, then it is associated with its field.
- **AC7.2.5** — Given any released screen, then its structure is
  programmatic — one `h1`, headings in order, the `header` / `nav` / `main`
  landmarks, and tables carrying a `<caption>` and a `scope` on each column
  header.
- **AC7.2.6** — Given a status change is performed and the response is
  returned, then the outcome is conveyed in the returned markup — the new
  status is present in the response, and the response carries either a
  `role="status"` or a `role="alert"` region whose text names the new status.
  *(No client-side announcement behaviour is required: the release adds no
  client-side rendering.)*
- **AC7.2.7** — Given any released screen, then each interactive element meets
  the Web Content Accessibility Guidelines 2.1 Level AA target-size criterion
  and each text and background pair meets the Level AA contrast criterion —
  the floor for both is the one fixed by AC7.2.10, and no weaker threshold is
  accepted.
- **AC7.2.8** — Given any released screen, then a skip link to bypass the top
  bar is the first focusable element.
- **AC7.2.9** — Given each released screen, then the release's accessibility
  documentation carries a note for that screen naming its heading level, its
  primary landmark regions and its keyboard entry point. *(The note is a
  release artifact, not rendered into the application; it is therefore not
  asserted by a rendering test.)*
- **AC7.2.10** — Given an automated accessibility check of every released
  screen, then it reports no Web Content Accessibility Guidelines 2.1 Level AA
  violation.
- **AC7.2.11** — Given a released screen, then its keyboard entry point is the
  one recorded for that screen: the `Dashboard` navigation link on the
  dashboard, the search input on the asset list, the first action control on
  the asset detail, the `Category` control on the registration and edit forms,
  and the holder-search input on the directory. The skip link is the first
  focusable element of every screen, ahead of that entry point.
- **AC7.2.12** — Given a status chip, then the chip's text is the status
  name, so the chip's meaning does not depend on its colour.
- **AC7.2.13** — Given the navigation's current destination, then it is marked
  by weight and underline, and not by colour alone.
- **AC7.2.14** — Given the target-size and contrast commitment, then it
  applies to the release's new surfaces — the dashboard tiles, the dialogs
  and the fifth `discarded` status chip — and the application's existing
  status chips are not re-specified.
- **AC7.2.15** — Given **every** response the application returns, on every
  route and for every status code, then it carries
  `X-Content-Type-Options: nosniff` and it carries no `X-Powered-By`
  header. The property is application-wide and is asserted here once rather
  than repeated on each surface's own criteria; AC5.5.9 asserts only the
  part of it specific to the export response.
- **AC7.2.16** — Given a rendered page that displays a user-supplied value —
  an asset name, a note, a model, a serial or licence key, a holder name, or
  a reason drawn from the vocabulary — then the value is escaped and appears
  in the output as text, not as markup: a value containing `<`, `>` or `&` is
  rendered literally rather than interpreted as a tag or an entity. This
  holds on **every** released surface that renders such a value, including
  the asset list, the asset detail, the dashboard, the directory, the
  registration and edit forms, the reason dialog, and the CSV export's
  cells.

**Depends on**: none

**Note**: AC7.2.10 requires an automated accessibility check across every
released screen. No such tooling exists in this repository today, and the
dependency audit (`npm audit --audit-level=high --omit=dev`) is a blocking
merge gate over the production dependency closure. The checker is therefore
new capability work with a dependency-closure implication, and its selection
is a Domain Design decision.

**INVEST**: *Independent* — a property of every screen. *Negotiable* — the
technique is not prescribed. *Valuable* — the application is usable by
everyone. *Estimable* — a checklist per screen. *Small* — a gate, not a
feature. *Testable* — each criterion names a check.

---

## Won't Have — deferred capabilities with their standing intact

These are **approved and deferred**, not rejected. Each keeps its approved
standing, is a named follow-on item, and is expected to arrive in a later
increment of the same system.

| Story | Deferred capability | Standing | Follow-on trigger |
|---|---|---|---|
| **US8.1** | **Partial recovery** — recovering only part of a lost asset's value, or splitting a recovery across more than one outcome | Approved in the section 4.1 transition table's recovery surface; released only as the single `lost` → `in-stock` transition in US3.5 | Named follow-on item; no work in this release forecloses it |
| **US8.2** | **Credit assignment** — attributing a recovered asset's value to a particular person or cost centre | Approved; explicitly out of scope for this initiative's design alongside partial recovery and dispute handling, per the scope document's "Complex recovery workflows" exclusion | Named follow-on item in the recovery family |
| **US8.3** | **Dispute handling** — a contested claim over who held an asset or who caused its loss | Approved; explicitly out of scope for this initiative's design alongside partial recovery and credit assignment | Named follow-on item in the recovery family |
| **US8.4** | **Discarding an asset directly from stock** — the `in-stock` → `discarded` edge | **Remains an approved edge of the section 4.1 transition table.** The release draws and implements eight of the ten approved edges; this one is deferred, not withdrawn | Named follow-on item; the trigger is the release's transition-table coverage, not a rejection. *Test consequence: in this release the edge is refused with the invalid-transition code (AC3.1.3), and that refusal states the release boundary, not the design* |
| **US8.5** | **Discarding an asset after a return** — the `returned` → `discarded` edge | **Remains an approved edge of the section 4.1 transition table.** Deferred on the same terms as US8.4 | Named follow-on item; the trigger is the release's transition-table coverage, not a rejection. *Test consequence: as for US8.4* |
| **US8.6** | **Design system** — semantic colour tokens, a typography scale, spacing tokens, radius and shadow scales, iconography, and a light-theme implementation designed for later extension to a dark theme | Approved; the workbook's section 11 is the authoritative source for the complete design-system requirements | Named follow-on item; the release's new surfaces use the existing stylesheet's vocabulary, and the fifth `discarded` status chip reuses the stylesheet's existing muted grey rather than introducing a new semantic token |
| **US8.7** | **Responsive user interface** | Approved | Named follow-on item; the release's screens are drawn for desktop only, at the application's existing 960px container |
| **US8.8** | **Improved search** | Approved | Named follow-on item; the release keeps the POC's existing free-text search over name and serial or key as-is (assumption A14) |
| **US8.9** | **Pagination and the pager** — the page controls, the page-size control, and the navigation between pages | Approved; the *result counts* half of this item is **released** in US5.1 AC5.1.4 and US5.4 AC5.4.1, and only the pager itself is deferred | Named follow-on item; the trigger is the asset count growing beyond the confirmed medium scale of hundreds to low thousands of assets. **The count lines are in the release**: the asset list's shown and matching figures and the directory's count line are reads from the shared counting function |
| **US8.10** | **Empty-state presentation** — the designed treatment for an empty result set | Approved as presentation polish. The release still handles the zero case: the asset list retains its existing bare empty row (AC5.4.4), the CSV export produces a header-only file (AC5.5.6), and the directory always renders the "Unassigned" row (AC5.1.5). What is deferred is the *designed* empty-state treatment | Named follow-on item; the trigger is the design system's arrival. **UX consequence in this release:** the application retains its existing bare empty row in both the empty-inventory case and the filter-matches-nothing case, so an administrator looking at a filtered-to-zero list is shown `No assets yet.` — a statement that is false when the inventory is not empty. The later increment is expected to distinguish the two cases: a message that the filters matched nothing, with a reset, from the empty-database case. The same consequence applies to the directory's zero-result case: a `Search holders` search that matches no holder renders no row at all (AC5.3.13), including no "Unassigned" row, and the release builds no message saying that no holder matched — the screen is simply empty, with no designed empty state to distinguish it from any other empty directory. The directory's **empty-estate** case is the mirror of that: over an estate with no assets at all, the "Unassigned" row is still rendered and the count line still reads 0 (AC5.3.15), so a reader is shown one row above a count of zero with nothing on the page saying which of the two cases the count line describes |

The distinction matters and is preserved here: a deferred capability keeps its
approved standing and is expected later; an excluded capability has neither.
The explicitly excluded set for this initiative — complex recovery workflows
as a whole, dark theme, integration with any other system, obligations imposed
by an external regulatory framework, the POC's no-modification rule for stage
1, and scope changes beyond the approved set — carries **no standing** and is
therefore recorded in no story.

---

## Story Relationships

Arrows point from a dependency to the story that consumes it — the direction
the work is sequenced in.

```
   US0.1 (the foundation: rebuild + backfill)
      │  hard predecessor of everything; depends on the actor-mechanism decision
      │
      ├──> US1.2 (one uniqueness definition) ──> US1.3 (the database refuses)
      │                                           └──> US1.4 (concurrency)
      ├──> US2.1, US2.2 (custody)
      ├──> US3.1 (legal edges)
      ├──> US3.2, US3.4, US3.5 (loss, retirement, recovery)
      ├──> US4.1 (history display)
      ├──> US5.2, US5.3, US5.4, US5.5 (the four counting surfaces)
      └──> US6.1 (the edit path)

   US7.1 (actor attribution, the write path) ... asserted by every write story
   US7.2 (accessibility) ......................... a gate on every screen

   US3.1 (legal edges) ──> US3.2 loss ──┐
                    ├────> US3.4 retire┤
                    └────> US3.5 recover
   US3.3 (reason vocabulary) ────────────┴──> consumed by all three

   US3.6 (audit action vocabulary) .......... consumed by every write story

   US3.3 + US3.1 ──> US3.7 (the reason dialog)

   US6.1 (edit) ──> US4.3 (the edit is recorded)

   US5.1 (shared counting definition) ──> US5.2 dashboard
                                     ├─> US5.3 assignee directory
                                     ├─> US5.4 asset list ──> US5.5 CSV export
                                     └─> (the four are one indivisible group)
   US5.6 (one definition of a holder) ──> US5.3, US4.1, US5.5
   US1.4 + US5.1 ──> US5.7 (performance measured)

   US8.1 – US8.10 ......... deferred, approved standing intact
```

**The one indivisible group.** US5.1 and its four consuming stories — US5.2,
US5.3, US5.4 and US5.5 — are delivered together. A release that ships a subset
of the four surfaces has no consistency guarantee at all, which is the exact
defect the shared definition exists to remove. The property that makes the
group necessary is asserted by AC5.1.7 — every surface's counts come from
calling the shared counting function, and no surface computes a count by any
other route.

**The one cross-cutting rule.** US7.1 is stated once. Each write story's own
acceptance criteria assert that its write carries an actor, so no write path
can be built without the rule.

**The foundation precedes everything.** US0.1 is the scope document's
GROUP 1 — the schema rebuild and the historical backfill. Nothing else is
built on top of it first, because the property it guarantees — that the
release's own migration does not destroy the history the release exists to
produce — is silent when it is violated, and is therefore worth verifying
before the layers above make a defect expensive to fix.

## How this set was produced

This story set was drafted by the product manager, then reviewed independently
by three specialist participants — the designer, the developer and the quality
engineer — each of whom wrote their own contribution file recording findings
and positions. A second round was run to confirm the resolution of every
objection.

Four changes to this document came out of that process and are recorded here
because each one is a place where the draft was wrong in a way that reading it
alone would not have shown:

- **The reason dialog has three loss variants, not two** (AC3.7.2). The
  draft specified the consequence copy for a loss from `assigned` and for a
  loss from `in-stock`, but `returned → lost` is a released edge that reaches
  the same dialog and is a third shape: there is no assignment to end, but
  there is a holder to keep. Both obvious reuse paths put a false sentence in
  front of the administrator at the moment she records why an asset went
  missing.
- **The asset list and the CSV export do not depend on each other.** The draft
  had the list depend on the export (because the list offers the export
  control) and the export depend on the list (because the export's row set is
  the list's matching row set). Both compute that row set from the shared
  definition US5.1 owns, so the ordering was an artefact of two surfaces each
  naming the other as the source of the same value. The dependency now runs
  one way — the export is an action on the list (AC5.4.3).
- **The uniqueness policy is three stories, not one** (US1.2, US1.3, US1.4):
  the definition, the database's refusal, and the concurrency case. The
  draft's single story conflated a rule with its enforcement, which left the
  concurrency case with no criterion to attach to.
- **The actor-mechanism dependency is one-directional.** The draft had US6.1
  and US4.3 depending on each other. The edit path writes the entry and the
  entry is displayed, so the dependency runs from the edit to the display of
  its audit behaviour, never back.

Two further points were put to the human as judgment calls and ruled on:
US0.1 is written as a release-gating workstream rather than in a persona's
voice, the performance criteria assert only what is observable today with the
numeric ceiling left to the Product Owner, and the duplicate warning is
delivered by a server round-trip on the field's blur.

---

## What the advisory review changed

An independent product-lead reviewer then read this set against the upstream
requirements and the wireframes and returned ten findings: two Critical, four
Major and four Minor. Every one was checked against its source before any
change was made, and ten of the ten were real defects in this document. The
resolution of each is recorded below, because each is a place where the story
set would have sent a developer to build the wrong thing.

- **The two new controls had no behaviour at all.** The asset list gains a
  **Reset** control and the directory gains a **`Search holders`** input; both
  are new in this release, and neither had a single acceptance criterion. A
  control with no stated behaviour is a control whose behaviour each developer
  invents, and the directory's search is the one place where the release's
  counting definition could be bypassed silently — a search that filtered
  assets instead of holders would return a plausible list and would not fail
  any check. The criteria now state what each control clears or filters
  (AC5.4.5 – AC5.4.7, AC5.3.12 – AC5.3.14), including that the directory
  search filters *holder rows* and never a holder's totals, chips or
  expansion.
- **The `mark-lost` audit entry did not name the prior holder.** FR2.8
  requires it. AC3.2.1 now names the prior holder where one applies and says
  which origin has none.
- **The directory's holder row contradicted itself.** AC5.3.4 said a holder
  row links to the asset list filtered to that holder — which is FR8.3's
  pass/fail criterion verbatim — while AC5.3.5 said every holder name is
  rendered "with no link". FR8.4 forbids a holder *detail page* and an
  *account affordance*; it does not forbid a link to the filtered asset list.
  AC5.3.5 now forbids account affordances and names the row's link
  explicitly, and AC5.3.9 separates the row's in-place disclosure from its
  navigation so the two are not confused.
- **A cross-reference pointed at the wrong criterion.** AC3.6.4 pointed the
  `edit` action's specificity at AC6.1.4 (which is about the category change)
  instead of AC6.1.5 (which is about the single audit entry). Corrected.
- **Three requirement ids were not traced.** FR1.6a, FR3.6a and NFR3.5a
  are absent from `traceability.json`, because the sensor's id pattern does
  not match a letter-suffixed id. NFR3.5a is the binding migration-ordering
  constraint — the audit table must be rebuilt before the asset table, or
  `DROP TABLE assets` fires the audit table's `ON DELETE CASCADE` and destroys
  the history the release exists to preserve. All three are now traced by
  hand.
- **An application-wide property was asserted inside a surface-specific
  criterion.** AC5.5.9 asserted that *every* response carries `nosniff` and no
  `X-Powered-By` — NFR2.6's whole scope — inside the CSV export's story. The
  property is now asserted once, cross-cutting, by AC7.2.15, and AC5.5.9
  keeps only what is specific to the export response.
- **NFR2.3 was asserted by no criterion at all.** The release requires that
  user-supplied values are escaped in rendered output on every surface. A
  criterion (AC7.2.16) now names the surfaces and the value classes.
- **The duplicate warning's trigger was unstated.** AC6.2.1 now states that
  the check runs on the server and is triggered by the field losing focus.
- **The directory's empty result was unrecorded.** AC5.3.13 states that a
  search matching no holder renders no row at all, including no "Unassigned"
  row, and AC5.3.15 states the mirror case — over an estate with no assets at
  all, the "Unassigned" row is still rendered and the count line still reads
  0. US8.10 now records both consequences: the release builds no
  empty-state message for the directory, so a zero-search directory is simply
  blank and an empty-estate directory shows one row above a count of zero.
- **The reconciliation seed's "Unassigned" row was read wrongly.** The seed's
  3 assets (2 `in-stock` and 1 never-held `lost`) were checked against the
  wireframes' claim that the row carries a single `in-stock` chip, and the
  seed appeared to contradict them. It does not: the wireframes' premise —
  "every bucket other than `in-stock` requires a prior holder to reach" — is
  falsified by the released `in-stock → lost` edge, and FR3.5's pass/fail
  says explicitly that a never-held lost asset falls in the "Unassigned"
  row. The **wireframes** are the artifact carrying the wrong premise. The
  seed and AC5.1.6 now state the chip breakdown (`[In stock 2] [Lost 1]`)
  explicitly, so a developer building from this set cannot inherit the
  wireframes' wrong assumption.

### The second review pass (iteration 2)

The ten findings above were re-reviewed against this revision, and the
reviewer confirmed each of them as resolved — it independently recomputed
the reconciliation seed and found every published figure correct — while
raising five further findings of its own. These are recorded here in the
same form.

- **A cross-reference pointed at the wrong criterion (R-11).** The R-07 fix
  that moved the application-wide `nosniff` assertion out of AC5.5.9 left
  the parenthetical in AC5.5.9 pointing at AC7.2.6 rather than at the new
  AC7.2.15. Corrected to AC7.2.15.
- **The directory's count line had no behaviour under an active search
  (R-12).** AC5.3.8 said only what the count line *counts*; it did not say
  what the figure reports once a search narrows the list, so a count line
  could report the estate's holder total while the screen showed the search
  matches, and the line and the rows would disagree. AC5.3.8 now states that
  the figure is the count of the holders **currently listed on the screen**,
  so the count line and the rendered rows can never disagree — no search
  means every holder in the estate, a search means the matching ones.
  AC5.3.12 and AC5.3.13 follow the same rule for the searched and zero-match
  cases.
- **FR4.4 had no criterion of its own (R-13).** The requirement that no
  released screen lists audit entries across assets was traced to US4.1, but
  US4.1 asserted nothing about it. AC4.1.7 now states that the release adds
  no screen whose subject is the audit log, and that the release neither
  adds that screen nor removes the deferral's standing.
- **NFR2.5's conditionality was flattened (R-14).** The criterion now
  asserts the CSRF protection **only on the condition** that the actor
  mechanism chosen under open items I-01 / I-03 carries a browser-attached
  credential. The criterion no longer implies that the mechanism *is* a
  credential, because that decision is still open.
- **The asset list's filter dimensions were unstated (R-15).** The release
  adds a `Reset` control to a filter form whose dimensions the set never
  enumerated, so what `Reset` clears was derivable only by inference. AC5.4.8
  now names the five dimensions the POC's form already carries — search text,
  category, status, sort and direction — and states that the release adds no
  sixth. AC5.4.9 fixes the status filter's option set to the five buckets
  plus "all statuses", and AC5.4.10 fixes the category filter's to
  `hardware` and `software-license` plus "all categories", matching the
  registration form.

