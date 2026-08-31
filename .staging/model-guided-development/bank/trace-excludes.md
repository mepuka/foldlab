---
id: TRACE-EXCLUDES
version: 2
carriers:
  - "reachable StoreMap / admitted-node graph"
  - "event traces (streaming, remote ordering) — mostly archived or planned"
applicability:
  - "Is there a named bad state/event the design promises can never be reached?"
  - "Is there a reachability or closure notion under which exclusion must hold?"
templates:
  - name: unreachable-exhibit
    form: "∀ s reachable from admitted init: s ≠ BadExhibit"
  - name: no-bad-event
    form: "∀ trace t of run r: BadEvent ∉ t"
  - name: closure-excludes
    form: "Closed(store) ⇒ ¬ references(store, dangling)"
falsifiers:
  - name: inject-bad-transition
    mutation: "add one transition that constructs the excluded state; exclusion proof must break"
    detects: "an exclusion theorem that holds only by unreachability of the whole model"
checkers: [fast-check, lean-decide, manual]
claimCeiling: heuristic
---

# TRACE-EXCLUDES

A named bad event or state never occurs in any admitted run.

## Sites

- `experiments/entity-store-model/E2/Reject.lean:19,57` `reachable_ne_dangling_singleton` / `NEG2_dangling_unreachable` — Lean theorems over the reachable store
- `library/cas/Cas/Core/Store.lean:46,53` `empty_closed`, `Closed.not_referenced` — closed store never carries a dangling reference
- Archived richer instances: `library/effects/archive/lean-model-0.3/Effects/Conformance/Instances/{RMT001,RMT005,RMT007,RPL002,MRK002,MRK003}.lean`
- Planned prose: `library/effects/IMPLEMENTATION-PLAN.md:599-619`; `library/effects/research/streaming-sync-cas-api-prior-art.md:1425-1428`

## Positive examples

(pending curation)

## Negative examples

- NEG-2, the dangling-reference exhibit — proved unreachable
  (see [counterexamples.md](counterexamples.md) CX-002)

## Implication examples

(pending curation)

## Counterexample history

- CX-002 (NEG-2 dangling reference)

## Outcome history

(no scout runs yet)

## Annotations

gpt-5.6-luna 2026-08-30, receipt `a3287354` (full JSON local). It read
the archived RMT-instances and proposed the guarded-decision carrier
shape they use. Distilled:

- Template adds: `guarded-decision-exclusion`
  (`step(state, input)` under a guard never emits the excluded decision
  tag — the archived RMT-001/005 shape); `fresh-address-nonreference`
  (an unbound address is referenced by no resident node);
  `admission-gated-exclusion` (non-entitled input emits neither the
  excluded decision nor a return).
- Falsifier adds: `emit-cached-without-entitlement`,
  `cache-presence-answer`, `publish-from-planning-answer`,
  `admit-wrong-kind-reference`.
- Negative-example adds: closed store with a wrong-kind reference
  (tag ≠ expectedTag) — distinct from the dangling case.
- Open questions kept: should wrong-kind exclusion be a separate
  constructor from dangling? Should multi-outcome exclusions (cached AND
  returned) be one conjunction or separate instances? Which archived
  instances are intended for reuse, given the empty positive-examples
  section? Should the claim ceiling distinguish heuristic annotations
  from theorem-backed site pointers? (Ledger answer: the ceiling governs
  bank CONTENT; sites point at theorems that carry their own grade —
  worth stating in BANK.md at next curation.)

## Open questions

- **Thinnest current coverage of the nine.** The richest instances live
  only in the archived model or in forward-looking prose; no currently-run
  byte gate exercises this family directly (survey 2026-08-30). Scout runs
  touching traces/ordering should expect to draft, not reuse.
