## Review
**Verdict:** READY
**Reviewer:** aidlc-product-lead-agent
**Iteration:** 1

I reviewed this revision of `requirements.md` against the eight findings raised in the
previous pass (R-1 to R-8), verifying each against the artifact's current text and
against the upstream artifacts that bind it — the requirements-analysis questions file
(Q1–Q20 and the recorded assumptions), the scope document (the three invariants, the
release boundary, I-01 to I-04), the wireframes (the `## Accessibility Commitments`
table and the W1 Attention panel), the user-flow set (F1–F8, the F5a edge table), the
decision log's seven standing conditions, `project.md`'s `## Decided` record, and the
POC requirements baseline. All eight findings were addressed, and each was addressed
correctly; three of them (R-1, R-3, R-6) were fixed in a form that differs from the
literal wording of the previous finding but is at least as strong and is grounded in
the confirmed answers rather than in the prior review's restatement. I also checked
that the three new requirements introduced by this revision — FR2.8, FR1.6a and
NFR3.5a — do not conflict with the requirements they summarise, that no requirement
identifier dangles, that the dashboard figure list still reconciles, and that the
previously-correct traceability, retirements, and boundary statements were not damaged.
Nothing blocking was found. The artifact can proceed to the human approval gate; the
findings below are Minor and Note and are quoted for the human's decision rather than
returned for another revision cycle.

### Verification of the eight findings

| Finding | Status | Evidence |
|---|---|---|
| R-1 | Resolved | FR11.1 now enumerates the wireframes' seven commitments as a numbered list (lines 630–638), in the wireframes' order and wording: colour-is-not-the-only-carrier; keyboard reachable and operable; focus visible and never trapped outside a modal; form errors associated with their field; structure is programmatic (with the `h1`/heading-order/landmarks/`<caption>`/`scope` detail the wireframes' table states); status changes announced; target size and contrast adequate. The skip link and the per-screen accessibility note are stated separately as additional requirements rather than smuggled into the list, so the list is exactly seven. The pass/fail names "all seven commitments and the skip-link requirement", so it checks against the same seven it enumerates. Target size is carried by FR11.3's Level AA floor, stated explicitly at line 644 — not restated as a separate commitment. |
| R-2 | Resolved | FR1.7 (lines 170–183) now distinguishes the two classes by name and by code: the duplicate-serial failure is "a permanent validation-class failure: it is not retryable"; the busy condition "is transient and is carried as the retryable error code, distinct from both the duplicate-serial failure and a generic internal error". The pass/fail asserts the two are distinguishable by code from each other and from a generic internal error, and that a duplicate-serial failure is not reported as retryable. It cross-references NFR3.2 for the generic busy behaviour. The old conflation is gone. |
| R-3 | Resolved | Two new binding requirements carry standing condition C-1 and the migration ordering. FR1.6a (lines 160–168) requires the uniqueness check to "run inside an `IMMEDIATE` transaction with a non-zero SQLite `busy_timeout`", with a three-part pass/fail (transaction type, timeout non-zero at check time, timeout-exceeded writer receives the retryable busy code). NFR3.5a (lines 772–786) requires the audit table to be rebuilt before the asset table, without its foreign-key clause, with the foreign key re-added afterwards, and requires the migration to control the `foreign_keys` pragma explicitly — and states the rationale in the requirement text ("dropping the asset table first fires the audit table's `ON DELETE CASCADE` and destroys every audit row with the transaction committed and no error raised"). The ordering constraint is now a requirement with its own evaluable pass/fail, not only assumption A11. |
| R-4 | Resolved | FR2.2's pass/fail (lines 212–218) now states that a write supplying an actor in a body field, query parameter, or directly settable header "**still succeeds**", that its audit entry records the server-resolved actor and not the supplied one, and that "the supplied value is neither persisted nor logged". The parenthetical makes the ignore-don't-reject semantics explicit, so a reader cannot implement "ignore" as "reject". NFR2.1's cross-reference to FR2.2 now points at a requirement that carries the behaviour itself. |
| R-5 | Resolved | The navigation paragraph (lines 95–96) now reads "Sections FR1–FR11" and "Section C1–C13". Both ranges were checked against the document's actual content: FR1 through FR11 are present, and the Constraints section defines exactly C1–C13. The assumption range "A1–A16" is also correct (A1–A16 plus the sub-numbered A8a). |
| R-6 | Resolved | FR6.7 (lines 476–488) now requires the attention panel to carry "**two separate items** — the `lost` bucket count and the `discarded` bucket count — each a whole-bucket count with no time window applied to either", with a summed figure permitted only "in addition to the two, but it does not replace them". FR7.1's pass/fail mirrors it: "an attention panel carrying the `lost` and `discarded` counts as two separate items". This matches the wireframes' W1 panel, which draws two lines ("6 assets marked lost", "5 assets discarded"), and the F3 frame, which repeats both. The pass/fail adds that a summed figure, if present, equals the sum of the two. |
| R-7 | Resolved | A16 is cited from FR5.1 ("the holder population itself is derived from the asset rows rather than from a separate holder record (assumption A16)") and again from FR8.1. A13 is cited from FR6.8 ("...does not satisfy this requirement (assumption A13)"). Both orphan assumptions are now anchored to the requirements that depend on them. |
| R-8 | Resolved (as a Note, implemented as a requirement) | FR2.8 (lines 253–265) is now a single requirement stating that every audit entry's description names the specifics of its event, with the closing rule "A description that names only the action is not sufficient." Its pass/fail enumerates the write paths: `assign` names the assignee; `return` names the returning holder; `mark-lost` names the loss, its reason and the prior holder where one applies; `recovered` names the recovery and the prior holder; `discarded` names the discard, the prior holder and the resolution of the assignment; `edit` names the changed fields and their previous values. This is the "state it once" fix the finding asked for, and it was implemented as a requirement rather than left as a consideration — a stronger outcome than the Note required. |

### Findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| R-1 | Major | FR11.1 | Resolved. FR11.1 enumerates the wireframes' seven commitments as a numbered list, matching the wireframes' `## Accessibility Commitments` table in content and order. The skip link and the per-screen note are stated separately; the target-size minimum is carried by FR11.3's Level AA floor rather than restated; the pass/fail names the same seven. One deviation from the previous finding's literal wording is deliberate and correct: the finding asked for "the contrast ratio the Q9 answer adds", but the confirmed answer to Q9 is **B**, not D — no numeric contrast ratio or target-size minimum was ever confirmed, and the answer's own "As A" clause adds only the per-screen statement. FR11.1 defers the numeric thresholds to FR11.3 rather than inventing a ratio, which is the only reading consistent with the confirmed answer. | None. The fix is correct as written. | Resolved |
| R-2 | Major | FR1.7 | Resolved. FR1.7 names the duplicate-serial failure as a permanent, non-retryable validation-class failure and the busy condition as the transient, retryable one, requires them to be distinguishable by code from each other and from a generic internal error, and cross-references NFR3.2. | None. | Resolved |
| R-3 | Major | NFR1.1, NFR1.2, FR1.5, FR1.6 | Resolved. FR1.6a carries the `IMMEDIATE` transaction and non-zero `busy_timeout` clauses of standing condition C-1 with an evaluable pass/fail; NFR3.5a carries the migration ordering as a requirement with its own pass/fail, including the explicit `foreign_keys` pragma control. Both new requirements are cross-referenced from the requirements they support (FR1.6a from FR1.7 and NFR3.2; NFR3.5a from the migration outcome requirements NFR3.5 and NFR3.6). | None. | Resolved |
| R-4 | Minor | FR2.2, NFR2.1 | Resolved. FR2.2's pass/fail states that the write still succeeds, the audit entry records the server-resolved actor, and the supplied value is neither persisted nor logged. | None. | Resolved |
| R-5 | Minor | Navigation | Resolved. The ranges read "FR1–FR11" and "C1–C13", both matching the document's actual content. | None. | Resolved |
| R-6 | Minor | FR6.7, FR7.1 | Resolved. FR6.7 and FR7.1 both require the two attention items as separate whole-bucket counts with no time window, matching the wireframes' W1 panel; a summed figure is permitted only as an addition. | None. | Resolved |
| R-7 | Minor | A16, A13 | Resolved. A16 is cited from FR5.1 and FR8.1; A13 is cited from FR6.8. | None. | Resolved |
| R-8 | Note | FR4.3, FR10.1, FR1.1 | Resolved, and implemented more strongly than the finding asked: FR2.8 states the description-content rule once as a requirement, and its per-path enumeration agrees with FR3.6a, FR3.7, FR3.9, FR4.3 and FR10.1 rather than restating any of them differently. I checked each pair — the `mark-lost` reason, the `recovered` recovery-and-prior-holder, the `discarded` discard-prior-holder-and-resolution, and the `edit` changed-fields-and-previous-values clauses all match. No requirement contradicts another. | None. | Resolved |
| R-9 | Minor | FR2.8 | FR2.8's closing rule — "No entry's description names only its action" — is universal and therefore already covers the `create` action, but its enumerated pass/fail list omits `create`. A `create` entry is the one write path with no named specifics anywhere in the document: FR1.1 requires only "one `create` audit entry", and the wireframes' flow set describes the `create` entry by its action alone. A builder following FR2.8's enumeration literally would produce a `create` entry whose description is just the asset's name and nothing else, which the universal clause forbids but the enumeration never asks for. This is the exact class of defect R-8 was raised to prevent, in the one path R-8's list left uncovered. | Either add `create` to FR2.8's enumerated pass/fail with the specifics a registration entry must name (at minimum the registered asset's name and category, and the serial/key under which it was registered), or state explicitly in FR2.8 why the `create` entry is exempt — for example, that the asset's identity is fully carried by the row it creates and the entry's description names it. | New |
| R-10 | Minor | FR1.6a, FR1.7, NFR3.2, standing condition C-1 | Standing condition C-1 names the driver-level error code `SQLITE_BUSY` explicitly ("`SQLITE_BUSY` mapped to a retryable error"). The requirements carry the behaviour but never the code: `SQLITE_BUSY` does not occur anywhere in the document, and FR1.6a, FR1.7 and NFR3.2 all speak of "the retryable error code" and "the permanent validation-class code" without naming which code is which. The document's own `## Mandated` rule in `project.md` requires that a SQLite error be detected by its machine-readable `err.code` and never by message text, and NFR6.6 requires the same of the tests — so a requirement that never names the code leaves the mapping to be chosen at implementation time, which is the decision the standing condition already makes. | Name the retryable code and the duplicate-serial code in FR1.7 (or state that the code names are fixed by the standing condition and carried into the error vocabulary), so that the C-1 mapping to `SQLITE_BUSY` is visible in the requirement rather than only in its rationale. | New |
| R-11 | Note | A11, NFR3.5a | R-3 moved the migration ordering constraint from an assumption into a binding requirement (NFR3.5a), which is the correct outcome. The consequence is that A11 is now the one assumption in the document cited by no requirement — the Assumptions section otherwise cross-references cleanly (A4, A6, A8, A10, A12, A13, A15, A16 are all cited from requirement text). A11 now reads "the migration's ordering constraint **can be satisfied by** rebuilding the referencing table first", which is weaker than NFR3.5a's "This ordering is binding". Nothing is broken: the binding statement lives in the requirement, and A11 is harmless supporting rationale. | Consider citing A11 from NFR3.5a so the assumption and the requirement are visibly the same constraint stated twice, or fold A11 into NFR3.5a's rationale and remove the orphan. | New |

### What is fit for the customer

The release's primary success measure — Audit Completeness, that every audit entry
carries an actor attribution and that history is never destroyed — is now carried by a
set of requirements that a reader can actually check. FR2.1 and FR2.2 make the actor
attribution and the actor-trust rule binding and testable, and the addition to FR2.2's
pass/fail in this revision closes the last ambiguity in it: a request that carries a
stale actor field is not an error, it is a request whose actor is ignored. The
append-only guarantee is enforced at the database level (FR2.7, NFR2.7) rather than left
as an application convention, and the migration that installs it now has its ordering
constraint stated as a requirement (NFR3.5a) rather than as an assumption — which is the
difference between a release that is protected against silent history loss and one that
merely intends to be.

The audit trail is now useful to the person reading it, not merely present. FR2.8 states
the description-content rule once, and the per-path requirements beneath it agree with
it. A reader asking "who had this before it went missing" gets a holder, a prior holder
and a reason on the entry, on every path that produces one (FR3.6, FR3.6a, FR3.7,
FR3.9, FR4.3, FR10.1). The one gap is the registration entry (R-9), which is the least
consequential of the seven because the asset's own row carries the identity — but it is
the same gap, and it is cheap to close.

The uniqueness behaviour is now stated at the level a customer experiences rather than
only at the level the driver implements it. FR1.7 distinguishes the two failure classes
by name, by class and by code, so an administrator who is told "that serial is taken"
is not told to retry a permanent conflict (R-2), and an administrator who is told
"the system is busy, try again" is not told a serial is taken. FR1.6a makes the
retryable wait an explicit part of the contract, and FR1.6a's cross-references to
FR1.7 and NFR3.2 mean the three requirements read as one behaviour.

The count-consistency guarantee — the invariant that stops the four surfaces from
disagreeing — holds together after this revision. FR6.7 and FR7.1 name the same figure
list, the attention panel carries its two whole-bucket counts as the approved wireframe
draws them (R-6), and FR7.2's reconciliation still holds: five tiles to the total,
active inventory to the four non-discarded buckets. FR6.8's indivisible-group rule,
now anchored to A13, means the group cannot be split across an increment.

The accessibility floor is now the floor the wireframes actually committed to. FR11.1
enumerates the seven commitments in a form a checker can work through — colour is not
the only carrier of meaning, keyboard reachability, focus visibility and non-trapping,
form-error association, programmatic structure, status-change announcement, and target
size and contrast — and it applies them to the new surfaces without re-specifying the
POC's existing chips, exactly as the wireframes scope them. FR11.2 and FR11.3 hold the
history panel's keyboard navigation and the Level AA floor, so the release has one
accessibility story rather than two.

Two minor observations remain open for the human's decision rather than for another
revision cycle. R-9 asks whether the registration entry's description is named
specifically or is explicitly exempted from FR2.8's rule. R-10 asks whether the
`SQLITE_BUSY` mapping that standing condition C-1 names should be visible in FR1.7
rather than left to the implementation. Neither changes what the customer receives; both
change how unambiguously the next stage can build to the requirement. R-11 records that
A11 is now an orphaned assumption after the ordering constraint became NFR3.5a — a
tidiness observation, with no functional consequence.

The document's internal integrity is sound. No requirement identifier dangles: every
`FR`/`NFR` reference resolves to a defined requirement, the constraint count matches the
navigation's stated C1–C13, and the assumption list is A1–A16 plus A8a as claimed. The
retirements remain correct and recorded — FR4.5 (`lost` is terminal) and the
`assigned-to` half of FR1.2 are retired, FR5.3 is superseded in part with its global-log
deferral preserved, FR1.3 is recorded as changed behaviour under an approved amendment
rather than as a retirement, and FR4.4 is preserved — with each row's wording checked
against the POC requirements baseline. The two approved-but-deferred discard edges are
still recorded as deferred with their standing intact and are still distinguished from
the explicitly out-of-scope set. The five open questions are still stated as unresolved,
with none assumed answered in either direction and no requirement depending on a guess
about any of them; the actor-identity mechanism in particular remains a named blocking
dependency with its own next action, and the requirements are written so that the rule
rather than any one mechanism is what is tested.
