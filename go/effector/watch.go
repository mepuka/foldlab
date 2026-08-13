package effector

import (
	"context"
	"strings"

	"github.com/nats-io/nats.go/jetstream"
)

// Transition is one observed authority change on a work key. When the
// stored value is a claim, State is Held and Claim is set; when it is an
// outcome, State is Committed and Outcome is set. Initial marks entries
// replayed from before the watch started (the late-watcher catch-up).
// Expiry is NOT evaluated here: the transition reports what is stored,
// and only Lookup decides whether a stored claim still holds.
type Transition struct {
	// Digest names the observed work identity.
	Digest string
	// State is Held or Committed for the stored authority value.
	State State
	// Claim is populated exactly when State is Held.
	Claim *Claim
	// Outcome is populated exactly when State is Committed.
	Outcome *Outcome
	// Revision is the JetStream KV revision of this observation.
	Revision uint64
	// Initial marks values replayed before the watch reached its live edge.
	Initial bool
}

// Watch is the register live plane, and it is chatter (see
// docs/research/2026-08-12-nats-agent-protocol.md): a revision-ordered
// feed of authority transitions that a consumer may lose without any
// theorem breaking — recovery is always Lookup, which is the authority.
// Values that fail strict decoding are skipped, not surfaced: the live
// plane never invents authority, and tampering is caught where it
// matters, on authority reads. The channel closes when ctx ends.
func (e *Effector) Watch(ctx context.Context) (<-chan Transition, error) {
	watcher, err := e.kv.Watch(ctx, "work.>")
	if err != nil {
		return nil, err
	}
	out := make(chan Transition)
	go func() {
		defer close(out)
		defer func() { _ = watcher.Stop() }()
		initial := true
		for {
			select {
			case <-ctx.Done():
				return
			case entry, ok := <-watcher.Updates():
				if !ok {
					return
				}
				if entry == nil {
					initial = false
					continue
				}
				if entry.Operation() != jetstream.KeyValuePut {
					continue
				}
				key := strings.TrimPrefix(entry.Key(), "work.")
				if !validDigest.MatchString(key) {
					continue
				}
				authority, decodeErr := decodeAuthority(key, entry.Value())
				if decodeErr != nil {
					continue
				}
				transition := Transition{
					Digest:   key,
					Revision: entry.Revision(),
					Initial:  initial,
				}
				if authority.outcome != nil {
					transition.State = Committed
					transition.Outcome = authority.outcome
				} else {
					transition.State = Held
					transition.Claim = authority.claim
				}
				select {
				case out <- transition:
				case <-ctx.Done():
					return
				}
			}
		}
	}()
	return out, nil
}
