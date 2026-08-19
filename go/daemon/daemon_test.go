package daemon

import (
	"context"
	"errors"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/nats-io/nats.go/jetstream"
)

const readyWithin = 30 * time.Second

// hermetic is the no-socket posture the Go-only suites keep: a declared value
// with no listen address constructs a server that binds nothing.
func hermetic(t *testing.T) DeclaredServerOptions {
	t.Helper()
	return DeclaredServerOptions{
		ServerName: "foldlab-daemon-test",
		StoreDir:   t.TempDir(),
		JetStream:  true,
		Listen:     false,
		// A hermetic test harness site keeps its own log suppression: the
		// daemon posture's false belongs to a process that owns its log, and a
		// test process owns neither its output nor the battery's.
		NoLog:        true,
		SyncInterval: DeclaredSyncInterval,
		SyncAlways:   DeclaredSyncAlways,
	}
}

func acquired(t *testing.T, declared DeclaredServerOptions) *Daemon {
	t.Helper()
	instance, err := Acquire(declared)
	if err != nil {
		t.Fatalf("acquire: %v", err)
	}
	t.Cleanup(func() {
		instance.Shutdown()
		instance.WaitForShutdown()
	})
	instance.Start()
	if !instance.ReadyForConnections(readyWithin) {
		t.Fatal("the substrate did not pass its readiness gate")
	}
	return instance
}

// TestHermeticPostureStays holds the no-socket posture open. Removing it, or
// making the listening posture the only one, is the change this test refuses.
func TestHermeticPostureStays(t *testing.T) {
	instance := acquired(t, hermetic(t))
	if !instance.Running() {
		t.Fatal("the substrate is not running")
	}
	if status := instance.Healthz(); status.Status != "ok" {
		t.Fatalf("health=%q error=%q", status.Status, status.Error)
	}
	zero, err := instance.ConnectClientZero("foldlab-daemon")
	if err != nil {
		t.Fatalf("connect client zero over no socket: %v", err)
	}
	defer zero.Conn.Close()
	if zero.CID == 0 {
		t.Fatal("client zero has no connection identifier")
	}
}

// TestCarriageInvarianceArmA is the differential's first arm, run inside the
// package's own battery: one connection, two carriages, one language.
func TestCarriageInvarianceArmA(t *testing.T) {
	instance := acquired(t, hermetic(t))
	zero, err := instance.ConnectClientZero("foldlab-daemon")
	if err != nil {
		t.Fatalf("connect client zero: %v", err)
	}
	defer zero.Conn.Close()

	registration, err := instance.Registration(zero.CID)
	if err != nil {
		t.Fatalf("read the registration: %v", err)
	}
	fromOptions, err := instance.SubstrateFromRegistration(registration)
	if err != nil {
		t.Fatalf("fold from options and registration: %v", err)
	}
	fromGreeting, err := SubstrateDeclarationOf(zero.Greeting)
	if err != nil {
		t.Fatalf("fold from the greeting: %v", err)
	}

	options := ClientZeroConnectOptions(zero.Name)
	optionsDigest, err := digestOf(options)
	if err != nil {
		t.Fatalf("digest the connect options: %v", err)
	}
	estate := EstateDeclaration(nil, zero.Name, nil)

	left, err := SessionBytes(SessionValue(fromOptions, optionsDigest, estate))
	if err != nil {
		t.Fatalf("canonicalize the options carriage: %v", err)
	}
	right, err := SessionBytes(SessionValue(fromGreeting, optionsDigest, estate))
	if err != nil {
		t.Fatalf("canonicalize the greeting carriage: %v", err)
	}
	if string(left) != string(right) {
		t.Fatalf("the two carriages folded different bytes\n  options: %s\n  greeting: %s", left, right)
	}
}

// TestArmAControl is the executed refutation beside the passing run: one
// mutated field in one group must move the bytes.
func TestArmAControl(t *testing.T) {
	instance := acquired(t, hermetic(t))
	zero, err := instance.ConnectClientZero("foldlab-daemon")
	if err != nil {
		t.Fatalf("connect client zero: %v", err)
	}
	defer zero.Conn.Close()

	registration, err := instance.Registration(zero.CID)
	if err != nil {
		t.Fatalf("read the registration: %v", err)
	}
	folded, err := instance.SubstrateFromRegistration(registration)
	if err != nil {
		t.Fatalf("fold from options and registration: %v", err)
	}
	estate := EstateDeclaration(nil, zero.Name, nil)
	honest, err := SessionBytes(SessionValue(folded, "a", estate))
	if err != nil {
		t.Fatalf("canonicalize the honest fold: %v", err)
	}
	mutated, err := SessionBytes(SessionValue(folded, "b", estate))
	if err != nil {
		t.Fatalf("canonicalize the mutated fold: %v", err)
	}
	if string(honest) == string(mutated) {
		t.Fatal("a mutated group-two digest did not move the folded bytes")
	}
}

// TestReadinessObservationsLandPositioned holds the readiness contract: the
// observations land on the incarnation lane, in the order observed, each
// carrying the position it landed at.
func TestReadinessObservationsLandPositioned(t *testing.T) {
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

	first, err := Observe(ctx, lane, instance.OptionsDigest(), GateReadyForConnections, OutcomeReady)
	if err != nil {
		t.Fatalf("observe readiness: %v", err)
	}
	second, err := Observe(ctx, lane, instance.OptionsDigest(), GateHealthz, instance.Healthz().Status)
	if err != nil {
		t.Fatalf("observe health: %v", err)
	}
	if second.Position <= first.Position {
		t.Fatalf("observations did not land in the order observed: %d then %d", first.Position, second.Position)
	}
	if first.Digest == second.Digest {
		t.Fatal("two different observations named the same value")
	}
}

// TestReadinessSaysNothingAboutTheFuture holds the phrasing bound: a readiness
// value names a gate and an outcome and nothing else. "Healthy now" is
// unsayable here, and so is any promise.
func TestReadinessSaysNothingAboutTheFuture(t *testing.T) {
	value := ReadinessValue("a", GateHealthz, "ok")
	keys := make([]string, 0, len(value))
	for key := range value {
		keys = append(keys, key)
	}
	for _, key := range keys {
		switch key {
		case "v", "kind", "options", "gate", "outcome":
		default:
			t.Fatalf("the readiness value carries the unexpected field %q", key)
		}
	}
	encoded, err := SessionBytes(value)
	if err != nil {
		t.Fatalf("canonicalize the readiness value: %v", err)
	}
	for _, promise := range []string{"until", "will", "expires", "deadline", "healthy"} {
		if strings.Contains(string(encoded), promise) {
			t.Fatalf("the readiness value is phrased as a promise: %s", encoded)
		}
	}
}

// TestGreatestDeclaredOptions holds the acquire read: greatest position wins,
// a tie between two distinct values refuses, and one value declared twice at
// one position is one value.
func TestGreatestDeclaredOptions(t *testing.T) {
	low := DeclaredServerOptions{ServerName: "low", StoreDir: filepath.Join("a")}
	high := DeclaredServerOptions{ServerName: "high", StoreDir: filepath.Join("b")}

	read, err := GreatestDeclaredOptions([]PositionedOptions{
		{Position: 7, Declared: high},
		{Position: 3, Declared: low},
	})
	if err != nil || read != high {
		t.Fatalf("greatest-position read returned %+v, %v", read, err)
	}

	if _, err := GreatestDeclaredOptions(nil); !errors.Is(err, ErrNoDeclaredOptions) {
		t.Fatalf("a read over nothing returned %v", err)
	}

	_, err = GreatestDeclaredOptions([]PositionedOptions{
		{Position: 3, Declared: low},
		{Position: 3, Declared: high},
	})
	if !errors.Is(err, ErrTiedDeclaredOptions) {
		t.Fatalf("a tie between two distinct values returned %v", err)
	}

	same, err := GreatestDeclaredOptions([]PositionedOptions{
		{Position: 3, Declared: low},
		{Position: 3, Declared: low},
	})
	if err != nil || same != low {
		t.Fatalf("one value declared twice returned %+v, %v", same, err)
	}
}

// TestUnregisteredConnectionRefuses holds the registration read's refusal.
func TestUnregisteredConnectionRefuses(t *testing.T) {
	instance := acquired(t, hermetic(t))
	if _, err := instance.Registration(1 << 40); !errors.Is(err, ErrUnregistered) {
		t.Fatalf("an unregistered connection returned %v", err)
	}
}
