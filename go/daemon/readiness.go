package daemon

import (
	"context"
	"fmt"
	"time"

	"github.com/nats-io/nats-server/v2/server"
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

// HealthOK is the pinned vendor's own word for a healthy read, carried
// verbatim.
//
// It is spelled here because a probe that decides whether to proceed has to
// compare the vendor's word against something, and the alternative — an estate
// predicate over the health status — would be the estate deciding what healthy
// means on the vendor's behalf. What is stated here is one word the vendor
// writes; what the probe does with it is the estate's.
const HealthOK = "ok"

// ReadinessGates is the pair of pinned-vendor surfaces one readiness probe
// reads: the vendor's own readiness gate, and its own in-process health read
// with JetStream enablement requested.
//
// **Never a port.** The estate's readiness signal is the vendor's own probe,
// because a bound client port proves a listener exists and proves nothing about
// JetStream — a party that read the port as readiness would hand out a URL for
// a substrate whose API is not there yet.
//
// The pair is an INTERFACE for the same reason the closed-channel inventory is
// a parameter: a gate that cannot be executed against an unready substrate is a
// gate nobody has measured. The committed control drives this probe over a real
// vendor server whose JetStream has been taken down by the vendor's own verb,
// and the probe refuses it while a port-bind reading admits it. No shipped
// caller passes anything but a [Daemon].
type ReadinessGates interface {
	// ReadyForConnections is the vendor's readiness gate, verbatim.
	ReadyForConnections(within time.Duration) bool
	// Healthz is the vendor's in-process health read with JetStream
	// enablement requested.
	Healthz() *server.HealthStatus
}

// GateOutcome is one gate performed and the outcome it returned.
type GateOutcome struct {
	Gate    string
	Outcome string
}

// ProbeReading is what one readiness probe read: one outcome per gate, in the
// order the gates were performed.
//
// It says nothing about the future and nothing about now. What it carries is
// what two named reads returned, once; whether that is enough to proceed is
// [ProbeReading.Admitted], and what a later reader knows is the observations
// this reading lands.
type ProbeReading struct {
	// Ready is the estate's declared reading of the vendor's readiness
	// predicate: [OutcomeReady] or [OutcomeUnready].
	Ready string
	// Health is the vendor's own status word, carried verbatim.
	Health string
	// Detail is the vendor's own account of an unhealthy read, empty when the
	// read was healthy. It is diagnostics and never travels onto a lane.
	Detail string
}

// Admitted reports whether both gates admitted.
//
// Both, and in that order: a health read taken before the readiness gate
// passed would be a read of a server that has not finished starting, and a
// readiness gate trusted without the health read is the port-bind reading this
// probe exists to replace.
func (r ProbeReading) Admitted() bool {
	return r.Ready == OutcomeReady && r.Health == HealthOK
}

// Outcomes is the reading as the observations it lands, in the order the gates
// were performed.
func (r ProbeReading) Outcomes() []GateOutcome {
	return []GateOutcome{
		{Gate: GateReadyForConnections, Outcome: r.Ready},
		{Gate: GateHealthz, Outcome: r.Health},
	}
}

// ProbeReadiness performs the estate's readiness probe over one daemon's own
// gates.
func ProbeReadiness(instance *Daemon, within time.Duration) ProbeReading {
	return ProbeReadinessOf(instance, within)
}

// ProbeReadinessOf is the same probe over a given pair of gates.
//
// Both gates are performed whatever the first one returned, because both
// outcomes are evidence: a run that stopped at the first unready gate would
// land a shorter record of what it saw, and what it saw is the whole point.
func ProbeReadinessOf(gates ReadinessGates, within time.Duration) ProbeReading {
	reading := ProbeReading{Ready: OutcomeUnready}
	if gates.ReadyForConnections(within) {
		reading.Ready = OutcomeReady
	}
	health := gates.Healthz()
	reading.Health = health.Status
	reading.Detail = health.Error
	return reading
}

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

// ObserveProbe lands one probe's observations on a lane, in the order the gates
// were performed, and reports the positions they landed at.
//
// Every gate the probe performed lands, including an unready one. An
// observation is evidence at a position and evidence of an unready gate is
// evidence: a run that landed only its passing gates would leave a record in
// which no substrate was ever unready.
func ObserveProbe(
	ctx context.Context,
	lane *journal.Journal,
	incarnationOptions string,
	reading ProbeReading,
) ([]ReadinessObservation, error) {
	landed := make([]ReadinessObservation, 0, 2)
	for _, gate := range reading.Outcomes() {
		observation, err := Observe(ctx, lane, incarnationOptions, gate.Gate, gate.Outcome)
		if err != nil {
			return nil, err
		}
		landed = append(landed, observation)
	}
	return landed, nil
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
