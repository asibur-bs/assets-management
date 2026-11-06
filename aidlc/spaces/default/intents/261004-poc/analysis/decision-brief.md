# Decision Brief — Asset Tracker MVP, Decisions A–D

**Subject:** Asset Tracker MVP Workbook (`asset-tracker-mvp`)
**Baseline:** Asset Tracker POC (`aidlc/spaces/default/intents/261004-poc`, workflow complete)
**Companion:** `gap-analysis.md` (same directory)
**Status:** **Draft for product owner review — NOT APPROVED.** No POC code, database, test, or
configuration was modified in producing this brief. No AIDLC intent was created. These are
recommendations for decision, not recorded requirements.

**Date:** 2026-11-06

---

## 0. How to use this brief

Each decision follows the same seven-part structure:

1. **Recommended option** — the preferred choice and why
2. **Alternative options** — the other viable choices and their trade-offs
3. **Existing POC behaviour** — verified evidence with file/line references
4. **Migration impact** — schema/data effect, data-loss and compatibility risk
5. **Test impact** — existing tests to modify, new tests required, regression scenarios
6. **MVP impact** — effect on business rules, lifecycle, counts, reporting, audit, UX
7. **Acceptance criteria** — testable conditions for "implemented correctly"

Every factual claim about POC behaviour is backed by a source reference or a command executed
against a throwaway in-memory database. Commands are reproduced in Appendix A.

**A note on evidence strength.** Where a claim is *verified by execution* it is marked
**[verified]**. Where it is *read from source* it carries a `file:line` reference. Nothing in this
brief is inferred from the code-generation artifacts alone — those were checked against the live
implementation.

---

## Decision A — Serial/Key Uniqueness Scope

### A.1 The question

Is `serial_or_key` unique **globally**, or unique **within each category**? And if category-scoped,
is the comparison **case-sensitive**?

### A.2 Recommended option

**A1 — Category-scoped uniqueness (`UNIQUE(category, serial_or_key)`), retained from the POC, with
case-insensitive comparison applied at comparison time while the original value is preserved.**

Two sub-parts, separable:

| Sub-decision | Recommendation |
|---|---|
| **A1a — Uniqueness scope** | Category-scoped. Retain the POC constraint unchanged. |
| **A1b — Case sensitivity** | Case-insensitive **for duplicate comparison only**. The original `serial_or_key` string is stored and displayed exactly as entered. |

**Reasoning.**

A1a is recommended because it is what the POC already implements and what your workbook §4.4
instructs ("The approved POC uniqueness rules should be retained"). Critically, **it requires no
migration at all** — no table rebuild, no constraint change, no data risk. The alternative (A2,
globally unique) would require a table rebuild *on top of* the one the MVP already needs for the
`discarded` status. Stacking two table rebuilds on the same table in one release is the single
largest avoidable schema risk in this project.

A1b is recommended because it addresses a **real, currently-detectable duplicate source** without
touching the schema or losing the original value. Licence keys are routinely pasted in varying case
(`TP-001` vs `tp-001`); the POC currently treats those as two different assets. Case-insensitive
comparison with case-preserving storage is the standard approach and satisfies your requirement to
"not lose the original serial/key value" — the original is what gets displayed, what appears in
CSV exports, and what an auditor sees.

The mechanism should be a **normalised comparison key**, not a normalised stored column. Options:

| Mechanism | Behaviour | Trade-off |
|---|---|---|
| **A1b-i — Normalise on write** | Store `serial_or_key` as entered; additionally store `serial_or_key_normalized = lower(trim(serial_or_key))`; UNIQUE on `(category, serial_or_key_normalized)` | Needs a new column + constraint rebuild. Robust, indexed. **Cost: a table rebuild.** |
| **A1b-ii — Compare at validation time** | Keep the DB constraint as-is; in `createAsset`/`updateAsset`, run a case-insensitive `SELECT` before insert; the DB constraint remains the backstop for exact matches | No schema change. But the DB no longer enforces what the app enforces — a direct SQL write bypasses it. **Two enforcement layers that can disagree.** |
| **A1b-iii — SQLite functional index** ✅ | `CREATE UNIQUE INDEX ... ON assets(category, lower(trim(serial_or_key)))` | No table rebuild, DB-enforced. **[verified]** Confirmed working on the shipped stack — SQLite 3.49.2 / better-sqlite3 11.10.0. |

**Recommendation: A1b-iii, with A1b-i as the defined fallback.**

A1b-iii gives a **database-enforced** uniqueness rule with **no table rebuild** — `lower()` and
`trim()` are built-in deterministic functions, which is exactly what SQLite's functional-index
support requires. The unique *index* coexists with the existing `UNIQUE(category, serial_or_key)`
table constraint; both apply, and the index is strictly stronger (it subsumes the table
constraint's exact-match case), so behaviour only becomes stricter, never looser.

**This has now been verified against the actual runtime** (see the note below) rather than assumed.
The fallback to A1b-i remains defined but is not expected to be needed.

> **[verified]** `lower(trim(...))` is accepted in a functional index expression and enforces
> whitespace-insensitive uniqueness. Verified on the shipped stack — **SQLite 3.49.2** via
> **`better-sqlite3` 11.10.0**:
>
> ```
> CREATE UNIQUE INDEX idx_ci ON assets(category, lower(trim(serial_or_key)))
>   → case-variant duplicate:      REJECTED (SQLITE_CONSTRAINT_UNIQUE)
>   → whitespace-padded duplicate: REJECTED
>   → cross-category duplicate:    ALLOWED   (correct for A1a)
> ```
>
> With `lower()` alone (no `trim()`), a whitespace-padded variant is **allowed** — so the index
> expression must include `trim()` to meet the acceptance criteria in §A.9.
>
> **[verified] — a pre-existing case-variant duplicate breaks the index creation.** Under the POC's
> current rules, `TP-001` and `tp-001` in the same category are *legal*, so an existing database
> may already contain them. Creating the index against such data fails:
>
> ```
> index creation FAILED: UNIQUE constraint failed: index 'idx_ci'
> ```
>
> **The migration must therefore run a pre-flight detection query first** and report offending rows
> rather than failing opaquely:
>
> ```sql
> SELECT category, lower(trim(serial_or_key)) AS k, COUNT(*) AS c, group_concat(id) AS ids
>   FROM assets
>  GROUP BY category, k
> HAVING c > 1;
> ```
>
> **[verified]** this query correctly identifies the offending pair:
> `[{"category":"hardware","k":"tp-001","c":2,"ids":"a,b"}]`
>
> The migration's behaviour on detecting duplicates needs an explicit decision — report and abort,
> or report and skip the index. See §E.4 **Q10**.

> **Important:** whichever mechanism is chosen, **A1a (category-scoped) means the constraint
> cannot catch a *mis-categorised* asset.** See §A.6.

### A.3 Alternative options

| Option | Description | Migration | Trade-off |
|---|---|---|---|
| **A1** ✅ | Category-scoped, case-insensitive comparison | None (A1b-iii) or rebuild (A1b-i) | A serial filed under the wrong category is undetectable as a duplicate. Category misclassification becomes a user-error class the system cannot help with. |
| **A2** | Globally unique `UNIQUE(serial_or_key)` | **Table rebuild** | Prevents cross-category duplicates. But rejects legitimate cases where a vendor key legitimately repeats across categories, and adds a second rebuild to the same table. |
| **A3** | Category-scoped + fully normalised stored column | **Table rebuild** | Strongest data hygiene. Adds a column plus normalisation rules to maintain. Reserved for if A1b-iii proves unavailable. |
| **A4** | No uniqueness rule; warn only | None | Rejected. The POC's constraint is a genuine asset (§4.4 says retain it), and a warning-only rule invites duplicate records. |

### A.4 Existing POC behaviour

**[verified]** The POC's uniqueness behaviour, executed against a live in-memory DB:

```
cross-category same serial   : ALLOWED
same-category same serial     : REJECTED (DUPLICATE_ASSET)
case-variant (x-1 vs X-1)     : ALLOWED          <- case-sensitive
whitespace-padded (' X-1 ')   : ALLOWED          <- not trimmed
```

**Schema** — `src/db/migrations.sql`:
```sql
UNIQUE (category, serial_or_key)
```

**Duplicate detection** — `src/repositories/assets-repo.js:69-76`:
```js
} catch (e) {
  if (String(e.message).includes('UNIQUE constraint failed')) {
    const err = new Error('An asset with this category and serial-or-key already exists.');
    err.code = 'DUPLICATE_ASSET';
    throw err;
  }
```

**[verified]** The error payload carries **no reference to the conflicting asset**:

```
error code   : DUPLICATE_ASSET
error message: An asset with this category and serial-or-key already exists.
has details? : false (none)
has conflicting asset id? : []
```

**Trimming is inconsistent between layers** — `src/routes/assets.js:39-43` trims `serial_or_key`
before it reaches the service, but `src/repositories/assets-repo.js:38-78` does not trim it. The
repository's `validateCreate` (`:130`) only checks `serialOrKey.trim().length === 0` — it validates
the trimmed value but **stores the untrimmed one**. Any code path that calls the repository
directly (tests, future services, a seed script) can therefore store `' X-1 '` and bypass the
route's normalisation. **[verified]** — the stored value was ` X-1 ` with surrounding spaces.

**Existing test coverage:**
- `tests/db.test.js:27-32` — asserts the `UNIQUE (category, serial_or_key)` constraint rejects a
  same-category duplicate at the database level
- `tests/assets-repo.test.js` — duplicate detection at the repository level

### A.5 Migration impact

| Option | Migration required | Data affected | Data-loss risk | Compatibility risk |
|---|---|---|---|---|
| **A1a** | **None** | — | None | None. Existing databases keep working; the constraint is already in place. |
| **A1b-iii** | **One additive statement** — create a functional unique index | No rows modified | None (index creation cannot lose data) | **[verified]** Supported on the shipped stack (SQLite 3.49.2 / better-sqlite3 11.10.0). **One caveat:** an index creation can *fail* if the existing data already violates it — e.g. a POC database holding `TP-001` and `tp-001` in the same category. The migration must detect this and report it rather than fail opaquely. |
| **A1b-i** | **Table rebuild** | All `assets` rows copied | Medium — rebuild must preserve `assigned_at`, `returned_at`, and the `audit_log` FK | Verify with `PRAGMA foreign_key_check` post-rebuild |
| **A2** | **Table rebuild** (drop composite UNIQUE, add single-column UNIQUE) | All rows; existing cross-category duplicates would **violate the new constraint** and block the migration | **High** — a database already containing a legal cross-category duplicate would fail to migrate | High |

**Critical interaction with the `discarded` rebuild.** The MVP already needs a table rebuild to
extend the `status` CHECK constraint. If A1b-i or A2 is chosen, **both changes should be performed
in the same rebuild** — one rebuild, two changes — rather than two rebuilds. If A1a + A1b-iii is
chosen, the `discarded` rebuild is the *only* rebuild, and it is unaffected by A.

**Data-loss risk specific to A2:** a POC database containing `hardware:123` and
`software-license:123` — currently legal, and **[verified]** permitted — would **block the
migration entirely**. This is a concrete, already-reachable data condition.

### A.6 Category misclassification and duplicate detection

This is the most important product consequence of A1, and it deserves explicit statement.

Because uniqueness is scoped *within* a category, **the same serial filed under two different
categories is invisible to the duplicate check.** [verified] `X-1` under `hardware` and `X-1` under
`software-license` both succeed.

The consequences are:

| Scenario | Detected under A1? | Detected under A2? |
|---|---|---|
| Same serial, same category | **Yes** | Yes |
| Same serial, different category (genuinely distinct assets) | No (correctly) | **Falsely rejected** |
| Same serial, different category (**the same physical asset**, mis-filed) | **No — missed** | Yes |
| Same serial, same category, different case | Only with A1b | Only with A1b |

**The failure mode is asymmetric.** Under A1, the cost of mis-classification is a duplicate record
that goes undetected. Under A2, the cost is a legitimate registration that is wrongly blocked —
which produces a *user-visible error on a correct action*, and pushes the user toward working
around the system.

Given that the POC's whole purpose is asset accountability, an undetected duplicate undermines the
"single record per asset" success metric from your §1.2/§2.1 intent. But the mitigation for A1's
gap is **not** a stricter constraint — it is:

1. **MVP-12's duplicate-UX work** (already in scope): when a duplicate *is* detected, surface the
   conflicting asset so the user can see it's the same physical item. **[verified]** this requires
   adding a lookup to the catch block at `assets-repo.js:69-76` — today the conflicting asset is
   not identified at all.
2. **An explicit category in the duplicate message**, so the user is told *which* category
   conflicts.
3. **A search-then-register habit**: because MVP-16's search covers serial/key, and the search is
   already case-insensitive (`LOWER(serial_or_key) LIKE ?` — `assets-repo.js:17`), a user searching
   for a serial **will** find a case-variant or cross-category instance. This is a meaningful
   safety net that already exists in the POC.

**Recommendation:** accept A1's blind spot explicitly, and record it as a known limitation in the
MVP requirements — *not* as an oversight. The compensating controls (MVP-12's navigation to the
conflicting asset, plus case-insensitive search) address the practical risk.

### A.7 Test impact

**Existing tests — no modification required under A1a + A1b-iii:**

| Test | Location | Status |
|---|---|---|
| "enforces the unique constraint on (category, serial_or_key)" | `tests/db.test.js:27-32` | **Unchanged** — the table constraint remains |
| Duplicate detection at repository level | `tests/assets-repo.test.js` | **Unchanged** |

**New tests required:**

| # | Test | Location | Asserts |
|---|---|---|---|
| A-T1 | Case-insensitive duplicate within a category | `tests/assets-repo.test.js` | `TP-001` then `tp-001` → `DUPLICATE_ASSET` |
| A-T2 | Original value preserved | `tests/assets-repo.test.js` | After registering `tp-001`, `serial_or_key` reads back as `tp-001`, **not** `TP-001` |
| A-T3 | Cross-category duplicate still allowed | `tests/assets-repo.test.js` | `hardware:X-1` + `software-license:X-1` → both succeed |
| A-T4 | Leading/trailing whitespace normalised for comparison | `tests/assets-repo.test.js` | `' TP-001 '` vs `'TP-001'` → duplicate detected |
| A-T5 | Repository trims before storing | `tests/assets-repo.test.js` | Direct repository call with `' TP-001 '` stores `'TP-001'` |
| A-T6 | Duplicate error identifies the conflicting asset | `tests/assets-repo.test.js` | Error carries the conflicting asset's `id` and `name` |
| A-T7 | Functional index is enforced by the DB | `tests/db.test.js` | Direct SQL insert of a case-variant duplicate throws |
| A-T8 | Migration adds the index without data loss | `tests/db.test.js` | Apply migrations to a populated legacy DB; row count and values unchanged |

**Regression scenarios:**
- A POC database with a cross-category duplicate must still open and query cleanly (A1a only)
- Search must continue to find assets regardless of stored case
- CSV export must emit the **original** value, not the normalised one
- The list filter by serial must match case-insensitively (already true — `LOWER()` in the search)

### A.8 MVP impact

| Area | Effect |
|---|---|
| **Business rules** | §4.4's duplicate rule becomes concrete: *"A serial/key is unique within its category. Comparison ignores letter case and surrounding whitespace. The value as entered is stored and displayed."* |
| **Data model** | `UNIQUE(category, serial_or_key)` retained. If A1b-i, add `serial_or_key_normalized`. If A1b-iii, add one functional index. |
| **Lifecycle** | No effect. |
| **Dashboard counts** | No effect — but if A2 were chosen, any pre-existing cross-category duplicate would **block the migration** and halt the whole release. A1 cannot cause this. |
| **Reporting / CSV export** | Export must emit the original value. A normalised stored column (A1b-i) requires an explicit "export the display column, not the comparison column" rule. |
| **Audit history** | No effect. |
| **UX** | MVP-12's duplicate message can now say *"A hardware asset with serial TP-001 already exists"* and link to it. Under A1b the message can also state *"matching is case-insensitive"*. |
| **Requirements traceability** | POC FR1.3 (*"reject duplicate assets on (category, serial-or-key)"*) carries over with the case-insensitivity clarification. **This is a refinement of an existing POC requirement, not a new one.** |

### A.9 Acceptance criteria

- [ ] A registration whose `(category, serial_or_key)` matches an existing asset, ignoring letter case and surrounding whitespace, is rejected with `DUPLICATE_ASSET`.
- [ ] A registration whose serial matches an existing asset in the *same* category, differing only in case, is rejected.
- [ ] A registration whose serial matches an existing asset in a *different* category is accepted.
- [ ] The stored `serial_or_key` is byte-identical to the value the user entered, excluding surrounding whitespace; case is preserved.
- [ ] The duplicate error identifies the conflicting asset by `id` and `name`, and the UI renders a working link to it.
- [ ] Direct SQL insertion of a case-variant duplicate within one category is rejected by the database, not only by application code.
- [ ] The functional unique index migration runs a pre-flight duplicate-detection query and reports offending rows; it does not fail with an opaque "UNIQUE constraint failed" error.
- [ ] A CSV export of assets containing mixed-case serials emits the original values.
- [ ] A POC database containing a cross-category duplicate opens, migrates, and operates without error.
- [ ] The uniqueness rule is documented in the MVP requirements with the category-scoping limitation stated explicitly.

---

## Decision B — Lost Asset Recovery

### B.1 The question

Is `lost` a terminal state, or can a lost asset be recovered and returned to circulation?

### B.2 Recommended option

**B2 — Add a `lost → in-stock` recovery transition, with a distinct `recovered` audit action, and
preserve the previous holder through `last_assigned_to`.**

**Reasoning.**

The decisive finding is one the gap analysis surfaced but this brief quantifies: **the POC destroys
the identity of the person who held a lost asset.** [verified] — after `markLost`, `assigned_to`
is `null` while `assigned_at` still holds the original timestamp. The only surviving trace of "Bob
had this" is the prose string `"HW" marked as lost.` in an audit description. That is not an audit
trail; it is an unscriptable sentence.

This matters more for lost assets than for returned assets, because **"who had it when it went
missing" is the single most important fact about a lost asset.** It is the first question anyone
asks, and it is the question an auditor asks. The MVP's own §21.1 Scenario 6 and §22's production
caveats treat loss as a reporting matter — but the current data model cannot report it, because the
holder is gone.

So B2 has two parts, and the second is arguably the more important:

| Part | Content |
|---|---|
| **B2a** | `markLost` **preserves** the holder as `last_assigned_to` instead of clearing it. |
| **B2b** | A `lost → in-stock` recovery transition exists, producing a `recovered` audit event. |

**On B2b specifically.** Your §22 defers *"Complex Asset Recovery Workflow"* — and that deferral
should be honoured precisely. Complex means: partial recovery, credit assignment, dispute handling,
chain-of-custody workflows, insurance claims. A single **`lost → in-stock` transition** with an
audit event is none of those. It is the minimum needed to stop the system from permanently
orphaning a found asset. B2b is *inside* the deferred boundary, not across it.

**Why B2b is necessary even though B2a alone would fix the accountability gap:** without a recovery
path, an asset that is found remains permanently unusable. The only remedy is registering a *new*
asset — which orphans the entire history, produces two records for one physical item, and directly
violates your §1.3 core principle (*"Never lose historical information"*) and the §2.1 success
metric of *"a single record per asset."* The recovery transition is what makes "one record per
asset" true over the asset's whole life.

### B.3 Alternative options

| Option | Description | Trade-off |
|---|---|---|
| **B1** | `lost` stays permanently terminal | Simplest. But a found asset can never re-enter circulation, and the only remedy is a new record — orphaning history and creating duplicates. **Also leaves B2a unaddressed unless applied separately.** |
| **B2** ✅ | `lost → in-stock` recovery + preserve holder | One well-scoped transition. Keeps history intact. Requires a new audit action and a UI action on a state that currently renders none. |
| **B3** | `lost → assigned` (recovery and reassignment in one step) | Combines two operations. Adds complexity for no MVP benefit — recovery and reassignment can be two clicks. |

### B.4 Existing POC behaviour

**Transition map** — `src/services/asset-service.js:5-10`:
```js
const TRANSITIONS = {
  'in-stock': new Set(['assigned']),
  assigned:   new Set(['returned', 'lost']),
  returned:   new Set(['assigned', 'lost']),
  lost:       new Set([]),          // terminal
};
```

**[verified]** `lost` is strictly terminal — both `lost → returned` and `lost → assigned` throw
`INVALID_TRANSITION`.

**`markLost` implementation** — `src/services/asset-service.js:87-94`:
```js
function markLost(db, id) {
  const current = repo.getAsset(db, id);
  if (!current) throw makeError('Asset not found.', 'NOT_FOUND');
  assertTransition(current.status, 'lost');
  const updated = repo.updateAsset(db, id, { status: 'lost', assigned_to: null });
  repo.recordAudit(db, id, 'mark-lost', ACTION_DESCRIPTIONS.markLost(updated.name));
  return updated;
}
```

**[verified]** the full trace — the holder is destroyed:
```
--- state at mark-lost ---
assigned_to : Bob
assigned_at : 2026-11-06T08:50:03.172Z

--- after markLost ---
status       : lost
assigned_to  : null            <- previous holder LOST
assigned_at  : 2026-11-06T08:50:03.172Z
```

**[verified]** the audit trail retains only prose:
```json
[ { "action": "create",     "description": "Registered \"HW\"." },
  { "action": "assign",     "description": "Assigned \"HW\" to Bob." },
  { "action": "mark-lost",  "description": "\"HW\" marked as lost." } ]
```

**Audit action vocabulary** — the complete POC set is four values, all in
`src/services/asset-service.js`:
`create` (:47), `assign` (:68), `return` (:83), `mark-lost` (:92).

**[verified]** the holder is unrecoverable from the `assets` row — `assigned_to` is null and
`assigned_at` records only a time, not a person.

**View rendering** — `views/detail.ejs:47-49`:
```ejs
<% } else if (asset.status === 'lost') { %>
  <p class="muted">This asset is marked lost and cannot be transitioned.</p>
<% } %>
```
No action forms — the state renders a dead end, and the copy explicitly states the state is
permanent.

**Existing test coverage:**
- `tests/asset-service.test.js:88-94` — *"rejects transition from lost (terminal)"*, asserting
  `INVALID_TRANSITION`
- `tests/views.test.js:125-137` — *"detail view offers no transitions for a lost asset (FR4.5,
  FR3.3)"*, asserting no assign/return actions are rendered

Both directly encode the terminal assumption and both **must change** under B2.

### B.5 Migration impact

| Part | Migration required | Data affected | Data-loss risk | Compatibility risk |
|---|---|---|---|---|
| **B2a** | **One additive column** — `last_assigned_to` | Backfill: `last_assigned_to = assigned_to` for rows currently `assigned` | **None** — additive column | None. Can be combined with the `discarded` rebuild if desired, but is not required to. |
| **B2b** | **None** (no schema change) | None | None | Low. `TRANSITIONS` is application code, not schema. |

**Historical data caveat.** For assets already `lost` under the POC, the holder **was never
preserved** — `assigned_to` was cleared at the time of marking. There is no column to backfill
from. The holder survives only in the audit `description` prose (`"Assigned \"HW\" to Bob."`).

**[Implication]** — the MVP's audit-history work (MVP-02) makes this recoverable *prospectively*.
If the MVP's audit-event schema stores `old_values`/`new_values`, then a **migration can parse the
historical `assign` audit descriptions to reconstruct `last_assigned_to` for lost assets.** That is
fragile — it depends on prose format — but it is a one-time backfill that could recover a
meaningful fraction of lost-asset history.

**Recommendation:** treat this as an **optional data-recovery migration** (migration 6b), clearly
marked as best-effort, with the count of recovered vs. unrecoverable rows recorded in the migration
output. Document the residual gap honestly. Do not make the migration fail if the audit rows don't
match the expected pattern.

### B.6 Test impact

**Existing tests requiring modification:**

| Test | Location | Change |
|---|---|---|
| *"rejects transition from lost (terminal)"* | `tests/asset-service.test.js:88-94` | **Rewrite.** Under B2, `lost → returned` remains invalid, but `lost → in-stock` becomes valid. Split into two assertions: `lost → in-stock` succeeds; `lost → assigned`/`lost → returned` still throw `INVALID_TRANSITION`. |
| *"detail view offers no transitions for a lost asset"* | `tests/views.test.js:125-137` | **Rewrite.** The lost state must now offer a **Recover** action (and still offer no assign/return actions). |

**New tests required:**

| # | Test | Location | Asserts |
|---|---|---|---|
| B-T1 | `markLost` preserves the holder | `tests/asset-service.test.js` | After `markLost`, `assigned_to` is null **and** `last_assigned_to` is `'Bob'` |
| B-T2 | `markLost` records the loss reason | `tests/asset-service.test.js` | The `asset_losses` row (or audit metadata) holds reason + description + reporter |
| B-T3 | `lost → in-stock` is permitted | `tests/asset-service.test.js` | `recoverAsset` succeeds; status is `in-stock` |
| B-T4 | Recovery does **not** clear `last_assigned_to` | `tests/asset-service.test.js` | History stands — the prior holder remains visible after recovery |
| B-T5 | Recovery records a `recovered` audit event | `tests/asset-service.test.js` | Audit action is `recovered`, not `return` or `assign` |
| B-T6 | Recovery is idempotent-safe | `tests/asset-service.test.js` | Recovering an already-`in-stock` asset throws `INVALID_TRANSITION` |
| B-T7 | `lost → assigned` still rejected | `tests/asset-service.test.js` | `INVALID_TRANSITION` |
| B-T8 | `lost → returned` still rejected | `tests/asset-service.test.js` | `INVALID_TRANSITION` |
| B-T9 | Lost state offers Recover in the view | `tests/views.test.js` | `data-testid="action-recover"` present; assign/return absent |
| B-T10 | Recovery moves the asset into the in-stock filter | `tests/routes.test.js` | After recovery, `GET /assets?status=in-stock` includes it |
| B-T11 | Recovery appears in the active inventory count | `tests/` | Dashboard/assignee counts reflect the recovered asset |

**Regression scenarios:**
- A recovered asset must **not** appear in the `lost` count (Decision C's shared counting function
  must reflect the status change immediately)
- A recovered asset must **not** reappear in any assignee's *current holdings* — it is now in stock
- The `last → assigned` suggestion (MVP-03) must still work after a recovery cycle
- CSV export must show a recovered asset as `in-stock`
- The audit trail must show the full arc: `create → assign → mark-lost → recovered → assign`

### B.7 MVP impact

| Area | Effect |
|---|---|
| **Business rules** | §4.1's `lost` terminality is amended: *"A lost asset may be recovered to in-stock. Recovery is a distinct operation, recorded as a `recovered` audit event. Recovery does not erase the prior holder."* §22's *"Complex Asset Recovery Workflow — Defer"* **remains in force** — this is a single transition, not a workflow. |
| **Lifecycle transitions** | `TRANSITIONS.lost` changes from `∅` to `{'in-stock'}`. New edge added. |
| **Dashboard counts** | The `lost` count decreases on recovery; the `in-stock` count increases. The shared counting function (Decision C) must reflect this — and must not double-count. |
| **Reporting / CSV export** | Recovered assets move from the `lost` export bucket to `in-stock`. |
| **Audit history** | New audit action `recovered`. The MVP's audit vocabulary becomes: `create`, `assign`, `return`, `mark-lost`, `recovered`, `edit`, `discard`. **This is a materially better audit vocabulary than the POC's four.** |
| **UX** | The lost detail view changes from a dead end to offering a **Recover** action. Copy changes from *"This asset is marked lost and cannot be transitioned"* to something like *"This asset was marked lost. Recover it if it has been found."* MVP-11's loss-reason dialog gains a complementary recovery dialog. |
| **Asset accountability** | **The core benefit.** "Who had this when it went missing?" becomes answerable from the data, not from prose. |
| **Requirements traceability** | POC FR4.5 (*"lost is terminal"*) is **amended, not carried over**. This must be recorded as a traced change. |

### B.8 Acceptance criteria

- [ ] Marking an asset lost sets `status = 'lost'` and clears `assigned_to`, and sets `last_assigned_to` to the holder at the time of loss.
- [ ] A lost asset's prior holder is retrievable from the asset record without parsing audit prose.
- [ ] The loss event records reason, optional description, reporting actor, and timestamp.
- [ ] A `lost → in-stock` recovery operation exists, is reachable from the lost asset's detail view, and produces a `recovered` audit event.
- [ ] Recovery does not clear `last_assigned_to`; the assignment history remains visible.
- [ ] `lost → assigned` and `lost → returned` are rejected with `INVALID_TRANSITION`.
- [ ] Recovering an asset that is not `lost` is rejected with `INVALID_TRANSITION`.
- [ ] After recovery, the asset appears in the `in-stock` count and not in the `lost` count, and the dashboard and export agree.
- [ ] The recovered asset does not appear in any assignee's current holdings.
- [ ] The complete audit trail for a recovered asset reads `create → assign → mark-lost → recovered` in order.
- [ ] The MVP requirements record that complex recovery workflows (partial recovery, credit assignment, dispute handling) remain deferred.

---

## Decision C — Inventory Counting Definitions

### C.1 The question

What does "total assets" mean, which counts exclude `discarded`, and how are dashboard, assignee,
list, and CSV counts kept consistent?

### C.2 Recommended option

**C1 + C3 combined — five exclusive status buckets, plus a separately-labelled Active Inventory
figure, all computed by a single shared counting function.**

**Reasoning.**

Your §2.1 asks an admin to determine *"How many assets exist"*. MVP-07 says *"discarded assets
[are] excluded from normal active inventory totals."* Screen 01 lists **six** summary cards. Put
those together and there is an arithmetic trap: if "Total Assets" counts everything including
discarded, while the five status cards partition the non-discarded population, **the cards do not
sum to the total** — and nothing in the workbook says that's intentional.

A dashboard whose numbers don't reconcile destroys confidence in every number on it. This is the
failure mode that turns a management reviewer from a user into a detractor.

C1 resolves it by making the buckets **mutually exclusive and exhaustive** over the non-discarded
population, so they always sum:

```
Active Inventory = In Stock + Assigned + Returned + Lost
Total Records    = Active Inventory + Discarded
```

"Total Assets" then needs a label, not a guess. The recommendation is to show **both** figures with
explicit labels, so neither reading of "how many assets exist" is unsatisfiable:

| Card | Value | Label |
|---|---|---|
| **Total Assets** | all rows | *"Total Assets (including discarded)"* — or omit and lead with Active Inventory |
| **Active Inventory** | excludes discarded | The headline figure |
| In Stock / Assigned / Returned / Lost / Discarded | per-bucket counts | Sum: Active + Discarded = Total |

**On the single counting function.** The POC has **no aggregation queries at all** — [verified]
`grep -rn "COUNT\|GROUP BY" src/` returns nothing. Every count in the MVP would therefore be
written from scratch, and there are five distinct count consumers:

| Consumer | Workbook reference | Risk if independently implemented |
|---|---|---|
| Dashboard summary cards | MVP-05, MVP-07 | Cardinality drift — the classic "card says 42, list shows 41" |
| Assignee directory counts | MVP-06 | Per-assignee counts that don't sum to the assigned total |
| Asset list result count | MVP-14 | "Showing 10 of 47" where 47 ≠ the dashboard's assigned count |
| CSV export row count | MVP-08, Scenario 10 | An export that doesn't match the screen it was exported from |
| Recent-activity count | MVP-05 | Unrelated to buckets, but shares the actor/date filter |

**Recommendation:** one function, one filter builder, one set of definitions. Concretely:

```
buildAssetFilters({ q, category, status, assignee, created_from, updated_from })
    → { whereSql, params }        ← SINGLE source of filter truth

countAssetsByStatus(db, filters)  → { 'in-stock': n, assigned: n, ... }
countAssetsTotal(db, filters)     → n
listAssets(db, filters, { limit, offset }) → rows
```

The dashboard, assignee views, list count, and CSV export **all consume `buildAssetFilters`**. This
also solves the MVP-08 requirement that the export *"respects the selected dataset"* — the export
and the screen provably share their filter definition, so they cannot diverge.

**One caveat the counts must handle:** the dashboard's summary cards describe the **whole
inventory** (unfiltered), while the list count describes the **filtered** set. These are different
numbers and both are correct. The UI must label them distinctly — the workbook §Screen 02
separates "Total asset count" (page header) from the filtered result count, which supports this
reading.

### C.3 Alternative options

| Option | Description | Trade-off |
|---|---|---|
| **C1** | Five exclusive buckets; "Total" = sum of the five; discarded excluded from active totals | Cards always reconcile. Requires exactly one status per asset — **already guaranteed** by the schema. |
| **C2** | "Total Assets" = every row including discarded | Simplest to compute, but cards don't sum. Needs an in-UI explanation — fragile. |
| **C3** | "Total Assets" = active only (excludes discarded); discarded has its own card | Cards reconcile if discarded is excluded from the headline. Matches MVP-07's language. |
| **C1+C3** ✅ | Both: explicit "Active Inventory" headline, "Total Records" secondary, five exclusive buckets | Most informative; requires two figures rather than one. |

**Rejected: overlapping buckets.** A model where a returned asset counts as both "returned" and
"in-stock" would make the cards non-exclusive and break the sum. This is the direct consequence of
Decision D's `returned` semantics, and is why D must be settled alongside C.

### C.4 Existing POC behaviour

**[verified]** No aggregation queries exist:
```
$ grep -rn "COUNT\|GROUP BY\|count(" src/
(NONE - no aggregation queries exist)
```

**[verified]** The only `LIMIT` in the codebase is the audit `LIMIT 1`:
`src/repositories/assets-repo.js:122`.

**The complete SQL surface** is four statements:
```
SELECT strftime(...) AS ts                          -- nowIso
SELECT * FROM assets ${whereSql} ORDER BY ...        -- listAssets
SELECT * FROM assets WHERE id = ?                    -- getAsset
SELECT action, description, created_at FROM audit_log ... LIMIT 1   -- latestAuditFor
```

**Filter builder** — `src/repositories/assets-repo.js:13-32`. The `WHERE` clauses are assembled
inline in `listAssets`:
```js
const where = [];
const args = [];
if (q) {
  where.push('(LOWER(name) LIKE ? OR LOWER(serial_or_key) LIKE ?)');
  args.push(`%${q.toLowerCase()}%`, `%${q.toLowerCase()}%`);
}
if (category && ALLOWED_CATEGORIES.has(category)) { where.push('category = ?'); ... }
if (status && ALLOWED_STATUSES.has(status)) { where.push('status = ?'); ... }
```

**This is the single most important structural fact for Decision C.** The filter logic is
*inlined in the list query* and is therefore **not reusable** — a counting function cannot share
it today without refactoring it out first. That refactor is a **prerequisite** for C, not part of
it.

**[verified]** The status column is a single scalar with a `CHECK` constraint — one status per
asset at the schema level, so mutually exclusive buckets are structurally guaranteed:
```
status TEXT NOT NULL CHECK (status IN ('in-stock','assigned','returned','lost'))
```

**View rendering** — `views/list.ejs:39-41` renders the empty row when `assets.length === 0`, and
no count is displayed anywhere. `assets.length` is available but unused for counting purposes.

**Existing test coverage:** none. No POC test asserts any count, total, or aggregation.

### C.5 Migration impact

| Change | Migration required | Data affected | Data-loss risk |
|---|---|---|---|
| Add `discarded` to the status enum | **Table rebuild** (already required by Decision D) | All rows copied | Medium — covered by the shared rebuild plan |
| Shared counting function | **None** | — | None |
| Filter builder refactor | **None** | — | None |
| `idx_assets_status` | **Exists** — reusable | — | None |
| Index on `assigned_to` for assignee counts | **New index, additive** | — | None |

**Migration interaction.** C's only schema dependency is `discarded`, which Decision D introduces.
**C and D cannot be implemented independently at the schema level** — they share the table rebuild.
This is a useful coupling: one rebuild serves both decisions.

### C.6 Test impact

**Existing tests:** **none require modification.** No POC test asserts a count.

**New tests required:**

| # | Test | Location | Asserts |
|---|---|---|---|
| C-T1 | Buckets are mutually exclusive and exhaustive | `tests/` | For any seeded dataset, `in-stock + assigned + returned + lost + discarded === total records` |
| C-T2 | Active Inventory excludes discarded | `tests/` | `active === total - discarded` |
| C-T3 | Shared function gives identical results to the dashboard | `tests/` | Dashboard card values === direct count-function values for the same filters |
| C-T4 | List count matches the list | `tests/` | The rendered filtered count === the number of rows rendered |
| C-T5 | CSV export row count matches the filter | `tests/` | Exporting a filtered set produces exactly the filtered row count |
| C-T6 | Export matches the on-screen dataset | `tests/` | The exported CSV contains exactly the asset ids shown by the same filter |
| C-T7 | Assignee counts sum to the assigned total | `tests/` | Σ(per-assignee assigned counts) === the `assigned` bucket count |
| C-T8 | Filter builder produces consistent results | `tests/` | The same filter object used by `listAssets`, `countAssets*`, and the export yields identical sets |
| C-T9 | Discarded excluded from active totals but present in total | `tests/` | Both figures correct when a discarded asset exists |
| C-T10 | Counts reflect status changes immediately | `tests/` | After a transition, the affected bucket counts change accordingly (links to Decision B's recovery) |

**Regression scenarios:**
- The list view's existing empty-row behaviour must still work when a filter returns nothing
  (MVP-13's "no results" state)
- Pagination (MVP-15) must not change the *total* count — only the page size
- The existing `?status=` filter must continue to work, now including `discarded` as a valid value
- `ALLOWED_STATUSES` (`assets-repo.js:6`) must gain `discarded`, or the status filter will silently
  ignore it

### C.7 MVP impact

| Area | Effect |
|---|---|
| **Business rules** | §MVP-07 becomes concrete with an explicit counting contract that all consumers share. |
| **Lifecycle** | Depends on D's bucket definitions — specifically whether `returned` is its own bucket. |
| **Dashboard counts** | Six cards with reconciled arithmetic. |
| **Reporting / CSV export** | Export and dashboard provably share filter and count logic — satisfies MVP-08's *"respect the selected dataset"* and Scenario 10. |
| **Audit history** | The "Recent Activities" panel is separate from bucket counts and must not be folded into them. |
| **UX** | Distinct labels for "Active Inventory" vs "Total Records". Empty states (MVP-13) must distinguish "no assets at all" from "no results for these filters" — the latter is a count of zero against a non-zero total. |
| **Data model** | No new columns. `idx_assets_status` reused; `idx_assets_assigned_to` added for assignee aggregation. |
| **Success metrics** | §24's *"Dashboard Count Consistency 100%"* becomes enforceable by construction rather than by manual reconciliation — C-T1 through C-T8 are the enforcement. |

### C.8 Acceptance criteria

- [ ] Every asset belongs to exactly one of the five status buckets.
- [ ] The five bucket counts sum to the total record count.
- [ ] Active Inventory equals the sum of the four active buckets and excludes discarded.
- [ ] The Total Records figure equals Active Inventory + Discarded.
- [ ] Dashboard cards, assignee counts, list result counts, and CSV export row counts are all produced by one shared counting function and one shared filter builder.
- [ ] Exporting a filtered list produces exactly the assets shown on screen under that filter.
- [ ] The sum of per-assignee assigned counts equals the `assigned` bucket count.
- [ ] A discarded asset is excluded from Active Inventory and from every assignee's holdings, but included in Total Records and in the `discarded` bucket.
- [ ] The UI labels Active Inventory and Total Records distinctly; neither is presented under an ambiguous "Total Assets" heading.
- [ ] The list view distinguishes an empty inventory from an empty filtered result, and the latter shows the correct filtered count of zero.

---

## Decision D — Lifecycle Transitions

### D.1 The question

Is `returned` a distinct resting state or a transient marker on the way to `in-stock`? And what is
the precise behaviour of `assigned → discarded`, including how the current assignment is resolved
and recorded?

### D.2 Recommended option

**D1a — `returned` remains a distinct resting state (not a transient marker).**
**D2b — `assigned → discarded` is permitted and resolves the assignment inline, recording the
holder and the resolution in the audit event.**
**Plus `discarded` is terminal, and `in-stock → lost` is permitted.**

**Reasoning for D1a.**

Your §4.1 draws the lifecycle as `Registration → In Stock → Assigned → Returned → In Stock`. Taken
literally, `returned` is a waypoint and the asset's status ends as `in-stock`. But three other
parts of the same workbook contradict that reading:

- §MVP-07 lists **"Returned"** as a distinct dashboard summary card, alongside In Stock
- §Screen 01 lists **"Returned"** as one of the six cards
- The POC treats `returned` as a resting state with its own filter option
  (`views/list.ejs:13`), its own CSS treatment (`status-returned` in `public/styles.css`), and its
  own tested behaviour

If `returned` were transient, the "Returned" card would have an **empty population** — it could
never show a non-zero count. A card that can only ever read zero is either dead UI or a defect.
**D1a is therefore the only reading under which MVP-07's card is meaningful.**

**The cost of D1a, stated plainly:** it requires reinterpreting §4.1's arrow as descriptive
prose rather than a literal state change, and §21.1 Scenario 3's *"Status becomes In Stock"* needs
rewording to *"Status becomes Returned; the asset is available for reassignment."* **This is a
change to your workbook**, and it should be made explicitly during Requirements Analysis so the
spec and the implementation cannot disagree.

Note that D1a is also the **lower-risk choice for the code**: it preserves the POC's existing
`returned` semantics, filters, CSS, and ~8 tests. D1b would require rewriting the state machine,
the DB enum semantics, the list filter set, and those tests — for a change that would leave the
MVP-07 card empty.

**Reasoning for D2b.**

Your §4.1 says `assigned → discarded` is allowed *"only after the assignment is resolved or an
explicitly approved retirement process is followed."* §22 defers "Complex Approval Workflows", so
the second path is out. That leaves "the assignment is resolved" — but the POC has **no concept
of resolving an assignment** except returning the asset, and forcing a return before a discard is
operationally awkward (the holder still has the laptop; you want to write it off, not pretend it
came back).

D2b makes the discard itself resolve the assignment: the asset moves to `discarded`, `assigned_to`
is cleared, `last_assigned_to` retains the holder, and the audit event records **both** the holder
and the fact that the assignment was resolved by the discard. One operation, no orphan assignment,
no forced fake return, no approval workflow.

**D2b vs. the alternatives:**

| Option | Rule | Assessment |
|---|---|---|
| **D2a** | Discard only from `in-stock`/`returned` | Simple, but forces a fake return before discarding a held asset |
| **D2b** ✅ | Discard from `assigned`; the assignment is resolved inline and recorded | One operation; no orphan assignment; no approval concept |
| **D2c** | Discard from `assigned` requires a separate prior "resolve assignment" action | Closest to §4.1's literal wording; adds a concept §22 defers, and creates a two-step flow where one suffices |

### D.3 Alternative options

| Decision point | Options |
|---|---|
| **`returned` semantics** | **D1a** distinct resting state ✅ · **D1b** transient → `in-stock` (makes MVP-07's card empty; requires ~8 test rewrites) |
| **`assigned → discarded`** | **D2a** from in-stock/returned only · **D2b** allowed, assignment resolved inline ✅ · **D2c** separate prior resolution step |
| **`in-stock → lost`** | **Allow** ✅ · **Disallow** (POC current) · **Allow with a required reason** — recommended, since §MVP-11 already requires a reason for loss |
| **`returned → discarded`** | **Allow** ✅ (a returned asset is unheld; discarding it is routine) · **Disallow** (requires a return first) |
| **`discarded` terminal?** | **Terminal** ✅ — matches "never hard-delete" and §4.1's intent · **Recoverable** (adds a second recovery path; not required by any requirement) |
| **`lost` terminal?** | Resolved by **Decision B** → `lost → in-stock` recovery |

### D.4 Existing POC behaviour

**[verified]** the complete transition map — `src/services/asset-service.js:5-10`:
```
in-stock     -> assigned
assigned     -> returned, lost
returned     -> assigned, lost
lost         -> (terminal)
```

**[verified]** the delta against the workbook's §4.1 — **all five MVP-proposed edges are absent**:
```
in-stock -> lost     : false
in-stock -> discarded : false
assigned -> discarded : false
returned -> discarded : false
discarded in map      : false
```

**`returnAsset`** — `src/services/asset-service.js:72-85`:
```js
const returnedAt = repo.nowIso(db);
const updated = repo.updateAsset(db, id, {
  status: 'returned',
  assigned_to: null,          // <- holder cleared
  returned_at: returnedAt,
});
```
The status becomes `returned` and **stays** `returned` — a resting state, confirming D1a's
alignment with the POC.

**[verified]** `assigned_at` is **overwritten** on reassignment, so the prior assignment's
timestamp is lost:
```
--- state at mark-lost ---
assigned_at : 2026-11-06T08:50:03.172Z
```
[after assign → return → assign, `assigned_at` is the *new* time; the previous one is gone]

**`updateAsset` writes every column unconditionally** — `src/repositories/assets-repo.js:88-105`.
**[verified]**:
```
after updateAsset({name:"New Name"}):
{ "name": "New Name", "model": null, "notes": null, "category": "hardware",
  "assigned_to": "Bob", "status": "in-stock" }
```
Every column is written from a merged object. **A field-scoped edit (MVP-09) cannot use this path
directly** — it would clobber concurrent changes to unrelated fields. MVP-09 needs a dedicated
field-scoped update function.

**View rendering** — `views/detail.ejs:25-50` is an `if / else if / else if` chain on
`asset.status`:
```ejs
<% if (asset.status === 'in-stock') { %>      ... assign form
<% } else if (asset.status === 'assigned') { %> ... return + lost forms
<% } else if (asset.status === 'returned') { %> ... lost + reassign forms
<% } else if (asset.status === 'lost') { %>     ... "cannot be transitioned" message
<% } %>
```
With five states and multiple actions per state, this chain becomes unmaintainable. It should be
replaced by a **transition-driven partial** that iterates the state machine, so the UI's available
actions are derived from `TRANSITIONS` rather than duplicated from it. Under D, the duplication is
the likely source of a repeat of the exact defect the POC's build-and-test stage caught (T-FR3.3 —
a returned asset offering a "Mark returned" action the service rejects).

**DB constraint** — `src/db/migrations.sql`:
```sql
status TEXT NOT NULL CHECK (status IN ('in-stock', 'assigned', 'returned', 'lost')) DEFAULT 'in-stock'
```
**[verified]** SQLite cannot `ALTER` a `CHECK` constraint. Adding `discarded` requires the standard
table rebuild: create new table → copy rows → drop old → rename → recreate indexes.

**Existing tests encoding current behaviour:**
- `tests/asset-service.test.js:65-71` — *"allows assigned → returned"*, asserting `status === 'returned'`
- `tests/asset-service.test.js:73-80` — *"allows returned → assigned"*
- `tests/asset-service.test.js:82-86` — *"rejects invalid transition in-stock → returned"*
- `tests/asset-service.test.js:88-94` — *"rejects transition from lost (terminal)"*
- `tests/asset-service.test.js:139-147` — *"clears the stale return timestamp when the asset is assigned again"*
- `tests/views.test.js:111-123` — *"detail view offers the lost and re-assign actions but not return for a returned asset"*
- `tests/views.test.js:125-137` — *"detail view offers no transitions for a lost asset"*
- `tests/db.test.js:72` — the legacy schema literal in the migration test includes the 4-value `CHECK`

### D.5 Migration impact

**The `discarded` status — the hard part.**

| Aspect | Detail |
|---|---|
| Operation | SQLite table rebuild: create `assets_new` with the extended `CHECK`, `INSERT INTO assets_new SELECT ... FROM assets`, `DROP TABLE assets`, `ALTER TABLE assets_new RENAME TO assets`, recreate indexes |
| Why | `ALTER TABLE ... ADD COLUMN` cannot alter a `CHECK` constraint; SQLite has no `ALTER COLUMN` |
| Data affected | **All `assets` rows** |
| Columns at risk | `id`, `category`, `name`, `serial_or_key`, `model`, `notes`, `status`, `assigned_to`, `assigned_at`, `returned_at`, `created_at`, `updated_at` — plus the `last_assigned_to` column from MVP-03 if added in the same rebuild |
| FK at risk | `audit_log.asset_id → assets(id)` — the rebuild drops and recreates the parent table |
| Verification required | Row count before/after; value-by-value equality on a populated legacy DB; `PRAGMA foreign_key_check` returns no rows; `PRAGMA integrity_check` returns `ok` |
| Existing helper | `addColumnIfMissing` (`src/db/migrate.js:35-41`) handles **columns only** — it does **not** cover a rebuild. A new helper is required. |

**[verified]** the POC's migration framework already proves the pattern works over a legacy
database — `tests/db.test.js:59-93` builds a pre-migration database directly, applies the
migrations, and asserts the row survives with its values intact. **That test pattern should be
extended** to cover the rebuild.

**Recommended consolidation:** perform the `discarded` enum extension, the `last_assigned_to`
addition, and (if Decision A requires A1b-i) the serial normalisation **in a single rebuild**. One
rebuild, three changes — rather than three rebuilds of the same table.

**Lifecycle transitions:** no migration. `TRANSITIONS` is application code.

**Combined migration set under A1b-iii + B + D:**

| Version | Name | Operation | Rebuild? |
|---|---|---|---|
| 3 | `actor-identity` | Create `actors`; add `actor_id` to audit | No |
| 4 | `audit-enrichment` | Add `old_values`, `new_values`; backfill actor | No |
| 5 | `audit-integrity` | Replace `ON DELETE CASCADE` with `RESTRICT`; append-only triggers | **Yes** (audit table) |
| 6 | `asset-lifecycle` | Add `last_assigned_to`; extend `status` CHECK to include `discarded` | **Yes** (assets table) |
| 6b | `asset-loss-recovery` *(optional)* | Best-effort backfill of `last_assigned_to` for lost assets from audit descriptions | No |
| 7 | `asset-losses` | Create `asset_losses` table | No |
| 8 | `mvp-indexes` | `idx_assets_assigned_to`, `idx_assets_last_assigned_to`, `idx_assets_created_at`, `idx_assets_updated_at`, `idx_audit_actor`, `idx_audit_created_at`; functional unique index if A1b-iii | No |

### D.6 Test impact

**Existing tests requiring modification:**

| Test | Location | Change |
|---|---|---|
| *"rejects transition from lost (terminal)"* | `tests/asset-service.test.js:88-94` | **Rewrite** — see Decision B §B.6 |
| *"detail view offers no transitions for a lost asset"* | `tests/views.test.js:125-137` | **Rewrite** — the lost state now offers Recover |
| *"allows assigned → returned"* | `tests/asset-service.test.js:65-71` | **Unchanged** under D1a — confirms `returned` is a resting state |
| *"rejects invalid transition in-stock → returned"* | `tests/asset-service.test.js:82-86` | **Unchanged** under D1a — `in-stock → returned` remains invalid (a return requires a prior assignment) |
| *"allows returned → assigned"* | `tests/asset-service.test.js:73-80` | **Unchanged** — but the assertion should additionally verify `last_assigned_to` now retains the prior holder |
| *"clears the stale return timestamp when the asset is assigned again"* | `tests/asset-service.test.js:139-147` | **Extend** — assert `last_assigned_to` behaviour alongside `returned_at` |
| *"detail view offers the lost and re-assign actions but not return for a returned asset"* | `tests/views.test.js:111-123` | **Extend** — a returned asset should also offer Discard |
| Legacy schema literal in the migration test | `tests/db.test.js:72` | **Extend** — the literal's `CHECK` reflects the *old* schema and must stay 4-value to genuinely simulate a legacy DB; **add** a separate test for the rebuild |

**New tests required:**

| # | Test | Location | Asserts |
|---|---|---|---|
| D-T1 | `in-stock → discarded` permitted | `tests/asset-service.test.js` | Status becomes `discarded` |
| D-T2 | `assigned → discarded` permitted | `tests/asset-service.test.js` | Status becomes `discarded` |
| D-T3 | Discard resolves the assignment | `tests/asset-service.test.js` | `assigned_to` is null; `last_assigned_to` retains the holder |
| D-T4 | Discard records the resolution | `tests/asset-service.test.js` | The `discard` audit event names the holder and states the assignment was resolved |
| D-T5 | `returned → discarded` permitted | `tests/asset-service.test.js` | Status becomes `discarded` |
| D-T6 | `discarded` is terminal | `tests/asset-service.test.js` | Every transition out of `discarded` throws `INVALID_TRANSITION` |
| D-T7 | Discard requires confirmation/reason | `tests/routes.test.js` | A discard without the required input is rejected |
| D-T8 | Discarded asset is never hard-deleted | `tests/asset-service.test.js` | The row still exists after discard |
| D-T9 | Discarded asset excluded from active counts | `tests/` | See Decision C §C.6 |
| D-T10 | Discarded asset remains reachable | `tests/routes.test.js` | `GET /assets/:id` still returns it; its history is intact |
| D-T11 | `in-stock → lost` permitted | `tests/asset-service.test.js` | Status becomes `lost` |
| D-T12 | Discard reason recorded | `tests/` | Reason and optional description are stored and retrievable |
| D-T13 | **Migration rebuild preserves data** | `tests/db.test.js` | Apply migrations to a populated legacy DB: row count, every column value, and FK integrity all preserved |
| D-T14 | **Rebuild accepts the extended CHECK** | `tests/db.test.js` | A `discarded` row can be inserted after migration; the DB accepts it |
| D-T15 | **Migrations are idempotent** | `tests/db.test.js` | Applying migrations twice does not duplicate rows or re-run the rebuild |
| D-T16 | Transition-driven UI | `tests/views.test.js` | The actions rendered for each state exactly match `TRANSITIONS` — a table-driven assertion across all five states, which would have caught the original T-FR3.3 defect |

**Regression scenarios:**
- The `returned` state's reassign action must still work
- The `assigned` state's return action must still work
- The `lost` state's "cannot be transitioned" copy must be updated (Decision B)
- The `in-stock` state's assign action must still work
- Every asset already in a POC database must still load and be listable after the rebuild
- The audit FK must survive the rebuild — **the highest-value regression check in the whole migration**

### D.7 MVP impact

| Area | Effect |
|---|---|
| **Business rules** | §4.1's lifecycle is finalised and testable. §4.2.5 (previous assignee preserved) is satisfied via `last_assigned_to`. |
| **Lifecycle transitions** | Final transition table: <br>`in-stock → assigned, lost, discarded`<br>`assigned → returned, lost, discarded`<br>`returned → assigned, lost, discarded`<br>`lost → in-stock` (recovery — Decision B)<br>`discarded →` (terminal) |
| **Dashboard counts** | Five exclusive buckets (Decision C). `discarded` is a bucket of its own, excluded from Active Inventory. |
| **Reporting / CSV export** | Discarded assets appear in the `discarded` filter and are excluded from active totals. Recovery moves an asset between buckets. |
| **Audit history** | The audit vocabulary becomes `create`, `assign`, `return`, `mark-lost`, `recovered`, `edit`, `discard`. Every one of these is a distinct, meaningful event type. |
| **UX** | The detail view's `if/else` chain (`:25-50`) is replaced by a transition-driven partial. Each state renders exactly the actions `TRANSITIONS` permits — structurally preventing a repeat of T-FR3.3. The `returned` state gains a Discard action; the `lost` state gains a Recover action; the `assigned` state gains a Discard action (with the resolution explained in the confirmation dialog). |
| **Data model** | `status` CHECK extended to 5 values; `last_assigned_to` added. One consolidated rebuild. |
| **Requirements traceability** | POC FR4.5 (*"lost is terminal"*) **amended** by Decision B. POC FR4.4 (*"from returned, the valid transition is assigned or lost"*) **extended** with `discarded`. **Both must be recorded as traced changes**, not silently overwritten. |

### D.8 Acceptance criteria

- [ ] The transition table is documented in the MVP requirements exactly as implemented, and each edge is covered by a test.
- [ ] `in-stock → discarded`, `assigned → discarded`, and `returned → discarded` are all permitted.
- [ ] `assigned → discarded` clears `assigned_to` and retains the holder in `last_assigned_to`.
- [ ] The discard audit event names the holder and states that the assignment was resolved by the discard.
- [ ] `discarded` is terminal — every transition out of it is rejected with `INVALID_TRANSITION`.
- [ ] A discarded asset is never deleted; its record and its complete history remain retrievable.
- [ ] A returned asset's status is `returned` (a distinct resting state), and it offers assign, mark-lost, and discard actions.
- [ ] `in-stock → returned` remains invalid — a return requires a prior assignment.
- [ ] `in-stock → lost` is permitted.
- [ ] The detail view renders exactly the actions permitted by `TRANSITIONS` for each of the five states, verified by a table-driven test.
- [ ] The migration that extends the `status` CHECK preserves every row and every column value, verified against a populated legacy database.
- [ ] `PRAGMA foreign_key_check` returns no rows after the rebuild, and the audit history of a pre-migration asset remains intact and queryable.
- [ ] Applying the migrations twice is idempotent — no duplicated rows, no repeated rebuild.
- [ ] The MVP requirements record the `returned`-vs-`in-stock` distinction explicitly, and §4.1's wording is amended accordingly.

---

## Decision Summary

### E.1 Proposed selections

| # | Decision | Proposed selection | Migration | Net schema effect |
|---|---|---|---|---|
| **A** | Serial/key uniqueness | **A1a** category-scoped (unchanged) + **A1b-iii** case-insensitive comparison via a functional unique index on `lower(trim(serial_or_key))`, original value preserved — **[verified]** on the shipped runtime | None + 1 additive index | +1 index |
| **B** | Lost asset recovery | **B2** — `lost → in-stock` recovery + **B2a** preserve holder via `last_assigned_to` + loss reason/description capture | 1 additive column (+ optional best-effort backfill) | +1 column |
| **C** | Inventory counting | **C1 + C3** — five exclusive buckets, Active Inventory excludes discarded, one shared counting function + one shared filter builder | None (plus `idx_assets_assigned_to`) | +1 index; filter-builder refactor is a **prerequisite** |
| **D** | Lifecycle transitions | **D1a** `returned` stays a distinct resting state + **D2b** `assigned → discarded` resolves the assignment inline + `discarded` terminal + `in-stock → lost` permitted | **1 consolidated table rebuild** | `status` CHECK 4→5 values, +1 column |

### E.2 Combined migration set

| Version | Name | Rebuild? |
|---|---|---|
| 3 | `actor-identity` | No |
| 4 | `audit-enrichment` | No |
| 5 | `audit-integrity` (`RESTRICT` + append-only triggers) | Yes — audit table |
| 6 | `asset-lifecycle` (`last_assigned_to` + `discarded` CHECK) | **Yes — assets table** |
| 6b | `asset-loss-recovery` (optional best-effort backfill) | No |
| 7 | `asset-losses` | No |
| 8 | `mvp-indexes` (incl. functional unique index if A1b-iii) | No |

**Two table rebuilds total**, on two different tables. Decision A's recommended option (A1b-iii)
adds no rebuild — this is why it was preferred over A1b-i.

### E.3 Consolidated impact

| Dimension | Impact |
|---|---|
| **Existing tests modified** | 5 (2 rewrites under B, 3 extensions under D) |
| **Existing tests unchanged** | 61 |
| **New tests required** | ~52 (A: 8 · B: 11 · C: 10 · D: 16, plus shared regression tests) |
| **POC features preserved** | Registration, list/search/filter/sort, detail view, the 4-state machine's core edges, the migration runner, the error-code contract, all 66 tests' intent |
| **New MVP capabilities** | Actor identity, complete audit history, previous-holder preservation, reconciliation dashboard, assignee directory, CSV export, asset editing, discard, loss management, duplicate UX, empty states, counts, pagination, improved search, responsive UI, design system |

### E.4 Unresolved questions — your input needed

| # | Question | Why it matters | Blocks |
|---|---|---|---|
| **Q1** | **Is `returned` a distinct resting state, or does it become `in-stock`?** | Determines whether MVP-07's "Returned" card can ever be non-zero, and whether ~8 existing tests are rewritten | Decision D; the dashboard design |
| **Q2** | **Do pre-MVP audit rows count toward §24's "100% actor attribution"?** | The backfill assigns them a `system` actor. The metric could be 100% (schema-complete) or less (historically incomplete) | Requirements Analysis; the §24 metric definition |
| **Q3** | **Should the `assigned-to` field be removed from registration?** | The POC accepts it (`views/new.ejs:31-33`); MVP Screen 03 does not list it. Keeping it stores an assignee on an in-stock asset — the exact ambiguity MVP-03 removes | Registration form design |
| **Q4** | **Should a lost asset's recovery require a reason?** | Symmetry with MVP-11's loss reason, but adds friction to a recovery | The recovery dialog |
| **Q5** | **CSV injection policy** — should values starting with `=`, `+`, `-`, `@` be escaped? | A `notes` value is user-controlled and the export opens in Excel/LibreOffice | The export implementation |
| **Q6** | **Is `discarded` recoverable?** | Recommended terminal. If recoverable, a second recovery path is needed | The transition table |
| **Q7** | **Should `in-stock → lost` be permitted?** | Recommended yes, with a reason. The workbook hedges with "where operationally appropriate" | The transition table |
| **Q8** | **Design gate consolidation** — merge Gates 1+2 and 3+4, keep Gate 5 standalone? | Nine AIDLC stages plus five design gates is a long serial chain for one developer | Stage-3 planning |
| **Q9** | **Should the best-effort lost-asset backfill (6b) be attempted at all?** | Recovers some history by parsing audit prose; fragile, and the residual gap must be documented either way | Migration 6b |
| **Q10** | **What should the functional-index migration do when it detects pre-existing case-variant duplicates?** | **[verified]** Such duplicates are legal under POC rules and **will make the index creation fail**. The migration must either report-and-abort or report-and-skip. Report-and-abort is safer but blocks the release on a data condition the user may not know exists | Migration 8 (index creation) |

### E.5 Changes required in the workbook

These are **proposed amendments** to `Asset Tracker MVP Workbook`. None is applied yet.

| Workbook location | Current text | Proposed change | Reason |
|---|---|---|---|
| **§4.1** | `Registration → In Stock → Assigned → Returned → In Stock` | `Registration → In Stock → Assigned → Returned` (a resting state), with `returned → assigned` for reassignment | D1a — the arrow as written makes MVP-07's "Returned" card empty |
| **§4.1** | Additional transitions list | Add explicit `in-stock → lost`, `in-stock → discarded`, `assigned → discarded`, `returned → discarded`, `lost → in-stock` (recovery), `discarded` terminal | D and B — make the transition table complete and testable |
| **§4.1** | *"Recovery should be considered a separate future workflow unless explicitly included in approved requirements."* | Amend to: *"A single `lost → in-stock` recovery transition is included. Complex recovery workflows — partial recovery, credit assignment, dispute handling — remain deferred."* | B2 — keep §22's deferral intact while enabling the minimum needed |
| **§4.2.5** | *"The previous assignee is preserved."* | Keep, and specify the mechanism: `last_assigned_to` is set on return and on discard; `assigned_to` reflects only the current holder | MVP-03 — make it testable |
| **§4.4** | *"Confirm the exact uniqueness policy… especially whether identifiers are globally unique or category-specific."* | Resolve to: *"Serial/key is unique within its category. Comparison ignores letter case and surrounding whitespace; the value as entered is stored and displayed. A serial filed under a different category is not detected as a duplicate — a known limitation."* | A1a + A1b — remove the open question and record the limitation honestly |
| **§6.1** | Asset fields list | Add `last_assigned_to` | MVP-03 |
| **§6.5** | Database requirements | Add: append-only enforcement; `ON DELETE RESTRICT` on audit; functional or normalised uniqueness index | §4.3.6 + A |
| **§21.1 Scenario 3** | *"Status becomes In Stock"* | *"Status becomes Returned; the asset is available for reassignment. The previous holder is preserved."* | D1a |
| **§21.1** | Scenario list | Add scenarios for recovery, discard, and the audit-actor invariant | B and D |
| **§24** | *"Audit Entries with Actor Attribution: 100%"* | Add a qualifier: *"…for all events recorded under the MVP; pre-MVP history is backfilled to a `system` actor."* | Q2 |
| **§27 (new)** | — | Add an "Inventory Counting Definitions" section: five exclusive buckets, Active Inventory, Total Records, and the single shared counting function | C |

### E.6 What happens after your review

1. You confirm or revise **A, B, C, and D** individually, and answer **Q1–Q9**.
2. The confirmed outcomes are recorded as **approved requirements** in the Requirements Analysis
   stage — as new MVP requirements and as **explicit traced amendments** to the POC's FR1.3, FR4.4,
   FR4.5, and FR5.3. The POC's own artifacts and approval fingerprints remain untouched.
3. The `asset-tracker-mvp` AIDLC intent is created, with the POC as the baseline.
4. Stage 1 (Intent / Scope Definition) and Stage 2 (Requirements Analysis) begin, carrying these
   decisions forward.

**Until then, nothing changes.** This brief records recommendations; it does not record decisions.

---

## Appendix A — Verification commands

Every behavioural claim in this brief is reproducible from the project root against throwaway
in-memory databases. No persistent database is touched.

**A.1 — Uniqueness scope, case sensitivity, and whitespace**
```bash
node -e "
const {openDatabase}=require('./src/db');
const repo=require('./src/repositories/assets-repo');
const db=openDatabase(':memory:');
repo.createAsset(db,{category:'hardware',name:'H',serialOrKey:'X-1'});
repo.createAsset(db,{category:'software-license',name:'S',serialOrKey:'X-1'});
console.log('cross-category: ALLOWED');
try{ repo.createAsset(db,{category:'hardware',name:'H2',serialOrKey:'x-1'});
     console.log('case-variant: ALLOWED (case-sensitive)'); }
catch(e){ console.log('case-variant: REJECTED', e.code); }
try{ repo.createAsset(db,{category:'hardware',name:'H3',serialOrKey:' X-1 '});
     console.log('whitespace-padded: ALLOWED (not trimmed)'); }
catch(e){ console.log('whitespace: REJECTED', e.code); }
"
```

**A.2 — The duplicate error carries no conflicting-asset reference**
```bash
node -e "
const {openDatabase}=require('./src/db');
const repo=require('./src/repositories/assets-repo');
const db=openDatabase(':memory:');
repo.createAsset(db,{category:'hardware',name:'ThinkPad X1',serialOrKey:'TP-001'});
try{ repo.createAsset(db,{category:'hardware',name:'Dup',serialOrKey:'TP-001'}); }
catch(e){ console.log(e.code, '|', e.message);
          console.log('extra keys:', Object.keys(e).filter(k=>!['code','message','stack'].includes(k))); }
"
```

**A.3 — `markLost` destroys the previous holder**
```bash
node -e "
const {openDatabase}=require('./src/db');
const service=require('./src/services/asset-service');
const db=openDatabase(':memory:');
const a=service.registerAsset(db,{category:'hardware',name:'HW',serialOrKey:'S1'});
service.assignAsset(db,a.id,'Bob');
const lost=service.markLost(db,a.id);
console.log('assigned_to after markLost:', lost.assigned_to);
console.log('assigned_at after markLost:', lost.assigned_at);
console.log('audit:', JSON.stringify(db.prepare('SELECT action,description FROM audit_log ORDER BY id').all()));
"
```

**A.4 — `lost` is terminal**
```bash
node -e "
const {openDatabase}=require('./src/db');
const service=require('./src/services/asset-service');
const db=openDatabase(':memory:');
const a=service.registerAsset(db,{category:'hardware',name:'HW',serialOrKey:'S1'});
service.assignAsset(db,a.id,'Bob'); service.markLost(db,a.id);
for(const fn of ['returnAsset','assignAsset'])
  try{ service[fn](db,a.id,'X'); console.log(fn,'allowed'); }
  catch(e){ console.log('lost ->',fn,':',e.code); }
"
```

**A.5 — No aggregation queries exist**
```bash
grep -rn "COUNT\|GROUP BY\|count(" src/     # -> no matches
grep -rn "LIMIT\|OFFSET" src/                # -> only assets-repo.js:122 (audit LIMIT 1)
```

**A.6 — Lifecycle delta against workbook §4.1**
```bash
node -e "
const {TRANSITIONS}=require('./src/services/asset-service');
console.log('in-stock -> lost     :', TRANSITIONS['in-stock'].has('lost'));
console.log('in-stock -> discarded :', TRANSITIONS['in-stock'].has('discarded'));
console.log('assigned -> discarded :', TRANSITIONS['assigned'].has('discarded'));
console.log('returned -> discarded :', TRANSITIONS['returned'].has('discarded'));
console.log('discarded in map      :', Object.keys(TRANSITIONS).includes('discarded'));
"
```

**A.7 — `updateAsset` writes every column unconditionally**
```bash
node -e "
const {openDatabase}=require('./src/db');
const repo=require('./src/repositories/assets-repo');
const db=openDatabase(':memory:');
const a=repo.createAsset(db,{category:'hardware',name:'HW',serialOrKey:'S1'});
repo.updateAsset(db,a.id,{name:'New Name'});
console.log(db.prepare('SELECT name,model,notes,assigned_to FROM assets WHERE id=?').get(a.id));
"
```

---

## Appendix B — Source reference index

| Concern | Location |
|---|---|
| Transition map | `src/services/asset-service.js:5-10` |
| Transition guard (`INVALID_STATE`, `INVALID_TRANSITION`) | `src/services/asset-service.js:18-26` |
| `registerAsset` | `src/services/asset-service.js:34-50` |
| `assignAsset` (overwrites `assigned_at`) | `src/services/asset-service.js:52-70` |
| `returnAsset` (clears `assigned_to`) | `src/services/asset-service.js:72-85` |
| `markLost` (clears `assigned_to`) | `src/services/asset-service.js:87-94` |
| Audit action vocabulary (4 actions) | `src/services/asset-service.js:40,47,68,83,92` |
| `ALLOWED_STATUSES` (4 values) | `src/repositories/assets-repo.js:6` |
| Filter builder (inlined in `listAssets`) | `src/repositories/assets-repo.js:13-32` |
| Search predicate (case-insensitive) | `src/repositories/assets-repo.js:17` |
| `createAsset` + duplicate detection | `src/repositories/assets-repo.js:38-78` |
| `validateCreate` (no assignee validation) | `src/repositories/assets-repo.js:126-132` |
| `updateAsset` (writes all columns) | `src/repositories/assets-repo.js:80-107` |
| `recordAudit` (no actor) | `src/repositories/assets-repo.js:109-114` |
| `latestAuditFor` (`LIMIT 1`) | `src/repositories/assets-repo.js:116-124` |
| Route-level trimming | `src/routes/assets.js:39-43` |
| Duplicate error rendering | `src/routes/assets.js:50-52` |
| App error handler (error-code contract) | `src/app.js:17-24` |
| Migration runner | `src/db/migrate.js:13-70` |
| `addColumnIfMissing` (columns only, no rebuild) | `src/db/migrate.js:35-41` |
| `status` CHECK constraint | `src/db/migrations.sql` |
| `UNIQUE (category, serial_or_key)` | `src/db/migrations.sql` |
| `audit_log` FK with `ON DELETE CASCADE` | `src/db/migrations.sql` |
| Detail view action chain | `views/detail.ejs:25-50` |
| Lost-state dead end | `views/detail.ejs:47-49` |
| Single audit entry rendering | `views/detail.ejs:16-23` |
| List filter form | `views/list.ejs:3-26` |
| List empty row | `views/list.ejs:39-41` |
| Registration form (incl. `assigned-to`) | `views/new.ejs:10-39` |
| Design system (40 lines, 17 classes) | `public/styles.css` |
| Migration-over-legacy test (reusable pattern) | `tests/db.test.js:59-93` |
| Uniqueness constraint test | `tests/db.test.js:27-32` |
| `assigned → returned` assertion | `tests/asset-service.test.js:65-71` |
| `returned → assigned` assertion | `tests/asset-service.test.js:73-80` |
| `in-stock → returned` rejection | `tests/asset-service.test.js:82-86` |
| `lost` terminal assertion | `tests/asset-service.test.js:88-94` |
| Return-timestamp clearing assertion | `tests/asset-service.test.js:139-147` |
| Returned-state view assertions | `tests/views.test.js:111-123` |
| Lost-state view assertions | `tests/views.test.js:125-137` |
