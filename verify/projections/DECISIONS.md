# Projections toolkit — decisions the dispatch did not fix

Task-local placeholders follow the numbering rule in `proto/DECISIONS.md`;
repository D-numbers are assigned at merge.

### P1. Keep Lean `Expr` behind the walk

Decided: `TypeExpr` keeps names, variables, application, arrows, sorts, and
literals but no Lean universe levels or elaborator nodes. Alternatives: emit
raw `Expr`; pretty-print every field to an opaque string. Why: raw `Expr`
couples consumers to Lean internals, while opaque strings destroy the typed
printer seam. **Load-bearing? yes** — this is what makes the AST
language-neutral.

### P2. Derive the algebraic register from declaration shape

Decided: each `DocSentence` pairs the environment docstring with a signature
rendered from the same `Decl`; a missing docstring refuses the walk. Alternatives:
hand-author a second text; fall back to a generic plain sentence. Why: KM-18
requires two concretizations to move together and specifically rejects a
generic plain fallback. **Load-bearing? yes** — it prevents a silent twin.

### P3. Leave refusal values to model-specific producers

Decided: `ProjectionAst` includes `RefusalRow`, and the prose fold is total over
it, but the generic declaration walk emits no rows. Alternatives: inspect the
implementation body of an arbitrary `taught` function; transcribe kernel rows
here. Why: `getConstInfo` can establish declaration shape, not the semantics of
an arbitrary model-specific refusal table, and transcription is forbidden.
**Load-bearing? yes** — fabricated law and repair text would make the generic
tool lie.

## Slice-A amendments (DEV-812, ruling A3)

Four measured byte-parity blockers. Each states the semantics chosen and the
source it was derived from; P1, P2, and P3 above are unchanged. The sources are
`verify/unity/Unity/Shape.lean` and `Unity/Reflect.lean` (the environment walk
that mints the committed kernel corpus), `packages/plait/scripts/kernel-schemas.ts`
(the generated-schema renderer the TypeScript target must match), and
`packages/plait/fixtures/kernel-conformance.ndjson` (the corpus those two agree
on, read as the measured referee). All three are read-only to this package.

### P4. `Field` carries a derived binder role

Decided: `Field` gains `role : FieldRole` — `brand` or `typeArgument`, wire
spellings `"brand"` and `"type"` — and `Walk.fieldOf` derives it from the
environment by one rule: a binder whose type reduces to a sort stands for a
type, every other binder stands for a value. In parameter position a value
binder is the brand the declaration is indexed by, which is exactly the
predicate `brandedSorts` uses to select the branded-alias section of the
generated Tables (`param.role === "brand"`). Derived from `Unity/Reflect.lean`
`shapeOf` (`(<- whnf (<- inferType binder)).isSort`) and its wire table
`Shape.ShapeRole.wire`; checked against the corpus, where `Digest` reads
`"params":[{"name":"kind","role":"brand"}]`.

Alternatives: hand-annotate the role in the manifest (refused — it would be a
transcribed model verdict); infer it from the parameter's name; give roles only
to parameters and leave constructor fields roleless. Why the shared shape: the
rule is a predicate on a BINDER, and one rule applied at one site cannot
disagree with itself. The prose printer renders the role only in parameter
position, because that is the only position where the brand reading is
load-bearing; the constructor-field role is the same honest answer to the same
question and is carried for a target that wants it. **Load-bearing? yes** —
without it the branded-alias section of the TypeScript target is unrepresentable
and no printer can rebuild it from the AST.

### P5. One named ASCII transliteration, refusing what it cannot name

Decided: `Ast.asciiDoc` mirrors `Unity.Shape.asciiDoc` exactly — LF and
printable ASCII (0x20–0x7e) pass through, one named table transliterates
(`0x2014` to `--`), and any other code point is REPORTED with its number rather
than replaced; the first offending character wins. `Walk.docOf` applies it and
turns the report into a walk error naming the declaration.

Alternatives: emit UTF-8 unchanged (the prose page would then disagree with the
corpus at every em dash, and the divergence would be invisible until a target
diffed); replace unknown code points with a placeholder (a silent lie the gate
could never see). Why: the rule already exists once in the estate and the AST
seam is where a second copy would drift. Its refusal branch is executed by the
gate, not merely stated. **Load-bearing? yes** — the transliteration is a byte
difference on 6 lines of the committed page.

### P6. The docstring travels verbatim — no trim

Decided: `Walk.docOf` carries the environment's docstring transliterated and
otherwise untouched — never reflowed, retrimmed, or retyped. The incidental
`trimAscii` is removed, and the prose printer emits the text as it received it.

Derived from two sources that agree: `Unity/Reflect.lean` `docOf` states the
policy in those words, and the committed corpus proves it holds (every doc
record ends in a space, e.g. `"...of a known kind. "`). The measurement that
makes it a byte-parity blocker is `kernel-schemas.ts`: it joins a derived brand
sentence onto the docstring with

    const separator = doc === undefined || doc.endsWith(" ") || brands === "" ? "" : " "

so a pre-trimmed docstring makes that branch unreachable and inserts a second
space the committed generated file does not have.

Alternatives: trim (the landed behaviour — it destroys information the AST's
consumer branches on); trim only the trailing newline; normalise whitespace.
Why: an interchange may not decide a layout question on its consumer's behalf.
A printer that wants a trimmed docstring can trim; a printer that needs to know
whether the model's author left a space cannot un-trim. **Load-bearing? yes** —
22 lines of the committed page differ, and the TypeScript target's separator
branch depends on it.

### P7. Name erasure is a stated rule applied at rendering, not at the walk

Decided: `eraseName` (the last dotted component of a qualified name) and its
lift `TypeExpr.erase` state the rule once; the AST keeps the QUALIFIED name and
the algebraic register applies the erasure where the reference grammar does —
at field and parameter types. `Kernel.Digest(Kernel.DeclKind.policy)` renders
`Digest(policy)`.

Derived from `Unity/Reflect.lean` `renderRef`, which spells a field type by
`shortName` of its constant head and recurses into arguments the same way, and
confirmed against the corpus (`{"name":"writ","type":"Digest(policy)"}`).

Alternatives: erase in the walk (lossy — a TypeScript target needs the
qualified name to import the declaration, and nothing could recover it); leave
the rule to each printer (two printers, two rules, one silent divergence);
erase declaration and constructor names too. Why not the last: `renderRef` is a
field-type rule, and the prose page's headings and constructor spellings are its
qualified register — widening the erasure beyond the measured blocker would
change bytes no evidence asked to change.

The composition is pinned, not approximate: `TypeExpr.erase` followed by
`TypeExpr.render` is `renderRef` character for character, argument separator
included (`AnchorFact(declared,partition)`, no space). An off-by-one-space
"nearly the reference grammar" is exactly the near miss a byte wall exists to
catch, and the first draft of this amendment had it: a one-off comparison run
OUTSIDE this gate, over all 105 field types, 5 parameter roles, and 22
docstrings of the corpus's records for these declarations, found the one row
that differed (`AnchorFact(declared, partition)`). The separators OUTSIDE a
type — between parameters, between a constructor's fields — remain the prose
page's own layout. **Load-bearing? yes** — it is what makes the emitted
reference grammar the same grammar the corpus carries.

That comparison is evidence, not a wall, and this package cannot make it one:
the topology arm forbids reaching the corpus, which is the same placement row
that gates the rest of DEV-812. Until it is ruled, the parity these four
amendments claim rests on the rules being stated once, here, against sources
read at the time of writing — and on the four mutation arms proving each rule
is what spells the committed bytes.

### P8. The probe baseline is regenerated, not exempted

Decided: `artifacts/probe.md` — a file this ticket was told not to edit — is
regenerated through `lake exe projections --target=prose --names=probe-names.txt`,
because P6 moves it: the probe's own docstring ends in a space. The diff is
exactly that one character on one line.

Alternatives: drop P6 (it is the measured blocker); special-case the probe
manifest inside the walk (a second policy, which is the defect P6 exists to
remove); leave the baseline stale (the gate's freshness arm reddens, and a
false red blocks the parallel seat as effectively as a real one). Why: the
baseline is generator output, and regenerating output through the generator is
not an edit to the control's meaning — the probe still renames a field and
still moves the page. **Load-bearing? no** — but it is a boundary crossing the
coordinator resolves at merge, and it is named here so the merge does not have
to rediscover it.
