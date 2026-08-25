# Dispatch brief — worktree 1: proof seats M15 / M9 / NEG-2

Operational dispatch instrument, coordinator-issued 2026-08-25. Not a claim-bearing
document. Branch from the tip of `main`; before starting, verify `lake build` is green
in `formal/entity-store` (it runs the opaque/unsafe gate and prints the axiom reports).

## Mission

Prove the pinned statements in `formal/entity-store/E2/Resolve.lean`. The statements
are FROZEN — supply proofs only, in the stub modules already committed, in this order:

| Seat | Module | Theorems (exact names and targets) |
|---|---|---|
| 1 — M15 faithfulness | `E2/Faithful.lean` | `theorem M15_fresh : ObligationM15_fresh` · `theorem M15_faithful_schema : ObligationM15_faithful_schema` · `theorem M15_faithful_entity : ObligationM15_faithful_entity` · bonus, two-line M4a corollaries: `theorem encSchema_inj : ObligationEncodeSchemaInjective` · `theorem encValue_inj : ObligationEncodeValueInjective` |
| 2 — M9 WF2 closure | `E2/Closure.lean` | `theorem M9_wf2 : ObligationM9_wf2` |
| 3 — NEG-2 exhibit | `E2/Reject.lean` | `theorem NEG2_dangling_unreachable : ObligationNEG2_dangling_unreachable` |

Spec authority: `docs/entity-store/STORE-MODEL.md` §3 (WF2), §4 (L-faithful), §6
(theorem inventory). Do not re-derive the model; the spec and the Lean files are the
record.

## Law of the worktree

- Edit ONLY the three seat modules. `E2/Resolve.lean`, `E2/Gates.lean`, and every other
  existing file are off limits — the coordinator batches gate/report lines at merge.
- A pinned statement that resists proof or looks false is a STOP: commit what stands,
  record the finding in your report, and do not reword the statement (claim discipline
  C5). Rewording is a coordinator act.
- No new axioms — `[propext, Classical.choice, Quot.sound]` is the ceiling. No
  `native_decide`, no Mathlib, no `partial`, no `@[extern]`/`@[implemented_by]`, no new
  dependencies, no toolchain change (v4.33.1).
- Helper lemmas live in your seat module. A helper a later seat needs goes in the
  earlier module; imports flow `Faithful ← Closure ← Reject` only (already wired).
- End each module with `#print axioms <theorem>` for every theorem proved.
- Done = `lake build` green in `formal/entity-store` (gate included), all listed
  theorems present under their exact pinned names.

## Proof shape (coordinator's analysis — deviate freely if it proves)

- **M15_fresh**: unfold `putSchema`/`putPre` on the fresh branch; the head binding is
  `(H (preimageS s), preimageS s)`, `getChecked` succeeds by construction (`H b = d` is
  refl), `stripPre` succeeds on the literal `versionByte :: kindSchema ::` prefix, and
  `M4a_schema` closes with `decodeSchema (encSchema (canonS s)) = some (canonS s)`.
- **M15_faithful_schema**: cases on `σ.find (addressS H s)`. Fresh: as above. Present
  with bytes `b`: `putPre` no-ops; `M8_wf1` (reachability) gives `H b = addressS H s`,
  the injectivity hypothesis turns that into `b = preimageS s`, then strip + `M4a_schema`.
- **M15_faithful_entity**: same skeleton; note Q11 — `preimageE` canonicalizes, so the
  stored body is `encAddress sAddr ++ encValue (canonV v)` and the target is
  `some (sAddr, canonV v)`. `decAddr_encAddress` splits the body, `M4a_value` finishes
  on the canonical form.
- **M9_wf2**: induction on `Reachable`. Old bindings: IH plus monotonicity —
  `AllResolve` survives a put by `M13_frame`. New schema binding: it parses via
  `M4a_schema`; its refs are `refsS (canonS s)`, and the precondition speaks of
  `refsS s` — you will need the canonicalization-preserves-references lemma
  (`a ∈ refsS (canonS s) → a ∈ refsS s`; mutual induction over the carriers with a
  membership lemma for `insertField`). New entity binding: `decAddr_encAddress` +
  `M4a_value`; the schema address heads the list and resolves by `putE`'s own
  precondition (`σ.find sAddr = some (preimageS s)`); Q11 means the decoded value is
  `canonV v` while the precondition speaks of `refsV v` — the value-side twin lemma
  (`a ∈ refsV (canonV v) → a ∈ refsV v`, with a membership lemma for `insertVField`)
  closes that gap.
- **NEG2_dangling_unreachable**: generalize to
  `Reachable H env σ → σ ≠ [(H (preimageS (.ref a₀)), preimageS (.ref a₀))]` and
  induct on the derivation. No-op branches of `putPre`: IH verbatim. `putE` fresh head:
  `kind_separation` kills the byte equality. `putS` fresh head: the predecessor is
  forced to `[]`; cons-injectivity twice yields `encSchema (canonS s') =
  encSchema (canonS (.ref a₀))`, encode injectivity via M4a (`some _ = some _`) yields
  `canonS s' = canonS (.ref a₀) = .ref a₀`; `canonS` preserves head constructors, so
  `s' = .ref a₀`, whose reference cannot resolve in the empty predecessor
  (`AllResolve [] [a₀]` is absurd). Note: do NOT route through M9 — the
  self-hash corner (`H (preimageS (.ref a₀)) = a₀`) defeats the post-store argument;
  the derivation-time precondition is what kills every case.

## House lessons (hard-won; do not relearn)

- `simp [f]` does NOT unfold the WF-defined decoders. The idiom is `rw [f.eq_def]` then
  `simp` — `rw` rewrites only the first instantiation, which keeps hypothesis rewrites
  intact. `simp only` between rewrites iota-reduces matchers where plain `rw` cannot.
- `omega` cannot see `2^8`: feed it `Nat.mod_eq_of_lt (by show _ < 256; omega)` shapes.
  The byte-value lemma is `UInt8.toNat_ofNat_of_lt'`.
- `Nat.max` goals: name the atom (`have hmax : Nat.max a b ≤ k := by omega`) then
  `Nat.le_trans (Nat.le_max_left _ _) hmax`.
- Strings: the codec lemmas in `E2/Decode.lean` are the interface; never open
  `fromUTF8`/`ofByteArray` internals.
- Doc comments (`/-- -/`) cannot attach to `mutual` blocks; use plain block comments.
- Bare-core name: `Nat.le_trans`, not `le_trans`.

## Report

Branch name + diff summary; verbatim `#print axioms` output for every theorem; the
`lake build` tail; helper lemmas added and where; findings if any STOP was hit. Commit
messages: declarative title stating what became true of the repo. Never push.
