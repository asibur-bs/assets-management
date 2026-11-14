# Functional Design — Domain Vocabulary and Error Contract (`u2-domain-vocabulary`)

**Stage**: functional-design (construction)
**Intent**: 261106-asset-tracker-mvp
**Space**: default
**Scope**: feature
**Depth**: Standard
**Unit**: `u2-domain-vocabulary` — Domain Vocabulary and Error Contract
**Unit kind**: `library`

This file holds the questions that shape the Functional Design of the
`u2-domain-vocabulary` unit. The answers recorded below drive the generation
of `entities.md`, `rules.md`, `functional-spec.md` and `traceability.json` in
this directory.

**What this stage decides.** The unit's functional behaviour: the domain
entities it describes, the business rules it enforces, and the workflows and
state machines it specifies. Functional Design is the last stage that decides
*what the unit does*; Code Generation decides *how* it is written.

**What this stage does not decide.** It does not reopen the approved decision
set, the workbook, the requirements, the story set, the component catalogue,
the ADRs, or the published contracts. It does not choose the actor-identity
mechanism, which remains open question `OQ1` and is not this unit's to answer.
It does not write code, SQL, or a framework reference.

---

## The Inputs This Stage Starts From

Nine facts from the upstream artifacts constrain this design, and they are
**not** reopened here:

- **The unit is a leaf library.** It owns two components, `DomainVocabulary`
  and `ErrorTranslation`, depends on nothing but Node built-ins, and holds no
  SQL, no HTTP and no data access. Its consumers are U1, U3, U4 and U5, over
  four `shared-schema` contracts that this unit owns.
- **The transition table holds exactly eight released edges.** The two
  deferred edges — `in-stock → discarded` and `returned → discarded` — are
  **not** in the table and are refused with the invalid-transition code in
  this release. They are recorded as attachment points for a later increment,
  not as rules of this unit.
- **The error vocabulary holds exactly eight codes.** The five existing codes
  (`VALIDATION_ERROR`, `DUPLICATE_ASSET`, `NOT_FOUND`, `INVALID_TRANSITION`,
  `INVALID_STATE`) plus three additions (`ASSET_DELETE_REFUSED`,
  `BUSY_RETRYABLE`, `INTERNAL`). `BUSY_RETRYABLE` is the only retryable code.
  *Note:* `components.md:50` states "nine" — that line is superseded; the
  contract summary and ADR-012 both bind **eight**, and eight is verified
  correct against the codebase's five existing codes plus the release's three
  additions. The vocabulary tests assert the count is exactly eight.
- **The counting *definition* is here; the counting *aggregation* is in U4.**
  The split follows the data, not the layer (ADR-002). This unit owns the
  filter definition — the dimensions, their accepted values, and the
  normalisation each applies — and holds no SQL.
- **The uniqueness predicate is one definition with three callers.** The
  registration path, the edit path and the inline warning all use it, and the
  database's functional index expression shares it (ADR-008). The transaction
  disciplines differ between tiers; the comparison does not.
- **The display-holder rule is stated in three parts** (ADR-015): the current
  holder where one exists, otherwise the preserved previous holder, otherwise
  the reserved "Unassigned" designation; the two holder fields never echo one
  another; and the reserved designation applies only to an asset that has
  never been held by anybody.
- **The audit-action vocabulary holds exactly seven values:** `create`,
  `assign`, `return`, `mark-lost`, `recovered`, `discarded`, `edit`. `mark-lost`
  is the action for all three loss edges, and no transition carries an action
  of its own beyond these seven.
- **The display vocabulary holds five labels** — `In stock`, `Assigned`,
  `Returned`, `Lost`, `Discarded` — and the stored value is never displayed
  to a person.
- **Two literal copies remain by design** (ADR-004): the schema's `CHECK` text
  and the stylesheet's `.status-*` class names. This is a recorded boundary,
  not a defect, and it is not repaired by generating them from this unit.

---

## Embedded Questions

The unit is largely decided by upstream artifacts. The questions below are the
**gaps those artifacts left open** and that only this stage can close. Every
identifier is expanded, and every question offers the mandatory final option.

### Q1 — What the shared loss-reason vocabulary contains, and what the retirement-specific values add

The contract summary binds the *shape* of the reason vocabulary and states
that "the literal values are fixed at Code Generation". Two requirements
depend on those values: a mark-lost and a recovery must each carry a reason
drawn from the shared loss-reason vocabulary, and a discard must carry a reason
drawn from that vocabulary **plus** retirement-specific values. The story set
names the vocabulary as a story in its own right (`US3.3`), so this unit owns
it and it must be specified here rather than left to the consumer.

**A.** **A minimal closed set of three general loss reasons plus three
retirement-specific values** — general reasons covering the ordinary cases of
an asset being lost, and retirement-specific values covering the cases where
the asset is retired rather than lost. The general set is closed, because a
reason is a controlled vocabulary entry rather than free text, and the
retirement set is a strict superset relation: the discard path draws from both
sets, and the loss path draws from the general set only.

**B.** **A closed set of general loss reasons only, with the retirement
reasons drawn from that same set** — one vocabulary serves both paths, and the
discard path accepts any value from it. The retirement-specific values are
then not separate values at all.

**C.** **An open set** — the reason is free text validated only as non-empty,
with the shared vocabulary holding only the categories the reason dialog
groups by.

**X. Other (please specify)**

[Answer]: A

---

### Q2 — Whether the retirement-specific reasons are a superset of the loss reasons or a disjoint pair

The contract summary states the retirement reasons' "relation: the loss reasons
plus the retirement-specific values", and the approved decision set requires
that a discard reason be "drawn from the shared loss-reason vocabulary plus
retirement-specific values". Two readings of "plus" are possible and they
produce different rule logic and different option lists in the dialog.

**A.** **The retirement set is the union** — every value valid for a discard is
a value valid for a loss, plus the additional retirement-only values. A
discard's acceptable reasons are a strict superset of a mark-lost's.

**B.** **The retirement set is a distinct set, and a discard draws from
either** — the union is the acceptable set for a discard, but the two sets are
separately named in the vocabulary so that a screen can label which values are
loss reasons and which are retirement reasons.

**X. Other (please specify)**

[Answer]: B

---

### Q3 — What the loss-reason vocabulary's values are, in literal terms

The values themselves are not bound by any upstream artifact, and this unit
owns the vocabulary. They are drawn in the dialogue that asks for the reason,
so they are a user-facing list.

**A.** **Three general loss reasons — `damaged`, `lost`, `stolen` — and three
retirement-specific values — `superseded`, `returned-to-supplier`,
`written-off`.**

**B.** **Four general loss reasons — `damaged`, `lost`, `stolen`, `mislaid` —
and four retirement-specific values — `superseded`, `returned-to-supplier`,
`written-off`, `donated`.**

**C.** **Three general loss reasons — `damaged`, `lost`, `not-returned` — and
two retirement-specific values — `superseded`, `written-off`.**

**X. Other (please specify)**

[Answer]: A

---

### Q4 — What the sort-column and sort-direction whitelists contain

The filter definition carries five dimensions. Two of them — the sort column
and the sort direction — are explicitly *whitelists to literals*, and the
contract summary states that "the accepted values are not bound by any
artifact and are fixed at Code Generation". A whitelist that is not bound
cannot be specified, and this unit owns the filter definition the whitelist
lives in.

**A.** **The asset list's existing sort columns and directions, unchanged** —
the columns the current list screen already sorts by, in the current
ascending/descending pair. This unit records the whitelist; the rendering and
the query construction stay with U4 and U5.

**B.** **A wider set than the current list's** — the asset list gains sort
columns the POC does not have, so the vocabulary names them now and the
surfaces offer them now.

**C.** **A minimal set — the sort column and direction are bound here but their
values are deferred to the unit that renders the filter form**, and this unit
records only that the dimension is a whitelisted literal.

**X. Other (please specify)**

[Answer]: A

---

### Q5 — What happens to a filter value outside its accepted set

Contract 3 states the rule: "a filter value outside its accepted set is
dropped, not treated as a match". The word "dropped" leaves one thing
unresolved — whether a dropped dimension makes the *whole* filter match
everything, or whether the dimension is simply omitted and the remaining
dimensions still filter. The two readings give different numbers for the same
request, which is exactly the disagreement the shared counting definition
exists to prevent.

**A.** **The offending dimension is omitted and the other dimensions still
apply** — the filter is a conjunction over the dimensions that carry a valid
value, so an unknown category narrows nothing on that dimension but does not
disable the others.

**B.** **The whole filter is discarded and the result is unfiltered** — a
request carrying any invalid value matches every asset.

**C.** **An invalid value is an error** — the filter is refused rather than
silently adjusted.

**X. Other (please specify)**

[Answer]: A

---

### Q6 — What "one shared counting definition" means as a functional artefact

`US5.1` and `FR6.1` require the dashboard, the assignee directory, the asset
list and the CSV export to compute their counts from one shared filtering and
counting definition, and `FR6.3` requires the five bucket counts to sum to the
total record count. ADR-002 places the *definition* in this unit and the
*aggregation* in U4. This stage must state what this unit's counting
definition actually is, so that U4 can evaluate it and U5 can render it.

**A.** **One filter definition plus one named set of derived figures** — the
unit owns the filter definition and names the figures the definition yields
(the five bucket counts, the active inventory, the total record count, the
available-to-assign count), each with the rule that produces it. The *how* of
computing them is U4's.

**B.** **Only the filter definition** — the unit owns what a matching asset
is, and the figures each surface shows are each surface's own concern, which
the shared filter then guarantees agree.

**C.** **The filter definition, the derived figures, and the holder-grouping
rule** — the unit also owns how assets group into holders for the directory,
so the directory's rows and counts derive from the same definition as the
figures.

**X. Other (please specify)**

[Answer]: A

---

### Q7 — Whether the display-holder rule is a derivation the unit owns or a label the unit owns

`US5.6` and `FR5.1` make the display holder a derivation — the current holder
where one exists, otherwise the preserved previous holder, otherwise the
reserved "Unassigned" designation — and ADR-015 states the three parts of the
rule. The question is whether this unit *derives* the holder from the two
fields, or only *names* the rule and the reserved designation, leaving the
derivation to the consumer.

**A.** **This unit derives it** — the rule is a function of the two holder
fields, and every consumer that needs a holder calls this unit's derivation,
so no consumer can apply a different fallback order.

**B.** **This unit states the rule and the reserved designation; the consumer
applies the rule to its own rows** — the unit publishes the rule as the single
written definition and the reserved value, and the reporting unit applies it
when it groups assets into holders.

**X. Other (please specify)**

[Answer]: A

---

### Q8 — How the uniqueness predicate's normalisation is expressed so the database index can share it

`FR1.4` and `FR1.5` require one shared definition between the application-level
comparison predicate and the database's functional unique index: trim leading
and trailing whitespace, then fold case, scoped within a category. The
functional index's expression is written in SQL and the application predicate
is written in code, and the requirement is that they cannot disagree. The unit
owns the shared definition; how it is expressed so both tiers can consume it is
a functional-design decision, not a code-generation one.

**A.** **The unit states the normalisation as an ordered pair of named steps,
and states the requirement that the index expression implement those same two
steps** — the definition is the written rule; each tier implements it, and a
test asserts the two agree on a set of cases.

**B.** **The unit states the normalisation as a single named operation with a
defined result** — one definition, one name, and both tiers are required to
implement that one operation rather than a sequence of steps.

**C.** **The unit owns a normalising function, and the index expression is
required to be the equivalent of that function's steps** — the function is the
definition, and the SQL side is a hand-written equivalent held to it by test.

**X. Other (please specify)**

[Answer]: B

---

### Q9 — Where the "excluded: the asset being edited" exception lives

Contract 2's uniqueness predicate carries "excluded: the asset being edited" —
that is, the comparison excludes the asset under edit, so saving an asset
without changing its serial is not a self-collision. The exclusion is part of
the shared definition, but it is only meaningful on the edit path, and the
advisory inline warning runs before there is an edit in progress.

**A.** **The exclusion is part of the shared definition and is expressed as an
optional exclusion parameter** — the comparison takes the asset being excluded
when the caller has one, and the registration path passes none.

**B.** **The exclusion is a property of the edit path, not of the comparison** —
the comparison is a pure two-argument question about two values in a category,
and the edit path excludes the asset under edit from its candidate set before
asking.

**X. Other (please specify)**

[Answer]: A

---

### Q10 — Whether the error vocabulary's HTTP status and retryable flag belong in this unit

The domain layer is a leaf with no HTTP knowledge, and ADR-012 states that the
domain components "raise refusals carrying a domain code; they do not ask for
an HTTP status" and that the direction of the dependency means "the domain
layer never learns what an HTTP status is". Yet the vocabulary itself is
specified as carrying each code's HTTP status and its retryable flag, and
`ErrorTranslation` — a component of this unit — is the single consumer that
maps a code to a status. The question is how the two statements are reconciled
in the functional design.

**A.** **The vocabulary carries the status and the retryable flag as data, and
the domain components read only the code** — the data is present in the
vocabulary because the translation point needs it, and the leaf property is
preserved because no domain component reads the status field.

**B.** **The vocabulary carries only the codes and their retryable flag, and
`ErrorTranslation` owns the status mapping itself** — the vocabulary holds no
HTTP concept at all, and the translation component holds the status column.

**C.** **The vocabulary carries the codes only, and the retryable flag and the
status both belong to `ErrorTranslation`** — the vocabulary is purely a set of
names.

**X. Other (please specify)**

[Answer]: B

---

### Q11 — What the unit's functional deliverables are, given it owns no entity of its own

`entities.md` is a required deliverable of this stage, but ADR-007 records
that there are exactly two entities in the release — `Asset` and `AuditEntry` —
and that there is deliberately no `Holder` entity and no `Actor` entity,
because a holder is a display name derived from the asset rows. U2 owns neither
of the two entities: it owns the vocabulary they are validated against. The
stage has to say what `entities.md` contains for a unit that owns no entity.

**A.** **`entities.md` describes the vocabulary the unit owns as its domain
concepts** — the status buckets, the transition edges, the reason sets, the
action values, the error codes, the holder designation and the filter
dimensions — each as a concept with its attributes and its relationships, and
explicitly recording that the release's two persisted entities are owned by
other units and are not re-described here.

**B.** **`entities.md` describes the two release entities (`Asset` and
`AuditEntry`) as this unit sees them** — only the parts of each that the
vocabulary validates, so the unit's artefact is a read-only projection of the
two entities.

**C.** **`entities.md` describes the concepts this unit owns, and additionally
records the validation relationship each concept bears on the two persisted
entities** — a combined form: the vocabulary concepts are the subjects, and
each is stated together with the entity attribute it governs.

**X. Other (please specify)**

[Answer]: A

---

## Assumptions & Open Questions

- The actor-identity mechanism (`OQ1`) is **not** this unit's to decide and is
  not asked about here. It blocks U1, not U2.
- The two deferred transition edges (`in-stock → discarded`,
  `returned → discarded`) are **not** in the transition table in this release,
  and this unit records them as refused, with the attachment point named.
- The vocabulary's literal values for the reason sets and the sort whitelists
  are the subject of Q1 through Q4; they are now answered, and the answers are
  recorded in the ambiguity analysis below.

---

## Ambiguity Analysis

The stage protocol requires this analysis before artifact generation, and it
checks three things: vague answers, contradictions between answers, and
missing details needed for generation.

### Vague answers

**None.** All eleven answers are a single option letter selecting a definite,
stated design. No answer contains a hedge, a qualifier, or a deferral.

### Contradictions between answers

Two were examined. Both are resolved without reopening an approved artifact,
because in each case the answer is *consistent with* the approved artifact
once the design states the resolution explicitly. Neither requires a follow-up
question, and neither may be resolved by reopening the domain design — the
project rule forbids that.

**C1 — Q2's "either" against the approved decision set's "plus".** The
approved decision set requires that a discard reason be "drawn from the shared
loss-reason vocabulary **plus** retirement-specific values", which reads as a
union. Q2's answer names the two sets *separately* and says a discard draws
from *either*. The resolution: **the acceptable set for a discard is the
union** — every general loss reason and every retirement-specific reason are
acceptable for a discard — and the two sets are separately named in the
vocabulary so that a screen can label which values are loss reasons and which
are retirement reasons. A mark-lost and a recovery accept **only** the general
set. The design states the union as the discard path's acceptable set, so that
a reader of Q2's answer alone cannot read "either" as excluding the other set.

**C2 — Q10's answer against ADR-012's wording.** ADR-012 states that the
vocabulary carries each code "with its HTTP status and its retryable flag",
and `components.md`'s Error Vocabulary table carries an HTTP status column
per code. Q10's answer places the status mapping in `ErrorTranslation` rather
than in the vocabulary. The resolution: **the answer reconciles the two
statements in ADR-012 rather than contradicting it.** ADR-012 also states that
"the domain layer never learns what an HTTP status is" and that the
translation point "is the single translation point from a domain code to an
HTTP status". The vocabulary therefore carries the **code set and the
retryable flag**, and `ErrorTranslation` — which is a component of this unit,
and the only consumer of the vocabulary for that purpose — carries the status
mapping. The load-bearing properties are preserved in full: every code in the
vocabulary is mapped, no code reaches the client as an unmapped internal
error, and the invalid-state code now has a mapping rather than surfacing as
a 500. The two errors this unit exists to prevent are the unmapped-500
defect and the two-codes-for-one-condition defect, and neither is introduced.

### Missing details needed for artifact generation

**M1 — Q4's answer names "the asset list's existing sort columns" without
listing them.** The answer is only resolvable against the POC's actual list
screen, and the literal whitelist has to be stated for the vocabulary to be
complete. Resolved by reading the codebase, which is evidence rather than an
assumption:

| Dimension | Accepted values | Evidence |
|---|---|---|
| `sort_column` | `name`, `created_at` | `src/routes/assets.js:15`, `src/repositories/assets-repo.js:29`, and the list screen's own options at `views/list.ejs:18-19` |
| `sort_direction` | `asc`, `desc` | `src/repositories/assets-repo.js:30`, and the list screen's own options at `views/list.ejs:22-23` |

The set is exactly the one the POC already uses, and the POC whitelists each
column to a literal rather than parameterising it — which is the behaviour the
team's code-style practice requires and the answer preserves.

**M2 — the reason vocabularies' values do not exist in the POC.** Verified:
`src/services/asset-service.js` and `src/repositories/assets-repo.js` contain
no reason vocabulary at all, and `markLost` takes no reason parameter. Q3's
answer therefore introduces a new vocabulary rather than restating an existing
one, and no reconciliation against the codebase is required. The same is true
of the audit-action vocabulary, whose existing four values (`create`, `assign`,
`return`, `mark-lost`) are confirmed at `src/services/asset-service.js` and
`src/repositories/assets-repo.js:92`, with `recovered`, `discarded` and `edit`
being the release's three additions.

**No follow-up question is raised.** Every gap above is closed by reading the
upstream artifacts or the codebase, and each resolution is recorded here with
its evidence. Raising a follow-up would either reopen an approved artifact —
which the project rule forbids — or ask the human to decide something the
codebase already answers.

---

## Consolidated Summary Confirmation

**The unit.** `u2-domain-vocabulary` is a leaf library owning two components,
`DomainVocabulary` and `ErrorTranslation`. It depends on nothing but Node
built-ins, holds no SQL, no HTTP and no data access, and serves U1, U3, U4 and
U5 over four `shared-schema` contracts that it owns.

**The status vocabulary.** Five exclusive buckets — `in-stock`, `assigned`,
`returned`, `lost`, `discarded` — each with its display label (`In stock`,
`Assigned`, `Returned`, `Lost`, `Discarded`). The stored value is never
displayed to a person.

**The transition table.** Exactly eight released edges. The two deferred edges
— `in-stock → discarded` and `returned → discarded` — are refused with the
invalid-transition code and are recorded with their attachment point.

**The reason vocabularies.** Two separately named sets. The general loss-reason
set is closed and holds three values — `damaged`, `lost`, `stolen` — and is
accepted by the mark-lost and recovery paths. The retirement-specific set holds
three further values — `superseded`, `returned-to-supplier`, `written-off` — and
is accepted by the discard path. A discard's acceptable set is the **union**
of the two; a mark-lost's and a recovery's is the general set only.

**The audit-action vocabulary.** Exactly seven values — `create`, `assign`,
`return`, `mark-lost`, `recovered`, `discarded`, `edit`. `mark-lost` is the
action for all three loss edges.

**The error vocabulary.** Exactly **eight** codes — `VALIDATION_ERROR`,
`DUPLICATE_ASSET`, `NOT_FOUND`, `INVALID_TRANSITION`, `INVALID_STATE`,
`ASSET_DELETE_REFUSED`, `BUSY_RETRYABLE`, `INTERNAL`. `BUSY_RETRYABLE` is the
only retryable code. `DUPLICATE_ASSET` is the one duplicate-serial code, raised
by both tiers and indistinguishable to a caller. The vocabulary carries the
code set and the retryable flag; `ErrorTranslation` carries the status mapping
and is the single translation point, so the domain layer never learns what an
HTTP status is. The domain-design line stating "nine" codes is superseded.

**The uniqueness predicate.** One named normalisation operation — trim leading
and trailing whitespace, then fold case — scoped within a category, with an
optional exclusion parameter for the asset being edited. The database's
functional index expression is required to implement the same operation, and
the two tiers are held in agreement by test.

**The filter definition.** Five dimensions — `search_text` (free text over name
and serial/key), `category` (enumerated), `status` (enumerated), `sort_column`
(`name`, `created_at`), `sort_direction` (`asc`, `desc`) — plus the holder
dimension carried in the filter state. A value outside a dimension's accepted
set causes that dimension to be omitted; the remaining dimensions still apply.

**The counting definition.** The filter definition plus a named set of derived
figures — the five bucket counts, the active inventory, the total record count
and the available-to-assign count — each with the rule that produces it. The
five bucket counts sum to the total record count; a discarded asset counts
towards the total and not towards the active inventory. The aggregation that
evaluates them is U4's, not this unit's.

**The display-holder rule.** The unit derives the display holder rather than
merely naming the rule: the current holder where one exists, otherwise the
preserved previous holder, otherwise the reserved "Unassigned" designation. The
two holder fields never echo one another, and the reserved designation applies
only to an asset that has never been held by anybody.

**The deliverables.** `entities.md` describes the vocabulary concepts this unit
owns — the status buckets, the transition edges, the reason sets, the action
values, the error codes, the holder designation and the filter dimensions — and
records that the release's two persisted entities are owned by other units and
are not re-described here.

**Not decided here.** The actor-identity mechanism, the two deferred transition
edges, the SQL and the stylesheet's literal copies, and the aggregation that
evaluates the counting definition.

- Looks correct
- Request changes

[Answer]: Looks correct


