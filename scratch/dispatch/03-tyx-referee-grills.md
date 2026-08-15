# The referee grills: three decisions before the engine builds

## Why now

The 2026-08-15 IR audit verdict is NOT-A-REFEREE-YET: the TyX theorem
layer is sound, but the executable referee is unbuilt, and two of its
work items encode semantic decisions nobody has made. Per the working
precepts, no build starts on an ungrilled decision. This issue is the
grill — operator + coordinator, one decision at a time, recommended
option first. No code.

## The three decisions

1. **`check.args` in the model.** The grammar's check node carries
   `{name, args}` and args bear identity (they enter canonical bytes,
   digests, and union sort order); the Lean syntax keeps only the
   name (IR-4). Options: (a) add args as a canonicalizable payload to
   `TyX` — the referee can then compute correct normal forms for
   check-bearing terms; (b) scope the referee to check-free terms and
   state the exclusion in every vector file. Recommended: (a); (b)
   silently exempts the drift engine's hardest rows.
2. **Numerics scope.** Literals are `Int`-only in the model; the
   frozen fixtures exercise RFC 8785 number normalization (1.0 vs 1).
   Options: (a) Int-only referee scope, exclusion stated, decimal
   representation deferred; (b) a decimal/binary64 representation now.
   Recommended: (a) — smaller, honest, revisitable when a vector needs
   it.
3. **Verdict semantics for conformance vectors.** The model's
   `Conforms` is the identity/daemon semantics: checks invisible,
   int = float. Two of three codegen targets emit real refinements
   from checks, so generated validators disagree with the model by
   documented design. Options: (a) golden conformance verdicts use the
   identity semantics, and vector files say so in their provenance
   line; (b) exclude check nodes and float prims from the conformance
   family; (c) model per-target refinement semantics. Recommended:
   (a) — it is the semantics the digest and the certifier already
   commit to; (c) is a second model nobody has consumed.

## Acceptance

Three rulings recorded in a dated grill record under `docs/design/`,
each with decided / alternatives / why, and D-numbers assigned at
merge. Issue 04 unblocks only when all three are ratified.

## Pointers

`docs/research/2026-08-15-model-audit-findings.md` IR-1..IR-5;
`verify/ir/README.md` §next rungs; `proto/go/protod/walk.go` (the
check/args walk); `proto/ts/src/codegen.ts:97-105`.
