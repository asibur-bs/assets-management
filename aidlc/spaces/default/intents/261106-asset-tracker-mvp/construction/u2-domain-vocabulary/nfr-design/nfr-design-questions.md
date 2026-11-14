# NFR Design Questions — `u2-domain-vocabulary`

**Stage**: nfr-design (construction)
**Intent**: 261106-asset-tracker-mvp
**Unit**: `u2-domain-vocabulary` — Domain Vocabulary and Error Contract
**Unit kind**: `library`

This unit is a leaf library: no HTTP server, no database handle, no process.
NFR Design here is about **how the closed vocabularies and the translation
function enforce the unit's security, reliability, and testability
requirements** — not about middleware, caches, or scaling topology.

Upstream NFR Requirements (already approved for this unit) bind:
- Security leaves under `NFR2.*` (closed codes, no diagnostic leak, reserved
  `system` actor, uniqueness-fold agreement, empty dependency closure, …)
- Reliability leaf `NFR3.2.1` (busy detected from `SQLITE_BUSY`, mapped to
  `BUSY_RETRYABLE`)
- Testability leaves `NFR6.1.1`, `NFR6.3.1`, `NFR6.6.1`

---

## Q1 — Where the translation draws the internal-fallback boundary

The security requirement that an `INTERNAL` failure reveals no driver text, SQL,
stack, database path, or schema detail (NFR2.1.2) can be enforced in more than
one place. This question fixes **which component owns the sanitising cut**.

**A.** **`ErrorTranslation` is the cut.** It accepts a domain code (or the
absence of one) and returns only `{ code, retryable }` — never a message field
copied from a driver. Callers that hold a raw driver error must strip it
*before* calling translation, or call a dedicated "unknown failure" entry that
ignores any attached text.

**B.** **A thin adapter in each consumer is the cut.** Translation may accept
richer input; each consumer (write path, reporting) is responsible for never
passing driver text across the boundary.

**C.** **Both layers.** Translation refuses to emit any message field at all,
and consumers are still required never to pass driver text in — defence in
depth at the cost of two enforcement points.

[Answer]: C

---

## Q2 — How the busy → retryable mapping is owned

The reliability requirement that a database-busy condition is detected from
`SQLITE_BUSY` and mapped to `BUSY_RETRYABLE` (NFR3.2.1) splits naturally between
"who sees the driver code" and "who owns the domain code".

**A.** **This unit publishes the target code and the retryable flag only.**
Consumers detect `SQLITE_BUSY` themselves and then call translation with
`BUSY_RETRYABLE`. The unit's design documents the detection rule and forbids
message-text matching, but contains no driver-binding helper.

**B.** **This unit also publishes a pure helper** — e.g.
`mapDriverCode(sqliteCode) → domainCode | null` — that knows `SQLITE_BUSY` →
`BUSY_RETRYABLE` and returns null for every other driver code, so consumers
cannot invent a mapping by reading message text.

**C.** **Defer the helper.** Document the rule in the design, and leave any
helper to code-generation without naming it as a design component now.

[Answer]: B

---

## Q3 — How the reserved `system` actor stays reserved at the vocabulary edge

The reserved backfill attribution must be exactly the literal `system`, applied
only to backfilled pre-MVP history (NFR2.1.7). This unit owns the value; other
units write it.

**A.** **Export a named constant and a predicate.** The vocabulary exports
`BACKFILL_ACTOR = 'system'` and `isBackfillActor(value)`, and the design states
that person-attributed writes must fail the predicate. Completeness-metric
exclusion is specified as a consumer rule that filters on the predicate.

**B.** **Export the constant only.** Consumers compare against the literal
themselves; no predicate is part of this unit's surface.

**C.** **Export neither a dedicated name nor a predicate** — the literal
appears in the action/actor vocabulary documentation, and consumers hard-code
`'system'`.

[Answer]: A

---

## Q4 — Module and export shape for the two components

Functional Design already names `DomainVocabulary` and `ErrorTranslation` as
this unit's two components. NFR Design needs the **module boundary** that keeps
the dependency closure empty and stops HTTP concepts leaking into the
vocabulary (NFR2.4.1 and the Functional Design Q10 answer).

**A.** **Two modules, one package entry.** `vocabulary.js` holds the closed
sets and pure predicates; `translation.js` holds the code→`{status,retryable}`
mapping and the internal fallback; a single `index.js` re-exports both. Neither
module imports anything but Node built-ins (and in practice, nothing at all).

**B.** **One module.** Both components live in a single file so there is no
internal import graph to police.

**C.** **Two packages.** Separate npm-visible packages so consumers can depend
on vocabulary without translation — accepting a second package boundary inside
a release that otherwise has one.

[Answer]: A

---

## Q5 — Logical components and blast radius for a leaf library

`logical-components.md` must still say where failure stops for a unit that has
no process of its own.

**A.** **Two logical components, blast radius = "wrong shared constant".**
`DomainVocabulary` and `ErrorTranslation` are the only components. A defect in
either propagates to every consumer (U1/U3/U4/U5) as a wrong closed-set value or
a wrong refusal shape; there is no runtime isolation — isolation is the empty
dependency closure and the closed sets themselves.

**B.** **Treat the unit as one logical component.** Collapse the two names for
the NFR-design inventory; Functional Design already separates them.

**C.** **Invent a third "consumer adapter" component** in this unit to absorb
driver mapping and keep translation pure — even though that adapter would need
driver knowledge this leaf does not otherwise hold.

[Answer]: A

---

## Q6 — How this unit's tests discharge the three testability leaves

The unit binds additive tests (NFR6.1.1), requirement ids in test titles
(NFR6.3.1), and assert-on-code never on message text (NFR6.6.1).

**A.** **Pure unit tests beside the modules**, named with requirement ids, using
table-driven cases over the closed sets; busy-mapping tests feed the literal
driver code string/number, never a message; no HTTP or database harness in this
unit's suite.

**B.** **Integration tests through the write path** as the primary evidence for
this unit's requirements, so vocabulary behaviour is only asserted where a real
SQLite busy can be provoked.

**C.** **A mix** — closed-set and translation tests are pure unit tests as in A;
the busy-detection acceptance is deferred entirely to the write-path unit's
suite and is only documented here.

[Answer]: C

---

## Ambiguity Analysis

Checks three things: vague answers, contradictions between answers, and
missing details needed for generation.

### Vague answers

**None.** All six answers are a single option letter selecting a definite
design.

### Contradictions between answers

**C1 — Q2's mapping helper against Q5's two-component inventory.** Q2 adds a
pure `mapDriverCode` helper; Q5 refuses a third "consumer adapter" component.
Resolution: the helper is a **function on `ErrorTranslation`**, not a third
logical component — it stays inside the translation module's surface and does
not widen the blast-radius inventory.

**C2 — Q2's helper against Q6's deferred busy acceptance.** Q6 defers
end-to-end busy-detection acceptance to the write-path suite, while Q2 places
the mapping helper in this unit. Resolution: this unit's pure tests assert the
helper's table (`SQLITE_BUSY` → `BUSY_RETRYABLE`, every other code → `null`)
with literal driver codes (NFR6.6.1); the write path owns the acceptance that a
live busy condition is detected and fed into that helper.

### Missing details needed for artifact generation

**M1 — Return shape of translation.** Fixed by Q1: `{ code, retryable }` only;
no message field is ever emitted.

**M2 — Module filenames.** Fixed by Q4: `vocabulary.js`, `translation.js`,
`index.js`.

**No follow-up question is raised.**

---

## Consolidated Summary Confirmation

- **Internal-fallback cut (Q1):** Both layers — `ErrorTranslation` emits no
  message field, and consumers never pass driver text in.
- **Busy mapping (Q2):** This unit publishes a pure `mapDriverCode` helper on
  `ErrorTranslation` (`SQLITE_BUSY` → `BUSY_RETRYABLE`, else `null`).
- **Reserved actor (Q3):** Export `BACKFILL_ACTOR = 'system'` and
  `isBackfillActor(value)`; completeness exclusion filters on the predicate.
- **Module shape (Q4):** Two modules + one package entry (`vocabulary.js`,
  `translation.js`, `index.js`); empty dependency closure.
- **Logical components (Q5):** `DomainVocabulary` and `ErrorTranslation` only;
  blast radius is a wrong shared constant across U1/U3/U4/U5.
- **Tests (Q6):** Pure unit tests for closed sets, translation, and the mapping
  helper (requirement ids in titles; assert on codes never messages); live
  busy-detection acceptance deferred to the write-path suite.

Does this all look correct before I generate the artifact?

- Looks correct — Generate the artifact from these answers
- Request changes — Revise one or more answers before generation

[Answer]: Looks correct
