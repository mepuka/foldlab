# Assurance for hand-written Go against a formal spec — survey and recommendation

Primary report of the Go-assurance research thread (Opus 5 agent,
2026-08-15, operator-ordered independent review). This agent also read
the foldlab tree directly; its repo findings are quoted as delivered,
with one correction noted by the coordinator at the end. Verbatim.

---

## Headline

There is exactly one well-documented industrial precedent for *this*
architecture — a Lean 4 executable model plus a hand-written
implementation in a different language, kept honest by differential
testing — and it is **AWS Cedar**. Nothing connects Lean to Go
specifically. The heavy-refinement options (Goose/Perennial, Gobra)
are real, maintained, and cost person-*years* for code this size. The
rung industry actually buys at this scale is generated-corpus +
online-oracle differential testing against an executable model, and
the repo already contains a working instance of that pattern pointed
at the wrong oracle.

## 1. Goose / Perennial (MIT PDOS) — real, maintained, out of reach

- `goose-lang/goose` **archived 2026-04-07**; development moved into
  `mit-pdos/perennial` (active, pushed 2026-08-10). Target is **Rocq
  (Coq), not Lean** — no Lean port.
  https://github.com/goose-lang/goose · https://github.com/mit-pdos/perennial
- Go subset deliberately narrow: no signed integers, no channels,
  interfaces, closures, `defer`, `select`, generics, or idiomatic
  `error` handling in the supported list; reassignment needs `var`;
  loop returns need explicit `break`/`continue`.
  https://github.com/goose-lang/goose/blob/master/docs/writing-goose.md
- Effort, measured: GoJournal ~1,300 lines of Go against ~20–26k
  lines of Coq (**~20:1**), a multi-year PhD.
  https://www.usenix.org/conference/osdi21/presentation/chajed
  DaisyNFS got the file-system layer to 2:1 only by building on the
  already-verified GoTxn (itself 22:1).
  https://www.usenix.org/conference/osdi22/presentation/chajed
- **Verdict: not adoptable.** The Go would be rewritten into the
  subset, the Lean proofs redone in Rocq, and the ratio implies
  years. The ceiling, not a plan.

## 2. Gobra (ETH Zurich) — maintained; the effort figures are the argument

Alive (`viperproject/gobra`, pushed 2026-08-15), SMT-backed
separation logic, **standalone — no connection to Lean or Coq**;
specs are restated in Gobra's annotation language.
https://github.com/viperproject/gobra · https://arxiv.org/pdf/2105.13840

VerifiedSCION numbers: 4,700 lines of Go → 13,400 lines of
annotation (2.8 per code line); 332 functions; **~2.5 person-years**
for the code plus 2–3 person-years for the Isabelle protocol model;
Gobra runs 3 hours. They also changed the Go to suit the tool.
https://ar5iv.labs.arxiv.org/html/2405.06074

One transferable idea: **Igloo** — the only published sound route
from an interactive-prover model to a real implementation in a
mainstream language, via an extracted I/O specification (a research
methodology, not a product). https://arxiv.org/abs/2010.04749

**Verdict:** 4,700 lines cost the tool's own authors ~2.5
person-years, and none of the 17 existing theorems would carry over.

## 3. The actual precedent: AWS Cedar — Lean model ↔ hand-written implementation

**Verification-guided development**: executable Lean model with
mechanized proofs; idiomatic production code written independently;
**differential random testing (DRT)** as the seam.
https://arxiv.org/abs/2407.01688 · https://github.com/cedar-policy/cedar-spec
· https://lean-lang.org/use-cases/cedar/

| | Lean model | Lean proofs | Rust production |
|---|---|---|---|
| Evaluator/Authorizer | 897 | 347 | 4,877 |
| Validator | 532 | 4,686 | 6,702 |
| **Total** | **1,673** | **5,714** | **15,693** |

- Model ~10× smaller than the implementation; proof-to-**model**
  ratio ~13.4:1 (affordable where proof-to-code 20:1 is not).
- **25 bugs: 4 found by the Lean proofs, 21 by DRT/PBT.**
- Lean authorizer runs 6 µs/case vs Rust 10 µs — fast enough to be
  an online oracle.
- Mechanics: Lean compiled to `libleanshared.so`, called from Rust
  over FFI, Protobuf interchange.
  https://github.com/cedar-policy/cedar-spec/blob/main/cedar-lean-ffi/README.md
- Scale: nightly, 6h × 4 vCPU per target, millions of inputs;
  minimized fuzz corpora checked into CI as regression tests.
- **Generators are type-directed** — purely random inputs were
  useless.
- Honest limits, stated by the authors: DRT missed a non-termination
  bug (negligible generation probability) and cannot find bugs
  outside the generators' scope (AST-level generators only emit
  syntactically valid policies, so parser bugs escaped).

**Lean↔Go prior art: none.** Lean 4 compiles to C; no Go backend.
Bridges: (a) `lake build :shared` → cgo, (b) `lake exe` subprocess
oracle over stdin/stdout.
https://lean-lang.org/doc/reference/latest/Build-Tools-and-Distribution/Lake/

## 4. Trace validation — the honest industrial result is discouraging at this abstraction level

Methodology exists (Cirstea/Kuppe/Loillier/Merz, SEFM 2024 —
https://arxiv.org/abs/2404.16075). But **MongoDB tried it and
reported it did not work**: "We found MBTC to be impractical for
testing that the Server conformed to a highly abstract
specification. MBTCG [test-case generation] was highly successful"
(*eXtreme Modelling in Practice*, VLDB 2020,
https://arxiv.org/abs/2006.00915). Generation beat trace checking;
the killer was the abstraction gap and the trace→action mapping
rotting against a moving codebase.

AWS S3 **ShardStore** (SOSP 2021) chose executable reference models
**in the implementation language**, checked by property-based
testing + stateless model checking; 16 issues prevented; extended
later by non-experts; models double as test mocks.
https://dl.acm.org/doi/10.1145/3477132.3483540

AWS 2025 retrospective: TLA+/P for design, PBT/DST/fuzzing/runtime
validation in the middle, proof reserved for narrow boundaries
(Cedar, Firecracker). https://dl.acm.org/doi/10.1145/3729175

## 5. Deterministic simulation testing — orthogonal

TigerBeetle VOPR, FoundationDB, Antithesis: the oracle everywhere is
assertions/invariants/convergence, not a formal model. DST supplies
the schedule; a model supplies the verdict. Antithesis pricing
reported $20k–$100k+/yr — not a tiny-team purchase. Go's
`testing/synctest` (stable Go 1.25) is a fake clock + quiescence
detector inside a bubble, not a deterministic scheduler.
(Incidentally: `antithesis-sdk-go` is already in `go.sum` —
transitively via nats-server, no-op mode.)

## 6. Grounding in the foldlab repo — three findings

1. **`verify/moves/Moves/Model.lean` is already an executable
   oracle.** `def step (s : State) : Mv → Option State` — total,
   pure, computable, no `noncomputable` anywhere; `stepTrace` already
   defined as the fold; `Option` carries refusal — exactly the
   signature a differential harness wants.
2. **The instantiation work is largely started.**
   `Moves/Violations.lean` already pins concrete finite carriers
   (`CHole := Fin 1`, `CHolder := Fin 3`, `CValue := Nat`) "to keep
   every negative control executable." Widening the scope and adding
   a `lake exe` main is a small job.
3. **The subprocess differential harness already exists — pointed at
   TypeScript.** `go/canonical/differential_fuzz_test.go` spawns a
   `bun` probe speaking JSON-lines over stdin/stdout
   (`{input}` → `{accepted, canonical, error}`), mutex-guarded;
   `go/canonical/conformance_test.go` is the generated-corpus
   counterpart with an obligation table mapping laws GL1–GL8 to named
   tests. Swapping `bun jcs-probe.ts` for a `lake exe` binary is a
   rename plus a codec.

Caveats as delivered: "There is no move-calculus core in Go yet"
(see coordinator note below); and `go/` is not stdlib-only (nats.go,
nats-server) — rungs 1–4 need only `encoding/json`, `os/exec`,
`testing`.

> **Coordinator note (accuracy):** the "no move-calculus core in Go"
> finding is about the `go/` substrate tree. The daemon's fold DOES
> exist in `proto/go/protod/protocol_session.go`
> (`applyProtocolEvent`), as the adversarial review identified. The
> recommendation is unchanged — isolate that fold behind a pure
> `Step`-shaped function — but it is an extraction, not a green-field
> design.

## The ladder, with honest effort

| Rung | What it buys | Effort here | Precedent |
|---|---|---|---|
| 1. Generated-corpus differential | Every Go divergence on a fixed, regenerable corpus; regression-locked | **Days.** Lean main enumerates traces, emits JSON; Go replays; byte-identical regeneration | Cedar corpus tests; foldlab's own conformance_test.go |
| 2. Online oracle random differential | Divergences beyond the corpus; scales with CPU-hours | **~1 week on top.** Reuse the subprocess plumbing; drive from `go test -fuzz` via []byte → move-sequence decoding | Cedar DRT (subprocess instead of FFI) |
| 3. Trace validation of the live daemon | Conformance of the deployed system | **Weeks–months; evidence says may not pay** | MongoDB's negative result |
| 4. Pure-core isolation + exhaustive small-scope | Turns rungs 1–2 from sampling into near-exhaustive; the seam becomes one Go function | **Days.** `Step(s State, m Move) (State, bool)` mirroring `step`; enumerate all traces to depth k over the small carrier | ShardStore same-language models; small-scope hypothesis |
| 5. Goose or Gobra refinement | Machine-checked refinement | **Person-years; spec restated; zero Lean reuse** | GoJournal 20:1; VerifiedSCION 2.5py |

## Recommendation as delivered

**Do rungs 4 → 1 → 2, in that order, and stop.** A couple of weeks
of work landing on the same rung as Cedar — the most rigorous thing
anyone does on this exact seam.

Load-bearing design notes:
1. **Compare refusals, not just accepted states** — the interesting
   divergence class is the implementation accepting what the model
   refuses.
2. **Generate structurally, not randomly** — Cedar's flat statement
   is that untyped random generation produced nothing useful.
3. **Check in the minimized corpus** as CI regression tests.
4. **Adopt Cedar's release gate**: no release unless model, proofs,
   and differential tests are current.

Skip rung 3 unless the daemon's own sequencing becomes the suspect.
Skip rung 5 — the entry ticket is multiple person-years and neither
tool reuses a line of the existing Lean.
