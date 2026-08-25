import Sha3.Spec
import Sha3.Impl
import Sha3.Theorems
import Sha3.Roundtrips
import Sha3.Structural
import Sha3.Kats

/-!
# The bridge: `abs`, the B1 round chain, and the B2 sponge ladder (REV2 frozen statements)

`abs` maps the executable lane state to the specification state array. The B1 lemmas prove each
Impl round step commutes with its Spec counterpart through `abs`; the B2 ladder extends the
refinement through lane packing, padding, absorption, and squeeze to the byte-level pipeline,
closing at `sha3_512_bridge`, `keccak512_prefips_bridge`, and `sha3_ne_prefips_spec`. Structural
proofs only — no mass kernel reduction. Axiom ceiling per theorem:
`[propext, Classical.choice, Quot.sound]`.
-/

namespace Sha3.Bridge

/-- The abstraction function (frozen in the Pass B snapshot): bit `z` of lane `(x, y)`,
lane index `x + 5y` (§3.1.2 packing), LSB-first within lanes (B.1). -/
def abs (s : Sha3.Impl.St) : Sha3.Spec.StateArray := fun x y z =>
  (s[x.val + 5 * y.val]!).getLsbD z.val

/-- Checked-access form of lane lookup (instance-pinning helper). -/
private theorem vget (v : Sha3.Impl.St) (i : Nat) (h : i < 25) : v[i]! = v[i] :=
  getElem!_pos v i h

/-- B1χ: the χ step commutes with abstraction. -/
theorem chi_bridge (s : Sha3.Impl.St) :
    abs (Sha3.Impl.chi s) = Sha3.Spec.chi (abs s) := by
  funext x y z
  have hb : x.val + 5 * y.val < 25 := by omega
  unfold abs Sha3.Spec.chi Sha3.Impl.chi Sha3.Impl.at5
  simp only []
  rw [vget _ _ hb, Vector.getElem_ofFn]
  simp only []
  have hx : (x.val + 5 * y.val) % 5 = x.val := by omega
  have hy : (x.val + 5 * y.val) / 5 = y.val := by omega
  rw [hx, hy]
  rw [vget _ _ (by omega), vget _ _ (by omega), vget _ _ (by omega),
      vget _ _ (by omega), vget _ _ (by omega), vget _ _ (by omega)]
  have h2 : ((2 : Fin 5) : Nat) = 2 := rfl
  simp only [BitVec.getLsbD_xor, BitVec.getLsbD_and, BitVec.getLsbD_not,
    decide_eq_true z.isLt, Bool.true_and, Fin.val_add, Fin.val_one, h2,
    Nat.mod_eq_of_lt x.isLt, Nat.mod_eq_of_lt y.isLt]

#print axioms chi_bridge

/-- B1θ: the θ step commutes with abstraction. -/
theorem theta_bridge (s : Sha3.Impl.St) :
    abs (Sha3.Impl.theta s) = Sha3.Spec.theta (abs s) := by
  funext x y z
  have hb : x.val + 5 * y.val < 25 := by omega
  unfold abs Sha3.Spec.theta Sha3.Spec.col Sha3.Spec.zsub Sha3.Impl.theta Sha3.Impl.at5
  simp only []
  rw [vget _ _ hb, Vector.getElem_ofFn]
  simp only []
  have hx : (x.val + 5 * y.val) % 5 = x.val := by omega
  rw [hx]
  repeat rw [vget _ _ (by omega)]
  simp only [BitVec.getLsbD_xor, BitVec.getLsbD_rotateLeft, decide_eq_true z.isLt,
    Bool.true_and]
  have v0 : ((0 : Fin 5) : Nat) = 0 := rfl
  have v1 : ((1 : Fin 5) : Nat) = 1 := rfl
  have v2 : ((2 : Fin 5) : Nat) = 2 := rfl
  have v3 : ((3 : Fin 5) : Nat) = 3 := rfl
  have v4 : ((4 : Fin 5) : Nat) = 4 := rfl
  have hmm : ∀ a : Nat, a % 5 % 5 = a % 5 :=
    fun a => Nat.mod_eq_of_lt (Nat.mod_lt _ (by decide))
  by_cases hz : z.val = 0
  · simp [hz, Fin.val_add, v3, v4, hmm]
  · have hz1 : (z.val + 63) % 64 = z.val - 1 := by omega
    simp [hz, hz1, Fin.val_add, v3, v4, hmm]

#print axioms theta_bridge

/-- B1ρπ: the fused ρπ step commutes with abstraction — `abs ∘ Impl.rhoPi = Spec.pi ∘ Spec.rho ∘ abs`.
Consumes T2 (`rhov_eq_walk`) to connect the offset table to the Algorithm 2 walk. -/
theorem rhoPi_bridge (s : Sha3.Impl.St) :
    abs (Sha3.Impl.rhoPi s) = Sha3.Spec.pi (Sha3.Spec.rho (abs s)) := by
  funext x y z
  have hb : x.val + 5 * y.val < 25 := by omega
  unfold abs Sha3.Spec.pi Sha3.Spec.rho Sha3.Spec.zsub Sha3.Impl.rhoPi Sha3.Impl.at5
  simp only []
  rw [vget _ _ hb, Vector.getElem_ofFn]
  simp only []
  have hx : (x.val + 5 * y.val) % 5 = x.val := by omega
  have hy : (x.val + 5 * y.val) / 5 = y.val := by omega
  rw [hx, hy]
  -- the Impl source-x formula equals the Spec source-x (x + 3y) mod 5
  have hsrc : 3 * (y.val + 5 - 3 * x.val % 5) % 5 = (x.val + 3 * y.val) % 5 := by omega
  rw [hsrc]
  -- T2 connects the table to the walk, at source lane ((x+3y) mod 5, x)
  have ht2 := Sha3.Theorems.rhov_eq_walk (x + 3 * y) x
  have hvadd : ((x + 3 * y : Fin 5) : Nat) = (x.val + 3 * y.val) % 5 := by
    simp [Fin.val_add, Fin.val_mul]
    omega
  rw [hvadd] at ht2
  rw [ht2]
  repeat rw [vget _ _ (by omega)]
  have hr : Sha3.Spec.rhoOffset (x + 3 * y) x % 64 < 64 := Nat.mod_lt _ (by decide)
  generalize hR : Sha3.Spec.rhoOffset (x + 3 * y) x % 64 = r at *
  simp only [BitVec.getLsbD_rotateLeft, decide_eq_true z.isLt, Bool.true_and,
    Nat.mod_eq_of_lt hr]
  have hmod : (x.val + 3 * y.val) % 5 % 5 = (x.val + 3 * y.val) % 5 := by omega
  simp only [hvadd, hmod, Nat.mod_eq_of_lt x.isLt]
  by_cases hzr : z.val < r
  · have h1 : (z.val + 64 - r) % 64 = 64 - r + z.val := by omega
    simp [hzr, h1]
  · have h1 : (z.val + 64 - r) % 64 = z.val - r := by omega
    simp [hzr, h1]

#print axioms rhoPi_bridge

private theorem vget24 (v : Vector (BitVec 64) 24) (i : Nat) (h : i < 24) : v[i]! = v[i] :=
  getElem!_pos v i h

/-- B1ι: the ι step commutes with abstraction, stated in the exact shape of `Impl.rnd`'s body.
Consumes T1 (`rcv_eq_lfsr`) to connect the round-constant table to the LFSR-generated
`Spec.rcBit`. -/
theorem iota_bridge (b : Sha3.Impl.St) (i : Nat) (hi : i < 24) :
    abs (b.set 0 (b[0] ^^^ Sha3.Impl.rcv[i]!)) = Sha3.Spec.iota i (abs b) := by
  funext x y z
  unfold abs Sha3.Spec.iota
  simp only []
  by_cases h00 : x = 0 ∧ y = 0
  · obtain ⟨hx0, hy0⟩ := h00
    subst hx0 hy0
    rw [if_pos ⟨rfl, rfl⟩]
    rw [show ((0 : Fin 5) : Nat) + 5 * ((0 : Fin 5) : Nat) = 0 from rfl]
    rw [vget _ _ (by omega), Vector.getElem_set_self]
    simp only [BitVec.getLsbD_xor]
    rw [vget b 0 (by omega), vget24 _ _ hi,
        show (Sha3.Impl.rcv[i]'hi) = Sha3.Impl.rcv[(⟨i, hi⟩ : Fin 24)] from rfl,
        Sha3.Theorems.rcv_eq_lfsr ⟨i, hi⟩ z]
  · rw [if_neg h00]
    have hne : x.val + 5 * y.val ≠ 0 := by
      intro hzero
      exact h00 ⟨Fin.ext (by omega), Fin.ext (by omega)⟩
    rw [vget _ _ (by omega), vget _ _ (by omega), Vector.getElem_set_ne _ _ (by omega)]

#print axioms iota_bridge

/-- B1-rnd: one round commutes with abstraction (θ → ρπ → χ → ι composed). -/
theorem rnd_bridge (s : Sha3.Impl.St) (i : Fin 24) :
    abs (Sha3.Impl.rnd s i.val) = Sha3.Spec.Rnd (abs s) i.val := by
  unfold Sha3.Impl.rnd Sha3.Spec.Rnd
  simp only []
  rw [iota_bridge _ _ i.isLt, chi_bridge, rhoPi_bridge, theta_bridge]

#print axioms rnd_bridge

/-- B1: the full permutation commutes with abstraction —
`abs ∘ Impl.keccakF = Spec.keccakP ∘ abs`. The apex of the per-round chain. -/
theorem keccakF_bridge (s : Sha3.Impl.St) :
    abs (Sha3.Impl.keccakF s) = Sha3.Spec.keccakP (abs s) := by
  have hgen : ∀ (l : List Nat), (∀ j ∈ l, j < 24) → ∀ t : Sha3.Impl.St,
      abs (l.foldl Sha3.Impl.rnd t) = l.foldl Sha3.Spec.Rnd (abs t) := by
    intro l
    induction l with
    | nil => intro _ t; rfl
    | cons a rest ih =>
      intro h t
      rw [List.foldl_cons, List.foldl_cons,
          ih (fun j hj => h j (List.mem_cons_of_mem a hj)) (Sha3.Impl.rnd t a),
          rnd_bridge t ⟨a, h a List.mem_cons_self⟩]
  exact hgen (List.range 24) (fun j hj => List.mem_range.mp hj) s

#print axioms keccakF_bridge

private theorem testBit_eq_shift_and (b j : Nat) :
    b.testBit j = (((b >>> j) &&& 1) == 1) := by
  simp [Nat.testBit]

private theorem byte_testBit_ge_eight (b : UInt8) (j : Nat) (hj : 8 ≤ j) :
    b.toNat.testBit j = false := by
  exact Nat.testBit_lt_two_pow
    (Nat.lt_of_lt_of_le b.toNat_lt (Nat.pow_le_pow_right (by decide) hj))

/-- Bit `z` of a packed lane is bit `z % 8` of byte `z / 8`. -/
private theorem getLsbD_laneOfBytes (bs : List UInt8) (i z : Nat) (hz : z < 64) :
    (Sha3.Impl.laneOfBytes bs i).getLsbD z =
      ((((bs.getD (8 * i + z / 8) 0).toNat >>> (z % 8)) &&& 1) == 1) := by
  rw [← testBit_eq_shift_and]
  unfold Sha3.Impl.laneOfBytes
  rw [show List.range 8 = [0, 1, 2, 3, 4, 5, 6, 7] from rfl]
  simp only [List.foldl_cons, List.foldl_nil, BitVec.getLsbD_or,
    BitVec.getLsbD_shiftLeft, BitVec.getLsbD_ofNat]
  by_cases h8 : z < 8
  · have hd : z / 8 = 0 := by omega
    have hm : z % 8 = z := by omega
    have h16 : z < 16 := by omega
    have h24 : z < 24 := by omega
    have h32 : z < 32 := by omega
    have h40 : z < 40 := by omega
    have h48 : z < 48 := by omega
    have h56 : z < 56 := by omega
    simp [hz, h8, h16, h24, h32, h40, h48, h56, hd, hm]
  · by_cases h16 : z < 16
    · have hd : z / 8 = 1 := by omega
      have hm : z % 8 = z - 8 := by omega
      have h24 : z < 24 := by omega
      have h32 : z < 32 := by omega
      have h40 : z < 40 := by omega
      have h48 : z < 48 := by omega
      have h56 : z < 56 := by omega
      have hz8 : z - 8 < 64 := by omega
      have hb0 := byte_testBit_ge_eight (bs[8 * i]?.getD 0) z (by omega)
      simp [hz, h8, h16, h24, h32, h40, h48, h56, hz8, hd, hm, hb0]
    · by_cases h24 : z < 24
      · have hd : z / 8 = 2 := by omega
        have hm : z % 8 = z - 16 := by omega
        have h32 : z < 32 := by omega
        have h40 : z < 40 := by omega
        have h48 : z < 48 := by omega
        have h56 : z < 56 := by omega
        have hz16 : z - 16 < 64 := by omega
        have hb0 := byte_testBit_ge_eight (bs[8 * i]?.getD 0) z (by omega)
        have hb1 := byte_testBit_ge_eight (bs[8 * i + 1]?.getD 0) (z - 8) (by omega)
        simp [hz, h8, h16, h24, h32, h40, h48, h56, hz16, hd, hm, hb0, hb1]
      · by_cases h32 : z < 32
        · have hd : z / 8 = 3 := by omega
          have hm : z % 8 = z - 24 := by omega
          have h40 : z < 40 := by omega
          have h48 : z < 48 := by omega
          have h56 : z < 56 := by omega
          have hz24 : z - 24 < 64 := by omega
          have hb0 := byte_testBit_ge_eight (bs[8 * i]?.getD 0) z (by omega)
          have hb1 := byte_testBit_ge_eight (bs[8 * i + 1]?.getD 0) (z - 8) (by omega)
          have hb2 := byte_testBit_ge_eight (bs[8 * i + 2]?.getD 0) (z - 16) (by omega)
          simp [hz, h8, h16, h24, h32, h40, h48, h56, hz24, hd, hm, hb0, hb1, hb2]
        · by_cases h40 : z < 40
          · have hd : z / 8 = 4 := by omega
            have hm : z % 8 = z - 32 := by omega
            have h48 : z < 48 := by omega
            have h56 : z < 56 := by omega
            have hz32 : z - 32 < 64 := by omega
            have hb0 := byte_testBit_ge_eight (bs[8 * i]?.getD 0) z (by omega)
            have hb1 := byte_testBit_ge_eight (bs[8 * i + 1]?.getD 0) (z - 8) (by omega)
            have hb2 := byte_testBit_ge_eight (bs[8 * i + 2]?.getD 0) (z - 16) (by omega)
            have hb3 := byte_testBit_ge_eight (bs[8 * i + 3]?.getD 0) (z - 24) (by omega)
            simp [hz, h8, h16, h24, h32, h40, h48, h56, hz32, hd, hm,
              hb0, hb1, hb2, hb3]
          · by_cases h48 : z < 48
            · have hd : z / 8 = 5 := by omega
              have hm : z % 8 = z - 40 := by omega
              have h56 : z < 56 := by omega
              have hz40 : z - 40 < 64 := by omega
              have hb0 := byte_testBit_ge_eight (bs[8 * i]?.getD 0) z (by omega)
              have hb1 := byte_testBit_ge_eight (bs[8 * i + 1]?.getD 0) (z - 8) (by omega)
              have hb2 := byte_testBit_ge_eight (bs[8 * i + 2]?.getD 0) (z - 16) (by omega)
              have hb3 := byte_testBit_ge_eight (bs[8 * i + 3]?.getD 0) (z - 24) (by omega)
              have hb4 := byte_testBit_ge_eight (bs[8 * i + 4]?.getD 0) (z - 32) (by omega)
              simp [hz, h8, h16, h24, h32, h40, h48, h56, hz40, hd, hm,
                hb0, hb1, hb2, hb3, hb4]
            · by_cases h56 : z < 56
              · have hd : z / 8 = 6 := by omega
                have hm : z % 8 = z - 48 := by omega
                have hz48 : z - 48 < 64 := by omega
                have hb0 := byte_testBit_ge_eight (bs[8 * i]?.getD 0) z (by omega)
                have hb1 := byte_testBit_ge_eight (bs[8 * i + 1]?.getD 0) (z - 8) (by omega)
                have hb2 := byte_testBit_ge_eight (bs[8 * i + 2]?.getD 0) (z - 16) (by omega)
                have hb3 := byte_testBit_ge_eight (bs[8 * i + 3]?.getD 0) (z - 24) (by omega)
                have hb4 := byte_testBit_ge_eight (bs[8 * i + 4]?.getD 0) (z - 32) (by omega)
                have hb5 := byte_testBit_ge_eight (bs[8 * i + 5]?.getD 0) (z - 40) (by omega)
                simp [hz, h8, h16, h24, h32, h40, h48, h56, hz48, hd, hm,
                  hb0, hb1, hb2, hb3, hb4, hb5]
              · have hd : z / 8 = 7 := by omega
                have hm : z % 8 = z - 56 := by omega
                have hz56 : z - 56 < 64 := by omega
                have hb0 := byte_testBit_ge_eight (bs[8 * i]?.getD 0) z (by omega)
                have hb1 := byte_testBit_ge_eight (bs[8 * i + 1]?.getD 0) (z - 8) (by omega)
                have hb2 := byte_testBit_ge_eight (bs[8 * i + 2]?.getD 0) (z - 16) (by omega)
                have hb3 := byte_testBit_ge_eight (bs[8 * i + 3]?.getD 0) (z - 24) (by omega)
                have hb4 := byte_testBit_ge_eight (bs[8 * i + 4]?.getD 0) (z - 32) (by omega)
                have hb5 := byte_testBit_ge_eight (bs[8 * i + 5]?.getD 0) (z - 40) (by omega)
                have hb6 := byte_testBit_ge_eight (bs[8 * i + 6]?.getD 0) (z - 48) (by omega)
                simp [hz, h8, h16, h24, h32, h40, h48, h56, hz56, hd, hm,
                  hb0, hb1, hb2, hb3, hb4, hb5, hb6]

private theorem getD_append_left (as bs : List α) (i : Nat) (d : α)
    (h : i < as.length) :
    (as ++ bs).getD i d = as.getD i d := by
  simp only [List.getD_eq_getElem?_getD]
  rw [List.getElem?_append_left h]

private theorem getD_append_right (as bs : List α) (i : Nat) (d : α)
    (h : as.length ≤ i) :
    (as ++ bs).getD i d = bs.getD (i - as.length) d := by
  simp only [List.getD_eq_getElem?_getD]
  rw [List.getElem?_append_right h]

/-- Indexing a flattened byte expansion selects the corresponding byte and bit. -/
private theorem getD_bitsOfBytes (bs : List UInt8) (K j : Nat) (hj : j < 8) :
    (Sha3.Spec.bitsOfBytes bs).getD (8 * K + j) false =
      (Sha3.Spec.bitsOfByte (bs.getD K 0)).getD j false := by
  induction bs generalizing K with
  | nil =>
      simp [Sha3.Spec.bitsOfBytes, Sha3.Spec.bitsOfByte, hj]
  | cons b bs ih =>
      change (Sha3.Spec.bitsOfByte b ++ Sha3.Spec.bitsOfBytes bs).getD
        (8 * K + j) false = _
      have hlen : (Sha3.Spec.bitsOfByte b).length = 8 := by
        simp [Sha3.Spec.bitsOfByte]
      cases K with
      | zero =>
          rw [show 8 * 0 + j = j by omega]
          rw [getD_append_left _ _ _ _ (hlen ▸ hj)]
          rfl
      | succ K =>
          rw [getD_append_right _ _ _ _ (by omega)]
          rw [show 8 * (K + 1) + j - (Sha3.Spec.bitsOfByte b).length =
            8 * K + j by omega]
          exact ih K

/-- R3/B2b: implementation lane packing agrees pointwise with FIPS B.1 bit expansion. -/
theorem laneOfBytes_bridge (bs : List UInt8) (x y : Fin 5) (z : Fin 64) :
    (Sha3.Impl.laneOfBytes bs (x.val + 5 * y.val)).getLsbD z.val =
      (Sha3.Spec.bitsOfBytes bs).getD
        (64 * (5 * y.val + x.val) + z.val) false := by
  rw [getLsbD_laneOfBytes bs (x.val + 5 * y.val) z.val z.isLt]
  have hj : z.val % 8 < 8 := Nat.mod_lt _ (by decide)
  have hidx :
      64 * (5 * y.val + x.val) + z.val =
        8 * (8 * (x.val + 5 * y.val) + z.val / 8) + z.val % 8 := by
    omega
  rw [hidx, getD_bitsOfBytes bs
    (8 * (x.val + 5 * y.val) + z.val / 8) (z.val % 8) hj]
  simp [Sha3.Spec.bitsOfByte, hj]

private theorem bitsOfByte_86 :
    Sha3.Spec.bitsOfByte 0x86 =
      [false, true, true, false, false, false, false, true] := by
  decide

private theorem bitsOfByte_06 :
    Sha3.Spec.bitsOfByte 0x06 =
      [false, true, true, false, false, false, false, false] := by
  decide

private theorem bitsOfByte_00 :
    Sha3.Spec.bitsOfByte 0 = List.replicate 8 false := by
  decide

private theorem bitsOfByte_80 :
    Sha3.Spec.bitsOfByte 0x80 =
      [false, false, false, false, false, false, false, true] := by
  decide

private theorem bitsOfBytes_append (as bs : List UInt8) :
    Sha3.Spec.bitsOfBytes (as ++ bs) =
      Sha3.Spec.bitsOfBytes as ++ Sha3.Spec.bitsOfBytes bs :=
  List.flatMap_append

private theorem bitsOfBytes_replicate_zero (n : Nat) :
    Sha3.Spec.bitsOfBytes (List.replicate n 0) = List.replicate (8 * n) false := by
  induction n with
  | zero => rfl
  | succ n ih =>
      rw [show List.replicate (n + 1) (0 : UInt8) =
        0 :: List.replicate n 0 from List.replicate_succ]
      change Sha3.Spec.bitsOfByte 0 ++
        Sha3.Spec.bitsOfBytes (List.replicate n 0) = _
      rw [bitsOfByte_00, ih, List.replicate_append_replicate]
      congr 1
      omega

/-- B2a: byte padding is the `01` suffix followed by FIPS `pad10*1`. -/
theorem padBytes_bridge (msg : List UInt8) :
    Sha3.Spec.bitsOfBytes (Sha3.Impl.padBytes msg) =
      Sha3.Spec.bitsOfBytes msg ++ [false, true] ++
        Sha3.Spec.pad101 576 (8 * msg.length + 2) := by
  unfold Sha3.Impl.padBytes Sha3.Impl.rateBytes
  generalize hp : 72 - msg.length % 72 = p
  have hp1 : 1 ≤ p := by omega
  have hj :
      (576 - (8 * msg.length + 2 + 2) % 576) % 576 = 8 * p - 4 := by
    omega
  by_cases h1 : p = 1
  · rw [if_pos h1]
    unfold Sha3.Spec.pad101
    rw [hj, h1, bitsOfBytes_append]
    change Sha3.Spec.bitsOfBytes msg ++ Sha3.Spec.bitsOfByte 0x86 = _
    rw [bitsOfByte_86]
    simp [List.append_assoc]
  · rw [if_neg h1]
    unfold Sha3.Spec.pad101
    rw [hj, bitsOfBytes_append, bitsOfBytes_append]
    change Sha3.Spec.bitsOfBytes msg ++
      (Sha3.Spec.bitsOfByte 0x06 ++
        Sha3.Spec.bitsOfBytes (List.replicate (p - 2) 0)) ++
          Sha3.Spec.bitsOfByte 0x80 = _
    rw [bitsOfByte_06, bitsOfBytes_replicate_zero, bitsOfByte_80]
    simp [List.append_assoc]
    have hp2 : 2 ≤ p := by omega
    have hsub : p = (p - 2) + 2 := by omega
    change List.replicate 5 false ++
      (List.replicate (8 * (p - 2)) false ++
        (List.replicate 7 false ++ [true])) = _
    rw [← List.append_assoc, ← List.append_assoc,
      List.replicate_append_replicate, List.replicate_append_replicate]
    have harith : 5 + 8 * (p - 2) + 7 = 8 * p - 4 := by omega
    rw [harith]

/-- B2c: lane-wise XOR commutes pointwise with abstraction. -/
theorem xor_abs_bridge (s t : Sha3.Impl.St) (x y : Fin 5) (z : Fin 64) :
    abs (Vector.ofFn fun i : Fin 25 => s[i] ^^^ t[i]) x y z =
      (abs s x y z ^^ abs t x y z) := by
  have hb : x.val + 5 * y.val < 25 := by omega
  unfold abs
  rw [vget _ _ hb, Vector.getElem_ofFn, vget s _ hb, vget t _ hb,
    BitVec.getLsbD_xor]
  rfl

private theorem loadBlock_bridge (block : List UInt8) :
    abs (Vector.ofFn fun i : Fin 25 => Sha3.Impl.laneOfBytes block i.val) =
      Sha3.Spec.stateOfBits (Sha3.Spec.bitsOfBytes block) := by
  funext x y z
  have hb : x.val + 5 * y.val < 25 := by omega
  unfold abs
  rw [vget _ _ hb, Vector.getElem_ofFn]
  exact laneOfBytes_bridge block x y z

/-- B2d: one implementation absorption step is the corresponding spec-state step. -/
theorem absorbBlock_bridge (s : Sha3.Impl.St) (block : List UInt8) :
    abs (Sha3.Impl.absorbBlock s block) =
      Sha3.Spec.keccakP (fun x y z =>
        abs s x y z ^^
          Sha3.Spec.stateOfBits (Sha3.Spec.bitsOfBytes block) x y z) := by
  unfold Sha3.Impl.absorbBlock
  rw [keccakF_bridge]
  congr 1
  funext x y z
  have hb : x.val + 5 * y.val < 25 := by omega
  unfold abs Sha3.Spec.stateOfBits
  rw [vget _ _ hb, Vector.getElem_ofFn, BitVec.getLsbD_xor, vget s _ hb]
  exact congrArg (BitVec.getLsbD s[x.val + 5 * y.val] z.val ^^ ·)
    (laneOfBytes_bridge block x y z)

/-- B2e: the one-block refinement lifts through a left fold of byte blocks. -/
theorem absorbBlocks_bridge (blocks : List (List UInt8)) (s : Sha3.Impl.St) :
    abs (blocks.foldl Sha3.Impl.absorbBlock s) =
      blocks.foldl
        (fun A block => Sha3.Spec.keccakP (fun x y z =>
          A x y z ^^
            Sha3.Spec.stateOfBits (Sha3.Spec.bitsOfBytes block) x y z))
        (abs s) := by
  induction blocks generalizing s with
  | nil => rfl
  | cons block blocks ih =>
      simp only [List.foldl_cons]
      rw [ih, absorbBlock_bridge]

private theorem getD_bitsOfByte (b : UInt8) (k : Nat) (hk : k < 8) :
    (Sha3.Spec.bitsOfByte b).getD k false = b.toNat.testBit k := by
  simp [Sha3.Spec.bitsOfByte, hk, testBit_eq_shift_and]

private theorem getD_bytesOfLane (w : Sha3.Impl.W) (j : Nat) (hj : j < 8) :
    (Sha3.Impl.bytesOfLane w).getD j 0 =
      UInt8.ofNat ((w >>> (8 * j)).toNat &&& 0xFF) := by
  simp [Sha3.Impl.bytesOfLane, hj]

private theorem byteSliceBit (w : Sha3.Impl.W) (j k : Nat)
    (_hj : j < 8) (hk : k < 8) :
    (UInt8.ofNat ((w >>> (8 * j)).toNat &&& 0xFF)).toNat.testBit k =
      w.getLsbD (8 * j + k) := by
  simp [UInt8.ofNat, UInt8.toNat_and, UInt8.toNat_ofNat, Nat.testBit_and]
  rw [show 256 = 2 ^ 8 by decide, show 255 = 2 ^ 8 - 1 by decide]
  rw [Nat.testBit_mod_two_pow, Nat.testBit_two_pow_sub_one]
  simp only [hk, decide_true, Bool.true_and, Nat.testBit_shiftRight,
    BitVec.testBit_toNat, Bool.and_true]

private theorem bytesOfLane_bit (w : Sha3.Impl.W) (j k : Nat)
    (hj : j < 8) (hk : k < 8) :
    (Sha3.Spec.bitsOfByte ((Sha3.Impl.bytesOfLane w).getD j 0)).getD k false =
      w.getLsbD (8 * j + k) := by
  rw [getD_bitsOfByte _ _ hk, getD_bytesOfLane _ _ hj,
    byteSliceBit _ _ _ hj hk]

private theorem getD_flatMap_fixed (xs : List α) (f : α → List β)
    (n K j : Nat) (d : β) (hlen : ∀ a ∈ xs, (f a).length = n)
    (hK : K < xs.length) (hj : j < n) :
    (xs.flatMap f).getD (n * K + j) d = (f xs[K]).getD j d := by
  induction xs generalizing K with
  | nil => simp at hK
  | cons a xs ih =>
      cases K with
      | zero =>
          change (f a ++ xs.flatMap f).getD (n * 0 + j) d = (f a).getD j d
          rw [show n * 0 + j = j by omega]
          rw [getD_append_left _ _ _ _ (by
            rw [hlen a List.mem_cons_self]
            exact hj)]
      | succ K =>
          have hKtail : K < xs.length := by simpa using hK
          have hfa : (f a).length = n := hlen a List.mem_cons_self
          have hmul : n * (K + 1) = n * K + n := by
            rw [Nat.mul_add, Nat.mul_one]
          change (f a ++ xs.flatMap f).getD (n * (K + 1) + j) d =
            (f (xs[K]'hKtail)).getD j d
          rw [getD_append_right _ _ _ _ (by rw [hfa, hmul]; omega)]
          rw [show n * (K + 1) + j - (f a).length = n * K + j by
            rw [hfa, hmul]
            omega]
          exact ih K (fun b hb => hlen b (List.mem_cons_of_mem a hb)) hKtail

private theorem length_bytesOfLane (w : Sha3.Impl.W) :
    (Sha3.Impl.bytesOfLane w).length = 8 := by
  simp [Sha3.Impl.bytesOfLane]

private theorem length_squeezeBytes (s : Sha3.Impl.St) :
    (((List.range 8).map fun i => Sha3.Impl.bytesOfLane s[i]!).flatten).length = 64 := by
  rw [List.length_flatten]
  change ((List.range 8).map fun i => (Sha3.Impl.bytesOfLane s[i]!).length).sum = 64
  simp only [length_bytesOfLane]
  rfl

private theorem getD_squeezeBytes (s : Sha3.Impl.St) (k : Nat) (hk : k < 64) :
    (((List.range 8).map fun i => Sha3.Impl.bytesOfLane s[i]!).flatten).getD k 0 =
      (Sha3.Impl.bytesOfLane s[k / 8]!).getD (k % 8) 0 := by
  change ((List.range 8).flatMap fun i => Sha3.Impl.bytesOfLane s[i]!).getD k 0 = _
  have hidx : k = 8 * (k / 8) + k % 8 := by omega
  have hK : k / 8 < (List.range 8).length := by simp; omega
  have hj : k % 8 < 8 := Nat.mod_lt _ (by decide)
  have h := getD_flatMap_fixed (List.range 8)
    (fun i => Sha3.Impl.bytesOfLane s[i]!) 8 (k / 8) (k % 8) 0
    (by intro a ha; exact length_bytesOfLane _) hK hj
  calc
    ((List.range 8).flatMap fun i => Sha3.Impl.bytesOfLane s[i]!).getD k 0 =
        ((List.range 8).flatMap fun i => Sha3.Impl.bytesOfLane s[i]!).getD
          (8 * (k / 8) + k % 8) 0 :=
      congrArg (fun q => ((List.range 8).flatMap fun i =>
        Sha3.Impl.bytesOfLane s[i]!).getD q 0) hidx
    _ = (Sha3.Impl.bytesOfLane s[k / 8]!).getD (k % 8) 0 := by
      simpa only [List.getElem_range] using h

private theorem getD_bitsOfSqueezeBytes (s : Sha3.Impl.St) (i : Nat) (hi : i < 512) :
    (Sha3.Spec.bitsOfBytes
      (((List.range 8).map fun j => Sha3.Impl.bytesOfLane s[j]!).flatten)).getD
        i false = s[i / 64]!.getLsbD (i % 64) := by
  let out := ((List.range 8).map fun j => Sha3.Impl.bytesOfLane s[j]!).flatten
  have hk : i / 8 < 64 := by omega
  have hj : i % 8 < 8 := Nat.mod_lt _ (by decide)
  have hbyte : i / 8 % 8 < 8 := Nat.mod_lt _ (by decide)
  have hidx : i = 8 * (i / 8) + i % 8 := by omega
  calc
    (Sha3.Spec.bitsOfBytes out).getD i false =
        (Sha3.Spec.bitsOfBytes out).getD (8 * (i / 8) + i % 8) false :=
      congrArg (fun q => (Sha3.Spec.bitsOfBytes out).getD q false) hidx
    _ = (Sha3.Spec.bitsOfByte (out.getD (i / 8) 0)).getD (i % 8) false :=
      getD_bitsOfBytes out (i / 8) (i % 8) hj
    _ = (Sha3.Spec.bitsOfByte
        ((Sha3.Impl.bytesOfLane s[(i / 8) / 8]!).getD ((i / 8) % 8) 0)).getD
          (i % 8) false := by
      rw [getD_squeezeBytes s (i / 8) hk]
    _ = s[(i / 8) / 8]!.getLsbD (8 * ((i / 8) % 8) + i % 8) :=
      bytesOfLane_bit _ _ _ hbyte hj
    _ = s[i / 64]!.getLsbD (i % 64) := by
      have hlane : i / 8 / 8 = i / 64 := by omega
      have hbit : 8 * (i / 8 % 8) + i % 8 = i % 64 := by omega
      rw [hlane, hbit]

private theorem getD_take_bitsOfState (s : Sha3.Impl.St) (i : Nat) (hi : i < 512) :
    ((Sha3.Spec.bitsOfState (abs s)).take 512).getD i false =
      s[i / 64]!.getLsbD (i % 64) := by
  simp only [List.getD_eq_getElem?_getD, List.getElem?_take, if_pos hi]
  rw [List.getElem?_eq_getElem (by simp [Sha3.Spec.bitsOfState]; omega)]
  simp only [Sha3.Spec.bitsOfState, List.getElem_map, List.getElem_range]
  unfold abs
  have hlane : i / 64 < 25 := by omega
  have hxy : i / 64 % 5 + 5 * (i / 64 / 5 % 5) = i / 64 := by omega
  rw [hxy, vget _ _ hlane]
  rfl

private theorem bitsOfSqueezeBytes (s : Sha3.Impl.St) :
    Sha3.Spec.bitsOfBytes
      (((List.range 8).map fun i => Sha3.Impl.bytesOfLane s[i]!).flatten) =
      (Sha3.Spec.bitsOfState (abs s)).take 512 := by
  let out := ((List.range 8).map fun i => Sha3.Impl.bytesOfLane s[i]!).flatten
  apply List.ext_getElem
  · rw [Sha3.Roundtrips.length_bitsOfBytes, length_squeezeBytes]
    simp [Sha3.Spec.bitsOfState]
  · intro i hL hR
    have hi : i < 512 := by
      simpa [Sha3.Spec.bitsOfState] using hR
    have hd : (Sha3.Spec.bitsOfBytes out).getD i false =
        ((Sha3.Spec.bitsOfState (abs s)).take 512).getD i false :=
      (getD_bitsOfSqueezeBytes s i hi).trans
        (getD_take_bitsOfState s i hi).symm
    simp only [List.getD_eq_getElem?_getD] at hd
    rw [List.getElem?_eq_getElem hL, Option.getD_some] at hd
    rw [List.getElem?_eq_getElem hR, Option.getD_some] at hd
    exact hd

/-- B2f: the first eight little-endian lanes are the first 512 abstract state bits. -/
theorem squeeze_bridge (s : Sha3.Impl.St) :
    ((List.range 8).map fun i => Sha3.Impl.bytesOfLane s[i]!).flatten =
      Sha3.Spec.bytesOfBits ((Sha3.Spec.bitsOfState (abs s)).take 512) := by
  let out := ((List.range 8).map fun i => Sha3.Impl.bytesOfLane s[i]!).flatten
  calc
    out = Sha3.Spec.bytesOfBits (Sha3.Spec.bitsOfBytes out) :=
      (Sha3.Roundtrips.bytes_bits_roundtrip out).symm
    _ = Sha3.Spec.bytesOfBits ((Sha3.Spec.bitsOfState (abs s)).take 512) :=
      congrArg Sha3.Spec.bytesOfBits (bitsOfSqueezeBytes s)

private theorem bitsOfBytes_take (bs : List UInt8) (k : Nat) :
    Sha3.Spec.bitsOfBytes (bs.take k) =
      (Sha3.Spec.bitsOfBytes bs).take (8 * k) := by
  induction bs generalizing k with
  | nil => simp [Sha3.Spec.bitsOfBytes]
  | cons b bs ih =>
      cases k with
      | zero => rfl
      | succ k =>
          change Sha3.Spec.bitsOfByte b ++ Sha3.Spec.bitsOfBytes (bs.take k) =
            (Sha3.Spec.bitsOfByte b ++ Sha3.Spec.bitsOfBytes bs).take (8 * (k + 1))
          rw [ih, List.take_append]
          rw [show (Sha3.Spec.bitsOfByte b).take (8 * (k + 1)) =
            Sha3.Spec.bitsOfByte b from List.take_of_length_le (by
              rw [Sha3.Roundtrips.length_bitsOfByte]
              omega)]
          rw [Sha3.Roundtrips.length_bitsOfByte]
          have hsub : 8 * (k + 1) - 8 = 8 * k := by omega
          rw [hsub]

private theorem bitsOfBytes_drop (bs : List UInt8) (k : Nat) :
    Sha3.Spec.bitsOfBytes (bs.drop k) =
      (Sha3.Spec.bitsOfBytes bs).drop (8 * k) := by
  induction bs generalizing k with
  | nil => simp [Sha3.Spec.bitsOfBytes]
  | cons b bs ih =>
      cases k with
      | zero => rfl
      | succ k =>
          change Sha3.Spec.bitsOfBytes (bs.drop k) =
            (Sha3.Spec.bitsOfByte b ++ Sha3.Spec.bitsOfBytes bs).drop (8 * (k + 1))
          rw [ih, List.drop_append]
          rw [show (Sha3.Spec.bitsOfByte b).drop (8 * (k + 1)) = [] from
            List.drop_eq_nil_of_le (by
              rw [Sha3.Roundtrips.length_bitsOfByte]
              omega)]
          rw [Sha3.Roundtrips.length_bitsOfByte]
          have hsub : 8 * (k + 1) - 8 = 8 * k := by omega
          rw [hsub, List.nil_append]

private theorem bitsOfBytes_block (P : List UInt8) (i : Nat) :
    Sha3.Spec.bitsOfBytes ((P.drop (i * 72)).take 72) =
      ((Sha3.Spec.bitsOfBytes P).drop (i * 576)).take 576 := by
  rw [bitsOfBytes_take, bitsOfBytes_drop]
  rw [show 8 * 72 = 576 by omega, show 8 * (i * 72) = i * 576 by omega]

private theorem state_bits_roundtrip (A : Sha3.Spec.StateArray) :
    Sha3.Spec.stateOfBits (Sha3.Spec.bitsOfState A) = A := by
  funext x y z
  unfold Sha3.Spec.stateOfBits
  have hk : 64 * (5 * y.val + x.val) + z.val < 1600 := by omega
  rw [List.getD_eq_getElem?_getD,
    List.getElem?_eq_getElem (by simp [Sha3.Spec.bitsOfState]; exact hk),
    Option.getD_some]
  simp only [Sha3.Spec.bitsOfState, List.getElem_map, List.getElem_range]
  have hx : (64 * (5 * y.val + x.val) + z.val) / 64 % 5 = x.val := by omega
  have hy : (64 * (5 * y.val + x.val) + z.val) / 64 / 5 % 5 = y.val := by omega
  have hz : (64 * (5 * y.val + x.val) + z.val) % 64 = z.val := by omega
  simp only [hx, hy, hz]

private theorem stateOfBits_paddedBlock (bits : List Bool) (hlen : bits.length = 576) :
    Sha3.Spec.stateOfBits (bits ++ List.replicate 1024 false) =
      Sha3.Spec.stateOfBits bits := by
  funext x y z
  unfold Sha3.Spec.stateOfBits
  let k := 64 * (5 * y.val + x.val) + z.val
  have hk : k < 1600 := by dsimp [k]; omega
  by_cases hb : k < bits.length
  · exact getD_append_left _ _ _ _ hb
  · rw [getD_append_right _ _ _ _ (by omega)]
    have hout : bits.getD k false = false := by
      simp only [List.getD_eq_getElem?_getD]
      rw [List.getElem?_eq_none (by omega)]
      rfl
    rw [hout]
    have hr : k - bits.length < 1024 := by omega
    simp only [List.getD_eq_getElem?_getD]
    rw [List.getElem?_eq_getElem (by
      simp only [List.length_replicate]
      exact hr), Option.getD_some, List.getElem_replicate]

private theorem stateOfBits_listXor (S T : List Bool)
    (hS : S.length = 1600) (hT : T.length = 1600) :
    Sha3.Spec.stateOfBits (Sha3.Spec.listXor S T) = fun x y z =>
      Sha3.Spec.stateOfBits S x y z ^^ Sha3.Spec.stateOfBits T x y z := by
  funext x y z
  unfold Sha3.Spec.stateOfBits Sha3.Spec.listXor
  let k := 64 * (5 * y.val + x.val) + z.val
  have hk : k < 1600 := by dsimp [k]; omega
  have hzip : k < (S.zipWith (· ^^ ·) T).length := by
    rw [List.length_zipWith, hS, hT]
    omega
  simp only [List.getD_eq_getElem?_getD]
  rw [List.getElem?_eq_getElem hzip, Option.getD_some, List.getElem_zipWith]
  rw [List.getElem?_eq_getElem (by omega), Option.getD_some]
  rw [List.getElem?_eq_getElem (by omega), Option.getD_some]

private theorem stateOfBits_absorbInput (A : Sha3.Spec.StateArray)
    (bits : List Bool) (hlen : bits.length = 576) :
    Sha3.Spec.stateOfBits (Sha3.Spec.listXor (Sha3.Spec.bitsOfState A)
      (bits ++ List.replicate 1024 false)) = fun x y z =>
        A x y z ^^ Sha3.Spec.stateOfBits bits x y z := by
  rw [stateOfBits_listXor]
  · rw [state_bits_roundtrip, stateOfBits_paddedBlock _ hlen]
  · simp [Sha3.Spec.bitsOfState]
  · simp only [List.length_append, List.length_replicate, hlen]

private theorem absorbBlock_bits_bridge (s : Sha3.Impl.St) (block : List UInt8)
    (hblock : block.length = 72) :
    Sha3.Spec.bitsOfState (abs (Sha3.Impl.absorbBlock s block)) =
      Sha3.Spec.bitsOfState (Sha3.Spec.keccakP (Sha3.Spec.stateOfBits
        (Sha3.Spec.listXor (Sha3.Spec.bitsOfState (abs s))
          (Sha3.Spec.bitsOfBytes block ++ List.replicate 1024 false)))) := by
  have hbits : (Sha3.Spec.bitsOfBytes block).length = 576 := by
    rw [Sha3.Roundtrips.length_bitsOfBytes, hblock]
  have hin := stateOfBits_absorbInput (abs s) (Sha3.Spec.bitsOfBytes block) hbits
  rw [absorbBlock_bridge, hin]

private theorem block_length (P : List UInt8) (i : Nat) (hi : i < P.length / 72) :
    ((P.drop (i * 72)).take 72).length = 72 := by
  rw [List.length_take, List.length_drop]
  omega

set_option maxRecDepth 4096 in
private theorem absorbIndices_bridge (P : List UInt8) (indices : List Nat)
    (hall : ∀ i ∈ indices, i < P.length / 72) (s : Sha3.Impl.St) :
    indices.foldl
        (fun S i => Sha3.Spec.bitsOfState (Sha3.Spec.keccakP
          (Sha3.Spec.stateOfBits (Sha3.Spec.listXor S
            (((Sha3.Spec.bitsOfBytes P).drop (i * 576)).take 576 ++
              List.replicate 1024 false)))))
        (Sha3.Spec.bitsOfState (abs s)) =
      Sha3.Spec.bitsOfState (abs (indices.foldl
        (fun t i => Sha3.Impl.absorbBlock t ((P.drop (i * 72)).take 72)) s)) := by
  induction indices generalizing s with
  | nil => rfl
  | cons i indices ih =>
      have hi : i < P.length / 72 := hall i List.mem_cons_self
      have hrest : ∀ j ∈ indices, j < P.length / 72 :=
        fun j hj => hall j (List.mem_cons_of_mem i hj)
      have hlen : ((P.drop (i * 72)).take 72).length = 72 := by
        exact block_length P i hi
      have hstep := absorbBlock_bits_bridge s ((P.drop (i * 72)).take 72) hlen
      rw [bitsOfBytes_block] at hstep
      simp only [List.foldl_cons]
      rw [← hstep]
      exact ih hrest _

private theorem bitsOfState_abs_zero :
    Sha3.Spec.bitsOfState (abs (Vector.replicate 25 0)) =
      List.replicate 1600 false := by
  apply List.ext_getElem
  · simp only [Sha3.Spec.bitsOfState, List.length_map, List.length_range,
      List.length_replicate]
  · intro i h1 h2
    simp only [Sha3.Spec.bitsOfState, List.getElem_map, List.getElem_range, abs]
    rw [vget _ _ (by omega), Vector.getElem_replicate, List.getElem_replicate]
    exact BitVec.getLsbD_zero

private theorem absorbP_bridge (P : List UInt8) :
    Sha3.Spec.bitsOfState (abs ((List.range (P.length / 72)).foldl
      (fun s i => Sha3.Impl.absorbBlock s ((P.drop (i * 72)).take 72))
      (Vector.replicate 25 0))) =
    (List.range ((Sha3.Spec.bitsOfBytes P).length / 576)).foldl
      (fun S i => Sha3.Spec.bitsOfState (Sha3.Spec.keccakP
        (Sha3.Spec.stateOfBits (Sha3.Spec.listXor S
          (((Sha3.Spec.bitsOfBytes P).drop (i * 576)).take 576 ++
            List.replicate 1024 false)))))
      (List.replicate 1600 false) := by
  have hfold := absorbIndices_bridge P (List.range (P.length / 72))
    (fun i hi => List.mem_range.mp hi) (Vector.replicate 25 0)
  rw [bitsOfState_abs_zero] at hfold
  rw [Sha3.Roundtrips.length_bitsOfBytes]
  have hn : 8 * P.length / 576 = P.length / 72 := by omega
  rw [hn]
  exact hfold.symm

/-- The suffix-carrying absorb fold is the indexed one: after `n` steps the state is the
`n`-fold indexed absorb and the carried suffix is `P.drop (n * rateBytes)`. This is what makes
`Sha3.Impl.absorbAll`'s single pass admissible against every obligation stated on the indexed
form — `absorbP_bridge` and below are untouched by the implementation's change of shape. -/
private theorem absorbStep_fold (P : List UInt8) (n : Nat) :
    (List.range n).foldl Sha3.Impl.absorbStep
        ((Vector.replicate 25 0 : Sha3.Impl.St), P) =
      ((List.range n).foldl
        (fun s i => Sha3.Impl.absorbBlock s
          ((P.drop (i * Sha3.Impl.rateBytes)).take Sha3.Impl.rateBytes))
        (Vector.replicate 25 0),
       P.drop (n * Sha3.Impl.rateBytes)) := by
  induction n with
  | zero => simp
  | succ n ih =>
      simp only [List.range_succ, List.foldl_append, List.foldl_cons, List.foldl_nil, ih,
        Sha3.Impl.absorbStep, List.drop_drop, Nat.succ_mul]

/-- `absorbAll` computes the indexed absorb fold. -/
theorem absorbAll_eq (P : List UInt8) :
    Sha3.Impl.absorbAll P =
      (List.range (P.length / Sha3.Impl.rateBytes)).foldl
        (fun s i => Sha3.Impl.absorbBlock s
          ((P.drop (i * Sha3.Impl.rateBytes)).take Sha3.Impl.rateBytes))
        (Vector.replicate 25 0) := by
  unfold Sha3.Impl.absorbAll
  rw [absorbStep_fold]

/-- B2: the implementation computes the frozen byte-level SHA3-512 specification. -/
theorem sha3_512_bridge (msg : List UInt8) :
    Sha3.Impl.sha3_512 msg = Sha3.Spec.sha3_512_bytes msg := by
  unfold Sha3.Impl.sha3_512 Sha3.Spec.sha3_512_bytes Sha3.Spec.SHA3_512
    Sha3.Spec.keccakC
  rw [absorbAll_eq]
  rw [squeeze_bridge, Sha3.Structural.sponge_576_512_eq]
  rw [List.take_take]
  simp only [Nat.min_eq_left (by omega : 512 ≤ 576)]
  apply congrArg Sha3.Spec.bytesOfBits
  simp only [Sha3.Impl.rateBytes]
  rw [absorbP_bridge]
  unfold Sha3.Structural.absorb576
  have hlen : (Sha3.Spec.bitsOfBytes msg ++ [false, true]).length =
      8 * msg.length + 2 := by
    rw [List.length_append, Sha3.Roundtrips.length_bitsOfBytes]
    simp
  rw [hlen]
  rw [← padBytes_bridge]

private theorem bitsOfByte_81 :
    Sha3.Spec.bitsOfByte 0x81 =
      [true, false, false, false, false, false, false, true] := by
  decide

private theorem bitsOfByte_01 :
    Sha3.Spec.bitsOfByte 0x01 =
      [true, false, false, false, false, false, false, false] := by
  decide

private theorem absorbP_rateBytes_bridge (P : List UInt8) :
    Sha3.Spec.bitsOfState (abs ((List.range (P.length / Sha3.Impl.rateBytes)).foldl
      (fun s i => Sha3.Impl.absorbBlock s
        ((P.drop (i * Sha3.Impl.rateBytes)).take Sha3.Impl.rateBytes))
      (Vector.replicate 25 0))) =
    (List.range ((Sha3.Spec.bitsOfBytes P).length / 576)).foldl
      (fun S i => Sha3.Spec.bitsOfState (Sha3.Spec.keccakP
        (Sha3.Spec.stateOfBits (Sha3.Spec.listXor S
          (((Sha3.Spec.bitsOfBytes P).drop (i * 576)).take 576 ++
            List.replicate 1024 false)))))
      (List.replicate 1600 false) := by
  simpa only [Sha3.Impl.rateBytes] using absorbP_bridge P

private theorem prefipsPadBytes_bridge (msg : List UInt8) :
    Sha3.Spec.bitsOfBytes
        (if Sha3.Impl.rateBytes - msg.length % Sha3.Impl.rateBytes = 1 then msg ++ [0x81]
         else msg ++ (0x01 :: List.replicate
           (Sha3.Impl.rateBytes - msg.length % Sha3.Impl.rateBytes - 2) 0) ++ [0x80]) =
      Sha3.Spec.bitsOfBytes msg ++ Sha3.Spec.pad101 576 (8 * msg.length) := by
  unfold Sha3.Impl.rateBytes
  generalize hp : 72 - msg.length % 72 = p
  have hp1 : 1 ≤ p := by omega
  have hj : (576 - (8 * msg.length + 2) % 576) % 576 = 8 * p - 2 := by
    omega
  by_cases h1 : p = 1
  · rw [if_pos h1]
    unfold Sha3.Spec.pad101
    rw [hj, h1, bitsOfBytes_append]
    change Sha3.Spec.bitsOfBytes msg ++ Sha3.Spec.bitsOfByte 0x81 = _
    rw [bitsOfByte_81]
    simp
  · rw [if_neg h1]
    unfold Sha3.Spec.pad101
    rw [hj, bitsOfBytes_append, bitsOfBytes_append]
    change Sha3.Spec.bitsOfBytes msg ++
      (Sha3.Spec.bitsOfByte 0x01 ++
        Sha3.Spec.bitsOfBytes (List.replicate (p - 2) 0)) ++
          Sha3.Spec.bitsOfByte 0x80 = _
    rw [bitsOfByte_01, bitsOfBytes_replicate_zero, bitsOfByte_80]
    simp [List.append_assoc]
    have hp2 : 2 ≤ p := by omega
    change List.replicate 7 false ++
      (List.replicate (8 * (p - 2)) false ++
        (List.replicate 7 false ++ [true])) = _
    rw [← List.append_assoc, ← List.append_assoc,
      List.replicate_append_replicate, List.replicate_append_replicate]
    have harith : 7 + 8 * (p - 2) + 7 = 8 * p - 2 := by omega
    rw [harith]

/-- B2′: the same implementation pipeline realizes pre-FIPS Keccak-512. -/
theorem keccak512_prefips_bridge (msg : List UInt8) :
    Sha3.Impl.keccak512_prefips msg =
      Sha3.Spec.bytesOfBits
        (Sha3.Spec.keccakC 1024 (Sha3.Spec.bitsOfBytes msg) 512) := by
  unfold Sha3.Impl.keccak512_prefips Sha3.Spec.keccakC
  simp only [absorbAll_eq]
  rw [squeeze_bridge, Sha3.Structural.sponge_576_512_eq]
  rw [List.take_take]
  simp only [Nat.min_eq_left (by omega : 512 ≤ 576)]
  apply congrArg Sha3.Spec.bytesOfBits
  rw [absorbP_rateBytes_bridge]
  unfold Sha3.Structural.absorb576
  have hlen : (Sha3.Spec.bitsOfBytes msg).length = 8 * msg.length :=
    Sha3.Roundtrips.length_bitsOfBytes msg
  rw [hlen]
  rw [← prefipsPadBytes_bridge]

/-- T10-SPEC: the domain-separation suffix changes the frozen spec digest. -/
theorem sha3_ne_prefips_spec :
    Sha3.Spec.keccakC 1024 (Sha3.Spec.bitsOfBytes []) 512 ≠
      Sha3.Spec.SHA3_512 (Sha3.Spec.bitsOfBytes []) := by
  intro h
  apply Sha3.Kats.sha3_ne_prefips
  rw [keccak512_prefips_bridge, sha3_512_bridge]
  unfold Sha3.Spec.sha3_512_bytes
  exact congrArg Sha3.Spec.bytesOfBits h

#print axioms testBit_eq_shift_and
#print axioms byte_testBit_ge_eight
#print axioms getLsbD_laneOfBytes
#print axioms getD_append_left
#print axioms getD_append_right
#print axioms getD_bitsOfBytes
#print axioms laneOfBytes_bridge
#print axioms bitsOfByte_86
#print axioms bitsOfByte_06
#print axioms bitsOfByte_00
#print axioms bitsOfByte_80
#print axioms bitsOfBytes_append
#print axioms bitsOfBytes_replicate_zero
#print axioms padBytes_bridge
#print axioms xor_abs_bridge
#print axioms loadBlock_bridge
#print axioms absorbBlock_bridge
#print axioms absorbBlocks_bridge
#print axioms getD_bitsOfByte
#print axioms getD_bytesOfLane
#print axioms byteSliceBit
#print axioms bytesOfLane_bit
#print axioms getD_flatMap_fixed
#print axioms length_bytesOfLane
#print axioms length_squeezeBytes
#print axioms getD_squeezeBytes
#print axioms getD_bitsOfSqueezeBytes
#print axioms getD_take_bitsOfState
#print axioms bitsOfSqueezeBytes
#print axioms squeeze_bridge
#print axioms bitsOfBytes_take
#print axioms bitsOfBytes_drop
#print axioms bitsOfBytes_block
#print axioms state_bits_roundtrip
#print axioms stateOfBits_paddedBlock
#print axioms stateOfBits_listXor
#print axioms stateOfBits_absorbInput
#print axioms absorbBlock_bits_bridge
#print axioms block_length
#print axioms absorbIndices_bridge
#print axioms bitsOfState_abs_zero
#print axioms absorbP_bridge
#print axioms absorbStep_fold
#print axioms absorbAll_eq
#print axioms sha3_512_bridge
#print axioms bitsOfByte_81
#print axioms bitsOfByte_01
#print axioms absorbP_rateBytes_bridge
#print axioms prefipsPadBytes_bridge
#print axioms keccak512_prefips_bridge
#print axioms sha3_ne_prefips_spec

end Sha3.Bridge
