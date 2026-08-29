import Lean
import Cas.Values.Json
import Cas.Grammar.Manifest
import Gate
import Walk

/-!
# The obligation ledger — `lake exe obligations`

Dozens of named obligations are load-bearing prose in this library's
docstrings, and nothing reads them. `SCHEMA-MATERIALIZATION.md`'s
defect register has already started drifting from the tree — the line
it still carries about `Cas/Backend/Ts.lean` importing
`Cas.Schema.Foreign` names an import that was removed in `34145109`,
and the file now imports nothing at all. That is the failure mode a
prose ledger has and a generated one does not.

This tool extracts what is already written. It mints no convention,
asks for no new registry, and rules on nothing: it reads the
docstrings the estate has been writing for months, matches a CLOSED
keyword set against them, and emits the result as data under a byte
gate. `--check` is that gate in `check:cas`: a docstring that quietly
loses its `owed`, an obligation that reverts from `discharged`, a
health counter that goes stale — each is a red diff.

## What it reads

Declaration docstrings (`findDocString?`) and module docstring blocks
(`getModuleDoc?`), over `Walk`'s shared environment walk. Rows sort by
module then declaration — `Walk.collect`'s own total order — so a diff
is a change of content, never of traversal.

## What it does NOT deliver

**Since-when.** Age is not derivable from the environment: declaration
ranges cover under half the library and carry no date at all. Age
needs a `git log -S` join, which is a shell step outside this tool.
The ledger says what and where and in what state, and does not pretend
to say when.

## The keyword set is closed

`owed`, `obligation`, `parked`, `un-parked`, `discharged`,
`pin pending`, `sub-obligation`. An ad-hoc synonym is silently
invisible, which is the price of a closed set and the reason it is
written here rather than inferred. Matching is case-insensitive and
requires a non-letter before the match, so `borrowed` is not `owed`;
`un-parked` and `sub-obligation` are matched as themselves and not
double-counted as `parked` and `obligation`.

## Discharged rows STAY

The ledger is history, not hygiene: a discharged obligation keeps its
row, so the audit trail is the artifact rather than a memory of one.
This is provisional pending the operator's ruling.
-/

open Lean

namespace Obl

/-! ## The closed keyword set -/

/-- One keyword class. `spellings` are the literal forms the estate
writes; `notAfter` are the prefixes that mean a hit belongs to a
LONGER keyword and must not be counted here. -/
structure Keyword where
  state : String
  spellings : List String
  notAfter : List String := []

/-- The closed set, in the order rows sort within one docstring. -/
def keywords : List Keyword := [
  { state := "owed", spellings := ["owed"] },
  { state := "obligation", spellings := ["obligation"],
    notAfter := ["sub-"] },
  { state := "parked", spellings := ["parked"], notAfter := ["un-"] },
  { state := "un-parked", spellings := ["un-parked"] },
  { state := "discharged", spellings := ["discharged"] },
  { state := "pin-pending", spellings := ["pin pending", "pin-pending"] },
  { state := "sub-obligation", spellings := ["sub-obligation"] }]

/-! ## Matching

Every offset below is a CHARACTER index. `String.toLower` is
character-wise and ASCII-only on this toolchain, so a match found in
the lowered text sits at the same index in the original — which is why
the keyword and the excerpt can be quoted verbatim from the source
prose while the search runs case-blind. -/

private def offsetsGo (width : Nat) : List String → Nat → List Nat
  | [], _ => []
  | [_], _ => []
  | p :: rest, acc =>
    let here := acc + p.length
    here :: offsetsGo width rest (here + width)

/-- The character offsets at which `needle` occurs in `hay`,
left to right and non-overlapping. -/
def offsetsOf (hay needle : String) : List Nat :=
  if needle.isEmpty then []
  else offsetsGo needle.length (hay.splitOn needle) 0

/-- The letter test that keeps `borrowed` from being `owed`: a match
must start at a non-letter boundary. The END is deliberately free, so
`obligations` and `parked)` still match. -/
def boundaryOk (chars : Array Char) (offset : Nat) : Bool :=
  offset == 0 || !(chars[offset - 1]!).isAlpha

/-- Does the text immediately before `offset` spell `s`? This is how
`un-parked` keeps its `parked` and `sub-obligation` its `obligation`. -/
def precededBy (chars : Array Char) (offset : Nat) (s : String) : Bool :=
  let sc := s.toList
  sc.length ≤ offset &&
    (List.range sc.length).all fun i =>
      (chars[offset - sc.length + i]!).toLower == (sc[i]!).toLower

/-- The first valid hit for one keyword class: the earliest offset over
all its spellings, with the earlier spelling winning a tie. Answers the
offset and the matched length. -/
def firstHit (chars : Array Char) (lowered : String) (k : Keyword) :
    Option (Nat × Nat) :=
  let cands := k.spellings.flatMap fun sp =>
    (offsetsOf lowered sp.toLower).filterMap fun off =>
      if !boundaryOk chars off then none
      else if k.notAfter.any (precededBy chars off) then none
      else some (off, sp.length)
  cands.foldl (init := (none : Option (Nat × Nat))) fun acc c =>
    match acc with
    | none => some c
    | some a => if c.1 < a.1 then some c else acc

/-- Whitespace runs collapse to one space and the ends are trimmed:
docstrings are hard-wrapped prose, and an excerpt that carried the
wrapping would diff on a re-flow that changed nothing. -/
private def squashGo : List Char → Bool → List Char → List Char
  | [], _, acc => acc.reverse
  | c :: rest, prevWs, acc =>
    if c.isWhitespace then squashGo rest true acc
    else squashGo rest false
      (c :: (if prevWs && !acc.isEmpty then ' ' :: acc else acc))

def squash (cs : List Char) : String := String.ofList (squashGo cs false [])

/-- Forty characters of lead-in, the keyword, sixty of follow-on. -/
def excerptAt (chars : Array Char) (offset width : Nat) : String :=
  let start := if offset > 40 then offset - 40 else 0
  let stop := min chars.size (offset + width + 60)
  let body := squash (((chars.toList).drop start).take (stop - start))
  (if start > 0 then "…" else "") ++ body ++
    (if stop < chars.size then "…" else "")

/-! ## The rows -/

/-- One docstring the scan reads: a declaration's, or one `/-! -/`
block of a module's. -/
structure Entry where
  module : String
  /-- `none` for a module docstring block. -/
  declaration : Option String
  doc : String

/-- One obligation hit. `state` is the machine bucket; `keyword` is the
estate's own spelling of it, verbatim, because `OBLIGATION`,
`obligation` and `PIN PENDING` are the prose the register is made of. -/
structure Row where
  module : String
  declaration : Option String
  state : String
  keyword : String
  excerpt : String

/-- One row per keyword class present, in the set's declared order. A
docstring that says both `owed` and `discharged` yields both rows: the
ledger is history, so a discharge does not erase the debt it settled. -/
def scan (e : Entry) : List Row :=
  let chars := e.doc.toList.toArray
  let lowered := e.doc.toLower
  keywords.filterMap fun k =>
    (firstHit chars lowered k).map fun (off, width) =>
      { module := e.module, declaration := e.declaration,
        state := k.state,
        keyword := String.ofList ((chars.toList.drop off).take width),
        excerpt := excerptAt chars off width }

def scanAll (es : List Entry) : List Row := es.flatMap scan

/-! ## The health counters

Four of the six are folds over the rows. The other two are read from
the places that already compute them — the point of a counter is to
have one authority, not a second opinion. -/

/-- The counters no docstring carries: the grammar manifest's formless
rows, and the value plane's `Empty` denotations. -/
structure Health where
  formless : Nat
  emptyDenotations : Nat

/-- The grammar rows that state no form. READ from the manifest, which
computes this itself at `Manifest.lean`'s `formless` — a second
computation here would be a second authority. -/
def formlessCount : Nat :=
  (Cas.Grammar.manifestV0.rows.filter (·.forms.isEmpty)).length

/-- One equation of `Cas.Schema.El` — `El.eq_1` … `El.eq_12`, one per
arm. `El.eq_def` is the whole match at once and is not an arm. -/
def isElEquation : Name → Bool
  | .str p last =>
    p == `Cas.Schema.El && last.startsWith "eq_" && last != "eq_def"
  | _ => false

/-- The `El` arms that denote `Empty` — the value plane's declared
holes. Counted over `El`'s own EQUATIONS, one per arm, read from the
compiled environment rather than from the source text: an arm that
stops denoting `Empty` moves this number whether or not anyone
remembers to. `El` is a mutual definition, so its stored body is a
`brecOn` application that mentions no arm; the equations are where the
arms survive. `none` means they are gone, which is a finding and not
a zero. -/
def emptyDenotationCount (env : Environment) : Option Nat :=
  let eqns := env.constants.toList.filter fun (n, _) => isElEquation n
  if eqns.isEmpty then none
  else some (eqns.countP fun (_, ci) => ci.type.getUsedConstants.contains `Empty)

/-! ## The document -/

def rowJson (r : Row) : Cas.Json.Value :=
  .obj (
    [("module", Cas.Json.Value.str r.module)] ++
    (match r.declaration with
     | some d => [("declaration", Cas.Json.Value.str d)]
     | none => []) ++
    [("state", .str r.state), ("keyword", .str r.keyword),
     ("excerpt", .str r.excerpt)])

def stateCount (rows : List Row) (s : String) : Nat :=
  (rows.filter (·.state == s)).length

def document (h : Health) (rows : List Row) : String :=
  let moduleRows := rows.filter (·.declaration.isNone)
  let declRows := rows.filter (·.declaration.isSome)
  Cas.Json.render (.obj [
    ("library", .str "Cas"),
    ("counters", .obj [
      ("formless", .nat h.formless),
      ("emptyDenotations", .nat h.emptyDenotations),
      ("pinPending", .nat (stateCount rows "pin-pending")),
      ("parked", .nat (stateCount rows "parked")),
      ("owed", .nat (stateCount rows "owed")),
      ("discharged", .nat (stateCount rows "discharged"))]),
    ("moduleDocs", .arr (moduleRows.map rowJson)),
    ("declarations", .arr (declRows.map rowJson))]) ++ "\n"

/-! ## Reading the environment -/

/-- Every docstring in the library, in the order the ledger prints:
each module's `/-! -/` blocks, then its declarations, modules and
declarations both in `Walk`'s total order. -/
def entries (env : Environment) : CoreM (List Entry) := do
  let modules ← Walk.collect env
  let declEntries : List Entry :=
    modules.toList.flatMap fun (m, rows) =>
      rows.toList.filterMap fun r =>
        r.doc.map fun d =>
          { module := m.toString, declaration := some r.name, doc := d }
  let mut moduleEntries : List Entry := []
  for m in Walk.libraryModules env do
    let some blocks := getModuleDoc? env m | continue
    for b in blocks do
      moduleEntries :=
        { module := m.toString, declaration := none, doc := b.doc } ::
          moduleEntries
  return moduleEntries.reverse ++ declEntries

end Obl

/-! ## The tool -/

def outPath : System.FilePath := "surface" / "cas-obligations.json"

def regen : String := "lake exe obligations"

unsafe def fixtures : IO (List Gate.Fixture) := do
  enableInitializersExecution
  let (rows, empties) ← Walk.run fun env => do
    let rows := Obl.scanAll (← Obl.entries env)
    return (rows, Obl.emptyDenotationCount env)
  let some emptyDenotations := empties
    | throw (IO.userError
        "Cas.Schema.El declares no equations — the ledger cannot count \
the value plane's Empty denotations")
  let health : Obl.Health :=
    { formless := Obl.formlessCount, emptyDenotations }
  return [⟨outPath, Obl.document health rows, s!"{rows.length} obligations"⟩]

/-! ## The controls

A gate that cannot fail proves nothing. Each control runs the scan
over a SYNTHETIC corpus and states what must hold; the planted defects
are the three the design names — a docstring that loses its keyword, a
state that reverts, a counter that goes stale — plus the boundary and
double-count rules the closed keyword set stands on. -/

namespace Obl

private def ent (decl doc : String) : Entry :=
  { module := "Cas.Probe", declaration := some decl, doc }

/-- Module blocks first, then declarations — the order `entries` reads
the real environment in. -/
private def baseCorpus : List Entry := [
  { module := "Cas.Probe", declaration := none,
    doc := "CORPUS PIN PENDING — the citation is not G0-pinned." },
  ent "a" "The pin is owed.",
  ent "b" "A NAMED OBLIGATION, discharged 2026-08-29."]

private def baseHealth : Health := { formless := 1, emptyDenotations := 4 }

private def baseDoc : String := document baseHealth (scanAll baseCorpus)

structure Control where
  name : String
  /-- What the control asserts. -/
  claim : String
  holds : Bool

/-- The states a corpus reports, in row order. -/
private def statesOf (es : List Entry) : List String :=
  (scanAll es).map (·.state)

def controls : List Control :=
  let base := scanAll baseCorpus
  [ { name := "baseline"
    , claim := "the base corpus reports owed, obligation, discharged, \
pin-pending"
    , holds := statesOf baseCorpus ==
        ["pin-pending", "owed", "obligation", "discharged"] },
    { name := "keyword lost"
    , claim := "striking `owed` from a docstring drops its row and \
moves the document"
    , holds :=
        let mutated := baseCorpus.map fun e =>
          if e.declaration == some "a" then { e with doc := "The pin is due." }
          else e
        (scanAll mutated).length + 1 == base.length &&
          document baseHealth (scanAll mutated) != baseDoc },
    { name := "state reverted"
    , claim := "a `discharged` row that reverts to `owed` moves the \
document"
    , holds :=
        let mutated := baseCorpus.map fun e =>
          if e.declaration == some "b" then
            { e with doc := "A NAMED OBLIGATION, owed again." }
          else e
        document baseHealth (scanAll mutated) != baseDoc &&
          (scanAll mutated).any (fun r =>
            r.declaration == some "b" && r.state == "owed") },
    { name := "counter stale"
    , claim := "a health counter that drifts moves the document even \
though no row changed"
    , holds :=
        document { baseHealth with formless := 0 } base != baseDoc &&
          document { baseHealth with emptyDenotations := 3 } base != baseDoc },
    { name := "word boundary"
    , claim := "`borrowed`, `allowed` and `showed` are not `owed`"
    , holds := statesOf [ent "c" "The idiom is borrowed; nothing is \
allowed and nothing showed."] == [] },
    { name := "un-parked not double-counted"
    , claim := "`un-parked` reports once, as `un-parked`"
    , holds := statesOf [ent "d" "This leg is un-parked."] == ["un-parked"] },
    { name := "sub-obligation not double-counted"
    , claim := "`sub-obligation` reports once, as `sub-obligation`"
    , holds := statesOf [ent "e" "SUB-OBLIGATION 1 stands."] ==
        ["sub-obligation"] },
    { name := "case-insensitive, verbatim keyword"
    , claim := "`OBLIGATION` is found and quoted in its own casing"
    , holds :=
        match scanAll [ent "f" "A NAMED OBLIGATION."] with
        | [r] => r.state == "obligation" && r.keyword == "OBLIGATION"
        | _ => false },
    { name := "module docstring counted"
    , claim := "a module block's `PIN PENDING` reaches the counter"
    , holds := stateCount base "pin-pending" == 1 &&
        base.any (fun r => r.declaration.isNone && r.state == "pin-pending") },
    { name := "excerpt is one line"
    , claim := "a hard-wrapped docstring excerpts without its wrapping"
    , holds :=
        match scanAll [ent "g" "the row is\n  owed until the\n  pin lands"] with
        | [r] => r.excerpt == "the row is owed until the pin lands"
        | _ => false } ]

end Obl

def selfTest : IO Unit := do
  let mut failed := 0
  for c in Obl.controls do
    let verdict := if c.holds then "fires" else "SILENT"
    IO.println s!"{verdict} {c.name} — {c.claim}"
    unless c.holds do failed := failed + 1
  IO.println s!"{Obl.controls.length - failed} of {Obl.controls.length} \
controls fire"
  unless failed == 0 do
    throw (IO.userError s!"{failed} control(s) did not fire — the gate \
cannot prove it would go red")

def usage : String :=
  s!"usage: {regen} [--check] [--json] | {regen} --self-test"

unsafe def main (args : List String) : IO Unit :=
  if args.contains "--self-test" then
    if args.length == 1 then selfTest else throw (IO.userError usage)
  else Gate.main regen fixtures args
