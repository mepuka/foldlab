/-
The differential harness (STORE-SHELL §6, SH7 — the v0 acceptance gate).

Each committed script executes twice:

  (a) against the pure model — `E2.StoreMap` under `E2.putPre`, in process, no IO;
  (b) against a fresh disk store, through the CLI codepaths.

Every observable — addresses, get bytes, resolve results, refs, name lookups, check
verdicts, exit codes — is compared byte-for-byte. Divergence anywhere is a hard failure
and a nonzero exit.

The two sides share the decision layer (`Shell/Verbs.lean`) by construction; what is
under test is therefore the plumbing between the model and a directory — hex naming,
temp-and-rename, the directory scan, the obligation records — which is exactly the
surface rung 0 does not cover.
-/
import Shell.Model
import Shell.Store
import Shell.Script

namespace Shell

open E2 System

/-- Run a script against the pure model. An assertion that fails aborts the script — a
    fixture states a claim, and a false claim is a harness failure, not a transcript line
    nobody reads. -/
def runScriptModel (src : String) : Except String (List String) := do
  let steps ← scriptSteps src
  let rec go (m : ModelState) (env : AddrEnv) (idx : Nat) :
      List Sexp → Except String (List String)
    | [] => .ok []
    | x :: rest => do
        let st ← sexpToStep env x
        let (out, m', addr) ←
          match runAssertion st with
          | some out =>
              if out.code = 0 then (Except.ok (out, m, none) : Except String _)
              else .error s!"step {idx}: {String.intercalate " " out.lines}"
          | none =>
            match st with
            | .verb v => let (out, m') := m.run v; .ok (out, m', stepAddr v out)
            | _ => .error "unreachable: assertion without an outcome"
        let env' := env.push addr out.code
        let tl ← go m' env' (idx + 1) rest
        .ok (transcriptLines idx (renderSexp x) out ++ tl)
  go ModelState.empty AddrEnv.empty 1 steps

/-- Run the same script against a fresh disk store. -/
def runScriptDisk (r : StoreRoot) (src : String) : IO (Except String (List String)) := do
  match scriptSteps src with
  | .error e => pure (.error e)
  | .ok steps => do
    -- A store fault on the disk side is a HARNESS failure, not a transcript line: the
    -- model side has no such channel, so there is nothing to compare it against.
    match ← r.init with
    | .error f => return .error s!"store fault at init: {f.render}"
    | .ok _ => pure ()
    let mut env := AddrEnv.empty
    let mut idx := 1
    let mut lines : List String := []
    for x in steps do
      match sexpToStep env x with
      | .error e => return .error e
      | .ok st =>
          let (out, addr) ←
            match runAssertion st with
            | some out =>
                if out.code = 0 then pure (out, none)
                else return .error s!"step {idx}: {String.intercalate " " out.lines}"
            | none =>
              match st with
              | .verb v => do
                  match ← r.run v with
                  | .error f => return .error s!"step {idx}: store fault: {f.render}"
                  | .ok out => pure (out, stepAddr v out)
              | _ => return .error "unreachable: assertion without an outcome"
          lines := lines ++ transcriptLines idx (renderSexp x) out
          env := env.push addr out.code
          idx := idx + 1
    pure (.ok lines)

/-- The first position at which two transcripts differ, rendered. -/
private def firstDivergence (a b : List String) : Option String :=
  let rec go : Nat → List String → List String → Option String
    | _, [], [] => none
    | i, [], y :: _ => some s!"line {i}: model ended, disk has {y}"
    | i, x :: _, [] => some s!"line {i}: disk ended, model has {x}"
    | i, x :: xs, y :: ys =>
        if x == y then go (i + 1) xs ys
        else some s!"line {i}:\n      model: {x}\n      disk : {y}"
  go 1 a b

structure ScriptResult where
  name : String
  passed : Bool
  detail : List String
  transcript : List String

/-- Run one script on both sides and compare. -/
def runScriptBoth (name : String) (src : String) (r : StoreRoot) : IO ScriptResult := do
  match runScriptModel src with
  | .error e => pure ⟨name, false, [s!"model: script error: {e}"], []⟩
  | .ok modelLines => do
    match ← runScriptDisk r src with
    | .error e => pure ⟨name, false, [s!"disk: script error: {e}"], modelLines⟩
    | .ok diskLines =>
        match firstDivergence modelLines diskLines with
        | none => pure ⟨name, true, [], modelLines⟩
        | some d => pure ⟨name, false, [s!"DIVERGENCE at {d}"], modelLines⟩

/-- Discover the committed fixtures: every `*.script` in the directory, in name order. -/
def findScripts (dir : FilePath) : IO (List String) := do
  let entries ← dir.readDir
  let names := entries.toList.map IO.FS.DirEntry.fileName
  pure (sortStrings (names.filter (fun n => n.endsWith ".script")))

private def readTextFile (p : FilePath) : IO String := do
  let raw ← IO.FS.readBinFile p
  pure (String.ofList ((bytesOfByteArray raw).map (fun b => Char.ofNat b.toNat)))

/-- The acceptance gate: run every committed script, print a transcript, exit nonzero on
    any divergence. `workDir` must not already contain a store for a script being run —
    the harness never deletes anything (there is no deletion in v0), so a fresh work
    directory is the caller's business. -/
def runHarness (scriptsDir workDir : FilePath) (verbose : Bool) : IO UInt32 := do
  let names ← findScripts scriptsDir
  if names.isEmpty then
    IO.eprintln s!"harness: no *.script fixtures in {scriptsDir}"
    return 2
  let mut failures := 0
  for n in names do
    let src ← readTextFile (scriptsDir / n)
    let root : StoreRoot := ⟨workDir / n⟩
    if ← root.isInitialized then
      IO.println s!"FAIL {n}"
      IO.println s!"     work directory already holds a store: {root.path}"
      failures := failures + 1
      continue
    let res ← runScriptBoth n src root
    if res.passed then
      IO.println s!"PASS {n} ({res.transcript.length} transcript lines)"
      if verbose then for l in res.transcript do IO.println s!"     {l}"
    else
      failures := failures + 1
      IO.println s!"FAIL {n}"
      for d in res.detail do IO.println s!"     {d}"
      for l in res.transcript do IO.println s!"     {l}"
  IO.println ""
  if failures = 0 then
    IO.println s!"harness: {names.length} scripts, all model/disk observables identical"
    pure 0
  else
    IO.println s!"harness: {failures} of {names.length} scripts FAILED"
    pure 1

end Shell
