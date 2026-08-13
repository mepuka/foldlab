# proto/ — bullet-local vocabulary

Local terms behind this seam. The public language is root
[CONTEXT.md](../CONTEXT.md); nothing here may leak into it.

**Frame**:
The unit of PUBLISH: a JSON object claiming a cataloged type by digest
(`{"type":hex64,"payload":...}`). What a journal stores is the frame's
canonical bytes — the sender's formatting never survives ingress.
_Avoid_: event (a frame becomes an event once admitted), message.

**Fact**:
The ok-side of a reply: what the daemon now holds as true, plus `next`
hints teaching the caller its options (W7). Facts are recomputable;
refusals are their dual.

**Refusal kind**:
The machine-readable name of the one law that said no (`malformed`,
`invalid-structure`, `unknown-ref`, `digest-mismatch`,
`unknown-identity`, `bad-journal`, `unknown-journal`, `bad-cursor`,
`unknown-request`; client-local: `unreachable`, `malformed-reply`,
`verify-failed`, `beyond-v0`, `underivable`). The `local` flag names
the side that uttered it.

**Structure walk**:
The daemon's one pass over a submitted flb.type.v0 value: grammar
validation, teachable refusal construction, and ref collection for
catalog resolution. Strictness is what makes refusals teachable.

**Scheme**:
The identity-derivation seam (W10). `bytes-sha256-v1`: SHA-256 over
RFC 8785 canonical structure bytes. Ticket 004's exhaustive fold
arrives as a second scheme with no wire change.

**Author fold**:
Effect Schema → flb.type.v0, partial by design: what v0 cannot express
refuses (`beyond-v0`) with the uniform shape. Its check-name table is
the pin-independence seam: representation ids in, foldlab-owned names
out.

**Ref marker**:
The `flb.ref` annotation a compiled ref schema carries so re-folding
recovers `{"k":"ref","digest"}` instead of the inlined target. The one
annotation that bears identity — a deliberate carve-out (DECISIONS.md).

**Round-trip wall**:
derive → compile → re-fold → same digest, over the frozen fixture
corpus. The proof that the effect-schema target and the author fold are
inverse enough to trust.

**Ready line**:
The single JSON line protod prints once its surfaces are live:
`{"ready":true,"url":"nats://..."}`. Harnesses parse it; humans read it.

**Transcript**:
The session facade's ordered record of every verb, subject, sent body,
and received reply — what makes an agent thread auditable after the
fact. Sugar strictly above the writ.
