// Command teardownwall executes the daemon's teardown fact-chain differential
// and records the chains verbatim.
//
// Three teardowns, three processes, three chains that must be distinguishable
// from the facts alone:
//
//	drain then stop — the drain disposition lands as a fact on the session
//	lane before the vendor's own drain runs, the session ends, and the
//	incarnation retires naming the drained cause.
//
//	stop — no drain and therefore no lame-duck fact; the session ends and the
//	incarnation retires naming the stopped cause.
//
//	kill — the process is killed outright. The incarnation stays ESTABLISHED
//	and its lanes go quiet. There is no crash fact, and this command will not
//	manufacture one: absence is the honest reading and absence is what it
//	records.
//
// Each arm runs as its own process and the kill arm kills that whole process,
// because an in-process shutdown is not a process crash — the estate's recovery
// discipline, adopted rather than approximated.
//
// The fourth part is the consumer seam. A consumer holding ONLY an anchor on
// the session lane reads the drain's lame-duck fact and advances. Its control,
// under `--consumer-control`, wires a consumer to the vendor's own lame-duck
// callback instead, runs the same drain with no fact landed, and measures that
// the reaction it produced is unreadable from the lane by any second party.
// That is the private truth the lane-driven shape does not build.
package main

import (
	"context"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"net"
	"os"
	"os/exec"
	"reflect"
	"strings"
	"time"

	"github.com/nats-io/nats.go"
	"github.com/nats-io/nats.go/jetstream"

	"foldlab/canonical"
	"foldlab/daemon"
	"foldlab/journal"
	"foldlab/register"
)

const (
	readyWithin  = 30 * time.Second
	laneDeadline = 60 * time.Second
	drainWithin  = 90 * time.Second
)

// The three teardown modes, named by what the carriage does.
const (
	modeDrain   = "drain"
	modeStop    = "stop"
	modeKill    = "kill"
	modePrivate = "private"
)

// report is the one JSON line a child writes when its incarnation is serving,
// so the parent knows what to look for on the lanes.
type report struct {
	Incarnation string `json:"incarnation"`
	Store       string `json:"store"`
	Session     string `json:"session"`
	Server      string `json:"server"`
	// Reacted is the private-consumer control's evidence that the vendor's own
	// callback fired. It is deliberately reported over the child's stdout,
	// because there is nowhere else it could go — which is the control's point.
	Reacted bool `json:"reacted"`
}

func main() {
	child := flag.Bool("child", false, "run as one teardown arm's own process")
	mode := flag.String("mode", "", "drain, stop, kill, or private")
	url := flag.String("url", "", "the coordination substrate the register and lanes live on")
	store := flag.String("store", "", "this arm's store directory")
	port := flag.Int("port", 0, "this arm's client port")
	consumerControl := flag.Bool(
		"consumer-control",
		false,
		"run the committed control: a consumer wired to the vendor's callback instead of the lane",
	)
	flag.Parse()

	if *child {
		if err := runChild(*mode, *url, *store, *port); err != nil {
			fmt.Fprintln(os.Stderr, err)
			os.Exit(1)
		}
		return
	}
	if err := run(*consumerControl); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}

func run(consumerControl bool) error {
	coordination, err := os.MkdirTemp("", "foldlab-teardown-coordination-")
	if err != nil {
		return err
	}
	defer os.RemoveAll(coordination)

	supervisor, err := daemon.Acquire(daemon.DeclaredServerOptions{
		ServerName:   "foldlab-teardown-coordination",
		StoreDir:     coordination,
		Host:         "127.0.0.1",
		Port:         -1,
		JetStream:    true,
		Listen:       true,
		NoLog:        true,
		SyncInterval: daemon.DeclaredSyncInterval,
		SyncAlways:   daemon.DeclaredSyncAlways,
	})
	if err != nil {
		return err
	}
	defer func() {
		supervisor.Shutdown()
		supervisor.WaitForShutdown()
	}()
	supervisor.Start()
	if !supervisor.ReadyForConnections(readyWithin) {
		return errors.New("the coordination substrate did not pass its readiness gate")
	}
	url := supervisor.ClientURL()

	connection, err := nats.Connect(url, nats.Name("foldlab-teardown-wall"))
	if err != nil {
		return err
	}
	defer connection.Close()
	if _, err := register.Open(connection); err != nil {
		return err
	}

	ctx, cancel := context.WithTimeout(context.Background(), laneDeadline)
	defer cancel()
	js, err := jetstream.New(connection)
	if err != nil {
		return err
	}
	incarnations, err := daemon.OpenLane(ctx, js, daemon.IncarnationLane)
	if err != nil {
		return err
	}
	sessions, err := daemon.OpenLane(ctx, js, daemon.SessionLane)
	if err != nil {
		return err
	}

	if consumerControl {
		return runConsumerControl(ctx, url, sessions)
	}

	arms := []struct {
		mode string
		kill bool
	}{
		{mode: modeDrain},
		{mode: modeStop},
		{mode: modeKill, kill: true},
	}
	chains := make(map[string][]string, len(arms))
	reports := make(map[string]report, len(arms))
	for _, arm := range arms {
		taken, err := runArm(arm.mode, url, arm.kill)
		if err != nil {
			return err
		}
		reports[arm.mode] = taken
	}

	incarnationFacts, err := daemon.ReadLane(ctx, incarnations)
	if err != nil {
		return err
	}
	sessionFacts, err := daemon.ReadLane(ctx, sessions)
	if err != nil {
		return err
	}

	for _, arm := range arms {
		taken := reports[arm.mode]
		fmt.Printf("\n== run %s: incarnation=%s session=%s server=%s\n",
			arm.mode, taken.Incarnation, taken.Session, taken.Server)
		chain := make([]string, 0, 4)
		for position, fact := range incarnationFacts {
			if fact["incarnation"] != taken.Incarnation {
				continue
			}
			chain = append(chain, describe(fact))
			printFact(daemon.IncarnationLane, position, fact)
		}
		for position, fact := range sessionFacts {
			if fact["incarnation"] != taken.Incarnation && fact["session"] != taken.Session {
				continue
			}
			chain = append(chain, describe(fact))
			printFact(daemon.SessionLane, position, fact)
		}
		chains[arm.mode] = chain
		fmt.Printf("run %s chain: %s\n", arm.mode, strings.Join(chain, " -> "))
	}

	// The three chains, compared by execution rather than by reading them.
	fmt.Println()
	for left := 0; left < len(arms); left++ {
		for right := left + 1; right < len(arms); right++ {
			one, other := arms[left].mode, arms[right].mode
			if strings.Join(chains[one], "|") == strings.Join(chains[other], "|") {
				return fmt.Errorf("the %s and %s chains are identical, so the two teardowns are not distinguishable",
					one, other)
			}
			fmt.Printf("chains distinct: %s vs %s\n", one, other)
		}
	}

	if err := requireChain(chains, modeDrain, []string{
		"substrate-incarnation-established",
		"substrate-incarnation-retired(drained)",
		"substrate-session-established",
		"substrate-incarnation-lame-duck",
		"substrate-session-ended(CLOSED)",
	}); err != nil {
		return err
	}
	if err := requireChain(chains, modeStop, []string{
		"substrate-incarnation-established",
		"substrate-incarnation-retired(stopped)",
		"substrate-session-established",
		"substrate-session-ended(CLOSED)",
	}); err != nil {
		return err
	}
	if err := requireChain(chains, modeKill, []string{
		"substrate-incarnation-established",
		"substrate-session-established",
	}); err != nil {
		return err
	}

	// The killed incarnation, folded. The fold has no answer that says "live",
	// and this is the run that proves it does not invent one.
	standings, err := daemon.FoldIncarnations(incarnationFacts)
	if err != nil {
		return err
	}
	killed := reports[modeKill]
	greatest, err := daemon.GreatestIncarnation(standings, killed.Store)
	if err != nil {
		return err
	}
	fmt.Printf("\nfold over the killed incarnation's lanes, verbatim: %+v\n", greatest)
	if greatest.Incarnation != killed.Incarnation {
		return fmt.Errorf("the greatest-position read named %s, want the killed incarnation %s",
			greatest.Incarnation, killed.Incarnation)
	}
	if greatest.Standing != daemon.StandingEstablished || greatest.Cause != "" {
		return fmt.Errorf("the killed incarnation folded as %s with cause %q, want established with none",
			greatest.Standing, greatest.Cause)
	}

	// Read again, after the fact. Nothing between the two reads may have
	// retired the dead incarnation on its behalf.
	later, err := daemon.ReadLane(ctx, incarnations)
	if err != nil {
		return err
	}
	laterStandings, err := daemon.FoldIncarnations(later)
	if err != nil {
		return err
	}
	laterGreatest, err := daemon.GreatestIncarnation(laterStandings, killed.Store)
	if err != nil {
		return err
	}
	if laterGreatest.Standing != daemon.StandingEstablished {
		return fmt.Errorf("a later reader moved the dead incarnation to %s", laterGreatest.Standing)
	}
	fmt.Printf("re-read after the run: standing=%s cause=%s — no retirement was manufactured\n",
		laterGreatest.Standing, causeLabel(laterGreatest.Cause))

	// Forging is refused by construction, not by convention: the cause roster
	// carries no row for a crash, so there is no way to mint one.
	for _, forged := range []string{"crashed", "killed", "timed-out", "unreachable"} {
		if _, err := daemon.RetiredIncarnationFact(killed.Incarnation, forged); !errors.Is(
			err, daemon.ErrUndeclaredCause,
		) {
			return fmt.Errorf("the cause %q was mintable: %v", forged, err)
		}
	}
	fmt.Printf("forged causes refused: %v\n", []string{"crashed", "killed", "timed-out", "unreachable"})

	// Part four: the consumer that holds only an anchor.
	if err := laneConsumer(ctx, sessions, reports[modeDrain]); err != nil {
		return err
	}

	fmt.Printf("\nTEARDOWN FACT-CHAIN DIFFERENTIAL: three chains, pairwise distinct, killed incarnation unretired\n")
	return nil
}

func requireChain(chains map[string][]string, mode string, want []string) error {
	got := chains[mode]
	if strings.Join(got, "|") != strings.Join(want, "|") {
		return fmt.Errorf("the %s chain is %v, want %v", mode, got, want)
	}
	return nil
}

// laneConsumer runs part four: a consumer whose whole state is one anchor.
func laneConsumer(ctx context.Context, sessions *journal.Journal, drained report) error {
	consumer := daemon.NewLameDuckConsumer(sessions)
	before := consumer.Anchor()
	reactions, err := consumer.Advance(ctx)
	if err != nil {
		return err
	}
	after := consumer.Anchor()
	fmt.Printf("\nlane-driven consumer: anchor %d -> %d, reactions=%d\n", before.Seq, after.Seq, len(reactions))
	found := false
	for _, reaction := range reactions {
		fmt.Printf("  reaction: position=%d incarnation=%s session=%s server=%s\n",
			reaction.Position, reaction.Incarnation, reaction.Session, reaction.Server)
		if reaction.Incarnation == drained.Incarnation && reaction.Session == drained.Session {
			found = true
			if reaction.Server != drained.Server {
				return fmt.Errorf("the lame-duck fact names server %q, want %q",
					reaction.Server, drained.Server)
			}
		}
	}
	if !found {
		return errors.New("the lane-driven consumer did not react to the drain's lame-duck fact")
	}

	// By construction, and checked rather than asserted: the consumer holds no
	// connection, so there is no object on which a status callback could be
	// registered.
	shape := reflect.TypeOf(daemon.LameDuckConsumer{})
	for index := 0; index < shape.NumField(); index++ {
		field := shape.Field(index)
		if strings.Contains(field.Type.String(), "nats.") {
			return fmt.Errorf("the lane-driven consumer holds a transport field %s %s",
				field.Name, field.Type)
		}
	}
	fmt.Printf("lane-driven consumer holds %d fields, none of them a transport: %s\n",
		shape.NumField(), fieldNames(shape))
	return nil
}

func fieldNames(shape reflect.Type) string {
	names := make([]string, 0, shape.NumField())
	for index := 0; index < shape.NumField(); index++ {
		names = append(names, fmt.Sprintf("%s %s", shape.Field(index).Name, shape.Field(index).Type))
	}
	return strings.Join(names, ", ")
}

// runConsumerControl is the committed control for part four.
//
// The same drain runs, with NO lame-duck fact landed, and a consumer wired to
// the vendor's own lame-duck callback reacts to it. The control passes when
// both halves hold: the callback consumer demonstrably reacted, and a second
// party holding an anchor on the session lane can find no trace of that
// reaction. A control that could find one would prove nothing, because then the
// callback shape would be auditable too.
func runConsumerControl(ctx context.Context, url string, sessions *journal.Journal) error {
	taken, err := runArm(modePrivate, url, false)
	if err != nil {
		return err
	}
	fmt.Printf("callback-driven consumer: reacted=%t incarnation=%s session=%s\n",
		taken.Reacted, taken.Incarnation, taken.Session)
	if !taken.Reacted {
		return errors.New("the vendor's lame-duck callback never fired, so this control measured nothing")
	}

	consumer := daemon.NewLameDuckConsumer(sessions)
	reactions, err := consumer.Advance(ctx)
	if err != nil {
		return err
	}
	fmt.Printf("second reader, holding only an anchor on the session lane: reactions=%d\n", len(reactions))
	if len(reactions) != 0 {
		return fmt.Errorf(
			"the lane carried %d lame-duck facts, so the callback consumer's reaction was auditable after all and this control cannot fail",
			len(reactions),
		)
	}
	fmt.Printf(
		"LANE-DRIVEN LAME-DUCK CONSUMER CONTROL: REFUSED as required — the callback consumer reacted and no second reader can see that it did\n",
	)
	return nil
}

func causeLabel(cause string) string {
	if cause == "" {
		return "none"
	}
	return cause
}

// describe names one fact the way a chain comparison reads it: its kind, plus
// the cause it carries when it carries one.
func describe(fact map[string]any) string {
	kind, _ := fact["kind"].(string)
	if cause, carried := fact["cause"].(string); carried && cause != "" {
		return fmt.Sprintf("%s(%s)", kind, cause)
	}
	return kind
}

func printFact(lane string, position int, fact map[string]any) {
	bytes, err := canonical.CanonicalizeValue(fact)
	if err != nil {
		fmt.Printf("  %s[%d]: <uncanonicalizable: %v>\n", lane, position, err)
		return
	}
	fmt.Printf("  %s[%d]: %s\n", lane, position, bytes)
}

// runArm spawns one teardown arm as its own process and either lets it finish
// or kills it outright.
func runArm(mode string, url string, kill bool) (report, error) {
	store, err := os.MkdirTemp("", "foldlab-teardown-"+mode+"-")
	if err != nil {
		return report{}, err
	}
	port, err := freePort()
	if err != nil {
		return report{}, err
	}
	executable, err := os.Executable()
	if err != nil {
		return report{}, err
	}
	command := exec.Command(executable,
		"--child", "--mode", mode, "--url", url, "--store", store, "--port", fmt.Sprint(port),
	)
	command.Stderr = os.Stderr
	output, err := command.StdoutPipe()
	if err != nil {
		return report{}, err
	}
	if err := command.Start(); err != nil {
		return report{}, err
	}
	decoder := json.NewDecoder(output)
	serving := report{}
	if err := decoder.Decode(&serving); err != nil {
		_ = command.Process.Kill()
		_ = command.Wait()
		return report{}, fmt.Errorf("read the %s arm's serving report: %w", mode, err)
	}

	if kill {
		// The whole process, killed. An in-process shutdown is not a process
		// crash, and substituting one would make this arm measure the thing it
		// exists to distinguish itself from.
		if err := command.Process.Kill(); err != nil {
			return report{}, fmt.Errorf("kill the %s arm: %w", mode, err)
		}
		_ = command.Wait()
		fmt.Printf("run %s: process killed outright after it reported serving\n", mode)
		return serving, nil
	}

	final := report{}
	if err := decoder.Decode(&final); err != nil {
		_ = command.Process.Kill()
		_ = command.Wait()
		return report{}, fmt.Errorf("read the %s arm's final report: %w", mode, err)
	}
	if err := command.Wait(); err != nil {
		return report{}, fmt.Errorf("the %s arm exited badly: %w", mode, err)
	}
	serving.Reacted = final.Reacted
	return serving, nil
}

func freePort() (int, error) {
	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		return 0, err
	}
	defer listener.Close()
	return listener.Addr().(*net.TCPAddr).Port, nil
}

// runChild is one teardown arm, in its own process: fence, start, serve, and
// then tear down the way its mode says.
func runChild(mode string, url string, store string, port int) error {
	coordination, err := nats.Connect(url, nats.Name("foldlab-teardown-"+mode))
	if err != nil {
		return err
	}
	defer coordination.Close()
	registers, err := register.Open(coordination)
	if err != nil {
		return err
	}

	ctx, cancel := context.WithTimeout(context.Background(), drainWithin)
	defer cancel()
	js, err := jetstream.New(coordination)
	if err != nil {
		return err
	}
	incarnations, err := daemon.OpenLane(ctx, js, daemon.IncarnationLane)
	if err != nil {
		return err
	}
	sessions, err := daemon.OpenLane(ctx, js, daemon.SessionLane)
	if err != nil {
		return err
	}

	serverName := "foldlab-teardown-" + mode
	declared := daemon.DeclaredServerOptions{
		ServerName:   serverName,
		StoreDir:     store,
		Host:         "127.0.0.1",
		JetStream:    true,
		Listen:       true,
		NoLog:        true,
		SyncInterval: daemon.DeclaredSyncInterval,
		SyncAlways:   daemon.DeclaredSyncAlways,
	}
	optionsDigest, err := declared.Digest()
	if err != nil {
		return err
	}
	storeDigest, err := daemon.StoreDigest(store)
	if err != nil {
		return err
	}

	// The fence, first. Nothing below runs for a loser.
	value := daemon.SubstrateIncarnation{Store: storeDigest, Options: optionsDigest}
	landed, err := daemon.DecideIncarnation(registers, value, serverName)
	if err != nil {
		return err
	}

	running := declared
	running.Port = port
	instance, err := daemon.Acquire(running)
	if err != nil {
		return err
	}
	instance.Start()
	if !instance.ReadyForConnections(readyWithin) {
		return errors.New("the arm's substrate did not pass its readiness gate")
	}
	if _, _, err := daemon.Land(
		ctx, incarnations, daemon.EstablishedIncarnationFact(landed.Digest, value),
	); err != nil {
		return err
	}

	// One client connected to the substrate that is about to be torn down. It
	// is what the drain kicks and what the session facts are about.
	reacted := make(chan struct{}, 1)
	closed := make(chan struct{}, 1)
	options := []nats.Option{
		nats.Name("foldlab-teardown-client"),
		nats.NoReconnect(),
		// The terminal cause is the pinned client's own word for the state it
		// ends in, and a client that has not yet NOTICED the substrate is gone
		// is still in the state it was in. So the arm waits for the client to
		// say it is done before it reads the word — reading the status the
		// instant the server stops would cite the state the connection was in
		// before the teardown it is describing.
		nats.ClosedHandler(func(*nats.Conn) {
			select {
			case closed <- struct{}{}:
			default:
			}
		}),
	}
	if mode == modePrivate {
		// The control's consumer: wired to the vendor's own callback, which is
		// exactly the private truth this shape is here to demonstrate.
		options = append(options, nats.LameDuckModeHandler(func(*nats.Conn) {
			select {
			case reacted <- struct{}{}:
			default:
			}
		}))
	}
	client, err := nats.Connect(instance.ClientURL(), options...)
	if err != nil {
		return err
	}

	session, err := foldSession(instance, client)
	if err != nil {
		return err
	}
	roster, err := daemon.RosterDigest(daemon.SubstrateRoster)
	if err != nil {
		return err
	}
	connectOptions, err := daemon.SessionName(daemon.ClientZeroConnectOptions("foldlab-teardown-client"))
	if err != nil {
		return err
	}
	if _, _, err := daemon.Land(
		ctx, sessions, daemon.EstablishedFact(session, connectOptions, roster, nil),
	); err != nil {
		return err
	}

	if err := json.NewEncoder(os.Stdout).Encode(report{
		Incarnation: landed.Digest,
		Store:       storeDigest,
		Session:     session,
		Server:      serverName,
	}); err != nil {
		return err
	}

	switch mode {
	case modeKill:
		// Nothing happens here, and that is the point. The parent kills this
		// process; no fact is written on the way out because no fact is true.
		select {}
	case modeDrain:
		// The fact lands BEFORE the drain: a disposition announced only by a
		// status event reaches the clients that happen to be connected, and the
		// record is what reaches everybody else.
		if _, _, err := daemon.Land(
			ctx, sessions, daemon.LameDuckFact(landed.Digest, session, serverName),
		); err != nil {
			return err
		}
		instance.LameDuckShutdown()
	case modePrivate:
		// The control: the same drain, with NO fact landed. The callback is the
		// only place the disposition goes.
		instance.LameDuckShutdown()
	case modeStop:
		instance.Shutdown()
	default:
		return fmt.Errorf("unknown teardown mode %q", mode)
	}
	instance.WaitForShutdown()

	// The session's end, cited by the pinned client's own word for the state it
	// is now in.
	select {
	case <-closed:
	case <-time.After(readyWithin):
	}
	cause := client.Status().String()
	client.Close()
	if mode != modePrivate {
		if _, _, err := daemon.Land(
			ctx, sessions, daemon.EndedSessionFact(session, cause),
		); err != nil {
			return err
		}
		retired, err := daemon.RetiredIncarnationFact(landed.Digest, retirementCause(mode))
		if err != nil {
			return err
		}
		if _, _, err := daemon.Land(ctx, incarnations, retired); err != nil {
			return err
		}
	}

	private := false
	select {
	case <-reacted:
		private = true
	default:
	}
	return json.NewEncoder(os.Stdout).Encode(report{Reacted: private})
}

func retirementCause(mode string) string {
	if mode == modeDrain {
		return daemon.CauseDrained
	}
	return daemon.CauseStopped
}

// foldSession names the arm's one client connection, from the options value and
// the registration — the same fold the carriage-invariance differential already
// walls.
func foldSession(instance *daemon.Daemon, client *nats.Conn) (string, error) {
	identifier, err := client.GetClientID()
	if err != nil {
		return "", err
	}
	registration, err := instance.Registration(identifier)
	if err != nil {
		return "", err
	}
	substrate, err := instance.SubstrateFromRegistration(registration)
	if err != nil {
		return "", err
	}
	options, err := daemon.SessionName(daemon.ClientZeroConnectOptions("foldlab-teardown-client"))
	if err != nil {
		return "", err
	}
	estate := daemon.EstateDeclaration(nil, "foldlab-teardown-client", nil)
	return daemon.SessionName(daemon.SessionValue(substrate, options, estate))
}
