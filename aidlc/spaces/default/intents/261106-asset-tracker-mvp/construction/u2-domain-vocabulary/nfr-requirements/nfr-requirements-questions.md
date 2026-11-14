# NFR Requirements — Domain Vocabulary and Error Contract (`u2-domain-vocabulary`)

**Stage**: nfr-requirements (construction)
**Intent**: 261106-asset-tracker-mvp
**Space**: default
**Scope**: feature
**Unit**: `u2-domain-vocabulary` — Domain Vocabulary and Error Contract
**Unit kind**: `library`

This file holds the questions that shape the NFR Requirements of the
`u2-domain-vocabulary` unit. The answers recorded below drive the generation
of `security-requirements.md`, `tech-stack-decisions.md` and `traceability.json`
in this directory.

**What this stage decides.** The non-functional constraints that bind this
unit, the security posture of a shared trust artefact, and the technology
choices this unit makes. NFR Requirements is the last stage that decides *what
constraints the code must satisfy*; Code Generation decides *how it is written*.

**What this stage does not decide.** It does not reopen the approved decision
set, the workbook, the requirements, the story set, the component catalogue,
the ADRs, or the published contracts. It does not choose the actor-identity
mechanism, which remains open question `OQ1` and is not this unit's to answer.
It does not write code, SQL, or a framework reference.

**Why this unit's NFR set is unusual.** U2 is a **leaf library** with an empty
dependency closure, no runtime process, no I/O and no rendered output. The five
NFR categories the stage assesses — performance, security, scalability,
reliability and observability — are mostly *not* this unit's surface. Four of
the seven declared NFR artifacts are filtered out for this unit by the stage's
own `produces_kinds`, because a library produces no service and no UI. What
remains is the security requirements and the technology decisions, and the
central design problem of this stage is to say precisely which inherited NFRs
bind a library and which do not, rather than to manufacture requirements to
fill the categories.

---

## The Inputs This Stage Starts From

Facts from the upstream artifacts constrain this design, and they are **not**
reopened here:

- **The unit is a leaf library.** It owns two components, `DomainVocabulary`
  and `ErrorTranslation`, depends on nothing but Node built-ins, and holds no
  SQL, no HTTP and no data access. Its consumers are U1, U3, U4 and U5, over
  four `shared-schema` contracts that this unit owns.
- **The error vocabulary holds exactly eight codes.** The five existing codes
  (`VALIDATION_ERROR`, `DUPLICATE_ASSET`, `NOT_FOUND`, `INVALID_TRANSITION`,
  `INVALID_STATE`) plus three additions (`ASSET_DELETE_REFUSED`,
  `BUSY_RETRYABLE`, `INTERNAL`). `BUSY_RETRYABLE` is the only retryable code.
- **The vocabulary holds no HTTP concept at all.** Functional Design's Q10 was
  answered **B**: the vocabulary carries the code set and the retryable flag;
  `ErrorTranslation` owns the code-to-status mapping and is the single
  translation point. The domain layer never learns what an HTTP status is.
- **The transition table holds exactly eight released edges.** The two
  deferred edges — `in-stock → discarded` and `returned → discarded` — are
  refused with the invalid-transition code in this release.
- **The audit-action vocabulary holds exactly seven values:** `create`,
  `assign`, `return`, `mark-lost`, `recovered`, `discarded`, `edit`.
- **The uniqueness predicate is one definition with three callers.** The
  registration path, the edit path and the inline warning all use it, and the
  database's functional index expression shares it (ADR-008).
- **Two literal copies remain by design** (ADR-004): the schema's `CHECK` text
  and the stylesheet's `.status-*` class names.
- **The counting *definition* is here; the counting *aggregation* is in U4**
  (ADR-002). This unit owns the filter definition — the dimensions, their
  accepted values, and the normalisation each applies — and holds no SQL.
- **The technology stack is already decided for the project.** The brownfield
  `technology-stack` artifact records Node.js with Express, SQLite via
  `better-sqlite3`, EJS views, Vitest 2.1.9 with the V8 coverage provider, and
  `supertest` for HTTP-level tests. This unit does not re-decide any of it.

---

## Embedded Questions

The unit's NFR position is largely determined by the upstream artifacts. The
questions below are the **gaps those artifacts left open** and that only this
stage can close. Every identifier is expanded, and every question offers the
mandatory final option.

### Q1 — What the security requirements of this unit are *for*

The unit holds the vocabulary every other unit validates against. A wrong
value in it — a status outside the five buckets, an audit action outside the
seven, a reason outside its set — propagates into every write path and every
screen. But the unit performs no I/O, holds no credential and touches no user
data, so a conventional per-unit security requirements list (authentication,
authorisation, encryption at rest, secrets handling) has almost nothing to
attach to. The question is what the security requirements of this unit are
actually *about*.

**A.** **The unit's security requirements are about the integrity and closure
of the vocabulary itself** — the code set is closed and cannot grow silently,
the internal fallback reveals no diagnostic detail, the delete refusal has a
machine-readable contract and a defined refusal semantics, the busy code is the
only retryable code, a driver failure carrying no domain code is never given
one, the normalisation fold is the same one the index uses, the dependency
closure is empty, no client-settable field is the actor's source, and the
audit-action set is closed. Security for this unit is *vocabulary integrity*,
and the threat model is the failure of a shared trust artefact rather than the
compromise of a runtime.

**B.** **The unit has no security requirements of its own, and the stage
records only the inherited NFR2 requirements with adjudications** — the file
becomes a restatement of what the group already says, with a note that this
unit cannot enforce most of it.

**C.** **The unit's security requirements are about the secrecy of the data it
processes** — the serial/key values and holder names it compares are sensitive,
so the unit's requirements cover not logging them, not exposing them in error
messages, and minimising their retention in memory.

**X. Other (please specify)**

[Answer]: A

---

### Q2 — Whether the retryable busy code belongs to this unit's vocabulary or to its consumers

The approved decision set's standing condition requires that the uniqueness
check runs inside an `IMMEDIATE` transaction with a non-zero `busy_timeout`,
and that `SQLITE_BUSY` is mapped to a **retryable error**. A retryable error
has to exist as a domain code for the mapping to target, and the requirement
that "no current code is retryable" was a verified finding about this unit's
own vocabulary. The question is what this unit states about that code.

**A.** **This unit owns the retryable flag and requires exactly one code to
carry it** — `BUSY_RETRYABLE` is the only retryable code in the vocabulary; the
requirement is that no second code is ever marked retryable, because a second
retryable code is either a retry storm waiting to happen or a dead end where
the caller retries something that will never succeed. The detection of
`SQLITE_BUSY` itself belongs to the write path that touches the database.

**B.** **This unit owns only the flag; the retry policy belongs to the caller**
— the vocabulary marks `BUSY_RETRYABLE` retryable and says nothing else; how
many times, and with what backoff, a caller retries is the caller's business.

**C.** **This unit owns the retry policy as well as the flag** — the vocabulary
carries the maximum attempt count and the backoff interval, so that every
caller retries identically.

**X. Other (please specify)**

[Answer]: A

---

### Q3 — What the internal fallback error must not reveal

The error middleware is the single translation point from a domain error to an
HTTP response, and the release adds a code for failures that are not the
caller's fault. The question is what an internal error's response body may
contain, and whether this unit constrains it.

**A.** **This unit constrains the internal error to carry no diagnostic
detail** — the internal error's code is the whole of what the caller learns;
the driver's message text, the SQL statement, the stack trace, the database
file path and the schema detail are all excluded. The diagnostic detail
travels to the operator through the log, not to the caller through the
response.

**B.** **This unit constrains nothing here** — the shape of the internal
error's payload belongs to the error middleware in U3 and to the presentation
layer's error page, and this unit only supplies the code.

**C.** **This unit constrains the internal error to reveal the driver's message
text but not the stack trace** — the message is useful to an operator
diagnosing from the browser, and the stack trace is the sensitive part.

**X. Other (please specify)**

[Answer]: A

---

### Q4 — Whether the normalisation fold is ASCII-only or full Unicode

The uniqueness requirement is one shared definition between the application
predicate and the database's functional index: trim whitespace, then fold
case, scoped within a category. The database's index expression folds ASCII
case only — SQLite's `lower()` is ASCII-only by construction — so a JavaScript
predicate using `toLowerCase()` would fold *more* than the index does, and the
two tiers could disagree about a non-ASCII serial. The question is how this
unit closes, or refuses to close, that gap.

**A.** **The fold is ASCII-only and the boundary is stated rather than closed**
— the vocabulary specifies an ASCII-only case fold, matching the index exactly,
and records the consequence explicitly: a serial differing from another only
by a non-ASCII letter is *not* treated as a collision by the application
predicate, and the case is tested at the boundary so that the behaviour is
known rather than accidental. Closing it properly would require a normalised
column and a matching index expression, which is a schema change belonging to
the foundation unit.

**B.** **The fold is full Unicode and the requirement states that the index
expression must implement the same fold** — the definition is the JavaScript
`toLowerCase()` behaviour, and the index expression is required to implement
the equivalent, accepting whatever cost that imposes on the schema.

**C.** **The fold is ASCII-only, and the non-ASCII case is recorded as a
defect to be fixed in a later increment with no requirement stated for this
release** — this unit specifies the ASCII fold and files the rest.

**X. Other (please specify)**

[Answer]: A

---

### Q5 — Whether the audit-action vocabulary's closure is this unit's requirement or an upstream fact

The audit-action set is closed at seven values. The requirement that no eighth
action appears is a property of a shared artefact that four other units write
into, so a value added silently by any consumer would be a defect this unit
should detect. The question is whether the closure is asserted here as a
requirement on this unit, or merely recorded as inherited context.

**A.** **The closure is this unit's requirement** — the vocabulary holds
exactly seven values, the set is closed, and a test asserts the count and the
membership, so that a consumer adding an eighth action fails a test owned by
this unit rather than being discovered later in the audit trail.

**B.** **The closure is inherited context** — the requirement set already
binds it elsewhere and this unit records it as a fact it honours, without
adding an assertion of its own.

**C.** **The closure is this unit's requirement, but only as an upper bound on
the number of values** — the unit asserts that no more than seven actions
exist, without asserting which seven, so that a later increment may add a
value without breaking this unit's test.

**X. Other (please specify)**

[Answer]: A

---

### Q6 — What the technology stack of this unit is

The brownfield `technology-stack` artifact already fixes the project's stack:
Node.js, Express, SQLite via `better-sqlite3`, EJS, Vitest with V8 coverage.
For a leaf library with an empty dependency closure, the question is what this
unit adds — and the strongest available answer is that it adds nothing, which
is itself a decision worth recording rather than a silence.

**A.** **The unit's stack is the inherited project stack, and its dependency
closure is literally empty** — Node built-ins only, no runtime package, no
build step, no generator, no configuration, no environment variable. The
exported interface is plain frozen data plus pure functions, with no class, no
singleton and no mutable module state. Every alternative that would add a
dependency, a build step or a runtime configuration is recorded as rejected.

**B.** **The unit's stack adds a schema-validation library** — the vocabulary
is validated at its boundary by a declarative schema rather than by hand-written
guards, which trades the empty dependency closure for a machine-checked shape.

**C.** **The unit's stack adds TypeScript** — the vocabulary's types are
declared, so the consumers get checked contracts, at the cost of a build step
and a change to the project's JavaScript convention.

**X. Other (please specify)**

[Answer]: A

---

### Q7 — Which inherited NFR groups this unit is bound by

The requirements file carries six NFR groups — performance, security, data
protection, accessibility, maintainability, and the error/observability
discipline. A leaf library with no runtime, no rendered output and no stored
state is bound by some of them and by no surface at all in the others. The
question is how the traceability file records that.

**A.** **The unit is bound by the security group and by the error-contract
requirements of the sixth group; the other four are recorded as `N/A` with a
justification naming where they are adjudicated** — each `N/A` names the unit
that owns the surface in question, so the reader can follow the requirement
rather than finding a dead end.

**B.** **Every group is recorded as `N/A` except security** — the sixth group's
requirements bind the consumers' error handling rather than this unit's
vocabulary, so only the security group reaches the unit.

**C.** **Every group is bound, with the unit's own contribution to each
stated** — the unit is held to the performance, accessibility and reliability
groups through the constraint that it must not slow its consumers or change
their rendered semantics.

**X. Other (please specify)**

[Answer]: A

---

### Q8 — What the threat model of this unit is

The stage's security guidance expects a STRIDE assessment. For a library with
no I/O and no credential, most of STRIDE's categories have no attack surface
here, and a threat table with a row per category and a "not applicable" in
every cell is a table that says nothing. The question is what the threat model
of a shared trust artefact actually is.

**A.** **The threat model is the failure of the vocabulary as a shared trust
artefact, assessed against STRIDE** — the threats are a vocabulary that grows
silently, an error that leaks driver detail, a refusal that arrives after the
statement it should have prevented, an internal error that masquerades as a
caller error, two uniqueness tiers that disagree about a collision, an actor
that comes from a client-settable field, and a backfilled attribution that
pollutes the completeness metric. Each maps to a requirement, and the STRIDE
categories with no surface here are named as deliberately out of scope rather
than filled with "not applicable" rows.

**B.** **The threat model is standard STRIDE with one row per category** —
each row states that the category has no surface in this unit and why, which
keeps the table's shape uniform with the other units' tables.

**C.** **No threat model is produced for this unit** — a library with no
attack surface has no threats, and the security file carries requirements only.

**X. Other (please specify)**

[Answer]: A

---

## Assumptions & Open Questions

- The actor-identity mechanism (`OQ1`) is **not** this unit's to decide and is
  not asked about here. It blocks U1, not U2. This unit's requirement is the
  *rule* only — no client-settable field or header may be the actor's source
  — which holds whichever mechanism is eventually chosen.
- The two deferred transition edges (`in-stock → discarded`,
  `returned → discarded`) are **not** in the transition table in this release,
  and this unit records them as refused, with the attachment point named.
- The four NFR artifacts the stage declares but this unit's kind excludes
  (`performance-requirements`, `scalability-requirements`,
  `reliability-requirements`, `observability-requirements`) are produced by the
  engine's `produces_kinds` filter, not by a choice made here. This stage
  records no obligation to produce them for a `library` unit.

---

## Ambiguity Analysis

The stage protocol requires this analysis before artifact generation, and it
checks three things: vague answers, contradictions between answers, and
missing details needed for generation.

### Vague answers

**None.** All eight answers are a single option letter selecting a definite,
stated design. No answer contains a hedge, a qualifier, or a deferral.

### Contradictions between answers

Two were examined. Both are resolved without reopening an approved artifact,
because in each case the answer is *consistent with* the approved artifact
once the design states the resolution explicitly. Neither requires a follow-up
question, and neither may be resolved by reopening the Functional Design —
the project rule forbids that.

**C1 — Q1's "vocabulary integrity" against NFR2's inherited content.** NFR2
carries seven requirements, and the most natural reading of the group is
authentication, authorisation, data protection and the rest — requirements
about a running system that this unit does not run. Q1's answer says the unit's
security requirements are about the closure and integrity of the vocabulary
rather than about the group's inherited subject matter. The resolution:
**the seven inherited requirements are adjudicated against this unit
individually, and each adjudication states whether the requirement binds,
binds partially, or does not bind here** — and a non-binding adjudication still
records the *reason* and names the unit that does carry the requirement. The
group is not reinterpreted; each of its seven requirements is placed.

**C2 — Q7's "not applicable" against NFR6.6.** Q7's answer binds the sixth
group to the unit on the strength of its error-contract requirement — assert on
`err.code`, never on error-message text — which is the unit's own assertion
vocabulary. But the sixth group's other requirements are about the consumers'
error handling, logging and correlation, which this unit does not perform. The
resolution: **the sixth group is recorded as `OK`, targeted at the specific
requirements in it that reach this unit, and its remaining requirements are
adjudicated in the inherited-requirements section of the security file rather
than being claimed as this unit's deliverable.** The `OK` row names the
requirements it is bound by; the file records the rest as adjudicated
elsewhere.

### Missing details needed for artifact generation

**M1 — the "no diagnostic detail" set is not enumerated by any upstream
artifact.** Q3's answer says the internal error reveals no driver text, SQL,
stack trace, database path or schema detail. The enumeration is derived from
what the release's own technology actually holds, and it is stated in the
requirement rather than assumed: the driver error message from `better-sqlite3`
carries the SQL text and the constraint name, the stack trace carries the
absolute path of the database file, and the schema detail would come from the
`sqlite_master` row. Resolved by reading the codebase, which is evidence
rather than an assumption.

**M2 — the ASCII-fold boundary needs a concrete case to be testable.** Q4's
answer states the fold is ASCII-only and that the boundary is "tested". The
case is fixed by choosing a serial pair that differs only in a non-ASCII
letter: `Ä` (U+00C4) versus `ä` (U+00E4). Under an ASCII-only fold these are
two distinct serials and do not collide; under a full-Unicode fold they are
one. The requirement states the expected outcome and the requirement to pin
it, so the test can assert a definite result.

**M3 — NFR6's requirement ids need to be read from the requirements file
rather than assumed.** The traceability row for the sixth group names its
requirements, and those ids must be the ones the requirements file actually
carries. Resolved by reading `requirements.md`; the group's leaf ids are
recorded in the traceability file's `coverage` row and in the security file's
inherited-requirements section.

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

**The security posture.** For a shared trust artefact, security *is* the
integrity and closure of the vocabulary. The seven inherited NFR2
requirements are adjudicated against this unit individually — each one states
whether it binds here, binds partially, or does not bind, with the reason and
the owning unit named in every case that does not bind.

**The unit's own security requirements.** The error-code vocabulary is closed
at exactly eight codes. The internal fallback reveals no diagnostic detail —
no driver text, no SQL, no stack trace, no database path, no schema detail.
The invalid-state refusal is a request error rather than a server fault, which
closes the verified defect where `INVALID_STATE` was thrown but unmapped and
surfaced as a 500. The delete refusal has a machine-readable contract: this
unit owns the `ASSET_DELETE_REFUSED` code, its membership in the closed
vocabulary, and its status mapping through `ErrorTranslation`; the write-path
unit owns the enforcement, rejecting the operation before any database
statement is issued; and the caller receives a clear machine-readable refusal
rather than a raw SQLite foreign-key error. `BUSY_RETRYABLE` is the only
retryable code, which guards against both a retry storm and a dead end. A
driver failure carrying no domain code is never given one. The two uniqueness
tiers cannot disagree about what a collision is: the fold is ASCII-only,
matching the index exactly, and the non-ASCII boundary is stated and tested
rather than left accidental. The unit's dependency closure is empty. No
client-settable field or header is the actor's source. The audit-action
vocabulary is closed at exactly seven values. The reserved backfill attribution
stays reserved, and backfilled history stays excluded from the completeness
metric.

**The threat model.** The threat is the failure of the shared trust artefact,
not the compromise of a runtime: a vocabulary that grows silently, an error
that leaks driver detail, a refusal that arrives after the statement it should
have prevented, an internal error masquerading as a caller error, two
uniqueness tiers disagreeing about a collision, an actor sourced from a
client-settable field, and a backfilled attribution polluting the completeness
metric. Each maps to a requirement. The STRIDE categories with no surface in a
leaf library are named as deliberately out of scope rather than filled with
"not applicable" rows.

**The technology stack.** JavaScript, CommonJS, the inherited project stack.
The dependency closure is **literally empty** — Node built-ins only, no
runtime package, no build step, no generator, no configuration, no environment
variable. The exported interface is plain frozen data plus pure functions: no
class, no singleton, no mutable module state. The code-to-status mapping is
held by the translation component, so the vocabulary holds no HTTP concept at
all. The normalisation fold is ASCII-only and the boundary is stated rather
than closed. The counting *definition* is here; the counting *aggregation* is
in the reporting unit. The two deferred transition edges are held as absences
with the refusal stated as a rule. Audit-action values are hyphenated strings
and the four pre-existing values are not renamed. The test toolchain is
unchanged — Vitest 2.1.9 with the V8 coverage provider.

**The traceability.** The unit is bound by the security group and by the
error-contract requirements of the sixth group. The performance,
data-protection, accessibility and maintainability groups are recorded as
`N/A` with a justification naming the unit that owns each surface. The
data-protection group's one exception — the machine-readable `SQLITE_BUSY`
detection — is adjudicated through the retryable-code requirement and the
no-fabricated-code requirement.

**Not decided here.** The actor-identity mechanism, the two deferred transition
edges, the SQL and the stylesheet's literal copies, the aggregation that
evaluates the counting definition, and the performance, scalability,
reliability and observability targets, which bind on the units that own the
running surfaces.

- Looks correct
- Request changes

[Answer]: Looks correct
