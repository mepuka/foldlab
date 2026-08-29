import Cas.Lang.Representation
import Cas.Grammar.Sorts

/-!
# Defunctionalized code points — F3, first bite (grammar ruling 4)

The Reynolds move: a straight-line store program becomes a finite table
of first-order nodes. `PLine` is one code point — a `put` whose operands
name a literal address or the i-th earlier answer POSITIONALLY (no
binders), or a `load` of such an operand. `PProg` is the table; the
designated result is the last answer.

Three faces, tied by theorems:

- `embed` is the host-level program a table denotes — a `Prog CasSig`
  that resolves `ans i` against the growing answer history and refuses
  (`failWith`) on a dangling index or an empty table;
- `runP` is the DIRECT interpreter: it walks the table over the word
  calling the SAME machinery `step` uses — `putWord` is now literally
  the reference handler's `put` clause under a local name (R10: meaning
  lives in one place, so the clause is not spelled twice), and load is
  `Word.find`, exactly `step`'s load case;
- `encodeLine`/`decodeLine` put the code points INTO the store: a line
  is a `Node` at wire tag 14 (step nodes; tag 15 is the table node) —
  the reserved registry rows another agent is landing — and `encodeProg`
  lays the table out children-first as a `Word` whose final binding is
  the tag-15 table node referencing every line. The program IS content.

## Theorem statements (the designed set)

Proved below:

- `step_put_putWord` — a corollary of `step_handle` (`Handler.lean`)
  since the handler bridge landed: `putWord` IS the reference handler's
  put clause, so the direct interpreter cannot drift from `step` on
  puts, by construction rather than by a coincidence of two bodies.
- `runPFrom_embedFrom` — the packaged induction: over any word and any
  answer history, running the embedding with fuel `p.length + 1` equals
  the direct interpreter, status AND word.
- `runP_embed_agree` — AGREEMENT (the heart, F1's pattern):
  `run H (p.length + 1) (embed p) w = runP H p w`. The fuel is exact:
  one step per line (each line is one vis node on the executed path)
  plus one closing step (the final `pure`, or the refusal vis).
- `runP_preserves_wf` — the direct interpreter preserves word
  admission (L7, inherited through the agreement).
- `runPFrom_halts` / `runP_halts` — the direct interpreter always
  reports a halted status, which is what makes it a gate.
- `ObsEq_embed_of_runP` — the word gate READ as a stratum-3 equality:
  tables whose direct runs agree at every word denote observationally
  equal programs. R5's observation and R14's `ObsEq` are one thing,
  through the R10 bridge.
- `readPIn_encodePIn`, `readPRef_encodePRef` — operand and typed-ref
  round trips over the shared byte primitives (`nat32`, `readChunk`).
  UN-PARKED 2026-08-29: rolled back on 2026-08-28 for kernel-memory
  exhaustion, restored by staging the proofs against abstract byte
  strings (see the staging note above `readPIn_zero`).
- `decodeLine_encodeLine` — the code-point round trip:
  `decodeLine (encodeLine l) = some l` for well-formed lines. UN-PARKED
  2026-08-29 by the same decomposition; this is the theorem whose
  monolithic proof caused the OOM-killed builds.
- `encodeProg_wf` — the encoded table ADMITS as a word
  (`Word.wf (encodeProg H p) = true`) for EVERY address function `H`,
  hash-lattice Level 0: line nodes carry no references and the table
  node's references resolve against the line bindings laid down first.

- `readPIn_exact`, `readPRef_exact`, `readLine_exact`, `decodeLine_exact`
  — EXACTNESS (owed item, discharged 2026-08-29): the decoder accepts
  nothing outside the encoder's image, in the style of the codec's
  `readFrame_exact`. A successful read proves its input was an encoding
  AND proves the well-formedness the forward direction demands.

- `decodeProg` / `decodeProg_encodeProg` — THE TABLE-LEVEL DECODER
  (owed item, discharged 2026-08-29): `Word → Option PProg`, reading the
  word `encodeProg` laid down back to exactly the table. Two premises,
  both triaged at the decoder's section note: `hwf` (the encodability
  condition the line round trip already carries) and `hsep` (the address
  function separates the table's lines — NECESSARY, not convenient, and
  strictly weaker than `Function.Injective H`).
- `runP_decodeProg_encodeProg`, `ObsEq_decodeProg_encodeProg` — THE
  CAPABILITY ROUND TRIP: a table stored as content and recovered from
  that content runs identically, and denotes an observationally equal
  program. The program IS content, as one theorem.

Owed (stated, not yet proved — named follow-ups, not weakened):

- registry rows for wire tags 14/15 land with the registry agent; the
  literals here mirror that reservation.
-/

namespace Cas.Lang

open Cas.Grammar (schemeVersion)

/-- Wire tag of a step (code-point) node — `REGISTRY.md` row 14
(`step`, 0x0E, RESERVED). -/
def stepWireTag : UInt8 := 14

/-- Wire tag of a table (continuation) node — `REGISTRY.md` row 15
(`cont`, 0x0F, RESERVED). -/
def contWireTag : UInt8 := 15

/-! ### The reconciliation debt, made machine-visible

Rows 14 and 15 are spelled here as bare `UInt8` defs, OUTSIDE
`Cas.Grammar.Ty`'s registry, and deliberately so: growing `Ty` is F3's
own slice (a measured five-file amplification — the inductive, the two
tag functions, the round trip, and every exhaustive match downstream),
so the rows stay reserved rather than ratified early. That leaves a
debt, and the guards below are its machine-visible half.

The first two pin the literals against `REGISTRY.md`'s rows. The second
two pin the RESERVATION itself: `Ty.ofTag` must still refuse both tags,
so the day the grammar grill ratifies rows 14/15 into `Ty`, this file's
build goes red and this is the site that has to follow. The debt cannot
be paid silently in either direction. -/

-- `REGISTRY.md` row 14 — `step`, tag 0x0E.
#guard stepWireTag == 14

-- `REGISTRY.md` row 15 — `cont`, tag 0x0F.
#guard contWireTag == 15

-- Row 14 is RESERVED, not ratified: `Ty.ofTag` refuses it. This guard
-- goes red exactly when the row enters `Ty`, and the definitions here
-- must then be replaced by the sort.
#guard (Cas.Grammar.Ty.ofTag stepWireTag).isNone

-- Row 15 is RESERVED, not ratified — same contract as row 14.
#guard (Cas.Grammar.Ty.ofTag contWireTag).isNone

/-- A positional operand: a literal address, or the i-th earlier
answer. No binders — the Reynolds defunctionalization keeps every code
point first-order. -/
inductive PIn where
  | lit (a : Addr32)
  | ans (i : Nat)
  deriving DecidableEq

/-- Operand well-formedness: an answer index fits the 32-bit wire
field. -/
def PIn.WF : PIn → Prop
  | .lit _ => True
  | .ans i => i < 4294967296

/-- One straight-line code point: admit a node whose references name
operands, or load an operand. -/
inductive PLine where
  | put (version tag : UInt8) (payload : Bytes) (refs : List (UInt8 × PIn))
  | load (src : PIn)
  deriving DecidableEq

/-- A defunctionalized program: a finite table of code points. The
designated result is the last answer. -/
abbrev PProg := List PLine

/-- Line well-formedness: byte-bound fields (matching `Node.WF`'s
bounds) and well-formed operands. -/
def PLine.WF : PLine → Prop
  | .put _ _ payload refs =>
      payload.length < 4294967296 ∧ refs.length < 4294967296 ∧
        ∀ r ∈ refs, r.2.WF
  | .load src => src.WF

/-- Resolve an operand against the answer history (absolute
indexing: `ans i` is the i-th line's answer). -/
def PIn.resolve (env : List Addr32) : PIn → Option Addr32
  | .lit a => some a
  | .ans i => env[i]?

/-- Resolve a line's operand references into typed references. -/
def resolveRefs (env : List Addr32) (refs : List (UInt8 × PIn)) :
    Option (List Ref) :=
  refs.mapM fun r => (r.2.resolve env).map (Ref.mk r.1)

/-! ## The embedding — what a table denotes -/

/-- The host-level program a table denotes, from a given answer
history: resolve each line's operands, perform the operation, extend
the history with the answered address (a load answers its source
address into the history), and finish at the last answer. A dangling
index or an empty table refuses. -/
def embedFrom (env : List Addr32) : PProg → Prog CasSig Addr32
  | [] =>
    match env.getLast? with
    | some a => .pure a
    | none => failWith "defun: empty program"
  | .put v t payload refs :: rest =>
    match resolveRefs env refs with
    | some rs =>
      .vis (.put ⟨v, t, payload, rs⟩) fun (a : Addr32) => embedFrom (env ++ [a]) rest
    | none => failWith "defun: dangling answer index"
  | .load src :: rest =>
    match src.resolve env with
    | some a => .vis (.load a) fun _ => embedFrom (env ++ [a]) rest
    | none => failWith "defun: dangling answer index"

/-- The host-level program a table denotes. -/
def embed (p : PProg) : Prog CasSig Addr32 := embedFrom [] p

/-! ## The direct interpreter — the same machinery `step` calls -/

section Interp

variable (H : Bytes → Addr32)

/-- The interpreter's put case as a function over the word — the NAME
of the reference handler's `put` clause, not a second spelling of it.
Meaning lives in exactly one place (R10, `Handler.lean`), so the
duplicated body that used to stand here retired with the bridge; what
remains is a local abbreviation for the table walker's benefit. -/
def putWord (n : Node) (w : Word) : Except Refusal (Addr32 × Word) :=
  (referenceHandler H).handle (.put n) w

/-- The bridge, now a corollary: `putWord` IS `step`'s put case,
because both are the reference handler's clause (`step_handle` at
`op = .put n`). The direct interpreter cannot drift from the
interpreter on puts — by construction rather than by coincidence. -/
theorem step_put_putWord {A} (n : Node) (k : Addr32 → Prog CasSig A)
    (w : Word) :
    step H (.vis (.put n) k) w
      = match putWord H n w with
        | .ok (a, w') => (.running (k a), w')
        | .error r => (.refused r, w) := by
  have h := step_handle H (.put n) k w
  unfold putWord
  cases hh : (referenceHandler H).handle (CasE.put n) w with
  | ok aw =>
    obtain ⟨a, w'⟩ := aw
    simp only [hh] at h ⊢
    exact h
  | error r =>
    simp only [hh] at h ⊢
    exact h

/-- The direct interpreter, answer history explicit: execute each line
over the word through `putWord` (puts) and `Word.find` (loads —
exactly `step`'s load case), threading the history. -/
def runPFrom (env : List Addr32) :
    PProg → Word → Status CasSig Addr32 × Word
  | [], w =>
    match env.getLast? with
    | some a => (.done a, w)
    | none => (.refused (.failed "defun: empty program"), w)
  | .put v t payload refs :: rest, w =>
    match resolveRefs env refs with
    | some rs =>
      match putWord H ⟨v, t, payload, rs⟩ w with
      | .ok (a, w') => runPFrom (env ++ [a]) rest w'
      | .error r => (.refused r, w)
    | none => (.refused (.failed "defun: dangling answer index"), w)
  | .load src :: rest, w =>
    match src.resolve env with
    | some a =>
      match Word.find w a with
      | some _ => runPFrom (env ++ [a]) rest w
      | none => (.refused (.noObject a), w)
    | none => (.refused (.failed "defun: dangling answer index"), w)

/-- The direct interpreter: walk the table over the word. -/
def runP (p : PProg) (w : Word) : Status CasSig Addr32 × Word :=
  runPFrom H [] p w

/-- The packaged induction behind the agreement: over ANY answer
history and ANY word, running the embedding with fuel `p.length + 1`
equals the direct interpreter — status and word. Each executed line is
one vis node (one fuel); the closing step (the final `pure` or the
refusal vis) is the `+ 1`. -/
theorem runPFrom_embedFrom (env : List Addr32) (p : PProg) :
    ∀ w : Word,
      run H (p.length + 1) (embedFrom env p) w = runPFrom H env p w := by
  induction p generalizing env with
  | nil =>
    intro w
    simp only [embedFrom, runPFrom, List.length_nil]
    cases env.getLast? with
    | some a => simp [run, step]
    | none => simp [run, step, failWith]
  | cons line rest ih =>
    intro w
    cases line with
    | put v t payload refs =>
      simp only [embedFrom, runPFrom, List.length_cons]
      cases hr : resolveRefs env refs with
      | none => simp [run, step, failWith]
      | some rs =>
        have hstep := step_put_putWord H ⟨v, t, payload, rs⟩
          (fun (a : Addr32) => embedFrom (env ++ [a]) rest) w
        cases hp : putWord H ⟨v, t, payload, rs⟩ w with
        | ok aw =>
          obtain ⟨a, w'⟩ := aw
          rw [hp] at hstep
          simp only [hp]
          calc run H (rest.length + 1 + 1)
                (.vis (.put ⟨v, t, payload, rs⟩)
                  fun (a : Addr32) => embedFrom (env ++ [a]) rest) w
              = run H (rest.length + 1) (embedFrom (env ++ [a]) rest) w' :=
                run_step_running H hstep (rest.length + 1)
            _ = runPFrom H (env ++ [a]) rest w' := ih (env ++ [a]) w'
        | error r =>
          rw [hp] at hstep
          simp [run, hstep, hp]
    | load src =>
      simp only [embedFrom, runPFrom, List.length_cons]
      cases hr : src.resolve env with
      | none => simp [run, step, failWith]
      | some a =>
        cases hf : Word.find w a with
        | some n =>
          have hstep : step H
              (.vis (.load a) fun _ => embedFrom (env ++ [a]) rest) w
              = (.running (embedFrom (env ++ [a]) rest), w) := by
            simp [step, hf]
          simp only [hf]
          calc run H (rest.length + 1 + 1)
                (.vis (.load a) fun _ => embedFrom (env ++ [a]) rest) w
              = run H (rest.length + 1) (embedFrom (env ++ [a]) rest) w :=
                run_step_running H hstep (rest.length + 1)
            _ = runPFrom H (env ++ [a]) rest w := ih (env ++ [a]) w
        | none =>
          have hstep : step H
              (.vis (.load a) fun _ => embedFrom (env ++ [a]) rest) w
              = (.refused (.noObject a), w) := by
            simp [step, hf]
          simp [run, hstep, hf]

/-- AGREEMENT (the heart of F3's first bite, F1's proof pattern): the
direct interpreter and the embedded program agree — status AND final
word — with fuel exactly the line count plus one. -/
theorem runP_embed_agree (p : PProg) (w : Word) :
    run H (p.length + 1) (embed p) w = runP H p w :=
  runPFrom_embedFrom H [] p w

/-- The direct interpreter preserves word admission — L7, inherited
through the agreement rather than re-proved. -/
theorem runP_preserves_wf (p : PProg) {w : Word}
    (hw : Word.wf w = true) : Word.wf (runP H p w).2 = true := by
  rw [← runP_embed_agree]
  exact run_preserves_wf H _ _ hw

/-- The direct interpreter always halts, from any answer history: it
walks a finite table and every clause reports `done` or `refused`. -/
theorem runPFrom_halts (env : List Addr32) (p : PProg) (w : Word) :
    (runPFrom H env p w).1.isRunning = false := by
  induction p generalizing env w with
  | nil => cases hg : env.getLast? <;> simp [runPFrom, hg, Status.isRunning]
  | cons line rest ih =>
    cases line with
    | put v t payload refs =>
      cases hr : resolveRefs env refs with
      | none => simp [runPFrom, hr, Status.isRunning]
      | some rs =>
        cases hp : putWord H ⟨v, t, payload, rs⟩ w with
        | error r => simp only [runPFrom, hr, hp]; rfl
        | ok aw =>
          obtain ⟨a, w'⟩ := aw
          simp only [runPFrom, hr, hp]
          exact ih _ _
    | load src =>
      cases hs : src.resolve env with
      | none => simp [runPFrom, hs, Status.isRunning]
      | some a =>
        cases hf : Word.find w a with
        | none => simp only [runPFrom, hs, hf]; rfl
        | some n =>
          simp only [runPFrom, hs, hf]
          exact ih _ _

/-- `runP` reports a HALTED status, always — which is what makes it a
gate rather than an approximation. -/
theorem runP_halts (p : PProg) (w : Word) :
    (runP H p w).1.isRunning = false := runPFrom_halts H [] p w

/-- THE WORD GATE, as a stratum-3 equality: two tables whose DIRECT
runs agree at every starting word denote observationally equal
programs. `runP` is what the emitter's gate executes, at the exact fuel
`p.length + 1`; `ObsEq` is R14's stratum-3 equation over `interpretRef`.
This corollary — the bridge (`run_interpretRef_agree`) applied through
`runP_embed_agree` — is what makes R5's word observation and that
equation ONE thing rather than two claims that resemble each other.

Note what the hypothesis compares and the conclusion does not: `runP`
agreement includes the refusal WORD, `ObsEq` does not carry it. The
gate therefore decides `ObsEq` by checking something strictly finer;
the implication runs only in this direction, and `ObsEq.run_refused`
(`Representation.lean`) is the exact statement of the shortfall. -/
theorem ObsEq_embed_of_runP {p q : PProg}
    (h : ∀ w : Word, runP H p w = runP H q w) :
    ObsEq H (embed p) (embed q) :=
  ObsEq.of_run H fun w =>
    ⟨p.length + 1, q.length + 1,
      by rw [runP_embed_agree, runP_embed_agree, h w],
      by rw [runP_embed_agree]; exact runP_halts H p w⟩

end Interp

/-! ## Content encoding — the program as store nodes -/

/-- Encode an operand: `0x00` then the 32 address bytes, or `0x01`
then the index as `nat32`. -/
def encodePIn : PIn → Bytes
  | .lit a => 0 :: a.val
  | .ans i => 1 :: nat32 i

/-- Read one operand. -/
def readPIn : Bytes → Option (PIn × Bytes)
  | [] => none
  | b :: rest =>
    if b = 0 then
      match readChunk 32 rest with
      | some (c, rest') =>
        if h : c.length = 32 then some (.lit ⟨c, h⟩, rest') else none
      | none => none
    else if b = 1 then
      match readNat32 rest with
      | some (i, rest') => some (.ans i, rest')
      | none => none
    else none

/-! ### The operand round trip, staged

The 2026-08-28 rollback died of ONE cause, and `NodeCodec.lean` had
already measured it: "two-stage proofs check instantly; three-stage
exhausts the kernel". The parked proofs rewrote the byte primitives
straight into the CONCRETE encoding term under a nested `match` motive,
so every stage multiplied the motive the kernel re-checked.

The cure is the same one the node codec uses: each `match` scrutinee is
discharged against an ABSTRACT byte string in its own lemma, and the
concrete encoding meets the reader only at the final `exact`. The
motives stay one stage wide and the kernel never sees the composition. -/

/-- The reader's literal-address arm, at an abstract tail. -/
theorem readPIn_zero (r : Bytes) :
    readPIn (0 :: r) =
      match readChunk 32 r with
      | some (c, rest') =>
        if h : c.length = 32 then some (PIn.lit ⟨c, h⟩, rest') else none
      | none => none := rfl

/-- The reader's answer-index arm, at an abstract tail. -/
theorem readPIn_one (r : Bytes) :
    readPIn (1 :: r) =
      match readNat32 r with
      | some (i, rest') => some (PIn.ans i, rest')
      | none => none := rfl

/-- OPERAND ROUND TRIP (un-parked): the operand reader recovers a
well-formed operand and consumes exactly its encoding. -/
theorem readPIn_encodePIn (x : PIn) (h : x.WF) (rest : Bytes) :
    readPIn (encodePIn x ++ rest) = some (x, rest) := by
  cases x with
  | lit a =>
    show readPIn (0 :: (a.val ++ rest)) = _
    rw [readPIn_zero, readChunk_append rest a.property]
    dsimp only
    rw [dif_pos a.property]
  | ans i =>
    show readPIn (1 :: (nat32 i ++ rest)) = _
    rw [readPIn_one, readNat32_nat32 i h rest]

/-- Encode one typed operand reference: the expected kind tag byte,
then the operand. -/
def encodePRef (r : UInt8 × PIn) : Bytes := r.1 :: encodePIn r.2

/-- Read one typed operand reference. -/
def readPRef : Bytes → Option ((UInt8 × PIn) × Bytes)
  | [] => none
  | t :: rest =>
    match readPIn rest with
    | some (i, rest') => some ((t, i), rest')
    | none => none

/-- TYPED-REF ROUND TRIP (un-parked): the kind tag passes through and the
operand round trip carries the rest. -/
theorem readPRef_encodePRef (r : UInt8 × PIn) (h : r.2.WF) (rest : Bytes) :
    readPRef (encodePRef r ++ rest) = some (r, rest) := by
  obtain ⟨t, i⟩ := r
  show readPRef (t :: (encodePIn i ++ rest)) = _
  rw [show readPRef (t :: (encodePIn i ++ rest))
      = match readPIn (encodePIn i ++ rest) with
        | some (x, rest') => some ((t, x), rest')
        | none => none from rfl,
    readPIn_encodePIn i h rest]

/-- `readN` under a membership-relative round trip: the counted-
sequence reader recovers a list whose ELEMENTS satisfy the reader's
premise. The codec's `readN_encode` quantifies its hypothesis over all
values; the encoding here round-trips only on well-formed operands, so
the induction is repackaged with the premise carried by membership.
Its consumer is the rolled-back round trips parked at
`.staging/parser-experiments/defun-held-proofs.lean.txt`; it stays so
their return does not re-prove it. -/
theorem readN_encode_of {α : Type} {p : Bytes → Option (α × Bytes)}
    {e : α → Bytes} {P : α → Prop}
    (hp : ∀ a, P a → ∀ rest, p (e a ++ rest) = some (a, rest)) :
    ∀ (xs : List α), (∀ a ∈ xs, P a) → ∀ rest : Bytes,
      readN p xs.length ((xs.map e).flatten ++ rest) = some (xs, rest) := by
  intro xs
  induction xs with
  | nil => intro _ rest; simp [readN]
  | cons a t ih =>
    intro hP rest
    have h1 := hp a (hP a List.mem_cons_self) ((t.map e).flatten ++ rest)
    have h2 := ih (fun b hb => hP b (List.mem_cons_of_mem a hb)) rest
    simp only [List.length_cons, List.map_cons, List.flatten_cons,
      List.append_assoc, readN, h1, h2]

/-- Encode a line's body: `0x00`, version, tag, framed payload, ref
count as `nat32`, then the typed operand references — all through the
shared byte primitives; or `0x01` then the operand for a load. -/
def encodeLineBody : PLine → Bytes
  | .put v t payload refs =>
      0 :: v :: t ::
        (frame payload ++
          (nat32 refs.length ++ (refs.map encodePRef).flatten))
  | .load src => 1 :: encodePIn src

/-- Read one line body, consuming the whole byte string. -/
def readLine : Bytes → Option PLine
  | [] => none
  | b :: rest =>
    if b = 0 then
      match rest with
      | v :: t :: body =>
        match readFrame body with
        | some (payload, r1) =>
          match readNat32 r1 with
          | some (cnt, r2) =>
            match readN readPRef cnt r2 with
            | some (refs, []) => some (.put v t payload refs)
            | _ => none
          | none => none
        | none => none
      | _ => none
    else if b = 1 then
      match readPIn rest with
      | some (src, []) => some (.load src)
      | _ => none
    else none

/-- A code point as a store node: wire tag 14, the line body as
payload, no references — the opaque-payload discipline of the v0 step
sort (operand references live in the payload because they name
ANSWERS, which have no address until the table runs). -/
def encodeLine (l : PLine) : Node :=
  ⟨schemeVersion, stepWireTag, encodeLineBody l, []⟩

/-- Decode a step node back to its code point. -/
def decodeLine (n : Node) : Option PLine :=
  if n.tag = stepWireTag then readLine n.payload else none

/-! ### The code-point round trip, staged

This is the theorem whose monolithic proof exhausted kernel memory on
2026-08-28. `readLine`'s put arm is a FOUR-stage nested match (frame,
count, counted refs, trailing-empty), and the parked proof drove all
four stages simultaneously through the concrete encoding term in one
`simp only`. Per `NodeCodec.lean`'s measured determination that is the
shape that does not check.

The two lemmas below are the decomposition: each takes its stage
scrutinees as HYPOTHESES over abstract byte strings, so the match
motives are one stage wide and mention no encoding at all. The concrete
encoding is supplied once, at the call site, as three already-proved
byte-primitive facts. -/

/-- The line reader's put arm, driven by its three stage results over an
abstract body. -/
theorem readLine_put_of (v t : UInt8) {body payload r1 r2 : Bytes}
    {cnt : Nat} {refs : List (UInt8 × PIn)}
    (h1 : readFrame body = some (payload, r1))
    (h2 : readNat32 r1 = some (cnt, r2))
    (h3 : readN readPRef cnt r2 = some (refs, [])) :
    readLine (0 :: v :: t :: body) = some (.put v t payload refs) := by
  rw [show readLine (0 :: v :: t :: body)
      = match readFrame body with
        | some (payload, r1) =>
          match readNat32 r1 with
          | some (cnt, r2) =>
            match readN readPRef cnt r2 with
            | some (refs, []) => some (PLine.put v t payload refs)
            | _ => none
          | none => none
        | none => none from rfl, h1]
  dsimp only
  rw [h2]
  dsimp only
  rw [h3]

/-- The line reader's load arm, driven by its one stage result over an
abstract body. -/
theorem readLine_load_of {r : Bytes} {src : PIn}
    (h : readPIn r = some (src, [])) :
    readLine (1 :: r) = some (.load src) := by
  rw [show readLine (1 :: r)
      = match readPIn r with
        | some (src, []) => some (PLine.load src)
        | _ => none from rfl, h]

/-- CODE-POINT ROUND TRIP (un-parked): a well-formed line, encoded as a
step node, decodes back to itself. -/
theorem decodeLine_encodeLine (l : PLine) (h : l.WF) :
    decodeLine (encodeLine l) = some l := by
  rw [show decodeLine (encodeLine l) = readLine (encodeLineBody l) from
    if_pos rfl]
  cases l with
  | put v t payload refs =>
    obtain ⟨hpay, hcnt, hrefs⟩ := h
    have h3 : readN readPRef refs.length ((refs.map encodePRef).flatten)
        = some (refs, []) := by
      have := readN_encode_of
        (fun a ha rest => readPRef_encodePRef a ha rest) refs hrefs []
      simpa using this
    exact readLine_put_of v t
      (readFrame_frame payload hpay _)
      (readNat32_nat32 refs.length hcnt _) h3
  | load src =>
    have h1 : readPIn (encodePIn src) = some (src, []) := by
      have := readPIn_encodePIn src h []
      simpa using this
    exact readLine_load_of h1

/-! ### Exactness — the decoder accepts nothing outside the image

The second direction, in the style of the codec's `readFrame_exact` and
`parseNode_exact`: a successful read PROVES its input was an encoding,
and proves the well-formedness the forward direction demands. Together
with the round trips above this is what "one byte representation per
code point" means for the step sort.

`readN_exact_of` is the exactness dual of `readN_encode_of` and is
carried for the same reason: the codec's `readN_exact` recovers the
splitting but drops the per-element property, and a line's admission
condition quantifies over its operand references. -/

/-- `readN` under a membership-relative exactness: the counted reader
recovers the splitting, the count, AND the reader's per-element
property. The dual of `readN_encode_of`. -/
theorem readN_exact_of {α : Type} {p : Bytes → Option (α × Bytes)}
    {e : α → Bytes} {P : α → Prop}
    (hp : ∀ b a rest, p b = some (a, rest) → b = e a ++ rest ∧ P a) :
    ∀ (n : Nat) (b : Bytes) (as : List α) (rest : Bytes),
      readN p n b = some (as, rest) →
      b = (as.map e).flatten ++ rest ∧ as.length = n ∧ ∀ a ∈ as, P a := by
  intro n
  induction n with
  | zero =>
    intro b as rest h
    simp only [readN, Option.some.injEq, Prod.mk.injEq] at h
    obtain ⟨has, hrest⟩ := h
    subst has; subst hrest
    simp
  | succ k ih =>
    intro b as rest h
    unfold readN at h
    split at h
    next a b' hpb =>
      split at h
      next as' b'' hrn =>
        simp only [Option.some.injEq, Prod.mk.injEq] at h
        obtain ⟨has, hrest⟩ := h
        obtain ⟨hb', hlen, hall⟩ := ih b' as' b'' hrn
        obtain ⟨hb, hPa⟩ := hp b a b' hpb
        subst has; subst hrest
        refine ⟨by rw [hb, hb']; simp [List.append_assoc], by simp [hlen], ?_⟩
        intro x hx
        rcases List.mem_cons.mp hx with rfl | hx
        · exact hPa
        · exact hall x hx
      next => simp at h
    next => simp at h

/-- Operand exactness: a successful operand read proves its input was an
operand encoding, and proves the operand well-formed. -/
theorem readPIn_exact {b : Bytes} {x : PIn} {rest : Bytes}
    (h : readPIn b = some (x, rest)) : b = encodePIn x ++ rest ∧ x.WF := by
  match b with
  | [] => simp [readPIn] at h
  | c :: r =>
    by_cases h0 : c = 0
    · subst h0
      rw [readPIn_zero] at h
      split at h
      next cc rr hc =>
        split at h
        next hlen =>
          simp only [Option.some.injEq, Prod.mk.injEq] at h
          obtain ⟨hx, hrest⟩ := h
          subst hx; subst hrest
          exact ⟨by rw [(readChunk_exact hc).1]; rfl, trivial⟩
        next => simp at h
      next => simp at h
    · by_cases h1 : c = 1
      · subst h1
        rw [readPIn_one] at h
        split at h
        next i rr hi =>
          simp only [Option.some.injEq, Prod.mk.injEq] at h
          obtain ⟨hx, hrest⟩ := h
          subst hx; subst hrest
          obtain ⟨hb, hlt⟩ := readNat32_some _ _ _ hi
          exact ⟨by rw [hb]; rfl, hlt⟩
        next => simp at h
      · rw [show readPIn (c :: r) = none from by
          simp only [readPIn, if_neg h0, if_neg h1]] at h
        simp at h

/-- Typed-reference exactness. -/
theorem readPRef_exact {b : Bytes} {r : UInt8 × PIn} {rest : Bytes}
    (h : readPRef b = some (r, rest)) :
    b = encodePRef r ++ rest ∧ r.2.WF := by
  match b with
  | [] => simp [readPRef] at h
  | t :: rr =>
    rw [show readPRef (t :: rr)
        = match readPIn rr with
          | some (x, rest') => some ((t, x), rest')
          | none => none from rfl] at h
    split at h
    next x rest' hx =>
      simp only [Option.some.injEq, Prod.mk.injEq] at h
      obtain ⟨hr, hrest⟩ := h
      subst hr; subst hrest
      obtain ⟨hb, hwf⟩ := readPIn_exact hx
      exact ⟨by rw [hb]; rfl, hwf⟩
    next => simp at h

/-- READLINE EXACTNESS (owed item, discharged): a successful line read
proves its input was a line encoding, and proves the line well-formed.
The decoder's image is exactly the encoder's. -/
theorem readLine_exact {b : Bytes} {l : PLine} (h : readLine b = some l) :
    b = encodeLineBody l ∧ l.WF := by
  match b with
  | [] => simp [readLine] at h
  | c :: r =>
    by_cases h0 : c = 0
    · subst h0
      match r with
      | [] => simp [readLine] at h
      | [_] => simp [readLine] at h
      | v :: t :: body =>
        rw [show readLine (0 :: v :: t :: body)
            = match readFrame body with
              | some (payload, r1) =>
                match readNat32 r1 with
                | some (cnt, r2) =>
                  match readN readPRef cnt r2 with
                  | some (refs, []) => some (PLine.put v t payload refs)
                  | _ => none
                | none => none
              | none => none from rfl] at h
        split at h
        next payload r1 hf =>
          split at h
          next cnt r2 hn =>
            split at h
            next refs hrn =>
              simp only [Option.some.injEq] at h
              subst h
              obtain ⟨hb1, hplen⟩ := readFrame_exact hf
              obtain ⟨hb2, hclt⟩ := readNat32_some _ _ _ hn
              obtain ⟨hb3, hlen, hall⟩ :=
                readN_exact_of (fun _b _a _rest hh => readPRef_exact hh)
                  cnt r2 refs [] hrn
              subst hlen
              refine ⟨?_, ?_, ?_, hall⟩
              · rw [hb1, hb2, hb3]
                simp [encodeLineBody]
              · exact hplen
              · omega
            next => simp at h
          next => simp at h
        next => simp at h
    · by_cases h1 : c = 1
      · subst h1
        rw [show readLine (1 :: r)
            = match readPIn r with
              | some (src, []) => some (PLine.load src)
              | _ => none from rfl] at h
        split at h
        next src hs =>
          simp only [Option.some.injEq] at h
          subst h
          obtain ⟨hb, hwf⟩ := readPIn_exact hs
          exact ⟨by rw [hb]; simp [encodeLineBody], hwf⟩
        next => simp at h
      · rw [show readLine (c :: r) = none from by
          simp only [readLine, if_neg h0, if_neg h1]] at h
        simp at h

/-- Step-node exactness, lifted to the node: `decodeLine` accepts only
step nodes carrying a line encoding. -/
theorem decodeLine_exact {n : Node} {l : PLine} (h : decodeLine n = some l) :
    n.tag = stepWireTag ∧ n.payload = encodeLineBody l ∧ l.WF := by
  unfold decodeLine at h
  split at h
  next ht => exact ⟨ht, (readLine_exact h).1, (readLine_exact h).2⟩
  next => simp at h

/-! ## The table as a word — the program IS content -/

/-- The content address of a line's step node under `H`. -/
def lineAddr (H : Bytes → Addr32) (l : PLine) : Addr32 :=
  H (encodeNode (encodeLine l))

/-- The table node: wire tag 15, the line count as payload, one typed
reference per line to its step node, in program order. -/
def tableNode (H : Bytes → Addr32) (p : PProg) : Node :=
  ⟨schemeVersion, contWireTag, nat32 p.length,
    p.map fun l => ⟨stepWireTag, lineAddr H l⟩⟩

/-- The table laid out children-first as a word: every step node, then
the table node referencing them all. -/
def encodeProg (H : Bytes → Addr32) (p : PProg) : Word :=
  (p.map fun l => Binding.mk (lineAddr H l) (encodeLine l))
    ++ [Binding.mk (H (encodeNode (tableNode H p))) (tableNode H p)]

/-- A word of reference-free bindings passes the admission scan from
any prefix. -/
theorem wfFrom_of_refs_nil :
    ∀ (w prior : Word), (∀ b ∈ w, b.node.refs = []) →
      Word.wfFrom prior w = true := by
  intro w
  induction w with
  | nil => intro prior _; rfl
  | cons b rest ih =>
    intro prior h
    obtain ⟨a, n⟩ := b
    have hn : n.refs = [] := h _ List.mem_cons_self
    simp only [Word.wfFrom, hn, List.all_nil, Bool.true_and]
    exact ih _ fun x hx => h x (List.mem_cons_of_mem _ hx)

/-- The encoded table ADMITS as a word, for EVERY address function —
hash-lattice Level 0, no injectivity anywhere: step nodes carry no
references, and each table reference resolves against the step
bindings laid down first (whatever binding `find` answers, it is a
step binding, so it carries tag 14). -/
theorem encodeProg_wf (H : Bytes → Addr32) (p : PProg) :
    Word.wf (encodeProg H p) = true := by
  have hlines : Word.wf
      (p.map fun l => Binding.mk (lineAddr H l) (encodeLine l)) = true := by
    refine wfFrom_of_refs_nil _ [] fun b hb => ?_
    obtain ⟨l, _, rfl⟩ := List.mem_map.mp hb
    rfl
  refine Word.wf_snoc hlines ?_
  intro r hr
  obtain ⟨l, hl, rfl⟩ := List.mem_map.mp hr
  have hmem : Binding.mk (lineAddr H l) (encodeLine l)
      ∈ p.map fun l => Binding.mk (lineAddr H l) (encodeLine l) :=
    List.mem_map.mpr ⟨l, hl, rfl⟩
  have hsome := Word.find_isSome_of_mem hmem
  cases hf : Word.find
      (p.map fun l => Binding.mk (lineAddr H l) (encodeLine l))
      (lineAddr H l) with
  | none => rw [hf] at hsome; simp at hsome
  | some m =>
    have hm := Word.find_mem hf
    obtain ⟨l', _, heq⟩ := List.mem_map.mp hm
    have htag : m.tag = stepWireTag := by
      have hnode := congrArg Binding.node heq
      simp only at hnode
      rw [← hnode]
      rfl
    exact Word.resolvesIn_iff.mpr ⟨m, hf, htag⟩

/-! ## The table-level decoder — the program recovered from content

The missing direction of the applicative capability. `encodeProg` lays a
table down as a word; `decodeProg` reads one back. The word's LAST
binding is the table node (that is how `encodeProg` builds it), its
references name the step nodes in program order, and each one resolves
through `Word.find` and decodes through `decodeLine`.

### The premise, triaged

`encodeProg_wf` needs no premise on `H` at all — admission is Level 0.
RECOVERY is not, and the reason is worth stating plainly rather than
importing `Function.Injective H` out of habit:

    hsep : ∀ l ∈ p, ∀ l' ∈ p, lineAddr H l = lineAddr H l' → l = l'

— the address function SEPARATES the table's lines. This premise is not
a convenience of the proof; it is NECESSARY. If two distinct lines of
`p` share an address, `encodeProg` lays down two bindings at that one
address, both of the table node's references name it, and `Word.find`
answers the FIRST for both — so the recovered table repeats one line
where `p` had two, and cannot equal `p`. The store has genuinely lost
the distinction: deduplication is content-addressing working as
designed, and no decoder can undo it.

It is stated at the table's lines rather than as `Function.Injective H`
deliberately, per CAS-003: it is strictly weaker (it constrains `H` only
on the finitely many preimages this table actually lays down, and is
vacuous for tables of fewer than two lines), and it is exactly where the
obligation bites. `Function.Injective H` discharges it, but nothing here
needs the full strength.

`hwf : ∀ l ∈ p, l.WF` is the other premise, and it is the same admission
condition `decodeLine_encodeLine` already carries — a line whose fields
overflow their wire scalars was never encodable. -/

/-- Recover a table from a word: the last binding must be a table node,
and each of its references must resolve to a decodable step node. -/
def decodeProg (w : Word) : Option PProg :=
  match w.getLast? with
  | some b =>
    if b.node.tag = contWireTag then
      b.node.refs.mapM fun r => (Word.find w r.addr).bind decodeLine
    else none
  | none => none

/-- Under separation, each line's binding is what `find` answers at that
line's address within the step-node prefix. -/
theorem find_lineAddr (H : Bytes → Addr32) :
    ∀ p : PProg,
      (∀ l ∈ p, ∀ l' ∈ p, lineAddr H l = lineAddr H l' → l = l') →
      ∀ l ∈ p,
        Word.find (p.map fun l => Binding.mk (lineAddr H l) (encodeLine l))
          (lineAddr H l) = some (encodeLine l) := by
  intro p
  induction p with
  | nil => intro _ l hl; simp at hl
  | cons a rest ih =>
    intro hsep l hl
    by_cases hae : lineAddr H l = lineAddr H a
    · have hla : l = a := hsep l hl a List.mem_cons_self hae
      subst hla
      simp [Word.find]
    · have hlr : l ∈ rest := by
        rcases List.mem_cons.mp hl with rfl | hm
        · exact absurd rfl hae
        · exact hm
      simp only [List.map_cons, Word.find, if_neg hae]
      exact ih (fun x hx y hy =>
        hsep x (List.mem_cons_of_mem a hx) y (List.mem_cons_of_mem a hy)) l hlr

/-- The same lookup inside the whole encoded word: the step bindings come
first, so the table binding appended after them cannot shadow one. -/
theorem find_encodeProg (H : Bytes → Addr32) (p : PProg)
    (hsep : ∀ l ∈ p, ∀ l' ∈ p, lineAddr H l = lineAddr H l' → l = l') :
    ∀ l ∈ p,
      Word.find (encodeProg H p) (lineAddr H l) = some (encodeLine l) :=
  fun l hl => Word.find_append_of_some _ (find_lineAddr H p hsep l hl)

/-- The table node's reference list, read elementwise, is the table. -/
theorem mapM_lineRefs (H : Bytes → Addr32) (f : Ref → Option PLine) :
    ∀ p : PProg, (∀ l ∈ p, f ⟨stepWireTag, lineAddr H l⟩ = some l) →
      (p.map fun l => (⟨stepWireTag, lineAddr H l⟩ : Ref)).mapM f = some p := by
  intro p
  induction p with
  | nil => intro _; rfl
  | cons a rest ih =>
    intro h
    simp only [List.map_cons, List.mapM_cons, h a List.mem_cons_self,
      ih (fun x hx => h x (List.mem_cons_of_mem a hx))]
    rfl

/-- THE PROGRAM IS RECOVERABLE FROM CONTENT (owed item, discharged): the
word `encodeProg` lays down reads back to exactly the table it encoded.
Both premises are triaged in the section note above — `hwf` is the
encodability condition `decodeLine_encodeLine` already carries, and
`hsep` is NECESSARY, not convenient. -/
theorem decodeProg_encodeProg (H : Bytes → Addr32) (p : PProg)
    (hwf : ∀ l ∈ p, l.WF)
    (hsep : ∀ l ∈ p, ∀ l' ∈ p, lineAddr H l = lineAddr H l' → l = l') :
    decodeProg (encodeProg H p) = some p := by
  have hlast : (encodeProg H p).getLast?
      = some (Binding.mk (H (encodeNode (tableNode H p))) (tableNode H p)) :=
    List.getLast?_concat
  rw [show decodeProg (encodeProg H p)
      = (if (tableNode H p).tag = contWireTag then
          (tableNode H p).refs.mapM fun r =>
            (Word.find (encodeProg H p) r.addr).bind decodeLine
        else none) from by rw [decodeProg, hlast],
    if_pos (show (tableNode H p).tag = contWireTag from rfl)]
  exact mapM_lineRefs H _ p fun l hl => by
    rw [find_encodeProg H p hsep l hl, Option.bind_some,
      decodeLine_encodeLine l (hwf l hl)]

/-! ## The capability round trip — a stored program runs identically

The sentence the product vision speaks, as one theorem: a table put into
the store and recovered from it is the same program, so it computes the
same thing. `decodeProg_encodeProg` composed with the direct
interpreter — cheap, because the recovery is an EQUALITY of tables, not
a simulation between them. -/

/-- THE CAPABILITY ROUND TRIP: a table stored as content and recovered
from that content runs identically — same status, same final word, at
every starting word. -/
theorem runP_decodeProg_encodeProg (H : Bytes → Addr32) (p : PProg)
    (hwf : ∀ l ∈ p, l.WF)
    (hsep : ∀ l ∈ p, ∀ l' ∈ p, lineAddr H l = lineAddr H l' → l = l')
    {q : PProg} (hq : decodeProg (encodeProg H p) = some q) (w : Word) :
    runP H q w = runP H p w := by
  rw [decodeProg_encodeProg H p hwf hsep] at hq
  exact congrArg (fun r => runP H r w) (Option.some.inj hq).symm

/-- The same statement at stratum 3: a stored-and-recovered table denotes
an OBSERVATIONALLY EQUAL program. R14's equation, reached through the
word gate — the program is content, and the content is the program. -/
theorem ObsEq_decodeProg_encodeProg (H : Bytes → Addr32) (p : PProg)
    (hwf : ∀ l ∈ p, l.WF)
    (hsep : ∀ l ∈ p, ∀ l' ∈ p, lineAddr H l = lineAddr H l' → l = l')
    {q : PProg} (hq : decodeProg (encodeProg H p) = some q) :
    ObsEq H (embed q) (embed p) :=
  ObsEq_embed_of_runP H fun w =>
    runP_decodeProg_encodeProg H p hwf hsep hq w

end Cas.Lang
