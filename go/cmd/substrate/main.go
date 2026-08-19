// Command substrate is the estate's substrate lifecycle: up, down, status.
//
// Three verbs and no fourth. Each is one act, and each act's whole record is
// facts on lanes the coordination substrate carries — so what happened is
// readable a week later by a party that ran none of them.
//
//	up      declares the server-options value, wins its incarnation round at
//	        the fenced register, constructs and starts the embedded server,
//	        probes readiness by the pinned vendor's own gates, lands the
//	        established fact and the readiness observations, serves, and then
//	        performs the teardown the record disposes it to.
//
//	down    lands one teardown disposition for the incarnation currently
//	        established over a store directory — drain then stop, or stop —
//	        and reports the retirement the running incarnation lands.
//
//	status  folds the incarnation lane and reports. It probes nothing, reaches
//	        no server, and has no answer that says an incarnation is running:
//	        what it reports is what the record carries.
//
// **The register and the lanes live on a coordination substrate, and its
// address is an argument.** The fence decides whether a server may exist over a
// store directory, so it cannot live on the server whose existence it is
// deciding; the record outlives the incarnation it is about, so it cannot live
// inside it either. Both are the same reason and it is not an inconvenience to
// route around: a fence on the fenced substrate would need the thing it is
// deciding whether to start.
//
// **No signal takes this daemon down.** The declared server-options value
// installs no signal handler, and this command installs none of its own: a
// signal reaches one process once, leaves no record, and cannot be replayed,
// which is the private truth the estate refuses everywhere else. A process
// killed at the operating system's insistence lands NOTHING and reads as an
// unretired incarnation whose lanes went quiet, which is the honest reading and
// the one the teardown differential already measures.
package main

import (
	"context"
	"errors"
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/nats-io/nats.go"
	"github.com/nats-io/nats.go/jetstream"

	"foldlab/daemon"
	"foldlab/journal"
	"foldlab/register"
)

const (
	// laneDeadline bounds every lane read and write one verb performs.
	laneDeadline = 60 * time.Second
	// chainDepth bounds the register chain walk `up` takes to find the round
	// nobody has decided. A store directory's chain grows by one per start.
	chainDepth = 4096
)

func main() {
	if len(os.Args) < 2 {
		fmt.Fprintln(os.Stderr, usage)
		os.Exit(2)
	}
	verb, rest := os.Args[1], os.Args[2:]
	var err error
	switch verb {
	case "up":
		err = runUp(rest)
	case "down":
		err = runDown(rest)
	case "status":
		err = runStatus(rest)
	default:
		fmt.Fprintf(os.Stderr, "unknown verb %q\n%s\n", verb, usage)
		os.Exit(2)
	}
	if err != nil {
		report(err)
		os.Exit(1)
	}
}

const usage = `usage:
  substrate up     --coordination URL --store DIR --name SERVER [--addr HOST] [--port PORT]
  substrate down   --coordination URL --store DIR [--stop]
  substrate status --coordination URL [--store DIR]`

// report renders one failure.
//
// A typed refusal is rendered as the teaching it is — reason, law, what was
// seen, what was required, and the repair — because a refusal that printed only
// its message would teach nothing and a caller would be left to guess. Anything
// else is a plain error and is printed as one; dressing it in a refusal's
// clothes would claim a teaching nobody wrote.
func report(err error) {
	registerRefusal := &register.Refusal{}
	if errors.As(err, &registerRefusal) {
		fmt.Fprintf(os.Stderr, "refused: %s\n", registerRefusal.Kind)
		fmt.Fprintf(os.Stderr, "law: %s\n", registerRefusal.Law)
		fmt.Fprintf(os.Stderr, "got: %v\n", registerRefusal.Got)
		fmt.Fprintf(os.Stderr, "want: %v\n", registerRefusal.Want)
		for _, next := range registerRefusal.Next {
			fmt.Fprintf(os.Stderr, "repair at %s: %s\n", next.Subject, next.Note)
		}
		return
	}
	daemonRefusal := &daemon.Refusal{}
	if errors.As(err, &daemonRefusal) {
		fmt.Fprintf(os.Stderr, "refused: %s\n", daemonRefusal.Kind)
		fmt.Fprintf(os.Stderr, "law: %s\n", daemonRefusal.Law)
		fmt.Fprintf(os.Stderr, "got: %v\n", daemonRefusal.Got)
		fmt.Fprintf(os.Stderr, "want: %v\n", daemonRefusal.Want)
		for _, next := range daemonRefusal.Next {
			fmt.Fprintf(os.Stderr, "repair at %s: %s\n", next.Subject, next.Note)
		}
		return
	}
	fmt.Fprintln(os.Stderr, err)
}

// coordination is one verb's connection to the substrate the register and the
// lanes live on, with the two lanes opened.
type coordination struct {
	connection  *nats.Conn
	registers   *register.Client
	incarnation *journal.Journal
	session     *journal.Journal
}

// openCoordination connects to the coordination substrate and opens what the
// verb needs there.
//
// The lanes are the estate's existing append-only journal lanes with their
// standing shape gate. This command builds no lane writer of its own, for the
// reason the daemon package already states: a lane only this command could read
// is exactly the private truth the whole design refuses.
func openCoordination(ctx context.Context, url string, name string) (*coordination, error) {
	if strings.TrimSpace(url) == "" {
		return nil, errors.New("the coordination substrate's address is required: the register and the lanes live there")
	}
	connection, err := nats.Connect(url, nats.Name(name))
	if err != nil {
		return nil, fmt.Errorf("connect to the coordination substrate: %w", err)
	}
	registers, err := register.Open(connection)
	if err != nil {
		connection.Close()
		return nil, fmt.Errorf("open the incarnation register: %w", err)
	}
	js, err := jetstream.New(connection)
	if err != nil {
		connection.Close()
		return nil, fmt.Errorf("open the JetStream context: %w", err)
	}
	incarnations, err := daemon.OpenLane(ctx, js, daemon.IncarnationLane)
	if err != nil {
		connection.Close()
		return nil, fmt.Errorf("open the incarnation lane: %w", err)
	}
	sessions, err := daemon.OpenLane(ctx, js, daemon.SessionLane)
	if err != nil {
		connection.Close()
		return nil, fmt.Errorf("open the session lane: %w", err)
	}
	return &coordination{
		connection:  connection,
		registers:   registers,
		incarnation: incarnations,
		session:     sessions,
	}, nil
}

// Close releases the coordination connection.
//
// A close and not a drain, and the ruling behind that is the estate's: every
// write this command makes is a request whose acknowledgement it already
// awaited, so at the instant this runs there is nothing in flight to lose.
func (c *coordination) Close() { c.connection.Close() }

// causeOf reads the declared retirement cause a teardown flag selects.
//
// The two rows are the roster's, read rather than spelled: a third spelling
// here would be a cause the roster never declared, which is precisely the
// forgery the roster's shortness exists to prevent.
func causeOf(hardStop bool) string {
	if hardStop {
		return daemon.CauseStopped
	}
	return daemon.CauseDrained
}
