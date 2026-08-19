# The algebra engine unification — stage-0 audit and spec

Date: 2026-08-19. Status: **COMMISSIONED, grill foregone by operator ruling
in session** ("we are foregoing the grill and you are clear to work till
completion"). Under that delegation every decision row below is RESOLVED at
its recommended option, priced in place, and logged in
`packages/plait/DECISIONS.md`; the build proceeds in the same session as
vertical slices, each to a measured wall. This record is tracking-land, not
an official surface: paths, tickets, and commands are lawful here (law 10
binds rendered projections, which this is not).

The commission, restated in one paragraph. The estate has verifiably modeled
its algebra — the proven kernel (`verify/kernel`, 57 rostered theorems), the
corpus its emitter mints (`packages/plait/fixtures/kernel-conformance.ndjson`),
the generated projections, the plane slices — but the runtime grew as first
passes: plane services with bespoke option shapes, a door three surfaces
export but no surface *speaks through*, a program builder whose effect is a
typed stub, and no MCP face despite the agent-first ruling. The unification
is one CORE ALGEBRA ENGINE at the center of `packages/plait`, stream-based
seams on every face, where **an operation is an admitted act, a configuration
is declared sentences, and an interaction surface is a coalgebra over folds**
— the closing property, built from what is already proven and walled, never
beside it.

## 1. The audit — what exists, what diverges, what is new

The package's own generated inventories are the census: 81 public
call/construct signatures (`test/PublicEffects.signatures.txt`), 164 public
types — 40 derived from the generated core, 124 ticketed staged debt
(`test/PublicTypeUniverse.inventory.md`). The fast battery is green at the
branch point (run first-hand this session, exit 0). Per element, the
algebraic reading and its status:

| Element | Algebraic reading (generators · rung · carrier · licensing law) | Status |
| --- | --- | --- |
| `truth/Canonical` | the one canonical byte form; identity's substrate | HOLDS — one canonicalizer, walled (`check:one-canonicalizer` + control) |
| `truth/Digest` | identity = SHA-256 over canonical bytes; the trusted base | HOLDS |
| `truth/Refusal` | refusal parity vocabulary; structural/absence sorts; kinds generated from the corpus + reviewed roster | HOLDS |
| `truth/Algebra` | the rung ladder as earned brands (KM-17); F4 witness door; rung⇒carrier as types | HOLDS but incomplete — the KM-19 combinator set (products, lifts, transformers, brand transport) has no code; ladder itself is ticketed debt (DEV-796/DEV-795) |
| `kernel/` generated family | law 1's core: corpus + tables + schemas + builder + SDK, byte-walled | HOLDS |
| `kernel/KernelDoor` | the one door: the characteristic function with materialized kernel (refusals as data); model-vector-gated | HOLDS |
| `kernel/KernelIdentity` | A1 guarded seam: content address → identity label, injective on the guarded domain | HOLDS |
| `kernel/KernelProgram` | the free DAG construction over the eight generators; fill = the proven valuation action (KM-14) | HOLDS as builder; the effect is a stub — **nothing executes a program** (the KM-4 composition gap, bound 2 of the KM sheet) |
| `kernel/CasDaemon` | the requirements shape (admit/publish/resolve/readAt/land); the no-engine fence in its header | HOLDS as shape; unwired by design |
| `kernel/ContextProgram` | cataloged declaration shapes; closed selector union | HOLDS as scaffold (F7 pending); ticketed debt |
| `kernel/Wire`, `kernel/Subjects` | envelope identity; subjects route, envelopes identify | HOLDS |
| `planes/Lane` | Σ* — the positioned plane; emit appends the journal; partition = declared key grammar | HOLDS |
| `planes/Fold` | declared reductions; step factors through the algebra (F4 bridge); quotient bound typed undistributed | HOLDS |
| `planes/Anchor` | the checkpoint fact (floor, stateDigest, head); successor discipline | HOLDS |
| `planes/Cell` | the join plane; one lattice write path; replica = lower bound | HOLDS |
| `planes/Register` | the fence; five actions; revision-CAS token; incarnation pin | HOLDS |
| `planes/Catalog`+`Resolved`+`Blob` | CAS; verify-on-read at exactly one seam per path | HOLDS |
| `planes/Address` | paths = iterated resolve from explicit roots (KM-16); no ambient root | HOLDS |
| `planes/Session` | the coalgebra half: writ-scoped anchored images; state → observation × next state | HOLDS but the face is pull-only — no `Stream` boundary, which the commission names for every seam |
| `carriage/FabricClient` | transport seam; `subscribe` already a `Stream`; exports the door | HOLDS |
| `surface/cli` | data-driven command tree on the pinned in-tree CLI | HOLDS |
| **the engine** | admit + eval bound as one language-speaking service; ingress totality executed | **NEW** — nothing today lets a caller *speak a sentence* and have judgment precede carriage; plane services take bespoke options and are reachable without the door |
| **program runtime** | run a closed declaration: per node, complete → door → carriage → bind; requirements as holes | **NEW** (KM-4's recommended composition; the stub's promised conformance target) |
| **environments / provision** | KM-15: positioned provision facts; valuation = greatest-position read; fill from environment | **NEW** (the algebra is proven model-side; no runtime carrier of the correspondence) |
| **KM-19 combinators** | products, pointwise lifts, contribution transformers; brand transport confirmed by suites | **NEW** |
| **MCP surface** | eight tools = the model's own emitted projection; served ≡ derived; judged by the door | **NEW** — the projection exists and is gated (`verify/unity/artifacts/tools.schema.json`, 8 tools, 274 lines, model+convention digests in its header); the runtime serves nothing |

Findings reported (evidence stands; dispositions below):

- **F-1.** `check:kernel-builder` / `check:builder-control` are outside every
  battery entry point and the kernel README records the control RED on a
  moved trace (the DEV-799 finding, standing). Disposition: out of this
  commission's slices; recorded as untouched, not quietly fixed — the red is
  someone's evidence.
- **F-2.** The declaration form deliberately under-determines execution:
  `kind` fields brand the builder handle and are never written, and
  `anchor`/`token`/`predicate` are `form: "absent"`. A program is therefore
  not executable from its bytes alone. Not a defect — the model's own
  erasure; it forces the supplies design (AEU-6) and is stated here so no
  one reads the runtime's supplies as an invention.
- **F-3.** The corpus `ground-two-node` vector admits as a *program* but
  cannot complete to door candidates (its declare carries no writ). The gap
  between program-form admission and executability is real and now has an
  executed witness (the run wall refuses it structurally at node 1).
- **F-4.** `check:kernel-surfaces-control`'s flipped-digest probe had been a
  no-op — and the control red — since the meaning-corpus register rotation,
  masked in this session's early battery runs by tail-piped invocations.
  Repaired at the close with a derived flip and a no-op guard (DECISIONS
  T24); the executed lesson is recorded in §4a.
- **F-5.** `test/ResolvedByteIdentity.test.ts`'s Go constrained-decode probe
  intermittently exceeds its five-second budget on a cold Go build cache
  (observed twice this session, first at the pre-edit baseline; green on
  every warm run). Environment flake, pre-existing, reported not repaired —
  the budget-versus-cold-cache disposition belongs to the wall's owner.

## 2. The seam map

Every face a typed boundary; refusal vocabulary = the one `Refusal` union
(structural/absence) on every public error channel plus the door's taught
rows as *data* inside verdicts.

| Seam | Direction | Type | Refusal vocabulary |
| --- | --- | --- | --- |
| transport (Go/NATS peer) | duplex | `FabricClient.publish` / `subscribe: Stream<ReceivedEnvelope, Refusal>`; carriers under `internal/` | `Refusal`; transport causes never wear fencing laws |
| ingress (the door) | in | `Engine.offer`: candidate → `KernelVerdict`; `Engine` write ops: judged sentence → carriage | the sixteen taught rows, verbatim from the generated table |
| engine observability | out | `Engine.verdicts: Stream<EngineVerdict>` (PubSub-backed) | none — verdicts are data, refusals included (KM-21's posture) |
| UI / consumer (coalgebra) | out | `Session.subscribe/read` + new `Session.changes: Stream<Step>`; never a second state store | `Refusal`; `undeclared-view` at the writ |
| agent (MCP) | duplex | eight served tools ≡ the model-emitted artifact, byte-walled; handlers route through the engine | tool results carry the taught row on refusal; parse errors are the schema layer's, never the door's |
| program (workflow) | in | `Engine.run(program, …): Effect<RunOutcome, Refusal>` per-node verdicts included | the door's rows per node + structural refusals at the one parse boundary |

## 3. Decisions — resolved under delegation

House style: one decision per row, option taken first with its price;
alternatives priced; all RESOLVED this session under the operator's
foregone-grill ruling. Load-bearing rows are duplicated into
`packages/plait/DECISIONS.md` (T18+).

- **AEU-1 — the engine's home is `src/carriage/Engine.ts`.** Carriage is
  "where the fabric is reached, not where anything is decided" — the engine
  decides nothing (the door decides); it carries judged sentences to their
  carriers, importing kernel + planes + truth downward, lawfully. Price:
  carriage stops being transport-only. Alternatives: a new plane (a reorg
  no ruling covers); `kernel/` (the language must not import its carriers).
- **AEU-2 — the engine's door context is a replica, not an oracle.** A
  `Ref`-held `KernelDoorContext` grown by the engine's own admitted
  declares, seedable at layer build; the true catalog stays the carrier's.
  The `CellReplica` precedent verbatim: a local lower bound. Monotone
  growth makes the read-judge-grow race benign — a candidate admitted under
  a smaller context is admitted under every larger one (the KM-20
  `admit_monotone` shape, cited not claimed). Price: `forward-reference`
  refusals are door-relative to *this* engine's view; retry-after-declare
  is the repair, and that is exactly what the taught row teaches.
- **AEU-3 — the runtime projection of a declared value's payload is
  `pins as digestRefs ++ [literal(label(digest(value)))]`.** The model
  reads a Value as an opaque identity label; the runtime's canonical bytes
  are the real content; pins (already house vocabulary on emits) surface
  the value's references so the door's forward-reference and off-writ
  checks bite on real referents. Price: an unpinned reference escapes the
  sweep — stated bound, same trust class as the hash. Alternative (deep
  structural translation of every value into atom lists): a second
  canonicalizer in disguise; refused.
- **AEU-4 — the write path is fully doored; reads keep their proven seams;
  trigger and spawn carry as the model interprets them.** declare→Catalog,
  emit→Lanes, join→Cells, decide→Registers, each only after its sentence
  admits. resolve carries through the existing verify-on-read; fold's read
  canon stays on Session/Folds (model bound 11: reads return no value —
  the engine adds judgment, not a second read path). trigger and spawn
  admit and land nothing: the model interprets both as world-identity
  (KM-6, KM-7), so a verdict is their whole v0 carriage. Price: no
  reaction runtime this commission; stated.
- **AEU-5 — `Engine.run` is the program runtime: fill → erase →
  admission-order walk → per node (complete · offer · carry · bind).** One
  pass, no clock, no scheduler, no retry — the CasDaemon fence holds;
  pacing and retries are the caller's. A refusal stops the run with the
  node name and the taught row intact. Price: no partial-progress
  resumption in v0 (a run is one act; resumption is the anchors' plane).
- **AEU-6 — execution supplies bind by node name and are refused by the
  door, never by the engine.** `kinds` per declare node (the declaration
  cannot carry them — F-2), `anchors` per fold, `tokens` per decide,
  `predicates` per trigger. A missing token is `unfenced-decide`, a missing
  anchor `ambient-query-input` — the model's own teachings; the engine adds
  zero judgment. What no candidate slot can carry refuses structurally at
  the one parse boundary (`decodeRefusing` over the generated candidate
  schema). Price: two refusal registers on one surface, each already ruled.
- **AEU-7 — dataflow: a consumed local lands as its producer's landed
  identity label, `literal` in value slots, raw label in digest slots.**
  Total and model-faithful (Value = opaque identity label). Price: the
  door's catalog check does not re-verify intra-program dataflow — the
  admission-order walk (proven well-founded model-side) already does.
- **AEU-8 — environments land as `planes/Environment.ts` at the KM-15
  minimal surface**: positioned provision facts, the greatest-position
  read, the fold form, and the collapse correspondence checked over
  seeded cases (the proven `provision_positioned_correspondence`, cited
  not re-proven); `fillFrom(program, facts)` feeds the proven fill.
  Multi-writer authoritative rebind stays the fenced register's; no KV
  carrier this commission. Price: process-local environments v0.
- **AEU-9 — KM-19 combinators extend `truth/Algebra.ts`**: `product`,
  `mapContribution`, `filterContribution`, with law brands transported by
  the preservation metatheorem and **confirmed** by the same generated
  suites that earn first-order brands (transport is never a suite skip).
  The closed set is closed by the surface: no arbitration, no finishing,
  no open combinator hook exists to call. Price: sketches and free-object
  helpers wait for a consumer.
- **AEU-10 — the MCP surface serves the model's own artifact.**
  `fixtures/tools.schema.json` is a byte-identical committed copy of
  `verify/unity/artifacts/tools.schema.json` (dual-home, the skills-mirror
  pattern), held by `check:kernel-tools` + executed control; the served
  toolkit is derived from those bytes at layer build (a total interpreter
  over the artifact's nine-keyword census — never a hand-written schema
  twin); handlers route through the engine; wire digests are
  `sha256:`-prefixed and strip to the guarded identity seam. The
  wire-name→candidate-field mapping is hand-carried data under an
  A5-shape waiver (the corpus provably carries no wire-name group; the
  owed emitter growth is named in the module header). Server =
  `effect/unstable/ai/McpServer` at the pin (in-tree, the DEV-786 CLI
  precedent), stdio via a `plait mcp` subcommand.
- **AEU-11 — `Session.changes` is the UI seam's stream face**: an unfold
  of `read` — every element an anchored image; pacing is the consumer's
  (scheduling stays host engineering); duplicates are lawful by
  anchor-idempotence.
- **AEU-12 — type-universe ratchet pins rise by hand under the delegation.**
  New hand-written public types are ticketed debt (DEV-795/DEV-817 targets
  as their prefixes already read); the pins in
  `test/PublicTypeUniverse.inventory.md` are operator-edit territory and
  the foregone-grill ruling is the operator act this session cites. Logged
  per edit in DECISIONS.

## 4. The slice plan, each with its wall

| # | Slice | Wall (measured, executed) |
| --- | --- | --- |
| S1 | `carriage/Engine.ts` — offer, judged write ops, context growth, verdict stream | fixture-carrier suite: a refused sentence performs zero carriage (trace-asserted); declare grows the context so a forward-reference repairs by growth; every engine verdict ≡ `admit`'s own on the same candidate (differential — no second door); refusal-channel manifest regenerated |
| S2 | `Engine.run` — the program runtime over the corpus vectors | `holey` refuses `unfilled-hole` at its reading node (the door's row, byte-equal to the generated table); `fill(holey, corpus valuation)` runs and its bytes ≡ the `holey-filled` vector; `distill-shape` executes end-to-end (resolve → decide → emit → join) against fixture carriers with a supplied token; `ground-two-node` refuses structurally (F-3's witness); per-node verdicts differential against the door |
| S3 | `planes/Environment.ts` — provision facts, greatest-position read | the fold/positioned correspondence over ≥32 digest-seeded cases; shadowing and disjoint-order cases; `fillFrom(holey, facts)` ≡ `holey-filled` bytes |
| S4 | MCP: committed artifact + parity check + served-equals-derived toolkit + `plait mcp` | `check:kernel-tools` byte-compares the two homes with an executed mutation control; a suite proves the registered toolkit's names/descriptions/schemas are byte-equal to the artifact's; handler differential: a refused tool call carries the taught row |
| S5 | `Session.changes` stream face | fixture suite: `changes` taken(n) ≡ n sequential reads |
| S6 | KM-19 combinators in `truth/Algebra.ts` | product of two suite-earned commutative algebras re-earns through the same suite (executed); an unbranded operand yields no unearned brand; filter preserves the brand through the F4 bridge |

Battery discipline: every slice lands with `bun run test:fast` green; walls
join `test:fast` (pure) so the partition derivation keeps them; the full
`bun run test` (walls + types) runs before the close.

## 4a. What landed (same session, completion amendment)

Every slice above shipped, and the walls were run first-hand:

- **S1+S2** — `src/carriage/Engine.ts` (the service, the judged write path,
  the verdict stream, the program runtime) with `test/Engine.test.ts`: 14
  tests, 75 assertions — the zero-carriage recorder plus its executed
  carry-before-judgment falsification, the growth-repairs pair, the
  door-differential over the corpus's admission candidates, the `holey`
  unfilled-hole refusal on committed bytes, the `holey-filled` intrinsic/
  relative refusal pair, the label-mapped landing, the four-node
  `distill-shape` executed end-to-end against fixture carriers, and the
  stop-at-refusal wall with the untouched-tail recorders.
- **S3** — `src/planes/Environment.ts` with `test/Environment.test.ts`: 7
  tests — 40 seeded correspondence cases, shadowing, permutation and
  duplication invariance, the arbitration refusal, and the corpus tie
  (fillFrom through a shadowed environment reaches the committed
  `holey-filled` bytes exactly).
- **S4** — `fixtures/tools.schema.json` (byte-identical committed copy),
  `scripts/check-kernel-tools.ts` + executed control (wired into
  `test:fast`/`test:types`), `src/surface/mcp.ts`, the `plait mcp`
  subcommand, and `test/KernelMcp.test.ts`: 10 tests — schema-object
  pass-through (`Tool.getJsonSchema` returns the artifact's own parsed
  object), handler/served parity, and the two refusal registers executed.
- **S5** — `Session.changes` with two stream-face rows in
  `test/Session.test.ts` (sequencing equality; per-element writ judgment).
- **S6** — `Algebra.product`, `Fold.mapped`, `Fold.filtered` with
  `test/Combinators.test.ts`: 7 tests — pointwise semantics, intersection
  transport, suite re-earn confirmation, no unearned brand, identity-law
  stillness under filtering, rung survival at a partitioned fold.

One wall fired during the close and is recorded as the evidence it is: the
one-door sweep (law 2's `check:kernel-door`) REFUSED the engine's first
spelling — a type-level extract naming the refused verdict shape, and an
invented `verdict` wrapper field on the MCP results — the moment the barrel
exports brought the new modules into its sweep. The repair removed the
spellings: the row projection became field-total with no verdict type named,
and the MCP results now carry exactly the artifact's own refusal fields with
no wrapper (a result carrying `reason` is a refusal; one carrying `sentence`
is an admission — the artifact's own distinction). The taught-payload pin
was regenerated to absorb the new minting sites (75 payloads pinned). Battery
greens from before the barrel exports were partially blind to the new modules
on those two sweeps; the close-of-session full battery over the exported
surface is the authority.

Ledger acts under the delegation: the type-universe ratchet pins rose by hand
(`carriage` 7→29, `planes` 61→65 — DECISIONS T22), the public-effects
manifest regenerated to 106 signatures, and the waiver ledger to 190
classified types, enforce green. The scoped laws for the engine, the
environment, the MCP parity, the stream face, and the combinators were
written into `packages/plait/AGENTS.md`; the plane READMEs and module list
grew their pointers.

Two more findings from the close, both repaired and logged (DECISIONS T23,
T24). The one-door catch is described above. The second: the surfaces
control's flipped-digest probe had been a NO-OP since the meaning-corpus
register rotation (its replace was keyed to a digest first-letter the
rotation removed), so `check:kernel-surfaces-control` — and with it
`test:types` and the full root battery — had been red since BEFORE this
commission's first edit; this session's early battery invocations masked
that red behind tail pipes and reported the pipe's exit, the exact
masked-exit failure the estate has ruled against before. The probe now
derives its flip from the register's own bytes and refuses a no-op mutation.
Battery claims in this record are therefore sized to the close-of-session
UNMASKED runs: the full package battery (`bun run test`) and the root
`bun run gates`, both quoted in the session report.

## 5. Honest bounds

1. **Conformance, not verification.** Engine verdicts agree with the door;
   the door agrees with the model's vectors. No runtime theorem is claimed;
   `Engine.run` claims nothing about concurrency beyond monotone-context
   benignity, and nothing about liveness, retries, or federation.
2. **Trigger/spawn land no world effect** (the model's own interpretation);
   reaction and writ machinery are later slices.
3. **Environments are process-local**; the KV carrier and multi-writer
   rebind wait on their own tickets.
4. **The MCP wire-name mapping is hand-carried under waiver** until the
   model's emitter grows the wire-name group.
5. **The egress law stays a stated candidate** (AE-4); `Session`'s seam
   ships its shape, not the package-wide claim.
6. **Scheduling, backpressure, retention, key custody** stay host
   engineering, exactly as the architecture note bounds them.
