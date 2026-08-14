# verify/ir — the IR ground-truth model (Lean)

Increment 1 of the ground-truth program
([architecture audit](../../docs/research/2026-08-14-architecture-audit.md)
§5). `flb.type.v0` as an algebraic type with a denotational semantics, so
the estate's prose laws about *meaning* become theorems. Lean 4.33.0, core
only, no mathlib, no `sorry`. Gate: `./run.sh` (= `lake build`).

## What is stated once here that the code states many times

- **The grammar as a type** (`IR/Syntax.lean`): `TyX H` — 13 kinds, with
  the hole a type PARAMETER. `Ty = TyX Empty` is the closed grammar (C5
  "a hole never bears identity" holds because the hole is uninhabitable);
  `PTy = TyX Unit` is the authoring grammar. That holes exist only at type
  positions is visible in the definition — `H` appears in exactly one
  constructor (FINDING-FRONTIER-001's "one hole-bearing nonterminal", as a
  type). The shipped Go/TS restatements (walk, normalize, replace,
  session-normalize, completion, three codegen switches, …) should mirror
  THIS statement; the audit's §3 modeling remedy names it as the
  reference.
- **The semantics** (`IR/Semantics.lean`): `Conforms ρ t v` — which JSON
  values inhabit which type under catalog resolver `ρ`. This relation is
  nowhere in the shipped system (payload conformance is a stated ingress
  non-goal), yet the ratified laws are claims about it. Structs are
  denotationally CLOSED, derived from the shipped json-schema target
  (`additionalProperties: false`, codegen.ts:243). Refs are fuel-indexed;
  the catalog DAG (W4) is why a finite fuel suffices.

## Theorems (each a prose law, now machine-checked)

| theorem | the law it discharges |
| --- | --- |
| `Ty.close_embed_id` | C5 round trip: a closed term survives embedding into the authoring grammar and closing again. |
| `brand_invisible` | Brands are denotationally invisible — identity moves, meaning does not (ratified identity law). |
| `check_invisible` | Checks are declared metadata — never a semantic constraint. |
| `brand_fiber` | The fiber theorem's premise: differently-branded copies of one type are indistinguishable by any value — brands are pure intent. |
| `ref_unfold` | A ref means exactly its resolution. |
| `union_extensional` | Union meaning is a property of the member SET — order and duplication are identity-level. |
| `sort_preserves_meaning` | Normalization's member sort (ANY comparator, canonical-byte order included) never moves the denotation — the two-folds thesis at the type level. |
| `resolver_mono` | Catalog growth never invalidates conformance — "presence of evidence is monotone", denotationally; why ingress can admit with a plain check. |

## Abstractions, stated

Numerics are `Int` (float identity is the number-determinism dossier's
lane); `check` args abstracted to the name; fields/members are mutual
inductive lists (canonical field order is a well-formedness law, not a
representation constraint); string ordering is Lean's, with the UTF-16
surrogate edge case out of model.

## Next rungs (roadmap, audit §5)

Well-formedness (`WF`) with the residual laws (union nodup post-normalize,
optional sorted/unique/declared) and the parse theorem (untyped JSON →
`Except Refusal Ty`, agreeing with the walk); normalization idempotence
under an order axiom for canonical bytes; the DAG-depth sufficiency lemma
for fuel; conformance decidability packaging.
