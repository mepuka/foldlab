import Effects.Remote.Event

/-!
# The capability-document codec

Control state parses with the same posture as node bytes: a canonical
encoding (two big-endian 32-bit naturals — the key-count and blob-byte
limits), a CLOSED decoder that rejects truncation, oversize fields,
and trailing bytes, and exactness — a successful decode's input IS the
canonical encoding of its result, so the fail-closed law is the
contrapositive of the image characterization, exactly as the node
codec's discipline demands.
-/

namespace Effects.Remote

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

theorem readNat32_nat32 (n : Nat) (h : n < 4294967296)
    (rest : List UInt8) : readNat32 (nat32 n ++ rest) = some (n, rest) := by
  show readNat32 (UInt8.ofNat (n >>> 24) :: UInt8.ofNat (n >>> 16) ::
    UInt8.ofNat (n >>> 8) :: UInt8.ofNat n :: rest) = some (n, rest)
  simp only [readNat32, UInt8.toNat_ofNat', Option.some.injEq,
    Prod.mk.injEq]
  refine ⟨?_, trivial⟩
  simp only [Nat.shiftRight_eq_div_pow]
  omega

theorem readNat32_nat32_nil (n : Nat) (h : n < 4294967296) :
    readNat32 (nat32 n) = some (n, []) := by
  simpa using readNat32_nat32 n h []

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
    · show a :: b :: c :: d :: rest' =
        UInt8.ofNat (_ >>> 24) :: UInt8.ofNat (_ >>> 16) ::
        UInt8.ofNat (_ >>> 8) :: UInt8.ofNat _ :: rest'
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
    · omega

/-- The canonical capability-document encoding. -/
def encodeLimits (l : Limits) : List UInt8 :=
  nat32 l.maxBatchKeys ++ nat32 l.maxBlobBytes

theorem encodeLimits_length (l : Limits) : (encodeLimits l).length = 8 := by
  simp [encodeLimits, nat32]

/-- The closed decoder: exactly eight bytes, no trailing content. -/
def decodeLimits? (bytes : List UInt8) : Option Limits :=
  match readNat32 bytes with
  | some (keys, rest) =>
    match readNat32 rest with
    | some (blob, []) => some ⟨keys, blob⟩
    | _ => none
  | none => none

/-- Forward correctness on representable limits. -/
theorem decodeLimits_encodeLimits (l : Limits)
    (hk : l.maxBatchKeys < 4294967296)
    (hb : l.maxBlobBytes < 4294967296) :
    decodeLimits? (encodeLimits l) = some l := by
  unfold decodeLimits? encodeLimits
  rw [readNat32_nat32 l.maxBatchKeys hk]
  dsimp only
  rw [readNat32_nat32_nil l.maxBlobBytes hb]

/-- Exactness: a successful decode's input IS the canonical encoding
of its result, with both fields representable. -/
theorem decodeLimits_exact (bytes : List UInt8) (l : Limits)
    (h : decodeLimits? bytes = some l) :
    bytes = encodeLimits l ∧
      l.maxBatchKeys < 4294967296 ∧ l.maxBlobBytes < 4294967296 := by
  simp only [decodeLimits?] at h
  split at h
  · rename_i keys rest hread
    split at h
    · rename_i blob hread2
      injection h with h
      obtain ⟨hb1, hlt1⟩ := readNat32_some bytes keys rest hread
      obtain ⟨hb2, hlt2⟩ := readNat32_some rest blob [] hread2
      subst h
      refine ⟨?_, hlt1, hlt2⟩
      rw [hb1, hb2]
      simp [encodeLimits]
    · exact nomatch h
  · exact nomatch h

end Effects.Remote
