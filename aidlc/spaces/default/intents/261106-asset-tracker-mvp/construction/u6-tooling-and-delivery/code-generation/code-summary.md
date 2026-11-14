# Code Summary — `u6-tooling-and-delivery`

**Unit**: Tooling and Delivery  
**Kind**: `packaging`  
**Status**: Implemented under approved plan (review findings R-01–R-06 addressed)

## What landed

| Path | Role |
|---|---|
| `package.json` / `package-lock.json` | DevDeps `prettier`, `eslint`, `@eslint/js`, `lefthook`; scripts `lint`, `format:check`, `secret-scan`, `hooks:install`, `prepare` |
| `.prettierrc.json` | 120-col Prettier option set (C12 / D-TS-03) |
| `.prettierignore` | Excludes `views/` and `public/` (D-TS-10) |
| `eslint.config.js` | Flat config, recommended + `strict: ['error', 'global']`; test override `varsIgnorePattern: '^create$'` only |
| `vitest.config.js` | `coverage.thresholds.lines = 80` |
| `lefthook.yml` | `piped: true`; numeric command names `01-secret-scan`…`05-audit` (Lefthook dump order) |
| `.github/workflows/ci.yml` | Hosted gate; `permissions.contents: read`; Node `20.20.0` |
| `scripts/secret-scan.sh` | Dependency-free fail-closed scan |
| `scripts/backup-database.sh` | Stop-process WAL-aware copy; **no prune** |
| `scripts/prune-backups.sh` | Retain three newest timestamp dirs (after successful smoke) |
| `scripts/smoke-deploy.sh` | Pre-migration baseline → register → assign → actor column → history intact → prune |
| `scripts/snapshot-audit-baseline.sh` | Writes that baseline from the pre-migrate backup |
| `docs/deploy.md` | Deploy / rollback; sign-off only after smoke 0 |
| `tests/tooling/config.test.js` | 7 configuration cases |
| `tests/tooling/gates.test.js` | 8 gate / backup / smoke cases (`lefthook dump` order) |

## Unit-scoped test command

```text
npx vitest run tests/tooling/config.test.js tests/tooling/gates.test.js
```

## Lefthook dump order

```text
npx lefthook dump
→ piped: true
→ 01-secret-scan, 02-lint, 03-test, 04-coverage, 05-audit
```

## Test evidence

```text
npx vitest run tests/tooling/config.test.js tests/tooling/gates.test.js
→ 2 files, 15 tests passed
```

## Explicit non-goals (unchanged)

No application runtime or domain changes under `src/`. No Dockerfile / Compose / IaC. No git remote creation.

## Review fixes (iteration 1)

| ID | Fix |
|---|---|
| R-01 | Numeric Lefthook names + `piped: true`; `prepare` / `hooks:install` run `lefthook install` (including `CI=true`) |
| R-02 | Smoke snapshots pre-deploy audit row ids/fields; fails if any are missing or altered; requires pre + smoke appends |
| R-03 | Deploy runbook: product-owner sign-off only after smoke exits 0 |
| R-04 | Live test uses nullable `actor` with no DEFAULT; empty actor fails closed; require-shim proves non-empty server-stored actor |
| R-05 | Backup does not prune; `prune-backups.sh` runs only after successful smoke |
| R-06 | ESLint test exception limited to `^create$` |
