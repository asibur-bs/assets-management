## Review
**Verdict:** READY
**Reviewer:** aidlc-product-lead-agent
**Iteration:** 1

I checked `requirements.md` against the twenty confirmed interview answers
(Q1–Q20) in `requirements-analysis-questions.md`, the release boundary and the
three invariants in `scope-document.md`, the eight-screen set and the seven
accessibility commitments in `wireframes.md`, the eight flows and the F5a edge
table in `user-flow.md`, the approved decision set in `decision-log.md`, the
affirmed testing and deployment practices in `team-practices.md`, the seven
standing conditions in `memory/project.md` `## Decided`, and the POC baseline
requirements. The artifact is structurally sound: every requirement carries a
stated pass/fail criterion, the release-boundary and deferred/out-of-scope split
is stated so a stakeholder can check it from this document alone, the retirement
record names exactly the two retired POC requirements and the one partially
superseded one, and the traceability table carries all four named POC
requirements with their relationships stated precisely. The defects I found are
concrete and fixable but none of them makes the document unusable at the
approval gate: two requirements overstate or mis-state what their upstream
answer established, one standing condition is carried only in part, one
accessibility requirement does not enumerate the commitments it claims to
enumerate, and two document-navigation statements are stale. They are recorded
below with the concrete action each needs.

### Findings
| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| R-1 | Major | FR11.1 | FR11.1 claims to enumerate "the seven accessibility commitments recorded for the release", but the seven it lists are not the seven the wireframes record. It lists: skip link; single top-level heading with correct heading level; a primary landmark region; keyboard reachability; visible focus indicator; contrast ratio; stated keyboard entry point. The wireframes' seven are: colour is never the only carrier of meaning; every interactive element is reachable and operable by keyboard; focus is visible and never trapped outside a modal; form errors are associated with their field; structure is programmatic; status changes are announced; target size and contrast. Three wireframe commitments are dropped — colour-not-the-only-carrier, form errors associated with their field, and status changes announced — and two items not in the wireframe list are introduced: the stated keyboard entry point (a per-screen note, not a commitment) and the numeric contrast ratio (introduced by the Q9 answer D, which adds "a named contrast ratio and target-size minimum", so the ratio is defensible but the *target-size minimum* was dropped and the whole list has been renumbered against a different set). The pass/fail criterion — "each released screen is checked against all seven commitments and passes each" — is therefore not evaluable: a checker following the wireframes' list would fail screens the document never asked for, and screens would ship unverified against form-error association and status-change announcement, which are real accessibility defects. | Restate FR11.1 so its enumerated commitments are the wireframes' seven, plus the contrast ratio the Q9 answer adds, and state explicitly that the target-size minimum is carried by FR11.3's Level AA floor rather than restated. Split the sentence into a named list so the pass/fail criterion names the same seven it can be checked against. | New |
| R-2 | Major | FR1.7 | FR1.7 states that "a uniqueness failure raised because the database was busy is carried as the retryable error code", which conflates two different conditions. A uniqueness failure is a *permanent* conflict — the serial is taken — and the Q7 answer and the user-flow F1 branch both treat it as a terminal collision block with two actions and no override. The *busy* condition is a transient lock contention. The Q6/standing-condition pairing in `project.md` is explicit: `SQLITE_BUSY` maps to a retryable error, and the uniqueness check runs in an `IMMEDIATE` transaction with a non-zero `busy_timeout`. FR1.7's pass/fail therefore asks for a permanent condition to be retryable, and — read with FR1.5's "the database's unique index, not the application predicate, decides which writer succeeds" — it implies that a genuine duplicate serial is reported as retryable, which would let an administrator believe a taken serial is a transient fault and retry indefinitely. | Rewrite FR1.7 to state that the *busy* condition (lock contention on the uniqueness check) is carried as the retryable error code, is distinguishable by code from a duplicate-serial failure, and is not reported as a generic internal error; and that a genuine duplicate-serial failure is a permanent validation-class failure that is *not* retryable. Keep NFR3.2 as the generic busy-condition requirement and cross-reference it from FR1.7. | New |
| R-3 | Major | NFR1.1, NFR1.2, FR1.5, FR1.6 | Standing condition C-1 is carried only in part. Its three clauses are "the uniqueness check uses an `IMMEDIATE` transaction and a non-zero SQLite `busy_timeout` with `SQLITE_BUSY` mapped to a retryable error". The `SQLITE_BUSY`→retryable clause is present (NFR3.2, FR1.7). The other two clauses are not: `requirements.md` contains no occurrence of "IMMEDIATE" or "busy_timeout" in any requirement, assumption, or constraint. FR1.6 states the *outcome* ("two concurrent writers ... produce exactly one asset row and one rejection") and FR1.5 states that the database's index decides the winner, but nothing requires the check to run inside an `IMMEDIATE` transaction, and nothing requires a non-zero `busy_timeout` — which is precisely the configuration that makes the concurrent case wait and then surface as a retryable busy condition rather than as an immediate generic failure. A release can therefore satisfy every requirement in the document and still be built with a zero `busy_timeout` and a deferred transaction, which the standing condition forbids. The same gap applies to NFR3.5/NFR3.6, which state the *outcome* of the migration (history preserved, foreign keys consistent) but not the *ordering* constraint that makes it achievable. | Add a requirement — most naturally within FR1.5/FR1.6 or as a new NFR3.7 — stating that the uniqueness check runs inside an `IMMEDIATE` transaction with a non-zero SQLite `busy_timeout`, and that the audit table is rebuilt before the asset table with the foreign key re-added afterwards. State the ordering constraint explicitly rather than leaving it implied by NFR3.5/NFR3.6's outcomes, since A11 already records it as an assumption and a requirement is what makes it binding. | New |
| R-4 | Minor | FR2.2, NFR2.1 | FR2.2 and NFR2.1 both carry the actor-trust rule, and FR2.2's pass/fail names "a body field, a query parameter, or a directly settable header". Neither requirement states what happens to the request when it carries such a field. The Q1 answer (D) and the Q2 answer (D) require the request-supplied actor to be *ignored* and the server-side value used in its place — not rejected and not sanitised into acceptance — and the standing condition in `project.md` `## Mandated` says the same. FR2.2's "shall be ignored, and the server-side value used in its place" does state this, so the requirement is substantively correct; the gap is that NFR2.1's pass/fail is a bare cross-reference ("as specified in FR2.2") to a requirement that lives in a different section, which weakens it as a security gate but does not misstate it. The genuine product risk is that FR2.2 says the supplied actor is ignored *and* that "no client-settable field or header shall be the actor's source", without stating that the request still succeeds — a reader could implement "ignore" as "reject the request" and break the operator's workflow for a request that merely carried a stale field. | Add to FR2.2's pass/fail that a write that carries a request-supplied actor still succeeds and is recorded under the server-resolved actor, and that the supplied value is neither persisted nor logged. This is the confirmed answer's own wording (Q1 D, Q2 D) and makes the "ignored, not rejected" behaviour directly testable. | New |
| R-5 | Minor | `## How this document is organised` | The navigation paragraph is stale on two counts. It says "Sections FR1–FR10 state the functional requirements", but the document contains an FR11 (Accessibility). It says "Section C1–C10 state the constraints", but the document contains C1–C13. A reader who uses this paragraph to navigate will not find FR11 or C11–C13, and the count is the kind of label that gets copied into a later artifact. | Correct the two ranges to "FR1–FR11" and "C1–C13". | New |
| R-6 | Minor | FR6.7, FR7.1 | FR6.7 defines the attention count as "the sum of two whole-bucket counts — the `lost` bucket count and the `discarded` bucket count" and its pass/fail asserts a single summed figure. The wireframes' W1 Attention panel renders *two separate lines* — "6 assets marked lost" and "5 assets discarded" — and the user-flow F3 frame repeats the two lines. The requirements document therefore collapses a two-line panel into one figure, and FR7.1's pass/fail ("the attention count", singular) carries that collapse forward. The arithmetic is still right and the wireframes explicitly call the panel "a short list of counts", so this is a rendering-shape fidelity gap rather than a counting error — but a builder following FR7.1 would render one number where the approved concept draws two, and the wireframes are the artefact the stakeholder approved. | Restate FR6.7 and FR7.1 to require the attention panel to present the two whole-bucket counts as two separate items — the `lost` bucket count and the `discarded` bucket count, each a whole-bucket count with no time window — rather than a single summed figure. If a single summed figure is wanted as well, state it as an additional derived value, not as a replacement for the two lines. | New |
| R-7 | Minor | A16 | A16 states that the holder directory's holders are derived from the asset rows rather than a separate holder record, and A13 states the four surfaces ship as one increment, but neither is referenced from any requirement. A16 in particular underpins FR5.1 (the display-holder definition), FR8.1, and FR8.4, all of which depend on the directory being derived rather than registered. The assumptions section is otherwise well cross-referenced (A4, A6, A8, A10, A11, A12 are all cited from requirement text), so these two read as orphaned rather than as a deliberate convention. | Cite A16 from FR5.1 or FR8.1, and A13 from FR6.8, so a reader can see why the directory's population is the assets' holder names and why the four surfaces cannot be split. | New |
| R-8 | Note | FR4.3, FR10.1, FR1.1 | FR1.1's pass/fail requires registration to produce "exactly one asset row and one `create` audit entry", FR4.3's pass/fail requires an edit that changes two fields to append "one entry", and FR10.1's pass/fail requires an edit to append "one `edit` audit entry naming the changed fields and their previous values". FR3.3 requires a legal transition to append "exactly one audit entry", but FR3.6a, FR3.7, and FR3.9 each require the audit entry to name *additional* content — the reason, the prior holder, the fact that the assignment was resolved. This is consistent with the wireframes, whose history entries carry a description line naming "which holder, which prior holder, which reason", so there is no contradiction. The note is that the single-entry rule and the description-content rule are stated in two separate places (FR3.3 for the count, FR3.6a/FR3.7/FR3.9 for the content) with no requirement that states an audit entry's description must name the specifics of its event. A builder reading only FR2.1 and FR3.3 would produce a valid, passing, and materially less useful history. | Consider a single requirement stating that every audit entry's description names the specifics of its event — the holder, the prior holder, the reason where one is required — so the description-content rule is stated once rather than being implied across five requirements. | New |

### What is fit for the customer

The document is, on the whole, in the shape a stakeholder and a builder can both
use. The release boundary is checkable from this document alone: the deferred
set names all five deferred capabilities and both deferred discard edges, and
states for each that it is approved work with a later delivery date; the
explicitly-out-of-scope set names six items and states that they are not
follow-on items. That distinction is the one the scope document says is
load-bearing, and it survives intact. The retirement record is precise — FR4.5
and the `assigned-to` half of FR1.2 are retired, FR5.3 is superseded in part
with the global-log deferral preserved and the latest-entry-only rendering
superseded, FR1.3 is recorded as changed behaviour under an approved amendment
rather than as a retirement, and FR4.4 is preserved with the deferral of
`returned → discarded` called out so it does not appear to widen the POC
requirement. The `## Traceability` prose underneath the table repeats the
retirements in one paragraph so a reader who only skims the prose still learns
them.

The product-level behaviour is where the document is strongest. The
display-holder rule (FR5.1, FR5.2) is stated once and applied consistently,
including the two consequences the wireframes identify — a recovered and a
discarded asset are counted under their preserved previous holder and not under
"Unassigned" — and the fact that only a never-held asset belongs there. The
four count-consuming surfaces are stated as one indivisible group (FR6.8), the
five bucket counts sum to the total (FR6.3), the directory's count line is
specified as a count of distinct display holders excluding the "Unassigned" row
(FR6.5), and each holder row's chips sum to that row's total (FR6.6). The
deferred-versus-out-of-scope split survives without dragging the deferred
count line into the release, which was the narrowing the upstream stages
recorded and which this document honours by stating FR6.4 and FR6.5 as
requirements rather than deferring them.

The actor-trust rule is carried as a rule and not as a mechanism, which is
what Q1 (D) and Q2 (D) asked for. FR2.2 constrains any future mechanism, FR2.3
requires a displayable stable identity, FR2.4 reserves the read-only "Acting
as" place without asserting a mechanism, and NFR2.5 makes CSRF protection
conditional on the mechanism actually being a browser-attached credential —
which is the correct conditional rather than an assumption. OQ1 records the
mechanism as open with I-01 and I-03 named, a named next action, and an
explicit statement that the foundation workstream cannot start until it
resolves.

Three things I checked that hold up cleanly. The migration-ordering constraint
is present as A11 and reflected in NFR3.5 and NFR3.6, with the silent
data-loss failure mode named in A11's rationale; the requirement that the
rebuild re-issues the indexes is A12; and the backfill requirements NFR3.3 and
NFR3.4 carry the confirmed Q11 answer faithfully — idempotency, failure
counting by row identifier and reason, failure of the migration, rollback of the
backfill transaction, and the prohibition on silently skipping, deleting,
overwriting, or partially modifying a failed row. NFR3.3 and NFR3.4 together
are the release's most safety-critical pair, and they are stated precisely
enough to be written against.

The testing posture is carried consistently with `team-practices.md`: NFR6.1
preserves the baseline and adds alongside it, NFR6.2 carries the 80% floor as
enforced rather than observed, NFR6.3 carries the requirement-identifier
convention, NFR6.4 carries the two named test-first exceptions, NFR6.5 carries
the fixture-must-carry-audit-rows rule, and NFR6.6 carries the assert-on-code
discipline. The constraints section carries the affirmed deployment and
code-style practices as C4 through C13, including the `npm ci` install, the
WAL-aware backup, the smoke test, the manual rollback, the branch rename, and
the lint→test→coverage→audit pipeline order.

### Recommended reading at the approval gate

The human should be asked to approve the document with the seven findings above
in view. None of them is a scope question and none reopens the decision set,
so approval does not need to wait on any of them. R-1 through R-3 are the ones
worth a decision: R-1 changes what an accessibility checker will test, R-2
changes whether a taken serial is reported as retryable, and R-3 is the one
place where a standing condition is only partly carried into a requirement, so
a build could satisfy the document and still violate C-1. R-4 through R-7 are
wording and navigation corrections. R-8 is a suggestion, not a defect.
