// Command lifecyclewall executes the substrate lifecycle command's own walls
// and records their numbers.
//
// Two arms, each run bare and each printing what it measured rather than that
// it worked.
//
//	Succession (the default arm) — up, down, up, down, over ONE store
//	directory, each verb its own process running the shipped binary. The second
//	start must name the first incarnation as its predecessor, the chain must
//	walk total and acyclic from the newest, and the two teardowns must retire
//	under the two declared causes. The arm closes by measuring the LOSER: a
//	fence is taken out of band at the round the next start would decide, the
//	shipped start is run against it, and it must print a refusal carrying
//	reason, law and repair while binding nothing and landing nothing.
//
//	Readiness (`--readiness`) — health-gated startup, executed both ways. The
//	shipped probe admits a substrate whose JetStream is there, and a JetStream
//	round trip taken the instant it returns succeeds on its first attempt. The
//	same probe is then run against a real vendor server whose JetStream has
//	been taken down by the vendor's own verb: the probe REFUSES it, the mutant
//	reading — the bound listener, which is what a ports-file wait observes —
//	admits it, and the same round trip FAILS. A readiness gate that cannot be
//	measured refusing an unready substrate is a gate nobody has measured.
//
// Both arms spawn processes and both print their evidence verbatim.
package main

import (
	"bufio"
	"context"
	"errors"
	"flag"
	"fmt"
	"io"
	"net"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"sync"
	"time"

	"github.com/nats-io/nats-server/v2/server"
	"github.com/nats-io/nats.go"
	"github.com/nats-io/nats.go/jetstream"

	"foldlab/canonical"
	"foldlab/daemon"
	"foldlab/register"
)

const (
	readyWithin  = 30 * time.Second
	laneDeadline = 60 * time.Second
	// serveWithin bounds how long the arm waits for a spawned start to report
	// itself ready or for a spawned teardown to complete.
	serveWithin = 120 * time.Second
	// roundTripWithin bounds the JetStream round trip the readiness arm takes
	// the instant a probe returns. It is deliberately short and it is taken
	// ONCE: a round trip that needed retrying would be measuring patience
	// rather than readiness.
	roundTripWithin = 5 * time.Second
)

func main() {
	readiness := flag.Bool("readiness", false, "run the readiness arm and its executed refutation")
	flag.Parse()

	var err error
	if *readiness {
		err = runReadiness()
	} else {
		err = runSuccession()
	}
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}

// coordination brings up the substrate the register and the lanes live on.
//
// It is NOT the substrate under test: the fence decides whether a server may
// exist over a store directory, and a fence that lived on that server would
// need the thing it is deciding whether to start.
func coordination() (*daemon.Daemon, string, func(), error) {
	directory, err := os.MkdirTemp("", "foldlab-lifecycle-coordination-")
	if err != nil {
		return nil, "", nil, err
	}
	instance, err := daemon.Acquire(daemon.DeclaredServerOptions{
		ServerName:   "foldlab-lifecycle-coordination",
		StoreDir:     directory,
		Host:         "127.0.0.1",
		Port:         -1,
		JetStream:    true,
		Listen:       true,
		NoLog:        true,
		SyncInterval: daemon.DeclaredSyncInterval,
		SyncAlways:   daemon.DeclaredSyncAlways,
	})
	if err != nil {
		os.RemoveAll(directory)
		return nil, "", nil, err
	}
	instance.Start()
	if !instance.ReadyForConnections(readyWithin) {
		instance.Shutdown()
		instance.WaitForShutdown()
		os.RemoveAll(directory)
		return nil, "", nil, errors.New("the coordination substrate did not pass its readiness gate")
	}
	release := func() {
		instance.Shutdown()
		instance.WaitForShutdown()
		os.RemoveAll(directory)
	}
	return instance, instance.ClientURL(), release, nil
}

// buildSubstrate compiles the shipped lifecycle command once, so the arm below
// spawns the binary an operator would run rather than a compiler.
func buildSubstrate() (string, func(), error) {
	directory, err := os.MkdirTemp("", "foldlab-lifecycle-binary-")
	if err != nil {
		return "", nil, err
	}
	name := "substrate"
	if runtime.GOOS == "windows" {
		name += ".exe"
	}
	target := filepath.Join(directory, name)
	build := exec.Command("go", "build", "-o", target, "./cmd/substrate")
	build.Stdout = os.Stdout
	build.Stderr = os.Stderr
	if err := build.Run(); err != nil {
		os.RemoveAll(directory)
		return "", nil, fmt.Errorf("build the lifecycle command: %w", err)
	}
	return target, func() { os.RemoveAll(directory) }, nil
}

// run executes one verb to completion and returns everything it printed.
func run(binary string, label string, arguments ...string) (string, error) {
	command := exec.Command(binary, arguments...)
	output, err := command.CombinedOutput()
	fmt.Printf("\n== %s\n%s", label, output)
	if err != nil {
		return string(output), fmt.Errorf("%s exited badly: %w", label, err)
	}
	return string(output), nil
}

// serving is one spawned start, streaming its report while it serves.
type serving struct {
	command *exec.Cmd
	ready   chan string
	done    chan error
	lines   []string
	mutex   sync.Mutex
}

// start spawns one start and streams its output until it reports itself ready.
func start(binary string, label string, arguments ...string) (*serving, error) {
	command := exec.Command(binary, arguments...)
	stdout, err := command.StdoutPipe()
	if err != nil {
		return nil, err
	}
	stderr, err := command.StderrPipe()
	if err != nil {
		return nil, err
	}
	if err := command.Start(); err != nil {
		return nil, err
	}
	held := &serving{command: command, ready: make(chan string, 1), done: make(chan error, 1)}
	go held.stream(label, stdout, true)
	go held.stream(label, stderr, false)
	go func() { held.done <- command.Wait() }()
	return held, nil
}

func (s *serving) stream(label string, source io.Reader, watch bool) {
	scanner := bufio.NewScanner(source)
	scanner.Buffer(make([]byte, 0, 64*1024), 1<<20)
	for scanner.Scan() {
		line := scanner.Text()
		fmt.Printf("  %s | %s\n", label, line)
		s.mutex.Lock()
		s.lines = append(s.lines, line)
		s.mutex.Unlock()
		if watch && strings.HasPrefix(line, "READY: ") {
			select {
			case s.ready <- line:
			default:
			}
		}
	}
}

// awaitReady blocks until the start reports itself ready or exits.
func (s *serving) awaitReady() (string, error) {
	select {
	case line := <-s.ready:
		return line, nil
	case err := <-s.done:
		return "", fmt.Errorf("the start exited before it reported itself ready: %v", err)
	case <-time.After(serveWithin):
		_ = s.command.Process.Kill()
		return "", errors.New("the start never reported itself ready")
	}
}

// awaitExit blocks until the start's process is gone.
func (s *serving) awaitExit() error {
	select {
	case err := <-s.done:
		return err
	case <-time.After(serveWithin):
		_ = s.command.Process.Kill()
		return errors.New("the start never exited after its disposition landed")
	}
}

// field reads one `key=value` coordinate out of a report line.
func field(line string, key string) string {
	for _, token := range strings.Fields(line) {
		if strings.HasPrefix(token, key+"=") {
			return strings.TrimPrefix(token, key+"=")
		}
	}
	return ""
}

func runSuccession() error {
	_, url, release, err := coordination()
	if err != nil {
		return err
	}
	defer release()

	binary, remove, err := buildSubstrate()
	if err != nil {
		return err
	}
	defer remove()

	contested, err := os.MkdirTemp("", "foldlab-lifecycle-store-")
	if err != nil {
		return err
	}
	defer os.RemoveAll(contested)
	storeDigest, err := daemon.StoreDigest(contested)
	if err != nil {
		return err
	}
	fmt.Printf("store: %s\n", storeDigest)
	fmt.Printf("bounds: two starts, two teardowns, one store directory, each verb its own process\n")

	// The two starts run at the vendor's own random-port sentinel, so both
	// declare the SAME options value and the two incarnations differ by exactly
	// the coordinate under test: the predecessor.
	first, err := start(binary, "up-1",
		"up", "--coordination", url, "--store", contested, "--name", "foldlab-lifecycle", "--port", "-1")
	if err != nil {
		return err
	}
	firstReady, err := first.awaitReady()
	if err != nil {
		return err
	}
	firstIncarnation := field(firstReady, "incarnation")
	firstOptions := field(firstReady, "options")
	if firstIncarnation == "" {
		return errors.New("the first start's ready report named no incarnation")
	}
	if predecessor := field(firstReady, "predecessor"); predecessor != "none" {
		return fmt.Errorf("the first start named predecessor %q, want a chain head", predecessor)
	}
	fmt.Printf("\nfirst incarnation: %s (chain head)\n", firstIncarnation)

	// It serves: a client outside the process reaches it at the address the
	// report named, and JetStream answers there on the first attempt.
	if err := reachable(field(firstReady, "url"), "the first start"); err != nil {
		return err
	}

	if _, err := run(binary, "status while the first is serving",
		"status", "--coordination", url, "--store", contested); err != nil {
		return err
	}

	if _, err := run(binary, "down-1 (drain)",
		"down", "--coordination", url, "--store", contested); err != nil {
		return err
	}
	if err := first.awaitExit(); err != nil {
		return err
	}
	fmt.Printf("first start exited after its disposition landed\n")

	second, err := start(binary, "up-2",
		"up", "--coordination", url, "--store", contested, "--name", "foldlab-lifecycle", "--port", "-1")
	if err != nil {
		return err
	}
	secondReady, err := second.awaitReady()
	if err != nil {
		return err
	}
	secondIncarnation := field(secondReady, "incarnation")
	if named := field(secondReady, "predecessor"); named != firstIncarnation {
		return fmt.Errorf("the second start named predecessor %q, want the first incarnation %s",
			named, firstIncarnation)
	}
	if options := field(secondReady, "options"); options != firstOptions {
		return fmt.Errorf("the two starts declared different options values: %s and %s",
			firstOptions, options)
	}
	fmt.Printf("\nsecond incarnation: %s, naming %s as its predecessor\n",
		secondIncarnation, firstIncarnation)
	if err := reachable(field(secondReady, "url"), "the second start"); err != nil {
		return err
	}

	if _, err := run(binary, "down-2 (stop)",
		"down", "--coordination", url, "--store", contested, "--stop"); err != nil {
		return err
	}
	if err := second.awaitExit(); err != nil {
		return err
	}

	statusOutput, err := run(binary, "status after both teardowns",
		"status", "--coordination", url, "--store", contested)
	if err != nil {
		return err
	}
	// The fold has no answer that says live, and the status surface must not
	// have grown one behind the fold's back.
	for _, forbidden := range []string{"live", "alive", "running", "healthy"} {
		if strings.Contains(strings.ToLower(statusOutput), forbidden) {
			return fmt.Errorf("the status report used the word %q, which the fold cannot say", forbidden)
		}
	}
	fmt.Printf("status report carries no liveness word: %v\n", []string{"live", "alive", "running", "healthy"})

	// The record, read back and folded.
	connection, err := nats.Connect(url, nats.Name("foldlab-lifecycle-wall"))
	if err != nil {
		return err
	}
	defer connection.Close()
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
	facts, err := daemon.ReadLane(ctx, incarnations)
	if err != nil {
		return err
	}
	sessionFacts, err := daemon.ReadLane(ctx, sessions)
	if err != nil {
		return err
	}
	fmt.Println()
	for position, fact := range facts {
		printFact(daemon.IncarnationLane, position, fact)
	}
	for position, fact := range sessionFacts {
		printFact(daemon.SessionLane, position, fact)
	}

	standings, err := daemon.FoldIncarnations(facts)
	if err != nil {
		return err
	}
	fmt.Println()
	for _, standing := range standings {
		staleness, mentioned := daemon.Staleness(facts, standing.Incarnation)
		fmt.Printf("standing: incarnation=%s position=%d standing=%s cause=%s staleness=%d mentioned=%t\n",
			standing.Incarnation, standing.Position, standing.Standing,
			causeLabel(standing.Cause), staleness, mentioned)
	}
	if len(standings) != 2 {
		return fmt.Errorf("the lane folded %d incarnations for one store, want 2", len(standings))
	}
	if standings[0].Incarnation != firstIncarnation || standings[1].Incarnation != secondIncarnation {
		return fmt.Errorf("the fold ordered the chain as %s then %s",
			standings[0].Incarnation, standings[1].Incarnation)
	}
	if standings[0].Standing != daemon.StandingRetired || standings[0].Cause != daemon.CauseDrained {
		return fmt.Errorf("the first incarnation folded as %s/%s, want retired/%s",
			standings[0].Standing, causeLabel(standings[0].Cause), daemon.CauseDrained)
	}
	if standings[1].Standing != daemon.StandingRetired || standings[1].Cause != daemon.CauseStopped {
		return fmt.Errorf("the second incarnation folded as %s/%s, want retired/%s",
			standings[1].Standing, causeLabel(standings[1].Cause), daemon.CauseStopped)
	}
	if standings[1].Predecessor != firstIncarnation {
		return fmt.Errorf("the second incarnation's fact names predecessor %q, want %s",
			standings[1].Predecessor, firstIncarnation)
	}

	// The chain the two starts built, walked. Total and acyclic over a history
	// the record itself produced.
	history := map[string]daemon.SubstrateIncarnation{
		firstIncarnation: {Store: storeDigest, Options: firstOptions},
		secondIncarnation: {
			Store: storeDigest, Options: firstOptions, Predecessor: firstIncarnation,
		},
	}
	walked, err := daemon.WalkChain(history, secondIncarnation)
	if err != nil {
		return fmt.Errorf("walk the incarnation chain: %w", err)
	}
	fmt.Printf("chain walk: %d steps, newest first: %v\n", len(walked), walked)
	if len(walked) != 2 || walked[0] != secondIncarnation || walked[1] != firstIncarnation {
		return fmt.Errorf("the chain walked %v", walked)
	}

	// The drain and the stop left DIFFERENT chains, and the difference is
	// readable from the facts alone.
	drained := chainFor(facts, sessionFacts, firstIncarnation)
	stopped := chainFor(facts, sessionFacts, secondIncarnation)
	fmt.Printf("drain chain: %s\n", strings.Join(drained, " -> "))
	fmt.Printf("stop chain:  %s\n", strings.Join(stopped, " -> "))
	if strings.Join(drained, "|") == strings.Join(stopped, "|") {
		return errors.New("the drain and the stop left identical chains, so the two teardowns are not distinguishable")
	}

	if err := loserRefuses(connection, binary, url, contested, storeDigest, secondIncarnation); err != nil {
		return err
	}

	fmt.Printf(
		"\nSUBSTRATE LIFECYCLE SUCCESSION: two starts over one store, the second naming the first, chain walked in %d steps, teardowns distinguishable, the loser refused\n",
		len(walked),
	)
	return nil
}

// reachable proves a reported address serves: a client outside the process
// connects there and JetStream answers on the first attempt.
func reachable(url string, what string) error {
	if url == "" {
		return fmt.Errorf("%s reported no address", what)
	}
	connection, err := nats.Connect(url, nats.Name("foldlab-lifecycle-reach"), nats.NoReconnect())
	if err != nil {
		return fmt.Errorf("%s is not reachable at the address it reported: %w", what, err)
	}
	defer connection.Close()
	info, err := jetStreamRoundTrip(connection)
	if err != nil {
		return fmt.Errorf("%s answered no JetStream round trip: %w", what, err)
	}
	fmt.Printf("%s serves at %s; JetStream answered on the first attempt: %s\n", what, url, info)
	return nil
}

// jetStreamRoundTrip takes ONE JetStream round trip with no retry and reports
// what answered.
//
// One attempt is the whole measurement. A round trip that were retried would
// report how patient the caller is rather than whether the substrate's API was
// there when the probe said it was.
func jetStreamRoundTrip(connection *nats.Conn) (string, error) {
	ctx, cancel := context.WithTimeout(context.Background(), roundTripWithin)
	defer cancel()
	js, err := jetstream.New(connection)
	if err != nil {
		return "", err
	}
	info, err := js.AccountInfo(ctx)
	if err != nil {
		return "", err
	}
	return fmt.Sprintf("streams=%d consumers=%d", info.Streams, info.Consumers), nil
}

// loserRefuses measures the fence through the shipped command.
//
// A fence is taken out of band at the round the next start would decide, so the
// loss is deterministic rather than raced; the shipped start is then run against
// it. The refusal must carry reason, law and repair, and the start must have
// bound nothing and landed nothing — both measured from outside the process,
// because "no server was started" is a claim about the world rather than about
// a return value.
func loserRefuses(
	connection *nats.Conn,
	binary string,
	url string,
	contested string,
	storeDigest string,
	head string,
) error {
	registers, err := register.Open(connection)
	if err != nil {
		return err
	}
	open, walked, err := daemon.OpenRound(registers, storeDigest, 64)
	if err != nil {
		return err
	}
	if open != head {
		return fmt.Errorf("the open round succeeds %q, want the chain head %s", open, head)
	}
	round, err := daemon.RoundKey(storeDigest, open)
	if err != nil {
		return err
	}
	if _, err := registers.Grant(round, "foldlab-lifecycle-wall-holder"); err != nil {
		return fmt.Errorf("take the fence out of band: %w", err)
	}
	fmt.Printf("\nfence held out of band at the open round after %d landed positions\n", len(walked))

	port, err := freePort()
	if err != nil {
		return err
	}
	ctx, cancel := context.WithTimeout(context.Background(), laneDeadline)
	defer cancel()
	js, err := jetstream.New(connection)
	if err != nil {
		return err
	}
	lane, err := daemon.OpenLane(ctx, js, daemon.IncarnationLane)
	if err != nil {
		return err
	}
	before, err := daemon.ReadLane(ctx, lane)
	if err != nil {
		return err
	}

	command := exec.Command(binary,
		"up", "--coordination", url, "--store", contested,
		"--name", "foldlab-lifecycle-loser", "--port", fmt.Sprint(port),
	)
	output, runErr := command.CombinedOutput()
	fmt.Printf("\n== up against a held fence\n%s", output)
	if runErr == nil {
		return errors.New("the start against a held fence succeeded, so the fence refused nothing")
	}
	text := string(output)
	for _, required := range []string{"refused:", "law:", "repair at "} {
		if !strings.Contains(text, required) {
			return fmt.Errorf("the loser's refusal carried no %q line, so it taught nothing", required)
		}
	}

	after, err := daemon.ReadLane(ctx, lane)
	if err != nil {
		return err
	}
	if len(after) != len(before) {
		return fmt.Errorf("the loser landed %d facts", len(after)-len(before))
	}
	listener, err := net.DialTimeout("tcp", fmt.Sprintf("127.0.0.1:%d", port), time.Second)
	if err == nil {
		listener.Close()
		return fmt.Errorf("the loser bound port %d", port)
	}
	fmt.Printf("loser: refused with reason, law and repair; landed 0 facts; bound nothing at port %d\n", port)
	return nil
}

func freePort() (int, error) {
	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		return 0, err
	}
	defer listener.Close()
	return listener.Addr().(*net.TCPAddr).Port, nil
}

// chainFor is the fact chain one incarnation left, across both lanes.
func chainFor(
	incarnationFacts []map[string]any,
	sessionFacts []map[string]any,
	incarnation string,
) []string {
	chain := make([]string, 0, 4)
	for _, fact := range incarnationFacts {
		if named, _ := fact["incarnation"].(string); named == incarnation {
			chain = append(chain, describe(fact))
		}
	}
	for _, fact := range sessionFacts {
		if named, _ := fact["incarnation"].(string); named == incarnation {
			chain = append(chain, describe(fact))
		}
	}
	return chain
}

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

func causeLabel(cause string) string {
	if cause == "" {
		return "none"
	}
	return cause
}

// vendorGates drives the shipped readiness probe over a server this wall
// constructed itself.
//
// The adapter exists so the control's substrate can be put into a state no
// shipped caller can reach: JetStream taken down by the pinned vendor's own
// verb, on a server whose declared value asked for it. Both reads are the
// vendor's own — the wall states the health read's option set a second time on
// purpose, so the control's side of the comparison does not inherit the
// daemon's own spelling of it.
type vendorGates struct{ server *server.Server }

func (g vendorGates) ReadyForConnections(within time.Duration) bool {
	return g.server.ReadyForConnections(within)
}

func (g vendorGates) Healthz() *server.HealthStatus {
	return g.server.Healthz(&server.HealthzOptions{JSEnabledOnly: true})
}

func runReadiness() error {
	fmt.Printf("bounds: one shipped probe over a healthy substrate, one over a real substrate whose JetStream is down; one JetStream round trip each, no retries\n")

	// The positive half: the shipped probe over the shipped acquisition.
	directory, err := os.MkdirTemp("", "foldlab-lifecycle-readiness-")
	if err != nil {
		return err
	}
	defer os.RemoveAll(directory)
	declared := daemon.DeclaredServerOptions{
		ServerName:   "foldlab-lifecycle-readiness",
		StoreDir:     directory,
		Host:         "127.0.0.1",
		Port:         -1,
		JetStream:    true,
		Listen:       true,
		NoLog:        true,
		SyncInterval: daemon.DeclaredSyncInterval,
		SyncAlways:   daemon.DeclaredSyncAlways,
	}
	instance, err := daemon.Acquire(declared)
	if err != nil {
		return err
	}
	defer func() {
		instance.Shutdown()
		instance.WaitForShutdown()
	}()
	instance.Start()
	healthy := daemon.ProbeReadiness(instance, readyWithin)
	fmt.Printf("\nshipped probe, healthy substrate: %s=%s %s=%s admitted=%t\n",
		daemon.GateReadyForConnections, healthy.Ready,
		daemon.GateHealthz, healthy.Health, healthy.Admitted())
	if !healthy.Admitted() {
		return fmt.Errorf("the shipped probe refused a healthy substrate: %s", healthy.Detail)
	}
	served, err := nats.Connect(instance.ClientURL(), nats.Name("foldlab-readiness-arm"), nats.NoReconnect())
	if err != nil {
		return err
	}
	defer served.Close()
	info, err := jetStreamRoundTrip(served)
	if err != nil {
		return fmt.Errorf(
			"the probe admitted a substrate whose JetStream did not answer on the first attempt: %w", err,
		)
	}
	fmt.Printf("JetStream round trip the instant the probe returned: %s\n", info)

	// The refutation: the same probe over a real vendor server whose JetStream
	// has been taken down by the vendor's own verb.
	unreadyDirectory, err := os.MkdirTemp("", "foldlab-lifecycle-unready-")
	if err != nil {
		return err
	}
	defer os.RemoveAll(unreadyDirectory)
	unreadyDeclared := declared
	unreadyDeclared.ServerName = "foldlab-lifecycle-unready"
	unreadyDeclared.StoreDir = unreadyDirectory
	options, err := unreadyDeclared.ServerOptions()
	if err != nil {
		return err
	}
	unready, err := server.NewServer(options)
	if err != nil {
		return err
	}
	defer func() {
		unready.Shutdown()
		unready.WaitForShutdown()
	}()
	go unready.Start()
	if !unready.ReadyForConnections(readyWithin) {
		return errors.New("the control substrate never bound its listener, so this arm measured nothing")
	}
	if err := unready.DisableJetStream(); err != nil {
		return fmt.Errorf("take JetStream down by the vendor's own verb: %w", err)
	}

	// The mutant reading: a start whose readiness signal is the bound listener,
	// which is exactly what a ports-file wait observes.
	mutant := unready.ReadyForConnections(readyWithin)
	shipped := daemon.ProbeReadinessOf(vendorGates{server: unready}, readyWithin)
	fmt.Printf("\nmutant reading (bound listener only): ready=%t\n", mutant)
	fmt.Printf("shipped probe, JetStream down: %s=%s %s=%s admitted=%t detail=%q\n",
		daemon.GateReadyForConnections, shipped.Ready,
		daemon.GateHealthz, shipped.Health, shipped.Admitted(), shipped.Detail)
	if !mutant {
		return errors.New("the mutant reading refused too, so this arm cannot distinguish the two")
	}
	if shipped.Admitted() {
		return errors.New("the shipped probe admitted a substrate whose JetStream is down, so it is a port-bind reading wearing a health read's clothes")
	}

	control, err := nats.Connect(unready.ClientURL(), nats.Name("foldlab-readiness-control"), nats.NoReconnect())
	if err != nil {
		return fmt.Errorf("the control substrate refused the connection the mutant's reading promised: %w", err)
	}
	defer control.Close()
	if answered, err := jetStreamRoundTrip(control); err == nil {
		return fmt.Errorf(
			"JetStream answered on the substrate this arm took it down on (%s), so the refutation measured nothing",
			answered,
		)
	} else {
		fmt.Printf("JetStream round trip after the mutant's reading: refused — %v\n", err)
	}

	fmt.Printf(
		"\nSUBSTRATE READINESS ARM: the shipped probe admitted a healthy substrate whose JetStream answered at once, and REFUSED a bound listener whose JetStream did not — the mutant admitted it\n",
	)
	return nil
}
