# Gap Analysis — Asset Tracker POC vs. Asset Tracker MVP

**Subject:** Asset Tracker MVP Workbook (`asset-tracker-mvp`)
**Baseline:** Asset Tracker POC (`aidlc/spaces/default/intents/261004-poc`, workflow complete)
**Analysis date:** 2026-11-06
**Status:** Draft for product owner review — no MVP intent created, no POC code/database/configuration modified

---

## 0. How to read this report

This is a **read-only assessment**. No POC source file, database, or configuration was modified in
producing it. All findings below are backed by either a file/line reference in the POC source or a
command executed against a throwaway in-memory database.

**Evidence conventions used in the tables:**

| Marker | Meaning |
|---|---|
| `file:line` | Direct reference to POC source code |
| `verified` | Behavior confirmed by executing against a live in-memory SQLite DB |
| `absent` | Confirmed to not exist anywhere in the POC codebase |

**Classification vocabulary:**

| Class | Definition |
|---|---|
| **Existing** | Implemented and reusable as-is; MVP requirement adds no change |
| **Modify** | POC functionality exists but its behavior must change to satisfy the MVP |
| **Extend** | POC functionality exists; MVP adds capability alongside it |
| **New** | No POC equivalent; must be built from scratch |

---

## 1. Executive summary

### 1.1 Headline findings

**The POC is a sound foundation, not a throwaway.** It has a clean layered architecture
(route → service → repository → SQLite), a versioned migration runner, an enforced state machine, and
66 passing tests at 93% coverage. Roughly **35–40% of the MVP's foundational work already exists**,
and the pieces that exist are the *hard* architectural ones — the service/repository split, the
migration framework, the error-code contract, and the server-rendered view layer with
`data-testid` hooks that a UI test suite can drive.

**Three findings materially change the MVP plan:**

1. **The POC's `audit_log` schema cannot satisfy MVP-02.** The table has no `actor_id` and no
   `old_values`/`new_values`. It also carries `ON DELETE CASCADE` from `assets`, which *silently
   destroys history* — verified: deleting one asset row removed its audit row. This directly
   violates MVP workbook §4.3.6 ("Asset deletion must not destroy historical audit information") and
   §2.3 ("Never lose historical information"). **This is not an extension — it is a replacement of
   the audit table.**

2. **The POC's `status` CHECK constraint rejects `discarded` at the database level.** Adding the
   MVP's discarded state is not a service-layer change alone; SQLite's `CHECK` on the column
   requires a table rebuild, because `ALTER TABLE ... ADD COLUMN` cannot alter a constraint.

3. **The `in-stock → lost` transition does not exist in the POC.** The MVP workbook §4.1 proposes
   it. The POC's `TRANSITIONS` map does not permit it. Any Requirements Analysis that does not
   explicitly decide this will leave a silent contradiction between the requirements document and
   the code.

### 1.2 Requirement distribution

| Classification | Count | MVP IDs |
|---|---|---|
| **Existing** | 3 | (see §3) — foundational, not directly traceable to a single MVP ID |
| **Modify** | 4 | MVP-01, MVP-02, MVP-03, MVP-12 |
| **Extend** | 4 | MVP-04, MVP-06, MVP-07, MVP-16 |
| **New** | 6 | MVP-05, MVP-08, MVP-09, MVP-10, MVP-11, MVP-13, MVP-14, MVP-15, MVP-17 |
| **Total MVP IDs mapped** | **17** | MVP-01 … MVP-17 |

> The "Existing" count (3) is deliberately understated. Registration (FR1), list/search/filter/sort
> (FR2), and the detail view (FR3) are fully implemented and are the substrate for MVP-09, MVP-12,
> MVP-16 and MVP-17. They are classified as *Modify*/*Extend* against their MVP IDs because the MVP
> requirement changes how that substrate behaves, even though the substrate itself survives.

### 1.3 Effort read

The critical path in the workbook is correct, and the POC has already absorbed some of the
up-front cost the roadmap attributed to Weeks 4–5:

| Workbook week | Roadmap activity | POC reality |
|---|---|---|
| Week 4 | Actor context, audit events, history, assignment lifecycle | Actor + audit + history are **net-new table work** — no POC substrate. Assignment lifecycle partially exists. |
| Week 5 | Dashboard, assignee drill-down, aggregation, CSV export | **Fully net-new.** No aggregation, counting, or export code exists in the POC. |
| Week 6 | Editing, discard, loss, duplicate UX, search/filter | Search/filter exist. Editing, discard, loss are net-new. |

**Net assessment:** the 6–8 week estimate is **achievable only if** the design workstream in
§17 is scoped to the screens actually needed (see §7.4) and the four unresolved decisions in §6 are
settled before Stage 2 sign-off. Unresolved uniqueness policy alone can invalidate a migration.

---

## 2. POC baseline — verified inventory

### 2.1 Source modules

| File | Lines | Responsibility | MVP disposition |
|---|---|---|---|
| `src/server.js` | 22 | Process entry, opens DB, starts HTTP listener | **Modify** — needs actor-session bootstrap |
| `src/app.js` | 28 | Express app, view engine, `/assets` router mount, error handler | **Modify** — needs actor middleware, dashboard/assignee/activity routers, new error codes |
| `src/routes/assets.js` | 93 | 7 route handlers: list, new-form, create, detail, assign, return, lost | **Modify** — add edit/discard/history/export routes; actor injection |
| `src/services/asset-service.js` | 114 | `TRANSITIONS` map, `assertTransition`, 4 mutations, audit write | **Modify** — new states, new transitions, actor params, edit/discard ops |
| `src/repositories/assets-repo.js` | 144 | CRUD, filtered list, audit write/latest, validation | **Modify** — audit table replacement, counting/aggregation queries, `last_assigned_to` |
| `src/db/index.js` | 20 | Opens DB, WAL + FK pragmas, applies migrations | **Existing** — reusable as-is |
| `src/db/migrate.js` | 72 | Versioned migration runner, `schema_migrations` ledger | **Existing** — reusable, extend with new versions |
| `src/db/migrations.sql` | 45 | Base schema (`assets`, `audit_log`, 3 indexes) | **Modify** — base schema must be superseded |

### 2.2 Route surface (verified: `src/routes/assets.js`)

```
GET  /assets              → list.ejs      (q, category, status, sort, dir)
GET  /assets/new          → new.ejs
POST /assets              → create, redirect /assets
GET  /assets/:id          → detail.ejs
POST /assets/:id/assign   → assign
POST /assets/:id/return   → return
POST /assets/:id/lost     → mark lost
```

App-level (`src/app.js`): `GET /` → 302 `/assets`; `/static` → `public/`; central error handler
mapping `DUPLICATE_ASSET | VALIDATION_ERROR | INVALID_TRANSITION | NOT_FOUND` → 400/404.

**Total: 7 asset routes. The MVP needs ~20+.**

### 2.3 Current data model (verified against live schema)

**`assets`**
```
id              TEXT PRIMARY KEY
category        TEXT NOT NULL CHECK (category IN ('hardware','software-license'))
name            TEXT NOT NULL
serial_or_key   TEXT NOT NULL
model           TEXT
notes           TEXT
status          TEXT NOT NULL CHECK (status IN ('in-stock','assigned','returned','lost'))
assigned_to     TEXT
assigned_at     TEXT            (added by migration v2)
returned_at     TEXT            (added by migration v2)
created_at      TEXT NOT NULL
updated_at      TEXT NOT NULL
UNIQUE (category, serial_or_key)
```

**`audit_log`**
```
id          INTEGER PRIMARY KEY AUTOINCREMENT
asset_id    TEXT NOT NULL FK → assets(id) ON DELETE CASCADE
action      TEXT NOT NULL
description TEXT NOT NULL
created_at  TEXT NOT NULL
```

**Indexes:** `sqlite_autoindex_assets_1`, `sqlite_autoindex_assets_2` (auto, from PK + UNIQUE),
`idx_audit_asset_recent (asset_id, id DESC)`, `idx_assets_status`, `idx_assets_category`.

**No `actors` table. No `asset_losses` table. No `assigned_at`/`returned_at` index. No `actor_id`
anywhere.**

### 2.4 Current state machine (verified: `src/services/asset-service.js:5-10`)

```js
const TRANSITIONS = {
  'in-stock': new Set(['assigned']),
  assigned:   new Set(['returned', 'lost']),
  returned:   new Set(['assigned', 'lost']),
  lost:       new Set([]),          // terminal
};
```

`assertTransition` (`:18-26`) throws `INVALID_STATE` for an unknown source state and
`INVALID_TRANSITION` for a disallowed edge.

### 2.5 Test suite (verified: 66 tests, 5 files)

| File | Tests | Focus |
|---|---|---|
| `tests/asset-service.test.js` | 18 | State machine, timestamps, audit-per-transition |
| `tests/assets-repo.test.js` | 15 | CRUD, filters, sort, duplicate, audit |
| `tests/routes.test.js` | 14 | HTTP contract, status codes, redirects |
| `tests/views.test.js` | 12 | Rendering, state-appropriate action forms |
| `tests/db.test.js` | 7 | Schema, constraints, migration idempotence |

**Coverage:** 93.38% stmts / 83.33% branch / 96.42% funcs. `src/server.js` = 0% by design.

### 2.6 UI baseline

| Asset | State |
|---|---|
| `views/_layout.ejs` | 15 lines — HTML shell, `<main class="container">` |
| `views/_header.ejs` | 14 lines — topbar, brand link, single "New asset" button |
| `views/list.ejs` | 53 lines — filter form + 5-column table + empty row |
| `views/new.ejs` | 39 lines — 6-field form, error block, submit |
| `views/detail.ejs` | 52 lines — 10-field `<dl>`, 1 audit entry, state-conditional action forms |
| `views/error.ejs` | 4 lines — error title + message |
| `public/styles.css` | **40 lines** — 17 class names, no CSS custom properties, no tokens |

**Design system baseline: effectively none.** The workbook §11 requires semantic color tokens,
a typography scale, spacing tokens, radius/shadow scales, and a light theme with dark-theme
extension. The POC has a single 40-line stylesheet with no variables. This is a **full
ground-up design system build**, not an extension of an existing one.

---

## 3. Requirement traceability matrix

Legend: **E**=Existing · **M**=Modify · **X**=Extend · **N**=New

### 3.1 Round 1 — Establish Trustworthy Asset Data (P0)

| MVP ID | Class | POC evidence | Gap to close | Risk |
|---|---|---|---|---|
| **MVP-01** Actor Identity | **M** | No actor concept anywhere. `recordAudit(db, assetId, action, description)` — `src/repositories/assets-repo.js:109-114` has no actor parameter. No session/cookie middleware in `src/app.js:7-15`. | Add `actors` table; add `actor_id` to audit rows; establish server-side actor context (session/cookie) resolved per-request; thread actor into every service mutation. **Per workbook: actor must come from trusted server-side context, never from the write request body.** | **High** — the workbook explicitly forbids trusting request-supplied actor. A naive `req.body.actor_id` implementation violates a stated hard constraint. |
| **MVP-02** Complete Audit History | **M** | `latestAuditFor` (`assets-repo.js:116-124`) returns `LIMIT 1`. `audit_log` has no `actor_id`, no `old_values`/`new_values`. `views/detail.ejs:16-23` renders exactly one entry. No `/assets/:id/history` route. | Replace/extend audit table with `actor_id`, `old_values`, `new_values`; add full-history query; add `/assets/:id/history` route + view; render all events newest-first; make append-only (see §5.1). | **High** — requires table migration, not just a new query. |
| **MVP-03** Preserve Previous Assignee | **M** | `returnAsset` (`asset-service.js:72-85`) sets `assigned_to: null` and **discards the previous holder**. `assigned_at` is overwritten on re-assign (`:61-67`), so the prior assignment timestamp is also lost. `assigned_to` is a free-text `TEXT` column with no index. | Add `last_assigned_to` column; on return set `last_assigned_to = assigned_to` then clear `assigned_to`; preserve prior assignment timestamp; offer previous assignee as reassignment suggestion. | **Medium** — also exposes the state-machine question in §6.2 (does `returned` become `in-stock`?) |
| **MVP-04** Assignee Consistency | **X** | `assignAsset` accepts any non-empty string (`asset-service.js:53-55`). `validateCreate` (`assets-repo.js:126-132`) does not validate assignee at all. No known-assignee lookup exists. | Provide known-assignee listing + autocomplete (datalist); stable assignee identifiers where supported; reduce inconsistent name spellings. | **Medium** — "stable identifiers" is a data-model decision that interacts with §6.1 and MVP-01. |

### 3.2 Round 2 — Reconciliation and Visibility (P0)

| MVP ID | Class | POC evidence | Gap to close | Risk |
|---|---|---|---|---|
| **MVP-05** Reconciliation Dashboard | **N** | No dashboard route, view, or aggregation. `app.get('/')` → 302 `/assets` (`src/app.js:14`). No counting queries anywhere. | New dashboard route + view; summary cards (total/in-stock/assigned/returned/lost/discarded); status distribution; assignee distribution; recently modified; recent activity; quick actions. | **Medium** — bulk of the work is new; risk is in count-consistency semantics (§6.3) |
| **MVP-06** Assignee Details | **N** | `assigned_to` stored and displayed as a table cell (`views/list.ejs:48`) but **never aggregated or grouped**. No assignee route or view. | Assignee directory (name, assigned count, last activity); per-assignee detail listing current holdings only; link assets to detail. | **Low** |
| **MVP-07** Asset Status Summary | **X** | `listAssets` filters by `status` but there is **no aggregate count by status**. `ALLOWED_STATUSES` (`assets-repo.js:6`) = 4 statuses; MVP needs 5 (add `discarded`). | `COUNT(*) GROUP BY status`; exclude discarded from active totals; distinguish lost from available; keep counts consistent with list queries. | **Medium** — depends on §6.3 definitions |
| **MVP-08** CSV Export | **N** | No export code, no `res.attachment`/`text/csv` usage anywhere. `listAssets` returns full rows — reusable as the export source. | New export route; export the *currently filtered* dataset; correct CSV escaping (commas, quotes, newlines in `notes`); appropriate download feedback. | **Medium** — CSV injection (values beginning with `=`, `+`, `-`, `@`) is an injection vector worth an explicit decision |

### 3.3 Round 3 — Complete Asset Lifecycle Management (P1)

| MVP ID | Class | POC evidence | Gap to close | Risk |
|---|---|---|---|---|
| **MVP-09** Edit Asset | **N** | `updateAsset` (`assets-repo.js:80-107`) **exists in the repository** but is called only from `assignAsset`/`returnAsset`/`markLost` as a lifecycle patch. There is **no edit route, no edit form, no edit service function**. | New `POST /assets/:id/edit` route; edit service function with field-level validation; audit event recording old→new values per changed field (workbook §21.1 Scenario 5). **Partial reuse of `updateAsset`** — but it currently writes *all* columns unconditionally, which is unsuitable for a partial-field edit. | **Medium** — `updateAsset` writes every column from a merged object; naive reuse for a 2-field edit would clobber concurrent changes to other fields. |
| **MVP-10** Discard Asset | **N** | `discarded` absent from `ALLOWED_STATUSES` (`assets-repo.js:6`) and from the DB `CHECK` constraint. No discard route/view. `TRANSITIONS` has no `discarded` source. | Add `discarded` status to the enum + DB constraint; add transitions per §6.4; discard route + confirmation dialog + reason capture; exclude from active counts; never hard-delete. | **High** — requires SQLite table rebuild for the `CHECK` constraint (§5.2) |
| **MVP-11** Loss Management | **X** | `markLost` (`asset-service.js:87-94`) sets status and writes a generic audit line with **no reason and no description**. `ACTION_DESCRIPTIONS.markLost` (`:15`) is a fixed string. No `asset_losses` table. | Capture loss reason (damaged/stolen/not-returned/written-off/other) + optional description + reporter + timestamp; store; display on detail view. Decide dedicated table vs. audit metadata (workbook §6.4 defers this). | **Medium** — also depends on §6.2 (recovery) and on `in-stock → lost` (§6.4) |
| **MVP-12** Duplicate Detection UX | **M** | Uniqueness **is** enforced — `UNIQUE (category, serial_or_key)` (`migrations.sql`). `createAsset` catches the constraint violation and throws `DUPLICATE_ASSET` with message *"An asset with this category and serial-or-key already exists."* (`assets-repo.js:69-76`). The route renders a flat error string (`src/routes/assets.js:50-52`). | Identify the *conflicting asset* and surface its id/name/category; provide a link to it; improve field-level error presentation. **Requires a lookup on the duplicate path** — currently the catch block does not query for the existing row. | **Low** — behavior exists; only the error surface changes |

### 3.4 Round 4 — Usability and Scale Readiness (P1)

| MVP ID | Class | POC evidence | Gap to close | Risk |
|---|---|---|---|---|
| **MVP-13** Empty States | **X** | `views/list.ejs:40` renders a bare `<td class="empty">No assets yet.</td>` — text only, no guidance, no call-to-action. No distinct "no search results" state (a filtered-empty result renders the identical string as a genuinely-empty database). | Distinct empty states for (a) no assets at all — with registration CTA, (b) no results for current filters — with filter-clear action. | **Low** |
| **MVP-14** Result Counts | **N** | No count of any kind rendered. `listAssets` returns an array; the total is `assets.length` in the view but is not displayed. | Display total asset count and filtered-result count, consistent with filters. | **Low** |
| **MVP-15** Pagination | **N** | `listAssets` (`assets-repo.js:13-32`) has **no `LIMIT`/`OFFSET`** — unbounded `SELECT *`. | Server-side `LIMIT`/`OFFSET`; preserve filters and sort across pages; display pagination control. | **Medium** — a `COUNT(*)` companion query is needed for the control; must stay consistent with the filtered list |
| **MVP-16** Improved Search | **X** | `listAssets` searches `LOWER(name) LIKE ? OR LOWER(serial_or_key) LIKE ?` (`assets-repo.js:17`) — **name and serial only**. No model, no assignee. | Extend search to name, model, serial/key, and assignee. | **Low** — note `assigned_to`/`last_assigned_to` will need indexes for acceptable performance |
| **MVP-17** Responsive UI | **N** | `public/styles.css` is 40 lines with **no media queries** and no breakpoints. `views/list.ejs:28-53` is a fixed 5-column `<table>` with no mobile alternative. | Desktop/tablet/mobile breakpoints; collapsible nav; stacked cards; table alternatives on mobile. | **Medium** — a `<table>` with 8 columns (MVP §Screen 02) has no usable mobile layout without restructuring |

---

## 4. Data model impact

### 4.1 Target entities (workbook §6, reconciled with POC reality)

| Entity | Status | Notes |
|---|---|---|
| `assets` | **Modify** | Add `last_assigned_to`; add `discarded` to `status` enum; add `assigned_at`/`returned_at` (already present); consider `assigned_to` normalization |
| `actors` | **New** | `id`, `display_name`, `created_at`. Referenced by `audit_log.actor_id` |
| `audit_log` → `audit_events` | **Replace** | Current table lacks `actor_id`, `old_values`, `new_values`; carries destructive `ON DELETE CASCADE`; not append-only |
| `asset_losses` | **New (decision pending)** | `id`, `asset_id`, `reason`, `description`, `reported_by`, `created_at`. Workbook §6.4 explicitly defers the table-vs-audit-metadata decision |
| `schema_migrations` | **Existing** | Reusable; new versions append |

### 4.2 Audit table — the highest-impact schema change

Current definition (`src/db/migrations.sql`):
```sql
CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  asset_id TEXT NOT NULL,
  action TEXT NOT NULL,
  description TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (...),
  FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE
);
```

**Three distinct deficiencies against MVP-02 + workbook §4.3:**

1. **No actor.** Cannot satisfy "every event must identify an actor" (§4.3.2) or MVP-01.
2. **No old/new values.** Cannot satisfy "changes should preserve old and new values where
   relevant" (§4.3.4) or workbook Scenario 5 ("Previous and new values recorded").
3. **`ON DELETE CASCADE` violates the core product principle.** *Verified:* one audit row existed
   after registration; after `DELETE FROM assets WHERE id = ?`, the count was `0`. The audit
   history was destroyed by the delete.

**The MVP has no hard-delete path** (MVP-10: "Never hard-delete the asset"), so the cascade would
never fire through the app — but it remains a live schema-level landmine, and §4.3.6 explicitly
requires that deletion *must not* destroy historical audit information. A future ad-hoc
`DELETE` (support script, DBA action, a bug in a new code path) silently erases history.

**Recommendation:** rebuild the audit table with `ON DELETE RESTRICT` (or no FK action) and
enforce append-only with triggers. See §5.3.

### 4.3 Required index additions

Workbook §6.5 requires indexes on `asset_id`, `actor_id`, `created_at`, `status`, `assigned_to`.

| Index | Status | Purpose |
|---|---|---|
| `idx_audit_asset_recent (asset_id, id DESC)` | **Exists** | Asset history — reusable |
| `idx_assets_status` | **Exists** | Status filter — reusable |
| `idx_assets_category` | **Exists** | Category filter — reusable |
| `idx_audit_actor` | **New** | Actor filtering (MVP-02, §Screen 08) |
| `idx_audit_created_at` | **New** | Date-range filtering (MVP-02) |
| `idx_assets_assigned_to` | **New** | Assignee filter + assignee aggregation (MVP-06, MVP-07, MVP-16) |
| `idx_assets_last_assigned_to` | **New** | Previous-holder lookup (MVP-03) |
| `idx_assets_created_at` | **New** | Registration-date filter/sort (MVP-14, MVP-16) |
| `idx_assets_updated_at` | **New** | Last-updated filter + "recently modified" (MVP-05) |

**Note on the existing search:** `LOWER(name) LIKE '%q%'` is a leading-wildcard `LIKE` that SQLite
cannot serve from a B-tree index. The POC's own build-and-test analysis records this
(`EXPLAIN QUERY PLAN` → `SCAN assets` + temp B-tree). MVP-16 widens the search surface to four
fields, which *increases* the cost of an unindexed scan. At MVP data volumes this is acceptable,
but it should be an explicit, recorded acceptance rather than an oversight.

### 4.4 Migration sequencing

The existing migration runner (`src/db/migrate.js:53-70`) is sound: it records applied versions in
`schema_migrations`, wraps each migration in a transaction, and is idempotent. `tests/db.test.js:59-93`
already proves a legacy database migrates in place without data loss. **This runner is directly
reusable for the MVP migration set** — a genuine asset.

Indicative migration sequence (versions 3+):

| Version | Name | Operation |
|---|---|---|
| 3 | `actor-identity` | Create `actors`; add `actor_id` to `audit_log` (nullable first, backfill, then constraint) |
| 4 | `audit-event-enrichment` | Add `old_values`, `new_values`; backfill `actor_id` for historical rows with a "system" actor |
| 5 | `audit-append-only` | Replace `ON DELETE CASCADE` with `RESTRICT`; add append-only triggers |
| 6 | `asset-lifecycle-columns` | Add `last_assigned_to`; populate from `assigned_to` where status is `returned` |
| 7 | `asset-status-discarded` | **Table rebuild** to extend the `status` CHECK constraint |
| 8 | `asset-losses` | Create `asset_losses` table (if §6.2/§6.4 decisions favour a dedicated entity) |
| 9 | `mvp-indexes` | Create the new indexes from §4.3 |

**Migration 7 is the hard one.** SQLite cannot `ALTER` a `CHECK` constraint. Extending
`status IN ('in-stock','assigned','returned','lost')` to include `'discarded'` requires the
standard **table-rebuild** procedure: create new table → copy rows → drop old → rename → recreate
indexes. This must preserve every row, including `assigned_at`/`returned_at` and the audit
foreign key. The existing `addColumnIfMissing` helper (`migrate.js:35-41`) does **not** cover this
case — it only adds columns. A table-rebuild helper is new code and needs its own test against a
populated legacy database.

### 4.5 Backfill considerations

- Historical `audit_log` rows have **no actor**. MVP-01 requires every event to identify an actor,
  and workbook §24 targets "100% of audit entries with actor attribution." A backfill to a
  `system`/`unknown` actor satisfies the schema but arguably not the *spirit* of the metric.
  **This must be stated explicitly in Requirements Analysis** — whether pre-MVP history counts
  toward the 100% metric is a product decision.
- Existing `returned` assets have `assigned_to = NULL` (cleared at return) and therefore **no
  recoverable previous holder**. The `last_assigned_to` backfill can only populate from currently
  assigned assets. Pre-MVP return history is **not recoverable** from the POC schema — the
  information was never stored. This is a genuine, permanent data gap, not a migration defect.

---

## 5. Business rule conflicts

### 5.1 Audit integrity — POC vs. workbook §4.3

| Workbook rule | POC behavior | Status |
|---|---|---|
| §4.3.1 Every mutation must generate an audit event | Satisfied for create/assign/return/mark-lost (`asset-service.js:40,68,83,92`) | **Compliant today**, but the audit shape is insufficient |
| §4.3.2 Every event must identify an actor | No actor field | **Conflict** |
| §4.3.3 Every event must have a timestamp | `created_at` with DB default | **Compliant** |
| §4.3.4 Preserve old and new values | Only a prose `description` string | **Conflict** |
| §4.3.5 Historical events must not be editable through normal operations | No UPDATE/DELETE path for audit rows in application code | **Compliant by absence of a path** — but not *enforced* |
| §4.3.6 Deletion must not destroy historical audit information | `ON DELETE CASCADE` — **verified to destroy it** | **Direct conflict** |

### 5.2 Lifecycle conflicts (workbook §4.1 vs. POC `TRANSITIONS`)

**Verified delta:**

| Transition | Workbook §4.1 | POC | Action |
|---|---|---|---|
| `in-stock → assigned` | Yes | **Yes** | — |
| `assigned → returned` | Yes | **Yes** | — |
| `returned → assigned` | Yes (reassignment) | **Yes** | — |
| `assigned → lost` | Yes | **Yes** | — |
| `returned → lost` | Implied | **Yes** | — |
| `in-stock → lost` | **Yes** ("where operationally appropriate") | **No** | **Add** |
| `in-stock → discarded` | **Yes** | **No** | **Add** |
| `assigned → discarded` | **Yes** (conditional: "only after the assignment is resolved or an explicitly approved retirement process") | **No** | **Add, with the conditional rule encoded** |
| `returned → discarded` | Implied | **No** | **Add (confirm)** |
| `lost → …` | **Unresolved** — recovery deferred | Terminal (`TRANSITIONS.lost = ∅`) | **Decide — §6.2** |
| `discarded → …` | Terminal | **Absent entirely** | **Add as terminal** |

### 5.3 The `returned` → `in-stock` question

The workbook §4.1 describes the lifecycle as **"Registration → In Stock → Assigned → Returned →
In Stock"** — i.e. a return puts the asset *back in stock*. But the POC's `returned` is a
**distinct, persistent state** with its own filter option and its own UI colour
(`status-returned` in `public/styles.css`), and the workbook's own MVP-07 lists **"Returned"** as a
separate dashboard summary card alongside "In Stock."

**These two models are mutually exclusive.** The POC treats `returned` as a resting state; the
workbook's lifecycle arrow treats it as a waypoint that immediately becomes `in-stock`. The same
conflict appears in workbook §4.2.2 ("A returned asset becomes available for reassignment") and
§21.1 Scenario 3 ("Status becomes In Stock").

**Impact if unresolved:** the dashboard's "In Stock" and "Returned" counts would never both be
meaningful; MVP-03's `last_assigned_to` semantics change; the list filter set changes; existing
POC tests at `tests/asset-service.test.js:65-71` assert `status === 'returned'` and would need
rewriting. **This must be decided in Requirements Analysis — it is not a code detail.**

### 5.4 Duplicate rules (workbook §4.4)

Workbook §4.4 says: *"The approved POC uniqueness rules should be retained"* and then proposes
`UNIQUE(category, serial_or_key)` — the same rule the POC already implements — but then asks
Requirements Analysis to *"Confirm the exact uniqueness policy… especially whether identifiers are
globally unique or category-specific."*

**These two statements are in tension.** "Retain the approved POC rules" implies category-scoped;
the confirmation question implies the answer is not known. See §6.1.

**Verified POC behavior:**
- Same serial + different category → **allowed**
- Same serial + same category → **rejected** (`DUPLICATE_ASSET`)
- `TP-001` vs `tp-001` → **allowed** (the constraint is case-sensitive; only the *search* is
  case-insensitive)

### 5.5 Assignment rules (workbook §4.2)

| Rule | POC behavior | Status |
|---|---|---|
| §4.2.1 In-stock asset can be assigned | Yes | **Compliant** |
| §4.2.2 Already-assigned asset cannot be assigned again without resolving the assignment | `TRANSITIONS.assigned` = `{returned, lost}` — assign is blocked. **However** `returned → assigned` *is* allowed and `assignAsset` **overwrites** `assigned_to` without recording who held it before. | **Partial conflict** — the previous holder is silently overwritten (resolved by MVP-03) |
| §4.2.3 Assigned asset can be returned | Yes | **Compliant** |
| §4.2.4 Returning clears current assignee | Yes (`assigned_to: null`) | **Compliant** |
| §4.2.5 Previous assignee is preserved | **No** — discarded | **Conflict** (MVP-03) |
| §4.2.6 Returned asset available for reassignment | Yes | **Compliant** |
| §4.2.7 Every assignment and return generates an audit event | Yes | **Compliant** |

### 5.6 Registration semantics — resolved in the POC, worth preserving

The POC deliberately made registration **always** create in `in-stock`, with an optional assignee
stored as a plain field that does **not** trigger an assignment
(`src/repositories/assets-repo.js:49-52`, `src/services/asset-service.js:35-38`). This was a
deliberate correction made during the POC's code-generation stage, and the workbook's
Screen 03 lists **only** Name, Category, Serial/Key, Model, Notes as fields — *no assignee field*.

**Recommendation:** Requirements Analysis should formally retire the `assigned-to` registration
field. The POC still accepts it (`views/new.ejs:31-33`), and the MVP's Screen 03 does not include
it. Leaving it would create a field that stores an assignee on an in-stock asset — exactly the
ambiguity MVP-03 exists to remove.

---

## 6. Unresolved requirements for Requirements Analysis

> These four decisions are **deliberately not assumed** in this analysis. Each is presented with
> the evidence, the options, and the downstream consequences of each, so the decision can be made
> with full sight of its cost.

### 6.1 Decision A — Serial/key uniqueness scope

**The question.** Is `serial_or_key` unique **globally**, or unique **within each category**?

**Evidence — what the POC does (verified):**
- `UNIQUE (category, serial_or_key)` — `src/db/migrations.sql`
- Same serial + different category → **allowed**
- Same serial + same category → **rejected**
- Case-sensitive: `TP-001` and `tp-001` coexist

**Options:**

| Option | Behaviour | Consequence |
|---|---|---|
| **A1 — Category-scoped** (POC current) | `UNIQUE(category, serial_or_key)` | No migration. Matches workbook §4.4 "retain the approved POC rules". Permits `hardware:123` and `software-license:123`. Requires the user to pick the right category — a serial misfiled under the wrong category will not be caught. |
| **A2 — Globally unique** | `UNIQUE(serial_or_key)` | **Requires table rebuild** (dropping a composite UNIQUE and adding a single-column UNIQUE). Prevents mis-filing as a duplicate. But a legitimate same-key-in-two-categories case becomes an error. Riskier migration. |
| **A3 — Category-scoped + normalized** | A1, plus case/whitespace-normalized comparison | Stronger duplicate detection without a constraint change. Requires a stored normalized column or a functional index. Introduces a new column and normalization rules to define. |

**Related sub-question (also unresolved): case sensitivity.** Currently `TP-001` ≠ `tp-001`. A
licence key is routinely pasted in different case; a laptop serial usually isn't. Does the MVP
treat these as the same asset?

**Downstream affected:** MVP-12 duplicate UX, the migration set, `validateCreate`
(`assets-repo.js:126-132`), and the `DUPLICATE_ASSET` error path.

### 6.2 Decision B — Lost asset recovery

**The question.** Is `lost` terminal, or can a lost asset be recovered and re-entered into
circulation?

**Evidence — what the POC does (verified):**
- `TRANSITIONS.lost = new Set([])` — `src/services/asset-service.js:9` — strictly terminal
- `tests/asset-service.test.js:88-94` asserts a transition out of `lost` throws `INVALID_TRANSITION`
- `views/detail.ejs:47-49` renders "This asset is marked lost and cannot be transitioned." and
  **no action forms**
- The POC's own FR4.5 declares `lost` terminal

**Evidence — what the workbook says:**
- §4.1 lists `lost → …` as **not specified**; the loss bullet in §2.1 says *"Recovery should be
  considered a separate future workflow unless explicitly included in approved requirements."*
- §22 Out of Scope: *"Complex Asset Recovery Workflow — Defer"*
- §21.1 Scenario 6 asserts only `Status becomes Lost` — no recovery scenario exists

**Options:**

| Option | Behaviour | Consequence |
|---|---|---|
| **B1 — Lost stays terminal** (POC current) | No transition out of `lost` | Simplest. Matches §22. But then a laptop found in a drawer after being written off is *permanently* invisible to inventory — it can never re-enter circulation. The only remedy is a new asset record, which orphans the history. |
| **B2 — `lost → in-stock`** | A recovery action returns it to stock | Enables the realistic "found it" case. Requires: a transition, a recovery audit event, a rule for whether `last_assigned_to` is cleared (probably not — the history should stand), and a UI action on a state that currently renders no actions. |
| **B3 — `lost → assigned`** | A recovered asset goes straight back to a holder | Combines recovery and reassignment in one step. More complex; probably unnecessary for the MVP. |

**Recommendation to consider:** **B2** (`lost → in-stock`) with a distinct `recovered` audit
action. It is a single well-scoped transition that closes a genuine operational hole, while
keeping the "complex asset recovery workflow" (partial recovery, credit assignment, dispute
handling) out of scope per §22.

**Downstream affected:** `TRANSITIONS`, the `status` enum, the detail view's action block, the
audit action vocabulary, the loss entity (§6.3/§6.4 of the workbook), MVP-11, and the §21.1
scenario list.

### 6.3 Decision C — Inventory counting definitions

**The question.** What does "total assets" mean, and which counts exclude `discarded`?

**The ambiguity, stated precisely.** The workbook asks in §2.1 that an admin can determine *"How
many assets exist"*, and separately in MVP-07 that *"discarded assets [are] excluded from normal
active inventory totals"* and *"distinguish lost assets from available assets."* So there are at
least three distinct quantities:

1. **Total records** — every row in `assets`, including discarded
2. **Active inventory** — total records minus discarded
3. **Available / in-stock** — assets that can be assigned right now

**The trap.** The workbook's Screen 01 lists **six** summary cards: Total Assets, In Stock,
Assigned, Returned, Lost, Discarded. If "Total Assets" is read as quantity (1) while "In Stock +
Assigned + Returned + Lost" is quantity (2), the cards will **not sum to the total** — and there
is no stated rule saying which the "Total Assets" card shows. A dashboard whose numbers don't add
up destroys trust in every other number on the page.

**Related open question — where does `returned` sit?** If a returned asset is simultaneously
"returned" and "in stock" (§5.3), it may need to appear in both cards, breaking mutual
exclusivity of the status cards entirely.

**Options:**

| Option | Definition | Consequence |
|---|---|---|
| **C1 — Exclusive buckets** | One status per asset; the six cards partition the population; "Total Assets" = sum of the five status cards, and discarded is shown separately and excluded from "active inventory" | Cards always sum correctly. Requires exactly one status per asset (guaranteed by the current schema). Requires resolving §5.3 so `returned` is a distinct bucket. |
| **C2 — Total = all records** | "Total Assets" = every row including discarded | Simpler to compute. Cards visibly do not sum to total. Must be explained in the UI, which is fragile. |
| **C3 — Total = active only** | "Total Assets" excludes discarded; discarded has its own card | Cards sum correctly *if* discarded is excluded from the total. Matches "active inventory" language in MVP-07. |

**Also requires a decision:** does CSV export (MVP-08) honour the same definition as the
dashboard, and does it include discarded rows? The workbook §3 Round 2 says the export must
"respect the selected dataset" — but the dataset definition depends on this decision.

**Recommendation to consider:** **C1 + C3 combined** — one exclusive status bucket per asset,
"Total Assets" = sum of the five status cards, and a clearly-labelled "Active Inventory"
secondary figure that excludes discarded. Then the dashboard, the assignee counts, and the CSV
export all read from **one** shared counting function, guaranteeing consistency (workbook §24:
"Dashboard Count Consistency 100%").

**Downstream affected:** MVP-05, MVP-06, MVP-07, MVP-08, MVP-14, §21.1 Scenarios 7 and 10, §24.

### 6.4 Decision D — Lifecycle transitions

**The question.** Which transitions are valid in the MVP, and is `returned` a resting state or a
waypoint to `in-stock`?

This bundles two distinct sub-decisions that interact:

**D1 — Is `returned` a distinct state or a transient marker?**

The workbook §4.1 says `Returned → In Stock`. §4.2.6 says "A returned asset becomes available for
reassignment". §21.1 Scenario 3 says "Status becomes In Stock". But MVP-07 lists "Returned" as its
own dashboard card, and the POC treats `returned` as a resting state with its own filter and UI
treatment.

- **D1a — `returned` is a distinct resting state** (POC current): the dashboard's "Returned" card
  is meaningful; "available for reassignment" is expressed by the *available actions*, not the
  status. Requires the workbook's "→ In Stock" phrasing to be reinterpreted.
- **D1b — `returned` is transient; status becomes `in-stock`**: matches the workbook's arrows
  literally. The "Returned" dashboard card then has no population — a direct conflict with
  MVP-07.

**D2 — Which additional edges exist?**

| Edge | Workbook | POC | Notes |
|---|---|---|---|
| `in-stock → lost` | §4.1 "where operationally appropriate" | Missing | The phrase is conditional — the operational condition is not stated |
| `in-stock → discarded` | §4.1 | Missing | Straightforward |
| `assigned → discarded` | §4.1 "only after the assignment is resolved or an explicitly approved retirement process" | Missing | The **condition** must be made testable. Options: (i) discard requires a prior return; (ii) discard clears the assignment and records it; (iii) a separate "retirement" approval concept — which §22 defers ("Complex Approval Workflows"). |
| `returned → discarded` | Implied | Missing | Should be confirmed |
| `discarded → …` | Implied terminal | Absent | Confirm terminal |
| `lost → …` | Unresolved | Terminal | See §6.2 Decision B |

**Options for D2 `assigned → discarded`** — the condition must be encoded in the state machine,
not left to UI gating:

| Option | Rule | Assessment |
|---|---|---|
| **D2a** | Discard allowed only from `in-stock` or `returned` | Simple, testable, but forces a return before discarding a held asset — operationally awkward |
| **D2b** | Discard allowed from `assigned`; the assignment is resolved as part of the discard (audit event records holder + timestamp) | One operation, no orphan assignment. Most practical |
| **D2c** | Discard from `assigned` requires an explicit prior "resolve assignment" action | Closest to the workbook's literal wording but adds a concept §22 defers |

**Recommendation to consider:** **D1a + D2b + B2**. `returned` stays a resting state (D1a — it
keeps MVP-07 meaningful and matches the POC's existing behaviour, filters, and tests);
`assigned → discarded` resolves the assignment inline (D2b); `lost → in-stock` recovery is added
(B2).

**Downstream affected:** `TRANSITIONS` map, `status` enum + DB `CHECK` constraint, the detail
view's action block, dashboard bucketing (§6.3), the audit action vocabulary, ~8 existing POC
tests that assert `returned` as a terminal-ish state.

---

## 7. UX/UI impact

### 7.1 Screen-by-screen disposition

| Workbook screen | POC basis | Disposition |
|---|---|---|
| **01 Dashboard** | None | **New.** New route, view, aggregation service, summary-card component, distribution chart. Requires the §6.3 counting decision before design can fix the card semantics. |
| **02 Asset List** | `views/list.ejs` (53 lines) — filter form, 5-column table, empty row | **Modify heavily.** Add columns (Last Updated, Actions per workbook; workbook lists 8 columns vs. POC's 5). Add sort by serial/model, filter by assignee/date range, pagination, counts, CSV export, export feedback. **Restructure for mobile** (MVP-17) — an 8-column `<table>` has no viable mobile layout. |
| **03 Asset Registration** | `views/new.ejs` (39 lines) — 6-field form | **Modify.** Add field-level errors (currently a single error block), success feedback, duplicate-submission prevention, cancel action. **Remove the `assigned-to` field** per §5.6. |
| **04 Asset Details** | `views/detail.ejs` (52 lines) — 10-field `<dl>`, 1 audit entry, conditional actions | **Modify heavily.** Add Edit action, previous assignee section, loss info block, full history section (or link), discard action, confirmation dialogs. **The action block (`:25-50`) is a chain of `if/else if` on status** — with 5 states and multiple possible actions per state this becomes unmaintainable; extract to a transition-driven partial. |
| **05 Asset Assignment** | Inline form in `detail.ejs:27-30` | **Modify.** Extract to a dedicated screen/dialog with autocomplete, previous-assignee suggestion, eligibility validation, duplicate-assignment prevention, success feedback. |
| **06 Asset Return** | Inline button in `detail.ejs:32-34` | **Modify.** Extract to a confirmation screen showing current + previous assignee. Must preserve `last_assigned_to` (MVP-03). |
| **07 Assignee Directory** | None | **New.** Directory + per-assignee detail. Grouping by `assigned_to` — see §6.3 note on name normalization. |
| **08 Asset History / Audit Log** | `detail.ejs:16-23` (1 entry) | **Modify heavily.** New dedicated route `/assets/:id/history` + timeline view, expandable events, old/new values, filters. Plus a global `/activity` view (workbook §8 nav item 4). |
| **09 Lost Asset** | Inline button in `detail.ejs:35-37` | **Modify.** Convert to a dialog capturing reason + description. |
| **10 Discard Asset** | None | **New.** Dialog with impact explanation, reason capture, confirmation. |
| **11 Reports and Export** | None | **New.** Inventory summary + CSV export. |

### 7.2 Component library baseline

Workbook §12 requires ~30 reusable components across layout, data display, form, and interaction
categories, each with documented variants, properties, behaviour, validation, responsive
behaviour, and accessibility requirements.

**POC baseline: 17 CSS class names, 40 lines, no component abstraction.**

| Category | Workbook requires | POC has | Gap |
|---|---|---|---|
| Layout | Sidebar, App Header, Page Header, Breadcrumbs, Container, Responsive Nav | topbar, container | **Sidebar + breadcrumbs + responsive nav are new.** The POC has no sidebar — the MVP nav (workbook §8) has 6 top-level sections, so a sidebar is the natural pattern. |
| Data display | Summary Card, Asset Table, Assignee Table, Status Badge, Info Card, Activity Timeline, Empty State, Pagination, Search Input, Filter Bar | status badge, asset table (partial), filter form | **Summary Card, Activity Timeline, Pagination, Empty State are new** |
| Form | Text Input, Textarea, Select, Autocomplete, Date Picker, Label, Helper Text, Validation Message | text input, textarea, select, label | **Autocomplete, Date Picker, Helper Text, Validation Message are new** |
| Interaction | Primary/Secondary/Icon Button, Dropdown, Confirm Dialog, Modal, Toast, Tooltip | button (one variant), inline form | **Dialog, Modal, Toast, Dropdown, Icon Button are new** |

### 7.3 Design system baseline — effectively zero

`public/styles.css` is 40 lines with **no CSS custom properties**. The workbook §11 requires
semantic color tokens (primary/hover/active; 8 neutrals; 4 semantic; 6 asset-status colors),
a 9-level typography scale, 6 spacing tokens, 5 radius tokens, shadow levels, an icon library, and
a light theme designed for future dark-theme extension.

**This is a ground-up build, not an extension.** The existing 17 class names must be mapped onto
the new token system. Note §11.2's rule that status must **never** be communicated by colour alone
— the POC's current status rendering (`views/list.ejs:47`) is a colour-coded span with the raw
status string as text, which satisfies the rule, but the workbook requires a proper Status Badge
component with per-state tokens.

### 7.4 Design scope observation

The workbook §17.3 defines **five design approval gates**, and §19.2 defines **nine AIDLC stages**
with their own approvals. As the sole developer and decision-maker, this creates a serial chain of
approval points. Two structural observations for the Stage-2/Stage-3 planning:

- **Gates 1+2 can merge** (Product Design Brief + personas + IA + journeys + low-fi wireframes
  are one coherent review).
- **Gates 3+4 can merge** (design system + component library + high-fi + prototype), since the
  prototype is the high-fidelity artifact being reviewed.
- **Gates 5 (handoff) should stay standalone** — it is the binding contract that frontend code
  generation must follow.

The workbook's §16.1 lists 12 wireframes and §16.2 requires high-fidelity designs for all screens
at 3 breakpoints, plus an interactive prototype covering 8 flows. **That is a large design surface
for a single 6–8 week window.** A pragmatic sequencing that preserves the workbook's intent:
design the Round 1+2 screens (Dashboard, Asset List, Asset Details, Assignee Directory, History)
to high fidelity first, and the Round 3+4 screens (Registration, Assignment, Return, Lost dialog,
Discard dialog, Reports) to wireframe fidelity, promoting any that prove problematic.

---

## 8. Risk assessment

### 8.1 Technical risks

| # | Risk | Severity | Likelihood | Mitigation |
|---|---|---|---|---|
| R1 | **`status` CHECK constraint blocks `discarded`** — requires a SQLite table rebuild; a naive rebuild loses rows or breaks the audit FK | **High** | High | Write a dedicated table-rebuild helper + a test that migrates a *populated* legacy DB and asserts row counts, column values, and FK integrity. The existing `addColumnIfMissing` does **not** cover this. |
| R2 | **Audit history destructible via `ON DELETE CASCADE`** (verified) | **High** | Medium | Rebuild audit table with `RESTRICT`; add append-only triggers; add a test asserting a delete attempt fails and history survives. |
| R3 | **Actor identity trusted from the request** — workbook MVP-01 forbids this explicitly | **High** | Medium | Actor resolved from server-side session only; add a test that a request-supplied `actor_id` is ignored/overridden. |
| R4 | **Regression in 66 existing tests** — `returned` semantics (§5.3), the `TRANSITIONS` map, and `ALLOWED_STATUSES` all change | **High** | High | Freeze the POC suite as a regression baseline; run it against every MVP increment; update only the tests whose *requirement* changed, and record each change in traceability. |
| R5 | **`updateAsset` writes every column unconditionally** — naive reuse for a partial edit clobbers concurrent changes to unrelated fields | **Medium** | Medium | Write a dedicated field-scoped update path; add a test that an edit of `name` leaves `model` untouched and vice versa. |
| R6 | **Dashboard/export count inconsistency** — two independent count implementations drift | **Medium** | High | One shared counting function consumed by dashboard, assignee counts, list counts, and CSV export; add a consistency test asserting all four agree for the same filter set. |
| R7 | **CSV injection** — a `notes` or `name` value beginning with `=`, `+`, `-`, or `@` executes in Excel/LibreOffice on open | **Medium** | Medium | Decide an explicit policy (prefix-quote or strip); add a test with a hostile value. |
| R8 | **Unbounded list queries** — `listAssets` has no `LIMIT`; pagination adds a `COUNT(*)` companion query | **Medium** | High | Add `LIMIT`/`OFFSET` + a count query; keep both derived from the same `WHERE` builder. |
| R9 | **Lead-wildcard `LIKE` search over 4 fields** (MVP-16) — `EXPLAIN QUERY PLAN` → `SCAN assets`; widens an already-unindexed scan | **Medium** | Medium | Acceptable at MVP scale; record it explicitly. If it becomes hot, FTS5 is the real fix and is a separate decision. |
| R10 | **Assignee name fragmentation** — free-text `assigned_to` with no normalization; inconsistent spellings fragment every assignee aggregate | **Medium** | High | MVP-04 autocomplete + the stable-identifier question; at minimum, reuse of known names via datalist. |
| R11 | **No CSS/design system exists** — 40 lines, no tokens, no breakpoints | **Medium** | High | Build the token layer as an explicit early deliverable; treat the 17 existing classes as the migration map. |
| R12 | **`assigned_at` overwritten on reassignment** — the prior assignment timestamp is lost | **Low** | High | Resolve together with MVP-03 (add `last_assigned_at` if the history view must show prior timestamps). |

### 8.2 Dependency risks

| # | Dependency | Note |
|---|---|---|
| D1 | **MVP-01 before MVP-02** | Audit events need `actor_id`. Workbook §20.1 states this explicitly. |
| D2 | **MVP-01 + MVP-03 before MVP-05** | Dashboard assignee distribution needs trustworthy actors and preserved history. Workbook §20.1 confirms. |
| D3 | **MVP-02 + MVP-03 before MVP-04/05** | Reconciliation is unreliable without complete history and preserved assignments. Workbook §20.1 confirms. |
| D4 | **Design approval before frontend implementation** | Workbook §18 and §20.1. This is the hard sequencing constraint. |
| D5 | **§6.1–§6.4 decisions before the migration is written** | A wrong uniqueness decision means rewriting migration 7; a wrong `returned` decision means rewriting the `TRANSITIONS` map, the DB enum, and ~8 tests. **This is the single largest schedule risk in the project.** |
| D6 | **POC baseline frozen** | The completed POC's approved scope and approval fingerprints must not be modified (workbook §19.1). The MVP must be a *new* intent. |

### 8.3 Migration concerns

| # | Concern | Detail |
|---|---|---|
| M1 | **Legacy databases exist** | A developer's existing `data/*.sqlite` was created by the POC's migration v1/v2. The MVP migrations must apply cleanly over it. `tests/db.test.js:59-93` already proves this pattern works — extend it. |
| M2 | **Pre-MVP audit rows have no actor** | Backfill to a `system` actor. Whether these count toward the 100%-attribution metric is a product decision (§4.5). |
| M3 | **Pre-MVP `returned` assets have no recoverable previous holder** | The information was never stored. **Permanently unrecoverable** — no migration can restore it. |
| M4 | **Table rebuild must preserve the audit FK** | Migration 7 recreates `assets`; the `audit_log` FK points at it. Verify FK integrity post-rebuild (`PRAGMA foreign_key_check`). |
| M5 | **Trigger-based append-only interacts with any future cleanup path** | If a trigger blocks `DELETE`/`UPDATE` on audit rows, no retention/cleanup routine can run. Confirm the MVP has no audit-retention requirement (none stated). |
| M6 | **Index creation on a populated table** | SQLite handles this transactionally, but the migration should be tested against a DB with realistic row counts, not just 2 rows. |

### 8.4 Regression areas

| Area | Risk | Note |
|---|---|---|
| `tests/asset-service.test.js` (18) | **Highest** | Asserts `returned` as a resting state, `lost` as terminal, `assigned_at`/`returned_at` semantics, `INVALID_TRANSITION` on `lost → …`. Directly affected by §6.2 and §6.4. |
| `tests/views.test.js` (12) | **High** | Asserts which action forms appear per state. Any transition change alters these. |
| `tests/db.test.js` (7) | **High** | Asserts the `UNIQUE (category, serial_or_key)` constraint and the `status` CHECK constraint. Affected by §6.1 and §6.4. |
| `tests/routes.test.js` (14) | Medium | HTTP contract; new routes must not alter existing status codes/redirects. |
| `tests/assets-repo.test.js` (15) | Medium | `updateAsset` signature and `recordAudit` signature will change. |
| `views/detail.ejs` action block | **High** | The `if/else if` chain must be rewritten to be transition-driven. |
| `src/app.js` error handler | Medium | New error codes (`DUPLICATE_ASSET` with a conflicting-asset payload, `LOSS_REASON_REQUIRED`, etc.) must map to correct HTTP statuses and preserve the current 400/404/500 contract. |

---

## 9. Recommended next steps

### 9.1 Immediate (before the MVP intent is created)

| # | Action | Rationale |
|---|---|---|
| 1 | **Review and approve this report** | Its conclusions feed Stage 1 (Intent/Scope Definition) and Stage 2 (Requirements Analysis) |
| 2 | **Settle the four decisions in §6** — or explicitly defer them to Stage 2 with an owner and a date | They are the highest schedule risk (D5). Each can be decided in Requirements Analysis, but **not after** the migration is written |
| 3 | **Decide the design-gate structure** (§7.4) — merge Gates 1+2 and 3+4, keep Gate 5 standalone | Nine AIDLC stages + five design gates is a long serial chain for a solo developer |
| 4 | **Confirm the `assigned-to` registration field is retired** (§5.6) | The POC accepts it; MVP Screen 03 does not include it. Leaving it preserves the exact ambiguity MVP-03 removes |
| 5 | **Confirm the CSV injection policy** (§8.1 R7) | A small decision with a clear default (prefix-quote) |

### 9.2 On intent creation — the MVP intent

| # | Action |
|---|---|
| 6 | Create the `asset-tracker-mvp` intent in the `default` space, leaving the completed POC intent untouched (§19.1) |
| 7 | Carry the POC as the baseline: the POC's approved requirements, the 66-test suite, and the migration runner are all inputs |
| 8 | Set the scope to `mvp` (org policy: `mvp` adds an 80% line-coverage floor and CI execution before merge — the POC sits at 93.38%, so the floor is already met, but CI must be added) |
| 9 | Record the §6 decisions in `project.md` once settled, via the learnings ritual (not by direct edit) |

### 9.3 Suggested Stage-2 requirements-analysis inputs

| # | Input |
|---|---|
| 10 | The MVP requirement set, with each of MVP-01…MVP-17 traced to its POC baseline (Existing/Modify/Extend/New) and its §3 gap |
| 11 | The reconciled lifecycle (§6.4) written as an explicit transition table, with the `returned`-vs-`in-stock` question explicitly answered |
| 12 | The counting definitions (§6.3) written as a single authoritative definition set consumed by dashboard, assignee views, list counts, and export |
| 13 | The uniqueness policy (§6.1) with the case-sensitivity sub-decision |
| 14 | The audit-event schema contract: `actor_id`, `action` vocabulary, `old_values`/`new_values` encoding (JSON vs. column pairs), and the append-only enforcement mechanism |
| 15 | A new FR set that explicitly **retires POC FR5.3** (the "full audit log shall not be exposed" deferral) — the MVP inverts it, and that inversion must appear as a traced requirement change, not a silent addition |

### 9.4 Engineering sequencing

Following the workbook's critical path and §6.4 recommendations:

| Increment | Contents | Note |
|---|---|---|
| **I1 — Foundations** | `actors` table; actor context middleware; audit-event schema + migration; `last_assigned_to`; `discarded` status + table rebuild; append-only triggers | The table rebuild is the highest-risk single operation — do it early, in isolation, with a full regression run |
| **I2 — Audit history** | `/assets/:id/history`; full event query; old/new values; `/activity` global view | Depends on I1 |
| **I3 — Lifecycle** | Edit asset; discard flow; loss management with reason capture; duplicate-detection UX | Depends on I1; uses I2's audit infrastructure |
| **I4 — Reconciliation** | Dashboard; assignee directory + details; shared counting function; status summary | Depends on I1 + I2 + I3 |
| **I5 — Export** | CSV export honouring the shared filter/count definitions | Can run alongside I4 |
| **I6 — Scale & polish** | Pagination; counts; improved search; empty states; responsive UI | Independent, can be parallelised |
| **I7 — Design system** | Tokens, typography, spacing, components, responsive breakpoints | Should start early — I6 and the screen work all depend on it |

> **Sequencing note:** I7 (design system) is listed last for dependency reasons but should be
> **scheduled early** — every screen in I2–I6 renders through it. Retrofitting a token system after
> eight screens are built is materially more expensive than building it first. This is a dependency
> inversion worth resolving in the Stage-3 design plan.

---

## 10. Scope note — what this analysis does *not* cover

To keep the boundaries of this report explicit:

- **No new AIDLC intent was created.** The completed POC intent `261004-poc` is untouched.
- **No POC code, database, or configuration was modified.** All database interaction was against
  throwaway `:memory:` databases; all source inspection was read-only.
- **No MVP requirements were authored.** This report maps and classifies the workbook's existing
  requirements; authoring the MVP FR/NFR set is Stage 2 work.
- **The four decisions in §6 are not resolved.** They are presented with options, evidence, and
  consequences for the product owner to decide.
- **Design artifacts were not produced.** No wireframes, mockups, or design system documents.

---

## Appendix A — Verified command transcript

Every empirical claim in this report is reproducible with the following, run from the project root
against throwaway in-memory databases.

**A.1 — Status CHECK constraint accepts only four statuses**
```
$ node -e "const {openDatabase}=require('./src/db');
            const db=openDatabase(':memory:');
            console.log(db.prepare('SELECT sql FROM sqlite_master WHERE name=\"assets\"').get().sql);"
```
→ `status TEXT NOT NULL CHECK (status IN ('in-stock', 'assigned', 'returned', 'lost'))`

**A.2 — Audit history is destroyed by deleting the asset** *(§4.2 finding 3)*
```
$ node -e "const {openDatabase}=require('./src/db');
            const service=require('./src/services/asset-service');
            const db=openDatabase(':memory:');
            const a=service.registerAsset(db,{category:'hardware',name:'HW',serialOrKey:'S1'});
            console.log('after register:', db.prepare('SELECT COUNT(*) c FROM audit_log').get().c);
            db.prepare('DELETE FROM assets WHERE id = ?').run(a.id);
            console.log('after hard DELETE:', db.prepare('SELECT COUNT(*) c FROM audit_log').get().c);"
```
→ `after register: 1` → `after hard DELETE: 0` — **history destroyed by cascade**

**A.3 — Uniqueness is category-scoped and case-sensitive** *(§6.1)*
```
$ node -e "const {openDatabase}=require('./src/db');
            const repo=require('./src/repositories/assets-repo');
            const db=openDatabase(':memory:');
            // same serial, different category
            repo.createAsset(db,{category:'hardware',name:'HW',serialOrKey:'DUP-1'});
            repo.createAsset(db,{category:'software-license',name:'SW',serialOrKey:'DUP-1'});
            console.log('cross-category: ALLOWED');
            // same serial, same category
            repo.createAsset(db,{category:'hardware',name:'HW2',serialOrKey:'DUP-1'});
            console.log('same-category: ALLOWED (unexpected)');"
```
→ `cross-category: ALLOWED` → `same-category: DUPLICATE_ASSET` → lowercase variant `dup-1`: `ALLOWED`

**A.4 — Transition deltas against workbook §4.1** *(§5.2)*
```
$ node -e "const {TRANSITIONS}=require('./src/services/asset-service');
            console.log('in-stock -> lost     :', TRANSITIONS['in-stock'].has('lost'));
            console.log('in-stock -> discarded :', TRANSITIONS['in-stock'].has('discarded'));
            console.log('assigned -> discarded :', TRANSITIONS['assigned'].has('discarded'));
            console.log('returned -> discarded :', TRANSITIONS['returned'].has('discarded'));
            console.log('discarded in map      :', Object.keys(TRANSITIONS).includes('discarded'));"
```
→ `false / false / false / false / false` — **all five MVP-proposed edges absent**

**A.5 — No append-only enforcement**
```
$ node -e "/* PRAGMA table_info + sqlite_master trigger count */"
```
→ trigger count `0`; no UPDATE/DELETE guard on `audit_log`

---

## Appendix B — Source reference index

| Concern | Location |
|---|---|
| State machine definition | `src/services/asset-service.js:5-10` |
| Transition guard | `src/services/asset-service.js:18-26` |
| Register asset | `src/services/asset-service.js:34-50` |
| Assign asset | `src/services/asset-service.js:52-70` |
| Return asset (clears assignee) | `src/services/asset-service.js:72-85` |
| Mark lost (no reason captured) | `src/services/asset-service.js:87-94` |
| Filtered list (no LIMIT) | `src/repositories/assets-repo.js:13-32` |
| Create asset (duplicate detection) | `src/repositories/assets-repo.js:38-78` |
| Update asset (writes all columns) | `src/repositories/assets-repo.js:80-107` |
| Audit write (no actor) | `src/repositories/assets-repo.js:109-114` |
| Latest audit only | `src/repositories/assets-repo.js:116-124` |
| Create validation | `src/repositories/assets-repo.js:126-132` |
| Allowed statuses enum | `src/repositories/assets-repo.js:6` |
| Route table | `src/routes/assets.js:9-90` |
| App wiring + error handler | `src/app.js:7-27` |
| Root redirect | `src/app.js:14` |
| Migration runner | `src/db/migrate.js:13-70` |
| Column-add helper (no rebuild support) | `src/db/migrate.js:35-41` |
| Base schema | `src/db/migrations.sql` |
| Detail action block (if/else chain) | `views/detail.ejs:25-50` |
| Detail single audit entry | `views/detail.ejs:16-23` |
| List filters | `views/list.ejs:3-26` |
| List table (5 columns) | `views/list.ejs:28-53` |
| Registration form (6 fields) | `views/new.ejs:10-39` |
| Design system (40 lines) | `public/styles.css` |
| Migration-over-legacy test | `tests/db.test.js:59-93` |
| Lost-is-terminal test | `tests/asset-service.test.js:88-94` |
| Returned-state test | `tests/asset-service.test.js:65-71` |
