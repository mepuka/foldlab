// Command optionswall executes the server-options slice's walls and records
// their numbers.
//
// Six arms, selected by flag, each wired into the battery as its own stage
// because each measures a different claim:
//
//	(default) the closed-channel refusal. Every row of the closed inventory is
//	probed ON ITS OWN: a declared value that enables exactly that row and
//	nothing else is submitted at the one admission door, the refusal it
//	receives is printed with its reason, its law and its repair verbatim, and
//	the absence of a server is MEASURED — no listener on either port the value
//	named, and not one byte written into the store directory it declared.
//	Beside each refusal stands its pair: the estate's own value, identical
//	except at that row, admitted. The arm ends with the positive control — the
//	estate's own declared value acquires, starts, and passes its readiness
//	gate.
//
//	--admission-control: the committed refutation. The same eight enabling
//	values pass through the same door over an EMPTY inventory, and every one of
//	them must be ADMITTED. A refusal that cannot be turned off proves nothing
//	about what is doing the refusing.
//
//	--citation: the options digest an incarnation cites, round-tripped. A
//	daemon starts under one declared value, its incarnation fact cites that
//	value's digest, and the digest is RESOLVED and byte-compared against the
//	value the server was constructed from. One field is then revised, the
//	substrate restarts over the same store directory, and the successor cites a
//	different digest. The negative control is beside it: a fact citing a digest
//	computed over a different value is refused, and so is one citing a digest
//	that resolves to nothing.
//
//	--parity: one table read two ways. The option table, the closed inventory,
//	and one declared options value are minted on both sides of the language
//	boundary and compared byte for byte. Two independent oracles ride along, so
//	that the comparison is not merely two transcriptions agreeing: the pin the
//	tables name is checked against the module this binary actually links, and
//	every row's site is checked against the pinned vendor's own source.
//
//	--tracking: root law 10 over what the daemon RENDERS. Every refusal the
//	package mints is minted at a shipped door, under a declared value naming a
//	real store directory, and every string it hands a reader is swept for the
//	shapes the law refuses — four filesystem-path shapes, a board-ticket id, a
//	generation command — beside two exact oracles: the store directory the
//	value declared, and the source coordinate every transcribed row carries.
//
//	--tracking-controls: that sweep's seven committed refutations. Six plant
//	one artifact per clause in a repair the shipped door renders, and the
//	seventh plants the rendering this slice retired — the citation mismatch
//	with the resolved and running bytes in it, store directory and all.
//
// Every byte string, digest, port and repair it measures is printed, because a
// wall whose numbers are not recorded is a claim rather than evidence.
package main

import (
	"errors"
	"flag"
	"fmt"
	"net"
	"os"
	"path/filepath"
	"time"

	"foldlab/daemon"
)

const (
	readyWithin = 30 * time.Second
	dialWithin  = 500 * time.Millisecond
)

func main() {
	admissionControl := flag.Bool(
		"admission-control",
		false,
		"run the committed refutation: the same enabling values over an empty inventory, which must be admitted",
	)
	citation := flag.Bool(
		"citation",
		false,
		"run the options-digest citation wall and its negative controls",
	)
	parity := flag.Bool(
		"parity",
		false,
		"run the option table and closed inventory's byte-parity comparison against the spine",
	)
	tracking := flag.Bool(
		"tracking",
		false,
		"sweep every refusal this package renders for the tracking artifacts root law 10 refuses",
	)
	trackingControls := flag.Bool(
		"tracking-controls",
		false,
		"run the tracking sweep's committed refutations, each of which must refute on its own clause",
	)
	minter := flag.String(
		"minter",
		filepath.Join("..", "packages", "plait", "test", "process", "substrate-options-mint.ts"),
		"the TypeScript process that mints the reference side of the parity comparison",
	)
	flag.Parse()

	var err error
	switch {
	case *admissionControl:
		err = runAdmissionControl()
	case *citation:
		err = runCitation()
	case *parity:
		err = runParity(*minter)
	case *tracking:
		err = runTracking()
	case *trackingControls:
		err = runTrackingControls()
	default:
		err = runRefusal()
	}
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}

// estateDeclared is the estate's own declared server-options value at this
// wall's posture: a listening localhost substrate with JetStream, its own store
// directory, and every closed-inventory row at its closed setting.
//
// The log suppression is this wall's own, for the reason the other daemon walls
// state: a battery site's stdout is its evidence, and the substrate's account of
// itself is not part of that evidence. It is not a ruling about the daemon's
// posture and the declared row it sets is the same row either way.
func estateDeclared(store string, port int) daemon.DeclaredServerOptions {
	return daemon.DeclaredServerOptions{
		ServerName:   "foldlab-options-wall",
		StoreDir:     store,
		Host:         "127.0.0.1",
		Port:         port,
		JetStream:    true,
		Listen:       true,
		NoLog:        true,
		SyncInterval: daemon.DeclaredSyncInterval,
		SyncAlways:   daemon.DeclaredSyncAlways,
	}
}

// enableRow declares exactly one inventory row open and leaves every other row
// at its closed setting.
//
// The switch is the prober's, not the door's. The shipped door reads the
// declared value and needs no such mapping; only a party building a value that
// opens something needs to turn a row name into a field, and building that
// value is what a wall is for. A row the inventory carries and this function
// does not know refuses the whole run rather than being skipped, so a row added
// tomorrow cannot go unprobed.
func enableRow(
	declared daemon.DeclaredServerOptions,
	row string,
	port int,
) (daemon.DeclaredServerOptions, error) {
	switch row {
	case "websocket":
		declared.WebsocketPort = port
	case "mqtt":
		declared.MQTTPort = port
	case "cluster":
		declared.ClusterPort = port
	case "gateway":
		declared.GatewayPort = port
	case "leafnode-listener":
		declared.LeafNodePort = port
	case "leafnode-remotes":
		declared.LeafNodeRemotes = []string{
			fmt.Sprintf("nats-leaf://127.0.0.1:%d", port),
		}
	case "https-monitoring":
		declared.HTTPSPort = port
	case "profiling":
		declared.ProfPort = port
	default:
		return declared, fmt.Errorf("no probe knows how to enable the inventory row %q", row)
	}
	return declared, nil
}

// freePort takes a port from the host, learns its number, and gives it back.
//
// The number is what the probe declares, and the fact that nothing holds it
// afterwards is what makes "nothing is listening there" a measurement rather
// than a guess.
func freePort() (int, error) {
	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		return 0, fmt.Errorf("take a port from the host: %w", err)
	}
	port := listener.Addr().(*net.TCPAddr).Port
	if err := listener.Close(); err != nil {
		return 0, fmt.Errorf("give the port back: %w", err)
	}
	return port, nil
}

// unbound measures that nothing accepts a connection on one port.
func unbound(port int) error {
	address := fmt.Sprintf("127.0.0.1:%d", port)
	connection, err := net.DialTimeout("tcp", address, dialWithin)
	if err != nil {
		return nil
	}
	connection.Close()
	return fmt.Errorf("something is listening on %s", address)
}

// untouched measures that a store directory holds nothing.
//
// A constructed server writes into its store directory before it serves
// anything, so an empty directory after a refusal is filesystem evidence that no
// server was constructed — the same discipline the incarnation wall's witness
// files use, read from the other side.
func untouched(store string) error {
	entries, err := os.ReadDir(store)
	if err != nil {
		return fmt.Errorf("read the store directory back: %w", err)
	}
	if len(entries) != 0 {
		names := make([]string, 0, len(entries))
		for _, entry := range entries {
			names = append(names, entry.Name())
		}
		return fmt.Errorf("the refused value wrote into its store directory: %v", names)
	}
	return nil
}

// asRefusal reads a typed refusal out of an error, or reports that the error is
// a bare one. A bare error on the meaning path is itself the finding.
func asRefusal(err error) (*daemon.Refusal, bool) {
	refusal := &daemon.Refusal{}
	if errors.As(err, &refusal) {
		return refusal, true
	}
	return nil, false
}

func runRefusal() error {
	fmt.Printf(
		"closed-channel inventory: %d rows, law: %s\n\n",
		len(daemon.ClosedChannels), daemon.ClosedChannelLaw,
	)

	refused := 0
	for _, channel := range daemon.ClosedChannels {
		store, err := os.MkdirTemp("", "foldlab-options-refusal-")
		if err != nil {
			return fmt.Errorf("make the probe's store directory: %w", err)
		}
		clientPort, err := freePort()
		if err != nil {
			return err
		}
		rowPort, err := freePort()
		if err != nil {
			return err
		}

		// The pair's first half: the estate's own value at this row, which
		// must be ADMITTED. It runs first so that a probe reporting a refusal
		// is reporting the row and not the posture around it.
		admitted := estateDeclared(store, clientPort)
		if refusal := daemon.AdmitServerOptions(admitted); refusal != nil {
			return fmt.Errorf(
				"%s: the estate's own declared value was refused: %v", channel.Row, refusal,
			)
		}

		// The pair's second half: the same value with exactly this row open.
		enabling, err := enableRow(admitted, channel.Row, rowPort)
		if err != nil {
			return err
		}
		instance, err := daemon.Acquire(enabling)
		if instance != nil {
			instance.Shutdown()
			return fmt.Errorf("%s: a value enabling a closed channel produced a server", channel.Row)
		}
		if err == nil {
			return fmt.Errorf("%s: a value enabling a closed channel was admitted", channel.Row)
		}
		refusal, typed := asRefusal(err)
		if !typed {
			return fmt.Errorf("%s: the door returned a bare error: %v", channel.Row, err)
		}
		if refusal.Kind != daemon.KindClosedChannel {
			return fmt.Errorf("%s: the door refused as %q", channel.Row, refusal.Kind)
		}
		if refusal.Law == "" || len(refusal.Next) == 0 || refusal.Next[0].Note == "" {
			return fmt.Errorf("%s: the refusal carries no law or no repair: %+v", channel.Row, refusal)
		}
		if refusal.Next[0].Note != channel.Repair {
			return fmt.Errorf(
				"%s: the refusal taught a repair the inventory does not carry", channel.Row,
			)
		}
		if err := unbound(clientPort); err != nil {
			return fmt.Errorf("%s: %w", channel.Row, err)
		}
		if err := unbound(rowPort); err != nil {
			return fmt.Errorf("%s: %w", channel.Row, err)
		}
		if err := untouched(store); err != nil {
			return fmt.Errorf("%s: %w", channel.Row, err)
		}
		if err := os.RemoveAll(store); err != nil {
			return err
		}

		fmt.Printf("== row %s (%s at %s)\n", channel.Row, channel.Option, channel.Declaration)
		fmt.Printf("   admitted at the closed setting: %v\n", channel.Closed)
		fmt.Printf("   reason: %s\n", refusal.Kind)
		fmt.Printf("   law: %s\n", refusal.Law)
		fmt.Printf("   got: %v\n", refusal.Got)
		fmt.Printf("   want: %v\n", refusal.Want)
		fmt.Printf("   repair at %s: %s\n", refusal.Next[0].Subject, refusal.Next[0].Note)
		fmt.Printf(
			"   no server: client port %d unbound, %s port %d unbound, store directory empty\n\n",
			clientPort, channel.Row, rowPort,
		)
		refused++
	}

	if refused != len(daemon.ClosedChannels) {
		return fmt.Errorf("%d rows of %d were probed", refused, len(daemon.ClosedChannels))
	}

	// The positive control. The estate's own declared value is not merely
	// admitted — it acquires, starts, and serves, which is what makes the
	// inventory a door rather than a wall.
	store, err := os.MkdirTemp("", "foldlab-options-admitted-")
	if err != nil {
		return err
	}
	defer os.RemoveAll(store)
	declared := estateDeclared(store, -1)
	digest, err := declared.Digest()
	if err != nil {
		return err
	}
	encoded, err := declared.Bytes()
	if err != nil {
		return err
	}
	instance, err := daemon.Acquire(declared)
	if err != nil {
		return fmt.Errorf("the estate's own declared value was refused: %w", err)
	}
	defer func() {
		instance.Shutdown()
		instance.WaitForShutdown()
	}()
	instance.Start()
	if !instance.ReadyForConnections(readyWithin) {
		return errors.New("the admitted substrate did not pass its readiness gate")
	}
	health := instance.Healthz()
	connection, err := net.DialTimeout("tcp", hostPortOf(instance.ClientURL()), dialWithin)
	if err != nil {
		return fmt.Errorf("the admitted substrate bound no client listener: %w", err)
	}
	connection.Close()
	fmt.Printf("== positive control: the estate's own declared value\n")
	fmt.Printf("   options bytes: %s\n", encoded)
	fmt.Printf("   options digest: %s\n", digest)
	fmt.Printf(
		"   admitted, started, ready: health=%s running=%t client url=%s\n",
		health.Status, instance.Running(), instance.ClientURL(),
	)
	fmt.Printf(
		"\nCLOSED-CHANNEL REFUSAL: %d rows, each refused on its own with reason, law and repair,"+
			" each leaving no listener and an untouched store; the estate's own value admitted and started\n",
		refused,
	)
	return nil
}

// hostPortOf strips the scheme off a client URL so a dial can be attempted
// against it.
func hostPortOf(url string) string {
	for _, prefix := range []string{"nats://", "tls://"} {
		if len(url) > len(prefix) && url[:len(prefix)] == prefix {
			return url[len(prefix):]
		}
	}
	return url
}

func runAdmissionControl() error {
	store, err := os.MkdirTemp("", "foldlab-options-control-")
	if err != nil {
		return err
	}
	defer os.RemoveAll(store)

	admitted := 0
	for _, channel := range daemon.ClosedChannels {
		clientPort, err := freePort()
		if err != nil {
			return err
		}
		rowPort, err := freePort()
		if err != nil {
			return err
		}
		enabling, err := enableRow(estateDeclared(store, clientPort), channel.Row, rowPort)
		if err != nil {
			return err
		}
		// The shipped door refuses this value; the same door over an empty
		// inventory must admit it. Nothing else about the value changes.
		if refusal := daemon.AdmitServerOptions(enabling); refusal == nil {
			return fmt.Errorf("%s: the shipped inventory admitted an enabling value", channel.Row)
		}
		if refusal := daemon.AdmitUnder(nil, enabling); refusal != nil {
			return fmt.Errorf(
				"%s: the empty inventory refused an enabling value, so the refusal is not the inventory's: %v",
				channel.Row, refusal,
			)
		}
		fmt.Printf(
			"row %s: refused under the estate's inventory, admitted under an empty one (%s at %d)\n",
			channel.Row, channel.Option, rowPort,
		)
		admitted++
	}
	fmt.Printf(
		"CLOSED-CHANNEL ADMISSION CONTROL: %d enabling values, every one admitted with the inventory"+
			" emptied and refused with it restored — the inventory is what refuses\n",
		admitted,
	)
	return nil
}
