# RQ-9 reference area — RFC 8785 numbers in a proof assistant

Retrieval date for every external item below: **2026-08-16**. Serves
`docs/research/2026-08-16-rq9-rfc8785-numbers.md`.

House rule applied: links plus own-authored minimal reproductions; nothing
third-party is vendored. Two candidate vendors were considered and rejected —
`lexicone42/ryu-lean4` and `lexicone42/shortest-decimal` are MIT and could
lawfully be vendored, but they pull all of Mathlib and pin a different Lean
toolchain, so they are linked and audited by reading, not copied.

---

## Own-authored artifacts (all in this directory)

### `EsNumberToString.lean` + `Driver.lean` + `AppendixBVectors.lean`

**What it is.** A Lean 4 transcription of the *rendering* half of ECMA-262 10th
edition (ES2019) §7.1.12.1 `NumberToString ( m )` — steps 1–4 and 6–10 — with
step 5 (the shortest-round-trip search) deliberately taken as an *input*.
`Driver.lean` runs it over the RFC 8785 Appendix B vectors and over the wire's
current integer sub-grammar.

**Why it exists.** To establish mechanically, rather than assert, that
everything RFC 8785 §3.2.2.3 requires *besides* step 5 is total
integer-and-string code containing no floating point — which is what makes the
REF-2a / REF-2b split defensible.

**Provenance.** Written for this report; no third-party code. The transcription
target is quoted in the report from
<https://262.ecma-international.org/10.0/#sec-tostring-applied-to-the-number-type>.

**License.** Same as this repository.

**Recorded run** (Lean 4.33.0, `x86_64-w64-windows-gnu`, commit `d8b1897…`):

```
$ cd docs/research/reference/rq9-rfc8785-numbers
$ python make_triples.py
rows=26 failures=0
$ LEAN_PATH=. lean -o EsNumberToString.olean EsNumberToString.lean
$ LEAN_PATH=. lean -o AppendixBVectors.olean AppendixBVectors.lean
$ LEAN_PATH=. lean --run Driver.lean
appendix-b rendered rows: 22, mismatches: 0
zero rows: 2, refusal rows: 2
integer sub-grammar samples: 13, mismatches: 0
(exit 0)
```

22 rendered + 2 zero rows + 2 refusal rows = the 26 rows of
`fixtures/jcs-rfc8785.json`. The `.olean` files are build output and are not
committed.

`Ref2aIntegerLaw` in `EsNumberToString.lean` is **stated, not proved**. It
carries no proof and must not be cited as one.

### `make_triples.py` → `appendix-b-triples.json`, `AppendixBVectors.lean`

**What it is.** Derives the ES step-5 triple `(sign, s, k, n)` for each
Appendix B row and emits both a JSON record and the generated Lean vector list.

**Why it exists.** The generated-vectors ruling (2026-08-15): fixtures are
produced by executing something, never hand-typed. The step-5 triples come from
CPython 3.13.14's `repr` (shortest round-trip, David Gay lineage) — that is,
from a source **independent of the expected strings in the fixture**, so the
renderer genuinely has to reproduce the RFC's table rather than echo it.

**Provenance / license.** Written for this report; same license as this
repository. Its input is the repo's own `fixtures/jcs-rfc8785.json`.

`AppendixBVectors.lean` is generated output — regenerate, never hand-edit.

### `NativeDecideFootprint.lean`

**What it is.** Four one-line Lean theorems and four `#print axioms` commands.

**Why it exists.** The one piece of prior art that formalizes shortest-decimal
printing advertises "Zero axioms. Zero sorrys." while separately disclosing
`native_decide`. This file settles what `native_decide` does to Lean's axiom
footprint by running it here rather than reasoning about it.

**Recorded run** (Lean 4.33.0):

```
$ lean NativeDecideFootprint.lean
'RQ9.control' does not depend on any axioms
'RQ9.viaNative' depends on axioms: [RQ9.viaNative._native.native_decide.ax_1_1]
'RQ9.charCompare' depends on axioms: [RQ9.charCompare._native.native_decide.ax_1_1]
'RQ9.downstream' depends on axioms: [RQ9.charCompare._native.native_decide.ax_1_1,
 RQ9.viaNative._native.native_decide.ax_1_1]
(exit 0)
```

`decide` (kernel evaluation) has an empty footprint; `native_decide` mints a
per-theorem axiom that every downstream theorem inherits.

**Provenance / license.** Written for this report; same license as this
repository.

### `number-differential/emit.go` + `number-differential/check.ts`

**What it is.** A standalone two-runtime differential over the *number path
only*: Go's `encoding/json` (what `go/canonical/canonical.go` calls for
`float64`) against the JavaScript runtime's `JSON.stringify` (what
`packages/core/src/jcs.ts` calls for `number`), over pseudorandom binary64 bit
patterns at a pinned seed.

**Why it exists.** The repo's existing differential mixes numbers with the whole
JSON grammar and runs 160 cases. REF-2 needs a number-only figure at scale.

**Recorded run** (Go 1.26.5 windows/amd64, Bun 1.3.14):

```
$ cd docs/research/reference/rq9-rfc8785-numbers/number-differential
$ go run emit.go -n 200000 > emitted.txt
$ bun check.ts emitted.txt
rows=200000 divergences=0 runtime=bun 1.3.14
(exit 0)
```

Branch split of that corpus: 191,216 rows rendered in exponential form, 8,784 in
plain form; longest encoding 25 bytes. `emitted.txt` is regenerable and is not
committed.

**Bound, stated:** this measures *agreement between two implementations*, not
conformance to ES §7.1.12.1. Neither Go nor JavaScriptCore is the specification.

**Provenance / license.** Written for this report; same license as this
repository.

---

## External items — linked, not vendored

| Item | What it is | Where | License | Retrieved |
| --- | --- | --- | --- | --- |
| RFC 8785 | JSON Canonicalization Scheme; §3.2.2.3 is the number requirement, Appendix B the sample table our fixture copies | <https://www.rfc-editor.org/rfc/rfc8785.txt> | IETF Trust legal provisions (BCP 78/79) | 2026-08-16 |
| ECMA-262 10th ed. (ES2019) | The normative reference RFC 8785 §3.2.2.3 points at; §7.1.12.1 `NumberToString ( m )` incl. Note 2 | <https://262.ecma-international.org/10.0/#sec-tostring-applied-to-the-number-type> | Ecma International; see the standard's own terms | 2026-08-16 |
| `cyberphone/json-canonicalization` | The JCS author's reference implementations and test data; `testdata/numgen.js` and `numgen.go` deterministically generate the number corpus | <https://github.com/cyberphone/json-canonicalization> | Apache-2.0 (`LICENSE`, "Copyright 2018 Anders Rundgren") | 2026-08-16 |
| `es6testfile100m.txt.gz` | 100 million `hex-ieee,expected` rows — the exhaustive number-serialization wall RFC 8785 Appendix B points to | <https://github.com/cyberphone/json-canonicalization/releases/download/es6testfile/es6testfile100m.txt.gz> (2,081,240,993 bytes, 730 downloads at retrieval) | Apache-2.0 with the repo | 2026-08-16 |
| `ulfjack/ryu` | Reference Ryu implementation; RFC 8785 cites it as `[RYU]` at commit `27d3c55` | <https://github.com/ulfjack/ryu> | Apache-2.0 / Boost (dual, per its `LICENSE-*` files) | 2026-08-16 |
| Adams, "Ryū: fast float-to-string conversion", PLDI 2018 | The algorithm and its (paper, not machine-checked) correctness proof | <https://dl.acm.org/doi/10.1145/3192366.3192369> | ACM | 2026-08-16 |
| `lexicone42/ryu-lean4` | The only proof-assistant formalization of shortest-decimal printing found; Lean 4, HEAD `5dd60fd7a0f08822a6efa0f97e585ce8efa270d4` | <https://github.com/lexicone42/ryu-lean4> | MIT ("Copyright (c) 2026 lexicone42") | 2026-08-16 |
| `lexicone42/shortest-decimal` | Generic version of the same author's roundtrip framework | <https://github.com/lexicone42/shortest-decimal> | MIT | 2026-08-16 |
| `lexicone42/nickelean` | Verified JSON serialization for Nickel values in Lean 4, using ryu-lean4 for floats; the closest existing analogue of REF-2 | <https://github.com/lexicone42/nickelean> | MIT | 2026-08-16 |
| `boa-dev/ryu-js` | A fork of ryu "adjusted to comply to the ECMAScript number-to-string algorithm" — evidence that plain Ryu is not ES-conformant as printed | <https://github.com/boa-dev/ryu-js> | Apache-2.0 | 2026-08-16 |
| EverParse / EverCBOR | Verified parser/serializer generation in F\*; EverCBOR ships RFC 8949 §4.2 deterministic encoding **without floating-point numbers** | <https://project-everest.github.io/everparse/> ; `doc/index.rst` last changed at commit `b7dfc53f07f6ca755250566f9327d44966541a89` | Apache-2.0 (project-everest) | 2026-08-16 |
| Champagne Gareau & Lemire, arXiv:2603.06581 | 2026 experimental review of shortest-decimal conversion; reports that surveyed implementations do not consistently produce the shortest possible strings | <https://arxiv.org/abs/2603.06581> | arXiv posted licence | 2026-08-16 |
| AFP `IEEE_Floating_Point` | Isabelle/HOL IEEE-754 model — arithmetic and code generation, no decimal-string printing | <https://www.isa-afp.org/entries/IEEE_Floating_Point.html> | BSD (AFP) | 2026-08-16 |

### Searches that returned nothing on-point

Recorded so the absence is a finding rather than a gap:

- Coq/Flocq, Isabelle/AFP, HOL4/CakeML, PVS, ACL2 — searched for a mechanized
  proof of Ryu, Grisu, Dragon4, Schubfach, Dragonbox, `dtoa`, or any
  shortest-round-trip *printing* algorithm. Found floating-point *arithmetic*
  formalizations (Flocq, AFP `IEEE_Floating_Point`), error-bound checkers
  (FloVer/Dandelion lineage), and verified FP *compilation* (CompCert, CakeML).
  No printing formalization.
- RFC 8785 / JCS itself in any proof assistant: nothing found.
