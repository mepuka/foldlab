# Verification matrix

| Risk                          | Saved-tree gate                                                                                      |
| ----------------------------- | ---------------------------------------------------------------------------------------------------- |
| Interactive prototype         | Toolchain identity, targeted build, executable examples                                              |
| Maintained library            | Full declared build, tests, linters, clean generated/manifest diff                                   |
| Proof-bearing library         | Maintained-library gate plus no-hole scan and project axiom policy                                   |
| External-code reference model | Proof-bearing gate plus round-trip and conformance tests                                             |
| Adversarial/high assurance    | Isolation, statement/import lock, fresh checker where available, explicit axiom/unsafe/native policy |

Lean toolchains include `leanchecker`, which replays `.olean` results through the kernel. It adds
assurance but does not validate the theorem's intended meaning
([Lean build tools](https://lean-lang.org/doc/reference/latest/Build-Tools-and-Distribution/)).

Use repository commands as the source of truth. A green editor state is feedback, not a fresh gate.
