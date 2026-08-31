# CODEGEN-LEVEL — is the Effect code generation at the level of aggregation?

Status: **STAGED ASSESSMENT — pre-grade**. Written 2026-08-30 on the
operator's question ("are we properly modeling the effect code
generation, or are we not at the proper level of abstraction — my
early desire to always start from the level of aggregation so we can
see the most of what the algebra will give us for free"). Assessment
only; no fixes performed. Evidence measured this session.

## The verdict, in three parts

**1. D2 / the meta plane IS at the right level.** The shape is: a
SMALL, CLOSED description algebra owned in Lean (MetaSchema, seven
constructors, growth only by grill) + one exhaustive interpreter per
target (Lean's JSON-Schema emitter; TS's `toEffectSchema`, where a new
constructor is a type error by `absurd`). Categorically — and this
passes the decision-37 checkability test — MetaSchema is an initial
object and each target is a fold; the "agreement gate" D2 named but
did not build is the COMMUTING SQUARE (Lean's JSON-Schema fold ≡
derive-JSON-Schema ∘ `toEffectSchema`), checkable as a byte gate.
Owning the tiny initial object and interpreting into rich ecosystems
(Effect's own `Schema.AST` is itself a reified description algebra —
the interpreter is a map between description algebras) is the correct
architecture: the source of truth stays ours, small, fail-closed; the
power stays theirs. **The uncollected freebie is the square itself** —
until the agreement gate exists, the two folds can drift and nothing
reds.

**2. The emitter fleet is NOT at that level — measured.** The
Lean→TS printer (`Cas/Backend/Ts.lean`) has three arms —
`const`/`prog`/`raw` — and the fleet leans on the escape hatch:
**41 raw-arm call sites** across `tools/*.lean` this session, with 7
tools files using `Ts.` at all across ~10 emitters. Raw strings are
the un-algebra: each artifact is a bespoke printer, nothing composes,
and "generating CAS APIs for all languages" currently prices as
N artifacts × M languages of hand emitters instead of N data values +
M printers over one algebra. SPEC.md's FE-B7 ("`Ts.Decl` cannot spell
a view", blocking FE-O1/O2/O3 and every components-as-projections
claim) is the same fact seen from the front end.

**3. The estate has THREE description pipelines that do not share the
aggregated object**: (a) MetaSchema + interpreters (right shape,
small); (b) the grammar/schema plane — `cas_struct`/`cas_union` with
`schemaCode`, wire mirrors, `schemas/*.json`, `annotationPlane.ts`
(rich, its own path); (c) the `Ts.Decl`-raw emitter fleet (not an
algebra). The aggregation-first reading: these are three
instantiations of ONE pattern — a described value + folds into
targets — that never had its unification stated. So the algebra
gives less for free than it could: each new artifact buys an emitter,
each new target language buys N emitters, and each cross-pipeline
agreement is a bespoke gate instead of a square.

## What aggregation-first prescribes — consolidation under measure, not a grand mint

The no-new-abstractions instinct and the vision anchor both say: do
NOT mint the grand unified description algebra today. The charter's
tower already names the territory (L2 "Schema as codec … reified
AST"); the move is to consolidate the three pipelines under measured
pressure, collecting a freebie at each step:

1. **Build the agreement gate D2 named** (the commuting square for
   the six described shapes). Small, effects-side + one Lean
   emission; the first cross-pipeline theorem-shaped gate. Freebie:
   drift between the two schema worlds becomes a red gate.
2. **The emitter audit as data**: emit (meta plane style) a ledger of
   what each emitter produces and how much rides `raw` — the 41
   becomes a tracked number with a direction. Freebie: the
   consolidation is driven by a ledger, not taste.
3. **Grow `Ts.Decl`'s arms only under FE-B7's demand** (the view/
   component arm the front end already asked for) — each new arm
   retires raw call sites, measured by the ledger.
4. **State the inclusion** MetaSchema ↪ schema plane as a theorem
   when (1)–(3) create the pressure — the unification arrives as a
   proof about existing objects, not a new object.

## How grand is the theory? — bounded three ways (operator, same day)

Operator: "our language is algebra, we express it via effectful
programs; for now our effectful programs are all in Effect — we
should be able to flow between programs: emit any TS form that has
appeared in a program, and we will at some point consume the entire
Effect library as planned." The theory this demands is NOT
TS-grand; it is bounded three ways, two of them by measurements the
estate already made:

1. **The emission fragment is the closure of OUR OWN emitted forms**
   — an empirical object, not a speculative grammar. The 41 raw
   sites ARE the inventory: const declarations, typed literals,
   Schema combinator calls, records, imports — a couple dozen
   productions of the Effect combinator register, nowhere near
   TypeScript. Close it as a described AST and `Ts.Decl`'s raw arm
   retires against a measured list.
2. **The type level is already reified — by Effect itself.**
   Wherever code is Schema-described, the type-fragment collapses to
   `Schema.AST` values consumed as data ("Effect4 schema has a lot
   of power here" — this is where). We never parse TS type syntax
   for schema-described surfaces; Effect did the reification.
3. **The program level is partial BY MEASUREMENT, and the store
   makes partiality safe.** The prior placement study refuted a
   total Effect-program AST (~35% straight-line; layer half taken by
   G6) — so wild ingestion (the Great Hoovering, OXC) is
   partial-with-residue by ruling, fail-closed on out-of-fragment
   forms. The move that answers "100% fidelity" anyway: **residue is
   CONTENT** — unmodeled forms ride as addressed bytes, and
   emission = fold over the modeled part + byte-identical splice of
   residue. The theory needs to be exactly as grand as the REGULAR
   part, because content addressing carries the irregular part with
   byte fidelity for free. Totality is then EARNED per-form: a
   residue form that keeps appearing in the ledger is a form worth
   modeling, and the ledger says so with counts.

**The continuation reframe (operator, same breath): the 35% bound is
a rung, not a wall.** "Effectful means we model continuations — isn't
that what `cont` is?" Yes, and sharper than that: the model ALREADY
holds arbitrary dependent control flow — `Prog` is the free monad
(`Prog.lean:25-33`, `.vis e k` with `k : response → Prog`, a true
dependent continuation) — and `cont`/`step` are its DEFUNCTIONALIZED
content face, currently at the LINEAR rung (dataflow-sequenced lines,
no branch form). So the placement study's ~35% refuted totality FOR
THE LINEAR RUNG, not for the theory: the technique that expresses the
other 65% is defunctionalization itself (Reynolds — enumerate the
continuations that occur, as data). The ladder, each rung a
decision-40-pattern registry event priced by hoover counts before
minting: linear (landed) → branch-on-answer (a step form whose arms
are cont references — the envelope stays sound as the union over
arms) → bounded iteration/retry with declared policy (fuel already
exists in the worded interpreter) → declared recursion. The TRUE
residue shrinks to its principled core: **arbitrary host closures** —
a lambda only the host can run is genuinely opaque and rides as
content-residue; everything algebra-expressible climbs the ladder as
counts justify. The fragment-frontier ledger therefore tracks CONTROL
forms alongside syntax forms, and decision 16's "fragment tower =
capability ladder" is this exact object, already ruled.

Under these bounds "flow between programs" is literal: our emitted
forms are total (they entered through our doors — re-emission is
projection); hoovered forms are modeled-or-residue with a measured
frontier; and both directions (emit, ingest) are folds through ONE
closed fragment, with round-trip laws as gates (ingest ∘ emit = id
on the fragment; emit ∘ ingest = normalization + residue splice).
The consolidation sequence above gains its target: step (2)'s
emitter audit IS the fragment inventory, and step (3) grows arms
against it instead of taste.

## The unifying observation (the law, not a library)

MetaSchema shapes, the frozen ViewSpec, Q-HOM query specs, MCP tool
rows, and the rules-as-spec rulesets are ALL the same pattern:
**a described value + interpreters, agreement by gates**. The estate
keeps instantiating this correctly one plane at a time. "Start from
the level of aggregation" is satisfied by naming the pattern as LAW —
every new codegen surface must arrive as (closed description, folds,
squares) — while the shared implementation is earned by the
consolidation sequence above, not minted ahead of evidence.
