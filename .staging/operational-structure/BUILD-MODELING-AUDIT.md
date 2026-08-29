# BUILD-MODELING AUDIT — Defun vs the build/speculation/multi-runtime question

Deep-modeling audit (operator-commissioned, 2026-08-29 night). Answers: do the semantics for build time, speculative/optimistic layer construction, and dynamic multi-runtime applicative layer reconstruction already exist?

## Verdict up front

**The semantics for build time exist and are already proved, under different names. The semantics for speculative construction do not, and the reason is sharper than "L-S is unbuilt": speculation is unsound against the estate's own observation, because the observation is the word and `put` appends to it. Multi-runtime reconstruction is composition of things that all exist, except for one runtime fact the description cannot hold — and that seat is already assigned to `Persistable`. G6-a composes cleanly and is the right shape for a build step; the arm should go on it.**

One thing to say before anything else: **the à la carte mapping has already been done in this estate.** `docs/entity-store/research/demand-provenance-survey.md:38` and `:628-740` carry a verbatim, line-accurate map of `Task`/`Scheduler`/`Rebuilder`/trace onto a content-addressed store, including the `Hash v = k` collapse, the "constructive trace degenerates to `(out, deps, recipe)` — three addresses" observation, and the correct grid placement. It is Category 3 (era record, provenance not authority) and its carriers were discarded with the old history, so it is not law — but its intellectual work is done and I am not redoing it. What follows re-states it against today's carriers and adds what that survey could not: the estate now has the proofs.

---

## 1. The seat check — what is already taken

| Seat | Carrier | State |
|---|---|---|
| Applicative task with statically computable dependencies | `PProg` + `PProg.envelope` (`Defun.lean:169`, `:1187`) | **FULL, and proved** |
| Monadic task, no static analysis | `Prog CasSig` (`Prog.lean`), impossibility argued at `Fragments.lean:150-155` | **FULL** |
| Selective task | L-S guarded table | **DESIGNED, OWED** (`Fragments.lean:94-143`) |
| `dependencies` via `Const` | `PProg.reads`/`puts`/`dataflow` (`Defun.lean:1152`, `:1158`, `:1175`) | **FULL, and stronger** — bounds writes too, with order |
| Task polymorphic in `f` | `Handler S M` + `interpret` (`Handler.lean:42`, `:47`) | **FULL.** `h.handle` *is* à la carte's `fetch` callback |
| Content-addressable cache | the store itself; `cas-http/0` §6 `/control/missing` | **FULL** (unhosted) |
| Early cutoff *detection* | `put`'s `duplicate` outcome — `putWord_word` (`Defun.lean:1410`), `putWord_answer` (`:1383`) | **FULL, proved** |
| Early cutoff *consumer* | — | **VACANT**, and `BUILD-SEMANTICS.md:96` already says so |
| Topological scheduler | not needed at L-A — see §3A | **DISCHARGED STATICALLY** |
| Non-hash-determined operation, handled | `AgentSig = CasSig ⊕ₛ LlmSig` (`Ops.lean:46`) + `Prog.handleLlm (oracle)` (`Interp.lean:184`) + `runAgent` (`:190`) | **FULL — this is the rebuilder pattern, already in the estate** |
| Persistent trace store `i` | — ; seat assigned to `Persistable`/`PersistedCache` (`SPECS.md:176-191`) | **VACANT, SEATED** |
| One description, many venues | `Handler.through`/`interpret_through` (`Tower.lean:65`, `:71`); R10 (`EFFECTS-BACKEND.md:171-179`) | **FULL, ruled, unspent** |
| Optimistic-run-then-check | `proveHandler`/`verifyHandler` + `whole_run_security` (`Auth.lean:117`, `:173`, `:678`) | **FULL as a shape; the payoff is unclaimed** |

The single most important row is the `handleLlm` one, and it deserves stating plainly because it decides question A. **`Prog.handleLlm (oracle : String → String) : Prog AgentSig A → Prog CasSig A` is à la carte's `Rebuilder` at one stratum less machinery.** Mokhov's `Rebuilder c ir k v = k -> v -> Task c k v -> Task (MonadState ir) k v` takes an unconditional task and returns one that consults persistent information. `handleLlm` takes a program over a summed signature and returns a pure store program by consulting a function from arguments to answers. The estate already knows what to do with an operation whose answer is not determined by its arguments: sum it in, and interpret it away with an oracle. A build step is `LlmSig` with different fields.

---

## 2. The mapping table

| à la carte (JFP 30:e11) | Estate carrier | Exists | Theorem |
|---|---|---|---|
| `k` (key), `v` (value), `Hash v` | `Addr32`; **`Hash v = k`** — the hash *is* the key | HAVE | `addr` (`Core/Address.lean:36`), Level 0 |
| `Store i k v` | `Word` / `Cas.Store`; `i` has no carrier | PARTIAL | `Word.find`, `run_preserves_wf` |
| `Task c k v = Task (∀f. c f => (k → f v) → f v)` | `Prog S A` + `Handler S M`; the `∀f. c f =>` is R10 | HAVE | `interpret_bind` (`Handler.lean:53`) |
| `Task Applicative` | `PProg` (L-A) | HAVE | `runP_embed_agree` (`Defun.lean:344`) |
| `Task Selective` | L-S guarded table | **OWED** | `L-A ↪ L-S`, `L-S ↪ L-P` (`Fragments.lean:129-134`) |
| `Task Monad` | `Prog CasSig` (L-P) | HAVE | analysis impossible, argued not assumed |
| `dependencies :: Task Applicative k v → [k]` | `PProg.reads` / `PProg.envelope` | HAVE, **stronger** | `PProg.resolve_sound` (`:1314`), `touches_sound` (`:1337`), `runPFrom_absent_sound` (`:1668`) |
| — (à la carte has no write set; one output per task) | `PProg.puts` + order | **HAVE, no à la carte counterpart** | `runPFrom_puts_sound` (`:1520`), `List.Sublist` |
| Acyclicity assumption ("all build systems are correct only under…") | `StoreRef` children ⇒ acyclicity free (`System.lean:118-126`); `Envelope.dataflowClosed` | **HAVE, discharged** | `runP_no_dangling` (`:1872`) |
| Topological scheduler | the table *is* the sorted order; the emitter sorts | **HAVE, moved to stratum 1** | `dataflowClosed` is the order certificate |
| Restarting / suspending scheduler | — | **NOT NEEDED at L-A**, required only above it | — |
| Rebuilder (the axis) | `Prog.handleLlm`-shaped oracle folding | HAVE-BY-COMPOSITION | `interpret_bind` carries it |
| Dirty bit | mise `sources`/`outputs` (BS1, undeclared) | OWED, no Lean seat | — |
| Verifying trace `Trace {key, depends, result=Hash v}` | `Gate.Fixture {path, content, label}` — stores the *value*, always recomputes | **DETECTION ONLY** | — |
| Constructive trace `(out, deps, recipe)` | — | **THE VACANCY** | see §3A |
| Deep constructive trace (skip *n* levels) | `PProg.answersFrom` computes the whole chain; an *n*-skip is its projection | HAVE-BY-COMPOSITION | `runPFrom_done_answers` (`:1439`) |
| Early cutoff | `put`'s `duplicate` | **HAVE, proved** | `putWord_word`, witness at `:1920` |
| Cloud build / CAS cache | store + `cas-http/0` §6/§7 | HAVE (unhosted) | — |
| Correctness (`getValue k result == compute task result`) | **discharged by admission, not by a build system** — `Store.put` recomputes the digest | **HAVE, stronger** | `put_fresh_spec`, `addr` Level 0 |
| Minimality ("at most once per build") | — ; `runP` executes every line | **ABSENT** | the estate is à la carte's `busy` with dedup |

Two entries in that table are the whole finding. **The estate's `dependencies` is proved sound against the run and covers writes with order — à la carte's is correct by parametricity and covers reads only.** And **à la carte's correctness condition is discharged by the store's admission judgement rather than by a build system**, which is `BUILD-SEMANTICS.md:230`'s "the address is the certificate" arriving from the other direction.

---

## 3. Verdicts

### A. BUILD TIME — **HAVE-BY-COMPOSITION for the task/dependency/cutoff/cloud half; OWED for one thing, and the owed thing is not what the study says it is.**

The composition: `PProg` + `PProg.envelope` (= `dependencies`) + `putWord_answer`/`put_duplicate_spec` (= early cutoff *and* the action digest, at Level 0) + `Graph`/`cas-http/0` (= the content-addressable cache) + `Envelope.dataflowClosed`/`runP_no_dangling` (= topological admissibility, decided before running). Nothing in that list needs designing.

**But `BUILD-SEMANTICS.md:204-208` is false as written, and the falsity is load-bearing.** It says:

> "A build plan is then `Prog BuildSig` — straight-line, L-A, already ratified (sorts 14/15), already store-resident, already encodable/decodable (`encodeProg`/`decodeProg`)."

`PProg` is not polymorphic in the signature. `PLine` (`Defun.lean:162-166`) carries `put (version tag : UInt8) (payload : Bytes) (refs : …)` and `load` — `CasE`'s two operations, spelled concretely. `embedFrom` lands in `Prog CasSig Addr32` (`:197`). `encodeProg`/`decodeProg` encode `PLine`s at tags 14/15. **`Prog BuildSig` inherits nothing from `Defun.lean`: it is an L-P term over a new signature, and `Fragments.lean:150-155` says L-P admits no static analysis at all.** The sentence inverts the tower.

The technical reason underneath, which no document states: **`build` breaks hash-determined dataflow.** `PLine.answer H env` (`:1357`) is total because a put's answer is `H (encodeNode n)` — a function of the operation's own argument, at Level 0 with no premise on `H` (`putWord_answer`, `:1383`). `BuildSig.build (recipe) (inputs) : Address` has no such function: the address of a built artifact is not a digest of the recipe. So `PProg.answersFrom` would return `[]` at a build line, `runPFrom_done_answers` would not extend, and the entire envelope/sandwich apparatus stops there.

That is the exact statement of the vacancy, and it is smaller and more precise than "the estate lacks a build system":

> **The rebuilder's persistent trace store exists to supply answers for operations that are not hash-determined, and `build` is the estate's first such operation outside `LlmSig.infer`.**

Three honest routes, in ascending cost:

1. **Declared-output build steps (Nix's fixed-output derivation).** `build (recipe) (inputs) (output : Addr32) : Addr32` — the answer is the declared address and the handler's job is to *check* it. Hash-determination is restored trivially, the whole L-A analysis survives unchanged, and no trace store is needed for correctness. This is `BUILD-SEMANTICS.md:230`'s ruling already applied one level down. It covers only steps whose output is known in advance — which is exactly Nix's honest restriction, and exactly R15's acquisition loop.
2. **Floating-output steps, summed and oracled.** `CasSig ⊕ₛ BuildSig` handled by `Handler.sum` (`Handler.lean:63`), interpreted away by a `handleBuild` in `handleLlm`'s exact shape. Zero new abstraction; you lose the envelope for the summed program, which is correct and should be said out loud. *Here* the trace store is needed, and under `Hash v = k` it is `(out : Addr32, deps : List StoreRef, recipe : StoreRef)` — three addresses and a list, small enough to be a described kind.
3. **A `build` arm on `PLine`.** Additive on tags 14/15 per the P6 ruling, and it re-opens the whole sandwich with the answer no longer hash-determined. This is the expensive one and should not be taken until (1) and (2) are exhausted.

**Named carriers with no seat:** the persistent trace store (seated at `Persistable`/`PersistedCache`, `SPECS.md:176-191` — that ruling is correct and should be executed as-is), and a *minimality* statement, which the estate has never made anywhere.

### B. SPECULATIVE / OPTIMISTIC CONSTRUCTION — **OWED, and the licensing question and the safety question must be split, because one is free and the other is false.**

**Licensing is free.** SAF Table 1's positioning — `select` adds conditional and speculative execution *while keeping* static visibility — has its estate form already: an over-approximating envelope is what lets a scheduler provision for both arms without running either. `Fragments.lean:216-221` already writes the L-S row of the interop contract in exactly those terms ("over-approximation for provisioning, under-approximation for parallelism"). Nothing to design.

**Safety is not free, and the naive claim is false as designed.** "Run both arms, discard the loser" is observationally equivalent to running one arm only if discarding is observationally invisible. In this estate the observation is the word (R5), and `put` appends to it. `runPFrom_puts_sound` (`:1520`) bounds the word by the *declared* put shapes — it does not say the word grows only by shapes on the taken path. A speculative run therefore leaves the loser's bindings in the word, and `ObsEq` does not quotient the success word (`Representation.lean:134`; `ObsEq.run_refused` at `:198` quotients only the refusal word). **Any document that says selective gives optimistic execution for free is wrong here, and the word is why.**

There is a rescue, and it is already proved. `putWord_word` (`:1410`) says a put either appends its own binding or leaves the word untouched; `putWord_answer` (`:1383`) says the answer is the content address in both branches. So the loser's puts are **inert with respect to every answer** — they never change what any later line computes. The honest theorem shape is therefore an inequality on words, not an equality:

> **Speculation is answer-preserving and word-polluting.** The status and the designated answer are unaffected; the word acquires a `Sublist` of the loser's declared put shapes.

That is `runPFrom_puts_sound`'s exact statement lifted one rung, and it is the smallest correct certification. The alternative — **scope the speculation** — is cheaper and needs no new theory at all: run the arm against a forked word and merge only the winner. That is `Layer.fresh`'s `makeMemoMapUnsafe` move (recorded at `System.lean:59-61`) and Bazel's dynamic-execution cancel, and in this estate it is a handler over a seam signature summed in per R10 (`EFFECTS-BACKEND.md:177-179`). Its gate is word equality with the reference run — the estate's own existing gate.

**Is prover/verifier the right precedent?** Right *shape*, wrong *payoff*, and the estate should not overclaim it. The shape is exactly right: one syntax, two handlers, no second term, no agreement relation (`Auth.lean:6-11`), and `whole_run_security` (`:678`) is precisely "an untrusted party ran it; check the claim, at Level 0". What does not transfer is cheapness. `verifyHandler`'s economy is an asymmetry in *state* — it holds no store and consumes a stream. A speculative build's check has no such asymmetry: re-running is the check. `DESIGN.md:277-280` already flags this ("the estate has no cost model and no succinctness claim anywhere. If the verifier ends up consuming a whole word, the λ• analogy has been taken without its payoff"). That warning applies verbatim here.

The genuinely cheap verifier for optimistic construction is not `verifyHandler`. It is **the envelope against the word**: `runPFrom_puts_sound`'s conclusion is a decidable relation between a produced word and a statically computed envelope, and `BUILD-SEMANTICS.md:231` already names the word as the ActionResult. Optimistic-then-check should be *envelope-checked*, not proof-checked.

### C. DYNAMIC MULTI-RUNTIME LAYER RECONSTRUCTION — **HAVE-BY-COMPOSITION for the topology-per-venue half; OWED for mid-flight reconstruction, and the owed thing is a runtime fact, not a semantics.**

**One topology, several venues: HAVE, and G6-a demonstrates it in the landed artifact rather than proposing it.** `tools/EmitLayers.lean:84-152` carries one DAG with two roots — `casSystem` and `kvsSystem` — the *same* `storeLaw` and `addressLive` standing over two different byte-plane backings, shared by address. That is one description evaluated against two venues, emitted and gated. The general form is R10 (`EFFECTS-BACKEND.md:171-179`) plus `Handler.through`/`interpret_through` (`Tower.lean:65`, `:71`), both landed and both unspent.

**What the content address buys: exactly the Nix substituter move, and it is already the shape of the fold.** `EmitLayer.find?` (`:129`) resolves children by address; `resolveAll` (`:246`) is children-first, so an already-resolved child is a lookup and not a traversal, and `none` at an unbound address *is* the acyclicity check paid for by ordering. Extended across venues that is `POST /control/missing` — verbatim REAPI's `FindMissingBlobs` and Nix's closure pre-query (`BUILD-SEMANTICS.md:93`). Already-built children skipped by address is composition, not construction.

**Mid-flight reconstruction is where it stops, and the boundary is worth stating precisely.** `residualOf` (`EmitLayer.lean:134`) is a total function of the description, so "what does this node still demand" is computable at stratum 1 without running. But `Residual` is a **key set, not a build state**. To rebuild a partially-constructed layer graph on another venue you need the set of already-acquired children, which is a runtime fact; Effect holds it in a `MemoMap` keyed by object reference (`System.lean:39-42`), and an object reference is not addressable. **So the sharing divergence, which `EFFECT-AST-PLACEMENT.md:97` correctly frames as a resource-count hazard, becomes a *liveness* hazard here: a description cannot reconstruct a partially-built graph, because it cannot see which memo entries exist.**

The seat for that is already assigned and is the third keying regime: `PersistedCache`, keyed by a `Persistable` `PrimaryKey` over a schema-described request, storing a serialized `Exit`, in a store shared across "fibers, process restarts, or workers" (`BUILD-SEMANTICS.md:151`). That is literally the resume-across-venues carrier, and `SPECS.md:176-191` already ruled it top-of-backlog with no bumping. `System.lean:70-73` already records where it belongs. **OWED, seated, no new machinery.**

One boundary to state so nobody designs the wrong thing: **a built layer is not content.** It holds live resources. Content addressing gives plan reuse across venues, never instance reuse. Venue migration means re-acquire from the residual, not transfer.

**Is anything genuinely missing?** No new semantics. Two carriers and one theorem: (i) a progress/residual record keyed by address — `Persistable`'s seat; (ii) a venue-seam signature summed in, which R10 already rules and `Handler.sum` already provides; (iii) one theorem that the residual fold is stable under re-rooting (§4, RESID-1).

### D. G6-a INTEGRATION AUDIT — **composes; the build-step arm belongs on it; one hazard and one absence.**

State: committed at `1c213a8d` in `.claude/worktrees/agent-a9e136e38fddb5727`, with `lake exe emitlayers --check` wired into `check:cas` (`mise.toml:133`) and a `lean_exe` row at `lakefile.toml:88`. Not mid-flight — landed, in the worktree.

1. **It composes with A–C, and it is already the constructive-trace shape.** `SystemNode` (`System.lean:167-179`) is `(recipe = ctor : CodeRef, deps = StoreRef children, out = the node's own address)` — à la carte's `(out, deps, recipe)` one level up, with `Hash v = k` already collapsed. **A build-step arm rides it cleanly**, and the module's own docstring (`:93-99`) says exactly that and leaves the question open. My answer to `BUILD-SEMANTICS.md` ask 4, from the landed shape: **the arm, not a sibling signature** — because a sibling `BuildSig` costs the summed-signature analysis loss described in §3A(2), while an arm keeps the topology and the build step in one addressed DAG with one acyclicity argument.

2. **Union growth is arm-additive and does not move stored addresses.** The payload is a tagged JSON projection (`System.lean:220`), so an existing arm's payload is a function of its own tag and fields; adding `build` leaves every stored topology's address unchanged. The **schema code's** address does move — the arms are in canonical alphabetical order (`backing, fresh, merge, opaque, provide, provideMerge, service`) and `build` inserts at the head, and decision 4 rules order is identity. That is a documented versioning event, not an address-moving event for content. Ruling ask 4 below confirms it.

3. **"Does it admit the selective/guarded form later?" is the wrong question as posed, and the seat is taken.** `Fragments.lean:242-245` is explicit: `cas_struct`/`cas_union` emit schema codes, which are stratum-1 data and not programs at any rung. L-S is a growth of `PProg` on tags 14/15, not of a described kind at `0x54`. What `SystemNode` *could* grow is a conditional arm (a `Layer.unwrap` branching on a host value) — and `EFFECT-AST-PLACEMENT.md:63` measured that at 0.5% of sites but at the *entry point* of ~10% of applications, and ruled it to `opaque`, which `System.lean:100-103` implements. **Do not build a selective SystemNode. That is the duplicate this audit exists to refuse.**

4. **The one live hazard: the plan is not canonical, and under à la carte that costs cache hits.** `System.lean:82-89` states the fact — the address is a function of the *authored* list order, while `EmitLayer.normalize` (`:117`) dedups and sorts, so two spellings of one service set emit identical TypeScript at two different addresses. The module calls canonicalization "available as growth" and defers the ruling. What is new here is the *price*: an action digest that differs while the output is byte-identical is an early-cutoff defeater, not a tidiness question. This is precisely Bazel's silent failure mode inverted — instead of two different outputs sharing a hash, two identical outputs get two hashes, and the cache misses forever.

5. **The one absence: `EmitLayer.lean` carries no theorem.** The residual fold, the acyclicity-by-ordering claim (`resolveAll` returning `none`), and the "address is the certificate" claim are docstrings checked only by the TypeScript differential. That is *correct* for the cross-language half — `DESIGN.md:362-365` rules a cross-language seam is gated, never proved. But the Lean-internal half is unstated and provable. See RESID-1.

6. **Scope note for lane C, not a defect:** `EmittedLayers.test.ts` explicitly disclaims instance counts, and instance count is exactly what a venue reconstruction would need to certify. The acceptance does not yet cover what C wants, and the generated header says so honestly.

---

## 4. Owed theorems, house style, falsifiability-checked

**HD-1 — hash-determination, stated.** An operation of a signature is *hash-determined* when a total function from its arguments to its answer exists that no handler may contradict. `CasSig`'s two operations are: `putWord_answer` (`Defun.lean:1383`, Level 0, no premise on `H`) and `PIn.resolve`. The run-level consequence is `runPFrom_done_answers` (`:1439`). *The instances are proved; the statement does not exist.* Falsifiability: **false for `LlmSig.infer`** (`Ops.lean:37`) and false for a floating-output `build`. Both must be exhibited, not assumed.

**HD-2 — the counter-witness.** Exhibit an operation whose answer history is not a function of the program, in the style of `Defun.lean:1005`'s `hsep` witness. Falsifiability check: the witness already half-exists — `AgentSig` (`Ops.lean:46`) is the estate's live example, and `Prog.handleLlm` (`Interp.lean:184`) is its discharge. The slice is naming what that pattern *is*.

**FRAME-1 — the frame condition, for every run and not only `done` ones.** For every `p`, `w`, and every address the run consults: `a ∈ PProg.reads p ∪ PProg.answersFrom H [] p`. Today this is proved at the observable (`runPFrom_absent_sound`, `:1668`) and per-line against an abstract history (`PProg.touches_sound`, `:1337`), with the history identified only on `done` runs. Falsifiability check: **believed true** — `answersFrom` stops only at a dangling operand, which is also where the run refuses — and the smallest missing carrier is a history-prefix lemma (`the run's history at refusal is a prefix of answersFrom`). Flag: **`Fragments.lean:186-189` currently states the conclusion as an interop guarantee** ("no run of the table from any word touches an address outside `reads ∪ answers`"), and the proof stops one step short of it for refusing runs. Small, real, closable.

**SPEC-1 — speculative soundness, sublist form.** Running both arms of a guarded table and discarding the loser preserves the status and the designated answer, and grows the word by a `Sublist` of the *possible* put shapes. Falsifiability check: **the equality form is false as designed.** `put` appends; `ObsEq` does not quotient the success word. Any statement of the form "select gives speculation for free" must be refused.

**SPEC-2 — the scoped alternative.** A handler running an arm against a forked word, merging only the winner; theorem `runS_scoped q w = runS q w`, word equality with the reference. Falsifiability: rides `Handler.sum` and R10's seam-effects clause, no new abstraction. Cheaper than SPEC-1 and probably the right answer.

**RESID-1 — the residual fold, internally.** `resolveAll` (`EmitLayer.lean:246`) is order-independent up to children-first, and `residualOf` is monotone under provision. Falsifiability check: **do not state "the emitted layer provides exactly `residual.provides`"** — that crosses the language boundary, and `DESIGN.md:362-365` rules the estate can only *gate* there, never prove it. The Lean-side theorem must be the weaker internal one.

**CUT-1 — early cutoff, named not proved.** `put`'s `duplicate` outcome *is* à la carte's early cutoff, and it is already proved (`putWord_word`, and the witness at `Defun.lean:1920` is literally an early-cutoff demonstration read from the envelope side). Owed is not a theorem but a *consumer*. `BUILD-SEMANTICS.md:96` already says this; confirmed, not new.

**CANON-1 — the plan's canonical spelling.** A ruling, then either canonicalization at authoring or a stated acceptance that the plan cache is order-sensitive. See §3D(4).

**L-A ↪ L-S, L-S ↪ L-P** — already owed and named (`Fragments.lean:129-134`). Restated only to fix the order: SPEC-1 sits above both and cannot be commissioned first.

---

## 5. Statements that are false or stale as written

1. **`BUILD-SEMANTICS.md:204-208`** — "`Prog BuildSig` … straight-line, L-A … already encodable/decodable (`encodeProg`/`decodeProg`)". **False.** `PProg` and its whole apparatus are `CasSig`-specific. §3A above.
2. **`Fragments.lean:120-121`** — "one additive tag (16, to be reserved with the registry agent)". **Superseded** by the P6 ruling: forms on step/cont, never a third tag (`EFFECT-AST-PLACEMENT.md:37`). `DESIGN.md` §5 item 8 carries the same stale reservation.
3. **`Fragments.lean:72-74`** — tags 14/15 "RESERVED rows … pinned by `#guard` and deliberately spelled outside `Cas.Grammar.Ty`". **Stale.** `Defun.lean:127-144` records that debt discharged 2026-08-29; the guards are gone and the tags are `Ty.step`/`Ty.cont`. Fragments describes the pre-G3 world.
4. **`Fragments.lean:136-143`** — the L-S ruling ask names `cas_run` as the candidate first consumer. **Superseded**: P7 already named `agentStep` (`EFFECT-AST-PLACEMENT.md:13`).
5. **`DESIGN.md` §3.1's L-A row** — "exact: `over = under = actual`". Already refuted by the estate itself, with two witnesses (`Defun.lean:1906`, `:1920`) and the refutation recorded at `Fragments.lean:68-71`. Noted as caught, not as a finding.
6. **`Fragments.lean:186-189`** — interop claim 1 states more than is proved for refusing runs. FRAME-1.
7. **Paperwork.** Neither *Build Systems à la Carte* (JFP 30:e11, `10.1017/S0956796820000088`) nor SAF is G0-pinned. SAF carries an explicit "corpus pin pending" at `.reference/catalog/REFERENCES.md:62`; à la carte does not appear in `REFERENCES.md` at all, and is cited only in a Category-3 era record. This report cites both provisionally and nothing here may promote past pre-grade before they are pinned — same posture as `DESIGN.md`'s B0.

---

## 6. Ruling asks

1. **Rule that the tower is not signature-polymorphic**, and correct `BUILD-SEMANTICS.md:204-208`. `Prog BuildSig` is L-P over a new signature and has no envelope; only `PProg` over `CasSig` has one. Worth ruling because the false sentence makes the build lane look free.
2. **Rule the two build-step regimes** — declared-output (hash-determined, rides L-A, no trace store) and floating-output (summed signature, oracled in `handleLlm`'s shape, trace store required). Then rule the trace store's carrier is `Persistable`/`PersistedCache` as `SPECS.md:176-191` already directs, not a new kind.
3. **Answer `BUILD-SEMANTICS.md` ask 4 from the landed shape: an arm on `SystemNode`, not a sibling signature.** The shape G6-a was meant to answer with has landed and it answers.
4. **Rule the schema-code address move on arm addition as a versioning event**, explicitly, so the growth path in `System.lean:93-99` is unambiguous when `build` lands.
5. **Rule `CANON-1`** — canonicalize authored `provides`/`requires` lists at the door, or record that the plan cache is order-sensitive. `System.lean:88-89` deferred this; the à la carte reason (cache-hit defeat, not tidiness) is what should decide it.
6. **Refuse a selective `SystemNode` by name**, on the record, with the reason: schema codes are not programs at any rung (`Fragments.lean:242-245`), and the conditional case is already ruled to the `opaque` arm.
7. **Rule speculation's observation.** Either the word is coarsened for speculative runs (SPEC-1, an inequality) or speculation is scoped to a forked word and merged on the winner (SPEC-2, an equality). Do not let a document claim selective gives speculation for free.
8. **Housekeeping:** refresh `Fragments.lean`'s prose against P6/P7 and G3 (items 2–4 of §5). It is the estate's declared interop reference and it currently describes a world three rulings old.

---

## 7. The one modeling slice

> **MS-1 — Locate hash-determination, and make it the boundary of every downstream lane.**
>
> One definition, one lemma restatement, one counter-witness, one paragraph of ruling:
>
> 1. Define *hash-determined operation* in `Cas/Lang/Defun.lean`'s envelope section, as the property `PLine.answer` already computes for `CasSig`.
> 2. State the discharged instance — it is `putWord_answer` (`:1383`) and `PIn.resolve`, both landed at Level 0; this is a statement slice, not a proof slice.
> 3. Exhibit the counter-witness as an executable `example` in the estate's own style (`Address.lean`'s Level-2 witness, `Defun.lean:1005`'s `hsep` witness, `:1906`/`:1920`'s two gap witnesses): a program over `AgentSig` whose answer history is not a function of the program. The signature already exists (`Ops.lean:46`), so the witness is short.
> 4. Rule the boundary: **operations inside it need no trace store; operations outside it need `(out, deps, recipe)` and get it from `Persistable`.**
>
> **Acceptance:** `lake build` green, `#print axioms` clean, no `sorry`, and the counter-witness `decide`s.
>
> **Why this one first:** it is the smallest thing that turns "does the estate model build time?" from a mapping exercise into a decided boundary, and every one of A, B and C trips over the same fact. A decides on it (`build` outside ⇒ trace store, `build` with declared output inside ⇒ nothing owed). B decides on its neighbour (a speculative arm's puts are inert *because* answers are hash-determined). C decides on its complement (a MemoMap entry is exactly the non-hash-determined runtime fact a description cannot hold). It costs zero new sorts, zero new signatures, zero new carriers, and it is the statement the estate has been proving instances of for two weeks without naming.
>
> **Follow-on, not in this slice:** the `build` arm on `SystemNode`; the `Trace` described kind; FRAME-1's history-prefix lemma; SPEC-2's scoped handler.

**What I would not commission:** a `Rebuilder` or `Scheduler` abstraction (the first is `handleLlm`, the second is discharged statically by `dataflowClosed`); a selective `SystemNode`; a signing plane for remote build outputs (`BUILD-SEMANTICS.md:230` already ruled it out and the ruling is right); a new carrier for build state before `Persistable` is spent; and anything that recovers a topology or a build step from existing TypeScript — three separate documents have now ruled that out and the divergence they cite is confirmed in v4 source.
