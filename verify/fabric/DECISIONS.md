# Fabric model — decisions the dispatch did not fix

Task-local placeholders follow the numbering rule in `proto/DECISIONS.md`;
repository D-numbers are assigned at merge.

### T1. State F2 by equality of observation support

Decided: `SameDeliveredSet` compares `List.contains` for every
holder-attributed observation; `foldEvidence` is the finite set constructed
from the list. Alternatives: separate permutation and duplication inductive
relations; a multiset quotient. Why: equality of support is exactly the
equivalence generated jointly by arbitrary permutations and duplications, and
the extensional finite-set proof is the house semilattice idiom. **Load-bearing?
yes** — retaining multiplicity would destroy F2.

### T2. Model bounded redelivery with an explicit serial successor premise

Decided: `ingestSchedule` traverses every raw arrival and folds operations into
a buffer addressed by journal position. `F2bSerialSuccessorPremise` is not an
equation about that buffer: it says the in-window support of the raw arrivals
is exactly the consecutive positioned trace. The proof derives that the
shipped buffer
normalises every such duplicate/permuted schedule, and `guardedApply` advances
only at `floor + 1`. Stale entries at or below the floor may be present, but
application stays serial within a partition. The floor is a derived resume
coordinate; `guard_is_redundant` proves that pre-filtering arrivals by the
floor/window cannot change a successor-drained result. Alternatives: make the
buffer-output equation the premise; refuse every ahead-of-frontier delivery
instead of buffering it; model buffer capacity and liveness. Why: delivery 6
before 5 falsifies arrival-order application — an order-sensitive append step
yields `[3]` instead of `[2, 3]` — while the theorem remains generic in the
step function. **Load-bearing? yes** — the raw-support premise and successor
discipline are the runtime rules whose consequence the model proves.

### T3. Represent policy components uniformly

Decided: four finite sets (`capabilities`, `contextAllowlist`, `toolkits`,
`writ`) share a generic atom carrier and comparator; four numeric ceilings
(`capabilityClass`, `effortClass`, `budget`, `spawnBound`) use `Nat`. Meet is
intersection/minimum, and `≤` is subset/numeric order. Alternatives: one type
parameter per set; a single undifferentiated permission set. Why: this keeps all
spec-named components explicit while allowing one reusable finite-set proof.
**Load-bearing? no** — distinct atom types would deepen the type model without
changing F9.

### T4. Emit eleven fixed adversarial vectors as NDJSON

Decided: one provenance/count header plus 11 deterministic rows: F1 (1), F2
(2), F2b (3), F3 (1), F4 (1), F9 (2), and ACI-alphabet refusal (1).
Alternatives: seeded random traces; one large JSON array. Why: the named rows
are the smallest corpus covering every dispatched adversary and every law;
the bounded-reordering row uses list append so a buffer-less arrival-order
consumer observably disagrees. NDJSON follows the DEV-670 emitter idiom and
yields useful one-row diffs. The gate pins total/per-kind counts and every
`(kind, name, witness)` triple. **Load-bearing? maybe** — consumers
may later request more rows, but any change is an explicit regenerated wire
change.

### T5. Use algebra-specific one-law mutants

Decided: a multiplicity-retaining cell over the shipped observation carrier
drops idempotence while retaining associativity and commutativity; left choice
over the shipped `GroundCell` drops commutativity while retaining associativity
and idempotence; the arrival-order mutant uses the shipped 6-before-5 row and
drops successor discipline; trusting the requested policy drops only
meet-clamping. Alternatives: toy scalar algebras; copy four whole models. Why:
every variant now shares the shipped carrier, vector data, or executable
consumer and is killed by that exact named row. **Load-bearing? yes** — a
mutant that drops two laws does not demonstrate which discriminator killed it.

### T6. Narrow canonical JSON to the actual corpus grammar

Decided: object sorting with duplicate-key collapse, RFC 8785 string escaping,
arrays, booleans, and non-negative safe-integer leaves only; transliterate and
cite the RQ-9 integer path, and mechanically refuse a generated corpus above
`9007199254740991`.
Alternatives: Lean's general `Json.compress`; a new float renderer. Why: the
dispatch bars floats and promotes the RQ-9 route; the narrower grammar makes
the trusted emitter surface explicit and avoids re-deriving the unresolved
shortest-round-trip problem. **Load-bearing? yes** — canonical bytes are the
wall identity.

### T7. Record the unstatable floor-guard control as a proved deviation

Decided: remove the observationally redundant ingestion guard, roster
`guard_is_redundant`, and name the fourth negative-control family
`drop-successor-discipline`. This is the coordinator-approved deviation from
dispatch 30's requested drop-floor-guard control (DEV-695 round-3 ruling,
comment `7cb08c80-7c12-4a1d-9a7e-0daed812a0e5`, 2026-08-17). Alternatives:
retain the guard as defense-in-depth; continue naming the successor mutant as
a guard mutant. Why: the accepted theorem proves the guard cannot affect any
result in this model, while the 6-before-5 row refutes removal of the actual
successor discipline. **Load-bearing? yes** — it determines what the fourth
negative control honestly claims.

### T8. Run the corpus-diff self-test beside the fabric gate in Lean CI

Decided: `lean-gates.yml` runs `verify/fabric/run.sh --self-test` immediately
after the ordinary fabric gate. Its four plants exercise a corpus substitution,
a model substitution, one-row deletion, and one-row insertion. The diagnostic
states its positional ceiling as `positional-bound=one-row-lookahead`; longer
edit runs and permutations are refused but are outside its row attribution
claim. Alternatives: deepen the reporter to an edit script; enroll the controls
in `negative-controls.yml`; leave them local-only. Why: the controls exercise
the fabric gate's own regeneration comparison and use the same Lean toolchain,
so the adjacent step keeps proof and diff machinery under one runner.
**Load-bearing? yes** — a self-test that CI never executes can silently stop detecting
model/corpus divergence, while an unstated lookahead bound overclaims diagnosis.

### T9. Exercise install hermeticity through the gate runner self-test

Decided: `bun run gates --self-test` drives the install preflight against two
temporary absent-install roots and then the same present-install roots. It
plants a lockfile mutation, the real `proto/ts` lock drift in a warm temporary
tree, a stubbed frozen-install exit, and a successful install that omits
`node_modules`; the committed trace pins all four refusals. The warm drift plant
also requires Bun's output to contain `lockfile is frozen`, so an unrelated
exit 1 cannot satisfy it. `gates.yml` runs this self-test after the root frozen
install, putting the three runner controls and all preflight controls in CI.
Alternatives: a separate preflight control command; deleting the real checkout's
installs during the runner self-test. Why: the runner owns the local/CI mirror,
and temporary trees reproduce both dependency states without touching the
working checkout; the warm drift control invokes CI's exact frozen command and
now proves its cause, not only its exit code.
**Load-bearing? yes** — a control
over the real tree would make the safety test itself destructive, while an
absence-only control would miss the warm-tree lockfile drift found in review.

### T15. Shape the split F2b premise with bounded quantifiers

Decided: `WindowCoverage` quantifies over the positioned trace (for every
expected record, some arrival shares its position) and
`PositionPayloadIntegrity` over the arrivals (every in-window arrival is
exactly its trace record); `F2bSerialSuccessorPremise` is their conjunction,
and the bundled iff-form `SerialSuccessorSchedule` definition is deleted
rather than kept as an alias. `Positioned` now derives `DecidableEq` only, so
its `BEq` comes from the lawful decidable-equality bridge. Alternatives: keep
the old iff plus an equivalence theorem; state the payload half as
operation-equality-at-position without trace membership. Why: the two premise
roles carry separate citable names, and the bounded forall/exists forms make
every concrete schedule instance decidable — the emitter premise witnesses
became `decide` obligations instead of per-instance omega scripts.
**Load-bearing? yes** — later families and statements cite the halves by
name.

### T16. Kill the dropped integrity half with the shipped consumer itself

Decided: the fifth mutant `lastWriteBufferApply` is `guardedApply`'s own body
run outside its premise, killed on the reviewer-shaped conflict row
`(11,2)/(11,999)/(12,3)` with the intended trace fold as the lawful
comparator; the retained side is pinned by coverage-still-holds and
agrees-under-both-halves theorems. Alternatives: a structurally different
conflict-resolving mutant; comparing against first-write buffering. Why: the
runtime's protection against payload conflict IS the premise (redelivery of a
journal position repeats its bytes), so the honest mutant is the consumer
trusting its buffer where that premise fails — coverage holding isolates the
kill to the integrity half alone. **Load-bearing? yes** — it demonstrates
which premise half protects payload fidelity.

### T17. Emit verdict bits from the bridge-theorem terms

Decided: row constructors in `Corpus.lean` take the witness theorem's exact
statement as an argument; `Fabric/Emit.lean` (definitions only, importing
`BridgeProofs`) applies each constructor to its rostered theorem; the
`verdictOf*` combinators compute the reported comparison while demanding the
proof that fixes its outcome. Emitted bytes are unchanged. Alternatives:
grep-asserting the pinned verdict fields `true` in the gate; per-field
verdict theorems. Why: verdict truth becomes an elaboration fact — a verdict
that drifted from its theorem no longer typechecks — while the emission stays
a computed value and the corpus stays byte-diffed. **Load-bearing? yes** —
this is the mechanical closure of the vector-to-theorem binding.

### T18. Name the four durable-fold families in plain ASCII

Decided: the composed resume-then-redeliver row carries kind `F3-F2b` — an
ASCII kind is the chosen convention for a wire family list, and it is a
convention, not a grammar force (the canonical encoder passes non-ASCII
through verbatim); the hyphen is pinned three separate ways — the header
bytes, the per-kind counts, and the witness triple — which is what the
consuming wall keys on; the ahead-of-ceiling, multi-gap, and redeliver-twice rows are
kind `F2b`; row names are the dispatch's own phrases; the four rows append
after the existing eleven so committed row bytes and the self-test's planted
row indices stay fixed; the order- and duplication-sensitive rows use the
append step, while ahead-of-ceiling mirrors the stale row's `Nat.add`
carrier. Alternatives: a non-ASCII composed kind; one new kind per row;
interleaving new rows among old kinds. Why: family identity stays visible in
the pinned per-kind counts without moving a single committed byte of the
existing rows. **Load-bearing? maybe** — the names and kinds are the
consuming wall's family list; flagged to the coordinator in the closing
report.

### T19. Ground allowlist atoms that escalate on both new components

Decided: `indexes` 60/{60,61}/60 and `resources` {70,71}/{71,72}/{71} for
root, escalating request, and attenuated child, so the clamp row's request
escalates on both allowlists and the tree row attenuates through them; the
meet-clamping control keeps its budget discriminator, leaving its committed
trace byte-stable. Alternatives: inherit escalation from existing components
only. Why: the new fields should be exercised by the very row that audits
clamping, not carried as dead weight. **Load-bearing? no** — any escalating
values would do.

### T20. Shape the F7 carrier as declared reads with a filter-concatenation class sort

Decided: a `ContextRead` is `(addr, render, volatility)` with the renderer a
pure `Value -> String`; a `ContextProgram` is exactly its ordered read list;
`assemble` is the class-stable ordering of the rendered reads, where the
ordering is the five class filters concatenated in the fixed
`Volatility.all` order. Stability is therefore constructive — equal-class
segments keep program order by the shape of the function — and
`f7_segment_order_stable` states it as a map/filter commutation, which no
`rfl` closes. The congruence half quantifies two valuations over the
declared address list, the `apply_successors_congr` shape. Alternatives: a
general stable-sort routine with a stability lemma; segment order as part
of the congruence statement. Why: the fixed five-class counting sort is the
smallest function whose stability is inspectable, and the two halves stay
separately falsifiable — the ambient-read mutant kills the congruence half,
the completion-schedule mutant kills the order half. **Load-bearing? yes**
— the class-filter order is the byte layout every lawful assembler must
reproduce.

### T21. Model the ambient read as an extended program, the schedule as an index list

Decided: the F7 ambient mutant is `assemble` of the program EXTENDED with
one undeclared read (the timestamp selector at address 99), killed on a
two-valuations row that agrees on every declared address; the order mutant
renders reads then emits segments in a completion-schedule index order,
killed on a two-schedules row. Both kills use a drift-format control line
(`lawful-left/right`, `mutant-left/right`; refuted when the mutant moves
while the lawful value holds), because the crime is sensitivity to an
input the lawful signature does not admit, not a wrong value on one input.
Alternatives: a hand-written ambient assembler; encoding kills as single
lawful-vs-mutant values. Why: reusing the lawful body isolates the one
dropped law (the T16 idiom), and a single-value line cannot state "moved
when only the undeclared input moved". **Load-bearing? maybe** — the trace
format is the committed refutation evidence.

### T22. State F11's support equality as `SameDeliveredSet` and name the distinctness premise

Decided: the list-level half `f11_topk_of_support` quantifies two raw
`List Entry` arrivals under `SameDeliveredSet` — F2's own premise name, so
permutation and duplication are covered by one support equality — plus the
named `IdentityDistinct` premise (identity bytes determine the entry
within the support), which is exactly what makes `byScoreThenIdentity`
antisymmetric; `topK` is keep-last dedup, then core `mergeSort` under
score-descending/identity-ascending, then `take k`. The proof is the
canonical-form induction `sorted_nodup_eq_of_same_mem` (sorted +
duplicate-free + same members => equal), with antisymmetry demanded only
on members so the distinctness premise lands where the card's hard-step
note points. Ground entries are content-addressed (`id` is the identity),
so the premise discharges by `decide`; the concrete rows reach the
theorems through a decidable mutual-containment bridge
(`same_delivered_of_mutual_contains`). Alternatives: an `ExtTreeSet`
statement (carrier-discharged and unfalsifiable — refused by the DEV-706
verdict); multiset quotients; a hand-rolled insertion sort. Why: the raw
list formulation is where the insertion-order mutant dies, and core
`mergeSort`'s `pairwise`/`perm` lemmas carry the sort obligations.
**Load-bearing? yes** — dropping `IdentityDistinct` makes equal-score
equal-identity entries order-ambiguous and the law false.

### T23. Refuse ambient query inputs at admission as the constructor's closure

Decided: `QueryAlgebra` has the single field `answer : State -> Query ->
Result` — no seed, clock, schedule, or locale parameter exists to read —
and admission is the structural map `admitQueryInput` from a candidate
inductive that also enumerates the ambient shapes, each mapped to `none`;
the declared-seed form is admitted as data (`declaredSeed 7` — the seed
inside the declaration, hence inside the digest). Admissibility is never
defined as "equal inputs give equal results" — that would smuggle F11's
conclusion into its premise (the DEV-706 refusal, binding). The refusing
corpus row carries `reason = "F11-undeclared-ambient-input"`.
Alternatives: an admission predicate over an open evaluator type; refusing
seeds entirely. Why: the closure IS the purity theorem's ground, and the
declared-seed positive half keeps seeded ranking representable without an
ambient door. **Load-bearing? yes** — the composed determinism theorem is
sound only because the carrier cannot express an ambient read.

### T24. Emit the M2 families as kinds F7, F11, and query-admission

Decided: five appended rows — `F7` (assembly-declared-reads,
assembly-volatility-order), `F11` (topk-across-arrival-orders,
query-at-reanchored-state), `query-admission` (undeclared-seed-refused) —
after the existing fifteen, so committed row bytes and the self-test's
planted row indices stay fixed; the header count object gains the three
kinds and moves `vectors` to 20. Ground query data: support {5, 7, 12, 23}
under the decade-bucket score (a two-way tie at score 0 exercises the
identity tie-break), k = 3, both arrivals carrying one duplication, the
re-anchored row splitting the two schedules at different floors.
Alternatives: one kind per row; folding admission into `alphabet-refusal`.
Why: family identity is what the slice-1b/2a walls key on, and the
admission row parallels the ACI intruder row's refusal shape.
**Load-bearing? maybe** — the names and kinds are the consuming walls'
family list; flagged to the coordinator in the closing report.

### T25. State the within-class half; rebuild the thread mutant inside the declared sort

Decided: F7 gains its third statement, `F7WithinClassOrder` — the per-class
subsequence of the assembled value is exactly the program-order rendering's
— after the M2 review (DEV-729) exhibited a rival assembler
(`rivalAssemble`: reverse each class block) that satisfies both prior
halves at every program and valuation yet moves bytes on any program with
two reads in one class; the ground program's classes are pairwise
distinct, so no prior row or control could see it
(`rival_keeps_distinct_class_ground_row`). The proof is the filter/flatMap
absorption `order_by_volatility_filter_class`; the tenth control kills the
rival on a committed two-reads-one-class vector whose drift line compares
two genuinely different presentations (assembled value vs program-order
rendering, both filtered to the class), while general retained-side
theorems keep the rival lawful under congruence and class projection. With
the third statement, class projection plus per-class subsequences
determine the assembled list — which is what licenses T20's sentence that
the class-filter order is the byte layout every lawful assembler must
reproduce. In the same round the ninth mutant is rebuilt as a score boost
INSIDE the declared sort: the old partition-then-take shape also dropped
the declared order (review finding — at the empty thread it was
definitionally the eighth mutant), where the rebuilt variant is
definitionally the lawful `topK` at the empty thread
(`drop_schedule_independence_keeps_empty_thread`, a generic identity, not
a concrete pin), so its kill is attributable to consulting the thread
alone. Also from the review: both F11 law statements now carry
`[LawfulBEq Entry]` — as written they were refutable at an unlawful
instance while their theorems assumed lawfulness — and T24's tie count is
corrected to two-way. Alternatives: stop claiming within-class order in
the three prose sites (Laws docstring, T20, README) instead of stating
it; keep the double-drop ninth with amended prose. Why: slice 2a's
byte-identical reassembly wall keys on exactly the within-class claim,
and a mutant that drops two laws cannot attribute its kill.
**Load-bearing? yes** — the third statement is what turns "two lawful
assemblers agree byte-for-byte" from a sentence into a theorem.

### T26. Carry the directory as the graph of the name-to-set map

Decided: `Directory Petname Digest cmp := FiniteSet (Binding Petname Digest) cmp`
— the graph of `Map Petname (FiniteSet Digest)` — with `merge` as set union
and the componentwise reading proved (`directory_merge_bindings`: at every
name, the bindings of a merged directory are the union of the two sides'
bindings). Maps with absent-name-means-empty correspond exactly to binding
graphs, and componentwise union of maps is union of graphs. An empty-set-valued
key is unrepresentable because a key exists iff a pair exists, so no
well-formedness invariant threads through any statement. Alternatives: a
canonical association-list map (needs a no-empty-values invariant carried
through every merge); generalizing `Cell` to a parametric carrier (ruled
out — it reopens landed F1 statements mid-push). Why: the graph side gives
state extensionality on the same footing as the cell, keeps every raw-list
law statable (the falsifiability split: schedule-level laws quantify raw
event lists, where the LWW and seal mutants die), and emits
deterministically. **Load-bearing? yes** — it is the carrier of every F12
statement.

### T27. Observe seals as raw arrival lists with first-kept ties and seal-plane-wins

Decided: `resolve` consumes the observed seal history as a raw
`List (Seal Digest)` — `Seal` is `{token, holder, digest}`, the holder
attributed data and never an arbitration input — and `greatestSeal`
replaces its running maximum only on a strictly larger token, so at a
token tie the earlier arrival is kept. The tie is therefore decided
nowhere except by the `SealsWellFenced` premise (every observed token
names one seal), which is discharged by citation of the register's F5
invariants I1/I2 (`verify/fabric-veil`) and never restated in this
toolchain. With any seal observed the sealed digest wins regardless of
candidate membership: a seal is evidence of a landed fenced decision
whose monotone bind may still be in flight, and demanding the digest
among the candidates would leak a head-relative absence — a liveness
fact — into a correctness verdict. Alternatives: a canonical seal-set
carrier (a set fold makes ties schedule-independent by an undeclared
arbitration rule — exactly what a load-bearing premise forbids); total
tie-breaking by digest order (an arbitration rule nobody declared);
requiring the sealed digest among the candidates. Why: the raw list
keeps the drop-seals-well-fenced control statable — outside the premise
the two arrival orders of one unfenced support visibly resolve
differently — and under the premise `greatest_seal_of_support` proves
schedule independence. **Load-bearing? yes** — the premise's
load-bearingness is demonstrated by the committed control, and its
discharge is the named F5 citation.

### T28. List candidates canonically through the T22 sort machinery

Decided: `candidates` is keep-last dedup then core `mergeSort` under
`byIdentity identity := byScoreThenIdentity (fun _ => 0) identity`, so
the T22 totality/transitivity/antisymmetry lemmas apply verbatim and the
ambiguity listing is canonical in identity order, never arrival order.
Ground candidate facts go through `candidates_eq_canonical` (a sorted,
duplicate-free listing with exactly the bound digests is the canonical
listing) because core `mergeSort` is opaque to kernel reduction — a
`decide` through the sort does not evaluate. Alternatives: a bespoke
structurally recursive insertion sort (kernel-reduces, but re-proves the
sort obligations T22 already carries); relying on the binding set's
listing order (couples the statement to tree internals). Why: one sort
order, one lemma set, and the decide-friendly bridge keeps every ground
row's witness an exact law instance. **Load-bearing? yes** — ambiguity
listings are wire bytes, and their order must be a function of the
support.

### T29. Prove one hypothesis-parameterized semilattice package; the minimality control mutates the join

Decided: the join-semilattice package is proved once over a raw join
function with the three ACI facts as hypotheses — the
`SemilatticeSup.mk'` construction transliterated, names kept
(`le_refl`, `le_antisymm`, `le_trans`, `le_sup_left`, `le_sup_right`,
`sup_le`) — with `supLe sup a b := (sup a b = b)` as the derived order,
and instantiated twice (cell, directory), the replica lower bound
rostered as `absorb_inflationary` with per-carrier instances. Under the
derived order, lub-ness is a theorem of ACI, so no mutant can keep the
algebra intact and break minimality alone — a minimality-only drop is
inexpressible over an intact algebra. The honest control therefore
mutates the join itself (`paddedJoin`: always union a sentinel), with
both upper-bound laws provably retained and the kill row pinned at two
distinct cells against their lawful join. Alternatives: a bundled
structure carrying proof fields (its instances cannot live in the
definition partition, whose files must not depend on the proof files);
two concrete per-carrier packages (duplicates every lemma). Why: the
hypothesis form is the general shape proved once, and the partition
stays clean. **Load-bearing? yes** — the A-8b affordance sentence cites
`cell_absorb_inflationary`, and the control's attribution rests on the
retained upper-bound theorems.

### T30. State the resolution characterization premise-free

Decided: `f12_resolution_characterization` carries no `SealsWellFenced`
premise — it is computation accounting over the arrival schedule, an
iff per verdict row (which carries exhaustiveness and mutual exclusion
inherently), whose sealedAt clause speaks of `greatestSeal`'s own
first-kept pick. The order-free meaning law is `f12_greatest_seal_wins`
under the premise, and schedule independence is
`f12_resolution_of_support` under the premise. Alternatives: threading
the premise through every clause (weakens a total statement with a
hypothesis it does not use, and dresses the premise as decorative
exactly where the drop-seals-well-fenced control proves it
load-bearing elsewhere). Why: fewer premises where premises add nothing
is the stronger and more honest form; the premise stays exactly where
its drop is refutable. **Load-bearing? yes** — the division of labor is
what the row text must state so the sealedAt clause is never over-read
as the resolution law.

### T31. Enumerate every capitalized law definition in the gate

Decided: the gate's law enumeration matches `def [A-Z]...` in
`Fabric/Laws.lean` instead of `def F...`, so a law statement whose name
does not begin with F (the C7 admission-order law) cannot silently
escape the expected-laws diff. Alternatives: keep the F-prefix pattern
and F-prefix every law name. Why: strictly wider detection, no rename
churn. **Load-bearing? yes** — an unenumerated law def would be an
unreviewed statement surface.

### T32. Close the trigger grammar as a five-production inductive over a product fabric order

Decided: `TriggerPredicate` has exactly the five ruled constructors —
evidence-appears, cell-reaches, hole-reaches, outcome-landed,
head-advanced-past — and no admission map: absence, negation, and
deadline have no constructor to carry them, so the grammar's closure IS
the structural enforcement. `FabricState` is a product carrier whose
order is componentwise: the evidence and per-cell components grow in
the derived semilattice order (`supLe Cell.merge`, bridged to
membership by `cell_le_iff_subset` — the semilattice synergy made
citable), hole stages rise along the epistemic rank
(opened < filled < disputed < decided < sealed; the high-water reading —
runtime monotonicity of real hole evolution is the projection lane's
question), landed outcomes by inclusion, and the head by `Nat` order as
the journal prefix order projected to length — the prefix order is not
forced into the semilattice. The hole production is reached-at-least
only; the is-exactly variant IS the negative control, killed on the
committed growth row while the lawful form holds at both states.
`holdsBool` is the executable twin with `holds_iff_holds_bool` the
bridge, and hint emission is `enabledDeclarations`, monotone along the
order (`enabled_declarations_monotone`) with support-determinism riding
F2 (`f10_hints_of_support` under `SameDeliveredSet`). That a fired
hint's landed claim never lands twice is the register's F5 I2 — cited,
never restated. Alternatives: a trigger-admission candidate map
mirroring T23 (rejected — a corpus row without machinery behind it is
what the corpus discipline refuses; the closed inductive already
enforces G9); folding evidence-appears into cell-reaches (the five
productions are the ruled grammar; the containment overlap is consumer
ergonomics). **Load-bearing? yes** — stability in reaches-form is the
statement E9's trigger pump wall keys on.

### T33. Embed the pin order in admission rank; state compaction boundary-inclusive

Decided: C7's admission order is an inductive over newest-first ledgers
whose `admit` step demands every pin name an already-admitted work
digest AND the new digest be fresh — freshness is the in-model reading
of content addressing (one value, one digest), and the real-world half
(a digest cycle needs a hash preimage) stays in the trusted base, on
the row. Well-foundedness is the index embedding: pins descend strictly
in admission rank (`pin_rank_lt`), and `Subrelation.wf` over
`InvImage` pulls `Nat`'s order back along the rank — no accessibility
surgery. The compaction corollary is stated boundary-inclusive
(`upTo <= floor`): resuming a fold's own anchor over the compacted
remainder is the uncompacted fold, with `compact_preserves_anchor_state`
carrying the half where the premise is load-bearing (past the floor
there is no anchor left to reconstruct), and the horizon form
quantifying every deployed anchor at or below `minimumFloor`.
Alternatives: acyclicity via transitive-closure irreflexivity (needs
closure machinery the corollary consumer never cites); a strict
`upTo < floor` statement (weaker than what is true — the ruled
"strictly below the horizon" sentence is licensed with margin by the
inclusive form). Why: the rank embedding is the whole proof, and the
refusal boundary cites the theorem, not the inequality's edge.
**Load-bearing? yes** — `Retention.horizon` and the
compaction-past-horizon refusal cite `compact_below_floor_preserves_resumption`
by name, and E9's row cites the admission order's freshness as the
content-addressing seam.

### T10. Compile the gate battery with tsgo; keep tsc as the installed referee

Decided: every battery typecheck — the root script's four projects and the
`proto/ts` stage — runs `@typescript/native-preview` (`tsgo`), pinned EXACT at
`7.0.0-dev.20260707.2` in the workspace devDependencies and spawned through its
JS launcher, never a floating `bunx`. `typescript` stays installed: the Effect
language-service CLI needs the TS API, editors keep the patched tsc, and tsc is
the referee any future tsgo diagnostic is diffed against — a tsgo-vs-tsc
disagreement is a FINDING to report, never silently absorbed by switching back.
The Effect rules the patched tsc injected into `tsc --noEmit` run as their own
lane, `effect-language-service diagnostics --project <tsconfig> --strict`, for
each project whose sources import effect: `packages/plait` in the root
typecheck script, `proto/ts` as a battery stage. The CLI checks ZERO files and
passes when a project tsconfig lacks the language-service plugin entry, which
is why `proto/ts/tsconfig.json` now carries one. Cutover evidence (this host,
2026-08-17): healthy-tree diagnostic parity 0=0 on all five project configs;
with `effect` hidden both compilers emit the same 102-diagnostic set, differing
only in emission order and CRLF, with tsc exiting 2 where tsgo exits 1; three
planted violations (TS2322, TS2375, indexed-access TS2322) refused; warm
compile chain 12.4s → 2.7s. Alternatives: keep the patched tsc (the
crisis-window cost that motivated the cutover); one root-project Effect lane
instead of per-project lanes (superset coverage, but a shape the dispatch did
not name); a version range (a dev-channel range makes every install an
unreviewed compiler swap). Why: the native binary holds its speed on the cold
trees fresh seats pay for, and parity was measured, not assumed.
**Load-bearing? yes** — a dev-preview compiler is now the gate's judge; the
exact pin, the retained referee, and the committed plant trace
(`scripts/gates-typecheck.trace.txt`) are what keep that honest.
