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

THE RUNNER SEAM (ruling CV-2, candidate C-1). The step loop above is ONE algorithm, and it
is written once, over the `Runner` interface below. A runner says three things — how to
bring its store up, how to execute one verb into an observable, how to settle — and knows
nothing about scripts, steps, transcripts, or comparison; the loop knows nothing about
model states or directories. Everything that decides an observable therefore has exactly
one home: step numbering, address threading, assertion handling, transcript assembly,
`--record`/`--compare`, and the divergence report.

CV-2 fixes the population of adapters at TWO. The third runner is the monorepo's, it lives
in another repository, and it rendezvouses with this one through the committed transcripts
in `transcripts/` — a byte-compare across repos, not a third instance of this structure.
So the seam below is sized for the two adapters that exist.
-/
import Shell.Model
import Shell.Store
import Shell.Script

namespace Shell

open E2 System

/-! ## The seam -/

/-- What a script needs from the thing it is run against, and nothing more.

    `m` carries the runner's own state and its own failure channel, so neither appears
    here: the model's `ModelState` and the disk's directory handle are the adapters'
    business, not the loop's. The failure channel is `String` because a runner failure is
    a HARNESS failure — the sides' error channels are not comparable observables (the
    model has no store to fault), so a fault aborts the script instead of becoming a
    transcript line.

    `finalize` has no work in either adapter today, and says so honestly: the model's
    state is a value, and the disk store's commit point is the per-verb atomic rename in
    `StoreRoot.applyEffect`, so there is nothing left to flush once the last step
    returns. It is here because settling is a runner's business and not the loop's — the
    loop must not have to know that today's two answers are both "nothing". -/
structure Runner (m : Type → Type) where
  /-- Bring the store up. Runs once, after the script parses and before step 1. Named
      `init` rather than `initialize`, which Lean reserves for a command. -/
  init : m Unit
  /-- Execute one verb and hand back its observable — the exit code and the lines. -/
  applyStep : Verb → m Outcome
  /-- Settle the store. Runs once, after the last step. -/
  finalize : m Unit

/-- The step loop, written once. `env` and `idx` are SCRIPT state, shared by every runner:
    each side threads its own address environment so a divergence in any step's address
    propagates into every later step rather than being masked.

    An assertion that fails aborts the script — a fixture states a claim, and a false
    claim is a harness failure, not a transcript line nobody reads. Assertions never reach
    the runner: they are decided by `runAssertion`, identically on both sides, which is
    why they cannot weaken the differential.

    `step {idx}: ` is prefixed HERE, on both the assertion failure and the runner's own
    failure. Step numbering is the loop's vocabulary; an adapter says what went wrong with
    its store and is never told which step it is on. -/
private def runSteps [Monad m] [MonadExceptOf String m] (R : Runner m) :
    AddrEnv → Nat → List Sexp → m (List String)
  | _, _, [] => pure []
  | env, idx, x :: rest => do
      let st ← liftExcept (sexpToStep env x)
      let (out, addr) ←
        match runAssertion st with
        | some out =>
            if out.code = 0 then pure (out, none)
            else throw s!"step {idx}: {String.intercalate " " out.lines}"
        | none =>
          match st with
          | .verb v => do
              let out ← tryCatch (R.applyStep v) (fun e => throw s!"step {idx}: {e}")
              pure (out, stepAddr v out)
          | _ => throw "unreachable: assertion without an outcome"
      let tl ← runSteps R (env.push addr out.code) (idx + 1) rest
      pure (transcriptLines idx (renderSexp x) out ++ tl)

/-- Run one script against one runner, yielding its transcript. -/
def runScript [Monad m] [MonadExceptOf String m] (R : Runner m) (src : String) :
    m (List String) := do
  let steps ← liftExcept (scriptSteps src)
  R.init
  let lines ← runSteps R AddrEnv.empty 1 steps
  R.finalize
  pure lines

/-! ## The two adapters -/

/-- Adapter (a): the pure model — `E2.StoreMap` under `E2.putPre`, in process, no IO. The
    state is threaded by `StateT`; the initial state is `ModelState.empty`, supplied by
    `runScriptModel`, so there is nothing to bring up. -/
def modelRunner : Runner (StateT ModelState (Except String)) where
  init := pure ()
  applyStep v := modifyGet (fun m => m.run v)
  finalize := pure ()

/-- Adapter (b): a store on a real directory, through the CLI codepaths. A `StoreFault`
    is an environment fault and it aborts the script; it is never a transcript line. -/
def diskRunner (r : StoreRoot) : Runner (ExceptT String IO) where
  init := do
    match ← liftM r.init with
    | .error f => throw s!"store fault at init: {f.render}"
    | .ok _ => pure ()
  applyStep v := do
    match ← liftM (r.run v) with
    | .error f => throw s!"store fault: {f.render}"
    | .ok out => pure out
  finalize := pure ()

/-- Run a script against the pure model. -/
def runScriptModel (src : String) : Except String (List String) :=
  StateT.run' (runScript modelRunner src) ModelState.empty

/-- Run the same script against a fresh disk store. -/
def runScriptDisk (r : StoreRoot) (src : String) : IO (Except String (List String)) :=
  ExceptT.run (runScript (diskRunner r) src)

/-- The first position at which TWO runners' transcripts differ, rendered. The runners are
    named by the caller — the report says which side is which, and this function does not
    care that today's two callers are the model and the disk. The names are padded to a
    common width so the two rendered lines align under each other. -/
private def firstDivergence (aName bName : String) (a b : List String) : Option String :=
  let width := max aName.length bName.length
  let pad (s : String) : String := s ++ String.ofList (List.replicate (width - s.length) ' ')
  let rec go : Nat → List String → List String → Option String
    | _, [], [] => none
    | i, [], y :: _ => some s!"line {i}: {aName} ended, {bName} has {y}"
    | i, x :: _, [] => some s!"line {i}: {bName} ended, {aName} has {x}"
    | i, x :: xs, y :: ys =>
        if x == y then go (i + 1) xs ys
        else some s!"line {i}:\n      {pad aName}: {x}\n      {pad bName}: {y}"
  go 1 a b

/-! The divergence report is the one harness observable no committed transcript reaches: a
    golden exists only for a script whose two runners AGREED, so the corpus is silent about
    what a disagreement prints. These pin it — including the padding, which is why the
    second name is spelled `disk ` and not `disk`. -/

#guard firstDivergence "model" "disk" [] ["y"] == some "line 1: model ended, disk has y"
#guard firstDivergence "model" "disk" ["x"] [] == some "line 1: disk ended, model has x"
#guard firstDivergence "model" "disk" ["a", "x"] ["a", "y"]
        == some "line 2:\n      model: x\n      disk : y"
#guard firstDivergence "model" "disk" ["a"] ["a"] == none

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
        match firstDivergence "model" "disk" modelLines diskLines with
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
    any divergence.

    `workDir` MUST NOT EXIST (F-53, ruling CV-2). The harness never deletes anything —
    there is no deletion in v0 — so a work directory carrying anything from an earlier run
    silently changes what the disk side sees, and the run reports DIVERGENCES: a misreport
    dressed as a verdict. The precondition used to be prose here and a per-script check
    that counted a stale store as a script FAILURE, which is the same category error one
    level down (exit 1 is a verdict about the store, and this is a fact about the caller's
    filesystem). It is now checked once, up front, and refused with exit 2 — an
    environment fault is never a verdict.

    `action` adds the CV-1 transcript leg on top, without touching the differential: a
    transcript is recorded or compared only for a script whose two runners already agreed,
    since a divergent run has no canonical transcript to speak of. -/
def runHarness (scriptsDir workDir : FilePath) (verbose : Bool)
    (action : TranscriptAction := .plain) : IO UInt32 := do
  if ← workDir.pathExists then
    IO.eprintln s!"harness: work directory {workDir} already exists; it must not, because \
the harness never deletes anything (F-53). Remove it and re-run."
    return 2
  let names ← findScripts scriptsDir
  if names.isEmpty then
    IO.eprintln s!"harness: no *.script fixtures in {scriptsDir}"
    return 2
  let mut failures := 0
  let mut compared := 0
  for n in names do
    let src ← readTextFile (scriptsDir / n)
    let root : StoreRoot := ⟨workDir / n⟩
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
