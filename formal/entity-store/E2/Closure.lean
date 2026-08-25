/-
Seat module — M9, WF2 over stored bytes (STORE-MODEL §3/§6). The statement is pinned in
`E2/Resolve.lean`; this module supplies the proof only:

  theorem M9_wf2 : ObligationM9_wf2

Helper lemmas live here (the canonicalization-preserves-references lemma is expected —
see the dispatch brief). This module may import `E2.Faithful`. End with `#print axioms`.
Edit no other module; a statement that resists proof is a STOP-and-report.
-/
import E2.Resolve
import E2.Faithful

namespace E2

/-- Inserting a schema field can only reorder the references from that field and the
    existing field list. -/
theorem mem_refsF_insertField (a : Address) (key : String) (val : SchemaCore)
    (opt : Bool) : ∀ fs : FieldList,
    a ∈ refsF (insertField key val opt fs) →
      a ∈ refsS val ∨ a ∈ refsF fs
  | .nil => by
      simp [insertField, refsF]
  | .cons k v o rest => by
      intro h
      simp only [insertField] at h
      split at h
      · simpa [refsF, List.mem_append] using h
      · simp only [refsF, List.mem_append] at h ⊢
        rcases h with hv | hins
        · exact Or.inr (Or.inl hv)
        · rcases mem_refsF_insertField a key val opt rest hins with hval | hrest
          · exact Or.inl hval
          · exact Or.inr (Or.inr hrest)

/-- Value-field insertion has the analogous reference containment property. -/
theorem mem_refsVF_insertVField (a : Address) (key : String) (val : Value) :
    ∀ fs : ValueFields,
    a ∈ refsVF (insertVField key val fs) →
      a ∈ refsV val ∨ a ∈ refsVF fs
  | .nil => by
      simp [insertVField, refsVF]
  | .cons k v rest => by
      intro h
      simp only [insertVField] at h
      split at h
      · simpa [refsVF, List.mem_append] using h
      · simp only [refsVF, List.mem_append] at h ⊢
        rcases h with hv | hins
        · exact Or.inr (Or.inl hv)
        · rcases mem_refsVF_insertVField a key val rest hins with hval | hrest
          · exact Or.inl hval
          · exact Or.inr (Or.inr hrest)

mutual
/-- Schema canonicalization does not introduce references. -/
theorem mem_refsS_canon (a : Address) : ∀ s : SchemaCore,
    a ∈ refsS (canonS s) → a ∈ refsS s
  | .prim p => by simp [canonS, refsS]
  | .lit v => by simp [canonS, refsS]
  | .address => by simp [canonS, refsS]
  | .object fs => by
      intro h
      exact mem_refsF_canon a fs h
  | .tuple es => by
      intro h
      exact mem_refsL_canon a es h
  | .array e => by
      intro h
      exact mem_refsS_canon a e h
  | .union m ms => by
      intro h
      exact mem_refsL_canon a ms h
  | .refine s c => by
      intro h
      exact mem_refsS_canon a s h
  | .ref d => by simp [canonS, refsS]
  | .var i => by simp [canonS, refsS]
  | .mu d body => by
      intro h
      exact mem_refsS_canon a body h

theorem mem_refsF_canon (a : Address) : ∀ fs : FieldList,
    a ∈ refsF (canonFields fs) → a ∈ refsF fs
  | .nil => by simp [canonFields, refsF]
  | .cons key val opt rest => by
      intro h
      rcases mem_refsF_insertField a key (canonS val) opt (canonFields rest) h with
        hval | hrest
      · exact List.mem_append_left _ (mem_refsS_canon a val hval)
      · exact List.mem_append_right _ (mem_refsF_canon a rest hrest)

theorem mem_refsL_canon (a : Address) : ∀ ss : SchemaList,
    a ∈ refsL (canonList ss) → a ∈ refsL ss
  | .nil => by simp [canonList, refsL]
  | .cons hd tl => by
      intro h
      simp only [canonList, refsL, List.mem_append] at h ⊢
      rcases h with hhd | htl
      · exact Or.inl (mem_refsS_canon a hd hhd)
      · exact Or.inr (mem_refsL_canon a tl htl)
end

mutual
/-- Value canonicalization does not introduce references. -/
theorem mem_refsV_canon (a : Address) : ∀ v : Value,
    a ∈ refsV (canonV v) → a ∈ refsV v
  | .vnull => by simp [canonV, refsV]
  | .vbool b => by simp [canonV, refsV]
  | .vint n => by simp [canonV, refsV]
  | .vstr s => by simp [canonV, refsV]
  | .vaddr d => by simp [canonV, refsV]
  | .varr vs => by
      intro h
      exact mem_refsVL_canon a vs h
  | .vobj fs => by
      intro h
      exact mem_refsVF_canon a fs h

theorem mem_refsVL_canon (a : Address) : ∀ vs : ValueList,
    a ∈ refsVL (canonVList vs) → a ∈ refsVL vs
  | .nil => by simp [canonVList, refsVL]
  | .cons hd tl => by
      intro h
      simp only [canonVList, refsVL, List.mem_append] at h ⊢
      rcases h with hhd | htl
      · exact Or.inl (mem_refsV_canon a hd hhd)
      · exact Or.inr (mem_refsVL_canon a tl htl)

theorem mem_refsVF_canon (a : Address) : ∀ fs : ValueFields,
    a ∈ refsVF (canonVFields fs) → a ∈ refsVF fs
  | .nil => by simp [canonVFields, refsVF]
  | .cons key val rest => by
      intro h
      rcases mem_refsVF_insertVField a key (canonV val) (canonVFields rest) h with
        hval | hrest
      · exact List.mem_append_left _ (mem_refsV_canon a val hval)
      · exact List.mem_append_right _ (mem_refsVF_canon a rest hrest)
end

theorem allResolve_canonS {σ : StoreMap} {s : SchemaCore}
    (h : AllResolve σ (refsS s)) : AllResolve σ (refsS (canonS s)) := by
  intro a ha
  exact h a (mem_refsS_canon a s ha)

theorem allResolve_canonV {σ : StoreMap} {v : Value}
    (h : AllResolve σ (refsV v)) : AllResolve σ (refsV (canonV v)) := by
  intro a ha
  exact h a (mem_refsV_canon a v ha)

theorem allResolve_putPre {H : Bytes → Address} {σ : StoreMap} {rs : List Address}
    {b : Bytes} (h : AllResolve σ rs) : AllResolve (putPre H σ b) rs := by
  intro a ha
  have hsome := h a ha
  rw [M13_frame hsome]
  exact hsome

theorem refsOfPreimage_preimageS (s : SchemaCore) :
    refsOfPreimage (preimageS s) = some (refsS (canonS s)) := by
  simp [refsOfPreimage, preimageS, versionByte, kindSchema, M4a_schema]

theorem refsOfPreimage_preimageE (sAddr : Address) (v : Value) :
    refsOfPreimage (preimageE sAddr v) = some (sAddr :: refsV (canonV v)) := by
  simp [refsOfPreimage, preimageE, versionByte, kindSchema, kindEntity,
    decAddr_encAddress, M4a_value]

/-- A binding found after insertion is either the inserted pre-image or an old binding. -/
theorem find_putPre_cases {H : Bytes → Address} {σ : StoreMap} {inserted b : Bytes}
    {d : Address}
    (h : (putPre H σ inserted).find d = some b) :
    b = inserted ∨ σ.find d = some b := by
  unfold putPre at h
  split at h
  · exact Or.inr h
  · simp only [StoreMap.find] at h
    split at h
    · cases h
      exact Or.inl rfl
    · exact Or.inr h

/-- WF2 follows by induction over the only three ways a reachable store is formed. -/
theorem wf2_of_reachable {H : Bytes → Address} {env : ConformsEnv} {σ : StoreMap}
    (hσ : Reachable H env σ) :
    ∀ d b, σ.find d = some b →
      ∃ rs, refsOfPreimage b = some rs ∧ AllResolve σ rs := by
  induction hσ with
  | empty =>
      intro d b hfind
      simp [StoreMap.find] at hfind
  | @putS σ s _ _ href ih =>
      intro d b hfind
      rcases find_putPre_cases (show
          (putPre H σ (preimageS s)).find d = some b from hfind) with
        hinserted | hold
      · subst b
        refine ⟨refsS (canonS s), refsOfPreimage_preimageS s, ?_⟩
        simpa [putSchema] using
          (allResolve_putPre (H := H) (b := preimageS s) (allResolve_canonS href))
      · rcases ih d b hold with ⟨rs, hparse, hresolve⟩
        refine ⟨rs, hparse, ?_⟩
        simpa [putSchema] using
          (allResolve_putPre (H := H) (b := preimageS s) hresolve)
  | @putE σ sAddr v s _ hschema _ href ih =>
      intro d b hfind
      rcases find_putPre_cases (show
          (putPre H σ (preimageE sAddr v)).find d = some b from hfind) with
        hinserted | hold
      · subst b
        refine ⟨sAddr :: refsV (canonV v), refsOfPreimage_preimageE sAddr v, ?_⟩
        have hresolveOld : AllResolve σ (sAddr :: refsV (canonV v)) := by
          intro a ha
          simp only [List.mem_cons] at ha
          rcases ha with rfl | ha
          · rw [hschema]
            simp
          · exact allResolve_canonV href a ha
        simpa [putEntity] using
          (allResolve_putPre (H := H) (b := preimageE sAddr v) hresolveOld)
      · rcases ih d b hold with ⟨rs, hparse, hresolve⟩
        refine ⟨rs, hparse, ?_⟩
        simpa [putEntity] using
          (allResolve_putPre (H := H) (b := preimageE sAddr v) hresolve)

theorem M9_wf2 : ObligationM9_wf2 := by
  unfold ObligationM9_wf2
  intro H env σ hσ d b hfind
  exact wf2_of_reachable hσ d b hfind

#print axioms M9_wf2

end E2
