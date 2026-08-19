package daemon

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/nats-io/nats-server/v2/server"
	"github.com/nats-io/nats.go/jetstream"

	"foldlab/register"
)

// TestDispositionRefusesEveryCauseTheRosterDoesNotDeclare holds the
// construction that makes asking for a crash unsayable. The disposition draws
// its cause from the retirement roster, and the roster has no row a crash could
// enter under, so a forged disposition is refused for the same reason a forged
// retirement is.
func TestDispositionRefusesEveryCauseTheRosterDoesNotDeclare(t *testing.T) {
	for _, forged := range []string{"crashed", "killed", "timed-out", "unreachable", ""} {
		if _, err := DispositionFact("incarnation", forged); !errors.Is(err, ErrUndeclaredCause) {
			t.Fatalf("the disposition cause %q was mintable: %v", forged, err)
		}
		if _, err := RetiredIncarnationFact("incarnation", forged); !errors.Is(err, ErrUndeclaredCause) {
			t.Fatalf("the retirement cause %q was mintable: %v", forged, err)
		}
	}
	for _, declared := range RetirementCauses {
		if _, err := DispositionFact("incarnation", declared); err != nil {
			t.Fatalf("the declared cause %q was refused: %v", declared, err)
		}
	}
}

// TestDispositionIsNotARetirement holds the two facts apart. A disposition
// records the asking and a retirement records the outcome; a reader that could
// take one for the other would read an intention as a fact about a stopped
// server.
func TestDispositionIsNotARetirement(t *testing.T) {
	disposition, err := DispositionFact("incarnation", CauseDrained)
	if err != nil {
		t.Fatalf("mint the disposition: %v", err)
	}
	retired, err := RetiredIncarnationFact("incarnation", CauseDrained)
	if err != nil {
		t.Fatalf("mint the retirement: %v", err)
	}
	if disposition["kind"] == retired["kind"] {
		t.Fatalf("the two facts share the kind %v", disposition["kind"])
	}
	dispositionBytes, err := SessionBytes(disposition)
	if err != nil {
		t.Fatalf("canonicalize the disposition: %v", err)
	}
	retiredBytes, err := SessionBytes(retired)
	if err != nil {
		t.Fatalf("canonicalize the retirement: %v", err)
	}
	if string(dispositionBytes) == string(retiredBytes) {
		t.Fatal("the disposition and the retirement fold the same bytes")
	}
}

// TestStalenessIsPositionalAndAbsenceIsNotZero holds the status read's one
// number. It is the lane's head minus the greatest position naming an
// incarnation, and an incarnation the lane never names has NO reading rather
// than a reading of zero.
func TestStalenessIsPositionalAndAbsenceIsNotZero(t *testing.T) {
	facts := []map[string]any{
		{"kind": "substrate-incarnation-established", "incarnation": "a"},
		{"kind": "substrate-readiness-observation", "options": "o"},
		{"kind": "substrate-incarnation-established", "incarnation": "b"},
		{"kind": "substrate-incarnation-retired", "incarnation": "b", "cause": CauseStopped},
	}
	if staleness, mentioned := Staleness(facts, "a"); !mentioned || staleness != 3 {
		t.Fatalf("staleness for a is %d (mentioned=%t), want 3", staleness, mentioned)
	}
	if staleness, mentioned := Staleness(facts, "b"); !mentioned || staleness != 0 {
		t.Fatalf("staleness for b is %d (mentioned=%t), want 0", staleness, mentioned)
	}
	staleness, mentioned := Staleness(facts, "c")
	if mentioned {
		t.Fatalf("an unmentioned incarnation reported a staleness of %d", staleness)
	}
}

// stubGates drives the readiness probe over declared outcomes.
//
// It is a unit stub and it proves nothing about a substrate: what it holds is
// the probe's own reading of two gate results. The executed refutation over a
// REAL vendor server whose JetStream has been taken down lives in the lifecycle
// wall's readiness arm, which is where a claim about substrates belongs.
type stubGates struct {
	ready  bool
	status *server.HealthStatus
}

func (g stubGates) ReadyForConnections(time.Duration) bool { return g.ready }
func (g stubGates) Healthz() *server.HealthStatus          { return g.status }

// TestProbeAdmitsOnlyBothGates holds the readiness probe's whole reading: a
// bound listener is not readiness, and a health read taken over a listener that
// never came up is not either.
func TestProbeAdmitsOnlyBothGates(t *testing.T) {
	cases := []struct {
		label    string
		gates    stubGates
		admitted bool
		ready    string
		health   string
	}{
		{
			label:    "both gates",
			gates:    stubGates{ready: true, status: &server.HealthStatus{Status: HealthOK}},
			admitted: true,
			ready:    OutcomeReady,
			health:   HealthOK,
		},
		{
			label: "a bound listener whose JetStream is not there",
			gates: stubGates{
				ready:  true,
				status: &server.HealthStatus{Status: "unavailable", Error: "JetStream not enabled"},
			},
			admitted: false,
			ready:    OutcomeReady,
			health:   "unavailable",
		},
		{
			// A healthy word over a listener that never came up. The pinned
			// vendor's own health read cannot produce this pair — it fails its
			// own readiness check first — and that is why it is here: what this
			// row pins is that the probe admits on BOTH gates and would not
			// take a health word as the whole answer if one ever arrived alone.
			label:    "no listener",
			gates:    stubGates{ready: false, status: &server.HealthStatus{Status: HealthOK}},
			admitted: false,
			ready:    OutcomeUnready,
			health:   HealthOK,
		},
	}
	for _, row := range cases {
		reading := ProbeReadinessOf(row.gates, time.Millisecond)
		if reading.Admitted() != row.admitted {
			t.Fatalf("%s: admitted=%t, want %t", row.label, reading.Admitted(), row.admitted)
		}
		if reading.Ready != row.ready || reading.Health != row.health {
			t.Fatalf("%s: read %s/%s, want %s/%s",
				row.label, reading.Ready, reading.Health, row.ready, row.health)
		}
		outcomes := reading.Outcomes()
		if len(outcomes) != 2 {
			t.Fatalf("%s: the reading lands %d observations, want 2", row.label, len(outcomes))
		}
		if outcomes[0].Gate != GateReadyForConnections || outcomes[1].Gate != GateHealthz {
			t.Fatalf("%s: the observations name %s then %s", row.label, outcomes[0].Gate, outcomes[1].Gate)
		}
	}
}

// TestOpenRoundWalksPastSpentRounds holds the predecessor read the start takes.
// A round that landed an outcome is walked PAST, whether or not any fact ever
// followed it, because the register is what says a round is spent and a lane
// that carries no fact for it says nothing at all.
func TestOpenRoundWalksPastSpentRounds(t *testing.T) {
	instance := acquired(t, hermetic(t))
	zero, err := instance.ConnectClientZero("foldlab-daemon")
	if err != nil {
		t.Fatalf("connect client zero: %v", err)
	}
	defer zero.Conn.Close()
	registers, err := register.Open(zero.Conn)
	if err != nil {
		t.Fatalf("open the register: %v", err)
	}

	store, err := StoreDigest(t.TempDir())
	if err != nil {
		t.Fatalf("name the store: %v", err)
	}
	predecessor, walked, err := OpenRound(registers, store, 16)
	if err != nil {
		t.Fatalf("walk the open round: %v", err)
	}
	if predecessor != "" || len(walked) != 0 {
		t.Fatalf("a store nobody decided walked %d positions to %q", len(walked), predecessor)
	}

	// Two decides, landed. Neither lands a fact on any lane, so a walk over the
	// lane would still report a chain head here.
	chain := make([]string, 0, 2)
	for step := 0; step < 2; step++ {
		open, _, err := OpenRound(registers, store, 16)
		if err != nil {
			t.Fatalf("walk the open round: %v", err)
		}
		landed, err := DecideIncarnation(registers, SubstrateIncarnation{
			Store: store, Options: "options", Predecessor: open,
		}, "holder")
		if err != nil {
			t.Fatalf("decide: %v", err)
		}
		chain = append(chain, landed.Digest)
	}
	predecessor, walked, err = OpenRound(registers, store, 16)
	if err != nil {
		t.Fatalf("walk the open round: %v", err)
	}
	if len(walked) != 2 || walked[0] != chain[0] || walked[1] != chain[1] {
		t.Fatalf("the walk returned %v, want %v", walked, chain)
	}
	if predecessor != chain[1] {
		t.Fatalf("the open round succeeds %q, want %s", predecessor, chain[1])
	}

	// The bound is stated and it refuses rather than running on.
	if _, _, err := OpenRound(registers, store, 1); !errors.Is(err, ErrChainDepth) {
		t.Fatalf("a walk past the stated bound returned %v", err)
	}
}

// TestDispositionConsumerHoldsOnlyAnAnchor holds the consumer seam this start
// reacts through: it is constructed from a lane and nothing else, so there is
// no object on which a callback or a signal handler could be registered, and
// what it reports is a fact any second reader finds at the same position.
func TestDispositionConsumerHoldsOnlyAnAnchor(t *testing.T) {
	instance := acquired(t, hermetic(t))
	zero, err := instance.ConnectClientZero("foldlab-daemon")
	if err != nil {
		t.Fatalf("connect client zero: %v", err)
	}
	defer zero.Conn.Close()

	ctx, cancel := context.WithTimeout(context.Background(), readyWithin)
	defer cancel()
	js, err := jetstream.New(zero.Conn)
	if err != nil {
		t.Fatalf("open the JetStream context: %v", err)
	}
	lane, err := OpenLane(ctx, js, IncarnationLane)
	if err != nil {
		t.Fatalf("open the incarnation lane: %v", err)
	}

	consumer := NewDispositionConsumer(lane)
	empty, err := consumer.Advance(ctx)
	if err != nil {
		t.Fatalf("advance over an empty lane: %v", err)
	}
	if len(empty) != 0 {
		t.Fatalf("an empty lane produced %d reactions", len(empty))
	}

	// Facts the consumer must walk past, and the one it must react to.
	if _, err := Observe(ctx, lane, instance.OptionsDigest(), GateHealthz, HealthOK); err != nil {
		t.Fatalf("land the observation: %v", err)
	}
	if _, _, err := Land(ctx, lane, EstablishedIncarnationFact("incarnation", SubstrateIncarnation{
		Store: "store", Options: instance.OptionsDigest(),
	})); err != nil {
		t.Fatalf("land the establishment: %v", err)
	}
	disposition, err := DispositionFact("incarnation", CauseDrained)
	if err != nil {
		t.Fatalf("mint the disposition: %v", err)
	}
	position, _, err := Land(ctx, lane, disposition)
	if err != nil {
		t.Fatalf("land the disposition: %v", err)
	}

	reactions, err := consumer.Advance(ctx)
	if err != nil {
		t.Fatalf("advance: %v", err)
	}
	if len(reactions) != 1 {
		t.Fatalf("the consumer produced %d reactions, want 1", len(reactions))
	}
	if reactions[0].Position != position {
		t.Fatalf("the reaction names position %d, want %d", reactions[0].Position, position)
	}
	if reactions[0].Incarnation != "incarnation" || reactions[0].Cause != CauseDrained {
		t.Fatalf("the reaction read %+v", reactions[0])
	}

	// A second party at the same anchor computes the same reactions, which is
	// what makes the reaction auditable rather than witnessed.
	second, err := NewDispositionConsumer(lane).Advance(ctx)
	if err != nil {
		t.Fatalf("advance the second reader: %v", err)
	}
	if len(second) != 1 || second[0] != reactions[0] {
		t.Fatalf("a second reader at the same anchor read %+v", second)
	}

	// The anchor moved past what it consumed, so a re-advance reports nothing
	// rather than the same fact twice.
	again, err := consumer.Advance(ctx)
	if err != nil {
		t.Fatalf("re-advance: %v", err)
	}
	if len(again) != 0 {
		t.Fatalf("the consumer re-read %d facts it had already advanced past", len(again))
	}
}
