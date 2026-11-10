# Accessibility Checklist — Asset Tracker MVP

**Stage**: refined-mockups (inception)
**Intent**: 261106-asset-tracker-mvp
**Space**: default
**Scope**: feature
**Date**: 2026-11-10

A per-screen checklist for the Asset Tracker MVP's accessibility floor, plus a
release-level section for the commitments that apply application-wide.

The floor is **WCAG 2.1 Level AA**. It is the level the release's screens are
drawn against; it is not weakened anywhere in this checklist, and no weaker
threshold is accepted.

---

## How this checklist is read

Each row carries four things: the **commitment**, the **mechanism** by which
this screen satisfies it, the **keyboard path** through it, and the
**verification method** by which a reader can confirm it.

**Verification methods.** Four methods appear, and each names what it is:

| Method | What it means |
|---|---|
| **Automated** | A check performed by the automated accessibility checker across the screen's rendered markup. The checker's selection is a Domain Design dependency — see the note at the end of this document. |
| **Rendered** | A check performed against the rendered page, asserting on the markup the server returns. |
| **Structural** | A check performed by inspection of the template and the rendered markup, asserting on an element's presence, its attributes or its relationships. |
| **Manual** | A check performed by a person, using the keyboard or a screen reader. |

**The per-screen notes are a release artifact, not rendered into the
application.** They are documentation, and they are therefore not asserted by a
rendering test.

---

## The seven commitments

Every screen is checked against these seven, plus the skip-link requirement.

| # | Commitment | The floor it comes from |
|---|---|---|
| C1 | Colour is never the only carrier of meaning | 1.4.1 Use of Color |
| C2 | Every interactive element is reachable and operable by keyboard | 2.1.1 Keyboard, 2.1.2 No Keyboard Trap |
| C3 | Focus is visible wherever it rests, and is not trapped outside a modal | 2.4.7 Focus Visible, 2.4.3 Focus Order |
| C4 | Form errors are associated with their field | 3.3.1 Error Identification, 3.3.2 Labels or Instructions |
| C5 | Structure is programmatic — one `h1`, headings in order, the landmarks, and tables with a `<caption>` and `scope` | 1.3.1 Info and Relationships, 2.4.1 Bypass Blocks |
| C6 | Status changes are announced | 4.1.3 Status Messages |
| C7 | Target size and contrast meet Level AA | 2.5.5 Target Size, 1.4.3 Contrast (Minimum) |
| C8 | **The skip link is the first focusable element on every screen** | 2.4.1 Bypass Blocks |

---

## Per-screen checklists

### W1 — Reconciliation Dashboard

| # | Commitment | Mechanism | Keyboard path | Verification |
|---|---|---|---|---|
| C1 | Colour is never the only carrier of meaning | Each bucket tile carries its bucket name as text beside its count; the tile's chip colour is supplementary | — | **Structural**: each tile's accessible name contains the bucket name and the count |
| C2 | Every interactive element is keyboard-reachable | Every bucket tile is a native `<a>`; no clickable `<div>` exists on the screen | `Tab` from the skip link to the `Dashboard` nav link, then to the tiles in reading order; `Enter` on a tile opens the filtered list | **Automated** + **Manual** |
| C3 | Focus is visible and not trapped | No modal on this screen; the browser's default focus outline applies | — | **Manual** |
| C4 | Form errors are associated with their field | Not applicable — the dashboard renders no form | — | **Structural**: no form control is present |
| C5 | Structure is programmatic | One `h1` "Reconciliation"; `h2` "Status" and `h2` "Attention"; landmarks `header`, `nav`, `main`; each tile is a `link` in a `group` | — | **Automated** + **Structural**: exactly one `h1`; the heading order is h1 → h2 → h2; the three landmarks are present |
| C6 | Status changes are announced | Not applicable — the dashboard is a read surface and renders no transition | — | **Structural**: no `role="status"` region is claimed for this screen |
| C7 | Target size and contrast meet AA | Each tile is at least the size of the `.btn` treatment it reuses; the tile's text uses `--fg` on `--bg` | — | **Automated** + **Rendered**: the computed contrast of each tile's text against its background |
| C8 | The skip link is the first focusable element | The shared frame's skip link | `Tab` once from the top of the document reaches the skip link | **Automated**: the first focusable element in the document is the skip link |
| — | **Keyboard entry point** | The `Dashboard` navigation link, marked `aria-current="page"` and distinguished by weight and underline rather than by colour | `Tab` once to the skip link, then to the `Dashboard` link | **Structural**: the nav link carries `aria-current="page"` and a weight-and-underline treatment |

---

### W2 — Asset List

| # | Commitment | Mechanism | Keyboard path | Verification |
|---|---|---|---|---|
| C1 | Colour is never the only carrier of meaning | The status chip's text is the status name; the nav's active state is weight and underline | — | **Structural**: the chip's rendered text is one of the five display labels |
| C2 | Every interactive element is keyboard-reachable | Every control is a native `<input>`, `<select>` or `<button>`; the asset name is a native `<a>` | `Tab` to the `Search` input, through the four selects, to `Apply`, to `Reset`, to `Export CSV`, then through the table's asset links | **Automated** + **Manual** |
| C3 | Focus is visible and not trapped | No modal on this screen | — | **Manual** |
| C4 | Form errors are associated with their field | Not applicable — the filter form carries no validation state | — | **Structural**: the filter form has no error region |
| C5 | Structure is programmatic | One `h1` "Assets"; the results table carries a `<caption>` and `scope` on each of its six column headers; landmarks `header`, `nav`, `main` | — | **Automated** + **Structural** |
| C6 | Status changes are announced | The count line is plain text, not a live region — the page is re-rendered server-side and the release adds no client-side rendering | — | **Structural**: the count line carries no `role="status"` |
| C7 | Target size and contrast meet AA | The buttons and controls inherit the `.btn` and `.form` treatments; the table's header text uses `--muted` on `#fafbfd` | — | **Automated** + **Rendered** |
| C8 | The skip link is the first focusable element | The shared frame's skip link | `Tab` once | **Automated** |
| — | **Keyboard entry point** | The `Search` input, the first focusable element in `<main>` after the skip link | `Tab` past the skip link and the top bar | **Structural** |

**The `Reset` control's own requirement.** The control is keyboard-reachable
and operable, and carries an accessible name that identifies it as resetting
the filters — a control named only by its position or by a glyph fails this
requirement.

**Verification**: **Automated** (reachable and named), **Manual** (`Tab` to
it, `Enter` activates it, and the list re-renders unfiltered), **Rendered**
(the accessible name is "Reset").

---

### W3 — Asset Detail

| # | Commitment | Mechanism | Keyboard path | Verification |
|---|---|---|---|---|
| C1 | Colour is never the only carrier of meaning | The status chip's text is the status name; the `system` actor is marked by its own text, not by colour | — | **Structural** |
| C2 | Every interactive element is keyboard-reachable | Every action is a native `<button>` inside a `<form>`; the asset links and the history entries are in the document flow | `Tab` to the first action control, through the remaining actions, to `Edit asset`, to `Back to list` | **Automated** + **Manual** |
| C3 | Focus is visible and not trapped | No modal on the screen itself; the dialogs it opens trap focus correctly (see W7–W8) | — | **Manual** |
| C4 | Form errors are associated with their field | The refused-transition message is a `role="alert"` region that receives focus, and it states the asset's current status in words | — | **Automated** + **Rendered**: the region's text names the current status; no error code appears in the markup |
| C5 | Structure is programmatic | One `h1` naming the asset; `h2` "History" and `h2` "Notes"; the history is an `<ol>` of `<li>` entries because it is a sequence, not a grid; the actions panel is a `<section>` with an accessible name; landmarks `header`, `nav`, `main` | — | **Automated** + **Structural** |
| C6 | Status changes are announced | The returned markup carries a `role="status"` region naming the new status, and the new status is present in the response | — | **Automated** + **Rendered**: the region's text is "Status is now Lost." |
| C7 | Target size and contrast meet AA | The action controls inherit `.btn`; the discard action is `.btn.warn`; the discard note uses `--muted` | — | **Automated** + **Rendered** |
| C8 | The skip link is the first focusable element | The shared frame's skip link | `Tab` once | **Automated** |
| — | **Keyboard entry point** | The first action control in the Actions panel | `Tab` past the skip link and the top bar | **Structural** |

**The `History` and `Notes` headings are the skip targets within the page.**

---

### W4 — New-Asset Form

| # | Commitment | Mechanism | Keyboard path | Verification |
|---|---|---|---|---|
| C1 | Colour is never the only carrier of meaning | The error block's colour is supplementary to its text; the warning's text names the collision | — | **Structural** |
| C2 | Every interactive element is keyboard-reachable | Every control is a native `<input>`, `<select>`, `<textarea>` or `<button>`; the "Open existing asset" link is a native `<a>` | `Tab` to the `Category` select, through `Name`, `Serial or key`, `Model`, `Notes`, to `Cancel` and `Create asset` | **Automated** + **Manual** |
| C3 | Focus is visible and not trapped | No modal | — | **Manual** |
| C4 | Form errors are associated with their field | The inline warning is bound to the serial input by `aria-describedby` and announced with `role="alert"`; the submit-time collision block is a `role="alert"` region that receives focus; the validation block is the POC's `.errors` region | — | **Automated** + **Rendered** + **Structural**: the serial input's `aria-describedby` points at the warning's id |
| C5 | Structure is programmatic | One `h1` "New asset"; the form is a `<form>` with an accessible name; landmarks `header`, `nav`, `main` | — | **Automated** + **Structural** |
| C6 | Status changes are announced | The form creates rather than transitions; the success path renders W3, whose announcement region applies there | — | **Structural**: the form's own response carries no status-change claim |
| C7 | Target size and contrast meet AA | The controls inherit `.form input`, `.form select`, `.form textarea` and `.btn` | — | **Automated** + **Rendered** |
| C8 | The skip link is the first focusable element | The shared frame's skip link | `Tab` once | **Automated** |
| — | **Keyboard entry point** | The `Category` select, the first form control | `Tab` past the skip link and the top bar | **Structural** |

**Every input has a real `<label>` bound by `for`/`id`.** Required fields
carry the `required` attribute and `aria-required`; the trailing asterisk is
a visual supplement and is not the only carrier of the required state.

---

### W5 — Edit-Asset Form

| # | Commitment | Mechanism | Keyboard path | Verification |
|---|---|---|---|---|
| C1 | Colour is never the only carrier of meaning | As W4 | — | **Structural** |
| C2 | Every interactive element is keyboard-reachable | As W4 | `Tab` to the `Category` select, through the fields, to `Cancel` and `Save changes` | **Automated** + **Manual** |
| C3 | Focus is visible and not trapped | No modal | — | **Manual** |
| C4 | Form errors are associated with their field | As W4; on this screen the collision can only name **another** asset, because the asset being edited is excluded from its own comparison | — | **Automated** + **Rendered** + **Structural** |
| C5 | Structure is programmatic | One `h1` "Edit asset — <asset name>"; the heading includes the asset name so the screen is identifiable when reached by a skip link or a browser title | — | **Automated** + **Structural** |
| C6 | Status changes are announced | An edit changes no bucket; the success path renders W3 with an unchanged status chip and a new `edit` history entry | — | **Structural**: the success response's announcement names the unchanged status |
| C7 | Target size and contrast meet AA | As W4 | — | **Automated** + **Rendered** |
| C8 | The skip link is the first focusable element | The shared frame's skip link | `Tab` once | **Automated** |
| — | **Keyboard entry point** | The `Category` select, as on the registration form | `Tab` past the skip link and the top bar | **Structural** |

---

### W6 — Assignee Directory

| # | Commitment | Mechanism | Keyboard path | Verification |
|---|---|---|---|---|
| C1 | Colour is never the only carrier of meaning | Each chip carries its bucket name as text; a holder's row states its total as text | — | **Structural** |
| C2 | Every interactive element is keyboard-reachable | Each holder row's disclosure is a native `<button>` with `aria-expanded` and `aria-controls`; the holder's name, total and chips are within a native `<a>`; each expanded asset's name is a native `<a>` | `Tab` to the `Search holders` input, then to each row's disclosure button, then to its link, then into the expansion's asset links | **Automated** + **Manual** |
| C3 | Focus is visible and not trapped | No modal | — | **Manual** |
| C4 | Form errors are associated with their field | Not applicable — the directory renders no form | — | **Structural** |
| C5 | Structure is programmatic | One `h1` "Holders"; each expanded assets region is a `<table>` with a `<caption>` naming the holder; the disclosure's expanded state is announced rather than only visible; landmarks `header`, `nav`, `main` | — | **Automated** + **Structural** |
| C6 | Status changes are announced | The directory is a read surface; no transition is performed on it | — | **Structural** |
| C7 | Target size and contrast meet AA | The disclosure button inherits `.btn`; the chips inherit `.status`; the muted foreground is `--muted` | — | **Automated** + **Rendered** |
| C8 | The skip link is the first focusable element | The shared frame's skip link | `Tab` once | **Automated** |
| — | **Keyboard entry point** | The `Search holders` input | `Tab` past the skip link and the top bar | **Structural** |

**The count line states what it counts** — the rendered line carries the clause
`distinct display holders, excluding Unassigned` beneath the figure, so that a
screen-reader user is not left to infer the rule from the number. The clause
is part of the rendered text, not a tooltip and not an `aria-label` that
replaces it, so the same words reach a sighted reader and a screen-reader
user. **Structural**: assert that the rendered count line contains both the
figure and the qualifier clause.

---

### W7 — The Reason Dialog

| # | Commitment | Mechanism | Keyboard path | Verification |
|---|---|---|---|---|
| C1 | Colour is never the only carrier of meaning | The validation message's colour is supplementary to its text | — | **Structural** |
| C2 | Every interactive element is keyboard-reachable | The reason `<select>`, `Cancel`, the submit control and the close control are native controls | `Tab` cycles inside the dialog; `Enter` on the reason control submits | **Automated** + **Manual** |
| C3 | Focus is visible and not trapped | The background is inert while the dialog is open; focus is trapped inside the dialog and returns to the trigger on close | `Escape` dismisses; `Tab` cannot leave the dialog while it is open | **Manual** |
| C4 | Form errors are associated with their field | `A reason is required.` is rendered beneath the reason control, which carries `required` and `aria-required`, and focus is moved to it | — | **Automated** + **Rendered** |
| C5 | Structure is programmatic | A `<dialog>` with `aria-labelledby` on the heading and `aria-describedby` on the consequence paragraph; the reason `<select>` has a bound `<label>` | — | **Automated** + **Structural** |
| C6 | Status changes are announced | The dialog's own response on success is W3's announcement region; the dialog's error is the `role="alert"` validation message | — | **Rendered** |
| C7 | Target size and contrast meet AA | The dialog's controls inherit `.btn`; the dialog's surface uses `--bg` and `--fg` | — | **Automated** + **Rendered** |
| C8 | The skip link is the first focusable element | The shared frame's skip link, behind the dialog's inert background — the dialog is the surface in focus while it is open | — | **Automated** (on the underlying screen) |
| — | **Keyboard entry point** | The reason control, which receives focus when the dialog opens | `Tab` or `Shift`+`Tab` within the dialog | **Manual** + **Rendered** |

**The consequence paragraph is read before the reason control**, because
`aria-describedby` points at it and the reading order places it first. A
keyboard or screen-reader user therefore hears what the transition does
before choosing the reason.

---

### W8a — The Discard Dialog

| # | Commitment | Mechanism | Keyboard path | Verification |
|---|---|---|---|---|
| C1 | Colour is never the only carrier of meaning | The submit control's warning colour is supplementary to its label "Discard asset" | — | **Structural** |
| C2 | Every interactive element is keyboard-reachable | As W7 | `Tab` cycles inside the dialog; `Enter` on the reason control submits | **Automated** + **Manual** |
| C3 | Focus is visible and not trapped | As W7 — inert background, trapped focus, focus returns to the trigger | `Escape` dismisses | **Manual** |
| C4 | Form errors are associated with their field | As W7 — `A reason is required.` beneath the reason control, with focus moved to it and nothing written | — | **Automated** + **Rendered** |
| C5 | Structure is programmatic | As W7; the heading names the transition and the asset | — | **Automated** + **Structural** |
| C6 | Status changes are announced | The dialog's success response is W3's announcement region, naming `Discarded` | — | **Rendered** |
| C7 | Target size and contrast meet AA | The submit control is `.btn.warn`; the dialog's surface uses `--bg` and `--fg` | — | **Automated** + **Rendered** |
| C8 | The skip link is the first focusable element | As W7 | — | **Automated** (on the underlying screen) |
| — | **Keyboard entry point** | The reason control | `Tab` or `Shift`+`Tab` within the dialog | **Manual** + **Rendered** |

---

### W8b — The Recover Dialog

| # | Commitment | Mechanism | Keyboard path | Verification |
|---|---|---|---|---|
| C1 | Colour is never the only carrier of meaning | As W8a | — | **Structural** |
| C2 | Every interactive element is keyboard-reachable | As W7 | `Tab` cycles inside the dialog; `Enter` on the reason control submits | **Automated** + **Manual** |
| C3 | Focus is visible and not trapped | As W7 | `Escape` dismisses | **Manual** |
| C4 | Form errors are associated with their field | As W7 | — | **Automated** + **Rendered** |
| C5 | Structure is programmatic | As W7; the reason control's label is `Recovery reason` | — | **Automated** + **Structural** |
| C6 | Status changes are announced | The dialog's success response is W3's announcement region, naming `In stock` | — | **Rendered** |
| C7 | Target size and contrast meet AA | As W8a | — | **Automated** + **Rendered** |
| C8 | The skip link is the first focusable element | As W7 | — | **Automated** (on the underlying screen) |
| — | **Keyboard entry point** | The reason control | `Tab` or `Shift`+`Tab` within the dialog | **Manual** + **Rendered** |

---

## Release-level commitments

These apply to every response and every screen, and they are stated once here
rather than repeated in each screen's rows.

### R1 — Every response carries the header contract

| Requirement | Mechanism | Verification |
|---|---|---|
| Every response carries `X-Content-Type-Options: nosniff` and carries no `X-Powered-By` header, on every route and for every status code | The error middleware is the single translation point from a domain error to an HTTP status, and the header contract is applied there and on every successful response | **Rendered**: a request to each route, asserting the header's presence and the other header's absence |

This is the application-wide form of the export response's own contract: a CSV
served without `nosniff` and without a correct `Content-Type` can be sniffed
by the browser as HTML. The export response asserts the part specific to it;
this asserts the whole.

### R2 — Every rendered user-supplied value is escaped

| Requirement | Mechanism | Verification |
|---|---|---|
| An asset name, a note, a model, a serial or licence key, a holder name and a reason drawn from the vocabulary are rendered as text and not as markup, on every released surface that renders one | Every user-supplied value is interpolated with `<%= %>` (escaped), never `<%- %>` (unescaped). The dead `views/_layout.ejs` uses `<%- body %>` for a value that does not exist, so the release's new templates must not copy that pattern | **Rendered**: for each surface, a value containing `<`, `>` and `&` is rendered literally rather than interpreted as a tag or an entity. The surfaces are the asset list, the asset detail, the dashboard, the directory, the registration and edit forms, the reason dialog and the CSV export's cells |

### R3 — Focus visibility, application-wide

| Requirement | Mechanism | Verification |
|---|---|---|
| Focus is visible wherever it rests | The stylesheet carries **no focus rule**, so the browser's default outline applies. A designed focus ring is a design-system concern and is deferred (see `design-system-mapping.md`, gap D1) | **Manual**: `Tab` through each screen and confirm the focus indicator is visible at every stop. **Automated**: the checker's focus-visible rule reports no violation — with the caveat that a default outline can satisfy an automated rule while remaining visually weak, so the manual check is not optional |

### R4 — The announcement region, application-wide

| Requirement | Mechanism | Verification |
|---|---|---|
| A status change is conveyed in the returned markup: the new status is present in the response, and the response carries a `role="status"` or `role="alert"` region whose text names the new status | Every write path's response renders W3 with a visually hidden announcement region carrying the new status's display label | **Rendered**: after each of the eight released transitions, assert the region's text names the new status. **No client-side announcement behaviour is required**, because the release adds no client-side rendering |

### R5 — Escaping, focus return and dismissal, application-wide

| Requirement | Mechanism | Verification |
|---|---|---|
| `Escape`, the cancel control and the close control each dismiss a dialog without acting, and focus returns to the control that opened it | The dialog contract on W7, W8a and W8b | **Manual**: open each dialog, dismiss it by each of the three means, and confirm that nothing was written and that focus returned to the trigger |

### R6 — Target size and contrast, application-wide

| Requirement | Mechanism | Verification |
|---|---|---|
| Each interactive element meets the AA target-size criterion, and each text-and-background pair meets the AA contrast criterion | The release's new surfaces — the dashboard tiles, the dialogs and the fifth `discarded` status chip — are the ones the floor applies to; the application's existing status chips are not re-specified. The fifth chip's pair is fixed at **`#4b5563` on `#f0f1f3`**, which measures **6.69:1** against the 4.5:1 threshold for normal-size text | **Automated**: the checker's target-size and contrast rules report no violation. **Manual**: confirm the target size of the tile, the chip and the dialog buttons against the criterion, because an automated rule's threshold and the criterion's can differ; and confirm the fifth chip's rendered pair measures at or above 4.5:1 against the specified `#4b5563` on `#f0f1f3` |

**Why the fifth chip has its own pair, and why the other four are not
re-specified.** The chip reuses `--muted` (#6b7280) as its foreground in the
wireframes. On the neutral tint the chip needs in order to read as a chip, that
pair measures **4.28:1** — below the 4.5:1 the floor requires — and FR11.1
puts the fifth chip explicitly in scope. The release therefore specifies the
chip's pair as fixed literals, `#4b5563` on `#f0f1f3`, at **6.69:1**. The
application's four existing chips are excluded from this release by FR11.1
itself, which says the POC's existing chips are not re-specified; their own
ratios (`in-stock` 3.81:1, `lost` 3.23:1) are the deferred design system's
work, not this release's, and are recorded in `design-system-mapping.md` so
that the increment inherits the position rather than rediscovering it.

### R7 — The automated checker's selection is a dependency, not a decision

| Requirement | Mechanism | Verification |
|---|---|---|
| An automated accessibility check of every released screen reports no WCAG 2.1 Level AA violation | **No accessibility tooling exists in this repository today.** The checker is new capability work with a dependency-closure implication, because the dependency audit is a blocking merge gate over the production dependency closure | **Dependency**: the checker's selection is a **Domain Design dependency**, recorded there and not chosen at this stage. Until it is selected, the **Manual** and **Rendered** rows in this checklist are the executable verification, and the **Automated** rows are the checks that become executable once the checker exists |

---

## The screens this checklist does not cover

| Not covered | Why |
|---|---|
| A login screen | The actor mechanism is an open decision (I-01 / I-03). Candidate D would add a screen; the other three would not |
| An operator-selection picker | The same reason. The `Acting as` indicator is read-only and carries no control |
| A holder detail page | Holders are derived from assets; the holder row expands in place |
| A bulk-edit or bulk-transition surface | Not named in the approved set |
| A loading state | The application is synchronous and server-rendered; a drawn spinner would misrepresent its behaviour |
| A pager | Deferred with the presentation-polish increment |
| An empty-state treatment | Deferred (US8.10). The release renders the application's existing bare empty row, and the accessibility floor applies to that row as it is rendered |

---

## Sources Consumed

- **wireframes** (`aidlc/spaces/default/intents/261106-asset-tracker-mvp/ideation/rough-mockups/wireframes.md`) — the seven accessibility commitments, the shared frame's skip link and actor indicator, and each screen's accessibility note (heading level, landmarks, keyboard entry point).
- **stories** (`aidlc/spaces/default/intents/261106-asset-tracker-mvp/inception/user-stories/stories.md`) — AC7.2.1 through AC7.2.16, the sixteen criteria that make the floor testable, including the per-screen note requirement (AC7.2.9) and the keyboard entry points (AC7.2.11).
- **requirements** (`aidlc/spaces/default/intents/261106-asset-tracker-mvp/inception/requirements-analysis/requirements.md`) — FR11.1's seven accessibility commitments, FR11.3's WCAG 2.1 AA floor, NFR4.1's accessibility acceptance gate, NFR2.3's escaping requirement and NFR2.6's `nosniff` and `X-Powered-By` header contract.
- **the application's own stylesheet** (`public/styles.css`) — the absence of a focus rule, the `.btn` padding that determines target size, and the colour pairs the contrast checks are performed against.

---

## Review

Reserved for the reviewer at the approval gate.
