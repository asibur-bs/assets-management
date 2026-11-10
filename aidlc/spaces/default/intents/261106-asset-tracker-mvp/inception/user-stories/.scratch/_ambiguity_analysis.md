# Ambiguity Analysis — User Stories (Step 6)

**Stage**: user-stories (inception)
**Intent**: 261106-asset-tracker-mvp
**Date**: 2026-11-09

## 1. Vague-language scan

Every one of the seven recorded answers was scanned for the marker phrases
"mix of", "not sure", "depends", "probably", and their relatives.

**Result: no vague answers.** All seven answers name a specific option letter
and a specific option text. The two occurrences of the word "depends" in the
questions file are ordinary prose — one in the INVEST definition of
*Independent*, one in an option describing a deferral — and neither is in an
answer.

## 2. Contradiction check

Each answer was cross-checked against the upstream artifacts it constrains.

| Answer | Cross-checked against | Result |
|---|---|---|
| Q1 — two personas | Intent Capture Q2 ("A. Internal IT asset administrators"); requirements.md `### Target customer` (names two parties) | **Consistent.** Intent Capture fixed the *primary* customer; the requirements widened the target to two parties. Two personas resolve the difference without reopening either decision. |
| Q2 — a holder is never a persona | FR5.3 (holder is a display name, not an identity); FR8.4 (no holder detail page); the actor-trust standing condition | **Consistent, and it removes a live hazard.** Framing a holder as a persona would have implied an account, contradicting FR5.3 and FR8.4. |
| Q3 — hybrid by capability area | FR6.8 (the four count-consuming surfaces are one indivisible group); the recorded scope learning that a shared definition with no consumers leaves the counts disagreeing | **Consistent.** FR6.8 makes the four surfaces indivisible; a persona split would have separated the dashboard from the directory. |
| Q4 — one story per lifecycle family, plus separate stories for the reason vocabulary and for the audit behaviour | FR3.2 (exactly eight released edges, and *no other edge shall be legal*); FR3.3 (every transition has explicit validation and explicit audit behaviour); FR3.12 (the seven-value action vocabulary, with `mark-lost` serving all three loss edges) | **Consistent.** The families partition the eight edges; the two shared-rule stories carry FR3.6a/FR3.8/FR3.10 (reasons) and FR3.3/FR3.12/FR2.8 (audit behaviour) once each. FR3.2's "no other edge shall be legal" is a property of the transition table, and it is asserted by the lifecycle-family stories' acceptance criteria rather than by a separate per-edge story set. |
| Q5 — the actor rule stated once, asserted per write | FR2.1, FR2.2, FR2.3, NFR2.1; the actor-trust standing condition | **Consistent.** One cross-cutting story carries the rule; each write story's own acceptance criteria assert that its own audit entry carries an actor. |
| Q6 — deferred capabilities recorded as Won't Have with their standing intact | `## Out of Scope` → "Deferred to a later increment (not rejected)"; the scope document's deferral discipline | **Consistent.** Recording them as Won't Have with a named deferred capability preserves the approved standing and keeps the two kinds of exclusion distinguishable. |
| Q7 — the rule alone is sufficient; the mechanism is left to Domain Design | FR2.2's own note ("This requirement is a constraint on any mechanism the team may later choose; it does not choose the mechanism"); open items I-01 / I-03; NFR2.5 (conditional on the mechanism) | **Consistent.** The stories assert the rule; NFR2.5's conditional clause means no story may assert a credential. |

**No contradictions found between answers.** No answer contradicts the
requirements, the scope document, the wireframes, or the approved decision
set.

## 3. Missing details

Three details the generation step needs are **not** missing — each is already
settled upstream and is carried into the stories rather than re-asked:

1. **The eight released transition edges.** FR3.2 states them exactly. The
   lifecycle families are partitioned from FR3.2, not invented.
2. **The five buckets and the count arithmetic.** FR3.1, FR6.2, FR6.3, FR6.7
   and FR7.2 state them exactly.
3. **The seven accessibility commitments.** FR11.1 enumerates them, and
   FR11.3 fixes the WCAG 2.1 Level AA floor.

One detail the generation step needs is genuinely **not** settled upstream,
and it is handled by the answers rather than by a new question: the split of
the lifecycle edges into families. The answers supply the grouping rule
(families plus two shared-rule stories), and FR3.2 supplies the edges
themselves.

## 4. Conclusion

**No follow-up questions are required.** The seven answers are specific, mutually
consistent, and consistent with every upstream artifact. The plan proceeds to
Step 7 and PART 2.

One residual item is carried forward as a **narrative constraint on
generation**, not as an open question: because a holder is never a persona,
no story may be written in the voice of a person whose name appears on an
asset. The "what does Dana hold?" journey is served by the asset owner or
requester persona asking on someone's behalf. This is recorded here so the
constraint is visible to the mob participants, who are dispatched with the
plan.
