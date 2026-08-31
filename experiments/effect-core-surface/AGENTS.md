# Effect Core surface and adapter experiment — routing

Status: **SCAFFOLD ONLY**, 2026-08-31

This experiment owns source census, TypeScript adapter, and language-service
instruments for the Effect TypeScript profile. It does not own semantic
meaning, portable protocol identity, or proof status.

- Use exactly pinned `effect`, TypeScript, and `@effect/tsgo` packages.
  Configure `@effect/language-service` as the plugin identity; it is not a
  separately installed or separately versioned package in this TS7 lane.
- Every language-service run proves the exact input file set and fails closed
  on an empty or partial scan.
- Positive fixtures, negative fixtures, and mutants stay distinct.
- Generated rows and vectors are produced only by an admitted generator; do
  not hand-author generated output.
- The neutral protocol lives in `library/effect-protocol/`; the Lean
  relation lives in `formal/effect-core-v1/`.
- A clean diagnostic run contributes source-hygiene evidence only.
- The current `src/` files are empty module stubs. They may not acquire logic
  until the corresponding packet slice and interface are frozen.
