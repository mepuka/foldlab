# Verification: the Go performance rewrite (2026-08-12)

Findings from verifying the in-flight go/stream performance work (Codex),
per bench/BENCH.md protocol. Kept because the misses matter more than the
wins: this lane's product is verifiable truth, so the lab's own blind
spots get written down.

## Method

Identical benchmark file (the rewritten `bench_test.go`) run against BOTH
implementations — baseline via `git worktree` at `b59c6d7`, candidate in
the working tree — `count=10`, `cpu=1`, sequential runs, benchstat
verdict. Results: `bench/results/pre-codex.txt` / `post-codex.txt`
(gitignored; machine: Ryzen 7 8700F, 2026-08-12).

## Verdict on the numbers: REAL (geomean -32% time), signed off

| change | mechanism | verdict |
|---|---|---|
| Extend/HeadFrom: 0 allocs (was 200/100ev), -14–31% | 256B stack frame + one-shot `sha256.Sum256`; same preimage | real; wall-verified byte-identical |
| FoldKV -75% time, -98.6% allocs | keyed-by-bytes fold internals | real; state digests unchanged |
| ApplyMerge -75% time, -97% allocs | dense-seq fast path, skips index maps | real |
| GzipEvents -99% allocs | `sync.Pool` writers + frame buffers | real |
| GunzipEvents -93% allocs | stream-id interning + zero-copy payloads | real; see hazard below |
| EncodeEvent/8B "0 allocs, -60%" | **harness artifact** — no sink under `b.Loop()`; new body inlines, result stack-allocated | discount; honest row is 4KiB (1 alloc, time ~) |

## Fidelity finding

The rewrite is behavior-faithful to the point of reproducing the old
code's latent bugs byte-for-byte (verified: baseline fails the same
probes identically). No drift introduced by the rewrite itself.

## The real finding: a wall blind spot, pre-existing

The frozen fixture's payloads are ASCII-only, so the transform wall never
referees non-ASCII behavior. Probing there:

- **Go NUL-pads on shrinking case maps**: `MapValueUpper("k=ıİiI")` →
  `"k=IİII\x00"` (ı is 2B UTF-8, I is 1B; output buffer sized to input,
  never truncated). Truncates on invalid UTF-8. Both old and new Go.
- **TS has always disagreed**: TS resizes correctly (`"k=IİII"`, no NUL)
  and does full case mapping (`ß` → `"SS"`; Go simple-maps `ß` → `ß`).

**Cross-language port drift, live since the transform wall was built,
invisible because the corpus never left ASCII.** A green wall certifies
equivalence over its corpus — nothing more.

## Recommendations (owed by the perf-work landing)

1. Pin `MapValueUpper` to ASCII-only semantics on BOTH sides
   (`[a-z]`→`[A-Z]`, all other bytes pass through). Deterministic, total,
   trivially identical across TS/Go/wasm; fixture digests unmoved (corpus
   is ASCII). Add non-ASCII cases to the law tests on both sides.
2. `GunzipEvents` now returns payloads ALIASING the gunzipped frame
   buffer (zero-copy). Legal under the never-mutate law, but it must be a
   stated comment on the function, not a silent property.
3. The dead second disjunct in `FilterKeyPrefix` (the original chip) is
   still present.

## The general lesson

ADR-0007: a wall certifies only its corpus. Every pinned transform owes a
domain statement and a divergence probe beyond the fixture.
