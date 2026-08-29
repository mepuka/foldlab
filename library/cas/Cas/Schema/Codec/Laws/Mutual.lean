import Cas.Schema.Codec.Core

/-!
# Mutual schema codec law proofs

The forward and image-exactness law families must elaborate together.
Lean's generated functional-induction terms for this well-founded mutual
decoder otherwise emit colliding private auxiliary names when compiled
in separate modules.

Each family is proved once for values, fields, and lists; the public
theorems are projections of those bundled proofs.
-/

namespace Cas.Schema

set_option maxHeartbeats 1600000

/-! ## Forward — under canonical fields -/

/-- The forward round trip for all three codec functions, from ONE
functional induction over the mutual block. The three public theorems
below are its projections — the fields and list laws are not re-proved,
so they cannot drift from the value law. -/
private theorem roundtrip_all :
    (∀ (a : Ast) (v : Json.Value), a.WF → ∀ (x : El a),
        v = encode a x → decode a v = some x)
  ∧ (∀ (fs : List (String × Bool × Ast)) (kvs : List (String × Json.Value)),
        (fs.map (fun f => f.1)).Nodup → WFFields fs → ∀ (x : ElFields fs),
        kvs = encodeFields fs x → decodeFields fs kvs = some x)
  ∧ (∀ (a : Ast) (vs : List Json.Value), a.WF → ∀ (xs : List (El a)),
        vs = xs.map (encode a) → decodeList a vs = some xs) := by
  refine decode.mutual_induct_unfolding
    (motive1 := fun a v out => ∀ (ha : a.WF) (x : El a),
      v = encode a x → out = some x)
    (motive2 := fun fs kvs out =>
      ∀ (hnd : (fs.map (fun f => f.1)).Nodup) (hwf : WFFields fs)
        (x : ElFields fs), kvs = encodeFields fs x → out = some x)
    (motive3 := fun a vs out => ∀ (ha : a.WF) (xs : List (El a)),
      vs = xs.map (encode a) → out = some xs)
    ?case1 ?case2 ?case3 ?case4 ?case5 ?case6 ?case7 ?case8 ?case9 ?case10
    ?case11 ?case12 ?case13 ?case14 ?case15 ?case16 ?case17 ?case18 ?case19
    ?case20 ?case21 ?case22 ?case23 ?case24
  case case1 => intro _ x _; cases x; rfl
  case case2 =>
    intro b
    intro _ x hv
    simp only [encode] at hv
    injection hv with hx
    subst hx
    rfl
  case case3 =>
    intro v
    intro _ x hv
    rw [hv]
    change decInt (encInt x) = some x
    exact decInt_encInt x
  case case4 =>
    intro s
    intro _ x hv
    simp only [encode] at hv
    injection hv with hx
    subst hx
    rfl
  case case5 => intro _ x _; cases x; rfl
  case case6 => intro b' _ x _; cases x; rfl
  case case7 =>
    intro b b' hne
    intro _ x hv
    cases x
    simp only [encode, encLit] at hv
    injection hv with he
    exact absurd he hne
  case case8 =>
    intro i v
    intro _ x hv
    cases x
    rw [hv]
    simp only [encode, encLit, decInt_encInt, Option.bind_some, if_true]
  case case9 => intro s' _ x _; cases x; rfl
  case case10 =>
    intro s s' hne
    intro _ x hv
    cases x
    simp only [encode, encLit] at hv
    injection hv with he
    exact absurd he hne
  case case11 =>
    intro a vs ih
    intro ha xs hv
    simp only [Ast.WF] at ha
    simp only [encode] at hv
    injection hv with hvs
    exact ih ha xs hvs
  case case12 =>
    intro fs kvs ih
    intro ha x hv
    simp only [Ast.WF] at ha
    simp only [encode] at hv
    injection hv with hkvs
    exact ih (sorted_names_nodup ha.1) ha.2 x hkvs
  case case13 =>
    intro t v
    intro _ r hv
    obtain ⟨addr⟩ := r
    rw [hv]
    simp only [encode, decRef_encRef]
    change some (StoreRef.mk addr) = some (StoreRef.mk addr)
    rfl
  case case14 =>
    intro schema value hnull hbool hint hstr hlitnull hlitbool
      hlitint hlitstr harr hstruct href
    intro _ x hv
    cases schema with
    | null => exact False.elim (hnull rfl (by simpa only [encode] using hv))
    | bool => exact False.elim (hbool x rfl (by simpa only [encode] using hv))
    | int => exact False.elim (hint rfl)
    | str => exact False.elim (hstr x rfl (by simpa only [encode] using hv))
    | lit l =>
      cases l with
      | null =>
        exact False.elim (hlitnull rfl (by simpa only [encode, encLit] using hv))
      | bool b =>
        exact False.elim
          (hlitbool b b rfl (by simpa only [encode, encLit] using hv))
      | int i => exact False.elim (hlitint i rfl)
      | str s =>
        exact False.elim
          (hlitstr s s rfl (by simpa only [encode, encLit] using hv))
    | arr item =>
      exact False.elim
        (harr item (x.map (encode item)) rfl (by simpa only [encode] using hv))
    | struct fs =>
      exact False.elim
        (hstruct fs (encodeFields fs x) rfl (by simpa only [encode] using hv))
    | ref t => exact False.elim (href t rfl)
    | decl _ _ _ => exact x.elim
  case case15 =>
    intro hnd hwf x hv
    cases x
    rfl
  case case16 =>
    intro head tail hnd hwf x hv
    cases x
    simp only [encodeFields] at hv
    exact nomatch hv
  case case17 =>
    intro fst snd fs ih hnd hwf x hv
    obtain ⟨xv, rest⟩ := x
    simp only [List.map_cons, List.nodup_cons] at hnd
    have hnd' : (fs.map (fun f => f.1)).Nodup := hnd.2
    cases xv with
    | some value =>
      simp only [encodeFields, List.singleton_append] at hv
      exact nomatch hv
    | none =>
      simp only [encodeFields, List.nil_append] at hv
      change (decodeFields fs []).bind (fun tail => some (none, tail)) =
        some (none, rest)
      rw [ih hnd' hwf.2 rest hv]
      simp only [Option.bind_some]
  case case18 =>
    intro fst snd tail hnd hwf x hv
    obtain ⟨value, rest⟩ := x
    simp only [encodeFields] at hv
    exact nomatch hv
  case case19 =>
    intro a fs k v kvs ihv ihr hnd hwf x hv
    obtain ⟨xv, rest⟩ := x
    simp only [List.map_cons, List.nodup_cons] at hnd
    have hnotin : k ∉ fs.map (fun f => f.1) := hnd.1
    have hnd' : (fs.map (fun f => f.1)).Nodup := hnd.2
    simp only at ⊢
    cases xv with
    | some value =>
      simp only [encodeFields, List.singleton_append] at hv
      injection hv with hhead hkvs
      injection hhead with hkey hv'
      rw [ihv hwf.1 value hv', ihr hnd' hwf.2 rest hkvs]
      simp only [if_true, Option.bind_some]
    | none =>
      simp only [encodeFields, List.nil_append] at hv
      have hk : k ∈ fs.map (fun f => f.1) := by
        refine encodeFields_keys fs rest k ?_
        rw [← hv]
        simp
      exact absurd hk hnotin
  case case20 =>
    intro n a fs k v kvs hkn ihr hnd hwf x hv
    obtain ⟨xv, rest⟩ := x
    simp only [List.map_cons, List.nodup_cons] at hnd
    have hnd' : (fs.map (fun f => f.1)).Nodup := hnd.2
    simp only [if_neg hkn] at ⊢
    cases xv with
    | some value =>
      simp only [encodeFields, List.singleton_append] at hv
      injection hv with hhead htail
      injection hhead with hk hv'
      exact absurd hk hkn
    | none =>
      simp only [encodeFields, List.nil_append] at hv
      rw [ihr hnd' hwf.2 rest hv]
      simp only [Option.bind_some]
  case case21 =>
    intro a fs k v kvs ihv ihr hnd hwf x hv
    obtain ⟨value, rest⟩ := x
    simp only [List.map_cons, List.nodup_cons] at hnd
    have hnd' : (fs.map (fun f => f.1)).Nodup := hnd.2
    simp only at ⊢
    simp only [encodeFields] at hv
    injection hv with hhead hkvs
    injection hhead with hkey hv'
    rw [ihv hwf.1 value hv', ihr hnd' hwf.2 rest hkvs]
    simp only [if_true, Option.bind_some]
  case case22 =>
    intro n a fs k v kvs hkn hnd hwf x hv
    obtain ⟨value, rest⟩ := x
    simp only [if_neg hkn] at ⊢
    simp only [encodeFields] at hv
    injection hv with hhead htail
    injection hhead with hk hv'
    exact absurd hk hkn
  case case23 =>
    intro a ha xs hv
    cases xs with
    | nil => rfl
    | cons x xs =>
      simp only [List.map_cons] at hv
      exact nomatch hv
  case case24 =>
    intro a v vs ihv ihr ha xs hv
    cases xs with
    | nil =>
      simp only [List.map_nil] at hv
      exact nomatch hv
    | cons x xs =>
      simp only [List.map_cons] at hv
      injection hv with hv' hvs
      change (decode a v).bind (fun y =>
        (decodeList a vs).bind (fun tail => some (y :: tail))) = some (x :: xs)
      rw [ihv ha x hv', ihr ha xs hvs]
      simp only [Option.bind_some]

theorem decode_encode (a : Ast) (ha : a.WF) (x : El a) :
    decode a (encode a x) = some x :=
  roundtrip_all.1 a (encode a x) ha x rfl

theorem decodeList_encodeList : ∀ (a : Ast), a.WF → ∀ (xs : List (El a)),
    decodeList a (xs.map (encode a)) = some xs :=
  fun a ha xs => roundtrip_all.2.2 a (xs.map (encode a)) ha xs rfl

theorem decodeFields_encodeFields :
    ∀ (fs : List (String × Bool × Ast)),
      (fs.map (fun f => f.1)).Nodup → WFFields fs → ∀ (x : ElFields fs),
        decodeFields fs (encodeFields fs x) = some x :=
  fun fs hnd hwf x => roundtrip_all.2.1 fs (encodeFields fs x) hnd hwf x rfl

/-! ## Exactness — no premise -/

/-- Image exactness for all three codec functions, from ONE functional
induction. No well-formedness premise: the decoder accepts nothing
outside the encoder's image, whatever the code. -/
private theorem exact_all :
    (∀ (a : Ast) (v : Json.Value), ∀ {x : El a},
        decode a v = some x → v = encode a x)
  ∧ (∀ (fs : List (String × Bool × Ast)) (kvs : List (String × Json.Value)),
        ∀ {x : ElFields fs},
        decodeFields fs kvs = some x → kvs = encodeFields fs x)
  ∧ (∀ (a : Ast) (vs : List Json.Value), ∀ {xs : List (El a)},
        decodeList a vs = some xs → vs = xs.map (encode a)) := by
  refine decode.mutual_induct_unfolding
    (motive1 := fun a v out => ∀ {x : El a}, out = some x → v = encode a x)
    (motive2 := fun fs kvs out => ∀ {x : ElFields fs},
      out = some x → kvs = encodeFields fs x)
    (motive3 := fun a vs out => ∀ {xs : List (El a)},
      out = some xs → vs = xs.map (encode a))
    ?case1 ?case2 ?case3 ?case4 ?case5 ?case6 ?case7 ?case8 ?case9 ?case10
    ?case11 ?case12 ?case13 ?case14 ?case15 ?case16 ?case17 ?case18 ?case19
    ?case20 ?case21 ?case22 ?case23 ?case24
  case case1 => intro x h; cases x; rfl
  case case2 => intro b x h; injection h with hx; subst hx; rfl
  case case3 => intro v x h; exact decInt_exact h
  case case4 => intro s x h; injection h with hx; subst hx; rfl
  case case5 => intro x h; cases x; rfl
  case case6 => intro b' x h; cases x; rfl
  case case7 => intro b b' hne x h; exact nomatch h
  case case8 =>
    intro i v x h
    cases x
    cases hd : decInt v with
    | none => rw [hd] at h; exact nomatch h
    | some j =>
      rw [hd] at h
      simp only [Option.bind_some] at h
      split at h
      next he =>
        subst he
        simpa only [encode, encLit] using decInt_exact hd
      next => exact nomatch h
  case case9 => intro s' x h; cases x; rfl
  case case10 => intro s s' hne x h; exact nomatch h
  case case11 =>
    intro a vs ih x h
    simp only [encode]
    rw [ih h]
  case case12 =>
    intro fs kvs ih x h
    simp only [encode]
    rw [ih h]
  case case13 =>
    intro t v x h
    cases hd : decRef t v with
    | none => rw [hd] at h; exact nomatch h
    | some addr =>
      rw [hd] at h
      change some { addr := addr } = some x at h
      injection h with hx
      subst hx
      simp only [encode]
      exact decRef_exact hd
  case case14 =>
    intro _ _ _ _ _ _ _ _ _ _ _ _ _ x h
    exact nomatch h
  case case15 =>
    intro x h
    change some () = some x at h
    cases x
    rfl
  case case16 =>
    intro head tail x h
    change none = some x at h
    exact nomatch h
  case case17 =>
    intro fst snd fs ih x h
    obtain ⟨xv, rest⟩ := x
    change (decodeFields fs []).bind (fun rest => some (none, rest)) =
      some (xv, rest) at h
    cases hr : decodeFields fs [] with
    | none => rw [hr] at h; exact nomatch h
    | some tail =>
      rw [hr] at h
      simp only [Option.bind_some] at h
      injection h with hp
      injection hp with hxv hrest
      subst hxv
      subst hrest
      simp only [encodeFields, List.nil_append]
      exact ih hr
  case case18 =>
    intro fst snd tail x h
    change none = some x at h
    exact nomatch h
  case case19 =>
    intro a fs k v kvs ihv ihr x h
    obtain ⟨xv, rest⟩ := x
    simp only at h
    change (decode a v).bind (fun y =>
      (decodeFields fs kvs).bind (fun tail => some (some y, tail))) =
        some (xv, rest) at h
    cases hd : decode a v with
    | none => rw [hd] at h; exact nomatch h
    | some y =>
      cases ht : decodeFields fs kvs with
      | none => rw [hd, ht] at h; exact nomatch h
      | some tail =>
        rw [hd, ht] at h
        simp only [Option.bind_some] at h
        injection h with hp
        injection hp with hxv hrest
        subst hxv
        subst hrest
        simp only [encodeFields, List.singleton_append]
        rw [← ihv hd, ← ihr ht]
  case case20 =>
    intro n a fs k v kvs hkn ihr x h
    obtain ⟨xv, rest⟩ := x
    simp only [if_neg hkn] at h
    change (decodeFields fs ((k, v) :: kvs)).bind
      (fun tail => some (none, tail)) = some (xv, rest) at h
    cases ht : decodeFields fs ((k, v) :: kvs) with
    | none => rw [ht] at h; exact nomatch h
    | some tail =>
      rw [ht] at h
      simp only [Option.bind_some] at h
      injection h with hp
      injection hp with hxv hrest
      subst hxv
      subst hrest
      simp only [encodeFields, List.nil_append]
      exact ihr ht
  case case21 =>
    intro a fs k v kvs ihv ihr x h
    obtain ⟨xv, rest⟩ := x
    simp only at h
    change (decode a v).bind (fun y =>
      (decodeFields fs kvs).bind (fun tail => some (y, tail))) =
        some (xv, rest) at h
    cases hd : decode a v with
    | none => rw [hd] at h; exact nomatch h
    | some y =>
      cases ht : decodeFields fs kvs with
      | none => rw [hd, ht] at h; exact nomatch h
      | some tail =>
        rw [hd, ht] at h
        simp only [Option.bind_some] at h
        injection h with hp
        injection hp with hxv hrest
        subst hxv
        subst hrest
        simp only [encodeFields]
        rw [← ihv hd, ← ihr ht]
  case case22 =>
    intro n a fs k v kvs hkn x h
    simp only [if_neg hkn] at h
    change none = some x at h
    exact nomatch h
  case case23 =>
    intro a xs h
    change some [] = some xs at h
    injection h with hx
    subst hx
    rfl
  case case24 =>
    intro a v vs ihv ihr xs h
    change (decode a v).bind (fun y =>
      (decodeList a vs).bind (fun tail => some (y :: tail))) = some xs at h
    cases hd : decode a v with
    | none => rw [hd] at h; exact nomatch h
    | some y =>
      cases ht : decodeList a vs with
      | none => rw [hd, ht] at h; exact nomatch h
      | some tail =>
        rw [hd, ht] at h
        simp only [Option.bind_some] at h
        injection h with hx
        subst hx
        simp only [List.map_cons]
        rw [← ihv hd, ← ihr ht]

theorem decode_exact : ∀ {a : Ast} {v : Json.Value} {x : El a},
    decode a v = some x → v = encode a x :=
  fun {a v _} h => exact_all.1 a v h

theorem decodeList_exact : ∀ {a : Ast} {vs : List Json.Value}
    {xs : List (El a)}, decodeList a vs = some xs → vs = xs.map (encode a) :=
  fun {a vs _} h => exact_all.2.2 a vs h

theorem decodeFields_exact :
    ∀ {fs : List (String × Bool × Ast)}
      {kvs : List (String × Json.Value)} {x : ElFields fs},
      decodeFields fs kvs = some x → kvs = encodeFields fs x :=
  fun {fs kvs _} h => exact_all.2.1 fs kvs h

end Cas.Schema

