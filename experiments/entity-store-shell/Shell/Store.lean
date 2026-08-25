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

No clock, no randomness, no environment read, no network — none of those appear here or
anywhere else in the package. Every object write is temp-file-then-atomic-rename
(`objects/.tmp-<hex>`, then `IO.FS.rename`); names and obligation records go the same
way, since the names plane is mutable.

Layout (§4):

    <root>/objects/<hex>        pre-image bytes, verbatim; filename = hex of H of content
    <root>/names/<name>         one address per file — the mutable plane
    <root>/obligations/<hex>    the SH6 accepted-`Conforms` record, one per entity object
-/
import Shell.Verbs

namespace Shell

open E2 System

structure StoreRoot where
  path : FilePath

def StoreRoot.objectsDir (r : StoreRoot) : FilePath := r.path / "objects"
def StoreRoot.namesDir (r : StoreRoot) : FilePath := r.path / "names"
def StoreRoot.obligationsDir (r : StoreRoot) : FilePath := r.path / "obligations"

def tmpPrefix : String := ".tmp-"

/-- `init`: create the three planes. Idempotent. -/
def StoreRoot.init (r : StoreRoot) : IO Unit := do
  IO.FS.createDirAll r.objectsDir
  IO.FS.createDirAll r.namesDir
  IO.FS.createDirAll r.obligationsDir

def StoreRoot.isInitialized (r : StoreRoot) : IO Bool := do
  pure ((← r.objectsDir.pathExists) && (← r.namesDir.pathExists)
          && (← r.obligationsDir.pathExists))

/-- Write bytes at `dst` through a temp file in the same directory, then rename. The
    rename is the commit point; a reader never sees a partial object. -/
private def atomicWrite (dir : FilePath) (name : String) (bytes : ByteArray) : IO Unit := do
  let tmp := dir / (tmpPrefix ++ name)
  IO.FS.writeBinFile tmp bytes
  IO.FS.rename tmp (dir / name)

private def textBytes (s : String) : ByteArray := s.toUTF8

/-- Read an address out of a text file's bytes: the content up to the first whitespace,
    read as ASCII, must be exactly the digest hex. Total — never panics on odd bytes. -/
private def addrOfFileBytes (bs : Bytes) : Option Address :=
  let body := bs.takeWhile (fun b => b != 0x0a && b != 0x0d && b != 0x20 && b != 0x09)
  addrOfHex (String.ofList (body.map (fun b => Char.ofNat b.toNat)))

/-! ## Reading the store -/

/-- Materialize the store view: read every object, name, and obligation record.
    Verification is NOT done here — `checkReport` decides, this only reads. A file whose
    name (or, for names, whose content) is not what the layout admits is reported as a
    stray, including a `.tmp-` file left behind by an interrupted write. -/
def StoreRoot.readView (r : StoreRoot) : IO StoreView := do
  let mut objects : List (Address × Bytes) := []
  let mut strayObjects : List String := []
  for e in ← r.objectsDir.readDir do
    let fn := e.fileName
    match addrOfHex fn with
    | none => strayObjects := ("objects/" ++ fn) :: strayObjects
    | some a =>
        let raw ← IO.FS.readBinFile e.path
        objects := (a, bytesOfByteArray raw) :: objects
  let mut names : List (String × Address) := []
  let mut strayNames : List String := []
  for e in ← r.namesDir.readDir do
    let fn := e.fileName
    if !validName fn then strayNames := ("names/" ++ fn) :: strayNames
    else
      let raw ← IO.FS.readBinFile e.path
      match addrOfFileBytes (bytesOfByteArray raw) with
      | none => strayNames := ("names/" ++ fn) :: strayNames
      | some a => names := (fn, a) :: names
  let mut obligations : List Address := []
  for e in ← r.obligationsDir.readDir do
    match addrOfHex e.fileName with
    | none => strayObjects := ("obligations/" ++ e.fileName) :: strayObjects
    | some a => obligations := a :: obligations
  pure (StoreView.normalize
    { objects, names, obligations, strayObjectFiles := strayObjects, strayNameFiles := strayNames })

/-! ## Writing -/

/-- The SH6 record. Its IDENTITY is the filename (the entity's address); the content is
    an informational line naming the schema. `check` derives what it prints from the
    stored object bytes, never from this content, so the two runners cannot diverge over
    it. -/
private def obligationText (sAddr : Address) : String :=
  s!"conforms-unverified {hexOfAddr sAddr}\n"

def StoreRoot.applyEffect (r : StoreRoot) : Effect → IO Unit
  | .putObject a b kind => do
      let hex := hexOfAddr a
      -- Append-only: an object already present is already these exact bytes (WF1).
      if !(← (r.objectsDir / hex).pathExists) then
        atomicWrite r.objectsDir hex (byteArrayOfBytes b)
      match kind, classify b with
      | .entity, some (.entity sAddr _) =>
          if !(← (r.obligationsDir / hex).pathExists) then
            atomicWrite r.obligationsDir hex (textBytes (obligationText sAddr))
      | _, _ => pure ()
  | .setName n a => atomicWrite r.namesDir n (textBytes (hexOfAddr a ++ "\n"))
  | .corrupt a idx mask => do
      -- Below the boundary, deliberately: no temp+rename, no admission. Harness only.
      let p := r.objectsDir / hexOfAddr a
      let raw ← IO.FS.readBinFile p
      IO.FS.writeBinFile p (byteArrayOfBytes (flipByte (bytesOfByteArray raw) idx mask))

/-- Run one verb against the disk store: open (read the view), decide with the SAME pure
    `runVerb` the model uses, then perform the authorized writes. -/
def StoreRoot.run (r : StoreRoot) (v : Verb) : IO Outcome := do
  let view ← r.readView
  let (out, effects) := runVerb view v
  for e in effects do r.applyEffect e
  pure out

end Shell
