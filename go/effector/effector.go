// Package effector implements the proven single-key A6 register protocol over
// JetStream KV. Safety depends only on atomic create-if-absent, revision CAS,
// linearizable reads, and the law that a committed outcome is never mutated or
// deleted; clocks and owner identities affect liveness only.
package effector

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"regexp"
	"time"

	"github.com/nats-io/nats.go/jetstream"

	"foldlab/canonical"
)

// State is the authority-visible state of one work digest.
type State string

const (
	// Unclaimed means no unexpired claim or committed outcome is authoritative.
	Unclaimed State = "unclaimed"
	// Held means an unexpired claim currently holds authority.
	Held State = "held"
	// Committed means the immutable outcome is authoritative.
	Committed State = "committed"
)

// Claim is a fenced lease attempt for one work digest. Owner and Expiry affect
// liveness; Fence is what prevents an older claimant from committing.
type Claim struct {
	// Digest names the work identity.
	Digest string
	// Fence increases on every successful reclaim and licenses Commit.
	Fence uint64
	// Owner is liveness metadata and confers no safety authority.
	Owner string
	// Expiry determines when another claimant may attempt a higher fence.
	Expiry time.Time
}

// Outcome is the immutable result committed for a work digest and fence.
type Outcome struct {
	// Digest names the work identity.
	Digest string
	// Fence is the claim fence that committed this outcome.
	Fence uint64
	// Result is the immutable committed result.
	Result string
}

var (
	// ErrBadBucket refuses a KV bucket that lacks the A6 substrate shape.
	ErrBadBucket = errors.New("effector bucket does not have the required shape")
	// ErrHeld reports an unexpired or concurrently won claim.
	ErrHeld = errors.New("effector claim is held")
	// ErrCommitted reports an already committed, incompatible outcome.
	ErrCommitted = errors.New("effector outcome is already committed")
	// ErrFenced reports that a newer fence superseded a claim.
	ErrFenced = errors.New("effector claim was superseded")
)

var (
	validName   = regexp.MustCompile(`^[A-Za-z0-9_-]+$`)
	validDigest = regexp.MustCompile(`^[0-9a-f]{64}$`)
)

// Effector is an A6 authority handle backed by one shape-verified KV bucket.
type Effector struct {
	kv jetstream.KeyValue
}

type wireClaim struct {
	Expiry int64  `json:"expiry"`
	Fence  uint64 `json:"fence"`
	Owner  string `json:"owner"`
	Tag    string `json:"tag"`
}

type wireOutcome struct {
	Fence  uint64 `json:"fence"`
	Result string `json:"result"`
	Tag    string `json:"tag"`
}

type authorityValue struct {
	claim   *Claim
	outcome *Outcome
}

// Open opens or creates the named KV bucket and refuses any bucket whose
// storage, history, TTL, or capacity violates the A6 substrate contract.
func Open(ctx context.Context, js jetstream.JetStream, name string) (*Effector, error) {
	if !validName.MatchString(name) {
		return nil, fmt.Errorf("invalid effector name %q", name)
	}

	bucket := "E_" + name
	kv, err := js.KeyValue(ctx, bucket)
	if errors.Is(err, jetstream.ErrBucketNotFound) {
		kv, err = js.CreateKeyValue(ctx, jetstream.KeyValueConfig{
			Bucket:   bucket,
			History:  1,
			TTL:      0,
			MaxBytes: -1,
			Storage:  jetstream.FileStorage,
		})
		if errors.Is(err, jetstream.ErrBucketExists) {
			kv, err = js.KeyValue(ctx, bucket)
		}
	}
	if err != nil {
		return nil, err
	}

	status, err := kv.Status(ctx)
	if err != nil {
		return nil, err
	}
	config := status.Config()
	if reason := badShapeReason(config); reason != "" {
		return nil, fmt.Errorf("%w: %s", ErrBadBucket, reason)
	}

	return &Effector{kv: kv}, nil
}

// Claim acquires an absent or expired work digest using create-if-absent or
// revision CAS. It returns ErrHeld or ErrCommitted when authority already exists.
func (e *Effector) Claim(
	ctx context.Context,
	digest string,
	owner string,
	lease time.Duration,
) (Claim, error) {
	if !validDigest.MatchString(digest) {
		return Claim{}, fmt.Errorf("invalid work digest %q", digest)
	}

	now := time.Now()
	key := workKey(digest)
	stored, err := e.kv.Get(ctx, key)
	if errors.Is(err, jetstream.ErrKeyNotFound) {
		claim := Claim{
			Digest: digest,
			Fence:  1,
			Owner:  owner,
			Expiry: now.Add(lease),
		}
		value, encodeErr := encodeClaim(claim)
		if encodeErr != nil {
			return Claim{}, encodeErr
		}
		if _, createErr := e.kv.Create(ctx, key, value); createErr != nil {
			if errors.Is(createErr, jetstream.ErrKeyExists) {
				raced, readErr := e.kv.Get(ctx, key)
				if readErr != nil {
					return Claim{}, readErr
				}
				authority, decodeErr := decodeAuthority(digest, raced.Value())
				if decodeErr != nil {
					return Claim{}, decodeErr
				}
				if authority.outcome != nil {
					return Claim{}, fmt.Errorf("%w: %s", ErrCommitted, digest)
				}
				return Claim{}, fmt.Errorf("%w: %s", ErrHeld, digest)
			}
			return Claim{}, createErr
		}
		return claim, nil
	}
	if err != nil {
		return Claim{}, err
	}

	authority, err := decodeAuthority(digest, stored.Value())
	if err != nil {
		return Claim{}, err
	}
	if authority.outcome != nil {
		return Claim{}, fmt.Errorf("%w: %s", ErrCommitted, digest)
	}
	previous := *authority.claim
	if now.Before(previous.Expiry) {
		return Claim{}, fmt.Errorf("%w: %s", ErrHeld, digest)
	}

	claim := Claim{
		Digest: digest,
		Fence:  previous.Fence + 1,
		Owner:  owner,
		Expiry: now.Add(lease),
	}
	value, err := encodeClaim(claim)
	if err != nil {
		return Claim{}, err
	}
	if _, err := e.kv.Update(ctx, key, value, stored.Revision()); err != nil {
		if errors.Is(err, jetstream.ErrKeyRevisionMismatch) {
			return Claim{}, fmt.Errorf("%w: %s", ErrHeld, digest)
		}
		return Claim{}, err
	}
	return claim, nil
}

// Commit replaces claim with an immutable outcome only when the stored fence
// still matches. The boolean is true only for the call that stored the outcome.
func (e *Effector) Commit(ctx context.Context, claim Claim, result string) (bool, error) {
	if !validDigest.MatchString(claim.Digest) {
		return false, fmt.Errorf("invalid work digest %q", claim.Digest)
	}
	key := workKey(claim.Digest)
	stored, err := e.kv.Get(ctx, key)
	if errors.Is(err, jetstream.ErrKeyNotFound) {
		return false, fmt.Errorf("%w: no claim for %s", ErrFenced, claim.Digest)
	}
	if err != nil {
		return false, err
	}
	authority, err := decodeAuthority(claim.Digest, stored.Value())
	if err != nil {
		return false, err
	}
	if authority.outcome != nil {
		return classifyCommitted(claim, result, *authority.outcome)
	}
	if authority.claim.Fence != claim.Fence {
		return false, fmt.Errorf(
			"%w: digest %s has fence %d, not %d",
			ErrFenced,
			claim.Digest,
			authority.claim.Fence,
			claim.Fence,
		)
	}

	outcome := Outcome{Digest: claim.Digest, Fence: claim.Fence, Result: result}
	value, err := encodeOutcome(outcome)
	if err != nil {
		return false, err
	}
	if _, err := e.kv.Update(ctx, key, value, stored.Revision()); err == nil {
		return true, nil
	} else if !errors.Is(err, jetstream.ErrKeyRevisionMismatch) {
		return false, err
	}

	current, err := e.kv.Get(ctx, key)
	if errors.Is(err, jetstream.ErrKeyNotFound) {
		return false, fmt.Errorf("%w: authority key disappeared for %s", ErrFenced, claim.Digest)
	}
	if err != nil {
		return false, err
	}
	authority, err = decodeAuthority(claim.Digest, current.Value())
	if err != nil {
		return false, err
	}
	if authority.outcome != nil {
		return classifyCommitted(claim, result, *authority.outcome)
	}
	return false, fmt.Errorf(
		"%w: digest %s remains claimed at fence %d after commit conflict",
		ErrFenced,
		claim.Digest,
		authority.claim.Fence,
	)
}

// Lookup performs the linearizable authority read for digest. Expired claims
// are reported as Unclaimed; committed outcomes never expire.
func (e *Effector) Lookup(ctx context.Context, digest string) (State, Outcome, error) {
	if !validDigest.MatchString(digest) {
		return Unclaimed, Outcome{}, fmt.Errorf("invalid work digest %q", digest)
	}
	stored, err := e.kv.Get(ctx, workKey(digest))
	if errors.Is(err, jetstream.ErrKeyNotFound) {
		return Unclaimed, Outcome{}, nil
	}
	if err != nil {
		return Unclaimed, Outcome{}, err
	}
	authority, err := decodeAuthority(digest, stored.Value())
	if err != nil {
		return Unclaimed, Outcome{}, err
	}
	if authority.outcome != nil {
		return Committed, *authority.outcome, nil
	}
	if !time.Now().Before(authority.claim.Expiry) {
		return Unclaimed, Outcome{}, nil
	}
	return Held, Outcome{}, nil
}

// Do returns an existing outcome or claims, executes effect, and commits its
// result. The boolean is true only when this call first committed the outcome.
func (e *Effector) Do(
	ctx context.Context,
	digest string,
	owner string,
	lease time.Duration,
	effect func(context.Context) (string, error),
) (Outcome, bool, error) {
	state, outcome, err := e.Lookup(ctx, digest)
	if err != nil {
		return Outcome{}, false, err
	}
	if state == Committed {
		return outcome, false, nil
	}

	claim, err := e.Claim(ctx, digest, owner, lease)
	if errors.Is(err, ErrCommitted) {
		state, outcome, lookupErr := e.Lookup(ctx, digest)
		if lookupErr != nil {
			return Outcome{}, false, lookupErr
		}
		if state == Committed {
			return outcome, false, nil
		}
	}
	if err != nil {
		return Outcome{}, false, err
	}

	result, err := effect(ctx)
	if err != nil {
		return Outcome{}, false, err
	}
	first, err := e.Commit(ctx, claim, result)
	if err != nil {
		return Outcome{}, false, err
	}
	if first {
		return Outcome{Digest: digest, Fence: claim.Fence, Result: result}, true, nil
	}

	state, outcome, err = e.Lookup(ctx, digest)
	if err != nil {
		return Outcome{}, false, err
	}
	if state != Committed {
		return Outcome{}, false, errors.New("commit was absorbed without a stored outcome")
	}
	return outcome, false, nil
}

func workKey(digest string) string {
	return "work." + digest
}

func encodeClaim(claim Claim) ([]byte, error) {
	return encodeCanonical(wireClaim{
		Expiry: claim.Expiry.UnixMilli(),
		Fence:  claim.Fence,
		Owner:  claim.Owner,
		Tag:    "claim",
	})
}

func decodeClaim(digest string, value []byte) (*Claim, error) {
	var wire wireClaim
	if err := decodeCanonical(value, &wire); err != nil {
		return nil, fmt.Errorf("decode claim %s: %w", digest, err)
	}
	if wire.Tag != "claim" {
		return nil, fmt.Errorf("decode claim %s: tag is %q", digest, wire.Tag)
	}
	if wire.Fence == 0 {
		return nil, fmt.Errorf("decode claim %s: fence must be positive", digest)
	}
	return &Claim{
		Digest: digest,
		Fence:  wire.Fence,
		Owner:  wire.Owner,
		Expiry: time.UnixMilli(wire.Expiry),
	}, nil
}

func encodeOutcome(outcome Outcome) ([]byte, error) {
	return encodeCanonical(wireOutcome{Fence: outcome.Fence, Result: outcome.Result, Tag: "done"})
}

func decodeOutcome(digest string, value []byte) (*Outcome, error) {
	var wire wireOutcome
	if err := decodeCanonical(value, &wire); err != nil {
		return nil, fmt.Errorf("decode outcome %s: %w", digest, err)
	}
	if wire.Tag != "done" {
		return nil, fmt.Errorf("decode outcome %s: tag is %q", digest, wire.Tag)
	}
	if wire.Fence == 0 {
		return nil, fmt.Errorf("decode outcome %s: fence must be positive", digest)
	}
	return &Outcome{Digest: digest, Fence: wire.Fence, Result: wire.Result}, nil
}

func decodeAuthority(digest string, value []byte) (authorityValue, error) {
	var fields map[string]json.RawMessage
	if err := decodeCanonical(value, &fields); err != nil {
		return authorityValue{}, fmt.Errorf("decode authority %s: %w", digest, err)
	}
	tagBytes, ok := fields["tag"]
	if !ok {
		return authorityValue{}, fmt.Errorf("decode authority %s: missing tag", digest)
	}
	var tag string
	if err := json.Unmarshal(tagBytes, &tag); err != nil {
		return authorityValue{}, fmt.Errorf("decode authority %s tag: %w", digest, err)
	}
	switch tag {
	case "claim":
		if !hasExactly(fields, "expiry", "fence", "owner", "tag") {
			return authorityValue{}, fmt.Errorf("decode authority %s: invalid claim fields", digest)
		}
		claim, err := decodeClaim(digest, value)
		if err != nil {
			return authorityValue{}, err
		}
		return authorityValue{claim: claim}, nil
	case "done":
		if !hasExactly(fields, "fence", "result", "tag") {
			return authorityValue{}, fmt.Errorf("decode authority %s: invalid outcome fields", digest)
		}
		outcome, err := decodeOutcome(digest, value)
		if err != nil {
			return authorityValue{}, err
		}
		return authorityValue{outcome: outcome}, nil
	default:
		return authorityValue{}, fmt.Errorf("decode authority %s: unknown tag %q", digest, tag)
	}
}

func hasExactly(fields map[string]json.RawMessage, names ...string) bool {
	if len(fields) != len(names) {
		return false
	}
	for _, name := range names {
		if _, ok := fields[name]; !ok {
			return false
		}
	}
	return true
}

func classifyCommitted(claim Claim, result string, committed Outcome) (bool, error) {
	if committed.Fence != claim.Fence {
		return false, fmt.Errorf(
			"%w: digest %s was committed at fence %d, not %d",
			ErrFenced,
			claim.Digest,
			committed.Fence,
			claim.Fence,
		)
	}
	if committed.Result == result {
		return false, nil
	}
	return false, fmt.Errorf("%w: %s", ErrCommitted, claim.Digest)
}

func encodeCanonical(value any) ([]byte, error) {
	raw, err := json.Marshal(value)
	if err != nil {
		return nil, err
	}
	return canonical.Canonicalize(raw)
}

func decodeCanonical(value []byte, target any) error {
	encoded, err := canonical.Canonicalize(value)
	if err != nil {
		return err
	}
	if !bytes.Equal(encoded, value) {
		return errors.New("value is not canonical JSON")
	}
	decoder := json.NewDecoder(bytes.NewReader(value))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(target); err != nil {
		return err
	}
	if err := decoder.Decode(&struct{}{}); !errors.Is(err, io.EOF) {
		return errors.New("value contains trailing JSON")
	}
	return nil
}

func badShapeReason(config jetstream.KeyValueConfig) string {
	if config.Storage != jetstream.FileStorage {
		return "storage is not file"
	}
	if config.History < 1 {
		return "history is less than one"
	}
	if config.TTL != 0 {
		return "TTL is non-zero"
	}
	if config.MaxBytes != 0 && config.MaxBytes != -1 {
		return "MaxBytes is bounded"
	}
	return ""
}
