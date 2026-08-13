# foldlab

Verifiable computation over streams. Every value has a canonical byte
form, identity is a digest over those bytes, and every cross-boundary
claim — TS ≡ Go, batch ≡ stream, native ≡ wasm — is proven by digest
equality over frozen fixtures, never by trusting a port. A Go daemon
owns the runtime (embedded NATS, hash-chained journal, fenced
exactly-once effector); TypeScript is the typed authoring face.

Glossary: [CONTEXT.md](CONTEXT.md) · design state: [NEXT.md](NEXT.md) ·
decisions: [docs/adr/](docs/adr/) · agent contract: [AGENTS.md](AGENTS.md)

## Verify

```bash
bun run typecheck && bun test
cd go && gofmt -l . && go vet ./... && go test ./...
```

Don't take the README's word — recompute a fleet run's claims from its
bundle bytes alone:

```bash
cd go && go run ./cmd/gauntletverify ../artifacts/gauntlet/final-alpha
```

Pinned: `effect@4.0.0-rc.108` ([source tag](https://github.com/Effect-TS/effect/tree/effect%404.0.0-rc.108)),
Go 1.26, `nats-server v2.14.4`, `nats.go v1.53.1`.
