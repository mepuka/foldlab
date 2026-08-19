# Dispatching agent fleets for verified-artifact work

Parallel agents are a multiplier on the verified-codegen discipline,
not a substitute for it. The pattern below ran three production
dispatches (5, 3, and 4 opus lanes) with zero merge conflicts and
zero silent contract drift; each rule exists because its absence has a
concrete failure mode.

## Two fan-out shapes, don't mix them

- **Perspective fan-out (before building).** One question, several
  agents, each assigned a forced-distinct lens (e.g., instance-
  discharge / translation / adversarial / precedent), explicitly told
  not to coordinate and to commit to their lens even where it loses.
  Convergence across independent lenses is strong signal; divergence
  is your decision list. Use for design-space mapping; deliverable is
  memos plus structured digests, never code.
- **Territory fan-out (building).** Several agents, one frozen
  contract, disjoint file territories. Use when the work decomposes by
  file boundary. Never dispatch build agents whose territories
  overlap "just a little" — a shared file is a merge conflict you
  scheduled.

## The rules of a territory dispatch

1. **Freeze the contract yourself, before fan-out.** The interchange
   schema, byte-precise, in the shared brief. Lanes build against the
   freeze, not against each other; a lane that needs another lane's
   output mid-flight writes its own freeze-conformant sample and the
   integrator swaps in the real artifact. State which lane is
   normative where the freeze is silent. (Proof this works: two lanes
   independently produced byte-identical closed-vocabulary records —
   72/72 — from the freeze alone, before either saw the other's
   output.)
2. **Exclusive territories, one writer per file.** Enumerate each
   lane's paths explicitly, including who alone writes any shared
   artifact file and which paths are read-only to everyone (assert
   read-only mechanically in the gate, not socially in the prompt).
   Include "do not run git add/commit/push — the coordinator
   integrates" in every brief.
3. **Structured returns with evidence.** Require a digest schema:
   summary, files_touched, verification (the exact commands run and
   their ACTUAL quoted output lines), open_items, risks. The
   verification field is the load-bearing one — "a report without the
   run is a failed run," and requiring quoted output converts lane
   claims into checkable statements. open_items is where honest
   incompleteness goes instead of into silence.
4. **House-idiom mining is part of every lane's brief.** Tell lanes to
   read the existing gates, generators, and conventions in their
   territory FIRST and match them exactly (script pairs, test
   runners, naming, trace formats). Fleet output that ignores local
   idiom creates integration debt the coordinator pays.
5. **Falsifiability is in the acceptance criteria.** Every lane's
   brief includes its mutant controls and probes, and its digest must
   show them firing. A lane that returns only green has not finished.

## The coordinator's integration duty

Lane reports are testimony; your runs are evidence. After all lanes
return: read every digest including open_items and risks; perform the
reconciliations they name (swap samples for real artifacts, regenerate
downstream generated files, resolve the freeze's silent points in the
spec's reconciliation table); then re-run EVERY gate and test suite
yourself and quote the outputs; then commit as one coherent change
with a message that says what is claimed and what is not. Surface the
decision points lanes raised (and the ones you see) to the owner as an
explicit list — integration resolves mechanics, not policy.

## Sequencing discipline

- Never dispatch into occupied territory. If new work lands on files a
  running lane owns, queue it as the next slice and write its spec
  now — spec-writing needs no territory.
- Slices stack: each dispatch consumes the integrated, gate-green
  output of the previous one. Resist the mega-dispatch; three small
  integrated slices beat one large unintegrated one, because every
  integration point is where the coordinator's own verification
  actually runs.
- Right-size the fleet to genuine decomposition: 3–5 lanes when the
  file boundaries are real; 1 agent (or none) when they are not.
  Parallelism spent on artificial splits returns merge friction, not
  speed.
