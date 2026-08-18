/- The gate's conformance check. Elaborating this file reads the
   committed kernel conformance corpus back, enforces the both-ways law
   over every line, and rebuilds every record whose truth lives in the
   Lean environment, refusing the file if the committed bytes disagree.
   Run from the package directory:

     lake env lean ConformanceCheck.lean

   The path is relative to that directory, which is where the gate
   runs it. The gate also runs this check against mutated copies of the
   corpus, so the path is the only thing that varies between the arm
   that must pass and the arms that must fail. -/
import Unity.Check

#kernelConformance "../../packages/plait/fixtures/kernel-conformance.ndjson"
