# FINDING-MCP-001 — raw-schema MCP tools do not validate their advertised inputs

Status: **STOPPED before implementation**

Date: 2026-08-13

Pin: `effect@4.0.0-rc.108`

Base: `d243cf871aabd7f2eb32bcd97a65ade6fb4116de`

## Finding

Issue #16's correction says the pinned MCP server validates tool-call
arguments and maps a `ToolParameterValidationError` to MCP `InvalidParams`
before invoking the handler. That statement is true when a tool's parameters
are an Effect Schema, but it is false for foldlab's derived-tool seam.

`proto/ts/src/mcp.ts` gives `Tool.dynamic` the raw JSON Schema returned by
`contract.describe`. At the pin, `Tool.dynamic` explicitly documents that a
raw JSON Schema is untyped and receives no validation. Its constructor stores
the raw schema for advertisement but sets `parametersSchema` to
`Schema.Unknown` (`repos/effect/packages/effect/src/unstable/ai/Tool.ts`).
`Toolkit` therefore decodes with `Schema.Unknown`, succeeds, and dispatches the
handler. The `ToolParameterValidationError` to `InvalidParams` branch in
`McpServer` is real but unreachable for this malformed call.

This is also the behavior already recorded by `proto/DECISIONS.md` D22 and its
pin findings. It supports, rather than corrects, the severity bound in
`docs/research/2026-08-13-external-review-findings.md` C3.

## Minimized public-seam counterexample

1. Initialize the real stdio MCP subprocess against a real protod.
2. Call `tools/list`. The served `type_create.inputSchema.required` contains
   `"structure"`.
3. Call `tools/call` for `type_create` with `arguments: {}`.

If the served schema were enforced, step 3 would return JSON-RPC error code
`-32602` and would not invoke the handler. Instead it invokes protod and
returns a successful MCP result envelope:

```json
{
  "jsonrpc": "2.0",
  "id": 102,
  "result": {
    "structuredContent": {
      "ok": false,
      "refusal": {
        "kind": "malformed",
        "path": ["structure"]
      }
    },
    "isError": false
  }
}
```

The opt-in regression in `test/mcp.test.ts` pins this at the public JSON-RPC
seam. Its independent control first observes the required property in the
server's own advertised schema, then requires `InvalidParams`. Run it from
`proto/ts` on PowerShell with:

```powershell
$env:FLB_RUN_MCP_INPUT_FINDING = "1"
bun test test/mcp.test.ts -t "FINDING-MCP-001"
```

The ordinary suite skips the preserved-red finding. The preexisting live-wall
test remains green, so the failure is confined to schema enforcement:

```text
(fail) MCP rejects arguments that violate the served input schema before dispatch
Expected: -32602
Received: undefined

(pass) tool schemas are derived from contract.describe, and refusals are data in results
```

## Issue #16 subfinding audit

- F1 (top-level output envelope) and F2 (exact digest-URI handling) are already
  owned and completed by Task 29 / issue #17, commit
  `7a1b75e93a1e088c7d4d2212826fc36729f0aa95`. This lane did not duplicate them.
- F3 has no live foldlab surface: no resources are registered and no
  `EnabledWhen` or per-connection list filtering is used. Task 29 additionally
  pins `resources/list` to the exact empty set.
- F4 remains a standing pin constraint: foldlab selects
  `McpProtocol.v2025_06_18`, but uses no MCP transport sessions,
  subscriptions, server requests, or sampling. Durable state remains in the
  journal as required by `proto/CONTEXT.md`.

## Disposition required

The coordinator must ratify which trust boundary is intended before this red
test can be repaired:

1. Preserve D22's daemon-as-validator model and correct issue #16 plus the MCP
   deep-read statement. The MCP schema is then advisory, and the test should
   explicitly require the daemon's typed refusal rather than `InvalidParams`.
2. Convert the contract-derived JSON Schema to an equivalent Effect Schema and
   prove the two representations cannot drift before using it as
   `parametersSchema`.
3. Add an explicit JSON-Schema validator at the MCP boundary, with its
   dependency, supported dialect, error mapping, and independent equivalence
   gate ratified first.

No production code or coordinator-owned specification was changed.
