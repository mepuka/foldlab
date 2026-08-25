# fips202

SHA3-512 from [NIST FIPS 202](https://nvlpubs.nist.gov/nistpubs/FIPS/NIST.FIPS.202.pdf) in
Lean 4: a bit-level transcription of the standard, an executable lane-level implementation, and a
machine-checked proof that they agree on every input.

The central theorem:

```lean
theorem sha3_512_bridge (msg : List UInt8) :
    Sha3.Impl.sha3_512 msg = Sha3.Spec.sha3_512_bytes msg
```

`Sha3.Spec` is a direct transcription of the FIPS 202 prose — state arrays as functions
`Fin 5 → Fin 5 → Fin 64 → Bool`, the five step mappings θ ρ π χ ι, `pad10*1`, the sponge, and the
B.1 byte/bit conversions, each definition cited to its section of the standard. It is written to
be *read against the standard*, not to run. `Sha3.Impl` is the executable: 25 lanes of
`BitVec 64`, a byte-level sponge at rate 72. The bridge chain proves the implementation refines
the specification step by step — lane packing, padding, absorption, permutation, squeeze — with no
gap between "what the standard says" and "what the code computes".

## What is proved

67 theorems, including:

- **Refinement**: the full bridge from `Impl.keccakF` = `Spec.keccakP` (per step mapping and per
  round) up to `sha3_512_bridge` above, plus the same pipeline result for pre-FIPS Keccak-512
  (`keccak512_prefips_bridge`).
- **Known answers in the kernel**: Keccak-f[1600] on the zero state and two NIST CAVP SHA3-512
  vectors, proved by `rfl` — the kernel itself runs the hash; no `native_decide`.
- **Structure**: `pad10*1` length and injectivity, output length, byte/bit round-trips, and the
  round-constant/rotation-offset tables proved equal to their generating definitions (LFSR walk,
  ρ walk).
- **Domain separation**: the SHA-3 `01` suffix changes the digest — `SHA3-512([]) ≠
  Keccak-512([])` at the specification level (`sha3_ne_prefips_spec`).

Four NIST CAVP vectors (message lengths 0, 24, 568, 576 bits — the rate boundary) are also
enforced as build-time `#guard`s.

## Trust statement

To believe the theorems you must trust exactly two things:

1. **The transcription**: that `Sha3/Spec.lean` says what the FIPS 202 prose says. Every
   definition carries its section citation; the pinned PDF and its digest are in
   [PROVENANCE.md](PROVENANCE.md). This is the irreducible prose-to-formal step every
   formalization has.
2. **The Lean 4 kernel**, toolchain `v4.33.1` (the post-soundness-fix release). Every theorem's
   axiom profile is printed in-file and is contained in `[propext, Classical.choice, Quot.sound]`
   — no custom axioms, no `native_decide`, no `bv_decide`, no dependencies (core only, no
   Mathlib). All modules replay clean under the toolchain's bundled external checker
   (`leanchecker`) on two architectures (x86-64 and arm64).

What is **not** claimed: injectivity of the hash (false by counting), any security property
(collision resistance, preimage resistance), and conformance beyond the sampled vectors — the
CAVP checks are evidence, never proof.

## Checking it yourself

```
lake build
lake env leanchecker Sha3.Spec Sha3.Impl Sha3.Theorems Sha3.Kats Sha3.Structural Sha3.Roundtrips Sha3.Bridge Sha3
```

A clean build elaborates every proof and runs the CAVP guards; the axiom profiles print as build
info. `leanchecker` (bundled with the toolchain) replays the compiled environment through a fresh
kernel and is silent on success.

## Files

| File | Content |
|---|---|
| `Sha3/Spec.lean` | FIPS 202 transcription (frozen; the meaning of every claim) |
| `Sha3/Impl.lean` | Executable lane-level SHA3-512 + pre-FIPS Keccak-512, CAVP guards |
| `Sha3/Bridge.lean` | The refinement: abstraction function, round bridges, sponge ladder, apex |
| `Sha3/Kats.lean` | Kernel-reduction known-answer theorems with literal statement pins |
| `Sha3/Structural.lean`, `Sha3/Roundtrips.lean`, `Sha3/Theorems.lean` | Padding, lengths, byte/bit round-trips, table correctness |
| `Sha3/KeccakProbe.lean` | The original feasibility probe (Keccak-f[1600] KAT by `rfl`) |
| `PASSA-CONTRACT.md`, `MODEL-INVARIANTS.md`, `PASSB-SNAPSHOT.md` | The contract chain: scope, carriers, and frozen theorem statements the proofs were built against |
| `PROVENANCE.md` | Source pins, tool admissions, verification record |
| `TOOLING-NOTES.md` | Gate-tooling edge cases recorded for the lab's verification-tooling work |
| `CODEX-HANDOFF.md` | The bounded proof-loop handoff under which the sponge ladder was completed |

## Relation to neighboring work

Two Lean 4 hash developments existed when this was built, and this artifact deliberately occupies
the gap between them: [kim-em/lean-crypto-hash](https://github.com/kim-em/lean-crypto-hash)
(SHA-2/SHA-3 with structural/API theorems and a strong CAVP validation harness, but no
specification layer) and emberian/dregg (a FIPS 202 specification-and-refinement architecture,
but covering SHAKE128/256 only, not the fixed SHA3 variants). The statement-pin discipline used
in the known-answer files follows dregg's method. To our knowledge this is the first Lean 4
development proving an executable implementation of SHA3-512 equal to a transcription of the
FIPS 202 specification.
