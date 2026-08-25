# SHA3-512 formal model and refinement

This directory is a formal verification artifact promoted by a declared lift from
`.staging/sha3`. Its artifact kind is **model**; the named Lean declarations below are artifacts
of kind **theorem**. Its canonical identity is the Git tree at `formal/sha3` in the promotion
commit.

The highest satisfied claim gate is [G1 Model](../../docs/effect-typescript-semantics/CLAIM-GATES.md):
the listed statements are accepted by the pinned Lean kernel with axiom profiles contained in
`propext`, `Quot.sound`, and `Classical.choice`. This does not claim that the Lean transcription
has been mechanically extracted from FIPS 202, and it makes no security, performance,
constant-time, or implementation-deployment claim.

## Claim surface

The contract and frozen declarations are recorded in [PASSA-CONTRACT.md](PASSA-CONTRACT.md),
[MODEL-INVARIANTS.md](MODEL-INVARIANTS.md), and [PASSB-SNAPSHOT.md](PASSB-SNAPSHOT.md).

| Claim family | Lean declarations | Scope |
| --- | --- | --- |
| T1–T6 and R2 | `rcv_eq_lfsr`, `rhov_eq_walk`, `pad101_length`, `pad101_encoding_inj`, `length_SHA3_512`, `bytes_bits_roundtrip`, `bits_bytes_roundtrip`, `bits_state_roundtrip` | Structural properties and length-scoped representation round trips |
| B1 | `chi_bridge`, `theta_bridge`, `rhoPi_bridge`, `iota_bridge`, `rnd_bridge`, `keccakF_bridge` | The lane implementation's Keccak-f permutation maps to the bit-addressed model under `abs` |
| R3 and B2 | `laneOfBytes_bridge`, `padBytes_bridge`, `xor_abs_bridge`, `absorbBlock_bridge`, `absorbBlocks_bridge`, `squeeze_bridge`, `sha3_512_bridge` | Byte-aligned SHA3-512 messages only |
| B2′ and T10-SPEC | `keccak512_prefips_bridge`, `sha3_ne_prefips_spec` | Pre-FIPS padding bridge and the empty-message domain-separation distinction |
| T7–T10-IMPL | `kat_keccakF_zero`, `kat_sha3_512_empty`, `kat_sha3_512_37d518`, `sha3_ne_prefips` | Kernel-evaluated witnesses and the implementation-level negative example |

The central refinement judgment is
[`Sha3.Bridge.sha3_512_bridge`](Sha3/Bridge.lean): for every byte-list message,
`Sha3.Impl.sha3_512 msg = Sha3.Spec.sha3_512_bytes msg`. SHA3-224, SHA3-256, SHA3-384,
SHAKE/XOF, streaming, and arbitrary bit-oriented implementation inputs remain outside the
refinement claim.

## Promotion transformation

The lift retained the Lake package, Lean sources, ratified contracts, and evidence records. It
excluded `.lake/` products, the proof-operator handoff, and the staging-only nested workflow.
Those exclusions are process or generated material, not inputs to any theorem.

## Reproduction

From this directory:

```text
lake --wfail build
lake env leanchecker --fresh Sha3.Bridge
```

From the repository root, `mise run check` runs the canonical generation, clean-tree, build, and
fresh replay gates. The CI matrix repeats it on Linux, macOS, and Windows. See
[ASSURANCE.md](ASSURANCE.md) for the completed local checks and [PROVENANCE.md](PROVENANCE.md)
for source and tool pins.
