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
  G-S5  no clock, specifically: `IO.FS.Metadata.accessed` and `IO.FS.Metadata.modified`
        are forbidden by name in the used-constant set. W3-15 admits
        `System.FilePath.symlinkMetadata` so the store scan can ask an entry's TYPE, and
        that one primitive hands back a struct carrying two `SystemTime` fields. §3's
        "no clock" is a rung-0 property; admitting the struct would admit the timestamps
        unless a gate says otherwise, so this leg says otherwise.
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
def ioModules : List Name :=
  [`Shell.Store, `Shell.Cli, `Shell.Encode, `Shell.Harness,
   -- F-43(a): the executable roots perform IO by nature. They are now SCANNED (see
   -- `coveredModule`) and therefore must be named here — invisible is not permitted.
   `Main, `EncodeMain, `HarnessMain]

/-- The executable roots. Their `main` is top-level, so the old `Shell`-name-prefix scan
    never reached them: a clock, `getEnv`, or a random source in `main` built
    all-gates-green (F-43(a), refuter wave 2). Coverage is by MODULE now, not by name. -/
def rootModules : List Name := [`Main, `EncodeMain, `HarnessMain]

/-- The modules this gate covers. `Shell.Gate` is exempt: it is a metaprogram over the
    environment, not shell code. -/
def coveredModule (m : Name) : Bool :=
  ((`Shell).isPrefixOf m && m != `Shell.Gate) || rootModules.contains m

/-- The IO whitelist of STORE-SHELL §3, SHELL-v0, by enumeration. The effectful members
    are exactly: file read/write under the store root, file-type interrogation of store
    entries without following symlinks, directory listing and creation, existence tests,
    atomic rename, stdout/stderr, and exit codes. The rest are the carrier types those
    signatures are written in. Nothing here reads a clock, a random source, the
    environment, or a socket — and G-S5 below pins the clock half of that sentence, which
    `IO.FS.Metadata` would otherwise quietly undo. -/
def ioWhitelist : List Name :=
  [ -- effectful primitives, SHELL-v0 §3
    `IO.FS.readBinFile, `IO.FS.writeBinFile, `IO.FS.rename, `IO.FS.createDirAll,
    `System.FilePath.readDir, `System.FilePath.pathExists,
    -- F-42 / W3-15: admitted for ONE purpose — an entry is read only when it is a
    -- regular file. The no-follow form, deliberately: `metadata` reports a symlink's
    -- TARGET type, so `objects/<hex> -> /etc/hosts` would come back `.file` and be read.
    `System.FilePath.symlinkMetadata,
    `IO.println, `IO.eprintln, `IO.print, `IO.eprint,
    -- carriers and plumbing those signatures are written in
    `IO, `EIO, `BaseIO, `IO.Error,
    `IO.FS.DirEntry, `IO.FS.DirEntry.fileName, `IO.FS.DirEntry.path,
    `IO.FS.Metadata, `IO.FS.Metadata.type, `IO.FS.FileType, `IO.FS.FileType.file,
    `IO.FS.instBEqFileType,
    `System.FilePath, `System.FilePath.mk, `System.FilePath._sizeOf_inst,
    `System.FilePath.instDiv, `System.FilePath.instHDivString,
    -- `IO.Error`'s constructors: inert data of an already-admitted carrier. They appear
    -- because `Shell.Store.faultOfIOError` matches on ALL of them with no catch-all —
    -- the fault a store hands back is derived from the constructor and the path, never
    -- from libuv's `details` text, which differs between the Mac and the Windows leg.
    `IO.Error.alreadyExists, `IO.Error.otherError, `IO.Error.resourceBusy,
    `IO.Error.resourceVanished, `IO.Error.unsupportedOperation, `IO.Error.hardwareFault,
    `IO.Error.unsatisfiedConstraints, `IO.Error.illegalOperation, `IO.Error.protocolError,
    `IO.Error.timeExpired, `IO.Error.interrupted, `IO.Error.noFileOrDirectory,
    `IO.Error.invalidArgument, `IO.Error.permissionDenied, `IO.Error.resourceExhausted,
    `IO.Error.inappropriateType, `IO.Error.noSuchThing, `IO.Error.unexpectedEof,
    `IO.Error.userError, `IO.Error.casesOn ]

/-- G-S5's subject, by enumeration — the same shape as `ioWhitelist`, read the other way.
    A FORBIDDEN list rather than an allowed one, so the leg keeps biting even if a future
    edit to `ioWhitelist` admits one of these names. -/
def clockForbidden : List Name :=
  [`IO.FS.Metadata.accessed, `IO.FS.Metadata.modified]

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

/-- Compiler-generated companions, by exact shape. F-43(b): the previous form carried a
    blanket `s.startsWith "_"`, so any constant a shell author named `_foo` evaded G-S1,
    G-S2 and G-S4 at once. The list below is deliberately exhaustive-by-enumeration: a
    new compiler companion shape fails the build as a false offender, which is the safe
    direction for a trust instrument. -/
private def isInternal (n : Name) : Bool :=
  match n with
  | .str _ s =>
      s == "_unsafe_rec" || s.startsWith "_cstage" || s.startsWith "_sparse"
        || s.startsWith "_lambda" || s.startsWith "_elambda"
        || s.startsWith "_closed" || s.startsWith "_spec_"
        || s == "match_1" || s == "eq_def"
  | _ => n.hasMacroScopes

elab "#shell_gates" : command => do
  let env ← getEnv
  let mods := env.allImportedModuleNames
  -- G-S4's subject: the final name component of every core DEFINITION, across both
  -- packages the shell shares code with. F-43(c): the previous form asked only
  -- `env.contains (E2 ++ base)`, so the digest — `Sha3.Impl.sha3_512`, the one function
  -- whose silent replacement would forge every address in the store — was shadowable.
  let coreNamespaces : List Name := [`E2, `Sha3, `Sha3.Impl, `Sha3.Spec]
  let mut opaqueOffenders : Array (Name × String) := #[]
  let mut ioOffenders : Array (Name × Name) := #[]
  let mut usedIO : NameSet := {}
  let mut shadow : Array Name := #[]
  let mut scanned := 0
  let mut covered : NameSet := {}
  for (n₀, ci) in env.constants.toList do
    -- Coverage is by MODULE, not by name prefix (F-43(a)). A constant defined in the
    -- module currently being elaborated has no module index; the gate never scans its
    -- own module, which is the intended exemption.
    let some idx := env.getModuleIdxFor? n₀ | continue
    let some m := mods[idx.toNat]? | continue
    unless coveredModule m do continue
    covered := covered.insert m
    -- `private` definitions carry a `_private.<Module>.0.` prefix; scanning the raw name
    -- would silently exempt every one of them, which is most of this package.
    let n := privateToUserName n₀
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
      unless ioModules.contains m do
        ioOffenders := ioOffenders.push (n, m)
    -- G-S3: every IO/FilePath constant this package's code actually references
    for u in (ci.value?.map Expr.getUsedConstants).getD #[] ++ ci.type.getUsedConstants do
      if (`IO).isPrefixOf u || u == `IO || (`System.FilePath).isPrefixOf u
          || u == `System.FilePath || u == `EIO || u == `BaseIO then
        usedIO := usedIO.insert u
    -- G-S4 — definitions only; constructors and generated companions are exempt
    match ci, n with
    | .defnInfo _, .str _ base =>
        if coreNamespaces.any (fun ns => env.contains (ns ++ Name.mkSimple base))
            && !isInternal n && !generatedSuffixes.contains base then
          shadow := shadow.push n
    | _, _ => pure ()
  unless opaqueOffenders.isEmpty do
    throwError "G-S1 FAILED — opaque/unsafe constants under Shell: {opaqueOffenders}"
  unless ioOffenders.isEmpty do
    throwError "G-S2 FAILED — IO outside the permitted modules: {ioOffenders}"
  -- G-S5 is checked BEFORE G-S3 deliberately. A clock reading is also an unwhitelisted
  -- constant, so G-S3 would fire on it first and report the generic diagnosis; the
  -- specific one is the useful one, and it is the one that survives a whitelist edit.
  let clocks := usedIO.toList.filter clockForbidden.contains
  unless clocks.isEmpty do
    throwError "G-S5 FAILED — clock readings off IO.FS.Metadata (§3 'no clock'): {clocks}"
  let stray := usedIO.toList.filter (fun u => !ioWhitelist.contains u)
  unless stray.isEmpty do
    throwError "G-S3 FAILED — IO constants outside the SHELL-v0 whitelist: {stray}"
  unless shadow.isEmpty do
    throwError "G-S4 FAILED — Shell constants shadowing core names: {shadow}"
  logInfo s!"shell gates ok ({scanned} constants over {covered.toList.length} modules) \
— G-S1 opaque/unsafe clean; G-S2 IO confined to {ioModules}; G-S4 no shadowing of \
{coreNamespaces}; G-S5 no clock reading off {clockForbidden}.\n\
G-S coverage (by module, executable roots included): {sortStrings (covered.toList.map toString)}\n\
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
