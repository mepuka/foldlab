# The form register — total semantic capture of wild Effect code

Status: RULED 2026-08-28 (operator, this session): the naming law
(§4), the wire shape, spectrum grain, capabilities field, and the
version bump (F1–F4, recorded in place below). Membership of the
first register stays hypothesis until the first measured census.
Companion to
[library-graduation-design.md](library-graduation-design.md) (§10
semantic descriptions) and
[differential-testing-spec.md](differential-testing-spec.md).

## 1. The claim this instruments

Operator, 2026-08-28: the harness caught everything in the wild
census while unfinished, and we could easily catch ~100% of Effect
program semantics. Made precise, "catch the semantics" splits into
four strata, and the claim is about the first three:

- **(a) form** — every wild construct names its idiom;
- **(b) capabilities** — which services and operations it draws on;
- **(c) computation class** — its spectrum grade;
- **(d) executable lift** — the runnable document. NOT the claim:
  stratum (d) is the deliberate v0 ratchet and grows by manifest
  revision.

Effect is the library where (a)–(c) at 100% is credible: its surface
is stereotyped by design — a small closed idiom set (`gen` spines,
`pipe` chains, a fixed combinator vocabulary, `yield*` on service
tags, `Data.TaggedError` subclasses, layer and schema declarations),
no macros, no user syntax, an ecosystem that converges hard on the
canonical spellings. Evidence in hand: 6,908/6,908 wild candidates
classified fail-closed by the unfinished harness; the rung-2 token
typer at 92.4% in-region.

## 2. Vocabulary (proposed mints — grill before use in claims)

- **form** — a named idiom of the Effect-TS surface, recognized as a
  whole-declaration shape and NAMED IN EFFECT'S OWN VOCABULARY (the
  naming law, §4). The v0 straight-line store program is one form
  among many; it is the only form with a deep (liftable) reading
  today.
- **form register** — the manifest's table of recognized forms: name,
  spelling, plain-language description, spectrum grain. Grows only by
  manifest revision, exactly like rules.
- **form verdict** — the classification a candidate receives when it
  is a recognized form other than the liftable one: positive
  recognition, never a refusal.
- **semantic coverage** — over the pinned wild corpus: the fraction
  of candidates whose verdict names a specific form (or lifts, or
  refuses with a within-form code) rather than landing in the
  catch-all. The claim "100% of the semantics" is COVERAGE = 1 as a
  gate observable.
- **catch-all residue** — the complement of coverage: candidates the
  register does not yet name. The residue is the worklist; the loop
  runs until it is dry.

## 3. The model: forms first, lift as one form's deep reading

Today the recognizer asks one question — "is this the v0 store
program?" — and everything else exits through refusal codes, with
`E-SPINE-ESCAPE`/`E-PARAM-SHAPE` doing double duty as "wrong frame
entirely." The register re-carves this truthfully:

1. `recognizeForm : candidate → FormName` — TOTAL, with
   `unclassified` as the honest catch-all (the residue metric's
   numerator).
2. When the form is the liftable one (`store-program`), the v0 deep
   reading runs unchanged: lift document or within-form refusal. The
   refusal taxonomy keeps its exact current meaning — the gap
   between a store-program-shaped candidate and its document.
3. Every other recognized form yields a form verdict carrying the
   form name, its spectrum grade, and its capability census (the
   import-resolved tags, modules, and member operations the
   declaration touches).

Wire shape (RULED F1, 2026-08-28): a third verdict kind beside
`lifted` and `refusal`:

```
{ kind: "classified", name, form, spectrum, capabilities: [...] }
```

Alternatives considered: a `form` field retrofitted onto refusals
(muddies the taxonomy — a pipe-chain is not a refused store
program), or a separate classification channel outside the verdict
stream (splits the gate; two truths). The third kind keeps one
verdict stream, one gate, one canonical encoding.

## 4. The first register (naming RULED; membership is hypothesis)

**Naming law (RULED, operator 2026-08-28): forms carry Effect's own
names** — the word a working Effect developer would say: `Layer`,
`Service`, `Context`, `Schema`, `pipe`, `Effect.gen`,
`Data.TaggedError`, `provide`. Never a house paraphrase when the
ecosystem name is explicit. Two consequences:

- **The family taxonomy is Effect's, and it is exhaustive by
  construction.** Families are the pinned library's own module
  namespace (`effect/Effect`, `effect/Layer`, `effect/Context`,
  `effect/Schema`, `effect/Data`, …) and constructs are its exports
  — enumerable from the pinned source, which the hoover lanes
  already inventory. The register never invents taxonomy; it imports
  Effect's, under the existing import-resolution ground truth.
  A closed naming space is NOT a fidelity claim: what the engines
  actually capture is measured by coverage (§5), never assumed.
- **Relational forms name the relation in Effect's words**: a
  `provide` form reads as *provides a Service for …* / *provides a
  Layer for …*, carrying what is provided to what — the edges of
  the program's capability wiring, not just its nodes.

First register (rows get element-table entries so `explain` speaks
for each; bucket attributions are hypotheses until the first
measured census):

| form (Effect's name) | spelling sketch | census evidence |
| --- | --- | --- |
| `Effect.gen` / parameter capability | the v0 store-program frame — the one deep-read form | the lift lane |
| `Effect.gen` / Context capability | `Effect.gen(function* () { const s = yield* Svc; … })` | large share of E-PARAM-SHAPE (2,321), E-OP-RECEIVER (269) |
| `Effect.gen` / general body | gen spine, general bindings and control flow | E-YIELD-POSITION (1,280), E-BIND-SHAPE (353), E-BRANCH/LOOP/HANDLER (80) |
| `pipe` | `pipe(x, Effect.map(f), Effect.flatMap(g))` / `x.pipe(…)` | inside E-SPINE-ESCAPE (2,085) |
| `Effect` combinator | named by the construct itself: `Effect.all`, `Effect.forEach`, `Effect.map`, … | inside E-SPINE-ESCAPE |
| `Service` | `class Svc extends Effect.Service<Svc>()(…)` | declaration strata |
| `Context` | `Context.Tag` declarations and tag access | declaration strata |
| `Layer` | `Layer.effect(Svc, …)`, `Layer.merge(a, b)` | declaration strata |
| `provide` | `Effect.provide(prog, layer)`, `Effect.provideService(Svc, impl)` — *provides a Layer/Service for …* | wiring strata |
| `Schema` | `Schema.Struct({…})`, `Schema.Class` | declaration strata |
| `Data.TaggedError` | `class E extends Data.TaggedError("E")<{…}>` | declaration strata |
| `it.effect` | `it.effect("…", () => Effect.gen(…))` | wild corpora are full of them |
| `unclassified` | — | the residue; target ~0 |

Capability parameters ("arg parameters") cut across the gen forms:
a capability bound as a function parameter (the generalized store
binder) versus drawn from Context — the same program body, two
wirings, and the form verdict records which. The first census run
under the register replaces every attribution above with facts; the
residue's contents (top exemplars, reported verbatim per run) drive
the next revision. Loop until dry.

## 5. The coverage metric (the gate observable)

Over the pinned corpus manifest's wild-effect projects, candidates
defined exactly as today (declarations whose spine resolves to an
effect-module binding):

```
coverage = |{c : form(c) ≠ unclassified}| / |candidates|
```

Reported per project and in aggregate in the census record
(byte-gated, reproducible like every record). Ratchet: coverage is
monotone across manifest revisions over the SAME pinned corpus;
"100% of the semantics" is `coverage = 1` with a stable register.
Corpus growth re-baselines explicitly, never silently.

## 6. Obligations (nothing rides free)

- **Differential**: both engines implement `recognizeForm`
  independently; form verdicts enter gate equality (ordered,
  detail-inclusive, per R10).
- **Fixtures**: the fixture grammar grows one arm per form —
  by-construction positive examples, so the gate owns every form the
  register names. Ledger discipline unchanged: a form on which the
  engines diverge is a witness, ruled before either engine is edited.
- **Dictionary**: every form is an element-table row (name, spelling,
  plain-language meaning); `explain` renders form verdicts as
  sentences — this is where stratum-(a) capture becomes visible
  semantic reading of other people's code.
- **Spectrum grain (RULED F2, 2026-08-28)**: per construct, with the
  form reporting its maximum — the true Mokhov-style reading, with
  the coarse per-form grade falling out for free (a pipe of `map`s
  is applicative; one `flatMap` makes the chain monadic).
- **Capabilities field (RULED F3, 2026-08-28)**: sorted,
  deduplicated, import-resolved `module.member` strings
  (`effect/Layer.effect`) — alias-free, Effect-native per the naming
  law, canonical-JSON-stable inside gate equality.
- **Manifest version (RULED F4, 2026-08-28)**: `manifestVersion`
  0 → 1 — the register adds a verdict kind to the wire, the first
  real protocol widening, and walks the full dance (revise →
  regenerate → engines → fixtures → gates → ledger).

## 7. Landing order

1. Grill this spec: §3 wire shape, §4 first register, §5 metric,
   §6 rulings.
2. Manifest revision 1: register + element rows + details; both
   projections regenerate.
3. Engines implement `recognizeForm` (independently); fixture arms;
   gate green.
4. Census re-run: first measured coverage + residue report.
5. Loop until dry: residue → new forms → revision → census.
6. Stratum (d) grows separately and deliberately: the next form to
   get a deep reading is chosen from measured coverage, not
   assumed (`gen-service-program` is the obvious candidate — it is
   the store-program frame with capabilities from context).
