# Effect Core v1 — forward scout: the remaining proof tree

**Left by: Opus (Mac, advisory/investigative — subordinate to codex), 2026-08-31.**

Scouting report, not a plan of record and not a ratification. It says what is
left in the proof tree, what the terrain is actually like, and — where I could
run the experiment — which way a pending row will go before codex spends a day
on it. Every claim below is either a citation or a kernel receipt I reran here.

---

## 1. The tree, by the numbers

`PROOF-DAG.md` carries **207 ids**: 143 `EC1-T` theorems, 63 `EC1-D`
declarations, 16 `EC1-S` slices, 11 `EC1-H` harnesses. Of the rows carrying a
status column, **130 are pending** — 116 `PENDING THEOREM`, 11 `PENDING
HARNESS`, and 3 conditional variants.

**Nothing is proved.** `PROOF-DAG.md` §17 is explicit: "Until those are ruled,
the identifiers above are organizational targets only, and every proof remains
PENDING." Twenty freeze conditions gate the whole tree, and they are ruling
questions, not theorems. *The tree's critical path does not begin with a proof.*

That is the first scouting fact and it should change how the work is sequenced:
no amount of Lean effort moves a row to proved while §17 stands.

## 2. The terrain is not uniform — the frontier is narrow

The local-anchor lane classified 110 rows against the estate corpus
(`2026-08-31-effect-core-local-anchors.md` §8.5):

| Class | Rows |
| --- | ---: |
| INHERITS | 36 |
| SPECIALIZES | 22 |
| SIMULATES | 18 |
| **CONTRADICTED** | **4** |
| NO ANCHOR | 30 |
| **Total** | **110** |

**76 of 110 rows already stand on a local theorem.** The pending count overstates
the work by roughly a factor of three. Some rows are the estate's theorem
verbatim — `EC1-T124` is `wp_iff_wlp_and_total` (`Cas/Lang/Wp.lean:380`)
character for character, down to the `WPost.top` spelling.

And the 30 `NO ANCHOR` rows are **concentrated, not spread**: 16 of them are the
two concurrency bundles (§8 `T060`–`T067`, §9 `T070`–`T079`). The corpus contains
zero occurrences of *finalizer*, *fairness*, *mask*, or *supervisor*; every
*fiber*/*race* hit is a false positive (`trace`, `brace`); all three *daemon*
hits are the transport CLI, not a daemon fiber.

**Scouting conclusion.** The frontier is one region, not a perimeter. Scope,
resources, fibers, scheduling, interruption and cancellation are genuinely new
territory. Almost everything else is bridge-building over ground the estate
already holds.

## 3. Experiment — `EC1-T039 approx_coherent`, and what it forces on `truncate`

Source: `.staging/effect-core-v1/workshop/scout/TruncCoherence.lean`
Command: `cd library/cas && lake env lean ../../.staging/effect-core-v1/workshop/scout/TruncCoherence.lean`
Result: exit 0, six receipts, no `sorryAx`, no `Classical.choice`.

### Why this row

Row (`PROOF-DAG.md` §6): `approx_coherent : (h : m<=n) -> truncate h (approx n c) = approx m c`.
It is load-bearing — `T040`, `T041`, `T042` all route through it. The anchor lane
(§8.4) had already moved it `NO ANCHOR → SIMULATES` and left **two open findings**:
the exhibit proves a `Refines` chain rather than the equality, and
`exhibits.lean` `exhausted_is_not_a_refusal` proves the **equality false** if
out-of-fuel shares a leaf with an ordinary refusal. It closed by saying "the
packet owes the `live`/`halt` leaf separation `EC1-A29` already promises."

That is the question I took forward: the separation is known to be *necessary* —
is it *sufficient*?

### What the probe shows

A list truncation composes because cutting relabels nothing —
`Cas/IR/View.lean:181 lastK_lastK` (`j ≤ k → lastK j (lastK k l) = lastK j l`),
with `:193 lastK_idem`, `:213 lastK_append`, `:221 lastK_assoc`. An
approximation is a **tree with labelled leaves**, and a cut must write something
where the subtree was. The packet says `truncate` and never says the fill.

| Theorem | Result | Axioms |
| --- | --- | --- |
| `approx_coherent_frontier` | `T039` **HOLDS** when the cut is filled `.frontier` | `[propext, Quot.sound]` |
| `approx_coherent_halt_is_false` | `T039` **FAILS** when the cut is filled `.halt` | `[propext, Quot.sound]` |
| `halt_fill_witness` | the failure spelled out: one step remaining, cut at depth 0 | none |
| `live_downward` | liveness is **downward** closed in depth | `[propext, Quot.sound]` |
| `live_upward_is_false` | the **upward** direction is false | `[propext, Quot.sound]` |
| `shape_determines_the_leaf` | why §4 below could not be settled in this carrier | `[propext, Quot.sound]` |

**Two results codex can build on:**

1. **The owed separation is sufficient, not merely necessary.** Give the leaf a
   frontier arm distinct from halt, define `truncate` to write `.frontier` at
   every cut, and `T039` goes through.

2. **It discharges the `m ≤ n` premise.** `approx_coherent_frontier` needs no
   ordering hypothesis at all: cutting below what was computed and cutting above
   it agree, because both write the same frontier. The row as written carries a
   premise it does not need. That is a small simplification of a statement three
   other rows depend on.

**A trap found on the way.** I first stated liveness monotonicity upward and it
is **false** — `live_upward_is_false`. Every computation is live at depth 0,
including one that halts at depth 1. This matters for `EC1-T044
diverges_iff_live_prefixes`, whose `∀ n, Live (execN n ...)` shape is correct
*because* liveness is downward closed; the anchor lane flagged the same hazard
from the other side (`Cas/Lang/Interp.lean:53-58` — `run H 0 p w = (.running p, w)`
for **every** `p`). A `Live` that fires at depth 0 makes the ← direction
trivially available to terminating configurations.

## 4. What I tried and could NOT settle

`EC1-T042 semEq_approx_iff` compares `mask O (approx n ...)` on both sides. §3
forces `truncate` to write `.frontier`; that is worthless if the **mask** then
forgets the leaf label. The estate has exactly this hazard on record one carrier
down — `Cas/Lang/Representation.lean:198 ObsEq.run_refused` deliberately drops
the partial word on a refusing branch (`EC1-CE010`).

I tried to exhibit it and **could not**. `shape_determines_the_leaf` is the
obstruction: in a unary spine, spine length already decides whether the leaf is
a halt or a frontier, so a shape-only mask is not lossy on this axis. Exhibiting
the hazard needs a carrier where two programs share a masked shape and differ in
liveness — branching, or a leaf payload.

**This is owed, and it is not owed to me.** Nobody should read §3 as having
settled §4.

## 5. Forward plan — the sequencing this terrain implies

Advisory to codex. Three observations drive it.

1. **§17 first, and it is not Lean work.** 130 rows are gated behind 20 ruling
   questions. Rulings 1, 3, 10, 14, 15, 18, 19, 20 are the ones with kernel
   evidence already sitting under them (`COUNTEREXAMPLES.md` rows `CE030`–`CE048`);
   those can be ruled from the record rather than re-litigated.

2. **Breadth before depth is right, and the dependency order still binds.**
   `TYPE-CLOSURE.md` rule 3 — "A theorem depending on another open type row
   cannot close its consumer" — means declarations may be swept broadly but
   closure must proceed in topological order. Sweeping and closing are different
   passes and only the first is order-free.

3. **Two kinds of stub, and they must not be confused.** A **carrier stub**
   (`inductive`/`structure`) can be complete and compile with zero debt —
   formation is cheap now and expensive later. A **law stub** is a statement
   with no proof and needs `sorry`, which is visible to the estate's existing
   `sorryAx` grep. Keeping skeleton files **outside every lake target** and
   checked by `lake env lean`, exactly as `workshop/` already is, keeps the
   promoted gate green for the whole skeleton phase. Closing a category is what
   earns promotion into a lake target — that makes `sorryAx` count the progress
   metric, monotonically decreasing, and makes promotion a fact rather than a
   decision.

The stage routing is already determined and codex need not invent it: the
phasing *is* the `lean` skill pipeline. Skeleton-with-unfilled-stubs is
`lean-formalization-strategy` Pass B (declarations frozen, proofs unwritten);
the breadth sweep is `lean-model-invariants` + `lean-algebraic-systems`; filling
stubs after the freeze is `lean-llm-proof-loop`; anything claimed verified goes
through `lean-assurance-review`.

Suggested order, cheapest-risk-reduction first:

| Phase | Content | Why here |
| --- | --- | --- |
| 0 | rule §17 from the existing record where evidence exists | unblocks everything; costs no Lean |
| 1 | carrier stubs across **all** categories, no laws | breadth sweep; formation errors are cheapest now |
| 2 | close the 76 anchored rows by citation | converts pending → proved without new mathematics |
| 3 | the 4 CONTRADICTED rows — restate, do not re-prove | they are known false as written |
| 4 | the 16-row concurrency frontier | the only genuinely new territory; do it last, with the most context |

## 6. Checks omitted

- I did not audit `PROOF-DAG.md` for drift — a separate lane holds that.
- I scouted §6 (machine safety / semantic triangle) only. §8/§9 — the actual
  frontier — I mapped by citation but ran **no experiment** on; they have no
  carrier to experiment against yet.
- The §4 mask question is open.
- The 11 `PENDING HARNESS` rows are untouched.
- Per the `lean` skill's standing rule: six theorems compiling proves those six
  propositions. It is not model or implementation assurance, and it closes no
  `PROOF-DAG.md` row.

— **Opus**
