# Provenance

Ratified at promotion, 2026-08-25. Open follow-ups are listed at the bottom; none is load-bearing
for the theorems in this artifact.

## Sources

| Source | Pin | Supports | Does not support |
|---|---|---|---|
| NIST FIPS 202 (Aug 2015), SHA-3 Standard | local PDF `.reference/papers/nist-2015-fips202-sha3-standard.pdf`, sha256 `1592607831ff0908cc590632ce371c6c95e94025bb1a0c8ae90a4d0ec1ed025e`; fetched 2026-08-24 from nvlpubs.nist.gov | The semantics transcribed in `Sha3/Spec.lean` (every algorithm carries its section citation); the Algorithm 10 `2m−1`→`2m` non-normative typo correction is applied | Any implementation's correctness; parameter choices outside §6 |
| NIST CAVP `SHA3_512ShortMsg.rsp` | sha256 `11d0676f4c6f10e30c5025204f4e15cd1ef6b1e34f6660d586d8ae9dfab4d721`, vendored copy in `.reference/clones/lean-crypto-hash/validation/vectors/nist/` (provenance chain: kim-em vendoring, documented in that repo's vectors README) | Witness digests for the T8/T9 known-answer theorems and the four build-time guards (Len 0/24/568/576) | Anything beyond the sampled vectors — conformance evidence, never proof |
| Zero-state Keccak-f[1600] known answer | 25-lane literal in `Sha3/KeccakProbe.lean` and `Sha3/Kats.lean`; recorded from an independent implementation probe 2026-08-24 | T7 witness | — |

## Tools

| Tool | Version pin | Role | Trust contribution |
|---|---|---|---|
| Lean toolchain | `leanprover/lean4:v4.33.1` (post-soundness-fix floor; kernel bug-hunt postmortem 2026-08-24) | Kernel of record | The trusted base, named in every claim |
| leanchecker | bundled inside the v4.33.1 toolchain (no separate install) | External fresh-kernel replay of every module; run clean (exit 0, empty output) on two hosts — Windows x86-64 and macOS arm64 | Independent replay — reduces single-run trust; the cross-architecture pair adds kernel-build and GMP-build diversity |
| elan / Lake | elan 4.2.3, Lake bundled with toolchain | Build orchestration | Empty — outcomes gated by kernel + external replay |
| PDF extraction tooling | page text + page images | Transcription reads of the pinned FIPS 202 PDF | Empty — every extracted table was verified against the page image; never load-bearing |
| LLM harnesses | coordinator + proof-loop assistants | Authored definitions and proof scripts | **Empty** — nothing an LLM produced is trusted; every claim is carried by kernel-checked proofs, replayed externally on both hosts |

## Verification record (promotion battery, 2026-08-25)

Both hosts — Windows x86-64 and macOS arm64, both `leanprover/lean4:v4.33.1`:
clean `lake build` (zero errors, zero warnings, zero sorries); 68 `#print axioms` results
identical name-for-name across hosts, every one within `[propext, Classical.choice, Quot.sound]`;
`leanchecker` replay of all modules exit 0 on both hosts.

## Open follow-ups (not load-bearing)

1. Independent re-fetch of the CAVP file from NIST + digest comparison against the vendored copy.
2. An upstream XKCP pin (repo file + commit) for the zero-state Keccak-f[1600] vector.
3. A second external checker (lean4lean) for additional replay diversity.
4. Entry of these pins into the lab-level source and tool ledgers.
