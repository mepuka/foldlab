# VERIFICATION — the claims ledger

Every verification claim the repository makes, with its rung, its
exact bounds, the assumptions it stands on, and the file where it is
checkable. A claim absent from this ledger is not made.

## How to read a rung

A rung names how strongly a contract is established. Rungs are defined
in
[docs/map/tickets/009-the-verification-ladder.md](docs/map/tickets/009-the-verification-ladder.md):

| Rung | What it establishes |
| --- | --- |
| R0 | fixture walls — a wall is a differential test: two implementations, one input, digests compared |
| R1 | property tests |
| R2 | bounded model check |
| R3 | inductive invariant |
| R4 | lockstep conformance against the running binary |
| R5 | mechanized proof |

Every entry below keeps the same four parts: the **claim** it asserts,
the **evidence** that establishes it, the **bounds and residuals**
where that evidence stops, and the file it is **checkable at**. A
status of **HELD** means the claim is written down but not asserted:
its evidence is in repair, and the entry states what must land before
it upgrades.

## Status at a glance

The table points; the entries below carry the bounds.

| Contract | Rung | Status | Checkable at |
| --- | --- | --- | --- |
| Effector (commitment register) | R3 + R4 | **Archived** 2026-08-15 at `archive/pre-estate-focus`; was Claimed with proof artifacts unshipped (ticket 013) | the tag; section below kept as record |
| Catalog + ingress | R2 + R4 | **Claimed** at R2 and R4; R3 **HELD**, in re-proof at repaired bounds | [verify/catalog/](verify/catalog/), [proto/go/catalogr4/](proto/go/catalogr4/) |
| Journal (CAS-append, verify-on-read) | R0/R1 + R2 | **Claimed** at R0/R1 for the runtime and at R2 for the model, including the refinement into the catalog model; R3 and R4 owed. The chain walls' TS≡Go half is **Archived** at `archive/pre-estate-focus` | [verify/journal/](verify/journal/), [go/journal/](go/journal/), [docs/gauntlet/](docs/gauntlet/) |
| KV meaning fold — combine and join | R0/R1 (TypeScript); R0 (Go) | **Archived** 2026-08-15 at `archive/pre-estate-focus`; was Claimed at R0 in both languages and R1 in TypeScript | the tag; section below kept as record |
| Schema identity | interim law only | **Interim**; the owned encoding is ticket 004 | [proto/wire/fixtures/](proto/wire/fixtures/) |
| RFC 8785 canonical JSON | R1 differential | **Claimed** for the stated corpus and its generated sample | [fixtures/jcs-rfc8785.json](fixtures/jcs-rfc8785.json), [packages/core/test/jcs.differential.test.ts](packages/core/test/jcs.differential.test.ts), [go/canonical/differential_fuzz_test.go](go/canonical/differential_fuzz_test.go) |
| Plait spine (envelope identity + local NATS round trip + error-channel refusals with the barrel-derived conformance gate) | R0 differential + R1 + executable integration | **Claimed** for the four-row generated envelope corpus on one file-backed `nats-server v2.14.4`, R=1; bounds in the section below | [packages/plait/](packages/plait/), [go/cmd/plaitwall/](go/cmd/plaitwall/) |
| Plait kernel admission door (model-emitted vectors → one generated-schema door → CLI/carriage/daemon routes) | R0 differential + executable no-bypass control | **Claimed** for the committed admission corpus and the three host surfaces; refusal parity and bounds in the section below. The program-run composition the carriage walks is proved MODEL-SIDE only (KM-4 family: `run_composition`, `run_admitted_sequence`, `run_refusal_decomposition`, `run_tail_unjudged`, `run_context_grows`, `run_landed_closed`, with the `drop-run-tail-halt` and `drop-run-prefix-standing` controls) — no correspondence gate ties it to the carriage, and none is claimed | [packages/plait/src/kernel/KernelDoor.ts](packages/plait/src/kernel/KernelDoor.ts), [packages/plait/test/KernelDoor.routes.test.ts](packages/plait/test/KernelDoor.routes.test.ts), [verify/kernel/](verify/kernel/) |
| Tracer conformance (W1–W10; flb.protocol.v0 session laws) | R0/R1 | **Claimed**, single daemon | [proto/](proto/) |
| Refusal projection walls (W-COHERENCE, W-SCOPE) | R2 (TLC) + model-level R5 (Lean) | **Claimed** for the repaired rule; the union-refusal mislocation it refutes is **fixed and merged** on `main` (`ab77d6bfc`) — the TLC controls now stand as regression guards over the historical constructor | [verify/implication/](verify/implication/) |
| IR denotational laws (brand/check invisibility, union extensionality, sort-invariance, resolver monotonicity, C5 round trip) | model-level R5 (Lean) | **Claimed** at the model level; code-model correspondence unproved | [verify/ir/](verify/ir/) |
| E2 move calculus (D85 confluence package: strong no-loss, wire confluence, schedule-free fences, refusal characterization, WF preservation, stability, resolute-choice impossibility) | model-level R5 (Lean) | **Claimed** over an arbitrary fixed finite hole carrier: fills are total under repair, every fill's holder-attributed pair survives into terminal journal evidence with no refusal disjunct, and the total runner's terminal state — meaning and journal both — is invariant under permutation of any fill/dispute bag; refusal is an iff against the frozen `D85Refusal`; discharged against a sha256-pinned frozen spec with kill-checked mutants. Decide-bearing bags are order-sensitive by design (decide enters only through the fence at close); conflict coverage is two fills for legacy theorems; single journal, no crash/CAS/liveness, attack/revision model, or code-model correspondence; IC4 framing reclassified pending disposition ([audit](docs/research/2026-08-15-model-audit-findings.md)). Identification (ruled 2026-08-17): a CvRDT of holder-attributed observations over an op-shaped wire — arbitration is a declared constant of the protocol value, not a function of the execution (cf. Burckhardt et al., POPL 2014, whose verified implementations recompute arbitration from run-time timestamps), which is why no clocks are needed to compute it; the declared close authority (D104) is the coordination point CALM requires for the one non-monotone act — fence determinism quantifies over runs of the same bag, never over parties who saw different bags. Bound, previously unwritten: self-supersession is inexpressible — with no causal metadata, a holder's correction of its own fill is indistinguishable from a two-party disagreement (the MV-register pays version vectors for the converse trade: this calculus is better on provenance, worse on supersession; the successor-round revision mode is the protocol-level compensation) | [verify/moves/](verify/moves/) |
| TS move-calculus kernel ≡ Lean model | R0 differential + R1 | **Claimed** for the generated 2000-vector corpus and the property sample: the `@foldlab/moves` kernel replays every model-emitted vector byte-identically (receipts, reversed bags, fences, journal evidence included), five planted mutants each die against the corpus, and the frozen-spec laws re-run as fast-check properties. Agreement is evidence, not proof; the corpus is randomized, not exhaustive; not the DEV-670 daemon wall | [packages/moves/](packages/moves/), [verify/moves/Main.lean](verify/moves/Main.lean) |
| Plait fabric algebra (F1 ACI cell merge, extensionality, and history-level convergence — `f1_cell_extensional` and `f1_history_convergence` as distinct halves; F2 permutation+duplication invariance; F2b successor-discipline once-only application under the named premise halves `WindowCoverage` and `PositionPayloadIntegrity`; F3 anchored resumption; F4 partition merge for the commutative class, bridged to the step fold whose step merges each operation's contribution; F7 assembly determinism in three statements — declared-reads congruence, volatility-stable order, and the within-class half `F7WithinClassOrder`, under which class projection plus per-class subsequences determine the assembled list; F11 query determinism in three layers — state-of-anchor, `f11_topk_of_support` over raw arrival lists under `SameDeliveredSet` with the named `IdentityDistinct` premise, and composed render invariance; F12 fenced resolution over the new directory carrier — the graph of `Map Petname (FiniteSet Digest)` under componentwise union, with its own F1-for-maps ACI/extensionality/convergence package and the componentwise reading proved (`directory_merge_bindings`); `resolve` computes the greatest observed fencing token over raw seal data with `SealsWellFenced` carried as a named premise, `f12_resolution_of_support` and `f12_greatest_seal_wins` under the premise — whose uniqueness clause, any observed seal at the top token is the top seal, is exactly what the premise buys — and the four-verdict characterization `f12_resolution_characterization` in the refusal-iff idiom; F10 trigger robustness — the closed five-production predicate grammar as an inductive with absence/negation/deadline unrepresentable by construction, `f10_stability` in reached-at-least form over the componentwise fabric order, `f10_hints_of_support` riding `SameDeliveredSet`, and hint monotonicity (`enabled_declarations_monotone`); the join-semilattice package proved once from ACI (`join_semilattice_of_aci`, the `SemilatticeSup.mk'` shape under the derived order `supLe`) and instantiated at both lattice carriers, `cell_absorb_inflationary` the replica lower bound; C7 pin well-foundedness (`c7_pin_well_founded`) under the inductive admission order; the compaction corollary `compact_below_floor_preserves_resumption` with its minimum-floor horizon form; F9 policy meet-attenuation over the ten-component carrier, `indexes`/`resources` allowlists included; `guard_is_redundant` documenting the removed floor guard) | model-level R5 (Lean) | **Claimed** at the model level: zero-dependency package at v4.33.0, 206 rostered theorems (the M3 growth past the plan's 95–115 estimate is the join-semilattice package and six new controls' retained-side and instance surface, scope the plan predated), footprint inside `{propext, Classical.choice, Quot.sound}`, with the private/protected theorem set pinned by name in the gate; the conformance corpus is emitted by the model and regeneration byte-diffs in the gate (sha256 `5f26614e…`), carrying 27 rows including the four durable-fold families (the F3∘F2b resume-then-redeliver composition emitted as kind `F3-F2b`, ahead-of-ceiling arrival, multi-gap window, redeliver-everything-twice-shuffled), the F7 assembly pair, the F11 query pair (top-K across arrival orders; query at re-anchored state), the undeclared-seed admission refusal (`F11-undeclared-ambient-input`), the five-row F12 resolution family — absent, singleton-bound, ambiguity across bind orders, greatest seal across seal orders, and the stale-token rebind row whose seal history cites the Veil register corpus vintage (`packages/plait/fixtures/register-traces.ndjson`, 15 rows, sha256 `376503be…`) — and the two-row F10 trigger family (stability under growth exhibiting all five productions firing; hints across arrival orders), and every verdict comparison's operands are the witness theorem's own terms — a row constructor applied to a theorem whose statement differs fails to elaborate; the ACI mutants each drop one algebraic law, die on their named vectors, and provably retain the remaining ACI laws, while the successor-discipline, payload-integrity, and meet-clamping mutants die on their named vectors and provably agree with the lawful consumer over their non-mutated domains — the payload-integrity control drops one premise half on the `(11,2)/(11,999)/(12,3)` conflict row with window coverage provably retained and the last-write consumer dying on it (`drop-successor-discipline` included — the floor-guard control is unstatable, `guard_is_redundant` is the proof, deviation recorded in the package DECISIONS) — and the five M2 controls each die on their named vectors with retained-side theorems: declared-reads, volatility-order, identity-tiebreak, schedule-independence (rebuilt as a score boost inside the declared sort, so its kill is attributable to consulting the thread alone — at the empty thread it is definitionally the lawful `topK`), and within-class order, whose mutant is the review round's rival assembler (reverses each class block, satisfies both prior F7 halves at every program, moves bytes) shipped as the tenth control. Bounds: F2b's premise is the two named halves — complete window coverage and position-payload integrity, machine-checked exactly equal in strength to the bundled premise they replaced — arbitrary reordering without that discipline is out of scope by statement; F11's list-level half is bounded by its named premises — `SameDeliveredSet` and `IdentityDistinct`, and dropping distinctness makes equal-score entries order-ambiguous and the law false, machine-checked, so the premise is load-bearing, never decorative; query-input purity is admission closure, not a quantifier — the `QueryAlgebra` carrier cannot express an ambient read, the declared-seed form is admitted as data, and admissibility is never defined as "equal inputs give equal results" (that would smuggle the conclusion into the premise); F12's `SealsWellFenced` premise — every observed token names at most one seal — is discharged by citation of the Veil register package's F5 invariants I1/I2 (`verify/fabric-veil`, Lean 4.28.0; the ruled toolchain split makes import impossible and restatement is refused as drift risk), the citation living in this row, the package README, and the stale-rebind row's provenance field, never as a 4.33 theorem; the F12 verdict characterization is computation accounting over the arrival schedule, deliberately premise-free — without `SealsWellFenced` a tied top token resolves to the fold's first-kept pick, visibly schedule-dependent, and the drop-seals-well-fenced control exhibits it — while the order-free meaning law is `f12_greatest_seal_wins` under the premise; the model resolves a snapshot pair — a directory state and an observed seal history — and how a runtime obtains a coherent snapshot of the two planes is the consuming slice's harness question, stated in its row, not covered here, with rebind-authority enforcement server-side runtime, not covered; C7's acyclicity is well-foundedness of the pin relation under the inductive admission order, with digest freshness the in-model reading of content addressing — that a real digest cycle would require a SHA-256 preimage stays in the trusted base; F10 claims stability and hint-support determinism only — eventual evaluation of enabled triggers is liveness and carries no claim, deadlines stay a fenced session act outside the grammar, landed-claim uniqueness for fired hints is F5's I2 cited never restated, and the hole component's order is the epistemic high-water reading with runtime monotonicity of real hole evolution the projection lane's question; the compaction corollary is stated boundary-inclusive (`upTo ≤ floor`), so the ruled strictly-below-the-horizon refusal boundary is licensed with margin, and `Retention.horizon` plus the compaction-past-horizon refusal cite `compact_below_floor_preserves_resumption` by name when the retention slice lands; runtime correspondence is now partial — the required battery's fold wall consumes the four E4 families per-family, row-for-row (unknown rows inside a consumed family fatal; the F7/F11/F10/F12 families report as unfamiliar, never fatal, until their slices' walls land), while the full gate stays the Lean CI lane; no F5/F6, no crash/CAS/leases here (F5 is the Veil-package slice), no liveness anywhere | [verify/fabric/](verify/fabric/) |
| Create-pipeline snapshot law | R2 (TLC) | **Claimed** for the snapshot rule; the head-read defect it refutes is **fixed and merged** on `main` (`3aebd2ba9`) — the shipped control is now a regression guard; orphan-fact crash residual model-checked (quiescence-guarded) | [verify/pipeline/](verify/pipeline/) |
| Plait register (F5: token monotonicity, at-most-one-landed-commit, no stale-token landing) | R3 + replay wall (R4 RESERVED at the 15,378-schedule bar) | **Claimed** — re-earns the archived effector claims with the evidence in-tree; bounds in the section below | [verify/fabric-veil/](verify/fabric-veil/), [packages/plait/](packages/plait/), [go/register/](go/register/) |
| Plait durable fold (E4: anchor-guarded, crash-indifferent lane consumption — `Folds.deploy`, `Lane`/`Algebra`/`Anchor`, the positioned pump) | runtime, corpus-walled + chaos | **Claimed** at the runtime level (merged PR #83 @6bae7007b after adversarial review + nine-charge round-2 + confirm): one stream per declared `(lane, partition)` so stream sequence IS the F2b position by construction (the DEV712-POS-1 ruling); the pump applies only at the contiguous frontier and its discipline was byte-matched to the model's `ingestDelivery`/`applySuccessors` under direct probing; acks advance only after the covering anchor CAS lands (acked ⊆ anchored — both violation plants drew red, and the committed ack-before-anchor process control proves the class); a lost anchor CAS is a fatal detach, never a retry (the three-way CAS sentence: joins retry, registers reconcile by read-back, anchors detach); the F4 `Commutative` brand is earned at the door by a derived suite (≥32 distinct triples drawn from the algebra's own digest; degenerate hand-built suites refused — planted four ways); the required battery's fold wall consumes the four E4 corpus families per-family, row-for-row (11/11, unknown-in-family fatal, unfamiliar families reported never fatal); chaos gates executed on Windows and ubuntu CI: hard-kill/resume (SIGKILL/TerminateProcess) and real NAK redelivery, verdicts by terminal state-digest equality against independently computed references, with neutered-kill and neutered-NAK plants drawing red; all 15 new refusal kinds trigger from their owning seams with taught repairs (`fold-buffer-overflow` carries a recorded untriggerable-exemption argument); the `plait chaos` CLI is absorbed in-slice (measurement-only verdicts citing law names and the corpus sha). Bounds: no liveness and no exactly-once vocabulary anywhere — correctness is the successor discipline, the dedup window is bandwidth; buffer and in-flight bounds are flow control with no correctness stake (the Effect-side queue stays unbounded by the ruled pin argument — every bounded callback strategy drops under a sync unsafe offer, occupancy bounded by `max_ack_pending` through ack-after-anchor); the incarnation pin remains a recorded deferral now spanning three buckets (`flb-fab-reg`/`flb-fab-anchor`/`flb-fab-cell`); defect-vs-absence transport classification is a pending disposition (T-C); commons hard cutover — an existing three-subject dev stream refuses `substrate-shape` until reshaped | [packages/plait/](packages/plait/) |
| Plait contexts, runtime half (E6: `Cell` + the merge-write loop, `Catalog`/`Blobs` stores, `ResolvedOf`, `ContextProgram` shapes) | runtime, walled (R0 differential + executable integration) | **Claimed** at the runtime level (merged PR #81 @2b28d9efb after adversarial review + twice-delivered round-2 + five-HOLD confirm): the cell write path is merge-then-`update(rev)` over the ruled `flb-fab-cell` bucket, bounded at 8 attempts with exhaustion a typed absence refusal (`cell-update-contended`), reconciled by read-back subsumption before classification; the T16 subsumption boundary is walled by two discriminating rows with a byte-compared executed trace (8/8 CAS attempts, lawful `converged` vs mutant `exhausted`, identical final digest `35e68e88…`) — the boundary claim was independently re-plantable and its own prior overclaim is retracted in the record; both cell mutants derive from the shipped service through the one named `MergeDiscipline` seam; verify-on-read lives at `Resolved.resolve` (re-derivation unskippable) with the store services deliberately unverified beneath it (T18) and no durable layer claimed (T19 — both stores say so in their types' documentation); `decodeRefusing` is the one public schema-issue door at `<T,E,RD,RE>`; `ContextProgram` ships declaration shapes and an order with no assembly executor and NO F7 claim. Bounds: all claims within a fixed backing-stream incarnation; the loop's attempt bound is flow control (completion not claimed); absence refusals are head-relative, never global; the M3 semilattice package (`cell_absorb_inflationary`, `cell_le_iff_subset`) is the model-side license the adoption wave's replica work cites — the runtime replica and watch surface remain unbuilt; DEV-731's ninth substrate suite licenses a future watch feed only as advisory, with no absence inference and no use of `KvWatchEntry.isUpdate` as an initial/live boundary | [packages/plait/](packages/plait/) |
| Substrate assumptions gate (subject CAS with global-sequence cursors; KV revision lifecycle; CAS-before-dedup precedence; delivery-interleaving witnesses; work-queue shape; application ACL across protected publish subjects and the witnessed `$JS.API` stream delete/purge/update scope, retention mutation included, with the `DenyDelete` seal pinned server-immutable; Linux SIGKILL process recovery, both sync modes, witnessed in CI; TS client parity with the wrong-last-sequence refusals pinned wire-indistinguishable at the client pin; KV watch replay/coalescing, ordering, tombstones, resume, and reconnect; object-store put/get integrity, chunk boundaries, delete, and metadata stability) | executable integration | **Claimed** for the pinned envelope (single node, R=1, file storage, `nats-server v2.14.4` / `nats.go v1.53.1` / `@nats-io/* 3.4.0`): operation-context classification is a client-side convention layered on the pinned indistinguishable wire, never a wire-derived fact; default KV watch replay coalesces pre-watch history to the latest value per key and delivered those values in bucket-global revision order — a three-key replay whose order rules out both alphabetical and first-write order; one connected 32-write burst with all puts in flight together delivered every PUT in revision order with nothing coalesced, the revision-to-value expectation derived from the server's own assignment; DEL/PURGE markers delivered with empty payloads; `resumeFromRevision` is inclusive and bucket-global; one forced 750 ms same-server reconnect delivered all three in-gap writes to one key, in order, before the post-reconnect write. FINDING-DEV731-WATCH-INITIAL-001: `isUpdate` does not separate replay from live — the last (or only) initial entry is `true`. The object store round-trips bytes unchanged with a client-computed `SHA-256=`-prefixed digest an independent Node `crypto` derivation reproduces, chunks at ⌈size ÷ max_chunk_size⌉ (default 131072, echoed in the object's metadata, overridable per put), delivers one stored chunk per read, purges chunk messages on delete while leaving one rolled-up tombstone (`deleted: true`, `size: 0`, `chunks: 0`, empty digest, `nuid`/`mtime` retained, revision advanced) that `get` answers `null` for and `list` omits, and mints a fresh `nuid` and a fresh revision on every put of a name — identical bytes included, so there is no content dedup — with the revision being the backing stream's meta-message sequence that `previousRevision` fences on (a stale one refused `wrong last sequence`); `mtime` is recomputed by the client on every put and observed nondecreasing, and is NOT a freshness oracle — it is `new Date().toISOString()` at millisecond resolution, so two puts inside one millisecond carry the same string. FINDING-DEV730-OBJ-RANGED-001: the pinned client exposes NO ranged read (enumerated surface; `get`/`getBlob` are arity-1; `ObjectResult` is `{info, error, data}`), and the only partial read — cancelling the whole-object stream — is unverified, because the digest covers the whole object and is checked at the last chunk; an injected chunk left size/chunks/digest unchanged in metadata, `getBlob` refused `received a corrupt object`, and the reader was handed all 131072/131072/3 bytes before that refusal. FINDING-DEV730-OBJ-SHAPE-003: `ObjectResult.error` resolves `undefined` on non-empty success (`null` only for zero-size) and `list()` entries carry no `revision`. Bounds: the burst is not a losslessness theorem; reconnect did not restart the server; watch is advisory and silence never proves absence; process-crash recovery only, never power loss; no clustering; five sizes and one tamper class, not theorems over all sizes or all corruptions; no Plait code correspondence — the gate corroborates the substrate contract the design consumes, and no blob surface exists to correspond with | [go/substrate/](go/substrate/), [packages/plait/test/SubstrateParity.test.ts](packages/plait/test/SubstrateParity.test.ts), [packages/plait/test/KVWatchSemantics.test.ts](packages/plait/test/KVWatchSemantics.test.ts), [packages/plait/test/ObjectStoreSemantics.test.ts](packages/plait/test/ObjectStoreSemantics.test.ts), [watch finding](docs/findings/2026-08-18-dev-731-kv-watch-semantics.md), [object-store finding](docs/findings/2026-08-18-dev-730-object-store-semantics.md) |
| Workflow replay soundness (determinacy, schedule irrelevance, replay = execution) | model-level R5 (Lean) + R2 (TLC protocol) | **Archived** 2026-08-15 at `archive/pre-estate-focus`; was Claimed for static DAGs with deterministic bindings, faithless runner refuted in both instruments | the tag; section below kept as record |

## The Plait register (F5) — R3 + replay wall

**Claim.** F5 — lease-register fencing safety and unique terminal
outcome: token monotonicity with strict grant/steal increase (I1) and
at-most-one-landed-commit with no stale-token landing (I2),
machine-checked as inductive invariants of the five-action Veil module
`Register` (`verify/fabric-veil`, Lean 4.28.0, Veil `300c305e`), and
carried onto the real substrate by a replay wall: the TS `Registers`
service and the fresh Go twin `go/register` replay all 15
model-exported rows over real NATS KV revision CAS — one fresh server
(one backing-stream incarnation) per row in both runtimes — with
verdict, law-name, and observed-state equality and zero skips. This
slice formally RE-EARNS the effector claims archived at the 2026-08-15
estate purge — fencing safety and unique terminal outcome, whose proof
artifacts were never shipped — with the evidence in-tree this time. The
rung stamp is R3 plus the replay wall; **R4 stays RESERVED at the
15,378-schedule bar**, and no R4 language attaches until a lockstep run
at that bar exists.

**Evidence.** The inductive invariant is kernel-checked through
reconstructed SMT proofs with `veil.smt.trust=false`, enforced by
artifact: all 36 generated verification-condition theorems (six
procedures × six invariant clauses) are landed by `#gen_theorems`,
rostered in `theorem-roster.txt`, and their kernel axiom footprints are
censused in-build to `{propext, Classical.choice, Quot.sound}` —
`sorryAx` in any rostered footprint is a failed build, and the
committed trusted-mode control shows the same census refusing a
genuinely trusted discharge at the load-bearing `#gen_spec` site. Every
exported corpus row — prefix steps and attempt — is verified executably
against the module's generated transition relation at export time
(`FabricVeil/Bridge.lean`): 15 rows checked row-by-row against the
generated relation — checked, not trusted. The model-level negative
controls are executed mutants whose violating states are computed by
running them, with their model-side refutations executed against the
generated relation; the runtime control is the real commit path minus
its token guard, killed on the live bucket with its executed trace
committed and byte-compared. Both walls exercise the real CAS laws with
the frozen classification asserted (400/10071 by operation context,
read-back reconciliation for ambiguous outcomes), audit retained
history per row, and pass the heterogeneous crash-steal schedule. The
finite 66-state model check is falsification evidence, never a proof
substitute.

**Bounds and residuals.** SAFETY ONLY — no liveness, fair-retry, or
lease-progress claim; heartbeats and deadlines are liveness machinery
carrying no claims. At-most-one landed OUTCOME is not at-most-one
external side effect: an external call may fire and then fail to land
its outcome — the register bounds landings, never attempts (ruled G23;
this sentence rides every action-consuming claim). Non-clustered R=1, single node, local pinned
nats-server v2.14.4. Per-work-digest registers with no cross-register
claim. Every runtime claim holds within one backing-stream
incarnation. The TS runtime now ENFORCES that bound rather than
assuming it (DEV-779, `packages/plait/DECISIONS.md` Task DEV-779,
discharging the T6 deferral): the backing stream's creation time is
pinned at open and re-asserted ahead of every action, so a fence minted
under a destroyed bucket refuses `incarnation-mismatch` — ahead of any
staleness comparison — with a live chaos wall that deletes and recreates
the bucket mid-claim and shows the raw substrate accepting the same
stale token the pin refused. Residuals stated rather than closed: the
pin is a precondition, not a two-phase commit, so a rebirth landing
between the assertion and the CAS is a one-round-trip window no
client-side check can close; two incarnations created inside one
microsecond would carry the same creation time; the GO twin carries no
pin, so its bound sentence is unchanged; and the cell and anchor stores
are argued exempt (T6/T7 of that task), not pinned. Administrative
lifecycle mutation is still outside the credential guard — the DEV-716
ACL suite is the other half of the guard; epoch-bearing tokens are ruled
out for v0. The corpus↔model bridge checks the exported rows
at one finite interpreted instance; the invariants are proved for all
instances. Trusted base: cvc5 with proof reconstruction, the corpus
serializer with its name tables, the exporter binary, the bridge's
instance choice, SHA-256, Lean/compiler, runtime decoders, and the
substrate contract as probed.

**Checkable at.** `bash verify/fabric-veil/run.sh`; `bun run gates`;
`go test ./register/...`; PR #74 (CI green on ubuntu: gates,
fabric-veil-gate, lean-gates, negative-controls).

## The effector (commitment register) — R3 + R4

> **ARCHIVED 2026-08-15; RE-EARNED 2026-08-17.** The claims below are
> formally re-earned by the Plait register slice (section above) with
> the evidence in-tree. The archived entry is kept as the historical
> record of the purge.
> The running code and tests named below left
> the working tree in the estate-focus purge and are intact at tag
> `archive/pre-estate-focus`
> ([manifest](docs/research/2026-08-15-estate-focus-retirement.md)).
> This checkout no longer asserts the claim; the entry is kept as the
> record of what was established and its bounds, checkable at the tag.

### Claim

Fencing safety (no commit lands below the highest linearized fence)
and unique terminal outcome, for the register
`Absent | Claim(fence, owner, lease) | Done(fence, result)`.

### Evidence

- Apalache inductive invariant, unbounded in fences and interleaving
  depth. Bounded at 3 and 4 owners.
- The identity-free variant: safety survives deleting every
  process-identity clause, including one identity running concurrent
  workers.
- TLC exhaustive at generation caps 2/3/4, matching independent Go and
  TypeScript bounded checkers state-for-state:

  | Generation cap | States |
  | --- | --- |
  | 2 | 584 |
  | 3 | 2,312 |
  | 4 | 6,848 |

- R4: 15,378 schedules replayed in lockstep against the Go
  implementation on embedded NATS. Harness sensitivity: 828/828
  deliberately corrupted schedules detected.

### Bounds and residuals

- The identity-free variant is the generalization argument for
  arbitrary owner counts; it is an argument, not an N-owner proof
  (ticket 013).
- The R4 sample rides on top of the exhaustive small-scope core; the
  count is the bridge to the binary, not the proof.
- Gap, being closed: the proof artifacts live in `.reference/`, an
  untracked predecessor repository that is absent from this checkout,
  so the public repository asserts this claim without shipping its
  evidence. Ticket 013 ports the specs, configs, and counterexample
  files into `verify/effector/`.

### Checkable at

[go/effector/](go/effector/) — the running code and its tests, until
ticket 013 lands the proof artifacts.

## Catalog + ingress — R2 + R4; R3 in re-proof at repaired bounds

### Claim

| Invariant | What it asserts |
| --- | --- |
| No admission on faith | every admitted frame's type digest was committed before admission |
| Convergence | equal bytes yield one fact per authority journal, any interleaving, any daemon |
| Resolution monotonicity | the resolvable set never shrinks |
| Mirror integrity | a replica holds only a prefix of its origin |

### Evidence

- R2: TLC 2.19, bounds 2 daemons / 3 values / 2 creators / data cap 2:
  12,707,989 distinct states to closure, depth 24. All four invariants
  held. Four sabotaged variants were each refuted; traces committed:

  | Sabotaged variant | Refuted at depth |
  | --- | --- |
  | blind ingress | 2 |
  | asserted identity | 3 |
  | forged mirror | 4 |
  | resetting mirror | 5 |

  The model rejects any configured daemon, creator, or value-domain size
  outside `1..4` before state generation. Three independent overrun configs
  are part of the gate, and the natural catalog bound is checked against
  `Cardinality(Vals)`, the domain actually explored.

- **R4 against the coarsened wire refinement (CreateAtomic); the
  split-CAS branch's conformance is discharged AT MODEL LEVEL by the
  journal gate** (`verify/journal/JournalCatalog.tla`, entry below) and
  is still owed at R4 against the running journal API. TLC
  checked that every coarse atomic create is a legal uninterrupted
  split Begin;Finish trace (or the resolving Begin's stutter) at the R2
  domains: 281,269 distinct wire states to closure, depth 17. The
  faithless bridge control violated `AtomicRefinement` at depth 2.
  This is the named map by which the split model's R3 safety transfers
  to the public wire model.
- R4 binary evidence: three directed schedules plus 128 deterministic
  depth-24 uniform random walks, 131 schedules / 3,079 steps total,
  replayed against fresh real protod instances over embedded NATS with
  **zero divergences**. Before that honest run, the tagged
  asserted-identity daemon was caught and **131/131** corrupted
  expected-state schedules diverged. Coverage: 1,077 raw model states
  (0.008474984% of the 12,707,989-state R2 closure), 3/3 coarse action
  disjuncts, 5/5 semantic branches.

### Bounds and residuals

- R3 — IN RE-PROOF, claim held (external review C4, 2026-08-13): the
  original run's induction hypothesis was generated at catalog `Gen(2)`
  while reachable IndInv states have catalog length 3, so consecution
  and action safety were discharged over a strict subset; the
  state-safety obligation was additionally a tautology (now a labeled
  drift tripwire). The R4 merge also briefly broke Apalache
  re-checkability (untyped accessors; FINDING-R3-001) — repaired with
  certified-inert type annotations, so the obligations run at HEAD
  again. The repaired hypothesis (catalog `Gen(3)` = the exact natural
  maximum; mirror/creators above theirs; data at a written cutoff
  argument with an empirical insensitivity control) is committed in
  `CatalogInd.tla` with its bounds stated as part of the claim;
  obligations 1 (base) re-verified NoError; consecution and action
  safety plus both negative controls are re-running on two platforms
  (macOS at the argued bounds, Windows independently at wider bounds).
  This entry upgrades to a claim only when those verdicts land. The
  wire-refinement transfer above inherits this status until the
  re-proof lands.
- Specificity caveat on the R2 controls (external review,
  FINDING-R3-EVIDENCE-002): the forged-mirror trace violates two other
  laws besides the one checked, so "exactly its dropped law" is not yet
  licensed for every control; per-clause controls are in flight on the
  hardening lane. A bounded check certifies only its bounds.
- Bound honesty: the R2 and R3 configurations are inside the model's explicit
  `1..4` daemon/creator/value ceilings. Widening a claim past those ceilings
  requires widening the literal domains; merely raising a config constant is
  mechanically rejected.
- Bridge instrument note (FINDING-BRIDGE-001, disposition
  operator-ratified): the action property can only check the CREATING
  half — `[][_]_vars` discharges stuttering steps, so the resolving
  half is checked by the state invariant `ResolvingCreateAgrees`
  (sensitivity control: a stutter-faking create result, caught at depth
  2). The binary lockstep layer was never affected: both no-op branches
  are driven in the corpus with post-state comparison.
- Model abstractions, stated: digests are modeled as the identity
  function on values (content addressing plus the collision-resistance
  assumption below); the harness maps those values to real derived
  digests. The resolve index is a definition (a pure fold of the
  journal); R4 samples that abstraction against state extracted through
  the narrow writ — the client's three-verb capability set (read /
  publish / request).
- R4's `MirrorAdvance` is a named re-create-and-project substitute
  while replica roles are unbuilt. It exercises derivation and union
  resolution, but not ADR-0009 origin-position copy, prefix
  preservation, replica read-only enforcement, lag transport, or
  authority/mirror separation.

### Checkable at

[verify/catalog/](verify/catalog/) (spec, configs, counterexample
traces, run record) and [proto/go/catalogr4/](proto/go/catalogr4/)
(executable oracle and driver).

## Journal and chain walls — R0/R1 (runtime); the model gate is the entry below

> **PARTIALLY ARCHIVED 2026-08-15.** The journal half (CAS-append,
> verify-on-read, `go/journal/` and its black-box tests) remains in
> the tree and in the gate battery; its claim stands. The chain-wall
> half — `src/stream.ts` ≡ `go/stream` over `fixtures/stream-wall.json`
> and everything downstream of it — is archived at
> `archive/pre-estate-focus` and no longer asserted by this checkout.

### Claim

TypeScript and Go implementations of the stream algebra take equal
inputs to byte-identical digests; the journal's verify-on-read detects
tampering. The daemon read path is the per-message JetStream management API,
pipelined in a bounded window and verify-on-read folded strictly in sequence
order; it does not enable the direct-get surface.

### Evidence

- R0: frozen fixture walls ([fixtures/](fixtures/)), generated once by
  the Go side, recomputed by both sides forever.
- R1: property and fuzz tests ([go/stream/](go/stream/)).
- R1: journal cursor controls reject forged genesis, tail, and future anchors
  against stored entries, including a causal append-after-refusal check
  ([go/journal/read_cursor_verification_test.go](go/journal/read_cursor_verification_test.go)).
- R1: the public TypeScript reader rejects an evidence-free cursor against a
  real daemon and rejects valid-other-journal plus invalid-journal reply
  substitutions over an independent real NATS responder. The stdio MCP wall
  requires the same locally verified cursor and excludes the raw daemon head
  ([proto/ts/test/client-read-verification.test.ts](proto/ts/test/client-read-verification.test.ts),
  [proto/ts/test/mcp.test.ts](proto/ts/test/mcp.test.ts)).
- R0: the Effect Schema transport wall consumes four live Go-origin
  rows: two non-ASCII text payloads reproduce the Go-computed heads,
  while raw `ff` and `fe` payloads have distinct Go heads and both
  refuse as typed schema failures instead of decoding to U+FFFD.
- Empirical crash evidence: fleet runs under kill-9 storms and cold
  restarts with independently verifiable bundles
  ([docs/gauntlet/](docs/gauntlet/)).
- The retained sequential read and bounded pipelined read return identical
  entries, entry digests, and cursor over the frozen conformance corpus
  (`go/journal/hardening_internal_test.go`). Count-10 before/after throughput
  and the durability price are recorded in
  `docs/bench/2026-08-13-task-19-nats-hardening.md`.

### Bounds and residuals

- Divergence probes are owed per ADR-0007 where domains exceed the
  fixtures.
- The schema wall's text face is deliberately narrower than canonical
  stream events: stream events carry arbitrary payload bytes, while
  `WireEvent` admits Unicode-scalar UTF-8 text only, within the
  canonical u16/u32 field lengths and JavaScript's safe sequence range.
  The live corpus is four directed rows, not an exhaustive UTF-8 proof.
- FINDING, reported and not repaired: the pinned runtime's fatal
  `TextDecoder` strips a leading UTF-8 BOM by default, so Go-origin
  payload bytes `ef bb bf` and empty bytes have distinct Go heads but
  decode to the same `WireEvent`. The opt-in red witness and choices
  are in `packages/core/FINDING-SCHEMA-BOM-001.md`.
- The journal now has a dedicated model of CAS-append, verify-on-read,
  head adoption, and crash recovery — see the entry below. It is a
  bounded model check with no proved correspondence to this code: the
  claims here and the claims there do not transfer to each other.
- The new read controls cover one embedded, file-backed daemon and two exact
  attribution corruptions; they do not claim remote-silence diagnosis or
  multi-daemon journal ownership.
- G1's exported bundles prove record consistency, not that the recorded kills
  physically happened. Storm truth is attested by the coordinator's
  in-concert observation, and the fencing evidence assumes effect bodies write
  their ledger line before returning.
- G1 covers one choreographed schedule family: exactly 25 kills, 25 steals,
  25 duplicates, and 5 restarts per final bundle, timed at the hardest crash
  window. It does not establish stochastic-schedule, partition, or clustered
  behavior.
- `crash-durable` acknowledgements cover process/kill-9 failure: acknowledged
  bytes may still be only in kernel buffers, and the pinned server's failsafe
  sync is approximately two minutes. Pull-the-plug/power loss is explicitly
  **not covered**. `power-durable` sets pinned `server.Options.SyncAlways` and
  pays the measured synchronous-write price in the benchmark record above.
- JetStream API internal-queue overflow can still drop requests without an
  error reply. The broker warning is no longer suppressed: protod logs it with
  a monotone `ipq_drops_total`, but that is post-loss evidence, not recovery.
  Operators must collect stderr. The listener impersonation residual is
  discharged for the embedded daemon: every TCP client authenticates with a
  fresh per-Acquire application credential and receives a private NATS account,
  while the distinct in-process credential remains internal.

### Checkable at

[fixtures/](fixtures/), [go/stream/](go/stream/),
[packages/core/test/schema.wall.test.ts](packages/core/test/schema.wall.test.ts), and
[go/journal/hardening_internal_test.go](go/journal/hardening_internal_test.go),
[go/effector/hardening_internal_test.go](go/effector/hardening_internal_test.go),
[proto/go/protod/hardening_test.go](proto/go/protod/hardening_test.go),
[the Task 19 benchmark record](docs/bench/2026-08-13-task-19-nats-hardening.md),
and [docs/gauntlet/](docs/gauntlet/).

## Journal model gate — R2 (TLC), with the refinement into the catalog model

### Claim

At the bounds stated below and nowhere else, the hash-chained journal's
five laws hold to closure: the chain never forks at a sequence number
(given no appender holds a snapshot storage has since rewritten under
it); an append linearizes exactly once at its expected position or
conflicts and appends nothing, and the verdict it reports is what
storage actually did; a verify-on-read fold over any prefix reproduces
that prefix's stored head or reports tamper at the first bad position;
every head a handle adopts was licensed by the one stored-entry
verifier that open, verified read, and post-conflict resync all share
(the D60 one-verifier law); and reopening after a crash re-derives the
head from durable storage rather than remembering it.

Composed into the catalog model as a **refinement**: over the restricted
create path — resolve-check, then the journal's expected-position
snapshot, then the CAS — every step is the catalog step it claims to be,
converging creates really do stutter, and the catalog's eight ratified
laws hold over the abstraction. The **split-CAS conformance obligation**
received from `verify/catalog/R4-FINDING-001.md` is discharged at model
level by the negative control that drops the expected-position guard and
kills the refinement on exactly the schedule that finding recorded.

### Evidence

`bash verify/journal/run.sh` — fourteen verdicts, all required together.

- Four clean closures. Race config (2 appenders, 2 payloads, positions
  0–2, no adversary, no crash): 2,845 states generated / 1,077 distinct
  / depth 10, asserted exactly by the gate as its cross-version canary.
  Adversary config (one single-field corruption of one stored record per
  behaviour): 86,729 / 32,225 / depth 14. Crash config (positions 0–1,
  one crash event per behaviour — a lost acknowledgement at the commit
  point, or a reopen): 3,559 / 1,146 / depth 9. Refinement config
  (2 creators, 2 values, positions 0–2): 249 / 91 / depth 9, driving all
  three CAS outcomes (40 stored, 16 duplicate, 12 conflict).
- Three bound guards, each rejected on its own `ASSUME` before any state
  is generated, so no config can silently check a truncated domain.
- Seven negative controls, each refuted on exactly the law it dropped,
  traces committed beside their configs: no-CAS against the chain law
  (depth 5), optimistic outcome against the append law (5), trusting
  read against tamper evidence (4), unverified adoption against the
  one-verifier law (6), amnesic restart against recovery (4), no-CAS
  against the catalog refinement (5), and dropped resolve-check against
  the catalog's convergence law over the abstraction (5).
- One FINDING, recorded rather than repaired away
  (`verify/journal/FINDING-001.md`): the expected-position CAS guards the
  position, not the predecessor's bytes. Corruption between an
  appender's head snapshot and its publish is detected on READ, never at
  append time. The chain law now carries that hypothesis explicitly, and
  the two laws are visibly independent as a result.
- Toolchain recorded, not asserted: TLC 2026.08.11.125311 (rev 0894c34),
  jar sha256
  `ab323b79802aedc3203b3f9af37c6aca3ed43f4e0225b36f2aa77b26de46c05f`,
  OpenJDK 21.0.2 provisioned by `mise x java@21`, flags
  `-workers 1 -fp 1 -deadlock`, whole gate 23 s.

### Bounds and residuals

- **A bounded check certifies only its bounds.** At most 2 appenders,
  2 payload values, 3 journal positions, ONE storage corruption per
  behaviour, ONE crash event per behaviour. A defect needing a third
  appender, a fourth position, two corruptions, or two crashes is
  outside everything checked.
- **No code/model correspondence.** No refinement map exists between
  this model and `go/journal`. R4 — driving these schedules against the
  running journal API, which is the other half of the received split-CAS
  obligation — is owed and is not claimed. R3 (an inductive invariant,
  lifting the laws off the cap) is owed.
- **Crash recovery specifics are out of scope.** The model treats an
  append as atomic at the broker. Torn writes, partial fsync, the pinned
  server's failsafe sync window, and JetStream internal-queue overflow
  are not modelled; they remain the `crash-durable` residuals recorded
  in the section above.
- **Byte canonicality collapses.** Records are canonical values in the
  model, so the runtime's wire-byte canonicality check is inexpressible
  and is not claimed; what is modelled is position agreement and the
  prev link. Collision resistance is assumed — nothing here is a claim
  about SHA-256.
- **The stream shape gate is not modelled.** `badShapeReason` and the
  standing stream-update advisory are an admission check on the stream's
  configuration, not a step of the append/read machine; a conformant
  stream is assumed throughout.
- **Reproduced non-claim.** Only the tail record can be corrupted
  without breaking chain well-formedness, because nothing links to it —
  so a canonical-but-forged tail passes `tailCursor` in the model
  exactly as it does in `go/journal`. Detecting it needs an external
  head witness.
- **Adoption is licensed at adoption time and no further.** A handle may
  hold a head that storage no longer carries if storage is corrupted in
  place afterwards; the read path refuses such a cursor, which is where
  that guarantee lives.
- The Effect runtime, the TypeScript reader, the MCP surface, ADR-0009's
  replica role, and liveness are all outside this gate. Every property
  checked is safety; no fairness is assumed.
- The refinement is claimed against the RESTRICTED create path, not
  against the journal's whole alphabet: the journal is content-blind and
  convergence is the daemon's law, enforced above it. The journal's extra
  generality — content-blind appends, stale-snapshot appends, corruption,
  crash recovery — is outside the catalog's alphabet by construction.

### Checkable at

[verify/journal/](verify/journal/) — spec, configs, committed
counterexample traces, the finding, the decisions log, and the run
record in `README.md`.

## KV meaning fold — combine and join — R0/R1 (TypeScript), R0 (Go)

> **ARCHIVED 2026-08-15.** Both sides of this wall left the working
> tree in the estate-focus purge and are intact at tag
> `archive/pre-estate-focus`. This checkout no longer asserts the
> claim; the entry is kept as the record, checkable at the tag.

### Claim

The last-write-wins KV fold has a `combine`: cut a history anywhere,
fold the pieces independently, combine them, and the answer is the
answer the whole history gives. Go and TypeScript both reach the frozen
fold-state digest that way.

On an enriched state that keeps each event's identity coordinate, the
same fold is a join-semilattice — idempotent, commutative, associative —
and projecting it back onto the shipped `KVState` agrees with the
shipped left fold on histories that are strictly increasing in witness
order with distinct coordinates.

### Evidence

- R0: every split point of the frozen merged corpus, folded in pieces
  and recombined, reproduces `foldStateDigest`
  (`bb947adc8d4623e9340ae0932ac1f7e65dbae211b991b11eaf24817dbe7dafe1`)
  in both languages, and so does every three-way split under either
  grouping. `fixtures/stream-wall.json` regenerates byte-identically.
- R0: the enriched fold, projected, reaches the same frozen digest on
  the same corpus — the corpus is witness-ordered.
- R1 in TypeScript: generated property suites for identity, associativity, the
  concatenation homomorphism, arbitrary split points, and — for the
  join — idempotence, commutativity, associativity, permutation
  invariance, and the projection law. The join generators include both
  sequence boundaries and stream-id prefixes; a separate generated refusal
  corpus includes NaN, infinities, fractions, negatives, and the first unsafe
  integer.
- Negative controls, each refuted on exactly the law it drops:
  `combineKV` fails commutativity and idempotence with minimized
  counterexamples; ordering the witness `(stream, seq)` instead of
  `(seq, stream)` moves the frozen digest to `910950be...`; dropping sequence
  admission makes the minimized NaN join non-commutative.
- The generated law suite now derives commutativity and idempotence
  from a per-algebra claim, and refuses a false one: a last-write-wins
  register claiming commutativity fails that law while passing every
  law it does hold.

### Bounds and residuals

- `combineKV` is a monoid and nothing more. It is NOT commutative and
  NOT idempotent, so it licenses parallel replay of an ordered history
  and does not license coordination-free federation. The design insight
  that one operation could be both is refuted: an unconditional
  concatenation homomorphism plus commutativity would force the fold to
  be order-insensitive, which last-write-wins is not, by construction.
- Go's combine evidence stops at R0: its combine tests are hand-written
  examples and frozen-wall checks, with no generated Combine property or fuzz
  suite. The R1 claim belongs only to TypeScript.
- The join-semilattice is TypeScript only. There is no Go twin and
  therefore no cross-language wall for it; its one wall-anchored claim
  is the projection, because the digest that has to come back was
  frozen by Go.
- The witness sequence domain is `0..Number.MAX_SAFE_INTEGER`. Both folded
  events and structurally supplied join states refuse other numbers as typed
  data before comparison. This is not a u64 claim: current Go journal cursors
  use platform `int`, while chain identity independently refuses above the same
  exact-integer boundary through `canonical.EntryDigest`.
- The projection law holds only on witness-ordered histories with
  distinct coordinates. A two-event counterexample off that domain is
  pinned, as is the count divergence under re-delivery.
- The join's refusal channel does not associate: with two states
  disagreeing at one coordinate and a third holding a later write for
  the same key, one grouping refuses and the other succeeds. The laws
  are therefore stated over the witness-consistent domain.
- The enriched state is O(history) where `KVState` is O(distinct keys),
  because reproducing `count` idempotently requires remembering which
  coordinates were absorbed rather than how many.
- FIXED by Task 30 Addendum 1: `ApplyMerge`'s duplicate refusal is a
  function of its input in both languages. It lists every duplicate-bearing
  `(source, seq, indexes)` tuple, sorted by UTF-8 source bytes and sequence.
  The shared M1 vector includes multiple sources, multiple sequences, more
  than two indexes at one coordinate, and a Unicode pair that distinguishes
  UTF-8 order from UTF-16 order; Go's randomized map walk and TS insertion
  order both reproduce the same value.
- Answered, not a finding: the dense and sparse indexing paths inside
  `ApplyMerge` agree. A duplicate coordinate cannot survive the density
  check, so the fast path never sees one.
- Law-scope decision: the short-lived universal wording “packages/core is
  total by refusal” was intentionally narrowed to the exact walled boundaries
  named in [packages/core/CONTEXT.md](packages/core/CONTEXT.md). `kvStep`
  deliberately forgives an excluded payload in the meaning fold, lower-level
  canonical writers retain documented range errors, and the genuine-
  declaration re-host remains a pinned gap; a package-wide claim would
  therefore be false.

### Checkable at

[go/stream/combine_test.go](go/stream/combine_test.go),
[go/stream/merge_paths_test.go](go/stream/merge_paths_test.go),
[go/stream/merge_refusal_test.go](go/stream/merge_refusal_test.go),
[packages/core/test/stream.combine.test.ts](packages/core/test/stream.combine.test.ts),
[packages/core/test/stream.merge-refusal.test.ts](packages/core/test/stream.merge-refusal.test.ts),
[packages/core/test/kvSemilattice.test.ts](packages/core/test/kvSemilattice.test.ts),
and [packages/core/test/fold.laws.test.ts](packages/core/test/fold.laws.test.ts).

## Schema identity — interim, greenfield build in progress

### Claim

Interim law only: a type's identity is SHA-256 over its submitted
canonical bytes; the daemon refuses any digest it cannot re-derive.

### Evidence

The flb.type.v0 grammar — a tagged union of node kinds, in Effect terms
a `Schema.Union` of tagged structs — and both codecs are pinned by a
frozen fixture ([proto/wire/fixtures/](proto/wire/fixtures/)).

### Bounds and residuals

Byte-coarse identity is a stated limitation; the owned encoding with
ratified semantic laws is ticket 004.

### Checkable at

[proto/wire/fixtures/](proto/wire/fixtures/).

## RFC 8785 canonical JSON — R1 differential

### Claim

`packages/core` and `go/canonical` either refuse the same input byte
stream or emit byte-identical RFC 8785 output. Their constrained
decoders accept exactly one valid UTF-8/I-JSON value, reject duplicate
member names after unescaping, reject lone surrogates and non-finite
binary64 values, and share a 256-container nesting bound.

### Evidence

- Identity-domain closure (2026-08-13): chain-entry identity refuses
  invalid UTF-8 and unpaired surrogates in BOTH runtimes, and refuses
  sequence positions outside JavaScript's exact-integer range; a
  shared frozen vector proves the Go and TypeScript refusal domains
  agree, including the accepted 2^53-1 edge. Checkable at:
  [go/canonical/probes/](go/canonical/probes/) (the two-runtime gate
  and its retained red finding) plus the entry-refusal suites in both
  languages.
- Independent oracle: all 26 IEEE-754 rows from RFC 8785 Appendix B are
  committed with provenance in
  [fixtures/jcs-rfc8785.json](fixtures/jcs-rfc8785.json) and checked by
  both implementations.
- Normal gates: Bun fast-check runs 160 generated values and 160
  arbitrary byte streams at recorded seeds, while a persistent Go probe
  evaluates every candidate and every shrink. Go runs 160 deterministic
  PCG cases, the shared sharp corpus, and every native-fuzz seed
  against a persistent Bun probe
  ([packages/core/test/jcs.differential.test.ts](packages/core/test/jcs.differential.test.ts),
  [go/canonical/differential_fuzz_test.go](go/canonical/differential_fuzz_test.go)).

### Bounds and residuals

- Corpus domain: ±(2^53) neighbors, negative zero, 1e21 and
  small-exponent boundaries, long mantissas, control characters,
  surrogate pairs and lone escapes, duplicate keys, invalid UTF-8,
  trailing values, and depths on both sides of the shared limit. A
  green bounded run certifies this corpus and its generated sample, not
  all byte streams.
- Long local variants are documented in [README.md](README.md). Native
  Go fuzz failures enter Go's minimized corpus; fast-check failures
  report the minimized bytes, seed, replay path, and shrink count
  before stopping.

### Checkable at

[fixtures/jcs-rfc8785.json](fixtures/jcs-rfc8785.json),
[packages/core/test/jcs.differential.test.ts](packages/core/test/jcs.differential.test.ts),
[go/canonical/differential_fuzz_test.go](go/canonical/differential_fuzz_test.go),
and [go/canonical/probes/](go/canonical/probes/).

## Plait kernel admission door — R0 differential + executable no-bypass control

### Claim

For every model-emitted admission vector in the committed kernel corpus, the
shipping `KernelDoor.admit` returns the emitted verdict. CLI, `FabricClient`,
and `CasDaemon` export that exact function object, so every host surfaces the
same verdict value — for a refusal, the generated table's reason, law, repair,
and repair applicability. Candidate, context, and intrinsic-act types are
derived from `KernelSchemas.generated.ts`; the model's identity labels stay
`bigint` from candidate to encoding, and no runtime content digest supplies or
converts one.

### Evidence

- `KernelConformance.test.ts` replays all seventeen emitted admission vectors
  against the shipping door, not a test-side transliteration. Its
  refuse-everything door remains a killed control, and the replay carries no
  bigint-to-number conversion: a literal above `Number.MAX_SAFE_INTEGER`
  crosses the door with its exact encoding pinned independently.
- The same file holds the absence control. The corpus carries the anchored
  resolve that must be refused but not the bare one that must be admitted, so
  one row decodes a lawful `resolveDigest` through the generated codec — its
  anchor absent, spelled `undefined` because that is what `Schema.UndefinedOr`
  produces — admits it, and pins the resulting sentence against the corpus's
  own `resolve-schema` vector. A door reading absence as `null` refuses a
  lawful sentence while all seventeen vectors still agree; this row is what
  catches that.
- `KernelDoor.routes.test.ts` asserts every host route is reference-identical
  to `KernelDoor.admit` and to the barrel's `KernelDoor.admit`, kills an
  invented host function with the same comparison, and checks that a poisoned
  extra `admit` on a `FabricClient.testLayer` fixture is overwritten by the
  production route rather than accepted.
- The same suite offers one refused candidate through every host route and
  compares the complete taught refusal — reason, law, repair, applicability —
  value for value.
- Model-side, the shape the carriage's program run walks is proved rather than
  assumed: `verify/kernel`'s KM-4 composition family states the walk of a
  closed program in admission order and proves that per-node door judgments
  compose. `run_composition` splits a run over concatenated node lists into
  the prefix's run and the suffix's run from the context the prefix reached;
  `run_admitted_sequence` proves a landed run is exactly a sequence of
  admitted acts, one step per walked node in order, each recording the one
  door admitting that node's candidate at that step's own context;
  `run_refusal_decomposition` proves every refusal splits into a prefix that
  landed with exactly the steps the outcome reports and a node whose candidate
  genuinely refuses at the context that prefix reached;
  `run_tail_unjudged` proves the answer is that same refusal for every tail,
  so no node after a refusal is judged; `run_context_grows` carries the
  monotone-context benignity the engine's replica relies on; and
  `run_landed_closed` proves a landed run's program required nothing — only
  closed, filled programs run. Two executed controls kill the wrong
  compositions with committed traces: `drop-run-tail-halt` (a walk that judges
  the tail after a refusal answers differently for two programs that differ
  only after the refusing node, while the lawful walk answers identically) and
  `drop-run-prefix-standing` (a walk that discards the prefix's admissions
  reports no standing steps where the lawful walk reports one), each refuted
  on exactly its own dropped clause and green under the other's drop.

### Bounds and residuals

The conformance result is agreement on the finite committed corpus, not a proof
over all candidates, and agreement with the model is never a runtime guarantee
promoted out of a model theorem. `admit` takes its generated catalog and
pinned-universe context as an explicit parameter: this slice neither assembles
a durable catalog snapshot nor invents an ambient source for one. `CasDaemon`
remains a type and a route with no tag, layer, or daemon implementation, and
the chaos CLI accepts no kernel candidate — the claim is that the judgment
routes those hosts expose cannot bypass the door, not that this slice adds a
daemon runtime or a CLI command. No Effect service wraps the door; a Layer
seam, if one is wanted, would wrap this generated door and is not claimed here.

The KM-4 composition family is a MODEL-LEVEL result and adds no runtime rung:
it proves what a per-node walk through the one door is, never that the
carriage's walk is that walk — no correspondence gate ties the two, and none
is claimed. Its own bounds are one pass by one walker: no concurrency beyond
the monotone-growth premise, no liveness, no retries, no scheduler. Three
abstractions are stated where the model is thinner than the carriage.
Completion is total in the model, while the carriage's completion of a node
into a candidate may instead fail into the error channel (an absent
execution-time supply, a local consumed before it landed). Carriage itself is
outside the outcome: an admitted sentence whose carrier is unbound fails into
the error channel, so the runtime has a third ending the model's two-way
outcome does not carry. And the program-admission precheck — including the
refusal of an empty declaration — happens before the walk is entered, where
the model's walk lands vacuously on the empty node list, which is the unit the
composition law needs.

### Checkable at

[packages/plait/src/kernel/KernelDoor.ts](packages/plait/src/kernel/KernelDoor.ts),
[packages/plait/test/KernelConformance.test.ts](packages/plait/test/KernelConformance.test.ts),
and
[packages/plait/test/KernelDoor.routes.test.ts](packages/plait/test/KernelDoor.routes.test.ts).

## Plait spine — R0 differential + executable integration

### Claim

For the generated four-envelope slice-0 corpus, TypeScript and
`go/canonical` derive equal SHA-256 digests from RFC 8785 canonical,
uncompressed envelope bytes. A publisher and consumer running as separate
Bun processes exchange all four envelopes through one local file-backed
`nats-server v2.14.4` with `num_replicas: 1`; the publisher writes each
envelope digest as `Nats-Msg-Id`, and the consumer constrained-decodes each
closed envelope and re-derives the same digest before exposing it.

### Evidence

- The TypeScript emitter generates `packages/plait/fixtures/envelopes.ndjson`
  with its generation command on the first line. The package gate regenerates
  it byte-for-byte, and a committed negative control proves a hand-edited row
  fails that comparison.
- `go/cmd/plaitwall` reads the generated rows through the independent
  `go/canonical` implementation and re-derives every digest. A planted mutant
  that fingerprints gzip transport bytes instead is killed on the named first
  row.
- The integration gate builds the upstream NATS server command from the
  checksum-locked `go/go.mod` pin, verifies the binary reports `v2.14.4`, and
  starts it with JetStream and a temporary file store. The stream shape is
  constrained to file storage and one replica. An excess-property frame is
  refused structurally under the closed-envelope law.
- Refusals ride the Effect error channel throughout the public surface, and
  the conformance gate quantifies over the package barrel itself
  (`typeof import`), not a hand list: three planted violations — a new
  nonconforming fallible export, a widened `FabricClient.layer`, a widened
  service method — each redden the battery, with committed traces proven to
  kill for the stated cause (making each mutant conformant collapses its
  trace).
- Path translation at the `packages/core` seam is escape-aware, survived
  twelve adversarial probes (nested slash keys, escape lookalikes, unpaired
  surrogates), and the core path join's unescaped-string limitation is filed
  as an upstream finding rather than fixed cross-package.

### Bounds and residuals

The wall covers four generated rows spanning all envelope kinds, one inline
Unicode body, one certificate, one blob reference, and pins; it is not an
exhaustive enumeration of the JSON or envelope domains. The integration test
covers live delivery including across a consumer restart — the sender and
receiver need not overlap; the single server remains up throughout, and no
crash-recovery-of-the-server, durable-consumer, federation, exactly-once,
cluster, attribution, or liveness claim is made. The conformance-gate
quantifier inspects function-typed exports whose immediate return is
`Effect` or `Layer`; `Stream`-in-success-type, plain `Effect`/`Layer` value
exports, curried data-last shapes, and exports nested below depth one are
named hardening-brief scope with no live violation behind them. The
joined-string fallback in path translation can mislocate when a value
changes between passes — bound documented in the module JSDoc. Blob content
retrieval is outside slice 0: the wire gate checks only the digest
reference shape and the 256 KiB canonical-body threshold.

### Checkable at

[packages/plait/](packages/plait/),
[packages/plait/fixtures/envelopes.ndjson](packages/plait/fixtures/envelopes.ndjson),
and [go/cmd/plaitwall/](go/cmd/plaitwall/).

## Tracer conformance — R0/R1, single daemon

### Claim

The daemon's laws (W1–W10) are each witnessed by black-box tests over
NATS subjects. Its twelve refusal kinds are total over two ontological sorts:
structural refusals reproduce unchanged across catalog heads; absence
refusals are repealed when the missing evidence lands. Every daemon refusal
persists the sort on the wire, and the complete kind-to-sort manifest is
frozen under a grammar digest so archived values are not silently re-sorted.

The `flb.protocol.v0` session surface additionally claims, single-daemon:
the close outcome follows the protocol's completion declaration; close
authority follows the protocol's close declaration, with any principal
bound to any named seat authorized to close; the declared revision policy
is the exact divergence point between refusing and absorbing a contributing
seat's differing value; the final-state digest preimage carries its session
version string and that string is load-bearing; replay refuses a journal
written under an unknown session version by name; the fence tie-break within
the fence-chosen seat is smallest canonical value bytes; bounded fill
multisets converge to one final-state digest across delivery orders with
redeliveries injected, and the at-least-once collapse survives a process
restart; and reopen equivalence on every admitting path is byte-level — the
state reply served before a restart equals the reply replayed from the same
store byte-for-byte.

### Evidence

The TypeScript and Go conformance suites, all twelve refusal kinds, restart
survival, and the issue #57 shared reply corpus ([proto/](proto/)). The corpus
contains twelve fixed create/admit/refusal values: both decoders agree on
three admissions and nine rejections spanning recursive excess fields,
daemon `local:true` costumes, bad digest/head coordinates, and negative
sequence positions. Client controls additionally execute journal attribution,
claimed-sequence/head verification, repair-bearing local refusals, injective
MCP derivation, and owned send-ordered transcripts against real or controlled
daemon seams.
The request-admission control submits duplicate member names, a lone surrogate
escape, and raw invalid UTF-8 through a real NATS `type.create` request. Each
must return `malformed` before mutation, while the existing hostile-formatting
control proves lawful alternate formatting retains the same identity.
The shared combined-grammar refusal-sort vector has an independently recomputed
manifest digest; per-kind structural reproducibility and absence
repealability laws, strict decoder controls, and restart survival pin the
persisted classification.
The protocol-session evidence (`proto/go/protod/protocol_*_test.go`): the
replay-corruption roster `TestReplayValidatorRefusesEveryCorruption` (every
refusal branch of the replay validator, exact error strings, valid histories
driven through the real serve paths); the permutation/redelivery property
`TestFillPermutationsConvergeUnderRedelivery` (seeds `0x06750001` and
`0x06750002`, 24 multisets, two random orders each, redeliveries injected
mid-order); `TestRestartRedeliveryCollapses`;
`TestCloseOutcomeFollowsTheCompletionDeclaration`;
`TestCloseAuthorityFollowsTheDeclaration`,
`TestNoOperatorSeatProtocolCloses`, and
`TestCloseRefusalPrecedenceIsClosedThenAuthority`;
`TestRevisionPolicySuccessorRoundRefuses` and
`TestRevisionPolicyAbsorbIsTotal`;
`TestSessionDigestPreimageCarriesItsVersion` and
`TestUnknownSessionVersionRefusesReplay`;
`TestFenceTieBreakIsCanonicalWithinTheSeat`; and the byte-level
`reopenEquivalence` harness that closes every admitting-path contract test
with a daemon restart over the same store.

### Bounds and residuals

Unexercised, by stated scope: replica roles (ratified in ADR-0009,
unbuilt), union resolution across daemons, ingress payload conformance
(admission checks identity resolution only — the contract says so). The reply
wall is corpus-sized accept/refuse equivalence for the create/admit/refusal
branches, not exhaustive equivalence over all JSON or every future reply kind.
The request-byte claim is likewise bounded to the three sharp constrained-
decode classes plus the existing generated and differential canonical corpus;
it is not an exhaustive proof over all byte strings.

Protocol-session bounds, stated: the permutation property quantifies only
over multisets giving each seat at most one distinct value — the honest
convergence domain under `successor-round`, where no refusal can fire in
any order; absorb-unrestricted multisets are deliberately left to the
DEV-670 model-generated wall. The properties claim daemon self-consistency
(permutation and idempotence laws), never model verdicts. The corruption
roster's completeness is enforced by review convention — a new validator
error string can land without a row, and no grep can catch it. Close
redelivery across a restart is untested; the per-session mutex is never
raced by a test; the serve-path answer for a future-version journal is
silence by decision (D101) and is asserted internally only; the fence
tie-break is pinned with trivially-ordered strings until the model-emitted
wall vectors pin it.

### Checkable at

[proto/](proto/).

## Refusal projection walls — R2 (TLC) + model-level R5 (Lean); the refuted constructor is fixed on `main`

### Claim

The union-member-uniqueness mislocation this development refutes is
**fixed and merged** (`ab77d6bfc`, ancestor of HEAD): the constructor
that reported the duplicate's index in the **sorted local copy's**
coordinates as a path into the **submitted** term (`Path`/`Got`
contradicting each other) is gone; the shipped walk now reports
`submittedIndex`/`submittedValue` (`proto/go/protod/walk.go:174-188`).
The historical defect was established three independent ways — a
live-daemon execution probe (research note §5), a Lean theorem over the
old constructor (`shipped_incoherent`, witness `[1,1,0]`), and a TLC
trace found without the witness (`<<0,1,0>>`, committed as `*.cex.txt`).
Those controls now stand as **regression guards** over the historical
rule, not as descriptions of shipped code.

What is claimed positively: **the walls are satisfiable by
construction** — a repaired projection rule (report the least submitted
index having an equal earlier member, submitted member as `Got`)
satisfies **W-COHERENCE** and **W-SCOPE** for every submission, proved
in Lean (`fixed_coherent`, `fixed_in_scope`) at the model level and
model-checked at the TLC caps. **Caveat, surfaced by adversarial review
(2026-08-14) and machine-checked:** the *shipped* Go rule is a
**different function** from the Lean `fixed` — it sorts by
`(canonicalBytes, submittedIndex)` and reports the later element of the
first canonical-byte-adjacent duplicate pair, whereas `fixed` reports
the least-index later-twin (they diverge, e.g. submitted `[b,s,s,b]`:
Lean path 2, Go path 4). Both satisfy both walls, but only the Lean
rule is proved here; the *shipped* rule is walled by the Go conformance
tests (`create`/union coverage), not by this Lean development. The
defect is **report-only**: both rules refuse exactly the
duplicate-bearing submissions (`WDecision`, checked at bounds).

Alongside, the collapse lemma (`QTree.collapse`): pair-query evidence
is redundant up to a uniform 2× simulation. **Precise hypothesis
(review-clarified):** the operative premise is not decidability alone
but that the teacher's pair answer **factors through the two membership
bits**, `g(A x, A y)`, and the learner knows `g` — decidability makes
queries answerable, the factoring is what forces redundancy. ICE evades
the lemma precisely because its teacher holds a relation *not* so
factorable. This is the formal ground for freezing
`flb.certification.v0` without ICE-style implication fields.

### Evidence

`verify/implication/run.sh` — the five-verdict gate: Lean `lake build`
(no `sorry`, core only); TLC clean config; two faithless controls
(`Rule = "sorted"`, the constructor as shipped) each refuted on exactly
its named invariant with traces committed; one independence control
passing `WDecision` under the shipped rule.

### Bounds and residuals

TLC caps: submissions of length ≤ 4 over two member ranks, exhaustive
below the caps (31 submissions, 93 states, depth 2). Lean's fixed-rule
walls and the collapse lemma are unbounded but **model-level**:
code-model correspondence with `walk.go` is empirical (the execution
probe), not proved. Decision equivalence (`WDecision`) has no unbounded
proof yet — it needs sorted-permutation lemmas, stated as the next
rung in the README. The walls cover the union-uniqueness law; the
other three shipped relational laws (`optional` declared / unique /
ordered) project coherently today because their loops never reorder,
and are covered by the model only insofar as their shape matches.

### Checkable at

[verify/implication/](verify/implication/) (Lean project, spec,
configs, committed counterexample traces, run record in README) and
[docs/research/2026-08-14-implication-refusals-formalized.md](docs/research/2026-08-14-implication-refusals-formalized.md)
(the definitions the machines check).

## IR denotational laws — model-level R5 (Lean)

### Claim

`flb.type.v0` stated once as an algebraic type (`TyX H`; the hole is a
type parameter, so the closed and authoring grammars are one definition
at two instantiations) with four primitive leaves (`string`, `bool`, `int`,
`null`) and a denotational semantics `Conforms ρ t v`,
and the estate's prose laws about meaning proved over it: brands are
denotationally invisible (the fiber theorem's premise); a ref means
exactly its resolution; union meaning is a property of the member set,
so the canonical member sort — under any comparator — never moves the
denotation (identity moves, meaning does not); catalog growth never
invalidates conformance (presence-of-evidence monotone, denotationally);
and the C5 embed/close round trip. Structs are denotationally closed,
derived from the shipped json-schema target (`additionalProperties:
false`). No `sorry`, core Lean only.

**Scope of the "invisible" laws (review-clarified, 2026-08-14).**
`Conforms` models the **identity/daemon semantics** — what the digest
commits to and what the certifier admits, where the daemon validates no
payloads (`proto/SPEC.md:83`, "checks declared-metadata only"). At that
level brands *and* checks are invisible, and `brand_invisible` holds
across every codegen target. **`check_invisible` does NOT hold of the
validation semantics**: two of the three codegen targets emit real
refinements from a check (`proto/ts/src/codegen.ts:97-105` maps six
check names to Effect-Schema refinements; `:268/:272` emit
`minLength`/`pattern` into JSON Schema), so `check(string, minLength≥1)`
and `string` accept *different* value sets under a generated validator.
The Lean law is therefore a **modeling stipulation of the identity
semantics**, not a claim that a generated codec ignores checks. The
`Semantics.lean` `check_invisible` docstring records this. `brand`,
`check`, `deferred_blame` and the two-fuel brand/check laws are
near-definitional (they unfold the `Conforms` clause); the substantive
inductive laws are `union_extensional`, `sort_preserves_meaning`,
`resolver_mono`, and `ref_unfold`.

### Evidence

`verify/ir/run.sh` (= `lake build`), Lean 4.33.0.

### Bounds and residuals

Model-level: the Lean grammar is the reference the Go/TS restatements
should mirror (architecture audit §3); no correspondence proof ties it to
`walk.go` or `codegen.ts`. Numeric literal values are abstracted to `Int`;
non-integer literal identity remains outside the model; check args to the
check name; ref resolution fuel-indexed with DAG-depth sufficiency
noted, not proved. Well-formedness residual laws and the parse theorem
are the named next rungs in the README.

### Checkable at

[verify/ir/](verify/ir/) and
[docs/research/2026-08-14-architecture-audit.md](docs/research/2026-08-14-architecture-audit.md) §5.

## E2 move calculus — model-level R5 (Lean)

### Claim

Epistemic state `open | filled | disputed | decided` over an arbitrary
fixed finite hole carrier, three moves (`fill`, `dispute`, `decide`),
and the D85 absorb discipline — fills are total: a clash or a live
dispute absorbs the fill into the holder-attributed candidate set, a
confirming refill journals the confirming pair, and a fill after
`decided` appends a ghost receipt without touching the tombstone; an
empty dispute offer is refused at every state (D86). Thirty-nine gated
axiom reports, including the frozen-spec package (strong no-loss with
no refusal disjunct; meaning and evidence confluence under permutation
of fill/dispute bags; schedule-free fences; per-move refusal iff;
observation alignment; runner/calculus agreement; totalized safety),
the commuting-move diamonds, clash-repair confluence, legacy no-loss,
fence path independence generalized to any sound pair-set function
(canonical-min and holder-plurality as instances), `decided` stability,
single-seat stability, and the IC4 impossibility
`no_fair_resolute_fence`.

### Evidence

`verify/moves/run.sh`: the sha256 pin over the frozen
`Moves/Spec.lean` (statement drift is a gate failure requiring a Rev
re-pin), `lake build` (Lean 4.33.0, core + Std, no mathlib),
word-boundary source guards refusing `sorry`/`admit`/`axiom` in any
position, and the kernel-bound source-hygiene sweep over every Lean
source in the package — `Moves.lean` and `Moves/**/*.lean`, the model
surface, plus `Main.lean` and `Oracle/**/*.lean`, the corpus generator
that stands in for the model in
`packages/moves/fixtures/moves-conformance.ndjson`. Nine checks.
Seven refuse outright: `@[implemented_by]`, `panic!`, bare `panic`,
the bang-accessor family (any bang-suffixed identifier reached by
dot-notation or qualification, plus the curated unqualified core
accessors — all of which return the type's `Inhabited` default and
exit 0), `unsafe`, `native_decide`, and `sorry`. Two require an exact
source-line-digest allowlist row with an operator-ratified reason:
`@[extern]` (allowlist empty) and `partial` (one row, `Main.lean:68`,
the oracle's non-terminating serve loop). Nine planted negative
controls, one per check, each refuted on its named check with the
committed diagnostic trace byte-compared, each clearing the checks
that run before it, and none of them reachable from `lake build`; a
control committed but never run fails the gate. The mechanical axiom-footprint
check — `#print axioms` over all thirty-nine rostered theorems, failing on
anything outside
`{propext, Classical.choice, Quot.sound}` — and the orphan rule: every
public theorem is rostered or listed with a reason in
`gate-exclusions.txt`. Controls and executable witnesses:
`clobber_diverges`, `lww_loses`, `filled_unstable`,
`fence_manipulable` in `Moves/Violations.lean`, plus the frozen
mutant kills and pinned witnesses in `Moves/SpecProofs.lean` — the
pre-D85 repair chain is kept verbatim as the canonical mutant and
provably fails strong no-loss and meaning confluence. Each is
transparent and kernel-checked. FINDING-48-AXIOMS is closed:
`2d2ea7941` replaced two `native_decide` axioms with kernel-checked
proofs and added the footprint check to the gate.

### Bounds and residuals

The total `runRepairK` laws cover arbitrary finite traces over the fixed
finite hole carrier, including refused moves. `spec_no_loss_strong` accounts
for every submitted fill's exact holder-attributed pair in terminal journal
evidence — fills are total under D85, so there is no refusal disjunct to
escape through. The confluence laws (`spec_meaning_confluent`,
`spec_evidence_confluent`, `spec_fence_schedule_free`) quantify over the
`FillDisputeOnly` wire fragment: decide-bearing bags are order-sensitive by
design, because decide enters only through the fence at close — a decide
admitted mid-stream gates which later disputes refuse, and that gate is the
one deliberate schedule-sensitivity the calculus keeps. The legacy `Runs`
theorems remain bounded to admitted complete executions. The three-fill bag
is the pinned witness in both directions: all three fills admit under D85
(`spec_witness_three_fill`), and the frozen pre-D85 mutant loses the third
(`spec_mutant_legacy_killed_by_L1`). MOVES-1 is closed at the model layer;
the wall half is pending (DEV-670). MOVES-5 is closed by D85. A single
journal is modeled. Conflict coverage is two fills for legacy theorems;
single-seat coverage requires value-consistent intents.
`no_fair_resolute_fence`
establishes that a resolute choice between two distinct candidates
picks one of them; the IC4-impossibility framing is reclassified
pending disposition (MOVES-2). Dispute attribution is unauthenticated
in the model (MOVES-4). Not modeled: crash recovery, CAS, retries,
leases, liveness, the Effect runtime, any attack/revision model, and
close atomicity (the daemon's seal + fence + record in one step).
Code-model correspondence is the named open lane: no refinement map
ties daemon folds and events to these states and moves — the daemon's
synthesized two-candidate dispute and atomic close are instances the
map must justify, not theorems here. Full audit:
[docs/research/2026-08-15-model-audit-findings.md](docs/research/2026-08-15-model-audit-findings.md).
The hygiene sweep is source-level and owned-source-only: inherited Lean
`Init` externs remain in the trusted base and the emitted-C
panic-symbol count is deferred to REF-6. Its own stated bounds: the
bang-accessor convention branch does not see an unqualified bang name
outside the curated thirteen; `noncomputable` is deliberately not
checked, because it removes compiled code rather than adding a
defaulting path and the extraction obligation it bears is REF-0's, to
be met by a positive artifact check rather than a token ban.
Decision log: `verify/moves/DECISIONS.md` (D70–D79, the Task 22
kernel-hygiene scope and allowlist decisions, and the Task 25 roster
widening, bang-accessor curation rule, and control-completeness
entries); the D85 absorb
ratification and the D86 empty-offer refusal are recorded under the
DEV-673 heading in `proto/DECISIONS.md` (numbers task-local until
merge).

### Checkable at

[verify/moves/](verify/moves/) and
[docs/research/2026-08-14-meaning-scheduler-e2.md](docs/research/2026-08-14-meaning-scheduler-e2.md).

## TS move-calculus kernel ≡ Lean model — R0 differential + R1

### Claim

`@foldlab/moves` (`packages/moves/src/kernel.ts`, one named function per
named def) computes the same calculus as `verify/moves/Moves/Model.lean`
at the ground wire instantiation (three holes, `Nat` values,
ASCII-identifier holders, value-then-holder candidate order): identical
admitted/refused receipts, terminal meaning, journal evidence, primitive
and repaired partial runs, reversed-bag runs, and canonical-min /
holder-plurality fence choices, byte-for-byte under RFC 8785
serialization.

### Evidence

The corpus is authored by executing the model: `verify/moves/Main.lean`
(`lake exe oracle emit 2000`) compiles the unmodified `Moves` library
and emits 2000 splitmix64-indexed traces with verdicts to
`packages/moves/fixtures/moves-conformance.ndjson`; the first line
records the generation command as provenance. `verify/moves/run.sh`
regenerates and byte-compares the fixture on every gate run, so a
hand-edited or stale corpus is a gate failure.
`packages/moves/test/conformance.test.ts` replays all 2000 vectors —
zero skips, count pinned — comparing canonical bytes, and pins corpus
adequacy (refusals, disputes, decided holes all present in bulk).
`packages/moves/test/mutants.test.ts` plants five semantics mutants —
last-write-wins fill, the verbatim pre-D85 legacy repair, decide
without the membership guard, empty-offer admission, reversed value
order — and each dies against the corpus while the lawful kernel
survives. `packages/moves/test/laws.property.test.ts` restates the
frozen-spec laws L1–L8 and both spec witnesses as fast-check
properties over inputs the corpus never sampled.

### Bounds and residuals

Cedar-style differential evidence, deliberately below refinement: the
kernel-checked theorems hold of the instantiated model, NOT of the
compiled binary that emitted the corpus, and NOT of the TS kernel —
agreement is evidence bounded by the generator's reach. The corpus is
randomized (traces of length 1–6 over two-to-four values, three holes,
three holders), not the exhaustive wire-image enumeration DEV-670
specifies, and it drives the TS kernel, not the Go daemon — the
moves↔protod gap stays HELD. Byte identity leans on the narrow corpus
grammar (ASCII keys and identifiers, integers below 2^53); outside it
Lean's printer and RFC 8785 diverge (spike report). The TS comparators
match Lean's only on that grammar: JavaScript code-unit string order
equals Lean's code-point order for ASCII holders only. Cross-platform
regeneration byte-identity is verified on this machine and argued, not
CI-proven.

### Checkable at

[packages/moves/](packages/moves/),
[verify/moves/Main.lean](verify/moves/Main.lean), and
[docs/research/2026-08-15-lean-oracle-spike.md](docs/research/2026-08-15-lean-oracle-spike.md).

## Create-pipeline snapshot law — R2 (TLC); the head-read defect is fixed on `main`

### Claim

The snapshot law — every `created:true` reply names the head its facts
were read under; for `type.create`: `seq` addresses the op's fact,
`head = seq + 1` (a model coordinate; on the wire the head is a digest,
so this arithmetic is not implementation-checkable — see bounds), `head`
addresses the op's bridge — holds for the repaired rule (reply captured
inside the critical section, the `frontierSnapshot` pattern) at the gate
bounds, with crashes enabled. The head-read defect it refutes is **fixed
and merged** (`3aebd2ba9`): the shipped `serveCreate` no longer reads
`Head()` after the lock, it forwards `certificate.CatalogHead` captured
under `c.mu` (`catalog.go:246`). The `Rule = "shipped"` control models
the pre-fix `dispatch.go:109` and now stands as a **regression guard**.
The orphan-fact residual (crash between fact and bridge leaves a durable
fact, no bridge, dropped reply — `catalog.go:232-236`) is model-checked
under a **quiescence-guarded** invariant (`NoOrphanFact` refutes only
when a *terminal* `crashed` op has a factless bridge; a mutation test
confirms deleting `CrashInLock` makes the control pass, so the crash
action is load-bearing — this repairs a review finding that the earlier
unguarded invariant fired on a benign in-lock transient). **Caveat:**
the model's orphan is permanent, whereas shipped protod repairs a
missing bridge on retry (`catalog.go:240-243`), so the model is stricter
than the code here. Even the shipped rule never replies without a
durable bridge — the defect was head provenance only.

### Evidence

`verify/pipeline/run.sh` — four verdicts (clean, two refutation
controls with committed traces, one independence control).

### Bounds and residuals

Two concurrent creates, certification always succeeds, no
convergence/duplicate path, head abstracted to journal position. The
spec is the ratification artifact for Task 32's `catalog_head`
provenance; the journal gate has since landed (`verify/journal/`), and
replay soundness is the named next increment.

### Checkable at

[verify/pipeline/](verify/pipeline/) (spec, configs, committed traces,
run record in README).

## Workflow replay soundness — model-level R5 (Lean) + R2 (TLC)

> **ARCHIVED 2026-08-15.** `verify/replay/` left the working tree in
> the estate-focus purge and is intact at tag
> `archive/pre-estate-focus`. This checkout no longer asserts the
> claim; the entry is kept as the record, checkable at the tag. Its
> theorems remain the floor tickets 008/020 must stand on if the
> workflow lane returns.

### Claim

For a static workflow DAG (topological numbering; labels-as-identity,
the ratified v0 position) with deterministic bodies, under the register
step axioms (first commit wins, commits only of ready nodes, duplicate
commits absorbed, crashed attempts invisible): every committed value is
the denotation (`exec_coherent`), any two executions agree on everything
both committed (`determinacy`), any two schedules **complete over the
same node set agree pointwise on that set** — the committed
linearization is a decision about order, never about values
(`schedule_irrelevance`; the theorem quantifies over nodes `< k` for a
completion frontier `k`, review-corrected from an unqualified "pointwise
equal") — and fold-over-Done from any reachable store reproduces the
denotation at every node — **replay is execution** (`replay_sound`). The
ready guard is load-bearing, not hygiene: without it, two schedules of a
two-node workflow commit different values at the same node, proved as a
Lean counterexample (`faithless_diverges`) and independently found by
TLC (`SpecEval` refuted). **Scope of the TLC check (review-corrected,
2026-08-14).** The bounded TLC model exercises the register protocol
shape — two workers, lease-expiry steals with fence bumps, fence-checked
commits — and mutation-testing confirms its **ready-guard** discriminator
is load-bearing (removing it makes the faithless control pass). But
`SpecEval` is **by design insensitive to the fence mechanism itself**:
because bodies are deterministic and `Done` is terminal, *who* commits
and *at which fence* cannot change *what* is committed, so removing the
fence bump or the commit-side authority check leaves the verdicts
unchanged. The fence's *safety* (no double-commit, unique terminal
outcome) is the effector's own EL laws (`go/effector`, claimed R3+R4),
**not** what this gate checks. This gate checks value-invariance under
the ready guard; it does not re-verify the register.

### Evidence

`verify/replay/run.sh` — three verdicts: `lake build` (no `sorry`, core
only), TLC clean, TLC faithless control refuted on exactly `SpecEval`.

### Bounds and residuals

Lean: model-level — the register step axioms are DISCHARGED IN PROSE by
the effector's proven laws (fence safety, unique terminal outcome), not
by a machine-checked refinement; that correspondence is the R4-style
obligation once tickets 008/020 build the engine. Dynamic control flow
is out of scope by design (choices must enter as committed facts;
design §3 staging). TLC: DAG `1 → 3 ← 2`, two workers, fence cap 3, 376
states. This entry is the pre-build license the workflow design named:
the engine may now be built against a proved contract.

### Checkable at

[verify/replay/](verify/replay/) (Lean project, spec, configs, committed
trace, run record in README) and
[docs/design/2026-08-14-workflow-authoring-and-emission.md](docs/design/2026-08-14-workflow-authoring-and-emission.md) §5.1.

## Standing assumptions

1. SHA-256 collision resistance. Identity claims reduce to it.
2. RFC 8785 canonicalization agreement across implementations — tested
   by the R1 differential lane above, the official Appendix B corpus,
   and the older golden conformance fixture
   ([fixtures/golden-conformance.json](fixtures/golden-conformance.json)).
3. JetStream properties at the pinned versions in the single embedded,
   file-backed, R1 server configuration. The executable gate is
   [go/substrate/assumptions_test.go](go/substrate/assumptions_test.go),
   one named test per assumption:

   | Property | Test |
   | --- | --- |
   | Atomic create-if-absent | `TestAtomicCreateIfAbsent` |
   | Revision CAS | `TestRevisionCAS` |
   | Linearizable reads | `TestLinearizableReads` |
   | Terminal immutability | `TestTerminalImmutability` |

   The fourth property is enforced only inside the certified capability
   envelope: application credentials are refused KV `Delete` and
   `Purge`, and the same gate scans production effector/daemon source
   for destructive register call sites. Its required negative control
   proves privileged admin credentials can still erase `Done`, after
   which `Lookup` reports `Unclaimed` and a new fence-1 claim succeeds.
   Admin erasure is therefore a stated residual — not prevented or
   detected today;
   [ticket 017](docs/map/tickets/017-done-outlives-the-register.md)
   adds hash-chained outcome facts so it becomes detectable. Source
   context remains in
   [the source-verification report](docs/research/2026-08-12-jetstream-guarantees-source-verified.md).
   `protod.Acquire` enforces the envelope: application credentials have
   only the three-verb writ, and clustered JetStream, R>1 KV buckets,
   or in-memory storage refuse before startup with a typed lifecycle
   error naming the uncovered assumption. Each application connection is also
   isolated in a private NATS account with only the writ service-imported: a
   two-client black-box control proves an `_INBOX.>` subscription cannot read
   another client's replies or the daemon's JetStream responses, while the
   victim's own request/reply succeeds and forged inbox publication remains
   permission-refused
   ([proto/go/protod/lifecycle_test.go](proto/go/protod/lifecycle_test.go)).
   Acquisition also requires an
   explicit `crash-durable` or `power-durable` sync mode; journal and effector
   gates refuse async stream persistence and latch every pinned stream-update
   advisory after Open
   ([proto/go/protod/lifecycle_test.go](proto/go/protod/lifecycle_test.go)).
4. NATS operational census: duplicate-window metadata persists across restart,
   but journal correctness relies on expected-sequence CAS plus digest re-read;
   client pending overflow is a loud disconnect, JetStream API IPQ loss is the
   counted-log residual above, and per-stream internal queues may drop under
   burst (mostly mitigated, not eliminated, by synchronous acknowledgements);
   `journald` sets the Go runtime memory limit to 512 MiB and `protod` defaults
   to 512 MiB while its command flag may explicitly override that value (direct
   library embedders own their process limit);
   both daemons build server options programmatically and load no config file,
   so include/file precedence is outside this envelope. Daemon-owned and bundled
   client connections have app/version/purpose names; arbitrary NATS clients are
   not required to supply one.
5. Safety only. No liveness claim is made anywhere: leases, retries,
   and progress under contention are liveness machinery and are
   untested formally.

## Stated limitations, ahead of their surfaces

Recorded 2026-08-13 so no future surface overclaims (evidence:
docs/research/2026-08-13-language-ontology-frontier.md):

- Positive-example-only grammar authoring is unlearnable in principle
  (Gold 1967); any NL→DSL surface therefore requires the refusal
  round-trip — the teaching loop is load-bearing, not UX.
- Grammar-constrained decoding distorts an LLM's conditional
  distribution (Grammar-Aligned Decoding, NeurIPS 2024): forced
  validity is a syntactic claim, never a semantic one.
- The semantic gap — whether an induced grammar/ontology means what
  the description meant — is irreducible; foldlab's claim is
  recomputability of what was built, never fidelity to intent.
- Exploration bounds are minimum-cardinality, not small: the
  canonical basis can be exponential and next-question computation is
  coNP-complete; budgets and partial-basis refusals are the honest
  interface to that edge.

## How to refute a claim

Refutation is a contribution, and the machinery ships in the repo.
Each kind of claim falls to one kind of artifact:

| Claim kind | What refutes it |
| --- | --- |
| Wall claim | a byte: inputs on which the two implementations disagree |
| Model claim | a trace: a TLC run violating a named invariant at the stated bounds (the sabotaged variants show what a violation looks like) |
| Conformance claim | a divergence: a schedule on which the binary and the model disagree |

Counterexamples are kept and committed — the repository already
carries five of its own.
