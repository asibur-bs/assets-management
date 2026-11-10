# User Stories — Assessment

**Stage**: user-stories (inception)
**Intent**: 261106-asset-tracker-mvp
**Space**: default
**Scope**: feature
**Date**: 2026-11-09
**Review**: advisory (aidlc-product-lead-agent) — iteration 1: 10 findings, all verified and resolved; iteration 2: 10 confirmed resolved, 5 further findings raised and resolved
**Criteria**: 204 acceptance criteria across 30 released stories

---

## Decision

**Execute.**

User stories are run for the Asset Tracker MVP.

---

## Rationale

The MVP is a user-facing rewrite of an existing internal tool, and the three
conditions that make user stories worth producing are all present: a
multi-screen user-facing surface, a domain whose rules are numerous and
interlocking, and more than one party whose needs differ.

1. **The user-facing surface is eight screens wide.** The wireframes set out
   W1 dashboard, W2 asset list, W3 asset detail, W4 new-asset form, W5
   edit-asset form, W6 assignee directory, W7 reason dialog, and W8a/W8b
   discard and recovery dialogs. The requirements already translate some of
   these into capability statements (FR1 registration, FR2 assignment and
   return, FR3 lifecycle transitions, FR4 editing, FR5 the holder directory,
   FR6 audit history, FR9 the dashboard). Those statements describe *what the
   system must do*. They do not describe *for whom, in what order, with what
   value*, which is precisely the gap user stories close and which the
   requirement set cannot close without a narrative artefact.

2. **The business logic is complex and has already produced defects in its
   own specification.** The release carries eight released transition edges
   out of ten approved (FR3.2), five exclusive lifecycle buckets, a shared
   counting definition consumed by four surfaces (dashboard, assignee
   directory, asset list, CSV export), a normalised uniqueness rule applied
   at both registration and serial/key update, an actor-trust rule, and
   append-only audit history. Each of these is a rule whose *applicability
   varies by state*. A story set forces each rule to be attached to a
   specific actor-and-moment, which is how a rule like "a discard reason is
   always required" is caught when it has no owner.

3. **The parties who need the system differ.** The wireframes name one
   primary customer — internal IT asset administrators who register, assign,
   and write off assets on behalf of the organisation (Q13). The
   requirements name a target customer that spans two roles: the internal
   operations staff who register, hand out, recover, and retire physical
   assets and software licences, *and* the asset owner who needs to know where
   an asset is, who holds it, who held it before, and what happened to it.
   That second role is served by the dashboard, the asset list, the asset
   detail view and the assignee directory — the read surfaces — while the
   first role is served by the write surfaces. A requirements set cannot
   express the difference between "the person who performs the write" and
   "the person who reads the outcome" when both appear in the same feature
   descriptions; a story set can, and that difference is what makes the
   prioritisation in this release legible.

The assessment is also reinforced by two standing constraints recorded
earlier in this intent. The approved scope runs every stage — `aidlc-state.md`
records "Stages to Skip: none" — so this stage is executed rather than
waived on its own frontmatter condition. And the prior learnings record that
a stage whose own frontmatter condition suggests skipping for a class of
initiative is still run when the confirmed scope requires it.

---

## Factors Considered

| Factor | Evidence | Weight |
|---|---|---|
| Project type | Brownfield rewrite of an existing Express + SQLite application, delivered as a feature increment to a working POC | High — there is a working baseline, so stories must describe the *changed* behaviour, not the whole system |
| User-facing scope | Eight screens and seven flows; four navigation destinations (Dashboard, Assets, Holders, New asset) | High — user stories add value |
| Complexity signals | Eight released transition edges; five exclusive buckets; shared counting definition across four surfaces; uniqueness normalisation at two write paths; actor-trust rule; append-only audit; per-status dialog copy; seven accessibility commitments | High — stories add value |
| Multiple personas | At least two candidate roles in the requirements; the product owner signs off deployments; the administrator is the sole write actor | High — stories add value |
| Cross-team coordination needed | The stage runs in `mode: mob` with design, developer and quality participants; the actor-identity mechanism is blocked on open items I-01 / I-03 | Medium — the coordination is real but internal to the delivery |
| Independent testability | Every requirement in the release carries a pass/fail criterion, and the affirmed team posture is test-after with two named test-first exceptions | High — the requirement set is already testable, so stories add *narrative and prioritisation* value rather than testability value |
| Alternative coverage | Requirements analysis alone would satisfy the inception traceability guardrails | Low — adequate, but not sufficient for a multi-actor release of this size |

---

## Key Areas Where Stories Will Add the Most Value

1. **The write lifecycle.** The release adds three transitions the POC does
   not have — `in-stock → lost`, `assigned → discarded`, and the `lost →
   in-stock` recovery — and changes the behaviour of the ones it does have.
   Each new edge brings a distinct actor moment, a distinct reason
   requirement, and a distinct audit action. These are the clearest places
   where a story prevents an edge from being implemented as an afterthought.

2. **The reason-and-audit pairing.** Every transition that changes state
   writes an audit action, and four of them additionally require a reason
   drawn from a shared vocabulary. Stories are the natural place to state
   "the reason is captured in the same act as the transition, and both land
   together", which is the invariant the release actually needs.

3. **The reading surfaces for the asset owner.** The dashboard's bucket
   arithmetic, the asset list's counts and filters, the asset detail's
   history, and the assignee directory's holder rows are four views of one
   consistent set of definitions. Stories force each surface to be specified
   as a distinct moment with its own value statement, so the shared-definition
   invariant can be checked at the level where it would otherwise break.

4. **The editing path.** Asset editing (FR4) is the one capability in the
   release that touches registration-time uniqueness, the lifecycle
   timestamp fields, and the audit log simultaneously, and it is the path
   most likely to be under-specified because it is not new to the domain
   even though it is new to the product.

5. **The holder-is-not-an-identity boundary.** Because a holder is a
   free-text display name rather than an account, the stories must be
   careful never to imply that "assign to Dana" is a user operation. This is
   a narrative-level concern, not a schema-level one, and it is exactly the
   kind of thing a requirement statement can carry without anyone noticing.

---

## What This Stage Will Not Decide

- **The actor-identity mechanism.** Open items I-01 and I-03 remain open. The
  stories will state the *rule* — actor identity is resolved from trusted
  server-side context and is never taken from a write request — without
  asserting which of the four candidate mechanisms is chosen.
- **The implementation decomposition.** The stories describe observable
  behaviour. Splitting them into units and contracts belongs to the
  downstream design stages.
- **The deferred capabilities.** Deferred items are recorded as out of
  scope, not as stories.

---

## Outcome

The stage ran and produced the four declared deliverables.

| Deliverable | Content |
|---|---|
| `stories.md` | 30 released stories across eight capability groups (US0–US7), carrying 204 acceptance criteria, plus 10 Won't Have stories recording the deferred capabilities with their approved standing intact |
| `personas.md` | Two personas — the asset administrator who writes and the asset owner who reads — plus the stakeholders who are deliberately not personas |
| `traceability.json` | All 115 upstream requirement IDs traced to an existing story — the 17 group headings, their 95 leaves, and the three letter-suffixed IDs the sensor's pattern cannot match, traced by hand — with no deferred rows and no orphan requirements |
| `user-stories-questions.md` | The story plan, ten answered questions, and the record of the human's three judgment-call rulings |

The five areas this assessment predicted would gain the most from stories
were all realised. The write lifecycle produced eight edge-specific
transitions; the reason-and-audit pairing became the shared vocabularies
US3.3 and US3.6; the four reading surfaces became the one indivisible group
US5.1 and its consumers; the editing path became US6.1 with its audit
behaviour separated into US4.3; and the holder-is-not-an-identity boundary
became the explicit "no story is written in a holder's voice" rule.

Two findings from the review changed the shape of the set rather than its
content. The foundation workstream — the scope document's GROUP 1 — had no
home in the story set as first drafted, which left four migration
requirements with nowhere to trace and the affirmed test-first exception
with nothing to attach to; US0.1 was created to carry them. And the
draft's dependency graph contained two cycles, each an artefact of two
surfaces naming each other as the source of a value that a shared
definition already owns; both were broken without changing a criterion.

One thing this assessment did not anticipate, and which the mob surfaced, is
that the release's *silent* failures are the ones most likely to be
mis-specified. The migration that destroys the audit history raises no
error; a reason dialog that reuses the wrong variant copy states something
false to the administrator without failing; a counting surface that computes
its own count rather than calling the shared one still returns a plausible
number. Each of these has no failing test until it is specified as one, which
is the argument for the criteria as written rather than as a summary of
intent.

The advisory review confirmed that argument by finding exactly that class of
defect ten times. An independent product-lead reviewer returned two Critical,
four Major and four Minor findings, and every one of them was verified
against its upstream source before any change was made. All ten proved real,
and they were of the predicted kind: the asset list's new `Reset` control and
the directory's new `Search holders` input had no acceptance criterion at
all, so their behaviour was left to each developer to invent; the
`mark-lost` audit entry did not name the prior holder that FR2.8 requires;
the directory's holder row contradicted itself by both linking and refusing
to link; a cross-reference pointed at the wrong criterion; three requirement
IDs — including NFR3.5a, the binding migration-ordering constraint — were
untraced; an application-wide header property was asserted inside a
surface-specific criterion; NFR2.3 was asserted by nothing; the duplicate
warning's trigger was unstated; and the directory's empty result was
unrecorded.

One of the ten is worth naming separately, because the reviewer's conclusion
was right and its attribution was inverted. The reviewer's Critical finding
held that the reconciliation seed's "Unassigned" row contradicted the
wireframes' `in-stock`-only chip rule. Checked against FR3.5's pass/fail —
which says that a never-held asset marked lost falls in the "Unassigned" row
— and FR5.1 and FR5.2, the seed is correct and the **wireframes' premise** is
the artifact that is wrong: it rests on "every bucket other than `in-stock`
requires a prior holder to reach", and the released `in-stock → lost` edge
falsifies that. The fix therefore states the chip breakdown explicitly in
the seed and in AC5.1.6, so a developer building from the story set cannot
inherit the wireframes' wrong assumption — rather than bending the seed to
match the wrong artifact.

The set was then re-reviewed against that revision. The reviewer confirmed
all ten findings resolved — recomputing the reconciliation seed independently
and finding every published figure correct — and raised five further
findings, which were also of the same class and are also fixed: the
directory's count line had no stated behaviour under an active search, so
the line and the rendered rows could disagree (R-12); FR4.4 and NFR2.5 were
traced to stories that asserted neither of them (R-13, R-14); the asset
list's filter dimensions were never enumerated, leaving the new `Reset`
control's scope derivable only by inference (R-15); and one of the first
pass's own fixes had introduced a cross-reference to the wrong criterion
(R-11).

The reviewer's own closing note flagged R-12 as the one item it would not
let pass silently into Code Generation — a one-criterion fix that could
reasonably be resolved as a Domain Design ruling rather than a story-set
edit. It has been resolved in the story set, because the count line's
behaviour is observable and the release's own invariant is that the four
count-consuming surfaces agree: fixing it here keeps a single counting
definition rather than introducing a second path, and Domain Design inherits
the rule as stated rather than having to re-derive it.

