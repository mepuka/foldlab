---
id: EXACT-STEP
version: 2
carriers:
  - "Prog interpreter step"
  - "put outcome (fresh / duplicate / conflict)"
  - "fuel accounting (runP)"
applicability:
  - "Is an operation's effect specified as exactly-this (consume one op, one outcome case, exact fuel)?"
  - "Is there an exhaustive case split over outcomes that must stay exhaustive?"
templates:
  - name: consumes-exactly-one
    form: "step consumes exactly one operation of the program, no more"
  - name: outcome-trichotomy
    form: "put(s, v) lands in exactly one of {fresh, duplicate, conflict}, each with its exact spec"
  - name: exact-fuel
    form: "run uses one step per line plus one closing step — fuel exact, not merely sufficient"
falsifiers:
  - name: double-consume
    mutation: "make the step consume two ops (or zero) on one path"
    detects: "a spec that only bounds the step from one side"
  - name: collapse-outcomes
    mutation: "merge duplicate and conflict outcomes"
    detects: "callers that never distinguished them (uncovered spec region)"
checkers: [lean-decide, byte-gate, manual]
claimCeiling: heuristic
---

# EXACT-STEP

An operation's effect is exactly its specification — no more, no less.

## Sites

- `library/cas/Cas/Lang/Interp.lean:66` `step` ("Consume exactly one operation"); `:97,112` `step_put_fresh` / `step_put_error`
- `library/cas/Cas/Core/Admission.lean:201,220,242` `put_fresh_spec` / `put_duplicate_spec` / `put_conflict_spec` — exhaustive three-way outcome
- `library/cas/Cas/Lang/Worded.lean:92`, `library/cas/Cas/Lang/Roots.lean:63` — per-layer exact-consumption
- `library/cas/Cas/Lang/Defun.lean:359` `runP_embed_agree` — exact fuel
- Planned: RMT-004 duplicate-upload = zero transfer commands (`library/effects/IMPLEMENTATION-PLAN.md:602`)

## Positive examples

(pending curation)

## Negative examples

(pending curation)

## Implication examples

(pending curation)

## Counterexample history

(none yet)

## Outcome history

- RUN-002 (2026-08-30, scout): duplicate-as-join-identity (handoff
  item 5) and the exact fresh-fold (item 7) selected — both sharpen
  the held `put_*_spec` trichotomy toward the join reading; the host
  face of duplicate ⟺ pre-resident held `sampled-survivor(fast-check)`
  (probe P2); see [../runs.md](../runs.md).

## Annotations

gpt-5.6-luna 2026-08-30, receipt `37b80df0` (full JSON local). It
extracted the exact per-outcome transition equations from the
interpreter. Distilled:

- Template adds (exact transition per outcome): `fresh-successor`
  (`put = ok(fresh a σ') ⇒ step = running(k a, w ++ [Binding.mk a n])`);
  `duplicate-identity` (`ok(duplicate a) ⇒ running(k a, w)` — word
  UNCHANGED); `conflict-refusal` (`ok(conflict a _) ⇒
  refused(collision a)`); `exact-run-fuel`
  (`run(H, p.length + 1, embed p, w) = runP(H, p, w)`).
- Falsifier adds: `fresh-without-append`, `duplicate-mutates-word`
  (the CX-007 shape, proposed independently), `conflict-continues`,
  `off-by-one-fuel` (p.length and p.length + 2 both), and a
  fresh/duplicate merge (noted missing from my `collapse-outcomes`).
- Open questions kept: do `pure` and `refused` count as steps or
  terminal observations? Is the `+1` closing step required for every
  PProg shape? Duplicate/conflict transition equations as first-class
  named instances?

## Open questions

(none)
