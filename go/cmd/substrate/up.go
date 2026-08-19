package main

import (
	"context"
	"errors"
	"flag"
	"fmt"
	"time"

	"foldlab/daemon"
)

// dispositionPoll is how often a serving incarnation reads its lane forward.
//
// Pacing is CARRIAGE. It changes how soon a disposition is noticed and it
// changes nothing about what the record says, so no meaning rides this number:
// a party reading the same lane at any other pace reaches the same facts.
const dispositionPoll = 250 * time.Millisecond

func runUp(arguments []string) error {
	flags := flag.NewFlagSet("up", flag.ExitOnError)
	coordinationURL := flags.String("coordination", "", "the substrate the register and the lanes live on")
	store := flags.String("store", "", "the store directory this incarnation owns")
	name := flags.String("name", "", "the server name this incarnation runs under")
	host := flags.String("addr", "127.0.0.1", "the address the substrate listens on")
	port := flags.Int("port", -1, "the client port; the vendor's own random-port sentinel by default")
	readyWithin := flags.Duration("ready-within", 30*time.Second, "how long the readiness gate is given")
	if err := flags.Parse(arguments); err != nil {
		return err
	}
	if *store == "" {
		return errors.New("the store directory is required: it is the substrate's durable identity and the coordinate the incarnation chain is keyed by")
	}

	// 1. The declared server-options value.
	//
	// Read by the greatest-position read rather than taken as given, so the one
	// read the estate proved is the one read that resolves what a substrate runs
	// under. The log suppression is FALSE under the daemon posture: a daemon owns
	// its process and therefore owns its log, and nothing here configures a
	// logger, so the substrate writes nothing until the process that owns the log
	// says where it goes.
	declared, err := daemon.GreatestDeclaredOptions([]daemon.PositionedOptions{{
		Position: 0,
		Declared: daemon.DeclaredServerOptions{
			ServerName:   *name,
			StoreDir:     *store,
			Host:         *host,
			Port:         *port,
			JetStream:    true,
			Listen:       true,
			NoLog:        false,
			SyncInterval: daemon.DeclaredSyncInterval,
			SyncAlways:   daemon.DeclaredSyncAlways,
		},
	}})
	if err != nil {
		return err
	}
	options := daemon.NewOptionsStore()
	optionsDigest, err := options.Declare(declared)
	if err != nil {
		return err
	}
	storeDigest, err := daemon.StoreDigest(*store)
	if err != nil {
		return err
	}
	fmt.Printf("declared options: %s\n", optionsDigest)
	fmt.Printf("store: %s\n", storeDigest)

	ctx, cancel := context.WithTimeout(context.Background(), laneDeadline)
	defer cancel()
	lanes, err := openCoordination(ctx, *coordinationURL, *name)
	if err != nil {
		return err
	}
	defer lanes.Close()

	// 2. The fence, and nothing below runs for a loser.
	//
	// The round is the first chain position the REGISTER shows nobody has
	// decided — never a position read off the lane, because a decide that landed
	// and then failed before it could establish spends its round without leaving
	// a fact, and a walk over the lane would send this start back to that spent
	// round and be refused there for good.
	predecessor, chain, err := daemon.OpenRound(lanes.registers, storeDigest, chainDepth)
	if err != nil {
		return err
	}
	value := daemon.SubstrateIncarnation{
		Store: storeDigest, Options: optionsDigest, Predecessor: predecessor,
	}
	landed, err := daemon.DecideIncarnation(lanes.registers, value, *name)
	if err != nil {
		return fmt.Errorf("the incarnation round was lost and no server was started: %w", err)
	}
	fmt.Printf("round: decided at chain position %d, predecessor %s\n", len(chain), label(predecessor))
	fmt.Printf("incarnation: %s\n", landed.Digest)

	// 3. The server, constructed and started. Admission runs inside the
	// acquisition, before the value is digested and before any listener could be
	// bound, so a declared value that opens a closed channel is refused here with
	// its taught repair and no server exists at all.
	instance, err := daemon.Acquire(declared)
	if err != nil {
		return err
	}
	defer func() {
		instance.Shutdown()
		instance.WaitForShutdown()
	}()
	if refusal := daemon.AdmitOptionsCitation(options, landed.Value.Options, declared); refusal != nil {
		return refusal
	}
	instance.Start()

	// 4. Readiness, by the pinned vendor's own gates and never by a bound port.
	//
	// Both observations land whichever way the gates went, because an unready
	// gate is evidence too. Only an admitted reading establishes the incarnation:
	// a substrate that did not pass its own health read with JetStream enablement
	// requested has not entered service, whatever its listener is doing.
	reading := daemon.ProbeReadiness(instance, *readyWithin)
	// A fresh budget for the landings. The readiness gate is allowed to take as
	// long as it was given, and a lane write that inherited whatever was left of
	// the opening budget would fail on the clock rather than on the substrate.
	landing, closeLanding := context.WithTimeout(context.Background(), laneDeadline)
	defer closeLanding()
	observations, err := daemon.ObserveProbe(landing, lanes.incarnation, optionsDigest, reading)
	if err != nil {
		return err
	}
	for _, observation := range observations {
		fmt.Printf("readiness observation: gate=%s outcome=%s position=%d digest=%s\n",
			observation.Gate, observation.Outcome, observation.Position, observation.Digest)
	}
	if !reading.Admitted() {
		return fmt.Errorf(
			"the substrate did not pass its readiness gates and no incarnation was established: %s=%s %s=%s %s",
			daemon.GateReadyForConnections, reading.Ready, daemon.GateHealthz, reading.Health, reading.Detail,
		)
	}

	// 5. The established fact.
	established, establishedDigest, err := daemon.Land(
		landing, lanes.incarnation, daemon.EstablishedIncarnationFact(landed.Digest, value),
	)
	if err != nil {
		return err
	}
	fmt.Printf("established: position=%d digest=%s\n", established, establishedDigest)

	// 6. The daemon's own connection, folded and announced like any other
	// client's. It is what the lame-duck fact will be about.
	zero, session, err := announceClientZero(landing, lanes, instance, *name)
	if err != nil {
		return err
	}

	// The one-line ready report. Digests name every value it cites; the one
	// coordinate that is not a digest is the address a client dials, which is
	// what a report of a serving substrate is for.
	fmt.Printf(
		"READY: incarnation=%s options=%s store=%s predecessor=%s session=%s gates=%s/%s url=%s\n",
		landed.Digest, optionsDigest, storeDigest, label(predecessor), session,
		reading.Ready, reading.Health, instance.ClientURL(),
	)

	// 7. Serve, until the record disposes this incarnation to retire.
	disposition, err := serve(lanes, landed.Digest)
	if err != nil {
		return err
	}
	fmt.Printf("disposition: position=%d cause=%s\n", disposition.Position, disposition.Cause)

	return teardown(lanes, instance, zero, landed.Digest, session, *name, disposition.Cause)
}

// label renders an absent predecessor as the word a chain head carries, so a
// report never prints an empty field a reader has to guess at.
func label(digest string) string {
	if digest == "" {
		return "none"
	}
	return digest
}

// announceClientZero opens the daemon's own connection to its own substrate,
// folds its session from the options value plus the registration the server
// recorded, and lands the establishment on the session lane.
//
// No greeting is read. That absence is the claim the carriage-invariance
// differential measures: this is the mint a party that never saw the
// connection's greeting can still perform.
func announceClientZero(
	ctx context.Context,
	lanes *coordination,
	instance *daemon.Daemon,
	name string,
) (*daemon.ClientZero, string, error) {
	zero, err := instance.ConnectClientZero(name)
	if err != nil {
		return nil, "", err
	}
	registration, err := instance.Registration(zero.CID)
	if err != nil {
		return nil, "", err
	}
	substrate, err := instance.SubstrateFromRegistration(registration)
	if err != nil {
		return nil, "", err
	}
	connectOptions, err := daemon.SessionName(daemon.ClientZeroConnectOptions(name))
	if err != nil {
		return nil, "", err
	}
	estate := daemon.EstateDeclaration(nil, name, nil)
	session, err := daemon.SessionName(daemon.SessionValue(substrate, connectOptions, estate))
	if err != nil {
		return nil, "", err
	}
	roster, err := daemon.RosterDigest(daemon.SubstrateRoster)
	if err != nil {
		return nil, "", err
	}
	position, digest, err := daemon.Land(
		ctx, lanes.session, daemon.EstablishedFact(session, connectOptions, roster, nil),
	)
	if err != nil {
		return nil, "", err
	}
	fmt.Printf("session established: position=%d digest=%s session=%s\n", position, digest, session)
	return zero, session, nil
}

// serve holds an anchor on the incarnation lane and advances until the record
// disposes THIS incarnation to retire.
//
// The consumer holds no connection and no callback, so this loop could not
// react to a status event if it wanted to; what it reacts to is a fact any
// second reader can find at the same position. The pacing is this loop's own
// and carries no meaning.
func serve(lanes *coordination, incarnation string) (daemon.DispositionReaction, error) {
	consumer := daemon.NewDispositionConsumer(lanes.incarnation)
	for {
		ctx, cancel := context.WithTimeout(context.Background(), laneDeadline)
		reactions, err := consumer.Advance(ctx)
		cancel()
		if err != nil {
			return daemon.DispositionReaction{}, err
		}
		for _, reaction := range reactions {
			if reaction.Incarnation == incarnation {
				return reaction, nil
			}
		}
		time.Sleep(dispositionPoll)
	}
}

// teardown performs the disposed teardown and lands what it did.
//
// The two paths differ in the carriage they perform and in the fact chain they
// leave, and the difference is the whole point: a drain announces its
// disposition on the session lane before the vendor's own drain runs, so a
// party that was never connected still sees it, while a stop announces nothing
// because nothing was announced to anybody. Neither is the other's degraded
// form.
func teardown(
	lanes *coordination,
	instance *daemon.Daemon,
	zero *daemon.ClientZero,
	incarnation string,
	session string,
	name string,
	cause string,
) error {
	ctx, cancel := context.WithTimeout(context.Background(), laneDeadline)
	defer cancel()

	switch cause {
	case daemon.CauseDrained:
		// The fact lands BEFORE the drain: a disposition announced only by a
		// status event reaches the clients that happen to be connected, and the
		// record is what reaches everybody else.
		position, digest, err := daemon.Land(
			ctx, lanes.session, daemon.LameDuckFact(incarnation, session, name),
		)
		if err != nil {
			return err
		}
		fmt.Printf("lame duck: position=%d digest=%s\n", position, digest)
		instance.LameDuckShutdown()
	case daemon.CauseStopped:
		instance.Shutdown()
	default:
		return fmt.Errorf("%w: %q", daemon.ErrUndeclaredCause, cause)
	}
	instance.WaitForShutdown()

	// The session's end, cited by the pinned client's own word for the state
	// this connection had reached when its owner closed it. The word is read
	// AFTER the stop completed and BEFORE the close, so what the record carries
	// is the state the teardown left the connection in rather than the state
	// closing it puts every connection in.
	terminal := zero.Conn.Status().String()
	zero.Conn.Close()
	endedPosition, endedDigest, err := daemon.Land(
		ctx, lanes.session, daemon.EndedSessionFact(session, terminal),
	)
	if err != nil {
		return err
	}
	fmt.Printf("session ended: position=%d digest=%s cause=%s\n", endedPosition, endedDigest, terminal)

	retired, err := daemon.RetiredIncarnationFact(incarnation, cause)
	if err != nil {
		return err
	}
	retiredPosition, retiredDigest, err := daemon.Land(ctx, lanes.incarnation, retired)
	if err != nil {
		return err
	}
	fmt.Printf("retired: position=%d digest=%s cause=%s\n", retiredPosition, retiredDigest, cause)
	fmt.Printf("RETIRED: incarnation=%s cause=%s\n", incarnation, cause)
	return nil
}
