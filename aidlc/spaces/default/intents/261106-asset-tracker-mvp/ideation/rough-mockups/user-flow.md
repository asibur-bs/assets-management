# User Flows — Asset Tracker MVP

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
- [Q15] Every lifecycle transition has explicit validation and explicit audit behaviour — a standing condition of the approved decision set.
- [Q16] Actor identity is resolved from trusted server-side context; actor information supplied in a write request is never trusted.
- [Q17] The actor-identity mechanism is in scope but its choice is deferred to the inception stages; it is a named blocking dependency of the foundation workstream, and I-01 / I-03 — whether a trusted authentication mechanism exists anywhere in the organisation — is still open.
- [Q18] The deployment target is a single internal host with a machine-local SQLite file, launched as a long-running process.
- [memory:M2] `aidlc/spaces/default/memory/project.md#Decided`: "The fully approved 17-item Asset Tracker MVP decision set, together with the Asset Tracker MVP Development Workbook, is the binding technical and product contract for the `asset-tracker-mvp` intent; it is not reopened at any stage of that intent, and it carries seven standing conditions — the uniqueness check uses an IMMEDIATE transaction and a non-zero SQLite `busy_timeout` with `SQLITE_BUSY` mapped to a retryable error; the functional-index expression and the application-level comparison predicate use one shared definition; registration and serial/key updates enforce the same uniqueness policy; historical backfills preserve original records and audit traceability and report failures; dashboard, assignee, asset-list, and CSV counts use consistent filtering and counting definitions; every lifecycle transition has explicit validation and audit behaviour; and the existing 66/66 passing test baseline is preserved with regression tests added for newly approved behaviour. Traceability must be maintained between the approved MVP requirements and the POC requirements FR1.3, FR4.4, FR4.5, and FR5.3, and actor identity is resolved from trusted server-side context so actor information supplied in a write request is never trusted. (Stage intent-capture, 2026-11-06)"
- [memory:M3] `aidlc/spaces/default/memory/project.md#Decided`: "The decision set's amendment table names the workbook amendment surface as section 4.1 (transition table, recovery, `in-stock → lost`, `assigned → discarded`), section 4.2.5, section 4.3 (the actor-trust rule), section 4.4, section 6.1, section 6.4, section 6.5, section 9 (Screens 01, 02, 03, 04, 10), section 10, section 21.1, section 21.2, section 22, section 24 (the metric qualifiers the Audit Completeness population relies on), and the two new section 27 sections (Inventory Counting Definitions and Audit Action Vocabulary). The section 24 amendment carries the Audit Completeness qualifier verbatim: pre-MVP history is backfilled to a `system` actor and excluded from this metric. Section 4.1 records the `lost → in-stock` recovery transition with a required recovery reason drawn from the shared loss-reason vocabulary, and requires a distinct `recovered` audit action rather than `assign` or `return`, whose description names the recovery and the prior holder. It also records that complex recovery workflows — partial recovery, credit assignment, dispute handling — remain deferred, distinct from the single included recovery transition. The workbook's remaining MVP feature set is the reconciliation dashboard, the assignee directory, asset editing, duplicate-detection UX, empty states, result counts, pagination, improved search, responsive UI, and a design system. The design-system enumeration is indicative, not exhaustive: workbook section 11 is the authoritative source for the complete design-system requirements, covering semantic color tokens, a typography scale, spacing tokens, radius and shadow scales, iconography, and a light-theme implementation designed for future dark-theme extension. (Stage intent-capture, 2026-11-06)"
- [memory:M4] `aidlc/spaces/default/memory/project.md#Decided`: "The `assigned → discarded` transition resolves the assignment inline and records it: `assigned_to` is cleared, `last_assigned_to` is retained so the holder at discard time stays visible, and a `discarded` audit action records the discard, the prior holder, and the fact that the assignment was resolved by the discard. A discard reason is always required, drawn from the shared loss-reason vocabulary plus retirement-specific values. The asset row and its full history are never deleted; a discarded asset is excluded from Active Inventory but remains present in the `discarded` bucket and in Total Records, and stays accessible at its detail URL with its history intact. (Stage intent-capture, 2026-11-06)"

---

## Purpose and Scope of These Flows

`wireframes.md` shows what each screen looks like. This document shows how an
administrator moves through them — the paths that carry the work, the paths that
carry the errors, and the paths that carry the consequences.

**What this document covers.** The seven journeys an internal asset administrator
performs, each drawn as a flow with its error and edge paths:

| # | Flow | Surfaces | Primary risk it carries |
|---|---|---|---|
| F1 | Register an asset | W4 → W2 | Duplicate serial collision, including the concurrent-write case |
| F2 | Find an asset | W2 → W3 | Filter state that returns nothing |
| F3 | Reconcile the inventory | W1 | Counts that disagree with each other |
| F4 | Answer "what does Dana hold?" | W6 → W2 | A holder presented as if they still hold what they lost |
| F5 | Change an asset's state | W3 → W7/W8 → W3 | A transition recorded without a reason, or with the wrong reason |
| F5h | Edit an asset's details | W3 → W5 → W3 | An edit that reports the asset as a collision with itself, or that silently changes the asset's state |
| F6 | Export the asset list as CSV | W2 → file | An export whose rows or columns disagree with the list |

**What this document does not do.**

- It does not specify the implementation. A flow names the screen and the action,
  not a route, a handler, or a query.
- It does not restate the screen layouts. Where a flow needs to show what an
  administrator sees at a step, it points at the wireframe section.
- It does not define the audit record's shape. It shows which flow writes which
  action, because that is a product fact — the flow is what produces the audit
  entry — but the entry's fields are Requirements Analysis's business.
- It does not choose an actor mechanism [Q17].

**Diagrams.** All diagrams follow the stage's ASCII standards: basic ASCII
characters only, no Unicode box-drawing, and equal character count per line
within a box.

---

## The Shared Frame and the Actor

Every flow below begins and ends in the same frame: the top bar with `Dashboard`,
`Assets`, `Holders`, and the `New asset` action, and the read-only `Acting as:
...` indicator [Q9] [Q8].

```
+------------------------------------------------------------------+
| ASSET TRACKER     Dashboard | Assets | Holders      [New asset]  |
|                                                  Acting as: ... |
+------------------------------------------------------------------+
```

The indicator is drawn read-only because actor information supplied in a write
request is never trusted [Q16]. Every flow that writes an audit entry therefore
carries the same note: the actor on the entry is resolved from trusted
server-side context, not from anything the administrator typed. The flows do not
branch on the actor, because no flow in this release lets an administrator
choose one.

---

## F1 — Register an asset

The shortest flow, and the one that carries the release's most-expensive
failure: a serial that already exists.

```
                                    [New asset] |
                                                v
                                        +--------------------------+
                                        | W4 New asset             |
                                        | Category                 |
                                        | Name                     |
                                        | Serial or key            |
                                        | Model, Notes             |
                                        +--------------------------+
                                            |                   |
              |------------------------------                   |
              | inline check                  submit            |
              |                                                 |
              v                                                 |
    +----------------------+      +--------------------------+  |
    | Duplicate?           |      | warning dismissed        |  |
    | inline warning       |----->| the form stays as typed; |  |
    | [Open existing]      |      | the submit still runs    |  |
    | (dismissable)        |      +--------------------------+  |
    +----------------------+        |                           |
            |                       |                           |
            | dismissed:            |                           |
            | continue              |                           |
            |                       |                           |
            | [Open existing]       |                           |
            |                       v             v--------------
            |                     +----------------------+
            |                     | Uniqueness check     |
            |                     | on submit            |
            |                     +----------------------+
            |                           |           |   no collision
            |               collision   |           ------------------------|
            |                           |                                   |
            |                           v                                   |
            |                     +----------------------+                  |
            |                     | Collision block      |                  |
            |                 |---| names the asset      |--|               |
            |                 |   | [Open existing]      |  |               |
            |                 |   | [Change the serial]  |  |               |
            |                 |   +----------------------+  |               |
            |                 |                             |               |
            |                 |                             |               |
            |                 |                             |               |
            |                 |                             |               |
            |                 |                             |               v
            | [Open existing] |                             |   +----------------------+
            |                 |                             |   | create succeeds      |
            |                 |                             |   | asset created        |
            |                 |                             |   | status: in-stock     |
            |                 |                             |   | audit: create        |
            |                 |                             |   +----------------------+
            |                 |                             |change the serial  |
            |                 |                             |                   |
            |                 |                             |                   |
            |                 |                             |                   |
            |                 |                             |                   |
            v                 |                             |                   v
    +----------------------+  |                             |   +----------------------+
    | W3 Asset detail      |  |                             |   | W2 Asset list        |
    | the EXISTING asset   |  |                             |   | redirected           |
    | no create,           |  |                             |   | counts refreshed     |
    | no audit entry       |  |                             |   +----------------------+
    +----------------------+  |                             |
                              |                             |
                              |                             |
                              |                             |
                              |                             |
                              |                             |
                              ------v                       v
                                  +----------------------+ +----------------------+
                                  | W3 Asset detail      | | change the serial    |
                                  | the EXISTING asset   | | back to W4           |
                                  | no create,           | | (values kept)        |
                                  | no audit entry       | +----------------------+
                                  +----------------------+
```

**The collision block is a terminal branch, not a warning.** It offers exactly
two actions: open the existing asset, or change the serial. There is no "create
anyway" [Q4]. The uniqueness definition is one shared definition, and
registration and serial-or-key updates enforce the same policy under it
[memory:M2] — so a serial that already exists in the category is a genuine
conflict, not a soft warning that the operator may override.

**The inline warning never creates an asset.** The inline check fires while the
administrator is still typing, and it is an *advisory* signal — unlike the
submit-time block, it is not the write's verdict. Its only action, **Open
existing**, navigates to the already-registered asset's detail screen (W3). It
does not create a second asset with the same serial, and it writes no audit
entry, because nothing was created. The inline branch therefore terminates at
W3 and never joins the create-success path.

**The inline warning has a defined exit.** It is dismissible. When the
administrator dismisses it and keeps typing, the form stays as typed and the
submit control remains available — the warning is not a lock on the form. The
submit that follows runs the submit-time uniqueness check, which is the branch
that has the authority to block the write. A dismissal is therefore not a
waiver: an administrator who dismisses the inline warning and submits still
gets the collision block if the serial is in fact taken. The two checks are
different moments with different authority, and the flow draws both.

**Why the inline warning exists at all.** It saves the administrator the round
trip of filling the whole form to learn that the serial is taken. It cannot
replace the submit-time check, because a second administrator can register the
same serial in between, so the flow draws the advisory check and the
authoritative check as two separate branches.

**The concurrent-write case.** The inline check runs while the administrator
types. The submit-time check runs at the write. They are different moments, and
a second administrator can register the same serial in between. When the
submit-time check is what fires, the block says so — the collision appeared
after the form was filled — rather than presenting a bare failure. The POC
already distinguishes `DUPLICATE_ASSET` from `VALIDATION_ERROR` at the route
boundary, so the two are separable in the flow.

**The redirect after a successful create.** The POC's `POST /` redirects to the
asset list on success. The flow keeps that destination, and the list's counts
refresh because they come from the shared counting function — which is also
what makes the dashboard agree with the list after a registration [Q5].

**The audit entry.** Registration writes a `create` entry. The asset starts in
`in-stock` with no holder, because registration never assigns [Q2].

**The empty-list arrival.** *Deferred — future-state guidance, not behaviour this
release builds* [Q1] [memory:M3]. If the administrator has just created their
first asset and the list was previously empty, the deferred increment is expected
to render an empty state rather than a populated table, naming what would appear
there and offering the action that creates it. The MVP retains the POC's existing
bare empty row. The empty states are a deferred item [Q1] [memory:M3], so this
flow does not draw one and does not assert the behaviour.

---

## F2 — Find an asset

```
       [Assets]
           |
           v
   +-------------------+
   | W2 Asset list     |
   | filter form       |
   | Search            |
   | Category / Status |
   | Sort              |
   | Direction         |
   | [Apply] [Reset]   |
   +-------------------+
        |       |
   apply |       | apply
        |       v
        |  +-------------------+
        |  | filtered result   |
        |  | "Showing N of M"   |
        |  +-------------------+
        |       |          |
        |  N > 0|          | N = 0 (deferred)
        |       v          v
        |  +----------+  +-------------------+
        |  | rows     |  | zero-result state |
        |  |          |  | (deferred [Q1])   |
        |  | Name     |  +-------------------+
        |  | Category |
        |  | Serial   |
        |  | Status   |
        |  | Holder   |
        |  +----------+
        |       |
        |       | click a row
        |       v
        |  +-------------------+
        |  | W3 Asset detail   |
        |  +-------------------+
        +--------------------+
```

**The count line is read, not computed.** "Showing N of M records" is the count
of the current filter against the count of everything, both drawn from the shared
counting function [Q5]. The flow does not have the list compute its own count —
that is precisely the defect the shared counting function exists to remove, and
it is the reason the dashboard, the list, the holder directory, and the CSV
export are one indivisible group.

**The count line is in the release; the pager is deferred.** The deferred item
"pagination and result counts" [memory:M3] is read as the *pager* — the page
controls and the navigation between pages — not as the count line. The count
line is a read from the shared counting function, and this flow shows no
pagination branch because the pager is deferred with the presentation-polish
increment. Requirements Analysis and the design-system increment should read
the deferral the same way.

**This is a narrowing of an ambiguous phrase, not a promotion of a deferred
capability.** The approved standing condition requires that the dashboard,
assignee, asset-list, and CSV counts use consistent filtering and counting
definitions, and it makes those four surfaces one indivisible group [memory:M2] [Q5].
That condition is about the *definitions*, and a definition nobody is shown is
a definition nothing can disagree with: if the counts are computed consistently
but only one surface shows its count, the other three are unverifiable to the
operator. The count line is the visible half of an approved, in-release
guarantee — a read of the shared counting function the release already builds,
not a new feature. Nothing else in the deferred item is brought in: no pager,
no page-size control, no page navigation, and no separate "result count"
mechanism. The scope document's own reason for the deferral — the confirmed
scale is medium, and the trigger is the asset count growing past it — is
unchanged and still binds.

**The zero-result state is not the empty state.** *Deferred — future-state
guidance* [Q1] [memory:M3]. Both states belong to the deferred empty states, so this flow
draws the branch only to mark it as outside the release and records how the
later increment should distinguish the two. The guidance is that "No assets yet"
is false when the database holds assets and the filter excludes them: the
zero-result message says the filters matched nothing and offers a reset.
Conflating the two would tell an administrator that the organisation owns
nothing when it owns 248 things. The MVP renders the POC's bare empty row in
both cases and builds neither message.

**Search is the POC's search.** Improved search is deferred [Q12], so the flow
shows the existing control rather than a promised one.

---

## F3 — Reconcile the inventory

The dashboard is a read-only screen. Its flow is short, and its whole purpose is
that four surfaces agree.

```
       [Dashboard]
           |
           v
   +-----------------------------------+
   | W1 Reconciliation                 |
   |                                   |
   |  Active Inventory      243        |
   |  Total Records         248        |
   |                                   |
   |  In stock 37 | Assigned 191       |
   |  Returned 9  | Lost 6            |
   |  Discarded 5                      |
   |                                   |
   |  Attention: 6 lost, 5 discarded   |
   +-----------------------------------+
        |              |
        | click a      | click a
        | bucket tile  | headline
        |              | tile
        v              v
   +-----------+  +-------------+
   | W2 filtered|  | W2 filtered |
   | by status |  | by the      |
   +-----------+  | same scope  |
                  +-------------+
```

**Every number on this screen is read from one place.** The two headline tiles,
the five bucket tiles, the "available to assign" sub-metric, and the Attention
panel are all reads from the same shared counting function through the same
filter builder. There is no branch in this flow where one number comes from
elsewhere — a branch there would be the disagreement the group exists to prevent.

**The relationship the tiles encode.** Active Inventory plus the discarded count
equals Total Records. Discarding moves an asset out of Active Inventory and
leaves Total Records untouched [memory:M4]. The pair of headline tiles makes
that visible; a single total would hide it, and a write-off that silently
disappears is the failure the whole initiative exists to prevent.

The frame reconciles under both readings: the five bucket tiles sum to 248,
which is Total Records, and 248 − 5 discarded = 243, which is Active
Inventory. The Attention panel repeats two of those bucket figures (6 lost,
5 discarded) rather than introducing figures of its own, so nothing on the
screen is a second measure.

**Clicking a bucket tile lands on the list, filtered.** The dashboard does not
reproduce the list's own filtering; it links to the list with the same filter
applied, so the administrator sees one shared definition from both directions.

**No loading state.** The application is synchronous and server-rendered, so the
flow has no pending branch. A spinner drawn here would misdescribe how the
application behaves.

---

## F4 — Answer "what does Dana hold?"

```
        [Holders]
            |
            v
    +-----------------------+
    | W6 Holder directory   |
    | [Search holders]      |
    | Showing 14 holders    |
    +-----------------------+
      |        |        |
      | expand |        | expand
      | Dana   |        | Unassigned
      v        |        v
  +------------------+  +-------------------+
  | Dana Reyes       |  | Unassigned        |
  | 4 assets         |  | 37 assets         |
  | [Assigned 3]     |  | [In stock 37]     |
  | [Lost 1]         |  |                  |
  |                  |  |                  |
  | ThinkPad  SN-4471 |         |
  |   [Assigned]      |         v
  | Dell     SN-4468  |  +-------------------+
  |   [Assigned]      |  | W2 filtered to    |
  | iPhone 14 SN-4512 |  | unassigned assets |
  |   [Assigned]      |  +-------------------+
  | USB-C    SN-4503  |
  |   [Lost]          |
  |   last holder     |
  +-------------------+
      |            |
      | click an   | click "Assigned 3"
      | asset row  |
      v            v
  +------------+  +-------------------+
  | W3 detail  |  | W2 filtered to    |
  +------------+  | Dana's held assets|
                  +-------------------+
```

**Currently held and last held are different things, and the flow shows both.**
Dana's row lists four assets: three she holds now, and one she *last* held and
has since lost. The `USB-C Dock` is under Dana because Dana was its last holder
[memory:M4]; it is not in Dana's hands. A directory that collapsed those two
would answer "what does Dana hold?" wrongly, and that question is the reason
the previous-holder preservation exists.

**The "Showing 14 holders" line counts holders, not rows.** It is the count of
distinct display holders — the distinct holder names appearing on the assets —
and it does not include the "Unassigned" row, because "Unassigned" is a row,
not a holder. The directory therefore shows 15 rows: 14 holders and the
Unassigned row. The frame above expands two of them — Dana and Unassigned — and
the rest are not drawn.

**The bucket chips on a holder's row are counts, not decoration.** The rule is
one sentence and it is the same rule W6 states: **a holder's chips count the
assets that name that holder, broken down by the asset's status bucket, across
both currently-held and last-held assets.** Dana's four rows are three
`assigned` and one `lost`, so the chips read `[Assigned 3] [Lost 1]`; every
chip value equals the number of visible rows in its bucket, and the chips sum
to the row count. The chips are read from the shared counting function with
the holder filter applied — they are not computed by the directory.

**The chips cover last-held assets as well as currently-held ones**, because
the question the directory answers is "what is and was Dana's" rather than a
custody snapshot. The expansion marks which is which on each row — "assigned"
versus "last holder" — so a reader can always tell the two apart, and the
chips do not need a second set of counts to do it.

**The Unassigned row follows the same rule.** It holds the assets that have
**no display holder at all** — assets that have never been assigned to anybody,
so neither `assigned_to` nor `last_assigned_to` is set. Its single chip is
`[In stock 37]`, summing to its 37 rows, because an asset that has never been
held is in `in-stock`: it was never assigned, so it was never marked lost and
never returned either. That implication runs one way only — **never held ⟹
`in-stock`** — and never-held is what puts an asset in this row.

The converse does not hold, and the difference matters. A **recovered** asset
(the `lost → in-stock` transition, F5e) is `in-stock` yet has a display holder:
it keeps its `last_assigned_to`, so it is counted under that person, not here.
In this example every one of the 37 `in-stock` assets is also unheld, so the
Unassigned row's `in-stock` chip happens to equal the dashboard's `in-stock`
bucket tile — the two readings coincide here, and the coincidence is not the
rule. An implementer who read the chip as "the `in-stock` bucket" would place
recovered assets in this row and contradict the display-holder rule. An asset
that *was* held and no longer is has a display holder — the person who last held
it — and belongs under that person, not here.

That is why the Unassigned row has one chip and the holder rows have several.
The chip count follows from the rule rather than being a separate tally, and
the row must not be drawn with `returned` or `lost` chips: an asset in either
of those buckets has a holder, so it is already counted under that holder.

**"Unassigned" is a row, not an absence.** The never-held assets have no
holder, and the dashboard's "available to assign" sub-metric needs a
destination. Without the row, that number would have nowhere to lead.

**A holder whose only assets are last-held.** The chips show only the buckets
those assets are actually in — for a holder with nothing but a lost asset, the
chip row reads `[Lost 1]` and no `assigned` chip at all. The directory does not
present a holder who has nothing as if they had something, and it does not
manufacture a zero-count chip for a bucket the holder has no asset in.

**Holder names are not identities.** The directory lists names an administrator
typed onto assets. It is not a registry of authenticated people, and the flow
does not treat it as one. The actor on an audit entry comes from trusted
server-side context [Q16]; the holder is the subject of custody, not the actor
of the record.

**The search box filters holders, not assets.** It is the POC's existing search
pattern applied to the holder list. Improved search is deferred [Q12].

---

## F5 — Change an asset's state

The largest flow, and the one the initiative exists for. Eight transitions, two
dialog shapes, and one rule about the actor that applies to all of them.

### F5a — The transition map

```
                  +------------------+                                                          +------------------+
                  | in-stock         |   mark lost (reason)                                     | lost             |
                  |                  |---------------------------------------------------------->                  |
                  |                  |   recover (reason)                                       |                  |
                  |                  <----------------------------------------------------------|                  |
                  +------------|-----+                                                          +--^------------^--+
                       assign  |                                                                   |            |
                               |                                                                   |            |
                               |                                                                   |            |
                               |                                                                   |            |
                               |                                                                   |            |
                               |      mark lost (reason)                                           |            |
                               |    |--------------------------------------------------------------|            |
                               |    |                                                                           |
                               |    |                                                                           |
                               |    |                                                                           |
                               |    |                                                                           |
                               |    |                                                                           |
                               |    |                                               mark lost (reason)          |
                               |    |                                                                           |
                  +------------v----|+                                                          +---------------|--+
                  | assigned         |                                                          | returned         |
                  |                  |   mark returned                                          |                  |
                  |                  |---------------------------------------------------------->                  |
                  |                  <----------------------------------------------------------|                  |
                  +----------|-------+   re-assign                                              +------------------+
         discard (reason)    |
                             |
                             |
                             |
                             |                      +------------------+
                             |                      | discarded        |
                             |---------------------->                  |
                                                    |                  |
                                                    |                  |
                                                    +------------------+














```

Exactly five states and eight drawn edges, matching W3's edge table, out of
the ten edges of the approved §4.1 transition table [memory:M3]:

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

**`returned → lost` is explicitly approved, not inferred.** The edge is
verified against the approved upstream amendment surface rather than inferred
from the diagram. The approved decision set row D3 lists
`returned → assigned/lost/discarded` as "All proposed"; the resulting §4.1
transition table lists `returned → assigned, lost, discarded`; and the POC
requirements state that from `returned` the valid transition is to `assigned`
or `lost` [memory:M3]. The edge therefore carries no distinct audit action of
its own — it reuses `mark-lost` — and it requires a loss reason drawn from the
shared loss-reason vocabulary, exactly like `in-stock → lost` and
`assigned → lost`. No upstream artifact defers it: the only deferred recovery
item is the complex-recovery set (partial recovery, credit assignment, dispute
handling), which is a different concern [memory:M3].

**The edge-count reconciliation: ten approved, eight drawn, two omitted.**
The approved §4.1 transition table has exactly ten edges. This map draws
eight of them and leaves two undrawn. The counts reconcile as
**ten approved = eight drawn + two omitted**. Stated set by set, with nothing
implicit:

| # | Approved edge | Audit action | Reason required | Drawn in F5a |
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

**Reading the map.** Every connector starts at the border of its source box and
ends in an arrowhead at the border of its destination box, so the direction of
each edge is read from the arrowhead alone. Where a connector meets a box, it
leaves a **junction mark in the box's own border** — the connector's character
is written into the wall rather than stopping beside it — so the point where
the connector meets the box is visible and no connector reads as passing behind
a box. The two bidirectional pairs — `in-stock` ↔ `lost` and `assigned` ↔
`returned` — each carry one direction per interior row, which is why a pair
reads as two parallel lines rather than one. The Recover edge runs leftwards
along the lower of the two `in-stock`/`lost` rows and terminates at `in-stock`;
it does not reach `assigned`. The `assigned` box has three outgoing edges
(`mark returned` to `returned`, `mark lost` to `lost`, `discard` to
`discarded`) and two incoming edges (`assign` from `in-stock` and `re-assign`
from `returned`). The `returned` box has one outgoing edge (`mark lost` to
`lost`, the riser that climbs the right-hand column) and one incoming edge
(`mark returned` from `assigned`); its `re-assign` edge runs leftwards back to
`assigned`. The `lost` box receives three edges (`mark lost` from `in-stock`,
`mark lost` from `assigned`, and `mark lost` from `returned`) and sends one
(`recover` to `in-stock`); the `discarded` box has no outgoing edge.

The five states are exclusive buckets [Q5]. `discarded` is a bucket like any
other: the asset leaves Active Inventory, but the row and the full history stay
and the asset remains reachable at its detail URL [memory:M4]. `lost` is no
longer a dead end — the POC's "cannot be transitioned" message is replaced by
the recovery path.

**`discarded` is terminal.** No edge leaves it. The release does not undo a
write-off and does not permit a discarded asset to be marked lost; a discarded
asset can still be edited, and that is all. The map draws no edge out of
`discarded` for the same reason the detail screen offers no action there.

**`in-stock → lost` exists.** An asset registered into stock and then found
missing has no prior holder, so under the POC's transition map the only way it
could ever enter `lost` was to be assigned first — which is false of it. The
approved §4.1 amendment names this edge explicitly [memory:M3], and it is what
makes the `lost → in-stock` recovery route reachable for an asset that was
never handed to anyone.

### F5b — Assign

```
   W3 detail, status in-stock
          |
          v
   +-----------------------+
   | Assign to [_______]   |
   |              [Assign] |
   +-----------------------+
          |        |
   empty  |        | named
          |        v
          |   +------------------------+
          |   | assign succeeds        |
          |   | status: assigned       |
          |   | audit: assign, actor   |
          |   |   from server context  |
          |   | holder set             |
          |   | last holder set        |
          |   +------------------------+
          |        |
          v        v
   +-----------------------+
   | validation error     |
   | "A holder is         |
   |  required."          |
   +-----------------------+
```

**The holder is required.** The POC's assign control takes a holder name; an
empty one is a validation failure, not a silent no-op. Every transition has
explicit validation [Q15].

**The audit entry's actor is never the holder.** The `assign` entry records the
holder as the *subject* and the actor — from trusted server-side context — as the
*actor*. These are different fields, and the flow keeps them apart. An
administrator assigning a laptop to Dana is not the actor of the record if the
actor is a configured service account; this is exactly what the actor-trust
rule is protecting [Q16].

### F5b2 — Mark returned

```
   W3 detail, status assigned
          |
          | click [Mark returned]
          v
   +---------------------------+
   | mark-returned succeeds    |
   | status: returned          |
   | holder cleared            |
   | last holder kept          |
   | audit: return             |
   +---------------------------+
             |
             v
   +---------------------------+
   | W3 detail                 |
   | [Returned] chip           |
   | Holder  --                |
   | Last holder  Dana R       |
   | Actions:                  |
   |   [Mark lost]             |
   |   [Re-assign]             |
   | History gains the return  |
   +---------------------------+
```

**Returned is a resting state, not a synonym for in stock.** The asset's status
reads **Returned**, and it is its own bucket — separate from `in-stock`, with
its own tile on the dashboard, its own chip in the list, and its own filter
option [Q5]. This is the workbook's §21.1 Scenario 3 amendment, which records
that the status becomes Returned, and it is what the release's `returned`
bucket exists to carry.

**The holder is cleared and the last holder is kept**, on the same rule as every
other transition that ends a custody: the asset is no longer in someone's
hands, but who had it stays visible [memory:M4]. A returned asset can then be
re-assigned or marked lost — the two actions the screen offers from `returned`.

**The return is its own audit event**, distinct from a loss and distinct from a
recovery, so the history reads as the sequence it was rather than as a series
of indistinguishable status changes.

### F5c — Mark lost

> **The reason dialog's behaviour, stated once.** Every reason-bearing
> transition in this release — mark lost, discard, recover — uses the same
> dialog contract. The reason `<select>` shows the placeholder until a reason is
> chosen, the submit control **stays enabled**, and submitting without a reason
> produces the message `A reason is required.` with focus moved to it and
> nothing written. The submit control is never disabled, so the "no reason"
> branch below is reachable on every one of these flows, and it always ends in
> the same place: the asset's state is unchanged.

```
   W3 detail, status assigned, returned, or in-stock
          |
          | click [Mark lost]
          v
   +----------------------------------+
   | W7 Reason dialog                 |
   | "currently assigned to Dana"      |
   | "records who had it and ends the  |
   |  assignment. Dana is kept as the  |
   |  last holder."                   |
   | Reason * [ Select a reason... ]  |
   |           [Cancel]  [Mark lost]  |
   +----------------------------------+
          |                 |
     no reason           reason chosen
          |                 |
          v                 v
   +---------------+   +-------------------------+
   | "A reason is  |   | mark-lost succeeds      |
   |  required."   |   | status: lost            |
   +---------------+   | holder cleared           |
                       | last holder kept         |
                       | audit: mark-lost         |
                       +-------------------------+
                                 |
                                 v
                       +-------------------------+
                       | W3 detail               |
                       | [Lost] chip             |
                       | Holder  --              |
                       | Last holder  Dana R     |
                       | Actions:                |
                       |   [Recover asset]       |
                       |   [Edit asset]          |
                       | History gains mark-lost |
                       +-------------------------+
```

**The dialog states the consequence before it asks for the reason** [Q3]. The
paragraph is not decoration: it tells the administrator that the assignment
ends and the prior holder is kept, so the reason is recorded against the right
event.

**The reason comes from the shared vocabulary.** The select is populated from it,
not from free text — the vocabulary is what makes the audit history queryable.
Free text would let it drift.

**The reason is required.** The transition cannot complete without one, so the
form does not offer a way to complete it without one.

**What the flow produces.** The current holder is cleared, the last holder is
kept, and a `mark-lost` entry names the prior holder. The detail screen then
shows `Holder --` next to `Last holder Dana R`. That contrast is the visible
form of `last_assigned_to` doing its job.

**The `in-stock` entry into this flow.** The loss transition is available from
`in-stock` as well as from `assigned` and `returned` [memory:M3]. When the
asset was never assigned, there is no current holder to clear and no prior
holder to preserve, so both holder fields are empty after the loss, and the
`mark-lost` entry records that the asset was in stock rather than in someone's
hands. The reason is still required, and the same shared loss-reason vocabulary
supplies it. Without this entry point, an asset registered into stock and then
found missing could never enter `lost` at all, which would make the `lost →
in-stock` recovery route unreachable for exactly the assets that most need it.

### F5d — Discard

```
   W3 detail, status assigned
          |
          | click [Discard]
          v
   +----------------------------------+
   | W8a Discard dialog               |
   | "resolves the assignment: Dana   |
   |  is cleared as current holder    |
   |  and kept as the last holder."   |
   | "leaves Active Inventory, but    |
   |  its row and full history are    |
   |  kept and stay here."            |
   | Reason * [ Select a reason... ]  |
   |   (shared loss reasons +         |
   |    retirement-specific)          |
   |      [Cancel]  [Discard asset]   |
   +----------------------------------+
          |                 |
     no reason           reason chosen
          |                 |
          v                 v
   +---------------+   +--------------------------+
   | "A reason is  |   | discard succeeds         |
   |  required."   |   | status: discarded        |
   +---------------+   | assigned_to cleared      |
                       | last_assigned_to kept    |
                       | row NOT deleted          |
                       | history NOT deleted      |
                       | audit: discarded         |
                       |   names the prior holder |
                       |   and that the          |
                       |   assignment was        |
                       |   resolved by the       |
                       |   discard               |
                       +--------------------------+
                                 |
                                 v
                       +--------------------------+
                       | W3 detail                |
                       | [Discarded] chip         |
                       | Holder  --               |
                       | Last holder  Dana R      |
                       | "no longer part of Active|
                       |  Inventory, but its      |
                       |  record and history are  |
                       |  kept."                  |
                       | Actions: [Edit asset]    |
                       +--------------------------+
```

**Discarding is not deleting.** The row survives, the history survives, and the
asset stays reachable at its detail URL [memory:M4]. The dialog says so before
the reason is chosen, because "discard" reasonably suggests deletion, and
nothing in this release is destroyed.

**The assignment is resolved inline.** The current holder is cleared and the
prior holder is kept as the last holder. The audit entry records the discard,
the prior holder, and the fact that the assignment was resolved by the discard
— not by a separate return.

**The discard reason vocabulary is wider than the loss vocabulary.** It is the
shared loss-reason vocabulary plus retirement-specific values [Q3]
[memory:M4].

**Where the asset goes afterwards.** Out of Active Inventory; still in the
`discarded` bucket and in Total Records; still in the list, under the
`Discarded` status filter; still findable through the holder directory as a
last-held asset.

**The only action left is Edit.** A discarded asset has no further lifecycle
transitions in this release. The detail screen offers editing, not recovery —
recovery is a transition out of `lost`, and the release does not undo a
discard.

### F5e — Recover

```
   W3 detail, status lost
          |
          | click [Recover asset]
          v
   +----------------------------------+
   | W8b Recover dialog               |
   | "was marked lost. Dana was its   |
   |  last holder. Recovering it      |
   |  returns it to stock and records |
   |  the recovery as its own event,  |
   |  naming Dana."                   |
   | Recovery reason * [ Select... ]  |
   |      [Cancel]  [Recover asset]   |
   +----------------------------------+
          |                 |
     no reason           reason chosen
          |                 |
          v                 v
   +---------------+   +--------------------------+
   | "A reason is  |   | recover succeeds         |
   |  required."   |   | status: in-stock         |
   +---------------+   | assigned_to empty        |
                       |   (it already was)        |
                       | last_assigned_to kept    |
                       | audit: recovered         |
                       |   (its own action, not    |
                       |    assign and not return) |
                       |   names the prior holder |
                       +--------------------------+
                                 |
                                 v
                       +--------------------------+
                       | W3 detail                |
                       | [In stock] chip          |
                       | Holder  --               |
                       | Last holder  Dana R      |
                       | Actions: [Assign]        |
                       | History gains recovered  |
                       +--------------------------+
```

**Recovery is its own event.** The action vocabulary gives it a distinct
`recovered` action rather than reusing `assign` or `return`, and the description
names the recovery and the prior holder [memory:M3]. The flow shows the
distinction because reusing `return` would make the history unreadable — a
recovered asset and a returned asset would look identical in the audit trail.

**Recovery lands in `in-stock`, not `assigned`.** The transition is
`lost → in-stock` [memory:M3]. The dialog offers no holder field: recovery
ends the loss, it does not hand the asset to someone. Re-assigning it is a
separate, subsequent flow — F5b — and it produces its own `assign` entry.

**Recovery keeps the last holder.** `assigned_to` is empty after the recovery —
it already was, because a `lost` asset has no current holder — and
`last_assigned_to` is **retained**, exactly as the discard does [memory:M4]. The
recovered asset is therefore `in-stock` *and* has a display holder: it is
counted under the person who last held it, not in the holder directory's
Unassigned row. This is the same rule the discard follows, and it is the rule
the Unassigned row's membership turns on — F5g, the never-held case, is the one
that clears both fields. An implementer who cleared `last_assigned_to` on
recovery would move every recovered asset into the Unassigned row and contradict
the display-holder rule.

**The recovery reason is required and drawn from the shared loss-reason
vocabulary** [Q3].

**Complex recovery is not here.** Partial recovery, credit assignment, and
dispute handling are deferred [memory:M3]. The flow has one recovery path, and
the one transition it covers is the one the release contains.

### F5f — The rule every write flow carries

```
   any write flow (F1, F5b, F5b2, F5c, F5d, F5e, F5g, F5h)
          |
          v
   +------------------------------------------+
   | the actor on the audit entry is resolved |
   | from trusted server-side context         |
   |                                          |
   | the actor is never read from the request |
   | the actor is never typed by an operator  |
   | the actor is never a picker on any screen|
   +------------------------------------------+
```

There is no branch here, and that is the point. Because no screen in this release
offers an actor control, no write flow can be given a forged actor. If the
inception stages select the operator-selection candidate, this flow gains a
step at its head and the wireframes change [Q17].

The enumeration is every flow that writes an audit entry: registration (F1,
`create`), each lifecycle transition (F5b Assign, `assign`; F5b2 Mark returned,
`return`; F5c Mark lost, `mark-lost`; F5d Discard, `discarded`; F5e Recover,
`recovered`), the `in-stock` loss variant (F5g, `mark-lost`), and the edit
(F5h, `edit`). The edit is on the list because it is a write — it changes the
asset record and appends an `edit` entry — and because an edit that carried a
forged actor would forge custody history just as a transition would.

### F5g — Where the `in-stock` loss differs

```
   W3 detail, status in-stock
          |
          | click [Mark lost]
          v
   +----------------------------------+
   | W7 Reason dialog                 |
   | "This asset is in stock. It has   |
   |  not been assigned to anyone.    |
   |  Marking it lost records it as   |
   |  missing, and there is no holder |
   |  to keep."                       |
   | Reason * [ Select a reason... ]  |
   |           [Cancel]  [Mark lost]  |
   +----------------------------------+
          |                 |
     no reason           reason chosen
          |                 |
          v                 v
   +---------------+   +-------------------------+
   | "A reason is  |   | mark-lost succeeds      |
   |  required."   |   | status: lost            |
   +---------------+   | holder: empty (none was) |
                       | last holder: empty      |
                       | audit: mark-lost,       |
                       |   actor from server     |
                       +-------------------------+
```

The flow is F5c with one difference in the outcome: an asset that was never
assigned has no current holder to clear and no prior holder to preserve, so
both holder fields are empty afterwards. The reason is still required and comes
from the same shared vocabulary. This path exists because the approved §4.1
amendment names `in-stock -> lost` [memory:M3]; without it, an asset registered
into stock and then found missing could never be recorded as lost at all.

**The consequence paragraph is the other of W7's two variants.** The reason
dialog's shape is fixed, but its paragraph is rendered from the asset's current
status: an `assigned` asset's paragraph says the transition ends the assignment
and keeps the holder, and this `in-stock` asset's paragraph says there is no
holder to keep. Both variants are drawn in `wireframes.md` under W7, so the copy
for every status that reaches the dialog is specified rather than assumed.

### F5h — Edit an asset's details

The flow that changes the asset record without changing its state. It is the
one write path in the release that writes no lifecycle transition, and the
distinction is the whole reason it needs its own flow.

```
   W3 Asset detail
          |
          | click [Edit asset]
          v
   +------------------------------------------+
   | W5 Edit-asset form                       |
   | loaded with the asset's current values:  |
   |   Category, Name, Serial / Key,          |
   |   Model, Notes                           |
   |                                          |
   | the asset's own identity is carried in   |
   | the form's state, not as a visible field |
   +------------------------------------------+
          |                    |
   edit   |                    |  no change to
   serial |                    |  serial/category
          |                    |  (or only name,
          |                    |   model, notes)
          v                    v
   +------------------+  +-------------------------+
   | inline uniqueness|  | submit                   |
   | check re-runs    |  | the asset is excluded    |
   | against the NEW  |  | from its own comparison  |
   | category         |  +-------------------------+
   +------------------+          |
     |          |                |
   collision  no collision       |
     |          |                |
     v          |                |
   +--------+   |                |
   | inline |   |                |
   | warning|   |                |
   | (W5)   |   |                |
   +--------+   |                |
     |    |     |                |
     |  dismissed, continue      |
     |    |     |                |
     |    +-----+----------------+
     |          |
     |          v
     |     (submit-time uniqueness
     |      check, below)
     |
     |  [Open existing asset]
     v
   +-------------------------+
   | W3 Asset detail         |
   | the OTHER asset         |
   | no edit is written,     |
   | no audit entry          |
   +-------------------------+


   submit-time uniqueness check
          |
          |  collision
          v
   +-------------------------+
   | Collision block         |
   | names the other asset   |
   | [Open existing asset]   |
   | [Change the serial]     |
   +-------------------------+
     |              |
     |              |  change the serial
     |              +----------> back to W5 (values kept)
     |
     |  [Open existing asset]
     v
   +-------------------------+
   | W3 Asset detail         |
   | the other asset         |
   | no edit is written,     |
   | no audit entry          |
   +-------------------------+


   no collision
          |
          v
   +------------------------------------------+
   | edit succeeds                            |
   | the asset's details are updated          |
   | status is unchanged                      |
   | audit: edit                              |
   |   actor from trusted server-side context |
   |   description names the fields that      |
   |   changed                                 |
   +------------------------------------------+
          |
          v
   +------------------------------------------+
   | W3 Asset detail                          |
   | shows the new values                     |
   | the history has a new edit entry         |
   | the counts are unaffected                 |
   +------------------------------------------+
```

**The form loads with the current values.** The edit form is the registration
form with the asset's existing values filled in — category, name, serial or
key, model, notes. Nothing is blank and nothing is defaulted, so an edit that
changes one field does not silently reset the others.

**The asset's own serial is not a collision with itself.** The comparison
excludes the asset being edited. The screen carries the asset's identity in the
form's state rather than as a visible field, and the uniqueness check excludes
it from the candidate set. Without this rule, every edit of any field on an
asset would report the asset as a collision with itself.

**Changing the category re-runs the inline check.** The uniqueness definition is
category-scoped, so moving a serial to a different category changes which
collisions are possible. When the category changes, the inline check re-runs
against the new category rather than against the one the form loaded with. The
submit-time check always uses the form's current category.

**The inline warning on the edit path behaves as it does on the registration
path.** It is advisory, it is dismissible, and its only action — open the
existing asset — navigates to the *other* asset's detail screen. It does not
write the edit. A dismissal is not a waiver: dismissing it and submitting still
reaches the submit-time collision check.

**The submit-time collision block is the authoritative branch.** It names the
other asset and offers exactly two actions: open that asset, or change the
serial. There is no "save anyway" [Q4], and the policy is the same one the
registration path enforces, under the same shared definition [Q18].

**An edit writes an audit entry, under the action name `edit`.** The release's
audit history is actor-attributed and append-only, and an edit changes the
asset record — so it produces an entry like any other write. The action name
is **`edit`**, distinct from `create` and from every lifecycle action, because
an edit is not a transition: it does not change the asset's bucket, its holder,
or its history of custody. The entry's description names the fields that
changed and their previous values, so a reader can see what was edited without
reconstructing it from two versions of the row. The actor is resolved from
trusted server-side context, as on every other write [Q16].

**An edit does not change the counts.** Status is not editable here — the
lifecycle moves only through the explicit actions on the detail screen, each
with its own validation and audit behaviour [Q15]. An edit that changed status
would be a second, unvalidated path into the state machine. So the dashboard's
bucket tiles, the list's count line, the holder directory's chips and the CSV
export's row count are all unchanged by an edit, because none of them counts a
field an edit can change. The one exception is the holder directory, and only
when the edited field was a holder value — but the holder is not an editable
field on this form, so that exception cannot arise.

**A discarded asset can still be edited.** The `discarded` state offers "Edit
asset only" [memory:M4]. The flow is the same; the asset's state is unchanged
by the edit, so it stays `discarded` and stays excluded from Active Inventory
and included in Total Records.

---

## F6 — Export the asset list as CSV

The export is an action on the asset list rather than a screen of its own — it
produces a file, not a view — but it is one of the four count-consuming
surfaces [Q1] [memory:M2], and it has a lifecycle of its own.

```
   W2 Asset list, with a filter applied
          |
          | click [Export CSV]
          v
   +----------------------------------------+
   | the export reads the current filter    |
   | and the current result set             |
   +----------------------------------------+
          |
          v
   +----------------------------------------+
   | row set = the rows the list is showing |
   | column set = Name, Category,           |
   |   Serial / Key, Status, Holder,        |
   |   Last holder                           |
   | Notes and audit history are NOT        |
   |   exported                               |
   | every cell value sanitised so it       |
   |   cannot be interpreted as a formula   |
   +----------------------------------------+
          |                        |
     N rows > 0              N rows = 0
          |                        |
          v                        v
   +--------------------+   +--------------------+
   | a CSV file with a  |   | a CSV file with a  |
   | header and N data  |   | header and no data |
   | rows               |   | rows               |
   | N = the list's     |   | the list's         |
   | "Showing N of M"   |   | zero-result state  |
   | count for the same |   | is deferred [Q1];  |
   | filter             |   | the file is not    |
   +--------------------+   +--------------------+
```

**The exported scope is the filtered rows.** The export produces exactly the
rows the list is currently showing, under the filter currently applied — not
the whole table. An administrator who filtered to one category and exported
gets that category. This is what makes the export's row count equal the list's
count, and both numbers come from the shared counting function through the
same filter builder [Q5].

**The exported columns are the list's columns**, in the list's order: Name,
Category, Serial / Key, Status, Holder, Last holder. The holder rule is the
same rule the two list columns follow — **Holder** is the current holder and
**Last holder** is the preserved `last_assigned_to`, each empty when it does
not apply. The export does not merge them into one field, because the list
does not and a spreadsheet is read harder than a table row.

**The column set is stated deliberately.** Six columns, fixed by name and order.
Two fields are deliberately excluded. **Notes** is a free-text field on the
asset record that appears on the detail screen, but it is not one of the list's
columns, so exporting it would widen the export beyond the list it is a copy of
and break the property that the export's rows *and* columns agree with what the
list shows. **Audit history** is excluded for the same reason plus one of its
own: it is a separate surface and it is append-only and unbounded. The export is
a *reconciliation* export — it carries the six fields an administrator
reconciles assets against, and nothing else.

**Every cell value is sanitised so it cannot be interpreted as a formula.** A
value beginning with `=`, `+`, `-`, or `@` is escaped before it is written. This
is the export's distinguishing security property, and it is silent: a sanitised
cell contains the same value, prefixed so that a spreadsheet shows text rather
than evaluating it. The administrator sees no difference; the difference is
that opening the file cannot execute a value an administrator typed into a
field. A spreadsheet is the destination format, so this is where the risk
actually lives.

Because Notes is not exported, the formula-injection risk sits with the
exported free-text fields: **Name**, **Category**, **Status**, **Holder** and
**Last holder** are administrator-typed strings, and **Serial / Key** is a
typed string or a commercially sensitive licence key [constraint-register.md]
(DC-05). Every cell of every exported column is sanitised — the rule applies
by column set, not by a list of which columns happen to look risky, because a
value that renders as text in one column renders as text in all of them.

**The zero-row case produces a file, not a failure.** A header-only file. The
export does not fail, and it does not silently export everything instead — that
would break the row-count equality that makes this surface part of the
count-consistency group. The list's own zero-result state and its reset belong
to the deferred empty states [Q1] [memory:M3] and are not part of the release; the
header-only file is.

---

## The Cross-Cutting Paths

Three paths appear in more than one flow. They are drawn once here rather than
repeated, so that a change to one is visibly a change to all.

### The audit entry is appended, never replaced

```
   any state-changing action
          |
          v
   +------------------------------------------+
   | append one entry to the asset's history  |
   |                                          |
   | timestamp | action | actor | description  |
   |                                          |
   | the action names the specific event:     |
   |   assign / return / mark-lost /           |
   |   discarded / recovered / create / edit   |
   |                                          |
   | the description names the specifics:     |
   |   which holder, which prior holder,      |
   |   which reason                           |
   +------------------------------------------+
          |
          v
   +------------------------------------------+
   | history grows; nothing in it is edited   |
   | or removed                               |
   +------------------------------------------+
```

The detail screen renders the history newest first, with the actor on every
entry [Q7]. The POC renders only the latest audit row; the MVP renders the
whole sequence. The flow's invariant is that the sequence is append-only — an
asset's history is never rewritten, which is what makes the Audit Completeness
measure meaningful.

**Pre-MVP history.** History that predates the MVP is backfilled to a `system`
actor and is excluded from the Audit Completeness population [memory:M3]. The
flow shows no separate path for it: backfilled rows are simply present in the
history with a `system` actor, visible in the list as the oldest entries.

### The shared counting function

```
   W1 dashboard  --+
   W2 asset list --+
   W6 holders    --+--> one shared counting function
   W2 CSV export --+        |
                            |  one shared filter builder
                            v
                    the same number, every time
```

All four surfaces are one indivisible group. A surface that computed its own
count would be a fifth definition, and the counts would disagree — which is
the defect the group exists to remove.

**The consequence for the flows.** F3's dashboard numbers, F2's "Showing N of M"
line, F4's per-holder chips, and the CSV export's row count are all the same
number read through different filters. When the administrator exports the list
and then opens the dashboard, the two agree — and that agreement is a property
of the release, not a coincidence.

### The retryable-write path

```
   a write is attempted
          |
          v
   +-------------------------------+
   | the database is momentarily   |
   | busy with another write       |
   +-------------------------------+
          |
          v
   +-------------------------------+
   | the write is retryable        |
   | (busy_timeout is non-zero;    |
   |  the uniqueness check runs in |
   |  an IMMEDIATE transaction;    |
   |  SQLITE_BUSY maps to a        |
   |  retryable error)             |
   +-------------------------------+
          |
          v
   +-------------------------------+
   | the operation is retried; the |
   | administrator is not shown a  |
   | failure for a transient       |
   | condition                     |
   +-------------------------------+
```

This is a flow-level fact, not a screen. A transient lock contention is
retried; the administrator never sees it. What the administrator *does* see is
the genuine uniqueness collision from F1, which is a different condition with a
different resolution path.

---

## The Screen-State Coverage of These Flows

Every state in `wireframes.md`'s state table is reachable from one of these
flows, which is the test of whether the flow set is complete. The empty states
are **not** in the release — they are deferred [Q1] [memory:M3] — so the rows
that carry them are recorded here as future-state guidance, and the release's
own answer to each is the POC's bare empty row.

| State | In the MVP? | Reached by | Shows |
|---|---|---|---|
| Empty — list with no assets | **No — deferred** [Q1] [memory:M3] | F1, arriving at an empty list after the first create | *Future-state guidance:* a message naming what would appear and the action that creates it. The MVP keeps the POC's bare empty row |
| Empty — no holders | **No — deferred** [Q1] [memory:M3] | F4, with an organisation that has never assigned an asset | The same treatment, plus the "Unassigned" row. The MVP keeps the POC's bare empty row |
| Empty — history with no entries | **No — deferred** [Q1] [memory:M3] | F5, on an asset with no history beyond its creation | The creation entry is always present, so this state is unreachable in practice |
| Zero results | **No — deferred** [Q1] [memory:M3] | F2 | *Future-state guidance:* "No assets match these filters", with a reset. The MVP keeps the POC's bare empty row |
| Loading | Not drawn | — | **Not drawn.** The application is synchronous and server-rendered |
| Success | Yes | F1, F5b, F5c, F5d, F5e | The new status chip and the new history entry at the top |
| Success — edit | Yes | F5h | The new values on W3 and a new `edit` history entry at the top; the status chip is unchanged because the edit changed no bucket |
| Validation error | Yes | F1, F5b, F5c, F5d, F5e | The POC's error block, extended with the collision block and the missing-reason message |
| Validation error — edit | Yes | F5h | The same POC error block on W5, extended with the collision block; the asset's own serial is excluded from the comparison, so the error can only name another asset |
| Collision — inline | Yes | F1, F5h | The inline warning under the serial field, advisory and dismissible, naming the other asset and offering to open it; it never writes and never creates |
| Collision — submit-time | Yes | F1, F5h | The collision block naming the other asset, with exactly two actions: open the existing asset, or change the serial |
| Edge — a `lost` asset | Yes | F5c | Holder empty, Last holder populated, Recover offered |
| Edge — a `discarded` asset | Yes | F5d | The "kept, not deleted" note, and Edit as the only action |
| Edge — a holder with only last-held assets | Yes | F4 | The zero currently-held count and the last-holder marker |
| Export result | Yes | F6 | A file with the filtered rows, a header-only file for a zero-row filter, and formula-sanitised cell values — not a screen state, but the export's own lifecycle |

---

## Assumptions & Open Questions

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

---

## Sources Consumed

- **intent-statement** (`aidlc/spaces/default/intents/261106-asset-tracker-mvp/ideation/intent-capture/intent-statement.md`) — the problem framing, the target customer, the Audit Completeness metric, the confirmed scope bounds, and the actor-trust rule.
- **scope-document** (`aidlc/spaces/default/intents/261106-asset-tracker-mvp/ideation/scope-definition/scope-document.md`) — the in/out boundary of the release, the four count-consuming surfaces and the shared counting guarantee, the three approved invariants, the actor-identity boundary and its candidate shortlist, and the deferred-item set.
- **intent-backlog** (`aidlc/spaces/default/intents/261106-asset-tracker-mvp/ideation/scope-definition/intent-backlog.md`) — the ranked proto-Units, the risk-first ordering, the actor-identity decision's position as the foundation's blocking dependency, and the deferred items C-01 through C-05 with their triggers.
- **wireframes** (`aidlc/spaces/default/intents/261106-asset-tracker-mvp/ideation/rough-mockups/wireframes.md`) — the eight screens, the shared frame, the per-screen accessibility notes, the screen-state table, and the set of deferred and deliberately absent surfaces.
- **rough-mockups-questions** (`aidlc/spaces/default/intents/261106-asset-tracker-mvp/ideation/rough-mockups/rough-mockups-questions.md`) — the nineteen confirmed answers (Q1–Q19) and the thirty-four accepted assumptions these flows are drawn against. The `## Assumptions & Open Questions` section above carries the seventeen of those thirty-four that this deliverable itself relies on, together with the assumptions this stage took while drawing; each of those carries its own grounding tags.
- **constraint-register** (`aidlc/spaces/default/intents/261106-asset-tracker-mvp/ideation/feasibility/constraint-register.md`) — the fixed technical constraints the flows must not contradict, including the shared uniqueness definition, the shared counting definition, the actor-trust rule, and the retryable-write behaviour.
- **the POC's own application shape** (`src/routes/assets.js`, `src/services/asset-service.js`, `src/repositories/assets-repo.js`, `views/list.ejs`, `views/new.ejs`, `views/detail.ejs`) — the existing routes, the transition map, the current status vocabulary, the audit-panel behaviour, and the post-create redirect the registration flow follows.

---

## Review

Reserved for the reviewer at the approval gate.
