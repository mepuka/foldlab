# Pass A — domain contract for the FIPS 202 spec layer (APPROVED by operator 2026-08-24)

**Stage:** `lean-formalization-strategy` Pass A. Freezes the *question*, not the code. Proof work is
forbidden until Pass B emits the signature snapshot.
**Transcription source:** NIST FIPS 202 (August 2015), pinned local PDF
`.reference/papers/nist-2015-fips202-sha3-standard.pdf`,
sha256 `1592607831ff0908cc590632ce371c6c95e94025bb1a0c8ae90a4d0ec1ed025e`.
**Citation verification (2026-08-24):** every FIPS section reference in this contract was verified
against a liteparse markdown extraction of the pinned PDF (`liteparse parse --format markdown`;
extraction is session-scratch, regenerable). Verified verbatim: §6.1 `SHA3-512(M) =
KECCAK[1024](M || 01, 512)` with the two-bit domain-separation suffix (T10's basis; SHAKE uses
`1111`, RawSHAKE `11` — out of scope); §3.2.5 round constants via `rc(t)` LFSR, Algorithm 5 (T1's
target); §3.2.1–3.2.4 = θ/ρ/π/χ; §3.3 KECCAK-p[b,nr]; §7 names KECCAK-p[1600, 24] as the conformance
target (24 rounds); §5.1 pad10*1; §5.2 KECCAK[c]; §4 sponge; §3.1.2/§3.1.3 string↔state conversion;
**B.1 Algorithm 10: `T[8i+j] = b_ij` with `h_i = Σ b_ij·2^j` — LSB-first within each byte,
confirmed by the worked `0xA3` example** (E3's basis). Caveat: liteparse text extraction mangles the PDF's tables;
the escalation route (per the liteparse skill) is `liteparse screenshot --target-pages` + visual
read of the page image. Applied 2026-08-24: **Table 2 (Offsets of ρ, printed p. 13) read from the
page image — all 25 unreduced offsets, reduced mod 64 in the x+5y layout, match the probe's `rhov`
table exactly** (e.g. 190→62, 276→20, 210→18). T2's reference data is verified against the
standard's own table. Pass B transcription: algorithm text + worked examples + page screenshots for
tables + CAVP vectors.
**Ratified frame:** spec draft §§1–9 (D1–D7 as ratified 2026-08-24; D6 held). Dual-host clean gate
applies to every landing. Axiom allowlist: `propext`, `Quot.sound` (+ `Classical.choice` tolerated
via library lemmas, none expected while core-only). External recheck: lean4checker/lean4lean.

---

## 1. Domain contract

### Objects

- **Bit** = `Bool`. **Bit string** = `List Bool`, arbitrary finite length, FIPS bit ordering.
- **State array** — the 1600-bit Keccak state, addressed `A[x, y, z]` with `x y : Fin 5`,
  `z : Fin 64` (FIPS §3.1). Concrete carrier is representation question RQ1.
- **Byte string** = `List UInt8` (interface layer only; `ByteArray` belongs to L-FAST).

### Operations (all total, all structurally recursive — no fuel, no partiality)

- `θ, ρ, π, χ : State → State`; `ι : Nat → State → State` (round constant per index).
- `Rnd`, `keccakP` — the 24-round Keccak-p[1600, 24] permutation (FIPS §3.3).
- `pad10*1 : (x m : Nat) → List Bool` (FIPS §5.1).
- `sponge` — absorb/squeeze at rate `r = 1600 − c` (FIPS §4).
- `keccakC (c : Nat) (M : List Bool) (d : Nat) : List Bool` (FIPS §5.2).
- `SHA3_512 (M) = keccakC 1024 (M ++ [0,1]) 512` (FIPS §6.1) — parameterized so SHA3-224/256/384
  are instances, but **SHA3-512 is the claimed variant** (D1).
- `bitsOfBytes / bytesOfBits` — FIPS Appendix B.1 conversion (LSB-first within each byte).

### Observables and equivalence

The only observable is the output bit/byte string. Equality is propositional equality of outputs.
Refinement (later, against L-FAST) is extensional: `∀ input, fast input = bytesOfBits (spec (bitsOfBytes input))`.

### Scope

IN: Keccak-p[1600,24], pad10*1, sponge, SHA3 fixed variants with SHA3-512 primary, B.1 byte
conversion, NIST example-vector KATs. OUT (explicitly): SHAKE/XOF (later, dregg has it — no urgency),
Keccak-p other widths/rounds, performance, streaming API, hex display, HMAC, security properties.

### Positive examples (witnesses)

- W1: Keccak-f[1600] of the all-zero state = the XKCP known answer — **already kernel-checked on
  both hosts at lane level** (`Sha3.Probe.katFull`); the spec-level restatement must agree.
- W2: `SHA3_512("")` = `a69f73cc…` (the NIST/CAVP empty-message digest, 64 bytes).
- W3: `SHA3_512("abc")` = `b751850b…` (NIST example vector).
  (W2/W3 digests to be transcribed from the pinned CAVP/NIST files at Pass B, not from memory.)

### Forbidden example (the discriminating negative)

**Keccak-256/512 in the pre-FIPS convention (as used by Ethereum) is NOT SHA3.** The difference is
exactly the domain-separation suffix `01` appended before padding. The spec must make
`SHA3_512 M ≠ keccakC 1024 (M) 512` witnessable for some `M` (e.g. the empty string's digests
differ). A transcription that erases the suffix would satisfy every structural theorem and still be
wrong — this negative pins it.

### Edge cases

- E1: empty message (padding produces a full rate block).
- E2: message length exactly `r − 2, r − 1, r` bits (suffix+padding straddles a block boundary).
- E3: B.1 bit order — LSB-first within bytes is the classic implementation divergence; W2 fails
  loudly if it's wrong.

### Counterexamples to the strongest tempting overclaims

- C1: "the hash is injective" — false by pigeonhole (domain infinite, codomain 2^512); injectivity
  appears ONLY as padding-encoding injectivity (O2 below), never for the hash.
- C2: "the Lean spec IS FIPS 202" — not a provable statement; fidelity of transcription to the
  English/pseudocode standard is a named human-trust step, mitigated by W1–W3 + CAVP + the pinned
  PDF digest. Every project in the survey carries this same irreducible step; we state it.

### Assumptions vs facts-to-prove vs deployment facts

- **Assumptions (trusted, named):** transcription fidelity (C2); Lean kernel + the two external
  checkers; hardware.
- **Facts to prove:** the obligation ledger (§5).
- **Deployment facts (tested/monitored, never claimed as theorems):** full CAVP conformance of
  generated vectors; cross-host agreement (dual-host gate); wall-clock performance.

---

## 2. Prior-art ledger

| Source | Revision / license | Guarantee offered | Mismatch | Class |
|---|---|---|---|---|
| Lean core BitVec/Vector/List API (v4.33.1) | pinned toolchain | complete lemma base for bit ops | none | **reuse** |
| kim-em/lean-crypto-hash | clone @ 2026-08-24, Apache-2.0 | streaming-homomorphism statement pattern; validation-package layout; CAVP harness shape | no spec layer to reuse | **adapt** (patterns + possibly vendored vector files) |
| emberian/dregg Keccak subtree | clone @ 2026-08-24, AGPL-3.0 | spec architecture (bit-addressed, import-free), pin discipline (statement/axiom/routing pins), SHAKE refinement shape | license excludes code reuse; SHAKE-only | **pattern** (method, credited) |
| openvm-org/openvm-fv SHA-2/Keccak models | not yet read first-hand; license unverified | executable FIPS models, axiom-hygiene CI | correctness theorems absent | **pattern**, upgrade to adapt only after first-hand read (R0 leftover) |
| HOL4 keccakScript 3-layer development | survey-cited | bit-level spec → sptree → word64 refinement architecture; composition cheat = cautionary | wrong prover | **pattern** |
| HACL* Spec.SHA3.fst | Apache-2.0, survey-cited | ~small-spec discipline (≈8 kLOC total specs, extracted + vector-tested) | F*, not Lean | **pattern** |
| Batteries (Nat/Bitwise AC lemmas) | not yet required | AC rearrangement lemmas | dependency cost vs zero-dep | deferred — **adapt if needed**, start core-only |
| FIPS 202 PDF | pinned, sha256 above | the semantics, by definition | prose→Lean gap = C2 | primary source |

## 3. Semantic level and unresolved representation questions

Semantic level: **pure total functions over bit strings** (the "algorithm meets a functional spec"
row), with a later abstraction-relation refinement to L-FAST ("optimized representation" row).
Two-layer spec is NOT planned — one bit-addressed layer, then L-FAST directly.

- **RQ1 — state carrier:** `Fin 5 → Fin 5 → Fin 64 → Bool` (max clarity, poor KAT executability) vs
  `Vector Bool 1600` (executable, index-arithmetic lemmas needed) vs hybrid (function type + `ofFn`
  views). Decision owner: `lean-model-invariants`. Success test: W1 restated at spec level must be
  kernel-checkable in tolerable time OR explicitly discharged via the refinement to the lane-level
  probe implementation.
- **RQ2 — where B.1 lives:** conversions inside the spec module vs an interface module; KAT vectors
  are byte-level, spec is bit-level, so the conversion sits on the claim path either way.
- **RQ3 — variant parameterization:** record `(c, suffix, d)` bundle vs bare function arguments.
- **RQ4 — index arithmetic:** `Fin 5` mod-arithmetic vs `Nat` with `% 5` (probe used Nat+%; spec
  clarity may prefer Fin). Interacts with RQ1.
- **RQ5 — dependency posture:** start core-only; admit Batteries only on demonstrated lemma need
  (records a diff at Pass B if taken).

## 4. Declaration DAG (signatures only — nothing here is code yet)

```
StateArray                            (RQ1 carrier)
  ├─ theta, rho, pi, chi : StateArray → StateArray
  ├─ iota : Nat → StateArray → StateArray        (uses rcBits : Nat → Bool — LFSR, FIPS §3.2.5)
  ├─ Rnd  : StateArray → Nat → StateArray
  └─ keccakP : StateArray → StateArray           (24 rounds, foldl)
pad101 : Nat → Nat → List Bool
stateOfBits / bitsOfState : List Bool ↔ StateArray    (r-bit block loading, FIPS §3.1.2)
sponge : (r : Nat) → List Bool → (d : Nat) → List Bool
keccakC : (c : Nat) → List Bool → (d : Nat) → List Bool
SHA3_512 : List Bool → List Bool                 (+ _224/_256/_384 instances)
bitsOfBytes / bytesOfBits : List UInt8 ↔ List Bool     (FIPS B.1)
sha3_512_bytes : List UInt8 → List UInt8

theorems (statement shapes; exact forms frozen at Pass B):
  T1  rc_table_eq_lfsr    : the 24 round constants = LFSR-generated   (dregg/cryptol precedent)
  T2  rho_offsets_wf      : offset table = the §3.2.2 generated sequence
  T3  pad101_pos          : 0 < (pad101 x m).length ∧ (m + len) % x = 0
  T4  pad101_encoding_inj : m₁ ++ pad101 x |m₁| = m₂ ++ pad101 x |m₂| → m₁ = m₂
  T5  sha3_512_length     : (SHA3_512 M).length = 512
  T6  bytes_bits_roundtrip: bytesOfBits (bitsOfBytes bs) = bs   (and the length-divisible converse)
  T7  kat_keccakP_zero    : spec-level W1 (route per RQ1)
  T8  kat_sha3_512_empty  : sha3_512_bytes [] = ⟨64 literal bytes⟩   (W2, kernel-checked)
  T9  kat_sha3_512_abc    : W3, kernel-checked
  T10 sha3_ne_keccak      : SHA3_512 ≠ pre-FIPS Keccak on a witness input   (forbidden example)
  [deferred to L-FAST stage: T-REF refinement; NOT part of this contract's proof surface]
```

Statement + axiom pins (dregg-style) accompany T7–T10 from the start.

## 5. Obligation ledger

| Obligation | Kind | Falsified by | Trust boundary |
|---|---|---|---|
| T1–T6 structural theorems | prove, pure kernel | counterexample in Lean | kernel + external checkers |
| T7–T9 KATs | prove by `rfl`/`decide` | any CAVP/NIST mismatch → **transcription bug, contract reopens** | same |
| T10 negative | prove on a witness | — | same |
| Transcription fidelity | assumption (C2) | W1–W3 or CAVP divergence | human review vs pinned PDF |
| Full CAVP sweep | test (generated vectors) | any mismatch | harness, not theorem |
| Dual-host + external recheck | gate | any divergence/warning | operator's clean rule |
| Axiom profile | gate (allowlist) | any constant beyond allowlist in `#print axioms` | CI |

## 6. Handoffs

1. → `lean-model-invariants`: resolve RQ1–RQ5; deliver the carrier + the exact executable forms;
   success test = T7/T8 feasibility measurement.
2. → Pass B: elaborate exact public declarations against v4.33.1, transcribe W2/W3 digests from the
   pinned vector files (never from memory), freeze the signature snapshot, obtain operator approval.
3. → proof loop only after Pass B approval.
```
