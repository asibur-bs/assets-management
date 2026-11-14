# Contract Summary — Asset Tracker MVP

**Stage**: contract-design (inception)
**Intent**: 261106-asset-tracker-mvp
**Space**: default

This file is the formal contract set for the Asset Tracker MVP: what data
crosses each boundary between the six units and out to the browser, in what
shape, over what mechanism, and what happens when the crossing fails. It
carries both the human-readable overview and the contract specifications
themselves.

**Why this stage runs.** The stage's condition is met twice over. The release
has six units and ten inter-unit edges, so there are inter-unit boundaries;
and the browser consumes the presentation unit's rendered surface, so there is
an externally consumed API. There is no other stage in the workflow that owns
the external API specification.

**What this file does not do.** It does not reopen the approved decision set
(`C1`), the scope boundary (`C2`), or the approved workbook. It does not
choose the actor-identity mechanism, which is open question `OQ1` and is owned
by the architecture decision that must be recorded before the foundation work
is built. The actor contract below is specified by **interface and rule**,
which is sufficient to build against and is what the decision has not yet
determined.

**How the contracts were derived.** Every inter-unit contract corresponds to
one edge of the dependency DAG produced by the units-generation stage. The
payload on each edge is derived from the component catalogue's own
`depends_on` relations and its per-component interaction statements, mapped
through each component's unit assignment. The literals the contracts carry —
the statuses, the transition edges, the audit actions, the error codes, the
filter dimensions — are taken from the artifacts that bind them, and the
artifact each literal comes from is named in the contract.

---

## The Contracts

Twelve contracts. Eleven are inter-unit; one is the browser-facing external
boundary.

| # | Provider Unit | Consumer | Mechanism | Owner |
|---|---|---|---|---|
| 1 | U2 `u2-domain-vocabulary` | U1 `u1-foundation` | shared-schema | U2 |
| 2 | U2 `u2-domain-vocabulary` | U3 `u3-write-path` | shared-schema | U2 |
| 3 | U2 `u2-domain-vocabulary` | U4 `u4-reporting` | shared-schema | U2 |
| 4 | U2 `u2-domain-vocabulary` | U5 `u5-presentation` | shared-schema | U2 |
| 5 | U1 `u1-foundation` | U3 `u3-write-path` | shared-schema | U1 |
| 6 | U1 `u1-foundation` | U4 `u4-reporting` | shared-schema | U1 |
| 7 | U3 `u3-write-path` | U4 `u4-reporting` | in-process interface | U3 |
| 8 | U3 `u3-write-path` | U5 `u5-presentation` | in-process interface | U3 |
| 9 | U3 `u3-write-path` | U5 `u5-presentation` | in-process interface | U3 |
| 10 | U4 `u4-reporting` | U5 `u5-presentation` | in-process interface | U4 |
| 11 | U1 `u1-foundation` | U5 `u5-presentation` | in-process interface | U1 |
| 12 | U5 `u5-presentation` | External: public web | OpenAPI (HTTP) | U5 (see contract 12's ownership note) |

**The mechanism column is not uniform, and the uniformity would be the error.**
Six contracts are `shared-schema` because what crosses is data both sides
agree on — the vocabulary values, or the shape of the database file. Four
are `in-process interface` because what crosses is a call, not data: the
presentation unit calls the write path's operations, the reporting unit calls
the repository's operations. One is `OpenAPI` because it is the only boundary
that leaves the process.

**Contracts 8 and 9 share a provider and a consumer because they carry
different things.** The units-generation seam table names what crosses the
U3→U5 boundary as "the lifecycle transitions, the registration, the editing,
the uniqueness comparison (both the advisory read and the authoritative
check), and the history read" — five items, and the history read is not one
of the four the write-path contract carries. The history read is a read, the
other four are writes, and they have different failure behaviours, so they
are two contracts rather than one oversized one. Contract 9 covers the
history read; contract 8 covers the writes.

**No HTTP boundary is invented between units.** `NFR5.1` requires the release
to remain a single-process application on a single host with one local
database file, and a contract-level HTTP boundary between two units in the
same process would require the second deployment topology that requirement
forbids. The release's own `## Out of Scope` record excludes "integration with
any other system", so no inter-unit contract reaches outside this system.

---

## The Failure Model

One model, stated once, with the places where it differs by boundary kind.

**Every domain refusal carries a machine-readable domain code.** The domain
components raise refusals; they never ask for an HTTP status and never raise
a bare driver error. A consumer distinguishes failures **by code** and never
by message text.

**Eight codes are bound.** The error vocabulary binds exactly these eight,
and their HTTP statuses are part of the vocabulary rather than of the caller:

| Code | HTTP status | Retryable | Meaning |
|---|---|---|---|
| `VALIDATION_ERROR` | 400 | No | A field is missing, empty, or outside its accepted values |
| `DUPLICATE_ASSET` | 409 | No | The serial or key collides with an existing asset in the same category |
| `NOT_FOUND` | 404 | No | The asset named by the request does not exist |
| `INVALID_TRANSITION` | 400 | No | The requested edge is not one of the eight released edges |
| `INVALID_STATE` | 400 | No | The asset's stored status is outside the five buckets |
| `ASSET_DELETE_REFUSED` | 405 | No | A delete is attempted against an asset row |
| `BUSY_RETRYABLE` | 503 | **Yes** | The database is locked, detected from `SQLITE_BUSY` |
| `INTERNAL` | 500 | No | A failure carrying no domain code — the terminal fallback |

**`DUPLICATE_ASSET` is one code raised by both tiers.** The
application-level predicate raises it directly; the database's functional
unique index is the backstop and its `SQLITE_CONSTRAINT_UNIQUE` refusal is
detected and raised as the same code. The two tiers are indistinguishable to
a caller.

**`BUSY_RETRYABLE` is the only retryable code.** It is the only code a caller
may retry, and it is the only failure that is transient. Every other code is
permanent, and a permanent refusal is resolved by changing the request, not
by repeating it.

**The busy condition is reachable only on a data edge.** A lock that cannot
be acquired within the connection's `busy_timeout` — which the connection
component owns and which is non-zero — surfaces as `BUSY_RETRYABLE`, detected
from the driver's machine-readable code `SQLITE_BUSY` and never by matching
error message text. The `busy_timeout` is not a per-call timeout and is not
a contract parameter; it is a property of the connection the foundation unit
provides, and the value is deliberately not fixed by any artifact.

**No domain failure is degraded to a generic internal error.** A refusal
always carries its own domain code. The `INTERNAL` code is the boundary's
terminal fallback for a failure that carries **no** domain code at all — a
driver fault the translation component deliberately refuses to translate —
which by definition is not a domain failure and cannot be degraded from one.

**The HTTP boundary translates; the domain does not.** The translation
component is the single place a domain code becomes an HTTP status, and it is
the only consumer of the error vocabulary for that purpose. A domain
component never learns a status, and a status never appears in a domain
signature.

**A timeout is not a contract concern on a call edge.** The application is
synchronous and single-process: an in-process call either returns or throws,
and there is no network between two units that could time out. The only
waiting in the release is a lock wait on the database file, and that is the
`BUSY_RETRYABLE` path above.

---

## Inter-Unit Contracts

### Contract 1 — Domain vocabulary to the foundation

**Provider**: U2 `u2-domain-vocabulary` · **Consumer**: U1 `u1-foundation`
· **Mechanism**: shared-schema · **Owner**: U2

The foundation unit reads three things from the vocabulary: the five status
values, to build the schema's `CHECK` text; the audit-action vocabulary, to
build the audit table's action constraint; and the backfill's actor value, to
stamp pre-MVP history.

```yaml shared-schema
contract: u2-vocabulary-to-u1-foundation
owner: u2-domain-vocabulary
consumers: [u1-foundation]
kind: shared-schema
provider_component: DomainVocabulary
payload:
  status_values:
    type: array
    cardinality: 5
    items: [in-stock, assigned, returned, lost, discarded]
    usage: the schema's CHECK constraint text for assets.status
  audit_actions:
    type: array
    cardinality: 7
    items: [create, assign, return, mark-lost, recovered, discarded, edit]
    usage: the audit table's action constraint
  backfill_actor:
    type: string
    value: system
    usage: the actor stamped onto pre-MVP audit rows during the backfill
  display_labels:
    type: map
    keys: [in-stock, assigned, returned, lost, discarded]
    values: [In stock, Assigned, Returned, Lost, Discarded]
    usage: not read by the foundation unit; carried here so that the
      vocabulary is one contract rather than per-consumer extracts
failure:
  refusal: none — the vocabulary is a leaf with no data access and no failure mode
  note: the consumer's own migration can fail; that failure belongs to
    contract 5 and to the backfill contract, not to this one
additive_changes:
  rule: the status set and the audit-action set are closed and
    cardinality-bound, so adding a value to either is a breaking change that
    is agreed with every consumer and with U1, which owns the CHECK
    constraints; a new display label for an existing status is additive
```

### Contract 2 — Domain vocabulary to the write path

**Provider**: U2 `u2-domain-vocabulary` · **Consumer**: U3 `u3-write-path`
· **Mechanism**: shared-schema · **Owner**: U2

The write path reads six things from the vocabulary. This is the busiest of
the four vocabulary contracts, and the one whose payload most directly
carries the release's invariants.

```yaml shared-schema
contract: u2-vocabulary-to-u3-write-path
owner: u2-domain-vocabulary
consumers: [u3-write-path]
kind: shared-schema
provider_component: DomainVocabulary
payload:
  status_values: [in-stock, assigned, returned, lost, discarded]
  transition_table:
    type: array
    cardinality: 8
    edges:
      - { from: in-stock,  to: assigned }
      - { from: in-stock,  to: lost }
      - { from: assigned,  to: returned }
      - { from: assigned,  to: lost }
      - { from: assigned,  to: discarded }
      - { from: returned,  to: assigned }
      - { from: returned,  to: lost }
      - { from: lost,      to: in-stock }
    rule: exactly these eight edges are legal; every other edge is refused
      with INVALID_TRANSITION and writes no audit entry
  loss_reasons:
    type: ordered-list
    items: string
    item_constraint: non-empty
    usage: the reason required by the loss and the recovery paths
    contents: not bound by this contract — the shape is bound, the literal
      values are fixed at Code Generation
  retirement_reasons:
    type: ordered-list
    items: string
    item_constraint: non-empty
    relation: the loss reasons plus the retirement-specific values
    usage: the reason required by the discard path
    contents: not bound by this contract — the shape is bound, the literal
      values are fixed at Code Generation
  uniqueness_predicate:
    normalisation: trim leading and trailing whitespace, then case-fold
    scope: within a category
    excluded: the asset being edited
    storage: the serial or key is stored as the user supplied it; normalisation
      is for comparison only
    usage: one definition, shared with the database's functional index
      expression and with the inline warning
  error_codes: [VALIDATION_ERROR, DUPLICATE_ASSET, NOT_FOUND,
                INVALID_TRANSITION, INVALID_STATE, ASSET_DELETE_REFUSED,
                BUSY_RETRYABLE, INTERNAL]
  audit_actions: [create, assign, return, mark-lost, recovered, discarded, edit]
failure:
  refusals: the consumer raises the bound codes; a vocabulary read itself
    cannot fail
  note: DUPLICATE_ASSET is raised by both the application predicate and the
    unique index and is indistinguishable to the caller; BUSY_RETRYABLE is
    raised only by the authoritative check and only on a data edge
additive_changes:
  rule: the transition table, the status set, the audit-action set and the
    error-code set are all closed and cardinality-bound, so adding a value to
    any of them is a breaking change agreed with every consumer and with U1
    where the schema's CHECK constraint is affected; the loss-reason and
    retirement-reason contents are open, and adding a reason value requires
    agreement with U5, which renders the reason options
```

### Contract 3 — Domain vocabulary to the reporting unit

**Provider**: U2 `u2-domain-vocabulary` · **Consumer**: U4 `u4-reporting`
· **Mechanism**: shared-schema · **Owner**: U2

The reporting unit reads the status values, the filter definition, and the
display-holder rule. The filter definition is the release's central
consistency guarantee, so this contract is where INV-3 is carried.

```yaml shared-schema
contract: u2-vocabulary-to-u4-reporting
owner: u2-domain-vocabulary
consumers: [u4-reporting]
kind: shared-schema
provider_component: DomainVocabulary
payload:
  status_values: [in-stock, assigned, returned, lost, discarded]
  filter_dimensions:
    type: map
    description: the filter definition shared by the row queries and every count
    dimensions:
      - { name: search_text, kind: free-text, applies_to: [name, serial_or_key] }
      - { name: category, kind: enumerated, accepted_values: [hardware, software-license] }
      - { name: status, kind: enumerated, accepted_values: [in-stock, assigned, returned, lost, discarded] }
      - { name: sort_column, kind: enumerated, whitelist: literal, note: the accepted values are not bound by any artifact and are fixed at Code Generation }
      - { name: sort_direction, kind: enumerated, whitelist: literal, note: the accepted values are not bound by any artifact and are fixed at Code Generation }
    unused_dimension:
      name: holder
      kind: free-text over the display-holder name
      note: the holder dimension is carried in the filter state and set by the
        directory's holder-row link; it is not one of the form's dimensions
    rule: a filter value outside its accepted set is dropped, not treated as a
      match
  display_holder_rule:
    rule: the current holder where one exists, otherwise the preserved
      previous holder, otherwise the reserved designation "Unassigned"
    non_falling_back: the current holder and the preserved previous holder
      never echo one another
    reserved_designation:
      value: Unassigned
      applies_to: an asset that has never been held by anyone
      is_never: a holder's name
failure:
  refusals: none at the vocabulary boundary; a count query over the database
    may raise BUSY_RETRYABLE, which belongs to contract 6
additive_changes:
  rule: a new filter dimension or a new accepted value is additive for this
    consumer, because the filter's sets are open, but a new filter dimension
    requires agreement with U5, which renders the filter form; a new status
    value is not additive, because the status set is closed
```

### Contract 4 — Domain vocabulary to the presentation unit

**Provider**: U2 `u2-domain-vocabulary` · **Consumer**: U5 `u5-presentation`
· **Mechanism**: shared-schema · **Owner**: U2

The presentation unit reads the transition table, the display vocabulary, the
status values, and the loss-reason vocabularies. It reads the transition
table from the vocabulary and **not** from the write path, so that a
presentation component never depends on the unit that performs the
transitions.

```yaml shared-schema
contract: u2-vocabulary-to-u5-presentation
owner: u2-domain-vocabulary
consumers: [u5-presentation]
kind: shared-schema
provider_component: DomainVocabulary
payload:
  transition_table:
    cardinality: 8
    edges: identical to contract 2's transition_table
    usage: the per-status action controls the detail screen renders
  display_vocabulary:
    type: map
    keys: [in-stock, assigned, returned, lost, discarded]
    values: [In stock, Assigned, Returned, Lost, Discarded]
    usage: the status chip's label and its chip class, both resolved from this
      one mapping so the chips, the filter options, and the action controls
      cannot drift apart
    rule: the stored value is never displayed to a person
  status_values: [in-stock, assigned, returned, lost, discarded]
  loss_reasons:
    type: ordered-list
    items: string
    usage: the reason options the dialog offers
    contents: not bound by this contract — the shape is bound, the literal
      values are fixed at Code Generation
  retirement_reasons:
    type: ordered-list
    items: string
    relation: the loss reasons plus the retirement-specific values
    usage: the reason options the discard dialog offers
    contents: not bound by this contract — the shape is bound, the literal
      values are fixed at Code Generation
  error_codes:
    values: [VALIDATION_ERROR, DUPLICATE_ASSET, NOT_FOUND,
             INVALID_TRANSITION, INVALID_STATE, ASSET_DELETE_REFUSED,
             BUSY_RETRYABLE, INTERNAL]
    usage: the codes the presentation layer recognises so it renders a
      refusal in words rather than showing a raw code
failure:
  refusals: none at the vocabulary boundary
additive_changes:
  rule: a new display label or a new reason value is additive for this
    consumer, and a new reason value requires agreement with U3, which raises
    the reason-required refusals; a new status value is NOT additive, because
    the status set is closed at five and the presentation unit renders a chip
    per status, so a sixth status is a breaking change agreed with every
    consumer and with U1
```

### Contract 5 — Foundation to the write path

**Provider**: U1 `u1-foundation` · **Consumer**: U3 `u3-write-path`
· **Mechanism**: shared-schema · **Owner**: U1

This is the release's most consequential contract. It carries the rebuilt
schema, the functional unique index, the append-only triggers, the connection
handle, and the connection's `busy_timeout` — the five things the write path
cannot work without.

```yaml shared-schema
contract: u1-foundation-to-u3-write-path
owner: u1-foundation
consumers: [u3-write-path]
kind: shared-schema
provider_components:
  - SchemaMigration
  - DatabaseConnection
payload:
  connection:
    type: database-handle
    owner: the foundation unit's connection component
    pragmas:
      busy_timeout:
        value: non-zero
        numeric_value: not bound by any artifact
        note: the value is deliberately not fixed here; the contract requires
          only that it is non-zero at the time the uniqueness check runs
      journal_mode: WAL
      foreign_keys: on by default; the migration controls its own pragma window
    single_owner: the connection component is the only component that touches
      the database file directly; every other consumer receives this handle
  schema:
    tables: [assets, audit_log]
    assets:
      status_check: the five status values
      assigned_to: the current holder, nullable
      last_assigned_to: the preserved previous holder, nullable
      assigned_at: nullable
      returned_at: nullable
      serial_or_key_uniqueness: a functional unique index over the trimmed,
        case-folded serial or key within the category
      indexes: re-issued by the rebuild migration, because a table rebuild
        destroys the rebuilt table's indexes
    audit_log:
      actor: present, non-null for every entry written after the rebuild
      append_only: enforced by BEFORE UPDATE and BEFORE DELETE triggers
        installed by the same migration that rebuilds the table
      foreign_key: to assets, re-added only after the assets table has been
        rebuilt
    ordering_binding:
      rule: the audit table is rebuilt first, without its foreign-key clause,
        and the foreign key is re-added after the assets table is rebuilt
      reason: dropping the assets table first fires the audit table's
        ON DELETE CASCADE and destroys every audit row with the transaction
        committed and no error raised
  backfill:
    actor: system
    idempotent: true
    on_failure: a single failing row fails the migration and rolls the
      backfill transaction back; the failure is reported with row identifiers
      and reasons
failure:
  refusals:
    - code: BUSY_RETRYABLE
      condition: the write lock cannot be acquired within busy_timeout
      detected_from: SQLITE_BUSY
      retryable: true
    - code: DUPLICATE_ASSET
      condition: the functional unique index refuses the write
      detected_from: SQLITE_CONSTRAINT_UNIQUE
      retryable: false
      note: the index is the backstop; the application predicate raises the
        same code, and the two tiers are indistinguishable to a caller
  transaction_rule: the asset write and the audit append are one transaction,
    enforced by the write path (contract 8) against this schema
additive_changes:
  rule: a new column is additive for this consumer; a new constraint is not,
    and requires agreement with U5, which renders the field; a new status
    value or a new audit action is not additive either, because both sets are
    closed and their cardinality is bound by this contract
```

### Contract 6 — Foundation to the reporting unit

**Provider**: U1 `u1-foundation` · **Consumer**: U4 `u4-reporting`
· **Mechanism**: shared-schema · **Owner**: U1

The reporting unit reads the same connection and the same schema, for the
aggregation that computes every count.

```yaml shared-schema
contract: u1-foundation-to-u4-reporting
owner: u1-foundation
consumers: [u4-reporting]
kind: shared-schema
provider_component: DatabaseConnection
payload:
  connection:
    type: database-handle
    same_handle_as: contract 5's connection
    pragmas: as contract 5's connection pragmas
    purpose: the aggregation is computed in the database, not by loading the
      asset set into memory
  schema:
    tables: [assets, audit_log]
    purpose: the five status buckets the aggregation groups by, and the
      status_check that guarantees every row carries one of them
failure:
  refusals:
    - code: BUSY_RETRYABLE
      condition: the read or aggregation cannot proceed within busy_timeout
      detected_from: SQLITE_BUSY
      retryable: true
  note: a count query raises no domain refusal of its own
additive_changes:
  rule: a new column the aggregation must group by is additive for this
    consumer; a new bucket is not — the status set is closed at five, so a
    sixth bucket is a breaking change requiring agreement with U5, which
    renders the bucket tiles, and with every other count-consuming surface
```

### Contract 7 — Write path to the reporting unit

**Provider**: U3 `u3-write-path` · **Consumer**: U4 `u4-reporting`
· **Mechanism**: in-process interface · **Owner**: U3

The reporting unit reads the asset rows through the asset repository, which
the write path owns. The repository is the boundary: it exposes row access
and performs **no** transition validation and writes **no** audit entry, so
that a caller reaching it directly cannot bypass the audit invariant.

**Exactly one component constructs the filtered query.** This is the
mechanism the four-surface counting guarantee rests on, so it is stated here
rather than left implicit. The catalogue assigns the construction of the
filtered and sorted asset query to `AssetQuery` (`components.md:307`), makes
`AssetQuery` the component that "returns rows; it does not count them"
(`components.md:304-305`), and records that `CountingQuery` "shares the one
filter definition and the one query construction, so a count and the rows it
counts agree" (`components.md:329-330`). So:

- **`AssetQuery` (U4) is the sole constructor of the filtered query.** It
  turns a filter definition into a query and passes that query to the
  repository to execute.
- **`AssetRepository` (U3) is the row-access primitive.** It executes a
  query it is given and returns rows; it does not build one from a filter.
- **`CountingQuery` (U4) shares `AssetQuery`'s query construction.** It does
  not build a second one.

A second path that turns a filter into a query anywhere in the release would
let the count and the rows it counts be computed from different query
constructions, which is the drift ADR-002 and the shared-counting standing
condition exist to prevent.

```yaml
contract: u3-write-path-to-u4-reporting
owner: u3-write-path
consumers: [u4-reporting]
kind: in-process-interface
provider_component: AssetRepository
provider_component_note: the write path's asset repository, the row-access
  primitive
operations:
  - name: read_assets_by_query
    parameters:
      - { name: query, type: a query the consumer's own AssetQuery component constructed from the filter definition }
      - { name: sort, type: whitelisted literal column and direction }
    returns: { type: array, items: the asset entity }
    semantics:
      - the repository executes the query it is given; it does not construct
        one from a filter definition
      - the sort column and the sort direction are whitelisted to literals;
        a user value is never interpolated into SQL
      - a filter value outside its accepted set is dropped, not treated as a match
      - the component returns rows; it does not count them
  - name: read_asset_by_id
    parameters:
      - { name: id, type: the asset identifier }
    returns: { type: the asset entity, nullable: true }
sole_filter_constructor:
  component: AssetQuery
  unit: u4-reporting
  rule: exactly one component in the release turns a filter definition into a
    query, and it is AssetQuery; AssetRepository executes a query it is given,
    and CountingQuery shares AssetQuery's construction rather than building a
    second one
  why: a count and the rows it counts must be computed from the same query
    construction, or the four count-consuming surfaces can disagree
failure:
  refusals:
    - code: NOT_FOUND
      condition: the asset named by the request does not exist
      retryable: false
    - code: BUSY_RETRYABLE
      condition: the read cannot proceed within busy_timeout
      detected_from: SQLITE_BUSY
      retryable: true
  constraint: the repository validates no transition and appends no audit
    entry; a caller reaching it directly cannot bypass the invariant
additive_changes:
  rule: a new read operation is additive; a change to what a read returns is
    not, and requires agreement with U5, which renders the rows
```

### Contract 8 — Write path to the presentation unit

**Provider**: U3 `u3-write-path` · **Consumer**: U5 `u5-presentation`
· **Mechanism**: in-process interface · **Owner**: U3

The presentation unit calls the write path's operations. This is the contract
the user-facing behaviour is built on, and it is where the release's
transaction and attribution guarantees are delivered to the screens.

```yaml
contract: u3-write-path-to-u5-presentation
owner: u3-write-path
consumers: [u5-presentation]
kind: in-process-interface
provider_components:
  - AssetLifecycle
  - AssetRegistration
  - AssetEditing
  - UniquenessCheck
operations:
  - name: apply_transition
    parameters:
      - { name: asset_id, type: the asset identifier }
      - { name: to_status, type: one of the five status values }
      - { name: reason, type: a reason string, required_for: [lost, in-stock recovery, discarded] }
      - { name: holder, type: a display name, required_for: [assigned] }
    returns:
      asset: the asset's new state
      audit_entry: the entry appended by this write
    semantics:
      - the transition table from contract 2 decides legality; an illegal edge
        is refused with INVALID_TRANSITION and writes no audit entry
      - the asset write and the audit append are one transaction; a failure
        between them leaves both unchanged
      - the actor is resolved by the server from a trusted context and is
        carried into the audit entry; a request-supplied actor is ignored
      - the loss and the discard write the departing current holder into the
        preserved previous-holder field before clearing the current holder
      - "the discard resolves the assignment inline: the current holder is cleared, the preserved previous holder is retained, and the entry records the discard, the prior holder, and the resolution"
      - the recovery is recorded as the distinct action recovered, never as
        assign or return, and its description names the recovery and the
        prior holder
      - a to_status equal to the asset's current status is refused with
        INVALID_TRANSITION; no edge in the released table is a self-edge
    target_status_to_audit_action:
      note: the audit action follows the target status, not the origin, so
        one mapping serves all eight edges and the HTTP action enum is the
        encoding of this same table rather than a second specification
      source: FR3.12 binds the seven-value vocabulary and states that
        mark-lost is the action for all three loss edges; FR3.7 binds the
        recovery's action
      mapping:
        - { to_status: assigned,  audit_action: assign }
        - { to_status: returned,  audit_action: return }
        - { to_status: lost,      audit_action: mark-lost }
        - { to_status: in-stock,  audit_action: recovered }
        - { to_status: discarded, audit_action: discarded }
      non_obvious_cases:
        - in-stock means the recovery, and is legal only from lost; from any
          other origin it is an illegal edge and is refused
        - lost is the action mark-lost from all three of its origins
          (in-stock, assigned, returned), and never an action specific to
          the origin
        - assigned is the action assign from both of its origins (in-stock
          and returned)
  - name: register_asset
    parameters:
      - { name: category, type: "one of: hardware, software-license" }
      - { name: name, type: non-empty string }
      - { name: serial_or_key, type: non-empty string }
      - { name: model, type: string, optional: true }
      - { name: notes, type: string, optional: true }
    returns:
      asset: the created asset, in the in-stock bucket, assigned to nobody
      audit_entry: the creation entry
    semantics:
      - the asset insert and the creation entry are one transaction
      - the creation entry's description names the asset's name, its category,
        and the serial or key it was registered under
      - the registration form offers no assignee field
  - name: edit_asset
    parameters:
      - { name: asset_id, type: the asset identifier }
      - { name: changes, type: a map over the editable fields }
    returns:
      asset: the asset as it now stands
      audit_entry: the edit entry, present only when at least one field changed
    semantics:
      - the editable fields are category, name, model, notes, serial_or_key
      - the status, the current holder, and the preserved previous holder are
        not editable and are left untouched whatever the request carries
      - the uniqueness policy applies against the category the edit sets
      - a save that changes nothing appends no entry and does not change the
        asset's update timestamp
      - the edit entry names the changed fields and their previous values
  - name: check_uniqueness
    parameters:
      - { name: serial_or_key, type: the serial or key as typed }
      - { name: category, type: the category to compare within }
      - { name: exclude_asset_id, type: the asset being edited, optional: true }
    returns:
      collision: whether an existing asset in the same category holds the
        normalised serial or key
      existing_asset: the colliding asset, when there is one
    disciplines:
      advisory:
        transaction: deferred read
        takes_write_lock: false
        raises_busy: false
        usage: the inline warning, taken when the serial field loses focus
      authoritative:
        transaction: IMMEDIATE
        takes_write_lock: true
        raises_busy: true
        usage: the registration and the edit
        rule: this discipline is the authoritative arbiter; under concurrent
          writers the database's unique index decides which writer succeeds
  - name: refuse_delete
    parameters:
      - { name: asset_id, type: the asset identifier }
    returns: { type: never }
    semantics:
      - the refusal is raised before any statement runs; the asset row and all
        its audit entries are left intact
      - the refusal does not depend on the database to make it
failure:
  refusals:
    - { code: VALIDATION_ERROR, condition: a required field is missing or a reason is absent, retryable: false }
    - { code: DUPLICATE_ASSET, condition: the serial or key collides within the category, retryable: false }
    - { code: INVALID_TRANSITION, condition: the edge is not one of the eight released edges, retryable: false }
    - { code: NOT_FOUND, condition: the asset does not exist, retryable: false }
    - { code: ASSET_DELETE_REFUSED, condition: a delete was attempted, retryable: false }
    - { code: BUSY_RETRYABLE, condition: the write lock cannot be acquired within busy_timeout, detected_from: SQLITE_BUSY, retryable: true }
  note: no domain failure is degraded to INTERNAL; the write path never raises
    a bare driver error, and a driver fault carrying no domain code is left
    as the boundary's terminal fallback
additive_changes:
  rule: a new operation is additive; a new refusal code is not, because the
    error-code set is closed at eight, and it requires agreement with U5 and
    with U2, which owns the vocabulary; a new transition edge is not, because
    the transition table is closed at eight
```

### Contract 9 — Write path to the presentation unit: the history read

**Provider**: U3 `u3-write-path` · **Consumer**: U5 `u5-presentation`
· **Mechanism**: in-process interface · **Owner**: U3

The units-generation seam table names "the history read" as one of the five
things that cross the U3→U5 boundary, and the component catalogue assigns
"the read of an asset's complete audit history, newest first" to
`AuditRepository` (`components.md:246-253`). This is that read's contract.

**The read is complete, and it is ordered.** The release replaces the
previous shape of a single latest entry with the asset's full sequence
(`FR4.5`), and the sequence is newest first (`FR4.1`). A row count proves
rows exist; the ordering is what makes them a history.

**The `person` / `system` distinction is produced by the consumer's
`AssetHistory` component, not by this read.** The catalogue makes
`AssetHistory` depend on `ActorResolver` for exactly this distinction
(`components.md:615-619`), and the entries carry their actor regardless.
So the read returns each entry's actor verbatim, and the marking of a
system-attributed entry distinctly from a person-attributed one is U5's
rendering concern — it is not a property this contract puts on the wire.

```yaml
contract: u3-write-path-to-u5-presentation-history-read
owner: u3-write-path
consumers: [u5-presentation]
kind: in-process-interface
provider_component: AuditRepository
provider_component_note: the write path's audit repository, which is the only
  component that reads the audit table
operations:
  - name: read_asset_history
    parameters:
      - { name: asset_id, type: the asset identifier }
    returns:
      entries:
        type: array
        items: the audit entry
        order: newest first
        item_fields: [action, description, actor, created_at]
    semantics:
      - the sequence is the asset's complete history; an entry is never
        replaced by a single latest entry
      - "the order is newest first, and the order is total: two entries written in the same millisecond are still returned in a stable order, so the rendered sequence does not reorder between reads"
      - every entry carries its action, its description, its actor, and its
        timestamp
      - the actor is returned as it was recorded; the read does not classify
        it as person or system
      - the read appends nothing and changes nothing; the repository exposes
        no update or delete against the audit table
    consumer_side_assembly:
      component: AssetHistory
      note: the consumer's AssetHistory component assembles the entries for
        display and applies the person-versus-system marking, using the
        actor resolution from contract 11
failure:
  refusals:
    - code: NOT_FOUND
      condition: the asset named by the request does not exist
      retryable: false
    - code: BUSY_RETRYABLE
      condition: the read cannot proceed within busy_timeout
      detected_from: SQLITE_BUSY
      retryable: true
  note: the read raises no write-path refusal, because it writes nothing
additive_changes:
  rule: a new field on an audit entry is additive; a change to the ordering
    or to the completeness of the sequence is not, and requires agreement with
    U5, which renders the sequence; a new audit action is not additive, since
    the action set is closed at seven
```

### Contract 10 — Reporting unit to the presentation unit

**Provider**: U4 `u4-reporting` · **Consumer**: U5 `u5-presentation`
· **Mechanism**: in-process interface · **Owner**: U4

The presentation unit reads the query, the counts, and the CSV export. The
four count-consuming surfaces are four renderings of one definition, and none
derives a figure from another.

```yaml
contract: u4-reporting-to-u5-presentation
owner: u4-reporting
consumers: [u5-presentation]
kind: in-process-interface
provider_components:
  - AssetQuery
  - CountingQuery
  - CsvExport
provider_components_note: one component per operation — query_assets is
  AssetQuery's, count and count_holders are CountingQuery's, export_csv is
  CsvExport's
operations:
  - name: query_assets
    parameters:
      - { name: filter, type: the filter definition from contract 3 }
    returns: { type: array, items: the asset entity }
  - name: count
    parameters:
      - { name: filter, type: the filter definition from contract 3 }
    returns:
      figures:
        bucket_counts: { type: map, keys: the five status values }
        active_inventory: integer
        total_records: integer
        available_to_assign: integer
        shown: integer
        matching: integer
    semantics:
      - every figure is computed by aggregation in the database; the asset set
        is never loaded into memory to be counted
      - the five bucket counts sum to the total record count
      - the active inventory equals the total record count minus the discarded
        bucket count
      - the shown figure never exceeds the matching figure
  - name: count_holders
    parameters:
      - { name: holder_search, type: free-text over the display-holder name }
    returns:
      holders: { type: array, items: { name, total, chips } }
      holder_count: integer
    semantics:
      - the count is of distinct display holders, excluding the reserved
        Unassigned row
      - the rendered row count is the holder count plus one when the reserved
        row is present
      - the holder search filters the holder rows, not the assets
      - each row's per-bucket chips sum to that row's total
  - name: export_csv
    parameters:
      - { name: filter, type: the filter definition from contract 3 }
    returns:
      filename: assets-export.csv
      content_type: text/csv; charset=utf-8
      encoding: UTF-8
      columns: [Name, Category, Serial / Key, Status, Holder, Last holder]
      rows: the list's matching row set, not truncated
    semantics:
      - a cell whose content begins with =, +, -, @, a tab, or a carriage
        return is prefixed with a single quote before quoting; the rule
        applies to every string cell, not a subset of columns
      - when no rows match, the file carries the header row and no data rows
      - the file contains no filter metadata beyond the header and the data rows
      - neither notes nor audit history is exported
failure:
  refusals:
    - { code: BUSY_RETRYABLE, condition: the aggregation or the export cannot proceed within busy_timeout, detected_from: SQLITE_BUSY, retryable: true }
  note: the reporting unit counts and serialises; it never writes, so it raises
    no write-path refusal
additive_changes:
  rule: a new figure or a new export column is additive for this consumer; a
    change to an existing figure's definition is not, and requires agreement
    with the other three count-consuming surfaces, because the four must
    agree; a new status value is not additive, because the status set is
    closed at five and the bucket tiles are drawn from it
```

### Contract 11 — Foundation to the presentation unit

**Provider**: U1 `u1-foundation` · **Consumer**: U5 `u5-presentation`
· **Mechanism**: in-process interface · **Owner**: U1

The presentation unit reads the resolved actor, for the read-only acting-as
indicator and for the actor each history entry carries.

```yaml
contract: u1-foundation-to-u5-presentation
owner: u1-foundation
consumers: [u5-presentation]
kind: in-process-interface
provider_component: ActorResolver
operations:
  - name: resolve_actor
    parameters:
      - { name: request_context, type: the trusted server-side request context }
    returns:
      actor: a stable, displayable identity
      attribution: person | system
    semantics:
      - the actor is resolved by the server from a context the client cannot
        influence
      - an actor supplied in a body field, a query parameter, or a directly
        settable header is ignored, not rejected and not sanitised into
        acceptance; the supplied value is neither persisted nor logged
      - the resolution is stable, so that a person reading the history can
        recognise the actor of an entry
      - the person-versus-system distinction lets a backfilled entry render
        distinguishably from a person-attributed entry
    mechanism_status:
      state: open
      question: OQ1 — which actor-identity mechanism the release uses
      note: the mechanism sits behind this interface and is not chosen by
        this contract; the interface and the rule above are what the
        presentation unit builds against
      constraint: whatever the mechanism turns out to be, it may not read the
        actor from a client-settable field or header, and if it relies on a
        browser-attached credential then a state-changing request that does
        not carry it must be refused
failure:
  refusals:
    - code: VALIDATION_ERROR
      condition: no actor could be resolved for a write that requires one
      retryable: false
  note: a read that renders the indicator shows no actor rather than failing
additive_changes:
  rule: a new attribution value is additive for this consumer, because the
    attribution set is open; a change to the trust rule is not, and requires
    agreement with U3, which applies it at every write site
```

---

## The External Contract

### Contract 12 — Presentation unit to the browser

**Provider**: U5 `u5-presentation` · **Consumer**: External: public web
· **Mechanism**: OpenAPI (HTTP) · **Owner**: U5

This is the release's only externally consumed API. The browser is outside the
system, and the presentation unit is what it talks to.

**Ownership.** U5 owns the OpenAPI document, the endpoint set, and the request
and response shapes. U2 owns the code-to-status mapping, and the document
states it by reading U2's error-translation contract rather than by
restating it — a second copy of the mapping is a second claim that can drift.
A change to the mapping is a change to U2's contract, agreed with U5.

**The route layer is not a component.** The domain design deliberately places
the HTTP framework and the template engine outside the component model:
neither has business logic and neither owns an entity. U5 exposes the routes
without a component being invented for them, and this contract specifies the
boundary without turning the framework into part of the domain.

```yaml
contract: u5-presentation-to-public-web
owner: u5-presentation
consumers: [external: public web]
kind: openapi
openapi: 3.0.3
info:
  title: Asset Tracker MVP
  version: none
  version_note: the release ships as one process on one deployable, so a
    contract and its consumer change in the same commit and a version number
    would carry no information a reader can act on
servers:
  - url: the single internal host, launched with PORT and DB_PATH overrides
    description: one environment, one target, one process
paths:
  /assets:
    get:
      summary: the asset list, filtered
      parameters:
        - { name: search, in: query, schema: { type: string }, description: free text over the name and the serial or key }
        - { name: category, in: query, schema: { type: string, enum: [hardware, software-license] } }
        - { name: status, in: query, schema: { type: string, enum: [in-stock, assigned, returned, lost, discarded] } }
        - { name: holder, in: query, schema: { type: string }, description: the display holder; set by the directory's holder-row link }
        - { name: sort, in: query, schema: { type: string }, description: a whitelisted literal column }
        - { name: direction, in: query, schema: { type: string }, description: a whitelisted literal direction }
      responses:
        "200":
          description: the filtered list
          content:
            text/html:
              schema: { type: string }
              description: the rendered list, carrying the shown and matching figures
    post:
      summary: register an asset
      requestBody:
        required: true
        content:
          application/x-www-form-urlencoded:
            schema:
              type: object
              required: [category, name, serial_or_key]
              properties:
                category: { type: string, enum: [hardware, software-license] }
                name: { type: string }
                serial_or_key: { type: string }
                model: { type: string }
                notes: { type: string }
              note: no assignee field; a registered asset is in-stock and held by nobody
      responses:
        "303": { description: redirect to the created asset's detail page }
        "400": { $ref: "#/components/responses/ValidationError" }
        "409": { $ref: "#/components/responses/DuplicateAsset" }
        "500": { $ref: "#/components/responses/InternalError" }
        "503": { $ref: "#/components/responses/Busy" }
  /assets/export:
    get:
      summary: the asset list's matching rows as a CSV file
      parameters:
        - { name: search, in: query, schema: { type: string } }
        - { name: category, in: query, schema: { type: string } }
        - { name: status, in: query, schema: { type: string } }
        - { name: holder, in: query, schema: { type: string } }
      responses:
        "200":
          description: the CSV file
          headers:
            Content-Disposition: { schema: { type: string }, description: names the file assets-export.csv }
          content:
            text/csv:
              schema: { type: string }
              description: the six columns Name, Category, Serial / Key, Status, Holder, Last holder, every string cell escaped against formula injection
  /assets/new:
    get:
      summary: the registration form
      responses:
        "200": { description: the rendered form }
  /assets/:id:
    get:
      summary: one asset, its history, and its legal actions
      parameters:
        - { name: id, in: path, required: true, schema: { type: string } }
      responses:
        "200": { description: the rendered detail page, with the complete history newest first and an actor on every entry }
        "404": { $ref: "#/components/responses/NotFound" }
    post:
      summary: a write against one asset — a transition, an edit, or a delete attempt
      description: |
        The canonical write route for one asset. It carries every write
        against an existing asset: the five transitions, the edit, and the
        delete attempt. The separate `POST /assets/:id/edit` route is an
        alias of this route's `edit` action and is not a second write path.
      requestBody:
        required: true
        content:
          application/x-www-form-urlencoded:
            schema:
              type: object
              required: [action]
              properties:
                action: { type: string, enum: [assign, return, mark-lost, recovered, discarded, edit, delete] }
                holder: { type: string }
                reason: { type: string }
                category: { type: string }
                name: { type: string }
                model: { type: string }
                notes: { type: string }
                serial_or_key: { type: string }
              note: no actor field; a request-supplied actor is ignored
      action_parameters:
        note: for a given action, only the parameters that action consumes are
          read; a parameter the action does not consume is ignored rather than
          being an error
        assign: [action, holder]
        return: [action]
        mark-lost: [action, reason]
        recovered: [action, reason]
        discarded: [action, reason]
        edit: [action, category, name, model, notes, serial_or_key]
        delete: [action]
      action_semantics:
        note: the action enum is the HTTP-side encoding of the
          target-status-to-audit-action mapping in contract 8, so the two
          specifications are one operation rather than two
        assign: the transition to assigned; legal from in-stock and from returned
        return: the transition to returned; legal only from assigned
        mark-lost: the transition to lost; legal from in-stock, assigned and returned
        recovered: the transition to in-stock; legal only from lost
        discarded: the transition to discarded; legal only from assigned
        edit: the edit; the editable fields are category, name, model, notes and serial_or_key
        delete: always refused with ASSET_DELETE_REFUSED
      responses:
        "303": { description: redirect back to the asset's detail page }
        "400": { $ref: "#/components/responses/ValidationError" }
        "404": { $ref: "#/components/responses/NotFound" }
        "405": { $ref: "#/components/responses/DeleteRefused" }
        "409": { $ref: "#/components/responses/DuplicateAsset" }
        "500": { $ref: "#/components/responses/InternalError" }
        "503": { $ref: "#/components/responses/Busy" }
  /assets/:id/edit:
    get:
      summary: the edit form
      parameters:
        - { name: id, in: path, required: true, schema: { type: string } }
      responses:
        "200": { description: the rendered edit form }
        "404": { $ref: "#/components/responses/NotFound" }
    post:
      summary: save an edit
      description: |
        An alias of `POST /assets/:id` with `action: edit`, not a second
        write path. It exists so the edit form can post to the route its
        own form names. Both routes reach the same edit operation, so the
        "exactly one history entry" and single-transaction rules apply once,
        not twice. A POST carrying no `action` is refused with
        VALIDATION_ERROR.
      requestBody:
        required: true
        content:
          application/x-www-form-urlencoded:
            schema:
              type: object
              required: [action]
              properties:
                action: { type: string, enum: [edit] }
                category: { type: string }
                name: { type: string }
                model: { type: string }
                notes: { type: string }
                serial_or_key: { type: string }
              note: no status field and no holder field; neither is editable
      responses:
        "303": { description: redirect back to the asset's detail page }
        "400": { $ref: "#/components/responses/ValidationError" }
        "404": { $ref: "#/components/responses/NotFound" }
        "409": { $ref: "#/components/responses/DuplicateAsset" }
        "500": { $ref: "#/components/responses/InternalError" }
        "503": { $ref: "#/components/responses/Busy" }
  /assets/:id/serial-check:
    get:
      summary: the advisory duplicate check behind the inline warning
      parameters:
        - { name: id, in: path, required: false, schema: { type: string }, description: the asset being edited; excluded from the comparison }
        - { name: serial_or_key, in: query, required: true, schema: { type: string } }
        - { name: category, in: query, required: true, schema: { type: string } }
      responses:
        "200": { description: whether an existing asset in the same category holds the normalised serial or key }
        "503": { $ref: "#/components/responses/Busy" }
      busy_note: the advisory discipline in contract 8 takes no write lock and
        raises no busy condition, so this route does not in fact reach the
        503; the response is declared so that the document's status set is
        complete and uniform, and the route's own behaviour is fixed by
        contract 8's advisory discipline
  /dashboard:
    get:
      summary: the reconciliation dashboard
      responses:
        "200": { description: the rendered dashboard, with the five bucket tiles, the active inventory, the total record count, the available-to-assign count, and the attention panel's two separate items }
  /holders:
    get:
      summary: the assignee directory
      parameters:
        - { name: search, in: query, schema: { type: string }, description: free text over the display-holder name }
      responses:
        "200": { description: the rendered directory, one row per distinct display holder plus the reserved Unassigned row }
components:
  responses:
    ValidationError:
      description: a domain refusal that carries one of the three codes that
        map to 400 — VALIDATION_ERROR, a field that is missing, empty, or
        outside its accepted values; INVALID_TRANSITION, a requested edge that
        is not one of the eight released edges; or INVALID_STATE, an asset whose
        stored status is outside the five buckets. The three are distinguished
        by the code carried in the body, not by the status, so this is one
        response shape covering three refusals
      content:
        text/html: { schema: { type: string } }
    DuplicateAsset:
      description: a domain refusal with the DUPLICATE_ASSET code
      content:
        text/html: { schema: { type: string } }
    NotFound:
      description: a domain refusal with the NOT_FOUND code
      content:
        text/html: { schema: { type: string } }
    DeleteRefused:
      description: a domain refusal with the ASSET_DELETE_REFUSED code
      content:
        text/html: { schema: { type: string } }
    Busy:
      description: a domain refusal with the BUSY_RETRYABLE code — the only retryable failure
      content:
        text/html: { schema: { type: string } }
    InternalError:
      description: the terminal fallback — a failure carrying no domain code,
        which the translation component deliberately refuses to translate
      content:
        text/html: { schema: { type: string } }
  headers:
    X-Content-Type-Options:
      description: applied to every response; with the CSV export's content
        type it is one control, not two, because a CSV served without nosniff
        and without a correct Content-Type can be sniffed by the browser as
        HTML. The header is applied by the server to every response, so it
        is a property of the boundary rather than of one path, and no path
        needs to $ref it.
      schema: { type: string, enum: [nosniff] }
x-security:
  x-powered-by: absent
  note: the server implementation is not disclosed
  actor: the request carries no actor field, and a supplied actor is ignored
  csrf: conditional on the mechanism OQ1 selects — if the chosen actor
    mechanism relies on a browser-attached credential, a state-changing
    request that does not carry a recognised origin or a valid token is
    refused
security: []
failure:
  translation: the boundary is the single translation point from a domain code
    to an HTTP status, and it is the only place a status appears
  codes: [VALIDATION_ERROR, DUPLICATE_ASSET, NOT_FOUND, INVALID_TRANSITION,
          INVALID_STATE, ASSET_DELETE_REFUSED, BUSY_RETRYABLE, INTERNAL]
  retryable: BUSY_RETRYABLE only
  terminal_fallback: INTERNAL, for a failure carrying no domain code
  no_domain_failure_is_degraded: true
versioning:
  scheme: none
  additive_rule: a provider may add a field to a payload, or an endpoint, and
    a consumer ignores what it does not recognise, so those additions are
    never a breaking change
  closed_sets:
    rule: adding a value to a closed, cardinality-bound set is NOT an
      additive change; it is a breaking change, agreed between the provider
      and every consumer the change touches
    sets:
      - { name: status values, cardinality: 5 }
      - { name: transition edges, cardinality: 8 }
      - { name: audit actions, cardinality: 7 }
      - { name: error codes, cardinality: 8 }
      - { name: asset categories, cardinality: 2 }
    why: the browser renders a chip per status and an action control per
      legal edge, so a set that grows changes what the browser can render
  breaking_rule: every other change is agreed between the provider and each
    consumer it touches
  note: the browser consumes server-rendered pages, and no caching requirement
    exists in the release, so the contract carries no cache directive and no
    version number
```

---

## Contract Ownership Rules

**The provider owns the specification of what it exposes.** A unit owns the
contract for the surface it exposes, because it is the unit that changes when
that surface changes. This is the ordinary rule and it covers ten of the
twelve contracts.

**The vocabulary contract has one owner and four consumers.** U2 owns the
domain vocabulary for every unit that reads it, and a change to it is agreed
with all four consumers at once. This is the one contract with enough
consumers that a per-edge owner would produce four owners for one list.

**Contracts 8 and 9 have one provider and one consumer each, and they are
separate contracts for the same reason the vocabulary is one contract with
four consumers.** Both are owned by U3 and consumed by U5, but they carry
different things with different failure behaviours: contract 8 is the four
writes, and contract 9 is the history read. Merging them would give one
contract two unrelated failure models and one owner for two surfaces that
change for different reasons.

**The HTTP contract is owned by U5, and its status mapping is owned by U2.**
U5 owns the document, the endpoints, and the request and response shapes. U2
owns the code-to-status mapping, which the document cites rather than
restates. A change to the mapping is a change to U2's contract, agreed with
U5.

**Breaking changes are agreed, and agreement is between the provider and each
consumer the change touches.** There is no version number to negotiate
against, so the agreement is recorded where the change is made. The release's
practice that a behaviour change and its proof land in the same commit
applies here: the contract and the consumer's behaviour change together.

**Additive changes are safe because consumers ignore what they do not
recognise — but only where the set is open.** A provider may add a field to a
payload, an endpoint, or an operation. A consumer that meets an unrecognised
field, value, or endpoint ignores it rather than failing. This rule is what
makes the absence of version numbers safe.

**A closed, cardinality-bound set is not an open vocabulary, and adding to
one is a breaking change.** The release binds five sets by their
cardinality, and this contract set fixes those cardinalities:

| Set | Cardinality | Bound by |
|---|---|---|
| Status values | 5 | `FR3.2`'s five exclusive buckets, and the schema's `CHECK` constraint |
| Transition edges | 8 | `FR3.2` — "no other edge shall be legal" |
| Audit actions | 7 | `FR3.12` — "exactly these seven values" |
| Error codes | 8 | the component catalogue's error-vocabulary table and ADR-012 |
| Asset categories | 2 | the category vocabulary |

Adding a value to any of these five is **not** an additive change. A ninth
transition edge would make `apply_transition` accept an edge `FR3.2`
requires to be refused; a sixth status would break the schema's `CHECK`
constraint and the five-bucket invariant; a ninth error code would leave the
HTTP boundary unable to map every code in the vocabulary to a status. Each
such change is a **breaking change** and is agreed between the provider and
every consumer the change touches — and, where the schema's `CHECK`
constraint is affected, with U1 as well, because U1 owns the migration that
rebuilds the table.

**The additive rule therefore applies per set, not uniformly.** The sets that
*are* open are the reason values (the loss reasons and the retirement
reasons, whose contents are fixed at Code Generation), the filter
dimensions, the accepted values of the sort column and the sort direction, the
display labels for the five statuses, and the fields of a payload. Adding to
any of those is additive, subject to the agreement each contract names for
it.

**A new error code is additive for the domain units but not for the HTTP
boundary.** The boundary must map every code in the vocabulary to a status,
so a new error code requires agreement with U2's translation consumer. This
is the narrower case the general rule above generalises from.

**A contract is changed only by its owner.** No unit edits a contract it does
not own, even to add a field it needs. It asks the owner.

---

## What Is Not Specified Here

The component catalogue deliberately does not pin method names, API shapes,
data types, validation constraints, or relationship cardinality — it says so
in its own preamble, and names Contract Design as the stage that owns the
first two and Functional Design as the stage that owns the rest. This
contract set therefore fixes the **boundary**, and leaves the following to
the stages that own them.

**Not specified here — owned by Code Generation.** The literal values of the
loss-reason vocabulary and the retirement-specific values. This contract
binds their *shape* — an ordered list of non-empty strings, one list shared by
the loss and the recovery paths, one wider list for the discard — because the
shape is what the two edges' consumers must agree on, and the contents are
product content that the user-stories stage explicitly left to a later
decision.

**Not specified here — owned by Code Generation.** The accepted values of the
sort column and the sort direction. Both are whitelisted to literals, and
neither literal set is bound by any upstream artifact.

**Not specified here — owned by Code Generation.** The numeric value of
`busy_timeout`. The contract requires only that it is non-zero at the time
the uniqueness check runs.

**Not specified here — owned by Functional Design.** The attribute types of
the asset and the audit-entry entities, and the validation constraints on
each field.

**Not specified here — owned by this stage's own successor.** The exact
rendered HTML of each response body. The contract binds the endpoints, the
parameters, the status codes, the CSV's columns and headers, and the
structure the accessibility commitments require; the markup is the screen
components' business.

**Not specified here — owned by an open decision.** The actor-resolution
mechanism (`OQ1`). Contract 11 fixes the interface, the trust rule, the
stability requirement, and the constraint on whatever mechanism is chosen; the
mechanism itself is not this stage's to choose.

---

## Open Questions

| Contract | Question | Blocks |
|---|---|---|
| 11 — foundation to presentation | Which actor-identity mechanism does the release use (`OQ1`)? The interface and the trust rule are fixed, but the mechanism behind them is not, and `NFR2.5`'s CSRF obligation is conditional on it. | U1's construction, and the construction of U5's read-only acting-as indicator |
| 12 — presentation to the browser | Does the chosen actor mechanism rely on a browser-attached credential? If it does, the state-changing routes must refuse a request that carries no recognised origin or valid token, and that obligation cannot be specified as a route rule until the mechanism is known. | U5's route layer, and the CSRF obligation's test |
| 2 — vocabulary to write path | What are the literal loss-reason and retirement-specific reason values? The contract binds the shape; the contents are not fixed by any artifact. | The reason dialog's option list, and the three reason-required refusals' test fixtures |
| 3 — vocabulary to reporting | What are the accepted values of the sort column and the sort direction? Both are whitelisted to literals and neither literal set is bound. | The list's sort control and the query's sort clause |
| 5 — foundation to write path | What numeric `busy_timeout` does the release use? The contract requires only that it is non-zero. | The lock-wait measurement in `NFR1.1`, and the concurrency test's timing |
| 1, 2, 4 — the vocabulary contracts | The upstream component catalogue's own summary line states the domain error-code vocabulary holds "exactly nine values", while its error-vocabulary table, ADR-012, and the requirements all bind **eight**. This contract set uses eight, and the discrepancy is an upstream recording defect to be corrected in the catalogue. | Nothing in this release; the correction belongs to the domain-design artifact and does not reopen the approved decision set |

---

## Sources Consumed

- `aidlc/spaces/default/intents/261106-asset-tracker-mvp/inception/units-generation/unit-of-work.md`
  — the six units, their kinds, their deployment models, and each unit's
  component assignment (the units-generation stage).
- `aidlc/spaces/default/intents/261106-asset-tracker-mvp/inception/units-generation/unit-of-work-dependency.md`
  — the ten-edge dependency DAG, the authoritative machine-readable edge
  block, and the seam table between units (the units-generation stage).
- `aidlc/spaces/default/intents/261106-asset-tracker-mvp/inception/domain-design/components.md`
  — the twenty-one-component catalogue, the entity-ownership table, the
  display vocabulary, the error vocabulary, and the external-dependencies
  table (the domain-design stage).
- `aidlc/spaces/default/intents/261106-asset-tracker-mvp/inception/domain-design/decisions.md`
  — the fifteen ADRs, including the write path's transition ownership
  (ADR-006), the actor's fixed interface (ADR-005), the uniqueness
  component's two transaction disciplines (ADR-008), the rebuild's ordering
  (ADR-009), and the error vocabulary's single translation point (ADR-012).
- `aidlc/spaces/default/intents/261106-asset-tracker-mvp/inception/requirements-analysis/requirements.md`
  — `FR1.4`–`FR1.7` (the uniqueness definition and the two failure classes),
  `FR2.1`–`FR2.8` (attribution, the trust rule, append-only), `FR3.2` (the
  eight released edges), `FR3.12` and `AC3.6.1` (the seven audit actions),
  `FR5.1` (the display-holder rule), `FR6.1`–`FR6.8` (the shared counting
  definition and the indivisible group), `FR9.1`–`FR9.7` (the export), and
  `C1`–`C13` (the constraints, including the deployment target and the
  layering rule).
- `aidlc/spaces/default/intents/261106-asset-tracker-mvp/inception/user-stories/stories.md`
  — `AC3.6.1` (the seven audit actions, verbatim), the acceptance criteria
  that fix the filter dimensions and the export's column set, and the
  recorded deferral of the loss-reason vocabulary's contents.
- `aidlc/spaces/default/memory/team.md` — the affirmed practices on the
  error contract, the transaction rule, the actor-trust rule, the CSV
  escaping rule, the header hardening, and the deployment target.
- `aidlc/spaces/default/memory/project.md` — the binding 17-item decision
  set and its seven standing conditions, and the `## Mandated` and
  `## Forbidden` product-behaviour contracts.
- `aidlc/spaces/default/intents/261106-asset-tracker-mvp/inception/contract-design/contract-design-questions.md`
  — the eight confirmed answers this contract set is generated from.
