# Census B — the Effect fluent surface

What a generator would have to reproduce if it emitted a fluent Effect surface
for the kernel language. Measured at `c0b5b69` across `packages/plait/src`.

The question is not "what would be nice." It is: the estate already has a
generated fluent surface (the program builder) and a large hand-written Effect
surface with walls pinning its shape. What does a generator have to hit?

## The register statement

The CLI rewrite settled the framing, and it is the one an emitter inherits. The
operator named two lawful framings; the file takes **Effect's abstractions as
the algebra's carrier**, not the estate's algebra re-expressed in Effect. The
reasoning, from that pull request:

> the carriers already exist and are already algebras: a `Command` tree is a
> declarative structure a parser interprets, `Schema` is a decode algebra,
> `Layer` is the wiring algebra, and `Refusal` is a sum with one total
> interpretation. Choosing them makes the estate's algebra visible in the
> file's shape; re-deriving them would produce a second grammar beside the
> library's

and the middle course — a thin wrapper with estate-shaped helpers — is named as
the mush to avoid. That rules out an emitter that prints an estate-shaped
combinator library over Effect. What it prints is Effect's own vocabulary,
carrying the algebra's terms.

## The pinned release

Effect **v4**, `4.0.0-rc.108`, catalog-pinned. This is not a detail an emitter
can get wrong, because the v3 spellings have zero occurrences in the tree:

| do not emit (v3) | emit (v4) |
| --- | --- |
| `Effect.Service`, `Context.Tag`, `Context.GenericTag` | `Context.Service` |
| `Data.TaggedError` | `Schema.TaggedError` |
| `.Default`, `ManagedRuntime` | explicit `layer` / `testLayer` statics |
| `@effect/cli` | `effect/unstable/cli` |

The CLI point is worth stating twice because it has already cost a seat once:
published `@effect/cli` tops out on the v3 line; on v4 the CLI ships in-tree.
The dependency clause in the estate contract names this explicitly so it is not
re-litigated.

## The idiom table

### Services — 11 of 11, no dissent on shape

```ts
export class Folds extends Context.Service<Folds, FoldService>()(
  "@foldlab/plait/Folds",
) {
  static readonly layer = (options: FoldsOptions): Layer.Layer<Folds, Refusal> =>
    Layer.effect(Folds, makeFoldService(options))

  static readonly testLayer = (service: FoldService): Layer.Layer<Folds> =>
    Layer.succeed(Folds, Folds.of(service))
}
```

A separately declared `interface XService` of methods; two static layer members,
live and fixture; the fixture supplied *through the production tag*. Tag ids are
`@foldlab/plait/<Name>`, services plural.

The variant an emitter should copy is the one that injects judgment into the
service record rather than leaving it swappable:

```ts
static readonly admit = kernelAdmit
static readonly testLayer = (service: Omit<FabricClientService, "admit">): Layer.Layer<FabricClient> =>
  Layer.succeed(FabricClient, FabricClient.of({ ...service, admit: kernelAdmit }))
```

A fixture cannot substitute a second door. That is Law 2 expressed in a type.

### Named operations — 118 sites, zero untagged

`Effect.fn("Module.operation")` is the default way to write anything effectful;
bare `Effect.gen` is the exception (19 sites). The companion convention is
`Effect.fn.Return<A, E, R>` on the generator's return position — 79 sites — which
is how `E` gets pinned rather than inferred.

Tag naming, three sub-rules: module-level free functions take the namespace
export name (`Cell.join`, `Lane.emit`, `Wire.encodeEnvelope`); service methods
take the plural class (`Blobs.put`, `Registers.commit`); surface and script
segments are lowercase (`cli.renderRefusal`).

### Layers — two constructors and no more

`Layer.effect(Tag, makeXService(options))` live; `Layer.succeed(Tag, Tag.of(service))`
fixture; `Layer.mergeAll` to compose. No `Layer.scoped`, no `.Default`, no
`ManagedRuntime`, no `runMain`. Root assembly is an array literal passed to
`Effect.provide`, and per-command layers are provided at the handler.

### Schemas

`Schema.Struct` / `Schema.Union([Schema.TaggedStruct(...)])`. `Schema.Class` has
zero occurrences — sums are never class hierarchies. Brands are
`.check(...).pipe(Schema.brand("@foldlab/plait/X")).annotate({ identifier })`,
five sites.

The generated schema template, which an emitter must match exactly: JSDoc from
the model docstring, the struct, `.annotate({ identifier, title, description })`
where title is the docstring's first sentence, then a `…Value` type alias whose
stated purpose is that consumers **re-export the generated declaration** rather
than restate `typeof X.Type`. That distinction is walled: seven door types were
spelled the restating way and scored zero derived by the type-universe walk.

## The hard constraint: the public error channel is closed and gated

This is the single most important row for ticket-writing. Every public
signature in the package is pinned in a generated census, and the gate fails if
any public declaration carries an error that is not a refusal:

```
Address.at#call[1] Effect error=StructuralRefusal | AbsenceRefusal
Blob.Blobs.layerFileSystem#call[1] Layer error=never
Cell.Cells.layer#call[1] Layer error=StructuralRefusal | AbsenceRefusal
```

Eighty-one lines, every one `StructuralRefusal`, `StructuralRefusal | AbsenceRefusal`,
or `never`. A generated fluent surface **must** produce that error channel or
this wall reddens on arrival. It is wired into the fast battery, unlike the
builder's own wall.

## The two refusal tiers — do not conflate them

An emitter that treats "refusal" as one thing will produce a wrong surface.

**Tier A — planes refuse on the error channel.** Two `Schema.TaggedError` classes,
`StructuralRefusal` and `AbsenceRefusal`, in a union, sharing
`{ law, path, got, expected, next }`. Retryability is a type refinement on the
sum (`refusal is AbsenceRefusal`), not a flag. The single parse boundary is
`decodeRefusing`, converting a schema issue into a refusal.

**Tier B — the kernel door refuses in the value channel, with no Effect at all.**
`KernelDoor.ts` imports no Effect module. Its verdict is a plain tagged union,
and refusal minting is a table lookup, not a constructor:

```ts
const refused = (reason: KernelRefusalReason): KernelVerdict =>
  ({ verdict: "refused", ...KERNEL_REFUSAL_BY_REASON[reason] })
```

The estate's own vocabulary ruling explains the split: a refusal is data, never
an exception and never a null, because the same shape is the wire answer a
daemon gives, where "error channel" would name a language feature the caller
does not share.

**The bridge already has a name and no implementation.** `CasDaemon` declares
the one seam where a kernel refusal rides an Effect error channel:

```ts
readonly publish: (declaration: KernelProgramDeclaration) => Effect.Effect<CasDigestHex, KernelRefusalRow>
readonly resolve: (digest: CasDigestHex) => Effect.Effect<KernelProgramDeclaration, KernelRefusalRow>
readonly readAt: (anchor: CasAnchor) => Effect.Effect<CasDigestHex, KernelRefusalRow>
readonly land: (outcome: CasOutcome) => Effect.Effect<void, KernelRefusalRow>
```

with the rule stated beside it: the runtime's error channel is the model's
refusal table and not a second one invented here. **No tag, no layer, no
implementation exists.** This is the named seam a generated Effect surface
targets, and it is currently an interface and a docstring.

Note the tension a ticket must state honestly: the public-effects wall pins the
public E channel to `StructuralRefusal | AbsenceRefusal`, and this seam's E is
`KernelRefusalRow`. Whether the fluent surface is public (and must convert) or
internal (and may carry the row) is a ruling, not an implementation choice.

## What the generated builder already carries

The builder is the fluent surface's smaller sibling and the only generated
authoring surface that exists.

**Three phantom parameters.** `Holes extends bigint` on the constructor bundle —
a hole never declared is a type error at the call site, "the surface has no
wildcard." Then `Generator` and `Kind` on the handle a constructor hands back:

```ts
export interface KernelHandle<Generator extends KernelGenerator, Kind extends KernelDeclKind | null> {
  readonly arg: "local"
  readonly name: bigint
  readonly "~foldlab/plait/kernel/handle": readonly [Generator, Kind]
}
```

`declare` and `resolve` carry their kind; the other six carry `null` and are
spendable only where a value is wanted.

**The style is const-binding, not piping.** A constructor returns a handle, the
handle is passed as an argument to a later constructor, and the body's return
names the terminal node:

```ts
program("holey", { holes: [{ name: 7n, schema: 88n }] }, ($) => {
  const declared = $.declare({ kind: "schema", value: $.hole(7n), writ: $.digest("policy", 4n) })
  return $.emit({ lane: $.digest("lane", 1n), body: declared })
})
```

**Three gaps an emitter inherits.**

1. Every argument except `kind` is optional. A generator's required fields are
   not required at the call site.
2. Builder-time refusals are `throw`s — the one place in the estate where the
   never-throw rule is inverted, on the grounds that a declaration is authored
   at compile-shape time rather than judged at a seam. A fluent Effect surface
   cannot inherit that; it has an error channel.
3. Its byte-parity wall and negative control are declared and wired into
   nothing — not the fast battery, not the types battery, not the walls
   battery, not the root gate. This is acknowledged in the package's own
   README and already ticketed, together with the control's separate red on
   member ordering. It is the one generated kernel artifact whose
   served-equals-derived property is unenforced, and it is also the one whose
   provenance still carries a path and a command rather than a digest.

Growing this surface before its wall is wired would grow an unwalled artifact.
That is the honest blocker on the Effect projection, and it is not this lane's
to fix.

## The refusal rendering precedent

For any surface that must show a refusal to a human or a model, there is one
site and one shape — encode the refusal through its own schema, canonicalize,
print. The function names none of the fields:

```ts
const rendered = yield* SchemaParser.encodeUnknownEffect(Refusal)(refusal).pipe(
  Effect.flatMap((encoded) => canonicalBytes(encoded as WireValue)),
  Effect.map((bytes) => new TextDecoder().decode(bytes)),
)
```

Its docstring states the invariant: encoding through the schema union is what
makes the function total over the sum, and what carries the taught fields
without this file naming any of them. The test pins the key set exactly and
asserts the output re-canonicalizes to itself; the negative control asserts
that library usage errors are rendered *by the library* and carry no estate
vocabulary at all.

That is the rendering any new surface — including a code-mode view — reproduces
rather than re-invents.

## One trap to carry forward

Two spellings of every refusal reason are generated, in different layers: the
tables carry kebab-case wire spellings and the schemas carry camelCase model
constructor names. Same for applicability. An emitter must be told which
register it prints; it cannot infer one.
