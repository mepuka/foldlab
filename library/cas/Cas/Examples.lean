import Cas.Lang
/-!
# First programs

The agent step is NOT a primitive — it is a program written in the
language: load the history, refuse a non-entry, fold the context with
`foldlM` (reduce with an opaque function, free from the monad), ask the
oracle, put three objects. The guards witness both directions: the step
runs and grows the store by exactly three, and a dangling or ill-kinded
history is refused.
-/

namespace Cas.Lang.Examples

open Cas.Lang

/-- Illustrative kind bytes for the demo vocabulary. -/
def Kind.value : UInt8 := 1
def Kind.entry : UInt8 := 12
def Kind.context : UInt8 := 13

def utf8 (s : String) : List UInt8 := s.toUTF8.toList

def textOf (bs : List UInt8) : String :=
  (String.fromUTF8? (ByteArray.mk bs.toArray)).getD s!"<{bs.length}B binary>"

/-- One agent step, as a `Cas` program. -/
def agentStep (history : Addr) (contextIds : List Addr)
    (attestation : List UInt8) : Prog Addr := do
  let prev ← load history
  require (prev.kind == Kind.entry) "history is not an entry"
  let links ← contextIds.foldlM (fun acc a => do
    let o ← load a
    pure (acc ++ [Link.mk o.kind a])) []
  let ctx ← put ⟨Kind.context, [], links⟩
  let prompt ← contextIds.foldlM (fun acc a => do
    let o ← load a
    pure (acc ++ textOf o.payload ++ "\n")) ""
  let answer ← ask prompt
  let out ← put ⟨Kind.value, utf8 answer, []⟩
  put ⟨Kind.entry, attestation, [⟨Kind.context, ctx⟩, ⟨Kind.value, out⟩, ⟨Kind.entry, history⟩]⟩

/-- Deterministic oracle for the demo run. -/
def scripted (prompt : String) : String :=
  s!"folded {prompt.length} chars; ship it"

/-- Seed a genesis entry and one value, then take one agent step. -/
def demo : Prog Addr := do
  let genesis ← put ⟨Kind.entry, [], []⟩
  let hello ← put ⟨Kind.value, utf8 "hello world", []⟩
  agentStep genesis [hello] (utf8 "model=scripted;t=0")

def demoRun := run scripted 100 demo []

-- The step runs to completion, and the store holds exactly five objects:
-- genesis, hello, context, output, entry.
#guard demoRun.1.isDone
#guard demoRun.2.length == 5

-- A dangling history is refused before anything is admitted.
def danglingRun := run scripted 100 (agentStep (digest (utf8 "nope")) [] []) []
#guard danglingRun.1.isRefused
#guard danglingRun.2.length == 0

-- A history that resolves at the wrong kind is refused by the guard.
def notAnEntry : Prog Addr := do
  let hello ← put ⟨Kind.value, utf8 "hello world", []⟩
  agentStep hello [] []
#guard (run scripted 100 notAnEntry []).1.isRefused

def hexByte (b : UInt8) : String :=
  let d := "0123456789abcdef".toList
  String.ofList [d[b.toNat / 16]!, d[b.toNat % 16]!]

def shortAddr (a : Addr) : String := String.join ((a.take 4).map hexByte)

#eval match demoRun with
  | (.done head, store) =>
      IO.println s!"step ok: {store.length} objects, chain head {shortAddr head}"
  | (.refused reason, _) => IO.println s!"refused: {reason}"
  | (.running _, _) => IO.println "out of fuel"

end Cas.Lang.Examples
