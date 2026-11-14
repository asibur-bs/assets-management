# Security Design — Domain Vocabulary and Error Contract (`u2-domain-vocabulary`)

**Stage**: nfr-design (construction)
**Intent**: 261106-asset-tracker-mvp
**Space**: default
**Scope**: feature
**Unit**: `u2-domain-vocabulary` — Domain Vocabulary and Error Contract
**Unit kind**: `library`

This file designs how the unit enforces its NFR Requirements. It is a
**leaf library**: no process, no HTTP middleware, no database handle. Security
here is vocabulary integrity, translation totality, and an empty dependency
closure — not authentication flows or header middleware.

---

## Design Stance

1. **Defense in depth at the translation boundary (Q1).**
   `ErrorTranslation` never emits a message field (diagnostic text). It does
   return `{ code, status, retryable }` so the boundary can act without
   re-deriving HTTP status. Consumers never pass driver text into translation.
   Either layer alone is insufficient; both are required.

2. **Driver codes are mapped by a pure helper, not by message text (Q2).**
   `mapDriverCode(sqliteCode)` lives on `ErrorTranslation`. It returns
   `BUSY_RETRYABLE` for `SQLITE_BUSY` and `null` for every other code.
   Consumers detect the driver code themselves, call the helper, then call
   translation with the resulting domain code (or take the internal fallback
   when the helper returns `null` and no domain code is already known).

3. **The reserved actor is a named export with a predicate (Q3).**
   `BACKFILL_ACTOR = 'system'` and `isBackfillActor(value)` are part of
   `DomainVocabulary`. Person-attributed writes must fail the predicate.
   Completeness-metric exclusion filters on the same predicate.

4. **Two modules, one package entry, empty third-party closure (Q4).**
   `vocabulary.js`, `translation.js`, `index.js`. One-way
   `translation → vocabulary` import is allowed; no third-party or upward app
   imports. No HTTP concept in the vocabulary module — status numbers live only
   in `ErrorTranslation`.

---

## Module Layout

```
u2-domain-vocabulary/
  vocabulary.js      # DomainVocabulary — closed sets, retryable flags, predicates
  translation.js     # ErrorTranslation — status map, fallback, mapDriverCode
  index.js           # re-exports both; no other logic
```

**Ownership (single rule, implementable).** `DomainVocabulary` is the **sole
frozen source** of the eight error codes and each code's retryable flag.
`ErrorTranslation` holds the **code-to-status mapping** as its own content
(Functional Design Q10 / BR6.5) and **reads** the code set and retryable flags
from `DomainVocabulary` — it does not redefine them.

**Import rule.**
- `translation.js` **may** `require('./vocabulary')` one-way.
- `vocabulary.js` **must not** import `translation.js` (or anything else).
- Neither module imports third-party packages, Express, SQL drivers, or sibling
  app layers (`services/`, `repositories/`, `routes/`, `db/`).
- Consumers import from the package entry (`index.js`) only.

Empty dependency closure (NFR2.4.1) means **no third-party / no upward app
imports** — not "no internal require between the two modules".

**Illustrative surface (≤15 lines, not implementation):**

```js
// vocabulary.js — sole source of codes + retryable flags
const CODES = Object.freeze({ /* eight codes -> { retryable } */ });
const BACKFILL_ACTOR = 'system';
function isBackfillActor(value) { return value === BACKFILL_ACTOR; }

// translation.js — reads vocabulary; owns status column
const { CODES } = require('./vocabulary');
function translate(domainCode) {
  // returns { code, status, retryable } — never a message field
}
function mapDriverCode(sqliteCode) {
  // 'SQLITE_BUSY' -> 'BUSY_RETRYABLE'; else null
}
function unknownFailure() {
  // { code: 'INTERNAL', status: 500, retryable: false }
}
```

---

## Security Patterns by Requirement

### Closed error-code vocabulary — NFR2.1.1

**Pattern.** Frozen set of exactly eight codes, owned by `DomainVocabulary`
together with each code's retryable flag. Translation is total: every
recognised code maps through `ErrorTranslation`'s status table; every
unrecognised or absent code becomes the internal fallback via
`unknownFailure()`.

**Enforcement point.** `DomainVocabulary` (sole code/retryable source);
`ErrorTranslation.translate` / `unknownFailure` (status + totality).
Consumers must not invent a ninth code string.

### Internal fallback with no diagnostic leak — NFR2.1.2

**Pattern.** Dual cut (Q1):
- Translation returns `{ code: 'INTERNAL', status: 500, retryable: false }` —
  **status is required; message/diagnostic text is forbidden**.
- Call sites that hold a raw driver/`Error` object must not pass `.message`,
  stack, SQL, or path into translation. They call `unknownFailure()` or
  `translate` with a domain code already decided.

**Why both layers.** A consumer that forgets to strip text cannot force a leak
through translation; a translation that later grows a message field cannot
rely on consumers alone. Status is not diagnostic text — it is the boundary
reading this component owns.

### Invalid-state as request error — NFR2.1.3

**Pattern.** `INVALID_STATE` is a first-class member of `DomainVocabulary`'s
closed code set (with `retryable: false`). `ErrorTranslation` maps it to its
non-5xx boundary status in the status column it alone owns. Vocabulary never
learns the status number (BR6.5 / approved Functional Design Q10).

### Delete-refusal contract — NFR2.1.4

**Pattern.** `ASSET_DELETE_REFUSED` is in the closed set and mapped. Enforcement
ordering (refuse before any SQL) remains the write path's obligation; this
unit owns code membership and translation only.

### Single retryable code — NFR2.1.5, NFR3.2.1

**Pattern.** Exactly one code carries `retryable: true`: `BUSY_RETRYABLE`.
`mapDriverCode('SQLITE_BUSY')` is the only path that yields that code from a
driver condition. No other driver code maps into it. Message-text matching is
forbidden in this unit's helper and in its tests.

### No inferred domain codes — NFR2.1.6

**Pattern.** A failure arriving with no domain code is never classified by
inspecting message prose. `mapDriverCode` returns `null` for unknown driver
codes; the caller then uses `unknownFailure()`, not a guessed domain code.

### Reserved backfill actor — NFR2.1.7

**Pattern.** `BACKFILL_ACTOR` + `isBackfillActor`. Write path and migration use
the constant; completeness metric excludes rows where the predicate is true.
Person-attributed entries must never satisfy the predicate.

### Uniqueness-fold agreement — NFR2.2.1

**Pattern.** One normalisation operation exported from `DomainVocabulary`
(trim, then ASCII-only case fold, category-scoped). Index tier and application
tier both implement that operation; the agreement test pins the non-ASCII
boundary case.

### No boundary concept / no user content in vocabulary — NFR2.2.2

**Pattern.** Vocabulary module holds no HTTP status numbers, no header names,
and no values drawn from user input. Display labels and status tokens are
fixed literals.

### Empty dependency closure — NFR2.4.1

**Pattern.** Package has zero production dependencies. Supply-chain surface
for this unit is empty by construction.

### Actor source constraint — NFR2.5.1

**Pattern.** Vocabulary exports server-derived values (`Unassigned`,
`BACKFILL_ACTOR`) and never reads a request field. CSRF / mechanism choice
remain out of this unit (OQ1).

### Closed audit-action vocabulary — NFR2.7.1

**Pattern.** Exactly seven action values in `DomainVocabulary`. Foundation
rebuild's check constraint is built from this set.

---

## Reliability Design (library-scoped)

This unit does not host retries, circuit breakers, or health checks. Its
reliability contribution is the **stable retry signal**:

| Concern | Design |
|---|---|
| Transient busy | `mapDriverCode` → `BUSY_RETRYABLE` with `retryable: true` |
| Permanent domain failures | All other codes `retryable: false` |
| Unknown driver failures | `unknownFailure()` → `INTERNAL`, not retryable |
| Who retries | Consumers / clients; this unit only labels |

Live end-to-end busy acceptance is deferred to the write-path suite (Q6).
This unit's tests assert the mapping table with literal driver codes.

---

## Testability Design

| Leaf | Design |
|---|---|
| NFR6.1.1 | New test files additive to the POC suite; no deletion of baseline tests |
| NFR6.3.1 | Every new test title or comment names an `FR*`, `NFR*`, or `BR*` / derived id |
| NFR6.6.1 | Assertions use `err.code` / domain code / `mapDriverCode` input codes — never message prose |

**Suite shape (Q6).** Pure unit tests beside the modules for closed sets,
translation totality, `mapDriverCode` table, and `isBackfillActor`. No HTTP or
SQLite harness in this unit. Write-path owns live `SQLITE_BUSY` provocation.

---

## Threat Alignment (STRIDE → design control)

| STRIDE | Control in this design |
|---|---|
| Spoofing (false actor) | `BACKFILL_ACTOR` + `isBackfillActor`; no client-settable actor source |
| Tampering (illegal action/edge) | Closed action set + transition table ownership (enforced elsewhere) |
| Repudiation | Closed, attributable error codes via translation totality |
| Information disclosure | Dual cut on `INTERNAL`; no message field from translation |
| Denial of service (retry storm) | Exactly one retryable code; helper never invents busy from text |
| Elevation via code meaning | Closed eight-code set; no inferred codes |

---

## What This Design Does Not Decide

- Actor-identity mechanism (`OQ1`) and CSRF trigger
- HTTP header middleware (`nosniff`, `X-Powered-By`)
- Append-only DB triggers
- Retry backoff policy at the HTTP client or write-path layer
- Live busy injection strategy in the write-path test suite

---

## Sources Consumed

| Upstream | What this file takes |
|---|---|
| `security-requirements` | All unit-derived NFR2.*, NFR3.2.1, NFR6.* leaves and adjudications |
| `tech-stack-decisions` | CommonJS, empty closure, Vitest, no build step |
| `functional-spec` / `rules` | Two components, eight codes + retryable on vocabulary, status column on ErrorTranslation (Q10), seven actions, fold scope |
| `contract-summary` | Failure model: eight codes, boundary statuses, one retryable, busy on data edges |
| `nfr-design-questions` | Q1–Q6 confirmed answers |

**Stage-level consumes not produced for this unit.** The stage definition also
lists `performance-requirements`, `scalability-requirements`,
`reliability-requirements`, and `observability-requirements`. For a `library`
unit those artifacts are excluded by `produces_kinds` at nfr-requirements and
were never written under this unit. This design therefore does not cite them;
performance/scalability/observability design files are likewise out of this
unit's `produces_kinds`. Reliability content that binds the library is carried
inside `security-requirements` / this file (NFR3.2 / `mapDriverCode`), not a
separate `reliability-requirements.md`.
