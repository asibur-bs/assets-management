<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is kept up to date automatically while the stage runs. Add observations at the review step, not by editing here directly.

## Interpretations

2026-11-09 — The `practices-promote` tool copies only five fixed sections — `## Way of Working`, `## Walking Skeleton`, `## Testing Posture`, `## Deployment`, `## Code Style` — from `team-practices.md` into `team.md`, and any other section (a `## Security` section, for instance) is silently dropped with no error and no audit entry. A stage that writes a sixth section therefore believes it has recorded a practice that no reader will ever see.
2026-11-09 — `practices-promote` has no bucket-splitting logic: every line under `## Mandated` and `## Forbidden` in `discovered-rules.md` is appended to `project.md`, and every one of the five team sections is appended to `team.md`. The bucket a rule is read into is decided by which file it is written to, not by any marker inside the rule. The question that asks 'team or project?' therefore has to be answered by writing two files, not by tagging two kinds of rule in one.
2026-11-09 — A stage's declared deliverables are a fixed set, so a required element with no declared home has to be a section of a declared deliverable rather than a fifth file. The security practices were therefore duplicated into `## Code Style` and `## Deployment`, the two sections that survive promotion, with the `## Security` section marked in-file as a reading convenience.
2026-11-09 — `parseRules` splits each bucket on newlines and drops only blank lines, `<!--` comments and `#` lines, so a wrapped rule is parsed as two malformed rules and a `---` separator is parsed as a malformed rule. Every rule in `discovered-rules.md` has to be a single line, and the rule count has to be checked against the malformed count before the file is handed to the promote tool.
2026-11-09 — An upstream claim in a draft is an assertion, not a fact. Four claims in the Practices Discovery draft were falsified by execution rather than by reading: the Prettier conformance claim (all 14 tracked files fail `prettier --check`), the trailing-comma convention, the commit count (11, not 12), and the coverage gap (93.38% measured, so the floor is already met and the work is to make it enforceable).

## Deviations

2026-11-09 — The interview ran in a file-based mode rather than the structured interactive one. The human interrupted the first interactive batch and asked for a submit path, so all 22 questions were written to `practices-discovery-questions.md` with their lettered options and a blank `[Answer]:` tag, re-presented in prose, and answered as 22 letters that were written into the file before the answer was logged.
2026-11-09 — The `required-sections` sensor was fired once per deliverable, four times in total, and `upstream-coverage` once against the union of the four deliverables, because the first judges at output level and the second at stage level.

## Tradeoffs

2026-11-09 — The team-practice document carries six sections and the promote tool keeps five of them, so the security practices are stated twice: once in a dedicated `## Security` section that a reader finds quickly, and once inside the two sections that actually survive promotion. The duplication is the price of the tool's fixed section list; the alternative is losing the practices entirely.
2026-11-09 — `discovered-rules.md` carries only the product-behaviour contracts and leaves the working practices in `team-practices.md`, rather than putting all 37 rules in one file. The tool cannot split buckets, so a single file would have sent every working practice to `project.md` and made the team file hollow.

## Open questions

2026-11-09 — Whether the two foreign-key design questions the Reverse Engineering scan left open — whether `DELETE FROM assets` may stay blocked once the cascade is removed, and whether `ON DELETE SET NULL` on `audit_log.asset_id` is acceptable given it relaxes the column to nullable — are decided before the migration is written. The Practices Discovery practices do not resolve them.
2026-11-09 — Whether a trusted authentication mechanism exists anywhere in the organisation (I-01 / I-03) is still the blocking dependency on the actor-identity decision, and the actor-trust rule is recorded without naming a mechanism.
