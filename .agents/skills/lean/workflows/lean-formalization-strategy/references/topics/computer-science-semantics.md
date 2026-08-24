# Computer science semantics

## Route by claim

| Claim                                    | Model                                 | Proof shape                                         |
| ---------------------------------------- | ------------------------------------- | --------------------------------------------------- |
| Parser/type checker accepts valid syntax | raw AST + judgment/checker            | soundness and, if needed, completeness              |
| Evaluator implements language meaning    | syntax + big/small-step or denotation | determinism, progress/preservation, adequacy        |
| Compiler pass preserves behavior         | source/target semantics + relation    | forward/backward simulation or refinement           |
| Algorithm meets a functional spec        | pure function/loop state + invariant  | termination, invariant preservation, result theorem |
| Optimized representation is correct      | simple model + raw/WF implementation  | abstraction relation and operation refinement       |

Lean ships instructive examples of both styles: a plain AST with an extrinsic `HasType` judgment and
certified checker ([`tc.lean`](https://github.com/leanprover/lean4/blob/e9c0364b5bb39bf23b1a7279d4d4be29b992f368/doc/examples/tc.lean)),
and a context/result-indexed expression family with a total interpreter
([`interp.lean`](https://github.com/leanprover/lean4/blob/e9c0364b5bb39bf23b1a7279d4d4be29b992f368/doc/examples/interp.lean)).

Choose extrinsic syntax when parsers, editors, migrations, or diagnostics must represent invalid
terms. Choose intrinsic syntax when local typing changes available constructors and the transport
cost is justified. A compiler directory structure is not evidence of semantic preservation; name
the observable relation and the end theorem.

## Recursion, binders, and partiality

- Prefer structural recursion when recursive calls visibly consume an inductive subterm.
- Use a named measure or well-founded relation when the algorithm decreases semantically rather than
  syntactically; include the decrease obligation in the declaration DAG.
- Model possible divergence explicitly with a step relation, fuel-indexed evaluator, partiality
  construction, or coinductive/infinite-trace semantics appropriate to the observable claim.
- Choose binder representation—names, de Bruijn indices, locally nameless, or higher-order syntax—by
  the substitution, alpha-equivalence, parsing, and code-generation obligations. Record the chosen
  equality and the weakening/substitution lemmas it creates.
- Separate functional correctness and termination from the cost model; a terminating proof does not
  establish an asymptotic or wall-clock bound.
