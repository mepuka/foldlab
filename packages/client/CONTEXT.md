# packages/client — module vocabulary

Local terms hidden behind this seam. The public language is root
[CONTEXT.md](../../CONTEXT.md); nothing here may leak into it.

**Verb**:
One of read / publish / request — the complete client surface. Anything
that is not one of the three verbs does not belong in this package.

**Request**:
A narrow-writ operation submitted as data on a daemon-owned subject
(type creation, journal append, effector operation, resource creation).
The reply is a fact or a refusal, never an exception.

**Refusal**:
The daemon's typed no — unknown identity, underivable digest, law
violation. Carried to the caller as a value; retry policy belongs to the
caller, not this package.
