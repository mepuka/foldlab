/-!
# Big-endian 32-bit wire fields

The shared byte-level tools behind every closed control-plane codec:
the four-byte big-endian encoding of a bounded natural, its exact
reader, and the reconstruction lemmas that make decode-of-encode
identity and image characterizations one-line consequences. Extracted
from the capability-document codec when the proof-document codecs
arrived; no semantics live here.
-/

namespace Effects.Wire

/-- Big-endian 32-bit encoding. -/
def nat32 (n : Nat) : List UInt8 :=
  [UInt8.ofNat (n >>> 24), UInt8.ofNat (n >>> 16),
   UInt8.ofNat (n >>> 8), UInt8.ofNat n]

def readNat32 : List UInt8 → Option (Nat × List UInt8)
  | a :: b :: c :: d :: rest =>
      some (a.toNat * 16777216 + b.toNat * 65536 + c.toNat * 256 + d.toNat,
        rest)
  | _ => none

theorem nat32_length (n : Nat) : (nat32 n).length = 4 := rfl

/-- The read-side arithmetic: the four encoded bytes recombine to the
encoded value. -/
theorem nat32_combo (n : Nat) (h : n < 4294967296) :
    (UInt8.ofNat (n >>> 24)).toNat * 16777216 +
      (UInt8.ofNat (n >>> 16)).toNat * 65536 +
      (UInt8.ofNat (n >>> 8)).toNat * 256 + (UInt8.ofNat n).toNat = n := by
  simp only [UInt8.toNat_ofNat', Nat.shiftRight_eq_div_pow]
  omega

theorem readNat32_nat32 (n : Nat) (h : n < 4294967296)
    (rest : List UInt8) : readNat32 (nat32 n ++ rest) = some (n, rest) := by
  show readNat32 (UInt8.ofNat (n >>> 24) :: UInt8.ofNat (n >>> 16) ::
    UInt8.ofNat (n >>> 8) :: UInt8.ofNat n :: rest) = some (n, rest)
  simp only [readNat32, Option.some.injEq, Prod.mk.injEq]
  exact ⟨nat32_combo n h, trivial⟩

theorem readNat32_nat32_nil (n : Nat) (h : n < 4294967296) :
    readNat32 (nat32 n) = some (n, []) := by
  simpa using readNat32_nat32 n h []

/-- The write-side reconstruction: four bytes are the encoding of
their combination. -/
theorem nat32_of_combo (a b c d : UInt8) :
    nat32 (a.toNat * 16777216 + b.toNat * 65536 + c.toNat * 256 +
      d.toNat) = [a, b, c, d] := by
  have ha := a.toNat_lt
  have hb := b.toNat_lt
  have hc := c.toNat_lt
  have hd := d.toNat_lt
  show [UInt8.ofNat (_ >>> 24), UInt8.ofNat (_ >>> 16),
    UInt8.ofNat (_ >>> 8), UInt8.ofNat _] = [a, b, c, d]
  congr 1
  · symm
    apply UInt8.toNat_inj.mp
    simp only [UInt8.toNat_ofNat', Nat.shiftRight_eq_div_pow]
    omega
  congr 1
  · symm
    apply UInt8.toNat_inj.mp
    simp only [UInt8.toNat_ofNat', Nat.shiftRight_eq_div_pow]
    omega
  congr 1
  · symm
    apply UInt8.toNat_inj.mp
    simp only [UInt8.toNat_ofNat', Nat.shiftRight_eq_div_pow]
    omega
  congr 1
  symm
  apply UInt8.toNat_inj.mp
  simp only [UInt8.toNat_ofNat']
  omega

theorem readNat32_some (bytes : List UInt8) (n : Nat)
    (rest : List UInt8) (h : readNat32 bytes = some (n, rest)) :
    bytes = nat32 n ++ rest ∧ n < 4294967296 := by
  match bytes, h with
  | a :: b :: c :: d :: rest', h =>
    simp only [readNat32, Option.some.injEq, Prod.mk.injEq] at h
    obtain ⟨hn, hrest⟩ := h
    subst hn
    subst hrest
    have ha := a.toNat_lt
    have hb := b.toNat_lt
    have hc := c.toNat_lt
    have hd := d.toNat_lt
    constructor
    · rw [nat32_of_combo]
      rfl
    · omega

end Effects.Wire
