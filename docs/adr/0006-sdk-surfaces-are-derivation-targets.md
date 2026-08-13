# External surfaces are derivation targets, never hand-written ports

Anything that re-expresses a cataloged schema for an outside consumer — the
Go twin of a transform, the Vercel AI SDK tool shape (via
Schema.toStandardSchemaV1), the Anthropic/MCP JSON Schema, DuckDB DDL — is
generated from the same declaration and verified by wall, never written by
hand. The effect-native layer (effect/unstable/ai Tool/Toolkit/McpServer)
is first-class; everything else is an adapter that cannot drift because it
is derived. This also fences the v4-beta rename risk: an upstream API
rename can cost us an adapter layer, never a catalog entry or a digest.
