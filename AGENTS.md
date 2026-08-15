# foldlab agent contract

This file is the single source of truth for repository agent instructions.
Compatibility files such as `CLAUDE.md` only point here.

## The current lane

One question is active: **close the gap between the proved move calculus
and the running daemon.** Two directories carry it.

- `verify/moves/` — the machine-checked kernel. Epistemic state as
  `open | filled | disputed | decided`, three moves (fill, dispute,
  decide), and seventeen gated results — theorems and their negative
  controls — checked in Lean 4.33.0 against the core-clean axiom
  footprint. `verify/moves/run.sh` is the gate.
- `proto/` — the running twin. `flb.protocol.v0` and the protod session
  runtime, which holds that same epistemic state over the Effect runtime
  and NATS.

**The gap is not yet closed, and pretending otherwise is the failure mode
to avoid.** No refinement map exists from daemon folds and events to Lean
states and moves. Lean admits an arbitrary nonempty candidate-set dispute
and an explicit represented-value decision; the daemon synthesizes a
two-candidate dispute from a cross-seat conflicting fill, and fences,
seals, marks unfilled, and records the outcome atomically at close. Those
are different machines until someone writes the map between them. Naming
that map — then proving fill simulation, synthesized-dispute
authenticity, close/fence soundness, and trace-level stability — is the
work. Copying the Lean constructors into Go would hide the abstraction
difference instead of discharging it.

Everything else here is standing evidence, not active work: `packages/`
and `go/` hold the differential walls, `verify/{catalog,ir,implication,
pipeline,replay}/` hold the other model gates. They must stay green.
Touch them only when the lane forces it, and say so when you do.

## Read first

- `CONTEXT.md` — canonical domain language and invariants (seam-level
  only; module vocabulary lives in each module's own `CONTEXT.md`)
- `README.md` — repository layout and runnable claims
- `VERIFICATION.md` — every claim with its rung and its bounds. A claim
  absent from that ledger is not made.
- `docs/adr/` — architectural decisions
- `docs/gauntlet/` — frozen specs, laws, and verification results.
  Disambiguation: inside that directory "climb" names an optimization
  run by a climber agent, not a rung of the verification ladder.

## Scoped contracts

Module directories carry their own `AGENTS.md` (enforceable laws) and
`CONTEXT.md` (module-local vocabulary hidden behind the seam). Read the
scoped files before editing inside: `go/` (substrate), `go/daemon/`
(contract only — the code lives in `proto/` until graduation),
`packages/core/`, `packages/client/`, `proto/` (the tracer bullet, with
its own gates and `DECISIONS.md`), `verify/` (model gates). Performance
work must also follow `bench/BENCH.md`.

## How work arrives and how it leaves

Work is dispatched as issues on the Multica board — workspace `Dev`,
project `foldlab` — not from a queue file in this repository. The issue
body is the whole scope. Anything you notice outside it is reported as
deliberately untouched, never quietly fixed.

- **Your write surfaces are your branch and the dispatching thread.**
  Branch `agent/<your-name>/<issue>`. The primary checkout stays on
  `main`, and no agent seat pushes to `main` — the merge is the
  coordinator's act, and it is the only place two lanes meet.
- **A run closes with a report on the issue**, not with a file only your
  session can read. Findings, caveats, and the untouched list go there.
- **A spec that needs a decision nobody has made is a blocker.** Report
  it. An executor never edits the spec it builds against.
- **Seats are separated on purpose.** Eng builds one issue; Rev reviews
  and posts findings; the operator ratifies. A repair pushed to a pull
  request under review mentions the Rev seat that filed the findings.

## Working precepts

How this repository is worked. Each line is law, not narration.

- **Concepts are ratified before machinery exists.** Grill one decision
  at a time, recommended option first. No build starts on an ungrilled
  decision — un-ratified machinery gets deleted later at higher cost
  than the grilling would have been.
- **Findings before fixes.** A widened-domain or fuzz failure is
  REPORTED with a minimized counterexample and STOPPED on. The red test
  stays red as evidence until the operator ratifies a disposition;
  repairing first destroys the finding.
- **Walls need independent oracles.** Both-sides-agree is not
  verification: two implementations sharing a bug agree, which is how
  `-0` survived until RFC 8785's Appendix B was made the referee. Name
  an oracle outside both sides, or the wall proves only consensus.
- **A prover that cannot fail proves nothing.** Every gate ships its
  negative controls, each refuted on exactly the law it dropped, traces
  committed (`verify/AGENTS.md`).
- **Claims are sized to their evidence.** A rung is claimed only with
  its gate met and its bounds stated, and it is recorded in
  `VERIFICATION.md`. State what a proof does NOT cover: `verify/moves/`
  models one journal over a fixed finite hole carrier and says so — it
  does not model crash recovery, CAS, retries, leases, liveness, the
  Effect runtime, or code/model correspondence.
- **Every task keeps a DECISIONS log**: one entry per decision the spec
  did not fix — decided / alternatives / why / load-bearing flag.
  Numbering rule in `proto/DECISIONS.md`.
- **`scratch/` is tracked** (changed 2026-08-15; it was ignored before).
  It carries the task briefs a fresh checkout needs in order to know
  what landed and why — a brief no agent can read is a brief that does
  not exist, which is how the DEV-663 review lost the Task 48 and 49
  specs it was asked to study. Retired briefs move to
  `scratch/_archive/`, which stays ignored and local. A spec that must
  survive belongs in `docs/` or on the board.
- **The public surface is lawful** (ADR-0010): a function enters a
  library only with the law that licenses it, and ships with the
  generated law tests.

## Effect v4

The workspace catalog pins the whole Effect family exactly to
`4.0.0-rc.108`. The authoritative source is the official release tag at
https://github.com/Effect-TS/effect/tree/effect%404.0.0-rc.108, which resolves
to commit
https://github.com/Effect-TS/effect/commit/bef7bf38ae4b73d5511043f707aed083de5da7cc.

Do not use npm's unqualified `latest` tag for Effect; it currently tracks
Effect v3. Confirm APIs against the pinned declarations in
`node_modules/effect/dist/*.d.ts` and the pinned source above rather than
memory. Schema is `effect/Schema`; do not add deprecated `@effect/schema`.

The pinned release is VENDORED at `repos/effect/` (git subtree, squashed
from the tag's commit above; update via `git subtree pull` at the new tag
when the pin moves). Treat it as read-only reference material: inspect
`repos/effect/` for idiomatic usage, tests, module structure, and API
design, and prefer examples from that source over generated guesses or
web search. `repos/effect/LLMS.md` and `repos/effect/ai-docs/` are the
in-repo orientation docs (upstream copy:
https://github.com/Effect-TS/effect/blob/main/LLMS.md). It is outside
every gate: `bunfig.toml` scopes test discovery to `packages/`, and
nothing may import from `repos/`.

## Non-negotiable rules

- `fixtures/stream-wall.json` is frozen. A digest mismatch means the change is
  wrong unless fixture regeneration was explicitly requested with a stated
  reason.
- Cross-language equivalence is proven by digest-equality walls, never by
  trusting a port.
- Keep the Go module stdlib-only unless a task explicitly requires otherwise.
- Add no TypeScript runtime dependency unless the task justifies it.
- Preserve user changes and avoid unrelated cleanup.
- Line endings are pinned by `.gitattributes`. Identity is bytes here, and
  a checkout that rewrites them rewrites identity — a CR on a `run.sh`
  shebang turns a gate into a "no such file" that reads like a skip.

## Required gates

One command runs the whole battery — root typecheck and tests, the
workspace package scripts, and the `go`, `proto/go`, and `proto/ts` gates
in order:

```bash
bun run gates
```

`bash scripts/gates.sh` and `pwsh -File scripts/gates.ps1` invoke the
same plan, so the Unix and Windows entrypoints cannot drift. Pass
`--self-test` to check the runner still fails when it should.

The model gates are separate and are NOT part of that battery. Run the
one your change touches:

```bash
bash verify/moves/run.sh
```

`verify/{catalog,ir,implication,pipeline,replay}/run.sh` follow the same
shape. The optional wasm wall is `bun run build:wasm && bun test`.
