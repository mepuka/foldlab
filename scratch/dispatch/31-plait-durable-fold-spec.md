# Dispatch 31 — Plait slice 1, the runtime: the durable fold (executor spec)

Status: spec FINAL for dispatch, 2026-08-17, under the Plait
ratification record (`docs/design/2026-08-17-plait-ratification-record.md`,
both waves; laws: `2026-08-17-plait-coordination-fabric.md` §5.4 — C4
**as amended 2026-08-17** — §6.3, §9.1, and §10 slice 1; the
architecture record `2026-08-17-plait-architecture.md` is BINDING for
module placement; the merged model `verify/fabric` is the authority for
law content; the wave-1 design-fidelity review's S1/D2/S3 findings and
their routings are folded into decisions 3, 5, and 8 below). The
dispatch trigger is met: wave 1 closed — dispatch 29 (spine, PR #67,
merged `b51d1d8c4`) and dispatch 30 (fabric model, PR #66, merged
`850779722`) are on main. Board: project `plait`, epic E4. The issue
body is this spec.

**Authority precedence** (retro adoption T1): binding architecture
record > the named program-doc sections above > this spec's decisions.
Where this spec's wording appears to contradict a binding authority,
the authority governs and the executor FILES A FINDING rather than
choosing a reading. One finding is pre-filed by the coordinator
(fidelity review D3): four part-1 sites still carry the pre-amendment
floor-guard language after §5.4 was amended — §6.3's "ACI or
floor-guarded", §9.2's F2b row, §10 slice 1's "floor guard removed"
control, §11's demo control. The C4 amendment and the DEV-695 round-3
ruling (comment `7cb08c80`) supersede all four; decision 4 and control
(i) below are written to the amended law, and the record amendment is
the coordinator's, not this slice's.

**Ledger law** (ruling G6): the executor never edits VERIFICATION.md.
The closing report PROPOSES the row text — the short status-table row
plus the full section in the house four-part shape (Claim / Evidence /
Bounds and residuals / Checkable at) — and the coordinator lands it.

## Objective

`Folds.deploy` exists: anchor-guarded, crash-indifferent consumption of
declared evidence lanes in `packages/plait`, walled row-for-row against
the `verify/fabric` conformance corpus, and proven at runtime by two
chaos harnesses — a hard-kill/resume gate and a real-redelivery
duplication gate — to produce byte-identical state digests. This is
where F2b and F3 stop being theorems about lists and start being the
reason a kill -9 costs nothing. No registers, no cells, no sessions.

## Spec-fixed decisions (the executor edits none of these)

1. **Home and modules**: `packages/plait` per the architecture record
   §2. This slice fills `Lane.ts`, `Algebra.ts`, `Fold.ts`, `Anchor.ts`
   and the internal consumer pump (`internal/`); absent modules stay
   absent, not stubbed. `Lane.ts` is in scope because a fold declares
   over a lane (part 1 §8.3): minimal surface — `declare`, `emit`, the
   partition-key derivation (identity-bearing: it enters the lane
   declaration digest); consumption belongs to the pump. Dependencies
   unchanged (ruling G7 as bounded by the external-only clarification,
   API log 0025); `fast-check` enters as a devDependency only — the
   `packages/moves` precedent, ruled mid-flight — for the generated law
   suites.
2. **Identity**: fold states and lane events are wire-grammar values;
   the state digest is SHA-256 over canonical uncompressed bytes via
   slice 0's `Canonical`/`Digest` seam; anchors carry
   `(floor, stateDigest, head)`; nothing ever fingerprints a transport
   form.
3. **Brands are earned, never asserted** (F4): `Algebra.commutative` is
   a claim checked by the generated law suite — associativity,
   commutativity, identity, **and the step↔algebra compatibility
   property** (fidelity review D2: without it the brand would license
   partitioned deployment of step folds F4 does not speak about) —
   generated from the declaration and run in CI. The compatibility
   requirement is satisfiable two ways, executor DECISION recorded:
   the suite checks that the declared step factors through per-op
   contributions merged by the algebra, or `Fold.declare` derives the
   step from a contribution function so compatibility holds by
   construction. Either way the brand licenses exactly what F4 plus
   the bridge lemma (brief 34's verify/fabric item) cover.
   `Fold.declare` with `partitions > 1` requires the brand at the
   type AND re-checks at declaration: an unearned brand is a structural
   refusal naming the F4 law. No brand, no partitions.
4. **The pump discipline is the successor discipline** (C4 as amended;
   the merged model's shape, implemented over JetStream): one durable
   pull consumer per `(foldDigest, lane, partition)`, explicit ack.
   Within a partition the pump maintains a bounded position-addressed
   reorder buffer and applies ONLY at the contiguous frontier — the
   runtime realization of the model's `ingestSchedule` (raw arrivals
   folded into the position-addressed buffer, arrival order free,
   redelivery replacing only its own position) and `applySuccessors`
   (drain exactly the consecutive successors at `floor + 1`; a gap
   stops application; an ahead-of-frontier entry never advances over
   it) — both read in place at `verify/fabric/Fabric/Definitions.lean`.
   The law this walls against is `F2bGuardedExactlyOnce` under
   `F2bSerialSuccessorPremise`: in-window support equal to the
   contiguous positioned trace, multiplicity and arrival order free,
   stale deliveries admitted and harmless. Position is the message's
   JetStream stream sequence. **The anchor floor is the derived record
   of the applied frontier — the resume coordinate — never itself the
   protector** (`guard_is_redundant` is the rostered proof that a
   position-floor guard is observationally redundant given the
   discipline; the runtime therefore ships no such guard as a claimed
   defense, per the round-3 ruling "the estate refuses defenses against
   scenarios the model proves cannot happen"). The buffer's bound and
   the in-flight window are executor DECISIONS recorded as flow
   control with no correctness stake. The anchor advances by
   revision-CAS `update(rev)` on `flb-fab-anchor`; **the ack floor
   advances only after the anchor CAS covering those messages lands**
   — acked ⊆ anchored, always (the §6.3 fold-frontier row). Ack is
   flow control, never correctness; the `Nats-Msg-Id` dedup window is
   never a correctness mechanism; no exactly-once claim exists anywhere
   in this slice (correctness is the successor discipline). One shape
   note carried from the fidelity review: the model is batch
   ingest-then-drain; the pump interleaves ingest and drain
   incrementally — terminal-digest equality between the two shapes is
   exactly what the wall and the chaos gates check, and no new theorem
   is demanded for it.
5. **The pump does NOT build over the shipped subscribe path**
   (fidelity review S1, adopted). The merged receive path
   (`packages/plait/src/FabricClient.ts:23-39`,
   `src/internal/nats.ts:170-202`) discards the stream position, the
   ack handle, and the delivered subject — exactly the coordinates the
   successor discipline and the anchor floor key on — and its consumer
   is ephemeral, delete-on-scope-close, never acking. That surface
   stays what it is: `subscribe` remains the plain advisory
   evidence-read. This slice adds a NEW internal consumer seam — a
   durable pull consumer with explicit ack — whose consumption unit is
   the **positioned durable-pump record**, fixed here in shape:
   subject-as-delivered (the real per-message subject, which under
   wildcard consumption carries partition identity — never the
   caller's filter echoed back), the stream position (JetStream
   sequence), the verified envelope with its re-derived digest, and
   the ack handle. The record is an internal type consumed by the
   pump; nothing NATS-typed crosses the public seam (the architecture
   record's quarantine, machine-checked by the existing conformance
   gate); `ReceivedEnvelope` and `subscribe` are not reshaped.
6. **A lost anchor CAS is a fatal detach.** A pump whose anchor
   `update(rev)` refuses (revision moved) halts and reports with a
   typed refusal — it never re-reads-and-continues. One live pump per
   `(foldDigest, partition)` is a **stated operational assumption** of
   this slice; register-enforced exclusivity is E5 machinery wired in a
   later epic, and the assumption rides the bounds of every claim this
   slice proposes.
7. **Resumption is the only verb**: `deploy` resumes from the anchor or
   starts fresh; no reset, rebuild, or offset-manipulation API exists
   (the declared-rights table, part 1 §8.4). Restart is re-attach.
8. **The wall**: the runtime reproduces the `verify/fabric` corpus
   verdicts row-for-row over the consumed families — counts pinned,
   zero skips inside a consumed family. **This wall is the consumption
   the amended fabric ledger row awaits** (fidelity review D1: the row
   now records that nothing consumes the corpus yet and its only guard
   is the non-required lane; this slice's replay plus dispatch 33's
   tripwire are what close that named gap). Consumed from the landed
   corpus (7 of 11 rows, by name): F2 `duplicated-deliveries` and
   `permuted-evidence-schedule`; F2b `floor-violating-stale-replay`,
   `duplicate-current-delivery`, and `bounded-reordered-delivery`; F3
   `checkpoint-resume`; F4 `partition-interleaving`. Named exclusions,
   with the reason in the gate output: F1 `cell-merge-aci` (ruled
   mid-flight: `Cell.ts` and the F1 family land with E6 — a sequencing
   fact, not a narrowing); `alphabet-refusal non-commuting-intruder`
   (admission is the envelope/lane decode seam, slice 0's wall); the
   two F9 rows (the action plane's, E9). **The corpus additionally
   gains this slice's own shapes** (fidelity review S3, routed here):
   the emitter grows a composed resume-then-redeliver family (F3∘F2b —
   fold a prefix, checkpoint, then a duplicated/reordered suffix
   schedule from the new floor: the kill-9 shape), an
   ahead-of-ceiling-arrival row (buffered, never applied), a multi-gap
   window row, and a whole-schedule redeliver-everything-twice-shuffled
   row (§10 slice 1's own harness wording) — each new row naming its
   theorem instance, regeneration byte-identical, counts re-pinned,
   and every new family consumed by this wall with zero skips. This is
   the ONE sanctioned write under `verify/fabric` in this slice,
   fenced to the emitter corpus surface (`Corpus.lean` families,
   `BridgeProofs.lean` witness instances, `run.sh` pinned counts and
   roster lines for the new witnesses); the F1–F9 law statements and
   their proofs are untouched, and a family that would need a LAW
   change is a BLOCKER reported to the coordinator, never a silent
   repair.
9. **Chaos gates run on the real substrate**: local pinned
   `nats-server v2.14.4`, single node, non-clustered, R=1, file-backed
   temp dir — the substrate envelope (ruling G3); reuse dispatch 29's
   server harness and its recorded binary-acquisition decision. (a)
   **kill/resume**: hard-kill the pump process mid-stream (no shutdown
   path may run — SIGKILL/TerminateProcess semantics; the mechanics per
   platform are an executor DECISION under that constraint), restart,
   drain; terminal per-partition state digests are byte-equal to an
   uninterrupted run's, and equal to the model's vector wherever the
   event trace is a corpus row. (b) **duplication**: redeliveries are
   manufactured through the consumer protocol only — withheld acks,
   nak, ack-timeout, crash — never by republishing (a republish mints a
   new stream sequence and tests nothing); a tranche is redelivered at
   least twice, interleaved within JetStream's real semantics; digests
   unchanged. The harness algebra roster includes a **non-idempotent
   commutative counter** (the successor discipline load-bearing)
   deployed on `partitions ≥ 2`; the merged terminal state — combined
   harness-side via the declared algebra, no new public read API —
   equals the sequential reference and the model's F4 vector.
10. **Harness inputs are generated**: event corpora are drawn from the
    `verify/fabric` fixtures (decision 8's extended families included)
    or emitted by a generator whose command is the recorded provenance
    line; expected digests are never hand-typed (the generated-vectors
    ruling, inherited whole).

## Gates (mechanical)

Each line names where the gate is wired; the PR must show it executing
at the head.

- `bun run gates` green with the package wired (battery + `gates.yml`);
  package `bun run test` green from its own directory
  (`test:packages`).
- The row-for-row wall green as a package test in `test:packages`:
  consumed families enumerated, counts pinned (7 landed rows plus
  every decision-8 extension row), zero skips;
  exclusions named in the gate output with their ruled homes.
- Chaos gates (a) and (b) green as specified, digest equality checked
  by bytes; wired into the package test suite behind the same local
  server harness as the round trip (an unrunnable chaos gate is a red
  gate, not a skipped one).
- Negative controls, each committed with its trace, each naming the
  component it removes and claiming that component load-bearing (if
  the executor or reviewer proves one is NOT load-bearing, that proof
  is the deliverable and the control is renamed — the
  `guard_is_redundant` path is the expected path, not a surprise):
  (i) an **arrival-order pump variant** — the successor discipline
  dropped: no reorder buffer, application in delivery order — is
  killed by the duplication chaos gate and by the F2b
  `bounded-reordered-delivery` and `duplicate-current-delivery` rows
  (the model's 6-before-5 shape: applying ahead advances the frontier
  and the skipped event is lost; duplicate application breaks the
  non-idempotent counter); (ii) a deliberately non-commutative algebra
  declared with `partitions: 2` is refused at declaration with a
  structural refusal naming F4 (the brand is absent), and a declared
  step that is NOT compatible with its algebra (decision 3's new
  property) is refused or killed by the generated suite the same way;
  (iii) an ack-before-anchor pump mutant is killed by the kill/resume
  gate (events acked past the anchor are lost to redelivery and the
  digest diverges).
- The extended emitter families (decision 8): `bash
  verify/fabric/run.sh` green at the head with the new rows —
  regeneration byte-identical, counts re-pinned, every new row's
  witness rostered and footprint-checked; wired where the fabric gate
  already runs (`lean-gates.yml`).
- No imports from `repos/`; no dependency beyond ruling G7 as decision
  1 states it (`fast-check` dev-only per the ruled precedent).
- No VERIFICATION.md edit (ruling G6; the ledger law above).

## The chaos CLI ticket (rider, ratified grill item 13)

One ticket is appended to E4's scope, dispatched by the coordinator as
its own issue once the fold lands: a thin `plait chaos` harness that
RE-DRESSES this slice's already-mandatory chaos gates as a CLI entry
over the developer's own **declared fold** — it does not accept
arbitrary programs; the output is a measured scoreboard plus the
digest-equality verdict; no claim beyond the measurement (the
machine-checked half is delivered by citation of the law names and the
corpus digest, never by re-proving at runtime); E10 is not pulled
forward. The ticket is SEVERABLE: its cost is a spec-level estimate,
the closing report re-prices it, and if the entry point needs chaos
machinery this slice's gates do not already build, the ticket is
dropped, not grown. If the Design seat's scope note
(`docs/design/plait-chaos-cli-note.md`, on the DEV-707 branch at this
writing) has merged by dispatch time, it binds the CLI surface; until
then the ratified sheet's fence above stands alone.

## Blockers and cross-slice writes

Both wave-1 dependencies are merged; no blockers at dispatch. A
corpus family that would need a LAW change (decision 8) is a blocker
report, not local repair. Cross-slice writes, named: this slice and
E5 (dispatch 32) both add internal KV adapter machinery under
`packages/plait`; this slice's fenced emitter extension and brief
34's fabric proof items both touch `verify/fabric` (additive,
disjoint in function — families vs. bridge/retained-property
theorems); the fidelity review's "close it before E4 builds
`Folds.deploy`" sentence makes brief 34's bridge lemma the natural
first mover. Branches stay separate and the coordinator sequences
every merge — the second lane to merge rebases and reports, never
improvises a reconciliation.

## Non-goals

Registers and leases (E5), cells (`Cell.ts`, E6 per the mid-flight
ruling), contexts (slice 2a), sessions over the fabric (slice 4),
federation (slice 3), blobs, work-queue hints, MCP, codegen; any edit
under `verify/fabric` beyond decision 8's fenced emitter surface (a
law-level gap is a finding); reshaping `ReceivedEnvelope` or
`subscribe` (decision 5 adds a seam, changes no shipped surface); any
daemon change; any VERIFICATION.md edit; any exactly-once or liveness
claim; the chaos CLI build itself (the rider is its own ticket).

## Closing report extra

A guided tour of the slice for the operator — module by module, what
each is and why it is shaped that way, glossing every Effect idiom used
(the pump's fiber structure, `Scope`-bound consumers, the brand
pattern, interruption) — the education rule applies. The tour's
attribution language matches the amended C4: the successor discipline
protects; the floor records. Plus the wire scoreboard, measured not
narrated: redeliveries absorbed, buffered-out-of-order arrivals
drained, anchor writes, refusals by kind/sort. Plus the proposed
VERIFICATION.md row text for the coordinator to land (the ledger law):
short table row + full Claim/Evidence/Bounds/Checkable section; rung
R0/R1 walls — the runtime is walled against the model that is proven,
never itself "proven" (the §9.1 sentence ships verbatim); bounds — the
single-pump-per-partition assumption, the non-clustered R=1 envelope,
no exactly-once, no liveness. The proposal also offers the fabric
row's consumption-sentence upgrade (fidelity review D1: the amended
row's "nothing consumes the corpus yet" becomes "consumed by the E4
replay wall" once this slice merges) — proposed, never landed, by the
executor.

Seats: Eng builds on `agent/<seat>/<ISSUE>` — the coordinator
substitutes the literal branch name in the issue body at dispatch and
deletes any abandoned-run branch first (retro Q5). Rev reviews the PR
head; if the head differs from the ref named in the charge, review the
head, say so, and state whether the difference is material (retro Q4).
Coordinator merges. DECISIONS log per house rule.
