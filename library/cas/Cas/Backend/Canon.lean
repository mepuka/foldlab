import Cas.Backend.EmitLayer

/-!
# CANON-1 — the canonicalization the authoring door performs, proved

`Cas/Backend/EmitLayer.lean:208-226` says what the canonical spelling of
a service SET is (`canonServices`) and how the authoring side checks a
list against it (`isCanonServices`). This module proves what those two
declarations were written to be true of, and nothing else moves: it adds
no definition to the emitter, edits no existing file, and emits no
bytes.

## The claim, in one line

`canonServices` is a RETRACTION onto canonical spelling — it lands in
the invariant (`Nodup` keys, sorted by key), it is idempotent there, and
on key-`Nodup` input it is blind to authored order. Blind to authored
order is CANON-1: one service set, one `SystemNode` term, one address.

## The premise is load-bearing, and that is proved not asserted

`dedup` (`EmitLayer.lean:202-206`) keeps the LAST occurrence per key. So
on a list with a repeated key carrying DIFFERENT references, permuting
the input changes which reference survives, and order-blindness is
false. `canonServices_perm` therefore carries `(xs.map (·.key)).Nodup`,
and `canonServices_perm_premise_is_necessary` below refutes the
premise-free statement with the two-element witness — house style: the
counter-`example` lives beside the theorem it defends.

The premise costs nothing at the sites the estate has, and that is a
theorem too: `nodup_keys_of_isCanonServices` shows the authoring guard
(`tools/EmitLayers.lean:235-237`) implies it, and
`canonServices_of_isCanonServices` shows a list that passes the guard is
already its own canonical spelling.

## The mirror pin — why there are two `dedup`s

`dedup` and `hasKey` are `private` to `EmitLayer.lean`, so no other
module can name them, and every decomposition below needs lemmas about
`dedup`. Rather than unseal them — which would move `EmitLayer`'s
surface for a proof's convenience — this module restates them as
`canonDedup` / `canonHasKey` and PINS the restatement to the shipped
function:

```
canonServices_pin : canonServices xs = (canonDedup xs).mergeSort keyLe
```

The pin is a theorem checked by the kernel against the real
`canonServices`, not an assumption. If the mirror ever drifts from the
private original the pin stops elaborating and `lake build` goes red, so
the duplication cannot rot silently. The mirrors are `private` here for
the same reason they are private there: they are the emitter's internal
step, not vocabulary.

## What this module does NOT claim

- Nothing about arbitrary `SystemNode` values. The `cas_union`
  constructors stay raw (`tools/EmitLayers.lean:200-216` records why
  closing that door is its own ruling), so the guarantee is exactly:
  terms authored through the guarded door are canonical, and for those
  terms authored order does not move the address.
- `systemAddressOf_canon_stable` is a congruence, not an address
  theory: equal terms reside at equal addresses because
  `systemAddressOf` is a function. It says nothing about collisions and
  nothing about two different service sets.
- Nothing about the load path. Renormalize-on-read remains the named
  defect it was; a stored non-canonical term stays non-canonical.
-/

namespace Cas.Backend

open Cas.Schema

/-! ## The key order

`canonServices` sorts by `String` order on `key`. The three facts the
toolchain's `mergeSort` lemmas ask for — transitivity, totality,
antisymmetry — are the pinned toolchain's own
(`Init.Data.String.Lemmas.StringOrder`), lifted to `ServiceRef` through
the projection and nothing more. -/

/-- The comparator `canonServices` sorts with, named so the lemmas below
can talk about it. Definitionally the lambda at `EmitLayer.lean:221`. -/
private def keyLe (a b : ServiceRef) : Bool := decide (a.key ≤ b.key)

private theorem keyLe_trans (a b c : ServiceRef) :
    keyLe a b → keyLe b c → keyLe a c := by
  simp only [keyLe, decide_eq_true_eq]
  exact String.le_trans

private theorem keyLe_total (a b : ServiceRef) : keyLe a b || keyLe b a := by
  simp only [keyLe, Bool.or_eq_true, decide_eq_true_eq]
  exact String.le_total _ _

private theorem key_eq_of_keyLe_both {a b : ServiceRef}
    (h₁ : keyLe a b) (h₂ : keyLe b a) : a.key = b.key := by
  simp only [keyLe, decide_eq_true_eq] at h₁ h₂
  exact String.le_antisymm h₁ h₂

/-! ## The mirror, and its pin -/

/-- Mirror of `EmitLayer`'s private `hasKey`. -/
private def canonHasKey (xs : List ServiceRef) (s : ServiceRef) : Bool :=
  xs.any fun x => x.key == s.key

/-- Mirror of `EmitLayer`'s private `dedup` — LAST occurrence wins,
which is the whole subtlety this module exists to state honestly. -/
private def canonDedup : List ServiceRef → List ServiceRef
  | [] => []
  | s :: rest =>
    let tail := canonDedup rest
    if canonHasKey tail s then tail else s :: tail

/-- **The pin.** The mirror above computes the shipped `canonServices`,
proved against the real declaration rather than assumed. Drift is a red
build, not a silent divergence. -/
private theorem canonServices_pin (xs : List ServiceRef) :
    canonServices xs = (canonDedup xs).mergeSort keyLe := by
  show canonServices xs
      = (canonDedup xs).mergeSort fun a b => decide (a.key ≤ b.key)
  unfold canonServices
  congr 1
  induction xs with
  | nil => rfl
  | cons s rest ih =>
    simp only [canonDedup]
    rw [← ih]
    rfl

private theorem canonHasKey_eq_true_iff
    {xs : List ServiceRef} {s : ServiceRef} :
    canonHasKey xs s = true ↔ s.key ∈ xs.map (·.key) := by
  simp only [canonHasKey, List.any_eq_true, beq_iff_eq, List.mem_map]

/-! ## The invariant `canonServices` lands in -/

private theorem nodup_keys_canonDedup (xs : List ServiceRef) :
    ((canonDedup xs).map (·.key)).Nodup := by
  induction xs with
  | nil => simp [canonDedup]
  | cons s rest ih =>
    simp only [canonDedup]
    split
    · exact ih
    · rename_i h
      simp only [List.map_cons, List.nodup_cons]
      refine ⟨?_, ih⟩
      intro hmem
      exact h (canonHasKey_eq_true_iff.mpr hmem)

/-- On a list whose keys are already distinct, `dedup` has nothing to
do. This is the lemma the `Nodup` premise buys. -/
private theorem canonDedup_of_nodup_keys :
    ∀ {xs : List ServiceRef}, (xs.map (·.key)).Nodup → canonDedup xs = xs
  | [], _ => rfl
  | s :: rest, h => by
    simp only [List.map_cons, List.nodup_cons] at h
    have ih := canonDedup_of_nodup_keys h.2
    simp only [canonDedup, ih]
    rw [if_neg]
    intro hk
    exact h.1 (canonHasKey_eq_true_iff.mp hk)

/-- The canonical spelling has distinct keys. Half of the representation
invariant. -/
theorem nodup_keys_canonServices (xs : List ServiceRef) :
    ((canonServices xs).map (·.key)).Nodup := by
  rw [canonServices_pin]
  exact ((List.mergeSort_perm (canonDedup xs) keyLe).map (·.key)).symm.nodup
    (nodup_keys_canonDedup xs)

/-- The canonical spelling is sorted by the comparator, in the `Bool`
form `mergeSort`'s own lemmas speak. -/
private theorem pairwise_canonServices (xs : List ServiceRef) :
    (canonServices xs).Pairwise (fun a b => keyLe a b = true) := by
  rw [canonServices_pin]
  exact List.pairwise_mergeSort keyLe_trans keyLe_total (canonDedup xs)

/-- The canonical spelling is sorted by key. The other half of the
representation invariant, in the `Prop` form a reader wants. -/
theorem pairwise_keyLe_canonServices (xs : List ServiceRef) :
    (canonServices xs).Pairwise (fun a b => a.key ≤ b.key) :=
  (pairwise_canonServices xs).imp fun {_ _} h => by
    simpa only [keyLe, decide_eq_true_eq] using h

/-- Distinct keys make the key an identifying field: two members of the
same key-`Nodup` list with one key are one element. -/
private theorem key_inj_of_nodup_keys {l : List ServiceRef}
    (h : (l.map (·.key)).Nodup) :
    ∀ ⦃a⦄, a ∈ l → ∀ ⦃b⦄, b ∈ l →
      a.key = b.key → a = b := by
  have hp : l.Pairwise (fun a b => a.key ≠ b.key) := List.pairwise_map.mp h
  refine List.Pairwise.forall_of_forall_of_flip ?_ ?_ ?_
  · intro x _ _; rfl
  · exact hp.imp fun hne heq => absurd heq hne
  · exact hp.imp fun hne heq => absurd heq.symm hne

/-! ## E1 — idempotence -/

/-- **E1.** `canonServices` is idempotent: the canonical spelling of a
canonical spelling is itself. -/
theorem canonServices_idem (xs : List ServiceRef) :
    canonServices (canonServices xs) = canonServices xs := by
  rw [canonServices_pin (canonServices xs),
    canonDedup_of_nodup_keys (nodup_keys_canonServices xs)]
  exact List.mergeSort_of_pairwise (pairwise_canonServices xs)

/-! ## E2 — order-blindness, and the premise that makes it true -/

/-- **E2.** On a list whose keys are distinct, `canonServices` is blind
to authored order: two authored orders of one service set have ONE
canonical spelling.

The `Nodup` premise is not decoration —
`canonServices_perm_premise_is_necessary` refutes the statement without
it — and it is discharged at every authored site by the door's own
guard (`nodup_keys_of_isCanonServices`). -/
theorem canonServices_perm {xs ys : List ServiceRef}
    (hnd : (xs.map (·.key)).Nodup) (hperm : xs.Perm ys) :
    canonServices xs = canonServices ys := by
  have hnd' : (ys.map (·.key)).Nodup := (hperm.map (·.key)).nodup hnd
  rw [canonServices_pin, canonServices_pin,
    canonDedup_of_nodup_keys hnd, canonDedup_of_nodup_keys hnd']
  refine List.Perm.eq_of_pairwise (le := fun a b => keyLe a b = true) ?_
    (List.pairwise_mergeSort keyLe_trans keyLe_total xs)
    (List.pairwise_mergeSort keyLe_trans keyLe_total ys)
    ((List.mergeSort_perm xs keyLe).trans
      (hperm.trans (List.mergeSort_perm ys keyLe).symm))
  intro a b ha hb hab hba
  have ha' : a ∈ xs := List.mem_mergeSort.mp ha
  have hb' : b ∈ xs := hperm.symm.mem_iff.mp (List.mem_mergeSort.mp hb)
  exact key_inj_of_nodup_keys hnd ha' hb' (key_eq_of_keyLe_both hab hba)

/-! ## The falsifier — E2 without its premise, refuted

Two references on ONE key, permuted. `dedup` keeps the last occurrence,
so the permutation changes which reference survives and the two
canonical spellings disagree. This is the break-ledger object of
`contracts/PDD-1.contract.md`, kept live so the amendment cannot be
relaxed back by anyone who has not first deleted this proof. -/

/-- Witness, left. Same key as `refB`, different reference. -/
private def refA : ServiceRef := { key := "k", name := "A", path := "a" }

/-- Witness, right. -/
private def refB : ServiceRef := { key := "k", name := "B", path := "b" }

/-- The witness pair is a permutation of one another. -/
example : ([refA, refB] : List ServiceRef).Perm [refB, refA] :=
  List.Perm.swap refB refA []

/-- `dedup` keeps the LAST occurrence, so the left order loses `refA`.
Computed through the pin rather than by `decide`, because `mergeSort` is
well-founded recursion and does not reduce in the kernel. -/
private theorem canonServices_witness_left :
    canonServices [refA, refB] = [refB] := by
  rw [canonServices_pin]
  have hd : canonDedup [refA, refB] = [refB] := by
    simp [canonDedup, canonHasKey, refA, refB]
  rw [hd, List.mergeSort_singleton]

/-- The same set in the other authored order keeps `refA` instead. -/
private theorem canonServices_witness_right :
    canonServices [refB, refA] = [refA] := by
  rw [canonServices_pin]
  have hd : canonDedup [refB, refA] = [refA] := by
    simp [canonDedup, canonHasKey, refA, refB]
  rw [hd, List.mergeSort_singleton]

/-- The two canonical spellings disagree — read off `.name`, because
`ServiceRef` carries no `BEq`. -/
example :
    (canonServices [refA, refB]).map (·.name)
      ≠ (canonServices [refB, refA]).map (·.name) := by
  rw [canonServices_witness_left, canonServices_witness_right]
  simp [refA, refB]

/-- **The falsifier.** E2 with its premise deleted is FALSE. The
adversarial reading — "the `Nodup` hypothesis is bookkeeping, drop it" —
dies on a witness rather than on an argument. -/
theorem canonServices_perm_premise_is_necessary :
    ¬ ∀ (xs ys : List ServiceRef), xs.Perm ys →
        canonServices xs = canonServices ys := by
  intro h
  have hEq := h [refA, refB] [refB, refA] (List.Perm.swap refB refA [])
  rw [canonServices_witness_left, canonServices_witness_right] at hEq
  have hNames : refB.name = refA.name := by
    rw [List.cons.injEq] at hEq
    rw [hEq.1]
  simp [refA, refB] at hNames

/-! ## The door — why the estate never meets that witness -/

/-- The authoring guard implies E2's premise. This is the theorem that
licenses `tools/EmitLayers.lean:235-237`: a list the `#guard` admits has
distinct keys, so `canonServices_perm` applies to it. -/
theorem nodup_keys_of_isCanonServices {xs : List ServiceRef}
    (h : isCanonServices xs = true) : (xs.map (·.key)).Nodup := by
  have hk : xs.map (·.key) = (canonServices xs).map (·.key) := by
    simpa [isCanonServices] using h
  rw [hk]
  exact nodup_keys_canonServices xs

/-- A list the authoring guard admits IS its own canonical spelling —
so the stored term is the canonical one, which is the whole of CANON-1
at the door. -/
theorem canonServices_of_isCanonServices {xs : List ServiceRef}
    (h : isCanonServices xs = true) : canonServices xs = xs := by
  have hnd := nodup_keys_of_isCanonServices h
  have hk : xs.map (·.key) = (canonServices xs).map (·.key) := by
    simpa [isCanonServices] using h
  have hc : canonServices xs = xs.mergeSort keyLe := by
    rw [canonServices_pin, canonDedup_of_nodup_keys hnd]
  rw [hc] at hk
  have hsorted : xs.Pairwise (fun a b => keyLe a b = true) := by
    have hm : (xs.mergeSort keyLe).Pairwise (fun a b => keyLe a b = true) :=
      List.pairwise_mergeSort keyLe_trans keyLe_total xs
    have hmk : ((xs.mergeSort keyLe).map (·.key)).Pairwise
        (fun k₁ k₂ => decide (k₁ ≤ k₂) = true) :=
      List.pairwise_map.mpr hm
    rw [← hk] at hmk
    exact List.pairwise_map.mp hmk
  rw [hc, List.mergeSort_of_pairwise hsorted]

/-- The door refuses the falsifier's witness: a duplicate key makes
`canonServices` shorter than the input, so the key lists differ and the
authoring `#guard` goes red. The counterexample above is unreachable
through the authored topology. -/
example : isCanonServices [refA, refB] = false := by
  rw [isCanonServices, canonServices_witness_left]
  simp [refA, refB]

/-! ## The corollary — one service set, one term, one address -/

/-- **CANON-1's falsifiable claim, at the term.** Two authored orders of
one key-`Nodup` service set produce EQUAL `SystemNode` terms once the
authoring door has spelled them canonically.

Stated over an arbitrary two-service-list arm builder, so it covers
`.backing` and `.opaque ctor note` at once; `.service` follows the same
way on its single `requires` list. -/
theorem systemNode_canon_stable
    {mk : List ServiceRef → List ServiceRef → SystemNode}
    {p p' r r' : List ServiceRef}
    (hp : (p.map (·.key)).Nodup) (hr : (r.map (·.key)).Nodup)
    (hpp : p.Perm p') (hrr : r.Perm r') :
    mk (canonServices p) (canonServices r)
      = mk (canonServices p') (canonServices r') := by
  rw [canonServices_perm hp hpp, canonServices_perm hr hrr]

/-- **And therefore, at the address.** One service set, one address —
the cache-hit defeater `EmitLayer.lean:211-219` names is closed for
terms authored through the door.

This is a congruence and nothing more: equal terms reside at equal
addresses because `systemAddressOf` is a function. It says nothing
about collisions, and nothing about two DIFFERENT service sets. -/
theorem systemAddressOf_canon_stable
    {mk : List ServiceRef → List ServiceRef → SystemNode}
    {p p' r r' : List ServiceRef}
    (hp : (p.map (·.key)).Nodup) (hr : (r.map (·.key)).Nodup)
    (hpp : p.Perm p') (hrr : r.Perm r') :
    systemAddressOf (mk (canonServices p) (canonServices r))
      = systemAddressOf (mk (canonServices p') (canonServices r')) :=
  congrArg systemAddressOf (systemNode_canon_stable hp hr hpp hrr)

end Cas.Backend
