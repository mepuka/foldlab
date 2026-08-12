# P2b — Durable Journal (NATS JetStream binding)

Status: **SPEC RULED — climbing.** The fitness function is
`go/journal/journal_test.go` (embedded NATS server, no network). Coordinator-
owned; do not edit it or this document. A law that seems wrong is a finding
for the attempts log, not an edit.

## Definition

The P1 chain made durable: one journal = one JetStream stream carrying one
chain, where the broker enforces what the pure layer proved. Integrity still
derives from content (the P1 chain rules, re-verified on every read);
durability, single-writer-per-position, and duplicate absorption come from
JetStream primitives (create-only CAS, message dedup, deny flags). Trustless
posture unchanged: a reader trusts nothing it did not recompute.

One new Go package: `go/journal` (module `playground/kernel`, depends on
`playground/kernel/canonical` and the pinned `nats.go` v1.53.1 /
`nats-server` v2.14.4 — already in the coordinator-owned go.mod; no other
dependencies).

```go
package journal

type Cursor struct {
    Seq  int    // last VERIFIED entry position; -1 at genesis
    Head string // chain head at that position; canonical.Genesis at genesis
}

type AppendOutcome string
const (
    Stored    AppendOutcome = "stored"
    Duplicate AppendOutcome = "duplicate" // byte-identical retry absorbed
)

// Sentinel errors (errors.Is-able):
var ErrBadStream error  // existing stream fails the shape proof at bind
var ErrConflict error   // CAS refused: another writer owns the position
var ErrTampered error   // read verification failed; wrap with position detail

type Journal struct{ /* opaque */ }

// Open ensures the stream exists with the PINNED shape (below), or — if it
// already exists — PROVES the shape and refuses (ErrBadStream) otherwise.
// It then reads the tail to learn (seq, head). Open performs no writes to an
// existing conformant stream.
func Open(ctx context.Context, js jetstream.JetStream, name string) (*Journal, error)

// Next position and current head, as learned at Open/last successful op.
func (j *Journal) Head() Cursor

// Append: builds the next ChainEntry from the local (seq, head), publishes it
// create-only, returns the entry and outcome.
func (j *Journal) Append(ctx context.Context, payload string) (canonical.ChainEntry, AppendOutcome, error)

// AppendEntry: publish a caller-built entry at ITS position (the blind-retry
// entrypoint — byte-identical retry after an uncertain outcome).
func (j *Journal) AppendEntry(ctx context.Context, e canonical.ChainEntry) (AppendOutcome, error)

// Read: walk entries from cursor.Seq+1, verifying the chain incrementally
// from cursor.Head. Returns at most max entries (max <= 0 means no bound),
// and the advanced cursor. THE CURSOR LAW: the returned cursor NEVER moves
// past an entry that failed verification — on tamper, return the entries
// verified so far, the cursor at the last good position, and ErrTampered
// (wrapped with the offending position and reason).
func (j *Journal) Read(ctx context.Context, from Cursor, max int) ([]canonical.ChainEntry, Cursor, error)
```

## Wire mapping (pinned)

- Stream name: `J_<name>`; single subject `j.<name>`. `<name>` must match
  `^[A-Za-z0-9_-]+$` (refuse otherwise).
- Message payload: the canonical encoding of the entry —
  `{"payload":…,"prev":…,"seq":…}` — exactly the bytes
  `canonical.EntryDigest` digests. The wire carries NOTHING else: no wrapper,
  no metadata object.
- `Nats-Msg-Id` = `canonical.EntryDigest(entry)` (content identity = dedup
  identity). Every published message carries it.
- Create-only CAS: publish with expected-last-subject-sequence =
  `entry.Seq` (0 for the first entry — on this single-subject stream, stream
  sequence k+1 holds entry k, so entry k expects last-subject-sequence k).
- **MEASURED (nats-server v2.14.4, standalone R=1): CAS is evaluated BEFORE
  msgId dedupe.** So a byte-identical retry carrying a now-stale expectation
  is REFUSED with `10071 wrong last sequence` (or `10164` on newer paths),
  NOT absorbed by the duplicate window. `AppendEntry` therefore resolves an
  uncertain outcome by READING the message at the contested stream position
  (`GetMsg` at `entry.Seq + 1`) and comparing `DigestHex(stored.Data)` to
  `EntryDigest(entry)`: equal ⇒ `Duplicate`, different bytes ⇒ `ErrConflict`,
  no message there ⇒ propagate the original error. (Implementations should
  ALSO accept a `PubAck.Duplicate` true and error code `10164`: the ordering
  inverts under clustering — `checkMsgHeadersPreClusteredProposal` dedupes
  first — and honoring both paths is free.) `Nats-Msg-Id` and the ≥2m
  duplicate window stay pinned for that R>1 path and as defense in depth.
  Do NOT drop the expectation header on retry to force absorption: an
  expectation-free publish after the window is unconditionally appended as a
  SECOND copy at the tail — the exact double-append this rung forbids.
  A CAS refusal on a DIFFERENT-bytes entry surfaces as ErrConflict.
- Read path: direct per-sequence reads (`GetMsg` at stream sequence
  `pos+1`), NEVER a consumer. The OrderedConsumer is REJECTED for reads by
  the tailtalk control arm (its client-side cursor resumes past unverified
  entries); this rung's Read has verification INSIDE the cursor advance, so
  the cursor is a claim about verified prefix, exactly P1's stepVerify lifted
  over I/O — PLUS one check the pure layer could not need: Read recomputes
  `DigestHex(raw.Data)` and requires it equal `EntryDigest(decoded entry)`.
  Non-canonical wire bytes of a semantically valid entry are ErrTampered at
  that position (the wire IS the canonical encoding, or it is nothing).
- `Append` refuses newline-bearing payloads with an error and publishes
  nothing (P1's append boundary, inherited). `AppendEntry` does not police
  payload content — a caller-built entry's digest is well-defined regardless.
- `Open` reads the tail as an UNVERIFIED bootstrap claim for (seq, head) —
  writer availability does not require replaying history. The cursor law is
  Read's: any reader that walks the chain re-proves it from its cursor, and a
  forged tail is detected by the first Read that crosses it. Open is honest
  about what it knows, not a verifier.
- Journal state lives in the STREAM, never in process-global memory: two
  servers carrying the same journal name are two independent journals.

## Stream shape (pinned, and PROVED at bind)

Created by Open when absent; verified via stream info when present:

- `Retention: Limits`, `Storage: File`, `Discard: Old` irrelevant at no
  limits — but NO MaxMsgs/MaxBytes/MaxAge limits are set (unbounded; the
  retention-by-outcome posture: nothing may evict an entry).
- `DenyDelete: true`, `DenyPurge: true` — broker-enforced append-only (the
  Cotal graft): the message-delete and purge APIs are refused even to a
  stream-API-holding caller.
- `Duplicates: >= 2 minutes` (the dedup window backing blind retry).
- Exactly one subject, `j.<name>`.

Open on an existing stream that violates ANY pin returns ErrBadStream
(shape-proved-at-bind: a trusted consumer verifies the store it binds to and
refuses to serve otherwise). Open never "fixes" a nonconformant stream.

## Laws (obligation table in the test file)

- **JL0 — Shape**: Open creates the pinned shape; a message delete attempt on
  a live journal is refused by the broker; Open against a pre-created stream
  missing the deny flags refuses with ErrBadStream.
- **JL1 — Round trip**: appended payloads (unicode, HTML metachars, U+2028)
  read back verbatim; the read cursor's head equals `canonical.BuildChain`'s
  head over the same payloads; the raw wire bytes of entry k digest to
  `EntryDigest(entry k)` (the P2a encoder IS the wire format).
- **JL2 — CAS**: a stale-position append (different bytes, occupied position)
  returns ErrConflict and changes nothing; a direct conflicting publish with
  the same expected-sequence discipline is refused by the server.
- **JL3 — Blind retry**: AppendEntry of a byte-identical entry twice returns
  Stored then Duplicate; the stream holds exactly one copy; the journal stays
  gap-free. (Uncertain outcome ⇒ retry the SAME bytes ⇒ absorbed.)
- **JL4 — Cursor discipline**: Read with max=2 then Read from the returned
  cursor concatenates to the full, verified sequence; resume never re-reads,
  never skips.
- **JL5 — Tamper evidence**: a forged entry written directly to the subject
  (valid CAS position, broken prev) is detected by Read at its exact
  position: entries before it are returned, the cursor stops at the last good
  position, ErrTampered carries the offending position. A second Read from
  the returned cursor refuses again — the cursor cannot be pushed past
  unverified bytes. Likewise a semantically valid entry with NON-CANONICAL
  wire bytes (correct seq and prev, loose spelling): the digest check refuses
  it at its position.
- **JL6 — Reopen**: Open against an existing journal continues the chain
  (correct seq/prev), and the full read equals the fold — restart loses
  nothing and forges nothing.
- **JL7 — State lives in the stream**: the same journal name on two
  independent servers is two independent journals; a fresh server's journal
  reads empty regardless of what any other server holds. (Kills any
  process-global cache keyed by name.)

## Verification

```
cd go && test -z "$(gofmt -l .)" && go vet ./... && go test ./...
```

Tests run an EMBEDDED nats-server per test: `server.Options{JetStream: true,
StoreDir: t.TempDir(), DontListen: true}` + `nats.InProcessServer` — tests
MUST NOT bind TCP/UDP ports (the tailtalk rule). The TS gate and the P2a
conformance gate must stay green and untouched.

## References

- Cotal SPEC §13.12 — create-only CAS (`Nats-Expected-Last-Subject-Sequence:
  0` shape), deny_delete/deny_purge permanence, retention by outcome,
  shape-proved-at-bind.
- tailtalk — OrderedConsumer control-arm rejection ("the resume cursor must
  never advance past an unfolded operation"), byte-identical retry on
  uncertain publish outcome, per-origin quarantine posture.
- multica — "already terminal = success": retry paired with idempotent
  acceptance (here: Duplicate outcome).
- NATS docs — JetStream publish expectations (`ExpectLastSequencePerSubject`),
  message dedup (`Nats-Msg-Id`), embedded server with `DontListen`.
- Local: P1 (chain laws), P2a (the wire bytes), fixtures/golden-conformance.
