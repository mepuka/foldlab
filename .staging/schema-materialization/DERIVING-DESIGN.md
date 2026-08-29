# The deriving layer — growth design for stipulation S1

**Status: pre-grade draft, 2026-08-29. The metaprogramming design for
Slice C's universe growth, grounded in the estate's own elaborator and
the reference patterns shipped on this machine. For grilling.**

Local evidence: `Cas/Schema/Deriving/Handler.lean` (the estate's
handler), `Cas/Schema/Notation.lean` (`cas_struct`), and the Lean core
derivers at
`~/.elan/toolchains/leanprover--lean4---v4.33.1/src/lean/Lean/Elab/Deriving/`
(`FromToJson.lean`, `DecEq.lean`, `Basic.lean`, `Util.lean`).
`lean4-json-schema` (REFERENCES.md:101, the admitted pattern source for
deriving-with-proofs) is NOT on this machine — observed remotely only;
a study clone is a named prerequisite of the C-derive slice, admitted
through the usual pin discipline before any pattern is copied.

## 1. What the estate's handler already does right

`Handler.lean` is the correct architecture and must not be rebuilt:

- **Everything lands through quotation.** The handler emits an ordinary
  `instance` command (`:121-128`); the kernel checks the code, the
  equivalence, and both round-trip proofs. No trusted meta-code, no
  `Expr`-level construction — the R13 posture (the generator
  accelerates, the kernel carries trust) applied to elaboration itself.
- **It rides Lean's official deriving utilities** (`mkInductArgNames`,
  `mkImplicitBinders`, `mkInstImplicitBinders`, `mkInductiveApp`,
  `mkInstName`, `registerDerivingHandler`) rather than reinventing
  binder plumbing.
- **Canonical order at elaboration time**: `canonicalFields` sorts by
  JSON field name (`:24-27`), so generated codes are `WF` by
  construction and the sortedness proof closes by
  `simp [fieldSpec]` (`:83-84`).
- **Proofs are compositional**: the equivalence proofs close by
  `cases x` + a fixed simp set over four house lemmas
  (`fieldSpec`/`fieldToEl`/`fieldOfEl`/`rebuildFields_eq`) — the
  deep-API move that keeps generated proof terms out of doom-loop
  territory.

The two enforced restrictions (`:90-93`) are the growth frontier:
recursive/nested/mutual refused, and non-structure inductives refused
with an error message that already anticipates this design
("constructor alternatives are not representable by the current schema
`Ast`").

## 2. Unions: inductives derive as tagged unions (C1 + C-derive)

The reference pattern is core's `FromToJson.mkToJsonBodyForInduct` +
`mkAlts` (`FromToJson.lean:43-97`): iterate `indVal.ctors`,
`forallTelescopeReducing` each constructor type, build one match
alternative per constructor with fresh binders, emit a tag-keyed body.

The Described analog, matching Effect's `TaggedUnion` shape so the
materialized TS is idiomatic:

- constructor `c (f₁ : T₁) … (fₙ : Tₙ)` →
  `Ast.struct [("_tag", .lit (.str "c")), fields…]` — wait: the tag is
  a literal-typed FIELD, i.e. `("_tag", false, .lit (.str "c"))`, and
  the code is `Ast.union [perCtorStructs…] .oneOf` (C1's constructor);
- `El` for the union code = the inductive itself; `toEl` is the
  generated match (one alternative per constructor), `ofEl` dispatches
  on the tag component;
- round-trip proofs generalize arm-wise: per-constructor lemmas closed
  by the existing simp set, assembled by `cases x` — never one
  monolithic proof. If a generated arm proof resists, the GENERATOR is
  wrong, not the tactic; that is the two-minute rule for meta-code.
- constructor order: canonicalized at elaboration like fields (sort by
  tag string), so union codes are WF by construction — recorded as an
  A-1 open note (source order vs canonical order is a C1 design
  question; the register's R15 makes field order load-bearing for
  structs, and unions need their own ruling).

`DecEq.lean` is the secondary reference for per-arm aux-lemma
generation.

## 3. Recursion: the store-reference route, not `partial`

Core's deriver goes `partial def` for recursive types
(`FromToJson.lean:197-200`). Estate law forbids that, and stipulation
S4 supplies the better answer: **a recursive occurrence derives as a
reference, not as inline structural recursion.**

- The derived code for a recursive inductive emits `Ast.ref`-successor
  (C6's `Reference`) at each recursive position, named in the
  document-level references table; the address binds at minting
  (schema-to-schema edges as real CAS references — the deferred
  commission item, now directed by S4).
- Consequence: `Described` instances for recursive types are
  **minted**, not purely derived — the deriving handler generates the
  per-constructor codes and the equivalence skeleton; the fixpoint
  closes at the document/DAG level, where `MultiDocument`'s shared
  reference environment (and Effect's revival via `Schema.suspend`)
  already lives. No `mu` in the carrier, no coinduction, no `partial`.
- This mirrors Effect exactly: `toRepresentation` forces thunks eagerly
  and expresses recursion ONLY through the `$ref` table
  (`toRepresentation.ts:290-296`); we adopt the same normal form.

## 4. DAG-minting (S4): elaboration-time doors

"Mint a schema from a DAG" gets a command elaborator, not a macro:
`cas_from_store <name> <fixture-or-address>` — reads store content at
elaboration (house precedent: build-time `#eval` IO asserts,
AGENTS.md), decodes through `Ast.ofRepresentationJson` (Slice B),
binds `def <name>.schemaCode : Ast`, and pins the payload bytes with a
generated byte-equality guard. The dual of `cas_struct`: one authors a
kind from Lean, the other admits a kind from the DAG — both land the
same three artifacts, and the schema is thereafter referenced by
address (S4), not only by its concrete instance.

## 5. Annotations (S2): sidecar DAG, not carrier fields

Do NOT add an annotations field to every `Ast` constructor — that
ripples every proof in the plane (codec laws, canonicality, round
trips) for data the kernel never inspects: the doom-loop shape.

Instead: **annotation content is store content.** An annotation node
(itself a described kind, authored via `cas_struct`) references the
schema node by address; the DAG carries arbitrarily many of them —
"twenty encoded other schemas" is twenty references. At projection
time the materializer folds sidecar annotations into the
representation-level `annotations` bags (string keys, `foldlab/...`)
where Effect persists them. The carrier stays small and fully proved;
the annotation surface is open and DAG-native; and "reference the
schema, not only its concrete instance" holds by construction because
the annotation edge IS a schema-addressed reference.

## 6. Notation growth (the `cas_struct` seam)

Per `Notation.lean`'s own charter ("literal pins, kind tags, unions,
and named recursion land here … without touching call sites"):

- `cas_union Name where | ctor (field : T) …` — sugar over
  `inductive … deriving Described` once §2 lands;
- optional-field syntax (`field? : T`) mapping to the optional bit —
  and, at C3, the mutability bit;
- `cas_struct`'s macro stays a pure syntax→syntax rewrite; all
  semantic work stays in the handler where `InductiveVal` is in scope.

## 7. Doom-loop firewalls (the S1 discipline, stated once)

1. Generated proofs are per-arm micro-lemmas over a FIXED simp set;
   the simp set is the API, and it only grows with a lemma proved by
   hand first.
2. A generated proof that resists two minutes condemns the generator,
   never invites tactic escalation.
3. Statements the handler emits are frozen shapes (the standing
   statements-before-proofs discipline applies to meta-code output).
4. Metaprogramming stays an opt-in import (`Deriving`, `Notation`);
   the runtime facade never depends on the elaborator.
5. Every handler emission is kernel-checked by construction — no
   `Expr`-level term building unless quotation provably cannot express
   it (none identified).

## Sequencing

§2 (unions) needs C1's `Ast.union` first; §3 needs C6; §4 needs
Slice B's decoder (in flight); §5 can start as soon as an annotation
kind is authored — it is pure `cas_struct` + a reference, expressible
in the CURRENT universe. Suggested order: §5 → §2 (with C1) → §4
(after B) → §3 (with C6). The lean4-json-schema study clone is
admitted before §2's proof-generation pass.
