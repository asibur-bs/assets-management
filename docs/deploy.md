# Deploy runbook

The asset tracker runs as one long-running Node process on the single internal host, with a machine-local SQLite file. There is no second host, no container, and no staging environment. Backups stay on the host. They are not CI artifacts.

The host Node version is **20.20.0**, the same patch the GitHub Actions workflow pins. Confirm it before installing:

```bash
node -v
```

`node -v` must print `v20.20.0`. Setup, this runbook, and CI install with `npm ci`. Do not use `npm install`.

Run every command from the repository root.

## Deploy

1. Install the lockfile tree.

   ```bash
   npm ci
   ```

2. Stop the process. The process command line contains `src/server.js`. No other Node process is the server. Leave it stopped until the backup finishes. `scripts/backup-database.sh` exits non-zero if that process is still running.

3. Back up the database, including the WAL and SHM sidecars when they exist. `DB_PATH` defaults to `data/assets.sqlite`. `BACKUP_ROOT` defaults to `backups/`. The copy lands in `backups/YYYYMMDD-HHMMSS/`. After a successful copy the script keeps the three newest timestamp directories.

   ```bash
   bash scripts/backup-database.sh
   ```

   Record the new directory name. That directory is the pre-migrate backup for this deploy.

4. Apply migrations while the process is still stopped. Opening the database applies any pending migration and then closes the handle:

   ```bash
   node -e "const { openDatabase } = require('./src/db'); const db = openDatabase(process.env.DB_PATH || 'data/assets.sqlite'); db.close();"
   ```

5. Start the process again. Set `PORT` and `DB_PATH` to the host's values.

   ```bash
   PORT=3000 DB_PATH=data/assets.sqlite npm start
   ```

6. Smoke-test the running process. `SMOKE_BASE_URL` is required. The script registers one asset, assigns it, reads `audit_log` from the same `DB_PATH` the server is using, and exits 0 only when registration, the transition, a non-empty server-written actor, and the audit row count all pass. The actor is the assignee the server wrote into the assign audit description. The script does not add an actor column.

   ```bash
   SMOKE_BASE_URL=http://127.0.0.1:3000 DB_PATH=data/assets.sqlite bash scripts/smoke-deploy.sh
   ```

7. Record the deployed commit SHA.

   ```bash
   git rev-parse HEAD
   ```

   Write that SHA next to the smoke result in the host deploy log.

8. Product-owner sign-off. A deploy is not complete until the product owner signs off. Sign-off happens only after the smoke script exits 0.

## When smoke fails

A failed smoke is a failed deploy. Do not report it as successful. Do not repair the migrated database in place.

The only next action is:

1. Stop the process.
2. Restore the pre-migrate backup taken in step 3. Replace the database file and, when the backup directory contains them, the `-wal` and `-shm` sidecars. Remove a sidecar from the live path when the backup directory does not contain that sidecar.
3. Check out the previous commit.
4. Run `npm ci` if the lockfile differs from the failed commit.
5. Start the process again.
6. Record the failed deploy as failed: the commit SHA that was attempted, and the smoke result.

Do not take any other recovery action on this host.
