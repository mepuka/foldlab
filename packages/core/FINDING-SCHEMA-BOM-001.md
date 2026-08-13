# FINDING-SCHEMA-BOM-001 — fatal UTF-8 still strips a leading BOM

## Minimized witness

Run the opt-in red public Schema wall:

```text
$env:FOLDLAB_RUN_SCHEMA_BOM_FINDING='1'
bun test packages/core/test/schema.wall.test.ts
```

The independent Go probe emits two events with equal stream and sequence but
different payload bytes:

- `ef bb bf` (the valid UTF-8 encoding of U+FEFF)
- the empty byte string

Go computes distinct heads. `decodeFrame` admits both but the pinned runtime's
`new TextDecoder("utf-8", { fatal: true })` strips the leading BOM by default,
so both become `payload: ""` and the TypeScript-side recomputation cannot
preserve the Go head.

## Decision required

1. **Recommended:** set `ignoreBOM: true` on this payload decoder so BOM bytes
   decode to U+FEFF and the text view is byte-faithful over valid UTF-8. Keep
   the Go-origin BOM/empty pair as a permanent discriminating control.
2. Explicitly exclude a leading UTF-8 BOM from `WireEvent`'s text domain and
   return a typed refusal. This is lossless but narrows the otherwise stated
   Unicode-scalar domain.
3. Keep BOM stripping. This contradicts the canonical/constrained-decode law
   and is not recommended.

No BOM repair is applied before disposition; the opt-in witness remains red.
