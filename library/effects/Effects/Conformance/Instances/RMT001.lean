import Effects.Conformance.Schema.TraceExcludes
import Effects.Remote.Laws

/-!
# RMT-001 — no cache decision without admission

TRACE-EXCLUDES over the remote client machine at the decision-tag
projection, with the state paired with its pending input so the guard
can read both: the guarded mode is "not entitled to cache" — the
pending input does not carry bytes that pass the budget and verify for
the in-flight key — and the excluded decision is the cache tag. The
negative kit is an entitled load response, which DOES cache, proving
the guard is not vacuous. A wire-supplied digest is a routing hint;
only verification admits.
-/

namespace Effects.Conformance

open Effects.Remote

/-- Concrete machine environment for the kits: byte budget eight, a key
verified exactly when it equals the content length — the abstract
verification oracle at its simplest honest instantiation. -/
def rmtParams : Params Nat (List UInt8) :=
  { budgets := ⟨8, 4⟩
    size := List.length
    verify := fun k b => b.length == k }

/-- The machine state with nothing cached, nothing rejected. -/
def rmtEmpty : MachineState Nat (List UInt8) :=
  { phase := .idle, cache := ∅, rejected := ∅ }

private abbrev StI :=
  MachineState Nat (List UInt8) × MInput Nat (List UInt8)

private def loading2 : MachineState Nat (List UInt8) :=
  { rmtEmpty with phase := .loading 2 }

/-- RMT-001: no remote-loaded node reaches the cache or the caller
without passing standard admission. -/
def rmt001 : TraceExcludes StI Unit RTag Bool where
  id := "RMT-001"
  sentence := "When the pending input is not entitled — its bytes do not pass the declared budget and verify for the in-flight key — no step ever emits a cache decision: a wire-supplied digest is a routing hint, never an identity, and only verification admits a remote-loaded node."
  modeOf := fun p => entitledToCache rmtParams p.1 p.2
  guarded := false
  decisions := fun p _ =>
    ((Effects.Remote.step rmtParams p.1 p.2).decisions).map RDecision.tag
  bad := .cached
  law := fun p _ h =>
    RMT_001_no_cache_without_admission rmtParams p.1 p.2 h
  posState := (loading2, .fromWire (.ok 2 [7]))
  posInput := ()
  pos_mode := by decide
  negState := (loading2, .fromWire (.ok 2 [7, 9]))
  negInput := ()
  neg_mode := by decide
  neg_bad := by decide

end Effects.Conformance
