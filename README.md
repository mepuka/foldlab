# foldlab

Effect v4 + Go lab for stream algebra: chain identity, meaning folds, merge
facts, forks, compaction, and schemas as language boundaries. Named for the
central idea — every stream is a left fold twice over: hash-fold = identity,
state-fold = meaning, and *the chain remembers what the fold forgives*.

Born from the playground-mech model-gate sessions (2026-08-11/12); the theory
compilation is [.reference/core-concepts.md](.reference/core-concepts.md) and
the proofs behind it are mirrored in `.reference/playground-mech/`.

## Layout

- `src/stream.ts` — the stream algebra (canonical encoding, SHA-256 chain
  heads, merge facts, LWW-KV fold, compaction, fork segments).
- `src/schema.ts` — the Schema workshop: `GzipEventFrame`, a schema whose
  encoded side is the Go-emitted gzip wire frame and whose type side is
  typed events. The Go boundary as a bidirectional, effect-capable
  transformation.
- `src/server.ts` — HTTP app (effect/unstable/http on @effect/platform-bun):
  `GET /health`, `GET /demo/merge` (law SL1 live), `GET /demo/fork`.
- `go/stream` — the byte-identical Go mirror; `go/cmd/streamfix` generated
  the frozen wall fixture in `fixtures/stream-wall.json` (P2a tradition:
  generated once; a digest mismatch is a drift finding, not a repin).
- `test/` — the cross-language wall (every digest byte-identical to Go) and
  the schema-boundary proof (Go frame → schema decode → chain head equals
  the frozen Go digest).

## Commands

```bash
bun install        # prepare patches TypeScript with the Effect Language Service
bun run typecheck
bun test
bun run dev        # http://localhost:3123
cd go && gofmt -l . && go vet ./... && go test ./...
```

Pinned: `effect@4.0.0-beta.107`, `@effect/platform-bun@4.0.0-beta.107`, Go 1.26.
