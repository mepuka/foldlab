# The materializer lane — node-types.json through the canonical schema plane

Pre-grade design note, 2026-08-28. UN-GRILLED (C4): nothing here is ratified;
this is the dispatch-shaped record of what the lane is, what it produces, and
what it is blocked on. Vocabulary note: "materializer" is not yet a minted
term in any CONTEXT.md — if the lane proceeds, the term owes a minting pass
(proposed carrier: the generative direction of a described schema, `fromAst`'s
shape — a canonical schema code compiled to its fully typed runtime carrier).

## What the lane is

The catalog row for lean4-tree-sitter names the shape: "typed grammar
schemas, declaration extraction, and verified source mapping — the shape of
the future codegen-verification harness; tree-sitter `node-types.json` as a
schema-ingestion point."

The pin is resolved (receipt `lean4-tree-sitter-stage1-standup`):
`typescript/src/node-types.json` @ grammar rev `75b3874e`, 108,583 bytes,
sha256 `c790a733…`. It is a machine-readable inventory of the grammar:
324 node types, 183 named, 78 with typed fields, 7 supertype unions
(`declaration`, `expression`, `pattern`, `primary_expression`,
`primary_type`, `statement`, `type`).

The lane's product: ingest that document through the canonical schema plane
(`Cas.CanonicalSchema`) and MATERIALIZE typed carriers from it — generated
Lean and TypeScript types for the TypeScript CST, so the Stage-1 walk's
string-typed seams (`childByFieldName "name"`, `(← n.type) == "class_declaration"`)
become exhaustively-typed field access on generated carriers. Generation
follows the entity-store-generate house gate: the generator makes no domain
choices, output is byte-identity-checked (`--check`), and generated Lean
carries decided statements (node-kind distinctness, field totality).

## The mapping sketch

| node-types.json construct | canonical schema construct |
|---|---|
| node type with fields | `Struct`, one member per field, strictly sorted |
| field `multiple: true` | `Array` of the member type |
| field `required: false` | optional member (v0: `union` with null — see blocker) |
| field `types: [...]` (>1) | `union` of `Ref`s |
| supertype entry (`subtypes`) | named `union` |
| recursion (`expression` → … → `expression`) | `mu`/named `Ref` cycle |
| `type` string of a node | `Literal` (pins the tag, as the vector codes pin theirs) |

## The blocker, stated plainly

Canonical schema v0 ships `Null/Boolean/Integer/String/Literal/Array/Struct/Ref`.
The ingestion needs `union` and `mu`/named references — exactly the
constructs the IMPLEMENTATION-PLAN defers to the schema commission, and the
$defs-graph follow-up from grammar-grill ruling 3 (schemas referencing
schemas as typed CAS edges) is where the 7 supertype unions and the
recursive node graph naturally live. **The materializer lane is therefore
BLOCKED on the schema commission's union/mu extension.** No v0 encoding
trick (optional-as-struct, union-as-tagged-string) should be minted to route
around it — that would put a canonical construct's identity in a convention
instead of the schema plane.

## What is NOT blocked

- The ingestion parser itself: node-types.json → a typed in-memory
  inventory (Effect Schema on the TS side) is v0-expressible and useful
  immediately as the census that sizes the union/mu requirement.
- The GrammarSpec registration pattern (one registry, first-class typed
  values, tracking manifest) is already house practice from the vector lane
  and carries over unchanged.
- The Stage-1 twin does not wait on this lane: its gate is the
  cross-instrument byte-identity harness, already green.

## Sequencing proposal (operator's call)

1. Schema commission lands `union` + `mu` (already its charter).
2. Ingest node-types.json → canonical schema codes; cross-pin the document
   digest in the receipt.
3. Generate carriers (Lean + TS twins) under a byte-identity gate;
   re-express the Stage-1 twin's walk over the generated carriers.
4. Only then: "verified source mapping" claims, gated per CLAIM-GATES.
