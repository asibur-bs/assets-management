# Wireframes — Asset Tracker MVP

## Sources

- [desc] Initial description: "Build the Asset Tracker MVP from the approved Asset Tracker MVP Development Workbook, the POC-vs-MVP gap analysis, the decision brief, and the fully approved 17-item decision set. The MVP adds actor-attributed append-only audit history, previous-holder preservation via last_assigned_to, lost-asset recovery (lost to in-stock), an assigned to discarded transition that resolves the assignment inline, five exclusive status buckets with Active Inventory and Total Records computed by one shared counting function and filter builder, case-insensitive category-scoped serial uniqueness via a functional index with a concurrency-safe application-level fallback, CSV export with formula-injection protection, and an amendment to workbook section 4.1 and section 21.1 Scenario 3 recording Returned as a distinct resting state."
- [scope] Workflow-selected scope: `feature`.
- [Q1] The wireframe set covers eight screens: the five operator-facing surfaces the MVP release adds — the reconciliation dashboard, the assignee directory, CSV export, asset editing, and duplicate detection — plus the three screens the POC already has, the asset list, the new-asset form, and the asset detail.
- [Q2] Registration never assigns. The "Assigned to" field is removed from the registration form, and assignment happens only as a separate, explicit action on the asset detail screen.
- [Q3] Reason capture is shown as a confirmation dialog that collects the reason, for the transitions that require one.
- [Q4] Duplicate detection appears as inline validation on the serial-or-key field at the point of entry, plus a prominent submit-time collision warning naming the colliding asset.
- [Q5] The reconciliation dashboard's primary content is two headline tiles — Active Inventory and Total Records — with the five status bucket tiles below as a breakdown.
- [Q6] The assignee directory is a list of holders, each expandable to their assets. The holder list is derived from the assets themselves rather than from a separate registry.
- [Q7] The asset detail screen's history panel shows the full append-only history, newest first, with the actor on every entry.
- [Q8] The wireframes show a persistent actor indicator in the header, marked as provisional pending the actor-identity mechanism decision.
- [Q9] The navigation structure is a four-item top navigation: Dashboard, Assets, Holders, and a New asset action.
- [Q10] The wireframes cover the desktop form factor only, and state the responsive deferral explicitly.
- [Q11] The wireframes carry a WCAG 2.1 AA floor, alongside the per-screen accessibility note the stage requires.
- [Q12] The wireframes stay inside the POC's existing visual vocabulary, extended only where the new surfaces require it.
- [Q13] The primary customer is internal IT asset administrators who register, assign, and write off assets on behalf of the organisation.
- [Q14] The primary success measure is Audit Completeness — 100% of audit entries carry an actor attribution, and history is never destroyed.
- [Q15] Every lifecycle transition has explicit validation and explicit audit behaviour — a standing condition of the approved decision set.
- [Q16] Actor identity is resolved from trusted server-side context; actor information supplied in a write request is never trusted.
- [Q17] The actor-identity mechanism is in scope but its choice is deferred to the inception stages; it is a named blocking dependency of the foundation workstream, and I-01 / I-03 — whether a trusted authentication mechanism exists anywhere in the organisation — is still open.
- [Q18] The deployment target is a single internal host with a machine-local SQLite file, launched as a long-running process.
- [memory:M2] `aidlc/spaces/default/memory/project.md#Decided`: "The fully approved 17-item Asset Tracker MVP decision set, together with the Asset Tracker MVP Development Workbook, is the binding technical and product contract for the `asset-tracker-mvp` intent; it is not reopened at any stage of that intent, and it carries seven standing conditions — the uniqueness check uses an IMMEDIATE transaction and a non-zero SQLite `busy_timeout` with `SQLITE_BUSY` mapped to a retryable error; the functional-index expression and the application-level comparison predicate use one shared definition; registration and serial/key updates enforce the same uniqueness policy; historical backfills preserve original records and audit traceability and report failures; dashboard, assignee, asset-list, and CSV counts use consistent filtering and counting definitions; every lifecycle transition has explicit validation and audit behaviour; and the existing 66/66 passing test baseline is preserved with regression tests added for newly approved behaviour. Traceability must be maintained between the approved MVP requirements and the POC requirements FR1.3, FR4.4, FR4.5, and FR5.3, and actor identity is resolved from trusted server-side context so actor information supplied in a write request is never trusted. (Stage intent-capture, 2026-11-06)"
- [memory:M3] `aidlc/spaces/default/memory/project.md#Decided`: "The decision set's amendment table names the workbook amendment surface as section 4.1 (transition table, recovery, `in-stock → lost`, `assigned → discarded`), section 4.2.5, section 4.3 (the actor-trust rule), section 4.4, section 6.1, section 6.4, section 6.5, section 9 (Screens 01, 02, 03, 04, 10), section 10, section 21.1, section 21.2, section 22, section 24 (the metric qualifiers the Audit Completeness population relies on), and the two new section 27 sections (Inventory Counting Definitions and Audit Action Vocabulary). The section 24 amendment carries the Audit Completeness qualifier verbatim: pre-MVP history is backfilled to a `system` actor and excluded from this metric. Section 4.1 records the `lost → in-stock` recovery transition with a required recovery reason drawn from the shared loss-reason vocabulary, and requires a distinct `recovered` audit action rather than `assign` or `return`, whose description names the recovery and the prior holder. It also records that complex recovery workflows — partial recovery, credit assignment, dispute handling — remain deferred, distinct from the single included recovery transition. The workbook's remaining MVP feature set is the reconciliation dashboard, the assignee directory, asset editing, duplicate-detection UX, empty states, result counts, pagination, improved search, responsive UI, and a design system. The design-system enumeration is indicative, not exhaustive: workbook section 11 is the authoritative source for the complete design-system requirements, covering semantic color tokens, a typography scale, spacing tokens, radius and shadow scales, iconography, and a light-theme implementation designed for future dark-theme extension. (Stage intent-capture, 2026-11-06)"
- [memory:M4] `aidlc/spaces/default/memory/project.md#Decided`: "The `assigned → discarded` transition resolves the assignment inline and records it: `assigned_to` is cleared, `last_assigned_to` is retained so the holder at discard time stays visible, and a `discarded` audit action records the discard, the prior holder, and the fact that the assignment was resolved by the discard. A discard reason is always required, drawn from the shared loss-reason vocabulary plus retirement-specific values. The asset row and its full history are never deleted; a discarded asset is excluded from Active Inventory but remains present in the `discarded` bucket and in Total Records, and stays accessible at its detail URL with its history intact. (Stage intent-capture, 2026-11-06)"

---

## Purpose and Scope of These Wireframes

These are the low-fidelity wireframes for the Asset Tracker MVP release. They are
the shape of the operator's screens, not the design of them: layout, content, and
the states each screen must be able to show. Visual styling stays deliberately
close to the POC's existing vocabulary because the full design system is deferred
from this release [Q12]. One of the five screen states — the empty state — is
deferred with the other presentation items, so it appears here as future-state
guidance rather than as a state this release must render [Q1] [memory:M3].

**What this document covers.** Eight screens, and the states each one must be able
to render [Q1]:

| # | Screen | New or existing | Delivers |
|---|---|---|---|
| W1 | Reconciliation dashboard | New | Active Inventory, Total Records, and the five status buckets, all from the shared counting function [Q5] |
| W2 | Asset list | Existing, amended | The working surface; the four count-consuming surfaces' shared filter builder; CSV export; the fifth status filter option |
| W3 | Asset detail | Existing, amended | The full append-only history with an actor on every entry; the lifecycle actions; recovery and discard dialogs; `last_assigned_to` [Q7] |
| W4 | New-asset form | Existing, amended | Registration with no assignment affordance; inline duplicate detection; the submit-time collision warning [Q2] [Q4] |
| W5 | Edit-asset form | New | The same uniqueness policy as registration, on the edit path [Q4] |
| W6 | Assignee directory | New | A per-holder view derived from the assets themselves [Q6] |
| W7 | Loss-reason dialog | New | The reason capture for a transition that requires one [Q3] |
| W8 | Discard / recovery dialog | New | The reason capture for the two reason-bearing write-off transitions [Q3] |

**What this document does not do.**

- It does not specify requirements, acceptance criteria, or test cases. Those
  belong to Requirements Analysis.
- It does not name an implementation. The wireframes show what an administrator
  sees; they do not prescribe a route, a template, or a data access path.
- It does not specify a design system. The token system, the type scale, the
  spacing scale, the iconography, and the component library are the deferred
  increment's work [Q12] [memory:M3].
- It does not draw the responsive variants. Desktop only, with the deferral
  stated [Q10].
- It does not draw a login screen, and it does not select an actor mechanism. The
  actor indicator is present and marked provisional [Q8] [Q17].

**How the wireframes are read.** The ASCII blocks are the layout and the content
of each screen in its normal state. Where a screen has materially different
states, the states are drawn separately under the screen. The one-line
accessibility note at the foot of every screen is mandatory: it records the
heading level, the primary landmark regions, and the keyboard entry point.

---

## The Information Architecture

```
+------------------------------------------------------------------+
|  ASSET TRACKER        Dashboard  Assets  Holders      [New asset]|
|                                                     Acting as: ...|
+------------------------------------------------------------------+
|                                                                  |
|  W1 Dashboard  --->  W2 Asset list  --->  W3 Asset detail       |
|        |                    |                      |             |
|        |                    |                      |             |
|        |                    v                      v             |
|        |              W4 New asset          (dialogs W7, W8)     |
|        |                    |                                    |
|        |                    v                                    |
|        |              W5 Edit asset                             |
|        |                                                          |
|        +--> W6 Assignee directory ---> (W2 filtered by holder)  |
|                                                                  |
+------------------------------------------------------------------+
```

Four navigation destinations and one action, in the top bar [Q9]:

- **Dashboard** — the landing page. What the organisation holds, right now.
- **Assets** — the working surface. The list, the filters, the export.
- **Holders** — the per-holder lens. Who has what.
- **New asset** — the action. Registration.

The **Acting as** indicator sits at the right of the top bar, next to the
`New asset` action [Q8]. It is drawn on every screen because it is a property
of the session, not of a screen.

### The three navigations an administrator actually performs

| Journey | Path | Surfaces touched |
|---|---|---|
| Register an asset | `New asset` → W4 → (collision?) → W4 → W2 | New-asset form, asset list |
| Find an asset | `Assets` → W2 → filter → W3 | Asset list, asset detail |
| Reconcile the inventory | `Dashboard` → W1 | Reconciliation dashboard |
| Answer "what does Dana hold?" | `Holders` → W6 → expand → W2 filtered | Assignee directory, asset list |
| Write off an asset | `Assets` → W2 → W3 → action → W8 → W3 | Asset detail, discard dialog |

The full flows, including the error and edge paths, are in `user-flow.md`.

---

## The Shared Frame

Every screen sits in the same frame. This is the POC's existing frame, with the
navigation extended and the actor indicator added.

```
+------------------------------------------------------------------+
| ASSET TRACKER     Dashboard | Assets | Holders      [New asset]  |
|                                                  Acting as: ... |
+------------------------------------------------------------------+
| <main>  h1 ...                                                    |
|                                                                      |
+------------------------------------------------------------------+
```

**The top bar.** `Dashboard`, `Assets`, and `Holders` are the three navigation
destinations; `New asset` is the action [Q9]. The active destination is marked
with `aria-current="page"` — visually by weight and underline, never by colour
alone [Q11].

**The skip link.** The frame begins with a skip link:

```
+------------------------------------------------------------------+
| Skip to main content                                             |
+------------------------------------------------------------------+
```

It is the first focusable element on every screen and is visually hidden until
it receives focus. It is drawn here rather than deferred, because the keyboard
commitment in `## Accessibility Commitments` requires it and every screen's
accessibility note names a keyboard entry point that presumes it — an element
that every screen's note depends on has to be in the frame the notes describe.
It is a single global element, not a per-screen decision, which is why it
appears once in the shared frame rather than in each of the eight screens.

**The actor indicator.** Rendered at the right of the top bar on every screen:

```
+---------------------------------------------------+
| Acting as: A. Okonkwo                            |
+---------------------------------------------------+
```

Two things are true of this element and both matter:

1. **It is provisional.** The actor-identity mechanism is an open decision,
   blocked on I-01 / I-03 — whether the organisation has a trusted
   authentication mechanism at all [Q17]. The four candidates are a
   server-configured single operator, a trusted request header from an
   authenticating proxy, operator selection, and application-managed login.
   The indicator reserves a place in the layout; it does not assert which
   mechanism fills it.
2. **It is read-only in this release.** Because actor information supplied in a
   write request is never trusted [Q16], the wireframes draw no control here
   that an administrator could use to choose their own identity. A picker would
   be the operator-selection candidate, which the feasibility assessment
   recorded as satisfying the rule only weakly, because the operator remains
   self-declared. If PB-00 selects that candidate, this element becomes
   interactive and the wireframes change.

---

## W1 — Reconciliation Dashboard

The landing page. Two headline tiles and a five-bucket breakdown [Q5].

The counts on this screen, the counts on the asset list, the counts in the
assignee directory, and the row count in the CSV export all come from one
shared counting function behind a reusable filter builder [Q18]. This screen
does not compute anything of its own, and neither does any other surface.

```
+------------------------------------------------------------------+
| ASSET TRACKER     Dashboard | Assets | Holders      [New asset]  |
|                                                  Acting as: ... |
+------------------------------------------------------------------+
| <main>                                                              |
|                                                                      |
|  h1  Reconciliation                                                 |
|                                                                      |
|  +---------------------+  +---------------------+                   |
|  |  Active Inventory   |  |   Total Records     |                   |
|  |                     |  |                     |                   |
|  |        243          |  |        248          |                   |
|  |                     |  |                     |                   |
|  |  available to assign|  |  every asset ever   |                   |
|  |         37         |  |   registered,       |                   |
|  |                     |  |  never deleted     |                   |
|  +---------------------+  +---------------------+                   |
|                                                                      |
|  h2  Status                                                         |
|                                                                      |
|  +-------------+ +-------------+ +-------------+ +-------------+     |
|  | In stock    | | Assigned    | | Returned    | | Lost        |     |
|  |     37      | |     191     | |      9      | |      6      |     |
|  +-------------+ +-------------+ +-------------+ +-------------+     |
|                                                                      |
|  +-------------+                                                   |
|  | Discarded   |                                                   |
|  |      5      |                                                   |
|  +-------------+                                                   |
|                                                                      |
|  h2  Attention                                                      |
|                                                                      |
|  +--------------------------------------------------------------+  |
|  | 6 assets marked lost — no recovery recorded                    |  |
|  | 5 assets discarded                                            |  |
|  +--------------------------------------------------------------+  |
|                                                                      |
+------------------------------------------------------------------+
```

**What the two headline tiles mean.** *Active Inventory* is the count of assets
that are still in the organisation's hands — the buckets that are not
`discarded`. *Total Records* is every asset row ever registered, and it never
goes down: a discarded asset leaves Active Inventory but stays in Total Records
[memory:M4]. The two tiles differ by the discarded count, and that difference is
the whole point of the pair — it makes a write-off visible instead of silent.

**The arithmetic the frame satisfies.** The five bucket tiles are the source of
both headline numbers, so the frame reconciles on its face:

	| Quantity | Definition | Value |
	|---|---|---|
	| Bucket tiles | In stock 37 + Assigned 191 + Returned 9 + Lost 6 + Discarded 5 | 248 |
	| Total Records | every bucket, including `discarded` | **248** |
	| Active Inventory | every bucket except `discarded` (37 + 191 + 9 + 6) | **243** |
	| Available to assign | the `in-stock` bucket | 37 |
	| Attention — lost | the `lost` bucket | 6 |
	| Attention — discarded | the `discarded` bucket | 5 |

The two headline numbers therefore agree with the tiles under both readings:
the bucket tiles sum to 248, which is Total Records, and 248 − 5 discarded =
243, which is Active Inventory. These are illustrative values for a mock-up,
not live data, but they are internally consistent so that the frame can be
checked without a running system.

**The "available to assign" sub-metric.** A sub-metric on the Active Inventory
tile, not a third headline tile. It is the count of assets in `in-stock` — the
ones that could be handed to somebody right now. Workbook Screen 01's amendment
adds this sub-metric alongside "Active Inventory" and the "Returned" label
[memory:M3].

**The bucket breakdown.** The five exclusive buckets — `in-stock`, `assigned`,
`returned`, `lost`, `discarded` — each get a tile. Note the fifth: `discarded`
is a bucket like any other, and it is shown rather than hidden, because hiding it
is what made the spreadsheet's counts disagree.

**The "Returned" label.** The POC's bucket vocabulary is four statuses, and the
workbook's amendment relabels the fourth. `returned` is a distinct resting
state, not a synonym for `in-stock` [memory:M3].

**The Attention panel.** A short list of counts that an administrator would
otherwise have to compute by hand from the filters. It is *not* a fifth
counting surface: every number on it is read from the same shared counting
function, filtered the same way. This matters — a second definition here would
be exactly the defect the shared counting function exists to remove.

Both lines are **whole-bucket counts with no time window**: "6 assets marked
lost" is the `lost` bucket, and "5 assets discarded" is the `discarded` bucket,
read with the same unfiltered filter the bucket tiles use. The shared filter
builder has no date dimension — W2's filter carries only Search, Category,
Status, Sort and Direction — so the panel cannot express "this quarter" or any
other window, and it does not pretend to. If a time-windowed count is wanted
later, that is an addition to the shared filter builder and belongs in the scope
document and the backlog, not silently inside a dashboard panel.

> **Accessibility note (W1):** h1 "Reconciliation"; landmarks `header`, `nav`, `main`; keyboard entry point: the `Dashboard` nav link, which is the first focusable element and is marked `aria-current="page"`.

---

## W2 — Asset List

The working surface, and the second of the four count-consuming surfaces.

```
+------------------------------------------------------------------+
| ASSET TRACKER     Dashboard | Assets | Holders      [New asset]  |
|                                                  Acting as: ... |
+------------------------------------------------------------------+
| <main>                                                              |
|                                                                      |
|  h1  Assets                                     [Export CSV]       |
|                                                                      |
|  +--------------------------------------------------------------+  |
|  | Search: [_________________]  Category: [All      v]           |  |
|  | Status: [All statuses  v]  Sort: [Name          v]            |  |
|  | Direction: [Ascending     v]                                  |  |
|  |                                  [Apply]  [Reset]            |  |
|  +--------------------------------------------------------------+  |
|                                                                      |
|  Showing 248 of 248 records                                         |
|                                                                      |
|  +----------------------------------------------------------------+  |
|  | Name        | Category  | Serial / Key | Status    | Holder | Last h. |  |
|  |---------------|----------|--------------|-----------|--------|---------|  |
|  | ThinkPad X1   | Hardware |  SN-4471     | [Assigned]| Dana R | --      |  |
|  | Figma Org     | Software |  KEY-9912    | [In stock]| --     | --      |  |
|  | ThinkPad X1   | Hardware |  SN-9930     | [Lost]   | --     | Dana R  |  |
|  | ...                                                               |  |
|  +----------------------------------------------------------------+  |
|                                                                      |
|  Legend: [In stock] [Assigned] [Returned] [Lost] [Discarded]       |
|                                                                      |
+------------------------------------------------------------------+
```

**What changes from the POC's list.**

| Change | Why |
|---|---|
| The status filter gains a **Discarded** option | The fifth bucket exists in the release [Q1] |
| The status **column** gains a `Discarded` chip | A discarded asset stays in the list and in Total Records [memory:M4] |
| A **"Showing N of M records"** line appears | A count on the working surface, drawn from the shared counting function — not a count the list computes for itself |
| An **Export CSV** action appears | One of the four count-consuming surfaces; its row count must equal the list's count |
| **Holder** and **Last holder** columns appear | The list is now the destination the assignee directory links into [Q6], and it must carry both holder values [memory:M4] |
| The POC's single `Assigned to` column is replaced by two | `last_assigned_to` is preserved, so the holder at loss time stays visible — and W3 already distinguishes the two as separate fields, so the list must not conflate them |

**The two holder columns.** The list carries **Holder** and **Last holder** as
separate columns, matching W3's field pair and the assignee directory's
expansion. **Holder** shows the asset's current holder, empty when the asset
has none. **Last holder** shows the preserved `last_assigned_to`, empty when
there is none. Neither column ever falls back to the other's value: a lost
asset shows an empty Holder and a populated Last holder, and a currently-held
asset shows a populated Holder and an empty Last holder. This is the same rule
W3 states in prose and the same rule the CSV export's column set uses, so the
three surfaces never disagree about who had an asset.

**The status chip.** The POC already renders status as a coloured chip with the
text inside it — `.status-in-stock`, `.status-assigned`, `.status-returned`,
`.status-lost` — and each chip pairs a background colour with a distinct text
colour. That pattern is kept and extended with a fifth chip for `discarded`
[Q12]. The chip's **text is the status name**, so colour is never the only
carrier of meaning [Q11]. The chip's colour vocabulary is the POC's existing
one; a `discarded` chip uses the muted grey already present in the stylesheet's
`--muted` rather than a new semantic token, because no new token system is
specified in this release [Q12].

**The status label mapping.** The POC renders the raw stored status value — the
template interpolates `asset.status` directly, so the chip reads `in-stock`, not
`In stock`. The MVP displays a **display label** instead, and the mapping is
fixed:

| Stored status | Displayed label | Chip class |
|---|---|---|
| `in-stock` | In stock | `.status-in-stock` |
| `assigned` | Assigned | `.status-assigned` |
| `returned` | Returned | `.status-returned` |
| `lost` | Lost | `.status-lost` |
| `discarded` | Discarded | `.status-discarded` |

The mapping is display-only: the stored value stays `in-stock` in the database,
in the CSV export, and in the filter's option values. The chip's CSS class is
the stored value, unchanged, so the POC's existing colour rules keep working
and only the visible text differs. The `Returned` label is the fourth row
because the workbook's amendment relabels the POC's fourth status [memory:M3].

The same mapping is used on W2's chips, W2's status filter options, W3's status
chip, and W6's expansion rows — one mapping, four surfaces, so a reader cannot
see `returned` on one screen and `Returned` on another.

**The count line.** "Showing 248 of 248 records" is the count of the *current
filter* against the count of *everything*. Both come from the shared counting
function. This is the same number the dashboard's Total Records tile shows when
no filter is applied, and the same number the CSV export's row count shows.

**The Export CSV action.** One of the five operator-facing must-haves and one of
the four count-consuming surfaces [Q1]. Five things about it are fixed here:

1. **The exported scope is the filtered rows.** The export produces exactly the
   rows the list is currently showing, under the filter that is currently
   applied — not the whole table. An administrator who filtered to one category
   and exported gets that category. This is what makes the export's row count
   equal the list's count, and it is the same shared counting function that
   produces both numbers.
2. **The exported columns are the list's columns**, in the list's order: Name,
   Category, Serial / Key, Status, Holder, Last holder. The holder rule is the
   same rule the two list columns follow — **Holder** is the current holder and
   **Last holder** is the preserved `last_assigned_to`, each empty when it does
   not apply. The export does not merge them into one field, because the list
   does not and a spreadsheet is read harder than a table row.
3. **The column set is stated deliberately, not inherited.** Six columns, fixed
   by name and order above. Two candidate fields are deliberately *excluded*:

   - **Notes** is excluded. It is a free-text field on the asset record and it
     appears on the detail screen (W3), but it is not one of the list's columns,
     so exporting it would widen the export beyond the list it is a copy of and
     break the property that the export's rows *and* columns agree with what
     the list shows. An administrator who wants an asset's notes opens that
     asset.
   - **Audit history** is excluded. The history is a separate surface (W3), not
     a list column, and it is append-only and unbounded; a spreadsheet is not
     the place to read it.

   The export is therefore a *reconciliation* export: it carries the six fields
   an administrator reconciles assets against, and nothing else.
4. **Every cell value is sanitised so it cannot be interpreted as a formula.**
   A value that begins with `=`, `+`, `-`, or `@` is escaped before it is
   written. This is the export's distinguishing security property, and it is
   silent: a sanitised cell contains the same value, prefixed so that a
   spreadsheet shows text rather than evaluating it. The administrator sees no
   difference; the difference is that opening the file cannot execute a value
   an administrator typed into a field.

   Because Notes is not an exported column, the formula-injection risk sits
   with the exported free-text fields: **Name**, **Category**, **Status**,
   **Holder** and **Last holder** are all administrator-typed strings, and
   **Serial / Key** is a typed string or licence key [constraint-register.md]
   (DC-05). Every cell of every exported column is sanitised — the rule is
   applied by column set, not by a list of which columns happen to look risky,
   because a value that renders as text in one column renders as text in all of
   them.
5. **An export that matches nothing produces a file with a header and no data
   rows**. The export does not fail and does not silently export everything
   instead. The list's own zero-result message is a deferred empty state and is
   not part of this release; the header-only file is.

The export is an action on this screen rather than a screen of its own — it
produces a file, not a view — but it has a lifecycle of its own, and that
lifecycle is drawn in `user-flow.md` as flow F6.

**Pagination.** Not present. Pagination and result counts are deferred to a
later increment [memory:M3]. The "Showing N of M records" line is therefore a
count of the filter result, not a pager, and it must not grow a pager
affordance that the deferred increment would re-work.

**What the deferral covers, and what it does not.** The deferred item is
"pagination and result counts" [memory:M3], and this stage reads it as
**the pager, not the count line**. The distinction is recorded here because the
phrase is ambiguous on its face and a later stage could reasonably read it
either way:

- **In the release:** the count line — W2's "Showing N of M records" and W6's
  "Showing N holders" — because both are reads from the shared counting
  function, and a shared counting function that is not allowed to be *shown* is
  a function nothing can disagree with.
- **Deferred:** the pager — the page controls, the page-size control, and the
  navigation between pages — because they are a presentation concern that the
  deferred presentation-polish increment re-works with the design system and
  the responsive layouts.

**Why the count line stays, and why this is a narrowing and not a promotion.**
The approved standing condition requires that the dashboard, assignee, asset-list,
and CSV counts use consistent filtering and counting definitions, and it makes
those four surfaces one indivisible group [memory:M2] [Q5]. That condition is about
the *definitions*, and a definition nobody is shown is a definition nothing can
disagree with: if the four surfaces' counts are computed consistently but only
one of them is visible, the other three are unverifiable to the operator and the
consistency guarantee is untestable. The count line is therefore the visible
half of an approved, in-release guarantee, and it adds no capability beyond it —
it is a read of the shared counting function that the release already has to
build, not a new feature.

The narrower reading is a **narrowing of an ambiguous deferral phrase**, and it
is recorded as such so that no later stage reads it as a deferred capability
being promoted into the release. Nothing else in the deferred item is brought
in: no pager, no page-size control, no page navigation, and no separate
"result count" mechanism. The scope document's own reasoning for the deferral —
the confirmed scale is medium, and the deferral's trigger is the asset count
growing past that scale — is unchanged and still binds.

The deferral's own trigger is the asset count growing past the medium scale.
At the counts this release is drawn against, it is not breached, and the count
line stays a count either way. **Requirements Analysis and the design-system
increment should read the deferral as excluding the pager alone**; the count
lines are in the release.

**The reset control.** The POC's filter form has search, category, status,
sort, direction, and an Apply button. A Reset control is added because the
screen now has more filter state than a single apply can make obvious, and
because "clear everything" is a meaningful operation once the filter builder
has several dimensions.

**The sort and direction controls are preserved, not folded.** The POC's
`views/list.ejs` carries a `dir` select with ascending and descending options,
and POC behaviour the MVP does not explicitly cover is preserved by default. The
frame therefore draws **Sort** and **Direction** as two separate controls, as
the POC has them. Neither is a new control and neither is a change from the
POC's list — they are drawn here so that a developer building from the frame
does not silently drop one.

> **Accessibility note (W2):** h1 "Assets"; landmarks `header`, `nav`, `main`; keyboard entry point: the `Search` input, which is the first focusable element in `<main>` after the skip link. The results table carries a `<caption>` and a `scope` attribute on each column header; the status filter is a labelled `<select>`; the export action is a `<button>` in the page heading, not a link styled as a button.

---

## W3 — Asset Detail

The screen that carries the audit measure. The POC shows the *latest* audit row;
this shows the whole history with an actor on every entry [Q7].

```
+------------------------------------------------------------------+
| ASSET TRACKER     Dashboard | Assets | Holders      [New asset]  |
|                                                  Acting as: ... |
+------------------------------------------------------------------+
| <main>                                                              |
|                                                                      |
|  h1  ThinkPad X1 Carbon                                            |
|                                                                      |
|  +----------------------+  +-----------------------------------+    |
|  | Status                |  | Actions                          |    |
|  | [Assigned]            |  |                                   |    |
|  |                       |  |                                   |    |
|  | Category   Hardware   |  | [Mark returned]  [Mark lost]      |    |
|  | Serial/Key SN-4471    |  |                                   |    |
|  | Model     ThinkPad    |  | [Discard]                         |    |
|  | Holder     Dana R     |  |                                   |    |
|  | Last holder  Dana R   |  |                                   |    |
|  | Assigned at 2026-11-02|  |                                   |    |
|  | Returned at --        |  |                                   |    |
|  | Created    2026-09-14 |  |                                   |    |
|  | Updated    2026-11-02 |  |                                   |    |
|  +----------------------+  +-----------------------------------+    |
|                                                                      |
|  h2  History                                                        |
|                                                                      |
|  +----------------------------------------------------------------+  |
|  | 2026-11-02T09:14:22Z  assign      A. Okonkwo                   |  |
|  |   Assigned "ThinkPad X1 Carbon" to Dana R.                     |  |
|  |----------------------------------------------------------------|  |
|  | 2026-09-14T08:02:10Z  create      system                      |  |
|  |   Registered "ThinkPad X1 Carbon".                             |  |
|  +----------------------------------------------------------------+  |
|                                                                      |
|  h2  Notes                                                          |
|  | Standard corporate issue. Replaced under warranty in 2026.     |  |
|                                                                      |
|  [Edit asset]  [Back to list]                                      |
|                                                                      |
+------------------------------------------------------------------+
```

### The actions panel changes

The POC's detail screen renders one of four action blocks, chosen by the
current status. The MVP's version adds two transitions and a reason-gathering
step [Q3].

**The main frame above is an `assigned` asset, and its Actions panel carries
exactly the three actions the `assigned` row of the table below offers — Mark
returned, Mark lost, Discard.** It deliberately does **not** carry an Assign
control: there is no `assigned → assigned` edge in the approved §4.1 transition
table, so a re-assign control on an already-assigned asset would offer a
transition the service must reject. Assign appears only on the `in-stock`
variant further down this section, where the approved table does have the
`in-stock → assigned` edge. Every frame in this document that draws an Actions
panel follows this rule: the panel shows the actions of the status its own
Status chip displays, and no others.

| Current status | Actions offered | Notes |
|---|---|---|
| `in-stock` | Assign to [holder] · Mark lost (reason dialog) | The assign action is the POC's. **The loss action is new** — the approved §4.1 amendment names `in-stock → lost` explicitly [memory:M3], and without it an asset registered into stock and then found missing has no path to record the loss |
| `assigned` | Mark returned · Mark lost (reason dialog) · Discard (reason dialog) | The POC already offers the first two; the third is new |
| `returned` | Mark lost (reason dialog) · Re-assign to [holder] | The POC already offers both |
| `lost` | Recover (reason dialog) · Edit asset | **New.** The POC offers nothing but a dead-end message |
| `discarded` | Edit asset only | **New.** The row and history stay reachable [memory:M4]. **Terminal in this release** — no transition leaves `discarded` |

The five states and the eight drawn edges between them are fixed by the approved
§4.1 transition table, not by this screen [memory:M3]. The approved table has
ten edges in all; the two this release does not draw are named below. The screen renders the
table; it does not decide it. The full edge set is:

| From | To | Action | Reason required |
|---|---|---|---|
| `in-stock` | `assigned` | Assign | No |
| `in-stock` | `lost` | Mark lost | Yes |
| `assigned` | `returned` | Mark returned | No |
| `assigned` | `lost` | Mark lost | Yes |
| `assigned` | `discarded` | Discard | Yes |
| `returned` | `assigned` | Re-assign | No |
| `returned` | `lost` | Mark lost | Yes |
| `lost` | `in-stock` | Recover | Yes |

**`returned → lost` is explicitly approved.** The edge is verified against the
approved upstream amendment surface, not inferred: decision set row D3 lists
`returned → assigned/lost/discarded` as "All proposed", the resulting §4.1
transition table lists `returned → assigned, lost, discarded`, and the POC
requirements state that from `returned` the valid transition is to `assigned`
or `lost` [memory:M3]. It carries no distinct audit action of its own — it
reuses `mark-lost` — and it requires a loss reason from the shared
loss-reason vocabulary, the same as `in-stock → lost` and `assigned → lost`.

**The edge-count reconciliation: ten approved, eight drawn, two omitted.**
The approved §4.1 transition table has exactly ten edges. These screens draw
eight of them and leave two undrawn. The counts reconcile as
**ten approved = eight drawn + two omitted**. Stated set by set, with nothing
implicit:

| # | Approved edge | Audit action | Reason required | Drawn on W3 |
|---|---|---|---|---|
| 1 | `in-stock` → `assigned` | `assign` | No | Yes |
| 2 | `in-stock` → `lost` | `mark-lost` | Yes | Yes |
| 3 | `in-stock` → `discarded` | `discarded` | Yes | **No — omitted** |
| 4 | `assigned` → `returned` | `return` | No | Yes |
| 5 | `assigned` → `lost` | `mark-lost` | Yes | Yes |
| 6 | `assigned` → `discarded` | `discarded` | Yes | Yes |
| 7 | `returned` → `assigned` | `assign` | No | Yes |
| 8 | `returned` → `lost` | `mark-lost` | Yes | Yes |
| 9 | `returned` → `discarded` | `discarded` | Yes | **No — omitted** |
| 10 | `lost` → `in-stock` | `recovered` | Yes | Yes |

The approved set is ten edges (rows 1–10). The drawn set is eight: rows 1,
2, 4, 5, 6, 7, 8 and 10. The omitted set is two: rows 3 and 9,
`in-stock → discarded` and `returned → discarded`. Every approved edge appears
in exactly one of the drawn or omitted sets, so the three lists reconcile
without overlap and without residue.

**The two omitted edges are omitted deliberately, not removed.** Both stay in
the approved decision set; nothing here withdraws, reclassifies, or defers
them. They are not drawn because a discard resolves a live assignment inline
and clears `assigned_to` while preserving `last_assigned_to` [memory:M4] — and
an asset in `in-stock` has never been assigned, while an asset in `returned`
has already been returned, so neither source state holds a live assignment to
resolve. The release's drawn discard edge is therefore the one whose
resolution behaviour the decision set actually specifies. The two omissions
are carried to the scope stage as a named open question about the release
boundary, with their approved standing intact [Q19].

**`discarded` is terminal.** No edge leaves it. A discarded asset can still be
edited, and its row and history remain reachable [memory:M4], but the release
does not undo a write-off and does not permit a discarded asset to be marked
lost.

### The detail fields

**The four date fields are timestamps, and the labels say so.** The POC's detail
screen renders `Assigned at`, `Returned at`, `Created` and `Updated` as plain
dates. The MVP keeps all four and keeps the "at" marker on the two that name a
lifecycle moment:

| Field | Value type | Empty when |
|---|---|---|
| `Assigned at` | timestamp of the current assignment | the asset is not currently assigned |
| `Returned at` | timestamp of the last return | the asset has never been returned |
| `Created` | timestamp of registration | never — the asset exists |
| `Updated` | timestamp of the last write to the record | never |

The "at" is what distinguishes `Assigned at` from the `Assigned` *action* in the
actions panel and from the `Assigned` bucket on the dashboard — three different
things that would otherwise share a word. The labels are not shortened to
`Assigned` and `Returned`, because a bare `Assigned` next to a `Holder` field
reads as a person rather than a date.

**The `Updated` field is kept, not dropped.** The POC renders it, and nothing in
the MVP retires it: the field is the timestamp of the last write to the asset
record, and with asset editing in the release it becomes more useful, not less,
because an edit now changes the record without changing its status. A reader
comparing the `Updated` timestamp against the last history entry can see
whether something wrote to the record outside the history — which is exactly the
kind of gap the audit history exists to close. It is therefore **not** listed in
the Deferred and Deliberately Absent table, and no later stage should remove it
without recording the retirement here.

Two of these are new surfaces rather than new buttons, and both are drawn
separately below. One row is a new *edge* on an existing screen: `in-stock` now
offers a loss action as well as an assign action, because the approved §4.1
amendment names `in-stock → lost` [memory:M3] and without it the only route
into `lost` requires the asset to have been assigned first — which is false of
an asset that was registered into stock and then found missing.

**The discard is not hidden behind a quiet link.** Discarding is a write-off:
the asset leaves Active Inventory and its assignment is resolved. The action
sits in the same panel as the others, and it opens a dialog that requires a
reason. It is not styled to look like a link or tucked under a menu, but it is
also not styled to look like a routine return — the panel distinguishes the
three kinds of action visually, because they are not interchangeable.

**The `last_assigned_to` field.** Shown as "Last holder" next to "Holder",
and distinct from it. For an asset that is currently `assigned`, the two carry
the same value. For a lost or returned asset they differ, and the difference is
the answer to "who had it before" — the question the whole initiative exists to
answer [memory:M4].

**The history entries.** Each entry shows a timestamp, an action name, and an
actor. The description line carries the specifics: which holder, which prior
holder, which reason. The `recovered` and `discarded` actions have their own
descriptions that name the recovery and the prior holder, rather than reusing
`assign` or `return` [memory:M3].

**The pre-MVP `system` actor.** The second entry above shows `system`. That is
the backfilled actor for history that predates the MVP [memory:M3]. It is
displayed as a distinct actor rather than hidden or relabelled, because the
Audit Completeness metric is measured against a stated population that excludes
it, and the administrator looking at the screen needs to know which entries are
in that population.

> **Accessibility note (W3):** h1 "ThinkPad X1 Carbon" with h2 "History", h2 "Notes"; landmarks `header`, `nav`, `main`; keyboard entry point: the first action control in the Actions panel. The history is a `<ol>` of `<li>` entries rather than a table, because it is a sequence rather than a grid; the action panel is a `<section>` with an accessible name; the `History` and `Notes` headings are the skip targets within the page.

---

## W4 — New-Asset Form

```
+------------------------------------------------------------------+
| ASSET TRACKER     Dashboard | Assets | Holders      [New asset]  |
|                                                  Acting as: ... |
+------------------------------------------------------------------+
| <main>                                                              |
|                                                                      |
|  h1  New asset                                                      |
|                                                                      |
|  +--------------------------------------------------------------+  |
|  | Category *                                                   |  |
|  |   [Hardware                                        v]        |  |
|  |                                                              |  |
|  | Name *                                                      |  |
|  |   [                                                    ]    |  |
|  |                                                              |  |
|  | Serial or key *                                              |  |
|  |   [SN-4471                                           ]    |  |
|  |   ! A hardware asset with serial "SN-4471" already exists.  |  |
|  |     ThinkPad X1 Carbon — [Open existing asset]               |  |
|  |                                                              |  |
|  | Model                                                       |  |
|  |   [                                                    ]    |  |
|  |                                                              |  |
|  | Notes                                                       |  |
|  |   [                                                    ]    |  |
|  |                                                              |  |
|  |                              [Cancel]  [Create asset]         |  |
|  +--------------------------------------------------------------+  |
|                                                                      |
+------------------------------------------------------------------+
```

**The "Assigned to" field is gone** [Q2]. The POC's registration form has an
optional "Assigned to (optional)" field that stores a plain field without
performing an assignment — the asset stays `in-stock` and only enters `assigned`
through the assign action. The field therefore invites an administrator to
record something that did not happen. Removing it removes the misleading
affordance; assignment happens on the detail screen, as an explicit action with
its own audit entry [Q15].

**The inline duplicate warning** [Q4]. As the administrator types a serial or
key, the screen checks it against the same case-insensitive, whitespace-trimmed,
category-scoped definition the database enforces. A collision shows a warning
under the field that names the colliding asset and offers a link to it:

```
| Serial or key *                                              |
|   [SN-4471                                           ]    |
|   ! A hardware asset with serial "SN-4471" already exists.  |
|     ThinkPad X1 Carbon — [Open existing asset]               |
```

The comparison is scoped to the selected category — a `software-license` with
the same key as a `hardware` asset is not a collision.

**The submit-time collision warning.** Inline checking reduces collisions; it
does not eliminate them, because the check and the write are not the same
operation and because two administrators can type the same serial at the same
time. So the submit path has its own warning, drawn as a block at the top of
the form rather than under the field, because at submit time the whole form is
being judged:

```
+--------------------------------------------------------------+
| ! This serial already exists.                                 |
|                                                              |
|   Category   Hardware                                       |
|   Serial     SN-4471                                        |
|   Asset      ThinkPad X1 Carbon — assigned to Dana R         |
|                                                              |
|   [Open existing asset]        [Change the serial]           |
+--------------------------------------------------------------+
```

Two actions, and only two: open the existing asset, or change the serial. There
is no "create anyway" — the collision is a genuine conflict under the shared
uniqueness definition, and the standing condition says registration and
serial-or-key updates enforce the *same* policy [Q18]. The submit-time block
also covers the concurrency case, where the collision appeared after the
administrator began filling the form: the message says so rather than showing a
bare failure.

**The error block.** The POC renders server-side validation errors in a red
block at the top of the form. That block is kept for genuine validation
failures, and the collision block is a distinct, more specific block inside it.

> **Accessibility note (W4):** h1 "New asset"; landmarks `header`, `nav`, `main`; keyboard entry point: the `Category` select, which is the first form control. Every input has a real `<label>` bound by `for`/`id`; required fields carry the `required` attribute and the asterisk is supplemented by `aria-required`; the inline duplicate warning is associated with the serial input by `aria-describedby` and announced with `role="alert"`; the submit-time collision block is a `role="alert"` region that receives focus on render.

---

## W5 — Edit-Asset Form

The form as it opens — the asset's own values, and no collision warning:

```
+------------------------------------------------------------------+
| ASSET TRACKER     Dashboard | Assets | Holders      [New asset]  |
|                                                  Acting as: ... |
+------------------------------------------------------------------+
| <main>                                                              |
|                                                                      |
|  h1  Edit asset — ThinkPad X1 Carbon                              |
|                                                                      |
|  +--------------------------------------------------------------+  |
|  | Category *                                                   |  |
|  |   [Hardware                                        v]        |  |
|  |                                                              |  |
|  | Name *                                                      |  |
|  |   [ThinkPad X1 Carbon                                ]    |  |
|  |                                                              |  |
|  | Serial or key *                                              |  |
|  |   [SN-4471                                           ]    |  |
|  |                                                              |  |
|  | Model                                                       |  |
|  |   [                                                    ]    |  |
|  |                                                              |  |
|  | Notes                                                       |  |
|  |   [                                                    ]    |  |
|  |                                                              |  |
|  |                              [Cancel]  [Save changes]         |  |
|  +--------------------------------------------------------------+  |
|                                                                      |
+------------------------------------------------------------------+
```

And the same form after the administrator types a serial that *another* asset
already holds — the collision state:

```
+------------------------------------------------------------------+
| ASSET TRACKER     Dashboard | Assets | Holders      [New asset]  |
|                                                  Acting as: ... |
+------------------------------------------------------------------+
| <main>                                                              |
|                                                                      |
|  h1  Edit asset — ThinkPad X1 Carbon                              |
|                                                                      |
|  +--------------------------------------------------------------+  |
|  | Category *                                                   |  |
|  |   [Hardware                                        v]        |  |
|  |                                                              |  |
|  | Name *                                                      |  |
|  |   [ThinkPad X1 Carbon                                ]    |  |
|  |                                                              |  |
|  | Serial or key *                                              |  |
|  |   [SN-9930                                           ]    |  |
|  |   ! A hardware asset with serial "SN-9930" already exists.  |  |
|  |     Dell Latitude 5540 — [Open existing asset]                |  |
|  |                                                              |  |
|  | Model                                                       |  |
|  |   [                                                    ]    |  |
|  |                                                              |  |
|  | Notes                                                       |  |
|  |   [                                                    ]    |  |
|  |                                                              |  |
|  |                              [Cancel]  [Save changes]         |  |
|  +--------------------------------------------------------------+  |
|                                                                      |
+------------------------------------------------------------------+
```

The edit form is the registration form with the asset's current values filled
in, and it behaves the same way. That sameness is the point.

**The uniqueness policy is the same on both paths** [Q18]. Registration and
serial-or-key updates enforce one policy, using one shared definition — the
same normalised comparison the functional index enforces. An edit that changed a
serial or key runs the same case-insensitive, category-scoped check, with the
same inline warning and the same submit-time collision block.

**The asset's own serial is not a collision with itself.** The frame above
shows the form as it opens: the asset's own serial, and **no collision
warning**. When the serial is unchanged, the check must not report the asset
against itself — which is why the first frame carries no warning and the
collision frame is drawn separately, against a *different* asset. The screen
carries the asset's identity in the form's state, not as a visible field, and
the comparison excludes it. Without this, every edit of any field on an asset
would appear to collide with the asset itself.

**What the edit form does not change.** Status is not editable here. The
lifecycle moves only through the explicit actions on the detail screen, each
with its own validation and audit behaviour [Q15]. An edit that changed status
would be a second, unvalidated path into the state machine.

**What the edit form can change.** Category, name, serial or key, model, and
notes. Category and serial-or-key are editable *together* deliberately: the
uniqueness definition is category-scoped, so changing a serial's category
changes which collisions are possible, and the inline check re-runs against the
new category.

**An edit writes an audit entry.** The edit form is a write, so a successful
save appends a history entry under the action name **`edit`** — distinct from
`create` and from every lifecycle action, because an edit changes the asset
record without changing its bucket, its holder, or its custody history. The
entry's description names the fields that changed and their previous values,
so a reader can see what was edited without reconstructing it from two versions
of the row. The actor is resolved from trusted server-side context, as on every
other write [Q16]. The full flow is drawn as F5h in `user-flow.md`.

> **Accessibility note (W5):** h1 "Edit asset — ThinkPad X1 Carbon"; landmarks `header`, `nav`, `main`; keyboard entry point: the `Category` select, as on the registration form. Same labelling, `aria-describedby` association for the inline warning, and `role="alert"` on the submit-time block. The heading includes the asset name so the screen is identifiable when reached by a skip link or a browser title.

---

## W6 — Assignee Directory

```
+------------------------------------------------------------------+
| ASSET TRACKER     Dashboard | Assets | Holders      [New asset]  |
|                                                  Acting as: ... |
+------------------------------------------------------------------+
| <main>                                                              |
|                                                                      |
|  h1  Holders                                                       |
|                                                                      |
|  +--------------------------------------------------------------+  |
|  | Search holders: [_________________]                          |  |
|  +--------------------------------------------------------------+  |
|                                                                      |
|  Showing 14 holders                                                 |
|                                                                      |
|  +----------------------------------------------------------------+  |
|  | > Dana Reyes           4 assets    [Assigned 3] [Lost 1]        |  |
|  |   v                                                         |  |
|  |   ThinkPad X1 Carbon      SN-4471    [Assigned]  assigned    |  |
|  |   Dell Latitude 5540     SN-4468    [Assigned]  assigned    |  |
|  |   iPhone 14              SN-4512    [Assigned]  assigned    |  |
|  |   USB-C Dock              SN-4503    [Lost]      last holder |  |
|  +----------------------------------------------------------------+  |
|                                                                      |
|  | > Alex Chen             2 assets    [Assigned 2]               |  |
|  +----------------------------------------------------------------+  |
|                                                                      |
|  | > Priya Nair            1 asset     [Assigned 1]               |  |
|  +----------------------------------------------------------------+  |
|                                                                      |
|  | > Unassigned            37 assets   [In stock 37]               |  |
|  +----------------------------------------------------------------+  |
|                                                                      |
|  ... 10 further holder rows not shown                                |
|                                                                      |
+------------------------------------------------------------------+
```

**What "Showing 14 holders" counts.** The number is the count of **distinct
display holders** — the distinct holder names that appear on the assets — and it
**does not include the "Unassigned" row**, because "Unassigned" is a row, not a
holder: no asset names it as a holder, so it is not a distinct holder name in
the population. The count is therefore a count of holders, not of rows, and the
directory shows **15 rows**: the 14 holders and the Unassigned row. The frame
draws four of those rows — three named holders and the Unassigned row — and the
remaining ten holder rows are elided, so the drawn rows are an excerpt and not
the full population the count line describes.

**Holders are derived, not registered** [Q6]. The POC has no registry of
people — a holder is a free-text string on the asset row. The directory is
therefore built from the assets themselves: the distinct holder names that
appear on them. This is why the row for a holder shows a breakdown by bucket:
the count has to come from somewhere, and the shared counting function is the
only place it comes from.

**The rule that decides which row an asset appears under.** One definition, used
everywhere in this directory: **an asset's display holder is its current holder
if it has one, and otherwise its preserved last holder; an asset that has never
been held by anybody has no display holder at all.** In the field terms, the
display holder is `assigned_to` when that is set, `last_assigned_to` when that
is set and `assigned_to` is not, and nobody when neither is set.

That single definition does three jobs at once, and they cannot be separated:

1. **Every asset appears exactly once.** The rows are disjoint and together
   cover every asset in the directory, so the row counts sum to the population
   the directory is showing.
2. **A holder row means "this is Dana's"** — the custody history, not a
   snapshot. An asset Dana lost still belongs to Dana, under the last holder
   reading, because "what is and was Dana's" is the question the directory
   exists to answer.
3. **The Unassigned row means "nobody has ever held this"** — and nothing
   else, because an asset that *was* held and no longer is has a display holder
   and belongs under that person.

**What the per-holder chips count.** One sentence, and it is the same rule on
every surface: **a holder's chips count the assets whose display holder is that
holder, broken down by the asset's status bucket.** The chips are therefore a
breakdown of the expanded rows below them, not a separate measure. In the
example above, Dana Reyes's four rows are three `assigned` and one `lost`, so
the chips read `[Assigned 3] [Lost 1]` — every chip value equals the number of
visible rows in its bucket, and the chips sum to the row count.

**Why last-held assets are counted here.** A holder's chips cover both
currently-held and last-held assets because the display-holder rule routes an
asset to a named holder whenever it has a current *or* a preserved last holder.
The expansion marks which is which on each row ("assigned" versus "last
holder"), so a reader can always tell which bucket is which. The chips do not
themselves distinguish them, because that would be a second set of counts
reading from somewhere other than the shared counting function.

**The expansion.** Each holder row expands to show the assets whose display
holder is that holder, with the same columns and the same status chips as the
asset list. The expansion is a filtered view of the list, and the counts on it
are the same counts [Q18]. The directory does not have its own counting path;
it filters the list and reads the shared numbers.

**The "last holder" case.** The `USB-C Dock` row shows `[Lost]` and "last
holder". It appears under Dana because Dana was its last holder, but the asset
is not in Dana's hands now. The directory distinguishes *currently held* from
*last held*, because collapsing them would lose the same information
`last_assigned_to` exists to preserve [memory:M4].

**The Unassigned row.** The "Unassigned" row holds the assets that have **no
display holder** — assets that have never been assigned to anybody, so neither
`assigned_to` nor `last_assigned_to` is set. It is a row of its own because,
without it, "37 available to assign" on the dashboard would have no destination.

Its chip is `[In stock 37]`, summing to the row's 37. There is one chip, and
that is a consequence of the display-holder rule rather than a simplification of
it: an asset only reaches this row if it has never been held by anybody, and
every bucket other than `in-stock` requires a prior holder to reach. A
`returned` asset was assigned and then returned, so it has a preserved last
holder and appears under that person. A `lost` asset was assigned and then
marked lost, so it has a preserved last holder and appears under that person.
A `discarded` asset was assigned and then discarded, and the discard resolves
the assignment inline while keeping the last holder [memory:M4], so it appears
under that person too. Only an asset that was registered and never handed to
anybody is in this row, and such an asset is `in-stock` by construction —
registration never assigns [Q2].

This is why the row carries a single `in-stock` chip and why its 37 is the
same number the dashboard's `in-stock` bucket tile shows. The two are not two
measures of the same thing that happen to agree; they are one shared counting
function read with two different filters — the dashboard reads the whole
`in-stock` bucket, and the directory reads the subset of that bucket with no
display holder. In the example, all 37 in-stock assets are unheld, so the two
readings coincide.

> **Note on the bucket totals.** The Unassigned row's single chip is an
> `in-stock` chip, and `in-stock` is a resting bucket, so its total is the
> whole population of that bucket in this example. The directory's chips are
> not the dashboard's buckets in general: a holder's `[Lost 1]` chip is not a
> dashboard bucket total, because Dana's lost assets are a subset of the
> `lost` bucket. What must agree is the arithmetic inside each set: the chips
> sum to the row's count, the rows together cover the population the directory
> shows, the dashboard's tiles sum to Total Records, and Active Inventory
> equals Total Records minus `discarded`.

**No separate holder detail page.** The holder row expands in place. A holder
is not an entity with its own lifecycle in this release, and giving it a detail
URL would imply one.

**Holder names are not identity.** A holder name is a label an administrator
types. It is not an authenticated identity, and the directory must not be read
as one. The actor on an audit entry comes from trusted server-side context
[Q16]; the holder name is the subject of custody, not the actor of the record.
This distinction is why the directory carries no actor indicator of its own
beyond the session-level one in the top bar.

> **Accessibility note (W6):** h1 "Holders"; landmarks `header`, `nav`, `main`; keyboard entry point: the `Search holders` input. Each holder row is a disclosure: a `<button>` with `aria-expanded` and `aria-controls` names the holder and toggles the asset list beneath it, so the expanded state is announced rather than only visible; the expanded assets are a `<table>` with a `<caption>` naming the holder.

---

## W7 — The Reason Dialog

One dialog shape serves every transition that requires a reason [Q3].

```
+------------------------------------------------------------------+
|                          Asset Tracker                             |
+------------------------------------------------------------------+
|                                                                      |
|    +----------------------------------------------------------+    |
|    |  Mark lost — ThinkPad X1 Carbon                       [X]  |    |
|    |                                                          |    |
|    |  This asset is currently assigned to Dana Reyes.           |    |
|    |  Marking it lost records who had it and ends the           |    |
|    |  assignment. Dana Reyes is kept as the last holder.         |    |
|    |                                                          |    |
|    |  Reason *                                                 |    |
|    |    [ Select a reason...                              v]   |    |
|    |                                                          |    |
|    |  ! A reason is required.                                  |    |
|    |                                                          |    |
|    |                        [Cancel]        [Mark lost]         |    |
|    +----------------------------------------------------------+    |
|                                                                      |
+------------------------------------------------------------------+
```

**The dialog explains the consequence before asking for the reason.** The
paragraph above the field is not decoration: it tells the administrator what
the transition does to the assignment and to the record, so that the reason they
type is recorded against the right event.

**The consequence paragraph is rendered from the asset's current status, and
there are two variants.** The shape is fixed — one paragraph, above the reason
field — but its content is not, because what the transition does to the
assignment depends on whether there is an assignment to end. The two variants
the release needs are:

| Asset's current status | The consequence paragraph says | Because |
|---|---|---|
| `assigned` (the frame above) | "This asset is currently assigned to Dana Reyes. Marking it lost records who had it and ends the assignment. Dana Reyes is kept as the last holder." | There is a current holder to clear and a last holder to preserve |
| `in-stock` | "This asset is in stock. It has not been assigned to anyone. Marking it lost records it as missing, and there is no holder to keep." | There is no assignment and no prior holder, so nothing is cleared or preserved |

The `in-stock` variant is the one the release adds — the approved §4.1
amendment names `in-stock → lost` explicitly [memory:M3] — and it is therefore
drawn here rather than left to be inferred from the `assigned` variant. The
`assigned` variant is the only other one the release can reach, because
`returned` and `discarded` reach the loss dialog on different transitions that
carry their own dialogs (W8), and `lost` and `in-stock` are the two statuses
the Mark lost action is offered from.

```
+------------------------------------------------------------------+
|                          Asset Tracker                             |
+------------------------------------------------------------------+
|                                                                      |
|    +----------------------------------------------------------+    |
|    |  Mark lost — ThinkPad X1 Carbon                       [X]  |    |
|    |                                                          |    |
|    |  This asset is in stock. It has not been assigned to      |    |
|    |  anyone. Marking it lost records it as missing, and       |    |
|    |  there is no holder to keep.                              |    |
|    |                                                          |    |
|    |  Reason *                                                 |    |
|    |    [ Select a reason...                              v]   |    |
|    |                                                          |    |
|    |                        [Cancel]        [Mark lost]         |    |
|    +----------------------------------------------------------+    |
|                                                                      |
+------------------------------------------------------------------+
```

**The reason comes from the shared loss-reason vocabulary.** The select is
populated from the shared vocabulary, not from free text. The recovery and
discard dialogs draw from the same vocabulary plus the retirement-specific
values [Q3] [memory:M3]. Free text would let the vocabulary drift, and the
vocabulary is what makes the audit history queryable.

**The reason is required.** The submit control stays **enabled** with no reason
chosen, and submitting without one produces the validation message shown in the
frame — `! A reason is required.` — beneath the field, with focus moved to it
and nothing written. The transition cannot complete without a reason, so the
only outcome of submitting without one is the error.

This is the one behaviour for every reason-bearing dialog in the release — the
reason field is a required `<select>`, the submit control is never disabled,
and the validation message is the response to submitting with the placeholder
still showing. Disabling the control would make the message unreachable, and a
control that greys out without explanation is less accessible than one that
accepts the click and explains what is missing.

**Focus and dismissal.** Opening the dialog moves focus to the reason field.
`Escape` and the Cancel button both dismiss without acting. The close button
in the corner does the same — no transition happens on dismissal, and nothing is
recorded.

> **Accessibility note (W7):** the dialog is a `<dialog>` element with `aria-labelledby` pointing at its heading and `aria-describedby` pointing at the consequence paragraph; the background is inert while it is open; focus is trapped inside the dialog and returns to the trigger button on close; `Escape` dismisses; the reason `<select>` has a bound `<label>`; the required state is carried by `required` and `aria-required`.

---

## W8 — The Discard and Recovery Dialogs

Two more reason-bearing transitions, each with its own dialog, because the
consequences differ [Q3].

### W8a — Discard

```
+------------------------------------------------------------------+
|                          Asset Tracker                             |
+------------------------------------------------------------------+
|                                                                      |
|    +----------------------------------------------------------+    |
|    |  Discard — ThinkPad X1 Carbon                        [X]  |    |
|    |                                                          |    |
|    |  This asset is currently assigned to Dana Reyes.           |    |
|    |  Discarding it resolves the assignment: Dana Reyes is       |    |
|    |  cleared as the current holder and kept as the last         |    |
|    |  holder. The asset leaves Active Inventory, but its row     |    |
|    |  and full history are kept and stay here.                   |    |
|    |                                                          |    |
|    |  Reason *                                                 |    |
|    |    [ Select a reason...                              v]   |    |
|    |                                                          |    |
|    |                        [Cancel]        [Discard asset]     |    |
|    +----------------------------------------------------------+    |
|                                                                      |
+------------------------------------------------------------------+
```

**The paragraph names what survives.** Discarding does not delete the asset.
The row stays, the history stays, the asset stays in the `discarded` bucket and
in Total Records, and its detail URL keeps working [memory:M4]. The dialog says
so, because "discard" is a word that reasonably suggests deletion, and the
whole point of the MVP's audit floor is that nothing is destroyed. The
dialog also says what the assignment does — resolved inline, holder cleared,
last holder kept [memory:M4].

**The reason vocabulary is wider here.** The discard reason is drawn from the
shared loss-reason vocabulary *plus* retirement-specific values [Q3]. The
select therefore has a labelled group for each, or a single list whose entries
carry the grouping — a detail Requirements Analysis and the Functional Design
stage settle.

**The button says "Discard asset", not "Confirm".** The consequence is written
off; a generic "Confirm" would be ambiguous about what is being confirmed.

**The reason behaves as in W7.** The submit control stays enabled with the
placeholder showing; submitting without a reason produces the same
`! A reason is required.` validation message beneath the field, with nothing
written. The button is labelled "Discard asset" rather than "Confirm" or
"Discard", because a generic confirm would be ambiguous about what is being
confirmed.

### W8b — Recover

```
+------------------------------------------------------------------+
|                          Asset Tracker                             |
+------------------------------------------------------------------+
|                                                                      |
|    +----------------------------------------------------------+    |
|    |  Recover — ThinkPad X1 Carbon                       [X]  |    |
|    |                                                          |    |
|    |  This asset was marked lost. Dana Reyes was its last       |    |
|    |  holder. Recovering it returns it to stock and records     |    |
|    |  the recovery as its own event, naming Dana Reyes.         |    |
|    |                                                          |    |
|    |  Recovery reason *                                       |    |
|    |    [ Select a reason...                              v]   |    |
|    |                                                          |    |
|    |                        [Cancel]        [Recover asset]     |    |
|    +----------------------------------------------------------+    |
|                                                                      |
+------------------------------------------------------------------+
```

**Recovery is its own event, not a return.** The action vocabulary gives
recovery a distinct `recovered` action rather than reusing `assign` or
`return`, and its description names the recovery and the prior holder
[memory:M3]. The dialog's wording reflects that: it says the asset "returns to
stock", and it says the recovery is recorded as its own event naming the prior
holder. It does not present recovery as a re-assignment.

**The asset returns to `in-stock`, not to `assigned`.** The recovery transition
is `lost → in-stock` [memory:M3]. The dialog says "returns it to stock", and
does not offer a holder field — recovery ends the loss, it does not hand the
asset to someone. Re-assigning a recovered asset is a separate, subsequent
action on the detail screen.

**The reason behaves as in W7.** The submit control stays enabled with the
placeholder showing; submitting without a reason produces the same
`! A reason is required.` validation message beneath the field, with nothing
written and the asset still `lost`.

> **Accessibility note (W8a, W8b):** same dialog contract as W7 — `<dialog>` with `aria-labelledby` on the heading and `aria-describedby` on the consequence paragraph, background inert, focus trapped, `Escape` dismisses, focus returns to the trigger. The reason `<select>` has a bound `<label>`; `required` and `aria-required` carry the required state; the consequence paragraph is read before the field, not after it.

---

## The Screen States

Every screen in this set must be able to render five states. The POC renders
some of them and not others.

**One of the five is not the MVP's to build.** The **Empty** state is deferred to
a later increment [Q1] [memory:M3], so it is recorded here as future-state guidance
and not as a state this release must render. What the release retains is the
POC's existing bare empty row; the richer empty state is the deferred
increment's work. The other four states are in the release.

| State | In the MVP? | Where | What it shows |
|---|---|---|---|
| **Empty** | **No — deferred** [Q1] [memory:M3] | W2 with no assets; W6 with no holders; W3's history with no entries | *Future-state guidance only.* The deferred increment is expected to render a message naming what would appear here and the action that creates it. The MVP retains the POC's bare "No assets yet." row and does not add the primary action — that addition is the deferred item's work [memory:M3] |
| **Loading** | W1, W2, W6 | The POC is a synchronous server-rendered application with no loading state. The MVP adds no client-side rendering, so **no loading state is drawn** — and the wireframes say so, because a spinner drawn into a synchronous page would be a lie about how the application works |
| **Success** | Every action that changes state; W5 after a successful edit | The detail screen after a transition, showing the new status chip and the new history entry at the top. After an edit, the detail screen shows the new values and a new `edit` history entry, and the status chip is unchanged because the edit changed no bucket |
| **Error** | W4, W5 (validation and collision); W7, W8 (missing reason); W3 (transition refused) | The POC renders server errors in a red block; the MVP distinguishes validation errors, uniqueness collisions, and refused transitions. On W5 the collision can only name another asset, because the asset being edited is excluded from its own comparison |
| **Export result** | W2's Export CSV action | Not a screen state — the export produces a file, not a view. The file has three cases: rows matching the current filter (row count equal to the list's count), no rows matching the filter (a header-only file — the list's own zero-result message is a deferred empty state and is not part of the release), and every cell value sanitised so it cannot be interpreted as a formula. See F6 in `user-flow.md` |
| **Partial / edge** | W3 for a `lost` asset; W3 for a `discarded` asset; W6 for a holder with only last-held assets | See below. The zero-result case is a deferred empty state and is described under the empty-state guidance below, not here |

### The edge states worth drawing out

**An `in-stock` asset that has gone missing.** The `in-stock → lost` edge is
new in this release [memory:M3], and it exists because an asset registered into
stock and then found missing has no other way to record the loss. The screen
offers it alongside the assign action:

```
+------------------------------------------------------------------+
| <main>                                                              |
|  h1  ThinkPad X1 Carbon                                            |
|  +----------------------+  +-----------------------------------+    |
|  | Status                |  | Actions                          |    |
|  | [In stock]            |  |                                   |    |
|  |                       |  | Assign to [__________] [Assign]   |    |
|  | Category   Hardware   |  |                                   |    |
|  | Serial/Key SN-4471    |  | [Mark lost]                      |    |
|  | Holder     --         |  |                                   |    |
|  | Last holder  --       |  |                                   |    |
|  +----------------------+  +-----------------------------------+    |
|  h2  History                                                        |
|  | 2026-09-14T08:02:10Z  create      system                      |
|  |   Registered "ThinkPad X1 Carbon".                             |
+------------------------------------------------------------------+
```

Both Holder and Last holder are empty, because an asset that was never assigned
to anyone has no prior holder to preserve. Marking it lost opens the same
reason dialog as every other loss, and the loss records the fact that the
asset was in stock rather than in someone's hands.

**A `lost` asset on the detail screen.** The POC renders a dead end — "This
asset is marked lost and cannot be transitioned." The MVP replaces that with
the recovery action [Q1]:

```
+------------------------------------------------------------------+
| <main>                                                              |
|  h1  ThinkPad X1 Carbon                                            |
|  +----------------------+  +-----------------------------------+    |
|  | Status                |  | Actions                          |    |
|  | [Lost]                |  |                                   |    |
|  |                       |  | [Recover asset]                  |    |
|  | Holder     --         |  |                                   |    |
|  | Last holder  Dana R   |  | [Edit asset]                     |    |
|  +----------------------+  +-----------------------------------+    |
|  h2  History                                                        |
|  | 2026-10-01T11:02:00Z  mark-lost   A. Okonkwo                 |    |
|  |   "ThinkPad X1 Carbon" marked as lost. Last holder: Dana R.   |    |
+------------------------------------------------------------------+
```

The `Holder` field is empty and `Last holder` is populated. That contrast is the
visible form of `last_assigned_to` doing its job, and it is the reason the loss
event no longer destroys the previous holder's identity.

**A `discarded` asset on the detail screen.** The row and history stay
reachable at their detail URL [memory:M4]:

```
+------------------------------------------------------------------+
| <main>                                                              |
|  h1  ThinkPad X1 Carbon                                            |
|  +----------------------+  +-----------------------------------+    |
|  | Status                |  | Actions                          |    |
|  | [Discarded]           |  |                                   |    |
|  |                       |  | [Edit asset]                     |    |
|  | Holder     --         |  |  This asset was discarded. It is   |    |
|  | Last holder  Dana R   |  |  no longer part of Active         |    |
|  |                       |  |  Inventory, but its record and    |    |
|  |                       |  |  history are kept.                |    |
|  +----------------------+  +-----------------------------------+    |
|  h2  History                                                        |
|  | 2026-11-05T16:22:41Z  discarded  A. Okonkwo                  |    |
|  |   "ThinkPad X1 Carbon" discarded. Reason: end of lease.       |    |
|  |   Assignment resolved by the discard. Last holder: Dana R.    |    |
+------------------------------------------------------------------+
```

**A filtered list with no results.** *Deferred — future-state guidance, not a
state this release builds* [Q1] [memory:M3]. The empty states are deferred, and this case is
one of them. The guidance for the later increment is that this state is
distinct from the empty database: the message says the filters matched nothing
and offers a reset, rather than "No assets yet" — which would be false. The MVP
retains the POC's bare empty row in both cases and does not build either message.

**A holder whose only assets are last-held.** The row shows the assets with a
`[Lost]` chip and a "last holder" marker, and the holder's chips show only the
buckets those assets are actually in — for a holder with nothing but a lost
asset, the chip row reads `[Lost 1]` and no `assigned` chip at all. The
directory does not present a holder who has nothing as if they had something,
and it does not manufacture a zero-count chip for a bucket the holder has no
asset in.

---

## Accessibility Commitments

The wireframes carry a **WCAG 2.1 AA** floor [Q11]. This is the first point in
the initiative where an accessibility level is stated at all — no upstream
artifact names one — so it is recorded here as the floor the release's screens
are drawn against, and Requirements Analysis owns turning it into testable
requirements.

Concretely, the floor means:

| Commitment | Where it shows in the wireframes |
|---|---|
| Colour is never the only carrier of meaning | The status chip carries the status name as text; the nav's active state is weight and underline, not colour |
| Every interactive element is reachable and operable by keyboard | Every control in every frame is a native `<button>`, `<a>`, `<input>`, `<select>`, or `<textarea>`; nothing is a clickable `<div>` |
| Focus is visible and never trapped outside a modal | Focus styling is a requirement of the release, not a default the POC's stylesheet happens to provide — the POC's stylesheet has no focus rule at all |
| Form errors are associated with their field | The inline warning is bound by `aria-describedby`; the submit-time block is a `role="alert"` region that receives focus |
| Structure is programmatic | One `h1` per screen, headings in order, landmarks `header` / `nav` / `main`, tables with `<caption>` and `scope` |
| Status changes are announced | The history panel and the post-transition detail view announce the new entry; the dialog's consequence paragraph is read before the reason field |
| Target size and contrast | AA contrast for text against its background, and adequate target sizes for the tiles, chips, and dialog buttons |

The status-chip colour vocabulary is inherited from the POC, which already pairs
each background with a distinct text colour. The AA floor applies to the new
surfaces — the dashboard tiles, the dialogs, and the fifth `discarded` chip — and
the POC's existing chips are not re-specified here.

**The skip link is drawn.** A skip link to bypass the top bar is required by
the keyboard commitment, and it is drawn in the shared frame as the first
focusable element on every screen. Requirements Analysis turns it into a
testable requirement and the Functional Design stage settles its exact
treatment — but the wireframes no longer leave it implied.

**What the wireframes do not settle.** The remaining structural details that
the commitments imply but the screens do not specify: the exact focus-ring
treatment, the announcement text for a status change, and the DOM order of the
top bar's controls. Requirements Analysis and the Functional Design stage
settle these.

---

## Deferred and Deliberately Absent

These are absences with reasons, recorded so a later stage does not read them
as oversights.

| Absent | Why |
|---|---|
| **Responsive layouts** | Responsive UI is deferred to the later increment alongside the design system, because a responsive surface built on an ad-hoc stylesheet is re-worked when the tokens land [Q10] [memory:M3]. The desktop frames are drawn at the POC's 960px container so the later increment has a stable width to adapt from |
| **A design system, tokens, a type scale, spacing tokens, radius and shadow scales, iconography** | The design system is the largest single body of new work in the MVP and is deferred from this release [Q12] [memory:M3]. The wireframes specify layout and content, and reuse the POC's existing colour semantics |
| **Pagination controls, and result counts as a pager** | Deferred to a later increment [Q1] [memory:M3]. The count line is a count, not a pager — see the boundary note below |
| **Improved search** | Deferred; the MVP keeps the POC's existing search control [memory:M3] |
| **Empty states** | Deferred to a later increment [Q1] [memory:M3]. The MVP retains the POC's existing bare empty row on W2, W6, and W3's history; the richer empty state — a message naming what would appear there plus the action that creates it — is the deferred increment's work. Nothing in this stage draws an empty state as a screen this release must render |
| **A login screen** | The actor mechanism is an open decision [Q17]. Candidate D (application-managed login) would add a screen; the other three would not. Drawing one now would assert a mechanism the release has not chosen |
| **An operator-selection picker** | The same reason. Candidate C is one of four, and the wireframes deliberately do not assert it. The `Acting as` element is drawn read-only |
| **A holder detail page** | Holders are derived from assets, not entities with their own lifecycle in this release [Q6] |
| **A bulk-edit or bulk-transition surface** | Not named in the approved set; the release's must-haves are single-asset actions |
| **A loading state or spinner** | The application is synchronous and server-rendered. A drawn spinner would misrepresent how it works |
| **Screens 05 through 09 of workbook section 9** | The eight-screen set follows the confirmed release contents, not the workbook's numbering. The §9 amendments attach to specific screen numbers in Requirements Analysis, and the mapping is recorded there [Q1] |

**Where the workbook amendments land.** The amendment surface is fixed and
closed — sections 4.1, 4.2.5, 4.3, 4.4, 6.1, 6.4, 6.5, 9, 10, 21.1, 21.2, 22,
24, and the two new section 27 sections [memory:M3]. Most of those are data or
behaviour amendments that a screen does not carry. The ones a screen does carry
are mapped here, so that no amendment is left implicit:

| Workbook location | What it requires | Where it lands in these wireframes |
|---|---|---|
| §4.1 — transition table, recovery, `in-stock → lost`, `assigned → discarded` | The eight edges between the five buckets, the recovery transition with its reason, and the discard transition resolving the assignment inline | **W3**'s actions panel and edge table; **F5a**'s transition map; the **W8a** discard dialog and **W8b** recovery dialog |
| §4.2.5 — the `last_assigned_to` mechanism | The previous holder is preserved and separately visible | **W3**'s "Last holder" field; **W2**'s two holder columns; **W6**'s "last holder" markers |
| §4.3 — the actor-trust rule | Actor identity is resolved from trusted server-side context, never from the request | The shared frame's read-only `Acting as` indicator; **F5f**'s cross-cutting rule |
| §6.1 — `last_assigned_to` added to the asset fields | The field exists on the record | **W3**, **W2**, **W6** — as above |
| §9 Screen 01 — "Active Inventory", label "Returned", "available to assign" sub-metric | The dashboard's two headline tiles, the relabelled fourth bucket, and the sub-metric | **W1**'s two headline tiles, the "Returned" tile, and the sub-metric on Active Inventory |
| §21.1 Scenario 3 — "Status becomes Returned" | A returned asset's status reads **Returned**, and it is a distinct resting state rather than a synonym for in stock | **W1**'s "Returned" bucket tile and label; **W2**'s `Returned` status chip and the "Returned" option in the status filter; **W3**'s `returned` status chip |
| §21.1 — new scenarios for recovery, discard, loss reason, and the audit-actor invariant | Four new scenarios covering the recovery transition, the discard transition, the reason capture, and the actor on every audit entry | **F5c** (loss reason), **F5d** (discard), **F5e** (recovery), **F5f** (the actor invariant), and the **cross-cutting audit-entry path** in `user-flow.md` |
| §24 — the Audit Completeness metric qualifiers | Pre-MVP history is backfilled to a `system` actor and excluded from the metric | **W3**'s history panel, which shows the `system` actor on backfilled entries |
| §24 — the CSV formula-safety metric | Exported cells cannot be interpreted as a formula | **W2**'s Export CSV action and **F6** in `user-flow.md` |
| §27 — Inventory Counting Definitions | One shared definition for Active Inventory and Total Records | **W1**, and the shared counting path that **W2**, **W6**, and **F6** read from |
| §27 — Audit Action Vocabulary | A fixed action vocabulary including `recovered` as distinct from `assign` and `return` | **W3**'s history entries and the **cross-cutting audit-entry path** |

The mapping from the eight wireframes to the workbook's section 9 screen numbers
is settled at Requirements Analysis, where the §9 amendments are applied.

---

## Assumptions & Open Questions

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

---

## Sources Consumed

- **intent-statement** (`aidlc/spaces/default/intents/261106-asset-tracker-mvp/ideation/intent-capture/intent-statement.md`) — the problem framing, the target customer, the Audit Completeness metric, the confirmed scope bounds, and the actor-trust rule.
- **scope-document** (`aidlc/spaces/default/intents/261106-asset-tracker-mvp/ideation/scope-definition/scope-document.md`) — the in/out boundary of the release, the four count-consuming surfaces and the shared counting guarantee, the three approved invariants, the actor-identity boundary and its candidate shortlist, and the deferred-item set.
- **intent-backlog** (`aidlc/spaces/default/intents/261106-asset-tracker-mvp/ideation/scope-definition/intent-backlog.md`) — the ranked proto-Units, the risk-first ordering, the actor-identity decision's position as the foundation's blocking dependency, and the deferred items C-01 through C-05 with their triggers.
- **rough-mockups-questions** (`aidlc/spaces/default/intents/261106-asset-tracker-mvp/ideation/rough-mockups/rough-mockups-questions.md`) — the nineteen confirmed answers (Q1–Q19) and the thirty-four accepted assumptions these wireframes are drawn against. The `## Assumptions & Open Questions` section above carries the seventeen of those thirty-four that this deliverable itself relies on, together with the assumptions this stage took while drawing; each of those carries its own grounding tags.
- **competitive-analysis** (`aidlc/spaces/default/intents/261106-asset-tracker-mvp/ideation/market-research/competitive-analysis.md`) — the table-stakes and differentiator split, which places the five operator-facing must-haves as table-stakes and the audit properties as the differentiator.
- **constraint-register** (`aidlc/spaces/default/intents/261106-asset-tracker-mvp/ideation/feasibility/constraint-register.md`) — the fixed technical constraints the screens must not contradict, including the shared uniqueness definition, the shared counting definition, the actor-trust rule, and the per-transition validation requirement.
- **the POC's own application shape** (`src/routes/assets.js`, `src/services/asset-service.js`, `src/repositories/assets-repo.js`, `views/list.ejs`, `views/new.ejs`, `views/detail.ejs`, `public/styles.css`) — the existing screens, the transition map, the current status vocabulary, the audit-panel behaviour, and the visual vocabulary these wireframes extend.

---

## Review

Reserved for the reviewer at the approval gate.
