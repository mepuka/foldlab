# GRILL — vocabulary grill record, model-scout lane

Status: **pre-grade grill record**. Conducted 2026-08-30 by the
coordinator session on the operator's go-ahead ("yeah go ahead" against
the owed-items list of the stand-up report). Scope: the lane's
OPERATIONAL vocabulary — [LOOP.md](LOOP.md), [BANK.md](BANK.md),
[ANNOTATE.md](ANNOTATE.md), the nine family entries, the ledgers, and
the bench labels. Explicitly NOT covered: ratification of
[SOURCE-STUDY.md](SOURCE-STUDY.md) and
[IMPLEMENTATION-PLAN.md](IMPLEMENTATION-PLAN.md) — both keep their
"awaiting grill" standing in docs/SPECS.md. Ratification stamps remain
the operator's; for the two doc rows landed under this go-ahead
(TOOLS.md role extension, AGENTS.md routing), the ratifying act is the
operator's commit.

Method note: AGENTS.md routes ratification pressure-testing to
`/mattpocock-skills:grilling`; that skill is not installed in this
session's listing, so the grill ran by hand directly against C4/C5/C7
and the minting procedure. Each verdict below carries its evidence.

## Verdicts

| id | term | verdict | evidence / reason |
|---|---|---|---|
| V1 | the nine family names (WF-PRESERVE … AGREEMENT) | **reuse confirmed** | literal ratified vocabulary: the archived registry's `#guard registry.map (·.family)` enumerates exactly these nine (`library/effects/archive/lean-model-0.3/Effects/Conformance/Registry.lean:71-79`); every bank file cites the origin |
| V2 | bank field `constructors` | **amended → `templates`** | live two-sense collision inside the lane's own files: rejection-clause's annotation read "Constructor adds: `refusal-registry-coverage` (every `IngestRefusal` constructor appears …)" — the field sense and the Lean-inductive sense in one sentence. LOOP.md step 3 already led with "Bank templates first", so the rename unifies on the loop's own word. Executed lane-wide (see Amendments) |
| V3 | bank field `falsifiers` | keep | same refuting-move sense as the implement packet's FALSIFIER heading; the senses align, no gloss needed beyond the schema comment |
| V4 | finding statuses (`proposed` … `unsupported`) | keep, one amendment | the eight statuses are working language with an explicit ladder mapping in LOOP.md §Evidence discipline. Amendment executed: `checker-accepted` never appears bare — it names its checker inline (`checker-accepted(byte-gate)`), matching LOOP.md's own "what a named checker accepted" (C5). `lean-theorem` kept: it reports that the lean lane HOLDS the kernel theorem + axiom report; the guard that the scout never stamps a gate stands |
| V5 | run classes (`baseline`/`scout`/`demonstration`/`contaminated`) | keep | defined at point of use in runs.md; `demonstration`/`contaminated` never count toward the adoption measure — the exclusion is the load-bearing part and is stated twice |
| V6 | `claimCeiling: heuristic` | keep | deliberately off-ladder: no G-word may ever appear as a bank value, so bank content cannot be misread as carrying a gate |
| V7 | counterexample dispositions (fixture / negative example / existential / retired) | keep | `fixture` matches the direction law's execute-side sense; `existential` is defined as a Lean existence statement; append-only + point-forward supersession law stands |
| V8 | "scout" / "model scout" | **reuse, mint owed** | not a new sense: `.staging/scouts/` holds the 2026-08-25 scout waves (SPECS.md Category 3), SERVING.md:377 says "scout owed, wave 3", session records use "scout-only" — all reconnaissance-before-commitment, which is exactly this role. LOOP.md's role fence is the working definition; the proper mint is owed at promotion (see manifest) |
| V9 | "obligation family" | keep | the registry's own `family` field word, extended by the gloss in BANK.md §Families; a new family still enters only by proposal + grill |
| V10 | bench classes a/b/c + seed codes (ADM, CAN, RCH, DUP, SIDE, RETRY, PKEY, OPEN) | keep | file-local working labels, defined in the file that uses them; they never leave bench/candidates.md |

## Amendments executed (2026-08-30)

1. **`constructors` → `templates`** (V2), across: BANK.md schema block
   and annotation-protocol destinations; all nine family frontmatters
   (each `version` bumped 1 → 2); "Constructor adds" → "Template adds"
   in curated annotation prose; LOOP.md step 3; ANNOTATE.md's canonical
   schema + prompt copies; the local schema and prompt files. Future
   luna family annotations emit a `templates` key. Historical receipts
   (the nine curated annotations) predate the rename; their distilled
   prose was updated, their JSON on disk was not — the receipt digests
   still verify the original outputs.
2. **Checker-naming rule** (V4): one bullet added to LOOP.md
   §Evidence discipline.
3. Reconciliation owed: [IMPLEMENTATION-PLAN.md](IMPLEMENTATION-PLAN.md)
   still says `constructors` in the coded-kernel shapes; reconcile at
   that plan's own grill so the kernel does not re-import the collision.

## Minting manifest — owed at promotion, not performed here

Owner: Lab Core (CONTEXT-MAP: lab-wide process/artifact vocabulary).
Each term enters by the minting procedure (name, kind from KINDS.md,
carrier or judgment form, obligations, avoid-list), through domain
modeling plus grilling:

- **model scout** — the third role (feeds the breaker, never writes
  packets); avoid-list: never a verifier, never a stamp source.
- **outcome bank** — the curated family/counterexample/pattern memory;
  avoid-list: never a trust source (carries memory, not trust).
- **run ledger** — the append-only measurement apparatus for the
  adoption decision.
- **benchmark packet** — the blinded retrospective evaluation unit,
  with the preparer/scout blinding law.
- **counterexample ledger** — append-only, point-forward supersession;
  "a counterexample never dies in a model transcript."

## Also inspected under this grill

The CX-007 working-tree question (AGREEMENT family, open question): the
2026-08-30 mid-edit of `Programs.ts`/`Programs.test.ts` adds a
`PLine.WF` admission gate (byte/nat32 bounds) at `putProgram`,
`programAddress`, and `runProgram`; it does not touch the
duplicate-word arm. CX-007 is unchanged and still open; disposition
remains the operator's. Family file and ledger row updated with the
finding. Superseded same day: the operator then ordered the fix ("if
it's obviously a bug then fix it"); executed in the working tree — see
the CX-007 ledger row. The reviewer's emission-vs-admission naming
ruling stays open.
