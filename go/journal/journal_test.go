// COORDINATOR-OWNED — the P2b fitness function. Do not edit (see CLAUDE.md).
//
// OBLIGATION TABLE (law -> test, 1:1; docs/primitives/P2b-journal.md):
//
//	JL0 pinned stream shape        -> TestOpenPinsStreamShape, TestOpenRefusesWrongShape,
//	                                  TestOpenAcceptsConformantVariant
//	JL1 round trip / wire = P2a    -> TestAppendReadRoundTrip (incl. header pins + newline refusal)
//	JL2 create-only CAS            -> TestAppendCASConflict
//	JL3 blind byte-identical retry -> TestUncertainRetryDuplicate
//	JL4 cursor discipline          -> TestResumeCursor
//	JL5 tamper evidence            -> TestForgedTailDetected, TestNonCanonicalWireRejected
//	JL6 reopen continues the chain -> TestReopenContinues
//	JL7 state lives in the stream  -> TestJournalStateIsPerStream
package journal_test

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/nats-io/nats-server/v2/server"
	"github.com/nats-io/nats.go"
	"github.com/nats-io/nats.go/jetstream"

	"foldlab/canonical"
	"foldlab/journal"
)

// ---------- embedded server harness (no ports: DontListen + InProcessServer) ----------

func startJetStream(t *testing.T) jetstream.JetStream {
	t.Helper()
	opts := &server.Options{
		ServerName: "p2b-test",
		JetStream:  true,
		StoreDir:   t.TempDir(),
		DontListen: true,
		NoSigs:     true,
	}
	srv, err := server.NewServer(opts)
	if err != nil {
		t.Fatalf("new server: %v", err)
	}
	go srv.Start()
	if !srv.ReadyForConnections(10 * time.Second) {
		t.Fatal("embedded server not ready")
	}
	t.Cleanup(func() {
		srv.Shutdown()
		srv.WaitForShutdown()
	})
	nc, err := nats.Connect("", nats.InProcessServer(srv))
	if err != nil {
		t.Fatalf("connect: %v", err)
	}
	t.Cleanup(nc.Close)
	js, err := jetstream.New(nc)
	if err != nil {
		t.Fatalf("jetstream: %v", err)
	}
	return js
}

func ctx(t *testing.T) context.Context {
	t.Helper()
	c, cancel := context.WithTimeout(context.Background(), 20*time.Second)
	t.Cleanup(cancel)
	return c
}

func mustAppend(t *testing.T, j *journal.Journal, payload string) canonical.ChainEntry {
	t.Helper()
	e, outcome, err := j.Append(ctx(t), payload)
	if err != nil {
		t.Fatalf("append %q: %v", payload, err)
	}
	if outcome != journal.Stored {
		t.Fatalf("append %q: outcome %v, want stored", payload, outcome)
	}
	return e
}

func mustEntryDigest(t testing.TB, entry canonical.ChainEntry) string {
	t.Helper()
	digest, err := canonical.EntryDigest(entry)
	if err != nil {
		t.Fatalf("EntryDigest(%+v): %v", entry, err)
	}
	return digest
}

func mustBuildChain(t testing.TB, payloads []string) ([]string, string) {
	t.Helper()
	digests, head, err := canonical.BuildChain(payloads)
	if err != nil {
		t.Fatalf("BuildChain: %v", err)
	}
	return digests, head
}

func rawPublish(t *testing.T, js jetstream.JetStream, name string, e canonical.ChainEntry, expectSeq uint64) (*jetstream.PubAck, error) {
	t.Helper()
	return rawPublishBytes(t, js, name, entryWire(t, e), mustEntryDigest(t, e), expectSeq)
}

func rawPublishBytes(t *testing.T, js jetstream.JetStream, name string, data []byte, msgID string, expectSeq uint64) (*jetstream.PubAck, error) {
	t.Helper()
	msg := nats.NewMsg("j." + name)
	msg.Data = data
	msg.Header.Set("Nats-Msg-Id", msgID)
	return js.PublishMsg(ctx(t), msg, jetstream.WithExpectLastSequencePerSubject(expectSeq))
}

// entryWire recomputes the pinned wire bytes of an entry via the P2a encoder,
// independently of the journal implementation.
func entryWire(t *testing.T, e canonical.ChainEntry) []byte {
	t.Helper()
	raw := []byte(`{"payload":` + jsonString(e.Payload) + `,"prev":"` + e.Prev + `","seq":` + itoa(e.Seq) + `}`)
	c, err := canonical.Canonicalize(raw)
	if err != nil {
		t.Fatalf("canonicalize entry: %v", err)
	}
	return c
}

func jsonString(s string) string {
	out, err := canonical.Canonicalize([]byte(quoteJSON(s)))
	if err != nil {
		panic(err)
	}
	return string(out)
}

// quoteJSON produces a valid (not necessarily canonical) JSON string literal;
// Canonicalize normalizes it.
func quoteJSON(s string) string {
	q := make([]byte, 0, len(s)+2)
	q = append(q, '"')
	for i := 0; i < len(s); i++ {
		b := s[i]
		switch b {
		case '"':
			q = append(q, '\\', '"')
		case '\\':
			q = append(q, '\\', '\\')
		case '\n':
			q = append(q, '\\', 'n')
		case '\r':
			q = append(q, '\\', 'r')
		case '\t':
			q = append(q, '\\', 't')
		default:
			if b < 0x20 {
				const hex = "0123456789abcdef"
				q = append(q, '\\', 'u', '0', '0', hex[b>>4], hex[b&0xf])
			} else {
				q = append(q, b)
			}
		}
	}
	return string(append(q, '"'))
}

func itoa(n int) string {
	if n == 0 {
		return "0"
	}
	digits := []byte{}
	for v := n; v > 0; v /= 10 {
		digits = append([]byte{byte('0' + v%10)}, digits...)
	}
	return string(digits)
}

// ---------- the laws ----------

func TestOpenPinsStreamShape(t *testing.T) {
	js := startJetStream(t)
	j, err := journal.Open(ctx(t), js, "shape")
	if err != nil {
		t.Fatalf("open: %v", err)
	}
	stream, err := js.Stream(ctx(t), "J_shape")
	if err != nil {
		t.Fatalf("stream lookup: %v", err)
	}
	cfg := stream.CachedInfo().Config
	if !cfg.DenyDelete || !cfg.DenyPurge {
		t.Fatalf("deny flags not pinned: delete=%v purge=%v", cfg.DenyDelete, cfg.DenyPurge)
	}
	if cfg.Storage != jetstream.FileStorage {
		t.Fatalf("storage: %v, want file", cfg.Storage)
	}
	if cfg.Retention != jetstream.LimitsPolicy {
		t.Fatalf("retention: %v, want limits", cfg.Retention)
	}
	if cfg.Duplicates < 2*time.Minute {
		t.Fatalf("duplicate window: %v, want >= 2m", cfg.Duplicates)
	}
	if len(cfg.Subjects) != 1 || cfg.Subjects[0] != "j.shape" {
		t.Fatalf("subjects: %v, want [j.shape]", cfg.Subjects)
	}
	mustAppend(t, j, "held")
	if err := stream.DeleteMsg(ctx(t), 1); err == nil {
		t.Fatal("broker accepted a message delete on a deny_delete journal")
	}
}

func TestOpenRefusesWrongShape(t *testing.T) {
	js := startJetStream(t)
	cases := []struct {
		name string
		cfg  jetstream.StreamConfig
	}{
		{
			name: "nodeny",
			cfg: jetstream.StreamConfig{
				Name:     "J_nodeny",
				Subjects: []string{"j.nodeny"},
				Storage:  jetstream.FileStorage,
				// deny flags deliberately absent
			},
		},
		{
			name: "twosubjects",
			cfg: jetstream.StreamConfig{
				Name:       "J_twosubjects",
				Subjects:   []string{"j.twosubjects", "j.other"},
				Storage:    jetstream.FileStorage,
				DenyDelete: true,
				DenyPurge:  true,
			},
		},
		{
			name: "bounded",
			cfg: jetstream.StreamConfig{
				Name:       "J_bounded",
				Subjects:   []string{"j.bounded"},
				Storage:    jetstream.FileStorage,
				MaxMsgs:    10, // an eviction limit: entries could silently vanish
				DenyDelete: true,
				DenyPurge:  true,
			},
		},
		{
			name: "shortwindow",
			cfg: jetstream.StreamConfig{
				Name:       "J_shortwindow",
				Subjects:   []string{"j.shortwindow"},
				Storage:    jetstream.FileStorage,
				Duplicates: 30 * time.Second,
				DenyDelete: true,
				DenyPurge:  true,
			},
		},
	}
	for _, tc := range cases {
		if _, err := js.CreateStream(ctx(t), tc.cfg); err != nil {
			t.Fatalf("precreate %s: %v", tc.name, err)
		}
		if _, err := journal.Open(ctx(t), js, tc.name); !errors.Is(err, journal.ErrBadStream) {
			t.Fatalf("open on nonconformant stream %s: err=%v, want ErrBadStream", tc.name, err)
		}
	}
}

func TestAppendReadRoundTrip(t *testing.T) {
	js := startJetStream(t)
	j, err := journal.Open(ctx(t), js, "rt")
	if err != nil {
		t.Fatalf("open: %v", err)
	}
	payloads := []string{
		"plain",
		"",
		"héllo — wörld \U0001F680",
		"<script>&amp;</script>",
		"line sep   para sep  ",
		`{"nested":"json"}`,
	}
	entries := make([]canonical.ChainEntry, 0, len(payloads))
	for _, p := range payloads {
		entries = append(entries, mustAppend(t, j, p))
	}
	got, cursor, err := j.Read(ctx(t), journal.Cursor{Seq: -1, Head: canonical.Genesis}, 0)
	if err != nil {
		t.Fatalf("read: %v", err)
	}
	if len(got) != len(payloads) {
		t.Fatalf("read length: %d, want %d", len(got), len(payloads))
	}
	for i, e := range got {
		if e.Payload != payloads[i] || e.Seq != i {
			t.Fatalf("entry %d: %+v, want payload %q seq %d", i, e, payloads[i], i)
		}
		if e != entries[i] {
			t.Fatalf("entry %d: read %+v != appended %+v", i, e, entries[i])
		}
	}
	digests, head := mustBuildChain(t, payloads)
	if cursor.Head != head {
		t.Fatalf("cursor head: %s, want fold head %s", cursor.Head, head)
	}
	if cursor.Seq != len(payloads)-1 {
		t.Fatalf("cursor seq: %d, want %d", cursor.Seq, len(payloads)-1)
	}
	// the wire bytes ARE the P2a canonical encoding: digest of raw message
	// data must equal the entry digest, per position
	stream, err := js.Stream(ctx(t), "J_rt")
	if err != nil {
		t.Fatalf("stream: %v", err)
	}
	for i := range payloads {
		raw, err := stream.GetMsg(ctx(t), uint64(i+1))
		if err != nil {
			t.Fatalf("getmsg %d: %v", i+1, err)
		}
		if canonical.DigestHex(raw.Data) != digests[i] {
			t.Fatalf("wire bytes at %d do not digest to the entry digest", i)
		}
		// content identity = dedup identity, pinned ON the wire
		if got := raw.Header.Get("Nats-Msg-Id"); got != digests[i] {
			t.Fatalf("Nats-Msg-Id at %d: %q, want the entry digest %q", i, got, digests[i])
		}
		// the create-only CAS discipline is pinned on the Append path too
		if got := raw.Header.Get("Nats-Expected-Last-Subject-Sequence"); got != itoa(i) {
			t.Fatalf("expected-last-subject-sequence at %d: %q, want %q", i, got, itoa(i))
		}
	}
	// newline payloads are refused at the Append boundary (P1's rule, inherited)
	if _, _, err := j.Append(ctx(t), "a\nb"); err == nil {
		t.Fatal("Append accepted a newline-bearing payload")
	}
	info, err := stream.Info(ctx(t))
	if err != nil {
		t.Fatalf("info: %v", err)
	}
	if info.State.Msgs != uint64(len(payloads)) {
		t.Fatalf("refused append changed the stream: %d msgs, want %d", info.State.Msgs, len(payloads))
	}
}

func TestJournalStateIsPerStream(t *testing.T) {
	// Two independent embedded servers, same journal name: state must live in
	// the stream, never in process-global memory keyed by name.
	jsA := startJetStream(t)
	jsB := startJetStream(t)
	jA, err := journal.Open(ctx(t), jsA, "x")
	if err != nil {
		t.Fatalf("open A: %v", err)
	}
	for _, p := range []string{"a", "b", "c"} {
		mustAppend(t, jA, p)
	}
	jB, err := journal.Open(ctx(t), jsB, "x")
	if err != nil {
		t.Fatalf("open B: %v", err)
	}
	if h := jB.Head(); h.Seq != -1 || h.Head != canonical.Genesis {
		t.Fatalf("journal B inherited state it never stored: %+v", h)
	}
	entries, cursor, err := jB.Read(ctx(t), journal.Cursor{Seq: -1, Head: canonical.Genesis}, 0)
	if err != nil {
		t.Fatalf("read B: %v", err)
	}
	if len(entries) != 0 || cursor.Seq != -1 {
		t.Fatalf("journal B read %d entries from an empty stream, cursor %+v", len(entries), cursor)
	}
}

func TestOpenAcceptsConformantVariant(t *testing.T) {
	// A pre-existing stream that SATISFIES every pin (deny flags, one subject,
	// unbounded limits, window >= 2m) but differs cosmetically must be
	// accepted: Open proves the shape, it does not demand byte-equal config.
	js := startJetStream(t)
	if _, err := js.CreateStream(ctx(t), jetstream.StreamConfig{
		Name:        "J_wide",
		Description: "pre-provisioned elsewhere",
		Subjects:    []string{"j.wide"},
		Storage:     jetstream.FileStorage,
		Retention:   jetstream.LimitsPolicy,
		Duplicates:  10 * time.Minute,
		DenyDelete:  true,
		DenyPurge:   true,
	}); err != nil {
		t.Fatalf("precreate conformant variant: %v", err)
	}
	j, err := journal.Open(ctx(t), js, "wide")
	if err != nil {
		t.Fatalf("open refused a conformant stream: %v", err)
	}
	mustAppend(t, j, "works")
}

func TestAppendCASConflict(t *testing.T) {
	js := startJetStream(t)
	j, err := journal.Open(ctx(t), js, "cas")
	if err != nil {
		t.Fatalf("open: %v", err)
	}
	first := mustAppend(t, j, "winner")
	// a rival entry at the SAME position with different bytes: CAS must refuse
	rival := canonical.ChainEntry{Seq: first.Seq, Prev: first.Prev, Payload: "loser"}
	if _, err := j.AppendEntry(ctx(t), rival); !errors.Is(err, journal.ErrConflict) {
		t.Fatalf("stale append: err=%v, want ErrConflict", err)
	}
	// and the raw publish path is refused by the SERVER, not by client courtesy
	if _, err := rawPublish(t, js, "cas", rival, uint64(rival.Seq)); err == nil {
		t.Fatal("server accepted a conflicting create-only publish")
	}
	entries, _, err := j.Read(ctx(t), journal.Cursor{Seq: -1, Head: canonical.Genesis}, 0)
	if err != nil {
		t.Fatalf("read: %v", err)
	}
	if len(entries) != 1 || entries[0].Payload != "winner" {
		t.Fatalf("journal changed by refused appends: %+v", entries)
	}
}

func TestUncertainRetryDuplicate(t *testing.T) {
	js := startJetStream(t)
	j, err := journal.Open(ctx(t), js, "retry")
	if err != nil {
		t.Fatalf("open: %v", err)
	}
	e := mustAppend(t, j, "once")
	// the blind retry after an uncertain outcome: SAME bytes, absorbed
	outcome, err := j.AppendEntry(ctx(t), e)
	if err != nil {
		t.Fatalf("retry append: %v", err)
	}
	if outcome != journal.Duplicate {
		t.Fatalf("retry outcome: %v, want duplicate", outcome)
	}
	stream, err := js.Stream(ctx(t), "J_retry")
	if err != nil {
		t.Fatalf("stream: %v", err)
	}
	info, err := stream.Info(ctx(t))
	if err != nil {
		t.Fatalf("info: %v", err)
	}
	if info.State.Msgs != 1 {
		t.Fatalf("stream holds %d messages, want exactly 1", info.State.Msgs)
	}
	// and the journal can continue appending past the absorbed retry
	next := mustAppend(t, j, "twice")
	if next.Seq != 1 || next.Prev != mustEntryDigest(t, e) {
		t.Fatalf("chain broken after duplicate: %+v", next)
	}
}

func TestResumeCursor(t *testing.T) {
	js := startJetStream(t)
	j, err := journal.Open(ctx(t), js, "resume")
	if err != nil {
		t.Fatalf("open: %v", err)
	}
	payloads := []string{"a", "b", "c", "d", "e"}
	for _, p := range payloads {
		mustAppend(t, j, p)
	}
	first, c1, err := j.Read(ctx(t), journal.Cursor{Seq: -1, Head: canonical.Genesis}, 2)
	if err != nil {
		t.Fatalf("read 1: %v", err)
	}
	if len(first) != 2 || c1.Seq != 1 {
		t.Fatalf("bounded read: %d entries, cursor %+v", len(first), c1)
	}
	rest, c2, err := j.Read(ctx(t), c1, 0)
	if err != nil {
		t.Fatalf("read 2: %v", err)
	}
	if len(rest) != 3 {
		t.Fatalf("resume read: %d entries, want 3", len(rest))
	}
	all := append(first, rest...)
	for i, e := range all {
		if e.Payload != payloads[i] {
			t.Fatalf("entry %d: %q, want %q (no skip, no re-read)", i, e.Payload, payloads[i])
		}
	}
	_, head := mustBuildChain(t, payloads)
	if c2.Head != head || c2.Seq != 4 {
		t.Fatalf("final cursor %+v, want seq 4 head %s", c2, head)
	}
}

func TestForgedTailDetected(t *testing.T) {
	js := startJetStream(t)
	j, err := journal.Open(ctx(t), js, "forge")
	if err != nil {
		t.Fatalf("open: %v", err)
	}
	var last canonical.ChainEntry
	for _, p := range []string{"a", "b", "c"} {
		last = mustAppend(t, j, p)
	}
	_ = last
	// a forged entry at the next valid CAS position with a broken prev link,
	// written straight to the subject (bypassing the journal)
	forged := canonical.ChainEntry{Seq: 3, Prev: "f0" + canonical.Genesis[2:], Payload: "evil"}
	if _, err := rawPublish(t, js, "forge", forged, 3); err != nil {
		t.Fatalf("raw forge publish: %v", err)
	}
	entries, cursor, err := j.Read(ctx(t), journal.Cursor{Seq: -1, Head: canonical.Genesis}, 0)
	if !errors.Is(err, journal.ErrTampered) {
		t.Fatalf("read over forged tail: err=%v, want ErrTampered", err)
	}
	if len(entries) != 3 {
		t.Fatalf("verified prefix: %d entries, want 3", len(entries))
	}
	if cursor.Seq != 2 {
		t.Fatalf("cursor advanced to %d past a forged entry, must stop at 2", cursor.Seq)
	}
	// the cursor cannot be pushed past unverified bytes: a second read from
	// the returned cursor refuses again at the same position
	again, c2, err := j.Read(ctx(t), cursor, 0)
	if !errors.Is(err, journal.ErrTampered) {
		t.Fatalf("re-read past forge: err=%v, want ErrTampered", err)
	}
	if len(again) != 0 || c2.Seq != 2 {
		t.Fatalf("re-read advanced: %d entries, cursor %+v", len(again), c2)
	}
}

func TestNonCanonicalWireRejected(t *testing.T) {
	// A semantically valid entry whose WIRE BYTES are not the canonical
	// encoding (correct seq, correct prev — only the byte form is off).
	// The chain-linkage checks alone cannot see it; Read must ALSO prove
	// DigestHex(raw) == EntryDigest(decoded) and refuse without advancing.
	js := startJetStream(t)
	j, err := journal.Open(ctx(t), js, "noncanon")
	if err != nil {
		t.Fatalf("open: %v", err)
	}
	for _, p := range []string{"a", "b", "c"} {
		mustAppend(t, j, p)
	}
	_, good, err := j.Read(ctx(t), journal.Cursor{Seq: -1, Head: canonical.Genesis}, 0)
	if err != nil {
		t.Fatalf("read: %v", err)
	}
	// valid content, non-canonical spelling: extra spaces
	loose := []byte(`{ "payload": "x", "prev": "` + good.Head + `", "seq": 3 }`)
	if _, err := rawPublishBytes(t, js, "noncanon", loose, "loose-bytes", 3); err != nil {
		t.Fatalf("raw loose publish: %v", err)
	}
	entries, cursor, err := j.Read(ctx(t), journal.Cursor{Seq: -1, Head: canonical.Genesis}, 0)
	if !errors.Is(err, journal.ErrTampered) {
		t.Fatalf("read over non-canonical wire bytes: err=%v, want ErrTampered", err)
	}
	if len(entries) != 3 || cursor.Seq != 2 {
		t.Fatalf("cursor moved past non-canonical bytes: %d entries, cursor %+v", len(entries), cursor)
	}
}

func TestReopenContinues(t *testing.T) {
	js := startJetStream(t)
	j1, err := journal.Open(ctx(t), js, "reopen")
	if err != nil {
		t.Fatalf("open 1: %v", err)
	}
	for _, p := range []string{"a", "b", "c"} {
		mustAppend(t, j1, p)
	}
	j2, err := journal.Open(ctx(t), js, "reopen")
	if err != nil {
		t.Fatalf("open 2: %v", err)
	}
	h := j2.Head()
	if h.Seq != 2 {
		t.Fatalf("reopened head seq: %d, want 2", h.Seq)
	}
	for _, p := range []string{"d", "e"} {
		mustAppend(t, j2, p)
	}
	entries, cursor, err := j2.Read(ctx(t), journal.Cursor{Seq: -1, Head: canonical.Genesis}, 0)
	if err != nil {
		t.Fatalf("read: %v", err)
	}
	want := []string{"a", "b", "c", "d", "e"}
	if len(entries) != len(want) {
		t.Fatalf("entries: %d, want %d", len(entries), len(want))
	}
	for i, e := range entries {
		if e.Payload != want[i] || e.Seq != i {
			t.Fatalf("entry %d: %+v, want %q", i, e, want[i])
		}
	}
	_, head := mustBuildChain(t, want)
	if cursor.Head != head {
		t.Fatalf("head after reopen: %s, want %s", cursor.Head, head)
	}
}
