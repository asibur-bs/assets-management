# Phase Boundary Verification — Inception Phase

**Intent**: 261106-asset-tracker-mvp
**Space**: default
**Scope**: feature
**Phase**: inception
**Verdict**: **PASS WITH ONE CORRECTED DEFECT**

---

## What this check does

The Inception phase has reached its boundary. This check consolidates the
traceability records the phase's last three stages produced and asks one
question: **does the release the phase has designed still describe the same
release the Ideation phase approved?**

It compares the three traceability files *against each other*, pairwise,
rather than checking each against a restatement of its own content. A chain
passes when each link is verified against the adjacent link's actual text.

---

## The Records Consolidated

| Stage | File | Upstream ids | Coverage rows | Statuses |
|---|---|---|---|---|
| user-stories | `inception/user-stories/traceability.json` | 115 | 115 | 115 `OK` |
| domain-design | `inception/domain-design/traceability.json` | 40 | 40 | 30 `OK`, 10 `Deferred` |
| units-generation | `inception/units-generation/traceability.json` | 40 | 40 | 30 `OK`, 10 `Deferred` |

**Structural integrity — every file.** In each of the three files the
coverage-row id set equals the `upstream_ids` set exactly: no row is
unregistered, no registered id is untraced, and no id is duplicated. The
user-stories file's own note records why its id list is hand-maintained — the
traceability sensor's pattern cannot match the three letter-suffixed ids
`FR1.6a`, `FR3.6a` and `NFR3.5a`, so they were added by hand rather than
silently dropped.

**Structural integrity — across the files.** The domain-design and
units-generation files carry the same 40 upstream ids in the same order, and
the same 10 `Deferred` statuses on the same 10 ids. Every story traced in
domain-design is also traced in units-generation; there is no story that
reaches a component but never reaches a unit.

---

## The Chain, Verified Link by Link

### Link 1 — Requirement to Story

All **115** upstream requirement ids resolve to a story. There are no `OK`
rows with an empty target, and there are no `Deferred` rows at this level:
**every one of the 115 requirements is released and traced.** The 17 group
headings and their 95 leaves are all present.

The four POC requirements the approved decision set requires to be traced
explicitly are traced:

| POC requirement | Story | Where it is asserted |
|---|---|---|
| `FR1.3` | `US1.1`, `US6.4` | AC — registration's form and the no-assignee rule |
| `FR4.4` | `US4.1` | `AC4.1.7` — the history read's ordering |
| `FR4.5` | `US4.1` | `AC4.1.7` — the history read's ordering |
| `FR5.3` | `US5.3` | the holder directory's per-bucket breakdown |

**`FR4.4` and `NFR2.5` are traced *and* asserted.** The story set's own
review record states that these two were previously traced but unasserted,
and that both are now backed by an acceptance criterion — `AC4.1.7` and
`AC7.1.13` respectively. The traceability requirement in the approved
decision set is therefore met in the strong form: traced *and* pinned.

### Link 2 — Story to Component

All **40** stories resolve to a component. **30** are `OK` — a released
component in the catalogue. **10** are `Deferred` — each naming the exact
attachment point where the deferred capability would join.

**The ten deferred stories are the ten the Ideation phase deferred**, and
they are deferred rather than dropped: each carries its attachment point, so
the later increment has somewhere to attach. Their ids are `US8.1`–`US8.10`,
and they are the only stories with `Deferred` status anywhere in the chain.

### Link 3 — Story to Unit

All **40** stories resolve to a unit or to a recorded deferral. The **30
released stories** distribute across the six units exactly as the unit table
declares:

| Unit | Released stories |
|---|---|
| U1 `u1-foundation` | 2 (`US0.1`, `US4.2`) |
| U2 `u2-domain-vocabulary` | 5 (`US1.2`, `US3.3`, `US3.6`, `US5.1`, `US5.6`) |
| U3 `u3-write-path` | 14 |
| U4 `u4-reporting` | 2 (`US5.5`, `US5.7`) |
| U5 `u5-presentation` | 7 |
| U6 `u6-tooling-and-delivery` | 0 — recorded exclusion |

**30 released stories, 30 accounted for. None is unassigned.** U6's zero is
the recorded exclusion, not a gap: the tooling unit carries the pipeline and
the delivery configuration, and it delivers no user-visible behaviour, so it
traces to no story.

### Link 4 — Unit to Bolt

The Delivery Planning stage's seven Bolts cover all six units, and every
released story reaches a Bolt:

| Bolt | Unit(s) | Released stories |
|---|---|---|
| B1 `establish-the-toolchain` | U6 (part 1) | 0 |
| B2 `lock-the-merge-gate` | U6 (part 2) | 0 |
| B3 `define-the-domain-vocabulary` | U2 | 5 |
| B4 `rebuild-the-history` | U1 | 2 |
| B5 `write-the-lifecycle` | U3 | 14 |
| B6 `agree-on-the-counts` | U4 + U5's count surfaces | 2 + 4 |
| B7 `complete-the-surfaces` | U5 remainder | 3 |

**No released story is unmapped.** U5 is the only unit the delivery plan
splits, and the split is the count group: the four count-consuming surfaces
share one counting definition, so a surface that ships before the definition
has no consistency guarantee at all.

---

## The Defect Found, and the Correction

### The defect

**`domain-design/components.md:50` states the domain error-code vocabulary
has "exactly nine values". `contract-design/contract-summary.md` binds
exactly eight.** The two artifacts disagree about the size of a vocabulary
that the entire release's failure model depends on.

The eight the contract summary binds:

| Code | HTTP status | Retryable |
|---|---|---|
| `VALIDATION_ERROR` | 400 | No |
| `DUPLICATE_ASSET` | 409 | No |
| `NOT_FOUND` | 404 | No |
| `INVALID_TRANSITION` | 400 | No |
| `INVALID_STATE` | 400 | No |
| `ASSET_DELETE_REFUSED` | 405 | No |
| `BUSY_RETRYABLE` | 503 | **Yes** |
| `INTERNAL` | 500 | No |

### Why eight is the correct number

The count is verifiable against the codebase, and the verification is what
settles which of the two artifacts is right.

The POC's five existing codes are `VALIDATION_ERROR`, `DUPLICATE_ASSET`,
`NOT_FOUND`, `INVALID_TRANSITION` and `INVALID_STATE` — all five carried
forward, none retired. The release adds three: `ASSET_DELETE_REFUSED` (the
delete refusal), `BUSY_RETRYABLE` (the `SQLITE_BUSY` mapping, and the only
retryable code in the set), and `INTERNAL` (the boundary's terminal
fallback). Five plus three is **eight**.

A ninth code is not needed, and its absence is not an oversight:
`ASSET_DELETE_REFUSED` and `BUSY_RETRYABLE` each absorb one apparent
candidate rather than sitting beside it. A delete that violates the
append-only guarantee and a delete that targets a non-existent row are the
same refusal, not two — the former is `ASSET_DELETE_REFUSED`, and the latter
is `NOT_FOUND`, and both are already counted. `BUSY_RETRYABLE` absorbs what
would otherwise be a separate "database locked" code, because the approved
standing condition names exactly one retryable error and requires
`SQLITE_BUSY` to map to it.

**So the contract summary's eight is right, and `components.md:50`'s "nine"
is the error.**

### The correction

The correction is recorded here rather than made in place, because
`components.md` is a **bound artifact of an earlier stage's approval** — the
Domain Design stage's own review bound its bytes. Editing it would
invalidate that approval binding and require re-opening a closed stage
approval, which the workflow treats as a human decision, not an agent's.

**The correction is therefore carried forward as a Construction-phase
obligation and is stated in the delivery plan:**

- The **error vocabulary's size is fixed at eight** by the contract summary,
  and `components.md:50`'s "nine" is superseded.
- B3 `define-the-domain-vocabulary` implements **eight** codes and its
  vocabulary tests assert the count is exactly eight.
- B4 `rebuild-the-history` and B5 `write-the-lifecycle` raise only codes from
  the eight-code set, and no code from the set goes unraised on a path that
  needs it — in particular `INVALID_STATE` and `ASSET_DELETE_REFUSED` are
  both raised, which is what the eighth code exists for.

**The functional consequence of leaving it uncorrected would have been a
test asserting the wrong number.** A test written from `components.md` would
assert nine codes exist; the implementation would produce eight; the test
would fail, and the fix a developer reaches for under pressure is to invent a
ninth code. That is the failure mode this correction exists to prevent: a
phantom code with no requirement behind it, introduced to satisfy a
mis-stated count.

### The scope of the correction

This is a **count** defect in one line of one artifact. It is not a
behavioural disagreement, and it does not change:

- the eight codes' identities, HTTP statuses or retryable flags,
- which component raises which code,
- the approved standing condition that `SQLITE_BUSY` maps to a retryable
  error,
- the rule that every code in the vocabulary must be mapped in the error
  middleware,
- any unit, any contract, any Bolt, or any story.

The rest of the phase boundary is clean.

---

## What Was Checked and Found Clean

| Check | Result |
|---|---|
| Every coverage row's id is registered in `upstream_ids` | Clean — all three files |
| Every registered id has a coverage row | Clean — all three files |
| No duplicate ids within a file | Clean — all three files |
| domain-design and units-generation agree on id set and deferral set | Clean — identical 40 ids, identical 10 `Deferred` |
| Every released requirement reaches a story | Clean — 115 of 115 |
| The four POC requirements are traced | Clean — `FR1.3`, `FR4.4`, `FR4.5`, `FR5.3` |
| Traced POC requirements are also asserted | Clean — `AC4.1.7`, `AC7.1.13` |
| Every story reaches a component or a recorded deferral | Clean — 30 `OK`, 10 `Deferred` with attachment points |
| Every released story reaches a unit | Clean — 30 of 30 |
| Every released story reaches a Bolt | Clean — 30 of 30 |
| The deferred stories are the approved deferrals | Clean — `US8.1`–`US8.10` |
| The count-consuming surfaces ship as one group | Clean — one Bolt, B6 |
| The foundation precedes every capability | Clean — B4 gates B5, B6, B7 |
| The error-vocabulary size agrees across artifacts | **Defect corrected above** |

---

## The Standing Facts the Phase Boundary Preserves

These are the properties the Inception phase holds true at its boundary, and
each is verified above rather than asserted:

1. **Every approved requirement reaches a story, a component, a unit and a
   Bolt.** The chain has no break in it, and no requirement is dropped
   between the approval and the plan.
2. **The ten deferred capabilities are deferred, not lost.** Each names its
   attachment point.
3. **The four count-consuming surfaces ship together.** Splitting them
   ships the exact defect they exist to remove.
4. **The foundation precedes every capability**, and the actor-identity
   answer precedes the foundation — the one hard external block in the
   release.
5. **The approved decision set is not reopened.** The corrected error-vocabulary
   count is a reading of the approved artifacts, not a change to them.

---

## Verdict

**PASS WITH ONE CORRECTED DEFECT.**

The Inception phase's traceability chain is complete and internally
consistent across all three of its traceability records, and it reaches the
Delivery Planning plan with no unreleased requirement, no unassigned story
and no unmapped unit.

One defect was found: the domain error-code vocabulary's size is stated as
nine in `components.md:50` and as eight in `contract-summary.md`. The
contract summary's eight is verified correct against the codebase's five
existing codes plus the release's three additions. The correction is carried
forward as a Construction-phase obligation with an explicit implementation
instruction and an explicit consequence, rather than being applied as an
in-place edit to a stage-approved artifact.

**The phase boundary is passed.** The release the Inception phase has
designed is the release the Ideation phase approved.

---

## Sources Consumed

- `aidlc/spaces/default/intents/261106-asset-tracker-mvp/inception/user-stories/traceability.json`
- `aidlc/spaces/default/intents/261106-asset-tracker-mvp/inception/domain-design/traceability.json`
- `aidlc/spaces/default/intents/261106-asset-tracker-mvp/inception/units-generation/traceability.json`
- `aidlc/spaces/default/intents/261106-asset-tracker-mvp/inception/domain-design/components.md`
- `aidlc/spaces/default/intents/261106-asset-tracker-mvp/inception/contract-design/contract-summary.md`
- `aidlc/spaces/default/intents/261106-asset-tracker-mvp/inception/delivery-planning/bolt-plan.md`
- `aidlc/spaces/default/intents/261106-asset-tracker-mvp/ideation/approval-handoff/decision-log.md`
- `aidlc/spaces/default/memory/project.md` — the binding product-behaviour
  contracts, including the `err.code` assertion discipline and the
  `SQLITE_BUSY` standing condition.
