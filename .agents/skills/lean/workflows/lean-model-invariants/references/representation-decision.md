# Representation decision

| Mechanism                             | Best fit                                                   | Required questions                                                         |
| ------------------------------------- | ---------------------------------------------------------- | -------------------------------------------------------------------------- |
| Plain data + `P x`                    | editable/raw ASTs, loop/global facts, multiple judgments   | Where is proof required or reconstructed?                                  |
| Subtype/proof field                   | stable local fact needed by most trusted consumers         | Can every constructor/mutator discharge it cheaply?                        |
| Private constructor + checked factory | API construction authority with executable validation      | Is encapsulation complete, and what proposition is actually stored/proved? |
| Indexed family                        | local grammar/result/phase changes legal constructors      | Are dependent matching/transports and dynamic packaging affordable?        |
| `Sigma`/ordinary witness              | runtime or serialization needs the dependent value         | What is its canonical representation and equality?                         |
| Raw + `WF`                            | recursive/optimized internals and temporary invalid states | Which operations preserve `WF`; where is bundling required?                |
| Quotient                              | representation differences should be unobservable          | Can every eliminator respect the relation?                                 |
| Canonical form + normalizer           | stable bytes, hashes, code generation                      | Are soundness, uniqueness/idempotence, and cost acceptable?                |
| Runtime validator                     | JSON/FFI/user input or volatile policy                     | Is success sound, failure diagnosable, and validator version explicit?     |

Lean's official examples demonstrate both raw AST + certified extrinsic checker
([`tc.lean`](https://github.com/leanprover/lean4/blob/e9c0364b5bb39bf23b1a7279d4d4be29b992f368/doc/examples/tc.lean))
and intrinsically typed expressions
([`interp.lean`](https://github.com/leanprover/lean4/blob/e9c0364b5bb39bf23b1a7279d4d4be29b992f368/doc/examples/interp.lean)).

Index only when an index changes available constructors, result types, or legal next operations.
Keep time, permissions, remote state, freshness, changing policy, liveness, and contested meaning
extrinsic or trace-based.
