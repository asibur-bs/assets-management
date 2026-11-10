# RAID Log — Asset Tracker MVP

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

## Purpose and Scope of This Log

This is the stage's RAID log — **R**isks, **A**ssumptions, **I**ssues, and **D**ependencies —
for the Asset Tracker MVP. It is the running record of everything that could go wrong, is
being assumed, is currently unresolved, or must arrive from elsewhere for the work to
proceed.

Every entry carries an ID, a severity or confidence rating, a mitigation or a next action,
and an owner. Entries are **open** unless explicitly closed. The log is a living artifact:
the operation and construction phases will add to it, and nothing here is presented as
settled merely because it has been written down.

This log is derived from the upstream `intent-statement` artifact produced by the
intent-capture stage, and from the `competitive-analysis`, `market-trends`, and
`build-vs-buy` artifacts produced by the market-research stage, all of which are consumed
by this stage.

### Rating scales

**Risk severity** — impact if the risk materialises:

| Rating | Meaning |
|---|---|
| **Critical** | The MVP's core promise fails, or an approved decision becomes unimplementable. Blocks delivery. |
| **High** | A significant capability is degraded or delayed, or the MVP cannot be demonstrated to an internal reviewer as specified. |
| **Medium** | A bounded defect or delay, with a workaround or a contained consequence. |
| **Low** | Cosmetic or minor, with negligible effect on the approved outcome. |

**Assumption confidence** — how likely the assumption is to hold:

| Rating | Meaning |
|---|---|
| **High** | Directly verified against source or a live system; a violation would be immediately visible. |
| **Medium** | Reasoned from available evidence, not directly verified. |
| **Low** | Plausible but unverified; a violation would be discovered late. |

**Issue severity** — consequence of leaving the issue unresolved:

| Rating | Meaning |
|---|---|
| **Blocking** | A required decision cannot be made until it is resolved. |
| **Material** | It materially changes scope, cost, or effort, but does not prevent progress. |
| **Informational** | It should be tracked, but it does not change the plan. |

## Risks

| ID | Risk | Severity | Evidence | Mitigation / Next action | Owner |
|---|---|---|---|---|---|
| R-01 | The migration runner is the single point of failure for both structural changes — the `assets` table rebuild and the `audit_log` replacement — and it is the least-covered of the three areas under change | **High** | The `status` CHECK constraint cannot be altered via `ALTER TABLE`; the audit cascade must be removed by replacing the table. The runner's clean application over a legacy database is verified, but the rebuild path itself is exercised only once in this codebase | Strengthen the migration runner's test coverage first, before the rebuilds land. Require a live-database test that rebuilds `assets` with existing rows and proves row-for-row preservation | Architect |
| R-02 | Organizational adoption readiness is unknown, and the incumbent spreadsheet has near-zero switching cost | **High** | [Q7] answers "not yet defined"; the market research recorded the same gap as residual uncertainty U1. The incumbent is a spreadsheet plus email, with no contract to displace | **Preserved as an open RAID item at the human's direction.** No technical mitigation is available: no feasibility finding retires an incumbent process. Resolve by gathering the internal existing-tool inventory and a stakeholder view on what would make the tool the easier path | Product owner |
| R-03 | The `assets` repository's update path writes every column unconditionally, so a partial update that omits a column will clear it | **High** | Verified in `src/repositories/assets-repo.js` — this is the mechanism behind the R5 clobber risk that POC requirement FR5.3 addresses | Make the update path explicit about which columns it writes, so `last_assigned_to` retention and `assigned_to` clearing during a discard are deliberate rather than incidental. Add regression tests covering both | Developer |
| R-04 | The design system is the largest single body of new work, and the workbook's enumeration of it is explicitly indicative rather than exhaustive | **High** | The design-system requirement covers roughly 30 components against a 40-line stylesheet with no custom properties and no breakpoints. [memory:M3] records the enumeration as indicative, with workbook section 11 authoritative | Scope the design workstream to the screens actually needed before starting it, as the gap analysis conditions. Treat section 11 as the specification and do not build from the indicative list | Designer |
| R-05 | The shared counting function is adopted by some surfaces and bypassed by others, so the counts disagree anyway | **High** | The approved guarantee is by construction — one shared counting function and one filter builder across dashboard, assignee, asset-list, and CSV. A surface computing its own count breaks it silently, with no error and no failing test | Make the shared function the only way to produce a count, and add a test that asserts all four surfaces route through it. A surface that cannot obtain its count from the shared function should fail to build | Architect |
| R-06 | `SQLITE_BUSY` is not distinguished from a genuine duplicate, so a concurrent-registration conflict surfaces as a confusing validation error rather than a retryable one | **Medium** | The standing condition requires `SQLITE_BUSY` to map to a retryable error. better-sqlite3's default `busy_timeout` is already 5000, so the busy window is real rather than theoretical | Map the two error paths distinctly in the repository layer and cover both in tests: one retries, the other reports a duplicate | Developer |
| R-07 | The entire system of record lives in one un-replicated file on local disk, and `data/` is gitignored | **Medium** | Verified against the live deployment. The MVP's promise is that history is never destroyed, and the database file is the whole of the history | A backup and restore procedure that is **exercised**, not merely written, is the minimum credible operational posture. This is the highest-value item in the operation phase | Operations |
| R-08 | The pre-MVP audit rows are actor-less — the POC's audit table has no actor column at all — so the backfill must synthesise attribution rather than preserve it | **Medium** | The live database holds 8 audit rows with no actor, because the column does not exist in the schema | The backfill assigns a `system` actor and the approved §24 amendment excludes those rows from the Audit Completeness metric, so the metric is measured against a defined, stated population. The backfill must preserve the original rows and report failures | Developer |
| R-09 | The migration rebuilds and the backfill both touch existing production data on a machine-local database with no staging copy | **Medium** | The migration runner's clean application over a legacy database is verified, but the live `data/assets.sqlite` is a single copy with no environment parity | Take and verify a copy of the live database before any migration runs against it. A restore that has not been rehearsed is not a backup | Operations |
| R-10 | The audit trail's integrity is the MVP's central promise, but the application has no tamper-evidence beyond the removal of the cascade | **Medium** | Removing `ON DELETE CASCADE` prevents accidental deletion. It does not make the audit rows append-only at the storage layer, and the POC's error handler maps a generic failure to a 500 with no audit of the failure | Keep the audit table insert-only to the application — no update or delete path in the repository — and decide at the design stage whether storage-level tamper-evidence is required for the internal reviewer's standard | Architect |
| R-11 | The `status` value set in the repository layer and the CHECK constraint in the schema diverge, so the application accepts a status the database rejects, or the reverse | **Medium** | Verified: the repository's allowed set is `{in-stock, assigned, returned, lost}` and the schema's CHECK matches it today. Adding `discarded` to one but not the other reproduces the divergence | Extend both together in the same change, and add a test that asserts the repository's allowed set and the schema's CHECK agree | Developer |
| R-12 | The 66/66 test baseline is treated as a floor rather than as a gate, and a change that breaks an existing test is worked around rather than fixed | **Medium** | The standing condition is that the baseline is preserved and regression tests are added for new behaviour. A "preserve" condition is only meaningful if it is enforced | The existing suite must stay green on every change, with no test weakened or removed. Enforce this in the build pipeline rather than by intent | Quality engineer |
| R-13 | The app is unauthenticated and the actor-trust rule is unimplemented, so until the actor mechanism lands, every write is attributable to nobody | **Medium** | The POC has no authentication code, no session layer, and no actor column. The rule is fixed [memory:M2] but its mechanism is unset | Resolve I-01, then implement the selected mechanism before any lifecycle transition work depends on it. The audit-table replacement lands first, so the actor column is in place before the mechanism writes to it | Architect |
| R-14 | The CSV export surface emits bulk asset data including serials and possibly licence keys, and a formula-injection defect would only be discovered when someone opens the file | **Medium** | The export requirement exists precisely because spreadsheet consumers open the output. [Q2] classifies serials and keys as Internal to Confidential | Implement the formula-injection protection as a required part of the export, and cover it with tests that assert a leading `=`, `+`, `-`, and `@` are neutralised | Developer |
| R-15 | Single-developer concentration — one person holds the full context of a codebase that is about to change substantially | **Low** | [Q4] confirms one developer, with no ramp-up cost and no budget constraint. The absence of schedule pressure means there is no forcing function to distribute knowledge | Record the architectural decisions as ADRs at the design stage so the reasoning survives independently of the person. Accept the concentration as a known trade-off, mitigated by the absence of a deadline | Architect |
| R-16 | The absence of CI means the 66/66 baseline is verified only when someone remembers to run it | **Medium** | Verified: no CI workflow exists. The org-level testing posture requires CI execution before merge for the `feature` scope | A CI pipeline is a pre-existing gap the MVP inherits rather than creates. The build-and-test stage must address it, or the scope's coverage floor and merge gate are unverifiable | Quality engineer |

## Assumptions

| ID | Assumption | Confidence | Basis | If it fails |
|---|---|---|---|---|
| A-01 | The `feature` scope places the operation phase in scope, so the deployment target and the operational environment are feasibility questions rather than later-stage decisions | **High** | [Q8] records the workflow-selected scope as `feature`, and `aidlc-state.md` records 33 total stages with "Stages to Skip: none" | The operation-phase work would move later, but no feasibility finding changes |
| A-02 | The POC's technical baseline holds as verified — audit cascade destruction, the `status` CHECK excluding `discarded`, functional-index support, the non-zero default `busy_timeout`, the clean migration over a legacy database, the 66/66 test baseline, the absence of CI/container/cloud posture, and the machine-local nature of `data/` | **High** | Every item was confirmed by reading source or executing probes against a live database, not estimated | A failed verification invalidates specific feasibility verdicts and must be re-checked before the corresponding build work starts |
| A-03 | The actor-identity *rule* is fixed and not reopened: every audit entry derives its actor from trusted server-side context, and client-supplied identity is never trusted | **High** | [memory:M2] states it as a standing condition of the binding contract | Nothing in this stage proceeds — the rule underpins the Audit Completeness metric and the entire audit design |
| A-04 | Application-managed login is the leading *candidate* for the actor mechanism, with its additional scope and feasibility implications stated explicitly rather than absorbed | **High** | [Q3], as confirmed after the human's revision | If the candidate shortlist is rejected wholesale, the feasibility assessment's actor section is reworked, but the rule and the Audit Completeness metric are unaffected |
| A-05 | No candidate for the actor mechanism is assumed available or unavailable | **High** | [Q3] directs that an existing identity provider or proxy must not be assumed. The estate's verified state — no identity provider, no proxy, no authentication code — is a fact about the current estate only | If an existing trusted mechanism turns out to exist, candidate B becomes viable at low cost and the cost of candidate D falls away. This is issue I-01, and it is the single question that most changes the actor workstream's size |
| A-06 | No external regulatory framework is imposed over asset custody records beyond an internal audit expectation | **Medium** | [Q2] answers this directly. It is reasoned from the confirmed position rather than from a compliance attestation | If a framework does apply, the compliance surface widens substantially and the operation phase's obligations change. Recorded as issue I-02 for the adjacent records question this does not cover |
| A-07 | The internal existing-tool inventory may still reveal a system already in place that covers part of the custody need | **Medium** | The market research recorded this as residual uncertainty U1; the inventory was never gathered | The MVP's scope would narrow or change, and a partner/integrate path would become more attractive for the overlapping part |
| A-08 | Organizational adoption readiness is unknown and must be treated as unknown | **High** | [Q7] answers "not yet defined"; the assumption recorded is about the state of knowledge, not about the risk level | If adoption readiness is later established as poor, R-02 escalates from an open item to an active risk requiring a rollout plan |
| A-09 | The single-host, local-SQLite deployment target is coherent with the approved concurrency contract and will remain so | **Medium** | [Q6] confirms the target; the standing conditions on uniqueness are written against exactly this concurrency model. The reasoning is sound, but the target has not been load-tested at the upper end of the medium scale | A scale finding would reopen the deployment-target question, which would in turn change the concurrency contract the approved decisions are written against. That would be a scope-level matter requiring a new approval round |
| A-10 | The workbook's amendment surface is the list given in the decision set's amendment table | **High** | [memory:M3] enumerates it explicitly | The workbook amendment would need re-scoping, which is a contract change rather than a build change |
| A-11 | The design-system enumeration carried in the decision set is indicative, with workbook section 11 authoritative | **High** | [memory:M3] states this directly | Nothing — this assumption exists precisely to prevent the shorter list being mistaken for the specification |
| A-12 | Complex recovery workflows remain deferred and distinct from the single included `lost → in-stock` transition | **High** | [memory:M3] states this explicitly | Nothing — it protects the scope boundary |

## Issues

| ID | Issue | Severity | Detail | Next action | Owner |
|---|---|---|---|---|---|
| I-01 | Whether an existing trusted authentication mechanism is available anywhere in the organisation is unresolved | **Blocking** (for the actor decision only) | The POC's estate contains no identity provider, no authenticating proxy, and no authentication code, and no reverse proxy exists. This is a fact about the current estate. Whether the organisation has such a mechanism elsewhere was not established, and [Q3] directs that it must not be assumed in either direction | Gather the internal existing-tool inventory (which also resolves I-03) and determine whether a trusted authentication mechanism is reachable. This is the question that most changes the actor workstream's size, and it should be answered before the mechanism is selected at the design stage | Architect |
| I-02 | Whether an internal records-retention or disposal schedule applies to asset custody records | **Material** | [Q2] answered the *framework* question — no external framework is imposed. It did not ask the adjacent *records* question, which is a different one: whether a schedule governs how long custody records are kept | Ask whether a records-management schedule covers asset custody records, and what retention applies to an audit trail that must survive asset deletion. If none applies, record that the default is indefinite retention | Compliance |
| I-03 | The internal existing-tool inventory was never gathered | **Material** | The market research's evidence standard selected "upstream artifacts plus internal input", and the internal input was not collected. Consequently no claim that "no existing system already covers this" is supported, and the off-the-shelf characterisations remain labelled hypotheses | Gather the inventory from IT, HR, Finance, and Operations — the four named teams. This is a precondition for a firm total-cost comparison and it also resolves I-01 | Product owner |
| I-04 | The total-cost comparison between build and buy is indeterminate, because no licence was quoted | **Informational** | The market research recorded this as residual uncertainty U2 and stated plainly that the cost row is indeterminate rather than favourable to Build | No action required for the Build position to hold — the differentiator argument does not depend on it. Resolve only if a purchase decision is revisited | Product owner |
| I-05 | Organizational adoption readiness is undefined | **Material** | [Q7] answers "not yet defined". Preserved as an open RAID item at the human's direction, and tracked here as R-02 | Gather stakeholder input on what would make the tool the easier path than the spreadsheet. Until then the position is treated as unknown, not as low risk | Product owner |
| I-06 | The actor-trust rule is unimplementable as written until the actor mechanism is chosen | **Material** | The rule is fixed and the mechanism is unset. The audit table has no actor column today, so there is nowhere to write an actor even if one were known | Sequence: land the audit-table replacement (which adds the actor column) first, then implement the selected mechanism. This ordering removes the dependency entirely | Architect |

## Dependencies

| ID | Dependency | Needed by | Nature | Status |
|---|---|---|---|---|
| D-01 | The audit-table replacement, which adds the actor column and removes the cascade | Every lifecycle transition; the actor mechanism; the Audit Completeness metric | Internal, ordered first | Not started — scheduled as the foundation workstream |
| D-02 | The `assets` table rebuild, which admits `discarded` to the `status` CHECK | The discard transition; the five exclusive buckets; Active Inventory and Total Records | Internal, ordered first | Not started — scheduled as the foundation workstream |
| D-03 | The `last_assigned_to` column and the explicit update path that preserves it | Previous-holder preservation; the discard transition's inline resolution | Internal | Not started — depends on D-02 for the status set and on the update-path correction |
| D-04 | The shared counting function and filter builder | The dashboard, the assignee directory, the asset list, and CSV export — all four surfaces | Internal, with four consumers | Not started — must be built before any surface that consumes it |
| D-05 | The functional unique index and the shared comparison predicate | Registration; serial-or-key updates; duplicate-detection UX | Internal | Not started — depends on the IMMEDIATE transaction and the `SQLITE_BUSY` error mapping |
| D-06 | The pre-MVP audit backfill with a `system` actor | The Audit Completeness metric's defined population | Internal, depends on D-01 | Not started — depends on the actor column existing |
| D-07 | The design system (workbook section 11) | The dashboard, the assignee directory, and the responsive UI work | Internal, gates the surfaces workstream | Not started — the largest unestimated body of work |
| D-08 | The decision on the actor mechanism (I-01) | The actor-context implementation; the Audit Completeness metric | External input required from the human and the organisation | **Open** — the gating dependency for the actor workstream |
| D-09 | The internal existing-tool inventory (I-03) | The adoption-rollout plan; a firm total-cost comparison; a firm answer to I-01 | External input required from the human and the four named teams | **Open** |
| D-10 | A records-retention answer (I-02) | The audit trail's retention design; the operation phase's storage obligations | External input required from the human | **Open** |
| D-11 | A backup and restore procedure, exercised | The operational durability of the whole system of record | Internal, operation phase | Not started — depends on D-02, since the schema changes alter the file |
| D-12 | A CI pipeline | The scope's coverage floor and merge gate; enforcement of the 66/66 baseline | Internal, operation phase | Not started — inherited gap, not one the MVP creates |
| D-13 | The workbook amendment across the named sections | The traceability of the approved MVP requirements to the workbook | External artefact, plus internal traceability records | Not started — depends on the design stage's decisions |

## Dependency Chain

The dependencies above are not independent. Three of them form a hard ordering chain that
nothing else can be reordered around:

```
D-01 (audit table + actor column)
  └─> D-06 (backfill with a system actor)
        └─> Audit Completeness metric measurable

D-02 (assets table rebuild)
  └─> D-03 (last_assigned_to + explicit update path)
        └─> D-04 (shared counting function)
              └─> dashboard, assignee directory, asset list, CSV export

D-08 (decision on the actor mechanism)
  └─> actor-context implementation
        └─> Audit Completeness metric achievable
```

The third chain is the only one with an open external dependency, and it is why I-01 is
rated blocking for the actor decision specifically. Resolving I-01 is cheap — it is a
question, not engineering — and it unblocks the largest single uncertainty in the MVP.

## Aggregate Position

| Category | Open | Closed | Total |
|---|---|---|---|
| Risks | 16 | 0 | 16 |
| Assumptions | 12 | 0 | 12 |
| Issues | 6 | 0 | 6 |
| Dependencies | 13 | 0 | 13 |

**Nothing in this log is closed.** That is the accurate position rather than a pessimistic
one: the feasibility stage's job is to find what is uncertain while the cost of finding out
is still low, and the log records 47 items that were all identifiable now and none of which
was allowed to be discovered late.

The three items that most warrant attention before construction begins are:

1. **I-01 / D-08** — whether an existing trusted authentication mechanism exists. It is a
   question, it is cheap to answer, and it determines the size of the actor workstream.
2. **R-01** — the migration runner, which is the single component both structural changes
   depend on and the least covered of the three areas under change.
3. **R-02 / I-05** — organizational adoption readiness, which is preserved as an open item
   at the human's direction and which no technical finding can retire.

## Assumptions & Open Questions

- [assumption] The POC's technical baseline is verified directly against the source and a live database — audit cascade destruction, the `status` CHECK constraint excluding `discarded`, functional-index support, the non-zero default `busy_timeout`, the clean migration over a legacy database, the 66/66 test baseline, the absence of CI/container/cloud posture, and the machine-local nature of `data/`. These are observations, not estimates, and are not treated as assumptions.
- [assumption] The absence of any recorded compliance framework is not treated as a compliance clearance. The market research established that there is no regulatory *driver* for the initiative; whether an obligation *attaches* to the custody data is a separate question, which is why Q2 asks it directly. Until Q2 is answered, the compliance position is recorded as "not established" rather than "none".
- [assumption] The `feature` scope places the operation phase in scope, so the deployment target and the operational environment are feasibility questions rather than later-stage decisions. Q6 asks for the deployment target because the verified position — a single host with a machine-local SQLite file — is materially different from a container platform or a managed database, and the choice changes the concurrency contract the approved decision set is written against.
- [assumption] The actor-identity *rule* is fixed and is not reopened by this stage: every audit entry must derive its actor from trusted server-side context, and client-supplied identity is never trusted [memory:M2]. What remains open is the *mechanism* that implements it. The POC deferred authentication entirely and the 17-item decision set does not mention it, so Q3 records a shortlist of candidates with application-managed login as the leading candidate rather than a decided implementation. No candidate is assumed available or unavailable: the absence of an identity provider or authenticating proxy in the verified baseline is a fact about the current estate, and whether application-managed sessions are necessary or merely the fallback depends on an evaluation this stage carries out rather than an assumption made in either direction.
- [assumption] No AWS or cloud landscape is assessed. The verified position is that no AWS CLI, no Terraform, no CDK, no Dockerfile, and no CI workflow exist, and the POC runs from a local Node process against a local SQLite file. The platform perspective therefore records what the chosen deployment target implies, rather than proposing a cloud architecture that the evidence does not support.
- [assumption] Organizational adoption readiness is **not** resolved by this stage. Q7's answer is "not yet defined", and the market research records the same gap as residual uncertainty U1 — the internal existing-tool inventory was never gathered and no licence was quoted. This is carried as an open RAID item rather than as a mitigated risk, because the incumbent spreadsheet-plus-email process has near-zero switching cost and no incumbent contract to displace: the practical failure mode is that teams continue using the spreadsheet, which no technical feasibility finding can retire. The assumption recorded here is only that the position is unknown and must be treated as unknown, not that adoption risk is low.

## Sources Consumed

- **intent-statement** (`aidlc/spaces/default/intents/261106-asset-tracker-mvp/ideation/intent-capture/intent-statement.md`) — the approved scope, the target customer, the Audit Completeness metric, and the standing conditions that constrain every entry in this log.
- **competitive-analysis** (`aidlc/spaces/default/intents/261106-asset-tracker-mvp/ideation/market-research/competitive-analysis.md`) — the incumbent spreadsheet's characteristics, which establish the adoption risk that R-02 preserves as open.
- **market-trends** (`aidlc/spaces/default/intents/261106-asset-tracker-mvp/ideation/market-research/market-trends.md`) — the concurrency, integrity-under-concurrency, and count-consistency trends that frame R-05, R-06, and D-04.
- **build-vs-buy** (`aidlc/spaces/default/intents/261106-asset-tracker-mvp/ideation/market-research/build-vs-buy.md`) — the Build position and its residual uncertainties U1 and U2, which become I-03 and I-04.
- **feasibility-questions** (`aidlc/spaces/default/intents/261106-asset-tracker-mvp/ideation/feasibility/feasibility-questions.md`) — the eight confirmed answers and the accepted assumptions.
- **POC source** (`src/`, `tests/`, `package.json`, `views/`, `public/`) — the verified architecture, schema, transition map, update-path behaviour, deployment posture, and the 66/66 test baseline that every risk and dependency above is measured against.

## Review

Reserved for the reviewer at the approval gate.
