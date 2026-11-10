# Practices Discovery — Interview Questions

Stage: `practices-discovery` (Inception, 2.2)
Intent: `261106-asset-tracker-mvp` — Asset Tracker MVP
Space: `default` · Scope: `feature` · Depth: `Standard`

This file is the authoritative record of the team's practice decisions. Every
question below exists because the verified repository baseline, the six
reverse-engineering artifacts, and the three independent support reviews could
not settle it. Where the evidence already settles a matter, it is stated in the
draft and confirmed by reading the artifacts — it is not re-asked here.

Read with:
- `team-practices.md` — the draft the interview is affirming or correcting
- `evidence.md` — what was inspected, and what remains uncertain
- `contributions/aidlc-quality-agent.md`, `contributions/aidlc-developer-agent.md`,
  `contributions/aidlc-devsecops-agent.md` — the three blind reviews

---

## Q1 — Way of Working: the trunk branch name

The repository's only branch is `master`. Our organisation-wide default names
the trunk `main`. Keeping `master` changes nothing about how work flows; it
only changes the name that every document and script has to use.

- A. Keep `master` as the trunk name and use it everywhere
- B. Rename the trunk to `main` before the MVP work starts
- C. Other (please specify)

[Answer]: B

---

## Q2 — Way of Working: how a piece of work lands on the trunk

The history has no merge commits, so it does not tell us what you would prefer
now. The difference matters because a squash makes each delivered body of work
one commit, which keeps the trunk's history readable as a list of deliveries.

- A. Squash-merge feature branches, one commit per delivered body of work
- B. Fast-forward merge, keeping every intermediate commit visible on the trunk
- C. True merge commit, keeping the branch's history as a second parent
- D. Other (please specify)

[Answer]: A

---

## Q3 — Way of Working: how a change is chunked into commits

The MVP's riskiest change is a two-table rebuild whose wrong order silently
destroys every audit row while the transaction commits and no error is raised.
The safe version of that change is one indivisible piece of work: the schema
change and the test that proves history survived it belong in the same commit.

- A. A change that alters behaviour and its proof land together in one commit; never split them
- B. Keep commits small and general; the proof may land in a later commit
- C. Other (please specify)

[Answer]: A

---

## Q4 — Walking Skeleton: building a thin end-to-end slice first

Should we build a thin end-to-end slice first? A walking skeleton is a minimal
version that runs the whole way through, built first to prove the pieces
connect before the real features go in.

Our scope does not ask for one, and we already have a working end-to-end system
with a closed state machine and a passing 66-test suite. What is missing is the
foundation underneath the MVP: the audit table rebuild, the widened status
check, the previous-holder column, and the case-insensitive serial index.

- A. No skeleton — build the foundation workstream first and verify it end to end
- B. Yes — build a minimal end-to-end slice first, before the foundation workstream
- C. Other (please specify)

[Answer]: A

---

## Q5 — Testing Posture: the testing method

Our default is to write the code, then write and run that layer's tests. Two
places in this release argue for reversing that: the concurrency-safe
duplicate check, where the defect is a race that a test written afterwards will
not reliably reproduce, and the table rebuild, where the defect is silent
history loss with the transaction committed.

- A. Keep `test-after` as the method, but write the tests first for the duplicate check and the table rebuild
- B. Use `custom` — a named method that mixes both orders deliberately
- C. Use `test-after` throughout, including those two places
- D. Other (please specify)

[Answer]: A

---

## Q6 — Testing Posture: where the 80% coverage floor applies

We measured the current whole-project line coverage at **93.38%**, so the
80% floor is already met with room to spare — the work is to make it enforced,
not to reach it. The real choice is the shape of the threshold: a single
project-wide number, or a number each individual file must also meet. A
per-file rule fails today on `src/server.js`, which is the four-line process
entry point and has no test of its own.

- A. One project-wide threshold of 80% line coverage
- B. 80% per file as well as overall — `src/server.js` needs a test
- C. A project-wide threshold, with the per-file rule applied only to files under `src/`
- D. Other (please specify)

[Answer]: A

---

## Q7 — Testing Posture: where the automated checks run

The repository has no CI configuration and no remote configured, so there is
currently nowhere for a hosted pipeline to run against. Our scope expects
checks to run before merge, and today the 66-test suite is enforced only by
whoever remembers to run it.

- A. Configure a remote and a hosted pipeline in this release, before the MVP work
- B. Use a local pre-commit hook as the immediate gate now, and configure the hosted pipeline when a remote exists
- C. Both — the local hook now, the hosted pipeline before the MVP merges
- D. Other (please specify)

[Answer]: C

---

## Q8 — Testing Posture: what the migration test fixture must contain

The existing legacy-migration test builds a legacy `assets` table with no
`audit_log` table at all, which is why it could never have detected the
cascade that destroys audit history. Any future migration test that copies that
fixture shape inherits the same blind spot.

- A. A migration test must run against a database populated with audit history, and assert the history survives
- B. Leave the fixture as it is and rely on the manual deploy smoke test
- C. Other (please specify)

[Answer]: A

---

## Q9 — Testing Posture: how far the requirement-traceability convention reaches

The suite marks each test with the requirement it covers, using short tags in
the test name. Today those tags cover 13 distinct requirement identifiers. The
MVP's requirement set is considerably larger, and marking every new test with
its identifier is extra work that has to be budgeted somewhere.

- A. Every new test carries its requirement identifier, same as today
- B. Only tests for the MVP's approved requirements carry identifiers; the rest are free
- C. Other (please specify)

[Answer]: A

---

## Q10 — Deployment: when the sign-off is required

The organisation-wide default gates production deploys on a separate manual
approval. There is one environment here — the single internal host — and a
schema change to it is the only kind of deploy that can lose data.

- A. Sign-off is required for every deploy to the host
- B. Sign-off is required only for deploys that carry a schema migration
- C. Other (please specify)

[Answer]: A

---

## Q11 — Deployment: what the backup must capture

The database runs in WAL mode, so committed rows can still be sitting in a
sidecar file next to the main database. Copying only the main file while the
process is running can capture an incomplete snapshot — exactly the case the
backup exists to cover.

- A. The backup stops the process, or uses the database's own backup mechanism, so no committed row is missed
- B. Copying the main database file is sufficient for our purposes
- C. Other (please specify)

[Answer]: A

---

## Q12 — Deployment: the sign-off role

The approved team shape has three review points — a design checkpoint before
the foundation work, a demonstration of the custody audit, and the operational
readiness review — with reviewers who are not the author.

- A. The product owner signs off on a schema-carrying deploy
- B. The product owner and the reviewer who must demonstrate custody both sign off
- C. Other (please specify)

[Answer]: A

---

## Q13 — Code Style: the formatter's line width

The existing code is hand-formatted at roughly 120 columns. The formatter's own
default is 80, so adopting it with defaults would re-wrap about 120 lines
across the 14 tracked files. Widening the limit to match the code that is
already there keeps the adoption a configuration change.

- A. Set the formatter to 120 columns to match the existing code
- B. Use the formatter's default 80 columns and accept the re-wrap
- C. Other (please specify)

[Answer]: A

---

## Q14 — Code Style: how strict the linter should be

We tried the linter's recommended rule set against the application code and it
passes cleanly. Against the test files it flags exactly one rule, in 13
places, and that can be handled by a configuration exception scoped to tests
rather than by changing the tests.

- A. Use the recommended rule set, with one documented exception for test files
- B. Use a smaller starting rule set with an explicit list of what is switched off
- C. Other (please specify)

[Answer]: A

---

## Q15 — Code Style: when the formatter and linter configuration lands

A formatting-only change is far easier to read on its own than the same change
mixed in with a table rebuild.

- A. As its own first commit, before any MVP work
- B. Alongside the first MVP feature commit
- C. Other (please specify)

[Answer]: A

---

## Q16 — Security: the dependency audit gate

Running the package manager's own audit against the production dependency tree
reports no vulnerabilities across 113 packages. The development toolchain
carries 3 critical and 1 high advisory. The audit is a free check that needs no
extra tooling.

- A. Run the production-dependency audit as a blocking check; triage the development-toolchain advisories as a separate follow-up
- B. Run the audit including development dependencies, and fix the toolchain advisories before the MVP merges
- C. Other (please specify)

[Answer]: A

---

## Q17 — Security: making audit history genuinely append-only

We confirmed by running it that an audit row can currently be edited or
deleted by any statement that reaches the database. Append-only is currently a
convention, and a convention one line of code can break. Two database triggers
make it a guarantee, and they also block the cascade that would otherwise
destroy audit history.

- A. Enforce append-only with database triggers, so it does not depend on application code
- B. Keep append-only as an application-level convention and enforce it in tests
- C. Other (please specify)

[Answer]: A

---

## Q18 — Security: the shared escaping rules for the new surfaces

The new export and the three new screens all render values we do not control.
Two rules already exist informally — every value in a query goes through a
placeholder, and every value in a template is escaped. The export also needs
its own protection against spreadsheet formulas being interpreted as commands.

- A. Make both rules mandatory and named, plus one shared export-escaping function applied to every cell
- B. Keep them as they are today, as conventions
- C. Other (please specify)

[Answer]: A

---

## Q19 — Security: how much security tooling to adopt

This is a twelve-file application with one author, no remote, and no container
or infrastructure-as-code. A large security toolchain would cost more than it
protects here.

- A. Adopt the small set that fits this project: the production-dependency audit, a dependency-free secret scan before each commit, and the linter's security rules
- B. Adopt a fuller set: the above plus dedicated static analysis, dynamic scanning, and container and infrastructure scanning
- C. Adopt none for now; revisit when the project has a remote and a deployed pipeline
- D. Other (please specify)

[Answer]: A

---

## Q20 — Security: the trust boundary for who the actor is

The approved decisions fix the rule: who performed a change is resolved from
trusted server-side context, never from anything the caller supplies in the
request. The mechanism that will provide that context is still an open
decision with four candidates, so the practice can constrain the outcome
without choosing the mechanism.

- A. State the rule as: a request-supplied actor is ignored, and no client-settable field or header may be the actor's source — whatever mechanism is chosen
- B. Leave the rule out of the practices until the mechanism is chosen
- C. Other (please specify)

[Answer]: A

---

## Q21 — Practices scope: which rules belong to the team and which to this project only

Some of the confirmed rules are contracts about how this particular product
must behave (the shared uniqueness definition, the shared counting definition,
the required regression tests), and others are about how this team works
everywhere (the tooling choices, the commit chunking rule, the linter and
formatter configuration). The first kind belong to this project; the second
kind belong to the team.

- A. Put the product-behaviour contracts in the project file and the working practices in the team file
- B. Put everything in the team file
- C. Put everything in the project file
- D. Other (please specify)

[Answer]: A

---

## Q22 — Practices scope: the tooling configuration as its own commit

There is no formatter or linter configuration in the repository today, so
adopting the organisation's named defaults is new work to build, not an
existing standard to enforce.

- A. Estimate it as part of this release's delivery work
- B. Defer it to a later increment; this release adds no linter or formatter
- C. Other (please specify)

[Answer]: A

---

## Consolidated Summary Confirmation

Does this all look correct before I generate the artifact?

- Looks correct
- Request changes

[Answer]: Looks correct
