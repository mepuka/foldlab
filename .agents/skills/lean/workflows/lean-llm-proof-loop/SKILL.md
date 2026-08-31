---
name: lean-llm-proof-loop
description: Develop or repair Lean proofs with LLM assistance against approved, frozen declarations using exact-project retrieval, incremental diagnostics, bounded search, and fresh acceptance gates. Do not use to silently change theorem statements, imports, or semantic definitions.
---

# Lean LLM Proof Loop

Treat every model-generated step as a proposal. Lean accepts proof terms; the approved statement
contract governs meaning.

## Lock the task

Record the target declaration, imports, referenced semantic definitions, expected axiom policy,
toolchain/manifest revision, and allowed edit region. Proof repair may change a proof body or add a
proved helper lemma. A theorem/import/model change requires a separately reviewed handoff containing
the old/new declarations, semantic consequence, and affected obligations. Use
`$lean-formalization-strategy` or `$lean-model-invariants` when installed.

Read [signature lock](references/signature-lock.md) for autoformalized, generated, or adversarial work.

## Select the feedback interface

- ordinary project work: editor/LSP diagnostics or targeted `lake env lean` scratch file;
- whole-snippet or parallel checking: LeanInteract when already available and compatible;
- branchable proof-search research: Pantograph;
- tracing/training/evaluation: LeanDojo or a dedicated prover stack.

Read [interface selection](references/interface-selection.md) before adding any non-project tool.
Installing, downloading models, calling remote search/models, or enabling build/code-execution tools
requires authorization.

## Iterate under a budget

1. Retrieve exact-project declarations: the surface ledger first
   (`library/cas/meta/out/surface.META.json`, `jq`-queryable), local `rg`, hover, `#check`/`#print`,
   project search, then approved remote search for recall. Never generate what the corpus holds.
2. Run the deterministic ladder before model reasoning: `rfl`, `decide` where decidable and small,
   the house simp sets, `omega`, `exact?`/`apply?`.
3. Send one goal with its local context, exact relevant declaration types, and current diagnostics.
4. Apply one definition/lemma/hole-sized change. Fix syntax, then type/elaboration, then tactic/goal,
   then linter issues. Stop adding tactics after an error.
5. Re-check immediately. Keep accepted Lean source, not the model's explanation.
6. On early failures, triage the statement before retrying the proof — counterexample hunt and
   formalization critique per [decomposition loop](references/decomposition-loop.md); a suspicious
   statement routes to the statement-change handoff, never to more tactics.
7. Bound attempts, time, tokens, candidate branches, and remote queries. A proof body past ~30 lines
   is a decomposition signal. On exhaustion, DECOMPOSE per
   [decomposition loop](references/decomposition-loop.md); only when decomposition itself exhausts,
   return the smallest failing goal and evidence instead of weakening the task.

Temporary holes may exist only in the obligation ledger while attacking another hard branch. They
never survive completion and never enter semantic definitions as a workaround.

## Accept from the saved tree

Read [acceptance and security](references/acceptance-and-security.md), select the risk tier, and run
the repository's required gate. At minimum require targeted/full build as appropriate, no residual
holes, approved axioms only, unchanged signature/import/model region, and clean diagnostics. Use a
fresh checker and sandbox/comparator for audited or adversarial submissions when supported.

Return the proof receipt: target/signature, accepted source, retrieval used, attempts/budget,
commands/results, axiom/hole status, authorized network/tools, and checks not performed. Compilation
does not establish statement faithfulness, model adequacy, or implementation conformance. Use
`$lean-assurance-review` when installed or emit the five-axis assurance handoff directly.
