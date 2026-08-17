# Transcript — status-as-gate

Executed 2026-08-16 on Windows 11 under Git Bash.

## Honest run

```text
$ bash check-status.sh
ok:   exports = 2
ok:   kernel-digest = 2456b762d1c97f9067c95bd520f234f5511473f035dee720fc3dc6ea9ed44e44
STATUS GATE: PASS (2 claims re-derived at HEAD)
exit=0
```

## Drifted run — one line added to `kernel/step.txt`

```text
$ bash check-status.sh
FAIL: exports — STATUS.md says '2', the sources say '3'
FAIL: kernel-digest — STATUS.md says '2456b762d1c9...44e44', the sources say '8b77ae44cacb...0dd1'
STATUS GATE: FAIL (2 of 2 claims false at HEAD)
exit=1
```

(Digests elided mid-string for width; the run printed both in full.)

## Anti-vacuity — the markers deleted from `STATUS.md`

```text
$ bash check-status.sh
FAIL: STATUS.md carries no gate:claim markers at all.
exit=1
```

## The checker's own refutation

```text
$ bash check-status.sh --self-test
self-test ok: planting one extra export refutes exactly the two
claims that cover it, and the checker exits nonzero.
exit=0
```

## What the reproduction is for

D-e obligation 5 asks for one command that re-verifies a documented
status claim at HEAD so the documentation cannot silently drift from the
code. Three properties are what make the shape work, and all three are
exercised above:

1. **The claim is where the prose is.** The marker sits beside the
   sentence it makes true. Editing the sentence without editing the marker
   leaves a lie in the prose that no gate sees, so the marker should carry
   the load-bearing number and the sentence should repeat it — which is
   why `STATUS.md` writes the value twice, once for each reader.

2. **Values are re-derived, never read back.** `kernel-digest` is computed
   from `kernel/` on every run. The failure mode this avoids is a gate
   that compares a status file against a lockfile that the same command
   regenerates — always green, checks nothing.

3. **Deleting the claim is a failure, not a pass.** The `seen -eq 0` check
   is the difference between "all claims hold" and "there were no claims".
   Without it the cheapest way to make the gate green is to delete the
   documentation.
