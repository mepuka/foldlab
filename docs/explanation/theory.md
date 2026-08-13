# The theory in brief

Moved verbatim from `README.md` when first contact was relocated to
[the tutorial](../tutorial/first-ten-minutes.md). Nothing below has been
reworded, so every claim keeps the truth conditions it was written with.
This is explanation register: it assumes the reader has already run the
tutorial and met a chain head, a fold state, and a refusal as printed
output.

## What foldlab is

foldlab is a lab for verifiable computation over streams, built with
Effect (TypeScript) and Go. Every value has one canonical byte form,
and a value's identity is a SHA-256 digest over those bytes, so any
claim — a type's identity, a history's head, a cross-language port's
equivalence — can be recomputed by anyone rather than taken on trust.
Equivalence between implementations (TypeScript ≡ Go, batch ≡ stream,
native ≡ wasm) is established by digest equality over frozen fixtures:
digest pins generated once by the Go side and recomputed by both sides
thereafter.

## Why "foldlab"

The name is literal: everything here is a left fold — one accumulator
carried across a sequence, one element at a time. A stream is folded
twice over: a hash fold, whose result (the chain head) is the
history's identity — a running Merkle-style hash chain, not a reducer
anyone writes — and a state fold, whose result is the history's
meaning, which is an ordinary `Stream.runFold` over the events with
your own reducer. The repo names them the identity fold and the
meaning fold. Two histories can agree in state while differing in head;
the chain remembers what the fold forgives, and that gap is what makes
provenance a computable fact instead of an attestation.

The same fold-shape recurs at every level, because algebraic data
types and event streams reduce the same way: a fold over structure
(a value's parts) and a fold over time (an identity's events) are the
same catamorphism, the one recursion scheme that collapses a structure
into a single value. An entity is the fold of one correlation key's
events; composition is a fold of child anchors; a schema's identity is
a fold over its AST; code generation is a semantic fold over that same
AST, so derived artifacts cannot drift from their source. The lab
exists to make each of these folds checkable.

## The three sorts

Three sorts organize the whole system: evidence, decisions, and
absence. Evidence is anything recomputable from bytes — facts, folds,
catalogs — and is never owned: it federates freely because equal bytes
give equal digests anywhere. Decisions are anything two parties could
legitimately dispute — named bindings, fork adoptions, committed
orderings — and each one single-homes behind the effector: it has
exactly one writer, a commitment register per unit of work:
`Register ::= Absent | Claim(fence, owner, lease) | Done(fence, result)`.
Absence is the one uniform failure: a digest not yet present is a typed
refusal — a tagged value in the error channel, not an exception and not
a null — and senders own retry.

The register's safety (no commit below the highest fence; exactly one
terminal outcome) is a machine-checked theorem — Apalache inductive
invariant, unbounded, independent of process identity — replayed in
lockstep against the running Go implementation across 15,378
schedules. The register is also where a running program becomes a
fact: a live Effect program is codata (more can always happen), and
commitment through the register turns it into data — one value, one
history.

A second theorem falls out of the sort: presence of evidence is
monotone (append-only journals only grow), so ingress can admit
records with a plain check and no lock. Creation instead checks
absence, an observation that can go stale, and therefore writes
through a compare-and-swap. The catalog and ingress protocol carrying
both results are model-checked with TLC, the explicit-state TLA+ model
checker: 12,707,989 distinct states at the gate bounds, four
invariants held, four sabotaged variants each refuted. The same
protocol is conformance-tested against the running daemon (R4, the
ladder's rung for lockstep against the running binary): 131 schedules
replayed lockstep with zero divergences against the named coarsened
wire map, controls first. The inductive proof above the bounded check
(R3) is in re-proof at repaired hypothesis bounds — the claim is
deliberately HELD until those verdicts land; the ladder and its honest
status live in [VERIFICATION.md](../../VERIFICATION.md).
