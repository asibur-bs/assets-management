# Requirements

## Intent Analysis

Internal teams (IT, HR, Finance, Operations) currently track company assets through spreadsheets, email, and paper — there is no system of record. The proof of concept (`poc`) builds the smallest end-to-end slice that proves the core idea: a single web application where any internal staff member can register an asset, look it up, assign it to an employee, and record its return. The goal is to validate the workflow shape, not to ship a production-ready system. [intent] [scope]

The `poc` covers two asset categories — IT hardware and software/licenses — over a single shared internal user (no authentication), backed by SQLite, with a server-rendered HTML UI. Success means: an asset can be created in a small number of clicks, located in seconds, and every state change has a visible recent-edit trail. [Q1] [Q2] [Q8] [Q10]

## Functional Requirements

### FR1 — Asset Registration

A user can register a new asset by submitting a web form. The form captures the fields needed to identify and later locate the asset.

- **FR1.1** The system shall accept the following required fields at registration: `category` (hardware | software-license), `name`, `serial-or-key`.
- **FR1.2** The system shall accept optional fields: `model`, `notes`, `assigned-to` (employee name string).
- **FR1.3** The system shall reject duplicate assets on `(category, serial-or-key)`.
- **FR1.4** On successful registration, the system shall redirect to the asset list view with the new asset visible.
- **FR1.5** Each new asset shall be persisted in SQLite with a UUID, timestamps, and the current state set to `in-stock`.

### FR2 — Asset Lookup and List View

A user can locate any asset in seconds and inspect its current state.

- **FR2.1** The asset list view shall display all assets with columns: name, category, serial-or-key, status, assigned-to.
- **FR2.2** The list view shall support free-text search across name and serial-or-key.
- **FR2.3** The list view shall support filter by category and by status.
- **FR2.4** The list view shall support sort by name and by registration date (newest/oldest).
- **FR2.5** Each asset row shall be a link to the asset detail view.

### FR3 — Asset Detail View

A user can open a single asset and see its full state and recent edit trail.

- **FR3.1** The detail view shall display all asset fields.
- **FR3.2** The detail view shall display the most recent change (who, when, what changed).
- **FR3.3** The detail view shall offer actions appropriate to the current state (assign, mark returned, mark lost).

### FR4 — Assignment Lifecycle

An asset moves through a fixed set of states. Only valid transitions are allowed.

- **FR4.1** The states shall be: `in-stock`, `assigned`, `returned`, `lost`.
- **FR4.2** From `in-stock`, the only valid transition is to `assigned` (via the assign action).
- **FR4.3** From `assigned`, the valid transitions are to `returned` (via the return action) or to `lost` (via the mark-lost action).
- **FR4.4** From `returned`, the valid transition is to `assigned` or `lost`.
- **FR4.5** `lost` is a terminal state.
- **FR4.6** Assigning an asset shall record the assignee name and the assignment timestamp.
- **FR4.7** Recording a return shall clear the assignee and record the return timestamp.
- **FR4.8** Every transition shall update the asset's `updated-at` timestamp.

### FR5 — Audit Trail (Last-Action)

The system shall keep a lightweight edit trail so users can trust the data is current.

- **FR5.1** Every state transition and field change shall append an audit entry with: timestamp, action type, and a short description of what changed.
- **FR5.2** The asset detail view shall display the most recent audit entry (FR3.2).
- **FR5.3** The full audit log shall not be exposed in the UI in the `poc`.

## Non-Functional Requirements

- **NFR1** Asset registration (FR1) shall be reachable from the list view in 2 clicks or fewer.
- **NFR2** Any asset record shall be locatable from the list view in 5 seconds or fewer by an internal user on a normal office network.
- **NFR3** The system shall run from a single `npm start` (or equivalent) invocation with no external service dependencies beyond SQLite (which is embedded).
- **NFR4** The application shall be deployable to a single Linux/macOS host.
- **NFR5** Concurrent access from at most 5 users shall not corrupt asset state (SQLite single-writer assumption, acknowledged for `poc`).
- **NFR6** No PII beyond an assignee name string shall be stored. The system shall not log assignee names to any external service.
- **NFR7** The codebase shall be runnable end-to-end with documented setup steps in a README.

## Constraints

- **C1** Scope is `poc` per the workflow-selected scope signal. No multi-tenant, no SSO, no advanced reporting. [scope]
- **C2** Asset categories are limited to hardware and software/licenses for this `poc`. Office/facility assets are out of scope. [Q1]
- **C3** Authentication is out of scope for this `poc` (single shared internal user). [Q2]
- **C4** Persistence is SQLite only. No external database is provisioned. [Q8]
- **C5** Frontend is server-rendered HTML with a lightweight CSS layer. No SPA framework, no client-side routing. [Q10]

## Assumptions

- **A1** The system runs on a single host under the developer's control; no requirement for multi-host deployment. [assumption]
- **A2** The internal team is trusted — no per-user audit attribution in this `poc` (only "last change" without an actor identity). [Q2] [Q5]
- **A3** Five concurrent users is the upper bound for the `poc`; SQLite's single-writer behavior is acceptable. [NFR5]
- **A4** Browser support targets modern evergreen browsers only (Chrome, Firefox, Edge, Safari — last 2 years). [assumption]
- **A5** The assignee name is captured as a free-text string; no directory integration in the `poc`. [FR1.2] [FR4.6]

## Out of Scope

- Authentication and per-user authorization. [C3]
- Multi-tenant or cross-company usage. [intent]
- Office/facility asset tracking (desks, chairs, buildings). [Q1]
- Barcode/QR scanning, RFID, or any automated capture. [Q7]
- Bulk CSV import. [Q7]
- Full searchable audit log UI. [FR5.3]
- Email or Slack notifications on state change.
- Reporting dashboards, charts, or analytics.
- Mobile applications.
- Offline or degraded-mode behavior.

## Open Questions

- **OQ1** Which lightweight CSS approach should the `poc` use? (Plain CSS vs. Tailwind via CDN vs. a small component library.) To be decided in Code Generation. [Code Generation]
- **OQ2** Should the `poc` seed sample assets so the list view is non-empty on first run, or start empty? (Default: seed a small handful for the demo.) To be decided in Code Generation. [Code Generation]
- **OQ3** What is the exact runtime — Node.js, Python, or another? To be decided in Code Generation. [Code Generation]