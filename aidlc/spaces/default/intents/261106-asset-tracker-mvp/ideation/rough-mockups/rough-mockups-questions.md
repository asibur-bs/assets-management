# Rough Mockups — Clarifying Questions

Stage: `rough-mockups` (Ideation, 1.6)
Intent: `261106-asset-tracker-mvp`

## Sources

- [desc] Initial description: "Build the Asset Tracker MVP from the approved Asset Tracker MVP Development Workbook, the POC-vs-MVP gap analysis, the decision brief, and the fully approved 17-item decision set. The MVP adds actor-attributed append-only audit history, previous-holder preservation via last_assigned_to, lost-asset recovery (lost to in-stock), an assigned to discarded transition that resolves the assignment inline, five exclusive status buckets with Active Inventory and Total Records computed by one shared counting function and filter builder, case-insensitive category-scoped serial uniqueness via a functional index with a concurrency-safe application-level fallback, CSV export with formula-injection protection, and an amendment to workbook section 4.1 and section 21.1 Scenario 3 recording Returned as a distinct resting state."
- [scope] Workflow-selected scope: `feature`.
- [Q1] The primary customer is internal IT asset administrators who register, assign, and write off assets on behalf of the organisation.
- [Q2] The primary success measure is Audit Completeness — 100% of audit entries carry an actor attribution, and history is never destroyed.
- [Q3] The MVP release contains the reconciliation dashboard, the assignee directory, CSV export with formula-injection protection, asset editing, and duplicate-detection UX. The design system, responsive UI, improved search, pagination and result counts, and empty states are deferred to a later increment.
- [Q4] Every lifecycle transition has explicit validation and explicit audit behaviour — a standing condition of the approved decision set.
- [Q5] Actor identity is resolved from trusted server-side context; actor information supplied in a write request is never trusted.
- [Q6] The actor-identity mechanism is in scope but its choice is deferred to the inception stages; it is a named blocking dependency of the foundation workstream, and I-01 / I-03 — whether a trusted authentication mechanism exists anywhere in the organisation — is still open.
- [Q7] The deployment target is a single internal host with a machine-local SQLite file, launched as a long-running process.
- [memory:M2] `aidlc/spaces/default/memory/project.md#Decided`: "The fully approved 17-item Asset Tracker MVP decision set, together with the Asset Tracker MVP Development Workbook, is the binding technical and product contract for the `asset-tracker-mvp` intent; it is not reopened at any stage of that intent, and it carries seven standing conditions — the uniqueness check uses an IMMEDIATE transaction and a non-zero SQLite `busy_timeout` with `SQLITE_BUSY` mapped to a retryable error; the functional-index expression and the application-level comparison predicate use one shared definition; registration and serial/key updates enforce the same uniqueness policy; historical backfills preserve original records and audit traceability and report failures; dashboard, assignee, asset-list, and CSV counts use consistent filtering and counting definitions; every lifecycle transition has explicit validation and audit behaviour; and the existing 66/66 passing test baseline is preserved with regression tests added for newly approved behaviour. Traceability must be maintained between the approved MVP requirements and the POC requirements FR1.3, FR4.4, FR4.5, and FR5.3, and actor identity is resolved from trusted server-side context so actor information supplied in a write request is never trusted. (Stage intent-capture, 2026-11-06)"
- [memory:M3] `aidlc/spaces/default/memory/project.md#Decided`: "The decision set's amendment table names the workbook amendment surface as section 4.1 (transition table, recovery, `in-stock → lost`, `assigned → discarded`), section 4.2.5, section 4.3 (the actor-trust rule), section 4.4, section 6.1, section 6.4, section 6.5, section 9 (Screens 01, 02, 03, 04, 10), section 10, section 21.1, section 21.2, section 22, section 24 (the metric qualifiers the Audit Completeness population relies on), and the two new section 27 sections (Inventory Counting Definitions and Audit Action Vocabulary). The section 24 amendment carries the Audit Completeness qualifier verbatim: pre-MVP history is backfilled to a `system` actor and excluded from this metric. Section 4.1 records the `lost → in-stock` recovery transition with a required recovery reason drawn from the shared loss-reason vocabulary, and requires a distinct `recovered` audit action rather than `assign` or `return`, whose description names the recovery and the prior holder. It also records that complex recovery workflows — partial recovery, credit assignment, dispute handling — remain deferred, distinct from the single included recovery transition. The workbook's remaining MVP feature set is the reconciliation dashboard, the assignee directory, asset editing, duplicate-detection UX, empty states, result counts, pagination, improved search, responsive UI, and a design system. The design-system enumeration is indicative, not exhaustive: workbook section 11 is the authoritative source for the complete design-system requirements, covering semantic color tokens, a typography scale, spacing tokens, radius and shadow scales, iconography, and a light-theme implementation designed for future dark-theme extension. (Stage intent-capture, 2026-11-06)"
- [memory:M4] `aidlc/spaces/default/memory/project.md#Decided`: "The `assigned → discarded` transition resolves the assignment inline and records it: `assigned_to` is cleared, `last_assigned_to` is retained so the holder at discard time stays visible, and a `discarded` audit action records the discard, the prior holder, and the fact that the assignment was resolved by the discard. A discard reason is always required, drawn from the shared loss-reason vocabulary plus retirement-specific values. The asset row and its full history are never deleted; a discarded asset is excluded from Active Inventory but remains present in the `discarded` bucket and in Total Records, and stays accessible at its detail URL with its history intact. (Stage intent-capture, 2026-11-06)"

---

## Q1 — Primary entry points and key screens

The MVP release has five operator-facing surfaces that the POC does not yet have — a reconciliation dashboard, an assignee directory, CSV export, asset editing, and duplicate detection at entry — and the existing POC already has three screens (asset list, new-asset form, asset detail). Workbook section 9 names ten screens, and the decision set amends five of them (Screens 01, 02, 03, 04, and 10).

The wireframe set has to name the screens explicitly, because the §9 amendments attach to specific screen numbers later in Requirements Analysis. Which screen set should the wireframes cover for this release?

- A. **Five MVP surfaces plus the three POC screens** — eight screens: reconciliation dashboard, assignee directory, CSV export (as a download action on the list, not a screen), asset editing, duplicate detection (as a state of the registration form), asset list, new-asset form, asset detail. This covers everything in the release without designing screens the release does not contain.
- B. **Ten screens matching workbook section 9's numbering** — wireframes for Screens 01 through 10, so the §9 amendments map one-to-one onto the workbook's own numbering. This requires inferring what Screens 05 through 09 are from the workbook, which is not in this repository.
- C. **The three POC screens only, marked as amended** — treat this stage as covering the existing application shape and record the five new surfaces as named-but-not-drawn placeholders, leaving their wireframes to a later stage.
- D. **Other (please specify)**

[Answer]: A. Eight screens: five MVP surfaces plus three POC screens

---

## Q2 — The core user flow (happy path)

The primary customer registers, assigns, and writes off assets. The POC's registration form carries an optional "Assigned to" field that stores a plain field without performing an assignment — the asset stays `in-stock` and only enters `assigned` through the assign action. That is one of the defects the approved decision set exists to correct, and it has a visible consequence: the registration screen currently invites an administrator to record an assignment that does not happen.

Which behaviour should the wireframes show for registration with a holder named?

- A. **Registration never assigns.** The "Assigned to" field is removed from the registration form, and assignment happens only as a separate, explicit action on the asset detail screen. This matches the POC's actual service behaviour and removes the misleading affordance.
- B. **Registration assigns when a holder is named.** The form keeps the field, and naming a holder performs the assignment as part of registration, producing an `assign` audit entry. This is a behaviour change from the POC and needs a new audit action path.
- C. **Registration never assigns, and the field becomes a note.** The field is relabelled as a plain free-text note so a "recorded assignee" hint is still captured, but it still performs no transition.
- D. **Other (please specify)**

[Answer]: A. Registration never assigns — remove the field

---

## Q3 — Reason capture on the transitions that now require one

The approved decision set makes a reason mandatory in two places: the `lost → in-stock` recovery transition, whose recovery reason is drawn from the shared loss-reason vocabulary, and the `assigned → discarded` transition, whose discard reason is drawn from the same vocabulary plus retirement-specific values. Workbook section 9 Screen 10 is the screen amended for the discard. The POC's detail screen currently offers "Mark lost" as a bare button with no reason field at all.

How should reason capture be shown on the wireframes?

- A. **A required reason field on the detail screen for every reason-bearing transition.** The wireframe shows the transition button alongside a required select or text field drawn from the loss-reason vocabulary, with the button disabled or the submission blocked until a reason is chosen.
- B. **A confirmation dialog that collects the reason.** The transition button opens a modal with the reason field and a confirm/cancel pair, keeping the detail screen uncluttered.
- C. **Both: an inline field for the common case and a dialog for the rest.** More surface area than the release arguably needs.
- D. **Other (please specify)**

[Answer]: B. A confirmation dialog that collects the reason

---

## Q4 — Where duplicate detection surfaces to the user

The MVP must tell the administrator about a case-insensitive, category-scoped serial or key collision *before* it is created, rather than discovering the duplicate after the fact. The POC currently catches the database constraint after submit and re-renders the form with a single error line. The standing condition also requires that registration and serial-or-key updates enforce the *same* policy, so the edit screen needs the same treatment.

How should duplicate detection appear in the wireframes?

- A. **Inline validation on the serial/key field, at the point of entry.** The field shows an inline warning as soon as the typed serial matches an existing asset in the same category, naming the colliding asset. The final database constraint remains as the backstop.
- B. **Inline validation plus a submit-time collision warning.** The inline hint as in A, and on submit a prominent warning block naming the existing asset and offering "Open existing asset" alongside "Change the serial".
- C. **Submit-time only, but improved over the POC.** The current red error block is kept and enriched to name the colliding asset, with no live checking.
- D. **Other (please specify)**

[Answer]: B. Inline validation plus a submit-time collision warning

---

## Q5 — The reconciliation dashboard's shape

Workbook section 9 Screen 01 is amended to add "Active Inventory", to label "Returned", and to add an "available to assign" sub-metric. Active Inventory and Total Records are computed by one shared counting function behind a reusable filter builder, and the standing condition requires that dashboard, assignee, asset-list, and CSV counts all use that same definition. The POC's list view has no counts at all — the whole interface currently shows no totals.

What should the dashboard's primary content be?

- A. **Five status tiles plus Active Inventory and Total Records.** The five exclusive buckets (`in-stock`, `assigned`, `returned`, `lost`, `discarded`) each get a tile, with Active Inventory and Total Records above them, and an "available to assign" sub-metric on the `in-stock` tile.
- B. **Two headline tiles plus the five buckets.** Active Inventory and Total Records are the headline; the five bucket tiles sit below as a breakdown. This puts the numbers the audit measure depends on at the top.
- C. **The two headline tiles plus a per-status table.** Rather than five tiles, a single table of bucket, count, and share — denser and less visual.
- D. **Other (please specify)**

[Answer]: B. Two headline tiles plus the five buckets below

---

## Q6 — The assignee directory

The assignee directory is a per-holder view of what each holder has, and it is one of the four count-consuming surfaces whose numbers must agree with the dashboard, the asset list, and the CSV export. The POC has no directory — holders exist only as free-text strings on the asset row, with no registry behind them.

What should the assignee directory look like?

- A. **A list of holders, each expandable to their assets.** One row per holder with the asset count and a link into a filtered asset list showing that holder's assets. The holder list is derived from the assets themselves rather than a separate registry.
- B. **A searchable directory of holder profiles.** Each holder has a page listing their assets, their history, and their counts — treating holders as first-class entities with their own detail URL.
- C. **A table of holders with counts and a CSV export of that table.** The directory is itself a count-consuming surface with its own export.
- D. **Other (please specify)**

[Answer]: A. A list of holders, each expandable to their assets

---

## Q7 — What the asset detail screen shows about history

Audit history becomes actor-attributed and append-only in the MVP, and the primary success measure is that 100% of audit entries carry an actor attribution. The POC's detail screen shows only the *latest* audit row (`latestAuditFor` selects `ORDER BY id DESC LIMIT 1`), so today the history a user sees is one line, not a history.

What should the history panel show?

- A. **The full append-only history, newest first, with the actor on every entry.** The one-row panel becomes a full list, each entry showing the action, the actor, the timestamp, and the description — including the `recovered` and `discarded` actions that name the prior holder.
- B. **The full history, but collapsed by default.** A list of the last few entries with an "Show all" expander, so the screen is not dominated by history.
- C. **The full history plus a filter by action.** The list can be filtered by audit action so an administrator can isolate losses, recoveries, or discards.
- D. **Other (please specify)**

[Answer]: A. The full append-only history, newest first, with the actor on every entry

---

## Q8 — The actor's presence in the interface

Every audit entry must carry an actor attribution resolved from trusted server-side context, and the *mechanism* for establishing that context is still an open decision (PB-00) blocked on I-01 / I-03 — whether the organisation has any trusted authentication mechanism at all. The four candidate mechanisms are a server-configured single operator, a trusted request header from an authenticating proxy, operator selection, and application-managed login. Two of them have no on-screen representation at all; one has a picker; one has a login screen.

How should the wireframes treat the actor in the interface?

- A. **Wireframes show a persistent actor indicator in the header, and name it as actor-identity-mechanism-dependent.** The wireframes place an "acting as" element in the top bar and mark it as provisional pending PB-00, so the layout has a place for it without asserting a mechanism. No login screen is drawn.
- B. **Wireframes are actor-agnostic.** No actor element appears anywhere, and the requirement that every action has an actor is carried as a data and audit concern rather than a visual one, to be specified once the mechanism is decided.
- C. **Draw the operator-selection variant, marked provisional.** A picker in the header, with a note that this is candidate C of four and that PB-00 may replace it.
- D. **Other (please specify)**

[Answer]: A. Persistent actor indicator in the header, marked provisional

---

## Q9 — Information hierarchy and navigation

The POC has a single flat navigation: a top bar with the brand link and one "New asset" button. The MVP adds a dashboard and an assignee directory, which introduces a genuine question about how the operator moves between them — the dashboard is a summary, the list is the working surface, the directory is a per-holder lens.

What should the navigation structure be?

- A. **A four-item top navigation: Dashboard, Assets, Holders, and a New asset action.** The dashboard is the landing page; the asset list stays the working surface; the directory is a distinct lens.
- B. **Keep the flat top bar and make the dashboard a banner above the asset list.** One page: counts at the top, the asset table below. Simplest, but it merges two of the four count-consuming surfaces into one page.
- C. **A top navigation of Dashboard, Assets, Holders, plus a persistent sidebar.** More structure than a four-screen application needs.
- D. **Other (please specify)**

[Answer]: A. Four-item top navigation: Dashboard, Assets, Holders, plus New asset

---

## Q10 — Device and form factors

The MVP is an internal tool for asset administrators at a confirmed scale of hundreds to low thousands of assets, deployed as a single long-running process on a single internal host. The design system and responsive UI are both deferred to a later increment — the design system was deferred because it is the largest single body of new work in the MVP, and responsive UI with it because a responsive surface built on an ad-hoc stylesheet is re-worked when the tokens land. The POC's stylesheet has no breakpoints.

Which form factors must the wireframes cover?

- A. **Desktop only, and stated as a deferral.** The wireframes are desktop-width, with a note that the responsive form factor is deferred alongside the design system and that the layout must not foreclose it.
- B. **Desktop plus a tablet-width variant.** Two widths sketched for the list and dashboard, since some administrators work on a tablet.
- C. **Desktop, tablet, and phone.** Full responsive coverage.
- D. **Other (please specify)**

[Answer]: A. Desktop only, and stated as a deferral

---

## Q11 — Accessibility requirements

Accessibility was not named in the approved decision set and no WCAG level is recorded anywhere in the upstream artifacts. The stage requires a one-line accessibility note per screen — heading level, primary landmark regions, and keyboard entry point — so a floor has to be chosen. The POC's markup has semantic elements (`<main>`, `<table>`, `<label>`, `<dl>`) and a `<html lang="en">` declaration, but no ARIA, no skip link, and no visible focus styling in the stylesheet.

What accessibility floor should the wireframes carry?

- A. **WCAG 2.1 AA.** Colour is never the only carrier of meaning (so status is text plus colour, as the POC already does), every interactive element is reachable and operable by keyboard, form errors are associated with their field, and the per-screen accessibility note records heading level, landmarks, and keyboard entry point.
- B. **WCAG 2.1 A.** The baseline level, without the AA contrast and target-size refinements.
- C. **No formal conformance target, but the per-screen accessibility notes are still produced.** The notes are recorded so Requirements Analysis can specify accessibility requirements later, without committing this release to a conformance level.
- D. **Other (please specify)**

[Answer]: A. WCAG 2.1 AA

---

## Q12 — Visual language: the POC's stylesheet or a new direction

The POC has a working 40-line stylesheet with CSS custom properties for colour (`--bg`, `--fg`, `--muted`, `--border`, `--primary`, `--warn`, `--ok`), per-status colour chips for the four current buckets, a 960px container, and a system-font stack. The design system — roughly 30 components, semantic colour tokens, a typography scale, spacing tokens, radius and shadow scales, and iconography — is deferred from this release. So the wireframes cannot specify a token system that the release will not build.

How should the wireframes treat visual language?

- A. **Stay inside the POC's existing visual vocabulary.** The wireframes use the POC's current colour semantics and status-chip pattern, extended only with what the new surfaces require (a fifth `discarded` chip, dashboard tiles). No new token system is specified, and a note records that the full design system arrives in the later increment.
- B. **Specify the semantic tokens the wireframes need, as a partial system.** Colour tokens and a type scale are specified now so the wireframes are concrete, with the full component library deferred.
- C. **Grey-box wireframes with no visual direction.** Structure, layout, and content only; all colour, type, and spacing decisions deferred to the design-system increment.
- D. **Other (please specify)**

[Answer]: A. Stay inside the POC's existing visual vocabulary

---

## Q13 — The primary customer these wireframes are drawn for

The customer was identified and confirmed at the Intent Capture stage and is not reopened
here. The wireframes are drawn for the person who does the work, and the choice of screen
set, navigation, and form factor is made for that person.

Which customer group is the primary user of this MVP?

- A. Internal IT asset administrators who register, assign, and write off assets on behalf of the organisation.
- B. A broader internal audience spanning IT, HR, Finance, and Operations.
- C. External customers or clients who track assets issued to them.
- D. Other (please specify)

[Answer]: A. Internal IT asset administrators who register, assign, and write off assets on behalf of the organisation.

## Q14 — The primary success measure these wireframes serve

The success measure was confirmed at the Intent Capture stage. The wireframes exist to make
it achievable, so the screen set is judged by whether an administrator can act on it and
whether the resulting history can be trusted.

What is the primary success measure for this MVP?

- A. Audit Completeness — 100% of audit entries carry an actor attribution, and history is never destroyed.
- B. Task throughput — the number of assets an administrator processes per day.
- C. Cost reduction — the cost of the assets tracked, measured against the POC.
- D. Other (please specify)

[Answer]: A. Audit Completeness — 100% of audit entries carry an actor attribution, and history is never destroyed.

## Q15 — The validation and audit behaviour every lifecycle transition carries

Every lifecycle transition has explicit validation and explicit audit behaviour — a standing
condition of the approved decision set. The wireframes therefore draw the reason dialog, the
audit entry, and the actor on every write path, because those are the parts the condition
makes visible.

What audit and validation behaviour does every lifecycle transition carry?

- A. Explicit validation and explicit audit behaviour on every lifecycle transition, as a standing condition of the approved decision set.
- B. Explicit validation only; audit behaviour is added in a later increment.
- C. Audit behaviour only; validation is left to the database constraints.
- D. Other (please specify)

[Answer]: A. Explicit validation and explicit audit behaviour on every lifecycle transition, as a standing condition of the approved decision set.

## Q16 — Where the actor on an audit entry comes from

Actor identity is resolved from trusted server-side context, and actor information supplied
in a write request is never trusted. The wireframes therefore show the actor as a read-only
indicator and never offer an actor field or picker on any screen.

How is the actor on an audit entry resolved?

- A. From trusted server-side context; actor information supplied in a write request is never trusted.
- B. From a field the operator fills in on the write form.
- C. From a picker the operator selects from a list of known users.
- D. Other (please specify)

[Answer]: A. From trusted server-side context; actor information supplied in a write request is never trusted.

## Q17 — Whether the actor-identity mechanism is decided at this stage

The actor-identity mechanism is in scope but its choice is deferred to the inception stages.
It is a named blocking dependency of the foundation workstream, and I-01 / I-03 — whether a
trusted authentication mechanism exists anywhere in the organisation — is still open. The
wireframes reserve a place for the actor without selecting a mechanism, and the indicator is
marked provisional.

Is the actor-identity mechanism chosen at this stage?

- A. No — it is deferred to the inception stages and the indicator is marked provisional.
- B. Yes — the mechanism is chosen now and the wireframes are drawn against it.
- C. Other (please specify)

[Answer]: A. No — it is deferred to the inception stages; the mechanism is a named blocking dependency of the foundation workstream, and I-01 / I-03 — whether a trusted authentication mechanism exists anywhere in the organisation — is still open.

## Q18 — The deployment target the wireframes are drawn for

The deployment target is a single internal host with a machine-local SQLite file, launched as
a long-running process. The wireframes are therefore drawn for a server-rendered,
desktop-width surface: no client-side rendering, and no loading state on any path.

What is the deployment target for this MVP?

- A. A single internal host with a machine-local SQLite file, launched as a long-running process.
- B. A containerised service with a managed relational database.
- C. A serverless deployment with a hosted database.
- D. Other (please specify)

[Answer]: A. A single internal host with a machine-local SQLite file, launched as a long-running process.

---

## Q19 — The two approved discard edges the lifecycle map does not draw

The approved §4.1 transition table has ten edges. The lifecycle map in F5a
draws eight and leaves two undrawn. The two that are not drawn are `in-stock → discarded` and
`returned → discarded`. Both remain in the approved decision set — nothing in
this stage withdraws, reclassifies, or defers them. They are not drawn because
a discard resolves a live assignment inline, and an asset in `in-stock` has
never been assigned while an asset in `returned` has already been returned, so
neither source state holds a live assignment to resolve.

How should those two edges be handled?

- A. Record them as a named open question for the scope stage, with their approved standing intact, and do not decide the release boundary here.
- B. Draw them in F5a now, making the map match the approved table exactly.
- C. Other (please specify)

[Answer]: A. Record them as a named open question for the scope stage, with their approved standing intact, and do not decide the release boundary here.

---

## Assumption Confirmation
The following assumptions are carried into the wireframes and the flows. Confirm them, or convert them to follow-up questions.

- [assumption] The wireframe set covers the eight screens the MVP release actually contains, and does not design the deferred presentation items — the design system, responsive UI, improved search, pagination and result counts, and empty states — which keep their approved standing and remain deliverable in a later increment. This is a scoping judgement at this stage, not a reopening of the approved decision set. No empty state is drawn as a screen the release must render: the MVP retains the POC's existing bare empty row, and the richer empty state is the deferred increment's work. Within that deferral, "pagination and result counts" is read as the pager and not the count line: the count lines on W2 and W6 are in the release, because they are reads from the shared counting function and are the visible half of the approved count-consistency condition, while the page controls are deferred with the presentation-polish increment. That is a narrowing of an ambiguous deferral phrase, not the promotion of a deferred capability, and it is recorded so no later stage mistakes it for one. (Q1, Q12, memory:M2, memory:M3)
- [assumption] The actor indicator's presence in the wireframes is provisional. The wireframes reserve a place for the actor without selecting a mechanism, because the actor-identity mechanism is an open decision (PB-00) blocked on I-01 / I-03, and the actor-trust rule itself is fixed and unaffected by what the wireframes show. If the operator-selection candidate is selected, the indicator becomes interactive and the wireframes change. (Q8, Q16, Q17)
- [assumption] The wireframes carry a WCAG 2.1 AA floor as a design commitment of these screens, alongside the per-screen accessibility note the stage requires — heading level, primary landmark regions, and keyboard entry point. No WCAG level is named in the approved decision set or in any upstream artifact, so the floor is a choice made at this stage rather than an inherited requirement; Requirements Analysis owns converting it into testable requirements. (Q11)
- [assumption] The wireframes stay inside the POC's existing visual vocabulary and extend it only where a new surface requires it, because the full design system is deferred from this release and a token system specified now would be reworked when the tokens land. The fifth status chip reuses the stylesheet's existing muted grey rather than introducing a new semantic token. (Q12)
- [assumption] The wireframes use the workbook's section 9 screen numbers as the anchor for the decision set's screen amendments, but the wireframe set itself is the eight screens the release contains. The mapping from the eight wireframes to the workbook's ten screen numbers is settled at Requirements Analysis, where the §9 amendments are applied. (Q1, memory:M3)
- [assumption] The dashboard's "Attention" panel is not a fifth count-consuming surface. Every number it shows is read from the same shared counting function through the same filter builder, so adding it does not add a place where counts can disagree. (Q5, memory:M2)
- [assumption] The CSV export is an action on the asset list rather than a screen of its own, because it produces a file rather than a view. Its row count is the same count the list shows, drawn from the shared counting function, which is what makes it one of the four count-consuming surfaces rather than a fifth count source. (Q1, memory:M2)
- [assumption] The `last_assigned_to` value is displayed on the asset detail screen as a distinct field from the current holder, and the assignee directory distinguishes currently-held from last-held assets. Collapsing the two would lose the information the previous-holder preservation exists to keep. (Q6, Q7, memory:M4)
- [assumption] No loading state is drawn on any screen, because the application is synchronous and server-rendered and the release adds no client-side rendering. A drawn loading state would misrepresent the application's behaviour. (Q10)
- [assumption] The status of the asset is not editable through the edit form. The lifecycle moves only through the explicit actions on the detail screen, each with its own validation and audit behaviour, so an edit form that could change status would be a second, unvalidated path into the state machine. (Q15)
- [assumption] The screens render the approved §4.1 transition table rather than deciding it. The eight drawn edges between the five buckets are fixed by the approved amendment surface, and `discarded` is terminal among them — no transition leaves it, because the release does not undo a write-off and does not permit a discarded asset to be marked lost. The `in-stock → lost` edge is part of the table, so an asset registered into stock and then found missing has a path to record the loss. (memory:M3, memory:M4)
- [assumption] The screens treat the `returned → lost` edge as approved rather than inferred, and render it through the same `Mark lost` reason dialog as the other two loss edges, reusing the `mark-lost` audit action with a required loss reason rather than a distinct action of its own, because the approved decision set row D3 lists `returned → assigned/lost/discarded` as approved and the POC requirements state the same valid transitions from `returned`. The screens also reconcile the three edge sets explicitly: the approved §4.1 table has ten edges, the screens draw eight of them, and the two remaining approved edges — `in-stock → discarded` and `returned → discarded` — are a deliberate omission from this release rather than an error or a removal, on the grounds that a discard resolves a live assignment inline and neither source state has one. Every approved edge appears in exactly one of the drawn or omitted sets, so the counts reconcile without overlap or residue. Those two edges keep their approved standing, and the release-boundary question they raise is carried to the scope stage as a named open question rather than decided here. (Q19, memory:M3, memory:M4)
- [assumption] Every surface that shows a holder shows both holder values separately — the current holder and the preserved `last_assigned_to` — and neither falls back to the other's value. The asset list, the detail screen, the holder directory's expansion, and the CSV export's column set all use the same rule, so the four surfaces cannot disagree about who had an asset. (Q6, Q7, memory:M4)
- [assumption] The screens keep the last holder on a recovered asset. The recovery leaves `assigned_to` empty — it already was — and **retains** `last_assigned_to`, exactly as the discard does, so a recovered asset is `in-stock` yet still has a display holder: it is counted under the person who last held it and does not fall into the holder directory's Unassigned row. Only the never-held loss case clears both fields. The `lost` variant frame in this section therefore shows `Holder --` with `Last holder Dana R`, and the `in-stock` variant shows both empty because that asset was never held. (memory:M3, memory:M4)
- [assumption] An asset's display holder is its current holder if it has one and otherwise its preserved last holder, and an asset that has never been held has no display holder at all. The directory's rows are disjoint under that single definition, so every asset appears exactly once; a holder row means "this is Dana's" across both currently-held and last-held assets; and the "Unassigned" row holds only the assets that have never been held by anybody, which is why its single chip is `in-stock` and nothing else. A holder's per-holder bucket chips count the assets whose display holder is that holder, so every chip value equals the number of visible rows in its bucket and the chips sum to the row count. The chips are read from the shared counting function, not computed by the directory, and no zero-count chip is shown for a bucket the holder has no asset in. (Q6, Q5, memory:M4)
- [assumption] The CSV export produces exactly the rows the asset list is currently showing, under the filter currently applied, with the list's own six-column set — Name, Category, Serial / Key, Status, Holder, Last holder — and every cell value is sanitised so it cannot be interpreted as a formula. Notes and audit history are deliberately not exported, because neither is a list column and exporting them would break the property that the export's rows and columns agree with what the list shows. A filter matching no rows produces a header-only file. The export is an action rather than a screen, but it has a lifecycle, and it is drawn in `user-flow.md` as flow F6. (Q1, Q5, memory:M2)
- [assumption] The skip link is drawn in the shared frame as the first focusable element on every screen, because the keyboard commitment requires it and every per-screen accessibility note names a keyboard entry point that presumes it. Requirements Analysis turns it into a testable requirement; the wireframes no longer leave it implied. (Q11)
- [assumption] The flows assume the shared counting function and the shared filter builder are the single source of every count on the dashboard, the asset list, the holder directory, and the CSV export, so no flow contains a branch where a count is derived locally. A branch of that kind would reintroduce the disagreement the four-surface group exists to remove. (Q5, memory:M2)
- [assumption] The flows assume the actor on every audit entry is resolved from trusted server-side context and never read from the request, so no flow offers an operator an actor control and no flow branches on the actor. The `Acting as` element stays read-only until the actor-identity decision (PB-00) resolves, at which point the operator-selection candidate would add a step at the head of the write flows and change the wireframes. (Q8, Q16, Q17)
- [assumption] The flows assume a uniqueness collision is a terminal branch on the registration and edit paths, offering exactly two actions — open the existing asset, or change the serial — with no "create anyway", because registration and serial-or-key updates enforce one policy under one shared definition. (Q4, memory:M2)
- [assumption] The flows assume a reason is required for the loss, discard, and recovery transitions and is drawn from the shared loss-reason vocabulary, with the discard reason additionally drawing on the retirement-specific values, because a free-text reason would let the vocabulary drift and the history would stop being queryable. (Q3, memory:M3)
- [assumption] The flows assume recovery is a distinct `recovered` event rather than a return or a re-assignment, and that it lands in `in-stock` rather than `assigned`, so re-assigning a recovered asset is a separate subsequent action with its own audit entry. The recovery leaves `assigned_to` empty and **retains** `last_assigned_to`, exactly as the discard does, so a recovered asset is `in-stock` yet still has a display holder: it is counted under the person who last held it and does not fall into the holder directory's Unassigned row. Only the never-held loss case (F5g) clears both fields. (memory:M3)
- [assumption] The flows assume a discarded asset keeps its row and its full history, stays reachable at its detail URL, remains in the `discarded` bucket and in Total Records, and offers no further lifecycle transition. (memory:M4)
- [assumption] The flows assume the previous holder is preserved and shown separately from the current holder on the detail screen and in the holder directory, so a lost or discarded asset remains attributable to the person who last had it. (Q6, Q7, memory:M4)
- [assumption] The flows assume no loading state appears on any path, because the application is synchronous and server-rendered and the release adds no client-side rendering. (Q10)
- [assumption] The flows assume the release's eight transitions are exactly those in the approved §4.1 transition table, and that `discarded` is terminal among them — no edge leaves `discarded`, because the release does not undo a write-off and does not permit a discarded asset to be marked lost. A discarded asset remains editable, and its row and history remain reachable. (memory:M3, memory:M4)
- [assumption] The flows assume the `returned → lost` edge is approved rather than inferred, and that it reuses the `mark-lost` audit action with a required loss reason rather than carrying an action of its own, because the approved decision set row D3 lists `returned → assigned/lost/discarded` as approved and the POC requirements state the same valid transitions from `returned`. The flows also reconcile the three edge sets explicitly: the approved §4.1 table has ten edges, the map draws eight of them, and the two remaining approved edges — `in-stock → discarded` and `returned → discarded` — are a deliberate omission from this release rather than an error or a removal, on the grounds that a discard resolves a live assignment inline and neither source state has one. Every approved edge appears in exactly one of the drawn or omitted sets, so the counts reconcile without overlap or residue. Those two edges keep their approved standing, and the release-boundary question they raise is carried to the scope stage as a named open question rather than decided here. (Q19, memory:M3, memory:M4)
- [assumption] The flows assume an asset's display holder is its current holder if it has one and otherwise its preserved last holder, and an asset that has never been held has no display holder at all. The directory's rows are disjoint under that single definition, so every asset appears exactly once; a holder row means "this is Dana's" across both currently-held and last-held assets; and the "Unassigned" row holds only the assets that have never been held by anybody, which is why its single chip is `in-stock` and nothing else. A holder's per-holder bucket chips count the assets whose display holder is that holder, so every chip value equals the number of visible rows in its bucket and the chips sum to the row count. The chips are read from the shared counting function, not computed by the directory, and no zero-count chip is shown for a bucket the holder has no asset in. (Q6, Q5, memory:M4)
- [assumption] The flows assume the CSV export produces exactly the rows the asset list is currently showing, under the filter currently applied, with the list's own six-column set including the two separate holder columns and excluding Notes and audit history, and that every cell value is sanitised so it cannot be interpreted as a formula. A filter matching no rows produces a header-only file rather than a failure or an unfiltered export. (Q2, Q5, memory:M2)
- [assumption] The flows assume an asset that was never assigned can be marked lost from `in-stock`, and that such a loss leaves both the current holder and the last holder empty while still requiring a reason. Without this edge the `lost → in-stock` recovery route would be unreachable for an asset that was never handed to anyone. (memory:M3)
- [assumption] The flows assume an edit writes an audit entry under the action name `edit`, distinct from `create` and from every lifecycle action, because an edit changes the asset record without changing its bucket, its holder, or its custody history. The entry's description names the fields that changed and their previous values, and the asset's own identity is excluded from the uniqueness comparison on the edit path so that an asset is never reported as a collision with itself. (Q4, Q15, Q18)
- [assumption] The flows assume the deferred item "pagination and result counts" means the pager and not the count line, so the count lines on the asset list and the holder directory are in the release while the page controls are deferred. Neither flow contains a pagination branch. This is a narrowing of an ambiguous deferral phrase and not the promotion of a deferred capability: the count lines are the visible half of the approved count-consistency condition, and nothing else in the deferred item — no pager, no page-size control, no page navigation, and no separate result-count mechanism — is brought into the release. (Q1, memory:M2, memory:M3)
- [assumption] The flows assume the empty states are deferred and therefore not built by this release: no flow asserts an empty-list arrival, a zero-result message, or a reset affordance as behaviour the release delivers, and the list retains the POC's bare empty row. The empty-state branches that appear in F1 and F2 are drawn only to mark them as outside the release and to record how the later increment should distinguish the empty database from the zero-result filter. (Q1, memory:M3)
- [assumption] The flows assume every reason-bearing dialog keeps its submit control enabled and answers a submit with no reason chosen by showing the `A reason is required.` message and writing nothing, so the "no reason" branch on the mark-lost, discard and recover flows is reachable and always ends with the asset's state unchanged. (Q3, memory:M3)

[Answer]: A. Accept assumptions

## Consolidated Summary Confirmation

- Looks correct
- Request changes

[Answer]: Looks correct

The confirmation rests on one verification, one reconciliation, and the
resolution of the second advisory review's findings.

The verification: `returned → lost` is explicitly approved upstream rather than
inferred — decision set row D3 lists `returned → assigned/lost/discarded` as
"All proposed", the resulting §4.1 transition table lists
`returned → assigned, lost, discarded`, POC requirement FR4.4 states the valid
transitions from `returned`, and the POC's own transition map allows the edge.
It is retained with the `mark-lost` audit action and a required loss reason,
and recorded as such in both deliverables.

The reconciliation: the approved §4.1 table has ten edges, the lifecycle map
draws eight of them, and two are left undrawn. Both deliverables now carry a
ten-row table setting out the approved edges 1–10, marking rows 3
(`in-stock → discarded`) and 9 (`returned → discarded`) as omitted, and stating
that every approved edge appears in exactly one of the drawn or omitted sets,
so the three sets reconcile without overlap or residue. Both omitted
transitions keep their approved standing intact, are neither withdrawn nor
silently removed, and are
carried to the scope stage as a named open question (Q19). The twelve design
decisions and the other approved scope boundaries are unchanged.

The review's findings: the second advisory review confirmed the first round's
five findings as resolved and raised five Major and three Minor findings of
its own — internal contradictions between a frame and the prose beside it, and
between the two deliverables. All eight are now resolved. The F4 frame draws
all four of Dana Reyes's rows so they match its chips and its row count, and
match the W6 frame for the same holder. The W3 main frame no longer offers an
Assign control on an `assigned` asset, because the approved §4.1 table has no
`assigned → assigned` edge; Assign appears only on the `in-stock` variant.
Both "Sources Consumed" sections now state the stage's real counts — nineteen
confirmed answers and thirty-four accepted assumptions — instead of the stale
"seven and four". The reason dialogs' submit buttons are labelled
`[Discard asset]` and `[Recover asset]` in both documents, while the trigger
buttons on the detail screen keep their own distinct labels. The F5e recovery
now states its effect on both holder fields: `assigned_to` empty,
`last_assigned_to` retained, which is what keeps a recovered asset under its
last holder rather than in the Unassigned row. F4's rule is stated as the
one-directional implication it actually is — never held ⟹ `in-stock` — with the
recovered asset named as the counter-case to the converse. W6 now states that
"Showing 14 holders" counts distinct display holders and excludes the
Unassigned row, that the directory therefore shows 15 rows, and marks the ten
holder rows it does not draw as elided. W7 draws the `in-stock` variant of the
consequence paragraph alongside the `assigned` one and tabulates which status
produces which. The approved decision set is untouched throughout, and no
implementation work has begun.
