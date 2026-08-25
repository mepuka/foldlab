/-
Seat module — NEG-2, the dangling-reference exhibit (STORE-MODEL §6, negative exhibits).
The statement is pinned in `E2/Resolve.lean`; this module supplies the proof only:

  theorem NEG2_dangling_unreachable : ObligationNEG2_dangling_unreachable

Helper lemmas live here. This module may import `E2.Faithful` and `E2.Closure`. End with
`#print axioms`. Edit no other module; a statement that resists proof is a
STOP-and-report.
-/
import E2.Resolve
import E2.Faithful
import E2.Closure

namespace E2

/-- No reachable store is exactly the singleton containing a schema whose sole
    reference is absent from the predecessor store. -/
theorem reachable_ne_dangling_singleton {H : Bytes → Address} {env : ConformsEnv}
    {σ : StoreMap} (hσ : Reachable H env σ) (a₀ : Address) :
    σ ≠ [(H (preimageS (.ref a₀)), preimageS (.ref a₀))] := by
  induction hσ with
  | empty =>
      simp
  | @putS σ s _ _ href ih =>
      intro heq
      unfold putSchema putPre at heq
      split at heq
      · exact ih heq
      · have hbytes : preimageS s = preimageS (.ref a₀) := by
          exact (Prod.mk.inj (List.cons.inj heq).1).2
        have henc : encSchema (canonS s) = encSchema (canonS (.ref a₀)) := by
          exact (List.cons.inj (List.cons.inj hbytes).2).2
        have hdecoded := congrArg decodeSchema henc
        have hcanon : canonS s = canonS (.ref a₀) := by
          simpa only [M4a_schema, Option.some.injEq] using hdecoded
        have hs : s = .ref a₀ := by
          cases s <;> simp [canonS] at hcanon ⊢
          exact hcanon
        have htail : σ = [] := (List.cons.inj heq).2
        subst s
        subst σ
        -- W3-7: `href` is now about the STORED form, so the simp set needs the
        -- `canonS (.ref a₀) = .ref a₀` equation to get back to `refsS (.ref a₀) = [a₀]`.
        -- The argument is otherwise unchanged: the reference dangles in the empty store.
        simp [AllResolve, canonS, refsS, StoreMap.find] at href
  -- W3-9 pattern hole 3 of 3: one added hole for the `dupFreeV (canonV v)` premise.
  | @putE σ sAddr v s _ _ _ _ _ ih =>
      intro heq
      unfold putEntity putPre at heq
      split at heq
      · exact ih heq
      · have hbytes : preimageE sAddr v = preimageS (.ref a₀) := by
          exact (Prod.mk.inj (List.cons.inj heq).1).2
        exact kind_separation (.ref a₀) sAddr v hbytes.symm

theorem NEG2_dangling_unreachable : ObligationNEG2_dangling_unreachable := by
  unfold ObligationNEG2_dangling_unreachable
  intro H env a₀ h
  exact reachable_ne_dangling_singleton h a₀ rfl

#print axioms NEG2_dangling_unreachable

end E2
