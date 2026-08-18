# Kernel-model notes — the algebra's first machine-checked realization

Status: **EXPLORATORY, pre-grill.** Written by the kernel-model lane on
branch `agent/kernel-model` beside `verify/kernel/` (landed at
`f74c2ca6e`, gate green). The authority is the ratified kernel-algebra
record (`docs/design/2026-08-18-plait-kernel-algebra.md`, K-1..K-10 all
ruled, K-6 the protocol pin); this record argues the modeling decisions
the design left to the model's discretion, states honest bounds, and
carries the KM grill list. It claims no verification rung, adds no
VERIFICATION.md row, wires no CI, and is imported by nothing — the
lane's blast radius is `verify/kernel/` plus this file. Un-grilled
machinery gets rolled back; everything here is priced for that.

For an outsider, one paragraph. The estate's agent-facing API is
designed as a tiny algebra: eight primitive acts over content-addressed
state, a closed set of composition rules, and a list of things that
deliberately have no syntax at all (clock reads, unfenced decisions,
last-writer-wins merges, reference cycles, and ten more). This package
is that design rebuilt inside a proof assistant, so the claims stop
being prose: the lawful acts are a datatype whose constructors demand
the right sorts, the unlawful spellings are a second datatype that a
single admission function must refuse — with the defended law and a
taught repair attached to every refusal — and the refusals, the
type-level impossibilities, and the algebra's laws are all checked by
machine behind one gate script.

## 1. Result first — proven, stated, refused

Counts verified by the gate this session, not estimated:

- **50 theorems** rostered, every one swept for its trusted-base
  footprint (nothing beyond `propext`, `Classical.choice`,
  `Quot.sound`).
- **8 law statements** in `Kernel/Laws.lean`: seven carried by rostered
  proofs (`KSentenceEncodingInjective`, `KAdmissionRefusesUnlawful`,
  `KRefusalParity`, `KProgramPinWellFounded`, `KFillCommutative`,
  `KFillMonoidAction`, `KInterpInflationary`); one —
  `CandidateF13BoundExecutionReplay` — **stated and deliberately
  unproven**, with the gate mechanically refusing any proof or consumer
  that appears without a ruling (§8).
- **17 door controls** with committed traces: fourteen closure rows,
  each a planted unlawful program refused with its named law; two
  signature-discipline refusals (the anchored resolve, the unfilled
  hole); and the lawful twin the door must admit — the control that
  refutes a door refusing everything.
- **4 must-not-compile controls**: sort-discipline violations the
  elaborator itself refuses, each with a pinned diagnosis and a
  compiling witness twin.

The estate-of-safety candidate stays a candidate. What is proven is its
admission half, and that theorem is the one this lane most wants
adversarially reviewed (§10).

## 2. The two-layer decision, argued

The record's grammar ruling fixes the shape: unrepresentability where
the type system can carry it, admission refusal where it cannot. The
model realizes both layers and the seam between them.

**The intrinsic layer** (`Act`) is a typed inductive of kernel
sentences over the eight generators where the unlawful acts have no
constructor. Three disciplines ride the constructor signatures rather
than any check: `resolve` has no anchor slot (a digest names one value
forever — the signature is the law showing); `decide` demands a
`Token register` whose *type* is indexed by the register digest, so an
unfenced or cross-register commit has no derivation; `fold` demands an
`AnchorFact declared partition` indexed by its fold and partition, so
an anchor replays nowhere but at its own coordinates. The trigger slot
takes the closed five-production predicate grammar, so absence,
negation, and deadline have no carrier — the proven trigger-closure
pattern reused at kernel sorts.

**The candidate layer** (`CandidateAct`) can spell everything the
closure list names: anchored resolves, trusted reads, tokenless and
cross-register commits, last-writer-wins strategies, unanchored latest
reads, in-place mutations, and payload atoms for clocks, seeds,
secrets, minted identifiers, function values, and unadmitted
references. One admission function (`admit`) maps each candidate to an
intrinsic sentence or a structural refusal; every refusal is a row of a
total taught table carrying the defended law and the legal next move,
which makes refusal parity a construction fact rather than a
documentation promise (`refusal_parity`).

Alternatives priced. A single intrinsic layer with no candidate grammar
would leave nothing refusable — a grammar that cannot refuse proves
nothing, and the parity law would be unstatable. A single raw grammar
with runtime checks would surrender unrepresentability — checks can be
skipped; missing constructors cannot. The two-layer split costs one
translation function and buys both halves.

## 3. Sort depth — one step past the record's table

The record brands digests by declaration kind and space-indexes tokens
and positions. The model takes one further step the record's table does
not spell: **anchors are type-indexed by their fold digest and
partition**. This fell out of the same argument (an anchor is
meaningful only at its own coordinates) but it is a modeling extension,
so it is flagged here rather than silently absorbed — KM-2 prices it.

The must-not-compile class has a shape worth keeping: each control file
is one forbidden comparison, and beside it sits a **witness twin** that
differs only in the one repaired coordinate and must still compile. The
twin is what makes the refusal attributable — without it, a control
could "pass" because the file rotted (a renamed constructor, a moved
import), not because the sort discipline held. The gate also pins a
diagnosis substring per control (`Type mismatch` naming both branded
types; `Function expected` for the anchored resolve), so the failure
mode is the ruled one, not an accident.

## 4. Where the fourteen rows landed

Each closure row is carried by the intrinsic layer's shape, the door,
or both. Rows that are signature-level are double-carried: the
intrinsic constructor cannot spell them *and* the door refuses the
candidate spelling. Rows that are payload- or reference-level are
door-carried only, because a payload atom is data the type system
should not inspect.

| Row | Mechanism | Control |
| --- | --- | --- |
| clock reads | no time sort in any signature + payload sweep | `closure-clock-read` |
| absence/negation/deadline | no predicate constructor + candidate productions refused | `closure-absence-trigger` |
| unfenced decisions | token demanded by type + tokenless candidate refused | `closure-unfenced-decide` |
| last-writer-wins | no strategy slot in intrinsic join + LWW strategy refused | `closure-last-writer-wins` |
| unverified reads | door refusal (trusting read) | `closure-unverified-read` |
| cross-sort identifiers | type indices + must-not-compile class + cross-register claim refused | `closure-cross-sort-token` + 3 elaborator controls |
| minted identifiers | payload sweep | `closure-minted-identifier` |
| ambient query inputs | seed sweep + unanchored reads refused | `closure-ambient-query` |
| cycles / recursion | references must be already admitted; a self-reference is the first admission's forward reference | `closure-forward-reference` |
| secret carriers | payload sweep | `closure-secret-carrier` |
| absence claims from replicas | candidate production refused | `closure-absence-claim` |
| mutation of the past | no update constructor + candidate refused | `closure-past-mutation` |
| off-writ referents | pinned-universe check after the sweep | `closure-off-writ-referent` |
| closure introspection | function-value atom refused | `closure-function-value` |

The general law over all of it is `admission_refuses_unlawful`: the
`Unlawful` predicate closes the spellable shapes — eighteen
constructors covering the fourteen rows (a row with several spellable
forms gets one constructor per form: the ambient row splits into seed,
latest-read, and anchorless-fold; the cross-sort row into token and
anchor; one production constructor carries both trigger rows) plus the
anchored resolve and the unfilled hole — and the theorem says no
candidate satisfying it has an admitted translation, whatever else the
candidate looks like and at any door. The planted programs are then
single-fault instances, one per row.

## 5. Program DAGs — the admission-rank embedding, reused

Program declarations are node lists (name, generator tag, raw
arguments, uses) admitted newest-first: every use names an
already-admitted node, every name admits at most once. Well-foundedness
of the consumption relation (`program_pin_well_founded`) is the
catalog admission proof transliterated to node scale — pins descend
strictly in admission rank (`node_pin_rank_lt`), and the numeral
order pulls back along the rank embedding. Nothing new was invented;
that is the point. The freshness half remains the in-model reading of
content addressing, and the hash-preimage half stays in the trusted
base, as it does at the catalog.

What is *not* composed yet: node admission checks the DAG discipline
but does not run the single-act door per node. The certifier the
record designs runs the whole grammar at program admission; the model
currently has the two doors side by side. KM-4 prices the composition.

## 6. Filling — the typed-hole algebra, lifted, and slightly stronger

Valuations are functions from hole names to optional values; filling
is simultaneous substitution across every node's arguments. Two laws
land:

- **The action law, premise-free.** `fillProgram right ∘ fillProgram
  left = fillProgram (left ∪ right)` under left-biased union, with the
  empty valuation as unit (`fill_monoid_action`). The template
  investigation states its version under disjoint domains; the
  left-biased formulation holds without the premise, which is the
  stronger and more honest form — fewer premises where premises add
  nothing.
- **Disjoint commutation** (`fill_commutative`): with no hole in
  common, fill order is free — only the fill set matters, the
  sloppy-safe shape in miniature.

Program *composition* needed no graft operation: a child program is
referenced by digest like any declaration, so composition is
referencing, and the only substitution in the system is hole filling.
If a future slice wants textual splicing, that is a new decision, not
a latent one here.

## 7. Semantics — abstract carriers, obligations named, imports refused

The interpretation maps intrinsic sentences over an abstract world:
one evidence carrier for the monotone plane under a hypothesis-
parameterized merge, the admitted catalog and landed set as
membership-ordered lists, the head as a count. The headline theorem is
`interp_inflationary`: **under an associative idempotent merge, no
kernel sentence's meaning shrinks any world component** — the kernel
has no forgetting act, the CALM split visible in the model. Only
associativity and idempotence are demanded; commutativity is not
load-bearing for inflation, and the premise list says so.

The correspondence to the estate's concrete constructs is a set of
**named instantiation obligations, not imports**: the fabric cell's
ACI package discharges the merge hypotheses at the real evidence
carrier; the register invariants own the landed-set dedup the
interpretation only shapes; the policy meet owns spawn's attenuation,
which this world deliberately does not model (writs are per-connection
facts, not world state). A ground instantiation at the numeral maximum
(`ground_interp_inflationary`) demonstrates the hypotheses are
inhabitable without leaving the package.

The alternative — a lake dependency on `verify/fabric` so the
obligations become theorems here — is priced for the grill (KM-3):
it would buy real discharge and cost the package's self-containment,
couple two toolchain pins, and put fabric's whole roster inside this
gate's trusted surface. The register precedent (a pinned-toolchain
split with citation instead of import) is the house shape this lane
followed.

## 8. Candidate F13 — stated, and the gate holds the posture

The replay obligation is stated over abstract hop relations: for an
admitted program, two execution records reached through deterministic
assembly, resumption, and landing hops agree at every node
(`CandidateF13BoundExecutionReplay`). It is deliberately unproven
here, twice over. First, the record marks it NEEDS-A-LAW with the
F-number minting at ratification. Second — the sharper reason — the
abstract skeleton *looks* provable in a few lines, and proving it
would invite exactly the claim the record forbids: that replay of
bound programs holds before the law exists at the estate's real
carriers. The composition's value is at the concrete hops (the real
assembly, the real register, the real anchors), not at this skeleton.
The gate makes the posture mechanical: any mention of `CandidateF13`
in the proof file or the control executable fails the run, so the law
cannot quietly grow a proof or a consumer without a ruling.

## 9. Honest bounds

1. **The `Unlawful` predicate's coverage of the closure list is an
   argued mapping, not a theorem.** The model proves "whatever spells
   these shapes is refused"; that the seventeen shapes exhaust the
   fourteen rows' spellable forms is §4's table plus judgment. A
   coverage gap would be a new spellable shape, and the repair is a new
   constructor plus its control — the grill should read the table
   adversarially.
2. **Two doors, not yet one.** Single-act admission and program-node
   admission are side by side (§5); the composed certifier is KM-4.
3. **Predicate leaves are unchecked references.** A lawful trigger
   production's lane or cell reference is not swept against the
   catalog; the wall here is the production closure, not leaf
   resolution. Same repair class as KM-4.
4. **The world conflates evidence and cells into one carrier.** A
   stated abstraction: one join carrier stands for the whole monotone
   plane. Splitting per-cell carriers is mechanical when a consumer
   needs it.
5. **Trigger and spawn interpret as identity.** Hint emission is a
   derived read and writs are not world state, so their world effect
   is nil in this model; both facts are documented at the
   interpretation and priced in KM-6/KM-7.
6. **The byte canonicalizer is a stand-in.** Sentence-identity
   injectivity is proven over the framing with value bytes carried as
   given identities; the byte-level canonicalizer's own injectivity
   belongs to the wall where that machinery lives and is not claimed
   here (§10's theorem statement is scoped accordingly).
7. **The door's refusal priority is a convention.** On a candidate
   spelling several unlawful shapes at once, which refusal fires is
   the fixed check order, not a ruling (KM-5). The planted programs
   are single-fault, so the controls do not see the ordering.
8. **Attribution is absent.** The record's emit is attributed and the
   fabric's observations carry holders; the kernel's emit carries a
   lane and a body only, and the world's evidence contribution is a
   bare value. Deliberate — every "who" waits on the estate's
   attribution decision — but it means no kernel statement mentions a
   holder, and the F2 correspondence is to the value half only.
9. **R10 is modeled at one act, not all ten rules.** The record makes
   the writ premise a typing condition on every generator
   application; the model carries a writ only on declare (with the
   universe check) and on spawn's two ends. Emit, join, fold, decide,
   and trigger sentences carry no writ slot, and no meet algebra
   exists in the package (KM-7's bound, widened here to the full
   premise).
10. **Hole signatures and lineage are untyped in the Lean layer.**
   The record's program declaration types each hole by a schema
   digest and carries lineage; the Lean model's holes are bare names
   and its program layer has no lineage field, so fill performs no
   conformance check (G26-at-fill is unmodeled). The TS projection
   carries both — the one place a projection is RICHER than the
   model, which inverts the projection-wall direction KM-13 assumes
   and should be reconciled when the wall lands.
11. **Reads return no value.** The record's fold signature returns
   state-and-anchor; the model's interpretation is a world
   transformer, so resolve and fold are identities and their returned
   values are unmodeled. Determinism of the returned value is the
   fabric's F11 territory, cited not restated; nothing here claims
   it.
12. **Fabric law names in the refusal table are unchecked strings.**
   Verified against the fabric roster when written; a fabric rename
   goes stale here silently. The repair belongs with the projection
   wall or VERIFICATION.md wiring at ratification.

## 10. The first theorem for adversarial review

> **`admission_refuses_unlawful`** (proving `Laws.KAdmissionRefusesUnlawful`):
> for every door and every candidate act, if the candidate spells any
> unlawful shape — a clock, seed, secret, minted identifier, function
> value, or unfilled hole in any payload position; a reference to any
> digest the door has not admitted; an admitted reference outside the
> writ's pinned universe; an anchored resolve; a trusted read; a
> last-writer-wins join; an unanchored latest read; an anchorless or
> cross-fold fold; a tokenless or cross-register decide; an absence,
> negation, deadline, or not-present-anywhere production; or an
> in-place mutation — then there is no intrinsic sentence the door
> admits it to.

The review this lane wants: attack the `Unlawful` predicate's
constructor list against §4's mapping (bound 1 above), and attack the
door's check order for a branch where a refusal could shadow an
admission wrongly.

## 11. The KM grill sheet

House style: one decision per item, recommended option first,
alternatives priced, reversal cost stated. All items PROPOSED; the
K-series stays the design record's and is not renumbered here.

- **KM-1 — adopt the two-layer realization as the model's standing
  shape.** Recommended: yes — intrinsic constructors for what types
  can refuse, one door for what they cannot, refusal parity by table
  totality (§2). Alternative: collapse to one layer (priced in §2,
  both directions lose a proven half). Reversal: dropping the
  candidate layer deletes theorems but no estate surface, cheap
  pre-consumer.
- **KM-2 — keep the anchor's type indices (fold digest, partition).**
  Recommended: yes — it is the record's own "an anchor replays nowhere
  else" sentence made structural, and it powered a must-not-compile
  control for free. Alternative: anchor as plain data with a door
  check (weaker; the cross-fold spelling then lives only at the
  door). Reversal: erasing an index is deleting a parameter — cheap;
  adding one later re-types every consumer — dear. Flagged because it
  extends the record's sort table rather than transcribing it.
- **KM-3 — abstract carriers with named instantiation obligations,
  never a fabric import.** Recommended: keep — self-containment, one
  toolchain pin, the register precedent (§7). Alternative: lake
  dependency on `verify/fabric` discharging the obligations as
  theorems (real discharge; couples pins and widens this gate's
  trusted surface). Reversal: adding the dependency later is additive;
  removing one after statements cite fabric names verbatim is surgery.
- **KM-4 — compose the two doors: program admission runs the
  single-act door per node.** Recommended: yes, next slice — the
  certifier the record designs is one door, and bound 2 is the gap.
  Alternative: keep them separate and let the runtime compose
  (drift channel between the model and the certifier it models).
  Reversal: composition is additive over the existing inductive.
- **KM-5 — rule the refusal priority, or declare it free.**
  Recommended: declare the fixed check order (signature shape, then
  reference sweep, then universe) as the door's contract and write it
  into the language declaration's refusal table when that slice
  lands. Alternative: leave it an implementation detail (two
  conforming doors could then teach different repairs for one
  multi-fault candidate — a wire-visible divergence).
- **KM-6 — should trigger acts move the world?** The model interprets
  a trigger as identity; hint emission is a derived read. Recommended:
  keep until the reaction slice models hint sets, then reuse the
  proven enabled-set machinery rather than restating it. Alternative:
  model hints now (restates a fabric surface without a consumer).
- **KM-7 — spawn's meet.** Writs are not world state, so attenuation
  is absent from the interpretation. Recommended: model the meet only
  when writs become model objects with their own carrier, citing the
  policy semilattice as the instantiation obligation. Alternative:
  fold writs into `World` (conflates per-connection authority with
  shared state — the exact confusion the record's fences exist to
  prevent).
- **KM-8 — the F13 posture.** Recommended: keep stated-only with the
  gate check (§8) until the estate rules where the composition is
  proven and against which concrete hops. Alternative: prove the
  abstract skeleton now (cheap, and priced in §8 as an overclaim
  channel).
- **KM-9 — which declaration kind names a cell.** The model brands
  cells as `resource` declarations at the join constructor.
  Recommended: confirm or correct against the affordances lane's
  carrier inventory when its amendment lands; a one-line brand swap
  either way. Flagged because the record's kind list does not name a
  cell kind explicitly.
- **KM-10 — the two extra refusal reasons.** The anchored resolve and
  the unfilled hole refuse under reasons outside the fourteen rows
  (signature discipline and render totality). Recommended: keep them
  as door-completeness reasons, distinct from the closure list, and
  say so wherever the fourteen are counted. Alternative: widen the
  closure list (renumbers a ratified inventory — not this lane's
  call).
- **KM-11 — the fold-declaration kind is named `index`, and the name
  over-suggests search.** Raised by the operator in review: the fold
  constructor demands `Digest DeclKind.index`, which reads as binding
  fold to search. It does not — search appears nowhere in the model;
  what a reduction is *for* lives entirely in its declared content and
  its query values. But the kind name carries the connotation, and the
  granularity question underneath is real. Recommended: rename the
  kind to `reduction` (one kind for every declared fold; roles are
  data or ontology annotations), on the test that two declarations
  deserve distinct kinds only when the door checks them differently —
  a view and a search index share shape, checks, and laws, so a kind
  split would fragment identity with zero law gain. Alternatives: a
  closed fold-class of kinds with a kind-generic constructor and
  subsort premise (the resolve pattern — the known upgrade path if a
  law ever distinguishes fold families at the door; speculative
  before one exists); one kind per fold family (refused by the test).
  Reversal: a rename is a one-line brand swap pre-consumer; a split
  adopted and then retired strands identities.
- **KM-12 — type the per-kind declaration content; read the kind enum
  as a language-version projection.** Raised by the operator in
  review: the kind list is the language's one genuinely chosen
  ontology (everything else is licensed by a theorem or forced by a
  closure argument), so should it be modeled more concretely? Two
  directions, one refused: making digests themselves concrete
  (hashing, widths) buys nothing — the in-model reading of content
  addressing is injectivity plus admission freshness, and the hash
  stays in the trusted base, the standing precedent. Recommended
  instead: a dependent content family `KindContent : DeclKind -> Type`
  with `declare` taking `KindContent kind` — the program kind already
  has its content type (the node/hole/lineage declaration), and the
  algebra, policy, and schema kinds have natural ones. Payoff: the
  kind list becomes self-justifying by construction — two kinds are
  distinct exactly when their content types and door checks differ —
  and the per-kind certifier checks (the gap KM-4 names) get their
  carrier. Companion reading, resolving the static-versus-data
  tension: the ratified language declaration carries the kind table
  as cataloged data, and the model's fixed inductive is that table's
  codegen projection at one language version — adding a kind is a
  language successor declaration, never an enum edit. Alternatives:
  keep all content opaque as `Value` (the current stated abstraction —
  honest but leaves per-kind admission unstatable); model the kind
  table as runtime data inside the model (loses the type-level brand
  discipline the must-not-compile class rests on). Reversal: the
  content family is additive over the existing kinds; retiring it
  reverts to the opaque abstraction without touching sentence
  identity. Worked example, from the operator's review: typing the
  ontology kind against its ratified shape (members as schema digests,
  the closed four-production relation grammar, lineage; relations
  claims-tier, no reasoner) immediately surfaces a bound prose hid —
  members are schemas only, so an ontology cannot contain another
  ontology, and the ontology-of-ontology goal is served in v0 by
  lineage alone. Whether members widen to kind-tagged refs or the
  content gains an imports field is a grillable amendment to a
  ratified shape — the record owner's call, surfaced here because the
  content typing made it mechanical to see. Typing the schema kind
  the same way yields the closed field-shape grammar over the
  canonical value grammar (sorted-key objects, escaped strings,
  arrays, booleans, non-negative safe integers; a float has no
  constructor), with conformance checking structural by
  construction.

## 11a. Ratification addendum — the projection rulings (2026-08-18)

After the projection survey landed, the operator ruled: **go with the
recommendations** — four adoptions, each realized in this lane the
same day:

1. **Machine-marked next moves.** The Rust diagnostic distinction is
   adopted for taught repairs. The model now carries `Applicability`
   (`machineApplicable` | `advisory`) and the total marking
   `RefusalReason.applicability`, under the stated criterion: a
   repair is machine-applicable exactly when the lawful rewrite is a
   function of the refused candidate alone. Four qualify (anchored
   resolve, unverified read, past mutation, last-writer-wins);
   twelve are advisory. Wiring the marking into the wire `Refusal`
   value is the runtime projection's step, deliberately not taken in
   the model's `Refusal` structure to keep committed control traces
   byte-stable.
2. **The prose projection.** Adopted. Reference sketch at
   `verify/kernel/projections/prose.md` — the eight sentences in
   speech-act form, the closure as silences, refusals-teach. The
   ratified assembly path (F7 over the cataloged language
   declaration) is owed; the sketch is what assembly must reproduce.
3. **JSON Schema at the wire.** Adopted, with the survey leans
   applied: eight flat tools, no oneOf anywhere, compound
   self-descriptive field names (`schema_digest`-convention — a field
   is named for the value it carries), digests as prefixed
   pattern-constrained strings, integers in the I-JSON safe range
   (floats have no spelling), trigger productions flattened to an
   enum plus per-production slots. Reference sketch at
   `verify/kernel/projections/tools.schema.json`, refusal result
   shape included with the applicability marking. The Q1 field-name
   eval remains worth running; the convention is adopted as the
   working spelling it would confirm or amend.
4. **The TypeScript projection.** Adopted with the operator's four
   requirements: complete, simple, fully self-contained, 100%
   fidelity, language examples showable in plain TypeScript.
   Reference sketch at `verify/kernel/projections/kernel.ts`: zero
   imports, every closed inventory mirrored at full cardinality
   (8 generators, 12 kinds, 5 productions, 5 stages, 16 refusal rows
   with law/repair/applicability), branded digests with
   literal-carrying inference, dependent ties (token-at-register,
   anchor-at-reduction-and-partition) enforced at constructors with
   `NoInfer`, and the four must-not-compile controls carried natively
   as `@ts-expect-error` lines — the file type-checks only if they
   fail to. Verified under the pinned tsgo with tsc as referee, both
   green. The unlawful candidate spellings are deliberately
   unprojected: an SDK that cannot spell the crime is the dual
   construction's point.

- **KM-13 — the projection wall.** The three projection files are
  hand-derived from the model, which is exactly the drift class the
  estate refuses everywhere else; they are labeled as the reference
  sketches generation owes. The obligation: a projections emitter in
  the model package (the fabric emitter precedent) whose output is
  byte-compared against committed projections in the gate — at
  minimum, inventory-cardinality and wire-name checks tying
  `kernel.ts`, `tools.schema.json`, and `prose.md` to the Lean
  inventories. Until that wall exists, the gate does not see the
  projections, and a model change can silently strand them.
  Recommended: build the emitter with the language-declaration slice
  (K-5), where the grammar becomes data anyway. Alternative: gate-side
  grep counts now (cheap, shallow — catches cardinality drift, not
  wording). Reversal: none needed — the wall is additive.

## 11b. The Effect dependency correspondence (2026-08-18, operator-commissioned)

The operator asked what in the language most naturally translates to
Effect's model of dependencies, whether there is a clean modeling
approach, and whether "dependencies as maps bound to nodes that
merge" are "some prior fold before the DAG." The vendored pin was
re-read at `effect@4.0.0-rc.108` before modeling; four source facts
decide the shape:

1. **A service key is a string** — `Key.key : string`
   (`Context.ts:64-68`), with the collision semantics documented in
   place: reusing a key string makes unrelated services occupy one
   slot (`Context.ts:166-169`).
2. **The environment is a base map plus an ordered overlay chain.**
   `Overlay { key, value, parent }` (`Context.ts:483-487`);
   `add` pushes newest-first (`Context.ts:790-795`); lookup walks the
   chain newest-first (`Context.ts:531-535`); `flatten` folds
   oldest-to-newest with overwrite (`Context.ts:508-519`), triggered
   at depth 8 or 8 base hits. The environment IS a fold of provision
   events — the operator's "prior fold" is Effect's own
   implementation.
3. **Merge keeps the later side's binding** (`Context.ts:1126-1130`;
   mergeAll doc: "the service from the last context with that key is
   kept"). Associative and idempotent, deliberately not commutative —
   provision is class (b), not class (a): an ordered reduction, never
   a lattice join.
4. **Layer memoization is keyed by object reference** —
   `MemoMapImpl.map : Map<Layer, MemoMapEntry>` (`Layer.ts:432`),
   refcounted finalizers (`Layer.ts:396-419`); and `provide`'s type
   states the requirements algebra outright:
   `RIn | Exclude<RIn2, ROut>` — union of the dependency's needs with
   the consumer's needs minus what the dependency provides.

The correspondence, modeled (roster additions in parentheses):

| Effect construct | Kernel construct | Status |
| --- | --- | --- |
| service key (string) | `Digest .capability` — content-addressed; a collision needs a hash preimage. The string key is a minted identifier in kernel terms; the digest key is the G33 upgrade | mapping, stated |
| R channel (type-level requirement set) | `requiresOf` — a program's unfilled holes; requirements union across composition | modeled |
| environment / Context | a `Valuation` built by `provisionFold` over a newest-first event chain | modeled (`provision_newest_wins` — the overlay lookup law) |
| Context.merge (later wins) | `Valuation.union` with the newer chain on the left: `provisionFold (l ++ r) = union (pF l) (pF r)` | proven (`provision_append_union`) |
| provideService | `fill` at a hole; one provision event | already modeled (fill laws) |
| provide's Exclude | `requiresOf (fillProgram v p) = requiresOf p \ dom v` | proven (`requires_of_fill`, via `requires_arg_fill`, `requires_list_fill`) |
| R = never | closed program: `requiresOf = []` | definitional corollary |
| disjoint provision order-freedom | `provision_disjoint_comm`; the committed `drop-provision-disjointness` drift control shows the premise load-bearing (overlapping orders visibly disagree) | proven + walled |
| memoization (reference-keyed) | content-keyed: same digest, same build; re-provision of the same binding is inert | `provision_override_idem` carries the semantic half; the full memo claim is F13-adjacent, stated only |
| Scope / finalizers / observers | outside meaning — the lease boundary | refused into the runtime |

Three law statements joined the sheet (`KProvisionNewestWins`,
`KProvisionAppendUnion`, `KRequiresExclude`), seven theorems the
roster (57 total), one drift control the battery (18 door controls).

**The CALM decomposition of provision (operator follow-up, proven).**
The operator asked whether `provision_override_idem` can be modeled
cleanly in the CALM approach. It can, by the estate's standing move:
make the implicit order explicit data. Tag each provision event with
a position (`positionedOf` — the overlay chain's depth, surfaced);
then the fact set is class (a) — union, ACI, arrival-order-free, and
override-idempotence becomes an instance of set idempotence — while
the environment is a derived read in the directory's greatest-token
shape (`greatestAt`: replacement only on strictly greater position,
no tie decided in the function). The collapse theorem is proven:
`provision_positioned_correspondence` — the order-carrying fold IS
the positioned derived read (`provisionFold events hole =
(greatestAt (positionedOf events) hole).map (·.2)`), so nothing was
lost in either direction. The CALM ledger closes honestly:
accumulation is monotone and free; the greatest-position read is a
function of support with the order inside the data; the one priced
residue is authoritative rebinding across writers — which is the
directory's fenced rebind, a `decide`, exactly where the estate
already put it. Effect never meets the fence because its provisions
ride one call stack (a single-writer journal); shared environments
would meet it immediately. Dynamic scoping needs no deletion in this
reading: nothing pops — a node's environment is the greatest-position
read over provisions pinned at or above it in the DAG, the stack made
structure. The support-invariance half (permutation/duplication of
the positioned fact set cannot move the read, under a
positions-unique premise) is deliberately not re-proven here: it is
the fabric's `f12_greatest_seal_wins` / `greatest_seal_of_support`
shape verbatim, cited as the instantiation obligation in the KM-3
posture.

- **KM-15 — adopt the positioned reading as the environments story.**
  Recommended: yes — environments are directory-shaped: positioned
  provision facts accumulating as a join, the valuation a
  greatest-position derived read, the fold form retained as the
  proven collapse at implicit stack positions (the correspondence
  theorem). Multi-writer authoritative binding routes to the fenced
  rebind. Alternatives: keep only the fold form (honest but leaves
  the idempotence fact class-(b)-local and the multi-writer story
  untold); an LWW-register CRDT per hole (the classical treatment —
  isomorphic to the positioned reading but smuggles "timestamp"
  vocabulary where the estate has positions and tokens). Reversal:
  additive; the fold form and its laws stand unchanged either way.
  Disposition sharpened in operator review — the surface, if adopted,
  is exactly three things and nothing more: a ruling in the C10 shape
  ("environments are directories" — one sentence, zero new
  machinery); one well-known declared reduction (the greatest-position
  algebra as a cataloged algebra declaration, outside the language
  declaration — the no-standard-library fence holds); and builder
  sugar in the TS projection compiling to the composition,
  dual-constructed, inheriting the correspondence theorem. No new
  generator, no new kind, no new carrier; lands WITH the K-4 builder
  slice, whose executing nodes are its first consumer.
- **KM-16 — path handling: iterated resolution from explicit roots,
  and the no-ambient-root fence.** Raised by the operator: the
  positioned reading suggests natural path handling. It does — a
  hierarchical path is iterated directory resolution (each hop a
  head-relative read; nesting is DAG-free by admission), and lexical
  scoping, provision shadowing, and path shadowing are one algebra:
  nearest-wins along an ordered chain, the correspondence theorem's
  shape. The fence that keeps it lawful: paths are data (a petname
  list) resolved from an explicitly named root digest at an anchor —
  a current-directory is an ambient input, and relative escapes are
  the implicit context stack the template record refused as
  unrepresentable. A rootless path belongs on the closure list beside
  the clock. Alternatives: a path sort in the grammar (premature — no
  law distinguishes a path from a petname list plus a root); ambient
  roots for ergonomics (refused on the closure discipline).
  Reversal: additive; nothing ships until a consumer names it.
- **KM-14 — adopt holes-as-requirements and provision-as-fold as the
  Effect binding's dependency story.** Recommended: yes — the
  correspondence above, with the two upgrade claims stated on the
  outward surface when the binding ships: service identity by digest
  rather than string (collision becomes a preimage, and the
  identifier-universe door check covers referents), and memoization
  by content rather than reference (structurally equal layers share a
  build for free). Left open, deliberately: modeling a Layer itself
  as a constructor program (a declared program whose output is a
  provision) — that is the K-4 builder's territory and should land
  with the dual-construction slice, not ahead of it. Alternatives:
  model the environment as a lattice join (refused — merge is not
  commutative, and pretending it is would hide the shadowing
  semantics the overlay chain actually has); model requirements at
  the type level only (loses the data-level requirement set the wire
  and the door need). Reversal: the provision section is additive;
  retiring it strands no sentence identity.

## 12. Sources

Estate records, read in place this session:
`docs/design/2026-08-18-plait-kernel-algebra.md` (whole — the
authority; §4 alphabet, §5 grammar and closure list, §6 Effect binding
and candidate F13, §7 bootstrap, §11 K-1..K-10);
`docs/design/2026-08-18-plait-agent-plane.md` §15 (the free-construct
inventory and taxonomy);
`docs/research/2026-08-18-template-algebra-investigation.md` (§3 the
typed-hole algebra this lane's fill laws lift — the template LANE was
refused by operator ruling while this lane was in flight, and the
refusal's own disposition keeps exactly this inheritance: the fill
algebra was absorbed into the ratified kernel record as
program-composition laws before the lane closed, which is the form —
program-declaration filling, no template language — modeled here);
`docs/research/2026-08-18-agentic-lean-lit-notes.md` (the pressure
items: refusal parity, referent pinning, unit spaces — each answered
by construction above);
`docs/research/2026-08-18-plait-design-grill-review.md` (posture);
`docs/design/2026-08-17-plait-effect-affordances.md` (carrier
grounding; read, not edited — its amendment rides a parallel lane).

Proof surfaces, read in place: `verify/fabric/Fabric/*.lean`,
`verify/fabric/run.sh`, `verify/fabric/DECISIONS.md` (the partition,
gate, control, and admission-rank precedents this package
transliterates); `verify/AGENTS.md`, `verify/CONTEXT.md` (gate law).

Built and measured this session: `verify/kernel/` at `f74c2ca6e` —
`./run.sh` green; 50 rostered theorems, footprint confined to
`propext`/`Classical.choice`/`Quot.sound`; 17 committed control
traces; 4 must-not-compile refusals with pinned diagnoses. Toolchain
textures taken as given from the estate's measurement wave (reserved
words, kernel-opaque core sort, the named-function congruence
discipline) and respected throughout.
