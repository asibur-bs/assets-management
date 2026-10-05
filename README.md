# Asset Tracker (poc)

Internal asset-tracking system. Server-rendered web app backed by SQLite.

## Quick start

```bash
npm install
npm start
```

The app listens on `http://localhost:3000`. On first run it creates `data/assets.sqlite` with the schema applied.

## Tests

```bash
npm test            # runs the entire suite
npm run test:db     # schema + migrations only
npm run test:repo   # repository only
npm run test:service
npm run test:routes
npm run test:views
```

## What it does

- **Register** an asset (hardware or software/license) with category, name, serial/key, optional model, notes, and optional assignee.
- **List** all assets with text search, filter by category/status, sort by name or created date.
- **View** an asset's full record, current state, and most recent activity.
- **Transition** an asset through the lifecycle: `in-stock -> assigned -> returned -> lost`.

The lifecycle is enforced by a closed state machine:

- `in-stock` -> `assigned`
- `assigned` -> `returned` or `lost`
- `returned` -> `assigned` or `lost`
- `lost` is terminal

## Configuration

| Env | Default | Description |
|-----|---------|-------------|
| `PORT` | `3000` | HTTP port |
| `DB_PATH` | `data/assets.sqlite` | SQLite database file path. Use `:memory:` for ephemeral. |

## Why this exists

This `poc` proves the core idea of an internal asset-tracking system end-to-end. It is intentionally minimal: no authentication, no bulk operations, no notifications, no multi-tenant. See `aidlc/spaces/default/intents/261004-poc/` for the traceable requirements and design artifacts.

## Code layout

```
src/
  app.js              # Express app factory
  server.js           # entry point
  db/
    index.js          # database opener
    migrate.js        # schema SQL
  repositories/
    assets-repo.js    # SQL-backed asset CRUD + audit
  services/
    asset-service.js  # business logic, audit emission, state machine
  routes/
    assets.js         # Express router
views/
  list.ejs, new.ejs, detail.ejs, error.ejs, _header.ejs, _footer.ejs
public/
  styles.css
tests/
  db.test.js, assets-repo.test.js, asset-service.test.js, routes.test.js, views.test.js
```