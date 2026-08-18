# generated/expressibility — one declared term, four projections

**Every file beside this one is generated. Do not edit them.** An edit is not
merely discouraged here; it reddens `check:expressibility` on the next run,
which is the point.

## What this is

The expressibility slice: one affordance — the batched cell join,
`joinAll(cell, contributions)` = `s ↦ s ∨ (⋁ contributions)` — carried through
the whole meta-language pipeline, so the claim *one declared term, many
surfaces, no second text* is measured on a real affordance instead of asserted
about a hypothetical one.

The one declaration is `../../scripts/expressibility-term.ts`. It is the only
place a person writes a sentence about `joinAll`. These four artifacts are what
it projects into:

| File | The surface it is |
| --- | --- |
| `denotation.json` | The declaration's canonical preimage (RFC 8785, through `truth/Canonical`). Its SHA-256 is the term digest every other artifact names. |
| `joinAll.generated.ts` | The fluent TypeScript surface: law atoms and rung bundles, the signature at the earned rung, the docstring in §7.3's order. A **type-level probe** — nothing imports it, and its `Effect` is a structural stand-in, not the pinned `effect`. |
| `tool.schema.json` | The MCP tool entry, in the record shape `verify/kernel/projections/tools.schema.json` uses. **Not served**: no MCP surface reads this file. |
| `registers.md` | The §7.1 affordance row in both registers, plus the four statements paired. |

## How to regenerate

```
bun run generate:expressibility        # from packages/plait
```

Regeneration is byte-identical by construction: the check re-renders into memory
and compares, so a stale commit is a red gate rather than a review question.

## Which wall proves it

```
bun run check:expressibility           # the wall — five arms
bun run check:expressibility-control   # the proof the wall can go red
```

Both run in the package battery via `test:fast`.

The wall's five arms, weakest-last: byte-identical regeneration of all four
artifacts; the committed preimage rehashing to the digest through the estate's
identity door; the eight shared fields pulled back OUT of each projection's own
medium and compared across all three; three statement pairs byte-compared
against §6.3 of `docs/design/2026-08-18-km-algebraic-register.md` — the oracle
outside both sides, since projections of one declaration would agree with each
other even if the declaration were wrong; and the runtime anchor, which binds
each declared fact to the `casJoinLoop` call the declared entry actually makes.

The served callable schema is **re-derived inside the wall** by a second
rendering, independent of the emitter's, and byte-compared. Two renderings of
one declaration is served-equals-derived (standing estate law 3); one rendering
compared against itself is green by construction and proves nothing.

The control plants five mutations — a `required` name the declaration does not
derive, a widened `items.type`, a mangled donor, a drifted preimage, a weakened
rung — and requires the wall to refuse each **for its own named reason**. Its
first arm is an unmutated witness that must pass, without which the other five
would be vacuous.

## What is not claimed

- **Law 1 sketch waiver, ticket DEV-796.** The `law`, `rung`, and `operator`
  rows in the declaration are transcribed from the design record, not derived
  from the KM corpus — the corpus has no such groups today. `expressibility-term.ts`
  carries the waiver and states the check that establishes it. The oracle arm is
  what keeps those rows honest until the model emits them.
- `joinAll` is **not a shipped surface.** The shipped join is `Cell.join` plus
  `CellService.merge`; §7.1's `joinAll` row remains unbuilt and this slice does
  not build it.
- The oracle compares **text, not meaning**. It catches drift between the record
  and the declaration; it cannot catch a sentence wrong in both.
- Nothing here measures whether either register is easier for a person or a
  model to author against. That is KM-18's eval, and no parity-in-understanding
  claim is made.
