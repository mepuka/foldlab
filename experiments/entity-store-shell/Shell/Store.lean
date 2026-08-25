/-
The disk store (STORE-SHELL §4, §6 side (b)) and the whitelisted IO.

IO whitelist, SHELL-v0 (§3), to the letter. This module is the only one that touches a
STORE — reads it, writes it, or names a path inside it — so the store's whole IO surface
is checkable by reading one file. (Three other modules perform IO for their own jobs and
never open a store: `Shell.Cli` reads an argv-named input file and writes stdout,
`Shell.Encode` writes the fixture tool's output, `Shell.Harness` reads committed
fixtures. Gate G-S2 holds the line at those four.) The primitives used here are:

  * `IO.FS.createDirAll`, `System.FilePath.pathExists`, `System.FilePath.readDir`
  * `IO.FS.readBinFile`, `IO.FS.writeBinFile`, `IO.FS.rename`
  * `System.FilePath.symlinkMetadata` — admitted for ONE purpose (F-42, ruling W3-15):
    a directory entry is read only when it is a regular file. `metadata` follows
    symlinks and `isDir` does both wrong things at once, so the no-follow form is the
    one the discipline needs. Only `Metadata.type` is ever read: the struct's
    `accessed`/`modified` are `SystemTime` and are OUT of §3's "no clock" — gate leg
    G-S5 forbids them by name.

No clock, no randomness, no environment read, no network — none of those appear here or
anywhere else in the package. Every object write is temp-file-then-atomic-rename
(`objects/.tmp-<hex>`, then `IO.FS.rename`); names and obligation records go the same
way, since the names plane is mutable.

Every store-touching IO call in this module is caught and reported as a `StoreFault`
(below): the shell's exit code is a verdict, and a run that could not read the store has
no verdict to give.

Layout (§4):

    <root>/objects/<hex>        pre-image bytes, verbatim; filename = hex of H of content
    <root>/names/<hex-of-name>  one address per file, filename = lowercase hex of the
                                name's UTF-8 bytes — the mutable plane (W3-14, F-39)
    <root>/obligations/<hex>    the SH6 accepted-`Conforms` record, one per entity object

The names plane's filename IS NOT ITS KEY (W3-14). The key is the model's Lean `String`,
recovered by decoding the filename; the filesystem only ever sees `[0-9a-f]`. Before this
ruling the name was the filename, so on a case-folding host `names/Widget` and
`names/widget` were one file and `name-get` answered differently on each plane, both
exiting 0 (F-39).
-/
import Shell.Verbs

namespace Shell

open E2 System

structure StoreRoot where
  path : FilePath

def StoreRoot.objectsDir (r : StoreRoot) : FilePath := r.path / "objects"
def StoreRoot.namesDir (r : StoreRoot) : FilePath := r.path / "names"
def StoreRoot.obligationsDir (r : StoreRoot) : FilePath := r.path / "obligations"

/-- The directory a plane lives in — the disk half of `Plane.dirName`. -/
def StoreRoot.planeDir (r : StoreRoot) : Plane → FilePath
  | .objects => r.objectsDir
  | .names => r.namesDir
  | .obligations => r.obligationsDir

def tmpPrefix : String := ".tmp-"

/-! ## Faults — the third channel (F-42, ruling W3-15)

`check`'s exit code IS the verdict (§5): 0 checked and clean, 1 checked and violations
found. A run that could not read the store has no verdict to give and must not borrow
one, so an IO fault is an ENVIRONMENT fault (exit 2), never a verdict.

Two properties are load-bearing.

* The render is derived from the `IO.Error` CONSTRUCTOR and the store-relative PATH,
  never from `IO.Error`'s `details` field. `details` is libuv's message text: it differs
  between the Mac and the Windows leg, and a transcript quoting it would diverge across
  hosts on the same store. The path is the one this module names, not the absolute host
  path the error carries, for the same reason.
* A fault is never defaulted away. An `Option`-returning read that mapped every fault to
  `none` would turn a permission error into an empty store, and an empty store checks
  CLEAN — a soundness break dressed as robustness. -/

inductive StoreFault
  | unreadable (path kind : String)
  | vanished (path : String)
  | denied (path : String)
  | other (path detail : String)

def StoreFault.render : StoreFault → String
  | .unreadable path kind => s!"store-unreadable path={renderStr path} kind={kind}"
  | .vanished path => s!"store-vanished path={renderStr path}"
  | .denied path => s!"store-denied path={renderStr path}"
  | .other path detail => s!"store-fault path={renderStr path} detail={detail}"

/-- The constructor, and nothing else, decides the fault. Deliberately
    exhaustive-by-enumeration and with no catch-all arm: a toolchain that adds an
    `IO.Error` constructor fails the build here rather than silently rendering it as
    something generic. -/
private def faultOfIOError (path : String) : IO.Error → StoreFault
  | .noFileOrDirectory _ _ _ => .vanished path
  | .permissionDenied _ _ _ => .denied path
  | .inappropriateType _ _ _ => .unreadable path "inappropriate-type"
  | .resourceExhausted _ _ _ => .unreadable path "resource-exhausted"
  | .resourceBusy _ _ => .unreadable path "resource-busy"
  | .resourceVanished _ _ => .unreadable path "resource-vanished"
  | .interrupted _ _ _ => .unreadable path "interrupted"
  | .hardwareFault _ _ => .unreadable path "hardware-fault"
  | .alreadyExists _ _ _ => .unreadable path "already-exists"
  | .invalidArgument _ _ _ => .unreadable path "invalid-argument"
  | .noSuchThing _ _ _ => .unreadable path "no-such-thing"
  | .unsupportedOperation _ _ => .unreadable path "unsupported-operation"
  | .unsatisfiedConstraints _ _ => .unreadable path "unsatisfied-constraints"
  | .illegalOperation _ _ => .unreadable path "illegal-operation"
  | .protocolError _ _ => .unreadable path "protocol-error"
  | .timeExpired _ _ => .unreadable path "time-expired"
  | .unexpectedEof => .unreadable path "unexpected-eof"
  | .otherError _ _ => .other path "other-error"
  | .userError _ => .other path "user-error"

/-- Run one store-touching IO call. `path` is the STORE-RELATIVE path, so the rendered
    fault is byte-identical on every host. This is the only door: no IO in this module
    happens outside it. -/
private def attempt {α : Type} (path : String) (act : IO α) : ExceptT StoreFault IO α :=
  ExceptT.mk do
    try pure (.ok (← act))
    catch e => pure (.error (faultOfIOError path e))

/-- `init`: create the three planes. Idempotent. -/
def StoreRoot.init (r : StoreRoot) : IO (Except StoreFault Unit) := ExceptT.run do
  attempt "objects" (IO.FS.createDirAll r.objectsDir)
  attempt "names" (IO.FS.createDirAll r.namesDir)
  attempt "obligations" (IO.FS.createDirAll r.obligationsDir)

/-- `pathExists` is `BaseIO` — it cannot throw, so it needs no `attempt`. -/
def StoreRoot.isInitialized (r : StoreRoot) : IO Bool := do
  pure ((← r.objectsDir.pathExists) && (← r.namesDir.pathExists)
          && (← r.obligationsDir.pathExists))

/-- Write bytes at `dst` through a temp file in the same directory, then rename. The
    rename is the commit point; a reader never sees a partial object. -/
private def atomicWrite (plane : String) (dir : FilePath) (name : String) (bytes : ByteArray) :
    ExceptT StoreFault IO Unit := do
  let tmp := dir / (tmpPrefix ++ name)
  attempt s!"{plane}/{tmpPrefix}{name}" (IO.FS.writeBinFile tmp bytes)
  attempt s!"{plane}/{name}" (IO.FS.rename tmp (dir / name))

private def textBytes (s : String) : ByteArray := s.toUTF8

/-! ## Reading the store

Totality on a HOSTILE directory is the point (F-42, ruling W3-15). Two disciplines make
it hold, and neither of them is a `try` around the whole scan:

1. **File type before content.** An entry is opened only when `symlinkMetadata` says it
   is a regular FILE. A directory named as a valid address is not opened (the old code
   crashed: `inappropriate type … is a directory`); a FIFO is not opened (the old code
   HUNG); a symlink is not followed, so `objects/<hex> -> /etc/hosts` never contributes a
   digest of someone else's file and `-> /dev/zero` never reads unboundedly. All four
   become one `notARegularFile` violation — a verdict, exit 1, which is correct: a
   directory named as an address IS a malformed store, and `check` exists to say so.
2. **Every remaining fault is typed.** Races (an entry vanishing between `readDir` and
   `symlinkMetadata`) and permissions cannot be designed away, so they exit 2 through
   `StoreFault` instead of escaping as an uncaught exception. -/

/-- Materialize the store view: read every object, name, and obligation record.
    Verification is NOT done here — `checkReport` decides, this only reads. A file whose
    name (or, for names, whose content) is not what the layout admits is reported as a
    stray, including a `.tmp-` file left behind by an interrupted write; an entry that is
    not a regular file is reported as such and never opened. -/
def StoreRoot.readView (r : StoreRoot) : IO (Except StoreFault StoreView) := ExceptT.run do
  let mut objects : List (Address × Bytes) := []
  let mut strayObjects : List String := []
  let mut notRegular : List String := []
  for e in ← attempt "objects" r.objectsDir.readDir do
    let fn := e.fileName
    let rel := "objects/" ++ fn
    match addrOfHex fn with
    | none => strayObjects := rel :: strayObjects
    | some a =>
        let md ← attempt rel e.path.symlinkMetadata
        if md.type == IO.FS.FileType.file then
          let raw ← attempt rel (IO.FS.readBinFile e.path)
          objects := (a, bytesOfByteArray raw) :: objects
        else
          notRegular := rel :: notRegular
  let mut names : List (String × Address) := []
  let mut strayNames : List String := []
  for e in ← attempt "names" r.namesDir.readDir do
    let fn := e.fileName
    let rel := "names/" ++ fn
    -- W3-14: the filename is DECODED to the key, and a filename that is not the hex of an
    -- admissible name is a stray. `Shell.nameOfFileName` is the same function the model
    -- side's `placedEntry` runs, so the two cannot drift.
    match nameOfFileName fn with
    | none => strayNames := rel :: strayNames
    | some n =>
      let md ← attempt rel e.path.symlinkMetadata
      if md.type != IO.FS.FileType.file then notRegular := rel :: notRegular
      else
        let raw ← attempt rel (IO.FS.readBinFile e.path)
        match addrOfFileBytes (bytesOfByteArray raw) with
        | none => strayNames := rel :: strayNames
        | some a => names := (n, a) :: names
  let mut obligations : List Address := []
  for e in ← attempt "obligations" r.obligationsDir.readDir do
    let fn := e.fileName
    let rel := "obligations/" ++ fn
    match addrOfHex fn with
    | none => strayObjects := rel :: strayObjects
    | some a =>
        -- An obligation record's IDENTITY is its filename, so this plane is the one
        -- place a non-file could be COUNTED without ever being opened — a directory
        -- named as an entity's address would discharge that entity's SH6 record for
        -- free. Same rule, same violation.
        let md ← attempt rel e.path.symlinkMetadata
        if md.type == IO.FS.FileType.file then obligations := a :: obligations
        else notRegular := rel :: notRegular
  pure (StoreView.normalize
    { objects, names, obligations
      strayObjectFiles := strayObjects
      strayNameFiles := strayNames
      notRegularFiles := notRegular })

/-! ## Writing -/

/-- The SH6 record. Its IDENTITY is the filename (the entity's address); the content is
    an informational line naming the schema. `check` derives what it prints from the
    stored object bytes, never from this content, so the two runners cannot diverge over
    it. -/
private def obligationText (sAddr : Address) : String :=
  s!"conforms-unverified {hexOfAddr sAddr}\n"

def StoreRoot.applyEffect (r : StoreRoot) : Effect → ExceptT StoreFault IO Unit
  | .putObject a b kind => do
      let hex := hexOfAddr a
      -- Append-only: an object already present is already these exact bytes (WF1).
      if !(← (r.objectsDir / hex).pathExists) then
        atomicWrite "objects" r.objectsDir hex (byteArrayOfBytes b)
      match kind, classify b with
      | .entity, some (.entity sAddr _) =>
          if !(← (r.obligationsDir / hex).pathExists) then
            atomicWrite "obligations" r.obligationsDir hex (textBytes (obligationText sAddr))
      | _, _ => pure ()
  -- W3-14: the name is ENCODED on the way to disk. `runVerb` already refused anything
  -- outside `validName`, so the filename here is at most 128 hex characters — the objects
  -- plane's width, which is the cap's purpose.
  | .setName n a =>
      atomicWrite "names" r.namesDir (hexOfName n) (textBytes (hexOfAddr a ++ "\n"))
  | .corrupt a idx mask => do
      -- Below the boundary, deliberately: no temp+rename, no admission. Harness only.
      let hex := hexOfAddr a
      let p := r.objectsDir / hex
      let rel := "objects/" ++ hex
      let raw ← attempt rel (IO.FS.readBinFile p)
      attempt rel (IO.FS.writeBinFile p (byteArrayOfBytes (flipByte (bytesOfByteArray raw) idx mask)))
  | .place plane name kind => do
      -- Below the boundary, deliberately (W3-20): no temp+rename, no admission. Harness
      -- only. The filename alphabet was checked in `runVerb`, so this path cannot leave
      -- the plane's directory and SH3's "under the store root" still holds.
      let dir := r.planeDir plane
      let rel := plane.dirName ++ "/" ++ name
      match kind with
      | .file bs => attempt rel (IO.FS.writeBinFile (dir / name) (byteArrayOfBytes bs))
      | .dir => attempt rel (IO.FS.createDirAll (dir / name))

/-- Run one verb against the disk store: open (read the view), decide with the SAME pure
    `runVerb` the model uses, then perform the authorized writes. A `StoreFault` anywhere
    in that sequence displaces the outcome: the caller gets an environment fault, not a
    verdict it did not earn. -/
def StoreRoot.run (r : StoreRoot) (v : Verb) : IO (Except StoreFault Outcome) := ExceptT.run do
  let view ← ExceptT.mk r.readView
  let (out, effects) := runVerb view v
  for e in effects do r.applyEffect e
  pure out

end Shell
