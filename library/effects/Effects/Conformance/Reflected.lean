/-!
# The cross-cutting reflection form

One executable checker, one judgment, one iff. Every family checker an
instance declares should also be packaged this way so both lanes share
semantics through an executable artifact.
-/

namespace Effects.Conformance

/-- Cross-cutting boolean-reflection form: one executable checker, one
judgment, one iff. -/
structure Reflected (α : Type) where
  check : α → Bool
  prop : α → Prop
  reflects : ∀ a, check a = true ↔ prop a

end Effects.Conformance
