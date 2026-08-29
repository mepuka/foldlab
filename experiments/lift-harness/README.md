# effect-lift-harness — the v0 recognition harness

PROMOTED 2026-08-28 from `.staging/parser-experiments/harness/` (operator
ruling, same day): the promoting act is the commit of this tree. The
fixture corpus the gate consumes still lives in `.staging/fixture-gen/`
(pre-grade until its grammar is grilled) — the gate requires that lane
generated on the host (`mise run gen` there) and says so if absent.

Pre-grade (`.staging`), extracted 2026-08-28 from the session lanes
(`ngram/`, `lift/`, `dslv0/` hold the original run records and superseded
scripts; this package is canonical). Architecture per the grill rulings:
parser-spined, oxc hot path, sieve demoted to triage, trust only through
the agreement gate.

```
(manifest)        the AUTHORITY (R11) now lives in Lean —
                  `Cas.Lift.manifestV0` (library/cas/Cas/Lift/) — and is
                  emitted by `lake exe emitlift` to
                  library/effects/src/cas/generated/lift/manifest.json
                  (+ manifest.md, the human projection), byte-gated in
                  check:cas. BOTH engines import those bytes — they
                  share DATA, never code, or the gate proves nothing.
src/contract.ts   the PORTABLE layer: verdict types, refusal taxonomy +
                  spectrum, the manifest typed, the literal-domain
                  predicates, canonical JSON, verdictKey (the gate's
                  equality). No IO, no parser.
src/sieve.ts      non-parsing triage: transliteration, § anchor, n-grams.
src/lift.ts       engine 1 (ck): typescript@5.9.2 compiler API.
src/oxc-engine.mjs engine 2 (oxc): the recognizer itself, over ESTree.
                  Independent of lift.ts by construction. Two invocation
                  surfaces sit on it — the oxlint rule (gate) and
                  oxc-parser (suite) — which are two ways to call ONE
                  engine, not two engines.
src/plugin.mjs    the oxlint surface: a thin wrapper over oxc-engine.
src/gate.ts       the agreement gate + oxc invocation, as a typed report.
src/cli.ts        the CLI, pure Effect 4 (effect/unstable/cli): gate |
                  lift | census | sieve. Requires FileSystem, Path, a
                  process spawner and HarnessPaths; provides NONE of them.
src/HarnessPaths.ts  WHERE the material lives, as a service. The only
                  module that computes `../..`, so nothing else has to
                  know how deep it sits in the tree.
bin/main.ts       the entry point, and the ONLY file that decides what
                  the world is (BunServices + the layout layer).
test/             the differential suite, T1–T8 (see below).
models/           sieve-r1.json (NB model + threshold + anchor config).
examples/         blobTree32.ts — the 97-operation showpiece.
```

```sh
mise run check     # tsc --noEmit (strict, green) + agreement gate (green)
mise run census    # wild refusal histogram + spectrum rollup
bun bin/main.ts lift examples/blobTree32.ts
```

State at extraction: gate 265/265 verdict agreement, 9/9 lifts both
engines; strict typecheck clean; census reproduces the session numbers
(6,908 candidates, 0 v0 lifts, branches/loops/handlers < 1.2%).

## The Lean port seam (invocation semantics, left open)

The harness fixes WHAT an engine is, not HOW it runs. The seam:

- **An engine is** any realization of `recognize : SourceText → List Verdict`
  whose output round-trips canonical JSON (`contract.canonJson`). Sync
  function, CLI process, oxlint plugin, Lake executable — all admissible;
  nothing in the contract assumes a runtime.
- **Engine equality is verdict equality** under `contract.verdictKey`
  (refusals on `(kind, name, code)`; lifts on the whole document; `pos`
  engine-local) over the by-construction fixture corpus. That equality IS
  the admission gate — a Lean walker joins by passing `gate` beside the
  existing engines, exactly as oxc joined beside ck.
- **What ports first**: `contract.ts` is the TypeScript mirror of the
  recognition proposal's §7.2 first-order data model, whose ratified
  authoring surface is Lean data — the port direction is Lean-as-source,
  TS-as-mirror, with the manifest generated both ways (R11) once grilled.
  The lift document (`Instruction`/`Ref`/word) is already the shape of
  the store language's run instructions; a Lean engine would emit the
  same canonical JSON and could additionally EXECUTE the document
  against the reference handler — the leg no TS engine is allowed:
  hoover here, execute only in Lean (direction law).
- **What likely never ports**: the oxc chassis (speed instrument) and
  the NB sieve (triage). They are evidence-preparation tools; the gates
  carry the trust, so their hosts are free.

## Standing deviations (inherited knowingly, recorded in contract.ts)

Rule 7 hex pinning disabled (`helperUnpinned: true` on every lift);
`const-yield-load` disabled (load-not-yet-documented); E-BRANCH arms
unattempted (nothing lands in `selective`); engines walk top-level
declarations only. Each is a manifest revision away, and each revision
re-runs the gate.

## The differential suite (T1–T8)

Landed 2026-08-28 under the rulings R1–R11 in
[docs/differential-testing-spec.md](docs/differential-testing-spec.md).
`mise run check` = `tsgo --noEmit` + `vitest run` + the agreement gate;
`mise run test` runs the suite alone. Everything here is sampled evidence
(G4 ceiling), hoover-side, and mints nothing.

| Tier | Asserts |
|---|---|
| T1 | contract facts: canonical-JSON determinism, `verdictKey` (`pos` out, detail IN), `SPECTRUM` totality, the R6/R7 literal domains, pinned detail strings, and the R9 reachability audit |
| T2 | every divergence-ledger row, on both engines: a `ruled` row asserts the ruled code and pinned detail; an `open` row asserts the divergence STILL REPRODUCES, so a quiet edit cannot bury a witness |
| T3 | metamorphic invariance — comments, whitespace, property order, semicolons, CRLF never change a verdict |
| T4 | property tier: in-grammar programs generated from the manifest, then adversarially mutated along the form axes. It asserts ENGINE AGREEMENT, never a particular verdict |
| T5 | the agreement gate, plus adequacy: declared engine mutants must be caught by the corpus, or the corpus is too weak to mean anything |
| T6 | reproducibility: recognition is a pure function of source bytes, and committed records agree with the contract |
| T7 (retired 2026-08-29) | the former portability tier pinned three Windows defects — file-URL path conversion, separator normalization, and command-line chunking — plus missing-fixture reporting and CRLF agreement. Commit `a5fb51a9` removed those tests, so these behaviors no longer have a dedicated portability regression tier |
| T8 | the ESTree deviation audit — what oxc really emits, measured against the pinned specification |
| T12 | the PProg round trip (P3): both engines reading the committed emitted programs must answer, byte for byte, the lift documents Lean emitted from the same tables |

### T12 — the round trip is closed (P3)

The Lean landing exists. `Cas.Lift.decodeLift`
(`library/cas/Cas/Lift/Decode.lean`) reads a canonical lift document
back as a `PProg`, with named refusals and a stated domain — puts only,
answer references only, dense and backward-resolving — and it delivers
the program and stops. A document carrying a `word` is refused by name,
which is the direction law spelled as machinery instead of prose. The
decoder and the document encoder are proved mutual inverses on that
domain (`decodeLift_encodeLift`, `encodeLift_decodeLift`,
`decodeLift_inj`).

That closes the loop the seam above describes:

```
PProg  ──lake exe emitprograms──▶  VectorPrograms.ts
                                        │ ck / oxc
                                        ▼
                                  lift documents  ══byte-compared══  Cas.Lift.encodeLift
                                        │
                                        ▼ Cas.Lift.decodeLiftBytes
                                      PProg  (the one it started from)
```

Both of T12's inputs are COMMITTED and emitted by one Lean run under a
byte-identity gate (`lake exe emitprograms --check`, in `check:cas`),
which also executes the Lean half of the trip on every registered
program before writing the bytes. So T12 is the one tier that runs on a
clean checkout: it never reaches for the fixture corpus in gitignored
`.staging`. `mise run roundtrip` runs it alone.

**It is not a run-safety claim.** TG1 stands open: a type-only import
erases at compile time, both engines agree, and the program can still
`ReferenceError` at runtime. A decoder inverting an encoder, and two
type-blind engines agreeing, are both facts about SYNTAX. Green here
says the document survives the trip, not that the program runs.

### The divergence ledger

`test/ledger.json` is the append-only register of witnesses: the input,
what each engine did, and the ruling that resolved it. A witness is never
resolved by editing one engine to taste — it goes to the grill.

**R12 (ruled 2026-08-28, from this suite''s own findings).** A source the
parser rejects is a NON-CANDIDATE, and a non-candidate is silent — the same
shape R4 gives an over-deep spine. It does not refuse: a refusal is a claim
about a program, and an unparseable source is not a program to make claims
about. Each leg enforces this at its own parse boundary, asking its OWN
parser — ck checks `parseDiagnostics`, the oxc surface checks `parseSync`
errors, and the oxlint surface never runs a rule over a file it could not
parse. This closed ledger row `W6`, found by T4(b) after the original
eleven rulings had landed.

**One row stays open.** `TG1` is a **contract gap**: the engines agree, and
the agreement IS the defect. A type-only import (`import type * as Effect`)
is erased at compile time, so `Effect.gen` is a runtime `ReferenceError` —
yet both legs emit a clean instruction document, byte-identical, and the
gate is green on it. The hoover leg hands the execute leg a program that
cannot run. The gate is structurally blind here: two type-blind engines
agreeing proves only that they read syntax the same way, and N-version
agreement is worth nothing against a fault in the shared blind spot. A
candidate oracle is recorded on the row (`oxc-transform` with
`onlyRemoveTypeImports: true` — the `verbatimModuleSyntax` semantics, which
reports per-specifier which imports survive to runtime, synchronously and
without a type-checker), but it closes import survival only: Rule 7 stays
disabled and every lift still carries `helperUnpinned: true`.

T2 asserts open rows by class — a witness must keep DIVERGING, a contract
gap must keep AGREEING — so neither can be closed without a ruling.

### Two surfaces, one oxc engine

The suite reaches the oxc engine through `oxc-parser` in-process; the gate
reaches the same engine through the oxlint chassis. That is deliberate: a
suite that re-implemented the recognizer would be testing a third thing.
The surfaces do NOT agree on everything — `oxc-parser` defaults
`preserveParens: true` and emits `ParenthesizedExpression` (non-standard),
while oxlint strips parens first — so the engine reads through both and
T8 audits the difference rather than assuming it away.

### Toolchain note (TS7)

Typechecking is `tsgo` (TypeScript 7). The `typescript@5.9.2` pin STAYS:
the ck engine parses with the classic compiler API, and TS7 exposes no
standalone source-text-to-AST parse — its `createSourceFile` is a factory
over already-parsed statements, and real parses go through the
project/program API against files on disk. Moving the ENGINE to TS7 is a
rearchitecture, not a swap.

## The CLI is pure Effect 4

Refactored 2026-08-28. `src/` contains no `node:*` import, no `Bun` global,
and no default filesystem: every module names what it needs — `FileSystem`,
`Path`, `ChildProcessSpawner`, `HarnessPaths` — in its requirement channel
and satisfies none of it. `bin/main.ts` chooses the world (bun);
`test/runtime.ts` chooses a different one (node, because vitest executes
test bodies in a node worker even under `bun x`). Same code, two worlds —
that is the property the refactor buys. The retired T7 tier used to assert
it; there is no longer a dedicated portability regression test.

Shapes are Effect `Schema`, and the TypeScript types are derived from them
rather than declared beside them. That matters where data crosses a
boundary: verdicts arrive as canonical JSON inside an oxlint diagnostic,
and the manifest is JSON on disk. Both are decoded, so a malformed verdict
fails as a malformed verdict instead of surfacing later as a mysterious
gate disagreement. The ENCODED side is fixed — `kind` stays the
discriminant, not `_tag` — because those bytes are what the gate compares.
oxlint's report envelope stays permissive and the one entry the gate reads
is decoded strictly: validate what you consume, tolerate what you ignore.

Where the fixture corpus lives is a service, not arithmetic on
`import.meta.url`. Depth in a directory tree is a deployment fact, and a
gate that computed its own depth would silently look in the wrong place
after a file move. `HarnessPaths.layer` is the one place `../..` appears,
and it is replaced wholesale rather than edited — which is also how a test
points the same gate at a corpus it built itself.

```sh
bun bin/main.ts --help            # subcommands, wizard mode, completions
bun bin/main.ts gate              # the agreement gate
bun bin/main.ts lift <file...>    # canonical JSON on stdout
```

Verdicts go to stdout through `Console`, never the logger: they are data
with a machine-readable contract, and a timestamped `INFO` prefix would
break every consumer that pipes them.

Note on the `oxc-engine.mjs` leg: it `readFileSync`s the manifest rather
than importing it with a JSON import attribute, because that module is
loaded by two foreign hosts — oxlint's plugin runtime and vitest's node
worker — and only the second honours the attribute. The path it reads is
exported as `MANIFEST_PATH`; `contract.ts` imports the same file, and
`test/T1-contract.test.ts` asserts the two legs' bytes are identical. There
is no second copy of the manifest in this package — there was one at
`src/manifest.json`, and it had already drifted (R11 split-brain, closed
2026-08-29).
