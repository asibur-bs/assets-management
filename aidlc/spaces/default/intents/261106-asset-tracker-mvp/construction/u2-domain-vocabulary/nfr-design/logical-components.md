# Logical Components — Domain Vocabulary and Error Contract (`u2-domain-vocabulary`)

**Stage**: nfr-design (construction)
**Intent**: 261106-asset-tracker-mvp
**Space**: default
**Scope**: feature
**Unit**: `u2-domain-vocabulary` — Domain Vocabulary and Error Contract
**Unit kind**: `library`

This inventory bridges NFR Design to later Infrastructure Design. For a leaf
library there is no deployable process to isolate — isolation is the empty
dependency closure and the closed sets. Blast radius is therefore
**incorrect shared constants**, not process failure.

---

## Component Inventory

| Component | Module | Responsibility | NFR patterns hosted |
|---|---|---|---|
| `DomainVocabulary` | `vocabulary.js` | Closed status, transition, reason, action, and actor sets; **sole frozen source of the eight error codes and each code's retryable flag**; normalisation; `BACKFILL_ACTOR` / `isBackfillActor` | NFR2.1.1 (codes/retryable source), NFR2.1.5 (retryable flag values), NFR2.1.7, NFR2.2.1, NFR2.2.2, NFR2.5.1, NFR2.7.1 |
| `ErrorTranslation` | `translation.js` | Reads codes/retryable from vocabulary one-way; **owns the code-to-status mapping**; returns `{ code, status, retryable }` with no message field; internal fallback; `mapDriverCode` | NFR2.1.1 (totality/status), NFR2.1.2–NFR2.1.6, NFR3.2.1, NFR6.6.1 (assertion target) |

**Package entry.** `index.js` re-exports both. It is not a third logical
component — it has no behaviour of its own.

**Data flow.** `translation.js` → `require('./vocabulary')` only. Vocabulary
never imports translation. Codes and retryable flags are not duplicated.

**Explicit non-component.** There is no consumer-adapter component in this
unit (Q5). Driver detection stays in U3/U4; this unit only maps codes.

---

## Failure Domains and Blast Radius

```
                    ┌─────────────────────────────┐
   U1 foundation ───┤                             │
   U3 write-path ───┤  DomainVocabulary           │── wrong literal
   U4 reporting ────┤  ErrorTranslation           │── wrong refusal shape
   U5 presentation ─┤                             │── wrong fold / actor
                    └─────────────────────────────┘
                         no runtime isolation
                         (same Node process)
```

| Failure mode | Domain | Blast radius | Containment |
|---|---|---|---|
| Wrong closed-set member | `DomainVocabulary` | All consumers that trust the set | Closed freeze + additive tests (NFR6.*) |
| Wrong retryable flag | `DomainVocabulary` | Every refusal path | Sole frozen code table + additive tests |
| Wrong status mapping | `ErrorTranslation` | Every refusal path | Totality of status column; return `{ code, status, retryable }` |
| `mapDriverCode` mis-maps busy | `ErrorTranslation` | Retry storms or dead ends on write path | Table tests on literal `SQLITE_BUSY` |
| Dependency introduced | Either module | Supply-chain surface for the whole release | Empty-closure rule (NFR2.4.1) |
| Message field added to translation | `ErrorTranslation` | Diagnostic leak to callers | Dual-cut design (NFR2.1.2) |

**There is no per-request bulkhead** inside this unit: it is pure and
synchronous. Containment is design-time (closed sets, empty imports) and
test-time (additive suite), not runtime isolation.

---

## Shared Resources

| Resource | Shared with | Notes |
|---|---|---|
| Closed vocabularies | U1, U3, U4, U5 | Single source; schema CHECK text and CSS status classes are literal copies checked by test |
| Error translation | U3, U4, U5 (boundary) | Single place a domain code becomes a boundary reading |
| None (DB, HTTP, config) | — | Unit holds none |

---

## Isolation Strategy

1. **Empty third-party / upward dependency closure** — no third-party package
   can fail this unit; one-way `translation → vocabulary` is the only internal
   edge.
2. **No upward imports** — cannot cycle with services/repositories/routes/db.
3. **No HTTP types in `vocabulary.js`** — status numbers stay in translation's
   return shape `{ code, status, retryable }`.
4. **Predicate for reserved actor** — consumers share one check, not scattered literals.
5. **Pure `mapDriverCode`** — no SQLite binding inside the leaf; write path remains the only place a live busy can appear.

---

## Mapping to Infrastructure Design

Infrastructure Design for this unit is expected to be thin or vacuous: there
is no container, no port, no volume, and no managed service. The component
inventory above is the hand-off — later stages place these modules in the
shared Node process beside U1–U5 without giving them a separate deployable.

---

## Sources Consumed

| Upstream | What this file takes |
|---|---|
| `security-design` (this stage) | Module layout, one-way import, `{ code, status, retryable }` surface, helper placement, dual-cut boundary |
| `security-requirements` | Requirement ids hosted per component |
| `functional-spec` | Two-component ownership; vocabulary owns codes+retryable; ErrorTranslation owns status column (Q10) |
| `nfr-design-questions` | Q4 module shape, Q5 two-component inventory |

**Stage-level consumes not produced for this unit.** `performance-requirements`,
`scalability-requirements`, `reliability-requirements`, and
`observability-requirements` were never produced for this `library` unit
(`produces_kinds` at nfr-requirements). They are not cited here; see
`security-design.md` Sources Consumed for the same applicability note.
