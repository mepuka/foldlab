/-
Seat module — M17, typed reachability (STORE-MODEL §5; ruling W3-7, route (i-a)). The
statement is pinned in `E2/Admission.lean`; this module supplies the proof only:

  theorem M17_typed_reachability : ObligationM17_typed_reachability

NO `H`-INJECTIVITY HYPOTHESIS, and none is used. Route (i-a) makes `Reachable.putE`'s
`Conforms` premise a statement about the STORED forms (`canonS s`, `canonV v`), which is
exactly what `resolveSchema` / `resolveEntity` return — so the inserted-entity case
closes by handing the premise back as the goal. The other cases never reach a carrier:

  * inserted SCHEMA — `resolveEntity` dies at `stripPre kindEntity`, because the second
    pre-image byte is `kindSchema`. Byte-level kind separation, not address separation;
    the `H`-collision question never arises.
  * old bindings — `M13_frame` preserves the entity's bytes AND its schema's binding, so
    both resolves are the ones the induction hypothesis already covers. The schema
    binding's survival is not assumed: it is WF2 (`M9`, proved in `E2/Closure.lean`) read
    through `resolveEntity`, which is what `resolveEntity_schema_bound` below supplies.

The anti-claims travel with the statement, not with the proof: M17 certifies conformance
UP TO UNION-MODE BLINDNESS (ruling Q12) and IN THE AMBIENT ENVIRONMENT, not in the store
(the store-coherent form is `ObligationM17'_store_env`, still unproved). See the doc
comment on the pinned statement.

Helper lemmas live here, in four groups: reading a checked lookup (`getChecked_find`,
`resolveEntity_bytes`), framing (`getChecked_putPre`, `resolveEntity_putPre`,
`resolveSchema_putPre`), the byte-level readings (`resolveEntity_of_getChecked_preimageS`,
`resolveEntity_of_getChecked_preimageE`, `resolveSchema_of_find_preimageS`), and WF2 read
through the resolver (`stripPre_eq_some`, `refsOfPreimage_of_resolveEntity`,
`resolveEntity_schema_bound`). Every one has an analogue in `Faithful`/`Closure`.

Edit no other module; a statement that resists proof is a STOP-and-report.
-/
import E2.Admission
import E2.Closure

namespace E2

/-! ## Reading a checked lookup

    `getChecked` is the only door into either resolver, so the resolve-shaped facts below
    all factor through these two. -/

/-- A checked lookup that succeeds exposes both halves of its check: the binding is in the
    map, and it hashes to the key it was found under. -/
theorem getChecked_find {H : Bytes → Address} {σ : StoreMap} {d : Address} {b : Bytes}
    (h : getChecked H σ d = some b) : σ.find d = some b ∧ H b = d := by
  unfold getChecked at h
  split at h
  · next b' hf =>
    split at h
    · next hh =>
      have hb : b' = b := Option.some.inj h
      subst hb
      exact ⟨hf, hh⟩
    · simp at h
  · simp at h

/-- A successful entity resolve had bytes to work from. -/
theorem resolveEntity_bytes {H : Bytes → Address} {σ : StoreMap} {d sAddr : Address}
    {w : Value} (h : resolveEntity H σ d = some (sAddr, w)) :
    ∃ b, getChecked H σ d = some b := by
  cases hg : getChecked H σ d with
  | none =>
    unfold resolveEntity at h
    simp only [hg] at h
    simp at h
  | some b => exact ⟨b, rfl⟩

/-! ## Framing: a put disturbs neither resolver at an address already bound. -/

theorem getChecked_putPre {H : Bytes → Address} {σ : StoreMap} {x : Bytes} {d : Address}
    (hd : (σ.find d).isSome) :
    getChecked H (putPre H σ x) d = getChecked H σ d := by
  unfold getChecked
  rw [M13_frame hd]

theorem resolveEntity_putPre {H : Bytes → Address} {σ : StoreMap} {x : Bytes}
    {d : Address} (hd : (σ.find d).isSome) :
    resolveEntity H (putPre H σ x) d = resolveEntity H σ d := by
  unfold resolveEntity
  rw [getChecked_putPre hd]

theorem resolveSchema_putPre {H : Bytes → Address} {σ : StoreMap} {x : Bytes}
    {d : Address} (hd : (σ.find d).isSome) :
    resolveSchema H (putPre H σ x) d = resolveSchema H σ d := by
  unfold resolveSchema
  rw [getChecked_putPre hd]

/-! ## The two byte-level readings. Both are `simp` with the named equation lemmas, per
    house lesson F-18 — `decide` cannot see through the mutual encoder. -/

/-- The inserted-SCHEMA case's closer: an entity resolve run against a schema pre-image
    dies at the kind byte. `kindSchema ≠ kindEntity` is the whole argument — no hash
    hypothesis, no injectivity. -/
theorem resolveEntity_of_getChecked_preimageS {H : Bytes → Address} {σ : StoreMap}
    {d : Address} {s : SchemaCore} (hg : getChecked H σ d = some (preimageS s)) :
    resolveEntity H σ d = none := by
  unfold resolveEntity
  rw [hg]
  simp [stripPre, preimageS, versionByte, kindSchema, kindEntity]

/-- The inserted-ENTITY case's reading: `decAddr_encAddress` then `M4a_value`, the same
    two steps `M15_faithful_entity` takes, and the value that comes back is the STORED
    one, `canonV v`. -/
theorem resolveEntity_of_getChecked_preimageE {H : Bytes → Address} {σ : StoreMap}
    {d sAddr : Address} {v : Value}
    (hg : getChecked H σ d = some (preimageE sAddr v)) :
    resolveEntity H σ d = some (sAddr, canonV v) := by
  unfold resolveEntity
  rw [hg]
  simp [stripPre, preimageE, versionByte, kindEntity, decAddr_encAddress, M4a_value]

/-- A schema pre-image bound at its own hash resolves to the stored canonical form
    (`M4a_schema`). The hash side-condition is `M8`'s job on reachable stores. -/
theorem resolveSchema_of_find_preimageS {H : Bytes → Address} {σ : StoreMap}
    {d : Address} {s : SchemaCore}
    (hfind : σ.find d = some (preimageS s)) (hhash : H (preimageS s) = d) :
    resolveSchema H σ d = some (canonS s) := by
  have hg : getChecked H σ d = some (preimageS s) := by
    simp [getChecked, hfind, hhash]
  unfold resolveSchema
  rw [hg]
  simp [stripPre, preimageS, versionByte, kindSchema, M4a_schema]

/-! ## WF2, read through `resolveEntity` -/

/-- A successful strip pins the byte string's shape: version byte, kind byte, body. -/
theorem stripPre_eq_some {kind : UInt8} {b body : Bytes}
    (h : stripPre kind b = some body) : b = versionByte :: kind :: body := by
  match b with
  | [] => simp [stripPre] at h
  | [_] => simp [stripPre] at h
  | ver :: knd :: rest =>
    simp only [stripPre] at h
    split at h
    · next hcond =>
      obtain ⟨hver, hknd⟩ := hcond
      subst hver
      subst hknd
      have hrest : rest = body := Option.some.inj h
      subst hrest
      rfl
    · simp at h

/-- `refsOfPreimage` and `resolveEntity` walk the same bytes: whatever schema address the
    resolver reports is the one heading M9's reference list for those bytes. -/
theorem refsOfPreimage_of_resolveEntity {H : Bytes → Address} {σ : StoreMap}
    {d sAddr : Address} {w : Value} {b : Bytes}
    (hg : getChecked H σ d = some b)
    (h : resolveEntity H σ d = some (sAddr, w)) :
    refsOfPreimage b = some (sAddr :: refsV w) := by
  unfold resolveEntity at h
  simp only [hg] at h
  cases hsp : stripPre kindEntity b with
  | none => simp [hsp] at h
  | some body =>
    simp only [hsp] at h
    obtain rfl := stripPre_eq_some hsp
    cases hda : decAddr body with
    | none => simp [hda] at h
    | some p =>
      obtain ⟨a, rest⟩ := p
      simp only [hda] at h
      cases hdv : decodeValue rest with
      | none => simp [hdv] at h
      | some w' =>
        simp only [hdv, Option.some.injEq, Prod.mk.injEq] at h
        obtain ⟨ha, hw⟩ := h
        subst ha
        subst hw
        simp [refsOfPreimage, versionByte, kindSchema, kindEntity, hda, hdv]

/-- On a reachable store the schema address an entity names is bound. This is WF2 (`M9`,
    `E2/Closure.lean`) read through `resolveEntity` — the fact the old-binding cases need
    before they may frame the schema side. -/
theorem resolveEntity_schema_bound {H : Bytes → Address} {env : ConformsEnv}
    {σ : StoreMap} {d sAddr : Address} {w : Value}
    (hσ : Reachable H env σ) (h : resolveEntity H σ d = some (sAddr, w)) :
    (σ.find sAddr).isSome := by
  obtain ⟨b, hg⟩ := resolveEntity_bytes h
  obtain ⟨hfind, _⟩ := getChecked_find hg
  obtain ⟨rs, hparse, hres⟩ := wf2_of_reachable hσ d b hfind
  rw [refsOfPreimage_of_resolveEntity hg h] at hparse
  have hrs : sAddr :: refsV w = rs := Option.some.inj hparse
  exact hres sAddr (by rw [← hrs]; simp)

/-! ## M17 -/

/-- The induction. Three cases, none of which inspects a carrier except the one whose
    premise IS the goal. -/
theorem typed_reachability {H : Bytes → Address} {env : ConformsEnv} {σ : StoreMap}
    (hσ : Reachable H env σ) :
    ∀ (d sAddr : Address) (w : Value) (s : SchemaCore),
      resolveEntity H σ d = some (sAddr, w) →
      resolveSchema H σ sAddr = some s →
      Conforms env s w := by
  induction hσ with
  | empty =>
      intro d sAddr w s he _
      unfold resolveEntity getChecked at he
      simp [StoreMap.find] at he
  | @putS σ s₀ hσ _ _ ih =>
      intro d sAddr w s he hs
      obtain ⟨b, hg⟩ := resolveEntity_bytes he
      obtain ⟨hfind, _⟩ := getChecked_find hg
      rcases find_putPre_cases
          (show (putPre H σ (preimageS s₀)).find d = some b from hfind) with rfl | hold
      · -- the inserted binding is a SCHEMA pre-image: no entity resolves off it
        rw [resolveEntity_of_getChecked_preimageS hg] at he
        simp at he
      · -- an old binding: frame both resolvers back onto `σ` and use the IH
        have hd : (σ.find d).isSome := by rw [hold]; rfl
        have heσ : resolveEntity H σ d = some (sAddr, w) := by
          rw [← resolveEntity_putPre (H := H) (x := preimageS s₀) hd]
          exact he
        have hsa : (σ.find sAddr).isSome := resolveEntity_schema_bound hσ heσ
        have hsσ : resolveSchema H σ sAddr = some s := by
          rw [← resolveSchema_putPre (H := H) (x := preimageS s₀) hsa]
          exact hs
        exact ih d sAddr w s heσ hsσ
  | @putE σ sAddr₀ v s₀ hσ hschema hconf _ _ ih =>
      intro d sAddr w s he hs
      obtain ⟨b, hg⟩ := resolveEntity_bytes he
      obtain ⟨hfind, _⟩ := getChecked_find hg
      rcases find_putPre_cases
          (show (putPre H σ (preimageE sAddr₀ v)).find d = some b from hfind) with rfl | hold
      · -- the inserted ENTITY: the resolvers return exactly the stored forms, and
        -- `putE`'s `Conforms` premise is the goal
        have hread := resolveEntity_of_getChecked_preimageE hg
        have heq := Option.some.inj (hread.symm.trans he)
        rw [Prod.mk.injEq] at heq
        obtain ⟨hA, hW⟩ := heq
        subst hA
        subst hW
        have hhash : H (preimageS s₀) = sAddr₀ := M8_wf1 hσ sAddr₀ (preimageS s₀) hschema
        have hsaSome : (σ.find sAddr₀).isSome := by rw [hschema]; rfl
        have hsput : resolveSchema H (putPre H σ (preimageE sAddr₀ v)) sAddr₀
            = some (canonS s₀) := by
          rw [resolveSchema_putPre hsaSome]
          exact resolveSchema_of_find_preimageS hschema hhash
        have hseq : canonS s₀ = s := Option.some.inj (hsput.symm.trans hs)
        subst hseq
        exact hconf
      · -- an old binding: identical to the `putS` old-binding case
        have hd : (σ.find d).isSome := by rw [hold]; rfl
        have heσ : resolveEntity H σ d = some (sAddr, w) := by
          rw [← resolveEntity_putPre (H := H) (x := preimageE sAddr₀ v) hd]
          exact he
        have hsa : (σ.find sAddr).isSome := resolveEntity_schema_bound hσ heσ
        have hsσ : resolveSchema H σ sAddr = some s := by
          rw [← resolveSchema_putPre (H := H) (x := preimageE sAddr₀ v) hsa]
          exact hs
        exact ih d sAddr w s heσ hsσ

/-- M17 — typed reachability, discharging the pinned statement in `E2/Admission.lean`. -/
theorem M17_typed_reachability : ObligationM17_typed_reachability := by
  unfold ObligationM17_typed_reachability
  intro H env σ hσ d sAddr w s he hs
  exact typed_reachability hσ d sAddr w s he hs

#print axioms M17_typed_reachability

end E2
