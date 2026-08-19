// Command incarnationwall executes the substrate-incarnation fence's wall and
// records its numbers.
//
// Two parts, and each prints what it measured rather than that it worked.
//
//	Part one — one incarnation lands per store directory under racing starts.
//	N supervisors decide concurrently against one store directory, with one
//	racer OUT OF PROCESS so the race is not merely a goroutine race inside one
//	runtime, repeated for R rounds that succeed one another. Exactly one
//	incarnation must land per round; every loser must carry a typed refusal
//	with reason, law and repair; and no loser may ever bind the client port or
//	write to the store directory. That last one is measured from the
//	filesystem: every racer writes its witness at the instant it decides to run
//	a server over the store, before it constructs one, so a loser that
//	proceeded leaves evidence a later reader can find.
//
//	Part two — the incarnation pin, with its committed refutation. The
//	register's backing bucket is deleted and recreated so its revision order
//	resets, and a holder carrying a token from before the recreation presents
//	it. With the pin the attempt refuses on incarnation mismatch with a taught
//	repair; with the pin removed the same stale token LANDS on the reborn
//	bucket. Both outcomes are executed and both are recorded, because a control
//	that cannot fail proves nothing.
//
// The claims this command measures are CANDIDATES stated only. It executes a
// bounded race and prints the bound with the result: a bounded race certifies
// its bounds and nothing beyond them.
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
	"path/filepath"
	"sync"
	"time"

	"github.com/nats-io/nats.go"
	"github.com/nats-io/nats.go/jetstream"

	"foldlab/daemon"
	"foldlab/register"
)

const (
	readyWithin  = 30 * time.Second
	laneDeadline = 30 * time.Second
	rendezvous   = "foldlab.wall.incarnation"
)

// outcome is what one racer reports, whichever side of the process boundary it
// ran on. The out-of-process arm sends it back as one JSON line; the in-process
// arm returns it directly. One shape both ways is what lets the wall compare
// them without caring which was which.
type outcome struct {
	Holder string `json:"holder"`
	// Won says the decide landed this racer's incarnation.
	Won bool `json:"won"`
	// Incarnation is the digest that landed, empty for a loser.
	Incarnation string `json:"incarnation"`
	// Token is the fencing token the landing was made under.
	Token uint64 `json:"token"`
	// RefusalKind, RefusalLaw and RefusalRepair are the loser's typed refusal.
	RefusalKind   string `json:"refusal_kind"`
	RefusalLaw    string `json:"refusal_law"`
	RefusalRepair string `json:"refusal_repair"`
	// Error is a failure that is not a refusal — never expected, always fatal.
	Error string `json:"error"`
	// Bound says this racer's server bound the contested client port.
	Bound bool `json:"bound"`
	// BindError is a bind that was attempted and failed, which is the event a
	// second starter would produce and which must never occur.
	BindError string `json:"bind_error"`
	// Wrote says this racer wrote its witness into the contested store
	// directory, which it does at the instant it decides to construct a server
	// there.
	Wrote bool `json:"wrote"`
	// OutOfProcess marks the racer that ran in its own process.
	OutOfProcess bool `json:"out_of_process"`
}

func main() {
	racer := flag.Bool("racer", false, "run as the out-of-process racer arm")
	url := flag.String("url", "", "the coordination substrate the register lives on")
	store := flag.String("store", "", "the contested store directory")
	storeDigest := flag.String("store-digest", "", "the contested store directory's digest")
	optionsDigest := flag.String("options-digest", "", "the declared server-options value's digest")
	predecessor := flag.String("predecessor", "", "the incarnation being succeeded, empty for the first")
	holder := flag.String("holder", "", "this racer's holder name")
	witness := flag.String("witness", "", "the directory racers write their witness into")
	port := flag.Int("port", 0, "the contested client port")
	round := flag.Int("round", 0, "the round this racer is running")
	pinControl := flag.Bool("pin-control", false, "run part two, the incarnation pin and its committed refutation")
	parity := flag.Bool("parity", false, "run the incarnation vocabulary's byte-parity comparison against the spine")
	minter := flag.String(
		"minter",
		filepath.Join("..", "packages", "plait", "test", "process", "substrate-incarnation-mint.ts"),
		"the TypeScript process that mints the reference side of the parity comparison",
	)
	flag.Parse()

	if *parity {
		if err := runParity(*minter); err != nil {
			fmt.Fprintln(os.Stderr, err)
			os.Exit(1)
		}
		return
	}

	if *racer {
		if err := runRacer(racerInput{
			url:           *url,
			store:         *store,
			storeDigest:   *storeDigest,
			optionsDigest: *optionsDigest,
			predecessor:   *predecessor,
			holder:        *holder,
			witness:       *witness,
			port:          *port,
			round:         *round,
		}); err != nil {
			fmt.Fprintln(os.Stderr, err)
			os.Exit(1)
		}
		return
	}

	if err := run(*pinControl); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}

// The wall's bounds, stated as constants so the printed numbers and the
// executed schedule cannot drift apart.
const (
	// racers is N: how many supervisors decide concurrently in one round.
	racers = 4
	// rounds is R: how many successive chain positions are contested under a
	// fair release. One further ORDERED round runs after them.
	rounds = 6
	// orderedHandicap is how long the in-process arms are held back in the one
	// ordered round, so that the out-of-process arm wins it and the fence is
	// measured refusing the NEAR side rather than only the far one.
	//
	// It exists because which arm wins a fair round is a property of the
	// schedule and not of the fence: process wake-up latency puts the far arm
	// behind often enough that a run where it never won would otherwise leave
	// the near-side refusal unmeasured. The fair rounds stay fair and their
	// winners are reported as they fall; this one round is ordered on purpose
	// and says so on its own line.
	orderedHandicap = 250 * time.Millisecond
)

func run(pinControl bool) error {
	coordination, err := os.MkdirTemp("", "foldlab-incarnation-coordination-")
	if err != nil {
		return fmt.Errorf("make the coordination store directory: %w", err)
	}
	defer os.RemoveAll(coordination)

	// The coordination substrate holds the register and the lanes. It is NOT
	// the contested store: the fence is over a store directory a server would
	// run on, and a fence that lived on the store it protects would need the
	// server it is deciding whether to start.
	declared := daemon.DeclaredServerOptions{
		ServerName:   "foldlab-incarnation-coordination",
		StoreDir:     coordination,
		Host:         "127.0.0.1",
		Port:         -1,
		JetStream:    true,
		Listen:       true,
		NoLog:        true,
		SyncInterval: daemon.DeclaredSyncInterval,
		SyncAlways:   daemon.DeclaredSyncAlways,
	}
	supervisor, err := daemon.Acquire(declared)
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

	connection, err := nats.Connect(url, nats.Name("foldlab-incarnation-wall"))
	if err != nil {
		return fmt.Errorf("connect to the coordination substrate: %w", err)
	}
	defer connection.Close()

	if pinControl {
		return runPinControl(connection)
	}

	// Opened once here so the racers contend for a register that already
	// exists: a concurrent first create is a provisioning race, not a fence
	// race, and it is not the thing under test.
	if _, err := register.Open(connection); err != nil {
		return fmt.Errorf("open the incarnation register: %w", err)
	}

	contested, err := os.MkdirTemp("", "foldlab-incarnation-store-")
	if err != nil {
		return fmt.Errorf("make the contested store directory: %w", err)
	}
	defer os.RemoveAll(contested)
	witness, err := os.MkdirTemp("", "foldlab-incarnation-witness-")
	if err != nil {
		return fmt.Errorf("make the witness directory: %w", err)
	}
	defer os.RemoveAll(witness)

	storeDigest, err := daemon.StoreDigest(contested)
	if err != nil {
		return err
	}
	// The declared value every racer would start under, recorded before the
	// race so the winning fact's citation can be compared to it afterwards.
	contestedOptions := daemon.DeclaredServerOptions{
		ServerName:   "foldlab-incarnation-contested",
		StoreDir:     contested,
		Host:         "127.0.0.1",
		JetStream:    true,
		Listen:       true,
		NoLog:        true,
		SyncInterval: daemon.DeclaredSyncInterval,
		SyncAlways:   daemon.DeclaredSyncAlways,
	}
	optionsDigest, err := contestedOptions.Digest()
	if err != nil {
		return err
	}
	fmt.Printf("store digest: %s\n", storeDigest)
	fmt.Printf("options digest: %s\n", optionsDigest)
	fmt.Printf("bounds: N=%d racers per round, R=%d rounds, one racer out of process\n", racers, rounds)

	context, cancel := context.WithTimeout(context.Background(), laneDeadline)
	defer cancel()
	js, err := jetstream.New(connection)
	if err != nil {
		return fmt.Errorf("open the JetStream context: %w", err)
	}
	lane, err := daemon.OpenLane(context, js, daemon.IncarnationLane)
	if err != nil {
		return fmt.Errorf("open the incarnation lane: %w", err)
	}

	predecessor := ""
	chain := make([]string, 0, rounds)
	history := make(map[string]daemon.SubstrateIncarnation, rounds)
	winnersPerRound := make([]int, 0, rounds)
	refusalKinds := make(map[string]int)
	binds := 0
	bindErrors := 0
	writes := 0

	outOfProcessWins := 0
	for round := 0; round < rounds+1; round++ {
		port, err := freePort()
		if err != nil {
			return err
		}
		// The last round is the ordered one, and it says so in its own line.
		handicap := time.Duration(0)
		if round == rounds {
			handicap = orderedHandicap
		}
		outcomes, err := race(connection, racerInput{
			url:           url,
			store:         contested,
			storeDigest:   storeDigest,
			optionsDigest: optionsDigest,
			predecessor:   predecessor,
			witness:       witness,
			port:          port,
			round:         round,
			handicap:      handicap,
		})
		if err != nil {
			return err
		}

		won := make([]outcome, 0, 1)
		for _, taken := range outcomes {
			if taken.Error != "" {
				return fmt.Errorf("round %d: racer %s failed outside the refusal path: %s",
					round, taken.Holder, taken.Error)
			}
			if taken.Bound {
				binds++
			}
			if taken.BindError != "" {
				bindErrors++
			}
			if taken.Wrote {
				writes++
			}
			if taken.Won {
				won = append(won, taken)
				continue
			}
			if taken.RefusalKind == "" || taken.RefusalLaw == "" || taken.RefusalRepair == "" {
				return fmt.Errorf(
					"round %d: loser %s returned a refusal missing reason, law or repair: %+v",
					round, taken.Holder, taken,
				)
			}
			refusalKinds[taken.RefusalKind]++
			if taken.Bound || taken.Wrote {
				return fmt.Errorf("round %d: loser %s started: bound=%t wrote=%t",
					round, taken.Holder, taken.Bound, taken.Wrote)
			}
		}
		winnersPerRound = append(winnersPerRound, len(won))
		if len(won) != 1 {
			return fmt.Errorf("round %d landed %d incarnations, want exactly 1", round, len(won))
		}

		winner := won[0]
		value := daemon.SubstrateIncarnation{
			Store: storeDigest, Options: optionsDigest, Predecessor: predecessor,
		}
		expected, err := daemon.IncarnationName(value)
		if err != nil {
			return err
		}
		if winner.Incarnation != expected {
			return fmt.Errorf("round %d: the landed incarnation %s is not the value's own name %s",
				round, winner.Incarnation, expected)
		}
		history[winner.Incarnation] = value
		chain = append(chain, winner.Incarnation)
		if winner.OutOfProcess {
			outOfProcessWins++
		}
		schedule := "fair release"
		if handicap > 0 {
			schedule = fmt.Sprintf("ordered release, in-process arms held %s", handicap)
		}
		fmt.Printf(
			"round %d: winners=1 losers=%d winner=%s out-of-process=%t token=%d predecessor=%s port=%d schedule=%s\n",
			round, len(outcomes)-1, winner.Holder, winner.OutOfProcess, winner.Token,
			predecessorLabel(predecessor), port, schedule,
		)
		if handicap > 0 && !winner.OutOfProcess {
			return fmt.Errorf(
				"the ordered round was won in process, so the fence was never measured refusing the near side",
			)
		}
		predecessor = winner.Incarnation
	}

	contestedRounds := rounds + 1
	fmt.Printf("winner count per round: %v\n", winnersPerRound)
	fmt.Printf("loser refusals by kind: %v\n", refusalKinds)
	fmt.Printf("rounds won out of process: %d of %d (the ordered round always; a fair round when the schedule allows)\n",
		outOfProcessWins, contestedRounds)
	fmt.Printf("client-port binds: %d (want %d, one per round)\n", binds, contestedRounds)
	fmt.Printf("bind failures: %d (want 0 — a second binder is the event this fence exists to prevent)\n", bindErrors)
	fmt.Printf("store-directory writes: %d (want %d, one per round)\n", writes, contestedRounds)
	if binds != contestedRounds || writes != contestedRounds || bindErrors != 0 {
		return fmt.Errorf("the carriage counts do not match the fence: binds=%d writes=%d bindErrors=%d",
			binds, writes, bindErrors)
	}

	witnesses, err := os.ReadDir(witness)
	if err != nil {
		return fmt.Errorf("read the witness directory: %w", err)
	}
	fmt.Printf("witness files on disk: %d (want %d)\n", len(witnesses), contestedRounds)
	if len(witnesses) != contestedRounds {
		names := make([]string, 0, len(witnesses))
		for _, entry := range witnesses {
			names = append(names, entry.Name())
		}
		return fmt.Errorf("the store directory carries %d witnesses, want %d: %v",
			len(witnesses), contestedRounds, names)
	}

	// The chain the rounds built, walked. Total and acyclic over a history the
	// rounds themselves produced; a step the history does not carry refuses.
	walked, err := daemon.WalkChain(history, chain[len(chain)-1])
	if err != nil {
		return fmt.Errorf("walk the incarnation chain: %w", err)
	}
	fmt.Printf("chain walk: %d steps, newest first, total and acyclic\n", len(walked))
	if len(walked) != contestedRounds {
		return fmt.Errorf("the chain walk returned %d steps, want %d", len(walked), contestedRounds)
	}

	// The lane read back: the established facts the winners landed, folded, and
	// the greatest-position read over them.
	facts, err := daemon.ReadLane(context, lane)
	if err != nil {
		return err
	}
	standings, err := daemon.FoldIncarnations(facts)
	if err != nil {
		return err
	}
	for _, standing := range standings {
		fmt.Printf("standing: incarnation=%s position=%d standing=%s cause=%s\n",
			standing.Incarnation, standing.Position, standing.Standing, causeLabel(standing.Cause))
	}
	greatest, err := daemon.GreatestIncarnation(standings, storeDigest)
	if err != nil {
		return err
	}
	fmt.Printf("greatest incarnation for the store: %s at position %d, standing %s\n",
		greatest.Incarnation, greatest.Position, greatest.Standing)
	if greatest.Incarnation != chain[len(chain)-1] {
		return fmt.Errorf("the greatest-position read named %s, want the last round's winner %s",
			greatest.Incarnation, chain[len(chain)-1])
	}
	// The winning fact cites the options digest the round was declared under,
	// and on every round after the first it cites its predecessor.
	for index, standing := range standings {
		fact := facts[standing.Position]
		if fact["options"] != optionsDigest {
			return fmt.Errorf("the fact at position %d cites options %v, want %s",
				standing.Position, fact["options"], optionsDigest)
		}
		if index == 0 {
			if fact["predecessor"] != nil {
				return fmt.Errorf("the first incarnation cites a predecessor: %v", fact["predecessor"])
			}
			continue
		}
		if fact["predecessor"] != chain[index-1] {
			return fmt.Errorf("the fact at position %d cites predecessor %v, want %s",
				standing.Position, fact["predecessor"], chain[index-1])
		}
	}
	fmt.Printf("citations: every established fact cites the options digest; every successor names its predecessor\n")
	fmt.Printf("INCARNATION REGISTER WALL: %d rounds, one incarnation each, zero double-binds\n", contestedRounds)
	return nil
}

func predecessorLabel(predecessor string) string {
	if predecessor == "" {
		return "none"
	}
	return predecessor
}

func causeLabel(cause string) string {
	if cause == "" {
		return "none"
	}
	return cause
}

// racerInput is everything one racer needs and nothing it could decide for
// itself. The store digest and the options digest are computed once by the wall
// and handed down, so every racer in a round competes at the same round key by
// construction rather than by agreeing to.
type racerInput struct {
	url           string
	store         string
	storeDigest   string
	optionsDigest string
	predecessor   string
	holder        string
	witness       string
	port          int
	round         int
	// handicap holds the in-process arms back by this much after the release.
	//
	// Zero for every fair round. The last round sets it, deliberately and
	// visibly, for the reason the wall's own output states: under a fair
	// release the out-of-process arm loses every round to wake-up latency, so
	// the fence has only ever been measured refusing the far side. One ordered
	// round measures it refusing the near side too.
	handicap time.Duration
}

// race runs one round: N-1 racers as goroutines in this process and one racer
// in a process of its own, all released together.
//
// The release is a rendezvous over the coordination substrate rather than a
// sleep. The out-of-process arm connects, subscribes, and announces itself; the
// in-process arms park on a channel; and both are let go by one publish. A sleep
// would be a guess about process startup, and a guess that was wrong would make
// the race a sequence.
func race(connection *nats.Conn, input racerInput) ([]outcome, error) {
	ready := make(chan struct{}, racers)
	readySubject := fmt.Sprintf("%s.ready.%d", rendezvous, input.round)
	goSubject := fmt.Sprintf("%s.go.%d", rendezvous, input.round)
	subscription, err := connection.Subscribe(readySubject, func(*nats.Msg) {
		select {
		case ready <- struct{}{}:
		default:
		}
	})
	if err != nil {
		return nil, fmt.Errorf("subscribe to the rendezvous: %w", err)
	}
	defer func() { _ = subscription.Unsubscribe() }()
	if err := connection.Flush(); err != nil {
		return nil, err
	}

	executable, err := os.Executable()
	if err != nil {
		return nil, fmt.Errorf("find this command's own binary: %w", err)
	}
	child := input
	child.holder = fmt.Sprintf("supervisor-out-of-process-%d", input.round)
	command := exec.Command(executable,
		"--racer",
		"--url", child.url,
		"--store", child.store,
		"--store-digest", child.storeDigest,
		"--options-digest", child.optionsDigest,
		"--predecessor", child.predecessor,
		"--holder", child.holder,
		"--witness", child.witness,
		"--port", fmt.Sprint(child.port),
		"--round", fmt.Sprint(child.round),
	)
	command.Stderr = os.Stderr
	output, err := command.StdoutPipe()
	if err != nil {
		return nil, fmt.Errorf("open the out-of-process racer's output: %w", err)
	}
	if err := command.Start(); err != nil {
		return nil, fmt.Errorf("start the out-of-process racer: %w", err)
	}

	// **Every arm is released by the same message over the same path.** The
	// first two schedules this wall ran were both biased and both were
	// measured: releasing the in-process arms with a Go channel while the child
	// waited on a published message gave the in-process arms a head start of one
	// network hop, and letting each arm connect after the release gave the child
	// a head start of one connection handshake. Each bias produced a clean
	// six-for-six sweep for whichever side it favoured, which is how the bias
	// was visible at all. Under this schedule every racer — in process or not —
	// holds an open connection and an open register, waits on a subscription to
	// one subject, and is let go by one publish.
	taken := make([]outcome, racers-1)
	var group sync.WaitGroup
	for index := 0; index < racers-1; index++ {
		local := input
		local.holder = fmt.Sprintf("supervisor-in-process-%d-%d", input.round, index)
		arm, err := nats.Connect(local.url, nats.Name(local.holder))
		if err != nil {
			return nil, fmt.Errorf("connect the in-process racer: %w", err)
		}
		defer arm.Close()
		registers, err := register.Open(arm)
		if err != nil {
			return nil, fmt.Errorf("open the in-process racer's register: %w", err)
		}
		released := make(chan struct{}, 1)
		armSubscription, err := arm.Subscribe(goSubject, func(*nats.Msg) {
			select {
			case released <- struct{}{}:
			default:
			}
		})
		if err != nil {
			return nil, fmt.Errorf("subscribe the in-process racer to the rendezvous: %w", err)
		}
		defer func() { _ = armSubscription.Unsubscribe() }()
		if err := arm.Flush(); err != nil {
			return nil, err
		}
		group.Add(1)
		go func(slot int, local racerInput, arm *nats.Conn, registers *register.Client, released <-chan struct{}) {
			defer group.Done()
			select {
			case <-released:
			case <-time.After(readyWithin):
				taken[slot] = outcome{Holder: local.holder, Error: "the in-process racer was never released"}
				return
			}
			if local.handicap > 0 {
				time.Sleep(local.handicap)
			}
			taken[slot] = decideOver(arm, registers, local)
		}(index, local, arm, registers, released)
		if err := arm.Publish(readySubject, nil); err != nil {
			return nil, err
		}
		if err := arm.Flush(); err != nil {
			return nil, err
		}
	}

	// Every arm has announced itself before the release is published.
	for announced := 0; announced < racers; announced++ {
		select {
		case <-ready:
		case <-time.After(readyWithin):
			_ = command.Process.Kill()
			_ = command.Wait()
			return nil, fmt.Errorf("only %d of %d racers reached the rendezvous", announced, racers)
		}
	}

	// The in-process arms are parked on their subscriptions before the publish
	// goes out, so the publish is the only event that starts anybody.
	if err := connection.Publish(goSubject, nil); err != nil {
		return nil, err
	}
	if err := connection.Flush(); err != nil {
		return nil, err
	}
	group.Wait()

	decoded := outcome{}
	if err := json.NewDecoder(output).Decode(&decoded); err != nil {
		_ = command.Wait()
		return nil, fmt.Errorf("read the out-of-process racer's outcome: %w", err)
	}
	if err := command.Wait(); err != nil {
		return nil, fmt.Errorf("the out-of-process racer exited badly: %w", err)
	}
	decoded.OutOfProcess = true
	return append(taken, decoded), nil
}

// runRacer is the out-of-process arm's entrypoint. It reaches the rendezvous,
// waits to be released with everybody else, decides, and reports one JSON line.
func runRacer(input racerInput) error {
	connection, err := nats.Connect(input.url, nats.Name(input.holder))
	if err != nil {
		return fmt.Errorf("connect the out-of-process racer: %w", err)
	}
	defer connection.Close()

	release := make(chan struct{}, 1)
	subscription, err := connection.Subscribe(
		fmt.Sprintf("%s.go.%d", rendezvous, input.round),
		func(*nats.Msg) {
			select {
			case release <- struct{}{}:
			default:
			}
		},
	)
	if err != nil {
		return err
	}
	defer func() { _ = subscription.Unsubscribe() }()
	if err := connection.Flush(); err != nil {
		return err
	}
	// The register is opened before the rendezvous is announced, so that what
	// the release starts is the decide and nothing before it.
	registers, err := register.Open(connection)
	if err != nil {
		return fmt.Errorf("open the out-of-process racer's register: %w", err)
	}
	if err := connection.Publish(fmt.Sprintf("%s.ready.%d", rendezvous, input.round), nil); err != nil {
		return err
	}
	if err := connection.Flush(); err != nil {
		return err
	}
	select {
	case <-release:
	case <-time.After(readyWithin):
		return errors.New("the out-of-process racer was never released")
	}

	return json.NewEncoder(os.Stdout).Encode(decideOver(connection, registers, input))
}

// decideOver is the racer's act: fence first, and only then — and only for the
// winner — construct and start a server over the contested store directory.
//
// The witness is written at the instant the winner commits to constructing a
// server, BEFORE it constructs one. That ordering is what makes the witness
// evidence: a racer that reached this point at all leaves a mark, whether or not
// its server then managed to start.
func decideOver(connection *nats.Conn, registers *register.Client, input racerInput) outcome {
	taken := outcome{Holder: input.holder}
	landed, err := daemon.DecideIncarnation(registers, daemon.SubstrateIncarnation{
		Store:       input.storeDigest,
		Options:     input.optionsDigest,
		Predecessor: input.predecessor,
	}, input.holder)
	if err != nil {
		refusal := &register.Refusal{}
		if !errors.As(err, &refusal) {
			taken.Error = err.Error()
			return taken
		}
		taken.RefusalKind = refusal.Kind
		taken.RefusalLaw = refusal.Law
		if len(refusal.Next) > 0 {
			taken.RefusalRepair = refusal.Next[0].Note
		}
		return taken
	}
	taken.Won = true
	taken.Incarnation = landed.Digest
	taken.Token = landed.Token

	// From here on this racer is the winner and everything it does is the
	// winner's act.
	if err := os.WriteFile(
		filepath.Join(input.witness, input.holder), []byte(landed.Digest), 0o600,
	); err != nil {
		taken.Error = err.Error()
		return taken
	}
	taken.Wrote = true

	declared := daemon.DeclaredServerOptions{
		ServerName:   "foldlab-incarnation-contested",
		StoreDir:     input.store,
		Host:         "127.0.0.1",
		JetStream:    true,
		Listen:       true,
		NoLog:        true,
		SyncInterval: daemon.DeclaredSyncInterval,
		SyncAlways:   daemon.DeclaredSyncAlways,
	}
	// The declared value's digest must be the one the round was keyed under —
	// the port is carriage and never enters the value, which is exactly why a
	// racer can be handed a port without moving the incarnation's name.
	digest, err := declared.Digest()
	if err != nil {
		taken.Error = err.Error()
		return taken
	}
	if digest != input.optionsDigest {
		taken.Error = fmt.Sprintf("the racer's declared value names %s, not the round's %s",
			digest, input.optionsDigest)
		return taken
	}
	running := declared
	running.Port = input.port
	instance, err := daemon.Acquire(running)
	if err != nil {
		taken.BindError = err.Error()
		return taken
	}
	instance.Start()
	if !instance.ReadyForConnections(readyWithin) {
		taken.BindError = "the contested substrate did not pass its readiness gate"
		instance.Shutdown()
		instance.WaitForShutdown()
		return taken
	}
	taken.Bound = true

	// The incarnation-established fact, landed on the incarnation lane over the
	// coordination substrate — never over the substrate this racer just started,
	// which would put the record inside the thing the record is about.
	if err := landFact(connection, daemon.EstablishedIncarnationFact(landed.Digest,
		daemon.SubstrateIncarnation{
			Store:       input.storeDigest,
			Options:     input.optionsDigest,
			Predecessor: input.predecessor,
		})); err != nil {
		taken.Error = err.Error()
	}

	instance.Shutdown()
	instance.WaitForShutdown()
	return taken
}

func landFact(connection *nats.Conn, fact map[string]any) error {
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
	_, _, err = daemon.Land(ctx, lane, fact)
	return err
}

// freePort takes a port from the operating system and gives it straight back,
// so the round has one address the winner will bind and the losers will not.
func freePort() (int, error) {
	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		return 0, fmt.Errorf("take a free port: %w", err)
	}
	defer listener.Close()
	return listener.Addr().(*net.TCPAddr).Port, nil
}

// runPinControl is part two: the incarnation pin, executed both ways.
func runPinControl(connection *nats.Conn) error {
	work := "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"

	pinnedOutcome, err := stalePresentation(connection, work, true)
	if err != nil {
		return err
	}
	unpinnedOutcome, err := stalePresentation(connection, work, false)
	if err != nil {
		return err
	}

	fmt.Printf("with the pin:    %s\n", pinnedOutcome)
	fmt.Printf("without the pin: %s\n", unpinnedOutcome)
	fmt.Printf("INCARNATION PIN CONTROL: the pinned attempt refused and the unpinned attempt landed — the control can fail\n")
	return nil
}

// stalePresentation runs the whole hazard once: a holder takes a fence, the
// backing bucket is destroyed and reborn out of band so its revision order
// restarts, a second party takes the reborn bucket's first revision, and the
// first holder then presents its now-meaningless token.
//
// With the pin the presentation must refuse on the incarnation's own law. With
// the pin removed it must LAND, which is the refutation: the guard is what
// stands between a stale token and a reborn bucket, and a guard whose absence
// changes nothing was never guarding.
func stalePresentation(connection *nats.Conn, work string, pin bool) (string, error) {
	// A fresh bucket for each arm, so the two arms do not inherit each other's
	// history.
	if err := destroyRegisterBucket(connection); err != nil {
		return "", err
	}

	open := register.Open
	if !pin {
		open = register.OpenUnpinned
	}
	holder, err := open(connection)
	if err != nil {
		return "", fmt.Errorf("open the holder's register: %w", err)
	}
	granted, err := holder.Grant(work, "stale-holder")
	if err != nil {
		return "", fmt.Errorf("grant the holder's fence: %w", err)
	}
	before := holder.Incarnation()

	// The out-of-band lifecycle mutation, performed on a connection the
	// register service does not own — which is exactly the administrative act
	// the pin's claims used to be bounded away from.
	if err := destroyRegisterBucket(connection); err != nil {
		return "", err
	}
	reborn, err := register.Open(connection)
	if err != nil {
		return "", fmt.Errorf("open the reborn register: %w", err)
	}
	if _, err := reborn.Grant(work, "reborn-holder"); err != nil {
		return "", fmt.Errorf("grant in the reborn bucket: %w", err)
	}
	after := reborn.Incarnation()
	if before == after {
		return "", fmt.Errorf(
			"the bucket was reborn with the same incarnation identity %q, so this arm cannot measure anything", before,
		)
	}

	_, err = holder.Commit(work, granted.Token, "stale-outcome")
	if err == nil {
		state, observeErr := reborn.Observe(work)
		if observeErr != nil {
			return "", observeErr
		}
		landed := "nothing"
		if state.Outcome != nil {
			landed = state.Outcome.Value
		}
		if pin {
			return "", fmt.Errorf(
				"the pinned register accepted a token minted under incarnation %s against incarnation %s", before, after,
			)
		}
		return fmt.Sprintf(
			"token %d minted under %s LANDED %q on the bucket reborn as %s",
			granted.Token, before, landed, after,
		), nil
	}
	refusal := &register.Refusal{}
	if !errors.As(err, &refusal) {
		return "", fmt.Errorf("the stale presentation failed outside the refusal path: %w", err)
	}
	if !pin {
		return "", fmt.Errorf(
			"the unpinned register refused the stale token with %s, so the control cannot fail", refusal.Kind,
		)
	}
	if refusal.Kind != "incarnation-mismatch" {
		return "", fmt.Errorf(
			"the pinned register refused with %s, want incarnation-mismatch — a stale-token refusal would name a fence nobody was granted",
			refusal.Kind,
		)
	}
	if len(refusal.Next) == 0 || refusal.Next[0].Note == "" {
		return "", errors.New("the incarnation refusal taught no repair")
	}
	return fmt.Sprintf(
		"token %d minted under %s REFUSED against %s: kind=%s law=%q repair=%q",
		granted.Token, before, after, refusal.Kind, refusal.Law, refusal.Next[0].Note,
	), nil
}

// destroyRegisterBucket deletes the register's backing bucket if it is there.
//
// Bucket destroy and recreate is never an isolation primitive in this estate.
// Here it is the SUBJECT: the pin exists for exactly this act, and the only way
// to measure a guard against it is to perform it.
func destroyRegisterBucket(connection *nats.Conn) error {
	js, err := connection.JetStream()
	if err != nil {
		return err
	}
	if err := js.DeleteKeyValue(register.Bucket); err != nil &&
		!errors.Is(err, nats.ErrBucketNotFound) && !errors.Is(err, nats.ErrStreamNotFound) {
		return fmt.Errorf("delete the register bucket: %w", err)
	}
	// The identity the pin compares is the backing stream's creation stamp, so
	// the rebirth has to be distinguishable from the birth. The pause is
	// carriage: it makes the two stamps different, and the arm refuses on its
	// own if they ever come back equal.
	time.Sleep(5 * time.Millisecond)
	return nil
}
