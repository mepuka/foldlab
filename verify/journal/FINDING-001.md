# FINDING 001 — the expected-position CAS guards the position, not the bytes under it

Status: **LAW RESTATED WITH ITS HYPOTHESIS**. Found 2026-08-19 while first
running the adversary configuration of the ratified model, before any law was
claimed. The counterexample is real, it is about the machine and not about the
model's plumbing, and the repair is to the law's *statement*, not to the
transition table.

## Result

The first draft of JL1 said, of the model with an adversary present:

```text
no APPENDER step breaks the chain
  [][(WellFormedChain(store) /\ tampers' = tampers) => WellFormedChain(store')]_vars
```

That is false, and TLC refutes it at depth 6. The committed trace is
`Journal.tamper.finding-001.cex.txt`; the minimal disagreement is:

```text
Begin(w=1, pay=1)     # snapshot: expected position 0, prev = genesis
Finish(1)             # stored at position 0; head is now <<1>>
Begin(w=1, pay=1)     # snapshot: expected position 1, prev = <<1>>
TamperPayload(1)      # storage rewrites position 0's payload 1 -> 2
Finish(1)             # the CAS still sees position 1 free, so the entry lands
```

After the last step the store is

```text
<< [pay |-> 2, prev |-> <<>>,  seq |-> 0],
   [pay |-> 1, prev |-> <<1>>, seq |-> 1] >>
```

which is not a well-formed chain: the record at position 1 links to `<<1>>`,
the head its predecessor used to have, while its predecessor now digests to
`<<2>>`. The step that broke the chain is an ordinary append, and it spent no
tamper budget — so the antecedent was satisfied and the consequent was not.

## Why this is the machine, not the model

`go/journal`'s append publishes with `WithExpectLastSequencePerSubject(seq)`.
That guard is about the stream's *last sequence*: it proves the position the
entry claims is still free. It reads nothing at the predecessor's position and
therefore cannot notice that the predecessor's bytes changed after the head was
snapshotted. Re-reading the predecessor before every publish would not close
the window either — the corruption can land between that read and the publish.

The estate's actual guarantee about corrupted storage is a READER's guarantee,
and this model states it separately as JL3: a verify-on-read fold over any
prefix reproduces the stored head or reports tamper at the first bad position.
In the trace above, the very next read refuses at position 1. Nothing is
silently accepted; what fails is only the claim that an appender can keep the
chain well formed while storage is being rewritten underneath it.

## Disposition

JL1 is stated with the hypothesis the CAS actually discharges. An appender's
snapshot is LIVE when the head it chained from is still the head storage
carries at that position; the law says that appenders never fork the chain
*from a live snapshot*:

```text
WritersNeverForkTheChain ==
  [][(WellFormedChain(store) /\ tampers' = tampers /\ AllSnapshotsAreLive)
       => WellFormedChain(store')]_vars
```

`AllSnapshotsAreLive` is trivially true in every corruption-free
configuration, so the law is unweakened where the CAS is the whole story —
which is where the negative control `NoCAS` refutes it, at the same bounds.
The two laws are now visibly independent: JL1 covers concurrent appenders, JL3
covers corrupted bytes, and neither is doing the other's work.

## What this finding does NOT license

It does not license a claim that corruption between snapshot and append is
detected at append time. It is not. The claim is that it is detected at read
time and that the appender's head adoption is separately licensed by the one
verifier (JL4). A consumer that appends and never reads inherits no
tamper-evidence from this model.
