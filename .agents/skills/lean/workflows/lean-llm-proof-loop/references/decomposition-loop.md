# Decomposition loop

The productive escalation when the budgeted loop exhausts on a goal.
Decompose before returning; return the smallest failing goal only when
decomposition itself exhausts. (Provenance: the recursive
sketch-extract-solve-merge discipline, HILBERT arXiv:2509.22819 —
corpus pin pending — adapted to this estate's rules.)

## Order of attack

1. **Statement triage first.** Before another proof attempt on a
   resisting goal, spend one pass attacking the STATEMENT: hunt a
   counterexample (`#eval` sweeps over small cases, `decide` where an
   instance exists, one attempt at the negation) and critique the
   formalization (missing hypotheses, `Nat` truncation, the wrong
   normal form). A refuted or suspicious statement routes to the
   statement-change handoff — never to more tactics. Wrong statements,
   not weak tactics, are the common cause of resistant goals.

2. **Sketch.** Write the proof as a skeleton of `have` steps with
   `sorry` bodies — each `have` one self-contained mathematical step,
   ending in the goal. Verify the skeleton elaborates (structure only;
   the `sorry`s are the plan).

3. **Extract.** Lift each sorry'd `have` into a standalone lemma,
   generalized over exactly the local context it uses — prune the
   rest. Count the `have`s against the extracted lemmas; verify each
   statement elaborates on its own.

4. **Solve independently, cheapest first.** Per lemma, run the
   deterministic ladder BEFORE any model reasoning: `rfl`; `decide`
   where decidable and small; the house simp sets; `omega`;
   `exact?`/`apply?`. Only then the budgeted loop. A lemma that
   resists recurses into its own decomposition, to a declared depth
   (default 3).

5. **Reassemble.** Replace each `sorry` with the lemma applied at its
   call site; verify the whole. Once every lemma is proved, the target
   is proved by construction.

## Standing triggers

- **The length trigger.** A proof body past ~30 lines is a
  decomposition signal, not a grinding license — a long proof means
  the sketch is missing a lemma.
- **Retrieval before generation.** Query the estate's own surface
  ledger first (`library/cas/meta/out/surface.META.json` — every public
  declaration with signature and module, `jq`-queryable), then the
  toolchain sources. Retrieval raises the success rate while cutting
  spend; never generate a lemma the corpus already holds.
- **Spend the strong model on statements and sketches.** Statement
  design and sketch quality dominate tactic quality; tactic filling is
  the cheap seat. Allocate model strength accordingly in briefs and
  workflows.

Every extracted lemma remains subject to the loop's own law: frozen
statements, the axiom policy, no holes surviving completion.
