# Schema source surface notes

Status: source inventory notes; not an accepted project scope

## Source AST families

The pinned SchemaAST.AST is a discriminated union of:

- Declaration;
- Null, Undefined, Void, Never, Unknown, Any;
- String, Number, Boolean, BigInt, Symbol;
- Literal, UniqueSymbol, ObjectKeyword, Enum, TemplateLiteral;
- Arrays, Objects, Union; and
- Suspend.

All variants share annotations, checks, encoding links, and context. Arrays and Objects add product structure; Union adds sum structure; Suspend adds recursion; Declaration admits opaque behavior. These cross-cutting fields mean that accepting a node tag alone is insufficient: source admission must inspect the whole raw AST before lowering, and the well-formedness judgment must restrict attached behavior as well as node tags.

Source: [SchemaAST.ts at the pinned commit](https://github.com/Effect-TS/effect/blob/0dd7825e4da4d3a00fa9bd410a1d55f3d4874d07/packages/effect/src/SchemaAST.ts).

The same pinned source exposes separate decoded Type and encoded Encoded views plus service requirements. SchemaRepresentation later lowers ASTs into a persistence/compiler representation with references and document forms. Lowering can erase encoding or callback details, which a future source-admission decision must account for explicitly.

## Use

This file inventories the pinned source topology only. It does not declare which constructors or behaviors Foldlab will admit, defer, translate, or prove. Those decisions require a separate domain decision and must not be inferred from this source inventory.

## Pinned source landmarks

- SchemaAST.ts lines 1–74: runtime-tree description and closed AST union.
- SchemaAST.ts lines 401–432: encoding links and chains.
- SchemaAST.ts lines 560–654: property context, checks, and shared node fields.
- SchemaAST.ts lines 689–3180: concrete node constructors.
- SchemaAST.ts lines 3207–3290: filters and check groups.
- SchemaAST.ts lines 3779–3865: type and encoded projections.
- Schema.ts lines 787–806: AST, Type, Encoded, and service views.
- SchemaRepresentation.ts lines 144–429: compiler/persistence representation algebra.
- SchemaRepresentation.ts lines 768–809: lowering into the representation.
- SchemaRepresentation.ts lines 1117–1238: JSON persistence and reviver limits.
