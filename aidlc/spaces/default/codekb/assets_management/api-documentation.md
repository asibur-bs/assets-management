# API Documentation

## Summary

The system exposes **one external API surface** — an HTTP form API over
server-rendered HTML — and three internal module APIs (router, service,
repository, data access). There is **no JSON/REST API, no GraphQL, no OpenAPI
or Swagger spec, no WebSocket, and no outbound network call of any kind**. The
application is entirely self-contained: it makes no requests to any third-party
service and holds no credentials.

| Surface | Location | Endpoints / exports |
|---|---|---|
| External — HTTP | `src/routes/assets.js`, mounted at `/assets` by `src/app.js:15` | 7 endpoints |
| Internal — repository | `src/repositories/assets-repo.js` | 7 functions + 2 constants + 1 helper |
| Internal — service | `src/services/asset-service.js` | 6 functions + 1 transition table |
| Internal — data access | `src/db/index.js`, `src/db/migrate.js`, `src/app.js`, `src/server.js` | 6 functions + 1 migration array + 1 SQL constant |

---

## External API — HTTP

### Overview

- **Base path**: `/assets` (`src/app.js:15` — `app.use('/assets', assetsRouter(db))`)
- **Content type**: `application/x-www-form-urlencoded` for writes, parsed by
  `express.urlencoded({ extended: false })` (`src/app.js:11`)
- **Rendering**: HTML via EJS. Every response is a rendered page or a 302
  redirect. No endpoint returns JSON.
- **Method override**: none. Writes are plain `POST` forms.
- **Authentication / authorization**: **none.** No session middleware, no auth
  router, no CSRF protection, no rate limiting. `README.md:67` records this as
  a deliberate POC limitation.

### Endpoint table

| Method | Path | Handler | Success | Error |
|---|---|---|---|---|
| GET | `/` | `src/app.js:14` | 302 → `/assets` | — |
| GET | `/assets` | `src/routes/assets.js:9` | 200 render `list` | `next(err)` |
| GET | `/assets/new` | `src/routes/assets.js:31` | 200 render `new` | — |
| POST | `/assets` | `src/routes/assets.js:35` | 302 → `/assets` | 400 render `new` on `VALIDATION_ERROR` / `DUPLICATE_ASSET` |
| GET | `/assets/:id` | `src/routes/assets.js:57` | 200 render `detail` | 404 render `error` on `NOT_FOUND` |
| POST | `/assets/:id/assign` | `src/routes/assets.js:69` | 302 → `/assets/:id` | 400 on `INVALID_TRANSITION` / `VALIDATION_ERROR` |
| POST | `/assets/:id/return` | `src/routes/assets.js:77` | 302 → `/assets/:id` | 400 on `INVALID_TRANSITION` |
| POST | `/assets/:id/lost` | `src/routes/assets.js:84` | 302 → `/assets/:id` | 400 on `INVALID_TRANSITION` |

### GET `/assets` — list and filter

**Query parameters** (`src/routes/assets.js:11-26`):

| Parameter | Accepted values | Default | Behaviour |
|---|---|---|---|
| `q` | any string | `null` | Case-insensitive substring match on **name or serial_or_key**, using `LOWER(col) LIKE '%q%'` (`src/repositories/assets-repo.js:16-19`) |
| `category` | `hardware`, `software-license` | `null` | Exact match. **An unrecognised value is silently dropped**, returning the unfiltered list (`src/repositories/assets-repo.js:20-23`) |
| `status` | `in-stock`, `assigned`, `returned`, `lost` | `null` | Exact match. **An unrecognised value is silently dropped** (`src/repositories/assets-repo.js:24-27`) |
| `sort` | `name`, `created_at` | `name` | Whitelisted in the router (`src/routes/assets.js:15`) and again in the repository (`src/repositories/assets-repo.js:29`) |
| `dir` | `asc`, `desc` | `asc` | Whitelisted in the router (`src/routes/assets.js:16`) and again in the repository (`src/repositories/assets-repo.js:30`) |

**Response**: the `list` view — a 5-column table (`Name`, `Category`,
`Serial / Key`, `Status`, `Assigned to`), a filter form pre-populated with the
echoed filter values, and one empty state ("No assets yet.",
`views/list.ejs:40`).

**Not present**: no result count, no pagination, no total. The response
contains every matching row. The repository issues no `COUNT` query.

### GET `/assets/new` — registration form

Renders the `new` view with empty `values` and an empty `errors` array
(`src/routes/assets.js:31-33`). Fields: `category` (select), `name`,
`serial_or_key`, `model`, `assigned_to` (optional), `notes`.

### POST `/assets` — register an asset

**Request body** (`src/routes/assets.js:37-44`):

| Field | Required | Type | Notes |
|---|---|---|---|
| `category` | yes | string | Must be `hardware` or `software-license` |
| `name` | yes | string | Trimmed; must be non-empty after trim |
| `serial_or_key` | yes | string | Trimmed; must be non-empty after trim |
| `model` | no | string | Trimmed; `null` when absent or empty |
| `notes` | no | string | Trimmed; `null` when absent or empty |
| `assigned_to` | no | string | Trimmed; `null` when absent or empty |

**Behaviour**: the asset is always persisted with `status = 'in-stock'`
regardless of `assigned_to` (`src/repositories/assets-repo.js:48-52`). The
assignee is stored as a plain field and does **not** move the asset into
`assigned`. A `create` audit row is appended.

**Responses**:

- **302 → `/assets`** on success (`src/routes/assets.js:48`). The redirect
  target carries no id — the asset is found on the list.
- **400** rendering the `new` view with the error message, when the error code
  is `VALIDATION_ERROR` or `DUPLICATE_ASSET` (`src/routes/assets.js:50-52`).
  The submitted `req.body` is echoed back into the form.
- **500** for any other error, via the error middleware.

**Duplicate detection**: post-hoc only. The insert is attempted and the
database `UNIQUE (category, serial_or_key)` constraint rejects it; the
repository then string-matches `'UNIQUE constraint failed'` in the SQLite error
message to produce `DUPLICATE_ASSET` (`src/repositories/assets-repo.js:69-76`).
The check is **case-sensitive** — `hardware`/`'AbC'` and `hardware`/`'abc'`
both succeed (verified live).

### GET `/assets/:id` — asset detail

**Path parameter**: `id` — the asset's UUID.

**Response**: the `detail` view with:

- The record as a `<dl>` — category, serial/key, model, status, assigned to,
  assigned at, returned at, notes, created, updated (`views/detail.ejs:3-14`).
- **One** audit entry — the most recent — under "Recent activity"
  (`views/detail.ejs:16-23`). The repository query is
  `ORDER BY id DESC LIMIT 1` (`src/repositories/assets-repo.js:116-124`). There
  is no full-history endpoint.
- The action forms that are legal from the current status (`views/detail.ejs:25-50`).

**Errors**: 404 rendering `error` when the asset does not exist
(`src/routes/assets.js:60-63`).

### POST `/assets/:id/assign` — assign to a holder

**Request body**: `assigned_to` (string, required, trimmed; empty ⇒
`VALIDATION_ERROR`).

**Legal from**: `in-stock`, `returned`. Any other origin status ⇒
`INVALID_TRANSITION`.

**Side effects**: `status` → `assigned`; `assigned_to` → the assignee;
`assigned_at` → now; `returned_at` → null. A `assign` audit row is appended.

**Responses**: 302 → `/assets/:id` on success; 400 via the error middleware on
`INVALID_TRANSITION` / `VALIDATION_ERROR`; 404 on `NOT_FOUND`.

### POST `/assets/:id/return` — mark returned

**Request body**: none.

**Legal from**: `assigned`. Any other origin status ⇒ `INVALID_TRANSITION`.

**Side effects**: `status` → `returned`; `assigned_to` → null; `returned_at` →
now. `assigned_at` is left unchanged. A `return` audit row is appended.

**Responses**: 302 → `/assets/:id`; 400 on `INVALID_TRANSITION`; 404 on
`NOT_FOUND`.

### POST `/assets/:id/lost` — mark lost

**Request body**: none.

**Legal from**: `assigned`, `returned`. Any other origin status ⇒
`INVALID_TRANSITION`.

**Side effects**: `status` → `lost`; `assigned_to` → null. A `mark-lost`
audit row is appended. `lost` is terminal — no further transition is legal.

**Responses**: 302 → `/assets/:id`; 400 on `INVALID_TRANSITION`; 404 on
`NOT_FOUND`.

### Static file serving

`GET /static/*` serves `public/` (`src/app.js:12`). One file in practice:
`public/styles.css`, referenced from `views/_header.ejs:6`.

### Error response contract

The error middleware (`src/app.js:17-24`) is the single translation point:

| Error `code` | HTTP status | Rendered view | Message source |
|---|---|---|---|
| `NOT_FOUND` | 404 | `error` | `err.message` |
| `DUPLICATE_ASSET` | 400 | `error` | `err.message` |
| `VALIDATION_ERROR` | 400 | `error` | `err.message` |
| `INVALID_TRANSITION` | 400 | `error` | `err.message` |
| `INVALID_STATE` | **500** | `error` | generic "Unexpected error." |
| anything else | 500 | `error` | generic "Unexpected error." |

`INVALID_STATE` is thrown by `assertTransition` for an unknown origin status
(`src/services/asset-service.js:21`) but is **not** in the handled-code list at
`src/app.js:20`, so it surfaces as a 500 rather than a 400.

If the response headers have already been sent, the middleware delegates to
Express's default handler (`src/app.js:18`).

---

## Internal API — Repository layer (`src/repositories/assets-repo.js`)

Every function takes the `db` handle as its first argument. There is no
connection management, no pooling, and no context object.

| Export | Line | Signature | Contract |
|---|---|---|---|
| `listAssets` | 13 | `(db, { q, category, status, sort, dir })` → `object[]` | Applies the filters above and returns every matching row. Defaults: `q/category/status = null`, `sort = 'name'`, `dir = 'asc'`. Unknown `category`/`status` values are dropped, not rejected. |
| `getAsset` | 34 | `(db, id)` → `object \| undefined` | Single row by primary key. |
| `createAsset` | 38 | `(db, input)` → `object` | Validates, then inserts with `status` hard-coded to `'in-stock'` and `id = randomUUID()`. Returns the re-read row. Throws `VALIDATION_ERROR` (with a `details` array) or `DUPLICATE_ASSET`. |
| `updateAsset` | 80 | `(db, id, patch)` → `object` | Merges `patch` over the current row and writes **every** column. **No transition validation and no audit write.** Throws `NOT_FOUND` if the id is unknown. |
| `recordAudit` | 109 | `(db, assetId, action, description)` → `void` | Appends one `audit_log` row. `created_at` is set by the column default. |
| `latestAuditFor` | 116 | `(db, assetId)` → `object \| undefined` | `ORDER BY id DESC LIMIT 1`. Returns `action`, `description`, `created_at` only — **not** `id` or `asset_id`. |
| `nowIso` | 8 | `(db)` → `string` | The current timestamp as `strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`, computed by SQLite. |
| `ALLOWED_CATEGORIES` | 5 | `Set<string>` | `{'hardware', 'software-license'}` |
| `ALLOWED_STATUSES` | 6 | `Set<string>` | `{'in-stock', 'assigned', 'returned', 'lost'}` |
| `validateCreate` | 126 | `(input)` → `string[]` | Returns a list of human-readable error strings; empty means valid. |

### Input shapes

```js
createAsset(db, {
  category: 'hardware',          // required, must be in ALLOWED_CATEGORIES
  name: 'ThinkPad X1',            // required, non-empty after trim
  serialOrKey: 'TP-001',          // required, non-empty after trim
  model: 'ThinkPad X1 Carbon',    // optional → null
  notes: '…',                     // optional → null
  assignedTo: 'Dana Reyes',       // optional → null; does NOT change status
})
```

```js
updateAsset(db, id, {
  status: 'assigned',             // accepted verbatim, unvalidated
  assigned_to: 'Dana Reyes',
  assigned_at: '2026-01-01T00:00:00.000Z',
  returned_at: null,
})
```

The two input shapes use different casings for the same concept —
`serialOrKey`/`assignedTo` (camelCase) on create versus
`serial_or_key`/`assigned_to` (snake_case) in the row and in `updateAsset`'s
patch. The repository translates between them; callers must know which is
which.

---

## Internal API — Service layer (`src/services/asset-service.js`)

| Export | Line | Signature | Contract |
|---|---|---|---|
| `registerAsset` | 34 | `(db, input)` → `object` | `createAsset` + a `create` audit row. The description differs when an assignee was supplied. |
| `assignAsset` | 52 | `(db, id, assignee)` → `object` | Validates the assignee, checks the asset exists, asserts the transition, then updates and audits. |
| `returnAsset` | 72 | `(db, id)` → `object` | Asserts `→ returned`, then updates and audits. |
| `markLost` | 87 | `(db, id)` → `object` | Asserts `→ lost`, then updates and audits. |
| `getAssetWithAudit` | 96 | `(db, id)` → `{ asset, audit } \| null` | The asset plus its **latest** audit row. `null` when the asset does not exist. |
| `listAssets` | 103 | `(db, filters)` → `object[]` | A pass-through to the repository. |
| `TRANSITIONS` | 5 | `object<string, Set<string>>` | The state machine. See below. |

### The transition table

```js
TRANSITIONS = {
  'in-stock': new Set(['assigned']),
  assigned:   new Set(['returned', 'lost']),
  returned:   new Set(['assigned', 'lost']),
  lost:       new Set(),
}
```

`assertTransition(from, to)` (`src/services/asset-service.js:18-26`) throws:

- `INVALID_STATE` — `from` is not a key of `TRANSITIONS` (an unknown status).
- `INVALID_TRANSITION` — `to` is not in the set for `from`.

### Audit action vocabulary

| Action string | Emitted by | Where the string is written |
|---|---|---|
| `create` | `registerAsset` | `src/services/asset-service.js:40,47` |
| `assign` | `assignAsset` | `src/services/asset-service.js:68` |
| `return` | `returnAsset` | `src/services/asset-service.js:83` |
| `mark-lost` | `markLost` | `src/services/asset-service.js:92` |

The vocabulary is stringly-typed with no constant. Note the naming
inconsistency: the action string is hyphenated (`mark-lost`) while the service
function is camelCase (`markLost`) and the description builder key is
`markLost` (`src/services/asset-service.js:15`).

---

## Internal API — Data access and application wiring

| Export | Location | Signature / value |
|---|---|---|
| `openDatabase` | `src/db/index.js:8` | `(filename)` → a `better-sqlite3` handle. Creates the parent directory when the path is not `:memory:`, sets `journal_mode = WAL` and `foreign_keys = ON`, then applies migrations. Defaults to `':memory:'` when `filename` is `undefined`. **`busy_timeout` is never set.** |
| `applyMigrations` | `src/db/migrate.js:53` | `(db)` → `db`. Ensures the `schema_migrations` table, then applies each unapplied migration inside its own transaction, recording the version. |
| `MIGRATIONS` | `src/db/migrate.js:13` | `Array<{ version, name, up(db) }>`. Two entries: v1 `base-schema` (execs `migrations.sql`), v2 `lifecycle-timestamps` (adds `assigned_at`, `returned_at` via `addColumnIfMissing`). |
| `MIGRATIONS_SQL` | `src/db/migrate.js:6` | The contents of `src/db/migrations.sql`, read at module load. |
| `createApp` | `src/app.js:7` | `(db)` → an Express app. |
| `main` | `src/server.js:10` | Opens the database at `process.env.DB_PATH` (default `data/assets.sqlite`), builds the app, and listens on `process.env.PORT` (default 3000). |

---

## Absent API surfaces

Verified by exhaustive grep across `src/`, `tests/`, and `views/`:

| Surface | Status |
|---|---|
| JSON / REST API | **Absent.** Every endpoint renders HTML or redirects. |
| GraphQL | Absent. |
| OpenAPI / Swagger spec | Absent. |
| WebSocket / SSE | Absent. |
| Outbound HTTP client | **Absent.** No `fetch`, `axios`, `http`/`https` request, or SDK. The application never calls out. |
| Authentication / session | Absent. |
| CSRF protection | Absent. |
| Rate limiting | Absent. |
| Health / readiness endpoint | Absent. |
| Metrics / telemetry export | Absent. |
| Delete endpoint | **Absent** — and consequently no `DELETE FROM assets` path exists in application code, though the schema permits one (see [architecture.md](architecture.md) § The migration ordering constraint). |
| Pagination / result-count parameters | Absent. |

## Cross-References

- Component responsibilities: [component-inventory.md](component-inventory.md)
- Interaction diagrams for the transactions described here:
  [architecture.md](architecture.md) § Interaction Diagrams
- Error-contract and transaction-safety detail:
  [code-quality-assessment.md](code-quality-assessment.md)
