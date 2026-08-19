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

### P4. The module set travels with the manifest (DEV-822 item 2)

Decided: each manifest carries a `# modules: <mod.a>, <mod.b>` directive line,
`Main.lean` parses it and loads exactly that environment, and a manifest with
no directive is refused. Alternatives: keep a hard-coded module list in
`Main.lean`; put the modules in a second command-line flag. Why: the reuse
charter is "kernel now, fabric later" — a future package should swap manifests,
not edit the executable. A second flag would separate names from their
environment and let the two drift. The directive rides "with the manifest" so
one file is the whole scope of a walk.
**Load-bearing? yes** — the walk is parameterized by its environment, not a
name list, which is the whole point of the fork-away-from-kernel story.

### P5. The orphan scan drinks from the compiled constant table (DEV-822 item 4)

Decided: `orphanNames` enumerates the manifest's namespace from the
environment's own constant table (`env.constants.toList`, which folds the
imported `map1` and the current module's `map2`), classifies each candidate as
eligible when it is an inductive/structure of positive sort (level zero is a
`Prop` proof predicate and has no row in a data register) carrying a
docstring, and reports the sorted, unlisted set into `artifacts/orphans.md`, a
freshness-gated artifact. The manifest count (22) is unchanged; whether any
reported orphan joins the manifest is the coordinator's call. Alternatives:
enumerate by hand; iterate only `map2` (invisible, empty in an executable) or
the docstring extension (private). Why: only the constant table is both public
and complete, and "says what the environment actually holds" is the whole
finding.
**Load-bearing? yes** — this is the check that makes a kernel-side type
addition visible instead of silent.

### P6. The probe lane is a lawful refusal producer (DEV-822 item 3), P3 strands

Decided: `Projections.Probe.sampleRefusals` supplies two rows (one with an
explicit applicability, one without, so the printer's `getD "advisory"`
fallback actually renders) and `--target=refusal-probe` attaches them to the
walked projection before `Prose.render`. Alternatives: give the generic
`walk` the rows; render a fabricated fallback in `Prose`. Why this does NOT
breach P3: P3 forbids the GENERIC declaration walker from inventing refusal
law/repair text — the walker's output stays `refusals := []`. The probe module
is a model-specific producer, exactly the seam P3 leaves open ("ready for
model-specific producers to populate"). The gate then proves the fold a
`RefusalRow` actually takes, with a mutated-fallback mutation arm, without a
single fabricated row entering the walking path.
**Load-bearing? yes** — it makes a dead-code fallback live without the generic
walker lying.

### P7. Manifest-vs-corpus is a file diff against the corpus's emitted roster (DEV-822 item 5)

Decided: `run.sh` diffs `names.txt` (prefix-normalized) against the `type`
records of `../../packages/plait/fixtures/kernel-conformance.ndjson` —
the corpus's own machine-generated type roster FILE — and refuses divergence
with a named message, reading the corpus file read-only so the toolkit's lake
dependency graph stays kernel-only. Alternatives: second hand-written pin;
bash parsing the corpus's TypeScript (richer but brittle); nothing. Why: a
FILE-to-FILE wall needs no oracle outside both lists, and the conformance
interchange is the one Generated corpus roster. The toolkit adds no lake
dependency; the corpus's TOPOLOGY gate is untouched.
**Load-bearing? yes** — this closes the item's "the manifest duplicates the
corpus with no wall" gap without inventing a second pin.
