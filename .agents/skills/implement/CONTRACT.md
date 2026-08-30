# The contract packet — format and law

The debt object, the degree rule, the obligation classes, the
five-heading template, the falsifier format, and a worked example.
The full derivation is
[PROOF-DRIVEN-DEVELOPMENT.md](../../../.staging/operational-structure/PROOF-DRIVEN-DEVELOPMENT.md)
§2; this page is what the breaker produces and the implementer
consumes.

## The pin

The packet is a FILE, pinned with the work — at minimum the stated
algebraic model travels with the unit tests and the implementation,
in the same tree, forever:

- The packet lives at `test/contracts/<task>.contract.md` beside the
  battery it specifies (adjust the root to the package under work;
  the invariant is same-tree, breaker-authored, co-committed with
  the battery).
- Every battery test file names its packet path in its header
  comment; the packet names its battery files and its CATALOG.md
  rows.
- The packet is committed by the breaker BEFORE any implementation
  commit touches the code under contract — the git history is the
  proof of role separation, and a packet first committed alongside
  the implementation is a process defect on its face.
- The implementer's commits never edit the packet or the battery; a
  packet change is a breaker commit, and the history shows whose
  hand moved.

## The break ledger

A successful falsification is important data — especially formally
stated — and it is never discarded. When a falsifier fires against
code the implementer believed in (or the breaker's adversarial
implementation defeats the spec itself), the breaker appends a
record to the packet's `## Breaks` section:

```
BROKE      <commit of the broken implementation>
LAW        <the formal statement, verbatim from the packet>
WITNESS    <the exhibited counterexample, concrete values>
CLASS      <the obligation class it violated>
FIXED-BY   <the fixing commit, added when it lands — or SPEC-BUG
            when the adequacy class fired and the packet itself
            was amended>
```

The ledger is the durable trace of the break→fix loop: a corpus of
(formal statement, witness, defect) triples the estate can later
ingest as content. A packet with an empty ledger and a green battery
says the laws were never seriously attacked — the breaker's record
is measured in witnesses, not in tests written.

The ledger's mechanical companion: every attack PROOF is committed
under `contracts/attacks/<ticket>/` (see BREAKER.md, "Attack
artifacts are record") — the ledger row cites the attack module
that carries its witness, and a fired attack's refutation by the
amended laws is re-proved after the fix, not asserted. The hoover
of this corpus into the store is owed as an API
(.staging/wave-1/PDD-4.md).

## The debt object

On each unit of work `c` against contract `(P, Q, d, F)`:

```
owed(c) = ⟨ σ , π , τ , ι , φ , γ ⟩
```

- `σ` **statement** — the contract itself, dated before the body
  exists: precondition `P`, two-state postcondition `Q` (first state
  is `old`), variant `d` into a well-founded order (estate form:
  fuel, existential), frame `F` (the address footprint).
- `π` **refinement** — `∀ a, P a ≤ wp (c a) (Q a)`; equivalently
  `⌈P,Q⌉ ⊑ c` in the refinement order.
- `τ` **termination** — every recursive edge strictly decreases `d`.
- `ι` **invariant preservation** — for represented structures with
  invariant `V` and abstraction `α`: `V` preserved and
  `α (op_rep r) = op_abs (α r)` (the homomorphism square).
- `φ` **frame** — predicates whose free addresses miss `F` are
  invariant under `c`; decidable about any actual run from its
  receipt.
- `γ` **conformance** — the host artifact `c̃` tied to the model by a
  decidable gate: byte equality of generated surface, or word
  equality on every admitted vector (R5).

## The degree rule

State the new development work itself in algebra, **to as much a
degree as possible**. That is the whole rule — there is no rigor
ranking and no tier ladder. Even one state formula about a piece of
development work forces the reasoning process that leads to good
falsification attempts; the degree is what the work's algebra
supports, written down until it runs out. Where the algebra runs out
after one formula, one formula plus its falsifier and red test is
the packet. Where a bug is unacceptable — store law, identity,
generated surfaces, money, auth — "as much as possible" is a lot,
and the classes below enumerate what can be owed.

Always, for every piece of work: the algebraic statement, a
falsification equation per law, the red battery. On strata 1–2
surfaces the statements are Lean and `γ` runs through the existing
gates. Never: a soundness word about host code — host seams get the
battery and trust statements only.

The packet's opening claim is auditable: "I have shown algebraically
that this can be implemented to this degree of verification."

## The obligation classes

The breakdown of "what class of issue is this — what do we owe":
named classes, words not numbers. The packet lists, in one line,
which apply; classes that do not apply generate nothing — no
boilerplate where it doesn't matter.

- **domain** — every partial operation inside its domain:
  `def(E)` side conditions (index in bounds, divisor nonzero, match
  total, callee precondition at each call). Protects against crash.
  (§2.12, §13.0)
- **contract** — the triple itself: `P ≤ wp c Q`. Protects against
  the wrong answer. (§1.4, ch. 2)
- **adequacy** — the SPEC's own obligation, and the anti-overclaim
  class the process turns on: is `Q` strong enough that no wrong
  implementation passes? Discharge by the adversarial
  implementation: try to exhibit `c'` satisfying the contract while
  breaking the intent — if one exists, the spec is the bug.
  (§1.4.0 underspecification, §8.0/§8.3 the sorting trinity)
- **invariant** — `Valid`/wf preserved on every exit path;
  correctness lemmas conditioned on it. (ch. 10, 16; estate:
  `Word.wf`)
- **termination** — a variant into a well-founded order; estate
  form fuel, existential. (ch. 3, §11.2)
- **frame** — nothing outside the footprint moves; aliasing named;
  `old` placed on the dereference. Decidable about any recorded run
  from its receipt. (ch. 14, 16)
- **abstraction** — the boundary holds: contracts stated over the
  abstraction function's image, each op commuting with `α`;
  equality support decided at the export. (ch. 9, 10)
- **conformance** — model ↔ carrier: byte gate, word equality,
  battery. The class where "proved in Lean, wrong in TS" lives.
  (estate R5/R14)
- **claim-scope** — the stated boundary of every claim equals its
  actual coverage: what is quantified, what is assumed (`assume`,
  axioms, trust statements, unverified host seams), what the
  theorem does NOT say — a WLP-shaped claim is not a termination
  claim. (§2.7.1, §2.9; estate C5, G0–G6)

## The headings

`CATEGORIES` is assigned when the TICKET is written, not when the
packet is — the assignment itself is the trigger that opens the
catalog rows and book sections before any other work happens. The
breaker may add tags the ticket missed, saying so.

```
CATEGORIES — taxonomy tags assigned at dispatch; each names its
             CATALOG.md rows and book sections — look them up FIRST
REQUIRES   — precondition over the starting word/state.
             Run-relative: a run's meaning is relative to its
             starting word (src/cas/Programs.ts header) — quantify
             over all states only when you mean it.
ENSURES    — two-state postcondition; old = the starting state.
DECREASES  — the variant and its well-founded order, or the fuel
             bound (existential-fuel discipline,
             Cas/Lang/Handler.lean:115-123).
FRAME      — addresses read, addresses written. Nothing else moves.
FALSIFIER  — per law: the equation whose exhibited solution kills
             the claim, and the battery file that executes it.
```

## Falsifier format

One line per law, each an equation with a metavariable to exhibit:

```
LAW        Append is length-additive:
           len(append(xs, ys)) = len(xs) + len(ys)
FALSIFIER  exhibit xs, ys with
           len(append(xs, ys)) ≠ len(xs) + len(ys)
BATTERY    test/Append.test.ts — property over generated lists
```

The falsifier must be EXECUTABLE against the TypeScript. An equation
only Lean can check belongs at escalation tier with its gate named;
it does not discharge the floor.

## Worked example (real, already in the estate)

The program-mirror law that `putProgram` answers Lean's address:

```
REQUIRES   store admits SHA-256 content addressing; table t is a
           registered program (a table of puts alone), so its word
           is a function of the table and the digest only.
ENSURES    putProgram(t) = the cont-node address that
           Cas.Lang.encodeProg computes for t — character for
           character.
DECREASES  |t| (finite table, no recursion).
FRAME      writes: the step nodes and cont node of t; reads: none.
FALSIFIER  exhibit a registered table whose host address disagrees
           with its VectorProgramAddresses.json row.
BATTERY    the cross-host gate over
           test/generated/VectorProgramAddresses.json
           (library/effects/src/cas/Programs.ts, "The cross-host
           gate": "The two must agree, character for character, or
           the gate is red.")
```

This packet existed before this skill did — the estate already
builds this way at its best. The skill makes it the floor, not the
best case.

## Escalation

The algebra becomes a Lean statement in the grill format
(CORE-ABSTRACTIONS-PLAN.md §3): statement, decomposition, named
falsifier. Carriers for the statement: `Prog`/`PProg`
(Cas/Lang/Defun.lean), `Word.wf` (Cas/IR/Word.lean:150), frame
soundness (`runP_frame_sound`, Defun.lean:1965), fuel
(Handler.lean:100-123). The gates that transport it to the host:
byte gates (`mise run check:cas`) and word-equality conformance
(R5, effects test suite).
