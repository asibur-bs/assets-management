# Technology Stack Decisions — Domain Vocabulary and Error Contract (`u2-domain-vocabulary`)

**Stage**: nfr-requirements (construction)
**Intent**: 261106-asset-tracker-mvp
**Space**: default
**Scope**: feature
**Unit**: `u2-domain-vocabulary` — Domain Vocabulary and Error Contract
**Unit kind**: `library`

This file records the technology selections that bind the
`u2-domain-vocabulary` unit, and the reasoning for each. A decision that
belongs to the release as a whole is named here as **inherited**, with its
owner, and is not re-decided. A decision this unit makes is marked
**unit-local** and is the unit's to own.

**The frame.** This unit is a **leaf library**. It has no standalone runtime,
no process of its own, no HTTP surface, no database handle and no persisted
state. It is imported in place by every other unit in one process. Its entire
technology surface is therefore three questions: what language it is written
in, what it is allowed to depend on, and what shape its exported interface
takes.

---

## The Decisions

### D-TS-01 — The unit is written in JavaScript, CommonJS

**Decision.** The unit is written in plain JavaScript using CommonJS
(`require` / `module.exports`), matching the rest of the repository.

**Category.** Inherited from the release.

**Rationale.** The `technology-stack` artifact records the repository as
CommonJS throughout — `"type": "commonjs"` in `package.json`, every source
file using `require`, no `import` or `export` anywhere in `src/` or `tests/`.
The `unit-of-work` artifact records that the unit is executable code rather
than a specification, on the grounds that "a contract it cannot enforce is a
comment". A specification artifact would have been language-neutral; an
executable library is not, and choosing a different language for one leaf
would mean either a second toolchain or a build step the release does not
have.

**Alternatives rejected.**

| Alternative | Why rejected |
|---|---|
| TypeScript, compiled to JavaScript | The repository has no TypeScript, no `tsconfig.json`, no type definitions, and no build step. `vitest.config.js:10` sets `globals: true` specifically because Vitest 2.x rejects `describe`/`it`/`expect` globals under CommonJS — adding a compile step would put that interaction at risk in the same release that adds a schema rebuild. The `code-quality-assessment` artifact records the type checker as absent; adding one is new capability work, and it is the tooling unit's to schedule, not this unit's to smuggle in. |
| JSDoc type annotations only | A reasonable middle path, but it adds a maintenance surface without adding the runtime enforcement that is the unit's reason for existing. The closed sets are enforced by the code's own structure — a frozen object, a `Set`, a `Map` — not by annotations. |
| A schema-validation library (e.g. `ajv`, `zod`) | It would add a third-party dependency to the one layer whose dependency closure is empty, and it would validate *at runtime* what the release wants to validate *at compile time* by the vocabulary being closed. The devsecops review's supply-chain position is that the production closure is what ships; this unit's contribution to it should be zero. |

---

### D-TS-02 — The unit's dependency closure is Node built-ins only, and empty

**Decision.** The unit depends on nothing but Node built-ins. It imports
nothing from `services/`, `repositories/`, `routes/`, `db/`, or any
third-party package, and it holds no credential, no token and no session
signing key.

**Category.** Unit-local, and a hard constraint.

**Rationale.** Three independent arguments converge on the same answer.

*The leaf property.* The `unit-of-work` artifact makes this unit the layer
every other component must agree with, and constrains it to depend on nothing
but Node built-ins. The `team.md` Code Style rules make the domain layer a
new leaf that "depends on nothing but `node:` built-ins, and every other
layer may import it. It must not import from `services/`, `repositories/`,
`routes/`, or `db/`." A unit that imported upward would create a cycle, and
the `code-structure` artifact records the repository's property as strictly
downward dependencies with no cycles.

*The zero-closure security property.* A leaf with an empty third-party closure
has no supply-chain surface at all. The devsecops review records the
production closure as 113 packages with zero vulnerabilities at the `high`
severity level, and the principle behind the `--omit=dev` flag — the
production closure is what ships. This unit's contribution to that closure
should be nothing.

*What the unit actually needs.* The unit's entire content is fixed sets, one
ordered two-step normalisation, one derivation, one total lookup, and one
filter definition. Every one of those is expressible with `Object.freeze`, a
`Set`, a `Map`, and a function. The three Node built-ins the codebase already
uses are `node:crypto`, `node:path` and `node:fs` — **none of which this unit
needs**, because it needs no identifier generation, no path joining and no
file access. The closure is therefore not merely "Node built-ins only" but
**literally empty**.

**Alternatives rejected.**

| Alternative | Why rejected |
|---|---|
| `node:crypto` for identifier generation | The unit generates no identifiers. The asset id is generated by the repository, which is a different unit's concern. |
| A constants file generated from the vocabulary | This is the single-source boundary recorded as ADR-004 and `BR10.2`: the schema's `CHECK` text and the stylesheet's `.status-*` class names stay **literal copies**, each checked by a test. Generating them would introduce a build step the release does not have and would make a migration file and a stylesheet into build artefacts. The `unit-of-work` artifact states this boundary explicitly. |
| Importing the status set from the schema's `migrations.sql` | That would make the leaf depend on the data layer and would put SQL text inside a unit that holds no SQL. It would also invert the dependency direction that `C8` fixes. |
| A `Set` for the transition table keyed by a string | Rejected on the merits, not on principle: an edge is a pair, and a pair must be looked up as a pair. A string key would be an encoding of the pair, and an encoding is a second definition that can disagree with the pair it encodes. |

---

### D-TS-03 — The exported interface is plain data plus pure functions; there is no class, no singleton, and no mutable module state

**Decision.** The unit exports plain frozen data structures and pure
functions. It exports no class, no singleton instance, and no mutable module
state.

**Category.** Unit-local.

**Rationale.** Three properties of the release's vocabulary make this the only
shape that works.

*The vocabulary must be single-sourced and unmutable.* `BR10.1` states that
every value the unit owns is stated exactly once and that no other component
holds a copy. A mutable exported object would let any consumer write to the
vocabulary, and the second copy is what lets two definitions disagree — the
defect the whole release's counting guarantee is built to remove. A frozen
object cannot be written to.

*The values must be identical for every caller.* The `unit-of-work` artifact
states that the unit "holds no asset, no audit entry, no holder record and no
database handle. Its values are the same for every caller in the process."
That is only true of module-level frozen data. An instance with mutable state
would give each holder of the instance its own values.

*EJS cannot `require`.* The `unit-of-work` artifact records that "EJS cannot
`require` JavaScript, so the status `<option>` list and the per-status action
forms become loops over the shared vocabulary supplied by the route." The
unit's exported values must therefore be **plain serialisable data** — an
object literal, an array, a frozen `Map` or `Set` — because what reaches a
template is a render datum, not a live module. A class instance with a
prototype chain and methods does not survive that trip intact.

**The one design point worth stating precisely.** A frozen `Set` is iterable
and membership-tested, which is what the release needs. But a `Set` does not
survive `JSON.stringify` as an array, and the values that reach a template
must be render data. So the exported shape is: **an array or a plain object
for anything a template renders**, and **a `Set` or `Map` for anything that is
only looked up in code**. The unit does not need to choose one and convert at
the boundary — it exports the form each consumer needs, and a consumer that
receives a vocabulary as render data receives it as plain data.

**Alternatives rejected.**

| Alternative | Why rejected |
|---|---|
| A class with instance methods (`new DomainVocabulary()`) | Every caller would need an instance, and two instances would be two copies of the same values. The vocabulary's identity is that it is *one* set of values. |
| A singleton instance | Same objection, and it adds a module-level mutable binding, which is exactly the mutable state this decision forbids. |
| A getter function per value (`getStatuses()`) | Function-call overhead on a path the release measures, for no benefit; and it makes the values harder to reason about as data. Plain frozen data is inspectable in a debugger, printable, and directly renderable. |
| A `Proxy` over the vocabulary to intercept mutation | A `Proxy` is mutable state by another name, it hides what it protects, and it would make the exported value non-serialisable — which breaks the render-data path. |

---

### D-TS-04 — The code-to-status mapping is held by the translation component, and the vocabulary holds no HTTP concept

**Decision.** The unit's vocabulary holds the error-code set and each code's
retryable flag. The code-to-status mapping is held by the translation
component as its own content. The vocabulary holds no status.

**Category.** Unit-local, decided at this stage's Q10 and consistent with
ADR-012 and the upstream contract.

**Rationale.** This is the one place where the unit's technology surface and
its security surface are the same decision, and it is worth stating why the
separation is not merely architectural neatness.

The unit-of-work artifact constrains the domain layer to hold **no HTTP**. The
`entities.md` file's approved answer to Q10 places the status column in the
translation component, and the `rules.md` file's `BR6.5` states it. The
property that results is stronger than "the layering is tidy": **a domain
component cannot reach a status by reading the vocabulary, because the
vocabulary has none**. The leaf property holds literally rather than by
argument, and there is no path by which a status leaks upward into the domain
layer.

The upstream `contract-summary` binds the status to *this unit* rather than to
the caller — "their HTTP statuses are part of the vocabulary rather than of
the caller" — and names the translation component as the single translation
point. The decision preserves the substance of that contract in full: the
status is bound to this unit rather than to the caller, the mapping is held
once, and every code in the set is mapped so that no code reaches the client
as an unmapped internal error. The unit is bound to the **code set** and the
**retryable flag**; the status is bound to the translation component, which is
the only consumer of the code set that ever asks the question.

**The technology consequence.** The vocabulary's exported data must therefore
carry **no value that is meaningful only at the boundary**. It holds the code
set and the retryable flag, both of which are domain-meaningful — a caller
inside the process asks "is this retryable?" without asking "what status?".
The translation component holds the status, and it is the only component in
the release that knows a status.

**Alternatives rejected.**

| Alternative | Why rejected |
|---|---|
| The vocabulary holds each code's status (the upstream contract's literal wording) | It would put an HTTP concept in the leaf layer. The domain component would be able to read a status it has no use for, and the mapping could then be duplicated in the translation component — which is the exact defect `BR6.5` names: "the same code carry two statuses in two places". |
| The translation component lives in a different unit | The contract names it as this unit's component and the unit-of-work artifact lists it among the two this unit owns. Splitting it would create a cross-unit boundary for a pure lookup. |
| The status is derived from the code by convention (a naming convention) | It would make the mapping implicit and its totality unprovable. The requirement that every code is mapped and every other code falls back is a property of an **explicit table**, and an explicit table is what `entities.md` carries. |

---

### D-TS-05 — The normalisation operation is ASCII-only, and the boundary is stated rather than closed

**Decision.** The serial-or-key normalisation folds case **ASCII-only** —
lowercasing `A` to `Z` and leaving every other character unchanged — and the
non-ASCII case is outside the operation's defined scope. The agreement test
covers the non-ASCII boundary as well as the ASCII cases.

**Category.** Unit-local.

**Rationale.** The two tiers of the uniqueness guarantee — the
application-level comparison here and the database's functional unique index
in the foundation unit — must implement **one** operation, or the guarantee
is only as strong as the weaker tier. The `technology-stack` artifact records
the verified fact that SQLite's `LOWER()` is ASCII-only. A Unicode-aware
`String.prototype.toLowerCase()` in the application tier and an ASCII-only
`LOWER()` in the index tier would disagree on exactly the inputs they must
agree on: `İ` and `ẞ` are the cases where the two folds differ.

The decision is not "close the gap"; it is **state the gap and test at its
boundary**. The alternative — a normalised column in the schema — is a
foundation-unit schema change, and this unit does not make schema decisions.
The requirement that the agreement test covers the non-ASCII case is what
makes the gap a stated boundary rather than an accident: a later change to
either tier's fold cannot pass the test while the two tiers disagree.

**The technology consequence.** The fold is implemented with an explicit
ASCII range check rather than by calling `toLowerCase()` and then repairing
the result. This is a deliberate implementation constraint on the unit's
technology, and it is the reason the unit needs no dependency to do it.

**Alternatives rejected.**

| Alternative | Why rejected |
|---|---|
| `String.prototype.toLowerCase()` | Unicode-aware, and therefore disagrees with SQLite's `LOWER()` on `İ` and `ẞ`. This is the specific defect the requirement exists to prevent. |
| `String.prototype.toLocaleLowerCase()` | Also locale-sensitive, and it makes the operation's result depend on the host's locale configuration — a value that differs between the developer's machine and the deploy host for no benefit. |
| A Unicode-normalisation library (`String.prototype.normalize`) | Adds a third-party dependency to a unit whose closure is empty, and it addresses a *different* problem: Unicode canonical equivalence is not the same concern as ASCII case folding, and using it would imply a guarantee the index tier cannot provide. |
| A normalised column in the schema | Correct in principle and owned by the foundation unit. Rejected here because this unit does not make schema decisions, and because adopting it would make the index tier's expression the definition — which would give the data layer ownership of a domain rule. |

---

### D-TS-06 — The counting definition is held here as a definition; the aggregation that evaluates it belongs to the reporting unit

**Decision.** This unit owns the **definition** of the shared filter and of
the eight figures the counting definition yields, together with the relations
between those figures. The **aggregation** that evaluates the definition
belongs to the reporting unit.

**Category.** Unit-local, and consistent with ADR-002.

**Rationale.** The split follows the **data** rather than the layer, and it
is what lets this unit stay a leaf while still giving the four
count-consuming surfaces one definition *by construction* rather than by
review.

If the aggregation lived here, the unit would hold a database handle — and a
leaf that opens a database is not a leaf. If the definition lived in the
reporting unit, then a consumer that needed to know what "the active
inventory count" means would have to reach across to the reporting unit, and
the four surfaces would each be at risk of re-deriving it. Holding the
definition here, with no SQL in it, gives the release one definition that
every surface applies, and the layer constraint holds at the same time.

**The technology consequence.** The filter definition is expressed as a
**description** — which dimensions exist, what each one's accepted values
are, and which relations the figures satisfy — and not as a SQL fragment. A
SQL fragment in this unit would be SQL in the leaf. The reporting unit
consumes the description and produces the query.

**Alternatives rejected.**

| Alternative | Why rejected |
|---|---|
| Both the definition and the aggregation here | The unit would hold a database handle and become a leaf that is not a leaf. `C8` and the unit's own boundary both forbid it. |
| Both in the reporting unit | The definition would then be reachable only through the reporting unit, and the four surfaces' agreement would rest on each of them reaching for the same place rather than on there being one definition. The `scope-definition` stage's recorded interpretation is that a shared definition must be modelled with the group that owns the domain semantics, and the consuming surfaces as a separate group. |
| The definition in the schema, as a view | The schema is owned by the foundation unit, and a view would make the vocabulary's cardinality a schema change every time a figure is added. The `unit-of-work` artifact records the counting definition as this unit's. |

---

### D-TS-07 — The status set and the transition table are held as data, and the two deferred edges are held as absences

**Decision.** The status set is held as a frozen array of five values, with
the display-label mapping held as a frozen object keyed by those values. The
transition table is held as a frozen array of edge records, each carrying its
origin, its destination, its audit action, and whether it requires a reason.
The two deferred edges — `in-stock → discarded` and `returned → discarded` —
are **not** members of the table, and their refusal is stated in a rule rather
than in a data structure.

**Category.** Unit-local.

**Rationale.** The transition table is the release's state machine, and it is
held as **data** rather than as code because four units read it — the write
path, which enforces it, the presentation unit, which renders the per-status
action controls from it, the foundation unit, which reads the status set to
build the schema's constraint, and the reporting unit, which reads the status
set to build its bucket aggregation. A code-shaped transition table would make
each of those four readers re-implement the lookup.

The deferred edges are the interesting part. Holding them as absences, with
the refusal stated in a rule, is deliberate: `BR2.3` states that a request
for either is refused with the invalid-transition code, and the refusal is
**permanent in this release** and "is not a validation failure of the request's
fields". If the deferred edges were held in the table as flagged-but-disabled
records, the table would be the place where a caller looks to find out
whether an edge is legal, and it would have to learn a second convention to
read it. The absence *is* the statement, and the rule that names it is what
makes the absence deliberate rather than an oversight. The
`functional-spec.md` file states this reading of the diagram explicitly, so
that the two deferred edges are recorded and not merely omitted.

**Alternatives rejected.**

| Alternative | Why rejected |
|---|---|
| A function `isLegal(from, to)` that hard-codes the edges | The write path needs more than a boolean — it needs the edge's audit action and whether it requires a reason — and a function cannot be read by the foundation unit to build a `CHECK` constraint or by the presentation unit to render action forms. Data is what all four readers need. |
| A map keyed by a string like `"in-stock>assigned"` | The encoding is a second definition that can disagree with the pair it encodes, and it makes a lookup a string operation rather than a pair operation. The `rules.md` file's treatment of the normalisation operation makes the same point about a second definition of "does this collide". |
| A `switch` statement over origin and destination | Same objection as the function: it is code, and the four readers need data. |
| Holding the deferred edges as disabled records | Discussed above: it makes the table's own semantics conditional, and a conditional table is a table every reader must decode. |

---

### D-TS-08 — The audit-action values are hyphenated strings, and the four pre-existing values are not renamed

**Decision.** The audit-action values are the hyphenated strings `create`,
`assign`, `return`, `mark-lost`, `recovered`, `discarded`, `edit`. The four
values the existing application already records keep their names exactly.

**Category.** Inherited from the release, and a deliberate non-change.

**Rationale.** The `requirements.md` file's constraint `C10` states that audit
action values are data, that they are hyphenated strings, and that the four
existing values are not renamed. The reason the `team.md` Code Style rules
give is that "the values are data, they appear in the database and in the
audit vocabulary section of the workbook, and hyphenated is what the existing
data uses."

This is a **compatibility** decision as much as a naming one. The four
existing values are already in the production database, and renaming them
would either break the rows already written or require a migration that
rewrites history — which the release's append-only invariant forbids, since
an audit row's action is part of the row's content and its traceability.

**Alternatives rejected.**

| Alternative | Why rejected |
|---|---|
| Renaming the existing values to a consistent style (for example `mark_lost`) | It would rewrite the content of existing audit rows, which the append-only invariant and the backfill's "preserve original records" requirement both forbid. |
| Introducing a camelCase or enum-typed action representation | The value is stored in a database column and read by a spreadsheet, not only by code. A hyphenated string is what a human reading the history sees. |

---

### D-TS-09 — The unit holds no runtime process, no configuration, and no environment variable

**Decision.** The unit starts nothing, listens on nothing, opens no file, and
reads no environment variable. Its behaviour is fixed at module load.

**Category.** Unit-local.

**Rationale.** The `technology-stack` artifact records that the application
has exactly two environment variables, `PORT` and `DB_PATH`, both read at
process start by `src/server.js` — and that there is "no `.env` file, no
environment-variable validation, and no secrets management". Neither variable
is meaningful to a leaf that holds no port and no database.

The stronger reason is the **fail-closed** property. A vocabulary whose values
could vary with an environment variable would be a vocabulary with more than
one truth: the same process could hold different status sets under different
configurations, and every consumer's agreement would depend on configuration
rather than on the definition. `BR10.1`'s "stated exactly once" has to mean
exactly once across every deployment, and the only way to guarantee that for a
value set is to fix it in the source.

**Alternatives rejected.**

| Alternative | Why rejected |
|---|---|
| A `FEATURE_FLAGS` environment variable gating the deferred edges | It would make the transition table's contents deployment-dependent, and the deferred edges' refusal is a **release** property, not a deployment property. The deferred edges join in a later increment, which is a code change, not a configuration change. |
| A `LOG_LEVEL` environment variable read by the unit | The unit logs nothing; the release's logging story is the operations unit's, and the application currently has no logging configuration at all. |
| Reading a config file at module load | Module-load file access makes the unit's values depend on the filesystem, which the unit's boundary forbids ("no data access") and which would make it untestable without a fixture. |

---

### D-TS-10 — The unit has no test-time dependency either: its tests use the same toolchain as the rest of the release

**Decision.** The unit's tests use Vitest with the V8 coverage provider, the
same toolchain as the rest of the repository, and the same test idiom: a
fresh in-memory database where a database is needed, seeds through the service
path rather than hand-written SQL, and requirement identifiers in the test
titles.

**Category.** Inherited from the release.

**Rationale.** The `team.md` Testing Posture rules record the existing
toolchain — Vitest 2.1.9, the V8 coverage provider, `supertest` for
HTTP-level tests — and record the existing test idiom as "a genuine
traceability asset". The convention that every new test carries its
requirement identifier is extended, not scoped down: the `project.md` rules
require that every new test names a requirement identifier, and the release's
NFR requirements carry identifiers of the form `NFR2.x.y` for exactly this
purpose.

This unit's own tests are a special case worth stating: most of it needs **no
database and no HTTP layer at all**, because the unit holds no data and no
server. Its tests are pure-function tests over frozen data — which is the
practical payoff of the leaf property, and the reason the unit's test
fixtures are cheap.

**Alternatives rejected.**

| Alternative | Why rejected |
|---|---|
| A separate test framework for this unit | The release has one test runner and one coverage provider. A second runner is a second coverage configuration and a second thing to keep in step. |
| Property-based testing with a library such as `fast-check` | It would add a development dependency and would be disproportionate to a unit whose entire input space is a handful of closed sets. The named case sets in `BR5.2` and in `NFR2.2.1` are exhaustive for the shapes that matter: identical, whitespace-only difference, ASCII-case-only difference, both, non-ASCII-case-only difference, and a different category. |

---

## What This Unit Inherits, and From Whom

The following are **not** re-decided here. They are recorded so a reader can
see that the release's shared decisions reach this unit without this unit
having to own them.

| Decision | Owner | How it binds this unit |
|---|---|---|
| JavaScript, CommonJS, Node ≥ 20.0.0 | The release (already built) | D-TS-01 |
| `better-sqlite3` 11.x, SQLite 3.49.2, WAL | The foundation unit | Binds only through the index expression the uniqueness guarantee shares — D-TS-05 |
| Express 4.x, EJS 3.x | The presentation unit | The render-data path — D-TS-03 |
| Prettier at 120 columns, ESLint with the recommended rule set | The tooling unit | Formatting of this unit's source, and the security rules that ride in the same config |
| `npm ci` for every non-interactive install | The tooling and delivery unit | This unit has no install step of its own; the rule reaches it through the repository's single lockfile |
| Single process, single host, one local database file | The release (constraint `C4`, `NFR5.1`) | The unit has no deployment of its own — D-TS-09 |
| The 80% project-wide line-coverage floor, enforced by tooling | The release (`NFR6.2`) | This unit's coverage contributes to the project-wide figure; the floor is not a per-unit target and the unit's own coverage is expected to be high because it holds no I/O branches |
| The 66/66 pre-existing test baseline | The release (`NFR6.1`) | This unit's tests are **added** to the suite, never in place of it |

---

## The Complete Technology Stack for This Unit

| Layer | Selection | Third-party? |
|---|---|---|
| Language | JavaScript (CommonJS) | No |
| Runtime | Node.js ≥ 20.0.0 (verified v20.20.0) | No |
| Module system | CommonJS `require` / `module.exports` | No |
| Dependencies | **None.** The closure is empty — not "Node built-ins only" but literally no imports | No |
| Build step | **None.** No compile, bundle, transpile, preprocessor or generator | — |
| Type checker | None (the release has none) | No |
| Linter | ESLint, recommended rule set (the tooling unit's configuration) | Dev |
| Formatter | Prettier, `printWidth: 120`, `singleQuote: true`, `trailingComma: "es5"` (the tooling unit's configuration) | Dev |
| Test runner | Vitest 2.1.9 with the V8 coverage provider | Dev |
| HTTP-level test tool | `supertest` — **not used by this unit**, which has no HTTP surface | Dev |
| Database | **None.** The unit holds no database handle; the uniqueness guarantee's index tier is the foundation unit's | — |
| Containerisation | None | — |
| Configuration files | **None** for this unit. No `.env`, no config module, no environment variable | — |
| Network | **None.** The unit opens no outbound connection | — |
| Observability | **None.** The unit logs nothing and holds no metric; the release's logging story is the operations unit's | — |

**The two deliberate copies.** The schema's status `CHECK` text and the
stylesheet's `.status-*` class names remain **literal copies** of this unit's
values, checked by a test rather than generated. This is ADR-004 and
`BR10.2`, and it is the boundary the release's "no build step" constraint
forces: generating them would turn a migration file and a stylesheet into
build artefacts, and would introduce a generator into a release that has
none.

---

## Sources Consumed

| Upstream artifact | What this file takes from it |
|---|---|
| `technology-stack` | The runtime and module system; the three Node built-ins the codebase uses; the absence of a build step, a type checker, a linter and a formatter configuration; the two environment variables; the verified platform constraints including SQLite's ASCII-only `LOWER()`; the absence of any frontend framework or client-side JavaScript; and the absence of containerisation, infrastructure-as-code and CI configuration. |
| `functional-spec` | The unit's two components; the leaf property; the six workflows; the eight released edges and the two deferred edges; the code-to-status mapping; the count of eight figures; and the unit's "What This Specification Does Not Decide" section. |
| `rules` | The forty-five rules this file's decisions rest on — in particular `BR5.1`, `BR5.2` (the one normalisation, and the index tier's agreement with it), `BR6.5` (the vocabulary holds no HTTP concept), `BR10.1`, `BR10.2` (the single source and its two literal copies), and `BR2.3` (the two deferred edges are refused). |
| `contract-summary` | The four `shared-schema` contracts this unit owns; the failure model's eight bound codes and one retryable code; the statement that the translation component is the single place a domain code becomes an HTTP status; and the statement that a timeout is not a contract concern on a call edge. |
| `requirements` | Constraints `C4`, `C8`, `C9` and `C10`; `NFR5.1`; `NFR6.1` and `NFR6.2`; and the open question `OQ1` for the actor mechanism. |
| `unit-of-work` | The unit's boundary, its two owned components, its kind, its complexity, its leaf constraint, and the five implementation notes the `rules.md` and `entities.md` files carry forward. |
| `unit-of-work-story-map` | The five stories the unit carries and its internal implementation order. |
