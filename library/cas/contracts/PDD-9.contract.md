# PDD-9 — `treeProg` correctness: the flagship artifact tied to its meaning

The contract packet for owed-ledger item 3 of THE-ALGEBRA
(`.staging/algebraic-review/THE-ALGEBRA.md` L231/L232/L127, §3.5,
§3.31): the estate's flagship generated artifact — seven registered
programs and the R5 gate itself — is tied to `Tree.prog`'s meaning by
nothing, and `runP`, the operation R5's prose names, acquires no
executed consequence anywhere.

```
CATEGORIES algebraic-laws, contracts, termination, inductive-data
```

CATALOG rows opened for those tags, and what each contributed:

- **§4.3 Structural Inclusion** (`inductive-data, termination,
  algebraic-laws, proof-mechanics`) — "use the datatype argument as the
  decreases value; pattern matching exposes the structurally included
  children". Every recursion this packet touches — `lowerTree`,
  `lowerTable`, the private `seg`, and all four inductions — descends
  on a constructor child of `Tree`, so the `termination` class is
  discharged structurally and no metric is invented. The one non-structural
  variant in play is the RUN's, and it is a number, not a wish (below).
- **§4.6 Abstract Syntax Trees for Expressions** (`inductive-data,
  algebraic-laws, termination, specification-design, proof-mechanics`)
  — the section's discipline is that an AST's evaluator equations and
  its structural decreases are ONE mutually recursive contract. Here the
  "evaluator" is the store program and the equations are per-constructor:
  a leaf sort emits one put; a one-child sort emits the child's segment
  then its own put naming the child's answer; a two-child sort emits both.
  The falsifier the section names — "a recursive call on a
  non-structurally-smaller expression" — is why LAW S is stated over an
  offset-indexed `seg` rather than over a fixpoint nobody can see.
- **§4.1 Matching on Datatypes** — "turn each constructor branch into a
  red case". Both walkers have ten clauses and the two ten-clause matches
  are what LAW W compares; a clause that parts from its twin is the whole
  error state §3.31 records.
- **§8.0/§8.3 the sorting trinity** (`specification-design,
  algebraic-laws`) — a spec is a CONJUNCTION and the third axis is the one
  that bites. Here the axes are ANSWER (the run's address), GROWTH (which
  bindings the word gained) and STORE (what the projected store holds).
  Answer alone is satisfied by a program that writes nothing; growth alone
  by one that writes garbage. LAW R carries all three, and the adequacy
  witness below shows why.
- **§1.4 Method Contracts / §2.7 underspecified outputs**
  (`contracts`) — "treat an underspecified output universally". The
  run's growth is a SUBLIST of `flatten`, not `flatten`: shared subterms
  deduplicate. The packet states the sublist and the store equality
  rather than the flattering equality, and the shared-chunk witness is
  kept live so the weaker true form cannot be quietly strengthened into a
  false one.
- **§B.7–B.8 proof mechanics** — universals proved for arbitrary,
  existentials discharged by exhibiting the witness. LAW X is the
  existential half and it is EXECUTED, not asserted.

## The degree claim

**I have shown algebraically that this can be implemented at the Lean
escalation tier, with one law discharged by execution rather than by
proof, and the boundary between the two is written down.**

- LAW S, LAW W, LAW F, LAW M and LAW R are Lean statements over the
  shipped `Cas.Backend.treeProg`, `Cas.Grammar.Tree.table`,
  `Cas.Lang.embed`, `Cas.Lang.runP` and `Cas.Grammar.Tree.prog`
  declarations, proved to the kernel with no `sorry`, no
  `native_decide`, and no new axiom.
- LAW X is DECIDED, not proved: a kernel `#guard` at a toy address
  function and a build-time `#eval` IO assert at the production digest
  (`Cas.sha256Addr`). This lane's law is that digest computation runs in
  `#eval` and never in kernel `decide` (`library/cas/AGENTS.md`,
  "Standing discipline"), and PDD-2's battery
  (`Cas/Lang/Wp.lean:880-903`) is the precedent for the pairing.
- The escalation gate is NEGATIVE, exactly as in PDD-1: this slice adds
  one new theorem module and no bytes. `γ` is discharged by
  `lake exe emitprograms --check` (and the rest of `check:cas`)
  staying byte-identical — the claim is "the model gained theorems and
  every emitted surface stood still", and a red `--check` refutes it.
  There is no host battery because there is no host change.

## The algebra

Three lowerings of one grammar term exist at HEAD and §3.31 records that
no theorem relates any pair:

| lowering | into | site |
|---|---|---|
| `Tree.progK` / `Tree.prog` | `Prog CasSig Addr32` | `Cas/Lang/TreeProg.lean:40,71` |
| `treeProg` | `PProg` | `Cas/Backend/EmitProg.lean:85` |
| `Tree.table` | `PProg` | `Cas/Backend/ProgProse.lean:268` |

This packet closes the triangle: the two `PProg` walks are EQUAL (LAW W),
and the table's denotation IS the term's program (LAW M), from which the
run's meaning follows (LAW R) and the run is then EXECUTED (LAW X).

The bridge is one private restatement, `seg`, and the PIN DEVICE is
PDD-1's: `Cas/Backend/Canon.lean:115-129` carries private `canonDedup`
/ `canonHasKey` and pins them to the shipped `canonServices` by a
kernel-checked theorem, so drift is a red build rather than a silent
divergence. The same device is used here for the same reason and with
one added motive named in the ticket: `putNode` (`EmitProg.lean:46`) and
`putLine` (`ProgProse.lean:227`) are `private` to their modules and both
files are FENCED, so no theorem elsewhere may name them and no edit may
unseal them. `seg` is the third spelling, the two pins hold it to the
first two, and nothing is assumed.

```
REQUIRES   LAW S, W, F, M: nothing — total on every sort `t` and every
           `tr : Tree t`.
           LAW R: `Function.Injective H` (the Level-1 hash hypothesis,
           named at its lattice level per CAS-003 and inherited verbatim
           from `Tree.putTree_correct`), and a starting word that is
           ADMISSIBLE and HONEST (`Word.wf w = true`, `Honest H w`).
           Run-relative, as the estate's rule says: a run's meaning is
           relative to its starting word, and `w` is universally
           quantified only inside those two predicates — never over all
           words. The empty word satisfies both, which is the corollary
           the executed consequence runs.
           LAW X: nothing. It is a computation.

ENSURES    S    treeProg tr = (seg tr 0).1  and
                Tree.table tr = (seg tr 0).1        (the two pins)
           W    Tree.table tr = treeProg tr          (L232)
           F    (treeProg tr).length = tr.size       (the fuel, as a
                fact about the table rather than a hypothesis)
           M    embed (treeProg tr) = tr.prog        (L231, the strong
                form: equality of PROGRAMS, not of runs)
           R    Triple H (treeProg tr)
                  (fun w => Word.wf w = true ∧ Honest H w)
                  (fun a w' => a = tr.address H ∧ …)
                i.e. from every admissible honest word the table's run
                HALTS DONE — refusal excluded — answering exactly
                `tr.address H`, over a word that grew by a SUBLIST of
                `tr.flatten H` and projects to exactly `flatten`'s store,
                staying admissible and honest.
                Two-state form (`old` = the starting word) through
                PDD-2's `Triple_two_state_rel` (`Cas/Lang/Wp.lean:606`);
                `Triple`/`wp` are that packet's vocabulary and are used
                here as the specification language, with credit.
           X    the run of a REGISTERED program, computed: for a term
                with a shared subterm, `runP` answers the term's
                `Tree.address` and the final word is the DEDUPLICATED
                word — four bindings where `flatten` has five.

DECREASES  Structural on `Tree` (§4.3): `seg`, `lowerTree`, `lowerTable`
           and every induction descend on constructor children, so the
           decrease is free and no metric clause is written. The RUN's
           variant is separate and is a NUMBER, not a hypothesis: fuel
           `(treeProg tr).length + 1`, which LAW F identifies with
           `tr.size + 1` — the existential-fuel discipline
           (`Cas/Lang/Handler.lean:115-123`) discharged by
           `runP_embed_agree` and `Triple_run` (`Wp.lean:618`).

FRAME      reads: `tr`, and the starting word `w`.
           writes: the run appends a sublist of `tr.flatten H` to the
           word and nothing else — no binding is removed, no address
           outside `tr.flatten H` is written, and the projected store
           moves by exactly `flatten`'s bindings.
           FILE frame, the load-bearing half: this slice adds ONE new
           module, `library/cas/Cas/Backend/TreeProgCorrect.lean`, and
           edits NO existing file. In particular it does not touch the
           fenced `Cas/Backend/EmitProg.lean`,
           `Cas/Backend/ProgProse.lean`, `Cas/Lang/TreeProg.lean` or
           `Cas/Lang/Defun.lean`; it does not touch `Cas/Lang/Wp.lean`;
           it does not touch `lakefile.toml` (the `CasBackend` library
           globs `Cas.Backend.+`, so the new module is built and
           kernel-checked with no declaration); it does not touch
           `tools/Walk.lean` (a new backend module is invisible to the
           surface, obligation and law ledgers until it is added to
           `libraryImports`, and adding it is a promotion, hence a
           ruling — `Walk.lean:29-34`); and it moves no fixture byte.
```

## The laws and their falsifiers

```
LAW S      THE PIN. The private restatement computes both shipped walks:
             treeProg tr    = (seg tr 0).1
             Tree.table tr  = (seg tr 0).1
           `seg` is offset-indexed — `seg tr n` is the segment a term
           occupies when its first line sits at index `n` — because that
           is what the answer operands are relative to, and an
           offset-blind restatement could not state LAW M at all.
FALSIFIER  exhibit `tr` with `treeProg tr ≠ (seg tr 0).1`, or with
           `Tree.table tr ≠ (seg tr 0).1`. Mechanically: change one
           clause of either shipped walker and the corresponding pin
           stops elaborating — `lake build` red, no trust added.
BATTERY    library/cas/Cas/Backend/TreeProgCorrect.lean —
           `treeProg_eq_seg`, `table_eq_seg`, kernel-checked.
```

```
LAW W      THE TWO WALKS AGREE (L232). For every sort `t` and every
           `tr : Tree t`:  Tree.table tr = treeProg tr.
           This is the sentence `ProgProse.lean:225` calls prose:
           "The two walks agreeing is prose, not a theorem."
FALSIFIER  exhibit `t` and `tr : Tree t` with
           `Tree.table tr ≠ treeProg tr`. Concretely: a term whose
           emitted table diverges from its walk — the ticket's first
           named falsifier.
BATTERY    library/cas/Cas/Backend/TreeProgCorrect.lean —
           `table_eq_treeProg`; plus `#guard`s exhibiting the equality
           on concrete terms, so a reader meets the fact executed as
           well as proved.
```

```
LAW F      THE TABLE'S LENGTH IS THE TERM'S SIZE.
             (treeProg tr).length = tr.size
           Small, and load-bearing twice: it is what turns `runP`'s
           fuel bound `p.length + 1` into `Tree.putTree_correct`'s
           `tr.size + 1`, and it is what makes the envelope's put count
           a fact about the TERM rather than about the table.
FALSIFIER  exhibit `tr` with `(treeProg tr).length ≠ tr.size`.
BATTERY    library/cas/Cas/Backend/TreeProgCorrect.lean —
           `treeProg_length`.
```

```
LAW M      THE TABLE IS THE TERM'S PROGRAM (L231, strong form).
             embed (treeProg tr) = tr.prog
           Equality in `Prog CasSig Addr32` — the carrier's own
           equality, not an observational one and not a run agreement.
           This is the statement §3.31 says no theorem makes: the
           emitted table's denotation IS the grammar term's store
           program, so the emitter cannot drift from the grammar
           without a red build.
FALSIFIER  exhibit `t` and `tr : Tree t` with
           `embed (treeProg tr) ≠ tr.prog`. A weaker refutation
           suffices and is worth naming: exhibit `H`, `tr` and an
           admissible honest `w` on which the two RUNS disagree in
           status, answer or word — that kills LAW M through LAW R.
BATTERY    library/cas/Cas/Backend/TreeProgCorrect.lean —
           `embed_treeProg`.
```

```
LAW R      THE RUN'S MEANING (L231 as a triple; PDD-2's vocabulary).
           For injective `H`:
             Triple H (treeProg tr)
               (fun w => Word.wf w = true ∧ Honest H w)
               (fun a w' => a = tr.address H ∧
                  ∃ v, v.Sublist (tr.flatten H) ∧ … )
           and, in the two-state reading with `old` the starting word:
             ∀ w₀, Word.wf w₀ ∧ Honest H w₀ →
               ∃ v, v.Sublist (tr.flatten H)
                 ∧ runP H (treeProg tr) w₀ = (.done (tr.address H), w₀ ++ v)
                 ∧ Word.toStore (w₀ ++ v) = Word.toStore (w₀ ++ tr.flatten H)
                 ∧ Word.wf (w₀ ++ v) = true ∧ Honest H (w₀ ++ v)
           Three axes, per §8.0: ANSWER (`tr.address H`), GROWTH (a
           sublist of `flatten`, appended — the frame), STORE (exactly
           `flatten`'s projection). Refusal is excluded by `.done`;
           divergence is excluded by the carrier (`runP_halts`).
FALSIFIER  exhibit an injective `H`, a term `tr` and an admissible
           honest `w` such that `runP H (treeProg tr) w` refuses, or
           answers other than `tr.address H`, or leaves a final word
           that is not `w` extended by a sublist of `tr.flatten H`, or
           whose store differs from `flatten`'s — the ticket's second
           named falsifier ("a table whose run answers differently than
           the term's meaning").
BATTERY    library/cas/Cas/Backend/TreeProgCorrect.lean —
           `treeProg_Triple`, `treeProg_run`, `treeProg_run_empty`.
```

```
LAW X      THE EXECUTED CONSEQUENCE (L127). `runP` acquires one, on a
           REGISTERED program, at both address functions this lane
           admits:

             #guard  — kernel-decided, at a toy address function, on
                       the shared-subterm witness: the run is DONE, the
                       answer is the term's `Tree.address`, the final
                       word is the DEDUPLICATED word (one binding
                       shorter than `flatten`), and it is a `Sublist` of
                       `flatten`.
             #eval   — a build-time IO assert at the production digest
                       `Cas.sha256Addr`, over the registered terms of
                       `Cas/Vectors/Registry.lean` that the seven
                       generated programs are lowered from
                       (`tools/EmitPrograms.lean:45-60`): each term's
                       `runP H (treeProg tr) []` is computed and
                       compared, binding for binding, against the word
                       and the address the GRAMMAR determines.

           The two halves are the same verdict at two digests, which is
           PDD-2's battery pattern (`Wp.lean:880-903`) and this lane's
           standing rule: digests are computed in `#eval`, never in
           kernel `decide`.
FALSIFIER  This is §3.5's own falsifier, and its recorded witness is
           what this law is built to destroy:

             FALSIFIER  change runP's word semantics — make a duplicate
                        put append — and exhibit a red gate
             WITNESS    (at HEAD) no gate goes red

           After this law: the shared-subterm run's word is length-checked
           against the deduplicated word, so an appending duplicate put
           makes the `#guard` fail to elaborate and the `#eval` throw.
           The gate that was absent is present, and it is red under
           exactly the mutation §3.5 names.
BATTERY    library/cas/Cas/Backend/TreeProgCorrect.lean — the `Executed`
           section: `#guard`s over the witness terms and `Executed.check`
           driven by `#eval`.
```

## Adequacy — the law set, attacked before it is proved

The §8.0 question: is the conjunction strong enough that no wrong
implementation passes? Three adversarial candidates, and what kills each:

- **A lowering that emits NOTHING.** `treeProg tr = []`. Kills nothing
  in W (both walks empty), passes S if `seg` is emptied too — and dies
  at LAW F (`0 ≠ tr.size`) and at LAW M (`embed [] = failWith …`,
  which is not `tr.prog`). F is in the packet for this reason, not for
  the fuel alone.
- **A lowering that emits the right SHAPES with wrong operands.** Every
  put present, every reference naming line `0`. Survives F, survives the
  put-shape `#guard` that `ProgProse.lean:298` already carries — that
  guard compares put SHAPES only, which §3.31 records as its limit — and
  dies at LAW M, because the resolved reference addresses are then not
  the children's answers.
- **A meaning theorem that quantifies over the wrong thing.** `∀ w`
  without `Honest H w` is FALSE, not merely unprovable: a word that
  binds the term's address to a DIFFERENT node makes the put conflict
  and the run refuse. The premise is not decoration and it is not a
  wish — it is discharged at the site the executed consequence runs
  (`w = []`, honest and admissible by `Honest.nil` and `rfl`), which is
  why LAW X can be an unconditional computation while LAW R carries
  hypotheses.

The third is the `claim-scope` obligation in its sharpest form and it is
why the packet states LAW R run-relative rather than universally.

## Claim-scope — what these theorems do NOT say

The anti-overclaim class, written before the proofs so it cannot be
written to fit them.

- **Nothing here reaches the TypeScript.** LAW M and LAW R are about
  `treeProg`'s table and its Lean run. `progProgram`'s PRINTING
  (`EmitProg.lean:119`), the generated `VectorPrograms.ts`, and the
  host's `store.put` are claimed by the byte gate and by R5's suite
  alone, exactly as before. No soundness word attaches to host code
  (estate C5).
- **The R5 chain is shortened, not closed.** §3.5 draws the chain as
  `TS host run =gate= fixture word =???= runP/run =bridge= interpretRef`.
  This packet supplies the marked link as an EQUALITY at the Lean end
  (LAW M plus `Tree.putTree_correct`, whose conclusion is a `Sublist`
  for a reason the shared-chunk witness exhibits) and gives `runP` its
  first executed consequence. It does NOT make the TypeScript suite
  compare `List Binding` to `List Binding`; §3.5's closing sentence
  about what R5 certifies today still stands for the cross-host half.
- **The growth is a SUBLIST, never `flatten` itself.** Shared subterms
  deduplicate. A packet claiming `w ++ tr.flatten H` would be claiming
  something false, and the registered `shared-chunk` term is the
  standing witness.
- **LAW R's `Function.Injective H` is a hypothesis about the address
  function, not a proved property of SHA-256.** It is the same Level-1
  premise `Tree.putTree_correct` carries, named rather than assumed. The
  `#eval` half of LAW X therefore checks the CONCLUSION at
  `Cas.sha256Addr`; it does not discharge the premise, and no claim of
  collision resistance is made or needed anywhere in this packet.
- **`seg` is a restatement, not a definition of record.** The two pins
  are what make it admissible. If a future slice routes the emitter
  through one walk (`Cas/Backend/Mcp.lean`'s note), `seg` and LAW W
  retire together and that is the intended end state.
- **LAW X covers the registered terms it names and no others.** It is an
  existential discharged by witnesses, per §B.8, and the packet claims
  exactly the witnesses it runs.
- **Nothing here touches `encodeProg`'s address side.** The cont-node
  address a program HAS (`tools/EmitPrograms.lean:96-103`, R7's stamp) is
  the encoder's fact; this packet is about the runner's, and the two are
  deliberately separate (the direction law: words are minted by running,
  addresses by encoding).

## Obligation classes in play

`contract` (LAW R is the triple itself, `P ≤ wp c Q`, in PDD-2's
anchor), `termination` (structural on `Tree` throughout, §4.3; the run's
variant a number via LAW F), `abstraction` (LAW M is the homomorphism
square between the `PProg` plane and the `Prog` plane — the whole
obligation, per §9.5), `algebraic-laws` (LAW W is the two walks'
equality; LAW S the pin), `conformance` (LAW X, and the negative byte
gate), `adequacy` (the three adversarial candidates above),
`claim-scope` (the section above), `invariant` (`Word.wf` and `Honest`
preserved across the run — carried through from `step_put_honest`),
`frame` (the word grows by an append and by nothing else).

The `domain` class generates one row and it is already discharged
upstream: `progProgram` is partial (`EmitProg.lean:93-108` refuses a
`load` line and a literal-address operand), and `treeProg`'s image
contains neither — every clause of both walkers emits `.put` with `.ans`
operands only. That is visible in `seg` by inspection and is why LAW M's
`resolveRefs` obligations never hit the refusal arm.

## Gates

```
lake --wfail build                 (from library/cas) — green, no sorry
lake exe emitprograms --check      (from library/cas) — byte-identical
mise run check:cas                 — the whole byte-identity battery
git status                         — clean beyond the two new files
```

## Breaks

```
(empty)
```

No falsification has fired against an implementation of these laws. Per
CONTRACT.md the emptiness is a claim about the record, not a boast: it
says the laws above have not yet been attacked by an independent hand.
The adequacy section names the three candidates this hand tried and the
law that kills each; an attack run belongs at
`library/cas/contracts/attacks/PDD-9/`, and the row it earns goes here.
