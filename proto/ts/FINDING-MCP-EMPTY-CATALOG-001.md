# FINDING-MCP-EMPTY-CATALOG-001 — fill overwrites unknown-ref resolver hints

## Minimized public witness

Run the opt-in red MCP test against a fresh daemon whose catalog has no
resolvable digest:

```text
cd proto/ts
$env:FLB_RUN_MCP_EMPTY_CATALOG_FINDING='1'
bun test test/mcp.test.ts
```

The request fills a root hole with an unknown ref. `firstUnknownRef` constructs
three relevant subjects: create the referenced type, retry the fill, and read
the catalog. `serveFill` then passes that refusal through `teachFill`, which
replaces its hints with:

```json
[
  {"subject":"flb.req.type.fill","body":"<the byte-for-value identical failing request>"},
  {"subject":"flb.req.contract.describe","body":{}}
]
```

The ordinary green MCP wall replays the first hint through the new structural
subject-to-tool mapping and proves that it returns the same refusal value.

## Boundary and decision required

The frozen `fill-unknown-ref-refusal` concierge vector pins the overwritten
retry/describe reply. Issue 41 authorizes no fixture regeneration, and the
separate central repair deliberately addresses only the populated-catalog case
without moving this vector. Therefore this branch does not change daemon,
wire, fixture, or reply behavior.

1. **Recommended:** authorize a wire/fixture change that preserves the
   unknown-ref resolver hints through `teachFill` and `teachUnfill`, then state
   what a create hint may truthfully offer when the missing referenced
   structure itself is not known.
2. Keep the frozen empty-catalog behavior and explicitly weaken W7 for a
   reference whose target structure is absent; the reply can identify routes
   but cannot synthesize the missing type.
3. Add an MCP-only repair plan. This would violate D23's verbatim-reply law and
   is not recommended.

The finding remains red and unrepaired until one choice is ratified.
