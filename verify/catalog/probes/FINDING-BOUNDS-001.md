# FINDING BOUNDS 001 — the constant bounds truncate at 4, and `CatalogNaturallyBounded` cannot notice

Status: **RESOLVED — semantic bound plus independent guard controls.**
Found 2026-08-13 by the BREAKER team while probing one dimension beyond
the R2 gate bounds. Passed to the HARDENER team as the rationale for the
`ASSUME` guards already in their plan.

Resolved 2026-08-13 on `codex/catalog-bound-guards`: the invariant now uses
`Cardinality(Vals)`; every constant has an executable type/range assumption;
and three otherwise-valid configs independently require TLC to reject each
capped dimension before generating a state. The original paired green runs
below remain the preserved pre-fix evidence.

Severity: **audit hazard.** No ratified claim is false at the ratified
bounds — 2 daemons / 3 values / 2 creators are all within the expressible
range. The hazard is forward-looking: this is the exact shape a silent
weakening would take, and the one invariant that would catch it has been
stated against the wrong quantity.

## Result

`Catalog.tla:95-100` builds every domain by filtering a **literal**
range:

```tla
\* Filtered from literal ranges rather than 1..N: Apalache does not accept
\* integer ranges with symbolic bounds.  The filter is semantically
\* identical for TLC.
Daemons  == { d \in 1..4 : d <= NumDaemons }
Creators == { c \in 1..4 : c <= NumCreators }
Vals     == { v \in 1..4 : v <= NumVals }
```

The comment is right that the filter is semantically identical for TLC —
**for values at or below 4.** Above 4 the literal range silently caps the
domain. `NumVals = 9` yields a 4-value model. TLC issues no warning,
because nothing is wrong: it is a well-formed set comprehension that
happens to be constant in its parameter beyond 4.

Compounding it, `Catalog.tla:344-345`:

```tla
CatalogNaturallyBounded ==
  \A d \in Daemons : Len(catalog[d]) <= NumVals
```

is stated against the **constant** `NumVals`, not against
`Cardinality(Vals)` — the size of the domain the model actually ran on.
So raising `NumVals` past 4 does two things at once: it fails to widen
the model, **and** it loosens the invariant whose stated job is to
certify that the catalog is naturally bounded by the value space. The
invariant becomes a claim about 9 discharged by catalogs that cannot
exceed 4.

## Reproduce the red evidence

Paired configs differing in exactly one constant. Single daemon / single
creator for the value probe, so the closure is decisive on counts alone.

```bash
cd verify/catalog
bash probes/run-probe.sh T1-vals4    Catalog.tla 1
bash probes/run-probe.sh T2-vals9    Catalog.tla 1
bash probes/run-probe.sh T4-daemons4 Catalog.tla 1
bash probes/run-probe.sh T3-daemons9 Catalog.tla 1
```

| Probe | Config | Generated | Distinct | Depth | Verdict |
|---|---|---:|---:|---:|---|
| `T1-vals4` | 1 daemon / 1 creator / **4 vals** / cap 1 | 1,757 | 457 | 10 | clean |
| `T2-vals9` | 1 daemon / 1 creator / **9 vals** / cap 1 | 1,757 | 457 | 10 | clean |
| `T4-daemons4` | **4 daemons** / 1 creator / 1 val / cap 1 | 1,436,629 | 141,957 | 25 | clean |
| `T3-daemons9` | **9 daemons** / 1 creator / 1 val / cap 1 | 1,436,629 | 141,957 | 25 | clean |

Byte-identical closures in both pairs. The 9-value model *is* the
4-value model; the 9-daemon model *is* the 4-daemon model. In `T2` the
`CatalogNaturallyBounded` check that ran was `Len(catalog[d]) <= 9`,
discharged by a model in which `Len(catalog[d]) <= 4` is structurally
forced.

Logs: `probes/_runlogs/T1-vals4.txt`, `T2-vals9.txt`,
`T3-daemons9.txt`, `T4-daemons4.txt`.

## Why it matters for the gate

The gate's whole discipline is that a bounded check certifies only its
bounds, and that the bounds are stated honestly. This is a mechanism by
which a *stated* bound and a *checked* bound can silently diverge:

- A future config claiming "now checked at 6 values / 5 daemons / 5
  creators" would return green in the same wall-clock as the old one,
  covering nothing new.
- The reviewer's natural cross-check — "did the state count grow?" —
  would show it did not, but nothing in the gate script compares state
  counts across configs except the cap2 canary, which is pinned at 2
  values.
- `CatalogNaturallyBounded`, the invariant a reader would expect to
  catch a bogus value bound, is the one invariant that gets *weaker* as
  the claim gets bigger.

This is not hypothetical arithmetic: T2 and T3 are green runs whose
configs claim more than the model delivered.

## Proposed fix

Two parts, and both are needed.

**Semantic fix.** State the invariant against the domain the model
actually ran on:

```tla
CatalogNaturallyBounded ==
  \A d \in Daemons : Len(catalog[d]) <= Cardinality(Vals)
```

(`EXTENDS FiniteSets`.) At every ratified config this is the identical
check — `Cardinality(Vals) = NumVals` for `NumVals <= 4` — so the
committed cap2 and gate results stand unchanged. Above 4 it becomes the
true statement instead of a weaker one, and it stops rewarding a bound
nobody can reach.

**Guard.** An `ASSUME` so the model refuses a config it cannot honour,
rather than silently truncating it:

```tla
ASSUME NumDaemons  \in 1..4
ASSUME NumCreators \in 1..4
ASSUME NumVals     \in 1..4
```

TLC evaluates `ASSUME`s before checking and fails the run outright, so a
config claiming 6 values becomes a loud error instead of a fast green.
The resolved gate runs three independent overrun configs; this finding is
their rationale and preserves the evidence that made the guards necessary.

The semantic fix alone is insufficient — it makes the invariant honest
but still lets a `NumVals = 9` config run to a green, merely-narrower
verdict. The `ASSUME` alone is insufficient too — it blocks the bad
config but leaves the invariant stated against the wrong quantity for
anyone who later raises the literal range from `1..4` to `1..8` and
forgets. Together they close it.

## What this finding does NOT claim

- No ratified claim is false. `Catalog.cfg` (2/2/3/2) and
  `Catalog.cap2.cfg` (2/2/2/1) are entirely within the expressible
  range, and both closures reproduced exactly on the audited jar.
- The R3 Apalache obligations run at 2 daemons / 3 values / 2 creators,
  also within range. Nothing here bears on them.
- The `1..4` construction itself is not the defect — the comment
  explains why it exists (Apalache rejects symbolic range bounds), and
  that reason is sound. The defect is that nothing guards it and the
  invariant does not reflect it.
