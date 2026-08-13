// Command lineartrace runs the real effector and journal code against an
// embedded JetStream server and emits the observed event timelines as JSON.
//
// The motion-graphics clips under docs/media/linearization are driven from
// these files: every fence, revision, sequence and refusal string on screen is
// something the shipped code actually produced, not a hand-authored fiction.
//
// Choreography mirrors the coordinator-owned suites:
//   - register: effector_test.go TestClaimIsExclusive + TestStolenClaimCannotCommit
//     (the EL3 fencing law: no commit lands below the highest fence)
//   - journal: conflict_resync_test.go TestConflictResyncsLoserCursor
//     (a lost CAS resyncs from the verified tail and recovers through Append)
package main

import (
	"context"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"os"
	"path/filepath"
	"sync"
	"time"

	"github.com/nats-io/nats-server/v2/server"
	"github.com/nats-io/nats.go"
	"github.com/nats-io/nats.go/jetstream"

	"foldlab/canonical"
	"foldlab/effector"
	"foldlab/journal"
)

// Event is one observed step of a timeline. Fields left at their zero value are
// omitted so the JSON reads as the record of what actually happened.
type Event struct {
	T        int64  `json:"t_ms"`
	Actor    string `json:"actor"`
	Op       string `json:"op"`
	Outcome  string `json:"outcome"`
	Fence    uint64 `json:"fence,omitempty"`
	Revision uint64 `json:"revision,omitempty"`
	Seq      int    `json:"seq,omitempty"`
	SeqSet   bool   `json:"-"`
	Position *int   `json:"position,omitempty"`
	Head     string `json:"head,omitempty"`
	Payload  string `json:"payload,omitempty"`
	Result   string `json:"result,omitempty"`
	First    *bool  `json:"first,omitempty"`
	ErrKind  string `json:"err_kind,omitempty"`
	ErrText  string `json:"err_text,omitempty"`
	Note     string `json:"note,omitempty"`
}

// Trace is one clip's worth of observed history.
type Trace struct {
	Clip     string  `json:"clip"`
	Source   string  `json:"source"`
	Law      string  `json:"law"`
	Key      string  `json:"key,omitempty"`
	Stream   string  `json:"stream,omitempty"`
	Actors   []Actor `json:"actors"`
	Events   []Event `json:"events"`
	Recorded string  `json:"recorded_by"`
}

// Actor is a lane in the clip: one racing participant.
type Actor struct {
	ID    string `json:"id"`
	Label string `json:"label"`
}

func main() {
	out := flag.String("out", ".", "directory to write the trace JSON files into")
	flag.Parse()

	if err := os.MkdirAll(*out, 0o755); err != nil {
		fail(err)
	}

	srv, js, shutdown, err := startJetStream()
	if err != nil {
		fail(err)
	}
	defer shutdown()
	_ = srv

	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

	register, err := traceRegister(ctx, js)
	if err != nil {
		fail(fmt.Errorf("register trace: %w", err))
	}
	if err := write(filepath.Join(*out, "register-trace.json"), register); err != nil {
		fail(err)
	}

	tail, err := traceJournal(ctx, js)
	if err != nil {
		fail(fmt.Errorf("journal trace: %w", err))
	}
	if err := write(filepath.Join(*out, "journal-trace.json"), tail); err != nil {
		fail(err)
	}

	fmt.Printf("register: %d events\njournal:  %d events\nwritten to %s\n",
		len(register.Events), len(tail.Events), *out)
}

// ---------------------------------------------------------------- register --

// traceRegister races two claimants at one authority key, lets the winner's
// lease lapse, has a third steal to the next fence, then makes the superseded
// holder commit. The superseded commit must bounce; the stealer's must land.
func traceRegister(ctx context.Context, js jetstream.JetStream) (Trace, error) {
	const name = "linearize"
	digest := "a6" + repeat("1", 62)

	e, err := effector.Open(ctx, js, name)
	if err != nil {
		return Trace{}, err
	}
	kv, err := js.KeyValue(ctx, "E_"+name)
	if err != nil {
		return Trace{}, err
	}
	key := "work." + digest

	start := time.Now()
	clock := func() int64 { return time.Since(start).Milliseconds() }
	revision := func() uint64 {
		entry, getErr := kv.Get(ctx, key)
		if getErr != nil {
			return 0
		}
		return entry.Revision()
	}

	trace := Trace{
		Clip:     "register-linearizes",
		Source:   "go/effector/effector.go via go/cmd/lineartrace",
		Law:      "EL3 fencing (safety, not clock)",
		Key:      key,
		Actors:   []Actor{{ID: "A", Label: "A"}, {ID: "B", Label: "B"}, {ID: "C", Label: "C"}},
		Recorded: "go run ./cmd/lineartrace",
	}
	add := func(ev Event) { trace.Events = append(trace.Events, ev) }

	// Two claimants race the same key. The revision-CAS admits exactly one.
	type attempt struct {
		actor string
		claim effector.Claim
		err   error
		at    int64
	}
	results := make([]attempt, 2)
	var wg sync.WaitGroup
	gate := make(chan struct{})
	for i, actor := range []string{"A", "B"} {
		wg.Add(1)
		go func(i int, actor string) {
			defer wg.Done()
			<-gate
			claim, claimErr := e.Claim(ctx, digest, actor, 120*time.Millisecond)
			results[i] = attempt{actor: actor, claim: claim, err: claimErr, at: clock()}
		}(i, actor)
	}
	close(gate)
	wg.Wait()

	var holder effector.Claim
	for _, r := range results {
		if r.err == nil {
			holder = r.claim
			add(Event{
				T: r.at, Actor: r.actor, Op: "claim", Outcome: "granted",
				Fence: r.claim.Fence, Revision: revision(),
				Note: "revision-CAS admitted one claimant",
			})
			continue
		}
		add(Event{
			T: r.at, Actor: r.actor, Op: "claim", Outcome: "refused",
			Revision: revision(),
			ErrKind:  errKind(r.err), ErrText: r.err.Error(),
			Note: "the key was already held at this revision",
		})
	}
	if holder.Fence == 0 {
		return Trace{}, errors.New("neither claimant won the race")
	}

	// The holder stalls; its lease lapses without being superseded.
	time.Sleep(200 * time.Millisecond)
	add(Event{
		T: clock(), Actor: holder.Owner, Op: "lease-lapse", Outcome: "lapsed",
		Fence: holder.Fence, Revision: revision(),
		Note: "the lease expired; the fence did not move",
	})

	// C steals the lapsed claim. The fence must strictly increase.
	stolen, err := e.Claim(ctx, digest, "C", 5*time.Second)
	if err != nil {
		return Trace{}, fmt.Errorf("steal: %w", err)
	}
	add(Event{
		T: clock(), Actor: "C", Op: "steal", Outcome: "granted",
		Fence: stolen.Fence, Revision: revision(),
		Note: "the steal is a revision-CAS; fences strictly increase",
	})

	// The superseded holder commits under its old fence. This must bounce.
	first, err := e.Commit(ctx, holder, "late-work")
	if err == nil {
		return Trace{}, errors.New("a superseded commit was accepted")
	}
	firstVal := first
	add(Event{
		T: clock(), Actor: holder.Owner, Op: "commit", Outcome: "refused",
		Fence: holder.Fence, Revision: revision(), Result: "late-work",
		First: &firstVal, ErrKind: errKind(err), ErrText: err.Error(),
		Note: "Commit never inspects expiry; fence is the sole authority",
	})

	// The stealer commits at the highest fence.
	first, err = e.Commit(ctx, stolen, "the-effect")
	if err != nil {
		return Trace{}, fmt.Errorf("stealer commit: %w", err)
	}
	firstStealer := first
	add(Event{
		T: clock(), Actor: "C", Op: "commit", Outcome: "landed",
		Fence: stolen.Fence, Revision: revision(), Result: "the-effect",
		First: &firstStealer,
		Note:  "claim -> outcome on the same key, one revision-CAS",
	})

	// The register's own account of what happened.
	state, outcome, err := e.Lookup(ctx, digest)
	if err != nil {
		return Trace{}, err
	}
	add(Event{
		T: clock(), Actor: "register", Op: "lookup", Outcome: string(state),
		Fence: outcome.Fence, Revision: revision(), Result: outcome.Result,
		Note: "one terminal outcome, at the highest fence",
	})
	return trace, nil
}

// ----------------------------------------------------------------- journal --

// traceJournal races two handles on one stream at the same tail position. The
// loser's CAS proves the position occupied; it resyncs from the verified tail
// and recovers through Append alone.
func traceJournal(ctx context.Context, js jetstream.JetStream) (Trace, error) {
	const name = "linearize"

	winner, err := journal.Open(ctx, js, name)
	if err != nil {
		return Trace{}, err
	}
	loser, err := journal.Open(ctx, js, name)
	if err != nil {
		return Trace{}, err
	}

	start := time.Now()
	clock := func() int64 { return time.Since(start).Milliseconds() }

	trace := Trace{
		Clip:     "journal-linearizes",
		Source:   "go/journal/journal.go via go/cmd/lineartrace",
		Law:      "JL2 create-only CAS at the tail",
		Stream:   "J_" + name,
		Actors:   []Actor{{ID: "W", Label: "W"}, {ID: "L", Label: "L"}},
		Recorded: "go run ./cmd/lineartrace",
	}
	add := func(ev Event) { trace.Events = append(trace.Events, ev) }

	add(Event{
		T: clock(), Actor: "W", Op: "open", Outcome: "cursor",
		Position: pos(winner.Head().Seq), Head: winner.Head().Head,
		Note: "genesis: both handles propose the same next position",
	})
	add(Event{
		T: clock(), Actor: "L", Op: "open", Outcome: "cursor",
		Position: pos(loser.Head().Seq), Head: loser.Head().Head,
		Note: "genesis: both handles propose the same next position",
	})

	// The winner takes the contested position.
	entry, outcome, err := winner.Append(ctx, "a")
	if err != nil {
		return Trace{}, fmt.Errorf("winner append: %w", err)
	}
	winDigest, err := canonical.EntryDigest(entry)
	if err != nil {
		return Trace{}, err
	}
	add(Event{
		T: clock(), Actor: "W", Op: "append", Outcome: string(outcome),
		Position: pos(int(entry.Seq)), Head: winDigest, Payload: entry.Payload,
		Note: "expected-sequence CAS met; the tail advanced",
	})

	// The loser proposes the same position and loses the CAS.
	lost, _, err := loser.Append(ctx, "b")
	if !errors.Is(err, journal.ErrConflict) {
		return Trace{}, fmt.Errorf("loser append: %v, want ErrConflict", err)
	}
	add(Event{
		T: clock(), Actor: "L", Op: "append", Outcome: "conflict",
		Position: pos(int(lost.Seq)), Payload: lost.Payload,
		ErrKind: "ErrConflict", ErrText: err.Error(),
		Note: "the CAS proved the position occupied",
	})

	// The refusal carries a resync: the loser's cursor adopts the verified tail.
	resynced := loser.Head()
	add(Event{
		T: clock(), Actor: "L", Op: "resync", Outcome: "cursor",
		Position: pos(resynced.Seq), Head: resynced.Head,
		Note: "the cursor adopted the verified tail",
	})

	// Recovery is through Append alone.
	next, outcome, err := loser.Append(ctx, "c")
	if err != nil {
		return Trace{}, fmt.Errorf("loser recovery: %w", err)
	}
	nextDigest, err := canonical.EntryDigest(next)
	if err != nil {
		return Trace{}, err
	}
	add(Event{
		T: clock(), Actor: "L", Op: "append", Outcome: string(outcome),
		Position: pos(int(next.Seq)), Head: nextDigest, Payload: next.Payload,
		Note: "chained onto the winner at the next position",
	})

	// The whole stream reads back as one verified chain.
	entries, cursor, err := loser.Read(ctx, journal.Cursor{Seq: -1, Head: canonical.Genesis}, 0)
	if err != nil {
		return Trace{}, fmt.Errorf("verify read: %w", err)
	}
	payloads := make([]string, 0, len(entries))
	for _, e := range entries {
		payloads = append(payloads, e.Payload)
	}
	raw, err := json.Marshal(payloads)
	if err != nil {
		return Trace{}, err
	}
	add(Event{
		T: clock(), Actor: "stream", Op: "read", Outcome: "verified",
		Position: pos(cursor.Seq), Head: cursor.Head, Payload: string(raw),
		Note: "one chain, no fork at any sequence number",
	})
	return trace, nil
}

// -------------------------------------------------------------- harness ----

// startJetStream boots the same embedded, portless JetStream the coordinator
// suites use, so the trace observes the real substrate.
func startJetStream() (*server.Server, jetstream.JetStream, func(), error) {
	dir, err := os.MkdirTemp("", "lineartrace")
	if err != nil {
		return nil, nil, nil, err
	}
	srv, err := server.NewServer(&server.Options{
		ServerName: "lineartrace",
		JetStream:  true,
		StoreDir:   dir,
		DontListen: true,
		NoSigs:     true,
	})
	if err != nil {
		return nil, nil, nil, err
	}
	go srv.Start()
	if !srv.ReadyForConnections(10 * time.Second) {
		return nil, nil, nil, errors.New("embedded server not ready")
	}
	nc, err := nats.Connect("", nats.InProcessServer(srv))
	if err != nil {
		return nil, nil, nil, err
	}
	js, err := jetstream.New(nc)
	if err != nil {
		return nil, nil, nil, err
	}
	shutdown := func() {
		nc.Close()
		srv.Shutdown()
		srv.WaitForShutdown()
		_ = os.RemoveAll(dir)
	}
	return srv, js, shutdown, nil
}

func errKind(err error) string {
	switch {
	case errors.Is(err, effector.ErrFenced):
		return "ErrFenced"
	case errors.Is(err, effector.ErrHeld):
		return "ErrHeld"
	case errors.Is(err, effector.ErrCommitted):
		return "ErrCommitted"
	case errors.Is(err, journal.ErrConflict):
		return "ErrConflict"
	case errors.Is(err, journal.ErrTampered):
		return "ErrTampered"
	default:
		return "error"
	}
}

func pos(v int) *int { return &v }

func repeat(s string, n int) string {
	out := make([]byte, 0, n)
	for i := 0; i < n; i++ {
		out = append(out, s...)
	}
	return string(out)
}

func write(path string, value any) error {
	raw, err := json.MarshalIndent(value, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(path, append(raw, '\n'), 0o644)
}

func fail(err error) {
	fmt.Fprintln(os.Stderr, "lineartrace:", err)
	os.Exit(1)
}
