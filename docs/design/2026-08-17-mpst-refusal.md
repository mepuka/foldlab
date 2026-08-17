# The session-types refusal — why MPST metatheory is not this estate's home

Ruled 2026-08-17 (grill record, ruling 10b), consolidating an
argument made identically in two ephemeral lane reports and the
proof-support briefing — recorded here durably because the word
"protocol" sends every future reviewer to this literature, and the
answer should not need re-derivation.

## The refusal

Multiparty session types earn their theorems — deadlock freedom,
protocol compliance, liveness — by disciplining **ordered**
interaction: which party may speak next, on which channel, in which
direction. The mechanized state of the art (Zooid, PLDI 2021, Coq)
proves exactly those properties for exactly that setting. The move
calculus has no ordered interaction to discipline: fills are total
under repair, any seat may move at any time, refusals are data
rather than stuck states, and the terminal state is
permutation-invariant over the fill/dispute bag
(`runRepairK_perm`). Nothing blocks, so deadlock freedom is not a
theorem here — it is a non-event. MPST's central results address a
hazard this calculus constructs itself out of.

The nested-protocol precedent (Demangeon–Honda, CONCUR 2012) fails
to transfer for the same structural reason at the sub-session hole:
their completion result excludes recursion by side condition where
this estate excludes it by hash-preimage infeasibility (a protocol
digest cannot contain itself), and their delegation guarantee rests
on linear channels the estate does not have — a seat binding is not
a linear resource; the journal is not a channel.

No Lean 4 MPST mechanization was found at all (2026-08-16 search;
CSLib, the Lean 4 concurrency library where one would land, carries
LTS/CCS/π-calculus and no session types). The absence cuts both
ways and both are recorded: nobody's mechanized metatheory stands
ready to embarrass an unordered, completion-set protocol semantics;
equally, there is nothing to reuse.

## The one reusable idea — the projection IOU

What MPST has that this estate will eventually want is
**projection**: a mechanically derived per-seat statement of what a
participant may do, with a soundness theorem relating it to the
global object. When a per-seat frontier surface is built (the
orchestration synthesis's frontier item), it owes a theorem in the
`fence_deterministic` style — quantified over any sound per-seat
view, relating it to the protocol value — rather than a hand-argued
correspondence. This page is that IOU's home; the frontier slice
cites it or explains why not.

## Bounds

This refusal covers ordered-interaction metatheory as a foundation
for the calculus. It does not refuse: TLA+ for the client↔daemon
transport (routed separately, on fit), process-calculus vocabulary
in prose, or a future MPST comparison if the calculus ever grows
ordered phases — any of those reopens this page by name.
