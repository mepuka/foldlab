# machine — the general conformance machine as a Lean 4 library

Status: scaffold, 2026-08-26 (ruling CV-4). The design basis is
[MACHINE-ALGEBRA.md](MACHINE-ALGEBRA.md), committed pre-grade in the
STORE-MODEL precedent; library content lands slice-by-slice only after the
corresponding section grills (estate C4).

- **Toolchain**: pinned via `lean-toolchain` (elan), same pin as the estate's
  other Lake projects. No Mathlib, no external deps by default (estate law).
- **Style**: [Functional Programming in Lean](https://lean-lang.org/functional_programming_in_lean/)
  is the direct reference for library craft; module hierarchy under `Machine/`,
  one namespace, doc-comments on every public surface.
- **Reuse**: `experiments/entity-store-model` and its siblings are the worked
  instance of this algebra (dogfood, ruling CV-3) — reuse their patterns
  (gate blocks, obligation Props, framed encodings, clause-named admission)
  rather than repeating them; divergence from a worked pattern is a note, not
  an accident.
- **Verification posture**: the obligation table (MACHINE-ALGEBRA §8) is the
  slice skeleton — each slice states its obligations before proving them, and
  the gate/ledger discipline follows the estate's standing instruments.

`lake build` from this directory; `mise run check` covers it from the root.
