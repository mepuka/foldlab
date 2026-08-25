# SHA3 promotion assurance review

Review date: 2026-08-24

Claim gate: [G1 Model](../../docs/effect-typescript-semantics/CLAIM-GATES.md)

Toolchain: Lean 4.33.1, core only, zero Lake dependencies

## Verdict

The artifact is eligible for G1. Its public claims are kernel-checked statements about the
project-owned `Sha3.Spec` and `Sha3.Impl` definitions. The central bridge is
`Sha3.Bridge.sha3_512_bridge`; its domain is byte-list messages and its observable is the
64-byte SHA3-512 result. No extraction, compiler, hosted-execution, security, timing, or general
bit-message claim is promoted.

The lift changed no `Sha3.Spec` or `Sha3.Impl` bytes. The ratified Pass B statements were kept
fixed during the bounded proof loop; the added declarations supply proofs and local helper
lemmas in `Sha3.Bridge`.

## Gate results

| Gate | Result |
| --- | --- |
| Project build | `lake --wfail build` exits 0 with no warnings. |
| Placeholder and shortcut scan | No `sorry`, `native_decide`, or `bv_decide` token occurs in a Lean source. |
| Axiom reports | Every promoted claim has a `#print axioms` command. Profiles are subsets of `propext`, `Quot.sound`, and `Classical.choice`; no `sorryAx` or native axiom occurs. |
| Fresh environment replay | Lean 4.33.1 `leanchecker --fresh Sha3.Bridge` exits 0. |
| Separate checker | Lean4Lean at commit `e0e3f6bcccb840cb0ea6f11c2b274ada93a12e00`, built with Lean 4.33.1, accepts all 232 declarations in `Sha3.Bridge`. |
| Evidence identity | The FIPS PDF is present in the paper lock; the CAVP response content was independently re-fetched from NIST; the T7 lanes were matched to a pinned XKCP commit. |
| Reproducibility | `.lake` is excluded; the Lake manifest has zero packages; root `mise run check` owns the build and fresh replay. |

## Axiom profiles of the refinement spine

| Declarations | Axiom profile |
| --- | --- |
| `laneOfBytes_bridge`, `padBytes_bridge`, `iota_bridge` | `[propext, Quot.sound]` |
| `chi_bridge`, `theta_bridge`, `rhoPi_bridge`, `rnd_bridge`, `keccakF_bridge` | `[propext, Classical.choice, Quot.sound]` |
| `xor_abs_bridge`, `absorbBlock_bridge`, `absorbBlocks_bridge`, `squeeze_bridge` | `[propext, Classical.choice, Quot.sound]` |
| `sha3_512_bridge`, `keccak512_prefips_bridge`, `sha3_ne_prefips_spec` | `[propext, Classical.choice, Quot.sound]` |

T7–T10-IMPL use `[propext, Quot.sound]`. The structural and round-trip theorem modules print
their promoted theorem profiles at their file bottoms.

## Trust boundary and residual limits

Lean's kernel acceptance establishes the G1 statements for these definitions. The transcription
from FIPS 202 remains a named human semantic step, mitigated by the structural results, pinned
known-answer witnesses, negative domain-separation example, and implementation-to-specification
bridge. Those mitigations do not promote the artifact to G2 extraction or implementation
conformance, and they do not establish a cryptographic security property.
