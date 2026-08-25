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
import E2.Model
import E2.Decode

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

#print axioms E2.M8_wf1
#print axioms E2.M12_dedup
#print axioms E2.M13_frame
#print axioms E2.M14_get_put_fresh

#print axioms E2.M4a_schema
#print axioms E2.M4a_value
#print axioms E2.decNat_encNat
