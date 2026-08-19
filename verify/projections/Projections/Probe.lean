import Projections.Ast

namespace Projections.Probe

open Projections

/-- The gate renames this field temporarily and requires the projection to move. -/
structure Envelope where
  payload : Nat
deriving Repr, BEq

/-- Model-specific refusal rows for the probe emission, injected by a producer
    (this probe module) rather than by the generic declaration walker, whose
    own output stays `refusals := []`. Two rows exercise the total prose fold's
    applicability handling: one carries an explicit applicability, one omits it
    so the printer's fallback actually renders. -/
def sampleRefusals : List RefusalRow :=
  [ { reason := "probeUnfencedDecide", law := "probe-fence-law"
    , repair := "hold the register token", applicability := some "machine-applicable"
    , plain := "The explicit-applicability probe row."
    , algebraic := "ref(user)" }
  , { reason := "probeOminous", law := "probe-applicability-law"
    , repair := "machine rewrite", applicability := none
    , plain := "The fallback-applicability probe row."
    , algebraic := "ref(none)" } ]

/-- Attach the producer sample to a walked projection, leaving the walk itself
    untouched. This is the P3-compliant producer seam: the walk never invents
    refusal text; the probe exercises the fold that renders it. -/
def withSampleRefusals (ast : ProjectionAst) : ProjectionAst :=
  { ast with refusals := sampleRefusals }

end Projections.Probe
