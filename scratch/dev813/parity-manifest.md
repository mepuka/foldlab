# DEV-813 prep: the parity manifest

The sketch the emitted artifact is measured against, and the determinism
constraints a direct printer inherits from it.

## The pin

```
path    verify/kernel/projections/tools.schema.json
sha256  8d9cb4b106c86f60f6e74ae60ff20ee57a3f0354e91227480f8562e6ea3bd7d4
bytes   13058
lines   235
```

Read at `origin/main` commit `c0b5b69`. The file ends with a single newline,
uses LF throughout, contains no tab, and uses no JSON string escape of any
kind. It is not valid ASCII: three byte values above 0x7F appear, all of them
the UTF-8 encoding of U+2014 EM DASH.

## The determinism constraints, measured

### Key ordering is authored, not sorted

Nothing in the sketch is in sorted key order. The orders are fixed and
meaningful, and a printer must pin each one:

- top level: `$comment`, `digest_format`, `tools`, `refusal_result`
- tool object: `name`, `description`, `input_schema`
- input schema: `type`, `additionalProperties`, `required`, `properties`
- properties: required fields first in `required` order, then the optionals —
  true in all eight tools

Per-field key order is **not consistent**, and this is a defect the parity
diff will surface on the first emission:

| order | count |
| --- | ---: |
| `type`, `pattern`, `description` | 13 |
| `type`, `description` | 10 |
| `type`, `minimum`, `maximum`, `description` | 7 |
| `type`, `description`, `enum` | 2 |
| `type`, `enum`, `description` | 2 |
| `type`, `enum` | 2 |

`kernel_declare.kind` and `kernel_resolve.kind` put `description` before
`enum`; `kernel_trigger.production` and `kernel_trigger.stage` put `enum`
first. A printer emits one order. Two rows will diverge whichever order it
picks, and both divergences are sketch defects.

### Physical layout is inconsistent

Indentation is two spaces, nesting twelve deep at the deepest. Twenty-four
property objects are expanded across lines; **twelve are written on one line**
— `tools.schema.json:186-194` (the nine `kernel_trigger` optional slots) and
`:230-232` (three `refusal_result` fields). A printer emits one layout, so
twelve rows diverge by construction.

`json.dumps(indent=2)` does **not** reproduce the file, for exactly this
reason. A printer that reaches for a stock serializer inherits the expanded
layout and diverges on those twelve.

### The prose alphabet conflicts with the landed toolkit

The sketch carries **nine U+2014 EM DASH characters** (lines 2, 11, 36, 57, 77,
97, 144, 170, 200 — the file header plus eight tool descriptions).

`Projections.asciiDoc` transliterates U+2014 to `--` and reports any other
non-ASCII code point as an error rather than mangling it. The landed
`verify/projections/artifacts/prose.md` carries zero em dashes and seven `--`.

A JSON-schema printer reusing that rule emits `--` and diverges from the sketch
on nine lines. A printer that does not reuse it introduces a second prose
alphabet in the same toolkit. The ruling this needs is one line long and
belongs with the wire-convention table: JSON is UTF-8 and can carry the em dash
lawfully, so this is a house-style choice, not a correctness one.

### Escaping is untested

No `"` , no `\`, no control character, and no non-ASCII other than the em dash
appears inside any string in the sketch. The escaping path is therefore
**unexercised**: nothing in the current corpus forces the printer to escape
anything. A printer must still state its escaping rule, and the wall must plant
a control that exercises it, or the first prose sentence containing a quotation
mark will be the test.

## What parity means for this ticket

The sketch was hand-derived. Of the divergences the first emission will show,
these are already known to be the sketch's fault and not the printer's:

1. the twelve single-line property objects (layout inconsistency);
2. the two `kind` fields with `description` before `enum` (ordering
   inconsistency);
3. the seven stale `maximum` bounds (see `stale-bounds.md`);
4. the header `$comment` sentence pinning the retired I-JSON safe range.

Everything else is a real question for the diff. Filing each divergence with
its quoted diff is the ticket's stated evidence, and these four are pre-filed.
