/-
Pin seat — M11's commutation half, pinned UP TO FIND-EXTENSIONALITY, and the companion
invariant that makes that equivalence adequate (ruling W3-22, pin 2; F-15's disposition
as sharpened by F-38).

WHY THE COMPANION IS NOT OPTIONAL. R3 §2 settled two things about find-extensionality and
they point opposite ways.

- Listing order is NOT observable: `StoreView.normalize` sorts by address before either
  runner reports, and `checkReport` normalizes again, so a directory's undefined listing
  order never reaches an observable. F-15's original worry is closed in the shell's
  favour.
- But find-equality is strictly COARSER than what `check` prints. The kernel witness is
  `σ₁ = [(a,x),(a,y)]` against `σ₂ = [(a,x)]`: find-equal, different
  `CheckReport.objectCount`, and not even a permutation, so no sorting can re-identify
  them. A BARE `∀ σ` find-extensionality statement is therefore NOT an
  observational-adequacy statement.

The rescue is key-functionality, and it was not in the ledger: `putPre` consults `find`
before it conses, so a reachable store never carries two bindings at one address. With
`Nodup` keys, find-equality and permutation coincide, the address sort is canonical, and
every `checkReport` field agrees. `reachable_keys_nodup` is that invariant, transcribed
from R3's probe `R3-p2_findext.lean` (where it was kernel-proved) and re-proved here
against window B's `Reachable` — which carries one more `putE` premise than the probe's
did, so the pattern gains a hole and nothing else.

`E2/Admission.lean`'s `Admissible.functional` clause already names this lemma as its
converse; until now the name pointed at a probe outside the tree.

THE INDEPENDENCE PREMISE IS FORCED, not chosen. Without `H b₁ ≠ H b₂` the statement is
FALSE, and R3's `A_collision_drops` is the witness: under a colliding `H` with both
pre-images fresh, the first put wins and the second is a no-op, so the two orders leave
DIFFERENT bytes at the one address. Two puts are independent exactly when they land on
different addresses.
-/
import E2.Graph

namespace E2

/-! ## The companion invariant (F-38). -/

/-- An address that `find` misses is not a key. The bridge from the `find`-level guard
    `putPre` actually performs to the list-level `Nodup` the shell's canonical ordering
    needs. -/
theorem find_none_not_key : ∀ (σ : StoreMap) (d : Address),
    σ.find d = none → d ∉ Keys σ := by
  intro σ
  induction σ with
  | nil => intro d _ h; simp [Keys] at h
  | cons p rest ih =>
    intro d hd
    simp only [StoreMap.find] at hd
    split at hd
    · exact absurd hd (by simp)
    · next hne =>
      intro hmem
      simp only [Keys, List.map_cons, List.mem_cons] at hmem
      cases hmem with
      | inl h => exact hne h
      | inr h => exact ih d hd h

/-- A put preserves key-functionality: the no-op branch changes nothing, and the cons
    branch conses an address `find` has just certified absent. -/
theorem putPre_nodup {H : Bytes → Address} {σ : StoreMap} (b : Bytes)
    (h : (Keys σ).Nodup) : (Keys (putPre H σ b)).Nodup := by
  unfold putPre
  split
  · exact h
  · next hnone =>
    simp only [Keys, List.map_cons, List.nodup_cons]
    exact ⟨find_none_not_key σ (H b) hnone, h⟩

/-- **Key-functionality is an invariant of `Reachable`** — the side condition that makes
    find-extensionality observationally adequate, and the converse of
    `Admissible.functional`, which a delivered directory supplies for free (one file per
    name). PROVED; no hypothesis on `H`. -/
theorem reachable_keys_nodup {H : Bytes → Address} {env : ConformsEnv} {σ : StoreMap}
    (hσ : Reachable H env σ) : (Keys σ).Nodup := by
  induction hσ with
  | empty => simp [Keys]
  | putS _ _ _ ih => exact putPre_nodup _ ih
  | putE _ _ _ _ _ ih => exact putPre_nodup _ ih

/-! ## `find` after a put, in closed form. Everything below is arithmetic on this one
    equation. -/

/-- The one fact about `putPre` the commutation argument needs: a put binds its own
    address to the bytes ALREADY THERE if any, and to the new bytes otherwise, and
    touches nothing else. The `getD` is where the no-op branch lives. -/
theorem find_putPre {H : Bytes → Address} (σ : StoreMap) (b : Bytes) (a : Address) :
    (putPre H σ b).find a =
      if a = H b then some ((σ.find (H b)).getD b) else σ.find a := by
  unfold putPre
  split
  · next x h =>
    by_cases hae : a = H b
    · rw [if_pos hae, hae, h]; rfl
    · rw [if_neg hae]
  · next h =>
    by_cases hae : a = H b
    · rw [if_pos hae, hae, h]
      simp [StoreMap.find]
    · rw [if_neg hae]
      simp [StoreMap.find, hae]

/-- Two independent puts, in closed form: each address keeps whatever the pre-store held
    there, or gains the pre-image put at it. Independence (`H b₁ ≠ H b₂`) is what makes
    the two clauses non-overlapping. -/
theorem find_putPre_putPre {H : Bytes → Address} (σ : StoreMap) (b₁ b₂ : Bytes)
    (hne : H b₁ ≠ H b₂) (a : Address) :
    (putPre H (putPre H σ b₁) b₂).find a =
      if a = H b₁ then some ((σ.find (H b₁)).getD b₁)
      else if a = H b₂ then some ((σ.find (H b₂)).getD b₂)
      else σ.find a := by
  have hne' : H b₂ ≠ H b₁ := fun h => hne h.symm
  rw [find_putPre]
  by_cases h2 : a = H b₂
  · have h1 : a ≠ H b₁ := by rw [h2]; exact hne'
    rw [if_pos h2, if_neg h1, if_pos h2, find_putPre, if_neg hne']
  · rw [if_neg h2, find_putPre, if_neg h2]

/-! ## The pin. -/

/-- M11 — the COMMUTATION half of the insertion semilattice, pinned UP TO
    FIND-EXTENSIONALITY (F-15's disposition, sharpened by F-38). Two independent puts in
    either order yield stores that no `find` can tell apart.

    UP TO WHAT, exactly. Not up to list equality — the two orders genuinely produce
    different lists, `(d₂,b₂) :: (d₁,b₁) :: σ` against `(d₁,b₁) :: (d₂,b₂) :: σ`, and
    that is why the equivalence is stated on `find` rather than on `=`. On REACHABLE
    stores that is exactly the right coarseness: `reachable_keys_nodup` gives `Nodup`
    keys on both sides, find-equality and permutation coincide there, and the shell's
    address sort makes every `checkReport` field agree. The `Reachable` premise is
    carried for that reason and is NOT consumed by the equation itself — see
    `M11_comm_keys_nodup`, which is the half of the disposition that does consume it.

    ANTI-CLAIMS. Says nothing about DEPENDENT puts: an entity put after the schema it
    names does not commute with it, because `Reachable.putE` requires the schema's
    binding in the PRE-store. Says nothing about colliding puts — `H b₁ = H b₂` is
    exactly the case R3's `A_collision_drops` refutes, and it is excluded by hypothesis,
    not by a claim about `H`. Says nothing about the object COUNT of the two stores: they
    agree here, but only because both puts are effective or both are no-ops on each
    side — the count is an observable find-extensionality does not in general control,
    which is the whole of R3 §2.2. -/
def ObligationM11_comm : Prop :=
  ∀ (H : Bytes → Address) (env : ConformsEnv) (σ : StoreMap) (b₁ b₂ : Bytes),
    Reachable H env σ → H b₁ ≠ H b₂ →
    ∀ a : Address,
      (putPre H (putPre H σ b₁) b₂).find a = (putPre H (putPre H σ b₂) b₁).find a

/-- PROVED, from the closed form. The `Reachable` premise is not consumed; the pin
    carries it because it is what makes the conclusion an adequacy statement rather than
    a bare equation (`M11_comm_keys_nodup`). -/
theorem M11_comm : ObligationM11_comm := by
  unfold ObligationM11_comm
  intro H env σ b₁ b₂ _ hne a
  have hne' : H b₂ ≠ H b₁ := fun h => hne h.symm
  rw [find_putPre_putPre σ b₁ b₂ hne a, find_putPre_putPre σ b₂ b₁ hne' a]
  by_cases h1 : a = H b₁
  · by_cases h2 : a = H b₂
    · exact absurd (h1.symm.trans h2) hne
    · simp [h1, hne]
  · by_cases h2 : a = H b₂
    · simp [h2, hne']
    · simp [h1, h2]

/-- The adequacy half of F-38's disposition: on a reachable store BOTH orders are
    key-functional, so the find-extensional equality above is an equality of everything
    the shell can observe, not merely of lookups. This is the clause that makes the
    `Reachable` premise on `ObligationM11_comm` load-bearing. -/
theorem M11_comm_keys_nodup {H : Bytes → Address} {env : ConformsEnv} {σ : StoreMap}
    (hσ : Reachable H env σ) (b₁ b₂ : Bytes) :
    (Keys (putPre H (putPre H σ b₁) b₂)).Nodup ∧
      (Keys (putPre H (putPre H σ b₂) b₁)).Nodup :=
  ⟨putPre_nodup _ (putPre_nodup _ (reachable_keys_nodup hσ)),
   putPre_nodup _ (putPre_nodup _ (reachable_keys_nodup hσ))⟩

#print axioms reachable_keys_nodup
#print axioms M11_comm
#print axioms M11_comm_keys_nodup

end E2
