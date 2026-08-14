/-!
# SSEx — the split-soundness model, finite corpus-relative core

Machine-checked seed of the model defined in
`docs/research/2026-08-14-learning-limits-literature.md` (§1, §4) and the
frame in `docs/design/2026-08-14-inference-frame-and-grill-record.md`.

The model: a finite candidate space, a target `t` (an external agent's
intent), a SOUND refutation oracle (a returned witness certifies
over-approximation on the universe; silence certifies none), a complete
positive corpus, and an untrusted intent channel. The intent channel's
only lawful influence is the enumeration ORDER.

Two results, both dependency-free (no mathlib):

* `steer_never_close` — for EVERY order containing the target, the
  steered learner returns a hypothesis extensionally equal to the target
  on the universe. An arbitrarily lying intent channel, plumbed as
  ordering, cannot corrupt identification; it can only choose which
  member of the target's equivalence class is found, and how fast.
* `ClosingDemo` — the same information plumbed as elimination fails: a
  single false accept makes the trusting learner wrong on an instance
  where the steered learner, with the same oracles and the same order,
  is right.

`perfect_steering` records the value-of-steering endpoint: a correct
intent channel costs one conjecture.
-/

namespace SSEx

/-! ## List auxiliaries (core-only) -/

theorem all_mem {α : Type _} {p : α → Bool} :
    ∀ {l : List α}, l.all p = true → ∀ {a : α}, a ∈ l → p a = true := by
  intro l
  induction l with
  | nil => intro _ a ha; cases ha
  | cons x xs ih =>
    intro h a ha
    rw [List.all_cons, Bool.and_eq_true] at h
    cases ha with
    | head => exact h.1
    | tail _ hmem => exact ih h.2 hmem

theorem forall_all {α : Type _} {p : α → Bool} :
    ∀ {l : List α}, (∀ a, a ∈ l → p a = true) → l.all p = true := by
  intro l
  induction l with
  | nil => intro _; rfl
  | cons x xs ih =>
    intro h
    rw [List.all_cons, Bool.and_eq_true]
    exact ⟨h x (.head xs), ih (fun a ha => h a (.tail x ha))⟩

theorem find?_spec {α : Type _} {p : α → Bool} :
    ∀ {l : List α} {a : α}, l.find? p = some a → p a = true ∧ a ∈ l := by
  intro l
  induction l with
  | nil => intro a h; cases h
  | cons x xs ih =>
    intro a h
    cases hpx : p x with
    | true =>
      rw [List.find?_cons_of_pos _ hpx] at h
      cases h
      exact ⟨hpx, .head xs⟩
    | false =>
      rw [List.find?_cons_of_neg _ (by simp [hpx])] at h
      obtain ⟨hp, hmem⟩ := ih h
      exact ⟨hp, .tail x hmem⟩

theorem find?_exists {α : Type _} {p : α → Bool} :
    ∀ {l : List α} {a : α}, a ∈ l → p a = true → ∃ b, l.find? p = some b := by
  intro l
  induction l with
  | nil => intro a ha; cases ha
  | cons x xs ih =>
    intro a ha hp
    cases hpx : p x with
    | true => exact ⟨x, List.find?_cons_of_pos _ hpx⟩
    | false =>
      cases ha with
      | head =>
        rw [hp] at hpx
        exact Bool.noConfusion hpx
      | tail _ hmem =>
        obtain ⟨b, hb⟩ := ih hmem hp
        exact ⟨b, by rw [List.find?_cons_of_neg _ (by simp [hpx])]; exact hb⟩

/-! ## The model -/

variable {V H : Type}

/-- Extensional agreement of two hypotheses on a finite universe. -/
def AgreesOn (univ : List V) (sem : H → V → Bool) (a b : H) : Prop :=
  ∀ v, v ∈ univ → sem a v = sem b v

/-- A sound, silence-complete refutation oracle for target `t`: a returned
witness certifies over-approximation on the universe; silence certifies
there is none. (The adversary chooses WHICH witness; the results below
never depend on the choice.) -/
structure Refuter (univ : List V) (sem : H → V → Bool) (t : H) where
  ask : H → Option V
  sound : ∀ h v, ask h = some v →
    v ∈ univ ∧ sem h v = true ∧ sem t v = false
  complete : ∀ h, ask h = none →
    ∀ v, v ∈ univ → sem h v = true → sem t v = true

/-- A complete positive corpus: it contains every universe-positive of the
target, and only positives. -/
structure Corpus (univ : List V) (sem : H → V → Bool) (t : H) (X : List V) :
    Prop where
  pos : ∀ v, v ∈ X → sem t v = true
  covers : ∀ v, v ∈ univ → sem t v = true → v ∈ X

/-- Consistency: passes the whole corpus and draws no refutation. -/
def consistent (X : List V) (sem : H → V → Bool) (ask : H → Option V)
    (h : H) : Bool :=
  (X.all fun v => sem h v) && (ask h).isNone

/-- The steered learner: scan candidates in the given order — the intent
channel's ONLY influence — and return the first consistent one. -/
def steered (ord : List H) (X : List V) (sem : H → V → Bool)
    (ask : H → Option V) : Option H :=
  ord.find? (consistent X sem ask)

/-! ## Possibility -/

theorem target_consistent (univ : List V) (sem : H → V → Bool) (t : H)
    (R : Refuter univ sem t) {X : List V} (C : Corpus univ sem t X) :
    consistent X sem R.ask t = true := by
  unfold consistent
  rw [Bool.and_eq_true]
  refine ⟨forall_all (fun v hv => C.pos v hv), ?_⟩
  cases hask : R.ask t with
  | none => rfl
  | some v =>
    obtain ⟨_, hpos, hneg⟩ := R.sound t v hask
    rw [hpos] at hneg
    exact Bool.noConfusion hneg

theorem consistent_agrees (univ : List V) (sem : H → V → Bool) (t : H)
    (R : Refuter univ sem t) {X : List V} (C : Corpus univ sem t X)
    {h : H} (hc : consistent X sem R.ask h = true) :
    AgreesOn univ sem h t := by
  unfold consistent at hc
  rw [Bool.and_eq_true] at hc
  obtain ⟨hall, hnone⟩ := hc
  have hask : R.ask h = none := by
    cases hask : R.ask h with
    | none => rfl
    | some v => rw [hask] at hnone; exact Bool.noConfusion hnone
  intro v hv
  cases hsemt : sem t v with
  | true =>
    have hx : v ∈ X := C.covers v hv hsemt
    have hh : sem h v = true := all_mem hall hx
    rw [hh, hsemt]
  | false =>
    cases hsemh : sem h v with
    | false => rfl
    | true =>
      have ht : sem t v = true := R.complete h hask v hv hsemh
      rw [hsemt] at ht
      exact Bool.noConfusion ht

/-- **Steer, never close** (finite, corpus-relative form). Whatever order
the untrusted intent channel induces — any `ord` containing the target —
the steered learner halts with a hypothesis extensionally equal to the
target. The intent channel can influence which witness of the target's
equivalence class is found, and how fast; never whether. -/
theorem steer_never_close (univ : List V) (sem : H → V → Bool) (t : H)
    (R : Refuter univ sem t) {X : List V} (C : Corpus univ sem t X)
    {ord : List H} (ht : t ∈ ord) :
    ∃ h, steered ord X sem R.ask = some h ∧ AgreesOn univ sem h t := by
  obtain ⟨b, hb⟩ := find?_exists ht (target_consistent univ sem t R C)
  exact ⟨b, hb, consistent_agrees univ sem t R C (find?_spec hb).1⟩

/-- The value-of-steering endpoint: a correct intent channel (target
first) costs exactly one conjecture. With `steer_never_close` this
brackets the model: steering buys speed — between 1 and `|ord|`
conjectures — and correctness is invariant across the whole bracket. -/
theorem perfect_steering (univ : List V) (sem : H → V → Bool) (t : H)
    (R : Refuter univ sem t) {X : List V} (C : Corpus univ sem t X)
    (rest : List H) :
    steered (t :: rest) X sem R.ask = some t := by
  unfold steered
  exact List.find?_cons_of_pos _ (target_consistent univ sem t R C)

/-! ## Impossibility of closing -/

/-- The trusting learner: closes on the first accept from the intent
channel. -/
def trusting (ord : List H) (accept : H → Bool) : Option H :=
  ord.find? accept

/-- One concrete instance where a single false accept makes the trusting
learner wrong while the steered learner — same oracles, same order — is
right. Universe: one value. Hypotheses: `Bool`, `sem b _ = b`. Target:
`true` (accepts the value). The intent channel accepts everything. -/
namespace ClosingDemo

def univD : List Unit := [()]
def semD : Bool → Unit → Bool := fun b _ => b

def RD : Refuter univD semD true where
  ask := fun _ => none
  sound := fun _ v hv => nomatch hv
  complete := fun _ _ v _ _ => rfl

theorem corpusD : Corpus univD semD true [()] :=
  ⟨fun _ _ => rfl, fun v _ _ => by cases v; exact .head _⟩

/-- The trusting learner accepts the first candidate offered. -/
theorem trusting_wrong :
    trusting [false, true] (fun _ => true) = some false := rfl

/-- ... and that answer disagrees with the target. -/
theorem wrong_disagrees : ¬ AgreesOn univD semD false true := by
  intro hag
  exact Bool.noConfusion (hag () (.head _))

/-- The steered learner, on the SAME order with the SAME oracles, is
right: it scans past `false` (refuted by the corpus) and returns the
target. -/
theorem steered_right :
    steered [false, true] [()] semD RD.ask = some true := rfl

end ClosingDemo

end SSEx
