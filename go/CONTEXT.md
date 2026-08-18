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

**Estate canonical JSON**:
The conformance corpus's one serialization: RFC 8785 for member order and
string escaping, with a number domain of unbounded non-negative integers
written as minimal decimal. Distinct from the substrate's RFC 8785 seam,
whose numbers are binary64 by the spec it implements.

**Both-ways law**:
Parsing every record of the corpus and re-emitting it reproduces the file
byte for byte. It subsumes the member-order, whitespace, escaping and
number-form checks at once, because a deviation in any of them changes a
byte.

**Brand**:
A declaration kind carried in a digest's TYPE. In the model a cross-brand
comparison has no type; in Go it is one defined type per kind, marked with
the `//foldlab:brand` directive so the lint can find it. A value-level
brand — the register that issued a token — has no type to become, and
survives only as a run-time check.

**Taught table**:
The refusal rows: reason, the law defended, the repair, and whether the
repair is a function of the refused candidate alone. The door never
refuses without teaching the legal next move, so no field is optional.

**Program declaration**:
One named DAG of generator applications, and the ninth corpus group. Nodes
are newest-first; a node's arguments are tagged references — a digest, an
older local node, a literal, or one of the program's declared holes — and
the edge list is exactly the consumptions those local references imply. It
is a declaration and its identity, never an execution record: nothing runs
one, and there is no argument tag for a clock, a seed, or a closure.

**Hole**:
A declared parameter of a program, not a wildcard. Filling one turns it into
a literal wherever it stands and retires it from the parameter list, which
is the valuation correspondence the holey and holey-filled vectors carry.
