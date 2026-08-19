# DEV-812 prep artifact: the TypeScript AST, measured with the TypeScript compiler

Prep evidence for the TsAst build seat. Nothing here is a design proposal — it
is what the four committed generated files actually contain, read out of them by
the compiler the estate already ships. The build seat should be able to write
the Lean inductives by transcription from §2, the printer's terminals from §3,
and the layout engine's spec from §4, and know from §1 exactly which bytes it
has to reproduce.

**Pin.** `origin/main` at `c0b5b690ac21dca9226f1df5e89a17242d476829`.

**Instrument.** `typescript-five` (`npm:typescript@5.9.3`, lockfile
`sha512-jl1vZzPD…`), the alias the estate's own walls parse with. Two walks:
`ts.forEachChild` for the structural spine (what Lean inductives must carry) and
`node.getChildren()` for every leaf (what the printer must spell). Trivia read
separately with `ts.createScanner(…, skipTrivia = false)`, since doc comments are
trivia and byte parity lives in them.

**Host note, measured, not incidental.** The operator's Mac checkout at
`/Users/pooks/Dev/foldlab` cannot run these gates today: `node_modules` has no
`effect` and the `typescript-five` alias is unlinked (`bun run
check:refusal-vocabulary` dies with `Cannot find package 'typescript-five'`).
Every number below was taken in a throwaway detached worktree at the pin where
`bun install --frozen-lockfile` completed (72 packages) — the main checkout was
not touched. Whoever next claims a Mac gate run should `bun install` first.

---

## 1. The parity manifest — the wall targets

| file | sha256 | bytes | lines | final byte |
|---|---|---:|---:|---|
| `packages/plait/src/kernel/KernelSchemas.generated.ts` | `d7cfaa78b76995f836ae3638549d5463799ac4dad177508b459de91434ea7019` | 44 129 | 1 085 | **`)` — no trailing newline** |
| `packages/plait/src/kernel/KernelTables.generated.ts` | `b3165a1ae0b63ba6f78fa04543288384ee3e73d61ad36a81ed321dd8dbd392b1` | 35 410 | 935 | `\n` |
| `packages/plait/src/kernel/KernelBuilder.generated.ts` | `3f79603043cca553bc056ff01884f10a7ab24a6be2afff850899ba9cb143004b` | 19 521 | 519 | `\n` |
| `packages/plait/src/truth/RefusalKinds.generated.ts` | `8804af823d695e1cdcffd06bcf89e34ff637c5fd640f1f30314b76b955c55edd` | 16 473 | 370 | `\n` |

*(lines = newline count. No CRLF, no BOM, no tabs, no trailing whitespace on any
line of any file.)*

**The one input.** All four are rendered from
`packages/plait/fixtures/kernel-conformance.ndjson` — 125 lines, sha256
`64afd406f040a419f7c4192906944f7abb75def21fb7c729980d3035508456ed`. That digest
is *literally* the file's sha256: the `Corpus:` header line in `KernelTables`
and `RefusalKinds` is the raw file hash, with no canonicalization step in
between. Measured, not assumed — a Lean emitter that recomputes it must hash the
committed fixture bytes exactly as they sit.

**Regeneration and walls**, all run from `packages/plait`:

| file | regenerate | wall |
|---|---|---|
| `KernelSchemas.generated.ts` | `bun run generate:kernel-schemas` | `bun run check:kernel-schemas` |
| `KernelTables.generated.ts` | `bun run generate:kernel-tables` | `bun run check:kernel-tables` |
| `RefusalKinds.generated.ts` | `bun run generate:kernel-tables` (same command — one generator writes both) | `bun run check:kernel-tables` |
| `KernelBuilder.generated.ts` | `bun run generate:kernel-builder` | `bun run check:kernel-builder` |

Executed first-hand at the pin, real exit codes:

```
KERNEL SCHEMAS: PASS (byte-identical regeneration from packages/plait/fixtures/kernel-conformance.ndjson)
KERNEL TABLES: PASS (byte-identical regeneration of packages/plait/src/kernel/KernelTables.generated.ts and packages/plait/src/truth/RefusalKinds.generated.ts from packages/plait/fixtures/kernel-conformance.ndjson)
KERNEL BUILDER: PASS (byte-identical regeneration from packages/plait/fixtures/kernel-conformance.ndjson)
REFUSAL VOCABULARY: PASS (44 runtime kinds: 0 corpus-backed, 44 pinned DEV-804 staged debt, against 16 corpus refusal reasons; …)
```

**The first parity fact, and the cheapest one to lose.**
`KernelSchemas.generated.ts` does not end in a newline; the other three do. The
trailing newline is a per-file property of the renderer, not a property of "a
generated TypeScript file", so the Lean printer cannot own it as a constant.

---

## 2. The node census — the closed vocabulary

**56 kinds** are reachable by `ts.forEachChild` across the four files. Of those,
9 are keyword or operator tokens that `forEachChild` yields as ordinary children
(`ExportKeyword`, `ReadonlyKeyword`, `QuestionToken`, `PlusToken`,
`EqualsGreaterThanToken`, `NumberKeyword`, `BigIntKeyword`, `StringKeyword`,
`NullKeyword`), and 2 are frame nodes (`SourceFile`, `EndOfFileToken`) — leaving
**45 proper node kinds** as the spine the Lean inductives must carry. **44 kinds**
appear as terminals in the full `getChildren()` walk; that is the printer's
token alphabet.

Per file, distinct structural kinds: Schemas **34**, Tables **35**, Builder
**41**, Refusals **23**. No file needs the whole 56 — but one printer serves all
four, so the AST carries the union.

### Reconciling with the audit's 33-kind enumeration

The 33-kind enumeration the charge refers to is **not on the record**: DEV-812
carries four comments (dispatch, charter refresh, slice-A delivery, slice-A
merge) and DEV-810 four (metaprogramming grounding, the E1′ amendment, placement,
the emitter-lane audit); none enumerates node kinds, and neither do the DEV-772
grill sheet or its two sitting records. The number lives in the emitter lane's
working notes. This census is therefore the first enumeration on the record, and
the reconciliation is arithmetic rather than argument:

- **33 = `KernelSchemas.generated.ts` alone, minus one frame node.** That file
  needs 34 distinct kinds counting `SourceFile` and `EndOfFileToken`; drop
  either and the count is exactly 33. The audit priced `KernelSchemas` as the
  hard file (the ~34%-corpus-data one), so a single-file enumeration is the
  reading that fits.
- **What a 33-item list is missing for the target as a whole: 22 kinds.** Every
  kind in the tables below that scores 0 in the Schemas column —
  `TypeParameter` (34 uses), `NumericLiteral` (33), `InterfaceDeclaration` (17),
  `ElementAccessExpression` (16), `NullKeyword` (15), `QuestionToken` (14),
  `Parameter` (13), `FunctionType` (11), `SatisfiesExpression` (7),
  `IndexedAccessType` (5), `ParenthesizedType` (5), `MappedType` (5),
  `IntersectionType` (3), `TemplateLiteralType`/`TemplateHead`/
  `TemplateLiteralTypeSpan`/`TemplateTail` (3 each), `TypeOperator`,
  `TupleType`, `IndexSignature` (1 each), plus `StringKeyword` and
  `NumberKeyword`. Those are not exotica: they are the whole branded-alias
  section of `KernelTables` and the whole handle/args surface of
  `KernelBuilder`.

Nothing in the census is *over*counted: every kind below occurs at least once in
committed bytes, and the string table in §3 quotes the occurrence.

### Structural census — every kind `ts.forEachChild` reaches (56 kinds)

| # | SyntaxKind | total | Schemas | Tables | Builder | Refusals |
|---|---|---:|---:|---:|---:|---:|
| 1 | `Identifier` | 1554 | 924 | 323 | 293 | 14 |
| 2 | `StringLiteral` | 804 | 373 | 275 | 110 | 46 |
| 3 | `PropertyAssignment` | 728 | 418 | 198 | 110 | 2 |
| 4 | `ObjectLiteralExpression` | 265 | 153 | 68 | 43 | 1 |
| 5 | `TypeReference` | 153 | 8 | 58 | 85 | 2 |
| 6 | `BigIntLiteral` | 152 | 149 | 1 | 1 | 1 |
| 7 | `PropertyAccessExpression` | 132 | 131 | 0 | 0 | 1 |
| 8 | `ExportKeyword` | 128 | 64 | 35 | 25 | 4 |
| 9 | `CallExpression` | 117 | 116 | 0 | 0 | 1 |
| 10 | `ArrayLiteralExpression` | 108 | 86 | 12 | 9 | 1 |
| 11 | `ReadonlyKeyword` | 83 | 23 | 10 | 50 | 0 |
| 12 | `PropertySignature` | 77 | 23 | 7 | 47 | 0 |
| 13 | `VariableStatement` | 60 | 41 | 12 | 4 | 3 |
| 14 | `VariableDeclarationList` | 60 | 41 | 12 | 4 | 3 |
| 15 | `VariableDeclaration` | 60 | 41 | 12 | 4 | 3 |
| 16 | `LiteralType` | 59 | 9 | 16 | 34 | 0 |
| 17 | `TypeAliasDeclaration` | 51 | 23 | 20 | 7 | 1 |
| 18 | `BinaryExpression` | 50 | 50 | 0 | 0 | 0 |
| 19 | `PlusToken` | 50 | 50 | 0 | 0 | 0 |
| 20 | `TypeParameter` | 34 | 0 | 22 | 12 | 0 |
| 21 | `NumericLiteral` | 33 | 0 | 33 | 0 | 0 |
| 22 | `TypeQuery` | 28 | 22 | 4 | 1 | 1 |
| 23 | `QualifiedName` | 25 | 24 | 0 | 0 | 1 |
| 24 | `NumberKeyword` | 22 | 0 | 21 | 1 | 0 |
| 25 | `AsExpression` | 21 | 3 | 12 | 4 | 2 |
| 26 | `BigIntKeyword` | 20 | 13 | 0 | 7 | 0 |
| 27 | `InterfaceDeclaration` | 17 | 0 | 3 | 14 | 0 |
| 28 | `ElementAccessExpression` | 16 | 0 | 16 | 0 | 0 |
| 29 | `TypeLiteral` | 15 | 9 | 0 | 6 | 0 |
| 30 | `NullKeyword` | 15 | 0 | 0 | 15 | 0 |
| 31 | `QuestionToken` | 14 | 0 | 0 | 14 | 0 |
| 32 | `Parameter` | 13 | 0 | 0 | 13 | 0 |
| 33 | `FunctionType` | 11 | 0 | 0 | 11 | 0 |
| 34 | `UnionType` | 10 | 1 | 2 | 7 | 0 |
| 35 | `StringKeyword` | 10 | 0 | 5 | 5 | 0 |
| 36 | `SatisfiesExpression` | 7 | 0 | 5 | 2 | 0 |
| 37 | `IndexedAccessType` | 5 | 0 | 4 | 1 | 0 |
| 38 | `ParenthesizedType` | 5 | 0 | 4 | 1 | 0 |
| 39 | `MappedType` | 5 | 0 | 3 | 2 | 0 |
| 40 | `ImportDeclaration` | 4 | 2 | 0 | 1 | 1 |
| 41 | `ImportClause` | 4 | 2 | 0 | 1 | 1 |
| 42 | `EndOfFileToken` | 4 | 1 | 1 | 1 | 1 |
| 43 | `SourceFile` | 4 | 1 | 1 | 1 | 1 |
| 44 | `NamedImports` | 3 | 1 | 0 | 1 | 1 |
| 45 | `ImportSpecifier` | 3 | 1 | 0 | 1 | 1 |
| 46 | `IntersectionType` | 3 | 0 | 3 | 0 | 0 |
| 47 | `TemplateLiteralType` | 3 | 0 | 3 | 0 | 0 |
| 48 | `TemplateHead` | 3 | 0 | 3 | 0 | 0 |
| 49 | `TemplateLiteralTypeSpan` | 3 | 0 | 3 | 0 | 0 |
| 50 | `TemplateTail` | 3 | 0 | 3 | 0 | 0 |
| 51 | `NamespaceImport` | 1 | 1 | 0 | 0 | 0 |
| 52 | `ArrowFunction` | 1 | 1 | 0 | 0 | 0 |
| 53 | `EqualsGreaterThanToken` | 1 | 1 | 0 | 0 | 0 |
| 54 | `TypeOperator` | 1 | 0 | 0 | 1 | 0 |
| 55 | `TupleType` | 1 | 0 | 0 | 1 | 0 |
| 56 | `IndexSignature` | 1 | 0 | 0 | 1 | 0 |

### Terminal census — every leaf `node.getChildren()` reaches (44 kinds)

| # | SyntaxKind | total | Schemas | Tables | Builder | Refusals |
|---|---|---:|---:|---:|---:|---:|
| 1 | `Identifier` | 1558 | 925 | 324 | 294 | 15 |
| 2 | `CommaToken` | 1187 | 669 | 351 | 121 | 46 |
| 3 | `ColonToken` | 826 | 443 | 208 | 173 | 2 |
| 4 | `StringLiteral` | 804 | 373 | 275 | 110 | 46 |
| 5 | `OpenBraceToken` | 305 | 163 | 74 | 66 | 2 |
| 6 | `CloseBraceToken` | 305 | 163 | 74 | 66 | 2 |
| 7 | `JSDoc` | 157 | 64 | 36 | 53 | 4 |
| 8 | `DotToken` | 157 | 155 | 0 | 0 | 2 |
| 9 | `BigIntLiteral` | 152 | 149 | 1 | 1 | 1 |
| 10 | `OpenBracketToken` | 136 | 86 | 35 | 14 | 1 |
| 11 | `CloseBracketToken` | 136 | 86 | 35 | 14 | 1 |
| 12 | `OpenParenToken` | 134 | 117 | 4 | 12 | 1 |
| 13 | `CloseParenToken` | 134 | 117 | 4 | 12 | 1 |
| 14 | `ExportKeyword` | 128 | 64 | 35 | 25 | 4 |
| 15 | `EqualsToken` | 126 | 64 | 47 | 11 | 4 |
| 16 | `ReadonlyKeyword` | 84 | 23 | 10 | 51 | 0 |
| 17 | `LessThanToken` | 70 | 2 | 33 | 35 | 0 |
| 18 | `GreaterThanToken` | 70 | 2 | 33 | 35 | 0 |
| 19 | `ConstKeyword` | 60 | 41 | 12 | 4 | 3 |
| 20 | `TypeKeyword` | 52 | 23 | 20 | 8 | 1 |
| 21 | `PlusToken` | 50 | 50 | 0 | 0 | 0 |
| 22 | `NumericLiteral` | 33 | 0 | 33 | 0 | 0 |
| 23 | `BarToken` | 30 | 9 | 2 | 19 | 0 |
| 24 | `SyntaxList` | 28 | 23 | 3 | 2 | 0 |
| 25 | `TypeOfKeyword` | 28 | 22 | 4 | 1 | 1 |
| 26 | `AsKeyword` | 22 | 4 | 12 | 4 | 2 |
| 27 | `NumberKeyword` | 22 | 0 | 21 | 1 | 0 |
| 28 | `BigIntKeyword` | 20 | 13 | 0 | 7 | 0 |
| 29 | `InterfaceKeyword` | 17 | 0 | 3 | 14 | 0 |
| 30 | `NullKeyword` | 15 | 0 | 0 | 15 | 0 |
| 31 | `ExtendsKeyword` | 14 | 0 | 4 | 10 | 0 |
| 32 | `QuestionToken` | 14 | 0 | 0 | 14 | 0 |
| 33 | `SemicolonToken` | 13 | 11 | 0 | 2 | 0 |
| 34 | `EqualsGreaterThanToken` | 12 | 1 | 0 | 11 | 0 |
| 35 | `StringKeyword` | 10 | 0 | 5 | 5 | 0 |
| 36 | `SatisfiesKeyword` | 7 | 0 | 5 | 2 | 0 |
| 37 | `InKeyword` | 5 | 0 | 3 | 2 | 0 |
| 38 | `ImportKeyword` | 4 | 2 | 0 | 1 | 1 |
| 39 | `FromKeyword` | 4 | 2 | 0 | 1 | 1 |
| 40 | `EndOfFileToken` | 4 | 1 | 1 | 1 | 1 |
| 41 | `AmpersandToken` | 3 | 0 | 3 | 0 | 0 |
| 42 | `TemplateHead` | 3 | 0 | 3 | 0 | 0 |
| 43 | `TemplateTail` | 3 | 0 | 3 | 0 | 0 |
| 44 | `AsteriskToken` | 1 | 1 | 0 | 0 | 0 |

---

## 3. The string table — the concrete syntax the printer must reproduce

Up to three verbatim slices per structural kind, shortest first, quoted as
`node.getText()` (the exact source bytes of the node, leading trivia excluded).
`⏎` marks a real newline inside the slice. Read this as the printer's
acceptance list: each row is a string some constructor has to emit exactly.

### The spine

Up to three slices per structural kind, shortest first.

| SyntaxKind | site | verbatim slice (`⏎` marks a real newline inside the slice) |
|---|---|---|
| `Identifier` | Schemas:89 | <code>doc</code> |
| `Identifier` | Schemas:48 | <code>const</code> |
| `Identifier` | Schemas:88 | <code>canon</code> |
| `StringLiteral` | Schemas:112 | <code>"kind"</code> |
| `StringLiteral` | Schemas:122 | <code>"stage"</code> |
| `StringLiteral` | Schemas:37 | <code>"effect"</code> |
| `PropertyAssignment` | Schemas:89 | <code>doc: 22n</code> |
| `PropertyAssignment` | Schemas:91 | <code>kind: 12n</code> |
| `PropertyAssignment` | Schemas:95 | <code>stage: 5n</code> |
| `ObjectLiteralExpression` | Schemas:157 | <code>{ fields: [], name: "lane" }</code> |
| `ObjectLiteralExpression` | Schemas:159 | <code>{ fields: [], name: "index" }</code> |
| `ObjectLiteralExpression` | Schemas:153 | <code>{ fields: [], name: "schema" }</code> |
| `TypeReference` | Schemas:48 | <code>const</code> |
| `TypeReference` | Tables:82 | <code>KernelDeclKind</code> |
| `TypeReference` | Tables:103 | <code>KernelHoleStage</code> |
| `BigIntLiteral` | Schemas:45 | <code>2n</code> |
| `BigIntLiteral` | Schemas:93 | <code>4n</code> |
| `BigIntLiteral` | Schemas:95 | <code>5n</code> |
| `PropertyAccessExpression` | Schemas:55 | <code>Grammar.KernelNat</code> |
| `PropertyAccessExpression` | Schemas:235 | <code>Grammar.KernelDocRecord</code> |
| `PropertyAccessExpression` | Schemas:107 | <code>Grammar.KernelKindRecord</code> |
| `ExportKeyword` | Schemas:42 | <code>export</code> |
| `CallExpression` | Schemas:444 | <code>Schema.Struct({ id: KernelNat })</code> |
| `CallExpression` | Schemas:467 | <code>Schema.Struct({ bytes: KernelNat })</code> |
| `CallExpression` | Schemas:487 | <code>Schema.Struct({ value: KernelNat })</code> |
| `ArrayLiteralExpression` | Schemas:153 | <code>[]</code> |
| `ArrayLiteralExpression` | Schemas:111 | <code>[ ⏎     { name: "schema", rank: 0n, record: "kind" }, ⏎   ]</code> |
| `ArrayLiteralExpression` | Schemas:121 | <code>[ ⏎     { name: "opened", rank: 0n, record: "stage" }, ⏎   ]</code> |
| `ReadonlyKeyword` | Schemas:367 | <code>readonly</code> |
| `PropertySignature` | Schemas:373 | <code>readonly lane: bigint</code> |
| `PropertySignature` | Schemas:379 | <code>readonly tick: bigint</code> |
| `PropertySignature` | Schemas:380 | <code>readonly cell: bigint</code> |
| `VariableStatement` | Schemas:55 | <code>export const KernelNat = Grammar.KernelNat</code> |
| `VariableStatement` | Schemas:73 | <code>export const KERNEL_CANONICAL_EXAMPLES_KEY = "canonicalExamples"</code> |
| `VariableStatement` | Schemas:107 | <code>export const KernelKindRecord = Grammar.KernelKindRecord.annotate({ ⏎   canonicalExamples: [ ⏎     "{\"name\":\"schema\",\"rank\":0,\"record\":\"kind\…</code> |
| `VariableDeclarationList` | Schemas:55 | <code>const KernelNat = Grammar.KernelNat</code> |
| `VariableDeclarationList` | Schemas:73 | <code>const KERNEL_CANONICAL_EXAMPLES_KEY = "canonicalExamples"</code> |
| `VariableDeclarationList` | Schemas:107 | <code>const KernelKindRecord = Grammar.KernelKindRecord.annotate({ ⏎   canonicalExamples: [ ⏎     "{\"name\":\"schema\",\"rank\":0,\"record\":\"kind\"}", ⏎ …</code> |
| `VariableDeclaration` | Schemas:55 | <code>KernelNat = Grammar.KernelNat</code> |
| `VariableDeclaration` | Schemas:73 | <code>KERNEL_CANONICAL_EXAMPLES_KEY = "canonicalExamples"</code> |
| `VariableDeclaration` | Schemas:107 | <code>KernelKindRecord = Grammar.KernelKindRecord.annotate({ ⏎   canonicalExamples: [ ⏎     "{\"name\":\"schema\",\"rank\":0,\"record\":\"kind\"}", ⏎   ], ⏎…</code> |
| `LiteralType` | Tables:921 | <code>"lane"</code> |
| `LiteralType` | Tables:925 | <code>"index"</code> |
| `LiteralType` | Tables:913 | <code>"schema"</code> |
| `TypeAliasDeclaration` | Schemas:434 | <code>export type KernelRefValue = typeof KernelRef.Type</code> |
| `TypeAliasDeclaration` | Schemas:713 | <code>export type KernelActValue = typeof KernelAct.Type</code> |
| `TypeAliasDeclaration` | Schemas:1015 | <code>export type KernelDoorValue = typeof KernelDoor.Type</code> |
| `BinaryExpression` | Schemas:403 | <code>"The closed universe of declaration kinds. One brand per kind: a\ndigest is always the " ⏎     + "digest of a declaration of a known kind. "</code> |
| `BinaryExpression` | Schemas:623 | <code>"The epistemic stages of a hole, in rising rank order. `opened` is\nthe protocol stage " ⏎     + "named open; the language keyword forces the\nspellin…</code> |
| `BinaryExpression` | Schemas:491 | <code>"The digest of a fold state: a value identity, never a declaration\nidentity. Its own sort " ⏎     + "keeps it out of every declaration-digest\npositi…</code> |
| `PlusToken` | Schemas:404 | <code>+</code> |
| `TypeParameter` | Tables:896 | <code>Carrier = number</code> |
| `TypeParameter` | Tables:871 | <code>Tag extends string</code> |
| `TypeParameter` | Tables:82 | <code>Kind in KernelDeclKind</code> |
| `NumericLiteral` | Tables:70 | <code>0</code> |
| `NumericLiteral` | Tables:71 | <code>1</code> |
| `NumericLiteral` | Tables:72 | <code>2</code> |
| `TypeQuery` | Schemas:434 | <code>typeof KernelRef.Type</code> |
| `TypeQuery` | Schemas:713 | <code>typeof KernelAct.Type</code> |
| `TypeQuery` | Schemas:1015 | <code>typeof KernelDoor.Type</code> |
| `QualifiedName` | Schemas:826 | <code>Schema.Codec</code> |
| `QualifiedName` | Schemas:434 | <code>KernelRef.Type</code> |
| `QualifiedName` | Schemas:713 | <code>KernelAct.Type</code> |
| `NumberKeyword` | Tables:66 | <code>number</code> |
| `AsExpression` | Tables:891 | <code>[ ⏎   { name: "AnchorFact", params: ["declared", "partition"] }, ⏎ ] as const</code> |
| `AsExpression` | Tables:85 | <code>[ ⏎   "opened", ⏎   "filled", ⏎   "disputed", ⏎   "decided", ⏎   "sealed", ⏎ ] as const</code> |
| `AsExpression` | Tables:97 | <code>{ ⏎   opened: 0, ⏎   filled: 1, ⏎   disputed: 2, ⏎   decided: 3, ⏎   sealed: 4, ⏎ } as const</code> |
| `BigIntKeyword` | Schemas:367 | <code>bigint</code> |
| `InterfaceDeclaration` | Builder:85 | <code>export interface KernelHoleRef { ⏎   readonly arg: "hole" ⏎   readonly name: bigint ⏎ }</code> |
| `InterfaceDeclaration` | Builder:74 | <code>export interface KernelLiteralArg { ⏎   readonly arg: "literal" ⏎   readonly value: bigint ⏎ }</code> |
| `InterfaceDeclaration` | Tables:871 | <code>export interface KernelBrand&lt;Tag extends string&gt; { ⏎   readonly "~foldlab/plait/kernel/Brand": Tag ⏎ }</code> |
| `ElementAccessExpression` | Tables:335 | <code>KERNEL_REFUSALS[0]</code> |
| `ElementAccessExpression` | Tables:336 | <code>KERNEL_REFUSALS[1]</code> |
| `ElementAccessExpression` | Tables:337 | <code>KERNEL_REFUSALS[2]</code> |
| `TypeLiteral` | Builder:132 | <code>{ readonly form: "kind" }</code> |
| `TypeLiteral` | Builder:135 | <code>{ readonly form: "value" }</code> |
| `TypeLiteral` | Builder:136 | <code>{ readonly form: "absent" }</code> |
| `NullKeyword` | Builder:98 | <code>null</code> |
| `QuestionToken` | Builder:229 | <code>?</code> |
| `Parameter` | Builder:435 | <code>kind: Kind</code> |
| `Parameter` | Builder:436 | <code>id: bigint</code> |
| `Parameter` | Builder:440 | <code>name: Holes</code> |
| `FunctionType` | Builder:440 | <code>(name: Holes) =&gt; KernelHoleRef</code> |
| `FunctionType` | Builder:443 | <code>(value: bigint) =&gt; KernelLiteralArg</code> |
| `FunctionType` | Builder:465 | <code>( ⏎     args: KernelEmitArgs, ⏎   ) =&gt; KernelHandle&lt;"emit", null&gt;</code> |
| `UnionType` | Builder:207 | <code>string \| null</code> |
| `UnionType` | Builder:98 | <code>KernelDeclKind \| null</code> |
| `UnionType` | Tables:408 | <code>"kernel-corpus" \| "staged-debt"</code> |
| `StringKeyword` | Tables:138 | <code>string</code> |
| `SatisfiesExpression` | Tables:97 | <code>{ ⏎   opened: 0, ⏎   filled: 1, ⏎   disputed: 2, ⏎   decided: 3, ⏎   sealed: 4, ⏎ } as const satisfies { readonly [Stage in KernelHoleStage]: number }</code> |
| `SatisfiesExpression` | Builder:198 | <code>{ ⏎   declare: "kind", ⏎   resolve: "kind", ⏎   emit: null, ⏎   join: null, ⏎   fold: null, ⏎   decide: null, ⏎   trigger: null, ⏎   spawn: null, ⏎ } …</code> |
| `SatisfiesExpression` | Tables:69 | <code>{ ⏎   schema: 0, ⏎   program: 1, ⏎   policy: 2, ⏎   capability: 3, ⏎   lane: 4, ⏎   algebra: 5, ⏎   index: 6, ⏎   resource: 7, ⏎   ontology: 8, ⏎   sc…</code> |
| `IndexedAccessType` | Tables:66 | <code>(typeof KERNEL_DECL_KINDS)[number]</code> |
| `IndexedAccessType` | Builder:56 | <code>(typeof KERNEL_GENERATORS)[number]</code> |
| `IndexedAccessType` | Tables:94 | <code>(typeof KERNEL_HOLE_STAGES)[number]</code> |
| `ParenthesizedType` | Tables:66 | <code>(typeof KERNEL_DECL_KINDS)</code> |
| `ParenthesizedType` | Builder:56 | <code>(typeof KERNEL_GENERATORS)</code> |
| `ParenthesizedType` | Tables:94 | <code>(typeof KERNEL_HOLE_STAGES)</code> |
| `MappedType` | Tables:82 | <code>{ readonly [Kind in KernelDeclKind]: number }</code> |
| `MappedType` | Tables:103 | <code>{ readonly [Stage in KernelHoleStage]: number }</code> |
| `MappedType` | Builder:207 | <code>{ readonly [Generator in KernelGenerator]: string \| null }</code> |
| `ImportDeclaration` | Schemas:37 | <code>import { Schema } from "effect"</code> |
| `ImportDeclaration` | Schemas:39 | <code>import * as Grammar from "./KernelCorpusSchemas.js"</code> |
| `ImportDeclaration` | Builder:32 | <code>import type { KernelDeclKind } from "./KernelTables.generated.js"</code> |
| `ImportClause` | Schemas:37 | <code>{ Schema }</code> |
| `ImportClause` | Schemas:39 | <code>* as Grammar</code> |
| `ImportClause` | Builder:32 | <code>type { KernelDeclKind }</code> |
| `EndOfFileToken` | Schemas:1086 | <code></code> |
| `NamedImports` | Schemas:37 | <code>{ Schema }</code> |
| `NamedImports` | Builder:32 | <code>{ KernelDeclKind }</code> |
| `ImportSpecifier` | Schemas:37 | <code>Schema</code> |
| `ImportSpecifier` | Builder:32 | <code>KernelDeclKind</code> |
| `IntersectionType` | Tables:897 | <code>Carrier & KernelBrand&lt;`~foldlab/plait/kernel/Digest/${Kind}`&gt;</code> |
| `IntersectionType` | Tables:901 | <code>Carrier & KernelBrand&lt;`~foldlab/plait/kernel/Token/${Register}`&gt;</code> |
| `IntersectionType` | Tables:905 | <code>Carrier & KernelBrand&lt;`~foldlab/plait/kernel/Position/${Partition}`&gt;</code> |
| `TemplateLiteralType` | Tables:897 | <code>`~foldlab/plait/kernel/Digest/${Kind}`</code> |
| `TemplateLiteralType` | Tables:901 | <code>`~foldlab/plait/kernel/Token/${Register}`</code> |
| `TemplateLiteralType` | Tables:905 | <code>`~foldlab/plait/kernel/Position/${Partition}`</code> |
| `TemplateHead` | Tables:901 | <code>`~foldlab/plait/kernel/Token/${</code> |
| `TemplateHead` | Tables:897 | <code>`~foldlab/plait/kernel/Digest/${</code> |
| `TemplateHead` | Tables:905 | <code>`~foldlab/plait/kernel/Position/${</code> |
| `TemplateLiteralTypeSpan` | Tables:897 | <code>Kind}`</code> |
| `TemplateLiteralTypeSpan` | Tables:901 | <code>Register}`</code> |
| `TemplateLiteralTypeSpan` | Tables:905 | <code>Partition}`</code> |
| `TemplateTail` | Tables:897 | <code>}`</code> |
| `NamespaceImport` | Schemas:39 | <code>* as Grammar</code> |
| `ArrowFunction` | Schemas:838 | <code>(): Schema.Codec&lt;KernelCandidatePredicateValue&gt; =&gt; KernelCandidatePredicate</code> |
| `EqualsGreaterThanToken` | Schemas:838 | <code>=&gt;</code> |
| `TypeOperator` | Builder:102 | <code>readonly [Generator, Kind]</code> |
| `TupleType` | Builder:102 | <code>[Generator, Kind]</code> |
| `IndexSignature` | Builder:519 | <code>readonly [field: string]: KernelBuilderArg</code> |

### The terminals the spine does not name

One slice per leaf kind that only the full `getChildren()` walk reaches — the printer's punctuation and keyword alphabet. `JSDoc` is here because doc comments attach as nodes; §4.3 governs their text. `SyntaxList` with an empty slice is the compiler's own zero-length child list (28 of them, e.g. an absent modifier list) and is not a printed token — the one row here that the Lean printer must NOT carry.

| SyntaxKind | site | verbatim slice (`⏎` marks a real newline inside the slice) |
|---|---|---|
| `CommaToken` | Schemas:43 | <code>,</code> |
| `ColonToken` | Schemas:43 | <code>:</code> |
| `OpenBraceToken` | Schemas:37 | <code>{</code> |
| `CloseBraceToken` | Schemas:37 | <code>}</code> |
| `JSDoc` | Schemas:41 | <code>/** Where these schemas came from, carried as data for a consumer to assert. */</code> |
| `DotToken` | Schemas:55 | <code>.</code> |
| `OpenBracketToken` | Schemas:81 | <code>[</code> |
| `CloseBracketToken` | Schemas:83 | <code>]</code> |
| `OpenParenToken` | Schemas:80 | <code>(</code> |
| `CloseParenToken` | Schemas:104 | <code>)</code> |
| `EqualsToken` | Schemas:42 | <code>=</code> |
| `LessThanToken` | Schemas:826 | <code>&lt;</code> |
| `GreaterThanToken` | Schemas:826 | <code>&gt;</code> |
| `ConstKeyword` | Schemas:42 | <code>const</code> |
| `TypeKeyword` | Schemas:366 | <code>type</code> |
| `BarToken` | Schemas:367 | <code>\|</code> |
| `SyntaxList` | Schemas:153 | <code></code> |
| `TypeOfKeyword` | Schemas:411 | <code>typeof</code> |
| `AsKeyword` | Schemas:39 | <code>as</code> |
| `InterfaceKeyword` | Tables:136 | <code>interface</code> |
| `ExtendsKeyword` | Tables:871 | <code>extends</code> |
| `SemicolonToken` | Schemas:367 | <code>;</code> |
| `SatisfiesKeyword` | Tables:82 | <code>satisfies</code> |
| `InKeyword` | Tables:82 | <code>in</code> |
| `ImportKeyword` | Schemas:37 | <code>import</code> |
| `FromKeyword` | Schemas:37 | <code>from</code> |
| `AmpersandToken` | Tables:897 | <code>&</code> |
| `AsteriskToken` | Schemas:39 | <code>*</code> |

---

## 4. The trivia and layout facts, measured

### 4.1 `WIDTH = 96` is a budget, not a bound

| file | max line | lines > 96 | widest comment line | width histogram (0 / 1-40 / 41-60 / 61-80 / 81-88 / 89-96 / 97+) |
|---|---:|---:|---:|---|
| Schemas | **590** | 36 | 96 | 67 / 592 / 91 / 190 / 31 / 79 / 36 |
| Tables | 120 | 12 | 97 | 25 / 532 / 112 / 124 / 128 / 3 / 12 |
| Builder | 97 | 1 | 96 | 46 / 265 / 37 / 126 / 6 / 39 / 1 |
| Refusals | **88** | 0 | 88 | 5 / 167 / 59 / 44 / 96 / 0 / 0 |

Three measured consequences, each of which sinks a naive width-bounded printer:

1. **A 590-column line is lawful.** The wrapper is greedy over spaces and a word
   longer than the budget takes its own line rather than being cut
   (`kernel-schemas.ts`, `wrapWords`). The canonical-example strings are JSON
   blobs with no spaces, so they run to 590 columns and are correct.
2. **The width test excludes the trailing comma.** `KernelBuilder:182` is a
   97-column line whose flat literal measures 92 and whose indent is 4:
   92 + 4 = 96 ≤ 96, so it stays flat, and the `,` the caller appends pushes the
   *line* to 97. The predicate is on the rendered node, never on the emitted
   line.
3. **`RefusalKinds` never exceeds 88.** It is written by a different width
   (§4.3, policy D), so "the generated files wrap at 96" is false as a global statement.

### 4.2 The break decision is a per-site table, not one algorithm

Every width test in the three renderers, with its exact predicate and the
measurement that witnesses it. This *is* the layout engine's spec.

| site (generator) | predicate | measured witness |
|---|---|---|
| array literal (`kernel-schemas.ts:140`) | `flat.length + indent.length <= 96` | 108 array literals: 52 flat (max flat+indent 38), 56 broken |
| object literal (`:149`) | `flat.length + indent.length <= 96`, broken form then `.replaceAll(",,", ",")` | 265 object literals: 124 flat (max flat+indent **96, exactly at the bound**), 141 broken |
| `structExpression` (`:350`) | `flat.length + indent.length + prefix <= WIDTH` | `Schema.Struct`: 6 flat, 7 broken |
| `taggedStructExpression` (`:371`) | `flat.length + indent.length <= WIDTH` | `Schema.TaggedStruct`: 28 flat, 15 broken |
| `objectTypeExpression` (`:385`) | `flat.length + indent.length <= WIDTH`, members joined `"; "` | 15 `TypeLiteral`s: 14 flat (max 87), 1 broken (flat width 111) |
| `Schema.Literals` (`:429`) | `flat.length + prefix <= WIDTH` — **no `indent` term** | 2 flat, 3 broken |
| string-literal continuation (`:110`) | `quote(run).length + indent.length <= WIDTH`, runs joined `\n${indent}+ ` | 50 continuation lines, all in Schemas |
| `Schema.Union` (`:453`) | **unconditional break**, one member per line | 7 unions, 0 flat |
| `.annotate({…})` argument | **unconditional break** | 36 `.annotate(` calls in Schemas, **0** of them on one line |
| `canonicalExamples:` / `examples:` arrays (`:595`, `exampleAnnotations`) | **unconditional break**, one element per line | witnessed at Schemas:108–113 — a 46-column array broken at indent 2 |
| `KERNEL_REFUSALS` / refusal rows (`kernel-tables.ts`) | **unconditional break** | 11 two-member objects of flat width 50 broken at indent 2 |

The always-flat heads, for completeness: `Schema.Array` (9), `Schema.UndefinedOr`
(3), `Schema.suspend` (1) — single-argument calls with no break branch at all.

Two properties the Lean printer must inherit rather than clean up:

- **The decision needs its children rendered first.** Every predicate measures
  the *flat rendering of the whole node*, so the printer is a bottom-up fold
  that returns a string and its flat width, not a top-down emitter. This is the
  audit's "sibling-length lookahead", stated as the mechanism.
- **`Schema.Literals` omits the indent term** while every other site includes
  it. That asymmetry is committed in the bytes. Normalizing it moves output.

### 4.3 Doc comments: four policies, not two

| policy | site | rule | measured |
|---|---|---|---|
| A — one-line, **untrimmed** | `kernel-schemas.ts:493` | `/** ${text} */` if no `\n` and length ≤ 96 | 13 one-liners in Schemas, max width 95, **2 of them end `  */`** (the docstring's own trailing space, retained) |
| B — one-line, **trimmed** | `kernel-builder.ts:183` | same, but `text.trimEnd()` | 14 one-liners in Builder, max width 78, **0** ending `  */` |
| C — wrapped block at 96 | `kernel-schemas.ts:499`, `kernel-builder.ts:189` | model line breaks kept; each paragraph greedy-wrapped to `run.length + indent.length + 3 ≤ 96`; every emitted line `.trimEnd()`ed | Schemas widest comment line 96, Builder 96 |
| D — wrapped meaning block at **88** | `kernel-tables.ts:156,182` | `MEANING_COMMENT_WIDTH = 88`, gutter counted in the budget, word-accumulating (not `wrapWords`) | Tables gutter-5 lines max **88** (241 lines), Refusals gutter-5 max **88** (183 lines) |

And one non-policy: `KernelTables:353` is a hand-written one-line doc comment of
**97 columns** that no width test ever saw. A printer that enforces 96
everywhere reds that line.

Policies A and B differ by exactly `trimEnd`. That is slice-A impedance 3 seen
from the TS side, and its positive control in these bytes is two lines:

```
/** A lane partition: the venue-local shard of an evidence stream.  */     (Schemas:545)
/** The closed refusal reasons of the kernel door.  */                      (Schemas:916)
```

Gutter inventory (comment continuation prefixes actually used): `" *"` (blank
comment line), `" * "` at indent 0, `"   * "` at indent 2. Counts per file:
Schemas 12/180/0, Tables 8/45/241, Builder 10/82/97, Refusals 6/27/183.

There are also **line comments**: hand-written section banners, 7 lines in
Schemas and 10 in Builder, none in Tables or Refusals. The banner rule
(`// ---…---`) is exactly **78 columns** — a fourth width, and a literal, so the
printer carries it as one string rather than deriving it.

### 4.4 Strings: escapes, quoting, wrapping

- **Quoting is `JSON.stringify`.** 804 string literals, **all double-quoted**;
  zero single-quoted, zero template literals in expression position.
- **The whole escape inventory across four files** (all of it in Schemas):
  `\"` × 668, `\\` × 77, `\n` × 60, `\t` × 1, `\u0001` × 1. No `\r`, `\b`, `\f`,
  `\/`, `\0`, no `\u{…}`. The `\u0001` is the control-char canon vector
  (Schemas:264, 291) — the one witness that the escaper must handle C0 code
  points as `\u00XX`.
- **Zero non-ASCII bytes inside any string literal**, in any of the four files.
- **Trailing-space retention is real and measurable**: of 50 string-continuation
  lines, **44 end with a space inside the quotes**, e.g.
  `+ "digest of a declaration of a known kind. ",` (Schemas:404). Concatenating
  the runs reproduces the docstring character for character; drop the space and
  the wrapped descriptions stop reproducing their docstrings.

### 4.5 Indentation, blank lines, and the `,,` fixup

- **Two-space indentation, no tabs, in all four files.** Even depths come from
  code (0/2/4/6/8/10 — max depth 10, in Schemas); odd depths (1, 3, 5) are
  comment gutters only.
- **Never two consecutive blank lines**, in any of the four files (blank-line
  runs are all length 1: 67 / 25 / 46 / 5).
- **Zero trailing whitespace** on any line of any file.
- **The `,,` → `,` fixup leaves no trace**: 0 occurrences of `,,` in the output.
  It repairs a double-join inside `kernel-schemas.ts:151` and is invisible from
  the outside — the Lean printer must produce one trailing comma per member and
  needs no fixup at all.

### 4.6 The em dash: exactly six bytes, all in comments

| file | U+2014 sites |
|---|---|
| Schemas | `:2` (plane header) |
| Tables | `:2` (plane header), `:855` (an incarnation-mismatch meaning) |
| Builder | `:2` (plane header) |
| Refusals | `:2` (plane header), `:347` (the same meaning) |

These are the only non-ASCII code points in all four files, and every one of
them survives **verbatim**. See §5.2.

---

## 5. The four impedances, re-measured from the TS side — and a fifth

Slice A's four amendments were derived from the prose target. Three hold for TS
unchanged; one **inverts**; and the measurement adds a fifth.

**5.1 `Field.role` (`brand` | `typeArgument`) — load-bearing, quantified.**
`kernel-tables.ts:114` selects branded sorts by
`type.params.filter((param) => param.role === "brand")`. What that role buys is
`KernelTables:867–936` — the last 70 lines, 7.5% of the file: the `KernelBrand`
interface, `KERNEL_BRANDED_SORTS`, `KERNEL_UNBRANDED_INDEXED_SORTS`, the three
brand-indexed aliases, and the twelve per-kind digest aliases. Without the role
that section cannot be emitted at all, exactly as the charter refresh said.

Sharpening, and a correction to an easy hope: the target carries **34
`TypeParameter` nodes** (22 in Tables, 12 in Builder), but they are *not* the
`typeArgument` role's positive control. Every one of them is a printer-authored
binder — `Kind extends KernelDeclKind`, `Carrier = number`, `Tag extends
string` — emitted by the generator's own brand templates, not walked from a
model binder. Only the `brand` side of the role is exercised by this target. The
slice-A seat's parting observation stands unaddressed: the kernel tree has zero
`type`-role binders, so that spelling still has no standing positive control,
and the one-line probe declaration it proposed (`structure Box (item : Type)
where value : item`) is still the cheapest fix and still belongs on DEV-822.

**5.2 The em-dash transliteration INVERTS for this target.** `Ast.asciiDoc`
maps U+2014 → `--` and refuses any other non-ASCII code point. The four
committed TS files carry U+2014 **verbatim** in six places (§4.6). Applying
slice A's transliteration on the TS path changes six lines and fails parity on
all four files at line 2. The TS printer's doc policy is: **pass U+2014
through**; the ASCII fold belongs to the prose target only. (The refusal half of
`asciiDoc` — report an unnamed code point rather than emit it — is still the
right posture here, since these files carry no other non-ASCII byte and a new
one would be a real event.)

**5.3 `docOf` VERBATIM — confirmed, with a two-line positive control.** §4.3
policy A retains the docstring's trailing space; policy B trims it. Both are
committed. A single global trim policy cannot emit both files. The witnesses are
`Schemas:545` and `Schemas:916`.

**5.4 `renderRef` name erasure — confirmed, and its exceptions enumerated.**
Type positions in the emitted files are unqualified names; the only qualified
spellings in the whole target are 25 `QualifiedName` nodes, all of them either
`typeof X.Type` (the value-type aliases) or `Schema.Codec`, plus 132
`PropertyAccessExpression`s that are runtime references to `Schema.*` and
`Grammar.*`. Erasure-at-rendering is the right seam; the module-qualified
spellings are a printer concern, not an AST one.

**5.5 The fifth, unnamed until now: the trailing newline is per-file.**
`KernelSchemas.generated.ts` ends with `)` and no newline; the other three end
with `\n`. One printer, two behaviours, decided by which artifact is being
emitted. It costs one field on the emission descriptor and is a guaranteed
red-on-day-one if it is left implicit.

---

## 6. The charter sharpening — DEV-812 in mechanical steps

Given the census, the build is transcription, then a fold, then a wall. Steps,
in order, each with its own evidence:

1. **Transcribe the census into inductives.** `TsAst` mirrors §2's 45 spine
   kinds exactly, and they partition five ways with nothing left over:

   | group | n | kinds |
   |---|---:|---|
   | module frame | 5 | `ImportDeclaration`, `ImportClause`, `NamedImports`, `ImportSpecifier`, `NamespaceImport` |
   | declarations | 5 | `VariableStatement`, `VariableDeclarationList`, `VariableDeclaration`, `TypeAliasDeclaration`, `InterfaceDeclaration` |
   | members | 3 | `PropertyAssignment`, `PropertySignature`, `IndexSignature` |
   | expressions | 14 | `Identifier`, `StringLiteral`, `BigIntLiteral`, `NumericLiteral`, `ObjectLiteralExpression`, `ArrayLiteralExpression`, `CallExpression`, `PropertyAccessExpression`, `ElementAccessExpression`, `BinaryExpression`, `AsExpression`, `SatisfiesExpression`, `ArrowFunction`, `Parameter` |
   | types | 18 | `TypeReference`, `LiteralType`, `UnionType`, `IntersectionType`, `TypeLiteral`, `MappedType`, `IndexedAccessType`, `ParenthesizedType`, `TupleType`, `TypeOperator`, `FunctionType`, `TypeQuery`, `QualifiedName`, `TypeParameter`, `TemplateLiteralType`, `TemplateHead`, `TemplateLiteralTypeSpan`, `TemplateTail` |

   5 + 5 + 3 + 14 + 18 = 45. No constructor without a census row; no census row
   without a constructor. Exhaustive matching is what makes "no more" checkable
   at compile time, and the per-file columns say which subset each artifact
   exercises (Refusals 23, Schemas 34, Tables 35, Builder 41).
2. **Pin the terminals.** §3's string table is the acceptance list for the
   keyword and punctuation constructors — 44 terminal kinds, each with a quoted
   occurrence. Write them as a table in one place; the printer reads that table
   and nothing else spells a keyword.
3. **Write the printer as a total fold returning `(text, flatWidth)`.** §4.2's
   predicates all measure the flat rendering of the whole node, so the fold is
   bottom-up and the width is carried, not recomputed. One function per
   constructor, no partiality, no `panic!`.
4. **Encode the layout engine as the §4.2 table, site by site — including its
   asymmetries.** `Schema.Literals` omits the indent term; the unconditional
   sites (`Schema.Union`, `.annotate`, the example arrays, the refusal rows)
   have no width test; the test excludes the caller's trailing comma. The four
   doc policies of §4.3 are four functions, not one parameterized one, and the
   88-column meaning wrap counts its gutter.
5. **Port `JSON.stringify` escaping exactly** (§4.4): double quotes always,
   `\"` `\\` `\n` `\t` `\u00XX` for C0, nothing else — and keep the wrapped
   string runs' trailing spaces.
6. **Emit `KernelTables` + `RefusalKinds` first, `KernelBuilder` second,
   `KernelSchemas` last.** Refusals is the smallest closed vocabulary (23 kinds,
   370 lines, one doc policy, zero escapes, 88-column wrap) and it shares its
   generator with Tables, so one generator port covers two files. Schemas is
   last because it alone carries the string wrapping, the 590-column lines, the
   whole escape inventory, the `,,` site, and the missing trailing newline.
7. **The wall is §1, file by file: regenerate, `sha256`, compare.** Not a diff
   of a normalized rendering — the committed hash. A divergence is a finding
   with the two byte offsets quoted, never an overwrite of the committed file.
8. **The mutation arm rides the printer, not the output.** Each of §4.2's
   predicates and §4.3's four policies is one sed-able constant; flipping `96`
   to `95`, deleting the `Schema.Literals` asymmetry, applying `asciiDoc` on the
   TS path, or trimming policy A must each move bytes and be restored
   byte-identically — the shape slice A's own `run.sh` arms already use.

**Placement, unchanged by any of this:** ruling A3 puts the printer in
`verify/unity` beside `EmitMain` (which owns the corpus data) and leaves
`ProjectionAst` in `verify/projections`. Nothing measured here argues with that;
§5.2 reinforces it, since the TS doc policy and the prose doc policy are
different functions and should not share a module.

---

*Collected by the mac prep lane (TsAst artifacts), read-only at the pin. The
measuring scripts were worktree-local and are not committed; every number above
is reproducible by parsing the four files with `typescript-five` at
`c0b5b690`.*
