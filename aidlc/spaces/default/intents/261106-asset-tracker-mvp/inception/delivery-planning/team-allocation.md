# Team Allocation — Asset Tracker MVP

**Stage**: delivery-planning (inception)
**Intent**: 261106-asset-tracker-mvp
**Space**: default
**Scope**: feature

This file allocates the confirmed team across the release's Bolts: who does
what, who decides what, who is consulted, and which parts of the release
depend on somebody outside the build team.

**A Bolt** is one increment of delivered, mergeable work that carries its own
proof. Later mentions read as "Bolt".

**What this file does not do.** It does not add a person. The roster is one
developer plus reviewers, and it is confirmed. It does not commit capacity,
a date, a velocity, or a throughput figure. It does not name individuals
where the upstream artifacts record only a constituency.

---

## The Roster

| Role | Who | What they do |
|---|---|---|
| **Author** | One developer | Builds every Bolt. Holds the full POC context; there is no ramp-up cost on the existing codebase. |
| **Accountable** | The intent's product owner | Decides everything. One decision-maker throughout. |
| **Reviewers** | IT leadership, finance, operations, plus an internal reviewer | Consulted at defined points. **They are not authors.** |
| **Advisor** | The Architect role, for R-01 and R-05 | Consulted on the foundation's design and on the count-consistency guarantee. |
| **Advisor** | The Quality engineer | Named RAID owner for R-12 and R-16 — the test baseline and the CI pipeline. |
| **Advisor** | Compliance | Named RAID owner for I-02, the records-retention question. |
| **Advisor** | The Designer role | Named RAID owner for R-04, the deferred design-system estimate. |

**The reviewers are consulted, not assigned work.** A required review that
nobody can perform is a gate that either blocks the release or gets waived on
every merge, and either way it protects nothing. That is why the confirmed
answers decline to adopt a pull-request review requirement: there is no
second author and no second reviewer.

---

## The Allocation Rule

**The actor-identity resolution and the design-board checkpoint take
precedence over every other item in the queue, and no other work is allowed
to displace them, because the entire dependency structure hangs off them.**

This is an allocation rule rather than a figure because there is no deadline,
no budget, and an unquantified capacity constraint. Where the risk-first
ordering and capacity pressure would conflict, the rule wins for the
actor-mechanism item and the design board, because those two are the items
whose failure is unrecoverable: an unresolved actor model produces foundation
work that has to be redone, and an unreviewed foundation produces a schema
that every layer above it inherits.

**The consequence for the plan.** If capacity is consumed elsewhere, the
correct response is to preserve the ordering and let the schedule extend — not
to reorder. B4 is the Bolt that waits.

---

## Allocation Across the Bolts

| Bolt | Author | Accountable | Consulted | Informed | The reviewer point |
|---|---|---|---|---|---|
| **B1** `establish-the-toolchain` | Developer | Product owner | — | Reviewer constituency | — |
| **B2** `lock-the-merge-gate` | Developer | Product owner | Operations (deploy procedure) | IT leadership | — |
| **B3** `define-the-domain-vocabulary` | Developer | Product owner | — | Reviewer constituency | — |
| **B4** `rebuild-the-history` | Developer | Product owner | **IT leadership**, the Architect role for R-01 and R-05 | Reviewer constituency | **The design board** (chaired by the product owner) and **the actor-mechanism decision** (before B4 starts) |
| **B5** `write-the-lifecycle` | Developer | Product owner | Finance — where write-off defensibility applies | Operations | — |
| **B6** `agree-on-the-counts` | Developer | Product owner | The Architect role for R-05 | — | — |
| **B7** `complete-the-surfaces` | Developer | Product owner | IT leadership, Operations | Finance, reviewer constituency | **The operational-readiness sign-off** |

**After B7**, the internal reviewer demonstrates the custody record end to
end, with the developer preparing the demonstrable state and the product owner
accountable.

---

## The Four Review Points, and What Each One Costs the Author

| Review point | Who participates | What is decided or checked | When |
|---|---|---|---|
| **The actor-mechanism decision** | IT leadership; the product owner decides | Which of the four candidate mechanisms establishes the trusted actor, once I-01 is answered | Before B4 starts |
| **The foundation design board** | Chaired by the product owner; the developer presents; IT leadership consulted; the Architect role consulted | That the foundation's design is sound | A gate on B4 |
| **The operational-readiness sign-off** | Operations and IT leadership; the product owner signs off | That the operation phase's obligations are discharged — backups exercised, observability in place, incident response defined | At B7 |
| **The internal-reviewer demonstration** | The internal reviewer; the product owner accountable; finance informed | That the audit properties can be demonstrated end to end by someone outside the build team | After B7 |

**The design board is a condition of proceeding, not a ceremony.** The
foundation is not built until the board has reviewed its design. It is
chaired by the product owner precisely because the foundation's mechanism
determines everything above it, and the actor model is unresolved when the
board sits.

**The review points are event-driven, not continuous.** The reviewer load is
four events across the whole release rather than a standing presence, and
this is the only form the one-developer roster can support without becoming a
gate that blocks every merge.

**The reviewer individuals are not yet named.** The constituency is recorded —
IT leadership, finance and operations — but the specific people must be named
before the first review point is *scheduled*. Until then the groups are
staffed but not scheduled. This is an open item, carried in
`external-dependency-map.md` with a named owner and a named first action.

---

## The One Developer, and What That Means for Each Bolt

The concentration risk is real and it is accepted rather than removed. The
roster has no second author, so the mitigation is the ADR practice and the
mandatory design-board checkpoint before the foundation — not a second
implementer and not uncommitted external support.

**What this changes in the plan, concretely:**

| The constraint | What the plan does about it |
|---|---|
| One author, no reviewer who reads the code | Every inter-Bolt seam is a **published contract**, not an implicit one. A reviewer can check the plan against the contracts without reading the implementation. |
| One author, no second reading of the design | The design board exists, and it gates the Bolt from which every layer above inherits a schema. |
| One author, decisions made and implemented in one sitting | The unit boundaries carry the release's own boundaries rather than an imposed one, so the coherent whole stays coherent. |
| One author, capacity finite and unquantified | The allocation rule protects the two items whose failure is unrecoverable, and everything else is scheduled around the resulting constraint. |

**What this does not change.** The plan does not add a second author, assume
uncommitted external support, or treat a review as a substitute for a test.
The reviewers' participation is structured around four points; the proof of
each Bolt is the test suite and the smoke test, not a reviewer's opinion.

---

## Skill Coverage, and Where the Gaps Land

**The build skills are covered; the operational skills are where the gaps
are.** Every gap sits in the operation phase, which is inside the release
because the scope is `feature`. **No gap is a blocker on the foundation** —
the foundation's needs (migration work, schema rebuild, repository
corrections) are covered skills with correctable weaknesses. That matters,
because the foundation is where the actor-identity block bites.

**The remediation rule is the trigger, not the calendar.** A gap is closed
when the work that depends on it arrives, not before. This is the only form
compatible with a partially-constrained capacity and no deadline.

### The gaps that land inside a Bolt

| Remediation | Gap | Trigger | Lands in | Closing mechanism | Who |
|---|---|---|---|---|---|
| **R1** | The migration runner's coverage (A2) | Before the structural rebuilds land | **B4** | Research, then code — strengthen the runner's coverage; require a live-database test that rebuilds `assets` with existing rows and proves row-for-row preservation | Developer, in the Architect role for R-01 |
| **R2** | The `SQLITE_BUSY` / duplicate error mapping (A4) | Before the uniqueness check ships on either path | **B5** | Code — map the two error paths distinctly; one retries, the other reports a duplicate | Developer, in the Developer role for R-06 |
| **R3** | The unconditional update path (A5) | Before the discard transition lands, because the discard resolves the assignment inline | **B5** | Code — make the update path explicit about which columns it writes, so `last_assigned_to` retention and `assigned_to` clearing are deliberate; add regression tests covering both | Developer, in the Developer role for R-03 |
| **R4** | CSV formula-injection sanitisation (A8) | Before the CSV export ships | **B6** | Research, then code — the technique is narrow and well documented; cover it with tests asserting a leading `=`, `+`, `-` and `@` are neutralised | Developer, in the Developer role for R-14 |
| **R8** | CI pipeline authoring (B4) | Before the merge gate is claimed for any Bolt | **B2** | Research, then code — no CI workflow and no cloud or container posture exist, so the pipeline must be authored against whatever the estate permits | Quality engineer, in the Quality role for R-16, with the developer |
| **R9** | Deployment and rollback procedure (B5) | Before the operation phase's deployment step | **B2** | Research, then code — the process is already parameterisable via `PORT` and `DB_PATH`; the procedure must add the rollback steps and the smoke test | Developer, with Operations |

### The gaps that land in the operation phase, not in a Bolt

| Remediation | Gap | Trigger | Closing mechanism | Who |
|---|---|---|---|---|
| **R5** | Backup-and-restore procedure design (B1) | Before the operation phase's durability sign-off | Research, with specialist help if needed — must specify what is backed up, how, where, and on what cadence | Developer, with Operations |
| **R6** | Backup-and-restore rehearsal (B2) | Before the operational-readiness sign-off, and explicitly *after* R5 | Code and operation — rehearse a restore against a copy of the live database. A restore that has not been rehearsed is not a backup | Developer, with Operations |
| **R7** | Application-level observability (B3) | Before the operational-readiness sign-off | Research, then code — the audit trail is the natural health and activity signal | Developer |
| **R10** | Incident response and runbooks (B6) | Before the operation phase's incident-response step | Research — escalation paths and contact information cannot be inferred from the codebase; they come from the organisation | Developer, with Operations and IT leadership |
| **R11** | Performance validation (B7) | Before the operational-readiness sign-off | Code and measurement — validate against the upper end of the confirmed medium scale | Developer, with Quality |
| **R13** | Records-retention knowledge (D4) | Triggered by I-02's being asked, in parallel with I-01 | Consultation outside the team | Product owner, with Compliance |

**R12 — design-system craft (C1) — is not triggered inside this release.**
The design system is deferred, so its trigger is the start of the deferred
increment, at which point it becomes the first item pulled forward. It maps to
no Bolt.

### The block that is not a skill gap

**The actor-identity block is not a skill gap and is not remediated by any of
these mechanisms.** The gap in the actor mechanism is a missing *answer* from
the organisation, not a missing *skill*. I-01 is resolved by gathering the
internal existing-tool inventory and establishing whether a trusted
authentication mechanism is reachable — and until it is answered, no
foundation work is planned.

**That makes the actor decision an allocation item, not a remediation item.**
It is the product owner's to convene, with IT leadership, HR, Finance and
Operations consulted, and the developer gathering the inventory. It is
scheduled ahead of every other item by the allocation rule, and it is the one
thing in this plan that the author cannot execute.

---

## The Inherited Obligations, and Where Each Is Discharged

| Obligation | Why it lands on this team | Where it is discharged |
|---|---|---|
| **The 66/66 passing test baseline** | A standing condition of the approved decision set | **B1** installs the hook that enforces it on every commit; every later Bolt keeps it green. Enforced in the pipeline from B2, not by intent. |
| **The absence of CI** | A pre-existing gap the MVP inherits rather than creates | **B2** — the pipeline definition. |
| **The single-copy database file** | The SQLite file is the entire system of record, in a gitignored `data/` directory | **B2** writes the WAL-aware backup step; **B4** onwards exercises it, because a backup procedure that has never been run is not a backup. |
| **The migration runner's coverage** | Both structural changes run through it | **B4**, via remediation R1. |
| **The unconditional update path** | The repository writes every column unconditionally, so a partial update clears one | **B5**, via remediation R3 — making the update path explicit so `last_assigned_to` retention and `assigned_to` clearing during a discard are deliberate. |

---

## The Test Baseline, and Who Enforces It

The 66/66 baseline is a **standing merge gate**, and the durable form of the
gate is "the existing 66 tests must remain and pass", not the literal number
as a threshold — the count rises from 66 with the first new regression test.

| Role | Responsibility |
|---|---|
| **Developer** | Keeps the existing suite green on every change; adds regression tests alongside it, never in place of it; carries the requirement identifier in every new test's title. |
| **Quality engineer** | Named RAID owner for R-12 and R-16 — the test baseline and the CI pipeline. |
| **Pre-commit hook (B1)** | Runs the ordered steps against the staged change and refuses the commit if a step fails. This is the gate that works today. |
| **Hosted pipeline (B2)** | Runs lint → test → coverage check → dependency audit and blocks the merge on failure. This is the durable gate. |

**The coverage floor becomes enforceable in B1** with
`coverage.thresholds.lines = 80`. The measured whole-project line coverage is
93.38%, so the gap to the floor is in the surplus, not a shortfall — the work
is to make the floor enforceable, not to reach it.

---

## Who Decides What

One decision-maker throughout: the intent's product owner.

| Activity | Responsible | Accountable | Consulted | Informed |
|---|---|---|---|---|
| Prioritisation and backlog ranking | Developer (produces the technical ranking input) | **Product owner** | The four stakeholder groups, where their concerns apply | The reviewer constituency |
| Prioritisation ties | — | **Product owner**, directly | — | Developer |
| Team and capacity plan | Developer | **Product owner** (accepts it) | Operations, IT leadership | The reviewer constituency |
| Resolving I-01 (existing trusted mechanism) | Developer (gathers the internal inventory) | **Product owner** | IT leadership, HR, Finance, Operations | — |
| The actor-mechanism selection | Developer (recommends) | **Product owner**, on the design board | IT leadership | The reviewer constituency |
| The foundation design board | Developer (presents) | **Product owner** (chairs) | IT leadership, the Architect role for R-01 and R-05 | The reviewer constituency |
| The lifecycle and transition specification | Developer | **Product owner** | Finance — where write-off defensibility applies | Operations |
| The count-consistency guarantee | Developer | **Product owner** | The Architect role for R-05 | — |
| The CSV export's formula-injection protection | Developer | **Product owner** | The Developer role for R-14 | — |
| The records-retention answer (I-02) | Compliance, as the named RAID owner | **Product owner** | Compliance | Operations |
| The existing-tool inventory (I-03) | Product owner, as the named RAID owner | **Product owner** | IT, HR, Finance, Operations | Developer |
| Operation-phase readiness | Developer and Operations | **Product owner** (signs off) | IT leadership | The reviewer constituency |
| The internal-reviewer demonstration of audit properties | Developer (prepares the demonstrable state) | **Product owner** | The internal reviewer | Finance |
| Test-baseline preservation (66/66) | Developer | **Quality engineer**, as the named RAID owner | — | Product owner |
| CI pipeline delivery | Quality engineer, as the named RAID owner | **Quality engineer** | Developer | Product owner |
| Any change to the approved scope | — | **A new human approval round** — not a delivery-stage decision | Product owner convenes | The whole team |
| Adoption readiness (R-02) | Product owner, as the named RAID owner | **Product owner** | IT, HR, Finance, Operations | Developer |

---

## The One Team Member Who Is Not an Author

**The four stakeholder groups are not on the team.** Asset administrators,
Finance, IT leadership and the asset holders are the release's consumers and
its reviewers; they are not participants in its construction. Their
participation is the periodic progress summary and the objections they raise,
which are recorded and brought to the product owner through the established
human approval process.

**The product owner's approval established the project baseline and nothing
more.** It does not represent that the four groups have independently reviewed
and endorsed the documents.

**R-02 — organisational adoption readiness — stays open** through the whole
release and is resolved by the stakeholder process before operational
readiness is accepted. No Bolt closes it, and the plan does not schedule it
as if a Bolt could.

---

## Sources Consumed

- `aidlc/spaces/default/intents/261106-asset-tracker-mvp/ideation/team-formation/team-assessment.md`
  — the roster, the availability assessment, the capacity allocation
  agreement, the RACI matrix, the blocking dependency, and the inherited
  obligations.
- `aidlc/spaces/default/intents/261106-asset-tracker-mvp/ideation/team-formation/mob-composition.md`
  — the topology decision and its consequences, the working groups and their
  gates, and the checkpoints.
- `aidlc/spaces/default/intents/261106-asset-tracker-mvp/ideation/team-formation/skill-matrix.md`
  — the build and operational skill coverage, the gap analysis, the
  trigger-based remediation plan, and the rule that the actor-identity block
  is not a skill gap.
- `aidlc/spaces/default/intents/261106-asset-tracker-mvp/ideation/approval-handoff/decision-log.md`
  and `initiative-brief.md` — the fifty-two Ideation decisions, the open items
  that ride with the release, and the go conditions.
- `aidlc/spaces/default/intents/261106-asset-tracker-mvp/inception/delivery-planning/bolt-plan.md`
  — the seven Bolts this allocation applies to.
- `aidlc/spaces/default/memory/team.md` and `project.md` — the affirmed
  practices on the trunk, the testing posture, the deployment and the code
  style, and the binding product-behaviour contracts.
