# Plait — `plait chaos`, the E4 CLI entry (design note)

Written 2026-08-17 (DEV-707) for the E4 ticket that ratified grill-sheet
item 13 commissions. Everything here is **proposed**: it is the shape of
a ticket, not a built surface. `packages/plait` and `verify/fabric` are
in review (PRs #67, #66) and not on main as this is written, so no
sentence below is a measurement.

**What the item ratified, in one line:** a thin harness lands as an E4
ticket that re-dresses E4's already-mandatory chaos gates as a CLI, and
E10 is not pulled forward.

---

## 1. Scope fence

- **It drives the developer's own declared fold**, not a canned demo and
  not an arbitrary program. The DevRel journey wrote this as
  `plait chaos ./my-program.ts` (DEV-697 §3, minute 8–10); the ratified
  fence narrows what that file may be. The reconciliation: the CLI loads
  the module, takes the **fold declaration** it exports, admits it
  through the certifier, and refuses structurally if the module yields
  anything else. The fold's algebra is the developer's code; the chaos
  schedule is ours. A cataloged fold is addressable directly by digest.
  Nothing else in the module runs.
- **The output is a measured scoreboard plus a digest-equality verdict.**
  Counts, digests, the pinned span, the seed. Facts the run observed.
- **No claim beyond the measurement.** The run reports what happened
  under *this* schedule on *this* substrate envelope (v0: one
  non-clustered JetStream node, R=1 — ruling G3). It is not a proof; it
  does not claim liveness, exactly-once, or attribution; it does not
  claim the L0 theorems verify the L2 code. The machine-checked half of
  the journey's promise is delivered by **citation** — the law names and
  the `verify/fabric` corpus digest the wall replays — never by
  re-proving anything at runtime.
- **Explicitly not E10.** The distillation gauntlet is a heterogeneous
  fleet with register shard claims, lease steal, a dispossessed zombie's
  commit, a commons restart, a conformance monitor and a planted
  violator (part 1 §11). None of that is in scope. `plait chaos` is a
  single-fold, single-node entry point over E4's own gates.
- **Severable.** Item 13's own bound: the thin-harness cost is a
  spec-level estimate, and the E4 ticket's closing report re-prices it.
  If the entry point needs chaos machinery E4's gates do not already
  build, the ticket is dropped, not grown.

## 2. The three axes, and what each one is allowed to say

Kill, duplicate, reorder are three different questions with three
different laws behind them. Conflating them is how a green tick starts
meaning nothing.

| Axis | What the harness does | Terminal-digest invariance rests on | Applies to |
| --- | --- | --- | --- |
| **kill** | hard-kill mid-stream, restart, drain to quiescence | **F3** — resumption is exact, so state at a head is a function of `(fold digest, span)` and not of the interruption pattern | every fold |
| **duplicate** | redeliver a tranche, through the consumer protocol only | **F2** for idempotent algebras; **F2b**, the successor discipline, for the rest | every fold |
| **reorder (arrivals)** | interleave redeliveries so arrival order ≠ stream order, through the consumer protocol only | **F2b** — window admission plus contiguous-frontier application restores application order | every fold |
| **reorder (partitions)** | permute the merge order across partitions | **F1/F4** — convergence under permutation | only a fold carrying `Algebra.commutative` with `partitions > 1` |

Three consequences the ticket must carry:

1. **Redeliveries and reorderings are manufactured through the consumer
   protocol only** — never by hand-injecting into the stream. This is
   draft 31 decision 8's fence on the duplication harness, and arrival
   reorder inherits it unchanged: a schedule the substrate cannot
   actually produce measures nothing about the substrate.
2. **An inapplicable axis prints `n/a` with its reason, never a pass.**
   A fold without the commutative brand cannot take `partitions > 1` —
   it does not type-check (C4/F4's rights table, ratified item 3) — so
   the partition-reorder row reads `n/a — algebra is not commutative`.
   A green tick on an axis the run could not exercise is a claim the run
   did not measure.
3. **The invariance is attributed to the discipline, never to the
   floor.** Per the DEV-695 ruling the successor discipline is what
   protects; the anchor floor is the derived record of the contiguous
   frontier, the resume coordinate (API log 0024). A scoreboard line
   reading "floor guard held" would re-publish, in the program's most
   visible surface, an attribution the coordinator has just corrected.

**Recommendation on the reorder axis:** ship arrival reorder in v0 — it
is the duplication harness's own machinery under a different schedule,
so it is near-free, and it is the axis that actually exercises F2b, the
law this merge cycle just re-attributed. Flag partition reorder and
defer it to whenever E4's partitioned path lands with a
commutative-branded sample fold. Coordinator's call; §6 item 1.

## 3. CLI surface sketch

```
plait chaos <module-path> [flags]
plait chaos --fold <digest>  [flags]
```

| Flag | Meaning | Why it is shaped this way |
| --- | --- | --- |
| `--lane <digest>` | the evidence lane the fold reads | a cataloged declaration, not a subject string (ruling G12) |
| `--head <position>` \| `--pin-head` | the pinned span end | **required.** A moving head makes "same digest" meaningless, because the two arms would fold different spans. `--pin-head` reads the head once, journals it, and uses that one value for both arms. This is API log 0006's shape — freshness is a precondition, not a wait — reaching the CLI |
| `--axis kill\|duplicate\|reorder` | repeatable; default all applicable | |
| `--seed <n>` | seeds *where* the schedule kills and duplicates | the seed is recorded in the scoreboard and replays the run. Same discipline as API log 0004: a PRNG seed is declared data, never ambient |
| `--repeat <n>` | schedules per axis | default small; the run is a quickstart, not a soak |
| `--output json\|text` | canonical scoreboard bytes, or a table | the one cataloged-declaration door serving both audiences (ruling G12; architecture §5) |
| `--report <path>` | write the scoreboard record | |

There is deliberately **no** `--reference` flag: the reference arm — an
uninterrupted, single-process, sequential fold over the same pinned span
— always runs, because the verdict *is* a comparison and there is
nothing to switch off. There is no `--force`, no staleness tolerance,
and no durability knob; the laws removed those choices, and the CLI is
not where they come back.

A petname form (`--fold prod/wordcount --at <anchor>`) is the shape the
directory slice fills in, and it is anchored because API log 0014
forbids an unanchored resolve. v0 takes a module path or a digest.

**Exits.** `0` when every applicable axis produced byte-equal terminal
digests. Non-zero on divergence, naming the axis and the schedule that
produced it. A refusal — unpinned head, uncataloged fold, a module that
exports no fold declaration — exits with the refusal printed in its six
fields (kind, sort, law, path, got/expected, next), so the CLI teaches
its reply the way every other surface does.

**Host.** The CLI needs an entry point on `@foldlab/plait` that slice 0
does not establish. Either E4 establishes it or the ticket inherits
whatever E2 leaves; §6 item 2.

## 4. The scoreboard

Measured facts only, in the dogfood rule's voice (part 1 §11 item 6):

- terminal state digest per arm (reference, and one per axis schedule)
- byte-equality verdict per axis, or `n/a` with its reason
- events admitted, applied, and suppressed at the frontier by the
  successor discipline
- redeliveries absorbed, counted at the consumer protocol
- kills executed, and the resume coordinate at each restart — labelled
  as the derived record it is
- refusals by kind and sort
- anchor writes
- wall-clock, labelled a cost measurement — not a benchmark, with no
  comparison to anything
- the run's identity: fold digest, lane digest, pinned span, seed,
  substrate envelope

And one verdict sentence, in the ledger's voice:

> Under this schedule, on this substrate envelope, the deployed runtime
> produced byte-equal terminal digests on N of N applicable axes. This
> is a measurement of one run, not a proof. The machine-checked reason
> is F3 / F2 / F2b, proven in `verify/fabric` at corpus `<digest>`.

## 5. What the E4 ticket must add to its gates

E4 already owes: anchor-guarded consumption, checkpoint facts in KV,
kill -9 resume with byte-identical digests, a duplicate-injection
harness, byte-identical vector regeneration, and its two negative
controls (part 1 §10 slice 1; DEV-686). The CLI adds these and nothing
else:

1. **The CLI reads the harness's verdict; it does not recompute it.**
   One comparison, one implementation. This is the DEV-694 S1 law
   (API log 0023) applied one level out: a second comparison is a second
   thing to drift. Gate: one planted divergence in the harness reddens
   both surfaces.
2. **A negative control on the verdict itself.** A planted state
   mutation between the two arms must make the CLI exit non-zero **and
   name the axis**. A CLI that can only print green is a demo, not a
   gate; commit the trace.
3. **The refusal path is gated.** An unpinned head, an uncataloged fold
   digest, and a module exporting no fold declaration each exit with the
   six-field refusal; at least one committed control trace.
4. **The scoreboard is a canonical value.** `--output json` emits RFC
   8785 bytes, so two runs' scoreboards diff and a run record is
   admissible evidence rather than console prose. Gate: the JSON
   scoreboard round-trips through the canonical seam.
5. **The attribution is gated, not merely reviewed.** The scoreboard's
   F2b line names the successor discipline and the anchor line is
   labelled a derived record. A grep-level check in the battery is
   enough, and it is what keeps the DEV-695 correction from being
   re-broken by the first surface that prints a scoreboard.
6. **The reorder axis is declared** — arrival-only (recommended) or
   both — and the inapplicable one prints `n/a` with its reason.
7. **A bounds clause on the ticket's ledger row** (rows land with their
   slices, ruling G6): no liveness, no exactly-once, no attribution.
   Worth one explicit sentence that the external-effect bound (API log
   0019) is *not* discharged here — a fold has no external effect, so
   nobody may generalize this CLI's green to actions.

## 6. Open items for the coordinator

1. **The reorder axis scope** — arrival reorder in v0 with partition
   reorder deferred (recommended above), or both. Both requires a
   commutative-branded sample fold and a partitioned deployment at E4.
2. **The CLI host** — does E4 establish the `@foldlab/plait` binary, or
   does the ticket wait on an E2 entry point? DEV-697's minute 0–2 row
   (`bunx @foldlab/plait dev`) implies E2 owns it and flags it as
   needing a ruling.
3. **A wording check on `<module-path>`** — the fence above reads
   "USER program" (DEV-707) as "the user's own declared fold, not our
   canned demo", which is the ratified item's own words. If something
   wider was meant, that is a scope change and this note is wrong about
   the first sentence of §1.

## 7. Sources

Ratified grill sheet item 13 (`2026-08-17-plait-grill-sheet.md`) and its
probe-ledger condition; part 1 §10 slice 1 and §11 (chaos schedule,
mechanical acceptance, the scoreboard, the claim sentence)
(`2026-08-17-plait-coordination-fabric.md`); DEV-697 §3 (the 10-minute
journey and example 2) and §4 R1 (the costing that splits on
re-dressed-gates vs parameterized-over-a-user's-program); DEV-686 (E4's
dispatched scope); the DEV-695 round-3 ruling and commit `d3649b1` (the
F2b re-attribution); API log entries 0004, 0006, 0014, 0019, 0023, 0024;
rulings G3, G6, G12.
