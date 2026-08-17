# The first ten minutes

Already know the terrain you are arriving from? Start with
[one executable minute calibrated to an Effect developer, a platform
engineer, or an auditor](pick-your-first-minute.md), then return here for the
full sequence.

This tutorial runs four commands on a fresh checkout and reads their
output line by line. It stops there: it does not explain why the system
is built this way, and the commitment register, the wire contract, and
the verification ladder are all out of scope — each has its own
document, linked at the end.

By the last command, two histories will have disagreed about their
identity while agreeing about their meaning, a test suite will have gone
green, and a daemon will have refused a request and handed back the
repair for it.

## Before starting

- `bun` 1.3 or later and `go` 1.26 or later, both on `PATH`.
- A checkout of this repository, with a terminal in its root.
- Nothing else. There is no server to stand up and no account to create:
  every command below drives processes it starts itself, against
  temporary directories it removes on the way out.

Elapsed on the machine that produced the output quoted here: about
twenty seconds, plus a one-time Go build inside step 4.

## Step 1 — install

```
$ bun install
```

## Step 2 — run the tour

```
$ bun packages/core/examples/tour.ts
```

```
two histories, same two facts, different order

  A head           c0f9c11ccb06bc3c18f4de601b85f44aaf682c83f09090a2c536fa1488d40816
  B head           cbf009894aea951acfd7e7f8157c514fd5144aa6efd7960698855c464533c7ff
  A state digest   62ca5ca464cbce85942499596ae21def9299236f26b68a29f3aaec37cc44733f
  B state digest   62ca5ca464cbce85942499596ae21def9299236f26b68a29f3aaec37cc44733f
  heads equal?     false
  states equal?    true

cut B anywhere, fold the halves apart, combine:
  cut@0 -> 62ca5ca464cbce85942499596ae21def9299236f26b68a29f3aaec37cc44733f
  cut@1 -> 62ca5ca464cbce85942499596ae21def9299236f26b68a29f3aaec37cc44733f
  cut@2 -> 62ca5ca464cbce85942499596ae21def9299236f26b68a29f3aaec37cc44733f

feed the meaning fold something it does not admit:
  head still extends: d6c5ccfc0b466cf64532de3f167d89ba710b5aff9f43062c568c816c25da5cfa
  meaning fold says: MalformedPayload
```

Those are 32-byte SHA-256 values printed at full width. Nothing below
abbreviates them, because the point of each one is that it can be
recomputed and compared character for character.

### Two histories, two answers

The script built two histories over one stream. History A records
`customer=ada` and then `total=42`; history B records the same two facts
in the opposite order. Read the source at
[`packages/core/examples/tour.ts`](../../packages/core/examples/tour.ts) —
it is short, and every line of output above comes from it.

Each history was folded twice, in the same pass.

The first fold carries a 32-byte accumulator and extends it once per
event: the next value is `SHA-256(previous || canonical bytes of the
event)`. It produced the two `head` lines, and they differ. The
repository calls this the identity fold, and its result the chain head.
Nobody writes its reducer — it is fixed by the canonical encoding, which
is what lets a stranger recompute the same value from the same events.

The second fold is an ordinary reducer over the events, the kind already
familiar from `Array.reduce` or `Stream.runFold`, and `stateDigest`
fingerprints the result. Its two lines are equal. The repository calls
this the meaning fold, and its result the fold state.

So the same two facts give one answer about what the histories mean and
two answers about which histories they are. Why the second fold is worth
carrying at all is the subject of
[why-two-folds.md](../explanation/why-two-folds.md); this tutorial only
shows that the two folds disagree, and where.

### Cut anywhere

The next three lines take history B, split it at every possible boundary
— before the first event, between the two, after the last — fold each
half independently, combine the two results, and digest. All three
digests match, and they match the uncut answer above.

That equality is a license rather than a curiosity. Because the combine
is associative over fold states, a history can be replayed in parallel
and merged, and the merge cannot change the answer. The same check runs
in the suite against a frozen corpus:
[`packages/core/test/stream.combine.test.ts`](../../packages/core/test/stream.combine.test.ts)
cuts `fixtures/stream-wall.json` at every split point and demands the
recombined digest equal a pin the Go side generated once.

The combine is associative and nothing more. It is neither commutative
nor idempotent, and the same test file pins a minimized counterexample
for each — last-write-wins is order-sensitive by construction, so
"we have a combine" does not license merging from anywhere.

### The fold that forgives

The final two lines append a third event whose payload is two bytes that
are not valid UTF-8, and hand it to both folds.

The identity fold extended anyway, to `d6c5ccfc…`. It has no domain to
be outside of: it hashes the canonical bytes of whatever arrives.

The meaning fold refused, returning `MalformedPayload` — a tagged error
on Effect's error channel, matchable by `_tag`, not a thrown exception
and not a null. One decoder walls the payload; the two callers dispose
of the refusal differently, and the split is one line at
[`packages/core/src/entity.ts:73`](../../packages/core/src/entity.ts).

That is the forgiveness the repository's motto names: the history
recorded that something arrived, while the state declined to interpret
it.

## Step 3 — the estate is green in seconds

```
$ bun test
```

```
 186 pass
 4 skip
 0 fail
 47364 expect() calls
Ran 190 tests across 16 files. [2.50s]
```

```
$ cd go && go test ./journal ./effector ./stream
```

```
ok  	foldlab/journal	1.553s
ok  	foldlab/effector	2.822s
ok  	foldlab/stream	1.042s
```

The four skips are the wasm wall, which auto-skips without a built
`dist/`.

Note the ratio: 47364 expectations across 190 tests. Many of these tests
are walls, and a wall is a differential test — two implementations, one
input, digests compared — run across an entire frozen corpus rather than
a handful of hand-picked cases. The Go and TypeScript sides of the
combine do not agree because someone diffed them; they agree because
both land on the digest frozen in `fixtures/stream-wall.json`.

## Step 4 — a refusal, and the repair it carries

The daemon lives in a separate project. Change into it and run the
refusal tour:

```
$ cd proto/ts
$ bun examples/refusals.ts
```

```
error: Cannot find package 'effect' from '.../proto/ts/src/wire.ts'
```

This is expected on a fresh checkout, and it is the one setup gotcha in
the walkthrough. `proto/ts` is its own bun project, and `effect` is not
hoisted to the root `node_modules` — it resolves only from
`packages/core/node_modules` and from `proto/ts/node_modules`. Install
inside `proto/ts` and run again:

```
$ bun install
$ bun examples/refusals.ts
```

The first run compiles the `protod` binary with `go build` and starts it
against a temporary JetStream store, so it takes noticeably longer than
later runs. The script stops the daemon and removes the store when it
finishes.

### A request that breaks a law

The script submits a type whose node kind is misspelled — `strng` for
`string`:

```jsonc
{
  "ok": false,
  "refusal": {
    "kind": "invalid-structure",
    "law": "flb.type.v0: unknown kind refuses — the grammar grows under ticket 004, never by admission on faith",
    "path": [
      "structure",
      "k"
    ],
    "got": "strng",
    "expected": [
      "string",
      "bool",
      "int",
      "null",
      "opaque",
      "literal",
      "list",
      "struct",
      "union",
      "brand",
      "check",
      "ref"
    ],
    "example": {
      "k": "string"
    },
    "next": [
      {
        "subject": "flb.req.type.create",
        "note": "repair the node at path and resubmit; same bytes converge, they never error"
      },
      {
        "subject": "flb.req.contract.describe",
        "note": "request the daemon's contract; every subject and body shape is described there",
        "body": {}
      }
    ],
    "local": false
  }
}
```

Read the fields, because they are the whole design. `law` names the rule
that refused. `path` locates the offending node inside the submitted
document. `got` and `expected` are the value sent and the values that
would be accepted. `next` lists legal follow-up requests by subject.
`local: false` says the daemon refused, as against a client-side refusal
such as an unreachable connection, which carries `local: true`.

And `example` is a value that would have been accepted.

### The repair

The script's next request resubmits `refusal.example` unmodified:

```jsonc
{
  "ok": true,
  "fact": {
    "ok": true,
    "created": true,
    "digest": "3b67b844b3d096bc06a752cfdb4ff7ba292aa25662d6ee36e65135df797f2fc0",
    "scheme": "bytes-sha256-v1",
    "catalogSeq": 0,
    "catalogHead": "6eb9fbb9d55ea916cb003bdd9bdb235de3d8b5b36048ed93621a07eb144101c7",
    "next": [
      {
        "subject": "flb.ing.data",
        "note": "publish a canonical frame claiming this type (request/reply; the reply admits or refuses)",
        "body": {
          "payload": "<your event payload>",
          "type": "3b67b844b3d096bc06a752cfdb4ff7ba292aa25662d6ee36e65135df797f2fc0"
        }
      },
      {
        "subject": "flb.req.journal.read",
        "note": "read the catalog — it is just a journal; verify the head locally",
        "body": {
          "from": {
            "head": "0000000000000000000000000000000000000000000000000000000000000000",
            "seq": -1
          },
          "journal": "catalog",
          "max": 0
        }
      }
    ]
  }
}
```

No documentation was consulted between those two requests. The repair
input came out of the refusal, and the reply now carries `next[].body`
templates already filled in with the digest just minted. The assertion
that this thread holds is committed at
[`proto/ts/test/smoke.test.ts`](../../proto/ts/test/smoke.test.ts),
where the repair line reads `session.createType(refusal.example as
Json)` under the comment `// No docs were consulted.`

### The identity the daemon will not take on faith

Later the script asserts a digest the daemon cannot re-derive from the
submitted bytes:

```jsonc
{
  "ok": false,
  "refusal": {
    "kind": "digest-mismatch",
    "law": "W1: no asserted identity — every committed digest is recomputed by the daemon from submitted bytes",
    "path": [
      "assertedDigest"
    ],
    "got": "dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
    "expected": "0c1ffc280256132e234ff9bddd2e2a6044c4e82ba06d6e97e059684cc56b3697",
    "next": [
      {
        "subject": "flb.req.type.create",
        "note": "drop assertedDigest (the daemon derives it), or assert the expected value"
      }
    ],
    "local": false
  }
}
```

The next line the script prints is the same structure hashed on the
client side, by a function that never spoke to the daemon:

```
local structureDigest({k:'bool'}) = 0c1ffc280256132e234ff9bddd2e2a6044c4e82ba06d6e97e059684cc56b3697
```

Two independent computations, one hex string. The daemon's `expected`
was not an opinion to accept; it was a number to check.

### The read that verifies itself

The script's last request reads the catalog back:

```jsonc
{
  "ok": true,
  "fact": {
    "journal": "catalog",
    "entries": [
      {
        "seq": 0,
        "prev": "0000000000000000000000000000000000000000000000000000000000000000",
        "payload": "{\"digest\":\"3b67b844b3d096bc06a752cfdb4ff7ba292aa25662d6ee36e65135df797f2fc0\",\"scheme\":\"bytes-sha256-v1\",\"structure\":{\"k\":\"string\"},\"submitter\":\"\"}"
      }
    ],
    "verified": {
      "seq": 0,
      "head": "6eb9fbb9d55ea916cb003bdd9bdb235de3d8b5b36048ed93621a07eb144101c7"
    }
  }
}
```

The catalog is a journal like any other, and its first entry is the type
created two requests ago. Its `prev` is the all-zero genesis value.

The interesting field is easy to scroll past, because nothing went
wrong. That `head` is the number the client recomputed, not the number
the daemon claimed. The client re-folded the returned entries locally
and compared its own result against the daemon's claim before returning
this reply; had they disagreed it would have produced a refusal of kind
`verify-failed` carrying `local: true`
([`proto/ts/src/client.ts`](../../proto/ts/src/client.ts)). The daemon
expects exactly that, and its own wire reply carries the note
`heads are claims: recompute the chain head from the entries locally`
([`proto/go/protod/read.go`](../../proto/go/protod/read.go)).

Compare the head against the `catalogHead` in the creation reply above:
the same value, arrived at twice, from opposite sides of a socket.

Between the two, the script also prints three refusals this tutorial has
skipped: publishing a frame against an identity the catalog never
admitted, reading a journal that does not exist, and reading from a
cursor the daemon never issued. Each carries the same fields.

## What was named, and where it is defined

| Named here | Defined at |
| --- | --- |
| identity fold, chain head | [CONTEXT.md](../../CONTEXT.md) |
| meaning fold, fold state | [CONTEXT.md](../../CONTEXT.md) |
| refusal, and its nine kinds | [proto/wire/CONTRACT.md](../../proto/wire/CONTRACT.md) |
| W1, W4, W6 and the other laws | [proto/SPEC.md](../../proto/SPEC.md) |
| wall, rung, bound, residual | [VERIFICATION.md](../../VERIFICATION.md) |

## Where to go next

- [Pick your first minute](pick-your-first-minute.md) — the same system
  entered from Effect, platform operations, or audit work, one existing
  command and its output at a time.
- [Why two folds](../explanation/why-two-folds.md) — why the chain head
  is kept when the fold state is already an answer.
- [CONTEXT.md](../../CONTEXT.md) — the ubiquitous language, worth
  consulting during work rather than reading front to back.
- [VERIFICATION.md](../../VERIFICATION.md) — every claim with its rung,
  its bounds, and the file it is checkable at.
