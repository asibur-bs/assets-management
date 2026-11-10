# Design System Mapping — Asset Tracker MVP

**Stage**: refined-mockups (inception)
**Intent**: 261106-asset-tracker-mvp
**Space**: default
**Scope**: feature
**Date**: 2026-11-10

The mapping from every surface and component in this release to the rules the
existing stylesheet already carries, together with an explicit list of the
semantic roles the release needs that the stylesheet does not yet carry.

---

## The boundary this mapping holds

The design system is deferred (US8.6). The release's new surfaces therefore
use the application's existing stylesheet's vocabulary, and this artifact does
two things and no more:

1. **Names the existing rules each surface reuses**, so that a developer
   building from the refined mockups finds the rule rather than inventing one.
2. **Names the semantic roles the release needs that the stylesheet does not
   carry**, each marked as deferred to the design-system increment.

It does **not** introduce a token system. A token specified now would be
reworked when the tokens land, and the release's own deferral is explicit that
the design system is the largest single body of new work in the MVP and is
deferred from it.

The one extension the release makes to the existing vocabulary is the fifth
status chip: `discarded` is drawn in the stylesheet's existing neutral grey
family rather than a new semantic token — but with its **own** fixed pair of
values, `#4b5563` on `#f0f1f3`, rather than reusing `--muted` directly. The
reason is contrast: the release's own accessibility floor puts the fifth chip
in scope (FR11.1), and `--muted` (#6b7280) on a neutral tint of itself falls
below the AA threshold — 4.28:1 on `#f0f1f3`, against the 4.5:1 that
WCAG 2.1 Level AA requires for the chip's text. The darker foreground on the
same tint reaches **6.69:1**. The chip stays inside the stylesheet's existing
vocabulary — a neutral grey chip, in the shape of the other four — without
claiming a token the deferred design system will rework.

---

## Part 1 — The existing stylesheet's vocabulary

The rules the release's surfaces reuse. These are the rules that already exist
in `public/styles.css`; no new rule is introduced by this mapping unless it is
listed in Part 2.

| Rule | What it sets | Where the release uses it |
|---|---|---|
| `:root` custom properties | `--bg`, `--fg`, `--muted`, `--border`, `--primary`, `--primary-fg`, `--warn`, `--ok` | Every surface; the source of every colour the release renders |
| `body` | The background, the foreground and the system font stack | Every surface |
| `.container` | `max-width: 960px; margin: 1.5rem auto; padding: 0 1rem` | Every screen's content region — the desktop design of record |
| `.topbar` | The flex bar, the white background and the bottom border | The shared frame's top bar on all eight screens |
| `.brand` | The brand's weight and the removal of its underline | The shared frame's `ASSET TRACKER` |
| `.btn` | The base button: padding, a 6px radius, the border, the white background, the foreground and the pointer cursor | Every button the release adds: `Apply`, `Reset`, `Export CSV`, the action controls, the dialog's cancel and submit controls |
| `.btn.primary` | The primary button's background, foreground and border | `New asset` in the top bar, `Create asset`, `Save changes` |
| `.btn.warn` | The warning button's background and foreground | `Discard asset` in the actions panel and `Discard asset` in the discard dialog |
| `.filters` | The flex row, the gap, the bottom margin and the wrapping | W2's filter region and W6's holder-search region |
| `.filters input, .filters select` | The input's padding, border, radius and background | W2's `Search`, `Category`, `Status`, `Sort` and `Direction` controls; W6's `Search holders` input |
| `.asset-table` | The full-width table, the collapsed borders and the white background | W2's results table, W6's expansion tables |
| `.asset-table th, .asset-table td` | The cell padding, the bottom border and the left alignment | Every table cell in the release |
| `.asset-table th` | The header row's background, size and muted colour | Every column header |
| `.asset-table tr.empty td` | The centred, muted empty row | W2's bare empty row reading "No assets yet." |
| `.status` | The chip's padding, radius, size and default background | Every status chip |
| `.status-in-stock` | The green background and the green foreground | The `In stock` chip |
| `.status-assigned` | The amber background and the amber foreground | The `Assigned` chip |
| `.status-returned` | The indigo background and the indigo foreground | The `Returned` chip |
| `.status-lost` | The red background and the red foreground | The `Lost` chip |
| `.form` | The grid, the gap and the 480px maximum width | W4's and W5's forms |
| `.form label` | The label's grid and gap | Every field group on W4 and W5 |
| `.form input, .form select, .form textarea` | The control's padding, border, radius and inherited font | Every field on W4 and W5, and the dialog's reason `<select>` |
| `.form textarea` | The 100px minimum height | W4's and W5's `Notes` field |
| `.errors` | The red block's background, padding, radius, colour and bottom margin | W4's and W5's validation block, and the dialog's `A reason is required.` message |
| `.details-grid` | The two-column grid, the gap and the bottom margin | W3's field panel — the `Status`, `Category`, `Serial/Key`, `Model`, `Holder`, `Last holder` and four timestamp rows |
| `.details-grid dt` | The term's weight and muted colour | W3's field labels |
| `.audit` | The white block, padding, border, radius and bottom margin | W3's history panel |
| `.actions` | The flex row, the gap, the wrapping and the bottom alignment | W3's actions panel and the dialogs' control rows |
| `.actions .inline` | The inline flex row | W3's assign control and its button |
| `.muted` | The muted foreground | The empty field value `--`, and the `Unassigned` row over an empty estate |

---

## Part 2 — The surfaces and components mapped to the existing rules

### W1 — Reconciliation Dashboard

| Surface | Component | Reuses | Notes |
|---|---|---|---|
| The shared frame | Top bar | `.topbar`, `.brand`, `.container` | Unchanged |
| Headline tile | Active Inventory | `--bg`, `--border`, `--fg`, `.btn` treatment for the tile's border and radius | The tile is a bordered block in the POC's vocabulary. **It is not a button** — it is a link, and the tile's border comes from the same `--border` value the `.btn` rule uses |
| Headline tile | Total Records | The same rules | |
| Bucket tile | In stock / Assigned / Returned / Lost / Discarded | The tile rules plus `.status-in-stock`, `.status-assigned`, `.status-returned`, `.status-lost` and the release's new `.status-discarded` rule | Each tile carries its bucket's chip vocabulary so that the dashboard and the list agree on a bucket's colour. The `Discarded` tile carries the neutral pair `#4b5563` on `#f0f1f3`, not `--muted` — see the contrast position below |
| Attention panel | The two items | `--bg`, `--border`, `--fg` | The panel is a bordered block in the `.audit` treatment |

### W2 — Asset List

| Surface | Component | Reuses | Notes |
|---|---|---|---|
| Filter region | The form and its five controls | `.filters`, `.filters input`, `.filters select`, `.form input`, `.form select` | The five dimensions sit in the existing filter row |
| Filter controls | `Apply` | `.btn.primary` | |
| Filter controls | `Reset` | `.btn` | **New control.** The base button treatment, deliberately not `.primary`, so that the primary action on the screen stays singular |
| Count line | "Showing N of M records" | `.muted` | Plain text in the muted foreground |
| Results table | The six columns | `.asset-table`, `.asset-table th`, `.asset-table td`, `.asset-table tr.empty td` | The two holder columns are two more columns of the existing table |
| Row chips | The status chips | `.status`, `.status-in-stock`, `.status-assigned`, `.status-returned`, `.status-lost` | The chip's **text** is the display label; the class is the stored value, so the existing colour rules keep working unchanged |
| Export action | `Export CSV` | `.btn.primary` | A `<button>` in the page heading, not a link styled as a button |

### W3 — Asset Detail

| Surface | Component | Reuses | Notes |
|---|---|---|---|
| Field panel | The ten field rows | `.details-grid`, `.details-grid dt` | The `Last holder` row is one more term and definition in the existing grid |
| Status chip | The one chip | `.status` plus the bucket's rule | |
| Actions panel | The controls | `.actions`, `.actions .inline`, `.btn`, `.btn.warn` | `Discard asset` is `.btn.warn` — the stylesheet already carries a warning button, and the discard is the release's one warning-coloured action |
| History panel | The entries | `.audit` | |
| Notes | The notes text | `.muted` for the empty case | |
| Discarded note | The note text | `.muted` | The note is informational text, not a control |

### W4 and W5 — Registration and edit forms

| Surface | Component | Reuses | Notes |
|---|---|---|---|
| The form | The five field groups | `.form`, `.form label`, `.form input`, `.form select`, `.form textarea` | The forms are the POC's own form treatment, minus the assignee field |
| The validation block | The error block | `.errors` | The POC's red block, kept for genuine validation failures |
| The collision block | The submit-time block | `.errors` for the block's background and colour | The collision block is a **distinct, more specific block inside** the error block, not a replacement for it |
| The inline warning | The warning under the serial field | `.errors` for the message's colour, `.muted` for the link's text | The warning is inline with the field, not the block at the top |
| The controls | `Cancel` / `Create asset` / `Save changes` | `.btn`, `.btn.primary` | |

### W6 — Assignee Directory

| Surface | Component | Reuses | Notes |
|---|---|---|---|
| Search region | The `Search holders` input | `.filters`, `.filters input` | **New control**, in the existing filter treatment |
| Count line | "Showing N holders" and its qualifier clause | `.muted` | The figure and the clause stating what it counts are both plain text in the muted foreground |
| Holder rows | The row and its chips | `.asset-table`, `.status` and the bucket rules, `.btn` for the disclosure button | The holder's name is a link; the disclosure is a button beside it |
| The expansion | The asset table | `.asset-table`, `.asset-table th`, `.asset-table td` | The expansion is a filtered view of the same table the list renders, and it uses the same rules |
| The Unassigned row | The row | The same rules as any holder row | The row's chips are drawn with the same chip vocabulary, so `[In stock 2] [Lost 1]` is two existing chips and not a new treatment |

### W7, W8a and W8b — The dialogs

| Surface | Component | Reuses | Notes |
|---|---|---|---|
| The dialog | The dialog container | `--bg`, `--fg`, `--border`, the `.btn` radius and border | The dialog is a bordered block in the POC's vocabulary. It is **not** a new surface treatment |
| The heading | The transition's name and the asset's name | The `h1`/`h2` treatment | |
| The consequence paragraph | The paragraph | `--fg` | |
| The reason control | The `<select>` | `.form select` | The reason control uses the form control's own treatment, so it is the same control it would be on a form |
| The validation message | `A reason is required.` | `.errors` | The message uses the error block's colour, without the block's background |
| The controls | `Cancel` / `Mark lost` / `Discard asset` / `Recover asset` | `.btn`, `.btn.primary`, `.btn.warn` | The submit control is the transition's own verb and takes the primary treatment; the discard's submit is `.btn.warn` |

---

## Part 3 — The semantic roles the stylesheet does not yet carry

Each row names a role the release's surfaces need, the rule that would serve
it, and its standing. **Every one of these is deferred to the design-system
increment.** None is implemented in this release, and naming them here is how
the gap becomes visible to the stage that closes it.

| # | Semantic role needed | Where the release needs it | The rule that would serve it | Standing |
|---|---|---|---|---|
| D1 | **A focus indicator** | Every interactive element on every screen. The stylesheet carries **no focus rule at all** — no `:focus`, no `:focus-visible`, no outline management | A visible focus ring, distinct from the default outline only if the default is insufficient, applied to every focusable element | **Deferred** to the design system. The release's accessibility floor requires focus to be visible wherever it rests, so the rule is required — but the rule is a system-level concern, and a one-off focus rule specified now would be replaced by the tokenised version. |
| D2 | **A semantic status token for `discarded`** | W1's `Discarded` bucket tile, W2's `Discarded` chip and filter option, W3's `Discarded` chip, W6's `Discarded` chip | A `--status-discarded` pair, in the shape the other four status rules take | **Deferred.** The release specifies the `discarded` chip's pair as fixed literal values — `#4b5563` on `#f0f1f3` — rather than as a token. A token specified now would be reworked when the tokens land. |
| D3 | **A semantic neutral / muted-surface token** | The `discarded` chip's background as a distinct surface rather than a foreground colour | A `--muted-bg` / `--muted-fg` pair, so that a muted surface has a background of its own rather than borrowing `--muted` as a foreground | **Deferred.** The release specifies the `discarded` chip's pair as fixed literals — a light neutral tint `#f0f1f3` with a darker neutral foreground `#4b5563` — rather than deriving either from `--muted`. |
| D4 | **A spacing scale** | Every gap in the release: the tile grid's gutter, the filter row's gap, the field groups' vertical rhythm, the dialog's internal spacing | A scale of spacing tokens replacing the release's one-off pixel gaps (`.75rem`, `1rem`, `1.5rem` and the `0.4rem` / `0.5rem` control paddings) | **Deferred.** The release inherits the stylesheet's existing ad-hoc spacing unchanged. |
| D5 | **A type scale** | The `h1`, the `h2`s, the table headers' `0.85rem`, the chips' `0.85rem`, the body size | A scale of type tokens | **Deferred.** |
| D6 | **A radius scale** | The buttons' `6px`, the chips' `4px`, the inputs' `4px`, the blocks' `6px` | A scale of radius tokens | **Deferred.** |
| D7 | **A shadow scale** | The dialog, which is the release's only surface that sits above another surface | A scale of shadow tokens | **Deferred.** The release's dialog uses a border and the page background to separate it from the page behind it, with no shadow. |
| D8 | **A semantic surface / elevation pair** | The tiles, the attention panel, the history panel, the table — all of which are white surfaces on `--bg` | A named surface token, so that a surface is not "white" by convention | **Deferred.** |
| D9 | **A semantic interactive / accent token for the focus ring and for the primary action's hover and active states** | The `.btn` family and the focus ring | An accent token with interaction states | **Deferred.** |
| D10 | **A semantic danger token for the destructive action's confirmation state** | The discard dialog's submit control and the refused-transition message | A danger token pair, distinct from `--warn`'s single-colour use | **Deferred.** The release reuses `.btn.warn` and `--warn`. |
| D11 | **A semantic link token** | The asset-name links, the holder-name links, the "Open existing asset" and "Change the serial" actions, the bucket tiles' links | A link token, since the stylesheet has no link rule at all — links inherit the body's foreground colour and are distinguished only by the browser's underline | **Deferred.** |
| D12 | **An iconography set** | The release's controls are all text-labelled, so no icon is required. An icon set is a design-system concern for the increment that introduces one | An icon set with a size scale | **Deferred.** No icon is drawn or needed in this release, because every control carries a text label and no control is named only by a glyph. |
| D13 | **A light-theme implementation with an extension path to dark** | Every surface. The stylesheet is a single light theme with hard-coded light values (`#fff`, `#fafbfd`, `#eef`) mixed with the custom properties | A theme implementation whose values are all driven by tokens, so a dark theme is a token set rather than a rewrite | **Deferred.** The workbook's section 11 is the authoritative source for the design-system requirements. |

---

## What this release does to the stylesheet

| Change | Detail |
|---|---|
| **One new rule** | A `.status-discarded` chip rule, in the shape of the four existing chip rules: `background: #f0f1f3; color: #4b5563;`. The pair is fixed as literals rather than derived from `--muted`, because `--muted` (#6b7280) on that tint measures **4.28:1** and the release's own floor puts the fifth chip in scope under FR11.1 — the darker foreground reaches **6.69:1**, above the 4.5:1 that WCAG 2.1 Level AA requires. The four existing chip rules are unchanged, and the stylesheet's own `--muted` custom property is left as it stands. |
| **New classes for new structures** | Class names for the release's new blocks — the dashboard tiles, the attention panel, the holder rows, the dialogs, the collision block and the announcement region. These are **structural** class names; they carry no new colour, spacing, radius or type values, and each takes its visual values from the existing rules above. |
| **No change to** | The `:root` custom properties, `body`, `.container`, `.topbar`, `.brand`, the `.btn` family, the `.filters` family, the `.asset-table` family, the `.status` family, the `.form` family, `.errors`, `.details-grid`, `.audit`, `.actions` or `.muted`. |
| **No token system** | No CSS custom property is added, renamed or removed. The `.status-discarded` chip's two literal values are not custom properties, and are not a token in any other sense. |

### The contrast position on the fifth chip, stated for the implementer

The release's floor is WCAG 2.1 Level AA, and the chip's text is normal-size
text, so the threshold is **4.5:1**. The implementer has one number to hold
to, and the mapping fixes the pair that meets it.

| Pair | Ratio | Against the 4.5:1 threshold |
|---|---|---|
| `--muted` (#6b7280) on `#f0f1f3` | 4.28:1 | **Fails** — this is why the chip does not reuse `--muted` |
| `--muted` (#6b7280) on `#ffffff` | 4.83:1 | Passes, but the chip needs a tinted background to read as a chip |
| **`#4b5563` on `#f0f1f3`** | **6.69:1** | **Passes with margin** — the specified pair |

The existing four chips are **not** re-specified, because FR11.1 excludes the
POC's existing chips from this release's scope, and that exclusion is not
this stage's to reverse. The release therefore adds a compliant fifth chip
without touching four non-compliant ones it was not asked to touch — and
records that position here so the design-system increment inherits it rather
than rediscovering it. The existing chips' own ratios (`in-stock` 3.81:1,
`lost` 3.23:1) are recorded here for the increment's benefit, and they are
that increment's work.

---

## The rules the release's own accessibility floor needs but does not add

Two requirements in the release's accessibility commitments cannot be met by
the stylesheet as it stands, and both are recorded rather than quietly
addressed.

| Requirement | The stylesheet's state | How the release meets it |
|---|---|---|
| **Focus is visible wherever it rests** | The stylesheet carries no focus rule, so focus falls back to the browser's default outline | The default outline is what the release renders, and it satisfies the commitment. The rule that would *guarantee* it across browsers and states is D1, and it is deferred. The commitment is therefore met by a fallback rather than by a designed indicator — a fact the design-system increment needs to know. |
| **Every interactive element meets the AA target-size criterion** | The stylesheet sets `.btn` padding at `0.45rem 0.9rem` and the input padding at `0.4rem`, which determines the target size | The release inherits those values unchanged. The verification of the criterion against the rendered sizes is in `accessibility-checklist.md`. |

Neither is a reason to change the stylesheet in this release: the first is a
system-level rule and the second is inherited unchanged. Both are recorded
here so that the design-system increment inherits the position rather than
rediscovering it.

---

## Sources Consumed

- **wireframes** (`aidlc/spaces/default/intents/261106-asset-tracker-mvp/ideation/rough-mockups/wireframes.md`) — the extended visual vocabulary, the fifth `discarded` chip's place in the muted grey family, and the deferred set.
- **stories** (`aidlc/spaces/default/intents/261106-asset-tracker-mvp/inception/user-stories/stories.md`) — US8.6's design-system deferral and its enumerated scope, and the criterion that the status chip's text is the status name.
- **requirements** (`aidlc/spaces/default/intents/261106-asset-tracker-mvp/inception/requirements-analysis/requirements.md`) — FR11.1 and FR11.3's accessibility floor and the deferred design-system item.
- **the application's own stylesheet** (`public/styles.css`) — every rule this mapping names, read directly.

---

## Review

Reserved for the reviewer at the approval gate.
