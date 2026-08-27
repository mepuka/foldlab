import Effects.Conformance.Schema.WfPreserve
import Effects.Conformance.Schema.TraceExcludes
import Effects.Conformance.Schema.ExactStep
import Effects.Conformance.Schema.FailClosed
import Effects.Conformance.Schema.Distinctness
import Effects.Conformance.Schema.Homomorphism
import Effects.Conformance.Schema.Codec
import Effects.Conformance.Schema.RejectionClause

/-!
# The instance registry

The registry lists every instantiated (therefore proved-with-kit)
obligation, via each family's `entry` projection. Pending obligations are
exactly those in the plan's obligation ledger that are absent here; the
phase-1 ledger generator merges the two with the TypeScript suite and
mutation results. Empty until the M2/M3 slices land their instances.
-/

namespace Effects.Conformance

def registry : List LedgerEntry := []

#guard emitLedger registry ==
  "# Conformance ledger — Lean-side projection\n\nNo instantiated obligations yet.\n"

end Effects.Conformance
