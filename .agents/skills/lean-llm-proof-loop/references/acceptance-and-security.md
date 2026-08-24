# Acceptance and security

| Tier        | Gate                                                                                       |
| ----------- | ------------------------------------------------------------------------------------------ |
| Interactive | immediate diagnostics and targeted saved-file elaboration                                  |
| Project     | build/tests/linters, no holes, signature/import comparison                                 |
| Audited     | project gate plus axiom/option/unsafe inventory and fresh checker when available           |
| Adversarial | audited gate in isolation plus statement/constant comparison and bounded resources/network |

Scan per policy for `sorry`, `admit`, `sorryAx`, unapproved `axiom`, `debug.skipKernelTC`,
unsafe/extern/native seams, and unexpected imports. `decide`, `native_decide`, `bv_decide`, and
external certificate replay have different trust profiles; record the actual mechanism.

Lean elaboration and build scripts can execute code. Run untrusted generated Lean only in an
authorized sandbox with bounded filesystem, process, network, memory, and time access. A fresh
checker strengthens proof acceptance but checks the elaborated theorem, not its intended meaning
([proof validation](https://lean-lang.org/doc/reference/latest/ValidatingProofs/)).
