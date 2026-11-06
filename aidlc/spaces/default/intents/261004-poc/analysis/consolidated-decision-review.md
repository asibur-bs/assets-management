# Consolidated Decision Review — Asset Tracker MVP

**Subject:** Asset Tracker MVP Workbook (`asset-tracker-mvp`)
**Baseline:** Asset Tracker POC (`aidlc/spaces/default/intents/261004-poc`, workflow complete)
**Companions:** `gap-analysis.md` (`32af9e9`), `decision-brief.md` (`5f2a464`) — both unchanged

**Status:** 🟡 **PARTIALLY APPROVED — 2 of 17 items.** Q1 (D1a) is **APPROVED**. Q10 (Q10-iv) is
**APPROVED IN PRINCIPLE**, conditioned on the concurrency-safety requirement documented in §7.1.6.
The remaining 15 items (A, B, C, D1/D2/D3, Q2–Q9, Q11, Q12) are **PENDING** — options and
recommendations are presented for review and are **not** recorded as requirements. No AIDLC intent
was created. No POC code, database, test, or configuration was modified. The committed gap analysis
and decision brief are untouched. The 66/66 passing test suite remains the baseline.

**Date:** 2026-11-06 · **Amended:** 2026-11-06 (Q1/Q10 confirmed; concurrency-safety section added)

---

## 0. Purpose, method, and how to use this document

The gap analysis mapped the MVP to the POC. The decision brief analysed A–D individually. This
document presents **the complete decision set together**, because several of them are
interdependent and reviewing them in isolation produces answers that contradict each other.

**What changed from the decision brief.** Two recommendations were revised after further
verification, and one new tension was discovered. Both are flagged in §1 and detailed in §5.

**Evidence convention.** Claims marked **[verified]** were confirmed by executing against a
throwaway in-memory database. Claims with a `file:line` reference were read from source. Commands
are in Appendix A.

**How to approve.** Each item (A, B, C, D, Q1–Q10) carries a single option letter. §9 contains a
consolidated matrix so you can see the whole set at once, and §13 contains a compact
answer sheet. Approval can be partial — some options can be confirmed and others revised.

---

## 1. What changed from the decision brief

| # | Item | Brief said | Now | Why |
|---|---|---|---|---|
| 1 | **Q10** | New open question — the functional index fails against pre-existing case-variant duplicates | **Resolved with a concrete strategy set**, and a **belt-and-braces fallback** identified that closes the gap | **[verified]** The POC has *no* app-level case check, so detect-and-skip alone would leave new case-variant duplicates creatable. The fallback closes this. |
| 2 | **A** | A1b-iii recommended, "must be verified" | **Verified working** — SQLite 3.49.2 / better-sqlite3 11.10.0 support `lower(trim(...))` in a unique index | **[verified]** The recommendation is now evidence-backed rather than provisional |
| 3 | **D1a** | `returned` stays a distinct resting state | **Confirmed, but with a newly surfaced tension** | **[verified]** A returned asset is reassignable yet sits in the "Returned" bucket, not "In Stock". This needs explicit labelling or the dashboard misleads. See §5.4. |

---

## 2. Decision dependency map

Read this before the options. It explains *why* some answers constrain others.

```
        ┌──────────────────────────────────────────────┐
        │  Q1 ── returned vs in-stock                  │
        │  (the root decision)                        │
        └───────────────┬──────────────────────────────┘
                        │ determines
        ┌───────────────▼──────────────┐
        │  D ── transition table        │
        │  D1a/D1b, D2a/D2b/D2c        │
        └───────┬──────────────┬───────┘
                │              │
                │ defines      │ defines
        ┌───────▼──────┐  ┌────▼────────────────┐
        │ C ── counting │  │ B ── recovery       │
        │ 5 buckets    │  │ lost -> in-stock    │
        └───────┬──────┘  └────┬────────────────┘
                │              │
                └──────┬───────┘
                       │ both change
                ┌──────▼───────────────────────────┐
                │ Migration set + transition table  │
                │ (one consolidated rebuild)        │
                └──────────────────────────────────┘

        ┌──────────────────────────────────────────┐
        │ A ── uniqueness (independent)           │
        │ Q10 ── index creation failure policy    │
        │ Q2–Q9, Q11 ── scope and policy (mostly  │
        │ independent, some affect C)             │
        └──────────────────────────────────────────┘
```

### 2.1 The coupling that matters most

**Q1 → D → C is a single chain.** You cannot settle C's bucket definitions without settling Q1,
and you cannot settle D's transition table without settling C's bucket semantics:

- **If Q1 = D1a** (`returned` is a resting state) → C needs **five** exclusive buckets, the
  "Returned" card has a real population, and the transition table has `returned → assigned,
  lost, discarded`.
- **If Q1 = D1b** (`returned` is transient) → C needs **four** buckets (the "Returned" card must be
  deleted from Screen 01), and the transition table has no `returned` state at all — which also
  deletes the POC's `status-returned` filter option and its CSS treatment.

**[verified]** under D1b, the "Returned" card's population is *always zero* — a permanently empty
card. That is the concrete reason D1a is recommended, and it is a **product-UI** argument, not a
code-simplicity one.

### 2.2 What does *not* couple

**A and Q10 are independent** of B, C, D and of each other. They can be decided in isolation and
do not constrain anything else. The same is true of Q3, Q5, Q8, and Q9.

### 2.3 Migration consolidation

D's `discarded` status requires a **table rebuild** (SQLite cannot `ALTER` a `CHECK` constraint).
B2a and D2b both want `last_assigned_to` on that same table. **One rebuild serves all three** —
this is the single largest schedule risk in the project and it is deliberately consolidated.

---

## 3. Decision A — Serial/Key Uniqueness Scope

**Status: independent of B, C, D.** Can be decided at any time.

### A.1 Options

| Option | Description | Migration | Trade-offs |
|---|---|---|---|
| **A-i** ⭐ | **Category-scoped (unchanged) + case-insensitive comparison via functional unique index on `lower(trim(serial_or_key))`** | 1 additive index, no rebuild | **Functional:** case/whitespace variants are duplicates; original value preserved and displayed. **Technical:** DB-enforced, no rebuild, indexed. **Data integrity:** same serial in two categories still undetected. **UX:** duplicate message can link to the conflicting asset. **Maintenance:** one index expression to keep in sync with the trimming rule |
| **A-ii** | Category-scoped + case-insensitive via a **stored normalised column** + UNIQUE constraint | **Table rebuild** | Strongest and most explicit. But adds a rebuild, a column, and a normalisation rule to maintain |
| **A-iii** | Category-scoped + **app-level case-insensitive check only** (no index) | None | No rebuild, no schema change. But the DB no longer enforces what the app enforces — a direct SQL write bypasses it. **Two enforcement layers that can disagree** |
| **A-iv** | **Globally unique** `UNIQUE(serial_or_key)` | **Table rebuild** | Prevents mis-filing. But blocks legitimate cross-category reuse, and **a POC database already containing a legal cross-category duplicate would fail the migration entirely** |

### A.2 Recommendation: **A-i**

**Why not "the easiest implementation":** A-iii is the easiest — no schema change at all. A-i is
recommended instead because it makes the rule **database-enforced and therefore unfalsifiable by
any code path**, including a future bulk-import script, a support query, or a direct SQL write.
The POC's own architecture already leans on the database for this rule (`assets-repo.js:69-76`
catches the constraint violation), so A-i extends the POC's existing idiom rather than replacing it.

**[verified]** A-i works on the shipped stack:
```
CREATE UNIQUE INDEX idx_ci ON assets(category, lower(trim(serial_or_key)))
  → case-variant duplicate:      REJECTED (SQLITE_CONSTRAINT_UNIQUE)
  → whitespace-padded duplicate: REJECTED
  → cross-category duplicate:    ALLOWED   (correct for A-i's category scoping)
```
`lower()` alone is **not** sufficient — whitespace variants slip through — so `trim()` is
mandatory in the expression.

**The acknowledged cost of A-i:** a serial filed under the wrong category is invisible to the
duplicate check. This is mitigated, not solved, by MVP-12 (surface the conflicting asset) and
MVP-16 (case-insensitive search already finds cross-category instances). It should be recorded in
the requirements as a **known limitation**, not left implicit.

### A.3 POC impact

| Aspect | Detail |
|---|---|
| Schema | `UNIQUE (category, serial_or_key)` — `src/db/migrations.sql` |
| Detection | `assets-repo.js:69-76` — catches the constraint violation, throws `DUPLICATE_ASSET` |
| **Error payload** | **[verified]** carries **no reference** to the conflicting asset: `{ code: 'DUPLICATE_ASSET', message: '...' }` — no `id`, no `details`. MVP-12 requires adding a lookup here |
| Trimming | Route trims (`routes/assets.js:39-43`); **the repository does not** — `validateCreate` (`:130`) checks the trimmed value but stores the untrimmed one. **[verified]** `' X-1 '` is stored with spaces via a direct repository call |
| Tests | `tests/db.test.js:27-32` (constraint), `tests/assets-repo.test.js` (duplicate detection) — **both unchanged** under A-i |

### A.4 Acceptance criteria

- [ ] A registration whose `(category, serial_or_key)` matches an existing asset, ignoring letter case and surrounding whitespace, is rejected with `DUPLICATE_ASSET`.
- [ ] The stored `serial_or_key` is byte-identical to the value entered, excluding surrounding whitespace; case is preserved.
- [ ] A registration whose serial matches an existing asset in a *different* category is accepted.
- [ ] The duplicate error identifies the conflicting asset by `id` and `name`, and the UI renders a working link to it.
- [ ] Direct SQL insertion of a case-variant duplicate within one category is rejected by the database.
- [ ] The repository trims `serial_or_key` before storing, so direct repository calls and HTTP calls store identically.
- [ ] A CSV export of mixed-case serials emits the original values.
- [ ] A POC database containing a cross-category duplicate opens, migrates, and operates without error.
- [ ] The requirements state the category-scoping limitation explicitly.

---

## 4. Decision B — Lost Asset Recovery

**Status: depends on D (transition table).** B's transition is added to D's table.

### B.1 The finding that drives this decision

**[verified]** `markLost` (`asset-service.js:87-94`) **destroys the previous holder**:

```
--- state at mark-lost ---
assigned_to : Bob
assigned_at : 2026-11-06T08:50:03.172Z

--- after markLost ---
assigned_to : null            <- previous holder LOST
assigned_at : 2026-11-06T08:50:03.172Z
```

The only surviving trace of "Bob had this" is the prose string `"HW" marked as lost.` in an audit
description. **[verified]** the audit trail is:

```json
[ { "action": "create",    "description": "Registered \"HW\"." },
  { "action": "assign",    "description": "Assigned \"HW\" to Bob." },
  { "action": "mark-lost", "description": "\"HW\" marked as lost." } ]
```

"Who had it when it went missing" is the first question anyone asks about a lost asset, and the
POC's data model cannot answer it. **This is the strongest single argument in the whole review.**

### B.2 Options

| Option | Description | Trade-offs |
|---|---|---|
| **B-i** | **`lost` stays terminal** (POC current); no change | Simplest; nothing migrates. But a found asset can never re-enter circulation — the only remedy is registering a new record, orphaning history and creating a duplicate. **Does not fix the holder loss** unless B-ii is adopted separately |
| **B-ii** ⭐ | **`lost → in-stock` recovery transition** + **preserve the holder** as `last_assigned_to` + capture loss reason/description/reporter | One transition, one column. Closes the accountability gap *and* the orphaning gap. Keeps §22's "complex recovery workflow" deferral intact — a single transition is not a workflow |
| **B-iii** | **`lost → assigned`** (recovery and reassignment in one step) | Combines two operations. Adds complexity for no MVP benefit — recovery and reassignment are two clicks |

### B.3 Recommendation: **B-ii**

**Why not "the easiest implementation":** B-i requires no work at all, and the POC's own FR4.5
declares `lost` terminal. B-ii is recommended because B-i produces a **permanent data-integrity
hole** — a found laptop becomes permanently unusable, and the only remedy creates a second record
for one physical item, directly violating your §1.3 core principle and §2.1's "single record per
asset" metric.

**Exactly what B-ii specifies:**

| Aspect | Behaviour |
|---|---|
| **Transition** | `lost → in-stock`. The asset returns to the available pool |
| **`assigned_to`** | **Cleared** — it is no longer held |
| **`last_assigned_to`** | **Retained** — the prior holder stays visible |
| **`assigned_at`** | Retained (the original assignment timestamp is history) |
| **Audit event** | A **distinct `recovered` action**, not `assign` or `return`. Description names the recovery and the prior holder |
| **Loss record** | Reason, optional description, reporting actor, timestamp — recorded at loss time, displayed on the detail view |
| **Rejected** | `lost → assigned` and `lost → returned` remain invalid. Recovery is one step; reassignment is a separate step |

**Audit semantics after B-ii.** The MVP's audit vocabulary becomes `create`, `assign`, `return`,
`mark-lost`, `recovered`, `edit`, `discard` — seven distinct, meaningful event types against the
POC's four. A recovered asset's trail reads `create → assign → mark-lost → recovered → assign`,
which is a complete, readable account of its life.

**Audit action naming.** `mark-lost` is hyphenated in the POC while `create`/`assign`/`return` are
not. The MVP should pick one convention — **past-tense, hyphenated verbs** (`created`,
`assigned`, `returned`, `marked-lost`, `recovered`, `updated`, `discarded`) — and record the mapping
from the POC's four values, since historical rows use the old names. This becomes **Q11**.

### B.4 POC impact

| Aspect | Detail |
|---|---|
| Transition map | `asset-service.js:5-10` — `lost: new Set([])` → becomes `{'in-stock'}` |
| `markLost` | `asset-service.js:87-94` — sets `assigned_to: null`; must set `last_assigned_to` instead |
| Audit vocabulary | 4 actions: `create` (`:40,:47`), `assign` (`:68`), `return` (`:83`), `mark-lost` (`:92`) |
| View | `views/detail.ejs:47-49` — "This asset is marked lost and cannot be transitioned." Dead end; copy must change |
| **Tests** | `tests/asset-service.test.js:88-94` — *"rejects transition from lost (terminal)"* → **rewrite**<br>`tests/views.test.js:125-137` — *"detail view offers no transitions for a lost asset"* → **rewrite** |
| Migration | `last_assigned_to` = 1 additive column. **No rebuild required** — can fold into D's rebuild |

**Historical data caveat.** For assets already `lost` under the POC, the holder was never
preserved. There is no column to backfill from — the only trace is the audit description prose.
An **optional best-effort backfill** could parse `assign` audit descriptions, but it depends on
prose format. Whether to attempt it is **Q9**.

### B.5 Acceptance criteria

- [ ] Marking an asset lost sets `status = 'lost'`, clears `assigned_to`, and sets `last_assigned_to` to the holder at the time of loss.
- [ ] A lost asset's prior holder is retrievable from the asset record without parsing audit prose.
- [ ] The loss event records reason, optional description, reporting actor, and timestamp.
- [ ] A `lost → in-stock` recovery operation exists, is reachable from the lost asset's detail view, and produces a distinct `recovered` audit event.
- [ ] Recovery clears `assigned_to` but **retains** `last_assigned_to` and `assigned_at`.
- [ ] `lost → assigned` and `lost → returned` are rejected with `INVALID_TRANSITION`.
- [ ] Recovering an asset that is not `lost` is rejected with `INVALID_TRANSITION`.
- [ ] After recovery, the asset appears in the `in-stock` count, not in the `lost` count, and dashboard and export agree.
- [ ] The recovered asset does not appear in any assignee's current holdings.
- [ ] The complete audit trail for a recovered asset reads `create → assign → mark-lost → recovered` in order.
- [ ] The requirements record that complex recovery workflows remain deferred.

---

## 5. Decision C — Inventory Counting Definitions

**Status: depends on Q1** (bucket count and the meaning of the "Returned" card).

### C.1 Options

| Option | Description | Trade-offs |
|---|---|---|
| **C-i** ⭐ | **Five exclusive buckets + Active Inventory (excludes discarded) + Total Records, all from one shared counting function and one shared filter builder** | Cards always reconcile. Requires exactly one status per asset — already guaranteed by the schema. Requires two headline figures rather than one |
| **C-ii** | "Total Assets" = every row including discarded; five status cards partition the rest | Cards do **not** sum to the total. Needs an in-UI explanation — fragile |
| **C-iii** | "Total Assets" = active only (excludes discarded); discarded has its own card | Cards reconcile if discarded is excluded from the headline. One headline figure |
| **C-iv** | **Overlapping buckets** — a returned asset counts as both "returned" and "available" | Rejected. Breaks the sum and makes every count ambiguous |

### C.2 Recommendation: **C-i**

**Why not "the easiest implementation":** C-iii is marginally simpler — one figure instead of two.
C-i is recommended because **it is the only option that makes §24's "Dashboard Count Consistency
100%" enforceable by construction**. The whole point of the shared function is that the dashboard,
the assignee views, the list count, and the CSV export **provably** cannot diverge. C-iii also
reconciles, but it leaves "how many assets exist" ambiguous — your §2.1 asks exactly that
question, and C-i answers it with two explicitly-labelled figures so neither reading is
unsatisfiable.

### C.3 The shared-function architecture

**[verified]** the POC has **no aggregation queries at all**:
```
$ grep -rn "COUNT\|GROUP BY\|count(" src/
(no matches)
```
And the only `LIMIT` is the audit `LIMIT 1` (`assets-repo.js:122`).

**A structural blocker.** The filter logic is *inlined inside `listAssets`*
(`assets-repo.js:13-32`) and is therefore **not reusable**. A counting function cannot share it
today. **Extracting the filter builder is a prerequisite for C, not part of it** — and must appear
explicitly in the implementation plan.

```
buildAssetFilters({ q, category, status, assignee, created_from, updated_from })
    → { whereSql, params }          ← SINGLE source of filter truth

countAssetsByStatus(db, filters) → { 'in-stock': n, 'assigned': n, ... }
countAssetsTotal(db, filters)    → n
listAssets(db, filters, { limit, offset }) → rows
```

All five consumers — dashboard cards, assignee counts, list count, CSV export, recent-activity —
read from `buildAssetFilters`.

**[verified]** the arithmetic holds on a realistic dataset:
```
total records     : 4
active (excl disc): 4
sum of 4 active   : 4
buckets sum == total: true

per-assignee: [{"assigned_to":"Alice","c":1}]
bucket assigned: 1
match: true
```

### C.4 The D1a tension — newly surfaced

**[verified]** under D1a, a returned asset is **reassignable** (`returned → assigned` succeeds) yet
sits in the **"Returned"** bucket, **not** "In Stock".

```
status after return: returned  → populates the Returned card
reassign succeeded, status: assigned, assigned_to: Carol
```

**Availability is expressed by permitted transitions, not by the status value.** The status
answers *"what happened last"*; the transitions answer *"what can happen next"*.

**The risk:** an admin glancing at the dashboard sees "In Stock: 2" and concludes two assets are
assignable, when in fact a third asset is sitting in "Returned" and is also assignable. **The
dashboard would under-report availability.**

**Mitigations, in order of preference:**

| Option | Approach | Assessment |
|---|---|---|
| **C-i-M1** ⭐ | **Label the card "Returned (available for reassignment)"** and add a sub-metric "Available to assign = In Stock + Returned" | No schema change, no count change. Makes the truth visible in one place. **Recommended** |
| **C-i-M2** | Fold `returned` into the "In Stock" bucket | Breaks the exclusive-bucket model — the asset would appear in two cards. Rejected under C-i |
| **C-i-M3** | Suppress the "Returned" card | Loses the distinction your §MVP-07 requires. Rejected |

**C-i-M1 is the recommendation.** It resolves the tension without weakening the exclusive-bucket
arithmetic, and it turns a potential dashboard lie into a stated, checkable metric.

### C.5 POC impact

| Aspect | Detail |
|---|---|
| Aggregation | **[verified]** none exists |
| Filter builder | `assets-repo.js:13-32` — inlined, **must be extracted** |
| Status enum | `assets-repo.js:6` — `ALLOWED_STATUSES` needs `discarded` added, or the status filter silently ignores it |
| Indexes | `idx_assets_status` and `idx_assets_category` exist and are reusable; `idx_assets_assigned_to` is new (needed for assignee aggregation) |
| View | `views/list.ejs:39-41` — empty row; `assets.length` available but unused for counting |
| Tests | **None** assert any count — no POC test requires modification |
| Migration | No schema change beyond `discarded` (shared with D). New index `idx_assets_assigned_to` |

### C.6 Acceptance criteria

- [ ] Every asset belongs to exactly one of the five status buckets.
- [ ] The five bucket counts sum to the total record count.
- [ ] Active Inventory equals the sum of the four active buckets and excludes discarded.
- [ ] Total Records equals Active Inventory + Discarded.
- [ ] Dashboard cards, assignee counts, list result counts, and CSV export row counts are all produced by one shared counting function and one shared filter builder.
- [ ] Exporting a filtered list produces exactly the assets shown on screen under that filter.
- [ ] The sum of per-assignee assigned counts equals the `assigned` bucket count.
- [ ] A discarded asset is excluded from Active Inventory and from every assignee's holdings, but included in Total Records and in the `discarded` bucket.
- [ ] The UI labels Active Inventory and Total Records distinctly.
- [ ] The "Returned" card states that returned assets are available for reassignment, and an "available to assign" metric equals In Stock + Returned.
- [ ] The list view distinguishes an empty inventory from an empty filtered result, showing a filtered count of zero for the latter.

---

## 6. Decision D — Lifecycle Transitions

**Status: the root decision.** Q1 (D1a vs D1b) is the most consequential single choice in this
review, and it is answered in §6.1–6.3 below.

### D.1 Q1 — Is `returned` a resting state or a transient marker?

| Option | Description | Consequences |
|---|---|---|
| **D1a** ⭐ | **`returned` is a distinct resting state** (POC current) | "Returned" card has a real population. Preserves the POC's filter option, CSS treatment, and ~8 tests. Requires amending workbook §4.1's arrow and §21.1 Scenario 3 |
| **D1b** | **`returned` is transient; status becomes `in-stock`** | **[verified]** the "Returned" card is **permanently empty** — dead UI or a defect. Removes the `returned` state entirely, deleting the POC's filter option and CSS. Requires rewriting ~8 tests. Requires **deleting** the "Returned" card from Screen 01 |

**[verified]** the decisive argument:
```
If D1a:  status after return: returned  → Returned card population: NON-ZERO (meaningful)
If D1b:  status after return: in-stock  → Returned card population: ALWAYS ZERO (dead card)
```

**Recommendation: D1a.** But this requires an **explicit workbook amendment** — your §4.1 arrow
`Returned → In Stock` is read as descriptive prose ("the asset comes back into circulation"), not
as a literal status value. The implementation and the requirements must not disagree, so §4.1 and
§21.1 Scenario 3 must be reworded during Requirements Analysis.

**This is not "the easiest implementation"** — D1b would actually be simpler in code terms (one
fewer state). D1a is recommended because **D1b makes a card in your own Screen 01 permanently
empty**, and because "returned" carries real meaning for an asset manager: it says *this came
back*, which is different from *this was never issued*.

### D.2 D2 — `assigned → discarded`

| Option | Description | Trade-offs |
|---|---|---|
| **D2a** | Discard allowed only from `in-stock`/`returned` | Simple, testable. But forces a **fake return** before discarding a held asset — the holder still has the laptop; you want to write it off, not pretend it came back |
| **D2b** ⭐ | **Discard allowed from `assigned`; the assignment is resolved inline** and recorded | One operation, no orphan assignment, no approval workflow. Closest to §4.1's "only after the assignment is resolved" without importing §22's deferred approval concept |
| **D2c** | Discard from `assigned` requires a separate prior "resolve assignment" action | Closest to §4.1's literal wording. Adds a concept §22 defers, and makes a two-step flow where one suffices |

**Recommendation: D2b.**

**Exactly what D2b specifies:**

| Aspect | Behaviour |
|---|---|
| **Transition** | `assigned → discarded` is permitted |
| **`assigned_to`** | **Cleared** — the asset is no longer held |
| **`last_assigned_to`** | **Retained** — the holder at discard time stays visible |
| **Audit event** | A `discarded` action recording the discard, **the prior holder**, and the fact that **the assignment was resolved by the discard** |
| **Reason** | Required — a discard always has a recorded reason (see Q5/Q12 alignment) |
| **Record** | The asset row and its full history are **never** deleted |
| **Counts** | Excluded from Active Inventory; present in the `discarded` bucket and in Total Records |
| **Reachable** | The asset remains accessible at `/assets/:id` with its history intact |

**Why not D2a:** it would require an admin to fabricate a return — clicking "Mark returned" for an
asset the employee still has — purely to unlock the write-off. That corrupts the audit trail
(dishonestly recording a return that never happened), which defeats the entire purpose of the
MVP's accountability work. **D2a is not merely more friction; it actively degrades data
integrity.** That is a strong reason to reject it.

**Why not D2c:** it defers the assignment resolution to a separate action, which means the asset
sits in a state where the admin has said "discard this" but hasn't finished the job. §22 defers
"Complex Approval Workflows"; a two-step discard is the embryo of one.

### D.3 D3 — The remaining edges

| Edge | Options | Recommendation | Reasoning |
|---|---|---|---|
| `in-stock → lost` | Allow / Disallow / Allow-with-required-reason | **Allow, with a required reason** | Your §4.1 says "where operationally appropriate" — the condition is unstated. Since MVP-11 requires a reason for loss anyway, applying it uniformly removes a special case. **[verified]** the POC has no such edge |
| `returned → discarded` | Allow / Disallow | **Allow** | A returned asset is unheld; discarding it is routine and needs no resolution step |
| `discarded → …` | Terminal / Recoverable | **Terminal** | Matches "never hard-delete". Recovery from `discarded` is not required by any workbook requirement. See **Q6** |
| `lost → discarded` | Allow / Disallow | **Disallow** | A write-off of a missing asset is operationally meaningful (insurance, finance) but **no workbook requirement asks for it**. MVP-11 says "Lost assets should remain accessible through historical records." Out of scope for the MVP |
| `lost → in-stock` | — | **Per Decision B (B-ii)** | Recovery |

### D.4 Resulting transition table (recommended combination)

```
in-stock  → assigned, lost, discarded
assigned  → returned, lost, discarded
returned  → assigned, lost, discarded
lost      → in-stock                      (recovery — Decision B)
discarded → (terminal)
```

**[verified]** against the POC's current map, **all five MVP-proposed edges are absent today**:
```
in-stock -> lost     : false
in-stock -> discarded : false
assigned -> discarded : false
returned -> discarded : false
discarded in map      : false
```

### D.5 POC impact

| Aspect | Detail |
|---|---|
| Transition map | `asset-service.js:5-10` — five edges added, `discarded` source added |
| **DB constraint** | `status TEXT NOT NULL CHECK (status IN ('in-stock','assigned','returned','lost'))` — **[verified]** SQLite cannot `ALTER` a `CHECK`; **a table rebuild is required** |
| Migration helper | `addColumnIfMissing` (`migrate.js:35-41`) handles **columns only** — a **new table-rebuild helper** is required |
| `updateAsset` | `assets-repo.js:80-105` writes **every column unconditionally**. **[verified]** `updateAsset({name:'New Name'})` also rewrites `model`, `notes`, etc. **MVP-09's field-scoped edit needs a dedicated function** |
| View | `views/detail.ejs:25-50` is an `if/else if` chain on `status`. With 5 states and multiple actions each, it must become **transition-driven** — iterating `TRANSITIONS` — so the UI's actions are derived from the state machine rather than duplicated from it. This structurally prevents a repeat of the POC's T-FR3.3 defect (a returned asset offering an action the service rejects) |
| **Tests** | `tests/asset-service.test.js:82-86` (`in-stock → returned` rejected) — **unchanged** under D1a<br>`tests/asset-service.test.js:65-71` (`assigned → returned`) — **unchanged**, confirms D1a<br>`tests/asset-service.test.js:73-80` — extend for `last_assigned_to`<br>`tests/asset-service.test.js:139-147` — extend<br>`tests/views.test.js:111-123` — extend (returned gains Discard)<br>`tests/asset-service.test.js:88-94`, `tests/views.test.js:125-137` — **rewrite** per Decision B<br>`tests/db.test.js:72` — the legacy `CHECK` literal must **stay 4-value** to genuinely simulate a legacy DB |

### D.6 Acceptance criteria

- [ ] The transition table is documented in the requirements exactly as implemented, with every edge covered by a test.
- [ ] `in-stock → discarded`, `assigned → discarded`, and `returned → discarded` are permitted.
- [ ] `assigned → discarded` clears `assigned_to` and retains the holder in `last_assigned_to`.
- [ ] The discard audit event names the prior holder and states that the assignment was resolved by the discard.
- [ ] `discarded` is terminal — every transition out of it is rejected with `INVALID_TRANSITION`.
- [ ] A discarded asset is never deleted; its record and complete history remain retrievable.
- [ ] A returned asset's status is `returned` (a distinct resting state) and it offers assign, mark-lost, and discard actions.
- [ ] `in-stock → returned` remains invalid — a return requires a prior assignment.
- [ ] `in-stock → lost` is permitted and requires a loss reason.
- [ ] The detail view renders exactly the actions permitted by `TRANSITIONS` for each of the five states, verified by a table-driven test across all states.
- [ ] The migration extending the `status` CHECK preserves every row and every column value, verified against a populated legacy database.
- [ ] `PRAGMA foreign_key_check` returns no rows after the rebuild, and a pre-migration asset's audit history remains intact and queryable.
- [ ] Applying the migrations twice is idempotent — no duplicated rows, no repeated rebuild.

---

## 7. Q2–Q11 — Scope and policy questions

These are largely independent of A–D and can be decided separately.

### Q2 — Do pre-MVP audit rows count toward §24's "100% actor attribution"?

| Option | Description | Trade-off |
|---|---|---|
| **Q2-i** ⭐ | **No — the metric applies to MVP-era events.** Pre-MVP rows are backfilled to a `system` actor and excluded from the metric, with the exclusion stated in the requirements | Honest. The metric then measures what the MVP actually guarantees. Requires a clear qualifier in §24 |
| **Q2-ii** | **Yes — count all rows.** Backfill pre-MVP rows to `system` and count them | The metric reads 100% but is achieved by a placeholder, not real attribution. Technically satisfies the letter, not the intent |
| **Q2-iii** | **No backfill at all; leave `actor_id` NULL for historical rows** | Schema-clean, but NULL actors in an audit trail look like a defect. "Unknown" is more honest than NULL |

**Recommendation: Q2-i**, with `system` backfill so every row has a non-null actor.

**POC impact:** `audit_log` has no `actor_id` at all (`migrations.sql`). A backfill migration is
required either way.

---

### Q3 — Should the `assigned-to` field be removed from registration?

| Option | Description | Trade-off |
|---|---|---|
| **Q3-i** ⭐ | **Remove it.** The MVP's Screen 03 lists only Name, Category, Serial/Key, Model, Notes | Aligns with the workbook and removes the ambiguity MVP-03 exists to eliminate. But it removes a convenience the POC currently offers |
| **Q3-ii** | **Keep it** as a plain stored field, clearly labelled "recorded assignee (does not assign)" | Matches the POC's current behaviour, which was a deliberate correction. But it stores an assignee on an `in-stock` asset — the exact confusion MVP-03 targets |
| **Q3-iii** | Keep it, but make it **perform an assignment** | Directly contradicts FR1.5 and the POC's deliberate fix. Rejected |

**Recommendation: Q3-i.** The POC's behaviour was a *correction* to an earlier mistake, and the MVP
has since decided the field shouldn't be there at all.

**POC impact:** `views/new.ejs:31-33` renders the field; `routes/assets.js:43` reads it;
`assets-repo.js:58` stores it; `asset-service.js:39-45` branches on it. **Note:** the POC's
`registerAsset` currently writes a *different* audit description when an assignee is present
(`"Registered \"X\" (recorded assignee: Y)."` vs `"Registered \"X\"."`) — removing the field
simplifies that branch.

---

### Q4 — Should recovery require a reason?

| Option | Description | Trade-off |
|---|---|---|
| **Q4-i** | **No — recovery requires no reason** | Simplest; recovery is a positive event. But loses the "how long was it missing?" signal, which is exactly what a lost-asset review wants |
| **Q4-ii** ⭐ | **Yes — a reason is required**, same vocabulary as loss | Symmetric with loss. "Found in storage" / "Found with employee" / "Other". Adds one field, one validation, one storage slot |
| **Q4-iii** | Optional reason | Weakest; tends toward being ignored |

**Recommendation: Q4-ii.** The signal "this was lost for 4 months" is valuable, and MVP-11 already
establishes a reason vocabulary.

**POC impact:** no impact — recovery does not exist. The reason vocabulary is shared with MVP-11's
loss reasons.

---

### Q5 — CSV injection policy

| Option | Description | Trade-off |
|---|---|---|
| **Q5-i** ⭐ | **Prefix-quote dangerous values** — a cell beginning with `=`, `+`, `-`, `@`, tab, or CR is prefixed with `'` | Standard mitigation. Excel/LibreOffice render the value as text. Slightly alters the exported value |
| **Q5-ii** | **Strip the leading character** | Alters data; the original is unrecoverable from the export. Rejected |
| **Q5-iii** | **No mitigation** — export raw | The export is user-controlled (`name`, `notes`, `assigned_to` are all free text) and opens in a spreadsheet by default. A `notes` value of `=cmd|' /C calc'!A0` executes. Rejected on security grounds |
| **Q5-iv** | **Escape with a backslash / RFC-4180 quoting only** | RFC-4180 quoting handles delimiter-breaking but **does not** prevent formula execution. Insufficient |

**Recommendation: Q5-i.** Note that RFC-4180 quoting is still applied *in addition* — it prevents
delimiter breakage, Q5-i prevents formula execution. They solve different problems and both are
needed.

**POC impact:** no export exists. New implementation.

---

### Q6 — Is `discarded` recoverable?

| Option | Description | Trade-off |
|---|---|---|
| **Q6-i** ⭐ | **No — `discarded` is terminal** | Matches "never hard-delete". A discarded asset is retired; un-retiring it is a data-correction task, not a lifecycle transition. No workbook requirement asks for it |
| **Q6-ii** | **Yes — `discarded → in-stock`** (undiscard) | Adds a second recovery path. Two recovery paths (lost + discarded) is more surface for little MVP value |

**Recommendation: Q6-i.**

**POC impact:** `discarded` does not exist yet; the terminal decision is a new edge to omit.

---

### Q7 — Should `in-stock → lost` be permitted?

| Option | Description | Trade-off |
|---|---|---|
| **Q7-i** ⭐ | **Yes, with a required reason** | Matches §4.1's "where operationally appropriate" — an asset can be written off before it's ever issued (found damaged in a shipment, mis-purchased). Uniform with the loss-reason rule |
| **Q7-ii** | **No — loss only from `assigned`** | The POC's current rule. But then a damaged asset received and never issued can never be recorded as lost — it would have to be discarded, which conflates two different business events |
| **Q7-iii** | Yes, but **no reason required** | Inconsistent with MVP-11 and with D3's recommendation. Rejected |

**Recommendation: Q7-i.** "Lost" and "discarded" are distinct business events per §4.1; conflating
them loses meaning.

**POC impact:** the edge does not exist (`asset-service.js:6`).

---

### Q8 — Design gate consolidation

| Option | Description | Trade-off |
|---|---|---|
| **Q8-i** ⭐ | **Merge Gates 1+2 and 3+4; keep Gate 5 standalone** | Five gates become three. Gate 5 (handoff) is the binding contract for codegen and should stand alone. Saves two serial approval cycles |
| **Q8-ii** | **Keep all five gates separate** | Maximum rigour. But nine AIDLC stages plus five design gates is a long serial chain for a single developer |
| **Q8-iii** | **Merge 1+2+3+4 into one** | Fastest. But the prototype review (Gate 4) would happen before high-fidelity approval, undermining the prototype's purpose |

**Recommendation: Q8-i.** Gate 3 (UI) and Gate 4 (prototype) are naturally one review — the
prototype *is* the high-fidelity artifact being reviewed.

**POC impact:** none — a process decision for Stage 3 planning.

---

### Q9 — Should the best-effort lost-asset backfill be attempted?

| Option | Description | Trade-off |
|---|---|---|
| **Q9-i** ⭐ | **Yes, as an optional best-effort migration that never fails the release** | Recovers some history from audit prose. Fragile, but strictly additive and safely skippable |
| **Q9-ii** | **No — document the gap instead** | Cleaner, more honest. Leaves `last_assigned_to` empty for pre-MVP lost assets permanently |
| **Q9-iii** | **Yes, and make it mandatory** | A migration that can fail on data conditions is a release blocker. Rejected |

**Recommendation: Q9-i**, with the migration reporting how many rows it recovered and how many it
could not, and **never** failing the release. The residual gap must be documented either way.

**POC impact:** migration 6b, optional. Depends on the audit prose format
(`"Assigned \"X\" to Bob."` — `asset-service.js:13`).

---

### Q10 — Handling pre-existing case-variant duplicates during the functional-index migration

**This is the most operationally consequential of the policy questions**, because it concerns
real data that already exists.

#### The problem

**[verified]** under the POC's current rules, `TP-001` and `tp-001` in the same category are
**legal**. A POC database may already contain them. Creating the A-i index against such data
**fails outright**:

```
index creation FAILED: UNIQUE constraint failed: index 'idx_ci'
```

#### The strategies

| Option | Description | Safety | Consequence |
|---|---|---|---|
| **Q10-i** | **Detect-and-abort** — run the detection query; if conflicts exist, report them and abort the migration | **Safest** | The release is blocked until a human resolves the duplicates. Requires a resolution workflow (which this option doesn't provide) |
| **Q10-ii** | **Detect-and-skip** — detect, report, skip creating the index, continue the migration | Safe to data; **leaves a functional gap** | The DB is untouched and fully functional, but the case-insensitive rule is **not enforced at the DB level** |
| **Q10-iii** | **Detect-and-remediate** — automatically modify or merge the offending records | ❌ **Rejected** | You instructed that existing records must not be automatically modified, and correctly so: merging two assets silently destroys one asset's identity, its timestamps, and its audit trail. **Auto-modification of asset records is unacceptable in an accountability system** |
| **Q10-iv** ⭐ | **Belt-and-braces: detect-and-skip the index + always enforce at the application layer** | **Safe and complete** | The DB rule is applied when it can be; the application rule is applied **always**, with no gap |

#### Why Q10-iv closes the gap that Q10-ii leaves

**[verified]** the POC has **no application-level case check at all** — it relies entirely on the
DB constraint:

```
pre-existing conflicting pair in DB
NEW case-variant duplicate: ALLOWED -> POC has NO app-level case check
```

So under Q10-ii alone, a database that skips the index would **accept new case-variant duplicates
through the application**. That is a silent integrity hole created by the migration itself.

**[verified]** the application-level check needs **no index** and finds the conflict, including the
conflicting asset's id — which also serves MVP-12's navigation requirement:

```
app-level lookup found conflict: {"id":"a","name":"A","serial_or_key":"TP-001"}

EXPLAIN QUERY PLAN:
  SEARCH assets USING INDEX idx_assets_category (category=?)
```

It uses the **existing** `idx_assets_category` — no new index required, and the query cost is
bounded by the assets in one category.

#### Recommendation: **Q10-iv**

The belt-and-braces approach:

1. **Always** enforce case-insensitive uniqueness in the application layer (a read-only lookup
   before insert/update). This is the primary guarantee and it never fails, regardless of the
   index's presence.
2. **Attempt** the functional unique index as a **defence-in-depth** measure.
3. Before creating the index, run the **detection query**:
   ```sql
   SELECT category, lower(trim(serial_or_key)) AS k, COUNT(*) AS c, group_concat(id) AS ids
     FROM assets
    GROUP BY category, k
    HAVING c > 1;
   ```
   **[verified]** this correctly identifies the offending pair:
   `[{"category":"hardware","k":"tp-001","c":2,"ids":"a,b"}]`
4. **If conflicts exist:** report them clearly (ids, names, original serials), **do not create the
   index**, **do not modify any record**, and continue the migration. The application-layer rule
   still protects against new duplicates. The finding is surfaced to the operator for manual
   resolution outside the migration.
5. **[verified] detection is provably non-destructive** — row count before and after detection is
   unchanged.

**The two-layer model, stated plainly:**

| Layer | Always active? | Guarantees |
|---|---|---|
| Application-level check | **Yes** | The app never creates a case-variant duplicate, and surfaces the conflicting asset for MVP-12 |
| Functional unique index | Best-effort | The DB rejects case-variant duplicates even from direct SQL writes |

If the index succeeds, both layers are active. If it is skipped, the application layer still holds.
**No gap in either case** — which is precisely what Q10-ii lacks.

**Note on scope:** the application-level check is not an extra feature — it is **required by
Decision A's acceptance criteria anyway**, and it is the mechanism that delivers MVP-12's "link to
the conflicting asset". Q10-iv therefore costs almost nothing beyond what A already requires.

#### Concurrency safety of the application-level check

**Requirement (added 2026-11-06, confirmed by the human):** the application-level duplicate check
must be concurrency-safe. A check-before-insert alone is insufficient if concurrent requests can
create duplicate records. The transaction/locking strategy and its limitations must be documented.

The requirement is correct. The reason it is insufficient is narrower than it first appears, and
the correct remedy depends on which deployment topology is in force. Both are established below
**by execution**, not by inference.

##### What was tested

All tests use the shipped stack — `better-sqlite3` 11.10.0 (SQLite 3.49.2), `journal_mode = WAL` —
with **8 OS threads** (`node:worker_threads`), each with its own connection, all registering the
same case-variant serial (`X-1` / `x-1`) in the same category.

| # | Configuration | Rows created | Conflicts detected | Errors | Verdict |
|---|---|---|---|---|---|
| 1 | **Check-then-insert, no transaction** | **8** | **0** | 0 | ❌ **RACE — duplicate created** |
| 2 | **Deferred transaction**, `busy_timeout = 5000` | 1 | 7 | 0 | ✅ safe, but see L2 |
| 3 | **`IMMEDIATE` transaction**, `busy_timeout = 5000` | 1 | 7 | 0 | ✅ **safe and lossless** |
| 4 | Deferred transaction, `busy_timeout = 0` | 1 | 6 | 1 | ⚠️ `SQLITE_BUSY` |
| 5 | `IMMEDIATE` transaction, `busy_timeout = 0` | 1 | 5 | 2 | ⚠️ `SQLITE_BUSY` |
| 6 | **Functional unique index, no app-level check** | **1** | **7 rejected by the DB** | 0 | ✅ **safe by construction** |

**[verified]** configuration 1 — the naive check-then-insert the requirement warns about — creates
**all 8 duplicates and detects zero conflicts**:

```
=== APP-LEVEL CHECK-THEN-INSERT, 8 concurrent workers ===
inserts attempted: 8
conflicts detected: 0
ROWS IN DB (should be 1): 8
RESULT: RACE - DUPLICATE CREATED
```

**[verified]** configuration 3 closes it completely — one insert, seven conflicts, no errors:

```
=== IMMEDIATE-TRANSACTION check+insert, 8 concurrent workers ===
inserted: 1
conflict: 7
ROWS IN DB (should be 1): 1
RESULT: SAFE (transaction serializes the check+insert)
```

**[verified]** configuration 6 shows the functional index is **structurally immune** to this race:
the uniqueness constraint is evaluated inside the write transaction by SQLite itself, so there is no
gap between the check and the write for another writer to slip into.

##### The strategy

**The application-level check must run inside an `IMMEDIATE` transaction, on a connection with
`busy_timeout` set, and must treat a `SQLITE_BUSY` failure as a retryable error rather than
silently succeeding or crashing.**

In `better-sqlite3` terms:

```js
const register = db.transaction((input) => {
  const conflict = db.prepare(
    `SELECT id, name, serial_or_key FROM assets
      WHERE category = ? AND lower(trim(serial_or_key)) = lower(trim(?))`
  ).get(input.category, input.serialOrKey);
  if (conflict) throw duplicateError(conflict);   // DUPLICATE_ASSET, carrying the conflicting id
  return insertRow(input);
});
register.immediate();   // <-- IMMEDIATE, not the default DEFERRED
```

Two details are load-bearing and both were verified above:

- **`.immediate()` rather than the default `.deferred()`.** A deferred transaction takes a read lock
  at `BEGIN` and only escalates to a write lock at the first write. Between the `SELECT` and the
  `INSERT`, two transactions can both hold a read lock, both see no conflict, and both attempt the
  upgrade — SQLite resolves one by failing it with `SQLITE_BUSY`. `IMMEDIATE` takes the write lock
  up front, so the read and the write are serialized by the database rather than by application
  logic.
- **`busy_timeout` must be non-zero.** The POC's `openDatabase` (`src/db/index.js:15-16`) sets
  `journal_mode = WAL` and `foreign_keys = ON` but **does not set `busy_timeout`**. SQLite's
  default is `0`, meaning a blocked writer fails **immediately** rather than waiting. Configurations
  4 and 5 show the consequence: `SQLITE_BUSY` errors reach the caller and legitimate registrations
  are lost. Configuration 3 (`IMMEDIATE` + `busy_timeout = 5000`) is the only lossless one.

##### Limitations — stated explicitly

| # | Limitation | Consequence / mitigation |
|---|---|---|
| **L1** | **`busy_timeout` is not currently set on the POC connection.** `src/db/index.js:15-16` sets `journal_mode` and `foreign_keys` only. | **Must be added.** Until it is, the transaction serializes correctly but concurrent writers are failed with `SQLITE_BUSY` rather than waited on. A one-line change to `openDatabase`, in scope for the MVP. |
| **L2** | **`SQLITE_BUSY` is still possible even with `busy_timeout` set**, if the lock is held longer than the timeout. | Must be caught and mapped to a retryable error response, not a 500. The MVP's error contract (`src/app.js:17-24`) has no busy/retry code today — one must be added. |
| **L3** | **The `IMMEDIATE` transaction serializes writers against each other.** It is a write lock held for the duration of the check+insert. | The critical section is short (one indexed `SELECT` + one `INSERT`), so contention is bounded. Registration throughput is limited by write-lock acquisition, not CPU. At MVP scale this is not a concern — a scaling note, not a defect. |
| **L4** | **The application layer covers only writes that go through the application.** A direct SQL write is not covered by the app-level check. | This is exactly why the functional index (Q10-iv layer 2) is retained as defence-in-depth. When the index is present both layers are active; when it is skipped only layer 1 is. |
| **L5** | **The current deployment topology masks the race entirely.** The POC is a **single Node process with a single `better-sqlite3` connection** (`src/server.js:12-15` → `createApp(db)`), and `better-sqlite3` is **fully synchronous**. | **[verified]** under 100 concurrent requests on that exact topology the result is 1 row and 99 conflicts — the race **cannot** occur, because a synchronous function body cannot be interleaved by the event loop. **This safety is an accident of the current architecture, not a property of the check.** It disappears the moment a second connection, a second process, a worker pool, or an async driver is introduced. The check must therefore be built correctly rather than rely on the topology. |
| **L6** | **The functional index and the application check must use the identical normalization expression** (`lower(trim(...))`), or they can disagree. | Both must be derived from **one shared constant**, not written twice. A test must assert the index expression and the application predicate are textually identical, so a future change to one cannot silently diverge from the other. |
| **L7** | **A concurrent `UPDATE` to an existing asset's serial has the same race** as registration. | The same `IMMEDIATE` transaction must wrap the update path, not only the insert path. |
| **L8** | **The uniqueness rule is category-scoped (Decision A-i).** Two assets with the same serial in *different* categories are legal. | Concurrency safety is per-`(category, normalized-serial)` pair. The lock is global (SQLite has no row-level locks), so it is conservative — stricter than the rule requires, which is safe. |

##### Effect on the recommended strategy

**Q10-iv stands, and is strengthened.** The belt-and-braces model is now precisely specified:

| Layer | Enforcement | Concurrency behaviour |
|---|---|---|
| Application check (always on) | `IMMEDIATE` transaction + `busy_timeout` + `SQLITE_BUSY` handling | Serialized by the database; **race-free** |
| Functional index (best-effort) | SQLite uniqueness constraint | **Structurally race-free** |

The functional index remains the stronger guarantee because it needs no cooperation from the caller.
The application layer becomes race-free rather than *merely* present, which is what the added
requirement asks for. **Neither layer is weakened by the other.**

**One consequence worth flagging:** because the index is skipped only when pre-existing conflicts
exist, and the application check is the fallback in that case, the application check is on the
critical path for **every** registration regardless of whether the index exists. The `IMMEDIATE`
transaction is therefore not optional hardening — it is required for Q10-iv to hold its "no gap"
claim.

#### Acceptance criteria for Q10

- [ ] The application-level duplicate check runs inside an `IMMEDIATE` transaction, not a deferred one.
- [ ] The database connection sets a non-zero `busy_timeout`.
- [ ] `SQLITE_BUSY` is caught and mapped to a retryable error response; it is never surfaced as an unhandled failure or a silent success.
- [ ] The duplicate check and the insert execute within the same transaction, with no code path that separates them.
- [ ] The update path uses the same transactional wrapper as the insert path.
- [ ] A concurrency test asserts that N simultaneous registrations of the same case-variant serial produce exactly one asset and N-1 `DUPLICATE_ASSET` errors.
- [ ] The concurrency test passes with the functional index absent, proving the application layer stands alone.
- [ ] The index expression and the application predicate are derived from a single shared constant, and a test asserts they are textually identical.
- [ ] The migration runs the detection query before attempting index creation.
- [ ] If conflicts exist, the migration reports them (ids, names, original serial values) and **does not create the index**.
- [ ] The migration **never modifies an existing asset record** to resolve a conflict.
- [ ] The migration **never fails** because of pre-existing conflicts.
- [ ] The application rejects a new registration whose serial matches an existing asset in the same category, ignoring case and whitespace — **with or without the index present**.
- [ ] A test asserts the application-level rejection works when the functional index does **not** exist.
- [ ] The migration reports the number of conflicting groups found, whether or not the index was created.

---

### Q11 — Audit action naming convention *(new — raised by this review)*

The POC's vocabulary is inconsistent: `create`, `assign`, `return` (bare verbs) vs `mark-lost`
(hyphenated past tense). The MVP adds `recovered`, `edit`, `discard`.

| Option | Description | Trade-off |
|---|---|---|
| **Q11-i** ⭐ | **Past-tense hyphenated verbs** — `created`, `assigned`, `returned`, `marked-lost`, `recovered`, `updated`, `discarded` | Consistent and self-describing. Requires a **mapping** from the POC's four historical values (`create → created`, etc.) so old rows read consistently |
| **Q11-ii** | **Keep the POC's bare verbs** — `create`, `assign`, `return`, `mark-lost`, `recover`, `edit`, `discard` | No mapping needed for the four existing values. But `return` as an action label is ambiguous (returning *what*?), and the convention stays inconsistent |
| **Q11-iii** | Noun forms — `registration`, `assignment`, `return`, `loss`, `recovery`, `update`, `discardment` | Reads well in a timeline. Requires a full mapping of all four existing values |

**Recommendation: Q11-i**, with an explicit mapping table recorded in the requirements so
historical rows remain interpretable.

**POC impact:** the four values at `asset-service.js:40,47,68,83,92`; `mark-lost` is the only
non-bare one.

---

### Q12 — Is a discard reason required? *(new — raised by this review)*

Your §MVP-10 says *"Capture a reason where required"* — **which does not say whether it is
required.** This affects D2b directly.

| Option | Description | Trade-off |
|---|---|---|
| **Q12-i** ⭐ | **Yes — a reason is always required for a discard** | A discard permanently removes an asset from active inventory. Without a reason, the record is unexplained. Consistent with D2b resolving the assignment inline |
| **Q12-ii** | **Optional** | Less friction; but most discards will have no reason, so the field becomes decorative |
| **Q12-iii** | Required only when the asset was `assigned` (i.e. only when an assignment is being resolved) | Reflects that the interesting case is the held asset. But produces inconsistent data density |

**Recommendation: Q12-i**, with the same reason vocabulary used for loss (MVP-11) plus
retirement-specific values ("written off", "returned to vendor", "donated", "other").

**POC impact:** none — `discarded` does not exist.

---

## 8. Consolidated decision matrix

| ID | Question | Recommended | Alternatives | Coupled to |
|---|---|---|---|---|---|
| **A** | Serial uniqueness scope | **A-i** — category-scoped + case-insensitive via functional index | A-ii stored normalised col · A-iii app-only · A-iv globally unique | Q10 |
| **B** | Lost asset recovery | **B-ii** — `lost → in-stock` + preserve holder + loss reason | B-i terminal · B-iii `lost → assigned` | D, C, Q4, Q9 |
| **C** | Inventory counting | **C-i** — 5 exclusive buckets + Active Inventory + Total Records, one shared function | C-ii total-includes-discarded · C-iii active-only · C-iv overlapping | Q1, D, B |
| **D** | Lifecycle transitions | **D1a** (returned is a resting state) + **D2b** (assigned→discarded resolves inline) + D3 edges | D1b transient · D2a · D2c · per-edge variants | Q1, B, C |
| **Q1** | Returned vs In Stock | ✅ **APPROVED — D1a** | D1b | D, C, §4.1 amendment |
| **Q2** | Pre-MVP audit rows in the 100% metric | **Q2-i** — excluded, `system` backfill | Q2-ii counted · Q2-iii NULL actor | — |
| **Q3** | `assigned-to` on registration | **Q3-i** — remove | Q3-ii keep as plain field · Q3-iii perform assignment | — |
| **Q4** | Recovery requires a reason | **Q4-ii** — yes | Q4-i no · Q4-iii optional | B |
| **Q5** | CSV injection policy | **Q5-i** — prefix-quote | Q5-ii strip · Q5-iii none · Q5-iv RFC-4180 only | — |
| **Q6** | Is `discarded` recoverable | **Q6-i** — terminal | Q6-ii recoverable | D |
| **Q7** | `in-stock → lost` permitted | **Q7-i** — yes, with reason | Q7-ii no · Q7-iii no reason | D, Q12 |
| **Q8** | Design gate consolidation | **Q8-i** — merge 1+2 and 3+4 | Q8-ii all separate · Q8-iii merge all four | — |
| **Q9** | Lost-asset backfill attempted | **Q9-i** — optional, never fails | Q9-ii no · Q9-iii mandatory | B |
| **Q10** | Pre-existing case-variant duplicates | ✅ **APPROVED IN PRINCIPLE — Q10-iv** + concurrency-safe app check | Q10-i detect-and-abort · Q10-ii detect-and-skip alone · Q10-iii auto-remediate ❌ | A |
| **Q11** | Audit action naming | **Q11-i** — past-tense hyphenated, with mapping | Q11-ii bare verbs · Q11-iii noun forms | — |
| **Q12** | Discard reason required | **Q12-i** — always | Q12-ii optional · Q12-iii conditional | D |

**Confirmation status as of 2026-11-06:** Q1 and Q10 are **APPROVED**. All 15 remaining items (A, B,
C, D1/D2/D3, Q2–Q9, Q11, Q12) remain **PENDING** and are not recorded as requirements. Q10's
approval is *in principle* and is conditioned on the concurrency-safety requirement now documented
in §7.1.6.

---

## 9. Recommended combination and why it is the right fit

**Recommended set: A-i · B-ii · C-i (+ C-i-M1) · D1a + D2b + D3 · Q1=D1a · Q2-i · Q3-i · Q4-ii · Q5-i · Q6-i · Q7-i · Q8-i · Q9-i · Q10-iv · Q11-i · Q12-i**

**Confirmed so far:** Q1 (D1a) and Q10 (Q10-iv, in principle). The remaining 15 items are
recommendations awaiting your confirmation.

### 9.1 Why this combination is the right fit for the MVP

**It makes the product's central promise true.** Your §1.3 core principle is *"Never lose
historical information when an asset changes its state or ownership."* The POC violates this
**twice** — `returnAsset` discards the holder, and `markLost` discards the holder. This combination
fixes both (B-ii, D2b), adds append-only enforcement, and adds a full history view. The MVP's
accountability claims become true of the implementation.

**It closes the reconciliation gap without new architecture.** C-i's shared counting function means
the dashboard, assignee views, list count, and export cannot disagree — the mechanism *is* the
guarantee.

**It is honest about its limits.** A-i's category-scoping blind spot, Q2's exclusion of pre-MVP
history, and Q9's unrecoverable lost-asset holders are all recorded as limitations rather than
papered over.

### 9.2 Why it is not merely "the easiest implementation"

Several recommended options are *harder* than their alternatives, and were chosen anyway:

| Recommended | Easier alternative | Why the harder one wins |
|---|---|---|
| **C-i** (two headline figures) | C-iii (one figure) | C-i answers §2.1's "how many assets exist" under either reading, and makes §24's consistency metric enforceable by construction |
| **D1a** (`returned` is a real state) | D1b (fewer states, simpler code) | D1b leaves a permanently empty card in your own Screen 01 and deletes real meaning |
| **D2b** (resolve assignment inline) | D2a (discard only from unheld states) | D2a forces a **fake return**, corrupting the audit trail an accountability system depends on |
| **B-ii** (recovery + holder preservation) | B-i (terminal, no work) | B-i permanently orphans found assets and creates duplicate records for one physical item |
| **Q10-iv** (application layer + index) | Q10-ii (skip index, DB only) | Q10-ii leaves a **silent hole** — new case-variant duplicates creatable through the app |
| **Q5-i** (prefix-quote) | Q5-iii (raw export) | Q5-iii is a formula-injection vector on user-controlled data |

### 9.3 Combined migration set

| Version | Name | Rebuild? |
|---|---|---|
| 3 | `actor-identity` — create `actors`, add `actor_id` to audit | No |
| 4 | `audit-enrichment` — add `old_values`, `new_values`, backfill actor | No |
| 5 | `audit-integrity` — `ON DELETE CASCADE` → `RESTRICT`, append-only triggers | **Yes** (audit table) |
| 6 | `asset-lifecycle` — add `last_assigned_to`, extend `status` CHECK to 5 values | **Yes** (assets table) |
| 6b | `asset-loss-recovery` *(optional)* — best-effort backfill, never fails | No |
| 7 | `asset-losses` — create `asset_losses` | No |
| 8 | `mvp-indexes` — `idx_assets_assigned_to`, `idx_assets_last_assigned_to`, `idx_assets_created_at`, `idx_assets_updated_at`, `idx_audit_actor`, `idx_audit_created_at`; functional unique index **if** detection is clean | No |

**Two table rebuilds total, on two different tables.** D's rebuild carries `last_assigned_to` and
the `discarded` CHECK together — one rebuild, two changes.

### 9.4 Consolidated impact

| Dimension | Impact |
|---|---|
| **Existing tests modified** | 5 — 2 rewrites (B), 3 extensions (D) |
| **Existing tests unchanged** | 61 |
| **New tests required** | ~60 |
| **POC features preserved** | Registration, list/search/filter/sort, detail view, the four core transition edges, the migration runner, the error-code contract, the intent of all 66 tests |
| **New capabilities** | Actor identity, complete audit history, previous-holder preservation, recovery, reconciliation dashboard, assignee directory, CSV export, editing, discard, loss management, duplicate UX, empty states, counts, pagination, improved search, responsive UI, design system |

---

## 10. Conflicts and dependencies

| # | Item | Nature | Resolution |
|---|---|---|---|
| 1 | **Q1 ↔ C ↔ D** | Q1's answer determines C's bucket count (5 vs 4) and D's transition table. D1a ⇒ 5 buckets; D1b ⇒ the "Returned" card must be deleted from Screen 01 | Settle **Q1 first**. Everything in C and D follows from it |
| 2 | **B ↔ D** | B's `lost → in-stock` edge is part of D's transition table | Settle together; B-ii adds one edge to D's table |
| 3 | **B ↔ C** | Recovery moves an asset between buckets; the shared counting function must reflect it immediately | Covered by C's acceptance criteria (C-T10) and B's |
| 4 | **A ↔ Q10** | Q10 is the migration strategy for A's index | Settle together; Q10-iv depends on A-i |
| 5 | **D2b ↔ Q12** | D2b's discard action needs a reason rule | Settle together |
| 6 | **D3 (`in-stock → lost`) ↔ Q7 ↔ Q4** | The loss-reason rule applies to both loss edges and to recovery | One reason vocabulary, three uses |
| 7 | **D ↔ workbook §4.1** | D1a requires amending §4.1's arrow and §21.1 Scenario 3 | **Mandatory** — the spec and the implementation must not disagree |
| 8 | **C-i ↔ workbook Screen 01** | C-i-M1 adds an "available to assign" metric and a label change | **Mandatory** — Screen 01 must show 6 cards + Active Inventory + a sub-metric |
| 9 | **Q11 ↔ B/D** | The new audit actions (`recovered`, `discarded`, `updated`) need the naming convention | Settle before the audit migration is written |

**No circular dependencies.** The order below is safe:

```
Q1 → D1a/D1b → B ↔ Q4 ↔ Q7 ↔ Q12 → C (+ C-i-M1) → A ↔ Q10
                                    ↓
                            Q2, Q3, Q5, Q6, Q8, Q9, Q11 (parallel)
```

---

## 11. Workbook sections requiring update once decisions are approved

| Workbook location | Current text | Proposed change | Driven by |
|---|---|---|---|
| **§4.1** | `Registration → In Stock → Assigned → Returned → In Stock` | `Registration → In Stock → Assigned → Returned` (a resting state), with `returned → assigned` for reassignment | **Q1 / D1a** |
| **§4.1** | Additional transitions | Add the complete table: `in-stock → assigned, lost, discarded`; `assigned → returned, lost, discarded`; `returned → assigned, lost, discarded`; `lost → in-stock` (recovery); `discarded` terminal | **D, B** |
| **§4.1** | *"Recovery should be considered a separate future workflow unless explicitly included…"* | *"A single `lost → in-stock` recovery transition is included. Complex recovery workflows — partial recovery, credit assignment, dispute handling — remain deferred."* | **B-ii** |
| **§4.1** | *"In Stock → Lost, where operationally appropriate"* | *"In Stock → Lost is permitted, with a required loss reason."* | **Q7-i / D3** |
| **§4.1** | *"Assigned → Discarded only after the assignment is resolved…"* | *"Assigned → Discarded is permitted; the assignment is resolved by the discard itself and recorded in the audit event."* | **D2b** |
| **§4.2.5** | *"The previous assignee is preserved."* | Keep; specify the mechanism — `last_assigned_to` is set on return, loss, and discard; `assigned_to` reflects only the current holder | **B-ii, D2b** |
| **§4.4** | *"Confirm the exact uniqueness policy…"* | *"Serial/key is unique within its category. Comparison ignores letter case and surrounding whitespace; the value as entered is stored and displayed. A serial filed under a different category is not detected as a duplicate — a known limitation."* | **A-i** |
| **§6.1** | Asset fields | Add `last_assigned_to` | **B-ii, D2b** |
| **§6.4** | Loss entity — *"decided during architecture design"* | Decide during Requirements Analysis: a dedicated `asset_losses` table vs. audit metadata | **B-ii** |
| **§6.5** | Database requirements | Add: append-only enforcement; `ON DELETE RESTRICT` on audit; functional unique index on `lower(trim(serial_or_key))`; `last_assigned_to` index | **A-i, B, D** |
| **§9 Screen 01** | Six summary cards | Add "Active Inventory"; label "Returned" as available-for-reassignment; add "available to assign = In Stock + Returned"; distinguish Total Records | **C-i, C-i-M1** |
| **§9 Screen 02** | — | Add assignee, registration-date, last-updated filters; Last Updated + Actions columns; export action | **MVP-14/15/16** |
| **§9 Screen 03** | Registration fields | Remove `assigned-to` | **Q3-i** |
| **§9 Screen 04** | Asset details | Add previous assignee, loss information, discard action, full history link | **B, D** |
| **§9 Screen 10** | Discard dialog | Specify: reason always required; assignment resolved inline when the asset was assigned | **Q12-i, D2b** |
| **§10 Journey 3** | *"Status becomes In Stock"* | *"Status becomes Returned; the asset is available for reassignment. The previous holder is preserved."* | **Q1 / D1a** |
| **§10** | Journey list | Add journeys for recovery, discard, and asset editing | **B, D** |
| **§21.1 Scenario 3** | *"Status becomes In Stock"* | *"Status becomes Returned; the asset is available for reassignment."* | **Q1 / D1a** |
| **§21.1** | Scenario list | Add: recovery from lost; discard with assignment resolution; loss reason recorded; audit actor on every event | **B, D, Q11** |
| **§21.2** | Release gates | Add: "the functional unique index migration never fails on pre-existing conflicts" and "the application rejects case-variant duplicates with or without the index" | **Q10-iv** |
| **§22** | Out of Scope — *"Complex Asset Recovery Workflow"* | Keep deferred, but add a note distinguishing it from the included single recovery transition | **B-ii** |
| **§24** | *"Audit Entries with Actor Attribution: 100%"* | Add: *"…for all events recorded under the MVP. Pre-MVP history is backfilled to a `system` actor and excluded from this metric."* | **Q2-i** |
| **§24** | Metric table | Add: *"CSV Export Formula Safety — 100% of exported cells are safe against spreadsheet formula injection"* | **Q5-i** |
| **§27 (new)** | — | Add **"Inventory Counting Definitions"**: five exclusive buckets; Active Inventory; Total Records; the single shared counting function and filter builder | **C-i** |
| **§27 (new)** | — | Add **"Audit Action Vocabulary"**: the seven actions and the mapping from the POC's four historical values | **Q11-i** |
| **§4.3** | Audit rules | Add the actor-trust rule: *"Actor identity is resolved from trusted server-side context. Actor information supplied in a write request is never trusted."* | **MVP-01** |

---

## 12. What I need from you

### Already confirmed (2026-11-06)

- ✅ **Q1 = D1a.** `Returned` remains a distinct resting state; returned assets remain eligible for
  reassignment; the Returned count stays meaningful; an **Available to Assign = In Stock + Returned**
  metric is added; workbook §4.1 and the dashboard/lifecycle/acceptance criteria are updated; and
  **existing records are not rewritten by the migration**.
- ✅ **Q10 = Q10-iv, approved in principle.** Detect with the normalized comparison; report every
  conflicting group with affected asset IDs and original values; never automatically modify existing
  records; skip functional-index creation when conflicts exist; use the application-level fallback
  and **report the index as skipped** rather than silently treating it as created.
- ✅ **Additional requirement — concurrency safety of the application-level check.** Documented in
  §7.1.6 with six executed configurations, the `IMMEDIATE`-transaction + `busy_timeout` strategy,
  and eight explicitly stated limitations (L1–L8).

### Still needed — a single option letter per remaining item

From §8's matrix: **A, B, C, D1, D2, D3, Q2, Q3, Q4, Q5, Q6, Q7, Q8, Q9, Q11, Q12** — 16 items.
Partial approval is fine: some confirmed, some revised, some left open.

**How the two confirmed decisions constrain the rest:**

- **Q1 = D1a** ⇒ C-i's five-bucket model is confirmed in shape (5 buckets, not 4), and the
  **C-i-M1 mitigation is mandatory**, not optional — the Returned card must be labelled and the
  Available-to-Assign metric added, or the dashboard under-reports availability. §11 lists the
  six affected workbook locations.
- **Q1 = D1a** ⇒ D's transition table must include `returned → assigned` and `returned → lost`,
  and **§4.1's arrow and §21.1 Scenario 3 require amendment** (mandatory — spec and
  implementation must not disagree).
- **Q1 = D1a** ⇒ the workbook's §9 Screen 01 must show the Returned card *and* Active Inventory
  *and* Total Records *and* the Available-to-Assign sub-metric. **C is now effectively
  constrained**, though the exact headline-figure split is still yours.
- **Q10-iv** ⇒ **A must be A-i.** A-iv (globally unique) is incompatible with Q10-iv's
  never-modify-a-record rule, because a pre-existing legal cross-category duplicate would fail the
  rebuild outright. A-i also requires the shared normalization constant (L6).
- **Q10-iv** ⇒ the **application-level check is on the critical path for every registration**,
  whether or not the index exists. The `IMMEDIATE` transaction is therefore required, not optional
  hardening.

**The two I'd most like your attention on next:**

- **B (lost asset recovery)** — the strongest single argument in the review. The POC's
  `markLost` **destroys the previous holder**; the only surviving trace is the prose string
  `"HW" marked as lost.` "Who had it when it went missing" is unanswerable today. B-ii fixes it
  with one transition and one column. B-i is free but permanently orphans found assets.
- **D2b** (`assigned → discarded` resolving the assignment inline) — the recommendation is
  **D2b over D2a specifically because D2a corrupts the audit trail**: it would force an admin to
  record a return for an asset the employee still physically holds. D2b also depends on **Q12**
  (whether a discard always requires a reason).

**Two items I added since the decision brief**, both small but they affect the schema and should be
settled before the audit migration is written: **Q11** (audit action naming — the POC's four values
are inconsistent) and **Q12** (whether a discard always requires a reason — your §MVP-10 says
"where required" without saying what).

---

## Appendix A — Verification commands

All run against throwaway in-memory databases. No persistent database is touched.

**A.1 — Functional index works, and `trim()` is required**
```bash
node -e "
const {openDatabase}=require('./src/db');
const db=openDatabase(':memory:');
db.exec('CREATE UNIQUE INDEX idx_ci ON assets(category, lower(trim(serial_or_key)))');
db.prepare(\"INSERT INTO assets (id,category,name,serial_or_key) VALUES ('a','hardware','A','TP-001')\").run();
try{ db.prepare(\"INSERT INTO assets (id,category,name,serial_or_key) VALUES ('b','hardware','B','tp-001')\").run();
     console.log('ALLOWED'); }catch(e){ console.log('REJECTED', e.code); }
"
```

**A.2 — Index creation fails on pre-existing duplicates (Q10)**
```bash
node -e "
const {openDatabase}=require('./src/db');
const db=openDatabase(':memory:');
db.prepare(\"INSERT INTO assets (id,category,name,serial_or_key) VALUES ('a','hardware','A','TP-001')\").run();
db.prepare(\"INSERT INTO assets (id,category,name,serial_or_key) VALUES ('b','hardware','B','tp-001')\").run();
try{ db.exec('CREATE UNIQUE INDEX idx_ci ON assets(category, lower(trim(serial_or_key)))');
     console.log('created'); }catch(e){ console.log('FAILED:', e.message); }
const dups=db.prepare(\"SELECT category, lower(trim(serial_or_key)) k, COUNT(*) c, group_concat(id) ids FROM assets GROUP BY category,k HAVING c>1\").all();
console.log(JSON.stringify(dups));
"
```

**A.3 — Partial index with a subquery is prohibited**
```bash
# CREATE UNIQUE INDEX ... WHERE id NOT IN (SELECT ...) -> "subqueries prohibited in partial index WHERE clauses"
```

**A.4 — The POC has no application-level case check (why Q10-ii is insufficient)**
```bash
node -e "
const {openDatabase}=require('./src/db');
const repo=require('./src/repositories/assets-repo');
const db=openDatabase(':memory:');
repo.createAsset(db,{category:'hardware',name:'A',serialOrKey:'TP-001'});
db.prepare(\"INSERT INTO assets (id,category,name,serial_or_key,status) VALUES ('b','hardware','B','tp-001','in-stock')\").run();
try{ repo.createAsset(db,{category:'hardware',name:'C',serialOrKey:'Tp-001'});
     console.log('NEW case-variant duplicate: ALLOWED'); }catch(e){ console.log('REJECTED', e.code); }
"
```

**A.5 — Application-level check needs no new index**
```bash
node -e "
const {openDatabase}=require('./src/db');
const db=openDatabase(':memory:');
db.prepare(\"INSERT INTO assets (id,category,name,serial_or_key) VALUES ('a','hardware','A','TP-001')\").run();
db.prepare(\"INSERT INTO assets (id,category,name,serial_or_key) VALUES ('b','hardware','B','tp-001')\").run();
const row=db.prepare(\"SELECT id,name FROM assets WHERE category=? AND lower(trim(serial_or_key))=lower(trim(?)) LIMIT 1\").get('hardware','Tp-001');
console.log(row);
console.log(db.prepare(\"EXPLAIN QUERY PLAN SELECT id FROM assets WHERE category=? AND lower(trim(serial_or_key))=lower(trim(?))\").all('hardware','TP-001'));
"
```

**A.6 — D1a vs D1b dashboard impact**
```bash
# see A.6 in the decision brief appendix; summary:
# D1a -> status after return: 'returned' -> Returned card population: NON-ZERO
# D1b -> status after return: 'in-stock' -> Returned card population: ALWAYS ZERO
```

**A.7 — C's bucket arithmetic and assignee reconciliation**
```bash
node -e "
const {openDatabase}=require('./src/db');
const service=require('./src/services/asset-service');
const db=openDatabase(':memory:');
const ids=[0,1,2,3].map((i)=>service.registerAsset(db,{category:'hardware',name:'L'+i,serialOrKey:'K'+i}).id);
service.assignAsset(db,ids[0],'Alice'); service.assignAsset(db,ids[1],'Bob'); service.returnAsset(db,ids[1]);
console.log(db.prepare('SELECT status, COUNT(*) c FROM assets GROUP BY status').all());
console.log(db.prepare(\"SELECT assigned_to, COUNT(*) c FROM assets WHERE status='assigned' AND assigned_to IS NOT NULL GROUP BY assigned_to\").all());
"
```

**A.8 — Concurrency: the naive check-then-insert races (§7.1.6, configuration 1)**

Eight `node:worker_threads` threads, each with its own connection, all registering `X-1`/`x-1` in
the same category. Reproduce with the harness in §7.1.6, `mode = 'none'`:

```
=== APP-LEVEL CHECK-THEN-INSERT, 8 concurrent workers ===
inserts attempted: 8
conflicts detected: 0
ROWS IN DB (should be 1): 8
RESULT: RACE - DUPLICATE CREATED
```

**A.9 — Concurrency: `IMMEDIATE` transaction + `busy_timeout` closes it (configuration 3)**

Same harness, `mode = 'immediate'`, `busy_timeout = 5000`:

```
=== IMMEDIATE-TRANSACTION check+insert, 8 concurrent workers ===
inserted: 1
conflict: 7
ROWS IN DB (should be 1): 1
RESULT: SAFE (transaction serializes the check+insert)
```

**A.10 — Concurrency: the functional index is structurally race-free (configuration 6)**

Same harness, with `CREATE UNIQUE INDEX ... lower(trim(serial_or_key))` and no app-level check:

```
=== FUNCTIONAL INDEX, 8 concurrent workers (no app-level check) ===
inserted: 1
rejected by constraint: 7
errors: 0
ROWS (should be 1): 1
RESULT: SAFE - DB index is immune to the race
```

**A.11 — The current single-connection topology masks the race (limitation L5)**

100 concurrent requests on the POC's actual topology (one process, one synchronous
`better-sqlite3` connection):

```
=== POC ACTUAL TOPOLOGY: 100 concurrent requests, one synchronous connection ===
inserted: 1
conflict: 99
ROWS (should be 1): 1
RESULT: SAFE within a single process - synchronous driver serializes it
```

The race does not occur here because `better-sqlite3` is fully synchronous and a synchronous
function body cannot be interleaved by the event loop. **This is a property of the topology, not of
the check** — it disappears with a second connection, a second process, or an async driver.

---

## Appendix B — Source reference index

| Concern | Location |
|---|---|
| Transition map | `src/services/asset-service.js:5-10` |
| `assertTransition` | `src/services/asset-service.js:18-26` |
| `registerAsset` (assignee branch) | `src/services/asset-service.js:34-50` |
| `assignAsset` (overwrites `assigned_at`) | `src/services/asset-service.js:52-70` |
| `returnAsset` (clears `assigned_to`) | `src/services/asset-service.js:72-85` |
| `markLost` (clears `assigned_to`) | `src/services/asset-service.js:87-94` |
| Audit action vocabulary | `src/services/asset-service.js:40,47,68,83,92` |
| `ALLOWED_STATUSES` | `src/repositories/assets-repo.js:6` |
| Filter builder (inlined, not reusable) | `src/repositories/assets-repo.js:13-32` |
| Search predicate | `src/repositories/assets-repo.js:17` |
| `createAsset` + duplicate detection | `src/repositories/assets-repo.js:38-78` |
| `validateCreate` | `src/repositories/assets-repo.js:126-132` |
| `updateAsset` (writes all columns) | `src/repositories/assets-repo.js:80-107` |
| `recordAudit` (no actor) | `src/repositories/assets-repo.js:109-114` |
| `latestAuditFor` (`LIMIT 1`) | `src/repositories/assets-repo.js:116-124` |
| Route trimming | `src/routes/assets.js:39-43` |
| Duplicate error rendering | `src/routes/assets.js:50-52` |
| App error handler | `src/app.js:17-24` |
| Migration runner | `src/db/migrate.js:13-70` |
| `addColumnIfMissing` (columns only) | `src/db/migrate.js:35-41` |
| `status` CHECK / UNIQUE / audit FK | `src/db/migrations.sql` |
| Detail view action chain | `views/detail.ejs:25-50` |
| Lost-state dead end | `views/detail.ejs:47-49` |
| List empty row | `views/list.ejs:39-41` |
| Registration form (`assigned-to`) | `views/new.ejs:10-39` |
| Design system (40 lines) | `public/styles.css` |
| Migration-over-legacy test | `tests/db.test.js:59-93` |
| Uniqueness constraint test | `tests/db.test.js:27-32` |
| `assigned → returned` | `tests/asset-service.test.js:65-71` |
| `returned → assigned` | `tests/asset-service.test.js:73-80` |
| `in-stock → returned` rejection | `tests/asset-service.test.js:82-86` |
| `lost` terminal | `tests/asset-service.test.js:88-94` |
| Return-timestamp clearing | `tests/asset-service.test.js:139-147` |
| Returned-state view | `tests/views.test.js:111-123` |
| Lost-state view | `tests/views.test.js:125-137` |
