# foldlab

Effect v4 + Go lab. `bun run typecheck && bun test` and the Go gate
(`cd go && test -z "$(gofmt -l .)" && go vet ./... && go test ./...`) must
stay green.

## Effect v4

- Pinned exact: `effect@4.0.0-beta.107`, `@effect/platform-bun@4.0.0-beta.107`.
  v4 betas rename APIs between releases — confirm exports against
  `node_modules/effect/dist/*.d.ts` before use.
- The Effect v4 source is cloned at
  `~/.local/share/effect-solutions/effect` for reference; it tracks tip and
  may be NEWER than the pin.
- Guides: https://github.com/kitlangton/effect-solutions
  (`packages/website/docs`). The `effect-solutions` CLI has no win32 binary.
- HTTP is `effect/unstable/http`; runtime layers from `@effect/platform-bun`;
  Schema is `effect/Schema` + `SchemaGetter`/`SchemaIssue` (v4 rewrite —
  Getters are effectful; `decodeEffect` carries `DecodingServices`).
- Known pin quirks: `Effect.reduce` takes a LAZY zero (`() => z`);
  `Bun.gzipSync`/`gunzipSync` want `Uint8Array<ArrayBuffer>` (wrap with
  `new Uint8Array(...)`).

## The wall discipline

`fixtures/stream-wall.json` was generated ONCE by `go/cmd/streamfix` and is
frozen. TS must reproduce every digest byte-identically (`bun test`). On
mismatch, the DEFAULT reading is that a port drifted — investigate; never
repin without a stated reason. Canonical encodings are pinned in
`go/stream/stream.go` and `src/stream.ts` (they must match, byte for byte).

## Reference

`.reference/core-concepts.md` is the theory compilation;
`.reference/playground-mech/` mirrors the proof work (TLA+/Apalache model
gate, effector theorems, mech checker) this lab builds on. Read-only.
