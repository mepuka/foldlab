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

**Hole**:
The authoring-only node `{"k":"hole"}`. It marks one undecided type
position in a partial and never bears identity. _Avoid_: placeholder
(too broad), null (a decided value type).

**Partial type**:
An flb.type.v0 tree whose type-node positions may contain holes. It is
the complete state passed through each stateless concierge request;
union positions retain their order until final creation.

**Frontier**:
The deterministic list of a partial's holes, each with its path,
currently legal kinds and accepted example subtrees, plus a bounded
list of resolvable ref digests. Empty means the partial is decided.

**Concierge step**:
One pure `type.fill` or `type.unfill` request. It rewrites exactly one
type-node path and returns the updated partial and frontier; the daemon
retains no authoring session.

**Scheme**:
The identity-derivation seam (W10). `bytes-sha256-v1`: SHA-256 over
RFC 8785 canonical structure bytes. Ticket 004's exhaustive fold
arrives as a second scheme with no wire change.

**Author fold**:
Effect Schema → flb.type.v0, partial by design: what v0 cannot express
refuses (`beyond-v0`) with the uniform shape. Its check-name table is
the pin-independence seam: representation ids in, foldlab-owned names
out.

**Declaration ref**:
The non-parametric Effect Declaration used to author
`{"k":"ref","digest"}`; its required `identifier` is the digest.
The identifier bears identity because it is the Declaration node's only
canonicalizable substance.

**Round-trip wall**:
derive → compile → re-fold → same digest, over the frozen fixture
corpus. The proof that the effect-schema target and the author fold are
inverse enough to trust.

**Sketch target**:
A derivation target whose output is deliberately coarser than the
structure it renders (the Go one). Sketch status licenses imprecision
about which legal inputs are represented; it never licenses admitting
an illegal one, so a sketch still validates every child it glosses
over (D47).

**Identity-order traversal**:
The one seam every derivation target walks object fields through
(`fieldNamesInIdentityOrder`): RFC 8785's UTF-16 code-unit order, the
same order identity's bytes use. It is why "the path that refused" is
a fact rather than an artifact of how the value was constructed
(D48 disposition, D49).

**Cross-target consistency**:
The generalized law that for one structure all targets derive or all
refuse at the same path. It quantifies over future targets too, so
adding a target means joining the property, not extending a list.

**Ready line**:
The single JSON line protod prints once its surfaces are live:
`{"ready":true,"url":"nats://..."}`. Harnesses parse it; humans read it.

**Transcript**:
The session facade's ordered record of every verb, subject, sent body,
and received reply — what makes an agent thread auditable after the
fact. Sugar strictly above the writ.

## MCP conformance constraints (standing design law, 2026-08-14 — issue #16)

Recorded from the MCP deep-read at the pin against spec revision
2026-07-28; these bind every foldlab MCP surface:

- No per-connection variance of the served tool/resource/prompt list
  (the spec forbids it; the pin's EnabledWhen gating is not used).
- Digest-addressed resource URIs require exact-match routing proven
  by a conformance test before any resource ships — a repaired URI
  names a different value.
- Nothing depends on transport sessions, subscriptions, or
  server-initiated requests: the pin speaks a legacy protocol era
  with a stated removal window, and session state belongs in the
  journal, where it is recomputable evidence rather than transport
  state.
- Tool annotations are derived with the rest of the MCP surface:
  contract and journal reads are read-only/non-destructive; the W3
  create and C1 fill/unfill operations are convergent, non-destructive
  mutations; ingress and every unclassified future request remain
  destructive/non-idempotent until a law licenses a narrower claim.
