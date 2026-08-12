# Benchmarking protocol

Benchmarks live next to laws: the walls say WHAT the algebra does, the
benchmarks say what it costs. The metric of interest is **allocations, not
cycles** — allocation slope is stable across machines; wall-clock is not.

## Commands

```
bun run bench                          # TS + wasm-boundary benches (mitata)
bun run bench:go                       # Go benches, count=10, cpu=1
bun run bench:go -- --save baseline    # also write bench/results/baseline.txt
bun run bench:compare -- baseline new  # benchstat: statistical comparison
```

Knobs (env): `BENCH` (regex), `BENCH_COUNT` (default 10), `BENCH_CPU`
(default 1 — hot paths are per-event, single-threaded), `BENCH_TIME`.

One-time setup: `go install golang.org/x/perf/cmd/benchstat@latest`.

## The rules

1. **A single run is noise, not a result.** Claims of faster/slower come
   from `bench:compare` over `count>=10` runs, and only deltas benchstat
   marks statistically significant (p < 0.05) count. "~" means no change,
   whatever the raw means look like.
2. **Same machine, same power profile, quiet.** Results never compare
   across machines. `bench/results/` is gitignored for exactly this
   reason — commit the protocol, never the numbers. If a number belongs in
   a doc or PR, paste it with the machine and date attached.
3. **Workflow for a change:** `bench:go -- --save before` on the base
   commit, apply the change, `bench:go -- --save after`, then
   `bench:compare -- before after`. An allocation regression on a hot path
   (encode, extend, fused apply) is a finding to explain, not a rounding
   error to wave off.
4. **Corpora are fixtures.** Deterministic builders only — no randomness,
   no time-based seeds. If a benchmark needs a new corpus shape, it gets a
   named builder both sides can mirror.
5. **Benchmarks are gated code.** `bench_test.go` must pass gofmt/vet and
   compile with the ordinary test gate; TS bench files typecheck with
   `bun run typecheck`.

## What the wasm-boundary benches mean

`bench/stream.bench.ts` runs the SAME pipeline three ways: TS fused, Go in
wasm behind the data boundary (including gzip+base64 transport), and the
transport step alone. Read them together: (wasm batch − transport) ≈ Go
compute + crossing; (crossing n=1) ≈ the fixed per-call boundary cost.
This is the number that prices "compose in TS vs ship to the module" —
keep it honest before believing any distribution story.

## CI caveat

Shared CI runners are noisy neighbors; absolute thresholds there are
theater. If benchmarks ever gate CI, gate on benchstat deltas vs the merge
base on a dedicated runner, with a generous significance bar — until then,
benching is a local, deliberate act.
