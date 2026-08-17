# Transcript — Lean rebuild propagation across a proof-body edit

Recorded 2026-08-16 on Windows 11 (x86_64-w64-windows-gnu).
Command: `bash run.sh` in this directory.

```
== toolchain ==
Lake version 5.0.0-src+d8b1897 (Lean version 4.33.0)

== build 1 (proof of foo: 'by simp') ==
✔ [3/5] Built Exp.B (568ms)
✔ [4/5] Built Exp (551ms)
Build completed successfully (5 jobs).
A.olean 2d4ced4c87d2c9e0dac977313fb6c36cce9266a0fc127ac7adc9682e9c661eeb
B.olean 0f0d322aa5aa4eb5cb14cec2fe58ccf8d056735bcc5a8bc12ca01d0990180bbb

== edit: proof body ONLY (statement line untouched) ==
== build 2 ==
✔ [2/5] Built Exp.A (582ms)
✔ [3/5] Built Exp.B (577ms)
✔ [4/5] Built Exp (544ms)
Build completed successfully (5 jobs).
A.olean 231d9e18bc2456862314a9cfd563e303b0f018ffe145b09c8dcaf33ccedbe776
B.olean 8eb7b8803f24866673f408f92b8d7fb33b8d8c3587673e04cc777184876e37aa

== verdict ==
UPSTREAM olean changed (expected)
DOWNSTREAM olean CHANGED: a proof-body edit propagates a rebuild downstream.
```

## Variant tried the same session: Lean's module system

Lean 4.33.0 accepts the `module` / `public theorem` / `public import`
syntax; a variant of this experiment was run with `Exp/A.lean` and
`Exp/B.lean` written as modules. Build artifacts then split into
`A.olean`, `A.olean.private` and `A.olean.server`. The outcome was the
same in both sub-variants tried:

| variant | downstream rebuilt? | downstream `.olean` changed? |
| --- | --- | --- |
| classic (no `module` header) | yes | yes |
| `module` + `public import Exp.A` | yes | yes |
| `module` + plain (private) `import Exp.A` | yes | yes |

In every case the upstream `.olean` itself changed when only the proof
body changed, which is what drives the downstream rebuild.

**Scope of the claim.** This says what happened with these files under
Lean 4.33.0 and Lake 5.0.0-src+d8b1897. It does not establish that Lean
*cannot* isolate proof bodies from dependents, nor that some
attribute or option not tried here would change the result. It does
establish that the isolation is not obtained by default, and therefore
that Woos et al.'s Recommendation 5 (separate theorem statements from
their proofs) has a real target in Lean and is not already handled by the
build system.
