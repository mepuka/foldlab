import Sha3.Spec

/-!
# T6a, T6b, R2: conversion round-trip theorems (REV2 frozen statements)

The precise length-scoped round trips (no unrestricted bijections are claimed anywhere).
Expected axiom profile: `[propext, Quot.sound]` (or smaller).
-/

set_option maxRecDepth 4096

namespace Sha3.Roundtrips

open Sha3.Spec

theorem length_bitsOfByte (b : UInt8) : (bitsOfByte b).length = 8 := by
  simp [bitsOfByte]

private theorem byte_roundtrip_fin :
    ∀ n : Fin 256, byteOfBits (bitsOfByte (UInt8.ofNat n.val)) = UInt8.ofNat n.val := by decide

/-- Per-byte round trip, all 256 cases decided. -/
theorem byte_roundtrip (b : UInt8) : byteOfBits (bitsOfByte b) = b := by
  have h := byte_roundtrip_fin ⟨b.toNat, b.toNat_lt⟩
  simpa [UInt8.ofNat_toNat] using h

theorem length_bitsOfBytes (bs : List UInt8) : (bitsOfBytes bs).length = 8 * bs.length := by
  induction bs with
  | nil => rfl
  | cons b t ih =>
    rw [show bitsOfBytes (b :: t) = bitsOfByte b ++ bitsOfBytes t from rfl,
        List.length_append, length_bitsOfByte, ih, List.length_cons]
    omega

private theorem take8_append (l r : List Bool) (hl : l.length = 8) :
    (l ++ r).take 8 = l := by
  rw [← hl, List.take_left]

private theorem drop_shift (l r : List Bool) (hl : l.length = 8) (n : Nat) :
    (l ++ r).drop (8 * (n + 1)) = r.drop (8 * n) := by
  have h : 8 * (n + 1) = l.length + 8 * n := by omega
  rw [h, List.drop_append, List.drop_eq_nil_of_le (by omega), List.nil_append,
      Nat.add_sub_cancel_left]

/-- Peeling one byte-sized block off the front of `bytesOfBits`. -/
theorem bytesOfBits_append8 (b8 rest : List Bool) (h8 : b8.length = 8) :
    bytesOfBits (b8 ++ rest) = byteOfBits b8 :: bytesOfBits rest := by
  apply List.ext_getElem
  · simp only [bytesOfBits, List.length_map, List.length_range, List.length_append,
      List.length_cons, h8]
    omega
  · intro i h1 h2
    cases i with
    | zero =>
      simp only [bytesOfBits, List.getElem_map, List.getElem_range, List.getElem_cons_zero]
      rw [Nat.mul_zero, List.drop_zero, take8_append _ _ h8]
    | succ n =>
      simp only [bytesOfBits, List.getElem_map, List.getElem_range, List.getElem_cons_succ]
      rw [drop_shift _ _ h8]

/-- T6a: bytes → bits → bytes is the identity. -/
theorem bytes_bits_roundtrip (bs : List UInt8) : bytesOfBits (bitsOfBytes bs) = bs := by
  induction bs with
  | nil => rfl
  | cons b t ih =>
    rw [show bitsOfBytes (b :: t) = bitsOfByte b ++ bitsOfBytes t from rfl,
        bytesOfBits_append8 _ _ (length_bitsOfByte b), byte_roundtrip, ih]

/-- Per-block inverse: eight bits survive the byte round trip. -/
private theorem bits_byte_roundtrip : ∀ (l : List Bool), l.length = 8 →
    bitsOfByte (byteOfBits l) = l
  | [a, b, c, d, e, f, g, h], _ => by revert a b c d e f g h; decide
  | a :: b :: c :: d :: e :: f :: g :: h :: i :: rest, hl => by
      simp only [List.length_cons] at hl
      omega

/-- T6b: bits → bytes → bits is the identity on whole-byte strings. -/
theorem bits_bytes_roundtrip (bits : List Bool) (h : bits.length % 8 = 0) :
    bitsOfBytes (bytesOfBits bits) = bits := by
  rcases Nat.eq_zero_or_pos bits.length with h0 | hpos
  · rw [List.eq_nil_of_length_eq_zero h0]; rfl
  · have h8 : 8 ≤ bits.length := by omega
    calc bitsOfBytes (bytesOfBits bits)
        = bitsOfBytes (bytesOfBits (bits.take 8 ++ bits.drop 8)) := by
          rw [List.take_append_drop]
      _ = bitsOfBytes (byteOfBits (bits.take 8) :: bytesOfBits (bits.drop 8)) := by
          rw [bytesOfBits_append8 _ _ (by rw [List.length_take]; omega)]
      _ = bitsOfByte (byteOfBits (bits.take 8)) ++ bitsOfBytes (bytesOfBits (bits.drop 8)) := rfl
      _ = bits.take 8 ++ bits.drop 8 := by
          rw [bits_byte_roundtrip _ (by rw [List.length_take]; omega),
              bits_bytes_roundtrip (bits.drop 8) (by rw [List.length_drop]; omega)]
      _ = bits := List.take_append_drop 8 bits
termination_by bits.length
decreasing_by simp only [List.length_drop]; omega

/-- R2: the state round trip is the identity on 1600-bit strings. -/
theorem bits_state_roundtrip (S : List Bool) (hS : S.length = 1600) :
    bitsOfState (stateOfBits S) = S := by
  apply List.ext_getElem
  · simp [bitsOfState, hS]
  · intro i h1 h2
    have h1600 : i < 1600 := by
      simpa [bitsOfState] using h1
    simp only [bitsOfState, List.getElem_map, List.getElem_range, stateOfBits]
    have hidx : 64 * (5 * (i / 64 / 5 % 5) + i / 64 % 5) + i % 64 = i := by omega
    rw [hidx, List.getD_eq_getElem?_getD, List.getElem?_eq_getElem h2, Option.getD_some]

#print axioms bytes_bits_roundtrip
#print axioms bits_bytes_roundtrip
#print axioms bits_state_roundtrip

end Sha3.Roundtrips
