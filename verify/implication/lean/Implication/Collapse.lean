/-
The collapse lemma, mechanized.

Claim (docs/research/2026-08-14-implication-refusals-formalized.md §2):
against a teacher whose entire knowledge is a decidable unary predicate
`A : Term → Bool`, an evidence kind that answers PAIR queries carries no
information beyond its unary projections — any protocol using pair
queries is simulated, uniformly in `A`, by a unary-only protocol at at
most twice the query cost, computing the same result.

Model, stated so it can be argued with:

- A protocol is a decision tree (`QTree`). `unary t k` queries one term
  and branches on the teacher's Bool answer; `pair x y k` queries a pair
  and branches on an answer drawn from an arbitrary type `R`.
- "The teacher's entire knowledge is `A`" is modeled by the pair answer
  being SOME fixed function `g : Bool → Bool → R` of the two membership
  facts. This is the definition of the hypothesis, not a simplification:
  a sound teacher's reply may depend on the target only through facts it
  possesses, and it possesses exactly `A x` and `A y`. ICE evades the
  lemma precisely by violating this premise — its teacher holds a
  relation the learner cannot reconstruct from membership answers.
- `cost` counts queries actually made on the run against a given `A`
  (per-run cost, so `R` may be infinite and no branching bound is
  needed).

The theorem is `collapse`: the simulating tree is built once (`sim`),
independent of `A`, is unary-only, agrees with the original on every
teacher, and costs at most 2× on every teacher.
-/

namespace Implication

universe u v w

/-- Query protocols against a membership teacher: leaves output, unary
nodes ask one term, pair nodes ask a pair and branch on an `R`-answer. -/
inductive QTree (T : Type u) (R : Type v) (O : Type w) where
  | leaf  (out : O)
  | unary (t : T) (k : Bool → QTree T R O)
  | pair  (x y : T) (k : R → QTree T R O)

namespace QTree

variable {T : Type u} {R : Type v} {O : Type w}

/-- Run a protocol against teacher knowledge `A`, with the pair-answer
function `g` — the factoring through `(A x, A y)` that defines "knowledge
is a unary predicate". -/
def run (A : T → Bool) (g : Bool → Bool → R) : QTree T R O → O
  | leaf out   => out
  | unary t k  => run A g (k (A t))
  | pair x y k => run A g (k (g (A x) (A y)))

/-- Queries actually issued on the run against `A`. -/
def cost (A : T → Bool) (g : Bool → Bool → R) : QTree T R O → Nat
  | leaf _     => 0
  | unary t k  => 1 + cost A g (k (A t))
  | pair x y k => 1 + cost A g (k (g (A x) (A y)))

/-- Protocols that never use the pair kind. -/
inductive UnaryOnly : QTree T R O → Prop where
  | leaf  (out : O) : UnaryOnly (leaf out)
  | unary (t : T) (k : Bool → QTree T R O)
      (h : ∀ b, UnaryOnly (k b)) : UnaryOnly (unary t k)

/-- The simulation: each pair query is replaced by its two unary
projections, and the learner recomputes the teacher's `g` itself. -/
def sim (g : Bool → Bool → R) : QTree T R O → QTree T R O
  | leaf out   => leaf out
  | unary t k  => unary t (fun b => sim g (k b))
  | pair x y k => unary x (fun a => unary y (fun b => sim g (k (g a b))))

theorem sim_unaryOnly (g : Bool → Bool → R) :
    ∀ tr : QTree T R O, UnaryOnly (sim g tr)
  | leaf out   => .leaf out
  | unary t k  => .unary t _ (fun b => sim_unaryOnly g (k b))
  | pair x y k =>
      .unary x _ (fun a => .unary y _ (fun b => sim_unaryOnly g (k (g a b))))

theorem sim_run (A : T → Bool) (g : Bool → Bool → R) :
    ∀ tr : QTree T R O, run A g (sim g tr) = run A g tr
  | leaf _     => rfl
  | unary t k  => sim_run A g (k (A t))
  | pair x y k => sim_run A g (k (g (A x) (A y)))

theorem sim_cost (A : T → Bool) (g : Bool → Bool → R) :
    ∀ tr : QTree T R O, cost A g (sim g tr) ≤ 2 * cost A g tr
  | leaf _     => Nat.le_refl 0
  | unary t k  => by
      have ih := sim_cost A g (k (A t))
      simp only [sim, cost]
      omega
  | pair x y k => by
      have ih := sim_cost A g (k (g (A x) (A y)))
      simp only [sim, cost]
      omega

/-- **The collapse lemma.** For every protocol there is a unary-only
protocol — constructed without knowledge of `A` — that computes the same
output against every teacher, at ≤ 2× the queries against every teacher.
Hence a pair-valued evidence kind moves no learnability boundary and
improves no query bound beyond the constant 2, whenever the teacher's
knowledge is a decidable unary predicate. -/
theorem collapse (g : Bool → Bool → R) (tr : QTree T R O) :
    ∃ tr' : QTree T R O, UnaryOnly tr' ∧
      ∀ A : T → Bool,
        run A g tr' = run A g tr ∧ cost A g tr' ≤ 2 * cost A g tr :=
  ⟨sim g tr, sim_unaryOnly g tr,
    fun A => ⟨sim_run A g tr, sim_cost A g tr⟩⟩

end QTree

end Implication
