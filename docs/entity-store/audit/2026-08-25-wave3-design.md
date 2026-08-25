# Audit — wave-3 design pass and docket ruling (2026-08-25)

Entry covers the wave-3 design pass through the docket ruling and the batch-1 seat
dispatches. A later entry adjudicates the implementation wave.

## 1. State at entry

Ground: wave-2 register and triage committed (`6f8a102`, `1e35f07`); F-43 fixed
(`2f33ae0`); twenty open findings; six S1. Operator direction: consolidation design pass
plus literature review over the held corpus, Unison's-mistakes lens, under the standing
constraint **no Mathlib, no crypto, no cslib**; Opus 5 readers mandated; the model's
prior design work is the base, nothing from scratch.

## 2. Trail

Six Opus reader reports landed in `.staging/scouts/2026-08-25-wave3-design/`
(R-A Unison lessons · R-B canonical spellings · R-C boundary/open · R-D typing plane ·
R-E Std-carrier/SHA3 · R-F program spine), then `SYNTHESIS.md`, then `DOMAIN-LAYOUT.md`
(revised once on a nine-finding operator review into the D1–D6 decision packet), then
`DOCKET.md` (25 items with recommendations). Operator ruled: "Agree with the
recommendations." Consequences landed same-day: `RULINGS.md` minted (W3 entry),
PROCEDURE §7 registry amended, FINDINGS dispositions updated (14 rows ruled; F-43's
stale OPEN closed) and six rows minted (F-46…F-51). Batch-1 implementation seats
dispatched (Opus, worktrees): spec-text amendments; fips202 Θ(n²) fix; window A
(A-6+F-26); shell F-42 package.

## 3. Workflow observations

- The reader fleet returned first-pass usable reports on the held corpus alone; every
  claim receipted or marked ACQUISITION-GAP. The scout-before-ruling law extended
  cleanly from probes to literature consolidation.
- The operator's mid-pass review of the layout draft (nine findings) was the highest
  single quality lever of the session — the packet that reached the docket was half the
  size and had its registry deltas made exact.
- One docket, deliberately composed (PROCEDURE §3.2), absorbed 22 rulings in one
  sitting because every item carried a recommendation with its basis.

## 4. What worked

The convergences: family 1's repair turned out nearly free (R-D: zero proved theorems
consume the old premises); the spelling repair and family 2 fused into one `WFS`
posture (R-B); the Std-carrier question died at the kernel, not at estate law (R-E) —
and R-E found two repairs nobody had briefed for (the comparison flip F-48; the Θ(n²)
drop F-47). Negative results pinned (F-49) in the F-31 tradition.

## 5. Failure modes and lessons

- **"G0 advisory" was used across the wave-3 staging set to mean "tentative."** G0 is a
  recorded source identity with hashes. Corrected label: "staged advisory; no claim
  gate satisfied." Lesson: gate names are never register words.
- **F-43's FINDINGS disposition sat stale-OPEN after its fix commit.** The ledger
  extractor's live-build side is the mechanical answer; until then, adjudication
  includes a disposition sweep.
- **The first layout draft mixed promises with known-false rows and split one idea
  (`Admissible`) across modules by implementation technique.** Both caught by the
  operator's review. Lesson: promise tables carry statuses from the ledger or they lie;
  module boundaries follow ideas, not seat-counting.

## 6. Standing amendments (proposed and ratified in-session, operator, 2026-08-25)

1. **PROCEDURE §7 registry**: STORE-MODEL row replaced (present-tense normative scope;
   ruling narratives move to `RULINGS.md`); KICKOFF "Used for" cell notes ruling
   authority now lives in `RULINGS.md`; STORE-SHELL schema cell links §8 to
   `RULINGS.md`; rows added for `RULINGS.md` and planned `CONTEXT.md`; `LEDGER.md` row
   gains the W3-4 promise-status join. Ratified as wave-3 docket item 1 (ruling W3-1),
   landed with this entry.
2. No amendment to this procedure's phases or cycle rules.

## 7. Numbers

Six reader reports (~2,900 report lines); 1 synthesis; 1 decision packet (revised ×1);
1 docket (25 items, 22 ruled, 3 dispatched); rulings entry W3 with 25 items; 14
FINDINGS dispositions updated, 6 rows minted (ledger now F-1…F-51); 4 batch-1 seats
dispatched. Constraint held: zero new dependencies; no Mathlib, no crypto, no cslib.
