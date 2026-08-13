# The number-determinism dossier — how deep the latitude goes

Provenance: deep-dive scout (spawned by the ticket-021 runtime scout),
2026-08-13. Primary sources: ECMA-262 editions ES3→current draft,
tc39 issue/PR archaeology, V8/WebKit/SpiderMonkey source, test262
clone (51,735 files), RFC 8785 + errata, the json-canonicalization
repo. Empirics via exact BigInt-rational oracles (no floating point
in the oracle); harnesses reproducible from the session scratchpad.

## The quantified latitude

- ECMA-262 6.1.6.1.20 step 5 (minimal-k + round-trip) underdetermines
  the output for 45.8% of doubles (3M-double scan). Note 2's
  "closest" removes all but 0.047% — the exact ties — where only the
  (equally non-normative) round-to-even clause decides. The guideline
  text is unchanged since ES3 (1999); no tc39 PR ever promoted it
  (searched; the one substantive change TIGHTENED radix≠10 in
  ES2023, PR #2854).
- Number.MIN_VALUE: five conformant spellings under the normative
  step. 2^-25 is the MINIMAL named double with two legal answers
  (the unique exact tie among all 2,098 powers of two) — adopted as
  a standing witness row (task 21).
- -0: sign loss is NORMATIVE (step 2). RFC errata 7920 (Technical,
  Verified 2024) adds: parsers SHOULD error on -0 in INPUT — support
  for constrained-decode refusal of the literal (task 21 decides).

## Why engines agree (and why that is fragile)

- V8: Grisu3 + bignum fallback; the tie rule is an unresolved TODO
  comment imitating Gay's dtoa.c. Measured: 1402/1402 ties chose
  even; zero non-closest picks.
- JSC: vendored V8-derived double-conversion for a decade, then
  SILENTLY swapped shortest-path to Dragonbox (Dec 2023, WebKit bugs
  264284/278432) with no published equivalence attestation.
  Dragonbox's default policy is to_even; it also ships a
  do_not_care policy that would be fully ECMA-conformant and break
  every JCS signature on ~0.05% of doubles.
- double-conversion's own SHORTEST documentation MISSTATES the tie
  rule (says away-from-zero; behavior is to-even) — do not cite the
  header comment; cite the measured behavior.
- No citable radix-10 V8-vs-JSC divergence found in any shipped
  release (marked unanswered-as-negative).

## The existence proof one radix over

ES2023 made radix≠10 normative; V8 violates it on ~1/3 of
non-power-of-two-radix outputs (witness: 1e20 in base 3, off by 262;
reproducible; V8-vs-SpiderMonkey divergence live in Mozilla bug
1691998, unresolved P3). Radix-10 controls: 0 failures. Disjoint from
JCS — but the clearest evidence that agreement without a test is
contingent: test262 pins ≈70 exact strings over ≈25 magnitudes
(~4e-18 of the double space); MIN_VALUE, MAX_VALUE, and 0.1+0.2 are
asserted NOWHERE on the String() path, and the radix tests still
quote spec text deleted in 2022.

## RFC 8785's actual position

Its determinism rests entirely on promoting non-normative Note 2 to a
MUST (§3.2.2.3), via an edition-pinned citation (ES2019 §7.1.12.1)
that no longer resolves; the RFC never claims determinism in its own
words and concedes (§3.2.2) that a future ECMAScript change would be
the community's problem. Its Appendix B prescribes differential
testing as the method; the 100M-value oracle file is real and
verified live (2,081,240,993 bytes gzipped, uncompressed SHA-256
0f7dda6b0837dde083c5d6b896f7d62340c8a2415b0c7121d83145e08a755272,
deterministically regenerable) — adopted as an optional deep lane
(task 21 addendum).

## Consequence for the ledger

The three-way wall's justification is now fully priced: identity
rests on a convention three engines share by lineage and coincident
defaults — a TODO comment, a silent algorithm swap, and a library
whose docs misdescribe it — against a spec that leaves 45.8% of
inputs open. The wall is not a formality; it is the only instrument
that would notice any of this moving.

## Supplement: the bug archaeology (second deep-dive scout, same day)

CORRECTION to "why engines agree": both engines are now Dragonbox —
JSC swapped Dec 2023 (WebKit 264284), V8 Apr 2025 (afb4ab89ece,
shipped Chrome 138) — both on default to-even policies, both swaps
landing with zero test-expectation changes and no follow-up
correctness CLs. The two-independent-implementations window was Dec
2023–Apr 2025, AND OUR PINS SIT INSIDE IT: pinned node v22 (V8 12.4)
still runs Grisu3+bignum while pinned bun (JSC) runs Dragonbox — so
the measured 4.4M-value agreement crossed genuinely independent
algorithms, the strongest form of that evidence. When node bumps past
V8 13.8 both engines share Dragonbox and the lane's independence
weakens; the lane records engine-algorithm provenance per pin so the
transition is visible (task 21 addendum).

SHIPPED-DIVERGENCE PRECEDENTS (all in untested paths; full citation
table in the scout report): Chrome vs Safari emitted different digit
strings for (0.1).toString(36) for ~five years (2012–2017, fixed V8
5.7); Chrome returned "0" for (5e-324).toString(2) until Chrome 77
(2019) while Firefox/Safari returned the exact 1076-char expansion;
test262's toFixed exactness test exists because ChakraCore diverged;
x87 builds produced different digits from 80-bit extended precision
(a same-engine, different-target divergence). Radix-10 String(x):
NO citable divergence in any shipped release, ever — supported by
V8 and JSC literally sharing one library 2011–2023 — recorded as
unanswered-as-negative: convention plus lineage, never the standard.

STRUCTURAL BLINDNESS: differential JS-engine fuzzers that compare
output (DUMPLING, AccuOracle) NORMALIZE floating-point values before
comparison by design, so the academic apparatus cannot catch a
number-printing divergence. The three-way lane is coverage
effectively nobody else runs. WHATWG codified the latitude in 2009:
a UA need only be self-consistent, "though it may differ from the
value used by other user agents."
