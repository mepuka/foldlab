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
import Cas.IR.Join
import Cas.IR.Column
import Cas.IR.View
import Cas.Grammar.Grammar
import Cas.Grammar.Judge
import Cas.Grammar.Rewriter
import Cas.Grammar.JudgeRate
import Cas.Lang.Lang
import Cas.Lang.RefusalMap
import Cas.Lift.Manifest
import Cas.Lift.Decode
import Cas.Vectors.Vectors
import Cas.Backend.HttpProfile
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
- **`Schema/` — the schema plane, root of the type hierarchy.** The
  canonical schema as a universe: codes (`Ast` — the Lean twin of the
  TypeScript v0 constructor set, with `WF` the store's admission
  discipline over them), denotation (`El`), and the generic codec
  whose laws are proved once over all codes. `Described` and
  `Foreign.RepresentedIn` attach Lean and target-language carriers to
  a code by an explicit equivalence; `Declarations` is the extension
  allowlist as first-order data, and `Ingest.ingest` is THE door —
  normalize, decode the revision-1 envelope, gate on `Ast.wf` — with
  named refusals, soundness (`ingest_wf`), and exactness on the
  canonical image (`ingest_envelope`). `SelfCodec` carries the plane's
  own self-description: revision-1 canonicality holds
  unconditionally, with the round trip and injectivity
  (`ofRepresentationJson_toRepresentationJson`,
  `toRepresentationJson_inj`) stated modulo the one literal-null
  collapse `Ast.repNorm` names (register R13), and
  `PayloadInj.payload_inj` carries injectivity down to the schema
  node's own bytes. The payload is byte-pinned against the TypeScript
  `CanonicalSchema` by `lake exe schemas --check`. Nothing stands
  above these codes: Effect Schema carries them, never authorizes
  them.
- **`IR/` — the store word.** Named `Binding`s in children-first
  admission order, non-empty and proof-bearing admitted wrappers,
  `wf`, and the bridge `toStore` with `wf_toStore_closed` (ledger L1).
- **`Grammar/` — layer 2, the data grammar.** Sorts with wire tags,
  the indexed `Tree` family elaborating onto `Node` through the real
  codec, the content address as a fold under abstract `H`, `flatten`
  with its Level-1 admission law (L2–L4), the term-level surface
  syntax, and the grammar manifest — the sort table as first-order
  data, every form carrying a `Tree` witness its layout is read off,
  emitted by the `emitgrammar` executable as the front ends' JSON and
  as `REGISTRY.md`.
- **`Lang/` — layer 3, the program grammar.** Effect signatures as
  values composing by sum, `Prog` as the free monad of continuations,
  the store language and the LLM extension (`infer`), one-step
  interpretation that CALLS the admission judgment (L5–L7), and the
  grammar term as a store program with `putTree_correct` (F1): the run
  computes exactly the elaboration's address and store, deduplicating
  shared subterms through `put`'s duplicate outcome (F2). `Fragments` is
  doc-only: the FRAGMENT TOWER, the interop reference model — the ladder
  `PProg ⊂ the guarded table ⊂ Prog` ordered by expressive power, each
  rung with its static-analysis status, store encoding, handler set, and
  agreement theorems by name, and what another effect system may assume
  when it consumes one. It is orthogonal to `Tower`, which is the
  vertical SERVICE tower. `RefusalMap` is the CORRESPONDENCE: the
  refusal clause that crosses the boundary, joined row by row to the
  TypeScript `CasError` family, with the host tag the model
  deliberately lacks declared host-only rather than left out, and
  totality proved in both directions.
- **`Lift/` — the read face.** The effect-lift lane's first-order
  data: the closed refusal taxonomy with its spectrum (`Taxonomy`),
  the v0 rule manifest (`Manifest`) — the R11 interchange
  document both recognition engines consume, emitted by the
  `emitlift` executable — and the DOOR (`Decode`), which reads the
  recognizer's canonical lift document back as a `PProg` and stops
  there: a document carrying a word is refused by name. Reading never
  mints identity (the direction law); the lane's engines and gates
  live with the TypeScript twin.
- **`Vectors/` — the registered replay surface.** Checked names,
  non-empty words, runtime-admitted vectors, unique-name registries,
  and named wire records. `Cas.Vectors.Schema` derives their canonical
  schema and TypeScript/Effect Schema correspondence; the `vectors`
  executable serializes only the checked registry.
- **`Backend/HttpProfile` — the wire face.** `cas-http/0` as data: the
  path grammar of the three reserved resource spaces, the profile
  header, the status alphabet, the canonical key-list framing, the
  capability envelope's byte layout, the presence alphabet, and §12's
  blob node shapes — every row citing the section of
  `library/effects/PROFILE-CAS-HTTP-0.md` it reads, and the places the
  wire law and the store model already agree (address width, blob kind
  tags, scheme version) stated as theorems rather than left as two
  tables. It is the only `Backend/` module the root imports: the rest
  of that directory is the TypeScript target plane, elaborated as its
  own library. The manifest DECLARES and does not yet model exchange
  semantics.
- **`Architecture`** — the library described in itself, pinned against
  the TypeScript twin through one canonical matrix.

Consumers live in the separate `CasExamples` library (`examples/`):
the language used, never part of the language. F1 (`putTree_correct`),
F2 (word deduplication: `toStore_append_shadowed`, `Honest.no_alias`),
and F3 (defunctionalized continuations, `Lang/Defun.lean`) are all
proved. F3's state: a straight-line program is a finite table of
first-order code points, `runP_embed_agree` ties the direct
interpreter to what the table denotes, `encodeProg`/`decodeProg` lay
that table down as store content and read it back
(`decodeProg_encodeProg`, with `decodeLine_encodeLine` and the
exactness lemmas beneath it), and
`runP_decodeProg_encodeProg`/`ObsEq_decodeProg_encodeProg` say a table
recovered from its own content runs identically and denotes an
observationally equal program — the program IS content, as a theorem.
The table's STATIC ANALYSIS landed with it: `PProg.envelope` reads the
reachable address set, the put shapes and the answer-index dataflow off
the table alone, and the sandwich bounds every run inside it — with the
two places the bound is not tight (the suffix after a first refusal, and
`put`'s duplicate outcome) exhibited rather than asserted.
What is still owed there is registry, not proof: wire tags 14 and 15
(`step`, `cont`) remain RESERVED rows spelled outside `Ty`, pinned to
`REGISTRY.md` by `#guard`, and ratifying either into `Ty` is its own
slice.
-/
