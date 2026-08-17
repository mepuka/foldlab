# REF-0 spike — the hello-kernel, wasm lane, measured

Status: dispatchable; RE-SCOPED 2026-08-16 to the wasm lane by
post-sweep ruling 3 in the grill record. The native lane's T1–T4 are
discharged by RQ-1's independently verified minimal example (all
clear on Windows; evidence and harnesses at
`docs/research/reference/rq1-lean-c-backend/`) — re-proving it is
waste. Closes REF-0 of
`scratch/dispatch/17-the-refinement-ladder.md` together with the
grill record (`docs/design/2026-08-16-ref0-extraction-grill-record.md`),
whose thresholds T1–T4 were pre-registered **before** this spike runs
so its results cannot be rationalized after the fact. Fallback logic
after the ruling: a wasm breach selects the proven native lane; the
freestanding-generator fallback activates only if new evidence
invalidates RQ-1's result.

## What this is, and is not

One exported Lean function driven through Lean's C backend to a
`.wasm` artifact and called from both runtimes through the wasm
binding, with measurements. It is a
**measurement instrument**, not product code: no product ABI, no
proofs, no conformance claim of any kind comes out of it. Its code
lives under `spike/ref0-hello-kernel/`, marked non-product, and
leaves the estate when REF-6 supersedes it. Its findings live in a
dated report under `docs/research/` and as the final lines of the
grill record, which select the lane.

## The spirit clause

No shortcut is taken for the sake of getting something to work. If a
lane fails, the failure is the finding: record the exact commands,
the full failing transcript, and every documented mainstream approach
attempted, then claim the breach against its named threshold. A
stubbed runtime, a mocked boundary, a benchmark of an
unrepresentative function, or an undocumented local hack that makes
the build pass are each worse than a recorded breach — they hide the
demand of rigor instead of centering it. A breach honestly recorded
is REF-0 succeeding, not failing.

## The exports (representative, not minimal)

Two functions, so boundary cost and runtime work decompose:

1. `spike_id : ByteArray → ByteArray` — identity on bytes. Measures
   pure boundary cost: copy in, box, unbox, copy out.
2. `spike_step : ByteArray → ByteArray` — parse canonical JSON bytes,
   apply a trivial structural transform, re-emit canonical bytes.
   Malformed or non-canonical input returns a typed refusal payload
   as bytes. Measures the representative path: parse + allocate +
   emit through the Lean runtime, exactly where FFI pain lives.

The spike's vector grammar is pinned: objects, arrays, strings, and
integers of magnitude below 2^31 — no fractions, no exponents. That
exercises parse, allocate, and emit through the Lean runtime without
inheriting RFC 8785's number-serialization problem, which belongs to
RQ-9 and REF-2, not to this instrument.

Measuring only an add-two-numbers export would be the shortcut the
spirit clause forbids: the D-a thresholds were set against the bytes
ABI, so the bytes ABI is what gets measured. Refusal rows are part of
the harness in both lanes — a trap or crash on malformed input is
recorded as a T4-relevant finding even at spike stage.

## The lane

**WASM (preferred per D-bc):** Lean → C → `.wasm` (emscripten or
WASI SDK — either is admissible if the module loads standalone;
record which). Hosts: wazero embedded in a Go driver; Bun via native
`WebAssembly`. One artifact, its content digest recorded. Three
records are REQUIRED per post-sweep ruling 3, carrying RQ-3's
measured findings forward:

1. the module's **declared import list** (the zero-import goal:
   RQ-3 measured host-identical behavior only for a zero-import
   module, and measured the two ratified hosts diverging on WASI);
2. whether the artifact **validates under wazero's DEFAULT feature
   configuration** (Lean's Emscripten target historically uses
   `-pthread` and `-fwasm-exceptions`; wazero at default rejects
   shared memory — measured in RQ-3);
3. the **host call pattern** used (instance-per-session is the
   expected safe pattern; whatever is used is recorded).

The native lane does not build here: it is discharged by RQ-1's
verified example, whose committed harnesses (Go/cgo and `bun:ffi`
drivers) remain available for comparison runs. Linux-native
confirmation folds into REF-6 CI.

The wasm lane builds from a **clean checkout** (`git clean -xfd`
fresh) with committed build commands, on **Windows and Linux**
(Linux via CI runner or WSL2 — record which). Toolchain versions
pinned in the report: Lean 4.33.0, Go 1.26.5, Bun 1.3.14, the
C/emscripten or WASI-SDK versions used.

## Measurements

Per lane, per platform, committed as a table in the report:

| Measurement | Detail |
| --- | --- |
| Artifact size | `.wasm` bytes (T2's wasm-lane meaning) |
| Per-call overhead | `spike_id` and `spike_step` at payload sizes 100 B / 1 KB / 10 KB / 100 KB; p50 and p99 over enough iterations to stabilize; measured from Go and from Bun |
| Init cost | module compile (once per process) and instantiation of a fresh instance (time and resident linear memory per instance), measured separately — the safe concurrency pattern may make instantiation a per-session cost |
| Concurrency probe (T4) | k goroutines × m calls against distinct payload streams under `go test -race`; for wazero, the safe usage pattern (per-instance, instance pool) is itself a finding to record, with resident memory recorded while k instances are live |
| Digest stability | the WASM artifact rebuilt twice from clean checkouts **at different filesystem paths** on each platform (roster-ratified, RQ-6: a same-path double build passes while the property fails); within-platform and cross-platform digest equality recorded separately — a first datum for REF-6's regeneration gate, not a verdict. Build hygiene: C emission through lake or an explicit `-R`, or the checkout path enters the artifact via the derived module name |

## Threshold verdicts

The report closes with one table: T1–T4 for the wasm lane, each
verdict `clear` or `breached`, each breach carrying its transcript,
plus the three required records (import list, default-config
validation verdict, call pattern). T3's
binding cell is pinned in the grill record: steady-state p50 of
`spike_step` at 10 KB, any host, any platform — other cells are
data. Per-instance instantiation and memory numbers carry no
pre-registered threshold; they land beside the T1–T4 table as
lane-selection evidence, per the grill record's amendment 6. The grill
record then gains its final lines: the selected lane and the cited
measurements. If the wasm lane breaches, selection falls to the
proven native lane (RQ-1); D-a's freestanding-generator fallback
activates only if new evidence invalidates that result, and in that
case draft 17's REF-6 is re-grilled before any dispatch past REF-1.

## Acceptance (mechanical)

- `spike/ref0-hello-kernel/run.sh` (or `run.ps1` twin) builds the
  wasm lane from a clean checkout and drives a fixed vector set
  through both hosts — well-formed rows byte-compared against
  expected outputs, malformed rows asserted to return refusal
  payloads without trap — exiting nonzero on any mismatch. If the
  lane cannot build, the script records an explicit, named breach
  marker, never a silent skip.
- The measurement table regenerates by a committed command; the
  numbers in the report are the numbers the command emits.
- The report lands at `docs/research/2026-08-16-ref0-spike-report.md`
  (or dated as landed) with toolchain pins, transcripts for any
  breach, and the T1–T4 verdict table.
- The grill record's "What completes REF-0" section is updated in the
  same commit with the selected lane.

## What this spike does not establish

That the kernel approach scales to the full wire model; that the
digest-stability datum generalizes to a reproducibility claim; that
the concurrency pattern observed is the one REF-7 ships. Each of
those belongs to its own slice, with its own gates.
