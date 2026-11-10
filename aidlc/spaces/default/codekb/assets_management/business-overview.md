# Business Overview

## Business Domain

Internal asset tracking. The system records physical assets (hardware) and software
licenses, and tracks where each one is and who holds it across a small closed
lifecycle. There is no multi-tenancy, no customer-facing surface, and no
billing, pricing, or regulatory reporting dimension.

Two asset categories are recognised, fixed by a database `CHECK` constraint and
mirrored in application code (`src/db/migrations.sql:12`,
`src/repositories/assets-repo.js:5`):

| Category | Meaning |
|---|---|
| `hardware` | A physical item with a serial number. |
| `software-license` | A software entitlement with a licence key. |

Both are identified by a `serial_or_key` value. The category scopes that
identifier, so the same serial string may legitimately exist under both
categories.

## Purpose

The application is a **proof of concept** (`package.json:6` — "Internal
asset-tracking system (poc)"). Its stated purpose is to prove the core idea of an
internal asset-tracking system end-to-end, and it is explicitly minimal:
`README.md:67` records "no authentication, no bulk operations, no notifications,
no multi-tenant" as deliberate omissions, not gaps.

What it does (`README.md:26-31`):

- **Register** an asset — category, name, serial/key, optional model, notes, and
  an optional assignee.
- **List** assets — free-text search over name and serial, filters on category
  and status, sorting by name or creation date.
- **View** an asset — the full record, its current state, and its most recent
  audit entry.
- **Transition** an asset through the lifecycle.

## Key Functionality

### The asset lifecycle

The lifecycle is a **closed state machine** with four states and five legal
transitions. It is defined once in `src/services/asset-service.js:5-10`:

```
in-stock  -> assigned
assigned  -> returned | lost
returned  -> assigned | lost
lost      -> (terminal)
```

`README.md:38-44` documents the same four rules in prose. The same set is
repeated, independently, in four other places — see
[code-quality-assessment.md](code-quality-assessment.md) § Technical Debt for the
full six-location list.

One rule is not derivable from the state machine alone: a newly registered asset
is **always** persisted as `in-stock`, even when the registration form supplies
an assignee. The assignee is stored as a plain field and does not move the asset
out of `in-stock` (`src/repositories/assets-repo.js:48-52`,
`src/services/asset-service.js:35-37`, asserted at
`tests/assets-repo.test.js` FR1.5 and `tests/routes.test.js:52`). The asset
only enters `assigned` through the explicit assign action.

### State side-effects

| Transition | `status` | `assigned_to` | `assigned_at` | `returned_at` | Audit action |
|---|---|---|---|---|---|
| register | `in-stock` | set if supplied | null | null | `create` |
| assign | `assigned` | set to assignee | set to now | cleared to null | `assign` |
| return | `returned` | cleared to null | unchanged | set to now | `return` |
| mark lost | `lost` | cleared to null | unchanged | unchanged | `mark-lost` |

Every write also refreshes `updated_at`. The `assigned_at` / `returned_at`
columns are the POC requirement FR4.6 / FR4.7 surface, added by migration v2
rather than by table redefinition (`src/db/migrate.js:21-32`).

### Audit trail

A single `audit_log` table records `(id, asset_id, action, description,
created_at)` (`src/db/migrations.sql:29-36`). Every registration and every
lifecycle transition appends one row. The detail view renders only the **most
recent** entry, under the heading "Recent activity"
(`src/repositories/assets-repo.js:116-124`, `views/detail.ejs:16-23`);
`README.md:48` states plainly that "the full audit log is not exposed in the UI".

### Duplicate protection

A `UNIQUE (category, serial_or_key)` constraint is the only duplicate defence
(`src/db/migrations.sql:26`). The application does not pre-check; it inserts and
relies on the database to reject, then maps the failure to a
`DUPLICATE_ASSET` error (`src/repositories/assets-repo.js:69-76`).

### What the application does not do

There is no counting, no dashboard, no assignee directory, no CSV export, and no
actor concept. Verified by exhaustive grep across `src/`, `tests/`, and `views/`
for `csv`, `export`, `count`, `dashboard`, `actor`, `operator`, and `acting` —
the only matches are `module.exports` lines. **All five of these are greenfield
capabilities with no partial implementation to extend.** See
[architecture.md](architecture.md) § Absent Capabilities.

## Deployment and Operating Context

Single-process Node.js HTTP server on a single port, backed by one local SQLite
file. No container definition, no infrastructure-as-code, no CI pipeline, and no
deployment configuration of any kind exists in the repository — only local
`npm install` / `npm start` / `npm test` is documented
(`README.md:5-24`). See [technology-stack.md](technology-stack.md).

## Out of Scope of This Document

This document describes the business domain **as the code implements it today**.
The approved Asset Tracker MVP extends this domain (actor-attributed history,
five exclusive buckets, a discarded state, a recovery transition, CSV export, an
assignee directory, a reconciliation dashboard); that future shape is not
described here. Downstream Inception stages should read the Ideation artifacts
under `aidlc/spaces/default/intents/261106-asset-tracker-mvp/ideation/` for the
approved target, and this document for the current baseline it extends.
