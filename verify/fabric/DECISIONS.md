# Fabric model — decisions the dispatch did not fix

Task-local placeholders follow the numbering rule in `proto/DECISIONS.md`;
repository D-numbers are assigned at merge.

### T1. State F2 by equality of observation support

Decided: `SameDeliveredSet` compares `List.contains` for every
holder-attributed observation; `foldEvidence` is the finite set constructed
from the list. Alternatives: separate permutation and duplication inductive
relations; a multiset quotient. Why: equality of support is exactly the
equivalence generated jointly by arbitrary permutations and duplications, and
the extensional finite-set proof is the house semilattice idiom. **Load-bearing?
yes** — retaining multiplicity would destroy F2.

### T2. Model bounded redelivery with an explicit serial successor premise

Decided: `ingestSchedule` traverses every raw arrival and folds operations into
a buffer addressed by journal position. `F2bSerialSuccessorPremise` is not an
equation about that buffer: it says the in-window support of the raw arrivals
is exactly the consecutive positioned trace. The proof derives that the
shipped buffer
normalises every such duplicate/permuted schedule, and `guardedApply` advances
only at `floor + 1`. Stale entries at or below the floor may be present, but
application stays serial within a partition. The floor is a derived resume
coordinate; `guard_is_redundant` proves that pre-filtering arrivals by the
floor/window cannot change a successor-drained result. Alternatives: make the
buffer-output equation the premise; refuse every ahead-of-frontier delivery
instead of buffering it; model buffer capacity and liveness. Why: delivery 6
before 5 falsifies arrival-order application — an order-sensitive append step
yields `[3]` instead of `[2, 3]` — while the theorem remains generic in the
step function. **Load-bearing? yes** — the raw-support premise and successor
discipline are the runtime rules whose consequence the model proves.

### T3. Represent policy components uniformly

Decided: four finite sets (`capabilities`, `contextAllowlist`, `toolkits`,
`writ`) share a generic atom carrier and comparator; four numeric ceilings
(`capabilityClass`, `effortClass`, `budget`, `spawnBound`) use `Nat`. Meet is
intersection/minimum, and `≤` is subset/numeric order. Alternatives: one type
parameter per set; a single undifferentiated permission set. Why: this keeps all
spec-named components explicit while allowing one reusable finite-set proof.
**Load-bearing? no** — distinct atom types would deepen the type model without
changing F9.

### T4. Emit eleven fixed adversarial vectors as NDJSON

Decided: one provenance/count header plus 11 deterministic rows: F1 (1), F2
(2), F2b (3), F3 (1), F4 (1), F9 (2), and ACI-alphabet refusal (1).
Alternatives: seeded random traces; one large JSON array. Why: the named rows
are the smallest corpus covering every dispatched adversary and every law;
the bounded-reordering row uses list append so a buffer-less arrival-order
consumer observably disagrees. NDJSON follows the DEV-670 emitter idiom and
yields useful one-row diffs. The gate pins total/per-kind counts and every
`(kind, name, witness)` triple. **Load-bearing? maybe** — consumers
may later request more rows, but any change is an explicit regenerated wire
change.

### T5. Use algebra-specific one-law mutants

Decided: a multiplicity-retaining cell over the shipped observation carrier
drops idempotence while retaining associativity and commutativity; left choice
over the shipped `GroundCell` drops commutativity while retaining associativity
and idempotence; the arrival-order mutant uses the shipped 6-before-5 row and
drops successor discipline; trusting the requested policy drops only
meet-clamping. Alternatives: toy scalar algebras; copy four whole models. Why:
every variant now shares the shipped carrier, vector data, or executable
consumer and is killed by that exact named row. **Load-bearing? yes** — a
mutant that drops two laws does not demonstrate which discriminator killed it.

### T6. Narrow canonical JSON to the actual corpus grammar

Decided: object sorting with duplicate-key collapse, RFC 8785 string escaping,
arrays, booleans, and non-negative safe-integer leaves only; transliterate and
cite the RQ-9 integer path, and mechanically refuse a generated corpus above
`9007199254740991`.
Alternatives: Lean's general `Json.compress`; a new float renderer. Why: the
dispatch bars floats and promotes the RQ-9 route; the narrower grammar makes
the trusted emitter surface explicit and avoids re-deriving the unresolved
shortest-round-trip problem. **Load-bearing? yes** — canonical bytes are the
wall identity.

### T7. Record the unstatable floor-guard control as a proved deviation

Decided: remove the observationally redundant ingestion guard, roster
`guard_is_redundant`, and name the fourth negative-control family
`drop-successor-discipline`. This is the coordinator-approved deviation from
dispatch 30's requested drop-floor-guard control (DEV-695 round-3 ruling,
comment `7cb08c80-7c12-4a1d-9a7e-0daed812a0e5`, 2026-08-17). Alternatives:
retain the guard as defense-in-depth; continue naming the successor mutant as
a guard mutant. Why: the accepted theorem proves the guard cannot affect any
result in this model, while the 6-before-5 row refutes removal of the actual
successor discipline. **Load-bearing? yes** — it determines what the fourth
negative control honestly claims.

### T8. Run the corpus-diff self-test beside the fabric gate in Lean CI

Decided: `lean-gates.yml` runs `verify/fabric/run.sh --self-test` immediately
after the ordinary fabric gate. Alternatives: enroll it in
`negative-controls.yml`; leave it local-only. Why: both controls exercise the
fabric gate's own regeneration comparison and use the same Lean toolchain, so
the adjacent step keeps the proof and diff machinery under one runner without
changing the required battery. **Load-bearing? yes** — a self-test that CI
never executes can silently stop detecting model/corpus divergence.
