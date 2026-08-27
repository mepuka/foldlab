import Effects.Conformance.Schema.WfPreserve
import Effects.Conformance.Schema.TraceExcludes
import Effects.Conformance.Schema.ExactStep
import Effects.Conformance.Schema.FailClosed
import Effects.Conformance.Schema.Distinctness
import Effects.Conformance.Schema.Homomorphism
import Effects.Conformance.Schema.Codec
import Effects.Conformance.Schema.RejectionClause
import Effects.Conformance.Instances.CAS001
import Effects.Conformance.Instances.CAS002

/-!
# The instance registry

The registry lists every instantiated (therefore proved-with-kit)
obligation, via each family's `entry` projection. Pending obligations are
exactly those in the plan's obligation ledger that are absent here; the
phase-1 ledger generator merges the two with the TypeScript suite and
mutation results.
-/

namespace Effects.Conformance

def registry : List LedgerEntry := [cas001.entry, cas002.entry]

#guard registry.map (·.id) == ["CAS-001", "CAS-002"]
#guard registry.map (·.family) == ["CODEC", "REJECTION-CLAUSE"]
#guard (emitLedger registry).take 20 == "# Conformance ledger"

end Effects.Conformance
