import Cas.Backend.Mcp

/-!
# The MCP manifest emitter — `lake exe mcpspec`

Emits the versioned CAS tool manifest (`mcp/cas-tools.json`) — the
R11 interchange document any MCP host implements and any agent reads.
`--check` is the byte-identity gate.
-/

def outPath : System.FilePath := "mcp" / "cas-tools.json"

def main (args : List String) : IO Unit := do
  match args with
  | [] =>
    IO.FS.createDirAll "mcp"
    IO.FS.writeFile outPath Cas.Backend.Mcp.document
    IO.println s!"wrote {outPath} ({Cas.Backend.Mcp.tools.length} tools)"
  | ["--check"] =>
    let actual ← try IO.FS.readFile outPath
      catch _ => throw (IO.userError s!"{outPath} missing — run `lake exe mcpspec`")
    unless actual == Cas.Backend.Mcp.document do
      throw (IO.userError s!"{outPath} differs from regeneration — run `lake exe mcpspec`")
    IO.println s!"ok {outPath} ({Cas.Backend.Mcp.tools.length} tools)"
  | _ => throw (IO.userError "usage: lake exe mcpspec [--check]")
