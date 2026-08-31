# library/effects — lane routing

The Effect-TS host of the store language. Semantics flow FROM the
Lean estate: interaction and schema/interop semantics originate in
`library/cas`, and generated surfaces here (`src/cas/generated/`) are
byte-gated projections — never authoritative homes (R7: programs are
content, hosts are code).

## Spec corpus

Indexed with decision record in [docs/SPECS.md](../../docs/SPECS.md).
Binding: [EFFECTS-BACKEND.md](../cas/EFFECTS-BACKEND.md),
[SCHEMA-MATERIALIZATION.md](../cas/SCHEMA-MATERIALIZATION.md).
Distribution and release posture: [PACKAGING.md](PACKAGING.md) (what
the package is as a distributable, what flips at publish time, the
Windows honesty list) and [RELEASING.md](RELEASING.md) (the gate
sequence a release runs).
Active designs touching this lane:
[PLAIN-LANGUAGE](../../.staging/operational-structure/PLAIN-LANGUAGE.md)
(emitter inventory E1–E6),
[INGESTION-HARNESS](../../.staging/operational-structure/INGESTION-HARNESS.md)
(the harness map and program-ingestion path).
The pre-grade [Effect Core v1 packet](../../.staging/effect-core-v1/README.md)
owns the full public-surface/reification study. Its
[reification checklist](../../.staging/effect-core-v1/REIFICATION-CHECKLIST.md)
requires recursive export/member/overload closure, profile-specific proof
rows, and exact TS7 `@effect/tsgo` file-set coverage. Language-service output
is source-hygiene evidence only; it never defines the Lean semantics.
Serving plane (how `cas serve` and `cas daemon` are run, secured, and
observed): [SERVING.md](SERVING.md) — Category 1 since decision 32(b),
and it lives here rather than under `docs/lab-core/`; the wire
authority remains [PROFILE-CAS-HTTP-0.md](PROFILE-CAS-HTTP-0.md).

## Lane rules

- Effect 4 idioms to their fullest; code quality and interaction
  semantics are paramount — a tool teaches by use.
- Tests run through the configured runner: `bun run test` (vitest).
  Never bare `bun test` on vitest files.
- Generated files are edited only by their Lean emitters; a hand edit
  to `src/cas/generated/**` is a defect.
