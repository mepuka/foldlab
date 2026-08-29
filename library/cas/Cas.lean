import Cas.Codec.Nat32
import Cas.Codec.Bytes
import Cas.Core.Node
import Cas.Codec.NodeCodec
import Cas.Codec.Separation
import Cas.Codec.Sha256
import Cas.Core.Store
import Cas.Core.Address
import Cas.Core.Canonical
import Cas.Core.Canonicalize
import Cas.Core.Admission
import Cas.Values.Digits
import Cas.Values.Json
import Cas.Values.JsonInj
import Cas.Values.JsonParse
import Cas.Values.Markdown
import Cas.Values.Refs
import Cas.Values.Canonicalize
import Cas.Codec.Hex
import Cas.Schema.Schema
import Cas.IR.Word
import Cas.Grammar.Grammar
import Cas.Lang.Lang
import Cas.Lift.Manifest
import Cas.Vectors.Vectors
import Cas.Architecture

/-!
# Cas — one language, three layers, over a content-addressed store

The Lean home of `@foldlab/cas`: the type model of the store library
and the language it interprets. Modules are laid out by direction of
abstraction, lowest first, and imported above in that order.

- **`Codec/` — layer 1, the byte grammar.** Wire scalars
  (`Nat32`), framed primitives (`Bytes`), the canonical node codec
  (`NodeCodec`: forward correctness, image exactness,
  non-malleability), domain separation of the leading bytes
  (`Separation`), and the executable FIPS 180-4 digest (`Sha256`).
- **`Core/` — the store semantics.** The carriers (`Node`), the store
  as a partial map with `Closed` well-formedness (`Store`), the
  abstract address function on its hash-hypothesis lattice
  (`Address`), the CAS typeclass — canonical content with derived
  addressing and the lattice lifted generically (`Canonical`) — and
  the sound-and-complete admission judgment with the characterized put
  transition (`Admission`).
- **`Values/` — the typed projection plane.** The canonical JSON
  printers (`Json`), the decimal spelling inverted with `Nat.repr`
  injectivity (`Digits`), the rendering's injectivity direction
  (`JsonInj`), the strict parser that proves it — accepting exactly
  the rendering's image, with adequacy and exactness (`JsonParse`) —
  and the typed-reference marker grammar with `Root α` (`Refs`).
- **`IR/` — the store word.** Named `Binding`s in children-first
  admission order, non-empty and proof-bearing admitted wrappers,
  `wf`, and the bridge `toStore` with `wf_toStore_closed` (ledger L1).
- **`Grammar/` — layer 2, the data grammar.** Sorts with wire tags,
  the indexed `Tree` family elaborating onto `Node` through the real
  codec, the content address as a fold under abstract `H`, `flatten`
  with its Level-1 admission law (L2–L4), and the term-level surface
  syntax.
- **`Lang/` — layer 3, the program grammar.** Effect signatures as
  values composing by sum, `Prog` as the free monad of continuations,
  the store language and the LLM extension (`infer`), one-step
  interpretation that CALLS the admission judgment (L5–L7), and the
  grammar term as a store program with `putTree_correct` (F1): the run
  computes exactly the elaboration's address and store, deduplicating
  shared subterms through `put`'s duplicate outcome (F2).
- **`Lift/` — the read face.** The effect-lift lane's first-order
  data: the closed refusal taxonomy with its spectrum (`Taxonomy`)
  and the v0 rule manifest (`Manifest`) — the R11 interchange
  document both recognition engines consume, emitted by the
  `emitlift` executable. Reading never mints identity (the direction
  law); the lane's engines and gates live with the TypeScript twin.
- **`Vectors/` — the registered replay surface.** Checked names,
  non-empty words, runtime-admitted vectors, unique-name registries,
  and named wire records. `Cas.Vectors.Schema` derives their canonical
  schema and TypeScript/Effect Schema correspondence; the `vectors`
  executable serializes only the checked registry.
- **`Architecture`** — the library described in itself, pinned against
  the TypeScript twin through one canonical matrix.

Consumers live in the separate `CasExamples` library (`examples/`):
the language used, never part of the language. F1 (`putTree_correct`)
and F2 (word deduplication: `toStore_append_shadowed`,
`Honest.no_alias`) are proved; the remaining named follow-up is
F3 defunctionalized continuations (steps as store-admissible
content).
-/
