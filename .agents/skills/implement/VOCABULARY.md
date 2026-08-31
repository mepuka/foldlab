# Vocabulary and references

The adopted copy layer — book term → estate referent — and every
reference the process leans on. Meaning stays where it already lives;
the book supplies the words and the teaching register.

## The book

K. Rustan M. Leino, *Program Proofs*, MIT Press.

- Local artifact: `.reference/papers/program_proofs.pdf`,
  SHA-256 `a14a98037799512eb343bdfe8efa4ff2022b09b08446ba8205b5e995fcddf025`,
  25,299,717 bytes.
- Pin: the `program-proofs` row in
  `.reference/provenance/sources.lock.json`.
- Text projection: regenerate on demand —
  `liteparse parse .reference/papers/program_proofs.pdf --format markdown -o <out>.md`.

## Book term → estate referent

| Book term (§) | Estate referent |
|---|---|
| method contract, `requires`/`ensures` (§1.4) | the packet's REQUIRES/ENSURES; at escalation, the contract statement in the proof stratum |
| Hoare triple `{P} S {Q}` (§2.2) | validity of a fueled run: from any word in `P`, the run halts and lands in `Q` |
| weakest precondition (§2.3) | `wp` by recursion on the program carrier (bind law = transformer composition) |
| strongest postcondition (§2.3) | the recorded word — a run's receipt IS its strongest-postcondition witness |
| `ghost` vs compiled (§1.6) | proof stratum vs materialized surface (R14, strata 2 vs 3–4) |
| `decreases`, well-founded relation (§3.1–3.2) | fuel; existential-fuel discipline (Cas/Lang/Handler.lean:115-123) |
| lemma, `calc` proof (§5.0, §5.4) | Lean theorem and `calc` — native |
| intrinsic vs extrinsic spec (§6.2) | gate (checked at every use) vs theorem batch (applied on demand); default extrinsic, intrinsic only when every client needs it |
| abstraction function (§9.3.1) | denotation relative to the reference handler (R10) |
| export set (§9.2) | the admitted public surface — strata 1–2 (R14 stable API) |
| data-structure invariant, `Valid()` (§10.2.0) | `Word.wf` (Cas/IR/Word.lean:150) and wf-preservation theorems |
| intrinsic–extrinsic spectrum (§10.3.1) | where a law lives: door guard vs grill lemma |
| loop invariant, the loop rule (§11.0, §11.3) | invariant on the fueled step relation |
| `modifies`/`reads`/`old`, frames (§14.0) | address footprint; frame soundness (Cas/Lang/Defun.lean:1944–1965); receipts make footprints decidable |
| `Repr`, dynamic frames (§16.2–16.3) | roots and reachability (Cas/Lang/Roots.lean; `cas verify` audits reachability) |

## Estate references

- Design basis for this process:
  `.staging/operational-structure/PROOF-DRIVEN-DEVELOPMENT.md`
  (the debt object §2, the five gates §3, hard parts §6).
- Store-language law: `library/cas/EFFECTS-BACKEND.md` (R1–R14a);
  projection in the `store-language` skill.
- Estate conduct: `AGENTS.md` (C1–C7); projection in the `estate`
  skill.
- Claim ladder: `docs/effect-typescript-semantics/CLAIM-GATES.md`
  (G0–G6).
- Grill format (statement, decomposition, falsifier):
  `.staging/operational-structure/CORE-ABSTRACTIONS-PLAN.md` §3.
- Host mirror and the cross-host gate:
  `library/effects/src/cas/Programs.ts` (header), gate fixture
  `library/effects/test/generated/VectorProgramAddresses.json`.
- Run-relativity: `library/effects/src/cas/Programs.ts`, "A run's
  meaning is relative to its starting word".
- Word receipts (LogEntry seq/at/address/tag/size):
  `library/cas/Cas/Lang/WordWire.lean` (merge/cas-word until it
  lands).

## Rejected spellings (avoid)

- "verified TypeScript" — the TS is never the proof subject; gates
  and batteries carry the claim (C5).
- "the tests prove" — the battery REFUTES or fails to refute; proof
  is the kernel's word at escalation tier only.
- "spec" bare, for the packet — say CONTRACT PACKET; `docs/SPECS.md`
  already owns "spec" for the estate's standing specifications.
