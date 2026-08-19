# verify/ — agent contract (model gates)

The repository's model-checking evidence: specs, configs, negative
controls, counterexample traces, run records. Read root `AGENTS.md`
first, then `docs/map/tickets/009-the-verification-ladder.md` for the
rung definitions. Scoped laws:

- A rung is CLAIMED only with its gate met. The claim is then recorded
  in [VERIFICATION.md](../VERIFICATION.md) with its rung, exact bounds,
  standing assumptions, and the file where it is checkable — a claim
  absent from that ledger is not made, and a claim in the ledger whose
  evidence is not here is a debt, not a claim.
- A bounded check certifies only its bounds (ADR-0007's spirit). State
  the caps inside the claim sentence; a defect needing one more daemon,
  value, creator, or level of depth is outside everything checked.
- The transition table is stated ONCE. Broken variants are one-line
  `EXTENDS` re-exports whose config flips a constant, so the ratified
  and faithless models cannot drift apart.
- Every model gate ships refuted negative controls: one per dropped
  law, each refuted on exactly its own invariant, with the trace
  committed beside its config as `*.cex.txt`. A prover that cannot fail
  proves nothing. The controls that keep an unrelated invariant checked
  and passing are what prove two laws independent — keep them.
- Every abstraction that diverges from or sharpens the prose is STATED
  in the spec header so it can be argued with. Stated abstractions are
  exactly where implementation drift hides; closing that gap is the R4
  obligation, never an R2 claim.
- Run records pin by RECORDING, not by asserting: tool name, version
  and build, the sha256 of the jar actually run, how the JVM was
  provisioned, the exact flags and why, the bounds, states generated,
  distinct states, depth, and wall-clock. Upstream release assets roll;
  a recorded sha does not.
- `run.sh` is the gate, not a convenience: it must FAIL unless every
  clean config comes back clean AND every control is refuted on its
  named violation string.
- A real counterexample in a ratified spec is a FINDING about the laws
  — commit the trace and lead with it; do not repair the spec to make
  the run green. Failed inductive candidates stay in `CLIMB.md`,
  because their counterexamples explain the invariant that worked.
- Official artifacts a model or emitter renders (projection pages,
  generated corpora headers, prose registers) carry no tracking
  artifacts: no ticket ids, no dev parentheticals, no script commands,
  no filesystem paths (root law 10, operator-ruled 2026-08-19).
  Provenance inside an official artifact is a digest of its source;
  regeneration instructions live in the README beside the artifact,
  never in it. Run records and gate scripts are tracking-native and
  exempt — the rule binds what is rendered as the language, not the
  evidence machinery around it.

## Layout

- `catalog/` — catalog + ingress (`catalog-model:W1`–`catalog-model:W5`
  in the laws registry; source-local W1–W5 remain frozen in the spec): R2 at the gate
  caps, R3 inductive invariant, four faithless controls. R4 is ticket
  010.
- `implication/` — the refusal projection walls: the Lean collapse
  lemma plus TLC over the repaired projection rule (W-COHERENCE,
  W-SCOPE), controls refuting the shipped constructor.
- `ir/` — `flb.type.v0` stated once as an algebraic type with a
  denotational semantics (Lean). The reference the Go and TS grammar
  restatements are meant to mirror; correspondence unproved.
- `moves/` — the E2 move calculus: thirty-nine gated axiom reports, five
  model-level violation controls in `Moves/Violations.lean` plus three frozen
  mutant kills in `Moves/SpecProofs.lean`, and nine planted source-hygiene
  controls with committed traces in `negative-controls/` — one per shipped
  check. Its `run.sh` adds the mechanical axiom-footprint check over every
  headline theorem (Lean).
- `pipeline/` — the create-pipeline snapshot law with crashes enabled,
  plus the orphan-fact crash residual (TLC).
- `replay/` — workflow replay soundness: Lean for the unbounded half,
  TLC for the protocol half, the faithless runner refuted in both.
- Owed: `effector/` (ticket 013 ports the proven register's evidence
  out of `.reference/`, an untracked predecessor repository absent from
  this checkout), `journal/` (ticket 012, composed into the catalog
  model as a refinement).
