/-
`estore-encode` — the fixture tool.

STORE-SHELL §5 fixes the CLI's verb set, and §6 allows fixture tooling to sit outside the
shell's own constraints ("a script generator may be an unconstrained separate tool").
This is that tool and nothing more: it turns a carrier literal into the pre-image bytes
`put-schema`/`put-entity` expect, so the CLI is usable by hand and by a shell transcript.
It is not part of the store; no store verb reaches it.

    estore-encode schema      <in.sexp> <out.bin>
    estore-encode entity      <schema-addr> <in.sexp> <out.bin>
    estore-encode schema-raw  <in.sexp> <out.bin>    -- canonicalization deliberately skipped
    estore-encode entity-raw  <schema-addr> <in.sexp> <out.bin>

The `-raw` forms exist to produce input the PUT boundary must REJECT (Q5 canonical-image
strictness); they are how a fixture proves the boundary rejects rather than repairs.
-/
import Shell.Store
import Shell.Script

namespace Shell

open E2 System

private def readSource (p : FilePath) : IO (Except String String) := do
  if ← p.pathExists then
    let raw ← IO.FS.readBinFile p
    pure (.ok (String.ofList ((bytesOfByteArray raw).map (fun b => Char.ofNat b.toNat))))
  else pure (.error s!"no such file: {p}")

private def emitBytes (out : FilePath) (b : Bytes) : IO UInt32 := do
  IO.FS.writeBinFile out (byteArrayOfBytes b)
  IO.println s!"ok {hexOfAddr (H b)} bytes={b.length} -> {out}"
  pure 0

private def oops (msg : String) : IO UInt32 := do
  IO.eprintln s!"estore-encode: {msg}"
  pure 2

def runEncode (argv : List String) : IO UInt32 := do
  match argv with
  | kind :: rest =>
    if kind == "schema" || kind == "schema-raw" then
      match rest with
      | inp :: outp :: [] =>
        match ← readSource ⟨inp⟩ with
        | .error e => oops e
        | .ok src =>
          match parseSchema AddrEnv.empty src with
          | .error e => oops e
          | .ok s => emitBytes ⟨outp⟩ (if kind == "schema" then schemaBytes s else schemaBytesRaw s)
      | _ => oops "usage: estore-encode schema|schema-raw <in.sexp> <out.bin>"
    else if kind == "entity" || kind == "entity-raw" then
      match rest with
      | sa :: inp :: outp :: [] =>
        match addrOfHex sa with
        | none => oops s!"'{sa}' is not a {digestHexChars}-character lowercase hex address"
        | some sAddr =>
          match ← readSource ⟨inp⟩ with
          | .error e => oops e
          | .ok src =>
            match parseValue AddrEnv.empty src with
            | .error e => oops e
            | .ok v =>
                emitBytes ⟨outp⟩
                  (if kind == "entity" then entityBytes sAddr v else entityBytesRaw sAddr v)
      | _ => oops "usage: estore-encode entity|entity-raw <schema-addr> <in.sexp> <out.bin>"
    else oops s!"unknown kind '{kind}' (schema, schema-raw, entity, entity-raw)"
  | [] => oops "usage: estore-encode <schema|schema-raw|entity|entity-raw> ..."

end Shell
