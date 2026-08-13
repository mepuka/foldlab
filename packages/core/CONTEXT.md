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

**Total by refusal**:
Every fold entry point in this package is total by refusal: an input either
passes the entry point's walled decode or returns its typed refusal, so no value
outside the canonical domain is silently accepted or collapsed and no excluded
value receives an identity.
