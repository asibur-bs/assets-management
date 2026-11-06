# Cross-Unit Final Coverage Gate

**Stage:** Build and Test (3.6) · **Verdict: PASS**

Every `FR` and `NFR` from `requirements.md` is enumerated below and checked
against `construction/code-generation/traceability.json`. There is a single
Unit in this scope (the whole `poc` application); there is no Unit DAG, and
`inception/user-stories/stories.md` does not exist — the User Stories stage
was skipped — so there are **no three-segment `AC` ids** to enumerate.

> **Re-run after the loop-back repair.** The first run of this stage recorded
> two findings — an inaccurate FR3.3 note (the same defect recorded as
> T-FR3.3) and an overstated NFR2 note. Both have since been corrected in
> `traceability.json` by code generation and re-verified. This file is the
> replay's fresh coverage gate; the first run's findings are preserved below
> under "Findings (first run — now resolved)".

## Enumeration

| Source | IDs found |
|--------|-----------|
| `inception/requirements-analysis/requirements.md` | **36** — 31 leaf FRs (FR1.1–FR5.3), 5 group headings (FR1–FR5), 7 NFRs (NFR1–NFR7) |
| `inception/user-stories/stories.md` | 0 — stage skipped in this scope |

## Verification Method

For each id:

1. it has a `coverage[]` row in `traceability.json` with status `OK`;
2. it has a `reverse[]` row with status `OK` and its own `target`;
3. the named `target` file exists on disk;
4. the `coverage[]` note is **accurate** against the implementation as it
   stands — this last check is what caught the two findings below. A row that
   says `OK` but whose note misdescribes the code is a traceability defect
   even when the requirement itself is met.

## Per-ID Coverage

| ID | Group | Coverage status | Reverse status | Target file | Target exists | Owning stage/Unit | Note accurate? |
|----|-------|-----------------|----------------|-------------|---------------|--------------------|----------------|
| FR1 | FR1.1–FR1.5 | `N/A` (group heading) | — | `src/repositories/assets-repo.js` | Yes | `poc` Unit | Yes |
| FR1.1 | FR1 | `OK` | `OK` | `src/repositories/assets-repo.js` | Yes | `poc` Unit | Yes |
| FR1.2 | FR1 | `OK` | `OK` | `src/repositories/assets-repo.js` | Yes | `poc` Unit | Yes |
| FR1.3 | FR1 | `OK` | `OK` | `src/repositories/assets-repo.js` | Yes | `poc` Unit | Yes — `UNIQUE (category, serial_or_key)` confirmed in `src/db/migrations.sql` |
| FR1.4 | FR1 | `OK` | `OK` | `src/routes/assets.js` | Yes | `poc` Unit | Yes — live 302 → `/assets` confirmed |
| FR1.5 | FR1 | `OK` | `OK` | `src/repositories/assets-repo.js` | Yes | `poc` Unit | Yes — `status = 'in-stock'` on every create |
| FR2 | FR2.1–FR2.5 | `N/A` (group heading) | — | `src/repositories/assets-repo.js` | Yes | `poc` Unit | Yes |
| FR2.1 | FR2 | `OK` | `OK` | `views/list.ejs` | Yes | `poc` Unit | Yes |
| FR2.2 | FR2 | `OK` | `OK` | `src/repositories/assets-repo.js` | Yes | `poc` Unit | Yes — `LOWER(name) LIKE ? OR LOWER(serial_or_key) LIKE ?` confirmed |
| FR2.3 | FR2 | `OK` | `OK` | `src/repositories/assets-repo.js` | Yes | `poc` Unit | Yes |
| FR2.4 | FR2 | `OK` | `OK` | `src/repositories/assets-repo.js` | Yes | `poc` Unit | Yes — sort column/direction whitelist confirmed |
| FR2.5 | FR2 | `OK` | `OK` | `views/list.ejs` | Yes | `poc` Unit | Yes |
| FR3 | FR3.1–FR3.3 | `N/A` (group heading) | — | `views/detail.ejs` | Yes | `poc` Unit | Yes |
| FR3.1 | FR3 | `OK` | `OK` | `views/detail.ejs` | Yes | `poc` Unit | Yes — all fields incl. `assigned_at` / `returned_at` present |
| FR3.2 | FR3 | `OK` | `OK` | `views/detail.ejs` | Yes | `poc` Unit | Yes |
| **FR3.3** | FR3 | `OK` | `OK` | `views/detail.ejs` | Yes | `poc` Unit | **Yes — re-verified after the repair.** The note now describes the per-state form set accurately, and the live per-state probe confirms every offered action is a valid transition. |
| FR4 | FR4.1–FR4.8 | `N/A` (group heading) | — | `src/services/asset-service.js` | Yes | `poc` Unit | Yes |
| FR4.1 | FR4 | `OK` | `OK` | `src/services/asset-service.js` | Yes | `poc` Unit | Yes |
| FR4.2 | FR4 | `OK` | `OK` | `src/services/asset-service.js` | Yes | `poc` Unit | Yes |
| FR4.3 | FR4 | `OK` | `OK` | `src/services/asset-service.js` | Yes | `poc` Unit | Yes |
| FR4.4 | FR4 | `OK` | `OK` | `src/services/asset-service.js` | Yes | `poc` Unit | Yes — the service transition set is correct, and the view-side violation that was found on the first run has been repaired |
| FR4.5 | FR4 | `OK` | `OK` | `src/services/asset-service.js` | Yes | `poc` Unit | Yes |
| FR4.6 | FR4 | `OK` | `OK` | `src/services/asset-service.js` | Yes | `poc` Unit | Yes |
| FR4.7 | FR4 | `OK` | `OK` | `src/services/asset-service.js` | Yes | `poc` Unit | Yes |
| FR4.8 | FR4 | `OK` | `OK` | `src/repositories/assets-repo.js` | Yes | `poc` Unit | Yes |
| FR5 | FR5.1–FR5.3 | `N/A` (group heading) | — | `src/repositories/assets-repo.js` | Yes | `poc` Unit | Yes |
| FR5.1 | FR5 | `OK` | `OK` | `src/repositories/assets-repo.js` | Yes | `poc` Unit | Yes |
| FR5.2 | FR5 | `OK` | `OK` | `views/detail.ejs` | Yes | `poc` Unit | Yes |
| **FR5.3** | FR5 | **`Deferred`** | **`Deferred`** | `views/list.ejs` | Yes | `poc` Unit | Yes — the deferral is deliberate and documented |
| NFR1 | — | `OK` | `OK` | `views/list.ejs` | Yes | `poc` Unit | Yes — `data-testid="nav-new"` confirmed live |
| NFR2 | — | `OK` | `OK` | `src/repositories/assets-repo.js` | Yes | `poc` Unit | **Yes — re-verified after the repair.** The note no longer claims an index that does not exist, and now records that the search is a leading-wildcard `LIKE`. |
| NFR3 | — | `OK` | `OK` | `src/server.js` | Yes | `poc` Unit | Yes — live boot confirmed |
| NFR4 | — | `OK` | `OK` | `README.md` | Yes | `poc` Unit | Yes |
| NFR5 | — | `OK` | `OK` | `src/db/index.js` | Yes | `poc` Unit | Yes — WAL + foreign keys confirmed |
| NFR6 | — | `OK` | `OK` | `src/services/asset-service.js` | Yes | `poc` Unit | Yes — static review found no outbound client, no `eval`/`innerHTML`, no hardcoded secret |
| NFR7 | — | `OK` | `OK` | `README.md` | Yes | `poc` Unit | Yes |

**Totals: 36 enumerated ids — 30 leaf requirements with `OK`, 5 group headings
(`N/A`), 1 leaf requirement deferred (FR5.3). Every named target file exists
on disk, and every `coverage[]` note is accurate against the implementation.**

**31 leaf requirements** carry a testable target row (24 FR + 7 NFR); the 5
`FR1`–`FR5` group headings are section headings in `requirements.md`, not
independently testable requirements, and carry no target row. All 31 are
applicable — none qualifies for the single explanatory `N/A` row.

## Findings (first run — now resolved)

> Both findings from the first run have been corrected in
> `construction/code-generation/traceability.json` by the loop-back repair and
> re-verified on this replay. They are preserved verbatim below so the
> reasoning that produced the repair stays auditable.

### Finding 1 — FR3.3's traceability note is inaccurate (also the T-FR3.3 defect)

**Status: RESOLVED.** The note now reads:

> "The actions section renders only the forms valid for the asset's current
> state: in-stock offers assign; assigned offers return and mark-lost;
> returned offers mark-lost and re-assign; lost offers none. `returned ->
> returned` is not a valid transition, so no 'Mark returned' form is offered
> for a returned asset."

That note is now **accurate against the implementation**: the live per-state
probe confirms the per-state form sets match it exactly, and the
`views/detail.ejs` branch that caused the mismatch has been split.

On the first run, `traceability.json` recorded FR3.3 with status `OK` and the
note:

> "The actions section renders the assign / return / mark-lost forms for the
> current state."

The live per-state probe proved this was not true for the `returned` state.
`views/detail.ejs:31` merged `assigned` and `returned` into one branch, so a
`returned` asset rendered the "Mark returned" form; the POST was rejected with
HTTP 400 because `returned → returned` is not in the FR4.4 transition set.

This was one defect with two surfaces: the traceability row overstated the
implementation, and the implementation violated FR3.3. The `reverse[]` row
for FR3.3 ("Also wired in `src/routes/assets.js` and `src/app.js`") was and
remains accurate — the wiring is correct; only the view's state branching was
wrong.

### Finding 2 — NFR2's traceability note overstates the implementation

**Status: RESOLVED.** The note now reads:

> "Case-insensitive search over name and serial_or_key returns a filtered list
> on request. No supporting index exists: the search is a leading-wildcard
> `LIKE`, which would not use a B-tree index even if one were created."

That note is now **accurate against the implementation**: `EXPLAIN QUERY PLAN`
for `LOWER(name) LIKE ? OR LOWER(serial_or_key) LIKE ?` returns `SCAN assets`
+ `USE TEMP B-TREE FOR ORDER BY`, confirming there is no index on `name` or
`serial_or_key` and that a B-tree index would not accelerate the pattern.

On the first run, `traceability.json` recorded NFR2 with status `OK` and the
note:

> "**Indexed** search over name and serial_or_key returns a filtered list on
> request."

The search is `LOWER(name) LIKE ? OR LOWER(serial_or_key) LIKE ?` with a
leading-wildcard pattern. `src/db/migrations.sql` creates indexes on `status`,
`category`, and `audit_log(asset_id, id DESC)` — **there is no index on `name`
or `serial_or_key`**, and a leading-wildcard `LIKE` would not use a B-tree
index even if one existed.

**The requirement itself was and remains met.** NFR2 reads: *"Any asset record
shall be locatable from the list view in 5 seconds or fewer by an internal
user on a normal office network."* That is a user-perception bound, not an
indexing requirement, and it holds for a poc-sized dataset. The defect was in
the **word "Indexed"** in the traceability note.

The human's decision (recorded in the code-generation plan) was to **correct
the note** rather than add an index: adding `idx_assets_name` /
`idx_assets_serial` would not help a leading-wildcard `LIKE` at all — a real
fix would need SQLite FTS5 or a trigram table, which materially expands the
`poc` scope and requires a migration on every developer's existing database.

## Verdict

**PASS.** Coverage is complete: every enumerated requirement is bound to a
target file that exists, no id is uncovered, and every traceability note is
accurate against the implementation as it now stands. FR5.3 is the only id
not in status `OK`, and that deferral was made deliberately by Code Generation
and is not a regression.

Both findings from the first run are resolved and re-verified. Nothing
remains to be surfaced at the approval gate from this gate.

