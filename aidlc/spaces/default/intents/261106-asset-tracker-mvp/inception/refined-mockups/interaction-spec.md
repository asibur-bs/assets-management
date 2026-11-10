# Interaction Specification — Asset Tracker MVP

**Stage**: refined-mockups (inception)
**Intent**: 261106-asset-tracker-mvp
**Space**: default
**Scope**: feature
**Date**: 2026-11-10

The component-level specification of every new and every changed interaction in
the Asset Tracker MVP. Each section follows the component-spec template.

The refined ASCII frames themselves are in `mockups.md`; this file specifies the
components those frames are built from.

---

## The constrained responsive rule

Responsive UI is deferred (US8.7). The desktop frames at the application's
existing 960px container are the **design of record** for every screen in this
release.

The responsive rows in each component below therefore record only the
**minimum behaviour the release must not break**, and name the full
breakpoint treatment as deferred. Three constraints apply throughout:

| # | Constraint | Why it is in the release at all |
|---|---|---|
| R1 | **The container width does not change.** Every screen renders inside the existing 960px container. | The desktop treatment is the design of record, and a release that quietly narrowed or widened it would ship an unstated design change. |
| R2 | **The two-column regions stack in a fixed order.** On W3 the field panel precedes the actions panel; on W1 the Active Inventory tile precedes the Total Records tile. The order does not invert. | The two-column regions carry a reading order — the fields tell you which asset you are looking at before the actions tell you what you can do to it. A reversal would read as a different screen. |
| R3 | **The tables keep their horizontal-scroll affordance.** W2's results table, W6's expansion tables and W3's field table scroll horizontally rather than reflowing their columns. | The column sets are fixed by the release — the list's six columns are the CSV's six columns — and a reflow would break the correspondence between what is read and what is exported. |

**The full breakpoint treatment — what happens below 768px, between 768px and
1024px, and above 1024px — is deferred to the design-system increment**, along
with the type scale, the spacing tokens and the iconography it would be built
on. A responsive surface built on an ad-hoc stylesheet is re-worked when the
tokens land, and this release does not build one.

The component-spec template's three breakpoint rows are retained below, and
each is filled with the deferred statement rather than a design, so that the
gap is visible in the artifact rather than implied by its absence.

---

## The assumed request contract

The application is server-rendered with no client-side rendering. Every
interaction is a server round-trip or a plain form post.

This specification records **only the interaction-level contract each design
assumes**: which request each control issues, what the response changes, and
what the response carries for the announcement region. It carries **no route
paths, no JSON shapes and no handler names** — those belong to Contract
Design, and this is the design's *assumption* on the domain side, which Domain
Design may satisfy or correct.

The contract vocabulary is deliberately small:

| Term | Meaning |
|---|---|
| **Request** | The interaction's effect on the server: the operation performed and the inputs it carries. |
| **Response** | What comes back: the rendered state the screen moves to. |
| **Announcement** | The text a `role="status"` or `role="alert"` region carries, when the response includes one. |

Two properties hold across every write contract below and are not restated
per component:

1. **The actor is never taken from the request.** A request that supplies an
   actor is ignored on that field; the server-resolved actor is what is
   written.
2. **A write and its audit entry are one unit.** The response reports the
   asset's new state and the appended history entry together; it never
   reports one without the other.

---

## 1. Skip Link

| Field | Value |
|---|---|
| Component | Skip link |
| Description | The first focusable element on every screen; bypasses the top bar to reach the main landmark |
| Category | navigation |

### States

| State | Description | Trigger |
|---|---|---|
| default | Visually hidden; present in the accessibility tree as a link named "Skip to main content" | page load |
| hover | Visually hidden; hover does not reveal it | mouseover |
| focus | Visually shown, positioned at the top-left of the viewport | Tab key |
| disabled | Not applicable | — |
| loading | Not applicable | — |
| error | Not applicable | — |
| empty | Not applicable | — |

### Props / Inputs

| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `target` | string | yes | `#main` | The id of the main landmark the link jumps to |
| `label` | string | yes | `Skip to main content` | The link's visible-on-focus text |

### Responsive Behaviour

| Breakpoint | Behaviour |
|---|---|
| mobile (<768px) | Deferred to the design-system increment. |
| tablet (768–1024px) | Deferred to the design-system increment. |
| desktop (>1024px) | The design of record: visually hidden until focused, then shown at the top-left of the viewport. |

### Accessibility

| Requirement | Implementation |
|---|---|
| ARIA role | `link` — an anchor to `#main` |
| Keyboard interaction | First `Tab` stop on every screen; `Enter` moves focus to the target |
| Label / aria-label | Visible text "Skip to main content" |
| Contrast ratio | WCAG AA (4.5:1 text, 3:1 UI components) when shown on focus |
| Screen reader | Announced as "Skip to main content, link" on every screen |
| Focus management | Focus moves to the main landmark on activation |

### Usage Example

```
<a class="skip-link" href="#main">Skip to main content</a>
```

---

## 2. Acting-as Indicator

| Field | Value |
|---|---|
| Component | Acting-as indicator |
| Description | Shows the actor the server resolved for this session; read-only on every released screen |
| Category | display |

### States

| State | Description | Trigger |
|---|---|---|
| default | The resolved actor's display name, preceded by the label "Acting as:" | page load |
| hover | No change; the element is not interactive | mouseover |
| focus | Not focusable; it carries no control | — |
| disabled | Not applicable | — |
| loading | Not applicable | — |
| error | Not applicable | — |
| empty | Not applicable — the server always resolves an actor, and the `system` actor is a resolvable identity for backfilled history |

### Props / Inputs

| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `actor` | string | yes | — | The server-resolved actor's display name |
| `provisional` | boolean | no | `true` | Marks the value as reserved against an undecided mechanism; carries no rendered difference |

### Responsive Behaviour

| Breakpoint | Behaviour |
|---|---|
| mobile (<768px) | Deferred to the design-system increment. |
| tablet (768–1024px) | Deferred to the design-system increment. |
| desktop (>1024px) | The design of record: right-aligned in the top bar, following the primary action. |

### Accessibility

| Requirement | Implementation |
|---|---|
| ARIA role | `text` — a `<span>` inside the header landmark, not a control |
| Keyboard interaction | Not focusable; it carries no control that would let a user change it |
| Label / aria-label | Visible text "Acting as: <actor>" |
| Contrast ratio | WCAG AA (4.5:1 text, 3:1 UI components) |
| Screen reader | Read as "Acting as: A. Okonkwo" when the header is traversed |
| Focus management | Not applicable — the indicator is never a focus target |

### Usage Example

```
<span class="acting-as">Acting as: <%= actor %></span>
```

**The interaction contract.** The indicator issues **no request**. It renders
a value the server resolved before the page was rendered. Because the
actor-identity mechanism is an open decision (I-01 / I-03), the component
carries the *value* but asserts nothing about *how* the server resolved it.

---

## 3. Status Chip

| Field | Value |
|---|---|
| Component | Status chip |
| Description | Carries a status bucket as text inside a coloured chip |
| Category | display |

### States

| State | Description | Trigger |
|---|---|---|
| default | The chip shows the shared display label for the bucket | page load |
| hover | No change | mouseover |
| focus | No change; the chip is not focusable | — |
| disabled | Not applicable | — |
| loading | Not applicable | — |
| error | Not applicable | — |
| empty | Not applicable |

### Props / Inputs

| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `status` | string | yes | — | The stored bucket value: `in-stock`, `assigned`, `returned`, `lost` or `discarded` |
| `label` | string | yes | — | The shared display label, supplied by the route from the shared vocabulary |

### Responsive Behaviour

| Breakpoint | Behaviour |
|---|---|
| mobile (<768px) | Deferred to the design-system increment. |
| tablet (768–1024px) | Deferred to the design-system increment. |
| desktop (>1024px) | The design of record: the chip's text is the status name, in the POC's existing chip treatment. |

### Accessibility

| Requirement | Implementation |
|---|---|
| ARIA role | `text` |
| Keyboard interaction | Not focusable |
| Label / aria-label | The chip's visible text **is** the label — "In stock", "Assigned", "Returned", "Lost", "Discarded" |
| Contrast ratio | WCAG AA (4.5:1 text, 3:1 UI components) for the chip's text against its background. The `discarded` chip uses the stylesheet's existing muted grey, and the contrast floor applies to it as a new surface. |
| Screen reader | Announced as the status name alone, with no colour attached |
| Focus management | Not applicable |

### Usage Example

```
<span class="status-chip status-<%= asset.status %>"><%= statusLabel(asset.status) %></span>
```

**The interaction contract.** The chip issues **no request**. The label
mapping is display-only: the stored value stays `in-stock` in the database, in
the CSV export and in the filter's option values, and the chip's CSS class is
the stored value so the existing colour rules keep working. One mapping is
used by W2's chips, W2's status filter options, W3's status chip and W6's
per-holder chips.

---

## 4. Dashboard Headline Tile

| Field | Value |
|---|---|
| Component | Dashboard headline tile |
| Description | Carries one headline count and its sub-metric on the dashboard |
| Category | display |

### States

| State | Description | Trigger |
|---|---|---|
| default | The count, its label and its supporting caption | page load |
| hover | The tile's link affordance shows, without changing the count | mouseover |
| focus | The tile's focus ring is visible | Tab key |
| disabled | Not applicable | — |
| loading | Not drawn — the application is synchronous and server-rendered | — |
| error | Not drawn — a server error is a 500 with the error middleware's response, not a rendered state | — |
| empty | The tile renders `0`; an empty estate is a count of zero, not an empty tile |

### Props / Inputs

| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `label` | string | yes | — | "Active Inventory" or "Total Records" |
| `count` | number | yes | — | The shared counting function's result |
| `caption` | string | no | — | The supporting sentence, e.g. "every asset ever registered, never deleted" |
| `submetricLabel` | string | no | — | "available to assign" on the Active Inventory tile only |
| `submetricCount` | number | no | — | The `in-stock` bucket count, on the Active Inventory tile only |
| `href` | string | no | — | The link to the filtered asset list; absent on the headline tiles, present on the bucket tiles |

### Responsive Behaviour

| Breakpoint | Behaviour |
|---|---|
| mobile (<768px) | Deferred to the design-system increment. |
| tablet (768–1024px) | Deferred to the design-system increment. |
| desktop (>1024px) | The design of record: the Active Inventory tile is left of the Total Records tile, and the order does not invert (constraint R2). |

### Accessibility

| Requirement | Implementation |
|---|---|
| ARIA role | `link` on the bucket tiles; `group` on the headline tiles |
| Keyboard interaction | Bucket tiles are `Tab`-reachable and activate with `Enter` |
| Label / aria-label | The visible label plus the count, so a screen reader reads "In stock, 2" rather than "2" |
| Contrast ratio | WCAG AA (4.5:1 text, 3:1 UI components) |
| Screen reader | The bucket tile's accessible name is the bucket name and its count |
| Focus management | Focus returns to the tile after the filtered list is left, by the browser's normal history behaviour |

### Usage Example

```
<a class="tile" href="<%= listHref({ status: bucket }) %>">
  <span class="tile-label"><%= label %></span>
  <span class="tile-count"><%= count %></span>
</a>
```

**The interaction contract.** The tiles issue **no request of their own** — they
are links. Activating a bucket tile requests the asset list filtered to that
bucket; the response renders W2 with the filter applied and its count line
reporting the matching count. The counts themselves are read from the shared
counting function; no tile computes a count.

---

## 5. Dashboard Attention Panel

| Field | Value |
|---|---|
| Component | Dashboard attention panel |
| Description | Carries the two whole-bucket counts an administrator would otherwise compute by hand |
| Category | display |

### States

| State | Description | Trigger |
|---|---|---|
| default | Two separate items: the `lost` count and the `discarded` count | page load |
| hover | No change | mouseover |
| focus | No change; the panel is not focusable | — |
| disabled | Not applicable | — |
| loading | Not drawn — the application is synchronous and server-rendered | — |
| error | Not drawn | — |
| empty | Both items render `0`; the panel is never empty and never disappears |

### Props / Inputs

| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `lostCount` | number | yes | — | The `lost` bucket count, unfiltered and not time-windowed |
| `discardedCount` | number | yes | — | The `discarded` bucket count, unfiltered and not time-windowed |
| `showSum` | boolean | no | `false` | Whether a summed attention figure appears **in addition** to the two items |

### Responsive Behaviour

| Breakpoint | Behaviour |
|---|---|
| mobile (<768px) | Deferred to the design-system increment. |
| tablet (768–1024px) | Deferred to the design-system increment. |
| desktop (>1024px) | The design of record: a single bordered region below the bucket tiles. |

### Accessibility

| Requirement | Implementation |
|---|---|
| ARIA role | `region` with an accessible name "Attention" |
| Keyboard interaction | Not focusable |
| Label / aria-label | The section heading "Attention" names the region |
| Contrast ratio | WCAG AA (4.5:1 text, 3:1 UI components) |
| Screen reader | Read as "Attention, 2 assets marked lost — no recovery recorded, 1 asset discarded" |
| Focus management | Not applicable |

### Usage Example

```
<section class="attention" aria-labelledby="attention-heading">
  <h2 id="attention-heading">Attention</h2>
  <ul>
    <li><%= lostCount %> <%= lostCount === 1 ? 'asset' : 'assets' %> marked lost — no recovery recorded</li>
    <li><%= discardedCount %> <%= discardedCount === 1 ? 'asset' : 'assets' %> discarded</li>
  </ul>
</section>
```

**The interaction contract.** The panel issues **no request**. Its two counts
are read from the shared counting function through the same filter builder the
bucket tiles use, with no date dimension — the shared filter carries only
search, category, status, sort and direction, so the panel cannot express "this
quarter" and does not pretend to.

The two items are separate, and neither is replaced by a sum. A summed figure
may appear alongside them and equals their sum.

---

## 6. Asset-list Filter Form

| Field | Value |
|---|---|
| Component | Asset-list filter form |
| Description | Carries the five filter dimensions and the Apply and Reset controls |
| Category | input |

### States

| State | Description | Trigger |
|---|---|---|
| default | All five controls at their unfiltered values; the list shows every record | page load |
| hover | Native control hover | mouseover |
| focus | Native focus ring on the control | Tab key |
| disabled | The status filter's `Discarded` option is never disabled; no control in the form is disabled | — |
| loading | Not drawn — the application is synchronous and server-rendered | — |
| error | Not drawn — the filter form has no validation state; an invalid filter value falls back to the unfiltered dimension | — |
| empty | The search field may be empty; that is a value, not an error |

### Props / Inputs

| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `search` | string | no | `""` | Free-text search over name and serial or key — the POC's existing search, unchanged |
| `category` | string | no | `all` | `all`, `hardware` or `software-license` |
| `status` | string | no | `all` | `all`, `in-stock`, `assigned`, `returned`, `lost` or `discarded` |
| `sort` | string | no | `name` | The sort column, whitelisted to a literal |
| `direction` | string | no | `asc` | `asc` or `desc` |

### Responsive Behaviour

| Breakpoint | Behaviour |
|---|---|
| mobile (<768px) | Deferred to the design-system increment. |
| tablet (768–1024px) | Deferred to the design-system increment. |
| desktop (>1024px) | The design of record: the five controls wrap across two rows inside the filter region, with Apply and Reset right-aligned on the third row. |

### Accessibility

| Requirement | Implementation |
|---|---|
| ARIA role | `form` with an accessible name; the region is a `<form>` inside `<main>` |
| Keyboard interaction | Every control is `Tab`-reachable; `Enter` inside a text input submits the form; `Enter` on a `<select>` submits it |
| Label / aria-label | Every control has a real `<label>` bound by `for`/`id`: "Search", "Category", "Status", "Sort", "Direction" |
| Contrast ratio | WCAG AA (4.5:1 text, 3:1 UI components) |
| Screen reader | The form's name is announced on entry; each control announces its label and its selected option |
| Focus management | Focus is not moved by the response — the page re-renders server-side and the browser restores the focus position |

### Usage Example

```
<form method="get" action="/assets" aria-label="Filter assets">
  <label for="filter-search">Search</label>
  <input id="filter-search" name="q" type="search" value="<%= filters.search %>">
  <label for="filter-category">Category</label>
  <select id="filter-category" name="category">...</select>
  <button type="submit">Apply</button>
  <button type="button" id="reset-filters">Reset</button>
</form>
```

**The interaction contract.**

| Control | Request | Response |
|---|---|---|
| `Apply` | Submits the form with the five dimensions' current values | W2 re-rendered against the filter; the count line reports the matching count and the shown count |
| `Reset` | Submits the form with all five dimensions cleared | W2 re-rendered against the unfiltered set; the count line reports the total record count as the matching count, **without requiring a second Apply** |

Reset is a single action that both clears and re-applies. It is not a second
submit step, and it does not require the administrator to press Apply
afterwards.

The release adds no filter dimension beyond these five.

---

## 7. Reset Control

| Field | Value |
|---|---|
| Component | Reset control |
| Description | Clears every filter dimension and re-renders the list in one action |
| Category | input |

### States

| State | Description | Trigger |
|---|---|---|
| default | Enabled, labelled "Reset", beside the Apply control | page load |
| hover | Native button hover | mouseover |
| focus | Focus ring visible | Tab key |
| disabled | Never disabled | — |
| loading | Not drawn | — |
| error | Not drawn | — |
| empty | Enabled regardless of whether any filter is currently applied |

### Props / Inputs

| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `clears` | string[] | yes | `['q', 'category', 'status', 'sort', 'direction']` | The filter dimensions the control clears |
| `label` | string | yes | `Reset` | The accessible name, which must identify the control as resetting the filters |

### Responsive Behaviour

| Breakpoint | Behaviour |
|---|---|
| mobile (<768px) | Deferred to the design-system increment. |
| tablet (768–1024px) | Deferred to the design-system increment. |
| desktop (>1024px) | The design of record: right-aligned beside `Apply` in the filter region. |

### Accessibility

| Requirement | Implementation |
|---|---|
| ARIA role | `button` |
| Keyboard interaction | `Tab`-reachable; `Enter` or `Space` activates it |
| Label / aria-label | Visible text "Reset" — a control named only by its position or by a glyph fails the criterion |
| Contrast ratio | WCAG AA (4.5:1 text, 3:1 UI components) |
| Screen reader | Announced as "Reset, button" |
| Focus management | Focus is not moved by the response; the re-rendered list carries the same control in the same position |

### Usage Example

```
<button type="button" id="reset-filters" data-clears="q,category,status,sort,direction">Reset</button>
```

**The interaction contract.** Activating Reset issues the same filter
request as Apply, with every dimension cleared. The response re-renders the
list against the empty filter and the count line reports the cleared figures.

---

## 8. Export CSV Control

| Field | Value |
|---|---|
| Component | Export CSV control |
| Description | Requests the filtered asset list as a CSV file |
| Category | input |

### States

| State | Description | Trigger |
|---|---|---|
| default | Enabled, labelled "Export CSV", in the page heading | page load |
| hover | Native button hover | mouseover |
| focus | Focus ring visible | Tab key |
| disabled | Never disabled — an export that matches nothing still produces a header-only file | — |
| loading | Not drawn — the response is a file, not a re-render | — |
| error | Not drawn — a server error is a 500 with the error middleware's response, not a rendered state | — |
| empty | Enabled; a zero-match filter produces a file with a header row and no data rows |

### Props / Inputs

| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `filter` | object | yes | — | The list's current filter; the exported row set is the matching row set for it |
| `filename` | string | yes | `assets-export.csv` | The filename the response names |
| `contentType` | string | yes | `text/csv; charset=utf-8` | The response's content type |

### Responsive Behaviour

| Breakpoint | Behaviour |
|---|---|
| mobile (<768px) | Deferred to the design-system increment. |
| tablet (768–1024px) | Deferred to the design-system increment. |
| desktop (>1024px) | The design of record: right-aligned in the page heading beside the `h1`. |

### Accessibility

| Requirement | Implementation |
|---|---|
| ARIA role | `button` — not a link styled as a button |
| Keyboard interaction | `Tab`-reachable; `Enter` or `Space` activates it |
| Label / aria-label | Visible text "Export CSV" |
| Contrast ratio | WCAG AA (4.5:1 text, 3:1 UI components) |
| Screen reader | Announced as "Export CSV, button" |
| Focus management | The response is a file download; the page does not change and focus is unaffected |

### Usage Example

```
<button type="submit" form="filter-form" id="export-csv">Export CSV</button>
```

**The interaction contract.**

| Aspect | Contract |
|---|---|
| Request | The list's current filter — the same five dimensions the list is showing |
| Response | A CSV file, not a rendered view. Filename `assets-export.csv`; content type `text/csv; charset=utf-8`; UTF-8 encoded; `Content-Disposition` naming the file; `X-Content-Type-Options: nosniff` |
| Header row | Exactly `Name, Category, Serial / Key, Status, Holder, Last holder`, in that order. Every data row carries exactly those six fields; no seventh column |
| Row count | Equal to the list's matching count for that filter. The export never silently truncates its row set |
| Zero matches | A header row and no data rows. The export does not fail and does not export everything instead |
| Cell safety | Every string cell that begins with `=`, `+`, `-`, `@`, a tab or a carriage return is prefixed with a single quote before quoting — applied to **every** string cell, not to a selected subset of columns |
| Excluded | Notes and audit history. Neither is a list column, and exporting either would break the property that the export's rows and columns agree with what the list shows |
| Announcement | None. The response is a file, not a rendered page, so there is no announcement region |

---

## 9. Count Line

| Field | Value |
|---|---|
| Component | Count line |
| Description | States what is being shown and what matched, and on the directory what it counts |
| Category | display |

### States

| State | Description | Trigger |
|---|---|---|
| default | "Showing 8 of 8 records" on the list; "Showing 2 holders — distinct display holders, excluding Unassigned" on the directory | page load |
| hover | No change | mouseover |
| focus | No change; it is plain text | — |
| disabled | Not applicable | — |
| loading | Not drawn | — |
| error | Not drawn | — |
| empty | The matching figure reads 0 and the shown figure reads 0 |

### Props / Inputs

| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `shown` | number | yes | — | How many records the screen is rendering — the **shown** figure |
| `matching` | number | yes | — | How many records match the applied filter — the **matching** figure |
| `subject` | string | yes | — | "records" on the list; "holders" on the directory |
| `qualifier` | string | no | — | The directory's clause stating what the figure counts: "distinct display holders, excluding Unassigned". Rendered only on the directory; omitted on the list, whose two figures are self-describing |

### Responsive Behaviour

| Breakpoint | Behaviour |
|---|---|
| mobile (<768px) | Deferred to the design-system increment. |
| tablet (768–1024px) | Deferred to the design-system increment. |
| desktop (>1024px) | The design of record: a single line above the table or above the holder rows. |

### Accessibility

| Requirement | Implementation |
|---|---|
| ARIA role | `text` — a `<p>` |
| Keyboard interaction | Not focusable |
| Label / aria-label | The visible text states both figures and, on the directory, what the figure counts |
| Contrast ratio | WCAG AA (4.5:1 text, 3:1 UI components) |
| Screen reader | Read in the document flow, before the table it describes |
| Focus management | Not applicable |

### Usage Example

```
<!-- The asset list: the shown figure and the matching figure. -->
<p class="count-line">Showing <%= shown %> of <%= matching %> records</p>

<!-- The assignee directory: one figure, plus the clause stating what it counts. -->
<p class="count-line">Showing <%= shown %> holders &mdash; <%= qualifier %></p>
```

**The interaction contract.** The count line issues **no request**. Every
figure is a read from the shared counting function.

**On the list, the line renders two figures and both are load-bearing.** The
**shown** figure is how many records the screen is rendering; the **matching**
figure is how many records match the applied filter. They coincide only when
no filter excludes a record — on the seed all eight assets match, so the line
reads "Showing 8 of 8 records" — and they differ whenever a filter narrows the
result. The shown figure never exceeds the matching figure. There is no third
figure on this line: the count is of records, and the list's total population
is not a separate figure the line reports.

**On the directory, the line renders one figure and states what it counts.**
The figure counts distinct display holders **excluding** the "Unassigned"
row, and the line renders the clause that says so, because "Showing 2 holders"
does not say *which* holders or whether the Unassigned row is among them. The
figure reports the **searched** population — the holders currently listed on
the screen — so the count line and the rendered rows can never disagree. When
the "Unassigned" row is present, the rendered row count is one greater than
the figure.

---

## 10. Asset-list Results Table

| Field | Value |
|---|---|
| Component | Asset-list results table |
| Description | The list's six columns, with the two holder columns kept separate |
| Category | display |

### States

| State | Description | Trigger |
|---|---|---|
| default | One row per matching asset | page load |
| hover | Native row hover | mouseover |
| focus | The asset-name link in the focused row carries the focus ring | Tab key |
| disabled | Not applicable | — |
| loading | Not drawn | — |
| error | Not drawn | — |
| empty | The application's existing bare empty row reading "No assets yet." — drawn in both the empty-inventory case and the filter-matches-nothing case |

### Props / Inputs

| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `rows` | object[] | yes | — | The matching assets, from the shared counting definition |
| `statusLabels` | object | yes | — | The shared display-label mapping, supplied by the route |
| `hrefBase` | string | yes | — | The base for each row's asset link |

### Responsive Behaviour

| Breakpoint | Behaviour |
|---|---|
| mobile (<768px) | Deferred to the design-system increment. |
| tablet (768–1024px) | Deferred to the design-system increment. |
| desktop (>1024px) | The design of record: six columns at the 960px container, scrolling horizontally rather than reflowing (constraint R3). |

### Accessibility

| Requirement | Implementation |
|---|---|
| ARIA role | `table` with a `<caption>` and a `scope` attribute on each column header |
| Keyboard interaction | The asset-name cell is a link and is `Tab`-reachable; `Enter` opens the detail screen |
| Label / aria-label | The `<caption>` names the table's subject and the applied filter |
| Contrast ratio | WCAG AA (4.5:1 text, 3:1 UI components) |
| Screen reader | The header row is announced with its scope; each row announces its six cells in order |
| Focus management | Focus returns to the list's `Search` input after the detail screen is left, by the browser's normal history behaviour |

### Usage Example

```
<table>
  <caption>Assets matching the applied filter</caption>
  <thead>
    <tr>
      <th scope="col">Name</th>
      <th scope="col">Category</th>
      <th scope="col">Serial / Key</th>
      <th scope="col">Status</th>
      <th scope="col">Holder</th>
      <th scope="col">Last holder</th>
    </tr>
  </thead>
  <tbody>...</tbody>
</table>
```

**The interaction contract.** The table issues **no request** of its own. The
row set is the matching row set under the applied filter, drawn from the
shared counting definition — the same set the export produces.

The two holder columns never fall back to each other: `Holder` shows the
current holder and is empty when there is none; `Last holder` shows the
preserved previous holder and is empty when there is none.

---

## 11. Holder Row (directory disclosure)

| Field | Value |
|---|---|
| Component | Holder row |
| Description | A holder's total and per-bucket chips, which expands in place to reveal that holder's assets |
| Category | navigation |

### States

| State | Description | Trigger |
|---|---|---|
| default | Collapsed: the holder's name, total and chips | page load |
| hover | Native link and button hover | mouseover |
| focus | The disclosure button carries the focus ring | Tab key |
| disabled | Not applicable | — |
| loading | Not drawn | — |
| error | Not drawn | — |
| empty | The "Unassigned" row over an empty estate renders with a total of 0 and no chips |

### Props / Inputs

| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `holder` | string | yes | — | The display-holder name, or "Unassigned" |
| `total` | number | yes | — | The count of assets whose display holder is this holder |
| `chips` | object[] | yes | — | The per-bucket breakdown; each chip's value equals the number of expanded rows in that bucket |
| `href` | string | yes | — | The link to the asset list filtered to this holder |
| `assets` | object[] | yes | `[]` | The holder's assets, for the expansion |

### Responsive Behaviour

| Breakpoint | Behaviour |
|---|---|
| mobile (<768px) | Deferred to the design-system increment. |
| tablet (768–1024px) | Deferred to the design-system increment. |
| desktop (>1024px) | The design of record: a full-width row above its expansion, with the expansion's table indented beneath it. |

### Accessibility

| Requirement | Implementation |
|---|---|
| ARIA role | The row carries two elements: a `<button>` with `aria-expanded` and `aria-controls` naming the holder and toggling the expansion, and a link for the row's navigation |
| Keyboard interaction | `Tab` to the disclosure button; `Enter` or `Space` toggles the expansion. `Tab` to the row's link; `Enter` navigates to the filtered list |
| Label / aria-label | The disclosure button's accessible name is the holder's name and its total; the row link's accessible name is the holder's name |
| Contrast ratio | WCAG AA (4.5:1 text, 3:1 UI components) |
| Screen reader | The disclosure announces its expanded state, so the state is not carried by appearance alone. Each expanded asset announces whether it is currently held or last-held |
| Focus management | Toggling the expansion does not move focus; activating the row's link navigates away |

### Usage Example

```
<div class="holder-row">
  <button type="button" aria-expanded="<%= expanded %>" aria-controls="assets-<%= id %>">
    <%= holder %>
  </button>
  <span class="holder-total"><%= total %> assets</span>
  <ul class="holder-chips">
    <% chips.forEach((chip) => { %>
      <li><%= chip.label %> <%= chip.count %></li>
    <% }) %>
  </ul>
  <a href="<%= href %>">View assets</a>
</div>
```

**The interaction contract.**

| Control | Request | Response |
|---|---|---|
| The disclosure button | Toggles the expansion. Whether it issues a request depends on whether the holder's assets are already in the response; the release's approach is to render the assets with the directory, so the toggle is in-page | The expansion reveals the holder's assets in place, with no navigation |
| The row's link (name, total or chips) | Requests the asset list filtered to that holder | W2 re-rendered with that holder's filter applied; the filtered list is a filter state of the asset list, not a separate holder screen |

The expansion is a disclosure **separate from** the row's navigation:
expanding reveals assets inline and does not navigate; following the link
leaves the directory for the filtered list.

The row carries **no account affordance** — no avatar, no personal profile
link, no sign-in prompt, no `mailto:`. A holder name is a display name.

---

## 12. Holder-search Input

| Field | Value |
|---|---|
| Component | Holder-search input |
| Description | Filters the directory's holder rows by display-holder name |
| Category | input |

### States

| State | Description | Trigger |
|---|---|---|
| default | Empty; the directory lists every holder | page load |
| hover | Native input hover | mouseover |
| focus | Focus ring visible | Tab key |
| disabled | Never disabled | — |
| loading | Not drawn | — |
| error | Not drawn | — |
| empty | A search matching no holder renders no row at all, including no "Unassigned" row, above a count line reading "Showing 0 holders" |

### Props / Inputs

| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `query` | string | no | `""` | The entered text |
| `label` | string | yes | `Search holders` | The visible label |

### Responsive Behaviour

| Breakpoint | Behaviour |
|---|---|
| mobile (<768px) | Deferred to the design-system increment. |
| tablet (768–1024px) | Deferred to the design-system increment. |
| desktop (>1024px) | The design of record: a single full-width input in a bordered region above the count line. |

### Accessibility

| Requirement | Implementation |
|---|---|
| ARIA role | `search` — a `<input type="search">` inside a `<form>` with an accessible name |
| Keyboard interaction | `Tab`-reachable; `Enter` submits the form |
| Label / aria-label | Visible label "Search holders" |
| Contrast ratio | WCAG AA (4.5:1 text, 3:1 UI components) |
| Screen reader | Announced as "Search holders, edit text" |
| Focus management | Focus is not moved by the response; the page re-renders server-side |

### Usage Example

```
<form method="get" action="/holders" role="search" aria-label="Search holders">
  <label for="holder-search">Search holders</label>
  <input id="holder-search" name="q" type="search" value="<%= query %>">
</form>
```

**The interaction contract.** Activating the control issues a request
carrying the entered text. The response renders W6 with the directory's rows
filtered to the holders whose display-holder name matches, and the count line
reporting the **searched** population.

The matching rule is the POC's existing free-text pattern: case-insensitive
substring matching over the holder name. The release adds no fuzzy matching,
no tokenisation and no field-scoped search.

The search filters the **holder rows**, not the assets. A holder whose name
does not match is removed from the directory even when that holder holds
assets; a matching holder's row — with its total, its chips and its
expansion — is unaffected.

---

## 13. Asset-detail Actions Panel

| Field | Value |
|---|---|
| Component | Asset-detail actions panel |
| Description | Carries exactly the action controls whose released edge originates at the asset's current status |
| Category | navigation |

### States

| State | Description | Trigger |
|---|---|---|
| default | The action set for the asset's current status | page load |
| hover | Native button hover | mouseover |
| focus | Focus ring visible | Tab key |
| disabled | Not applicable — no released edge's control is disabled | — |
| loading | Not drawn | — |
| error | Not applicable | — |
| empty | A `discarded` asset's panel carries no lifecycle control — only `Edit asset` and the discard note |

### Props / Inputs

| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `status` | string | yes | — | The asset's current status |
| `actions` | object[] | yes | — | The released edges whose origin is `status`, supplied by the route from the shared transition table |
| `holder` | string | no | — | The asset's current holder, for the assign control's default |
| `discardNote` | string | no | — | The note rendered on a `discarded` asset |

### Responsive Behaviour

| Breakpoint | Behaviour |
|---|---|
| mobile (<768px) | Deferred to the design-system increment. |
| tablet (768–1024px) | Deferred to the design-system increment. |
| desktop (>1024px) | The design of record: the field panel is left and the actions panel is right, and the order does not invert (constraint R2). |

### Accessibility

| Requirement | Implementation |
|---|---|
| ARIA role | `region` with an accessible name "Actions" |
| Keyboard interaction | Every control is `Tab`-reachable and activated with `Enter` or `Space`; the first control is the screen's keyboard entry point |
| Label / aria-label | Each control is named by its own verb: "Mark returned", "Mark lost", "Discard asset", "Recover asset", "Edit asset" |
| Contrast ratio | WCAG AA (4.5:1 text, 3:1 UI components) for the controls and the discard note |
| Screen reader | The panel's name "Actions" is announced; each control's name states the transition it performs |
| Focus management | Activating a reason-bearing control opens a dialog and moves focus into it; on dismissal, focus returns to the control that opened it |

### Usage Example

```
<section class="actions" aria-labelledby="actions-heading">
  <h2 id="actions-heading">Actions</h2>
  <% actions.forEach((action) => { %>
    <form method="post" action="<%= action.href %>">
      <button type="submit"><%= action.label %></button>
    </form>
  <% }) %>
</section>
```

**The interaction contract.**

| Control | Request | Response |
|---|---|---|
| `Mark returned` | A transition request for the `assigned → returned` edge | W3 re-rendered with the `Returned` chip, an empty `Holder`, a populated `Last holder` and a new `return` entry at the top of the history |
| `Assign` | A transition request for the `in-stock → assigned` or `returned → assigned` edge, carrying the assignee | W3 re-rendered with the `Assigned` chip, the `Holder` field naming the assignee and a new `assign` entry at the top of the history |
| `Mark lost` | A transition request for the loss edge, carrying the reason | W3 re-rendered with the `Lost` chip, an empty `Holder`, a `Last holder` where one applies, and a new `mark-lost` entry at the top of the history |
| `Discard asset` | A transition request for the `assigned → discarded` edge, carrying the reason | W3 re-rendered with the `Discarded` chip, an empty `Holder`, a `Last holder` naming the holder at discard time, the discard note, and a new `discarded` entry at the top of the history |
| `Recover asset` | A transition request for the `lost → in-stock` edge, carrying the reason | W3 re-rendered with the `In stock` chip, a `Last holder` that still names the prior holder, and a new `recovered` entry at the top of the history |
| `Edit asset` | A request for the edit form | W5 re-rendered with the asset's current values |

A transition attempted from a status that does not allow it is refused with
the invalid-transition error code and no audit entry; the response re-renders
W3 with the asset's current status and the controls that status allows, and
states the refusal in words — no error code is displayed to the user.

---

## 14. History Panel

| Field | Value |
|---|---|
| Component | History panel |
| Description | The asset's complete audit history, newest first, with an actor on every entry |
| Category | display |

### States

| State | Description | Trigger |
|---|---|---|
| default | Every entry, newest first, each with a timestamp, an action name and an actor | page load |
| hover | No change | mouseover |
| focus | Not focusable; each entry is reachable and readable in order | — |
| disabled | Not applicable | — |
| loading | Not drawn | — |
| error | Not drawn | — |
| empty | The application's existing bare empty treatment. The designed empty state is deferred (US8.10) |

### Props / Inputs

| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `entries` | object[] | yes | — | The audit entries, newest first |
| `systemMarker` | string | yes | `system` | The display name of the backfill actor, distinguishable from a person's |

### Responsive Behaviour

| Breakpoint | Behaviour |
|---|---|
| mobile (<768px) | Deferred to the design-system increment. |
| tablet (768–1024px) | Deferred to the design-system increment. |
| desktop (>1024px) | The design of record: a vertical ordered list, each entry a timestamp, an action name, an actor and a description. |

### Accessibility

| Requirement | Implementation |
|---|---|
| ARIA role | `list` — an `<ol>` of `<li>` entries, because the history is a sequence rather than a grid |
| Keyboard interaction | Each entry is reachable and readable in order by keyboard |
| Label / aria-label | The section heading "History" names the region |
| Contrast ratio | WCAG AA (4.5:1 text, 3:1 UI components) |
| Screen reader | The list's order is conveyed to assistive technology; each entry announces its timestamp, action and actor |
| Focus management | Not applicable — the panel does not take focus |

### Usage Example

```
<section aria-labelledby="history-heading">
  <h2 id="history-heading">History</h2>
  <ol class="history">
    <% entries.forEach((entry) => { %>
      <li>
        <time datetime="<%= entry.timestamp %>"><%= entry.timestamp %></time>
        <span class="audit-action"><%= entry.action %></span>
        <span class="audit-actor"><%= entry.actor %></span>
        <p><%= entry.description %></p>
      </li>
    <% }) %>
  </ol>
</section>
```

**The interaction contract.** The panel issues **no request**. Every entry
shows an actor. An entry attributed to the `system` actor is rendered with a
marker distinguishable from a person's — the actor name itself is the
marker, and it is text rather than colour.

The release has **no screen that lists audit entries across assets**. The
audit entry is read only in the context of the asset it belongs to.

---

## 15. Reason Dialog

| Field | Value |
|---|---|
| Component | Reason dialog |
| Description | The one dialog shape that gathers a reason for a transition that requires one |
| Category | feedback |

### States

| State | Description | Trigger |
|---|---|---|
| default | Open, with the consequence paragraph above the reason control, the reason control showing its placeholder, and the submit control enabled | The trigger control is activated |
| hover | Native control hover | mouseover |
| focus | Focus is inside the dialog, on the reason control | Activation, and `Tab` cycling inside |
| disabled | The submit control is **never** disabled — the missing-reason message would otherwise be unreachable | — |
| loading | Not drawn | — |
| error | The reason is missing: `A reason is required.` beneath the reason control, with focus moved to it and nothing written | The submit control is activated with the placeholder still showing |
| empty | Not applicable — the dialog always opens for one transition | — |

### Props / Inputs

| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `heading` | string | yes | — | The transition's own name and the asset's name: "Mark lost — ThinkPad X1 Carbon" |
| `consequence` | string | yes | — | The consequence paragraph, rendered from the asset's current status |
| `reasonLabel` | string | yes | — | "Reason" or "Recovery reason" |
| `options` | string[] | yes | — | The shared vocabulary's values, or the wider list for a discard |
| `placeholder` | string | yes | `Select a reason...` | The option shown until a reason is chosen |
| `submitLabel` | string | yes | — | The transition's own verb: "Mark lost", "Discard asset", "Recover asset" |
| `variant` | string | yes | — | `loss-assigned`, `loss-in-stock`, `loss-returned`, `discard` or `recovery`; selects the consequence text |

### Responsive Behaviour

| Breakpoint | Behaviour |
|---|---|
| mobile (<768px) | Deferred to the design-system increment. |
| tablet (768–1024px) | Deferred to the design-system increment. |
| desktop (>1024px) | The design of record: a centred dialog, its heading at the top, the consequence paragraph below it, then the reason control, then the controls row. |

### Accessibility

| Requirement | Implementation |
|---|---|
| ARIA role | `dialog` — a `<dialog>` element, with `aria-labelledby` on the heading and `aria-describedby` on the consequence paragraph |
| Keyboard interaction | `Escape` dismisses; the focus order stays inside the dialog; `Enter` on the reason control submits |
| Label / aria-label | The reason `<select>` has a bound `<label>`; the required state is carried by `required` and `aria-required` |
| Contrast ratio | WCAG AA (4.5:1 text, 3:1 UI components) |
| Screen reader | The consequence paragraph is read **before** the reason control, so the administrator hears what the transition does before choosing the reason |
| Focus management | Opening moves focus to the reason control. `Escape`, Cancel and the close control each dismiss without acting, and focus returns to the control that opened it. The background is inert while the dialog is open |

### Usage Example

```
<dialog id="reason-dialog" aria-labelledby="reason-heading" aria-describedby="reason-consequence">
  <h2 id="reason-heading">Mark lost — ThinkPad X1 Carbon</h2>
  <p id="reason-consequence"><%= consequence %></p>
  <label for="reason-select">Reason</label>
  <select id="reason-select" name="reason" required aria-required="true">
    <option value="">Select a reason...</option>
    <% options.forEach((option) => { %><option value="<%= option %>"><%= option %></option><% }) %>
  </select>
  <% if (reasonError) { %><p class="error" role="alert">A reason is required.</p><% } %>
  <button type="button" data-close>Cancel</button>
  <button type="submit" form="reason-form">Mark lost</button>
</dialog>
```

**The interaction contract.**

| Control | Request | Response |
|---|---|---|
| Submit, with a reason | A transition request for the edge, carrying the reason and the asset's identity | The dialog closes and W3 re-renders with the asset's new status, its new holder fields and a new history entry at the top |
| Submit, with no reason | The same request; the server refuses it | The dialog re-renders with `A reason is required.` beneath the reason control, focus moved to it, and **nothing written** — no status change, no holder change, no history entry |
| `Escape`, `Cancel`, close control | No request | The dialog dismisses; no transition happens and nothing is recorded; focus returns to the trigger |

**The consequence paragraph's five variants.** The shape is fixed — one
paragraph, above the reason control — and the content is rendered from the
asset's current status and the transition.

| Variant | Text |
|---|---|
| `loss-assigned` | `This asset is currently assigned to <holder>. Marking it lost records who had it and ends the assignment. <holder> is kept as the last holder.` |
| `loss-in-stock` | `This asset is in stock. It has not been assigned to anyone. Marking it lost records it as missing, and there is no holder to keep.` |
| `loss-returned` | `This asset was returned by <holder> and is not currently assigned. Marking it lost records the loss and keeps <holder> as the last holder.` |
| `discard` | `This asset is currently assigned to <holder>. Discarding it resolves the assignment: <holder> is cleared as the current holder and kept as the last holder. The asset leaves Active Inventory, but its row and full history are kept and stay here.` |
| `recovery` | `This asset was marked lost. <holder> was its last holder. Recovering it returns it to stock and records the recovery as its own event, naming <holder>.` |

The three loss variants exist because the loss dialog is reachable from three
origin statuses. The `in-stock` variant is the one the release adds, and it
is therefore drawn rather than left to be inferred from the `assigned` variant.

**The reason vocabulary.** The loss and recovery dialogs offer exactly the
shared loss-reason vocabulary. The discard dialog offers the shared vocabulary
plus the retirement-specific values, in that order. The options offered are
exactly the vocabulary's values, and no reason outside the vocabulary is
offered.

---

## 16. Inline Duplicate Warning

| Field | Value |
|---|---|
| Component | Inline duplicate warning |
| Description | The advisory warning shown under the serial or key field when the entered value collides |
| Category | feedback |

### States

| State | Description | Trigger |
|---|---|---|
| default | Absent | Page load, or a serial that does not collide |
| hover | No change | mouseover |
| focus | Not focusable | — |
| disabled | Not applicable | — |
| loading | Not drawn — the request is issued on `blur` and the warning appears with the response | — |
| error | The warning is the error state of this component | The server's collision check returns a collision |
| empty | Absent — a non-colliding serial produces no warning |

### Props / Inputs

| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `category` | string | yes | — | The selected category, which scopes the comparison |
| `serial` | string | yes | — | The entered serial or key |
| `collidingName` | string | no | — | The colliding asset's name |
| `collidingHref` | string | no | — | The link to the colliding asset's detail screen |

### Responsive Behaviour

| Breakpoint | Behaviour |
|---|---|
| mobile (<768px) | Deferred to the design-system increment. |
| tablet (768–1024px) | Deferred to the design-system increment. |
| desktop (>1024px) | The design of record: the warning sits directly beneath the serial or key input, inside the form field group. |

### Accessibility

| Requirement | Implementation |
|---|---|
| ARIA role | `alert` |
| Keyboard interaction | The "Open existing asset" link is `Tab`-reachable and opens the colliding asset's detail screen |
| Label / aria-label | The warning is associated with the serial input by `aria-describedby` |
| Contrast ratio | WCAG AA (4.5:1 text, 3:1 UI components) |
| Screen reader | Announced when it appears; the association means the warning is read with the field it belongs to |
| Focus management | Focus is not moved by the warning's appearance; it stays in the serial input, which is where the administrator was |

### Usage Example

```
<input id="asset-serial" name="serial" aria-describedby="serial-warning">
<p id="serial-warning" role="alert">
  A hardware asset with serial "SN-4471" already exists.<br>
  ThinkPad X1 Carbon — <a href="/assets/12">Open existing asset</a>
</p>
```

**The interaction contract.**

| Aspect | Contract |
|---|---|
| Request | The collision check runs on the **server**, and the request that triggers it is issued when the field **loses focus** (`blur`), so the warning is produced by a server round-trip rather than by client-side rendering |
| Response | Either no collision, or the colliding asset's name and a link to it |
| Comparison | The shared definition: case-insensitive, whitespace-trimmed, **category-scoped**. A serial that exists in `hardware` but not in `software-license` produces no warning |
| Advisory | The warning is advisory. Dismissing it leaves the form as typed and the submit control available |
| Not a waiver | If the warning was dismissed and the form is then submitted with the same colliding serial, the submit-time refusal still applies |
| Announcement | The warning's text is the announcement region for this component |

---

## 17. Submit-time Collision Block

| Field | Value |
|---|---|
| Component | Submit-time collision block |
| Description | The refusal shown when the submitted serial or key collides, with exactly two ways forward |
| Category | feedback |

### States

| State | Description | Trigger |
|---|---|---|
| default | Absent | Page load |
| hover | No change | mouseover |
| focus | The block receives focus on render | The refusal response is returned |
| disabled | Not applicable | — |
| loading | Not drawn | — |
| error | The block is the error state of this component | The submitted value collides |
| empty | Absent — a non-colliding submission produces no block |

### Props / Inputs

| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `category` | string | yes | — | The submitted category |
| `serial` | string | yes | — | The submitted serial or key |
| `collidingName` | string | yes | — | The colliding asset's name |
| `collidingHolder` | string | no | — | The colliding asset's current holder, when it has one |
| `collidingHref` | string | yes | — | The link to the colliding asset's detail screen |
| `concurrency` | boolean | no | `false` | Whether the collision appeared after the form was filled — the message says so rather than showing a bare failure |

### Responsive Behaviour

| Breakpoint | Behaviour |
|---|---|
| mobile (<768px) | Deferred to the design-system increment. |
| tablet (768–1024px) | Deferred to the design-system increment. |
| desktop (>1024px) | The design of record: the block sits at the top of the form, above the fields, because at submit time the whole form is being judged. |

### Accessibility

| Requirement | Implementation |
|---|---|
| ARIA role | `alert` |
| Keyboard interaction | Both actions are `Tab`-reachable; `Enter` activates |
| Label / aria-label | The block's heading "This serial already exists." names the condition |
| Contrast ratio | WCAG AA (4.5:1 text, 3:1 UI components) |
| Screen reader | Announced on render, and the block receives focus so a keyboard user is taken to it |
| Focus management | Focus moves to the block on render |

### Usage Example

```
<div class="collision-block" role="alert" tabindex="-1">
  <p>This serial already exists.</p>
  <dl>
    <dt>Category</dt><dd>hardware</dd>
    <dt>Serial</dt><dd>SN-4471</dd>
    <dt>Asset</dt><dd>ThinkPad X1 Carbon — assigned to Dana Reyes</dd>
  </dl>
  <a href="/assets/12">Open existing asset</a>
  <a href="#asset-serial">Change the serial</a>
</div>
```

**The interaction contract.**

| Aspect | Contract |
|---|---|
| Request | The form submission, carrying the category, name, serial or key, model and notes |
| Response | The refusal. **No asset row is written.** The block names the existing asset and links to its detail page |
| Actions | Exactly two: "Open existing asset" and "Change the serial". There is **no override** that would create the asset despite the collision — no "create anyway" option and no equivalent |
| Concurrency | The block also covers the collision that appeared after the administrator began filling the form; the message says so rather than showing a bare failure |
| Announcement | The block's own text, and it receives focus |

---

## 18. Asset Form (registration and edit)

| Field | Value |
|---|---|
| Component | Asset form |
| Description | The registration form and the edit form, which are the same form with different values |
| Category | input |

### States

| State | Description | Trigger |
|---|---|---|
| default | Registration opens with empty required fields; edit opens with the asset's current values and **no collision warning** | Page load |
| hover | Native control hover | mouseover |
| focus | Native focus ring on the control | Tab key |
| disabled | Not applicable | — |
| loading | Not drawn | — |
| error | The validation block for a genuine validation failure — an empty name, an empty serial or key, a category outside the two | The submit is refused |
| empty | A required field left empty shows its validation message on submit |

### Props / Inputs

| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `mode` | string | yes | — | `create` or `edit` |
| `assetId` | string | no | — | The edited asset's identity, in the form's state, not as a visible field; the comparison excludes it |
| `category` | string | yes | — | `hardware` or `software-license` |
| `name` | string | yes | — | The asset's name |
| `serial` | string | yes | — | The serial or licence key |
| `model` | string | no | `""` | The asset's model |
| `notes` | string | no | `""` | The asset's notes |
| `categories` | string[] | yes | — | The two accepted categories |

### Responsive Behaviour

| Breakpoint | Behaviour |
|---|---|
| mobile (<768px) | Deferred to the design-system increment. |
| tablet (768–1024px) | Deferred to the design-system increment. |
| desktop (>1024px) | The design of record: one field group per row inside a bordered form region, with the control row right-aligned at the bottom. |

### Accessibility

| Requirement | Implementation |
|---|---|
| ARIA role | `form` with an accessible name; the region is a `<form>` inside `<main>` |
| Keyboard interaction | The `Category` select is the screen's keyboard entry point; every control is `Tab`-reachable; `Enter` in a text input submits the form |
| Label / aria-label | Every input has a real `<label>` bound by `for`/`id`: "Category", "Name", "Serial or key", "Model", "Notes". Required fields carry `required` and `aria-required`; the asterisk is a visual supplement, not the only carrier |
| Contrast ratio | WCAG AA (4.5:1 text, 3:1 UI components) |
| Screen reader | The form's name is announced on entry; the validation block announces the refused submission |
| Focus management | The submit-time collision block receives focus on render; a field-level validation message is associated with its field by `aria-describedby` |

### Usage Example

```
<form method="post" action="<%= mode === 'create' ? '/assets' : '/assets/' + assetId %>"
      aria-label="<%= mode === 'create' ? 'New asset' : 'Edit asset' %>">
  <label for="asset-category">Category *</label>
  <select id="asset-category" name="category" required aria-required="true">...</select>

  <label for="asset-name">Name *</label>
  <input id="asset-name" name="name" type="text" required aria-required="true" value="<%= name %>">

  <label for="asset-serial">Serial or key *</label>
  <input id="asset-serial" name="serial" type="text" required aria-required="true" value="<%= serial %>"
         aria-describedby="serial-warning">

  <label for="asset-model">Model</label>
  <input id="asset-model" name="model" type="text" value="<%= model %>">

  <label for="asset-notes">Notes</label>
  <textarea id="asset-notes" name="notes"><%= notes %></textarea>

  <button type="button" data-cancel>Cancel</button>
  <button type="submit"><%= mode === 'create' ? 'Create asset' : 'Save changes' %></button>
</form>
```

**The interaction contract.**

| Control | Request | Response |
|---|---|---|
| `Create asset` | A registration request carrying category, name, serial or key, model and notes | The asset is created with status `in-stock` and a null current holder; one `create` audit entry is appended. The response renders W3 with the `In stock` chip and a `create` entry at the top of the history |
| `Save changes` | An edit request carrying the asset's identity and the five editable fields | The asset's new values persist; the asset's status, current holder and preserved previous holder are left unchanged. One `edit` audit entry is appended, naming the fields that changed and their previous values, unless the save changed nothing — in which case no entry is appended and the update timestamp does not change |
| Serial field, on `blur` | The collision check for the entered value and the selected category | The inline warning, or nothing |

**The uniqueness policy is the same on both paths.** One comparison
definition, one database arbiter, one error code — the same case-insensitive,
whitespace-trimmed, category-scoped comparison the functional index enforces.
Registration and serial-or-key updates enforce one policy.

**The asset's own serial is not a collision with itself.** The edit form
carries the asset's identity in its state, not as a visible field, and the
comparison excludes it. An edit that does not change the serial, or that
changes it only in casing or surrounding whitespace, is accepted and reports
no collision.

**The registration form carries no assignee field.** The POC's optional
"Assigned to" field is removed. A registration request that supplies one does
not assign the asset.

---

## 19. Discarded-asset Note

| Field | Value |
|---|---|
| Component | Discarded-asset note |
| Description | States what a discard did and what survived it, on a discarded asset's detail screen |
| Category | feedback |

### States

| State | Description | Trigger |
|---|---|---|
| default | Present, with the text naming what the discard changed and what was kept | Page load, for a `discarded` asset |
| hover | No change | mouseover |
| focus | Not focusable | — |
| disabled | Not applicable | — |
| loading | Not drawn | — |
| error | Not drawn | — |
| empty | Absent — the note appears only on a `discarded` asset |

### Props / Inputs

| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `text` | string | yes | — | The fixed note text |

### Responsive Behaviour

| Breakpoint | Behaviour |
|---|---|
| mobile (<768px) | Deferred to the design-system increment. |
| tablet (768–1024px) | Deferred to the design-system increment. |
| desktop (>1024px) | The design of record: the note sits inside the actions panel, beneath the panel's only control. |

### Accessibility

| Requirement | Implementation |
|---|---|
| ARIA role | `text` |
| Keyboard interaction | Not focusable |
| Label / aria-label | The note's own text names the condition |
| Contrast ratio | WCAG AA (4.5:1 text, 3:1 UI components) |
| Screen reader | Read in the panel's flow, after the "Edit asset" control |
| Focus management | Not applicable |

### Usage Example

```
<p class="discard-note">
  This asset was discarded. It is no longer part of Active Inventory,
  but its record and its history are kept.
</p>
```

---

## 20. Refused-transition Message

| Field | Value |
|---|---|
| Component | Refused-transition message |
| Description | States in words that a transition was refused, and what the asset's status is now |
| Category | feedback |

### States

| State | Description | Trigger |
|---|---|---|
| default | Absent | Page load |
| hover | No change | mouseover |
| focus | The message receives focus on render | The refusal response is returned |
| disabled | Not applicable | — |
| loading | Not drawn | — |
| error | The message is the error state of this component | A transition is refused |
| empty | Absent — a successful transition produces no message |

### Props / Inputs

| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `currentStatus` | string | yes | — | The asset's status after the refusal |
| `currentStatusLabel` | string | yes | — | The shared display label for that status |

### Responsive Behaviour

| Breakpoint | Behaviour |
|---|---|
| mobile (<768px) | Deferred to the design-system increment. |
| tablet (768–1024px) | Deferred to the design-system increment. |
| desktop (>1024px) | The design of record: the message sits between the field panel and the history, above the history. |

### Accessibility

| Requirement | Implementation |
|---|---|
| ARIA role | `alert` |
| Keyboard interaction | Not focusable |
| Label / aria-label | The message's own text names the condition and the status |
| Contrast ratio | WCAG AA (4.5:1 text, 3:1 UI components) |
| Screen reader | Announced on render, and the message receives focus so a keyboard user is taken to it |
| Focus management | Focus moves to the message on render |

### Usage Example

```
<p class="refusal" role="alert">
  That change is not available for this asset's current status.
  The asset is now <%= currentStatusLabel %>.
</p>
```

**The interaction contract.** The refusal carries the invalid-transition error
code on the server; **no error code is displayed to the user**. The response
re-renders W3 with the asset's current status and the action controls that
status allows.

---

## 21. Status-change Announcement Region

| Field | Value |
|---|---|
| Component | Status-change announcement region |
| Description | Carries the outcome of a status change in the returned markup |
| Category | feedback |

### States

| State | Description | Trigger |
|---|---|---|
| default | Absent | Page load |
| hover | No change | mouseover |
| focus | Not focusable — the region is not a focus target, but the new status chip is present in the response | — |
| disabled | Not applicable | — |
| loading | Not drawn | — |
| error | A refused transition's message is the alert region for that response | A refusal |
| empty | Absent — a successful transition's region is never empty, because it names the new status |

### Props / Inputs

| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `newStatusLabel` | string | yes | — | The shared display label for the new status |
| `role` | string | yes | `status` | `status` for a successful transition; `alert` for a refusal |

### Responsive Behaviour

| Breakpoint | Behaviour |
|---|---|
| mobile (<768px) | Deferred to the design-system increment. |
| tablet (768–1024px) | Deferred to the design-system increment. |
| desktop (>1024px) | The design of record: a visually hidden region at the top of `<main>`, present in the returned markup. |

### Accessibility

| Requirement | Implementation |
|---|---|
| ARIA role | `status` on a successful transition; `alert` on a refusal |
| Keyboard interaction | Not focusable |
| Label / aria-label | The region's text names the new status: "Status is now Lost." |
| Contrast ratio | Not applicable — the region is visually hidden |
| Screen reader | The outcome is conveyed in the returned markup: the new status is present in the response, and the region announces it. No client-side announcement behaviour is required, because the release adds no client-side rendering |
| Focus management | Not applicable — the region is announced, not focused |

### Usage Example

```
<p class="visually-hidden" role="status">Status is now <%= newStatusLabel %>.</p>
```

---

## The components this stage does not specify

| Not specified | Why |
|---|---|
| A login screen | The actor mechanism is an open decision (I-01 / I-03). Candidate D would add a screen; the other three would not |
| An operator-selection picker | The same reason. The `Acting as` indicator is read-only |
| A holder detail page | Holders are derived from assets, not entities with their own lifecycle in this release. The holder row expands in place |
| A bulk-edit or bulk-transition surface | Not named in the approved set; the release's actions are single-asset |
| A loading state | The application is synchronous and server-rendered |
| A pager | Deferred with the presentation-polish increment. The count lines are in the release; the page controls are not |
| An improved search form | Deferred. The asset list keeps the POC's existing free-text search; the directory's holder search uses the POC's existing free-text pattern |

---

## Sources Consumed

- **wireframes** (`aidlc/spaces/default/intents/261106-asset-tracker-mvp/ideation/rough-mockups/wireframes.md`) — the shared frame, the eight screens, the per-status action sets, the display-holder rule and the deferred set.
- **user-flow** (`aidlc/spaces/default/intents/261106-asset-tracker-mvp/ideation/rough-mockups/user-flow.md`) — F1–F6 and F5a–F5h, the flow paths each component's request/response contract corresponds to.
- **stories** (`aidlc/spaces/default/intents/261106-asset-tracker-mvp/inception/user-stories/stories.md`) — the acceptance criteria that state each component's behaviour, in particular AC3.7.1–AC3.7.9, AC5.3.8–AC5.3.14, AC5.4.5–AC5.4.9, AC5.5.1–AC5.5.9, AC6.1.1–AC6.1.7, AC6.2.1–AC6.2.5, AC6.3.1–AC6.3.4 and AC7.2.1–AC7.2.16.
- **requirements** (`aidlc/spaces/default/intents/261106-asset-tracker-mvp/inception/requirements-analysis/requirements.md`) — FR10.5's two-action collision block, FR9.2/FR9.3's export contract, FR3.12's audit action vocabulary, FR6.4's two-figure count line, FR6.5's directory count rule and FR11.1's announcement commitment.

---

## Review

Reserved for the reviewer at the approval gate.
