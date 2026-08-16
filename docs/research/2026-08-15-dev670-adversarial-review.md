# Adversarial review of DEV-670 (the moves vector wall)

Commissioned by the operator 2026-08-15 after ruling hand-authored
model verdicts banned and pausing all slice work pending independent
review. Produced by an Opus 5 review agent with read-only repo access;
it read the briefed files, ran three Lean executability probes against
the pinned 4.33.0 toolchain in the scratchpad (no repo files touched),
and checked the Cedar reference. The full report follows verbatim.
Disposition of each finding awaits operator ratification; no fix has
been applied.

---

## F1 (critical). Over 99% of the enumerated universe cannot be driven through the daemon, and the plan has no accounting for the gap

**What's wrong.** The daemon's entire client surface is four verbs
(`proto/go/protod/dispatch.go:26-30`): `protocol.create`,
`session.open`, `session.fill`, `session.close`, `session.state`.
There is no dispute verb and no decide verb. The model has three
first-class moves. At the plan's instantiation (2 holes, holders
A/B/X, values 0/10/20) the move universe is:

- `fill`: 2 × 3 × 3 = **18**
- `dispute`: 2 × (2⁹ − 1 nonempty candidate subsets = 511) × 3 = **3066**
- `decide`: 2 × 3 = **6**

18 of 3090 moves (0.6%) have a wire counterpart. The `decide` arm has
none directly — the daemon only ever decides at close, at a value it
chooses itself.

Pre-states are worse. Model-reachable disputes are arbitrary nonempty
subsets of the 9 candidate pairs. Daemon-reachable disputes are
*exactly* two candidates, from two distinct seats, with two distinct
values (`protocol_session.go:278-296` refuses any fill on `disputed`,
so a dispute can never grow past 2). A model pre-state with a
3-candidate dispute, or a single-holder dispute, or a `decided` hole
in an open session, is unconstructible on the wire.

**Why it matters.** The harness must skip. Skip logic is unaudited
filter code, and it is precisely where a real divergence gets
swallowed: "vector 2,481 was skipped as unmappable" reads identically
whether the reason is structural or a bug in the mapper. A green gate
over a corpus that is 99% skipped is worse than 12 honest hand
vectors, because it *looks* like exhaustive coverage.

**Fix.** Two tiers, separately claimed.
- **Tier A — the wire-image fragment**, enumerated *exhaustively*
  (not bounded-depth; see F11), 100% driven, zero skips permitted.
  The harness asserts `driven == total` for Tier A.
- **Tier B — the full model universe**, model-only, committed as a
  model regression corpus. Never counted as differential evidence,
  and VERIFICATION.md says so.
- Tier A's skip count is a pinned constant of zero. Tier B is not
  driven at all. No vector is ever silently skipped.

---

## F2 (critical). The mapping artifact becomes the new hand-authored bridge — the ban is satisfied in letter and defeated in substance

**What's wrong.** Plan item 3 commits the model↔wire mapping "as
readable data beside the generator." Readable data that only a human
validates is a hand-typed model verdict wearing a different hat. And
the mapping is not a bijection — it has to *declare deliberate
divergences*, each of which is a human assertion about what the model
means:

| Situation | Model | Daemon |
|---|---|---|
| Same-seat conflicting fill | `repair` synthesizes the dispute (`Model.lean:245-251`; `canonicalRepairCandidates` never looks at the actor) | Refuses, `no self-revision` (`protocol_session.go:281-288`) |
| Fill on `decided` | Refused on hole state (`Model.lean:141`) | Refused `session-closed` — `decided` is only reachable *after* close, so the hole-state law has no observable witness |
| `dispute h ∅` | Refused (empty-merge guard, `Model.lean:147`) | No wire counterpart at all |
| `close` | Does not exist | Atomic seal + fence + record over all holes |

Someone types "here the daemon deliberately disagrees" for each. That
is a transcription surface with model verdicts on it, which is
exactly what the 2026-08-15 ruling banned.

**Why it matters.** Concretely: if a future refactor makes the daemon
accept a same-seat conflicting fill (say, someone relaxes the
`Candidates[0].Seat == seat` check), the vector for that case is
already annotated "expected divergence" and the gate stays green
through a real regression.

**Fix.** Make the mapping *executable and total*, in Lean, emitted
into the corpus:

```
inductive WireMove | fill (h) (v) (seat) | close (seat)
def toWire   : Move → Option WireMove          -- total, decidable
def ofWire   : DaemonHoleFold → Option HoleState
inductive Divergence
  | selfRevisionRefusedByDaemon
  | decidedMaskedBySessionClosed
  | closeHasNoModelCounterpart
  | ...
```

Every vector carries either `agree` or exactly one *named*
`Divergence` constructor. The acceptance criterion pins
`|Divergence| = N` as a constant. A disagreement that is not one of
the N named constructors fails the gate — which is the only version
of this that can catch the regression above.

---

## F3 (critical). The daemon's fence is not one of the model's proved fences, and the plan does not notice

**What's wrong.** `fenceChoice` (`protocol_session.go:642-654`) is
**seat-authority priority**: walk `hole.fence.order`, return the
first candidate whose seat matches. The model's two proved fence
instances are `minFenceRule` (canonical-min on the value comparator)
and `pluralityFenceRule`. Neither is seat priority. Neither is
anywhere near it — canonical-min ignores seats entirely.

So the corpus's `decide` vectors, computed by `Moves.step (.decide h v)`
for arbitrary admitted `v`, describe transitions the daemon never
performs. And the daemon's actual fence — the thing
`01-run-the-proved-calculus.md` calls "the calculus's heart" —
inherits **zero** proved results today.

**Why it matters.** This is the gap between "we proved fence path
independence" and "the code's fence is path-independent." The former
is stated; the latter is currently unproved *and unstated as
unproved*.

**Fix — the single highest-rigor-per-effort item in this review.**
`fence_deterministic` (`Model.lean:1121`) is already general over any
`FenceRule` — any sound function of the canonical pair-set.
Seat-authority *is* one. So:

1. Define `seatAuthorityFenceRule (order : List Holder) : FenceRule`
   in Lean.
2. Discharge its `sound` obligation. The required premise — the fence
   order covers every candidate's seat — is exactly what
   `protocol.create` already validates ("fence order is not a
   permutation" refuses, `protocol_moves_test.go:270-272`). The
   premise is real, checkable, and enforced by shipped code.
3. Instantiate `fence_deterministic` at it and add to `run.sh`'s
   `#print axioms` list.
4. The generator emits `decide` vectors **only** at the
   seat-authority choice.

Roughly 40 lines of Lean. It converts the daemon's live fence from
unproved code into an instance of a proved law, gives the `decide`
arm of the corpus meaning, and is the first genuine "universal
property → shipped behavior" transfer in this seam.

---

## F4 (high). The refusal rows are a generator invention, not model output — MOVES-1 is dissolved, not expressed

**What's wrong.** Plan item 2 says refused moves enter the corpus as
"refused, state unchanged," and that this "expresses" MOVES-1 rather
than papering over it. It does the opposite. `Moves.step` returns
`Option State`; on refusal it returns `none`. **"State unchanged"
appears nowhere in `Model.lean`.** MOVES-1 is not about single steps
at all — it is that `Runs` (`Model.lean:260`) retains only schedules
where nothing is ever refused, so a three-fill workload at one hole
has *zero* admitted runs while the daemon executes all three.

So every refusal row in the corpus is authored by the generator's own
convention, not by the proved calculus. The corpus's provenance line
would say "generated by executing the model" for rows the model has
no opinion about.

**Why it matters.** This is the same class of error the ban exists to
prevent, relocated from a JSON file into 3 lines of emitter code.
Nobody reviews the emitter as a model.

**Fix.** Either:
- **(a) The honest fix, and the one the refinement map needs anyway.**
  Add refuse-and-continue to the model:
  `stepK : State → Mv → State × Bool`, with
  `stepK_agrees : step s m = some s' → stepK s m = (s', true)` and
  `stepK_refused : step s m = none → stepK s m = (s, false)`, then
  re-derive `no_loss` and friends over `runK`. This closes MOVES-1
  rather than routing around it. It touches `Model.lean` — which the
  plan puts out of scope — so it needs a ratification, not an
  executor decision.
- **(b) The disclosed fallback.** Every refusal row carries
  `model_semantics: "absent — a refused move ends the model run;
  unchanged-state is a harness convention, not a model verdict"`, and
  VERIFICATION.md states that refusal rows are not model-authored.
  Explicitly and loudly.

Pick one in the issue. Do not let (b) happen silently, which is what
the current wording produces.

---

## F5 (high). Nothing checks that the generator's instantiation satisfies the model's hypotheses — and the instances do not come for free

**What's wrong.** `step` and `repair` are ordinary functions. They
compute whether or not the comparators are lawful. The seventeen
theorems all sit under `[Std.TransCmp valueCmp]
[Std.LawfulEqCmp valueCmp] [Std.TransCmp candidateCmp]
[Std.LawfulEqCmp candidateCmp] [FiniteCarrier HoleId]`. If the
generator instantiates at types where those instances are wrong,
missing, or `sorry`-backed, **the corpus generates fine, the diff
gate passes, and none of the theorems apply to the instantiation that
authored it.**

Probed against the pinned Lean 4.33.0 toolchain:

- A wrapper `def valueCmp (a b : Int) := compare a b` — **all four
  instance classes fail to synthesize.**
- `Ord (Value × Holder)` — **does not exist** in core or Std; there
  is no `Prod` Ord instance.
- `compareLex (compareOn Prod.fst) (compareOn Prod.snd)` — `TransCmp`
  synthesizes, **`LawfulEqCmp` does not.** The pair comparator's
  lawful-eq is a hand proof.

The candidate comparator's `LawfulEqCmp` is an unbudgeted proof
obligation, and it is the one most likely to get `sorry`'d under
schedule pressure.

**Fix.**
- The generator module carries `example : <headline law> ... := by
  exact ...` **instantiated at the concrete
  `HoleId/Holder/Value/candidateCmp`**, for at least `no_loss`,
  `clash_repair_confluence`, `fence_deterministic`, and the new
  `seatAuthorityFenceRule` soundness.
- `run.sh` extends its `#print axioms` roster to the instantiated
  statements and bumps the `report_count` constant.
- `run.sh`'s `sorry`/`admit`/`axiom` grep currently scopes to
  `Moves Moves.lean`. **Widen it to the generator and `Main.lean`**,
  or the entire fix is bypassable by putting the `sorry` in the new
  file.

---

## F6 (high). Value canonicalization is the `-0` trap this repo already learned, and a 3-value alphabet is blind to it

**What's wrong.** Model equality is `DecidableEq Value` on an opaque
type. Daemon equality is `sameCanonicalValue` — RFC 8785 canonical
bytes (`protocol_session.go:669-679`). The plan's alphabet is
`0, 10, 20`: three syntactically distinct JSON numbers. The corpus
therefore never asks whether `10` and `1.0e1` are the same fill,
whether `0` and `-0` are, or where the `int` check's
`9007199254740991` bound sits (`value_check.go:45`).

AGENTS.md names this exact failure mode as law: *"two implementations
sharing a bug agree, which is how `-0` survived until RFC 8785's
Appendix B was made the referee."* The plan reproduces the conditions
that let `-0` survive.

**Why it matters.** The equality predicate decides idempotent refill
vs. conflicting fill vs. dispute. It is the single
highest-consequence function in the seam, and the corpus as designed
cannot probe it once.

**Fix.** The value alphabet must contain at least one
canonical-equivalence class with multiple renderings (`10`, `1.0e1`,
`10.0`) plus the `0`/`-0` pair. The mapping declares the quotient
explicitly: the Lean `Value` is the canonical class; the wire
rendering is a choice function the corpus deliberately varies. Then
`idempotent-refill` and `conflicting-fill` vectors probe the
identification, with RFC 8785 Appendix B — already this repo's
referee for JCS — as the independent oracle outside both sides.

---

## F7 (high). The wall is structurally blind to agreed-upon defects, and one is already on the books

**What's wrong.** Differential testing catches disagreement. It
cannot catch two implementations that are wrong the same way. MOVES-5
is a live instance: a second holder confirming the same value leaves
the model's `evidence` untouched (`Model.lean:140`, `filled w` +
`w = v` → `some s`), and the daemon *also* returns early without
appending (`protocol_session.go:268-277`). **Both sides drop the
second holder's attribution. The wall will report PASS.**

Meanwhile the README asserts the same value from distinct holders
"remains two candidates and is counted twice by plurality" — true for
dispute pair-sets, false for fills, on both sides.

**Fix.** State in the issue and in VERIFICATION.md, in one line: *the
wall is evidence of agreement, not of correctness; MOVES-5 will pass
it and is not thereby dispositioned.* Then name at least one *third*
oracle for the properties the wall cannot referee — RFC 8785
Appendix B for value equality (F6), and for evidence growth, a
Lean-side property assertion over the generated corpus (e.g. "every
emitted post-state's evidence is a superset of its pre-state's")
checked independently of the daemon.

---

## F8 (medium-high). Nothing isolates the calculus, so a red vector is not attributable

**What's wrong.** A fill traverses: body decode → field requirements
→ session lookup → journal replay → hole lookup → **seat
authorization** → **cataloged type-check** (`value_check.go`) →
hole-state transition → canonical event → append → replay again.
Exactly one of those is the calculus. A red vector means "something
in that stack disagrees with the model."

Concrete false divergence: holder **X** is in the universe as "the
injection holder," but on the wire X is a principal that must be
bound to a seat declared on the target hole. If it isn't, the daemon
refuses `seat-unauthorized` while the model happily admits the fill
on an open hole. That is not a divergence; it's a misconfigured
protocol, and it will burn a debugging session before anyone spots
it.

**Fix, in value order.**
1. **Neutralize the non-calculus layers by construction.** The
   corpus's protocol declares all three holders as seats on *every*
   hole, and every hole's type is `{"k":"opaque"}` —
   `value_check.go:31` returns `nil` unconditionally for opaque.
   Type-checking and authorization become provably inert, and any
   refusal is then a calculus refusal.
2. **Add a fold tier.** `applyProtocolEvent`
   (`protocol_session.go:444`) is already essentially the pure fold.
   Drive the corpus against it directly as a fast first tier — a
   divergence localizes to fold-vs-model before journal, transport,
   or replay enter the picture.
3. **Keep the end-to-end tier**, but its job becomes narrower and
   clearer: prove the fold tier is the fold the wire actually runs.

---

## F9 (medium-high). Deleting the 12 vectors in the same commit *reduces* coverage

**What's wrong.** Plan item 4 deletes `protocol-moves.json`
wholesale, "any case worth keeping is worth re-deriving." Several
cases cannot be re-derived, because the model has no `close`, no
`unfilled`, no `sealed`, no outcome, and no digests:

- `close-seals-filled`, `empty-decision-abandons`,
  `post-close-fill-refuses` — session lifecycle, entirely outside the
  model.
- `unauthorized-fill-refuses` — seat law, outside the model (and
  deliberately neutralized by F8's fix).
- `fence-coordinator-arrives-first` / `fence-operator-arrives-first`
  — and the assertion at `protocol_moves_test.go:188` that their
  **`final_state_digest` values are equal**. That is the strongest
  single line in the file: daemon-side arrival-order independence
  checked at the digest level, the runtime analogue of
  `fence_deterministic`. The generator cannot author it; the model
  has no digests.

**Fix.** Split, don't delete. AGENTS.md already licenses the residue:
*"Hand-written tests of contract prose remain ordinary tests; they
claim nothing about a model."* Move the lifecycle/seat/digest vectors
into a clearly-named contract fixture with a provenance line that
claims nothing about the model, **keep the digest-equality
assertion**, and delete only the rows making model claims. Say this
explicitly in the issue or the executor will do the simple thing and
drop the digest check.

---

## F10 (medium). Theater: the regeneration diff and the ban gate

**Byte-identity is fine but oversold.** It detects one thing: a
hand-edited corpus. It cannot detect a wrong model, a wrong daemon, a
wrong mapping, or a wrong emitter convention (F4). Acceptance
criterion *"perturbing any vector fails the Lean regeneration diff"*
is a tautology. **A gate that cannot fail for an interesting reason
proves nothing** — this repo's own precept.

On feasibility: byte-identity across Windows dev and CI is realistic
here. `.gitattributes` already pins `proto/wire/fixtures/** text
eol=lf` and `lean-toolchain` pins 4.33.0. The residual risks are (a)
the corpus landing at a path *not* covered by `.gitattributes`, (b)
toolchain drift, (c) any `HashMap` iteration or `Float` formatting in
the emitter. Semantic equality would be strictly worse — it licenses
emitter drift. Keep byte-identity; demote the claim to "the committed
corpus is this generator's output."

**The ban gate is the weaker half.** `grep -ri "hand-authored"` is
defeated by not typing the word, and a provenance line is itself
hand-typeable. For files inside the regeneration set it adds nothing
the diff already gives; for files outside it, it gives nothing at
all.

**Fix.**
- Replace the grep with a **registry**: a checked-in list of fixture
  paths that carry model verdicts, each with its generator command.
  The gate re-runs every registered generator and diffs, *and* fails
  if any fixture consumed by a test that also asserts model-derived
  expectations is absent from the registry. That gate can fail for a
  real reason.
- Strengthen the mutation gate. One planted mutation is theater at
  n=1. Require **≥3 distinct planted runtime mutations** (e.g. flip
  `Candidates[0].Seat == seat`; drop the `sameCanonicalValue` early
  return; reverse `fence.order` traversal), each caught by a *named*
  vector, with the mutation→vector map in the closing report. That is
  a coverage measurement rather than a smoke test.

---

## F11 (medium). "Bounded depth" is the wrong shape — the wire-image fragment is small enough to enumerate *completely*

**What's wrong.** "Every pre-state reachable within a small stated
bound" leaves the bound unstated, and invites the unanswerable
question "what does depth 3 miss?"

**But no bound is needed.** Wire-reachable pre-close hole states at
the plan's instantiation:

- `open`: 1
- `filled v`: 3
- `disputed {(v,a),(w,b)}` with `v ≠ w`, `a ≠ b`: 3 unordered
  seat-pairs × 6 ordered distinct-value assignments = 18

**22 states per hole.** Two holes → 484 pre-states. × 18 fill moves →
**8,712 vectors**, plus close. Entirely tractable, and *complete*.

**Fix.** Replace "bounded-depth reachable" with **provably complete
over the wire-image fragment**, and prove the completeness
mechanically: enumerate the candidate state set, apply every wire
move to every state, and assert every resulting state is already in
the set (closure under the wire step). That check is decidable, runs
in the generator, and the gate asserts it. It upgrades the honest
rung from "bounded sample" to **exhaustive small-scope**.

---

## F12 (low). Emission machinery the plan doesn't name

`State` is `HoleId → HoleState` with no `DecidableEq` and no `Repr`;
dedup needs a derived key over `FiniteCarrier.elems`; `ExtTreeSet`
rendering goes through `toList`. All routine, all real work, and all
of it must live **outside** `Moves/Model.lean` per the plan's own
out-of-scope rule. Name the files in the issue: `Moves/Vectors.lean`
(instantiation, instances, `Repr`, state key, instantiated law
examples) and `Main.lean` (emitter), `Model.lean` untouched,
`run.sh`'s guards widened to both.

---

# Answers to the framing questions

**1. Bounded corpus vs. online oracle vs. both.** Both, staged — but
the corpus's marginal value saturates fast here. Cedar's `cedar-drt`
compiles the Lean model behind an FFI and runs millions of randomly
generated inputs through model and production side by side; there is
no corpus, hence no transcription surface, and coverage is unbounded
([cedar-spec](https://github.com/cedar-policy/cedar-spec),
[How We Built Cedar](https://arxiv.org/html/2407.01688v1),
[Amazon Science](https://www.amazon.science/blog/how-we-built-cedar-with-automated-reasoning-and-differential-testing)).
That is the right end state. The reason not to start there: Cedar's
Lean model is *total* over the production engine's input space. This
one is not — no close, no `unfilled`, no lifecycle, no type-checking,
and MOVES-1 means no semantics for refuse-and-continue. **Corpus now
(exhaustive, per F11), mapping made executable now (F2), online
oracle when the mapping is total** — name that trigger in the issue
so the oracle is a scheduled rung, not an aspiration.

Coverage of the bounded universe: the fill/conflict/repair kernel,
completely (F11). Provably missed: value canonicalization classes
(F6), evidence growth on same-value refill (F7 — both sides agree
while being wrong), disputes past 2 candidates (unreachable on the
wire), fence tie-breaking (F3 — the daemon's rule isn't modeled), and
every close interaction (F9).

**2. Byte-identity.** Realistic and the right mechanism; the wrong
*claim*. It is tamper-evidence. See F10.

**3. Does the mapping gap undermine the claim?** Yes, as written —
F2, F3, F4. The wall can honestly claim: *for the wire-image fragment
of the calculus at this instantiation, exhaustively enumerated, the
daemon's fold agrees with `Moves.step`/`Moves.repair` modulo N named,
machine-enumerated divergences.* It cannot claim anything about
`dispute`, about `decide` at non-seat-authority values, about
refused-then-continued traces, or about close.

**4. Isolation.** Opaque hole types + all-seats-on-all-holes makes
type-check and authorization provably inert; a fold tier over
`applyProtocolEvent` localizes divergence. See F8.

**5. Highest rigor per effort.** F3 — instantiate the daemon's
seat-authority fence as a Lean `FenceRule`, prove `sound`,
instantiate `fence_deterministic` at it. ~40 lines. The only item
that *adds a proved law about shipped behavior* rather than adding
evidence about it. Runner-up: F5's instantiated-law examples wired
into `run.sh`.

**6. Theater.** The regeneration-perturbation criterion
(tautological), the `grep -ri "hand-authored"` ban gate (defeated by
not typing a word), the single-mutation gate-teeth (n=1), and — most
consequentially — "the MOVES-1 divergence is expressed by the vector
format," a claim sized well above its evidence.

---

# Recommended revised design

**Title:** The moves vector wall: exhaustive over the wire-image
fragment, generated and mapped in Lean

**Scope**

1. **`verify/moves/Moves/Wire.lean` — the executable mapping.**
   `WireMove` (fill/close only), total `toWire : Move → Option
   WireMove`, `ofWire : DaemonHoleFold → Option HoleState`, and
   `inductive Divergence` with one constructor per declared
   model↔daemon disagreement (`selfRevisionRefusedByDaemon`,
   `decidedMaskedBySessionClosed`, `closeHasNoModelCounterpart`, …).
   `|Divergence| = N` is pinned in acceptance.

2. **`verify/moves/Moves/Vectors.lean` — the instantiation.**
   `HoleId := Fin 2`, `Holder := {A,B,X}`, `Value` = the canonical
   class over the alphabet `{0, -0, 10, 1.0e1, 20}`. Supply and
   **prove** `TransCmp`/`LawfulEqCmp` for the value and pair
   comparators (the pair `LawfulEqCmp` is a hand proof — probed, no
   Std instance exists). Add `Repr`, a state key, and `example`s
   instantiating `no_loss`, `clash_repair_confluence`,
   `fence_deterministic`, and `seatAuthorityFenceRule.sound` at these
   concrete types.

3. **`seatAuthorityFenceRule` in Lean.** Defined over a declared seat
   order, `sound` discharged under the covering premise that
   `protocol.create` already enforces, `fence_deterministic`
   instantiated at it. Added to `run.sh`'s `#print axioms` roster.

4. **`verify/moves/Main.lean` — the emitter.** Enumerate the 22
   wire-reachable hole states per hole → 484 pre-states; cross with
   the 18 fill moves plus close; compute admitted/refused and
   post-states via `Moves.step`/`Moves.repair`; emit **Tier A** JSON
   to `proto/wire/fixtures/` (covered by the existing `eol=lf` pin),
   provenance = the generation command. **Also emit a machine-checked
   closure certificate**: applying every wire move to every
   enumerated state lands inside the set — the completeness claim,
   decidable, asserted by the gate. Emit **Tier B** (full universe)
   separately, model-only, never driven.

5. **Refusal semantics, disclosed.** Every refusal row carries
   `model_semantics: "absent — a refused move ends the model run;
   unchanged-state is a harness convention"`, unless MOVES-1 is
   closed first via `stepK` (a separate, ratifiable change to
   `Model.lean`, not an executor decision).

6. **Corpus protocol.** Two holes, all three seats on both holes,
   hole types `{"k":"opaque"}`, `fence.order` declared. Type-check
   and seat authorization provably inert.

7. **Harness, two tiers.** Tier 1 drives Tier A through
   `applyProtocolEvent` (pure fold) in Go; Tier 2 drives the same
   corpus through the real daemon in Go and TS. Both assert
   `driven == total`, zero skips. Every vector resolves to `agree` or
   exactly one named `Divergence`; anything else fails.

8. **Fixture split, not deletion.** Model-claiming rows deleted.
   Lifecycle/seat/digest rows move to a contract fixture whose
   provenance claims nothing about a model, **keeping the
   `final_state_digest` order-independence assertion**.

9. **Gates.** (a) regeneration byte-diff; (b) closure certificate;
   (c) instantiated-law axiom footprint, `run.sh` guards widened to
   the new files; (d) fixture registry replacing the `grep` ban gate;
   (e) ≥3 planted runtime mutations, each mapped to a named catching
   vector in the closing report.

**Acceptance (mechanical)**

- Tier A is exhaustive: closure certificate passes;
  `driven == total == <pinned count>`; zero skips.
- Regeneration is byte-identical; the corpus lands under a
  `.gitattributes`-pinned path.
- Every headline law used by the generator is instantiated at the
  concrete types and appears in the axiom footprint check with no
  `sorry` in any generator file.
- Every vector resolves to `agree` or one of the N named
  divergences; N is pinned.
- ≥3 runtime mutations each fail against a named vector; the map is
  in the report.
- The fixture registry gate fails on an unregistered model-verdict
  fixture.
- VERIFICATION.md states the honest rung: **R0/R1 differential,
  exhaustive over the wire-image fragment at the stated
  instantiation, modulo N named divergences.** Not a refinement map,
  not correspondence. Explicitly: refusal-continuation traffic is out
  (MOVES-1); MOVES-5 passes this wall and is not dispositioned by it;
  close, `unfilled`, `sealed`, outcomes, and digests are
  contract-tested, not model-derived.

**Out of scope:** the refinement map; `Model.lean` semantics changes
— including the `stepK` fix for MOVES-1, which is a ratification, not
an executor call.

**Sources:**
[cedar-spec](https://github.com/cedar-policy/cedar-spec),
[How We Built Cedar: A Verification-Guided Approach](https://arxiv.org/html/2407.01688v1),
[Amazon Science on Cedar DRT](https://www.amazon.science/blog/how-we-built-cedar-with-automated-reasoning-and-differential-testing)
