# library/cas — lane laws

Operator-ordered, 2026-08-28.

## The two-minute rule

If you cannot make progress on a proof for two minutes, STOP. Do not
grind the same tactic against the compiler. Immediately:

1. look up the standard literature and prior art (mathlib, Batteries,
   core Lean source, the pinned reference clones in `.reference/clones/`);
2. use the skills — `lean` (llm-proof-loop), the `lean4` plugin agents
   (proof-repair, sorry-filler, golf), and their LSP tools
   (`lean_goal`, `lean_diagnostic_messages`, `lean_multi_attempt`,
   loogle/leansearch);
3. anything else that puts an existing determination on the table
   before another blind attempt.

Bit-level and encoding machinery is never hand-derived when a proved
determination exists somewhere citable — import it, credit it, pin it.

## Standing discipline

- Statements are frozen before proof work; a needed statement change
  routes back through the strategy pass, never through a proof edit.
- No `sorry` lands. No `native_decide`. Executable digest checks run
  as build-time `#eval` IO asserts, never kernel `decide`.
- Everything quantifies over the abstract `H`; premises on `H` are
  named at their lattice level (CAS-003), never assumed silently.
