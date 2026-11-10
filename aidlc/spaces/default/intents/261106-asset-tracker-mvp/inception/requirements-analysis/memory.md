<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is kept up to date automatically while the stage runs. Add observations at the review step, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
2026-11-09 — A requirement that says "retain" and one that says "record" are different requirements, and only one of them is implementable on the transition where the value is first created. FR3.6 and FR3.9 originally said the `mark-lost` and `discard` transitions "retain" the preserved previous holder, which presupposed the field was already populated — but on `assigned` → `lost` and `assigned` → `discarded` the prior holder is *first* recorded there. Both requirements were rewritten to state the write of the departing current holder into the preserved previous-holder field, with a pass/fail that names the case where the field was previously empty. A requirement about a field's end state must say whether the transition writes it.

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
2026-11-09 — The release retires two POC requirements, not one: FR4.5 (`lost` is terminal) and the `assigned-to` half of FR1.2. The first pass of the traceability table recorded only FR4.5 and claimed no other POC requirement was retired, which contradicted FR10.7's removal of the registration-time assignee field. A traceability table that asserts completeness must be checked against the whole requirement set, not against the four named targets.
