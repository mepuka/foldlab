import Cas.Lang.Fragments
import Cas.Lang.Wp

/-!
# Effect Core v1 CLASSIFICATION — kernel-checked divergences

Companion to `.staging/agent-reports/2026-08-31-effect-core-classification-anchors.md`.
Every claim of a DIVERGENCE between `CLASSIFICATION.md`'s proposed transfer
matrix (§2, §5) and the landed `PProg.envelope` sandwich is exhibited here.

Run it:

```
cd library/cas && lake env lean ../../.staging/agent-reports/2026-08-31-effect-core-classification-anchors.lean
```

Nothing here is proposed for the library.
-/

namespace EffectCoreV1Anchors

open Cas.Lang
open Cas (Bytes Addr32 Node Word Binding Ref)

/-- A length-sensitive address function: separates nodes whose encodings
differ in length. The same device `Defun.lean`'s closing witness uses. -/
def Hlen : Bytes → Addr32 := fun bs => ⟨List.replicate 32 (UInt8.ofNat bs.length), by simp⟩

/-- A constant address function: collapses every node onto one address. -/
def Hconst : Bytes → Addr32 := fun _ => ⟨List.replicate 32 0, by simp⟩

/-- Zero address, as a literal. -/
def zero : Addr32 := ⟨List.replicate 32 0, by simp⟩

/-- An address no `Hlen` image can equal (`Hlen` only ever produces
`replicate 32 k`; this is that, at k = 255 — reachable only by a node whose
encoding is 255 bytes long, and none below is). -/
def far : Addr32 := ⟨List.replicate 32 255, by simp⟩

/-! ## §A — the LANDED sequential transfers (for contrast)

`CLASSIFICATION.md` §5's `seq p k` row gives "union" for the may footprint.
The landed reads/puts transfers are LIST APPEND, which is not a union: it is
ordered and it keeps multiplicity. These two hold by `rfl` at every table. -/

/-- LANDED `seq`, read half: reads compose by `++`. -/
theorem reads_append (p q : PProg) :
    PProg.reads (p ++ q) = PProg.reads p ++ PProg.reads q := by
  simp [PProg.reads, List.flatMap_append]

/-- LANDED `seq`, write half: put shapes compose by `++`, in program order. -/
theorem puts_append (p q : PProg) :
    PProg.puts (p ++ q) = PProg.puts p ++ PProg.puts q := by
  simp [PProg.puts, List.filterMap_append]

/-! ## §B — DIV-1: the dataflow dimension's `seq` is NOT a union

`CLASSIFICATION.md` §2 requires every `AbsDomain` to carry a `seq` transfer,
and §5's `seq p k` row says "union" for the footprint columns. For the
DEPENDENCE dimension (D4) the landed carrier is `PProg.dataflow : PProg →
List (Nat × Nat)` with ABSOLUTE line indices, so `seq` must RE-INDEX the
right operand. A union — or an append — of the two operand graphs is WRONG,
not merely imprecise: it names edges the composite does not have and misses
the ones it does. -/

/-- DIV-1. `p ++ q`'s dataflow is not the union (nor the append) of the
operands'. Left: one put. Right: one load of answer 0. In `q` alone the edge
is `(0,0)`; in `p ++ q` it is `(1,0)`. -/
theorem div1_dataflow_seq_is_not_union :
    ∃ p q : PProg,
      PProg.dataflow (p ++ q) ≠ PProg.dataflow p ++ PProg.dataflow q
        ∧ PProg.dataflow (p ++ q) = [(1, 0)]
        ∧ PProg.dataflow p = []
        ∧ PProg.dataflow q = [(0, 0)] := by
  refine ⟨[.put 0 0 [] []], [.load (.ans 0)], by decide, by decide, by decide, by decide⟩

/-- DIV-1, corollary: closedness is not preserved by the proposed union
either. `q` alone has an OPEN dataflow (edge `(0,0)` names its own line);
`p ++ q` is CLOSED. So `Envelope.dataflowClosed` is not a `seq`-homomorphic
property, and a `seq` transfer that unions the operands' graphs would report
the composite open. -/
theorem div1_closure_not_seq_homomorphic :
    ∃ p q : PProg,
      (PProg.envelope q).dataflowClosed = false
        ∧ (PProg.envelope (p ++ q)).dataflowClosed = true := by
  refine ⟨[.put 0 0 [] []], [.load (.ans 0)], by decide, by decide⟩

/-! ## §C — DIV-2: the world dimension's `seq` cannot be a commutative join

`CLASSIFICATION.md` §3 D2 says "Sequential composition unions frames." A
union is commutative. The estate's observation (`ObsEq`, R5 — the word) is
NOT: two tables whose put multisets are equal leave different words. So a
commutative `seq` at D2 identifies programs the estate's own observable
separates, and `runPFrom_puts_sound` concluding `List.Sublist` (an ordered
relation) rather than `⊆` is load-bearing, not stylistic. -/

/-- DIV-2. Permuted put lists, different words. -/
theorem div2_world_seq_is_not_commutative :
    ∃ (p q : PProg),
      List.Perm (PProg.puts p) (PProg.puts q)
        ∧ (runP Hlen p []).2 ≠ (runP Hlen q []).2
        ∧ (runP Hlen p []).2.length = 2
        ∧ (runP Hlen q []).2.length = 2 := by
  refine ⟨[.put 0 0 [] [], .put 0 0 [7] []], [.put 0 0 [7] [], .put 0 0 [] []],
    ?_, by decide, by decide, by decide⟩
  exact List.Perm.swap _ _ []

/-! ## §D — DIV-3: one "footprint" column cannot carry both D1 and D2

`CLASSIFICATION.md` §5 gives ONE "may footprint" and ONE "must footprint"
column per flow form. The landed instance needs two, because the operation
footprint (D1) and the world delta (D2) come apart on a run that neither
refuses nor branches: `put`'s DUPLICATE outcome performs the operation and
appends no binding. This is `Defun.lean`'s GAP 2, restated so both halves
are visible in the same statement — the run reports `done` (so §5's "`p`
must normally reach `k`" side condition is DISCHARGED), `answersFrom` has
one entry per line (so every line executed), and the word grew by one. -/

/-- DIV-3. Two put lines, both executed, one binding written. -/
theorem div3_op_footprint_ne_world_footprint :
    ∃ (p : PProg),
      (runP Hlen p []).1.isDone = true
        ∧ (runP Hlen p []).1.isRefused = false
        ∧ (PProg.answersFrom Hlen [] p).length = p.length
        ∧ p.length = 2
        ∧ (PProg.puts p).length = 2
        ∧ (runP Hlen p []).2.length = 1 := by
  refine ⟨[.put 0 0 [] [], .put 0 0 [] []], by decide, by decide, by decide, rfl, rfl,
    by decide⟩

/-! ## §E — DIV-4: `E = empty` is not decided by the envelope

`CLASSIFICATION.md` §3 D0 calls `AERDomain` "exact for the checked graph's
type", and §6 reduction 10 says `AER.E = empty` does not remove defects.
At L-A the estate has no `E` row at all: `Refusal` (`Interp.lean:28`) is a
flat six-constructor sum with an untyped `failed : String` arm, and the
envelope decides exactly ONE of the six statically (`runP_no_dangling`).

The witness: a table with EMPTY reads and a CLOSED dataflow — the two
things the envelope can decide — still refuses, with `collision`. -/

/-- DIV-4. Empty reads, closed dataflow, still refuses. -/
theorem div4_envelope_does_not_bound_the_error_row :
    ∃ (p : PProg) (w : Word),
      PProg.reads p = []
        ∧ (PProg.envelope p).dataflowClosed = true
        ∧ (runP Hconst p w).1 = .refused (.collision zero) := by
  refine ⟨[.put 0 0 [] []], [Binding.mk zero ⟨0, 0, [9], []⟩], by decide, by decide, ?_⟩
  rfl

/-! ## §F — DIV-5: the write ADDRESSES are not in the envelope

`CLASSIFICATION.md` §3 D2's carrier is "must/may reads, WRITES, allocations
… ". The landed envelope's read half IS addresses (`PProg.reads : PProg →
List Addr32`); its write half is NOT (`PProg.puts : PProg → List PutShape`,
and `PutShape` has version/tag/payload/refKinds and no address). The
asymmetry is forced: an address is `H (encodeNode …)`, and `PProg.envelope :
PProg → Envelope` takes no `H`. Same table, two address functions, two
different written addresses. -/

/-- DIV-5. The envelope is `H`-free; the written addresses are not. -/
theorem div5_write_addresses_not_in_envelope :
    ∃ (p : PProg),
      (runP Hlen p []).2.map Binding.address
        ≠ (runP Hconst p []).2.map Binding.address := by
  refine ⟨[.put 0 0 [] []], by decide⟩

/-! ## §G — DIV-6: the estate's landed observation mask hides the refusal word

`CLASSIFICATION.md` §3 D14 requires an `ObservationDomain` before any
equivalence claim. The estate HAS one and it is fixed: `ObsEq`
(`Representation.lean:134`) is equality of `interpretRef`, whose error branch
carries no word (`ObsEq.run_refused`, `Representation.lean:198`). So the
mask "result + word on success, refusal alone on failure" is strictly
coarser than the word. The witness: two tables, same refusal, different
partial words. -/

/-- DIV-6. Same refusal value, different words left behind. -/
theorem div6_refusal_word_outside_the_mask :
    ∃ (p q : PProg),
      (runP Hlen p []).1 = .refused (.noObject far)
        ∧ (runP Hlen q []).1 = .refused (.noObject far)
        ∧ (runP Hlen p []).2 ≠ (runP Hlen q []).2 := by
  refine ⟨[.load (.lit far)], [.put 0 0 [] [], .load (.lit far)], ?_, ?_, by decide⟩
  · rfl
  · rfl

/-! ## §G2 — D5: suspension and divergence are ALREADY separated, by type

`CLASSIFICATION.md` §3 D5 requires `ProgressDomain` to keep `suspended`
distinct from `diverges`, and `EC1-FC10` names "finite fuel establishes
termination" as a falsifier. The estate separates them in the `Status` TYPE
(`Interp.lean:42`): `run` out of fuel reports `.running`, which is neither
`done` nor `refused`. At L-A `runP` never reports it (`runP_halts`,
`Defun.lean:403`), so `mustTerminate` is exact there and needs no ranking.

The exhibit is the L-P half: fuel exhaustion is a THIRD status, so a run
report can never be mistaken for a termination proof. -/

/-- D5. Out of fuel is `.running`, and the same program at more fuel is not.
`Status.isRunning` is the discriminator the word gate already tests. -/
theorem d5_fuel_exhaustion_is_suspension :
    ∃ (p : Cas.Lang.Prog CasSig Addr32),
      (run Hlen 0 p []).1.isRunning = true
        ∧ (run Hlen 2 p []).1.isRunning = false := by
  refine ⟨Cas.Lang.put ⟨0, 0, [], []⟩, rfl, ?_⟩
  rfl

/-- D5, L-A half, cited not re-argued: no table run is ever suspended. -/
theorem d5_no_suspension_at_LA (p : PProg) (w : Word) :
    (runP Hlen p w).1.isRunning = false := runP_halts Hlen p w

/-! ## §H — the reification predicate's SHAPE, as the estate already has it

`CLASSIFICATION.md` §3 D13 wants `ReificationDomain` DECIDABLE on a program.
`PLine.HashDetermined` (`Defun.lean:1480`) is a `Prop` quantified over every
environment, word and answer — undecidable as written. The estate's one
existing predicate of the wanted shape is `Envelope.dataflowClosed`
(`Defun.lean:1221`): a `Bool` on stratum-1 data, paired with a theorem that
`= true` implies a property of EVERY run (`runP_no_dangling`,
`Defun.lean:2101`).

Below: the same shape, instantiated for reification grade, to show the
pattern transfers. `PKind` already exists and already `deriving
DecidableEq`; the grade of an L-A table is a fold over its lines, and the
soundness theorem is discharged by `PLine.hashDetermined`. -/

/-- Reification grade, `CLASSIFICATION.md` D13's carrier, restricted to what
L-A can express. -/
inductive Grade where
  | closed
  | modeledForeignEffect
  deriving DecidableEq, Repr

/-- The grade of a line, decided structurally. Every `PLine` is a `CasSig`
operation, so at L-A this is constantly `closed` — which is the point: the
predicate is TOTAL and COMPUTABLE, and it is the signature, not the line,
that has to grow before it can return anything else. -/
def PLine.grade : PLine → Grade
  | .put .. => .closed
  | .load _ => .closed

/-- A table's grade: the join over its lines, `closed` being the unit. -/
def PProg.grade (p : PProg) : Grade :=
  p.foldl (fun g l => match g, PLine.grade l with
    | .closed, .closed => .closed
    | _, _ => .modeledForeignEffect) .closed

/-- DECIDABLE, and it agrees with the semantic property: a table graded
`closed` has every line hash-determined. The right-hand side is
`PLine.hashDetermined`, cited not re-argued — which is exactly why the
grade is worth computing rather than assuming. -/
theorem grade_closed_sound (H : Bytes → Addr32) (p : PProg)
    (_h : PProg.grade p = .closed) :
    ∀ l ∈ p, PLine.HashDetermined H l :=
  fun l _ => PLine.hashDetermined H l

/-- And the converse direction the estate cannot yet supply, made visible:
the grade is constantly `closed` at L-A, so it carries NO information until
the carrier admits a non-`CasSig` line. This `decide` is the finding. -/
theorem grade_is_constant_at_LA :
    PProg.grade [.put 0 0 [] [], .load (.lit zero), .load (.ans 0)] = .closed := by
  decide

/-! ## §I — receipts -/

#print axioms div1_dataflow_seq_is_not_union
#print axioms div1_closure_not_seq_homomorphic
#print axioms div2_world_seq_is_not_commutative
#print axioms div3_op_footprint_ne_world_footprint
#print axioms div4_envelope_does_not_bound_the_error_row
#print axioms div5_write_addresses_not_in_envelope
#print axioms div6_refusal_word_outside_the_mask
#print axioms d5_fuel_exhaustion_is_suspension
#print axioms grade_closed_sound
#print axioms reads_append
#print axioms puts_append

end EffectCoreV1Anchors
