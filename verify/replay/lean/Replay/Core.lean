/-
Replay soundness — ground-truth increment 3.

Statement (workflow authoring & emission design §5.1): for any certified
static workflow DAG with deterministic bindings, every execution — any
interleaving, any crash/retry pattern the register admits — commits the
same result per node, and replaying from any reachable committed state
reproduces exactly those results. The committed linearization is a
decision about ORDER; it can never be a decision about VALUES.

The model, and how the register discharges it:

- `Dag`: a static workflow in topological numbering (node m feeds n only
  if m < n; every finite DAG admits such a numbering — stated
  abstraction, and labels-as-identity is the ratified v0 position, so
  nodes are indices). `body` is a FUNCTION — the determinism hypothesis,
  held by type, exactly the hypothesis the design says must be enforced
  by construction (static DAGs first).
- `Store`: the Done-set — work digest ↦ committed value, abstracted to
  node index ↦ value.
- `Exec`: the execution semantics. One step commits one uncommitted
  READY node with the value of its body on the committed inputs. The
  proven register laws are what license this abstraction: first commit
  wins (`hnone` — the effector's create-if-absent + fence check), a
  duplicate commit of the same work is absorbed with the same value
  (deterministic body + committed inputs ⇒ byte-identical result, the
  `classifyCommitted` same-fence-same-result branch), and a crashed
  attempt that never commits touches nothing. Steals and retries
  therefore change WHO commits, never WHAT is committed — they vanish
  from the store semantics.
- Values abstracted to `Nat` (nothing below inspects them).

Theorems: `exec_coherent` (every committed value is the denotation),
`schedule_irrelevance` (any two complete executions agree everywhere —
the exchange/linearization-invariance half), `replay_sound` (fold-over-
Done from ANY reachable store reproduces the denotation — the memoized-
replay half). `Replay.Faithless` is the negative control: drop the
ready guard and two schedules commit different values.
-/

namespace Replay

/-- A static workflow DAG, topologically numbered, with deterministic
bodies. -/
structure Dag where
  preds : Nat → List Nat
  body  : Nat → List Nat → Nat
  acyc  : ∀ n, ∀ m ∈ preds n, m < n

/-- Strong induction over `Nat` (local, to stay core-only). -/
theorem strongInd {P : Nat → Prop}
    (h : ∀ n, (∀ m, m < n → P m) → P n) (n : Nat) : P n :=
  h n (fun m hm => strongInd h m)
termination_by n
decreasing_by exact hm

/-- Congruence for `List.map` (local, to stay core-only). -/
theorem map_congr {α β : Type} {l : List α} {f g : α → β}
    (h : ∀ a ∈ l, f a = g a) : l.map f = l.map g := by
  induction l with
  | nil => rfl
  | cons x xs ih =>
      simp only [List.map_cons]
      rw [h x List.mem_cons_self,
          ih (fun a ha => h a (List.mem_cons_of_mem x ha))]

/-- Node 0 can have no predecessors. -/
theorem preds_zero_nil (G : Dag) : G.preds 0 = [] := by
  cases hp : G.preds 0 with
  | nil => rfl
  | cons m ms =>
      have hm : m ∈ G.preds 0 := by rw [hp]; exact List.mem_cons_self
      exact absurd (G.acyc 0 m hm) (Nat.not_lt_zero m)

/-! ## The denotation

Fuel-indexed to keep every recursion structural; `preds` strictly
decrease, so fuel `n` suffices at node `n`, and `evalF_stable` proves the
fuel is semantically invisible. -/

def evalF (G : Dag) : Nat → Nat → Nat
  | 0,        n => G.body n []
  | fuel + 1, n => G.body n ((G.preds n).map (evalF G fuel))

/-- The unique result assignment of the DAG. -/
def eval (G : Dag) (n : Nat) : Nat := evalF G n n

theorem evalF_stable (G : Dag) :
    ∀ n fuel, n ≤ fuel → evalF G fuel n = evalF G n n := by
  refine strongInd ?_
  intro n ih fuel hfuel
  match fuel, n with
  | 0, n =>
      have : n = 0 := Nat.le_zero.mp hfuel
      subst this; rfl
  | g + 1, 0 =>
      simp [evalF, preds_zero_nil G]
  | g + 1, k + 1 =>
      simp only [evalF]
      congr 1
      apply map_congr
      intro m hm
      have hmk : m < k + 1 := G.acyc (k + 1) m hm
      have hg : m ≤ g := Nat.lt_succ_iff.mp (Nat.lt_of_lt_of_le hmk hfuel)
      have hk : m ≤ k := Nat.lt_succ_iff.mp hmk
      rw [ih m hmk g hg, ← ih m hmk k hk]

/-- The denotation's defining equation, fuel-free. -/
theorem eval_unfold (G : Dag) (n : Nat) :
    eval G n = G.body n ((G.preds n).map (eval G)) := by
  match n with
  | 0 => simp [eval, evalF, preds_zero_nil G]
  | k + 1 =>
      show evalF G (k + 1) (k + 1) = _
      simp only [evalF]
      congr 1
      apply map_congr
      intro m hm
      have hmk : m < k + 1 := G.acyc (k + 1) m hm
      exact evalF_stable G m k (Nat.lt_succ_iff.mp hmk)

/-! ## The execution semantics -/

/-- The Done-set: committed results. -/
abbrev Store := Nat → Option Nat

/-- All of a node's inputs are committed. -/
def Ready (G : Dag) (σ : Store) (n : Nat) : Prop :=
  ∀ m ∈ G.preds n, (σ m).isSome

/-- The inputs a commit reads (default is irrelevant under `Ready`). -/
def inputs (G : Dag) (σ : Store) (n : Nat) : List Nat :=
  (G.preds n).map (fun m => (σ m).getD 0)

/-- Commit node `n`: the register's first-commit-wins, as a store write. -/
def commitStep (G : Dag) (σ : Store) (n : Nat) : Store :=
  fun m => if m = n then some (G.body n (inputs G σ n)) else σ m

/-- Reachable committed states: any interleaving of ready commits.
Crashed attempts and absorbed duplicate commits change nothing and are
therefore not steps (see header). -/
inductive Exec (G : Dag) : Store → Prop where
  | init : Exec G (fun _ => none)
  | commit {σ : Store} {n : Nat}
      (hnone : σ n = none) (hready : Ready G σ n) (h : Exec G σ) :
      Exec G (commitStep G σ n)

/-- Coherence: every committed value is the denotation. -/
def Coherent (G : Dag) (σ : Store) : Prop :=
  ∀ n v, σ n = some v → v = eval G n

/-- Under coherence and readiness, the read inputs are the denotations. -/
theorem inputs_eq_eval (G : Dag) {σ : Store} {n : Nat}
    (hcoh : Coherent G σ) (hready : Ready G σ n) :
    inputs G σ n = (G.preds n).map (eval G) := by
  apply map_congr
  intro m hm
  cases hσ : σ m with
  | none => exact absurd (hσ ▸ hready m hm) (by simp)
  | some v => simp [hcoh m v hσ]

/-- **Coherence invariance**: every reachable store is coherent. This is
the inductive heart — the register's guard (commit only ready, only
once) is exactly what preserves it. -/
theorem exec_coherent (G : Dag) {σ : Store} (h : Exec G σ) :
    Coherent G σ := by
  induction h with
  | init => intro n v hv; cases hv
  | commit hnone hready _ ih =>
      intro n' v hv
      unfold commitStep at hv
      split at hv
      · next heq =>
          injection hv with hv
          subst heq
          rw [← hv, eval_unfold, inputs_eq_eval G ih hready]
      · next => exact ih n' v hv

/-- **Determinacy**: any two executions agree on everything both
committed. -/
theorem determinacy (G : Dag) {σ σ' : Store} {n v v' : Nat}
    (h : Exec G σ) (h' : Exec G σ')
    (hv : σ n = some v) (hv' : σ' n = some v') : v = v' := by
  rw [exec_coherent G h n v hv, exec_coherent G h' n v' hv']

/-- **Schedule irrelevance** (linearization-invariance): any two COMPLETE
executions over nodes `< k` are pointwise equal — the committed
linearization is a decision about order, never about values. -/
theorem schedule_irrelevance (G : Dag) {σ σ' : Store} {k : Nat}
    (h : Exec G σ) (h' : Exec G σ')
    (hall : ∀ n, n < k → (σ n).isSome) (hall' : ∀ n, n < k → (σ' n).isSome) :
    ∀ n, n < k → σ n = σ' n := by
  intro n hn
  cases hσ : σ n with
  | none => exact absurd (hσ ▸ hall n hn) (by simp)
  | some v =>
      cases hσ' : σ' n with
      | none => exact absurd (hσ' ▸ hall' n hn) (by simp)
      | some v' =>
          rw [determinacy G h h' hσ hσ']

/-! ## Replay -/

/-- Fold-over-Done: committed nodes return their committed value without
re-execution; uncommitted nodes are computed from replayed inputs. Fuel
as in `evalF`. -/
def replayF (G : Dag) (σ : Store) : Nat → Nat → Nat
  | 0, n =>
      (match σ n with
       | some v => v
       | none   => G.body n [])
  | fuel + 1, n =>
      (match σ n with
       | some v => v
       | none   => G.body n ((G.preds n).map (replayF G σ fuel)))

def replay (G : Dag) (σ : Store) (n : Nat) : Nat := replayF G σ n n

theorem replayF_correct (G : Dag) {σ : Store} (hcoh : Coherent G σ) :
    ∀ n fuel, n ≤ fuel → replayF G σ fuel n = eval G n := by
  refine strongInd ?_
  intro n ih fuel hfuel
  match fuel, n with
  | 0, n =>
      have hn : n = 0 := Nat.le_zero.mp hfuel
      subst hn
      simp only [replayF]
      cases hσ : σ 0 with
      | some v => exact hcoh 0 v hσ
      | none => rw [eval_unfold]; simp [preds_zero_nil G]
  | g + 1, n =>
      simp only [replayF]
      cases hσ : σ n with
      | some v => exact hcoh n v hσ
      | none =>
          show G.body n ((G.preds n).map (replayF G σ g)) = eval G n
          rw [eval_unfold]
          congr 1
          apply map_congr
          intro m hm
          have hmn : m < n := G.acyc n m hm
          exact ih m hmn g (Nat.lt_succ_iff.mp (Nat.lt_of_lt_of_le hmn hfuel))

/-- **Replay soundness**: from ANY reachable committed state — mid-run,
post-crash, fully complete — the fold over Done facts reproduces the
denotation at every node. Replay is execution. -/
theorem replay_sound (G : Dag) {σ : Store} (h : Exec G σ) (n : Nat) :
    replay G σ n = eval G n :=
  replayF_correct G (exec_coherent G h) n n (Nat.le_refl n)

/-- Special case worth naming: a completed run's committed values ARE the
denotation. -/
theorem complete_run (G : Dag) {σ : Store} {n : Nat}
    (h : Exec G σ) (hsome : (σ n).isSome) : σ n = some (eval G n) := by
  cases hσ : σ n with
  | none => exact absurd (hσ ▸ hsome) (by simp)
  | some v => rw [exec_coherent G h n v hσ]

end Replay
