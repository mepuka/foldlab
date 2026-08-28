import Cas.Schema.Ast
import Cas.Schema.El
import Cas.Schema.Codec
import Cas.Schema.Described
import Cas.Schema.Foreign
import Cas.Schema.SelfCodec

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
- **Self-description** — LANDED (2026-08-28): `SelfCodec` carries the
  codes' JSON projection, the schema-node envelope, and the canonical
  payload, cross-pinned byte-for-byte against the TypeScript
  `CanonicalSchema.payloadOf` (`lake exe schemas --check` +
  `test/CanonicalSchemaPin.test.ts`). The byte-level rendering
  theorem is PROVED: `encode_canonical`/`renderCompact_encode`
  (`Codec/Laws/Render.lean`) show the encode image is canonically
  spelled and the canonical rendering performs no reordering on it,
  `toJson_canonical`/`payload_renderPlain` bind the schema payload the
  same way, and `ofJson_toJson`/`toJson_inj` make the projection a
  proved round trip — one code per payload value. The one direction
  still open, named precisely: injectivity of the canonical rendering
  itself (bytes determine the canonical value — the verified-parser
  argument); until it lands, byte-equality of payloads is evidence
  through the value plane, not a standalone theorem.
-/
