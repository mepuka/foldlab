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

`FabricVeil/Proofs.lean` holds the two rostered capstones. The gate reads Lean's
`#print axioms` output and permits only `propext`, `Classical.choice`, and
`Quot.sound`; it refuses `sorryAx`. This proves the named theorem terms have no
admitted proof in their dependency footprint. It does not prove the exporter,
JSON printer, runtime, NATS server, SHA-256, or compiler correct. The trusted-mode
control intentionally produces `sorryAx`, and the same checker must reject it.

`#model_check` interprets three holders, two outcomes, a token cap of three, and
explores 66 states without a violation. That finite search is falsification
evidence, never a proof substitute. Its value is fast counterexample discovery;
the unbounded safety claim comes from invariant preservation.

`FabricVeil/Corpus.lean` constructs valid Veil `Trace` values, checks each prefix
against the transition relation, and deterministically exports 12 accepted or
refused attempts. TypeScript and Go replay those rows on NATS KV. The exporter
and printer are deliberately named trusted glue rather than smuggled into the
kernel claim.

## Bounds

The claim is SAFETY ONLY: token monotonicity, strict grant/steal fencing,
at-most-one landed outcome, and no stale-token landing. It says nothing about
liveness, fair retry, deadlines, lease progress, clustering, or behavior across
different work digests. The runtime wall is single-node, non-clustered R=1.

## Windows substrate

`setup-windows.ps1` implements the measured landscape recipe: it applies the
pinned cvc5 Clang patch idempotently, downloads MSYS2 libc++ 19.1.4 into `.lake`,
checks both pinned hashes, verifies the official MSYS2 signature, and sets the
two compiler search paths before re-entering `run.sh`. Non-Windows runs record a
clean patch skip. Every gate run prints platform, compiler/toolchain, pins, cvc5
binary SHA-256, wall-clock seconds, and exit status.
