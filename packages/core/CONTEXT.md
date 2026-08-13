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

**Walled boundary behavior**:
Canonical JSON encoding, `applyKV`, ambiguous merge replay, and
fold-identity/cache admission refuse excluded inputs as data or withhold
identity. `kvStep` reports an excluded payload as `undefined`; entity collection
deliberately forgives that payload as a meaning no-op while its identity fold
still commits the bytes. Lower-level canonical writers (`encodeEvent`,
`streamSeed`, `extend`, `stateDigest`, `parseFrames`, and `entitySeed`) retain
their documented thrown range errors; Task 22 does not claim a package-wide
error-channel migration.
