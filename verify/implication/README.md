# verify/implication — the implication-refusal formalization

Mechanized companion to
[docs/research/2026-08-14-implication-refusals-formalized.md](../../docs/research/2026-08-14-implication-refusals-formalized.md):
the collapse lemma (§2) and the projection walls W-COHERENCE / W-SCOPE
(§4–§5), in Lean 4 (unbounded, model-level R5) and TLA+/TLC (exhaustive
at the stated caps, R2). The gate is `./run.sh`.

## What is proved where

**Lean** (`lean/`, Lean 4.33.0, core only — no mathlib, no `sorry`):

| theorem | statement |
| --- | --- |
| `Implication.QTree.collapse` | Against a teacher whose entire knowledge is a decidable unary predicate, every protocol using pair queries is simulated — uniformly in the predicate — by a unary-only protocol with the same output and ≤ 2× the query cost. Ground ICE-style implication evidence is informationally redundant here. |
| `Projection.shipped_incoherent` | The shipped constructor model violates W-COHERENCE: witness `[1,1,0]` (= submitted `[string,string,bool]`), report `(path 2, got 1)`, submitted member at 2 is `0`. |
| `Projection.shipped_escapes_scope` | Same witness: the reported path is outside the violation's scope entirely. |
| `Projection.fixed_coherent` | The repaired rule satisfies W-COHERENCE for **every** submission. |
| `Projection.fixed_in_scope` | The repaired rule satisfies W-SCOPE for **every** submission. |
| `Projection.deferred_blame` | A candidate agreeing with the refused term at both scope coordinates still violates — the repair disjunction a single-path report hides. |

**TLC** (`Implication.tla`, four configs): the transition table is stated
once; `Rule = "sorted"` is the **historical** (pre-`ab77d6bfc`)
constructor, now a regression guard — the mislocation is fixed and
merged on `main`, which reports `submittedIndex`/`submittedValue`
(`walk.go:174-188`). `Rule = "submitted"` is a repaired projection that
satisfies both walls. **Note (review-clarified):** the Lean/TLA
`submitted` rule (least-index later-twin) is a *different function* from
the shipped Go rule (later element of the first canonical-byte-adjacent
pair); both satisfy the walls, but only this model rule is proved here —
the shipped rule is walled by the Go conformance tests. And the collapse
lemma's operative hypothesis is the pair-answer *factoring* through the
two membership bits, which decidability enables but does not by itself
force.

| config | verdict (recorded) |
| --- | --- |
| `Implication.cfg` | clean — TypeOK, WCoherence, WScope, WDecision |
| `Implication.shipped-coherence.cfg` | **refuted on WCoherence** — trace committed, `Implication.shipped-coherence.cex.txt` |
| `Implication.shipped-scope.cfg` | **refuted on WScope** — trace committed |
| `Implication.shipped-decision.cfg` | clean — the defect is report-only: both rules refuse exactly the duplicate-bearing submissions |

TLC's own counterexample is `sub = <<0,1,0>>` (bool, string, bool) —
found independently of the hand-derived witness and of the executed
daemon probe recorded in the research note §5, which used
`[string,string,bool]` against the real `walkStructure`. Three
independent instruments, one defect.

## Abstractions, stated

- A union member is its canonical-byte rank; byte-equal after
  normalization iff equal rank (rank 0 ~ `{"k":"bool"}`, 1 ~
  `{"k":"string"}`). The Lean model uses `Nat` ranks and insertion
  sort; the TLA model uses `{0,1}` and the two-value counting sort.
- One certify step; no catalog, no journal, no holes. The walls are
  properties of a single reply's report.
- The Lean shipped/fixed constructors and the TLA `ShippedRefusal` /
  `FixedRefusal` model walk.go's loop; code-model correspondence is
  empirical (the §5 execution probe), not proved — an R4-style
  obligation if this entry ever needs one.

## Bounds and the one open statement

TLC caps: `MaxLen = 4`, two member ranks — exhaustive below the caps
(31 submissions, 93 states, depth 2). Lean's `fixed_*` walls and the
collapse lemma are unbounded. The one statement checked only at bounds:
**decision equivalence** (`WDecision` — the fix changes the report,
never the decision) has no unbounded proof here; it needs
sorted-permutation lemmas (multiset preservation + "sorted has adjacent
duplicate iff duplicate") that are deliberately left as the next rung.

## Run record

- TLC 2026.08.11.125311 (rev 0894c34), `tla2tools.jar` sha256
  `ab323b79802aedc3203b3f9af37c6aca3ed43f4e0225b36f2aa77b26de46c05f`
  (the rolling v1.8.0 release asset; pinned by recording — see
  verify/catalog/run.sh for the rolling-asset caveat), OpenJDK Temurin
  21.0.2 via `mise x java@21`, 1 worker, Windows 11.
- Clean and shipped-decision runs: 31 initial / 93 generated / 62
  distinct states, depth 2, < 1 s wall-clock. Control runs: 41
  generated / 41 distinct at the violation.
- Lean: `lake build` on Lean 4.33.0 (elan), 5 jobs, ~40 s cold.
- Recorded 2026-08-14, this session; both instruments agree with the
  live-daemon probe in the research note §5.
