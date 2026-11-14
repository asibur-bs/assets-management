# Unit Test Instructions — `u6-tooling-and-delivery`

**Strategy**: standard (5–8 tests per component, plus one boundary integration)  
**Methodology**: test-after  
**Unit command**:

```text
npx vitest run tests/tooling/config.test.js tests/tooling/gates.test.js
```

Two components: configuration (`config.test.js`) and delivery gates
(`gates.test.js`). Write the tests after the configuration and scripts exist.
Do not write the U1 or U3 test-first exceptions here.

Every `it` title carries the requirement id it pins (`NFR2.4.1`, and so on).
Tests must not read or write `data/`. Temporary databases and backup roots
go under the OS temp directory.

## `tests/tooling/config.test.js` (6–8 cases)

1. **NFR6.2.1** — load `vitest.config.js` and assert `test.coverage.thresholds.lines` is `80`. Assert `include` still contains `src/**/*.js`.
2. **C12 / D-TS-03** — read `.prettierrc.json` and assert `printWidth` 120, `singleQuote` true, `trailingComma` `"es5"`, `semi` true, `tabWidth` 2, `arrowParens` `"always"`, `endOfLine` `"lf"`.
3. **D-TS-10** — `.prettierignore` contains `views/` and `public/`. `package.json` `format:check` does not itself list those directories.
4. **D-TS-04** — `eslint.config.js` sets language option `strict` to `['error', 'global']` (or the equivalent source text) and contains exactly one override whose files glob is the test tree. The override does not apply to `src/`.
5. **D-TS-11** — `package.json` script `lint` is exactly `eslint src tests vitest.config.js` (flags that do not add paths are allowed only if the path list remains those three). The script does not mention `aidlc`, `.claude`, or `.puku-cli`.
6. **NFR5.1.1** — the repo root has no `Dockerfile`, `docker-compose.yml`, or `compose.yml`.
7. **NFR2.4.6** — `package.json` `dependencies` is unchanged from `better-sqlite3`, `ejs`, and `express`. `prettier`, `eslint`, `@eslint/js`, and `lefthook` are `devDependencies`.

## `tests/tooling/gates.test.js` (6–8 cases)

Use a temporary git repository (or `git diff` fixtures passed by running the
script with `GIT_DIR` / a copied worktree) so the tests do not depend on the
developer's staged index. The script must honor an explicit `SECRET_SCAN_DIFF`
only if the plan's script does not; prefer invoking `scripts/secret-scan.sh`
against a temp git repo whose `git diff --cached` the test controls. Do not
stub the script's pattern list.

1. **NFR2.4.1 clean** — a staged diff that adds `src/example.js` with `const name = 'ok';` makes `scripts/secret-scan.sh` exit 0.
2. **NFR2.4.1 / NFR2.4.2 hit** — a staged diff that adds a line `const key = 'AKIAIOSFODNN7EXAMPLE';` makes the script exit 1. Captured stdout and stderr do not contain `AKIAIOSFODNN7EXAMPLE`. They do contain the file path and a rule id.
3. **NFR2.4.1 fail closed** — running the script with `GIT_DIR` pointed at a directory that is not a repository makes it exit non-zero.
4. **NFR2.4.1 / NFR2.4.3 order** — `npx lefthook dump` lists `01-secret-scan`, `02-lint`, `03-test`, `04-coverage`, `05-audit` in that order under `piped: true`. `package.json` `prepare` is `lefthook install` and does not mention `CI`. Running that install with `CI=true` in a temporary git repo writes a `pre-commit` hook.
5. **NFR2.4.4 / NFR2.4.5 / NFR2.4.3** — `.github/workflows/ci.yml` has `permissions.contents` equal to `read` and no other permission key; `node-version` is the string `20.20.0`; the step list runs the secret scan, then `npm ci`, then lint, test, `npm run test:coverage`, then the audit command. The file does not contain `pull_request_target`.
6. **NFR3.5.1** — in a temp directory, create `assets.sqlite`, `assets.sqlite-wal`, and `assets.sqlite-shm` with distinct bytes. With no `node src/server.js` process running, `DB_PATH` and `BACKUP_ROOT` pointed at that temp tree, run `scripts/backup-database.sh` four times (distinct timestamps; sleep one second between runs or pass a clock the script reads from `BACKUP_STAMP` if the implementation supports it). Assert each copy directory contains all three files with the same bytes, and that all four timestamp directories remain. Pruning to three happens only after `scripts/smoke-deploy.sh` exits 0.
7. **NFR3.5.2 unset** — `scripts/smoke-deploy.sh` with `SMOKE_BASE_URL` unset exits non-zero.
8. **NFR3.5.2 live boundary** — start `node src/server.js` with `PORT` set to an ephemeral port and `DB_PATH` set to a temp sqlite path whose `audit_log.actor` column has no default. Against that server, `scripts/smoke-deploy.sh` exits non-zero and its output names an empty actor, so deleting the actor check would turn this case green. A second start of the same server, with a test-local require that writes a non-empty actor on the audit insert and does not modify application source, exits 0. A pre-existing audit row is unchanged, a failed smoke does not prune `BACKUP_ROOT`, and the successful smoke leaves only the three newest backup directories. Do not use `data/assets.sqlite`.

## What not to test here

- Do not add a ninth assertion that changes U2's domain tests.
- Do not delete or rewrite `tests/db.test.js`, `tests/assets-repo.test.js`, `tests/asset-service.test.js`, `tests/views.test.js`, or `tests/routes.test.js`.
- Do not lower `coverage.thresholds.lines` if the full coverage run fails. Fix the cause or stop and report it.
- Do not require a GitHub Actions run. The workflow file is the hosted-gate artifact.
