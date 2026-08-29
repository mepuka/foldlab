import Cas.Backend.Mcp
import Gate

/-!
# The MCP manifest emitter — `lake exe mcpspec`

Emits the versioned CAS tool manifest (`mcp/cas-tools.json`) — the
R11 interchange document any MCP host implements and any agent reads.
`--check` is the byte-identity gate.
-/

namespace EmitMcpMain

def outPath : System.FilePath := "mcp" / "cas-tools.json"

def fixtures : IO (List Gate.Fixture) :=
  return [⟨outPath, Cas.Backend.Mcp.document,
    s!"{Cas.Backend.Mcp.tools.length} tools"⟩]

end EmitMcpMain

def main := Gate.main "lake exe mcpspec" EmitMcpMain.fixtures
