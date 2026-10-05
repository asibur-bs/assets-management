# Intent Capture Questions

## Sources

- [desc] Initial description: "[Project description]"
- [scope] Workflow-selected scope: `poc`.
- [memory:M1] `aidlc/spaces/default/memory/org.md#Way of Working`: "We use **trunk-based development**. All work merges to `main` via short-lived feature branches (typically resolved within 1-2 days)."
- [memory:M2] `aidlc/spaces/default/memory/org.md#Testing Posture`: "We treat tests as a first-class deliverable in every Bolt. The specific methodology (TDD, BDD, ATDD, or classic test-after) is affirmed at practices-discovery and recorded in `team.md` under this heading with explicit `Methodology` and `Ordering` fields."
- [memory:M3] `aidlc/spaces/default/memory/org.md#Code Style`: "We defer to project-level configurations: Formatter: Prettier (JS/TS), Black (Python), `gofmt` (Go), or language-default."
- [memory:M4] `aidlc/spaces/default/memory/org.md#Deployment`: "We **deploy on merge** to staging environments. Production deploys gate on a separate manual approval."

## Q1. What business problem are you solving?

A. Internal tool to track and manage company assets (hardware, software licenses, etc.)
B. Customer-facing product that helps end users organize or value their personal assets
C. Proof of concept / learning exercise to try out a specific technology or pattern
D. Replace or augment an existing system that is failing or hard to maintain
E. Not yet defined
X. Other (please specify)

[Answer]: A

## Q2. Who is the primary customer or user of this system?

A. Internal employees only (HR, IT, Finance, Operations)
B. External end users (consumers or paying customers)
C. Both internal and external users
D. Developers / engineers using this as a building block or API
E. Not yet defined
X. Other (please specify)

[Answer]: A

## Q3. What is the main pain or frustration you (or your users) experience today?

A. No system exists — work is done in spreadsheets, email, or paper
B. Existing system is slow, unreliable, or hard to use
C. Data is scattered across multiple tools and hard to find
D. Manual workarounds eat up time that should be automated
E. Not yet defined
X. Other (please specify)

[Answer]: A

## Q4. What does success look like? How will you know it worked?

A. Users can complete a specific task in under X minutes/clicks
B. A measurable reduction in support tickets or manual errors
C. The system runs without constant manual intervention for a defined period
D. A working demo or prototype that proves the concept to stakeholders
E. Not yet defined
X. Other (please specify)

[Answer]: A

## Q5. What is the trigger for doing this now?

A. New market opportunity or customer demand
B. Existing system is failing or becoming a blocker
C. Regulatory, compliance, or audit pressure
D. Learning / upskilling goal (try a new tech or pattern)
E. Not yet defined
X. Other (please specify)

[Answer]: A

## Q6. Who are the key stakeholders, and what does each one care about?

A. You (the developer) — wants a working solution and to learn
B. A manager or product owner — wants it on time, on budget, and to spec
C. End users — want it to solve their problem and be easy to use
D. Other technical team — wants clean code, tests, and good docs
E. Not yet defined
X. Other (please specify)

[Answer]: A

## Q7. Who decides the scope and priority, and who can influence those decisions?

A. I decide — this is a solo project
B. My manager / product owner decides
C. The end users / customers decide through feedback
D. A small team decides together
E. Not yet defined
X. Other (please specify)

[Answer]: A

## Q8. Are there any communication or reporting requirements (standups, demos, status updates)?

A. No — fully self-directed, no reporting required
B. Weekly informal update to one person
C. Regular standup or demo with a small group
D. Formal reporting (status docs, metrics dashboards)
E. Not yet defined
X. Other (please specify)

[Answer]: A

## Q9. The workflow was started with the `poc` scope (a minimal 7-stage run focused on Intent Capture, Requirements Analysis, Code Generation, and Build & Test). Does that match the boundary of what you want to build?

A. Yes — keep `poc`; build a small, end-to-end proof that the core idea works
B. Change to `mvp` — slightly larger scope, still focused on shipping something usable
C. Change to `feature` — full process coverage for a single feature
D. Change to `express` — even leaner, 10 stages, no ceremony
E. Not yet defined
X. Other (please specify)

[Answer]: A

## Q10. What kind of system are you imagining, technically? (purely for Intent Capture framing — detailed tech choices come in Code Generation)

A. Web application (browser-based UI)
B. Backend API or service only (no UI yet)
C. Command-line tool or script
D. Desktop or mobile application
E. Not yet defined
X. Other (please specify)

[Answer]: A

## Consolidated Summary Confirmation

- Looks correct
- Request changes

[Answer]: Looks correct
