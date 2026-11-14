# Deploy runbook

The asset tracker runs as one long-running Node process on the single internal host, with a machine-local SQLite file. There is no second host, no container, and no staging environment. Backups stay on the host. They are not CI artifacts.

The host Node version is **24.21.0**, the same patch the GitHub Actions workflow pins. Confirm it before installing:

```bash
node -v
```

`node -v` must print `v24.21.0`. Setup, this runbook, and CI install with `npm ci`. Do not use `npm install`.

Install local git hooks after clone (works even when `CI=true`):

```bash
npm run hooks:install
```

`npm ci` / `npm install` also run `prepare` → `lefthook install`.

Run every command from the repository root.

## Deploy

1. Stop the process. The process command line contains `src/server.js`. No other Node process is the server. Leave it stopped through the backup, the install, and the migration. `scripts/backup-database.sh` exits non-zero if that process is still running.

2. Back up the database, including the WAL and SHM sidecars when they exist. `DB_PATH` defaults to `data/assets.sqlite`. `BACKUP_ROOT` defaults to `backups/`. The copy lands in `backups/YYYYMMDD-HHMMSS/`. This step does **not** prune older backups.

   ```bash
   bash scripts/backup-database.sh
   ```

   Record the new directory name. That directory is the pre-migrate backup for this deploy. `npm ci` runs only after this command exits 0.

3. Snapshot audit history from that backup, before any migration. Point `DB_PATH` at the backup copy, not at the live database.

   ```bash
   DB_PATH=backups/YYYYMMDD-HHMMSS/assets.sqlite \
     SMOKE_AUDIT_BASELINE=/tmp/audit-baseline.json \
     bash scripts/snapshot-audit-baseline.sh
   ```

   Keep `/tmp/audit-baseline.json` for the smoke. Do not snapshot the live database after migrations. A later empty `audit_log` must not become the baseline.

4. Install the lockfile tree while the process is still stopped.

   ```bash
   npm ci
   ```

5. Apply migrations while the process is still stopped. Opening the database applies any pending migration and then closes the handle:

   ```bash
   node -e "const { openDatabase } = require('./src/db'); const db = openDatabase(process.env.DB_PATH || 'data/assets.sqlite'); db.close();"
   ```

6. Start the process in another session, or under a supervisor. `npm start` does not return. Leave that process running. The smoke in the next step runs against it. Stopping the process to get this shell back makes the smoke fail, and the failure section then requires restoring the backup and checking out the previous commit.

   ```bash
   PORT=3000 DB_PATH=data/assets.sqlite npm start
   ```

7. Smoke-test the running process from the shell that is not running the server. `SMOKE_BASE_URL` and `SMOKE_AUDIT_BASELINE` are required. The baseline is the file from step 3. The script registers one asset, assigns it, then fails closed unless:
   - `audit_log.actor` exists and the latest row's actor is non-empty (server-stored; mechanism is `OQ1` / U1–U3),
   - every pre-migration audit row in the baseline is still present and unchanged,
   - the post-deploy audit count is at least the baseline count plus the rows this smoke appended.

   A non-zero baseline count whose rows are gone exits non-zero and does not prune. On success the script prunes `BACKUP_ROOT` so only the three newest timestamp directories remain (security-design Q4).

   ```bash
   SMOKE_BASE_URL=http://127.0.0.1:3000 DB_PATH=data/assets.sqlite \
     SMOKE_AUDIT_BASELINE=/tmp/audit-baseline.json \
     bash scripts/smoke-deploy.sh
   ```

8. Record the deployed commit SHA.

   ```bash
   git rev-parse HEAD
   ```

   Write that SHA next to the smoke result in the host deploy log.

9. Product-owner sign-off. Sign-off is allowed **only after** the smoke script exits 0. A non-zero smoke withholds sign-off; the deploy is not complete and must not be reported successful.

## When smoke fails

A failed smoke is a failed deploy. Do not report it as successful. Do not repair the migrated database in place. Do not collect product-owner sign-off.

The only next action is:

1. Stop the process.
2. Restore the pre-migrate backup taken in step 2. Replace the database file and, when the backup directory contains them, the `-wal` and `-shm` sidecars. Remove a sidecar from the live path when the backup directory does not contain that sidecar.
3. Check out the previous commit.
4. Run `npm ci` if the lockfile differs from the failed commit.
5. Start the process again.
6. Record the failed deploy as failed: the commit SHA that was attempted, and the smoke result.

Do not take any other recovery action on this host. Do not prune backups after a failed smoke.
