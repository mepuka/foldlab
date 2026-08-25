# SHA3 provenance and trust record

The machine-readable source identities are in
[`sha3.lock.json`](../../.reference/provenance/sha3.lock.json). This record states how they enter
the claim surface and records the proof-tool executions used for promotion.

## Evidence pins

| Source | Selected identity | Permitted role |
| --- | --- | --- |
| NIST FIPS 202 | DOI `10.6028/NIST.FIPS.202`; local PDF SHA-256 `1592607831ff0908cc590632ce371c6c95e94025bb1a0c8ae90a4d0ec1ed025e` | Normative algorithm and parameter definitions transcribed in `Sha3.Spec` |
| NIST byte-oriented SHA-3 vectors | Direct NIST archive SHA-256 `cd07701af2e47f5cc889d642528b4bf11f8b6eb55797c7307a96828ed8d8fc8c`; selected `SHA3_512ShortMsg.rsp` | T8/T9 literals and the four executable guards only |
| XKCP Keccak-f[1600] vector | Commit `eb5244d6b95fb1c434b211bac293093e18aa8fd1`; file blob `5d2b1bc0b68c15548e8993959ba947f051d67f9f` | T7's zero-state 25-lane witness only |

The independently downloaded NIST response file uses CRLF and one terminal blank line; the
vendored copy uses LF without that terminal line. Converting CRLF to LF and removing trailing LF
bytes gives SHA-256 `d8efb048b69a91569bd784441c067deb3a2d5ede37f1cda2dd572be22072ac2b`
for both, so their response content is identical.

The XKCP lanes following the final-round `After iota` marker are byte-for-byte the hexadecimal
lane literals used by `kat_keccakF_zero`.

## Proof tools and checks

| Tool | Pin and execution | Trust boundary |
| --- | --- | --- |
| Lean 4 | `v4.33.1`, commit `819816b2e0a3bf405af45ae5c7af2491d8f5bee6` | The Lean kernel is the G1 trust anchor. |
| elan / Lake | elan `4.2.3`; Lake `5.0.0-src+819816b` | Toolchain selection and build orchestration; no additional claim contribution. |
| `leanchecker` | Built into Lean 4.33.1; `lake env leanchecker --fresh Sha3.Bridge` exited 0 | Replays imported declarations into a fresh environment using the same kernel; detects environment manipulation but is not an independent kernel. |
| Lean4Lean | Commit `e0e3f6bcccb840cb0ea6f11c2b274ada93a12e00`, tree `99a98d498c1c111758f030e26adf3d7cd290a02e`, built against Lean 4.33.1; `Sha3.Bridge` accepted with 232 declarations | A separately implemented checker. Its own README notes shared ancestry with Lean's C++ kernel, so it narrows rather than eliminates kernel risk. |
| LLM harness | Admitted by the repository tool register | Proof search only; empty trust contribution. Kernel and checker results carry the gate. |

The local promotion gate ran on Windows x86-64. The repository CI matrix repeats the canonical
`mise run check` task on Linux, macOS, and Windows when the promotion commit is published.
