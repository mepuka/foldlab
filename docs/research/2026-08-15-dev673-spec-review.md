# DEV-673 frozen-spec rigor review — L2 refuted, the package otherwise sound

Target: the DEV-673 issue body's frozen spec block and its transcription
at `verify/moves/Moves/Spec.lean`, freeze commit `c13251e17` on
`agent/codex/DEV-673`, pinned sha256
`f3afcf10335019fb650a5baf0760b7318231bf716fa89f84a51782ef44a58ef4`.
Reviewer: Fable (Rev seat), 2026-08-15, after codex paused the
implementation on a blocking finding.

Verdict: **the frozen spec is jointly unsatisfiable as written.** Law L2
(meaning confluence over the fill/dispute wire fragment) is false, and
law L5 (refusal characterization) forces exactly the behavior that
refutes it, so no implementation can ever discharge both. The
counterexample is kernel-checked twice independently — by codex on the
branch toolchain and by this review's probe. Every other law is
provable, the anti-gaming protocol held (the freeze caught the defect
before any proof work could route around it), and one of two small
repairs restores the package. Codex's pause was the correct move.

## The counterexample

An empty dispute — `Move.dispute h ∅ actor`, a dispute offering no
candidates — is refused at an open hole but admitted at a filled one,
and admission converts the hole from `filled` to `disputed`. Whether
the empty dispute lands before or after a fill therefore changes the
terminal meaning:

- `[fill h 10 a, dispute h ∅ b]` → the hole ends `disputed {(10,a)}`
- `[dispute h ∅ b, fill h 10 a]` → the hole ends `filled 10`

The two traces are permutations of each other and contain no decide
move, so they satisfy `FillDisputeOnly` and L2 demands `MeaningEq` —
which fails on constructor mismatch alone.

The mechanism: `step`'s dispute branch refuses when
`priorCandidates s h ∪ cs = ∅`. At an open hole `priorCandidates` is
`∅`, so an empty offer merges to `∅` and refuses. At a filled hole
`priorCandidates` is the journal evidence, which well-formedness keeps
nonempty, so the same empty offer merges to a nonempty set and admits,
rewriting `filled v` to `disputed {(v,·)}`. Refusal of the same move
depends on arrival order, so meaning does too.

L5 pins this behavior rather than merely permitting it: `D85Refusal`'s
dispute clause is the same `priorCandidates s h ∪ cs = ∅` test, and L5
is an iff over every state and move. An implementation that refused
empty disputes uniformly (killing the counterexample) would falsify L5;
one that satisfies L5 falsifies L2. The two laws cannot be discharged
together, so `spec_discharged` can never go green under this pin.

Kernel checks: codex reproduced the counterexample on Lean 4.33.0
against the branch's own definitions. This review's probe
(`scratchpad/ProbeD673.lean`, elaborated clean against `Moves.Model`)
proves the permutation, the fragment membership, both terminal hole
states, and `¬ MeaningEq`. The probe exercises only fill-at-open and
dispute moves, whose semantics D85 does not touch — D85 changes
fill-on-disputed, fill-on-filled-same-value, and fill-on-decided — so
the counterexample transfers verbatim to the post-D85 runner.

Two sharpenings, both kernel-checked in the probe:

- Evidence confluence survives this counterexample. Both orders journal
  exactly `{(10,a)}` — the empty dispute contributes nothing to
  evidence whether admitted or refused. Only meaning splits. L3 is not
  refuted by this input.
- The admit/refuse receipts also flip with order: `[true, true]` in one
  order, `[false, true]` in the other. Under the current semantics even
  the observation list is schedule-sensitive on this input.

## The repair fork

Both repairs are small and both require a Rev re-pin of Spec.lean. They
differ in whether the calculus itself changes.

### Option A — refuse empty disputes everywhere (semantics amendment)

Change `step`'s dispute refusal from `priorCandidates s h ∪ cs = ∅` to
`cs = ∅`, and re-pin `D85Refusal`'s dispute clause to
`(∃ v, s.holes h = .decided v) ∨ cs = ∅`. For a nonempty offer the
merged set is automatically nonempty, so behavior on every nonempty
dispute is unchanged; the only delta is that an empty dispute now
refuses at every state instead of admitting at filled and disputed
holes.

What this buys:

- L2, L3, and L4 become true on the full fragment as originally stated.
  `FillDisputeOnly` keeps its frozen definition.
- Refusal becomes a function of the move and the meaning state only.
  The frozen predicate currently reads `priorCandidates`, which at a
  filled hole is the ghost journal — refusal semantics leaking ghost
  state. On well-formed reachable states the leak is invisible
  (evidence at a filled hole is never empty), but the predicate
  quantifies over all states. The re-pinned clause closes this
  pinhole entirely.
- The receipts become schedule-free on the fragment too: fills always
  admit, nonempty disputes always admit (decided holes are unreachable
  without decide moves), empty disputes always refuse. The observation
  flags, not just the terminal state, become a function of what was
  said.
- It matches the estate thesis directly. An empty dispute asserts
  nothing, so under "terminal state is a function of WHAT was said" it
  should contribute nothing — and a move that contributes nothing but
  sometimes rewrites `filled` to `disputed` is time leaking into
  meaning, the exact defect D85 exists to remove.

What it costs: it is a semantics change beyond the D85 ratification
(which covered fill behavior only), so it needs its own operator
ratification and D-number before the re-pin. It also removes the
ability to contest a filled value without offering an alternative; no
ratified decision or consumer depends on that ability today, and if it
is ever wanted it should return as its own ratified move rather than as
an accident of the emptiness test.

### Option B — exclude empty disputes from the fragment (statement narrowing)

Keep the semantics and the L5 pin exactly as frozen; re-pin only
`FillDisputeOnly` to additionally require every dispute in the bag to
carry a nonempty candidate set. L2/L3/L4 then hold on the narrowed
fragment.

What it costs: the artifact keeps a schedule-sensitive behavior
reachable on the wire. Any client or daemon that emits `dispute h ∅`
reintroduces order-dependent meaning, so the confluence theorem holds
only for inputs the theorem's own hypothesis screens. The DEV-670 wall
generates against post-D85 semantics and would have to carry a named
Divergence for empty disputes, and the daemon has to police them at
the protocol layer forever. The ghost-dependence pinhole in
`D85Refusal` also stays.

### Recommendation

Option A. The purpose of DEV-673 is to turn "meaning is a function of
what was said, never when" from an aspiration into a theorem package;
Option B keeps a standing exception and moves the burden to every
future consumer, which is the pattern the estate has been retiring.
Option A's ratification surface is one sentence: an empty dispute is
lawfully refused everywhere.

## Law-by-law assessment (under either repair)

- L1 strong no-loss: true and provable. Under D85 every fill admits in
  all five hole states and appends its `(value, actor)` pair to the
  journal, and no move deletes journal entries — dispute merges are
  unions, decide rewrites evidence to the candidate set it already
  equals, fills append. Monotone evidence plus always-append gives
  membership with no disjunct. Note L1 carries no fragment restriction
  and survives interleaved decides, because fills append even at
  decided holes.
- L2/L3 confluence: true on the (repaired) fragment. Under D85 every
  admitted move's journal effect is a union with a move-determined
  contribution — fills contribute their pair, disputes their candidate
  set — and pair-set union is the proved semilattice, so evidence is
  the union of contributions in any order. Meaning is then classified
  by the bag: open with no effective moves, `filled v` when every
  effective move is a fill of the single value `v`, otherwise
  `disputed` at exactly the evidence set. The MOVES-5 change
  (confirming refills journal their holder) is load-bearing here: the
  same-value-fill / conflicting-fill diamond commutes only because the
  confirming pair is recorded in both orders.
- Proof-architecture note: L2 and L3 should be proved as one theorem —
  full terminal-state equality over permutations — with L2 and L3 as
  projections. `MeaningEq` alone does not survive the permutation
  induction, because `repair` reads evidence (dispute merges at filled
  holes, clash repair), so two meaning-equal states with different
  journals can step to meaning-different states. The induction must
  carry both components; `EpistemicState.ext` makes the combined
  statement available.
- L4 schedule-free close: true, and essentially a corollary of L3 plus
  well-formedness. A disputed hole's candidate set equals its evidence
  under WF, so two permutations both terminating disputed carry the
  same set, and any `FenceRule` is a function of the set. Lean's proof
  irrelevance handles the nonemptiness arguments.
- L5 refusal iff: true by construction once `repairK` mirrors the
  (re-pinned) predicate. Note it quantifies over all states, including
  ill-formed ones, so the discharge must not assume WF.
- L6 observation alignment: true by a short induction on the trace;
  the runner conses one observation per intent by definition. This
  closes the DEV-671 review's R3 gap (the alignment invariant was
  prose-only).
- L7 agreement iff: true by case split on `repair s m`; pairs with the
  refusal case to give the complete characterization the DEV-671
  review confirmed for the pre-D85 runner.
- L8 safety: true. WF preservation needs the three new fill cases —
  same-value append preserves `OnlyValue`, absorb preserves
  nonempty-dispute, decided-append preserves `ValueAppears` — and
  refusals are identity transitions. `decided_stable` at the `step`
  layer survives verbatim since D85's fill-on-decided routes through
  `repair`, touches only evidence, and leaves the meaning tombstone.
- M1/M2 mutant kills: provable. The frozen legacy chain
  (`legacyRepair`/`legacyRepairK`/`legacyRunRepairK`) reproduces
  pre-D85 fill behavior; the three-fill bag loses value 30 under it
  (M1), and the DEV-671 review's kernel-checked non-confluence probe
  supplies M2. Both witnesses are fill-only, so they are insensitive
  to the Option A dispute change even though the legacy chain shares
  `step`. The mutants also double as definition-drift guards: M2
  becomes unprovable if `MeaningEq` is ever weakened toward trivial,
  which is exactly the kind of drift the DEV-671 review showed
  statement gates cannot see.
- M3: a smoke test (any fill kills refuse-everything). Weak but
  harmless.
- W1/W2 witnesses: consistent with D85 — all three conflicting fills
  admit and the third pair is journaled; the confirming refill records
  the second holder. W2 is implied by L1 but earns its keep as a
  pinned executable value.

## Protocol verification (Rev duties on the freeze commit)

- Pin: `run.sh` line 11 carries the expected sha256; the committed
  Spec.lean hashes to exactly that value. Verified locally.
- Immutability: `git log --follow` shows `c13251e17` as the only
  commit touching Spec.lean. It is the branch tip; nothing has edited
  the spec or the pin since.
- Byte-fidelity: the frozen defs (`FillDisputeOnly`, `D85Refusal`)
  are verbatim from the issue body. The laws are faithfully
  transcribed as `Prop`-valued defs with hypotheses as binders; the
  deltas are all meaning-preserving elaboration (theorem→def form,
  unused-binder underscores in L4, L8 split into `SpecL8WF` and
  `SpecL8Stable` matching the ticket's two theorems, and the
  SpecCarrier/`specBag`/legacy-chain pinning the ticket's preamble
  called for but did not spell out — codex's transcription resolved
  those under-specified references conservatively and correctly).
- Discharge: `SpecDischarge.lean` is intentionally red (references to
  not-yet-existing theorems), per protocol.
- Gate gaps still open, as scoped work in the series: the current
  `sorry` grep does not match `exact sorry` (no `:=`/`by`/`;` token
  directly precedes `sorry` there) and the `axiom` grep anchors at
  line start so `private axiom` evades it; the acceptance requires
  both widened and demonstrated red once. The spec_* roster and the
  orphan-rule exclusions file are also still to land.

## What the move calculus guarantees, in plain terms

The state is a set of named slots (holes). Each slot is open, filled
with a value, disputed among a set of attributed candidate values, or
decided. Beside the visible state sits a journal that records every
(value, author) pair ever put forward for each slot; the journal
informs provenance and dispute resolution but is not itself the
meaning.

Three moves exist: fill (offer a value for a slot), dispute (put a set
of attributed candidates on the table), and decide (close a disputed
slot to one of the values actually on the table — issued only by a
fence rule at session close, never mid-stream).

Once DEV-673 lands with either repair, each guarantee below is a
machine-checked theorem with the axiom footprint of core Lean, over a
spec file whose hash is pinned so the statements cannot drift:

1. Nothing anyone says is lost, ever. Every fill by any participant,
   in any order, at any point — including after the slot was decided —
   lands in the journal with the author's name attached. No exception
   clause. (L1; the pre-D85 semantics provably fails this, which is
   mutant M1.)
2. Before a slot is closed, arrival order is meaningless. Any
   reordering of the same fills and disputes produces the identical
   slot states and the identical journal. Two replicas that saw the
   same messages in different orders are in byte-identical states, so
   state can be content-addressed and compared by digest. (L2/L3;
   this is the session-as-CRDT property, and the basis for DEV-674's
   three-fill digest equality.)
3. Closing cannot be gamed by racing. Any decision rule that is a
   function of the candidate set alone — minimum value, plurality,
   anything sound — picks the same winner regardless of the order the
   messages arrived in. (L4. Which rule to use is a separate, explicit
   choice; the calculus guarantees the rule sees the same table either
   way, and the existing `fence_manipulable` control shows the choice
   of rule matters.)
4. Refusal is a closed book. A move is refused if and only if a short
   decidable predicate says so: fills never refuse; disputes refuse
   only at decided slots (or when they offer nothing, under Option A);
   decides refuse unless the slot is disputed and the value is on the
   table. There are no other failure modes. (L5.)
5. Every message gets a receipt. The runner's observation list aligns
   one-to-one with the input: each intent is marked admitted or
   refused, and processing never aborts partway. (L6, L7.)
6. Decisions are final and the state cannot be corrupted. Once a slot
   is decided, no later move changes its meaning; and no input
   sequence, however adversarial, drives the state out of its
   invariants. (L8.)

What the calculus does not guarantee, stated with the same care: it
does not choose the winner of a dispute (that is the fence rule's
explicit, named policy); it does not make mid-stream decide moves
order-safe (they are deliberately fenced to close — a decide gates
which later disputes are refused, so interleaving decides reintroduces
order sensitivity by design); it says nothing about delivery (a
message that never arrives is outside the bag the theorems quantify
over); and the daemon carries these properties only after DEV-674
aligns it with the wire semantics.

## Disposition

Blocked on one operator ratification: Option A (refuse empty disputes
everywhere, new D-number, re-pin `D85Refusal`) versus Option B (narrow
`FillDisputeOnly`, keep semantics). Recommendation is Option A.
Implementation resumes on the answer; everything else in the package
is assessed provable as specified.
