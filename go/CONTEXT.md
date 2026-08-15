# go/ — module vocabulary (substrate)

Local terms hidden behind the substrate's seam. The public language is
root [CONTEXT.md](../CONTEXT.md); nothing here may leak into it. The
effector's vocabulary (register, fence, steal, lease, outcome, watch)
lives with the effector at tag `archive/pre-estate-focus`.

**Authority journal**:
The single writable home of a journal's facts. Imports nothing
(ADR-0009); every append is CAS on the expected head.

**Replica**:
A verified JetStream mirror of an authority, locally read-only. A
replica holds only a prefix of its origin.

**Verify-on-read**:
A reader recomputes the chain it is handed and refuses a break; no
fact is trusted because it was stored.

**Chain head**:
The running digest over a journal's canonical facts. Equal heads mean
equal histories; the head is the journal's identity at a moment.
