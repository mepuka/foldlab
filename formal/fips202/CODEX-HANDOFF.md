# CODEX HANDOFF — complete the sponge ladder of the SHA3 artifact

**Role:** you are executing a bounded proof loop against FROZEN statements. The coordinator (Fable)
owns the contract; the operator owns rulings. You grind proofs. Nothing else.

## Read first, in this order

1. Repo root `AGENTS.md` and the estate skill (`.agents/skills/estate`) — the estate discipline
   binds this work even though `.staging/` is pre-grade.
2. `PASSA-CONTRACT.md` (approved), `MODEL-INVARIANTS.md`, `PASSB-SNAPSHOT.md` (**REV2, ratified**)
   — the contract chain. The snapshot's frozen statements are law.
3. `Sha3/Spec.lean`, `Sha3/Impl.lean`, `Sha3/Bridge.lean` — the code. Spec/Impl definitions are
   FROZEN (any needed semantic change = STOP and report; never edit them). Bridge.lean is your
   only edit region.

## State on handoff (2026-08-25)

18 theorems proved, PC+Mac dual-host green, zero warnings, zero sorries. Highlights: T1–T6
structural + roundtrips (Theorems/Structural/Roundtrips.lean), kernel KATs T7–T9 + T10-IMPL
(Kats.lean), and the complete **B1 chain** in Bridge.lean: `chi_bridge`, `theta_bridge`,
`rhoPi_bridge`, `iota_bridge`, `rnd_bridge`, `keccakF_bridge` — all
`[propext, Classical.choice, Quot.sound]`.

## Your targets (meanings frozen in PASSB-SNAPSHOT.md §REV2; elaborate exact forms as the first
act of proof work and keep them faithful)

1. **R3** — lane packing:
   `∀ (bs : List UInt8) (x y : Fin 5) (z : Fin 64), (Impl.laneOfBytes bs (x.val + 5 * y.val)).getLsbD z.val = (Spec.bitsOfBytes bs).getD (64 * (5 * y.val + x.val) + z.val) false`
2. **B2a** padding correspondence (byte pad = `01` suffix + bit pad, byte-aligned inputs)
3. **B2c** XOR/abstraction commutation, **B2d** one-block absorption, **B2e** absorption-fold
   induction, **B2f** squeeze/output conversion
4. **B2 (apex)** — `∀ (msg : List UInt8), Impl.sha3_512 msg = Spec.sha3_512_bytes msg`
5. **B2′** — same pipeline statement for `Impl.keccak512_prefips` vs
   `Spec.keccakC 1024 · 512` (no suffix)
6. **T10-SPEC** — `Spec.keccakC 1024 (Spec.bitsOfBytes []) 512 ≠ Spec.SHA3_512 (Spec.bitsOfBytes [])`,
   discharged by transporting T10-IMPL through B2 + B2′.

## R3 attack plan (already designed; a reverted draft existed — reconstruct from this)

Decompose: **Lemma A** `getLsbD_laneOfBytes`: bit `z` of a packed lane = bit `z % 8` of byte
`z / 8`; prove by `rfl`-unrolling `laneOfBytes` to its literal 8-term OR chain
(`(((0 ||| b₀<<<0) ||| b₁<<<8) ||| … ||| b₇<<<56` — this IS definitional, `from rfl` works), then
distribute `BitVec.getLsbD_or`/`getLsbD_shiftLeft`/`getLsbD_ofNat`, and do the 8-window case
analysis: in window `8k ≤ z < 8(k+1)`, lower terms die by `Nat.testBit` false above `2^8`
(`(bs.getD _ 0).toNat < 256` via `UInt8.toNat_lt`), higher terms die on the shift guard. You will
need a local `Nat.testBit b j = ((b >>> j) &&& 1 == 1)` alignment lemma (prove via
`simp [Nat.testBit]`, iterate on the exact core definition). **Lemma B**: flatMap indexing —
`(bs.flatMap Spec.bitsOfByte).getD (8*K + j) false = (Spec.bitsOfByte (bs.getD K 0)).getD j false`
for `j < 8`, by induction on `bs` with `K` case split (out-of-range: both sides false since
`bitsOfByte 0` bits are all false — check that, it matters). R3 = A + B + `omega` index arithmetic
(`64i + z = 8*(8i + z/8) + z%8`). Both lemmas are REUSED by B2f.

## House proof-engineering knowledge (hard-won; trust it)

- Toolchain v4.33.1, core only. NO Mathlib, NO Batteries. `set`, `not_and_or`, `interval_cases`
  do not exist here. `List.mem_cons_self` takes implicit args.
- Bare `simp` EXPLODES on `List.replicate <big literal>` — always targeted `simp only` near
  sponge/state terms.
- Dependent-index rewrites under checked `getElem` fail with `rw` (motive errors): use
  `simp only [eq]` (congr-capable) or enter shapes via `show`/`from rfl` (definitional).
- `getElem!` → checked `getElem`: use the typed helpers `vget` (Vector _ 25) / `vget24`
  (Vector _ 24) in Bridge.lean; add `vgetN`-style helpers with pinned container types as needed —
  bare `getElem!_pos` underscores lose the instance.
- Known-good core names: `List.take_left`, `List.drop_append`, `List.take_append_drop`,
  `List.getD_eq_getElem?_getD`, `List.getElem?_eq_getElem`, `Option.getD_some`,
  `List.getElem_append_left/right`, `List.getElem_replicate`, `Vector.getElem_ofFn`,
  `Vector.getElem_set_self`, `Vector.getElem_set_ne`, `BitVec.getLsbD_xor/and/not/or/shiftLeft/rotateLeft/ofNat`,
  `Nat.mod_add_div`, `Nat.mul_mod_right`, `decide_eq_true`.
- `omega` knows Fin bounds, `min`, and literal-divisor div/mod. It does NOT distribute variable
  products — hand it `x*(q+1) = x*q + x` as a `have`.
- Recursive theorems with `termination_by <measure>` + `decreasing_by simp only [...]; omega`
  work fine (see `bits_bytes_roundtrip`).
- Iterate with: `lake env lean Sha3\Bridge.lean` piped to a FULL log file, then grep
  `"error|axioms|warning"` — exit codes and truncated output both lie. One bounded fix per round;
  after an error, stop adding tactics and re-check.

## Gates (non-negotiable)

- Statements frozen. If a target seems false or needs reshaping: STOP, record the smallest failing
  goal and the evidence, report back. NEVER weaken, generalize, or "fix" a statement.
- Axiom allowlist per theorem: `propext`, `Quot.sound`, `Classical.choice`. `#print axioms` for
  every new theorem at file bottom. `native_decide` and `bv_decide` are BANNED. No `sorry` may
  survive in the tree — if you park a branch, park it in your report, not the file.
- Zero warnings (unused simp args included — drop all flagged args at once).
- Edit region: `Sha3/Bridge.lean` ONLY. Do not touch git. Do not touch other files. Do not
  reorganize.
- Completion criterion: `lake build` green on this machine with all new axiom prints clean. The
  coordinator runs the Mac dual-host gate and external checkers after you report.

## Report format

Proved: name → axiom profile → rounds used. Not proved: smallest failing goal verbatim + what you
tried + your diagnosis. Any discovered issue with a frozen statement: exact statement + concrete
evidence. Nothing else.
