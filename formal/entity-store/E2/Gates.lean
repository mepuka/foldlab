/-
The opaque/unsafe scan — the standing gate ratified 2026-08-25 (kickoff §12): no constant
in the artifact's namespaces may be `opaque` (the `partial` trap) or `unsafe`.
`#print axioms` cannot see either. Fails the build on any offender.
-/
import Lean
import E2.Core
import E2.Encode
import E2.Canon
import E2.Correspondence
import E2.Obligations
import E2.CanonIdem
import E2.Model
import E2.Decode
import E2.Resolve
import E2.Graph
import E2.Admission
import E2.Bridge
import E2.Faithful
import E2.Closure
import E2.Reject
import E2.TypedReachability

open Lean Elab Command in
elab "#e2_opaque_scan" : command => do
  let env ← getEnv
  let mut offenders : Array (Name × String) := #[]
  let mut scanned := 0
  for (n, ci) in env.constants.toList do
    -- Compiler-generated `f._unsafe_rec` companions exist for every recursive safe `def`;
    -- they are code-generator internals, never admissible in proofs. The gate's targets
    -- are opaque LOGICAL constants (the `partial` trap) and user-level unsafe defs.
    let isCompilerCompanion := match n with
      | .str _ s => s == "_unsafe_rec"
      | _ => false
    if (`E2).isPrefixOf n && !isCompilerCompanion then
      scanned := scanned + 1
      match ci with
      | .opaqueInfo v =>
          offenders := offenders.push (n, if v.isUnsafe then "unsafe opaque" else "opaque")
      | .defnInfo v =>
          if v.safety != .safe then offenders := offenders.push (n, "unsafe def")
      | _ => pure ()
  unless offenders.isEmpty do
    throwError "gate FAILED — opaque/unsafe constants under E2: {offenders}"
  logInfo s!"e2 opaque/unsafe gate ok ({scanned} constants scanned)"

#e2_opaque_scan

#print axioms E2.Correspondence.tags_distinct
#print axioms E2.directionA
#print axioms E2.kind_separation

/-! Kernel-reducibility smoke: the derived `DecidableEq` and the one-line `BEq` reduce
    (`rfl`), and `canonS` computes the R-10 field sort — `decide` exercises the instance.
    These are the checks the `partial`→`opaque` trap would silently break. -/

example : (E2.SchemaCore.array (.prim .int) == E2.SchemaCore.array (.prim .int)) = true := by
  rfl

example :
    E2.canonS (.object (.cons "b" (.prim .str) false (.cons "a" (.prim .int) false .nil)))
      = .object (.cons "a" (.prim .int) false (.cons "b" (.prim .str) false .nil)) := by
  decide

/-! W3-19/F-48 kernel spot-checks: the two carriers that used to break S1, now decided in
    the kernel rather than argued. Both were fixed points of the OLD sort only by
    accident — the first because the involution reversed it twice, the second because it
    is a palindrome (F-40's shape). Under the flipped guard both are idempotent for the
    reason the theorem gives. -/

/-- F-12's original tie witness: the equal-key run that used to reverse. -/
example :
    E2.canonS (E2.canonS (.object (.cons "a" (.prim .int) false
                                  (.cons "a" (.prim .str) false
                                  (.cons "a" (.prim .bool) false .nil)))))
      = E2.canonS (.object (.cons "a" (.prim .int) false
                           (.cons "a" (.prim .str) false
                           (.cons "a" (.prim .bool) false .nil)))) := by
  decide

/-- And, stability being the point, the run now comes out in INPUT order — under the old
    guard this reversed to `bool, str, int`. -/
example :
    E2.canonS (.object (.cons "a" (.prim .int) false
                       (.cons "a" (.prim .str) false
                       (.cons "a" (.prim .bool) false .nil))))
      = .object (.cons "a" (.prim .int) false
                (.cons "a" (.prim .str) false
                (.cons "a" (.prim .bool) false .nil))) := by
  decide

/-- F-40's shape: the palindromic duplicate-key run — three fields, two schemas. -/
example :
    E2.canonS (E2.canonS (.object (.cons "a" (.prim .int) false
                                  (.cons "a" (.prim .str) false
                                  (.cons "a" (.prim .int) false .nil)))))
      = E2.canonS (.object (.cons "a" (.prim .int) false
                           (.cons "a" (.prim .str) false
                           (.cons "a" (.prim .int) false .nil)))) := by
  decide

/-- The value twin of the tie witness (`vobj`), per plane-inheritance. -/
example :
    E2.canonV (E2.canonV (.vobj (.cons "a" (.vint 1)
                                (.cons "a" (.vint 2)
                                (.cons "a" (.vint 3) .nil)))))
      = .vobj (.cons "a" (.vint 1) (.cons "a" (.vint 2) (.cons "a" (.vint 3) .nil))) := by
  decide

#print axioms E2.M8_wf1
#print axioms E2.M12_dedup
#print axioms E2.M13_frame
#print axioms E2.M14_get_put_fresh

#print axioms E2.M4a_schema
#print axioms E2.M4a_value
#print axioms E2.decNat_encNat

#print axioms E2.M15_fresh
#print axioms E2.M15_faithful_schema
#print axioms E2.M15_faithful_entity
#print axioms E2.M9_wf2
#print axioms E2.NEG2_dangling_unreachable
#print axioms E2.encSchema_inj
#print axioms E2.encValue_inj
#print axioms E2.M12E_dedup

/- Window B (W3-3): the only new PROVED item. `Graph` and `Admission` are otherwise
   definitions and stated obligations, which `#print axioms` has nothing to say about. -/
#print axioms E2.wfsB_iff

/- W3-7 seat: M17 typed reachability, proved in `E2/TypedReachability.lean` against the
   statement pinned in `E2/Admission.lean`. No `H`-injectivity hypothesis. -/
#print axioms E2.M17_typed_reachability

/- W3-19 seat: S1 and its value twin, proved in `E2/CanonIdem.lean` against the
   statements restored to UNCONDITIONAL form in `E2/Obligations.lean`. No `dupFreeS` /
   `dupFreeV` hypothesis — the flipped comparison retired F-12's involution at the root. -/
#print axioms E2.S1_canon_idempotent
#print axioms E2.S1_canon_v_idempotent
