# packages/core — module vocabulary

Local terms hidden behind this seam. The public language is root
[CONTEXT.md](../../CONTEXT.md); nothing here may leak into it.

**Twin**:
The TS implementation of an algebra whose reference lives in Go. A twin
exists to make the wall provable — it earns byte-identical digests or
it is wrong; it never diverges "for TS convenience".

**Frame fixture**:
The frozen Go-generated gzip frame (`fixtures/stream-wall.json`, via
`go/cmd/streamfix`) that `schema.wall.test.ts` decodes: Go→TS ingestion
typed by a schema, judged by decoded values and heads, never compressed
bytes.

**Walled refusal seams**:
Canonical JSON encoding, entity collection/composition, ambiguous merge replay,
and fold-identity/cache admission refuse excluded inputs as data or withhold
identity. Lower-level canonical writers (`encodeEvent`, `streamSeed`, `extend`,
`stateDigest`, `parseFrames`, and `entitySeed`) retain their documented thrown
range errors; Task 22 does not claim a package-wide error-channel migration.
