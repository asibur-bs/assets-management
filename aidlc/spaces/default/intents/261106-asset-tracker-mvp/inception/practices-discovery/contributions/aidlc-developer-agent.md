**Collaborator:** aidlc-developer-agent

## Contribution

I inspected the lead's three drafts, all six published CodeKB artifacts, and every one of the 14 tracked JavaScript files, the six EJS templates, the stylesheet, and `package.json` / `vitest.config.js`. Where a claim was checkable by execution, I executed it: I installed Prettier 3 and ESLint 9 in throwaway directories and ran them against the real repository, and I probed the `better-sqlite3` error shape against a live SQLite database.

Several of my findings are corrections of factual claims in the draft. They are the substance of this contribution, so I have stated them plainly rather than hedging.

---

### 1. The `## Code Style` section rests on a claim that is false, and the fix is more expensive than the draft says

`team-practices.md:322-328` states:

> "the existing code already conforms to Prettier's defaults with only one deliberate exception (single quotes — Prettier's default is double quotes, so we configure `singleQuote: true`)"
>
> "We choose the tools that make the existing style enforceable rather than the tools that would require reformatting the whole codebase; a style change bundled into a feature release is a change we cannot review, and with one reviewer it is a change we cannot afford."

I tested this. It is not true. With `{ "singleQuote": true }` and nothing else, **every one of the 14 tracked JS files fails `prettier --check`** — not one passes. The diff is not a quote-style nit; it is a wholesale re-layout:

| Config | Changed lines across all 14 tracked JS files |
|---|---|
| `{ singleQuote: true }` (draft's proposal) | ~180 in `src/` alone, plus all 6 test files |
| `{ singleQuote: true, printWidth: 100, trailingComma: "all" }` | 183 |
| `{ singleQuote: true, printWidth: 120, trailingComma: "es5" }` | 120 |

The cause is not the quotes. It is **print width**. The codebase's own style is ~100-120 columns — only 5 lines in the whole repository exceed 120 characters (`src/app.js:20` at 125 chars, `src/repositories/assets-repo.js:128` at 135, `:130` at 150, `tests/routes.test.js:67` at 126, `:79` at 129) — whereas Prettier's default is 80. At width 80 Prettier explodes every multi-line SQL statement and every long `if` condition.

The residual 120 lines at width 120 are exactly four mechanical categories, none of which is a style disagreement:

1. **The single-line `catch` idiom.** `src/routes/assets.js:28,66,74,81,88` all write `} catch (err) { next(err); }` on one line. Prettier expands each to three lines. This is 5 sites in one file.
2. **The template-literal hug.** `src/repositories/assets-repo.js:54,88,110` write `db.prepare(\`...\`).run(...)`. Prettier 3 breaks the call chain and re-indents the SQL body, moving it away from the column-aligned form the codebase deliberately uses (`src/repositories/assets-repo.js:90-92` aligns `SET name = ?, serial_or_key = ?, ...`).
3. **The long `if` at `src/app.js:20-21`** (125 chars) and the long `if`/`new Error` lines at `src/repositories/assets-repo.js:128,130`.
4. **Missing trailing newline.** 14 of the 20 tracked source files end without a final newline (`src/app.js`, `src/db/index.js`, `src/repositories/assets-repo.js`, `src/routes/assets.js`, `src/server.js`, `src/services/asset-service.js`, all six `views/*.ejs`, and `public/styles.css`). Prettier adds one; the diff shows the line as both removed and re-added.

So the honest characterization is: **the existing code is not Prettier-clean, but it is not far from it.** The gap is a configuration gap (print width) plus about 120 lines of mechanical re-layout, not a stylistic divergence. The draft's conclusion — that Prettier is the right tool and that a config commit suffices — is right. Its premise — that a config commit suffices *because the code already conforms* — is wrong, and the draft states it as a fact the human can rely on.

**The recommendation I would make to the human is different from the draft's, and it is cheaper:** do not adopt Prettier's re-layout at all. Configure Prettier to match the codebase and use it only as a *check* on new and changed files, not as a whole-tree rewrite. Concretely:

- `{ "singleQuote": true, "printWidth": 120, "trailingComma": "es5", "semi": true, "tabWidth": 2, "arrowParens": "always", "endOfLine": "lf" }`

I verified `trailingComma: "es5"` is the correct value, and the draft's "trailing commas" claim needs correcting to match. The codebase uses trailing commas in **object and array literals** but **not in function call arguments** — `src/repositories/assets-repo.js:67` ends a call with `now` and no comma; `:104` ends with `id` and no comma; `src/services/asset-service.js:44` and `src/db/migrate.js:56,64` are the same. That is exactly Prettier's `"es5"` behaviour, not `"all"`. The draft lists "trailing commas" as a repo-wide convention without distinguishing the two cases, and if the human affixes `"all"` the diff will touch every multi-line call in the repository.

Note also that `printWidth: 120` is not an arbitrary compromise: it is the width the codebase already uses. Setting the formatter to the codebase's actual width is what "make the existing style enforceable" means in practice.

**Two additional gaps in the draft's tooling proposal that I verified by execution:**

- **Prettier cannot parse EJS.** `prettier --check "views/**/*.ejs"` fails with `No parser could be inferred` for all seven templates, and forcing `--parser html` fails with `SyntaxError: Opening tag "option" not terminated` at `views/list.ejs:7`, because EJS interpolation inside a tag attribute is not valid HTML. A `format:check` script that globs the repository will therefore fail on `views/` unless it is excluded. The draft proposes the script without addressing this.
- **Prettier would rewrite the stylesheet entirely.** `public/styles.css` uses one-line rules (`body { margin: 0; font-family: ...; }`); Prettier puts every declaration on its own line. The diff is **200 changed lines** on a 45-line file — a total rewrite of the one file the MVP's five new surfaces will extend with new `.status-*` tokens. The stylesheet should be excluded from the formatter, or the formatter should be pointed at it only when it is deliberately restyled.

### 2. The ESLint question the draft defers to the human can be settled now, and the answer is not "strict recommended"

`team-practices.md:378-382` marks the ESLint strictness question **To confirm**, drafting "the starting-set reading", on the reasoning that a strict set "on day one would be an unrelated mass diff in the same release as the MVP's schema rebuild."

I tested the strict reading. **`js.configs.recommended` passes the existing codebase cleanly.** My config:

```js
// eslint.config.js — flat config, ESLint 9
'use strict';
const js = require('@eslint/js');
const globals = require('globals');

module.exports = [
  { ignores: ['node_modules/**', 'coverage/**', 'data/**', 'aidlc/**'] },
  js.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: { ...globals.node },
    },
    rules: {
      strict: ['error', 'global'],
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-var': 'error',
      'prefer-const': 'error',
      eqeqeq: ['error', 'smart'],
      'no-throw-literal': 'error',
      'no-return-await': 'error',
      'require-atomic-updates': 'off',
    },
  },
  {
    files: ['tests/**/*.js'],
    languageOptions: { globals: { ...globals.node, ...globals.vitest } },
    rules: {
      'no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^(create|seedTwoAssets)$',
      }],
    },
  },
];
```

`src/`, `tests/`, and `vitest.config.js` all exit 0. **The only rule that fires anywhere is `no-unused-vars`, and only in `tests/`, and only on 13 sites** — all one shape:

```js
const create = await request(app).post('/assets')...;   // response deliberately discarded
```

at `tests/routes.test.js:79,88,101,114` and `tests/views.test.js:31,42,53,87,98,112,126,141`, plus the unused `seedTwoAssets` import at `tests/routes.test.js:6`. This is a *test-scoped* override, configurable without touching a single line of code.

**So the draft's premise for deferring the question is wrong.** The draft assumes a strict recommended set produces an "unrelated mass diff". In fact it produces **zero** diff in `src/` and a 13-site, one-rule, test-scoped override. The correct answer to the human's question is: **adopt `js.configs.recommended`**, with the one documented test-scoped `no-unused-vars` override. The "starting set with a documented allow-list" the draft proposes is not needed — it is the strictly worse option, because it forgoes real defect detection for no benefit.

Two of these rules are worth calling out because they are not in `recommended` by default and I recommend adding them explicitly:

- **`strict: ['error', 'global']`** — every one of the 14 tracked JS files opens with `'use strict';` as its first line. This is a 14/14 convention the draft's preserved-conventions list does not mention at all, and it is the only convention in the repository that is both universal and mechanically enforceable. Turning it into a lint rule costs one line and catches the first file that drops it.
- **`require-atomic-updates: 'off'`** — the opposite of what you would add by reflex. The rule is designed for async code; this application is fully synchronous (`better-sqlite3`), so it is a false-positive generator here. I included it explicitly-off so the next person does not "helpfully" enable it.

**Rules I would leave off, and why:**

| Rule | Why it stays off |
|---|---|
| `no-magic-numbers` | The status and category vocabularies are literal strings by design (`src/repositories/assets-repo.js:5-6`); the rule would flag every legitimate vocabulary member. |
| `max-len` | The formatter owns line width. Two linters disagreeing over width is a merge-resolution tax. |
| `complexity` / `max-depth` | The service operations are four-beat sequences (`src/services/asset-service.js:52-70`); the counts are fine and the rule adds noise without finding defects. |
| `no-unused-vars` on function *parameters* beyond `argsIgnorePattern: '^_'` | Express's error middleware needs all four parameters (`src/app.js:17` — `(err, req, res, next)`) to be recognised as an error handler; `args: 'after-used'` (the default) is the right setting and the codebase already satisfies it. |
| `id-length`, `sort-imports`, `sort-keys` | The codebase's own conventions already fix import and key order; enforcing them adds nothing a reviewer does not already see. |
| Type-aware rules (`no-unsafe-*`, `require-await`) | There is no TypeScript and no type checker. A type-aware ESLint setup would add a build dependency the org rules do not ask for, to a project the `technology-stack` artifact records as "Plain JavaScript — no TypeScript". |

### 3. The `npm` script set the draft proposes is incomplete, and one of its scripts will fail

`team-practices.md:330-331` proposes adding "a `lint` script and a `format:check` script to `package.json`, and both run in CI alongside the tests." The draft names the scripts but not their scope, and the scope is where this goes wrong. The realistic set:

```json
"lint":         "eslint src tests vitest.config.js",
"lint:fix":     "eslint --fix src tests vitest.config.js",
"format":       "prettier --write \"src/**/*.js\" \"tests/**/*.js\" \"*.js\"",
"format:check": "prettier --check \"src/**/*.js\" \"tests/**/*.js\" \"*.js\"",
"check":        "npm run lint && npm run format:check && npm run test:coverage"
```

Three points on that set:

- **`format:check` must not glob `views/` or `public/`** — verified above: EJS cannot be parsed and the stylesheet is a 200-line rewrite. A `.prettierignore` carrying `views/`, `public/`, `coverage/`, `data/`, `aidlc/`, `.puku-cli/`, `.claude/`, `.puku/` is the cleaner expression of the same rule, because then the script itself stays a single glob and cannot drift.
- **ESLint must be scoped to `src tests vitest.config.js` explicitly.** The repository root contains `aidlc/`, `.claude/`, and `.puku-cli/` — the AI-DLC workflow tooling, which is not application source (the `code-structure` artifact says so explicitly at its § Non-application directories). An unscoped `eslint .` would lint the tooling tree. I excluded those paths in the `ignores` block above for this reason, and it is worth a sentence in the practices so the next person does not widen the glob.
- **There is no `format` script in the draft.** `format:check` alone leaves no way to apply the formatter. If the team adopts the formatter, both halves belong together.

### 4. Error handling: the draft's stance is right, but the single most load-bearing rule for this release is missing

The draft's error handling content is correct as far as it goes — the `err.code` contract, the single translation point at `src/app.js:17-24`, and the assertion discipline (tests assert on `code`, never on the message, `tests/assets-repo.test.js:7-12`) are all accurately stated and worth preserving. But the draft's preserved-conventions list stops at the *domain* error contract and misses the *driver* error contract, which is precisely where this release's hardest requirement lives.

The MVP's standing condition requires `SQLITE_BUSY` mapped to a retryable error, and the standing condition on the uniqueness check requires a *shared* definition between the functional index expression and the application-level predicate. Both depend on how SQLite errors are detected. Today they are detected by **matching the message text**:

```js
// src/repositories/assets-repo.js:70
if (String(e.message).includes('UNIQUE constraint failed')) {
```

The `code-quality-assessment` artifact (debt item 3) already flags this as brittle. What it does not say — and what I verified by execution — is that **`better-sqlite3` already gives you a machine-readable discriminator, and the codebase is throwing it away.** A `SqliteError` thrown by the driver carries:

- `err.code` → `'SQLITE_CONSTRAINT_UNIQUE'` for a unique-constraint violation (verified live)
- `err.code` → `'SQLITE_BUSY'` for lock contention (verified live, across two processes)
- `err.message` → `'database is locked'` — the message that a text match would have to key on, and which is *not* stable

This is a concrete, verifiable finding with three consequences, and each should be a written rule:

1. **Never detect a driver error by message text.** Rule form: *ALWAYS detect a SQLite error by its `err.code` (`SQLITE_CONSTRAINT_UNIQUE`, `SQLITE_BUSY`, …) and NEVER by matching `err.message`.* This directly discharges the "message is not part of the contract" principle the codebase already applies to its *own* domain errors — the draft preserves that principle for domain errors but does not extend it to the driver errors the MVP now depends on. The current line at `assets-repo.js:70` is the one place in the codebase that violates the codebase's own convention.
2. **The domain `code` vocabulary and the driver `code` vocabulary are different namespaces and must not collide.** The domain codes are `VALIDATION_ERROR`, `DUPLICATE_ASSET`, `NOT_FOUND`, `INVALID_TRANSITION`, `INVALID_STATE` (`src/services/asset-service.js:28-32`). The driver codes are `SQLITE_*`. The MVP needs at least one **retryable** domain code that has no current equivalent — `DUPLICATE_ASSET` is not retryable, and neither is `VALIDATION_ERROR`. The draft's preserved list of five codes is presented as complete; it is complete for the POC and **incomplete for the MVP**, because the MVP's standing condition requires a retryable error that does not yet exist in the vocabulary. That is a naming-and-contract gap, and it should be surfaced to the human.
3. **Error construction should be centralised, not duplicated.** There are two construction sites today: `makeError(message, code)` at `src/services/asset-service.js:28-32` and the inline equivalent at `src/repositories/assets-repo.js:41-44,71-73,83-85`. The repository cannot import the service (that would be an upward import, violating the layering the draft preserves), so the shared constructor belongs in a layer *below* both. This is the natural home for the new SQLite-error translation as well. The draft says nothing about where the shared error helper goes, and the MVP adds a sixth code and a driver-translation layer — that is the moment to fix it, not after.

**On error surfacing at the route/service boundary:** the draft's stance is right in substance but silent on the mechanism. The convention that is actually followed — and that the MVP will extend with five new surfaces — is: the route wraps its service call in `try { … } catch (err) { next(err); }` and forwards; the service throws; the error middleware at `src/app.js:17-24` is the *only* place that turns a domain error into an HTTP status. Two sub-conventions are worth writing down because the MVP adds surfaces that could break them:

- **The route must not translate domain codes into statuses.** `src/routes/assets.js:50-51` does handle `VALIDATION_ERROR` and `DUPLICATE_ASSET` locally — but only to **re-render the form with the error**, not to choose a status code; the 400 comes from the middleware. That distinction is subtle and the MVP's new write surfaces (asset editing, discard, recovery) will each need it.
- **`INVALID_STATE` is currently unhandled** at `src/app.js:20` — it is thrown at `src/services/asset-service.js:21` but is not in the middleware's handled set, so an unknown-state asset surfaces as a **500**, not a 400 (the `code-quality-assessment` artifact's debt item 12). The draft's preserved error-code list mentions `INVALID_STATE` as a member of the vocabulary but does not flag that it is not mapped. The MVP widens the status set to five buckets plus `discarded`, which increases the chance of an unmapped state. A rule that **every code in the vocabulary must be mapped in the error middleware** closes this.

**On synchronous error handling generally:** the draft's framing ("a check that runs in the pipeline beats a check that runs in someone's head") is right, and I agree with its synchronous-application stance. One thing the draft does not say, and that the MVP's `IMMEDIATE`-transaction requirement makes load-bearing: in a synchronous driver, `try/catch` around two statements is **not** a rollback. The MVP's audit-append requirement (every transition has explicit audit behaviour) cannot be met by an `UPDATE` followed by an `INSERT` with no transaction, because a throw between them leaves the asset updated and the audit row missing — the audit trail is the release's primary success measure (Audit Completeness). The `db.transaction(...)` idiom already exists in the codebase at `src/db/migrate.js:60-67`, so the pattern is available and familiar; but the rule "the asset write and its audit write are one transaction" is not in the draft's mandated list and is not derivable from the current `discovered-rules.md`. It should be.

### 5. Layer boundaries: the draft's preserved "layering" convention, as written, would block the MVP's central requirement

The draft's preserved-conventions list states:

> "**Layering.** `routes → services → repositories → db`, strictly downward, no cycles, no upward imports. […] The new MVP modules live in the same layers and obey the same direction."

This is accurate as a description of the current code — I verified the require graph. It is also **incomplete in a way that will actively obstruct the MVP**, and the omission is the same one the `code-quality-assessment` artifact names as debt item 5.

The MVP's central requirement is a **single shared definition** for the status vocabulary, the counting filter, and the uniqueness predicate, consumed by four count-consuming surfaces plus the schema. The current code cannot do this, and the reason is structural:

- `ALLOWED_STATUSES` and `ALLOWED_CATEGORIES` live in `src/repositories/assets-repo.js:5-6` — the **data-access layer**.
- They are exported (`assets-repo.js:142-143`) but have **zero consumers**. I grepped `src/`, `tests/`, and `views/`: the only reader is the repository itself.
- `TRANSITIONS` lives in `src/services/asset-service.js:5-10`, exported at `:114`, also with **zero external consumers**.
- The EJS templates **cannot import JavaScript at all** — `views/list.ejs:10-16` hardcodes the four status options as literal `<option>` elements, and `views/detail.ejs:26-49` hardcodes the per-status action forms.

So the vocabulary is duplicated six times (schema CHECK, repository `Set`, service `TRANSITIONS`, list filter `<select>`, detail action forms, stylesheet `.status-*` tokens) *because* each consumer sits at a different layer, and the layers as currently drawn have no shared place to put a definition that all of them can read. The layers are not merely a style — they are the reason the duplication exists.

The draft's rule, read literally ("the new MVP modules live in the same layers and obey the same direction"), tells an implementer to put the shared counting function *somewhere in the existing four layers* — and every one of those choices is wrong:

- Put it in `repositories/` and the views still cannot read it (EJS has no `require`), and the dashboard route would need to import from the repository, which is a **downward** import from `routes` — actually permitted, but it puts a *business* definition in the data layer and makes the repository the owner of domain semantics.
- Put it in `services/` and the repository cannot read it without an **upward import**, which the draft's own rule forbids.
- Put it in `routes/` and the repository and service cannot read it.

**This is the concrete instance of the project memory's recorded team-formation interpretation** — *"When a consistency guarantee depends on one shared definition consumed by several surfaces, model the definition and the filter builder with the group that owns the domain semantics, and the consuming surfaces as a separate group"* — applied here to the codebase. The codebase has no layer for "domain semantics that everyone reads". The rule the draft needs is not "obey the same direction"; it is:

> **The MVP adds one new layer — `src/domain/` — that owns the shared domain vocabulary (the status set, the transition table, the loss-reason vocabulary, the uniqueness comparison predicate, the shared count/filter definition). It is a leaf: it depends on nothing but `node:` built-ins, and every other layer may import it. It must not import from `services/`, `repositories/`, `routes/`, or `db/`.**

And the second half of the rule, which matters just as much:

> **A shared definition that a view must render is passed to the view as render data, never re-declared in the template.** The status `<option>` list at `views/list.ejs:10-16` becomes a loop over the shared vocabulary supplied by the route; the per-status action forms at `views/detail.ejs:26-49` become a loop over the shared transition table. The template keeps no literal copy of the vocabulary.

Without the second half, the six-way duplication survives the refactor and the MVP ships a *seventh* copy. This is the single highest-value code-style/layering rule the practices can carry, and it is missing from the draft.

Two supporting points on where the shared code goes:

- **The shared uniqueness definition has a second home that the draft does not mention.** The standing condition requires "one shared definition for the functional-index expression and the application-level comparison predicate". The functional-index expression is **SQL DDL** (`CREATE UNIQUE INDEX … ON assets (category, lower(serial_or_key))`) and the predicate is **JavaScript**. They cannot literally be one string — but they can be one *named* definition, and the codebase already has a mechanism for exactly this: `src/db/migrations.sql` is a `.sql` file read at module load by `src/db/migrate.js:6` and applied as migration v1. A shared constant expressed once and injected into both the DDL and the JS predicate is the pattern the existing code already demonstrates. The rule should say the two forms **must be derived from one named definition** and **must be changed together**, and that the DDL half lives in the migration, not in `migrations.sql` — because `migrations.sql` is applied as **migration v1 only** (the `code-quality-assessment` artifact records this, and `src/db/migrate.js:13-20` confirms it), so a new index must be re-issued by a new migration.
- **The file-organisation convention for the MVP's new files is not stated at all.** The draft preserves "layered `src/` directories" but says nothing about where the five greenfield surfaces' files go, nor about `tests/` mirroring `src/`. The existing test layout does mirror the source layout by *layer* (`tests/db.test.js` ↔ `src/db/`, `tests/assets-repo.test.js` ↔ `src/repositories/`, `tests/asset-service.test.js` ↔ `src/services/`, `tests/routes.test.js` ↔ `src/routes/`, `tests/views.test.js` ↔ `views/`) — with one deviation: the test file is named after the *layer* (`assets-repo.test.js`), not always after the module. And shared test helpers live in `tests/helpers/` (`tests/helpers/seed.js`), which is the existing precedent for where a shared test helper goes — which is the right precedent for the new shared counting function's test helper too.

### 6. Conventions the 14 files follow consistently that the draft's preserved list omits

The draft lists seven preserved conventions. Four more are followed consistently and are worth writing down, because each is currently accidental rather than stated:

| Convention | Evidence | Why it matters here |
|---|---|---|
| **`'use strict';` as the first line of every JS file** | 14/14 tracked JS files | The only universal, mechanically enforceable convention in the repo; enforceable with `strict: ['error','global']` (verified passing). |
| **`module.exports = { … }` named-object shape** | `src/app.js:29`, `src/server.js:23`, `src/db/index.js:21`, `src/db/migrate.js:72`, `src/repositories/assets-repo.js:134`, `src/services/asset-service.js:107`, `tests/helpers/seed.js:81` | Makes the export surface greppable and diffable. Note the **single exception**: `src/routes/assets.js:94` exports a bare function (`module.exports = assetsRouter`). One consistent shape with one deliberate exception is a convention; two shapes with no stated reason is not. The draft should either record the exception or normalise it. |
| **JSDoc on exported test helpers** | `tests/helpers/seed.js:14-18,37-42,54-58,65-73` — every export has a doc comment with `@param`/`@returns` | The `code-structure` artifact notes the helper's JSDoc as a strength. It is the repo's only JSDoc convention — no `src/` file uses JSDoc. That is a meaningful boundary: JSDoc is for *test helpers*, not for application modules. The MVP's shared counting function and filter builder are application modules, so by the repo's own convention they take prose comments (explaining *why*), not JSDoc. |
| **The `db` handle is the first argument of every repository and service function, and is closed over by the router factory** | `src/repositories/assets-repo.js:13,34,38,80,109,116`; `src/services/asset-service.js:34,52,72,87,96,103`; `src/routes/assets.js:6` (`assetsRouter(db)`) | This is the mechanism that lets every test use a fresh `:memory:` database. It is a *convention with a reason*, and it is the pattern the MVP's five new modules must follow — otherwise the new code cannot be tested the same way. The draft's preserved list does not mention it, and it is the convention most likely to be broken by a new developer or a new agent, because "inject the database" is not obvious in a codebase with no DI framework. |

### 7. The `## Way of Working` section: the branch and merge recommendations are right, but two things are missing and one factual claim is wrong

**The branch and merge recommendations are sound and I endorse them.** The org default names `main`; the repository's only branch is `master` (`git branch -a` confirms), and the org rule says the *shape* is what is inherited. Keeping `master` and avoiding a rename in a release that also rebuilds two tables is right. Squash-merge is right for the reason the draft gives — a linear trunk that maps to the delivery sequence — and I would add one point the draft misses: with no remote configured (`git remote -v` is empty) and a single author, **there is no server-side merge to trigger**. "Squash-merge" is therefore, in practice, "do not create a merge commit" — the feature branch's commits are collapsed by the developer before merging, or the branch is merged fast-forward and the source branch's intermediate commits live only in the branch's reflog. The draft should say which of these actually happens, because the practice is unenforceable as stated. Note also that this makes the CI story dependent on a remote that does not exist — the `evidence.md` file already flags this ("CI platform is undecided"), and it deserves the emphasis in the interview, because "CI before merge" and "no remote" are in direct tension.

**Factual corrections to the draft's evidence base:**

- **`evidence.md:53` and `team-practices.md:53` say "12 commits".** `git rev-list --count HEAD` returns **11**. The lead's own `git shortlog -sne --all` line (12) says "11 by `asibur-bs`", which contradicts the "12 commits total" in the row above it. The correct figure is 11, all by one author.
- **`team-practices.md:50-51` says commit subjects are "in the imperative mood, matching the existing history (`Implement asset lifecycle timestamps, migrations and state-correct actions`)".** The existing history is mixed: the three application commits are `Initial Commit`, `Second Commit`, `Third Commit` — not imperative verbs and not descriptive of content. Only the eight later workflow commits are imperative. The rule as written ("keep the subject in the imperative mood") is a good practice and should be kept, but it does **not** match the existing history, and the draft should not claim that it does.

**Two things the `## Way of Working` section is missing that this release needs:**

1. **A statement that this MVP is a structural change to a working system, and what that means for how work is chunked.** The draft's `## Walking Skeleton` section says the foundation workstream acts as the de-facto slice, and its `## Deployment` section describes the backup-then-migrate sequence. But `## Way of Working` — the section that governs how work is chunked — does not say it. This release is not a feature added to a stable system; it is a **rebuild of the two tables the application depends on**, plus a change to the status vocabulary that is duplicated in six places, plus five greenfield surfaces that consume a definition that does not exist yet. The chunking rule that follows from this is specific and useful: **the foundation workstream (actor decision → `audit_log` rebuild → `assets` rebuild) is one indivisible unit that is never split across commits that are individually deployable**, because a commit that rebuilds `assets` without rebuilding `audit_log` first destroys the audit history. A commit-level rule that says "a commit is only finished when the tree is in a state that could be deployed" is the discipline that makes the trunk safe. The draft states this at the *workstream* level in `## Walking Skeleton`; it belongs in `## Way of Working` as well, at the *commit* level, because commit granularity is what the section is about.

2. **A rule that a migration and its test land in the same commit.** This follows from the same reasoning and is cheap to state. The `code-quality-assessment` artifact records that the existing legacy-migration test at `tests/db.test.js:59-93` "would not have caught the cascade data loss" — because it carries no audit rows. A commit that lands the rebuild migration without the audit-row assertion is a commit that ships a silent data-loss path. The rule "a schema change and the test that proves it are one commit" is the enforcement for the release's highest-risk item.

I would also flag one item for the interview that the draft does not raise: **`views/_layout.ejs` is dead code** (`code-structure` and `code-quality-assessment` both record it; nothing includes it) and **`README.MD` is a 17-byte case-differing duplicate of `README.md`**. Both are pre-existing, both are trivially removable, and both are unrelated to the MVP. The `code-quality-assessment` artifact deliberately records rather than removes them ("the release's diff will be reviewed"). That is the right call, but the practices should say explicitly whether they are removed in this release or left — otherwise they become "just one more thing in the diff" and get removed accidentally by a formatter or a linter sweep. Note the specific hazard: `README.MD` and `README.md` differ only in case, which is a hazard on a case-insensitive filesystem; and `views/_layout.ejs` duplicates `_header.ejs`, so a future formatter or partial-edit tool that touches `_header.ejs` will silently desynchronise the dead copy.

### 8. `discovered-rules.md`: what is missing, and one rule stated at the wrong level

The `## Mandated` / `## Forbidden` lists are accurate as far as they go — I checked each against `project.md`'s `## Decided` record and the upstream artifacts, and the sources are named correctly. The `## Not yet stated` section is also honest and correct: it lists exactly the five areas the draft marks **To confirm**, and I agree that none of them belongs in a mandated file before the interview.

**Missing rules that belong in `## Mandated` or `## Forbidden` after the interview** (all of them are consequences of standing conditions the human has already approved, not new inventions):

- **ALWAYS write the asset update and its audit append as one transaction.** (Discharges the standing condition "every lifecycle transition has explicit validation and audit behaviour" — a transition whose audit write can be lost is not an explicit audit behaviour. It also makes Audit Completeness, the release's primary success measure, achievable.) Currently the two writes are separate statements with no transaction (`src/services/asset-service.js:38-48,62-68,78-83,91-92`).
- **NEVER detect a SQLite error by matching `err.message`; ALWAYS match `err.code`.** (Discharges the uniqueness standing condition, whose shared definition requires a reliable discriminator. `better-sqlite3` supplies `SQLITE_CONSTRAINT_UNIQUE` and `SQLITE_BUSY` on `err.code` — verified live — and `src/repositories/assets-repo.js:70` currently discards them in favour of a text match.)
- **ALWAYS map every code in the domain error vocabulary to an HTTP status in the single error middleware.** (Closes the `INVALID_STATE` → 500 defect at `src/app.js:20` and prevents the widened five-bucket vocabulary from adding another unmapped state.)
- **ALWAYS render a shared vocabulary from render data; NEVER re-declare it in a template.** (Discharges the shared-counting standing condition on the presentation side. `views/list.ejs:10-16` and `views/detail.ejs:26-49` currently hardcode the vocabulary, which is two of the six copies.)
- **ALWAYS derive the functional-index expression and the application-level comparison predicate from one named definition.** (This is already close to the existing wording — "one shared definition for the functional-index expression and the application-level comparison predicate" — but the rule as drafted does not say that the two forms must **change together**, which is the part that actually prevents them drifting. A test asserting that the index expression and the JS predicate agree is the enforcement.)

**One rule stated at the wrong level.** The draft's `## Forbidden` entry for the migration ordering is long and specific:

> "NEVER destroy audit history. […] so the rebuild ordering is a hard constraint, not a preference: rebuild `audit_log` with no foreign-key clause, then rebuild `assets`, then re-add the foreign key afterwards."

This is the right rule, but it is written as a **one-off instruction about one migration** rather than as a **general constraint on how schema changes are made**. As drafted, a future reader could reasonably infer that the ordering applies to *this* rebuild only, and a later migration that touches `assets` could reach for the naive `DROP TABLE assets` ordering without consulting the rule. The general form is stronger and shorter:

> **NEVER drop a table that another table references with `ON DELETE CASCADE` while the referencing rows exist.** A table rebuild must rebuild the *referencing* table first, without its foreign-key clause, and re-add the foreign key afterwards. This applies to every schema change in this repository, not only to the MVP's rebuild.

The general rule is what a code reviewer or an agent working the migration would actually consult. The specific four-step sequence for the MVP's rebuild belongs in the migration's own comment and in the architecture artifact, not in the team's standing rules — where it will go stale the moment a third table is added.

### 9. Two claims in the draft I checked and could not confirm, and one I checked and could

For completeness, so the lead knows what I verified rather than assumed:

- **Confirmed:** 66/66 tests pass (`npx vitest run`, 657 ms) — the draft's baseline is correct.
- **Confirmed:** the `require` graph is a strict tree with no cycles; `routes` imports only `express` and `../services/asset-service`; `services` imports only `../repositories/assets-repo`; `views/` is reached only via `res.render`.
- **Confirmed:** `ALLOWED_STATUSES`, `ALLOWED_CATEGORIES`, and `TRANSITIONS` are exported but have **zero external consumers**.
- **Confirmed:** 14 of 14 JS files open with `'use strict';`; the named-object export shape holds in 7 of 8 `src/` files with `src/routes/assets.js:94` the sole bare-function exception.
- **Confirmed:** trailing commas are present in object/array literals and **absent** in function call arguments.
- **Could not confirm from the artifacts alone, now verified by execution:** the Prettier and ESLint findings above. The `code-quality-assessment` artifact records only the *absence* of tooling; it makes no claim about how the existing style would fare against a specific tool, and neither did the lead's draft until it asserted conformance. That assertion is the load-bearing error in this review, and it was only findable by running the tool.

---

## Positions

- AGREE: Adopt Prettier and ESLint as the org rule's named JavaScript defaults — they are the right tools, and the point of adopting them is to make the existing self-consistent convention enforceable rather than to restyle the codebase.
- AGREE: Keep `master` as the trunk name rather than renaming to `main` during a release that also rebuilds two tables; the org default applies in shape, and the rename would touch every document naming the branch.
- AGREE: Keep the `err.code` domain error contract, the single translation point in the error middleware, and the "tests assert on `code`, never on the message" discipline — these are the codebase's strongest conventions and must survive the MVP.
- AGREE: The four `## Way of Working` git-history claims about trunk shape, single author, branch name, and absence of a remote — all four verified correct.
- AGREE: The `## Walking Skeleton` reading (skeleton off, foundation workstream as the de-facto first slice) — the release's greenfield core sits on a brownfield foundation whose rebuild ordering is already fixed, so a throwaway end-to-end path would exercise the migration twice.
- AGREE: The `## Code Style` framing that adding a linter and formatter is new capability work to be estimated, not enforcement of an existing standard — the org rule has nothing to defer to, and the draft is right to say so.
- AGREE: Treat the five MVP surfaces as greenfield rather than as a unification of existing counting logic — I confirmed independently that there is no `COUNT` query, no dashboard, no directory, no CSV writer, and no actor concept anywhere in `src/`, `tests/`, or `views/`.
- OBJECT: The claim that "the existing code already conforms to Prettier's defaults with only one deliberate exception (single quotes)" — verified false: all 14 tracked JS files fail `prettier --check`, and the gap is print width (~120 columns used vs Prettier's 80) plus about 120 lines of mechanical re-layout, not quote style.
- OBJECT: The decision to defer the ESLint strictness question to the human on the stated premise that a strict set would cause "an unrelated mass diff" — `js.configs.recommended` passes `src/` cleanly and fires on exactly one rule in 13 test-file sites, fixable by a config-only test-scoped override.
- OBJECT: The proposed `lint` and `format:check` scripts as described — `format:check` must exclude `views/` (Prettier cannot parse EJS) and `public/` (a 200-line stylesheet rewrite), and `lint` must be scoped to `src tests vitest.config.js` so it does not lint the `aidlc/` and `.claude/` workflow tooling.
- OBJECT: The claim that "trailing commas" is a repo-wide convention — the codebase uses trailing commas in object and array literals but not in function call arguments (`src/repositories/assets-repo.js:67,104`; `src/services/asset-service.js:44`), which means Prettier's `trailingComma: "es5"`, not `"all"`.
- OBJECT: The preserved "layering" convention as written — with only `routes → services → repositories → db` and no shared-definition layer, the four count-consuming surfaces and the templates cannot consume one vocabulary, which is the structural cause of the six-way duplication the MVP must remove.
- OBJECT: The omission of a rule that a shared vocabulary rendered by a template must arrive as render data — `views/list.ejs:10-16` and `views/detail.ejs:26-49` hardcode the status list, so a `src/domain/` layer without this rule leaves two of the six copies in place.
- OBJECT: The omission of the SQLite error-detection rule — `better-sqlite3` supplies machine-readable `err.code` values (`SQLITE_CONSTRAINT_UNIQUE`, `SQLITE_BUSY`, verified live) that `src/repositories/assets-repo.js:70` discards in favour of a message-text match, and the MVP's `SQLITE_BUSY` mapping depends on exactly this discriminator.
- OBJECT: The framing of the preserved domain error codes as a complete vocabulary — the MVP's standing condition requires a *retryable* error, and no code in the current five (`VALIDATION_ERROR`, `DUPLICATE_ASSET`, `NOT_FOUND`, `INVALID_TRANSITION`, `INVALID_STATE`) is retryable.
- OBJECT: The omission of the "one transaction per transition" rule — a `try/catch` around two statements in a synchronous driver is not a rollback, so the asset write and the audit write must be one transaction for Audit Completeness to be achievable.
- OBJECT: The `evidence.md` and `team-practices.md` figure of "12 commits" — `git rev-list --count HEAD` returns 11, and the draft's own shortlog line ("11 by `asibur-bs`") contradicts the count in the row above it.
- OBJECT: The claim that commit subjects are imperative "matching the existing history" — the three application commits are `Initial Commit`, `Second Commit`, and `Third Commit`, so the rule is right but the claim of an existing match is not.
- OBJECT: The omission, from `## Way of Working`, of the commit-level chunking rule that the foundation workstream is indivisible and that a migration and the test that proves it land in the same commit — this is what makes the trunk safe against a silent audit-history loss.
- OBJECT: The scope of the migration-ordering rule in `discovered-rules.md`, written as a one-off instruction for this rebuild rather than as the general constraint that a table with a cascading reference must never be dropped while the referencing rows exist.
