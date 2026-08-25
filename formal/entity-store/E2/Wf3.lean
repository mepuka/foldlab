/-
Pin seat — M10 (WF3), in the ADDRESS-NODE vocabulary F-31 forced, with the ranking form
beside it (ruling W3-22, pin 1). Statements and proofs both land here:

  theorem M10_rank : ObligationM10_rank    -- the store list is a reverse topo order
  theorem M10_wf3  : ObligationM10_wf3     -- WF3: the reference graph is acyclic

NODES ARE ADDRESSES, NEVER PRE-IMAGES. R3's attack on M10's planned shape did not refute
the theorem — it refuted its VOCABULARY. Under a colliding `H` the pre-image reading is
not even well defined: probe `A_collision_drops` exhibits a second put that is a NO-OP, so
the store is not the set of things put into it and a dropped pre-image has no node at all.
`σ` is a map, each bound address carries exactly one byte string, and `E2/Graph.lean`'s
`Edge`/`Path`/`Acyclic` are stated on addresses for exactly that reason (F-31).

WHY IT SURVIVES FOR AN ARBITRARY `H`, which is the load-bearing prose R3 asked to have
pinned in the statement rather than discovered in the proof: `Reachable.putS` demands
`AllResolve σ (refsS (canonS s))` against the PRE-store. So either the new address is
already bound — and then `putPre` no-ops, nothing was added, and the induction hypothesis
carries verbatim — or it is fresh, and then it is not in the pre-store's domain, hence not
among its own references, which all resolve there. **Every effective insert is a new
sink-ward node.** No hypothesis on `H` appears anywhere below.

RANK IS THE PRIMARY THEOREM, acyclicity its corollary. That is R3 §6's recommendation and
it is also M19's currency: `idxOf (Keys σ)` reads the store list back to front as an
insertion sequence, which is what a reconstruction argument replays. The two are pinned
side by side rather than one inlined into the other's proof.

ANTI-CLAIM, carried over from `E2/Admission.lean`. This says nothing about RAW MAPS. A
WF1- and WF2-satisfying map can be cyclic (`HEADLINE_wf1_wf2_insufficient`), which is why
`Admissible` takes acyclicity as a HYPOTHESIS and `topoOrder` exists to decide it. WF3 is
a theorem about `Reachable`, and `Reachable` is what the theorems are about.
-/
import E2.Closure
import E2.Graph

namespace E2

/-! ## The pinned statements (W3-22). -/

/-- M10 — WF3. The reference graph of a reachable store is acyclic.

    ANTI-CLAIMS. Says nothing about `H`: no injectivity, no collision resistance, no
    pre-image resistance, and a COLLIDING `H` does not weaken it. Says nothing about raw
    maps — see the module header. Nodes are addresses, never pre-images. -/
def ObligationM10_wf3 : Prop :=
  ∀ (H : Bytes → Address) (env : ConformsEnv) (σ : StoreMap),
    Reachable H env σ → Acyclic σ

/-- M10′ — the ranking form (R3 §6, proposed under F-31). The store list IS a reverse
    topological order: `putPre` conses, so an object always sits nearer the head than
    everything it references, and every edge points from a later-inserted address to an
    earlier one.

    `idxOf` is single-valued as a rank because reachable stores are key-functional —
    `reachable_keys_nodup`, the companion pinned in `E2/Commutation.lean`. Without that
    invariant `Keys σ` could repeat an address and `idxOf` would name only the first of
    two positions. -/
def ObligationM10_rank : Prop :=
  ∀ (H : Bytes → Address) (env : ConformsEnv) (σ : StoreMap), Reachable H env σ →
    ∀ a b, Edge σ a b → idxOf (Keys σ) a < idxOf (Keys σ) b

/-! ## Reading the graph across a cons. Four one-liners; `putPre`'s fresh branch conses,
    so this is the only store shape the induction ever has to open. -/

theorem idxOf_cons (d : Address) (l : List Address) (a : Address) :
    idxOf (d :: l) a = if a = d then 0 else idxOf l a + 1 := rfl

theorem find_cons_self (d : Address) (b : Bytes) (σ : StoreMap) :
    StoreMap.find ((d, b) :: σ) d = some b := by
  simp [StoreMap.find]

theorem find_cons_ne {d a : Address} {b : Bytes} {σ : StoreMap} (h : a ≠ d) :
    StoreMap.find ((d, b) :: σ) a = σ.find a := by
  simp [StoreMap.find, h]

theorem refsAt_cons_self (d : Address) (b : Bytes) (σ : StoreMap) :
    refsAt ((d, b) :: σ) d = (refsOfPreimage b).getD [] := by
  simp [refsAt, find_cons_self]

theorem refsAt_cons_ne {d a : Address} {b : Bytes} {σ : StoreMap} (h : a ≠ d) :
    refsAt ((d, b) :: σ) a = refsAt σ a := by
  simp [refsAt, find_cons_ne h]

/-! ## The two facts the induction needs. -/

/-- Every edge TARGET of a reachable store is bound. `Edge` reads its references off the
    stored bytes, and M9 (WF2, proved in `E2/Closure.lean`) resolves every reference a
    stored byte string carries in the same store. This is what makes a fresh address
    unreachable from the store it is being inserted into. -/
theorem edge_target_bound {H : Bytes → Address} {env : ConformsEnv} {σ : StoreMap}
    (hσ : Reachable H env σ) {a b : Address} (h : Edge σ a b) : (σ.find b).isSome := by
  obtain ⟨ha, hb⟩ := h
  cases hfa : σ.find a with
  | none => rw [hfa] at ha; simp at ha
  | some ba =>
    obtain ⟨rs, hparse, hres⟩ := wf2_of_reachable hσ a ba hfa
    have hrefs : refsAt σ a = rs := by simp [refsAt, hfa, hparse]
    rw [hrefs] at hb
    exact hres b hb

/-- The rank step, stated ONCE for both put rules because both use it identically:
    consing a FRESH pre-image whose references all resolve in the pre-store extends the
    ranking. The new node takes index 0; every old index shifts by exactly 1; and no edge
    can point AT the new node, because everything an edge points at is bound in the
    pre-store while the new address is not. -/
theorem rank_cons_fresh {H : Bytes → Address} {env : ConformsEnv} {σ : StoreMap}
    {b₀ : Bytes} {rs : List Address}
    (hσ : Reachable H env σ)
    (hfresh : σ.find (H b₀) = none)
    (hparse : refsOfPreimage b₀ = some rs)
    (hres : AllResolve σ rs)
    (ih : ∀ a b, Edge σ a b → idxOf (Keys σ) a < idxOf (Keys σ) b) :
    ∀ a b, Edge ((H b₀, b₀) :: σ) a b →
      idxOf (Keys ((H b₀, b₀) :: σ)) a < idxOf (Keys ((H b₀, b₀) :: σ)) b := by
  have hKeys : Keys ((H b₀, b₀) :: σ) = H b₀ :: Keys σ := rfl
  intro a b hedge
  obtain ⟨ha, hb⟩ := hedge
  by_cases hae : a = H b₀
  · -- The new node. Its references are `rs`, all of them bound in the pre-store, so none
    -- of them is the fresh address itself: index 0 against a strictly positive index.
    subst hae
    rw [refsAt_cons_self, hparse] at hb
    simp only [Option.getD_some] at hb
    have hbound : (σ.find b).isSome := hres b hb
    have hbne : b ≠ H b₀ := by
      intro h; rw [h, hfresh] at hbound; simp at hbound
    rw [hKeys, idxOf_cons, idxOf_cons, if_pos rfl, if_neg hbne]
    omega
  · -- An old edge. It is an edge of the pre-store, both of its ends are bound there, and
    -- both indices shift by the same 1.
    have hedgeσ : Edge σ a b := by
      refine ⟨?_, ?_⟩
      · rw [find_cons_ne hae] at ha; exact ha
      · rw [refsAt_cons_ne hae] at hb; exact hb
    have hbound : (σ.find b).isSome := edge_target_bound hσ hedgeσ
    have hbne : b ≠ H b₀ := by
      intro h; rw [h, hfresh] at hbound; simp at hbound
    have hlt := ih a b hedgeσ
    rw [hKeys, idxOf_cons, idxOf_cons, if_neg hae, if_neg hbne]
    omega

/-! ## The proofs. -/

/-- M10′ — PROVED. Induction on `Reachable`, exactly the two-liner STORE-MODEL §3
    predicts: the no-op branch is the induction hypothesis verbatim, and the cons branch
    is `rank_cons_fresh`. The `putS` refs come from `refsOfPreimage_preimageS` against
    `Reachable.putS`'s own `AllResolve` premise; the `putE` refs are the schema address
    (bound by `putE`'s `find` premise) followed by the value's references (bound by its
    `AllResolve` premise). No hypothesis on `H`. -/
theorem M10_rank : ObligationM10_rank := by
  unfold ObligationM10_rank
  intro H env σ hσ
  induction hσ with
  | empty =>
      intro a b hedge
      obtain ⟨ha, _⟩ := hedge
      simp [StoreMap.find] at ha
  | @putS σ s hσ' _ href ih =>
      unfold putSchema
      cases hlookup : σ.find (H (preimageS s)) with
      | some x => simpa [putPre, hlookup] using ih
      | none =>
          have hcons : putPre H σ (preimageS s)
              = (H (preimageS s), preimageS s) :: σ := by
            simp [putPre, hlookup]
          rw [hcons]
          exact rank_cons_fresh hσ' hlookup (refsOfPreimage_preimageS s) href ih
  | @putE σ sAddr v s hσ' hschema _ _ href ih =>
      unfold putEntity
      cases hlookup : σ.find (H (preimageE sAddr v)) with
      | some x => simpa [putPre, hlookup] using ih
      | none =>
          have hres : AllResolve σ (sAddr :: refsV (canonV v)) := by
            intro x hx
            simp only [List.mem_cons] at hx
            rcases hx with rfl | hx
            · rw [hschema]; simp
            · exact href x hx
          have hcons : putPre H σ (preimageE sAddr v)
              = (H (preimageE sAddr v), preimageE sAddr v) :: σ := by
            simp [putPre, hlookup]
          rw [hcons]
          exact rank_cons_fresh hσ' hlookup (refsOfPreimage_preimageE sAddr v) hres ih

/-- M10 — WF3, PROVED, as the corollary R3 said it should be. A path carries the rank
    inequality along by transitivity, so a path from an address to ITSELF would give
    `idxOf … a < idxOf … a`. -/
theorem M10_wf3 : ObligationM10_wf3 := by
  unfold ObligationM10_wf3
  intro H env σ hσ
  have hrank := M10_rank H env σ hσ
  have hpath : ∀ x y, Path σ x y → idxOf (Keys σ) x < idxOf (Keys σ) y := by
    intro x y hp
    induction hp with
    | one h => exact hrank _ _ h
    | cons h _ ihp => exact Nat.lt_trans (hrank _ _ h) ihp
  intro a hself
  exact absurd (hpath a a hself) (Nat.lt_irrefl _)

#print axioms M10_rank
#print axioms M10_wf3

end E2
