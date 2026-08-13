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

## Layout

- `catalog/` — catalog + ingress (SPEC laws W1–W5): R2 at the gate
  caps, R3 inductive invariant, four faithless controls. R4 is ticket
  010.
- Owed: `effector/` (ticket 013 ports the proven register's evidence
  out of `.reference/`, an untracked predecessor repository absent from
  this checkout), `journal/` (ticket 012, composed into the catalog
  model as a refinement).
