**Collaborator:** aidlc-quality-agent

## Contribution

I reviewed `stories.md` and `personas.md` from the testability of the acceptance
criteria only. I did not review visual design, persona fidelity, implementation
feasibility, code structure, or whether the requirements are correct.

The headline: **the draft's criteria are substantially more determinate than the
requirements they derive from, and the set is close to buildable as-is.** The
majority of criteria name a countable, observable outcome. Seven findings below
need a wording change before the set can be tested; the rest are additive.

Everything below is written so it can be integrated into `stories.md` directly.
Proposed wording is given verbatim, in the draft's own voice.

---

### Finding 1 — `AC5.4.2` and `AC5.5.8` assert against a ceiling that does not exist yet

`AC5.4.2` reads: *"Given a dataset at the confirmed medium scale — hundreds to
low thousands of assets — then the list renders it within the approved
performance ceiling, without degradation that would require pagination."*

`AC5.5.8` reads: *"Given the export is validated against the upper-end dataset,
then it remains within the approved export ceiling."*

This is the draft's most serious testability defect, and it is not the draft's
fault — it is inherited. NFR1.2 states the ceilings are **not yet fixed**: *"No
numeric ceiling is stated here because none has been fixed; see OQ5."* OQ5 is
open. A criterion that says "within the approved performance ceiling" names no
threshold, so it has no pass condition and no test can be written against it
today. Worse, the ceiling cannot be filled in at test-writing time either: it
depends on a measured baseline and the Product Owner's approval, neither of
which exists.

The draft also uses "the approved performance ceiling" and "the approved export
ceiling" as if they were two different ceilings. NFR1.1's six quantities include
the export generation time, and NFR1.3 says the export "remains within the
approved export ceiling" — so there is one set of ceilings, of which the export
is one quantity. The wording makes it read as two.

**Proposed rewrites.** Split each into the part that is testable now and the
part that is blocked, and mark the blocked part so a test author does not try:

> **AC5.4.2** — Given a dataset at the confirmed medium scale — hundreds to low
> thousands of assets, with a distribution across all five buckets and a holder
> set large enough to exercise the directory's grouping — then the asset list
> renders the full dataset, and renders every matching row without truncation
> or an error. *(The performance ceiling itself is not asserted here: NFR1.2's
> ceilings are unfixed (OQ5). The measured list retrieval and render time for
> this dataset is recorded against NFR1.1, and the acceptance check against
> NFR1.2 is performed only once the Product Owner approves the ceiling.)*

> **AC5.5.8** — Given the export is validated against the representative
> upper-end dataset, then it produces the full row set (asserted by AC5.5.4)
> and the export generation time for that dataset is recorded against NFR1.1.
> *(The ceiling check is performed only once the Product Owner approves it
> under NFR1.2; OQ5 is open.)*

This preserves the requirement's intent without producing a criterion that
cannot fail and therefore cannot pass.

I also note that `AC5.4.2` and `AC5.5.8` are the only two criteria in the set
that reference a quantity no stakeholder has approved. Everything else names a
value that is already fixed.

---

### Finding 2 — `AC7.2.7` ("target size and contrast are adequate") is not determinate

`AC7.2.7` reads: *"Given any released screen, then target size and contrast are
adequate."*

"Adequate" is the exact word the inception phase guardrail forbids: *"Avoid
ambiguous language ('fast', 'easy', 'user-friendly') unless paired with a
measurable threshold."* A test author cannot assert "adequate". It would have
to be either "adequate against WCAG 2.1 AA" — which is already AC7.2.10 — or a
separate hand-written threshold that nobody has fixed.

FR11.1 is careful about this: *"The numeric contrast thresholds are carried by
FR11.1's Level AA floor and are not restated as a separate commitment here."*
The story set has lost that distinction and restated the commitment without
its floor.

**Proposed rewrite**, which restores FR11.1's own structure:

> **AC7.2.7** — Given any released screen, then each interactive element meets
> the WCAG 2.1 Level AA target-size criterion and each text and background pair
> meets the Level AA contrast criterion — the floor for both is the one fixed
> by AC7.2.10, and no weaker threshold is accepted.

This also removes a duplicate: as drafted, AC7.2.7 and AC7.2.10 both turn on
Level AA, so a reader could reasonably believe two separate checks are
required.

---

### Finding 3 — `AC7.2.6` ("a status change is announced") has no observable carrier

`AC7.2.6` reads: *"Given a status change occurs, then it is announced."*

FR11.1 item 6 says the same thing, and the requirements have the same problem,
so I am not raising this as a requirements defect — but the story set is where
a criterion becomes a test, and this one cannot become one. "Announced" is a
property of an assistive technology's live region. The application is
server-rendered with no client-side rendering (the affirmed practice records
this explicitly, and the rough-mockups stage recorded the same decision), so
there is no live region and no client-side mechanism to assert on.

**Proposed rewrite** that is observable in a server-rendered application and
that keeps the commitment's substance:

> **AC7.2.6** — Given a status change is performed and the response is
> returned, then the outcome is conveyed in the returned markup — the new
> status is present in the response, and the response carries either a
> `role="status"` or `role="alert"` region whose text names the new status.
> *(No client-side announcement behaviour is required: the release adds no
> client-side rendering.)*

If the Product Manager would rather not pin the markup role here, the weaker
but still testable form is: *"the response's markup names the new status, so
that an assistive technology reading the response is told the outcome."* I
recommend the first.

The same treatment applies to `AC7.2.5` ("its structure is programmatic"),
which is determinate — `h1`, heading order, landmarks, `caption`, `scope` are
all countable in rendered HTML — but I note it is the one criterion in US7.2
that the existing `tests/views.test.js` idiom can assert directly, since that
suite already asserts rendered HTML.

---

### Finding 4 — `AC7.2.9` (the per-screen accessibility note) asserts on a document, not on the application

`AC7.2.9` reads: *"Given any released screen, then it carries a per-screen
accessibility note naming its heading level, its primary landmark regions and
its keyboard entry point."*

FR11.1 requires the same, so this is inherited rather than introduced. But
"carries a per-screen accessibility note" reads as though the note ships in
the application. The requirement's intent, read against the wireframes, is
that the release carries the note as **documentation**. A test that renders a
screen and searches for the note would fail against a correct implementation.

**Proposed rewrite**, which makes the carrier explicit:

> **AC7.2.9** — Given each released screen, then the release's accessibility
> documentation carries a note for that screen naming its heading level, its
> primary landmark regions and its keyboard entry point. *(The note is a
> release artifact, not rendered into the application; the note is therefore
> not asserted by a rendering test.)*

This is the same class of defect as Finding 1 in a different guise: a
criterion whose subject is not a runtime behaviour.

---

### Finding 5 — the "exactly one audit entry" criteria do not say what happens when the write fails midway

This is the gap the task brief asks about specifically, and it applies to
**eleven** criteria: `AC1.1.1`, `AC2.1.3`, `AC2.2.2`, `AC3.1.5`, `AC3.2.1`,
`AC3.4.2`, `AC3.5.2`, `AC3.6.3`, `AC4.3.1`, `AC4.2.5`, `AC7.1.1`.

`AC7.1.5` does cover it — *"Given a failure occurring between the asset write
and the audit append, then the asset row and the audit trail are both
unchanged"* — and it covers it well. But it is the **only** criterion that
does, and it is buried in the cross-cutting story. A test author working from
`AC3.4.2` alone writes *"exactly one `discarded` audit entry is appended"*, and
that test passes even if the implementation appends the entry on a path where
the asset write was rolled back — the assertion is on the audit count, not on
the pair.

The team practices name this as a **test-first exception**: the two-table
rebuild's test *"must exist before the code that could silently violate it"*,
because *"its defect is silent history loss with the transaction committed."*
The same defect shape exists on every write path, and the criteria as drafted
do not pin it per path.

**Proposed addition** to `US7.1`, which then covers every write path without
duplicating it eleven times:

> **AC7.1.6** — Given any write path, then the asset change and its audit
> entry are committed as one unit, so that a failure injected between the
> asset write and the audit append leaves the asset row unchanged and appends
> no audit entry. *(This is the per-path assertion of FR2.5 and NFR3.1; each
> write path is exercised individually, and the dedicated test for the
> uniqueness check and the two-table rebuild is written before the
> implementation, per the affirmed testing posture.)*

I recommend the Product Manager add a one-line pointer under each of the
eleven criteria rather than restating the rule — something like *"the write
and its audit entry commit as one unit (AC7.1.6)"* — so that a test author
working from a single story still finds it. That is the failure mode the
"exactly one entry" phrasing invites: a per-story reader who never opens
US7.1.

---

### Finding 6 — `AC1.2.5` and `AC1.2.8` assert on an implementation detail the story set should not own

`AC1.2.5` reads: *"Given the database refuses the write, then the refusal is
detected from the driver's machine-readable `SQLITE_CONSTRAINT_UNIQUE` code and
never by matching error message text."*

`AC1.2.8` reads: *"Given a concurrent writer cannot obtain the lock within the
timeout, then it receives the retryable busy code detected from `SQLITE_BUSY`,
not a generic internal error."*

These are the two criteria that concern me most, because they assert on **how**
the refusal is detected rather than on **what** the caller observes. NFR6.6
states the same rule — *"no new test matches on error message prose"* — but
NFR6.6 is a rule about the *test suite*, not a rule about the *product*. The
draft has turned a test-discipline rule into a product acceptance criterion,
and in doing so has made it untestable from the outside: no test can assert
that the implementation did not match on message text. A test can assert that
the *outcome* is the duplicate code; it cannot assert the *absence of a
technique*.

`AC1.2.4` gets this right — *"the two tiers are indistinguishable to me"* is a
genuinely observable property, and it is the one that matters. `AC1.2.7` is
also problematic: *"the uniqueness check runs inside an `IMMEDIATE` transaction
with a non-zero SQLite `busy_timeout`"* is an implementation detail, and the
word "so" makes it a causal claim about locking behaviour that only a
white-box test could check.

**Proposed rewrites** that preserve the observable requirement and drop the
technique:

> **AC1.2.5** — Given the database refuses the write, then the caller receives
> the same duplicate-serial error code the application's own check would have
> raised, and the refusal is reported on the error's machine-readable code
> rather than on its message text. *(The NFR6.6 discipline — no new test
> matches on error message prose — is a test-suite rule and is verified by
> inspection of the suite, not by a product criterion.)*

> **AC1.2.7** — Given the uniqueness check runs, then a concurrent writer
> waits for the lock rather than failing immediately, and the wait is bounded
> by a non-zero busy timeout. *(The lock is taken for the duration of the
> check, so that two concurrent registrations of the same serial cannot both
> succeed — asserted by AC1.2.6.)*

> **AC1.2.8** — Given a concurrent writer cannot obtain the lock within the
> timeout, then it receives the retryable busy error code, which is
> distinguishable from the duplicate-serial code and from a generic internal
> error by its code alone.

Note the change in `AC1.2.8`: the testable claim is that the busy code is
**distinguishable by code**, which a test can assert on `err.code` exactly as
the team's assertion discipline requires. "Detected from `SQLITE_BUSY`" is not
assertable from outside the driver boundary.

I would like the Product Manager to consider whether `AC1.2.7` should be
dropped entirely rather than reworded, since `AC1.2.6` already asserts the
observable consequence (exactly one row and one rejection).

---

### Finding 7 — the error-code names are never given, so no criterion can name its expected code

Every criterion that asserts on an error refers to "the validation error code",
"the invalid-transition error code", "the duplicate-serial error code", "the
retryable busy code", and "the retryable error code" — **without ever naming
one**. The requirement is correct to use generic names (the mechanism is open
and the error vocabulary is a domain-design concern), but the consequence is
that **no test can be written**, because the team's own assertion discipline
requires asserting on `err.code`, and the criterion never says which code.

FR1.7 requires the code to exist and requires the two failure classes to be
distinguishable by code. It does not fix the spelling. NFR6.6 requires the
assertion to be on the code.

This is a genuine sequencing dependency, not a defect to be fixed by guessing.
**The Product Manager cannot invent the code names** — the error vocabulary is
owned by Domain Design, and the draft's own US3.6 shows the pattern (the audit
action vocabulary is fixed here, the error vocabulary is not).

**Recommended resolution, and I think this is the most important thing in this
contribution:** add a short **"Error codes under test"** subsection to
`stories.md`, immediately after the Conventions block, that states:

1. Every criterion in this set that refers to an error code refers to a code
   from a single, named error vocabulary.
2. The vocabulary is fixed by Domain Design, and **the names are bound into
   this document before Code Generation begins** — because the affirmed
   testing posture requires every new test to assert on `err.code` (NFR6.6),
   and a criterion naming an unbound code cannot be tested.
3. Every criterion that says "the X error code" is replaced, at binding time,
   with the literal code string.

This keeps the stories free of a mechanism they do not own while making the
binding step explicit and unavoidable. Without it, Code Generation inherits a
set of criteria that say "the code" and has to guess.

For the record, the existing vocabulary in `src/` is `VALIDATION_ERROR`,
`DUPLICATE_ASSET`, `NOT_FOUND`, `INVALID_TRANSITION`, `INVALID_STATE`; the MVP
adds a retryable code and a delete-refusal code. I do **not** recommend
binding those names here — `INVALID_STATE` is currently unmapped in the error
middleware, and the mapping is Domain Design's to settle.

---

### Finding 8 — `AC3.6.5` is not a criterion; it is a restatement

`AC3.6.5` reads: *"Given an entry whose description names only its action,
then that entry is not sufficient and the write path that produced it has not
met this story."*

This has no observable subject. "Is not sufficient" and "has not met this
story" are judgements, not assertions. The criterion that does the work is
`AC3.6.4`, which enumerates what each of the seven descriptions must name.

**Proposed rewrite**, which turns the negative into a testable positive:

> **AC3.6.5** — Given an audit entry is written, then its description is
> non-empty and names at least one specific of its event beyond the action
> name — an entry whose description equals its action alone is a failure.

`AC3.6.4` and `AC3.6.5` together then assert what FR2.8 asserts: no entry's
description names only its action.

---

### Finding 9 — `AC3.3.5` asserts on internal structure and `AC3.3.1`/`AC3.3.2` are tautologies

`AC3.3.5` reads: *"Given the vocabulary is rendered in a screen or a dialog,
then it is supplied to that surface as data rather than copied into it, so
there is exactly one list in the system."*

"Supplied to that surface as data rather than copied into it" is an internal
structure assertion. A test can observe *that* the vocabulary is used, and can
observe *that there is exactly one list* by reading the source — but it cannot
observe the mechanism of delivery from the outside.

C9 and the affirmed team practices make the same point as a **coding rule**:
*"A vocabulary a template renders shall be supplied to the template as render
data rather than copied into the template."* That is exactly what C9 is for.
Repeating it as an acceptance criterion creates a criterion with no
observable outcome.

**Proposed rewrite:**

> **AC3.3.5** — Given the loss-reason vocabulary is offered for selection on a
> screen or in a dialog, then the options offered are exactly the vocabulary's
> values, and no reason outside the vocabulary is offered. *(The single-source
> delivery rule — the vocabulary is supplied to the template as render data
> rather than copied into it — is the C9 coding rule and is verified by
> inspection, not by a product criterion.)*

This is observable: render the dialog, extract the option values, compare with
the vocabulary. It also catches the real defect C9 exists to prevent — a
stale copy in a template — which the current wording does not.

Separately, `AC3.3.1` and `AC3.3.2` (*"every reason offered is drawn from that
one list"*) are tautological as drafted, and they are the same tautology as
`AC3.3.5`. Three criteria that say the same thing is a sign the story is
trying to assert a property it cannot observe. My proposed `AC3.3.5` above
covers the observable version of all three; `AC3.3.1`/`AC3.3.2` could then be
merged into it, or restated as *"the loss-reason vocabulary is a single list,
and the reasons offered for a loss and the reasons offered for a recovery are
the same list"* — which is now a single observable claim about the two
surfaces.

---

### Finding 10 — `AC5.1.8` asserts on an implementation strategy and on memory behaviour that no test can observe

`AC5.1.8` reads: *"Given the counting path, then it issues a database query and
returns an aggregate — the application does not load the full asset set into
memory in order to count it, and the returned row count stays constant as the
number of assets grows."*

Three claims, and the middle one is the interesting one. The third — "the
returned row count stays constant as the number of assets grows" — is
observable and is the right test: seed 10 assets, then 1,000, and assert the
counting query's returned row count is the same in both cases. That is
exactly NFR5.2's pass/fail and it is a good criterion.

The middle one — "the application does not load the full asset set into memory"
— is not observable from outside without instrumenting the process, which is
beyond the current test tooling (Vitest + supertest, no profiling harness).

**Proposed rewrite:**

> **AC5.1.8** — Given the counting path, then it returns an aggregate rather
> than the asset rows, and the number of rows the counting query returns is
> the same for a dataset of ten assets as for a dataset of a thousand.
> *(The application-side memory profile of the counting path is NFR5.2's
> second half and is verified by inspection; the returned-row-count property is
> the observable half and is asserted here.)*

---

### Finding 11 — the count criteria have no named seed, and the counts cannot be reconciled without one

This is the "are the story set's test data needs visible" question, and the
answer is **no** — and it matters more than any single wording defect above,
because the four count-consuming surfaces are the release's indivisible group
and the shared counting definition is INV-3.

`AC5.1.1` asserts that the four surfaces report the same count for the same
filter. `AC5.1.3` asserts the five buckets sum to the total. `AC5.2.3` asserts
the reconciliation on *"a seeded dataset with assets in every bucket"*. `AC5.3.3`
asserts the chips sum to the total. Every one of these needs a **specific,
named seed**, and the draft does not supply one.

The failure mode this creates is concrete: a test author seeds 10 assets, one
per bucket, and every count reconciles trivially. A test author seeds 3
assets in `in-stock` with no holder, 2 `assigned` to Dana, 1 `returned` to
Dana, 1 `lost` previously held by Dana, 1 `discarded` previously held by Chris
— and the reconciliation becomes a real test, because the display-holder rule
(FR5.1) attributes the `lost` and `discarded` assets to their *previous*
holders, not to "Unassigned". The second seed is the one that catches the
defect the whole counting group exists to prevent.

**Recommended addition** — a **"Test data and seeds"** subsection of
`stories.md`, placed after the group map, that names the seeds the count
criteria are verified against. I propose one canonical reconciliation seed,
stated by properties so it survives a change of asset names:

> **The reconciliation seed.** A dataset of eight assets: two `in-stock` with
> no holder; two `assigned` to Dana Reyes; one `returned` to Dana Reyes; one
> `lost` whose current holder is null and whose preserved previous holder is
> Dana Reyes; one `lost` never held by anybody; one `discarded` whose current
> holder is null and whose preserved previous holder is Chris Patel; and one
> `discarded` never held by anybody.
>
> Against this seed: Total Records is 8; Active Inventory is 6; the
> `discarded` bucket is 2; the sum of the five bucket counts is 8; the
> directory renders three holder rows — Dana Reyes, Chris Patel and
> "Unassigned" — plus the "Unassigned" row, so the count line reads 2 distinct
> display holders and the rendered row count is 3; Dana's row carries 3 assets
> (2 assigned + 1 returned); Chris's row carries 1 asset; and the CSV export
> for the unfiltered list produces 8 data rows.

Wait — I need to be careful here and state the arithmetic correctly, because
this is exactly the arithmetic that the rough-mockups stage caught going wrong
in the dashboard frame. Let me redo it:

> **The reconciliation seed.** A dataset of eight assets:
> - 2 × `in-stock`, no holder ever
> - 2 × `assigned`, current holder Dana Reyes
> - 1 × `returned`, current holder null, preserved previous holder Dana Reyes
> - 1 × `lost`, current holder null, preserved previous holder Dana Reyes
> - 1 × `lost`, never held
> - 1 × `discarded`, current holder null, preserved previous holder Chris Patel
>
> Against this seed: **Total Records = 8**; **Active Inventory = 7** (every
> bucket except `discarded`); the five bucket counts are 2 / 2 / 1 / 2 / 1 =
> 8; the `discarded` bucket is 1; the "available to assign" count is the
> `in-stock` count = 2; the directory renders **two** holder rows — Dana Reyes
> and "Unassigned" — plus Chris Patel's row, i.e. **three** rows, and the count
> line reads **2** distinct display holders (Dana Reyes and Chris Patel);
> Dana's row carries 4 assets (2 assigned + 1 returned + 1 lost, attributed by
> preserved previous holder); Chris's row carries 1 asset (the discarded one,
> attributed by preserved previous holder); the "Unassigned" row carries 3
> assets (2 in-stock + 1 never-held lost); and the CSV export for the
> unfiltered list produces 8 data rows.

I have verified this arithmetic twice against the display-holder rule
(FR5.1: current holder, else preserved previous holder, else no holder) and
against FR5.2 ("Unassigned" is reserved for assets that have **never** been
held). Note that the never-held `lost` asset is "Unassigned" even though it is
lost — FR5.2 says the designation is reserved for never-held assets, and
FR3.6 says a loss of a never-held asset clears both holder fields.

I am not asking the Product Manager to adopt this exact seed — it is one
proposal among several, and the seed's *properties* are what matter. I am
asking for **a named seed with stated properties and stated expected counts**,
because without it the reconciliation criteria are assertions about arithmetic
that no test author can execute.

I would also recommend that `AC5.2.3` and `AC5.1.3` cite the seed by name
rather than saying "a seeded dataset", so the criterion and the fixture are
linked.

---

### Finding 12 — `AC6.2.1` describes an interaction that the architecture cannot deliver

`AC6.2.1` reads: *"Given I enter a serial or key that collides with an existing
asset in the same category, then an inline warning appears without the form
being submitted."*

FR10.4 says the same, so the draft is faithful. But the application is
server-rendered with **no client-side rendering** — the affirmed practice and
the rough-mockups stage both record this. There is no inline warning to
appear while typing unless the release adds a client-side mechanism, and the
approved set names none.

This is a real contradiction in the upstream material, and it is not mine to
resolve — the Product Manager owns it. But it must be surfaced, because as
drafted **no test can be written against `AC6.2.1`**.

**Three options, and I recommend the second:**

- **(a)** The release adds a client-side check endpoint. This is new
  capability the approved set does not name, and it changes the deployment
  surface.
- **(b)** The warning is produced by a **server round-trip** — the form's
  serial field submits, or a server-rendered duplicate-check view re-renders
  the form with the warning — and the criterion is rewritten to describe that.
  This preserves "the user is told before the asset is created", which is the
  actual user value in the workbook, without new capability.
- **(c)** The criterion is restated as the observable outcome it protects: *"no
  asset row is created until the collision is resolved"* — i.e. it folds into
  `AC6.3.1`.

Option (b) with a rewording is the honest one. **Proposed wording under
(b):**

> **AC6.2.1** — Given I enter a serial or key that collides with an existing
> asset in the same category, then the collision is surfaced to me before the
> asset is created — the response identifies the colliding serial as such and
> no asset row is written.

And, to keep the criterion honest about the mechanism, add to the story's
`Negotiable` note: *"the technique by which the pre-submission warning is
produced is not prescribed; the release adds no client-side rendering, so the
warning is produced by the server."*

I also note that `AC6.2.2` and `AC6.2.3` are testable as written, provided
the same mechanism is used — "no warning appears" becomes "the response
carries no collision warning".

---

### Finding 13 — `AC6.3.3` ("exactly two next steps") is a content assertion, not a behaviour

`AC6.3.3` reads: *"Given the refusal, then it offers exactly two next steps —
open the existing asset, or change the serial or key — and offers no override
such as a 'create anyway' option."*

This is countable — the response offers two affordances and no override — and
`AC6.3.2` names and links the existing asset. Both are testable at the HTTP
and view layers. I raise this only to note that **"exactly two" is brittle**:
the criterion will fail a correct implementation that adds a third helpful
affordance, and it asserts on the *number* of options where the requirement's
intent is *"no override is offered"*.

**Proposed rewrite**, which is what FR10.5's own pass/fail actually says:

> **AC6.3.3** — Given the refusal, then it offers a way to open the existing
> asset and a way to change the serial or key, and it offers **no** override
> that would create the asset despite the collision — no "create anyway" option
> and no equivalent.

The "exactly two" constraint is not the requirement's substance, and dropping
it removes a brittleness without weakening the guarantee.

---

### Finding 14 — the deferred set needs an explicit negative assertion, or a test will assert the wrong absence

The question the brief asks: do the deferred items (US8.x) need to be excluded
explicitly from any test?

**Yes, in exactly one place, and it is a real hazard.** `AC3.1.2` asserts that
each of the eight released edges is refused *"from each of the four other
statuses"* with the invalid-transition code. `AC3.1.3` asserts that a
transition *"that is not one of the eight released edges"* is refused.

US8.4 and US8.5 are `in-stock` → `discarded` and `returned` → `discarded`.
Both are **approved edges that remain approved** and are merely deferred. A
test author reading `AC3.1.3` without the Won't Have table could reasonably
write *"the `in-stock` → `discarded` edge is refused"* and *"the
`returned` → `discarded` edge is refused"*. Those two tests are **correct for
this release** and would be **wrong as a statement of the transition table**.

The risk is not in this release — it is that the tests, written this way,
become the next increment's defect, because a later increment that implements
the edge must first *delete* two passing tests rather than change them, and a
developer who does not read the Won't Have table will conclude the approved
design changed.

**Proposed addition** to `AC3.1.3`:

> **AC3.1.3** — Given a transition that is not one of the eight released
> edges, when it is attempted, then it is refused with the invalid-transition
> error code and no audit entry is appended. *(The two approved-but-deferred
> edges — `in-stock` → `discarded` and `returned` → `discarded`, recorded as
> US8.4 and US8.5 — are refused in this release for this reason and not
> because the edge is withdrawn; a test asserting their refusal states the
> release boundary, not the design.)*

And a second addition to `AC3.1.2`, so the enumeration is not misread as
"these edges do not exist":

> **AC3.1.2** — Given each of the eight released edges, when the transition is
> attempted from each of the four other statuses, then it is refused with the
> invalid-transition error code and no audit entry is appended. *(A refusal
> from a status that the deferred edges name — `in-stock` or `returned` to
> `discarded` — is a release-boundary refusal, not a statement that the edge
> is withdrawn.)*

I recommend the Product Manager also add a line to the Won't Have table
naming the test consequence, so the two places that would otherwise conflict
are linked:

> | **US8.4** | ... | Named follow-on item; the trigger is the release's transition-table coverage, not a rejection. *Test consequence: in this release the edge is refused with the invalid-transition code (AC3.1.3), and that refusal states the release boundary, not the design.* |

The same treatment applies to US8.9 (pagination) and US8.10 (empty states) in
a lighter form. `AC5.4.2` asserts the list renders *"without degradation that
would require pagination"* — good, and it is the right way to state a
deferral's trigger as a positive assertion. But US8.10's empty states are
**not** asserted anywhere, and that is correct: there is no criterion that
says "an empty list renders no empty-state illustration", and there should not
be one. The point worth recording is that **no criterion in the set asserts
the absence of a deferred capability**, which is the safe arrangement — a
deferred capability that is never mentioned in a criterion cannot be
accidentally asserted against. Only the two transition edges are the exception,
because `AC3.1.3` legitimately enumerates what is refused, and the enumeration
necessarily includes them.

---

### Finding 15 — `AC4.2.1`, `AC4.2.2` and `AC4.2.4` do not say *what* the database does

`AC4.2.1` reads: *"Given an asset with a history, when an `UPDATE` is
attempted against the audit table, then the database refuses it."*

`AC4.2.2` reads: *"Given an asset with a history, when a `DELETE` is attempted
against the audit table, then the database refuses it."*

"Refuses it" is fine, but the *observable* is a raised database error, and a
test can assert on `err.code` only if the code is named. The same error-code
binding issue as Finding 7 applies. FR2.7's pass/fail says *"raises a database
error"* — the requirement does not fix the code either.

This is not a new problem, and it is the same remedy as Finding 7: bind the
error vocabulary once, before Code Generation.

`AC4.2.4` is well-formed — *"the refusal carries a clear, machine-readable
error code that is distinguishable from a validation error and from an
internal error"* — and it is exactly the shape I recommend for the rest. It
is also the criterion that makes `AC4.2.1`/`AC4.2.2` testable once the code
is bound.

I want to draw attention to one thing here, because it is easy to miss:
`AC4.2.4` says the delete refusal is *"distinguishable from a validation error
and from an internal error"*. The team's code practices record that
`INVALID_STATE` is **currently not mapped** in the error middleware
(`src/app.js:20`), so it falls through to a 500. A delete refusal that surfaces
as a 500 would *not* be distinguishable from an internal error — and a test
asserting `AC4.2.4` would catch it. That is the criterion doing exactly its
job, and it is the strongest argument for keeping it as written.

---

### Finding 16 — `AC1.1.2` is missing the empty-field cases the requirement names

`AC1.1.1` says a registration requires *"a non-empty name and a non-empty
serial or key"*, but `AC1.1.2` covers only the bad *category*. FR1.1's
pass/fail requires the asset to be accepted *"with or without model and
notes"*, and FR1.2 covers the category.

Nothing in the story set says what happens when the name is empty or the
serial is empty. `AC1.1.1` says the submission is valid in that case; the
inverse is not stated anywhere.

**Proposed addition** to `US1.1`:

> **AC1.1.6** — Given a registration whose name is empty or whose serial or key
> is empty, or whose name or serial or key is only whitespace, then the
> registration is refused with the validation error code and no asset row and
> no audit entry is written.

This is a small addition and it closes a real gap — the requirement FR1.1
names the fields as non-empty, and the draft states that as a precondition of
the happy path without ever stating the sad path.

---

### Finding 17 — `AC3.4.4` bundles four assertions, one of which is a different test layer

`AC3.4.4` reads: *"Given a discarded asset, then it appears in the `discarded`
bucket count and in the total record count, does not appear in the active
inventory count, and its detail URL still returns the asset and its full
history."*

Four claims. Three are counting claims (repository or service layer, or a
view-layer assertion against the rendered dashboard). The fourth — *"its detail
URL still returns the asset and its full history"* — is an HTTP-level claim
about a route.

This is not a defect in the sense of being unobservable; all four are
observable. It is a **test-naming** defect, and it matters against the
affirmed practice that *"every new test carries the identifier of the
requirement it verifies"*. A single criterion bundling a count assertion and
an HTTP assertion will produce either a fat test that asserts four things or
two tests, only one of which can carry the criterion's name.

**Proposed split:**

> **AC3.4.4** — Given a discarded asset, then it appears in the `discarded`
> bucket count and in the total record count, and does not appear in the active
> inventory count.
>
> **AC3.4.7** — Given a discarded asset, then its detail URL returns the asset
> and its full history, unchanged.

I have used `AC3.4.7` rather than renumbering, so the existing criterion IDs
stay stable for anything already written against them.

---

### Finding 18 — the criterion IDs are not carried onto the requirements, so the NFR6.3 traceability is a manual join

NFR6.3 requires: *"Every new test shall carry the identifier of the requirement
it verifies, in its title or its comment."* The team's affirmed practice
extends the same convention to the MVP's requirement set, and the existing
suite already carries `FR` / `NFR` markers in `it(...)` titles.

The draft's `stories.md` does not state, anywhere, which **requirement
identifier** each acceptance criterion serves. The `traceability.json` file
carries the mapping at *story* granularity — `FR3.6` → `US3.2` — which is
correct but insufficient for naming a test. A test author needs
`FR3.6 → AC3.2.3`, not `FR3.6 → US3.2`.

**Recommended addition** — a short mapping block, either in `stories.md` as
a table or in `traceability.json` as a criterion-level array:

> | Requirement | Acceptance criteria | Verifying test name |
> |---|---|---|
> | FR3.6 | AC3.2.3, AC3.2.4, AC3.2.5 | `mark-lost records the departing current holder (FR3.6)` |
> | FR3.7 | AC3.5.1, AC3.5.2 | `recovery records a distinct recovered action (FR3.7)` |
> | FR6.1 | AC5.1.1 | `the four surfaces report the same count for the same filter (FR6.1)` |
> | FR9.7 | AC5.5.7 | `every string cell is escaped against formula injection (FR9.7)` |

I am not proposing the whole table — the Product Manager has the traceability
file and can generate it. I am proposing that the **criterion-level** link be
recorded, because criterion-level is the granularity at which a test is
named.

I would also recommend the Product Manager consider whether the criterion ID
itself should carry the requirement ID — e.g. `AC3.2.3 (FR3.6)` — which would
make the join impossible to get wrong and would let the test title be derived
mechanically from the criterion ID.

---

### Finding 19 — the accessibility story has no criterion for the two error/edge cases the phase guardrail requires

The inception phase guardrail states: *"Test files must cover the happy path
and at least two error/edge cases."* US7.2 has ten criteria, all of which are
positive property assertions on a screen. There is no criterion for the
**failure** cases:

- A screen rendered with an **error** — the error is associated with its
  field (`AC7.2.4` covers this, good), and the error is not colour-only
  (`AC7.2.1` covers this by universality).
- A screen rendered with a **modal open** — `AC7.2.3` says focus is *"never
  trapped outside a modal"*, which is a compound statement about two
  different things: focus must be **inside** the modal while it is open, and
  must not be **trapped** in it when it closes. Neither half is asserted.

**Proposed rewrite** to `AC7.2.3`:

> **AC7.2.3** — Given any released screen, then focus is visible wherever it
> rests; while a modal is open, focus is inside the modal and cannot be moved
> out of it; and when the modal closes, focus is not left trapped and returns
> to a determinate element outside it.

This splits a compound statement into three observable claims, and the third
one — focus not trapped after close — is the failure case the guardrail asks
for.

---

### Finding 20 — `AC5.3.5` is a negative assertion with no observable subject

`AC5.3.5` reads: *"Given the directory, then it provides no holder detail page
and presents holder names as display names — it does not treat a name as a
person account."*

FR8.4 requires the same, so this is inherited. The first half is testable: no
route responds to a holder-detail URL, and a holder name is rendered as plain
text. The second half — *"it does not treat a name as a person account"* — is
a statement of intent with no observable outcome.

**Proposed rewrite:**

> **AC5.3.5** — Given the directory, then no route responds to a holder-detail
> URL, and each holder name is rendered as plain text with no link, no
> avatar and no account affordance — a holder name is a display name and the
> directory carries no person account.

The second half becomes countable: no `<a>` wraps a holder name, no
account-looking element is rendered.

---

### What I checked and found sound

Recording these so the Product Manager knows they were reviewed and did not
need changes:

- **The `AC3.1.1` / `AC3.1.2` / `AC3.1.3` triple is well-formed.** Eight
  edges × five statuses is a complete enumeration of the transition table, and
  it maps exactly onto FR3.2's pass/fail. This is the kind of exhaustive
  enumeration that makes a test author productive rather than confused.
- **The error-code discipline is right in substance.** Every error assertion in
  the set asserts on a *code*, and never on message prose — matching NFR6.6
  and the team's `err.code` contract. My Finding 6 is about *how* the code is
  detected being asserted, not about the code being asserted.
- **`AC1.2.1` is exactly right.** Case-folding, whitespace trimming and
  category scoping in one criterion, with `AC1.2.2` and `AC1.2.3` covering
  the cross-category case and the preserved-casing case. This is the criterion
  the test-first exception exists for, and it is specific enough to write
  before the code.
- **`AC7.1.2` is well-formed and mechanism-free.** *"The supplied value is
  neither persisted nor logged — it is ignored, not rejected"* is precisely
  the distinction the actor-trust rule turns on, and it is observable at the
  HTTP layer without knowing the mechanism. This is the best criterion in the
  set for the open-decision constraint.
- **`AC7.1.5` covers the mid-write failure** that eleven other criteria leave
  open (my Finding 5). It should be surfaced as the cross-cutting rule it is,
  which is what my proposed `AC7.1.6` does.
- **`AC3.6.1` and `AC3.6.2` are clean.** Seven values, no others, and the four
  pre-existing values not renamed — exactly FR3.12's pass/fail.
- **`AC5.5.2` and `AC5.5.3` are precise to the byte.** An exact filename, an
  exact content type, and an exact header row with the column count and the
  exclusion of notes and history. These are directly assertable and will
  produce tests that cannot pass vacuously.
- **`AC4.2.5` is the right shape for the append-only invariant.** It asserts
  count, non-empty actor and unchanged pre-existing entries together, which
  is precisely the assertion the `code-quality-assessment` gap table says is
  missing from the suite today.
- **The personas file carries no testability problem.** My scope excludes
  persona fidelity, and I note only the one fact a test author needs from it:
  Priya is the only writer, so a route-level test for the actor-trust rule
  exercises a write Priya performs. Nothing in `personas.md` constrains a
  test.

---

### A note on what I did **not** raise

I did not raise the actor-identity mechanism as a defect. The draft states the
rule and names no mechanism, and `AC7.1.2`/`AC7.1.3` are mechanism-free, which
is exactly right given Q7's recorded answer. The one place I did flag
mechanism-dependence is `AC6.2.1` (Finding 12), and there the dependence is on
*client-side rendering*, not on the actor mechanism — a different and more
tractable problem.

I also did not raise the requirements' own gaps. Where a defect originates
upstream — `AC5.4.2`'s unfixed ceiling (Finding 1), `AC7.2.7`'s "adequate"
(Finding 2), `AC6.2.1`'s inline warning (Finding 12) — I have said so
explicitly, because a criterion that inherits an unresolvable requirement is
still an unresolvable criterion, and the story set is where it becomes visible
to the test author.

---

## Positions

- AGREE: The acceptance-criterion ID scheme (`AC{group}.{story}.{criterion}`)
  and the exhaustive-enumeration style of US3.1 — criterion IDs are stable
  enough to name a test after, and the eight-edges-by-five-statuses enumeration
  is complete and directly assertable.
- AGREE: The actor-trust rule is stated once in US7.1 and asserted per write
  story, with no mechanism named anywhere — `AC7.1.2` is the strongest
  criterion in the set for the open-decision constraint, and Q7's recorded
  answer forecloses reopening it.
- AGREE: The US8.x Won't Have table preserves each deferred capability's
  approved standing, and the deferral/exclusion distinction is stated once and
  correctly — the table needs a test-consequence note, not a rewrite.
- AGREE: The criterion set asserts on error *codes* throughout and never on
  message prose, matching NFR6.6 and the team's `err.code` contract — this is
  the right discipline and it must be preserved through the binding step.
- AGREE: `personas.md` imposes no constraint on a test author — Priya being
  the sole writer is a fact the route-level actor-trust test can rely on, and
  nothing in the personas file blocks a test.
- OBJECT: `AC5.4.2` and `AC5.5.8` assert against performance ceilings that
  OQ5 records as unfixed and the Product Owner has not approved — two
  criteria today have no pass condition and no writable test.
- OBJECT: `AC7.2.7`'s "target size and contrast are adequate" and `AC7.2.9`'s
  "carries a per-screen accessibility note" name no measurable threshold and,
  for the note, a carrier that is not the application — both are unassertable
  as drafted.
- OBJECT: The eleven "exactly one audit entry" criteria do not say what
  happens when the write fails midway; only `AC7.1.5` covers it, and a test
  author working from a single story will not find it.
- OBJECT: Every error assertion refers to "the X error code" without ever
  naming one, so no criterion can be tested under the affirmed `err.code`
  assertion discipline until the error vocabulary is bound — the story set
  must state that binding as an explicit, named prerequisite.
- OBJECT: `AC3.3.5`, `AC5.1.8` and `AC1.2.7` assert on internal structure or
  implementation technique rather than on an observable outcome, and `AC3.6.5`
  and `AC3.3.1`/`AC3.3.2` are judgements rather than criteria.
- OBJECT: The count criteria reference "a seeded dataset" with no named seed
  and no stated expected counts, so the release's indivisible group and INV-3
  cannot be reconciled by any test author without inventing the fixture.
- OBJECT: `AC6.2.1` describes an inline warning that the server-rendered,
  client-render-free architecture cannot deliver — it needs the Product
  Manager's decision on the mechanism, and the criterion needs rewording to
  the observable outcome.
- OBJECT: `US8.4` and `US8.5`'s two approved-but-deferred edges will be
  asserted as refused by `AC3.1.3` unless the criterion states that such a
  refusal is a release-boundary statement rather than a design one.
