# proto/ — tracer bullet contract (builder-written; SPEC.md is coordinator-owned)

Read `SPEC.md` first — it is the behavioral spec and must not be
edited. This file states the bullet's enforceable laws and the
graduation map. Vocabulary lives in `CONTEXT.md`; every decision the
spec did not fix is logged in `DECISIONS.md`.

## Laws (each is a test; see SPEC.md W1–W10 for the full sentences)

- No asserted identity: the daemon re-derives every digest it commits
  (`proto/go/protod/conformance_test.go`).
- Refusals are data everywhere: daemon replies, client-local
  conditions, author-fold rejections, MCP tool results — one uniform
  shape, `local` marking the side that uttered it. Nothing throws
  across any seam.
- The writ is three verbs (read / publish / request). The session
  facade and the MCP tools compose them and add no capability.
- Application connections occupy private NATS accounts. Their service imports
  expose only the writ; an inbox subscription sees only replies mapped into
  that connection's account, never another client's or the daemon's JetStream
  control traffic.
- Heads are claims: every read is verified by the reader
  (`ProtoClient.read` folds locally; the Go conformance test refolds).
- `proto/wire/fixtures/` is FROZEN — generated once by `cmd/wirefix`.
  A digest mismatch means a port drifted; never edit a fixture.
- The MCP tool surface is derived from `contract.describe` at startup;
  there is no hand-written tool list to drift.
- Concierge laws C1-C5 are walls: fill/unfill are pure, unfill is the
  same-path inverse of fill, frontier-empty exactly matches create
  acceptance, advertised examples never dead-end, and holes never bear
  identity (`go/protod/conformance_test.go`, `ts/test/concierge.test.ts`).
- Derivation targets agree or refuse together (D46 disposition): for
  any structure, every target derives, or every target refuses AT THE
  SAME PATH. The property quantifies over every pair of CURRENT AND
  FUTURE targets — a new target joins the law, it does not get an
  exemption. A sketch target may be imprecise about which legal inputs
  it represents; it may never admit an illegal one, so it recursively
  validates children it does not represent (D47).
- One traversal orders every target (D48 disposition, D49): object
  fields are walked through `fieldNamesInIdentityOrder` — identity's
  RFC 8785 UTF-16 code-unit order, never a locale sort. One ordering
  law for identity and evidence; a target that sorts anywhere else
  reintroduces construction history into refusal paths, which is the
  exact defect D48 found.

## Gates

```
cd proto/go && gofmt -l .        # prints nothing
cd proto/go && go vet ./... && go test ./...
cd proto/ts && bun install && bunx tsc --noEmit && bun test .
```

Root gates must stay untouched and green (`bun run typecheck`,
`bun test`, the Go gate in `go/`). Tracer data is disposable: all
JetStream stores live in temp dirs; nothing outside `proto/` is
written.

## Layout

- `wire/` — CONTRACT.md (the seam as data) + frozen byte fixtures.
- `go/` — module `foldlab/proto` (`replace foldlab => ../../go`).
  Public API: `protod.Acquire/URL/Release` — lifecycle only. Internal
  seams: dispatch, catalog, walk (flb.type.v0 + partials), concierge,
  ingress, read (journal.read as a request kind, D2), refusal,
  scheme (W10), contract. `cmd/protod` (ready line on stdout, serves
  until stdin closes), `cmd/wirefix` (fixture generator, run once).
- `ts/` — package `@foldlab/proto` (effect 4.0.0-rc.108 exact +
  `@nats-io/transport-node`, nothing else). `src/jcs.ts` (RFC 8785 +
  chain fold), `src/wire.ts` (Schema faces), `src/client.ts` (the
  writ), `src/author.ts` (Effect Schema → flb.type.v0, partial),
  `src/codegen.ts` (effect-schema / json-schema / go targets),
  `src/mcp.ts` + `src/mcp-main.ts`, `src/session.ts` (transcript
  sugar). Tests: fixture wall, author fold, round-trip wall, MCP wall,
  concierge wall, end-to-end smoke thread. `wire/fixtures/concierge.json`
  pins public fill/unfill request and reply bytes, including refusals.

## Graduation map (no-redesign claim)

go/ → `go/daemon` + `go/cmd`; ts/client → `packages/client`;
ts/author → `packages/core`; ts/codegen → `packages/codegen`;
ts/mcp → `packages/ai`; wire fixtures → `fixtures/`.
