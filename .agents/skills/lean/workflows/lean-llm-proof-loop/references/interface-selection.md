# Interface selection

| Interface                 | Use when                                                | Limits                                                    |
| ------------------------- | ------------------------------------------------------- | --------------------------------------------------------- |
| Editor/LSP + scratch file | ordinary interactive work                               | incremental state needs a fresh final gate                |
| LeanInteract              | snippets, parallel candidates, tactic-state experiments | extra service dependency; tactic mode may be experimental |
| Pantograph                | branching/backtracking and proof-search research        | machine interface differs from LSP; isolate processes     |
| LeanDojo                  | tracing, premise retrieval, training/evaluation         | heavy stack; supported repositories/toolchains matter     |
| Lean Copilot              | human-facing tactic/premise suggestion                  | learned suggestion still requires checking                |

Pantograph separates presentation, search, and kernel views
([rationale](https://github.com/leanprover/Pantograph/blob/d704b851542b1d2caf1287f65c49f5011f687c05/doc/rationale.md)).
LeanDojo demonstrates exact-project premise retrieval
([paper](https://arxiv.org/abs/2306.15626)).

Prefer the narrowest installed interface. Do not add a training stack for an ordinary proof.
