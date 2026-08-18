# FINDING CANON DOMAIN 001 — the number domain is ruled twice, in opposite directions

Status: **OPEN — findings before fixes.** No ratified file was edited, no
fixture was regenerated, and the collapse DEV-807 dispatched was not
performed. The disposition belongs to the operator. Found 2026-08-18 by the
Eng seat on DEV-807, by running the ticket's own tripwire before building.

Severity: **blocker for DEV-807 as written.** The ticket's license to proceed
without a grill rests on the premise that the record already answers the
number-domain question, so that collapsing onto `jcs` *enforces* the record
rather than choosing between peers. The premise does not hold. Two records
answer it, for the same value, in opposite directions, and one of them is
model-emitted and gate-pinned.

## The diverging vector, quoted

`packages/plait/fixtures/kernel-conformance.ndjson:112`:

```json
{"bytes":"9007199254740993","name":"big-integer","record":"canon","value":9007199254740993}
```

`9007199254740993` is 2^53 + 1. The I-JSON safe range ends at 2^53 − 1
(`9007199254740991`). The vector is one past it, and one past it on purpose:
it is the only value in the corpus that a binary64 cannot hold, so it is the
corpus's witness that the estate's canonicalizer is not a double-domain
canonicalizer.

## What the collapse would actually emit

`jcs`'s value domain is `JsonValue`, whose integer carrier is `number`. A
`bigint` reaching that seam has exactly one projection — `Number(value)` —
and for this vector that projection is lossy. Executed over every committed
artifact the collapse moves (`bun scratch/dev807/collapse-probe.ts`):

```
=== canon vectors: value -> bytes through the jcs seam ===
  SAME  canon/empty-object      SAME  canon/key-order
  SAME  canon/empty-array       SAME  canon/nested-object
  SAME  canon/empty-string      SAME  canon/nested-array
  SAME  canon/zero              SAME  canon/string-escapes
  DIFF  canon/big-integer       SAME  canon/control-char
         committed: 9007199254740993
         jcs seam : 9007199254740992

=== program declarations: declaration -> bytes through the jcs seam ===
  SAME  program/ground-two-node    SAME  program/holey-filled
  SAME  program/holey              SAME  program/distill-shape

agree=13 diverge=1
```

The divergence is exactly 1, and it is not a rounding the estate is neutral
about. `9007199254740992` is the literal string
`verify/unity/run.sh:478-480` plants as a negative control and requires the
reader to refuse:

```sh
check_falsification rounded-canon-bytes \
  's/"bytes":"9007199254740993"/"bytes":"9007199254740992"/' \
  "canon vector big-integer carries bytes that are not its value's canonical form"
```

Confirmed live (`bun scratch/dev807/refusal-probe.ts`) — the corpus reader
refuses that mutation, naming the value:

```
canon vector big-integer pins bytes 9007199254740992,
the canonicalizer writes 9007199254740993
```

So the collapse makes the estate's one canonicalizer emit, for a
model-emitted corpus vector, the precise bytes the model gate is armed to
refuse.

**Program identity is clean.** All four committed program declarations
regenerate byte-identically through `jcs`. Everything the ticket hoped for on
that half is true; it is the corpus domain alone that blocks.

## The two records, and why this is a choice and not an enforcement

**Record A — §11a projection ruling 3** (`docs/research/2026-08-18-kernel-model-notes.md:475-484`).
A genuine operator ruling, 2026-08-18. Its subject line is **"JSON Schema at
the wire"**, and it rules on the eight flat tool schemas an agent calls:
"integers in the I-JSON safe range (floats have no spelling)". It rules on
the tool projection. It does not name the conformance corpus or
program-declaration identity.

**Record B — the format-2 corpus freeze** (`verify/unity/run.sh:396-408`),
which states the opposite for exactly this surface, in prose, and gives its
reason:

> Format 2 deliberately leaves the double-safe integer range: the freeze's
> one deviation from RFC 8785 is that numbers are unbounded non-negative
> integers, so the corpus carries a witness past two to the fifty-third and
> every consumer must read it exactly. **Format 1's safe-integer ceiling is
> retired here on purpose.**

Record B is not prose alone. It is:

- **model-emitted** — `verify/unity/Unity/Emit.lean:280`,
  `("big-integer", .num 9007199254740993)`, so the value is the Lean
  model's own answer, not a hand-typed fixture;
- **gate-pinned** — `verify/unity/run.sh:405` fails the gate if the fixture
  stops carrying exactly one `"value":9007199254740993`, under the message
  "the corpus lost its past-the-safe-range integer witness";
- **negative-controlled** — `run.sh:478-480`, above;
- **asserted in the battery** — `packages/plait/test/KernelCorpus.test.ts:162-166`,
  "the big-integer vector is past what a double holds, and survives anyway",
  which also pins `JSON.parse("9007199254740993") === 9007199254740992` as
  the one-line proof that a double-domain parser is not conforming here.

The ticket's third citation, **KM-12**, is on the KM grill sheet, whose own
header states "**All items PROPOSED**"
(`docs/research/2026-08-18-kernel-model-notes.md:320-322`). Its worked
example does say "non-negative safe integers", and it would agree with
Record A — but it is an ungrilled proposal, so it cannot settle a
disagreement.

That is the finding: a ruling about the tool wire, an ungrilled proposal
that agrees with it, and a deliberate, model-emitted, gate-pinned freeze that
says the opposite about the corpus. Collapsing onto `jcs` today picks Record A
over Record B for a surface Record A does not name — which is choosing
between peers and harmonizing silently, the one move the tripwire forbids.

## The grill item

**Does the canonical value grammar admit integers outside the I-JSON safe
range?** One decision; the collapse follows from it either way.

- **Option 1 (recommended) — the safe range binds every surface, corpus
  included.** §11a ruling 3 is read as the estate-wide number domain, Record
  B's deliberate retirement is reversed, and `big-integer` is re-emitted
  inside the range. Note what that costs the vector: at `9007199254740991`
  `JSON.parse` is exact too, so the re-emitted vector can no longer tell an
  exact reader from a lossy one — it keeps its name and loses its job, and
  the corpus is left with no witness that the estate's canonicalizer is not
  `JSON.parse`. Then DEV-807 proceeds as written: `jcs` becomes the one seam,
  both files delete, and all thirteen remaining artifacts are already
  byte-identical. Cost: an edit to `Emit.lean`, a corpus regeneration, and
  that lost witness.
- **Option 2 — the corpus domain is unbounded and `jcs` is the narrower
  wire.** Record B stands, §11a ruling 3 is read as binding the tool
  projection only, and the two canonicalizers are not peers but a wide
  interior and a narrow boundary. Then DEV-807 is refuted as scoped: the
  second implementation is not duplication to collapse but a domain the `jcs`
  seam cannot express, and the real ticket is to give it a stated seam and a
  wall relating the two domains at the boundary where values cross.
- **Option 3 — split the difference explicitly.** Corpus and program
  identity keep the unbounded domain; every outward wire surface is bounded
  and refuses on the way out. Costs a stated projection and its refusal, and
  leaves two canonicalizers standing by design rather than by drift, which is
  the thing law 1 is unhappy about.

**Reversal cost.** Option 1 is dear to undo: it moves committed bytes, so
every digest derived from the corpus moves with it. Option 2 is free — it
ratifies what is already committed and green. Option 3 is additive.

**What is NOT being claimed here.** That either record is wrong. Both are
internally coherent; they were ruled for different surfaces and have now met.
This finding locates the collision and prices the exits. The ruling is the
operator's.

## Bounds

- The corpus reader, the `jcs` seam, and the round-trip comparison were
  **executed** on this host; the outputs above are transcripts, not
  reconstructions.
- The Lean side was **read, not run** — `elan`/`lake`/`lean` are not
  installed on this seat's host, so `verify/unity/run.sh` was not executed
  first-hand. `Emit.lean:280` and `run.sh:405,478-480` are quoted from the
  committed source.
- The battery baseline (`gates-baseline.log`) covers the untouched tree: 13
  of 14 steps green, including all 283 `plait` tests and the JCS differential
  wall. The 14th (`proto/ts — Effect rules`) fails on a dependency-pin
  incompatibility unrelated to this finding — see the DEV-807 report.
- One corpus vector was scanned for, and one found. The scan
  (`tripwire-scan.ts`) also flags out-of-range numerals in
  `fixtures/jcs-rfc8785.json` and `fixtures/golden-conformance.json`; those
  are the RFC 8785 referee vectors and the proto golden fixture, both
  float-domain by construction and both outside the tripwire's stated scope
  (committed program declarations and corpus vectors).
