**Collaborator:** aidlc-devsecops-agent

## Contribution

My remit is lint/format rules, SAST/DAST, secret and dependency scanning, and
supply-chain controls. I reviewed the lead's draft against the repository and
verified the load-bearing claims by execution rather than by reading. Everything
below is either a direct observation of the current code, or a recommendation
the human can accept, amend, or reject at interview.

The headline: **the draft's `## Deployment` section is not the right home for
this initiative's security posture, and it has no security section at all.** The
draft treats the three MVP security obligations (actor trust, CSV
formula-injection, no secrets) as deployment-side implications. They are not.
All three are *code and test* obligations that happen to have a deployment
consequence. The draft's `## Code Style` section does carry two real security
control families already — the prepared-statement rule and the EJS-escaping rule
— but it presents them as *style*, which means a future reader is free to
conclude they are cosmetic. They are not.

I have organised this into: what I verified, a recommended minimal security
posture, supply-chain findings, the append-only question, and the specific
integration points for the four artifacts.

---

### 1. What I verified by execution

| Claim | Method | Result |
|---|---|---|
| The runtime dependency tree is free of known vulnerabilities | `npm audit --omit=dev` | **0 vulnerabilities** across 113 production packages. The prod tree is clean. |
| The development dependency tree has known vulnerabilities | `npm audit` (all) | **10 vulnerabilities: 3 critical, 1 high, 6 moderate.** All 10 are in the Vitest toolchain. |
| Which packages are affected | `npm audit` per-advisory | `vitest` (critical, direct), `@vitest/coverage-v8` (critical, direct), `tinypool` (critical), `vite` (high), plus `vite-node`, `@vitest/mocker`, `esbuild`, `glob`, `minimatch`, `test-exclude`. **No runtime package is affected.** |
| The audit gate is usable in CI | `npm audit --audit-level=high --omit=dev; echo $?` | **exit=0**. `npm audit` exits non-zero only when a finding is at or above `--audit-level`, so it can gate a pipeline directly. |
| `audit_log` is append-only only by convention | `UPDATE audit_log SET description='tampered'` | **The UPDATE succeeded.** Nothing in the schema prevents mutating a historical audit row. Append-only is a *code convention*, not a *database guarantee*. |
| The `ON DELETE CASCADE` destroys history | `DELETE FROM assets` with one audit row | Confirmed: audit rows go 1 -> 0, transaction committed, no error raised. |
| A database-level append-only guard is feasible | `CREATE TRIGGER audit_log_no_update BEFORE UPDATE ON audit_log BEGIN SELECT RAISE(ABORT, ...); END;` (same for `BEFORE DELETE`) | **Both triggers were created successfully and both fire.** `UPDATE` -> aborted. `DELETE` -> aborted. Critically, the `BEFORE DELETE` trigger on `audit_log` **also blocks the cascading `DELETE FROM assets`**, because the cascade is executed as an implicit delete on the child table and the trigger intercepts it. Audit rows survived the delete attempt. This is a *usable* mechanism, not a theoretical one. |
| The audit table has nowhere to put an actor | `PRAGMA table_info(audit_log)` | Columns are `id, asset_id, action, description, created_at`. **No actor column.** The MVP's actor attribution is a schema change, not a code change. |
| The application reads no actor-ish input today | `grep req.headers / req.get / req.user` across `src/` | **Zero hits.** No header, no session, no cookie handling anywhere. The actor-trust rule currently has nothing to violate — and nothing to rely on. |
| `audit_log` accepts arbitrary `UPDATE`/`DELETE` from any code path | live probe above | Confirmed — there is no repository function that mutates an audit row, but the schema permits it. |
| The app leaks a fingerprinting header | live HTTP request to `/assets` | **`x-powered-by: Express` is present.** No `content-security-policy`, no `x-content-type-options`, no `x-frame-options`, no `strict-transport-security`. |
| The forms have no CSRF token | `grep form / csrf / token views/*.ejs` | **Every form is a bare `<form method="post">` with no token.** There is no session, no cookie, no CSRF middleware anywhere in `src/`. |
| The server binds all interfaces | `src/server.js:14` | `app.listen(PORT, ...)` with no host argument -> **binds `0.0.0.0`**, not `127.0.0.1`. |
| The EJS templates escape correctly | `grep '<%' views/*.ejs` | **All user-supplied values use `<%= %>` (escaped).** The only `<%-` uses are `include()` directives and the dead `views/_layout.ejs`. No unescaped interpolation of user data. This is a genuine strength worth protecting. |
| SQL is parameterised | `src/repositories/assets-repo.js` | Every value is a `?` placeholder. The two dynamic fragments are a `WHERE` clause assembled from fixed strings, and a sort column whitelisted to a literal. **No SQL injection surface.** Another genuine strength. |
| No secrets exist anywhere | `ls .env*`, `grep -riE 'password|secret|api_key|token|credential' src/ views/ public/` | **No `.env` file. No credential-like string in `src/`, `views/`, or `public/`.** The draft's claim that the app holds no credentials is correct. |
| The lockfile is present and consistent | `package-lock.json` (lockfileVersion 3, 292 entries), `npm ls --depth=0` | 113 prod, 179 dev, 51 optional. Resolved: `express@4.22.3`, `ejs@3.1.10`, `better-sqlite3@11.10.0`, `vitest@2.1.9`. |
| The native addon has an install-script fallback | `node_modules/better-sqlite3/package.json` | `"install": "prebuild-install || node-gyp rebuild --release"`. Confirmed. |
| Other packages with install scripts | lockfile scan | Three total: `better-sqlite3` (prod), `esbuild` (dev), `fsevents` (dev, macOS-only optional). `node-gyp` is **not** a lockfile entry — it comes from the npm-bundled toolchain when the fallback fires. |

---

### 2. Recommended minimal security posture — and what I explicitly recommend *against*

The question I was asked is whether a 12-tool stack is warranted for a 12-file
app. It is not. Here is the posture I believe is proportionate, with the
reasoning for each inclusion and exclusion.

**Adopt — in the pipeline that the draft already proposes:**

1. **`npm audit --audit-level=high --omit=dev` as a CI gate.** This is the
   single highest-value, lowest-cost control available. It exits 0 today. It
   would have caught the entire class of issue in the dev tree. The `--omit=dev`
   flag matters: the production tree is clean, so this gate will not block on
   the Vitest advisories while still catching a future runtime advisory. The
   dev-tree findings should be handled separately and explicitly (see below),
   not by relaxing the runtime gate.

2. **A secret scan.** Not because this repository currently needs it — it has
   no secrets and no `.env` — but because the release is about to add an
   actor-identity mechanism, and that mechanism is the single most likely place
   a credential or a token-handling mistake enters the codebase. The cheapest
   durable form for a single-developer repo is a `git grep`-based pre-commit
   hook scanning for a small set of high-signal patterns, plus an explicit
   rule that `.env` and `*.pem` stay untracked. This is ~20 lines, has no
   dependency, and cannot rot the way a forgotten CI config does. A hosted
   scanner (gitleaks, trufflehog) is **not** worth it here — there is no remote,
   no pull-request flow, and no second reviewer to consume its output.

3. **A SAST pass over the diff — but as part of the linter, not as a separate
   tool.** ESLint with `eslint-plugin-security` (or `eslint-plugin-no-unsanitized`
   for the EJS surfaces) gives the majority of the value of a standalone SAST
   product on a codebase this size, at a cost of one dev-dependency and one
   config block. The draft already proposes ESLint; I am proposing that the
   security-relevant rules ride along in the same config and the same pipeline
   step rather than introducing a parallel scanner. This is the difference
   between a 3-tool posture and a 12-tool posture.

**Do not adopt — with reasons:**

- **A standalone SAST product (Semgrep, CodeQL, Fortify).** Over-engineered.
  The codebase has no SQL injection, no command execution, no deserialisation,
  no template injection, no auth code, and no crypto code. I checked for each
  of those sinks specifically. There is nothing for a SAST product to find
  that a targeted ESLint rule set will not find, and a full SAST product
  produces a first-run report of hundreds of findings that a single developer
  will learn to ignore — which is worse than no report, because it creates
  false confidence.
- **DAST.** The application has **no authentication and no session**, so
  almost every meaningful DAST check is inapplicable. The two DAST classes
  that *would* apply — CSRF and header hardening — are both better handled by
  construction than by scanning: assert the absence of `x-powered-by` and the
  presence of the headers you want in a `supertest` test, and assert that a
  state-changing POST without a valid origin is rejected. That is a test, it
  lives in the suite, it cannot silently expire, and it costs nothing.
- **Container image scanning (Trivy, Grype).** There is no `Dockerfile`, no
  `docker-compose.yml`, and no container definition anywhere. Scanning an
  image that does not exist is theatre. **However** — see §4, the native addon
  means the real supply-chain artefact here is the *install step*, not an image.
- **IaC scanning (Checkov, cfn-lint, tfsec).** There is no IaC. The MVP
  deploys to one existing host with a documented `npm install / npm start`
  sequence. Nothing to scan.
- **A secrets manager or vault.** The application holds no credentials and
  makes no outbound calls. The draft's statement that "the application makes
  no outbound network requests, holds no credentials, and needs no secret
  store" is **verified correct**, and adding a secrets manager for zero
  secrets is pure cost. The right practice is the *rule* that keeps it at
  zero — not infrastructure.

**One thing the draft is right to omit but should state as a deliberate
decision:** the absence of DAST, container scanning, and IaC scanning should
not be silent. The draft already has a "What we did not adopt, and why"
subsection in `## Code Style` (`team-practices.md:389-411`). The same
subsection should exist for security tooling, with the reasons above. An
unexplained absence reads as an oversight; a stated absence reads as a
decision. This matters for the `feature` scope's CI expectation — a reviewer
asking "why is there no SAST?" gets an answer that names the reason and the
substitute control.

---

### 3. Supply chain — the specific findings

**3a. The `^` ranges are a finding, and the fix is not "pin everything".**

`package.json:19-28` declares `express: ^4.21.0`, `better-sqlite3: ^11.3.0`,
`ejs: ^3.1.10`, `vitest: ^2.1.2`, `@vitest/coverage-v8: ^2.1.9`,
`supertest: ^7.0.0`. The caret permits any compatible minor/patch. For a
production dependency that a single host will run for the life of the MVP,
that means the version actually deployed can drift from the version tested,
and nobody decides that drift. The lockfile pins it — but only if the install
step uses the lockfile.

**The concrete practice:** use `npm ci`, not `npm install`, in every
non-interactive context (CI, the deploy procedure, and the documented setup
path). `npm ci` installs exactly the lockfile tree and fails if
`package.json` and the lockfile disagree. `npm install` can silently update
the lockfile and the installed tree. This is a one-word change with a large
effect and zero cost, and it is the single most valuable supply-chain control
available to this repository. The draft's `## Deployment` section does not
mention it, and `README.md:5-12` documents `npm install` as the setup command.

**On pinning:** I recommend *not* converting `^` to exact versions for the
runtime dependencies. The lockfile already provides the exact pin for every
install that uses `npm ci`, and exact-version ranges fight the ecosystem's
security-update path (the next `express` advisory would require a manual
`package.json` edit). The right combination is: `^` ranges in `package.json`
for expressibility, `npm ci` for reproducibility, and the audit gate for
vulnerability detection. Pinning exact versions *in the lockfile* is what npm
already does.

**3b. `better-sqlite3` and the `node-gyp` fallback.**

The install script is `prebuild-install || node-gyp rebuild --release`. The
`prebuild-install` path downloads a prebuilt binary from GitHub releases. If
that download fails — network restriction, proxy, GitHub outage, or a platform
without a published prebuild — the fallback compiles the addon from source
using `node-gyp`, which requires a full C++ toolchain and, critically, means
the build **executes code from the dependency's source tree** on the host.

Three distinct concerns, and they should not be conflated:

1. **Build-time code execution.** This is the real supply-chain risk in this
   repository. A compromised `better-sqlite3` release runs arbitrary code at
   `npm install` time on the developer machine and on the deploy host. It
   cannot be fixed by pinning alone, but it can be *reduced* by `npm ci` +
   audit + reviewing dependency updates.
2. **Non-reproducibility.** A `node-gyp` fallback build produces a different
   binary than the prebuilt one, against whatever system SQLite headers are
   present. The deployed artefact then differs from the tested one in a way
   nobody records. This is the strongest argument for `npm ci` and for pinning
   the toolchain image/host.
3. **Build reproducibility in CI.** The proposed pipeline must install the
   native addon. If the CI runner's Node version or libc differs from the
   deploy host's, the addon compiles differently. The pipeline should record
   the Node version and platform it built on, and the deploy host should match
   it. `engines.node: >= 20.0.0` is a *range*, and the verified runtime is
   Node v20.20.0 — the pipeline and the host should pin the same minor.

**The practice I recommend:** `npm ci` everywhere; a documented rule that
`better-sqlite3` upgrades are treated as a *security-relevant* change requiring
the audit gate to pass and the test suite to run before merge; and an explicit
acknowledgement that the `node-gyp` fallback is an accepted risk for a
single-host internal tool, recorded rather than eliminated. I do **not**
recommend an npm `overrides` block. There is no transitive dependency in this
repository that is known to be mis-resolved, `overrides` adds a second source
of truth for versions that the lockfile already governs, and it is the kind of
block that silently becomes wrong.

**3c. The lockfile's unanalysed transitive closure.**

The `dependencies.md` artifact records this as a shallow scope area, and the
lead has carried it forward honestly. I can now close it substantially: **the
production closure is 113 packages and `npm audit --omit=dev` reports zero
vulnerabilities across all of them.** That is a materially different statement
from "not analysed". The posture I recommend for the release:

- Run the audit gate against the **production** tree (`--omit=dev`) as a
  merge-blocking CI step. It passes today and will catch a future runtime
  advisory.
- Run the audit against the **development** tree as a **non-blocking
  advisory** step, and triage it deliberately rather than letting it decay.
- Record, as a one-line practice, that the prod closure is what ships and the
  dev closure does not. This distinction is what makes `--omit=dev` a
  defensible choice rather than a convenient one, and it should be written
  down so a future reader does not "fix" the flag.

**3d. The dev-tree findings are real and should be dispositioned, not ignored.**

`vitest@2.1.9` and `@vitest/coverage-v8@2.1.9` carry 3 critical and 1 high
advisory. The fix is `vitest@4.1.12` / `@vitest/coverage-v8@5.1.0`, both
**semver-major**. Upgrading a test runner across two majors in the same
release as a schema rebuild is a self-inflicted wound — it will change
coverage semantics, possibly the `globals`/CommonJS interaction the
`technology-stack` artifact explicitly records as a constraint
(`vitest.config.js:10` sets `globals: true` because Vitest 2.x rejects globals
under CommonJS), and it will perturb the 66/66 baseline the whole release is
gated on.

My recommendation: **do not upgrade Vitest in this release.** Instead:
record the 10 findings with their IDs and the reason for deferral; note that
all 10 are in a dev-only toolchain that never executes in production; and
schedule the upgrade as a named follow-on item with the two known risks named
(globals-under-CommonJS behaviour, and the coverage-provider threshold
semantics that the draft's 80% floor depends on). If the human prefers to
upgrade now, it must be a **separate commit before any MVP work**, exactly as
the draft already proposes for the linter config — the same "separate first
commit" reasoning applies, and the draft's own `## Code Style` section
(`team-practices.md:384-387`) already sets that precedent.

Note also: `esbuild` and `fsevents` have install scripts. `esbuild@0.21.5`
carries a moderate advisory (`GHSA-67mh-4wv8-2f99`, dev server request
forgery) — again dev-only. `fsevents` is macOS-only optional. Both are
`hasInstallScript: true` and therefore worth recording in the same
install-script inventory as `better-sqlite3`.

---

### 4. Audit history integrity — a security finding, not only a data-integrity finding

The draft's `discovered-rules.md` `## Forbidden` section has a "NEVER destroy
audit history" rule (`discovered-rules.md:160-170`) and correctly ties it to
the verified migration ordering. That is right. But the draft stops at
*migration ordering*, and my probe shows the guarantee is weaker than the
draft implies in two ways.

**Finding A — append-only is a convention, not an enforcement.** The
`architecture` artifact's D4 already states this correctly ("append-only in
intent, but not enforced"), but the draft's `## Forbidden` rule does not
carry the distinction into the practices. My probe confirms `UPDATE audit_log
SET description='tampered'` succeeds with no error. There is no repository
function that does this — `recordAudit` only inserts
(`src/repositories/assets-repo.js:109-114`) — but the schema permits it, and
the MVP's own success measure is **Audit Completeness**, which is a
*compliance-flavored* measure: an audit trail whose rows can be silently
rewritten is not an audit trail.

**Finding B — the cascade is reachable from the migration runner, not only
from a hypothetical delete.** The draft treats the cascade as dormant because
no code path deletes an asset (`architecture.md` D5: "no delete endpoint, no
delete repository function, and no delete test"). True today. But the MVP
*adds* asset editing (`updateAsset` at
`src/repositories/assets-repo.js:80-107` writes `status` from an arbitrary
patch with no transition validation and no audit write — code-quality-assessment
item 9), and the MVP's `assigned → discarded` transition *resolves* an
assignment inline. A discard is semantically adjacent to a delete. If any
future code path reaches `DELETE FROM assets`, the cascade silently destroys
the history the MVP's primary success measure is computed from, with the
transaction committed and no error raised.

**The practice I recommend, and it is the most concrete security
recommendation in this contribution:** enforce append-only at the **database
layer**, not at the application layer, and enforce it in the same migration
that rebuilds `audit_log` for the actor column.

I verified this is achievable with plain SQLite triggers and no new
dependency:

```sql
CREATE TRIGGER audit_log_no_update BEFORE UPDATE ON audit_log
BEGIN SELECT RAISE(ABORT, 'audit_log is append-only'); END;

CREATE TRIGGER audit_log_no_delete BEFORE DELETE ON audit_log
BEGIN SELECT RAISE(ABORT, 'audit_log is append-only'); END;
```

Both were created and both fire on a live database built from the current
schema. The `BEFORE DELETE` trigger additionally **blocks the cascading
delete of the parent asset row**, because the cascade is executed as an
implicit delete on the child table and the trigger intercepts it — so the
trigger is not merely a guard on the audit table, it is a guard on the
*history* in the presence of the cascade. This makes the append-only
guarantee robust against the ordering hazard the architecture artifact
already identified, and it makes it robust against *any* future delete path,
including one the MVP's own editing feature might introduce.

This is a **design constraint on the migration**, exactly as the
migration-ordering constraint is, and it belongs in the same place: it must be
planned into the `audit_log` rebuild, not retrofitted afterwards. It also
gives the `audit_log` rebuild a purpose beyond adding the actor column, and
it gives the forbidden-rule a mechanical enforcement point.

**Is this over-engineering?** No, and here is the test I applied: does the
control cost anything beyond one migration's worth of DDL? It does not — two
triggers, no dependency, no runtime cost. Does it close a gap that the
release's own primary success measure depends on? Yes. Is the alternative
(app-layer convention only) sufficient? No — I demonstrated a one-line UPDATE
that silently rewrites history. For a compliance-flavored control, "the code
currently never does this" is a weaker guarantee than "the database refuses to
let it".

**On the open FK question:** the `architecture` artifact records two open
questions — whether removing the cascade leaves `DELETE FROM assets` blocked
(yes, verified) and whether `ON DELETE SET NULL` is acceptable (it changes
`asset_id` from `NOT NULL` to nullable). Those remain the architect's
decisions and I am not pre-empting them. The trigger approach is
*complementary* to that decision: it makes the audit row undeletable
regardless of which FK action is chosen, and it makes the asset-row delete
fail loudly rather than silently. If the architect chooses `SET NULL`, the
trigger still guarantees the row survives with its content intact. If the
architect chooses a plain `RESTRICT`/no-action FK, the trigger is belt-and-braces
on the child table. Either way the history is protected.

**Classification.** The cascade is **both** a security finding and a
data-integrity finding, and the draft should say so. It is a security
finding because the asset is a custody record and the audit trail is its
attribution record; silently destroying attribution evidence is a loss of
auditability, not merely a loss of rows. It is a data-integrity finding because
the migration ordering constraint follows from it. The draft's `## Forbidden`
rule currently frames it only as the latter.

---

### 5. The actor-trust rule — what can be stated now without pre-empting the decision

The brief asks whether the actor-trust rule belongs under `## Deployment`. It
does not, and I want to be precise about why.

The actor-trust rule is a **code-layer invariant** on the write path: no
request-supplied field may become the actor. That is a constraint on how the
foundation workstream is *implemented*, and it will be verified by
route-level tests. `## Deployment` is about how the artefact reaches the host
and how it is recovered. The rule is currently parked there because
`evidence.md:236-241` notes it "does not change any practice in this file" —
that is the signal that it is in the wrong section. It also creates a false
impression that the actor is a *deployment* concern (a deploy-time
configuration, perhaps), when it is a trust-boundary concern in the request
path.

The mechanism is genuinely undecided (I-01 / I-03, four candidates). But the
*shape* of a correct implementation can be constrained now without choosing
the mechanism. The four candidates — server-side session, trusted header from
a reverse proxy, an OS/environment-derived identity, or a single-operator
deployment — differ in mechanism but share a property that any of them must
satisfy. **Stating that shared property is not pre-empting the decision; it is
constraining the decision's outcome, which is exactly what a security practice
is for.**

**The practice I recommend stating now:**

> The actor is resolved by the server from a context the client cannot
> influence. Whatever mechanism is chosen, the actor value that reaches
> `audit_log.actor` MUST NOT be derivable from a request body field, a
> query-string parameter, or a request header that the client can set
> directly. A request-supplied actor is ignored — not rejected, not
> sanitised, *ignored* — and the server-side value is used.

This is the rule the project already has (the actor-trust rule, workbook
section 4.3). My addition is the **negative specification** of which
mechanisms are inadmissible, which makes the decision tractable: an
implementation that reads `req.body.actor` or a client-settable
`X-Actor` header is not an admissible resolution of the actor-trust rule,
whatever it is called. That constrains the four candidates without selecting
one. It also makes the rule *testable*: the draft already proposes
"route-level tests that assert a request-supplied actor is never trusted"
(`team-practices.md:185`) — the rule should say what such a test asserts, so
the test is not written to match whatever the implementation happened to do.

**One practical observation for the design-board checkpoint.** Whatever
mechanism is chosen, the resolution point matters. Today the audit write
happens in the repository (`recordAudit`, called from the service layer).
The actor must reach that call from a server-side context. A clean shape is:
the router resolves the actor once, from trusted context, and passes it down
through the service to the repository — so there is exactly one resolution
point, it is in the HTTP layer where trusted context lives, and no repository
function can be called with a request-derived actor by accident. That is a
shape recommendation, not a mechanism choice: it is compatible with all four
candidates.

**A second observation, and it is a security finding about the *current*
code:** `audit_log` has no actor column today, and `recordAudit`
(`src/repositories/assets-repo.js:109-114`) takes `(db, assetId, action,
description)` — there is nowhere for an actor to go. So the actor-trust rule
cannot be implemented as a code change alone; it requires the `audit_log`
rebuild. The draft lists the rebuild as a foundation item, and this is
further evidence that the actor decision and the rebuild are one indivisible
workstream, not two.

---

### 6. CSV export formula-injection protection — a rule is needed, and it is a code rule

The MVP mandates CSV export with formula-injection protection
(`dependencies.md`: "no CSV library... formula-injection protection must be
implemented either way"). The draft mentions it exactly once, in the testing
paragraph: "CSV export gets service- and route-level tests that assert the
formula-injection protection" (`team-practices.md:182-184`). That is a
*verification* statement, not a practice. The implementation of the protection
is unspecified, and that is exactly where it will regress.

**What the protection must do.** A CSV cell is interpreted as a formula by
Excel, LibreOffice Calc, and Google Sheets when the cell's content begins with
one of `=`, `+`, `-`, `@`, or a leading tab/CR followed by any of those. I
confirmed the character set that matters. The mitigation is to **prefix the
cell with a single quote (`'`)**, or to neutralise the leading character, for
every cell whose first character is in that set — and critically, to apply it
to **every** cell, including `name`, `notes`, `model`, `assigned_to`, and the
actor, not just the serial. `name` and `notes` are free-text fields typed by
a user into an HTML form (`views/new.ejs`), so they are attacker-controlled
in any scenario where more than one person can register assets.

**The specific practice I recommend:**

> The CSV export prefixes every cell whose first character is one of `=`, `+`,
> `-`, `@`, tab, or carriage return with a single quote (`'`) before quoting.
> The prefix is applied to **all** string cells, not to a selected subset of
> columns. The protection lives in one shared escaping function used by the
> CSV writer; it is not reimplemented per column or per surface. A
> regression test asserts that a cell beginning with `=` is exported with the
> prefix, and that a cell beginning with a benign character is exported
> unchanged.

Three reasons this needs to be a rule and not a code-review catch: the
escaping function will be reimplemented when the exporter is refactored or a
second export surface appears; the character set is easy to get partially
right (most implementations cover `=+-` and miss `@` and the tab/CR forms); and
the "all cells, not a subset of columns" property is the part that gets lost
when someone adds a column later and assumes the safe columns are the only
ones that need it. **"One shared escaping function, applied to every string
cell"** is the enforceable form. It is also the same *shape* of rule the
project already uses for the uniqueness definition ("one shared definition
consumed by several surfaces" — `project.md` `## Decided`), so it is
consistent with the team's existing idiom rather than a new concept.

The test the draft proposes is right; it just needs to name the character set
and the "all cells" property so the assertion is pinned to behaviour rather
than to the implementation.

**Second CSV issue the draft does not mention: the response header.** A CSV
export must be served with a content type that does not cause the browser to
render it, and must not be sniffable as something else. `Content-Type:
text/csv; charset=utf-8` with `Content-Disposition: attachment` is the
minimum. This connects to §7 below: the application currently sets **no**
security headers at all.

---

### 7. HTTP hardening — two findings that are cheap and currently absent

I verified the live response headers. The application returns
`x-powered-by: Express` and sets **no** `content-security-policy`, **no**
`x-content-type-options`, **no** `x-frame-options`, and **no**
`strict-transport-security`.

**7a. `x-powered-by` should be disabled.** One line:
`app.disable('x-powered-by')`. It removes the framework fingerprint from every
response. This is trivially cheap and is the one security header change with
no trade-off. It is not an exploit mitigation on its own, but it is free.

**7b. `X-Content-Type-Options: nosniff` should be set.** One line. The
application serves a static directory (`public/`) and renders HTML. `nosniff`
prevents a browser from re-interpreting a served resource as a type the server
did not intend. Note the connection to the CSV export: a CSV served without
`nosniff` and without a correct `Content-Type` can be sniffed by the browser
as HTML, and a cell beginning with `<script>` would then execute. This makes
the CSV content-type requirement and the `nosniff` header a single control
rather than two.

**7c. A CSP is worth considering but the cost/benefit is genuinely marginal
here.** The application serves no inline scripts and no third-party assets. A
strict CSP (`default-src 'self'`) is a handful of lines. But the application
also has no authentication and no user-supplied HTML (EJS escapes everything —
verified above), so the marginal attack surface CSP would close here is
close to zero. **My recommendation: set `X-Content-Type-Options` and disable
`x-powered-by`; do not adopt a CSP in this release**, and say so explicitly
rather than leaving it silent. If the MVP adds the design system with inline
styles or a client-side component later, that is the trigger to revisit.

**7d. CSRF — a real finding, and it must be handled honestly.**

Every mutating form is a bare `<form method="post">` with no CSRF token
(`views/new.ejs:10`, `views/detail.ejs:27,32,35,40,43`), there is no session,
no cookie, and no CSRF middleware. The application also binds `0.0.0.0`, not
`127.0.0.1`.

There is a genuine subtlety here, and the draft should not paper over it. A
CSRF attack requires the victim's browser to attach credentials to the
attacker's forged request. **This application has no credentials.** So the
classic CSRF attack — a logged-in victim's session being abused — does not
apply today, because there is no session to abuse.

**But the situation changes the moment the actor-identity mechanism is
chosen.** If the actor is a session cookie, or a trusted reverse-proxy header
that the browser would send, then CSRF becomes a live attack: an attacker
tricks the operator into a POST that attributes an audit row to the operator.
That is *worse* than a generic CSRF here, because the attack corrupts the
attribution record that is the MVP's primary success measure. **The actor-identity
decision therefore has a direct security consequence for the write path, and
the mechanism choice should be assessed against it.**

The practice I recommend, which constrains the decision without making it:

> If and only if the chosen actor mechanism relies on a cookie, a session, or
> any other browser-attached credential, the write path MUST reject
> state-changing requests that do not carry an origin the server recognises,
> or MUST carry a CSRF token. Whichever is chosen, a route-level test asserts
> that a state-changing POST without it is rejected.

This is deliberately conditional, because if the actor mechanism is
server-side-only (an OS identity, a fixed single-operator deployment), CSRF
may be genuinely inapplicable and adding a token library would be pure cost.
The rule states the *trigger* and the *obligation* and lets the mechanism
decision determine whether it fires. Note this is the same pattern as the
actor-trust rule: constrain the outcome, do not select the mechanism.

---

### 8. Secrets — the correct practice is a rule, and it is cheap

The verified position: no `.env`, no secrets manager, no credential in `src/`,
`views/`, `public/`, or `.mcp.json`; the application makes no outbound calls;
`dependencies.md` confirms it "holds no API keys, no tokens, and no
credentials, and requires no secret store". The draft's `## Deployment`
statement at `team-practices.md:218-220` is **correct and verified**.

So the practice is not "add a secrets manager". It is:

> The application holds no credentials and makes no outbound network calls.
> This is a property to be *preserved*, not a starting state to be improved.
> If the actor-identity mechanism introduces a credential, a token, a session
> signing key, or any outbound call, that change is a **security-relevant
> change**: it requires the audit gate to pass, and it must not introduce a
> committed secret file. `.env`, `*.pem`, and `*.key` are never committed;
> `data/` and `*.sqlite*` are already gitignored (`.gitignore:87-92`) and that
> stays true.

The second half of that rule matters more than the first. The `.gitignore`
currently ignores `node_modules/`, `data/`, `*.sqlite*`, `coverage/` — it does
**not** ignore `.env`. Adding `.env` and `*.pem` to `.gitignore` is a one-line
change made *before* the mechanism is chosen, so that the mechanism's
implementation never has a reason to un-ignore it. That is the right time to
make the change: before there is pressure, not after.

**On a pre-commit secret scan:** yes, worth it, and it is the cheapest
control on this list. A `git grep -nE` over the staged diff for a small set of
high-signal patterns (AWS key prefixes, `-----BEGIN * PRIVATE KEY-----`,
`ghp_`, `sk-`, `xox[baprs]-`, and a generic `password|secret|api_key` assignment
with a non-empty value) is about twenty lines, needs no dependency, and cannot
be forgotten because it runs at commit time rather than review time. Given
that this repository has **no git hooks at all** today (`.git/hooks` contains
only samples), a pre-commit hook is *new* capability work and must be
recorded as such — the same honesty the draft applies to the linter and CI.

**A note on `.mcp.json`.** It registers `context7`, `aws-mcp`, `aws-pricing`,
`aws-iac`, `aws-serverless`. The `dependencies.md` artifact correctly states
these are development-harness tooling, not application dependencies, and that
no application code loads them. I checked: no `src/` file reads them. They are
committed and contain no credential. But they *are* MCP server registrations
that a future developer could reasonably extend to a server that *does* need a
credential — and MCP server configurations are a common place for API keys to
be committed in plaintext. This belongs in the secret-scanning rule's scope:
MCP server registrations are in scope for the secret scan, even though they
are not application code.

---

### 9. Where the draft is over-engineered, and where it is dangerously under-specified

**Over-engineered:** nothing significant in the draft's current content. The
draft does not propose a security tool stack, does not propose a container,
does not propose a secrets manager, and correctly recommends against a staging
environment, canary deployment, feature flags, and a PR-review requirement.
Its "What we did not adopt, and why" subsection (`team-practices.md:389-411`)
is exactly the right pattern — the same subsection is needed for security
tooling, and its absence is the one piece of over-specification-by-omission
I found. If the human reads "no SAST mentioned" as "SAST not considered", the
release ships without the audit gate that would have cost nothing.

**Dangerously under-specified, in priority order:**

1. **No dependency or audit practice at all.** Not mentioned anywhere in the
   draft. The `## Testing Posture` CI pipeline is described as
   "lint (once a linter exists) → test → coverage check"
   (`team-practices.md:196-198`) — **the audit step is missing**. This is the
   single most consequential omission in the draft. It is one line in the
   pipeline, it passes today, and it is the control that would catch a future
   `express` or `ejs` advisory. The pipeline description should become
   `lint → test → coverage → audit`.
2. **No supply-chain practice.** `npm ci` is not mentioned; the `^` ranges are
   not addressed; the `node-gyp` fallback is not acknowledged; the
   `hasInstallScript` inventory does not exist. The `## Deployment` section
   describes the deploy as "apply migrations, restart the process" — it does
   not say *how the dependencies get onto the host*.
3. **No secret-handling practice.** The draft correctly observes that there are
   no secrets, but stops at observation. The rule that preserves that state,
   the `.gitignore` entry, and the pre-commit scan are all absent.
4. **No append-only enforcement mechanism.** The forbidden rule exists; the
   mechanism that would make it true does not. My probe shows the guarantee is
   currently a convention a single `UPDATE` breaks.
5. **The CSV formula-injection protection has no implementation rule** — only
   a test mention.
6. **No HTTP security headers and no bind-address statement.** `x-powered-by`
   leaks; `nosniff` is absent; the server binds `0.0.0.0` with no statement
   about whether that is intended for a single-host internal tool.
7. **The `## Deployment` section has no integrity check on the deployed
   artefact.** The smoke test verifies the *application's* behaviour
   (`team-practices.md:267-273`), but nothing verifies that the code on the
   host is the code that was tested. `npm ci` plus a recorded commit SHA in
   the deploy procedure closes this.

---

### 10. Specific integration points for the lead

**For `team-practices.md`:**

- **`## Testing Posture` — the CI pipeline.** Change the pipeline description
  from "lint → test → coverage" to "**lint → test → coverage → dependency
  audit**", and specify the audit step as
  `npm audit --audit-level=high --omit=dev` (verified exit 0 today). Add one
  sentence explaining that `--omit=dev` is deliberate because the production
  closure is what ships, and that the dev tree is triaged separately. Record
  the 10 dev-tree findings with their IDs and the deferral rationale.

- **`## Testing Posture` — a new subsection on supply chain.** `npm ci` (not
  `npm install`) in CI and in the documented setup path; the install-script
  inventory (`better-sqlite3` prod, `esbuild` and `fsevents` dev) and the
  `node-gyp` fallback risk; the `^`-range decision and why exact pinning is
  not recommended; the Vitest upgrade as a named follow-on with its two named
  risks.

- **`## Code Style` — reclassify two existing items as security controls.**
  The prepared-statement rule (`team-practices.md:348-351`) and the
  EJS-escaping rule (`team-practices.md:355-356`) are listed under "What we
  preserve", framed as style. Both are **security controls with an explicit
  threat model** (SQL injection; stored XSS). Reclassify them, and state the
  threat each prevents. The EJS rule deserves an explicit addition: **the
  `<%= %>` rule is the XSS control, and it must hold for the MVP's new
  surfaces** — the dashboard, the assignee directory, the CSV export, and the
  asset-editing screen will all render user-controlled strings. Note the
  distinction between `<%= %>` (escaped, the rule) and `<%- %>` (unescaped,
  the exception) — and note that `views/_layout.ejs` currently uses
  `<%- body %>` for a value that does not exist (it is dead code,
  code-quality-assessment item 13), so the MVP's new templates must not copy
  that pattern.

- **`## Code Style` — the linter configuration should carry the security
  rules.** `eslint-plugin-security` (or `eslint-plugin-no-unsanitized` scoped
  to the `views/` templates) is where the SAST value comes from for this
  codebase — one dev-dependency and one config block, riding the pipeline
  step the draft already proposes. This is what lets the draft say "no
  standalone SAST product" honestly.

- **A new `## Security` section.** The draft has no security section at all,
  and the three MVP security obligations are scattered across `## Deployment`
  and `## Testing Posture`. A single `## Security` section is the correct
  home for: the actor-trust rule (moved out of `## Deployment`), the
  append-only enforcement mechanism, the CSV formula-injection rule, the
  secret-handling rule, the HTTP header rules, and the "what we did not adopt
  and why" subsection for security tooling. This is one section, not a
  framework — the rules are short and each one has a named enforcement
  point.

- **`## Deployment` — three additions.** (a) The install step is `npm ci`,
  and the deploy records the commit SHA it deployed. (b) The backup procedure
  should note that the database file is the only stateful artefact, and that
  `*.sqlite-wal` and `*.sqlite-shm` exist in WAL mode
  (`src/db/index.js:15`) — **a backup that copies only `assets.sqlite` while
  the process is running can capture a torn or incomplete snapshot**, because
  WAL-mode committed data may still live in the `-wal` file. This is a
  concrete, cheap correction to the backup practice: either back up with the
  process stopped, or use SQLite's own `.backup` API, or copy all three
  files together while the process is quiesced. (c) The `## Deployment`
  section should state the bind address: `app.listen(PORT, ...)` binds
  `0.0.0.0`. If the single host should serve only the local network, say so
  and bind `127.0.0.1` plus a proxy, or state explicitly that all-interfaces
  is intended and accepted for an internal tool.

**For `discovered-rules.md`:**

The `## Mandated` / `## Forbidden` sections are, by the draft's own framing,
rules the *human* has already stated (the approved decision set, the org
rules, the upstream Ideation answers). The security rules I am proposing are
**mostly not** in that category — they are new practices derived from
engineering judgement and from my verified findings. They therefore belong in
`team-practices.md` as drafted recommendations and enter `discovered-rules.md`
only if the human affirms them at interview. I flag this because adding
`ALWAYS`/`NEVER` rules to `discovered-rules.md` without an affirmation would
contradict the file's stated contract (`discovered-rules.md:3-6`).

However, **four of them are derivable from the approved decision set and
standing conditions already in the file**, and should be added now with their
source named, because they are not new rules — they are the security
enforcement form of rules already present:

1. The **actor-trust rule already appears twice** (`discovered-rules.md:29-32`
   and `:144-148`) — correctly, as both Mandated and Forbidden. What is
   missing is the **inadmissible-mechanism clause**: a request-supplied actor
   is *ignored*, and no client-settable header or body field may be the source
   of the actor. This is the negative specification of a rule already
   recorded, and adding it strengthens an existing rule rather than creating
   a new one.

2. **"NEVER destroy audit history"** (`discovered-rules.md:160-170`) is
   already present and already cites the migration ordering. It should gain
   the **enforcement point**: the `audit_log` rebuild must install the
   append-only triggers, so the guarantee is enforced by the database and not
   only by application convention. The rule's *source* is unchanged.

3. **"Every lifecycle transition has explicit validation and explicit audit
   behaviour"** (`discovered-rules.md:57-60`) is already a Mandated rule. Its
   security form is the transactional requirement: the asset write and the
   audit write must be one transaction, so a failure cannot leave a mutated
   asset with no audit row. The `architecture` artifact's Transaction 1
   sequence diagram records that the `INSERT` and the audit `INSERT` are two
   separate statements with no enclosing transaction
   (`src/services/asset-service.js:38-48`), and that a throw between them
   leaves the asset persisted with no audit row — which is a *silent
   attribution gap*, not merely a data-quality issue.

4. **The `feature` scope's "CI execution before merge"** is already a
   Mandated rule (`discovered-rules.md:129-131`). Its security form is the
   audit step in that CI.

**New `## Forbidden` rules I recommend the human be offered** (each is a
prohibition the human can affirm; none should be written as already-stated):

- NEVER commit a secret, credential, or session signing key. Secrets live in
  the environment, never in the repository; `.env`, `*.pem`, and `*.key` are
  never tracked.
- NEVER install dependencies with `npm install` in CI or on the deploy host.
  Use `npm ci`, so the installed tree is exactly the reviewed lockfile tree.
- NEVER allow an audit row to be updated or deleted. The `audit_log` table
  rejects `UPDATE` and `DELETE` at the database level.
- NEVER export a CSV cell that begins with `=`, `+`, `-`, `@`, tab, or
  carriage return without the formula-injection prefix, in any column.
- NEVER introduce a credential, a token, or an outbound network call into the
  application without a security review of the actor-trust rule and the
  secret-handling rule.

**For `evidence.md`:**

The evidence file's "What the lead inspected" table should gain the DevSecOps
verifications, since they are facts of the same kind as the lead's own
(`npx vitest run` reproduced live). Specifically: `npm audit --omit=dev`
(0 vulnerabilities, 113 prod packages), `npm audit` (10 vulnerabilities: 3
critical / 1 high / 6 moderate, all in the Vitest dev toolchain),
`npm audit --audit-level=high --omit=dev` exit code 0, the `audit_log` UPDATE
probe, the SQLite append-only trigger probe, the response-header probe
(`x-powered-by: Express`, no other security headers), the `PRAGMA
table_info(audit_log)` column list, the `req.headers`/`req.user` grep (no
hits), the lockfile entry count (292, 113 prod / 179 dev / 51 optional), the
three `hasInstallScript` entries, and `better-sqlite3`'s
`"install": "prebuild-install || node-gyp rebuild --release"`.

Two of these close gaps the draft currently lists as unresolved:

- The draft's "**The 80% whole-tree floor is unproven**" (evidence.md:252-256)
  is a coverage matter, not mine.
- The draft's "**the lead did not run a coverage report**" — not mine.
- The draft's "**CI platform is undecided**" (evidence.md:257-261) is a real
  constraint and it interacts with my contribution: **a hosted CI runner
  cannot be the only enforcement point**, because there is no remote. So the
  `npm audit` gate must also be runnable as a local `npm run` script that the
  developer runs before pushing — the same way the 66/66 baseline is a
  convention today. The draft's own framing (CI as a *gate* on the trunk)
  should be extended: **the CI pipeline and the local pre-commit/pre-push
  scripts must run the same commands**, so the absence of a remote degrades
  the enforcement from "blocking" to "attended" rather than to "none".

The evidence file's "**Unresolved uncertainty**" section should also gain the
security items I could not close:

- Whether the organisation has a trusted identity provider (I-01 / I-03) —
  unchanged; the codebase has none, which I confirmed independently.
- Whether the deploy host's outbound network access is restricted — this
  determines whether `prebuild-install` can fetch a prebuilt binary or
  whether every install will take the `node-gyp` fallback. **Unresolved, and
  it is a question for the human who operates the host**, because it changes
  whether the native addon is a download-time or a compile-time artefact.
- Whether a records-retention or disposal schedule applies to asset custody
  records (I-02) — this bears on the backup practice. Note the interaction:
  if a retention schedule *requires* disposal, then "never delete an asset
  row or its history" and the retention obligation are in tension, and that
  tension must be surfaced rather than resolved silently. The append-only
  trigger makes the tension *loud* (the delete fails with a clear error)
  rather than silent, which is a reason to prefer it over the convention.

---

### 11. Summary of the recommended posture in one table

| Control | Adopt? | Form | Enforced by | Cost |
|---|---|---|---|---|
| Dependency audit gate | **Yes** | `npm audit --audit-level=high --omit=dev` in CI | CI exit code | ~1 line, passes today |
| Dev-tree audit triage | **Yes, advisory** | `npm audit` non-blocking, findings recorded | Documented deferral | ~1 line |
| `npm ci` over `npm install` | **Yes** | CI + deploy + README | Script + procedure | Word change |
| Secret scan | **Yes** | Pre-commit `git grep` over staged diff | Git hook | ~20 lines, no dependency |
| `.env` / `*.pem` gitignore | **Yes** | `.gitignore` | Git | 2 lines |
| SAST rules | **Yes, via ESLint** | `eslint-plugin-security` / `no-unsanitized` | ESLint in CI | 1 dev-dep + config |
| Append-only enforcement | **Yes** | SQLite `BEFORE UPDATE`/`BEFORE DELETE` triggers | **The database** | 2 triggers, in the rebuild migration |
| CSV formula-injection prefix | **Yes** | One shared escaping function, all string cells | Function + test | Small |
| HTTP hardening | **Yes, minimal** | `app.disable('x-powered-by')`, `nosniff`, correct CSV content-type | App code | 3 lines |
| CSRF protection | **Conditional** | Only if the actor mechanism uses a browser-attached credential | Depends on the actor decision | Deferred to the mechanism choice |
| Standalone SAST product | **No** | — | — | Over-engineered |
| DAST | **No** (as a scanner) | Replaced by targeted supertest assertions | Test suite | Over-engineered |
| Container scanning | **No** | No container exists | — | N/A |
| IaC scanning | **No** | No IaC exists | — | N/A |
| Secrets manager | **No** | No credentials exist | — | Pure cost |
| Exact version pinning in `package.json` | **No** | Lockfile + `npm ci` already pin | — | Fights the ecosystem |

## Positions

- AGREE: The draft's `## Deployment` treatment of the migration-ordering constraint as a *deployment* practice — the ordering is a mechanism constraint, but the consequence (backup first, smoke test, rollback) is exactly a deployment practice, and it is correctly placed.
- AGREE: The draft's statement that the application holds no credentials and needs no secret store — verified independently: no `.env`, no credential-like string in `src/`, `views/`, or `public/`, and no outbound call anywhere.
- AGREE: The draft's refusal to adopt a staging environment, canary rollout, feature-flag service, or PR-review requirement for this single-developer, single-host tool — each refusal is correctly reasoned against its own precondition.
- AGREE: The draft's insistence that every new practice be recorded as *new capability work* rather than as an existing standard — this honesty is what makes the pipeline's cost estimate defensible, and it must extend to the audit gate, the secret scan, and the git hook.
- AGREE: The draft's "What we did not adopt, and why" subsection pattern — the same subsection is needed for security tooling, and its absence is the most misleading omission in the draft.
- OBJECT: The draft has no security section and no dependency, secret, or supply-chain practice anywhere — `npm audit` reports 10 vulnerabilities (3 critical) today, the pipeline description omits the audit step entirely, and `npm ci` is not mentioned, so the highest-value zero-cost control in the release is absent from the draft.
- OBJECT: The actor-trust rule is placed under `## Deployment` — it is a request-path trust-boundary invariant with a test-level verification, not a deployment concern, and leaving it there implies the actor is configured at deploy time rather than resolved per request.
- OBJECT: The `## Forbidden` rule "NEVER destroy audit history" states the requirement but no enforcement mechanism — I verified `UPDATE audit_log` succeeds silently today, so append-only is a convention one line of code breaks; two SQLite triggers (verified working) make it a database guarantee and also block the cascade.
- OBJECT: The CSV formula-injection protection is mentioned only as a test to write, with no implementation rule — the enforceable form is one shared escaping function applied to *every* string cell covering `=`, `+`, `-`, `@`, tab and CR, and without that rule the control regresses silently on the next refactor.
- OBJECT: The draft does not record that `audit_log` has no actor column and `recordAudit` has no actor parameter, so the actor-trust rule cannot be implemented as a code change alone — it requires the same `audit_log` rebuild, which makes the actor decision and the rebuild one indivisible workstream rather than two.
- OBJECT: The `## Deployment` backup practice copies "the database file" without accounting for WAL mode — `src/db/index.js:15` sets `journal_mode = WAL`, so committed data may still reside in `*.sqlite-wal`, and a backup that copies only `assets.sqlite` while the process runs can capture an incomplete snapshot.
- OBJECT: The `## Code Style` section frames the prepared-statement rule and the EJS-escaping rule as style — both are security controls with explicit threat models (SQL injection, stored XSS), and the MVP's five new surfaces will each render user-controlled strings, so the classification must change before the new templates are written.
- OBJECT: The draft says nothing about `x-powered-by: Express` leaking on every response, about the absent `X-Content-Type-Options` (which is the same control as the CSV content-type requirement), or about `app.listen(PORT, ...)` binding `0.0.0.0` on a single-host internal deployment.
- OBJECT: The draft's CSRF position is silent — with no session and no cookie there is no credential to abuse today, but if the actor mechanism turns out to be a cookie or a session, CSRF becomes a live attack that corrupts the attribution record the MVP's primary success measure depends on, so the rule must be stated conditionally on the mechanism rather than omitted.
- OBJECT: The draft treats the unanalysed transitive closure as an open risk without converting it into a posture — `npm audit --omit=dev` shows 0 vulnerabilities across 113 production packages, which is a materially better fact than "not analysed", and the practice should be the prod-tree gate plus a recorded dev-tree triage rather than an unresolved uncertainty.
- OBJECT: The draft's Vitest deferral position is not stated at all — the Vitest 2.x toolchain carries 3 critical and 1 high advisory, and the fix is two semver majors across, which must be either done as a separate pre-MVP commit (the same precedent the draft sets for the linter config) or recorded as a named follow-on with its two known risks named, not left undiscovered.
- OBJECT: The draft omits the `hasInstallScript` inventory entirely — `better-sqlite3` (prod), `esbuild` and `fsevents` (dev) execute install-time code, and `better-sqlite3`'s `prebuild-install || node-gyp rebuild --release` fallback means a failed download silently converts a binary download into a source compilation with a C++ toolchain on the deploy host, which changes the reproducibility of the deployed artefact.
