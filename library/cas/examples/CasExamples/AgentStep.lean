import Cas

/-!
# The agent step — a program of the language

The agent step is NOT a primitive — it is a program: load the history,
refuse a non-entry, fold the context with `foldlM` (reduction free from
the monad), `infer` against the folded prompt, and admit exactly three
nodes — context, output, entry. The inference answer enters only as
recorded content; admission is the only gate; the attestation is the
executor's claim, never a proof.

Content is seeded through the grammar (`journal%`/`save%`), flattened
to a word under the production digest, and every check below runs at
build time through the interpreter: the seeded word admits, the step
appends exactly three bindings and preserves admission, a dangling
history refuses before anything is admitted, and a wrong-kind history
refuses at the guard.
-/

namespace CasExamples.AgentStep

open Cas Cas.Lang Cas.Grammar

def textOf (bs : Bytes) : String :=
  (String.fromUTF8? (ByteArray.mk bs.toArray)).getD s!"<{bs.length}B binary>"

/-- An opaque value node. -/
def valueNode (payload : Bytes) : Node :=
  ⟨schemeVersion, Ty.value.wireTag, payload, []⟩

/-- A context node: no payload, one typed edge per folded item. -/
def contextNode (refs : List Ref) : Node :=
  ⟨schemeVersion, Ty.context.wireTag, [], refs⟩

/-- A journal entry: the attestation note and its three typed edges. -/
def entryNode (note : Bytes) (refs : List Ref) : Node :=
  ⟨schemeVersion, Ty.entry.wireTag, note, refs⟩

/-- One agent step, as a program of the agent language. -/
def agentStep (history : Addr32) (contextIds : List Addr32)
    (attestation : Bytes) : Prog AgentSig Addr32 := do
  let prev ← liftCas (load history)
  liftCas (require (prev.tag == Ty.entry.wireTag) "history is not an entry")
  let links ← liftCas <| contextIds.foldlM (init := []) fun acc a => do
    let o ← load a
    pure (acc ++ [Ref.mk o.tag a])
  let ctx ← liftCas (put (contextNode links))
  let prompt ← liftCas <| contextIds.foldlM (init := "") fun acc a => do
    let o ← load a
    pure (acc ++ textOf o.payload ++ "\n")
  let answer ← infer prompt
  let out ← liftCas (put (valueNode (utf8 answer)))
  liftCas (put (entryNode attestation
    [⟨Ty.context.wireTag, ctx⟩, ⟨Ty.value.wireTag, out⟩,
     ⟨Ty.entry.wireTag, history⟩]))

/-- Deterministic oracle for the demo run. -/
def scripted (prompt : String) : String :=
  s!"folded {prompt.length} chars; ship it"

/-- The drawer, on the page — grammar surface syntax. -/
def helloFile : Tree .file := save% "hello.txt" := "hello world"

def myDrawer : Tree .entry := journal% [
  save% "hello.txt" := "hello world",
  save% "ideas.md" := "# merkle to merkle"
]

/-- The seeded word, under the production digest. -/
def w0 : Word := myDrawer.flatten sha256Addr

def demoRun : Status CasSig Addr32 × Word :=
  runAgent sha256Addr scripted 100
    (agentStep (myDrawer.address sha256Addr)
      [helloFile.address sha256Addr]
      (utf8 "model=scripted;t=0"))
    w0

def expect (label : String) (condition : Bool) : IO Unit := do
  unless condition do
    throw (IO.userError s!"AgentStep check failed: {label}")

def checks : IO Unit := do
  expect "seeded word admits" (Word.wf w0)
  match demoRun with
  | (.done _, w') => do
    expect "step appends exactly three bindings"
      (w'.length == w0.length + 3)
    expect "admission preserved across the run" (Word.wf w')
  | _ => throw (IO.userError "agent step did not complete")
  match runAgent sha256Addr scripted 100
      (agentStep (sha256Addr (utf8 "nope")) [] []) w0 with
  | (.refused _, w') =>
    expect "dangling history admits nothing" (w'.length == w0.length)
  | _ => throw (IO.userError "dangling history was not refused")
  match runAgent sha256Addr scripted 100
      (agentStep (helloFile.address sha256Addr) [] []) w0 with
  | (.refused _, _) => pure ()
  | _ => throw (IO.userError "wrong-kind history was not refused")
  IO.println s!"agent step ok: {w0.length} → {w0.length + 3} bindings"

#eval checks

end CasExamples.AgentStep
