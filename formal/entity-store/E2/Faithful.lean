/-
Seat module — M15 faithfulness (L-faithful, STORE-MODEL §4/§6). Statements are pinned in
`E2/Resolve.lean`; this module supplies proofs only:

  theorem M15_fresh            : ObligationM15_fresh
  theorem M15_faithful_schema  : ObligationM15_faithful_schema
  theorem M15_faithful_entity  : ObligationM15_faithful_entity

Bonus (two-line M4a corollaries, discharging Obligations.lean's stated F/S and F/V):

  theorem encSchema_inj : ObligationEncodeSchemaInjective
  theorem encValue_inj  : ObligationEncodeValueInjective

Helper lemmas live here. End with `#print axioms` for each theorem. Edit no other
module; a statement that resists proof is a STOP-and-report.
-/
import E2.Resolve

namespace E2

/-- Under an injective address function, inserting into a reachable store retrieves the
    exact pre-image whether its address was fresh or already present. -/
theorem find_putPre_injective {H : Bytes → Address} {env : ConformsEnv} {σ : StoreMap}
    (hinj : ∀ b₁ b₂, H b₁ = H b₂ → b₁ = b₂) (hσ : Reachable H env σ)
    (b : Bytes) : (putPre H σ b).find (H b) = some b := by
  cases hlookup : σ.find (H b) with
  | none =>
      exact M14_get_put_fresh hlookup
  | some stored =>
      have hhash : H stored = H b := M8_wf1 hσ (H b) stored hlookup
      have hstored : stored = b := hinj stored b hhash
      subst stored
      simp [putPre, hlookup]

theorem M15_fresh : ObligationM15_fresh := by
  unfold ObligationM15_fresh
  intro H σ s hfresh
  have hfind :
      (putSchema H σ s).find (addressS H s) = some (preimageS s) := by
    simpa [putSchema, addressS] using
      (M14_get_put_fresh (H := H) (σ := σ) (b := preimageS s) hfresh)
  have hchecked :
      getChecked H (putSchema H σ s) (addressS H s) = some (preimageS s) := by
    unfold getChecked
    rw [hfind]
    simp [addressS]
  unfold resolveSchema
  rw [hchecked]
  simp [stripPre, preimageS, M4a_schema]

theorem M15_faithful_schema : ObligationM15_faithful_schema := by
  unfold ObligationM15_faithful_schema
  intro H env hinj σ s hσ
  have hfind :
      (putSchema H σ s).find (addressS H s) = some (preimageS s) := by
    simpa [putSchema, addressS] using
      (find_putPre_injective (H := H) (env := env) hinj hσ (preimageS s))
  have hchecked :
      getChecked H (putSchema H σ s) (addressS H s) = some (preimageS s) := by
    unfold getChecked
    rw [hfind]
    simp [addressS]
  unfold resolveSchema
  rw [hchecked]
  simp [stripPre, preimageS, M4a_schema]

theorem M15_faithful_entity : ObligationM15_faithful_entity := by
  unfold ObligationM15_faithful_entity
  intro H env hinj σ sAddr v hσ
  have hfind :
      (putEntity H σ sAddr v).find (H (preimageE sAddr v)) =
        some (preimageE sAddr v) := by
    simpa [putEntity] using
      (find_putPre_injective (H := H) (env := env) hinj hσ (preimageE sAddr v))
  have hchecked :
      getChecked H (putEntity H σ sAddr v) (H (preimageE sAddr v)) =
        some (preimageE sAddr v) := by
    unfold getChecked
    rw [hfind]
    simp
  unfold resolveEntity
  rw [hchecked]
  simp [stripPre, preimageE, decAddr_encAddress, M4a_value]

theorem encSchema_inj : ObligationEncodeSchemaInjective := by
  unfold ObligationEncodeSchemaInjective
  intro s₁ s₂ h
  have hdecoded := congrArg decodeSchema h
  simpa only [M4a_schema, Option.some.injEq] using hdecoded

theorem encValue_inj : ObligationEncodeValueInjective := by
  unfold ObligationEncodeValueInjective
  intro v₁ v₂ h
  have hdecoded := congrArg decodeValue h
  simpa only [M4a_value, Option.some.injEq] using hdecoded

#print axioms M15_fresh
#print axioms M15_faithful_schema
#print axioms M15_faithful_entity
#print axioms encSchema_inj
#print axioms encValue_inj

end E2
