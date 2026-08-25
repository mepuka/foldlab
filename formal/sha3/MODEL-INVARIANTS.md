# Model-invariants record — FIPS 202 spec layer (resolves RQ1–RQ5)

**Stage:** `lean-model-invariants`, entered after Pass A approval (2026-08-24).
**Decision driver:** the RQ1 feasibility measurement. Lane-level full KAT: 17 s kernel `rfl`
(both hosts, on record). Bit-level single θ application: **killed at >7 minutes** (operator stop,
2026-08-24; probe preserved at scratchpad `rq1-bitcarrier-probe.lean` — `Vector Bool 1600` carrier,
`thetaB zeroB = zeroB` by `rfl`, did not complete). ⟦REV2: the ">25×" inference is WITHDRAWN until the clean re-measurement lands (external review,
finding: the original timing is harness-confounded and must not carry a conclusion). The
architecture below stands on its own merits — maximally standard-shaped spec, kernel cost paid
once at the cheap layer — independent of the timing.⟧ **Design: spec-level kernel KATs are not
relied on; KATs live on the executable layer, and the spec connects to them by a proved
refinement bridge.**

**Measurement-confound flag (operator, 2026-08-24, post-postmortem-of-the-harness):** the >7-minute
run went through the Bash tool, later diagnosed as hanging on shell snapshotting (claude-code
issue #10181) — so the timing may measure the harness, not the kernel. The probe was RE-RUN via
PowerShell the same day; result recorded below when it lands. The architecture decision stands
regardless (operator: "continue this path for now") — the bridge design is preferable even if the
bit carrier turns out feasible, since it keeps the spec maximally standard-shaped — but the data
point must be honest. RE-RUN RESULT: the clean PowerShell re-run ran **≥40 minutes without
completing** before the harness session ended (2026-08-25); a completed timing still does not
exist. Evidence therefore: two attempts, both far beyond the 17 s lane-level budget, neither
finished. The ">25×" phrasing stays withdrawn; "bit-level kernel KATs are far outside budget"
stands as the working conclusion, re-measurable at will from the preserved probe.

## RQ1 — carriers (RESOLVED)

- **Spec carrier (`Spec.StateArray`):** `Fin 5 → Fin 5 → Fin 64 → Bool` — the standard's `A[x,y,z]`
  literally. Never executed; its virtues are transcription fidelity (step mappings read as the
  FIPS equations) and pointwise reasoning. State equality at spec level is extensional
  (`funext`; `propext`/`Quot.sound` allowlist unaffected).
- **Executable carrier (`Impl.State`):** `Vector (BitVec 64) 25` — the probe's lane
  representation, already carrying the kernel-checked permutation KAT on both hosts.
- **Abstraction function:** `abs : Impl.State → Spec.StateArray`,
  `abs s x y z = (s[x.val + 5*y.val]).getLsbD z.val` (B.1/§3.1.2-consistent lane packing).
  Direction: abstraction from executable to spec (no concretization needed).

## Boundary picture (stage's required shape)

```
bytes (List UInt8 / ByteArray)            ← wire/raw
  │ bitsOfBytes / bytesOfBits (B.1, LSB-first per Algorithm 10 — verified from pinned PDF)
bits (List Bool)                          ← spec-level messages/digests
  │ stateOfBits / bitsOfState (§3.1.2/§3.1.3)   [spec side]
  │ loadBlock / storeBlock (lane packing)        [impl side]
Spec.StateArray  ←— abs —  Impl.State     ← checked cores
```

Invalid intermediate states do not exist (all operations total on all states); no smart
constructors or validators needed — this model has **no rejected inputs**, only conversions.
The only "validation" obligations are round trips.

## RQ2 — where B.1 lives (RESOLVED)

`bitsOfBytes/bytesOfBits` are spec-side definitions (they appear in the FIPS examples and T6).
Lane packing (`loadBlock`) is impl-side. The bridge lemma ties them:
`abs (loadBlock bs) = stateOfBits (bitsOfBytes bs)` for rate-sized inputs.

## RQ3 — parameterization (RESOLVED)

`Spec.keccakC (c : Nat) (M : List Bool) (d : Nat)` general; SHA3 variants are instances applying
the `[false, true]` suffix at the call site, exactly as §6.1 writes them. No config record — four
one-line definitions.

## RQ4 — indexing (RESOLVED)

Spec: `Fin 5`/`Fin 64` (function domains make out-of-range unrepresentable; mod-arithmetic in θ/π
formulas via `Fin` ops or explicit `% 5` on `Nat` lifted through `Fin.ofNat` — exact idiom chosen
at Pass B elaboration). Impl: `Nat` + `% 5` as in the probe (already proven workable).

## RQ5 — dependencies (RESOLVED)

Core-only. No Mathlib (zero usable BitVec lemmas — evidenced), no Batteries unless a named AC-lemma
need appears during proof work; taking it later is a Pass B-recorded diff.

## Obligation consequences (re-shaping the Pass A theorem list)

- T7 (permutation KAT) — **restated**: the kernel KAT stays at impl level (exists: `katFull`).
  New spec-side content = the **bridge theorems**:
  `B1: ∀ s, abs (Impl.keccakF s) = Spec.keccakP (abs s)` — decomposed per step mapping
  (θ ρ π χ ι each get `abs (stepImpl s) = stepSpec (abs s)`), proved structurally (finite index
  case analysis / BitVec getLsbD lemmas), never by mass kernel reduction.
- T8/T9 (SHA3-512 byte KATs) — run on the impl pipeline end-to-end (lane sponge), kernel `rfl`;
  spec-level meaning follows through `B2: impl sha3_512 = bytesOfBits ∘ Spec.SHA3_512 ∘ bitsOfBytes`
  (the full-pipeline refinement, built from B1 + conversion round trips).
- T1–T6, T10 unchanged (T1/T2 are spec-side tables vs generators; T10 witnessed at impl level,
  lifted by B2).
- New obligations: `R1: bytesOfBits ∘ bitsOfBytes = id` and length-scoped converse (was T6);
  `R2: bitsOfState ∘ stateOfBits = id` on rate-sized strings; `R3` the loadBlock/abs square above.
- **Deliberately extrinsic:** performance; streaming; everything listed OUT in Pass A.

## What this buys (stage's cost test)

The expensive thing (kernel reduction) is paid exactly once, at the layer measured cheap (17 s),
and the mathematically meaningful thing (the FIPS-shaped spec) never pays it. The bridge theorems
are precisely the "optimized representation is correct" row of the routing table — structural
proofs sized for the proof loop, not computation. This also makes L-FAST's job trivial later:
Impl IS the fast layer; no third representation needed. Net: the Pass A "L-SPEC / L-FAST" pair
collapses into Spec/Impl with one bridge — one fewer layer than planned.

## Handoff

No sequencing/effects — skip `lean-algebraic-systems`. → Pass B: elaborate exact declarations for
`Spec.*`, `Impl.*` (adopting the probe's definitions into `Impl`), `abs`, conversions, and the
re-shaped obligation list; transcribe W2/W3 digests from pinned CAVP/NIST files; freeze the
signature snapshot for operator approval.
