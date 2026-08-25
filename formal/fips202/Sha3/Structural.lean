import Sha3.Spec

/-!
# T3, T4, T5: structural theorems (REV2 frozen statements)

Pure structural proofs over the spec layer — no mass kernel reduction anywhere.
Expected axiom profile: `[propext, Quot.sound]` (or smaller).
-/

set_option maxRecDepth 4096

namespace Sha3.Structural

open Sha3.Spec

/-- T3: padding is nonempty and completes the message to a rate multiple (valid domain `0 < x`). -/
theorem pad101_length (x m : Nat) (hx : 0 < x) :
    0 < (pad101 x m).length ∧ (m + (pad101 x m).length) % x = 0 := by
  have hlen : (pad101 x m).length = (x - (m + 2) % x) % x + 2 := by
    simp [pad101]
  have h1 : (m + 2) % x < x := Nat.mod_lt _ hx
  refine ⟨by omega, ?_⟩
  rw [hlen]
  rcases Nat.eq_zero_or_pos ((m + 2) % x) with h | h
  · rw [h, Nat.sub_zero, Nat.mod_self]
    simpa using h
  · have hj : (x - (m + 2) % x) % x = x - (m + 2) % x :=
      Nat.mod_eq_of_lt (by omega)
    rw [hj]
    have h2 : (m + 2) % x + x * ((m + 2) / x) = m + 2 := Nat.mod_add_div _ _
    have h3 : x * ((m + 2) / x + 1) = x * ((m + 2) / x) + x := by
      rw [Nat.mul_add, Nat.mul_one]
    have h4 : m + (x - (m + 2) % x + 2) = x * ((m + 2) / x + 1) := by omega
    rw [h4]
    exact Nat.mul_mod_right x _

/-- Helper for T4: indices in `pad10*1`'s zero run read `false`. -/
private theorem pad101_getElem_zero_run (x m i : Nat)
    (h1 : 1 ≤ i) (h2 : i ≤ (x - (m + 2) % x) % x)
    (hb : i < (pad101 x m).length) :
    (pad101 x m)[i]'hb = false := by
  have hblen : i < (pad101 x m).length := hb
  simp only [pad101] at hblen
  obtain ⟨k, rfl⟩ : ∃ k, i = k + 1 := ⟨i - 1, by omega⟩
  show (true :: (List.replicate ((x - (m + 2) % x) % x) false ++ [true]))[k + 1]'hblen = false
  rw [List.getElem_cons_succ]
  rw [List.getElem_append_left (by simp only [List.length_replicate]; omega)]
  exact List.getElem_replicate ..

/-- Helper for T4: if `m₁` is strictly shorter, position `m₂.length` reads `true` on the right
(start of pad₂) but `false` on the left (inside pad₁'s zero run) — contradiction. -/
private theorem pad_inj_no_lt (x : Nat) (_hx : 0 < x) (m₁ m₂ : List Bool)
    (h : m₁ ++ pad101 x m₁.length = m₂ ++ pad101 x m₂.length)
    (hlt : m₁.length < m₂.length) : False := by
  have hl1 : (pad101 x m₁.length).length = (x - (m₁.length + 2) % x) % x + 2 := by
    simp [pad101]
  have hl2 : (pad101 x m₂.length).length = (x - (m₂.length + 2) % x) % x + 2 := by
    simp [pad101]
  have hlen : m₁.length + (pad101 x m₁.length).length
      = m₂.length + (pad101 x m₂.length).length := by
    have := congrArg List.length h
    simpa [List.length_append] using this
  -- d := m₂.length - m₁.length satisfies 1 ≤ d ≤ j₁
  have hdj : m₂.length - m₁.length ≤ (x - (m₁.length + 2) % x) % x := by omega
  have hbound : m₂.length < (m₁ ++ pad101 x m₁.length).length := by
    rw [List.length_append, hl1]; omega
  have hbound' : m₂.length < (m₂ ++ pad101 x m₂.length).length := by
    rw [List.length_append, hl2]; omega
  have hEq : (m₁ ++ pad101 x m₁.length)[m₂.length]'hbound
      = (m₂ ++ pad101 x m₂.length)[m₂.length]'hbound' := by
    simp only [h]
  have hR : (m₂ ++ pad101 x m₂.length)[m₂.length]'hbound' = true := by
    rw [List.getElem_append_right (Nat.le_refl _)]
    simp [pad101]
  have hL : (m₁ ++ pad101 x m₁.length)[m₂.length]'hbound = false := by
    rw [List.getElem_append_right (Nat.le_of_lt hlt)]
    exact pad101_getElem_zero_run x m₁.length (m₂.length - m₁.length) (by omega) hdj _
  rw [hEq, hR] at hL
  exact Bool.noConfusion hL

/-- T4: the padded encoding is injective (valid domain `0 < x`). -/
theorem pad101_encoding_inj (x : Nat) (hx : 0 < x) (m₁ m₂ : List Bool)
    (h : m₁ ++ pad101 x m₁.length = m₂ ++ pad101 x m₂.length) : m₁ = m₂ := by
  rcases Nat.lt_trichotomy m₁.length m₂.length with hlt | heq | hgt
  · exact absurd (pad_inj_no_lt x hx m₁ m₂ h hlt) not_false
  · exact List.append_inj_left h heq
  · exact absurd (pad_inj_no_lt x hx m₂ m₁ h.symm hgt) not_false

/-- The string projection of any state has exactly 1600 bits. -/
theorem length_bitsOfState (A : StateArray) : (bitsOfState A).length = 1600 := by
  simp [bitsOfState]

/-- A fold whose step always emits 1600 bits preserves 1600-bit length. -/
theorem foldl_length_1600 {α : Type} (step : List Bool → α → List Bool)
    (h : ∀ S a, (step S a).length = 1600) :
    ∀ (l : List α) (S : List Bool), S.length = 1600 → (l.foldl step S).length = 1600 := by
  intro l
  induction l with
  | nil => intro S hS; simpa
  | cons a t ih => intro S hS; exact ih _ (h S a)

/-- Named mirror of the rate-576 absorb fold inside `sponge 576 · 512` (proof plumbing only —
`sponge_576_512_eq` ties it definitionally to the frozen `sponge`). -/
def absorb576 (N : List Bool) : List Bool :=
  let P := N ++ pad101 576 N.length
  (List.range (P.length / 576)).foldl
    (fun S i => bitsOfState (keccakP (stateOfBits
      (listXor S ((P.drop (i * 576)).take 576 ++ List.replicate 1024 false)))))
    (List.replicate 1600 false)

theorem sponge_576_512_eq (N : List Bool) :
    sponge 576 N 512 = ((absorb576 N).take 576).take 512 := rfl

theorem length_absorb576 (N : List Bool) : (absorb576 N).length = 1600 := by
  unfold absorb576
  exact foldl_length_1600 _ (fun S a => length_bitsOfState _) _ _
    (by simp only [List.length_replicate])

/-- T5: SHA3-512 output is exactly 512 bits. -/
theorem length_SHA3_512 (M : List Bool) : (SHA3_512 M).length = 512 := by
  have he : SHA3_512 M = ((absorb576 (M ++ [false, true])).take 576).take 512 :=
    sponge_576_512_eq (M ++ [false, true])
  rw [he]
  rw [List.length_take, List.length_take, length_absorb576]
  omega

#print axioms pad101_length
#print axioms pad101_encoding_inj
#print axioms length_SHA3_512

end Sha3.Structural
