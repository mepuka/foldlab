# PDD-9 — treeProg correctness: the flagship artifact tied to its meaning

CATEGORIES algebraic-laws, contracts, termination, inductive-data
BRANCH     agent/opus-cc-mac/pdd-9

Owed-ledger item 3 of THE-ALGEBRA
(.staging/algebraic-review/THE-ALGEBRA.md §2.x L231/L232/L127,
§3.5, §3.31): nothing anywhere executes `runP` against the grammar
— the seven registered programs and the R5 gate itself are tied to
`Tree.prog`'s meaning by nothing, and ProgProse.lean:225 admits
"the two walks agreeing is prose, not a theorem."

## The work

New theorem module:
- L232: `Tree.table tr = treeProg tr` — the two PProg walks agree
  (TreeProg.lean, Cas/Backend/EmitProg.lean:55-131).
- L231: `treeProg tr` computes the term — state the meaning
  theorem: `runP H (treeProg tr) w` realizes `Tree.prog`'s
  denotation, at whatever honest quantification the carriers
  support (fuel per the existential discipline; PDD-2's wp module
  on main may serve — `Triple`/`wp` give the specification
  language; using it is encouraged, citing PDD-2's packet).
- Executed consequence: at least one registered program's run
  becomes a kernel-checked or gate-checked fact (the review's
  complaint is precisely that runP has no executed consequence).
Falsifiers: a tree whose emitted table diverges from its walk; a
table whose run answers differently than the term's meaning.

## Fences and gates

New file(s) only; TreeProg.lean, EmitProg.lean, Defun.lean
read-only; no merge-branch file; no byte moves. If a needed walker
clause is missing from Defun.lean, restate privately with a pin
theorem (PDD-1's Canon.lean documents the device — cite it) rather
than editing the fenced file. Packet first at
library/cas/contracts/PDD-9.contract.md. lake --wfail build green,
check:cas byte-identical.
