# The API principles, distilled, with citations

- **One AST, projected three ways** — the grammar is stated once and
  every surface derives from it: docs/design/2026-08-18-plait-kernel-algebra.md
  §5.6; the shipped projections verify/kernel/projections/{kernel.ts,
  tools.schema.json, prose.md} are the existence proof that 100%
  fidelity projection is achievable (tsgo+tsc green; flat 8-tool MCP
  surface; prose register).
- **Served-equals-derived** — a rendered surface (tool list, doc,
  command tree) must be derived from the cataloged source; hand-written
  twins are refused (kernel record §8 rows 3 and 17; the projection
  wall KM-13: hand-derived sketches are temporary until an emitter +
  byte-compare gate lands).
- **The expressibility principle (AE-8, pre-grill)** — every public
  function names the algebraic expression it stands for; fluent
  surfaces are generated sugar over terms. Grill-ready statement in
  docs/design/2026-08-18-storage-stack-and-expressibility.md §7
  (pending operator ruling; treat as proposed, cite not assert).
- **Refusals teach** — reason · law · repair, with machine-applicable
  marking; an API that has never refused anyone teaches nothing
  (prose projection "Refusals teach"; KM-20/21 merged: intrinsic vs
  door-relative routing is theorem-backed at roster 79).
- **Effect first-class** — operator ruling 2026-08-18; the estate law:
  idiomatic Effect everywhere, @effect/cli for CLIs, high-severity
  lens in all reviews. The CLI rewrite ticket (DEV-786) is the
  reference application.
- **Rung⇒carrier** — a fold reads the deepest quotient its algebra
  respects; brands make it a type error (KM-17; the reorg spec §4.4;
  storage record §4.3).
- **Plane layering** — truth/kernel/planes/carriage/surface with
  one-direction imports (ratified reorg spec
  scratch/dispatch/2026-08-18-plait-plane-reorg-spec.md §2-§3).
- **Two-plane ingress for anything that accepts content** — one
  digest per content (identity), kinded attributed events per saying
  (meaning); claims tier for untrusted utterances
  (scratch/research/2026-08-18-cas-motion-and-ingress.md §3).
