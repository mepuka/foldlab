import Cas.Schema.Ast
import Cas.Schema.El
import Cas.Schema.Codec
import Cas.Schema.Described
import Cas.Schema.Foreign

/-!
# The schema plane — layer above the values, root of the hierarchy

The canonical schema as a universe: codes (`Ast` — the Lean twin of
the TypeScript v0 constructor set), denotation (`El` — a code is a
type), and the generic codec with its laws proved once over all codes
(forward under canonical fields, exactness unconditionally,
injectivity). `Described` attaches ordinary Lean carriers to codes by
an explicit equivalence; `Foreign.RepresentedIn` attaches the decoded
and encoded target-language types plus their codec surface. Nothing
stands above these codes; Effect Schema carries them at runtime, and
every future tree type is meant to arrive through a described code.

Named increments, in order:

- **Recursion** — named definition environments (the shape tree-sitter
  `node-types.json` and JSON Schema `$defs` actually have), with
  conformance as an inductive predicate and a fueled sound-and-complete
  checker: the admission pattern applied to schemas.
- **Deriving extension** — the opt-in `Cas.Schema.Deriving` module
  generates `Described` instances for non-recursive structures while
  leaving compiler metaprogramming outside this runtime facade.
- **Self-description** — the codes' own schema as a schema value, and
  the byte-level rendering theorem (sorted canonical fields) binding
  `encode` to `Json.renderCompact` and the store's envelope.
-/
