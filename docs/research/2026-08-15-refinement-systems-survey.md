# Refinement-based verification of distributed & storage systems — primary-source survey

Sub-report of the operator-ordered independent review (Opus 5 agent,
2026-08-15). Covers IronFleet, Verdi, Perennial/Goose, and
Gobra/VerifiedSCION with exact cost figures. Condensed from the
delivered report; all numbers and quotes preserved verbatim, full
source list at the end.

## Verdict up front

| Path | Fits a Lean-4 LTS + hand-written Go? | Realistic cost | Status 2026 |
|---|---|---|---|
| IronFleet (Dafny) | No — rewrite the daemon in Dafny | 3.7 person-years for 2 systems | Dormant (last push 2023-06) |
| Verdi (Coq) | No — rewrite in Gallina, extract OCaml | 94:1 proof:code | Preserved, not developed |
| Perennial/Goose (Go→Rocq) | Partially — reads real Go, restricted subset, proofs in Rocq not Lean | ~20:1 proof:code | Active but goose archived 2026-04; mid-rewrite ("new Goose") |
| Gobra + Isabelle (Igloo / VerifiedSCION) | **Closest structural match** — annotates existing optimized Go against an LTS protocol model | 2.8 annotation:code; ~2.5py code + 2–3py protocol | Most active of all |

None target Lean 4. A Lean-4 LTS is not an input to any of these
pipelines; it would be re-expressed by hand.

## IronFleet (SOSP 2015)

- Three layers (spec ← protocol ← implementation), TLA-style
  refinement above, Floyd-Hoare below, all in Dafny/Z3.
  https://www.microsoft.com/en-us/research/wp-content/uploads/2015/10/ironfleet.pdf
- Reduction discipline: all receives before all sends per step; at
  most one time-dependent operation per step. **The reduction
  argument itself was not mechanically verified** (§8 future work).
- Liveness via always-enabled actions (may admit non-machine-closed
  specs).
- IronRSL (MultiPaxos, trusted spec 85 SLOC) + IronKV (trusted spec
  34 SLOC). First mechanized liveness for a practical protocol impl.
- **Cost (Fig. 12): 5,114 impl lines; 39,253 proof lines total;
  3.7 person-years.** The famous "3.6:1" ratio is implementation-layer
  only; **whole-artifact is 7.7:1**; liveness alone is 9,962 proof
  lines. Verification 395 min serial (~6h builds, parallelized to
  6–8 min).
- TCB: specs, main loop, Dafny, .NET, Windows, hardware; no Byzantine
  faults; no crash-recovery (future work).
- Performance: IronRSL within 2.4× of unverified baseline (slower);
  IronKV "competitive with Redis".
- **No evidence of production deployment. Repo effectively dormant,
  pinned to Dafny 3.4.0/.NET 6.** https://github.com/microsoft/Ironclad

## Verdi (PLDI 2015) + Raft proof (CPP 2016)

- Verified system transformers: verify under a benign network
  semantics, transfer properties to harsher semantics via proved
  transformers (backward simulation). KV+primary-backup composition
  cost **19 lines** — the VST payoff.
- PLDI 2015 caveat: "our proof of state machine safety is still in
  progress" — the "verified Raft" was conditional until CPP 2016.
- **Raft proof: 530 lines of code, 50,000 lines of proof (94:1), 90
  invariants (85 internal + 5 external), ~18 months elapsed.**
  https://homes.cs.washington.edu/~mernst/pubs/raft-proof-cpp2016.pdf
- **Proof brittleness, measured:** a two-line handler reordering cost
  **~6 hours of proof repair** with mitigation machinery in place, in
  a self-described best case; "we spent the majority of our time
  reworking proofs in response to changes"; the verification burden
  shaped which optimizations they attempted.
- Mitigations that transfer: interfaces separating statements from
  proofs (100× faster rechecking, parallel CI), order-independent
  decomposition lemmas, structural tactics.
- TCB: shim, Coq checker + extractor, OCaml toolchain, network
  semantics assumed to model reality. You write Gallina, not Go.
- vard vs etcd: ~12% lower throughput, ~15% higher latency (small
  benchmark).
- Status: kept building by Rocq ecosystem maintainers; no active
  research or industrial use. https://github.com/uwplse/verdi-raft

## Perennial / Goose (MIT PDOS)

- Goose translates a Go subset to GooseLang (Iris); **"The translator
  and semantics are trusted; you can view the process as giving a
  semantics to Go."** A Goose bug is a soundness hole.
- **Waddle** (differential tester with a *proven* interpreter,
  deterministic single-threaded only — concurrency uncovered) found
  real Goose bugs: byte decoding missing a left-shift; **`<` and `≤`
  implemented identically**; **equality that always returned true**;
  struct-field evaluation order backwards; no short-circuiting;
  operator-precedence divergences.
  https://pdos.csail.mit.edu/papers/gibsons-meng.pdf
- **GoJournal (OSDI 2021): 1,345 Go lines, 25,797 Rocq proof lines
  (~19:1)**; SimpleNFS: 462 verified lines, only 44 needing crash
  reasoning — **the journal absorbs the crash proofs; callers reason
  crash-free. The single most valuable structural lesson for a
  journaling daemon.** GoNFS (the usable server, 3,911 lines) is
  unverified. Verification found a real WAL absorption race.
  Performance: ≥90% of ext4 on NVMe; <20% on one SSD workload.
- **DaisyNFS (OSDI 2022): the hybrid.** Concurrency/crash in GoTxn
  (Rocq, 40:1); all NFS operations in Dafny with sequential
  reasoning, compiled to Go: **4,051 code / 6,787 proof ≈ 2:1,
  implemented and verified in ~3 person-months** (given GoTxn).
  Incremental features cost days. **Eleven bugs found by testing
  after verification** — six in unverified code, two spec-vs-RFC,
  **three genuine specification bugs** (one where a Dafny subset type
  silently became an unchecked assumption at the trust boundary).
  Verification moves bugs to the boundary; it does not eliminate
  them.
- Status: `goose-lang/goose` **archived 2026-04-07**; Perennial
  active but mid-way through a backwards-incompatible "new Goose"
  rewrite, tracking Rocq master; no external team has shipped a
  Perennial-verified system. Usability for outsiders: poor to
  moderate, worst right now.

## Gobra / VerifiedSCION — the closest match

- Igloo methodology: protocol models as **labeled transition
  systems**, refined stepwise (Abstract → Concrete → Decomposed); an
  **I/O specification is automatically extracted** and becomes a
  separation-logic precondition on the router's main function; I/O
  permissions attach to Go's I/O calls so the implementation can only
  do what the model permits. **Refinement implemented as
  separation-logic permissions over ordinary Go — no rewrite, no
  extraction, no translator.** https://arxiv.org/abs/2405.06074
- The target was **not written for verification** — independently
  developed, speed-optimized Go using threads, global state,
  closures, interfaces.
- Cost: 4,700 Go lines; 13,400 annotation lines (2.8:1) + 2,400
  trusted stdlib specs; **~2.5 person-years code + 2–3 person-years
  protocol (Isabelle, 16,100 LoC)**; halves proceeded in parallel.
  Gobra runs 3 hours; Isabelle 5 minutes.
- Found: **five protocol attacks** (one critical: fabricate arbitrary
  forwarding paths) and a **critical implementation bug**, all of
  which "escaped the extensive code reviews, testing, and fuzzing."
- TCB: compiler/runtime/OS/hardware assumed; tools assumed sound;
  Igloo's soundness is Isabelle-formalized; **only the syntactic
  Isabelle→Gobra transcription of the I/O spec is unverified** —
  compare Goose, where the entire translation is trusted.
- Gobra itself: healthiest toolchain in the survey (pushed
  2026-08-15). Annotation overhead 0.3–3.1:1 on benchmarks.

## Synthesis

**The pattern is not about tools; it is about what you prove.**
Concurrency + crash safety costs 20–94:1. Sequential functional
correctness behind a good boundary costs 2–3:1. Every cheap number
was bought by pushing hard reasoning below an interface (DaisyNFS
below GoTxn; SimpleNFS below GoJournal; SCION below Igloo's I/O
spec).

For foldlab: the structurally-best-fitting shape is VerifiedSCION's
(LTS refined to an I/O spec checked over existing Go) — but Igloo is
Isabelle, so it would be a Lean re-implementation; real work. The
journal lesson (GoJournal) and the boundary lesson (DaisyNFS) apply
regardless. Maintenance dominates; bugs move to the boundary; the
translator/model gap is where soundness leaks; performance is not
free (2.4× slower, 60% of Linux, <20% on one workload — each traces
to an optimization too expensive to prove).

Could not verify: GoJournal person-time (lines only); Verdi
person-months; Grove's cost figures; new-Goose Go version support;
any IronFleet deployment; any external Perennial user; whether SCION
production runs the verified build (Gobra gating PRs is documented).

## Sources

IronFleet: https://www.microsoft.com/en-us/research/wp-content/uploads/2015/10/ironfleet.pdf ·
https://dl.acm.org/doi/10.1145/2815400.2815428 ·
https://cacm.acm.org/research/ironfleet/ ·
https://github.com/microsoft/Ironclad

Verdi: https://homes.cs.washington.edu/~ztatlock/pubs/verdi-wilcox-pldi15.pdf ·
https://dl.acm.org/doi/10.1145/2737924.2737958 ·
https://homes.cs.washington.edu/~mernst/pubs/raft-proof-cpp2016.pdf ·
https://github.com/uwplse/verdi · https://github.com/uwplse/verdi-raft

Perennial/Goose: https://www.chajed.io/papers/goose:coqpl2020.pdf ·
https://www.usenix.org/system/files/osdi21-chajed.pdf ·
https://www.usenix.org/system/files/osdi22-chajed.pdf ·
https://pdos.csail.mit.edu/papers/gibsons-meng.pdf ·
https://github.com/goose-lang/goose · https://github.com/mit-pdos/perennial ·
https://github.com/mit-pdos/daisy-nfsd

Gobra/VerifiedSCION: https://arxiv.org/abs/2105.13840 ·
https://arxiv.org/abs/2405.06074 ·
https://www.pm.inf.ethz.ch/research/verifiedscion.html ·
https://github.com/viperproject/VerifiedSCION ·
https://nlnet.nl/project/Verified-SCION-router/ ·
Igloo: https://arxiv.org/abs/2010.04749
