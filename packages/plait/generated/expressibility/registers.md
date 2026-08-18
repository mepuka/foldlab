<!-- GENERATED FILE - DO NOT EDIT. Artifact: packages/plait/scripts/expressibility-term.ts | Command: bun run generate:expressibility | Term: 92c56ebd9c89ac51d4b0f46b80976e33f419f9f28c921c4ce1a688ae5efb9038 -->

# joinAll — the affordance row, in both registers

Both rows below are projections of one declared term; neither is a second text,
and neither was written by a person. The rung is one datum rendered twice: the
algebraic register spells the rung name, the plain register leads with its
adjective. That adjective is a rendering, not a shared field, so the parity wall
does not pretend to compare it.

What the caller no longer has to know:

> any grouping, any order, any duplication of the batch gives one result — so batching is free and needs no ordering discipline

## The algebraic register

| Affordance | Rung | Inherited from | Evidence | Sentence |
| --- | --- | --- | --- | --- |
| `joinAll(cell, contributions)` | `bounded-semilattice` | `f1_cell_merge_aci`, `f1_history_convergence` | donor | s ↦ s ∨ (⋁ contributions) — ∨: (a ∨ b) ∨ c = a ∨ (b ∨ c); a ∨ b = b ∨ a; a ∨ a = a |

## The plain register

| Affordance | Rung | Inherited from | Evidence | Sentence |
| --- | --- | --- | --- | --- |
| `joinAll(cell, contributions)` | duplicate-safe (`bounded-semilattice`) | `f1_cell_merge_aci`, `f1_history_convergence` | donor | what is known here comes to include at least the join of the contributions in the batch |

## The four statements, paired

One abstract statement type, two total renderings. The laws, derived-order, and
requires rows are the join operator's own and must come out
byte-identical to the ones committed in
`docs/design/2026-08-18-km-algebraic-register.md` §6.3 — that record is the
wall's outside oracle, written before this slice and by another hand. The
rewrite row is the one line that legitimately differs: §6.3 states the
single-contribution join, this term states the batched one.

| Statement | Plain register | Algebraic register |
| --- | --- | --- |
| rewrite | what is known here comes to include at least the join of the contributions in the batch | s ↦ s ∨ (⋁ contributions) |
| laws | join: order of grouping does not matter; order of arrival does not matter; saying it twice is saying it once | ∨: (a ∨ b) ∨ c = a ∨ (b ∨ c); a ∨ b = b ∨ a; a ∨ a = a |
| derived order | one state is at or below another exactly when joining it in changes nothing | a ≤ b ⟺ a ∨ b = b |
| requires | join is allowed only on a duplicate-safe carrier | ∨ : A × A → A requires A ∈ bounded semilattice |
