# Schema identity is structural; bindings live in the registry, annotations only author them

A schema's digest is computed from its type structure alone — deployment
facts (NATS subject, codec, correlation key, commutativity class) never
move it, because a type deployed to two subjects is one type. Each binding
is its own registry record `{schemaDigest, bindingClass, params,
lawResult}`, committed only after its checker passes (commutes → swap
test; codec → round-trip-preserves-head; transport → conformance harness).
Schema annotations remain the authoring surface: mint() extracts the
claim, runs the law, commits the fact. The rejected alternative —
self-contained schemas carrying bindings in annotations — either muddies
identity (annotations in the digest) or leaves bindings as un-refereed
prose riding on a verified type (annotations outside it), which is exactly
the hole the minting fence exists to close.
