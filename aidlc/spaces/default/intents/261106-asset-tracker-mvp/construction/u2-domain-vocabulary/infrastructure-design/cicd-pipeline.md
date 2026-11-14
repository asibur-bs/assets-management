# CI/CD Pipeline — Domain Vocabulary and Error Contract (`u2-domain-vocabulary`)

**Stage**: infrastructure-design (construction)
**Intent**: 261106-asset-tracker-mvp
**Space**: default
**Scope**: feature
**Unit**: `u2-domain-vocabulary` — Domain Vocabulary and Error Contract
**Unit kind**: `library`

This unit has **no deployable**. There is no image, no host, no environment
promotion, and no cloud resource to provision for it. CI/CD for this leaf is
the set of **gates inside the release's single pipeline** that prove the
modules are safe to merge into `main` and to be `require`d by other units.

---

## Pipeline Ownership

| Facet | Choice | Rationale |
|---|---|---|
| CI product | One release pipeline | Q1 — no second CI host for a leaf |
| Workflow file owner | `u6-tooling-and-delivery` | Delivery unit owns the workflow; this unit names required stages only |
| Trigger | Changes that affect the monolith checkout (including this unit's paths) | Same-repo CommonJS consumers (Q3) |
| Artifact publish | None | Q3 — same-repo `require` from `index.js`; no registry |

---

## Required Stages and Gates

| Stage | What runs for this unit | Gate | Owner of config |
|---|---|---|---|
| Install | `npm ci` on the monolith lockfile | Lockfile + install must succeed | Tooling / delivery |
| Lint | ESLint recommended + Prettier check (tooling unit's shared config) | Lint must pass on this unit's files | Tooling |
| Unit test | Vitest pure unit tests beside `vocabulary.js` / `translation.js` | All new + baseline-relevant tests pass | This unit's suite; tooling runs the job |
| Coverage | V8 coverage feeding the **project-wide 80% line floor** | Build fails if project coverage &lt; 80% (NFR6.2) | Tooling enforces; this unit contributes |
| Package / image | **Not applicable** | — | — |
| Deploy | **Not applicable** | — | — |
| Integration / HTTP / live SQLite busy | **Not this unit's job** | Live `SQLITE_BUSY` acceptance remains the write-path suite (NFR Design Q6) | `u3-write-path` |

**What the unit-test stage must assert (design contract, not implementation):**
- Closed eight-code set and retryable flags (`DomainVocabulary`)
- `ErrorTranslation.translate` / `unknownFailure` return `{ code, status, retryable }` with **no message field**
- `mapDriverCode('SQLITE_BUSY') → 'BUSY_RETRYABLE'`; every other code → `null`
- `BACKFILL_ACTOR` / `isBackfillActor`
- Normalisation / uniqueness-fold agreement cases including the non-ASCII boundary
- Test titles or comments name requirement ids (NFR6.3); error assertions use codes never message text (NFR6.6)

---

## Distribution Model

| Facet | Choice |
|---|---|
| Module layout | `vocabulary.js`, `translation.js`, `index.js` (NFR Design) |
| Consumer access | `require('<path-or-package-entry>')` inside the same checkout |
| Versioning | Trunk version only — no independent semver for this leaf |
| Secrets in CI | None for this unit (empty dependency closure; no credentials) |

---

## Failure and Rollback

| Event | Response |
|---|---|
| Red lint / unit / coverage job | **Block merge** to `main` |
| Bad vocabulary merged | **Revert the merge commit** on `main` (trunk-based; Q4) |
| Hotfix / feature-flag bypass | Out of scope for this unit |
| Separate deploy rollback | Does not exist — there is no deploy |

---

## Mapping to NFR Design Controls

| NFR design control | CI/CD expression |
|---|---|
| Empty third-party closure (NFR2.4) | Install uses the monolith lockfile; this unit adds no production dependency |
| Dual-cut INTERNAL / no diagnostic text (NFR2.1) | Unit tests assert return shape has no message field |
| `mapDriverCode` (NFR3.2) | Table-driven unit tests on literal driver codes; no live SQLite in this job |
| Additive tests / ids / code assertions (NFR6.1, NFR6.3, NFR6.6) | Test stage rules above |
| No HTTP in vocabulary | Lint/test surface is pure JS modules only |

---

## What This File Does Not Design

- The workflow YAML itself (tooling/delivery)
- Container images, hosts, networking, or monitoring stacks
- Write-path integration jobs that provoke a real `SQLITE_BUSY`
- Actor-mechanism / CSRF CI (blocked on OQ1; other units)

---

## Sources Consumed

| Upstream | What this file takes |
|---|---|
| `security-design` | Module layout, one-way import, return shape, `mapDriverCode`, dual-cut, testability design |
| `logical-components` | Two components; blast radius; no deployable |
| `tech-stack-decisions` / NFR requirements | Vitest, coverage floor, empty closure |
| `infrastructure-design-questions` | Q1–Q4 confirmed answers |

**Stage-level consumes not produced for this unit.** `performance-design`,
`scalability-design`, `reliability-design`, and `observability-design` are
out of this library's nfr-design `produces_kinds` and were never written.
`infrastructure-specification` and `monitoring-design` are likewise out of
this unit's infrastructure-design `produces_kinds`. Reliability/security
controls that bind the leaf are covered via `security-design` and the CI
gates above.
