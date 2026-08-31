# LOOP — the model-scout run, operational form

Status: **STAGED PROCEDURE — pre-grade, operational by hand**. Written
2026-08-30 to operationalize [IMPLEMENTATION-PLAN.md](IMPLEMENTATION-PLAN.md)
without building the `ModelScout` code surface: the CAS APIs are not ready
to host it (operator, 2026-08-30), so the loop runs as agent procedure over
tracked files. Vocabulary ("model scout", "outcome bank", finding statuses)
is provisional per [SOURCE-STUDY.md](SOURCE-STUDY.md); nothing here mints a
term, stamps a gate, or admits a tool. Grilled 2026-08-30 — verdicts in
[GRILL.md](GRILL.md).

The run store is files: the bank
([BANK.md](BANK.md), [bank/](bank/)), the run ledger
([runs.md](runs.md)), the benchmark packets ([bench/](bench/)), and the
cheap-model harness ([ANNOTATE.md](ANNOTATE.md)). When the coded kernel
lands (MGS-001+), these files are its seed data — every record here is
written so it can be lifted into that store, not rewritten.

## Where the scout sits

The estate's development process is the proof-driven loop
([implement](../../.claude/skills/implement/SKILL.md)): a **breaker**
writes the contract packet (CATEGORIES / REQUIRES / ENSURES / DECREASES /
FRAME / FALSIFIER + red battery), an **implementer** consumes it, and the
two never share a session. The scout is a THIRD position, before and
beside the breaker:

```
contract intent → [scout] → breaker packet → implementer → gates → lean lane
```

The scout spends a small fixed budget gathering ingredients the breaker
and prover would otherwise buy with expensive attention:

- likely obligation families for the slice;
- atomic candidate invariants and helper-lemma shapes;
- concrete counterexamples and negative cases;
- clauses, fields, and transitions the draft spec does not constrain;
- unresolved obligations ranked by expected value.

**Role fence.** The scout is neither breaker nor implementer. It never
writes or edits a contract packet, never edits a frozen statement or an
assumption to make a candidate survive, and never touches production code
or the battery. Its whole output is intelligence: bank entries,
counterexamples, a handoff note. A scout finding enters a packet only by
the breaker choosing to take it.

## The run

One scout run has a target (a slice, a draft contract, a suspect law), a
frozen snapshot, and a budget. Steps:

### 1. Freeze the target

Record in the run note: repo commit (plus dirty-file list if the working
tree matters), the target files/declarations, the draft contract or
intent sentence, and the budget (defaults below). A run against a moving
target is not replayable and does not count for the ledger.

### 2. Draw the obligation mini-graph

Before any model call, answer on paper (the seven questions):

1. What values or states are admitted?
2. What must hold initially?
3. What must every operation preserve?
4. What is forbidden on failure, interruption, retry, or replay?
5. What must be exact, distinct, canonical, or invertible?
6. Which observations tie model to implementation?
7. Which assumptions and bounds are in play?

Each answer names its obligation family
([BANK.md](BANK.md) §Families). "Prove everything" is decomposed here,
before any search.

### 3. Bank templates first — deterministic, free

For each named family, open its bank file and instantiate its
templates against the target's carriers. These candidates cost
nothing and carry the bank's outcome history. Also collect the family's
known counterexamples — a past counterexample that applies is a finding
already.

### 4. Cheap-model candidate batches

Four batches from `gpt-5.6-luna` via the
[annotate harness](ANNOTATE.md) (`candidates` mode), schema-constrained:
atomic candidates only — one predicate or lemma shape per item, each with
`family`, `whyUseful`, `expectedFalsifier`, `dependencies`. Give the model
the frozen target, the obligation mini-graph, applicable bank entries,
and known counterexamples. Normalize and deduplicate structurally before
counting anything as new.

### 5. Score against the real target, then select

A candidate can be true and useless. For every candidate `I`, check the
actual obligations separately where an executable lane exists
(`fast-check` on the host, `decide`-style enumeration in Lean where the
carrier is finite):

```
initialization:  Init(s)               ⇒ I(s)
preservation:    I(s) ∧ Step(s,a,s')   ⇒ I(s')
target utility:  I(s) ∧ Exit(s)        ⇒ Goal(s)
```

Select Houdini-style: run the conjunction of survivors, drop the clauses
a counterexample blames, repeat until stable. The model proposes and
ranks; checkers decide. Record WHY each candidate was selected, refuted,
redundant, unsupported, or left inconclusive.

### 6. Counterexample-informed second wave

Feed the minimal counterexamples from step 5 back into up to four more
luna batches. Counterexamples are the strongest prompt material the run
produces; spend them.

### 7. Repair narrowly, escalate once

If a valuable candidate or proof fragment stalls: up to three local
repair attempts on the earliest failing fragment only — checked prefix
preserved, whole artifact rechecked after (the
[lean llm-proof-loop](../../.claude/skills/lean/SKILL.md) discipline owns
proof repair; the scout hands off rather than duplicating it). After
that, at most one `gpt-5.6-sol` planning call for the single
highest-value unresolved node — it may propose a decomposition, never a
weakened statement.

### 8. Attack the specification, not just the proof

Before reporting survivors as adequate, perturb the spec and watch what
notices (the CAV-2001 move):

- negate or drop each assumption and property clause;
- perturb referenced fields, transitions, and failure paths;
- delete each negative example and confirm something fails;
- find at least one ordinary witness for the base model (vacuity check).

A perturbation nothing notices is a finding: uncovered region, redundant
clause, or blind spec. These land in the handoff note as adequacy gaps.

### 9. Stop

Stop the run when ANY of:

- a minimal decisive counterexample settles the question;
- two successive batches add no new normalized candidate;
- the selected set closes the target obligations;
- remaining work is unsupported by current lanes; or
- the budget is exhausted.

Budget exhaustion is an ordinary outcome: report everything committed so
far, never round up.

### 10. Write back — the run is not done until the ledger says so

1. **Run row** appended to [runs.md](runs.md) — date, target, budget
   spent (wall, operator minutes, luna/sol calls), candidate counts
   (proposed / deduped / refuted / selected), counterexamples found,
   outcome class.
2. **Bank curation** per [BANK.md](BANK.md): every counterexample and
   every selected pattern lands in the bank or in a fixture proposal;
   none may survive only in a model transcript.
3. **Handoff note** for the breaker (or the operator): selected
   candidates with reasons, counterexamples in replayable form, adequacy
   gaps, ranked unresolved obligations. The note offers; the breaker
   disposes.

## Budget defaults (v0 — calibration values, ledger moves them)

```
bank templates                 always, first, free
luna candidate batches         4
counterexample-informed wave   4
local repair attempts          ≤ 3
sol planner calls              0 default; ≤ 1 on a high-value stall
```

Eight batches is the plateau probe from the source study, not a house
constant; the run ledger exists to move these numbers with our own data.

## Evidence discipline

Working statuses for findings: `proposed`, `refuted`,
`sampled-survivor`, `bounded-survivor`, `checker-accepted`,
`lean-theorem`, `inconclusive`, `unsupported`. Rules:

- Statuses are working language, not claims. Mapping to the claim
  ladder ([CLAIM-GATES](../../docs/effect-typescript-semantics/CLAIM-GATES.md)):
  sampled survival is G4-shaped sampled evidence at best;
  `lean-theorem` may be written only when the lean lane holds the
  kernel-checked theorem with axiom report (G1) — the scout itself
  never stamps a gate.
- `checker-accepted` never appears bare: it names its checker inline,
  `checker-accepted(byte-gate)` — the status is only as strong as the
  named lane (grill 2026-08-30).
- No promotion by folding: a weaker status never becomes a stronger one
  without the stronger check actually running. Cached success never
  closes anything; fresh recheck does.
- The scout does not say "verified" — it says what was refuted, what
  survived a named scope, what a named checker accepted, and what still
  needs a theorem (C5).
- Every model-sourced item carries its provenance (model, date, receipt
  pointer per [ANNOTATE.md](ANNOTATE.md)); model output has an empty
  trust contribution always (TOOLS.md, LLM-harness row).

## Why the ledger matters

The plan's adoption bar is measured: ≥20% median human+machine
cycle-time reduction on a blinded bank, no adequacy loss, before the
scout becomes default machinery. Until the coded kernel exists, the run
ledger IS the measurement apparatus — every hand run recorded here is a
baseline or treatment observation for that decision. A run that skips
its row weakens the only evidence that can ratify (or kill) this lane.
