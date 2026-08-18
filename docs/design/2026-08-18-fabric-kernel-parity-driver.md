# The fabric–kernel parity driver

Date: 2026-08-18. Status: SPECIFICATION — nothing here is built except
stage A0/B0 (the unity bridge, `verify/unity`, gate-green this session).
Every later stage is a ratification point (KB-12 in
`docs/research/2026-08-18-unity-bridge-notes.md`).

## 0. The decision this spec serves

Two models exist and now agree where they claim to: `verify/fabric`
(concrete carriers: cells as holder-attributed observation sets,
positioned journals, ledgers, fencing records) and `verify/kernel` (the
eight-generator act algebra over branded digest sorts, one admission
door, semantics over abstract merges). The bridge proves the kernel is
a sound abstraction of fabric on thirteen rostered rows.

The operator's question: what is the most reasonable way to convert
implemented fabric code to operate over the kernel-model (KM) types?
The answer splits into two lanes that must not be confused:

- **Lane A — model-to-model.** The Lean fabric model and the Lean
  kernel model. Recommendation: CHECK parity mechanically; do not merge
  the models. The two-package independence (separate gates, empty
  manifests, mutual corroboration) is the property that made the unity
  claim worth proving; spending it to deduplicate three small clusters
  is a bad trade. The bridge rows are the insurance policy that makes a
  future merge mechanical if it is ever ratified — not a reason to
  merge now.
- **Lane B — model-to-runtime.** The implemented fabric substrate
  (packages side) adopting the KM sort discipline as its type layer.
  Recommendation: this is the lane to drive, and the estate already
  owns the pattern — fabric's model emits a 27-vector conformance
  corpus that the plait package consumes as fixtures. The kernel model
  grows the same emitter, and runtime types are derived from emitted
  tables, never hand-ported.

## 1. Parity classes (the inventory, from the sources)

Every kernel declaration is assigned exactly one class in a committed
manifest. Verified inventory as of this branch:

**Class I — byte parity** (identical up to namespace; mechanically
comparable, eventually generable):
`HoleStage` (five constructors), `HoleStage.rank`, `supLe` (modulo the
universe annotation: fabric polymorphic, kernel Type-0).

**Class II — image parity** (kernel type is the image of a fabric type
under a declared, committed translation; transports proven in the
bridge): `ProgramNode -> ActionDeclaration` via {name -> work,
uses -> pins, drop generator/args}; `ProgramAdmission <-> Admission`;
`NodePins <-> PinsWithin`; `nodeRank <-> admissionRank`; positioned
provision facts `-> Seal` via {position -> token, value -> digest,
holder invented}. One Class II row carries a declared delta and no
transport: `KTriggerPredicate <-> TriggerPredicate` (single-value
patterns vs observation-list patterns; the kernel carries no trigger
denotation, so any transport would invent semantics — refused until a
pattern-denotation map is ruled).

**Class III — semantic parity only** (theorem-linked, never derivable):
`greatestAt <-> greatestSeal` (opposite tie sense; correspondence holds
on positioned chains, refutation rostered), abstract merge hypotheses
`<-> Cell.merge` (discharge at the ground cell), `World <-> FabricState`
(deliberate thinning; per-component statements only).

**Class IV — no counterpart** (never in scope for parity): kernel-only
(sort system and brands, Act/CandidateAct, the door and taught
refusals, valuations and fills, sentence encoding); fabric-only
(directories, policies, context assembly, query algebras, journals and
compaction, resolution verdicts).

## 2. Lane A — the model-to-model driver (check, do not merge)

All components live in `verify/unity` — the only package where both
models share one Lean environment — and every stage keeps all three
gates green with both upstream trees byte-identical.

- **A0 (done).** The semantic floor: thirteen proven bridge laws, three
  refuting controls, one must-not-compile row, citation ledger
  reconciled with venue checks.
- **A1 — parity manifest.** Commit `parity.txt` (rows: kernel name,
  fabric name or NONE, class, translation name or NONE). Gate check:
  the row set covers exactly the declarations extracted from both
  sources (same extraction discipline as the theorem rosters), so any
  added, renamed, or deleted declaration on either side reddens the
  bridge until the manifest says how it corresponds. Pure gate-script
  work; no new Lean machinery; smallest useful step.
- **A2 — the checker.** A `parity` executable in `verify/unity` (a
  small metaprogram over the shared environment) that, for each Class I
  row, compares the two declarations' constructor lists and equation
  shapes under the manifest's rename map, and for each Class II row,
  checks the committed translation is total over the source
  constructors. Output is a normalized report; the gate diffs it
  against a committed expectation (the byte-identical-regeneration
  discipline fabric's corpus already uses). Mutant control required in
  the same commit: a deliberately wrong pair (planted in the control
  arm, never in the manifest) must FAIL the checker — a checker that
  cannot fail proves nothing.
- **A3 — obligation generation.** For Class II rows, the driver emits
  the transport law STATEMENTS (admission transport, relation
  transport, rank agreement) into a generated statements file; the
  hand-written proofs discharge them. Statements generated, proofs
  human, regeneration byte-identical. The bridge's current hand-written
  laws become the first generated set, which is the acceptance test:
  regeneration must reproduce U3–U7 up to formatting.
- **A4 — generation of Class I types (NOT RECOMMENDED; terminal
  option).** Flip fabric-source-of-truth generation of the kernel's
  Class I declarations. Priced honestly: it makes the kernel textually
  derived from fabric, retires the independence discipline the two-gate
  design encodes, and widens the trusted surface by a generator. Take
  A4 only if A1–A3 demonstrate real drift pain; A1–A3 are exactly the
  components A4 would need anyway, so nothing is wasted by stopping
  early.

## 3. Lane B — the model-to-runtime driver (the conversion path)

The kernel model becomes the specification the runtime derives its type
layer from, the same way fabric's model already feeds the plait
fixtures. Minimal path, in order:

- **B0 (exists).** The precedent: fabric's emitter writes
  `fabric-conformance.ndjson` into the plait fixtures and the fabric
  gate enforces byte-identical regeneration. The kernel model's own
  gate machinery (planted programs, taught table, encodings) is
  emitter-ready data.
- **B1 — kernel conformance emitter.** Add an emitter target to
  `verify/kernel` (same shape as fabric's) writing
  `kernel-conformance.ndjson`: the DeclKind table with ranks, the
  sentence-encoding vectors with round-trips, the sixteen taught
  refusals with wire reasons, laws, repairs, and applicability marks,
  and the admission verdicts for the seventeen planted candidates plus
  the lawful twin. This is model-executed generation — no hand-typed
  vectors, per the standing ruling.
- **B2 — derived runtime tables.** On the packages side, a codegen step
  turns the emitted tables into the runtime's constants: the DeclKind
  registry, refusal-reason enum with taught texts, applicability
  marks. Hand-written code consumes these; nobody retypes them. The
  runtime's brands follow the model's sort discipline: digest brands
  per kind, token brands per register, position brands per partition —
  compile-time-only phantoms, mirroring "the comparison has no type"
  (the runtime pin finding stands: type identities are string-literal
  brands, so brand names come from the emitted kind table).
- **B3 — the door, conformance-tested.** The runtime's admission door
  is hand-written but tested verdict-for-verdict against the emitted
  admission vectors: every planted unlawful candidate must refuse with
  the model's reason, the lawful twin must admit to the model's
  encoding. This makes the door the single constructor of intrinsic
  acts in the runtime, with parity to the model enforced by fixtures
  rather than by review.
- **B4 — call-site migration, generator by generator.** Strangler
  order, chosen so the fabric data plane never changes (cells,
  journals, and registers keep their carriers; KM types are the act,
  identity, and authority vocabulary OVER them): identity reads first
  (resolve at digest brands), then the monotone writes (emit, join),
  then decide behind register-branded tokens (the fenced commit already
  in production), then fold at anchors, then triggers last (the closed
  grammar forces absence and deadline shapes through the deadline
  seat, which is a behavior change to route, not a retype). The
  adaptation record already has most generators shipping; B4 is
  finishing that walk behind the B3 door rather than starting one.
- **B5 — machine-applicable repairs as tooling.** The four repairs the
  model marks machine-applicable (drop the anchor, resolve instead of
  trusting bytes, successor declaration instead of in-place update,
  declared algebra instead of last-writer-wins) are the codemod
  catalog for B4: each is a function of the refused candidate alone, so
  the door's refusal output can drive the rewrite suggestion directly.

## 4. Sequencing and the recommendation

Most reasonable conversion path: **B1 -> B2 -> B3, then B4
generator-by-generator, with A1 landed early and A2 behind it.** Lane B
converts the code the operator actually runs and reuses a proven
pipeline; Lane A keeps the two models honest while never coupling them.
A4 stays refused-by-default. Nothing in either lane touches
`verify/fabric-veil` or crosses the toolchain split, and no stage makes
a runtime claim — conformance vectors check the runtime against the
model's verdicts; they do not promote model theorems into runtime
guarantees.

## 5. Risks and their controls

- A wrong manifest row silently equating different types: the checker's
  planted-wrong-pair mutant control, plus manifest review as data.
- Generated-file drift: byte-identical regeneration in every gate that
  consumes a generated artifact (existing house discipline).
- Fence creep: the parity exe imports both models, so the bridge gate's
  replay-fence grep must extend over every new bridge source file (it
  already sweeps the package's Lean sources by glob).
- Gate coupling: Lane B adds no upstream gate dependencies; the kernel
  emitter is a new target inside the kernel package, gated the way
  fabric's emitter already is.
- Scope creep toward the model merge: A4's costs are recorded above;
  reopening it requires its own ruling, not a slipped import.
