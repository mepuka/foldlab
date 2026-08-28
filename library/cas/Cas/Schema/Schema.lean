import Cas.Schema.Ast
import Cas.Schema.El
import Cas.Schema.Codec

/-!
# The schema plane — layer above the values, root of the hierarchy

The canonical schema as a universe: codes (`Ast` — the Lean twin of
the TypeScript v0 constructor set), denotation (`El` — a code is a
type), and the generic codec with its laws proved once over all codes
(forward under canonical fields, exactness unconditionally,
injectivity). Nothing stands above these codes; Effect Schema carries
them at runtime, and every future tree type is meant to arrive as
`El` of a code, never as a new hand-written inductive.

Named increments, in order:

- **Recursion** — named definition environments (the shape tree-sitter
  `node-types.json` and JSON Schema `$defs` actually have), with
  conformance as an inductive predicate and a fueled sound-and-complete
  checker: the admission pattern applied to schemas.
- **Deriving** — a `Described` typeclass (a native Lean type paired
  with its code and validation laws) with deriving handlers for
  structures and inductives, so ordinary types prove their own
  validation; prior art: predictable-machines/lean4-json-schema's
  `deriving ValidatesAgainstSchema`, re-aimed at these codes.
- **Self-description** — the codes' own schema as a schema value, and
  the byte-level rendering theorem (sorted canonical fields) binding
  `encode` to `Json.renderCompact` and the store's envelope.
-/
