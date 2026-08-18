# Agentic Lean — three papers, 34 surviving items

Lit pass for the agent plane, 2026-08-18. Three 2026 papers that put a Lean
4 kernel between a model's proposal and an effect. They are the closest
published neighbours to the seam our agent-plane record occupies, and the
batch was read for what it forces us to change, not for what it endorses.

## Papers

| Key | Paper | One line |
| --- | --- | --- |
| `2604` | Type-Checked Compliance: Deterministic Guardrails for Agentic Financial Systems Using Lean 4 Theorem Proving | Position/architecture paper proposing a Lean kernel as a pre-trade compliance gate; argues from securities regulation; ships no system and reports no primary measurement. |
| `2606` | LAMP: Lean-based Agentic framework with MCP and Proof Repair | Implemented Planner/Builder/Verifier harness with an MCP toolbox and a bounded proof-repair loop, measured on 90 curated theorems in an off-Mathlib combinatorics-on-words library across three backbones with two ablations. |
| `acl1836` | Towards Trustworthy Smart Contract Synthesis: A Multi-Agent Framework with Lean-Based Verification (LeVer) | Multi-agent contract synthesis with a Lean verifier and an adversary in the loop over rounds, with two worked case studies and printed final artifacts. |

## Provenance

- `2604` — arXiv 2604.01483v1 (2026). Local PDF:
  `C:\Users\kokok\Dev\2604.01483v1.pdf` (605,339 bytes).
- `2606` — arXiv 2606.28841v1 (2026), IIITDM Kancheepuram, LNCS-format
  preprint. Local PDF: `C:\Users\kokok\Dev\2606.28841v1.pdf` (836,495 bytes).
- `acl1836` — ACL 2026 Long Papers, pp. 39548–39582, Renmin University;
  anthology id `2026.acl-long.1836`. Local PDF:
  `C:\Users\kokok\Dev\2026.acl-long.1836.pdf` (1,273,661 bytes).

## Extraction method

Each PDF was read as a liteparse text transcript — page-ordered text
extraction, no layout reconstruction — and mined item by item by a
multi-agent pass, then put through an adversarial verification pass that
re-read the cited section for every item and killed the ones whose quote,
arithmetic, or estate claim did not survive. Verified items were kept with
the verifier's reason attached; several were kept only in amended form,
where the finding held but the estate delta overreached. Those amendments
are folded into the entries below and are marked *(amended)*.

Item keys are the extraction keys and are deliberately non-contiguous:
gaps are items the verifier killed. Surviving counts are 11 for `2604`,
11 for `2606`, 12 for `acl1836`.

The entries below paraphrase the sources and cite by section, figure, or
table number. Verbatim wording was the unit of verification during
extraction and lives in the extraction transcripts; only short terms of art
are quoted here.

## Standing caveat on numbers

Liteparse flattens tables: cells arrive shredded and interleaved, and a
shredded cell can contradict the paper's own prose. The rule applied
throughout this batch is that a number is usable only if the prose states
it, or if it reconstructs exactly from per-row data.

Concretely, three exclusions and two reconstructions are load-bearing here:

- `2604` §4's comparison matrix is shredded. Its NeMo latency cell (~500 ms)
  and its Cedar cell (~5 s per verification) are both excluded; the prose
  figures used instead are "hundreds of milliseconds" (§5.1) and the 5 µs /
  7 µs differential-testing pair (§2.4). The excluded Cedar cell contradicts
  the prose by six orders of magnitude, which is what shredding does.
- `2606` Table 4 is flattened; the ablation deltas are taken from §4.3 prose,
  and the two ablation rows reconstruct exactly to 76/90 and 77/90.
- `2606` Table 10's Period row was reconstructed from the per-theorem rows of
  Table 9 (#69–78: Kimi 8/10, Claude 6/10, DeepSeek 1/10) and matches.
- `acl1836` Table 1 is shredded and is not load-bearing: every figure used in
  `acl1836#1` is restated in §5.3 prose.

## Reading key

House law names used below, glossed once:

- **the fold** — the monotone evidence plane; cell merges are associative,
  commutative, idempotent (ACI), so replay and reordering are safe.
- **F1/F2** — permutation and duplication invariance of evidence merges.
- **F2b** — successor discipline: contiguous-frontier apply, where positions
  are per-partition stream sequence numbers.
- **F3** — anchored resumption. **F4** — partition merge for commutative
  algebras. **F7** — context-assembly determinism (3 statements).
- **F5** — at-most-one-landed, proven over a Veil/Lean model of fenced
  compare-and-set registers. **I1** — fencing-token monotonicity. **I2** —
  once-only.
- **F9** — policy meet-attenuation: combining policies only shrinks authority.
- **F10** — monotone trigger grammar: a closed five-production inductive type
  in which absence, negation, and deadlines are unrepresentable.
- **F11** — query determinism for topK. **F12** — directory: grow-only binds
  plus a fenced rebind register. **C7** — pin well-foundedness: the
  content-addressed DAG is acyclic by hash-preimage.
- **the commit door** — the conformance check that admits or refuses a
  declaration before anything lands.
- **the corpus wall** — model-emitted conformance rows consumed row-for-row by
  the runtime, with row constructors carrying witness-theorem terms so a
  drifted verdict fails to elaborate.
- **G23** — recorded bound: at-most-one landed *outcome* is not at-most-one
  external side effect. **G26** — constrained decode against cataloged schema
  digests at the Models seam, plus commit-door conformance refusal. **G27** —
  ontology declaration. **REF-0** — the WASM-preferred kernel and stateless
  ABI decision (grill closed 2026-08-16).
- **the shuttle** — chartered Go daemon translating LLM harness event streams
  into fabric acts, under a translate-only fence.

---

# `2604` — Type-Checked Compliance

## What it establishes

No implementation, therefore no primary measurement: every number in the
paper is secondhand, and the one comparison table is shredded past use. What
it does establish is threefold.

First, a regulator-grade articulation of why a probabilistic gate fails
categorically rather than statistically, anchored in SEC Rule 15c3-5's
"direct and exclusive control" standard.

Second — unintentionally — a fully worked proof-carrying gate that is sound
single-threaded and unsound under its own Phase 3 roadmap, for want of a
fencing token. It is the sharpest external validation of the CALM split in
this batch, and it is a counterexample rather than a proposal.

Third, five distinct ways a Lean-in-the-loop gate fails *green*: referential
drift under shape-valid decode, an unfenced state snapshot, model-authored
axioms in the trusted base, a model reinstalled at the audit seam, and a
sandbox mistaken for action correctness.

It also transmits AWS Cedar's architecture accurately at second hand: prove
a decision procedure once, evaluate it, and differentially test the
implementation against the Lean model.

## Items

**`2604#1` — Symbol drift defeats shape-valid gates; the catalog must pin
referents, not just schemas.** *(refutation · now)*
*Cite:* §4.2.2 (formalization drift and perturbation, ref [31]); §4.2.3
(mitigation via concept-symbol constraints, MenTaL, ref [30]); reprised §6.1.
*Finding:* sentence-level perturbations — rephrasing, irrelevant context,
synonym substitution — make an LLM translator bind a concept to the wrong
Lean symbol. An indirect prompt injection that maps a restricted action onto
a permitted symbol produces a proof the kernel verifies, authorizing the
violation. Their mitigation is an explicit concept-to-symbol table built
before translation against a hard-coded registry, plus static-parse context
hydration that strips untrusted external text before the formalizer sees it.
*Seam:* G26/G27; the F10 unrepresentability template; F7.
*Change:* a schema digest constrains shape; drift is a referential attack
that a shape-valid decode passes cleanly. Two deltas. (1) The catalog must
additionally pin a closed, content-addressed identifier universe — action,
resource, capability ids — so an off-catalog referent is unrepresentable
rather than merely invalid; this is the F10 move applied to identifiers, and
constrained decode against a closed enum genuinely cannot emit one.
(2) The commit door must check that the declaration's identifier set is a
subset of the identifiers named in the content-addressed writ; otherwise the
provenance chain faithfully hashes a declaration that denotes the wrong
thing and every downstream hop is green. It also gives F7 a companion
candidate — **F7c, context provenance confinement**: for a
declaration-producing assembly, every included cell's origin label lies in
the trusted set, so the assembled digest is a function only of
trusted-origin cells.

**`2604#3` — TOCTOU: proof-at-decision-time is not validity-at-landing-time.**
*(failure-mode · now)*
*Cite:* §2.3.2 steps (2)–(5) — the orchestrator intercepts, extracts
parameters and current systemic state variables, forms the conjecture, the
kernel returns binary true, and the *original* call is routed to the
execution layer; §6.3 adds concurrent multi-agent meshes with bounded
mailboxes and work-stealing schedulers.
*Finding:* the conjecture is proved against a state snapshot read at
interception, and nothing binds that snapshot to the state at execution.
Two agents each proving a 6%-of-capital trade against the same snapshot
jointly breach the paper's own 10% example limit while both proofs remain
valid. There is no fence, no CAS, and no at-most-one-landed anywhere in the
paper; concurrency appears only as a throughput concern.
*Seam:* F5, I1, I2, fenced CAS registers; commit-door record; G23.
*Change:* pre-register the bound by name on the commit-door record — the door
proves the declaration conforms against a read; it does not prove the read
still holds at landing — and require that predicate evaluation and the
landing CAS be one fenced act over the same register read. Without that, our
door inherits this hole verbatim the moment a door predicate reads mutable
coordination state. Conversely, cite this as the counterexample in the R2
splash: a fully worked guardrail architecture, sound single-threaded, unsound
under its own Phase 3, purely for want of a fencing token.

**`2604#4` — Model-authored `axiom` declarations fail open silently.**
*(failure-mode · now)*
*Cite:* §2.3.1 step (3) — resulting axioms, theorems and definitions are
stored in an immutable Policy Environment; §3.1 — capital thresholds
formalized as immutable Lean axioms.
*Finding:* policy enters the trusted base as `axiom` declarations emitted by a
model. An inconsistent axiom set proves `False` and therefore every
conjecture: the gate authorizes everything, silently, with a green kernel at
microsecond latency and a perfect audit trail. The paper never discusses
consistency of the Policy Environment, and its self-repair loop (§2.2)
actively rewards adding whatever makes compilation succeed.
*Seam:* axiom footprint gate ({propext, Classical.choice, Quot.sound});
committed mutant controls.
*Change:* converts the footprint gate from hygiene into a stated
anti-fail-open property. (1) Record the law: policy and authority content
enters verify/fabric as definitions and decidable predicates, never as
`axiom`. (2) Add a footprint-pollution control — inject `axiom hole : False`
in a mutant branch and require the gate to red with a committed trace. See
`2606#1` for the sibling control and the numbering collision.

**`2604#5` — "Direct and exclusive control" as the scoping standard for our
enforcement claims.** *(evidence · now)*
*Cite:* §3.1 (SEC Rule 15c3-5, ref [54]); §5.1 (NeMo's LLM-as-a-judge adding
hundreds of milliseconds to the critical path — prose figure; the §4 matrix
cell is excluded).
*Finding:* a regulator-grade statement of a rule we hold in house dialect. A
gate whose verdict is a function of a model's output distribution is not
control at any accuracy: a filter blocking 99.9% of non-compliant trades
fails the standard the same way 60% does, because the failure is categorical,
not statistical.
*Seam:* G23; G26; MCP-first agent-first DX; the shuttle's translate-only
fence.
*Change:* outsider-legible language for two records. (a) Refusing LLM-judge
doors and requiring constrained decode plus a *total* commit-door check is
not fastidiousness; it is the difference between control and a filter.
(b) It sharpens the scope statement we owe on the agent plane: the fabric has
exclusive control of what *lands* and none over side effects reachable
through non-fabric tools in an MCP-first DX. That is G23 in a regulator's
vocabulary, and it forces the shuttle's translate-only fence to be recorded
as explicitly **not** an enforcement fence.

**`2604#6` — Cumulative-resource constraints: the law family the commit door
is missing.** *(design-pattern · next-slice · amended)*
*Cite:* §5.1 — schema validation can guarantee that a proposed trade volume
is an integer, but cannot prove that the specific integer, combined with
historical margin usage and real-time capital constraints, satisfies a
multi-tiered policy.
*Finding:* the cleanest statement in the batch of the constraint class no
schema or conformance gate over a single message can express — predicates
ranging over accumulated history rather than over the shape of one message.
The paper wants this and cannot get it soundly, because it has no fold: its
only route is the unfenced snapshot of `2604#3`. We have the fold and have no
rostered law for it.
*Seam:* G26 commit door; F9; M3 join-semilattice wave (new law family,
F13-shaped).
*Change:* new law candidate — **budget/quota attenuation**, our first
commit-door law that is state-relative rather than shape-relative, which is
precisely the class the paper argues is fatal to schema validation. Shape: a
monotone consumption counter on the evidence plane (ACI merge, so replay and
duplication are safe by F1/F2), a fenced once-only spend on the coordination
plane (I2), and `cumulative ≤ cap` proven as an invariant of the fold. Fix
the unrepresentability framing before this reaches a record: F10-style
unrepresentability applies to productions authored inside the fold, not to an
externally supplied quantity arriving at the door. So the fold's spend
constructor carries the bound — no reachable state exceeds cap, by
construction — while an over-spend *declaration* is refused at the door with
a named reason, under the same guard/refusal-theorem parity `acl1836#3`
demands. The invariant and the refusal are two laws, not one. Composes with
the semilattice package: the counter's derived order is the attenuation
order.

**`2604#7` — Verify the decision procedure, then differentially test it —
with a randomized generator, not a fixture list.** *(eval-method ·
next-slice)*
*Cite:* §2.4 (decoupling proof generation from proof checking; Cedar
differential testing at ~5 µs per input against the Lean model vs ~7 µs for
optimized Rust, ref [4]); §5.2 (verification-guided development; Lean models
and verifies evaluator, authorizer and validator; quadrillions of production
authorizations).
*Finding:* the architecture that shipped at scale is not "prove each instance
at runtime" but "prove a decision procedure once, then evaluate it, and
differentially test the implementation against the Lean model." Both figures
are §2.4 prose and both are secondary (AWS blog); they are load-bearing only
for the latency argument, not for the technique.
*Seam:* corpus wall and generated-vectors discipline; F9/F10/F11 runtime
evaluators; verdict-truth binding.
*Change:* (1) for every predicate the TS runtime evaluates, roster the
agreement theorem in `decide_correct` shape (`decide p = true ↔ P p`) so the
runtime executes a *proved* decision procedure rather than a parallel
reimplementation the corpus merely spot-checks; core `grind` (Lean 4.23+,
cited §2.4 ref [28]) discharges the arithmetic obligations without touching
zero-dep. (2) Add a generator-driven randomized differential mode beside the
enumerated fixtures: a Lean-side generator emits a large corpus, the runtime
replays it, any mismatch reds the wall. That makes the standing
"probe beyond the fixture" ruling mechanical, and it is the coverage story
Cedar has and our enumerated corpus does not.

**`2604#8` — Cedar's order-independence theorem is the missing
consumer-facing face of F9.** *(theorem · next-slice)*
*Cite:* §5.2 — AWS rosters overarching theorems such as forbid always
trumping permit regardless of evaluation order (refs [3], [4]).
*Finding:* what a policy engine's consumers rely on is not attenuation in the
abstract but two of its consequences: effective authority is a function of
the *set* of applicable policies rather than their sequence, and deny is
absorbing, so short-circuit evaluation is sound. AWS rosters these as
headline theorems precisely because they license parallel and incremental
evaluation.
*Seam:* F9; M3 explicit join-semilattice package.
*Change:* roster two companions to F9 under consumer-facing names —
(i) permutation and duplication invariance of policy combination, the F1/F2
shape lifted from the evidence plane to the policy plane; (ii)
deny-absorption, where deny is the zero of the combination. If both fall out
of F9's meet as corollaries they still belong on the roster and in the API,
per universal-properties-to-DX. Payoff: policy evaluation becomes legally
parallelizable and incrementally cacheable, and the short-circuit path in the
commit door stops being an unproved optimization.

**`2604#9` — Refusal reasons must be data; the paper's RAG back-translation
reintroduces the layer it condemned.** *(refutation · next-slice)*
*Cite:* §3.3 (right to explanation and reverse auto-formalization): a failed
compilation yields a dependently typed error trace the paper calls legally
insufficient, and the fix is a fine-tuned NL2Lean-style translator over a RAG
pipeline, claimed to be a one-to-one translation of the constraint that
forced the denial rather than a hallucinated rationale.
*Finding:* unjustified on the paper's own terms. §3.1 and §5.1 spend pages
arguing that a probabilistic map cannot be relied on for compliance, and §3.3
installs one at the audit seam, where its output is the legally operative
artifact. The sound half is the isolation step: identify the exact failing
axiom and tactic (their worked example fails a debt-to-income axiom).
*Seam:* G26 refusal; the outcome hop of the provenance chain
(writ→session→context→declaration→outcome→evidence→anchor); shuttle fence.
*Change:* our refusal carries a structured, content-addressed reason term —
failing predicate identity, witness or counterexample, and the cell digests
read — and the human-readable rendering is a *total* function of that term,
itself covered by the corpus wall. Never generate the reason. This adds a
decision-witness field to the outcome hop, making the anchor self-certifying
in the way corpus rows already are. Pre-register the inverse as a failure
mode: any explanation path that runs through a model turns the audit trail
back into a probabilistic artifact.

**`2604#10` — Generate the theorem roster and dependency DAG from the Lean
environment, Herald-style.** *(technique · next-slice)*
*Cite:* §3.3 — static analysis extracts theorem declarations, dependency
relationships and precise proof states from Lean 4 environments (ref [21]).
*Finding:* Herald's transferable contribution is the extraction, not the
dataset: a Lean environment is mechanically queryable for declarations,
per-theorem dependency edges, and proof states. Everything needed is Lean
core (`Lean.Environment` constant traversal, axiom collection behind
`#print axioms`), so it is compatible with our zero-dep 4.33 package.
*Seam:* the 130-theorem roster; footprint gate; wave ledgers and round-2
review.
*Change:* machine-emit the roster as a committed artifact — per theorem, name,
statement, collected axiom set, dependency edges. Roster drift and axiom
drift become a diff on a generated file rather than a review obligation, and
the dependency DAG makes "which rostered laws rest on this lemma" mechanical,
which is exactly what a reviewer needs when a round-2 repair touches a shared
lemma and nobody can see the blast radius. Same generated-not-hand-typed
discipline we already enforce on conformance fixtures, applied to the roster.

**`2604#11` — Shadow mode with a published disagreement rate before the
shuttle fence is load-bearing.** *(eval-method · next-slice)*
*Cite:* §6.1 Phase 1 MVP — the system runs asynchronously in shadow mode, live
agentic outputs logged and passed to the orchestrator for post-execution
verification, with kernel judgments compared against human compliance reviews
to measure translation fidelity and baseline error rates.
*Finding:* the one methodologically sound piece of their roadmap: never put
the gate in the critical path until you have measured how often its derived
judgment disagrees with reality. Their oracle is weak — human compliance
review, so the fidelity number is itself a sample of opinion.
*Seam:* Go shuttle epic; agent plane pre-commit-door.
*Change:* gives the shuttle a phase 0 with a number attached — translate
harness event streams into *derived* would-be acts, never commit, and diff
the derived decisions against actual harness outcomes; the fence goes
load-bearing only after a disagreement rate is published. Our oracle is
strictly better than theirs — the fabric's own fold, not a reviewer's opinion
— so the diff is mechanical and can be a wall rather than a study. Satisfies
dogfood-must-run-the-artifact: shadow mode is a run, a report is not.

**`2604#12` — Pre-register the WASM over-claim before our own REF record
accretes it.** *(failure-mode · next-slice)*
*Cite:* §4.3 (execution sandboxing): the protected call stack is said to
render control-flow hijacking mathematically impossible (ref [53]), and a
jailbroken translation layer engineering a malicious proof is said to leave
execution permanently trapped in the WASM sandbox, neutralizing the threat.
*Finding:* a category error, refuted by the paper's own §4.2. The drift attack
produces an action that is *authorized* and wrong; a sandbox bounds how code
runs and what ambient authority it holds, not which action is permitted. A
correctly sandboxed module exercising its granted capability issues the bad
trade exactly as designed, and WASI least-privilege does not help, because
the capability to place orders is the one capability it must be granted.
*Seam:* REF-0 / WASM-preferred kernel and stateless ABI.
*Change:* a one-line amendment to the REF record now, far cheaper than
un-claiming later: the WASM kernel bounds execution integrity and ambient
authority *of the checker*, explicitly not action correctness. Structurally
identical to G23, and the same discipline — state the bound in the record
where the mechanism is decided, so no downstream doc can quietly upgrade
"sandboxed" into "safe".

---

# `2606` — LAMP

## What it establishes

An implemented, measured harness on a small suite: 90 curated theorems in an
off-Mathlib combinatorics-on-words library, three backbones, two ablations,
pass@1 with an explicitly separated internal repair budget (3 re-plans, 3
build attempts per plan, 9 verification attempts, 30 s timeout, laptop-class
hardware, and zero failures attributable to timeouts or retrieval errors at
that scale).

It establishes: that dual-stage acceptance is necessary because a `sorry`
compiles; that addressing failures are cheap to recover and strategy failures
are not; that the backbone spread (27.8 points) exceeds both architecture
ablations (12.3 and 11.1); that specialized prover models handed the same
ontology floor at 1–9%; that verbatim source injection still leaves 18.4% of
failures as invented identifiers; and that definitional style correlates with
machine-provability — decomposition-shaped modules 93–100% on the top
backbone against an index-shaped module at 80/60/10.

It does not establish its headline — that performance depends on the
architecture rather than the backbone — and §5 retreats to conceding the
framework is not a model-agnostic guarantee. It also scores a correct refusal
of a false theorem as a proof failure, which is an accounting error in its own
top-line number.

## Items

**`2606#1` — Compiles ≠ complete: sorry-warnings are a third acceptance
category.** *(eval-method · now · amended)*
*Cite:* §3.4 dual-stage verification, p.10; success criterion §4.1, p.12;
Verifier §3.3, p.10.
*Finding:* acceptance requires two independent stages — a purely textual check
that the proof body contains no `sorry` token, and a REPL compile whose
result parses as `complete`, free of errors, sorries *and* sorry-warnings.
Their stated reason is that a proof consisting of `sorry` alone compiles
without error, so a compilation pass alone registers a false success.
*Seam:* footprint gate + committed mutant controls.
*Change:* scope the claim to what our gate actually is. Our footprint is
machine-checked per rostered theorem against exactly {propext,
Classical.choice, Quot.sound}, so a sorry'd proof already reds there via
`sorryAx`; the hole they name — a sorry'd declaration builds with only a
warning and `lake build` exits 0 — bites a gate that reads build exit status.
The delta is therefore defense-in-depth on what is currently a single-point
gate, and it is worth having on exactly their argument that one stage is not
enough. (a) Add an independent token scan of verify/fabric sources for
`sorry`/`admit`/`native_decide`, and treat the `declaration uses 'sorry'`
warning class as an error. (b) Commit a mutant control that replaces one
rostered proof body with `sorry` and proves the wall reds at the token scan
and at `#print axioms` *independently* — a single trace showing one red is
not the control their two-stage design argues for. Numbering collision: the
`axiom hole : False` control from `2604#4` claims the same slot; these are
two instances of one control class (footprint pollution), not one control.

**`2606#2` — Existential-decomposition definitions are agent-provable;
index-arithmetic ones are not.** *(theorem · now)*
*Cite:* Appendix A design rationale, p.21; failure analysis §5, p.16;
Table 10, reconstructed from Table 9 rows 69–78, p.24.
*Finding:* the paper states its definitional choice as explicit design
rationale — `IsFactor u w := ∃ x y, w = x ++ u ++ y`, contiguous and
existential, rather than an indexed substring predicate, to keep proofs case
analysis on `x` and `y` rather than index arithmetic. The measured
consequence where they did not get that choice is stark: `HasPeriod` is
index-shaped, and Period is the worst module across every backbone —
80.0% / 60.0% / 10.0%, reconstructed from per-theorem rows as Kimi 8/10,
Claude 6/10, DeepSeek 1/10, matching Table 10. §5 names the mechanism: both
Kimi failures stem from complex modular indexing lookups, and the seven
theorems that failed under both weaker backbones need multi-step modular
arithmetic over `List.get?` indices regardless of backbone. The
decomposition-shaped modules run 93–100% on the top backbone, and their
flagship closure lemma is a one-liner.
*Seam:* F2b successor discipline; C7 pin well-foundedness; M3 semilattice wave.
*Change:* this is a measured correlation between definitional style and
machine-provability, and F2b is our most index-shaped law family. (1) State
laws in witness/decomposition form wherever the choice exists — C7's
hash-preimage acyclicity as an existential chain rather than a depth index,
the contiguous-frontier apply as a prefix/suffix decomposition rather than
offset arithmetic. (2) Where the index form is forced — stream sequence
numbers genuinely are indices — land the decomposition *bridge* lemma as the
first artifact of the wave, so no later proof does inline index arithmetic;
that is the shape of their closure lemma that makes downstream proofs one
chain step. Corollary for universal-properties-to-DX: every wave ships the
closure lemmas tying the new relation to existing ones (F12 binds →
semilattice order, C7 pins → F2b positions), not just the headline law.

**`2606#4` — Their hand-authored suite contained a false theorem — found only
because an agent refused.** *(failure-mode · now)*
*Cite:* §5 failure analysis, p.16; Table 8, p.16; Table 9 #74
`primitive_minimal_period_is_length`, p.24; §6 fold-back proposal.
*Finding:* one of the 90 curated theorems is mathematically false. It went
undetected in the dataset and surfaced only because the multi-agent Planner
identified the flaw and refused to generate a proof — and the harness scored
that refusal as a failure. Two of the 38 tabulated failures (5.3%) are the
same ill-posed statement under the other two backbones, which burned their
full 9-attempt budgets. Separately, §6 proposes folding the 87 verified
proofs back into the library (93 → as many as 180 declarations), gated only
on human review and not actually performed.
*Seam:* roster + mutant controls + wave ledger / spec-ticket family.
*Change:* two pre-registrations. (1) Our controls test law-*dropping* — does
the gate red when a law is removed? — and do not test law-*vacuity*. A
mis-stated law with unsatisfiable or trivially satisfiable hypotheses proves
cleanly, passes the footprint, and then becomes a *premise* for later waves.
Add a committed non-vacuity witness per rostered law — a non-trivial instance
satisfying the hypotheses, model-emitted like everything else — and gate
fold-back of any wave-proved lemma on witness plus footprint, never on
"verified" alone. (2) Give the wave loop a distinguished outcome for
"statement is false or unprovable as written" that opens a spec ticket and
does not score as a proof failure; otherwise a correct refusal is
indistinguishable from a capability failure in the merge ledger, which is the
accounting error this paper made in its own headline number.

**`2606#5` — Split repair failures into addressing vs strategy; re-ground
cheaply, re-plan expensively.** *(technique · now)*
*Cite:* §3.4 missing-definition fast path, pp.10–11; Algorithm 1 lines 16–18,
p.11; Verifier §3.3, p.10; retention at Algorithm 1 lines 5 and 22.
*Finding:* on a failed build they branch on *why*. An error indicating a
referenced definition or lemma could not be found is an addressing failure
rather than a flaw in the strategy: the orchestrator re-injects library
context and retries the build immediately rather than discarding the strategy
and consuming an outer-loop re-plan. A genuine proof failure instead appends
the structured error — including the offending goal state, so recovery is
informed rather than blind — to the Builder history. Memory retention is
asymmetric: Planner history persists across re-plans, Builder history resets
per strategy, and the Planner receives a summary of failed attempts rather
than raw error text.
*Seam:* round-2 repair loop (Fable implements → adversarial reviewer plants →
round-2 → targeted confirm); wave ticket family.
*Change:* our round-2 loop treats all reds alike. Adopt the two-class routing:
unknown-identifier, unresolved-constant and wrong-namespace reds are
addressing failures — re-inject the verify/fabric module source closure for
the failing file's imports and retry the build *without consuming a repair
budget slot*; everything else is a strategy failure that feeds accumulated
error forward. Two supporting rules with teeth: feed back the unsolved goal
state, not the compiler diagnostic string; and make retention asymmetric —
the "strategies already refuted" ledger is monotone across the whole wave,
while low-level error context is scoped and discarded per strategy so stale
diagnostics do not poison the next build.

**`2606#6` — Fusing plan and build costs 11 points, all of it on Hard.**
*(refutation · next-slice · amended)*
*Cite:* §4.3 and Table 4, pp.13–14; difficulty definitions §4.1, p.12.
*Finding:* the single-agent ablation removes the Planner — the Builder alone
makes all nine calls, retaining full MCP access, but must plan and prove —
with attempt budget, injected source and backbone held fixed. It costs 11.1
points overall, and the loss is not spread: Easy 100.0 → 100.0, Medium
98.3 → 89.7, Hard 88.2 → 58.8. The no-MCP ablation has the same shape: 12.3
points overall, Easy unaffected, Hard 88.2 → 47.1. Their difficulty labels
are operationally defined and are the routing key.
*Seam:* M3 wave law routing (F10 trigger-grammar induction, C7
well-foundedness, replica-inflation lemma); wave spec tickets.
*Change:* correct the topology claim first — the standing
Fable-coordinates-codex-executes ruling already separates spec and gates
(Fable) from the build loop (codex), so this ablation validates a split we
hold rather than indicting one we lack. What we do not have is that split
applied *within* a wave and routed by law, and that is the delta: classify
each wave law Easy/Medium/Hard at spec time by proof-task shape, using their
operational definitions (hard = cross-module reasoning or discovery of
non-obvious intermediate lemmas; easy = a few tactic steps over one or two
library lemmas), and treat the label as the routing key rather than
bookkeeping. Every remaining M3 law is Hard by that definition — the exact
band where the fused configuration bled ~29 points while Easy was untouched.
For Hard laws only: a strategy pass that names the intermediate lemmas, the
induction principle and the well-founded measure while emitting no Lean, then
a separate build pass, with strategy history persistent across retries and
low-level error context scoped per strategy. Do not pay this on Easy laws —
the measurement says it buys exactly zero there, and that scoping rule is
what makes the change affordable.

**`2606#7` — Bounded premise universe: take the goal-state tool, skip the
retrieval layer.** *(design-pattern · now · confidence medium)*
*Cite:* Semantic Toolbox §3.3, pp.9–10; orchestrator contextual grounding
§3.3, p.9; ablation §4.3, p.13.
*Finding:* their toolbox has three classes — a Lean LSP tool returning the
precise goal state at a `sorry`, hypotheses and target exactly as the kernel
sees them (ground truth rather than an inferred proof state); a
LeanExplore-backed Mathlib search; and a curated ontology returning
statement, description, source location, dependencies and related concepts.
The ontology and the search exist because the premise universe is unbounded:
the orchestrator already injects verbatim source for every resolved import,
and the retrieval tools sit on top of that for what injection cannot cover.
*Seam:* MCP-first agent-first DX; F7; G27.
*Change:* verify/fabric is zero-dependency with a closed module set, so the
entire premise universe fits in context and verbatim-source injection is
*complete* for us in a way it can never be for them. Anti-adoption call: do
not build a premise-retrieval or ontology-search layer for verify/fabric
waves; build one live goal-state tool — kernel-truth hypotheses and target at
the failure point — and let F7's deterministic assembly of the full import
closure do the rest. Honest caveat: their no-MCP ablation removed goal-state,
ontology and search together, so it does not separately price the goal-state
half; the split is our inference from their design rationale, not their
measurement. The saving is real regardless — one tool, not three, and F7's
determinism statements already carry the assembly correctness their
orchestrator asserts informally.

**`2606#8` — Their tool-priority ordering is prompt-enforced and never
measured.** *(design-pattern · next-slice · amended · confidence medium)*
*Cite:* Semantic Toolbox §3.3, p.10.
*Finding:* the tools are governed by an explicit priority hierarchy enforced
through prompting — injected source first, then the curated ontology for
domain lookups, and only as a last resort the broader Mathlib search — framed
as a core design priority that privileges curated domain knowledge over
open-ended retrieval. Nothing in the system makes a search-first Builder
fail, and adherence to the ordering is never measured anywhere in §4 or §5.
The only tool-layer measurement offered is a negative one (no retrieval
errors), which is availability, not ordering compliance.
*Seam:* G27 ontology declaration; G26.
*Change:* keep this as the negative exhibit for G27's grill and drop the F9
identification. It is a precedence rule its own authors call load-bearing,
enforced entirely by a sentence in a system prompt, with no enforcement point
and no compliance metric — structurally the same failure as an LLM-judge
door, and worth citing by name when we argue that an ordering which matters
must be checkable at the seam. The narrow delta that follows needs no new
lattice: when G27 is written, require a declaration to *record* its resolved
source per symbol, content-addressed like every other hop, so that any
precedence rule the estate later adopts is a checkable property of the
declaration after the fact rather than an unmeasured hope about the decode.
Do **not** commit to the stronger door check that refuses a declaration whose
resolved set includes a lower-authority source for a symbol a higher-authority
source could have answered — that is a counterfactual the door must resolve
itself against the catalog, and it needs its own grill before it enters a
record.

**`2606#9` — Verbatim source injection attenuates identifier hallucination
but does not eliminate it (18.4%).** *(failure-mode · now)*
*Cite:* orchestrator §3.3, p.9; Table 8 and §5, p.16.
*Finding:* verbatim source injection is named their principal defense against
hallucinated identifiers — agents reason about actual definitions and lemma
names rather than plausible-looking inventions. It is not sufficient: 7 of
the 38 tabulated failures (18.4%) are invalid Lean where, with the source
already injected, the generated code referenced non-existent identifiers or
applied wrong projection syntax. All seven are DeepSeek, all on Easy and
Medium theorems that the other two backbones solved, so the residual
hallucination rate is a backbone property, not a context-assembly property.
The arithmetic checks out: Claude 10 failures + DeepSeek 28 = 38.
*Seam:* G26.
*Change:* pre-register this — deterministic context assembly (F7) is an
attenuator, not a gate, and the residual failure rate scales with backbone
quality on tasks the stronger backbone finds trivial. Two consequences for
G26's grill: (1) the refusal belongs at the commit door, and the argument for
it does not weaken as context assembly improves — this paper had the
strongest possible grounding, full verbatim source plus priority-ordered
lookups, and still shipped 18% invented-identifier failures; (2) any capacity
plan that swaps to a cheaper wave backbone should expect the
invented-identifier class to reappear on laws the current backbone lands
first-try, which makes the commit-door refusal the thing that keeps the
estate safe under model substitution rather than a redundant belt.

**`2606#10` — Fine-tuned prover models cannot consume an injected ontology,
even when handed it.** *(evidence · context-only · confidence medium)*
*Cite:* §4.4 and Table 6, p.14; miniF2F sanity check §4.4, pp.14–15; §5
hybrid limitation, p.17.
*Finding:* given the same ontology context as LAMP, three specialized provers
solve almost nothing on the off-Mathlib domain — DeepSeek-Prover-V2 7B 8/90
(8.9%), Kimina-Prover 7B 3/90 (3.3%), Goedel-Prover-V2 32B 1/90 (1.1%) —
against 58.9% for the unscaffolded general-purpose backbone and 96.7% for
LAMP. A miniF2F sanity check (6/10 and 2/10 in-distribution) confirms the
pipeline is not broken. Diagnosis: specialized provers are trained to emit
tactics directly from a fixed Mathlib-centered distribution and have no
mechanism to consume retrieved ontology context; §5 adds that they expose no
native tool-calling interfaces at all, which is why the authors' proposed
general-Planner / specialized-Builder hybrid remains unbuilt.
*Seam:* Fable-implements-waves posture; wave budget planning; the plan/build
seam in the agent-plane record.
*Change:* direct evidence for the recorded posture and a budget decision:
verify/fabric is off-Mathlib by construction, so a prover-model integration
has a measured floor of 1–9% even with our library handed over — do not
budget one; spend on context assembly (F7) and catalog quality instead.
Second-order design point for the agent-plane record: their hybrid is blocked
because their plan→build seam is a conversation, not an artifact. If we
specify the strategy hop as a typed *declaration* in the provenance chain
with a cataloged schema digest, the seam stays model-independent and a
non-tool-calling backend can be dropped into the build slot later. Magnitude
caveat: the prover numbers are pass@1, a protocol unfavorable to search-based
provers normally run at pass@k — the direction is solid, the size is
protocol-flattered, and the paper concedes this only for miniF2F.

**`2606#11` — Backbone spread (27.8 points) exceeds both architecture deltas
(12.3, 11.1).** *(refutation · next-slice)*
*Cite:* abstract and §6 against Table 5, p.14; Table 4, p.14; Table 7 and
§4.5, p.15; §5 limitations, p.17.
*Finding:* the abstract and conclusion claim performance depends on the
tool-grounded architecture rather than the backbone alone. On the same suite
with the architecture held fixed, swapping the backbone moves the number
96.7% → 88.9% → 68.9% — a 27.8-point spread, larger than either ablation
delta. Out of domain the spread widens to 62.5 points (96.9 / 56.2 / 34.4 on
the 32-problem miniF2F subset), and §4.5 concedes that Claude's 88.9 → 34.4
collapse indicates its strong in-domain performance is partly attributable to
the domain ontology, and that out-of-domain behaviour is strongly governed by
the model's agentic tool-use capabilities rather than the framework. §5 then
retreats fully: the framework is not a model-agnostic guarantee. The headline
survives only on the word "alone".
*Seam:* R2 publication ambition; Multica wave capacity planning.
*Change:* two things. For the R2 post: when we report harness or scaffolding
results for our proof loops, put the backbone spread and the architecture
delta in the *same* table, or we reproduce this exact overclaim — an ablation
delta measured under one fixed backbone licenses no architecture-over-model
conclusion. For capacity planning: a measured warning against standardizing
wave work on a cheaper model on the theory that better scaffolding recovers
it. Their best scaffolding recovers ~12 points; their backbone choice costs
~28. Roughly 2:1 against the harness.

**`2606#12` — Internal repair budget is not sampling — record repair cycles
per law in the ledger.** *(eval-method · next-slice · confidence medium)*
*Cite:* §4.1 metric, p.12; configurations §4.1, p.13.
*Finding:* the paper draws a line most agentic-prover work blurs: the internal
repair loop (up to 3 re-plans and 3 build attempts per plan) operates within
a single pass@1 attempt and is distinct from independent pass@k sampling.
They report pass@1 because it reflects realistic usage — one run under fixed
time and cost. The concrete budget is 9 verification attempts per theorem
with a 30 s timeout each on one laptop-class machine, and §5 reports zero
failures attributable to verification timeouts or tool retrieval errors at
that scale, so the ceiling was backbone reasoning, not infrastructure.
*Seam:* M3 wave merge ledger / round-2 repair accounting.
*Change:* our ledger records that a law landed; it does not record what it
cost. Adopt the distinction: (a) internal repair cycles consumed per law
within one wave attempt, and (b) whether the wave itself was re-run from
scratch (a second sample). These are different risk objects — a law that took
eight repair cycles is telling us the lemma neighbourhood around it is thin,
which is a direct signal about where the next library-shape investment goes
and, per `2606#2`, usually points at an index-arithmetic definition. It also
keeps us honest at publication time: a headline that quietly conflates
internal repair with per-attempt success is the standard way these numbers
get inflated.

---

# `acl1836` — LeVer

## What it establishes

A measured demonstration that a self-produced property set turns the proof
rate into an anti-signal: ablating the attacker while keeping the verifier
raises verification rate from 74.1% to 81.5% while attack success rises from
2.4% to 23.3%.

That the binding defect class in synthesized code is *vocabulary*, not proof:
in Round 0 every obligation is discharged while the contract dispenses 89.1
LP for zero payment, because the model can describe receiving an amount but
not paying one token and then receiving another.

Three worked holes in artifacts whose proofs pass: existence-shaped effect
laws that an extra unauthorized transfer satisfies; an identity constant
sharing a type with caller-supplied identities; and a comparison whose two
sides are denominated in different token spaces.

Two disciplines worth importing outright: type-check the theorem statement
before proof search, and subordinate the simulator to the model in writing.

It does not establish real-world MEV resistance, nor semantic preservation of
the Solidity↔Lean link — 96.7% expert evaluation and 97.4% execution
cross-check on 300 sampled tasks, which §7 explicitly declines to call a
proof.

## Items

**`acl1836#1` — Removing the adversary raises the proof rate and the breach
rate together.** *(refutation · now)*
*Cite:* §5.3, "Impact of the Attacker (The Security Ceiling)"; all figures
restated in §5.3 prose, not read from the shredded Table 1.
*Finding:* ablating the Attacker while keeping the Verifier raises the
verification rate from 74.1% to 81.5% on the same backbone while attack
success goes from 2.4% to 23.3%. Their own reading: the Verifier then
operates only on the initial, simpler property set and easily proves those
easy theorems, which is why the verification rate is high — they call it a
false sense of security. The proof-rate metric moves in the reassuring
direction exactly when safety collapses, because the property set, the
metric's denominator, is produced by the same system being measured.
*Seam:* theorem roster as a health signal; corpus wall denominator;
adversarial-review loop.
*Change:* stop treating roster growth or corpus pass rate as a safety signal
standing alone — both have a self-produced denominator and improve when the
law set gets easier. Two gates: (a) every wave's ledger entry records, per new
law, whether it was *induced by an adversarial finding* or proven from the
pre-existing set, and a wave with zero adversary-induced laws is flagged
rather than merged clean; (b) pin the corpus row schedule grow-only, the same
discipline as F12's grow-only binds, so a wave cannot shrink its own
denominator into a pass. Our law-dropping controls test that existing laws are
load-bearing; nothing currently tests that the law set covers the threat
surface, which is precisely the axis this ablation moves.

**`acl1836#2` — The finding is that the model cannot state the hazard, not
that a proof failed.** *(design-pattern · next-slice · amended)*
*Cite:* App B.2 (zap-in Round 0); App D (contract state and reified side
effects); Figs 6 and 8.
*Finding:* in Round 0 every proof passes — guard and atomicity obligations are
discharged — and the contract is still a faucet that dispenses 89.1 LP for
zero payment. The paper names the defect precisely: the model can describe a
user receiving an amount but not a user paying token X and then receiving
token Y. The repair is a *type* change, not a proof change: anonymous payout
tuples become a `TransferAction` structure (from-address, to-address, token,
amount) carried as a list on the transition output, after which the payment
theorem becomes stateable at all.
*Seam:* F5 outcome vocabulary; G23 (a boundary this sharpens, not one it
dissolves); round-2 review taxonomy.
*Change:* (1) enrich the landed-outcome type from an opaque outcome to a list
of typed effect records — declaring session, subject, quantity/identity — so
that "the outcome record's effect set equals the declaration's effect set"
becomes a fabric law. State it as exact multiset equality against the
declaration, never existence, or we inherit their hole verbatim: their three
printed asset-flow theorems are all `∃ act, act ∈ out.transfers ∧ …` with
nothing bounding the list, so a transition emitting one extra unauthorized
transfer satisfies every one of them. (2) Do **not** claim this gets past
G23. The proof would cover record-to-declaration agreement, not performance;
the attestation is still shuttle-side and the bound simply moves up one level,
from an opaque outcome to an attested effect record. Write it that way in the
sentence that lives beside F5, so the enrichment reads as sharpening G23
rather than retiring it. (3) Process change for round-2 loops: classify every
finding as proof gap / implementation gap / **vocabulary gap**, and make a
vocabulary gap merge-blocking — in Round 0 every proof passed while the
contract was a faucet, which is `acl1836#1`'s failure in miniature.

**`acl1836#3` — Nothing in the framework constrains what gets refused.**
*(failure-mode · now)*
*Cite:* §3.3, the verification predicate defined so that only successful calls
carry an obligation; App D — every printed transition theorem conditioned on a
success result, with the main theorem discharging the other branch as `True`
on the stated grounds that a reverted transaction commits no unsafe state.
(The extraction cite says five printed theorems; there are four transition
theorems plus an arithmetic helper. The miscount does not touch the finding.)
*Finding:* the verification predicate is success-conditioned by definition,
and every theorem in the printed final artifact has the shape "successful call
⇒ φ". Consequence: no law says a bad input is *rejected*. The fake-token
defense — the headline repair of Round 2 — exists only as a runtime guard
witnessed by a sandbox trace. The artifact contains no theorem of the form
"input token ≠ market token → result = failure with that reason".
*Seam:* G26 commit-door refusal; F9; F5.
*Change:* our commit door is a refusal machine, so all of its value lives in
exactly the branch this framework leaves unproven. Require guard/refusal-
theorem parity in the roster: every door predicate gets a paired law
`¬conformant(d) → door(d) = refuse(reason)` naming the specific reason, and
the wave gate counts door guards against refusal theorems and fails on a
mismatch. Adopt their vacuous-failure idiom deliberately rather than by
accident, so refusal-safety is concentrated in the paired theorem instead of
being silently assumed by every law that only speaks about admits.

**`acl1836#4` — Pin theorem statements before proving them.**
*(technique · now)*
*Cite:* §4.2 LeanFormalizer (theorem instantiated with `sorry` and type-checked
*before* proof search); §7 Limitations, "The Gap between Validity and
Provability"; App D main theorem hypothesis `h_token_valid`.
*Finding:* they emit the theorem statement with `sorry` and type-check it
before the prover runs, explicitly to separate statement admissibility from
provability. Their limitations name the pressure this guards against:
full-generation with feedback occasionally produces false negatives, where the
agent fails to find the proof path for a valid theorem. The artifact shows
what that pressure produces unguarded — the final theorem carries
`(h_token_valid : inToken = market.tokenIn)` as a hypothesis, and the proof's
Guard-4 case uses it to make the invalid-token branch contradictory. The
round's headline attack is discharged by assumption inside the theorem named
for the repair.
*Seam:* theorem roster + verdict-truth binding; sibling gate to the axiom
footprint gate.
*Change:* add a statement-digest gate beside the axiom-footprint gate. Each
rostered theorem's full statement, binders and hypotheses included, is
digested and committed when a wave lands its `sorry`-shaped statements,
before any proof is attempted; the merge gate diffs digests and treats an
added hypothesis as a ledgered act needing written justification. This closes
a hole none of our current gates can see — a law narrowed by an extra
hypothesis still elaborates, still proves, and because corpora are
model-emitted, it emits a correspondingly weakened corpus that the runtime
wall passes green. Law-dropping controls catch a deleted law; nothing catches
a narrowed one.

**`acl1836#5` — Convert a stuck-forever hazard into an
environment-independence lemma.** *(theorem · next-slice)*
*Cite:* App C.2–C.4 (auction case study): Fig 14 lifts the hazard into an
explicit context field `sellerAcceptsEther`; the final obligation is
`v3_is_non_blocking_wrt_seller_acceptance`; App A.2 fragment statement.
*Finding:* the Round-0 auction bug is described as an interaction-level
liveness bug — a reverting seller makes auction closure revert, atomically
rolling back the ended flag and leaving the NFT and 10 ETH locked, so the
auction is practically unfinishable. LeVer answers it with no liveness proof
and no temporal logic: it lifts the offending environment dependence into an
explicit context bit and proves a *safety* statement inside the
local-transition fragment — closure's success does not depend on that bit.
App A.2 states the boundary that forces the move: the supported fragment is
the local transition, and temporal or ordering-sensitive properties require
enriched trace semantics beyond it.
*Seam:* no-liveness-claims posture (validated); commit door; Go shuttle epic.
*Change:* a principled answer to the standing grill question — "so you can
never say anything about getting stuck" — without touching the safety-only
fence. Add independence lemmas shaped `door(ctx[e := b]) = door(ctx[e := b'])`
over explicitly reified environment facts. The first one worth writing is for
the shuttle: the translate decision must be provably independent of
harness-side acceptance and backpressure bits. That is the exact analogue of
the reverting seller, and it is the hazard a translate-only fence is supposed
to buy us but currently only asserts.

**`acl1836#6` — A proven bound whose two sides live in different unit
spaces.** *(failure-mode · next-slice)*
*Cite:* App B.5 (Round 3) with attacker witness τ3; App D `calc_expected_out`.
*Finding:* Rounds 1–2 shipped a slippage guard that was present, enforced and
provable — actual output at least a minimum — while the minimum was derived
from the input amount and denominated in the *input* token, and the actual
output is denominated in the *output* token. Witness τ3 makes the vacuity
numeric: the old formula yields a floor of 99,000,000 where the dimensionally
meaningful floor is about 1.386e19. The repair is a conversion step that moves
the benchmark into the output token's space before any comparison. Their
general lesson, worth keeping: quantity correctness is not asset correctness.
*Seam:* F11 query determinism (topK ordering); F2b positions; I1 fencing-token
monotonicity.
*Change:* every comparison-carrying law we have has this exposure — positions
are per-partition, tokens are per-register, and if both are plain numeric
types then a cross-space comparison type-checks and proves a true, empty
statement. Index the position and token types by their space (a phantom or
dependent index on the structure; no new dependencies, fine on zero-dep Lean
4.33) so a cross-partition or cross-register comparison fails to elaborate.
Then add a control class the current 16 do not cover: a **must-not-compile**
control that swaps one side of each comparison for a value from a neighbouring
space and asserts elaboration fails. If our types already carry their space,
the delta collapses to the control, which is still worth having.

**`acl1836#7` — Adversarial interleaving as a corpus generator for the
coordination plane.** *(eval-method · next-slice)*
*Cite:* App A.5.4 "Adversarial Interleaved Scheduling" and Algorithm 1
lines 7–14 — the honest transaction is suspended, its intent exposed to the
attacker, who may insert a transaction before it.
*Finding:* rather than random ordering, the simulator suspends each honest
transaction, exposes its *intent* to the adversary, and lets the adversary
insert a transaction ahead of it — front-running and sandwiching — with the
property oracle evaluated after every atomic transition and the run halted at
the first violation. They contrast this with blind fuzzing, whose weakness
they name as an inability to construct the complex, state-dependent sequences
required to uncover deep logic bugs.
*Seam:* F5, I1, I2; corpus wall generators.
*Change:* our permutation and duplication invariance results (F1/F2) live
entirely in the monotone evidence plane; the coordination plane — where order
is load-bearing by design — has no order-adversary anywhere in corpus
generation, and our controls are law-dropping rather than order-permuting. Add
a generator that, for each declared act, exposes the pending act to an
adversary permitted to insert a competing writ against the same register ahead
of it, and emit the resulting interleavings as corpus rows. The wall's claim is
**not** "same winner" — the winner may legitimately differ — but "at most one
landed, tokens still monotone, once-only intact, under every generated
interleaving", with any two-landing interleaving a red gate. This would be the
first evidence that F5 holds against a scheduler rather than only against a
model.

**`acl1836#8` — Type the runtime oracle by what each law is checked against.**
*(design-pattern · next-slice · confidence medium)*
*Cite:* App A.5.2, "The Runtime Property Oracle": the monitored set is
partitioned into local, trace, and game-level properties.
*Finding:* the monitored property set is partitioned by *checking arity* —
local properties evaluated on the current state, trace properties on the
finite history, game-level properties only at designated checkpoints against
the run's outcome. The oracle is deterministic, halts on the first violation,
and returns the entire prefix as the counterexample trace; the paper is
explicit that this whole-prefix witness is what makes the downstream
distil-into-a-new-property step possible at all.
*Seam:* corpus wall + committed mutant traces.
*Change:* have each rostered law declare the arity it must be checked at, and
have the wall dispatch on that declaration. Without it, a trace-shaped law
(F2b contiguous-frontier apply, F3 anchored resumption) can be checked at
snapshot granularity and pass silently, and row-for-row consumption is a
state-shaped check by default. Second change: when a wall row reds, commit the
whole prefix rather than the failing row — our mutant controls already commit
traces and the walls should too, because one row is not enough material to
distil the missing law from. If the walls already dispatch on arity this
reduces to a documentation check; the whole-prefix witness is a real addition
either way.

**`acl1836#9` — The sandbox is an extension of the model, never a second
source of truth.** *(evidence · now)*
*Cite:* App A.5.1 — the simulator enriches the state with external mutable
dependencies and should be viewed as an empirical extension of the
closed-system formal semantics, not a replacement for the Lean model; boundary
restated in App B.5, App C.4, and the App D summary.
*Finding:* their simulator carries real external dependencies (DEX pools,
lending protocols) that the Lean model deliberately does not, and the paper
subordinates it explicitly: the dynamic layer's outputs are inputs to the
property set, never authoritative state. The team found it necessary to
restate the same boundary three further times at artifact level — not by
itself a proof of real-world MEV resistance; a proof over a reduced closing
witness; a model-level guarantee that does not verify all external protocol
internals, all token implementations, or the full EVM.
*Seam:* the REFUSED posture on the pinned Effect workflow engine (two sources
of durable truth); Go shuttle charter; G23.
*Change:* independent corroboration for the refusal, from a team that built the
second plane anyway and had to write the subordination clause four times to
keep it honest. Two cheap moves: (a) put the subordination sentence into the
shuttle charter as a fence — shuttle observations enter as candidate fabric
laws, never as durable state; (b) copy their *placement* of the boundary and
attach the at-most-one-landed-is-not-at-most-one-side-effect sentence to F5
inside verify/fabric itself, written as a law-shaped sentence carrying no
record number, so a reader of the theorem meets the boundary at the theorem
instead of in a design record they may never open.

**`acl1836#10` — Their translation gap is our corpus wall's coverage bound,
stated honestly.** *(eval-method · next-slice)*
*Cite:* §7 Limitations, "Semantic Faithfulness of Translation": 96.7% pass
under expert evaluation and 97.4% under execution cross-check on 300 randomly
sampled generation tasks, explicitly not a formal proof of semantic
preservation.
*Finding:* every guarantee is established over the Lean representation, and the
Solidity↔Lean link is defended by two empirical samples, one human and one
executing both sides and comparing. The paper names the residue precisely —
low-level EVM behaviour, external call conventions, event and logging
semantics, rollback effects — and declines to claim preservation, calling a
certified translation future work.
*Seam:* generated-vectors discipline + corpus wall.
*Change:* (1) our wall is stronger than their sample, but its claim needs the
same written honesty: it certifies agreement on *emitted* rows and is not a
semantic-preservation result; rows the model's generator never emits are
uncovered by construction. Put that sentence in the wall's record so the next
grill does not have to discover it. (2) Their execution cross-check runs in
the direction we do not have: add a reverse gate where runtime-observed act
sequences are replayed into the Lean model and required to yield the same
verdict. That catches runtime behaviour the generator never thought to
produce — the exact blind spot a one-directional generated corpus has — and it
is cheap, because the replay path is the corpus consumer run backwards.

**`acl1836#11` — A magic constant sitting in the same type as a
caller-supplied identity.** *(failure-mode · next-slice)*
*Cite:* App D, main transition: the contract address is hardcoded as 999 on
both reified actions with `abbrev Address := Nat`, justified as sufficient
because the asset-flow properties only need to distinguish user-side from
contract-side actions.
*Finding:* the final artifact models addresses as bare `Nat` and, as printed,
carries no hypothesis excluding a sender equal to 999. Under that input both
reified actions become self-transfers, and the payment theorem — an existence
statement over the transfer list — still holds. The proven fair-exchange
property degenerates on an input the model's own types permit, and their
abstraction note gives the reason it went unnoticed: the proof only ever
needed to tell the two roles apart, never to establish that they are distinct.
*Seam:* sessions = derived keys (digest of canonical open event); C7;
agent-plane grill packet.
*Change:* a clean counter-exhibit for the derived-keys decision when the
agent-plane record goes to grill — they needed exactly one distinguished
identity, placed it in the same inhabited type as user-supplied identities,
and the fair-exchange theorem survived the collision intact. Our identities
are derived digests over canonical events, which forecloses this by
construction; name that as the *reason* in the record, not just the mechanism.
Concrete wave-gate check: no fabric identity may appear as a literal in the
same type as an externally supplied identity, and every distinguished identity
is derived.

**`acl1836#12` — Deadlines belong in the guard, not the trigger grammar.**
*(evidence · context-only · confidence medium)*
*Cite:* App A.3.1 (the reified Context carries a timestamp) with Fig 4(b) and
the App C auction guard; App A.1 places liveness and deadlock freedom at
Level 3, outside the supported fragment.
*Finding:* across both case studies, time appears only as an explicit field of
the reified context and only ever on the *refusal* side of a guard. No
transition anywhere fires because time passed; every transition is externally
invoked, and time can only turn an invocation into a failure. Their placement
of liveness at Level 3, together with App A.2's statement that the directly
supported fragment is the local transition, is the same fence approached from
the other side.
*Seam:* F10 monotone trigger grammar.
*Change:* F10's exclusion of deadlines invites the obvious grill question —
then how does anything ever time out? This supplies the complementary
placement with an independent exhibit: a deadline is admissible as a refusal
predicate over a tick fact already in the fold, and inadmissible as a
production in the trigger grammar. Add that sentence to F10's record before
the wave goes to grill; it costs nothing and converts a bare exclusion into a
stated division of labour between the trigger grammar and the guard side.

---

# Cross-paper read

## What the three jointly say about this space

**The seam is agreed; the disagreement is over what the kernel is handed.**
All three put a Lean kernel between a model's proposal and an effect, and none
argues for an LLM-judge door. `2604` reaches the position from securities
regulation, `2606` from measured proof-search performance, `acl1836` from
adversarial synthesis. That convergence is the cheapest available evidence
that our agent-plane seam is not house idiosyncrasy. Every remaining
difference is about the vocabulary the kernel is given and which branch gets
proved.

**All three prove the admit branch; none proves the refusal branch.** `2604`'s
gateway unlocks on a `True` verdict. `acl1836`'s verification predicate is
success-conditioned by definition and discharges failure as vacuous. `2606`
proves library lemmas and never models a door at all. A refusal machine gets
nothing from this literature except the warning — which is `acl1836#3`, and it
is the single highest-value delta in the batch.

**Every headline number in the space has a self-produced denominator.**
`acl1836` moves that axis explicitly and measures the result: proof rate up,
breach rate up, together. `2606`'s curated suite contained a false theorem and
scored the agent that correctly refused it as a failure. `2604` has no
denominator at all, having shipped no system. Our corpus pass rate and roster
count sit on the same footing, which is `acl1836#1`.

**Nobody has a fold.** `2604` reads a snapshot and releases the original call.
`acl1836` reasons inside a local-transition fragment and parks temporal
properties outside it. `2606` has no runtime at all. Cumulative, state-relative
constraints — the class `2604#6` names — are wanted by all three and reachable
by none of them. That is the ground our evidence plane occupies, and it is the
one place we can say something the field currently cannot.

**Concurrency is nearly absent as a safety concern.** Only `acl1836` builds an
order-adversary, and it applies it to a system whose laws are local; `2604`
mentions concurrency only as a throughput matter while its Phase 3 quietly
invalidates its own gate. A fenced coordination plane is the differentiated
asset here, and `acl1836#7` hands us the generator to test ours with.

**Grounding is an attenuator everywhere and a gate nowhere.** `2606#9`
measures 18.4% invented-identifier failures under the strongest grounding in
the batch; `2604#1` shows that even perfectly grounded, shape-valid output can
denote the wrong thing. Jointly, this is the strongest available argument for
putting the refusal at the commit door and not at the decode.

## Where our postures are ahead — naming the record

- **CALM split with a fenced coordination plane** (F5 at-most-one-landed over
  the Veil/Lean model, I1, I2). `2604#3` is a fully worked guardrail that is
  sound single-threaded and unsound under its own roadmap for want of a
  fencing token.
- **Axiom footprint gate, machine-checked per rostered theorem.** `2604#4`
  shows the failure it prevents (model-authored axioms proving `False`), and
  `2606#1` (amended) confirms our gate already reds on `sorryAx` where a
  build-exit-status gate would not.
- **Generated vectors with verdict-truth binding.** `acl1836#10`'s translation
  link is defended by a 96.7% / 97.4% sample; our rows are model-emitted and
  their constructors take witness-theorem terms, so a drifted verdict fails to
  elaborate. `2604#9` shows the alternative: a model reinstalled at the audit
  seam.
- **Sessions as derived keys** (digest of the canonical open event).
  `acl1836#11` is the counter-exhibit — one distinguished identity in the same
  inhabited type as caller-supplied ones, and the fair-exchange theorem
  survives the collision.
- **Safety-only, no liveness claims.** `acl1836#5` shows the principled way to
  answer a stuck-forever hazard without temporal logic, and `acl1836#12` shows
  deadlines living on the guard side, which is exactly F10's division of
  labour.
- **The REFUSED pinned workflow engine (two sources of durable truth).**
  `acl1836#9` is corroboration from a team that built the second plane anyway
  and needed the subordination clause four times.
- **Fable coordinates, codex executes.** `2606#6` (amended) measures the cost
  of fusing plan and build: 11.1 points overall, ~29 on Hard, zero on Easy.
- **Zero-dependency closed module set.** `2606#7`: our premise universe fits in
  context, which makes their entire retrieval layer unnecessary for us.

## Where we are under pressure — naming the item

- **Refusal-side laws.** `acl1836#3` — our door is all refusal and our roster
  has no refusal theorems.
- **Referent pinning in the catalog.** `2604#1` — a schema digest constrains
  shape; drift is referential and passes cleanly.
- **Law vacuity and narrowed statements.** `2606#4` and `acl1836#4` — nothing
  we run catches a law that is false-as-written, vacuous, or narrowed by an
  added hypothesis, and either becomes a premise for the next wave.
- **Threat-surface coverage.** `acl1836#1` — our controls prove existing laws
  are load-bearing, never that the law set covers the surface.
- **Order adversary on the coordination plane.** `acl1836#7` — F5 has been
  proven against a model, not against a scheduler.
- **State-relative door laws.** `2604#6` — every door law we have is
  shape-relative; a budget invariant plus its paired refusal is a new family.
- **Index-shaped law families.** `2606#2` — F2b is our most index-shaped
  family, and index shape is measurably the hardest to prove.
- **Unit spaces on comparisons.** `acl1836#6` — positions are per-partition and
  tokens are per-register; a cross-space comparison would type-check.
- **Wall arity and witnesses.** `acl1836#8` — trace-shaped laws checked at
  snapshot granularity pass silently, and a single red row is not enough
  material to distil the missing law.
- **One-directional corpus.** `acl1836#10` — we generate model→runtime and
  never replay runtime→model.
- **The G23 family.** `2604#12`, `acl1836#2`, `acl1836#9` — sandboxing is not
  action correctness, record agreement is not performance, and a second plane
  is not a second source of truth. The boundary discipline all three papers
  needed and only one wrote down.

---

# Pressure and refutations

Every refutation and failure-mode item, sharpest first — sharpest meaning
"names a hole our current gates cannot see", not "hardest on the paper".

1. **`acl1836#3` — the refusal branch is unproven.** Their whole framework
   proves only successful calls, and their headline fake-token defense lives in
   a runtime guard witnessed by a trace. Our commit door is a refusal machine,
   so every ounce of its value sits in that branch. Forces guard/refusal-theorem
   parity onto the roster and a count check onto the wave gate.
2. **`2604#1` — symbol drift defeats a digest-only catalog.** A shape-valid
   decode can bind the right schema to the wrong referent, and an injection
   that remaps a restricted action onto a permitted symbol verifies green.
   Forces a closed content-addressed identifier universe and a
   declaration-ids ⊆ writ-ids check at the door, plus the F7c candidate.
3. **`2606#4` — a false theorem sat in a curated suite until an agent refused,
   and the refusal was scored as a failure.** Our controls test law-dropping,
   not law-vacuity, and their §6 proposes folding proved lemmas back into the
   library on human review alone. Forces non-vacuity witnesses and a
   distinguished "false as written" wave outcome that opens a spec ticket.
4. **`acl1836#1` — proof rate rises as safety collapses.** Verification rate
   74.1 → 81.5 with attack success 2.4 → 23.3 when the adversary is removed,
   because the property set is produced by the system being measured. Forces
   adversary-induced law accounting in the ledger and a grow-only corpus row
   schedule.
5. **`2604#3` — TOCTOU.** A proof against a snapshot, then the original call is
   released, then Phase 3 adds concurrency. Two agents at 6% of capital breach
   their own 10% limit with both proofs valid. Forces a named bound on the
   commit-door record and one fenced act over the same register read.
6. **`acl1836#6` — a proven bound whose sides live in different unit spaces.**
   Present, enforced, provable, and vacuous: a floor of 99,000,000 where the
   meaningful floor is ~1.386e19. Forces space-indexed position and token types
   and a must-not-compile control class we do not currently have.
7. **`2606#9` — grounding attenuates, it does not gate.** 18.4% of failures are
   invented identifiers *with* full verbatim source injected, concentrated in
   the weakest backbone on tasks the others found trivial. Forces the
   pre-registration that F7 is an attenuator, and makes the commit-door refusal
   what keeps the estate safe under model substitution.
8. **`2606#11` — backbone spread exceeds both architecture deltas.** 27.8
   points against 12.3 and 11.1, widening to 62.5 out of domain, with the paper
   itself retreating to "not a model-agnostic guarantee". Pressure on our R2
   publication discipline and a 2:1 warning against standardizing waves on a
   cheaper model.
9. **`2604#4` — model-authored axioms fail open.** An inconsistent Policy
   Environment proves everything with a green kernel and a perfect audit trail,
   and the paper never raises consistency. Converts our footprint gate from
   hygiene into a stated anti-fail-open property, plus a control.
10. **`2604#12` — sandbox mistaken for action correctness.** Refuted by the
    paper's own drift section: a sandbox bounds how code runs and what ambient
    authority it holds, never which action is permitted. Forces a one-line REF
    record amendment now rather than an un-claim later.
11. **`acl1836#11` — a magic constant in the identity type.** Address 999 in the
    same `Nat` as caller-supplied senders, with no hypothesis excluding the
    collision, and the fair-exchange theorem survives it. We are foreclosed by
    derived keys; record that as the reason, and add the wave-gate check.
12. **`2604#9` — a model reinstalled at the audit seam.** After pages arguing a
    probabilistic map cannot bear compliance weight, the explanation path is a
    fine-tuned translator over RAG whose output is the legally operative
    artifact. Forces refusal reasons as content-addressed data with a total
    rendering function under the corpus wall.
13. **`2606#6` — fusing plan and build costs ~29 points on Hard.** Amended: this
    validates the split we already hold rather than indicting one we lack. The
    residual pressure is that we do not route *within* a wave, and every
    remaining M3 law is Hard by their operational definition.

---

# Adoptable now

Six changes, each on a ticket family or wave that already exists.

1. **Wave gate — footprint-pollution control class.** Add an independent token
   scan of verify/fabric sources for `sorry`/`admit`/`native_decide` with the
   `declaration uses 'sorry'` warning class treated as an error, and commit two
   controls of one class: a rostered proof body replaced by `sorry`, and an
   injected `axiom hole : False`, each required to red at the token scan and at
   `#print axioms` independently. Rides the **M3 wave gate / verify-fabric CI
   wall**. (`2606#1` amended, `2604#4` — note the shared control slot.)
2. **Roster — guard/refusal parity plus a statement-digest gate.** Pair every
   door predicate with `¬conformant(d) → door(d) = refuse(reason)` and have the
   gate fail on a guard/refusal count mismatch; digest and commit each rostered
   theorem's full statement when the wave lands its `sorry`-shaped statements,
   before any proof, and treat an added hypothesis as a ledgered act. Rides the
   **M3 wave gate + theorem roster**. (`acl1836#3`, `acl1836#4`.)
3. **Ledger — non-vacuity, refusal outcomes, and an honest denominator.**
   Commit a non-vacuity witness per rostered law and gate fold-back on witness
   plus footprint, never on "verified"; add a distinguished wave outcome for
   "false or unprovable as written" that opens a spec ticket instead of scoring
   as a proof failure; record per new law whether it was adversary-induced, and
   pin the corpus row schedule grow-only. Rides the **M3 wave ledger /
   spec-ticket family**. (`2606#4`, `acl1836#1`.)
4. **Agent-plane grill packet — pin referents before G26/G27 go to grill.**
   Extend the catalog with a closed, content-addressed identifier universe so
   an off-catalog referent is unrepresentable; add the door check that the
   declaration's identifier set is a subset of the writ's; pre-register that
   deterministic context assembly is an attenuator and the refusal belongs at
   the door. Rides the **agent-plane design record (G26/G27), before the
   G-series grill**. (`2604#1`, `2606#9`.)
5. **Three sentences into records where the mechanism is decided.** The
   commit-door record gets the TOCTOU bound by name; F5 gets the
   at-most-one-landed-is-not-at-most-one-side-effect sentence attached inside
   verify/fabric, law-shaped and carrying no record number; the shuttle charter
   gets the subordination fence and the explicit statement that translate-only
   is not an enforcement fence, in "direct and exclusive control" vocabulary.
   Rides the **agent-plane record + Go shuttle charter**. (`2604#3`,
   `acl1836#9`, `2604#5`.)
6. **Proof loop — route reds, and state laws in decomposition form.** Split
   round-2 reds into addressing failures (re-inject the import source closure,
   retry, no repair-budget slot consumed) and strategy failures (feed forward
   the unsolved goal state, not the diagnostic string), with a monotone
   refuted-strategy ledger and per-strategy error scope; state new laws in
   witness/decomposition form wherever the choice exists and land the
   decomposition bridge lemma first where indices are forced; build one
   goal-state tool and no retrieval layer. Rides the **M3 wave proof loop /
   round-2 dispatch**. (`2606#5`, `2606#2`, `2606#7`.)