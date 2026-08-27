import Effects.Conformance.Schema.Distinctness
import Effects.Replay.Laws

/-!
# CMP-002 — identical requests remain separate occurrences

DISTINCTNESS over the record-mode append: emitting an occurrence claims
the current position and advances it, so two emissions — even with
byte-identical invocation content and outcome — carry distinct occurrence
positions. Position is the occurrence identity; the store deduplicates
request nodes while the history keeps entries distinct. The carrier is
the active record-mode sub-state, kept by every append.
-/

namespace Effects.Conformance

open Effects.Replay

/-- An active record-mode session: the states occurrence emission acts
on, closed under the append. -/
private abbrev Rec :=
  { s : SessionState String String String String //
      s.status = .active ∧ s.mode = .record }

private abbrev EmitIn := Invocation String String × Outcome String String

private def emitOccurrence (s : Rec) (io : EmitIn) : Nat × Rec :=
  (s.val.cursor,
    ⟨(reduce s.val (.recorded io.1 io.2)).state,
      append_preserves_flags s.val io.1 io.2 s.property.1 s.property.2⟩)

private def start : Rec := ⟨⟨.record, .active, [], 0⟩, rfl, rfl⟩

private def sameCall : EmitIn :=
  (⟨"acme/Rates/get", 1, "req-0"⟩, .success "ok")

/-- CMP-002: identical invocation content never collapses occurrences. -/
def cmp002 : Distinctness Rec EmitIn Nat EmitIn where
  id := "CMP-002"
  sentence := "Two occurrences with identical invocation content remain distinct occurrence positions — the store deduplicates request nodes while the history keeps entries distinct; position is the occurrence identity, and every append claims a fresh one."
  contentOf := id
  emit := emitOccurrence
  law := fun s i i' _ => by
    have h1 := CMP_002_append_advances_position s.val i.1 i.2
      s.property.1 s.property.2
    simp only [emitOccurrence, h1]
    omega
  posState := start
  posInput := sameCall
  posInput' := sameCall
  pos_content := rfl

end Effects.Conformance
