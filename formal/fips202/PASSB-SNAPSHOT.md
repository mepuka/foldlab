# Pass B — frozen signature snapshot (REV2 — re-approval PENDING after external review)

> **REV2 (2026-08-25), responding to the codex review (all five blockers confirmed).** The rev 1
> approval is superseded; the six theorems landed under rev 1 (T1, T2, T7, T8, T9's statement,
> T10-IMPL) are unchanged by this revision and stand. Changes below are marked ⟦REV2⟧.

## ⟦REV2⟧ Semantic diff vs Pass A (finding 1 — ratifies the T-REF promotion)

Pass A deferred refinement ("T-REF … NOT part of this contract's proof surface") on the
assumption that spec-level kernel KATs were available. The RQ1 measurement removed that
assumption, and MODEL-INVARIANTS promoted refinement (B1 chain, B2 apex) to the central proof
spine — the KATs' spec-level meaning now REQUIRES the bridge. **Old:** KATs meaningful at spec
level directly; refinement deferred. **New:** KATs live at Impl; every spec-level claim about an
executable output is transported through B1/B2. Consequence: B1/B2 are load-bearing for the
artifact's headline claim and sit inside this contract's proof surface. This diff is submitted
for ratification with this revision.

## ⟦REV2⟧ Domain-of-validity ruling (finding 2)

`Spec.pad101`, `Spec.sponge`, `Spec.keccakC` are **total extensions**: defined on all `Nat`
parameters, carrying FIPS 202 meaning only on the valid domain — `0 < x` (padding), `0 < r < 1600`
(sponge; hence `0 < c < 1600`). Outside it they are Lean-total junk values, claimed by nothing.
Every general theorem over these functions carries the validity premises (T3/T4 already do; any
future general statement must). The four SHA3 instances use only valid parameters (by
inspection: c ∈ {448, 512, 768, 1024}).

## ⟦REV2⟧ Witness ratification (finding 3)

The Pass A W3 ("abc", digest from memory) is REPLACED by the pinned CAVP Len=24 vector
`37d518` — strictly better provenance (digest transcribed from the pinned `.rsp`, never from
memory, which is what the contract's own Pass B rule demands). "abc" may be added later as an
additional witness if and when the NIST example-values file is fetched and pinned. T9 is the
theorem for the ratified witness.

## ⟦REV2⟧ T10 split (finding 4)

- **T10-IMPL** (proved, was "T10"): `Impl.keccak512_prefips [] ≠ Impl.sha3_512 []`.
- **T10-SPEC** (new obligation): `Spec.keccakC 1024 (bitsOfBytes []) 512 ≠ Spec.SHA3_512 (bitsOfBytes [])`
  — the Pass A spec-level distinction, discharged by transporting T10-IMPL through B2 and the new
  **B2′** (pre-FIPS pipeline bridge): `∀ msg, Impl.keccak512_prefips msg = Spec.bytesOfBits (Spec.keccakC 1024 (Spec.bitsOfBytes msg) 512)`.
  Priority: after B2 (B2′ reuses its entire lemma stack with a different padding lemma).

## ⟦REV2⟧ B2 decomposition (tightening — named intermediates)

- **B2a** padding correspondence: `Spec.bitsOfBytes (Impl.padBytes msg) = Spec.bitsOfBytes msg ++ [false, true] ++ Spec.pad101 576 (8 * msg.length + 2)` (byte pad = suffix + bit pad, byte-aligned inputs)
- **B2b** block loading (= R3, unchanged)
- **B2c** XOR/abstraction commutation: `abs (Vector.ofFn fun i => s[i] ^^^ t[i]) x y z = (abs s x y z ^^ abs t x y z)` (statement shape; exact form fixed at proof time within this meaning)
- **B2d** one-block absorption: `abs (Impl.absorbBlock s block) = Spec-side absorb step on (abs s)`
- **B2e** absorption-fold induction over the block list
- **B2f** squeeze/output conversion: lanes 0–7 little-endian = `bytesOfBits (Trunc 512 (bitsOfState _))`
- **B2** then composes B2a–B2f. (B2c/B2d/B2f exact statements are elaborated as the first act of
  their proof file and pinned there; their meanings are frozen here.)

## ⟦REV2⟧ Claim-domain table (tightening)

| Claim | Domain |
|---|---|
| Spec definitions | arbitrary finite bit strings (valid parameters per the domain ruling) |
| B2 / B2′ and all KATs | **byte-aligned messages only** |
| Implementation-conformance target | **SHA3-512 only** |
| SHA3-224/256/384 | definitions with valid parameters; NO KAT or refinement coverage claimed in v1 |

Pass A's `List Bool ↔ StateArray` and `List UInt8 ↔ List Bool` arrows are noted as loose: the
precise claims are exactly T6a, T6b, R2 (`bitsOfState ∘ stateOfBits = id` on 1600-bit strings —
frozen: `∀ (S : List Bool), S.length = 1600 → Spec.bitsOfState (Spec.stateOfBits S) = S`), and R3.
No unrestricted bijection is claimed anywhere.

## ⟦REV2⟧ Provenance note

FIPS 202 Algorithm 10 carries the known non-normative `2m−1` index typo in Step 1 (should be
`2m`); the transcription applies the correction (range-based indexing is unaffected). Source-lock
and tool-admission drafts for the FIPS PDF, CAVP corpus, XKCP vector, liteparse, lean4checker,
lean4lean are in `PROVENANCE-DRAFT.md` — required before promotion, not before staged proof work.

**Stage:** `lean-formalization-strategy` Pass B. On approval, proof work may begin; until then no
proof body may be written. Statements below are FROZEN — any change routes back through Pass A/B
with a semantic diff.

## Environment (exact)

- Toolchain: `leanprover/lean4:v4.33.1` (post-soundness-fix floor). Zero dependencies
  (`lake-manifest.json` packages = []). Imports: core only.
- Modules: `Sha3.Spec` (bit-addressed FIPS 202 transcription, non-executable by design),
  `Sha3.Impl` (lane-level executable, CAVP-guarded), `Sha3.KeccakProbe` (standing KAT gate).
- Options allowed in proof/KAT files: `maxRecDepth`, `maxHeartbeats`. Everything else default.
- **Axiom allowlist (gate):** `propext`, `Quot.sound`; `Classical.choice` tolerated if imported
  lemmas carry it. Anything else — including any `._native.*` constant and `sorryAx` — fails the
  gate. External recheck (lean4checker/lean4lean) + dual-host (PC + Mac) required per landing.

## Semantic definitions of record

`Sha3/Spec.lean` (per-definition FIPS section citations inline; source = pinned FIPS 202 PDF,
sha256 `15926078…ed025e`) and `Sha3/Impl.lean` (lane carrier; CAVP vectors from
`SHA3_512ShortMsg.rsp`, file sha256 `11d0676f…4d721`, Len ∈ {0, 24, 568, 576} enforced by
build-time `#guard`). Bridge abstraction (to be defined in `Sha3/Bridge.lean`, definition frozen
here):

```lean
def abs (s : Impl.St) : Spec.StateArray := fun x y z =>
  (s[x.val + 5 * y.val]!).getLsbD z.val
```

## Frozen obligations (statements exact; proofs forbidden until approval)

Structural, pure kernel:

- **T1** `∀ (i : Fin 24) (z : Fin 64), Impl.rcv[i].getLsbD z.val = Spec.rcBit i.val z`
- **T2** `∀ (x y : Fin 5), Impl.rhov[x.val + 5 * y.val]! = Spec.rhoOffset x y % 64`
- **T3** `∀ (x m : Nat), 0 < x → 0 < (Spec.pad101 x m).length ∧ (m + (Spec.pad101 x m).length) % x = 0`
- **T4** `∀ (x : Nat) (m₁ m₂ : List Bool), 0 < x → m₁ ++ Spec.pad101 x m₁.length = m₂ ++ Spec.pad101 x m₂.length → m₁ = m₂`
- **T5** `∀ (M : List Bool), (Spec.SHA3_512 M).length = 512`
- **T6a** `∀ (bs : List UInt8), Spec.bytesOfBits (Spec.bitsOfBytes bs) = bs`
- **T6b** `∀ (bits : List Bool), bits.length % 8 = 0 → Spec.bitsOfBytes (Spec.bytesOfBits bits) = bits`

Bridge (the refinement spine; structural proofs, never mass reduction):

- **B1θ** `∀ s, abs (Impl.theta s) = Spec.theta (abs s)`
- **B1ρπ** `∀ s, abs (Impl.rhoPi s) = Spec.pi (Spec.rho (abs s))` (Impl fuses ρ and π)
- **B1χ** `∀ s, abs (Impl.chi s) = Spec.chi (abs s)`
- **B1ι** `∀ (s) (i : Fin 24), abs (Impl.rnd s i.val) = Spec.Rnd (abs s) i.val` (uses T1)
- **B1** `∀ s, abs (Impl.keccakF s) = Spec.keccakP (abs s)`
- **R3** `∀ (bs : List UInt8) (x y : Fin 5) (z : Fin 64), (Impl.laneOfBytes bs (x.val + 5 * y.val)).getLsbD z.val = (Spec.bitsOfBytes bs).getD (64 * (5 * y.val + x.val) + z.val) false`
- **B2** `∀ (msg : List UInt8), Impl.sha3_512 msg = Spec.sha3_512_bytes msg` (the apex; subsumes
  the byte-padding correspondence)

Kernel KATs (`rfl`/`decide`; Impl side only, per the ratified architecture):

- **T7** `Impl.keccakF (Vector.replicate 25 0) = ⟨the 25-lane XKCP literal already pinned in Sha3.Probe.katFull⟩`
- **T8** `Impl.sha3_512 [] = ⟨the 64-byte CAVP Len=0 digest, as a byte-list literal⟩`
- **T9** `Impl.sha3_512 [0x37, 0xd5, 0x18] = ⟨the CAVP Len=24 digest literal⟩`

Negative (the discriminating example; Impl-level, kernel-decidable):

- **T10** with `Impl.keccak512_prefips` := `Impl.sha3_512` with the pre-FIPS padding first byte
  `0x01` in place of `0x06` (definition to be added to `Sha3/Impl.lean` verbatim-parallel):
  `Impl.keccak512_prefips [] ≠ Impl.sha3_512 []` — the domain-separation suffix is load-bearing.

Every T7–T10 gets a dregg-style literal statement pin beside it.

## Witnesses and counterexamples retained

W1 zero-state permutation (kernel-checked, both hosts); W2/W3 CAVP Len 0/24 (+ boundary 568/576
as build guards); forbidden example = T10; overclaim counterexamples C1 (hash injectivity — never
stated) and C2 (transcription fidelity — assumption, §Trust).

## Approved edit regions for the proof loop

- NEW files only: `Sha3/Bridge.lean` (abs + B1*/R3/B2 + helper lemmas), `Sha3/Theorems.lean`
  (T1–T6), `Sha3/Kats.lean` (T7–T10 + pins).
- `Sha3/Impl.lean`: the single addition of `keccak512_prefips` (T10's subject); no other edits.
- `Sha3/Spec.lean`: NO edits. A needed semantic change reopens Pass A.
- Proof-loop discipline per `$lean-llm-proof-loop`; assurance review per `$lean-assurance-review`
  before any promotion out of `.staging`.

## Deliberately out (unchanged from contract)

SHAKE/XOF, other-variant KATs beyond the four vectors, full CAVP sweep (deployment test harness,
not theorems), performance claims, security claims, streaming API.

## Approval

Operator approval: ____ (pending). On approval: proof loop begins with T1/T2/T3/T5 (expected
easy), then T6/R3, then B1 chain, then B2, with T7–T10 landable at any point.
