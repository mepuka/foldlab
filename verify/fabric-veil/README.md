# Plait commitment-register proof

This package is the machine-checked safety model behind Plait's per-work-digest
commitment register. Run its whole gate from the repository root with:

```sh
bash verify/fabric-veil/run.sh
```

## Guided tour

A `veil module` is a Lean declaration block that Veil expands into an explicit
transition system and its proof obligations. `FabricVeil/Statements.lean`
declares one abstract `holder` type, one abstract `outcome` type, immutable
inputs, and mutable state. The important state is the fencing `token`, the
descriptive holder, and whether an outcome has landed. Auxiliary fields remember
the previous token and landing count so the safety statements are direct.

The module has exactly five actions. `grant` requires absence and mints the
first token. `renew` accepts only the current token and advances it.
`commit` accepts only the current token while the outcome slot is empty.
`expireSteal` models expiry nondeterministically—there is deliberately no clock
in the meaning model—and grants a new holder a strictly larger token. `observe`
changes no meaning-state. No precondition treats holder identity as authority.

An `invariant` is a proposition claimed for every reachable state.
`#gen_spec` asks Veil to generate the transition-system definitions.
`#check_invariants` then generates an initialization obligation plus a
preservation obligation for every action/invariant pair. With
`veil.smt.trust=false`, cvc5 supplies proofs that lean-smt reconstructs and the
Lean kernel checks; cvc5's verdict alone is not installed as an axiom.
`#gen_theorems` then lands every discharged obligation as an addressable
theorem (`Register.<action>_<invariant>` plus the `initializer_*` forms).

`FabricVeil/Proofs.lean` is the census over those claim-carrying theorems:
all 36 generated verification conditions (six procedures × six invariant
clauses, pinned in `theorem-roster.txt`) are read back out of the kernel and
each proof term's axiom footprint must stay inside `propext`,
`Classical.choice`, and `Quot.sound`. `sorryAx` — the trusted-mode channel —
fails the build. This is enforcement by artifact: no log or source grep is
evidence here, because a trusted run can be log-silent (the round-1 review
proved it). The committed trusted-mode control (`Controls/TrustedMode.lean`)
discharges a minimal module's obligations in genuinely trusted mode and the
same census is shown refusing it on `sorryAx`. The two arithmetic warm-ups in
`Proofs.lean` carry no claim and say so.

`#model_check` interprets three holders, two outcomes, a token cap of three, and
explores 66 states without a violation. That finite search is falsification
evidence, never a proof substitute. Its value is fast counterexample discovery;
the unbounded safety claim comes from invariant preservation.

`FabricVeil/Corpus.lean` deterministically exports 15 accepted or refused
attempts, and `FabricVeil/Bridge.lean` drives every exported prefix step and
attempt through the module's GENERATED transition relation (the same
executable machinery `#model_check interpreted` runs) at a finite instance:
verdicts and observed states must agree step by step or the library build
fails, so the corpus can only regenerate as model-checked rows. The two
model-level negative controls are executed mutants — a commit without its
token guard and a steal without strict increase — whose violating states are
computed by running them; the bridge additionally executes the model-side
refutation of each (the generated relation refuses what the mutant accepts).
TypeScript and Go replay all 15 rows on NATS KV. The exporter binary itself
links only the corpus's small closure and stays trusted serialization glue.

## Bounds

The claim is SAFETY ONLY: token monotonicity, strict grant/steal fencing,
at-most-one landed outcome, and no stale-token landing. It says nothing about
liveness, fair retry, deadlines, lease progress, clustering, or behavior across
different work digests. The runtime wall is single-node, non-clustered R=1.
Every runtime claim holds within a fixed backing-stream incarnation;
administrative lifecycle mutation is outside the credential guard. The
incarnation pin at register-open is a recorded deferral
(`packages/plait/DECISIONS.md`); the DEV-716 ACL suite is the other half of
that guard. The corpus↔model bridge checks the exported rows at one finite
interpreted instance; the invariants themselves are proved for all instances.

## Windows substrate

`setup-windows.ps1` implements the measured landscape recipe: it applies the
pinned cvc5 Clang patch idempotently, downloads MSYS2 libc++ 19.1.4 into `.lake`,
checks both pinned hashes, verifies the official MSYS2 signature, and sets the
two compiler search paths before re-entering `run.sh`. Non-Windows runs record a
clean patch skip. Every gate run prints platform, compiler/toolchain, pins, cvc5
binary SHA-256, wall-clock seconds, and exit status.
