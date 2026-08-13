---
id: 013
title: Effector evidence goes public; the N-owner generalization
type: wayfinder:build
status: open
assignee:
blocked-by: []
---

## Question

The repository's strongest claim — the effector theorem — currently
points at proof artifacts in untracked heritage material
(`.reference/playground-mech/specs/`). A public claim requires public
evidence. Two parts:

1. **Port the evidence.** Bring Effector.tla, EffectorInd.tla, the
   TLC configs, the refuted two-key spec WITH its counterexample, and
   a run record into `verify/effector/`, under the same conventions as
   verify/catalog/ (run.sh, README with real output, negative
   controls). Re-run everything at the pinned toolchain so the run
   record is fresh, not inherited. VERIFICATION.md's effector section
   then points at files a stranger can check.
2. **Attack the owner bound.** The inductive invariant is checked at
   3 and 4 owners; the identity-free variant argues the bound is
   inessential. Attempt to make the argument a proof: an N-owner
   Apalache run via a symmetry reduction, or a short paper-proof that
   the identity-free register algebra admits a bisimulation from N
   owners to the self-interleaving single identity (the variant
   already checked). If the attempt fails, record WHY in a CLIMB.md —
   a bounded claim with a stated obstacle beats an unproved
   generalization.

Gate: verify/effector/ green end to end with fresh run records;
VERIFICATION.md updated — either the owner bound is discharged or its
obstacle is documented.
