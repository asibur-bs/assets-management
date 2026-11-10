<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is kept up to date automatically while the stage runs. Add observations at the review step, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
- 2026-11-06T13:10:00Z — The stage's own condition says to skip market research for internal tools, and this MVP is an internal IT tool. The scope was changed from `mvp` to `feature` at the human's direction with "no stage skipped", and the intent-capture Q8 answer explicitly requires the operation phase; `aidlc-state.md` records "Stages to Skip: none" and 33 total stages. The stage was therefore run rather than skipped, and skipping it would have required a new human approval round the human had already pre-emptively declined. The stage's framing was adjusted to an internal-tool build-vs-buy landscape instead of an external revenue market, which is what its own topic list asks for ("For internal initiatives: are there existing tools, SaaS products, or open-source alternatives?").

- 2026-11-06T13:22:00Z — The `upstream-coverage` sensor fires per file but judges at stage level: it reads the union of the stage's deliverables, so a slug cited in any one deliverable covers the stage. It failed here because none of the three deliverables carried the literal slug `intent-statement` — the artifacts cited the intent statement's *content* through `[Q1]`–`[Q8]` answer tags and upstream file paths, but the sensor matches the bare slug anchored against word and hyphen characters, and a path segment ending `intent-statement.md` does not satisfy that anchor. The fix was to name the upstream artifact explicitly in each deliverable's scope section, which is also the substantively correct citation.

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
- 2026-11-06T13:10:00Z — The mechanism by which a trusted actor identity is established remains unsettled. It is inherited from intent-capture, where it was recorded as an open question, and the Audit Completeness metric depends on it. Market research does not settle it, but it does sharpen it: the actor-trust rule is one of the differentiator properties that make the Build position hold, so if the mechanism turns out to require an enterprise identity system, that is an implementation choice inside the approved rule rather than a scope change.

- 2026-11-06T13:22:00Z — The internal existing-tool inventory that the evidence standard requires (Q8, answer C) has not been gathered. Until it is, the competitive set is partially characterised: no claim that "no existing system already covers this" can be supported, and the off-the-shelf product characterisations remain hypotheses. The pricing comparison in the build-vs-buy calculus is indeterminate for the same reason — no licence has been quoted.
