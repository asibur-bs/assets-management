# Refined Mockups — Design Plan and Interview Questions

**Stage**: refined-mockups (inception)
**Intent**: 261106-asset-tracker-mvp
**Space**: default
**Scope**: feature
**Depth**: Standard

This file holds the design plan for the Asset Tracker MVP's refined mockups and
the questions that shape it. The answers recorded below drive the generation of
`mockups.md`, `interaction-spec.md`, `design-system-mapping.md` and
`accessibility-checklist.md` in this directory.

Four upstream facts constrain the plan and are **not** reopened here:

- The **wireframes are the design baseline**. Eight screens were drawn in
  Ideation (W1 dashboard, W2 asset list, W3 asset detail, W4 new-asset form,
  W5 edit-asset form, W6 assignee directory, W7 reason dialog, W8a discard and
  W8b recovery dialogs), with a per-screen accessibility note, a screen-state
  table, and a documented set of deferred and deliberately-absent surfaces.
- The **design system is deferred**. Responsive UI, semantic colour tokens, a
  type scale, spacing tokens, radius and shadow scales, iconography and empty
  states are all approved follow-on items (US8.6, US8.7, US8.10). The refined
  mockups therefore specify *layout, content and behaviour* inside the POC's
  existing visual vocabulary, and do not introduce a token system.
- The **actor-identity mechanism is an open decision** (open items I-01 / I-03;
  requirements OQ1). The `Acting as` indicator is drawn read-only and the
  refined mockups do not make it interactive.
- The **eight released transition edges are fixed** (FR3.2): `in-stock →
  assigned`, `in-stock → lost`, `assigned → returned`, `assigned → lost`,
  `assigned → discarded`, `returned → assigned`, `returned → lost`, `lost →
  in-stock`. `discarded` is terminal. The two approved-but-deferred edges
  (`in-stock → discarded`, `returned → discarded`) get no UI.

---

## Refinement Approach

**What does "refined" mean here?** The wireframes decided *what* each screen
carries. The refined mockups decide *how it is built*: the exact information
architecture inside each screen, the state each control and region is in, the
behaviour of every interaction, and the mapping from each surface to the
release's existing stylesheet.

**What stays fixed.** Screen inventory, screen identity, the four navigation
destinations, the eight released transitions, the reason-dialog contract, the
display-holder rule, the shared-counting rule, the six-column CSV set, the
seven accessibility commitments, and the deferred set.

**What this stage decides.** Component boundaries within each screen, the
states each component carries, the copy, the ordering, the responsive
treatment *within the deferred scope's boundary*, and the accessibility
mechanism behind each commitment.

**What this stage does not decide.** The actor mechanism, the error-code
vocabulary, the domain model, the route shapes, and the persistence strategy.
Those belong to Domain Design.

---

## Embedded Questions

### Q1 — How each released story reaches the screen

The story set is the release's behavioural contract: 30 released stories and
204 acceptance criteria. Most of the story set is behaviour a screen shows;
some of it is behaviour a screen *cannot* show — the concurrency-safe
uniqueness check, the transaction boundary, the migration ordering, the
coverage floor.

How should the refined mockups relate the stories to the screens?

- A. Every released story that has an observable surface is traced to the screen and the component that carries it, and the stories with no surface are named as such with the reason. The refined mockups then assert nothing those stories do not already assert.
- B. Only the story groups that correspond to a screen are traced — US1 (registration), US2 (custody), US3 (lifecycle), US4 (history), US5 (reporting), US6 (editing) — and the foundation story US0.1 and the cross-cutting US7.1 are left out of the mapping entirely.
- C. The mapping runs the other way: each screen is decomposed into the stories that must exist for it, and any gap between a screen and the story set is filled by a new story proposed at this stage.
- D. No formal mapping. The refined mockups describe the screens in full and rely on the story set's own traceability file for the coverage link.
- X. Other (please specify)

[Answer]: A. Every released story with an observable surface is traced to the screen and the component that carries it, and the stories with no surface are named as such with the reason.

### Q2 — Interaction patterns and how far the refinement goes

The release adds six interactions the POC does not have: the dashboard's tiles
and attention panel, the directory's search and expandable rows, the asset
list's `Reset` control, the three reason-bearing dialogs, the edit form, and
the inline duplicate warning.

What level of interaction detail should the refined mockups carry?

- A. Full component-level specification for every new and every changed interaction: the states each control moves through, the trigger, the resulting state, the copy, and the keyboard behaviour — written as `interaction-spec.md` sections following the component-spec template, with the screens themselves drawn as refined ASCII frames.
- B. Screen-level refinement only: sharper frames with the copy fixed and the states annotated, and no separate component specification. The interaction detail is left to Functional Design.
- C. Full specification for the write paths only — the three dialogs, the edit form and the duplicate warning — with the read surfaces refined at screen level only, on the grounds that the read surfaces are the POC's existing screens.
- D. Full component-level specification, plus a set of annotated flow diagrams showing the refined state transitions within each interaction.
- X. Other (please specify)

[Answer]: A. Full component-level specification for every new and every changed interaction, written as `interaction-spec.md` sections following the component-spec template, with the screens themselves drawn as refined ASCII frames.

### Q3 — The screen-state matrix

The wireframes' state table names six states: Empty (deferred), Loading (not
drawn — the application is synchronous and server-rendered), Success, Error,
Export result, and Partial/edge. The story set adds two states the wireframes
did not enumerate: the **collision block** on the registration and edit forms,
and the **zero-match holder search** on the directory.

How should the refined mockups present screen states?

- A. One matrix over all eight screens, with every state each screen can render, marking each cell in the release or as deferred or as future-state guidance — and including the two states the story set added, so the matrix is the single place a reader can check which state belongs to which surface.
- B. Per-screen state lists, each under its own screen section, without a cross-screen matrix.
- C. A matrix over the release's *new* surfaces only — the dashboard, the directory, the dialogs and the edit form — with the POC's existing surfaces left to their own screens.
- D. A matrix restricted to the states the release actually renders, with the deferred and not-drawn states listed separately as a single note.
- X. Other (please specify)

[Answer]: A. One matrix over all eight screens, with every state each screen can render, marking each cell in the release or as deferred or as future-state guidance, and including the two states the story set added.

### Q4 — The design-system boundary

The design system is deferred (US8.6). The POC's stylesheet already carries a
visual vocabulary, and the wireframes extended it in exactly one place: the
fifth `discarded` status chip reuses the stylesheet's existing muted grey
rather than introducing a new semantic token.

How should `design-system-mapping.md` relate the release's surfaces to the
existing stylesheet?

- A. A mapping from every surface and component to the *existing* stylesheet rules it reuses, plus an explicit list of the semantic roles the release needs that the stylesheet does not yet carry — each marked as deferred to the design system rather than implemented now. The mapping therefore names the gap without closing it.
- B. A mapping from every surface to the existing stylesheet rules only, with no gap list. The deferred design system will produce its own token inventory later.
- C. A minimal token set introduced *now* for the new surfaces — a small set of CSS custom properties covering colour, spacing and type — with the full design system deferred. The release then has a token vocabulary, but not a system.
- D. No separate mapping artifact; the mapping is folded into the `interaction-spec.md` component sections as a "styling" row.
- X. Other (please specify)

[Answer]: A. A mapping from every surface and component to the existing stylesheet rules it reuses, plus an explicit list of the semantic roles the release needs that the stylesheet does not yet carry, each marked as deferred to the design system rather than implemented now.

### Q5 — The accessibility floor and how it is checked

The wireframes set a **WCAG 2.1 AA** floor as a design commitment, and the
requirements turned it into FR11.1, FR11.3, NFR4.1 and sixteen criteria under
US7.2. No accessibility tooling exists in the repository; the story set records
that its selection is a Domain Design decision.

What should `accessibility-checklist.md` be?

- A. A per-screen checklist that carries the seven commitments and the skip-link requirement, each with the specific mechanism on that screen, the keyboard path, and the verification method — plus a release-level section for the commitments that are application-wide (focus visibility, the announcement region, escaping, target size and contrast). The automated checker's selection is named as a Domain Design dependency, not chosen here.
- B. A per-screen checklist only — one row per screen per commitment — with the application-wide commitments restated in each screen's rows.
- C. A single consolidated checklist of the AA floor's success criteria, checked once rather than per screen, with the per-screen notes left in the wireframes.
- D. A per-screen checklist that additionally selects the automated checker and records the specific tool and configuration, so the gate is executable from this artifact.
- X. Other (please specify)

[Answer]: A. A per-screen checklist that carries the seven commitments and the skip-link requirement, each with the specific mechanism on that screen, the keyboard path and the verification method, plus a release-level section for the application-wide commitments. The automated checker's selection is named as a Domain Design dependency, not chosen here.

### Q6 — Responsive behaviour inside a deferred scope

Responsive UI is deferred (US8.7) alongside the design system. The wireframes
draw desktop frames at the POC's 960px container and say so. The stage
protocol, however, names a responsive behaviour spec as part of this stage's
output.

How should responsive behaviour be handled?

- A. A **constrained** responsive spec: the desktop treatment is the design of record, and the spec records only the *minimum* behaviour the release must not break — the container width, the two-column regions' stacking order, and the table's horizontal-scroll affordance — with the full breakpoint treatment named as deferred to the design-system increment. The design of record is stated per screen so that no reader mistakes this for a responsive design.
- B. Full responsive behaviour per screen, at the component-spec template's three breakpoints (mobile <768px, tablet 768–1024px, desktop >1024px), because the component-spec template's format requires those rows.
- C. No responsive content at all. The responsive rows in the component-spec template are marked "not applicable — deferred", and the deferred item carries no design content from this stage.
- D. Full responsive behaviour for the new surfaces only — the dashboard, the directory and the dialogs — with the POC's existing screens unchanged.
- X. Other (please specify)

[Answer]: A. A constrained responsive spec: the desktop treatment is the design of record, and the spec records only the minimum behaviour the release must not break, with the full breakpoint treatment named as deferred to the design-system increment.

### Q7 — The API surface the designs assume

The designs are drawn against a server-rendered application with no
client-side rendering, so every interaction is a server round-trip or a plain
form post. The story set specifies what the server must do; it does not
specify the routes.

Should the refined mockups name an assumed request/response contract?

- A. Yes — but only the *interaction-level* contract each design assumes: which request each control issues, what the response changes, and what the response carries for the announcement region. No route paths, no JSON shapes, no handler names. The contract is written as the design's assumption on the domain side, so Domain Design can satisfy or correct it.
- B. No. The designs state only the user-visible behaviour; the request contract belongs entirely to Domain Design and Contract Design.
- C. Yes, with concrete route paths and request fields, so the designs are directly implementable and the contract-design stage starts from a worked example rather than from scratch.
- D. A formal contract per interaction, written as an interface the designs depend on, with the route and the shape left as explicit open slots for Contract Design to fill.
- X. Other (please specify)

[Answer]: A. Yes, but only the interaction-level contract each design assumes, with no route paths, no JSON shapes and no handler names, written as the design's assumption on the domain side.

### Q8 — The refined copy

The wireframes fixed the *shape* of the release's copy — the reason dialog's
consequence paragraph has two variants, the discard button says "Discard asset"
rather than "Confirm", the collision block offers exactly two actions — but left
wording to be written at this stage.

How should the copy be handled?

- A. Write the exact copy for every new and changed string: the dialog headings and consequence paragraphs for all three transitions across all three origin statuses, the validation and collision messages, the empty-field and count-line labels, and the export control. The copy is written so that no string in the release is left to a developer to invent, and so that the wording itself can be checked against the story criteria.
- B. Fix the copy only for the strings a story criterion names — the required-reason message, the button labels, the collision actions — and leave the surrounding labels to the implementation.
- C. Keep the wireframes' copy verbatim wherever it exists, and write new copy only for surfaces the wireframes did not draw in full.
- D. Write the copy for the write paths only, leaving the read surfaces' labels as they are in the POC.
- X. Other (please specify)

[Answer]: A. Write the exact copy for every new and changed string, so that no string in the release is left to a developer to invent.

### Q9 — The empty states and the deferred-presentation line

Empty states are deferred (US8.10), and the story set records the release's
actual consequences in detail: the asset list renders the POC's bare empty row
in both the empty-inventory and the filter-matches-nothing case, so a
zero-result list shows "No assets yet." — a statement that is false when the
inventory is not empty. The directory's zero-match search renders no row at
all, including no "Unassigned" row, and the directory's empty-estate case
renders one row above a count of zero with nothing saying which case it is.

How should the refined mockups handle these three cases?

- A. Draw each of the three cases **as it actually renders in this release** — the bare empty row, the empty directory, and the single-row-over-zero directory — and annotate each with the fact that its designed treatment is deferred. The designs therefore show the release truthfully and carry the future-state guidance alongside.
- B. Do not draw them at all. A deferred state is not drawn, exactly as the wireframes' own rule for the empty state states.
- C. Draw the release's actual rendering as the design of record, and additionally draw the deferred designed treatment as a clearly-marked future-state frame beside it.
- D. Draw only the two zero-result cases — the filtered list and the searched directory — since the empty-inventory case is the POC's own unchanged behaviour, and leave the empty-estate directory case undescribed.
- X. Other (please specify)

[Answer]: A. Draw each of the three cases as it actually renders in this release, and annotate each with the fact that its designed treatment is deferred.

### Q10 — What the reviewer's attention should be on

The review class for this stage is **advisory**, with one iteration, and the
review artifact is `mockups`. The upstream set has already been through two
advisory review rounds, and the reviewer's own closing note at the previous
stage flagged one item for the human's attention rather than resolving it in
the story set.

What should the refined mockups ask the reviewer to focus on?

- A. Focus the review on the **content-and-arithmetic** class of defect the previous rounds found: that every number drawn on a screen reconciles against the shared counting definition, that every string in the copy states a true thing about the release's behaviour, and that every cross-reference points at a criterion that actually asserts what the reference claims. These are the silent failures — the ones that raise no error.
- B. Focus the review on visual and interaction quality — the layouts, the hierarchy, the density, the copy's tone — since the content was already verified at the upstream stages.
- C. Focus the review on accessibility completeness against the AA floor, since that is the release's only external quality gate.
- D. Give the reviewer no specific focus and let the stage's own review request stand as written.
- X. Other (please specify)

[Answer]: A. Focus the review on the content-and-arithmetic class of defect the previous rounds found: that every number drawn on a screen reconciles against the shared counting definition, that every string in the copy states a true thing about the release's behaviour, and that every cross-reference points at a criterion that actually asserts what the reference claims.

---

## Consolidated Summary Confirmation

**Prompt**: Does this all look correct before I generate the artifact?

- Looks correct
- Request changes

[Answer]: Looks correct
