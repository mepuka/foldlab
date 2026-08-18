# The kernel language, in prose

EXPLORATORY, hand-derived from the Lean model in `verify/kernel` at
this commit. The design mandates that the prose projection be
assembled from the cataloged language declaration (the F7 discipline);
this file is the reference sketch that assembly owes. A divergence
between this file and the model is a defect in this file.

---

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

## What cannot be said

The language is defined as much by its silences. No sentence reads a
clock, fires on absence, decides without a fence, overwrites by
arrival order, trusts an asserted digest, compares identifiers across
sorts, mints a name, smuggles an ambient seed, references forward or
in a cycle, carries a secret, claims absence from a local view,
mutates the past, names a referent outside its writ, or inspects a
function's bytes. Each of these has no grammar to carry it; spelled
raw, each is refused at one door.

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
