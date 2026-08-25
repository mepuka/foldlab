/-
The CLI (STORE-SHELL §5, v0 verb set exactly).

    estore [--store <dir>] init
    estore [--store <dir>] check
    estore [--store <dir>] order
    estore [--store <dir>] put-schema <file>
    estore [--store <dir>] put-entity <schema-addr> <file>
    estore [--store <dir>] get <addr>
    estore [--store <dir>] resolve <addr>
    estore [--store <dir>] refs <addr>
    estore [--store <dir>] name-set <name> <addr>
    estore [--store <dir>] name-get <name>
    estore [--store <dir>] names

The store root comes from argv (default `.`) because the IO whitelist forbids reading the
environment. `<file>` holds the object's PRE-IMAGE BYTES — the same unit §5's v1 wire
protocol puts on the wire ("body = pre-image") and the same unit §4 stores verbatim. For
`put-entity`, `<schema-addr>` is the caller's declaration and is cross-checked against
the address embedded in the pre-image.

Exit codes: 0 success; 1 rejection, not-found, or a failed store verification; 2 a usage
or environment fault (bad arguments, uninitialized store, unreadable input file, or a
`StoreFault` from the store itself). For `check` that is the three-way verdict contract
of §5, and all three legs are reachable (F-42, ruling W3-15): 0 checked and clean, 1
checked and violations found, 2 COULD NOT CHECK. Before W3-15 the third leg existed only
in this comment — an exception thrown inside `readView` propagated past `fail`, past
`emit`, past a `main` with no handler, and Lean exited 1, so "checked and found bad" and
"could not check at all" were the same observable.

Observables go to stdout, faults to stderr, and stdout is byte-identical across identical
invocations.
-/
import Shell.Store

namespace Shell

open E2 System

def usageLines : List String :=
  [ "usage: estore [--store <dir>] <verb> [args]"
  , ""
  , "verbs:"
  , "  init                              create the store planes"
  , "  check                             verification-on-open; exit code is the verdict"
  , "  order                             the emitted topological order, sinks first"
  , "  put-schema <file>                 admit a schema pre-image"
  , "  put-entity <schema-addr> <file>   admit an entity pre-image"
  , "  get <addr>                        the stored pre-image bytes, as hex"
  , "  resolve <addr>                    the decoded carrier"
  , "  refs <addr>                       the references the object carries"
  , "  name-set <name> <addr>            bind a name"
  , "  name-get <name>                   read a name"
  , "  names                             every binding, decoded, in canonical order" ]

private def fail (msg : String) : IO UInt32 := do
  IO.eprintln s!"estore: {msg}"
  pure 2

private def emit (out : Outcome) : IO UInt32 := do
  for l in out.lines do IO.println l
  pure (UInt32.ofNat out.code)

private def readAddrArg (s : String) : Except String Address :=
  match addrOfHex s with
  | some a => .ok a
  | none => .error s!"'{s}' is not a {digestHexChars}-character lowercase hex address"

private def readBytesArg (p : FilePath) : IO (Except String Bytes) := do
  if ← p.pathExists then
    let raw ← IO.FS.readBinFile p
    pure (.ok (bytesOfByteArray raw))
  else pure (.error s!"no such file: {p}")

/-- Run a verb that requires an opened store. A `StoreFault` is one stderr line and
    exit 2 — the environment channel, never a verdict. -/
private def onStore (r : StoreRoot) (v : Verb) : IO UInt32 := do
  if !(← r.isInitialized) then fail s!"store-not-initialized at {r.path} (run `init` first)"
  else
    match ← r.run v with
    | .error f => fail f.render
    | .ok out => emit out

def runCli (argv : List String) : IO UInt32 := do
  let (rootPath, rest) :=
    match argv with
    | "--store" :: d :: tl => ((⟨d⟩ : FilePath), tl)
    | tl => ((⟨"."⟩ : FilePath), tl)
  let r : StoreRoot := ⟨rootPath⟩
  match rest with
  | [] => do for l in usageLines do IO.eprintln l
             pure 2
  | "init" :: [] => do
      match ← r.init with
      | .error f => fail f.render
      | .ok _ => do
          IO.println s!"ok initialized {rootPath}"
          pure 0
  | "check" :: [] => onStore r .check
  -- W3-12: the order Kahn's emits is M19's witness. `check`'s transcript is untouched;
  -- the observable is additive, which is why it is a verb and not a line in the report.
  | "order" :: [] => onStore r .order
  | "put-schema" :: file :: [] => do
      match ← readBytesArg ⟨file⟩ with
      | .error e => fail e
      | .ok b => onStore r (.putSchema b)
  | "put-entity" :: sa :: file :: [] => do
      match readAddrArg sa with
      | .error e => fail e
      | .ok sAddr =>
        match ← readBytesArg ⟨file⟩ with
        | .error e => fail e
        | .ok b => onStore r (.putEntity sAddr b)
  | "get" :: a :: [] =>
      match readAddrArg a with
      | .error e => fail e
      | .ok addr => onStore r (.get addr)
  | "resolve" :: a :: [] =>
      match readAddrArg a with
      | .error e => fail e
      | .ok addr => onStore r (.resolve addr)
  | "refs" :: a :: [] =>
      match readAddrArg a with
      | .error e => fail e
      | .ok addr => onStore r (.refs addr)
  | "name-set" :: n :: a :: [] =>
      match readAddrArg a with
      | .error e => fail e
      | .ok addr => onStore r (.nameSet n addr)
  | "name-get" :: n :: [] => onStore r (.nameGet n)
  -- W3-14: `names/` holds hex filenames, so `ls` no longer reads as a name list. This verb
  -- is the inspectability the hex encoding costs, bought back — and it is a verb rather
  -- than a line in `check` for the same reason `order` is: the transcript stays untouched.
  | "names" :: [] => onStore r .names
  | v :: _ => do
      IO.eprintln s!"estore: unknown verb or wrong arity: {v}"
      for l in usageLines do IO.eprintln l
      pure 2

end Shell
