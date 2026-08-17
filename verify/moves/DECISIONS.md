# Task 48 decisions

Repository-wide D-numbers D70–D79, assigned 2026-08-15 (post-merge
repair) per the numbering rule in `proto/DECISIONS.md`.

### D70. `filled` contains meaning only

Decided: `HoleState.filled` carries only `Value`; holder attribution lives in
ghost journal evidence. Alternatives: retain the original actor in `filled`;
erase attribution entirely. Why: Task 48 Addendum 3 ratified D1, and holder is
provenance rather than denotation. **Load-bearing? yes** — restoring holder to
the meaning constructor would contradict the final surface and its digest.

### D71. Candidates are a canonical holder-attributed pair-set

Decided: represent candidate multiplicity as
`Std.ExtTreeSet (Value × Holder) candidateCmp`. The same pair is idempotent;
distinct holders supporting the same value remain distinct. Candidate storage
and value-choice comparators are separate. Alternatives: value-only finite
sets; ordinary multisets that count redelivery; a fixed finite value universe.
Why: Task 48 Addendum 3 ratified D2; pair identity preserves semilattice merge
while making holder-counting plurality expressible. **Load-bearing? yes** —
redelivery idempotence, plurality, and the manipulation contrast depend on it.

### D72. No prioritized self-revision move

Decided: keep only `fill`, `dispute`, and `decide`; a conflicting fill refuses
and is repaired into a dispute. Alternatives: later commitment wins; add
`revise` as retract-then-fill; let one actor overwrite its prior value. Why:
Task 48 Addendum 3 ratified D3, matching Relative Success/screened admission
without adopting AGM Success. **Load-bearing? yes** — prioritized revision is
order-sensitive and would invalidate the fence discipline.

### D73. Retain journal provenance in a ghost evidence map

Decided: keep the observable `holes` projection exactly as ratified and retain
candidate pairs in `EpistemicState.evidence`. Alternatives: add candidates to
`decided`; add an actor back to `filled`; define provenance through an invented
predecessor; omit the invariant. Why: `WF`, repair, and `no_loss` need durable
provenance after the meaning constructors erase it. **Load-bearing? yes** — the
decision guard alone cannot state terminal preservation.

### D74. Refuse only an empty resulting dispute

Decided: a dispute whose existing-candidate union is empty returns `none`.
Alternatives: admit `disputed ∅`; weaken `WF`; put a nonempty proof inside the
public move. Why: exact admission and nonempty-dispute preservation otherwise
contradict each other on `open + ∅`; all E2 clash repairs remain admitted.
**Load-bearing? yes** — without it `step_preserves_wf` is false in one step.

### D75. Runs quantify over every permutation of a finite intent bag

Decided: `Runs intents terminal` carries an arbitrary permutation and its
complete repaired execution from the all-open state. Alternatives: fix one
schedule; enumerate only two-agent shuffles; model the Effect scheduler. Why:
this gives schedule-universal finite claims without making an interpreter a
claim-bearer. **Load-bearing? yes** — surfaced conflict, no-loss, fence, and
seat results all quantify through it.

### D76. The fence interface is any sound pair-set function

Decided: `FenceRule` is a fixed function of the canonical nonempty pair-set
that selects a represented value. Canonical-min and holder-counting plurality
are instances; plurality breaks ties using the value comparator. Alternatives:
hard-code min into the theorem; expose insertion order; permit an unrepresented
winner. Why: pair-set accumulation, not a particular policy, provides path
independence. **Load-bearing? yes** — it is the generalized Addendum 2 claim
and licenses future declared criteria without a new schedule proof.

### D77. Single-seat stability is value-consistent

Decided: every intent targeting the seat must equal the same idempotent
`fill h v actor`. Alternatives: require only holder equality; prove only a
singleton run. Why: one holder can submit different values or an explicit
dispute, so holder equality alone is a counterexample. **Load-bearing? yes** —
this is the ratified premise under which `filled` cannot un-happen.

### D78. IC4 impossibility includes candidate-selection resoluteness

Decided: `no_fair_resolute_fence` assumes the total rule returns a value
represented by the two-candidate conflict. Alternatives: state only the raw
biconditional; hard-code min. Why: without selection, a third value makes both
sides of the biconditional false and defeats the claimed impossibility.
**Load-bearing? yes** — the premise is what makes the theorem about a fence
rather than an arbitrary constant function.

### D79. Total runners retain an aligned observation for every move

Decided: `runK` and `runRepairK` return the terminal state together with an
input-order list of `(move, admitted?)` observations. Alternatives: return only
the terminal state; return an aggregate success bit; retain only an unlabelled
boolean list. Why: refusal-continuation must remain observable, and `no_lossK`
must identify admitted fills without assuming moves are unique. **Load-bearing?
yes** — dropping move/status alignment would make the vector generator invent
refusal provenance or make admitted-fill accounting ambiguous.

### D85/D86 pointer (2026-08-15, DEV-673)

The absorb semantics (fills total; `runK` and the `no_lossK` pair
retired in favor of the frozen-spec laws) and the empty-offer refusal
are recorded under the DEV-673 heading in `proto/DECISIONS.md`,
numbered at merge per the repo-wide rule. D79's `runK` mention is
historical; the surviving total runner is `runRepairK`, and its
prose-only alignment invariant is now the proved
`runRepairK_alignment` (`spec_alignment`).

## Task 22 — kernel hygiene gates (2026-08-16; task-local D?? entries —
final numbers assigned at merge)

### D??. The kernel-bound roster is the `Moves` library, not the executable package

**SUPERSEDED by task 25** (see "The corpus generator joins the kernel-bound
roster" below): the roster now includes `Main.lean` and `Oracle/`, and the
`partial def serve` carve-out this entry reasons from became a per-site
allowlist row. The entry stands as the record of what was ratified and why the
Rev seat's F5 could reach it — the scope was drawn around the generator's
existing violations, so the gate was green on day one by construction.

Decided: scan `Moves.lean` and every `*.lean` file recursively under `Moves/`.
This includes a future `Moves/Wire.lean` automatically. Exclude `Oracle/` and
`Main.lean`: they are the corpus codec/generator and executable transport
adapter, not definitions destined for the proved kernel surface. The scanner
removes nested comments while retaining string contents conservatively because
interpolated strings contain compiled expressions; the word “partial” in model
prose is not a declaration, while any unsheltered `partial` token is refused.
Alternatives: scan every Lean file in the Lake package,
which would make the runtime-only interactive server's existing `partial def
serve` a kernel violation; hand-roster today's model files; scan only the
future `Moves.Wire` module. Why: the gate must follow the proof-bearing model
surface as it grows without conflating an oracle transport loop with the
stateless total kernel. **Load-bearing? yes** — scope determines which compiled
definitions the no-replacement and no-default guarantees cover.

### D??. Extern approvals bind to one exact source line

Decided: `kernel-extern-allowlist.txt` is initially empty. A future row names
`path:line`, the SHA-256 of the exact source line, and an
`operator-ratified:` reason. `@[implemented_by]` is never allowlisted.
Alternatives: allowlist a whole file; pin only a line number; allow any extern
once the package has one. Why: a file- or line-only permission can silently
authorize a changed annotation, while the digest makes annotation drift
re-enter review. **Load-bearing? yes** — the annotation gate closes a compiled
replacement channel that theorem axiom reports cannot observe.

## Task 25 — the hygiene cure (2026-08-17; task-local D?? entries — final
numbers assigned at merge)

Brief `scratch/dispatch/25-float-hygiene-cure.md`, items C3/C4/C5/C8c, curing
findings F3, F4, F5 and F11 of `docs/research/2026-08-16-review-float-hygiene-branch.md`
under operator rulings 5–6.

### D??. The corpus generator joins the kernel-bound roster

Decided: the roster is every Lean source in the package — `Moves.lean`,
`Moves/**`, `Main.lean`, and `Oracle/**`. Alternatives: keep the Task 22
model-only roster; add `Oracle/` but not `Main.lean`; add a second, weaker
gate for the generator. Why: `packages/moves/fixtures/moves-conformance.ndjson`
is a model-standing fixture, and the only thing standing behind it is this
generator executing the model. A generator that defaults a value emits a
verdict the model never reached, with exit status 0 — the exact shape house law
calls a hand-authored model verdict, arriving mechanically. The Task 22 scope
was recorded honestly but drawn around the generator's existing violations, so
the gate was green on day one by construction (F5). Two constructs the model
forbids are legitimately needed by an executable, and both are handled per site
rather than by a roster line: see the next two entries. **Load-bearing? yes** —
this is what makes "the corpus generator the estate already trusts" a checked
sentence rather than a premise.

### D??. `partial def serve` is a per-site exception, never a roster carve-out

Decided: `partial` joins the allowlisted class alongside `@[extern]`, with its
own `kernel-partial-allowlist.txt` in the same format — `path:line`, the
SHA-256 of the exact source line, an `operator-ratified:` reason. The file
carries exactly one row, `Main.lean:68`, whose ratified reason is that the
oracle's interactive serve loop is a non-terminating daemon transport, not a
value-defaulting channel: it returns no value the corpus records. Alternatives:
exclude `Main.lean` from the roster (the Task 22 shape); allow `partial`
anywhere outside `Moves/`; rewrite `serve` with fuel to remove the exception.
Why: an exception drawn as a scope boundary silently covers every future
violation in the same file, while a digest-pinned row covers one line and
re-enters review when that line moves or changes. The refused alternative also
matters: a fuel-bounded `serve` would put an arbitrary bound in the transport
for the sake of a gate. **Load-bearing? yes** — the same mechanism now carries
the only two approvals in the package, and both are arguable because both are
written down.

### D??. The panic-free gate refuses the naming convention, not the token

Decided: the gate refuses `panic!`, bare `panic`, `unsafe`, and the
bang-accessor family. The bang family is matched as a convention, not a name
list: any bang-suffixed identifier reached by dot-notation or namespace
qualification (`x.head!`, `List.head!`, `n.toNat!`), plus the unqualified core
accessors an `open` could bring into scope — `back! get! getLast! head! max!
min! next! peek! prev! set! tail! toInt! toNat!`, curated by scanning the Lean
4.33.0 core sources under `Init/` and `Std/` for `def`/`abbrev` names ending in
`!`. Alternatives: enumerate the ~90 core bang names (the full scan); match
every trailing `!` and allowlist the syntax bangs; keep the `panic!` token
check alone. Why: Lean reserves a trailing `!` on a term-level identifier for a
function that panics on invalid input — one stderr line, the type's `Inhabited`
default, exit 0. That is the RQ-1 default-return channel, and `panic!` is only
its most legible spelling: `panic "x"` and `([] : List Nat).head!` both opened
it while the token gate returned 0 (F4). Enumeration rots silently as core
grows; matching the convention does not. The syntax bangs `s!`, `m!`, `f!` and
the tactic variants are outside both branches by construction — never
dot-prefixed, never core accessor names — so the generator's interpolated
strings stay lawful without an exception. **Load-bearing? yes** — a gate scoped
to a token proves only that the token is absent.

Stated bounds. The convention branch does not see an unqualified bang name
outside the curated thirteen; a string containing `.head!` is refused, which
follows the Task 22 rule that string contents stay visible; and `x.foo!= y`
written without spaces would read as a bang accessor, which is why the pattern
excludes a following `=`.

### D??. `native_decide` is forbidden in source; `noncomputable` is not

Decided: `native_decide` joins the forbidden tokens. `noncomputable` is
deliberately NOT checked. Alternatives: rely on the axiom-footprint check for
`native_decide`; forbid `noncomputable` as an extraction hazard; forbid
neither. Why for `native_decide`: it is a trust channel of the same family as
`@[implemented_by]` — a compiled evaluator's verdict entering a proof as
`Lean.ofReduceBool` — and the footprint check only observes the rostered
theorems, so any of the seventy-six results excused in `gate-exclusions.txt`
could carry it unobserved. FINDING-48-AXIOMS was exactly this defect found
late. Why not for `noncomputable`: it removes compiled code rather than adding
a defaulting path, so it is not this gate's channel. The obligation it does
bear — every kernel definition extracts to code — is REF-0's, and it needs a
positive check that the artifact builds, not a token ban; building that ban now
would be machinery ahead of the decision that licenses it. **Load-bearing?
yes** for `native_decide`; the `noncomputable` half is recorded so the next
executor does not read its absence as an oversight.

### D??. Every shipped check ships a control, and every control is run

Decided: nine checks, nine committed negative controls, each planting exactly
its own violation and clearing the checks that run before it; a control
committed but never registered in `run.sh` fails the gate. Alternatives: keep
the two controls Task 22's brief named; add controls without the orphan rule;
assert the count against a hand-maintained constant. Why: house law is one
control per dropped law, and Task 22 shipped five checks with two controls
(F3), so three could have regressed silently while `VERIFICATION.md` claimed
all five. The orphan rule closes the other direction — the theorem orphan rule
already in this gate exists for the same reason, and a control nothing runs is
a control that cannot fail. **Load-bearing? yes** — it is what makes the ledger
sentence about this gate checkable rather than aspirational.

### D??. The oracle parses its count and refuses a bad one

Decided: `oracle emit N` parses `N` with `String.toNat?` and exits 2 with the
usage line when it does not parse, replacing `n.toNat!`. Alternatives: keep the
bang accessor and allowlist it; parse with a default of 0; leave it and exclude
`Main.lean` from the roster. Why: `toNat!` returns the `Inhabited` default, so
`oracle emit x` would have emitted the zero-vector corpus and exited 0 — a
forged model verdict with a successful exit code, on the path that writes the
fixture the TS kernel is walled against. A refusal is the only answer that
cannot be mistaken for an answer. **Load-bearing? yes** — this is the one live
violation the widened roster found (F5).
