import Cas.Values.Json
import Gate

/-!
# The environment ledger — `lake exe envledger`

The configuration plane's first emitter. Every other tool in `tools/`
describes the SEMANTIC plane — schemas, programs, verdicts, the type
surface. This one describes the plane those tools run in: which Lean
pin each Lake project declares, which mise tasks exist, which of them
the `check` chain actually reaches, and which executable `lakefile.toml`
declares with no task driving it and no `--check` gating it.

Nothing here walks an environment. The tool reads FILES — `mise.toml`,
`library/cas/lakefile.toml`, and a committed list of `lean-toolchain`
paths — so it needs no `supportInterpreter`, no `importModules`, and
runs in well under a second.

## Paths

Every cas task sets `dir = {{config_root}}/library/cas`, so a bare
relative path resolves INSIDE `library/cas`. Every file this ledger
reads, and the fixture it writes, lives above that. `repoRoot` is the
one constant that carries the difference; `lakefile.toml` is the single
input that is genuinely local.

## The grammars refuse

Lean core has no TOML parser, and the estate's direction law says to
ingest a config format rather than re-implement it. The compromise is
three deliberately NARROW line grammars, each admitting only the shapes
the file it reads actually uses, and each REFUSING — by name, line
number, and offending text — on anything else. A grammar that defaults
past an unmatched line would silently drop the very drift the ledger
exists to catch, so unmatched is an error, never a shrug.

## Enumeration by declaration, not by walk

The `lean-toolchain` file list and the `portable | host-local` residence
of every mise task are committed Lean constants. A declared path that
moves is a refusal naming it; a task that `mise.toml` grows with no
residence row refuses the whole document, with a message saying what to
add. Residence is DECLARED with a reason and never inferred — no amount
of reading `mise.toml` tells you whether a command's inputs survive a
fresh clone.

What declaration alone cannot catch is a NEW Lake project nobody rowed:
it is absent from the ledger rather than red. Closing that needs a
directory walk, which this slice deliberately does not do.

## Modes

- default — write `docs/lab-core/ENVIRONMENT.json`;
- `--check` — the byte-identity gate in `check:cas`;
- `--self-test` — plant one defect per rule and require each to be
  caught by that rule alone. A gate that cannot fail proves nothing.
-/

/-! ## Where the ledger reads -/

/-- Fixture and input paths resolve from `library/cas`, the `dir` every
cas task sets. -/
def repoRoot : System.FilePath := ".." / ".."

def outPath : System.FilePath :=
  repoRoot / "docs" / "lab-core" / "ENVIRONMENT.json"

/-- The `dir` value that marks a task as running in this package — the
join key between `lakefile.toml`'s executables and `mise.toml`'s tasks. -/
def casDir : String := "{{config_root}}/library/cas"

/-- Every `lean-toolchain` in the tree, as a committed constant: the
declaration is the authority, so a path that moves refuses by name
rather than dropping a pin out of the ledger unnoticed. -/
def toolchainFiles : List String := [
  "experiments/entity-store-extract/twin/extract-lean/lean-toolchain",
  "experiments/entity-store-generate/generated/lean-toolchain",
  "experiments/entity-store-model/lean-toolchain",
  "experiments/entity-store-shell/lean-toolchain",
  "formal/fips202/lean-toolchain",
  "library/cas/lean-toolchain",
  "library/effects/archive/lean-model-0.3/lean-toolchain",
  "library/machine/lean-toolchain"]

/-- Declared residence, one row per mise task: `portable` when every
input is tracked in this repository or fetched by a committed lockfile,
`host-local` when the task needs state a fresh clone cannot obtain from
tracked files and lockfiles alone. The reason is the evidence. A task
with no row is a refusal — the ledger will not guess. -/
def residence : List (String × String × String) := [
  ("brief:effects:archive", "portable", "all inputs tracked"),
  ("check", "portable", "all inputs tracked"),
  ("check:cas", "portable", "all inputs tracked"),
  ("check:effects:archive", "portable", "all inputs tracked"),
  ("check:effects:research", "portable", "all inputs tracked"),
  ("check:effects:ts", "portable", "committed bun lockfile pins every dependency"),
  ("check:entity-store", "portable", "all inputs tracked"),
  ("check:extract", "portable", "reads the vendored pinned Effect sources; committed bun lockfile"),
  ("check:extract-oxc", "host-local",
    "the six-file oxc census reads the full pinned source cache, gitignored with no bootstrap"),
  ("check:extract-twin", "host-local",
    "twin/bootstrap.sh clones the tree-sitter seam from the network with no lockfile pinning it"),
  ("check:generate", "portable", "zero dependencies; reads the committed inventory"),
  ("check:lift-roundtrip", "portable",
    "committed bun lockfile; T12 reads the committed emitted programs and lift documents"),
  ("check:fips202", "portable", "all inputs tracked"),
  ("check:ledger", "portable", "committed bun lockfile pins every dependency"),
  ("check:machine", "portable", "all inputs tracked"),
  ("check:workbench", "host-local", "experiments/workbench is not yet committed"),
  ("gen", "portable", "all inputs tracked"),
  ("gen:inventory", "portable", "reads the vendored pinned Effect sources"),
  ("gen:backend-gate", "portable", "all inputs tracked"),
  ("gen:backend-layers", "portable", "all inputs tracked"),
  ("gen:cas-admission-map", "portable", "all inputs tracked"),
  ("gen:oxc-surface", "host-local",
    "the oxc surface census reads the full pinned source cache, gitignored with no bootstrap"),
  ("gen:cas-obligations", "portable", "all inputs tracked"),
  ("gen:cas-laws", "portable", "all inputs tracked"),
  ("gen:backend-materialize", "portable", "all inputs tracked"),
  ("gen:backend-mcp", "portable", "all inputs tracked"),
  ("gen:backend-programs", "portable", "all inputs tracked"),
  ("gen:backend-wire", "portable", "all inputs tracked"),
  ("gen:cas-schemas", "portable", "all inputs tracked"),
  ("gen:cas-surface", "portable", "all inputs tracked"),
  ("gen:cas-vectors", "portable", "all inputs tracked"),
  ("gen:cas-verdicts", "portable", "all inputs tracked"),
  ("gen:effects-materialize", "portable", "all inputs tracked"),
  ("gen:effects:archive", "portable", "all inputs tracked"),
  ("gen:effects:research", "portable", "all inputs tracked"),
  ("gen:env-ledger", "portable", "all inputs tracked"),
  ("gen:grammar-manifest", "portable", "all inputs tracked"),
  ("gen:ledger", "portable", "committed bun lockfile pins every dependency"),
  ("gen:lift-manifest", "portable", "all inputs tracked"),
  ("gen:vectors", "portable", "all inputs tracked")]

/-! ## Shared line vocabulary -/

/-- Leading and trailing whitespace removed, as a `String`. -/
def trimmed (s : String) : String := s.trimAscii.toString

/-- The last `n` characters removed, as a `String`. -/
def chop (s : String) (n : Nat) : String := (s.dropEnd n).toString

def isQuoted (s : String) : Bool :=
  s.length ≥ 2 && s.startsWith "\"" && s.endsWith "\""

def unquote (s : String) : String := chop (s.drop 1).toString 1

/-- `key = value` split at the FIRST ` = `; the remainder rejoins, so a
value containing the separator survives. -/
def splitKV (s : String) : Option (String × String) :=
  match s.splitOn " = " with
  | [] => none
  | _ :: [] => none
  | k :: rest => some (trimmed k, trimmed (String.intercalate " = " rest))

/-- A command's words, blanks dropped. -/
def words (s : String) : List String :=
  (s.splitOn " ").filter (fun w => !w.isEmpty)

/-! ## The `lean-toolchain` grammar

One line, one pin. Anything else refuses. -/

def parseToolchain (path : String) (text : String) : Except String String :=
  let lines := (text.splitOn "\n").filter (fun l => !(trimmed l).isEmpty)
  match lines with
  | [] => .error s!"{path}: empty; expected one `leanprover/lean4:vX.Y.Z` pin"
  | [l] =>
    let t := trimmed l
    if t.startsWith "leanprover/lean4:v" && !t.any (· == ' ') then .ok t
    else .error s!"{path}:1: not a `leanprover/lean4:vX.Y.Z` pin — «{t}»"
  | _ =>
    .error s!"{path}: {lines.length} non-empty lines; expected exactly one pin"

/-! ## The `mise.toml` grammar -/

structure MiseTask where
  name : String
  dir : Option String
  commands : List String
deriving Inhabited

structure Mise where
  tools : List (String × String)
  tasks : List MiseTask

inductive Sect where
  | none
  | tools
  | task
deriving DecidableEq

structure MiseSt where
  sect : Sect := .none
  cur : Option MiseTask := none
  inRun : Bool := false
  /-- Inside a `description = \"\"\"` multi-line string (the standing-
  exception prose shape); consumed without transcription, closed by a
  line whose trimmed content ends with the `\"\"\"` delimiter. -/
  inDesc : Bool := false
  /-- Reversed while accumulating. -/
  tools : List (String × String) := []
  /-- Reversed while accumulating. -/
  tasks : List MiseTask := []

def flushMise (st : MiseSt) : MiseSt :=
  match st.cur with
  | none => st
  | some t =>
    { st with
      cur := none,
      tasks := { t with commands := t.commands.reverse } :: st.tasks }

/-- One line of `mise.toml`. Every admitted shape is spelled out; the
final `throw` is the whole point of the grammar. -/
def miseStep (ln : Nat) (raw : String) (st : MiseSt) : Except String MiseSt := do
  let line := trimmed raw
  if st.inDesc then
    if line.endsWith "\"\"\"" then return { st with inDesc := false }
    return st
  if line.isEmpty || line.startsWith "#" then return st
  if st.inRun then
    if line == "]" then return { st with inRun := false }
    let entry := if line.endsWith "," then chop line 1 else line
    if isQuoted entry then
      match st.cur with
      | some t =>
        return { st with cur := some { t with commands := unquote entry :: t.commands } }
      | none => throw s!"mise.toml:{ln}: run entry outside a task — «{line}»"
    else throw s!"mise.toml:{ln}: unrecognized run entry — «{line}»"
  if line == "[tools]" then return { flushMise st with sect := .tools }
  if line.startsWith "[tasks." && line.endsWith "]" then
    let inner := chop (line.drop 7).toString 1
    let name := if isQuoted inner then unquote inner else inner
    if name.isEmpty then throw s!"mise.toml:{ln}: empty task name — «{line}»"
    return { flushMise st with
             sect := .task,
             cur := some { name, dir := none, commands := [] } }
  if line.startsWith "[" then
    throw s!"mise.toml:{ln}: unknown section header — «{line}»"
  match splitKV line with
  | none => throw s!"mise.toml:{ln}: unrecognized line — «{line}»"
  | some (key, val) =>
    if val == "[" then
      if key == "run" && st.sect == .task then return { st with inRun := true }
      else throw s!"mise.toml:{ln}: array value for key «{key}» outside a task `run`"
    if val == "\"\"\"" then
      if key == "description" && st.sect == .task then return { st with inDesc := true }
      else throw s!"mise.toml:{ln}: multi-line string for key «{key}» outside a task `description`"
    if isQuoted val then
      let v := unquote val
      match st.sect, st.cur with
      | .tools, _ => return { st with tools := (key, v) :: st.tools }
      | .task, some t =>
        if key == "description" then return st
        else if key == "dir" then return { st with cur := some { t with dir := some v } }
        else if key == "run" then return { st with cur := some { t with commands := [v] } }
        else throw s!"mise.toml:{ln}: unknown task key «{key}»"
      | .task, none => throw s!"mise.toml:{ln}: task key outside a task — «{line}»"
      | .none, _ => throw s!"mise.toml:{ln}: key outside a section — «{line}»"
    throw s!"mise.toml:{ln}: unrecognized value for «{key}» — «{val}»"

def parseMise (text : String) : Except String Mise := do
  let mut st : MiseSt := {}
  let mut ln := 0
  for raw in text.splitOn "\n" do
    ln := ln + 1
    st ← miseStep ln raw st
  if st.inRun then throw "mise.toml: unterminated `run` array"
  let done := flushMise st
  return { tools := done.tools.reverse, tasks := done.tasks.reverse }

/-! ## The `lakefile.toml` grammar -/

structure LeanExe where
  name : String
  srcDir : Option String
  root : Option String
  supportInterpreter : Bool
deriving Inhabited

inductive Block where
  | top
  | lib
  | exe
deriving DecidableEq

structure LakeSt where
  block : Block := .top
  cur : Option LeanExe := none
  /-- Reversed while accumulating. -/
  exes : List LeanExe := []

def flushLake (st : LakeSt) : LakeSt :=
  match st.cur with
  | none => st
  | some e => { st with cur := none, exes := e :: st.exes }

def lakeStep (ln : Nat) (raw : String) (st : LakeSt) : Except String LakeSt := do
  let line := trimmed raw
  if line.isEmpty || line.startsWith "#" then return st
  if line == "[[lean_lib]]" then
    return { flushLake st with block := .lib }
  if line == "[[lean_exe]]" then
    return { flushLake st with
             block := .exe,
             cur := some { name := "", srcDir := none, root := none,
                           supportInterpreter := false } }
  if line.startsWith "[" then
    throw s!"lakefile.toml:{ln}: unknown section header — «{line}»"
  match splitKV line with
  | none => throw s!"lakefile.toml:{ln}: unrecognized line — «{line}»"
  | some (key, val) =>
    if isQuoted val then
      let v := unquote val
      match st.block, st.cur with
      | .exe, some e =>
        if key == "name" then return { st with cur := some { e with name := v } }
        else if key == "srcDir" then return { st with cur := some { e with srcDir := some v } }
        else if key == "root" then return { st with cur := some { e with root := some v } }
        else throw s!"lakefile.toml:{ln}: unknown lean_exe key «{key}»"
      | .exe, none => throw s!"lakefile.toml:{ln}: lean_exe key with no block — «{line}»"
      | .lib, _ =>
        if key == "name" || key == "srcDir" then return st
        else throw s!"lakefile.toml:{ln}: unknown lean_lib key «{key}»"
      | .top, _ =>
        if key == "name" then return st
        else throw s!"lakefile.toml:{ln}: unknown package key «{key}»"
    if val == "true" || val == "false" then
      match st.block, st.cur with
      | .exe, some e =>
        if key == "supportInterpreter" then
          return { st with cur := some { e with supportInterpreter := val == "true" } }
        else throw s!"lakefile.toml:{ln}: unknown lean_exe flag «{key}»"
      | _, _ => throw s!"lakefile.toml:{ln}: flag «{key}» outside a lean_exe"
    if val.startsWith "[" && val.endsWith "]" then
      match st.block with
      | .exe => throw s!"lakefile.toml:{ln}: array key «{key}» in a lean_exe"
      | _ =>
        if key == "defaultTargets" || key == "globs" then return st
        else throw s!"lakefile.toml:{ln}: unknown array key «{key}»"
    throw s!"lakefile.toml:{ln}: unrecognized value for «{key}» — «{val}»"

def parseLakefile (text : String) : Except String (List LeanExe) := do
  let mut st : LakeSt := {}
  let mut ln := 0
  for raw in text.splitOn "\n" do
    ln := ln + 1
    st ← lakeStep ln raw st
  let exes := (flushLake st).exes.reverse
  match exes.find? (·.name.isEmpty) with
  | some _ => throw "lakefile.toml: a [[lean_exe]] block declares no `name`"
  | none => return exes

/-! ## The task graph -/

/-- The task a `mise run X` command names. -/
def runTarget (cmd : String) : Option String :=
  match words cmd with
  | ["mise", "run", n] => some n
  | _ => none

private def expand (tasks : List MiseTask) (acc : List String) : List String :=
  let next := acc.flatMap fun n =>
    match tasks.find? (·.name == n) with
    | none => []
    | some t => t.commands.filterMap runTarget
  (acc ++ next).eraseDups

/-- Every task the `check` chain reaches, transitively. Bounded by the
task count, so it terminates without a `partial` waiver. -/
def reachable (tasks : List MiseTask) : List String :=
  (List.range (tasks.length + 1)).foldl (fun acc _ => expand tasks acc) ["check"]

/-- A task that runs this package's executable `name` bare. -/
def drives (name : String) (t : MiseTask) : Bool :=
  t.dir == some casDir && t.commands.any (fun c => words c == ["lake", "exe", name])

/-- A task that runs this package's executable `name` as a byte gate. -/
def gates (name : String) (t : MiseTask) : Bool :=
  t.dir == some casDir &&
    t.commands.any (fun c => words c == ["lake", "exe", name, "--check"])

/-! ## The document -/

open Cas.Json (Value)

private def optStr : Option String → Value
  | none => .null
  | some s => .str s

def taskJson (chain : List String) (t : MiseTask) : Except String Value :=
  match residence.find? (fun r => r.1 == t.name) with
  | none =>
    .error s!"mise.toml declares task «{t.name}» with no residence row; \
add it to `residence` in tools/EnvLedger.lean as portable or host-local, with a reason"
  | some (_, place, why) =>
    .ok (.obj [
      ("name", .str t.name),
      ("dir", optStr t.dir),
      ("commands", .arr (t.commands.map Value.str)),
      ("inChain", .bool (chain.contains t.name)),
      ("residence", .str place),
      ("residenceReason", .str why)])

def exeJson (tasks : List MiseTask) (e : LeanExe) : Value :=
  let driver := tasks.find? (drives e.name)
  let gate := tasks.find? (gates e.name)
  .obj [
    ("name", .str e.name),
    ("srcDir", optStr e.srcDir),
    ("root", optStr e.root),
    ("supportInterpreter", .bool e.supportInterpreter),
    ("drivenBy", optStr (driver.map (·.name))),
    ("gatedBy", match gate with
      | none => .null
      | some t => .obj [("task", .str t.name),
                        ("command", .str s!"lake exe {e.name} --check")])]

def document (m : Mise) (pins : List (String × String)) (exes : List LeanExe) :
    Except String String := do
  let chain := reachable m.tasks
  let tasks := m.tasks.mergeSort (fun a b => a.name < b.name)
  let taskRows ← tasks.mapM (taskJson chain)
  let excluded := (m.tasks.filterMap fun t =>
    if chain.contains t.name then none else some t.name).mergeSort (· < ·)
  let sortedPins := pins.mergeSort (fun a b => a.1 < b.1)
  let distinct := (pins.map (·.2)).eraseDups.mergeSort (· < ·)
  let sortedExes := exes.mergeSort (fun a b => a.name < b.name)
  let undriven := (sortedExes.filterMap fun e =>
    if m.tasks.any (drives e.name) then none else some e.name)
  let ungated := (sortedExes.filterMap fun e =>
    if m.tasks.any (gates e.name) then none else some e.name)
  return Cas.Json.render (.obj [
    ("ledger", .str "environment"),
    ("tools", .obj (m.tools.mergeSort (fun a b => a.1 < b.1) |>.map
      fun (k, v) => (k, Value.str v))),
    ("leanToolchains", .arr (sortedPins.map fun (p, pin) =>
      .obj [("path", .str p), ("pin", .str pin)])),
    ("distinctPins", .arr (distinct.map Value.str)),
    ("tasks", .arr taskRows),
    ("excludedGates", .arr (excluded.map Value.str)),
    ("leanExes", .arr (sortedExes.map (exeJson m.tasks))),
    ("undriven", .arr (undriven.map Value.str)),
    ("ungated", .arr (ungated.map Value.str))]) ++ "\n"

/-! ## Reading -/

/-- A declared input that has moved is a refusal naming the path, not a
silently absent row. -/
def readAt (p : System.FilePath) : IO String := do
  try IO.FS.readFile p
  catch e => throw (IO.userError s!"cannot read {p}: {e}")

def liftE (e : Except String α) : IO α :=
  match e with
  | .error msg => throw (IO.userError msg)
  | .ok a => pure a

/-- The ledger as the driver's single fixture. Every read and every
refusal happens HERE — inside the action the driver forces only after
arguments parse. -/
def fixtures : IO (List Gate.Fixture) := do
  let miseText ← readAt (repoRoot / "mise.toml")
  let m ← liftE (parseMise miseText)
  let lakeText ← readAt "lakefile.toml"
  let exes ← liftE (parseLakefile lakeText)
  let pins : List (String × String) ← toolchainFiles.mapM fun p => do
    let text ← readAt (repoRoot / System.FilePath.mk p)
    let pin ← liftE (parseToolchain p text)
    return (p, pin)
  let doc ← liftE (document m pins exes)
  let distinct := (pins.map (·.2)).eraseDups.length
  return [⟨outPath, doc,
    s!"{m.tasks.length} tasks, {exes.length} exes, {pins.length} pins \
({distinct} distinct)"⟩]

/-! ## `--self-test`

One planted defect per rule, each caught by that rule alone. A gate
that cannot fail proves nothing. -/

private def demoTask : String := "gen:demo"

private def miseFixture : String :=
"[tools]
bun = \"1.4.0\"

[tasks.\"gen:demo\"]
description = \"demo\"
dir = \"{{config_root}}/library/cas\"
run = \"lake exe demo\"

[tasks.check]
run = [
  \"mise run gen:demo\",
]
"

private def plantedControl (label : String) (passed : Bool) (detail : String) :
    IO Bool := do
  let word := if passed then "fires" else "MISSED"
  IO.println s!"{word} — {label}: {detail}"
  return passed

def selfTest : IO Unit := do
  -- Rule 1: the lean-toolchain grammar refuses an unparseable pin
  -- rather than defaulting past it.
  let label1 := "lean-toolchain refuses an unparseable pin"
  let c1 ← do
    match parseToolchain "planted/lean-toolchain" "leanprover/lean4 v4.33.1\n" with
    | .error msg => plantedControl label1 true msg
    | .ok pin => plantedControl label1 false s!"admitted «{pin}»"
  -- Rule 2: the mise grammar refuses a `dir` it cannot read, rather
  -- than yielding a task whose dir is silently absent.
  let label2 := "mise refuses a `dir` the grammar misses"
  let planted := miseFixture.replace "dir = \"{{config_root}}/library/cas\""
                                     "dir = '{{config_root}}/library/cas'"
  let c2 ← do
    match parseMise planted with
    | .error msg => plantedControl label2 true msg
    | .ok m =>
      let seen := ((m.tasks.find? (fun t => t.name == demoTask)).bind (·.dir)).getD "<none>"
      plantedControl label2 false s!"admitted {m.tasks.length} tasks, dir = {seen}"
  -- Rule 3: an executable with no driving task lands in `undriven`
  -- (and, having no gate either, in `ungated`).
  let c3 ← do
    let m ← liftE (parseMise miseFixture)
    let exes ← liftE (parseLakefile
      "[[lean_exe]]\nname = \"demo\"\n\n[[lean_exe]]\nname = \"ghost\"\n")
    let ghostDriven := m.tasks.any (drives "ghost")
    let ghostGated := m.tasks.any (gates "ghost")
    let demoDriven := m.tasks.any (drives "demo")
    plantedControl "a lean_exe with no driving task lands in undriven"
      (!ghostDriven && !ghostGated && demoDriven && exes.length == 2)
      s!"ghost driven={ghostDriven} gated={ghostGated}, demo driven={demoDriven}"
  -- Rule 4: the residence column stays DECLARED — a task with no row
  -- refuses the document rather than being inferred into one.
  let label4 := "an undeclared task refuses the document"
  let c4 ← do
    let m ← liftE (parseMise miseFixture)
    match document m [] [] with
    | .error msg => plantedControl label4 true msg
    | .ok _ =>
      plantedControl label4 false "emitted a document for a task with no residence row"
  let fired := [c1, c2, c3, c4]
  let missed := fired.filter (· == false) |>.length
  IO.println s!"{fired.length - missed} of {fired.length} controls fired"
  unless missed == 0 do
    throw (IO.userError s!"{missed} control(s) did not fire")

/-- `--self-test` is this tool's own mode, so its help line is too: the
driver's grammar knows only the gate flags. -/
private def usageLine : String :=
  "usage: lake exe envledger [--check] [--json]\n" ++
  "       lake exe envledger --self-test"

def main (args : List String) : IO Unit :=
  match args with
  | ["--self-test"] => selfTest
  | ["--help"] => IO.println usageLine
  | ["-h"] => IO.println usageLine
  | _ => Gate.main "lake exe envledger" fixtures args
