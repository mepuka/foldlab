# Why two folds

Every history here is folded twice, and on first contact the second fold
looks like bookkeeping. The fold state is already a complete answer to
"what is true now", produced by an ordinary reducer that anyone can read
and modify. The chain head is 32 bytes of hash that answer no question a
user ever asked. So the objection arrives immediately, and it is the
right objection: if the state is the answer, why carry a second
accumulator whose result nobody can interpret?

Because the state cannot tell two histories apart, and which history
occurred is usually the thing under investigation.

## What the state fold alone loses

The demonstration is one command,
`bun packages/core/examples/tour.ts`, and its first block is the whole
argument:

```
two histories, same two facts, different order

  A head           c0f9c11ccb06bc3c18f4de601b85f44aaf682c83f09090a2c536fa1488d40816
  B head           cbf009894aea951acfd7e7f8157c514fd5144aa6efd7960698855c464533c7ff
  A state digest   62ca5ca464cbce85942499596ae21def9299236f26b68a29f3aaec37cc44733f
  B state digest   62ca5ca464cbce85942499596ae21def9299236f26b68a29f3aaec37cc44733f
  heads equal?     false
  states equal?    true
```

History A records `customer=ada` and then `total=42`. History B records
the same two facts in the opposite order. One state digest; two heads.

A system carrying the state fold alone reports these as the same
history, and by its only measure they are: the same keys hold the same
values, so `62ca5ca4…` is the correct answer to the question that fold
asks. It is simply not the question a postmortem asks. "The totals
reconcile" and "the same things happened, in the same order" are
different findings, and the state digest can only produce the first.

The second loss is sharper, and it is the last block of the same run:

```
feed the meaning fold something it does not admit:
  head still extends: d6c5ccfc0b466cf64532de3f167d89ba710b5aff9f43062c568c816c25da5cfa
  meaning fold says: MalformedPayload
```

A third event arrived carrying bytes the meaning fold declined to
interpret. The state is therefore unchanged, and the head moved. Under
the state fold alone the arrival leaves no trace whatsoever: an event
that changed nothing and an event that never happened produce identical
records. The identity fold has no domain to be outside of — it hashes
canonical bytes — so it records that something arrived and precisely
which bytes it was, while the state records that nothing it understands
changed.

That is the pair the repository keeps: one fold that judges, and one
fold that only remembers.

## The cheaper things that were considered instead

A version counter records how many events a history has, which is a
weaker fact than which events. Two histories that diverged at event
three and reconverged in state both report `3`, and the counter is
assigned by whoever writes the record rather than derived from it, so it
carries no evidence about the events it counts.

A timestamp fails the same way and adds a clock. It is assigned, not
computed, so a party holding the events cannot check it, and two parties
holding identical events cannot be expected to produce the same value.

The chain head is computed from the events themselves — the accumulator
extends as `SHA-256(previous || canonical bytes of the event)` — so two
parties holding the same events derive the same head without
coordinating, and neither has to be trusted for the comparison to mean
something.

Asking the writer is the last alternative, and the wire contract refuses
it by name. The daemon's read reply carries its own head under the note
`heads are claims: recompute the chain head from the entries locally`
([`proto/go/protod/read.go`](../../proto/go/protod/read.go)), and the
client does exactly that: it re-folds the returned entries and compares
its own result against the claim before returning a reply, producing a
local refusal of kind `verify-failed` if they disagree
([`proto/ts/src/client.ts`](../../proto/ts/src/client.ts)). The head is
worth carrying because it is checkable by the party who did not compute
it. A number that must be believed would not be.

## The guarantee, and where it stops

If two event sequences fold from the same seed to the same chain head,
then they never differ — not in their events, not in their order, not in
the canonical bytes of any one of them. The limit sits in two places: a
head commits to a prefix rather than to a whole history, so it says
nothing about events that were never appended to the history it covers,
and "never" rests on SHA-256's collision resistance, which this
repository assumes rather than proves.

The gap between "same state" and "same history" is what makes provenance
a computable fact instead of an attestation, and it is checkable at
`bun packages/core/examples/tour.ts`, at
[`packages/core/src/stream.ts`](../../packages/core/src/stream.ts) and
its Go twin [`go/stream/stream.go`](../../go/stream/stream.go), and in
the ledger. The ledger also states where the evidence stops: journal and
chain walls stand at R0/R1 — fixture walls and property tests — with no
model gate yet, recorded against ticket 012 in
[VERIFICATION.md](../../VERIFICATION.md).

Two histories can agree in state while differing in head: the chain
remembers what the fold forgives.
