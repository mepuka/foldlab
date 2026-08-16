# The moves vector wall: exhaustive over the wire-image fragment, generated and mapped in Lean

Issue: DEV-670 (slice stage 2, parent DEV-664; revised 2026-08-15
after the independent review — supersedes the earlier bounded-corpus
draft, whose reviewed defects this design exists to avoid)

## Why now

Hand-authored model verdicts are banned (AGENTS.md precept). The
replacement must not repeat the first draft's own reviewed defects: a
corpus the daemon cannot drive (99% silent skips), a hand-typed
mapping, refusal rows the model never authored, and a fence the
proofs do not cover. Design per the adversarial review's revision,
with the totality fix (previous stage) landed first. Feasibility is
proved, not assumed: `scratch/spike-lean-oracle/` compiles the
unmodified model and emits deterministically at ~115k cases/s.

## Scope

1. **`verify/moves/Moves/Wire.lean` — the executable mapping.**
   `WireMove` (fill/close only), total `toWire : Move → Option
   WireMove`, `ofWire : DaemonHoleFold → Option HoleState`, and
   `inductive Divergence` with one constructor per declared
   model↔daemon disagreement (`selfRevisionRefusedByDaemon`,
   `decidedMaskedBySessionClosed`, `closeHasNoModelCounterpart`, …).
   `|Divergence| = N` is pinned in acceptance. No prose divergence
   notes anywhere — a disagreement outside the N constructors fails.
2. **`verify/moves/Moves/Vectors.lean` — the instantiation.**
   `HoleId := Fin 2`; holders A, B, X; `Value` = canonical classes
   over the alphabet `{0, -0, 10, 1.0e1, 20}` — the wire rendering is
   a choice function the corpus deliberately varies, with RFC 8785
   Appendix B as the referee outside both sides. Supply and **prove**
   `TransCmp`/`LawfulEqCmp` for the value and pair comparators (the
   pair `LawfulEqCmp` is a hand proof — probed; no Std instance
   exists). Add `Repr`, a state key, and `example`s instantiating
   `no_loss` (total form), `clash_repair_confluence`,
   `fence_deterministic`, and `seatAuthorityFenceRule.sound` at the
   concrete types.
3. **`seatAuthorityFenceRule` in Lean** — the daemon's actual fence
   as a proved `FenceRule`: `sound` discharged under the covering
   premise `protocol.create` already enforces;
   `fence_deterministic` instantiated at it; joins the `run.sh`
   axiom roster. The generator emits `decide` vectors only at the
   seat-authority choice.
4. **`verify/moves/Main.lean` — the emitter.** Enumerate the
   wire-reachable hole states (22 per hole at this instantiation →
   484 pre-states); cross with every wire move; compute
   admitted/refused and post-states via the **total** runner; emit
   **Tier A** NDJSON to `proto/wire/fixtures/` (a
   `.gitattributes`-pinned path), provenance = the generation
   command; also emit the **machine-checked closure certificate**
   (every wire move applied to every enumerated state lands inside
   the set — the completeness claim, decidable, asserted by the
   gate). Emit **Tier B** (full model universe) separately —
   model-only, never driven, never counted as differential evidence.
   JSON discipline per the spike report: fixed ASCII keys, values
   below 2^53, no floats, no control characters, `.compress` only.
5. **Corpus protocol.** Two holes, all three seats on both holes,
   hole types `{"k":"opaque"}`, `fence.order` declared — the
   daemon's type-check and seat authorization are provably inert, so
   any refusal is a calculus refusal.
6. **Harness, two tiers.** Tier 1 drives Tier A through the isolated
   pure fold (`applyProtocolEvent` extracted behind a `Step`-shaped
   function); Tier 2 drives the same corpus through the real daemon
   in Go and TS. Both assert `driven == total`, **zero skips**.
   Every vector resolves to `agree` or exactly one named
   `Divergence`; anything else fails.
7. **Fixture split, not deletion.** Model-claiming rows of
   `protocol-moves.json` are deleted; lifecycle/seat/digest rows move
   to a contract fixture whose provenance claims nothing about a
   model — **keeping the `final_state_digest` order-independence
   assertion** (protocol_moves_test.go:188, the strongest line in the
   old file).
8. **Gates.** (a) regeneration byte-diff, with a cross-platform hash
   comparison in CI before the diff gate is relied on; (b) the
   closure certificate; (c) instantiated-law axiom footprint, with
   `run.sh`'s `sorry` greps widened to every new file; (d) a
   **fixture registry** replacing the grep ban gate — registered
   model-verdict fixtures re-generate and diff, and a fixture
   consumed by a test asserting model-derived expectations that is
   absent from the registry fails; (e) **≥3 planted runtime
   mutations** (flip the same-seat check; drop the
   `sameCanonicalValue` early return; reverse `fence.order`
   traversal), each caught by a *named* vector, with the
   mutation→vector map in the closing report.

## Acceptance (mechanical)

- Tier A is exhaustive: closure certificate passes;
  `driven == total == <pinned count>`; zero skips.
- Regeneration is byte-identical, verified by hash on both CI
  platforms.
- Every headline law the generator relies on is instantiated at the
  concrete types, appears in the axiom-footprint roster, and no
  `sorry` exists in any generator file.
- Every vector resolves to `agree` or one of the N named
  divergences; N is pinned.
- ≥3 mutations each fail against a named vector; the map is
  committed with the closing report.
- The registry gate fails on an unregistered model-verdict fixture
  and on a planted hand-authored provenance;
  `grep -ri "hand-authored" proto/wire/fixtures` finds nothing.
- VERIFICATION.md states the honest rung: **R0/R1 differential,
  exhaustive over the wire-image fragment at the stated
  instantiation, modulo N named divergences.** Not a refinement map,
  not correspondence. Explicitly: MOVES-5 passes this wall and is
  not dispositioned by it; close, `unfilled`, `sealed`, outcomes,
  and digests are contract-tested, not model-derived.

## Out of scope

The refinement map. Any further `Model.lean` change beyond the
landed stepK stage. The online oracle (dispatched separately,
blocked on this issue).

## Pointers

`docs/research/2026-08-15-dev670-adversarial-review.md` (the design
source); `docs/research/2026-08-15-lean-oracle-spike.md` and
`scratch/spike-lean-oracle/` (feasibility, performance, JSON
discipline); `docs/research/2026-08-15-sota-ranked-recommendation.md`
(the rung ladder and the Cedar precedent); AGENTS.md §no
hand-authored model verdicts.
