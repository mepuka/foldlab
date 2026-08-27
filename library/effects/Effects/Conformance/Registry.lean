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
import Effects.Conformance.Instances.CMP001
import Effects.Conformance.Instances.RPL002
import Effects.Conformance.Instances.RPL003
import Effects.Conformance.Instances.RPL004
import Effects.Conformance.Instances.RPL005
import Effects.Conformance.Instances.SES001
import Effects.Conformance.Instances.SES002
import Effects.Conformance.Instances.CMP002

/-!
# The instance registry

The registry lists every instantiated (therefore proved-with-kit)
obligation, via each family's `entry` projection. Pending obligations are
exactly those in the plan's obligation ledger that are absent here; the
phase-1 ledger generator merges the two with the TypeScript suite and
mutation results.
-/

namespace Effects.Conformance

def registry : List LedgerEntry :=
  [ cas001.entry, cas002.entry
  , rpl002.entry, rpl003.entry, rpl004.entry, rpl005.entry
  , ses001.entry, ses002.entry, cmp001.entry, cmp002.entry ]

#guard registry.map (·.id) ==
  ["CAS-001", "CAS-002", "RPL-002", "RPL-003", "RPL-004", "RPL-005",
   "SES-001", "SES-002", "CMP-001", "CMP-002"]
#guard registry.map (·.family) ==
  ["CODEC", "REJECTION-CLAUSE", "TRACE-EXCLUDES", "EXACT-STEP",
   "FAIL-CLOSED", "FAIL-CLOSED", "TRACE-EXCLUDES", "WF-PRESERVE",
   "HOMOMORPHISM", "DISTINCTNESS"]
#guard (emitLedger registry).take 20 == "# Conformance ledger"

end Effects.Conformance
