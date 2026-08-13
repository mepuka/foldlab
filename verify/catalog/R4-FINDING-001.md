# R4 FINDING 001 — the split create action has no wire interposition seam

Status: **OPEN; R4 NOT CLAIMED**. Found 2026-08-13 CDT after both required
negative-control classes passed and before any honest pass count was claimed.

## Result

The model snapshots absence at `CreateBegin` and makes `CreateFinish` a CAS at
that remembered catalog length. The current daemon offers one atomic,
serialized `type.create` request. There is no public or handed-substrate seam
at which the harness can pause that request after its resolve-check and before
its append.

The minimal disagreement is:

```text
CreateBegin(c=1,d=1,v=1)  # model snapshots catalog length 0
CreateBegin(c=2,d=1,v=2)  # model snapshots catalog length 0
CreateFinish(c=2)          # model and protod append v2
CreateFinish(c=1)          # model: stale CAS conflict; protod: created:true v1
```

After step four, the model authority catalog is `[v2]`; the journal read from
the real daemon is `[v2,v1]`, and the pure resolve probe returns `{v1,v2}`
rather than `{v2}`. The driver's exact diagnostic is:

```text
modeled CreateFinish.conflict, but atomic type.create returned created:true
for value 1; the wire surface did not preserve the Begin-time absence snapshot
```

This is a **refinement-seam finding**, not evidence that the sequential daemon
violates W1 or W3. The atomic request can linearize at Finish and legitimately
append v1. What fails is ticket 010's required step-for-step mapping from the
proved split transition table to the current public binary. Treating the
fresh check as the earlier Begin would be a false replay; silently projecting
the append away would be worse.

## Reproduce the red evidence

From `proto/go`:

```text
go run ./catalogr4/cmd -mode honest
```

The command prints the expected and observed states plus the minimized
schedule, then exits 1. The regression test
`TestAtomicWireCreateCannotReplayTheModeledStaleConflict` keeps detection
green in the ordinary Go suite without laundering the R4 command's red
verdict into a conformance pass.

## Controls and coverage run first

```text
go run -tags catalogr4_sabotage ./catalogr4/cmd -mode sabotage
go run ./catalogr4/cmd -mode corrupted
go run ./catalogr4/cmd -mode coverage
```

- tagged daemon sabotage: caught on its first wrong committed digest;
- corrupted expected states: 133/133 caught;
- generated corpus: 133 schedules / 3,089 model steps;
- spec-state coverage: 1,326 / 12,707,989 = 0.010434381%;
- action coverage: 4/4 TLA disjuncts, 7/7 semantic branches.

The honest runner stopped on directed schedule 5 after 17 driven steps, as
required. It did not continue to manufacture a zero-divergence count.

## Disposition needed before R4 resumes

Choose and ratify a refinement boundary. Plausible directions are: expose a
substrate interposition point that does not alter production semantics;
change the executable model/refinement map so create is atomic at the wire
boundary while separately testing the journal CAS kernel; or make a
multi-handler authority deployment real and define its retry/result behavior.
This task makes no such design change: its rule was findings before fixes and
no daemon modification except the tagged sabotage build.

