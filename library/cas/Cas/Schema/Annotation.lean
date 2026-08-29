import Cas.Schema.Notation

/-!
# The sidecar annotation kind (stipulation S2)

Annotation content is STORE CONTENT. The carrier `Ast` gains no
annotation field — that would ripple every codec, canonicality, and
round-trip proof in the plane for data the kernel never inspects — so
an annotation is its own described kind whose SUBJECT is a typed store
reference to a schema node (kind tag `0x53`). The DAG carries as many
of them as wanted: "twenty encoded other schemas" is twenty annotation
nodes, or twenty addresses carried in their values.

One annotation node says one thing about one schema:

- `subject` — the schema being annotated, addressed, never inlined.
  Stipulation S4 holds by construction here: the edge references the
  schema AS a schema, not a concrete instance of it.
- `key` — the `foldlab/...` annotation key this node carries. String
  keys only: symbol-keyed annotations are dropped at persistence and
  code generation on the Effect side, so the persistent namespace is
  the slash namespace and nothing else.
- `value` — the encoded content, as a string. A content address in
  hex when the value is itself store content; that is how an
  annotation carries another schema rather than a scalar.

At projection time the materializer folds sidecar annotations into the
representation-level annotation bags where Effect persists them. The
carrier stays small and fully proved; the annotation surface stays open
by design.

Like `Cas.Schema.Notation`, this module keeps compiler metaprogramming
an opt-in import — the schema emitter and the mirrors import it; the
runtime facade does not.
-/

namespace Cas.Schema

open Cas.Schema.Notation

/-- One sidecar annotation on one schema: the addressed subject, the
`foldlab/...` key it carries, and its encoded value. -/
cas_struct Annotation where
  key : String
  subject : StoreRef schemaKindTag
  value : String

end Cas.Schema
