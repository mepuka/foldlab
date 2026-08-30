# PDD-7 — The sum algebra and the carrier's missing monad laws

CATEGORIES algebraic-laws, lemmas-proofs, contracts,
           abstraction-modules
BRANCH     agent/opus-cc-mac/pdd-7

Owed-ledger item 2 of THE-ALGEBRA
(.staging/algebraic-review/THE-ALGEBRA.md §2.1, §2.3, §3.2): the
entire signature-sum block is unstated, `Handler.sum` and `Prog.inr`
have zero call sites, and the word gate is blind to the falsifier BY
CONSTRUCTION — an `inl` performing every operation twice is
ObsEq-equal to the real one, so the statement is the whole of the
protection. `liftCas`, `handleLlm`, and the incoming `WordSig` all
ride on these laws.

## The work

State and prove, over the shipped carriers (Prog.lean:41-49,
Sig.lean:20-25, Handler.lean:63-66), in a NEW theorem module:
L5, L7, L8 (the carrier's monad-law stragglers), L21–L26 (the sum
block: handler-sum projections, interpret-through-sum for inl and
inr, inl monad morphism, inl injectivity), L30 (`handleLlm oracle =
interpret (idHandler.sum …)` — the right side is a VALUE of the
existing Handler; no new type), L31 (`handleLlm oracle (liftCas p)
= p`). The reviewer's exhibits file
(.staging/algebraic-review/handlers-semantics-exhibits.lean §1, §2,
§6) carries proof sketches — verify and use, cite as prior art,
trust nothing unchecked. Falsifiers per BREAKER.md shapes: the
double-performing inl is the canonical wrong-but-passing candidate;
state what excludes it.

## Fences and gates

New file(s) only; no existing file edited; no merge-branch file; no
byte moves (`check:cas` byte-identical, lake --wfail build green).
Packet first at library/cas/contracts/PDD-7.contract.md. Process:
.claude/skills/implement/ (committed on main — read from your
worktree).
