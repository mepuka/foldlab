/-
Seat module — S1 and its value twin, in the UNCONDITIONAL form W3-19 restored. The
statements are pinned in `E2/Obligations.lean`; this module supplies the proofs only:

  theorem S1_canon_idempotent   : ObligationCanonIdempotent
  theorem S1_canon_v_idempotent : ObligationCanonVIdempotent

Route (W3-19, finding F-48). R-E's P10 offers idempotence as a corollary of the core
`List.mergeSort` lemmas, but that route does not reach this carrier: `FieldList` and
`ValueFields` are bespoke nested inductives, not `List`, and converting inside the mutual
block would cost `termination_by structural` (R-E §5.2 named this caveat). So the sort's
own invariant is proved here instead, by hand, on the estate's own carrier. It is the
textbook insertion-sort argument, and the flipped guard is exactly what makes it go
through:

  * `insertField` inserts at the FRONT precisely when the head key is not below the
    incoming key — verbatim the adjacent-pair test `fieldsSortedB` decides — so a list
    the sort already produced is a fixed point of a re-insertion at its own head. Under
    the pre-W3-19 guard this step is FALSE on a tie, which is the whole of F-12.
  * the only order fact required is asymmetry of `String.lt` (`String.lt_asymm`, Lean
    core). No transitivity, no totality, no mathlib.

`CanonF`/`CanonVF` below bundle the two things a canonical field list knows about itself:
adjacent-pair sortedness, and that every payload is already a canonicalizer fixed point.
Edit no other module; a statement that resists proof is a STOP-and-report.
-/
import E2.Obligations

namespace E2

/-! ## The head relation both sorts maintain.

    `headNotLtF key fs` says the head key of `fs`, if any, is not strictly below `key`.
    It is the guard `insertField` decides and the adjacent-pair test `fieldsSortedB`
    decides — one relation, so the sort and the sortedness predicate cannot drift. -/

def headNotLtVF (key : String) : ValueFields → Bool
  | .nil => true
  | .cons k _ _ => !decide (k < key)

def headNotLtF (key : String) : FieldList → Bool
  | .nil => true
  | .cons k _ _ _ => !decide (k < key)

/-! ## Canonical field lists: sorted, with every payload a canonicalizer fixed point. -/

inductive CanonVF : ValueFields → Prop
  | nil : CanonVF .nil
  | cons {k : String} {v : Value} {rest : ValueFields} :
      canonV v = v → headNotLtVF k rest = true → CanonVF rest →
      CanonVF (.cons k v rest)

inductive CanonF : FieldList → Prop
  | nil : CanonF .nil
  | cons {k : String} {v : SchemaCore} {opt : Bool} {rest : FieldList} :
      canonS v = v → headNotLtF k rest = true → CanonF rest →
      CanonF (.cons k v opt rest)

/-! ## Value plane. -/

/-- The front-insertion step. This is the lemma the W3-19 flip buys: on a tie the guard
    is TRUE, so the incoming field lands before the run instead of walking past it. -/
theorem insertVField_of_headNotLt (key : String) (val : Value) :
    ∀ fs : ValueFields, headNotLtVF key fs = true →
      insertVField key val fs = .cons key val fs
  | .nil, _ => rfl
  | .cons k v rest, h => by
      simp only [headNotLtVF] at h
      simp only [insertVField, h, if_pos]

/-- Insertion cannot lower the head key below a bound the list already respects. -/
theorem headNotLtVF_insertVField (k₀ key : String) (val : Value) :
    ∀ fs : ValueFields, headNotLtVF k₀ fs = true → (!decide (key < k₀)) = true →
      headNotLtVF k₀ (insertVField key val fs) = true
  | .nil, _, hk => by simpa [insertVField, headNotLtVF] using hk
  | .cons k v rest, h, hk => by
      simp only [insertVField]
      split
      · simpa [headNotLtVF] using hk
      · simpa [headNotLtVF] using h

/-- Insertion of a canonical payload preserves canonicity of the list. -/
theorem CanonVF_insertVField (key : String) (val : Value) (hval : canonV val = val) :
    ∀ fs : ValueFields, CanonVF fs → CanonVF (insertVField key val fs)
  | .nil, _ => by
      simpa [insertVField] using CanonVF.cons hval (by simp [headNotLtVF]) CanonVF.nil
  | .cons k v rest, h => by
      cases h with
      | cons hv hhead hrest =>
        simp only [insertVField]
        split
        · rename_i hguard
          exact CanonVF.cons hval (by simpa [headNotLtVF] using hguard)
            (CanonVF.cons hv hhead hrest)
        · rename_i hguard
          have hlt : k < key := by simpa using hguard
          exact CanonVF.cons hv
            (headNotLtVF_insertVField k key val rest hhead
              (by simpa using String.lt_asymm hlt))
            (CanonVF_insertVField key val hval rest hrest)

/-- A canonical field list is a fixed point of the sort. -/
theorem canonVFields_id_of_CanonVF :
    ∀ fs : ValueFields, CanonVF fs → canonVFields fs = fs
  | .nil, _ => rfl
  | .cons k v rest, h => by
      cases h with
      | cons hv hhead hrest =>
        rw [canonVFields, canonVFields_id_of_CanonVF rest hrest, hv,
            insertVField_of_headNotLt k v rest hhead]

mutual
/-- S1 value twin, unconditional: `canonV` is idempotent on EVERY value, duplicate keys
    included (W3-19/F-48). -/
theorem canonV_idem : ∀ v : Value, canonV (canonV v) = canonV v
  | .vnull => rfl
  | .vbool _ => rfl
  | .vint _ => rfl
  | .vstr _ => rfl
  | .vaddr _ => rfl
  | .varr vs => by rw [canonV, canonV, canonVList_idem vs]
  | .vobj fs => by
      rw [canonV, canonV, canonVFields_id_of_CanonVF _ (canonVFields_canon fs)]
  termination_by structural x => x

theorem canonVFields_canon : ∀ fs : ValueFields, CanonVF (canonVFields fs)
  | .nil => by rw [canonVFields]; exact CanonVF.nil
  | .cons k v rest => by
      rw [canonVFields]
      exact CanonVF_insertVField k (canonV v) (canonV_idem v) _ (canonVFields_canon rest)
  termination_by structural x => x

theorem canonVList_idem : ∀ vs : ValueList, canonVList (canonVList vs) = canonVList vs
  | .nil => rfl
  | .cons hd tl => by rw [canonVList, canonVList, canonV_idem hd, canonVList_idem tl]
  termination_by structural x => x
end

/-! ## Schema plane. Same three lemmas, same shape; `canonS` at `.lit` consumes the value
    plane's result (A-6). -/

theorem insertField_of_headNotLt (key : String) (val : SchemaCore) (opt : Bool) :
    ∀ fs : FieldList, headNotLtF key fs = true →
      insertField key val opt fs = .cons key val opt fs
  | .nil, _ => rfl
  | .cons k v o rest, h => by
      simp only [headNotLtF] at h
      simp only [insertField, h, if_pos]

theorem headNotLtF_insertField (k₀ key : String) (val : SchemaCore) (opt : Bool) :
    ∀ fs : FieldList, headNotLtF k₀ fs = true → (!decide (key < k₀)) = true →
      headNotLtF k₀ (insertField key val opt fs) = true
  | .nil, _, hk => by simpa [insertField, headNotLtF] using hk
  | .cons k v o rest, h, hk => by
      simp only [insertField]
      split
      · simpa [headNotLtF] using hk
      · simpa [headNotLtF] using h

theorem CanonF_insertField (key : String) (val : SchemaCore) (opt : Bool)
    (hval : canonS val = val) :
    ∀ fs : FieldList, CanonF fs → CanonF (insertField key val opt fs)
  | .nil, _ => by
      simpa [insertField] using CanonF.cons (opt := opt) hval (by simp [headNotLtF]) CanonF.nil
  | .cons k v o rest, h => by
      cases h with
      | cons hv hhead hrest =>
        simp only [insertField]
        split
        · rename_i hguard
          exact CanonF.cons hval (by simpa [headNotLtF] using hguard)
            (CanonF.cons hv hhead hrest)
        · rename_i hguard
          have hlt : k < key := by simpa using hguard
          exact CanonF.cons hv
            (headNotLtF_insertField k key val opt rest hhead
              (by simpa using String.lt_asymm hlt))
            (CanonF_insertField key val opt hval rest hrest)

theorem canonFields_id_of_CanonF :
    ∀ fs : FieldList, CanonF fs → canonFields fs = fs
  | .nil, _ => rfl
  | .cons k v o rest, h => by
      cases h with
      | cons hv hhead hrest =>
        rw [canonFields, canonFields_id_of_CanonF rest hrest, hv,
            insertField_of_headNotLt k v o rest hhead]

mutual
/-- S1, unconditional: `canonS` is idempotent on EVERY schema (W3-19/F-48). -/
theorem canonS_idem : ∀ s : SchemaCore, canonS (canonS s) = canonS s
  | .prim _ => rfl
  | .address => rfl
  | .ref _ => rfl
  | .var _ => rfl
  | .lit v => by rw [canonS, canonS, canonV_idem v]
  | .array e => by rw [canonS, canonS, canonS_idem e]
  | .refine s _ => by rw [canonS, canonS, canonS_idem s]
  | .mu _ b => by rw [canonS, canonS, canonS_idem b]
  | .record cod => by rw [canonS, canonS, canonS_idem cod]
  | .tuple es => by rw [canonS, canonS, canonList_idem es]
  | .union _ ms => by rw [canonS, canonS, canonList_idem ms]
  | .tupleRest es rest => by
      rw [canonS, canonS, canonList_idem es, canonS_idem rest]
  | .object fs => by
      rw [canonS, canonS, canonFields_id_of_CanonF _ (canonFields_canon fs)]
  termination_by structural x => x

theorem canonFields_canon : ∀ fs : FieldList, CanonF (canonFields fs)
  | .nil => by rw [canonFields]; exact CanonF.nil
  | .cons k v opt rest => by
      rw [canonFields]
      exact CanonF_insertField k (canonS v) opt (canonS_idem v) _ (canonFields_canon rest)
  termination_by structural x => x

theorem canonList_idem : ∀ es : SchemaList, canonList (canonList es) = canonList es
  | .nil => rfl
  | .cons hd tl => by rw [canonList, canonList, canonS_idem hd, canonList_idem tl]
  termination_by structural x => x
end

/-! ## The obligations, discharged in the form W3-19 restored. -/

theorem S1_canon_idempotent : ObligationCanonIdempotent := canonS_idem

theorem S1_canon_v_idempotent : ObligationCanonVIdempotent := canonV_idem

#print axioms S1_canon_idempotent
#print axioms S1_canon_v_idempotent

end E2
