<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is kept up to date automatically while the stage runs. Add observations at the review step, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-11-11T19:19:01Z — Read a leaf-library NFR design as module layout + pure helpers rather than middleware: dual-cut INTERNAL, mapDriverCode on ErrorTranslation, BACKFILL_ACTOR predicate, two modules one package, blast radius = wrong shared constant.
- 2026-11-11T19:19:01Z — Resolved Q2 helper vs Q5 two-component inventory by placing mapDriverCode on ErrorTranslation rather than inventing a third adapter component.
- 2026-11-12T08:44:00Z — Packaging NFR design: shared scripts/secret-scan.sh as Lefthook+CI merge authority; smoke script + dated retain-3 backups; smoke-fail forbids forward migrate repair.

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
