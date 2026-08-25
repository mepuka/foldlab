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

RECORD / COMPARE (ruling CV-1, candidate C-2). The comparison above is SELF-REFERENTIAL on
its own: both runners compute their observables with the same codec and the same digest, so
a change to either moves both transcripts identically and the harness stays green. Until
this capability landed nothing about the transcripts was committed, and exactly one address
existed estate-wide (`harness/12-wfs-closed.script:39`), so format drift had nowhere to
show up.

    harness <scripts> <workdir> --record  <transcripts-dir>   write the canonical transcripts
    harness <scripts> <workdir> --compare <transcripts-dir>   byte-compare against them

`--compare` fails naming the first differing script and the first differing line. Neither
flag restructures the two runners: the recorded transcript IS the list of lines the
comparison already builds, which is why a green `--compare` says something about the codec
rather than about this file. Default behavior — neither flag — is unchanged.
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

/-! ## Golden transcripts (CV-1, candidate C-2)

Table 3 of the conformance bundle. One file per committed script, holding the transcript
the differential already builds — the model side's lines, which on a passing script are the
disk side's lines byte for byte.

Determinism, to the bundle's avoid-list: LF, trailing newline, a generated banner, and
nothing else. No timestamp, no host path, no git SHA — the script's own name is the only
identifier written, and it is the committed filename. -/

/-- What to do with each script's transcript. `plain` is the pre-CV-1 behavior, unchanged. -/
inductive TranscriptAction
  | plain
  | record (dir : FilePath)
  | compare (dir : FilePath)

/-- `12-wfs-closed.script` → `12-wfs-closed.transcript`. Named after the script, per G3. -/
def transcriptFileName (script : String) : String :=
  (if script.endsWith ".script" then
     String.ofList (script.toList.take (script.length - ".script".length))
   else script) ++ ".transcript"

/-- The canonical text of one script's transcript: banner, then the transcript lines, LF
    separated, trailing newline. This is the ONLY place the format is decided, so `--record`
    and `--compare` cannot drift apart. -/
def canonicalTranscript (script : String) (lines : List String) : String :=
  String.intercalate "\n"
    ([ "; GENERATED by `lake exe harness <scripts> <workdir> --record <transcripts-dir>` \
        (Shell/Harness.lean) — DO NOT EDIT."
     , "; script: " ++ script ] ++ lines) ++ "\n"

/-- Split a byte string on LF. Total and structural; the last element is the text after the
    final LF (empty for a file that ends in one, as every generated file here does). -/
def splitLF : Bytes → List Bytes
  | [] => [[]]
  | b :: rest =>
      let tl := splitLF rest
      if b == 0x0a then [] :: tl
      else match tl with
        | [] => [[b]]
        | hd :: tls => (b :: hd) :: tls

/-- Render a transcript line's bytes for a diagnosis. A committed transcript is UTF-8; a
    file that is not says so rather than being silently mangled. -/
private def showLine (bs : Bytes) : String :=
  (String.fromUTF8? (byteArrayOfBytes bs)).getD "<not valid UTF-8>"

/-- The first line at which two transcript byte strings differ, rendered. `none` means the
    two are byte-identical. -/
def firstTranscriptDivergence (want got : Bytes) : Option String :=
  let rec go : Nat → List Bytes → List Bytes → Option String
    | _, [], [] => none
    | i, [], y :: _ => some s!"line {i}: committed file ended, fresh run has {showLine y}"
    | i, x :: _, [] => some s!"line {i}: fresh run ended, committed file has {showLine x}"
    | i, x :: xs, y :: ys =>
        if x == y then go (i + 1) xs ys
        else some s!"line {i}:\n      committed: {showLine x}\n      fresh    : {showLine y}"
  go 1 (splitLF want) (splitLF got)

/-- Write one script's canonical transcript. -/
private def recordTranscript (dir : FilePath) (script : String) (lines : List String) :
    IO Unit := do
  IO.FS.createDirAll dir
  IO.FS.writeBinFile (dir / transcriptFileName script) (canonicalTranscript script lines).toUTF8

/-- Byte-compare one script's transcript against its committed file. `none` on a match. -/
private def compareTranscript (dir : FilePath) (script : String) (lines : List String) :
    IO (Option String) := do
  let p := dir / transcriptFileName script
  if !(← p.pathExists) then
    return some s!"no committed transcript at {p}"
  let committed := bytesOfByteArray (← IO.FS.readBinFile p)
  let fresh := bytesOfByteArray (canonicalTranscript script lines).toUTF8
  if committed == fresh then pure none
  else pure (firstTranscriptDivergence committed fresh)

/-- The acceptance gate: run every committed script, print a transcript, exit nonzero on
    any divergence. `workDir` must not already contain a store for a script being run —
    the harness never deletes anything (there is no deletion in v0), so a fresh work
    directory is the caller's business.

    `action` adds the CV-1 transcript leg on top, without touching the differential: a
    transcript is recorded or compared only for a script whose two runners already agreed,
    since a divergent run has no canonical transcript to speak of. -/
def runHarness (scriptsDir workDir : FilePath) (verbose : Bool)
    (action : TranscriptAction := .plain) : IO UInt32 := do
  let names ← findScripts scriptsDir
  if names.isEmpty then
    IO.eprintln s!"harness: no *.script fixtures in {scriptsDir}"
    return 2
  let mut failures := 0
  let mut compared := 0
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
      match action with
      | .plain =>
          IO.println s!"PASS {n} ({res.transcript.length} transcript lines)"
      | .record dir => do
          recordTranscript dir n res.transcript
          IO.println s!"RECORD {n} -> {dir / transcriptFileName n} \
({res.transcript.length} transcript lines)"
      | .compare dir => do
          match ← compareTranscript dir n res.transcript with
          | none =>
              compared := compared + 1
              IO.println s!"SAME {n} ({res.transcript.length} transcript lines)"
          | some d => do
              failures := failures + 1
              IO.println s!"DRIFT {n}"
              IO.println s!"     committed transcript and fresh run differ at {d}"
      if verbose then for l in res.transcript do IO.println s!"     {l}"
    else
      failures := failures + 1
      IO.println s!"FAIL {n}"
      for d in res.detail do IO.println s!"     {d}"
      for l in res.transcript do IO.println s!"     {l}"
  IO.println ""
  if failures = 0 then
    match action with
    | .plain =>
        IO.println s!"harness: {names.length} scripts, all model/disk observables identical"
    | .record dir =>
        IO.println s!"harness: {names.length} scripts, transcripts recorded to {dir}"
    | .compare _ =>
        IO.println s!"harness: {names.length} scripts, all model/disk observables identical; \
{compared} transcripts byte-equal to the committed corpus"
    pure 0
  else
    IO.println s!"harness: {failures} of {names.length} scripts FAILED"
    pure 1

end Shell
