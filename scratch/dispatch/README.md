# Dispatch drafts — board-ready issue bodies

Each file here is one issue body for the Multica board (workspace
`Dev`, project `foldlab`), drafted 2026-08-15 from the estate-focus
grill record and reordered the same day by its alignment-grill
addendum (`docs/design/2026-08-15-estate-focus-grill-record.md`). The
issue body is the whole scope; acceptance criteria are mechanical — a
command that exits nonzero when the claim is false, or a committed
artifact that replays — or they are not acceptance criteria.

Order matters (the alignment ruling: exercise the proved thing first,
then prove the unproved step, then the demo):

1. `01-run-the-proved-calculus.md` — the first real protocol session;
   dispatchable now.
2. `02-tyx-authoring-soundness.md` — the lane's first rung: the
   authoring loop proved over TyX; dispatchable now.
3. `03-completion-declaration.md` — the D84 grill + fix; gates 04.
4. `04-ontology-demo.md` — the test bed's acceptance artifact;
   blocked on 03.
5. `05-tyx-referee-grills.md` — three operator decisions, no build;
   gates 06.
6. `06-tyx-referee-engine.md` — the referee's ten work items; blocked
   on 05.
7. `07-moves-vector-wall.md` — Lean-side conformance vectors, refused
   moves included.
8. `08-moves-claim-repairs.md` — dispositions for the 2026-08-15
   audit findings.

The vertical slice (ratified 2026-08-15, operator session; scoreboard
in `SLICE.md`; restaged twice the same day — first by the rigor
ruling banning hand-typed model verdicts, then by the independent
review whose records live in `docs/research/2026-08-15-*.md`) is
dispatched as a staged parent issue on the board —
`00-the-vertical-slice.md` is the parent body (DEV-664); stages open
in order:

- stage 1: `12-total-step-runner.md` (DEV-671) — stepK closes
  MOVES-1. DONE on `agent/codex/DEV-671`; Rev-reviewed; framing
  repairs subsumed by stage 2.
- stage 2: `14-d85-confluence-package.md` (DEV-673) — Branch A
  ratified: absorb semantics + strong no-loss + full confluence
  under a Rev-frozen, hash-pinned Spec.lean with mutant-killers.
- stage 3: `15-daemon-absorb.md` (DEV-674) — D85 on the wire;
  no-self-revision stays as a named Divergence. Brief tightened
  2026-08-15: the serve/replay lockstep obligation, the pair-newness
  and self-revision predicates fixed, reopen-equivalence acceptance.
- stage 4: `07-moves-vector-wall.md` (DEV-670, revised post-review) —
  exhaustive wire-image corpus at post-D85 semantics; the
  hand-authored fixture and its kind leave the estate. The oracle
  emitter and the S7 TS-kernel wall landed 2026-08-15
  (`docs/research/2026-08-15-ts-kernel-conformance-wall.md`); this
  issue extends that machinery, never rebuilds it.
- stage 5: `01-run-the-proved-calculus.md` (DEV-665, above)
- stage 6: `09-author-one-type-on-the-wire.md` (DEV-666) — the
  fill/frontier loop births one real type.
- stage 7: `10-typed-scheme-join.md` (DEV-667) — a scheme hole typed
  by the authored digest, run for real.
- stage 8: `11-codegen-seat-schema.md` (DEV-668) — derived schemas
  validate the session's values.
- lane (blocked on stage 4): `13-online-oracle.md` (DEV-672) —
  unbounded nightly differential against `oracle serve`.

`02-tyx-authoring-soundness.md` rides beside the slice as the proof
lane and never blocks it.

A draft moves to the board by being pasted as an issue; the file then
gains a line naming the issue key. A draft superseded before dispatch
moves to `scratch/_archive/`.
