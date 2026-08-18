# The shipped fence's mechanized profile (executor spec)

Status: dispatchable; ruled 2026-08-17 (grill record, ruling 9).
A small `verify/moves` slice, existing machinery only, runs beside
REF-1 with no ordering constraint. Evidence base: the proof-support
briefing §2.2/§5.3 and the determination
(`docs/research/2026-08-17-proof-support-determination.md`).

## The gap being closed

`Violations.lean` carries manipulation profiles for `minFenceRule`
and `pluralityFenceRule` (`fence_manipulable`) — two rules the
estate does not ship. The rule that ships (seat-priority:
`fenceChoice` iterates the declared `hole.Fence.Order`,
proto/go/protod/protocol_step.go:349) is analysed nowhere. In
social-choice terms the shipped rule is a dictatorship — immune to
candidate injection, unconditionally deferential to the first seat
in the declared order holding any candidate. True, deliberate, and
currently unwritten; after this slice it is a theorem.

## Scope — one instance, two lemmas

1. `seatPriorityFenceRule : FenceRule Holder Value candidateCmp` —
   the shipped rule as a model object; soundness is the same
   `ValueAppears` obligation the other two rules discharge.
2. **Injection-immunity**: a candidate attributed to a seat outside
   the declared fence order, or below the deciding seat, never
   changes the choice.
3. **Dictatorship**: the first fence-order seat holding any
   candidate decides, regardless of all other evidence.

`fence_deterministic` already covers the rule's schedule-freedom —
cite it, do not restate it. The lemma statements go in the law
files per the partition; the model correspondence claim stays at
the current ladder rung (model-level; the corpus walls the shipped
Go rule — this slice does NOT claim code-model correspondence for
`fenceChoice`, and its closing report says so).

## Gates (mechanical)

- `lake build`; no `sorry`; both lemmas and the instance
  footprint-clean; roster grows by the new names (the orphan gate
  makes the growth visible and deliberate).
- One negative control: a mutated rule (e.g., second-seat
  preference) refuted on exactly the dictatorship lemma, trace
  committed, orphaned from the build.
- `bash verify/moves/run.sh` green at tip; hygiene gates inherited.
- VERIFICATION.md's E2 row gains the two-lemma line in the same
  commit, sized to the evidence (model-level, shipped-rule shape).

Seats: Eng builds on `agent/<name>/<issue>`; Rev reviews; operator
ratifies and merges. DECISIONS log per house rule. The issue body is
this spec.
