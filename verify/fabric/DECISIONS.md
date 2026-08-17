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

### T2. Model bounded redelivery by consuming into a reorder buffer

Decided: `ingestSchedule` traverses every arrival, applies the lower position
floor and upper window, and inserts admitted operations into a position-sorted,
deduplicated buffer. `AtLeastOnceSchedule` states that this executable buffer is
the consecutive positioned trace; `guardedApply` drains it once. The finite
delivery list may be permuted, duplicated, and contain stale entries at or
below the floor. Alternatives: index the raw schedule by position; model an
online transition system with a liveness/buffer-capacity policy. Why: the
consumer now sees the schedule and the lower guard is a separable operation,
while the theorem remains generic in the step function. **Load-bearing? yes** —
a floor-only fold over arrival order would apply reordered non-commutative steps
in the wrong order.

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

Decided: a multiplicity-retaining cell over the shipped observation carrier
drops idempotence while retaining associativity and commutativity; left choice
over the shipped `GroundCell` drops commutativity while retaining associativity
and idempotence; replay without the lower floor check retains the lawful
consumer's sorting, deduplication, upper bound, and step; trusting the requested
policy drops only meet-clamping. Alternatives: toy scalar algebras; copy four
whole models. Why: every variant now shares the shipped carrier, vector data,
or executable consumer and is killed by that exact named row. **Load-bearing?
yes** — a mutant that drops two laws does not demonstrate which discriminator
killed it.

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
