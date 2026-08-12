# foldlab

Effect v4 + Go lab for verifiable computation over streams: canonical
bytes, digest identity, chained journals, fenced exactly-once registers,
and laws for all of it. Named for the central idea — every stream is a
left fold twice over: hash-fold = identity, state-fold = meaning, and
*the chain remembers what the fold forgives*.

**The claim this repo can back up**: workflows over NATS JetStream whose
histories verify by recomputation, whose contested effects commit exactly
once behind fences, and whose runs export as portable bundles a stranger
can check without trusting anyone. Don't take the README's word:

```bash
cd go
go run ./cmd/gauntletverify ../artifacts/gauntlet/final-alpha
go run ./cmd/transposeverify ../artifacts/transposition/rga-complete
```

Those bundles were produced by 8-process worker fleets over a real
JetStream while an adversary kill-9'd workers and cold-restarted the
server (G1), and while racing a shared frontier with zero duplicate
expansions permitted (RG-A). The verifiers recompute every claim from
the bundle bytes alone. Specs, laws, and ratified results:
[docs/gauntlet/](docs/gauntlet/).

## Layout

- `packages/core` — the TS stream algebra: canonical encoding, chain
  heads, merge facts, entity collector, transforms, and `mint()` (the
  type-creation fence: schemas and transforms enter the world only
  through law-checked, digest-addressed commits to a registry).
- `packages/{mcp,server}` — the agent surface (MCP over the registry)
  and HTTP demos; `packages/{ai,codegen,nats}` reserved.
- `go/stream` — the byte-identical Go mirror of the algebra;
  `fixtures/stream-wall.json` is the frozen cross-language wall.
- `go/{canonical,journal,effector}` — the substrate: RFC 8785 canonical
  JSON, the hash-chained CAS-append verify-on-read journal, the
  single-key fenced effector over JetStream KV (leases are liveness,
  fences are safety), plus `effector.Watch` — the live plane, which is
  chatter, never authority.
- `go/gauntlet` + `go/cmd/{gauntletverify,transposeverify}` — the frozen
  fitness functions for the demonstration rungs.
- `go/{crashstorm,transfleet}` + `go/cmd/{gauntlet,transpose}` — the
  fleets that passed them.
- `docs/research/` — source-pinned dossiers: the NATS agent protocol
  (three wire shapes, one promotion rule) and JetStream's actual
  guarantees at the pinned versions, verified in server source.
- `.reference/` (gitignored, local study material) — theory heritage
  from the playground sessions this lab grew out of.

## Commands

```bash
bun install        # prepare patches TypeScript with the Effect Language Service
bun run typecheck
bun test
cd go && gofmt -l . && go vet ./... && go test ./...
```

Pinned: `effect@4.0.0-beta.107`, `@effect/platform-bun@4.0.0-beta.107`,
Go 1.26, `nats-server v2.14.4`, `nats.go v1.53.1`.

## Discipline

Walls are digest-equality tests between independent implementations;
fixtures are frozen evidence, never constants to update. Laws precede
code; coordinator-owned specs and verifiers are marked frozen in their
headers and are not edited by implementing agents. Every research claim
is either source-pinned (repo, commit, file, line) or marked UNVERIFIED.
