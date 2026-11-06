<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is kept up to date automatically while the stage runs. Add observations at the review step, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-11-05T13:55:00Z — A stage that replays after a backward jump must re-execute its own commands rather than reuse the previous run's results. The artifact-reuse decision for the replayed build-and-test stage is "Modify", not "Keep", because the loop-back repair changed the source under test: the suite grew from 65 to 66 tests, and T-FR3.3's verdict changed from Not Met to Met. Keeping the old results would have reported a defect that no longer exists.
- 2026-11-05T13:55:00Z — The `## Loop-Back Log` and the failure-ladder analysis are the one part of a failed run's artifact that must survive a replay verbatim. They are the diagnostic record that justifies the repair, so a re-run appends a resolution entry under the existing loop-back heading rather than replacing the section.

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- 2026-11-05T13:55:00Z — The first run's target tally was wrong: it reported "36 applicable targets". 36 is the number of upstream ids in `traceability.json`, which includes the `FR1`–`FR5` group headings. The inventory's own "Applicable / Non-Applicable Determination" section states 31 leaf targets (24 FR + 7 NFR), all applicable, and the matrix carries exactly 31 rows. The replay corrected the tally to 31 and recorded the correction explicitly rather than silently restating it.
- 2026-11-05T13:55:00Z — Verifying a repair is not the same as verifying the code. The replay re-ran the whole build and test suite, the live per-state HTTP probe, and the live end-to-end smoke — and additionally reconstructed the pre-repair template branch in a throwaway copy of the project to confirm the new regression test genuinely fails against it. The mutation check is what distinguishes a test that pins the defect from one that passes regardless of implementation.

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
- 2026-11-05T13:55:00Z — Chose to leave the two Minor documentation findings in `unit-test-instructions.md` uncorrected rather than re-open Plan Approval for a third round. That file is byte-bound by the code-generation approval fingerprint, so a two-line edit to a stale test count would invalidate the approval binding and cost another full approval round for a change with no effect on any command, threshold, or runtime behaviour. The authoritative counts live in `test-results.md` and `code-summary.md`.

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
- 2026-11-05T13:55:00Z — FR5.3 (full audit log exposed in the UI) remains `Not Met (deferred by design)`. Code Generation deferred it and this scope requires no full audit-log UI. It is surfaced at this stage's approval gate for the human to accept as a deliberate deferral or to schedule the work; it is not a regression and it does not fire the failure predicate.
