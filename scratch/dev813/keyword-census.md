# DEV-813 prep: the keyword census

The committed sketch `verify/kernel/projections/tools.schema.json` uses **ten
distinct JSON-Schema keywords, 144 occurrences**. That is the closed vocabulary
a direct printer over `ProjectionAst` must emit, and nothing beyond it.

Measured by `scratch/dev813/extract.py` over the parsed object graph, counting a
key only in schema position; the file's own envelope keys are counted
separately.

| keyword | count | where it appears |
| --- | ---: | --- |
| `type` | 46 | every schema node: 30 `string`, 9 `object`, 7 `integer` |
| `description` | 34 | one per field, on every field except `refusal_result.reason` and `refusal_result.applicability` |
| `pattern` | 14 | 13 digest fields plus `digest_format` |
| `additionalProperties` | 9 | 8 tool input schemas plus `refusal_result`; always `false` |
| `properties` | 9 | same 9 objects |
| `required` | 9 | same 9 objects |
| `maximum` | 7 | the 7 integer fields |
| `minimum` | 7 | the 7 integer fields |
| `enum` | 6 | 2 kinds, production, stage, reason, applicability |
| `$comment` | 3 | file header, `digest_format`, `refusal_result` |

`type` takes exactly three values: `string` (30), `object` (9), `integer` (7).
No `number`, no `boolean`, no `array`, no `null`.

## The envelope

The file is an MCP tool-list frame, not a schema. Four envelope keys carry it,
and a printer emits them as structure rather than as JSON-Schema vocabulary:

| envelope key | count |
| --- | ---: |
| `$comment` (file header) | 1 |
| `digest_format` | 1 |
| `tools` | 1 |
| `refusal_result` | 1 |
| `tools[].name` | 8 |
| `tools[].description` | 8 |
| `tools[].input_schema` | 8 |

## The vocabulary the printer must NOT emit

Thirty-six keywords are absent, and their absence is the ruled shape rather
than an accident. `oneOf`, `anyOf`, `allOf`, `not`, `if`/`then`/`else` are
absent because the wire lean is flat tools with no sum types; `$ref`, `$defs`,
`$id`, `$schema`, `$anchor` are absent because nothing is shared or named;
`format`, `minLength`, `maxLength`, `multipleOf`, `const`, `default`,
`examples`, `title`, `items`, `prefixItems`, `minItems`, `maxItems`,
`uniqueItems`, `contains`, `patternProperties`, `propertyNames`,
`dependentRequired`, `dependentSchemas`, `unevaluatedProperties`, `deprecated`,
`readOnly`, `writeOnly`, `exclusiveMinimum`, `exclusiveMaximum` are simply
unused.

The consequence for the printer is that the closed vocabulary is small enough
to be an enumerated sum in the emitter, and a keyword outside it is a wall
failure rather than a design conversation.

## The consequence the census makes visible

`description` at 34 and `$comment` at 3 are the largest keyword counts after
`type`, and both carry only prose. Of the ten keywords, four (`type`,
`properties`, `required`, `enum`) are derivable from `ProjectionAst`
declarations; three (`pattern`, `minimum`, `maximum`) are wire convention with
no model source; and two (`description`, `$comment`) are authored prose with no
model source. `additionalProperties` is a single ruled constant.

That is the 20/80 split stated as a keyword count.
