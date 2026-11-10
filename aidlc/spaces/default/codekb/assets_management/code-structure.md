# Code Structure

## Package and Module Organisation

`assets_management` is a **single-package repository**. There is no monorepo, no
`workspaces` declaration in `package.json`, and no `packages/` directory. The
npm package is named `assets-management`, version `0.1.0`, marked `private:
true`, with `"type": "commonjs"` (`package.json:2-6`).

The declared entry point is `src/server.js` (`package.json:7`).

### Directory layout

```
assets_management/
├── src/                      # application source (8 files)
│   ├── app.js                # Express app factory
│   ├── server.js             # process entry point
│   ├── db/
│   │   ├── index.js          # database opener + pragmas
│   │   ├── migrate.js        # versioned migration runner
│   │   └── migrations.sql    # base schema DDL (migration v1)
│   ├── repositories/
│   │   └── assets-repo.js    # SQL data access for assets + audit_log
│   ├── services/
│   │   └── asset-service.js  # business logic, state machine, audit emission
│   └── routes/
│       └── assets.js         # Express router for /assets
├── views/                    # EJS templates (6 files)
├── public/
│   └── styles.css            # single stylesheet, CSS custom properties
├── tests/                    # Vitest specs (5 files + 1 helper)
│   └── helpers/seed.js
├── data/                     # live SQLite database — gitignored, read-only
├── coverage/                 # generated V8 coverage report — gitignored
├── package.json
├── vitest.config.js
├── package-lock.json         # npm lockfile (134 KB)
├── README.md
├── README.MD                 # duplicate-name artefact, 17 bytes
├── .gitignore
├── .mcp.json                 # MCP server registrations
├── help                      # zero-byte scratch file
├── f1-diagram.txt            # untracked scratch file
└── f5a-diagram.txt           # untracked scratch file
```

`README.md:69-93` carries a code-layout tree that matches the directory
structure exactly.

## File Classification

Every file in the repository, classified by role.

### Application source — `src/` (8 files, ~430 lines)

| File | Layer | Role |
|---|---|---|
| `src/server.js` | Entry point | Opens the database, builds the app, listens on `PORT`. Exports `main()` and self-executes under `require.main === module` (`src/server.js:19-21`). |
| `src/app.js` | HTTP composition | Express app factory. Sets the view engine, mounts `urlencoded` body parsing, serves `/static`, mounts the assets router at `/assets`, and owns the error middleware. Exports `createApp(db)`. |
| `src/routes/assets.js` | HTTP adapter | Express router factory `assetsRouter(db)`. Reads and normalises request params, calls the service, renders or redirects. Contains no SQL and no business rules. |
| `src/services/asset-service.js` | Domain | The state machine (`TRANSITIONS`), transition validation, audit emission, and the six business operations. Depends on the repository; never on the router. |
| `src/repositories/assets-repo.js` | Data access | All SQL. Asset CRUD, filtering/sorting, audit insert, and the "latest audit" query. Also holds `ALLOWED_CATEGORIES`, `ALLOWED_STATUSES`, and `validateCreate`. |
| `src/db/index.js` | Infrastructure | `openDatabase(filename)` — creates the parent directory when needed, opens the handle, sets pragmas, applies migrations. |
| `src/db/migrate.js` | Infrastructure | The versioned migration runner. Holds the `MIGRATIONS` array, the `schema_migrations` ledger, and `addColumnIfMissing`. |
| `src/db/migrations.sql` | Infrastructure | Base schema DDL, applied as migration v1. Written with `IF NOT EXISTS` throughout so it is safe to re-apply. |

### Presentation — `views/` (6 files)

| File | Role |
|---|---|
| `views/_header.ejs` | Shared page chrome: doctype, head, stylesheet link, top bar, "New asset" nav button. Included by every other template. |
| `views/_footer.ejs` | Closes `<main>` and the document. Included by every other template. |
| `views/_layout.ejs` | **Dead code.** Nothing includes it. Duplicates the `_header` markup and adds a `<%- body %>` placeholder. |
| `views/list.ejs` | Asset list: the filter form (search, category, status, sort, direction) and the 5-column results table with a single empty state. |
| `views/new.ejs` | Registration form: category, name, serial/key, model, assignee, notes, plus the error block. |
| `views/detail.ejs` | Asset detail: the record as a `<dl>`, one "Recent activity" audit entry, and the action forms that are legal from the current status. |
| `views/error.ejs` | Error page: message plus a link back to the list. Rendered by the error middleware and by the 404 path. |

### Static assets — `public/` (1 file)

`public/styles.css` — a single stylesheet using CSS custom properties for the
colour palette (`:root`, lines 1-10). It also carries the `.status-*` colour
tokens for the four lifecycle states (lines 27-30), which is one of the six
copies of the status vocabulary.

### Tests — `tests/` (5 spec files + 1 helper, 827 lines)

| File | Lines | Focus |
|---|---|---|
| `tests/db.test.js` | 102 | Schema creation, the unique constraint, audit timestamps, the `assigned_at`/`returned_at` columns, the default `in-stock` state, a hand-built legacy-schema migration, and the migration ledger. |
| `tests/assets-repo.test.js` | 168 | Repository CRUD, validation, filtering, sorting, audit insert, `latestAuditFor`, `updateAsset` timestamp persistence, `NOT_FOUND`, and a write-burst consistency check. |
| `tests/asset-service.test.js` | 177 | The state machine — every legal edge, every illegal edge, and the lifecycle timestamps. |
| `tests/routes.test.js` | 147 | HTTP integration via `supertest` against the Express app: status codes, redirects, re-rendered forms on error, and the `data-testid` attributes UI automation depends on. |
| `tests/views.test.js` | 152 | Rendered-HTML assertions: list columns, row links, per-status action forms, displayed timestamps. |
| `tests/helpers/seed.js` | 81 | `seedTwoAssets`, `seedAsset`, `resetState`, `latestAssetId` — all with JSDoc. Seeds go through the **service** path, not hand-written SQL, so seeded rows are fully-formed records. |

### Configuration and metadata

| File | Role |
|---|---|
| `package.json` | npm manifest: scripts, dependency ranges, `engines.node >= 20.0.0`. |
| `vitest.config.js` | Test runner and coverage configuration. |
| `package-lock.json` | npm lockfile (134 KB, 204 top-level installed entries). |
| `.gitignore` | Excludes `data/`, `coverage/`, `node_modules/`. |
| `.mcp.json` | MCP server registrations: context7, aws-mcp, aws-pricing, aws-iac, aws-serverless. |
| `README.md` | 93-line operator/developer guide. |
| `README.MD` | Duplicate-name artefact — 17 bytes, "Excercise project". |

### Non-application directories

`aidlc/`, `.claude/`, `.puku-cli/`, `.puku/` hold the AIDLC workflow tooling and
knowledge base. They are **not application source** and are excluded from the
analysis scope (see [reverse-engineering-timestamp.md](reverse-engineering-timestamp.md)
§ Scope of Analysis).

### Scratch and artefact files at the repo root

`f1-diagram.txt`, `f5a-diagram.txt` (untracked mermaid diagram scratch files),
and `help` (zero bytes) are developer scratch, not application source. They were
not read.

## Code Patterns

### Layering and dependency direction

Dependencies flow strictly downward and never upward:

```
routes → services → repositories → db → (SQLite)
```

No cycles. `views/` is reached by the EJS engine, never by `require`. The
complete `require` edge list is in
[dependencies.md](dependencies.md) § Internal Dependency Graph.

### The route → service → repository call convention

Every route handler follows the same shape:

```js
router.get('/:id', (req, res, next) => {
  try {
    const data = service.getAssetWithAudit(db, req.params.id);
    if (!data) {
      const err = new Error('Asset not found.');
      err.code = 'NOT_FOUND';
      throw err;
    }
    res.render('detail', { asset: data.asset, audit: data.audit });
  } catch (err) { next(err); }
});
```

Characteristics, consistent across all eight handlers:

- The `db` handle is **closed over** by the router factory
  (`assetsRouter(db)`), not threaded through request state. There is no
  connection pool, because the driver is synchronous and the handle is
  process-wide.
- Business failures are raised as `Error` instances carrying a `code`, and
  forwarded to `next(err)`. The error middleware at `src/app.js:17-24` is the
  only place that turns an error into an HTTP status.
- Input is coerced at the boundary: `String(req.body.x)`, `.trim()`, and
  explicit whitelisting of `sort` and `dir`.
- Success is either `res.render(...)` or `res.redirect(...)` — the
  Post/Redirect/Get pattern. Every successful write redirects.

### The service operation shape

Every service operation follows the same four beats:

```js
function assignAsset(db, id, assignee) {
  if (!assignee || ...) throw makeError('assignee is required.', 'VALIDATION_ERROR');
  const current = repo.getAsset(db, id);
  if (!current) throw makeError('Asset not found.', 'NOT_FOUND');
  assertTransition(current.status, 'assigned');
  const updated = repo.updateAsset(db, id, { ... });
  repo.recordAudit(db, id, 'assign', ...);
  return updated;
}
```

1. Validate the arguments.
2. Load the current row and reject if absent.
3. Validate the transition against `TRANSITIONS`.
4. Write the row, then append the audit row.

This shape is the reason the transition rules are enforced at all — and it is
also where the missing transaction lives (steps 4's two writes are separate).

### The error contract

A single, documented contract across the codebase:

- Errors are `Error` instances with a `code` property. Codes in use:
  `VALIDATION_ERROR`, `DUPLICATE_ASSET`, `NOT_FOUND`, `INVALID_TRANSITION`,
  `INVALID_STATE`.
- `makeError(message, code)` (`src/services/asset-service.js:28-32`) and the
  inline equivalent in the repository are the two construction sites.
- The HTTP boundary maps `NOT_FOUND` → 404, `DUPLICATE_ASSET` /
  `VALIDATION_ERROR` / `INVALID_TRANSITION` → 400, and everything else → 500
  with a generic message (`src/app.js:20-23`).
- **Tests assert on `err.code`, never on the message.** `tests/assets-repo.test.js:7-12`
  states this in a doc comment: "the message is human-facing prose and is not
  part of the contract".

### The `Set`-based vocabulary and transition-table idiom

`ALLOWED_CATEGORIES` and `ALLOWED_STATUSES` are `Set` instances
(`src/repositories/assets-repo.js:5-6`); `TRANSITIONS` is an object of `Set`s
(`src/services/asset-service.js:5-10`). Membership tests use `.has()`. The
vocabulary is duplicated across six locations rather than shared — see
[code-quality-assessment.md](code-quality-assessment.md) § Technical Debt.

### SQL construction style

- All queries are **prepared statements** with `?` placeholders. No string
  interpolation of user values appears anywhere in the SQL.
- Dynamic SQL is limited to two safe cases: a `WHERE` clause assembled from a
  list of fixed fragments with bound arguments
  (`src/repositories/assets-repo.js:14-31`), and a sort column that is
  **whitelisted to a literal** (`sort === 'created_at' ? 'created_at' : 'name'`,
  `:29`). The same whitelisting is repeated in the router
  (`src/routes/assets.js:15-16`).
- `SELECT *` is used for all asset reads, which is why adding a column is
  transparent to the read path — and why `updateAsset` can pass an arbitrary
  merged row straight into a full-column `UPDATE`.

### Timestamp handling

Timestamps are generated by SQLite, not JavaScript:
`strftime('%Y-%m-%dT%H:%M:%fZ', 'now')` is the column default
(`src/db/migrations.sql:24-25,34`) and `nowIso(db)` runs the same expression as
a query (`src/repositories/assets-repo.js:8-11`). The format is ISO-8601 with
millisecond precision and a `Z` suffix, asserted by a regex in
`tests/db.test.js:36`.

### The EJS rendering idiom

- Templates use `<%- include('_header') %>` / `<%- include('_footer') %>` — not
  a shared layout. `views/_layout.ejs` exists but is never included.
- All user-supplied values are interpolated with `<%= %>` (escaped), never
  `<%- %>` (unescaped). The only unescaped output in the codebase is
  `include()`, which is not user data.
- Interactive elements carry a `data-testid` attribute so the HTTP and view
  tests can assert on structure without brittle selectors. This is a
  deliberate, repo-wide convention.

### Test idiom

- Every spec opens a **fresh `:memory:` database** in `beforeEach` and closes
  it in `afterEach` (`tests/db.test.js:8-15` and the same pattern in the other
  four specs). **No test touches the `data/` directory.**
- `vitest.config.js:10` sets `globals: true` because Vitest 2.x rejects the
  `describe`/`it`/`expect` globals under CommonJS; `pool: 'forks'` is set at
  `:15`.
- HTTP-level tests use `supertest` against the app built by `createApp(db)`
  with an in-memory database — the real Express stack, no network listener.
- Requirement traceability is carried in the test code itself: inline `FR` /
  `NFR` markers in `it(...)` titles and comments, e.g.
  `tests/asset-service.test.js:115` (`FR4.6`), `tests/routes.test.js:36`
  (`FR1.4`), `tests/views.test.js:111` (`FR3.3`).
- The one exception to the in-memory rule is `tests/db.test.js:59-93`, which
  builds a legacy schema on a raw `new Database(':memory:')` handle so that no
  migration is recorded as applied — simulating a database written by an
  earlier release.

### Comment style

Comments are purposeful and explain **why**, not what. The best examples:

- `src/db/migrate.js:8-12` — why the base schema uses `IF NOT EXISTS`.
- `src/db/migrate.js:25-30` — why the column-add is written in JavaScript
  (SQLite has no `ADD COLUMN IF NOT EXISTS`).
- `src/repositories/assets-repo.js:48-52` — why a registration with an assignee
  is still stored as `in-stock`.
- `views/detail.ejs:39` — why a returned asset must not offer the return form.
- `tests/helpers/seed.js:4-8` — why the seed goes through the service path.

There are **zero** `TODO`, `FIXME`, or `HACK` markers and zero lint-suppression
comments across `src/`, `tests/`, `views/`, and `public/`. The codebase's debt
is structural, not annotated.

### Formatting

Consistently 2-space indent, single quotes, semicolons, trailing commas,
uniform across all twelve source files. **There is no formatter configuration**
— the style is self-consistent by convention, not by tooling. See
[code-quality-assessment.md](code-quality-assessment.md) § Linting.

## Cross-References

- Component list with responsibilities: [component-inventory.md](component-inventory.md)
- API surfaces: [api-documentation.md](api-documentation.md)
- Versions and the dependency graph: [technology-stack.md](technology-stack.md),
  [dependencies.md](dependencies.md)
- Architecture, interaction diagrams, and the migration-ordering constraint:
  [architecture.md](architecture.md)
