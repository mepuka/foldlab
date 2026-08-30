# PDD-8 — Interpretation's universal property, and the tower's monoid

CATEGORIES algebraic-laws, lemmas-proofs, abstraction-modules,
           proof-mechanics
BRANCH     agent/opus-cc-mac/pdd-8

Owed-ledger item 5 of THE-ALGEBRA
(.staging/algebraic-review/THE-ALGEBRA.md §2.2, §2.4): the three
theorems that license R10's "a semantics IS a handler" — until they
land, INITIAL and "free monad" are pending words.

## The work

New theorem module over Handler.lean/Interp.lean/Tower.lean:
- L12 (`interpret h (.vis op k)` unfolding, stated once, generally),
  L13 ("interpret is a monad morphism" as ONE named statement).
- L16 `Handler.ext`; L17 uniqueness (`interpret h = interpret g →
  h = g`); L18 existence (every monad morphism out of `Prog S` is
  `interpret h` for some `h`). Exhibits §3–§4 carry sketches
  (existence claimed at nine lines) — verify, use, cite.
- L33–L35: `through` associative, `idHandler` two-sided unit — the
  tower is a monoid, stated and proved (exhibits §5).
Falsifiers: the review found the estate holds semantics that are
NOT handlers (§3.4) — name them in the packet's claim-scope as the
boundary of the universal property's reach, not as defects.

## Fences and gates

New file(s) only; nothing existing edited; no merge-branch file; no
byte moves; lake --wfail build green, check:cas byte-identical.
Packet first at library/cas/contracts/PDD-8.contract.md.
