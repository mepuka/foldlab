/- The gate's shape check. Elaborating this file rebuilds every record
   of the committed kernel conformance corpus whose truth lives in the
   Lean environment and refuses the file if the emitted bytes disagree.
   Run from the package directory:

     lake env lean ShapeCheck.lean

   The path is relative to that directory, which is where the gate
   runs it. -/
import Unity.Shapes

#kernelConformance "../../packages/plait/fixtures/kernel-conformance.ndjson"
