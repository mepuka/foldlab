# The register handler — the strict explanation

Status: PRE-GRADE. Operator dictation 2026-08-30, formalized by the
coordinator; awaits grilling. Companion to [VISION.md](VISION.md)
(the thesis as ruled) — this document tightens WHAT the product does
with the proof-driven machinery, now that the machinery exists
(.claude/skills/implement/, PROOF-DRIVEN-DEVELOPMENT.md).

## The chain, and the tightness claim

The product's real subject is one chain:

```
human meaning  →  semantics  →  algebra
```

and the claim is TIGHTNESS: each link held as close to the next as
possible, no link drifting from the others. Specification is the act
of forcing human meaning into semantics; the proof-driven process is
the act of forcing semantics into algebra; the gates and word
equality are the act of forcing the algebra back onto running code.
When any link separates — meaning from spec, spec from algebra,
algebra from carrier — the product degrades into the thing we
already have everywhere: software whose behavior is folklore.

This is genuinely a challenge, and it is THE challenge — not a
by-product of the verification work but the point of it.

## The product move: a handler that switches register

The technique the estate now runs on — algebraic contract, breaker,
witness, gate — was built to produce correct code. The product
generalizes it by one move, and the move is already in the estate's
own vocabulary: **a semantics is a handler (R3), and the register a
person meets the system in is a choice of handler, not a property of
the system.**

- For the builder, the machinery surfaces AS algebra: contracts,
  falsifiers, proofs — the register of this repo.
- For a domain or a user NOT in that register, the SAME machinery
  runs underneath, and a register handler renders it into their
  register — abstracting over the symbolic and mathematical
  reasoning without discarding it. The algebra is still there; it
  is interpreted into different surface language (the R6 rendering
  layer and the R12 tower are the existing seams this rides —
  nothing new is minted).
- What the user buys is **semantic alignment**: interaction with
  agents that is PREDICTABLE, because underneath every exchange sits
  a stated algebra with its falsifiers, even when neither the user
  nor the surface ever shows a formula. "We know the specification"
  becomes a property of ordinary conversations with agents, not
  only of proofs.

Said in five-seats terms (PLAN.md S5): the algebra is one substance;
the register handler is how the using and prompting seats meet the
same object the programming, reading, and computing seats already
hold. This is the strict version of "verified programming in four
registers over one substrate" (operational-structure/DESIGN.md): the
register handler is the mechanism that lets the four registers BE
registers of one thing rather than four products.

The front end is where this lands first — the front end is a
projection (FRONTEND.md verdict), and the register handler names
what it is a projection OF.

## The post-your-proof place (operator, 2026-08-30 — the non-local turn)

The break→fix machinery is not only internal discipline — it is the
product's first NON-LOCAL shape. The realization, marked as
dictated:

- **Open methods, open repos.** The proof-driven method (contract
  packets, falsifiers, attack modules, break ledgers — the
  conventions now in `.claude/skills/implement/`) is adoptable by
  any repository as an open standard. The code stays in YOUR repo.
- **We do the rest.** What the platform hosts is the thing the code
  host does not: the HISTORY of your proofs and their refutations —
  claim, packet, attack, witness, fix, re-proved refutation — as
  one auditable chain. And that history is just a hash chain:
  content-addressed, append-only, receipt-carrying — the CAS's
  native object (R4 identity, words as receipts, `cas verify`'s
  audit over untrusted stores). It is what we do best; nothing new
  is minted to serve it.
- **The product sentence:** *the "post your proof" place.* A claim
  arrives with its packet; attacks and refutations accrue as
  content; the chain is verifiable by anyone against the repo it
  cites; earned confidence (the failed-attack record) is as
  first-class as the breaks.
- **Seed API:** PDD-4, the attack hoover
  (.staging/wave-1/PDD-4.md), stops being an internal convenience
  and becomes the first product-facing ingestion surface. The dual
  output ruled in [VISION.md](VISION.md) — product plus open
  libraries — lands here naturally: the method is the open half,
  the hosted chain is the product half, and the register handler
  above is how non-formal users read the same chain.

## Collection is the front end (operator, 2026-08-30)

The non-local idea's local root: a daemon process running a DEFAULT
CAS PROGRAM — turn on file watching and it passively collects diffs
(creation, change) with a very modest API: set the file types,
nothing more. Passive collection; the collection itself becomes an
API. This is the streaming study's ruling made product ("the word is
the feed, pull-first").

And it is HOW THE FRONT END IS DESIGNED: everything in the UI is an
action on the store or derived from one. If you want something in
your UI, you start collecting it — simple as that. Our job is
exactly two guarantees: they can collect WHATEVER they want, and it
still functions and still looks good. The front end never has a
data model of its own; it has collections and derivations over the
store, rendered through the register handler above.

THE PRODUCTIVE VIEW (operator, 2026-08-30): what you watch when you
are productive in this app is the proof AND the plain-semantic
explanation of your software project coming to fruition, together.
"What's going on in my project?" — "It was just proven that your
design protects X, according to this." That feedback loop —
satisfying, reassuring, and grounded in the record rather than in
status prose — is the product's core sensation. The pipeline
(tickets → castles → attacks → closures, churning) is the thing the
view renders.

## Pending considerations (recorded, not ruled)

1. **Vendored math/CS libraries.** Under consideration: vendoring
   mathematical and CS libraries (Mathlib-class) into the estate —
   NOT to admit them into proof obligations, but because letting
   agents read the algebraic constructions makes their reasoning
   about our own algebra deeper. The license question and the
   admission boundary (a vendored library is reference, never an
   obligation carrier) would need a ruling before any vendoring.
2. **Parallel proof decomposition.** The one-lane-per-proof grind is
   suspected inefficient. The shape to trial, pending what the
   algebraic model review surfaces: break the stated problem into
   its pieces, prove pieces in parallel, combine — overlap is FINE
   because proof work is monotone; two agents proving the same
   lemma costs tokens, not correctness, and needs no coordination.
   If the review's OWED-law ledger is long, this becomes the next
   optimization to institute.
