# Effect module style — pointer

This file exists because agent skills reference it by name. The style
authority is the vendored pinned Effect source at `repos/effect`
(see [design-effect-conventions.md](design-effect-conventions.md) for
the full authority order).

Module style, as practiced by the exemplar and adopted here:

- **Flat `src/`, noun-named modules** — `Layer.ts`, `Stream.ts`,
  `Digest.ts`; a module owns its concept's type, constructors,
  combinators, and service tag together. No `utils/`, no `types/`,
  no barrel-of-barrels.
- **`internal/` is invisible** — public modules re-export; consumers
  never deep-import machinery.
- **Curated barrel** — `index.ts` states the public surface; nothing
  else escapes the package.
- **JSDoc with runnable examples** on every public export; the doc is
  part of the surface.
- **Data first** — capabilities travel as values (`Reducer.make`,
  declared algebras); in this repository declaration values
  additionally carry content-address digests.
- **Tests mirror `src/`**; generated law suites sit beside the
  declarations that earn their brands; fixtures are generated only,
  with provenance lines and regeneration diffs (house law).

For `packages/plait` specifically, the binding map is
`docs/design/2026-08-17-plait-architecture.md` §2 — an executor who
finds this file fighting that record reports the finding rather than
silently reorganizing.
