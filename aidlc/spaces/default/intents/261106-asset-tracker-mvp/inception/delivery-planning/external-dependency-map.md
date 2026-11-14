# External Dependency Map — Asset Tracker MVP

**Stage**: delivery-planning (inception)
**Intent**: 261106-asset-tracker-mvp
**Space**: default
**Scope**: feature

This file records every dependency the release has on something outside the
build team's own work: an organisation, a person, a host, a service, or an
answer that only the organisation can give. Each carries a **named owner** and
a **named first action**, so nothing here waits in a queue of good intentions.

**A dependency** is something the release needs that no amount of development
work inside the repository produces. Later mentions read as "dependency".

**What this file does not do.** It does not add a person to the team, and it
does not treat a dependency as a Bolt. A Bolt is delivered, mergeable work
with its own proof; a dependency is an arrangement, an access grant, a
credential, or an answer. The distinction matters because a dependency that
gets Bolt treatment would appear schedulable when it is not.

**How to read a row.** *Owner* is the role that can move the dependency, not
necessarily the person. *First action* is the single concrete act that starts
it. *Blocks* names the Bolt or the phase whose work cannot start until the
dependency resolves. *If it slips* names the consequence, because a dependency
with no stated consequence is a dependency nobody prioritises.

---

## The Summary Position

**The release has one hard external block, and it is not the one the schedule
is most exposed to.**

The hard block is **D-A — the actor-identity answer** (I-01 / I-03). It gates
the foundation Bolt (B4) and everything above it. It cannot be worked around,
accelerated by more developer hours, or substituted by a technical judgement,
because the mechanism choice belongs to the organisation.

The exposed item is **D-B — the git remote**. It gates the *hosted* pipeline
(B2's hosted half) and therefore the durable merge gate. It does not block the
work: the local pre-commit hook in B1 is the gate that works today, and the
pipeline definition can be authored before the remote exists.

**Everything else in this file is a dependency the release can absorb by
absorbing the cost.** The records-retention answer, the existing-tool
inventory, the adoption readiness, the reviewer individuals, the deploy host,
the backup destination — each of these changes the shape of the work or the
date of it, but none of them changes whether the work is possible.

| | Dependency | Blocks | Owner |
|---|---|---|---|
| **D-A** | The actor-identity answer | B4 and everything above | Product owner |
| **D-B** | A configured git remote | B2's hosted pipeline, the durable merge gate | Product owner, with IT leadership |
| **D-C** | The records-retention answer (I-02) | The operation phase's retention obligation | Product owner, with Compliance |
| **D-D** | The internal existing-tool inventory (I-03) | The actor-mechanism selection | Product owner |
| **D-E** | The named reviewer individuals | The scheduling of the four review points | Product owner |
| **D-F** | The deploy host and its access | Every deployment | Operations |
| **D-G** | The backup destination | The operation phase's durability sign-off | Operations |
| **D-H** | The stakeholder groups' availability | R-02, adoption readiness | Product owner |
| **D-I** | The npm registry and the dependency tree | Every clean install | Quality engineer |
| **D-J** | The deploy host's own security posture | The actor-mechanism decision's viability | IT leadership |

---

## D-A — The Actor-Identity Answer

**What it is.** The mechanism by which the server resolves *who* is performing
a write. The four candidates the Ideation phase shortlisted are a
server-configured single operator, a trusted request header from an
authenticating proxy, an operator-selection picker, and an application-managed
login. The first three are cheap; the fourth is not. None is chosen.

**Why it is a dependency and not a Bolt.** The choice requires knowing what
the organisation already has. A proxy that does not exist cannot be assumed;
an existing SSO that the team does not know about cannot be relied on. The
answer is an inventory of the organisation's internal tooling, and that
inventory does not exist yet.

**The rule that constrains every candidate.** Whatever is chosen, the actor is
resolved from a context the client cannot influence. A request-supplied actor
is **ignored**, not rejected and not sanitised. This is already binding and is
recorded in the project's product-behaviour contracts; it narrows the candidate
space without making the choice.

| | |
|---|---|
| **Owner** | Product owner (convenes; decides) |
| **Contributors** | IT leadership, HR, Finance, Operations (consulted); the developer (gathers the inventory) |
| **Blocks** | **B4** `rebuild-the-history` — and therefore B5, B6 and B7 |
| **First action** | The product owner asks IT, HR, Finance and Operations, in one request, whether the organisation already runs an authenticating proxy, an SSO service, or a directory service that the application could sit behind |
| **If it slips** | The foundation Bolt does not start, and the release's schedule extends by the length of the slip. The correct response is to preserve the ordering, not to build the foundation against a guessed mechanism and redo it |

**Why it cannot be deferred past B4.** The `audit_log` rebuild that adds the
actor column, and the actor-resolution component itself, are one indivisible
workstream. `audit_log` has no actor column today and the audit writer takes
no actor parameter, so the actor rule cannot be implemented as a code change
alone. A foundation Bolt built against a guessed mechanism produces a schema
every layer above it inherits, and produces the wrong one.

---

## D-B — A Configured Git Remote

**What it is.** The repository has **no git remote configured** — `git remote
-v` is empty. There is no server-side repository for a hosted pipeline to run
against, no pull request to open, and no protected branch to gate.

**Why it matters more than it looks.** Every hosted pipeline platform is
pull-request-based. None of them can execute even once until a remote exists.
The `feature` scope's standing condition — CI execution before merge — is
therefore discharged by a pipeline that cannot yet run. That is not a
theoretical gap: it means the release's *durable* merge gate is currently
unbuildable, and only the *local* gate exists.

**What the release does without it.** B1 installs the pre-commit hook, which
runs the ordered steps against the staged change and refuses the commit if a
step fails. That is a real gate, enforced on every commit on the one machine
that has the repository. B2 writes the pipeline definition. The definition is
reviewable and correct long before a runner can execute it.

| | |
|---|---|
| **Owner** | Product owner, with IT leadership |
| **Contributors** | The Quality engineer (the pipeline's own definition); the developer |
| **Blocks** | B2's *hosted* half — and therefore the durable merge gate. **It does not block B1, B3, or any runtime Bolt's own work** |
| **First action** | The product owner and IT leadership decide where the repository is hosted — the organisation's existing code host, if there is one — and who creates it |
| **If it slips** | The release keeps its local pre-commit gate and loses its durable one. The mitigation is explicit and recorded: the local hook is the gate that works today, and the pipeline definition is authored and reviewed regardless, so the gap closes the moment a remote exists |

**What this dependency does not do.** It does not stop the release. It stops
one specific guarantee from being *durable*, and the plan names the
interim guarantee rather than pretending the durable one is in place.

---

## D-C — The Records-Retention Answer (I-02)

**What it is.** How long audit history is retained, and under what policy. The
audit trail is append-only and the release's own invariant is that history is
never destroyed — but "never destroyed" is a statement about *this* release's
operations, not a statement about a seven-year retention obligation the
organisation may owe.

**Why it is a dependency.** The answer can arrive *after* the release ships.
Nothing in the MVP's behaviour depends on it — the history is retained
indefinitely, which satisfies any shorter requirement. It becomes a dependency
at the point where someone must *delete* retained history, because the
release's design refuses to delete it. A retention policy that requires
deletion therefore cannot be satisfied by changing code; it has to be
satisfied by an archival decision the organisation makes.

| | |
|---|---|
| **Owner** | Product owner, with Compliance as the named RAID owner (remediation R13) |
| **Contributors** | Operations |
| **Blocks** | Nothing in the Bolts. It blocks the operation phase's **retention obligation** |
| **First action** | The product owner asks Compliance for the organisation's retention policy for asset audit records, in the same request that carries the existing-tool inventory (D-D) |
| **If it slips** | The release keeps history indefinitely. That is the safe direction — a longer retention than required is recoverable, a shorter one is not |

---

## D-D — The Internal Existing-Tool Inventory (I-03)

**What it is.** A record of what the organisation already runs that the
application could sit behind for actor identity: an authenticating reverse
proxy, an SSO provider, a directory service, a corporate identity platform.

**Why it is separate from D-A.** D-A is the *decision*; D-D is the *evidence
the decision rests on*. They are separated here because they have different
owners' worth of effort and different failure modes: the inventory can be
gathered in one request, while the decision needs a design board.

| | |
|---|---|
| **Owner** | Product owner, as the named RAID owner |
| **Contributors** | IT, HR, Finance, Operations |
| **Blocks** | The actor-mechanism *selection* (which is the last step of D-A) |
| **First action** | The product owner sends one request to IT, HR, Finance and Operations asking what identity or proxy infrastructure already exists internally |
| **If it slips** | D-A cannot complete, so the foundation Bolt does not start. D-D is therefore on the critical path ahead of B4 |

---

## D-E — The Named Reviewer Individuals

**What it is.** The review points exist; the people who attend them do not
have names yet. The constituency is recorded — IT leadership, finance,
operations, plus an internal reviewer — but "IT leadership" is a group, not
an invitation.

**Why it matters.** A review point that nobody can attend is a gate that
either blocks the release or gets waived on every merge, and either way it
protects nothing. This is the same reason the release does not adopt a
pull-request review requirement. The review points are real; the staffing is
not yet arranged.

| | |
|---|---|
| **Owner** | Product owner |
| **Contributors** | IT leadership (to nominate), the developer (to give dates) |
| **Blocks** | The **scheduling** of the four review points. It does not block the work between them, because each point is event-driven rather than a standing gate |
| **First action** | The product owner asks IT leadership, finance and operations to name one individual each, and names the internal reviewer |
| **If it slips** | The work proceeds; the review point happens with whoever turns up, or is rescheduled. The consequence is that the design board's gate weakens, and that weakening is recorded rather than absorbed silently |

---

## D-F — The Deploy Host and Its Access

**What it is.** The single internal host the MVP runs on, with the process
access needed to install, migrate, restart and read the database file.

**Why it is a dependency.** The application is a long-running Node process over
a machine-local SQLite file. There is no container definition, no
infrastructure-as-code, and no deployment configuration of any kind — only the
`npm ci` / `npm start` / `npm test` sequence the README documents. Every
deployment depends on someone being able to do those things on that host.

| | |
|---|---|
| **Owner** | Operations |
| **Contributors** | The developer (the procedure and the smoke test); the product owner (sign-off) |
| **Blocks** | Every deployment. It does not block any Bolt's development work |
| **First action** | The product owner confirms with Operations that the host exists, that the developer has access to it, and that the service is supervised so a restart survives a machine reboot |
| **If it slips** | The Bolts are built and merged; the release does not reach the users who need it. This is a deployment dependency, not a development one, and the plan does not treat the two the same |

---

## D-G — The Backup Destination

**What it is.** Where the pre-deploy database copy goes, and who keeps it.

**Why it is a dependency.** The backup is WAL-aware — the database runs in
WAL mode, so committed rows can still be sitting in the `*.sqlite-wal`
sidecar file next to the main database. Copying only the main file while the
process is running can capture an incomplete snapshot. A backup that is
incomplete is worse than no backup, because it is believed.

| | |
|---|---|
| **Owner** | Operations |
| **Contributors** | The developer (the WAL-aware step); Compliance (retention of the copies) |
| **Blocks** | The operation phase's durability sign-off. It does not block any Bolt |
| **First action** | The product owner and Operations agree a destination and a retention for the backup copies before the first schema-carrying deployment |
| **If it slips** | The first deployment has no restore point. The release's own rule is that the backup is written before migrations and that the smoke test fails a deploy whose backup is absent — so this dependency is a deployment gate, and it is stated as one rather than discovered during an incident |

---

## D-H — The Stakeholder Groups' Availability

**What it is.** The four groups — asset administrators, Finance, IT leadership,
and the asset holders — are the release's consumers and its reviewers. They are
not participants in its construction, and their availability is a fact about
their calendars, not a fact about the codebase.

**Why it is on this list.** R-02 — organisational adoption readiness — stays
open through the whole release and is resolved by the stakeholder process
before operational readiness is accepted. No Bolt closes it. The plan does not
schedule it as if a Bolt could.

| | |
|---|---|
| **Owner** | Product owner, as the named RAID owner for R-02 |
| **Contributors** | IT, HR, Finance, Operations |
| **Blocks** | The operation phase's adoption-readiness acceptance. It does not block any Bolt |
| **First action** | The product owner schedules the periodic progress summary that the team-formation artifacts already require, and names the four groups' representatives for it |
| **If it slips** | The release ships to users who were not consulted, which is precisely the risk R-02 records. The consequence is stated so it is a decision rather than a surprise |

---

## D-I — The npm Registry and the Dependency Tree

**What it is.** The source of the 113-package production dependency tree, and
the audit step that gates it.

**Why it is a dependency rather than a task.** Every clean install reaches
the network. The release installs with `npm ci` in CI, in the deploy
procedure, and in the documented setup path — never `npm install` — so the
lockfile is the tree and lockfile drift fails the install. The dependency
audit step (`npm audit --audit-level=high --omit=dev`) is a blocking merge
gate, and it depends on the registry's advisory data.

**The install-time-code note.** Three packages execute install-time code:
`better-sqlite3` (production), and `esbuild` and `fsevents` (development).
`better-sqlite3`'s install script is `prebuild-install || node-gyp rebuild
--release`, so a failed prebuilt download silently converts a binary download
into a source compilation on the host. That fallback is an **accepted,
recorded risk** for a single-host internal tool, not an eliminated one. It
also means the pipeline runner's Node version and platform must match the
deploy host's, or the native addon is built differently in the two places.

| | |
|---|---|
| **Owner** | Quality engineer, as the named RAID owner for R-16 |
| **Contributors** | The developer |
| **Blocks** | Nothing directly. It conditions every install, and the Node/platform parity condition is a genuine constraint on where the pipeline can run |
| **First action** | The Quality engineer records the deploy host's Node version and platform, and the pipeline is authored to match it |
| **If it slips** | The registry is a fact, not a risk. The real exposure is the platform mismatch, and it is a one-line check at pipeline-authoring time |

---

## D-J — The Deploy Host's Security Posture

**What it is.** Whether the host has TLS termination, a reverse proxy, a
service identity, or any other facility that a browser-attached credential
could ride on.

**Why it is a dependency.** It bears on the actor-mechanism choice, and on
one conditional obligation. If the chosen mechanism relies on a
browser-attached credential — a cookie, a session, anything the browser
attaches automatically — then CSRF becomes a live attack, and the write path
must reject state-changing requests that do not carry a recognised origin, or
must carry a CSRF token. There is no session and no cookie today, so there is
no credential to abuse and the classic attack does not apply *now*. The
posture is what tells us whether it applies *later*.

It also bears on the header-hardening control: the application currently
leaks `x-powered-by: Express` and sets no `X-Content-Type-Options`. The
release disables the former and sets the latter to `nosniff`, and the `nosniff`
header and the CSV export's content type are one control — a CSV served
without `nosniff` and without a correct `Content-Type` can be sniffed by the
browser as HTML.

| | |
|---|---|
| **Owner** | IT leadership |
| **Contributors** | Operations; the developer |
| **Blocks** | The conditional CSRF obligation, if and only if the chosen mechanism is browser-attached. It does not block any Bolt |
| **First action** | The product owner asks IT leadership, in the same request that carries D-A and D-D, whether TLS is terminated before the host and whether a reverse proxy is in front of it |
| **If it slips** | The mechanism selection proceeds without the answer, because no candidate requires it. If a browser-attached mechanism is later chosen, this dependency returns as a hard requirement on that Bolt |

---

## The Dependencies by What They Block

**Blocking a Bolt's start:**

| Dependency | Bolt |
|---|---|
| D-A — the actor-identity answer | B4 `rebuild-the-history`, and therefore B5, B6, B7 |
| D-D — the existing-tool inventory | The mechanism selection inside D-A |

**Blocking the hosted merge gate only:**

| Dependency | Effect |
|---|---|
| D-B — the git remote | B2's hosted pipeline cannot run. The local pre-commit hook remains the gate |

**Blocking the operation phase only:**

| Dependency | Effect |
|---|---|
| D-C — the records-retention answer | The retention obligation |
| D-D, D-F — the deploy host and its access | The deployment step |
| D-G — the backup destination | The durability sign-off |
| D-H — the stakeholder groups' availability | The adoption-readiness acceptance |
| D-I — the npm registry and the platform parity check | Every clean install |

**Blocking nothing, but changing a decision:**

| Dependency | Effect |
|---|---|
| D-E — the named reviewer individuals | The design board's gate weakens if unresolved |
| D-J — the host's security posture | The conditional CSRF obligation returns if a browser-attached mechanism is chosen |

---

## The Three Things That Are Not Dependencies

**The build team is not waiting on a second author.** The roster is one
developer plus reviewers who are consulted at defined points. The
concentration risk is real and it is accepted rather than removed — the
mitigation is the ADR practice and the mandatory design-board checkpoint
before the foundation, not a second implementer and not uncommitted external
support. No dependency in this file asks for one.

**The release is not waiting on a design system.** The design system is
deferred to a later increment. Its skill gap — R12 — is therefore not
triggered inside this release at all; it becomes the first item pulled forward
when the deferred increment starts. Nothing here blocks on it.

**The release is not waiting on a staging environment.** The feasibility
stage recorded that no dev/staging/prod split exists today, and that splitting
a single-host SQLite deployment into three would multiply the migration-
ordering risk for no operational gain at this scale. The rollback requirement
is discharged by a verified backup-and-restore procedure rather than by a
second environment. There is no dependency for an environment that is not
being created.

---

## Sources Consumed

- `aidlc/spaces/default/intents/261106-asset-tracker-mvp/ideation/feasibility/raid-log.md`
  — the six open issues I-01..I-06, the sixteen risks, and the thirteen
  dependencies the release carries.
- `aidlc/spaces/default/intents/261106-asset-tracker-mvp/ideation/approval-handoff/decision-log.md`
  — the four actor-mechanism candidates, the open-items table, and what the
  log explicitly does not decide.
- `aidlc/spaces/default/intents/261106-asset-tracker-mvp/ideation/team-formation/team-assessment.md`
  — the roster, the capacity allocation agreement, and the RACI matrix.
- `aidlc/spaces/default/intents/261106-asset-tracker-mvp/ideation/team-formation/skill-matrix.md`
  — the operational skill gaps, the trigger-based remediation plan, and the
  rule that the actor-identity block is not a skill gap.
- `aidlc/spaces/default/intents/261106-asset-tracker-mvp/inception/delivery-planning/bolt-plan.md`
  — the seven Bolts, their preconditions, and their review points.
- `aidlc/spaces/default/intents/261106-asset-tracker-mvp/inception/delivery-planning/team-allocation.md`
  — the roster, the four review points, and the reviewers' staffing gap.
- `aidlc/spaces/default/intents/261106-asset-tracker-mvp/inception/delivery-planning/risk-and-sequencing-rationale.md`
  — the risk position Bolt by Bolt, and the three risks no Bolt retires.
- `aidlc/spaces/default/intents/261106-asset-tracker-mvp/inception/units-generation/unit-of-work-dependency.md`
  — the ten-edge DAG and the tooling unit's merge-gate relation.
- `aidlc/spaces/default/memory/team.md` and `project.md` — the affirmed
  deployment, testing and code-style practices, and the binding
  product-behaviour contracts.
