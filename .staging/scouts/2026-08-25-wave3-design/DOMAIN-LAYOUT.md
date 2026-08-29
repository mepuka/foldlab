# Wave-3 domain-layout decision packet

**Status: staged design proposal, 2026-08-25 — no claim gate satisfied.** It decides
nothing; each numbered decision below enters the wave-3 grill docket. Revised per the
operator's review of the first draft (nine findings, all incorporated). Evidence lives in
the appendices and in this directory's six reader reports; the packet is the decision
surface only.

*Label correction, applying directory-wide:* the reader reports and synthesis here
self-describe as "G0 advisory." Foldlab defines G0 as a recorded source identity with
hashes and receipts; read those labels as **"staged advisory; no claim gate satisfied."**
Their content is unaffected.

---

## The six decisions

### D1 — Document authority map

One authority per fact class, no overlap:

| Document | Owns | Does not own |
|---|---|---|
| `CONTEXT.md` (new) | vocabulary: minted terms and rules | behavior, status, history |
| `STORE-MODEL.md` | current semantic behavior, present tense | rulings history, proof status |
| `STORE-SHELL.md` | current executable behavior: interface, rejections, storage rules, admitted effects | rulings history, proof status |
| `MAPPING.md` | the committed disposition data | (unchanged) |
| `RULINGS.md` (new, **option a**) | every dated ruling, amendment narrative, and falsification record | current behavior |
| `LEDGER.md` (specified, seat in flight) | generated status: proofs, gates, harness | prose, promises' wording |
| `audit/` | the learning record; FINDINGS.md | ruling authority |

**The choice to rule (one arrangement, no duplication):**
**(a) recommended** — `RULINGS.md` becomes the single ruling authority; STORE-MODEL §7's
narratives, KICKOFF §18's records, and STORE-SHELL §8's table move there; the historical
documents keep stable links only. **(b)** — existing homes remain authoritative; no new
document; the model document then cannot fully shed its history job.

**Exact registry deltas the docket must carry** (finding 4 — the reorganization
contradicts the current registry's fixed-section clauses, so replacement rows are part of
the ruling, not an aftermath):

*Replace* the `STORE-MODEL.md` row (currently: Holds "…theorem inventory (M-series),
joint rulings (Q-series), amendment records (A-series)"; Update rule "amendment only
(Q10 discipline): dated paragraphs in §7/§9…"; Schema "§1–§9 fixed; inventory table one
row per M-statement") with:

> | `STORE-MODEL.md` | the model specification, normative and present-tense: problem,
> scenario, information model, semantic interface, legality construction, required
> behavior with formal traces, invalid cases, boundary cases, exclusions | the model's
> single authority for current behavior; statement pinning reads it | amendment only
> (Q10 discipline): a semantic change lands as a dated entry in `RULINGS.md` and the
> affected normative text updates in the same commit, citing it; falsifications recorded
> in `RULINGS.md`, never erased | §1–§9 fixed per the ratified skeleton (D2/D6); promise
> statuses regenerated from `LEDGER.md`, never hand-edited |

*Replace* the `KICKOFF.md` row's "Used for" cell ("orientation; ruling authority
lookup") with "orientation; historical record — ruling authority lives in `RULINGS.md`"
(option (a) only).

*Amend* the `STORE-SHELL.md` row's update rule: under (a), "§8 is the ruling record"
becomes "§8 links to `RULINGS.md`"; the §9 delivery-record clause stays as written until
`LEDGER.md`'s live-build side covers deliveries (the §9 tension, ruled here rather than
left open).

*Add* rows: `CONTEXT.md` (vocabulary; enters by domain-modeling + grilling; amendment by
the same route; one entry per term, estate minting shape) and `RULINGS.md` (append-only
dated entries; an entry is immutable once committed; supersession is a new entry citing
the old).

### D2 — The two interfaces

**Semantic store module** (STORE-MODEL): the operation table plus the two judgment
surfaces a client may rely on — `Reachable` (the legality construction; premises on
stored forms, per family 1) and `Admissible` (what verification establishes), with
`Admissible → Reachable` named as M19, stated-unproved. Legality is internal to the
construction; no caller reproduces admission logic.

**Executable store module** (STORE-SHELL), with the seams as they actually are:

```
Caller
  |
  | Verb / Outcome
  v
Executable-store interface
  |
  v
runVerb decision module
  |
  | StoreView / authorized Effect
  v
Persistence seam
  |----------------------|
  v                      v
In-process adapter   Directory adapter
```

`runVerb` is the decision module, not the storage seam; the persistence seam is where the
two adapters cross. Error ownership is three-way: the model owns legality; the shell owns
observable rejection per clause; and the shell owns the verdict-vs-environment-fault
distinction (exit 0/1/2 — F-42). Tests split along these exact seams: command behavior at
the executable interface; adapter parity across the persistence seam; nothing asserted
against helpers below either.

### D3 — Ownership of `Admissible`

`Admission` owns the idea whole; graph traversal is machinery.

- **`E2/Admission.lean` (public):** the `Admissible` judgment (whole-store), its decision
  procedure `admissibleReport` (per-clause verdicts — exactly what the shell's named
  rejections and `check`'s report consume), carrier-level admission verdicts, and
  `ObligationM19_transport`.
- **`E2/Graph.lean` (analysis only):** graph analysis and its supporting theorems —
  topological ordering with its soundness/completeness obligations, the M10 rank
  connection. Consumed by `Admission`'s acyclicity clause and by the harness's order
  observable; nothing else public.
- **Internal unless a caller genuinely requires them:** `wfsB`, `wfvB`,
  `canonicalSpellingB`, `usesBinderB`, `litNarrowB`, `refsAt`, `topoOrder`. The shell
  calls `admissibleReport`, not the helpers.

One-new-file-per-seat follows this design (two modules, two seats); it does not drive it.

### D4 — Status-generation source

One declared source per column of the promise table: **prose, trace, and anti-claim are
normative text in STORE-MODEL §6** (hand-maintained, amendment-only, one home); **status
is generated** — the ledger extractor's scope grows by one join, stamping each promise
row's status from `LEDGER.md` at `mise run gen`. The extractor supplies mechanical status
only; it never writes prose. Until that join lands, the table carries an explicit
interim-hand-flag banner (PROCEDURE §8's interim-ledger pattern). No fourth document, no
second maintained copy of any promise.

### D5 — Naming: pending, not answered

F-39 demonstrates inconsistent name behavior across the two whole-store adapters; it does
not by itself establish an independent names interface. Order of decision: **first** rule
the authoritative name relation and observable behavior (family 3 — which relation, then
which plane; R-C §5.3 prices the options); **then** extract a names module only if it
shows independent callers, independent change pressure, or its own adapters. KICKOFF §17's
naming-as-entities direction is the trajectory argument that extraction will likely be
justified — the ruling still comes first.

### D6 — Dependency-ordered migration

1. **Rule** vocabulary, the two interfaces, and the authority map (D1–D5; this docket).
2. **Ratify `CONTEXT.md`**, update `CONTEXT-MAP.md`, amend the registry (the D1 rows).
   R-1 discharges here; the rename it licenses is its own serialization window, tree
   quiet.
3. **Land the semantic repairs** (windows A and B, then the concurrent seats).
   `Admission.lean`/`Graph.lean` enter only now — after their owning context exists.
4. **Land the ledger generator** (worktree 5), including the D4 promise-status join.
5. **Reorganize** STORE-MODEL and STORE-SHELL to the ratified skeleton in one editorial
   window, using generated statuses from the first revision — no interim hand-copied
   promise table ever exists. The ruled amendment texts land into their final homes in
   the same pass; history moves to `RULINGS.md` (move, not copy).
6. **Retire the organization review** — and this packet — into the audit series with
   stable pointers.

---

## Appendix A — the organization review, cross-mapped against the findings

The review survives nearly whole; corrections and sharpenings only.

| Review § | Finding applied | Effect |
|---|---|---|
| Four jobs, one file | The five-rung ladder already assigns each job an owning document; the "proposed model ledger" **already has its ruled name and home** — `LEDGER.md`, PROCEDURE §8, seat in flight | converges; no new ruling for the ledger |
| `runVerb` seam | Confirmed as the decision module (D2's corrected diagram). F-33 stated precisely: the shell calls several model functions (rung 0 holds); it does not call the **well-formedness decision** — that one wiring is family 2's | sharpened, overstatement corrected |
| Problem statement missing | The failure list writes itself from receipts: divergent identity (F-27/F-34), detached entities (F-25), dangling references (NEG-2), trusted corruption (WF1's contrapositive), names reaching identity (held). The negative-exhibit tradition, promoted to the front | confirmed, cheap |
| Interface scattered | `Admissible` is the missing semantic-interface carrier — "the facts a client may rely on after `check`," named | sharpened |
| Partial operations | Family 1's restatement puts legality premises on stored forms — "legality is internal" becomes a theorem posture | confirmed |
| History interleaved | Real, with a sequencing consequence: the sections history leaves are the sections amendments enter — hence D6's single editorial window, after statuses generate | confirmed |
| Promise table | Needs status + anti-claim columns, a gaps split, and one generation source (D4). As first drafted it would have shipped M17 — refuted — as a fact | corrected; Appendix B |
| Error ownership | Three-way, not two-way: legality / observable rejection / verdict-vs-environment | sharpened |
| Names placement | Candidate, not answer — D5 | corrected |
| Digest seam | No runtime seam; the performance path is a representation change behind the same function (bridge theorem), plus the two-line Θ(n²) fix | confirmed |
| Testing consequences | The review's three categories stand along D2's seams. Refutation waves are **discovery instruments** (PROCEDURE Phase 1), not a fourth lasting layer: each discovered fault terminates as a theorem, a counterexample exhibit, or a command-level regression fixture — the commit-and-flip scripts are exactly that termination for wave 2's faults | sharpened |

Open tension ruled in D1: the review's job separation vs PROCEDURE's "delivery records
append to §9" — resolved as keep-§9-for-now with the LEDGER trigger named.

## Appendix B — promises and gaps, split

**Promises** (proved or honestly pending; statuses interim-hand-flagged until D4's join):

| Reader-facing promise | Trace | Status |
|---|---|---|
| Stored bytes match their address | WF1 / M8 | proved (amendment-window re-check rider) |
| Every discovered reference resolves | WF2 / M9 | proved (same rider) |
| Equivalent content is stored once | L-dedup / M12, M12E | proved, unconditional |
| The store never shrinks or rewrites | L-frame / M13 | proved |
| Retrieval returns the canonical content inserted | L-faithful / M15 | proved (rider) |
| Retrieval checks bytes before decoding | M14 | proved (fresh half) |
| Same-relation carriers share an address | Direction A / M5 | proved, unconditional |
| One address, one carrier — under the named injectivity hypothesis | Direction B / M6 | stated; hypothesis-carried, never an axiom |
| Repeat inserts change nothing | M11 idempotence | stated |
| Insertion order does not matter | M11 commutation | pin owed (up to find-extensionality, with `reachable_keys_nodup`) |
| Names never touch identity | M16 | stated, owed |

**Gaps under repair** (knowingly false or unstated today; never listed as promises):

| Gap | Receipt | Repair route |
|---|---|---|
| Typed reachability as stated | F-25 | family-1 restatement + the Q12 anti-claim |
| "A verified directory is a legal store" | F-33 / F-32 | narrows to `Admissible`; bridge = M19, stated-unproved |
| Reference **discovery** completeness (`lit`-hidden addresses) | F-35 | model clause owed |
| Acyclicity checked at open | F-32 | family 2 (Kahn's) |
| Intra-kind faithfulness, honest form ("injective except on the characterised set") | F-34 / U-9 | statement owed; the families are the characterisation |
| `version_byte_separates` | U-16 | asserted, unproved; cheap, style precedent exists |

Boundary-case answers (the review's exercise list) as previously drafted, one correction
carried: a name may dangle in the model today — surfaced as an open ruling, not silently.

## Appendix C — code placement detail

Per D3: `E2/Admission.lean` and `E2/Graph.lean` as specified (both additive,
flight-safe); `Model.lean` takes the window-B premise restatement; `Bridge.lean` shrinks
(B4 retired; B1–B3 remain as the canon-preservation lemmas the amendment consumes).
Shell: `Boundary.lean` calls `admissibleReport` with the WFS-before-canonicity ordering;
`Store.lean` takes `StoreFault` + the `symlinkMetadata` discipline; `Gate.lean` takes
G-S5 (no `Metadata` timestamps). Names module placement waits on D5.

## Appendix D — evidence pointers (not copies)

The six reader reports and `SYNTHESIS.md` in this directory; R-C's twelve drafted
STORE-SHELL text changes (anchored to current line numbers — valid through D6 step 3,
re-anchored once at step 5); the wave-2 register and triage; PROCEDURE §7 for the
registry rows D1 replaces, quoted there verbatim.

---

*End. Staged design proposal; no claim gate satisfied. Enters the wave-3 docket as D1–D6.*
