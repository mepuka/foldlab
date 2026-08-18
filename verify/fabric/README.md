# Fabric algebra model

`verify/fabric` is a standalone Lean 4.33.0 package with no Lake dependencies.
It states and proves the Plait fabric laws F1, F2, F2b, F3, F4, F7, F9, F10,
F11, and F12, plus the join-semilattice package the F1/F12 carriers share, then
executes the same definitions to author the runtime conformance corpus at
`packages/plait/fixtures/fabric-conformance.ndjson`.

## Agent direction

Read `../AGENTS.md` first for the model-gate laws this package works under.
What leaves this directory is the corpus named above, and what consumes it is
`packages/plait/src/planes/`, which replays every row against the shipped
services. What is machine-generated *inside* this directory is
`negative-controls/*.cex.txt` — each control's executed refutation. Neither is
hand-authored: the corpus carries its generation command on its own first
line, the traces come out of `lake exe control`, and an edited row or trace is
refused on sight.

Wall here: `./run.sh` — the theorem roster, the axiom-footprint sweep, every
control re-executed and diffed against its committed trace, and byte-identical
re-emission of the corpus; `--self-test` checks the diff machinery still fails
when it should, and CI runs both per push
(`.github/workflows/lean-gates.yml`). Wall there: both halves of the
`packages/plait` battery — `bun run test:walls` for the rows that need a broker,
`bun run test:fast` for the 11 pure-algebra vectors that do not.

One level deeper: `Fabric/Definitions.lean` for the objects and executable
functions, `Fabric/Laws.lean` for statements only, `Fabric/Proofs.lean` for
the proofs, `Fabric/Emit.lean` for the emitter, and `DECISIONS.md` for every
decision the spec did not fix. The guided tour below walks the same files.

## Guided tour

- `Fabric/Definitions.lean` owns the objects and executable functions. A
  `Cell` is a finite set of `(holder, observation)` pairs. `foldEvidence`
  inserts a trace into that set. `guardedApply` records every arrival in a
  position-addressed replay buffer and applies only contiguous successors
  before advancing. That successor/contiguity discipline is the protection;
  the floor is the anchor's derived resume coordinate, not a filter.
  `CommutativeAlgebra` declares the laws
  required before partition folds may be merged. A `ContextProgram` is an
  ordered list of declared reads — address, pure renderer, volatility
  class — and `assemble` is the class-stable ordering of the rendered
  reads: the signature admits a program and a valuation, nothing else. A
  `QueryAlgebra` answers from the anchored state and the query value
  alone (the constructor's closure is the purity admission), `topK` is
  keep-last dedup, then `mergeSort` under score-then-identity, then
  `take k`, and `admitQueryInput` maps every ambient candidate shape —
  seed, clock, schedule — to `none` while admitting the declared-seed
  form as data. `Policy.meet` intersects the
  six set-valued components and takes `Nat.min` across the four ceilings.
- `Fabric/Laws.lean` contains statements only. F1 is cell ACI plus two
  distinct halves stated under their own names: extensionality (equal
  verified sets are equal replicas) and history-level convergence (equal
  evidence multisets under different delivery orders reach one cell); F2
  identifies traces with equal observation support; F2b names its premise in
  two halves — `WindowCoverage` (every window position arrives) and
  `PositionPayloadIntegrity` (an in-window arrival carries exactly its
  positioned payload) — then names the shipped buffer fold in the conclusion;
  F3 is checkpoint resumption; F4 is partition/interleaving equivalence under
  a declared commutative algebra; F9 is the full greatest-lower-bound law plus
  descendant attenuation over ten policy components, the `indexes` and
  `resources` allowlists included. F7 has three statements stated
  separately: assembly reads only its declared addresses (two valuations
  agreeing there assemble one value), segment order is the stable class
  sort of the program's own declared order (the class projection), and
  within each class assembly keeps the program's declared relative order
  (the per-class subsequence) — the projection and the subsequences
  together determine the assembled byte layout. F11 has two halves: top-k is
  a function of the delivered support — quantified over raw lists under
  `SameDeliveredSet`, with the named `IdentityDistinct` premise making
  the identity tie-break antisymmetric — and the composed law: the
  rendered answer at an anchored, resumed support is invariant under
  re-anchoring by F3 and under permutation/duplication of the support.
- `Fabric/Proofs.lean` contains proofs only. The trace proofs reduce equality
  to finite-set membership. F2b inducts over consecutive positions — the
  complete-buffer drain lemma is a private helper whose premise is stated in
  its name — and
  `guard_is_redundant` proves that adding a position-floor/window filter before
  the successor drain cannot change its result. F4 first proves append and
  permutation lemmas. F9 proves set intersection and numeric minimum
  componentwise, then follows an action-tree descendant derivation. F7's
  congruence is a map congruence over the declared reads; its stability
  half is a map/filter commutation, not an `rfl`; its within-class half
  is the filter/flatMap absorption `order_by_volatility_filter_class` —
  the class filter erases the stable ordering. F11's list half walks
  the canonical-form induction: both sorted dedups are duplicate-free
  presentations of one support, and sorted + duplicate-free + same
  members forces equality, with antisymmetry discharged from
  `IdentityDistinct` exactly where the tie-break needs it. The composed
  F11 chains F3 (`f11_state_of_anchor`), the support fold, and the list
  half under a rendered conclusion.
- `Fabric/Mutants.lean` contains sixteen variants, each dropping exactly
  one required law or premise half. The fourth drops the successor discipline and
  is killed by the
  order-sensitive 6-before-5 row; it does not claim to drop the redundant
  floor guard. The fifth drops the position-payload-integrity half: on the
  conflict row `(11,2)/(11,999)/(12,3)` window coverage still holds, and the
  consumer that trusts its last-write buffer replays the late overwrite.
  The sixth consults a read outside its declaration — the timestamp
  selector — and dies on the two-valuations row whose drift lives
  entirely off the declared read set. The seventh orders segments by an
  evaluation completion schedule and dies on the two-schedules row. The
  eighth takes the first k in arrival order — insertion order as the
  tie-break — and dies on the two-arrival-orders row. The ninth consults
  an ambient thread parameter the lawful query carrier does not have —
  a thread-seen entry gets a score boost inside the otherwise-declared
  sort, so at the empty thread it is definitionally the lawful top-k —
  and dies on the two-ambient-threads row. The tenth reverses each
  volatility class's segments while keeping the class blocks: lawful
  under the congruence and class-projection statements at every program,
  it dies on the two-reads-one-class row that the within-class statement
  pins.
  The eleventh pads the join with a sentinel — an upper bound that is
  never least, killed against the lawful join of two distinct cells with
  both upper-bound laws provably retained. The twelfth runs the lawful
  `resolve` outside its well-fenced premise (two seals at one token) and
  dies on the two-orders drift; the thirteenth decides a contested name
  by last write and dies where the lawful answer is one ambiguity
  refusal; the fourteenth arbitrates seals by holder and dies on the
  permuted-seal row against the token order; the fifteenth resolves to
  the last-arrived seal and dies on the same row's two arrival orders.
  The sixteenth fires a hole trigger only while the hole sits EXACTLY at
  the target stage — growth un-fires it — and dies on the committed
  growth row where the lawful reached-at-least production holds at both
  states.
  `Fabric/ControlProofs.lean` proves the retained laws and the
  named counterexamples. `ControlMain.lean` emits the committed counterexample
  traces checked by the gate; the five assembly/query kills use a
  drift-format line, refuted when the mutant's output moves across the
  row's two presentations while the lawful output holds.
- `Fabric/Canonical.lean`, `Fabric/Corpus.lean`, `Fabric/Emit.lean`, and
  `Main.lean` are the
  executable emitter. Object keys are sorted; strings occupy a fixed safe
  ASCII grammar; numbers are non-negative integers. The integer rendering
  transliterates the promoted RQ-9 path in
  `docs/research/reference/rq9-rfc8785-numbers/EsNumberToString.lean`: strip
  decimal trailing zeroes, then render ES2019 step 6. No float enters this
  grammar, capped at the RFC 8785 safe-integer ceiling `9007199254740991`.
- `Fabric/BridgeProofs.lean` supplies the concrete theorem instance named by
  every emitted row. It also proves that the F9 emitter's executable Boolean
  policy order is equivalent to `Policy.Le`. The tree row carries a stricter
  second-level request, so its descendant bytes differ from the one-level clamp.
  `Fabric/Emit.lean` assembles the corpus by applying each row constructor to
  the bridge theorem its row names: a verdict bit is computed under a proof of
  the claim it reports, so a verdict that drifted from its theorem is a type
  error, not a wrong byte.
  The gate refuses a vector whose `(kind, name, witness)` triple is not pinned or
  whose witness is absent from the complete theorem and footprint roster.
- `run.sh` is the gate: source hygiene, file partition, build, complete theorem
  roster, proof footprint, sixteen negative controls, pinned vector counts, and
  byte-identical regeneration.

## How a trace walks through `fold`

`fold step initial [a, b, c]` is the left fold
`step (step (step initial a) b) c`. `foldFrom` is the same walk starting from a
checkpointed state. F3 proves that folding `[a, b]`, checkpointing its result,
and resuming with `[c]` is definitionally the same computation as folding
`[a, b, c]` once.

F2 uses a different fold because evidence is a join-semilattice: inserting the
trace into a finite set deliberately forgets both order and multiplicity. F2b
handles non-idempotent steps. A schedule is finite and may be duplicated,
reordered, and prefixed with stale deliveries. `ingestSchedule` traverses the
actual arrivals and records them by position. F2b's explicit
`F2bSerialSuccessorPremise` describes
the raw schedule in two named halves: `WindowCoverage` says every window
position eventually arrives, and `PositionPayloadIntegrity` says an in-window
arrival carries exactly its positioned payload — duplicates, permutation, and
stale or ahead-of-ceiling deliveries remain
allowed. The proof derives the buffer's coverage from those halves and drains
only consecutive successors. A delivery of 6 before 5 is buffered; the
arrival-order negative control drops the successor discipline, applies
operation 3 immediately, advances the frontier, and skips operation 2. The
order-sensitive append row therefore yields `[3]` in the mutant and `[2, 3]`
in the lawful model. The payload-conflict control drops the integrity half
instead: positions stay covered, the two arrivals at position 11 disagree,
and the last-write buffer replays `999` in place of operation 2. The theorem
remains generic in `step`, so counting and
other non-idempotent folds are included.

The original dispatch requested a drop-floor-guard control. The round-3
coordinator ruling on DEV-695 (comment
`7cb08c80-7c12-4a1d-9a7e-0daed812a0e5`, 2026-08-17) records the approved
deviation: `guard_is_redundant` proves that control is unstatable in this
model, so the fourth control drops the load-bearing successor discipline
instead.

## How an assembly and a query stay deterministic

`assemble program valuation` renders each declared read at its address and
presents the segments in the fixed class order (static, policy, session,
live, turn), equal-class segments keeping program order. Determinism is
three theorems, not a signature: valuations that agree on the declared
addresses assemble one value (so a variant consulting the undeclared
timestamp address is refutable — and dies on the committed
two-valuations row), the segment order is a function of the program
alone (so a variant ordering by evaluation completion dies on the
two-schedules row), and each class's subsequence is the program-order
rendering's (so a rival that reverses inside a class — invisible to the
other two statements — dies on the two-reads-one-class row).

A query answers over an anchored support: the state is the entry list the
admitted deliveries appended, resumption is F3, and `topK` dedups the
support, sorts by declared score with the identity tie-break, and takes
k. Two arrival schedules of one support — permuted, duplicated, split at
different checkpoints — render one answer. The tie-break is why: at equal
scores, identity bytes order entries, and the named `IdentityDistinct`
premise (content-addressed entries: identity determines the entry) makes
that order antisymmetric. The mutant that takes the first k in arrival
order and the mutant that consults an ambient thread each die on their
committed two-presentation rows. At admission, a query declaration
naming an ambient seed, clock, or schedule is refused with F11 named;
a seed declared as data — inside the digest — is admitted.

## How a name resolves under a fence

A directory is `Map Petname (FiniteSet Digest)` under componentwise
union, carried as its graph: a finite set of `(petname, digest)` pairs,
where union of graphs IS componentwise union of the induced maps
(`directory_merge_bindings`), and an empty-set-valued name is
unrepresentable by construction. Binding append is monotone,
coordination-free, and duplicate-safe — the F1-for-maps package
(`f12_directory_merge_aci`, `f12_directory_extensional`,
`f12_directory_convergence`) says exactly that, and both the cell and
the directory instantiate one general join-semilattice package
(`join_semilattice_of_aci`, the `SemilatticeSup.mk'` construction from
ACI alone): the derived order `supLe sup a b := (sup a b = b)` is
reflexive, antisymmetric, and transitive, the join is the least upper
bound, and every absorb is an inflation — `cell_absorb_inflationary`
is the theorem that a replica's current cell is a lattice lower bound
of every state it can reach.

`resolve identity dir name seals` computes: with any seal observed, the
binding sealed at the greatest observed fencing token — over seal data
alone, because a seal is evidence of a landed fenced decision whose
monotone bind may still be in flight; with no seal, the candidate set
answers — one binding, an absence refusal, or an `ambiguous-binding`
refusal listing the candidates in identity order. A seal is
`{token, holder, digest}`; the holder is attributed data and never an
arbitration input — the token decides, never the who — and the
holder-arbitrating mutant dies on the committed permuted-seal row.
`SealsWellFenced` (every observed token names one seal) is a named
premise discharged by citation of the register package's F5 invariants
I1/I2 (`verify/fabric-veil`, Lean 4.28.0 under the ruled toolchain
split), never restated here: `greatestSeal` keeps the earlier arrival
at a token tie, so nothing in this package decides a tie — outside the
premise the drop-seals-well-fenced control shows resolution turning
schedule-dependent, which is the premise's load-bearing proof. The
verdict characterization (`f12_resolution_characterization`) is
deliberately premise-free computation accounting over the arrival
schedule; the order-free meaning law is `f12_greatest_seal_wins` under
the premise, and `f12_resolution_of_support` carries schedule
independence. Observing a stale-token rebind is inert
(`stale_token_rebind_inert`); why a stale token can never land in the
register in the first place is F5's, cited above. One bound rides every
resolution theorem: the model resolves a snapshot pair — a directory
state and an observed seal history — and says nothing about how a
runtime obtains a coherent snapshot of the two planes; that atomicity
is the consuming slice's harness question, not covered by these
theorems.

## How a trigger stays fired

A trigger is a declared monotone predicate over the fabric state — the
closed five-production grammar `TriggerPredicate` (evidence-appears,
cell-reaches, hole-reaches, outcome-landed, head-advanced-past). Absence,
negation, and deadline are unrepresentable: no constructor exists to
carry them, so the non-monotone shapes are refused by the grammar's
closure itself, and the deadline seat stays a fenced session act outside
this algebra. The fabric order is componentwise (`FabricState.Le`): the
evidence and per-cell components grow in the derived semilattice order —
`cell_le_iff_subset` bridges it to membership — hole stages only rise
along the epistemic rank (opened, filled, disputed, decided, sealed; the
high-water reading), landed outcomes grow by inclusion, and the head by
the journal prefix order projected to its length. `f10_stability` says a
predicate that holds keeps holding under growth — an enabled firing
never un-fires — with the hole production stable in its reached-at-least
form only (the is-exactly variant is the committed control), and
`f10_hints_of_support` says duplicate-and-permute delivery of one
evidence support fires one hint set (`enabledDeclarations`, monotone by
`enabled_declarations_monotone`). That a fired hint's landed claim never
lands twice is the register's F5 I2 — cited, never restated here.

## How the action DAG stays acyclic, and where compaction may cut

C7's pin order is admission itself: `Admission` grows a ledger one
declaration at a time, every pin naming an already-admitted work digest
and every digest admitted at most once (the in-model reading of content
addressing — that a real digest cycle would need a hash preimage is the
trusted base's sentence, not a theorem here). Pins therefore descend
strictly in admission rank, and `c7_pin_well_founded` pulls `Nat`'s
order back along that rank: the action DAG is well-founded — acyclic —
by construction.

The compaction horizon is derived, never chosen:
`compact_below_floor_preserves_resumption` proves that compacting a lane
at or below a deployed fold's anchor floor preserves the fold's resumed
terminal state (resume the anchor over the compacted remainder and you
have the uncompacted fold — an F3 instance), and
`compact_below_horizon_preserves_resumption` quantifies it over every
deployed anchor at or below the minimum floor. `Retention.horizon`
serves that bound; a compaction act past it is refused, not warned
about. The minimum anchor floor plays the role recovery systems give a
minimum recovery position: truncation below it is safe exactly because
every resumption is anchored above it.

## Notation

- `x ∈ cell`: observation `x` is a member of the finite cell.
- `left ∪ right`: cell merge (set union).
- `left ∩ right`: policy-component meet (set intersection).
- `child ≤ parent`: every child set is a subset of the corresponding parent
  set and every child numeric ceiling is at most the parent's.
- `xs.Perm ys`: `ys` contains exactly the elements of `xs` in another order.
- `xs ++ ys`: list concatenation.
- `¬ p` and `x ≠ y`: proposition `p` is false, and `x` and `y` differ.

## What the footprint proves

For every theorem in the roster, the gate asks Lean to print its transitive
axiom dependencies and permits only `propext`, `Classical.choice`, and
`Quot.sound`. This catches proof routes that compile while importing an
additional axiom. Source hygiene separately rejects the known evaluator and
code-generation escape hatches.

The footprint does not prove that the definitions are the right model of a
running broker, that the emitter is RFC 8785-correct outside its narrowed
integer/ASCII grammar, or that a TypeScript/Go consumer corresponds to Lean.
Those are later wall and lockstep obligations. This package proves only the
stated algebra over its definitions; it makes no liveness, NATS, crash, lease,
or runtime-conformance claim.

## Run

```sh
cd verify/fabric
lake build
lake exe emitter
./run.sh
```

The first emitter line records the full command and output path. Never edit the
fixture or a counterexample trace by hand; regenerate them through their
executable.
