# Recorded run — 2026-08-16

Machine: Windows 11, Git Bash, Lean 4.33.0 via elan (toolchain
`leanprover/lean4:v4.33.0`). Command: `bash run.sh`, exit status `0`.

```
== lean --version ==
Lean (version 4.33.0, x86_64-w64-windows-gnu, commit d8b18978322de05a8f3dba51ef03cf5461676c17, Release)

== 1. theorem holds, compiled code disagrees ==
'honest_eq' does not depend on any axioms
compiled honest 3 = 4

== 2. the exported C symbol carries the swap ==
LEAN_EXPORT lean_object* foldlab_honest(lean_object* v_n_6_){
_start:
{
lean_object* v___x_7_;
v___x_7_ = l_liar(v_n_6_);
lean_dec(v_n_6_);
return v___x_7_;
}

== 3. an ordinary ByteArray function reaches hand-written runtime C ==
      7 lean_dec_ref(
      3 lean_usize_of_nat(
      3 lean_dec(
      2 lean_usize_dec_eq(
      2 lean_usize_add(
      2 lean_unbox_usize(
      2 lean_uint8_to_nat(
      2 lean_nat_dec_lt(
      2 lean_nat_dec_le(
      2 lean_nat_add(
      2 lean_io_result_mk_ok(
      2 lean_io_result_is_error(
      2 lean_byte_array_uget(
      2 lean_byte_array_size(
      2 lean_box(
      1 lean_unsigned_to_nat(

== 4. csimp refuses the same swap without a proof ==
CsimpGuard.lean:13:0: error: Not a definitional equality: the left-hand side
  honest
is not definitionally equal to the right-hand side
  liar

GATE: PASS
```

## What each step establishes

1. A theorem with an **empty axiom footprint** — nothing the estate's
   existing footprint check would flag — coexists with a compiled program
   that computes a different function. Proof and artifact are two claims.
2. The divergence survives `@[export]`, the mechanism D-a selected: the
   C-callable symbol's body calls the replacement.
3. No annotation is required to reach hand-written C. An ordinary function
   over `ByteArray` — the kernel ABI's own type — compiles to calls into the
   Lean runtime's C. Those implementations are in the trusted base of any
   kernel we extract.
4. `@[csimp]` is the guarded alternative: same effect on compiled code,
   but the swap must be proved, and a false one is refused.
