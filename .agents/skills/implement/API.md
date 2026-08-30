# Developing an API — the book's meaning

What "develop our APIs" means under this process, drawn from the
same catalog ([CATALOG.md](CATALOG.md), ch. 9–10, 16–17) and bound
by [CONTRACT.md](CONTRACT.md)'s degree rule and obligation classes.

## What an API is

An API is an **export set with an abstraction function**. Nothing
else is one.

- The **export set** decides what exists for clients: names
  provided, definitions revealed, everything unlisted private. The
  surface must be closed — an exported signature may not mention a
  hidden type (§9.2). Estate form: the stable API is representation
  strata 1–2 (R14); MCP tools are generated operation signatures
  (R9), so their surface is the manifest's, never hand-grown.
- The **abstraction function** `α` is the API's meaning: it maps
  valid representations to the abstract value the client thinks in
  (§9.3.1). Every exported contract is stated over `α`'s image —
  over Elements, never over front/rear. Estate form: the denotation
  through the reference handler (R10); for store-touching verbs,
  the recorded word.
- The **representation invariant** stays behind the boundary:
  clients never observe `!Valid`; constructors establish it,
  mutators restore it, and the exported-operation closure is the
  only way to hold a value of the type (§10.4 — a skeleton obtained
  outside the closure voids every lemma).
- **Equality is part of the surface.** Exporting a type means
  deciding what equality clients get; representation equality is
  not abstract equality (§9.4 — two-list queues equal as queues,
  unequal as lists). Export the observation (`IsEmpty`,
  `q == Empty()`) as an operation that provably agrees with the
  abstract definition.

## Developing one API operation

The two-role process applies with the contract stated at the
boundary:

1. **Breaker**: state the operation in algebra over `α`'s image —
   as much a degree as possible; the homomorphism square
   `α(op_rep(r)) = op_abs(α(r))` is the load-bearing law, and the
   adequacy class is walked HERE, where it is cheapest: try the
   wrong-but-passing implementation against the abstract contract
   (Enqueue at the head; RemoveMin returning a non-member bound).
   Falsifiers and battery test through the export set only — a test
   that reaches representation is testing the wrong thing and
   freezes what should stay replaceable (§9.5).
2. **Implementer**: everything behind the boundary — invariant
   design, frames, termination — per
   [IMPLEMENTER.md](IMPLEMENTER.md).

## Which laws ship inside the API

The intrinsic/extrinsic decision (§6.2, §10.3.1) IS an API design
decision:

- **Intrinsic** (in the contract/gate, checked at every use): only
  the property every client needs every time — the abstraction
  equations of the operations themselves.
- **Extrinsic** (the lemma library, applied on demand): the algebra
  ABOUT the operations — units, associativity, involution,
  commutativity. Multi-application properties cannot be intrinsic
  at all.
- Estate form: intrinsic = a door guard or generated-surface gate;
  extrinsic = the theorem batch. Moving a law between them is a
  ruling, not a refactor.

## The anti-overclaim rule at the surface

Published API claims carry their scope (the claim-scope class):
what the contract quantifies over, what it assumes, what it does
not say. "Verified" never appears on a surface without the named
judgment behind it (estate C5) — and never about host code at all.
The gap between "we said we proved it" and "technically this can
still happen" is always one of: an adequacy hole in `Q`, an
unsurfaced assumption, or a conformance step the gates don't carry
— name which, or don't publish the claim.
