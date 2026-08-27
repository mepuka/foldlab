/-!
# Byte-codec primitives

The provable toolkit under the canonical node codec: 32-bit big-endian
scalars, length-prefixed frames, fixed-width chunks, and counted sequences.

Every primitive carries BOTH directions:

- **forward** (`read (encode x ++ rest) = some (x, rest)`): encoding then
  decoding recovers the value and consumes exactly the encoding; and
- **exactness** (`read b = some (x, rest) → b = encode x ++ rest`): the
  decoder accepts nothing outside the encoder's image. Exactness is what
  "one byte representation per admitted node" means, and it is the
  direction a lax codec omits.

Pass-B scalar decision, deliberate: length and count fields are fixed-width
4-byte big-endian, not varints. Varints introduce a non-canonicality class
(non-minimal encodings) that would need side conditions; fixed width has one
representation by construction. All laws here are hash-lattice Level 0: no
premise about any hash appears.

`Bytes` is `List UInt8` — the structural-induction carrier for codec proofs.
The TypeScript mirror uses `Uint8Array`; agreement is the differential
manifest's business, never an assumption.
-/

namespace Effects.Cas

abbrev Bytes := List UInt8

/-! ## Self-contained helpers -/

private theorem take_len_append (l r : List α) : (l ++ r).take l.length = l := by
  induction l with
  | nil => simp
  | cons a t ih => simp [ih]

private theorem drop_len_append (l r : List α) : (l ++ r).drop l.length = r := by
  induction l with
  | nil => simp
  | cons a t ih => simp [ih]

private theorem toNat_ofNat_mod (n : Nat) : (UInt8.ofNat n).toNat = n % 256 := by
  first
    | rfl
    | simp [UInt8.toNat, UInt8.ofNat]
    | simp [UInt8.toNat_ofNat]

/-! ## 32-bit big-endian scalars -/

/-- Encode a natural below `2^32` as four big-endian bytes. -/
def nat32 (n : Nat) : Bytes :=
  [UInt8.ofNat (n / 16777216 % 256), UInt8.ofNat (n / 65536 % 256),
   UInt8.ofNat (n / 256 % 256), UInt8.ofNat (n % 256)]

/-- Read four big-endian bytes as a natural; fails on fewer than four. -/
def readNat32 : Bytes → Option (Nat × Bytes)
  | b3 :: b2 :: b1 :: b0 :: rest =>
    some (b3.toNat * 16777216 + b2.toNat * 65536 + b1.toNat * 256 + b0.toNat, rest)
  | _ => none

theorem nat32_length (n : Nat) : (nat32 n).length = 4 := by
  simp [nat32]

theorem readNat32_nat32 (n : Nat) (h : n < 4294967296) (rest : Bytes) :
    readNat32 (nat32 n ++ rest) = some (n, rest) := by
  simp only [nat32, List.cons_append, List.nil_append, readNat32,
    toNat_ofNat_mod, Option.some.injEq, Prod.mk.injEq]
  exact ⟨by omega, trivial⟩

theorem readNat32_exact {b : Bytes} {n : Nat} {rest : Bytes}
    (h : readNat32 b = some (n, rest)) :
    b = nat32 n ++ rest ∧ n < 4294967296 := by
  match b with
  | [] => simp [readNat32] at h
  | [_] => simp [readNat32] at h
  | [_, _] => simp [readNat32] at h
  | [_, _, _] => simp [readNat32] at h
  | b3 :: b2 :: b1 :: b0 :: r =>
    simp only [readNat32, Option.some.injEq, Prod.mk.injEq] at h
    obtain ⟨hn, hr⟩ := h
    have h3 := b3.toNat_lt
    have h2 := b2.toNat_lt
    have h1 := b1.toNat_lt
    have h0 := b0.toNat_lt
    have e3 : (b3.toNat * 16777216 + b2.toNat * 65536 + b1.toNat * 256 + b0.toNat)
        / 16777216 % 256 = b3.toNat := by omega
    have e2 : (b3.toNat * 16777216 + b2.toNat * 65536 + b1.toNat * 256 + b0.toNat)
        / 65536 % 256 = b2.toNat := by omega
    have e1 : (b3.toNat * 16777216 + b2.toNat * 65536 + b1.toNat * 256 + b0.toNat)
        / 256 % 256 = b1.toNat := by omega
    have e0 : (b3.toNat * 16777216 + b2.toNat * 65536 + b1.toNat * 256 + b0.toNat)
        % 256 = b0.toNat := by omega
    subst hn hr
    refine ⟨?_, by omega⟩
    simp only [nat32, List.cons_append, List.nil_append, List.cons.injEq, and_true]
    rw [e3, e2, e1, e0]
    exact ⟨UInt8.ofNat_toNat.symm, UInt8.ofNat_toNat.symm,
      UInt8.ofNat_toNat.symm, UInt8.ofNat_toNat.symm⟩

/-! ## Length-prefixed frames -/

/-- Frame a byte string: its length as `nat32`, then its bytes. -/
def frame (bs : Bytes) : Bytes := nat32 bs.length ++ bs

/-- Read one frame: a `nat32` length, then exactly that many bytes. -/
def readFrame (b : Bytes) : Option (Bytes × Bytes) :=
  match readNat32 b with
  | some (len, rest) =>
    if len ≤ rest.length then some (rest.take len, rest.drop len) else none
  | none => none

theorem readFrame_frame (bs : Bytes) (h : bs.length < 4294967296) (rest : Bytes) :
    readFrame (frame bs ++ rest) = some (bs, rest) := by
  simp only [frame, List.append_assoc, readFrame,
    readNat32_nat32 bs.length h (bs ++ rest)]
  rw [if_pos (by simp only [List.length_append]; omega)]
  rw [take_len_append, drop_len_append]

theorem readFrame_exact {b : Bytes} {bs rest : Bytes}
    (h : readFrame b = some (bs, rest)) :
    b = frame bs ++ rest ∧ bs.length < 4294967296 := by
  unfold readFrame at h
  split at h
  next len r' hr =>
    split at h
    next hle =>
      simp only [Option.some.injEq, Prod.mk.injEq] at h
      obtain ⟨hbs, hrest⟩ := h
      obtain ⟨hb, hlt⟩ := readNat32_exact hr
      have hlen : bs.length = len := by
        rw [← hbs, List.length_take]; omega
      have hsplit : r' = bs ++ rest := by
        rw [← hbs, ← hrest, List.take_append_drop]
      refine ⟨?_, by omega⟩
      rw [hb, hsplit, frame, hlen, List.append_assoc]
    next hle => simp at h
  next hr => simp at h

/-! ## Fixed-width chunks -/

/-- Read exactly `n` bytes. -/
def readChunk (n : Nat) (b : Bytes) : Option (Bytes × Bytes) :=
  if n ≤ b.length then some (b.take n, b.drop n) else none

theorem readChunk_append {n : Nat} {l : Bytes} (r : Bytes) (h : l.length = n) :
    readChunk n (l ++ r) = some (l, r) := by
  unfold readChunk
  rw [if_pos (by simp only [List.length_append]; omega)]
  subst h
  rw [take_len_append, drop_len_append]

theorem readChunk_exact {n : Nat} {b c rest : Bytes}
    (h : readChunk n b = some (c, rest)) :
    b = c ++ rest ∧ c.length = n := by
  unfold readChunk at h
  split at h
  next hle =>
    simp only [Option.some.injEq, Prod.mk.injEq] at h
    obtain ⟨hc, hrest⟩ := h
    have hlen : c.length = n := by
      rw [← hc, List.length_take]; omega
    have hsplit : b = c ++ rest := by
      rw [← hc, ← hrest, List.take_append_drop]
    exact ⟨hsplit, hlen⟩
  next hle => simp at h

/-! ## Counted sequences -/

/-- Run a reader exactly `n` times. -/
def readN (p : Bytes → Option (α × Bytes)) : Nat → Bytes → Option (List α × Bytes)
  | 0, b => some ([], b)
  | n + 1, b =>
    match p b with
    | some (a, b') =>
      match readN p n b' with
      | some (as, b'') => some (a :: as, b'')
      | none => none
    | none => none

theorem readN_encode {p : Bytes → Option (α × Bytes)} {e : α → Bytes}
    (hp : ∀ a rest, p (e a ++ rest) = some (a, rest)) :
    ∀ (xs : List α) (rest : Bytes),
      readN p xs.length ((xs.map e).flatten ++ rest) = some (xs, rest) := by
  intro xs
  induction xs with
  | nil => intro rest; simp [readN]
  | cons a t ih =>
    intro rest
    simp only [List.length_cons, List.map_cons, List.flatten_cons,
      List.append_assoc, readN, hp, ih]

theorem readN_exact {p : Bytes → Option (α × Bytes)} {e : α → Bytes}
    (hp : ∀ b a rest, p b = some (a, rest) → b = e a ++ rest) :
    ∀ (n : Nat) (b : Bytes) (as : List α) (rest : Bytes),
      readN p n b = some (as, rest) →
      b = (as.map e).flatten ++ rest ∧ as.length = n := by
  intro n
  induction n with
  | zero =>
    intro b as rest h
    simp only [readN, Option.some.injEq, Prod.mk.injEq] at h
    obtain ⟨has, hrest⟩ := h
    subst has hrest
    simp
  | succ k ih =>
    intro b as rest h
    unfold readN at h
    split at h
    next a b' hpb =>
      split at h
      next as' b'' hrn =>
        simp only [Option.some.injEq, Prod.mk.injEq] at h
        obtain ⟨has, hrest⟩ := h
        obtain ⟨hb', hlen⟩ := ih b' as' b'' hrn
        have hb := hp b a b' hpb
        subst has hrest
        rw [hb, hb']
        refine ⟨?_, by simp [hlen]⟩
        simp [List.append_assoc]
      next hrn => simp at h
    next hpb => simp at h

end Effects.Cas
