# FINDING-MCP-PATH-001 — fill refusals lose request-body provenance

## Minimized public witness

Run the opt-in red MCP test:

```text
cd proto/ts
$env:FLB_RUN_MCP_PATH_FINDING='1'
bun test test/mcp.test.ts
```

The request calls the public `type_fill` MCP tool with a root hole and this
subtree:

```json
{"k":"struct","fields":{"currency":{"k":"ref","digest":"9999999999999999999999999999999999999999999999999999999999999999"}},"optional":[]}
```

The unresolvable digest entered the request at
`["subtree","fields","currency","digest"]`. The refusal instead reports
`["partial","fields","currency","digest"]`.

## Cause and boundary

`serveFill` first replaces the requested hole, then walks the reconstructed
partial. The walk records only its location in that reconstructed value and
`firstUnknownRef` prefixes it with `partial`; the request-field provenance has
already been discarded. This is not an MCP serialization defect: the MCP reply
is byte-for-value equal to the direct `ProtoClient.fillType` reply, as the
ordinary green wall proves.

Changing the MCP adapter to rewrite the path would violate D23's verbatim-reply
law. Changing the daemon path would redefine the refusal contract and move the
frozen `fill-unknown-ref-refusal` fixture, whose current path is
`["partial","digest"]`. No authority in issue 41 ratifies either change.

## Decision required

1. **Recommended:** ratify request-body-relative refusal paths and authorize a
   daemon/wire/fixture change. The implementation must retain provenance well
   enough to distinguish defects inherited from `partial` from defects newly
   supplied by `subtree`.
2. Ratify reconstructed-partial-relative paths as the public law and document a
   separate mechanical mapping protocol for callers. A simple prefix swap is
   insufficient when the filled path is nested or when the first invalid node
   was already present elsewhere in the submitted partial.
3. Permit an MCP-only translated reply, explicitly superseding D23 for this
   field. This creates two refusal dialects and is not recommended.

The finding remains red and unrepaired until one choice is ratified.
