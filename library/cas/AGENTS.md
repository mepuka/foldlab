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

## The store language is ratified law

[EFFECTS-BACKEND.md](EFFECTS-BACKEND.md) (R1–R14, operator-ratified
2026-08-28) governs everything in this lane. The load-bearing rules,
so no session re-derives or drifts:

- Meaning lives in the REFERENCE HANDLER only (`Cas/Lang/Handler.lean`);
  every realization — Effect adapter, replay, transports — is claimed
  against it, and the observation is the WORD (byte-decidable).
- The stable effects API is strata 1–2 of `Cas/Lang/Representation.lean`:
  first-order content (decidable, addressable — what metaprogramming
  touches) and `Prog` (lawful monad, initial — what proofs induct on).
  Handler images are equated only by theorem; host IO only by trust
  statement.
- The direction law: HOOVER (parse pinned sources) is ingestion and
  never mints identity; EXECUTE (run the Lean model) is the only way
  fixtures and words are minted; MATERIALIZE flows denotation → code,
  byte-gated, never the reverse.
- Programs are content; hosts are code (R7). Generated code that
  becomes a program's authoritative home is a defect.

## Standing discipline

- Statements are frozen before proof work; a needed statement change
  routes back through the strategy pass, never through a proof edit.
- No `sorry` lands. No `native_decide`. Executable digest checks run
  as build-time `#eval` IO asserts, never kernel `decide`.
- Everything quantifies over the abstract `H`; premises on `H` are
  named at their lattice level (CAS-003), never assumed silently.
