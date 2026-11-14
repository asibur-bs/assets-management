# Business Rules — Domain Vocabulary and Error Contract (`u2-domain-vocabulary`)

**Stage**: functional-design (construction)
**Intent**: 261106-asset-tracker-mvp
**Space**: default
**Scope**: feature
**Unit**: `u2-domain-vocabulary` — Domain Vocabulary and Error Contract
**Unit kind**: `library`

This file states the business rules the `u2-domain-vocabulary` unit enforces.
Every rule is numbered, named, categorised, given its trigger, its logic in
plain language, the behaviour on violation, and the requirement it comes from.

**Scope of this file.** These are the rules the unit *owns and enforces*. They
are the rules every consumer of the vocabulary is bound by, so that two
components reading the same vocabulary cannot reach two different conclusions.
Rules enforced elsewhere — a transition's field writes, a transaction's
commit, an audit entry's contents — belong to the units that own them and are
**not** restated here.

**How a rule is read.** The `logic` field states the rule in plain language
with no code, no SQL and no framework reference. A consumer that reads one
rule and one rule only can implement it correctly.

---

## Source of Truth

```yaml rules
rules:
  - id: BR1.1
    name: The five exclusive status buckets
    statement: >
      Every asset is in exactly one of five status buckets — in-stock,
      assigned, returned, lost, discarded — and the buckets are mutually
      exclusive and their union is the set of all assets.
    category: constraint
    applies-to: Asset status
    trigger: Whenever an asset's status is read, written, filtered on, grouped by, or counted.
    logic: >
      IF a status value is offered for an asset THEN it is one of in-stock,
      assigned, returned, lost, discarded. A status outside this set is not a
      status. Two buckets never hold the same asset, and no asset is in no
      bucket.
    violation-behaviour: >
      A status outside the set is refused with the invalid-state error code.
      The asset row is not written and no audit entry is appended.
    source: FR3.1

  - id: BR1.2
    name: The status display label mapping
    statement: >
      Each of the five statuses is displayed with exactly one label — In stock,
      Assigned, Returned, Lost, Discarded — and the stored value is never
      shown to a person.
    category: policy
    applies-to: Status display
    trigger: Whenever a status is rendered to a person.
    logic: >
      IF a status is rendered THEN its label is resolved from the mapping in
      the vocabulary. The stored value is never rendered. The label and the
      chip class that carries it are resolved from the same mapping, so the
      list's chips, the list's filter options, the detail screen's chip and
      the directory's per-holder chips cannot show different things for the
      same status.
    violation-behaviour: >
      A surface that renders a stored value instead of a label is a defect in
      that surface; the vocabulary provides no way for it to happen by
      omission, because the label is resolved from the mapping.
    source: FR3.1

  - id: BR1.3
    name: The display-label mapping is the only place a label is written
    statement: >
      The mapping from a stored status to its display label exists exactly
      once, in this unit's vocabulary, and no other component holds a copy of
      it.
    category: constraint
    applies-to: Status display
    trigger: Whenever the vocabulary is changed or a consumer needs a label.
    logic: >
      IF a consumer needs a status label THEN it reads the label from this
      unit's mapping. No consumer keeps a literal copy of the label.
    violation-behaviour: >
      A second copy of the mapping is a drift risk and is out of contract for
      this release.
    source: FR3.1

  - id: BR2.1
    name: The eight released transition edges
    statement: >
      Exactly eight transitions are legal — in-stock to assigned, in-stock to
      lost, assigned to returned, assigned to lost, assigned to discarded,
      returned to assigned, returned to lost, and lost to in-stock. No other
      transition is legal.
    category: constraint
    applies-to: Asset status transition
    trigger: Whenever a transition is attempted from one status to another.
    logic: >
      IF a transition from status A to status B is attempted THEN A to B is one
      of the eight edges listed above. Every edge not listed is refused.
    violation-behaviour: >
      A transition that is not one of the eight edges is refused with the
      invalid-transition error code. No audit entry is appended and the asset's
      status is unchanged.
    source: FR3.2

  - id: BR2.2
    name: A released edge is legal only from its stated origin status
    statement: >
      Each of the eight released edges succeeds only from its stated origin
      status and is refused from each of the other four statuses.
    category: constraint
    applies-to: Asset status transition
    trigger: Whenever a transition is attempted.
    logic: >
      IF a transition from status A to status B is attempted THEN the asset's
      current status is A. The edge is legal from A and from no other status.
    violation-behaviour: >
      The transition is refused with the invalid-transition error code, no
      audit entry is appended, and the asset is unchanged.
    source: FR3.2

  - id: BR2.3
    name: The two deferred edges are refused in this release
    statement: >
      The transitions in-stock to discarded and returned to discarded are not
      part of the released transition table, and a request for either is
      refused with the invalid-transition error code.
    category: constraint
    applies-to: Asset status transition
    trigger: Whenever either deferred edge is attempted.
    logic: >
      IF a transition from in-stock to discarded, or from returned to
      discarded, is attempted THEN it is refused, because neither edge is in
      the eight released edges.
    violation-behaviour: >
      The transition is refused with the invalid-transition error code, no
      audit entry is appended, and the asset is unchanged. The refusal is
      permanent in this release and is not a validation failure of the
      request's fields.
    source: FR3.2

  - id: BR3.1
    name: The loss-reason vocabulary is closed
    statement: >
      A reason recorded against a loss or a recovery is drawn from a closed set
      of three general loss reasons — damaged, lost, stolen — and from no
      other value.
    category: validation
    applies-to: Loss reason; Recovery reason
    trigger: Whenever a loss or a recovery reason is offered or recorded.
    logic: >
      IF a loss reason, or a recovery reason, is offered THEN it is one of
      damaged, lost, stolen. The set is closed: a reason is a controlled
      vocabulary entry, not free text, and a value outside the set is not a
      reason.
    violation-behaviour: >
      A reason outside the set is refused with the validation error code. The
      transition does not occur, no field changes, and no audit entry is
      appended.
    source: FR3.6a, FR3.8

  - id: BR3.2
    name: The retirement-reason vocabulary is a distinct set
    statement: >
      The retirement-specific values are superseded, returned-to-supplier,
      and written-off. Membership of that set is a separate question from
      which reasons a retirement accepts.
    category: validation
    applies-to: Retirement reason
    trigger: Whenever a value is classified as a retirement-specific reason.
    logic: >
      IF a value is one of superseded, returned-to-supplier, written-off THEN
      it belongs to the retirement-reason set. A general loss reason is not a
      member of this set. Which operation accepts which set is BR3.3.
    violation-behaviour: >
      Treating a general loss reason as a retirement-specific value, or a
      retirement-specific value as a general loss reason, is a defect in the
      vocabulary. This rule does not refuse a retirement that carries a
      general loss reason; that acceptance is BR3.3.
    source: FR3.10

  - id: BR3.3
    name: A retirement's acceptable reasons are the union of the two reason sets
    statement: >
      A retirement accepts a reason from the general loss-reason set or from
      the retirement-reason set. A loss or a recovery accepts only the general
      loss-reason set.
    category: validation
    applies-to: Retirement reason; Loss reason; Recovery reason
    trigger: Whenever the acceptable reason set for an operation is determined.
    logic: >
      IF the operation is a retirement THEN its acceptable reasons are the
      union of the general loss reasons and the retirement reasons. IF the
      operation is a loss or a recovery THEN its acceptable reasons are the
      general loss reasons alone. A retirement reason is not acceptable for a
      loss or a recovery. Stated per value: a value in the general loss-reason
      set is acceptable for a loss and for a recovery, and its acceptable-for
      list holds both operations; a value in the retirement-reason set is
      acceptable for a retirement only, and its acceptable-for list holds that
      one operation — even though the retirement operation's own acceptable
      set is the union of both sets.
    violation-behaviour: >
      A reason outside the operation's acceptable set is refused with the
      validation error code, with no field change and no audit entry.
    source: FR3.10

  - id: BR3.4
    name: A reason is required for a loss, a recovery and a retirement
    statement: >
      A loss, a recovery and a retirement each require a reason. A submission
      carrying no reason is refused.
    category: validation
    applies-to: Loss; Recovery; Retirement
    trigger: Whenever one of these three operations is submitted.
    logic: >
      IF a loss, a recovery, or a retirement is submitted THEN a reason is
      present and is drawn from the operation's acceptable set. The reason is
      mandatory in every origin from which the operation is released.
    violation-behaviour: >
      A submission without a reason is refused with the validation error code.
      The status is unchanged, no holder field changes, and no audit entry is
      appended.
    source: FR3.6a, FR3.8, FR3.10

  - id: BR4.1
    name: The audit-action vocabulary is exactly seven values
    statement: >
      An audit entry's action is one of create, assign, return, mark-lost,
      recovered, discarded, edit — and no other value. The four existing
      values keep their names.
    category: constraint
    applies-to: Audit entry action
    trigger: Whenever an audit entry is appended.
    logic: >
      IF an audit entry is appended THEN its action is one of the seven
      values. No existing value is renamed and no additional value is
      introduced.
    violation-behaviour: >
      An action outside the set is refused with the validation error code, and
      the audit entry is not appended.
    source: FR3.12

  - id: BR4.2
    name: All three loss edges carry the mark-lost action
    statement: >
      A loss from in-stock, a loss from assigned and a loss from returned each
      append exactly one mark-lost entry. No action is introduced for an
      origin, and no loss carries an action of its own.
    category: constraint
    applies-to: Audit entry action
    trigger: Whenever a loss occurs from any released origin.
    logic: >
      IF an asset is lost THEN the audit entry's action is mark-lost, whatever
      the origin status was. The action does not vary by origin, and no ninth
      action is created for one of them.
    violation-behaviour: >
      An entry carrying an origin-specific action is a defect; the vocabulary
      has no such value.
    source: FR3.12

  - id: BR4.3
    name: A recovery carries the recovered action
    statement: >
      A recovery is recorded as a recovered audit entry, and never as an
      assign or a return entry.
    category: constraint
    applies-to: Audit entry action
    trigger: Whenever a recovery occurs.
    logic: >
      IF an asset is recovered THEN the audit entry's action is recovered. It
      is not assign and it is not return.
    violation-behaviour: >
      An entry carrying assign or return for a recovery is a defect; the
      recovered action exists precisely to distinguish it.
    source: FR3.7

  - id: BR4.4
    name: An entry's description names a specific beyond the action name
    statement: >
      An audit entry's description is non-empty and names at least one
      specific of its event beyond the action name. An entry whose
      description equals its action alone is a failure.
    category: constraint
    applies-to: Audit entry description
    trigger: Whenever an audit entry's description is built.
    logic: >
      IF an audit entry's description is built THEN it names the entry's
      action and at least one further specific of the event it records. The
      action names the kind of event; the further specific names which
      event. The vocabulary supplies the action name and the values a
      specific may draw on — the asset's name, its serial or key, the
      holder, the previous holder, the reason. The wording of the specific
      is the description builder's, and the criteria of the stories that own
      each behaviour say which specific that behaviour requires.
    violation-behaviour: >
      A description equal to the action alone tells a reader what kind of
      event happened and nothing about which one, so a history of several
      identical actions reads as a single unexplained event.
    source: FR3.12

  - id: BR5.1
    name: The serial-or-key normalisation is one named operation
    statement: >
      The comparison of a serial or licence key is defined by a single
      normalisation operation: trim leading and trailing whitespace, then fold
      case. The fold is ASCII-only. The operation is scoped within a
      category.
    category: constraint
    applies-to: Asset serial or licence key
    trigger: Whenever two serial or key values are compared for collision.
    logic: >
      IF two serial or key values are compared THEN each is put through the
      same normalisation — trim leading and trailing whitespace, then fold
      case — and the comparison is within one category. Two values in
      different categories never collide. The fold lowercases the ASCII
      letters A to Z and leaves every other character, including a non-ASCII
      letter, unchanged. That result is defined for every character, and both
      tiers implement it.
    violation-behaviour: >
      A comparison that normalises differently from the shared operation is a
      defect. A Unicode-aware fold in either tier is a defect, because the
      other tier would then answer a non-ASCII letter differently.
    source: FR1.4

  - id: BR5.2
    name: The database index expression implements the same normalisation
    statement: >
      The database's functional unique index over the normalised serial or key
      within a category implements the same normalisation operation as the
      application-level comparison, so that the two tiers cannot disagree about
      what counts as a collision.
    category: constraint
    applies-to: Asset serial or licence key
    trigger: Whenever the functional unique index is defined or the comparison is changed.
    logic: >
      IF the functional unique index is defined THEN it normalises the serial
      or key by trimming leading and trailing whitespace and folding case
      ASCII-only, within a category, exactly as the application-level
      comparison does. The two are held in agreement by a test over a named
      case set: an identical value; a value differing only by surrounding
      whitespace; a value differing only by ASCII letter case; a value
      differing only by both surrounding whitespace and ASCII letter case; a
      value differing only by a non-ASCII letter's case, on which both tiers
      leave the letter unchanged and therefore give the same collision
      answer; and a value in a different category, which never collides.
    violation-behaviour: >
      A mismatch between the two normalisations is a defect. The agreement
      test fails if the two tiers return different collision answers on any
      case in the set, including a non-ASCII letter. The release does not
      rely on the application-level comparison alone: a collision it does not
      detect is still refused by the index.
    source: FR1.5

  - id: BR5.3
    name: The serial or key is stored as the user supplied it
    statement: >
      The normalisation is for comparison only. The serial or key is stored,
      and displayed, in the form the user supplied.
    category: policy
    applies-to: Asset serial or licence key
    trigger: Whenever a serial or key is stored or displayed.
    logic: >
      IF a serial or key is stored or displayed THEN it is the user's
      original casing and spacing. The normalised form is never stored and
      never displayed.
    violation-behaviour: >
      A normalised value that replaces the user's own is a defect; the user
      must see the key they typed.
    source: FR1.4

  - id: BR5.4
    name: The comparison excludes the asset being edited
    statement: >
      The collision comparison may be given an asset to exclude. When the
      asset under edit is excluded, an asset saving its own serial or key is
      not a collision with itself. A comparison with no exclusion applies to
      every asset in the category.
    category: validation
    applies-to: Asset serial or licence key
    trigger: Whenever the collision comparison is asked.
    logic: >
      IF the comparison is given an asset to exclude THEN that asset is not a
      collision candidate. IF it is given none THEN every asset in the
      category is a candidate.
    violation-behaviour: >
      An edit that leaves the serial unchanged is refused as a duplicate of
      itself when the exclusion is not applied.
    source: FR1.8

  - id: BR5.5
    name: One duplicate-serial code covers both tiers
    statement: >
      A collision detected by the application-level comparison and a collision
      detected by the database's unique index carry the same error code, and
      are indistinguishable to a caller.
    category: constraint
    applies-to: Duplicate serial or licence key
    trigger: Whenever a collision is detected at either tier.
    logic: >
      IF a collision is detected THEN the refusal carries the duplicate-serial
      error code, whichever tier detected it. A caller cannot tell which tier
      caught the collision and does not need to.
    violation-behaviour: >
      A collision reaching the client under a different code than the other
      tier's is a defect; a caller must not have to know which tier caught it.
    source: FR1.7

  - id: BR6.1
    name: The error vocabulary is exactly eight codes
    statement: >
      The domain error-code vocabulary holds exactly eight codes —
      VALIDATION_ERROR, DUPLICATE_ASSET, NOT_FOUND, INVALID_TRANSITION,
      INVALID_STATE, ASSET_DELETE_REFUSED, BUSY_RETRYABLE, INTERNAL — and no
      other value.
    category: constraint
    applies-to: Domain error code
    trigger: Whenever the vocabulary is read or changed, and whenever a
      refusal is raised.
    logic: >
      IF a domain error code is used THEN it is one of the eight. The count is
      exactly eight: the five codes the existing application already raises,
      plus the delete-refusal code, the retryable busy code, and the
      internal-fallback code.
    violation-behaviour: >
      A code outside the set is not a domain code. A ninth code invented to
      satisfy a mis-stated count has no requirement behind it and is refused.
    source: contract failure-model code list; FR1.7; FR2.6; FR3.3

  - id: BR6.2
    name: Every code in the vocabulary is mapped, and every other code falls back
    statement: >
      Every code in the vocabulary has a translation to the boundary's
      reading of it, so that no code reaches the client as an unmapped
      internal error. A failure carrying a code that is not in the vocabulary
      is surfaced as the internal fallback, so that the translation is total
      over every failure that can reach it.
    category: constraint
    applies-to: Domain error code
    trigger: Whenever a refusal reaches the boundary.
    logic: >
      IF a refusal carries a domain code THEN that code has a translation. IF
      the code is not in the vocabulary THEN the failure is surfaced as the
      internal fallback, exactly as a failure carrying no code at all is.
      Translating a code the release does not define would invent a meaning
      the release has not defined. A code in the vocabulary with no
      translation is a defect in the vocabulary, not a code that surfaces as a
      generic failure.
    violation-behaviour: >
      The invalid-state code in particular is mapped, so that an asset in an
      unknown status is refused as a request error rather than surfacing as a
      server fault.
    source: FR3.3

  - id: BR6.3
    name: The busy code is the only retryable code
    statement: >
      BUSY_RETRYABLE is the only code a caller may retry. Every other code is
      permanent and is resolved by changing the request, not by repeating it.
    category: policy
    applies-to: Domain error code
    trigger: Whenever a refusal's retryability is read.
    logic: >
      IF a refusal carries the busy code THEN it is transient and the caller
      may try again. IF it carries any other code THEN it is permanent.
    violation-behaviour: >
      A caller told to retry a permanent failure retries a request that cannot
      succeed.
    source: FR1.7

  - id: BR6.4
    name: A driver error carrying no domain code is not translated
    statement: >
      A failure that arrives with no domain code stays an internal error. It is
      never translated into a domain code.
    category: policy
    applies-to: Domain error code
    trigger: Whenever a failure with no domain code reaches the boundary.
    logic: >
      IF a failure carries no domain code THEN it is surfaced as the internal
      error, which is the terminal fallback for a failure the release does not
      understand. Translating it into a domain code would invent a meaning the
      release has not defined.
    violation-behaviour: >
      The internal code is not a degraded domain failure; by definition it is
      not a domain failure.
    source: FR1.7

  - id: BR6.5
    name: The vocabulary holds no HTTP concept; the translation component holds the status column
    statement: >
      The vocabulary carries the code set and each code's retryable flag, and
      nothing else about the boundary. The mapping from a code to the
      boundary's status is the translation component's own content. A domain
      component never reads a status: it names a code and never asks for one.
    category: constraint
    applies-to: Domain error code
    trigger: Whenever the error vocabulary is used.
    logic: >
      IF a domain component raises a refusal THEN it names a code. It does not
      name a status and does not ask for one. The mapping from a code to the
      boundary's status is held once, in the translation component, and no
      other component holds a copy of it. The vocabulary holds the code set
      and the retryable flag; it holds no status, and therefore no HTTP
      concept at all.
    violation-behaviour: >
      A status appearing in the vocabulary would make the leaf layer depend on
      a concept it must not know, and would let the same code carry two
      statuses in two places.       A second copy of the mapping outside the
      translation component is the same defect in a different shape.
    source: approved Q10 — ErrorTranslation holds the status column

  - id: BR6.6
    name: The delete refusal is raised before any statement runs
    statement: >
      A delete against an asset row is refused with the delete-refusal code,
      and the refusal is raised before any statement is issued. It does not
      depend on the database to make it.
    category: constraint
    applies-to: Domain error code
    trigger: Whenever a delete against an asset row is attempted.
    logic: >
      IF a delete against an asset row is attempted THEN the refusal is
      raised before any statement runs, and it carries the delete-refusal
      code. The refusal is therefore the same whether or not the database is
      reachable, and no statement that could destroy an asset row or its
      history is ever issued.
    violation-behaviour: >
      A delete is permanent in this release — it is resolved by not
      deleting, not by retrying — and the asset row and its history are never
      destroyed. A refusal that depended on a database round trip would
      surface as an internal error when the database was unreachable, which
      would tell the caller to retry something that must never succeed.
    source: FR2.6

  - id: BR7.1
    name: The display holder is derived, not stored
    statement: >
      An asset's display holder is derived from its two holder fields: the
      current holder where one exists, otherwise the preserved previous holder
      where one exists, otherwise the reserved Unassigned designation. The
      derivation is performed here, once.
    category: calculation
    applies-to: Asset holder display
    trigger: Whenever any surface needs the holder of an asset.
    logic: >
      IF an asset's current holder exists THEN the display holder is the
      current holder. ELSE IF its preserved previous holder exists THEN the
      display holder is the preserved previous holder. ELSE the display holder
      is the reserved Unassigned designation.
    violation-behaviour: >
      A surface that applies a different fallback order is a defect; the
      derivation is one definition so that every surface agrees.
    source: FR5.1

  - id: BR7.2
    name: The two holder fields never echo one another
    statement: >
      The current holder and the preserved previous holder are strictly
      non-falling-back. The current holder is the current holder and the
      preserved previous holder is the preserved previous holder. Neither ever
      takes the other's value.
    category: constraint
    applies-to: Asset holder display
    trigger: Whenever the two holder fields are read together.
    logic: >
      IF both holder fields exist THEN they are distinct roles, and the
      display holder is the current one. A transition that empties one writes
      the departing value into the other; a transition that empties both
      leaves the asset never-held.
    violation-behaviour: >
      A derivation that falls back from the current holder to the previous
      holder's value while both exist is a defect; that is the case the rule
      exists to close.
    source: FR5.1

  - id: BR7.3
    name: The reserved designation is a distinct value and applies only to never-held assets
    statement: >
      Unassigned is a reserved designation, not a holder name. It applies only
      to an asset that has never been held by anybody.
    category: policy
    applies-to: Asset holder display
    trigger: Whenever the reserved designation is produced or consumed.
    logic: >
      IF an asset has never been held by anybody THEN its display holder is
      the reserved designation. IF an asset has ever been held THEN the
      reserved designation is not its display holder, and it appears under the
      holder it was held by.
    violation-behaviour: >
      The reserved designation is a value in the vocabulary rather than free
      text, so an asset whose holder name happens to read Unassigned is
      distinguishable from one that has never been held.
    source: FR5.2

  - id: BR7.4
    name: The reserved designation is not a holder for counting
    statement: >
      The reserved Unassigned designation is a display value, not a holder.
      A count of display holders excludes it, and the directory renders one
      row per display holder plus the reserved row, so the rendered row count
      is one greater than the holder count.
    category: calculation
    applies-to: Asset holder display
    trigger: Whenever display holders are counted or listed.
    logic: >
      IF display holders are counted THEN the reserved Unassigned designation
      is not counted as a holder, because it is a value this unit produces to
      mean "held by nobody" rather than the name of a person. IF the holders
      are listed THEN the list carries one row per display holder plus one
      reserved row for the designation, so the rendered row count exceeds the
      holder count by exactly one whenever the reserved row is present.
    violation-behaviour: >
      Counting the reserved designation as a holder would report a count of
      holders that includes an asset nobody holds, and would make the count
      line and the rendered rows disagree with each other. The two figures
      are read together, so a defect in one is visible as a defect in the
      other.
    source: FR6.5

  - id: BR8.1
    name: The filter definition has five dimensions and a carried holder dimension
    statement: >
      The filter is defined over five dimensions — search text, category,
      status, sort column and sort direction — and carries a holder dimension
      in the filter state in addition to them. The holder dimension is a
      free-text match over the asset's display holder.
    category: constraint
    applies-to: Asset filter
    trigger: Whenever a filter is built or applied.
    logic: >
      IF a filter is built THEN it draws its dimensions from this definition.
      The holder dimension is carried in the filter state and set by the
      directory's holder-row link; it is not one of the form's dimensions. The
      holder dimension matches by containment over the asset's **display
      holder**, as derived by the display-holder rule, and not over the raw
      current-holder column.
    violation-behaviour: >
      A surface defining its own filter dimensions is a defect; the four
      count-consuming surfaces agree because they share one definition.
      Matching the raw current-holder column rather than the display holder
      would make a directory search miss an asset whose holder now lives in
      the preserved previous holder, and would make the directory's rows and
      the asset list's rows disagree about the same holder.
    source: FR6.1

  - id: BR8.2
    name: A filter dimension's accepted values are closed
    statement: >
      The category dimension accepts hardware and software-license. The status
      dimension accepts the five status buckets. The sort column accepts name
      and created_at. The sort direction accepts asc and desc. The search-text
      dimension is free text over the asset's name and its serial or key.
    category: validation
    applies-to: Asset filter
    trigger: Whenever a filter value is offered or applied.
    logic: >
      IF a filter value is applied THEN it is within the dimension's accepted
      set, or the dimension is omitted. The sort column and the sort
      direction are whitelisted to literals; they are never interpolated from
      an arbitrary value.
    violation-behaviour: >
      A value outside the accepted set causes the dimension to be omitted,
      with no error and no effect on the other dimensions.
    source: FR6.1

  - id: BR8.3
    name: A value outside a dimension's accepted set omits that dimension only
    statement: >
      A filter value outside its dimension's accepted set causes that dimension
      to be omitted. The remaining dimensions still apply, so an unknown
      category narrows nothing on the category dimension and does not disable
      the others.
    category: policy
    applies-to: Asset filter
    trigger: Whenever a filter carries a value outside a dimension's accepted set.
    logic: >
      IF a dimension's value is outside its accepted set THEN that dimension
      does not filter. The filter is a conjunction over the dimensions that
      carry a valid value.
    violation-behaviour: >
      Dropping the whole filter would make one bad value widen the result
      rather than narrow it, and the count a surface then reports would depend
      on a value the surface never displayed.
    source: FR6.1

  - id: BR8.4
    name: One filter definition serves every count-consuming surface
    statement: >
      The dashboard, the holder directory, the asset list and the CSV export
      all apply the same filter definition, so that they report the same count
      for the same filter.
    category: constraint
    applies-to: Asset filter
    trigger: Whenever a count-consuming surface applies a filter.
    logic: >
      IF any of the four count-consuming surfaces applies a filter THEN it
      applies this definition. None of them defines its own.
    violation-behaviour: >
      A surface with its own filter definition is a defect; four surfaces with
      four definitions is the exact disagreement this rule exists to remove.
    source: FR6.1

  - id: BR8.5
    name: The directory's holder search filters holder rows
    statement: >
      The directory's holder search is a free-text match over the display-holder
      name, and it filters the holder rows the directory lists. It is not a
      dimension of the asset filter, and it does not select assets.
    category: constraint
    applies-to: Holder directory search
    trigger: Whenever the directory's holder search is applied.
    logic: >
      IF the directory's holder search is applied THEN it keeps the holder
      rows whose display-holder name contains the search text, as contract 10
      states. The asset filter's holder dimension is a different control: a
      directory row link sets it, and it selects assets by display holder.
    violation-behaviour: >
      Putting the holder search into the asset filter would change which
      assets the other three count-consuming surfaces see, and would no
      longer be the holder-row filter contract 10 specifies.
    source: contract 10 count_holders

  - id: BR9.1
    name: The five bucket counts sum to the total record count
    statement: >
      The counts of in-stock, assigned, returned, lost and discarded sum to
      the total record count, for any dataset.
    category: calculation
    applies-to: Inventory counts
    trigger: Whenever the bucket counts and the total record count are derived.
    logic: >
      IF the five bucket counts are derived THEN their sum is the total record
      count. The buckets are exclusive and their union is every asset, so
      no asset is counted twice and none is left out.
    violation-behaviour: >
      A total that does not equal the sum of the buckets is a defect in the
      counting definition, not a rounding or a timing difference.
    source: FR6.3

  - id: BR9.2
    name: Active inventory excludes discarded assets and total records include them
    statement: >
      The active inventory is the count of assets not in the discarded bucket.
      The total record count is the count of all assets, including discarded
      ones.
    category: calculation
    applies-to: Inventory counts
    trigger: Whenever the active inventory or the total record count is derived.
    logic: >
      IF the active inventory is derived THEN discarded assets are not in it.
      IF the total record count is derived THEN discarded assets are in it.
      The difference between the two is exactly the discarded count.
    violation-behaviour: >
      A discarded asset counted towards neither figure, or towards both, is a
      defect; a discarded asset's row and its history are never destroyed.
    source: FR6.2

  - id: BR9.3
    name: The available-to-assign count is the in-stock bucket count
    statement: >
      The available-to-assign count is the number of assets in the in-stock
      bucket. It is that bucket's count, not the count of every asset that
      has an assign edge.
    category: calculation
    applies-to: Inventory counts
    trigger: Whenever the available-to-assign count is derived.
    logic: >
      IF the available-to-assign count is derived THEN it is the count of
      assets in the in-stock bucket. It is derived from the same filter
      definition as every other figure.
    violation-behaviour: >
      A figure that does not equal the shared definition's value for it is a
      defect; the dashboard presents the figure beside figures from the same
      definition.
    source: FR6.7

  - id: BR9.4
    name: The counts are derived by one aggregation, not four
    statement: >
      The four count-consuming surfaces do not compute counts of their own.
      Each reads the figures it renders from one counting component that
      evaluates this unit's definition.
    category: constraint
    applies-to: Inventory counts
    trigger: Whenever a count-consuming surface needs a figure.
    logic: >
      IF a surface needs a figure THEN it reads that figure from the one
      counting component. No surface derives a count of its own, and no
      surface derives its figure from another surface's.
    violation-behaviour: >
      A surface deriving its own figure is a defect; a figure that disagrees
      with another figure is exactly what this rule prevents.
    source: FR6.1

  - id: BR9.5
    name: The shown count never exceeds the matching count
    statement: >
      The asset list reports two counts over the same filter — the number of
      records matching the filter, and the number of records it is actually
      rendering. The shown count never exceeds the matching count, and
      neither exceeds the total record count for the same filter.
    category: calculation
    applies-to: Inventory counts
    trigger: Whenever the list's shown or matching count is derived.
    logic: >
      IF the shown count and the matching count are derived for one filter
      THEN the shown count is less than or equal to the matching count, and
      the matching count is less than or equal to the total record count for
      the same filter. The two counts are derived from the one filter
      definition, so they describe the same filter.
    violation-behaviour: >
      A shown count above the matching count would tell a reader that more
      records are on the screen than matched the filter, which is impossible;
      and a matching count above the total record count would contradict the
      total record count the same surface reports.
    source: FR6.4

  - id: BR9.6
    name: A holder row's per-bucket chips sum to that row's total
    statement: >
      A holder row's per-bucket chip counts sum to that row's total asset
      count, and the chips break down by the bucket of the assets whose
      display holder is that holder.
    category: calculation
    applies-to: Inventory counts
    trigger: Whenever a holder row's chips are derived.
    logic: >
      IF a holder row's chips are derived THEN their sum is that row's total
      asset count, and each chip counts the assets whose display holder is
      that holder and whose bucket is the chip's bucket. A row's chip set is
      never restricted to the in-stock bucket, because a never-held asset can
      reach any bucket the release permits a never-held asset to reach.
    violation-behaviour: >
      A chip set that does not sum to the row's total is a defect in the
      grouping, and it is the defect the display-holder derivation exists to
      prevent: the row's total and its chips must be read from the same
      grouping, not assembled separately.
    source: FR6.6

  - id: BR10.1
    name: The vocabulary is the single source of every value it owns
    statement: >
      Every value this unit owns — the statuses, the display labels, the
      transition edges, the reason values, the action values, the error codes,
      the holder designation and the filter dimensions — is stated here exactly
      once. No other component holds a copy.
    category: constraint
    applies-to: Domain vocabulary
    trigger: Whenever a value this unit owns is needed.
    logic: >
      IF a component needs a status, a legal transition, a reason, a
      comparison rule, an action name or an error code THEN it reads it from
      this unit and from nowhere else.
    violation-behaviour: >
      A second copy is a drift risk. Two copies of one definition is what lets
      them disagree.
    source: FR3.1

  - id: BR10.2
    name: The schema's constraint text and the stylesheet's class names stay literal copies
    statement: >
      The database schema's status constraint text and the stylesheet's
      per-status class names remain literal copies of this vocabulary's
      values. They are a recorded boundary, not a defect, and are not
      generated from this unit.
    category: policy
    applies-to: Domain vocabulary
    trigger: Whenever the vocabulary's status set changes, or the schema or the stylesheet is written.
    logic: >
      IF the status set changes THEN the schema's constraint text and the
      stylesheet's class names are updated to match, by hand, and each is
      checked by a test. They are not generated from this unit, because
      generating them would introduce a build step the release does not have
      and would make a migration file a build artefact.
    violation-behaviour: >
      A drift between the copies is a defect, and it is visible precisely
      because it is named as a boundary rather than left as an unremarked
      copy.
    source: domain-design recorded boundary — schema and stylesheet stay literal copies

  - id: BR11.1
    name: The backfill's actor value is the literal system
    statement: >
      The vocabulary holds one reserved actor value for backfilled history:
      the literal `system`. The foundation unit stamps it onto every pre-MVP
      audit row the backfill creates.
    category: constraint
    applies-to: Backfilled audit attribution
    trigger: Whenever the foundation unit backfills pre-MVP audit history.
    logic: >
      IF the foundation unit backfills a pre-MVP audit row THEN the row's
      actor is the literal `system`. The value is read from this unit's
      vocabulary rather than written at the call site, so that the
      foundation unit and this unit cannot name it differently.
    violation-behaviour: >
      A backfill that left the actor empty, or that stamped a person, would
      make backfilled history indistinguishable from the release's own
      history, and would count it towards a metric it does not belong to.
    source: FR4.2

  - id: BR11.2
    name: The backfill's actor value is reserved for backfilled history
    statement: >
      The reserved backfill attribution is never a person's actor. It is
      applied to backfilled history and to nothing else.
    category: constraint
    applies-to: Backfilled audit attribution
    trigger: Whenever an actor is stamped on an audit row.
    logic: >
      IF an audit row is written by the release's own activity THEN its actor
      is a person-attributed actor, never the reserved backfill value. IF the
      row is backfilled pre-MVP history THEN its actor is the reserved
      backfill value and nothing else.
    violation-behaviour: >
      A person-attributed entry carrying the reserved value would be
      indistinguishable from backfilled history, and a person reading the
      history would attribute the release's own activity to the system.
    source: FR4.2

  - id: BR11.3
    name: Backfilled history is excluded from the Audit Completeness metric
    statement: >
      The Audit Completeness metric counts only the release's own audit
      entries. Pre-MVP history backfilled by the foundation unit is excluded
      from it, because that history carries the reserved backfill actor
      rather than a person-attributed one.
    category: policy
    applies-to: Backfilled audit attribution
    trigger: Whenever the Audit Completeness metric is computed.
    logic: >
      IF the Audit Completeness metric is computed THEN it counts only the
      entries written by the release's own activity. The backfilled
      pre-MVP history is excluded from the population, and the exclusion is
      stated rather than implied by the metric's denominator.
    violation-behaviour: >
      Including backfilled history would make the metric report a share of
      person-attributed entries that is lower than the release's own
      behaviour warrants, and would penalise the release for history it did
      not write.
    source: Audit Completeness success measure
```

---

## Rules Summary

| ID | Rule | Category | Applies to | Source |
|---|---|---|---|---|
| BR1.1 | The five exclusive status buckets | constraint | Asset status | FR3.1 |
| BR1.2 | The status display label mapping | policy | Status display | FR3.1 |
| BR1.3 | The display-label mapping is the only place a label is written | constraint | Status display | FR3.1 |
| BR2.1 | The eight released transition edges | constraint | Asset status transition | FR3.2 |
| BR2.2 | A released edge is legal only from its stated origin status | constraint | Asset status transition | FR3.2 |
| BR2.3 | The two deferred edges are refused in this release | constraint | Asset status transition | FR3.2 |
| BR3.1 | The loss-reason vocabulary is closed | validation | Loss reason; Recovery reason | FR3.6a, FR3.8 |
| BR3.2 | The retirement-reason vocabulary is a distinct set | validation | Retirement reason | FR3.10 |
| BR3.3 | A retirement's acceptable reasons are the union of the two reason sets | validation | Retirement reason; Loss reason; Recovery reason | FR3.10 |
| BR3.4 | A reason is required for a loss, a recovery and a retirement | validation | Loss; Recovery; Retirement | FR3.6a, FR3.8, FR3.10 |
| BR4.1 | The audit-action vocabulary is exactly seven values | constraint | Audit entry action | FR3.12 |
| BR4.2 | All three loss edges carry the mark-lost action | constraint | Audit entry action | FR3.12 |
| BR4.3 | A recovery carries the recovered action | constraint | Audit entry action | FR3.7 |
| BR4.4 | An entry's description names a specific beyond the action name | constraint | Audit entry description | FR3.12 |
| BR5.1 | The serial-or-key normalisation is one named operation | constraint | Asset serial or licence key | FR1.4 |
| BR5.2 | The database index expression implements the same normalisation | constraint | Asset serial or licence key | FR1.5 |
| BR5.3 | The serial or key is stored as the user supplied it | policy | Asset serial or licence key | FR1.4 |
| BR5.4 | The comparison excludes the asset being edited | validation | Asset serial or licence key | FR1.8 |
| BR5.5 | One duplicate-serial code covers both tiers | constraint | Duplicate serial or licence key | FR1.7 |
| BR6.1 | The error vocabulary is exactly eight codes | constraint | Domain error code | contract failure model; FR1.7; FR2.6; FR3.3 |
| BR6.2 | Every code in the vocabulary is mapped, and every other code falls back | constraint | Domain error code | FR3.3 |
| BR6.3 | The busy code is the only retryable code | policy | Domain error code | FR1.7 |
| BR6.4 | A driver error carrying no domain code is not translated | policy | Domain error code | FR1.7 |
| BR6.5 | The domain layer never learns an HTTP status | constraint | Domain error code | approved Q10 |
| BR6.6 | The delete refusal is raised before any statement runs | constraint | Domain error code | FR2.6 |
| BR7.1 | The display holder is derived, not stored | calculation | Asset holder display | FR5.1 |
| BR7.2 | The two holder fields never echo one another | constraint | Asset holder display | FR5.1 |
| BR7.3 | The reserved designation is a distinct value and applies only to never-held assets | policy | Asset holder display | FR5.2 |
| BR7.4 | The reserved designation is not a holder for counting | calculation | Asset holder display | FR6.5 |
| BR8.1 | The filter definition has five dimensions and a carried holder dimension | constraint | Asset filter | FR6.1 |
| BR8.2 | A filter dimension's accepted values are closed | validation | Asset filter | FR6.1 |
| BR8.3 | A value outside a dimension's accepted set omits that dimension only | policy | Asset filter | FR6.1 |
| BR8.4 | One filter definition serves every count-consuming surface | constraint | Asset filter | FR6.1 |
| BR8.5 | The directory's holder search filters holder rows | constraint | Holder directory search | contract 10 |
| BR9.1 | The five bucket counts sum to the total record count | calculation | Inventory counts | FR6.3 |
| BR9.2 | Active inventory excludes discarded assets and total records include them | calculation | Inventory counts | FR6.2 |
| BR9.3 | The available-to-assign count is the in-stock bucket count | calculation | Inventory counts | FR6.7 |
| BR9.4 | The counts are derived by one aggregation, not four | constraint | Inventory counts | FR6.1 |
| BR9.5 | The shown count never exceeds the matching count | calculation | Inventory counts | FR6.4 |
| BR9.6 | A holder row's per-bucket chips sum to that row's total | calculation | Inventory counts | FR6.6 |
| BR10.1 | The vocabulary is the single source of every value it owns | constraint | Domain vocabulary | FR3.1 |
| BR10.2 | The schema's constraint text and the stylesheet's class names stay literal copies | policy | Domain vocabulary | domain-design boundary |
| BR11.1 | The backfill's actor value is the literal system | constraint | Backfilled audit attribution | FR4.2 |
| BR11.2 | The backfill's actor value is reserved for backfilled history | constraint | Backfilled audit attribution | FR4.2 |
| BR11.3 | Backfilled history is excluded from the Audit Completeness metric | policy | Backfilled audit attribution | Audit Completeness |

---

## Notes on the Rules

**Two corrections and one reconciliation are carried into these rules as
rules, not as commentary.**

- **The error vocabulary's size is eight.** The domain design's component
  catalogue states "nine" in one place; the contract summary and ADR-012 both
  bind **eight**, and eight is verified correct against the codebase's five
  existing codes plus the release's three additions. `BR6.1` states the count
  as exactly eight and names all eight, and it is `BR6.1` that the vocabulary
  tests assert against. A test written from the superseded line would assert
  nine codes exist, and the fix a developer reaches for under pressure is to
  invent a ninth code — which `BR6.1` refuses in terms.
- **The retirement reason set is distinct, and a retirement's acceptable set
  is the union.** `BR3.2` and `BR3.3` together hold both halves of the
  answer, so neither is readable as excluding the other set.
- **The HTTP status lives in the translation component, and the vocabulary
  holds no HTTP concept.** The upstream contract binds the status to this unit
  rather than to the caller — "their HTTP statuses are part of the vocabulary
  rather than of the caller" — and names `ErrorTranslation` as the single
  translation point. The stage's approved answer to Q10 places the status
  column in the translation component: the vocabulary holds the code set and
  the retryable flag, and the translation component holds the complete
  code-to-status mapping as its own content. The leaf property then holds
  literally rather than by argument — a domain component cannot reach a
  status by reading the vocabulary, because the vocabulary has none.
  `entities.md` carries the full eight-code mapping as a table under
  `## The Code-to-Status Mapping`, so it is readable directly rather than
  assembled from positional lists, and it names the translation component as
  its holder.

**Three rules state the release's standing conditions rather than restating
them.** `BR5.2` holds the database index and the application comparison to
one normalisation. `BR6.3` and `BR6.4` hold the two failure classes apart,
which is what the retryable busy condition depends on.

**One rule exists to close a defect the current application has.**
`BR6.2` closes the gap where an asset in an unknown status is refused but the
refusal is not mapped, and therefore surfaces as a server fault rather than as
a request error.

**Two rules make a path total that would otherwise fall through.** `BR6.2`
gives the translation a defined outcome for a failure carrying a code that is
present but not in the vocabulary — the internal fallback, on the same
reasoning as `BR6.4` — so that the translation has an answer for every
failure that can reach it. `BR5.1` gives the case fold a stated scope — the
fold lowercases ASCII letters and leaves every other character unchanged,
and both tiers implement that same result, so a non-ASCII letter is not a
permitted disagreement.

**Three rules carry the backfill's attribution.** `BR11.1` names the literal
`system` value that the foundation unit stamps onto pre-MVP history,
`BR11.2` reserves it for backfilled history alone, and `BR11.3` excludes
that history from the Audit Completeness metric. `BR11.1` and `BR11.2` are
sourced to **FR4.2**, which requires a `system`-attributed entry to be shown
distinctly from a person-attributed one. `BR11.3` is sourced to the Audit
Completeness success measure, which excludes entries attributed to the
`system` actor from the measured population.

**One rule states what counts as a holder.** `BR7.4` holds that the reserved
`Unassigned` designation is a display value rather than a holder, so a count
of display holders excludes it while the directory renders one row per
display holder plus the reserved row. It exists because the count line and
the rendered rows are read together: the relationship between them is a
property of the vocabulary's reserved designation, and a surface that
counted the designation as a holder would make the two figures disagree.
