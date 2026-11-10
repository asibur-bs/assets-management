**Collaborator:** aidlc-design-agent

## Contribution

Reviewed `stories.md` and `personas.md` from the UX and persona-fidelity
perspective, against `wireframes.md` (W1–W8), `user-flow.md` (F1–F6, F5a–F5h),
`requirements.md` (FR1–FR11, NFR1–NFR6), `scope-document.md`, the intent
statement and the stakeholder map. The draft is disciplined, the MoSCoW
priorities are sound, and the deferred set is recorded with its standing
intact. The findings below are additions and corrections, not restatements.

### 1. The headline finding: the stories describe state, not interaction

Every Must-Have story's acceptance criteria assert **what the database
holds**. Not one asserts **what the user sees**. There is no criterion
anywhere in the draft that states:

- the post-transition feedback (the status chip changing and a new history
  entry appearing at the top of W3's History panel);
- the *content* of the reason dialog's consequence paragraph — the one piece of
  W7/W8a/W8b that exists to tell the administrator what the transition does
  before asking for the reason;
- the error message a user reads when a write is refused (the draft says
  "refused with the validation error code" — a code, which per the UX guide's
  ninth heuristic must never be what a user sees);
- the status **display label** vocabulary (`In stock`, `Assigned`, `Returned`,
  `Lost`, `Discarded`) that the wireframes fix across four surfaces;
- the fact that the two holder values are shown separately and neither falls
  back to the other.

A designer handed this story set can build the database, the routes and the
audit trail, and cannot build W7's consequence paragraph, W8a's "your record
and history are kept" note, the post-transition state of W3, or the error
block on W4. Those are precisely the parts of W3/W4/W7/W8a/W8b that carry the
release's user-facing meaning. This is the stage's own responsibility — the
wireframes deliberately did not specify copy, but the *decision about what
copy says* is a product decision, and it is currently unstated.

The findings below supply the specific additions.

### 2. Persona fidelity

**2.1 Priya is faithful. AGREE.** Her three pain points map one-to-one onto the
upstream integrity defects (loss destroys the prior holder; return overwrites
history; the audit trail is destroyed on deletion) plus the counting
inconsistency and the case-sensitivity gap, and her goal "Retire or lose an
asset with the reason captured at the same moment" is the release's reason
requirement stated in her own words. Her context — two categories, a serial
meaning something different in each, no notion of roles or accounts — is
directly supported by FR1.2, A2, A4 and FR5.3.

**2.2 Marcus has one expectation the release does not keep, and two gaps.**
`personas.md` says Marcus "Expects to be able to find something by typing a
name or a serial number". Improved search is **deferred** (US8.8), and both
`wireframes.md` and `user-flow.md` state that the release keeps the POC's
existing search control as-is. As written the persona sets a promise the
release does not keep, which will read to a stakeholder as a broken
expectation rather than as a deferred item. Recommend rewording to: *"Finds
assets with the existing free-text search over name and serial or key. The
improved search form is deferred to a later increment, so search stays
as it is."*

Two goals are missing and they are the release's two most important answers to
the questions Marcus actually asks:

- **The last holder.** His goal "find out what happened to an asset that has
  moved between people" is answered by the current/last-holder distinction —
  the release's central mechanism — and his persona never mentions it. Without
  it, "who had it before" reads as a history-panel question rather than as the
  `last_assigned_to` field that is visible on every surface he reads. Recommend
  adding to his goals: *"See the asset's current holder and the colleague who
  last held it as two separate facts, so a lost or returned asset stays
  attributable to the person who had it."*
- **The `returned` resting state.** The stakeholder map records that the end
  user holding an asset "gets a distinct `returned` resting state in the model
  and in the workbook amendment, so an asset that is with its holder is not
  conflated with one that is on the shelf" (§21.1 Scenario 3). Marcus reads
  statuses on the list, the detail screen and the directory, and the `Returned`
  bucket appears on all three. His persona should carry it, otherwise the
  relabelled fourth bucket has no audience in the persona set that is supposed
  to justify it.

**2.3 The stakeholder set is incomplete in `personas.md`.** The intent's
stakeholder map names **four** groups: asset administrators, the finance
function, IT leadership, and the end user holding the asset. `personas.md`
covers the administrators and the end user, and its "Who is deliberately *not*
a persona" section names the product owner and the auditor — but says nothing
about finance or IT leadership. Two of the release's hardest requirements
exist specifically to serve them: FR3.10's **mandatory discard reason** exists
so the finance function can defend a write-off, and the Audit Completeness
measure exists so IT leadership has a single checkable claim. Both are
currently attributed to nobody.

Finance and IT leadership are stakeholders, not users — they do not operate
the application — so they should not become personas. But they should be
recorded, because a reader of `personas.md` today would not know why a
discard reason is mandatory. Recommend adding a short "Stakeholders who are
not personas" paragraph covering the finance function (needs defensible
write-offs — the reason a discard reason is mandatory) and IT leadership
(needs a demonstrable, checkable claim — Audit Completeness), consistent with
how the product owner is already handled.

**2.4 The two-writers problem, and why it reaches the `Acting as` indicator.**
`personas.md` says Priya "works on the operations side of the organisation, one
person, occasionally with a colleague covering the desk." That detail is not
sourced, and it matters more than it looks. If a second person ever writes,
the read-only `Acting as` indicator shows one resolved identity while the
colleague's writes carry that same identity — technically server-resolved, and
therefore compliant with the actor-trust rule as written, but it tells the
reader of the history the wrong thing. The actor-trust rule protects against a
*forged* actor; it does not by itself prevent a *misattributed* one when two
people share a configured identity.

This is the honest reason the `Acting as` indicator needs a criterion the
draft lacks (see §6). The persona file should either drop the "colleague
covering the desk" detail or carry it forward as an explicit condition the
chosen actor mechanism must satisfy. As it stands, the persona asserts a
two-writer reality the actor story cannot yet honour.

### 3. Interaction patterns: what is missing, and what is inconsistent

**3.1 No story covers the Actions panel.** `wireframes.md` states the rule for
W3's action panel: *"the panel shows the actions of the status its own Status
chip displays, and no others"* — and it says this explicitly so that a
developer does not add an Assign control to an already-assigned asset, because
there is no `assigned → assigned` edge and the service would reject it.
`user-flow.md` F5a carries the same eight-edge table.

US3.1 enumerates which edges are *legal*, and AC3.1.2/AC3.1.3 assert that an
illegal transition is refused. But no story says the screen must **not offer**
an illegal transition. Those are different obligations: a service that refuses
an illegal transition is correct while the screen that offered it is wrong. A
designer reading the draft would have to infer "only show what is legal" from
the edge table, and would plausibly add a Re-assign control to an `assigned`
asset or a Mark lost control to a `discarded` one.

Proposed addition to US3.1:

> **AC3.1.7** — Given an asset's current status, then the detail screen's
> action controls are exactly those released edges whose origin is that status
> — the screen offers no control for an edge whose origin is a different
> status, and a `discarded` asset offers no lifecycle control at all.
>
> **AC3.1.8** — Given the status of an asset is displayed on any surface, then
> it is displayed with the shared display label for that status — `In stock`,
> `Assigned`, `Returned`, `Lost`, `Discarded` — and never with the stored value
> `in-stock`, `assigned`, `returned`, `lost` or `discarded`. The same mapping
> is used by the asset list's status chips, the asset list's status filter
> options, the detail screen's status chip, and the directory's per-holder
> chips.

AC3.1.8 matters because the wireframes fix this mapping across **four**
surfaces precisely so a reader cannot see `returned` on one screen and
`Returned` on another, and because the `Returned` label is the §21.1 Scenario 3
amendment. The draft carries the *audit action* vocabulary (US3.6) but not the
*display label* vocabulary — two different vocabularies, and only one is
specified.

**3.2 The reason dialog has no story.** This is the largest single gap.
`wireframes.md` W7 fixes a dialog contract, and `user-flow.md` F5c states it
once for every reason-bearing transition: the consequence paragraph is
rendered from the asset's current status; the reason control stays enabled;
submitting with no reason shows `A reason is required.` with focus moved to it
and nothing written; `Escape`, Cancel and the close control each dismiss
without acting; focus returns to the trigger. W7 draws **two** consequence
variants (`assigned` and `in-stock`) precisely because the `in-stock` case is
the one the release adds, and W8a/W8b carry their own consequences.

US3.3 specifies only the *vocabulary* the control is populated from. Nothing
in the story set says the dialog explains the consequence before it asks for
the reason, and nothing says the dialog's dismissal behaviour. The
user-visible consequences that are therefore unowned:

- W8a's paragraph — "Discarding it resolves the assignment… The asset leaves
  Active Inventory, but its row and full history are kept and stay here." This
  is the text that stops "discard" reading as "delete", and it is the release's
  append-only guarantee speaking to the user.
- W8b's paragraph — "Recovering it returns it to stock and records the
  recovery as its own event, naming Dana Reyes", plus the fact that the
  recovery dialog offers **no holder field**, because recovery ends the loss
  and does not hand the asset to somebody.
- The `in-stock` loss variant — "there is no holder to keep" — which is the
  copy for the case the release adds.

Proposed new story, placed after US3.6 so the two vocabulary stories stay
adjacent:

> ### US3.7 — The reason dialog explains the transition before it asks
>
> As an **asset administrator**, I want the dialog that asks for a reason to
> tell me what the transition will do before I give the reason, so that the
> reason I record is attached to the right event.
>
> **Acceptance criteria**
>
> - **AC3.7.1** — Given a transition that requires a reason, then it opens a
>   dialog whose heading names the transition and the asset, and whose body
>   states the consequence of the transition before the reason control.
> - **AC3.7.2** — Given the asset's current status, then the consequence
>   sentence is rendered from that status: a loss from `assigned` states that
>   the assignment ends and that the holder is kept as the last holder; a loss
>   from `in-stock` states that the asset has never been assigned and that
>   there is no holder to keep.
> - **AC3.7.3** — Given the discard dialog, then its consequence states that
>   the assignment is resolved — the holder cleared and kept as the last
>   holder — and that the asset leaves Active Inventory while its row and
>   full history are kept and remain reachable.
> - **AC3.7.4** — Given the recovery dialog, then its consequence states that
>   the asset returns to stock and that the recovery is recorded as its own
>   event naming the prior holder, and the dialog offers no holder field.
> - **AC3.7.5** — Given the reason control, then it is a single-choice control
>   populated from the shared vocabulary, showing a placeholder until a reason
>   is chosen.
> - **AC3.7.6** — Given the dialog is open, then the submit control is enabled
>   and submitting with no reason chosen shows `A reason is required.` beneath
>   the reason control, moves focus to it, and writes nothing — no status
>   change, no holder change and no history entry.
> - **AC3.7.7** — Given the dialog is open, then `Escape`, the cancel control
>   and the close control each dismiss it without acting, and focus returns to
>   the control that opened it.
> - **AC3.7.8** — Given the dialog is open, then the focus order stays inside
>   it and the consequence sentence is read before the reason control.
> - **AC3.7.9** — Given the submit control, then it is labelled with the
>   transition's own verb — `Mark lost`, `Discard asset`, `Recover asset` —
>   and never with a generic `Confirm`.

**3.3 The two holder values are not specified on the surfaces that show
them.** `wireframes.md` states the rule that matters: the asset list, the
detail screen, the directory's expansion and the CSV export's column set all
show the current holder and the preserved last holder **separately**, and
"neither column ever falls back to the other's value: a lost asset shows an
empty Holder and a populated Last holder, and a currently-held asset shows a
populated Holder and an empty Last holder."

AC5.3.6 states the display-holder rule for the **directory**. AC5.5.3 names
the CSV's two holder columns but not the non-fallback rule. Nothing states it
for the **asset list** or the **detail screen**. The rule is the mechanism by
which a lost asset stays attributable to the person who had it — the release's
central answer — and it is left implicit on two of the four surfaces.

Proposed addition to US5.1 (the shared-definitions story, which already owns
the four-surface guarantee):

> **AC5.1.9** — Given any surface that shows a holder, then it shows the
> current holder and the preserved last holder as two separate values, and
> neither falls back to the other's value: a lost asset shows an empty current
> holder and a populated last holder, and a currently-held asset shows a
> populated current holder and an empty last holder. The asset list's two
> holder columns, the detail screen's two holder fields, the directory's
> expansion rows and the CSV export's two holder columns follow this one rule.

**3.4 The directory's expansion is not specified.** W6 draws each holder row as
a **disclosure** — a button with `aria-expanded` and `aria-controls` naming
the holder, expanding in place to a table of that holder's assets, with a
caption naming the holder. F4 draws three destinations from a holder row: the
in-place expansion, the link to the list filtered to that holder, and the link
to an asset's detail screen.

AC5.3.4 says only "a holder row … links to the asset list filtered to that
holder". The expansion — the primary affordance, drawn as a control rather
than a link — is absent, as is the per-asset link to the detail screen, and
the "currently held" versus "last held" marker on each expanded row.

Proposed additions to US5.3:

> **AC5.3.9** — Given a holder row, then it expands in place to show the
> assets whose display holder is that holder, and the expansion reports its
> own expanded state programmatically rather than by appearance alone.
>
> **AC5.3.10** — Given an expanded holder row, then each asset in it shows
> whether the asset is currently held or last-held by that holder, and each
> asset links to its detail screen.
>
> **AC5.3.11** — Given a holder whose assets are all last-held, then the row's
> bucket chips show only the buckets those assets are actually in — no
> zero-count chip is shown for a bucket the holder has no asset in.

**3.5 The inline duplicate warning's advisory nature is missing.** `user-flow.md`
F1 is emphatic: the inline check is an **advisory signal**, not the write's
verdict; it is **dismissible**; dismissing it leaves the form as typed and the
submit control available; and "a dismissal is therefore not a waiver: an
administrator who dismisses the inline warning and submits still gets the
collision block if the serial is in fact taken." F5h states the same for the
edit path.

AC6.2.1 says only "an inline warning appears without the form being submitted".
A designer could reasonably read the draft as making the inline warning a lock
on the form — which would be a materially different interaction, and one that
would also break the concurrency case the release exists to handle.

Proposed additions to US6.2:

> **AC6.2.4** — Given the inline duplicate warning is showing, then it names
> the colliding asset and offers a link to its detail screen, and dismissing
> it leaves the form as typed and the submit control available — the warning
> is advisory.
> **AC6.2.5** — Given the inline warning was dismissed and the form is then
> submitted with the same colliding serial, then the submit-time refusal of
> US6.3 still applies — a dismissal is not a waiver.

**3.6 No story covers the refused-transition error state.** The wireframes'
screen-state table puts the Error state for W3 (transition refused) **in the
release**. AC2.1.4, AC2.2.3, AC3.4.6 and AC3.5.4 all say a refused transition
is "refused with the invalid-transition error code" — a code, not a message,
and with nothing about what the administrator sees. A refusal is not only a
correctness matter: because W3's action panel is derived from the asset's
current status, a refused transition means the **offered actions have
changed** since the screen was opened, and the administrator has to be told
that and shown the new state.

Proposed addition to US3.1 (covering all families):

> **AC3.1.9** — Given a transition is refused because the asset is no longer in
> a status that allows it, then the detail screen is re-rendered with the
> asset's current status and the action controls that status allows, and the
> refusal is stated in words on the screen — no error code is displayed to the
> user.

**3.7 Nothing says what the user sees when a write fails.** AC7.1.5 asserts
the all-or-nothing property at the database level but says nothing about the
screen. The perceptible consequence is that the screen shows the asset
unchanged and no new history entry — nothing appears to have happened, which
on its own reads as "the button did nothing". Recommend a criterion on US7.1
stating the user-visible outcome of a failed write.

**3.8 The retryable busy condition's user-visible consequence is missing.**
AC1.2.8 asserts the retryable busy code, and `user-flow.md`'s retryable-write
path states the consequence plainly: "the operation is retried; the
administrator is not shown a failure for a transient condition." No story
carries that, so the perceptible behaviour — a write that takes an
indeterminate moment and then succeeds, with no error shown — is unspecified.
This matters because the application has **no loading state** (the wireframes
state this explicitly, because the application is synchronous and
server-rendered), so the administrator sees no feedback at all during the
wait. Recommend a criterion on US1.2 stating that a busy condition is retried
and is never presented to the administrator as a failure.

**3.9 The post-transition feedback is unspecified on every write story.**
`wireframes.md`'s Success state is "the detail screen after a transition,
showing the new status chip and the new history entry at the top", and F5c,
F5d, F5e and F5h each end on a frame showing the new chip and the new entry.
None of the draft's write stories says this.

Proposed additions:

> - **US1.1, AC1.1.6** — Given a registration succeeds, then the asset list
>   shows the new asset and its count line reflects it, and the asset's detail
>   screen shows the status chip `In stock` and a `create` history entry at
>   the top of the history.
> - **US2.1, AC2.1.6** — Given an assignment succeeds, then the detail screen
>   shows the status chip `Assigned`, the `Holder` field naming the assignee,
>   and a new `assign` history entry at the top of the history.
> - **US3.2, AC3.2.7** — Given a mark-lost succeeds, then the detail screen
>   shows the status chip `Lost`, an empty `Holder` field, a `Last holder`
>   field naming the prior holder where one applies, and a new `mark-lost`
>   history entry at the top of the history.
> - **US3.4, AC3.4.7** — Given a discard succeeds, then the detail screen
>   shows the status chip `Discarded`, an empty `Holder` field, a `Last
>   holder` field naming the holder at discard time, and a note stating that
>   the asset is no longer part of Active Inventory while its record and its
>   history are kept.
> - **US3.5, AC3.5.6** — Given a recovery succeeds, then the detail screen
>   shows the status chip `In stock`, a `Last holder` field that still names
>   the prior holder, and a new `recovered` history entry at the top of the
>   history.
> - **US4.3, AC4.3.4** — Given an edit succeeds, then the detail screen shows
>   the new values, a new `edit` history entry at the top of the history, and
>   an unchanged status chip — an edit changes no bucket.

**3.10 The `system` actor's marker is not constrained against colour-only.**
AC4.1.3 requires "a marker distinguishable from an entry attributed to a
person", but says nothing about *how*. The release's own accessibility
commitment (US7.2.1) forbids colour as the only carrier of meaning, and the
wireframes show the `system` actor as a distinct actor rather than a
distinguished one. Recommend adding to US4.1:

> **AC4.1.6** — Given an entry attributed to the `system` actor, then the
> marker distinguishing it from a person-attributed entry is carried by text
> or by a non-colour cue, and not by colour alone.

### 4. Accessibility granularity

**4.1 The per-screen keyboard entry point is unspecified.** The wireframes
record a **specific** keyboard entry point per screen — W1 the `Dashboard` nav
link; W2 the `Search` input; W3 the first action control in the Actions
panel; W4 the `Category` select; W5 the `Category` select; W6 the
`Search holders` input — and each screen's accessibility note names it.
AC7.2.9 requires "a per-screen accessibility note naming its heading level, its
primary landmark regions and its keyboard entry point", which mandates the
*note* but never says **which** entry point each screen has. A designer
cannot build W2's entry point from the story; the story says "some keyboard
entry point". Worse, read literally, AC7.2.9 and AC7.2.8 sit in tension:
AC7.2.8 says the skip link is the first focusable element, and AC7.2.9's note
names an entry point that a reader could take to be first.

Recommend adding to US7.2:

> **AC7.2.11** — Given a released screen, then its keyboard entry point is the
> one recorded for that screen: the `Dashboard` navigation link on the
> dashboard, the search input on the asset list, the first action control on
> the asset detail, the `Category` control on the registration and edit forms,
> and the holder-search input on the directory. The skip link is the first
> focusable element of every screen, ahead of that entry point.
>
> **AC7.2.12** — Given a status chip, then the chip's text is the status name,
> so the chip's meaning does not depend on its colour.
>
> **AC7.2.13** — Given the navigation's current destination, then it is marked
> by weight and underline, and not by colour alone.
>
> **AC7.2.14** — Given the target-size and contrast commitment, then the
> thresholds are those of the Level AA floor in AC7.2.10, and the commitment
> applies to the release's new surfaces — the dashboard tiles, the dialogs and
> the fifth `discarded` status chip — and the application's existing status
> chips are not re-specified.

AC7.2.14's second half matters: FR11.1 scopes the seven commitments to the
new surfaces with "the POC's existing chips not re-specified", and the
wireframes say the same. US7.2 as drafted says "any released screen" without
that scoping, which over-commits relative to the requirement it is meant to
carry. AC7.2.7's "target size and contrast are adequate" is also the one
criterion in US7.2 that names no threshold at all; AC7.2.14 gives it one.

**4.2 US7.2 is otherwise at the right granularity.** It says enough to build
to — one `h1`, headings in order, the three landmarks, `caption` and `scope`
on tables, form errors associated with their field, focus never trapped
outside a modal, status changes announced, a skip link first — and no more
than FR11.1 states. AGREE on that. The per-screen allocation (4.1) is the only
gap.

### 5. The deferred items (US8.x) and their UX consequences

**5.1 US8.9 contradicts the draft's own criteria — this is a correction, not
a preference.** US8.9 is recorded as "**Pagination, result counts, and the
pager**". But the count lines are **in the release**:

- AC5.1.4 — the asset list "reports both how many records are being shown and
  how many records match the applied filter";
- AC5.4.1 — the list "reports both the shown count and the matching count";
- AC5.3.8 — the directory's count line "says what it counts".

Both the wireframes and `user-flow.md` F2 resolve this explicitly and
identically: the deferred item is read as **the pager** — the page controls,
the page-size control and the navigation between pages — and **not** the count
line, because "a shared counting function that is not allowed to be *shown* is
a function nothing can disagree with." The scope document's `## Out of Scope`
lists the item as "Pagination, result counts, and the pager", and the
wireframes narrow it.

As drafted, US8.9 says the count lines are deferred while three acceptance
criteria require them. Recommend correcting the row to:

> | **US8.9** | **Pagination and the pager** — the page controls, the
> page-size control, and the navigation between pages | Approved | Named
> follow-on item; the trigger is the asset count growing beyond the confirmed
> medium scale of hundreds to low thousands of assets. **The count lines are
> in the release**: the asset list's `Showing N of M records` and the
> directory's `Showing N holders` are reads from the shared counting function
> and are required by AC5.1.4, AC5.3.8 and AC5.4.1. |

**5.2 US8.10 (empty states) needs a UX-consequence note, and the release
needs one criterion.** The empty states are deferred, and the release retains
the POC's bare `No assets yet.` row. The wireframes and F2 both warn that the
two cases are different — "No assets yet" is false when the database holds
assets and the filter excludes them — and record that the later increment
should distinguish "the filters matched nothing" from "no assets yet".

The release builds neither message, so an administrator who filters to zero
rows is shown `No assets yet.` — a statement that is false, about an
organisation that owns hundreds of assets. That is a real, user-visible defect
the release inherits by deferral, and no story acknowledges it. Two things
should happen:

- The deferred row gains a note recording the consequence and the guidance for
  the later increment:

> | **US8.10** | **Empty states** | Approved | Named follow-on item.
> **UX consequence in this release:** the application retains its existing bare
> empty row in both the empty-inventory case and the filter-matches-nothing
> case, so an administrator looking at a filtered-to-zero list is shown
> `No assets yet.` — a statement that is false when the inventory is not
> empty. The release builds neither message. The later increment is expected
> to distinguish the two cases: a message that the filters matched nothing,
> with a reset, from the empty-database case.

- And US5.4 gains a criterion making the release's behaviour explicit, so it
  is a decision rather than an accident:

> **AC5.4.5** — Given the filter matches no assets, then the list shows the
> application's existing bare empty row — the release builds no empty-state
> message — and the count line's matching figure reports zero while its shown
> figure is also zero.

**5.3 US8.6 (design system) needs one line about the fifth chip.** The
release introduces a fifth status chip and several new surfaces without the
token system. The wireframes resolve it: the `discarded` chip reuses the
stylesheet's existing muted grey rather than a new semantic token, and the chip
carries the text `Discarded`. A story should carry that, so the deferral is
read as a deliberate reuse rather than as a gap:

> | **US8.6** | **Design system** — … | Approved; the workbook's section 11 is
> the authoritative source for the complete design-system requirements | Named
> follow-on item; the release's new surfaces use the existing stylesheet's
> vocabulary, and the fifth `discarded` status chip reuses the stylesheet's
> existing muted grey rather than introducing a new semantic token. |

**5.4 US8.7 (responsive UI) needs one line.** The release's screens are drawn
at the POC's 960px desktop container and no responsive variants exist. No
story says the release is desktop-only, so a developer may reasonably build
fluid. Recommend appending to the US8.7 row: *"The release's screens are
drawn for desktop only, at the application's existing 960px container."*

**5.5 US8.4 and US8.5 (the two deferred discard edges) read well.** The rows
are explicit that the edges remain approved, that the release draws eight of
ten, and that the trigger is transition-table coverage rather than a
rejection. AGREE.

### 6. The `Acting as` indicator: honest enough, but missing two criteria

The draft handles the indicator correctly in the ways that matter most. It
does not name a mechanism (Q7's answer A, and the mechanism is a Domain
Design decision). It renders it on every released screen (FR2.4). It makes it
read-only (the actor-trust rule forbids a client-settable actor source, and
the wireframes draw no picker). And it does not let a write story depend on
it.

Two things are missing.

**6.1 The indicator and the history must not disagree.** The release's own
class of defect — INV-3, one shared counting definition so the surfaces cannot
disagree — applies with equal force to the actor: if the `Acting as`
indicator shows one value and the audit entry records another, the screen and
the history tell different stories about who did what, and the history is the
artefact the release exists to make trustworthy. Nothing in the draft ties
them together.

> **AC7.1.6** — Given the `Acting as` indicator, then it displays the same
> actor value the server writes into an audit entry for a write made in that
> session — the indicator and the history never name different actors.

**6.2 The indicator appears on read-only screens, and nobody has said so.**
Marcus reads and never writes, yet the indicator is on every screen — W6's
accessibility note refers to "the session-level one in the top bar". A reader
of W2 who never writes sees "Acting as: …" and has no way to know what it
means. The honest treatment is to state that the indicator is a property of
the **session**, not of a write, and that it carries no control.

> **AC7.1.7** — Given the `Acting as` indicator, then it is present on every
> released screen, including the read-only ones, because it is a property of
> the session rather than of a write — and it carries no control that would
> let a user change it.

Together with §2.4, these two criteria are what make the indicator honest
under either of the two resolutions: a single configured operator (in which
case the indicator states a fact about the deployment, and the two-writers
question has to be answered by the mechanism) or an authenticated session (in
which case the indicator states a fact about the user).

### 7. A small perceptibility note

One criterion in the draft describes something no user can perceive:
**AC5.1.8** — "the counting path … issues a database query and returns an
aggregate — the application does not load the full asset set into memory in
order to count it, and the returned row count stays constant as the number of
assets grows." That is NFR5.2, a scalability property, and it belongs with the
non-functional requirements rather than inside a user story's acceptance
criteria — where it sits oddly, because every other criterion in US5 is about
a figure a reader can check. Not a defect; a placement observation.

### 8. Summary of what I am asking the Product Manager to integrate

1. Correct **US8.9** so it defers the pager and not the count lines (§5.1) —
   a contradiction with AC5.1.4, AC5.3.8 and AC5.4.1.
2. Add **AC5.4.5** and the UX-consequence note on **US8.10** (§5.2).
3. Add **US3.7**, the reason-dialog contract (§3.2), plus **AC3.1.9** for the
   refused-transition state (§3.6).
4. Add **AC3.1.7** (the Actions panel offers only the legal edges for the
   current status) and **AC3.1.8** (the status display-label vocabulary)
   (§3.1).
5. Add **AC5.1.9** (the two holder values, separately, on every surface that
   shows them) and **AC5.3.9–AC5.3.11** (the directory's expansion) (§3.3,
   §3.4).
6. Add the post-transition feedback criteria to US1.1, US2.1, US3.2, US3.4,
   US3.5 and US4.3 (§3.9).
7. Add **AC6.2.4** and **AC6.2.5** (the inline warning is advisory; a
   dismissal is not a waiver) (§3.5).
8. Add **AC4.1.6** (the `system` marker's marker is not colour-only) (§3.10).
9. Add **AC7.2.11–AC7.2.14** (per-screen entry points, chip and nav marking,
   the scope of the target-size and contrast commitment) (§4.1).
10. Add **AC7.1.6** and **AC7.1.7** (the indicator matches the history; it is
    session-level and carries no control) (§6).
11. In `personas.md`: correct Marcus's search expectation (§2.2), add his
    last-holder and `returned`-state goals (§2.2), add the finance and IT
    leadership stakeholders as non-personas (§2.3), and resolve the
    "colleague covering the desk" detail against the `Acting as` indicator
    (§2.4).
12. Note **AC5.1.8**'s placement (§7).

## Positions — Round 2

Round 2 verdict on each Round-1 finding. **RESOLVED** means the revised draft
settles it; **PARTIALLY RESOLVED** means the substance is met but a residue
remains; **MAINTAINED** means the objection stands; **WITHDRAWN** means the
objection no longer applies.

- **§1 — the stories describe state, not interaction — RESOLVED.** US3.7
  (AC3.7.1–AC3.7.9) now owns the dialog's post-write and dismissal contract,
  AC3.1.9 owns the refused-transition screen state, AC7.1.9 owns the failed-write
  screen, AC1.4.4 owns the retryable busy condition's user-visible outcome, and
  the six write stories each carry a post-transition feedback criterion
  (AC1.1.6, AC2.1.5, AC3.2.7, AC3.4.8, AC3.5.6, AC4.3.4). Every specific item
  listed under §1 is now asserted.
- **§2.1 Priya is faithful — AGREE (unchanged, no objection raised).**
- **§2.2 Marcus's search expectation, last-holder goal, `returned` resting state
  — RESOLVED.** `personas.md` now reads "Finds assets with the existing
  free-text search over name and serial or key — the existing search is
  adequate for this. The improved search form is deferred to a later increment,
  so search stays as it is"; the two goals are present verbatim in his **Goals**
  list; and the `returned` resting state is carried in his **Context**.
- **§2.3 Finance function and IT leadership — RESOLVED.** A new
  `## Stakeholders who are not personas` section names both, with the reasons
  (FR3.10's mandatory discard reason and the Audit Completeness measure), and
  states that neither appears in a story's "As a …" clause.
- **§2.4 The two-writers problem — RESOLVED.** The lead kept the detail as a
  "Note carried forward to Domain Design" that states the actor-trust rule
  protects against a *forged* actor but not a *misattributed* one when two
  people share a configured identity, and requires the chosen mechanism either
  to distinguish the covering colleague or to record the shared-identity case
  explicitly, with the `Acting as` indicator forbidden from claiming an identity
  the audit entry does not carry. Combined with AC7.1.10 (the indicator displays
  the same actor value the server writes into an audit entry) and AC7.1.11 (the
  indicator is session-level and carries no control), the indicator is now honest
  under either resolution of the mechanism decision. This satisfies my
  objection: the fact is retained, correctly attributed as a fact about the
  operating context rather than a requirement, and bound to a criterion. See
  §R2-1 below for the one residue I still want the human to hear.
- **§3.1 The Actions panel and the status display-label vocabulary —
  RESOLVED.** AC3.1.7 states the panel's controls are exactly the released
  edges whose origin is the current status (and that a `discarded` asset offers
  no lifecycle control), and AC3.1.8 states the display-label vocabulary and
  names the four surfaces that use it.
- **§3.2 The reason dialog — PARTIALLY RESOLVED.** US3.7 exists with all nine
  of my proposed criteria, and AC3.7.2/AC3.7.3/AC3.7.4 supply the per-variant
  consequence copy. But AC3.7.2 names only two loss origins (`assigned` and
  `in-stock`), while AC3.2.1 says a loss is offered from `in-stock`, `assigned`
  **or `returned`** — so the `returned → lost` variant has no consequence
  sentence. See §R2-2 below, which I **MAINTAIN**.
- **§3.3 The two holder values — RESOLVED.** AC5.1.9 states the rule and names
  all four surfaces (list columns, detail fields, directory expansion rows, CSV
  columns), including the non-fallback property.
- **§3.4 The directory's expansion — RESOLVED.** AC5.3.9 (in-place expansion
  with a programmatic expanded state), AC5.3.10 (per-asset currently-held /
  last-held marker plus a detail link) and AC5.3.11 (no zero-count chip) are
  all present in US5.3.
- **§3.5 The inline duplicate warning's advisory nature — RESOLVED.**
  AC6.2.4 (names the colliding asset, links to it, dismissal leaves the form as
  typed and the submit control available) and AC6.2.5 (a dismissal is not a
  waiver) are present in US6.2.
- **§3.6 The refused-transition error state — RESOLVED.** AC3.1.9 states the
  re-render with the current status and the actions that status allows, and
  that the refusal is stated in words with no error code displayed.
- **§3.7 What the user sees when a write fails — RESOLVED.** AC7.1.9 states
  the asset is unchanged, no new history entry appears, and the failure is
  stated in words rather than as an error code.
- **§3.8 The retryable busy condition's user-visible consequence — RESOLVED.**
  AC1.4.4 states the operation is retried and, because the application renders
  no loading state, the write simply takes an indeterminate moment and then
  succeeds.
- **§3.9 The post-transition feedback — RESOLVED.** All six criteria are
  present: AC1.1.6, AC2.1.5, AC3.2.7, AC3.4.8, AC3.5.6, AC4.3.4.
- **§3.10 The `system` actor's marker — RESOLVED.** AC4.1.6 states the marker
  is carried by text or by a non-colour cue and not by colour alone.
- **§4.1 The per-screen keyboard entry point — RESOLVED.** AC7.2.11 names each
  screen's entry point and resolves the tension with AC7.2.8 by stating the
  skip link is the first focusable element ahead of the entry point; AC7.2.12
  (chip text is the status name), AC7.2.13 (nav current destination marked by
  weight and underline, not colour alone) and AC7.2.14 (the commitment scoped to
  the release's new surfaces, existing chips not re-specified) are all present.
- **§5.1 US8.9 — RESOLVED.** The row is now "Pagination and the pager", with
  the count lines expressly recorded as released in AC5.1.4 and AC5.4.1.
- **§5.2 US8.10 — RESOLVED.** The row is narrowed to "Empty-state presentation",
  carries the UX-consequence note verbatim (including that a filtered-to-zero
  list shows `No assets yet.`, a statement false when the inventory is not
  empty, and the later increment's expected distinction), and AC5.4.4 states the
  release's behaviour explicitly. My proposed criterion number (AC5.4.5) was
  renumbered to AC5.4.4 by the lead, which is a no-op.
- **§5.3 US8.6 — RESOLVED.** The row now records that the fifth `discarded`
  status chip reuses the stylesheet's existing muted grey rather than
  introducing a new semantic token.
- **§5.4 US8.7 — RESOLVED.** The row now records that the release's screens are
  drawn for desktop only, at the application's existing 960px container.
- **§5.5 US8.4 and US8.5 — AGREE (unchanged, no objection raised).**
- **§6.1 The indicator and the history must not disagree — RESOLVED.** AC7.1.10
  states the indicator displays the same actor value the server writes into an
  audit entry for a write made in that session.
- **§6.2 The indicator appears on read-only screens — RESOLVED.** AC7.1.11
  states the indicator is present on every released screen including the
  read-only ones, because it is a property of the session rather than of a
  write, and carries no control.
- **§7 AC5.1.8's placement — RESOLVED.** The criterion was reworded (by the
  quality engineer's proposal, which I did not object to) so the observable half
  is asserted and the memory-profile half is marked as verified by inspection.

### Final positions

- AGREE: The two-persona set and the decision that a holder is never a persona
  — it is the only framing consistent with FR5.3 and FR8.4, and it removes a
  live hazard of implying a person directory.
- AGREE: The `Acting as` indicator is treated as read-only, mechanism-free, and
  present on every screen — this is the honest reading of the actor-trust rule
  and it does not pre-empt the Domain Design decision.
- AGREE: The deferred capabilities are recorded with their approved standing
  intact, the two deferred discard edges are explicitly distinguished from an
  exclusion, and US8.9 and US8.10 have been narrowed to the pager and to the
  designed empty-state treatment respectively.
- AGREE: US7.2's accessibility commitments are stated at the right granularity,
  and the per-screen allocation I asked for is now present.
- WITHDRAWN: my Round-1 objections on US8.9, the post-transition and
  post-failure feedback, the Actions panel, the display-label vocabulary, the
  separate-holder-values rule, the directory expansion, the inline warning's
  advisory nature, the refused-transition state, the retryable busy condition,
  the `system` actor's marker, the per-screen keyboard entry point, Marcus's
  search expectation, his two missing goals, the finance/IT-leadership
  stakeholder gap, and the `Acting as` indicator's two missing criteria — all
  are settled in the revised draft at the criteria cited above.
- MAINTAINED: the reason dialog's consequence copy does not cover the
  `returned → lost` origin, which AC3.2.1 says is reachable and which the
  wireframes' own Actions table offers. This is a knowledge dispute the lead
  can settle by adding one clause to AC3.7.2; it does not need the human.
- MAINTAINED (question for the human, not a defect): the shared-identity case
  in the `Acting as` indicator is a *fact about the operating context* that the
  release cannot fully honour until the actor mechanism is chosen. The story set
  now states the constraint (AC7.1.10, AC7.1.11) and carries the fact forward
  to Domain Design, which is the right treatment. I am not asking for a change
  to the stories; I am asking that the human hear the residual consequence
  explicitly — see §R2-1.

## Round 2

Round 2 of the mob. Two rounds maximum, so this is my final position. I have
re-read the revised `stories.md` and `personas.md` in full, and the other
participants' recorded positions.

### §R2-1 — The shared-identity case is now correctly carried, and the human
should hear its residual consequence

This is **not a defect in the story set**, and I want to be precise about that,
because the distinction matters for the gate. The revised `personas.md` records
the covering-colleague fact as a "Note carried forward to Domain Design", and
the revised stories bind it to two criteria (AC7.1.10, AC7.1.11). That is the
right structure: a fact about how the organisation actually works, carried to
the stage that can resolve it, with the release's honesty guarantees stated as
criteria in the meantime.

What remains is a consequence the human should hear, because it is the one place
where a release invariant is *conditionally* satisfied. The actor-trust rule
guarantees that a write carries a **server-resolved** actor. It does not
guarantee that the actor is the **person who actually made the write** when two
people share a configured identity. The release's primary success measure is
Audit Completeness — "100% of audit entries carry an actor attribution". Under a
single-configured-operator mechanism, that measure is met at 100% while the
attribution is wrong for every write made by the covering colleague.

That is a real limitation, and it is a **question about what the release claims,
not a defect in how it is specified**. Two things would settle it, and both are
the human's to decide rather than mine:

1. Whether the Audit Completeness measure should carry the qualifier the
   project memory already uses for backfilled history — that it attests to
   *server-resolved* attribution, and not to *personally-correct* attribution
   where the deployment cannot distinguish two people sharing one identity.
2. Whether the covering-desk scenario is frequent enough to require the
   mechanism to distinguish the two people (which is a Domain Design
   constraint), or whether it is rare enough that the mechanism may record the
   shared-identity case explicitly and accept the attribution limit.

If the human rules either way, the stories need no change: AC7.1.10 and
AC7.1.11 already hold under both answers. I am flagging it so the completion
summary does not present Audit Completeness as unconditionally stronger than it
is. **I do not maintain a Round-1 objection here** — the objection was that the
story set did not answer the question, and it now answers it.

### §R2-2 — MAINTAINED: the reason dialog's consequence copy does not cover
`returned → lost`

**The defect.** AC3.7.2 states the consequence sentence is rendered from the
asset's current status, and it names exactly two loss variants: *"a loss from
`assigned` states that the assignment ends and that the holder is kept as the
last holder; a loss from `in-stock` states that the asset has never been
assigned and that there is no holder to keep."* Two variants are specified.

But there are **three** reachable loss origins in this release:

- **AC3.2.1** — *"Given an asset in `in-stock`, `assigned` or `returned`, when I
  mark it lost with a reason…"* — three origins.
- **AC3.2.6** — *"Given a loss from `in-stock`, from `assigned` and from
  `returned`, then each appends exactly one `mark-lost` entry"* — three
  origins, and the criterion explicitly names all three.
- The wireframes' own Actions table (`wireframes.md:578`) lists `returned` →
  `Mark lost (reason dialog)`, and `user-flow.md` carries the same eight-edge
  table.

So `returned → lost` reaches the reason dialog, and AC3.7.2 says nothing about
what its consequence paragraph says.

**Why this matters beyond the copy.** The `returned` status is the one where
the current holder is **empty** and the preserved last holder is **populated**.
That is a third shape of consequence, distinct from both specified variants:
there is no assignment to end, but there *is* a holder to keep. A developer
following AC3.7.2 literally must either reuse the `in-stock` copy — which says
"there is no holder to keep", and is **false** for a `returned` asset — or reuse
the `assigned` copy — which says "the assignment ends", and is **false** for a
`returned` asset, because its assignment already ended at the return.

Both reuse paths put a false statement in front of the administrator at the
exact moment she is recording why an asset went missing. That is the release's
own release-boundary hazard in miniature, and it is the same class of defect the
wireframes were careful to avoid: W7's variant table exists precisely because
the consequence depends on what is true about the assignment.

Note also that this is **not** a case where the wireframes are silent in a way
that leaves the story set to decide. `wireframes.md:1121–1126` says the
consequence paragraph *"has two variants"* and gives the reason: *"the
`assigned` variant is the only other one the release can reach, because
`returned` and `discarded` reach the loss dialog on different transitions that
carry their own dialogs (W8), and `lost` and `in-stock` are the two statuses
the Mark lost action is offered from."* That reasoning is **self-contradictory
within the wireframes**: the same document's Actions table offers Mark lost from
`returned` with a reason dialog, and `user-flow.md` confirms the
`returned → lost` edge is one of the eight released edges and *"requires a loss
reason from the shared loss-reason vocabulary, the same as `in-stock → lost` and
`assigned → lost`."* So the wireframes' own count of two variants rests on a
claim that its own edge table contradicts. The story set inherited the count.

**What would settle it.** One clause added to AC3.7.2, so the three loss origins
each get a stated consequence. My proposed wording:

> - **AC3.7.2 (amended)** — Given the asset's current status, then the
>   consequence sentence is rendered from that status: a loss from `assigned`
>   states that the assignment ends and that the holder is kept as the last
>   holder; a loss from `in-stock` states that the asset has never been
>   assigned and that there is no holder to keep; and a loss from `returned`
>   states that the assignment has already ended and that the previous holder is
>   kept as the last holder.

This is a knowledge dispute, not a judgment call: the facts are on disk — the
edge is released (AC3.1.1), it is offered from `returned` (AC3.2.1, AC3.2.6,
the wireframes' Actions table), it requires a reason (AC3.2.2, and the
`user-flow.md` text quoted above), and the holder state that makes the third
variant distinct is fixed by AC2.2.1 and AC2.2.5 (the current holder is
cleared, the preserved previous holder names the returning holder). An expert
can settle it without the human, so it does not belong in the questions file.

**Severity: minor, and it is a copy defect rather than a behavioural one.** The
transition, the audit entry, the reason requirement and the holder fields are
all correctly specified elsewhere. What is wrong is that a designer would have
to invent the third paragraph, and the two obvious inventions are both false
sentences shown to the administrator at the moment of recording a loss. That is
enough to warrant the one-clause fix, and not enough to warrant reopening the
stage.

### A note on Q8's framing, since the human is being asked

The human is being asked (Q8) how to express the foundation workstream: as a
persona-voice story (A), as a release-gating workstream story without the
"As a …" clause (B), or outside the story set entirely (C). I am not
re-arguing the framing, and I note that option B is the one that would leave
the story set internally consistent — but the UX consequence the human should
hear is this:

**Whatever option is chosen, the foundation story has no screen, and the story
set's shape implies that every story has one.** US0.1's eleven criteria are all
database assertions, and it is the only story in the set whose acceptance
criteria are *entirely* invisible to a user. That is correct and desirable — it
is a release-gating workstream — but it means US0.1 is a story about the
application's behaviour under a migration, not about anything a person sees. If
option A is chosen, the "As an asset administrator" clause is a framing device
rather than a description of a user goal, and the story set will contain one
voice that no persona in `personas.md` actually speaks. If option B is chosen,
the story set contains one workstream that is honestly labelled as such, and
every remaining story is in a persona's voice.

The practical consequence for the downstream design work is the same either
way: **US0.1 produces no screen and no interaction, so it must not be given one
in Domain Design.** The risk to name is that a story in a persona's voice
tends to acquire a persona's affordances by default — a screen, a control, a
confirmation — and the foundation's whole content is the absence of those. It
is already safe on this point: AC0.1.1–AC0.1.11 assert database state only, and
AC0.1.11's "the `system` actor … resolves to a stable, displayable identity
distinct from any person's" is a *domain value* requirement that AC7.1.12 and
AC4.1.3 carry at the display layer. So this is a note for the human, not an
objection: whichever option is chosen, the answer does not change what
Domain Design must build, only how the story reads.
