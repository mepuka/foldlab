// Package journal implements a CAS-appended, verify-on-read event chain over
// JetStream. It admits only the pinned authoritative stream shape: imported or
// evicting streams are refused rather than treated as journal authority.
package journal

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"regexp"
	"strings"
	"sync"
	"time"
	"unicode/utf8"

	"github.com/nats-io/nats.go"
	"github.com/nats-io/nats.go/jetstream"

	"foldlab/canonical"
)

// Cursor names a verified position and head digest. Seq is -1 only for
// genesis; all other values are zero-based positions within the platform int
// range. A cursor supplied to Read is observation input, never writer state.
type Cursor struct {
	// Seq is -1 at genesis or the last verified zero-based position.
	Seq int
	// Head is Genesis at Seq -1 or the digest at Seq.
	Head string
}

// AppendOutcome classifies whether an append stored new bytes or repeated the
// exact identity already accepted at its position.
type AppendOutcome string

const (
	// Stored means this call won the position's CAS and stored the entry.
	Stored AppendOutcome = "stored"
	// Duplicate means the same entry identity already occupies the position.
	Duplicate AppendOutcome = "duplicate"
)

var (
	// ErrBadStream refuses a JetStream stream that lacks the authority shape.
	ErrBadStream = errors.New("journal stream does not have the required shape")
	// ErrBadCursor refuses a cursor outside the accepted position domain.
	ErrBadCursor = errors.New("journal cursor is outside the accepted domain")
	// ErrConflict reports that different bytes already occupy an append position.
	ErrConflict = errors.New("journal position is already occupied")
	// ErrTampered reports stored bytes that fail sequence, chain, or canonicality verification.
	ErrTampered = errors.New("journal entry failed verification")
)

var validName = regexp.MustCompile(`^[A-Za-z0-9_-]+$`)

// Journal is one authoritative journal handle. Its append cursor changes only
// after a verified adoption or an accepted append; reads cannot mutate it.
type Journal struct {
	mu      sync.Mutex
	js      jetstream.JetStream
	stream  jetstream.Stream
	subject string
	cursor  Cursor
}

type wireEntry struct {
	Payload string `json:"payload"`
	Prev    string `json:"prev"`
	Seq     int64  `json:"seq"`
}

// Open opens or creates the named journal, verifies its immutable authority
// shape, and adopts only a verified tail as the append cursor.
func Open(ctx context.Context, js jetstream.JetStream, name string) (*Journal, error) {
	if !validName.MatchString(name) {
		return nil, fmt.Errorf("invalid journal name %q", name)
	}

	streamName := "J_" + name
	subject := "j." + name
	stream, err := js.Stream(ctx, streamName)
	if err != nil {
		if !errors.Is(err, jetstream.ErrStreamNotFound) {
			return nil, err
		}
		stream, err = js.CreateStream(ctx, jetstream.StreamConfig{
			Name:              streamName,
			Subjects:          []string{subject},
			Retention:         jetstream.LimitsPolicy,
			MaxMsgs:           -1,
			MaxBytes:          -1,
			Discard:           jetstream.DiscardOld,
			MaxAge:            0,
			MaxMsgsPerSubject: -1,
			Storage:           jetstream.FileStorage,
			Duplicates:        2 * time.Minute,
			DenyDelete:        true,
			DenyPurge:         true,
		})
		if errors.Is(err, jetstream.ErrStreamNameAlreadyInUse) {
			stream, err = js.Stream(ctx, streamName)
		}
		if err != nil {
			return nil, err
		}
	}

	info, err := stream.Info(ctx)
	if err != nil {
		return nil, err
	}
	if reason := badShapeReason(info.Config, subject); reason != "" {
		return nil, fmt.Errorf("%w: %s", ErrBadStream, reason)
	}

	cursor, err := tailCursor(ctx, stream)
	if err != nil {
		return nil, err
	}

	return &Journal{
		js:      js,
		stream:  stream,
		subject: subject,
		cursor:  cursor,
	}, nil
}

// tailCursor resyncs a cursor from the stream's current tail, verifying the
// tail's byte-canonicality exactly as Read does (JL5): a tail Read would refuse
// as ErrTampered is refused here too, so Open fails fast instead of adopting a
// head Read rejects. An empty stream yields the genesis cursor. Open and the
// post-conflict resync path share it, adopting the tail on identical terms.
// Note it verifies only the tail's canonicality, not that the tail chains from
// genesis — a canonical-but-forged tail still passes (issue #2 disposition).
func tailCursor(ctx context.Context, stream jetstream.Stream) (Cursor, error) {
	info, err := stream.Info(ctx)
	if err != nil {
		return Cursor{}, err
	}
	if info.State.Msgs == 0 {
		return Cursor{Seq: -1, Head: canonical.Genesis}, nil
	}
	raw, err := stream.GetMsg(ctx, info.State.LastSeq)
	if err != nil {
		return Cursor{}, fmt.Errorf("read journal tail: %w", err)
	}
	_, position, digest, err := verifyEntry(raw)
	if err != nil {
		return Cursor{}, fmt.Errorf("verify journal tail: %w", err)
	}
	return Cursor{Seq: position, Head: digest}, nil
}

// Head returns the handle's current verified append cursor.
func (j *Journal) Head() Cursor {
	j.mu.Lock()
	defer j.mu.Unlock()
	return j.cursor
}

// Append builds the next entry from the verified append cursor and stores it
// with a last-sequence CAS. A lost CAS returns ErrConflict after safe resync.
func (j *Journal) Append(
	ctx context.Context,
	payload string,
) (canonical.ChainEntry, AppendOutcome, error) {
	if strings.Contains(payload, "\n") {
		return canonical.ChainEntry{}, "", errors.New("journal payloads must not contain newlines")
	}

	j.mu.Lock()
	defer j.mu.Unlock()
	entry := canonical.ChainEntry{
		Seq:     int64(j.cursor.Seq) + 1,
		Prev:    j.cursor.Head,
		Payload: payload,
	}
	outcome, err := j.appendEntry(ctx, entry)
	return entry, outcome, err
}

// AppendEntry conditionally stores a caller-built entry at its declared
// position. It never bypasses canonical identity or last-sequence CAS checks.
func (j *Journal) AppendEntry(
	ctx context.Context,
	entry canonical.ChainEntry,
) (AppendOutcome, error) {
	j.mu.Lock()
	defer j.mu.Unlock()
	return j.appendEntry(ctx, entry)
}

// Read verifies at most max entries after from and returns the entries plus the
// last verified continuation cursor. A non-positive max means unbounded at
// this substrate seam. Read never changes the handle's append cursor.
func (j *Journal) Read(
	ctx context.Context,
	from Cursor,
	max int,
) ([]canonical.ChainEntry, Cursor, error) {
	j.mu.Lock()
	defer j.mu.Unlock()

	if from.Seq < -1 {
		return nil, from, fmt.Errorf("%w: invalid sequence %d", ErrBadCursor, from.Seq)
	}
	info, err := j.stream.Info(ctx)
	if err != nil {
		return nil, from, err
	}

	entries := make([]canonical.ChainEntry, 0)
	cursor := from
	nextStreamSeq := uint64(int64(from.Seq) + 2)
	for nextStreamSeq <= info.State.LastSeq && (max <= 0 || len(entries) < max) {
		position, positionErr := positionFromStreamSequence(nextStreamSeq)
		if positionErr != nil {
			return entries, cursor, positionErr
		}
		raw, getErr := j.stream.GetMsg(ctx, nextStreamSeq)
		if getErr != nil {
			if errors.Is(getErr, jetstream.ErrMsgNotFound) {
				return entries, cursor, tampered(position, "message is missing")
			}
			return entries, cursor, getErr
		}

		entry, _, digest, verifyErr := verifyEntry(raw)
		if verifyErr != nil {
			return entries, cursor, verifyErr
		}
		if entry.Prev != cursor.Head {
			return entries, cursor, tampered(position, "prev does not match the verified head")
		}

		entries = append(entries, entry)
		cursor = Cursor{Seq: position, Head: digest}
		nextStreamSeq++
	}

	return entries, cursor, nil
}

func (j *Journal) appendEntry(ctx context.Context, entry canonical.ChainEntry) (AppendOutcome, error) {
	if entry.Seq < 0 {
		return "", fmt.Errorf("%w: invalid position %d", ErrConflict, entry.Seq)
	}
	// Invalid UTF-8 is outside the canonical domain: both the wire encoder and
	// EntryDigest would launder it to U+FFFD, collapsing distinct payloads to one
	// journal identity. Refuse it here, matching CanonicalizeValue's domain.
	if !utf8.ValidString(entry.Payload) {
		return "", errors.New("journal payload is not valid Unicode")
	}
	position, err := cursorPosition(entry.Seq)
	if err != nil {
		return "", err
	}
	wire, err := encodeEntry(entry)
	if err != nil {
		return "", err
	}
	digest, err := canonical.EntryDigest(entry)
	if err != nil {
		return "", err
	}
	message := nats.NewMsg(j.subject)
	message.Data = wire
	message.Header.Set("Nats-Msg-Id", digest)

	ack, err := j.js.PublishMsg(
		ctx,
		message,
		jetstream.WithExpectLastSequencePerSubject(uint64(entry.Seq)),
	)
	if err == nil {
		j.recordAccepted(position, digest)
		if ack.Duplicate {
			return Duplicate, nil
		}
		return Stored, nil
	}
	if !isWrongLastSequence(err) {
		return "", err
	}

	// The CAS proved the position occupied. If our own bytes already landed the
	// append is an idempotent duplicate; otherwise a rival holds the position.
	if stored, getErr := j.stream.GetMsg(ctx, uint64(entry.Seq+1)); getErr == nil &&
		canonical.DigestHex(stored.Data) == digest {
		j.recordAccepted(position, digest)
		return Duplicate, nil
	}
	// A rival won the position (or the confirmatory re-read failed — occupancy is
	// proven by the CAS either way). Resync the cursor from the tail so this
	// writer recovers through Append alone, then report the conflict.
	j.resyncCursor(ctx)
	return "", fmt.Errorf("%w at position %d", ErrConflict, entry.Seq)
}

// resyncCursor advances the cursor to the stream tail after a lost CAS,
// best-effort: a failed or tampered tail leaves the cursor untouched, since
// Read remains the verification authority. The caller holds j.mu.
func (j *Journal) resyncCursor(ctx context.Context) {
	tail, err := tailCursor(ctx, j.stream)
	if err != nil {
		return
	}
	if tail.Seq > j.cursor.Seq {
		j.cursor = tail
	}
}

func (j *Journal) recordAccepted(position int, digest string) {
	if position >= j.cursor.Seq {
		j.cursor = Cursor{Seq: position, Head: digest}
	}
}

func badShapeReason(config jetstream.StreamConfig, subject string) string {
	if config.Retention != jetstream.LimitsPolicy {
		return "retention is not limits"
	}
	if config.Storage != jetstream.FileStorage {
		return "storage is not file"
	}
	if config.Discard != jetstream.DiscardOld {
		return "discard policy is not old"
	}
	if len(config.Subjects) != 1 || config.Subjects[0] != subject {
		return "subject set is not the pinned singleton"
	}
	if config.MaxMsgs > 0 || config.MaxBytes > 0 || config.MaxAge > 0 || config.MaxMsgsPerSubject > 0 {
		return "an eviction limit is configured"
	}
	if !config.DenyDelete || !config.DenyPurge {
		return "delete and purge are not denied"
	}
	if config.Duplicates < 2*time.Minute {
		return "duplicate window is shorter than two minutes"
	}
	if config.AllowRollup {
		return "rollup can remove prior entries"
	}
	if config.NoAck || config.Sealed {
		return "stream does not accept acknowledged appends"
	}
	if config.Mirror != nil || len(config.Sources) != 0 {
		return "stream imports messages from another stream"
	}
	if config.FirstSeq > 1 {
		return "stream sequence does not begin at one"
	}
	return ""
}

func encodeEntry(entry canonical.ChainEntry) ([]byte, error) {
	raw, err := json.Marshal(wireEntry{
		Payload: entry.Payload,
		Prev:    entry.Prev,
		Seq:     entry.Seq,
	})
	if err != nil {
		return nil, err
	}
	return canonical.Canonicalize(raw)
}

func decodeEntry(data []byte) (canonical.ChainEntry, error) {
	var wire wireEntry
	if err := json.Unmarshal(data, &wire); err != nil {
		return canonical.ChainEntry{}, err
	}
	return canonical.ChainEntry{
		Seq:     wire.Seq,
		Prev:    wire.Prev,
		Payload: wire.Payload,
	}, nil
}

func verifyEntry(raw *jetstream.RawStreamMsg) (canonical.ChainEntry, int, string, error) {
	position, err := positionFromStreamSequence(raw.Sequence)
	if err != nil {
		return canonical.ChainEntry{}, 0, "", err
	}
	entry, err := decodeEntry(raw.Data)
	if err != nil {
		return canonical.ChainEntry{}, position, "", tampered(position, "invalid entry JSON: %v", err)
	}
	if entry.Seq != int64(position) {
		return canonical.ChainEntry{}, position, "", tampered(position, "seq is %d", entry.Seq)
	}
	digest, err := canonical.EntryDigest(entry)
	if err != nil {
		return canonical.ChainEntry{}, position, "", tampered(position, "%v", err)
	}
	if canonical.DigestHex(raw.Data) != digest {
		return canonical.ChainEntry{}, position, "", tampered(position, "wire bytes are not canonical")
	}
	return entry, position, digest, nil
}

func cursorPosition(seq int64) (int, error) {
	if seq < 0 || uint64(seq) > uint64(^uint(0)>>1) {
		return 0, fmt.Errorf("journal position %d exceeds platform cursor range", seq)
	}
	return int(seq), nil
}

func positionFromStreamSequence(sequence uint64) (int, error) {
	if sequence == 0 {
		return 0, errors.New("journal stream sequence is zero")
	}
	position := sequence - 1
	if position > uint64(^uint(0)>>1) {
		return 0, fmt.Errorf("journal position %d exceeds platform cursor range", position)
	}
	return int(position), nil
}

func isWrongLastSequence(err error) bool {
	var apiError *jetstream.APIError
	if !errors.As(err, &apiError) {
		return false
	}
	return apiError.ErrorCode == jetstream.JSErrCodeStreamWrongLastSequence ||
		apiError.ErrorCode == jetstream.JSErrCodeStreamWrongLastSequenceConstant
}

func tampered(position int, format string, args ...any) error {
	detail := fmt.Sprintf(format, args...)
	return fmt.Errorf("%w at position %d: %s", ErrTampered, position, detail)
}
