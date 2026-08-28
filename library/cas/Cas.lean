import Cas.Nat32
import Cas.Bytes
import Cas.Node
import Cas.Codec
import Cas.Store
import Cas.Address
import Cas.Separation
import Cas.Admission
import Cas.Json
import Cas.Refs
import Cas.Lang
import Cas.Examples
/-!
# Cas — the type model of the content-addressed store library

The Lean model of `@foldlab/cas`, grown module by module against the
TypeScript shape:

- `Nat32`, `Bytes` — wire scalars and framed byte primitives, each
  codec law carrying both directions (forward and exactness).
- `Node` — the carriers: full-width addresses, typed references, the
  versioned node, byte-bound well-formedness.
- `Codec` — one byte representation per admitted node.
- `Store`, `Address`, `Admission` — the store as a value, the abstract
  address function on its hash-hypothesis lattice, and the clause-named
  admission judgment (sound and complete) whose closed stores can
  dangle nothing and mis-kind nothing.
- `Json`, `Refs` — the canonical value encoding, the typed-reference
  marker grammar (CAS-005) with its executable law, and `Root α`: the
  typed root whose dereference is total over closed stores.
- `Lang` — the effects language over the store: programs as operation
  trees, one-step interpretation with admission, fueled runs. The
  original seed of this package, kept as the semantics playground.

The retired dual-lane conformance corpus (effects-model@0.3.0) lives at
`library/effects/archive/`; this package models types first and grows
with the library.
-/
