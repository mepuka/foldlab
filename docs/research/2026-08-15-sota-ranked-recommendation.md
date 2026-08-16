# Connecting a Lean 4 model to a production implementation — SOTA and ranked recommendation

Primary report of the SOTA research thread (Opus 5 agent, 2026-08-15,
operator-ordered independent review). The agent verified the Cedar
material, Lean 4 mechanics, bounded-exhaustive testing citations, and
all foldlab repo claims first-hand; entries it marked [unre-verified]
are canonical works whose specific numbers should be re-checked before
external quotation (they are independently confirmed by the companion
surveys in this directory: refinement-systems, trace-validation,
gobra, dst, conformance-testgen). Condensed; recommendation preserved
in full.

## Technique catalog (headlines)

- **T1 Extraction/verified compilation** (CompCert, HACL*/EverCrypt):
  the proved artifact IS the implementation. Structurally inapplicable
  when a hand-written Go implementation must be kept.
- **T2 Refinement to hand-written code** (seL4, IronFleet, Verdi):
  machine-checked simulation. Person-years to person-decades. See
  refinement-systems survey for exact costs.
- **T3 Translate the implementation into the prover** (Goose/Perennial
  → Rocq; Gobra): only mature Go-input technique; wrong prover, narrow
  subset, ~10:1+ ratios.
- **T4 Differential testing against an executable model — Cedar's
  "verification-guided development."** The closest precedent, fully
  verified by this agent. Key numbers: Lean model 1,673 lines / proofs
  5,714 / Rust 15,693 / Rust tests 20,458; **validator soundness proof
  = 4,686 lines and 18 person-days** (the single most useful effort
  datum for a small team); Lean authorizer 6µs vs Rust 10µs per call;
  in-process FFI (static Lean libs + protobuf in / JSON out); nightly
  6h/target on ECS, millions of inputs; **4 bugs found by proofs, 21
  by DRT/PBT**; one bug killed a language feature (string-size
  ambiguity). Limitations they state: Rust not verified; DRT missed a
  non-termination bug; cannot find bugs outside generator scope
  (well-formed-AST generators missed malformed-input parser bugs).
  Corpus is dumped, minimized, and committed as frozen integration
  tests in a separate repo (cedar-integration-tests, ~3.8 MB tarball);
  **release gate: no version ships unless model, proofs, and
  differential tests are current.** Cedar later climbed to a verified
  symbolic compiler (SymCC/SymCert) — the honest ladder in action.
  https://arxiv.org/abs/2407.01688 · https://github.com/cedar-policy/cedar-spec
  · https://aws.amazon.com/blogs/opensource/lean-into-verified-software-development/
- **T5 Model-authored conformance corpus** (Ethereum EELS, Cedar
  corpus dump): the spec authors the vectors; every implementation
  replays them. Days-to-weeks; cheapest rung with real teeth;
  reviewable and diffable.
- **T6 Trace validation** (MongoDB failed; CCF succeeded, in CI): the
  hand-written state mapping is the same error class as a hand-typed
  vector, displaced one level. See trace-validation survey.
- **T7 DST** (FDB, TigerBeetle, Antithesis): orthogonal; invariants
  under adversarial schedules, no formal model anywhere in the loop.
  Antithesis SDK already transitively in proto/go via NATS.
- **T8 LTS conformance theory**: ioco (sound generation; exhaustive
  only in the limit); **W/Wp-method m-completeness** — a genuine
  adequacy theorem relative to an implementation state bound; Huang/
  Krafczyk/Peleska 2022 (verified: https://zenodo.org/records/7267975)
  for complete suites over symbolic FSMs; L*-learning as differential
  conformance (de Ruiter & Poll); Ivy/QUIC spec-as-test-driver.
- **T9 Bounded-exhaustive testing** (Korat, SmallCheck, small-scope
  hypothesis; peer-reviewed anchor: Sullivan et al. ISSTA 2004):
  enumerate ALL inputs to a stated bound — what foldlab's tiny system
  uniquely permits.

## Repo grounding (verified first-hand by the agent)

- `Moves/Model.lean` 1,395 lines, 63 theorems (17 gated), zero
  `sorry`, zero `noncomputable` — **`step` is a plain computable
  function; the model can already run.**
- `Violations.lean` already instantiates concrete carriers
  (`CHole := Fin 1`, `CHolder := Fin 3`, `CValue := Nat`).
- `protocol_session.go` is 779 lines using the same state names —
  model:code ≈ 2:1 (vs Cedar's 1:10): differential testing reaches a
  larger fraction of the implementation.
- The cross-language subprocess differential harness pattern already
  exists (`go/canonical/differential_fuzz_test.go`), and the
  model-generated-schedules → real-binary → sabotage-controls pattern
  already exists AND found a real defect (`verify/catalog` +
  `catalogr4`, R4-FINDING-001).

## Ranked recommendation

**Rank 1 — model-authored, bounded-exhaustive conformance corpus.**
Draft 07 (DEV-670) independently arrived at the state of the art;
three upgrades: (1) make the enumeration exhaustive to a **stated**
depth and say the depth — converts an R0/R1 claim into a
bounded-completeness claim; (2) **instantiate `Value` as the JCS
canonical byte string**, so Lean equality/ordering coincide with Go's
by construction (kills the encoding-mismatch finding class — the
exact tax Cedar paid on set representation in the Dafny→Lean move);
(3) serialize with `Lean.Data.Json` (Lean core — no new deps),
materializing the `holes` function over `FiniteCarrier.elems`.
Effort: 1–2 weeks with agent labor.

**Rank 1b — PRECONDITION: fix the totality defect (MOVES-1) first.**
`stepTrace` kills a trace on refusal; the daemon refuses and
continues. A bag of three distinct fills at one hole has zero
admitted runs, so `no_loss` is vacuous over exactly the workload the
calculus exists to govern. Add a **total** runner (refused → recorded,
state unchanged, continue), restate `no_loss` over it. This is what
ioco handles with quiescence: **the model must consume every
observable the implementation can emit, including rejections.** Do
this before generating the corpus or the partiality gets frozen into
the artifact.

**Rank 2 — live differential oracle** (Cedar DRT proper): `lake exe`
JSON-lines subprocess (NOT cgo — Lean's FFI is documented unstable;
the subprocess pattern already exists in-repo), driven by
`go test -fuzz` with **type-directed** generation (Cedar's central
lesson: naive random generation is useless). ~1 week on top.

**Rank 3 — trace validation of real daemon journals** through the
(now total) Lean runner: catches shapes generators never invent;
mapping kept small, declarative, committed as data.

**Rank 4 — the real R4 climb**: Lean-generated schedules replayed
against the running daemon with sabotage controls first — the repo's
own proven discipline, ahead of Cedar's published methodology on the
negative-controls point specifically.

**Rank 5 — later ceiling**: symbolic/SMT decision procedure over the
calculus, soundness proved in Lean (Cedar SymCert's path). Months.

## Not realistic — plainly

1. **Refinement from the Lean model to the Go daemon**: no formal
   semantics of Go in Lean exists. Not available at any spendable
   effort.
2. **Extraction: generate the daemon from Lean**: cgo boundary, Lean
   runtime in production, unstable FFI — the tail does not justify
   the dog. (Narrow future option: extract only the fence choice
   function.)
3. **Goose/Perennial**: wrong prover, subset rewrite, person-years.
4. **Gobra on the daemon**: proves memory-safety-flavored properties,
   not correspondence to the calculus.
5. **A W-method-complete suite claiming full fault coverage**: the
   theorem needs a state bound on the implementation; the daemon's
   real state (journal contents, sessions) cannot be honestly
   bounded. Use bounded-exhaustive with a stated depth; cite the
   completeness literature as direction, not claim.
6. **More hand-authored vectors**: the ban is correct and the
   literature backs it without qualification.

## The honest ladder

| Rung | Claim | Cost | Precedent |
|---|---|---|---|
| 0 | Model made total on refusal; `no_loss` restated | days | ioco quiescence |
| 1 | Bounded-exhaustive corpus, byte-identical regeneration, refusals included | 1–2 wk | Cedar corpus; Ethereum EELS |
| 2 | Live differential oracle, type-directed, nightly | +1 wk | Cedar DRT |
| 3 | Real journals replayed into the model | +1 wk | CCF; ShardStore |
| 4 | Lockstep schedule replay vs the daemon, sabotage controls | +2–3 wk | verify/catalog R4 |
| 5 | Symbolic decision procedure, soundness in Lean | months | Cedar SymCC |

The honest ceiling of rungs 1–4: **"the daemon agrees with the proved
model on every input we tried, and we can state exactly which inputs
those were."** Never write it as a refinement proof — Cedar, with
vastly more resources, claims exactly this and no more. Two claims
foldlab can make that Cedar cannot: the corpus is exhaustive to a
stated depth, and the gates ship negative controls that must fail.
