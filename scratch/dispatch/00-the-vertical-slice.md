# The vertical slice: run the calculus, then type it

Issue: DEV-664 (Multica Dev/foldlab — the slice parent; stages open in order)

One thread that crosses every island, in four staged increments. Each
stage ends in a committed artifact that replays AND a rendering the
operator can see — a report without both is a failed run. The seam
ledger (`SLICE.md`) is the scoreboard: a seam's status changes only in
the commit that adds its artifact.

## The stages (each is a sub-issue; a stage opens when the prior lands)

Order ratified 2026-08-15 after the independent review (design
authority: `docs/research/2026-08-15-*.md`): rigor first, and the
totality fix before the wall so the corpus never freezes the
partiality in.

1. **stepK — the calculus made total on refusal** (closes MOVES-1):
   total step and runner, agreement lemmas pinning stepK to step.
   DONE on `agent/codex/DEV-671` @ a2567773; three-lens Rev review
   passed (nothing false); its framing repairs are subsumed by
   stage 2. Artifact: extended axiom roster + vacuity control.
2. **D85 — absorb semantics + the confluence package, under a frozen
   spec** (ratified Branch A): fills absorb into disputes, confirming
   refills journal their holder (closes MOVES-5), late fills append
   to evidence — making strong no-loss (no escape hatch), full
   meaning/evidence confluence over the wire fragment, schedule-free
   fences, and a complete refusal characterization provable. The
   spec statements are frozen in the issue body; Rev commits
   Spec.lean first and hash-pins it; mutant-killers required.
   Artifact: green gate with every `spec_*` law rostered.
3. **The daemon absorbs** — D85 on the wire: fill-on-disputed
   appends the candidate, evidence append on decided, three-fill
   digest-equality across all orderings; the no-self-revision
   refusal stays as a named Divergence. Artifact: contract tests +
   digest-equality control.
4. **The vector wall, revised**: exhaustive over the wire-image
   fragment, generated and mapped in Lean — executable mapping with a
   typed Divergence enum, the daemon's seat-authority fence proved as
   a FenceRule, closure certificate, two-tier harness with zero
   skips, fixture split, registry + mutation gates. Corpus generated
   against post-D85 semantics. Artifact: generated corpus +
   certificate + mutation map.
5. **Run the proved calculus** — the first real protocol session:
   fills, one staged cross-seat conflict, the synthesized dispute, the
   fence at close. Artifact: session journal + replay command + trace
   rendering.
6. **Author one real type through the wire** — the fill/frontier loop
   births `task.build_report.v1` hole by hole; the operator watches a
   type being born. Artifact: fill transcript + frontier after every
   step + the digest.
7. **The join** — a task-acceptance scheme with `build_report` typed
   by the authored digest; a real session runs against it; a
   bogus-digest control refuses. Artifact: protocol value + journal +
   refusal + trace rendering.
8. **The payoff** — all three codegen targets derived from the digest;
   the derived schema validates the journaled fill value, refuses a
   mutant, and must agree with the daemon's checker; the round-trip
   wall extends to the authored digest. Artifact: three targets + a
   four-forms page (wire JSON / TS schema / JSON Schema / Go).

## The parallel lanes

Authoring soundness over TyX (draft 02) — the theorems for the
type-authoring loop — rides beside the slice and never blocks it.
The online oracle (draft 13, blocked on stage 2) extends the wall to
unbounded nightly differential runs. Models catch up to running
code; the slice never waits on a theorem.

## Rulings served

Proved-but-never-run is un-consumed machinery (2026-08-15 alignment
grill); every increment must be visualizable by the operator; a
report without the artifact is a failed run.
