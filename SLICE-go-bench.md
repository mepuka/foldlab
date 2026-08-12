# Slice: benchmark suite for go/stream

Self-contained task for an external agent. Everything you need is in this
file plus the two Go source files named below.

## Context

Repo: `foldlab` — an Effect v4 (TypeScript/Bun) + Go lab. The Go side,
`go/stream/` (package `stream`, module `foldlab`), implements an event-stream
algebra: canonical event encoding, SHA-256 chain heads, merge facts, a KV
fold, compaction, fork/replay, gzip transport (`stream.go`), and fused
per-event transforms (`transform.go`). Read both files before writing code.

Two claims in the source comments currently have no numbers behind them:

1. `transform.go`: "Fusion is the efficiency claim: a pipeline of N
   transforms costs one traversal and zero intermediate streams."
2. The repo's operating notes: "Benchmarks live next to laws
   (`go test -bench -benchmem`; watch allocations, not cycles)."

Your job is to supply the numbers.

## Task

Create **one new file**: `go/stream/bench_test.go` (package `stream`, same
package as the code — not `stream_test`). Benchmarks, using a deterministic
corpus (no randomness, no time-based seeds), covering:

- `EncodeEvent` — small (8B) and large (4KiB) payloads.
- `Extend` and `HeadFrom` — chain-head fold; sub-benchmarks over batch
  sizes 100 / 10_000 events.
- **Fused vs sequential** (the headline): `Apply(Compose(f, g, h), events)`
  vs `Apply(h, Apply(g, Apply(f, events)))` with
  `f, g, h = RenameStream("z"), FilterKeyPrefix("a"), MapValueUpper()`,
  same corpus, sub-benchmarks over 100 / 10_000 events. Report both so the
  allocation difference is visible in one output block.
- `ApplyMerge` — 10_000 picks over two source streams.
- `FoldKV` + `StateDigest` — 10_000 key=value events, 100 distinct keys.
- `GzipEvents` / `GunzipEvents` — round trip, 1_000 events.

Conventions:

- Corpus builders are plain helpers at the top of the file; build corpora
  OUTSIDE the timed loop and call `b.ReportAllocs()` in every benchmark
  (allocations are the metric of interest, not cycles).
- Use `b.Run` sub-benchmarks for size variants; name them by size
  (`"n=100"`, `"n=10000"`).
- Payloads must be `key=value` shaped where a benchmark exercises
  `FilterKeyPrefix`/`MapValueUpper`/`FoldKV` (see `KV.Apply` for the format).
- Match the existing comment style: sparse, stating what the benchmark
  witnesses, not narrating the code.

## Hard constraints

- **New file only.** Do not modify any existing file. Do not add
  dependencies (`go.mod` untouched). Go stdlib + `testing` only.
- **Never touch `fixtures/stream-wall.json`** — it is a frozen
  cross-language fixture; nothing in this task needs it.
- No TypeScript changes; this slice is Go-only.

## Acceptance

From `go/`:

```
gofmt -l .            # must print nothing
go vet ./...          # must pass
go test ./...         # must stay green
go test -bench=. -benchmem ./stream   # all benchmarks run
```

Paste the full `-bench` output into your summary, with one sentence on the
fused-vs-sequential delta (ns/op and allocs/op).
