# Requirements

Asset Tracker MVP — requirements analysis.

This document states what the approved Asset Tracker MVP must do. It is
derived from the confirmed requirements-analysis interview answers, the
approved 17-item decision set and Asset Tracker MVP Development Workbook
(the binding product and technical contract for this intent, not reopened at
any stage), the release scope document, the intent statement, the wireframe
and user-flow sets, the POC requirements baseline, and the verified code
store for the existing application.

Every requirement is written as a testable "shall" statement with an
explicit pass/fail criterion. Where a numeric threshold was deliberately not
fixed, the requirement is stated as a process obligation and the numeric
value is recorded as an open question rather than invented here.

Requirement identifiers are stable: `FR{n}` for a feature-area group,
`FR{n}.{m}` for a sub-requirement within it, `NFR{n}` for a
non-functional group, `C{n}` for a constraint, `A{n}` for an assumption, and
`OQ{n}` for an open question.

---

## Intent Analysis

### The problem being solved

The existing application is a working proof of concept. It registers assets,
lists and filters them, shows an asset's record, and moves an asset through a
four-state lifecycle. Its three recorded integrity defects are the reason
this initiative exists:

1. **A loss destroys the previous holder.** When an asset is marked lost, the
   holder is cleared and the previous holder is not retained anywhere, so
   "who had this before it went missing" cannot be answered.
2. **A return overwrites history on reassignment.** A returned asset can be
   reassigned, and the assignment replaces the prior holder rather than
   preserving it.
3. **The audit trail is destroyed on asset deletion.** The current schema
   cascades the delete of an asset row into the deletion of its audit rows,
   silently, with the transaction committed and no error raised.

Two further defects compound these: duplicate detection is post-hoc and
case-sensitive, so near-duplicate serials are admitted; and there is no
counting anywhere, so the asset list, the future directory, the future
dashboard and the future export have no shared definition of what they are
counting, and therefore no way to agree.

### What the MVP must be true of

The MVP introduces the three approved invariants:

- **INV-1 — Append-only history.** No asset row and no audit history is ever
  destroyed. An asset that leaves the active inventory leaves it by being
  discarded, and a discarded asset keeps its row, its history, and its
  reachable detail page.
- **INV-2 — Five exclusive status buckets.** Every asset is in exactly one of
  `in-stock`, `assigned`, `returned`, `lost`, `discarded`. No asset is
  counted in two buckets, and the buckets together account for every asset
  row in the system.
- **INV-3 — One shared counting definition.** The dashboard, the assignee
  directory, the asset list and the CSV export compute their counts from one
  shared filtering and counting definition, so the four surfaces always agree.

Two further approved behaviours shape the whole feature set:

- **The actor-trust rule.** Every audit entry carries the identity of the
  person who caused the change. That identity is resolved from a trusted
  server-side context, and an actor supplied in a write request is ignored,
  never rejected and never sanitised into acceptance.
- **Normalised, category-scoped uniqueness.** A serial or licence key is
  unique within its category, compared after trimming and case-folding, with
  the application-level predicate and the database's unique index sharing one
  definition.

### Success measure

**Audit Completeness.** At any moment, every audit entry in the system
carries an actor attribution. The measured population is every audit entry
that exists at the moment of measurement, excluding entries attributed to the
`system` actor (pre-MVP backfilled history). "Lacks an actor" means the actor
value is null or empty. The criterion is zero entries lacking an actor. The
measure is evaluated both as a standing assertion on every write path and as
a single countable whole-table check.

### Target customer

The internal operations staff who register, hand out, recover, and retire
physical assets and software licences, and the asset owner who needs to know
where an asset is, who holds it, who held it before, and what happened to it.

### How this document is organised

Sections FR1–FR11 state the functional requirements by feature area.
Section NFR1–NFR6 state the non-functional requirements. Section C1–C13
state the constraints that bound the solution. Section A1–A16 state the
assumptions the requirements rest on. Section `## Out of Scope` separates the
capabilities deferred to a later increment from those explicitly excluded,
and states why the distinction matters. Section OQ1–OQ5 state the open
questions, none of which is assumed answered in either direction. Section
`## Traceability` maps the MVP requirements to the POC requirements they
relate to, stating the relationship precisely.

---

## Functional Requirements

### FR1 — Asset registration and serial/key uniqueness

**FR1.1** The system shall allow a user to register an asset with a
category, a name, a serial or licence key, and optional model and notes.
*Pass/fail:* a registration request carrying a valid category, a non-empty
name and a non-empty serial/key, with or without model and notes, is accepted
and produces exactly one asset row and one `create` audit entry.

**FR1.2** The system shall accept exactly two asset categories, `hardware`
and `software-license`, and shall reject a registration carrying any other
category.
*Pass/fail:* registering with category `hardware` or `software-license`
succeeds; registering with any other category value is rejected with the
validation error code and no asset row is written.

**FR1.3** The system shall persist a newly registered asset with status
`in-stock`, and shall not assign it to anybody at registration.
*Pass/fail:* after registering an asset, the persisted status is `in-stock`
and the current holder is null. (This preserves the POC's behaviour of
registering an asset as `in-stock`; the release additionally removes the
POC's optional registration-time `assigned-to` field — see the FR1.2
traceability row.)

**FR1.4** The system shall compare a serial or licence key for uniqueness
after trimming leading and trailing whitespace and folding case, within a
category, and shall store the serial/key as the user supplied it.
*Pass/fail:* an asset in category `hardware` with serial `AbC` and a second
asset in category `hardware` with serial `abc` are a collision; the same
string in category `software-license` is not. The stored and displayed
serial/key preserves the user's original casing and spacing.

**FR1.5** The system shall enforce FR1.4 identically at the application level
and at the database level, using one shared definition of the normalisation
and comparison. The database is the authoritative arbiter of a collision: the
application-level predicate exists to give a prompt, specific refusal, and a
collision it does not detect is still refused by the database's unique index.
Both tiers carry the same duplicate-serial error code (FR1.7).
*Pass/fail:* a duplicate is rejected both by the application predicate before
the write and by the database's unique index when the application predicate is
bypassed; the two never disagree on what counts as a collision; under
concurrent requests the database's index, not the application predicate,
decides which writer succeeds; and the two tiers surface the same
duplicate-serial error code.

**FR1.6** The system shall perform the uniqueness check so that two
concurrent registrations of the same normalised serial/key cannot both
succeed.
*Pass/fail:* two concurrent writers attempting to register the same
normalised serial/key in the same category produce exactly one asset row and
one rejection; the rejection names the collision and is not reported as a
generic failure. (This requirement is the one whose test is written before the
implementation it guards, per the affirmed testing posture.)

**FR1.6a** The uniqueness check shall run inside an `IMMEDIATE` transaction
with a non-zero SQLite `busy_timeout`, so that a concurrent writer waits for
the lock rather than failing immediately, and a lock that cannot be acquired
within the timeout surfaces as the retryable busy condition of FR1.7 and
NFR3.2 rather than as a generic internal error.
*Pass/fail:* the uniqueness check executes within an `IMMEDIATE` transaction;
the database's `busy_timeout` is non-zero at the time the check runs; and a
concurrent writer that cannot obtain the lock within the timeout receives the
retryable busy code — detected from `SQLITE_BUSY` — not a generic internal
error.

**FR1.7** The system shall distinguish two failure classes on the uniqueness
check, and shall carry each in its own error code. A **duplicate-serial
failure** — another asset in the same category already holds the normalised
serial or key — is a permanent validation-class failure: it is not retryable,
and it is resolved by opening the existing asset or changing the serial or key
(FR10.5). It is detected on two tiers, and both tiers carry the same
duplicate-serial error code. The **application-level predicate** detects the
collision by the shared comparison definition of FR1.4 and raises that code
directly, without raising a driver error; the **database's unique index** is
the backstop, raising the driver's machine-readable error code
`SQLITE_CONSTRAINT_UNIQUE`, which is detected by that same code and never by
matching error message text. A **busy condition** — lock contention on the
database while the check runs — is transient and is carried as the retryable
error code, distinct from both the duplicate-serial failure and a generic
internal error. It is detected from the driver's machine-readable error code
`SQLITE_BUSY`, and never by matching error message text.
*Pass/fail:* a busy condition surfaces as the retryable error code and is
detected from `SQLITE_BUSY`; a duplicate-serial failure surfaces as the
permanent validation-class code and not as the retryable code; a duplicate
caught by the application-level predicate and a duplicate caught by the
unique index surface the **same** duplicate-serial code, so the two tiers are
indistinguishable to a caller; an index-level rejection is detected from
`SQLITE_CONSTRAINT_UNIQUE` and never from error message text; the two failure
classes are distinguishable by code from each other and from a generic
internal error; and a duplicate-serial failure is not reported as retryable.
(The generic busy-condition behaviour is specified in NFR3.2.)

**FR1.8** The system shall apply the FR1.4 uniqueness policy to a serial/key
change made through the edit capability, on the same terms as registration.
*Pass/fail:* an edit that sets a serial/key colliding with another asset in
the same category is rejected; the same edit against a different category is
accepted.

**FR1.9** The system shall allow an asset's category to be changed through the
edit capability, and shall apply the uniqueness policy against the category
the edit sets.
*Pass/fail:* an edit that changes an asset's category stores the new category,
and the uniqueness check for that edit runs against the new category — a
serial/key that collides within the new category is rejected, and one that
collides only within the old category is accepted.

### FR2 — Actor attribution on every write

**FR2.1** Every write to an asset shall append exactly one audit entry
carrying the identity of the actor who caused the write, and shall never
replace or modify an existing audit entry.
*Pass/fail:* after any sequence of writes to one asset, the number of audit
entries equals the number of writes, each entry carries a non-empty actor,
and the pre-existing entries are byte-for-byte unchanged.

**FR2.2** The actor shall be resolved from a trusted server-side context.
No client-settable field or header shall be the actor's source. An actor
supplied in a write request shall be ignored, and the server-side value used
in its place.
*Pass/fail:* a write request that supplies an actor in a body field, a query
parameter, or a directly settable header **still succeeds**, and its audit
entry records the server-resolved actor, not the supplied one; the supplied
value is neither persisted nor logged. (The supplied actor is ignored, not
rejected — a request that merely carried a stale field is not an error. This
requirement is a constraint on any mechanism the team may later choose; it
does not choose the mechanism.)

**FR2.3** The actor shall resolve to a stable identity that can be displayed
to a person reading the history.
*Pass/fail:* every audit entry renders a non-empty actor label on the asset
detail screen.

**FR2.4** The system shall display the resolved actor in a read-only
"Acting as" indicator on every screen, reserving the place in the layout
without asserting a particular mechanism.
*Pass/fail:* every released screen renders the indicator, and it is not
interactive.

**FR2.5** The system shall write the asset change and its audit entry as one
all-or-nothing unit, so that a failure cannot leave a changed asset with no
audit entry.
*Pass/fail:* a forced failure between the asset write and the audit append
leaves the asset row and the audit trail both unchanged.

**FR2.6** The system shall reject an attempt to delete an asset row outright,
and shall refuse it with a clear, machine-readable error rather than a bare
database failure.
*Pass/fail:* a delete attempt against an existing asset leaves the asset row
and all its audit entries intact and returns the specified refusal error
code; the refusal is distinguishable from a validation error and from an
internal error by its code.

**FR2.7** The system shall enforce append-only audit history at the database
level, so that an update or a delete against the audit table is refused by
the database itself, and so that a parent asset row cannot be deleted out
from under its history.
*Pass/fail:* an `UPDATE` against the audit table raises a database error; a
`DELETE` against the audit table raises a database error; a `DELETE` against
the asset row does not remove any audit row.

**FR2.8** Every audit entry's description shall name the specifics of its
event — the actor's identity is on the entry itself (FR2.1), and the
description names the holder affected, the prior holder where one applies,
and the reason where the transition requires one. A description that names
only the action is not sufficient.
*Pass/fail:* each of the release's write paths produces an entry whose
description names the specifics of its event: a `create` entry names the
registered asset's name, its category, and the serial or key it was
registered under; an `assign` entry names the assignee; a `return` entry
names the returning holder; a `mark-lost` entry names the loss and its reason
and the prior holder where one applies; a `recovered` entry names the recovery
and the prior holder; a `discarded` entry names the discard, the prior holder,
and the resolution of the assignment; and an `edit` entry names the changed
fields and their previous values. No entry's description names only its
action.

### FR3 — Lifecycle and state transitions

**FR3.1** The system shall place every asset in exactly one of five
exclusive status buckets: `in-stock`, `assigned`, `returned`, `lost`,
`discarded`.
*Pass/fail:* every asset row carries exactly one status drawn from that set;
the buckets are mutually exclusive and their union is the set of all asset
rows.

**FR3.2** The released transitions shall be exactly the following eight
edges, and no other edge shall be legal:

| From | To |
|---|---|
| `in-stock` | `assigned` |
| `in-stock` | `lost` |
| `assigned` | `returned` |
| `assigned` | `lost` |
| `assigned` | `discarded` |
| `returned` | `assigned` |
| `returned` | `lost` |
| `lost` | `in-stock` |

*Pass/fail:* each of the eight edges succeeds from the stated origin status
and fails from every other origin status; every edge not listed fails.

**FR3.3** Every transition shall have explicit validation and explicit audit
behaviour: an illegal transition shall be refused with the invalid-transition
error code and shall write no audit entry, and a legal transition shall write
exactly one audit entry naming the action and the transition.
*Pass/fail:* each released edge is refused from each of the four non-origin
statuses with the invalid-transition code, with no audit entry appended; each
released edge from its origin status appends exactly one audit entry.

**FR3.4** The `assign` transition shall set the current holder, set the
assignment timestamp, and clear the return timestamp.
*Pass/fail:* after an assign, `assigned_to` is the assignee, the assignment
timestamp is set to the transition time, and the return timestamp is null.

**FR3.5** The `return` transition shall clear the current holder, set the
return timestamp, and leave the assignment timestamp unchanged.
*Pass/fail:* after a return, `assigned_to` is null, the return timestamp is
set to the transition time, and the assignment timestamp still holds its
previous value.

**FR3.6** The `mark-lost` transition shall record the departing current holder
into the preserved previous-holder field before clearing the current holder, so
that a lost asset that had been held remains attributable to the person who
last held it. Only a loss of an asset that has never been held by anybody shall
clear both holder fields, and in that case there is no departing holder to
record.
*Pass/fail:* after a mark-lost of an asset whose current holder was set and
whose preserved previous-holder field was empty, the current holder is null and
the preserved previous-holder field now names the departing holder, and the
asset is counted in the directory under that holder; after a mark-lost of an
asset that has never been held, both holder fields are null and the asset falls
in the "Unassigned" row; after a mark-lost of an asset that has been held
before, the preserved previous-holder field still names the last holder.

**FR3.6a** A `mark-lost` transition shall require a reason, drawn from the
shared loss-reason vocabulary, for every origin it is released from —
`in-stock`, `assigned` and `returned`. The `mark-lost` action carries no
transition of its own and does not require a distinct action.
*Pass/fail:* a mark-lost submitted without a reason is refused from each of
the three origins, with no status change, no holder change and no audit entry;
a mark-lost submitted with a reason drawn from the shared loss-reason
vocabulary succeeds from each of the three origins and writes exactly one
`mark-lost` audit entry naming the reason.

**FR3.7** The `recover` transition shall move an asset from `lost` back to
`in-stock`, shall record the recovery as a distinct `recovered` audit action
rather than as an assign or a return, and shall name the recovery and the
prior holder in that entry's description.
*Pass/fail:* recovering a lost asset yields status `in-stock`; the audit
entry's action is `recovered` and is neither `assign` nor `return`; the
description names the recovery and the prior holder.

**FR3.8** A recovery shall require a reason, drawn from the shared
loss-reason vocabulary.
*Pass/fail:* a recovery submitted without a reason is refused, with no status
change and no audit entry.

**FR3.9** The `discard` transition shall resolve the assignment inline: it
shall record the departing current holder into the preserved previous-holder
field, then clear the current holder, so the holder at discard time stays
visible; and it shall record the discard, the prior holder, and the fact that
the assignment was resolved by the discard in a `discarded` audit action.
*Pass/fail:* after a discard of an asset whose current holder was set and whose
preserved previous-holder field was empty, the current holder is null, the
preserved previous-holder field now names the holder at discard time, and the
audit entry's description contains the discard, the prior holder, and the
resolution of the assignment.

**FR3.10** A discard shall require a reason, drawn from the shared
loss-reason vocabulary plus retirement-specific values.
*Pass/fail:* a discard submitted without a reason is refused, with no status
change and no audit entry.

**FR3.11** A discarded asset shall remain present in the `discarded` bucket
and in Total Records, shall be excluded from Active Inventory, and shall
remain accessible at its detail URL with its history intact.
*Pass/fail:* a discarded asset appears in the discarded bucket count and in
the total count, does not appear in the active inventory count, and its
detail URL still returns the asset and its full history.

**FR3.12** The system shall preserve the audit action vocabulary's existing
values and shall add `recovered`, `discarded` and `edit` to it. The vocabulary
is exactly these seven values, and no transition carries an audit action of
its own beyond them: `mark-lost` is the action for all three loss edges
(`in-stock` → `lost`, `assigned` → `lost`, `returned` → `lost`), and
`returned` → `lost` reuses `mark-lost` rather than introducing an action for
it.
*Pass/fail:* the vocabulary contains `create`, `assign`, `return`,
`mark-lost`, `recovered`, `discarded` and `edit` and no other value; no
existing value is renamed; and a loss from `in-stock`, from `assigned` and
from `returned` each append exactly one `mark-lost` entry and no action
specific to the origin.

### FR4 — Audit history, its display, and its contents

**FR4.1** The asset detail screen shall render the asset's full audit
history as an ordered sequence, newest first, with the actor shown on every
entry.
*Pass/fail:* after four writes to one asset, the detail screen renders four
history entries, the newest first, and each entry shows an actor.

**FR4.2** The system shall show an entry attributed to the `system` actor
distinctly from an entry attributed to a person.
*Pass/fail:* a `system` entry is rendered with a distinguishable marker from
a person-attributed entry.

**FR4.3** An edit that changes at least one field shall append exactly one
history entry naming the changed fields and their previous values. A save
that changes nothing shall append no entry.
*Pass/fail:* an edit changing two fields appends one entry naming both fields
and both previous values; a save with no field changed appends no entry and
does not change the asset's update timestamp.

**FR4.4** The release shall not introduce a system-wide audit log screen, and
shall not withdraw the POC's deferral of one. The full history of an asset is
rendered in the context of that single asset.
*Pass/fail:* no released screen lists audit entries across assets; the release
adds no screen whose subject is the audit log itself. (This requirement does not
withdraw the POC's deferral of a global log — see the FR5.3 traceability row
for the precise relationship between the deferral and this release.)

**FR4.5** The history surface shall preserve the full sequence of entries
for an asset, and shall not replace entries with a single latest entry.
*Pass/fail:* after four writes, the detail screen shows all four entries, not
one. (This replaces the POC's latest-entry-only rendering; see
`## Traceability`.)

### FR5 — Display-holder definition

**FR5.1** The system shall apply one definition of a holder across every
surface that names a holder: the current holder where one exists, otherwise
the preserved previous holder where one exists, otherwise no holder. The
holder population itself is derived from the asset rows rather than from a
separate holder record (assumption A16).
*Pass/fail:* an asset with a current holder is attributed to that holder; an
asset with no current holder but a preserved previous holder is attributed to
its previous holder; an asset with neither is attributed to no holder.

**FR5.2** The "Unassigned" designation shall be reserved for assets that
have never been held by anyone.
*Pass/fail:* a recovered asset and a discarded asset each appear under their
preserved previous holder, and neither appears under "Unassigned"; an asset
that has never been assigned appears under "Unassigned".

**FR5.3** A holder name recorded by the system shall be a display name, not
an identity. The system shall not present a holder name as though it were a
person account.
*Pass/fail:* the holder surfaces present names as recorded, and no holder
surface asserts that a name identifies a person in a directory of accounts.

### FR6 — Shared counting definition

**FR6.1** The dashboard, the assignee directory, the asset list and the CSV
export shall compute their counts from one shared filtering and counting
definition.
*Pass/fail:* given a seeded dataset, the four surfaces report the same count
for the same filter, checked directly against each other.

**FR6.2** The shared definition shall distinguish the active inventory from
the total record count, where a discarded asset counts towards the total and
not towards the active inventory.
*Pass/fail:* with one discarded asset and no others, the total count is one
greater than the active inventory count, and the difference is exactly the
discarded count.

**FR6.3** The five bucket counts shall sum to the total record count.
*Pass/fail:* the sum of the five bucket counts equals the total record count
for any dataset.

**FR6.4** The asset list shall report how many records are being shown and
how many records match the applied filter.
*Pass/fail:* the list screen renders both figures, and the shown figure never
exceeds the matching figure.

**FR6.5** The assignee directory's count line shall count distinct display
holders, excluding the "Unassigned" row, and the directory shall render one
row per display holder plus the "Unassigned" row.
*Pass/fail:* the count line equals the number of display holders excluding
"Unassigned", and the rendered row count is one greater than that figure.

**FR6.6** A holder row's per-bucket chips shall sum to that row's total.
*Pass/fail:* for every holder row, the sum of its chips equals the holder's
total.

**FR6.7** The dashboard shall present, in addition to the bucket counts: the
active inventory, the total record count, and the count of assets available to
assign. It shall also present an attention panel carrying **two separate
items** — the `lost` bucket count and the `discarded` bucket count — each a
whole-bucket count with no time window applied to either. A single summed
attention figure may be shown in addition to the two, but it does not replace
them.
*Pass/fail:* the active inventory, the total record count and the
available-to-assign count are each present and equal the shared definition's
value for it; the attention panel carries two separate items, one equal to the
`lost` bucket count and one equal to the `discarded` bucket count; neither
item is qualified by a time window or by a partial-bucket filter; and if a
summed attention figure is present it equals the sum of the two items.

**FR6.8** The four count-consuming surfaces shall be delivered as one
indivisible group; a release that ships any subset of the four does not
satisfy this requirement (assumption A13).
*Pass/fail:* the release contains all four surfaces and each reports counts
from the shared definition.

### FR7 — Reconciliation dashboard

**FR7.1** The system shall provide a dashboard screen showing the counts
specified in FR6.7.
*Pass/fail:* the screen renders the active inventory, the total record count,
the available-to-assign count, the five bucket counts, and an attention panel
carrying the `lost` and `discarded` counts as two separate items.

**FR7.2** The dashboard's figures shall be reconcilable by a reader: the
bucket tiles shall sum to the total record count, and the active inventory
shall equal the sum of the buckets it covers.
*Pass/fail:* the reconciliation holds on a seeded dataset with assets in
every bucket.

**FR7.3** The dashboard shall offer a direct path to the assets behind each
figure.
*Pass/fail:* each bucket tile links to the asset list filtered to that
bucket.

### FR8 — Assignee directory

**FR8.1** The system shall provide a directory screen listing every distinct
display holder, plus an "Unassigned" row for never-held assets. The holders
are derived from the asset rows themselves rather than from a separate holder
record (assumption A16).
*Pass/fail:* the screen renders one row per display holder plus the
"Unassigned" row, matching FR6.5; and the set of listed holders is derived
from the assets' display holders, so a name that appears on no asset does not
appear as a row.

**FR8.2** Each holder row shall carry the holder's total and per-bucket
chips, reconciled as specified in FR6.6.
*Pass/fail:* each row carries a total and chips; the chips sum to the total.

**FR8.3** The directory shall provide a way to reach the assets held by a
holder.
*Pass/fail:* a holder row links to the asset list filtered to that holder.

**FR8.4** The directory shall not provide a holder detail page, and shall not
treat a holder name as a person account.
*Pass/fail:* no holder detail screen exists; the directory presents holder
names as display names.

### FR9 — CSV export

**FR9.1** The system shall provide a CSV export of the assets matching the
asset list's current filter.
*Pass/fail:* the export's row set equals the list's matching row set for the
same filter.

**FR9.2** The export file shall be named `assets-export.csv`, served with the
content type `text/csv; charset=utf-8`, and encoded as UTF-8.
*Pass/fail:* the response's filename, content type and encoding match these
values exactly.

**FR9.3** The export shall carry exactly these six columns, in this order:
`Name`, `Category`, `Serial / Key`, `Status`, `Holder`, `Last holder`. Notes
and audit history are not exported, because neither is a column of the asset
list the export mirrors.
*Pass/fail:* the header row equals `Name, Category, Serial / Key, Status,
Holder, Last holder` exactly and in that order; every data row carries exactly
those six fields; and no seventh column is present.

**FR9.4** The export shall not silently truncate its row set.
*Pass/fail:* the exported row count equals the matching row count for every
dataset tested, including the representative upper-end dataset.

**FR9.5** The export shall contain no embedded filter metadata beyond the
data rows and the header.
*Pass/fail:* no cell carries a filter description, a comment, or a
metadata block.

**FR9.6** The export shall produce a header-only file when no rows match the
filter.
*Pass/fail:* with zero matching rows, the file contains the header row and
no data rows.

**FR9.7** The export shall sanitise every string cell against formula
injection: a cell whose content begins with `=`, `+`, `-`, `@`, a tab, or a
carriage return shall be prefixed with a single quote before quoting, and
this shall apply to every string cell rather than to a selected subset of
columns.
*Pass/fail:* a cell beginning with `=` is exported with the prefix; a benign
cell is exported unchanged; the protection applies to a free-text column and
to any column added later.

### FR10 — Asset editing and duplicate-detection user experience

**FR10.1** The system shall allow a user to edit an asset's category, name,
model, notes and serial or licence key.
*Pass/fail:* an edit changing those fields persists the new values and
appends one `edit` audit entry naming the changed fields and their previous
values.

**FR10.2** The edit capability shall not allow the status, the current
holder, or the preserved previous holder to be edited directly.
*Pass/fail:* an edit request carrying any of those values leaves them
unchanged.

**FR10.3** The edit capability shall not allow the asset being edited to
collide with itself.
*Pass/fail:* an edit that does not change the serial/key, or that changes it
only in casing or surrounding whitespace, is accepted and does not report a
collision with the same asset.

**FR10.4** The system shall warn inline, before submission, when the
serial/key being entered would collide with an existing asset in the same
category.
*Pass/fail:* entering a colliding serial/key produces an inline warning
without submitting the form.

**FR10.5** The system shall block submission of a colliding serial/key and
the block shall identify the existing asset, link to it, and state the next
steps: open the existing asset, or change the serial/key. No override shall
be offered.
*Pass/fail:* the submitted form is refused; the refusal names the existing
asset and links to its detail page; the refusal offers exactly those two
next steps and no "create anyway" or equivalent.

**FR10.6** The system shall not treat a serial/key collision across
different categories as a collision.
*Pass/fail:* a serial/key that exists in `hardware` but not in
`software-license` produces no warning and no block.

**FR10.7** The registration form shall not offer an assignee field.
*Pass/fail:* the registration screen contains no assignee input, and an
asset registered through it is `in-stock`.

### FR11 — Accessibility

**FR11.1** Every released screen shall satisfy the seven accessibility
commitments the release's wireframes record, applied to the new surfaces — the
dashboard tiles, the dialogs, and the fifth `discarded` status chip — with the
POC's existing chips not re-specified:
1. colour is never the only carrier of meaning;
2. every interactive element is reachable and operable by keyboard;
3. focus is visible and is never trapped outside a modal;
4. form errors are associated with their field;
5. structure is programmatic — one `h1` per screen, headings in order, the
   `header` / `nav` / `main` landmarks, and tables carrying a `<caption>` and
   a `scope` on each column header;
6. status changes are announced;
7. target size and contrast are adequate.

In addition, a skip link to bypass the top bar shall be the first focusable
element on every screen, and each released screen shall carry a per-screen
accessibility note naming its heading level, its primary landmark regions, and
its keyboard entry point. The numeric contrast thresholds are carried by
FR11.3's Level AA floor and are not restated as a separate commitment here.
*Pass/fail:* each released screen is checked against all seven commitments and
the skip-link requirement and passes each; each screen carries the per-screen
accessibility note naming its heading level, its primary landmark regions, and
its keyboard entry point.

**FR11.2** The detail screen's history sequence shall be navigable by
keyboard and shall convey its order to assistive technology.
*Pass/fail:* the history list is a semantic ordered list, and each entry is
reachable and readable in order.

**FR11.3** The system shall meet the Web Content Accessibility Guidelines
2.1, Level AA, as the accessibility floor for the release.
*Pass/fail:* an automated accessibility check of every released screen
reports no Level AA violation.

---

## Non-Functional Requirements

### NFR1 — Performance

**NFR1.1** The system shall report measured values for six quantities: the
dashboard's count retrieval and rendering; the assignee directory's grouping
and retrieval; the filtered asset-list's retrieval; the CSV generation for all
matching rows; the write and audit-entry completion time; and the SQLite
lock-wait behaviour under concurrent writes. The measure shall be taken against
a dataset specified by its properties — a row count at the top of the confirmed
medium scale band, a distribution of assets across all five status buckets, and
a holder set large enough to exercise the directory's grouping — and the
dataset's row count, bucket distribution and holder count shall be recorded
alongside the results.
*Pass/fail:* a recorded measurement exists for each of the six, taken against
a dataset satisfying those three properties, with the dataset's row count,
bucket distribution and holder count stated next to the result, and the
lock-wait measurement recorded alongside the five other quantities.

**NFR1.2** The system shall have acceptance ceilings set for the six
quantities of NFR1.1, derived from the measured baseline and approved by the
Product Owner, and shall not be considered to have met its performance
acceptance criteria until those ceilings are approved and the measured
values are at or under them. The recorded results shall include the
response-time percentiles and the export generation time, not a single
aggregate figure.
*Pass/fail:* the ceilings are recorded, approved, and met; and the recorded
results for the response-time quantities include their percentiles and for
the export include its generation time. (No numeric ceiling is stated here
because none has been fixed; see OQ5.)

**NFR1.3** The CSV export shall be validated against a representative
upper-end dataset, and shall never silently truncate its row set while doing
so.
*Pass/fail:* the export against the upper-end dataset produces the full row
set and remains within the approved export ceiling.

### NFR2 — Security

**NFR2.1** The system shall not accept an actor identity from the client.
*Pass/fail:* as specified in FR2.2.

**NFR2.2** The system shall not interpolate a user-supplied value into a
SQL statement; every query parameter shall be bound.
*Pass/fail:* inspection of the query layer shows no string interpolation of a
user value into SQL.

**NFR2.3** The system shall escape user-supplied values in rendered output.
*Pass/fail:* a name, note, model or serial containing HTML markup is rendered
as text, not as markup, on every surface that renders it.

**NFR2.4** The system shall not ship a credential, a token, a session
signing key, or a committed secret file, and shall make no outbound network
call.
*Pass/fail:* the production dependency tree contains no committed secret, and
the application opens no outbound connection.

**NFR2.5** Where the actor mechanism chosen for this release relies on a
browser-attached credential, the system shall refuse a state-changing request
that does not carry a recognised origin or a valid token.
*Pass/fail:* a state-changing POST without the credential is rejected, and a
route-level test asserts the rejection. (This requirement is conditional on
the mechanism and does not assert that the mechanism is a credential.)

**NFR2.6** The system shall serve its responses with the header
`X-Content-Type-Options: nosniff`, and shall not disclose the server
implementation through an `X-Powered-By` header.
*Pass/fail:* every response carries the `nosniff` header and no
`X-Powered-By` header.

**NFR2.7** The system shall refuse an attempt to update or delete an audit
entry, at the database level.
*Pass/fail:* as specified in FR2.7.

### NFR3 — Reliability

**NFR3.1** The system shall write the asset change and its audit append as
one transaction on every write path, so that no write can succeed without its
audit entry.
*Pass/fail:* as specified in FR2.5, verified on every write path.

**NFR3.2** The system shall treat a database-busy condition as retryable, and
shall map it to a retryable error code rather than to a generic failure. It
shall detect the condition from the driver's machine-readable error code
`SQLITE_BUSY`, and never by matching error message text.
*Pass/fail:* a busy condition surfaces as the retryable error code, and is
detected from `SQLITE_BUSY` rather than from error message text.

**NFR3.3** A historical backfill shall preserve every original record and its
audit traceability, shall be idempotent, and shall count and report its
failures with row identifiers and reasons in the migration's output. A
backfill failure is an existing audit row that cannot be given the
identifiable `system` actor **while preserving its original content and
traceability**.
*Pass/fail:* running the backfill twice produces the same state as running it
once; the reported failure count matches the number of rows that failed; and a
row whose original content or traceability cannot be preserved while being
given the `system` actor is counted as a failure and reported, rather than
being written with altered content.

**NFR3.4** A historical backfill shall fail the migration and prevent
deployment if any row fails to be given the identifiable `system` actor, and
shall roll the backfill transaction back.
*Pass/fail:* a backfill containing one failing row leaves the audit table
unchanged, the migration is reported as failed, and the deployment does not
proceed. A failed row is never silently skipped, deleted, overwritten, or
partially modified, and a human investigates before a retry.

**NFR3.5** The system shall survive the schema migration of the asset and
audit tables without losing any audit history.
*Pass/fail:* a database seeded with audit history, then migrated, still
contains every seeded audit row, with its content intact.

**NFR3.5a** The migration shall rebuild the audit table before the asset
table, and shall rebuild the audit table without its foreign-key clause,
re-adding the foreign key only after the asset table has been rebuilt. The
migration shall control the `foreign_keys` pragma explicitly, because the
migration runner can be invoked against a connection on which foreign keys
are off. This ordering is binding: dropping the asset table first fires the
audit table's `ON DELETE CASCADE` and destroys every audit row with the
transaction committed and no error raised, while the reverse order fails with
a foreign-key error.
*Pass/fail:* the migration's statements are ordered so that the audit table is
rebuilt first without its foreign-key clause and the foreign key is re-added
after the asset table is rebuilt; the migration sets the `foreign_keys` pragma
itself rather than inheriting it from the connection; and running the
migration against a database seeded with audit history leaves every seeded
audit row present.

**NFR3.6** The migration shall leave the database's foreign keys consistent
after it runs.
*Pass/fail:* the database's foreign-key check reports no violations after the
migration.

### NFR4 — Accessibility

**NFR4.1** The release shall meet the accessibility commitments stated in
FR11.1 as an acceptance gate on every released screen.
*Pass/fail:* see FR11.1.

### NFR5 — Scalability

**NFR5.1** The system shall remain a single-process application on a single
host with one local database file for this release.
*Pass/fail:* the release contains no additional deployment topology, no
container definition, and no infrastructure-as-code.

**NFR5.2** The shared counting definition shall be computed from the
database, and the application shall not load the full asset set into memory
in order to compute a count.
*Pass/fail:* the counting path issues a database query and returns an
aggregate, its returned row count is constant as the number of assets grows,
and the application-side memory used by the counting path does not scale with
the number of assets.

**NFR5.3** The asset list shall handle a dataset of the confirmed medium
scale — hundreds to low thousands of assets — without degradation that would
require pagination, which is deferred.
*Pass/fail:* the asset list renders the confirmed-scale dataset within the
approved ceiling from NFR1.1. (The point at which pagination becomes
necessary is a deferred trigger, recorded under `## Out of Scope`.)

### NFR6 — Testability

**NFR6.1** The existing POC test suite shall remain present and passing
throughout the release, and regression tests for newly approved behaviour
shall be added alongside it, never in place of it.
*Pass/fail:* the pre-existing tests are still present and pass; the new tests
are additional.

**NFR6.2** The release shall maintain a project-wide line-coverage floor of
80%, enforced by the tooling rather than observed.
*Pass/fail:* the coverage check fails the build when the measured line
coverage falls below 80%.

**NFR6.3** Every new test shall carry the identifier of the requirement it
verifies, in its title or its comment.
*Pass/fail:* each new test names a requirement identifier from this document.

**NFR6.4** The concurrency-safe uniqueness check and the two-table rebuild
shall have their tests written before the implementation that satisfies them.
*Pass/fail:* the two test files exist in the history before the corresponding
implementation commits.

**NFR6.5** A migration or rebuild fixture shall carry representative rows in
every table the migration touches, including audit history, and shall assert
the post-migration row count and the contents of those rows.
*Pass/fail:* the fixture contains audit rows, and the assertion checks both
their count and their content after the migration.

**NFR6.6** A test that asserts on an error shall assert on the error's
machine-readable code, and never on its message text.
*Pass/fail:* no new test matches on error message prose.

---

## Constraints

**C1 — The approved decision set and workbook are binding.** The approved
17-item Asset Tracker MVP decision set and the Asset Tracker MVP Development
Workbook are the binding technical and product contract for this release.
Neither is reopened at this or any later stage of this intent; a change
requires a new approval round.

**C2 — The scope boundary is fixed.** The release contents are fixed by the
confirmed scope. The deferred capability set and the explicitly out-of-scope
set are as recorded in `## Out of Scope`; nothing else is added, and no
deferred capability is pulled in.

**C3 — Existing POC behaviour is preserved by default.** POC behaviour the
MVP does not explicitly cover is preserved, except where it conflicts with
INV-1 (append-only history), INV-2 (five exclusive buckets), or INV-3 (one
shared counting definition). Every retirement of a POC behaviour is recorded
in `## Traceability`.

**C4 — Deployment target.** The release deploys to the same single internal
host as the POC, as a long-running Node process with a machine-local SQLite
file, launched with `PORT` and `DB_PATH` overrides. No staging environment,
no container, no infrastructure-as-code.

**C5 — Installation and deployment procedure.** Deployment installs with
`npm ci`, backs up the database in a WAL-aware way, applies migrations,
restarts the process, and smoke-tests. A deployment that does not pass the
smoke test is rolled back, not reported as successful. The rollback is
restoring the database from the pre-deploy backup and restarting the
previous commit, and is a documented manual procedure.

**C6 — Sign-off.** Every deployment to the host requires the product
owner's sign-off, and the deployment records the commit SHA it deployed.

**C7 — Workflow breadth and delivery capacity.** The release is delivered
through the full workflow breadth of the initiative by one developer, with no
deadline and no budget. The capacity constraint is unquantified, and skill
remediation is routed to the arrival of the work that depends on it.

**C8 — Layering.** Dependencies flow strictly downward — routes → services →
repositories → data access — with no cycles and no upward imports. The
release adds one new leaf layer that owns the shared domain vocabulary; it
depends on nothing but Node built-ins.

**C9 — Vocabulary single-sourcing.** The status set, the transition table,
the loss-reason vocabulary, the uniqueness comparison predicate, and the
shared count and filter definition shall each exist once and be consumed from
there. A vocabulary a template renders shall be supplied to the template as
render data rather than copied into the template.

**C10 — Audit action values are data.** Audit action values are hyphenated
strings. The four existing values are not renamed.

**C11 — The release's automated checks.** The release's automated checks run
in the order lint, test, coverage check, dependency audit. The dependency
audit is a blocking gate at the `high` severity level over the production
dependency closure. The checks run in a local pre-commit hook immediately and
in a hosted pipeline once a remote exists; the hosted pipeline is configured
before the MVP work merges.

**C12 — The formatter and the linter.** The release adopts Prettier at a line
width of 120 columns, matching the existing code, and ESLint with its
recommended rule set plus one documented exception scoped to the test files.
The formatter and linter configuration lands as its own first commit, before
any MVP work.

**C13 — The branch and commit model.** The trunk is renamed from `master` to
`main` before the MVP work starts. Feature branches are squash-merged, one
commit per delivered body of work. A change that alters behaviour and the
test that proves it land together in one commit and are never split.

---

## Assumptions

**A1 — The asset identity used for uniqueness is the serial or licence key
within a category.** *Rationale:* the POC's duplicate defence is
`UNIQUE (category, serial_or_key)`, and the confirmed answers keep the
category scoping and add trimming and case-folding to it.

**A2 — The two asset categories remain `hardware` and `software-license`
for this release.** *Rationale:* the categories are fixed by a database
constraint and mirrored in code, and no confirmed answer proposes changing
them.

**A3 — The asset scale for this release is hundreds to low thousands of
assets.** *Rationale:* the confirmed medium scale for the initiative.

**A4 — A holder is a free-text display name, not a person account.**
*Rationale:* the holder is entered as text today and no confirmed answer
introduces a person directory, an account, or a user record. This is why the
MVP's actor identity and its asset holder are separate concepts with
separate rules.

**A5 — An actor can be resolved to a stable, displayable identity without
introducing a person directory.** *Rationale:* the actor mechanism is
deferred, and the confirmed answers constrain only what must be true of any
mechanism.

**A6 — The asset edit capability can change an asset's category, and the
uniqueness check for such an edit runs against the new category.**
*Rationale:* the wireframes state that category and serial-or-key are editable
together deliberately, because the uniqueness definition is category-scoped, so
changing a serial's category changes which collisions are possible and the
inline check re-runs against the new category.

**A7 — A discarded asset's row and history remain queryable even though the
asset is out of the active inventory.** *Rationale:* INV-1 requires the row
and history to survive, and the detail URL remains reachable.

**A8 — The audit action vocabulary for this release is the four existing
values plus `recovered`, `discarded` and `edit`.** *Rationale:* the four
existing values are in use; the three new values correspond to the three
newly released capabilities.

**A8a — The `mark-lost` and `discard` transitions write the departing current
holder into the preserved previous-holder field.** *Rationale:* the display
holder rule requires a lost or discarded asset to remain attributable to the
person who last held it, and on `assigned` → `lost` and `assigned` →
`discarded` the prior holder is recorded for the first time by that
transition, so the write is a consequence of the transition rather than a
separate operation.

**A9 — The representative upper-end dataset for export validation can be
generated with the required properties** — a specified row count, a bucket
distribution, and a holder count — without a production-scale data set.
*Rationale:* the confirmed answer specifies the dataset by its properties
rather than by a fixed size, and the properties are constructible.

**A10 — The pre-MVP audit history can be attributed to the identifiable
`system` actor for every row.** *Rationale:* this is the premise of the
backfill requirement; if any row cannot be so attributed, NFR3.4 requires the
migration to fail rather than to proceed with a partial backfill.

**A11 — The migration's ordering constraint can be satisfied by rebuilding the
referencing table first, without its foreign-key clause, and re-adding the
foreign key afterwards.** *Rationale:* this is the one ordering verified to
preserve audit history; the alternatives destroy the history silently or fail
with a foreign-key error.

**A12 — The existing schema's indexes are re-issued by the migration that
rebuilds the tables.** *Rationale:* a table rebuild destroys the rebuilt
table's indexes, so the new migration must restore them itself.

**A13 — The four count-consuming surfaces can ship in one increment.**
*Rationale:* they are recorded as one indivisible group, and a group that
ships all but one of its members leaves the counts with no consistency
guarantee at all.

**A14 — The asset list's existing free-text search is retained as-is.**
*Rationale:* improved search is deferred, and no confirmed answer asks for a
change to the existing behaviour.

**A15 — The read-only "Acting as" indicator is shown on every screen
without asserting a mechanism.** *Rationale:* the mechanism is deferred, but
the layout reserves the place so the release does not need a layout change
when the mechanism is chosen.

**A16 — The holder directory's holders are derived from the asset rows
themselves rather than from a separate holder record.** *Rationale:* the
directory is a derived surface over the assets, and no holder record exists
or is proposed.

---

## Out of Scope

The two categories below are different in kind and the difference matters to
how this release is read, reviewed, and later extended.

**"Deferred to a later increment" means the capability is approved and not
rejected.** It is a decision about the release boundary, not about the
design. The capability keeps its approved standing, it is named as a
follow-on item, and it is expected to arrive in a later increment of the same
system. Nothing about this release forecloses it, and nothing in this
release's requirements pre-empt it.

**"Explicitly out of scope" means the capability is excluded from this
initiative's design entirely.** It is not a follow-on item, it has no
approved standing to carry forward, and it is not a thing that arrives
later merely because time passed.

Confusing the two would corrupt the scope record in both directions: a
reviewer who reads a deferred capability as rejected would drop approved
work that the initiative intends to deliver, and a reader who reads an
excluded capability as merely postponed would expect it to appear in a later
increment of this product and plan for it.

### Deferred to a later increment (not rejected)

Each item below is a named follow-on item with its approved standing intact.

- **Design system** — semantic colour tokens, a typography scale, spacing
  tokens, radius and shadow scales, iconography, and a light-theme
  implementation designed for later extension to a dark theme.
- **Responsive user interface.**
- **Improved search.**
- **Pagination, result counts, and the pager.** The trigger for this item is
  the asset count growing beyond the confirmed medium scale of hundreds to
  low thousands of assets.
- **Empty states.**

Two further edges of the approved transition table are also deferred, and
this needs stating precisely because they are a different kind of deferral
from the list above:

- **`in-stock` → `discarded`**
- **`returned` → `discarded`**

Both edges **remain approved edges of the section 4.1 transition table.** The
release draws and implements eight of the ten approved edges; these two are
named follow-on items whose approved standing is intact. The difference
between these two edges and the four legacy edges superseded by the amendment
is the release boundary, not the approved design. The eight released edges
are specified in FR3.2, and the fact that the release implements eight rather
than ten is a boundary statement — it is not a claim that the other two
edges were withdrawn.

For contrast, the two edges are also not *retired*. A retirement is a
different thing again, and the retirements in this release are recorded
precisely in `## Traceability`.

### Explicitly out of scope

- **Complex recovery workflows** — partial recovery, credit assignment, and
  dispute handling. Only the single included recovery transition is in
  scope.
- **Dark theme.** The design system's light-theme implementation is designed
  for future extension, but the dark theme itself is excluded.
- **Integration with any other system.**
- **Obligations imposed by an external regulatory framework.**
- **The POC's no-modification rule for stage 1.** It does not apply to this
  release, which does modify the system.
- **Scope changes beyond the approved set.** Any such change requires a new
  approval round.

### The difference, stated once more

The deferred set is approved work with a later delivery date. The
out-of-scope set is work this initiative does not do. A requirement reader
should be able to tell, from this document alone, which items are coming and
which are not — and for the deferred items, should be able to carry the
standing with them.

---

## Open Questions

Each of the following is unresolved. None is assumed answered in either
direction anywhere in this document, and no requirement above depends on
guessing one of them.

**OQ1 — Which actor-identity mechanism will the release use?** The
requirement is constrained (FR2.2, FR2.3, NFR2.5), but the mechanism itself
is not chosen. This is blocked on the open items that pair the actor decision
with the identity source, I-01 and I-03. *Named next action:* resolve the
identity source and the mechanism together, as one indivisible decision, and
record it as an architectural decision record before the foundation work is
built. *Impact if unresolved:* FR2.2, FR2.3 and NFR2.5 remain specified but
untestable end to end, and the foundation workstream cannot start.

**OQ2 — What is the records-retention policy for audit history and for
discarded assets?** This is the open item I-02. Until it is answered, no
retention or disposal behaviour is specified, and nothing in this release
destroys history. *Named next action:* obtain the retention decision.
*Impact if unresolved:* INV-1 and FR2.7 stand, and the release ships without
any disposal behaviour — which is a safe position but may not satisfy a
records obligation that this initiative has not yet heard about.

**OQ3 — How is an unquoted software licence cost handled?** This is the open
item I-04. The asset record has no cost field, and no confirmed answer adds
one. *Named next action:* determine whether a licence cost is in scope for
the asset record, and if so whether it is a quoted list price or an actual
paid amount. *Impact if unresolved:* no requirement in this document covers
cost, and none is invented here.

**OQ4 — Is the organisation ready to adopt the release?** This is the open
item R-02, the organisational adoption-readiness item. *Named next action:*
assess adoption readiness, including the operating procedures the release
depends on — the single-host deployment, the backup-and-restore procedure,
the manual rollback, and the actor-identity mechanism's operating
consequences. *Impact if unresolved:* the release can be built and deployed,
but its use by the target customer is not assured; the risk is recorded
rather than mitigated by code.

**OQ5 — What are the numerical performance acceptance ceilings for the six
quantities in NFR1.1?** Deliberately not fixed at interview: no ceiling was
invented, and the confirmed answer sets the ceilings from the measured
baseline and requires the Product Owner's approval. *Named next action:*
measure the six quantities against the dataset specified by its properties
(record the row count, bucket distribution and holder count alongside each
result), derive the ceilings from those measurements, and take them to the
Product Owner for approval. *Impact if unresolved:* NFR1.2 cannot be
satisfied, and the performance acceptance gate stays open.

---

## Traceability

The POC requirements below are the POC baseline for the four relationships
the initiative asked to be maintained. The relationship column states the
relationship precisely: what is extended, what is superseded, what changes
under an approved amendment, and what is a preserved behaviour.

| MVP requirement | POC requirement | Relationship |
|---|---|---|
| FR1.1, FR1.2, FR1.3, FR1.4, FR1.5, FR1.8, FR1.9 | **FR1.3** — "The system shall reject duplicate assets on `(category, serial-or-key)`." | **Changed behaviour under an approved amendment, not a retirement.** The POC requirement stands and is satisfied; the MVP widens it. The amendment surface (workbook section 4.1 and the uniqueness standing condition) extends the comparison to a trimmed, case-folded, category-scoped match, requires the same policy on registration and on serial/key updates, requires the application predicate and the unique index to share one definition, and requires the check to be concurrency-safe with a retryable busy condition. The underlying POC behaviour — rejecting a duplicate asset — is preserved and made stricter and safer. No POC behaviour is retired here. |
| FR3.2 (the `returned` → `assigned` and `returned` → `lost` edges), FR3.3, FR3.4 | **FR4.4** — "From `returned`, the valid transition is to `assigned` or `lost`." | **Preserved.** The POC requirement remains true in the release exactly as written: from `returned`, the transitions to `assigned` and to `lost` are legal and behave as specified, and no other edge from `returned` is legal in this release (FR3.2). The approved §4.1 transition table also lists `returned` → `discarded`, but that edge is **deferred** — it remains an approved edge with its standing intact and is not drawn or implemented by this release, so it does not widen the POC requirement in this release. |
| FR3.1, FR3.2 (the `lost` → `in-stock` edge), FR3.6, FR3.6a, FR3.7, FR3.8 | **FR4.5** — "`lost` is a terminal state." | **Superseded.** The POC requirement is directly contradicted by the release and cannot hold: the approved amendment surface adds the `lost` → `in-stock` recovery transition, and the release implements it (FR3.7). The `lost` state is no longer terminal. This is a retired POC requirement, retired by an approved amendment rather than by omission. The two edges the POC called illegal — `lost` → anything — are replaced by exactly one legal edge. |
| FR2.1, FR4.1, FR4.4, FR4.5 | **FR5.3** — "The full audit log shall not be exposed in the UI in the `poc`." | **Preserved.** The POC requirement remains true in the release: no system-wide audit log is exposed, the POC's deferral of a global log is not withdrawn, and the release adds no such screen (FR4.4). What the release changes is a different surface the POC requirement did not address — the *per-asset* rendering. The POC's asset detail screen showed only the most recent audit entry; the release shows the asset's complete audit sequence, newest first, with an actor on every entry (FR4.1, FR4.2, FR4.5). The POC's global-log deferral is preserved; the POC's latest-entry-only rendering is superseded. |
| FR1.3, FR10.7 | **FR1.2** — "The system shall accept optional fields: `model`, `notes`, `assigned-to` (employee name string)." | **Superseded in part.** Two of the three optional fields — `model` and `notes` — are preserved and remain accepted (FR10.1). The third, `assigned-to`, is **retired**: the release removes the assignee field from the registration form, and a registered asset has no holder until assignment happens as a separate, explicit action (FR1.3, FR10.7). This retirement is made by an approved amendment, not by omission. The release's holder is a free-text display name (assumption A4), not an employee-name field, and the asset's custody is recorded by the lifecycle transitions rather than at registration. |

Two POC requirements are retired by this release: **FR4.5** (`lost` is
terminal), retired by the approved `lost` → `in-stock` recovery transition, and
the `assigned-to` half of **FR1.2**, retired by the approved removal of the
registration-time assignee field. One POC requirement is superseded in part:
**FR5.3**, whose global-log deferral is preserved while its latest-entry-only
per-asset rendering is superseded. The remaining named POC requirements are
preserved, extended under an approved amendment, or changed in behaviour under
one. No other POC requirement is retired by this release. POC behaviour the MVP
does not explicitly cover is preserved by default (constraint C3).

---

## Sources Consumed

- `aidlc/spaces/default/intents/261106-asset-tracker-mvp/inception/requirements-analysis/requirements-analysis-questions.md`
  — the confirmed answers to questions Q1–Q20, the consolidated summary
  confirmation, and the recorded assumptions and open questions. The primary
  source for this document.
- `aidlc/spaces/default/intents/261106-asset-tracker-mvp/ideation/scope-definition/scope-document.md`
  — the release boundary, the three approved invariants, the deferred and
  out-of-scope split, and open items I-01 to I-04 and R-02.
- `aidlc/spaces/default/memory/project.md` — the `## Decided` record of the
  binding 17-item decision set and its seven standing conditions; the
  `## Mandated` and `## Forbidden` product-behaviour contracts.
- `aidlc/spaces/default/memory/team.md` (the practices-discovery stage's
  **team-practices** artifact) — the `## Testing Posture` section, whose
  affirmed `Methodology` and `Ordering` fields set the test-after posture and
  its two exceptions (the concurrency-safe duplicate check and the two-table
  rebuild, whose tests are written first), together with the `## Deployment`
  and `## Code Style` practice sections.
- `aidlc/spaces/default/intents/261106-asset-tracker-mvp/ideation/intent-capture/intent-statement.md`
  — the problem framing, the target customer, and the Audit Completeness
  metric with its section 24 qualifier.
- `aidlc/spaces/default/intents/261106-asset-tracker-mvp/ideation/rough-mockups/wireframes.md`
  and `.../user-flow.md` — the eight screens, the eight drawn transition
  edges and the two omitted ones, the display-holder rule, the per-holder
  chip rule, the CSV column set and sanitisation rule, the reason dialogs,
  the seven accessibility commitments, the count definitions, and the
  cross-cutting actor and shared-counting rules.
- `aidlc/spaces/default/intents/261004-poc/inception/requirements-analysis/requirements.md`
  — the POC requirement baseline, and specifically FR1.3, FR4.4, FR4.5 and
  FR5.3 as the traceability targets.
- `aidlc/spaces/default/codekb/assets_management/architecture.md` — the
  verified migration-ordering constraint, the platform constraints probed
  live, the absent capabilities, and the error-contract and transaction-safety
  findings.
- `aidlc/spaces/default/codekb/assets_management/code-structure.md` — the
  layering, the error-code contract and the assertion discipline, the SQL
  construction style, the view and `data-testid` idioms, and the test idiom.
- `aidlc/spaces/default/codekb/assets_management/api-documentation.md` and
  `.../business-overview.md` — the current endpoint surface, the current
  transition table and audit action vocabulary, and the current lifecycle
  side-effects.
