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

### T2. Model bounded redelivery by position coverage

Decided: `AtLeastOnceSchedule floor operations deliveries` recursively
requires lookup of each consecutive position to return the expected operation;
`guardedApply` processes exactly `operations.length` positions above the floor.
The finite delivery list may be permuted, duplicated, and contain stale entries
at or below the floor. Alternatives: sort/deduplicate the schedule first; model
an online buffer transition system. Why: the relation states the safety fact
F2b needs without inventing liveness or buffer-capacity policy; lookup makes
bounded reordering observable while the theorem remains generic in the step
function. **Load-bearing? yes** — a floor-only filter over arrival order would
incorrectly skip an earlier position delivered after a later one.

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
NDJSON follows the DEV-670 emitter idiom and yields useful one-row diffs. The
gate pins both total and per-kind counts. **Load-bearing? maybe** — consumers
may later request more rows, but any change is an explicit regenerated wire
change.

### T5. Use algebra-specific one-law mutants

Decided: addition drops idempotence while retaining associativity and
commutativity; left choice drops commutativity while retaining associativity
and idempotence; sequential replay drops only the floor guard; trusting the
requested policy drops only meet-clamping. Alternatives: mutate the production
definition behind flags; copy four whole models. Why: each variant is small,
cannot drift from unrelated production machinery, and its retained laws are
theorems in the same footprint roster. **Load-bearing? yes** — a mutant that
drops two laws does not demonstrate which discriminator killed it.

### T6. Narrow canonical JSON to the actual corpus grammar

Decided: object sorting, safe ASCII strings, arrays, booleans, and
non-negative integer leaves only; transliterate and cite the RQ-9 integer path.
Alternatives: Lean's general `Json.compress`; a new float renderer. Why: the
dispatch bars floats and promotes the RQ-9 route; the narrower grammar makes
the trusted emitter surface explicit and avoids re-deriving the unresolved
shortest-round-trip problem. **Load-bearing? yes** — canonical bytes are the
wall identity.
