# User Stories — Story Plan and Interview Questions

**Stage**: user-stories (inception)
**Intent**: 261106-asset-tracker-mvp
**Space**: default
**Scope**: feature
**Depth**: Standard

This file holds the story plan for the Asset Tracker MVP and the questions
that shape it. The answers recorded below drive the generation of
`personas.md`, `stories.md`, and `traceability.json` in this directory.

Two upstream facts constrain the whole plan and are **not** reopened here:

- The **primary customer** was confirmed at Intent Capture and carried
  forward into the wireframes: *internal IT asset administrators who register,
  assign, and write off assets on behalf of the organisation.*
- The **actor-identity mechanism** is an open decision (open items I-01 and
  I-03). Actor identity is resolved from trusted server-side context, and
  actor information supplied in a write request is never trusted. The stories
  state that rule; they do not choose the mechanism.

---

## Persona Development Approach

**Who are the users?** The release has one party who *performs* work and one
party who *reads* the outcome of that work. Both are internal; neither is
external. The holder named on an asset is neither — a holder is a free-text
display name, not an account (FR5.3, FR8.4), so a holder can never be a
persona.

**What are their goals?**

- The **administrator** needs to register assets accurately, hand them out,
  take them back, record losses, retire them, and recover them — with every
  action leaving an attributed, non-destroyable history.
- The **asset owner / requester** needs to answer "where is it, who holds it,
  who held it before, and what happened to it" without asking anyone.

**How many personas?** Two, with the administrator as the primary persona.
A third persona is a candidate but carries a specific risk: a "holder" framed
as a persona would imply that holding an asset makes someone a user of the
system, which the domain explicitly forbids.

**Persona granularity** is fixed by the release boundary: the personas
describe *roles the organisation recognises*, not individuals. Names are
illustrative and are not account identities.

**Relationship and priority.** The administrator is the primary persona; every
write path in the release belongs to them. The asset owner is the secondary
persona; every read path in the release belongs to them. The product owner
who signs off deployments is a **stakeholder, not a persona** — they do not
use the application, and the stage does not write stories for them.

---

## Story Format

Standard user-story form, written from the persona's point of view:

> As a [persona], I want [goal], so that [benefit].

Each story carries:

- A stable ID of the form `US{group}.{seq}` (for example `US1.1`), where the
  group number names the capability area.
- Acceptance criteria in Given/When/Then form, each with a three-segment ID
  of the form `AC{story-group}.{story-seq}.{criterion-seq}` (for example
  `AC1.1.1`).
- A **MoSCoW** priority.
- Its dependencies and relationships.
- A one-line INVEST note.

**INVEST is applied as follows.** *Independent* — no story depends on another
story's work being done first; the dependencies recorded are data or
ordering dependencies, not "must be built first" dependencies. *Negotiable*
— the story states the outcome, not the mechanism. *Valuable* — every story
names who benefits. *Estimable* — a story is small enough to estimate. *Small*
— a story fits one sprint of work; a story needing a second "and" is split.
*Testable* — every acceptance criterion has a deterministic pass/fail.

**Sizing rule.** A story that would need two distinct state transitions, or
two distinct screens, is split. This is what keeps the eight released
transition edges (FR3.2) from collapsing into one "manage lifecycle" epic.

---

## Story Prioritisation

Stories are prioritised with **MoSCoW**:

- **Must Have** — the release does not deliver its purpose without it, or a
  standing condition on the approved decision set is not satisfied without
  it.
- **Should Have** — the release is materially less useful without it, but the
  release boundary can be drawn without it.
- **Could Have** — valuable, but only after the Must and Should stories are
  whole.
- **Won't Have** — recorded deliberately so the boundary is explicit. Deferred
  capabilities appear here with their approved standing intact.

The MVP boundary is formally decided in Delivery Planning. Story priorities
*inform* that decision; they do not replace it. Prioritisation is driven by
the confirmed scope floor (the five operator-facing must-haves plus the
audit-first and lifecycle floors) and by the standing conditions.

---

## Breakdown Approach Options

- **By feature** — one group per FR area (registration, actor attribution,
  lifecycle, audit history, display holder, counting, dashboard, directory,
  CSV, editing, accessibility).
- **By persona** — one group per persona (administrator writes, owner reads).
- **By workflow** — one group per journey (register, find, reconcile, answer
  "what does Dana hold?", write off).
- **By domain area** — one group per bounded context (custody, lifecycle,
  history, inventory reporting).
- **By epic** — one epic per business outcome, with stories nested beneath.

**Recommendation: a hybrid, keyed to the capability areas.** The release's
hardest requirement is a set of *shared definitions* consumed by several
surfaces — one counting definition across the dashboard, the assignee
directory, the asset list and the CSV export (FR6), one display-holder
definition across the directory and the asset detail (FR5), one uniqueness
policy across registration and editing (FR1). A pure persona split scatters
those definitions across groups that could be worked independently and
therefore *will* drift. A pure feature split repeats them per group.

The recommended structure therefore puts each shared definition in **one**
group with the surfaces that consume it, and keeps the reading surfaces
together with the definitions they read:

| Group | Area | Persona focus |
|---|---|---|
| US1 | Asset registration and uniqueness | Administrator |
| US2 | Custody — assignment and return | Administrator |
| US3 | Lifecycle transitions, reasons, and recovery | Administrator |
| US4 | Custody history and audit display | Owner + Administrator |
| US5 | Inventory reporting — counting definition, dashboard, directory, asset list, CSV | Owner + Administrator |
| US6 | Asset editing and duplicate detection | Administrator |
| US7 | Accessibility and actor presence across all surfaces | Both |

---

## Embedded Questions

### Q1 — The persona set for the release

The Intent Capture stage confirmed the primary customer as internal IT asset
administrators, and the requirements' target customer names two parties: the
operations staff who do the work, and the asset owner who needs to know where
an asset is, who holds it, who held it before, and what happened to it. The
wireframes were drawn for the first of those.

Which personas should the story set contain?

- A. Two personas: the asset administrator (does the work) and the asset owner or requester (asks about custody). Every story references one of them.
- B. One persona only: the asset administrator. The read-side journeys become stories about the administrator looking things up on someone's behalf.
- C. Three personas: the administrator, the asset owner or requester, and the holder whose name appears on an asset.
- D. Two personas, but the second is a named "operations requester" role inside the organisation rather than an individual asset owner.
- X. Other (please specify)

[Answer]: A. Two personas

### Q2 — Whether a holder is ever a persona

A holder on an asset is a free-text display name, not an account — a person
can hold an asset and have no way to log in. Two upstream requirements
depend on this: the display-holder definition that the directory counts by,
and the rule that actor information supplied in a write request is never
trusted.

Should the story set ever treat a holder as a user?

- A. No. A holder is data on an asset, never a persona. The "what does Dana hold?" journey is served by the administrator or the asset owner asking on someone's behalf.
- B. Yes, as a read-only persona with no write access — the holder may sign in later to see what they hold.
- C. Yes, but only for the recovery journey, where a holder might report that they found a lost asset.
- X. Other (please specify)

[Answer]: A. No. A holder is data on an asset, never a persona.

### Q3 — The breakdown approach

The release has several rules that more than one screen must apply
identically: one counting definition across the dashboard, the directory, the
asset list and the CSV export; one display-holder definition; one uniqueness
policy across registration and editing. A breakdown that scatters those rules
across independently workable groups will let them drift apart.

Which breakdown approach should structure the story IDs?

- A. Hybrid by capability area (recommended): each shared definition lives in one group together with the surfaces that consume it.
- B. By persona: one group for the administrator's writes, one for the owner's reads.
- C. By workflow: one group per user journey — register, find, reconcile, answer "what does Dana hold?", write off.
- D. By feature: one group per FR area (FR1 through FR11), accepting that shared rules appear in more than one group.
- X. Other (please specify)

[Answer]: A. Hybrid by capability area

### Q4 — Granularity of a lifecycle transition story

The release ships eight released transition edges out of ten approved. Each
edge has its own state change, its own audit action, and — for four of them —
its own required reason drawn from a shared vocabulary.

Should each transition edge be its own story, or should the edges be grouped?

- A. One story per released transition edge, with its reason rule and audit action in the acceptance criteria. Eight lifecycle stories.
- B. One story per lifecycle *family* — assignment-and-return, loss, retirement, recovery — with the individual edges as acceptance criteria.
- C. One story per lifecycle family, plus separate stories for the reason vocabulary and for the audit behaviour, so those two rules are specified once each.
- X. Other (please specify)

[Answer]: C. One story per lifecycle family, plus separate stories for the reason vocabulary and for the audit behaviour.

### Q5 — How the actor-attribution rule is told

Every write must be attributed to an actor resolved from trusted server-side
context, and actor information supplied in a write request is never trusted
(the actor-trust standing condition). The mechanism that establishes that
actor is still an open decision (I-01 / I-03).

How should the stories carry this rule?

- A. One cross-cutting story that states the rule once, with each write story asserting attribution in its own acceptance criteria. No story names a mechanism.
- B. A cross-cutting story that states the rule once, plus a note on each write story that the mechanism is deferred pending I-01 / I-03.
- C. Every write story restates the full rule, with no cross-cutting story.
- X. Other (please specify)

[Answer]: A. One cross-cutting story that states the rule once, with each write story asserting attribution in its own acceptance criteria.

### Q6 — Story priority boundaries for the deferred capabilities

The scope document defers several approved capabilities to a later increment
rather than rejecting them: partial recovery, credit assignment, dispute
handling, and the two approved-but-unreleased discard edges (an asset
discarded directly from stock, and one discarded after a return).

How should the deferred capabilities appear in the story set?

- A. Recorded as Won't Have stories with their approved standing intact and a named deferred capability — so the boundary is explicit and nothing is silently dropped.
- B. Omitted entirely; the scope document already records them as deferred.
- C. Recorded as Should Have, with the story written but not prioritised into the release.
- X. Other (please specify)

[Answer]: A. Recorded as Won't Have stories with their approved standing intact and a named deferred capability.

### Q7 — The treatment of the deferred actor-identity mechanism in the stories

The four candidate mechanisms are documented in the scope document and none has
been selected. The stories need to be complete enough to build and test
against, without asserting a mechanism that may change.

Is the rule alone sufficient for the story set, with the mechanism left to the
design stages?

- A. Yes. The stories state that the actor comes from trusted server-side context, that a write request's actor field is never trusted, and that every audit entry must carry an actor. The mechanism is chosen in Domain Design.
- B. No — the stories should specify the mechanism as well, so that the acceptance criteria can be written concretely.
- C. The stories should state the rule and additionally specify that the "Acting as" indicator on screen is read-only and provisional, so no story depends on it.
- X. Other (please specify)

[Answer]: A. Yes. The stories state that the actor comes from trusted server-side context, that a write request's actor field is never trusted, and that every audit entry must carry an actor.

---

## Mob Triage — Judgment Calls

The mob's Round-1 contributions raised three items on which two positions
are each legitimate. These are judgment calls, not knowledge disputes: an
expert cannot settle them from the codebase or the requirements, because the
answer is a choice about what the release should assert. They are put to you
below.

### Q8 — How the foundation workstream is expressed

The scope document records GROUP 1 — the schema rebuild and the historical
backfill — as "indivisible and a hard predecessor of everything else", and
the actor-identity mechanism as "a named blocking dependency of the
foundation workstream". It is release work, but it is not a persona's goal.

The mob's integrated draft expresses it as **US0.1**, a story in the standard
form ("As an asset administrator, I want the release's data model rebuilt…"),
with eleven acceptance criteria covering the rebuild, the backfill, the audit
history preservation, and the migration ordering. The developer's objection is
that this frames a technical workstream in a persona's voice, and the design
agent's is that the story set then contains a voice the persona set does not
justify. The quality engineer argues the opposite — that the criteria are
testable and the story is the only place the migration's acceptance criteria
can live, and that US0.1 is the anchor that lets NFR3.3–NFR3.6 be traced as
covered rather than deferred.

How should the foundation be expressed?

- A. Keep US0.1 as a story, in the current persona-voice framing. The foundation is release work, but it is delivered as a story so its acceptance criteria have a home and its requirements trace as covered.
- B. Keep US0.1 as a story but reframe it as a release-gating workstream story — the same eleven criteria, without the persona-voice "As a …" clause — so no persona is asserted for work that has none.
- C. Move the foundation out of the story set entirely and into Domain Design's inputs, and record NFR3.3–NFR3.6 as Deferred to that stage.
- X. Other (please specify)

[Answer]: B. Keep it as a story but reframe it as a release-gating workstream story — the same eleven criteria, without the persona-voice "As a …" clause — so no persona is asserted for work that has none.

### Q9 — How the unfixed performance ceiling is handled

NFR1.2 states: *"No numeric ceiling is stated here because none has been
fixed; see OQ5."* OQ5 records that the ceiling is an open question for the
product owner. Two acceptance criteria assert performance — AC5.4.2 (the
directory's lookup) and AC5.5.8 (the asset list) — so they need a form that
is falsifiable today without inventing the ceiling.

The developer's version keeps the ceiling in the criterion with a note that it
is unfixed and gated on OQ5. The quality engineer's version removes the
ceiling from the criterion entirely and asserts only the property that can be
observed now (for example, that the surface reads from one shared definition
and returns the same count as the dashboard for the same filter). The
integrated draft currently follows the quality engineer's version.

How should the unfixed ceiling be handled?

- A. Assert only what is observable now, and leave the ceiling to OQ5 and the product owner. The criterion states the property; the numeric threshold is named as a pending gate, not as part of the pass/fail condition.
- B. Keep the ceiling in the criterion with an explicit note that it is unfixed and gated on OQ5, so the criterion is visibly incomplete until the product owner fixes the number.
- C. Do not assert performance at all in this release — remove the performance criteria and record them as Won't Have pending OQ5.
- X. Other (please specify)

[Answer]: A. Assert only what is observable now, and leave the ceiling to OQ5 and the product owner. The criterion states the property; the numeric threshold is named as a pending gate, not as part of the pass/fail condition.

### Q10 — How the inline duplicate warning is delivered

FR10.4 requires an inline warning before submission when a duplicate is
detected, and FR10.5 requires that a duplicate be blocked with an
identification, a link, and exactly two next steps, with no override.

The quality engineer offered three ways to satisfy FR10.4 and objected that a
server round-trip wording is the weakest of them: a client-side check
endpoint is strongest but adds an endpoint the release's endpoint set does not
name; a server round-trip is implementable without new endpoints but changes
the wording from a warning to a confirmation step; folding the warning into
the blocking criterion abandons the two-behaviour distinction FR10.4 and
FR10.5 draw. The integrated draft currently follows the server round-trip
wording, with a Negotiable note recording that the release adds no
client-side rendering.

How should the inline duplicate warning be delivered?

- A. A client-side check endpoint, so the warning appears as the administrator types the serial or key and no submission round-trip is needed. This adds an endpoint the release's endpoint set does not currently name.
- B. A server round-trip on the field's blur, with the wording that makes the round-trip explicit. No new endpoint beyond the existing write path.
- C. Fold it into the blocking criterion (FR10.5) and drop the separate pre-submission warning (FR10.4), accepting that the two behaviours become one.
- X. Other (please specify)

[Answer]: B. A server round-trip on the field's blur, with the wording that makes the round-trip explicit. No new endpoint beyond the existing write path.

---

## Consolidated Summary Confirmation

The story set is now generated and integrated. What it contains:

- **30 released stories** across eight capability groups (US0–US7), carrying
  **204 acceptance criteria**, and **10 Won't Have** stories recording the
  deferred capabilities with their approved standing intact.
- **US0 — the foundation** was added during the mob: the scope document's
  GROUP 1 (the schema rebuild and the historical backfill) now has a home,
  so NFR3.3–NFR3.6 trace as covered rather than deferred. Its framing is
  Q8 below.
- The mob's three support agents — designer, developer, quality engineer —
  each reviewed the draft independently and wrote their own contribution
  file. Their findings were integrated, and a second round confirmed the
  resolution of every objection except the three judgment calls below.
- An independent product-lead reviewer then read the integrated set against
  the upstream requirements and the wireframes and returned **ten findings**
  (two Critical, four Major, four Minor). All ten were verified against
  their sources and all ten were real; all ten are fixed. The most
  consequential were the two new controls — the asset list's `Reset` and the
  directory's `Search holders` — which had no acceptance criterion at all,
  and the wireframes' `in-stock`-only chip premise for the "Unassigned" row,
  which the released `in-stock → lost` edge falsifies. The set's
  `## What the advisory review changed` section records each finding and its
  resolution.
- The set was then **re-reviewed against that revision**. The reviewer
  confirmed all ten findings resolved — independently recomputing the
  reconciliation seed and finding every published figure correct — and raised
  **five further findings** (one Major, four Minor), all of which are now
  fixed: the directory's count line had no stated behaviour under an active
  search (R-12, the one the reviewer flagged for the human's attention);
  FR4.4 and NFR2.5 were traced but unasserted (R-13, R-14); the asset
  list's filter dimensions were unstated (R-15); and one cross-reference
  pointed at the wrong criterion (R-11). The five are recorded in the same
  section of the story set.
- **Traceability**: all **115** upstream requirement IDs are traced, each to
  an existing story — the 17 group headings, their 95 leaves, and the three
  letter-suffixed ids (`FR1.6a`, `FR3.6a`, `NFR3.5a`) that the sensor's id
  pattern cannot match and that are therefore traced by hand. The
  traceability sensor passes with no gaps and no orphans.
- The three judgment calls below are the only unresolved items. They are
  choices about what the release should assert, not questions an expert can
  settle from the requirements or the code, so they are yours to decide.

- Looks correct
- Request changes

[Answer]: Looks correct
