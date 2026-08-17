# Transcript — session-certificate shape and its refusal roster

Executed by the RQ-7 research seat on **2026-08-16**, Windows 11 Home
10.0.26200, Git Bash, `bun 1.3.14`. No network, no packages.

Command: `bash run.sh` in this directory.

## Recorded output

```
runtime: bun 1.3.14

===== emit =====
wrote journal.json and certificate.json
kernelDigest      7bd9ac2e7e58e47b29b5d844cba0e93b7e52ec91e01e013b268a7997fb389ed3
journalHead       fcfaa248396b8a51d3a15ca172ee210301fcd057bd111a8556e5d88cfb2d9d17
finalStateDigest  72fab4b1dae90b1c091c2441a2e774242f1f6b0a268f6511c362e113a7c82ca6

===== 0. honest certificate — expect exit 0 =====
VERIFIED  session rq7-demo-0001
[honest] exit=0  as expected

===== 1. journal entry edited — expect refusal =====
REFUSED  O5 journal integrity: journal bytes do not match the certificate's journalDigest
REFUSED  O6 journal chain: entry 0 chain mismatch
REFUSED  O6 journal chain: head does not match certificate journalHead
REFUSED  O7 replay: entry 1: journal receipt {"effect":"repeat","ok":true}, kernel here returns {"ok":false,"refusal":"conflict"}
REFUSED  O8 verdict: replay reaches 138c1b6f... , certificate asserts 72fab4b1...
REFUSED  O8 verdict: replayed final state bytes differ from the certificate's finalState
[edited-entry] exit=1  as expected

===== 2. journal truncated (last entry dropped) — expect refusal =====
REFUSED  O4 journal extent: certificate 6 entries, journal has 5
REFUSED  O5 journal integrity: ...
REFUSED  O6 journal chain: head does not match certificate journalHead
REFUSED  O8 verdict: replay reaches 95d62a4e... , certificate asserts 72fab4b1...
REFUSED  O8 verdict: replayed final state bytes differ from the certificate's finalState
[truncated] exit=1  as expected

===== 3. certificate asserts a different verdict — expect refusal =====
REFUSED  O8 verdict: replay reaches 72fab4b1... , certificate asserts 7f2fab4b1...
[forged-verdict] exit=1  as expected

===== 4. certificate claims a different kernel — expect refusal =====
REFUSED  O1 kernel identity: certificate says 7fbd9ac2..., artifact here is 7bd9ac2e...
REFUSED  O6 journal chain: entry 0 chain mismatch
REFUSED  O6 journal chain: head does not match certificate journalHead
[wrong-kernel] exit=1  as expected

===== 5. the kernel artifact itself is modified — expect refusal =====
REFUSED  O1 kernel identity: certificate says 7bd9ac2e..., artifact here is 45c87a13...
REFUSED  O7 replay: entry 3: journal receipt {"ok":false,"refusal":"conflict"}, kernel here returns {"effect":"filled","ok":true}
REFUSED  O8 verdict: replay reaches 95d62a4e... , certificate asserts 72fab4b1...
REFUSED  O8 verdict: replayed final state bytes differ from the certificate's finalState
[swapped-kernel] exit=1  as expected

===== 6. control — after restoring the kernel, the honest run is green again =====
VERIFIED  session rq7-demo-0001
[restored] exit=0  as expected
```

(Digests abbreviated to their first eight hex characters after their
first full appearance; nothing else edited. The full run prints them in
full.)

## The eight obligations the checker re-derives

`check.mjs` holds only the kernel artifact, the journal, and the
certificate. Each obligation is a question of the form *could I have
reached this conclusion myself?*

| # | Obligation | Refuses |
| --- | --- | --- |
| O1 | kernel identity — `sha256(artifact I hold)` equals `certificate.kernelDigest` | a swapped or edited kernel |
| O2 | model version — the artifact's exported `MODEL_VERSION` equals the certificate's | a kernel of the right bytes but wrong declared semantics |
| O3 | session identity — certificate and journal name the same session | a certificate pinned to someone else's journal |
| O4 | journal extent — entry count matches | silent truncation or extension |
| O5 | journal integrity — `sha256(canonical(journal))` equals `certificate.journalDigest` | any byte edit anywhere in the journal |
| O6 | chain — the per-entry hash chain recomputes, and its head equals `certificate.journalHead`; the chain's genesis commits to the kernel digest | reordering, splicing, and kernel substitution |
| O7 | replay — every receipt is *re-derived* by running the kernel, never read from the journal | a journal whose receipts do not follow from its ops |
| O8 | verdict — the replayed final state and its digest equal the certificate's | a certificate that asserts a conclusion its own evidence does not reach |

## What the run establishes

1. **The certificate carries commitments, not answers.** It contains no
   intermediate state. Everything it asserts about the run is re-derived
   by O7/O8 from the kernel plus the journal. A certificate that shipped
   its intermediate states would be checking itself.

2. **Binding the kernel digest into the journal's genesis is load-bearing.**
   In control 4 the certificate's kernel digest was altered by one
   character; O1 caught it, and so did O6 — because the chain's genesis
   commits to that digest, a kernel substitution cannot be made
   consistent without rewriting the entire chain. This is the
   mechanical form of the D-d property "replay under a different kernel
   digest refuses by name."

3. **The refusals name the obligation.** Every control prints which of
   O1–O8 failed. A checker that printed only `REFUSED` would be much
   harder to act on when a real certificate fails in the field.

4. **A negative control that cannot fail is worse than no control.**
   The first version of control 1 used
   `sed 's/"ada"/"eve"/' journal.json` — but the op strings inside the
   journal are *escaped* JSON (`\"ada\"`), so sed matched nothing,
   produced an identical file, and the check reported `VERIFIED`
   with exit 0 for a control whose whole purpose was to be refused.
   That first run is the reason `run.sh` now edits the parsed structure
   and **asserts the bytes changed before running the check** (exit 2 if
   the tamper was a no-op). The failure is recorded here rather than
   quietly fixed, because it is the same species as the
   naive-corpus-reports-green hazard DEV-670 already hit.

## What this reproduction does *not* show

* **Replay agreement is not correctness.** `check.mjs` imports the *same*
  `kernel.mjs` that `emit.mjs` ran. A kernel that is wrong with respect
  to the model is wrong identically on both sides and this check stays
  green. What it detects is *tampering and substitution*, not semantic
  error. Detecting semantic error needs either the universal proof
  (REF-3/REF-4) or an independently authored checker — which is why the
  REF-0 grill record preserved the hand-written OCaml checker as an
  admissible REF-8 diversity candidate.
* Nothing about concurrency, crash, or partial-write behaviour of a real
  journal.
* Nothing about certificate *authenticity*. There is no signature here:
  the certificate is evidence that a verdict follows from a journal and
  a kernel, not evidence about who produced it.
* The canonical encoder in `kernel.mjs` is **not RFC 8785**. It is a
  sorted-key, integers-and-strings-only stand-in, deliberately chosen so
  this reproduction does not depend on the number-formatting question
  RQ-9 owns.
