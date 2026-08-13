# go/ — module vocabulary (substrate)

Local terms hidden behind the substrate's seam. The public language is
root [CONTEXT.md](../CONTEXT.md); nothing here may leak into it.

**Register**:
The effector's single authority value per work digest:
`Absent | Claim(fence, owner, lease) | Done(fence, result)`. One
linearization point per digest; `Done` is terminal.

**Fence**:
The generation number on a claim. Fencing is generations, never
identity: a commit below the maximum linearized generation cannot land
(proven). Stealing increments the fence by revision-CAS.

**Steal**:
Claiming over a live claim (fence+1). Legal at any time; safety never
depends on the previous holder noticing.

**Lease**:
A claim's expiry. Liveness only — it decides when stealing is polite,
never whether a commit is safe.

**Outcome**:
The committed result in `Done`. Exactly one per digest, forever; the
moment codata (work happening) becomes data (a thing that happened).

**Watch**:
The KV live plane over registers (`effector/watch.go`, WL1–WL4).
Chatter, never authority: the feed only ever needs to be
recoverable-from, because the register is the truth.
