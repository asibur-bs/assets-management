# Build vs Buy Assessment — Asset Tracker MVP

## Sources

- [desc] Initial description: "Build the Asset Tracker MVP from the approved Asset Tracker MVP Development Workbook, the POC-vs-MVP gap analysis, the decision brief, and the fully approved 17-item decision set. The MVP adds actor-attributed append-only audit history, previous-holder preservation via last_assigned_to, lost-asset recovery (lost to in-stock), an assigned to discarded transition that resolves the assignment inline, five exclusive status buckets with Active Inventory and Total Records computed by one shared counting function and filter builder, case-insensitive category-scoped serial uniqueness via a functional index with a concurrency-safe application-level fallback, CSV export with formula-injection protection, and an amendment to workbook section 4.1 and section 21.1 Scenario 3 recording Returned as a distinct resting state."
- [scope] Workflow-selected scope: `feature`.
- [Q1] The MVP's real competitor is a shared spreadsheet or document plus email threads — the spreadsheet holds the record, email carries the changes.
- [Q2] The competitive landscape is framed as both the internal-build option and the off-the-shelf products, with the off-the-shelf set as the reference point for feature parity.
- [Q3] The table-stakes capabilities are: asset registration with category and serial/key plus a list view with search, filter, and sort; assignment of an asset to a named holder and recording its return; marking an asset lost with a captured reason; and a per-asset view showing every event that ever happened to it.
- [Q4] Auditability — an actor-attributed, append-only, never-destroyed history with defensible write-offs — is the MVP's primary differentiator; everything else is table-stakes.
- [Q5] The build-vs-buy position is Build — extend the existing POC. The audit, uniqueness, and counting semantics are specific to this organisation's rules and are not a configuration option in any off-the-shelf product.
- [Q6] There is no specific external driver; the driver is operational efficiency and the absence of a system of record.
- [Q7] The realistic scale is medium — several internal teams (IT, HR, Finance, Operations) sharing a single record, hundreds to low thousands of assets.
- [Q8] The competitive analysis and build-vs-buy assessment are grounded in the approved upstream artifacts plus internal input — a stakeholder or existing-tool inventory of what is actually in use at the organisation.
- [memory:M2] `aidlc/spaces/default/memory/project.md#Decided`: "The fully approved 17-item Asset Tracker MVP decision set, together with the Asset Tracker MVP Development Workbook, is the binding technical and product contract for the `asset-tracker-mvp` intent; it is not reopened at any stage of that intent, and it carries seven standing conditions — the uniqueness check uses an IMMEDIATE transaction and a non-zero SQLite `busy_timeout` with `SQLITE_BUSY` mapped to a retryable error; the functional-index expression and the application-level comparison predicate use one shared definition; registration and serial/key updates enforce the same uniqueness policy; historical backfills preserve original records and audit traceability and report failures; dashboard, assignee, asset-list, and CSV counts use consistent filtering and counting definitions; every lifecycle transition has explicit validation and audit behaviour; and the existing 66/66 passing test baseline is preserved with regression tests added for newly approved behaviour. Traceability must be maintained between the approved MVP requirements and the POC requirements FR1.3, FR4.4, FR4.5, and FR5.3, and actor identity is resolved from trusted server-side context so actor information supplied in a write request is never trusted. (Stage intent-capture, 2026-11-06)"

## Purpose and Status

This assessment is derived from the upstream `intent-statement` artifact produced by the
intent-capture stage (`aidlc/spaces/default/intents/261106-asset-tracker-mvp/ideation/intent-capture/intent-statement.md`),
whose target customer, success metric, and confirmed scope bounds are the premise throughout.

This assessment presents the build-vs-buy calculus for the Asset Tracker MVP and records the
position taken: **Build — extend the existing POC** [Q5].

**This is a position, not a reopening of the approved decision set.** The approved 17-item
decision set and the Development Workbook are the binding technical and product contract for
the `asset-tracker-mvp` intent and are not reopened at any stage of that intent [memory:M2].
The decision set fixes *what* the MVP is; it does not record a buy, partner, or hybrid
alternative as a considered-and-rejected option. This document therefore does the work the
decision set did not do: it names the alternatives, states the calculus, and records why Build
holds — without altering a single element of the approved scope.

Scope is fixed for this MVP, and the approved decision set and the workbook define it, and
changes require a new approval round. This assessment accordingly introduces **no scope
change and no new product decision**.

## The Alternatives

Four alternatives were considered. The off-the-shelf set is carried as a parity reference
rather than a purchase shortlist [Q2].

### A1. Build — extend the existing POC *(the position taken)*

Continue the POC into the MVP: replace the audit table, add the actor context, add the five
buckets and the shared counting function, add the functional unique index, add the recovery
and discard transitions, and build the dashboard, assignee directory, and CSV export.

### A2. Buy — adopt an off-the-shelf product and configure it

Purchase a commercial or open-source asset-tracking product and configure it to meet as much
of the requirement set as the product permits. The competitors' table-stakes coverage is
broad, and configuring a mature product is faster than building.

### A3. Partner / integrate — keep the POC as the system of record, integrate with an existing enterprise system

Retain the POC for custody and audit, and integrate with an enterprise system (identity,
ticketing, finance) for the adjacent needs so that actor identity and write-off posting do not
have to be solved in-house.

### A4. Hybrid — build the audit-and-custody core, buy the table-stakes periphery

Build the audit trail, the transition model, the counting definitions, and the uniqueness
enforcement — the differentiator — and adopt an off-the-shelf product or module for the
commodity capabilities.

## The Evaluation

Scoring is on the standard criteria, each relative to this organisation's situation rather
than in the abstract.

| Criterion | Assessment |
|---|---|
| **Core differentiator?** | **Strongly favours Build.** The differentiator is auditability [Q4] — actor-attributed append-only history, previous-holder preservation, inline discard resolution, a domain-specific audit-action vocabulary, and counts that agree by construction. These are organisation-specific rules, not commodity capabilities. The decision rule for the Build option is that the capability must be central to the competitive advantage; it is the whole of it. |
| **Time to market** | **Favours Buy — and this is Buy's strongest argument.** A purchased product delivers registration, assignment, return, history, and reporting in days to weeks, against a build that the gap analysis assesses at 6–8 weeks *if* the design workstream is scoped to the screens actually needed. But the 6–8 week figure is for the *whole* MVP, most of whose value is in the differentiator, so the marginal time to market of the differentiator alone is smaller than the headline suggests. |
| **Total cost (3-year)** | **Mixed, currently indeterminate.** Build costs are known and bounded here: the existing stack is Node.js, Express, EJS, and better-sqlite3 with no licence cost and no vendor dependency, and the incremental cost is engineering time. Buy costs are *not* determinable from the available evidence — no pricing was gathered and no product was evaluated, which is exactly why the pricing row in the competitive analysis is a hypothesis rather than a figure. A licence cost that has not been quoted cannot be compared against an engineering cost that has. |
| **Customization needed** | **Strongly favours Build.** The differentiator properties are architectural invariants and domain rules, not settings. The POC's `audit_log` carries `ON DELETE CASCADE` from `assets`, which silently destroys history; correcting that means replacing the table outright, which a third-party product's own schema does not invite. The compound discard semantics — clear `assigned_to`, retain `last_assigned_to`, record the discard, the prior holder, and the fact that the assignment was resolved by the discard — are a write behaviour, not a field. |
| **Data sensitivity** | **Mildly favours Build.** Asset custody records are operational and financial data about named individuals, and the actor-trust rule — that actor identity comes from trusted server-side context and never from the write-request body — is a security invariant. Keeping the records in a system the organisation controls keeps the audit and the data in the same trust boundary, with no vendor-side processing of employee custody data. |
| **Team expertise** | **Favours Build.** The stack, the architecture, the migration runner, the service/repository split, and the test suite are all established. There is no capability gap to close; the work is extending a known codebase rather than learning an unfamiliar one. |
| **Maintenance burden** | **Genuinely ambiguous, and the one criterion where Buy wins on its face.** A vendor absorbs security patches, upstream schema migrations, and compatibility maintenance. Here that burden is the organisation's. But it is a burden the organisation has *already accepted* — the POC is in production-shaped code with a maintained test suite and a versioned migration runner — and the MVP's scope does not introduce a new platform. |

## Why Build Holds

The calculus turns on a single observation, which the competitive analysis established:
**the table-stakes are commoditised and the differentiator is not.**

The four table-stakes capabilities [Q3] — registration with list/search/filter/sort, assignment
and return, loss with a reason, and a per-asset history view — are present in mature
off-the-shelf products. If the MVP delivered only these, buying would be the better answer, and
the Build case would rest on nothing.

It does not deliver only these. It delivers an audit trail that cannot be cascade-deleted, an
actor on every entry resolved from trusted server-side context, previous-holder preservation, a
recovery transition with its own distinct audit action, a discard that resolves its assignment
inline, one shared counting function feeding four surfaces, and case-insensitive category-scoped
uniqueness under an explicit concurrency contract. Each of these is a property of a *system*,
and none of them is known to be a configuration option in any product in the parity reference
set.

Three further considerations reinforce the position:

1. **The Build option is already partly paid for.** Roughly 35–40% of the MVP's foundational
   work exists, and the pieces that exist are the hard architectural ones — the layered
   structure, the migration runner, the enforced state machine, the error-code contract, and the
   server-rendered view layer with `data-testid` hooks. The remaining work is concentrated in
   the differentiator. A Buy decision does not avoid that work; it substitutes a smaller but
   *different* work item, of unestimated size, against an unestimated licence cost.
2. **The cost of being wrong is asymmetric.** If Build is chosen and an off-the-shelf product
   would have done, the loss is engineering time on a system that works and satisfies the
   requirement set. If Buy is chosen and no product can be configured to meet the audit
   contract, the loss is the differentiator itself — the thing the product exists to provide —
   and the organisation is back at the spreadsheet, having paid a licence and a configuration
   effort for the privilege.
3. **There is no forcing deadline.** The driver is operational efficiency, not a regulatory
   obligation [Q6]. This removes the main reason to buy — the need for something working
   immediately — and it also means the internal inventory [Q8] can be gathered properly before
   a purchase decision is taken, rather than under time pressure.

## Why the Alternatives Were Not Taken

### A2. Buy — not taken

Buying would meet the table-stakes and would not meet the differentiator, which is the only
part of the requirement set that is not commodity. The audit-action vocabulary, the compound
inline discard resolution, the actor-trust invariant, the shared counting definition, and the
SQLite-specific concurrency contract are all requirements of *this* organisation's rules. Buying
would also mean acquiring a product, a licence model, a vendor relationship, and a data-handling
review, none of which has been evaluated — and choosing among them would require the internal
existing-tool inventory that is not yet in hand [Q8].

The honest weakness of this position is the **cost comparison is not yet complete**: no pricing
was gathered and no product was evaluated, so the total-cost row above is indeterminate rather
than favourable. A Buy case could be made on cost once a licence is actually quoted. What
cannot change is the differentiator argument.

### A3. Partner / integrate — not taken

Integration has real value on one axis specifically: if a trusted actor identity already exists
in an enterprise identity system, the actor-context question — the mechanism by which a trusted
actor is established, which the POC deferred entirely and which the decision set does not
settle — becomes much easier to answer correctly.

But integration is not an alternative to building the custody model; it is an *addition* to it.
The integration option still requires the audit trail, the transition model, the counting
definitions, and the uniqueness enforcement to exist and to meet the approved contract. On its
own it delivers none of them, and on top of Build it is a later, optional stage that the
approved scope does not include and that this stage must not introduce.

### A4. Hybrid — not taken, and it is the closest alternative

Hybrid deserves a straight answer rather than a dismissal, because the shape of the MVP is
already close to it: the audit-and-custody core is the bulk of the approved scope, and the
table-stakes periphery is mostly already implemented in the POC.

The reason it was not taken is a boundary question rather than a quality judgement. In this MVP
the table-stakes are not a separable periphery — registration, assignment, return, loss, and the
history view are *the surfaces through which the audit trail is written*. A hybrid would split
the audit-writing paths across two systems, and the standing condition that dashboard,
assignee, asset-list, and CSV counts use consistent filtering and counting definitions, and
that registration and serial/key updates enforce the same uniqueness policy, both assume a
single system of record. Splitting them would introduce exactly the inconsistency the MVP
exists to eliminate.

There is a narrower version of the hybrid idea that is worth recording for the next stage, and
which is *not* a scope change: the identity mechanism. If an existing enterprise identity system
turns out to be the right answer to the actor-context question, then the actor identity is
sourced from an external system while the custody model remains built. That is an
implementation choice inside the approved actor-trust rule, and it is properly a question for
the requirements and design stages, not a scope change now.

## Position

**Build — extend the existing POC.** The audit, uniqueness, and counting semantics are specific
to this organisation's rules and are not a configuration option in any off-the-shelf product
[Q5].

This position adds no scope and reopens nothing. The approved decision set and workbook remain
the binding contract [memory:M2]; the alternative options are recorded here as considered, and
their rejection is recorded here as the assessment the decision set did not contain.

## Residual Uncertainty

Two items would change the calculus if resolved differently, and both are carried forward
rather than settled here:

| # | Open item | Effect if resolved against Build |
|---|---|---|
| U1 | The internal existing-tool inventory [Q8] may show that a system already in place covers a meaningful part of the custody need | The MVP's scope narrows or changes, and a partner/integrate path becomes more attractive for the overlapping part |
| U2 | A quoted licence plus a configuration effort could make the total-cost comparison favour Buy | The cost row of the calculus flips. The differentiator argument does not, so the outcome would be a re-examination rather than an automatic Buy |

A third item is a precondition rather than a risk: the actor-identity mechanism remains
unsettled, and the Audit Completeness metric depends on it. This is not a build-vs-buy
question and is not resolved by this assessment.

## Sources

The following upstream artifacts were read to ground this assessment:

- **Asset Tracker MVP Development Workbook** — the approved feature set, the section 27
  additions, and the amendment surface.
- **POC-vs-MVP gap analysis** (`aidlc/spaces/default/intents/261004-poc/analysis/gap-analysis.md`)
  — the 35–40% foundational-work estimate, the audit-cascade finding, the `status`
  CHECK-constraint finding, the missing `in-stock → lost` transition, the count-consistency
  requirement, and the 6–8 week effort read with its design-scope condition.
- **Decision brief** (`aidlc/spaces/default/intents/261004-poc/analysis/decision-brief.md`) —
  the four decision areas and the ten open questions.
- **Consolidated decision review** (`aidlc/spaces/default/intents/261004-poc/analysis/consolidated-decision-review.md`)
  — the fully approved 17-item decision set.
- **POC source** (`src/`, `tests/`, `package.json`) — the verified architecture, schema,
  transition map, dependency set, and the 66/66 test baseline.

## Assumptions & Open Questions

- The competitive landscape, the product comparisons, and the market-size figures are internal-tool characterisations rather than external revenue-market research, because the MVP serves internal IT asset administrators and has no external market positioning. Any figure, product capability, or pricing statement that is not already established in the approved upstream artifacts is carried as an explicit hypothesis and labelled as such, per the ideation phase's evidence standard.
- The build-vs-buy position is not settled by the approved decision set, which fixes the MVP's scope and technical contract but does not record a buy, partner, or hybrid alternative as a considered-and-rejected option. The assessment therefore presents the calculus rather than recording it as a settled decision, and no option is adopted here.
- The sizing question is answered in terms of internal usage and asset count rather than in revenue, because there is no external revenue market for this tool; whether any external sale or licensing is contemplated at all was not answered by the confirmed intent-capture questions.
- The stage's own condition — execute on external market positioning or build-vs-buy considerations, skip for internal tools — is satisfied because the approved scope is `feature` with no stage skipped, and because the intent-capture Q8 answer explicitly requires the operation phase and no stage skipped. The build-vs-buy consideration is genuine, and skipping the stage would require a new human approval round.

## Review

Reserved for the reviewer at the approval gate.
