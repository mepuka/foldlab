---
name: backend-materialize
description: The backend's generation workflow — emitters, byte gates, fragment growth, and registry rows. Use when generating or regenerating TypeScript surfaces, adding a conformance vector, schema fixture, wire mirror, or program, changing a printer or emitter, or when any byte-identity gate goes red.
---

# Backend materialize

Workflow projection; the law is
[EFFECTS-BACKEND.md](../../../library/cas/EFFECTS-BACKEND.md) and the
[store-language](../store-language/SKILL.md) skill. Everything below
runs from `library/cas` unless noted.

## The emitters and their gates

| Emitter | Regenerates | Gate |
|---|---|---|
| `lake exe vectors` | `vectors/*.json` (store words) | `--check` in `check:cas` |
| `lake exe schemas` | `schemas/*.json` (schema payloads) | `--check` in `check:cas` |
| `lake exe verdicts` | `conformance/schema-verdicts.json` (the cross-door verdict corpus) | `--check` in `check:cas` |
| `lake exe admissionmap` | `conformance/admission-map.json` (per-node admission dispositions) | `--check` in `check:cas` |
| `lake exe emitgate` | `SchemaAdmission.ts` in effects `src/cas/generated/` (the admission table the host enforces) | `--check` in `check:cas` |
| `lake exe emitwire` | generated wire mirrors in effects `src/cas/generated/` | `--check` in `check:cas` |
| `lake exe emitlayers` | `EmittedLayers.ts` in effects `test/generated/` | `--check` in `check:cas` |
| `lake exe materialize` | the materialization fixtures | `--check` in `check:cas` |
| `lake exe emitlift` | the lift manifest and rules | `--check` in `check:cas` |
| `lake exe emitgrammar` | the grammar manifest and `REGISTRY.md` | `--check` in `check:cas` |
| `lake exe emitprograms` | generated Effect programs in effects `test/generated/` | `--check` in `check:cas` |
| `lake exe mcpspec` | `mcp/cas-tools.json` (the R11/R15 MCP manifest) and `McpToolCodes.ts` in effects `src/cas/generated/` (the same rows as the typed table `bin/mcp/tools.ts` serves) | `--check` in `check:cas` |
| `lake exe surface` | `surface/cas-surface.json` (the report lane: per-declaration signatures, doc coverage, per-theorem axiom reports, axiom census) | `--check` in `check:cas` |
| `lake exe obligations` | `surface/cas-obligations.json` (the obligation ledger: the named obligations written in the docstrings, plus the health counters) | `--check` and `--self-test` in `check:cas` |
| `lake exe laws` | `surface/cas-laws.json` (the law index: the ruling registry joined to the `LAW SM-<n>:` lines the enforcing declarations carry) | `--check` and `--self-test` in `check:cas` |
| `lake exe envledger` | `docs/lab-core/ENVIRONMENT.json` (the configuration plane: mise tool pins and task graph, every `lean-toolchain` pin, each `[[lean_exe]]` joined to the task driving it and the `--check` line gating it) | `--check` in `check:cas` |

`mise run gen` runs all regenerations; `mise run check` asserts a
clean tree after. A red byte gate means regenerate and READ THE DIFF —
the gate catching a printer or code change is the discipline working,
never an obstacle to bypass.

## Adding a registry row

- **Vector / program**: add the grammar term to
  `Cas/Vectors/Registry.lean` (ONE source — vectors and programs both
  lower it), register in `tools/Vectors.lean` and
  `tools/EmitPrograms.lean`, regenerate, then run the effects suite —
  the replay and the live run gate must both go green.
- **Schema fixture**: register the code in `tools/Schemas.lean`; the
  TS pin test (`CanonicalSchemaPin.test.ts`) must mirror it by hand —
  the hand mirror IS the cross-check, never generate it from the same
  side.
- **Wire mirror**: add to `tools/EmitWire.lean`'s registry; emission
  order is sharing order (later codes factor through earlier names).
- **MCP tool**: add the row to `Cas/Backend/Mcp.lean`'s `tools` and
  bump `manifestVersion`; `lake exe mcpspec` emits the JSON manifest
  and the typed TS table together, so the host gains the row by
  regenerating. Its params/result codes must stay inside the fragment
  `tools/EmitMcp.lean` lowers (null, boolean, integer, string, array,
  struct) — a code outside it fails that tool's `#guard` rather than
  emitting a module whose declared type is a lie. On the host side,
  only the CARRIER (the Effect Schema and the handler) is written by
  hand.

## Theorem modules and the walk

`tools/Walk.lean` hard-codes `libraryImports` — a new module is
INVISIBLE to the surface, obligation, and law ledgers until its name
is added there. Two devices keep theorem work from moving bytes and
are both legitimate, disclosed in the packet: a module inside an
existing glob (`Cas.Backend.*` rides `CasBackend`) or its own
`[[lean_lib]]` in `defaultTargets` (`CasWp` is the precedent). Either
way the promotion into the walk is a separate, deliberate act — the
ledgers gaining the theorems is a diff someone reads, never a side
effect. Contract packets live in `contracts/`, attack records in
`contracts/attacks/<ticket>/`; both stay outside every lib target.

## Fragment and printer rules

- The TS fragment (`Cas/Backend/Ts.lean`) grows ONLY with a real
  consumer; full-TypeScript ambition is refused.
- Layout is the emitter's explicit choice (`object` inline-capable vs
  `objectML` one-per-line) — never a width heuristic, never an
  external formatter.
- `Style` values are content (`house0` transcribed from the package's
  look); a style change is a deliberate successor, one honest diff.
- Generated files carry the GENERATED header and are never
  hand-edited; a needed change routes through the emitter.

## Authoring surfaces

- Kinds: `cas_struct` (`Cas/Schema/Notation.lean`) — one declaration
  yields structure + `Described` instance + raw schema.
- Programs: smart constructors + `bind` (pure discipline R14a);
  effect-free work stays outside `Prog`.
- New Effect target forms beyond the five seeds: mechanically
  ingested (R8), never hand-transcribed.

## Done means

Green `mise run check:cas`, green effects suite (typecheck, tests —
pin + replay + run gates), clean tree after `mise run gen`.
