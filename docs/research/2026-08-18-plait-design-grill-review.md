# Plait design grill review — referee verdicts on G-1..G-7 and G25–G36

Status: **REVIEW COMPLETE 2026-08-18** — the dispatch-35 mandate, executed
by the coordinator with four Opus coverage agents (code-seam map, PR #81
state audit, transcript/ruling sweep, multica CLI prior-art survey)
after the operator's charge: "Review the estate and plait code as well
as the effect design document and the agent plane document … then
provide your recommendations." Verdicts referee the two records'
recommendations before the operator rules; nothing here is a ruling.
Amendment wording is supplied verbatim where a verdict is
ADOPT-AMENDED; edits to either record land only after the operator
rules. Sources: both records whole; dispatch 31/32 in place; the
next-phase plan §A/§B/§E; `verify/fabric/run.sh` and both DECISIONS
files; PR #81 @a50bf5876 and PR #83 @b193c5c78 read at head;
multica 0.4.20 surface; session transcripts 785426dc/3c6800bd.

## The state correction everything below prices against

Both implementation branches are **delivered, unmerged, and
un-reviewed-to-verdict**: PR #81 (E6 runtime, MERGEABLE, CI green,
round-2 repairs landed twice over — F-2 walled by two executed rows,
F-3/F-6 present) and PR #83 (durable fold, +4,481/49 files, complete
build honoring the POS-1 per-partition-stream ruling, no adversarial
review yet). The affordances record's injection route ("the seat is
live with nothing pushed") closed on both lanes before the record
landed. **Every affordance is therefore a post-merge extraction from
two divergent live implementations, not a birth-time design** — and
the two branches jointly grow the refusal-kind union 15 → 34, touch
the same five seam files, and carry colliding DECISIONS T-numbers.
That is the terrain the verdicts stand on.

## Summary table

| Item | Verdict | One line |
| --- | --- | --- |
| G-1 matcher sets public | **ADOPT-AMENDED** | admit; time behind both merges; closure suites derive from the union artifact |
| G-2 `casJoinLoop` internal-first | **ADOPT-AMENDED** | route (a) is dead; charter a post-merge extraction that keeps the shipped bound, seam, and walls |
| G-3 `Catalog.cached` wrapper | **ADOPT-AMENDED** | cache wraps the verified `resolve` only; digests only; store-layer durability is a separate act (R-4) |
| G-4 register loop never unified | **ADOPT-AMENDED** | the refusal now names **three** loops — the fold's anchor CAS is a third discipline |
| G-5 `Blob.ts` + FS backend | **ADOPT-AMENDED** | two services share one name; split them; absence-as-refusal; probe gate binds the OBJ backend only |
| G-6 no ranged reads | **ADOPT** | verify-on-read holds; nothing needs ranges; the law's evidence base is the ratified probe |
| G-7 audit/`Replay` shapes | **ADOPT-AMENDED** | disambiguate KV history depth from the G21 horizon; T-J scope is now three buckets; lane arm rides `replaySuccessors` |
| G25 adopt part 4 | **ADOPT** | as the umbrella, carrying the item amendments below |
| G26 cataloged output + commit door | **ADOPT-AMENDED** | adopt, with G23's sentence riding the door — the wall refuses the landing, never the side effect |
| G27 ontology reading B | **ADOPT-AMENDED** | one sentence makes nesting explicit — the operator's actual question |
| G28 concierge as ceremony | **ADOPT** | no new authority construct; H-5 disposition lands with the ruling |
| G29 task as derived view | **ADOPT-AMENDED** | adopt, phased: the walk at merge, the history half when T-J ships |
| G30 Layer/Config split | **ADOPT** | the fence is ratified law surfacing in types; multica's copy-fence is field evidence |
| G31 shuttle epic | **ADOPT-AMENDED** | charter now, dispatch after the merge queue clears; the translate-only fence gets a planted control |
| G32 tick pattern | **ADOPT-AMENDED** | adopt via a **new** API-log entry beside 0017, never a silent re-read |
| G33 no minted id namespaces | **ADOPT** | every asked-for id is met by derivation; attribution stays the one licensed exception |
| G34 workflow-engine refusal | **ADOPT** | re-verified at source; reopen triggers named; disclosure precondition restated |
| G35 lattice, never topology | **ADOPT** | F9's carrier needs no eleventh component; multica's squads are the cautionary field data |
| G36 taxonomy as design law | **ADOPT-AMENDED** | adopt; the DECISIONS structural fix becomes a blocking precondition, not a someday |

New items: **R-1..R-6** below (one urgent — it gates the M2 merge).
Estate-of-safety candidate: **G26's**, endorsed — *a landed outcome
always decodes against the schema its certificate names.*

---

## Part 1 — the affordances sheet (G-1..G-7)

### G-1 — matcher sets as public surface. ADOPT-AMENDED

**Attacked with:** operator-ratifies-concepts (no public surface
without a real consumer) and the union-arity risk. The first attack
fails on the record as it now stands: the consumers are no longer
hypothetical — `Admission.ts` §5.5 names `Refusal.match` as its
refusal handling, the task view renders through
`Register.matchState`, and PR #81's own tooling hand-switches on
sorts today. The second attack **lands**: both branches extend the
closed `StructuralRefusalKind` union (main 15, +15 fold, +4 cells =
**34**), so `Refusal.matchKind` becomes a 34-arm compile-time
dependency of every consumer, and shipping it before the union
settles would add a third collision surface to an already-guaranteed
two-branch conflict on `Refusal.ts`.

**Amendments:** (1) T-A's matcher half is timed **after both PR #81
and PR #83 merge** — the union settles first. (2) The closure suites
are **derived from the union artifact** (the schema literals array),
never hand-enumerated — the gate-cheating law applied at birth:
enumerations that are listed, drift. (3) `FabricClient.matchPublished`
keeps its two-arm shape; the fold's `Lane.EmittedEvent` (same
`duplicate` bit, different carrier) gets its own matcher in `Lane.ts`
when E4 merges — same pattern, deliberately not shared, because the
two acknowledgement types answer different subscriptions. (4)
`matchPublished`'s JSDoc bound is rewritten at the union merge: under
POS-1 the dedup window is **per partition stream**, no longer
stream-wide (DECISIONS T5's scope sentence moves in lockstep).

### G-2 — `casJoinLoop` internal-first. ADOPT-AMENDED

Route (a) — "injected into DEV-724 now so the loop is written once
from birth" — is **dead on the record's own landing note**: PR #81
wrote the loop inline thirteen minutes before the record landed, and
wrote it differently in five reasoned ways: a **bounded** attempt
loop (`CELL_MERGE_ATTEMPTS = 8`) refusing
`cell-update-contended` on exhaustion, with its DECISIONS explicitly
rejecting the unbounded option; a `MergeDiscipline` seam whose
purpose is negative-control derivation (both committed cell mutants
swap the discipline and share everything else); reconcile-by-read-back
**before** classification; a `subsumes` pre-CAS short-circuit; and
`CellState` (no revision surfaced) rather than `Versioned`.

**The referee's read of the divergences:** the bound is *right* and
the design's unbounded sketch should yield. Neither shape claims
liveness; the difference is that exhaustion-as-absence-refusal is
typed backpressure a caller composes with `retryAbsence` policy,
while the unbounded loop hides contention inside an invisible hang.
State it in dispatch 31's own vocabulary: **the attempt bound is flow
control with no correctness stake** — convergence-on-success is F1's
regardless; what is not claimed shifts from "termination" to
"completion." The `MergeDiscipline` seam must survive extraction or
the two committed mutants lose their shares-everything-else property.
And the design's own type-fence — "the type that keeps them apart is
the `Reducer` parameter with its earned ACI brand" — can only be
honored after PR #83 merges, because the earned brand lives in its
`Algebra.ts` and nowhere else.

**Amendments:** (1) G-2's route becomes: **post-merge,
behavior-preserving extraction from `internal/cells.ts` into
`internal/cas.ts`**, parameterised on the earned-brand
`Reducer` (from `Algebra.ts`), preserving the `MergeDiscipline`
control seam, the bounded-attempts contract (bound a parameter,
default 8, exhaustion an absence refusal), and
reconcile-before-classify. (2) The regression wall is named: the
588-line `CellWall.test.ts` plus the three committed byte-compared
traces run unchanged; **T16's two rows survive verbatim** — an
extraction that deletes either row is refused. (3) Timing: after
both merges, inside the adoption wave (Part 3).

### G-3 — the resolve cache as a wrapping layer. ADOPT-AMENDED

The decorator shape survives attack; two fences were missing. First:
PR #81's `Catalog.get` is **deliberately unverified** (its T18:
verify-on-read lives at `Resolved.resolve` so the tampered-store
control can exist), so a cache on `get` would cache unverified bytes —
the wrapper must sit on the **verified resolve path only**. Second:
0014/G20's refused "ambient latest" — nothing in G-3 as written says
the cache never spans an anchored resolve. And one honest note: the
in-memory `Catalog.layer` is itself an unbounded, never-evicting
`Map` — that is the *store*, not a cache, and its durability story is
R-4's, a separate act this grill does not decide.

**Amendments:** (1) "`Catalog.cached` wraps the verified resolve
path; nothing cacheable takes an anchor — **keys are digests only**,
and a surface keyed by `(directory, petname, anchor)` never enters
this cache." (2) "The in-memory catalog layer's boundlessness is the
store's question, not the cache's; the durable-layer act (R-4) owns
it."

### G-4 — the register loop is never unified. ADOPT-AMENDED

The refusal is right and now **too narrow**. PR #83 ships a third CAS
discipline the record does not name: the anchor commit
(`internal/anchors.ts`) is a **single-shot** revision-CAS whose lost
race is a *fatal detach* (`lost-anchor-cas` — "one live pump owns
each fold partition"), licensed by dispatch 31 decision 6's
single-live-pump assumption. It is neither an idempotent join (F1)
nor a once-only fenced outcome (I2); folding it into either loop
would smuggle its exclusivity assumption into a combinator licensed
by a different law. The DEV-712 advance notice ("your
anchor/checkpoint writes … will route through it") over-promised and
is corrected by this item.

**Amendment — the sentence becomes three-way:** "Three CAS
disciplines, three laws, never unified: **joins** retry through
`casJoinLoop` because idempotence discharges ambiguity (F1);
**registers** reconcile by read-back comparison because outcomes land
at most once (I2, seam rules 1–2); **anchors** never retry — a lost
anchor CAS is a fatal detach under the single-live-pump discipline
(dispatch 31 decision 6), and routing it through either loop is
refused." DEV-712's round-2 charge carries the correction explicitly.

### G-5 — `Blob.ts`, the service family, the FS backend. ADOPT-AMENDED

The design survives; the collision does not resolve itself. PR #81
ships `BlobService` (singular) **inside `Catalog.ts`** — get-only,
returning `Option`, deliberately unverified, always-absent in the
live layer — while A-9 designs `BlobsService` in `Blob.ts` with
put/verified-get/has and "there is no unverified read path." These
are **two different objects sharing one name**: a catalog-internal
fetch seam (whose one verify door is `Resolved.resolve` — T18's
argument holds *there*) and a public application blob store (where
T18's self-policing argument dissolves: the tamper control flips
bytes on disk beneath the API, so verified-get is testable without
any unverified service). Left unsplit, this is the exact
one-concept-one-module violation G-3 invokes elsewhere. Two further
repairs: the public service's absence must be an `AbsenceRefusal`
(`Option.none` is invisible to `retryAbsence` and carries no
head-relative vocabulary), and the branch's committed sentence "grill
item 9/10 requires a probe before any object-store surface ships"
must be reconciled with the record's "the day-0 story needs no
substrate probe" — both are true, of different backends.

**Amendments:** (1) "PR #81's catalog-internal store seam is renamed
at adoption (internal, catalog-owned, unverified by design with
`Resolved.resolve` as its one verify door); A-9's public
`BlobsService` lands in `Blob.ts` with verification inside the
service." (2) "Public `get` absence is `AbsenceRefusal` kind
`blob-absent`, never `Option`." (3) "The probe gate (plan item 10)
binds the **NATS object-store backend only**; the filesystem backend's
substrate is the OS filesystem and its wall is the backend-agnostic
conformance suite — the two sentences appear together wherever either
appears."

### G-6 — no ranged reads before the chunk-manifest law. ADOPT

Attacked as possibly over-cautious; the attack fails everywhere it
lands. No consumer needs ranges today (fold state past 256 KiB is
refused at the wire; A-9's put/get is whole-value; the `{blob:
Digest}` reference form has no reader anywhere yet). A byte range
cannot re-derive a whole-value digest, so serving one is an
unverified read — the exact hole the architecture's "no decode path
trusts an asserted digest" exists to close. The candidate law is
named, its evidence base (the ratified OBJ probe) is already
scheduled, and the refusal costs nothing now. Held.

### G-7 — the audit row and `Replay` builder shapes. ADOPT-AMENDED

The shapes stand (bucket-global revisions as-is, token column per T0,
ascending order licensed by I1, incarnation stamp mandatory). Three
amendments from the evidence. First, a wording hazard: "depth bounded
by declared retention" invites conflation with G21's **derived**
compaction horizon — different numbers, different laws. Second, PR
#83 doubles the incarnation debt: `flb-fab-anchor` now declares its
own 64-deep history ("for anchor auditing") with no incarnation
stamp, and `flb-fab-cell` makes three buckets under T6's deferral.
Third, the lane arm's implementation already exists —
`replaySuccessors` shipped with the fold — so the builder's lane arm
is a facade over it, not a second walk.

**Amendments:** (1) "`retainedDepth` is the **declared KV history
depth** (64, a substrate declaration); it is not the G21 compaction
horizon, which is derived, never chosen — one sentence noting the
distinction rides the `RegisterAudit` JSDoc." (2) "T-J's incarnation
conversion covers **all three buckets** (`flb-fab-reg`,
`flb-fab-anchor`, `flb-fab-cell`); the anchor bucket's audit surface
inherits the same stamp." (3) "`Replay.lane(...)` is chartered as a
facade over the shipped `replaySuccessors`; E4's module owns it."

---

## Part 2 — the agent-plane sheet (G25–G36)

### G25 — adopt part 4 as the agent plane. ADOPT

As the umbrella, carrying every amendment below. The alternative
(wave-one only) was attacked and dismissed: deferring the taxonomy
(G36) forfeits exactly the mechanical review question — "which law
licenses this structure's concurrency story?" — that the two live
branches' three-way CAS split (G-4) just demonstrated the need for.

### G26 — cataloged output types + the commit door. ADOPT-AMENDED

The strongest-evidenced item on either sheet: the estate has already
measured what schema-less structured I/O costs — two quarantined
agent loops, 153 tool calls, $11.67, **zero protocols created**,
because five meaning-carrying tools advertised untyped schemas. The
inline-schema alternative is what that experiment already refuted.
The commit-door check is the certifier discipline at the one seam
where an outcome becomes *the* outcome, and its wall (a planted
non-conforming commit shown refused) is cheap. One bound must ride
the door or the wall reads wider than it is: a structural refusal at
commit happens **after** any vendor call already fired — G23 is not
narrowed by G26.

**Amendment:** the commit-door prose and the E9 wall's row both carry:
"The door refuses the **landing**, never the side effect — G23's
sentence (at-most-one landed outcome is not at-most-one external side
effect) rides this surface verbatim, with the work digest offered as
the vendor idempotency key where one exists."

### G27 — the ontology as a cataloged declaration kind. ADOPT-AMENDED

Reading B survives its attacks (single pinnable identity, certificate
citability, somewhere for relations to live; reasoner scope-creep
fenced as claims-tier relations with rights-follow-proofs upgrades).
But the record answers a narrower question than the operator asked —
the transcript frame was "**ontology of ontology** to literal value
handling at the leafs," and reading B supports nesting by
construction without ever saying so.

**Amendment, one sentence in §4.5:** "An ontology's own digest is a
cataloged value like any member's, so an ontology may appear in
another ontology's `types` or `relations` — nesting is composition
through the same one door, and no meta-ontology kind exists or is
needed."

### G28 — the concierge as a ceremony. ADOPT

Four acts, all existing machinery; the product is monotone evidence,
connection-attributed with the G4 fence stated where it bites; "not
an auth server / not a gatekeeper for meaning / not a liveness
authority" are the right three refusals. Field contrast sharpens it:
multica's admission is credential-by-daemon-token with **no
attestation construct at all** — attest-defines-nodehood is the
differentiator and stays. The H-5 naming disposition lands with this
ruling (coordinator's call, made here): "concierge" goes to the
admission surface in prose, the shipped type-authoring surface
becomes "the authoring concierge," the API carries `Admission.*`
either way, CONTEXT.md notes the split when the surface lands.

### G29 — the task as a derived view. ADOPT-AMENDED

The derived view is right, the first-class Task alternative rightly
refused (a second work identity beside C7's is new physics), and the
E9 constraint — the round-granularity ruling may reshape declaration
authoring but never the view — is the correct fence. Independent
field validation: multica has no task noun either (tasks are reached
through issues/agents) and independently schema-separates
`retry_of_task_id` from `rerun_of_task_id` — the rounds distinction
arrived at from operational pain. One honesty amendment: the view's
history half consumes `Registers.audit`/`Replay` (G-7), which is
post-M3 by ratified timing.

**Amendment:** "`Actions.task` ships phased: the declaration walk,
round chain, and acceptance state at its adopting slice; the
per-round register-history half activates when T-J lands — the view's
shape is fixed now precisely so the phasing is invisible to
consumers."

### G30 — provisioning is Layers; configuration is the environmental band. ADOPT

The fence is ratified law (G12) surfacing in the type system — a
context program in an env var has nowhere to go, and that
unrepresentability is the whole answer. The pin facts were re-verified
twice (no `Supervisor` at rc.108; `Config.schema`/`redacted`/
`nested`/provider layering all real). Field evidence lands on the
recommended side: multica's `agent copy` refuses to carry
`custom_env`/`mcp_config`/`runtime_config` across a fork while
carrying instructions and permissions — the semantic/environmental
split discovered empirically, without the law.

### G31 — the shuttle epic. ADOPT-AMENDED

The merit case holds: translate-only, the mapping table as the whole
contract, attest passage, `go/register`/`go/canonical` reuse, G23 and
the self-report bound stated loudly. Two amendments, both from
evidence. **Sequencing:** the epic charters 5–8 seat sessions of new
Go work at the moment two large TS branches are unmerged and
directive 6 exists *because of* seat instability — charter now,
dispatch S1 only after the merge queue clears (both PRs + the
adoption wave's first two acts). **The fence needs teeth:** the
multica daemon is the direct precedent for this exact design, and its
translate-only intent did not hold — cancellation-watching, GC, retry
classification, session retirement, and lease handling all accreted
into Go. Intent is not a mechanism.

**Amendments:** (1) "S1 dispatches after PR #81 and PR #83 merge and
the transport-extraction act lands." (2) "The epic charter names the
multica daemon as the measured failure mode of its own fence, and the
translation wall gains a **no-orchestration control**: a planted
adapter frame carrying a scheduling decision (a retry policy, a
next-step choice) must be refused at review as a translator
overreach — the fence is enforced by a plant, not by intent."

### G32 — the tick pattern. ADOPT-AMENDED

The design holds against its hardest attack: no clock enters the
fold — `Cron.next` executes only in the scheduler seat; the tick fact
is monotone evidence whose `(schedule digest, firing)` identity makes
racing schedulers emit byte-identical duplicates (F2 absorbs);
replay determinism is real and is the point. The `DurableClock`
contrast is exactly right. What does **not** hold is the paper trail:
ratified API-log 0017 (ruled G13) says "scheduling mints no module
and no construct … the *firing* is the deadline seat's act" and
refused "a scheduler service (an orchestrator by another name)." G32
adds a second firing door (the tick emitter) by narrowing 0017's
sentence to silence-only — a re-reading. Under the log's own rule
(0021: a ruling flips an entry's status, never its prose), that takes
a new entry, not a gloss.

**Amendment:** G32's ratification lands a **new API-log entry**
(next free number) stating: "Composes with 0017, does not amend it:
the deadline seat remains the only door for acting on **silence**; a
scheduler seat is boundary deployment (not a fabric construct, not a
module — `Cron` stays a pure value) whose act is emitting monotone
tick evidence; triggers react to the tick's existence under the
unchanged grammar. No scheduler service exists in the fabric."
0017's prose does not change.

### G33 — no new minted id namespaces. ADOPT

Every identifier in the part is met by derivation (value digests,
declaration digests, work digests, the derived session key, chain
heads, petnames-as-naming, per-register tokens), and the counter-model
is on display next door: multica's surface is DB UUIDs end to end —
serviceable for a product, structurally incapable of the re-derivable
provenance walk §9.3 claims. The attribution exception is properly
licensed (authorship is the one thing content cannot derive) and
properly un-pre-empted.

### G34 — refuse the pinned workflow namespace. ADOPT

The part's biggest decision, and the cleanest. The collision shape
was re-verified at source this cycle (16-byte-truncated SHA-256 over
a delimiter-joined, developer-asserted pre-image; the estate's own
reproduction: `order-ship`/`42` ≡ `order`/`ship-42`); the engine
journals durable truth under that identity, and two sources of
durable truth is the failure mode, reconcilable only through the
scheme that collides. The mapping table shows every construct met
(sessions are the loop, C7 the limbs, C9 the reactions,
`DurableClock` answered by G32's boundary). Both reopen triggers are
named and honest. The ratified disclosure precondition rides:
**disclose upstream before any public use** of the collision
evidence — restated on this ruling so the refusal never ships as a
public claim with undisclosed evidence behind it.

### G35 — encode the lattice, never the topology. ADOPT

F9's meet-attenuation is proven, carries ten components, and needs no
eleventh for tiers — a tier is a writ profile plus a provider layer,
data all the way down. The estate's own review protocols (peer
graders inside one session) already violate a tree, so encoding one
would misdescribe the estate itself. Field data closes it: multica's
one topology noun, the squad, collapsed to `leader_id` routing —
members are never fanned out, member instructions never delivered —
while its `--stage` barriers deliver real fan-out/join with no
topology construct at all. A topology noun bought nothing there and
would cost every non-tree shape here.

### G36 — the taxonomy as design law. ADOPT-AMENDED

Adopt — the three-way test (join / checkpointed fold / register
decision, over immutable values) just proved its worth in this very
review: it is what makes G-4's three-loop split legible, it caught
the directory precedent, and §15.5's grading table turns datastructure
review into a one-word question. The fourth-class risk is correctly
fenced (a grill item with CALM analysis, not a workaround). The
amendment is about its carrier: the DECISIONS template gains a class
field — and `packages/plait/DECISIONS.md` is the estate's single
worst merge-conflict file (four hand-resolved T-number collisions;
PR #81 and PR #83 carry two more *right now*, including a duplicate
T14–T17 block already pushed).

**Amendment:** "The promised DECISIONS structural fix —
**issue-prefixed decision identifiers** (`DEV-724-T1`, not bare
`T14`) — is a **blocking precondition** of G36's template change and
lands in the same wave, applied to both files
(`packages/plait/DECISIONS.md`, `verify/fabric/DECISIONS.md`) with
existing bare numbers frozen as historical."

---

## Part 3 — the R-series: what both sheets missed

### R-1 — URGENT: the corpus wall reds on model growth; fix before M2 merges

`packages/plait/fixtures/fabric-conformance.ndjson` is written by the
model lane (regenerated byte-identically, hand-edit forbidden) and,
once PR #83 merges, **consumed by the required battery** through
`test/FabricWall.test.ts` — which hard-pins `vectors === 15`,
`rows.length === 15`, `checked === 11`, and a **total**-coverage
assertion over an 11-name consumed set plus a 4-name exclusion map.
M2 adds the F7/F11 families; M3 adds F10/F12. Whichever merges second
— the model wave or the fold — lands a required-battery red inside
`packages/plait`, manufactured entirely by the wall's shape.
`verify/fabric/run.sh` carries the same growth coupling in its own
lane (verbatim `expected_header` with per-family counts, 15 pinned
witness triples, positional `--self-test` row pins), but that file
updates in lockstep with the model by its own mandate; the plait-side
wall has no such discipline.

**Recommendation:** PR #83's review round-2 amends `FabricWall` from
total-coverage to **per-family coverage derived from the manifest
header** (families it consumes are walled row-for-row; unfamiliar
families are *reported, never fatal*), so corpus growth is
non-breaking by construction. The run.sh side stays strict — that is
the lane whose job is refusing drift. This is the one item that
cannot wait for the ruling ceremony: it gates the M2 merge.

### R-2 — the merge protocol for the union files is a chartered act

Both branches touch `Refusal.ts` (union 15→34), `index.ts`,
`test/PublicEffects.signatures.txt`, `test/RefusalNext.test.ts`,
`DECISIONS.md`. The second merge is a **coordinator act with a
checklist**, not a seat rebase: merge the union (34 kinds), regenerate
the signature manifest (`generate:public-effects`), verify T10's
one-demonstrated-trigger-per-kind over all 19 new kinds (both
branches carry their own triggers — the union commit runs the whole
wall), renumber DECISIONS per G36's amended scheme. Landing the B-8
transport extraction on main *before* the merges — as a seam map
might suggest — is refused: it would conflict into both live branches
and re-open review on both; the extraction is the **first commit of
the adoption wave instead** (six sites collapse to one in a single
behavior-preserving act, walled by the suites both branches already
carry).

### R-3 — DEV-712 round-2 charge (filed here so the review round carries it)

Beyond R-1: (a) three transport refusals ship `next: []`
(`lanes.ts`, `anchors.ts`, `pump.ts`), violating T16's replies-teach
discipline — supply the taught repair per the
`teachTransportReadBack` pattern; (b) `subscribe`'s new
stream-discovery semantics half-orphan `FabricClientOptions.stream`
(publish uses it, subscribe no longer does) — wants one explicit
DECISIONS entry, not an implicit drift past dispatch 31's non-goal
list; (c) DECISIONS T4/T5 supersessions (ephemeral-consumer prose;
dedup scope now per-partition-stream) land with the merge.

### R-4 — one content-addressed store, and the unification direction is ruled

The estate now has **two**: the fold's `state.<digest>` KV entries
(file-backed R=1, verify-on-read, crash-durable — the pattern the
chaos gates prove) and the catalog's process-local `Map` (deliberately
unverified `get`, verification at `Resolved.resolve`, vanishes on
restart). The direction must be ruled before anyone "unifies" them
the wrong way: **the Catalog gains a durable KV-backed layer built on
the anchors pattern (verify-on-read at the store seam it owns), and
the fold's `ensureState`/`loadState` then becomes a Catalog consumer —
never the reverse.** Moving the fold onto the process-local catalog
deletes the crash-durability its two chaos gates exist to prove. This
act is the deepest item in the adoption wave and the real substance
of "rock-solid fabric semantics" on the E6 side.

### R-5 — three same-question-different-answer seams, swept in the adoption wave

(a) Backpressure: main's subscribe pump is unbounded
(`Stream.callback`, T4), the fold's pump bounds at 256 server-side —
one package, two answers; B-4's disposition picks one. (b) Defect
classification: six new whole-promise `catch → transportRefusal`
sites joined B-7's pattern — defects still wear the retryable absence
sort everywhere. (c) B-1's excess-key decode: the register is now the
**sole** outlier — both branches' new decoders pass
`onExcessProperty: "error"`. The wave closes all three with T-B/T-C.

### R-6 — ops, not design: the multica `mcp_config` exposure

`multica agent list --output json` returns agent-level `mcp_config`
in **cleartext** — on this workspace that includes a live Cloudflare
Access client secret on five seats — while `custom_env` sits behind
an audited endpoint with `****`-preserve. Actions: rotate the exposed
Access credential; prefer env-var indirection over literals in
`mcp_config` where the server supports it; file the asymmetry
upstream. Plait inherits the lesson as a sentence in G30's band: *a
secret's homes are the environment and the `Redacted` value — never a
listing-visible config object.*

---

## Part 4 — the 712/E6 refactor: sequencing recommendation

The operator's frame: "as M3 lands we'll likely want to introduce the
major refactors to 712 and E6 … to solidify rock solid effect and
fabric semantics." The evidence supports the refactor and **a
different clock**: M3 lives entirely in `verify/fabric` (single
writer, Fable lane); the adoption wave lives entirely in
`packages/plait` (seat lane). They share exactly one file — the
corpus fixture — and R-1 makes that coupling growth-tolerant. Nothing
forces the refactor to wait for M3, and two things argue against
waiting: the post-M3 fan-out (E9, E12-2b, T-J) should start from the
refactored base, not against it; and the two-store question (R-4)
compounds with every consumer that lands meanwhile.

**The recommended sequence** (each step gated by the one before):

1. **Now:** re-dispatch the two dead reviews — DEV-729's targeted
   confirm of M2 at `816de025f` (the round-2 head: third F7
   statement, rival assembler as tenth mutant, roster 130) and
   DEV-727's targeted confirm of PR #81 at `a50bf5876` (round-2
   delivered; the confirm verifies F-2's two rows, F-3, F-6, and
   locates the uncited R2-3 minors). Dispatch PR #83's **first**
   adversarial review (it has had none), with R-1 and R-3 as
   pre-filed round-2 charges.
2. **Operator rules the sheets** (this document is the referee
   input). The ruling cuts T-A..T-K and the agent-plane tickets per
   the amended routes.
3. **Merge #81** on DEV-727's HOLDS (it sits on current main,
   MERGEABLE). **Merge #83** after its review, rebased over #81 under
   R-2's union-merge protocol. Merge M2 on DEV-729's HOLDS → land the
   M2 ledger (counts verified at head — the memory's "121" is stale;
   round-2 moved the roster to 130) → **dispatch M3** (Fable lane,
   3–4 sessions).
4. **The adoption wave runs beside M3** on the freed seats, in
   dependency order: transport extraction + B-1/B-2 + B-7/B-4
   dispositions (T-B/T-C, one act); `casJoinLoop` extraction per
   amended G-2 (T-D); Blob split + `ResolveCache` per amended
   G-5/G-3 (T-F/T-E); the durable Catalog layer + fold-state
   unification (R-4) — the wave's deepest act, last. Every step
   behavior-preserving, walled by the suites both branches already
   carry (CellWall, FabricWall-as-amended, RefusalNext, the signature
   manifest). Probe tickets T-G/T-I mint immediately (already
   ratified).
5. **By M3's merge** the app plane stands on the extracted
   abstractions, and the post-M3 tickets (T-J audit + three-bucket
   incarnation conversion, E12-2b, E9's walls, the shuttle's S1)
   start from solid ground rather than refactoring under themselves.

**Alternative (the operator's stated clock), priced:** hold the
adoption wave until M3 lands. Cost: the fan-out tickets and the wave
compete for the same seats *after* M3 instead of pipelining beside
it; every pre-wave consumer of Catalog/cells lands on shapes the wave
then moves; the two-store split persists longest exactly when its
consumer count grows fastest. Benefit: zero chance a wave regression
muddies an M3-adjacent investigation, and one fewer concurrent lane
to coordinate. Defensible if review bandwidth — not seat capacity —
is the binding constraint.

---

## Estate-of-safety candidate (per the standing through-line)

Endorsed from G26, as the review's own candidate: **a landed outcome
always decodes against the schema its certificate names.** Safety by
construction for every downstream consumer of outcomes; the wall is a
planted non-conforming commit shown refused at the door; the bound
riding it is G23's sentence, verbatim. If the E9 slice lands this as
its wall, structured output stops being a convention the way
canonical bytes already did.

---

*Referee: the coordinator (Fable), 2026-08-18, under the dispatch-35
mandate as redirected by the operator. Coverage: four Opus agents
(module seams; PR #81 audit; transcript/ruling sweep over 785426dc,
6ef03513, 3c6800bd + all memory files; multica 0.4.20 survey). Counts
and shas verified at head where quoted; the M2 roster figure (130) is
the round-2 head's and re-verifies at merge. No repository file other
than this one changed by this review.*
