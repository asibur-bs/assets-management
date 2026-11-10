**Collaborator:** aidlc-developer-agent

## Contribution

I reviewed `stories.md` and `personas.md` from the implementability and
story-sizing perspective only. I did not review acceptance-criterion
testability in the quality-engineer sense, visual or persona fidelity, or
whether the requirements are correct. Where I make a claim about the codebase
or about SQLite/better-sqlite3 behaviour, I verified it by execution rather
than by reading, and the verification is stated inline so it can be re-run.

The draft is, on the whole, well-shaped. The group structure puts each shared
definition in the group with its consumers, which is what makes the
single-sourcing workable. The lifecycle families are correctly sized against
the sizing rule in the questions file. The four count-consuming surfaces are
correctly marked as one indivisible group. What follows are the findings that
would cost real implementation time if they were not addressed.

---

### F1 — The whole release's schema work is invisible in the story set

**Severity: high. This is the single most consequential finding.**

The release rebuilds two tables and backfills a third population. That work
appears in **no** story. Searching `stories.md` for `migration`, `rebuild`,
`schema`, `backfill`, `last_assigned_to`, `actor column`, `pragma` returns
nothing. The stories begin at the behavioural surface and treat the schema as
if it were already in place.

This is not a completeness nit. Four specific consequences follow, and each
one produces a defect if the story set is the only thing a developer reads.

**F1.1 — The `discarded` status does not exist in the database today.** I
verified by execution against the live schema:

```
CREATE TABLE a (s TEXT CHECK (s IN ('in-stock','assigned','returned','lost')));
INSERT INTO a VALUES ('discarded');
→ SQLITE_CONSTRAINT_CHECK: CHECK constraint failed: s IN ('in-stock','assigned','returned','lost')
```

`src/db/migrations.sql:15` carries that four-value CHECK. US3.4, US3.1 AC3.1.4
and every count that mentions the `discarded` bucket assume a five-value
CHECK that does not exist. `ALTER TABLE … DROP CONSTRAINT` is not supported by
SQLite, so this is a **full table rebuild**, and the rebuild is what makes the
actor column, `last_assigned_to` and the functional index possible at all.

**F1.2 — `last_assigned_to` does not exist as a column.** `src/db/migrations.sql`
has `assigned_to`, `assigned_at`, `returned_at` — there is no
`last_assigned_to`. US3.2 AC3.2.3, AC3.2.5, US3.4 AC3.4.1 and US5.3 AC5.3.6
all depend on it. The column is a required part of the same rebuild.

**F1.3 — `audit_log` has no `actor` column.** `src/db/migrations.sql:29-36`
defines `(id, asset_id, action, description, created_at)`. US7.1, US4.1 AC4.1.2,
US4.2 AC4.2.5 and every write story's actor criterion depend on a column that
does not exist. The audit table also carries `ON DELETE CASCADE`, which is
exactly what US4.2 AC4.2.3 forbids.

**F1.4 — The `ON DELETE CASCADE` removal and the `BEFORE UPDATE` /
`BEFORE DELETE` triggers are unimplemented.** US4.2 AC4.2.1 and AC4.2.2
require the database itself to refuse an `UPDATE` and a `DELETE` against the
audit table. That is trigger work inside the rebuild migration. Nothing in the
story set mentions it.

**Proposed addition — a new US0 group (or a US4.4), named for the foundation
workstream.** The scope document already names this as **GROUP 1** and states
it is indivisible and a hard predecessor of everything else. The story set
mirrors the scope document's *capability* groups and drops its *foundation*
group. I propose the following story, in the Product Manager's own style:

> ### US0.1 — The foundation: one migration that rebuilds both tables safely
>
> > As an **asset administrator**, I want the release's data model rebuilt
> > without losing a single recorded event, so that the custody history the
> > release exists to produce is built on a schema that cannot destroy it.
>
> **Priority**: Must Have
>
> **Acceptance criteria**
>
> - **AC0.1.1** — Given a database carrying N rows in `audit_log` and M rows in
>   `assets`, when the foundation migration runs, then N audit rows and M asset
>   rows are still present afterwards, with their content intact.
> - **AC0.1.2** — Given the foundation migration runs, then the statements are
>   ordered so that `audit_log` is rebuilt **first and without its foreign-key
>   clause**, then `assets` is rebuilt, and only then is the foreign key
>   re-added — the reverse order destroys every audit row silently with the
>   transaction committed and no error raised.
> - **AC0.1.3** — Given the foundation migration runs against a connection
>   whose `foreign_keys` pragma is off, then the migration sets the pragma
>   itself for its own window and leaves it consistent afterwards —
>   `PRAGMA foreign_key_check` reports no violations after the migration.
> - **AC0.1.4** — Given the foundation migration runs, then the rebuilt
>   `assets` table carries a `status` CHECK admitting all five buckets, and
>   carries a `last_assigned_to` column.
> - **AC0.1.5** — Given the foundation migration runs, then the rebuilt
>   `audit_log` table carries an `actor` column and **no** `ON DELETE CASCADE`
>   clause.
> - **AC0.1.6** — Given the foundation migration runs, then the indexes the
>   rebuilt tables lost are re-issued by the migration itself — the base schema
>   file is applied as migration v1 only and cannot be relied on to restore
>   them.
> - **AC0.1.7** — Given a pre-existing audit row that predates the release,
>   when the foundation migration runs, then the row is given the `system`
>   actor **in place**, its original content and traceability preserved.
> - **AC0.1.8** — Given the backfill runs a second time, then the state is
>   identical to running it once.
> - **AC0.1.9** — Given any backfill row cannot be given the `system` actor
>   while preserving its original content and traceability, then the row is
>   counted as a failure and reported with its identifier and reason, and the
>   migration **fails** rather than proceeding with a partial backfill.
> - **AC0.1.10** — Given the foundation migration runs, then an `UPDATE` and a
>   `DELETE` against `audit_log` are both refused by the database itself.
>
> **Depends on**: the actor-identity mechanism decision (open items I-01 /
> I-03). Nothing else in the release may be built first.

AC0.1.2 and AC0.1.3 are the criteria that carry the silent data-loss failure
mode. They are not decoration: the `architecture.md` artifact records the
ordering as *probed live*, and the naive order succeeds silently. A developer
who never sees AC0.1.2 will write the naive order.

**F1.5 — The four deferred NFR3 requirements are the wrong kind of deferral.**
`traceability.json` marks NFR3.3, NFR3.4, NFR3.5 and NFR3.6 as
`"status": "Deferred", "target": "domain-design"`. That is a deferral to a
*later* stage of the same release, so it is defensible — but the target is
wrong in a way that matters. NFR3.5 and NFR3.5a are the migration's
acceptance criteria, and they are the criteria that catch the cascade. The
test-first exception in the affirmed team practices names exactly this: *"the
table rebuild is written test-first because its defect is silent history loss
with the transaction committed — the test that states the specification ('given
a legacy database with N audit rows, after the rebuild, N audit rows still
exist') must exist before the code that could silently violate it."*
Domain Design does not write tests. If the story set does not name the
rebuild, the test-first exception has nothing to attach to and the release
loses the one guarantee the team practices were written to preserve.

**F1.6 — The `system` actor and the backfilled-history exclusion have no
home.** US4.1 AC4.1.3 says a `system`-attributed entry "is rendered with a
marker distinguishable from an entry attributed to a person" — but nothing
creates a `system`-attributed entry. Only the backfill does. So the backfill
is load-bearing for US4.1 AC4.1.3, and the `system` actor has to exist as a
resolvable, displayable identity (US7.1 AC7.1.3) even though no human ever
holds it. That is a real design question for Domain Design, and the story set
does not surface it. Add to AC7.1.3: *"and the `system` actor used by the
historical backfill resolves to a stable, displayable identity distinct from
any person's."*

---

### F2 — US1.2 is three stories wearing one ID

**Severity: high. This is the clearest sizing defect in the draft.**

US1.2 carries eight acceptance criteria spanning four independent concerns:

| Criteria | Concern |
|---|---|
| AC1.2.1, AC1.2.2, AC1.2.3 | The comparison definition (trim + case-fold, category-scoped, preserve stored value) |
| AC1.2.4, AC1.2.5 | The database tier's error mapping (`SQLITE_CONSTRAINT_UNIQUE`, not message text) |
| AC1.2.6 | Concurrency — two writers, one winner |
| AC1.2.7, AC1.2.8 | Lock acquisition — `IMMEDIATE` transaction, non-zero `busy_timeout`, `SQLITE_BUSY` → retryable |

The questions file's sizing rule says: *"A story that would need two distinct
state transitions, or two distinct screens, is split."* US1.2 needs neither,
so it survives the letter of the rule — but its own INVEST note claims
*"Small — one rule"*, and that is not true. AC1.2.7 and AC1.2.8 in particular
describe a transaction-management change to the database opener, which is a
different layer and a different file (`src/db/index.js`) from the uniqueness
predicate. The `INVEST` note for US1.2 should not assert a size the criteria
contradict.

I verified the mechanics so the split is written against reality:

- `better-sqlite3` 11.10.0 exposes `db.transaction(fn).immediate` — the
  `IMMEDIATE` modifier exists and is usable. `t.immediate()` runs the
  transaction body.
- `busy_timeout` currently reads **5000 ms** from the driver's default, not
  from an application decision. `src/db/index.js` never sets it. So the
  standing condition "a non-zero SQLite `busy_timeout`" is *technically* met
  today by accident — but by the driver's default, not by a decision the
  application makes. AC1.2.7's phrase "with a non-zero SQLite `busy_timeout`"
  would pass against today's code without anyone changing anything. That is a
  criterion that cannot fail, which is the definition of an unverifiable one.
- Under contention the driver reports `err.code === 'SQLITE_BUSY'` — I
  confirmed this by holding `BEGIN IMMEDIATE` on one connection and attempting
  it on a second. The code is real and the criterion in AC1.2.8 is sound.

**Proposed split** (three stories, IDs to be assigned by the Product Manager):

> **US1.2 — The uniqueness comparison definition.** AC1.2.1, AC1.2.2, AC1.2.3,
> plus the new criterion below. *One shared predicate, consumed by the
> application check and by the functional index expression.*
>
> - **AC1.2.0 (new)** — Given the uniqueness check runs, then the same
>   comparison definition produces both the functional unique index's
>   expression and the application-level predicate — there is one definition
>   in the system, not two that happen to agree.
>
> **US1.2b — The database tier refuses the same collision.** AC1.2.4,
> AC1.2.5. *The unique index as the authoritative arbiter; the two tiers are
> indistinguishable to the caller.*
>
> **US1.2c — Two concurrent registrations cannot both succeed.** AC1.2.6,
> AC1.2.7, AC1.2.8. *The `IMMEDIATE` transaction, the `busy_timeout`, and the
> retryable busy code.*

**And AC1.2.7 needs rewording so it can fail.** As written it passes against
code that does nothing. I suggest:

> - **AC1.2.7** — Given the uniqueness check runs, then it executes inside an
>   `IMMEDIATE` transaction, and the `busy_timeout` in force at that moment is
>   a value the application **sets explicitly** rather than inheriting from the
>   driver default — so a concurrent writer waits for the lock rather than
>   failing immediately.

The "sets explicitly" clause is what makes the criterion falsifiable. Today
`src/db/index.js` sets `journal_mode` and `foreign_keys` and nothing else, so
"sets explicitly" is a real, checkable difference between today's code and
the release's.

**F2.1 — The retryable error code does not exist yet, and no story creates
it.** The team practices record: *"The error vocabulary gains a retryable
code. None of the five current codes (`VALIDATION_ERROR`, `DUPLICATE_ASSET`,
`NOT_FOUND`, `INVALID_TRANSITION`, `INVALID_STATE`) is retryable."* And:
*"Every code in the vocabulary must be mapped in the error middleware.
`INVALID_STATE` is thrown but is not in the middleware's handled set today, so
an unknown-state asset surfaces as a 500 rather than a 400."*

Neither fact appears in `stories.md`. AC1.2.8 requires "the retryable busy
code" as though it existed. AC6.3.4 requires "the duplicate-serial error
code" and says it "is not reported as retryable" — a distinction that is
untestable unless both codes exist and are distinguishable. And `src/app.js:17-24`
maps exactly four codes; `INVALID_STATE` falls through to a 500.

**Proposed addition to US7.1** (it is the cross-cutting rule story, and the
error contract is cross-cutting):

> - **AC7.1.6 (new)** — Given the domain's error vocabulary, then it carries a
>   retryable code for a busy condition, distinct from the permanent
>   duplicate-serial code, and every code in the vocabulary is mapped in the
>   error middleware to a specific HTTP status — including the invalid-state
>   code, which today falls through to a 500.

And a note on AC1.2.8 that names the code rather than describing it: *"it
receives the domain's retryable error code, detected from the driver's
`SQLITE_BUSY` code."*

---

### F3 — US3.2, US3.3 and US3.6 are circularly dependent

**Severity: high. The "Depends on" lines cannot all be true.**

- US3.2 (mark lost) — **Depends on**: US3.1, US3.3, US7.1
- US3.3 (reason vocabulary) — **Depends on**: US3.2, US3.4, US3.5
- US3.6 (audit action vocabulary) — **Depends on**: US1.1, US2.1, US2.2, US3.2, US3.4, US3.5

US3.3 depends on US3.2, and US3.2 depends on US3.3. That is a cycle, and the
draft's own convention says *"the dependencies recorded below are data or
ordering dependencies"*. A cycle is neither implementable nor orderable.

The substantive point is that both are **vocabularies**, and a vocabulary is
data, not behaviour. A vocabulary does not need the behaviour to exist first —
it needs to exist *before* the behaviour that consumes it, and it is consumed
by the behaviour, not the other way round.

**Proposed correction:**

- **US3.3 (reason vocabulary) — Depends on: none.** It is a constant. It
  depends on nothing; US3.2, US3.4 and US3.5 depend on it.
- **US3.6 (audit action vocabulary) — Depends on: none.** Same reasoning. It
  is a constant. The write stories depend on it.

This also fixes the story-relationship diagram at the end of `stories.md`,
which currently draws US3.2 → US3.6 as a one-way arrow while the "Depends on"
lines say the reverse.

**F3.1 — The relationship diagram contradicts the "Depends on" lines in at
least two places.** The diagram draws `US5.1` → US5.2/US5.3/US5.4 as if
US5.1 were the parent, but every consuming story's "Depends on" line lists
US5.1, i.e. the dependency runs the other way. The diagram draws `US6.1 edit
─── US4.3`, but US4.3's own "Depends on" line lists US6.1 — again the other
way. Since the story set is the input to Domain Design's Unit DAG, a
dependency graph that reverses its own arrows in two places will produce a
DAG with the wrong shape.

**F3.2 — US3.6 is not a story; it is a specification of the other stories.**
AC3.6.4 enumerates what each of seven descriptions must name. Every one of
those seven is *already* an acceptance criterion in the story that owns the
behaviour: AC1.1.4 (create), AC2.1.3 + AC2.2.2 (assign, return), AC3.2.1 +
AC3.6.3 (mark-lost), AC3.5.2 (recovered), AC3.4.2 (discarded), AC4.3.1
(edit). AC3.6.4 is therefore a *duplicate* of seven criteria spread across
five stories, and AC3.6.3 duplicates AC3.2.6 almost verbatim.

This duplication is a defect, not a belt-and-braces. The team practices record
that the audit action vocabulary is one of the things duplicated six times
today and that the release's answer is a **single leaf layer** (`src/domain/`)
that owns it. A story set that states the vocabulary twice — once as US3.6 and
once as the per-story criteria — models exactly the duplication the release
removes. And the story set cannot enforce single-sourcing, because a story
set is a *narrative* artefact; single-sourcing is a Domain Design property.

**Proposed correction:** reduce US3.6 to the parts that are genuinely
additional and not already stated elsewhere:

> ### US3.6 — The audit action vocabulary
>
> - **AC3.6.1** — Given the audit action vocabulary, then it contains exactly
>   `create`, `assign`, `return`, `mark-lost`, `recovered`, `discarded` and
>   `edit`, and no other value.
> - **AC3.6.2** — Given the four pre-existing action values, then none of them
>   is renamed.
> - **AC3.6.3 (new)** — Given the vocabulary exists, then it exists **once**
>   in the system, in the shared domain vocabulary, and every write path and
>   every audit-description builder reads it from there — no write path
>   hard-codes an action string.

and delete AC3.6.4 and AC3.6.5, whose content is already carried by AC1.1.4,
AC2.1.3, AC2.2.2, AC3.2.1, AC3.5.2, AC3.4.2 and AC4.3.1. (AC3.6.5 in
particular — *"that entry is not sufficient and the write path that produced it
has not met this story"* — is a meta-statement about the story set, not
observable behaviour.)

The same argument applies to **US3.3 AC3.3.5**, which says the vocabulary is
"supplied to that surface as data rather than copied into it". That is a
Domain Design requirement (it is the `src/domain/` leaf-layer requirement in
the team practices), restated as a user-story criterion. It cannot fail from
a user's point of view. I suggest it moves out of the story set and into
Domain Design's inputs, or is reframed as a render-level criterion:
*"the reason `<select>` on the loss dialog offers exactly the vocabulary's
values and no others."*

---

### F4 — US5.1 is not small, and its criteria are partly unreachable as written

**Severity: medium-high.**

US5.1's INVEST note claims *"Estimable — one definition. Small — one rule."*
It carries eight criteria covering: a shared filter builder, the
active-vs-total distinction, bucket arithmetic, two count lines on the list,
the directory's holder count, the holder row's chip arithmetic, the
indivisible-group constraint, and the in-memory-counting prohibition. That is
four distinct concerns.

**F4.1 — AC5.1.8 is unreachable as written.** It reads: *"Given the counting
path, then it issues a database query and returns an aggregate — the
application does not load the full asset set into memory in order to count it,
and the returned row count stays constant as the number of assets grows."*
The last clause is not a property of a query. `SELECT COUNT(*) FROM assets`
returns one row whether there are ten assets or ten thousand; the constant row
count is trivially true of the aggregate and says nothing about whether the
application loaded the full set. NFR5.2 has the same clause and the same
problem, but its *real* pass/fail is the second one: *"the application-side
memory used by the counting path does not scale with the number of assets."*
That is a memory measurement, and it is the criterion that actually
distinguishes an aggregate from a full load.

**Proposed rewording of AC5.1.8:**

> - **AC5.1.8** — Given the counting path, then it issues a database query
>   that returns an aggregate and does **not** fetch the asset rows themselves
>   — the memory the counting path uses does not grow with the number of
>   assets.

**F4.2 — AC5.1.7 is a release-management constraint wearing a story
criterion.** *"the four count-consuming surfaces are delivered as one
indivisible group — a release shipping any subset of the four does not
satisfy this story."* Nothing a developer implements can make this pass or
fail; it is a delivery constraint. It is also already stated three times in
the document: in US5.1 itself, in the "Story Relationships" section's "one
indivisible group" paragraph, and in the group map. I suggest moving it to
the Story Relationships section as the sole statement of the constraint, and
keeping it out of the criterion list — or rephrasing it as an observable
property:

> - **AC5.1.7** — Given any of the four count-consuming surfaces, then its
>   counts are produced by calling the shared counting function — no surface
>   computes a count by any other route.

That version is falsifiable, and it is the *actual* guarantee: the group is
indivisible precisely because every member must consume the shared definition.
The current wording describes the delivery rule; the proposed wording
describes the property that makes the delivery rule necessary.

**F4.3 — The shared definition is not placed where it can be implemented
once.** The questions file's own rationale says the hybrid breakdown "puts
each shared definition in **one** group with the surfaces that consume it".
But there are **five** shared definitions in this release, and only two of
them have a story:

| Shared definition | Owning story | Consuming stories |
|---|---|---|
| Counting / filtering | US5.1 | US5.2, US5.3, US5.4, US5.5 |
| Display holder | (AC5.3.6 only — no story) | US5.3, US4.1 (detail) |
| Status set / transition table | US3.1 | US3.2, US3.4, US3.5, US2.1, US2.2 |
| Uniqueness predicate | US1.2 | US1.2 (registration), US6.1 (edit) |
| Loss-reason vocabulary | US3.3 | US3.2, US3.4, US3.5 |
| Audit action vocabulary | US3.6 | every write story |

The **display-holder definition** has no owning story. It appears as
AC5.3.6, buried inside the directory story, and it is also a FR5.1 requirement
that the *asset detail* screen consumes (FR5.1 says "one definition of a
holder across every surface that names a holder"). The team practices record
that the display-holder definition is one of the shared definitions the
`src/domain/` leaf layer must own. If it lives inside the directory story, a
developer building the detail screen has no story to look at.

**Proposed:** give the display-holder definition its own story in US5, sibling
to US5.1, and move AC5.3.6 into it verbatim:

> ### US5.6 — One definition of a holder
>
> > As an **asset owner or requester**, I want every surface that names a
> > holder to mean the same thing by "holder", so that the directory and the
> > asset's own record never disagree about who holds it.
>
> - **AC5.6.1** — Given the display-holder definition, then an asset with a
>   current holder is attributed to that holder; an asset with no current
>   holder but a preserved previous holder is attributed to its previous
>   holder; and an asset with neither is attributed to no holder.
> - **AC5.6.2** — Given the display-holder definition, then it is the same
>   definition in the assignee directory and on the asset detail screen.
> - **AC5.6.3** — Given the "Unassigned" designation, then it is reserved for
>   assets that have never been held by anyone.

---

### F5 — US5.4 and US5.5 depend on a performance ceiling that does not exist yet

**Severity: medium-high.**

AC5.4.2 says the list "renders it within the approved performance ceiling,
without degradation that would require pagination". AC5.5.8 says the export
"remains within the approved export ceiling". AC5.1's traceability target
includes NFR1.1 and NFR1.2.

NFR1.2 is explicit that **no numeric ceiling has been fixed**: *"No numeric
ceiling is stated here because none has been fixed; see OQ5."* And OQ5's
named next action is to measure the six quantities, derive the ceilings from
those measurements, and take them to the Product Owner for approval.

So AC5.4.2 and AC5.5.8 as written are **unfalsifiable** — there is no value to
be at or under. A developer reading only the story cannot implement them, and a
reviewer cannot check them.

The scope document already anticipates this: the risk-first sequencing heuristic
resolves the design-system estimate early *"even though the design system is
deferred from the MVP release"*, on the grounds that *"deferring a capability
does not defer the need to know what it would cost."* The same logic applies
to the performance ceilings, and the story set currently defers them silently.

**Proposed:** split the criteria so the implementable part stands alone and the
ceiling-dependent part names its gate:

> - **AC5.4.2** — Given a dataset at the confirmed medium scale — hundreds to
>   low thousands of assets — then the list renders it without degradation
>   that would require pagination, and the rendering time is at or under the
>   ceiling approved under NFR1.2.
>
> and add a note under US5.4 and US5.5:
>
> **Note**: AC5.4.2 and AC5.5.8 name a ceiling that has not yet been set.
> NFR1.2 records that the ceilings are derived from the measured baseline and
> approved by the Product Owner (open question OQ5). Until that approval
> exists, the *implementable* obligation is the dataset shape and the
> no-pagination-degradation property; the numeric ceiling is a gate that
> attaches when OQ5 closes.

I would also add a story for the measurement work itself, because NFR1.1
requires **six** measured quantities with the dataset's row count, bucket
distribution and holder count recorded alongside each result — and the current
story set only gestures at three of the six (list retrieval, export
generation, and the counting path). The write/audit completion time and the
SQLite lock-wait behaviour are not represented anywhere. The lock-wait
measurement is not a nice-to-have: it is the measurement that demonstrates
AC1.2.7's `busy_timeout` behaviour.

**Proposed addition:**

> ### US5.7 — The release's performance is measured, not assumed
>
> - **AC5.7.1** — Given the six quantities NFR1.1 names, then a measured
>   value exists for each, taken against a dataset whose row count, bucket
>   distribution and holder count are recorded alongside the result.
> - **AC5.7.2** — Given the measured values, then the acceptance ceilings are
>   derived from them and approved by the Product Owner before the release is
>   considered to have met its performance criteria (open question OQ5).
> - **AC5.7.3** — Given the response-time quantities, then the recorded
>   results include their percentiles, and the export result includes its
>   generation time.

---

### F6 — US7.2 is a gate, not a story, and it is the largest item in the set

**Severity: medium.**

US7.2 carries ten criteria covering colour independence, keyboard
operability, focus visibility, error association, programmatic structure,
status announcement, target size and contrast, a skip link, a per-screen
accessibility note, and an automated WCAG 2.1 AA check. Its own INVEST note
says *"Small — a gate, not a feature."*

That note is a category error rather than a sizing claim. The release adds
**eight screens** (the wireframes' W1–W8a/W8b) and the criteria apply to
*"any released screen"*. On the existing codebase, `views/` today has six
templates, none of which carries a skip link, a `<caption>`, a `scope` on any
column header, a `main` landmark, or an `h1`-per-screen check — let alone the
five-bucket dashboard, the directory, the four reason dialogs, the edit form,
or the CSV export route. Every one of those is greenfield.

A criterion set that applies to eight screens where six of the screens do not
exist yet is not "small". I recommend two changes:

**F6.1 — Move US7.2 to the release's gate list rather than the story list.**
The phase's inception guardrail says stories must be independently testable; a
per-screen gate on an unknown set of screens is testable per screen but not
independently — it cannot be built before the screen it gates. It is the same
shape as the "one indivisible group" constraint, and the draft handles that one
by marking it explicitly. US7.2 deserves the same explicit handling.

**F6.2 — Split US7.2 into the per-screen commitments and the two release-level
commitments.** The seven commitments in FR11.1 are *per screen*. The
skip-link requirement and the per-screen accessibility note are also per
screen. But AC7.2.9 (the per-screen note) and AC7.2.10 (the automated
WCAG 2.1 AA check) are release-level: they apply once, across all screens, and
they require tooling that does not exist in this repository — there is no
accessibility test dependency in `package.json` today, and the team practices
record that the dependency audit is a blocking gate over the production
closure. Adding an accessibility checker is a **new dependency**, and that is
an estimation input the story set does not surface.

**Proposed:** keep the per-screen commitments as a gate, and add the tooling
dependency explicitly:

> **Note under US7.2**: AC7.2.10 requires an automated accessibility check
> across every released screen. No such tooling exists in this repository
> today, and the dependency audit (`npm audit --audit-level=high --omit=dev`)
> is a blocking merge gate over the production dependency closure. The checker
> is therefore new capability work with a dependency-closure implication, and
> its selection is a Domain Design decision.

**F6.3 — AC7.2.7 is unfalsifiable as written.** *"target size and contrast
are adequate."* "Adequate" has no threshold. FR11.1 defers the numeric
contrast thresholds to FR11.3's Level AA floor, so AC7.2.7's numeric content
is carried by AC7.2.10. I suggest: *"target size and contrast meet the Level AA
floor checked in AC7.2.10."*

---

### F7 — Hidden dependencies the "Depends on" lines do not record

**Severity: medium.** Six of them, each with the specific line to add.

**F7.1 — Every write story depends on the *write-path* story, and no write
story says so.** The team practices record that the asset write and its audit
write are **not** in one transaction today — `src/services/asset-service.js`
does `repo.updateAsset(...)` then `repo.recordAudit(...)` as two separate
statements with nothing between them. In a synchronous driver a `try/catch`
around two statements is not a rollback.

AC7.1.5 requires this to be one all-or-nothing unit. But AC7.1.5 is a
*criterion* on a cross-cutting story; it does not tell the developer *where*
to put the transaction, and it does not tell them that the existing
service methods must be restructured. The restructure touches every write
method in `src/services/asset-service.js`.

**Proposed:** add a US7.1 criterion and a dependency note.

> - **AC7.1.7 (new)** — Given a write path, then the asset change and its
>   audit append execute inside **one** database transaction — the asset write
>   and the audit write are not two separate statements.
>
> **Depends on** line for US1.1, US2.1, US2.2, US3.2, US3.4, US3.5, US4.3,
> US6.1: *"and US7.1 (the single-transaction write path)"* — or, more
> precisely, the dependency belongs on a **new US7.3** that owns the
> transaction.

**F7.2 — US7.1 is the only story that says "Depends on: none", and it is
wrong.** US7.1's AC7.1.4 requires *"any released screen"* to render a
read-only "Acting as" indicator. That indicator needs a resolved actor, and
the resolved actor needs a mechanism — which is open item I-01 / I-03 and is
explicitly blocked. The draft's own conventions say the mechanism is
resolved in Domain Design, and the questions file's answer to Q7 says
*"the stories state the rule ... the mechanism is chosen in Domain Design"*.

The rule is mechanism-independent and correctly stated. But US7.1 as a whole is
**not** implementable before the mechanism is chosen, because AC7.1.4's
indicator and AC7.1.3's "stable identity that can be displayed to a person"
both presuppose one. The scope document states the actor decision is a
**blocking dependency of the foundation workstream**.

**Proposed:** give the dependency an explicit line.

> **Depends on**: the actor-identity mechanism decision (open items I-01 /
> I-03), which the scope document records as a blocking dependency of the
> foundation workstream. The *rule* is fixed and is not reopened; the
> mechanism is not a story-level decision.

**F7.3 — US4.3 depends on US6.1, and US6.1 depends on US4.3.** US4.3's
"Depends on" line reads *"US6.1, US3.6, US7.1"*; US6.1's reads *"US1.2,
US4.3, US7.1"*. Another cycle.

The substantive dependency is real and one-directional: the edit *behaviour*
is US6.1, and the *audit behaviour* of the edit is US4.3. The clean fix is to
merge them or to make the edit's audit behaviour a criterion of US6.1 rather
than a separate story. I lean towards merging, because AC4.3.1 and AC6.1.1
both say "an edit appends one `edit` entry naming the changed fields and their
previous values" — they are the same criterion stated twice. The two stories
that genuinely differ are AC4.3.2 (a save that changes nothing appends no
entry and does not change `updated_at`) and AC6.1.2 (status and holder are
not directly editable). Both are properties of the *same* edit path.

**Proposed:** move AC4.3.1 and AC4.3.3 into US6.1 as AC6.1.4 and AC6.1.5,
keep AC4.3.2 in US6.1 as well, and delete US4.3 — or, if the Product Manager
prefers to keep the audit behaviour visible as its own story, invert the
dependency to US6.1 → US4.3 and say so.

**F7.4 — US1.2 and US6.1/US6.2 need the functional index, which is created by
the foundation migration.** The functional unique index is part of the same
rebuild (the base schema's `UNIQUE (category, serial_or_key)` cannot express
`lower(trim(...))` — I verified that a functional index on `lower(trim(a))`
does catch the normalised collision and reports `SQLITE_CONSTRAINT_UNIQUE`).
The index therefore exists only after US0.1 lands, and both tiers of US1.2
depend on it. **US1.2's "Depends on" line should add US0.1.**

**F7.5 — US5.2 (dashboard), US5.3 (directory) and US5.4 (list) depend on
`discarded` being a first-class status.** AC5.1.3 requires the five bucket
counts to sum to the total record count. With only four buckets in the
schema's CHECK, `discarded` rows cannot exist at all, and the arithmetic is
over four buckets. This is a consequence of US0.1, and the dependency should
be recorded rather than left implicit.

**F7.6 — US5.5's CSV export needs a route and a response shape that do not
exist.** `src/routes/assets.js` has eight handlers and no export endpoint;
the error middleware in `src/app.js` renders an HTML error page for every
error code, so a CSV request that fails would receive an HTML body with a
`text/html` content type. AC5.5.2 requires `text/csv; charset=utf-8`. There is
also no `Content-Disposition` header anywhere today, and the filename
`assets-export.csv` requires one.

I checked the header hardening requirement against the draft: **NFR2.6**
(`X-Content-Type-Options: nosniff`, no `X-Powered-By`) is mapped to US7.2 in
`traceability.json`, and **NFR2.5** (the conditional CSRF rejection) is mapped
to US7.1. Neither is a user story — they are deployment-practice obligations
in the team practices, and AC7.2's criteria say nothing about response
headers. The `nosniff` requirement is directly load-bearing for the CSV
export: *"a CSV served without `nosniff` and without a correct `Content-Type`
can be sniffed by the browser as HTML."*

**Proposed:** add to US5.5:

> - **AC5.5.9 (new)** — Given the export response, then it carries
>   `Content-Disposition` naming the file `assets-export.csv`, and every
>   response in the application carries `X-Content-Type-Options: nosniff`
>   and no `X-Powered-By` header.

---

### F8 — The deferred set (US8.x) conceals two pieces of work the release needs

**Severity: medium.** I checked each of the ten deferred entries against the
scope document and the requirements. Eight are clean. Two are not.

**F8.1 — US8.9 (pagination, result counts, and the pager) contradicts
AC5.1.4 and AC5.4.1.** US8.9's follow-on trigger is *"the asset count growing
beyond the confirmed medium scale of hundreds to low thousands of assets."*
But AC5.1.4 requires the asset list to report *"both how many records are
being shown and how many records match the applied filter"*, and AC5.4.1
requires the same two figures. Those **are** result counts. The scope
document lists "Pagination and result counts" as one deferred item, but the
requirements have already pulled the result-count half of it into the release
(FR6.4). US8.9 as written therefore defers something the release must ship.

**Proposed:** split US8.9 and correct the standing:

> | **US8.9** | **Pagination and the pager** — page controls over a result set | Approved; the *result counts* half of this item is **released** in US5.1 AC5.1.4 and US5.4 AC5.4.1 (FR6.4), and only the pager itself is deferred | Named follow-on item; the trigger is the asset count growing beyond the confirmed medium scale of hundreds to low thousands of assets |

**F8.2 — US8.10 (empty states) conceals a live requirement.** The scope
document defers empty states as "presentation polish … depends on the design
system's vocabulary". But:

- `views/list.ejs` **already has an empty state** — the `assets.length === 0`
  branch rendering *"No assets yet."* So the release's existing empty state
  already exists in the code the release is built on.
- AC5.5.6 requires the export to produce a **header-only file** when no rows
  match — that is an empty-result case the release must handle.
- AC5.1.5 requires the directory to render one row per display holder **plus
  the "Unassigned" row** — and the "Unassigned" row is an empty-ish case that
  exists precisely when there are never-held assets.

Deferring "empty states" while shipping a release whose counting definition
must handle the zero case is a contradiction. **Proposed:** narrow US8.10 to
the design-system-dependent part and state the release's position:

> | **US8.10** | **Empty-state presentation** — the designed treatment for an empty result set | Approved as presentation polish. The release still handles the zero case: the asset list retains its existing empty row (FR6.4's two counts are reported even when nothing matches), the CSV export produces a header-only file (AC5.5.6), and the directory always renders the "Unassigned" row (AC5.1.5). What is deferred is the *designed* empty-state treatment | Named follow-on item; the trigger is the design system's arrival |

**F8.3 — US8.4 and US8.5 are clean and should stay as they are.** The
`in-stock → discarded` and `returned → discarded` edges are genuinely
deferred approved edges, and the draft's framing — *"this one is deferred, not
withdrawn"* — is exactly right. I checked them against the wireframes'
ten-approved-eight-drawn reconciliation and they match. No change needed.

---

### F9 — The stories restate existing behaviour in a way that implies new work

**Severity: low-medium.** Three places, each small.

**F9.1 — US6.4 restates US1.1 AC1.1.3.** *"Given an asset registered through
that screen, then its status is `in-stock` and its current holder is null"* is
AC1.1.3 verbatim. US6.4's *distinct* content is AC6.4.1 (the registration
screen contains no assignee input), which is a **retirement of a POC field**:
`views/new.ejs` currently renders `<label>Assigned to (optional) <input
type="text" name="assigned_to" ...>`, and `src/routes/assets.js:44` reads
`req.body.assigned_to` into `input.assignedTo`, and
`src/repositories/assets-repo.js:62` writes it to the `assigned_to` column.

So US6.4 is genuinely new work — removing a field that exists today — and the
draft states only the consequence, not the removal. I suggest making the
removal explicit:

> - **AC6.4.1** — Given the registration screen, then it contains no assignee
>   input — the POC's optional "Assigned to" field is removed, and a
>   registration request that supplies one does not assign the asset.
> - **AC6.4.2** — Given an asset registered through that screen, then its status
>   is `in-stock` and its current holder is null.

**F9.2 — US2.1 and US2.2 restate existing behaviour as though it were new.**
AC2.1.1 (assign sets holder, assignment timestamp, clears return timestamp)
and AC2.2.1 (return clears holder, sets return timestamp, leaves assignment
timestamp) describe exactly what `src/services/asset-service.js` already
does. These are *preserved* behaviours, which the requirements record
correctly — FR3.4 and FR3.5 are POC requirements the release preserves.

This matters for the traceability record: `traceability.json` maps FR3.4 and
FR3.5 with `"status": "OK"` and no preserved/superseded distinction, and the
requirements' `## Traceability` section says FR3.4/FR3.5 are *"Preserved"* POC
requirements. The story set reads as if assignment and return are new. A
developer could reasonably read US2.1 as a request to build something that
already works, or (worse) to refactor it. I suggest a one-line note under
US2.1 and US2.2 rather than new criteria:

> **Note**: US2.1 and US2.2 specify behaviour the POC already implements
> (`src/services/asset-service.js`). They are stated here because the release
> changes what *surrounds* them — the asset write becomes one transaction with
> its audit append (US7.1 AC7.1.7), the audit entry carries an actor
> (US7.1), and the assignment write gains the `last_assigned_to` preservation
> (US0.1). The field effects below are preserved POC behaviour, not new work.

**F9.3 — US3.1 AC3.1.4 is a constraint on data, not on a transition, and it
lives in a transition story.** *"Given every asset row, then it carries exactly
one status drawn from the five exclusive buckets — the buckets are mutually
exclusive and their union is the set of all asset rows."* This is FR3.1, the
INV-2 invariant. It is a property of the schema's CHECK constraint plus the
counting definition, not of the transition table. It is correctly a criterion
of a lifecycle story, but the *enforcement* is the rebuild's widened CHECK
(US0.1 AC0.1.4). Adding "US0.1" to US3.1's dependency line would make that
explicit.

---

### F10 — Three criteria name behaviour that cannot be observed by a developer reading only the story

**Severity: low-medium.** I am not assessing testability in the quality
engineer's sense — I am assessing whether the *behaviour* is located.

**F10.1 — AC3.6.5** ("that entry is not sufficient and the write path that
produced it has not met this story") is a statement about the story set, not
about the application. Proposed removal — its content is already carried by
the per-story description criteria (see F3.2).

**F10.2 — AC3.3.5** ("supplied to that surface as data rather than copied into
it") is a Domain Design requirement restated as an acceptance criterion. No
user can observe whether a template received a list as render data or had it
copied into it — except indirectly, by observing that a *later* added value
appears without the screen changing. Proposed reframing:

> - **AC3.3.5** — Given the vocabulary is rendered in the loss, recovery and
>   discard dialogs, then each dialog's reason `<select>` offers exactly the
>   vocabulary's values and no others.

**F10.3 — AC5.1.8** is covered under F4.1.

---

### F11 — The personas are sound from an implementation perspective; two notes

**Severity: low.** I checked the personas against the requirements' target
customer and against what the code can actually support. No persona conflicts
with an implementable requirement. Two notes for the Product Manager:

**F11.1 — Marcus's persona says "Expects to be able to find something by
typing a name or a serial number", and improved search is deferred
(US8.8).** The existing free-text search (`src/repositories/assets-repo.js:16-19`,
`LOWER(name) LIKE ? OR LOWER(serial_or_key) LIKE ?`) is retained per
assumption A14, so the persona's expectation is met by preserved behaviour. But
the persona's wording reads as a *new* capability. A one-word adjustment makes
the retention explicit: *"Expects to be able to find something by typing a name
or a serial number — the existing search is adequate for this."* This is a
persona-fidelity observation in service of an implementability one: if a
reader believes Marcus needs a *better* search, the deferral of US8.8 looks
like an omission rather than a decision.

**F11.2 — Priya's persona says she is "occasionally with a colleague covering
the desk".** With no authentication and no actor mechanism chosen, "covering
the desk" means two people sharing one resolved actor identity. That is
precisely the candidate-A behaviour ("attributes every entry to one identity")
that the feasibility stage recorded as satisfying the actor-trust rule only
weakly. This is not a persona defect — it is a real operational fact that the
persona records, and it is *useful*: it is concrete evidence about which actor
mechanism the organisation will actually want, which is exactly what open item
I-01 is waiting on. I suggest keeping it and flagging it to Domain Design as
an input to the mechanism decision:

> **Note (for Domain Design)**: the administrator persona records that the
> desk is occasionally covered by a colleague. Under a single server-configured
> operator (candidate A), a covering colleague's entries are attributed to the
> primary administrator. This is a fact about the operating context, not a
> requirement, and it is one of the inputs to the actor-mechanism decision
> (I-01 / I-03).

---

### A summary of the proposed changes, by priority

| # | Change | Story / AC | Why it matters |
|---|---|---|---|
| 1 | Add the foundation story | **new US0.1** (10 criteria) | The rebuild, the backfill, the ordering constraint and the trigger installation are in no story today, and four NFR3 requirements are deferred to a stage that writes no tests |
| 2 | Split US1.2 into three | US1.2 / US1.2b / US1.2c | It is three stories wearing one ID, and its `Small — one rule` note is false |
| 3 | Make AC1.2.7 falsifiable | AC1.2.7 | As written it passes against code that does nothing, because the 5000 ms `busy_timeout` is the driver's default, not an application decision |
| 4 | Break the US3.2 ↔ US3.3 cycle | US3.2, US3.3, US3.6 | A vocabulary is data and depends on nothing; the cycle makes the dependency graph unimplementable |
| 5 | Break the US4.3 ↔ US6.1 cycle | US4.3, US6.1 | The same criterion is stated twice; merge or invert |
| 6 | Fix the diagram's arrows | Story Relationships | It reverses the dependency direction in two places, and the story set is the input to the Unit DAG |
| 7 | Add the missing display-holder story | **new US5.6** | One of the five shared definitions has no owning story, yet two surfaces consume it |
| 8 | Add the performance-measurement story | **new US5.7** | Two criteria name a ceiling that does not exist, and three of NFR1.1's six quantities are unrepresented |
| 9 | Make AC5.1.8, AC5.1.7, AC7.2.7 falsifiable | those criteria | "Constant row count" is trivially true of an aggregate; "adequate" has no threshold; the delivery constraint is not observable behaviour |
| 10 | Name the error-vocabulary work | **new AC7.1.6** | No story creates the retryable code, and `INVALID_STATE` still falls through to a 500 |
| 11 | Name the single-transaction work | **new AC7.1.7** | Every write path must be restructured; no story says so, and the failure mode is silent |
| 12 | Split US8.9; narrow US8.10 | US8.9, US8.10 | The deferred set conceals result counts (released, per FR6.4) and an existing empty state |
| 13 | Add the header and CSV-response criteria | **new AC5.5.9** | `nosniff` and the absence of `X-Powered-By` are load-bearing for the CSV export and are mapped to no story |
| 14 | Note the actor mechanism's blocking dependency | US7.1 | AC7.1.3 and AC7.1.4 presuppose a resolved actor, which I-01 / I-03 gates |
| 15 | Mark US2.1/US2.2 and US6.4's relationship to existing code | US2.1, US2.2, US6.4 | Three places where preserved behaviour reads as new work, and one where a POC field's removal is not stated |

---

### Verification notes

The following claims in this contribution were verified by execution against
the workspace, not by reading alone. They are reproducible.

| Claim | How it was checked | Result |
|---|---|---|
| `SQLITE_CONSTRAINT_UNIQUE` is the driver's code for a unique-index violation | `better-sqlite3` 11.10.0, insert duplicate into a `UNIQUE` column | `err.code === 'SQLITE_CONSTRAINT_UNIQUE'` |
| `SQLITE_BUSY` is the driver's code for lock contention | `BEGIN IMMEDIATE` on one file-backed connection, `BEGIN IMMEDIATE` on a second | `err.code === 'SQLITE_BUSY'`, message `database is locked` |
| `busy_timeout` is 5000 ms and is not set by the application | `PRAGMA busy_timeout` on a fresh handle; `src/db/index.js` sets only `journal_mode` and `foreign_keys` | `[{"timeout":5000}]` — the driver's default |
| `db.transaction(fn).immediate` exists | `typeof t.immediate` | `"function"` |
| A functional index on `lower(trim(col))` catches the normalised collision | create the index, insert `AbC` then ` abc ` | collision detected, `SQLITE_CONSTRAINT_UNIQUE` |
| The current `status` CHECK rejects `discarded` | insert `discarded` into a table with the four-value CHECK | `SQLITE_CONSTRAINT_CHECK` |
| `audit_log` has no `actor` column | `src/db/migrations.sql:29-36` | columns are `(id, asset_id, action, description, created_at)` |
| `assets` has no `last_assigned_to` column | `src/db/migrations.sql:10-27` | columns are `id, category, name, serial_or_key, model, notes, status, assigned_to, assigned_at, returned_at, created_at, updated_at` |
| The asset write and the audit write are not in one transaction | `src/services/asset-service.js:52-94` | `repo.updateAsset(...)` then `repo.recordAudit(...)`, two separate statements |
| `INVALID_STATE` is not mapped in the error middleware | `src/app.js:17-24` | four codes mapped; `INVALID_STATE` falls through to 500 |
| The registration form carries the assignee field | `views/new.ejs` | `<input type="text" name="assigned_to" …>` present |
| The asset list already has an empty state | `views/list.ejs` | `assets.length === 0` branch renders "No assets yet." |
| The only audit read path is latest-entry-only | `src/repositories/assets-repo.js:116-124` | `ORDER BY id DESC LIMIT 1` |
| There is no accessibility tooling in the dependency tree | `package.json` | `dependencies`: better-sqlite3, ejs, express; `devDependencies`: vitest, supertest, coverage-v8 |

---

## Positions (Round 2)

Round 1 recorded seven OBJECT positions and five AGREE positions. Round 2
re-examines each against the integrated draft, the two sibling contributions,
and the revised `traceability.json`. Six of the seven objections are now
withdrawn. One is maintained, for a reason that is a one-line fix rather than
a design change.

- WITHDRAW: the story set's silence on the foundation workstream (F1) — US0.1
  now carries the rebuild, the ordering constraint, the pragma window, the
  widened CHECK, the `last_assigned_to` column, the `actor` column, the
  `ON DELETE CASCADE` removal, the trigger installation, the index re-issue,
  the `system` backfill and the `system` actor's identity, and NFR3.3–NFR3.6
  are now `OK → US0.1` rather than Deferred. The foundation is visible and
  traceable.
- WITHDRAW: US1.2's sizing (F2) — the three concerns are now three stories
  (US1.2 the definition, US1.3 the database tier, US1.4 concurrency), and
  AC1.4.2 carries the "sets explicitly" clause that makes the busy-timeout
  criterion falsifiable against today's driver-default `busy_timeout`.
- WITHDRAW: the US3.2 ↔ US3.3 dependency cycle (F3) — US3.3 and US3.6 are both
  "Depends on: none", with the consuming relationship stated in prose, and the
  conventions block states the vocabulary rule explicitly.
- WITHDRAW: the story-relationship diagram's reversed arrows (F3.1) — the
  diagram now reads `US5.1 → US5.2…US5.5`, `US6.1 → US4.3` and
  `US0.1 →` every group, and the arrow direction matches the convention
  statement at the head of the diagram.
- WITHDRAW: the unfalsifiable criteria (F4.1, F4.2, F6.3) — AC5.1.7 now
  asserts the observable property and defers the delivery constraint to the
  Story Relationships section; AC5.1.8 asserts the returned-row-count property
  with the memory half marked as inspection-verified; AC7.2.7 names the Level AA
  floor.
- WITHDRAW: the absence of a display-holder story (F4.3) — US5.6 owns the
  definition, AC5.3.6 is retained as the directory's consumption assertion and
  points at US5.6, and FR5.1/FR5.2 now trace to US5.6.
- WITHDRAW: the absence of error-vocabulary and single-transaction work
  (F2.1, F7.1) — AC7.1.7 states the one-transaction rule, AC7.1.8 names the
  retryable code and the middleware mapping including `INVALID_STATE`, and the
  "Error codes under test" block makes the binding step an explicit named
  prerequisite.
- WITHDRAW: US8.9 and US8.10 as written (F8.1, F8.2) — US8.9 now defers only
  the pager and states that the count lines are released, and US8.10 now states
  the release's zero-case handling (AC5.4.4, AC5.5.6, AC5.1.5) with the UX
  consequence recorded.
- WITHDRAW (with one item held over — see F12 below): the US4.3 ↔ US6.1
  dependency cycle (F7.3) — the *design* is now right and the diagram and
  US4.3's Note both say `US6.1 → US4.3`, but US6.1's own "Depends on" line
  still names US4.3, so the cycle survives in the text. MAINTAINED as a
  one-line correction, not as a structural objection.
- MAINTAINED: the US4.3 ↔ US6.1 cycle in the text (F12) — see Round 2 below.
- WITHDRAW (on substance): US7.2's sizing note and the accessibility-tooling
  dependency (F6) — the note under US7.2 now records the tooling gap, the
  dependency-audit interaction and that the checker's selection is a Domain
  Design decision. The "Small — a gate, not a feature" phrasing survives in
  US7.2's INVEST note, but the note it now qualifies is the gate-handling
  note rather than the whole criterion set, and the criteria themselves
  (AC7.2.11–AC7.2.14) have become per-screen and independently checkable. I
  am content with the substance and raise no further objection on US7.2's
  sizing.

AGREE positions from Round 1 all survive the integration and are restated
here only to record that I checked them:

- AGREE: the group structure that places each shared definition in the group
  with the surfaces that consume it — now visible in US5.1/US5.6, US1.2,
  US3.3, US3.6 and US0.1.
- AGREE: the lifecycle-family sizing against the questions file's sizing rule.
- AGREE: the indivisible-group constraint, now correctly located in Story
  Relationships with AC5.1.7 asserting the property that makes it necessary.
- AGREE: the "one cross-cutting rule" treatment of the actor-trust rule in
  US7.1.
- AGREE: the persona split into one administrator and one reader, with the
  holder explicitly not a persona.
- AGREE: the deferral framing for US8.1–US8.10, with the deferral/exclusion
  distinction preserved.
- AGREE: `personas.md` now carries my F11.1 and F11.2 notes — Marcus's search
  wording states that the existing search is adequate and the improved form is
  deferred, and the "colleague covering the desk" detail is **kept** as a
  "Note carried forward to Domain Design" naming I-01 / I-03. The design
  agent's proposal to drop the detail would have discarded evidence for the
  open mechanism decision; keeping it is the right call and I am glad of it.

---

## Round 2

### Verdict on each Round-1 finding

| Finding | Verdict | Evidence in the revised draft |
|---|---|---|
| **F1** — the schema work is invisible; no foundation story | **RESOLVED** | US0.1 (AC0.1.1–AC0.1.11) carries the rebuild, the ordering constraint (AC0.1.2), the pragma window (AC0.1.3), the widened CHECK and `last_assigned_to` (AC0.1.4), the `actor` column and cascade removal (AC0.1.5), the trigger installation (AC0.1.6), the index re-issue (AC0.1.7), the `system` backfill (AC0.1.8–AC0.1.10) and the `system` identity (AC0.1.11). NFR3.3–NFR3.6 are `OK → US0.1` in `traceability.json`. |
| **F1.5** — the four NFR3 requirements are the wrong kind of deferral | **RESOLVED** | `traceability.json` now carries `{"id": "NFR3.3", "status": "OK", "target": "US0.1"}` through NFR3.6; no NFR3 row is `Deferred`. |
| **F1.6** — the `system` actor and the backfilled-history exclusion have no home | **RESOLVED** | AC0.1.11 states that the `system` actor resolves to a stable, displayable identity distinct from any person's, and AC7.1.12 repeats it on the actor story that owns display. |
| **F2** — US1.2 is three stories wearing one ID | **RESOLVED** | US1.2 (definition: AC1.2.1–AC1.2.4), US1.3 (the database tier: AC1.3.1–AC1.3.2) and US1.4 (concurrency: AC1.4.1–AC1.4.4). Each carries its own INVEST note and its own dependency line. |
| **F2's `busy_timeout` clause** — AC1.2.7 passes against code that does nothing | **RESOLVED** | AC1.4.2 now requires "a busy timeout that the application **sets explicitly** rather than inheriting from the driver's default", with the note under US1.4 recording why. This is falsifiable against today's `src/db/index.js`, which sets only `journal_mode` and `foreign_keys`. |
| **F2.1** — the retryable error code does not exist and no story creates it | **RESOLVED** | AC7.1.8 requires a retryable busy code distinct from the permanent duplicate-serial code and requires every code in the vocabulary to be mapped in the error middleware "including the invalid-state code, which the codebase today throws but does not map, so it falls through to a 500". |
| **F3** — US3.2, US3.3 and US3.6 are circularly dependent | **RESOLVED** | US3.3 and US3.6 both read "**Depends on**: none. This story is a vocabulary — data, not behaviour", and the conventions block states the rule. I re-parsed the whole dependency graph from the revised file: no cycle remains on the vocabulary side. |
| **F3.1** — the relationship diagram contradicts the "Depends on" lines | **RESOLVED** | The diagram now draws `US5.1 ──> US5.2 … US5.5` and `US6.1 (edit) ──> US4.3 (the edit is recorded)`, both matching the convention statement "Arrows point from a dependency to the story that consumes it". |
| **F3.2** — US3.6 duplicates seven criteria owned by other stories | **RESOLVED** | AC3.6.4 is now a *pointer* — it names the owning criterion for each action (AC1.1.5, AC2.1.3, AC2.2.2, AC3.2.1, AC3.5.2, AC3.4.2, AC6.1.4) rather than restating their content. The single-source rule in AC3.6.3 is marked as inspection-verified. |
| **F4.1** — AC5.1.8 is unreachable as written | **RESOLVED** | AC5.1.8 now asserts "it returns an aggregate rather than the asset rows, and the number of rows the counting query returns is the same for a dataset of ten assets as for a dataset of a thousand", with the memory half marked as NFR5.2's and inspection-verified. |
| **F4.2** — AC5.1.7 is a release-management constraint wearing a criterion | **RESOLVED** | AC5.1.7 now asserts the observable property ("its counts are produced by calling the shared counting function — no surface computes a count by any other route") and the indivisible-group delivery constraint lives in Story Relationships. |
| **F4.3** — the display-holder definition has no owning story | **RESOLVED** | US5.6 carries AC5.6.1–AC5.6.3 and is "Depends on: none"; AC5.3.6 is retained but now states "The definition itself is owned by **US5.6**; this criterion asserts that the directory consumes it". FR5.1 and FR5.2 trace to US5.6. |
| **F5** — US5.4 and US5.5 depend on a performance ceiling that does not exist | **PARTIALLY RESOLVED** — now Q9 | AC5.4.2 and AC5.5.8 no longer assert a ceiling as a pass/fail condition; both carry an italicised note that the ceiling check is performed only once the Product Owner approves it under NFR1.2 (OQ5 open). This is the quality engineer's option A. The *form* is settled and falsifiable; the *substance* — whether the criterion should visibly carry the pending gate at all — is a judgment call and is now Q9. I do not re-argue it. |
| **F5's measurement story** — three of NFR1.1's six quantities are unrepresented | **RESOLVED** | US5.7 carries AC5.7.1–AC5.7.4, names all six quantities, and AC5.7.4 covers the SQLite lock-wait measurement under the busy timeout US1.4 sets. NFR1.1–NFR1.3 all trace to US5.7. |
| **F6.2** — the accessibility tooling dependency is not surfaced | **RESOLVED** | The note under US7.2 records that no such tooling exists today, that the dependency audit is a blocking gate over the production closure, and that the checker's selection is a Domain Design decision. |
| **F6.3** — AC7.2.7's "adequate" has no threshold | **RESOLVED** | AC7.2.7 now names "the Web Content Accessibility Guidelines 2.1 Level AA target-size criterion" and "the Level AA contrast criterion", with the floor fixed by AC7.2.10. |
| **F7.1** — every write path must be restructured into one transaction; no story says so | **RESOLVED** | AC7.1.7 states that the asset change and its audit append "execute inside **one** database transaction — the asset write and the audit write are not two separate statements, and a `try`/`catch` around two statements is not a rollback". AC7.1.6 names the eleven "exactly one audit entry" criteria that assert their count against it. |
| **F7.2** — US7.1's "Depends on: none" was wrong | **RESOLVED** | US7.1's dependency line now records the actor-identity mechanism decision (I-01 / I-03) as a blocking dependency, while stating that the rule is fixed and not reopened. |
| **F7.3** — US4.3 depends on US6.1, and US6.1 depends on US4.3 | **PARTIALLY RESOLVED** — see F12 | The design is now right: US4.3's Note says "US6.1 depends on this story, never the other way round", the field effects live once in US6.1, and the diagram draws `US6.1 ──> US4.3`. But US6.1's own "Depends on" line still reads "US1.2, **US4.3** (the edit's audit behaviour), US7.1", so the cycle survives in the text. See F12. |
| **F7.4** — US1.2 needs the functional index, which US0.1 creates | **RESOLVED** | US1.2's dependency line reads "US0.1 (the functional unique index is created by the foundation migration)"; US1.3 and US1.4 both name US0.1. |
| **F7.5** — the counting surfaces need `discarded` to be a first-class status | **RESOLVED** | US5.2, US5.3 and US5.4's group all carry US0.1 in their dependency lines; US5.2 carries US0.1 explicitly and AC3.4.4 asserts the discarded bucket's counting behaviour. |
| **F7.6** — the CSV export needs a route and response shape that do not exist | **RESOLVED** | AC5.5.9 now requires the `Content-Disposition` header naming `assets-export.csv`, and `X-Content-Type-Options: nosniff` with no `X-Powered-By` on every response, with the sniffing rationale. |
| **F8.1** — US8.9 defers result counts the release already ships | **RESOLVED** | US8.9's row is now "Pagination and the pager" with "the *result counts* half of this item is **released** in US5.1 AC5.1.4 and US5.4 AC5.4.1". |
| **F8.2** — US8.10 conceals a live requirement | **RESOLVED** | US8.10's row names AC5.4.4, AC5.5.6 and AC5.1.5 as the release's zero-case handling, and AC5.4.4 now states the behaviour explicitly. |
| **F8.3** — US8.4 and US8.5 are clean | **RESOLVED (no change needed)** | The two rows remain as drafted, and the quality engineer's test-consequence note was added to US8.4 and US8.5 rather than changing their standing. |
| **F9.1** — US6.4 restates US1.1 AC1.1.3 without stating the POC field's removal | **RESOLVED** | AC6.4.1 now states that the screen "contains no assignee input — the POC's optional 'Assigned to' field is removed, and a registration request that supplies one does not assign the asset". |
| **F9.2** — US2.1 and US2.2 read as new work | **RESOLVED** | The note under US2.1 states "The field effects below are preserved POC behaviour, not new work", and names the three surrounding changes. |
| **F9.3** — AC3.1.4's enforcement lives in the rebuild | **RESOLVED** | US3.1's dependency line now names US0.1. |
| **F10.1** — AC3.6.5 is a statement about the story set | **RESOLVED** | AC3.6.5 is gone; AC3.6.4 now states the observable version ("its description is non-empty and names at least one specific of its event beyond the action name — an entry whose description equals its action alone is a failure"). |
| **F10.2** — AC3.3.5 asserts on internal structure | **RESOLVED** | AC3.3.4 now asserts the observable property ("the options offered are exactly the vocabulary's values, and no reason outside the vocabulary is offered"), with the single-source delivery rule marked as inspection-verified. |
| **F11.1** — Marcus's search wording reads as a new capability | **RESOLVED** | `personas.md` now reads: "Finds assets with the existing free-text search over name and serial or key — the existing search is adequate for this. The improved search form is deferred to a later increment, so search stays as it is." |
| **F11.2** — the "colleague covering the desk" detail | **RESOLVED** | `personas.md` keeps the detail and adds "**Note carried forward to Domain Design**", which names I-01 / I-03, states that the actor-trust rule "protects against a *forged* actor; it does not by itself prevent a *misattributed* one when two people share a configured identity", and requires that the `Acting as` indicator "must not claim an identity that the audit entry does not carry". This is better than the design agent's proposal to drop it. |

### F12 — NEW: the US4.3 ↔ US6.1 cycle survives in the revised text

**Severity: medium. This is a one-line correction, not a design change, and
it is the only thing I am still holding.**

The inversion I asked for in Round 1 was applied to **one side only**.
US4.3's dependency line reads "US6.1 (the edit path), US3.6, US7.1", and
its Note says "US6.1 depends on this story, never the other way round". The
diagram agrees: `US6.1 (edit) ──> US4.3 (the edit is recorded)`.

But **US6.1's own "Depends on" line still reads**:

> **Depends on**: US1.2, **US4.3** (the edit's audit behaviour), US7.1

So the text asserts `US4.3 → US6.1` and `US6.1 → US4.3` in the same
document. I extracted the whole dependency graph from the revised
`stories.md` and ran a cycle detection over it: after the fix, the **only**
remaining cycle in the entire story set is `US4.3 → US6.1 → US4.3`.

This matters for the reason it mattered in Round 1. The story set is the
input to Domain Design's Unit DAG. A two-node cycle in the dependency graph
is not orderable, and a developer building the Unit DAG from the "Depends on"
lines will either produce an unschedulable graph or will silently pick one
direction and get it wrong. The intent is unambiguous — the diagram, the Note
and the field-effects placement all say `US6.1 → US4.3` — so the fix is
simply to bring US6.1's line into line with the other three statements.

**What would settle it:** delete `US4.3` from US6.1's dependency line, so it
reads "US1.2, US7.1". AC4.3.3's requirement that the edit's audit entry carry
an actor is already covered by US6.1's own AC6.1.5 ("exactly one `edit` audit
entry is appended naming both fields and both previous values, and that entry
carries an actor resolved from the server's trusted context"), so nothing is
lost by the removal.

**Is this a defect the human must decide?** No. It is a knowledge dispute and
I am settling it myself: the three other statements of the intent in the same
document agree, so the fourth is an editing oversight, not a design choice.
It does not need a question, and it is not Q8/Q9/Q10.

### F13 — NEW: US1.2's AC1.2.4 is a delivery rule wearing an acceptance criterion

**Severity: low. Noted for completeness; I do not press it.**

AC1.2.4 asserts "the same comparison definition produces both the functional
unique index's expression and the application-level predicate — there is one
definition in the system, not two that happen to agree", and then carries the
parenthetical "*(The single-source delivery rule is a Domain Design
requirement and is verified by inspection, not by a product criterion.)*".

The parenthetical is honest, and the document has adopted the same convention
in AC3.3.4, AC3.6.3 and AC5.1.8. So this is not a defect I am objecting to —
it is the convention working as intended. I record it only because a reader
scanning for "criteria that assert on implementation technique" will find it
and ask, and because the story set's own "Criteria assert on **observable
outcomes**" convention arguably means the inspection-verified clauses should
be gathered into one place rather than repeated in four criteria. That is a
tidiness point for Domain Design, not a defect in this stage's output, and I
withdraw it as a finding.

### Round-2 positions

- WITHDRAW: F1, F1.5, F1.6 — the foundation is now a story with testable
  criteria and NFR3.3–NFR3.6 trace as covered.
- WITHDRAW: F2, F2.1 — US1.2 is three stories, the busy-timeout criterion can
  fail, and the error-vocabulary work is named in AC7.1.8 and in the "Error
  codes under test" block.
- WITHDRAW: F3, F3.1, F3.2 — the vocabulary cycles are broken, the diagram's
  arrows are corrected, and US3.6's duplicate criteria became pointers.
- WITHDRAW: F4.1, F4.2, F4.3 — the counting criteria are falsifiable and the
  display-holder definition has US5.6.
- WITHDRAW (on substance): F5 — the criterion form is settled and the residual
  is Q9, a judgment call for the human.
- WITHDRAW (on substance): F6 — the tooling dependency is surfaced; the sizing
  note survives but no longer mischaracterises a per-screen, independently
  checkable criterion set.
- WITHDRAW: F7.1, F7.2, F7.4, F7.5, F7.6 — the transaction rule, the actor
  mechanism's blocking dependency, the functional index's dependency on the
  foundation, the `discarded` status's dependency and the CSV response headers
  are all now stated.
- WITHDRAW (design resolved, one line outstanding): F7.3 — see F12.
- WITHDRAW: F8.1, F8.2, F8.3 — the deferred set now states what is released.
- WITHDRAW: F9.1, F9.2, F9.3 — the POC relationship is stated where it matters.
- WITHDRAW: F10.1, F10.2 — the meta-criteria are gone or reframed.
- WITHDRAW: F11.1, F11.2 — `personas.md` carries both notes, and keeps the
  "colleague covering the desk" evidence.
- MAINTAINED: F12 — the US4.3 ↔ US6.1 cycle survives in US6.1's "Depends on"
  line and is the only cycle left in the graph. Settled by deleting `US4.3`
  from that line. This is an editing correction, not a question for the human.
- WITHDRAW: F13 — noted, not pressed.

The one thing I would still ask the lead to do before the story set seeds
Domain Design's Unit DAG is the one-line correction in F12. Everything else
in my Round-1 contribution is now either integrated or correctly routed to
the human as Q8, Q9 or Q10.
