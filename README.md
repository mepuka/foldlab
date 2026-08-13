# foldlab

foldlab is a lab for verifiable computation over streams, built with
Effect (TypeScript) and Go. Every value has one canonical byte form,
and a value's identity is a SHA-256 digest over those bytes, so any
claim — a type's identity, a history's head, a cross-language port's
equivalence — can be recomputed by anyone rather than taken on trust.
Equivalence between implementations (TypeScript ≡ Go, batch ≡ stream,
native ≡ wasm) is established by digest equality over frozen fixtures.

A Go daemon owns the runtime: an embedded NATS server, a hash-chained
append-only journal, a content-addressed type catalog, and the
effector — a single-key commitment register whose safety is a
machine-checked theorem (Apalache inductive invariant, unbounded;
15,378 schedules replayed in lockstep against the running Go). The
catalog and ingress protocol are model-checked with TLC: 12,707,989
distinct states at the gate bounds, four invariants held, four
sabotaged variants refuted on exactly the law each dropped. TypeScript
is the authoring adapter: Effect Schema types what crosses the seam,
agents author types directly over MCP, and the client's whole surface
is three verbs — read, publish, request.

Glossary: [CONTEXT.md](CONTEXT.md) · design state: [NEXT.md](NEXT.md) ·
decisions: [docs/adr/](docs/adr/) · verification ladder:
[docs/map/tickets/009](docs/map/tickets/009-the-verification-ladder.md) ·
agent contract: [AGENTS.md](AGENTS.md)

## How to verify the claims

The test gates:

```bash
bun run typecheck && bun test
cd go && gofmt -l . && go vet ./... && go test ./...
```

The catalog model gate reruns the TLC check from scratch (fetches the
pinned tla2tools; needs Java 21):

```bash
verify/catalog/run.sh
```

A fleet run's claims recompute from its bundle bytes alone:

```bash
cd go && go run ./cmd/gauntletverify ../artifacts/gauntlet/final-alpha
```

Pinned: `effect@4.0.0-rc.108` ([source tag](https://github.com/Effect-TS/effect/tree/effect%404.0.0-rc.108)),
Go 1.26, `nats-server v2.14.4`, `nats.go v1.53.1`.
