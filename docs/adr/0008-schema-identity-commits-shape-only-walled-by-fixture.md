# Schema identity commits shape only, and the representation is walled by fixture

A schema is its transformation pair (CONTEXT.md), but its IDENTITY — the
structural digest — commits the shapes of the two sides and nothing between
them. Every other semantic bit lives on a tier its author chooses: a check
is shape (narrowing the domain moves identity — proven live when bounding
WireEvent's `seq` moved every dependent mint digest); an annotation is a
claim (stripped, free); a binding is a claim promoted to fact by a law
(ADR-0004). Behavior is NOT special: getter behavior, brands, and
constructor defaults are all claims — `String→String(toUpperCase)`,
`String→String(toLowerCase)`, `String<brand A>`, `String<brand B>`, and bare
`String` are ONE schema (verified, 2026-08-12) — and a domain that wants
behavior committed does it through a binding whose checker is the probe law,
never by folding a probe corpus into identity ("a type on two subjects is
one type" must survive).

The digest preimage, however, is downstream of the pinned beta:
`structuralDigest` hashes `SchemaRepresentation.toJson` output from
effect@4.0.0-beta.107, so a representation change in any later beta silently
moves every schema digest — the exact event the fence exists to prevent, and
a hole in ADR-0006's "never a registry entry or a digest". Therefore the
wall discipline applies: `fixtures/schema-wall.json` (generated once by
`scripts/schemafix.ts`, frozen) pins the digests of an adversarial battery —
registered/unique symbols, recursion, declarations, checks, and the
forgiveness set — and `test/schema.identity.wall.test.ts` pins the SEMANTICS
as laws (brands/getters/defaults collide with bare by law; checks move
identity; local symbols refuse with `representable`, never collide;
annotations never move anything). A red wall at a beta bump is a deliberate
re-pin decision under `foldlab.schema.v2`, never a fixture edit. The
foldlab-owned canonical schema encoding — the identity fold over the AST,
independent of any library's serialization — is the named derivation target,
and becomes mandatory the day a non-TS runtime must verify a schema digest.
Rejected: version-scoped digests (gives up one-schema-one-digest, the
invariant the ontology stands on).
