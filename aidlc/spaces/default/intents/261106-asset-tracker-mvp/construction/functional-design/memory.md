<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is kept up to date automatically while the stage runs. Add observations at the review step, not by editing here directly.

## Interpretations
- 2026-11-11 — a legal transition is the success path of the legality check, and the refusal runs only when the edge is illegal; stating the refusal as the next numbered step made every released edge a refusal.
- 2026-11-11 — the serial fold is one result both tiers implement for every character: ASCII letters become lowercase and every other character, including a non-ASCII letter, stays unchanged. A permitted disagreement is a second definition.
- 2026-11-11 — membership of the retirement-reason set is not the set a retirement accepts. The retirement-specific values are their own set; a retirement accepts that set union the general loss reasons.
- 2026-11-11 — the traceability sensor resolves upstream ids from the authored story artifact, so a unit's coverage table must list every acceptance criterion of the unit's stories, not only the requirement ids; the acceptance criteria are the unit's direct upstream and the requirement ids are one hop further back.
- 2026-11-11 — the traceability sensor derives orphans from `rules.md` and fails closed on a missing `reverse[]` entry, so a rule that only appears as commentary in the specification is an orphan; every rule that carries a decision must exist as a rule with its own reverse entry.
- 2026-11-11 — a domain vocabulary's size is a decision, not a description: the error vocabulary's count of eight had to be written as a rule with its own pass/fail so the vocabulary tests can assert the count rather than the set's contents alone.
- 2026-11-11 — the two deferred transition edges are specified as absent rather than as absent-and-refused in the state machine, because a mermaid diagram cannot draw a non-edge; the refusal is carried by the rule and by the edge table, and the diagram's absence is not the specification of it.

## Deviations
- 2026-11-11 — the stage's `linter` and `type-check` sensors were fired and reported `eslint-unavailable` and `no-tsconfig-found`; the project is a JavaScript application with no ESLint harness and no TypeScript, so neither sensor applies to a documentation-stage deliverable and no code was linted or type-checked.

## Tradeoffs
- 2026-11-11 — the acceptance criteria were mapped to the rules that satisfy them rather than to the requirement ids that the rules themselves cite, so the table reads in the direction the reader asks a question in; the cost is that the coverage table is longer than the requirement set it covers.

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
