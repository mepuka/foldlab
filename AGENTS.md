# AGENTS.md — operating contract for coding agents in foldlab

Effect v4 (TypeScript/Bun) + Go lab. Streams are left folds twice over:
folded with a hash you get IDENTITY (chain heads), folded with a state
function you get MEANING. Every cross-language claim is a passing
digest-equality test ("wall"), never a trusted port.

## Gates — ALL must be green before you are done

```
bun run typecheck        # tsc --noEmit
bun test                 # includes the cross-language walls
cd go && gofmt -l .      # must print NOTHING
cd go && go vet ./...
cd go && go test ./...
```

Optional (auto-skips when absent): `bun run build:wasm && bun test` builds
the wasm wall into gitignored `dist/`.

## Benchmarks

Protocol lives in `bench/BENCH.md` — read it before making any performance
claim. Short form: `bun run bench:go -- --save before` on the base, your
change, `--save after`, then `bun run bench:compare -- before after`; only
benchstat-significant deltas count, allocations are the metric, results are
machine-specific and never committed (`bench/results/` is gitignored).
Go benches live in `go/stream/bench_test.go` (deterministic corpora only),
TS + wasm-boundary benches in `bench/stream.bench.ts` (mitata).

Host is Windows; use forward slashes in paths, and don't assume a POSIX
shell in package.json scripts (Bun's shell is fine).

## The one hard rule

`fixtures/stream-wall.json` is FROZEN. It was generated once by
`go/cmd/streamfix`. If your change makes a digest mismatch, your change is
wrong — the default reading is port drift; investigate your code, never
edit the fixture. Regeneration requires a stated reason committed with the
change, and is almost never the answer.

Canonical encodings are pinned byte-for-byte in BOTH `go/stream/stream.go`
and `src/stream.ts`:

```
enc(event)  = len(stream) u16 BE || stream utf8 || seq u64 BE || len(payload) u32 BE || payload
seed(s)     = SHA-256("playground.stream.v1:" + s)
extend(h,e) = SHA-256(h || enc(e))
```

Change one side and you must change the other identically — and then the
frozen fixture will tell you whether you actually did.

## Layout

- `src/stream.ts` ≡ `go/stream/stream.go` — the value wall (heads, merge,
  fold, compaction, fork, gzip transport).
- `src/xform.ts` ≡ `go/stream/transform.go` — the transform wall (fused
  per-event pipelines; `null`/`ok=false` drops).
- `src/schema.ts` — the Go wire frame as an Effect Schema (decode =
  ingestion from Go).
- `src/entity.ts` — entities as quotients by correlation key.
- `src/streamBindings.ts` — Effect Stream orchestration; chunking is
  transport and provably never moves a head.
- `go/cmd/wasmwall` + `test/wasm.wall.test.ts` — same Go source compiled to
  wasm, run in Bun, same digest. Boundary is data (frames in, JSON out).
- `test/*.wall.test.ts` — the walls. `NEXT.md` — design state and ratified
  decisions. `SLICE-*.md` — scoped, self-contained task briefs.

## Effect v4 — trust the pin, not your memory

Pinned exact: `effect@4.0.0-beta.107`. v4 betas rename APIs between
releases; ALWAYS confirm exports against `node_modules/effect/dist/*.d.ts`
before using them. Known quirks at this pin: `Effect.reduce` takes a lazy
zero (`() => z`); `Bun.gzipSync`/`gunzipSync` want a fresh
`new Uint8Array(...)`; on refined schemas read annotations via
`SchemaAST.resolve`/`resolveAt` (reading `ast.annotations` directly returns
undefined once checks exist).

## Style

- Comments state what a law witnesses or a constraint the code can't show —
  never narrate the code. Match the density and voice of the file you're in.
- Go: stdlib only (`go.mod` has zero requires — keep it that way unless the
  task brief says otherwise). Value semantics; no channels in per-event hot
  paths; gofmt is law.
- TS: no new runtime deps without the task brief saying so.
- Tests are laws: name them for the property they witness, and prefer
  digest equality over structural assertion.
