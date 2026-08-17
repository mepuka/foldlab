# FINDING-ACCEPTANCE-WIDTH-001 — derived records do not have one width language

Status: **OPEN — findings before fixes.** [GitHub issue #45](https://github.com/mepuka/foldlab/issues/45)
and its owner sharpening are the authority report. No generator, ingress path,
coordinator spec, wire contract, or frozen fixture is changed here.

## Minimized witness

The test asks a live `contract.describe` for its ingress-frame structure, then
uses that exact public value to derive every target. It creates the string type
and presents this one otherwise-lawful frame:

```json
{
  "type": "<the daemon-derived digest of {\"k\":\"string\"}>",
  "payload": "ok",
  "evidence": "kept"
}
```

The extra key is not hypothetical. D5 and `proto/wire/CONTRACT.md` say that
keys beyond `type`/`payload` are admitted as content and enter the frame's
canonical journal bytes.

| public face | executed observation | width semantics |
| --- | --- | --- |
| generated JSON Schema | the live contract-derived schema has `type: "object"`, no `evidence` property, and `additionalProperties: false` | the JSON Schema keyword normatively refuses the witness |
| generated Effect Schema | `Schema.decodeUnknownResult` succeeds and returns only `payload` and `type` | accepts and strips the extra key |
| generated Go source | the emitted struct is compiled, then a real `encoding/json.Unmarshal` + `Marshal` process succeeds and returns only `payload` and `type` | accepts and ignores the extra key |
| protod ingress | a real request/reply publish succeeds; verified `journal.read` returns canonical bytes still containing `evidence` | accepts and preserves the extra key as content |

The sensitivity control removes only `evidence`; all four observations then
agree. The finding therefore depends on the excess key rather than an inert
comparator or a broken daemon harness.

## Reproduce

Default gates run the sensitivity control and skip the intentionally red law:

```text
cd proto/ts
bun test test/acceptance-width.finding.test.ts
```

PowerShell opt-in reproduction:

```powershell
cd proto/ts
$env:FOLDLAB_FINDING_ACCEPTANCE_WIDTH = "1"
bun test test/acceptance-width.finding.test.ts
Remove-Item Env:FOLDLAB_FINDING_ACCEPTANCE_WIDTH
```

The last equality assertion fails with three semantic outcomes: refusal;
acceptance with the extra key removed (Effect/Go); and acceptance with the
extra key preserved (protod).

## Evidence bound

Neither the root nor proto TypeScript dependency graph licenses an independent
JSON Schema validator. The JSON Schema row is therefore **not** claimed as an
executed validator result. It is the exact, bounded consequence of inspecting
the emitted top-level object schema: the known fields are otherwise valid, the
only unlisted field is `evidence`, and draft-2020-12
`additionalProperties: false` refuses it. Effect, Go, and protod are executed
at their public seams. This witness proves the concrete contract-described
ingress-frame disagreement; it is not the universal L-ACCEPT wall proposed by
the codegen design.

## Ratification required: one width semantics

1. **Open with a declared rest — recommended.** Extend the owned structure so
   a record explicitly declares its additional-property value type and
   preservation policy. JSON Schema can emit a typed `additionalProperties`;
   Effect must preserve and decode the rest; Go needs a representation/custom
   codec that retains it; ingress keeps D5's canonical content. This is the
   only candidate that preserves D5's existing frame-content constraint
   without silent loss. It is nevertheless a load-bearing grammar and identity
   change: `flb.type.v0`, normalization/scheme behavior, the certifier,
   derivation targets, inference, and authorized fixtures all need coordinated
   treatment. D5 alone does **not** ratify that general record language.
2. **Closed and refuse.** A struct admits exactly its declared keys. Generated
   Effect/Go decoders and protod ingress must refuse the witness, which would
   explicitly supersede D5 and change which frame bytes may enter a journal.
3. **Open and ignore.** A struct accepts undeclared keys but they have no typed
   meaning and are discarded consistently. JSON Schema becomes open and
   Effect/Go already approximate the policy, but protod must stop committing
   the extra content. That also supersedes D5 and changes frame identity.

No option is a local codegen preference. The operator must choose the record
language once; the certifier, generators, and future inferrer then implement
that choice and the eventual L-ACCEPT wall enforces it.

## Not repaired

- `toJsonSchema` still emits `additionalProperties: false`.
- `toEffectSchema` still emits the pinned `Schema.Struct` default.
- `toGoSource` still emits a plain tagged struct.
- protod still admits and preserves extra frame keys, as D5 requires.
- `proto/SPEC.md`, `proto/wire/CONTRACT.md`, and frozen fixtures are untouched.
