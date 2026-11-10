# Personas — Asset Tracker MVP

**Stage**: user-stories (inception)
**Intent**: 261106-asset-tracker-mvp
**Space**: default
**Scope**: feature
**Date**: 2026-11-09
**Review**: advisory (aidlc-product-lead-agent) — iteration 1: 10 findings, all verified and resolved; iteration 2: 10 confirmed resolved, 5 further findings raised and resolved

Two personas. One of them does every write in this release; the other is the
reason every read surface exists.

Both are read by the story set's acceptance criteria rather than quoted in
them: Priya's persona voice appears in the write stories' "As a …" clauses,
and Marcus's in the read stories'. The holder a name on an asset carries is
neither of them — see "Who is deliberately *not* a persona" below.

---

## Persona 1 — Priya Raman, Asset Administrator

**Role**: Internal asset administrator responsible for the custody of the
organisation's physical assets and software licences.

**What she does in this system**: registers new assets, assigns them to
colleagues, takes them back, records losses, retires them, and recovers lost
ones. She is the only party who writes.

**Goals**
- Record an asset accurately once, at the moment it arrives, so that its
  serial or licence key is never lost.
- Hand an asset to a colleague with a clear record of who holds it, without
  having to remember it.
- Retire or lose an asset with the reason captured at the same moment, so the
  history explains itself six months later without her being asked.
- Trust that the record of what happened is complete and cannot be quietly
  edited by anyone, including herself.

**Pain points she has today**
- The spreadsheet that tracks this has no history — it shows the current state
  and nothing about how it got there, so "who had this last quarter?" has no
  answer.
- Reconciliation is manual: counting what the spreadsheet says against what
  the cupboard actually holds takes a full day every month, and the two
  numbers rarely agree.
- A serial number typed with different capitalisation, or with a trailing
  space, is recorded as a *different* serial, so a duplicate slips through and
  is discovered months later.

**Context**
- Works on the operations side of the organisation, one person, occasionally
  with a colleague covering the desk.
- Works with a mouse and a keyboard at a desk; the application is
  server-rendered and she expects it to behave like the pages she already
  uses.
- Deals with roughly two categories — physical hardware and software
  licences — and knows that a serial number means something different in
  each.
- Does not think in terms of "roles" or "accounts"; she thinks in terms of
  the people she hands things to.

**Note carried forward to Domain Design** — the desk is occasionally covered
by a colleague. Under a single server-configured operator, a covering
colleague's entries are attributed to the primary administrator. The
actor-trust rule protects against a *forged* actor; it does not by itself
prevent a *misattributed* one when two people share a configured identity.
This is a fact about the operating context, not a requirement, and it is one
of the inputs to the actor-mechanism decision (open items I-01 / I-03). The
chosen mechanism must either distinguish the covering colleague or record the
shared-identity case explicitly, and the `Acting as` indicator must not claim
an identity that the audit entry does not carry.

*This detail was contested during the story set's review, and the question
"does it stay or go?" was settled by keeping it.* Dropping it would have made
the persona tidier and would have removed the tension, but it would also have
removed the evidence: the fact that two people share the desk is the clearest
statement of what the organisation needs from the actor mechanism, and open
item I-01 is waiting for exactly that. It stays, with the condition it
implies, stated above.

**Tech comfort**: Comfortable with a web form. Willing to read a clear error
message; not willing to read a stack trace.

**Frequency**: Daily for registration and assignment, weekly for
reconciliation, occasionally for loss and retirement.

---

## Persona 2 — Marcus Webb, Asset Owner / Requester

**Role**: An internal colleague who holds or has held an asset, and who needs
to know the state of it without asking the asset administrator.

**What he does in this system**: reads. He looks up an asset, he looks up what
a colleague holds, and he reads an asset's history.

**Goals**
- Find out where a specific asset is and who has it right now, in under a
  minute, without emailing anyone.
- Find out what happened to an asset that has moved between people — when it
  was returned, when it was reported lost, whether it was ever recovered.
- See the asset's current holder and the colleague who last held it as two
  separate facts, so a lost or returned asset stays attributable to the person
  who had it.
- See at a glance whether the organisation's assets are accounted for, and
  which ones need attention.

**Pain points he has today**
- There is no place to look. Custody information lives in other people's
  heads and in a spreadsheet he cannot access.
- When he asks, he gets an answer about *now* and no answer about *before* —
  so he cannot tell whether a device was handed back and re-issued, or lost.
- He cannot tell whether the organisation's asset count is trustworthy, so he
  does not rely on it.

**Context**
- Occasionally uses the system, in short bursts, rather than daily.
- Knows assets by the name he was given them and by their serial or licence
  key, not by an internal asset identifier.
- May be asking about an asset held by a colleague — including one who has
  left the organisation.
- Does not write anything and does not expect to.
- Distinguishes an asset that is **on the shelf** from one that is **with its
  holder**: the release gives him a distinct `returned` resting state, and his
  questions ("is it back in the cupboard or still with someone?") are the
  reason that state is distinct.

**Tech comfort**: Comfortable with a web page. Finds assets with the
existing free-text search over name and serial or key — the existing search
is adequate for this. The improved search form is deferred to a later
increment, so search stays as it is.

**Frequency**: Weekly or less, in short sessions.

---

## Persona Relationships

```
   Priya (Asset Administrator)
        |
        |  performs every write
        v
   [  Asset record  ]  -->  read by  -->  Marcus (Asset Owner / Requester)
        |
        |  produces
        v
   [  Audit history  ]  -->  read by  -->  Marcus, and by Priya herself
```

- **Priya is the sole writer.** Every write story in the set belongs to her.
- **Marcus reads what Priya's writes produce.** Every read story in the set
  belongs to him, and the asset detail, the asset list, the dashboard and the
  assignee directory are all surfaces that exist to serve him.
- **The two personas overlap on the asset detail screen.** Priya reads it to
  confirm a transition landed; Marcus reads it to answer a question. One
  story may serve both, and where it does, both personas are named.

## Priority Ranking

| Rank | Persona | Why |
|---|---|---|
| 1 | Priya — Asset Administrator | The primary customer confirmed at Intent Capture and carried into the wireframes. Every write path, every transition, the reason vocabulary, the audit behaviour and the uniqueness policy are hers. Without her the release has no content. |
| 2 | Marcus — Asset Owner / Requester | The second party named by the requirements' target customer. He is the reason the dashboard, the directory, the asset list, the CSV export and the full history view exist at all. He is read-only. |

## Who is deliberately *not* a persona

- **A holder.** The name recorded on an asset is a display name, not an
  identity. A person can hold an asset and have no way to sign in. No story is
  written in the voice of a person whose name appears on an asset; the "what
  does Dana hold?" journey is served by Marcus asking on someone's behalf, or
  by Priya answering it.
- **The product owner.** They sign off deployments and approve performance
  ceilings. They do not use the application, so they are a stakeholder rather
  than a user, and no story is written for them.
- **An auditor.** The release deliberately has no system-wide audit log
  screen; an audit entry is read in the context of the asset it belongs to.
  There is no auditor persona because there is no audit screen for one.

## Stakeholders who are not personas

The intent's stakeholder map names four groups: asset administrators, the
finance function, IT leadership, and the end user holding the asset. The
first and last are Priya and Marcus. The two middle groups do not operate the
application, so they are not personas and no story is written in their voice
— but two of the release's hardest requirements exist specifically to serve
them, and a reader of this file would otherwise not know why those
requirements are as they are.

- **The finance function.** They need to defend a write-off. This is why
  FR3.10 makes the discard reason **mandatory** rather than optional, and why
  the reason is drawn from a shared vocabulary instead of free text — a
  write-off with no stated reason cannot be defended. Priya captures it at
  the moment of the write-off; finance never sees the screen.
- **IT leadership.** They need a single demonstrable, checkable claim about
  custody. This is what the Audit Completeness measure is for — pre-MVP
  history is backfilled to a `system` actor and excluded from the metric, so
  the measure is a claim about the release's own records rather than a claim
  about the whole estate.

Neither group appears in a story's "As a …" clause. Both appear in the
acceptance criteria of the stories that serve them, because the requirement
serves the stakeholder even though the actor is Priya.
