package daemon

import (
	"context"
	"fmt"

	"github.com/nats-io/nats.go/jetstream"

	"foldlab/canonical"
	"foldlab/journal"
)

// Readiness is evidence at a position, never a promise.
//
// "The substrate is healthy now" is unsayable by construction here: nothing in
// this file reads a clock, and nothing it emits is phrased about the future.
// What the daemon can say is that it performed a named gate and observed a
// named outcome, and that the saying landed at a position on a lane — so "the
// substrate is healthy through position p" becomes a reader's fold over
// observations rather than an assertion by the daemon.
//
// Readiness is DEMOTED as a fence, and that demotion is why nothing here holds
// a token, elects anybody, or waits for a winner. Ordering the acts — gate
// first, connect second — is carriage ordering; it carries no meaning and
// needs no authority.

// The gates a readiness observation can name. Both are the pinned vendor's own
// surface: the readiness gate the vendor exports, and the vendor's in-process
// health read with JetStream enablement requested.
//
// The first is READ FROM THE WIRE VOCABULARY, reached by the vendor's own
// qualified identifier so the entry point's name is stated once in the estate.
// The second is spelled here because the lifecycle table does not carry it: the
// lifecycle contract's vocabulary sentence names ten entry points and the health
// read is not one of them — it is the carriage this gate's own row leans on, and
// a table that quietly grew an eleventh row would be a table nobody declared.
var (
	GateReadyForConnections = mustLifecycleEntry("server.Server.ReadyForConnections").Name()
	GateHealthz             = "Healthz"
)

// The outcomes a readiness observation can carry.
//
// The health read's outcome is the vendor's own status word, carried verbatim.
// The readiness gate returns a predicate rather than a word, so its two
// outcomes are stated as the estate's declared readings of that predicate,
// which is the one place this file names anything the vendor did not.
const (
	OutcomeReady   = "ready"
	OutcomeUnready = "unready"
)

// ReadinessObservation is one gate performed, one outcome observed, and the
// position the saying landed at.
type ReadinessObservation struct {
	// Gate names which of the vendor's surfaces was read.
	Gate string
	// Outcome is what that read returned.
	Outcome string
	// Position is where the observation landed on the incarnation lane. It
	// is the lane's position and not a time.
	Position int
	// Digest names the observation's declared bytes.
	Digest string
}

// ReadinessValue is one readiness observation's declared value.
func ReadinessValue(incarnationOptions string, gate string, outcome string) map[string]any {
	return map[string]any{
		"v":       float64(0),
		"kind":    "substrate-readiness-observation",
		"options": incarnationOptions,
		"gate":    gate,
		"outcome": outcome,
	}
}

// IncarnationLane is the lane readiness observations accumulate on.
const IncarnationLane = "incarnation"

// SessionLane is the lane substrate-session facts accumulate on.
const SessionLane = "session"

// OpenLane opens one of the daemon's lanes over the substrate it owns.
//
// The lanes are the estate's existing append-only journal lanes, with their
// standing shape gate: the daemon builds no lane writer of its own, because a
// lane only the daemon could read is exactly the private-truth class this
// slice refuses.
func OpenLane(ctx context.Context, js jetstream.JetStream, name string) (*journal.Journal, error) {
	return journal.Open(ctx, js, name)
}

// Observe lands one readiness observation on the incarnation lane and reports
// the position it landed at.
func Observe(
	ctx context.Context,
	lane *journal.Journal,
	incarnationOptions string,
	gate string,
	outcome string,
) (ReadinessObservation, error) {
	value := ReadinessValue(incarnationOptions, gate, outcome)
	payload, err := canonical.CanonicalizeValue(value)
	if err != nil {
		return ReadinessObservation{}, fmt.Errorf("canonicalize the readiness observation: %w", err)
	}
	entry, _, err := lane.Append(ctx, string(payload))
	if err != nil {
		return ReadinessObservation{}, fmt.Errorf("land the readiness observation: %w", err)
	}
	return ReadinessObservation{
		Gate:     gate,
		Outcome:  outcome,
		Position: int(entry.Seq),
		Digest:   canonical.DigestHex(payload),
	}, nil
}

// Land lands one already-canonical declared value on a lane and reports the
// position.
func Land(ctx context.Context, lane *journal.Journal, value map[string]any) (int, string, error) {
	payload, err := canonical.CanonicalizeValue(value)
	if err != nil {
		return 0, "", fmt.Errorf("canonicalize the fact: %w", err)
	}
	entry, _, err := lane.Append(ctx, string(payload))
	if err != nil {
		return 0, "", fmt.Errorf("land the fact: %w", err)
	}
	return int(entry.Seq), canonical.DigestHex(payload), nil
}
