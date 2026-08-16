# packages/moves — decisions the spec did not fix

Task-local placeholders per the numbering rule in `proto/DECISIONS.md`;
repository D-numbers are assigned at merge.

### T1. The oracle lives in `verify/moves`, importing the canonical model

Decided: promote the spike emitter into `verify/moves` (`Oracle/` +
`Main.lean` + lakefile targets) so it compiles the unmodified `Moves`
library. Alternatives: extend `scratch/spike-lean-oracle` in place;
have the spike `lake require` the model. Why: the spike carries a
pre-D85 copy of `Model.lean` — its corpus would be authored by a stale
model, which is exactly the drift class the wall exists to kill. The
spike stays as evidence, unratified. **Load-bearing? yes** — a corpus
authored by the wrong model makes both sides agree on a falsehood.

### T2. The verdict serializes ghost evidence, unlike the daemon wire image

Decided: corpus verdicts carry `evidence` beside `meaning` per hole.
Alternatives: meaning-only, matching the spike codec and the daemon
wire image. Why: the differential target is the model itself, and the
strong no-loss law lives in the journal — a meaning-only wall could not
catch an evidence-dropping kernel (the MOVES-5 regression class).
**Load-bearing? yes** — the legacy-repair mutant is killed through the
evidence bytes.

### T3. Verdicts include the reversed bag and the fence choices

Decided: each line also carries `runRepairK` of the reversed trace and
canonical-min / holder-plurality choices at disputed terminal holes.
Alternatives: forward-run only; a separate permutation corpus. Why: the
model authors the expected outcome of a second schedule per vector
(wire confluence made observable, decide's order-sensitivity included),
and the fence rules join the differential surface at zero extra corpus
cost. **Load-bearing? no** — redundant with the property tests, but the
expectations here are model-authored rather than self-checked.

### T4. Corpus shape: 2000 splitmix64-indexed traces, length 1–6

Decided: randomized corpus, seed = case index, move mix covering every
`D85Refusal` class (empty offers included), pinned count. Alternatives:
the exhaustive wire-image enumeration (DEV-670's design); a larger N.
Why: exhaustive enumeration belongs to DEV-670 with its closure
certificate and typed divergences — duplicating a weaker version here
would blur that issue's acceptance; 2000 lines (~2.5 MiB) is enough to
kill every planted mutant while staying reviewable in git.
**Load-bearing? maybe** — if DEV-670 lands its Tier A corpus, this one
stays as the TS kernel's wall or is subsumed; that call is the
operator's.

### T5. The kernel is a parametric factory over a declared carrier

Decided: `makeKernel(carrier)` mirrors the model's typeclass context;
the ground wire instantiation (`wire.ts`) fixes three holes, integer
values, ASCII holders. Alternatives: hardcode the ground carriers;
free functions threading the carrier. Why: the Lean theorems are
parametric, so the kernel states the same obligation surface — supply
lawful comparators and a finite carrier, inherit the laws.
**Load-bearing? no** — ergonomics; the ground instantiation is what the
wall drives.
