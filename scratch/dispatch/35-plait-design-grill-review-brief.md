# Dispatch 35 — Design grill review: affordances + agent plane

**Status: DRAFT — dispatches at the M2 merge boundary (operator directive
2026-08-18: "When M2 merges I think we pause and dispatch an agent to
review the agent plane work and the effect design work to offer grill
recommendations").**

## What this is

Two design records landed this wave, each carrying a PENDING grill
sheet the operator has not yet ruled on:

- `docs/design/2026-08-17-plait-effect-affordances.md` (landed
  3e38b97c7) — grill items **G-1..G-7** (matcher-set surface,
  casJoinLoop internal-first, resolve cache as Catalog wrapper,
  reconcile-loop refusal, BlobsService admission, ranged-read refusal,
  audit/Replay row shapes).
- `docs/design/2026-08-18-plait-agent-plane.md` (landed 450ffa194) —
  grill items **G25..G36** (part-4 adoption, structured-output commit
  door, ontology reading B, concierge-as-ceremony, task-as-derived-view,
  provisioning/Config split, shuttle epic charter, tick-fact scheduling,
  no-new-id-namespaces, workflow-engine refusal, authority-not-topology
  hierarchy, three-class taxonomy as design law).

Nineteen decisions total. Both sheets follow house style: recommended
option first, alternatives priced. Your job is to referee those
recommendations **before** the operator grills them — so the operator
rules with an independent adversarial read in hand, not only the
authors' own pricing.

## Mandate

For **each of the 19 items**, deliver a verdict:

- **ADOPT** — the recommendation stands; say what you attacked and why
  it held.
- **ADOPT-AMENDED** — the recommendation stands with a wording or scope
  change; give the exact replacement sentence(s).
- **REJECT** — a priced alternative (or an unpriced one you supply) is
  right; argue it.
- **DEFER** — name the trigger that reopens it and what ships in the
  meantime.

Ground every verdict in the estate, not in taste:

1. **The proof corpus.** F1–F12 and the register laws are the physics.
   A recommendation that quietly needs an unproven law, or that a
   proven law already refutes, must be caught (e.g. G26's commit-door
   check against G23's at-most-one-landed-outcome bound; G32's tick
   facts against the no-clock-in-fold rule; G35 against F9
   meet-attenuation's 10-component carrier).
2. **The ratified record.** G1–G24 are ratified; the next-phase plan's
   thirteen items are ratified. A new item that contradicts or
   silently re-litigates a ratified one fails coherence.
3. **Cross-doc coherence.** The two records share constructs by name:
   the agent plane's task view (G29) consumes the affordances
   audit/`Replay` shapes (G-7); admission equipment rides the
   provisioning layers (G30); the shuttle (G31) emits acts the
   affordance surfaces must accept. Verify the shared names resolve to
   one definition, and that ruling one sheet's item does not orphan
   the other's.
4. **The open-seam queue.** Known unresolved items that constrain
   these rulings: E9's queue (identical-call/work-digest collision and
   who-assigns-round; the recorded F-3/G29 constraint that E9's
   granularity ruling cannot reshape the task view), the skill
   bundle's unminted home (DEV-725 F-1, precedent-linked to G27), and
   the H-5 naming finding (concierge vs admission). Flag any verdict
   that forecloses one of these before its own ruling.

## Beyond the 19

- **New items.** Anything grill-worthy the authors missed becomes a
  new item in your own series (**R-1, R-2, …**) with the same
  recommended-option-first format. Do not renumber the authors'
  series.
- **The estate-of-safety candidate.** Per standing practice, name the
  one law-shaped claim this review suggests could extend safety by
  construction, if any.

## Constraints

- **Review only.** No code changes, no amendments to either record —
  amendment wording goes in your sheet; edits land after the operator
  rules.
- Read both records **whole**, in place, plus their cited sources as
  needed (part 1–3 records, ratification record, next-phase plan,
  grill sheet items 1–21, `plait-api-log.md`).
- Verify counts and shas before quoting them.

## Deliverable

One decision sheet at
`docs/research/2026-08-18-plait-design-grill-review.md`: per-item
verdicts (19 + your R-series), each a short argued paragraph;
amendment wording verbatim where applicable; a one-screen summary
table up top (item · verdict · one-line reason) so the operator can
ratify wholesale or line-item. Commit it; do not touch anything else.

## What this gates

The operator's ruling on these sheets cuts the implementation ticket
maps (affordances T-A..T-K; agent-plane tickets including the shuttle
epic) and unlocks DEV-712's pre-declared adoption round. M3 model
work holds until the ruling. Speed matters; shortcuts do not.
