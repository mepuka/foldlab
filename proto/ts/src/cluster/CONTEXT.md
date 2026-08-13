# cluster/ — durable-messaging adapter vocabulary

Local terms behind the tracer-bullet seam. The public language lives in the
root and proto `CONTEXT.md` files.

**JournalMessageStorage**:
The proposed Effect `MessageStorage` adapter whose durable facts would be
stored and verified through `ProtoClient`. Its governing law is singular:
**durable messaging rides the narrow writ**. This module never sees NATS,
JetStream, SQL, CAS, or fencing machinery; it may only compose the writ
client's `read`, `publish`, and `request` verbs. If the pinned Effect contract
requires a semantic that those verbs cannot express, the adapter refuses to
exist until that mismatch is ratified.

_Avoid_: NATS storage, journal driver (both leak machinery across the seam).
