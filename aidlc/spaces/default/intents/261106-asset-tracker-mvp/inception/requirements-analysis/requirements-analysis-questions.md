# Requirements Analysis — Interview Questions

Stage: `requirements-analysis` (Inception, 2.3)
Intent: `261106-asset-tracker-mvp` — Asset Tracker MVP
Space: `default` · Scope: `feature` · Depth: `Standard`

This stage turns the approved release boundary into testable requirements. Most of
the ground is already settled: the approved 17-item decision set and the Asset
Tracker MVP Development Workbook are binding and are not reopened here, and the
scope document has already fixed the release contents, the three invariants, and
the four-surfaces count-consistency guarantee. The questions below therefore
target the decisions the upstream artifacts genuinely left open — the ones a
requirement cannot be written against until someone answers them. Have open:
the scope document (for the release boundary and the open items), the wireframes
and user flows (for the eight approved screens), and the architecture note in
the code store (for the two foreign-key questions and the migration ordering).

Two things are fixed and are not asked about anywhere in this file: the
actor-trust rule — every audit entry derives its actor from trusted server-side
context and never from anything the caller supplies — and the standing condition
that audit history is never destroyed.

---

## Q1 — What the requirements must say about actor identity

The mechanism that establishes the trusted actor is still undecided. The
feasibility stage carried forward four candidates — a server-configured single
operator, a trusted header from an authenticating proxy, an operator selection
control, and an application-managed login with a session — with
application-managed login as the leading candidate but explicitly not an approved
decision. Whether any trusted authentication mechanism exists in the
organisation is an open item that has not been answered in either direction.
The Approval and Handoff stage answered that this is the first action of
Inception, with the actor-independent work specified in parallel.

What must the requirements document state about actor identity?

- A. Only the rule — that the actor is resolved from trusted server-side context and a request-supplied actor is ignored — plus the requirement that the mechanism be chosen at the design stage, leaving the requirement mechanism-independent.
- B. The rule plus a named mechanism: the requirements commit to application-managed login and session now, and the design stage implements it.
- C. The rule plus the four-candidate shortlist, recorded as an explicit decision-pending list with the selection deferred, so the requirement is written so that any of the four can satisfy it.
- D. The rule plus the rule's consequences for the rest of the release: the audit entry's actor field, the actor's appearance on the history panel, the read-only "Acting as" indicator, and the cross-site-request-forgery protection that becomes required if the mechanism is a browser-attached credential.
- X. Other (please specify)

[Answer]: D

---

## Q2 — Whether the actor-identity mechanism is decided here or in a later stage

The scope document names the actor-identity decision as a blocking dependency of
the foundation workstream, and the foundation cannot be sized or planned until it
is resolved. The Approval and Handoff stage answered that the decision comes
first but that the actor-independent work proceeds in parallel.

Is the mechanism settled at this stage, or deferred with a named next action?

- A. Settled here, now, against the four candidates — this stage's answers decide it and the requirements are written against the chosen mechanism.
- B. Deferred to the Functional Design stage, with the requirements written mechanism-independently and the decision recorded as a named blocking dependency with a named owner and a named next action.
- C. Deferred to the Domain Design stage, on the grounds that the actor is a domain concept that belongs with the rest of the shared vocabulary.
- D. Deferred, and the requirements additionally state what must be true of whichever mechanism is chosen — for example, that the actor be resolvable to a stable, displayable identity, and that no client-settable field or header may be its source.
- X. Other (please specify)

[Answer]: D

---

## Q3 — The two foreign-key questions the code review left open

Removing the destructive cascade from the audit log leaves two schema choices
unmade. First, once the cascade is gone, deleting an asset row is blocked by the
foreign key whenever audit rows exist — a behaviour change from today, where the
delete silently succeeds and takes the audit rows with it. Second, the one
alternative that permits deletion while preserving the audit row relaxes the
audit row's asset reference from required to nullable. The release's own
invariant — an asset row and its history are never deleted — may make both
questions moot, but that has to be confirmed rather than assumed.

What should the requirements record about the audit log's reference to the asset
row?

- A. The requirement forbids deleting an asset row outright; the reference to the asset row stays required; deleting an asset is blocked by the database, and no application path offers one.
- B. The requirement forbids deleting an asset row outright; the reference to the asset row stays required; and the requirements also state that a deletion attempt is refused with a clear, machine-readable error rather than a bare database failure.
- C. The requirement forbids deleting an asset row outright, and the reference to the asset row becomes optional so that a deletion, if it ever happens, preserves the audit entry rather than destroying it.
- D. The requirements treat this as a design-stage decision and state only the behavioural rule — history is never destroyed — leaving the reference's nullability to the design stage.
- X. Other (please specify)

[Answer]: B

---

## Q4 — What "100% of audit entries carry an actor" is measured against

The primary success measure is Audit Completeness: every audit entry carries an
actor attribution, and history is never destroyed. Pre-MVP history is backfilled
to a `system` actor and is excluded from the measure. As written, the measure
does not say what population it is computed over, when it is evaluated, or what
counts as a failure.

How should the measure be written so that it can be tested?

- A. Over every audit entry written after the release ships — the population is defined by creation time, pre-MVP backfilled entries are excluded, and the criterion is that no post-release entry has an empty actor. The measure is evaluated as a standing assertion on every write path, with a named test that exercises each one.
- B. Over every audit entry in the database at any moment, including the backfilled ones, with the criterion that every entry has a non-empty actor and the `system` actor counts as an actor. The measure is evaluated as a periodic count against the whole table.
- C. Over every audit entry in the database at any moment, and the criterion is that every entry has an actor that is not the `system` placeholder, with the backfilled population excluded from the count rather than the entries being removed.
- D. Over every audit entry in the database at any moment, with the criterion that the number of entries lacking an actor is zero, the backfilled population excluded, and the measure evaluated both as a standing assertion on each write path and as a single countable check over the whole table.
- X. Other (please specify)

[Answer]: D

---

## Q5 — What the shared counting definition counts, and how a discarded asset is treated

One counting function behind one filter builder must serve the reconciliation
dashboard, the assignee directory, the asset list, and the CSV export, and all
four must agree. The wireframes fix Active Inventory as every bucket except
discarded, and Total Records as every asset row ever registered, so a discarded
asset leaves Active Inventory but stays in Total Records. The question left open
is what the shared definition counts as its unit, and how a holder's own counts
are defined for the directory.

How should the shared counting definition be written?

- A. It counts asset rows, never distinct values, so a filter matching N assets yields N on every surface. Active Inventory counts the in-stock, assigned, returned, and lost buckets; Total Records counts all five; and a discarded asset is in Total Records but not Active Inventory.
- B. It counts asset rows, and the definition additionally specifies the assignee directory's own counts — that a holder row is a distinct display holder, that the count line excludes the "Unassigned" row, and that a holder's per-bucket chips sum to that holder's row count.
- C. It counts asset rows and additionally states the filter builder's whole dimension set — search text, category, status, sort, direction — and that a count is always the number of rows matching the current filter, so that applying a filter changes every surface's count together.
- D. It counts asset rows, and additionally specifies that the count is evaluated over the same filter on every surface, so that the dashboard's unfiltered Total Records equals the asset list's unfiltered count line equals the export's row count equals the sum of the directory's holder row counts.
- X. Other (please specify)

[Answer]: B

---

## Q6 — The CSV export's file, its filter state, and its limits

The wireframes fix the export's scope (the rows the list is currently showing),
its columns (name, category, serial or key, status, holder, last holder), its
sanitising behaviour (every string cell that could be read as a formula is
prefixed), and its empty case (a header-only file). Not fixed: the file name, the
content type, the character encoding, whether the export's filter state is
captured in the file itself, and what happens at the upper end of the confirmed
scale of hundreds to low thousands of assets.

What does the export requirement additionally specify?

- A. The file name is fixed and predictable (for example, `assets-export.csv`), the content type is fixed, the encoding is fixed, and the export is capped so that a result beyond the cap is refused with a clear message rather than truncated silently.
- B. Only the file name and the content type are specified; the export is uncapped, because the confirmed medium scale — hundreds to low thousands of assets — does not need a cap, and the export is expected to complete well within an acceptable time at that scale.
- C. Only the file name and the content type are specified, and the requirement additionally states that the exported file records the filter that produced it, so a spreadsheet user can tell what the file contains.
- D. The file name and the content type are specified, the export is uncapped, and the requirement additionally states that the export must carry the same header row and column order as the list, so that a spreadsheet's columns line up with the screen's.
- X. Other (please specify)

[Answer]: B, with the specified detail. This answer **supersedes option A's capping clause**: the export is uncapped, and the requirement states that an export is never silently truncated. Predictable filename `assets-export.csv`; content type `text/csv; charset=utf-8`; UTF-8 encoding. Uncapped for the approved medium-scale planning assumption (hundreds to low thousands of assets). It exports all rows matching the current list filters and never silently truncates; performance must be validated against representative upper-end data. The approved column names and order are preserved. The exported file does not embed filter metadata — the export scope is the current list's filter state. The header-only file is kept for zero matching rows, and the approved formula-injection sanitisation applies to every cell.

---

## Q7 — What counts as a duplicate, and what the user sees

The rough mockups chose two surfaces: an inline warning under the serial-or-key
field as the administrator types, and a submit-time collision block. Both are
drawn against a comparison that is case-insensitive, whitespace-trimmed, and
scoped to the selected category, and the approved standing condition requires the
database's functional index and the application's comparison to use one shared
definition, with registration and serial-or-key edits enforcing the same policy.
The open part is the comparison's exact normalisation and the collision
message's contents.

What exactly counts as a collision, and what must the warning say?

- A. A collision is an existing asset in the same category whose serial or key, after trimming surrounding whitespace and comparing without regard to case, matches the one being entered. The warning names the colliding asset, offers a link to it, and the asset being edited is excluded from its own comparison.
- B. As A, and the shared definition additionally normalises internal whitespace runs to a single space, so that `SN 4471` and `SN  4471` are the same asset.
- C. As A, and the warning additionally states what to do next — either open the existing asset or change the serial — with no option to create the asset anyway.
- D. As A, and the requirement additionally specifies that the same normalised comparison is what the database's unique index enforces, so that the check the user sees and the check that rejects the write cannot disagree.
- X. Other (please specify)

[Answer]: A, with the specified detail. A collision exists when another asset in the same category has a serial or key matching after trimming surrounding whitespace and case-insensitive comparison. The asset currently being edited is excluded from its own collision check. The inline warning and the submit-time collision block identify the existing asset and provide a link to open it, and explain the next steps: open the existing asset or change the serial/key. There is no override to create a duplicate. The application's comparison and the database's functional unique index enforce exactly the same normalisation and category-scoped uniqueness definition; the database remains authoritative under concurrent requests.

---

## Q8 — What editing an asset may change, and what it records

Asset editing is a release must-have and the wireframes drew it, but the flow
set has no journey covering it — the mockups stage noted that gap. The
wireframes fix that status is not editable there, that category, name,
serial-or-key, model, and notes are, and that a successful save appends an
`edit` entry naming the fields that changed and their previous values. Not
fixed: what the change history looks like in detail, and whether an edit that
changes nothing is recorded.

What does the edit requirement specify about what a save records?

- A. A save appends one history entry whose description names each changed field and its previous value; a save that changes nothing appends no entry, because nothing happened.
- B. A save always appends one history entry, whether or not anything changed — an entry whose description names the changed fields and their previous values, and says "no fields changed" when nothing did.
- C. A save appends one history entry per changed field, each naming that field and its previous value.
- D. A save appends one history entry naming the changed fields and their previous values, and the requirement additionally states that the asset's status and its current and last holder cannot be changed by an edit, so that the edit screen is not a second path into the lifecycle.
- X. Other (please specify)

[Answer]: D

---

## Q9 — Which accessibility criteria are in scope for this release

WCAG 2.1 Level AA was accepted at the rough mockups stage as the design floor,
and the wireframes recorded that the floor applies to the new surfaces — the
dashboard tiles, the dialogs, and the fifth status chip — while the POC's
existing chips are not re-specified. The design system and responsive UI are
deferred to a later increment, which constrains what an accessibility requirement
can reasonably ask for here.

What does the accessibility requirement ask for?

- A. The seven commitments the wireframes already state — colour is never the only carrier of meaning, every interactive element is reachable and operable by keyboard, focus is visible and never trapped outside a modal, form errors are associated with their field, structure is programmatic, status changes are announced, and adequate contrast and target sizes — applied to the new surfaces, with a skip link as the first focusable element on every screen.
- B. As A, and additionally a per-screen statement of heading level, primary landmark regions, and keyboard entry point, which the wireframes already carry as per-screen notes.
- C. As A, and additionally the requirement that every interactive element is a native control rather than a styled container — because the POC's markup is already semantic, so this is a constraint rather than new work.
- D. As A, and additionally a named contrast ratio and target-size minimum, so that the requirement is measured rather than described.
- X. Other (please specify)

[Answer]: B

---

## Q10 — The measurable performance targets at the confirmed scale

The confirmed scale is medium — hundreds to low thousands of assets across
several internal teams. The release adds a dashboard that reads several counts,
a directory that groups assets by holder, and an export that writes every matching
row. The application is synchronous and server-rendered on a single host with a
machine-local database file. No upstream artifact states a timing or size target,
so "fast" is not currently testable.

What measurable targets should the requirements carry?

- A. Specific response-time ceilings for the four count-consuming surfaces, a ceiling for how long a single write takes including its audit entry, and a ceiling on the export's size and generation time — each stated at the confirmed medium scale, with the scale figure stated alongside so the target is not read as a general guarantee.
- B. Only response-time ceilings for the four count-consuming surfaces, measured at the confirmed medium scale; the export and the write path are left to the operation phase's performance validation, because the release has no performance-testing harness yet.
- C. Only a ceiling on concurrent writers — how many administrators may write at once before the application refuses further work with a retryable error — because the single-writer database model is the release's real concurrency constraint and everything else is fast by construction.
- D. A ceiling on the time a write waits for the database lock before it is refused with a retryable error, and a ceiling on the number of assets the list view and the export must handle without paging — the two places the confirmed medium scale could actually be exceeded.
- X. Other (please specify)

[Answer]: No fixed response-time or export-size ceilings are invented without a measured baseline. The requirements establish measurable performance acceptance at the confirmed planning scale — several internal teams, hundreds to low thousands of assets, with representative upper-end data — and require measuring and reporting: dashboard count retrieval and rendering; assignee directory grouping and retrieval; filtered asset-list retrieval; CSV generation for all matching rows; write and audit-entry completion time; and SQLite lock-wait behaviour under concurrent writes. Response-time percentiles, export generation time, and write latency are recorded during representative performance validation. The export must not silently truncate. SQLite lock contention must follow the approved retryable SQLITE_BUSY behaviour. Explicit numerical acceptance ceilings are set from the measured baseline and approved by the Product Owner before performance validation is treated as passed; those ceilings are not presented as existing commitments.

---

## Q11 — What the backfill must report when it fails

Pre-MVP history is backfilled in place with a `system` actor, and the original
records are preserved. The standing conditions require backfills to preserve
original records and audit traceability and to report failures. The requirement
has to say what "report failures" means concretely: what a failure is, where the
report goes, and what happens to the rows that failed.

What does the backfill requirement specify about failure reporting?

- A. A failure is a row that cannot be given a `system` actor or whose existing content cannot be preserved. Failures are counted and listed — by row identifier and reason — in the migration's own output, the migration completes without aborting the release, and the failed rows are left exactly as they were rather than partially written.
- B. A failure aborts the migration and rolls it back entirely, so that a half-backfilled audit history never reaches the release.
- C. Failures are counted and reported in the migration's output, and a non-zero failure count fails the migration so that the deployment stops and a human intervenes before anything ships.
- D. As A, and the requirement additionally states that the backfill is idempotent — running it again over an already-backfilled history changes nothing and reports zero failures.
- X. Other (please specify)

[Answer]: A backfill failure occurs when an existing audit row cannot be given the identifiable `system` actor while preserving its original content and traceability. The migration preserves every original audit record and its existing content; is idempotent, so rerunning a completed backfill makes no further changes and reports zero failures; counts and reports failures with the affected row identifiers and specific reasons in the migration output; fails the migration and prevents deployment if any row fails; rolls back the backfill transaction so no partially completed backfill is committed; and never silently skips, deletes, overwrites, or partially modifies failed rows. A human investigates and resolves the failure before the migration is retried.

---

## Q12 — The two approved discard edges the release does not draw

The approved transition table has ten edges between the five status buckets. The
wireframes draw eight, and the mockups stage deliberately omitted two — from
stock directly to discarded, and from returned directly to discarded — on the
grounds that a discard resolves a live assignment inline and neither of those
source states holds one. The mockups stage recorded this as an open question for
the scope stage rather than deciding it, and the scope document does not name
those two edges as either released or deferred.

Where do those two edges land for this release?

- A. Deferred, with their approved standing intact, and named as follow-on items — the same treatment the deferred design system, responsive interface, improved search, paging, and empty states received.
- B. Released, so the transition table the requirements state matches the approved table exactly, with the discard resolving the assignment inline in the same way as the released edge.
- C. Released, but only from returned to discarded — from returned still has a preserved last holder to show — while from stock to discarded stays deferred.
- D. The requirements state the release's eight edges and record the two omitted edges as an explicit, named boundary in the requirements' own out-of-scope section, so a later reader sees the difference rather than inferring it.
- X. Other (please specify)

[Answer]: D

---

## Q13 — What the requirements say about retaining custody records

Whether an internal records-retention or disposal schedule applies to asset
custody records is an open item, carried unresolved and explicitly not assumed
either way. The compliance question was answered as a general internal audit
expectation with no external framework imposed, but the adjacent records
question was left open because the two are different questions. It affects how
long audit history is kept, which sits inside the release's own promise that
history is never destroyed.

What do the requirements say about how long custody records are kept?

- A. Audit history is kept indefinitely for the life of the application, and the requirement states that no expiry, archival, or disposal behaviour exists for custody records — the absence is a stated decision rather than an omission.
- B. The requirements state the retention rule as an open item with a named next action, and state that until it is answered, no retention or disposal behaviour is specified and history is not destroyed.
- C. The requirements state a retention period now — for example, a fixed number of years after the asset is discarded — and note that the period is provisional pending the open records question.
- D. The requirements defer the retention rule entirely to the operation phase, on the grounds that retention is an operational concern rather than a product one.
- X. Other (please specify)

[Answer]: B

---

## Q14 — The display-holder rule the assignee directory's counts depend on

Q5 answered what the directory's counts *are* — that a holder row is a distinct
display holder, that the count line excludes the "Unassigned" row, and that a
holder's per-bucket chips sum to that holder's row count. It did not answer
*which assets land under which holder row*, and no other answer in this file
does either.

The wireframes fix that rule: **an asset's display holder is its current holder
if it has one, and otherwise its preserved last holder; an asset that has never
been held by anybody has no display holder at all.** The "Unassigned" row holds
only the never-held assets. This is load-bearing rather than incidental. The
release adds a recovery transition that leaves an asset `in-stock` while
retaining its last holder, and a discard that resolves the assignment while
keeping the last holder. Under a naive rule in which an unassigned asset falls
into "Unassigned", every recovered and every discarded asset would move into that
row and the directory's counts would disagree with the asset list's — the exact
defect the shared-counting group exists to remove.

Where does the requirements document state this rule?

- A. The requirement states the display-holder rule as the single definition
  used by the directory — current holder, else preserved last holder, else no
  holder — and states that the "Unassigned" row contains exactly the assets
  that have never been held by anybody.
- B. As A, and the requirement additionally states that the rule applies
  identically on every count-consuming surface, so no surface groups by current
  holder alone.
- C. As A, and the requirement additionally states that the directory's holder
  rows are disjoint and together cover every asset in the directory, so every
  asset appears exactly once.
- D. As A, and the requirement additionally states the consequence for the
  release's two new transitions: a recovered asset and a discarded asset are
  each counted under their preserved last holder and not in "Unassigned",
  because both retain `last_assigned_to`.
- X. Other (please specify)

[Answer]: D

---

## Q15 — Which bucket the two omitted discard edges are recorded in

Q12 answered that the requirements state the release's eight edges and record
the two omitted edges as an explicit, named boundary **in the requirements' own
out-of-scope section**. The answer picked the location, and the location
carries a standing that the answer did not address.

The scope document keeps two separate kinds of "out" apart, and the distinction
is load-bearing. Its section A is *"Deferred to a later increment (not
rejected)"*, and every item there is called a **named follow-on item** that
*"keeps its approved standing"*. Its section B is *"Explicitly out of scope"*,
and every item there is out — complex recovery workflows, a dark theme, an
external regulatory framework. The wireframes are explicit about the two edges:
*"Both stay in the approved decision set; nothing here withdraws, reclassifies,
or defers them"*, and they are carried with *"their approved standing intact"*.
They are approved edges of the §4.1 transition table that this release happens
not to draw. The scope document names neither edge in either of its two
sections, so this stage is placing them for the first time.

Which bucket do they belong in?

- A. The requirements' boundary section distinguishes the two kinds of "out",
  and the two edges are recorded as **deferred — approved but not in this
  release, standing intact, named as follow-on items** — matching how the scope
  document treats the deferred design system, responsive UI, improved search,
  paging, and empty states.
- B. The two edges are recorded as explicitly out of scope, as Q12's answer
  directs, accepting that this reads as a rejection rather than a deferral.
- C. The two edges are recorded as deferred **and** the requirements state
  explicitly that they remain approved edges of the transition table, so a
  later reader sees that the difference is the release boundary and not the
  approved design.
- D. The requirements state the release's eight edges and record the two
  omitted edges in the requirements' **open questions** rather than in either
  out-of-scope bucket, on the grounds that the mockups stage raised the release
  boundary question rather than settling it.
- X. Other (please specify)

[Answer]: C

---

## Q16 — The traceability link to POC FR1.3

The standing condition requires traceability between the approved MVP
requirements and POC requirements FR1.3, FR4.4, FR4.5, and FR5.3. Three of the
four link cleanly. FR1.3 does not, because the MVP **narrows** what it accepts
while FR1.3 is written as an exact-match rule.

POC FR1.3 reads: *"The system shall reject duplicate assets on
`(category, serial-or-key)`."* Read literally, that is an exact, case-sensitive
comparison on the stored value. The MVP's rule, as Q7 answered it, is a
case-insensitive comparison after trimming surrounding whitespace — so the MVP
rejects a **superset** of what FR1.3 requires. That is the defect the intent
statement names: *"serial or key uniqueness is case-sensitive and does not
survive surrounding whitespace, so the same physical asset can be registered
twice."*

The traceability link therefore cannot simply point at FR1.3 and validate
against it, because an implementer reading FR1.3 literally would build
exact-match rejection — the behaviour the release exists to remove.

How does the requirements document record this?

- A. The requirements state FR1.3 as **superseded** by the MVP's normalised
  uniqueness requirement, with the supersession recorded as one of the
  retirements the approved invariants permit, and the traceability link points
  from the new requirement to FR1.3 as its predecessor.
- B. The requirements state FR1.3 as **amended** rather than superseded — its
  subject survives but its rule is restated in the normalised form — and the
  traceability link records the amendment explicitly.
- C. The requirements restate the normalised uniqueness rule as its own
  requirement and record FR1.3's traceability as **changed behaviour under an
  approved amendment**, citing the workbook §4.1 amendment surface that
  carries the uniqueness policy, without characterising it as a retirement.
- D. The requirements state FR1.3 as preserved-and-extended — the POC's
  category-scoped uniqueness stands and the MVP adds normalisation on top of it
  — and the traceability link records that the MVP rejects a superset of what
  FR1.3 requires.
- X. Other (please specify)

[Answer]: C

---

## Q17 — What "an audit entry lacking an actor" means as a value test

Q4 answered what population the Audit Completeness measure is computed over:
every audit entry in the database at any moment, with the backfilled population
excluded, and the criterion that the number of entries lacking an actor is
zero. The criterion's predicate was not defined, and it is the metric's
pass/fail test.

The candidates differ in a way that changes the answer: an empty string; a
NULL; either of those; or the `system` sentinel. This matters because the
backfill writes `system` into the actor field of the pre-MVP rows, and because
the `system` value is what identifies the excluded population. If a row
backfilled to `system` counts as "lacking an actor", the excluded population
has to be removed from the check as well as from the denominator; if it counts
as having one, the exclusion may be only a denominator exclusion. The two
readings give different results for a row the backfill failed to complete.

How does the requirement define it?

- A. An audit entry "lacks an actor" when its actor field is NULL or empty; the
  `system` sentinel is a populated actor value, so a backfilled row counts as
  having an actor, and the backfilled population is excluded from the metric's
  population as the §24 amendment requires.
- B. An audit entry "lacks an actor" when its actor field is NULL, empty, **or**
  the `system` sentinel; the check is therefore run over the post-release
  population only, and the backfilled rows are excluded from the metric
  entirely.
- C. The requirement defines the predicate as: the number of audit entries in
  the measured population whose actor is neither NULL, nor empty, nor the
  `system` sentinel, is zero — with the measured population being every entry
  except the backfilled ones — and the backfill's own success is separately
  asserted by the backfill requirement.
- D. The requirement states that the actor field is **not nullable** in the
  rebuilt table, so "lacking an actor" reduces to a single test — the field
  being empty — and the `system` sentinel is simply a value that satisfies it.
- X. Other (please specify)

[Answer]: A

---

## Q18 — How the Audit Completeness check identifies the population it excludes

Q4 required the measure to be evaluated "as a single countable check over the
whole table, with the backfilled population excluded". Q17 defined what
"lacking an actor" means — the actor field is NULL or empty, and the `system`
sentinel is a populated actor value. Between them, the metric's predicate is
fixed, but its **population selector** is not: a check that runs "over the
whole table" while excluding the backfilled population needs to identify that
population at check time, and the answers give it no marker.

The wireframes come closest: the `system` actor is "displayed as a distinct
actor rather than hidden or relabelled, because the Audit Completeness metric is
measured against a stated population that excludes it". That states *why* the
sentinel is visible, not what the check keys on. Two implementations diverge
precisely on the case Q17's own stem raises — a row the backfill failed to
complete: one excludes rows whose actor is `system`; another excludes rows
created before the release by timestamp or by a backfill marker column.

How does the requirement identify the excluded population?

- A. The excluded population is identified by its actor value: a row whose actor
  is the `system` sentinel is a backfilled row and is excluded. The countable
  check therefore runs over the whole table and excludes exactly the
  `system`-actor rows, which is why the sentinel is stored distinctly rather
  than hidden or relabelled.
- B. The excluded population is identified by a dedicated marker recorded by
  the backfill itself — for example a flag or the backfill's own timestamp on
  each row it rewrote — so the exclusion does not depend on the actor value
  being exactly `system`.
- C. The requirement states both: the `system` actor value **is** the marker,
  and a row the backfill failed to complete — one whose actor is still NULL or
  empty — **is** inside the measured population, because it was not successfully
  backfilled and therefore cannot be identified as pre-MVP history.
- D. The requirement states that the exclusion is **denominator-only**: no row
  is removed from the numerator test, because under Q17's predicate a `system`
  row never "lacks an actor" in the first place; the exclusion removes
  backfilled rows from the population the metric is computed over and from
  nothing else.
- X. Other (please specify)

[Answer]: C

---

## Q19 — The stored serial or key, and the form the comparison normalises

Q7 answered the comparison: case-insensitive, after trimming surrounding
whitespace, scoped to category, with the application's predicate and the
functional index enforcing exactly the same normalisation. It specified the
comparison's normalisation but not the **stored** form, and Q16's own premise
rests on it — FR1.3 reads as an exact, case-sensitive comparison "on the stored
value", which is only true if the stored value keeps the user's original
casing and whitespace.

The choice is not cosmetic. It decides whether the functional unique index is
`lower(trim(serial_or_key))` over the existing column or needs a normalised
generated column to index, and it decides what the asset list, the detail
screen, and the CSV export display — the user's original input, or a normalised
form.

What does the requirement state about the stored value?

- A. The stored serial or key is **the user's input as typed**, and normalisation
  — trimming and case folding — is applied only in the comparison predicate and
  in the functional index expression. The system displays and exports the value
  as the user supplied it.
- B. The stored serial or key is **the normalised form** — trimmed, with case
  folded — so that the column itself is canonical and the index expression
  reduces to a uniqueness constraint over the column. The system displays and
  exports the normalised value.
- C. The stored serial or key is **the user's input as typed**, and the
  requirement additionally states that two inputs which normalise to the same
  value are treated as one asset for display purposes as well — the first one
  registered keeps the stored value and the later one is refused as a
  collision, so the displayed value is whichever was registered first.
- D. The requirement leaves the stored form to the design stage and states only
  the binding constraint — that the comparison predicate and the index
  expression must normalise identically, whichever form is stored.
- X. Other (please specify)

[Answer]: A

---

## Q20 — The dataset the performance measure runs against

Q10 settled that no numerical ceilings are invented without a measured
baseline, and that six named quantities are measured and reported at the
confirmed planning scale — several internal teams, hundreds to low thousands
of assets. The **dataset** those measures run against was left as "representative
upper-end data", which two implementers would generate differently: one seeds
two thousand assets and one seeds two hundred, both satisfy the phrase, and the
resulting baselines and ceilings differ accordingly.

The measure is the release's only performance evidence, so the dataset has to
be reproducible enough that the numbers mean the same thing to the person who
reads them.

What does the requirement state about the dataset?

- A. The requirement states the dataset by its properties rather than by a
  seed script: the row count at the top of the confirmed medium scale band, a
  distribution of assets across all five status buckets, and a holder set
  large enough that the directory's grouping is exercised — so any team
  generating a dataset to these properties measures the same thing.
- B. The requirement names a specific row count and a specific distribution
  across the five buckets, so the dataset is a fixed, reproducible figure rather
  than a set of properties.
- C. The requirement states the properties (as A) and additionally requires the
  dataset to be **recorded alongside the results** — the row count, the bucket
  distribution, and the holder count — so a later reader can tell what was
  measured even if the dataset is not reproducible from the requirement alone.
- D. The requirement states the properties (as A) and additionally requires the
  measure to be run at **two** points — the bottom and the top of the confirmed
  scale band — so the results show how the quantities behave across the range
  rather than at a single figure.
- X. Other (please specify)

[Answer]: C

---

## Assumptions & Open Questions

- [assumption] The approved 17-item decision set and the Asset Tracker MVP Development Workbook remain the binding technical and product contract, and this stage neither reopens them nor derives requirements that contradict them. The seven standing conditions — the uniqueness check inside an immediate transaction with a non-zero busy timeout and a retryable error on a locked database, the one shared uniqueness definition used by both the functional index and the application's comparison, the same uniqueness policy on registration and on serial-or-key edits, backfills that preserve original records and report failures, one shared counting definition across the four count-consuming surfaces, explicit validation and audit behaviour on every lifecycle transition, and the preserved existing test baseline with regression tests added alongside it — are carried into the requirements as fixed.
- [assumption] The actor-trust rule is fixed and is not reopened by any question in this file: every audit entry derives its actor from trusted server-side context, and actor information supplied in a write request is ignored rather than rejected or sanitised. No client-settable field or header may be the actor's source. What remains open is the mechanism, and the requirement is written so that the rule — not any one mechanism — is what is tested.
- [assumption] The release boundary is the audit and lifecycle floor plus the five operator-facing must-haves — the reconciliation dashboard, the assignee directory, CSV export, asset editing, and duplicate detection. The design system, responsive interface, improved search, paging, and empty states are outside this release and remain named follow-on items.
- [assumption] Within the deferred "paging and result counts" item, the count lines are in the release and the pager is not. The count lines are reads from the shared counting function, and a consistency guarantee that cannot be seen cannot be checked; the page controls are presentation work that the later increment re-does alongside the design system.
- [assumption] The eight approved screens and their states are as drawn in the rough mockups, and the mapping from those eight screens onto the workbook's section 9 screen numbers is settled here, because the section 9 amendments attach to specific screen numbers.
- [assumption] The two approved discard edges that the wireframes do not draw — `in-stock → discarded` and `returned → discarded` — are deferred rather than rejected: they are recorded as approved edges of the §4.1 transition table that this release does not draw, as named follow-on items whose approved standing is intact. The requirements' boundary section distinguishes the two kinds of "out" — deferred and standing intact, versus explicitly out of scope — so the two edges are recorded in the deferred bucket and the requirements state explicitly that they remain approved edges of the transition table.
- [assumption] The loss-reason vocabulary, the discard reason's retirement-specific additions, and the fixed audit action vocabulary — including a distinct recovered action separate from assign and return, a discarded action that records the prior holder and the inline resolution of the assignment, and an edit action — are the release's shared domain vocabulary, and the requirement for each write path names the action it records.
- [assumption] The error vocabulary gains a retryable code, because the locked-database mapping requires one, and every code in the vocabulary must be mapped to a response status so that an unknown-state asset does not surface as a server fault.
- [assumption] The asset write and its audit entry are one transaction, so that a failure cannot leave a changed asset with no history, and the append-only guarantee is enforced by database triggers rather than by application code.
- [assumption] The testing posture is as affirmed at the practices-discovery stage: tests written after the implementation, except for the concurrency-safe duplicate check and the two-table rebuild, whose tests are specified before the code that satisfies them. The existing passing test baseline is preserved and the newly approved behaviour is tested alongside it, with every new test carrying its requirement identifier.
- [assumption] The migration's ordering constraint is a requirement, not an implementation detail: the audit table is rebuilt without its foreign-key clause before the asset table is rebuilt, and the foreign key is re-added afterwards, because the opposite order destroys every audit row silently with the transaction committed and no error raised.
- [assumption] The remaining open items are carried forward unresolved and are not assumed in either direction: whether any trusted authentication mechanism exists in the organisation, which determines whether application-managed sessions are necessary or merely the fallback; whether an internal records-retention or disposal schedule applies to custody records; the unquoted licence cost; and organisational adoption readiness, which is a rollout risk rather than a scope defect.
- [assumption] The asset's display holder — the single definition that assigns an asset to a holder row in the assignee directory — is fixed by the wireframes and is carried into the requirements: the current holder if the asset has one, otherwise its preserved last holder, and no holder at all if the asset has never been held. The "Unassigned" row therefore contains exactly the assets that have never been held by anybody. The release's two new transitions both retain `last_assigned_to`, so a recovered asset and a discarded asset are each counted under their preserved last holder and not in "Unassigned". This matters because the shared-counting guarantee only holds if every surface groups by the same rule.
- [assumption] The Audit Completeness metric's population selector is the `system` actor value: a row whose actor is `system` is backfilled pre-MVP history and is excluded from the measured population, which is why the sentinel is stored distinctly and displayed distinctly rather than hidden or relabelled. A row the backfill failed to complete — one whose actor is still NULL or empty — is inside the measured population, because it was not successfully backfilled and therefore cannot be identified as pre-MVP history. The `system` sentinel is a backfill placeholder rather than a resolved actor identity, so it sits outside the actor-identity constraint that a runtime actor be resolvable to a stable, displayable identity.
- [assumption] The serial or key is stored as the user typed it. Trimming and case folding are applied only in the comparison predicate and in the functional index expression, so the application's check and the database's index enforce exactly the same normalisation over the same stored value, and the list, the detail screen, and the CSV export all display the value the user supplied.
- [assumption] The performance measure's dataset is specified by its properties rather than by a seed script — the row count at the top of the confirmed medium scale band, a distribution of assets across all five status buckets, and a holder set large enough to exercise the directory's grouping — and the dataset's row count, bucket distribution, and holder count are recorded alongside the measured results. The numerical acceptance ceilings are set from the measured baseline and approved by the Product Owner before performance validation is treated as passed; they are not presented as existing commitments.
- [assumption] The CSV export is uncapped. The export never silently truncates: it writes every row matching the current list filters, produces a header-only file when no row matches, and preserves the approved column names and order. The export's scope is the current list's filter state, and the file carries no embedded filter metadata.

---

## Consolidated Summary Confirmation

- **Actor identity (Q1, Q2).** The requirement states the actor-trust rule and its
  consequences for the release: the actor's field on the audit entry, its appearance
  on the history panel, the read-only "Acting as" indicator, and cross-site-request-
  forgery protection where the chosen mechanism is a browser-attached credential. The
  mechanism itself is deferred with a named next action, and the requirements state
  what must be true of whichever mechanism is chosen — the actor is resolvable to a
  stable, displayable identity, and no client-settable field or header may be its
  source. The rule, not any one mechanism, is what is tested.
- **Audit log's reference to the asset row (Q3).** Deleting an asset row is forbidden
  outright; the audit row's reference to the asset stays required; a deletion attempt
  is refused with a clear, machine-readable error rather than a bare database failure.
- **Audit Completeness (Q4, Q17, Q18).** The measure is over every audit entry in the
  database at any moment. An entry "lacks an actor" when its actor field is NULL or
  empty; the `system` sentinel is a populated actor value. The backfilled population
  is identified by its actor value — a `system`-actor row is backfilled pre-MVP
  history and is excluded — and a row the backfill failed to complete is inside the
  measured population, because it cannot be identified as pre-MVP history. The measure
  is evaluated both as a standing assertion on each write path and as a single
  countable check over the whole table.
- **Shared counting (Q5, Q14).** One counting function behind one filter builder
  serves the dashboard, the assignee directory, the asset list, and the CSV export.
  It counts asset rows. A holder row is a distinct display holder; the count line
  excludes the "Unassigned" row; a holder's per-bucket chips sum to that holder's row
  count. An asset's display holder is its current holder if it has one, otherwise its
  preserved last holder, and no holder at all if it has never been held — so
  "Unassigned" contains exactly the never-held assets, and a recovered asset and a
  discarded asset are each counted under their preserved last holder.
- **CSV export (Q6).** Uncapped — this supersedes option A's capping clause. The file
  name is `assets-export.csv`; the content type is `text/csv; charset=utf-8`; the
  encoding is UTF-8. The export writes every row matching the current list filters
  and never silently truncates; performance is validated against representative
  upper-end data. The approved column names and order are preserved; the file carries
  no embedded filter metadata; a zero-row filter produces a header-only file; and the
  approved formula-injection sanitisation applies to every cell.
- **Duplicate detection (Q7, Q19).** A collision is another asset in the same category
  whose serial or key matches after trimming surrounding whitespace and comparing
  without regard to case; the asset being edited is excluded from its own check. The
  inline warning and the submit-time block name the colliding asset, link to it, and
  state the next steps — open the existing asset or change the serial — with no
  override to create a duplicate. The application's predicate and the database's
  functional unique index enforce exactly the same normalisation, the database is
  authoritative under concurrent requests, and the serial or key is stored as the user
  typed it, with normalisation applied only in the comparison and the index
  expression.
- **Asset editing (Q8).** A save appends one history entry naming the changed fields
  and their previous values; a save that changes nothing appends no entry. The asset's
  status and its current and last holder cannot be changed by an edit, so the edit
  screen is not a second path into the lifecycle.
- **Accessibility (Q9).** WCAG 2.1 AA is the floor. The seven commitments the
  wireframes state apply to the new surfaces, with a skip link as the first focusable
  element on every screen, plus a per-screen statement of heading level, primary
  landmark regions, and keyboard entry point.
- **Performance (Q10, Q20).** No fixed response-time or export-size ceilings are
  invented without a measured baseline. Six quantities are measured and reported at the
  confirmed planning scale — dashboard count retrieval and rendering, assignee
  directory grouping and retrieval, filtered asset-list retrieval, CSV generation for
  all matching rows, write and audit-entry completion time, and SQLite lock-wait
  behaviour under concurrent writes. The dataset is specified by its properties — the
  row count at the top of the confirmed scale band, a distribution across all five
  status buckets, and a holder set large enough to exercise the directory's grouping —
  and the row count, bucket distribution, and holder count are recorded alongside the
  results. The export must not silently truncate; lock contention follows the approved
  retryable `SQLITE_BUSY` behaviour. The numerical acceptance ceilings are set from the
  measured baseline and approved by the Product Owner before validation is treated as
  passed, and are not presented as existing commitments.
- **Backfill failures (Q11).** A failure is an existing audit row that cannot be given
  the identifiable `system` actor while preserving its original content and
  traceability. The migration preserves every original record, is idempotent, counts
  and reports failures with the affected row identifiers and specific reasons, fails
  the migration and prevents deployment if any row fails, rolls the backfill
  transaction back so no partial backfill is committed, and never silently skips,
  deletes, overwrites, or partially modifies a failed row. A human investigates and
  resolves before a retry.
- **The two omitted discard edges (Q12, Q15).** The release draws eight edges; the two
  approved edges the wireframes do not draw — `in-stock → discarded` and `returned →
  discarded` — are recorded as **deferred**, named follow-on items whose approved
  standing is intact, and the requirements state explicitly that they remain approved
  edges of the §4.1 transition table. The boundary section distinguishes deferred-and-
  standing-intact from explicitly-out-of-scope.
- **Retention (Q13).** The retention rule is an open item with a named next action.
  Until it is answered, no retention or disposal behaviour is specified, and custody
  history is not destroyed.
- **Traceability to POC FR1.3 (Q16).** The normalised uniqueness rule is restated as
  the MVP's own requirement, and FR1.3's traceability is recorded as changed
  behaviour under an approved amendment — citing the workbook §4.1 amendment surface
  that carries the uniqueness policy — rather than as a retirement.

Does this all look correct before I generate the requirements artifact?

- Looks correct
- Request changes

[Answer]: Looks correct
