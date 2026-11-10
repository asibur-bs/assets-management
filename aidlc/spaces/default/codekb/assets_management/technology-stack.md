# Technology Stack

## Runtime

| Item | Value | Evidence |
|---|---|---|
| Language | JavaScript (CommonJS) | `package.json:5` — `"type": "commonjs"`; every source file uses `require`/`module.exports` |
| Runtime | Node.js `>= 20.0.0` | `package.json:29-31` — `engines.node` |
| Verified runtime version | Node.js **v20.20.0** | Confirmed live at scan time |
| Module system | CommonJS (`require`) | No `import`/`export` anywhere in `src/` or `tests/` |
| Package manager | npm | `package-lock.json` present, 134 KB |
| Package name / version | `assets-management` @ `0.1.0`, `private: true` | `package.json:2-4` |
| Database | SQLite **3.49.2** | Confirmed live; `better-sqlite3` is bound against that SQLite build |
| Filesystem | Linux | Development platform at scan time |

## Frameworks and Libraries

### Runtime dependencies (`package.json:19-23`)

| Package | Declared range | Installed | Purpose |
|---|---|---|---|
| `express` | `^4.21.0` | 4.x | HTTP server, routing, `urlencoded` body parsing, static file serving, error middleware |
| `better-sqlite3` | `^11.3.0` | 11.x | Synchronous SQLite driver — `db.pragma`, `db.prepare`, `db.transaction`, `db.exec` |
| `ejs` | `^3.1.10` | 3.x | Server-side templating for `views/*.ejs` |

**Note on `better-sqlite3`**: it is a native addon binding to the system SQLite.
It is **synchronous** — every query blocks the event loop until it completes.
This is the defining constraint of the application's concurrency model: the
HTTP request, the SQL, and the render are one uninterrupted synchronous
sequence.

### Development dependencies (`package.json:24-28`)

| Package | Declared range | Installed | Purpose |
|---|---|---|---|
| `vitest` | `^2.1.2` | 2.1.9 | Test runner |
| `@vitest/coverage-v8` | `^2.1.9` | 2.1.9 | V8 coverage provider |
| `supertest` | `^7.0.0` | 7.x | HTTP-level integration testing against the Express app in-process |

### Node.js built-ins used

| Module | Used at |
|---|---|
| `node:crypto` | `randomUUID` — asset id generation (`src/repositories/assets-repo.js:3,46`) |
| `node:path` | Path joining for the views directory, static directory, and database path (`src/app.js:3,10,12`, `src/db/index.js:4,11`, `src/server.js:7`) |
| `node:fs` | Directory creation and reading `migrations.sql` (`src/db/index.js:3,12`, `src/db/migrate.js:3,6`) |

No other built-in or third-party module is used.

## Build and Tooling

| Aspect | Status |
|---|---|
| Build step | **None.** No compile, bundle, or transpile step. `npm install` → `npm start` runs `node src/server.js` directly (`package.json:9-10`). |
| Language | Plain JavaScript — **no TypeScript**, no `tsconfig.json`, no type definitions, no `jsconfig.json`. |
| Bundler | None (no webpack, vite, esbuild, rollup). |
| Preprocessor / transpiler | None (no babel, no swc, no ts-node). |
| Module type | CommonJS throughout — this is why `vitest.config.js:10` must set `globals: true` (Vitest 2.x rejects `describe`/`it`/`expect` globals under CommonJS). |
| Linter | **None.** No ESLint, Prettier, StandardJS, or Biome configuration and no lint dependency. No `.eslintrc*`, `eslint.config.*`, `.prettierrc*`, `.prettierignore`. No `lint` script in `package.json`. |
| Formatter | **None configured.** The style is self-consistent by convention (2-space indent, single quotes, semicolons, trailing commas) across all 12 source files. |
| Type checker | None. |
| Containerisation | **None.** No `Dockerfile`, `docker-compose.yml`, `Procfile`, or `Makefile`. |
| CI/CD | **None.** No `.github/` directory, `.gitlab-ci.yml`, `Jenkinsfile`, or `azure-pipelines.yml`. |
| Infrastructure as code | **None.** No Terraform, CloudFormation, or CDK. |
| Container / orchestration config | None. |
| Dependency lockfile | `package-lock.json` — npm lockfile, 134 KB, 204 top-level installed entries. |
| Editor / IDE config | None committed. |
| Git hooks | None (no `.husky/`, no `lefthook.yml`). |

**Consequence for the organisation's tooling rules**: the org rule "we defer to
project-level configurations" (formatter, linter) has **nothing to defer to**
in this repository. Adding a linter or a formatter configuration is *new
capability work*, not the enforcement of an existing standard — and the
`feature`-scope expectation of "CI execution before merge" requires building a
pipeline from scratch.

## Configuration Files

| File | Purpose |
|---|---|
| `package.json` | npm manifest — scripts, dependency ranges, `engines.node`. 7 test scripts plus `start` and `dev`. |
| `vitest.config.js` | Test runner configuration: `environment: 'node'`, `globals: true`, `include: ['**/*.test.js']`, `exclude` for `node_modules`/`dist`/`data`/`coverage`, `pool: 'forks'`, and the coverage block (`provider: 'v8'`, `reporter: ['text','html']`, `include: ['src/**/*.js']`). |
| `src/db/migrations.sql` | Base schema DDL — applied as migration v1, not a build artifact. |
| `package-lock.json` | npm lockfile. |
| `.gitignore` | Excludes `node_modules/`, `data/`, `coverage/`, and editor/OS artefacts. |
| `.mcp.json` | MCP server registrations for the development harness: context7, aws-mcp, aws-pricing, aws-iac, aws-serverless. Not application configuration. |

## Environment Variables

Two, both read at process start (`src/server.js:8,11`), documented at
`README.md:58-63`.

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `3000` | HTTP listen port |
| `DB_PATH` | `data/assets.sqlite` | SQLite database file path. `:memory:` gives an ephemeral database. |

There is no `.env` file, no environment-variable validation, and no secrets
management — the application holds no credentials and makes no outbound calls.

## Database Technology

| Aspect | Value |
|---|---|
| Engine | SQLite 3.49.2 (embedded, in-process) |
| Driver | `better-sqlite3` 11.x — synchronous, native addon |
| Journal mode | WAL (`src/db/index.js:15`) |
| Foreign keys | `ON` at open (`src/db/index.js:16`); **not** guaranteed inside `applyMigrations` when called on a raw handle |
| `busy_timeout` | **Never set by the application.** The `better-sqlite3` default of 5000 ms applies — an accident of the driver, not an application decision. |
| Isolation | SQLite's single-writer model. `better-sqlite3` transactions are `BEGIN`/`COMMIT` with `IMMEDIATE` semantics for `db.transaction()` by default; the application's own read-then-write sequences in the service layer are **not** wrapped in a transaction, so a check-then-act sequence is not atomic. |
| Migration mechanism | A hand-rolled versioned runner with a `schema_migrations` ledger (`src/db/migrate.js`). Each migration runs in its own transaction that also records the version. No down-migrations, no rollback. |
| Schema change strategy | `CREATE TABLE IF NOT EXISTS` for the base file; `addColumnIfMissing` in JavaScript for column additions, because SQLite has no `ALTER TABLE … ADD COLUMN IF NOT EXISTS`. **Constraint changes require a full table rebuild** — SQLite has no `ALTER TABLE … DROP CONSTRAINT`. |

### Verified platform constraints (probed live at scan time)

Established by execution against SQLite 3.49.2 / `better-sqlite3` 11.x, not by
reading documentation:

| Constraint | Verified result |
|---|---|
| `ALTER TABLE … DROP CONSTRAINT` | `near "CONSTRAINT": syntax error` — constraints cannot be dropped or amended in place |
| `ALTER TABLE … ADD COLUMN … IF NOT EXISTS` | Does not exist — hence `addColumnIfMissing` in JavaScript |
| Functional unique index | **Supported.** `CREATE UNIQUE INDEX … ON assets (category, lower(serial_or_key))` succeeds and enforces case-insensitive uniqueness |
| Plain `UNIQUE (category, serial_or_key)` | Case-**sensitive** — `hardware`/`'AbC'` and `hardware`/`'abc'` both succeed (default `BINARY` collation) |
| `PRAGMA legacy_alter_table = 1` | Does **not** suppress the FK-rewrite behaviour of `ALTER TABLE … RENAME` |
| `PRAGMA foreign_key_check` | Returns `[]` on a correctly rebuilt schema — a usable post-migration assertion |
| `db.pragma('busy_timeout = 5000')` | Settable at runtime; returns `5000`. Never called anywhere in `src/`. |
| `DROP TABLE` with a live referencing FK | Fails with `FOREIGN KEY constraint failed` when the cascade has been removed |
| `DROP TABLE` with a live cascading FK | Succeeds and silently deletes the referencing rows |

The last three rows are the mechanical basis of the migration-ordering
constraint documented in
[architecture.md](architecture.md) § The migration ordering constraint.

## Frontend Technology

There is **no frontend framework and no client-side JavaScript at all**.

| Aspect | Status |
|---|---|
| Rendering model | Server-side rendered HTML via EJS |
| Client-side JS | **None.** No `<script>` tags in any template, no client-side framework, no bundler. |
| CSS | One hand-written stylesheet with CSS custom properties (`public/styles.css`) |
| CSS framework | None |
| HTTP client | None — the browser talks to the server with plain form posts |
| Loading states | None exist, and none could: the application is fully synchronous |

## Third-Party Service Integrations

**None.** Verified: no `fetch`, no `axios`, no `http`/`https` client, no SDK, no
webhook, no email/SMS client, no cloud SDK. The application makes no outbound
network requests, holds no API keys, and stores no secrets. The AWS-family MCP
servers in `.mcp.json` are development-harness tooling, not application
integrations.

## Cross-References

- The internal dependency graph and the external dependency inventory:
  [dependencies.md](dependencies.md)
- Component responsibilities: [component-inventory.md](component-inventory.md)
- Test, linting, CI, and debt detail:
  [code-quality-assessment.md](code-quality-assessment.md)
