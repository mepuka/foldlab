# The language: eight generators, the silences, the refusals

Cut from `verify/kernel/projections/prose.md` (the prose projection of
the Lean model) and `docs/design/2026-08-18-plait-kernel-algebra.md`
§4.3/§5.3. A divergence between this file and those sources is a
defect in this file.

This language has eight verbs, and everything you can lawfully do is
one of them or a composition of them. Every value has one name: the
hash of its one canonical byte form, called its digest. Names are
branded by what they name — a schema digest and a program digest are
different sorts of name, and no sentence compares them.

## The eight sentences

**declare** — *"Let this value exist, under the name that is its own
bytes, as a schema (or program, policy, lane...) — and I name it under
this writ."* The christening act. A value declared is immutable
forever; revision means declaring a successor that pins its
predecessor. References inside the value must name already-admitted
digests, so the reference graph can never contain a cycle.

**resolve** — *"What value does this name denote?"* A question, not an
assertion. The answer is re-derived on read: the door hashes what it
fetched and refuses on mismatch, so no resolve ever trusts. There is
no anchor to pass, because a digest names one value forever — a
resolve can never be stale.

**emit** — *"I observed this — add it to the record."* Attributed
testimony onto an evidence lane. Testimony can arrive twice, late, or
out of order and mean the same once: the folded state depends only on
what was delivered, never on when or how often. Nothing said can be
unsaid.

**join** — *"What is known here includes at least this."* A
contribution merged into a shared cell. Merging is associative,
commutative, and idempotent, so replicas converge without anyone
coordinating, and your local view is always a lower bound of the
truth — you may claim "at least this," never "not present anywhere."

**fold** — *"As of this checkpoint, the reduction of everything said
on this lane is S."* The one read of changing state, and deliberately
the only one. Search, views, rosters, audits, and directory resolution
are all this sentence with different declared reductions. The answer
is pinned to an anchor — a position in one partition of one lane — and
is a function of the delivered support and the query alone: no clock,
no seed, no locale exists to consult. An anchored answer is never
wrong later; it is only earlier.

**decide** — *"Let this be the one outcome that lands for this work —
by right of this token."* The single priced sentence. Of all
candidate outcomes at a register, at most one lands, fenced by a
monotone token that is meaningful at that register only. At most one
landed outcome is not at most one external side effect — the boundary
rides every use.

**trigger** — *"Whenever the record comes to show P, hint declaration
D."* A standing conditional. P is one of exactly five monotone
productions — evidence appears, a cell reaches a threshold, a hole
reaches a stage, an outcome lands, the head advances past a position —
so a firing can only become enabled and stay enabled. Acting on
silence is not a trigger; deadlines belong to a fenced authority fed
by tick facts.

**spawn** — *"Let this child speak with at most the authority I hold,
narrowed to what it asked."* Authority only shrinks: the child writ is
the meet of parent and request, and an escalating request is clamped,
not honored. Knowledge grows by join; authority shrinks by meet; both
directions are theorems.

## What is deliberately NOT a generator

Use this table when the user proposes a verb outside the eight. Each
candidate is a real verb in some other system's API, and each is
either refused with its law or exhibited as a composition:

| Candidate verb | Verdict | Why |
| --- | --- | --- |
| `readLatest` | refused | an unanchored derived read is an ambient input; reads are `resolve` (immutable, anchor-free) or a `fold` state at an anchor |
| `sleep` / `now` / `cron` | refused | the fold has no clock; schedules are declared values, firings are tick facts arriving by `emit`, the deadline seat's act is a `decide` |
| `delete` / `update` | refused | nothing unbecomes; revision is a successor declaration; forgetting is retention's fenced compaction preserving `(head, state digest)` |
| `grant` / `renew` / `steal` (leases) | outside meaning | liveness machinery the runtime provides; never grammar — `decide` is the only meaning-bearing register act |
| `send(to, msg)` | derived | `emit` on a lane both parties' writs reach; delivery-to-a-party is a liveness claim the fabric refuses to make |
| `call` / RPC | derived | an action: `declare` the work, `decide` the outcome; the request plane is transport, never meaning |
| `search` | derived | a `fold` plus `resolve` of the hits; the query is data with a digest |
| `close` (session) | derived | a `decide` at the declared authority — the one non-monotone act a session contains |
| `assert` / `axiom` | refused | policy enters as declared values and decidable predicates, never trusted assertions |
| `onAbsence` / `not` / `timeout` triggers | refused | no constructor exists; acting on silence is the deadline authority's fenced act |
| `lock` / `mutex` | refused | the register fences outcomes, it does not exclude effort; a raced claim costs duplicate work, never duplicate commits |
| `subscribe(callback)` | derived | consuming a lane IS deploying a fold; streams are the only read surface |

## The closure list — what has no syntax

Fourteen rows, each removed by construction (cite by number in the
mapping's "unsayables" section):

1. **Clock reads in meaning** — no generator takes or returns a time;
   the envelope has no timestamp field.
2. **Absence, negation, and deadline predicates** — no trigger carries
   them; acting on silence is a fenced authority act.
3. **Unfenced decisions** — the only register write is
   decide-with-token.
4. **Last-write-wins** — no LWW carrier exists; a structure wanting
   join and decision in one carrier splits or refuses.
5. **Unverified reads** — no decode path trusts an asserted digest;
   resolve re-derives or refuses.
6. **Cross-sort identifier comparison** — branded sorts; a type error,
   not a runtime check.
7. **Minted identifiers** — every identifier is a digest of a
   declaration or a derivation from one; no UUIDs.
8. **Ambient query inputs** — no seed, clock, schedule, or locale
   parameter exists to read; declared seeds are data inside the digest.
9. **Reference cycles and general recursion** — pins name
   already-admitted digests; a cycle needs a hash preimage.
10. **Secret carriers** — the wire grammar admits no secret position;
    credentials live outside meaning as `Redacted`.
11. **Absence reasoning from local views** — a replica is a lattice
    lower bound: "at least this," never "not present anywhere."
12. **Silent mutation of the past** — journals are append-only;
    correction is a successor pinned to its predecessor; forgetting is
    fenced compaction above the derived horizon.
13. **Off-writ referents** — a declaration's identifier set must lie
    inside the universe its writ pins.
14. **Closure introspection** — a program's identity is its
    declaration, never its closure bytes; no API reads, hashes, or
    compares a function value.

## Refusals teach

A refusal is not an error: it is a value carrying the reason, the law
it defends by its real name, and the legal next move. Four repairs
are machine-applicable — the rewrite is a function of the refused
sentence alone: drop the anchor from a resolve; resolve instead of
trusting bytes; declare a successor instead of mutating; drop the
last-writer-wins strategy and let the declared algebra govern. The
other twelve are advisory: they need something the sentence does not
carry — a token to hold, a value to declare first, an authority to
request. An agent that has never been refused has not learned the
language, because the refusals are half the grammar.

Two refusal kinds matter for mapping (the stability split): an
**intrinsic** refusal is permanent — the sentence's shape is unlawful
and no growth of the world fixes it (the repair is a rewrite). A
**door-relative** refusal is anti-monotone — the world doesn't yet
contain what the sentence needs (a referent, a writ), and the repair
is to grow the world or wait. When a mapping produces a sentence that
would refuse, say which kind, because they route differently:
intrinsic means the mapping is wrong, relative means it has a
dependency.
