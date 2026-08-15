# The completion declaration: retire D84's hardcoded hole name

## Why now

D84, the operator's verdict verbatim: garbage fluff. The close-outcome
rule keys on the literal hole name `decision`
(`protocol_session.go`), so every protocol scheme other than task
acceptance closes `abandoned` silently. The ontology test bed (issue
04) is exactly the second scheme FINDING-49-COMPLETION predicted would
make the debt due. Grill first, then build — the record shape is
cataloged, so this is a spec decision, not a patch.

## The grill (operator, before any code)

What a protocol declares about its own completion. Recommended:
`flb.protocol.v0` gains a required `completion` field naming the
outcome-bearing holes; close records `completed` exactly when every
named hole is `filled` or `decided`, `abandoned` otherwise; validation
refuses a protocol whose completion names an undeclared hole.
Alternatives to put on the table: a per-hole `required` flag; a
declared outcome expression; keeping `decision` as a reserved
convention and refusing protocols without it. Record the ruling with
its D-number and a `SUPERSEDED BY` line on D84.

## The build (after ratification)

1. `protocol.go`: the field, with create-time validation.
2. `protocol_session.go`: both close-outcome sites derive from the
   declaration; the hole-name literal is deleted.
3. The bootstrap task-acceptance protocol declares
   `completion: ["decision"]` — its behavior is unchanged, and its
   new canonical bytes mean a NEW scheme digest: record the migration
   note (the issue-01 artifact remains valid history under the old
   digest; journals are immutable).
4. `proto/wire/fixtures/protocol-moves.json` vectors extended: a
   protocol with a non-`decision` completion closing `completed`, and
   one with an unfilled completion hole closing `abandoned`.
5. `CONTRACT.md`: the D84 caveat replaced by the declaration's
   contract.

## Acceptance (mechanical)

- `bun run gates` green; the new vectors pass in Go AND TS.
- A vector demonstrating the old defect (non-task-acceptance scheme,
  outcome-bearing hole filled) now closes `completed`.
- Grep proves the literal is gone: `"decision"` appears in
  `protocol_session.go` zero times.

## Pointers

`proto/DECISIONS.md` D84 (and the numbering rule for the new entry);
`scratch/codex/49-protocol-v0.md` §FINDING-49-COMPLETION;
`proto/wire/CONTRACT.md` §flb.protocol.v0.
