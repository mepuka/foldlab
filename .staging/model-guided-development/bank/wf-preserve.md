---
id: WF-PRESERVE
version: 2
carriers:
  - "Word / Store (CAS)"
  - "defunctionalized program state (PProg run)"
applicability:
  - "Does the target define or thread a well-formedness predicate (wf, Closed, Valid)?"
  - "Does any operation construct a new state from an admitted one?"
templates:
  - name: step-preserves
    form: "wf(s) ∧ step(s, op, s') ⇒ wf(s')"
  - name: run-preserves
    form: "wf(s) ∧ run(s, prog) = s' ⇒ wf(s') (lift of step-preserves through the fold)"
  - name: constructor-establishes
    form: "wf(init) — the base case; without it preservation is vacuous"
  - name: failure-retains-wf
    form: "wf(s) ∧ step(s, op) = (refused | failed, s') ⇒ wf(s') — preservation on the failure paths, not only success (curated from luna 2026-08-30, receipt db94d656)"
falsifiers:
  - name: skip-admission-check
    mutation: "admit one raw value without its check (mirror of MRK018-style mutants)"
    detects: "a wf predicate too weak to notice the unchecked field"
checkers: [fast-check, lean-decide, manual]
claimCeiling: heuristic
---

# WF-PRESERVE

Well-formedness holds initially and every operation preserves it. The
estate proves this per language layer — the pattern ladder is itself a
reusable shape ([patterns.md](patterns.md) PT-001).

## Sites

- `library/cas/Cas/Lang/Interp.lean:119` `step_preserves_wf`; `:163` `run_preserves_wf` — Lean theorems
- `library/cas/Cas/Core/Admission.lean:275` `put_fresh_closed` — fresh put preserves store well-formedness
- `library/cas/Cas/Lang/Worded.lean:144,197` `stepWorded_preserves_wf` / `runWorded_preserves_wf`
- `library/cas/Cas/Lang/Roots.lean:94` `stepRooted_preserves_wf`
- `library/cas/Cas/Lang/Defun.lean:368` `runP_preserves_wf`
- Archived origin of the family name: `library/effects/archive/lean-model-0.3/Effects/Replay/Session.lean:16` (SES-002); registry `.../Effects/Conformance/Registry.lean:72-79`
- Design target: `library/effects/IMPLEMENTATION-PLAN.md:582`

## Positive examples

(pending curation)

## Negative examples

(pending curation)

## Implication examples

(pending curation)

## Counterexample history

(none yet)

## Outcome history

- RUN-002 (2026-08-30, scout): RefsOk join transport selected (the T3
  kernel, handoff item 4) plus adequacy gap AG-1 — nothing enforces
  closure at a raw byte-plane union; the join door owes per-object
  read-law verification or a closure re-check (feeds decision 35's
  landing); see [../runs.md](../runs.md).

## Annotations

gpt-5.6-luna 2026-08-30, receipt `db94d656…` (annotate lane, first live
run; full JSON in local `annotate/out/family-wf-preserve-*.json`).
Grounded in its own repo read (it surfaced `SessionState.WF`, the `n.WF`
put branch, fuel-status outcomes — none were in the prompt). Distilled,
awaiting curation beyond the one promotion noted in frontmatter:

- Applicability adds: "does a fold/recursive runner carry intermediate
  states that must stay wf?"; "does the target keep a state component on
  refused/failed/out-of-fuel outcomes?"
- Falsifier adds: `load-mutates-state` (make a read operation append or
  alter a binding — detects preservation scoped only to writes);
  `runner-drops-preservation` (recursive run continues without threading
  the step-preservation fact — detects single-step-only preservation);
  `failure-corrupts-state` (refusal returns a mutated state — detects
  success-only preservation); `unchecked-resident-reference` (fresh
  address collides with an existing resident reference).
- Negative-example adds: a put input whose node is not `WF` (the put
  step branches on `n.WF`); a replay session whose cursor exits recorded
  history.
- Proposed carrier extension: `SessionState.WF` (replay plane) as a
  WF-PRESERVE instance alongside Word/Store.

## Open questions

- Which wf predicates exist but have NO preservation theorem yet? A scout
  sweep listing `wf`-like predicates minus `*_preserves_*` theorems would
  yield candidates for free.
- (luna) Boolean `Word.wf = true` vs propositional `Store.Closed` — record
  both preservation forms, or normalize to one?
- (luna) `run-preserves` should quantify fuel explicitly and keep the
  returned state component when the runner can answer `running`.
- (luna) Should `SessionState.WF` join the carriers list? (Replay plane —
  check against the archived-surface ruling before adding.)
