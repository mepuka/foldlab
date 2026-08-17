# Transcript — verified LRAT checking and certificate tampering

Executed by the RQ-7 research seat on **2026-08-16**, Windows 11 Home
10.0.26200, Git Bash, Lean 4.33.0 (`x86_64-w64-windows-gnu`, commit
`d8b18978322de05a8f3dba51ef03cf5461676c17`), elan 4.2.3. No network, no
Lean package other than core.

Command: `bash run.sh` in this directory.

## Recorded output

```
===== toolchain =====
Lean (version 4.33.0, x86_64-w64-windows-gnu, commit d8b18978322de05a8f3dba51ef03cf5461676c17, Release)
elan 4.2.3 (b6cec7e10 2026-06-08)

===== 1. the verified checker, its soundness theorem, and the axiom delta =====
Std.Tactic.BVDecide.LRAT.check : Array Std.Tactic.BVDecide.LRAT.IntAction → Std.Sat.CNF Nat → Bool
Std.Tactic.BVDecide.LRAT.check_sound : ∀ (lratProof : Array Std.Tactic.BVDecide.LRAT.IntAction) (cnf : Std.Sat.CNF Nat),
  Std.Tactic.BVDecide.LRAT.check lratProof cnf = true → cnf.Unsat
'Std.Tactic.BVDecide.LRAT.check_sound' depends on axioms: [propext, Classical.choice, Quot.sound]
'satPath' depends on axioms: [propext, Classical.choice, Quot.sound, satPath._native.bv_decide.ax_1_5]
'normPath' depends on axioms: [propext, Quot.sound]
[inspect] exit=0 wall=9459ms

===== 2. emit a certificate (external solver runs here) =====
Try this:
  [apply] bv_check (timeout := 300)"Emit.lean-mulComm8-18-2.lrat"
[emit] exit=0 wall=2807ms
certificate bytes: 5831357

===== 3. tamper the copies =====
-rw-r--r-- 1 kokok 197610 5831357 Aug 16 17:40 flip.lrat
-rw-r--r-- 1 kokok 197610 5831357 Aug 16 17:39 good.lrat
-rw-r--r-- 1 kokok 197610 2915678 Aug 16 17:40 trunc.lrat

===== 4a. honest certificate — expect exit 0 =====
'mulComm8' depends on axioms: [propext, Classical.choice, Quot.sound, mulComm8._native.bv_decide.ax_1_5]
[good] exit=0 wall=2250ms

===== 4b. one byte flipped — expect nonzero =====
.../CheckFlipped.lean:10:2: error: SAT solver produced invalid LRAT: offset 65002: Expected a or d got: 19
[flipped] exit=1 wall=1555ms

===== 4c. truncated — expect nonzero =====
.../CheckTruncated.lean:10:2: error: SAT solver produced invalid LRAT: offset 2915678: unexpected end of input
[truncated] exit=1 wall=1861ms

===== 4d. genuine certificate, different (true) claim — expect nonzero =====
.../CheckWrongGoal.lean:15:2: error: Tactic `bv_decide` failed: The LRAT certificate could not be verified; evaluating the following term returned `false`:
  Std.Tactic.BVDecide.Reflect.verifyBVExpr mulComm16._expr_def_1_1 mulComm16._cert_def_1_1
[wrong-goal] exit=1 wall=2208ms

===== cleanup =====
certificates removed; committed tree is source only
```

(Long absolute paths in the four error lines were abbreviated to `...`;
nothing else was edited.)

## What this establishes

1. **The soundness theorem is one-directional.**
   `check_sound : check lratProof cnf = true → cnf.Unsat`. Success
   implies the claim. *Nothing whatever is claimed when the checker
   fails* — a refused certificate is not evidence that the claim is
   false. This is the exact shape of a per-run certificate and the exact
   respect in which it is weaker than a universal proof.

2. **The checker's own theorem costs nothing extra.** It sits on
   Lean's three standard axioms: `propext`, `Classical.choice`,
   `Quot.sound`.

3. **Using the checker on a certificate costs one axiom, and the cost
   is visible.** `satPath` carries
   `satPath._native.bv_decide.ax_1_5` — an axiom minted per declaration
   asserting that the compiled reflection term evaluated to `true`. The
   Lean 4.33.0 source states the boundary itself
   (`src/lean/Init/Tactics.lean`, docstring of `bvDecideMacro`):
   "`bv_decide` trusts the correctness of the code generator and adds a
   axioms asserting its result." (sic).
   The axiom-minting site is `Lean.Meta.nativeEqTrue` in
   `src/lean/Lean/Meta/Native.lean`, which builds a
   `Declaration.axiomDecl` of type `e = Bool.true` after evaluating `e`
   with the compiler.

4. **The delta is attributable.** `normPath`, closed by the normalizer
   without ever calling the solver, carries no such axiom
   (`[propext, Quot.sound]`). So `#print axioms` distinguishes "proved"
   from "certified by an evaluated checker" declaration by declaration.
   That is the analogue of D-e's footprint check for the certificate
   route.

5. **Certificate size tracks search effort, not statement size.**
   `∀ a b : BitVec 8, a * b = b * a` is a one-line statement; its
   trimmed binary LRAT certificate is **5,831,357 bytes**.

6. **Three tampering modes, three refusals, all exit 1**: a single
   flipped byte (parse error at the flip site), truncation (unexpected
   end of input), and a *genuine, uncorrupted* certificate presented
   against a different — and equally true — claim (checker evaluates to
   `false`). The third is the one worth carrying into REF-8: the
   certificate was valid, just not of this claim.

## An additional measurement, run separately (not part of `run.sh`)

Same machine, same session, same toolchain, in a scratch directory.
Reproduce with an `Emit.lean` whose theorem is
`theorem mulcomm12 (a b : BitVec 12) : a * b = b * a := by bv_decide? (timeout := 600)`.

| Goal | Certificate bytes | Outcome |
| --- | --- | --- |
| `(a &&& b) + (a ^^^ b) = a ||| b`, `BitVec 64` | 130,160 | checked, exit 0 |
| `a * b = b * a`, `BitVec 8` | 5,831,357 | checked, exit 0 |
| `a * b = b * a`, `BitVec 12` | **733,925,046** | **checking failed**: `(deterministic) timeout at 'whnf', maximum number of heartbeats (200000) has been reached`, after 444 s wall |

The 12-bit failure is a *checking* failure, not a solving failure — the
solver produced the certificate and Lean could not finish checking it
under the default `maxHeartbeats`. Whether raising `maxHeartbeats` would
let it complete was **not tested**; the honest statement is that the
default limits refuse it. Four bits of width multiplied the certificate
by 126×. Nothing here was cleaned up into a nicer number.

## What this reproduction does *not* show

* Nothing about foldlab's own kernel, journal, or wire model. The subject
  is the architecture of certificate checking, on a system that already
  implements it.
* Nothing about a certificate that is *maliciously* crafted to exploit
  the checker rather than merely corrupted. The three tampers are
  corruption and misattachment, not adversarial construction against the
  checker's parser.
* No claim that `bv_check`'s wall-clock numbers transfer to any other
  workload. At these sizes the measurements are dominated by Lean
  process startup (`import Std.Tactic.BVDecide` alone is ≈1.9 s on this
  machine), which is why no solve-versus-check speed ratio is asserted
  from them.
