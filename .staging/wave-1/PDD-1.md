# PDD-1 — CANON-1's theorem pair (Lane E close-out)

CATEGORIES algebraic-laws, lemmas-proofs, proof-mechanics,
           representation-invariants
BRANCH     agent/opus-cc-mac/pdd-1

Dispatch under the proof-driven law: read
`.claude/skills/implement/SKILL.md`, `CONTRACT.md`,
`IMPLEMENTER.md`, and your categories' rows in `CATALOG.md` before
anything else. Wave-1 flow (operator-ruled): you are the builder —
you author the contract packet AND the implementation, packet
committed first; an independent breaker attacks your castle
afterward, so write the falsifiers as if they will be used against
you, because they will.

## The work

Prove the canonicalization the authoring door already performs.
Spec source: `.staging/operational-structure/CORE-ABSTRACTIONS-PLAN.md`
Lane E (:375-397) and §3 E1/E2 (:838-871), as amended by
`CORE-ABSTRACTIONS-PLAN-REVIEW.md` §2.1 (:173-205) — the amendment
is ruling text: E2 REQUIRES the Nodup-keys premise; no dedup is
added at the `SystemNode` constructor; the authoring door already
enforces Nodup keys via `isCanonServices`.

- `canonServices_idem (xs) : canonServices (canonServices xs) = canonServices xs`
- `canonServices_perm {xs ys} (hnd : (xs.map (·.key)).Nodup) (hperm : xs.Perm ys) : canonServices xs = canonServices ys`
- The counter-`example` beside E2 (house style): two refs, one key,
  permuted — `canonServices` disagrees; E2 is false without the
  premise. This is a break-ledger object: a formal falsifier with
  its witness, keep it in the file AND in the packet ledger.
- Corollary: address stability — two authored orders of one
  key-Nodup service set yield equal `SystemNode` terms, hence one
  address.

Base: `canonServices` at `library/cas/Cas/Backend/EmitLayer.lean:220`,
`dedup` :202-206 (keeps the LAST occurrence — the source of the
Nodup subtlety), `isCanonServices` :225-226, authoring guards
`library/cas/tools/EmitLayers.lean:229-237`. Decomposition sketch in
plan §3 E1/E2; verify toolchain lemma names (`mergeSort` family)
against the pinned toolchain, never from memory.

## Castle requirements

- Packet at `library/cas/contracts/PDD-1.contract.md` per
  CONTRACT.md (headings, degree claim, falsifiers, ledger section),
  committed BEFORE the theorem file.
- Theorems in a new file under `library/cas/Cas/Backend/` (theorem
  slices move no bytes); Lean falsifiers as counter-`example`s.

## Fences

Must not touch: the `SystemNode` carrier (System.lean:96-98), the
load path (renormalize-on-read is a named defect), `Cas/Backend/Mcp.lean`,
`library/effects/src/cas/Programs.ts`, `library/effects/test/Programs.test.ts`,
and every file the two pending merge branches carry (plan §0:40-78).

## Gates

`lake build` green; `emitlayers --check` unchanged. Run from
`library/cas` per its AGENTS.md. Commit on your branch only, ticket
key in every commit title, never merge.
