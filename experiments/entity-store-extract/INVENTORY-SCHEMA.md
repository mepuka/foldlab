# inventory.json — the generator contract (schemaVersion 1)

Status: staged, pre-grade — 2026-08-25. This is the FIRST committed artifact of the
extractor lane and the contract Stage 2 (the generator) builds against. It freezes
now; any change bumps `schemaVersion` and is a declared amendment, never a silent
edit. A hand-checkable sample lives at `sample-mini-inventory.json`.

## Shape

```
{
  schemaVersion: 1,
  source: {
    repository, commit, package,
    files: [{ path, gitBlobSha1 }]          // repo-relative; the only identity used
  },
  extractor: {
    name, instrument, instrumentVersion, mode,
    nameTables: { closureBearing: [..], derivedCache: [..] }   // the declared tables
  },
  counts: { variants, unionAlias, guardTags, representationUnion, runtimeArray },
  baseFields:  [Field],                     // from `abstract class Base` (SchemaAST.ts:636)
  variants:    [Variant]                    // sorted by variant name
}

Variant = {
  variant,          // class name (= census §7 item 2)
  tagLiteral,       // the readonly `_tag` string literal (item 3)
  unionIndex,       // 0-based position in the `AST` union alias (item 1; source order)
  declLine,         // 1-based line of the class declaration
  tagDeclLine,
  fields:     [Field],                      // declaration order, `_tag` excluded
  ctorParams: [{ name, typeText, optional, hasDefault }]
}

Field = {
  name,
  typeText,         // VERBATIM source syntax — generics uninstantiated (e.g. Union.types
                    // is `ReadonlyArray<A>`); consumers needing instantiated types
                    // consult the union alias, never re-derive from typeText
  kind,             // "data" | "closure" | "closure-bearing" | "derived-cache"
  kindBy,           // "syntax" (items 1-4: no checker, no tables)
                    // | "name-table" (item 5: the declared closureBearing/derivedCache
                    //   tables echoed in extractor.nameTables — resolution-derived)
  declLine,
  optional          // `?` token or `| undefined` in the type text
}
```

## Deliberate extensions beyond the census §7 sketch

The census proposed `{variant, tagLiteral, declLine, fields:[{name,typeText,kind,declLine}]}`.
Extensions, each with its reason:

| Extension | Why |
|---|---|
| `source` block with git blob SHA-1s | the inventory is meaningless without its pin; blob SHA-1 is the ONLY digest used (the lock's bytes/sha256 are known-wrong, CRLF defect) |
| `extractor` block incl. `nameTables` | the name tables are trusted inputs; echoing them makes the trust surface inspectable in the artifact itself |
| `counts` | the four-way cross-check result, recorded so consumers can re-assert without re-parsing |
| `unionIndex` | variants are SORTED by name for determinism; the union alias's source order is a fact of the pin and must survive the sort |
| `baseFields` separated | base fields are shared by all 21; repeating them per-variant would invite drift between copies |
| `ctorParams` | census §7 item 4: arity/ordering/defaults are constructor facts, not property facts |
| `kindBy`, `optional` on Field | syntax-derived vs table-derived facts must be distinguishable (the brief's shape-not-semantics rule) |
| `_tag` in `baseFields` | Base declares `abstract readonly _tag: string`; recorded once as the abstract member; concrete literals live per-variant in `tagLiteral` |

## The correspondence contract (A-1 affordance — read before consuming)

**No bijection is assumed between the 21 inventory variants and the Lean carrier's
constructors, in either direction.**

- Model-side constructors with no Effect counterpart exist NOW (`ref`, `var`, `mu`
  replace `Suspend`; the census's admission analysis maps them) and MORE ARE RATIFIED
  (`Value.vaddr` + an address-type schema node, KICKOFF §17 A-1).
- The correspondence gate direction is: **every inventory variant is accounted for**
  in an admission map (`admitted` → model constructor(s) | `deferred` | `rejected`,
  each with a reason code), and **model-side extras are listed explicitly** in a
  declared extensions list — never inferred, never silently exempted.
- The admission map and extensions list are Stage-2/ACC artifacts (see `ACC-SPEC.md`),
  versioned beside this contract. A generator MUST fail when either file does not
  cover its input, and MUST NOT synthesize coverage.

## Non-claims

The inventory records **shape, not semantics** (census §7 verdict). The union type is
closed; the semantics are open through four escape hatches (Declaration.run, the
annotation bag, encoding transformations, filter closures) — all four are visible in
the inventory only as `closure`/`closure-bearing` kind markers. Nothing here claims
coverage of what those closures do. Facts marked `kindBy: "name-table"` depend on the
declared tables, not on type resolution; the tables are part of the trusted seam.
Claims resting on `SchemaRepresentation.ts` internals stay G0-pinned-by-census until
the seven owed provenance pins land (KICKOFF §17).

## Regeneration

```
bun run src/extract.ts            # reads the src-cache, verifies pins, writes inventory.json
bun test                          # gates: pins, four-way agreement, count trap, determinism, drift
```

One command, byte-stable output, drift caught by the committed-copy test (and later by
`mise run gen` + `git diff --exit-code` when promoted). No hand edits, ever.
