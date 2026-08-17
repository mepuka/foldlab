# REF-2a — the canonical value law over the narrowed grammar (executor spec)

Status: spec draft by the coordinator, 2026-08-16, under post-sweep
rulings 2 and 4; operator sign-off required before dispatch. Slice
charter: draft 17 §REF-2. Evidence base: RQ-9
(`docs/research/2026-08-16-rq9-rfc8785-numbers.md` + addendum), whose
committed reference work is this slice's starting point.

## Objective

A Lean model of RFC 8785 canonical form over the **narrowed,
float-free** v0 wire value grammar (post-brief-21), with the two
laws proved and the model differentially walled against both runtime
canonicalizers. This slice is where "is this fill a repeat or a
conflict" stops resting on two implementations agreeing and starts
resting on a theorem.

## Spec-fixed decisions (the executor edits none of these)

1. **Scope = structure plus the integer number path.** ES2019
   §7.1.12.1 steps 1–4 and 6–10 only. RQ-9's reference
   implementation (~40 lines, core Lean, no `Float`, no imports —
   demonstrated against all 26 RFC 8785 Appendix B rows and a 200k
   differential corpus) is promoted, not rewritten:
   `docs/research/reference/rq9-rfc8785-numbers/`. Step 5 is REF-2b
   and does not exist here; any need for it is a blocker to report.
2. **Home: a `Moves.Canonical` namespace in verify/moves** — the
   same one-package rationale as the ruled `Moves.Wire` home: the
   REF-3 equation cites canonical equality, and D-e obligation 1
   wants equation and laws footprint-clean inside one
   `#print axioms` sweep. (Coordinator-fixed from ruling 4's
   rationale; flag at sign-off if the operator wants it re-grilled.)
3. **The spec file pins its edition**: ES2019 §7.1.12.1 including
   Note 2, with the recorded caveat that Note 2 is non-normative in
   ECMAScript and normative in JCS via RFC 8785's MUST (quoted in
   the RQ-9 report). The August 2026 ECMAScript draft was checked
   with no radix-10 behavioral divergence — cite, do not re-derive.
4. **Grammar quantified over**: exactly the post-cure wire value
   grammar (brief 21 + the cure rulings 5–6) — objects (key
   ordering by UTF-16 code units per RFC 8785 §3.2.3), arrays,
   strings (escaping per §3.2.2.2), integers (magnitude < 2^53 as
   the wire admits — the same bound now governing literal scalars,
   ruling 5), booleans, null, and **opaque as an uninterpreted
   canonical-byte leaf** (ruling 6): the model never parses opaque;
   its equality is byte equality by definition, and the theorem's
   opaque clause is definitionally sound. Canonicity of opaque
   payloads is the shell's JCS seam, named in the trusted base, not
   a proof obligation here. The grammar's source of truth is the
   merged, cured tree, never a restatement typed into the model by
   hand.
5. **Theorems**: idempotence (`canon (canon v) = canon v`) and
   soundness (canonical-bytes equality iff semantic equality per the
   model's declared denotation), both footprint-clean. The pinned S7
   bound — "outside the narrow grammar Lean's printer and RFC 8785
   diverge" — is discharged in the same commit that lands the law,
   per the slice charter.
6. **Two walls, two seams, named precisely.** (a) The REF-2a
   theorem wall: model-emitted canonical bytes vs `go/canonical` and
   `packages/core` jcs over the existing adversarial corpus rows
   inside the narrowed grammar PLUS a generated full-grammar sample
   (generator: DEV-670's emitter — see blockers). (b) The nightly
   es6testfile100m tier guards the **JCS seam**, not this theorem
   (the file is overwhelmingly float serializations, which the wire
   grammar no longer admits but the JCS canonicalizers still
   handle): regenerated, with its generator and its comparison
   runtime both NAMED in the gate spec — the repository's Go
   generator draws its expected column from Go's own shortest-float
   engine, so an unnamed pairing is close to a self-test
   (roster-ratified, RQ-9's verifier).
7. **Hygiene inherited**: the brief-22 gates cover this namespace by
   construction (same package) — no `panic!`/`partial`/`sorry`, no
   `@[implemented_by]`, no non-allowlisted `@[extern]`.
8. **Corroborations carried, not re-derived** (determination
   2026-08-17): DAG-CBOR independently forbids NaN and infinities —
   a second standards lineage converging on the float drop; and the
   measured JCS-vs-DAG-CBOR object-key-order divergence on pure
   ASCII (DAG-CBOR sorts length-first) is the standing reason this
   spec pins "RFC 8785" by name and never says "canonical JSON".

## Landed interfaces — build on, do not rebuild

`Oracle/Codec.lean` already emits canonical bytes for the S7 wall;
this slice's model states the LAW that codec claims to satisfy. If
promoting RQ-9's reference code into `Moves.Canonical` reveals a
divergence against `Oracle/Codec.lean`, that divergence is a FINDING
(stopped on, reported with a minimized vector), not a silent
reconciliation in either direction.

## Gates (mechanical)

- `lake build`; no `sorry`; footprint check extended to
  `Moves.Canonical`; partition check (definitions / law statements /
  proofs in separate files, no law file orphaned from the gate).
- Both theorems footprint-clean; statement files Rev-frozen and
  sha256-pinned per house pattern.
- Theorem wall green in both runtimes over corpus + generated
  sample; zero skips, count pinned.
- All 26 Appendix B rows reproduced by the promoted model (the RQ-9
  result re-established in-tree, not cited from the report).
- Negative controls per verify/AGENTS.md: at least a wrong-key-sort
  mutant and a wrong-escape mutant, each killed by a named vector,
  traces committed.
- S7 printer bound discharged in the landing commit
  (VERIFICATION.md edit included).
- `bun run gates` and `bash verify/moves/run.sh` green.

## Blockers and partial-dispatch order

Blocked on the brief-21/22 branch merging **with its cure commits**
(brief 25 — the grammar is final only after rulings 5–6 land) for
all theorem work; the generated-sample wall additionally waits on DEV-670's
emitter. The slice may dispatch and land the model + theorems +
corpus-row wall first, with the generated-sample wall landing in a
second gated commit when the emitter exists — both halves inside
this one issue, neither claimed done without the other.

## Non-goals

No step 5, no floats, no REF-2b work of any kind; no edits to
`go/canonical` or `packages/core` jcs (a divergence found there is a
finding); no changes to the JCS differential wall beyond adding the
named-generator nightly tier.

Seats: Eng builds on `agent/<name>/<issue>`; Rev reviews; operator
ratifies and merges. DECISIONS log per house rule. The issue body is
this spec.
