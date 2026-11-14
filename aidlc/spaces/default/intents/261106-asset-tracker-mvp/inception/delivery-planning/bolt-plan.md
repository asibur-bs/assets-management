# Bolt Plan — Asset Tracker MVP

**Stage**: delivery-planning (inception)
**Intent**: 261106-asset-tracker-mvp
**Space**: default
**Scope**: feature

This file is the delivery sequence for the Asset Tracker MVP: the Bolts the
release is delivered in, what each one carries, what each one assumes, and
what each one proves.

**A Bolt** is one increment of delivered, mergeable work that carries its own
proof. Later mentions read as "Bolt".

**What this file is.** The economic path through the dependency DAG that
stage 2.7 produced. The DAG is the topology — what can be built from what.
This file chooses the order.

**What this file is not.** It is not a schedule. There is no date, no
duration, no effort estimate, and no throughput figure anywhere in it, because
the release has no deadline, no budget, and an unquantified capacity
constraint. The complexity band carried per Bolt is a **relative ordering aid**
inherited from the units stage, not a commitment.

**What it does not do.** It does not reopen the approved decision set, the
workbook, the requirements, or the stories. It does not re-plan the units: the
six units and their ten edges are the units stage's, and this plan cuts them
into increments.

---

## The Sequence

Seven Bolts. The order is fixed by the dependency DAG, by three
project-wide ordering constraints, and by the risk-first ordering the Ideation
phase approved.

| # | Bolt | Unit(s) | Band | Carries | Depends on |
|---|---|---|---|---|---|
| **B1** | `establish-the-toolchain` | `u6-tooling-and-delivery` (part 1) | M | Formatter and linter configuration, the pre-commit hook, the enforceable coverage floor | nothing |
| **B2** | `lock-the-merge-gate` | `u6-tooling-and-delivery` (part 2) | M | Hosted pipeline definition, deploy procedure with backup and smoke test | B1 |
| **B3** | `define-the-domain-vocabulary` | `u2-domain-vocabulary` | M | The five statuses, the eight released edges, the reason and audit-action vocabularies, the uniqueness predicate, the shared counting and holder definitions, the eight-code error vocabulary | nothing |
| **B4** | `rebuild-the-history` | `u1-foundation` | L | The two-table rebuild, the backfill to a `system` actor, the append-only triggers, the connection and its `busy_timeout`, the actor resolution | B3, and the actor-mechanism decision |
| **B5** | `write-the-lifecycle` | `u3-write-path` | XL | Registration, uniqueness, editing, the eight transitions with their audit behaviour, the trusted actor attribution | B4, B3 |
| **B6** | `agree-on-the-counts` | `u4-reporting` + `u5-presentation` (count surfaces) | L | The query, the counting aggregation, the CSV export, and the dashboard, directory and list | B5, B4, B3 |
| **B7** | `complete-the-surfaces` | `u5-presentation` (remainder) | L | The detail screen and its history, the reason dialog, the edit and duplicate-warning flows, the accessibility work, the acting-as indicator | B6, B5, B4, B3 |

**The graph is respected.** Every Bolt's unit set is a subset of what the
DAG permits, and no Bolt precedes a unit it depends on. The check was made
against the machine-readable edge block in `unit-of-work-dependency.md`, not
against the prose table above it, and it is recorded in full in
`risk-and-sequencing-rationale.md`.

**Two Bolts sit outside the code DAG's ordering.** B1 and B2 are the tooling
unit, whose relation to every other unit is a **merge gate** rather than a
code edge. B2 in particular does not depend on B1 for code reasons — it
depends on it because the pipeline is the artefact that enforces the formatter
and linter, so configuring it before the formatter exists would produce a
pipeline that cannot pass.

**B3 depends on nothing**, which the DAG already records: the vocabulary is a
leaf over Node built-ins. It is sequenced third only because B1 and B2 are
short and gate everything that follows.

---

## The Cut, and Why It Is This Cut

**One Bolt per unit, with two exceptions the upstream rules force.**

| The rule | What it forces |
|---|---|
| `C12` — the formatter and linter configuration lands as its own first commit, before any MVP work | The tooling unit is **split**, because a Bolt that carried the tooling work and domain work together would defeat the reason the constraint exists: a formatting-only change is far easier to read on its own than the same change mixed in with a table rebuild. |
| `C11` — the hosted pipeline is configured before the MVP work merges | The pipeline is a **merge gate**, and a gate deserves an increment of its own so that its completion is visible rather than implicit in some other Bolt's merge. |
| `FR6.8` / `A13` — the four count-consuming surfaces ship as one indivisible group | U4 and U5 are **joined** into one delivery Bolt for the count surfaces, even though they remain separately reviewable units of work. |
| `NFR6.4` — two exceptions to the test-after ordering | The uniqueness-check test and the rebuild test each land in **their own commit**, ahead of the implementation they pin. |

**The write path was not split further.** U3 is the only XL band, and it is
the component family that owns the eight released edges. Splitting it would
put two units both editing the transition table, which the team's own chunking
constraint forbids, and it would split a guarantee that exists only as one
mechanism: the asset write and its audit append are one transaction.

**The count group is one Bolt, not two.** The dashboard, the assignee
directory, the asset list and the CSV export must ship together, because a
group that ships all but one of its members has no consistency guarantee at
all. The window in which U4 has merged and U5's three surfaces have not is
precisely the window in which the counts disagree. The four surfaces are
therefore built and merged as one indivisible increment.

**The count surfaces were separated from the rest of U5.** U5 carries seven
stories. Three of them — the dashboard, the directory and the list — are
count-consuming surfaces and belong to the indivisible group with U4's
export. The other four are not, and they are not held hostage to a guarantee
they do not participate in. That is the B6 / B7 split.

---

## Each Bolt

### B1 — `establish-the-toolchain`

**Unit**: `u6-tooling-and-delivery`, part 1. **Band**: M (relative ordering aid).

**Carries.** The Prettier configuration at 120 columns with single quotes and
`trailingComma: "es5"`; the ESLint recommended rule set with `strict:
['error', 'global']`, the one documented test-file override for
`no-unused-vars`, and the SAST rules riding in the same config; the `lint`,
`lint:fix`, `format`, `format:check` and `check` scripts scoped to `src tests
vitest.config.js`; the `.prettierignore` carrying `views/` and `public/`; the
pre-commit hook enforcing the ordered steps against the staged change; and
`coverage.thresholds.lines = 80` so the coverage floor becomes enforceable
rather than informational.

**The mechanical re-layout.** All fourteen tracked JavaScript files fail
`prettier --check` today, and the gap is `printWidth` — the codebase is
hand-formatted at roughly 120 columns and Prettier's default is 80. Adoption
is a configuration change plus a mechanical re-layout, and that re-layout is
part of this Bolt because the configuration does nothing until the code
passes it.

**Assumes.** Nothing. This Bolt depends on no other unit and on no contract.

**Proves.** The formatter and linter configuration passes on the tree as it
stands, and the pre-commit hook refuses a commit that fails a step. The
existing 66/66 baseline is still green — the re-layout changes no behaviour,
and the hook proves it by running the suite on the staged change.

**Risk.** Retires the risk that the 66/66 baseline is enforced only by
whoever remembers to run it, by making it enforced on every commit. It
retires no domain risk, and says so.

**Why it is first.** `C12` requires it, and it is the shortest path from the
release's current state to a state where every later commit is checked.

---

### B2 — `lock-the-merge-gate`

**Unit**: `u6-tooling-and-delivery`, part 2. **Band**: M (relative ordering aid).

**Carries.** The hosted pipeline definition running **lint → test → coverage
check → dependency audit**, in that order, with the dependency audit
(`npm audit --audit-level=high --omit=dev`) as a blocking gate; the runner's
Node version and platform matched to the deploy host's so the native addon is
built the same way in both places; `npm ci` as the install step; the deploy
procedure — `npm ci`, WAL-aware backup, apply migrations, restart, smoke
test — with the manual documented rollback; and the product-owner sign-off
and the deployed commit SHA recorded on every deploy.

**Assumes.** B1 — the pipeline enforces the formatter and linter, so
configuring it before those exist would produce a pipeline that cannot pass.

**Proves.** The pipeline is defined and runs the four steps in order and
blocks the merge on failure. The deploy procedure is written and its
backup-and-restore step is **exercised**, not merely written: the team's own
practice records that the SQLite file is the entire system of record, so a
backup procedure that has never been run is not a backup.

**Risk.** Retires the build-pipeline risk and the absent-CI inherited
obligation. It does not retire the migration-runner risk, which gates B4.

**The precondition it cannot satisfy alone.** The repository has **no
configured git remote**, and every hosted pipeline platform is
pull-request-based. The pipeline definition can be written; the hosted
pipeline cannot *run* until a remote exists. That is an organisational
arrangement, not a deliverable, and it is carried in
`external-dependency-map.md` with a named owner and a named first action.

---

### B3 — `define-the-domain-vocabulary`

**Unit**: `u2-domain-vocabulary`. **Band**: M (relative ordering aid).

**Carries.** The five status values; the transition table of exactly **eight**
released edges, with the two deferred edges absent and refused with the
invalid-transition code; the loss-reason vocabulary with its retirement-specific
values; the audit-action vocabulary of exactly **seven** actions; the
normalisation predicate the uniqueness check shares with the database's
functional index; the shared counting definition and the filter builder; the
display-holder definition, strictly non-falling-back; the display vocabulary
of the five literal labels; and the eight-code error vocabulary with
`BUSY_RETRYABLE` as its only retryable member.

**Assumes.** Nothing. The vocabulary depends on nothing but Node built-ins.

**Proves.** The leaf layer is a leaf: it imports from no other layer, and
every code in the vocabulary is mapped in the translation. The counting
*definition* lives here while the counting *aggregation* lives in U4 — the
split follows the data rather than the layer, and it is what gives the four
count-consuming surfaces one definition by construction rather than by review.

**Risk.** Retires the risk that the shared counting definition has no
consumers. It does not retire the risk that the two literal copies of the
status set — the schema's `CHECK` text and the stylesheet's `.status-*` class
names — drift; that is a recorded explicit boundary, and it is not retired
here.

**Note on an upstream recording defect.** The component catalogue's own
summary line (`components.md:50`) states the error vocabulary holds "exactly
nine values" while its own table, ADR-012 and the requirements all bind
**eight**. This Bolt binds eight.

The phase boundary check verified the count against the codebase: the POC's
five existing codes are all carried forward, and the release adds three —
`ASSET_DELETE_REFUSED`, `BUSY_RETRYABLE` and `INTERNAL`. Five plus three is
eight, and the apparent ninth candidate is absorbed rather than sat beside
one of the eight. The contract summary's eight is therefore correct and
`components.md:50`'s "nine" is the error.

**The correction is carried forward, not applied in place.** `components.md`
is bound by the Domain Design stage's own approval, so editing it would
invalidate that binding and re-open a closed stage approval — a human
decision, not an agent's. The correction therefore lands here: **this Bolt
implements eight codes, and its vocabulary tests assert the count is exactly
eight.** A test written from the mis-stated count would assert nine, fail
against a correct implementation, and invite a developer under pressure to
invent a ninth code with no requirement behind it. The phase check at
`verification/phase-check-inception.md` records the correction in full.

---

### B4 — `rebuild-the-history`

**Unit**: `u1-foundation`. **Band**: L (relative ordering aid).

**Carries.** The `audit_log` rebuild with its actor column; the `assets`
rebuild with the widened `status` check, the `last_assigned_to` column and
the case-insensitive category-scoped functional unique index; the backfill of
the pre-MVP history to a `system` actor, preserving the original records and
reporting failures; the two append-only triggers; the database connection and
its connection-level `busy_timeout`; and the actor resolution.

**The rebuild is one migration, not two.** A commit that rebuilds `assets`
without rebuilding `audit_log` first destroys the audit history — silently,
with the transaction committed and no error raised. The two rebuilds
interfere: split across two migrations there is a state between them in which
one table is rebuilt and the other is not, and the ordering that is safe
inside one transaction is not safe across two. The `audit_log` rebuild
precedes the `assets` rebuild, and the foreign key is re-added afterwards.

**The migration carries its own pragma window.** `foreign_keys` must be off
during the drop window and on afterwards, and the current runner has no
per-migration pragma window, so the runner is changed to support one. The
rebuild also drops the rebuilt table's indexes, so the migration re-issues the
index DDL itself.

**The two test-first commits.** `NFR6.4` names this Bolt as one of the two
exceptions. The rebuild test lands **in its own commit ahead of the
implementation**: it runs against a database populated with audit history and
asserts the history survives. The fixture it uses carries rows in every table
the migration touches, including `audit_log`, because the blind spot lives in
the fixture's shape and the fixture is what every future migration test will
be copied from.

**Assumes.** B3 for the values the schema's `CHECK` text and the backfill's
actor value are drawn from. And the **actor-mechanism decision** — see below.

**Proves.** Given a legacy database with N audit rows, after the rebuild, N
audit rows still exist, and the append-only triggers reject both `UPDATE` and
`DELETE`. The migration-runner safety gate is discharged here: the runner is
tested against a representative copy of the populated database — never the
live one — demonstrating the `assets` rebuild, row-for-row asset preservation,
audit-history preservation and successful completion.

**Risk.** Retires R-01, the migration runner as the single point of failure.
It does not retire R-02, which is a rollout risk no Bolt can retire.

**The blocking dependency.** `OQ1` — the actor-identity mechanism — is
unresolved. `audit_log` has no actor column today and `recordAudit` takes no
actor parameter, so the rule cannot be implemented as a code change alone.
**B4 cannot start until the mechanism is chosen**, and the choice is not the
team's to make: it needs an answer from the organisation. The team's
confirmed position (D-44) is to sequence the resolution forward and work
around the block rather than prepare both branches in parallel — which is
why B3 and B2 proceed while it is open.

---

### B5 — `write-the-lifecycle`

**Unit**: `u3-write-path`. **Band**: XL (relative ordering aid).

**Carries.** `AssetRepository` and `AuditRepository` over the rebuilt schema,
with prepared statements throughout; the transition table enforced with
explicit validation and explicit audit behaviour on every one of the eight
released edges; the registration path; the uniqueness comparison with its
three callers — the registration path, the edit path, and the inline
warning; the editing path with the editable field set and with status and
both holder fields left uneditable; the assignment, return, loss, discard and
recovery operations; and the trusted-actor attribution applied at every write
site.

**The two test-first commits.** `NFR6.4` names this Bolt as the second
exception. The concurrency test lands **in its own commit ahead of the
implementation**: it needs a file-backed database harness, because `:memory:`
is per-connection and would not exercise locking at all. The defect it
guards against is a race that a test written after the code will not reliably
reproduce.

**The uniqueness definition is one definition with three callers.** The
functional-index expression and the application-level comparison predicate
share a single normalisation definition, and registration and serial/key
updates enforce the same policy. Two definitions of "does this collide" is
precisely what lets them disagree.

**The uniqueness check runs inside an `IMMEDIATE` transaction with a
non-zero `busy_timeout`,** and `SQLITE_BUSY` is detected by its
machine-readable `err.code` and mapped to `BUSY_RETRYABLE`. `SQLITE_BUSY` is
never matched by message text.

**The asset write and its audit append are one transaction.** In a
synchronous driver a `try/catch` around two statements is not a rollback: a
throw between the asset write and the audit write leaves the asset updated
and the audit row missing. Audit Completeness is achievable only because
these are one transaction.

**The actor is resolved, never read.** The actor comes from trusted
server-side context. A request-supplied actor is **ignored** — not rejected,
not sanitised — and no client-settable field or header may be the actor's
source. If the chosen mechanism turns out to rely on a browser-attached
credential, the write path must reject a state-changing request that carries
no recognised origin, and a route-level test asserts the rejection. That
obligation cannot be specified until the mechanism is known, which is the
second thing `OQ1` blocks.

**Assumes.** B4 for the rebuilt schema, the functional unique index, the
append-only triggers, the connection and its `busy_timeout`. B3 for the
statuses, the transition table, the loss reasons, the audit actions, the
uniqueness predicate and the error codes. Nothing else — in particular the
presenter does not appear in this Bolt's seam, because it reads the
transition table from the vocabulary and giving it a second source would make
a presentation component depend on the write path.

**Proves.** Every one of the eight released edges validates and audits
explicitly; a transition that cannot happen is refused with
`INVALID_TRANSITION`; a concurrent registration cannot both succeed; a
duplicate serial is refused with a way forward; and every write carries a
server-resolved actor.

**Risk.** Retires the risk that the write path can mutate an asset without an
audit entry — the POC's own weakness, which the `architecture` artifact
records as a transition that can be performed without an audit entry. It does
not retire the risk that the actor mechanism is unchosen; `OQ1` is still open
when this Bolt starts.

---

### B6 — `agree-on-the-counts`

**Units**: `u4-reporting` and the three count-consuming surfaces of
`u5-presentation`. **Band**: L (relative ordering aid).

**Carries.** `AssetQuery` with its five exposed filter dimensions and the
holder dimension the filter state carries; `CountingQuery`, which evaluates
the shared counting definition by aggregation **in the database** rather than
by counting the asset set in memory; `CsvExport` with the one shared
formula-injection escaping applied to **every** string cell; the dashboard
with its five bucket tiles, its Active Inventory figure and its Total Records
figure; the assignee directory with its holder rows and per-bucket
breakdown; and the asset list with its shown and matching figures.

**This is the indivisible group.** The four surfaces ship together or not at
all. The dashboard's five tiles sum to Total Records, and Total Records minus
the discarded bucket equals Active Inventory.

**The export's escaping is one function applied to every string cell**,
covering a leading `=`, `+`, `-`, `@`, tab or carriage return — not a
selected subset of columns, because `name` and `notes` are user-typed free
text and the property that gets lost when someone adds a column later is
exactly the "all cells" property.

**The export's content type and the `X-Content-Type-Options: nosniff` header
are one control, not two.** A CSV served without `nosniff` and without a
correct `Content-Type` can be sniffed by the browser as HTML.

**Assumes.** B5 for the rows the query filters and returns. B4 for the
connection the aggregation runs on and the rebuilt schema. B3 for the filter
definition, the status values and the display-holder definition. Nothing
else.

**Proves.** The four surfaces agree with each other, checked by
repository-level tests that assert the agreement directly rather than leaving
it to review. The export's cells are escaped. The list's Reset clears the
whole filter state on every path into the list, including the directory's
holder-row link, where a Reset that cleared only the visible controls would
leave the matching count unequal to the total record count.

**Risk.** Retires the risk that the four surfaces disagree — the defect the
shared counting definition exists to remove. It does not retire the risk
that the release's performance is unmeasured; `US5.7`'s measurement is carried
in this Bolt, but the Operation phase's performance validation is separate.

---

### B7 — `complete-the-surfaces`

**Unit**: `u5-presentation`, remainder. **Band**: L (relative ordering aid).

**Carries.** The asset detail screen with the full ordered history sequence,
newest first, not a single latest entry; the reason dialog with its
consequence paragraph rendered from the asset's current status, with every
variant drawn; the asset edit form; the duplicate-serial inline warning from
the advisory read that takes no write lock; the accessibility work; and the
read-only acting-as indicator.

**The acting-as indicator is read-only.** The release draws no actor control
on any screen, so no write flow can be given a forged actor.

**The accessibility floor is WCAG 2.1 AA.** Colour is never the only carrier
of meaning, every control is keyboard-reachable, form errors are associated
with their field, one `h1` per screen with landmarks, and a skip link as the
first focusable element on every screen.

**The stylesheet's absence of a focus rule is a recorded gap (D1),** not a
defect this Bolt fixes. The browser default is the release's mechanism; a
one-off focus rule specified now would be replaced by the tokenised version
in the deferred design-system increment.

**The loading state is absent by design.** The application is synchronous and
server-rendered, and the release adds no client-side rendering, so a drawn
spinner would misdescribe how the application behaves.

**Assumes.** B6 for the query and the counts the list, dashboard and
directory render. B5 for the lifecycle transitions, the registration, the
editing and the uniqueness comparison. B4 for the resolved actor. B3 for the
transition table, the display vocabulary, the status values and the loss
reasons. Nothing else.

**Proves.** The history reads as a history, not as a latest entry. The reason
dialog explains the consequence before it asks for the reason. Every screen is
operable and readable without a mouse. The duplicate warning appears before
submission, from a read that takes no write lock.

**Risk.** Retires the risk that a write-off is unattributable — the discard
records the prior holder, the inline resolution, and the fact that the
assignment was resolved by the discard. It does not retire R-02, which is
resolved by the stakeholder process rather than by any Bolt.

---

## What Each Bolt May Assume

**A Bolt may assume only the contracts its predecessors published, and nothing
about their internals.** The twelve contracts from stage 2.8 are the whole
surface between Bolts. No Bolt may read another's internals to work around a
missing contract.

**Why the rule is stated this way.** The release has one author. A reviewer
cannot read the code and the plan together, so the seam between two Bolts has
to be a written, published thing. A contract that is advisory is not a
contract, and a Bolt that reaches into a predecessor's internals has
converted a published interface back into an implicit one.

**The contracts each Bolt consumes.**

| Bolt | Consumes | From |
|---|---|---|
| B1 | none | — |
| B2 | none | — |
| B3 | none | — |
| B4 | Contracts 1, 5, 6, 11 | U2, U1 |
| B5 | Contracts 1, 2, 5, 7, 8, 9 | U2, U1, U3 |
| B6 | Contracts 2, 3, 5, 6, 7, 10 | U2, U1, U3, U4 |
| B7 | Contracts 1, 2, 3, 4, 8, 9, 10, 11, 12 | U2, U1, U3, U4, U5 |

---

## Deployment Inside the Plan

**Every Bolt that changes runtime behaviour deploys and smoke-tests before the
next Bolt begins.** The deploy is part of the Bolt's completion, not a
separate batch at the end.

**The deploy order**: `npm ci` → WAL-aware backup → apply migrations →
restart the process → smoke test. The backup either stops the process or
uses the database's own backup mechanism, because `journal_mode = WAL` means
committed rows can still be sitting in the `*.sqlite-wal` sidecar file next
to the main database.

**The smoke test exercises the release's own success measure.** It registers an
asset, transitions it, confirms the audit entry carries an actor, and confirms
the pre-deploy row count is intact. A deployment that starts the process but
does not pass this smoke test is rolled back, not reported as successful.

**Why the deploy is inside the Bolt and not batched at the end.** The backup
exists precisely to absorb the migration's silent failure mode — the one that
raises no error — so it has to be exercised on the change that could cause
it. If the deploy is decoupled from the Bolt, the proof that Audit
Completeness holds is deferred to a point where a defect would be attributable
to several Bolts at once.

**B1 and B2 do not deploy.** Neither changes runtime behaviour: the first
changes how the source is written, the second changes how a branch is
checked. B2's deploy procedure is *written* in B2 and *exercised* from B4
onward.

**Every deploy carries the product owner's sign-off and records the deployed
commit SHA.**

---

## The Review Points

Three reviewer checkpoints are attached to named Bolts, and the design board
is a gate on a Bolt rather than a review of one.

| Checkpoint | Who | Where it sits |
|---|---|---|
| **The actor-mechanism decision** | IT leadership, with the Product Owner deciding | **Before B4 starts.** It is a precondition, not a review of B4 — the foundation's design depends on it and cannot be built until the answer exists. |
| **The design board** | Chaired by the Product Owner; the developer presenting; IT leadership consulted | **A gate on B4.** The foundation is not built until the board has reviewed its design. It is a condition of proceeding, not a ceremony. |
| **The operational-readiness sign-off** | Operations and IT leadership; the Product Owner signing off | **B7.** That the operation phase's obligations are discharged. |
| **The internal-reviewer demonstration** | The internal reviewer | **After B7.** That the custody record is defensible end to end by someone outside the build team. |

**The reviewer individuals are not yet named.** The constituency is recorded —
IT leadership, finance and operations — but the specific people must be named
before the first review point is *scheduled*. Until then the groups are
staffed but not scheduled. That is an open item carried in
`external-dependency-map.md`.

---

## The Design Inputs Each Bolt Consumes

No Bolt re-designs. Each names the design artifact it consumes.

| Bolt | Design inputs |
|---|---|
| B1 | `team-practices.md` — the affirmed Prettier and ESLint configuration and the script scopes, as promoted into `team.md` |
| B2 | `team-practices.md` — the deployment practice and the pipeline order, as promoted into `team.md`; `requirements.md` — `C11`, `C5`, `C6` |
| B3 | `components.md` and `decisions.md` — the catalogue and the 15 ADRs; `requirements.md` — `FR1.4`, `FR3.2`, `FR6.1` |
| B4 | `components.md` — `SchemaMigration`, `DatabaseConnection`, `ActorResolver`; `decisions.md` — ADR-009 (the rebuild ordering); `contract-summary.md` — Contracts 1, 5, 6, 11 |
| B5 | `components.md` — the six write-path components; `decisions.md` — ADR-006 (transition ownership), ADR-008 (the two transaction disciplines); `contract-summary.md` — Contracts 2, 5, 7, 8, 9 |
| B6 | `components.md` — `AssetQuery`, `CountingQuery`, `CsvExport`; `contract-summary.md` — Contracts 3, 7, 10; `stories.md` — the eight-asset reconciliation seed |
| B7 | `components.md` — the seven presentation components; `mockups.md` — the refined mockups, the eight screens and the reason-dialog variants; `wireframes.md` and `user-flow.md` — the rough mockups' screens and the seven flows; `contract-summary.md` — Contracts 4, 8, 9, 10, 11, 12 |

**The mockups are consumed as a chain, not as a set.** The rough mockups
(`wireframes.md`, `user-flow.md`) established the screens and the journeys; the
refined mockups (`mockups.md`) corrected them and specified the three
dialog variants the rough set's two-variant loss dialog omitted. B7 consumes
the refined set, because the refined set is the one that supersedes.

**The `team-practices.md` citation is to the artifact, not to the promoted
copy.** The practices-discovery stage's `team-practices.md` is the source
document; the promoted sections in `team.md` are what the team now works to.
Citing the source names where the configuration came from, and citing the
promoted copy names where it now lives — and the promotion tool copies five
fixed sections only, so the source is the only place the full practice set
is visible.

**The reverse-engineering scan's scope is recorded as `kind: partial`.** Its
nine-article knowledge base is a reference, not a re-verification obligation:
`node_modules/`, `data/`, `coverage/`, the lockfile and three untracked
scratch files were only skimmed. The plan does not schedule a re-verification
increment, because its scope would be unbounded.

---

## The Timing Position

**No date, no duration, no effort estimate, no throughput figure appears
anywhere in this plan.** The capacity position is an allocation rule: the
actor-identity resolution and the design-board checkpoint take precedence over
every other item in the queue, and no other work is allowed to displace them.

**The relative complexity band is carried per Bolt and is labelled an
ordering aid.** B5 is the only XL band; B1, B2 and B3 are M; B4, B6 and B7 are
L. The band is the units stage's, and it was defined against auditable
criteria, so a reader can see where the effort is concentrated — the write
path is — without the plan having made a commitment.

---

## What This Plan Deliberately Does Not Do

- **It does not choose the actor-identity mechanism.** `OQ1` is resolved by
  the organisation, through the actor-mechanism decision point, and it is
  recorded as a precondition of B4 rather than as work.
- **It does not prepare both branches of the actor mechanism.** The team's
  confirmed position is to sequence the resolution forward and accept the
  cost of a late answer.
- **It does not split the foundation workstream.** `C4` and the rebuild
  ordering make it one indivisible increment.
- **It does not split the four count-consuming surfaces.**
- **It does not re-plan the units.** The DAG is upstream and is not reopened.
- **It does not schedule the design system, the responsive treatment, the
  improved search, the pagination or the empty states.** They are deferred,
  each with its pull-forward trigger, and they map to no Bolt.
- **It does not retire R-02.** Organisational adoption readiness is resolved
  by the stakeholder process, and no Bolt closes it.

---

## Sources Consumed

- `aidlc/spaces/default/intents/261106-asset-tracker-mvp/inception/units-generation/unit-of-work.md`
  — the six units, their kinds, their deployment models, their complexity
  bands, and each unit's component assignment and implementation constraints.
- `aidlc/spaces/default/intents/261106-asset-tracker-mvp/inception/units-generation/unit-of-work-dependency.md`
  — the ten-edge DAG, the authoritative machine-readable edge block, the seam
  table, and the parallel-development analysis.
- `aidlc/spaces/default/intents/261106-asset-tracker-mvp/inception/units-generation/unit-of-work-story-map.md`
  — the thirty-story assignment table, the implementation order inside each
  unit, and the cross-cutting stories.
- `aidlc/spaces/default/intents/261106-asset-tracker-mvp/inception/contract-design/contract-summary.md`
  — the twelve contracts, the eight-code failure model, the contract
  ownership rules, and the six open questions.
- `aidlc/spaces/default/intents/261106-asset-tracker-mvp/inception/requirements-analysis/requirements.md`
  — `C1`–`C13`, `FR1.4`–`FR1.7`, `FR2.1`–`FR2.8`, `FR3.2`, `FR6.1`–`FR6.8`,
  `FR9.1`–`FR9.7`, `NFR1.1`, `NFR2.5`, `NFR3.1`, `NFR3.4`, `NFR3.5a`,
  `NFR5.1`, `NFR6.1`, `NFR6.4`.
- `aidlc/spaces/default/intents/261106-asset-tracker-mvp/inception/user-stories/stories.md`
  — the thirty released stories, the eight-asset reconciliation seed, and the
  ten deferred stories with their attachment points.
- `aidlc/spaces/default/intents/261106-asset-tracker-mvp/inception/domain-design/components.md`
  and `decisions.md` — the twenty-one-component catalogue and the fifteen
  ADRs.
- `aidlc/spaces/default/intents/261106-asset-tracker-mvp/inception/contract-design/contract-design-questions.md`
  and `aidlc/spaces/default/intents/261106-asset-tracker-mvp/inception/delivery-planning/delivery-planning-questions.md`
  — the confirmed answers this plan is generated from.
- `aidlc/spaces/default/intents/261106-asset-tracker-mvp/ideation/team-formation/team-assessment.md`,
  `mob-composition.md` and `skill-matrix.md` — the roster, the topology, the
  working groups, the capacity allocation rule, the skill position, and the
  inherited obligations.
- `aidlc/spaces/default/intents/261106-asset-tracker-mvp/ideation/approval-handoff/decision-log.md`
  and `initiative-brief.md` — the fifty-two Ideation decisions, the open items
  that ride with the release, and the five conditions attached to the go.
- `aidlc/spaces/default/memory/team.md` and `project.md` — the affirmed
  practices on the trunk, the testing posture, the deployment, the code
  style, and the binding 17-item decision set with its seven standing
  conditions.
