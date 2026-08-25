/-
Standing gates for the shell.

The shell sits deliberately OUTSIDE the E2 opaque/unsafe gate boundary (IO is extern by
nature, STORE-SHELL §2). It gets its own discipline instead, and these scans are that
discipline made mechanical rather than asserted:

  G-S1  no `opaque` and no `unsafe` constant under `Shell` — the `partial`→opaque trap,
        which `#print axioms` cannot see. The shell is not proved, but it stays provable.
  G-S2  IO containment: every constant whose TYPE mentions `IO` lives in one of the four
        modules allowed to perform it. A pure function cannot reach IO without IO in its
        type, so this bounds the effectful surface to files a reviewer can read.
  G-S3  the IO whitelist (§3, SHELL-v0) by enumeration: every `IO.*` / `System.FilePath.*`
        constant the package references, listed. Adding `IO.getEnv`, a socket, a clock, or
        a random source fails the build here rather than in review.
  G-S4  no name shadowing of the core: no shell DEFINITION whose final name component
        matches a core definition. Rung 0's architectural invariant is that the shell's
        pure behavior IS the core's; a shell function named `canonS` or `preimageE` would
        be the exact shape of a drift nobody notices. Constructors and compiler-generated
        companions are exempt — `Shell.Verb.putSchema` names a verb, not an insert.
-/
import Lean
import Shell.Hex
import Shell.Hash
import Shell.Render
import Shell.Sexp
import Shell.Carrier
import Shell.Boundary
import Shell.Verbs
import Shell.Model
import Shell.Store
import Shell.Script
import Shell.Harness
import Shell.Cli
import Shell.Encode

open Lean Elab Command

namespace Shell.Gate

/-- The modules permitted to mention `IO` in a type. `Shell.Gate` itself is exempt from
    every scan below — it is a metaprogram over the environment, not shell code. -/
def ioModules : List Name := [`Shell.Store, `Shell.Cli, `Shell.Encode, `Shell.Harness]

/-- The IO whitelist of STORE-SHELL §3, SHELL-v0, by enumeration. The effectful members
    are exactly: file read/write under the store root, directory listing and creation,
    existence tests, atomic rename, stdout/stderr, and exit codes. The rest are the
    carrier types those signatures are written in. Nothing here reads a clock, a random
    source, the environment, or a socket. -/
def ioWhitelist : List Name :=
  [ -- effectful primitives, SHELL-v0 §3
    `IO.FS.readBinFile, `IO.FS.writeBinFile, `IO.FS.rename, `IO.FS.createDirAll,
    `System.FilePath.readDir, `System.FilePath.pathExists,
    `IO.println, `IO.eprintln, `IO.print, `IO.eprint,
    -- carriers and plumbing those signatures are written in
    `IO, `EIO, `BaseIO, `IO.Error,
    `IO.FS.DirEntry, `IO.FS.DirEntry.fileName, `IO.FS.DirEntry.path,
    `System.FilePath, `System.FilePath.mk, `System.FilePath._sizeOf_inst,
    `System.FilePath.instDiv, `System.FilePath.instHDivString ]

private def mentionsIO (e : Expr) : Bool :=
  Option.isSome <| e.find? fun s =>
    match s with
    | .const n _ => n == `IO || n == `EIO || n == `BaseIO
    | _ => false

/-- Names the compiler generates for every inductive and every equation; they collide
    between any two namespaces and say nothing. -/
def generatedSuffixes : List String :=
  [ "casesOn", "recOn", "rec", "below", "brecOn", "ibelow", "binductionOn", "ndrec",
    "noConfusion", "noConfusionType", "toCtorIdx", "ofNat", "sizeOf", "induct", "mk",
    "injEq", "inj", "eq_def", "eq_1", "eq_2", "eq_3", "unfold", "fun_cases" ]

private def isInternal (n : Name) : Bool :=
  match n with
  | .str _ s =>
      s == "_unsafe_rec" || s == "_cstage1" || s == "_cstage2" || s == "_lambda"
        || s.startsWith "_" || s == "match_1" || s == "eq_def"
  | _ => n.hasMacroScopes

elab "#shell_gates" : command => do
  let env ← getEnv
  let mut opaqueOffenders : Array (Name × String) := #[]
  let mut ioOffenders : Array (Name × Name) := #[]
  let mut usedIO : NameSet := {}
  let mut shadow : Array Name := #[]
  let mut scanned := 0
  for (n₀, ci) in env.constants.toList do
    -- `private` definitions carry a `_private.<Module>.0.` prefix; scanning the raw name
    -- would silently exempt every one of them, which is most of this package.
    let n := privateToUserName n₀
    unless (`Shell).isPrefixOf n && !(`Shell.Gate).isPrefixOf n do continue
    scanned := scanned + 1
    -- G-S1
    match ci with
    | .opaqueInfo v =>
        unless isInternal n do
          opaqueOffenders := opaqueOffenders.push (n, if v.isUnsafe then "unsafe opaque" else "opaque")
    | .defnInfo v => if v.safety != .safe && !isInternal n then
        opaqueOffenders := opaqueOffenders.push (n, "unsafe def")
    | _ => pure ()
    -- G-S2
    if mentionsIO ci.type && !isInternal n then
      let mods := env.allImportedModuleNames
      let m := (env.getModuleIdxFor? n₀).bind (fun i => mods[i.toNat]?)
      unless (m.map (fun mm => ioModules.contains mm)).getD false do
        ioOffenders := ioOffenders.push (n, m.getD `unknown)
    -- G-S3: every IO/FilePath constant this package's code actually references
    for u in (ci.value?.map Expr.getUsedConstants).getD #[] ++ ci.type.getUsedConstants do
      if (`IO).isPrefixOf u || u == `IO || (`System.FilePath).isPrefixOf u
          || u == `System.FilePath || u == `EIO || u == `BaseIO then
        usedIO := usedIO.insert u
    -- G-S4 — definitions only; constructors and generated companions are exempt
    match ci, n with
    | .defnInfo _, .str _ base =>
        if env.contains (`E2 ++ Name.mkSimple base) && !isInternal n
            && !generatedSuffixes.contains base then
          shadow := shadow.push n
    | _, _ => pure ()
  unless opaqueOffenders.isEmpty do
    throwError "G-S1 FAILED — opaque/unsafe constants under Shell: {opaqueOffenders}"
  unless ioOffenders.isEmpty do
    throwError "G-S2 FAILED — IO outside the permitted modules: {ioOffenders}"
  let stray := usedIO.toList.filter (fun u => !ioWhitelist.contains u)
  unless stray.isEmpty do
    throwError "G-S3 FAILED — IO constants outside the SHELL-v0 whitelist: {stray}"
  unless shadow.isEmpty do
    throwError "G-S4 FAILED — Shell constants shadowing core names: {shadow}"
  logInfo s!"shell gates ok ({scanned} constants scanned) — G-S1 opaque/unsafe clean; \
G-S2 IO confined to {ioModules}; G-S4 no core shadowing.\n\
G-S3 — every IO/FilePath constant this package references, all whitelisted:\n  \
{sortStrings (usedIO.toList.map toString)}"

#shell_gates

/-! Round-trip sanity (compiled evaluation, not theorems): the renderer emits what the
    reader accepts, for both carriers. This is the property that lets a `resolve` result
    be pasted back into a fixture. -/

open Shell E2

private def rtSchema (s : SchemaCore) : Bool :=
  match parseSchema AddrEnv.empty (renderSchema s) with
  | .ok s' => s' == s
  | .error _ => false

private def rtValue (v : Value) : Bool :=
  match parseValue AddrEnv.empty (renderValue v) with
  | .ok v' => v' == v
  | .error _ => false

#guard rtSchema (.object (.cons "a" (.prim .int) false (.cons "b" (.array (.prim .str)) true .nil)))
#guard rtSchema (.mu "tag" (.union .oneOf (.cons (.var 0) (.cons .address .nil))))
#guard rtSchema (.refine (.prim .str) (.filter "minLength" (.vint 3) true))
#guard rtSchema (.tuple (.cons (.ref ⟨List.replicate 64 0⟩) (.cons (.lit .vnull) .nil)))
#guard rtSchema (.tupleRest (.cons (.prim .str) (.cons (.prim .int) .nil)) (.prim .bool))
#guard rtSchema (.record (.union .anyOf (.cons (.prim .int) (.cons .address .nil))))
#guard rtValue (.vobj (.cons "k" (.varr (.cons (.vint (-7)) (.cons (.vbool true) .nil))) .nil))
#guard rtValue (.vstr "quote\" back\\slash\nnewline")
#guard rtValue (.vaddr ⟨List.replicate 64 255⟩)

end Shell.Gate
