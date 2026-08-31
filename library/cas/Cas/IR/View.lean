import Cas.IR.Column

/-!
# The view — "this view is a query", made a structure

A VIEW is a MONOID HOMOMORPHISM out of the store word: a target
carrier with a merge and an empty, a `run` into it, and the two laws
saying `run` respects the word's own monoid `(Word, ++, [])`. That is
the whole content of the phrase — a query over the word is not an
arbitrary function of it, it is a function that COMMUTES WITH GROWTH.

`run_append` IS the incremental render. A word grown by a suffix
re-renders by merging the suffix's contribution into what is already
drawn, never by recomputing the whole. `Column.lean` proves that shape
for the strips, one classifier at a time; this structure is the shape
itself, so a new query is admitted by exhibiting its two laws and
every consumer inherits incrementality without re-proving it.

Columns are the first inhabitants (`View.column`, `View.unregistered`),
and column HEIGHT is the second (`View.height`) — the query the
trunk's hypotenuse sorts by, and the first view whose carrier is not
the word. `View.prod` closes the family under pairing: a component
reading two queries is ONE view with ONE incremental render, so
"how many views does this component have" stops being a question the
render path can get wrong.

Associativity of `merge` needs no theorem here. On the image of `run`
it falls out of `List.append_assoc` through `run_append`: the word's
append is associative, and a homomorphism transports that to the
carrier wherever `run` reaches. Stating a view as a homomorphism
rather than as a function beside a cache is what makes that free.

Two things a view deliberately does NOT carry:

- **Its name.** A UI component is a NAMED view; the label comes from
  the naming homomorphism's emitted inventory and is no part of what
  the query computes.
- **Its channels.** How a view's numbers reach the eye is the trunk's
  six-field spec — `(classifier, order ruling, regime, cut cadence,
  DOI parameters, channel assignment)` in `GEOMETRY.md` — ruled by
  perceptual accuracy, and none of it is a fact about the query.

Both are ASSIGNED to a view from outside, which is what lets one view
be drawn twice, or drawn differently under two regimes, off one proof.
-/

namespace Cas

namespace Word

/-- A query over the store word that commutes with growth: `run` into
a carrier `α`, the carrier's `merge` and `empty`, and the two
homomorphism laws — `run_nil`, the empty word renders empty, and
`run_append`, the incremental render. Nothing here is about drawing;
the laws are what make drawing incremental. -/
structure View (α : Type) where
  run : Word → α
  merge : α → α → α
  empty : α
  run_nil : run [] = empty
  run_append : ∀ w v : Word, run (w ++ v) = merge (run w) (run v)

/-- The sort strip as a view. The carrier is the word itself, merge is
append, and `column_append` is the whole of the homomorphism law —
which is why the column algebra needed no new machinery to become a
view. -/
def View.column (t : Grammar.Ty) : View Word where
  run := Word.column t
  merge := (· ++ ·)
  empty := []
  run_nil := rfl
  run_append := Word.column_append t

/-- The residue strip as a view, on the same shape. The board's
totality (`mem_column_or_unregistered`) says the sort views and this
one together read every binding exactly once, so a rendered trunk
drops nothing and doubles nothing. -/
def View.unregistered : View Word where
  run := Word.unregistered
  merge := (· ++ ·)
  empty := []
  run_nil := rfl
  run_append := Word.unregistered_append

/-- COLUMN HEIGHT — the trunk's own numeric query, and the thing the
hypotenuse sorts by. The carrier is `Nat` under addition, so this is
the first view that is not the word cut down: growth adds heights, and
a redraw after a suffix is one addition per strip. -/
def View.height (t : Grammar.Ty) : View Nat where
  run := fun w => (Word.column t w).length
  merge := (· + ·)
  empty := 0
  run_nil := rfl
  run_append := by
    intro w v
    show (Word.column t (w ++ v)).length
        = (Word.column t w).length + (Word.column t v).length
    rw [Word.column_append, List.length_append]

/-- Two views paired is one view, componentwise. A component that
reads a strip and its height, or two strips side by side, is a SINGLE
query with a single incremental render — the pairing carries both laws
and no consumer has to keep two renders in step. -/
def View.prod {α β : Type} (V : View α) (W : View β) : View (α × β) where
  run := fun w => (V.run w, W.run w)
  merge := fun x y => (V.merge x.1 y.1, W.merge x.2 y.2)
  empty := (V.empty, W.empty)
  run_nil := by
    show (V.run [], W.run []) = (V.empty, W.empty)
    rw [V.run_nil, W.run_nil]
  run_append := by
    intro w v
    show (V.run (w ++ v), W.run (w ++ v))
        = (V.merge (V.run w) (V.run v), W.merge (W.run w) (W.run v))
    rw [V.run_append, W.run_append]

end Word

end Cas
