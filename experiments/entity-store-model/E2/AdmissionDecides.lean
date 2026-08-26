/-
`ObligationAdmissibleReportDecides`, PROVED — the seat W3-3 left open when it gave
`E2/Admission` the judgment and pinned the decidability bridge as a statement.

WHAT THIS BUYS. Before this module `admissibleReport` was a `Bool` sextuple that MEANT
nothing: nothing tied it to `Admissible`, and the shell's scan decided the same six
clauses independently (C-3). `admissibleReportDecides` is what makes the report the
judgment, so a boundary that CALLS the report is deciding `Admissible` rather than
incidentally agreeing with it — the same move `wfsB_iff` made at the carrier level, made
once more at the store level.

THREE THINGS THE PROOF NEEDED, and none of them is bookkeeping:

1. `functional` CARRIES THE OTHER FIVE. `hashedB`, `refClosedB` and `schemaTypedB` are
   `σ.all` — they quantify over ENTRIES. `Admissible.hashed`, `.closed` and `.schemaTyped`
   quantify over `σ.find` — over BOUND ADDRESSES. On a duplicate-keyed list those readings
   differ (a shadowed second entry is invisible to `find`), and the entry reading is the
   strictly stronger one. `Admissible.functional` is exactly the hypothesis that collapses
   the difference, which is why the theorem is an iff on the CONJUNCTION and would be
   false clause by clause. `all_iff_find` is that step, isolated.

2. `schemaTyped` NEEDS `admitted`. `schemaTypedB` tests the referenced object with
   `isSchemaPreimageB` — the KIND BYTE, and nothing else — while `Admissible.schemaTyped`
   demands a schema PRE-IMAGE, `∃ s, σ.find sa = some (preimageS s)`. Two bytes are
   strictly weaker than a decodable carrier, so this leg does not close on its own. It
   closes against `admitted`, which says every stored byte string IS a pre-image of one
   kind or the other; the kind byte then picks the schema branch by `kind_separation`.
   That is the cheapest instance of the C-3 lesson: the report is a conjunction, and the
   clauses hold each other up.

3. `acyclic` IS `ObligationTopoComplete`, so this module proves that too. Both directions
   of Kahn's:

   * SOUND (`kahnLoop_edge_lt`): if the loop emits an order then every edge INTERNAL to
     the remaining set points backwards in it. The ready branch is vacuous — a ready
     address has no reference left in the set — and the leftover branch splits on which
     side of the batch the target landed. Restricting to internal edges is not laziness:
     the unrestricted statement (`ObligationTopoSound`, `E2/Graph.lean`) is FALSE as
     pinned, and the note at the foot of this module records the refutation.
   * COMPLETE (`kahnLoop_isSome`): an acyclic store always has a ready address, so the
     loop never stalls. `cycle_of_all_succ` is the finite-digraph root argument, and it
     is done by shrinking to the addresses REACHABLE FROM one member rather than by
     pigeonholing a chain: that set is closed under taking successors, and it drops the
     member it was built from exactly when there is no cycle at it. One `List.filter`,
     one induction on a length bound, no sequence and no `Finset`.
-/
import E2.Admission
import E2.Wf3

namespace E2

/-! ## List plumbing. `addrMem` and `addrListNodupB` are `E2/Graph`'s and
    `E2/Admission`'s own decision procedures; these are their reflection lemmas. -/

theorem addrMem_iff (a : Address) (l : List Address) : addrMem a l = true ↔ a ∈ l := by
  induction l with
  | nil => simp [addrMem]
  | cons x xs ih => simp [addrMem, ih, List.mem_cons]

theorem addrListNodupB_iff (l : List Address) : addrListNodupB l = true ↔ l.Nodup := by
  induction l with
  | nil => simp [addrListNodupB]
  | cons a rest ih =>
    simp only [addrListNodupB, Bool.and_eq_true, Bool.not_eq_true', List.nodup_cons, ih]
    constructor
    · rintro ⟨h1, h2⟩
      refine ⟨fun hm => ?_, h2⟩
      rw [(addrMem_iff a rest).2 hm] at h1
      exact Bool.noConfusion h1
    · rintro ⟨h1, h2⟩
      refine ⟨?_, h2⟩
      cases hm : addrMem a rest with
      | false => rfl
      | true => exact absurd ((addrMem_iff a rest).1 hm) h1

/-- Strictly shorter, given one witness the filter drops. `List.length_filter_le` gives
    only `≤`, and the loop's fuel argument needs the strict form. -/
theorem length_filter_lt {α : Type} (p : α → Bool) {l : List α} {a : α}
    (ha : a ∈ l) (hp : p a = false) : (l.filter p).length < l.length := by
  induction l with
  | nil => exact absurd ha List.not_mem_nil
  | cons x xs ih =>
    rw [List.filter_cons]
    by_cases hx : p x = true
    · rw [if_pos hx]
      have hm : a ∈ xs := by
        rcases List.mem_cons.1 ha with h' | h'
        · rw [h', hx] at hp; exact Bool.noConfusion hp
        · exact h'
      have := ih hm
      simp only [List.length_cons]
      omega
    · rw [if_neg hx]
      have := List.length_filter_le p xs
      simp only [List.length_cons]
      omega

/-! ## `Keys` against `find`. -/

theorem mem_of_find {σ : StoreMap} {d : Address} {b : Bytes} (h : σ.find d = some b) :
    (d, b) ∈ σ := by
  induction σ with
  | nil => simp [StoreMap.find] at h
  | cons p rest ih =>
    obtain ⟨d', b'⟩ := p
    by_cases hd : d = d'
    · subst hd
      rw [find_cons_self] at h
      injection h with h
      subst h
      exact List.mem_cons_self
    · rw [find_cons_ne hd] at h
      exact List.mem_cons_of_mem _ (ih h)

/-- The converse, and the place `functional` earns its keep: without `Nodup` keys a
    shadowed entry is a member of `σ` that `find` never returns. -/
theorem find_of_mem {σ : StoreMap} (hnd : (Keys σ).Nodup) {d : Address} {b : Bytes}
    (h : (d, b) ∈ σ) : σ.find d = some b := by
  induction σ with
  | nil => exact absurd h List.not_mem_nil
  | cons p rest ih =>
    obtain ⟨d', b'⟩ := p
    rw [show Keys ((d', b') :: rest) = d' :: Keys rest from rfl, List.nodup_cons] at hnd
    rcases List.mem_cons.1 h with heq | hmem
    · injection heq with h1 h2
      subst h1; subst h2
      exact find_cons_self _ _ _
    · have hd : d ≠ d' := by
        intro hdd
        subst hdd
        exact hnd.1 (List.mem_map.2 ⟨(d, b), hmem, rfl⟩)
      rw [find_cons_ne hd]
      exact ih hnd.2 hmem

theorem find_isSome_of_mem_keys {σ : StoreMap} {a : Address} (h : a ∈ Keys σ) :
    (σ.find a).isSome := by
  induction σ with
  | nil => exact absurd h List.not_mem_nil
  | cons p rest ih =>
    obtain ⟨d', b'⟩ := p
    by_cases hd : a = d'
    · subst hd; rw [find_cons_self]; rfl
    · rw [find_cons_ne hd]
      refine ih ?_
      rcases List.mem_cons.1 h with h' | h'
      · exact absurd h' hd
      · exact h'

theorem mem_keys_of_find_isSome {σ : StoreMap} {a : Address} (h : (σ.find a).isSome) :
    a ∈ Keys σ := by
  induction σ with
  | nil => simp [StoreMap.find] at h
  | cons p rest ih =>
    obtain ⟨d', b'⟩ := p
    by_cases hd : a = d'
    · subst hd; exact List.mem_cons_self
    · rw [find_cons_ne hd] at h
      exact List.mem_cons_of_mem _ (ih h)

/-- The entry reading and the binding reading of a per-object clause, identified under
    key-functionality. Every `σ.all` field of `admissibleReport` crosses this bridge and
    none of them crosses it without `Admissible.functional`. -/
theorem all_iff_find (σ : StoreMap) (hnd : (Keys σ).Nodup) (p : Address × Bytes → Bool) :
    σ.all p = true ↔ ∀ d b, σ.find d = some b → p (d, b) = true := by
  constructor
  · intro h d b hf
    exact List.all_eq_true.1 h (d, b) (mem_of_find hf)
  · intro h
    refine List.all_eq_true.2 (fun q hq => ?_)
    exact h q.1 q.2 (find_of_mem hnd hq)

/-! ## `admittedB` decides the `admitted` clause.

    Both directions run through the codec round trips (`M4a_schema`, `M4a_value`,
    `decAddr_encAddress`): `admittedB`'s byte-compare says the stored bytes ARE the
    re-encoding, and the round trip turns that into "the decoded carrier is the one the
    pre-image was built from". The `canonS s = s` conjunct then makes `preimageS`'s own
    canonicalization a no-op, which is what lets the pre-image be reconstructed on the
    nose rather than up to `canonS`. -/

theorem isSchemaPreimageB_preimageS (s : SchemaCore) :
    isSchemaPreimageB (preimageS s) = true := by
  simp [isSchemaPreimageB, preimageS]

theorem isSchemaPreimageB_preimageE (sa : Address) (v : Value) :
    isSchemaPreimageB (preimageE sa v) = false := by
  simp [isSchemaPreimageB, preimageE, versionByte, kindSchema, kindEntity]

theorem admittedB_iff (b : Bytes) :
    admittedB b = true ↔
      ((∃ s, WFS s ∧ canonS s = s ∧ b = preimageS s)
        ∨ (∃ sa v, canonV v = v ∧ dupFreeV v = true ∧ b = preimageE sa v)) := by
  match b with
  | [] =>
    constructor
    · intro h; exact Bool.noConfusion h
    · rintro (⟨s, _, _, hb⟩ | ⟨sa, v, _, _, hb⟩) <;>
        simp [preimageS, preimageE] at hb
  | [_] =>
    constructor
    · intro h; exact Bool.noConfusion h
    · rintro (⟨s, _, _, hb⟩ | ⟨sa, v, _, _, hb⟩) <;>
        simp [preimageS, preimageE] at hb
  | vb :: k :: body =>
    simp only [admittedB]
    by_cases hs : (vb == versionByte && k == kindSchema) = true
    · have hs' := hs
      rw [Bool.and_eq_true, beq_iff_eq, beq_iff_eq] at hs'
      obtain ⟨hv, hk⟩ := hs'
      subst hv; subst hk
      rw [if_pos hs]
      constructor
      · intro h
        cases hd : decodeSchema body with
        | none => simp only [hd] at h; exact Bool.noConfusion h
        | some s =>
          simp only [hd, Bool.and_eq_true] at h
          obtain ⟨⟨hw, hc⟩, he⟩ := h
          have hc' : canonS s = s := of_decide_eq_true hc
          have he' : encSchema s = body := of_decide_eq_true he
          exact Or.inl ⟨s, (wfsB_iff s).1 hw, hc', by rw [preimageS, hc', he']⟩
      · rintro (⟨s, hw, hc, hb⟩ | ⟨sa, w, _, _, hb⟩)
        · rw [preimageS, hc] at hb
          injection hb with _ hb'
          injection hb' with _ hbody
          subst hbody
          simp [M4a_schema s, (wfsB_iff s).2 hw, hc]
        · rw [preimageE] at hb
          injection hb with _ hb'
          injection hb' with hkk _
          exact absurd hkk (by decide)
    · rw [if_neg hs]
      by_cases he : (vb == versionByte && k == kindEntity) = true
      · have he' := he
        rw [Bool.and_eq_true, beq_iff_eq, beq_iff_eq] at he'
        obtain ⟨hv, hk⟩ := he'
        subst hv; subst hk
        rw [if_pos he]
        constructor
        · intro h
          cases hda : decAddr body with
          | none => simp only [hda] at h; exact Bool.noConfusion h
          | some pr =>
            obtain ⟨sa, rest⟩ := pr
            cases hdv : decodeValue rest with
            | none => simp only [hda, hdv] at h; exact Bool.noConfusion h
            | some w =>
              simp only [hda, hdv, Bool.and_eq_true] at h
              obtain ⟨⟨hw, hc⟩, hb⟩ := h
              have hc' : canonV w = w := of_decide_eq_true hc
              have hb' : encAddress sa ++ encValue w = body := of_decide_eq_true hb
              exact Or.inr ⟨sa, w, hc', hw, by rw [preimageE, hc', hb']⟩
        · rintro (⟨s, _, _, hb⟩ | ⟨sa, w, hc, hdf, hb⟩)
          · rw [preimageS] at hb
            injection hb with _ hb'
            injection hb' with hkk _
            exact absurd hkk (by decide)
          · rw [preimageE, hc] at hb
            injection hb with _ hb'
            injection hb' with _ hbody
            subst hbody
            simp [decAddr_encAddress, M4a_value, wfvB, hdf, hc]
      · rw [if_neg he]
        constructor
        · intro h; exact Bool.noConfusion h
        · rintro (⟨s, _, _, hb⟩ | ⟨sa, w, _, _, hb⟩)
          · rw [preimageS] at hb
            injection hb with hvv hb'
            injection hb' with hkk _
            subst hvv; subst hkk
            exact absurd (by simp) hs
          · rw [preimageE] at hb
            injection hb with hvv hb'
            injection hb' with hkk _
            subst hvv; subst hkk
            exact absurd (by simp) he

/-! ## Kahn's algorithm — `ObligationTopoComplete`, both directions.

    `Path` first: every node of a path is bound, and a path extends on the right. -/

theorem path_src_bound {σ : StoreMap} {a b : Address} (h : Path σ a b) :
    (σ.find a).isSome := by
  cases h with
  | one e => exact e.1
  | cons e _ => exact e.1

theorem Path.snoc {σ : StoreMap} {a b : Address} (p : Path σ a b) :
    ∀ {c : Address}, Edge σ b c → Path σ a c := by
  induction p with
  | one h => exact fun e => .cons h (.one e)
  | cons h _ ih => exact fun e => .cons h (ih e)

/-! ### `idxOf` across an append — the three facts the batch/leftover split needs. -/

theorem idxOf_lt_length {l : List Address} {a : Address} (h : a ∈ l) :
    idxOf l a < l.length := by
  induction l with
  | nil => exact absurd h List.not_mem_nil
  | cons x xs ih =>
    rw [idxOf_cons]
    by_cases hx : a = x
    · rw [if_pos hx]
      simp only [List.length_cons]
      omega
    · rw [if_neg hx]
      have hm : a ∈ xs := by
        rcases List.mem_cons.1 h with h' | h'
        · exact absurd h' hx
        · exact h'
      have := ih hm
      simp only [List.length_cons]
      omega

theorem idxOf_append_of_mem {l₁ : List Address} (l₂ : List Address) {a : Address}
    (h : a ∈ l₁) : idxOf (l₁ ++ l₂) a = idxOf l₁ a := by
  induction l₁ with
  | nil => exact absurd h List.not_mem_nil
  | cons x xs ih =>
    rw [List.cons_append, idxOf_cons, idxOf_cons]
    by_cases hx : a = x
    · rw [if_pos hx, if_pos hx]
    · rw [if_neg hx, if_neg hx]
      have hm : a ∈ xs := by
        rcases List.mem_cons.1 h with h' | h'
        · exact absurd h' hx
        · exact h'
      rw [ih hm]

theorem idxOf_append_of_not_mem {l₁ : List Address} (l₂ : List Address) {a : Address}
    (h : a ∉ l₁) : idxOf (l₁ ++ l₂) a = l₁.length + idxOf l₂ a := by
  induction l₁ with
  | nil => simp
  | cons x xs ih =>
    have hx : a ≠ x := fun h' => h (h' ▸ List.mem_cons_self)
    have hxs : a ∉ xs := fun hm => h (List.mem_cons_of_mem _ hm)
    rw [List.cons_append, idxOf_cons, if_neg hx, ih hxs, List.length_cons]
    omega

/-! ### The round, reflected. -/

theorem kahnReady_iff (σ : StoreMap) (l : List Address) (a : Address) :
    kahnReady σ l a = true ↔ ∀ c ∈ refsAt σ a, c ∉ l := by
  simp only [kahnReady]
  constructor
  · intro h c hc hcl
    have hb := List.all_eq_true.1 h c hc
    rw [(addrMem_iff c l).2 hcl] at hb
    exact Bool.noConfusion hb
  · intro h
    refine List.all_eq_true.2 (fun c hc => ?_)
    cases hm : addrMem c l with
    | false => rfl
    | true => exact absurd ((addrMem_iff c l).1 hm) (h c hc)

theorem kahnSplit_eq (σ : StoreMap) (l : List Address) :
    kahnSplit σ l =
      (l.filter (kahnReady σ l), l.filter (fun a => !kahnReady σ l a)) := by
  simp [kahnSplit, List.partition_eq_filter_filter, Function.comp_def]

theorem kahnLoop_succ (σ : StoreMap) (fuel : Nat) (x : Address) (xs : List Address) :
    kahnLoop σ (fuel + 1) (x :: xs) =
      (match kahnSplit σ (x :: xs) with
       | ([], _) => none
       | (batch, rest) => (kahnLoop σ fuel rest).map (fun tl => batch ++ tl)) := rfl

theorem kahnLoop_nil (σ : StoreMap) (fuel : Nat) : kahnLoop σ fuel [] = some [] := by
  cases fuel <;> rfl

theorem kahnLoop_zero_cons (σ : StoreMap) (x : Address) (xs : List Address) :
    kahnLoop σ 0 (x :: xs) = none := rfl

/-- A round that emits NOTHING while addresses remain is precisely the cycle answer. -/
theorem kahnLoop_stalled (σ : StoreMap) (fuel : Nat) (x : Address) (xs : List Address)
    (hb : (x :: xs).filter (kahnReady σ (x :: xs)) = []) :
    kahnLoop σ (fuel + 1) (x :: xs) = none := by
  rw [kahnLoop_succ, kahnSplit_eq, hb]

/-- A round that emits a non-empty batch: the batch, then whatever the leftovers give. -/
theorem kahnLoop_round (σ : StoreMap) (fuel : Nat) (x : Address) (xs : List Address)
    {y : Address} {ys : List Address}
    (hb : (x :: xs).filter (kahnReady σ (x :: xs)) = y :: ys) :
    kahnLoop σ (fuel + 1) (x :: xs) =
      (kahnLoop σ fuel ((x :: xs).filter (fun a => !kahnReady σ (x :: xs) a))).map
        (fun tl => (y :: ys) ++ tl) := by
  rw [kahnLoop_succ, kahnSplit_eq, hb]

/-! ### Completeness: an acyclic store never stalls a round. -/

/-- The finite-digraph root argument. If every member of `l` points at a member of `l`
    then the graph has a cycle — proved by shrinking `l` to the members REACHABLE FROM
    one of them, a set the successor map preserves and which excludes its own seed
    exactly when that seed sits on no cycle. -/
theorem cycle_of_all_succ (σ : StoreMap) :
    ∀ (n : Nat) (l : List Address), l.length ≤ n →
      (∀ x ∈ l, (σ.find x).isSome) →
      (∀ x ∈ l, ∃ c, c ∈ refsAt σ x ∧ c ∈ l) →
      ∀ a ∈ l, ∃ z, Path σ z z := by
  intro n
  induction n with
  | zero =>
    intro l hlen _ _ a ha
    rw [List.eq_nil_of_length_eq_zero (Nat.le_zero.1 hlen)] at ha
    exact absurd ha List.not_mem_nil
  | succ n ih =>
    classical
    intro l hlen hbound hsucc a ha
    by_cases hcyc : Path σ a a
    · exact ⟨a, hcyc⟩
    · obtain ⟨c, hc, hcl⟩ := hsucc a ha
      have hea : Edge σ a c := ⟨hbound a ha, hc⟩
      have hmemR : ∀ x, x ∈ l.filter (fun y => decide (Path σ a y)) ↔ (x ∈ l ∧ Path σ a x) := by
        intro x
        rw [List.mem_filter, decide_eq_true_eq]
      have hlt : (l.filter (fun y => decide (Path σ a y))).length < l.length :=
        length_filter_lt _ ha (decide_eq_false_iff_not.2 hcyc)
      refine ih _ (by omega) ?_ ?_ c ((hmemR c).2 ⟨hcl, .one hea⟩)
      · exact fun x hx => hbound x ((hmemR x).1 hx).1
      · intro x hx
        obtain ⟨hxl, hxp⟩ := (hmemR x).1 hx
        obtain ⟨d, hd, hdl⟩ := hsucc x hxl
        exact ⟨d, hd, (hmemR d).2 ⟨hdl, hxp.snoc ⟨hbound x hxl, hd⟩⟩⟩

theorem exists_ready {σ : StoreMap} (hac : Acyclic σ) {l : List Address}
    (hne : l ≠ []) (hbound : ∀ x ∈ l, (σ.find x).isSome) :
    ∃ a, a ∈ l ∧ kahnReady σ l a = true := by
  classical
  refine Classical.byContradiction (fun hcon => ?_)
  obtain ⟨x, xs, rfl⟩ : ∃ x xs, l = x :: xs := by
    cases l with
    | nil => exact absurd rfl hne
    | cons x xs => exact ⟨x, xs, rfl⟩
  have hsucc : ∀ y ∈ x :: xs, ∃ c, c ∈ refsAt σ y ∧ c ∈ x :: xs := by
    intro y hy
    refine Classical.byContradiction (fun hc2 => ?_)
    exact hcon ⟨y, hy, (kahnReady_iff σ (x :: xs) y).2
      (fun c hc hcl => hc2 ⟨c, hc, hcl⟩)⟩
  obtain ⟨z, hz⟩ :=
    cycle_of_all_succ σ (x :: xs).length (x :: xs) (Nat.le_refl _) hbound hsucc x
      List.mem_cons_self
  exact hac z hz

theorem kahnLoop_isSome {σ : StoreMap} (hac : Acyclic σ) :
    ∀ (fuel : Nat) (l : List Address), l.length ≤ fuel →
      (∀ x ∈ l, (σ.find x).isSome) → (kahnLoop σ fuel l).isSome := by
  intro fuel
  induction fuel with
  | zero =>
    intro l hlen _
    rw [List.eq_nil_of_length_eq_zero (Nat.le_zero.1 hlen), kahnLoop_nil]
    rfl
  | succ fuel ih =>
    intro l hlen hbound
    cases l with
    | nil => rw [kahnLoop_nil]; rfl
    | cons x xs =>
      obtain ⟨a, ha, hready⟩ := exists_ready hac (List.cons_ne_nil x xs) hbound
      have hab : a ∈ (x :: xs).filter (kahnReady σ (x :: xs)) :=
        List.mem_filter.2 ⟨ha, hready⟩
      have hrestlen : ((x :: xs).filter (fun z => !kahnReady σ (x :: xs) z)).length ≤ fuel := by
        have hlt := length_filter_lt (fun z => !kahnReady σ (x :: xs) z) ha (by rw [hready]; rfl)
        omega
      have hrestbound : ∀ z ∈ (x :: xs).filter (fun z => !kahnReady σ (x :: xs) z),
          (σ.find z).isSome := fun z hz => hbound z (List.mem_filter.1 hz).1
      cases hb : (x :: xs).filter (kahnReady σ (x :: xs)) with
      | nil => rw [hb] at hab; exact absurd hab List.not_mem_nil
      | cons y ys =>
        rw [kahnLoop_round σ fuel x xs hb, Option.isSome_map]
        exact ih _ hrestlen hrestbound

/-! ### Soundness: an emitted order puts every internal edge's target first. -/

theorem kahnLoop_edge_lt (σ : StoreMap) :
    ∀ (fuel : Nat) (l o : List Address), kahnLoop σ fuel l = some o →
      ∀ a b, a ∈ l → b ∈ l → b ∈ refsAt σ a → idxOf o b < idxOf o a := by
  intro fuel
  induction fuel with
  | zero =>
    intro l o hloop a b ha _ _
    cases l with
    | nil => exact absurd ha List.not_mem_nil
    | cons x xs => rw [kahnLoop_zero_cons] at hloop; exact absurd hloop (by simp)
  | succ fuel ih =>
    intro l o hloop a b ha hb hrefs
    cases l with
    | nil => exact absurd ha List.not_mem_nil
    | cons x xs =>
      cases hbatch : (x :: xs).filter (kahnReady σ (x :: xs)) with
      | nil =>
        rw [kahnLoop_stalled σ fuel x xs hbatch] at hloop
        exact absurd hloop (by simp)
      | cons y ys =>
        rw [kahnLoop_round σ fuel x xs hbatch] at hloop
        cases hrec : kahnLoop σ fuel ((x :: xs).filter (fun z => !kahnReady σ (x :: xs) z)) with
        | none => rw [hrec] at hloop; exact absurd hloop (by simp)
        | some tl =>
          rw [hrec, Option.map_some] at hloop
          injection hloop with hloop
          subst hloop
          -- `a` cannot be ready: `b` is one of its references and is still in the set.
          have hna : kahnReady σ (x :: xs) a ≠ true := by
            intro hr
            exact (kahnReady_iff σ (x :: xs) a).1 hr b hrefs hb
          have hnab : a ∉ y :: ys := by
            rw [← hbatch]
            intro hm
            exact hna (List.mem_filter.1 hm).2
          have haidx : idxOf ((y :: ys) ++ tl) a = (y :: ys).length + idxOf tl a :=
            idxOf_append_of_not_mem tl hnab
          by_cases hbb : b ∈ y :: ys
          · rw [idxOf_append_of_mem tl hbb, haidx]
            have := idxOf_lt_length hbb
            omega
          · have hnb : kahnReady σ (x :: xs) b ≠ true := by
              intro hr
              exact hbb (hbatch ▸ List.mem_filter.2 ⟨hb, hr⟩)
            have hmemrest : ∀ z, z ∈ x :: xs → kahnReady σ (x :: xs) z ≠ true →
                z ∈ (x :: xs).filter (fun w => !kahnReady σ (x :: xs) w) := by
              intro z hz hnz
              refine List.mem_filter.2 ⟨hz, ?_⟩
              cases hk : kahnReady σ (x :: xs) z with
              | false => rfl
              | true => exact absurd hk hnz
            have hlt := ih _ tl hrec a b (hmemrest a ha hna) (hmemrest b hb hnb) hrefs
            rw [idxOf_append_of_not_mem tl hbb, haidx]
            omega

theorem topoOrder_edge_lt {σ : StoreMap} {o : List Address} (h : topoOrder σ = some o)
    {a b : Address} (hedge : Edge σ a b) (hb : (σ.find b).isSome) :
    idxOf o b < idxOf o a :=
  kahnLoop_edge_lt σ _ _ _ h a b
    (mem_keys_of_find_isSome hedge.1) (mem_keys_of_find_isSome hb) hedge.2

theorem topoOrder_path_lt {σ : StoreMap} {o : List Address} (h : topoOrder σ = some o) :
    ∀ {a b : Address}, Path σ a b → (σ.find b).isSome → idxOf o b < idxOf o a := by
  intro a b p
  induction p with
  | one e => exact fun hb => topoOrder_edge_lt h e hb
  | @cons _ c _ e p ih =>
    exact fun hb => Nat.lt_trans (ih hb) (topoOrder_edge_lt h e (path_src_bound p))

/-- `ObligationTopoComplete`, PROVED — the acyclicity leg of the report, and the clause
    F-32 recorded as the one verification-on-open could not compute. -/
theorem topoComplete : ObligationTopoComplete := by
  intro σ
  constructor
  · intro h a hp
    obtain ⟨o, ho⟩ := Option.isSome_iff_exists.1 h
    exact Nat.lt_irrefl _ (topoOrder_path_lt ho hp (path_src_bound hp))
  · intro hac
    exact kahnLoop_isSome hac _ _ (Nat.le_refl _) (fun _ hx => find_isSome_of_mem_keys hx)

/-! ## The bridge. -/

/-- `schemaTypedB` reads a kind byte; the clause demands a pre-image. `admitted` is what
    closes the gap, and `kind_separation` at the byte level is what picks the branch. -/
theorem schemaTyped_of_report {σ : StoreMap}
    (hadm : σ.all (fun p => admittedB p.2) = true) (hst : schemaTypedB σ = true) :
    ∀ d sa v, σ.find d = some (preimageE sa v) → ∃ s, σ.find sa = some (preimageS s) := by
  intro d sa v hf
  have hp := List.all_eq_true.1 hst (d, preimageE sa v) (mem_of_find hf)
  simp only [preimageE, decAddr_encAddress, beq_self_eq_true, Bool.and_self, if_true] at hp
  cases hfsa : σ.find sa with
  | none =>
    rw [hfsa] at hp
    exact Bool.noConfusion (show (false : Bool) = true from hp)
  | some sb =>
    rw [hfsa] at hp
    have hp' : isSchemaPreimageB sb = true := hp
    have hadmsb := List.all_eq_true.1 hadm (sa, sb) (mem_of_find hfsa)
    rcases (admittedB_iff sb).1 hadmsb with ⟨s, _, _, hsb⟩ | ⟨sa', w, _, _, hsb⟩
    · exact ⟨s, by rw [hsb]⟩
    · rw [hsb, isSchemaPreimageB_preimageE] at hp'
      exact Bool.noConfusion hp'

/-- W3-3's decidability bridge, PROVED. `(admissibleReport H σ).clean = true ↔
    Admissible H σ` — the report IS the judgment, so a boundary that calls it decides
    `Admissible` rather than agreeing with it by construction. -/
theorem admissibleReportDecides : ObligationAdmissibleReportDecides := by
  intro H σ
  constructor
  · intro h
    simp only [AdmissionReport.clean, admissibleReport, Bool.and_eq_true] at h
    obtain ⟨⟨⟨⟨⟨hfun, hhash⟩, hadm⟩, hcl⟩, hst⟩, hac⟩ := h
    have hnd : (Keys σ).Nodup := (addrListNodupB_iff _).1 hfun
    refine ⟨hnd, ?_, ?_, ?_, ?_, (topoComplete σ).1 hac⟩
    · intro d b hf
      exact of_decide_eq_true ((all_iff_find σ hnd _).1 hhash d b hf)
    · intro d b hf
      exact (admittedB_iff b).1 ((all_iff_find σ hnd _).1 hadm d b hf)
    · intro d b hf
      have hb := (all_iff_find σ hnd _).1 hcl d b hf
      cases hr : refsOfPreimage b with
      | none => rw [hr] at hb; exact Bool.noConfusion hb
      | some rs =>
        rw [hr] at hb
        exact ⟨rs, rfl, fun a hmem => List.all_eq_true.1 hb a hmem⟩
    · exact schemaTyped_of_report hadm hst
  · intro hA
    have hnd := hA.functional
    simp only [AdmissionReport.clean, admissibleReport, Bool.and_eq_true]
    refine ⟨⟨⟨⟨⟨(addrListNodupB_iff _).2 hnd, ?_⟩, ?_⟩, ?_⟩, ?_⟩,
      (topoComplete σ).2 hA.acyclic⟩
    · exact (all_iff_find σ hnd _).2 (fun d b hf => decide_eq_true (hA.hashed d b hf))
    · exact (all_iff_find σ hnd _).2 (fun d b hf => (admittedB_iff b).2 (hA.admitted d b hf))
    · refine (all_iff_find σ hnd _).2 (fun d b hf => ?_)
      obtain ⟨rs, hr, hres⟩ := hA.closed d b hf
      simp only [hr]
      exact List.all_eq_true.2 (fun a hmem => hres a hmem)
    · refine List.all_eq_true.2 (fun q hq => ?_)
      have hfq : σ.find q.1 = some q.2 := find_of_mem hnd hq
      -- `admitted` already says what the stored bytes ARE, so the kind byte the clause
      -- branches on is read off a pre-image rather than off an arbitrary list.
      rcases hA.admitted q.1 q.2 hfq with ⟨s, _, _, hb⟩ | ⟨sa, w, hcv, _, hb⟩
      · rw [hb]
        rfl
      · rw [hb] at hfq
        obtain ⟨s, hs⟩ := hA.schemaTyped q.1 sa w hfq
        rw [hb]
        simp only [preimageE, hcv, beq_self_eq_true, Bool.and_self, if_true,
          decAddr_encAddress, hs, isSchemaPreimageB_preimageS]

/-! ## One anti-claim, recorded rather than papered over.

`ObligationTopoSound` (`E2/Graph.lean`) is NOT proved here, and it is not an oversight:
as pinned it is FALSE. It quantifies over EVERY edge, and `Edge σ a b` does not require
`b` to be bound — a dangling reference is an edge whose target has no node. Kahn's calls
such an address ready (`addrMem b remaining` is false, so it never blocks), so the order
comes out `some`, `b` is absent from it, and `idxOf` returns the list's length for an
absent address: `idxOf o b < idxOf o a` reads `o.length < idxOf o a`, which no member can
satisfy.

THE WITNESS, and the honest status of this claim. `σ = [(a, preimageE b (.vint 1))]` with
`b ≠ a` gives `refsAt σ a = [b]`, `topoOrder σ = some [a]`, `idxOf [a] b = 1` and
`idxOf [a] a = 0`, so `Edge σ a b` holds and the conclusion is `1 < 0`. Those four values
were checked by COMPILED EVALUATION (`#eval`), not by the kernel: `preimageE` runs through
`encValue`/`encNat`, which are well-founded and therefore irreducible, so `decide +kernel`
stalls on `WellFounded.fix` exactly as F-18/F-54 describe. The refutation is therefore
REPORTED, not landed — no `¬ ObligationTopoSound` theorem is claimed here, and the
statement in `E2/Graph.lean` is untouched.

`kahnLoop_edge_lt` above is the true statement — the same conclusion for edges INTERNAL
to the remaining set — and it is what `topoComplete` consumes. Restating the pin is a
ruling, not a seat's business; this note is the report. -/

end E2
