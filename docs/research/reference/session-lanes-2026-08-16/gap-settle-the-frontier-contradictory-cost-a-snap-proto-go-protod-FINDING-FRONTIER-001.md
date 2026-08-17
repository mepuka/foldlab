# FINDING-FRONTIER-001 — the partial grammar has no per-hole kind distinction

Task 28 stopped before its requested red regression and production change.
The regression requires two holes with different expected grammar kinds, but
`flb.type.partial.v0` currently has only one hole-bearing nonterminal: `T`.

## Minimized counterexample to the ticket premise

These are the smallest root and struct-field partials:

```json
{"k":"hole"}
{"k":"struct","fields":{"name":{"k":"hole"}},"optional":[]}
```

The first hole has path `[]`; the second has path `["fields","name"]`.
Despite the different paths, both holes occupy `T`. `walkStruct` passes the
field *value* to `walkNode`, and `replaceTypeNode` likewise descends through
`fields/<name>` to replace that value. The field name is a JSON object key;
the grammar supplies no value or path at which a field-name hole can exist.

Consequently, replacing either hole with any well-formed `T` is admitted by
the same `walkPartial` rule. The existing TypeScript C4 property makes this
explicit by requiring every final v0 kind at every generated hole position,
and the wire contract says that all final v0 kinds are advertised. There is
no truthful red test that can require these two `Legal` kind sets to differ.

## Conflicting authority

- `proto/SPEC.md` declares `fields` as `{<name>:T,...}` and the concierge
  implementation recognizes only the untyped node `{"k":"hole"}` at `T`.
- `proto/wire/CONTRACT.md` calls `fields/<name>` a type-node path and says all
  final v0 kinds are advertised.
- Ticket 003's later amendment says `opaque` upgrades to a *typed hole*, but
  it does not define a typed-hole representation, field-name holes, their
  paths, their fill domain, or their identity/addressability rules.
- Task 28 forbids adding grammar machinery and orders a stop if derivation
  exposes a grammar ambiguity.

## Disposition required

The coordinator must ratify one grammar before implementation resumes:

1. Keep holes only at `T`. Then legal *kinds* are path-invariant and issue #19's
   premise is withdrawn or narrowed to context-sensitive examples/completions.
2. Add typed metadata holes (including a representation for field names),
   with paths and enumerable fill domains. This is new grammar machinery and
   cannot be invented by Task 28.
3. Define legality as “admits a closed completion” rather than Task 28's
   stated immediate `type.fill` acceptance. This also needs the certifier and
   completeness domain specified before a regression can be honest.

No production or TypeScript mirror code was changed.
