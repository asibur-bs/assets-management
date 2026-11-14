# Contract Design — Decomposition Plan and Interview Questions

**Stage**: contract-design (inception)
**Intent**: 261106-asset-tracker-mvp
**Space**: default
**Scope**: feature
**Depth**: Standard

This file holds the plan for the Asset Tracker MVP's contracts and the
questions that shape it. The answers recorded below drive the generation of
`contract-summary.md` in this directory.

**What this stage decides.** What data crosses each boundary between the six
units and out to the browser, in what shape, over what mechanism, and what
happens when the crossing fails; who owns each specification; and what makes
a change to a contract safe.

**What this stage does not decide.** The mechanism behind the actor-identity
resolution, which is an unresolved decision owned elsewhere and recorded as
`OQ1`. This stage specifies the *interface* the actor crosses, and the rule
that governs it, and it does not choose the mechanism.

Four upstream facts constrain the plan and are **not** reopened here:

- **The deployment model is one process on one host with one SQLite file.**
  `NFR5.1` requires it, `C4` names the host, and `C1` binds the approved
  decision set. There is no message broker, no service mesh, no container,
  and no second environment.
- **The unit DAG is already fixed.** The dependency artifact records ten code
  edges across six units, and every one of those ten edges is a candidate
  contract. The graph is the topology; this stage writes down what crosses
  each edge.
- **The component catalogue already drew every seam.** `components.md` names
  the twenty-one components, their entities, their `depends_on` relations, and
  the ADRs that keep them apart. The unit boundaries were drawn along those
  component boundaries, so no seam here is invented at this stage.
- **The HTTP boundary is deliberately outside the component model.** The
  domain design records the Express error middleware and the template engine
  as external dependencies rather than as components, so the HTTP surface is
  a real contract whose provider is a unit and whose mechanism is in-process
  HTTP.

---

## Decomposition Approach

**What a contract is here.** A formal agreement across a boundary: what data
crosses, in what shape, over what mechanism, and what happens on failure. The
stage's test for a boundary qualifying is fixed by the stage's own condition —
an inter-unit boundary, or a unit exposing an API consumed outside the
system. This release qualifies on both counts, so every edge of the DAG and
the browser-facing surface are in scope.

**The candidate boundaries, and where they come from.** The ten code edges
from the dependency artifact are the candidate inter-unit contracts:

| Edge | Provider | Consumer | What plausibly crosses |
|---|---|---|---|
| 1 | U2 `DomainVocabulary` | U1 `Foundation` | The status values, the audit-action vocabulary, the backfill actor value |
| 2 | U2 `DomainVocabulary` | U3 `Write Path` | The transition table, the loss reasons, the audit actions, the uniqueness predicate, the error codes |
| 3 | U2 `DomainVocabulary` | U4 `Reporting` | The filter definition, the status values, the display-holder definition |
| 4 | U2 `DomainVocabulary` | U5 `Presentation` | The transition table, the display vocabulary, the status values, the loss reasons |
| 5 | U1 `Foundation` | U3 `Write Path` | The rebuilt schema, the functional unique index, the append-only triggers, the connection handle, `busy_timeout` |
| 6 | U1 `Foundation` | U4 `Reporting` | The same connection and schema, for the counting aggregation |
| 7 | U3 `Write Path` | U4 `Reporting` | The asset rows, through the asset repository |
| 8 | U3 `Write Path` | U5 `Presentation` | The lifecycle transitions, the registration, the editing, the uniqueness comparison, the history read |
| 9 | U4 `Reporting` | U5 `Presentation` | The query, the counts, the CSV export |
| 10 | U1 `Foundation` | U5 `Presentation` | The resolved actor, for the read-only acting-as indicator |

**And one external boundary.** The browser is outside the system and consumes
U5's rendered surface — the screens, the forms, the CSV download, and the
error responses. It is the release's only externally consumed API, and there
is no other stage that owns its specification.

**What the questions below decide.** Five things, matching the stage's own
plan: which of these boundaries get a formal written contract and in what
form; the integration mechanism per boundary; who owns each specification;
the versioning and breaking-change policy; and the error, timeout, and retry
behaviour at each boundary.

---

## Embedded Questions

### Q1 — Which boundaries get a written contract, and in what form

The stage asks for a formal contract at every qualifying boundary. Some of
the ten edges carry a genuinely formal payload; some carry a value that is
read once at build time.

**A.** **A written contract at every edge, in the form the mechanism demands**
— a `shared-schema` block for the vocabulary and schema edges, an in-process
interface contract for the code edges, and an `OpenAPI` block for the HTTP
surface. Every edge gets a named contract with a stated payload, an owner, and
a failure behaviour, even where the payload is small.

**B.** **A written contract only where the payload is formal** — the `shared-schema`
contract for the vocabulary and the database, the `OpenAPI` contract for the
HTTP surface, and nothing formal for the remaining code edges, which are
covered by the component catalogue's own `depends_on` relations.

**C.** **A written contract for the external surface and the shared state
only** — the `OpenAPI` block for the browser and the `shared-schema` block for
the SQLite file, with every in-process edge left to the component catalogue.

**Recommendation:** A. The stage's purpose is to let a unit be built without
knowing how another one is built internally, and the release has one developer
who will build these units in an order the DAG only partly constrains. A
contract that names the payload and the failure behaviour is what makes the
edges buildable in parallel — which is the stated purpose of the stage. The
cost is that several contracts are small; the benefit is that a small contract
written down is one that cannot be silently reinterpreted later. Option B
leaves six edges unspecified, and "the component catalogue already says so" is
precisely the argument that failed at the DAG stage, where the catalogue's
`depends_on` column and the prose table did not agree.

**X. Other (please specify)**

[Answer]: A

---

### Q2 — The integration mechanism per boundary

This release runs as one process with one database file, so most boundaries
are in-process calls. The choice is what to *call* them and what form the
contract takes.

**A.** **Mechanism follows what actually crosses** — a `shared-schema` contract
for anything that crosses through the SQLite file (the schema, the functional
unique index, the append-only triggers, the vocabulary values read into SQL),
an in-process interface contract for a call between two units in the same
process (the lifecycle calls, the query calls, the repository calls), and a
`shared-schema` contract for the domain vocabulary, because it is a shared
model both sides compile against rather than a message either sends. The HTTP
surface is the one `OpenAPI` contract.

**B.** **One mechanism everywhere** — every boundary is an HTTP contract,
including the inter-unit ones, so that a unit could be extracted into its own
process later without changing any consumer.

**C.** **Shared schema everywhere** — the release's only shared state is the
SQLite file, so every boundary is expressed as an agreement about what the
file contains and who may write it.

**Recommendation:** A. Option B would violate `NFR5.1` — it introduces a
network boundary and a second deployment topology the release forbids — and it
would do so to serve an extraction that no requirement asks for and no
constraint permits. Option C is the opposite failure: it treats every call as
if it went through the file, which is true only of the data edges and false of
the call edges, and the modular-monolith guidance in the architecture
references is explicit that modules communicate through defined interfaces
rather than through shared tables. Naming the mechanism per boundary is also
what makes the failure behaviour specifiable: a `SQLITE_BUSY` on a data edge
is a retryable condition, while a domain refusal on a call edge is a
permanent one, and the two need different contracts.

**X. Other (please specify)**

[Answer]: A

---

### Q3 — Contract ownership

Six units, more than one contract, one developer. Ownership decides who
changes a spec and who is affected.

**A.** **The provider unit owns its contract; the domain vocabulary is owned by
U2 for every consumer** — each unit owns the specification of what it exposes,
because it is the unit that changes when that surface changes. U2's vocabulary
contract is the one exception to a plain per-edge reading: it is owned once,
by U2, and consumed by four units, so four changes to the same contract would
otherwise happen.

**B.** **Ownership is per boundary rather than per unit** — every edge gets a
named owner, which for most edges is the provider but for shared surfaces
names a separate steward.

**C.** **The whole contract set is owned centrally** — one owner for all
contracts, so that the set is consistent by construction.

**Recommendation:** A. The provider owning its own surface is the ordinary rule
and it keeps the change cost with the party that can make the change. Option B
introduces a steward role the release's roster does not have — one developer,
no second owner — and an owner that is not a unit has no implementation
responsibility behind it. Option C puts every contract in the hands of one
party, which means every domain change routes through a body that does not
own the domain. The U2 exception matters because the vocabulary is the one
contract with four consumers: U2 owns the values, and its change process must
account for all four.

**X. Other (please specify)**

[Answer]: A

---

### Q4 — Versioning and the breaking-change policy

**A.** **No version numbers; additive changes are free, and every other change
is a joint decision between provider and consumers** — the release is a single
process with a single deployable, so a contract version number would be
ceremony for a boundary that changes in the same commit as its consumers. A
contract changes only by the provider adding a field a consumer may ignore, or
by a change agreed between the provider and every consumer the change touches.

**B.** **Every contract carries a version, and a major-version bump signals a
breaking change** — the conventional policy, applied so that a future split
into separate processes has a migration path already in place.

**C.** **Versioned contracts for the external surface only, unversioned
in-process contracts** — the browser's contract is versioned because it may
outlive a deploy; the in-process contracts are versioned by the commit that
changes them.

**Recommendation:** A. The release ships as one process on one host with one
deployable, and the team's practice records that a behaviour change and its
proof land in the same commit. A version number on a contract whose provider
and consumer change in the same commit carries no information a reader can act
on. Option B would put a number on every contract that no consumer ever
compares against. Option C is closer to the truth than A but adds the number
without the benefit; the useful part of C is its distinction between the
external surface and the in-process edges, and A captures that by saying
nothing about external versioning while requiring agreement for every change.
One thing A must state explicitly is the additive-change rule: a provider may
add a field, and consumers must ignore fields they do not recognise, so that
an addition is never a breaking change.

**X. Other (please specify)**

[Answer]: A

---

### Q5 — Error, timeout, and retry behaviour at each boundary

The domain vocabulary records eight error codes, of which exactly one —
`BUSY_RETRYABLE` — is retryable, and it is reachable only through
`SQLITE_BUSY` on a data edge. The `ErrorTranslation` component maps a domain
refusal onto the HTTP boundary's reading of it.

**A.** **One failure model, stated per boundary kind** — a domain refusal
carries a domain code and is permanent unless the code is the retryable one; a
data edge that cannot take the lock within `busy_timeout` surfaces the
retryable code, and the retryable code is the only one a caller may retry; the
HTTP boundary translates a domain code into a status, and the domain never
asks for a status; a boundary never reports a failure as a generic internal
error, because the codes are what make the failures distinguishable.

**B.** **Per-boundary failure models, each specified in full** — every one of
the ten edges and the HTTP surface states its own error list, timeout, and
retry rule in full, including the timeout for each call.

**C.** **Only the external boundary specifies failures** — the browser's
contract carries the full error mapping, and the in-process edges inherit it.

**Recommendation:** A. The eight codes are a single shared vocabulary owned by
U2, and `ErrorTranslation` is the one place the domain's codes meet the
boundary's readings. A per-edge restatement of the error list (option B) would
create exactly the drift this release has already had to correct twice — the
error-vocabulary count and the band-assignment rule — because a list copied
into eleven places is eleven claims. Option C would leave the inter-unit
failures unspecified, and the whole point of the release's standing conditions
is that a busy condition and a duplicate are distinguishable *by code* at
every tier, not only at the edge the browser happens to see. Option A states
the rule once and names where it differs by boundary kind.

**X. Other (please specify)**

[Answer]: A

---

## Follow-Up Questions

These three questions come from the mandatory ambiguity analysis of the five
answers above. Each one is a place where the answers, read together with the
upstream artifacts, still leave a decision that only the human can make. They
are asked before the contract summary is generated.

### F1 — Whether the loss-reason vocabulary's values are bound by this stage

The shared loss-reason vocabulary and its retirement-specific additions cross
two of the ten edges — from the vocabulary unit to the write path, and from
the vocabulary unit to the screens — and the user stories say the options
offered in the reason dialog are exactly the vocabulary's values, so the
values are testable and someone has to fix them. But no upstream artifact
enumerates them; the user-stories stage recorded the contents as a content
decision it did not make.

**A.** **Bind the shape, not the values** — this stage specifies the
vocabulary contract as: one ordered list of reason strings shared by the loss
and recovery paths, and one wider list for discard that additionally carries
the retirement-specific values; every value is a non-empty string; the dialog
offers exactly the list's values and nothing else. The literal contents are
left to Code Generation, which is where the values are first needed.

**B.** **Bind the values** — this stage fixes the literal reason values, so
that the contract is complete before any unit is built and the dialog's
options are known in advance.

**C.** **Bind neither, and leave the vocabulary edge informal** — the loss
reasons are named as a payload but no shape or contents are stated, on the
grounds that the edge's other payloads already make the contract meaningful.

**Recommendation:** A. The stage's Q1 answer requires a *stated payload* at
every edge, and "the loss reasons" without a shape is not a stated payload —
it is a named gap. But the values are product content the human owns, and
inventing them here would put words in the release's mouth at the stage
least entitled to. Binding the shape makes the edge contract complete and
testable while leaving the content where it belongs. Option C would break the
Q1 answer for this edge specifically, and option B would be the stage
choosing product content.

**X. Other (please specify)**

[Answer]: A

---

### F2 — Who owns the browser-facing HTTP contract

The browser-facing surface gets an OpenAPI contract, and the ownership rule
is that the provider unit owns what it exposes. The only candidate provider
is the presentation unit, which exposes the routes. But the component
catalogue deliberately places the Express error middleware and the template
engine outside the component model, and the component that maps domain error
codes onto HTTP statuses — the error translation component — sits in the
**vocabulary unit**, not the presentation unit. So the endpoint set and the
status mapping have different candidate owners.

**A.** **The presentation unit owns the HTTP contract in full, and the
vocabulary unit owns the status mapping it consumes** — the OpenAPI document
is the presentation unit's artifact, and it states the status mapping by
reading the vocabulary unit's error translation contract. The presentation
unit owns the endpoints, the request and response shapes, and the document;
the vocabulary unit owns the code-to-status mapping that the document cites.
A change to the mapping is a change to the vocabulary unit's contract, agreed
with the presentation unit.

**B.** **The HTTP contract is owned jointly by the presentation and vocabulary
units** — neither unit may change it alone, and it is versioned by the
agreement of both.

**C.** **The presentation unit owns the HTTP contract in full, including the
status mapping** — the mapping is restated in the OpenAPI document and owned
there, and the vocabulary unit's translation component is an implementation
detail of the presentation unit's contract.

**Recommendation:** A. The ownership rule the human already chose is "the
provider owns what it exposes", and the provider here is unambiguous: the
presentation unit is what the browser talks to. Option B introduces a joint
ownership that the release's roster — one developer, no second owner — cannot
staff, and it makes a small change to a status mapping need two signatures
where one is enough. Option C is the one that has caused a defect before:
restating the mapping in a second place creates two claims that can drift,
which is exactly what happened with the error-vocabulary count and with the
hand-drawn dependency diagram at the previous stage.

**X. Other (please specify)**

[Answer]: A

---

### F3 — Whether the internal-error code survives the failure rule

The failure model states that a boundary never reports a failure as a generic
internal error. But the error vocabulary binds an `INTERNAL` code at HTTP
500, described as the last resort for an error carrying no domain code, and
the error translation component deliberately refuses to translate an unmapped
driver error into a domain code — it stays an internal error. Read literally,
the failure rule forbids a status the vocabulary provides.

**A.** **The rule binds domain failures only** — the failure model states
that no *domain* failure is degraded to a generic internal error: a refusal
always carries its own domain code. The `INTERNAL` code remains bound as the
boundary's terminal fallback for a failure that carries no domain code at
all, which is by definition not a domain failure and cannot be degraded from
one.

**B.** **The rule is absolute** — no boundary may ever surface the internal
code, and any failure carrying no domain code is remapped to one of the eight
bound domain codes before it reaches the boundary.

**C.** **Drop the internal code from the vocabulary for this release** — the
error vocabulary binds seven codes, and the terminal fallback is removed
along with the rule.

**Recommendation:** A. The intent of the rule is that the release's standing
conditions work — a busy condition and a duplicate must be distinguishable by
code at every tier — and that never requires a code to be invented for a
driver fault that carries no domain meaning. The rule as literally written
would forbid a code the vocabulary already binds and that the translation
component already produces, so stating the rule as binding *domain* failures
is a one-line clarification of the rule's reach rather than a change to it.
Option B would force a driver fault to wear a domain code it does not have,
which is the same misclassification the release's error discipline exists to
prevent. Option C removes a bound code from an approved vocabulary on the
strength of a wording artefact, and the approved decision set is not reopened
at this stage.

**X. Other (please specify)**

[Answer]: A

---

## Consolidated Summary Confirmation

**Which boundaries get a contract.** Every one of the ten inter-unit edges and
the browser-facing surface. A named contract with a stated payload, an owner,
and a failure behaviour for each — no edge left to the component catalogue's
`depends_on` column.

**The mechanism per boundary.** Mechanism follows what actually crosses:
`shared-schema` for the vocabulary and the SQLite-file edges, an in-process
interface contract for the call edges, and `OpenAPI` for the HTTP surface. No
HTTP boundary is invented between units, because `NFR5.1` forbids the second
deployment topology that would require.

**Ownership.** The provider unit owns the contract it exposes; U2 owns the
shared domain vocabulary for all four of its consumers. For the
browser-facing HTTP contract, U5 owns the document, the endpoints, and the
request and response shapes, and states the status mapping by reading U2's
error-translation contract; U2 owns the code-to-status mapping itself, and a
change to it is a change to U2's contract agreed with U5.

**The loss-reason vocabulary's payload.** The contract binds the *shape*, not
the values: one ordered list of non-empty reason strings shared by the loss
and recovery paths, and one wider list for discard carrying the
retirement-specific values; the dialog offers exactly the list's values. The
literal contents are left to Code Generation.

**Versioning.** No version numbers. Additive changes are safe because
consumers ignore fields they do not recognise; every other change is agreed
between the provider and each consumer it touches.

**Failure behaviour.** One failure model stated per boundary kind: a domain
refusal carries a domain code and is permanent unless it is `BUSY_RETRYABLE`;
a lock that cannot be taken within `busy_timeout` surfaces the retryable code
and only that code is retryable; the HTTP boundary translates codes to
statuses, and the domain never asks for a status; no **domain** failure is
degraded to a generic internal error. The `INTERNAL` code remains bound as
the boundary's terminal fallback for a failure that carries no domain code at
all, which by definition is not a domain failure and cannot be degraded from
one.

**Consolidated Summary Confirmation**

Does this all look correct before I generate the artifact?

- Looks correct
- Request changes

[Answer]: Looks correct
