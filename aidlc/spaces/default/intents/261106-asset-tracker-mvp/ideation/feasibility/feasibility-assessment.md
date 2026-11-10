# Feasibility Assessment — Asset Tracker MVP

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

## Purpose and Scope of This Assessment

This assessment establishes whether the Asset Tracker MVP is technically feasible within the
constraints that are actually in force, and it does so against verified facts rather than
estimates. Every technical claim below was confirmed by reading the POC source and by
executing probes against a live database before this assessment was written. The
question answered is not "can this be built" — it almost certainly can — but "which
specific behaviours are achievable in the existing stack, which need a structural change
first, and what is genuinely uncertain".

The assessment is bound by the approved 17-item decision set and the Development
Workbook, which are the binding technical and product contract and are not reopened here
[memory:M2]. Nothing in this assessment adds scope, and nothing in it substitutes a
different product decision for an approved one.

This assessment is derived from the upstream `intent-statement` artifact produced by the
intent-capture stage, and it draws on the `competitive-analysis`, `market-trends`, and
`build-vs-buy` artifacts produced by the market-research stage, all of which are consumed
by this stage.

## The Verified Baseline

These were established by direct execution against the POC, not estimated. They are the
foundation of every feasibility judgement that follows.

| # | Verified fact | How it was established |
|---|---|---|
| B1 | Deleting an asset destroys its audit history | The `audit_log` table carries `FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE`; deleting one asset row removed its audit row on a live in-memory database |
| B2 | The `status` CHECK constraint rejects `discarded` | `CHECK (status IN ('in-stock', 'assigned', 'returned', 'lost'))`; SQLite cannot alter a CHECK constraint via `ALTER TABLE` |
| B3 | The table-rebuild technique works | The create-copy-drop-rename path was executed successfully against SQLite 3.49.2 |
| B4 | Functional unique indexes are supported | `CREATE UNIQUE INDEX ... ON assets(lower(trim(serial_or_key)))` succeeded on SQLite 3.49.2 |
| B5 | `busy_timeout` is already non-zero | better-sqlite3 11.10.0 reports `busy_timeout = 5000` on a fresh connection |
| B6 | The migration runner applies cleanly over a legacy database | A v1-only database was opened by the current runner; migration 2 applied, the legacy row survived, and `assigned_at` was added |
| B7 | The 66/66 test baseline holds | `npm test` → 5 files, 66 tests, all passing |
| B8 | There is no cloud or container posture | No AWS CLI, no Terraform, no CDK, no `Dockerfile`, no CI workflow, and no `NODE_ENV`/`PORT`/`DB_PATH` configuration beyond the code defaults |
| B9 | The deployed database is machine-local | `data/` is gitignored; the live `data/assets.sqlite` holds 2 assets and 8 audit rows, at migration versions 1 and 2 |
| B10 | The design-system baseline is effectively zero | `public/styles.css` is 40 lines with no CSS custom properties, no breakpoints, and 17 class names against a workbook requirement of roughly 30 components |

## Technical Viability by Approved Capability

Each approved MVP capability is assessed for feasibility in the existing stack. The verdict
column is a feasibility judgement only — it says nothing about whether the capability is in
scope, which is already settled by the decision set.

| Capability | Feasible in the current stack? | What it requires | Verdict |
|---|---|---|---|
| Actor-attributed append-only audit history | Yes, but not by extension | The `audit_log` table must be replaced: `ON DELETE CASCADE` must be removed, an actor column added, and the table made insert-only to the application. Table rebuild (B3) is the known-good path | **Feasible — structural change required** |
| Previous-holder preservation via `last_assigned_to` | Yes | A new nullable column plus the transition-rule changes. No table rebuild needed, since `ALTER TABLE ADD COLUMN` is available and the migration runner already demonstrates it (B6) | **Feasible — additive change** |
| `lost → in-stock` recovery transition | Yes | The state machine currently treats `lost` as terminal; the transition map and the `ACTION_DESCRIPTIONS` vocabulary both need extending with a distinct `recovered` action and a required recovery reason | **Feasible — additive change** |
| `assigned → discarded` transition | Yes, but not by extension | `discarded` is rejected by the `status` CHECK constraint (B2), so the `assets` table requires a rebuild — the same create-copy-drop-rename path already proven in B3. The inline assignment resolution itself is service-layer logic | **Feasible — structural change required** |
| Five exclusive status buckets, one shared counting function and filter builder | Yes | A new shared counting function plus a reusable filter builder, consumed by the dashboard, assignee directory, asset list, and CSV export. Pure application-layer work | **Feasible — additive change** |
| Case-insensitive, category-scoped serial uniqueness via a functional index | Yes | A functional unique index on `lower(trim(serial_or_key))` scoped to category (B4). The standing conditions additionally require an IMMEDIATE transaction, a non-zero `busy_timeout` (already satisfied at B5), and `SQLITE_BUSY` mapped to a retryable error | **Feasible — additive change** |
| CSV export with formula-injection protection | Yes | A new export route plus a cell-sanitising helper. No schema impact | **Feasible — additive change** |
| Reconciliation dashboard | Yes | Reads from the shared counting function. The POC's `public/styles.css` is 40 lines against a workbook requirement of roughly 30 components (B10) | **Feasible — but the design-system work is the largest unestimated item** |
| Assignee directory, asset editing, duplicate-detection UX, empty states, result counts, pagination, improved search, responsive UI | Yes | Application-layer work on the existing service/repository split | **Feasible — additive change** |
| Design system (section 11) | Yes | Approximately 30 components with semantic color tokens, a typography scale, spacing tokens, radius and shadow scales, and iconography, on a 40-line stylesheet (B10) | **Feasible — the largest single body of new work in the MVP** |

### The two structural changes, and why they are the crux

Only two of the ten capabilities require a structural change, and both require the same
technique: replacing a table rather than altering it.

The `assets` table must be rebuilt because `discarded` must be admitted to the `status`
CHECK constraint, and SQLite cannot add a value to a CHECK constraint without rebuilding
the table (B2). The `audit_log` table must be replaced because the cascade that destroys
history (B1) is a property of the foreign key declaration, and because the POC's audit
table has no actor column at all.

Both rebuilds share one technique that has already been proven to work against this exact
SQLite version (B3), and both are inside the migration runner's remit, which already
demonstrates that it applies cleanly over a legacy database without losing rows (B6). The
feasibility risk in both is therefore not "can this be done" but "does the rebuild preserve
every existing row and every existing migration-ledger entry" — a question that is answerable
by test, which the 66/66 baseline (B7) already provides the harness for.

This is the most important structural point in the assessment: **the migration runner is the
single component on which the two highest-risk capabilities both depend**, and it is also
the component with the least test coverage of the three areas under change.

## The Actor-Trust Evaluation

This section carries out the evaluation the Q3 answer requires: whether application-managed
sessions are *necessary*, or whether an existing trusted authentication mechanism could
satisfy the actor-trust invariant instead.

### The rule, which is fixed

The actor-trust rule is fixed and is not reopened by this stage: every audit entry derives its
actor from trusted server-side context, and client-supplied identity is never trusted
[memory:M2]. The rule constrains the *design space* of actor mechanisms; it does not select
one. Two mechanisms are excluded by the rule as stated: any design that accepts an actor
identifier from the request body, and operator selection, where the operator remains
self-declared and merely recorded.

### What the estate actually contains

The evaluation was run against the estate rather than assumed. The verified position is that
the POC has **no authentication code, no session layer, no user store, no identity provider,
and no authenticating proxy** (B8). The application's surface is seven route handlers over
an unauthenticated Express app with a URL-encoded body parser and a static file mount. The
absence of an existing trusted authentication mechanism is therefore a *fact about the
current estate*, and it is the fact that decides the question.

### The evaluation

The question "does an existing trusted authentication mechanism exist?" has one of two
answers, and the estate fixes which:

- **If no such mechanism exists** — which is what the evidence shows — then no candidate
  that *depends* on one can be implemented. Option B (a trusted header from an authenticating
  proxy) is not implementable against the current estate without first building the proxy,
  which is a larger infrastructure change than the MVP contemplates and would move the
  deployment target away from the confirmed single-host position [Q6].
- **If one exists elsewhere in the organisation** — which was not established, and which
  Q3 explicitly directs us not to assume — then the actor question becomes considerably
  cheaper, and candidate B becomes the leading option instead of the leading *candidate
  implementation*.

The honest position is that the second branch has not been ruled out by the evidence, only
by the fact that nothing in the POC's estate or configuration references one. The market
research records the same gap as residual uncertainty U1: the internal existing-tool
inventory was never gathered, and no licence was quoted. **The question of whether an
existing trusted authentication mechanism is available is therefore unresolved and is
carried as an open issue (I-01), not as an assumption in either direction.**

### What this means for the leading candidate

Application-managed login remains the leading candidate because it is the only option in the
set that authenticates users individually, and because it is implementable against the
current estate without depending on anything outside it. But the evaluation sharpens its
cost, and the cost is what the decision set does not currently price:

| Cost dimension | What application-managed login adds |
|---|---|
| Schema | A user table — not in the POC's schema today, and not named in the approved decision set |
| Credential storage | Password hashing, and a decision about where credentials live |
| Session management | Session creation, expiry, invalidation — none of which exists today |
| Password lifecycle | Creation, rotation, reset, and the administrative flow for each |
| Authorisation | Even a minimal role model, once multiple actor identities exist |
| Security surface | A new class of vulnerability — credential stuffing, session fixation, password reuse — in a system whose entire value proposition is auditability |

None of this is prohibitive. It is, however, **unnamed in the approved 17-item decision
set**, and the gap analysis did not cost it. Adopting it unconditionally would quietly add a
material body of scope to a scope-fixed MVP [Q6], which is exactly what the Q3 revision
prevents by recording it as a candidate rather than a decision.

### The feasibility conclusion on actor identity

The MVP is feasible under **every** candidate in the shortlist. The differences are cost,
not capability:

| Candidate | Feasible now? | Marginal cost relative to the approved decision set | Requires anything outside the estate? |
|---|---|---|---|
| A. Server-configured single operator | Yes | Negligible | No |
| B. Trusted request header from an authenticating proxy | Only if a proxy exists | Small in-app; large in infrastructure | **Yes — an authenticating proxy, which does not exist** |
| C. Operator selection | Yes | Negligible | No |
| D. Application-managed login and session | Yes | Substantial — see the table above | No |

The recommendation this assessment carries forward is a **sequencing** recommendation, not a
selection: resolve I-01 first. If an existing trusted authentication mechanism is available,
candidate B becomes viable at low cost and the substantial cost of candidate D disappears.
If none is available, candidate D's cost is unavoidable and should be added to the MVP's
costed scope explicitly rather than absorbed silently. Either way, the actor-trust rule is
satisfied, and the Audit Completeness metric becomes measurable.

## Effort and Sequencing

The gap analysis assessed the MVP at 6–8 weeks *conditional on the design workstream being
scoped to the screens actually needed*. The feasibility findings refine that estimate rather
than replace it.

| Workstream | Content | Feasibility note |
|---|---|---|
| Foundation | `audit_log` replacement, `assets` table rebuild, `last_assigned_to`, actor column, backfill of pre-MVP rows with a `system` actor | Depends entirely on the migration runner — the highest-leverage component in the MVP |
| Lifecycle | Recovery transition, discard transition with inline resolution, expanded audit-action vocabulary, per-transition validation | Application-layer, well within the existing service/repository split |
| Integrity | Functional unique index, shared comparison predicate, IMMEDIATE transaction, `SQLITE_BUSY` → retryable | `busy_timeout` already non-zero (B5) |
| Consistency | One shared counting function and filter builder consumed by four surfaces | The "by construction" guarantee depends on all four surfaces actually using it |
| Actor identity | Whatever I-01 resolves to — negligible to substantial depending on the branch | The only workstream whose size is genuinely unresolved |
| Surfaces | Dashboard, assignee directory, asset editing, duplicate-detection UX, empty states, result counts, pagination, improved search, responsive UI | Additive, but the largest volume of distinct screens |
| Design system | Roughly 30 components, semantic tokens, type scale, spacing, radius, shadow, iconography, light theme with dark-theme extension | The largest single body of new work, and the workbook's enumeration is explicitly indicative rather than exhaustive [memory:M3] |
| CSV export | Export route plus formula-injection protection | Additive, self-contained |

Two sequencing observations follow from the feasibility findings, and neither changes the
approved scope:

1. **The foundation workstream gates everything else.** The actor column lives in
   `audit_log`, and every lifecycle transition writes audit entries. Landing the audit-table
   replacement first is what makes the actor workstream implementable at all.
2. **The design system gates the surfaces workstream, not vice versa.** Building the
   dashboard and the assignee directory against the current 40-line stylesheet and then
   retrofitting the design system means touching every surface twice. The gap analysis's
   6–8 week figure is explicitly conditional on scoping the design workstream to the
   screens actually needed — this assessment confirms that condition is load-bearing.

## Platform Perspective — Deployment Target and Operational Feasibility

*The following perspective is contributed by the platform engineering discipline and is
synthesised into the assessment.*

The confirmed deployment target is the same as the POC's: a single internal host, a SQLite
file on local disk, launched as a long-running process [Q6]. The verified position is that
there is no cloud, container, or CI posture of any kind (B8), and the database is
machine-local with `data/` gitignored (B9).

This target is internally coherent with the approved technical contract, and it is worth
saying why, because it is easy to assume that a single-host SQLite deployment is a
limitation to be engineered around. It is not. The standing conditions on the uniqueness
work — an IMMEDIATE transaction, a non-zero `busy_timeout`, and `SQLITE_BUSY` mapped to a
retryable error — are *exactly* the concurrency contract that a single-writer SQLite
deployment justifies. The decision set was written against this deployment shape, and the
verified facts confirm the shape is real (B5, B8). Moving to a managed relational database
would change the concurrency contract the approved decisions are written against, which the
Q6 answer expressly declines to do.

### What this target implies for the operation phase

The operation phase is in scope because the workflow scope was widened to `feature`, which
runs 33 of 33 stages with no stage skipped. Against this deployment target, the operation
phase's work is the operation of one instance, and it is well-bounded:

| Operational concern | Position on this target | Note |
|---|---|---|
| Process lifecycle | In scope — one long-running Node process | The POC already exposes `PORT` and `DB_PATH` environment overrides, so the process is already parameterisable without a code change |
| Backups | In scope and **the highest-value operational item** | The database file is the entire system of record. A backup and restore procedure that is exercised, not merely written, is the minimum credible posture |
| Observability | In scope | The POC currently emits one startup line to stdout; the audit trail is the natural health and activity signal, and it is an application-level asset rather than an infrastructure one |
| Data loss window | The material risk | The `data/` directory is gitignored (B9), so the file exists in exactly one place with no replication |
| Horizontal scaling | Not applicable, and not required | Hundreds to low thousands of assets across several internal teams is well inside single-instance capacity |
| Environment parity | Single environment | No dev/staging/prod split exists today; the workflow's operation stages will need to decide whether one is introduced or the single instance is treated as the only target |

### What this target does not imply

No cloud architecture is proposed, because the evidence does not support one. There is no
AWS CLI, no Terraform, no CDK, no `Dockerfile`, and no CI workflow (B8). The platform
perspective therefore records what the chosen deployment target *implies*, rather than
proposing a destination the organisation has no tooling or posture to reach. Introducing a
container or managed-database platform at this stage would be an infrastructure programme
disguised as a feasibility finding.

The one platform-adjacent finding worth carrying forward is a **backup-gap risk**, and it is
carried as a risk (R-07) rather than as a blocker: the entire system of record lives in one
unreplicated file, and the MVP's value proposition is that history is never destroyed. The
backups that honour that promise are an operational obligation, not an optional extra.

## Compliance Perspective — Regulatory and Records Obligations

*The following perspective is contributed by the compliance discipline and is synthesised
into the assessment.*

The Q2 answer establishes that no formal compliance framework is imposed on the asset
custody records, beyond a general internal audit expectation: the records must be
demonstrable to an internal reviewer [Q2]. This is a real answer, not an absence of one,
and it narrows the compliance surface considerably. It is worth being precise about what it
does and does not license.

### Framework applicability scan

| Framework | Applicability | Basis |
|---|---|---|
| PCI-DSS | Not applicable | The system holds no cardholder data. The strongest available reading of "financial" here is write-off value, which is not cardholder data |
| HIPAA | Not applicable | No PHI; the system holds no health information |
| GDPR / UK GDPR | Not applicable as a framework obligation | The system holds employee names and asset custody records, which are personal data, but the confirmed position is an internal tool with no external regulatory driver. **This is recorded as a low-likelihood applicability with a named trigger, not as "none"** |
| SOC 2 | Not applicable | The organisation is not a service provider to an external customer; this is an internal system of record |
| ISO 27001 | Not applicable | No certification commitment exists |
| Records-retention schedule | **Unresolved** | Q2 answered the *framework* question; it did not establish whether a retention or disposal schedule applies to custody records. Recorded as issue I-02 |
| Write-off defensibility for financial audit | **Applies as an internal expectation** | Finance is a named stakeholder group, and the intent names defensible write-offs. The audit trail is the evidence mechanism |

The distinction that matters most: the *framework* scan is negative, but the *records
obligation* scan is not fully closed. Q2's answer establishes that no external framework is
imposed; it does not establish that no records-management schedule applies internally. Those
are two different questions, and only the first was asked and answered. The second is
carried as issue I-02.

### Data classification

Under a classification-first discipline, the data assets are:

| Data asset | Classification | Note |
|---|---|---|
| Holder names (`assigned_to`, `last_assigned_to`) | **Internal** | Names of employees, tied to custody of a specific physical item. Not restricted, but personal data in the GDPR sense |
| Asset serial numbers and keys | **Internal**, occasionally **Confidential** | A serial number may be vendor-sensitive; a licence key may be commercially sensitive |
| Audit trail entries (actor, action, description, timestamp) | **Internal** | The evidence base. Its integrity is the product's core promise |
| Loss and discard reasons | **Internal** | May describe circumstances with HR sensitivity |
| Authentication credentials (if candidate D is adopted) | **Restricted** | Passwords, hashed. Never in the audit trail, never in logs |

The classification drives two concrete consequences. First, the audit trail's integrity is a
control objective, not a feature — which is exactly why the cascade defect (B1) is a
compliance-relevant defect and not merely a functional one. Second, if candidate D is
adopted, the system acquires a **restricted** data class it does not have today, which
introduces obligations it does not have today.

### The audit-trail control mapping

The approval gate asks for an internal reviewer to be able to demonstrate custody. That
reviewer needs specific things, and the approved decision set's properties map onto them
directly:

| Internal-reviewer question | Supporting property | Feasible? |
|---|---|---|
| Who had this asset, and when? | `last_assigned_to` preservation, actor-attributed audit entries | Yes — verified feasible (additive and structural changes) |
| What happened to it? | Append-only audit history with a defined action vocabulary | Yes — requires the audit-table replacement (B1) |
| Was the record altered after the fact? | The audit trail is insert-only to the application; no update or delete path | Yes — the replacement removes the cascade |
| Can a write-off be defended? | Discard records the reason, the prior holder, and that the assignment was resolved by the discard [memory:M4] | Yes — feasible |
| Are the counts trustworthy? | One shared counting function behind the dashboard, assignee, list, and CSV surfaces | Yes — feasible, and the guarantee holds only if all four surfaces use it |
| What did the system know at the time? | Timestamped audit entries on every lifecycle transition | Yes — feasible |

### What the compliance perspective does not add

The honest boundary: **no external regulatory obligation was found that this MVP must
satisfy.** The system holds no regulated data class, no cardholder data, no health
information, and is not a service provider's system. The compliance discipline's principle
that "the absence of any recorded compliance framework is not a compliance clearance" applies
here and is why I-02 is raised at all — but the evidence available supports a position of
*no framework obligation applies*, with one named retention question outstanding and one
low-likelihood GDPR trigger recorded.

The posture is therefore: **internal audit expectation is the binding obligation, and the
approved decision set's audit properties are the control set that satisfies it.** The MVP is
feasible against that obligation. What the MVP must not do is claim more than it has — which
is why the design-system, actor-identity, and backup items below are recorded as risks
against the *internal audit expectation*, not against an external framework.

## Feasibility Verdict

**The Asset Tracker MVP is technically feasible within the confirmed constraints**, with two
qualifications and three unresolved items.

**Feasible.** Every one of the ten approved capability areas can be implemented in the
existing stack. Two require a structural table change using a technique already proven
against this exact SQLite version and this exact migration runner. The remaining eight are
additive application-layer work inside an existing service/repository split. The 66/66
baseline provides a working verification harness, and the deployment target is coherent
with the approved concurrency contract rather than in tension with it.

**Qualification 1 — the migration runner is load-bearing.** Both structural changes and the
actor column depend on it, and it is the least-covered of the three areas under change. It
should be the first thing strengthened, and the "no audit rows destroyed" property should be
verified against a live database rather than asserted.

**Qualification 2 — the design system is the largest unestimated body of work.** The
workbook's enumeration is indicative rather than exhaustive [memory:M3], and it sits on a
40-line stylesheet (B10). The gap analysis's 6–8 week estimate is explicitly conditional on
scoping that workstream; this assessment confirms the condition is load-bearing rather than
optimistic.

**Three unresolved items** — carried in full in the RAID log, not settled here:

- **I-01** — whether an existing trusted authentication mechanism is available anywhere in
  the organisation. This is the open question that determines the size of the actor-identity
  workstream and whether candidate B is viable. It must be answered before the actor
  mechanism is decided, and no assumption is made about the answer in either direction.
- **I-02** — whether a records-retention or disposal schedule applies to asset custody
  records. Q2 answered the framework question; this is the adjacent records question it did
  not ask.
- **I-03** — whether an internal trusted authentication mechanism or existing-tool inventory
  exists that would satisfy the actor-trust rule at lower cost, which the market research
  already recorded as residual uncertainty U1 and which was never gathered.

The recommendation is to resolve I-01 and I-02 before the actor-identity mechanism is
selected at the design stage, and to sequence the foundation workstream — audit-table
replacement, `assets` table rebuild, `last_assigned_to`, actor column, backfill — ahead of
the surfaces workstream.

## Assumptions & Open Questions

- [assumption] The POC's technical baseline is verified directly against the source and a live database — audit cascade destruction, the `status` CHECK constraint excluding `discarded`, functional-index support, the non-zero default `busy_timeout`, the clean migration over a legacy database, the 66/66 test baseline, the absence of CI/container/cloud posture, and the machine-local nature of `data/`. These are observations, not estimates, and are not treated as assumptions.
- [assumption] The absence of any recorded compliance framework is not treated as a compliance clearance. The market research established that there is no regulatory *driver* for the initiative; whether an obligation *attaches* to the custody data is a separate question, which is why Q2 asks it directly. Until Q2 is answered, the compliance position is recorded as "not established" rather than "none".
- [assumption] The `feature` scope places the operation phase in scope, so the deployment target and the operational environment are feasibility questions rather than later-stage decisions. Q6 asks for the deployment target because the verified position — a single host with a machine-local SQLite file — is materially different from a container platform or a managed database, and the choice changes the concurrency contract the approved decision set is written against.
- [assumption] The actor-identity *rule* is fixed and is not reopened by this stage: every audit entry must derive its actor from trusted server-side context, and client-supplied identity is never trusted [memory:M2]. What remains open is the *mechanism* that implements it. The POC deferred authentication entirely and the 17-item decision set does not mention it, so Q3 records a shortlist of candidates with application-managed login as the leading candidate rather than a decided implementation. No candidate is assumed available or unavailable: the absence of an identity provider or authenticating proxy in the verified baseline is a fact about the current estate, and whether application-managed sessions are necessary or merely the fallback depends on an evaluation this stage carries out rather than an assumption made in either direction.
- [assumption] No AWS or cloud landscape is assessed. The verified position is that no AWS CLI, no Terraform, no CDK, no Dockerfile, and no CI workflow exist, and the POC runs from a local Node process against a local SQLite file. The platform perspective therefore records what the chosen deployment target implies, rather than proposing a cloud architecture that the evidence does not support.
- [assumption] Organizational adoption readiness is **not** resolved by this stage. Q7's answer is "not yet defined", and the market research records the same gap as residual uncertainty U1 — the internal existing-tool inventory was never gathered and no licence was quoted. This is carried as an open RAID item rather than as a mitigated risk, because the incumbent spreadsheet-plus-email process has near-zero switching cost and no incumbent contract to displace: the practical failure mode is that teams continue using the spreadsheet, which no technical feasibility finding can retire. The assumption recorded here is only that the position is unknown and must be treated as unknown, not that adoption risk is low.

## Sources Consumed

- **intent-statement** (`aidlc/spaces/default/intents/261106-asset-tracker-mvp/ideation/intent-capture/intent-statement.md`) — the problem framing, the target customer, the Audit Completeness metric, and the confirmed scope bounds that this assessment is bounded by.
- **competitive-analysis** (`aidlc/spaces/default/intents/261106-asset-tracker-mvp/ideation/market-research/competitive-analysis.md`) — the table-stakes/differentiator split and the classification of the differentiator properties as architectural invariants, which is why the audit and counting work is assessed as build-in-place rather than configurable.
- **market-trends** (`aidlc/spaces/default/intents/261106-asset-tracker-mvp/ideation/market-research/market-trends.md`) — the six trends and their design consequences, which frame the concurrency contract, the scale calibration, and the lifecycle-completeness argument.
- **build-vs-buy** (`aidlc/spaces/default/intents/261106-asset-tracker-mvp/ideation/market-research/build-vs-buy.md`) — the Build position and its residual uncertainties U1 and U2, which this assessment carries forward as issues I-03 and the licence-cost item.
- **feasibility-questions** (`aidlc/spaces/default/intents/261106-asset-tracker-mvp/ideation/feasibility/feasibility-questions.md`) — the eight confirmed answers and the accepted assumptions.
- **POC source** (`src/`, `tests/`, `package.json`, `views/`, `public/`) — the verified architecture, schema, transition map, dependency set, deployment posture, and the 66/66 test baseline.

## Review

Reserved for the reviewer at the approval gate.
