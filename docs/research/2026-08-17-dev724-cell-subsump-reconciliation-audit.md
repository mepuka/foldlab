# DEV-724 cell subsumption reconciliation audit

Date: 2026-08-17

Exact implementation reviewed: PR 81 head
[`1848b154610b407e8cced92765bccfb6ff45d0a0`](https://github.com/mepuka/foldlab/commit/1848b154610b407e8cced92765bccfb6ff45d0a0)

Discussion reviewed: Multica DEV-724 and DEV-727, especially DEV-727 finding
F-2 (`6b7b10eb-be9e-401f-b55e-5aa60142be0e`) and the DEV-724 round-2 ruling
(`f6a1a4a5-4b9b-4a54-815c-304295eaf6eb`).

## Finding

**T16's subsumption rule is sound for the abstract operation `merge(delta)`,
and a discriminating bounded schedule exists, but the reason it is
load-bearing is narrower than “convergent by F1.”**

The decisive schedule is the `CELL_MERGE_ATTEMPTS = 8` boundary:

1. Attempts 1–7 each lose their revision CAS to a lawful rival join whose
   read-back still lacks this operation's delta.
2. Attempt 8 loses to a lawful rival join that includes this delta plus one
   fresh observation.
3. The read-back is therefore a strict superstate of the stale intended bytes.
   Subsumption recognizes that the abstract merge postcondition already holds
   and returns success. Byte equality rejects the superstate; there is no ninth
   pre-CAS subsumption check, so it returns `cell-update-contended` even though
   the delta is present.

The deterministic abstract probe reproduces exactly that boundary: subsumption
returns success after 8 CAS attempts; equality exhausts after 8. Its partial
attempt-1 case also matters: equality misses the strict superstate but succeeds
on the next loop read with **no second CAS**, because the unchanged pre-CAS
guard already uses subsumption. The attempt-1 argument does not generalize to
the last permitted attempt.

This licenses T16 as **load-bearing: yes for bounded result classification**.
It does not make subsumption safer than equality, prove general progress, or
extend the Lean F1 theorem to NATS.

## 1. The exact theorem

Let `(L, <=, join)` be a join-semilattice. Let:

- `c` be the state read before the CAS;
- `d` be this operation's delta;
- `a = c join d` be the attempted value; and
- `r` be the committed read-back after the failed/ambiguous call.

For the strong predicate named in the research question, `a <= r`:

1. `d <= a`, because `a` is an upper bound of `c` and `d`.
2. Hence `d <= r`, by transitivity.
3. Therefore `r join d = r`, by the least-upper-bound law.

The abstract operation `merge(d) : s -> s join d` can consequently be placed
at the read-back as an idempotent no-op. It is safe to report that the **merge
postcondition is established**. It is not safe to report that this physical CAS
append landed or that this caller authored `r`: a rival may have written the
same or a larger state.

This use of “placed at the read-back” is an inference from Herlihy and Wing's
definition of linearizability, under which a completed concurrent operation
must correspond to a legal sequential operation between invocation and
response. It is not a claim that their paper proves this adapter linearizable;
the atomic-read/CAS and history premises below remain separate obligations.

### The code checks a weaker predicate

PR 81 does not test `a <= r`. Its `subsumes(readBack, delta)` tests only
`d <= r`, implemented as `join(r, d) == r` in canonical bytes
([`cells.ts:217-225`](https://github.com/mepuka/foldlab/blob/1848b154610b407e8cced92765bccfb6ff45d0a0/packages/plait/src/internal/cells.ts#L217-L225),
called at
[`cells.ts:257`](https://github.com/mepuka/foldlab/blob/1848b154610b407e8cced92765bccfb6ff45d0a0/packages/plait/src/internal/cells.ts#L253-L260)).
That weaker predicate is enough for the abstract operation's immediate
postcondition: `r join d = r` is exactly what `merge(d)` requires.

It is **not** enough to prove that `r` preserved `c`. For example, a raw
replacement can move from `{old}` to `{new}` while `d = {new}`; the code accepts
because `d <= r`, although `c join d` is not below `r`. Preservation therefore
comes from the trusted-writer monotone-history premise, not from the predicate.
Within such a history, `c <= r`; combined with `d <= r`, the LUB property gives
`c join d <= r`, recovering the strong predicate.

## 2. Every load-bearing premise

Subsumption is safe only under all of the following:

1. **Genuine semilattice.** `<=` is the semantic partial order on the full
   stored payload and `join` is its LUB. The runtime byte test must faithfully
   decide that order: canonical encoding is unique for the admitted carrier,
   and stored states are canonical.
2. **Merge API, not append API.** The public contract is “ensure `d <= state`”
   or `state := state join d`. It makes no promise of a physical append,
   authorship, first-writer status, exact revision, or exact stale intended
   bytes.
3. **Authentic committed read.** `r` is an atomic committed read of the same
   logical cell, schema, and key during the invocation. A forged, speculative,
   projected, or incomparable-replica value is not enough.
4. **One fixed backing-stream incarnation.** Delete/recreate, restore, or
   rollback may reset or fork the history. The PR documents this bound, but the
   predicate cannot enforce it.
5. **Every writer is inflationary.** All admitted state transitions are joins.
   Raw replacement, delete, purge, restore, rollback, retention mutation that
   removes the current value, and any trusted writer that emits a downward
   state violate the reasoning. This is an operational credential/service
   boundary, not an F1 theorem.
6. **Persistence claims need future monotonicity.** PR 81 performs another read
   before returning (`cells.ts:262`). To infer that the returned state still
   carries `d`, transitions after the reconciliation read must also be
   inflationary.
7. **Validity is established elsewhere.** A structurally valid foreign
   observation is an ordinary member of the model's carrier. Subsumption does
   not authenticate provenance or prove that an observation was verified
   before admission.
8. **No liveness inference.** The fixed bound terminates the call, but neither
   fairness nor eventual uncontended progress follows. Retrying an idempotent
   delta is safe; it is not guaranteed to succeed.

## 3. What the Lean model proves—and does not

The exact PR head defines a cell as a finite set and merge as union
([`Definitions.lean:20-39`](https://github.com/mepuka/foldlab/blob/1848b154610b407e8cced92765bccfb6ff45d0a0/verify/fabric/Fabric/Definitions.lean#L20-L39)).
Its F1 statements are:

- union is associative, commutative, and idempotent; and
- equal observation membership determines equal cells
  ([`Laws.lean:14-28`](https://github.com/mepuka/foldlab/blob/1848b154610b407e8cced92765bccfb6ff45d0a0/verify/fabric/Fabric/Laws.lean#L14-L28)).

The corresponding kernel proofs reduce the laws to finite-set membership
([`Proofs.lean:8-51`](https://github.com/mepuka/foldlab/blob/1848b154610b407e8cced92765bccfb6ff45d0a0/verify/fabric/Fabric/Proofs.lean#L8-L51)).
F2 separately shows that equal delivered support yields the same terminal set.

Those facts are pertinent because they license the set-union carrier,
idempotent reapplication, and the equation `r join d = r`. They do **not**
state or prove:

- a CAS/read-back transition system;
- that KV revisions or reads are atomic;
- that every runtime writer performs a join;
- authentication, observation validity, or fixed incarnation;
- the eight-attempt boundary; or
- termination, fairness, or runtime correspondence.

Calling the reconciliation “what F1 buys” is therefore defensible only as an
algebraic dependency. The runtime theorem is F1 **plus** the substrate and
operational premises above.

## 4. Equality versus subsumption

| Property | Subsumption `d <= r` | Byte equality `r == a` |
| --- | --- | --- |
| Safety for abstract `merge(d)` | Necessary and sufficient at the observed state, under faithful order | Sufficient but stronger than the postcondition |
| Proves this CAS landed/authored state | No | No—a rival can independently write exactly `a` |
| Accepts lawful concurrent inflation `r = a join q > a` | Yes | No |
| Definitive CAS conflict before final attempt | Returns immediately if delta is present | Misses, then the next pre-CAS subsumption guard returns; one extra loop read, no extra CAS |
| Final (8th) CAS conflict with strict superstate carrying delta | Success | False `cell-update-contended`; there is no ninth guard |
| Ambiguous non-CAS failure with strict superstate | Can establish the postcondition and succeed | Cannot distinguish that case; the current control flow returns transport absence when equality fails |
| Local comparison cost | Current implementation joins/canonicalizes to decide order | Can compare the already-attempted canonical bytes; locally cheaper in principle |
| Contention cost | Avoids a needless read/false refusal in the strict-superstate cases | May add one read, and at the retry boundary changes success to retryable absence |
| Integrity/corruption detection | None beyond structural decode and the order test | Exact snapshot comparison only; still not provenance or general corruption detection |

The performance row is analytical, not benchmark evidence. PR 81 contains no
measurement comparing the two predicates.

## 5. Deterministic schedules and probe

Probe source:

[`reference/dev724-cell-subsumption/probe.ts`](reference/dev724-cell-subsumption/probe.ts)

Recorded output:
[`reference/dev724-cell-subsumption/output.txt`](reference/dev724-cell-subsumption/output.txt)

Run from the repository root:

```text
bun run docs/research/reference/dev724-cell-subsumption/probe.ts
```

The probe mirrors only the two relevant PR control points:

- pre-CAS `d <= current` at `cells.ts:243`; and
- post-failure reconciliation at `cells.ts:257`.

It runs two deterministic monotone schedules:

- **Strict superstate on attempt 1:** subsumption returns during
  reconciliation. Equality retries, then returns at the next pre-CAS guard.
  Both issue one CAS.
- **Strict superstate on attempt 8:** attempts 1–7 add fresh `gamma-i` values
  without `beta`; attempt 8 adds `beta` and `gamma-8`. Subsumption succeeds;
  equality exhausts the bound.

The second schedule is minimal relative to an eight-attempt bound: to reach
the boundary, the first seven reconciliation reads must lack `d`; the first
strict superstate that contains `d` must appear after the eighth failed CAS.

This pure probe is pertinent because the disagreement follows from loop control
and semilattice order, without timing. It is **not** a NATS wall, a model
verdict, a property test, or evidence that the current one-shot `HoldProxy`
can drive eight barriers. The durable wall still needs a live, multi-capture
barrier schedule and the one-line equality mutant. It must describe the row as
a handwritten contract test, not a model-emitted verdict.

### The round-2 transport-failure row is valid but not the ruled row

While this audit was running, the round-2 executor reported a different live
discriminator: on attempt 1, make the publish fail with a **transport-class**
error after the committed read-back has come to carry the delta. Subsumption
returns success; the equality alternative rejects the larger bytes and, because
the cause is not code 10071, immediately returns
`cell-transport-unavailable`. That is useful evidence for genuinely ambiguous
transport outcomes and agrees with the theorem above.

It is not a substitute for the coordinator's exact R2-1 charge, which asks for
`CELL_MERGE_ATTEMPTS` exhaustion under CAS contention. Any WIP comment claiming
that contention cannot distinguish the predicates is refuted by the attempt-8
boundary schedule: the next-iteration guard helps only when a next iteration
exists. The two rows license distinct, narrow statements:

- transport row: ambiguous-error classification at attempt 1;
- attempt-8 row: bounded CAS-contention success versus retryable absence.

## 6. Does exact final-digest checking cover corruption?

Only within the existing wall's fixed schedule.

DEV-727 usefully showed that replacing the reconciliation predicate with
“accept any non-empty read-back” makes the lost-CAS test fail its exact digest
comparison. In that row, the model verdict requires `alpha`, `beta`, and
`gamma`; returning the rival state without `beta` is detected. This is
pertinent evidence that the wall distinguishes “delta carried” from “some
state exists.”

It is not a general integrity theorem:

- `decodeCell` checks the JSON shape, not observation provenance.
- F1 quantifies over arbitrary holder/value pairs and has no corrupt-state
  predicate.
- A foreign but structurally valid observation produces a larger set. If it
  carries `d`, subsumption accepts it; if equality rejects it, re-read-and-
  re-merge preserves it because join cannot remove information.
- The test knows an exact expected set because it controls that schedule.
  Production generally does not know the complete legitimate set in advance.

Therefore neither equality nor subsumption is the corruption oracle. The
load-bearing integrity controls are exclusive join-write authority,
verify-before-admission, authentic reads, and lifecycle exclusion. The final
digest wall remains valuable differential evidence for its named vector, but
must not be cited as a general trusted-writer proof.

## 7. T16 and ledger wording licensed by the evidence

### T16 disposition

Keep **load-bearing: yes only after the discriminating live row lands**. Replace
the present evidence sentence—the one-race HoldProxy row does not discriminate
equality—with wording equivalent to:

> A read-back that subsumes the delta establishes the abstract merge
> postcondition; it does not establish which physical CAS authored the state.
> Under one fixed incarnation and exclusive inflationary join writers, this
> avoids a false `cell-update-contended` when the last permitted CAS loses to a
> strict superstate already carrying the delta. Load-bearing for bounded result
> classification; not a convergence, integrity, or liveness theorem.

### Wall/ledger clause after—not before—the row exists

The already-ruled rung remains **R0 differential + executable integration**,
not R1. The narrow additional clause licensed by a live discriminator is:

> A deterministic eight-conflict row establishes the bounded reconciliation
> result for one schedule: the first seven read-backs omit the delta and the
> eighth is a strict superstate carrying it; subsumption returns success while
> the equality-reconciliation mutant exhausts the eight-attempt bound.

Required adjacent bounds:

> This is finite-schedule result-classification evidence only. It proves no CAS
> authorship, fairness, wait-freedom, progress under unbounded contention,
> general corruption detection, or Lean-to-runtime refinement. It assumes one
> fixed backing-stream incarnation, authentic committed reads, and exclusive
> monotone join writers.

Do not say that byte equality drops an observation, or that subsumption alone
proves F1 convergence. In the discriminator, the rival has already stored the
delta; the difference is the caller's success/refusal result.

## 8. Primary-source assessment

1. **Shapiro, Preguiça, Baquero, and Zawirski, “Conflict-free Replicated Data
   Types” (SSS 2011), §§2.2–2.3.** The authors define a join-semilattice, require
   merge to compute the LUB and updates to be monotonically non-decreasing, and
   then derive strong eventual convergence
   ([author preprint](https://www.lip6.fr/Marc.Shapiro/papers/2011/CRDTs_SSS-2011.pdf)).
   This is the direct source for the algebra and monotone-history premises. It
   is not evidence for NATS CAS, bounded retries, linearizability, durability,
   or authentication.
2. **Shapiro et al., “A comprehensive study of Convergent and Commutative
   Replicated Data Types,” INRIA RR-7506 (2011), §§2.3.1 and 3.3.1.** The report
   defines LUB/join-semilattice and specifies the grow-only set with subset
   order and union merge
   ([author-hosted report](https://www.lip6.fr/Marc.Shapiro/papers/2011/Comprehensive-CRDTs-RR7506-2011-01.pdf)).
   It is especially pertinent because Plait's carrier is precisely a grow-only
   set. Its eventual-dissemination theorem is not the single-key CAS theorem.
3. **Almeida, Shoker, and Baquero, “Delta State Replicated Data Types,” JPDC
   111 (2018), §4.** Definitions 4.1–4.3 put a delta in the same semilattice and
   define every transition as `X' = X join delta`; the paper explicitly notes
   that delta groups may be rejoined or subsumed by a larger state
   ([DOI](https://doi.org/10.1016/j.jpdc.2017.08.003),
   [author-accessible paper](https://members.loria.fr/CIgnat/files/replication/Delta-CRDT.pdf)).
   This is the closest prior art for interpreting `delta` as an inflation whose
   effect may already reside in a larger state. It assumes CRDT joins and does
   not license raw KV overwrite or lifecycle mutation.
4. **Herlihy and Wing, “Linearizability: A Correctness Condition for Concurrent
   Objects,” TOPLAS 12(3), 1990, §2.2.** A concurrent history is correct when it
   is equivalent to a legal sequential history preserving real-time order
   ([author copy](https://www.cs.columbia.edu/~wing/publications/HerlihyWing90.pdf)).
   It is pertinent to placing an already-satisfied `merge(d)` at the read-back.
   It does not establish the adapter's atomicity or its substrate premises.
5. **Pinned Effect v4 source was not pertinent.** T16's difference is pure
   semilattice order plus a finite loop boundary; no Effect scheduler,
   cancellation, error-channel, or service-layer semantic decides it. Adding an
   Effect citation would increase pedigree without supporting the finding.

No external source states this exact CAS-reconciliation theorem. The theorem is
a short derivation from the semilattice definitions, then conditioned on the
repository's unproved runtime/substrate premises.

## Residuals and next probe

The next useful probe is the ruled live eight-conflict row at exact PR 81
semantics, with a multi-capture barrier and the one-line equality mutant at
`cells.ts:257`. It should record per attempt: state read, rival join, CAS
wrong-revision refusal, reconciliation state, and final public result. It must
also assert that every rival transition is a join and that the equality variant
changes only the reconciliation predicate.

After that row, the higher-leverage residual is not more F1 literature. It is
the operational correspondence guard: demonstrate that every principal able to
write `$KV.flb-fab-cell.*` is confined to the trusted join service, since the
code-level predicate cannot distinguish a lawful superstate from a
well-shaped unauthorized one.
