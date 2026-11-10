# Refined Mockups — Asset Tracker MVP

**Stage**: refined-mockups (inception)
**Intent**: 261106-asset-tracker-mvp
**Space**: default
**Scope**: feature
**Date**: 2026-11-10

The refined mockups for the Asset Tracker MVP: eight screens, drawn as
refined ASCII frames, with the exact copy for every new and changed string,
one cross-screen state matrix, and the trace from each released story to the
screen and the component that carries it.

This artifact is the stage's `review_artifact`. The component-level
specification of each interaction lives in `interaction-spec.md`; the
stylesheet mapping lives in `design-system-mapping.md`; the accessibility
floor lives in `accessibility-checklist.md`. The design plan and the ten
answered questions that shaped this artifact live in
`refined-mockups-questions.md`.

---

## What "refined" adds to the wireframes

The wireframes decided **what** each screen carries. These mockups decide
**how it is built**: the exact information architecture inside each screen,
the state each control and region is in, the copy, the ordering, and the
mapping from each surface to the release's existing stylesheet.

| Aspect | Wireframes (Ideation) | Refined mockups (here) |
|---|---|---|
| Frames | Eight screens drawn | The same eight screens, redrawn with the copy fixed and the regions ordered |
| Copy | Shapes named; wording left open | Exact copy for every new and changed string |
| States | A five-row state table across the set | One cross-screen matrix covering every state each screen can render, including the two the story set added |
| Interaction | Named at screen level | Specified at component level in `interaction-spec.md` |
| Counts | Illustrative figures | Figures reconciled against the story set's named reconciliation seed |
| Accessibility | Seven commitments and a per-screen note | A per-screen checklist with a mechanism, a keyboard path and a verification method |

**What did not change.** The screen inventory, the screen identities, the four
navigation destinations, the eight released transition edges, the
reason-dialog contract, the display-holder rule, the shared-counting rule,
the six-column CSV set, the seven accessibility commitments, and the deferred
set are all fixed upstream and are carried here unchanged.

**One correction is carried forward.** The wireframes state that the
directory's "Unassigned" row carries a single `in-stock` chip, on the
premise that "every bucket other than `in-stock` requires a prior holder to
reach". The released `in-stock → lost` edge falsifies that premise: an asset
registered into stock and never handed to anybody can be marked lost, and it
then has neither a current holder nor a preserved previous holder. FR3.6's
pass/fail says such an asset "falls in the 'Unassigned' row", and the story
set's reconciliation seed states the chip breakdown as `[In stock 2] [Lost 1]`.
The wireframes are corrected, not the story set's rule bent. The Unassigned
row in W6 below draws the **breakdown**.

---

## The shared frame

Every screen sits in the same frame. This is the POC's existing frame, with
the navigation extended and the actor indicator added.

```
+-----------------------------------------------------------------------+
| Skip to main content                                                   |
+-----------------------------------------------------------------------+
| ASSET TRACKER      Dashboard | Assets | Holders      [New asset]      |
|                                                  Acting as: A. Okonkwo|
+-----------------------------------------------------------------------+
| <main>                                                                 |
|                                                                       |
+-----------------------------------------------------------------------+
```

**The top bar.** `Dashboard`, `Assets` and `Holders` are the three navigation
destinations; `New asset` is the action. The active destination carries
`aria-current="page"` and is marked by weight and underline, never by colour
alone.

**The skip link.** The first focusable element on every screen, visually
hidden until it receives focus. It is drawn here because every screen's
keyboard entry point presumes it.

**The actor indicator.** Rendered at the right of the top bar on every screen,
including the read-only ones. It is **read-only in this release**: it carries
no control, because actor information supplied in a write request is never
trusted. It shows the actor the server resolved — the same value that actor
entry would carry — and the indicator and the history never name different
actors.

The indicator's **value is provisional**: the actor-identity mechanism is an
open decision, blocked on I-01 / I-03. The frame reserves a place for the
value; it does not assert which mechanism fills it. The frame above shows
`A. Okonkwo` as the placeholder for the resolved actor.

---

## The reconciliation seed

Every figure drawn below is reconciled against the story set's **named**
reconciliation seed — eight assets, so that a reader can check the arithmetic
without a running system.

| # | Status | Current holder | Preserved previous holder |
|---|---|---|---|
| 1 | `in-stock` | null | null |
| 2 | `in-stock` | null | null |
| 3 | `assigned` | Dana Reyes | null |
| 4 | `assigned` | Dana Reyes | null |
| 5 | `returned` | null | Dana Reyes |
| 6 | `lost` | null | Dana Reyes |
| 7 | `lost` | null | null |
| 8 | `discarded` | null | Chris Patel |

Derived from the seed, and reconciled against it everywhere it appears:

| Quantity | Value | Derivation |
|---|---|---|
| Total Records | **8** | every asset row |
| Active Inventory | **7** | every bucket except `discarded` |
| Bucket counts | **2 / 2 / 1 / 2 / 1** | `in-stock` / `assigned` / `returned` / `lost` / `discarded`; sum **8** |
| Available to assign | **2** | the `in-stock` bucket |
| Directory count line | **2** | distinct display holders, excluding "Unassigned" |
| Directory rendered rows | **3** | Dana Reyes, Chris Patel, "Unassigned" |
| Dana Reyes's row | **4 assets** | two `assigned`, one `returned`, one `lost` |
| Chris Patel's row | **1 asset** | the `discarded` one, by its preserved previous holder |
| "Unassigned" row | **3 assets** | two `in-stock` and the never-held `lost` one |
| "Unassigned" chips | `[In stock 2] [Lost 1]` | sum **3**, equal to the row's total |
| CSV data rows | **8** | the unfiltered list |

The four count-consuming surfaces — dashboard, asset list, assignee directory,
CSV export — all read from the one shared counting definition. Every number
below comes from that definition.

---

## W1 — Reconciliation Dashboard

The landing page. Two headline tiles, a five-bucket breakdown, and an
attention panel.

```
+-----------------------------------------------------------------------+
| ASSET TRACKER      Dashboard | Assets | Holders      [New asset]      |
|                                                  Acting as: A. Okonkwo|
+-----------------------------------------------------------------------+
| <main>                                                                 |
|                                                                       |
|  h1  Reconciliation                                                  |
|                                                                       |
|  +-------------------------+  +-------------------------+              |
|  |  Active Inventory       |  |   Total Records         |              |
|  |                         |  |                         |              |
|  |           7             |  |           8             |              |
|  |                         |  |                         |              |
|  |  available to assign    |  |  every asset ever       |              |
|  |           2             |  |   registered,           |              |
|  |                         |  |   never deleted         |              |
|  +-------------------------+  +-------------------------+              |
|                                                                       |
|  h2  Status                                                          |
|                                                                       |
|  +-------------+ +-------------+ +-------------+ +-------------+        |
|  | In stock    | | Assigned    | | Returned    | | Lost        |        |
|  |      2      | |      2      | |      1      | |      2      |        |
|  +-------------+ +-------------+ +-------------+ +-------------+        |
|                                                                       |
|  +-------------+                                                     |
|  | Discarded   |                                                     |
|  |      1      |                                                     |
|  +-------------+                                                     |
|                                                                       |
|  h2  Attention                                                       |
|                                                                       |
|  +--------------------------------------------------------------------+|
|  | 2 assets marked lost — no recovery recorded                       ||
|  | 1 asset discarded                                                 ||
|  +--------------------------------------------------------------------+|
|                                                                       |
+-----------------------------------------------------------------------+
```

**The arithmetic the frame satisfies.** The five bucket tiles are the source
of both headline numbers, so the frame reconciles on its face.

| Quantity | Definition | Value |
|---|---|---|
| Bucket tiles | In stock 2 + Assigned 2 + Returned 1 + Lost 2 + Discarded 1 | **8** |
| Total Records | every bucket, including `discarded` | **8** |
| Active Inventory | every bucket except `discarded` (2 + 2 + 1 + 2) | **7** |
| Available to assign | the `in-stock` bucket | **2** |
| Attention — lost | the `lost` bucket | **2** |
| Attention — discarded | the `discarded` bucket | **1** |

The two headline numbers agree with the tiles under both readings: the tiles
sum to 8, which is Total Records, and 8 − 1 discarded = 7, which is Active
Inventory. The Active Inventory tile's "available to assign" sub-metric is 2,
which is the `in-stock` bucket — the same figure the directory's "Unassigned"
row's `In stock` chip counts, because on this seed every in-stock asset is
unheld.

**Every bucket tile is a link.** Each tile links to the asset list filtered to
that bucket, so each figure on the dashboard offers a direct path to the
assets behind it. The five links carry the five bucket values as their
filter.

**The Attention panel carries two separate items, not a sum.** The `lost`
figure and the `discarded` figure are separate items, each equal to a whole
bucket count, and neither is qualified by a time window or by a partial-bucket
filter. A summed attention figure may appear alongside them but does not
replace them; this frame does not draw one. The panel is **not** a fifth
counting surface — every number on it is read from the same shared counting
function through the same filter builder.

**The copy.** Headings: `Reconciliation`, `Status`, `Attention`. Tile labels:
`Active Inventory`, `Total Records`, `In stock`, `Assigned`, `Returned`,
`Lost`, `Discarded`. Sub-metric label: `available to assign`. Supporting
sentence under Total Records: `every asset ever registered, never deleted`.
Attention items: `2 assets marked lost — no recovery recorded` and
`1 asset discarded`.

The attention lines are pluralised by count: `1 asset discarded`, not
`1 assets discarded`. The plural form is fixed by the count.

> **Accessibility note (W1):** h1 "Reconciliation", with h2 "Status" and h2
> "Attention"; landmarks `header`, `nav`, `main`; keyboard entry point: the
> `Dashboard` navigation link, which is the first focusable element after the
> skip link and is marked `aria-current="page"`. Each tile is a link whose
> accessible name names the bucket and its count. Colour is not the only
> carrier of meaning: each tile's bucket name is text.

---

## W2 — Asset List

The working surface, and the second of the four count-consuming surfaces.

```
+-----------------------------------------------------------------------+
| ASSET TRACKER      Dashboard | Assets | Holders      [New asset]      |
|                                                  Acting as: A. Okonkwo|
+-----------------------------------------------------------------------+
| <main>                                                                 |
|                                                                       |
|  h1  Assets                                      [Export CSV]       |
|                                                                       |
|  +--------------------------------------------------------------------+|
|  | Search: [_________________]  Category: [All categories v]          ||
|  | Status: [All statuses   v]  Sort: [Name           v]              ||
|  | Direction: [Ascending      v]                                     ||
|  |                                 [Apply]  [Reset]                 ||
|  +--------------------------------------------------------------------+|
|                                                                       |
|  Showing 8 of 8 records                                              |
|                                                                       |
|  +--------------------------------------------------------------------+|
|  | Name          | Category         | Serial / Key | Status   | Holder||
|  |                |                  |              |          |        ||
|  |---------------|------------------|--------------|----------|--------||
|  | ThinkPad X1   | hardware         | SN-4471      | Assigned | Dana R ||
|  | ThinkPad X1   | hardware         | SN-4472      | Assigned | Dana R ||
|  | Dell Latitude | hardware         | SN-4468      | Returned | --     ||
|  | USB-C Dock    | hardware         | SN-4503      | Lost     | --     ||
|  | ThinkPad X1   | hardware         | SN-9930      | Lost     | --     ||
|  | Surface Laptop | hardware       | SN-9910      | In stock | --     ||
|  | Figma Org     | software-license | KEY-9912     | In stock | --     ||
|  | Cisco AnyConnect | software-license | KEY-8802   | Discarded| --     ||
|  +--------------------------------------------------------------------+|
|                                                                       |
|  Legend: [In stock] [Assigned] [Returned] [Lost] [Discarded]        |
|                                                                       |
+-----------------------------------------------------------------------+
```

**The count line.** `Showing 8 of 8 records` carries **two** figures: the
*shown* figure — how many records the screen is rendering — and the *matching*
figure — how many records match the applied filter. Both come from the shared
counting function. On the seed, all eight assets match, so the two figures
coincide; they differ whenever a filter narrows the result. The shown figure
never exceeds the matching figure. The line reports no third figure: the
count is of records, and the total population is not a separate figure this
line carries.

**The filter form carries exactly five dimensions.** Search text, category,
status, sort and direction. The release adds no sixth. The status filter's
option set offers a choice for each of the five buckets plus an "all
statuses" option; the category filter's option set offers `hardware` and
`software-license` plus an "all categories" option — the same two categories
the registration form accepts.

**The `Reset` control is new in this release.** The POC's filter form carries
Apply but no Reset. Activating Reset clears **every** filter dimension —
search text, category, status, sort and direction — and returns the list to
the unfiltered state in one action: the list is re-rendered from the cleared
filter without requiring a second Apply. Its accessible name identifies it as
resetting the filters.

**The `Export CSV` action is new in this release.** It is the fourth
count-consuming surface. Its scope is the filtered rows; its columns are the
list's columns in the list's order — Name, Category, Serial / Key, Status,
Holder, Last holder — and its row count equals the list's matching count.
Every string cell is prefixed with a single quote when it begins with `=`,
`+`, `-`, `@`, a tab or a carriage return. The export is a `<button>` in the
page heading, not a link styled as a button.

**The two holder columns are separate and never fall back to each other.**
`Holder` shows the current holder and is empty when there is none; `Last
holder` shows the preserved previous holder and is empty when there is none.
The frame above shows two `assigned` assets with a populated Holder and an
empty Last holder, a `returned` asset and a `lost` asset with an empty Holder
and a populated Last holder that the elided columns carry, and a `discarded`
asset whose Holder is empty and whose Last holder names the person it was
discarded from.

**The status chip carries the status name as text.** The stored value stays
`in-stock` in the database, in the CSV export and in the filter's option
values; the displayed text is the shared display label.

| Stored status | Displayed label | Chip class |
|---|---|---|
| `in-stock` | In stock | `.status-in-stock` |
| `assigned` | Assigned | `.status-assigned` |
| `returned` | Returned | `.status-returned` |
| `lost` | Lost | `.status-lost` |
| `discarded` | Discarded | `.status-discarded` |

One mapping, four surfaces: W2's chips, W2's status filter options, W3's
status chip and W6's per-holder chips. A reader cannot see `returned` on one
screen and `Returned` on another.

**The `discarded` chip uses the stylesheet's existing muted grey**, not a new
semantic token, because the design system is deferred from this release.

**The two deferred-presentation cases are drawn as they actually render.**
The asset list shows the application's existing bare empty row in **both**
the empty-inventory case and the filter-matches-nothing case:

```
+-----------------------------------------------------------------------+
|  h1  Assets                                      [Export CSV]       |
|                                                                       |
|  Showing 0 of 8 records                                              |
|                                                                       |
|  +--------------------------------------------------------------------+|
|  | No assets yet.                                                     ||
|  +--------------------------------------------------------------------+|
+-----------------------------------------------------------------------+
```

This is what the release renders when a filter matches nothing. The message
`No assets yet.` is **false** when the inventory is not empty, and this stage
does not draw a corrected message — the designed empty-state treatment is
deferred (US8.10) and the release builds neither message. The frame above is
the *filter-matches-nothing* case: the count line reads `Showing 0 of 8
records`, and the bare row is the whole of the list's zero-result treatment.

The **empty-inventory** case is the same bare row with the count line reading
`Showing 0 of 0 records`. The two cases are indistinguishable on the screen,
and that is the release's actual behaviour.

**Pagination.** Not present. The count line is a count, not a pager, and the
pager stays deferred.

> **Accessibility note (W2):** h1 "Assets"; landmarks `header`, `nav`,
> `main`; keyboard entry point: the `Search` input, which is the first
> focusable element in `<main>` after the skip link. The results table
> carries a `<caption>` and a `scope` attribute on each column header; the
> status filter is a labelled `<select>`; the export action is a `<button>`
> in the page heading. The count line is plain text, not an `aria-live`
> region, because the release adds no client-side rendering and the page is
> re-rendered server-side.

---

## W3 — Asset Detail

The screen that carries the audit measure. The POC shows the *latest* audit
row; this shows the whole history with an actor on every entry.

```
+-----------------------------------------------------------------------+
| ASSET TRACKER      Dashboard | Assets | Holders      [New asset]      |
|                                                  Acting as: A. Okonkwo|
+-----------------------------------------------------------------------+
| <main>                                                                 |
|                                                                       |
|  h1  ThinkPad X1 Carbon                                              |
|                                                                       |
|  +------------------------+  +-------------------------------------+  |
|  | Status                  |  | Actions                            |  |
|  | [Assigned]              |  |                                     |  |
|  |                         |  |                                     |  |
|  | Category    hardware    |  | [Mark returned]  [Mark lost]      |  |
|  | Serial/Key  SN-4471     |  |                                     |  |
|  | Model      ThinkPad X1  |  | [Discard asset]                    |  |
|  | Holder      Dana Reyes  |  |                                     |  |
|  | Last holder --          |  |                                     |  |
|  | Assigned at 2026-11-02T09:14:22Z                                ||
|  | Returned at --                                                        ||
|  | Created    2026-09-14T08:02:10Z                                   ||
|  | Updated    2026-11-02T09:14:22Z                                   ||
|  +------------------------+  +-------------------------------------+  |
|                                                                       |
|  h2  History                                                          |
|                                                                       |
|  +--------------------------------------------------------------------+|
|  | 2026-11-02T09:14:22Z  assign     A. Okonkwo                      ||
|  |   Assigned "ThinkPad X1 Carbon" to Dana Reyes.                   ||
|  |--------------------------------------------------------------------||
|  | 2026-09-14T08:02:10Z  create     system                         ||
|  |   Registered "ThinkPad X1 Carbon" as a hardware asset with        ||
|  |   serial or key SN-4471.                                         ||
|  +--------------------------------------------------------------------+|
|                                                                       |
|  h2  Notes                                                            |
|  | Standard corporate issue. Replaced under warranty in 2026.         |
|                                                                       |
|  [Edit asset]  [Back to list]                                        |
|                                                                       |
+-----------------------------------------------------------------------+
```

**The Actions panel shows exactly the edges whose origin is the status its
own chip displays, and no others.**

| Current status | Actions offered |
|---|---|
| `in-stock` | `Assign to [holder]` · `Assign` · `Mark lost` |
| `assigned` | `Mark returned` · `Mark lost` · `Discard asset` |
| `returned` | `Assign to [holder]` · `Assign` · `Mark lost` |
| `lost` | `Recover asset` · `Edit asset` |
| `discarded` | `Edit asset` only |

The frame above is an `assigned` asset, so it carries exactly the three
actions of the `assigned` row — and deliberately **no** `Assign` control,
because there is no `assigned → assigned` edge. `discarded` is terminal: no
lifecycle control appears for it.

**The discard action's label is `Discard asset`**, matching the dialog's
submit label, so that the button that opens the dialog and the button that
confirms it in it use the same words.

**The history is an ordered list of entries, newest first**, each showing a
timestamp, an action name and an actor. The `system` actor on the backfilled
entry is rendered with a marker distinguishable from a person's — the actor
name itself, `system`, is the marker, and it is text rather than colour.

**The two holder fields are separate, and neither falls back to the other.**
`Holder` shows the current holder; `Last holder` shows the preserved previous
holder. For a currently-`assigned` asset the current holder is populated and
the last holder is **empty** — an asset that is held now has no previous holder
to preserve, and the field says so rather than echoing the holder beside it.
For a `returned` or `lost` asset the current holder is empty and the last
holder is populated, and the difference between the two is the answer to "who
had it before". The two fields carry the same value only where a previous
holder actually exists.

**The four date fields are timestamps, and the labels say so.** `Assigned at`
and `Returned at` name lifecycle moments; `Created` and `Updated` name the
record's own timestamps. `Updated` is the timestamp of the last write to the
record, which the edit path makes more useful rather than less.

### W3 variants

**An `in-stock` asset.** The status is `in-stock`; both holder fields are
empty, because an asset that was never assigned to anybody has no prior
holder to preserve. The panel offers the assign action and the loss action.

```
+------------------------+  +-------------------------------------+  |
| Status                  |  | Actions                            |  |
| [In stock]              |  |                                     |  |
|                         |  | Assign to [_______________]         |  |
| Category    hardware    |  | [Assign]                            |  |
| Serial/Key  SN-9910     |  |                                     |  |
| Model      --           |  | [Mark lost]                         |  |
| Holder      --           |  |                                     |  |
| Last holder --           |  |                                     |  |
+------------------------+  +-------------------------------------+  |
```

**A `lost` asset.** The `Holder` field is empty and `Last holder` is
populated. That contrast is the visible form of the preserved previous holder
doing its job.

```
+------------------------+  +-------------------------------------+  |
| Status                  |  | Actions                            |  |
| [Lost]                  |  |                                     |  |
| Category    hardware    |  | [Recover asset]                     |  |
| Serial/Key  SN-4503     |  |                                     |  |
| Holder      --           |  | [Edit asset]                        |  |
| Last holder Dana Reyes  |  |                                     |  |
+------------------------+  +-------------------------------------+  |
| h2  History                                                          |
| 2026-10-01T11:02:00Z  mark-lost  A. Okonkwo                         |
|   "USB-C Dock" marked as lost. Reason: left on site.                |
|   Last holder: Dana Reyes.                                           |
```

**A `discarded` asset.** The row and the history stay reachable. The panel
carries `Edit asset` and a note that says what the discard did and what
survives it — no lifecycle control, because `discarded` is terminal.

```
+------------------------+  +-------------------------------------+  |
| Status                  |  | Actions                            |  |
| [Discarded]             |  |                                     |  |
| Category    software-li |  | [Edit asset]                        |  |
| Serial/Key  KEY-8802    |  | This asset was discarded. It is no  |  |
| Holder      --           |  | longer part of Active Inventory,    |  |
| Last holder Chris Patel |  | but its record and its history are  |  |
|                         |  | kept.                               |  |
+------------------------+  +-------------------------------------+  |
| h2  History                                                          |
| 2026-11-05T16:22:41Z  discarded  A. Okonkwo                        |
|   "Cisco AnyConnect" discarded. Reason: end of lease.                |
|   Assignment resolved by the discard. Last holder: Chris Patel.     |
```

**The refused-transition case.** A transition attempted from a status that
does not allow it is refused, and the detail screen is re-rendered with the
asset's current status and the controls that status allows, with the refusal
stated in words — no error code is displayed to the user.

```
+-----------------------------------------------------------------------+
|  h1  ThinkPad X1 Carbon                                              |
|  +------------------------+  +-------------------------------------+  |
|  | Status                  |  | Actions                            |  |
|  | [Assigned]              |  |                                     |  |
|  |                         |  | [Mark returned]  [Mark lost]      |  |
|  |                         |  |                                     |  |
|  |                         |  | [Discard asset]                    |  |
|  +------------------------+  +-------------------------------------+  |
|                                                                       |
|  ! That change is not available for this asset's current status.     |
|    The asset is now Assigned.                                         |
|                                                                       |
+-----------------------------------------------------------------------+
```

> **Accessibility note (W3):** h1 "ThinkPad X1 Carbon" with h2 "History" and
> h2 "Notes"; landmarks `header`, `nav`, `main`; keyboard entry point: the
> first action control in the Actions panel. The history is an `<ol>` of
> `<li>` entries rather than a table, because it is a sequence rather than a
> grid; the action panel is a `<section>` with an accessible name; `History`
> and `Notes` are the skip targets within the page. The refusal block is a
> `role="alert"` region.

---

## W4 — New-Asset Form

```
+-----------------------------------------------------------------------+
| ASSET TRACKER      Dashboard | Assets | Holders      [New asset]      |
|                                                  Acting as: A. Okonkwo|
+-----------------------------------------------------------------------+
| <main>                                                                 |
|                                                                       |
|  h1  New asset                                                        |
|                                                                       |
|  +--------------------------------------------------------------------+|
|  | Category *                                                         ||
|  |   [hardware                                             v]        ||
|  |                                                                       ||
|  | Name *                                                              ||
|  |   [                                                  ]            ||
|  |                                                                       ||
|  | Serial or key *                                                    ||
|  |   [SN-4471                                           ]            ||
|  |   ! A hardware asset with serial "SN-4471" already exists.        ||
|  |     ThinkPad X1 Carbon — [Open existing asset]                    ||
|  |                                                                       ||
|  | Model                                                               ||
|  |   [                                                  ]            ||
|  |                                                                       ||
|  | Notes                                                               ||
|  |   [                                                  ]            ||
|  |                                                                       ||
|  |                              [Cancel]  [Create asset]              ||
|  +--------------------------------------------------------------------+|
|                                                                       |
+-----------------------------------------------------------------------+
```

**The form carries five fields and no assignee field.** Category, name,
serial or key, model and notes. The POC's optional "Assigned to" field is
**removed**: it invited an administrator to record something that did not
happen, because the asset stayed `in-stock` and only entered `assigned`
through the assign action. A registration that supplies an assignee does not
assign the asset.

**The inline duplicate warning.** As the administrator types a serial or
key, the server checks it against the shared comparison definition —
case-insensitive, whitespace-trimmed, category-scoped. The check is issued
when the field **loses focus**, so the warning is produced by a server
round-trip rather than by client-side rendering. The warning is **advisory**:
dismissing it leaves the form as typed and the submit control available.

**The submit-time collision block.** Inline checking reduces collisions; it
does not eliminate them, because the check and the write are not the same
operation and because two administrators can type the same serial at the
same time. The submit path therefore has its own block, drawn at the top of
the form because at submit time the whole form is being judged.

```
+-----------------------------------------------------------------------+
| ! This serial already exists.                                        |
|                                                                       |
|   Category   hardware                                                |
|   Serial     SN-4471                                                 |
|   Asset      ThinkPad X1 Carbon — assigned to Dana Reyes             |
|                                                                       |
|   [Open existing asset]        [Change the serial]                   |
+-----------------------------------------------------------------------+
```

**Two actions, and only two.** Open the existing asset, or change the serial.
There is no "create anyway" — the collision is a genuine conflict under the
shared uniqueness definition, and registration and serial-or-key updates
enforce the *same* policy. The block also covers the concurrency case, where
the collision appeared after the administrator began filling the form: the
message says so rather than showing a bare failure.

**The error block.** The POC renders server-side validation errors in a red
block at the top of the form. That block is kept for genuine validation
failures, and the collision block is a distinct, more specific block inside
it.

**The copy.** Field labels: `Category`, `Name`, `Serial or key`, `Model`,
`Notes`. Required fields are marked with a trailing `*` and carry the
`required` attribute and `aria-required`; the asterisk is a visual
supplement, not the only carrier. The submit control reads `Create asset`;
the cancel control reads `Cancel`. The inline warning's two lines read
`A hardware asset with serial "SN-4471" already exists.` and
`ThinkPad X1 Carbon — [Open existing asset]`.

> **Accessibility note (W4):** h1 "New asset"; landmarks `header`, `nav`,
> `main`; keyboard entry point: the `Category` select, which is the first
> form control. Every input has a real `<label>` bound by `for`/`id`; the
> inline duplicate warning is associated with the serial input by
> `aria-describedby` and announced with `role="alert"`; the submit-time
> collision block is a `role="alert"` region that receives focus on render.

---

## W5 — Edit-Asset Form

The form as it opens — the asset's own values, and no collision warning:

```
+-----------------------------------------------------------------------+
| ASSET TRACKER      Dashboard | Assets | Holders      [New asset]      |
|                                                  Acting as: A. Okonkwo|
+-----------------------------------------------------------------------+
| <main>                                                                 |
|                                                                       |
|  h1  Edit asset — ThinkPad X1 Carbon                                 |
|                                                                       |
|  +--------------------------------------------------------------------+|
|  | Category *                                                         ||
|  |   [hardware                                             v]        ||
|  |                                                                       ||
|  | Name *                                                              ||
|  |   [ThinkPad X1 Carbon                                ]            ||
|  |                                                                       ||
|  | Serial or key *                                                    ||
|  |   [SN-4471                                           ]            ||
|  |                                                                       ||
|  | Model                                                               ||
|  |   [ThinkPad X1                                         ]          ||
|  |                                                                       ||
|  | Notes                                                               ||
|  |   [Standard corporate issue.                         ]          ||
|  |                                                                       ||
|  |                              [Cancel]  [Save changes]             ||
|  +--------------------------------------------------------------------+|
|                                                                       |
+-----------------------------------------------------------------------+
```

And the same form after the administrator types a serial that *another* asset
already holds:

```
+-----------------------------------------------------------------------+
|  h1  Edit asset — ThinkPad X1 Carbon                                 |
|  +--------------------------------------------------------------------+|
|  | Category *                                                         ||
|  |   [hardware                                             v]        ||
|  | Name *                                                              ||
|  |   [ThinkPad X1 Carbon                                ]            ||
|  | Serial or key *                                                    ||
|  |   [SN-9930                                           ]            ||
|  |   ! A hardware asset with serial "SN-9930" already exists.        ||
|  |     ThinkPad X1 — [Open existing asset]                         ||
|  | Model                                                               ||
|  |   [ThinkPad X1                                         ]          ||
|  | Notes                                                               ||
|  |   [Standard corporate issue.                         ]          ||
|  |                              [Cancel]  [Save changes]             ||
|  +--------------------------------------------------------------------+|
+-----------------------------------------------------------------------+
```

**The edit form is the registration form with the asset's current values
filled in**, and it behaves the same way. That sameness is the point.

**The asset's own serial is not a collision with itself.** The first frame
carries no collision warning, because the comparison excludes the asset being
edited. An edit that does not change the serial, or that changes it only in
casing or surrounding whitespace, is accepted and reports no collision.

**The uniqueness policy is the same on both paths.** One comparison
definition, one database arbiter, one error code — on registration and on
serial-or-key updates alike.

**What the edit form cannot change.** Status, current holder and preserved
previous holder are left unchanged by any edit; they are not directly
editable. The lifecycle moves only through the explicit actions on the detail
screen.

**What the edit form can change.** Category, name, serial or key, model and
notes. Category and serial-or-key are editable *together* deliberately: the
uniqueness definition is category-scoped, so changing a serial's category
changes which collisions are possible, and the check re-runs against the new
category.

**An edit writes an audit entry.** A successful save appends one `edit`
entry — distinct from `create` and from every lifecycle action — whose
description names the fields that changed and their previous values. A save
that changes nothing appends no entry and does not change the asset's update
timestamp.

**The copy.** The heading reads `Edit asset — <asset name>`. The submit
control reads `Save changes`; the cancel control reads `Cancel`. The
collision warning and the submit-time collision block are the same copy as
W4's, with the colliding asset's name substituted.

> **Accessibility note (W5):** h1 "Edit asset — ThinkPad X1 Carbon";
> landmarks `header`, `nav`, `main`; keyboard entry point: the `Category`
> select, as on the registration form. Same labelling, `aria-describedby`
> association for the inline warning, and `role="alert"` on the submit-time
> block. The heading includes the asset name so the screen is identifiable
> when reached by a skip link or a browser title.

---

## W6 — Assignee Directory

```
+-----------------------------------------------------------------------+
| ASSET TRACKER      Dashboard | Assets | Holders      [New asset]      |
|                                                  Acting as: A. Okonkwo|
+-----------------------------------------------------------------------+
| <main>                                                                 |
|                                                                       |
|  h1  Holders                                                         |
|                                                                       |
|  +--------------------------------------------------------------------+|
|  | Search holders: [_________________]                              ||
|  +--------------------------------------------------------------------+|
|                                                                       |
|  Showing 2 holders                                                    |
|  distinct display holders, excluding Unassigned                       |
|                                                                       |
|  +--------------------------------------------------------------------+|
|  | > Dana Reyes            4 assets   [Assigned 2] [Returned 1]       ||
|  |   v                                                                ||
|  |   ThinkPad X1 Carbon   SN-4471   [Assigned]  currently held       ||
|  |   ThinkPad X1 Carbon   SN-4472   [Assigned]  currently held       ||
|  |   Dell Latitude 5540  SN-4468   [Returned]  last holder           ||
|  |   USB-C Dock           SN-4503   [Lost]     last holder           ||
|  +--------------------------------------------------------------------+|
|  | > Chris Patel           1 asset    [Discarded 1]                  ||
|  +--------------------------------------------------------------------+|
|  | > Unassigned             3 assets   [In stock 2] [Lost 1]          ||
|  +--------------------------------------------------------------------+|
|                                                                       |
+-----------------------------------------------------------------------+
```

**What `Showing 2 holders` counts, and the line that says so.** The number is
the count of **distinct display holders** — the distinct holder names that
appear on the assets — and it **does not include the "Unassigned" row**,
because "Unassigned" is a row, not a holder: no asset names it as a holder.
The count is therefore a count of holders, not of rows, and the directory
renders **3 rows**: the 2 holders and the Unassigned row. On the seed the count
line reads **2** and the directory renders **3 rows**, so the rendered row
count is one greater than the figure.

**The line states what it counts.** "Showing 2 holders" on its own does not say
*which* holders, nor whether the "Unassigned" row is among them — and the
directory renders such a row. The line therefore carries the clause
**`distinct display holders, excluding Unassigned`** beneath the figure. This
is the clause AC5.3.8 requires the line to carry, and it is what makes the
figure and the rendered rows reconcilable by a reader rather than only by a
test.

**What the per-holder chips count.** A holder's chips count the assets whose
display holder is that holder, broken down by the asset's status bucket. The
chips are a breakdown of the expanded rows below them, not a separate
measure, and every chip value equals the number of visible rows in its
bucket.

| Row | Total | Chips | Chip sum | Expanded rows |
|---|---|---|---|---|
| Dana Reyes | 4 | `[Assigned 2] [Returned 1] [Lost 1]` | 4 | 4 |
| Chris Patel | 1 | `[Discarded 1]` | 1 | not drawn (collapsed) |
| Unassigned | 3 | `[In stock 2] [Lost 1]` | 3 | not drawn (collapsed) |

Dana Reyes's chips carry **three** buckets, because her four assets are two
`assigned`, one `returned` and one `lost`. No zero-count chip is shown for a
bucket she has no asset in.

**The Unassigned row carries a chip breakdown, not a single chip.** The
wireframes state that this row carries a single `in-stock` chip, on the
premise that "every bucket other than `in-stock` requires a prior holder to
reach". The released `in-stock → lost` edge falsifies that premise, so the
row's chips break down by the bucket of the never-held assets it holds: two
`in-stock` assets and one never-held `lost` asset, reading
`[In stock 2] [Lost 1]`, summing to the row's 3.

**What a holder's rows mean.** The display holder of an asset is its current
holder if it has one, and otherwise its preserved last holder; an asset that
has never been held by anybody has no display holder at all. The Unassigned
row is therefore reserved for never-held assets, and an asset that *was*
held and no longer is appears under that person.

**The expansion marks which is which.** Each expanded row states `currently
held` or `last holder`, so a reader can always tell which bucket the asset is
in. Each asset links to its detail screen.

**The expansion is a disclosure, and it is separate from the row's
navigation.** Expanding a row reveals the assets inline and does not
navigate. Following the row's link — its name, its total, or its chips —
navigates to the asset list filtered to that holder. The filtered list is a
filter state of the asset list, not a separate holder screen.

**Holder names carry no account affordance.** No avatar, no personal profile
link, no sign-in prompt, no `mailto:`. A holder name is a display name, and
the name *is* the row's link to the filtered asset list.

**The `Search holders` input is new in this release.** Activating it filters
the **holder rows**, not the assets: a holder whose name does not match is
removed from the directory even when that holder holds assets, and a matching
holder's row — with its total, its chips and its expansion — is unaffected.
The matching rule is the POC's existing free-text pattern: case-insensitive
substring matching over the holder name. The release adds no fuzzy matching,
no tokenisation and no field-scoped search.

### W6 — the zero-match search

```
+-----------------------------------------------------------------------+
|  h1  Holders                                                         |
|                                                                       |
|  +--------------------------------------------------------------------+|
|  | Search holders: [zqx____________________________]               ||
|  +--------------------------------------------------------------------+|
|                                                                       |
|  Showing 0 holders                                                    |
|  distinct display holders, excluding Unassigned                       |
|                                                                       |
|  (no rows rendered)                                                   |
|                                                                       |
+-----------------------------------------------------------------------+
```

The search matches no holder, so the directory shows **no holder row** —
and the **"Unassigned" row is also absent**, because "Unassigned" is not a
holder name and is not a search result. The count line reads **0**, and the
rendered row count is therefore **0** as well, not 1. The release builds no
message saying that no holder matched: the screen is simply empty.

### W6 — the empty estate

```
+-----------------------------------------------------------------------+
|  h1  Holders                                                         |
|                                                                       |
|  +--------------------------------------------------------------------+|
|  | Search holders: [_________________]                              ||
|  +--------------------------------------------------------------------+|
|                                                                       |
|  Showing 0 holders                                                    |
|  distinct display holders, excluding Unassigned                       |
|                                                                       |
|  +--------------------------------------------------------------------+|
|  | > Unassigned             0 assets   (no chips)                   ||
|  +--------------------------------------------------------------------+|
|                                                                       |
+-----------------------------------------------------------------------+
```

Over an estate with **no assets at all**, the directory still renders the
"Unassigned" row, and its count line reads **0** — because "Unassigned" is a
row rather than a holder, the row count is one greater than the count line's
figure. The reader is shown one row above a count of zero, with nothing on
the page saying which of the two cases the count line describes.

**These two cases are drawn as they actually render, and each is annotated
with the fact that its designed treatment is deferred.** The empty-estate
frame shows one row above a count of zero; the zero-match frame shows no row
at all. Neither is a corrected design — both are the release's behaviour, and
the designed empty-state treatment is deferred (US8.10).

> **Accessibility note (W6):** h1 "Holders"; landmarks `header`, `nav`,
> `main`; keyboard entry point: the `Search holders` input. Each holder row
> is a disclosure: a `<button>` with `aria-expanded` and `aria-controls`
> names the holder and toggles the asset list beneath it, so the expanded
> state is announced rather than only visible; the expanded assets are a
> `<table>` with a `<caption>` naming the holder. The count line states what
> it counts in words.

---

## W7 — The Reason Dialog

One dialog shape serves every transition that requires a reason.

```
+-----------------------------------------------------------------------+
|                          Asset Tracker                               |
+-----------------------------------------------------------------------+
|                                                                       |
|    +--------------------------------------------------------------------+|
|    |  Mark lost — ThinkPad X1 Carbon                          [X]     ||
|    |                                                                    ||
|    |  This asset is currently assigned to Dana Reyes. Marking it lost   ||
|    |  records who had it and ends the assignment. Dana Reyes is kept    ||
|    |  as the last holder.                                               ||
|    |                                                                    ||
|    |  Reason *                                                          ||
|    |    [ Select a reason...                              v]          ||
|    |                                                                    ||
|    |  ! A reason is required.                                          ||
|    |                                                                    ||
|    |                        [Cancel]        [Mark lost]               ||
|    +--------------------------------------------------------------------+|
|                                                                       |
+-----------------------------------------------------------------------+
```

**The dialog explains the consequence before it asks for the reason.** The
paragraph above the field tells the administrator what the transition does to
the assignment and to the record, so that the reason they give is recorded
against the right event.

**The consequence paragraph is rendered from the asset's current status.**
The shape is fixed — one paragraph, above the reason control — and the
content is not. The release needs three loss variants, because the loss
dialog is reachable from three origin statuses.

| Asset's current status | The consequence paragraph says | Because |
|---|---|---|
| `assigned` | "This asset is currently assigned to Dana Reyes. Marking it lost records who had it and ends the assignment. Dana Reyes is kept as the last holder." | There is a current holder to clear and a last holder to preserve |
| `in-stock` | "This asset is in stock. It has not been assigned to anyone. Marking it lost records it as missing, and there is no holder to keep." | There is no assignment and no prior holder, so nothing is cleared or preserved |
| `returned` | "This asset was returned by Dana Reyes and is not currently assigned. Marking it lost records the loss and keeps Dana Reyes as the last holder." | The assignment has already ended and a previous holder is preserved |

```
+-----------------------------------------------------------------------+
|    +--------------------------------------------------------------------+|
|    |  Mark lost — ThinkPad X1 Carbon                          [X]     ||
|    |                                                                    ||
|    |  This asset is in stock. It has not been assigned to anyone.      ||
|    |  Marking it lost records it as missing, and there is no holder   ||
|    |  to keep.                                                          ||
|    |                                                                    ||
|    |  Reason *                                                          ||
|    |    [ Select a reason...                              v]          ||
|    |                                                                    ||
|    |                        [Cancel]        [Mark lost]               ||
|    +--------------------------------------------------------------------+|
+-----------------------------------------------------------------------+
```

```
+-----------------------------------------------------------------------+
|    +--------------------------------------------------------------------+|
|    |  Mark lost — Dell Latitude 5540                          [X]     ||
|    |                                                                    ||
|    |  This asset was returned by Dana Reyes and is not currently       ||
|    |  assigned. Marking it lost records the loss and keeps Dana        ||
|    |  Reyes as the last holder.                                          ||
|    |                                                                    ||
|    |  Reason *                                                          ||
|    |    [ Select a reason...                              v]          ||
|    |                                                                    ||
|    |                        [Cancel]        [Mark lost]               ||
|    +--------------------------------------------------------------------+|
+-----------------------------------------------------------------------+
```

**The reason comes from the shared loss-reason vocabulary.** The select is
populated from the shared vocabulary, not from free text. The same list is
offered for a loss and for a recovery; the discard offers the shared list
plus the retirement-specific values. The placeholder reads
`Select a reason...`.

**The reason is required, and the submit control is never disabled.** The
submit control stays **enabled** with no reason chosen, and submitting
without one produces the validation message `A reason is required.`
beneath the field, with focus moved to it and nothing written — no status
change, no holder change, no history entry. Disabling the control would make
the message unreachable, and a control that greys out without explanation is
less accessible than one that accepts the click and explains what is missing.

**Focus and dismissal.** Opening the dialog moves focus to the reason
control. `Escape`, the Cancel button and the close control each dismiss it
without acting, and focus returns to the control that opened it.

**The submit control is labelled with the transition's own verb** —
`Mark lost`, `Discard asset`, `Recover asset` — and never with a generic
`Confirm`.

> **Accessibility note (W7):** the dialog is a `<dialog>` element with
> `aria-labelledby` pointing at its heading and `aria-describedby` pointing
> at the consequence paragraph; the background is inert while it is open;
> focus is trapped inside the dialog and returns to the trigger button on
> close; `Escape` dismisses; the reason `<select>` has a bound `<label>`; the
> required state is carried by `required` and `aria-required`; the
> consequence paragraph is read before the reason control.

---

## W8 — The Discard and Recovery Dialogs

Two more reason-bearing transitions, each with its own dialog, because the
consequences differ.

### W8a — Discard

```
+-----------------------------------------------------------------------+
|                          Asset Tracker                               |
+-----------------------------------------------------------------------+
|                                                                       |
|    +--------------------------------------------------------------------+|
|    |  Discard asset — ThinkPad X1 Carbon                      [X]     ||
|    |                                                                    ||
|    |  This asset is currently assigned to Dana Reyes. Discarding it    ||
|    |  resolves the assignment: Dana Reyes is cleared as the current   ||
|    |  holder and kept as the last holder. The asset leaves Active      ||
|    |  Inventory, but its row and full history are kept and stay here. ||
|    |                                                                    ||
|    |  Reason *                                                          ||
|    |    [ Select a reason...                              v]          ||
|    |                                                                    ||
|    |                        [Cancel]        [Discard asset]           ||
|    +--------------------------------------------------------------------+|
|                                                                       |
+-----------------------------------------------------------------------+
```

**The paragraph names what survives.** Discarding does not delete the asset.
The row stays, the history stays, the asset stays in the `discarded` bucket
and in Total Records, and its detail URL keeps working. The dialog says so,
because "discard" is a word that reasonably suggests deletion, and the whole
point of the release's audit floor is that nothing is destroyed. The dialog
also says what the assignment does — resolved inline, holder cleared, last
holder kept.

**The heading names the transition and the asset**, and the submit control is
labelled `Discard asset` — not `Confirm`, and not `Discard`, because a
generic confirm would be ambiguous about what is being confirmed.

**The reason vocabulary is wider here.** The discard reason is drawn from the
shared loss-reason vocabulary **plus** the retirement-specific values. The
select therefore offers the shared values first and then the
retirement-specific ones, in that order.

### W8b — Recover

```
+-----------------------------------------------------------------------+
|                          Asset Tracker                               |
+-----------------------------------------------------------------------+
|                                                                       |
|    +--------------------------------------------------------------------+|
|    |  Recover asset — USB-C Dock                             [X]     ||
|    |                                                                    ||
|    |  This asset was marked lost. Dana Reyes was its last holder.     ||
|    |  Recovering it returns it to stock and records the recovery as   ||
|    |  its own event, naming Dana Reyes.                                ||
|    |                                                                    ||
|    |  Recovery reason *                                                ||
|    |    [ Select a reason...                              v]          ||
|    |                                                                    ||
|    |                        [Cancel]        [Recover asset]           ||
|    +--------------------------------------------------------------------+|
|                                                                       |
+-----------------------------------------------------------------------+
```

**Recovery is its own event, not a return.** The action vocabulary gives
recovery a distinct `recovered` action rather than reusing `assign` or
`return`, and its description names the recovery and the prior holder. The
dialog's wording reflects that: it says the asset "returns to stock", and it
says the recovery is recorded as its own event naming the prior holder. It
does not present recovery as a re-assignment.

**The asset returns to `in-stock`, not to `assigned`.** The dialog says
"returns it to stock", and it offers **no holder field** — recovery ends the
loss, it does not hand the asset to someone. Re-assigning a recovered asset
is a separate, subsequent action on the detail screen.

**The label is `Recovery reason *`, not `Reason *`,** because this dialog's
reason is specifically about the recovery, and the label says so.

**The reason behaves as in W7.** The submit control stays enabled with the
placeholder showing; submitting without a reason produces the same
`A reason is required.` validation message beneath the field, with nothing
written and the asset still `lost`.

> **Accessibility note (W8a, W8b):** same dialog contract as W7 — `<dialog>`
> with `aria-labelledby` on the heading and `aria-describedby` on the
> consequence paragraph, background inert, focus trapped, `Escape` dismisses,
> focus returns to the trigger. The reason `<select>` has a bound `<label>`;
> `required` and `aria-required` carry the required state; the consequence
> paragraph is read before the field, not after it.

---

## The screen-state matrix

One matrix over all eight screens, covering every state each screen can
render. The two states the story set added beyond the wireframes' set — the
**collision block** on the registration and edit forms, and the **zero-match
holder search** on the directory — are included.

| Screen | Empty | Loading | Success | Error | Export result | Partial / edge | Collision block | Zero-match search |
|---|---|---|---|---|---|---|---|---|
| **W1** Dashboard | Deferred | Not drawn | In release | Not drawn | n/a | In release | n/a | n/a |
| **W2** Asset list | Deferred — see the bare-row frame | Not drawn | In release | Not drawn | In release | In release | n/a | n/a |
| **W3** Asset detail | Deferred | Not drawn | In release | In release | n/a | In release | n/a | n/a |
| **W4** New-asset form | n/a | Not drawn | In release | In release | n/a | n/a | **In release** | n/a |
| **W5** Edit-asset form | n/a | Not drawn | In release | In release | n/a | In release | **In release** | n/a |
| **W6** Holder directory | Deferred — see the empty-estate frame | Not drawn | In release | Not drawn | n/a | In release | n/a | **In release** |
| **W7** Reason dialog | n/a | Not drawn | In release | In release | n/a | In release | n/a | n/a |
| **W8a** Discard dialog | n/a | Not drawn | In release | In release | n/a | In release | n/a | n/a |
| **W8b** Recover dialog | n/a | Not drawn | In release | In release | n/a | In release | n/a | n/a |

**What each cell means.**

- **Empty — Deferred.** The designed empty-state treatment is deferred
  (US8.10). The release retains the application's existing bare empty row on
  W2 and W6. Both zero-result cases are drawn above **as they actually
  render**, each annotated with the deferral.
- **Loading — Not drawn.** The application is synchronous and server-rendered
  and the release adds no client-side rendering. A drawn spinner would
  misrepresent how the application behaves, so no screen carries a loading
  state.
- **Success.** W3 after a transition, showing the new status chip and the new
  history entry at the top; W5 after a successful edit, showing the new
  values and a new `edit` entry with an unchanged status chip; W4 after a
  successful registration, redirecting to the detail screen with the
  `In stock` chip and a `create` entry at the top; W7 and W8 after a
  successful submit, closing the dialog and re-rendering W3.
- **Error.** W4 and W5 for validation failures; W4 and W5 for the
  submit-time collision block; W7 and W8 for the missing reason; W3 for a
  refused transition, stated in words.
- **Export result.** Not a screen state — the export produces a file. The
  file has three cases: rows matching the current filter, no rows matching
  the filter (a header-only file), and every string cell prefixed so it
  cannot be interpreted as a formula.
- **Partial / edge.** W3 for an `in-stock` asset, a `lost` asset and a
  `discarded` asset; W6 for a holder whose assets are all last-held.
- **Collision block.** W4 and W5, drawn above.
- **Zero-match search.** W6, drawn above.

---

## The story-to-screen trace

Every released story is traced to the screen and the component that carries
it, or named as having no observable surface with the reason.

### US0 — The foundation

| Story | Surface | Component | Note |
|---|---|---|---|
| **US0.1** The custody history survives the release's own migration | **No observable surface** | — | The schema rebuild, the `audit_log` actor column, the widened status check, the `last_assigned_to` column and the functional unique index are database-level work with no rendered surface. Its **observable consequence** is carried by W3's history panel — every entry shows an actor, and backfilled entries show `system` — and by W3's `Last holder` field, which is the rendered form of the preserved previous holder. The story's own subject, the migration, is verified by the foundation migration's tests, not by a screen. |

### US1 — Registration and uniqueness

| Story | Surface | Component | Note |
|---|---|---|---|
| **US1.1** Register a new asset | W4 | New-asset form; the success path renders W3 | The form's five fields; the removed assignee field |
| **US1.2** One definition of a serial or key | W4, W5 | Inline duplicate warning; submit-time collision block | The comparison itself is not rendered; the *outcome* is |
| **US1.3** The database refuses the same collision | W4 | Submit-time collision block | The refusal's rendered form |
| **US1.4** Two concurrent registrations cannot both succeed | W4 | Submit-time collision block | The concurrency case the block's message covers |

### US2 — Custody

| Story | Surface | Component | Note |
|---|---|---|---|
| **US2.1** Assign an asset | W3 | Actions panel (`Assign to`, `Assign`) | The `in-stock` and `returned` variants |
| **US2.2** Take an asset back | W3 | Actions panel (`Mark returned`) | The `assigned` variant |

### US3 — Lifecycle, reasons and recovery

| Story | Surface | Component | Note |
|---|---|---|---|
| **US3.1** The legal transitions | W3 | Actions panel | The panel's per-status action set |
| **US3.2** Record the loss | W3, W7 | Actions panel (`Mark lost`); the loss dialog | The three origin variants of the consequence paragraph |
| **US3.3** The shared reason vocabulary | W7, W8a, W8b | The reason `<select>` | The same list in the loss and recovery dialogs; the wider list in the discard dialog |
| **US3.4** Retire an asset | W3, W8a | Actions panel (`Discard asset`); the discard dialog | The `assigned` origin only |
| **US3.5** Recover a lost asset | W3, W8b | Actions panel (`Recover asset`); the recovery dialog | The `lost` origin only |
| **US3.6** The audit action vocabulary | W3 | History panel | The seven action names as rendered |
| **US3.7** The reason dialog explains before it asks | W7, W8a, W8b | The consequence paragraph | The dialog's contract |

### US4 — Audit history

| Story | Surface | Component | Note |
|---|---|---|---|
| **US4.1** Read an asset's complete history | W3 | History panel | The `<ol>` of entries |
| **US4.2** The record cannot be rewritten | **No observable surface** | — | Append-only is a database constraint. The user's trust in it is served by W3's history panel showing every entry, but the constraint itself renders nothing, and no released screen lists audit entries across assets. |
| **US4.3** An edit is recorded as a history entry | W3, W5 | History panel; the save path | The `edit` entry, and the unchanged status chip |

### US5 — Inventory reporting

| Story | Surface | Component | Note |
|---|---|---|---|
| **US5.1** Every count comes from one shared definition | W1, W2, W6, and the export action | All count-bearing components | The tiles, the count line, the directory count line and the per-holder chips |
| **US5.2** Reconcile the inventory at a glance | W1 | Headline tiles; bucket tiles; attention panel | |
| **US5.3** See what a named holder has | W6 | Holder rows; the expansion; `Search holders` | |
| **US5.4** Browse and filter the asset list | W2 | The filter form; `Apply`; `Reset`; the count line | |
| **US5.5** Export the asset list to a CSV file | W2 | `Export CSV` | An action, not a screen; it produces a file |
| **US5.6** One definition of a holder | W2, W3, W6 | The two holder columns; the two holder fields; the expansion rows | The definition itself is not rendered; its application is |
| **US5.7** The release's performance is measured | **No observable surface** | — | The six measured quantities are recorded against a stated dataset, and the ceilings are derived from them once the Product Owner approves one. A measurement has no screen, and no released screen displays a performance figure. |

### US6 — Editing and duplicate detection

| Story | Surface | Component | Note |
|---|---|---|---|
| **US6.1** Correct an asset's details | W5 | The edit form; the `Save changes` control | |
| **US6.2** Be told about a duplicate before submitting | W4, W5 | Inline duplicate warning | The `blur`-triggered check |
| **US6.3** Have a duplicate serial refused | W4, W5 | Submit-time collision block | Two actions, no override |
| **US6.4** Register without choosing an assignee | W4 | The new-asset form | The absence of an assignee field |

### US7 — Actor attribution and accessibility

| Story | Surface | Component | Note |
|---|---|---|---|
| **US7.1** Every write is attributed to a trusted actor | Every screen | The `Acting as` indicator; the history panel's actor column | The indicator is read-only on every released screen, including the read-only ones |
| **US7.2** Every screen is operable without a mouse | Every screen | The skip link; every interactive element | The per-screen mechanisms are listed in `accessibility-checklist.md` |

### The two stories with no observable surface

| Story | Why it has none |
|---|---|
| **US0.1** — The custody history survives the release's own migration | The subject is a schema rebuild: the `audit_log` actor column, the widened status check, the `last_assigned_to` column, the functional unique index and the historical backfill. None of it renders. Its observable consequences are carried by W3 — every history entry shows an actor, backfilled entries show `system`, and the `Last holder` field is populated — but the migration itself is verified by the foundation migration's tests, not by a screen. Naming it as "no surface" keeps it from being read as an omission from the design. |
| **US5.7** — The release's performance is measured, not assumed | The subject is six measured quantities recorded against a stated dataset, and ceilings derived from them once the Product Owner approves one (OQ5 is open). A measurement has no screen, and no released screen displays a performance figure. The story is satisfied by the measurement record, not by the UI. |

---

## The deferred-presentation cases, drawn as they render

Three cases are drawn above **as the release actually renders them**, each
annotated with the fact that its designed treatment is deferred. They are
collected here so a reader can see all three in one place, and so that
nobody mistakes the release's behaviour for the intended design.

| Case | Screen | What the release renders | The designed treatment is deferred |
|---|---|---|---|
| Filter matches nothing | W2 | The application's bare empty row reading `No assets yet.` — a statement that is **false** when the inventory is not empty — above a count line reading `Showing 0 of 8 records` | US8.10 |
| Search matches no holder | W6 | **No row at all**, including no "Unassigned" row, above a count line reading `Showing 0 holders` and its qualifier clause. The screen is simply empty | US8.10 |
| Empty estate | W6 | One row — the "Unassigned" row, with no chips — above a count line reading `Showing 0 holders` and its qualifier clause. Nothing on the page says which of the two cases the count line describes | US8.10 |

---

## The copy this stage fixes

Every new and changed string in the release, so that no string is left to a
developer to invent.

### Shared frame

| Element | Copy |
|---|---|
| Skip link | `Skip to main content` |
| Brand | `ASSET TRACKER` |
| Nav destinations | `Dashboard` · `Assets` · `Holders` |
| Primary action | `New asset` |
| Actor indicator | `Acting as: <resolved actor>` |

### W1 — Reconciliation

| Element | Copy |
|---|---|
| Heading | `Reconciliation` |
| Section headings | `Status` · `Attention` |
| Headline tiles | `Active Inventory` · `Total Records` |
| Active Inventory sub-metric | `available to assign` |
| Total Records sub-caption | `every asset ever registered, never deleted` |
| Bucket tiles | `In stock` · `Assigned` · `Returned` · `Lost` · `Discarded` |
| Attention items | `<N> asset(s) marked lost — no recovery recorded` · `<N> asset(s) discarded` |

### W2 — Asset list

| Element | Copy |
|---|---|
| Heading | `Assets` |
| Filter labels | `Search` · `Category` · `Status` · `Sort` · `Direction` |
| Filter options | `All categories` · `hardware` · `software-license` · `All statuses` · `In stock` · `Assigned` · `Returned` · `Lost` · `Discarded` · `Name` · `Ascending` · `Descending` |
| Filter controls | `Apply` · `Reset` |
| Count line | `Showing <shown> of <matching> records` |
| Table headers | `Name` · `Category` · `Serial / Key` · `Status` · `Holder` · `Last holder` |
| Empty row | `No assets yet.` |
| Export control | `Export CSV` |
| Legend | `Legend: In stock Assigned Returned Lost Discarded` |

### W3 — Asset detail

| Element | Copy |
|---|---|
| Detail fields | `Status` · `Category` · `Serial/Key` · `Model` · `Holder` · `Last holder` · `Assigned at` · `Returned at` · `Created` · `Updated` |
| Empty field value | `--` |
| Action controls | `Assign to <holder>` · `Assign` · `Mark returned` · `Mark lost` · `Discard asset` · `Recover asset` · `Edit asset` · `Back to list` |
| Discarded-asset note | `This asset was discarded. It is no longer part of Active Inventory, but its record and its history are kept.` |
| Refused-transition message | `That change is not available for this asset's current status. The asset is now <Status>.` |
| Section headings | `History` · `Notes` |

### W4 and W5 — Registration and edit

| Element | Copy |
|---|---|
| Headings | `New asset` · `Edit asset — <asset name>` |
| Field labels | `Category` · `Name` · `Serial or key` · `Model` · `Notes` |
| Category options | `hardware` · `software-license` |
| Inline warning | `A <category> asset with serial "<serial>" already exists.` / `<asset name> — Open existing asset` |
| Inline warning action | `Open existing asset` |
| Submit-time block heading | `This serial already exists.` |
| Submit-time block fields | `Category` · `Serial` · `Asset` |
| Submit-time block actions | `Open existing asset` · `Change the serial` |
| Controls | `Cancel` · `Create asset` · `Save changes` |

### W6 — Holder directory

| Element | Copy |
|---|---|
| Heading | `Holders` |
| Search label | `Search holders` |
| Count line | `Showing <N> holders` |
| Count-line qualifier | `distinct display holders, excluding Unassigned` |
| Holder-row marker | `currently held` · `last holder` |
| Unassigned row | `Unassigned` |
| Empty-estate row | `Unassigned` with `0 assets` and no chips |

### W7, W8a and W8b — The dialogs

| Element | Copy |
|---|---|
| Dialog headings | `Mark lost — <asset name>` · `Discard asset — <asset name>` · `Recover asset — <asset name>` |
| Loss, `assigned` origin | `This asset is currently assigned to <holder>. Marking it lost records who had it and ends the assignment. <holder> is kept as the last holder.` |
| Loss, `in-stock` origin | `This asset is in stock. It has not been assigned to anyone. Marking it lost records it as missing, and there is no holder to keep.` |
| Loss, `returned` origin | `This asset was returned by <holder> and is not currently assigned. Marking it lost records the loss and keeps <holder> as the last holder.` |
| Discard consequence | `This asset is currently assigned to <holder>. Discarding it resolves the assignment: <holder> is cleared as the current holder and kept as the last holder. The asset leaves Active Inventory, but its row and full history are kept and stay here.` |
| Recovery consequence | `This asset was marked lost. <holder> was its last holder. Recovering it returns it to stock and records the recovery as its own event, naming <holder>.` |
| Reason labels | `Reason` · `Recovery reason` |
| Reason placeholder | `Select a reason...` |
| Validation message | `A reason is required.` |
| Controls | `Cancel` · `Mark lost` · `Discard asset` · `Recover asset` · close control `X` |

---

## What this stage does not decide

- **The actor-identity mechanism.** The indicator reserves a place; it does
  not assert which of the four candidates fills it.
- **The error-code vocabulary.** The screens show errors in words; which code
  each error carries belongs to Domain Design.
- **The domain model, the route shapes and the persistence strategy.**
- **The full responsive treatment.** The desktop frames are the design of
  record; the constrained minimum is in `interaction-spec.md`.
- **The token system.** The mapping names the gap; it does not close it.

---

## Sources Consumed

- **wireframes** (`aidlc/spaces/default/intents/261106-asset-tracker-mvp/ideation/rough-mockups/wireframes.md`) — the eight-screen design baseline, the shared frame, the per-status action sets, the display-holder rule, the per-holder chip rule, the accessibility commitments and the deferred set.
- **user-flow** (`aidlc/spaces/default/intents/261106-asset-tracker-mvp/ideation/rough-mockups/user-flow.md`) — the seven flows (F1–F6, F5a–F5h) the frames' interaction paths correspond to.
- **stories** (`aidlc/spaces/default/intents/261106-asset-tracker-mvp/inception/user-stories/stories.md`) — the 30 released stories and their 204 acceptance criteria, the reconciliation seed and the derived counts.
- **requirements** (`aidlc/spaces/default/intents/261106-asset-tracker-mvp/inception/requirements-analysis/requirements.md`) — FR3.2's eight released edges, FR3.6's Unassigned-row pass/fail, FR3.12's seven audit actions, FR6.4's two-figure count line, FR6.5's directory count rule, FR7.1's attention-panel rule, FR9.2/FR9.3's export contract, FR10.5's two-action collision block and FR11.1/FR11.3's accessibility floor.
- **team-practices** (`aidlc/spaces/default/intents/261106-asset-tracker-mvp/inception/practices-discovery/team-practices.md`) — the team's testing posture, which the frames' verification methods assume.

---

## Review

Reserved for the reviewer at the approval gate.
