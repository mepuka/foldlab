// Command daemonwall executes the daemon's carriage-invariance differential
// and records its numbers.
//
// The claim under test is stated as a CANDIDATE and this command does not
// prove it: it executes a runtime differential at a bound, and the bound is
// printed with the result. The claim is that one connection's substrate-session
// fact is invariant under the carriage that mints it — a party folding the
// substrate's own greeting and a party folding the server options plus the
// connection's registration produce the same bytes, hence one digest.
//
// Two arms and one control:
//
//   - arm A, one language, two carriages: the daemon's own connection is
//     folded once from the options value plus its registration with no
//     greeting involved, and once from the greeting that same connection
//     received.
//   - arm B, two languages, two carriages: a TypeScript spine connection is
//     opened to the daemon's client URL and folds itself from its greeting;
//     the daemon folds the same connection from options plus registration.
//   - the control: arm B repeated with exactly one field mutated in exactly
//     one group. The comparison MUST fail, and the run passes only when it
//     does.
//
// Every byte string, digest, and lane position it measures is printed, because
// a differential whose numbers are not recorded is a claim rather than
// evidence.
package main

import (
	"bufio"
	"context"
	"errors"
	"flag"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"time"

	"github.com/nats-io/nats.go/jetstream"

	"foldlab/canonical"
	"foldlab/daemon"
	"foldlab/journal"
)

const (
	readyWithin  = 30 * time.Second
	laneDeadline = 30 * time.Second
	clientZero   = "foldlab-daemon"
)

func main() {
	minter := flag.String(
		"minter",
		filepath.Join("..", "packages", "plait", "test", "process", "substrate-daemon-mint.ts"),
		"the TypeScript process that mints the far side of arm B",
	)
	layer := flag.String("layer", "foldlab-plait", "the service layer arm B's connection opens as")
	control := flag.Bool(
		"control",
		false,
		"run the committed negative control: arm B with one mutated group field, which must fail",
	)
	flag.Parse()

	if err := run(*minter, *layer, *control); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}

func run(minter string, layer string, control bool) error {
	store, err := os.MkdirTemp("", "foldlab-daemon-cl1-")
	if err != nil {
		return fmt.Errorf("make the scratch store directory: %w", err)
	}
	defer os.RemoveAll(store)

	// The greatest-position read, exercised rather than asserted: two declared
	// values are presented and the one at the greater position is what the
	// incarnation runs under. The lower-positioned value differs in a field the
	// run would notice, so a read that took the wrong one would not merely be
	// unproven — it would fail.
	declared, err := daemon.GreatestDeclaredOptions([]daemon.PositionedOptions{
		{Position: 1, Declared: daemon.DeclaredServerOptions{
			ServerName:   "foldlab-daemon-superseded",
			StoreDir:     filepath.Join(store, "superseded"),
			Listen:       false,
			NoLog:        true,
			SyncInterval: daemon.DeclaredSyncInterval,
			SyncAlways:   daemon.DeclaredSyncAlways,
		}},
		{Position: 2, Declared: daemon.DeclaredServerOptions{
			ServerName: "foldlab-daemon-cl1",
			StoreDir:   store,
			Host:       "127.0.0.1",
			Port:       -1,
			JetStream:  true,
			Listen:     true,
			// This wall is a hermetic battery site and keeps its own log
			// suppression: its stdout is its evidence, and the substrate's
			// account of itself is not part of that evidence.
			NoLog:        true,
			SyncInterval: daemon.DeclaredSyncInterval,
			SyncAlways:   daemon.DeclaredSyncAlways,
		}},
	})
	if err != nil {
		return fmt.Errorf("read the greatest declared server-options value: %w", err)
	}

	instance, err := daemon.Acquire(declared)
	if err != nil {
		return err
	}
	defer func() {
		instance.Shutdown()
		instance.WaitForShutdown()
	}()
	fmt.Printf("options digest: %s\n", instance.OptionsDigest())
	optionBytes, err := declared.Bytes()
	if err != nil {
		return err
	}
	fmt.Printf("options bytes: %s\n", optionBytes)

	instance.Start()
	ready := instance.ReadyForConnections(readyWithin)
	readyOutcome := daemon.OutcomeUnready
	if ready {
		readyOutcome = daemon.OutcomeReady
	}
	if !ready {
		return errors.New("the substrate did not pass its readiness gate")
	}
	health := instance.Healthz()
	fmt.Printf(
		"readiness gate: %s=%s health=%s liveness=%t\n",
		daemon.GateReadyForConnections, readyOutcome, health.Status, instance.Running(),
	)
	if health.Status != "ok" {
		return fmt.Errorf("the in-process health read reported %q: %s", health.Status, health.Error)
	}

	zero, err := instance.ConnectClientZero(clientZero)
	if err != nil {
		return err
	}
	defer zero.Conn.Close()
	fmt.Printf("client zero: url=%s cid=%d\n", instance.ClientURL(), zero.CID)

	ctx, cancel := context.WithTimeout(context.Background(), laneDeadline)
	defer cancel()
	js, err := jetstream.New(zero.Conn)
	if err != nil {
		return fmt.Errorf("open the JetStream context: %w", err)
	}
	incarnation, err := daemon.OpenLane(ctx, js, daemon.IncarnationLane)
	if err != nil {
		return fmt.Errorf("open the incarnation lane: %w", err)
	}
	sessions, err := daemon.OpenLane(ctx, js, daemon.SessionLane)
	if err != nil {
		return fmt.Errorf("open the session lane: %w", err)
	}

	// The observations land in the order they were observed, each carrying the
	// position it landed at. Neither says anything about the future.
	for _, observation := range []struct{ gate, outcome string }{
		{daemon.GateReadyForConnections, readyOutcome},
		{daemon.GateHealthz, health.Status},
	} {
		landed, err := daemon.Observe(
			ctx, incarnation, instance.OptionsDigest(), observation.gate, observation.outcome,
		)
		if err != nil {
			return err
		}
		fmt.Printf(
			"readiness observation: gate=%s outcome=%s position=%d digest=%s\n",
			landed.Gate, landed.Outcome, landed.Position, landed.Digest,
		)
	}

	if control {
		return runControl(instance, minter, layer)
	}
	if err := armA(ctx, instance, zero, sessions); err != nil {
		return err
	}
	return armB(ctx, instance, minter, layer, sessions)
}

// armA folds the daemon's own connection twice, from two carriages, in one
// language, and compares the bytes.
func armA(
	ctx context.Context,
	instance *daemon.Daemon,
	zero *daemon.ClientZero,
	sessions *journal.Journal,
) error {
	registration, err := instance.Registration(zero.CID)
	if err != nil {
		return err
	}
	fromOptions, err := instance.SubstrateFromRegistration(registration)
	if err != nil {
		return fmt.Errorf("fold arm A from options and registration: %w", err)
	}
	fromGreeting, err := daemon.SubstrateDeclarationOf(zero.Greeting)
	if err != nil {
		return fmt.Errorf("fold arm A from the greeting: %w", err)
	}

	options := daemon.ClientZeroConnectOptions(zero.Name)
	optionsBytes, err := canonical.CanonicalizeValue(options)
	if err != nil {
		return err
	}
	optionsDigest := canonical.DigestHex(optionsBytes)
	// The daemon's own layer has no row in the estate's writ table, so its writ
	// is null: honestly undeclared, and a different fact from the least writ.
	estate := daemon.EstateDeclaration(nil, zero.Name, nil)

	carriages := map[string]map[string]any{
		"options+registration": daemon.SessionValue(fromOptions, optionsDigest, estate),
		"greeting":             daemon.SessionValue(fromGreeting, optionsDigest, estate),
	}
	measured := make(map[string]measurement, len(carriages))
	for name, session := range carriages {
		taken, err := measure(session)
		if err != nil {
			return err
		}
		measured[name] = taken
		fmt.Printf("arm A %s bytes: %s\n", name, taken.bytes)
		fmt.Printf("arm A %s digest: %s\n", name, taken.digest)
	}
	left, right := measured["options+registration"], measured["greeting"]
	if left.bytes != right.bytes {
		return fmt.Errorf(
			"arm A: the two carriages folded different bytes\n  options+registration: %s\n  greeting:            %s",
			left.bytes, right.bytes,
		)
	}
	if left.digest != right.digest {
		return fmt.Errorf("arm A: the two carriages named different sessions")
	}
	fmt.Printf("arm A: EQUAL bytes and digest over %d group-one rows\n", len(daemon.SubstrateFields))

	roster, err := daemon.RosterDigest(daemon.SubstrateRoster)
	if err != nil {
		return err
	}
	position, factDigest, err := daemon.Land(
		ctx, sessions, daemon.EstablishedFact(left.digest, optionsDigest, roster, nil),
	)
	if err != nil {
		return err
	}
	fmt.Printf(
		"client zero session fact: session=%s position=%d digest=%s\n",
		left.digest, position, factDigest,
	)
	return nil
}

// armB folds one TypeScript connection from its own greeting on that side and
// from the options value plus the registration on this one, and compares the
// bytes across the language boundary.
func armB(
	ctx context.Context,
	instance *daemon.Daemon,
	minter string,
	layer string,
	sessions *journal.Journal,
) error {
	far, release, err := mint(instance.ClientURL(), minter, layer)
	if err != nil {
		return err
	}
	defer release()

	near, err := foldFar(instance, far, nil)
	if err != nil {
		return err
	}
	farBytes, _ := far["bytes"].(string)
	farDigest, _ := far["digest"].(string)
	farOptions, _ := far["options_digest"].(string)

	fmt.Printf("arm B far (TypeScript, greeting) bytes: %s\n", decodeHex(farBytes))
	fmt.Printf("arm B far (TypeScript, greeting) digest: %s\n", farDigest)
	fmt.Printf("arm B near (Go, options+registration) bytes: %s\n", near.bytes)
	fmt.Printf("arm B near (Go, options+registration) digest: %s\n", near.digest)
	fmt.Printf("arm B connect-options digest: far=%s near=%s\n", farOptions, near.options)

	if near.options != farOptions {
		return fmt.Errorf(
			"arm B: the two canonicalizers named different connect-options values\n  far:  %s\n  near: %s",
			farOptions, near.options,
		)
	}
	if near.bytes != decodeHex(farBytes) {
		return fmt.Errorf(
			"arm B: the two languages folded different bytes\n  far:  %s\n  near: %s",
			decodeHex(farBytes), near.bytes,
		)
	}
	if near.digest != farDigest {
		return fmt.Errorf("arm B: the two languages named different sessions")
	}
	fmt.Printf("arm B: EQUAL bytes and digest across the language boundary\n")

	roster, err := daemon.RosterDigest(daemon.SubstrateRoster)
	if err != nil {
		return err
	}
	position, factDigest, err := daemon.Land(
		ctx, sessions, daemon.EstablishedFact(near.digest, near.options, roster, nil),
	)
	if err != nil {
		return err
	}
	fmt.Printf(
		"arm B session fact: session=%s position=%d digest=%s\n",
		near.digest, position, factDigest,
	)
	return nil
}

// runControl repeats arm B with exactly one field mutated in exactly one
// group. The comparison must fail; the run passes only when it does.
func runControl(instance *daemon.Daemon, minter string, layer string) error {
	far, release, err := mint(instance.ClientURL(), minter, layer)
	if err != nil {
		return err
	}
	defer release()

	mutate := func(digest string) string { return mutateDigest(digest) }
	near, err := foldFar(instance, far, mutate)
	if err != nil {
		return err
	}
	farBytes, _ := far["bytes"].(string)
	farDigest, _ := far["digest"].(string)
	farOptions, _ := far["options_digest"].(string)

	fmt.Printf("control: mutated group two's declared connect-options digest\n")
	fmt.Printf("control far digest: %s\n", farDigest)
	fmt.Printf("control near digest: %s\n", near.digest)
	fmt.Printf("control connect-options digest: far=%s near=%s\n", farOptions, near.options)

	if near.bytes == decodeHex(farBytes) {
		return errors.New("control: the mutated group folded identical bytes, so the comparison cannot fail")
	}
	if near.digest == farDigest {
		return errors.New("control: the mutated group named the same session, so the comparison cannot fail")
	}
	fmt.Printf("control: REFUSED as required — one mutated group field moved both the bytes and the digest\n")
	return nil
}

// measurement is one folded session's recorded evidence.
type measurement struct {
	bytes   string
	digest  string
	options string
}

func measure(session map[string]any) (measurement, error) {
	encoded, err := daemon.SessionBytes(session)
	if err != nil {
		return measurement{}, err
	}
	return measurement{bytes: string(encoded), digest: canonical.DigestHex(encoded)}, nil
}

// foldFar folds, on this side, the session for the connection the far side
// opened: group one from the options value plus the registration, group two's
// digest derived here from the declared value that crossed, and group three
// taken as the declared value it is.
//
// `mutate`, when present, is the negative control's single mutation.
func foldFar(
	instance *daemon.Daemon,
	far map[string]any,
	mutate func(string) string,
) (measurement, error) {
	identifier, ok := far["client_id"].(float64)
	if !ok {
		return measurement{}, errors.New("the far side reported no connection identifier")
	}
	registration, err := instance.Registration(uint64(identifier))
	if err != nil {
		return measurement{}, err
	}
	substrate, err := instance.SubstrateFromRegistration(registration)
	if err != nil {
		return measurement{}, fmt.Errorf("fold arm B from options and registration: %w", err)
	}
	declaration, ok := far["connect_options"].(map[string]any)
	if !ok {
		return measurement{}, errors.New("the far side declared no connect options")
	}
	declarationBytes, err := canonical.CanonicalizeValue(declaration)
	if err != nil {
		return measurement{}, fmt.Errorf("canonicalize the far side's connect options: %w", err)
	}
	options := canonical.DigestHex(declarationBytes)
	estate, ok := far["estate"].(map[string]any)
	if !ok {
		return measurement{}, errors.New("the far side declared no estate group")
	}
	folded := options
	if mutate != nil {
		folded = mutate(options)
	}
	taken, err := measure(daemon.SessionValue(substrate, folded, estate))
	if err != nil {
		return measurement{}, err
	}
	taken.options = options
	return taken, nil
}

// mint spawns the far side, reads its one line of evidence, and hands back a
// release that ends it. The far side holds its connection open until the
// release runs, because a registration is gone the moment its connection is.
func mint(url string, minter string, layer string) (map[string]any, func(), error) {
	command := exec.Command("bun", minter, url, layer)
	command.Stderr = os.Stderr
	input, err := command.StdinPipe()
	if err != nil {
		return nil, nil, fmt.Errorf("open the far side's input: %w", err)
	}
	output, err := command.StdoutPipe()
	if err != nil {
		return nil, nil, fmt.Errorf("open the far side's output: %w", err)
	}
	if err := command.Start(); err != nil {
		return nil, nil, fmt.Errorf("start the far side: %w", err)
	}
	release := func() {
		_ = input.Close()
		_, _ = io.Copy(io.Discard, output)
		_ = command.Wait()
	}
	reader := bufio.NewReaderSize(output, 1<<20)
	line, err := reader.ReadBytes('\n')
	if err != nil {
		release()
		return nil, nil, fmt.Errorf("read the far side's evidence: %w", err)
	}
	value, err := canonical.Decode(line)
	if err != nil {
		release()
		return nil, nil, fmt.Errorf("decode the far side's evidence: %w", err)
	}
	far, ok := value.(map[string]any)
	if !ok {
		release()
		return nil, nil, errors.New("the far side's evidence is not a record")
	}
	return far, release, nil
}

// mutateDigest moves exactly one character of one digest — the cheapest
// single-field mutation the control can make.
func mutateDigest(digest string) string {
	if digest == "" {
		return "0"
	}
	replacement := byte('0')
	if digest[0] == '0' {
		replacement = '1'
	}
	return string(replacement) + digest[1:]
}

// decodeHex reads back the hexadecimal the far side wrote its canonical bytes
// as, so the byte comparison is over bytes rather than over two encodings of
// them.
func decodeHex(encoded string) string {
	if len(encoded)%2 != 0 {
		return ""
	}
	decoded := make([]byte, 0, len(encoded)/2)
	for index := 0; index < len(encoded); index += 2 {
		high, lowOK := hexNibble(encoded[index]), hexNibble(encoded[index+1])
		if high < 0 || lowOK < 0 {
			return ""
		}
		decoded = append(decoded, byte(high<<4|lowOK))
	}
	return string(decoded)
}

func hexNibble(character byte) int {
	switch {
	case character >= '0' && character <= '9':
		return int(character - '0')
	case character >= 'a' && character <= 'f':
		return int(character-'a') + 10
	default:
		return -1
	}
}
