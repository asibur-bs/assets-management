# Security Requirements — Domain Vocabulary and Error Contract (`u2-domain-vocabulary`)

**Stage**: nfr-requirements (construction)
**Intent**: 261106-asset-tracker-mvp
**Space**: default
**Scope**: feature
**Unit**: `u2-domain-vocabulary` — Domain Vocabulary and Error Contract
**Unit kind**: `library`

This file states the non-functional security requirements that bind the
`u2-domain-vocabulary` unit. Every requirement carries an inherited inception
NFR identifier and a sub-number, so that the requirement can be traced back to
the requirement it derives from and forward to the code and tests that satisfy
it.

**What this unit's security surface is.** This unit is a **leaf library**. It
holds no database handle, no HTTP server, no persisted state and no credential.
Its entire attack surface is the **vocabulary it publishes and the translation
it performs**. Two consequences follow, and they shape every requirement below.

1. **The vocabulary is a shared trust artefact.** Every other unit reads its
   status set, its transition table, its reason sets, its action names, its
   error codes and its comparison predicate from here. A value that is wrong,
   incomplete, or quietly extended in this unit propagates to every consumer
   without any of them noticing, because a consumer that trusts the vocabulary
   has no second source to disagree with. The vocabulary is therefore a
   **security control as well as a functional one**: the closed sets are what
   make an unvalidated input rejectable rather than merely unusual.

2. **The translation is where a failure stops being a failure and becomes a
   response.** `ErrorTranslation` is the single place a domain code becomes
   the boundary's reading of it. Everything about how the release's failures
   are shaped — what a caller can learn, what a caller is told to do, and what
   a caller is not told — is decided in this unit.

**What this unit does not decide.** The actor-identity **mechanism** is open
question `OQ1` and is not this unit's to answer; this unit owns the actor
**value** vocabulary, which is a single reserved literal. The CSRF obligation
in `NFR2.5` is conditional on that mechanism and therefore binds the write
path, not this unit. The HTTP header requirements in `NFR2.6` bind the
presentation unit's middleware, not this unit's translation component. Where
this file names such a requirement, it records **why it does not bind this
unit** rather than silently dropping it, because a requirement that vanishes
without a stated reason is indistinguishable from a requirement that was
forgotten.

---

## The Inherited Security Requirements

`NFR2` in the inception requirements document is the release's security group.
Its seven requirements are reproduced here with their pass/fail criteria, and
each is then adjudicated against this unit.

### NFR2.1 — The system shall not accept an actor identity from the client

*Pass/fail:* as specified in FR2.2.

**Adjudication: does not bind this unit's mechanism; partially binds this
unit's vocabulary.** The actor-trust rule is enforced at the write path, which
resolves the actor and passes it down. This unit contributes two things to
it. First, it holds the **reserved backfill attribution** — the literal
`system` — and the rule that this value is reserved for backfilled history and
is never a person's actor. That reservation is a security property of the
attribution record: if a person-attributed entry could carry `system`, the
history could not distinguish the release's own activity from migrated
history, and the attribution record that `NFR2.7` protects would become
ambiguous. Second, this unit's error vocabulary must never offer a code whose
meaning is "the actor could not be resolved", because such a code would be a
channel through which the attribution record's own integrity becomes visible
to a caller.

### NFR2.2 — The system shall not interpolate a user-supplied value into a SQL statement

*Pass/fail:* inspection of the query layer shows no string interpolation of a
user value into SQL.

**Adjudication: does not bind this unit, and the reason is structural.**
This unit holds no SQL and no data access; it is a leaf that depends on
nothing but the platform's own runtime. The requirement binds the write path
and the reporting unit's aggregation.

The obligation is nevertheless **load-bearing on this unit in one specific
way**, and this is the reason the adjudication is not a bare "not applicable".
This unit owns the **serial-or-key normalisation operation** — trim, then an
ASCII-only case fold — and the database's functional unique index implements
the same operation over the same column. The requirement that the two tiers
cannot disagree about what counts as a collision is therefore a requirement
*about this unit's definition*, and a mismatch between them is a defect in the
uniqueness guarantee rather than in the query layer. The boundary this unit
draws around the fold's scope is a security boundary in the narrow sense that
it is the boundary of what the uniqueness guarantee protects.

### NFR2.3 — The system shall escape user-supplied values in rendered output

*Pass/fail:* a name, note, model or serial containing HTML markup is rendered
as text, not as markup, on every surface that renders it.

**Adjudication: does not bind this unit directly; binds this unit's
vocabulary by omission.** This unit renders nothing. It does, however, publish
the **display labels** and the **status values** that surfaces render, and it
publishes the **reserved `Unassigned` designation**. A label or a status value
is a fixed literal in the vocabulary, not a user-supplied string, and this
unit's rules say so — `BR1.2` states that the stored value is never rendered,
and the stored value *is* user-controllable in the sense that it is written
from a form. The requirement that binds this unit is therefore the
**negative** one: the vocabulary must never gain a value whose content is
drawn from user input, because a vocabulary value that could carry user-supplied
text would have to be escaped at every rendering site rather than at none.

### NFR2.4 — The system shall not ship a credential, a token, a session signing key, or a committed secret file, and shall make no outbound network call

*Pass/fail:* the production dependency tree contains no committed secret, and
the application opens no outbound connection.

**Adjudication: binds this unit as a constraint on its dependencies and its
imports.** This unit depends on nothing but Node built-ins, and it holds no
credential, no token and no session signing key. Two derived requirements
follow, and they are stated below as `NFR2.4.1` and `NFR2.4.2` because they
are the *form* this unit can actually enforce, rather than the release-wide
form which the tooling unit owns.

### NFR2.5 — CSRF, conditional on the actor mechanism

*Pass/fail:* a state-changing POST without the credential is rejected, and a
route-level test asserts the rejection. (This requirement is conditional on the
mechanism and does not assert that the mechanism is a credential.)

**Adjudication: does not bind this unit, and the condition is not yet
resolved.** The requirement binds the write path, and it fires only if the
chosen actor mechanism relies on a browser-attached credential. The mechanism
is open question `OQ1`. This unit's contribution is the negative
specification: **no client-settable field or header may be the actor's
source**, so the mechanism is constrained by the outcome even before it is
chosen. The `Unassigned` designation and the `system` backfill value are
**server-derived values** and are never read from a request.

### NFR2.6 — `X-Content-Type-Options: nosniff` and no `X-Powered-By`

*Pass/fail:* every response carries the `nosniff` header and no
`X-Powered-By` header.

**Adjudication: does not bind this unit.** The headers are set by the
presentation unit's middleware. This unit contributes the requirement that
**no code in the vocabulary may itself be a response header**, and the
requirement that the translation component returns a **status and a retryable
flag and nothing else** — so that the boundary's header policy cannot be
overridden by a value read out of the vocabulary.

### NFR2.7 — The system shall refuse an attempt to update or delete an audit entry, at the database level

*Pass/fail:* as specified in FR2.7.

**Adjudication: does not bind this unit.** The enforcement point is the
database's `BEFORE UPDATE` and `BEFORE DELETE` triggers, installed by the
foundation unit's `audit_log` rebuild migration. This unit contributes the
**audit-action vocabulary** the rebuild's action constraint is built from, and
the `ASSET_DELETE_REFUSED` code the delete refusal carries.

---

## The Unit's Security Requirements

### NFR2.1.1 — The error-code vocabulary is closed at exactly eight codes

**Requirement.** The domain error-code vocabulary shall hold exactly eight
codes — `VALIDATION_ERROR`, `DUPLICATE_ASSET`, `NOT_FOUND`,
`INVALID_TRANSITION`, `INVALID_STATE`, `ASSET_DELETE_REFUSED`,
`BUSY_RETRYABLE`, `INTERNAL` — and no other value. A refusal carrying a code
that is not one of the eight shall be surfaced as the internal fallback.

**Why.** The vocabulary is the release's whole taxonomy of failure. An open
vocabulary is a vocabulary into which a code can be added to express
something the release has not decided, and every such addition is a decision
nobody made. The closed set is what makes the translation total: every code
has a defined meaning, a defined retryability, and a defined reading at the
boundary, so a caller is never told "something went wrong" for a failure the
release *does* understand.

**Enforcement.** `BR6.1` states the count; `BR6.2` states that every code is
mapped and that every other code falls back; `BR6.4` states that a failure
carrying no domain code is not translated.

**Pass/fail.** The vocabulary contains exactly eight codes; a refusal carrying
a ninth code surfaces as the internal fallback rather than as an unmapped
failure; a refusal carrying no code surfaces as the internal fallback; no code
in the set reaches the client as an unmapped internal error.

**Source.** NFR2.1 (adjudicated), FR1.7, FR1.9, BR6.1, BR6.2, BR6.4.

---

### NFR2.1.2 — The internal fallback reveals no diagnostic detail

**Requirement.** A failure surfaced as `INTERNAL` shall carry no driver error
text, no SQL statement, no stack trace, no database path, and no schema
detail in anything the boundary returns to a caller. The internal fallback's
*meaning* is "a failure the release does not understand"; the failure's
*content* is not disclosed.

**Why.** This is the release's only channel through which an unexpected
failure could leak. The `technology-stack` artifact records that the
application is a synchronous SQLite application with a machine-local database
file, and the devsecops review records the specific live findings: the
application currently returns `x-powered-by: Express` on every response and
sets no security header, and the existing error middleware is the single
translation point from a domain error to an HTTP status. A caller that
receives the raw driver message learns the schema, the driver's internals, and
whether the failure was a constraint violation or a missing table — which is
exactly the reconnaissance a second attempt needs.

**Enforcement.** The message is human-facing prose and is **not** part of the
contract: the contract is the code. `BR6.4` holds that a failure carrying no
domain code is not translated into one; this requirement holds that it is not
translated into *detail* either. The two together make the internal fallback
opaque by construction, because the fallback is chosen by the *absence* of a
code rather than by the presence of a diagnosis.

**Pass/fail.** A refusal carrying no domain code reaches the caller as the
internal fallback with no diagnostic detail in the response body; a driver
error's message text does not appear in any response; no stack trace appears
in any response.

**Source.** NFR2.4 (adjudicated), BR6.4, FR1.9.

---

### NFR2.1.3 — The invalid-state refusal is a request error, not a server fault

**Requirement.** The `INVALID_STATE` code shall be translated as a request
error, and a refusal carrying it shall never reach the caller as a server
fault.

**Why.** This is the release's one *named* information-disclosure and
availability defect in the current code, and the devsecops review records it
as verified by execution: `INVALID_STATE` is thrown today but is not in the
existing middleware's handled set, so an asset in an unknown status is refused
and the refusal is unhandled — it surfaces as a 500. A 500 for a malformed
request is wrong in three ways at once. It tells the caller the server is
broken when the server is fine. It routes a client-correctable failure into
the server's alerting path, so a client that can produce an invalid status
consumes an on-call rotation. And it conceals the specific defect: a 500
carries no code, so the caller cannot distinguish "your request was invalid"
from "something failed", and the audit trail of the release's own refusals
loses a case that this unit's vocabulary can name precisely.

**Enforcement.** `BR6.2` names the invalid-state code specifically and states
that it is mapped, "so that an asset in an unknown status is refused as a
request error rather than surfacing as a server fault". The code-to-status
mapping in `entities.md` binds it to the request-error status.

**Pass/fail.** A refusal carrying `INVALID_STATE` reaches the caller carrying
a request-error status and the `INVALID_STATE` code; it never reaches the
caller as a server fault; the code is present in the vocabulary's mapping and
not merely in the code set.

**Source.** NFR2.1 (adjudicated), FR1.9, BR6.2.

---

### NFR2.1.4 — The delete refusal has a machine-readable contract

**Requirement.** A refusal to delete an asset row shall carry the
`ASSET_DELETE_REFUSED` code, and that code shall be one of the eight in the
closed vocabulary. The refusal shall be raised **before any statement capable
of destroying an asset row or its history is issued**, so that a caller
receives a machine-readable refusal rather than a raw SQLite foreign-key
error, a constraint error, or a silently committed cascade.

**Ownership.** This unit owns the **error contract**: the code itself, its
membership in the closed vocabulary of NFR2.1.1, its mapping to a status
through `ErrorTranslation`, and the refusal's *semantics* — that a delete is
refused, that the refusal is machine-readable, and that it names the no-delete
rule rather than a driver artefact. The **write path** owns the *enforcement*:
the write-path unit rejects the operation before executing any database
statement, so that the refusal does not depend on the database being
reachable. This unit does not issue statements and makes no guarantee about
the ordering of any statement in any consumer.

**Why.** The devsecops review records the verified finding that the current
schema's `ON DELETE CASCADE` from `assets` to `audit_log` fires on a parent
delete and destroys every audit row — with the transaction committed and no
error raised. The release's answer is the foundation unit's rebuild plus two
`BEFORE DELETE` triggers, but a trigger is a *second* line of defence, and a
second line of defence is not a control if the first line is "issue the
delete". The consumer's refusal therefore happens in the application, before
any statement runs, which makes the guarantee independent of the database's
state: in the exact circumstances where the history is most at risk — the
database is unreachable, or the trigger has not yet been installed on a
partially migrated database — the refusal is still available.

What this unit contributes is that the refusal has a **name the caller can act
on**. Without a code, the caller receives whatever the driver happened to
produce — a foreign-key error, a trigger error, or nothing at all if the
cascade committed — and a caller that cannot distinguish "the operation is
refused by rule" from "the database failed" cannot behave correctly in either
case. The devsecops review verified that the `BEFORE DELETE` trigger also
blocks the cascading delete; the trigger is belt-and-braces, and the code is
what tells the caller the rule that refused them.

**Enforcement.** `BR6.6` states that the refusal is raised before any
statement is issued and that it therefore does not depend on the database;
that ordering is the write path's obligation, discharged there. `BR6.1` and
`BR6.2` bind this unit's half: the code is one of the eight, and every code
has a mapping.

**Pass/fail.** The `ASSET_DELETE_REFUSED` code is present in the closed
vocabulary and is mapped by `ErrorTranslation` to a defined status; a refusal
carrying that code is machine-readable and names the no-delete rule; no
consumer surfaces a raw SQLite foreign-key error or a silent cascade in place
of the code.

**Source.** NFR2.7 (adjudicated), FR1.9, BR6.1, BR6.2, BR6.6.

---

### NFR2.1.5 — The busy code is the only retryable code

**Requirement.** `BUSY_RETRYABLE` shall be the **only** code a caller may
retry. Every other code shall be permanent and resolved by changing the
request.

**Why.** Retryability is an instruction to the caller, and this unit is the
only place that instruction is written. Two failure modes follow from getting
it wrong, and they pull in opposite directions.

The first is a **retry storm**. A code marked retryable that is actually
permanent — the duplicate-serial code, the validation code — invites a client
to repeat a request that cannot succeed, against a single-writer SQLite
database, where each attempt takes a write lock. The devsecops review records
that the current application has no `busy_timeout` configured at all and that
its check-then-act sequences are not wrapped in a transaction, so the
uniqueness check the release adds is the very path that can block another
writer.

The second is a **dead end**. A permanent code marked non-retryable when it
is in fact transient — a database that is momentarily locked — tells the
caller that repeating the request cannot help, when repeating it is exactly
what would have helped. The `BUSY_RETRYABLE` code exists for this, and the
contract summary names it the only transient failure.

The requirement is therefore symmetric and deliberate: exactly one code may be
retried, and it is the one whose retryability is grounded in a transient
condition the release can detect by machine-readable code.

**Enforcement.** `BR6.3` states that the busy code is the only retryable code
and that every other is permanent; the retryable flag is an attribute of the
code in the vocabulary, and the translation returns it alongside the status.

**Pass/fail.** Exactly one code in the vocabulary carries a retryable flag;
the busy code carries it and no other does; a caller told a refusal is
retryable is told so only for the busy code; the busy condition is detected
from the driver's machine-readable code and never by matching message text.

**Source.** NFR2.1 (adjudicated), FR1.7, FR1.9, BR6.3, NFR3.2.1.

---

### NFR2.1.6 — A driver failure carrying no domain code is never given one

**Requirement.** A failure arriving from the database layer with no domain code
shall be surfaced as the internal fallback, and shall never be translated into
a domain code — including never into `VALIDATION_ERROR`, and never into
`BUSY_RETRYABLE`.

**Why.** This closes a hole that a well-meaning implementer would otherwise
open. The devsecops review records the verified finding that the current
repository detects a duplicate serial by **matching error message text**, and
the project rules bind the release to the opposite discipline: detect a
driver failure by its machine-readable `err.code` (`SQLITE_CONSTRAINT_UNIQUE`,
`SQLITE_BUSY`) and never by message text. Message text is not a stable
contract — it changes with the driver version, it is localised, and it is
wording chosen by whoever wrote it.

The requirement matters here because the translation is the last place where a
failure's identity is decided. If the translation component were permitted to
*infer* a code from a failure it does not recognise — by inspecting a message,
by classifying a driver error — then the vocabulary's closed set would be
circumvented at exactly the boundary that is supposed to enforce it, and the
internal fallback would stop being reachable. The `INTERNAL` code exists to
be the honest answer for a failure the release does not understand.

**Enforcement.** `BR6.4` states that a failure carrying no domain code stays
an internal error and is never translated into a domain code.

**Pass/fail.** A driver failure with no domain code surfaces as the internal
fallback; no failure is given a domain code by inference from message text;
the internal fallback is reachable and is used.

**Source.** NFR2.2 (adjudicated), NFR3.2.1, FR1.7, BR6.4.

---

### NFR3.2.1 — Busy is detected from SQLITE_BUSY and mapped to the retryable domain code

**Requirement.** A database-busy condition shall be detected from the driver's
machine-readable error code `SQLITE_BUSY`, and never by matching error-message
text. This unit shall expose `BUSY_RETRYABLE` as the domain code that condition
maps to, and shall expose the retryable flag that tells a caller the condition
is transient.

**Why.** Inception `NFR3.2` is a Reliability leaf: treat busy as retryable,
detect it from `SQLITE_BUSY`, never from message prose. This unit owns the
error-code vocabulary and the retryable-code mapping that make that leaf
enforceable. The write path raises the busy condition; this unit is what turns
that condition into a stable, machine-readable refusal rather than a string
match that changes with the driver.

**Enforcement.** `BR6.3` states that the busy code is the only retryable code;
`NFR2.1.5` and `NFR2.1.6` state the closed-vocabulary and no-inference rules
that keep the detection honest. The detection itself is performed by consumers
against the driver's `err.code`; this unit supplies the target domain code and
forbids message-text matching as the acceptance rule for that mapping.

**Pass/fail.** A busy condition surfaces as `BUSY_RETRYABLE`; detection is
from `SQLITE_BUSY` rather than from error-message text; no other driver
condition is mapped into `BUSY_RETRYABLE` by inference from message prose.

**Source.** NFR3.2, FR1.7, BR6.3, BR6.4.

---

### NFR2.2.1 — The two uniqueness tiers cannot disagree about what a collision is

**Requirement.** The database's functional unique index over the normalised
serial or key within a category and the application-level comparison shall
implement **one** normalisation operation — trim leading and trailing
whitespace, then fold case, ASCII-only, within a category — and shall be held
in agreement by a test over a named case set.

**Why.** The uniqueness guarantee has two tiers and one definition, and the
guarantee's strength is the weaker of the two. If the application tier folds
case with a Unicode-aware `toLowerCase()` and the index tier folds with
SQLite's ASCII-only `LOWER()`, the two tiers disagree on exactly the inputs
they must agree on — `İ` and `ẞ` are the cases where the two folds differ —
and the release would report a collision the database does not consider one,
or accept a value the database then refuses. The second case is the worse
one: the index fires, the write fails, and the caller sees a refusal for a
value it was told was acceptable.

The requirement therefore states the fold's scope as a boundary rather than
leaving it to the implementer. The devsecops review records that a serial or
key containing a non-ASCII letter is outside the operation's defined scope,
and that the agreement test must cover the non-ASCII boundary **as well as**
the ASCII cases — otherwise a change to either tier's fold can pass the test
while the two tiers disagree.

**Enforcement.** `BR5.1` states the operation and its scope; `BR5.2` states
that the index expression implements the same operation and names the case
set; `BR5.5` states that both tiers' collisions carry one code, so a caller
cannot tell which tier caught it.

**Pass/fail.** The agreement test covers: an identical value; a value
differing only by surrounding whitespace; a value differing only by ASCII
letter case; a value differing only by both; a value differing only by a
non-ASCII letter's case; and a value in a different category. A collision
detected at either tier carries the same code.

**Source.** NFR2.2 (adjudicated), FR1.4, FR1.5, FR1.7, BR5.1, BR5.2, BR5.5.

---

### NFR2.2.2 — The vocabulary holds no boundary concept and no user-supplied content

**Requirement.** The vocabulary shall hold no HTTP status, no URL, no header
name, no credential, and no value whose content is drawn from user input. The
vocabulary's values are fixed literals or derived values computed from fixed
literals.

**Why.** Two distinct properties, one requirement, because they are the same
kind of property: **what the vocabulary may contain**.

The first is the leaf property. The unit-of-work artifact constrains this
unit to depend on nothing but Node built-ins, and the team's Code Style rules
make it a new leaf layer that "owns the shared domain vocabulary". A
vocabulary that carried a status would hold an HTTP concept, and a domain
component reading it would be reading a boundary concept from the layer that
must not know about the boundary. The stage's approved answer to the
vocabulary's own Q10 places the status column in the translation component
rather than in the vocabulary, and `BR6.5` states it. This requirement makes
that a security property rather than a stylistic one: it means a domain
component **cannot** leak a status by reading the vocabulary, because the
vocabulary has none to leak.

The second is the injection surface. Every value the vocabulary publishes
eventually reaches a rendered page or a CSV cell. A vocabulary value that
could carry user-supplied text would need escaping at every rendering site
rather than at none — and the devsecops review records the CSV
formula-injection finding precisely: the protection is applied by one shared
escaping function to **every** string cell, and the property that gets lost
is exactly the "all cells" property, because `name` and `notes` are free text
typed by a user into an HTML form. The vocabulary's labels and statuses are
fixed literals; the values the user types are not vocabulary values and never
become them. The requirement is what keeps the two apart.

**Enforcement.** `BR6.5` states that the vocabulary holds no boundary concept;
`BR1.2` states that the stored value is never rendered and the label is
resolved from the mapping; `BR1.3` states that the label mapping exists
exactly once; `BR10.1` states that every value the unit owns is stated once
and held nowhere else; `BR10.2` records the schema's `CHECK` text and the
stylesheet's class names as the two deliberate literal copies, each checked by
a test rather than generated.

**Pass/fail.** The vocabulary contains no status, no URL, no header name and
no credential; every value in it is a fixed literal or a value computed from
fixed literals; the stored status value is never rendered to a person; the
display-label mapping exists in exactly one place.

**Source.** NFR2.3 (adjudicated), NFR2.4 (adjudicated), NFR2.6 (adjudicated),
FR3.1, FR1.9, BR1.2, BR1.3, BR6.5, BR10.1, BR10.2.

---

### NFR2.4.1 — The unit's dependency closure is empty

**Requirement.** The unit shall depend on nothing but Node built-ins. It shall
not import from `services/`, `repositories/`, `routes/`, `db/`, or from any
third-party package, and it shall hold no credential, no token, and no
session signing key.

**Why.** This is the form of `NFR2.4` that this unit can enforce on itself,
and it is a real control rather than a restatement. A leaf that depends on
nothing but the platform's runtime has a **closure of zero third-party code**,
so the supply-chain surface of the layer every other unit trusts is empty. It
also cannot import anything that could reach the database or the HTTP layer,
which is what makes the leaf property structural rather than a convention.

The devsecops review records the verified supply-chain position — the
production closure is 113 packages and reports zero vulnerabilities at the
`high` severity level — and the principle behind it: the production closure
is what ships. This unit's contribution to that closure is to add nothing to
it.

**Enforcement.** The unit-of-work artifact's implementation notes constrain
the domain layer's imports; `BR6.5` holds that the vocabulary holds no
boundary concept; the "no HTTP concept" claim is therefore checkable by
inspection of the import list.

**Pass/fail.** The unit's import list contains only `node:` built-ins; no
third-party package is imported; no credential, token, or key is present in
the unit; the unit opens no outbound connection.

**Source.** NFR2.4 (adjudicated), FR1.9, BR6.5.

---

### NFR2.5.1 — No client-settable field or header is the actor's source

**Requirement.** The actor value shall be resolved by the server from a
context the client cannot influence. A request-supplied actor shall be
**ignored** — not rejected, not sanitised — and the server-side value shall be
used. No request body field, no query-string parameter, and no header the
client can set directly may be the actor's source.

**Why.** This unit does not resolve the actor and does not choose the
mechanism; the mechanism is open question `OQ1`. But the *outcome* is
constrained here in a way that is a security property of this unit's
vocabulary rather than only of the write path.

The reserved backfill attribution — the literal `system` — is the only actor
value this unit owns, and it is a **server-derived** value: the foundation
unit stamps it onto backfilled rows. If the actor's source were a
client-settable field, then the actor's *vocabulary* would be
client-influenced, and the two reserved properties this unit owns would both
be void: the `system` reservation would not distinguish backfilled history
from the release's own history, and the attribution record that `NFR2.7`
protects would attribute an entry to whoever asked.

The requirement is deliberately negative, and it is deliberately stated
without choosing the mechanism. That is what lets it constrain four
candidate mechanisms at once without pre-empting the decision.

**Enforcement.** `BR11.2` states that the reserved backfill attribution is
never a person's actor and is applied to backfilled history and to nothing
else; `BR11.1` states that the value is read from this unit's vocabulary
rather than written at the call site.

**Pass/fail.** A route-level test asserts that a request-supplied actor is
never trusted; the server-side value is used; no client-settable field or
header is read as the actor's source; the reserved backfill value is never
stamped onto a row written by the release's own activity.

**Source.** NFR2.1 (adjudicated), NFR2.5 (adjudicated), FR2.2, FR2.3,
FR4.2, BR11.1, BR11.2.

---

### NFR2.7.1 — The audit-action vocabulary is closed at exactly seven values

**Requirement.** The audit-action vocabulary shall hold exactly seven values —
`create`, `assign`, `return`, `mark-lost`, `recovered`, `discarded`, `edit` —
and no other. The four pre-existing values shall not be renamed.

**Why.** The action vocabulary is what the foundation unit's `audit_log`
rebuild builds the table's action constraint from, and the devsecops review
records that the current table permits an `UPDATE` against a historical row —
so the append-only guarantee is a convention until the triggers are
installed. The action constraint is the second of the two append-only
mechanisms, and it is the one that stops an *invalid* action from being
written at all.

A closed action set is therefore a security control on the shape of the
attribution record: an audit row's action is one of seven named kinds of
event, and a reader can rely on that. The release's own requirements make
the vocabulary's *shape* meaningful in two ways that a closed set preserves:
the three loss edges all carry `mark-lost` regardless of origin, and the
recovery edge carries `recovered` — never `assign` and never `return` — so
that a recovery is distinguishable in the history from the operation it
resembles.

**Enforcement.** `BR4.1` states the count and the values; `BR4.2` states that
all three loss edges share `mark-lost`; `BR4.3` states that a recovery
carries `recovered` and never `assign` or `return`; `BR4.4` states that an
entry's description names a specific beyond the action name.

**Pass/fail.** The vocabulary contains exactly seven values; the four
pre-existing values keep their names; all three loss edges append exactly one
`mark-lost` entry; a recovery appends a `recovered` entry and never an
`assign` or a `return` entry.

**Source.** NFR2.7 (adjudicated), FR3.7, FR3.12, BR4.1, BR4.2, BR4.3, BR4.4.

---

### NFR2.1.7 — The reserved backfill attribution is reserved, and backfilled history is excluded from the completeness metric

**Requirement.** The reserved backfill attribution shall be exactly the literal
`system`. It shall be applied to backfilled pre-MVP history and to nothing
else. The Audit Completeness metric shall count only the release's own audit
entries, and shall exclude backfilled pre-MVP history.

**Why.** The exclusion is a **measurement integrity** property, and it is the
one place where a security property and a metric property are the same
requirement.

Backfilled history is attributed to `system`, which is not a person. If it
were included in the completeness metric, the metric would report a share of
person-attributed entries lower than the release's own behaviour warrants,
and would penalise the release for history it did not write. But the deeper
reason is that the metric is the release's **primary success measure**, and a
measure whose population is defined loosely is a measure that can be satisfied
by attribution the release did not produce. Stating the exclusion is what
makes the metric a measurement of this release rather than a measurement of the
database.

The reservation is what makes the exclusion meaningful: `system` is a distinct
value, never a person's actor, so the population can be separated by the
attribution itself rather than by a timestamp or a heuristic.

**Enforcement.** `BR11.1` states the literal and that it is read from this
unit's vocabulary; `BR11.2` states the reservation; `BR11.3` states the
metric exclusion.

**Pass/fail.** The reserved value is exactly the literal `system`; a
person-attributed entry never carries it; the completeness metric's
population excludes backfilled pre-MVP history; the exclusion is stated
rather than implied by the denominator.

**Source.** NFR2.7 (adjudicated), NFR2.1 (adjudicated), FR2.7, FR4.2,
BR11.1, BR11.2, BR11.3.

---

## The Unit's Testability Requirements

Inception `NFR6` is the release's Testability group. Three of its leaves bind
this library; the other three bind migration, concurrency-fixture, and
project-wide tooling surfaces owned elsewhere and are recorded in the
traceability coverage row by omission from the `OK` target list.

### NFR6.1.1 — This unit's tests are added to the suite, never in place of it

**Requirement.** Tests for this unit shall be added to the pre-existing POC
suite. No pre-existing test shall be deleted or replaced to make room for a
vocabulary or translation test.

**Why.** `NFR6.1` requires the POC suite to remain present and passing, with
new behaviour covered by additional tests. This unit has no I/O of its own, so
its tests are cheap pure-function cases; that cheapness must not become an
excuse to retire an existing path.

**Enforcement.** The suite inventory is asserted by the tooling unit's
baseline check; this unit's contribution is that its new files and cases are
additive.

**Pass/fail.** The pre-existing tests remain present and pass; every test
introduced for this unit is an addition rather than a replacement.

**Source.** NFR6.1.

---

### NFR6.3.1 — Every new test for this unit names the requirement it verifies

**Requirement.** Every new test that asserts a property of this unit shall
carry the identifier of the requirement it verifies — an inception `FR*`,
`NFR*`, or `BR*` id, or a unit-derived `NFRx.y.z` id from this file — in its
title or its comment.

**Why.** `NFR6.3` makes the requirement identifier the join key between a
test and the obligation it discharges. A vocabulary unit with many closed-set
assertions is exactly where an unlabelled case becomes an orphan that later
stages cannot trace.

**Enforcement.** Code review and the stage's later test-instruction artifacts
check that each new case names an id; the coverage tooling does not invent the
label.

**Pass/fail.** Each new test for this unit names a requirement identifier from
the requirements document or from this file's derived ids.

**Source.** NFR6.3.

---

### NFR6.6.1 — Error assertions use the machine-readable code, never message text

**Requirement.** A test that asserts on an error produced or translated by
this unit shall assert on the error's machine-readable code — the domain code
from the closed vocabulary, or the driver's `err.code` where the busy mapping
is under test — and shall never match on error-message prose.

**Why.** `NFR6.6` is the testability form of the same discipline `NFR3.2.1`
and `NFR2.1.6` impose on production code. This unit owns the codes under
assertion; a test that matches message text would pin wording this unit does
not guarantee and would hide a broken mapping behind a passing string check.

**Enforcement.** `BR6.3` and `BR6.4` state the production rules; this
requirement states the matching rule for the unit's own tests.

**Pass/fail.** No new test for this unit matches on error-message prose; every
error assertion names a code.

**Source.** NFR6.6, NFR3.2.1, BR6.3, BR6.4.

---

## Threat Assessment — STRIDE for This Unit

The threat model for this unit is deliberately narrow, and the narrowness is
the finding rather than an evasion. The unit has **no external entity, no
process it hosts, and no data store**. It is a set of fixed values and a
total function over them. The threats below are the ones that survive that
reduction, and each is answered by a requirement above.

| # | STRIDE | Threat | Unit's exposure | Requirement |
|---|---|---|---|---|
| S — Spoofing | An attacker causes an entry to be attributed to someone they are not | The actor's *vocabulary* is client-influenced, so the reserved value stops distinguishing backfilled history | Indirect: this unit owns the reserved value and the action vocabulary | NFR2.5.1, NFR2.1.7 |
| T — Tampering | A historical audit row is rewritten, or the transition table is widened to permit an illegal move | The action vocabulary and the transition table are what an audit row's shape and an asset's legal moves are checked against | Indirect: this unit owns both vocabularies; the enforcement points are the triggers and the check constraint | NFR2.7.1, NFR2.1.1 |
| R — Repudiation | A person denies an action, and the history cannot say who did it | The code set is the release's only non-repudiation vocabulary: a refusal that surfaces as an unmapped internal fault leaves no attributable record | Direct: this unit owns the code set and the translation | NFR2.1.1, NFR2.1.3 |
| I — Information Disclosure | An unexpected failure leaks the schema, the SQL, or the driver's internals to the caller | Direct: this unit is the last place where a failure's shape is decided | NFR2.1.2, NFR2.1.6 |
| D — Denial of Service | A client retries a permanent failure against a single-writer database, each attempt taking a write lock | Direct: this unit owns the retryable flag, and one flag marked wrong is a retry storm | NFR2.1.5 |
| E — Elevation of Privilege | A caller learns a domain code that gives it more than it should have — for example, distinguishing "the state is corrupt" from "your request was malformed" | Direct: this unit owns the code set, and a code's meaning is a disclosure | NFR2.1.3, NFR2.1.2 |

**What is deliberately not threat-modelled here.** The actor-identity mechanism
(`OQ1`), the CSRF obligation (`NFR2.5`), the HTTP header hardening
(`NFR2.6`), the append-only triggers (`NFR2.7`), the secret scan and the
dependency audit gate — all belong to other units. They are named in the
adjudications above with their owners, so that a reader of this file can see
that they were considered rather than overlooked.

**One threat that is explicitly accepted rather than mitigated.** The
non-ASCII fold boundary means the application tier and the index tier may
disagree about a serial containing a non-ASCII letter's case. This is a real
gap in the uniqueness guarantee, and it is accepted rather than papered over:
closing it would require a normalised column in the schema, which is a
foundation-unit schema change rather than a decision this unit can make. The
requirement is that the gap is **stated and tested at the boundary** rather
than left implicit — `NFR2.2.1` requires the agreement test to cover the
non-ASCII case.

---

## What This File Does Not Decide

- **The actor-identity mechanism.** It is open question `OQ1`, it is not this
  unit's to answer, and `NFR2.5.1` constrains its *outcome* without choosing
  it.
- **The CSRF obligation's trigger.** `NFR2.5` fires only if the chosen
  mechanism relies on a browser-attached credential. Until the mechanism is
  chosen the obligation is specified but untestable end to end, and it binds
  the write path rather than this unit.
- **The append-only triggers and the HTTP headers.** `NFR2.7` and `NFR2.6`
  bind the foundation and presentation units respectively.
- **The audit-row retention policy.** It is open question `OQ2`, it is
  unresolved, and nothing in this release disposes of anything — which is
  consistent with this unit's own rules, which have no disposal behaviour at
  all.

---

## Sources Consumed

| Upstream artifact | What this file takes from it |
|---|---|
| `requirements` | NFR2.1 through NFR2.7 and their pass/fail criteria; NFR3.2's machine-readable detection rule; NFR6.1, NFR6.3 and NFR6.6 as the Testability leaves that bind this library; the open questions `OQ1` and `OQ2`; constraints `C4`, `C8`, `C9` and `C10`. |
| `functional-spec` | The unit's two components and the leaf property; the code-to-status mapping; the six workflows; the eight released edges; the two deferred edges; the two reason sets; the seven audit actions; the display-holder derivation; the counting definition. |
| `rules` | The forty-five business rules this file's enforcement column names — `BR1.2`, `BR1.3`, `BR2.1`, `BR2.3`, `BR3.1`, `BR3.2`, `BR3.3`, `BR3.4`, `BR4.1`–`BR4.4`, `BR5.1`, `BR5.2`, `BR5.5`, `BR6.1`–`BR6.6`, `BR10.1`, `BR10.2`, `BR11.1`–`BR11.3` — and the vocabulary's own closed sets. |
| `contract-summary` | The failure model: the eight bound codes, the retryable one, the requirement that a domain component never learns a status, the requirement that the busy condition is reachable only on a data edge, and the statement that no domain failure is degraded to a generic internal error. |
| `technology-stack` | The runtime (Node.js, CommonJS, `better-sqlite3` synchronous), the absence of a build step, the absence of any configuration for a linter or formatter, the two environment variables, and the verified platform constraints including SQLite's ASCII-only `LOWER()`. |
| `unit-of-work` | The unit's boundary, its two owned components, its kind, its leaf constraint, and its implementation notes on the single-sourced vocabulary. |
| The devsecops contribution to Practices Discovery | The verified live findings this file's requirements rest on: the `UPDATE audit_log` probe succeeding, the cascade destroying audit rows with the transaction committed and no error, the two triggers' creation and firing, `audit_log` having no actor column, the `x-powered-by: Express` header and the absent security headers, the absence of any header or session read in `src/`, the production audit reporting zero vulnerabilities across 113 packages, and the CSV formula-injection character set. |
