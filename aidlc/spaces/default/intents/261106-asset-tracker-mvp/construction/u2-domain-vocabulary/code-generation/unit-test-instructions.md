# Unit Test Instructions — `u2-domain-vocabulary`

**Unit**: Domain Vocabulary and Error Contract  
**Components**: `DomainVocabulary` (`vocabulary.js`), `ErrorTranslation` (`translation.js`)  
**Strategy**: standard (5–8 tests per component) · **Methodology**: test-after  
**Coverage floor**: project-wide 80% lines (enforceable later via tooling; do not weaken)

## Framework and configuration

- **Runner**: Vitest 2.x (existing `vitest` / `@vitest/coverage-v8`)
- **Config**: `vitest.config.js` — `environment: 'node'`, `globals: true`,
  `include: ['**/*.test.js']`, coverage `include: ['src/**/*.js']`
- **Idiom**: CommonJS tests; `FR` / `NFR` (and story ids where useful) in
  `it(...)` titles. These modules are pure — **no** `beforeEach` database,
  **no** `data/` directory, **no** `supertest`.
- **Baseline gate**: existing 66 tests across 5 files must remain and pass
  (`npm test`) after this unit’s tests are added.

## Exact unit-scoped commands

Runnable **before** the first test-after cycle for this unit (runner already
exists on brownfield):

```bash
npx vitest run tests/domain/vocabulary.test.js tests/domain/translation.test.js
```

Per-file during implementation:

```bash
npx vitest run tests/domain/vocabulary.test.js
npx vitest run tests/domain/translation.test.js
```

**Do not** use bare `npm test` / `npm run test:coverage` as this unit’s
scoped command — those are project-wide and would be re-run once per unit in
Build and Test.

Optional convenience (not required):

```bash
npm run test:domain
```

(only if `package.json` gains a script that expands to the same two paths).

Baseline confirmation after the unit lands:

```bash
npm test
```

## Test files and volume

| File | Component | Target volume | Focus |
|---|---|---|---|
| `tests/domain/vocabulary.test.js` | `DomainVocabulary` | 5–8 | Closed sets, transitions, reasons, actions, codes/retryable, normalisation, display-holder, filter/counting predicates (US5.1), backfill actor |
| `tests/domain/translation.test.js` | `ErrorTranslation` | 5–8 | Full code→status map, fallback, no message field, `mapDriverCode`, retryable read-through |

**Stories covered by assertions** (not necessarily one test each): US1.2,
US3.3, US3.6, US5.1, US5.6, plus the transition/error baseline.

## Suggested cases (pick 5–8 per file; merge related asserts)

### `vocabulary.test.js`

1. Exactly five status values and matching display labels (FR3.1 / BR1.*)
2. Exactly eight released edges; deferred `in-stock→discarded` and
   `returned→discarded` absent / not legal (FR3.2 / BR2.*)
3. Loss reasons `{damaged,lost,stolen}` and retirement-specific set; retirement
   accepts union (US3.3 / BR3.*)
4. Exactly seven audit actions including `recovered` and `discarded` (US3.6)
5. Normalisation: trim + ASCII case-fold; non-ASCII letter unchanged (US1.2)
6. Display-holder: current → previous → reserved `Unassigned` (US5.6)
7. Eight error codes with correct retryable flags; only `BUSY_RETRYABLE` true;
   `BACKFILL_ACTOR` / `isBackfillActor('system')`
8. US5.1 / BR8–BR9: form-dimension cardinality; `holder` vs `holder_search`;
   invalid enums omit that dimension only; counting predicates
   (buckets sum to total; active excludes discarded; available = in-stock)

### `translation.test.js`

1. Each of eight codes → expected HTTP status (incl. `INVALID_STATE` → 400)
2. Return shape is exactly `{ code, status, retryable }` (no `message`)
3. Unknown / absent code → `INTERNAL` / 500 / not retryable
4. `mapDriverCode('SQLITE_BUSY')` → `BUSY_RETRYABLE`; other codes → `null`
5. Retryable flag for busy path is `true` after translate
6. `translation.js` may load vocabulary; vocabulary must not require translation
   (structural / import-graph assert if practical)

## Mocking / stubs

None required. Do not mock Node built-ins. Do not stub vocabulary from
translation tests for the happy path — use the real module (one-way import is
the design under test).

## Test data

Use plain string literals from the closed vocabularies. No DB seeds.

## Coverage expectations

- Contribute unit tests so `src/domain/**` is exercised.
- Project floor remains **80% lines** across `src/**/*.js`; this unit must not
  lower thresholds or exclude domain files from coverage include.
- Setting `coverage.thresholds.lines = 80` is **tooling (U6) work**, not a
  blocker for this unit’s Plan Approval.

## Out of scope for this unit’s suite

- File-backed concurrent writer tests (U3)
- Migration / audit-row survival fixtures (U1)
- Route / view / CSV / actor-trust HTTP tests (U3–U5)
