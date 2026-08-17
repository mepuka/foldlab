# go/ — module vocabulary (substrate)

Local terms hidden behind the substrate's seam. The public language is
root [CONTEXT.md](../CONTEXT.md); nothing here may leak into it. The
archived effector/watch vocabulary remains at tag
`archive/pre-estate-focus`. DEV-711 introduces a fresh `register/` twin with a
narrower five-action vocabulary; it does not restore the archived watch lane.

**Commitment register**:
Fresh minimal twin of Plait's per-work-digest authority: grant, renew, commit,
expire-steal, and observe over the `flb-fab-reg` KV bucket.

**Fence token**:
The key's revision in the KV CAS order. A holder name never confers authority;
only the current revision can renew or commit.

**Landed outcome**:
The unique terminal value and the lease token under which it landed. A zombie
with an older token is refused within a fixed backing-stream incarnation;
administrative lifecycle mutation is outside the credential guard.

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
