/-!
# What `@[export]` refuses

Own-authored for foldlab RQ-1, 2026-08-16. This file is *expected to fail*
to compile; it exists so the report can quote the compiler's own refusal
message rather than assert a constraint from memory. Uncomment one case
at a time and run `lake env lean Reject.lean`.

Case A — a polymorphic function (no monomorphic ABI to emit).
Case B — a theorem / proposition (no runtime representation).
Case C — a type-class-dispatched function left polymorphic.
-/

-- Case A
@[export reject_poly]
def rejectPoly (xs : List α) : Nat := xs.length

-- Case B
@[export reject_thm]
theorem rejectThm : 1 + 1 = 2 := rfl

-- Case C
@[export reject_cls]
def rejectCls [Add α] (a b : α) : α := a + b
