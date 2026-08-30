# PROPOSED LOGIC — theorems the lanes' friction revealed

Operator directive 2026-08-29 night: agents surface confusion and
OFFER candidate logic — theorem statements, invariants, proven-fact
shapes — that would improve the reasoning agents get out of the
estate. All entries are PROPOSED (pre-grade, falsifiability-checked
by their proposers, awaiting the grill); the lane that proposed each
is named. The literature principle running in reverse: friction
proposes the theorems, the grill decides the canon.

## From the CLI A-push lane (2026-08-29)

**P1 — init is the unique creator, as a theorem.** The phantom-store
defect was two individually-correct modules composing wrongly, and
neither could STATE the law being broken.
`only_init_creates : ∀ h s s', h ≠ init → step h s = s' → storeRoots s' = storeRoots s`.
Falsifiable: the pre-fix `put` over a non-root path was a live
counterexample.

**P2 — resolution never widens the store set** (cheaper, the precise
invariant locateStore owes):
`locate_preserves_roots : ∀ p, locate p = some r → isStoreRoot r` —
and it must hold on BOTH branches (explicit and walk-up); the bug was
exactly the branches disagreeing.

**P3 — the register partition typed onto rendering.**
`everyday_closure : ∀ o, reachableFrom userInvocation o → words o ⊆ everydayRegister`.
Turns F2-class vocabulary drift from audit finding into proof
obligation. Hard part: modeling `words` over the renderers.

**P4 — the two registers agree.**
`registers_agree : ∀ v s, facts (prose v s) = facts (json v s)` with
`facts` a projection into a common record. `show` is a deliberate
exception (its --json is the canonical document) — record the
exception rather than smell it.

**P5 — tag trichotomy.**
`tag_trichotomy : ∀ t : UInt8, registered t ∨ working t ∨ refused t`
(mutually exclusive). Names the E19 stderr note in the model and
makes the working-tag register a table with a proof obligation
rather than a known gap (paperwork D6).

**P6 — ledger self-relations, emitted.** The counters carry no
stated relations (`bound + owed = rulings` is inferable, never
licensed). One invariant line per ledger, emitted beside the
counters, lets a runtime reader CHECK the document it just read.

## House hazard notes (not theorems; recorded for the next lane)

`Effect.as` is EAGER — reads its argument at pipe construction.
`Effect.forEach` passes the index to point-free callbacks. effect's
installed dist lags its src at rc.112 — confirm src-read APIs against
dist/*.d.ts. oxlint.config.ts's per-file exceptions are governed —
the right fix is usually to stop doing the thing, not to add a row
(the file should say so at its head).
