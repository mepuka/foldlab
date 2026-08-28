import Cas.Lang.Interp
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
  calling the SAME machinery `step` uses — `putWord` is the
  interpreter's put case as a function (it calls `Cas.put`, the proved
  judgment; admission is never re-derived), and load is `Word.find`,
  exactly `step`'s load case;
- `encodeLine`/`decodeLine` put the code points INTO the store: a line
  is a `Node` at wire tag 14 (step nodes; tag 15 is the table node) —
  the reserved registry rows another agent is landing — and `encodeProg`
  lays the table out children-first as a `Word` whose final binding is
  the tag-15 table node referencing every line. The program IS content.

## Theorem statements (the designed set)

Proved below:

- `step_put_putWord` — the bridge: `putWord` is definitionally the
  interpreter's put case, so the direct interpreter cannot drift from
  `step` on puts.
- `runPFrom_embedFrom` — the packaged induction: over any word and any
  answer history, running the embedding with fuel `p.length + 1` equals
  the direct interpreter, status AND word.
- `runP_embed_agree` — AGREEMENT (the heart, F1's pattern):
  `run H (p.length + 1) (embed p) w = runP H p w`. The fuel is exact:
  one step per line (each line is one vis node on the executed path)
  plus one closing step (the final `pure`, or the refusal vis).
- `runP_preserves_wf` — the direct interpreter preserves word
  admission (L7, inherited through the agreement).
- `readPIn_encodePIn`, `readPRef_encodePRef` — operand and typed-ref
  round trips over the shared byte primitives (`nat32`, `readChunk`).
- `decodeLine_encodeLine` — the code-point round trip:
  `decodeLine (encodeLine l) = some l` for well-formed lines.
- `encodeProg_wf` — the encoded table ADMITS as a word
  (`Word.wf (encodeProg H p) = true`) for EVERY address function `H`,
  hash-lattice Level 0: line nodes carry no references and the table
  node's references resolve against the line bindings laid down first.

Owed (stated, not yet proved — named follow-ups, not weakened):

- exactness of `readLine` (the decoder accepts nothing outside the
  encoder's image), in the style of the codec's `readFrame_exact`;
- the table-level decoder `Word → Option PProg` with its round trip
  against `encodeProg` (recovering the program from content);
- registry rows for wire tags 14/15 land with the registry agent; the
  literals here mirror that reservation.
-/

namespace Cas.Lang

open Cas.Grammar (schemeVersion)

/-- Wire tag of a step (code-point) node — reserved registry row 14. -/
def stepWireTag : UInt8 := 14

/-- Wire tag of a table (continuation) node — reserved registry row 15. -/
def contWireTag : UInt8 := 15

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
      .vis (.put ⟨v, t, payload, rs⟩) fun a => embedFrom (env ++ [a]) rest
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

/-- The interpreter's put case, as a function over the word: the
decidable well-formedness gate, then `Cas.put` — the proved judgment —
with its outcomes mapped onto the word exactly as `step` maps them.
Admission is called, never re-derived. -/
def putWord (n : Node) (w : Word) : Except Refusal (Addr32 × Word) :=
  if h : n.WF then
    match _root_.Cas.put H (Word.toStore w) ⟨n, h⟩ with
    | .error e => .error (.ofAdmission e)
    | .ok (.fresh a _) => .ok (a, w ++ [Binding.mk a n])
    | .ok (.duplicate a) => .ok (a, w)
    | .ok (.conflict a _) => .error (.collision a)
  else .error .notWellFormed

/-- The bridge: `putWord` IS `step`'s put case — same gate, same
judgment, same outcome map. The direct interpreter cannot drift from
the interpreter on puts. -/
theorem step_put_putWord {A} (n : Node) (k : Addr32 → Prog CasSig A)
    (w : Word) :
    step H (.vis (.put n) k) w
      = match putWord H n w with
        | .ok (a, w') => (.running (k a), w')
        | .error r => (.refused r, w) := by
  unfold putWord
  by_cases h : n.WF
  · simp only [dif_pos h]
    cases hp : _root_.Cas.put H (Word.toStore w) ⟨n, h⟩ with
    | error e => simp [step, dif_pos h, hp]
    | ok o => cases o <;> simp [step, dif_pos h, hp]
  · simp [step, dif_neg h]

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
          (fun a => embedFrom (env ++ [a]) rest) w
        cases hp : putWord H ⟨v, t, payload, rs⟩ w with
        | ok aw =>
          obtain ⟨a, w'⟩ := aw
          rw [hp] at hstep
          calc run H (rest.length + 1 + 1)
                (.vis (.put ⟨v, t, payload, rs⟩)
                  fun a => embedFrom (env ++ [a]) rest) w
              = run H (rest.length + 1) (embedFrom (env ++ [a]) rest) w' :=
                run_step_running H hstep (rest.length + 1)
            _ = runPFrom H (env ++ [a]) rest w' := ih (env ++ [a]) w'
        | error r =>
          rw [hp] at hstep
          simp [run, hstep]
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
          simp [run, hstep]

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

theorem readPIn_encodePIn (x : PIn) (h : x.WF) (rest : Bytes) :
    readPIn (encodePIn x ++ rest) = some (x, rest) := by
  cases x with
  | lit a =>
    simp only [encodePIn, List.cons_append, readPIn, if_pos rfl,
      readChunk_append rest a.prop, dif_pos a.prop]
  | ans i =>
    simp only [encodePIn, List.cons_append, readPIn,
      if_neg (by decide : (1 : UInt8) ≠ 0), if_pos rfl,
      readNat32_nat32 i h rest]

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

theorem readPRef_encodePRef (r : UInt8 × PIn) (h : r.2.WF)
    (rest : Bytes) : readPRef (encodePRef r ++ rest) = some (r, rest) := by
  obtain ⟨t, i⟩ := r
  simp only [encodePRef, List.cons_append, readPRef,
    readPIn_encodePIn i h rest]

/-- `readN` under a membership-relative round trip: the counted-
sequence reader recovers a list whose ELEMENTS satisfy the reader's
premise. The codec's `readN_encode` quantifies its hypothesis over all
values; the encoding here round-trips only on well-formed operands, so
the induction is repackaged with the premise carried by membership. -/
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

/-- The code-point round trip: decoding an encoded well-formed line
recovers it exactly. -/
theorem decodeLine_encodeLine (l : PLine) (h : l.WF) :
    decodeLine (encodeLine l) = some l := by
  cases l with
  | put v t payload refs =>
    obtain ⟨hpay, _, hrefs⟩ := h
    have hN : readN readPRef refs.length ((refs.map encodePRef).flatten)
        = some (refs, []) := by
      have := readN_encode_of readPRef_encodePRef refs hrefs []
      simpa using this
    simp only [decodeLine, encodeLine, encodeLineBody, readLine,
      readFrame_frame payload hpay,
      readNat32_nat32 refs.length (by omega) _, hN]
    simp
  | load src =>
    have hsrc : readPIn (encodePIn src) = some (src, []) := by
      have := readPIn_encodePIn src h []
      simpa using this
    simp only [decodeLine, encodeLine, encodeLineBody, readLine,
      if_neg (by decide : (1 : UInt8) ≠ 0), hsrc]
    simp

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

end Cas.Lang
