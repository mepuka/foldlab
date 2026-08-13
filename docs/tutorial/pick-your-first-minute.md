# Pick your first minute

There is no single picture that explains foldlab. Start with the thing you
already know, run one command, and let the output introduce the house terms
afterward. These are three independent doorways, not three prerequisites.

All commands below run against repository code. The output fragments were
captured from the same commands; no value was invented for this page.

## I know Effect: run one reducer twice

From the repository root, after `bun install`:

```text
$ bun packages/core/examples/tour.ts

two histories, same two facts, different order

  A head           c0f9c11ccb06bc3c18f4de601b85f44aaf682c83f09090a2c536fa1488d40816
  B head           cbf009894aea951acfd7e7f8157c514fd5144aa6efd7960698855c464533c7ff
  A state digest   62ca5ca464cbce85942499596ae21def9299236f26b68a29f3aaec37cc44733f
  B state digest   62ca5ca464cbce85942499596ae21def9299236f26b68a29f3aaec37cc44733f
  heads equal?     false
  states equal?    true

feed the meaning fold something it does not admit:
  head still extends: d6c5ccfc0b466cf64532de3f167d89ba710b5aff9f43062c568c816c25da5cfa
  meaning fold says: MalformedPayload
```

You already know the first half. `foldKV` is the shape of
`Stream.runFold`: initial state, step, events, answer. foldlab calls it the
**meaning fold**. The unfamiliar half is `headFrom`, a second reduction over
the same events whose accumulator is a SHA-256 chain. foldlab calls that the
**identity fold**, and its result a **chain head**.

The two histories end with the same key/value state, so their state digests
match. They reached it in opposite orders, so their heads differ. Then invalid
UTF-8 produces a typed `MalformedPayload` on the meaning side while the head
still records that those bytes arrived. In Effect terms: the error channel can
refuse an interpretation without erasing the event from history.

Read the short source in
[`packages/core/examples/tour.ts`](../../packages/core/examples/tour.ts),
then continue with [Why two folds](../explanation/why-two-folds.md).

## I run platforms: prove the split, then attack the log

The first command asks whether a replay job may be cut at arbitrary boundaries
and recombined:

```text
$ bun test packages/core/test/stream.combine.test.ts

(pass) combineKV: the parallel-replay license > WALL: every split of the frozen corpus recombines to the frozen fold digest
(pass) combineKV: the rights it does NOT confer > NEGATIVE CONTROL: commutativity fails, minimized — order is the semantics
(pass) combineKV: the rights it does NOT confer > NEGATIVE CONTROL: idempotence fails, minimized — the count is a sum

 11 pass
 0 fail
 2371 expect() calls
```

That is the operational boundary. Associativity licenses split-and-combine.
The two negative controls stop that license from silently becoming
"merge in any order" or "duplicates are harmless." The full suite cuts the
frozen Go-generated corpus at every boundary and compares the recombined
digest, rather than trusting a TypeScript port.

Now attack the stored journal through the existing adversarial tests:

```text
$ cd go
$ go test ./journal -run 'TestForgedTailDetected|TestNonCanonicalWireRejected' -count=1 -v
=== RUN   TestForgedTailDetected
--- PASS: TestForgedTailDetected
=== RUN   TestNonCanonicalWireRejected
--- PASS: TestNonCanonicalWireRejected
PASS
```

The first test writes a fourth entry directly to JetStream with a forged
`prev` link. A read returns the three-entry verified prefix, refuses with
`ErrTampered`, and leaves the cursor at sequence 2; reading again refuses at
the same position. The second writes semantically valid JSON with a
non-canonical byte spelling. Its sequence and link are correct, but the read
still refuses because identity is over canonical bytes, not "equivalent"
decoded data. Both cases are executable in
[`go/journal/journal_test.go`](../../go/journal/journal_test.go).

If you know Git, the split is familiar: state is the checked-out result; the
chain is the commit ancestry. If you know Terraform, two runs may have the
same `terraform show` result and different histories. foldlab keeps both
answers and makes the read path perform the equivalent of `git fsck` every
time.

## I audit systems: compare recomputations, not assurances

The daemon example deliberately submits bad claims, prints the refusals, and
finishes with a locally verified read. `proto/ts` is its own Bun project, so
install there once:

```text
$ cd proto/ts
$ bun install --frozen-lockfile
$ bun examples/refusals.ts
```

One request asserts a digest the Go daemon cannot derive from the submitted
structure. The refusal includes the value the daemon computed:

```text
"kind": "digest-mismatch",
"law": "W1: no asserted identity — every committed digest is recomputed by the daemon from submitted bytes",
"got": "dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
"expected": "0c1ffc280256132e234ff9bddd2e2a6044c4e82ba06d6e97e059684cc56b3697"

local structureDigest({k:'bool'}) = 0c1ffc280256132e234ff9bddd2e2a6044c4e82ba06d6e97e059684cc56b3697
```

The `expected` value and the independently computed local value match at all
64 hexadecimal characters. The success path has the same shape. Creating a
type returns this catalog head:

```text
"catalogHead": "6eb9fbb9d55ea916cb003bdd9bdb235de3d8b5b36048ed93621a07eb144101c7"
```

The final read returns the journal entry and the head the TypeScript client
recomputed from it:

```text
"verified": {
  "seq": 0,
  "head": "6eb9fbb9d55ea916cb003bdd9bdb235de3d8b5b36048ed93621a07eb144101c7"
}
```

That equality is the control: one claim arrived in a Go reply, the other was
derived by the reader from the returned bytes. The reader does not certify
the writer by agreeing with it; it checks the claim against the evidence.
The assertions behind the narrated run are in
[`proto/ts/test/smoke.test.ts`](../../proto/ts/test/smoke.test.ts).

## What these three minutes do not claim

- The tour demonstrates the two folds; it does not prove SHA-256 collision
  resistance or make a whole-history claim beyond the prefix in its head.
- `combineKV` licenses ordered segment recombination, not commutative or
  idempotent federation. The negative controls are part of the evidence.
- The journal tests prove the named tamper cases. The complete claim, its
  bounds, and the missing model rung remain in
  [`VERIFICATION.md`](../../VERIFICATION.md).
- A green test is not accepted merely because it is green: frozen fixtures,
  cross-language walls, and deliberately broken controls define what each
  test must be able to catch.

For the sequenced walkthrough, take
[the first ten minutes](first-ten-minutes.md). For the research behind this
layout, see the
[register study](../research/2026-08-14-register-study.md) and the
[worked audience calibrations](../research/2026-08-14-tangible-examples.md).
