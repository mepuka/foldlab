# Catalog bound-guard decisions

Run 2026-08-13 CDT. Decisions encountered while resolving
`FINDING-BOUNDS-001` / GitHub issue #9.

## B1. Guard every constant; self-test the three literal-domain ceilings

Decided: state the complete configured domain explicitly. `NumDaemons`,
`NumCreators`, and `NumVals` must each be in `1..4`; `DataCap` must be a
natural number; and all four fault-selection switches must be Boolean. The
three `1..4` guards each have an otherwise-valid overrun config in `run.sh`.
The gate requires an assumption failure before state generation.

Alternative: one config with all three sizes set to 5. Rejected because any
one surviving assumption would mask deletion of either of the other two.
Alternative: controls for invalid `DataCap` and Boolean substitutions.
Rejected because those values do not encounter a silent literal-domain cap;
TLC already fails when a non-Boolean switch is evaluated, while the finding
requires controls for the three configs that previously closed green.

**Load-bearing? yes.** The independent controls make each truncation guard
repealable without making the gate insensitive.

## B2. State the catalog bound against the explored domain

Decided: `CatalogNaturallyBounded` uses `Cardinality(Vals)`, with
`FiniteSets` imported. At every ratified config this is extensionally equal to
the old `NumVals` expression, so the cap2 closure is the inertness oracle.

Alternative: retain `NumVals` because the new assumption equates it to the
domain cardinality. Rejected because a future increase of the literal range
could separate them again; the invariant should name the semantic quantity it
certifies.

**Load-bearing? yes.** The assumption prevents today's silent overrun; the
semantic expression prevents the same defect from returning when the literal
ceiling changes.
