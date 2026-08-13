# Catalog R4 harness decisions

Run 2026-08-13 CDT. This is the decisions-encountered log required by
task 17. The harness home is `proto/go/catalogr4/`; the only file added to
the daemon package is the tagged sabotage build
`proto/go/protod/catalogr4_sabotage.go`.

## D1. The executable oracle restates `Catalog.tla` at the R2 bounds

Decided: the harness has a small Go state machine with exactly 2 daemons,
3 values, 2 creators, data cap 2, and the four-action alphabet
`CreateBegin` / `CreateFinish` / `MirrorAdvance` / `Publish`. The oracle
records both the four TLA disjuncts and seven semantic branches. Alternatives:
parse TLC states; invoke TLC for each real step. Why: lockstep needs the next
state synchronously and deterministically, while coverage still uses TLC's
published 12,707,989-state closure as its denominator. The transition table
is deliberately direct and reviewable; it does not import daemon behavior.
**Load-bearing? yes** — a drift from `Catalog.tla` would invalidate every
comparison.

## D2. Sampling is directed branch witnesses plus seeded uniform walks

Decided: five short directed schedules guarantee every semantic branch,
then 128 deterministic walks run to depth 24. Walk `i` uses xorshift64 with
seed `0x17ca0001 + i * 0x9e3779b97f4a7c15`; each step is selected uniformly
from a stable enumeration of every enabled action instance. Alternatives:
claim exhaustive replay; sample raw action bytes and discard disabled steps;
DPOR. Why: 12.7M fresh embedded-daemon replays are not the requested claim,
and state coverage makes the sampling shortfall explicit. **Load-bearing?
yes** — the method and seeds are part of the bounded empirical claim.

## D3. Every schedule receives fresh real daemons

Decided: each replay acquires two real `protod` instances, each with its own
embedded NATS and temporary JetStream store. Alternatives: reset and reuse;
different journal names in one long-lived daemon. Why: no prior schedule may
lend catalog resolution or journal entries to the next one. **Load-bearing?
no** — an independently verified reset could replace process freshness.

## D4. State extraction stays inside the narrow writ

Decided: catalog and data state are read with `journal.read`; every claimed
head is recomputed from the returned entries. Resolve verdicts are read
without mutation by asking the stateless concierge for the frontier of a
root hole: its bounded `refs` list is complete at the three-value R2 bound.
Actual actions use only `type.create` requests and ingress request/reply
publishes. Alternatives: inspect JetStream or daemon fields; probe resolution
by publishing (would mutate on presence). Why: the writ sufficing to audit the
daemon is part of R4's claim. **Load-bearing? yes** — the frontier has a cap of
16, so this probe is complete only because R2 has 3 values.

## D5. `MirrorAdvance` uses a named, lossy substitute

Decided: because replica roles are unbuilt, advancing `mirror[d][o]` recreates
the origin structure at daemon `d` through `type.create`, records it in a
harness shadow mirror, and projects a newly created substitute fact out of
`d`'s authority catalog during comparison. Alternatives: claim the action is
untestable; write JetStream directly; omit mirror schedules. Why: this uses
the real derivation and union-resolution behavior while keeping the missing
mechanism explicit. It does **not** exercise verified origin-position copy,
prefix preservation, replica read-only enforcement, lag transport, or
authority/mirror storage separation. **Load-bearing? yes** — R4 cannot cover
ADR-0009's replica law until the real role exists.

## D6. Negative controls precede honest pass counts

Decided: the corpus-wide expected-state control mutates one post-step
observation in every schedule (cycling catalog, mirror, data, and resolve) at
step zero; every candidate starts from a fresh pair and must diverge. The
daemon control is a separately compiled `catalogr4_sabotage` tag that keeps
the honest scheme name but derives an unrelated digest, reproducing R2's
`AssertedIdentity` behavior. Alternatives: mock the comparator; change an
honest production file under a runtime flag. Why: both controls drive real
NATS replies, while no sabotage enters a normal build. **Load-bearing? yes**
— a harness that cannot fail does not establish conformance.

## D7. Create halves are mapped by deferring the wire request to Finish

Decided: an absent `CreateBegin` stages its body in harness state; its
`CreateFinish` sends the real `type.create`. A resolving Begin sends a create
immediately and requires `created:false`. Alternatives: send on Begin (the
catalog changes one model step too early); insert a daemon hook; inspect or
mutate internals. Why: `protod` exposes an atomic, serialized create and no
pause between its resolve-check and append. The task forbids modifying the
daemon except for tagged sabotage, so deferral is the only public-surface
mapping that agrees on the non-racing traces. **Load-bearing? yes** — the
first stale different-value conflict proves this mapping cannot realize the
full model alphabet; see `R4-FINDING-001.md`.

## D8. Divergence is minimized by deterministic action deletion

Decided: after the first honest disagreement, attempt action removals in
source order; keep a removal only when the remaining schedule is model-enabled
and still diverges against fresh daemons. Alternatives: merely print the
sampled trace; randomized delta debugging. Why: the four-action witness is
small enough to audit and byte-stable across runs. **Load-bearing? no** — a
stronger reducer may replace it without changing the finding.

## D9. The public refinement map coarsens create to `CreateAtomic`

Decided: retain the proved split `CreateBegin` / `CreateFinish` actions in
`Catalog.tla`, but expose `CreateAtomic` as the executable wire action in
`CatalogWire.tla` and the Go oracle. An appending atomic step maps to an
uninterrupted Begin;Finish pair; an already-resolved atomic step maps to the
stuttering resolving Begin. `MirrorAdvance` and `Publish` remain unchanged.
Alternatives: add a test-only pause to protod; silently treat the fresh wire
check as the earlier Begin snapshot; discard the split model. Why: the shipped
wire request really is atomic, while the split model remains the safety proof
and covers the future multi-handler deployment. The stale-CAS conformance
branch moves to ticket 012's journal kernel. This supersedes D1 and D7 only
for the resumed wire map; their finding history remains evidence.
**Load-bearing? yes** — R4 is claimed only against this named map.

## D10. TLC checks the coarse step against the split transition functions

Decided: factor pure `CreateBeginResult` and `CreateFinishResults` operators
out of `Catalog.tla` without changing its actions, then require every direct
`CreateAtomic` step to equal their sequential composition. A split cap2
closure canary pins the refactor at 119,145 generated / 18,295 distinct /
depth 16. The honest bridge closes at the R2 gate domains; a config-selected
faithless atomic identity must violate `AtomicRefinement`, with its trace
committed beside the config. Alternatives: duplicate the split transition in
the bridge; rely on a prose simulation argument. Why: one transition table
prevents proof and bridge drift, and the required refutation proves TLC is
actually observing the relation. **Load-bearing? yes** — this is the checked
step that transfers R3 safety to the coarse map.

## D11. Regenerate and gate the corpus in strict control-first order

Decided: the coarse corpus has three deterministic branch witnesses followed
by the same 128 seeded depth-24 walks. This yields 131 schedules / 3,079 steps
and covers 1,077 distinct states, all 3 action disjuncts, and all 5 semantic
branches. The single R4 command runs the formal bridge, tagged daemon
sabotage, all 131 corrupted expected-state schedules, coverage, and only then
131 honest schedules. Alternatives: retain the split corpus and project it;
publish a pre-control honest count. Why: schedules must contain only drivable
wire behaviors, and both failure modes must be demonstrated before a pass
count has evidentiary value. This supersedes D2's five split witnesses while
retaining its seed formula. **Load-bearing? yes** — these counts and this
ordering bound the R4 claim.
