# Constraint Register — Asset Tracker MVP

## Sources

- [desc] Initial description: "Build the Asset Tracker MVP from the approved Asset Tracker MVP Development Workbook, the POC-vs-MVP gap analysis, the decision brief, and the fully approved 17-item decision set. The MVP adds actor-attributed append-only audit history, previous-holder preservation via last_assigned_to, lost-asset recovery (lost to in-stock), an assigned to discarded transition that resolves the assignment inline, five exclusive status buckets with Active Inventory and Total Records computed by one shared counting function and filter builder, case-insensitive category-scoped serial uniqueness via a functional index with a concurrency-safe application-level fallback, CSV export with formula-injection protection, and an amendment to workbook section 4.1 and section 21.1 Scenario 3 recording Returned as a distinct resting state."
- [scope] Workflow-selected scope: `feature`.
- [Q1] The MVP is self-contained; no external system holds data it needs, and it publishes nothing outward.
- [Q2] No formal compliance obligation over internal asset custody records applies beyond ordinary internal policy; records must be demonstrable to an internal reviewer, with no external framework imposed.
- [Q3] Application-managed login is the leading candidate mechanism for the trusted actor, recorded as a candidate implementation with additional scope and feasibility implications rather than an unconditional approved implementation decision. The actor-trust rule itself is fixed and is not reopened.
- [Q4] The same single developer who built the POC builds this, with full context on the codebase and no ramp-up cost.
- [Q5] No fixed deadline and no separate budget; the MVP proceeds at the team's own pace, funded as ordinary engineering time.
- [Q6] Same as the POC — a single internal host, SQLite file on local disk, launched as a long-running process.
- [Q7] Organizational adoption readiness is not yet defined.
- [Q8] Backfill in place — pre-MVP audit rows are given a `system` actor and excluded from the Audit Completeness metric.
- [memory:M2] `aidlc/spaces/default/memory/project.md#Decided`: "The fully approved 17-item Asset Tracker MVP decision set, together with the Asset Tracker MVP Development Workbook, is the binding technical and product contract for the `asset-tracker-mvp` intent; it is not reopened at any stage of that intent, and it carries seven standing conditions — the uniqueness check uses an IMMEDIATE transaction and a non-zero SQLite `busy_timeout` with `SQLITE_BUSY` mapped to a retryable error; the functional-index expression and the application-level comparison predicate use one shared definition; registration and serial/key updates enforce the same uniqueness policy; historical backfills preserve original records and audit traceability and report failures; dashboard, assignee, asset-list, and CSV counts use consistent filtering and counting definitions; every lifecycle transition has explicit validation and audit behaviour; and the existing 66/66 passing test baseline is preserved with regression tests added for newly approved behaviour. Traceability must be maintained between the approved MVP requirements and the POC requirements FR1.3, FR4.4, FR4.5, and FR5.3, and actor identity is resolved from trusted server-side context so actor information supplied in a write request is never trusted. (Stage intent-capture, 2026-11-06)"
- [memory:M3] `aidlc/spaces/default/memory/project.md#Decided`: "The decision set's amendment table names the workbook amendment surface as section 4.1 (transition table, recovery, `in-stock → lost`, `assigned → discarded`), section 4.2.5, section 4.3 (the actor-trust rule), section 4.4, section 6.1, section 6.4, section 6.5, section 9 (Screens 01, 02, 03, 04, 10), section 10, section 21.1, section 21.2, section 22, section 24 (the metric qualifiers the Audit Completeness population relies on), and the two new section 27 sections (Inventory Counting Definitions and Audit Action Vocabulary). The section 24 amendment carries the Audit Completeness qualifier verbatim: pre-MVP history is backfilled to a `system` actor and excluded from this metric. Section 4.1 records the `lost → in-stock` recovery transition with a required recovery reason drawn from the shared loss-reason vocabulary, and requires a distinct `recovered` audit action rather than `assign` or `return`, whose description names the recovery and the prior holder. It also records that complex recovery workflows — partial recovery, credit assignment, dispute handling — remain deferred, distinct from the single included recovery transition. The workbook's remaining MVP feature set is the reconciliation dashboard, the assignee directory, asset editing, duplicate-detection UX, empty states, result counts, pagination, improved search, responsive UI, and a design system. The design-system enumeration is indicative, not exhaustive: workbook section 11 is the authoritative source for the complete design-system requirements, covering semantic color tokens, a typography scale, spacing tokens, radius and shadow scales, iconography, and a light-theme implementation designed for future dark-theme extension. (Stage intent-capture, 2026-11-06)"
- [memory:M4] `aidlc/spaces/default/memory/project.md#Decided`: "The `assigned → discarded` transition resolves the assignment inline and records it: `assigned_to` is cleared, `last_assigned_to` is retained so the holder at discard time stays visible, and a `discarded` audit action records the discard, the prior holder, and the fact that the assignment was resolved by the discard. A discard reason is always required, drawn from the shared loss-reason vocabulary plus retirement-specific values. The asset row and its full history are never deleted; a discarded asset is excluded from Active Inventory but remains present in the `discarded` bucket and in Total Records, and stays accessible at its detail URL with its history intact. (Stage intent-capture, 2026-11-06)"

## Purpose and Scope of This Register

This register records the constraints that bound the Asset Tracker MVP — what is fixed, what
is assumed, what is imposed by the environment, and what is not yet decided. It is the
complement to the feasibility assessment: that artifact judges whether the work can be
done, and this one records the conditions under which it must be done.

A constraint here is anything that narrows the solution space without being a decision the
MVP has made. Constraints are recorded with their source and their **binding status**,
because the difference between a constraint that cannot move and one that merely has not
moved yet determines how much of the design space is genuinely open.

**Binding status values used in this register:**

| Status | Meaning |
|---|---|
| **Fixed** | Bound by the approved 17-item decision set, the Development Workbook, or the confirmed scope. Cannot change without a new human approval round. |
| **Environment** | Imposed by the technical estate as it actually exists. Can only be changed by changing the estate. |
| **Confirmed** | Settled by an answer in this stage or an upstream stage, and open to change only through a new question to the human. |
| **Open** | Not settled. Carried as an issue, not as a constraint, because an unsettled thing is not yet a bound. |

This register is derived from the upstream `intent-statement` artifact produced by the
intent-capture stage, and from the `competitive-analysis`, `market-trends`, and
`build-vs-buy` artifacts produced by the market-research stage, all of which are consumed
by this stage.

## Technical Constraints

| ID | Constraint | Status | Source | Consequence |
|---|---|---|---|---|
| TC-01 | The uniqueness check must run inside an IMMEDIATE transaction, with a non-zero SQLite `busy_timeout`, and `SQLITE_BUSY` mapped to a retryable error | **Fixed** | [memory:M2] | The uniqueness check cannot be a plain read-then-write. The application must distinguish a retryable database-busy error from a genuine duplicate, and the two must not share an error path |
| TC-02 | The functional-index expression and the application-level comparison predicate must be one shared definition | **Fixed** | [memory:M2] | A single definition is the source of truth for the normalised serial or key. Two separate definitions would allow the index and the check to disagree, which is exactly the class of defect this MVP exists to eliminate |
| TC-03 | Registration and serial-or-key updates must enforce the same uniqueness policy | **Fixed** | [memory:M2] | The policy cannot be enforced only at creation. An update path that bypasses it reopens the duplicate-registration defect through the back door |
| TC-04 | Dashboard, assignee, asset-list, and CSV counts must use consistent filtering and counting definitions | **Fixed** | [memory:M2] | The guarantee is by construction: one shared counting function and one filter builder, consumed by all four surfaces. A surface that computes its own count breaks the guarantee silently |
| TC-05 | Every lifecycle transition must have explicit validation and audit behaviour | **Fixed** | [memory:M2] | Each transition in the expanded state machine names its validation rules and its audit action, with no implicit or default behaviour |
| TC-06 | Actor identity is resolved from trusted server-side context; actor information supplied in a write request is never trusted | **Fixed** | [memory:M2] | The actor-trust rule. It constrains the design space of actor mechanisms without selecting one, and it is not reopened by this stage |
| TC-07 | The `status` CHECK constraint cannot admit `discarded` without a table rebuild | **Environment** | Verified against the live database | SQLite cannot alter a CHECK constraint via `ALTER TABLE`. The `assets` table must be replaced by the create-copy-drop-rename path, which has been executed successfully against this SQLite version |
| TC-08 | The `audit_log` table's `ON DELETE CASCADE` destroys history on asset deletion, and the table has no actor column at all | **Environment** | Verified against the live database | The audit table must be replaced, not altered. The pre-MVP rows have no actor to preserve, which is why Q8's backfill is necessary |
| TC-09 | `busy_timeout` is already non-zero by default (5000, via better-sqlite3 11.10.0) | **Environment** | Verified against a live connection | TC-01's `busy_timeout` requirement is satisfied by the current default rather than needing new configuration. It remains a standing condition that must not be set to zero |
| TC-10 | SQLite supports functional unique indexes, enabling `lower(trim(serial_or_key))` at the schema level | **Environment** | Verified against the live database | The case-insensitive uniqueness requirement is achievable declaratively rather than only in application code |
| TC-11 | The migration runner applies cleanly over a legacy database, preserving existing rows | **Environment** | Verified against a v1-only database | The table rebuilds can be expressed as migrations rather than as manual database surgery. This is the single most load-bearing component in the MVP |
| TC-12 | The app is a synchronous, single-process Node application over better-sqlite3 | **Environment** | Verified from `src/db/index.js` and `src/server.js` | better-sqlite3 is synchronous, so the IMMEDIATE transaction in TC-01 is straightforward and there is no async-await gap inside which another writer could interleave |
| TC-13 | The 66/66 test baseline must be preserved, with regression tests added for newly approved behaviour | **Fixed** | [memory:M2] | No existing test may be weakened or removed. New behaviour arrives with new tests, and the existing suite stays green throughout |
| TC-14 | Traceability must be maintained between the approved MVP requirements and the POC requirements FR1.3, FR4.4, FR4.5, and FR5.3 | **Fixed** | [memory:M2] | The four POC requirements are named and must remain traceable from the MVP requirements that satisfy them |
| TC-15 | The `assets` repository's update path writes every column unconditionally | **Environment** | Verified from `src/repositories/assets-repo.js` | A partial update that omits a column will clear it. This is the mechanism behind the R5 clobber risk and it constrains how the new `last_assigned_to` semantics can be implemented |
| TC-16 | The `status` set in the repository layer (`in-stock`, `assigned`, `returned`, `lost`) does not yet include `discarded` | **Environment** | Verified from `src/repositories/assets-repo.js` | The repository's allowed-value set and the schema's CHECK constraint must be extended together; extending only one produces a mismatch between what the application accepts and what the database stores |

## Scope and Process Constraints

| ID | Constraint | Status | Source | Consequence |
|---|---|---|---|---|
| SC-01 | The approved 17-item decision set and the Development Workbook are the binding technical and product contract, and are not reopened at any stage of this intent | **Fixed** | [memory:M2] | This stage assesses feasibility against the approved contract. It does not reopen it, and it introduces no new product decision |
| SC-02 | Scope is fixed for this MVP; changes require a new approval round | **Confirmed** | [Q6] | Any scope addition — including the cost of an actor mechanism not named in the decision set — needs a human approval round rather than a quiet absorption into the build |
| SC-03 | The workflow scope is `feature`, running 33 of 33 stages with no stage skipped, and the product boundary explicitly includes the operation phase | **Confirmed** | [Q8] | Deployment, environment provisioning, observability, incident response, performance validation, and feedback are in scope. This is why the deployment target is a feasibility question rather than a later-stage decision |
| SC-04 | No change may be made to the POC's approved scope, approval fingerprints, code, database, tests, or configuration during Stage 1 | **Fixed** | The intent's out-of-scope list | The POC remains untouched throughout ideation. Everything in this register is a constraint on *future* work, not a licence to start work |
| SC-05 | Complex recovery workflows — partial recovery, credit assignment, dispute handling — remain deferred, distinct from the single included `lost → in-stock` transition | **Fixed** | [memory:M3] | The recovery transition is one edge in the state machine, not a workflow engine. Building capability for the deferred cases would exceed the approved scope |
| SC-06 | The workbook amendment surface is the list given in the decision set's amendment table | **Fixed** | [memory:M3] | The workbook amendment is bounded: sections 4.1, 4.2.5, 4.3, 4.4, 6.1, 6.4, 6.5, 9 (Screens 01, 02, 03, 04, 10), 10, 21.1, 21.2, 22, 24, and the two new section 27 sections |
| SC-07 | The design-system enumeration is indicative, not exhaustive; workbook section 11 is the authoritative source | **Fixed** | [memory:M3] | The design system must be specified from the workbook, not from the summary list carried in the decision set |
| SC-08 | No deadline and no separate budget — the MVP proceeds as ordinary engineering time | **Confirmed** | [Q5] | Schedule pressure is not a constraint that can be traded against correctness. It also means no external forcing date exists to justify a shortcut |
| SC-09 | The build-vs-buy position is Build — extend the existing POC | **Confirmed** | The approved market-research position | The MVP extends the POC's architecture and schema rather than replacing them. Every technical constraint above is a constraint on an *extension* |
| SC-10 | The total-cost comparison between build and buy is indeterminate, because no licence was quoted | **Confirmed** | The approved market-research position | This is recorded as an unresolved uncertainty rather than as an argument for either side. It does not bear on the technical constraints in this register |

## Organisational Constraints

| ID | Constraint | Status | Source | Consequence |
|---|---|---|---|---|
| OC-01 | Internal teams track assets through spreadsheets, email, and paper, with no system of record | **Confirmed** | [Q1] | The MVP has no incumbent system to integrate with, and no data migration to perform. This removes a large class of constraint and a large class of work |
| OC-02 | The incumbent spreadsheet-plus-email process has near-zero switching cost and no incumbent contract to displace | **Confirmed** | The approved market-research analysis | Adoption, not capability, is the likely failure mode. No technical constraint in this register addresses it, which is why it is carried as an open RAID item (R-02) rather than as a constraint |
| OC-03 | Asset administrators are the primary customer, and the workflow must be usable by them without a dedicated system administrator | **Confirmed** | [Q1] and the intent statement's target customer | If candidate D is adopted, the MVP acquires a user-administration burden for the asset administrators themselves — a new constraint on a team the MVP is meant to serve |
| OC-04 | The MVP must remain demonstrable to an internal reviewer | **Confirmed** | [Q2] | This is the binding obligation. The audit trail and the count consistency are the mechanisms by which it is met |
| OC-05 | The internal existing-tool inventory has never been gathered, and no licence has been quoted | **Confirmed** | The approved market-research residual uncertainty U1 | It is not known whether a system already in place covers part of the custody need. This is carried as issue I-03, and it also makes OC-02 harder to size |
| OC-06 | Organizational adoption readiness is not yet defined | **Open** | [Q7] | Carried as open item R-02. The assumption recorded is that the position is unknown and must be treated as unknown, not that adoption risk is low |

## Deployment and Operational Constraints

| ID | Constraint | Status | Source | Consequence |
|---|---|---|---|---|
| DC-01 | The MVP runs on a single internal host as a long-running Node process against a SQLite file on local disk | **Confirmed** | [Q6] | This target is coherent with the approved concurrency contract in TC-01 rather than in tension with it. Moving to a managed database would change the contract the approved decisions are written against, and the Q6 answer declines that |
| DC-02 | The entire system of record lives in one un-replicated file, and `data/` is gitignored | **Environment** | Verified against the live deployment | A backup and restore procedure that is exercised — not merely written — is the minimum credible operational posture, and it is the one operational item that directly honours the "history is never destroyed" promise |
| DC-03 | There is no CI, container, cloud, or infrastructure-as-code posture of any kind | **Environment** | Verified from the repository | The operation phase covers one instance's lifecycle, not an environment fleet. No cloud architecture is proposed, because none is supported by the evidence |
| DC-04 | `PORT` and `DB_PATH` are already exposed as environment overrides | **Environment** | Verified from `src/server.js` | The process is already parameterisable without a code change, which lowers the cost of the environment-provisioning stage |
| DC-05 | The database runs in WAL journal mode with foreign keys enabled | **Environment** | Verified from `src/db/index.js` | WAL is what makes the single-writer concurrency model viable, and foreign keys being on is what makes the audit cascade a live defect rather than a latent one |
| DC-06 | The POC emits a single startup line to stdout and has no health endpoint, metrics, or structured logging | **Environment** | Verified from `src/server.js` and `src/app.js` | The observability stage has no existing surface to build on. The audit trail is the natural application-level health and activity signal |
| DC-07 | There is a single environment — no development, staging, and production split exists today | **Environment** | Verified from the repository | The operation phase must decide whether a split is introduced or the single instance is treated as the only target. This is an operation-phase decision, not a feasibility one |
| DC-08 | The app listens on a default port with no TLS termination, and no reverse proxy exists | **Environment** | Verified from `src/server.js` and the absence of any proxy configuration | The absence of a proxy is what makes candidate B (trusted proxy header) unimplementable against the current estate, and it is also a fact that the actor-trust evaluation depends on |

## Data and Compliance Constraints

| ID | Constraint | Status | Source | Consequence |
|---|---|---|---|---|
| DC-01 (data) | No external regulatory framework is imposed over asset custody records beyond ordinary internal policy | **Confirmed** | [Q2] | The compliance surface is narrow: an internal audit expectation. No framework certification, no data-residency constraint, and no external reporting obligation |
| DC-02 (data) | Whether an internal records-retention or disposal schedule applies to custody records is not established | **Open** | The gap between Q2's framework answer and the adjacent records question | Carried as issue I-02. It affects how long the audit trail is retained, and it is not the same question as the framework question Q2 answered |
| DC-03 (data) | Employee names in `assigned_to` and `last_assigned_to` are personal data, classified Internal | **Confirmed** | [Q2] and the intent's stakeholder set | The classification drives the control set: integrity of the audit trail becomes a control objective, not a feature |
| DC-04 (data) | If candidate D is adopted, the system acquires a Restricted data class (credentials) that it does not have today | **Confirmed** | The candidate evaluation in the feasibility assessment | Adopting an application-managed login is not only a scope addition; it adds a data class, and with it obligations the MVP does not currently carry |
| DC-05 (data) | Asset serial numbers and licence keys may be commercially sensitive | **Confirmed** | The category model and the unique-key requirement | A small but real classification consideration for the export surface, which is where such values leave the system in bulk |

## Constraint Interactions

Three interactions between constraints matter more than any single constraint in isolation.

**TC-01 × TC-12 × TC-09 — the concurrency contract is satisfiable as written.** The
standing condition requires an IMMEDIATE transaction, a non-zero `busy_timeout`, and
`SQLITE_BUSY` mapped to a retryable error. The synchronous single-process driver (TC-12)
and the existing non-zero default (TC-09) together make this achievable without a
configuration change. The remaining requirement — mapping `SQLITE_BUSY` to a *distinct*
retryable error rather than a generic failure — is application work in the repository
layer, and it is the reason TC-01 says the two cases must not share an error path.

**TC-11 × TC-07 × TC-08 — the two structural changes share one critical dependency.** The
`assets` rebuild (TC-07) and the `audit_log` replacement (TC-08) both land in the
migration runner. That runner already applies cleanly over a legacy database (TC-11), which
is the strongest evidence available that it will do so here. It is nonetheless the
least-covered of the three areas under change, which is why the feasibility assessment
treats it as load-bearing rather than merely convenient.

**TC-04 × SC-09 × OC-02 — the count-consistency guarantee is what makes the tool
trustworthy, and trust is what drives adoption.** The approved guarantee is by
construction: one shared counting function behind all four surfaces (TC-04). The
spreadsheet incumbent carries no such guarantee (OC-02), and that is precisely the
differentiator the market research identified. The constraint that matters operationally is
therefore not that the shared function exists, but that all four surfaces actually consume
it — a surface that computes its own count would reintroduce the exact disagreement the MVP
exists to remove.

## Constraints That Are *Not* Present

Recording what does not constrain the MVP is as informative as recording what does, because
several of these were plausible sources of significant work and were tested against the
evidence.

| Plausible constraint | Status | Basis |
|---|---|---|
| Integration with external systems | **Not present** | [Q1] confirms the MVP is self-contained and publishes nothing outward. No interface, no data synchronisation, no vendor dependency |
| Regulatory certification or external audit obligation | **Not present** | [Q2] confirms no external framework is imposed |
| Cloud or container platform mandate | **Not present** | [Q6] confirms the POC's single-host deployment target, and the repository contains no cloud, container, or IaC tooling |
| Deadline-driven schedule pressure | **Not present** | [Q5] confirms no fixed deadline and no separate budget |
| Team ramp-up or capability gap | **Not present** | [Q4] confirms the same single developer builds this, with full context on the codebase |
| Multi-writer concurrency at scale | **Not present** | [Q7] confirms medium scale — several internal teams, hundreds to low thousands of assets — which is comfortably within a single-instance deployment |
| Vendor or licence dependency | **Not present** | The Build position was taken; the existing stack carries no licence cost and no vendor dependency |
| Legacy data migration | **Not present** | [Q8] confirms only 2 assets and 8 audit rows need backfilling, and the migration runner preserves legacy rows (TC-11) |

## Assumptions & Open Questions

- [assumption] The POC's technical baseline is verified directly against the source and a live database — audit cascade destruction, the `status` CHECK constraint excluding `discarded`, functional-index support, the non-zero default `busy_timeout`, the clean migration over a legacy database, the 66/66 test baseline, the absence of CI/container/cloud posture, and the machine-local nature of `data/`. These are observations, not estimates, and are not treated as assumptions.
- [assumption] The absence of any recorded compliance framework is not treated as a compliance clearance. The market research established that there is no regulatory *driver* for the initiative; whether an obligation *attaches* to the custody data is a separate question, which is why Q2 asks it directly. Until Q2 is answered, the compliance position is recorded as "not established" rather than "none".
- [assumption] The `feature` scope places the operation phase in scope, so the deployment target and the operational environment are feasibility questions rather than later-stage decisions. Q6 asks for the deployment target because the verified position — a single host with a machine-local SQLite file — is materially different from a container platform or a managed database, and the choice changes the concurrency contract the approved decision set is written against.
- [assumption] The actor-identity *rule* is fixed and is not reopened by this stage: every audit entry must derive its actor from trusted server-side context, and client-supplied identity is never trusted [memory:M2]. What remains open is the *mechanism* that implements it. The POC deferred authentication entirely and the 17-item decision set does not mention it, so Q3 records a shortlist of candidates with application-managed login as the leading candidate rather than a decided implementation. No candidate is assumed available or unavailable: the absence of an identity provider or authenticating proxy in the verified baseline is a fact about the current estate, and whether application-managed sessions are necessary or merely the fallback depends on an evaluation this stage carries out rather than an assumption made in either direction.
- [assumption] No AWS or cloud landscape is assessed. The verified position is that no AWS CLI, no Terraform, no CDK, no Dockerfile, and no CI workflow exist, and the POC runs from a local Node process against a local SQLite file. The platform perspective therefore records what the chosen deployment target implies, rather than proposing a cloud architecture that the evidence does not support.
- [assumption] Organizational adoption readiness is **not** resolved by this stage. Q7's answer is "not yet defined", and the market research records the same gap as residual uncertainty U1 — the internal existing-tool inventory was never gathered and no licence was quoted. This is carried as an open RAID item rather than as a mitigated risk, because the incumbent spreadsheet-plus-email process has near-zero switching cost and no incumbent contract to displace: the practical failure mode is that teams continue using the spreadsheet, which no technical feasibility finding can retire. The assumption recorded here is only that the position is unknown and must be treated as unknown, not that adoption risk is low.

## Sources Consumed

- **intent-statement** (`aidlc/spaces/default/intents/261106-asset-tracker-mvp/ideation/intent-capture/intent-statement.md`) — the confirmed scope bounds, the target customer, the Audit Completeness metric, and the standing conditions this register is bounded by.
- **competitive-analysis** (`aidlc/spaces/default/intents/261106-asset-tracker-mvp/ideation/market-research/competitive-analysis.md`) — the table-stakes/differentiator classification and the incumbent spreadsheet's characteristics, which establish OC-02.
- **market-trends** (`aidlc/spaces/default/intents/261106-asset-tracker-mvp/ideation/market-research/market-trends.md`) — the concurrency, scale-calibration, and lifecycle-completeness trends that frame TC-01, TC-12, and SC-05.
- **build-vs-buy** (`aidlc/spaces/default/intents/261106-asset-tracker-mvp/ideation/market-research/build-vs-buy.md`) — the Build position (SC-09), the indeterminate cost comparison (SC-10), and the residual uncertainties that become I-02 and I-03.
- **feasibility-questions** (`aidlc/spaces/default/intents/261106-asset-tracker-mvp/ideation/feasibility/feasibility-questions.md`) — the eight confirmed answers and the accepted assumptions.

## Review

Reserved for the reviewer at the approval gate.
