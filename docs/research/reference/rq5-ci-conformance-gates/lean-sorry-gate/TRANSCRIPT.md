# Transcript — `bash run.sh`

Executed 2026-08-16 on Windows 11 (Git Bash), Lean 4.33.0 via elan 4.2.3.
Absolute paths in Lake's trace lines elided; nothing else edited.

```text
== toolchain
Lean (version 4.33.0, x86_64-w64-windows-gnu, commit d8b18978322de05a8f3dba51ef03cf5461676c17, Release)
Lake version 5.0.0-src+d8b1897 (Lean version 4.33.0)

== (1) lake build — a sorry is a WARNING
info: sorrylab: no previous manifest, creating one from scratch
info: toolchain not updated; already up-to-date
⚠ [2/4] Built SorryLab.Basic (784ms)
warning: SorryLab/Basic.lean:21:8: declaration uses `sorry`
✔ [3/4] Built SorryLab (716ms)
Build completed successfully (4 jobs).
lake build exit code: 0

== (2) source grep for the bare word sorry/admit
SorryLab/Basic.lean:9:  * `derived`   — the hole one hop away. No `sorry` token appears on any of
SorryLab/Basic.lean:12:  * `compiled`  — no `sorry` anywhere, and trust has moved into the compiler
SorryLab/Basic.lean:22:  sorry
SorryLab/Basic.lean:24:-- The token `sorry` appears on none of this declaration's lines.
SorryLab/Basic.lean:27:-- No `sorry` token anywhere; the trust moves into the compiler instead.

== (3) axiom footprint
'SorryLab.honest' does not depend on any axioms
'SorryLab.dishonest' depends on axioms: [sorryAx]
'SorryLab.derived' depends on axioms: [sorryAx]
'SorryLab.compiled' depends on axioms: [SorryLab.compiled._native.native_decide.ax_1_1]
lake env lean exit code: 0
```

## What the transcript establishes

1. **`lake build` exits 0 on a `sorry`.** The hole is a `warning:` line.
   A gate whose whole content is "the Lean project builds" is not a proof
   gate. (`lake build` has no `-DwarningAsError` short option: the
   attempted `lake build -DwarningAsError=true` returned
   `error: unknown short option '-D'`.)

2. **A source grep is necessary but not sufficient.** `derived` inherits
   `sorryAx` from `dishonest`; no `sorry` token appears on `derived`'s own
   lines. In a single file the grep still fires on the *dependency*, but
   the same construction across a package boundary — a dependency library
   the grep does not walk — is invisible to it. `#print axioms` sees it.

3. **`#print axioms` itself exits 0.** It reports on stdout. Any gate built
   on it has to parse the output and decide, which is what
   `verify/moves/run.sh` already does. A gate that merely *runs*
   `#print axioms` and checks the exit code checks nothing.

4. **`native_decide` mints a per-declaration axiom name.** Observed here:
   `SorryLab.compiled._native.native_decide.ax_1_1` — not a fixed,
   allowlistable symbol. An axiom check written as "reject any name not in
   {`propext`, `Classical.choice`, `Quot.sound`}" catches it. An axiom
   check written as "reject these known-bad names" would not. This matters
   for REF-6 specifically, where the compiler is the component whose trust
   is under discussion.
