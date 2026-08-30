# PDD-2 — wp on the program carrier

CATEGORIES wp-sp-calculus, contracts, assertions, termination
BRANCH     agent/opus-cc-mac/pdd-2

Dispatch under the proof-driven law: read
`.claude/skills/implement/SKILL.md`, `CONTRACT.md`,
`IMPLEMENTER.md`, and your categories' rows in `CATALOG.md` before
anything else — your categories are the ch. 2 rows; they ARE this
ticket's specification vocabulary. Wave-1 flow (operator-ruled): you
are the builder — you author the contract packet AND the
implementation, packet committed first; an independent breaker
attacks afterward. Design basis:
`.staging/operational-structure/PROOF-DRIVEN-DEVELOPMENT.md` §2
(the debt object) and §5 A2.

## The work

New file `library/cas/Cas/Lang/Wp.lean`: a weakest-precondition
transformer for the defunctionalized program carrier, verified
against the run the estate already trusts.

- Choose and DEFEND the carrier judgment in the packet: the fueled
  `runP` (Cas/Lang/Defun.lean) or the big-step denotation
  (Cas/Lang/Handler.lean:95-123 — the bridge and the
  existential-fuel discipline live there). State wp relative to the
  starting word — a run's meaning is relative to it.
- Define `wp` by recursion/fold over the table.
- The algebra (each law a theorem, each with its falsifier as a
  counter-`example` where one exists):
  - table extension / sequential composition: wp of a longer table
    composes transformers;
  - monotonicity: `Q1 ≤ Q2 → wp p Q1 ≤ wp p Q2`;
  - conjunctivity: `wp p (Q1 ⊓ Q2) = wp p Q1 ⊓ wp p Q2`;
  - the anchor: `Triple H p P Q ↔ P ≤ wp p Q` against the chosen
    judgment — soundness at minimum; completeness only as far as
    honest (existential fuel: "enough fuel is a conclusion, not a
    hypothesis").
  - the WLP distinction: a refusal/fuel-exhaustion path makes
    wp ≠ wlp observable — state it, with the witness program.
- Decidability where true: for a concrete table and decidable
  post-predicate, `wp` computes. A `#eval`/`decide` demonstration
  on a registered-program-shaped table counts as battery.

Degree rule applies: as much algebra as the carrier supports,
written until it runs out; what you do NOT claim (e.g. completeness
over divergent oracles) is stated in the packet's claim-scope line.

## Castle requirements

- Packet at `library/cas/contracts/PDD-2.contract.md`, committed
  BEFORE `Wp.lean`.
- May USE existing Defun/Handler theorems; may not modify them.

## Fences

Must not touch: `Cas/Lang/Worded.lean`, `Cas/Lang/WordWire.lean`
(pending merge), `Cas/Backend/Mcp.lean`, `Cas/Lang/Defun.lean` and
`Handler.lean` bodies (read-only),
`library/effects/src/cas/Programs.ts`,
`library/effects/test/Programs.test.ts`, and every file the merge
branches carry (plan §0:40-78).

## Gates

`lake build` green; `mise run check:cas` unchanged (a new theorem
file moves no bytes). Commit on your branch only, ticket key in
every commit title, never merge.
