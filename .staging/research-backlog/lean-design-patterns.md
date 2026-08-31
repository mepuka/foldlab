# LEAN DESIGN PATTERNS — the house shapes (backlog stub)

Status: **BACKLOG STUB — operator-ordered 2026-08-30** ("theorem
shapes, function shapes, the actual algebraic structures we're seeing
repeated… writing APIs with theorems is a big shift — I really want
the DESIGN PATTERNS documented. Not now — backlog."). This stub seeds
the lane with the patterns already visible in one day's landings so
the future write-up starts warm; each line becomes a section with
examples, the theorem shapes spelled, and the when-not-to-use.
Related: the scout lane's pattern ledger
(`.staging/model-guided-development/bank/patterns.md`, PT-001…008)
is the proof-shape half of the same effort.

Seed list (one line each, from 2026-08-30's work alone):

1. **Uninterpreted function + hypothesis lattice** — quantify over
   the untrusted thing (`H`, `Judge`); price every assumption as a
   named level; theorems conditional, never absolute. The estate's
   core trust move.
2. **Parameterize, don't import** — `columnBy`'s classifier,
   `accepts`' naming function, `Stable`'s relation, `View`'s merge:
   the reason today's new modules were BORN zero-dependency.
3. **Two-halves theorems** — state preservation and faithfulness
   separately, with the side condition (unique decomposition) on the
   faithful half only (the Gregory–Prest Thm 2.1 shape).
4. **Partial join with typed refusal** — `Compatible` as the join's
   partiality boundary; fail-closed algebra instead of total-by-fiat.
5. **Monoid homomorphism as incremental view** — `run_append` IS
   incremental render; `defectCount_append` IS incremental
   measurement. The View structure as the reusable carrier.
6. **Closed registry inductive + partial inverse + round-trip pin** —
   `Ty` / `ofTag` / `ofTag_wireTag`; `MetaSchema`. Stillness as the
   discipline; growth only by grill.
7. **decide-theorems over #guard for load-bearing laws** — guards are
   invisible to every ledger; named theorems earn rows, axiom
   entries, ruling bindability.
8. **The emitter+gate shape** — pure deterministic projection of a
   declared value, `--check`, double-run byte-identity; the org
   chart, the debts, the API itself all take this shape.
9. **Structured debt markers** — `owed(id)` / `discharges(id)` as
   docstring lifecycle; debts as ledger rows, not memory.
10. **The hand/derived split rule** — generated carries DATA, hand
    carries JUDGMENT ("service keys are a TypeScript fact the model
    does not carry"); emitting judgment is provenance without
    authority.
11. **Refute-your-own-premise stops** — the extraction that tests its
    stratum claim before executing it; counterexample-first, fork
    surfaced, ruling requested (the L3 stop as the worked example).
12. **Left-biased characterization + symmetry-under-premise** —
    state the biased operational fact (`toStore_append`), then earn
    each symmetry (comm, idem) as a theorem paid for by a premise.
13. **Zero imports is not a stratum** — a stratum is carved around a
    COHERENT vocabulary, never around whichever file happens to need
    no import today; a single-module boundary adds a name, not a
    fact, when the scoped build already measures standalone-ness
    (the Backend.Ts deferral and the trimmed Sorts, both recorded
    under this heading in the strata seed).

Owed when the lane opens: per-pattern writeups with theorem
signatures, worked examples from the tree, anti-patterns, and the
relation to the bank's proof-shape ledger.
