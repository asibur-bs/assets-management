# Code Summary — `u2-domain-vocabulary`

**Unit**: Domain Vocabulary and Error Contract  
**Kind**: `library`  
**Status**: Implemented under approved plan

## What landed

| Path | Role |
|---|---|
| `src/domain/vocabulary.js` | `DomainVocabulary` — closed sets, normalisation, display-holder, non-echo holder columns, holder count, codes+retryable |
| `src/domain/translation.js` | `ErrorTranslation` — status map, `translate`, `mapDriverCode`, `unknownFailure` |
| `src/domain/index.js` | Package entry re-exports |
| `tests/domain/vocabulary.test.js` | 8 unit tests |
| `tests/domain/translation.test.js` | 7 unit tests |

## Behaviour covered

- Five status buckets + labels (FR3.1)
- Eight released transitions; deferred discard edges absent (FR3.2)
- Loss / retirement reason sets (US3.3). The discard edge's reason token is `retirement`, and the recovery edge's token is `recovery`, both accepted by the reason checker.
- Seven audit actions (US3.6)
- ASCII-only serial normalisation + category-scoped collision helper (US1.2). Trim removes only U+0020, matching SQLite `TRIM`. A non-string stays null, so a missing serial does not collide with a blank one. The collision helper reads `serial_or_key` when `serialOrKey` is absent. `SERIAL_OR_KEY_INDEX_EXPRESSION` is the index expression both tiers share.
- Asset-list search folds ASCII case, matching the existing `LOWER(name)` list query.
- Display-holder derivation for the directory (US5.6): current → previous → `Unassigned`
- Two raw holder columns do not fall back to each other (`projectHolderColumns`)
- Distinct display-holder count excludes the reserved Unassigned row (`countDisplayHolders`); no directory seed
- Filter dimension records (`search_text` applies to name and serial-or-key; `holder` matches the derived display holder) plus counting predicates (US5.1 / BR8–BR9). The library runs no SQL.
- Eight error codes; only `BUSY_RETRYABLE` retryable; `BACKFILL_ACTOR`
- Translation returns `{ code, status, retryable }` only; `INVALID_STATE` → 400
- One-way `translation → vocabulary` import; empty third-party closure

## Explicit non-goals (unchanged)

No SQL, routes, EJS, or consumer wiring (U1/U3/U4/U5). Schema CHECK text and CSS `.status-*` remain literal copies by design.

## Test evidence

```text
npx vitest run tests/domain/vocabulary.test.js tests/domain/translation.test.js
→ 2 files, 15 tests passed
```

Baseline suite on 2026-11-13: `npm test` passed 81/81 (66 pre-existing + 15 domain). The earlier `better-sqlite3` NODE_MODULE_VERSION waiver does not apply in this environment. Step 6 of the approved plan still records that waiver; the plan text is bound by the Plan Approval fingerprint and was left unchanged.
