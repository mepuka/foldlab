import Effects.Conformance.Schema.TraceExcludes
import Effects.Conformance.Instances.RMT001
import Effects.Remote.Laws

/-!
# RMT-003 — integrity is terminal for those bytes

TRACE-EXCLUDES over the remote client machine: the guarded mode is
"this key's content stands integrity-rejected" — the terminal-integrity
memory binds the kit's key to the kit's exact bytes — and the excluded
decision is issuing an upload command for that key and content. The
negative kit is the same request from a state with no rejection on
record, which DOES issue the upload, proving the guard is not vacuous.
The general law quantifies over every key and content; the instance
exercises the fixed kit pair.
-/

namespace Effects.Conformance

open Effects.Remote

private abbrev MSt := MachineState Nat (List UInt8)
private abbrev MIn := MInput Nat (List UInt8)
private abbrev MDec := RDecision Nat (List UInt8)

private def rejectedState : MSt :=
  { rmtEmpty with rejected := (∅ : Std.HashMap Nat (List UInt8)).insert 2 [7, 9] }

/-- RMT-003: an integrity failure is terminal for those bytes — no wire
attempt ever repeats unchanged content. -/
def rmt003 : TraceExcludes MSt MIn MDec Bool where
  id := "RMT-003"
  sentence := "When a key's content stands integrity-rejected, no step ever issues an upload command carrying that key and that exact content again — an integrity failure is terminal for those bytes, and only changed content can try the wire."
  modeOf := fun s => s.rejected[(2 : Nat)]? == some [7, 9]
  guarded := true
  decisions := fun s i => (Effects.Remote.step rmtParams s i).decisions
  bad := .issued (.upload 2 [7, 9])
  law := fun s i hm =>
    RMT_003_no_repeat_after_integrity rmtParams s i 2 [7, 9] (eq_of_beq hm)
  posState := rejectedState
  posInput := .request (.upload 2 [7, 9])
  pos_mode := by
    simp [rejectedState]
  negState := rmtEmpty
  negInput := .request (.upload 2 [7, 9])
  neg_mode := by
    simp [rmtEmpty]
  neg_bad := by
    simp [Effects.Remote.step, rmtEmpty, rmtParams]

end Effects.Conformance
