# Entities — Domain Vocabulary and Error Contract (`u2-domain-vocabulary`)

**Stage**: functional-design (construction)
**Intent**: 261106-asset-tracker-mvp
**Space**: default
**Scope**: feature
**Unit**: `u2-domain-vocabulary` — Domain Vocabulary and Error Contract
**Unit kind**: `library`

This file describes the domain concepts the `u2-domain-vocabulary` unit owns.

**What this file is about.** This unit owns the release's **vocabulary** — the
closed sets of named values that the rest of the application must agree on, and
the rules that derive a value from another. It owns **no persisted entity**.
The release has exactly two persisted entities, `Asset` and `AuditEntry`, and
both are owned by other units; ADR-007 records that there is deliberately no
`Holder` entity and no `Actor` entity, because a holder is a display name
derived from the asset rows rather than a record of its own.

So the concepts described below are **vocabulary concepts**: closed sets of
values, and the derivations over them. They are the subjects of this unit's
`rules.md` and `functional-spec.md`, and they are what every other unit reads
when it needs to know a status, a legal transition, a reason, a comparison
rule, an action name or an error code.

**How a consumer reads this file.** Each concept names its values, the rules
that govern it, and the components that read it. A consumer that reads one
concept can implement against it without reading another.

---

## Source of Truth

```yaml entities
entities:
  - name: StatusBucket
    description: >
      One of the five exclusive buckets an asset is in. The buckets are
      mutually exclusive and their union is the set of all assets, so every
      asset is counted exactly once by any grouping over this set.
    attributes:
      - name: value
        logical_type: enumeration
        required: true
        unique: true
        allowed_values: [in-stock, assigned, returned, lost, discarded]
        default: none
        constraints: >
          The value is the asset's stored status. It is never rendered to a
          person; BR1.2 maps it to its display label.
      - name: display_label
        logical_type: text
        required: true
        unique: false
        references: none
        allowed_values: [In stock, Assigned, Returned, Lost, Discarded]
        default: none
        constraints: >
          Resolved from the one mapping in the vocabulary. The label and the
          chip class that carries it are resolved from the same mapping, so
          no two surfaces can render the same status differently.
    entity_level_constraints:
      - Every asset is in exactly one bucket (BR1.1).
      - The bucket count is exactly five (BR1.1).
      - The display label is never the stored value (BR1.2).
      - The mapping exists exactly once, in this unit (BR1.3, BR10.1).
    relationships:
      - target: TransitionEdge
        cardinality: one-to-many
        direction: StatusBucket to TransitionEdge
        description: A bucket is the origin of zero or more released edges.
      - target: FilterDimension
        cardinality: many-to-one
        direction: StatusBucket to FilterDimension
        description: The status filter dimension's accepted values are the five buckets.
    governing_rules: [BR1.1, BR1.2, BR1.3, BR10.1]

  - name: TransitionEdge
    description: >
      A directed move from one status bucket to another. Exactly eight edges
      are released in this release. Two further edges — in-stock to discarded
      and returned to discarded — are deferred: they are not in the table, and
      a request for either is refused.
    attributes:
      - name: from_status
        logical_type: enumeration
        required: true
        unique: false
        references: StatusBucket
        allowed_values: [in-stock, assigned, returned, lost, discarded]
        default: none
        constraints: The edge is legal only from this status and from no other (BR2.2).
      - name: to_status
        logical_type: enumeration
        required: true
        unique: false
        references: StatusBucket
        allowed_values: [in-stock, assigned, returned, lost, discarded]
        default: none
        constraints: >
          A member of the released set of eight, and therefore a legal
          destination.
      - name: audit_action
        logical_type: enumeration
        required: true
        unique: false
        references: AuditAction
        allowed_values: [assign, return, mark-lost, discarded, recovered]
        default: none
        constraints: >
          The action an entry carries when this edge is taken. All three loss
          edges carry mark-lost regardless of origin (BR4.2). The recovery
          edge carries recovered, never assign and never return (BR4.3).
      - name: reason_required
        logical_type: boolean
        required: true
        unique: false
        references: ReasonVocabulary
        allowed_values: [true, false]
        default: false
        constraints: >
          True for the three loss edges, the recovery edge and the discard
          edge, and false for the assign, return and re-assign edges.
    entity_level_constraints:
      - The released edge count is exactly eight (BR2.1).
      - Every edge's origin and destination are members of the five buckets (BR2.1).
      - No two edges share the same origin and destination pair (BR2.1).
      - The two deferred edges are not members of this set (BR2.3).
    relationships:
      - target: StatusBucket
        cardinality: many-to-one
        direction: TransitionEdge to StatusBucket
        description: The edge's origin bucket and its destination bucket.
      - target: AuditAction
        cardinality: many-to-one
        direction: TransitionEdge to AuditAction
        description: The action the edge's audit entry carries.
      - target: ReasonVocabulary
        cardinality: many-to-one
        direction: TransitionEdge to ReasonVocabulary
        description: The reason set the edge draws from, where one is required.
    governing_rules: [BR2.1, BR2.2, BR2.3, BR4.2, BR4.3]

  - name: ReasonVocabulary
    description: >
      A closed set of reasons a person may record against a loss, a recovery
      or a retirement. Two sets are held: a general loss-reason set, and a
      retirement-reason set. A reason is a controlled vocabulary entry, not
      free text.
    attributes:
      - name: value
        logical_type: text
        required: true
        unique: true
        references: none
        allowed_values: [damaged, lost, stolen, superseded, returned-to-supplier, written-off]
        default: none
        constraints: >
          A non-empty identifier drawn from exactly one of the two sets. The
          value identifies the reason; it is not the display wording.
      - name: reason_set
        logical_type: enumeration
        required: true
        unique: false
        references: none
        allowed_values: [loss, retirement]
        default: none
        constraints: >
          Which of the two named sets the value belongs to, so that a surface
          can distinguish a loss reason from a retirement reason.
      - name: acceptable_for
        logical_type: list
        required: true
        unique: false
        references: none
        allowed_values: [loss, recovery, retirement]
        default: none
        constraints: >
          The operations that accept this value, as a list. A general loss
          reason is acceptable for a loss **and** for a recovery, so its list
          holds two entries. A retirement reason is acceptable for a
          retirement only, so its list holds one entry, even though a
          retirement's acceptable set is the union of both sets. The
          per-value membership is stated by BR3.3.
    entity_level_constraints:
      - The general set holds exactly three values (BR3.1).
      - The retirement set holds exactly three values (BR3.2).
      - The two sets are disjoint and separately named (BR3.2).
      - A retirement's acceptable set is the union of both (BR3.3).
      - A reason is mandatory for a loss, a recovery and a retirement (BR3.4).
    relationships:
      - target: TransitionEdge
        cardinality: many-to-one
        direction: ReasonVocabulary to TransitionEdge
        description: The edges whose operations draw a reason from this vocabulary.
    governing_rules: [BR3.1, BR3.2, BR3.3, BR3.4]

  - name: AuditAction
    description: >
      The name recorded on an audit entry. Seven values, of which four are the
      ones the existing application already records and three are the release's
      additions.
    attributes:
      - name: value
        logical_type: enumeration
        required: true
        unique: true
        references: none
        allowed_values: [create, assign, return, mark-lost, recovered, discarded, edit]
        default: none
        constraints: >
          The action is drawn from this set and from no other. The four
          existing values keep their names; the release adds recovered,
          discarded and edit.
      - name: origin
        logical_type: enumeration
        required: true
        unique: false
        references: none
        allowed_values: [existing, added-by-this-release]
        default: none
        constraints: >
          Records which values the release added, so that a reader can see
          that no existing value was renamed.
    entity_level_constraints:
      - The action count is exactly seven (BR4.1).
      - All three loss edges share the mark-lost action (BR4.2).
      - The recovery edge's action is recovered, never assign and never return (BR4.3).
      - An entry's description names a specific of its event beyond the action name (BR4.4).
    relationships:
      - target: TransitionEdge
        cardinality: many-to-one
        direction: AuditAction to TransitionEdge
        description: The edges whose entries carry this action.
    governing_rules: [BR4.1, BR4.2, BR4.3, BR4.4]

  - name: BackfillAttribution
    description: >
      The actor value stamped onto pre-MVP audit history that the foundation
      unit's backfill writes. It is a single reserved value, distinct from
      any person-attributed actor, and it is what makes backfilled history
      distinguishable from the release's own history.
    attributes:
      - name: value
        logical_type: enumeration
        required: true
        unique: true
        references: none
        allowed_values: [system]
        default: none
        constraints: >
          The literal reserved value `system`, and no other. The foundation
          unit stamps it onto every pre-MVP audit row the backfill creates.
      - name: usage
        logical_type: text
        required: true
        unique: false
        references: none
        allowed_values: any
        default: none
        constraints: >
          The attribution is for pre-MVP history only. The backfill preserves
          the original rows and their content, and stamps this value as the
          actor; it does not rewrite the original records.
    entity_level_constraints:
      - The value is exactly the literal `system` (BR11.1).
      - The value is reserved for backfilled history and is never a person's actor (BR11.2).
      - Backfilled history is excluded from the Audit Completeness metric (BR11.3).
    relationships:
      - target: AuditAction
        cardinality: many-to-one
        direction: BackfillAttribution to AuditAction
        description: >
          The backfill writes audit rows whose actions are drawn from the
          action vocabulary, and which carry this attribution.
    governing_rules: [BR11.1, BR11.2, BR11.3]

  - name: DomainErrorCode
    description: >
      A machine-readable name for a domain refusal. A consumer distinguishes
      failures by code and never by message text. Eight codes are held: the
      five the existing application already raises, plus a delete refusal, a
      retryable busy condition, and an internal fallback.
    attributes:
      - name: value
        logical_type: enumeration
        required: true
        unique: true
        references: none
        allowed_values:
          - VALIDATION_ERROR
          - DUPLICATE_ASSET
          - NOT_FOUND
          - INVALID_TRANSITION
          - INVALID_STATE
          - ASSET_DELETE_REFUSED
          - BUSY_RETRYABLE
          - INTERNAL
        default: none
        constraints: >
          The code is the identity of the failure. Its meaning is the code; the
          prose beside it is free to change.
      - name: retryable
        logical_type: boolean
        required: true
        unique: false
        references: none
        allowed_values: [true, false]
        default: false
        constraints: >
          True only for the busy code. Every other code is permanent and is
          resolved by changing the request.
      - name: meaning
        logical_type: list
        required: true
        unique: false
        references: none
        allowed_values:
          - a field is missing, empty, or outside its accepted values
          - the serial or key collides with an existing asset in the same category
          - the asset named by the request does not exist
          - the requested edge is not one of the eight released edges
          - the asset's stored status is outside the five buckets
          - a delete is attempted against an asset row
          - the database is locked
          - a failure carrying no domain code
        default: none
        constraints: >
          What the code denotes, independent of the boundary's reading of it.
          This attribute is **per-code**: it holds exactly eight entries, one
          per code in `value`, in the same order, and the i-th entry is the
          meaning of the i-th code.
      - name: raised_when
        logical_type: list
        required: true
        unique: false
        references: none
        allowed_values: [a field is invalid, a collision is detected, an asset is absent, a transition is illegal, a status is unknown, a delete is refused, the database is locked, no domain code is present]
        default: none
        constraints: >
          The condition under which a component raises this code. This
          attribute and `meaning` are **per-code**: each holds exactly eight
          entries, one per code in `value`, in the same order. The i-th entry
          of each belongs to the i-th code of `value`.
    entity_level_constraints:
      - The code count is exactly eight (BR6.1).
      - Every code is mapped at the boundary, so none surfaces as an unmapped internal error (BR6.2).
      - Exactly one code is retryable (BR6.3).
      - A failure carrying no domain code is not given one (BR6.4).
      - The vocabulary holds no boundary concept at all; the mapping from a code to the boundary's status is the translation component's own content (BR6.5).
      - One code covers the duplicate-serial condition at both tiers (BR5.5).
    relationships:
      - target: StatusBucket
        cardinality: many-to-one
        direction: DomainErrorCode to StatusBucket
        description: The invalid-state code is raised when a status is outside the five buckets.
      - target: TransitionEdge
        cardinality: many-to-one
        direction: DomainErrorCode to TransitionEdge
        description: The invalid-transition code is raised when an edge is not one of the eight.
    governing_rules: [BR6.1, BR6.2, BR6.3, BR6.4, BR6.5, BR6.6, BR5.5]

  - name: DisplayHolder
    description: >
      The holder an asset is shown under. It is derived from the asset's two
      holder fields rather than read from a holder record, because the release
      has no holder entity. This concept is a derivation, not a stored value.
    attributes:
      - name: current_holder
        logical_type: text
        required: false
        unique: false
        references: none
        allowed_values: any non-empty display name
        default: none
        constraints: The holder of the asset right now.
      - name: previous_holder
        logical_type: text
        required: false
        unique: false
        references: none
        allowed_values: any non-empty display name
        default: none
        constraints: >
          The preserved previous holder. It never takes the current holder's
          value, and the current holder never takes its value.
      - name: display_holder
        logical_type: text
        required: true
        unique: false
        references: none
        allowed_values: any non-empty display name, or the reserved Unassigned designation
        default: none
        constraints: >
          The derived holder: the current holder where one exists, otherwise
          the preserved previous holder where one exists, otherwise the
          reserved Unassigned designation.
      - name: never_held
        logical_type: boolean
        required: true
        unique: false
        references: none
        allowed_values: [true, false]
        default: false
        constraints: >
          True when the asset has never been held by anybody, which is the
          only condition under which the reserved designation applies.
      - name: counts_as_holder
        logical_type: boolean
        required: true
        unique: false
        references: none
        allowed_values: [true, false]
        default: false
        constraints: >
          False for the reserved Unassigned designation, which is a display
          value meaning "held by nobody" rather than the name of a person.
          True for every derived display holder that names somebody.
    entity_level_constraints:
      - The display holder is derived here, once, and every consumer calls that derivation (BR7.1).
      - The two holder fields never echo one another (BR7.2).
      - The reserved designation is a distinct value and applies only to never-held assets (BR7.3).
      - The reserved designation is not counted as a holder, so a holder count excludes it and the rendered row count is one greater (BR7.4).
    relationships:
      - target: StatusBucket
        cardinality: many-to-one
        direction: DisplayHolder to StatusBucket
        description: >
          A recovered or discarded asset is shown under its preserved previous
          holder, which is why the derivation consults the previous holder
          rather than the status alone.
    governing_rules: [BR7.1, BR7.2, BR7.3, BR7.4]

  - name: FilterDimension
    description: >
      One dimension of the shared asset filter. The filter is defined over five
      form dimensions and carries a holder dimension in the filter state in
      addition to them. The directory's holder search is not one of these
      dimensions: it filters holder rows, not assets. Every count-consuming
      surface applies this asset-filter definition.
    attributes:
      - name: name
        logical_type: text
        required: true
        unique: true
        references: none
        allowed_values: [search_text, category, status, sort_column, sort_direction, holder]
        default: none
        constraints: >
          The dimension's name. Five names are the form's dimensions. `holder`
          is carried in the filter state and set by a directory row link. The
          directory's holder search is not a name in this list.
      - name: kind
        logical_type: enumeration
        required: true
        unique: false
        references: none
        allowed_values: [free-text, enumerated]
        default: none
        constraints: >
          A free-text dimension matches by containment; an enumerated
          dimension matches one of its accepted values.
      - name: accepted_values
        logical_type: list
        required: false
        unique: false
        references: none
        allowed_values: >
          For category: hardware and software-license. For status: the five
          buckets. For sort_column: name and created_at. For sort_direction:
          asc and desc. For search_text and holder: none — the dimension is
          free text.
        default: none
        constraints: >
          A closed set for every enumerated dimension. A value outside the set
          causes the dimension to be omitted, not treated as a match.
      - name: applies_to
        logical_type: list
        required: false
        unique: false
        references: DisplayHolder
        allowed_values: any
        default: none
        constraints: >
          The asset field or fields the dimension matches over. For the
          search-text dimension, the asset's name and its serial or key. For
          the holder dimension, the single field it matches over: the asset's
          **display holder**, as derived by this unit's display-holder rule,
          and not the raw current-holder column. The directory's holder search
          is not this attribute: it filters holder rows. The
          status dimension's accepted values are carried by the entity-level
          relationship to `StatusBucket` rather than by this attribute, since
          the status dimension matches on a bucket value rather than on a
          field.
      - name: whitelisted_literal
        logical_type: boolean
        required: true
        unique: false
        references: none
        allowed_values: [true, false]
        default: false
        constraints: >
          True for the sort column and the sort direction, whose values are
          whitelisted to literals rather than being parameterised.
    entity_level_constraints:
      - The form's dimension count is exactly five (BR8.1).
      - The holder dimension is carried in the filter state and is not one of the form's dimensions, and it matches over the display holder (BR8.1).
      - The directory's holder-search dimension is a free-text match over the same display-holder name (BR8.5).
      - Every enumerated dimension's accepted set is closed (BR8.2).
      - A value outside an accepted set omits that dimension only (BR8.3).
      - All four count-consuming surfaces apply this one definition (BR8.4).
    relationships:
      - target: StatusBucket
        cardinality: many-to-one
        direction: FilterDimension to StatusBucket
        description: The status dimension's accepted values are the five buckets.
      - target: DisplayHolder
        cardinality: many-to-one
        direction: FilterDimension to DisplayHolder
        description: The holder and holder-search dimensions match over the derived display holder.
    governing_rules: [BR8.1, BR8.2, BR8.3, BR8.4, BR8.5]

  - name: DerivedFigure
    description: >
      A named count the shared counting definition yields. The unit names the
      figures and the rule that produces each one; the aggregation that
      evaluates them belongs to the reporting unit, because the split follows
      the data rather than the layer.
    attributes:
      - name: name
        logical_type: text
        required: true
        unique: true
        references: none
        allowed_values:
          - in_stock_count
          - assigned_count
          - returned_count
          - lost_count
          - discarded_count
          - active_inventory_count
          - total_record_count
          - available_to_assign_count
        default: none
        constraints: The figure's name.
      - name: derivation
        logical_type: text
        required: true
        unique: false
        references: FilterDimension
        allowed_values: any
        default: none
        constraints: >
          The rule that produces the figure from the filter definition — for
          example, the total record count is the count of every asset matching
          the filter, and the active inventory count is that count less the
          assets in the discarded bucket.
      - name: relation
        logical_type: text
        required: false
        unique: false
        references: none
        allowed_values: any
        default: none
        constraints: >
          The relation the figure holds to another figure, where one does —
          the five bucket counts sum to the total record count, and the
          difference between the total record count and the active inventory
          count is exactly the discarded count. The reporting unit's own
          figures are named in the `## The Figures and Their Relations`
          table below rather than here, because they are the reporting unit's
          return shape rather than this unit's definition.
    entity_level_constraints:
      - The five bucket counts sum to the total record count (BR9.1).
      - The active inventory excludes discarded assets and the total record count includes them (BR9.2).
      - The available-to-assign count is the count of assets in the in-stock bucket (BR9.3).
      - The figures are derived by one aggregation and read by every surface (BR9.4).
      - The shown count never exceeds the matching count (BR9.5).
      - A holder row's per-bucket chips sum to that row's total (BR9.6).
    relationships:
      - target: FilterDimension
        cardinality: many-to-one
        direction: DerivedFigure to FilterDimension
        description: Every figure is derived from the one filter definition.
      - target: StatusBucket
        cardinality: many-to-one
        direction: DerivedFigure to StatusBucket
        description: The bucket counts are one figure per bucket.
      - target: DisplayHolder
        cardinality: many-to-one
        direction: DerivedFigure to DisplayHolder
        description: >
          The holder-grouped counts derive from the same display-holder
          derivation, so a holder row's total and its per-bucket chips agree.
    governing_rules: [BR9.1, BR9.2, BR9.3, BR9.4, BR9.5, BR9.6]

  - name: NormalisationOperation
    description: >
      The single normalisation the serial-or-key comparison is defined by:
      trim leading and trailing whitespace, then fold case. It is scoped
      within a category. The database's functional unique index implements the
      same operation, so the two tiers cannot disagree about what counts as a
      collision.
    attributes:
      - name: steps
        logical_type: ordered-list
        required: true
        unique: true
        references: none
        allowed_values: [trim leading and trailing whitespace, fold case]
        default: none
        constraints: >
          The steps, in order. The operation is one named thing with two
          ordered steps, not two separate definitions.
      - name: case_fold_scope
        logical_type: enumeration
        required: true
        unique: false
        references: none
        allowed_values: [ascii-only]
        default: none
        constraints: >
          The fold lowercases the ASCII letters A to Z and leaves every other
          character unchanged. It is deliberately ASCII-only, because the
          database's functional index expression implements the fold with
          SQLite's `LOWER()`, which is ASCII-only; a Unicode-aware fold in the
          application tier and an ASCII-only fold in the index tier would
          disagree on a non-ASCII letter. Both tiers therefore leave every
          non-ASCII letter unchanged. A disagreement on any character,
          including a non-ASCII letter, is a defect. A Unicode-aware fold is
          not this operation.
      - name: scope
        logical_type: enumeration
        required: true
        unique: false
        references: none
        allowed_values: [within a category]
        default: none
        constraints: >
          Two values in different categories never collide, whatever their
          normalised forms.
      - name: excluded_asset
        logical_type: reference
        required: false
        unique: false
        references: none
        allowed_values: any
        default: none
        constraints: >
          An optional asset to exclude from the comparison, so that an asset
          saving its own serial or key is not a collision with itself.
      - name: storage_form
        logical_type: enumeration
        required: true
        unique: false
        references: none
        allowed_values: [as supplied by the user]
        default: none
        constraints: >
          The normalised form is for comparison only; the serial or key is
          stored and displayed as the user supplied it.
    entity_level_constraints:
      - The operation is one definition with one ordered pair of steps (BR5.1).
      - The database index expression implements the same operation (BR5.2).
      - The serial or key is stored as the user supplied it (BR5.3).
      - The comparison may exclude the asset being edited (BR5.4).
      - Both tiers' collisions carry one code (BR5.5).
    relationships:
      - target: DomainErrorCode
        cardinality: one-to-many
        direction: NormalisationOperation to DomainErrorCode
        description: A collision detected by the comparison carries the duplicate-serial code.
    governing_rules: [BR5.1, BR5.2, BR5.3, BR5.4, BR5.5]
```

---

## The Code-to-Status Mapping

The mapping from each domain code to the boundary's reading of it is
`ErrorTranslation`'s own content. The vocabulary holds the **code set** and
each code's **retryable flag**; the translation component holds the
**status column**. This is the approved answer to the stage's Q10 — option
**B** — and it is stated here in full so a developer can read it directly
rather than reconstructing it from two vocabularies.

| Code | Boundary status | Retryable | Meaning |
|---|---|---|---|
| `VALIDATION_ERROR` | 400 | No | A field is missing, empty, or outside its accepted values |
| `DUPLICATE_ASSET` | 409 | No | The serial or key collides with an existing asset in the same category |
| `NOT_FOUND` | 404 | No | The asset named by the request does not exist |
| `INVALID_TRANSITION` | 400 | No | The requested edge is not one of the eight released edges |
| `INVALID_STATE` | 400 | No | The asset's stored status is outside the five buckets |
| `ASSET_DELETE_REFUSED` | 405 | No | A delete is attempted against an asset row |
| `BUSY_RETRYABLE` | 503 | **Yes** | The database is locked, detected from `SQLITE_BUSY` |
| `INTERNAL` | 500 | No | A failure carrying no domain code — the terminal fallback |

**The mapping is one list, and the translation component is its only reader.**
The table above is the single copy in the release. It is not held by the
vocabulary, so no domain component can reach a status by reading the
vocabulary, and it is not held by the caller, so no two callers can disagree
about what a code means at the boundary. `ErrorTranslation` reads the code
off the refusal's machine-readable `code` property, looks the code up in this
mapping, and returns the boundary's status together with whether the refusal
may be retried.

**The delete refusal is raised before any statement runs.** `ASSET_DELETE_REFUSED`
is the release's standing refusal of a delete against an asset row, and the
refusal does not depend on the database to make it: it is raised before any
statement is issued, so the refusal is the same whether or not the database
is reachable, and no statement that could destroy an asset row or its history
is ever issued. The refusal is permanent — it is resolved by not deleting, not
by retrying.

**A code outside the set has no translation.** A failure carrying a code that
is present but not one of the eight is surfaced as the internal fallback, on
the same reasoning as a failure carrying no code at all: translating a code
the release does not define would invent a meaning the release has not
defined. `INTERNAL` is therefore the terminal fallback for both the
no-code case and the unrecognised-code case, and it is the only code that is
not reached by a domain component raising a refusal of its own.

**How this reconciles with the upstream contract.** The upstream contract
binds the status to the vocabulary — "their HTTP statuses are part of the
vocabulary rather than of the caller" — and the component catalogue names
`ErrorTranslation` as the single translation point. The approved answer to
this stage's Q10 places the status column in the translation component
rather than in the vocabulary, so that the vocabulary holds no HTTP concept
at all and the leaf property holds literally rather than by argument. The
substance of the contract is preserved in full: the status is bound to this
unit rather than to the caller, the mapping is held once, and every code in
the set is mapped so that no code reaches the client as an unmapped internal
error. The vocabulary is bound to the *code set* and the *retryable flag*;
the status is bound to the translation component, which is the only consumer
of the code set that ever asks the question.

---

## The Figures and Their Relations

This unit's counting **definition** names eight figures and the relations
between them. The counting component that evaluates the definition belongs to
the reporting unit, and its **return shape** carries two further figures that
are the reporting unit's own — the asset list's shown and matching counts.

| Figure | Owner | Definition |
|---|---|---|
| `in_stock_count` | This unit | The count of assets in the `in-stock` bucket matching the filter |
| `assigned_count` | This unit | The count of assets in the `assigned` bucket matching the filter |
| `returned_count` | This unit | The count of assets in the `returned` bucket matching the filter |
| `lost_count` | This unit | The count of assets in the `lost` bucket matching the filter |
| `discarded_count` | This unit | The count of assets in the `discarded` bucket matching the filter |
| `active_inventory_count` | This unit | The count of matching assets that are not in the `discarded` bucket |
| `total_record_count` | This unit | The count of every matching asset, including discarded ones |
| `available_to_assign_count` | This unit | The count of matching assets in the `in-stock` bucket |
| `shown` | The reporting unit | The count of records the asset list actually renders |
| `matching` | The reporting unit | The count of records matching the filter, before the list's own limit is applied |

**The relations this unit states.**

- The five bucket counts sum to the total record count (BR9.1).
- The active inventory excludes discarded assets; the total record count
  includes them; their difference is exactly the discarded count (BR9.2).
- The available-to-assign count is the in-stock bucket count (BR9.3).
- The shown count never exceeds the matching count, and the matching count
  never exceeds the total record count for the same filter (BR9.5).
- A holder row's per-bucket chips sum to that row's total (BR9.6).

**What belongs to the reporting unit, and what does not.** The `shown` and
`matching` **figures** are the reporting unit's, because they depend on how
many rows the list chooses to render, which is the reporting unit's decision.
The **relation** between them is stated here, because a relation that is not
stated is a relation two surfaces may disagree about. What this unit
guarantees is that every figure — its own eight and the reporting unit's two
— is derived from the same filter definition, so that the count a surface
reports never depends on which definition it happened to apply.

---

## Human-Readable Summary

### The ten concepts this unit owns

| Concept | What it is | Count it holds | Governing rules |
|---|---|---|---|
| `StatusBucket` | The five exclusive buckets an asset is in, each with its display label | 5 buckets | BR1.1–BR1.3 |
| `TransitionEdge` | The released moves between buckets | exactly 8 edges | BR2.1–BR2.3 |
| `ReasonVocabulary` | The closed sets of reasons a person may record | 3 + 3 values | BR3.1–BR3.4 |
| `AuditAction` | The name recorded on an audit entry | exactly 7 values | BR4.1–BR4.3 |
| `NormalisationOperation` | The one definition of "does this serial collide" | 1 operation, 2 steps | BR5.1–BR5.5 |
| `DomainErrorCode` | The machine-readable name of a domain refusal | exactly 8 codes | BR6.1–BR6.6 |
| `DisplayHolder` | The derived holder an asset is shown under | 1 derivation | BR7.1–BR7.4 |
| `FilterDimension` | One dimension of the shared asset filter | 5 form dimensions plus the carried holder dimension | BR8.1–BR8.4 |
| `DerivedFigure` | A count derived from that filter | 8 figures | BR9.1–BR9.6 |
| `BackfillAttribution` | The reserved actor value stamped onto backfilled history | exactly 1 value | BR11.1–BR11.3 |

### Why there is no `Asset` or `AuditEntry` entity in this file

The release has two persisted entities and this unit owns neither. `Asset` is
owned by the foundation unit's repository and the write path's components;
`AuditEntry` is owned by the audit repository. They are not re-described here
because a unit that re-described them would be a second statement about the
same entities, and two statements about one thing is what drifts.

What this unit owns is the **validation relationship** each vocabulary concept
bears on those entities, and that relationship is stated in `rules.md` as a
rule with a trigger, not as an attribute of a foreign entity. `StatusBucket`
governs an asset's status; `TransitionEdge` governs a status change;
`DomainErrorCode` governs a refusal; `ReasonVocabulary` governs a recorded
reason; `AuditAction` governs an audit entry's action; `NormalisationOperation`
governs a serial or key; `DisplayHolder` governs how a holder is shown;
`FilterDimension` and `DerivedFigure` govern what a query selects and counts.

### Two derivations, not two stored values

`DisplayHolder` is a derivation over the asset's two holder fields, and the
derivation happens here, once. A consumer that needs a holder calls it; no
consumer applies the fallback order for itself. This is what makes the
directory's rows agree with the asset list's rows, and what makes the
reserved `Unassigned` designation distinguishable from a holder whose name
happens to read `Unassigned`.

`NormalisationOperation` is likewise one definition with three callers — the
registration path, the edit path, and the inline duplicate warning — and a
fourth consumer in the database's functional index expression, which
implements the same operation. Four consumers of one definition cannot
disagree with each other about what a collision is.

### The two deferred edges are recorded, not omitted

`TransitionEdge` holds exactly eight edges. The two deferred edges — `in-stock`
to `discarded` and `returned` to `discarded` — are **not** members, and
`BR2.3` states that a request for either is refused with the invalid-transition
code. They are named here so that a reader can see they were considered and
deferred rather than overlooked, and so that the later increment has an
attachment point: this unit's transition table is where they join.

### What this unit holds no state about

The vocabulary holds no asset, no audit entry, no holder record, and no
database handle. Its values are the same for every caller in the process, and
the unit depends on nothing but the platform's own runtime.
