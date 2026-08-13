# verify/ — module vocabulary (model gates)

Local terms behind the model gates' seam. The public language is root
[CONTEXT.md](../CONTEXT.md); nothing here may leak into it. Rung names
(R0–R5) belong to ticket 009 and are used here unchanged.

**Gate**:
What a rung costs before its claim may be spoken: the runs, the
controls, the committed evidence. Climbing is cheap; the gate is the
price of saying so.

**Spec**:
The `.tla` module stating the transition table — variables, actions,
invariants — once. Everything else in a gate directory is a config, a
control, or evidence.

**Config**:
A `.cfg` choosing bounds and which laws are in force. A config is where
a law gets switched OFF, which is why the faithless models share the
ratified spec instead of copying it.

**Faithless variant**:
A config that drops exactly one ratified law and MUST be refuted on
exactly that law's invariant. Also called the negative control.
_Avoid_: broken spec (the spec is not broken; the config is)

**Counterexample trace** (or **cex**):
The checker's verbatim state-by-state output for a refuted run,
committed beside its config. Evidence that the checker can fail, and
the shape a refutation of our own claims would take.

**Run record**:
The prose companion to a run: toolchain identity and jar digest,
bounds, states generated, distinct states, depth, flags, time. It pins
the toolchain by recording what actually ran.

**Closure**:
The checker explored every reachable state at the configured caps
(nothing left on queue), as opposed to stopping at a depth cutoff.

**Canary**:
A small config whose exact counts two different toolchain builds must
reproduce. A build that misses them is a finding, not a nuisance.

**Inductive candidate**:
A proposed `IndInv` before its obligations discharge. A candidate is
not a claim; rejected ones and their witnesses stay in `CLIMB.md`.

**Obligation**:
One numbered check inside an inductive claim — base (`Init => IndInv`),
consecution (`IndInv /\ Next => IndInv'`), state safety, action safety
— plus the controls whose verdict must be Error.

**Action property**:
A law about a STEP rather than a state, checked as `[][...]_vars`.
Admission-time facts are action properties; each carries a state-level
shadow so a violation is legible in both forms.
