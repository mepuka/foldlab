# A theory curriculum for the spine

*A guided course in programming-language formalism, written for an engineer who is fluent in
TypeScript and Effect and brand-new to Lean 4 and to the vocabulary of language design.*

Status: exploratory teaching document. Nothing here is a requirement, a decision, or a
specification. It is the background you need in order to *own* the design of the spine —
the small content-addressed core you are building: a tiny core calculus, a canonical byte
encoding, a SHA3-512 address, an append-only store, and later a scripting surface on top.

---

## How to read this

Every chapter has the same three beats.

1. **The idea.** Plain words, one small example. Where a TypeScript analogy genuinely helps
   I use it; where it would mislead you I say so and drop it. TypeScript's type system was
   built to describe a language that already existed; the systems in this document are built
   *before* their languages exist. That difference is the whole point of Chapter 6.
2. **The formal shape.** The precise statement, in the notation the literature uses, so that
   when you open Pierce or Harper the page looks familiar.
3. **In Lean 4 this is:** real Lean code — core Lean 4.33.1, no Mathlib — of the kind you
   would actually type into a file and watch the Infoview elaborate. Then one sentence on
   why the spine cares.

**Every Lean snippet in this document was compiled.** They were checked with `lean` from
`leanprover/lean4:v4.33.1` (the same toolchain as `formal/fips202` and your
`Fragment/Stream.lean` scratch), core library only, no dependencies. The two exceptions are
marked in place with a comment, because they reference the `fips202` package and would need
a `require` in a `lakefile.toml` to build.

I assume you can read `Fragment/Stream.lean`: `inductive` declarations, function definitions
by pattern match, `theorem` with `by decide` or `rfl`, `∃`/`∀`/`∧`, and the habit of writing
`def obligation_F1 : Prop := ...` to name a claim you have not proved yet. Everything past
that, I build up.

### The order, and why it is this order

The chapters follow the dependency order of the *ideas*, which happens to be the build order
of the spine — that is not a coincidence, and Chapter 9 makes the correspondence explicit.

| # | Chapter | Depends on |
|---|---|---|
| 1 | Abstract syntax as inductive types | — |
| 2 | Binding and variables | 1 |
| 3 | Substitution and its lemmas | 2 |
| 4 | Operational semantics | 3 |
| 5 | Type systems | 4 |
| 6 | Metatheory as a design tool | 1–5 |
| 7 | Canonical forms and normalization | 4, 6 |
| 8 | The Curry–Howard one-pager | — (read any time) |
| 9 | The map: chapter → spine stage | all |

You could read Chapter 8 first if the phrase "proofs are programs" is currently bothering
you. It is short and it is orthogonal.

---

# Chapter 1 — Abstract syntax as inductive types

## 1.1 The idea

Here is the sentence this whole chapter exists to unpack:

> **A syntax tree is not a data structure that represents your language. It *is* your
> language.**

When you write a parser in TypeScript, you produce an AST, and the AST is a convenience — a
shape you chose so that later passes are easy to write. If you had chosen a different shape
the language would be the same language. That intuition is exactly backwards here.

In this subject, you *define* the language by writing down its abstract syntax. There is no
prior language that the syntax describes. The definition is the thing. And because the
definition is an inductive type, you get, for free and immediately:

- a **complete list of cases** — no other trees exist;
- **structural induction** — a proof principle over *all* programs;
- **structural recursion** — total functions over all programs, with termination checked;
- **constructor disjointness and injectivity** — `lit 3` is not a `plus`, and if two `plus`
  nodes are equal then their children are equal, pairwise.

Those last three bullets are what "the set of programs is a theorem-bearing object" means.
The set of programs isn't a set you talk *about*; it is an object that arrives with reasoning
principles already attached.

**The tiny example.** A three-constructor arithmetic language: literals, addition, and a
conditional.

```
e ::= n | e + e | if e then e else e
```

Three ways to build an expression, and nothing else. `if (2+3) then 1 else 0` is a tree
whose root is a conditional whose first child is an addition.

**The TypeScript analogy, and where it breaks.** The honest analogy is a discriminated union:

```ts
type Exp =
  | { kind: "lit";  n: number }
  | { kind: "plus"; a: Exp; b: Exp }
  | { kind: "ite";  c: Exp; t: Exp; e: Exp }
```

The analogy is good for *shape*: three variants, recursive, exhaustively matchable, and if
you have used Effect's `Data.TaggedEnum` or `Schema` you already think in exactly this way.

The analogy breaks in three places, and each break is a thing you gain:

1. **Exhaustiveness is a theorem, not a lint.** TypeScript's exhaustiveness checking is a
   best-effort analysis over a type system with `any`, structural subtyping, and unsound
   escape hatches. In Lean, "these are all the cases" is a *derived proof term* — the
   recursor — that the kernel checks.
2. **Recursion must terminate, and Lean proves it.** Your TS `Exp` admits
   `const loop: Exp = { kind: "plus", a: loop, b: loop }` (well, with a `let` and a
   reassignment — but the type permits cyclic values, and a recursive `eval` over it diverges).
   Lean's `Exp` contains only finite trees. This is not a style guideline; it is what makes
   induction sound.
3. **There is no subtyping and no widening.** A Lean inductive type is *generated* by its
   constructors and contains nothing else. TypeScript's unions are describing a pre-existing
   soup of values; Lean's inductives are manufacturing a universe.

## 1.2 The formal shape

Formally you write a grammar as a BNF production, and its meaning is: **the least set closed
under the constructors.**

```
Exp  ∋  e  ::=  lit n   (n ∈ ℕ)
             |  plus e₁ e₂
             |  ite e₁ e₂ e₃
```

"Least set closed under" is doing real work. It says two things at once:

- *closed*: if `e₁, e₂ ∈ Exp` then `plus e₁ e₂ ∈ Exp` (the constructors are total);
- *least*: nothing is in `Exp` unless a finite number of constructor applications put it
  there (there are no infinite trees, no "extra" expressions).

The *least* half is precisely the **structural induction principle**:

> To prove `P(e)` for every `e ∈ Exp`, it suffices to prove
> `P(lit n)` for all `n`, and `P(plus e₁ e₂)` given `P(e₁)` and `P(e₂)`, and
> `P(ite e₁ e₂ e₃)` given `P(e₁)`, `P(e₂)`, `P(e₃)`.

This is the same principle as induction on natural numbers, generalized from a chain to a
tree. Reference: Pierce, *Types and Programming Languages* (MIT Press, 2002), §3.3
"Induction on Syntax"; Harper, *Practical Foundations for Programming Languages*, 2nd ed.
(Cambridge, 2016), Chapter 1, which is the most careful treatment of "abstract syntax tree"
as a mathematical object I know of.

## 1.3 In Lean 4 this is:

```lean
namespace Ch1

inductive Exp where
  | lit  (n : Nat)
  | plus (a b : Exp)
  | ite  (c t e : Exp)
  deriving Repr, DecidableEq
```

That is the whole language definition. Now look at what Lean handed you without being asked.
Put your cursor on these `#check` lines in VS Code and read the Infoview:

```lean
#check @Exp.rec
#check @Exp.plus.injEq
#check @Exp.noConfusion
```

`Exp.rec` prints as (this is verbatim output from the compile run):

```
@Exp.rec : {motive : Exp → Sort u_1} →
  ((n : Nat) → motive (Exp.lit n)) →
    ((a b : Exp) → motive a → motive b → motive (a.plus b)) →
      ((c t e : Exp) → motive c → motive t → motive e → motive (c.ite t e)) →
        (t : Exp) → motive t
```

Read it slowly, because this one type is the entire content of §1.2:

- `motive : Exp → Sort u_1` is the thing you want for every expression. If `motive e` is a
  `Prop`, this is the induction principle. If `motive e` is a `Type` — say, always `Nat` —
  this is the recursion principle, i.e. a fold.
- The three middle arguments are the three cases, each receiving the results for its
  children (`motive a → motive b → ...`). Those are your induction hypotheses.
- The conclusion `(t : Exp) → motive t` is "for every expression".

**Induction and recursion are the same function.** `Exp.rec` at `Sort 0` gives you proofs;
at `Sort 1` it gives you programs. Hold onto that; it is Chapter 8 in a sentence.

`Exp.plus.injEq` prints as:

```
Exp.plus.injEq : ∀ (a b a_1 b_1 : Exp), (a.plus b = a_1.plus b_1) = (a = a_1 ∧ b = b_1)
```

That is constructor injectivity, generated automatically, and it is exactly the shape of
claim your encoding work will live on. `Exp.noConfusion` is the disjointness counterpart:
distinct constructors are never equal.

Here is a fold and a proof about it, both compiled:

```lean
def size : Exp → Nat
  | .lit _     => 1
  | .plus a b  => 1 + size a + size b
  | .ite c t e => 1 + size c + size t + size e

theorem size_pos (e : Exp) : 0 < size e := by
  induction e with
  | lit n => simp [size]
  | plus a b iha ihb => simp only [size]; omega
  | ite c t e ihc iht ihe => simp only [size]; omega
```

Three things worth noticing.

- The `def` never says "and if it's some other case, throw". There is no other case. Lean
  refuses the definition if you miss one.
- `induction e with | plus a b iha ihb => ...` names the induction hypotheses `iha` and
  `ihb`. They are the `motive a` and `motive b` arguments from `Exp.rec`, delivered to you.
- `omega` is a decision procedure for linear arithmetic over `Nat` and `Int`. It closes
  `0 < 1 + size a + size b` by treating `size a` and `size b` as opaque non-negative
  quantities. You will lean on `omega` constantly once index arithmetic starts in Chapter 2.

And the two structural facts by hand, to see that they are ordinary proofs:

```lean
theorem lit_ne_plus (n : Nat) (a b : Exp) : Exp.lit n ≠ Exp.plus a b := by
  intro h; cases h

theorem plus_inj {a b a' b' : Exp} (h : Exp.plus a b = Exp.plus a' b') :
    a = a' ∧ b = b' := by
  cases h; exact ⟨rfl, rfl⟩
```

`cases h` on an equation between *different* constructors produces zero goals — the case is
impossible, so the proof is finished. `cases h` on an equation between the *same*
constructor unifies the arguments, after which `rfl` works. This is the mechanism behind
`injEq` and `noConfusion`, and it is free for every inductive type you will ever declare.

## 1.4 Why the spine cares

Your term type is the *carrier* of everything downstream: the thing you encode, the thing you
hash, the thing you store, the thing the surface language elaborates into. Declaring it as an
inductive type means that the moment it exists, you can state and prove properties over **all**
terms — including the ones nobody has written yet. That is what makes the encoding-injectivity
result of Chapter 6 possible at all: `Peelable` in your `Stream.lean` quantifies over every
token, and the proof discharges it by structural case analysis. Seven constructors, seven
cases, done — and *no eighth case can appear later without the proof breaking loudly*. That
loud breakage is the feature.

---

# Chapter 2 — Binding and variables

This is the chapter where language formalism stops being obvious. Budget time for it. Every
practitioner has a scar here.

## 2.1 The idea

Chapter 1's language had no variables, so every expression meant something on its own. The
moment you add `λ` — a binder — a variable's meaning depends on *where it sits*:

```
λx. λy. x y
```

The `x` in the body is not a free-standing name. It is a *reference to the enclosing binder*.
And that immediately gives you a problem that has nothing to do with implementation and
everything to do with what a program **is**:

> `λx. x` and `λy. y` are the same function. Are they the same *program*?

They had better be, or your language distinguishes things nobody can distinguish by running
them. Two syntax trees that differ only in the choice of bound names are called
**alpha-equivalent**, and the traditional formalization says: programs are alpha-equivalence
*classes* of syntax trees.

That sentence is where the pain begins.

**Why alpha-equivalence is THE classic pain.** If terms are equivalence classes, then every
function you write on terms must be proved to respect the equivalence, every induction has
to be redone over classes, and — worst — substitution stops being structurally recursive:

```
(λx. λy. x) y     -- substitute the free `y` for `x` in `λy. x`
```

Naively you get `λy. y`, the identity function. That is *wrong*: the free `y` you passed in
got **captured** by the binder it slid under. The right answer is `λy'. y` for a fresh `y'`.
So substitution needs freshness, freshness needs a supply of names, the supply makes
substitution non-deterministic up to renaming, and now your "obvious" recursive function
needs a well-foundedness argument and a bag of side conditions.

This is not a hypothetical difficulty. The POPLmark Challenge — Aydemir et al., "Mechanized
Metatheory for the Masses: The POPLmark Challenge", TPHOLs 2005, DOI `10.1007/11541868_4` —
was organized around the observation that binding was the main thing making mechanized
language metatheory expensive.

**The three standard answers.**

| Approach | A variable is | Alpha-equivalence is | Cost |
|---|---|---|---|
| **Named** | a string | a relation you define and reason about | capture-avoidance, freshness, non-structural substitution |
| **De Bruijn** (1972) | a number: how many binders out | *definitional equality* — free | index arithmetic: shifting, cutoffs, off-by-ones |
| **Locally nameless** | index if bound, name if free | free (the bound side is indexed) | two operations (`open`/`close`) plus a well-formedness predicate |

**De Bruijn's idea**, in one line: throw the binder's name away and write, at each variable
occurrence, *how many binders you must walk outward to reach the one that binds you*.

```
λx. λy. x y      ⟹      λ. λ. 1 0
```

Reading `λ. λ. 1 0`: at the `x` position, you cross the inner `λ` (that is 1 step) to reach
the binder — so index `1`. At the `y` position, the nearest enclosing binder is the one you
want — index `0`. The names `x` and `y` are gone. And now:

```
λa. λb. a b      ⟹      λ. λ. 1 0        -- the same tree
```

Alpha-equivalence has become **syntactic identity**. Reference: N. G. de Bruijn, "Lambda
calculus notation with nameless dummies, a tool for automatic formula manipulation, with
application to the Church-Rosser theorem", *Indagationes Mathematicae* 34 (5), 1972,
pp. 381–392, DOI `10.1016/1385-7258(72)90034-0`.

**What it costs.** Free variables now have indices that depend on the depth at which you look
at them. In `λ. 0 1`, the `1` points to *something outside this term*. Push that term under
one more binder and the same free variable must be renumbered to `2`. So you need:

- **shift** (also called lift): add `d` to every free index — meaning every index at or above
  a *cutoff* `c` that tracks how many binders you are currently inside;
- **substitution** that shifts its payload every time it descends under a binder.

The bugs move from "did I capture a name?" to "is that cutoff `c` or `c+1`?". They are
easier bugs — arithmetic, not freshness — but they are *silent*, so you want machine-checked
statements about them. That is Chapter 3.

**No TypeScript analogy here.** I want to be explicit about this: there is nothing in your day
job that is like De Bruijn indices, and any analogy I could reach for (stack slots? scope-chain
depth in a closure representation?) would suggest that this is an *implementation technique*.
It is not. It is a change in what a term *is*, chosen so that a mathematical property
(alpha-invariance) becomes true by construction instead of being maintained by discipline.
That move — make the property structural rather than enforced — is the single most
transferable idea in this document, and Chapter 6 is about applying it on purpose.

**Locally nameless**, briefly, because you will meet it in papers: bound variables get De
Bruijn indices, free variables keep names. You get alpha-invariance (the bound side is
nameless) *and* readable free-variable reasoning (no shifting when you push a closed term
under a binder). The cost is that not every raw tree is a real term — an index with no binder
above it is garbage — so you carry a `LocallyClosed` predicate and prove it is preserved
everywhere. See Charguéraud, "The Locally Nameless Representation", *Journal of Automated
Reasoning* 49(3), 2012, DOI `10.1007/s10817-011-9225-2`.

For a spine whose terms are *closed* by construction — a store of complete definitions, each
referring to others by hash rather than by free variable — pure De Bruijn is the simpler
choice, because the free-variable case, which is where De Bruijn hurts, barely arises.

## 2.2 The formal shape

Named syntax:

```
t ::= x | λx. t | t t          x ∈ Var (an infinite set of names)
```

Free variables, by structural recursion:

```
FV(x)      = {x}
FV(λx. t)  = FV(t) \ {x}
FV(t₁ t₂)  = FV(t₁) ∪ FV(t₂)
```

Alpha-equivalence `t ≡α u` is the least congruence containing
`λx. t ≡α λy. t[x := y]` whenever `y ∉ FV(t)`.

De Bruijn syntax:

```
t ::= n | λ. t | t t           n ∈ ℕ
```

Shifting, with cutoff `c` and amount `d`:

```
↑ᵈ_c (n)      = n            if n < c
              = n + d        if n ≥ c
↑ᵈ_c (λ. t)   = λ. ↑ᵈ_{c+1} t
↑ᵈ_c (t₁ t₂)  = (↑ᵈ_c t₁) (↑ᵈ_c t₂)
```

Substitution of `s` for index `j`:

```
[j ↦ s] n        = s              if n = j
                 = n              otherwise
[j ↦ s] (λ. t)   = λ. [j+1 ↦ ↑¹_0 s] t
[j ↦ s] (t₁ t₂)  = ([j ↦ s] t₁) ([j ↦ s] t₂)
```

And the substitution a beta-reduction performs — substitute for index 0, then close up the
gap the consumed binder left behind:

```
t [↦ v]  =  ↑⁻¹_0 ( [0 ↦ ↑¹_0 v] t )
```

The double shift looks like bureaucracy and is not: `↑¹_0 v` protects `v`'s free variables as
it descends, and `↑⁻¹_0` renumbers everything that used to live under the now-vanished binder.
Reference: Pierce, *Types and Programming Languages* (MIT Press, 2002), Chapter 6 "Nameless
Representation of Terms" — the clearest few pages on this in print; its Definitions 6.2.1 and
6.2.4 are exactly the two displays above.

## 2.3 In Lean 4 this is:

Two syntax types — one named, one nameless — and a translation between them.

```lean
namespace Ch2

inductive NTerm where
  | var (x : String)
  | lam (x : String) (body : NTerm)
  | app (f a : NTerm)
  deriving Repr, DecidableEq

inductive Term where
  | var (i : Nat)
  | lam (body : Term)
  | app (f a : Term)
  deriving Repr, DecidableEq
```

Look at `Term.lam`: it takes *only* a body. There is no name to get wrong.

```lean
/-- Position of `x` in the binder list, innermost first. -/
def lookup : List String → String → Option Nat
  | [],      _ => none
  | y :: ys, x => if x = y then some 0 else (lookup ys x).map (· + 1)

def toDeBruijn : List String → NTerm → Option Term
  | ctx, .var x   => (lookup ctx x).map Term.var
  | ctx, .lam x b => (toDeBruijn (x :: ctx) b).map Term.lam
  | ctx, .app f a =>
      match toDeBruijn ctx f, toDeBruijn ctx a with
      | some f', some a' => some (.app f' a')
      | _, _ => none
```

The whole algorithm is in one line: `.lam x b` pushes `x` onto the front of the context and
recurses. The context *is* the stack of enclosing binders; a variable's index is its position
in that stack. `Option` is there because a free variable not in `ctx` has no index.

**The worked conversion.** Here are the two alpha-equivalent named terms from §2.1, and the
proof that they land on the same tree:

```lean
/-- `λx. λy. x y` -/
def ex1 : NTerm := .lam "x" (.lam "y" (.app (.var "x") (.var "y")))
/-- `λa. λb. a b` — the same function, different bound names. -/
def ex2 : NTerm := .lam "a" (.lam "b" (.app (.var "a") (.var "b")))

example : toDeBruijn [] ex1 = some (.lam (.lam (.app (.var 1) (.var 0)))) := rfl

/-- Alpha-equivalence is not a relation you define; it is `=` on the image. -/
example : toDeBruijn [] ex1 = toDeBruijn [] ex2 := rfl
```

Both proofs are `rfl` — *definitional equality*. Lean evaluates both sides and sees the same
tree. There is no alpha-equivalence relation anywhere in this file: no congruence rules, no
freshness conditions, no quotient. That absence is the entire payoff. (Run the `#eval`s
yourself; both print `some (Term.lam (Term.lam (Term.app (Term.var 1) (Term.var 0))))`.)

And the cost, visible immediately — free variables are context-relative:

```lean
def ex3 : NTerm := .lam "x" (.app (.var "x") (.var "z"))
#eval toDeBruijn []    ex3   -- none                       (`z` is unbound)
#eval toDeBruijn ["z"] ex3   -- some (λ. (0 1))            (`z` is index 1 here)
```

The same source text yields a different tree depending on the ambient context. Hold that
thought until you get to hashing.

Now the arithmetic:

```lean
/-- Add `d` to every free variable, i.e. every index `≥ c`. -/
def shift (d : Nat) : Nat → Term → Term
  | c, .var i   => if i < c then .var i else .var (i + d)
  | c, .lam b   => .lam (shift d (c + 1) b)
  | c, .app f a => .app (shift d c f) (shift d c a)

/-- Subtract one from every free variable `≥ c`. -/
def shiftDown : Nat → Term → Term
  | c, .var i   => if i < c then .var i else .var (i - 1)
  | c, .lam b   => .lam (shiftDown (c + 1) b)
  | c, .app f a => .app (shiftDown c f) (shiftDown c a)

/-- Replace index `j` by `s`, keeping `s` well-scoped under binders. -/
def subst (j : Nat) (s : Term) : Term → Term
  | .var i   => if i = j then s else .var i
  | .lam b   => .lam (subst (j + 1) (shift 1 0 s) b)
  | .app f a => .app (subst j s f) (subst j s a)

/-- The substitution a beta step performs. -/
def substTop (v b : Term) : Term := shiftDown 0 (subst 0 (shift 1 0 v) b)
```

Note that `subst` is *structurally recursive* on its last argument, and Lean accepts it with
no termination argument, no fuel, no `partial`. Compare with the named version, which needs a
fresh-name supply and a size-based well-founded recursion. That is the concrete engineering
saving, and it is why nearly every mechanized language development you will read uses De
Bruijn or locally nameless.

**The capture test, mechanized.** `(λx. λy. x) y` — the example that breaks naive
substitution. In De Bruijn, the free `y` is index `0` on the outside, and the body `λy. x` is
`.lam (.var 1)`:

```lean
example : substTop (.var 0) (.lam (.var 1)) = .lam (.var 1) := rfl
example : substTop (.var 0) (.lam (.var 1)) ≠ .lam (.var 0) := by decide
```

Read the answer `.lam (.var 1)` as "a lambda whose body refers to something one level outside
it" — that is the free variable you passed in, still free, *not* captured. The capture-happy
wrong answer would have been `.lam (.var 0)`, and the second `example` proves by decision
procedure that we did not produce it. Naive named substitution produces exactly that wrong
answer.

A larger `#eval` you can step through by hand to build intuition:

```lean
#eval substTop (.var 3) (.lam (.app (.var 1) (.var 0)))
-- Term.lam (Term.app (Term.var 4) (Term.var 0))
```

The free variable that was `3` on the outside is `4` on the inside, because it is now under
one more binder. Every one of those `+1`s came from a `shift`, and getting one of them wrong
is a bug your test suite will probably not find. Hence, statements:

```lean
theorem shift_shift (d d' : Nat) :
    ∀ (c : Nat) (t : Term), shift d' c (shift d c t) = shift (d + d') c t := by
  intro c t
  induction t generalizing c with
  | var i =>
      by_cases h : i < c
      · simp [shift, h]
      · have h2 : ¬ (i + d < c) := by omega
        simp [shift, h, h2]
        omega
  | lam b ih => simp [shift, ih]
  | app f a ihf iha => simp [shift, ihf, iha]

theorem shift_zero : ∀ (c : Nat) (t : Term), shift 0 c t = t := by
  intro c t
  induction t generalizing c with
  | var i => by_cases h : i < c <;> simp [shift, h]
  | lam b ih => simp [shift, ih]
  | app f a ihf iha => simp [shift, ihf, iha]

end Ch2
```

Two details of Lean technique worth stealing right now:

- **`generalizing c`.** The `lam` case recurses with `c + 1`, not `c`. If the induction
  hypothesis were fixed at one particular `c`, it would not apply. `generalizing c` makes the
  hypothesis read "for all `c`", which is what you need. Forgetting `generalizing` is the most
  common reason a De Bruijn induction stalls; the Infoview will show you an `ih` with a
  concrete `c` in it and you will know.
- **`by_cases h : i < c`** splits the `if`. After that, `simp [shift, h]` can reduce the
  conditional. In the `¬ (i < c)` branch you must *also* tell Lean that `¬ (i + d < c)`, which
  `omega` supplies. This is the shape of nearly every De Bruijn variable case you will write.

## 2.4 Why the spine cares

Three consequences, all load-bearing.

1. **Content-addressing demands alpha-invariance.** If `λx. x` and `λy. y` hash differently,
   your store holds two entries for one function, structural sharing collapses, and "same
   content, same address" is false at the very first binder. With De Bruijn terms the property
   is not something the encoder enforces — it is *unavailable to violate*, because the name
   never entered the term.
2. **This is a live gap in the prior art already surveyed in this repository.** Unison's V2
   hashing pipeline and Concrete's Core IR both carry surface binder names in the structures
   they digest, and both know it: Concrete's roadmap commits to a subject digest under which
   capture-avoiding alpha renaming does not move the address, while both digests it actually
   ships embed binder names. Choosing a nameless carrier at the *bottom* of your spine turns
   that commitment from a roadmap item into a theorem — in fact into a non-statement, since
   there is nothing left to prove.
3. **Names still have to live somewhere.** Losing names loses readability, and your surface
   language needs them back. The standard answer is that names are *metadata*: a separate,
   non-hashed side table mapping (address, binder position) to a suggested display name. The
   term is nameless; the pretty-printer is name-aware. Chapter 7 returns to this, because the
   printer's round-trip property is one of the theorems worth stating early.

---

# Chapter 3 — Substitution and its lemmas

## 3.1 The idea

Substitution is the only interesting operation in a language with binding, and it is where
essentially every binding bug lives. Here is why, stated as bluntly as I can:

> Substitution is the *one* function that has to move a term across a binder boundary. Every
> other function either stays put or descends uniformly. Substitution descends *and* carries
> a payload, and the payload's variables mean different things at different depths.

That is the whole story. `shift` fixes up indices; `subst` decides where the payload goes.
Between them, every off-by-one you will ever write is available.

The reason this matters to you specifically — more than it matters to someone writing an
interpreter — is that substitution is the operation your *semantics* is defined by, and
therefore the operation every downstream theorem must reason through. If your beta rule is
subtly wrong, "determinism of evaluation" may still be provable, "preservation" may still be
provable, and your language will still be broken. The lemmas below are the guard rails.

**A TypeScript analogy that actually helps, and then stops.** Think of a template-literal
renderer that splices a fragment into a slot, where the fragment contains `${}` holes
numbered relative to their own nesting. Splicing at the wrong depth silently renumbers
someone else's hole. The analogy is good for the *failure mode* — silent, plausible, wrong.
It stops being useful the moment you want to reason about the result, because there is no
notion of "the meaning is preserved" for template strings. Drop it there.

**The classic bug, in one line.** The naive named substitution
`[x ↦ s](λy. t) = λy. [x ↦ s] t` is wrong whenever `y ∈ FV(s)`, because `s`'s free `y`
becomes bound. Chapter 2 showed the De Bruijn version *cannot* express that bug — the shift
in the `lam` case is not optional, it is the definition. What De Bruijn substitutes is a
different bug class: cutoffs. And cutoff bugs are the kind that pass every hand-written test
and fail on the term with three nested binders that nobody wrote by hand.

## 3.2 The formal shape

Here is the standard lemma zoo. I give each in named form (which is how the textbooks state
them, and how they read most clearly) with the De Bruijn analogue beside it.

| Name | Named form | De Bruijn analogue | What it protects |
|---|---|---|---|
| **Shift composition** | — | `↑ᵈ'_c (↑ᵈ_c t) = ↑^(d+d')_c t` | that shifting is additive; used everywhere |
| **Shift identity** | — | `↑⁰_c t = t` | that a zero shift is a no-op |
| **Vacuous substitution** | `x ∉ FV(t) ⟹ [x ↦ s]t = t` | `[c ↦ s](↑¹_c t) = ↑¹_c t` | that a shift really vacates its cutoff index |
| **Weakening** | `Γ ⊢ t : T ⟹ Γ, x:S ⊢ t : T` (for `x ∉ dom Γ`) | `Γ ⊢ t : T ⟹ S :: Γ ⊢ ↑¹_0 t : T` | that adding unused context is harmless |
| **Substitution preserves typing** | `Γ, x:S ⊢ t : T` and `Γ ⊢ s : S` ⟹ `Γ ⊢ [x ↦ s]t : T` | `S :: Γ ⊢ t : T` and `Γ ⊢ s : S` ⟹ `Γ ⊢ t[↦s] : T` | the beta case of preservation (Chapter 5) |
| **Substitution lemma** (commutation) | `[x ↦ s][y ↦ u]t = [y ↦ [x↦s]u][x ↦ s]t`, when `x ≠ y` and `x ∉ FV(u)` | see §3.3 | confluence, and any proof that reorders substitutions |

Two of them deserve a note.

**Weakening** is the one people expect to be free and is not. It says: a term that typechecks
in a context still typechecks when the context grows. In named form this is nearly trivial.
In De Bruijn it is *not* trivial, because growing the context at the front renumbers every
free variable — so the term has to be shifted, and the statement has a `↑¹_0` in it. That
`↑¹_0` is exactly the price of nameless representation, showing up in the statement rather
than in the code.

**The substitution lemma** is Barendregt's Lemma 2.1.16 (*The Lambda Calculus: Its Syntax and
Semantics*, revised ed., North-Holland, 1984) and TAPL Lemma 6.2.6 / Exercise 6.2.8. It is
the lemma that makes it safe to perform two independent substitutions in either order, which
is what every confluence proof and every "evaluation contexts commute" argument needs. Both
side conditions are load-bearing, and §3.3 shows you how to *see* that mechanically rather
than take my word for it.

Reading, in increasing order of investment: Pierce, *TAPL*, §6.2 and §9.3; Pierce et al.,
*Software Foundations Volume 2: Programming Language Foundations* (electronic textbook,
softwarefoundations.cis.upenn.edu), chapters `Stlc` and `StlcProp`, which walk the entire
zoo with machine-checked proofs; Harper, *PFPL* 2nd ed., Chapter 1.2 for the general
"substitution is a structural operation on abstract binding trees" framing.

## 3.3 In Lean 4 this is:

Continuing in the `Ch2` namespace from the previous chapter.

**Vacuous substitution, proved.** This is the smallest lemma that is genuinely about the
interaction of `shift` and `subst`, and it is a good first one to do yourself:

```lean
/-- Substituting for an index that a shift just vacated does nothing. -/
theorem subst_shift (s : Term) : ∀ (c : Nat) (t : Term),
    subst c s (shift 1 c t) = shift 1 c t := by
  intro c t
  induction t generalizing c s with
  | var i =>
      by_cases h : i < c
      · have hne : i ≠ c := by omega
        simp [shift, subst, h, hne]
      · have hne : i + 1 ≠ c := by omega
        simp [shift, subst, h, hne]
  | lam b ih => simp [shift, subst, ih]
  | app f a ihf iha => simp [shift, subst, ihf, iha]
```

Note `generalizing c s` — **both** change in the `lam` case (`c` becomes `c+1`, `s` becomes
`shift 1 0 s`). If you generalize only `c`, the proof stalls in the `lam` case with an
induction hypothesis about the wrong `s`. That failure is worth inducing once on purpose so
you recognize it later.

**A freshness predicate, as a `Prop`-valued recursive definition:**

```lean
/-- "index `j` does not occur free in this term" -/
def NotFree (j : Nat) : Term → Prop
  | .var i   => i ≠ j
  | .lam b   => NotFree (j + 1) b
  | .app f a => NotFree j f ∧ NotFree j a
```

Two things to notice. First, a function into `Prop` is a perfectly ordinary Lean definition —
it recurses structurally like any other. Second, the `lam` case increments `j`, which is the
same bookkeeping as everywhere else; the predicate and the operations must agree on the
convention or nothing will compose.

**The substitution lemma, stated:**

```lean
/-- The substitution lemma, De Bruijn form. STATED, not proved here. -/
def SubstCommute : Prop :=
  ∀ (i j : Nat) (s u t : Term), i ≠ j → NotFree i u →
    subst j u (subst i s t) = subst i (subst j u s) (subst j u t)
```

This is your `Stream.lean` house style — `def obligation : Prop := ...` names a claim without
discharging it, and it compiles cleanly with no `sorry` and no warning. It is the right way to
write down a design commitment you intend to prove later: the statement is *elaborated and
type-checked* immediately, so a nonsense statement is caught now, and only the proof is
deferred.

### Spot-checking a statement before you invest in proving it

Here is a technique worth adopting as a habit. Index lemmas are easy to *mis-state* — a wrong
`+1`, a missing side condition — and discovering that after two hours of failed tactic work
is demoralizing and uninformative. Since your terms are a finite inductive type with
`DecidableEq`, you can enumerate a small universe and evaluate the claim on all of it:

```lean
def notFreeB (j : Nat) : Term → Bool
  | .var i   => i != j
  | .lam b   => notFreeB (j + 1) b
  | .app f a => notFreeB j f && notFreeB j a

/-- All terms of depth ≤ n over indices 0,1,2. -/
def terms : Nat → List Term
  | 0     => (List.range 3).map Term.var
  | n + 1 =>
      let sub := terms n
      sub ++ sub.map Term.lam ++ (sub.flatMap fun f => sub.map fun a => Term.app f a)

#eval (terms 1).length          -- 15

def substCommuteHolds : Bool :=
  let ts  := terms 1
  let idx := List.range 3
  idx.all fun i => idx.all fun j =>
    if i == j then true else
    ts.all fun s => ts.all fun u =>
      if !(notFreeB i u) then true else
        ts.all fun t =>
          subst j u (subst i s t) == subst i (subst j u s) (subst j u t)

#eval substCommuteHolds         -- true
```

And — this is the part that teaches — delete the side condition and watch it fail:

```lean
/-- A DELIBERATELY WRONG variant: drop the `NotFree i u` side condition. -/
def substCommuteNoSideCondition : Bool :=
  let ts  := terms 1
  let idx := List.range 3
  idx.all fun i => idx.all fun j =>
    if i == j then true else
      ts.all fun s => ts.all fun u => ts.all fun t =>
        subst j u (subst i s t) == subst i (subst j u s) (subst j u t)

#eval substCommuteNoSideCondition   -- false
```

Those three `#eval` outputs — `15`, `true`, `false` — are from the actual compile run. In
under twenty lines you have established that your statement survives 30,000-odd instances and
that its side condition is not decoration. That is *not* a proof and you must never let it be
mistaken for one. It is exactly what a fast test suite is for: cheap refutation. When it says
`false`, you have saved yourself the proof attempt. When it says `true`, you have earned the
right to spend the afternoon on the induction.

The same discipline is visible in `formal/fips202`: NIST test vectors are enforced as
build-time `#guard`s *alongside* the refinement theorem, and the artifact's own README says
plainly that the sampled vectors "are evidence, never proof". Keep the two categories
separate in your head and in your prose, always.

**Weakening and typing-substitution** are stated in Chapter 5, once there is a typing
judgment to state them about. They are the two lemmas that actually get used, and everything
in this chapter exists to make them provable.

## 3.4 Why the spine cares

If your spine only ever *stores and addresses* terms, and never reduces them, you can get
away with much less of this chapter — you need `shift`/`subst` to be well-defined, not
well-behaved. But the moment the spine evaluates anything, or the moment you want to say
"these two addresses denote the same function", substitution's lemmas become the load-bearing
layer beneath that claim.

More immediately useful: the *habit* in §3.3 transfers directly to encoding work. Before you
attempt to prove `Peelable` for a candidate byte encoding, enumerate a few hundred small
terms and check that `decode (encode t ++ r) = some (t, r)` on all of them. Five minutes, and
it finds the framing bug that would otherwise eat a day of tactic wrangling.

---

# Chapter 4 — Operational semantics

## 4.1 The idea

You have a set of programs (Chapter 1) with binding (Chapter 2) and a substitution operation
(Chapter 3). Nothing so far says what a program *does*. Operational semantics says it, and it
says it in a specific style: **by describing single computation steps as a relation between
terms.**

```
(λx. x) (λy. y)   ↦   λy. y
```

One step. The left term *reduces to* the right term. Iterate until you reach something that
does not step; if that thing is a value, the program terminated normally; if it is not a
value, the program is **stuck**, which is the formal word for "crashed".

The key design choice, and the one that surprises people from an engineering background:

> The semantics is a **relation**, not a function.

Your instinct is to write `eval : Term -> Term`. Resist it, at least at first, for three
reasons:

1. **A relation can be partial without lying.** `Step` simply does not relate `x y` to
   anything. A function must return *something* — `Option`, an exception, a `never` — and now
   your semantics has an extra concept in it that the language does not have.
2. **A relation can be non-deterministic on purpose.** If you later add concurrency, or want
   to leave evaluation order unspecified so implementations can choose, a relation says that
   directly. A function cannot; it would have to pick.
3. **A relation is an inductive type, so you get induction over *derivations*.** This is the
   crucial one. Almost every metatheorem in Chapter 5 is proved by induction on the
   derivation of a step or a typing judgment, not on the structure of the term. That proof
   principle only exists if the judgment is inductively defined.

Then, *separately*, you may write the function — and prove it agrees with the relation. That
pairing (a readable specification relation + an executable function + a theorem connecting
them) is exactly the shape of `formal/fips202`: `Sha3.Spec` is written to be read against the
standard, `Sha3.Impl` is written to run, and `sha3_512_bridge` says they agree on every input.
Same architecture, different subject matter. It is the single most reusable pattern in this
document.

**Small-step versus big-step.** Small-step (also called *structural operational semantics*,
after Plotkin) relates a term to its immediate successor: `t ↦ t'`. Big-step (*natural
semantics*, after Kahn) relates a term directly to its final value: `t ⇓ v`. Small-step is
what you want when you care about stuck terms, non-termination, or interleaving, because it
lets you talk about the intermediate states. Big-step is often shorter to write for a
language that always terminates. Reference: Plotkin, "A Structural Approach to Operational
Semantics", *Journal of Logic and Algebraic Programming* 60–61 (2004), pp. 17–139, DOI
`10.1016/j.jlap.2004.05.001` — the 1981 Aarhus report, finally published.

**Evaluation strategy is a choice you make here.** Call-by-value evaluates arguments before
substituting; call-by-name substitutes unevaluated arguments. The difference is entirely in
which `Step` rules you write down. Whatever you pick becomes part of what your language *is*.

## 4.2 The formal shape

Values, for the pure lambda fragment:

```
v ::= λ. t
```

The single-step relation, call-by-value, left-to-right:

```
                                            t₁ ↦ t₁'
  ─────────────────────────  (E-AppAbs)   ───────────────────  (E-App1)
   (λ. t) v  ↦  t[↦v]                      t₁ t₂ ↦ t₁' t₂


            t₂ ↦ t₂'
  ────────────────────────────  (E-App2)
   v t₂  ↦  v t₂'
```

Read each rule as: *given everything above the line, conclude the thing below the line.* The
rules with nothing above the line (E-AppAbs) are the ones that do real work; the others are
*congruence* rules that say where in a term the work is allowed to happen. The `v` in E-App2
is what makes this call-by-value and left-to-right: you may not reduce the argument until the
function part is already a value.

Multi-step `↦*` is the reflexive-transitive closure. A term is in **normal form** if nothing
relates to it on the left. It is **stuck** if it is in normal form and is not a value.

Two properties you state about the relation itself:

- **Determinism**: `t ↦ t₁` and `t ↦ t₂` imply `t₁ = t₂`.
- **Values do not step**: if `v` is a value then `v` is in normal form.

Reference: Pierce, *TAPL*, Chapter 3 (the general framework) and Chapter 5 §5.3 (the untyped
lambda calculus rules above, Figure 5-3); Harper, *PFPL* 2nd ed., Chapters 5 and 7.

## 4.3 In Lean 4 this is:

An **inductive family of `Prop`s**. This is the construct that made Chapter 1's
`inductive Exp` look like a mere data declaration: the same keyword also defines *judgments*.

```lean
inductive Value : Term → Prop where
  | lam (b : Term) : Value (.lam b)

inductive Step : Term → Term → Prop where
  | appAbs {b v : Term} : Value v → Step (.app (.lam b) v) (substTop v b)
  | app1  {f f' a : Term} : Step f f' → Step (.app f a) (.app f' a)
  | app2  {v a a' : Term} : Value v → Step a a' → Step (.app v a) (.app v a')
```

Compare this to the inference rules above, line by line. `appAbs` has one hypothesis
(`Value v`, the side condition) and its conclusion is the indexed type
`Step (.app (.lam b) v) (substTop v b)`. `app1` takes a derivation of `Step f f'` and returns
a derivation of `Step (.app f a) (.app f' a)`. **The constructors are the inference rules and
the terms of the type are the derivation trees.** That is not an analogy; it is literally what
this declaration means, and it is Chapter 8's punchline arriving early.

Note there is no `var` rule and no `lam` rule. `Step (.var 3) t` is *uninhabited* — there is
no way to build one. Being stuck is expressed by absence, which costs nothing to write and
nothing to maintain.

Multi-step and normal form:

```lean
inductive Steps : Term → Term → Prop where
  | refl  (t : Term) : Steps t t
  | trans {t u v : Term} : Step t u → Steps u v → Steps t v

def NormalForm (t : Term) : Prop := ¬ ∃ t', Step t t'

def Deterministic : Prop := ∀ t t₁ t₂ : Term, Step t t₁ → Step t t₂ → t₁ = t₂
```

**Values are normal forms**, in two lines:

```lean
theorem value_not_step {v t : Term} (hv : Value v) (h : Step v t) : False := by
  cases hv; cases h

theorem value_normal {v : Term} (hv : Value v) : NormalForm v := by
  rintro ⟨t, h⟩; exact value_not_step hv h
```

`cases hv` replaces `v` with `.lam b`. Then `h : Step (.lam b) t`, and `cases h` asks Lean to
try each `Step` constructor: `appAbs` needs the source to be `.app _ _`, so does `app1`, so
does `app2`. None unify with `.lam b`. Zero goals remain and the proof is complete. **You
proved a negative by exhaustion over the rules**, and Lean did the exhaustion.

**Determinism, proved in full:**

```lean
theorem step_det {t t₁ t₂ : Term} (h1 : Step t t₁) (h2 : Step t t₂) : t₁ = t₂ := by
  induction h1 generalizing t₂ with
  | appAbs hv =>
      cases h2 with
      | appAbs      => rfl
      | app1 hf     => cases hf
      | app2 _ ha   => exact (value_not_step hv ha).elim
  | app1 hf ih =>
      cases h2 with
      | appAbs      => cases hf
      | app1 hf2    => rw [ih hf2]
      | app2 hv2 _  => exact (value_not_step hv2 hf).elim
  | app2 hv ha ih =>
      cases h2 with
      | appAbs hv2  => exact (value_not_step hv2 ha).elim
      | app1 hf2    => exact (value_not_step hv hf2).elim
      | app2 _ ha2  => rw [ih ha2]

theorem determinism : Deterministic := fun _ _ _ h1 h2 => step_det h1 h2
```

This is worth studying because it is the archetype of every metatheory proof you will write.

- `induction h1` — **induction on the derivation**, not on the term. You get one case per
  rule that could have produced `h1`, with an induction hypothesis for each recursive
  premise (`ih` in the `app1` and `app2` cases).
- `generalizing t₂` — the same reflex as Chapter 2, for the same reason: the hypothesis must
  hold for whatever second target the sub-derivation has.
- Inside each case, `cases h2` enumerates the rules that could have produced the *other*
  derivation, giving a 3×3 grid. Three cells are the "same rule twice" diagonal (`rfl` or
  the induction hypothesis). Six cells are impossible, and each dies for a stated reason: a
  lambda cannot step (`cases hf`), or a value cannot step (`value_not_step`).
- Adding a fourth rule to `Step` later will break this proof in exactly the cells that need
  human attention. That is the whole value proposition.

**Now the function**, defined separately:

```lean
def isValue : Term → Bool
  | .lam _ => true
  | _      => false

def step? : Term → Option Term
  | .var _   => none
  | .lam _   => none
  | .app f a =>
      match step? f with
      | some f' => some (.app f' a)
      | none    =>
          if isValue f then
            match step? a with
            | some a' => some (.app f a')
            | none    =>
                match f with
                | .lam b => if isValue a then some (substTop a b) else none
                | _      => none
          else none

/-- Statement: the function and the relation agree. -/
def StepAdequate : Prop := ∀ t u : Term, step? t = some u ↔ Step t u
```

`step?` is structurally recursive, so it is total and Lean accepts it with no fuel and no
`partial`. `none` means "does not step" — which covers both values and stuck terms, so the
function has *conflated* two situations that the relation kept apart. `StepAdequate` is the
bridge, and proving it is the exercise that will teach you whether your rules and your
implementation really say the same thing. (Two things it will catch, in my experience: an
evaluation-order mismatch between the `match` cascade and the `app2` side condition, and a
missing `isValue` guard.)

And the sanity checks:

```lean
def selfApp : Term := .app (.lam (.var 0)) (.lam (.var 0))
#eval step? selfApp    -- some (Term.lam (Term.var 0))
example : step? selfApp = some (.lam (.var 0)) := rfl
example : Step selfApp (.lam (.var 0)) := Step.appAbs (Value.lam _)

-- A stuck term: a free variable applied to a value.
#eval step? (.app (.var 0) (.lam (.var 0)))   -- none
```

Look at the third line. `Step.appAbs (Value.lam _)` is a *proof term*: a derivation tree
written as a constructor application, with no tactics at all. The rule takes one premise
(`Value v`) and you supplied it. If you are ever unsure what a tactic proof produced, the
tactic block is just building one of these; `#print` will show you.

## 4.4 Why the spine cares

Three points, in increasing order of importance to you.

1. **Determinism is a design property you can pin before writing an interpreter.** If your
   spine is going to cache results by content address — "I already evaluated this term, here
   is the answer" — the cache is only sound if evaluation is deterministic. State
   `Deterministic` early. If a feature you want to add makes it false, you will find out at
   design time, from the proof breaking, rather than from a cache returning yesterday's
   answer.
2. **The Spec/Impl/bridge triple is the shape to reuse.** You already own one instance of it
   in `formal/fips202`. `Step` / `step?` / `StepAdequate` is the same triple at the semantics
   layer, and `encode`/`decode`/round-trip (Chapter 6) is the same triple at the encoding
   layer. Three layers of the spine, one architectural move.
3. **"Stuck" is the thing types will eliminate.** Everything in Chapter 5 exists to prove that
   well-typed terms never reach a normal form that is not a value. You cannot state that
   theorem until "stuck" is a precise notion, and "stuck" is precise only because `Step` is a
   relation that can decline to relate.

---

# Chapter 5 — Type systems

## 5.1 The idea

A type system is a **decidable, syntactic over-approximation of runtime behaviour**, and its
value is measured by exactly one thing: the theorem you can prove about it.

That framing is worth dwelling on, because it is the opposite of how TypeScript trains you to
think. TypeScript's type system is a *description* language: it exists to document and to
catch mistakes, it is deliberately unsound in several places (`any`, covariant arrays,
unchecked casts, `as`), and no theorem connects "this program typechecks" to "this program
does not crash". That is a legitimate engineering trade — TS was retrofitted onto a language
it did not design — but it means your calibration for what a type system *is for* is off by
one crucial notch.

Here, a type system is a **judgment** — an inductively defined relation `Γ ⊢ t : T` — plus two
theorems that together say: **well-typed programs do not get stuck.**

- **Progress**: a well-typed closed term is either a value or it can step. (It is not stuck
  *now*.)
- **Preservation** (a.k.a. subject reduction): if a well-typed term steps, the result is
  well-typed at the same type. (It will not *become* stuck.)

Chain them and you get: a well-typed term never reaches a stuck state, no matter how long it
runs. That slogan — **"safety = progress + preservation"** — is due to Wright and Felleisen,
"A Syntactic Approach to Type Soundness", *Information and Computation* 115(1), 1994,
pp. 38–94, DOI `10.1006/inco.1994.1093`, and it is the single most reused proof architecture
in the field.

**What it buys you.** A *closed*, checkable guarantee about infinitely many program runs,
obtained by a finite argument over the typing rules. No test suite gives you that shape of
statement.

**What it does not buy you — and please internalize this list.**

- It does **not** say your program terminates. A well-typed term can loop forever; looping is
  not stuck.
- It does **not** say your program is correct. `fun (x : Nat) => 0` is impeccably typed and
  probably wrong.
- It does **not** say your program is efficient, memory-safe against a hostile runtime, or
  free of the errors your *type system chose not to model*. Division by zero is a stuck state
  only if you made it one.
- It says nothing about anything outside the modelled language — foreign functions, I/O
  effects you did not encode, the compiler that implements the semantics.

The precision of "safety" is entirely determined by how much of reality you dragged into the
`Step` relation. A type system for a language whose semantics ignores arithmetic overflow
proves nothing about overflow. This is the most common overclaim in the entire subject, and
you are already trained against it by the `formal/fips202` trust statement, which lists
exactly what is *not* claimed. Same discipline, applied here.

## 5.2 The formal shape

Types, for the simply typed lambda calculus:

```
T ::= B | T → T
```

Contexts `Γ` are lists of types (in the De Bruijn setting; in a named setting, finite maps
from names to types). Index `i` in the term looks up position `i` in `Γ`.

The judgment:

```
    Γ(i) = T                 A :: Γ ⊢ t : B
  ─────────────  (T-Var)   ────────────────────  (T-Abs)
   Γ ⊢ i : T                Γ ⊢ λ. t : A → B


   Γ ⊢ t₁ : A → B      Γ ⊢ t₂ : A
  ─────────────────────────────────  (T-App)
           Γ ⊢ t₁ t₂ : B
```

The two theorems, stated exactly:

```
Progress:      ∅ ⊢ t : T                  ⟹  Value t  ∨  ∃ t'. t ↦ t'
Preservation:  Γ ⊢ t : T   and   t ↦ t'   ⟹  Γ ⊢ t' : T
Safety:        ∅ ⊢ t : T   and   t ↦* t'  ⟹  ¬ Stuck t'
```

Two supporting lemmas do all the actual work:

```
Canonical forms:  ∅ ⊢ v : A → B  and  Value v   ⟹  ∃ t. v = λ. t
Substitution:     A :: Γ ⊢ t : B  and  Γ ⊢ s : A ⟹  Γ ⊢ t[↦s] : B
```

Canonical forms is what progress needs at the application case: you know the function part is
a value of arrow type, so it must be a lambda, so E-AppAbs applies. The substitution lemma is
what preservation needs at the E-AppAbs case, and *it* needs weakening (Chapter 3). That is
the whole dependency graph, and it explains why Chapter 3 exists.

Reference: Pierce, *TAPL*, Chapter 9 (the calculus and both theorems, Lemmas 9.3.4–9.3.9);
Pierce et al., *Software Foundations Vol. 2*, chapters `Stlc` and `StlcProp` — this is the
best possible companion, because it is these exact theorems fully mechanized, with exercises;
Harper, *PFPL* 2nd ed., Chapter 6 ("Type Safety"), which states the pair in its most general
form.

## 5.3 In Lean 4 this is:

```lean
inductive Ty where
  | base
  | arrow (a b : Ty)
  deriving Repr, DecidableEq

/-- `HasType Γ t T` is the judgment `Γ ⊢ t : T`. -/
inductive HasType : List Ty → Term → Ty → Prop where
  | var {Γ i T}     : Γ[i]? = some T → HasType Γ (.var i) T
  | lam {Γ b A B}   : HasType (A :: Γ) b B → HasType Γ (.lam b) (.arrow A B)
  | app {Γ f a A B} : HasType Γ f (.arrow A B) → HasType Γ a A → HasType Γ (.app f a) B
```

Three constructors, three inference rules; the transcription is mechanical, which is the
point. `Γ[i]?` is core Lean's optional list indexing, returning `Option Ty`, so T-Var's
premise is literally "position `i` of `Γ` is `some T`". Note the `lam` rule: the binder pushes
`A` onto the *front* of the context, mirroring exactly what `toDeBruijn` did in Chapter 2.
The context and the indices must agree on which end is "innermost" or nothing works; here
both say "front".

A derivation, written as a proof term:

```lean
example : HasType [] (.lam (.var 0)) (.arrow .base .base) :=
  HasType.lam (HasType.var rfl)
```

Read it as a tree: `lam` applied to a derivation of `[Ty.base] ⊢ 0 : base`, which is `var`
applied to a proof that `[Ty.base][0]? = some Ty.base` — and that proof is `rfl`, because both
sides compute to the same thing. Compare with the E-AppAbs proof term at the end of Chapter 4;
same idea, different judgment.

**Inversion**, which is the tactic move you will use constantly:

```lean
/-- A free variable has no type in the empty context. -/
theorem var_untypable {i : Nat} {T : Ty} (h : HasType [] (.var i) T) : False := by
  cases h with
  | var hi => simp at hi
```

`cases h` asks which rule could have concluded `HasType [] (.var i) T`. Only `var` matches the
shape (`lam` concludes about `.lam`, `app` about `.app`), so Lean hands you exactly one case,
carrying the premise `hi : ([] : List Ty)[i]? = some T`. Since indexing the empty list is
`none`, `simp` finishes. That pattern — *cases on a judgment to recover its premises* — is
what "inversion" means, and inductive `Prop`s give it to you for free.

**Canonical forms**, honestly labelled:

```lean
/-- Canonical forms: a value of arrow type is a lambda. -/
theorem canonical_arrow {t : Term} {A B : Ty}
    (_ : HasType [] t (.arrow A B)) (hv : Value t) : ∃ b, t = .lam b := by
  cases hv with
  | lam b => exact ⟨b, rfl⟩
```

In *this* calculus the lemma is trivial, because `Value` has only one constructor — the typing
hypothesis is not even used, which is why it is bound to `_`. Add booleans or numbers to the
language and it stops being trivial immediately: you would then need the typing derivation to
rule out `Value.true` at arrow type. I am leaving the trivial version in because it shows you
the *shape* the lemma has, and because watching that `_` turn into a used hypothesis when you
extend the language is instructive.

**The statements:**

```lean
def Progress : Prop :=
  ∀ (t : Term) (T : Ty), HasType [] t T → Value t ∨ ∃ t', Step t t'

def Preservation : Prop :=
  ∀ (Γ : List Ty) (t t' : Term) (T : Ty), HasType Γ t T → Step t t' → HasType Γ t' T

def Stuck (t : Term) : Prop := NormalForm t ∧ ¬ Value t

def TypeSafety : Prop :=
  ∀ (t t' : Term) (T : Ty), HasType [] t T → Steps t t' → ¬ Stuck t'

def Weakening : Prop :=
  ∀ (Γ : List Ty) (S T : Ty) (t : Term),
    HasType Γ t T → HasType (S :: Γ) (shift 1 0 t) T

def SubstPreservesTyping : Prop :=
  ∀ (Γ : List Ty) (S T : Ty) (t s : Term),
    HasType (S :: Γ) t T → HasType Γ s S → HasType Γ (substTop s t) T
```

Look at `Progress`: the empty context `[]` is not decoration. Progress is **false** for open
terms — `.var 0` in a non-empty context is well-typed, is not a value, and does not step. The
theorem's precondition is where the honesty lives, and reading these statements carefully is
90% of understanding a type-safety claim someone hands you.

Look at `Weakening`: the `shift 1 0 t`. In a named presentation, weakening reads "the same
term still typechecks". In De Bruijn it cannot, because prepending to `Γ` renumbers every free
index. The shift in the *statement* is the nameless representation charging you its fee, and
this is a good concrete instance of a general truth: **a representation choice shows up in
your theorem statements, not only in your code.**

**And the composition, proved:**

```lean
/-- Safety is exactly progress plus preservation — proved, given the two. -/
theorem safety_of (hp : Progress) (hpres : Preservation) : TypeSafety := by
  intro t t' T ht hsteps
  revert ht
  induction hsteps with
  | refl u =>
      intro ht
      rintro ⟨hnf, hnv⟩
      rcases hp u T ht with hv | ⟨u', hu⟩
      · exact hnv hv
      · exact hnf ⟨u', hu⟩
  | trans hstep _ ih =>
      intro ht
      exact ih (hpres _ _ _ _ ht hstep)
```

This one is worth reading closely, because it makes the slogan literal. Induction is on the
*multi-step* derivation:

- `refl` — we have not moved. Progress says `u` is a value or can step; `Stuck u` says
  neither. Contradiction, both ways.
- `trans` — one step, then the rest. Preservation re-establishes the typing hypothesis at the
  new term, and the induction hypothesis handles the remaining steps.

`revert ht` before `induction` is the necessary move: `ht` mentions `t`, which is an index of
`hsteps`, so it must travel into the motive. If you forget, Lean will complain about a
motive that is not type-correct — a message that is opaque the first time and obvious the
second.

Notice what `safety_of` establishes: it is a *proved theorem* that takes two *unproved
hypotheses*. The architecture of the safety argument is settled and machine-checked even
though neither `Progress` nor `Preservation` has been discharged for this calculus. That is
not a stunt. It is precisely the working style Chapter 6 is about.

## 5.4 Why the spine cares

Whether your spine needs a type system at all is a design question I am not answering for
you — a content-addressed store of untyped terms is a coherent thing to build. But three
observations bear on the decision.

1. **Types are part of the content.** If terms carry types, the type is part of what gets
   encoded and hashed, and then "same address" means "same term *and* same type". If types are
   inferred rather than carried, the address depends on your inference algorithm, and any
   change to inference silently rewrites every address in the store. That is a serious
   coupling to decide about deliberately rather than discover.
2. **Judgments are inductive, so they are addressable too.** A typing derivation is a tree
   made of constructors — exactly like a term. Everything Chapters 1, 6, and 7 say about
   encoding terms applies verbatim to encoding derivations, if you ever want to store
   certificates alongside definitions.
3. **The statement-before-proof habit generalizes.** `safety_of` is the model: write down what
   you want (`TypeSafety`), write down the pieces you believe imply it (`Progress`,
   `Preservation`), and prove the *implication* first. If the implication does not go
   through, your decomposition was wrong and you learned it in an hour instead of a month.

---

# Chapter 6 — Metatheory as a design tool

> "Prove stuff about what our language is going to be without having created it yet."

That is your sentence, and it is the correct instinct. This chapter is about making it
operational.

## 6.1 The idea

Here is the asymmetry the whole method rests on:

> **Stating a theorem is cheap. Proving it is expensive. And the *statement* is where almost
> all of the design information is.**

When you write

```lean
def EncodeInjective : Prop := ∀ t u : Term, encode t = encode u → t = u
```

you have not proved anything. But look at what you were forced to decide in order to type
those thirty characters:

- **What is a term?** You needed a `Term`. Not a sketch — a specific inductive type with a
  specific constructor list. Writing the statement forced the carrier to exist.
- **What is the encoding's target?** `List UInt8`, not "bytes, roughly". Not `String`. Not a
  stream. A concrete type, with a concrete equality.
- **Equality of what, exactly?** `t = u` is equality of `Term`s. If `Term` carried source
  spans, this statement would be *false* — and you would learn that at statement time, not
  after building a store full of provenance-poisoned addresses.
- **Is it total?** `encode : Term → List UInt8` has no `Option`. You just committed to every
  term having an encoding.

Four design decisions, extracted by the act of writing a sentence you have not yet proved. And
if a statement will not typecheck, or typechecks but is obviously vacuous, or typechecks but
you cannot say in English what it rules out — **the design is not ready**, and you found out
in an afternoon.

Lean makes this practical in a way that prose does not, because Lean *elaborates the
statement*. A statement in a design doc can be ambiguous forever. A `def X : Prop := ...` that
compiles is unambiguous by construction: every quantifier has a domain, every function has a
type, every equality is at a specific type. This is why the house idiom in your
`Stream.lean` — `def obligation_F1 : Prop := Peelable toBSF` — is exactly right and should be
your default mode for months.

**Three ways to write down an unproved claim in Lean, and when to use which.**

| Form | Compiles? | Use it when |
|---|---|---|
| `def Claim : Prop := ...` | yes, cleanly | The claim is a design commitment. Nothing depends on it yet. |
| `theorem foo : ... := by sorry` | yes, with a warning, and `#print axioms` shows `sorryAx` | You want downstream code to typecheck *against* the claim while you work on it. Dangerous: it is a lie until discharged. Track every one. |
| `theorem composition (h1 : A) (h2 : B) : C` | yes, fully proved | The best of the three. Prove the *implication* now, discharge `A` and `B` later. |

The third row is the one people underuse, and it is the most valuable. `safety_of` in
Chapter 5 is an instance: safety is *proved* from progress and preservation, though neither
has been established. You have machine-checked the architecture of your argument before
building any of its parts. If the decomposition is wrong, you find out immediately.

## 6.2 The formal shape — five theorem classes, and the design bugs each catches

This is the working taxonomy. For each class: what it says, and the specific category of
design bug that stating it flushes out.

### Class 1 — Injectivity / round-trip (encodings, addresses, serializers)

```
Injective:  enc t = enc u  ⟹  t = u
RoundTrip:  dec (enc t ++ r) = some (t, r)          -- stronger; gives injectivity
Peelable:   enc t ++ r₁ = enc u ++ r₂  ⟹  t = u ∧ r₁ = r₂
```

**Catches:** missing constructor discriminators; unframed variable-length payloads; *arity*
ambiguity, where a term with more children encodes identically to one with fewer; provenance
leakage (spans, file paths, timestamps) that makes injectivity true but the address wrong;
and non-canonical fields (float formatting, map ordering) that make it *false*.

Your `Stream.lean` already contains the model instance of this, pinned as a theorem rather
than a complaint: `v2_stream_not_injective` exhibits `Int 5` and `Nat 5` as byte-identical,
and the eight-naked-tags-versus-one-integer example is precisely the arity-collision species.
That file did the right thing by proving the *negative* about the existing design before
proposing a replacement.

### Class 2 — Determinism / confluence (semantics)

```
Deterministic:  t ↦ t₁  and  t ↦ t₂  ⟹  t₁ = t₂
Confluent:      t ↦* u  and  t ↦* v  ⟹  ∃ w. u ↦* w  and  v ↦* w
```

**Catches:** two reduction rules whose left-hand sides overlap (the classic: a congruence rule
with no value side condition, so both the function and the argument may step); an evaluation
order left implicit and then assumed by a later optimization; and — directly relevant to you —
any feature that would make result-caching-by-address unsound.

### Class 3 — Round-trip of the surface (printer / parser)

```
PrinterRoundTrip:   parse (pp t) = some t
ParserDeterministic: parse s = some t  and  parse s = some u  ⟹  t = u
```

**Catches:** ambiguous grammars; precedence and associativity mistakes; a pretty-printer that
drops parentheses it needed; and the specific hazard for a *nameless* core — a printer that
invents binder names non-deterministically, so printing and re-parsing yields a term that is
equal but whose display metadata is not.

Note the asymmetry: `parse (pp t) = some t` is the direction you want. The other direction,
`pp <$> parse s = some s`, is *false* for any language with insignificant whitespace, and
should not be stated. Knowing which direction to state is itself design information.

### Class 4 — Invariance (what the design promises *not* to see)

```
AlphaInvariant:    t ≡α u  ⟹  address t = address u
SpanIndependent:   stripSpans t = stripSpans u  ⟹  address t = address u
```

**Catches:** exactly the defect class your prior-art survey documented — a digest that moves
when a user renames a local variable, or when a file moves on disk. Chapter 2's punchline is
that the *right* fix is not to prove `AlphaInvariant`; it is to choose a carrier in which the
statement is unstatable because alpha-equivalence is equality. When you cannot make it
unstatable, state it, and let the proof force the encoder to exclude the offending field.

### Class 5 — Refinement (spec versus implementation)

```
Refines:  impl x = spec x        -- for all x
```

**Catches:** every divergence between "what the document says" and "what the code computes",
which is the only bug class that a test suite genuinely cannot bound.

You own a landed instance of this: `formal/fips202` proves
`Sha3.Impl.sha3_512 msg = Sha3.Spec.sha3_512_bytes msg` for **every** `msg`, where `Spec` is a
transcription of the FIPS 202 prose written to be read against the standard and `Impl` is
25 lanes of `BitVec 64` written to run. The artifact's structure is the lesson: a readable
specification, a fast implementation, and one theorem joining them, with an explicit trust
statement naming the two things you must still believe (that the transcription says what the
prose says, and the Lean kernel). Every layer of the spine can be built in that shape.

## 6.3 In Lean 4 this is:

Take the encoding layer end to end, in the order you would actually work.

**Step 1 — write the operation and its inverse.**

```lean
def encode : Term → List UInt8
  | .var i   => 0x00 :: [i.toUInt8]
  | .lam b   => 0x01 :: encode b
  | .app f a => 0x02 :: (encode f ++ encode a)

#eval encode (.lam (.app (.var 0) (.var 1)))   -- [1, 2, 0, 0, 0, 1]
```

(A real spine would length-frame a varint index rather than a single byte; `i.toUInt8`
silently truncates above 255. That is a genuine defect in this teaching encoding, and I am
leaving it visible because it is exactly the kind of thing the injectivity proof will refuse
to go through on — try it and watch.)

The decoder needs a termination argument, since it recurses on a list it did not
structurally destructure. The cheap, proof-friendly answer is a fuel parameter:

```lean
def decode : Nat → List UInt8 → Option (Term × List UInt8)
  | 0,     _       => none
  | _ + 1, []      => none
  | n + 1, b :: bs =>
      if b = 0x00 then
        match bs with
        | i :: rest => some (.var i.toNat, rest)
        | []        => none
      else if b = 0x01 then
        match decode n bs with
        | some (t, rest) => some (.lam t, rest)
        | none           => none
      else if b = 0x02 then
        match decode n bs with
        | some (f, rest) =>
            match decode n rest with
            | some (a, rest') => some (.app f a, rest')
            | none            => none
        | none => none
      else none
```

Fuel keeps the definition structurally recursive, so Lean accepts it with no well-foundedness
obligation, and it shows up honestly in the statement as an `∃ n`.

**Step 2 — state the obligations, before proving anything.**

```lean
def EncodeInjective : Prop := ∀ t u : Term, encode t = encode u → t = u

def DecodeRoundTrip : Prop :=
  ∀ (t : Term) (r : List UInt8), ∃ n, decode n (encode t ++ r) = some (t, r)

def Peelable : Prop :=
  ∀ (t u : Term) (r₁ r₂ : List UInt8),
    encode t ++ r₁ = encode u ++ r₂ → t = u ∧ r₁ = r₂
```

The `++ r` in the last two is not an accident, and this is the single most useful technical
point in the chapter. Injectivity on *whole* encodings is weaker than what you need, because
the `app` case concatenates two encodings and then has to split them apart again. `Peelable`
is the strengthening that makes the induction go through — you recognized this already and
wrote it down in `Stream.lean`. Same lemma, same reason. **Finding the right induction
hypothesis is a design activity, and it happens at statement time.**

**Step 3 — spot-check before investing.**

```lean
def roundTripHolds : Bool :=
  (terms 2).all fun t => decode 100 (encode t) == some (t, [])

#eval (terms 2).length     -- 255
#eval roundTripHolds       -- true
```

255 terms, checked exhaustively, in milliseconds. Again: evidence, not proof.

**Step 4 — pin the negatives.** Here is the design bug, made concrete. Suppose you had
decided that application needs no tag, since the shape is recoverable from context:

```lean
/-- Same as `encode` but the application node carries no tag. -/
def encodeBad : Term → List UInt8
  | .var i   => 0x00 :: [i.toUInt8]
  | .lam b   => 0x01 :: encodeBad b
  | .app f a => encodeBad f ++ encodeBad a

def left  : Term := .app (.app (.var 0) (.var 0)) (.var 0)
def right : Term := .app (.var 0) (.app (.var 0) (.var 0))

example : left ≠ right := by decide
example : encodeBad left = encodeBad right := by decide

theorem encodeBad_not_injective :
    ∃ t u : Term, t ≠ u ∧ encodeBad t = encodeBad u :=
  ⟨left, right, by decide, by decide⟩
```

`(x x) x` and `x (x x)` are different functions with different behaviour, and this encoding
gives them the same bytes — hence the same address, hence one entry in your store where two
belong. Both `by decide` calls are the kernel doing the arithmetic; you do not have to be
believed. This is the same species as the collision your `Stream.lean` pinned, reproduced in
miniature so you can see the mechanism: **an untagged node lets the parse tree re-associate.**

Notice what stating injectivity did. It did not merely *fail to prove*; the failed proof
attempt hands you the exact overlapping cases, from which the counterexample falls out. A
test suite would have needed someone to think of `(x x) x` in advance.

**Step 5 — compose the theorem with the assumptions it needs.**

```lean
def addressBy (h : List UInt8 → List UInt8) (t : Term) : List UInt8 := h (encode t)

def AddressSeparates (h : List UInt8 → List UInt8) : Prop :=
  ∀ t u : Term, addressBy h t = addressBy h u → t = u

theorem address_separates_of (h : List UInt8 → List UInt8)
    (hinj : ∀ x y, h x = h y → x = y) (henc : EncodeInjective) :
    AddressSeparates h := by
  intro t u he
  exact henc t u (hinj _ _ he)
```

Four lines, and they encode the entire honest story of content-addressing:

- `henc` is a **theorem you can prove**. Encoding injectivity is finite combinatorics over
  your constructor list.
- `hinj` is **not a theorem and never will be**. Any function from arbitrary-length byte
  lists to 64-byte digests is non-injective by counting, and `formal/fips202` says so
  explicitly in its README: injectivity of the hash is "false by counting", and no security
  property is claimed. Collision resistance is a *cryptographic assumption* about SHA3-512,
  inherited from the standard and the literature, and it must appear in your statements as a
  hypothesis, never as a proved lemma.
- `address_separates_of` is the composition, and its type makes the dependency structure
  visible and auditable at a glance.

This shape — prove what is provable, hypothesize what is assumed, and let the theorem
statement carry the seam — is how you avoid the single most common overclaim in this area
("our content addressing is formally verified"). What is verified is the encoding. What is
assumed is the hash. Write both down.

And the surface-syntax obligations, statable long before there is a parser:

```lean
def PrinterRoundTrip (pp : Term → String) (parse : String → Option Term) : Prop :=
  ∀ t : Term, parse (pp t) = some t

def ParserDeterministic (parse : String → Option Term) : Prop :=
  ∀ (s : String) (t u : Term), parse s = some t → parse s = some u → t = u
```

Both take the printer and parser as *parameters*. You do not need them to exist. You need
their types, and their types are a design decision you can make today. When someone later
proposes a surface feature, the question "does `PrinterRoundTrip` still hold?" is now a
precise question with a yes-or-no answer.

## 6.4 Guard rails

Three failure modes of this method, since I would rather you hear them from me.

1. **A statement can be vacuous.** `∀ t, P t → Q t` is trivially true if `P` is never
   inhabited. Defend by exhibiting an instance: prove `P t₀` for some concrete `t₀`, or run
   `#eval` on a witness. `example : Step selfApp (.lam (.var 0)) := ...` in Chapter 4 is
   doing exactly this job.
2. **A statement can be about the wrong object.** Injectivity of `encode` says nothing about
   the injectivity of the pipeline that *calls* `encode`, if some layer above normalizes or
   annotates first. Your survey found this precise pattern in the prior art: a stream layer
   whose injectivity is necessary but nowhere near sufficient, because the layer above it can
   tokenize two different values identically. State which layer you are talking about, every
   time.
3. **A statement can be right and unprovable-in-practice.** If the proof needs a lemma nobody
   has, the statement is aspirational. Distinguish "stated, believed, unproved" from "proved"
   in your own prose with the same care the `fips202` README uses. `def X : Prop := ...`
   compiles and proves nothing; that is a feature only if you never let it read as a result.

## 6.5 Why the spine cares

This is not one of the spine's chapters. It is the spine's *method*. Every stage — encoding,
address, store, semantics, surface — gets the same treatment: write the operations, write the
obligations as `Prop`s that elaborate, spot-check them exhaustively on a small universe, pin
the negatives about designs you rejected so nobody re-proposes them, prove the compositions
early, and discharge the leaves as the budget allows.

The payoff is that your design document stops being prose about intentions and becomes a file
that either compiles or does not.

---

# Chapter 7 — Canonical forms and normalization

A light touch, as promised: enough vocabulary to read the literature and to make one specific
design decision well.

## 7.1 The idea

The word *canonical* is used for two different things in this subject, and conflating them
will cost you an afternoon.

**Sense 1 — canonical forms of a type.** "A value of arrow type is a lambda." This is the
lemma from Chapter 5: given a type, what shapes can a value of that type have? It is about
types, and it lives inside the safety proof. You have already met it.

**Sense 2 — a canonical representative of an equivalence class.** Given a notion of "these two
things are the same", pick exactly one member of each class and call it *the* representative.
This is the one content-addressing needs, and it is what the rest of this chapter is about.

Here is the connection, stated as directly as I can:

> **Content-addressing is a claim that equality of addresses means sameness. So you must first
> decide what "the same" means — and then make the encoding see exactly that.**

Address is `hash ∘ encode`. `encode` is injective (Chapter 6), and `hash` is assumed
collision-resistant. So *by construction* two things get the same address exactly when they
are the same `Term`. Which means: every judgement about "sameness" that you want your store to
make has to be built into the `Term` type itself, or into a normalization pass in front of the
encoder. There is no third place for it to live.

Every candidate notion of sameness therefore forces a decision:

| "These are the same" | Handled by |
|---|---|
| `λx. x` and `λy. y` | the carrier — De Bruijn makes them one term (Chapter 2) |
| `{a, b}` and `{b, a}` in a record or import list | a normalization pass: sort the fields |
| `1.0` and `1.00`; `+0.0` and `-0.0`; the NaN payloads | a normalization pass, or a decision to forbid the ambiguity at the surface |
| two spellings of the same sugar, e.g. `let` versus an immediate application | elaboration — desugar before encoding |
| `x + 0` and `x` | **evaluation** — a much bigger commitment; see §7.4 |
| the same term recorded at different source lines | exclusion — spans must not be in the carrier at all |

The first row costs nothing because Chapter 2 already paid for it. Rows 2–4 are normalization
passes: cheap, decidable, obviously terminating. Row 5 is a different animal. Row 6 is not
normalization at all; it is a statement about what the term type contains, and it is the
easiest one to get wrong by accident, because provenance fields have a way of arriving later
"just for diagnostics".

**A TypeScript analogy that holds up.** JSON canonicalization — sorting keys, fixing number
formatting, pinning string escapes — before hashing a payload. Same problem, same solution
shape, and the same failure mode when someone adds a field that was not in the canonical
form's spec. The difference is that here you can *state and prove* that the canonicalizer is
complete for the equivalence you intend, rather than hoping.

## 7.2 The formal shape

**Normalization vocabulary**, for the reduction relation of Chapter 4:

- `t` is a **normal form** if no `t'` has `t ↦ t'`.
- The system is **weakly normalizing** if every term *has* a reachable normal form.
- It is **strongly normalizing** if there is no infinite reduction sequence at all.
- It is **confluent** (Church–Rosser) if `t ↦* u` and `t ↦* v` imply some `w` with `u ↦* w`
  and `v ↦* w`.

Confluence gives **uniqueness of normal forms**: if a term reduces to two normal forms, they
are equal. That is what licenses talking about *the* value of a term.

**Canonicalization vocabulary**, for an equivalence `R` on terms and a candidate
`norm : Term → Term`:

```
Idempotent:  norm (norm t) = norm t
Respects:    R t (norm t)                    -- normalizing does not change meaning
Complete:    R t u  ⟺  norm t = norm u       -- normalizing decides the equivalence
```

`Complete` is the strong one, and note it is an *if and only if*. Left-to-right says the
normalizer identifies everything it should (no false distinctions — two equivalent things
never get two addresses). Right-to-left says it identifies nothing it should not (no false
identifications — two inequivalent things never collide). Design bugs come in both flavours,
and only the biconditional catches both.

Reference: Baader and Nipkow, *Term Rewriting and All That* (Cambridge, 1998), Chapters 1–2,
for the normalization and confluence material at exactly the level you need; Barendregt,
*The Lambda Calculus*, Chapter 3, for Church–Rosser proper.

## 7.3 In Lean 4 this is:

```lean
def WeaklyNormalizing : Prop := ∀ t : Term, ∃ u, Steps t u ∧ NormalForm u

def Confluent : Prop :=
  ∀ t u v : Term, Steps t u → Steps t v → ∃ w, Steps u w ∧ Steps v w

theorem steps_nf {u w : Term} (h : Steps u w) (hnf : NormalForm u) : u = w := by
  cases h with
  | refl _      => rfl
  | trans hs _  => exact absurd ⟨_, hs⟩ hnf

theorem unique_normal_forms (hc : Confluent) {t u v : Term}
    (hu : Steps t u) (hv : Steps t v) (hnu : NormalForm u) (hnv : NormalForm v) :
    u = v := by
  obtain ⟨w, hw1, hw2⟩ := hc t u v hu hv
  rw [steps_nf hw1 hnu, steps_nf hw2 hnv]
```

`unique_normal_forms` is again the Chapter 5 pattern — a fully proved theorem taking an
unproved hypothesis (`Confluent`). The argument is three lines and it is *finished*; only
confluence itself remains.

**The canonicalization statements, abstract in `norm` and `R`:**

```lean
def Idempotent (norm : Term → Term) : Prop := ∀ t, norm (norm t) = norm t

def Respects (norm : Term → Term) (R : Term → Term → Prop) : Prop := ∀ t, R t (norm t)

def Complete (norm : Term → Term) (R : Term → Term → Prop) : Prop :=
  ∀ t u, R t u ↔ norm t = norm u
```

**And the theorem that ties the whole spine together**, using `AddressSeparates` from
Chapter 6:

```lean
theorem canonical_address (norm : Term → Term) (R : Term → Term → Prop)
    (h : List UInt8 → List UInt8)
    (hcomp : Complete norm R)
    (hsep : AddressSeparates h) :
    ∀ t u, h (encode (norm t)) = h (encode (norm u)) ↔ R t u := by
  intro t u
  constructor
  · intro he
    exact (hcomp t u).mpr (hsep _ _ he)
  · intro hr
    rw [(hcomp t u).mp hr]
```

Read the conclusion out loud: **two things have the same address exactly when they are
equivalent.** That is the sentence a content-addressed store exists to make true, and here it
is as a proved implication from two hypotheses — one about your normalizer, one about your
encoder-plus-hash. Nothing else is needed. Nothing else is hidden.

That statement is also a specification for work you have not done. It tells you precisely two
things to go build: a `norm` that is `Complete` for the `R` you chose, and an `encode` that is
injective. If someone proposes a spine change, ask which of the two hypotheses it endangers.

**A concrete canonicalizer**, at toy scale, so the shape is not abstract:

```lean
structure Decl where
  fields : List Nat
  deriving Repr, DecidableEq

def ins (x : Nat) : List Nat → List Nat
  | []      => [x]
  | y :: ys => if x ≤ y then x :: y :: ys else y :: ins x ys

def sort : List Nat → List Nat
  | []      => []
  | x :: xs => ins x (sort xs)

def normDecl (d : Decl) : Decl := ⟨sort d.fields⟩

def SameMultiset (a b : List Nat) : Prop := ∀ x, a.count x = b.count x

def DeclEquiv (a b : Decl) : Prop := SameMultiset a.fields b.fields

def NormDeclComplete : Prop := ∀ a b : Decl, DeclEquiv a b ↔ normDecl a = normDecl b

#eval normDecl ⟨[3, 1, 2]⟩              -- { fields := [1, 2, 3] }
example : normDecl ⟨[3, 1, 2]⟩ = normDecl ⟨[2, 3, 1]⟩ := by decide
example : normDecl (normDecl ⟨[3, 1, 2]⟩) = normDecl ⟨[3, 1, 2]⟩ := by decide
```

`DeclEquiv` says "same fields, order forgotten", expressed as equal multiplicities — a
definition you can state without any library support. `NormDeclComplete` is then the exact
obligation for this pass. Sorting is the canonical form; the two `example`s check one
instance of each half.

## 7.4 The tempting mistake: normalizing by evaluation

There is an attractive idea in the neighbourhood: make the address depend on the term's
*behaviour* rather than its *shape*. Reduce to normal form, then hash. Then `x + 0` and `x`
share an address, refactorings are free, and the store deduplicates semantically.

Three reasons to be careful, in increasing order of severity.

1. **It is undecidable in general.** For the untyped lambda calculus, equality of terms under
   beta-reduction is undecidable — the classical result behind Church's and Turing's
   negative answers to the Entscheidungsproblem. Many terms have no normal form at all. Your
   addressing function would be partial, and partial in a way you cannot detect.
2. **It collapses distinctions you may want back.** Two implementations with identical
   behaviour and wildly different cost become one entry. Whether that is a feature depends on
   what the store is *for*, and you should answer that before it is decided for you by an
   implementation detail.
3. **The address becomes a function of your evaluator.** Change the reduction strategy, fix a
   bug in the normalizer, and every address in the store moves. Compare with a purely
   structural canonical form, whose only dependency is the encoding — a much smaller, much
   more auditable surface.

The mainstream choice, and the one I would recommend defending explicitly rather than
inheriting: **address the shape, after cheap decidable normalization.** Keep the equivalence
`R` decidable, terminating, and small enough to write down in full. Semantic identity, if you
want it, belongs in a separate index built *on top of* addresses, not in the address function.

Whichever way you go, `canonical_address` is the theorem you owe, and its `R` is the place
the choice is recorded.

## 7.5 Why the spine cares

Four direct consequences.

1. **Any change to `norm` is a hash-version bump.** Your `Stream.lean` already recorded this
   in the honest form — obligation F3 states that the corrected encoding *is not* the old one,
   so every digest moves. The same is true of every canonicalization change. Put a version
   discriminator in the encoding from day one; it costs one byte and it buys you the ability
   to change your mind.
2. **The equivalence `R` is the most important undocumented thing in a content-addressed
   system.** Write it down explicitly, in one place, as a Lean definition. If it lives only in
   the encoder's code, nobody can review it and every future contributor will guess.
3. **Normalization must be idempotent, and you should check it.** A non-idempotent
   canonicalizer means the address of a stored term is not the address you get by re-reading
   and re-addressing it. That is a corruption bug with an extremely long fuse.
4. **Provenance is the recurring leak.** Spans, file paths, timestamps, and elaborator-
   generated name suffixes all want to ride along in the carrier. Every one of them silently
   refines the equivalence into "same term, same place, same day". The survey work in this
   repository found exactly that pattern in the prior art, twice. Decide where provenance
   lives — a receipt beside the address, never inside it.

---

# Chapter 8 — The Curry–Howard one-pager

You will live in this every day, so it is worth one page of demystification. This chapter is
self-contained and can be read at any point.

## 8.1 The idea

> **A proposition is a type. A proof of it is a program of that type. Checking a proof is
> type-checking a program.**

That is the Curry–Howard correspondence, and in Lean it is not a metaphor or a slogan — it is
the implementation. There is one language. `theorem` and `def` are the same declaration
keyword with different social conventions attached.

The correspondence, in full, on one line each:

| Logic | Type theory | In Lean |
|---|---|---|
| `P → Q` (implies) | function type | `P → Q` |
| `P ∧ Q` (and) | pair / product | `P ∧ Q`, built with `⟨_, _⟩` |
| `P ∨ Q` (or) | tagged sum | `P ∨ Q`, built with `Or.inl` / `Or.inr` |
| `∀ x : A, P x` | dependent function | `∀ x : A, P x` = `(x : A) → P x` |
| `∃ x : A, P x` | dependent pair | `∃ x : A, P x`, built with `⟨witness, proof⟩` |
| `False` | empty type | `False` — no constructors |
| `¬ P` | `P → empty` | `P → False` |
| proof by induction | recursive function | `Nat.rec`, `Exp.rec`, `induction ... with` |
| a proof | a term | any term of that type |
| proof checking | type checking | the kernel |

Attribution: Curry noticed the combinator/axiom correspondence in the 1930s–50s; Howard's
1969 manuscript extended it to natural deduction and was published as "The formulae-as-types
notion of construction" in *To H. B. Curry: Essays on Combinatory Logic, Lambda Calculus and
Formalism* (Academic Press, 1980), pp. 479–490. The best modern textbook treatment for your
purposes is Sørensen and Urzyczyn, *Lectures on the Curry–Howard Isomorphism* (Elsevier,
2006).

**Why you should care operationally, not philosophically.** Four practical consequences:

1. **Tactics are not magic.** `by simp` and `by omega` are *programs that construct a term*.
   The kernel then checks that term. If a tactic is buggy, it produces a term that fails to
   typecheck, and you get an error — not an unsound proof. This is why "tactic did something
   I do not understand" is a comprehension problem, never a trust problem.
2. **`#print` shows you the answer.** Any time a proof feels opaque, print it.
3. **You can always fall back to writing the term.** When tactics fight you, `HasType.lam
   (HasType.var rfl)` — a bare constructor application — often just works, as in Chapter 5.
4. **The reverse direction is the real payoff for your work.** Your Chapter 1 `Term` type, its
   recursor, your `Step` relation, your typing judgment — these are *the same kind of object*
   as the propositions you prove about them. That is why "define the language" and "state the
   theorem" are the same activity, in one file, in one language.

## 8.2 The formal shape

Natural-deduction implication-introduction and -elimination:

```
   Γ, P ⊢ Q                Γ ⊢ P → Q     Γ ⊢ P
  ─────────────  (→I)     ──────────────────────  (→E)
   Γ ⊢ P → Q                       Γ ⊢ Q
```

Now put those next to the typing rules for lambda and application from Chapter 5:

```
   Γ, x:A ⊢ t : B                Γ ⊢ f : A → B    Γ ⊢ a : A
  ────────────────  (T-Abs)     ──────────────────────────────  (T-App)
   Γ ⊢ λx. t : A → B                    Γ ⊢ f a : B
```

They are the same two rules. Erase the terms from the second pair and you get the first pair;
add terms to the first pair and you get the second. That is the entire content of the
correspondence, and it is why Chapter 5's typing judgment looked so much like a logic.

## 8.3 In Lean 4 this is:

```lean
/-! Implication is the function type. -/
def  modusPonensD {P Q : Prop} (f : P → Q) (p : P) : Q := f p
theorem modusPonensT {P Q : Prop} (f : P → Q) (p : P) : Q := f p
```

Both of these compile. **They are the same declaration.** Lean 4.33's linter does emit one
warning on the first, and the wording is itself the lesson:

```
warning: Definition `modusPonensD` is a proposition; use `theorem` instead of `def`
```

Not "error: this is not a program". Not "type mismatch". A *style* note: what you wrote is a
proposition, so please use the keyword that says so. The distinction is for humans.

```lean
/-! Conjunction is the pair type. -/
theorem and_flip {P Q : Prop} (h : P ∧ Q) : Q ∧ P := ⟨h.2, h.1⟩

/-! Disjunction is the sum type. -/
theorem or_flip {P Q : Prop} (h : P ∨ Q) : Q ∨ P :=
  match h with
  | .inl p => .inr p
  | .inr q => .inl q

/-! Universal quantification is the dependent function type. -/
theorem all_refl : ∀ n : Nat, n = n := fun _ => rfl

/-! Existential quantification is the dependent pair type. -/
theorem exists_gt_three : ∃ n : Nat, 3 < n := ⟨4, by decide⟩

/-! Falsity is the empty type; negation is `P → False`. -/
theorem no_nat_lt_zero : ¬ ∃ n : Nat, n < 0 := by
  rintro ⟨n, hn⟩
  omega
```

`and_flip` is field projection on a pair. `or_flip` is a `match` on a two-constructor type —
the same `match` you write on `Option`. `all_refl` is `fun _ => rfl`, an ordinary lambda.
`exists_gt_three` is `⟨4, proof⟩`: an existential proof *carries its witness*, which is why
constructive existence statements have computational content and classical ones sometimes do
not.

**A tactic proof is a proof term. Look:**

```lean
theorem two_plus_two : 2 + 2 = 4 := by decide
#print two_plus_two
#print axioms two_plus_two
```

prints, verbatim from the compile run:

```
theorem Ch8.two_plus_two : 2 + 2 = 4 :=
of_decide_eq_true (id (Eq.refl true))
'Ch8.two_plus_two' does not depend on any axioms
```

`decide` produced a five-token term. `#print axioms` is the tool you should reach for
whenever a claim matters: it reports exactly which axioms a proof rests on. Compare with a
deliberately unfinished proof:

```lean
theorem unfinished (n : Nat) : n + 0 = n := by sorry
#print axioms unfinished
```

which prints:

```
warning: declaration uses `sorry`
'unfinished' depends on axioms: [sorryAx]
```

`sorry` is a hole, and it is *visible* — in a warning at the definition site, and in the axiom
profile of everything that transitively uses it. This is the mechanism behind `fips202`'s
trust statement, which prints every theorem's axiom profile in-file and confirms containment
in `[propext, Classical.choice, Quot.sound]`. Adopt the habit: for any claim you intend to
rely on, run `#print axioms` and read the answer.

**Induction and recursion are one eliminator.** Chapter 1 promised this; here it is for `Nat`:

```lean
#check @Nat.rec
-- @Nat.rec : {motive : Nat → Sort u_1} → motive Nat.zero →
--            ((n : Nat) → motive n → motive n.succ) → (t : Nat) → motive t
```

If `motive n` is `Nat`, this is `fold` over the naturals. If `motive n` is a proposition, this
is mathematical induction. Same function. And the parallel is visible in ordinary code:

```lean
def append : List Nat → List Nat → List Nat
  | [],      ys => ys
  | x :: xs, ys => x :: append xs ys

theorem append_nil (xs : List Nat) : append xs [] = xs := by
  induction xs with
  | nil            => rfl
  | cons x xs ih   => simp [append, ih]
```

The `def` and the `theorem` have the same case structure, because they are both `List.rec`
with a different motive. The `ih` in the proof sits exactly where the recursive call sits in
the program.

**Computation lives in types.** One more, because it explains most of the `rfl`s in this
document:

```lean
example : append [1, 2] [3] = [1, 2, 3] := rfl
```

`rfl` proves `a = b` whenever the two sides *reduce* to the same normal form. The type checker
runs your program. That is why Chapter 2's alpha-equivalence proofs were `rfl`, why
`formal/fips202` can prove NIST test vectors by kernel reduction with no `native_decide`, and
why a well-chosen definition can make a theorem free.

## 8.4 Why the spine cares

Two reasons, and the second is the one that will change how you work.

1. **You will read Lean error messages as type errors, which you already know how to do.**
   "Type mismatch: expected `HasType Γ t T`, got `HasType Γ t U`" is the same species of
   message you read all day in a strongly typed language. Once the mystique is gone, the
   Infoview is just a very good IDE.
2. **Your language definition and your theorems about it are the same artifact.** There is no
   export step, no model that drifts from the code, no specification document that goes stale.
   The `Term` type in the file *is* the spine's carrier, and the theorems in that file are
   about that exact object. This is what makes Chapter 6's method work at all — and it is what
   makes a design document that compiles a strictly better thing than a design document that
   does not.

---

# Chapter 9 — The map: each chapter to its spine stage

This is the chapter that makes the curriculum a design document. For each stage of the spine —
term carrier, encoding, address, store, semantics, surface — here is which chapter powers it
and what, concretely, that chapter hands you.

## 9.1 The stages

I am using these names for the stages; substitute your own if you have them.

| Stage | What it is |
|---|---|
| **S0 — carrier** | the core calculus: the inductive type a program *is* |
| **S1 — encoding** | carrier → canonical bytes |
| **S2 — address** | bytes → SHA3-512 digest |
| **S3 — store** | append-only map from address to content, plus dependency edges |
| **S4 — semantics** | what a stored term *does* |
| **S5 — surface** | the scripting language: parser, printer, elaboration, names |

## 9.2 The map

| Chapter | Powers | What it hands you |
|---|---|---|
| **1 — Inductive syntax** | **S0** | The carrier itself, plus the recursor. Every later proof over "all terms" is an application of `Term.rec`. Also: constructor injectivity and disjointness, which are the raw material of S1's injectivity proof. |
| **2 — Binding** | **S0**, and therefore S2 | The decision that makes addresses alpha-invariant *by construction* rather than by discipline. Also the reason names must live outside the carrier, which is an S5 requirement. |
| **3 — Substitution** | **S4** | The operation the semantics is defined by, and the lemma zoo any statement about evaluation must pass through. Also, transferably, the spot-check-before-you-prove habit that S1 needs most. |
| **4 — Operational semantics** | **S4**, and S3's caching | `Step` / `step?` / `StepAdequate` — the spec-relation, executable-function, bridging-theorem triple. `Deterministic` is the precondition for addressing evaluation results. |
| **5 — Type systems** | **S0** (if types are carried), **S4** | Whether types are part of the content, and the progress/preservation architecture. `safety_of` is proved; the leaves are yours. |
| **6 — Metatheory as design** | **all stages** | Not a stage — the method. `EncodeInjective`, `DecodeRoundTrip`, `Peelable`, and `address_separates_of` are S1 and S2 in their entirety. |
| **7 — Canonical forms** | **S1**, **S3** | The equivalence `R` your store is claiming to respect, the normalization pass in front of the encoder, and `canonical_address` — the theorem that says equal addresses mean equivalent terms. |
| **8 — Curry–Howard** | **the toolchain** | Why the definition file and the theorem file are one file; `#print axioms` as your audit instrument. |

## 9.3 The obligation ledger

Everything this curriculum names, in one table, with an honest status. "Proved here" means a
compiled proof appears above. "Stated" means a `Prop` that elaborates and is not discharged.
"Assumed" means it is not a theorem and cannot become one.

| Obligation | Stage | Status |
|---|---|---|
| `size_pos`, `plus_inj`, `lit_ne_plus` | S0 | proved here (illustrative) |
| alpha-invariance of the carrier | S0 | *unstatable* — De Bruijn makes it definitional (Ch. 2) |
| `shift_shift`, `shift_zero`, `subst_shift` | S4 | proved here |
| `SubstCommute` (substitution lemma) | S4 | stated; spot-checked true on 15-term universe |
| `value_normal`, `step_det`, `determinism` | S4 | proved here |
| `StepAdequate` (`step?` agrees with `Step`) | S4 | stated |
| `Weakening`, `SubstPreservesTyping` | S0/S4 | stated |
| `Progress`, `Preservation` | S4 | stated |
| `TypeSafety` from the two above | S4 | **proved here as an implication** (`safety_of`) |
| `EncodeInjective` | S1 | stated; spot-checked on 255 terms |
| `DecodeRoundTrip`, `Peelable` | S1 | stated |
| `encodeBad_not_injective` | S1 | **proved here** — a rejected design, pinned |
| `AddressSeparates` from injectivity + hash | S2 | **proved here as an implication** (`address_separates_of`) |
| collision resistance of SHA3-512 | S2 | **assumed** — false as literal injectivity, by counting |
| `Sha3.Impl.sha3_512 = Sha3.Spec.sha3_512_bytes` | S2 | **proved and landed** in `formal/fips202` |
| `Complete norm R`, `Idempotent norm` | S1/S3 | stated |
| `canonical_address` | S1+S2+S3 | **proved here as an implication** |
| `PrinterRoundTrip`, `ParserDeterministic` | S5 | stated (parametric in `pp`/`parse`) |

Read the pattern in that table: **the compositions are proved and the leaves are stated.** Six
implications are already machine-checked, and none of them can be invalidated by later work on
the leaves. That is what "prove stuff about what our language is going to be without having
created it yet" cashes out to.

## 9.4 Wiring the address to the landed digest

Two snippets that are **not compiled in this document**, because they need the `fips202`
package on the Lake path. Everything else above was compiled; these two are here so the seam
is concrete.

In the consuming project's `lakefile.toml`:

```toml
[[require]]
name = "fips202"
path = "../formal/fips202"
```

(`formal/fips202/lakefile.toml` declares `name = "fips202"` with a single `lean_lib` named
`Sha3`, so `import Sha3.Impl` is the entry point.)

Then, in the spine:

```lean
-- NOT COMPILED IN THIS DOCUMENT — requires the `fips202` dependency above.
import Sha3.Impl

/-- The address of a term: SHA3-512 of its canonical encoding. -/
def address (t : Term) : List UInt8 := Sha3.Impl.sha3_512 (encode t)

/-- The honest headline, with its assumption explicit. -/
def AddressesSeparateTerms : Prop :=
  (∀ x y : List UInt8, Sha3.Impl.sha3_512 x = Sha3.Impl.sha3_512 y → x = y) →
  ∀ t u : Term, address t = address u → t = u
```

`Sha3.Impl.sha3_512 : List UInt8 → List UInt8` is the exact signature (`Sha3/Impl.lean:92`),
so the composition typechecks as written. And `address_separates_of` from Chapter 6 already
proves `AddressesSeparateTerms` once `EncodeInjective` is discharged — the abstract version
and the concrete version are the same theorem with `h` instantiated.

Note what the hypothesis in `AddressesSeparateTerms` is doing. It is *false* as stated —
`fips202`'s README says so plainly: injectivity of the hash is false by counting, and no
security property is claimed. Writing it as an explicit antecedent is therefore not a
weakness; it is the whole point. The theorem says exactly what it depends on, the dependency
is visibly not a theorem, and nobody reading it can mistake the artifact for a proof of
collision resistance. When you write the spine's README, that is the sentence to write.

## 9.5 A suggested first pass

If you want a concrete sequence rather than a reading list:

1. Recreate Chapter 1's `Exp` from scratch, without looking. Prove `size_pos` yourself. Break
   the `def size` by deleting a case and read the error.
2. Recreate Chapter 2's `Term`, `toDeBruijn`, `shift`, `subst`. Prove `shift_zero`. Then
   deliberately remove `generalizing c` and read the stuck goal in the Infoview until the
   failure mode is familiar.
3. Write your own `encode` for your real carrier, and its `terms`-style enumerator, and run
   the round-trip spot-check. Expect it to fail the first time; that failure is the chapter.
4. Prove `Peelable` for your encoding. This is the first genuinely substantial proof in the
   list, and it is the one the spine actually needs.
5. Only then decide about types, semantics, and the surface.

Steps 1–3 are days, not weeks. Step 4 is the real work, and everything before it exists to
make it approachable.

---

# References

Cited by name and edition. URLs below were fetched and confirmed reachable on 2026-08-24;
everything else is cited by DOI or by book edition only.

**Paper-ledger receipt: nothing was added.** No PDF was downloaded or written to
`.reference/papers/` in the preparation of this document, so no new receipt rows (filename,
byte size, sha256, identifier, source URL, "Used for:") are owed and none are invented below.
The directory was inspected and left unchanged: 116 files plus `README.md`, against 88 entries
in `.reference/provenance/papers.lock.json`. Everything cited in this chapter's book and paper
lists is cited from bibliographic metadata — edition, venue, DOI — not from a local copy.

§ "Already local and directly on topic" below points at corpus files that *were* already
present before this document was written. Those are pointers, not citations: their titles and
lock identifiers were read from the lock file, their contents were not, and nothing in this
curriculum rests on them.

## Books

- Pierce, Benjamin C. **Types and Programming Languages.** MIT Press, 2002. ISBN
  978-0-262-16209-8. *The primary reference for this curriculum.* Chapter 3 (induction on
  syntax), Chapter 5 §5.3 (untyped lambda calculus, Figure 5-3), Chapter 6 (nameless
  representation, Definitions 6.2.1 and 6.2.4), Chapter 9 (simply typed lambda calculus,
  progress and preservation).
- Harper, Robert. **Practical Foundations for Programming Languages.** 2nd edition,
  Cambridge University Press, 2016. ISBN 978-1-107-15030-0. Chapter 1 (abstract binding
  trees — the most careful treatment of "abstract syntax tree" as a mathematical object),
  Chapters 5 and 7 (statics and dynamics), Chapter 6 (type safety).
- Barendregt, Henk P. **The Lambda Calculus: Its Syntax and Semantics.** Revised edition,
  North-Holland, 1984. ISBN 978-0-444-87508-2. Lemma 2.1.16 (the substitution lemma),
  Chapter 3 (Church–Rosser).
- Baader, Franz and Tobias Nipkow. **Term Rewriting and All That.** Cambridge University
  Press, 1998. ISBN 978-0-521-77920-3. Chapters 1–2 (normal forms, termination, confluence).
- Sørensen, Morten Heine and Paweł Urzyczyn. **Lectures on the Curry–Howard Isomorphism.**
  Studies in Logic and the Foundations of Mathematics vol. 149, Elsevier, 2006. ISBN
  978-0-444-52077-7.
- Nipkow, Tobias and Gerwin Klein. **Concrete Semantics with Isabelle/HOL.** Springer, 2014.
  DOI `10.1007/978-3-319-10542-0`. Not Lean, but the closest thing to a "mechanized TAPL"
  worked end to end, and its Part II is a good second pass over Chapters 4–5 here.

## Papers

- de Bruijn, N. G. "Lambda calculus notation with nameless dummies, a tool for automatic
  formula manipulation, with application to the Church-Rosser theorem." *Indagationes
  Mathematicae* 34 (5), 1972, pp. 381–392. DOI `10.1016/1385-7258(72)90034-0`. *The source of
  Chapter 2.*
- Wright, Andrew K. and Matthias Felleisen. "A Syntactic Approach to Type Soundness."
  *Information and Computation* 115 (1), 1994, pp. 38–94. DOI `10.1006/inco.1994.1093`. *The
  source of "safety = progress + preservation".*
- Plotkin, Gordon D. "A Structural Approach to Operational Semantics." *Journal of Logic and
  Algebraic Programming* 60–61, 2004, pp. 17–139. DOI `10.1016/j.jlap.2004.05.001`. (The
  published version of the 1981 Aarhus technical report DAIMI FN-19.)
- Aydemir, Brian E. et al. "Mechanized Metatheory for the Masses: The POPLmark Challenge."
  *Theorem Proving in Higher Order Logics (TPHOLs) 2005*, LNCS 3603, pp. 50–65. DOI
  `10.1007/11541868_4`. Project page (confirmed reachable):
  <https://www.engineering.upenn.edu/~plclub/poplmark/> — the `poplmark.pdf` link on that
  page is the challenge document.
- Charguéraud, Arthur. "The Locally Nameless Representation." *Journal of Automated
  Reasoning* 49 (3), 2012, pp. 363–408. DOI `10.1007/s10817-011-9225-2`.
- Howard, William A. "The formulae-as-types notion of construction." Written 1969; published
  in *To H. B. Curry: Essays on Combinatory Logic, Lambda Calculus and Formalism*, Academic
  Press, 1980, pp. 479–490. ISBN 978-0-12-349050-6.

## Open, online, and directly usable

- Pierce, Benjamin C. et al. **Software Foundations, Volume 2: Programming Language
  Foundations.** Electronic textbook. <https://softwarefoundations.cis.upenn.edu/plf-current/index.html>
  (confirmed reachable 2026-08-24; the series index lists seven volumes). Chapters `Stlc` and
  `StlcProp` are Chapters 3–5 of this curriculum, fully mechanized, with exercises. It is in
  Rocq/Coq, not Lean, but the statements transfer almost verbatim and the prose is the best
  available.
- Avigad, Jeremy, Leonardo de Moura, Soonho Kong and Sebastian Ullrich. **Theorem Proving in
  Lean 4.** <https://lean-lang.org/theorem_proving_in_lean4/> — confirmed 2026-08-24 to
  target Lean **4.33.0**, i.e. essentially your exact toolchain. This is the manual for
  Chapter 8's material and for the tactic vocabulary used throughout.
- NIST. **FIPS 202: SHA-3 Standard: Permutation-Based Hash and Extendable-Output Functions.**
  August 2015. DOI `10.6028/NIST.FIPS.202`.
  <https://nvlpubs.nist.gov/nistpubs/FIPS/NIST.FIPS.202.pdf>. The pinned copy and its digest
  are recorded in `formal/fips202/PROVENANCE.md`.

## Already local and directly on topic

These were already in `.reference/papers/` before this document existed. I did not read them
while writing this curriculum and make no claim about their contents beyond their titles;
they are listed because a reader who wants to go past Chapters 2 and 7 will want them, and
because their identifiers are already recorded in the lock. Verify any file against
`.reference/provenance/papers.lock.json` before citing it.

| File | Identifier (from the lock) | Relevant to |
|---|---|---|
| `apinis-ahman-2025-simple-formalization-alpha-equivalence.pdf` | arXiv `2507.10181v2` | Chapter 2 |
| `maziarz-2021-hashing-modulo-alpha-equivalence.pdf` | arXiv `2105.02856v1` | Chapters 2, 7 — hashing terms up to alpha-equivalence is *precisely* the spine's S1/S2 question |
| `blaauwbroek-olsak-geuvers-2024-hashing-modulo-context-sensitive-alpha.pdf` | arXiv `2401.02948v3` | Chapters 2, 7 |
| `schneider-2025-slotted-egraphs.pdf` | DOI `10.1145/3729326` | Chapter 7 — binders under structural sharing |
| `demoura-ullrich-2021-lean4.pdf` | DOI `10.1007/978-3-030-79876-5_37` | Chapter 8 — the Lean 4 system paper |
| `nist-2015-fips202-sha3-standard.pdf` | DOI `10.6028/NIST.FIPS.202` | Chapter 9 — the standard `formal/fips202` transcribes |

Two further files in the directory are on topic but carry **no lock entry**, so they are
outside the verified corpus and should not be cited until the generator admits them:
`delaware-2019-narcissus-decoders-encoders.pdf` (verified encoders and decoders — Chapter 6's
subject) and `dolstra-2006-purely-functional-software-deployment.pdf` (a content-addressed
store — Chapter 9's S3).

## In this repository

- `formal/fips202/` — SHA3-512 in Lean 4 with a proved specification-implementation
  refinement (`sha3_512_bridge`), 67 theorems, toolchain `v4.33.1`, no Mathlib. Referenced in
  Chapters 3, 4, 6, 8, and 9 as the worked example of the spec/impl/bridge pattern, of an
  explicit trust statement, and of the axiom-profile discipline. `Sha3/Impl.lean:92` gives
  `sha3_512 : List UInt8 → List UInt8`.
- `.staging/unison-fragment/Fragment/Stream.lean` — the token-stream exploration whose
  `Peelable` / `StreamInjective` / `obligation_F1..F3` idiom this curriculum adopts
  throughout, and whose `v2_stream_not_injective` is the model for pinning a negative result
  about a rejected design.
- `.staging/explore/concrete-spine-feasibility.md` — the prior-art probe establishing that
  both surveyed systems carry surface binder names into their digests. Chapter 2 §2.4 and
  Chapter 7 §7.5 refer to those findings.

---

## Compilation record

Every Lean snippet in Chapters 1–8 was compiled with `lean` from
`leanprover/lean4:v4.33.1` (`Lean (version 4.33.1, x86_64-w64-windows-gnu, commit
819816b2e0a3bf405af45ae5c7af2491d8f5bee6, Release)`), core library only, no Mathlib and no
other dependency. Files `Ch1.lean` through `Ch8.lean` in a scratch directory, each exiting 0.
Two intentional, documented warnings occur and are quoted in place: the `def`-on-a-proposition
linter note in Chapter 8, and `declaration uses 'sorry'` on the deliberate hole in Chapter 8.

The only snippets **not** compiled are the two in §9.4, which are marked in place and require
the `fips202` package on the Lake path.
