# scratch — briefs and experiments, tracked

This directory used to be gitignored, on the theory that an executor
handoff queue is disposable. It is not. The DEV-663 familiarization run
was asked to study the Task 48 and 49 briefs, found `scratch/` absent
from its checkout, and had to reconstruct the lane from commit messages
and decision logs. A brief no agent can read is a brief that does not
exist, so `scratch/` is tracked as of 2026-08-15.

What belongs here: the brief for work that is live or recently landed,
and small experiments whose results a live brief cites. What does not:
anything another agent must be able to find later without knowing it
exists. That goes in `docs/` or on the board.

## Live

- `dev807/` — the DEV-807 tripwire finding: the canonical number domain is
  ruled twice, in opposite directions. `FINDING-CANON-DOMAIN-001.md` is the
  finding, the three scripts beside it are re-runnable evidence, and the
  collapse the ticket dispatched was not performed. OPEN, awaiting the
  operator's grill.
- `codex/48-moves-model.md` — the brief that produced `verify/moves/`.
  Its "reference implementation" section points at `meaning-scheduler/`
  below and restates the semantics in full, so it stands alone.
- `codex/49-protocol-v0.md` — the brief that produced `flb.protocol.v0`
  and the protod session runtime in `proto/`.
- `meaning-scheduler/` — the E2 experiment the Lean model is the twin
  of. `journal.ts` `step` is the reference the model was built against;
  `PREREGISTRATION.md` and `RESULTS.md` are the record. Predecessor, not
  authority: where the two disagree, `verify/moves/` is the ratified
  shape and the divergences are listed in its README (the `decide`
  membership guard is the one to know — the model checks candidate
  membership, this toy does not).

Both briefs are landed work. They are kept as the record of what was
specified versus what shipped, not as instructions to execute again.

## Retired

Briefs 01–47 and the Remotion explainer project moved to
`scratch/_archive/` on 2026-08-15. That directory is gitignored and
local to this machine — it was never in git history, so it exists on the
operator's disk and nowhere else. `proto/DECISIONS.md` cites a few of
those paths (tasks 14, 15, 46); those citations resolve only there.

## Where work comes from now

The Multica board — workspace `Dev`, project `foldlab`. The issue body
is the scope; see `AGENTS.md`, "How work arrives and how it leaves". No
queue file in this directory dispatches anything, and the old
`codex/README.md` that tried to (with a "GROUND TRUTH" section
correcting the statuses printed above it) is archived rather than
maintained.
