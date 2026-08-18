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
