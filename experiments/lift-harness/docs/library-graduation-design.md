# effect-lift — library graduation design

Human: I dunno why Fable loves getting all serious and dramatic about these kinda things
        but I have to admit I kind of like it and it helps me learn.

Status: AGREED 2026-08-28 (operator, this session): naming rulings
(§1), the graduation shape (§2–§7, §9), and the ratification home
(§8) are all ruled. The record awaits its commit and the letter
amendment (§8) awaits the ratification flow. Companion documents:
[differential-testing-spec.md](differential-testing-spec.md) (suite +
rulings R1–R12 lineage) and
[engine-service-spec.md](engine-service-spec.md) (invocation layer).

## 1. Names (RULED)

- **The lane is `effect-lift`.** One name for the whole interop
  machine. Public sentence of record: *"effect-lift reads
  straight-line store programs out of Effect TypeScript; the Lean
  model gives them their meaning and mints the fixtures both sides
  must agree on."*
- **Public verbs: the backend *emits*, the lift *reads*.** These are
  the direction law's materialize/hoover faces in plain language; the
  law keeps its own names inside law documents, and public surfaces
  speak the plain pair.
- **The target qualifier is Effect-TS** — the ecosystem's own name
  (the upstream GitHub org is `Effect-TS`; bare "Effect" is
  ambiguous in this estate, where `library/effects` is our package,
  not theirs). Spelling law: `EffectTs` in Lean module identifiers
  (no hyphens in module names), "Effect-TS" in all prose, docs, and
  string surfaces.
- **Kept public vocabulary**: refusal, manifest, fixture, gate,
  lift/lifted.
- **Retired from public surfaces** (alive in law docs and experiment
  records only): "recognition" as a lane noun, "harness" at library
  level, "hoover", "census".

## 2. Placement law

`library/` = distributable, Lean or mixed TS/Lean where a runtime
implementation and its model ship together. Two existing homes, no
new package (the one-TS-package constraint is a machine law on this
host: local package links hang bun):

- Lean: `library/cas` — model, data, emitters.
- TypeScript: `library/effects` — the one package; effect-lift
  surfaces as the subpath export `@foldlab/effects/lift`.

## 3. The cut

- **Graduates to library**: the manifest (as a *generated* surface),
  Verdict/Instruction document types and schemas, both engines, the
  engine services and gate, the CLI verbs.
- **Stays in `experiments/lift-harness` permanently**: sieve, NB
  models, census machinery, wild-corpus tooling, the divergence
  ledger's history — evidence instruments at G4 ceiling, hosts free,
  never API. After graduation the experiment imports the library.

## 4. Manifest authority inversion (byte-parity migration)

R11 (interchange) already rules that one manifest owns the protocol
and both surfaces are generated. Today `src/manifest.json` is
hand-authored TS-side. The inversion is adapt-to-existing-bytes:

1. Freeze the committed `manifest.json` bytes as the target.
2. Author the Lean first-order data + emitter until emitted bytes ≡
   committed bytes (a byte gate proves the inversion lossless —
   authority moves, behavior doesn't).
3. `contract.ts` becomes an emitted mirror; the hand-written one
   retires.

AMENDED AT EXECUTION (2026-08-28): the estate already has THE
manifest printer (`Cas.Json.render`, WGR-4 rule 1 — sorted keys,
fixed layout); a bespoke printer reproducing the hand-written layout
would mint a second layout truth. The freeze gate therefore became
**value-parity under the canonical encoding** with layout moving to
the house printer in the same act — strictly the more lawful reading,
and still provably lossless. Executed same day:

- Frozen hand-authored bytes: sha256
  `386dda88057ec5ebf1cf6edf98b40a892cc1320783eb709e861b09d00ac3a516`.
- Lean-emitted bytes (house layout): sha256
  `ff7af389e66bc245bbb9bd14c39d7b9d8da2a5850392a3932ecb94c93d95f36c`.
- Referee: the contract's own `canonJson` judged both value-identical
  under CAS-003 canonical encoding.
- Authority now: `Cas.Lift.manifestV0`
  (`library/cas/Cas/Lift/Manifest.lean`), emitted by
  `lake exe emitlift`, byte-gated in `check:cas`; the differential
  suite (183 tests) green against the emitted manifest.

## 5. Lean tree — `library/cas/Cas/Lift/`

```
Taxonomy.lean    RefusalCode, SpectrumClass, SPECTRUM as data;
                 totality + UNREACHABLE_V0 complement-coverage theorems
Document.lean    Ref / Instruction / Lifted / Refusal / Verdict —
                 stratum-1 first-order types, Described instances so
                 the existing schema/codec machinery covers them
                 (no word field, per R8)
Manifest.lean    rules, enables, candidateDepthMax, natBits, hex
                 domain, pinned detail strings — all data
Canon.lean       verdictKey over canonical-JSON values; round-trips
EffectTs.lean    LAST: the Lean reader for the Effect-TS target;
                 per the translation-validation stance its claims are
                 per-input validations first, never a verified-parser
                 monolith
tools/EmitLift.lean → manifest.json + generated TS surfaces
```

## 6. TypeScript tree — `library/effects`

```
src/cas/generated/lift/   manifest.json, contract.ts, schema.ts —
                          byte-gated, never hand-edited
src/cas/lift/             ck engine, engine services, gate
                          (hand-written; imports generated/ and
                          nothing across the leg line)
src/cas/lift/oxc/         plugin.mjs — self-contained by law; reads
                          manifest.json BYTES, imports no code
bin/                      CLI entries (purity gate covers src/ only)
test/generated/lift/      fixture bundles + expected verdicts
```

Package surface: `@foldlab/effects/lift` subpath export — product
identity without a second package.

## 7. Fixture protocol — every field has one owner

A fixture is `(sourceText, expectedVerdicts, manifestVersion)`:

- **sourceText** — owned by the emit leg: the fixture grammar
  graduates from `.staging/fixture-gen` into Lean data, and fixture
  sources become emitted code. This dissolves the grammar's
  pre-grade status by putting it under the same ratification as
  everything else.
- **expectedVerdicts** — owned by the execute leg: minted by the
  model (by construction from the grammar now; by running the Lean
  reader + reference handler once `EffectTs.lean` exists).
- **The engines own nothing** — they are judged. The gate becomes
  three-legged: differential (ck ≡ oxc) AND conformance (both ≡
  model-minted expectations), ordered and detail-inclusive per R10.

This is the third instance of the estate's two-lane conformance
pattern (Lean lane never edits TS; TS lane consumes ratified
manifests only), not a new invention.

## 8. Versioning and API

`manifestVersion` is the protocol version. Every change walks one
dance: revise Lean data → regenerate (manifest, contract, fixtures)
→ engines tighten → gates green → ledger rows pinned. Public API =
strata 1–2 only: document types, schemas, engine services, the gate
report. The oxc chassis and sieve never enter the public surface
(their tool admissions already say their hosts are free).

RULED (operator, 2026-08-28): the lift's law joins the ratified
store-language letter as its next numbered section — the lift is the
read face of the same language; split authority invites drift. The
amendment to the letter is drafted and lands through the standing
ratification flow, not by this record alone.

## 9. Migration order (each step has a binary observable)

1. Freeze manifest bytes. — DONE 2026-08-28 (digest in §4).
2. `Cas/Lift/` data + `EmitLift` to value-parity under the house
   printer (gate green, zero behavior change). — DONE 2026-08-28:
   `Taxonomy.lean` + `Manifest.lean` + `emitlift` exe, wired into
   `gen`/`check:cas`, all gates green.
3. Generated contract/schema land in `library/effects`; imports flip.
4. Engines, services, CLI move; experiment re-imports the library.
5. Fixture grammar to Lean data; fixtures emitted; three-legged gate.
6. `EffectTs.lean` reader.

## 10. Semantic descriptions (added at operator order, 2026-08-28)

Every element of the recognized Effect-TS surface carries a
plain-language description AS MANIFEST DATA, so programs can be
understood in semantic language and every projection draws one truth:

- LANDED: `Cas.Lift.Element` (name, spelling, description) — ten
  rows covering the captured surface (program frame, store binder,
  binding step, put, node literal, kind version/tag, hex payload,
  ref, return word) — plus a `description` on every rule. Projected
  into `manifest.json` (additive; engines ignore prose) and
  `manifest.md` ("The language, element by element").
- SPECIFIED, NOT YET LANDED — schema annotations: the generated
  Effect Schemas gain `.annotations({ description })` from the same
  Lean descriptions. Finding recorded before implementation: the
  CanonicalSchemaPin suite compares schemas' NATIVE REPRESENTATION
  bytes against Lean-emitted fixtures, and Effect annotations enter
  that representation — so descriptions become part of the pinned
  schema identity, cross-checked on both sides. Right design, but it
  is a `Described`-layer change (description slots in the schema
  data, fixtures regenerate, emitter renders `.annotations`) and
  lands as its own increment through the ratification flow.
- NEXT INCREMENT (the payoff): `explain` — render a lift verdict as
  plain language from the element table (harness helper + CLI verb),
  so a lifted program reads as sentences, not JSON.

## 11. Mints owed to the owning CONTEXT.md (grill before claims)

effect-lift (lane), emit/read (public verbs), Effect-TS / `EffectTs`
(target qualifier + spelling law), plus the testing spec's proposed
terms: form probe, divergence witness, divergence ledger, contract
gap.
