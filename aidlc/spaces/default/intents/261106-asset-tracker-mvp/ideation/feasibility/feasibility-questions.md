# Feasibility Questions — Asset Tracker MVP

## Sources

- [desc] Initial description: "Build the Asset Tracker MVP from the approved Asset Tracker MVP Development Workbook, the POC-vs-MVP gap analysis, the decision brief, and the fully approved 17-item decision set. The MVP adds actor-attributed append-only audit history, previous-holder preservation via last_assigned_to, lost-asset recovery (lost to in-stock), an assigned to discarded transition that resolves the assignment inline, five exclusive status buckets with Active Inventory and Total Records computed by one shared counting function and filter builder, case-insensitive category-scoped serial uniqueness via a functional index with a concurrency-safe application-level fallback, CSV export with formula-injection protection, and an amendment to workbook section 4.1 and section 21.1 Scenario 3 recording Returned as a distinct resting state."
- [scope] Workflow-selected scope: `feature`.
- [Q5] The build-vs-buy position is Build — extend the existing POC. The audit, uniqueness, and counting semantics are specific to this organisation's rules and are not a configuration option in any off-the-shelf product.
- [Q6] There is no specific external driver; the driver is operational efficiency and the absence of a system of record.
- [Q7] The realistic scale is medium — several internal teams (IT, HR, Finance, Operations) sharing a single record, hundreds to low thousands of assets.
- [memory:M2] `aidlc/spaces/default/memory/project.md#Decided`: "The fully approved 17-item Asset Tracker MVP decision set, together with the Asset Tracker MVP Development Workbook, is the binding technical and product contract for the `asset-tracker-mvp` intent; it is not reopened at any stage of that intent, and it carries seven standing conditions — the uniqueness check uses an IMMEDIATE transaction and a non-zero SQLite `busy_timeout` with `SQLITE_BUSY` mapped to a retryable error; the functional-index expression and the application-level comparison predicate use one shared definition; registration and serial/key updates enforce the same uniqueness policy; historical backfills preserve original records and audit traceability and report failures; dashboard, assignee, asset-list, and CSV counts use consistent filtering and counting definitions; every lifecycle transition has explicit validation and audit behaviour; and the existing 66/66 passing test baseline is preserved with regression tests added for newly approved behaviour. Traceability must be maintained between the approved MVP requirements and the POC requirements FR1.3, FR4.4, FR4.5, and FR5.3, and actor identity is resolved from trusted server-side context so actor information supplied in a write request is never trusted. (Stage intent-capture, 2026-11-06)"
- [memory:M3] `aidlc/spaces/default/memory/project.md#Decided`: "The decision set's amendment table names the workbook amendment surface as section 4.1 (transition table, recovery, `in-stock → lost`, `assigned → discarded`), section 4.2.5, section 4.3 (the actor-trust rule), section 4.4, section 6.1, section 6.4, section 6.5, section 9 (Screens 01, 02, 03, 04, 10), section 10, section 21.1, section 21.2, section 22, section 24 (the metric qualifiers the Audit Completeness population relies on), and the two new section 27 sections (Inventory Counting Definitions and Audit Action Vocabulary). The section 24 amendment carries the Audit Completeness qualifier verbatim: pre-MVP history is backfilled to a `system` actor and excluded from this metric. Section 4.1 records the `lost → in-stock` recovery transition with a required recovery reason drawn from the shared loss-reason vocabulary, and requires a distinct `recovered` audit action rather than `assign` or `return`, whose description names the recovery and the prior holder. It also records that complex recovery workflows — partial recovery, credit assignment, dispute handling — remain deferred, distinct from the single included recovery transition. The workbook's remaining MVP feature set is the reconciliation dashboard, the assignee directory, asset editing, duplicate-detection UX, empty states, result counts, pagination, improved search, responsive UI, and a design system. The design-system enumeration is indicative, not exhaustive: workbook section 11 is the authoritative source for the complete design-system requirements, covering semantic color tokens, a typography scale, spacing tokens, radius and shadow scales, iconography, and a light-theme implementation designed for future dark-theme extension. (Stage intent-capture, 2026-11-06)"
- [memory:M4] `aidlc/spaces/default/memory/project.md#Decided`: "The `assigned → discarded` transition resolves the assignment inline and records it: `assigned_to` is cleared, `last_assigned_to` is retained so the holder at discard time stays visible, and a `discarded` audit action records the discard, the prior holder, and the fact that the assignment was resolved by the discard. A discard reason is always required, drawn from the shared loss-reason vocabulary plus retirement-specific values. The asset row and its full history are never deleted; a discarded asset is excluded from Active Inventory but remains present in the `discarded` bucket and in Total Records, and stays accessible at its detail URL with its history intact. (Stage intent-capture, 2026-11-06)"

## What has already been established

The following were verified directly against the POC source and a live database before these
questions were written, so the questions can be asked against facts rather than assumptions:

| Finding | Evidence |
|---|---|
| The POC's audit trail is destroyed by asset deletion | `audit_log` carries `ON DELETE CASCADE` from `assets`; deleting one asset row removed its audit row (live in-memory DB) |
| The `status` CHECK constraint rejects `discarded` at the database level | `CHECK (status IN ('in-stock', 'assigned', 'returned', 'lost'))` — SQLite cannot alter a CHECK via `ALTER TABLE`, so a table rebuild is required |
| The table-rebuild technique works | The create-copy-drop-rename path was executed successfully against SQLite 3.49.2 |
| Functional indexes are supported | `CREATE UNIQUE INDEX ... ON assets(lower(trim(serial_or_key)))` succeeded on SQLite 3.49.2 |
| `busy_timeout` is already non-zero by default | better-sqlite3 11.10.0 reports `busy_timeout = 5000` on a fresh connection |
| The migration runner applies cleanly over a legacy database | A v1-only database was opened by the current runner; migration 2 applied, the legacy row survived, and `assigned_at` was added |
| The 66/66 test baseline holds | `npm test` → 5 files, 66 tests, all passing |
| There is no cloud or container posture | No AWS CLI, no Terraform, no CDK, no `Dockerfile`, no CI workflow, no `NODE_ENV`/`PORT`/`DB_PATH` configuration beyond the code defaults |
| The deployed database is machine-local | `data/` is gitignored; the live `data/assets.sqlite` holds 2 assets and 8 audit rows, at migration versions 1 and 2 |
| The design-system baseline is effectively zero | `public/styles.css` is 40 lines with no CSS custom properties, no breakpoints, and 17 class names against a workbook requirement of roughly 30 components |

## Q1. Systems this must integrate with

The build-vs-buy assessment established that the MVP is the system of record for asset
custody. It did not establish whether anything *else* at the organisation holds related data
that the MVP must read from or write to.

Which existing systems must the MVP integrate with, and in which direction?

- A. None — the MVP is self-contained; no external system holds data it needs, and it publishes nothing outward.
- B. Read-only integration — the MVP reads from existing systems (identity directory, HR system, asset discovery/inventory tooling) but writes only to its own database.
- C. Two-way integration — the MVP writes to other systems, such as posting write-offs to a finance system or raising a ticket when an asset is lost.
- D. Not yet defined
- X. Other (please specify)

[Answer]: A. None — the MVP is self-contained; no external system holds data it needs, and it publishes nothing outward.

## Q2. Regulatory and compliance requirements

The market research established that there is no regulatory deadline driving this initiative —
the driver is operational efficiency. It did not establish that no compliance obligation
*attaches* to the data the system will hold.

Which regulatory, compliance, or records-management obligations apply to the asset custody
records the MVP will hold?

- A. None — the organisation has no formal compliance obligation over internal asset custody records, beyond ordinary internal policy.
- B. General internal audit expectation only — records must be demonstrable to an internal reviewer, with no external framework imposed.
- C. A specific framework applies (e.g. SOC 2, ISO 27001, PCI-DSS, HIPAA, GDPR, a records-retention schedule, or write-off defensibility rules for financial audit) — please name it.
- D. Not yet defined
- X. Other (please specify)

[Answer]: B. General internal audit expectation only — records must be demonstrable to an internal reviewer, with no external framework imposed.

## Q3. Actor identity — the mechanism that establishes a trusted actor

This is the single highest-leverage open question carried into this stage, and it is a
feasibility question rather than a design preference. The approved decision set fixes the
*rule* — actor identity is resolved from trusted server-side context, and actor information
supplied in a write request is never trusted — but the POC deferred authentication entirely
(constraint C3), so the *mechanism* is unset. The Audit Completeness metric depends on it.

The feasibility question is what the mechanism can be, given that the MVP is a self-contained
Express + SQLite application with no identity provider, no session layer, and no existing
authentication code.

**The rule is fixed and is not reopened by this question.** Every audit entry must derive its
actor from trusted server-side context, and client-supplied identity is never trusted
[memory:M2]. What this question establishes is which *implementations* of that rule are
technically feasible for this MVP — and, at this stage, it deliberately records a
shortlist of candidates rather than a single decided mechanism, because choosing the
mechanism is a design-stage decision that depends on evidence this stage gathers.

Which mechanism should establish the trusted actor for the MVP?

- A. Server-configured single operator — the actor identity is set once in server configuration (environment variable or config file) and every write is attributed to it. Simplest and fully satisfies the actor-trust rule.
- B. Trusted request header from an authenticating proxy or reverse proxy — the actor arrives in a header that only the trusted proxy can set, with the application rejecting direct requests that lack it.
- C. Operator selection — the application presents an operator picker at the point of action, and the selected operator is recorded. Weakest of the three against the actor-trust rule, because the operator is still self-declared, though it is recorded rather than free-text.
- D. A session with a real login added to the MVP — the application authenticates users itself.
- E. Not yet defined
- X. Other (please specify)

[Answer]: D, recorded as a *candidate implementation* rather than an unconditional approved
implementation decision. Application-managed login satisfies the actor-trust rule and is the
only candidate in the set that authenticates users individually rather than asserting a
single identity or trusting an assertion from elsewhere, so it is carried forward as the
leading candidate. It is **not** adopted here: it adds authentication, credential storage,
session management, password lifecycle, and authorisation surface that the approved
17-item decision set does not name, the POC does not have, and the gap analysis did not
cost — so it carries additional scope and feasibility implications that must be made
explicit before it can be treated as decided.

Two constraints bind the shortlist. The actor-trust rule is unchanged and is not reopened
by this answer: every audit entry derives its actor from trusted server-side context, and
client-supplied identity is never trusted. And no candidate may be assumed available: the
absence of an identity provider or an authenticating proxy in the verified baseline is
recorded as a *fact about the current estate*, not as a reason to exclude the candidates
that depend on one. Whether an existing trusted authentication mechanism is present and
usable — and therefore whether application-managed sessions are necessary at all, or merely
the default when no such mechanism exists — is an evaluation this stage must carry out
rather than assume in either direction.

Candidate shortlist carried forward, with the feasibility position on each:

| Candidate | Satisfies actor-trust rule | Additional scope relative to the approved decision set |
|---|---|---|
| A. Server-configured single operator | Yes | Negligible. Satisfies the rule but attributes every entry to one identity, so it does not distinguish between actors. |
| B. Trusted request header from an authenticating proxy | Yes, if and only if the proxy is genuinely present and the application can be prevented from receiving direct requests that bypass it | Small in the application, but conditional on infrastructure that the verified baseline does not contain. |
| C. Operator selection | Weakly — the operator remains self-declared | Negligible, but it does not meet the rule as written. |
| D. Application-managed login and session | Yes | Substantial — credential storage, password lifecycle, session management, and authorisation surface, none of it named in the approved decision set. |

The leading candidate is D; the feasibility question it raises is whether D is *necessary*,
which depends on whether an existing trusted authentication mechanism turns out to be
available. That determination belongs to the feasibility assessment and the constraint
register, not to this answer.

## Q4. Team skill profile and capacity

The POC is a single-developer codebase with a layered architecture, a versioned migration
runner, an enforced state machine, and a 66-test suite. The gap analysis notes that the
workbook's 6–8 week estimate is achievable only if the design workstream is scoped to the
screens actually needed.

Who builds this, and what does the team already know?

- A. The same single developer who built the POC — full context on the codebase, no ramp-up cost, and the 6–8 week estimate is calibrated to their throughput.
- B. A small team (two or more) with mixed familiarity — some ramp-up cost, but more parallelism, and the design work can proceed in parallel with the backend.
- C. A developer unfamiliar with the POC, or a vendor/contractor — significant ramp-up cost, and the migration and audit work is the highest-risk area to hand over.
- D. Not yet defined
- X. Other (please specify)

[Answer]: A. The same single developer who built the POC — full context on the codebase, no ramp-up cost, and the 6–8 week estimate is calibrated to their throughput.

## Q5. Budget and timeline constraints

The build-vs-buy assessment recorded that the total-cost comparison is indeterminate because no
licence has been quoted — which is one of the reasons the Build position holds. It did not
establish a budget or a deadline.

What budget and timeline constraints apply?

- A. No fixed deadline and no separate budget — the MVP proceeds at the team's own pace, funded as ordinary engineering time.
- B. A target date exists, driven by an operational need (e.g. the next budget cycle, an office move, a stocktake).
- C. A budget is allocated and must not be exceeded, whether or not a date is fixed.
- D. Not yet defined
- X. Other (please specify)

[Answer]: A. No fixed deadline and no separate budget — the MVP proceeds at the team's own pace, funded as ordinary engineering time.

## Q6. Deployment target and operational environment

The verified position is that the MVP has no cloud, container, or CI posture today: it runs
from `npm start` on a single host, with a machine-local SQLite file under `data/`, and
`data/` is gitignored. The operation phase — deployment, environment provisioning,
observability, incident response, performance validation, feedback — is in scope because the
scope was widened to `feature`.

Where will the MVP run, and what does that require?

- A. Same as the POC — a single internal host, SQLite file on local disk, launched as a long-running process. The operation phase then covers the process lifecycle, backups, and observability of one instance.
- B. A managed container platform — the app is packaged and run as a container with a persistent volume for the SQLite file.
- C. A cloud VM or instance with a managed database — the SQLite file is replaced by a managed relational database, which changes the concurrency contract the approved decision set is written against.
- D. Not yet defined
- X. Other (please specify)

[Answer]: A. Same as the POC — a single internal host, SQLite file on local disk, launched as a long-running process. The operation phase then covers the process lifecycle, backups, and observability of one instance.

## Q7. Organizational blockers

The build-vs-buy assessment noted that the spreadsheet-plus-email incumbent has near-zero
switching cost and no incumbent contract to displace — the practical risk in a rollout is that
people keep using the spreadsheet.

What organizational obstacles exist to adopting the MVP over the spreadsheet?

- A. None beyond normal behaviour change — the team is willing to adopt the tool once it exists.
- B. Resistance exists — some teams will keep using the spreadsheet, and the rollout needs a way to make the tool the easier path.
- C. There are competing priorities or a change freeze that would delay adoption.
- D. Not yet defined
- X. Other (please specify)

[Answer]: D. Not yet defined

## Q8. Backfill scope for existing records

The decision set's standing conditions require historical backfills to preserve original
records and audit traceability and to report failures. The verified live database holds 2
assets and 8 audit rows at migration versions 1 and 2, with audit rows that have no actor
because the POC's audit table has no `actor_id` column at all.

How should the MVP treat the pre-MVP records that exist?

- A. Backfill in place — pre-MVP audit rows are given a `system` actor and are excluded from the Audit Completeness metric, per the approved §24 amendment.
- B. Start clean — the MVP begins with an empty record set, and the pre-MVP rows are archived or discarded deliberately.
- C. Both — backfill in place, and additionally provide a one-off import path for a spreadsheet extract so historical custody can be reconstructed.
- D. Not yet defined
- X. Other (please specify)

[Answer]: A. Backfill in place — pre-MVP audit rows are given a `system` actor and are excluded from the Audit Completeness metric, per the approved §24 amendment.

## Assumption Confirmation

- A. Accept assumptions
- B. Convert to follow-up questions

- [assumption] The POC's technical baseline is verified directly against the source and a live database — audit cascade destruction, the `status` CHECK constraint excluding `discarded`, functional-index support, the non-zero default `busy_timeout`, the clean migration over a legacy database, the 66/66 test baseline, the absence of CI/container/cloud posture, and the machine-local nature of `data/`. These are observations, not estimates, and are not treated as assumptions.
- [assumption] The absence of any recorded compliance framework is not treated as a compliance clearance. The market research established that there is no regulatory *driver* for the initiative; whether an obligation *attaches* to the custody data is a separate question, which is why Q2 asks it directly. Until Q2 is answered, the compliance position is recorded as "not established" rather than "none".
- [assumption] The `feature` scope places the operation phase in scope, so the deployment target and the operational environment are feasibility questions rather than later-stage decisions. Q6 asks for the deployment target because the verified position — a single host with a machine-local SQLite file — is materially different from a container platform or a managed database, and the choice changes the concurrency contract the approved decision set is written against.
- [assumption] The actor-identity *rule* is fixed and is not reopened by this stage: every audit entry must derive its actor from trusted server-side context, and client-supplied identity is never trusted [memory:M2]. What remains open is the *mechanism* that implements it. The POC deferred authentication entirely and the 17-item decision set does not mention it, so Q3 records a shortlist of candidates with application-managed login as the leading candidate rather than a decided implementation. No candidate is assumed available or unavailable: the absence of an identity provider or authenticating proxy in the verified baseline is a fact about the current estate, and whether application-managed sessions are necessary or merely the fallback depends on an evaluation this stage carries out rather than an assumption made in either direction.
- [assumption] No AWS or cloud landscape is assessed. The verified position is that no AWS CLI, no Terraform, no CDK, no Dockerfile, and no CI workflow exist, and the POC runs from a local Node process against a local SQLite file. The platform perspective therefore records what the chosen deployment target implies, rather than proposing a cloud architecture that the evidence does not support.
- [assumption] Organizational adoption readiness is **not** resolved by this stage. Q7's answer is "not yet defined", and the market research records the same gap as residual uncertainty U1 — the internal existing-tool inventory was never gathered and no licence was quoted. This is carried as an open RAID item rather than as a mitigated risk, because the incumbent spreadsheet-plus-email process has near-zero switching cost and no incumbent contract to displace: the practical failure mode is that teams continue using the spreadsheet, which no technical feasibility finding can retire. The assumption recorded here is only that the position is unknown and must be treated as unknown, not that adoption risk is low.

[Answer]: A. Accept assumptions

## Consolidated Summary Confirmation

- Looks correct
- Request changes

[Answer]: Looks correct

## Requested Changes Feedback

- Keep the actor-identity requirement unchanged: every audit entry must derive its actor from trusted server-side context, never from client-supplied identity.
- Revise the Q3 decision so that application-managed login is recorded as a candidate implementation with additional scope and feasibility implications, not as an unconditional approved implementation decision.
- Evaluate whether application-managed sessions are necessary or whether an existing trusted authentication mechanism can satisfy the actor-trust invariant. Do not assume an existing identity provider or proxy is available.
- Preserve organizational adoption readiness as an open RAID item.
- Keep the other seven answers unchanged.

[Answer]: Keep the actor-identity requirement unchanged: every audit entry must derive its actor from trusted server-side context, never from client-supplied identity. Revise the Q3 decision so that application-managed login is recorded as a candidate implementation with additional scope and feasibility implications, not as an unconditional approved implementation decision. Evaluate whether application-managed sessions are necessary or whether an existing trusted authentication mechanism can satisfy the actor-trust invariant. Do not assume an existing identity provider or proxy is available. Preserve organizational adoption readiness as an open RAID item. Keep the other seven answers unchanged.
