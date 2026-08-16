# Proof-to-artifact reference: seL4, CompCert, Everest, Cedar mechanics, industry practice

Combined deep-reference addendum from the operator-ordered
independent review (Opus 5 agents, 2026-08-15). Condensed from three
sub-reports; numbers and load-bearing quotes preserved. Companion to
the ranked recommendation, refinement-systems, trace-validation, and
Lean-oracle records in this directory.

## seL4 (Isabelle/HOL) — the full-refinement pole

- Chain: abstract spec → executable spec (from a Haskell prototype) →
  actual C (imported by the Norrish parser) → binary (translation
  validation vs the Cambridge ARM model, via Z3/SONOLAR).
- Cost: ~20 person-years of proof vs 2.2 py of development (**~9:1
  effort ratio**); 200k proof lines (2009) → 480k (2014) → "well over
  a million" today across five architectures — the famous
  "million lines for 10k of C" overstates per-configuration cost.
  $362/SLOC all-in; the oft-quoted $10k/LOC EAL6 figure traces to an
  acknowledged typo.
- Maintenance: "we are not able to quantify such costs"; a
  cross-cutting feature cost 1.5–2 py to re-verify (~32% of original
  effort); a fundamental change to 5% of the code cost ~17%.
- Binary verification holds for **one architecture, one compiler, one
  optimisation level** (AArch32, gcc 4.5.1, -O1; -O2 not fully
  proved; -O1 costs 15–20% performance). They tried CompCert and the
  verified kernel initially *crashed* (linker-script assumptions;
  seL4 deliberately violates strict C conformance).
- Assumptions page (verbatim substance): 340 lines of assembly
  trusted; hardware, cache/TLB, 1,200 lines of boot code, DMA
  trusted; VM invariants "not from first principles — there is
  potential for human error"; side-channel model known incomplete;
  SMP verification still in progress after 15 years.
- Efficacy: verification found 144 C defects + ~460 spec changes
  (half bug-related); "none of the bugs found in the C verification
  stage were deep." Post-2009: zero functional-correctness defects in
  verified code (project self-report, no independent audit) — while
  defects HAVE been found in every class of unverified code
  (multicore, VT-x, boot, hardware assumptions).
- DARPA HACMS: red team with root on the Linux partition could not
  break out (hardware attacks out of scope) — evidence for isolation
  under adversarial pressure, not for "no bugs."

## CompCert (Coq/Rocq) — the verified-compiler pole

- The theorem is conditional: nothing is claimed if compilation
  fails, and for source with ANY undefined behaviour the guarantee
  degrades to "behavior improves" (i.e. nothing useful). Observable
  behaviour excludes time and memory.
- ~90% of the algorithms proved; elaboration, assembling, linking are
  not (parser verified since 2.3; Valex validates assembly/linking
  post-hoc). 100k lines Coq, ~6 py; proof:(code+spec) ≈ 3:1.
- Csmith (PLDI 2011): six CPU-years of fuzzing found **zero
  wrong-code bugs in the verified middle-end** (vs 325 bugs across 11
  compilers, 79 GCC + 202 LLVM) — and ~half a dozen bugs in the
  UNVERIFIED front-end plus a PowerPC-semantics spec bug.
- Monniaux & Boulmé (ESOP 2022): all later bugs in the TCB, none in
  verified parts; **most in the last mile** (assembly printing,
  builtin expansion — one silent-miscompilation on four
  architectures; clobbered-register spec bugs that were latently
  exploitable with all proofs passing). Counter-intuitive finding:
  **zero bugs from extraction or axioms** — "much attention is often
  given to doing away with the extractor; this may not reflect the
  most pressing needs." Coq itself: ~one critical bug/year.

## HACL*/EverCrypt (F*/Low*/KaRaMeL) — the extraction pole

- Pipeline: pure F* spec → Low* implementation → typecheck (memory
  safety, functional correctness, secret independence) → KaRaMeL
  erases proofs and emits C. The Low*→C translation is **proven
  correct on paper**; the KaRaMeL implementation, F* typechecker, Z3,
  and the C compiler are trusted. Vale adds verified x64 assembly;
  the Low*↔Vale interop wrapper is trusted.
- Not proved (their words): cryptographic security; power
  side-channels; secret-dependent lengths/indices; the specs
  themselves ("this process is trusted"); hand-written intrinsics
  shims ("this C code is not verified, it is trusted").
- Cost: symmetric primitives ~2:1 proof:code, ~1 person-week each;
  bignum-based up to 6:1, person-months. SHA-256: HACL* total 708
  lines of F* vs **~9,000 lines of Coq** for Appel's VST proof of the
  *pre-existing* OpenSSL C — **an order of magnitude in favour of
  authoring the implementation for provability**, for a weaker
  property on the expensive side.
- miTLS: the TLS handshake proof "was left incomplete" — a reference
  implementation, not a shipped verified stack. Deployment claims
  (Firefox, Linux, Python, …) are first-party; treat specifics as
  unverified.
- Cross-cutting: **the residual bugs cluster where the model meets
  the machine** — front ends, assembly printing, spec boundaries —
  never in the verified core. The proof is not where the risk is;
  the seams are.

## Cedar-spec mechanics (read directly from the repo)

- **In-process FFI, not subprocess, not extraction**: `lake build
  Cedar:static … CedarFFI:static`; Rust links the static libs
  (`#[link(name = "Cedar_CedarFFI", kind = "static")]`); Lean runtime
  shared via lean-sys; one Lean thread, `lean_set_exit_on_panic`.
- **Serialization migrated JSON → protobuf for inputs** (PR #488,
  issue #543) for throughput and to delete an undocumented JSON
  format that had leaked into the production crate; **returns are
  still JSON strings**. Read-out: JSON survives for result-shaped
  payloads; protobuf displaces it where volume × size taxes parsing.
- **Generation**: 99 fuzz-target binaries; coverage-guided libFuzzer +
  hand-written `arbitrary` shaping, **correlated** (schema →
  hierarchy → policy → requests). Coverage guidance alone was NOT
  sufficient — they state naive/uncorrelated generation
  over-exercises error paths. Byte-level targets are seeded from real
  policies, not generated.
- **No PBT inside Lean** — all PBT is Rust-side; Lean unit tests are
  hand-written tables.
- **Corpus pipeline**: 6h fuzz → `cmin` → replay with dump env vars →
  four files per case → committed to a separate repo
  (cedar-integration-tests) with pinned submodules; consumed by
  cedar and cedar-java CI.
- **CI does not fuzz at volume**: PR jobs build targets, run a
  5-minute smoke fuzz, replay the frozen corpus, `lake lint` for
  unchecked theorems. The millions-of-inputs runs are daily on ECS
  (4 vCPU / 8 GB / 6h per target). The 100M/night figure is from the
  **Dafny era** blog — do not cite it as a Lean-era number.
- **Gap the paper never discusses**: the FFI harness itself (unsafe
  Rust, hand-managed refcounts, serialization both sides) is not part
  of the stated dependability case.

## Industry practice — hard evidence (second trace-validation sweep)

- **MongoDB MBTC failure, exact figures**: 10 weeks / 2 engineers;
  570 C++ + 252 TLA+ + 484 Python; total order via
  busy-sleep-on-millisecond hack; 423 JS tests traced (120 broke
  under tracing); applied to only 5 tests + 1 fuzzer run; **one test
  ever passed; never in CI; zero bugs**. State space 42k → 371k
  states, 2s → 14min. Verbatim: "no initial infrastructure investment
  can make the marginal cost of trace-checking additional
  specifications cheap." And the mask warning: "a mistake in the
  Python script might mask a harmful transcription bug."
- **MongoDB MBTCG success**: Realm OT spec 795 lines (transcribed
  from the C++ in ~40 hours); 30,184 states → 4,913 generated tests;
  21% → **100%** branch coverage; found a real infinite recursion.
  VLDB 2025 scaled it: 490k states, 87k generated WiredTiger tests,
  sequential-only, "not a formal proof of conformance."
- **Spec rot, proven**: `RaftMongo.tla` is **byte-identical since
  MongoDB 5.0** except one comment line, while replication shipped
  6.0/7.0/8.0. MongoDB's CI model-checks specs against themselves
  weekly at tiny bounds — one checked-in config documents a known
  invariant violation the model is too small to reach. **Nothing in
  MongoDB CI connects the spec to C++.**
- **Kafka**: zero `.tla` files in apache/kafka; the specs live in a
  personal repo, stale since 2020-01; Kafka's in-tree Raft simulation
  checks hand-written Java invariants, no connection to the specs.
- **TigerBeetle**: zero TLA+ in the repo (verified by code search);
  simulates, does not verify; their own docs cite FDB/Antithesis
  lineage, not formal methods.
- **FoundationDB "one trillion CPU-hours"**: arithmetic doesn't close
  (~100× short of plausible fleet capacity) — the phrase is
  "equivalent of," severity-weighted; cite as self-estimate.
- **CCF is the one verified case of trace validation running in
  production CI** (6 bugs pre-production; 15 log statements in 63
  kLoC; ~2 engineer-months for the trace spec).
- **The six defensible conclusions**: (1) the gap is admitted, not
  solved — AWS's "the answer is that we don't" is still the honest
  baseline; (2) the decisive variable is whether the spec was written
  to correspond to the code; (3) post-hoc specs cannot be
  trace-checked economically; (4) the trust base moves, it doesn't
  shrink — ShardStore's bug ledger includes two bugs in the models
  themselves; (5) maintenance beats expressiveness (Rust models as
  mocks so the build breaks on rot); (6) **specs rot silently;
  only conformance checking makes staleness fail loudly.**
