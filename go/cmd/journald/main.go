package main

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"os"
	"time"

	"github.com/nats-io/nats-server/v2/server"
	"github.com/nats-io/nats.go"
	"github.com/nats-io/nats.go/jetstream"

	"foldlab/canonical"
	"foldlab/effector"
	"foldlab/journal"
)

const maximumLineBytes = 16 * 1024 * 1024

type wireEntry struct {
	Seq     int    `json:"seq"`
	Prev    string `json:"prev"`
	Payload string `json:"payload"`
}

func entryToWire(entry canonical.ChainEntry) wireEntry {
	return wireEntry{Seq: entry.Seq, Prev: entry.Prev, Payload: entry.Payload}
}

func (entry wireEntry) canonical() canonical.ChainEntry {
	return canonical.ChainEntry{Seq: entry.Seq, Prev: entry.Prev, Payload: entry.Payload}
}

type request struct {
	ID      json.RawMessage `json:"id"`
	Op      string          `json:"op"`
	Name    string          `json:"name"`
	Payload string          `json:"payload"`
	Entry   wireEntry       `json:"entry"`
	Seq     int             `json:"seq"`
	Head    string          `json:"head"`
	Max     int             `json:"max"`
	Digest  string          `json:"digest"`
	Owner   string          `json:"owner"`
	LeaseMS int64           `json:"leaseMs"`
	Fence   uint64          `json:"fence"`
	Result  string          `json:"result"`
}

type okResponse struct {
	ID json.RawMessage `json:"id"`
	OK bool            `json:"ok"`
}

type errorResponse struct {
	ID     json.RawMessage `json:"id"`
	OK     bool            `json:"ok"`
	Reason string          `json:"reason"`
	Detail string          `json:"detail"`
}

type headResponse struct {
	ID   json.RawMessage `json:"id"`
	OK   bool            `json:"ok"`
	Seq  int             `json:"seq"`
	Head string          `json:"head"`
}

type appendResponse struct {
	ID      json.RawMessage       `json:"id"`
	OK      bool                  `json:"ok"`
	Entry   wireEntry             `json:"entry"`
	Outcome journal.AppendOutcome `json:"outcome"`
}

type appendEntryResponse struct {
	ID      json.RawMessage       `json:"id"`
	OK      bool                  `json:"ok"`
	Outcome journal.AppendOutcome `json:"outcome"`
}

type readResponse struct {
	ID      json.RawMessage `json:"id"`
	OK      bool            `json:"ok"`
	Entries []wireEntry     `json:"entries"`
	Seq     int             `json:"seq"`
	Head    string          `json:"head"`
}

type claimResponse struct {
	ID       json.RawMessage `json:"id"`
	OK       bool            `json:"ok"`
	Fence    uint64          `json:"fence"`
	ExpiryMS int64           `json:"expiryMs"`
}

type commitResponse struct {
	ID    json.RawMessage `json:"id"`
	OK    bool            `json:"ok"`
	First bool            `json:"first"`
}

type lookupResponse struct {
	ID     json.RawMessage `json:"id"`
	OK     bool            `json:"ok"`
	State  effector.State  `json:"state"`
	Fence  uint64          `json:"fence"`
	Result string          `json:"result"`
}

type daemon struct {
	js        jetstream.JetStream
	journals  map[string]*journal.Journal
	effectors map[string]*effector.Effector
}

func (daemon *daemon) openEffector(ctx context.Context, name string) (*effector.Effector, error) {
	if opened := daemon.effectors[name]; opened != nil {
		return opened, nil
	}
	opened, err := effector.Open(ctx, daemon.js, name)
	if err != nil {
		return nil, err
	}
	daemon.effectors[name] = opened
	return opened, nil
}

func (daemon *daemon) open(ctx context.Context, name string) (*journal.Journal, error) {
	if opened := daemon.journals[name]; opened != nil {
		return opened, nil
	}
	opened, err := journal.Open(ctx, daemon.js, name)
	if err != nil {
		return nil, err
	}
	daemon.journals[name] = opened
	return opened, nil
}

func validNumericID(raw json.RawMessage) bool {
	if len(raw) == 0 {
		return false
	}
	decoder := json.NewDecoder(bytes.NewReader(raw))
	decoder.UseNumber()
	var value any
	if err := decoder.Decode(&value); err != nil {
		return false
	}
	if _, ok := value.(json.Number); !ok {
		return false
	}
	return decoder.Decode(&struct{}{}) != nil
}

func reasonFor(err error) string {
	switch {
	case errors.Is(err, journal.ErrConflict):
		return "conflict"
	case errors.Is(err, journal.ErrTampered):
		return "tampered"
	case errors.Is(err, effector.ErrHeld):
		return "held"
	case errors.Is(err, effector.ErrCommitted):
		return "committed"
	case errors.Is(err, effector.ErrFenced):
		return "fenced"
	default:
		return "unavailable"
	}
}

func (daemon *daemon) serve(ctx context.Context, input []byte) any {
	var req request
	if err := json.Unmarshal(input, &req); err != nil {
		return errorResponse{ID: json.RawMessage("0"), Reason: "unavailable", Detail: fmt.Sprintf("invalid request: %v", err)}
	}
	if !validNumericID(req.ID) {
		return errorResponse{ID: json.RawMessage("0"), Reason: "unavailable", Detail: "request id must be a number"}
	}

	switch req.Op {
	case "open":
		if _, err := daemon.open(ctx, req.Name); err != nil {
			return errorResponse{ID: req.ID, Reason: reasonFor(err), Detail: err.Error()}
		}
		return okResponse{ID: req.ID, OK: true}
	case "head":
		opened, err := daemon.open(ctx, req.Name)
		if err != nil {
			return errorResponse{ID: req.ID, Reason: reasonFor(err), Detail: err.Error()}
		}
		head := opened.Head()
		return headResponse{ID: req.ID, OK: true, Seq: head.Seq, Head: head.Head}
	case "append":
		opened, err := daemon.open(ctx, req.Name)
		if err != nil {
			return errorResponse{ID: req.ID, Reason: reasonFor(err), Detail: err.Error()}
		}
		entry, outcome, appendErr := opened.Append(ctx, req.Payload)
		if appendErr != nil {
			return errorResponse{ID: req.ID, Reason: reasonFor(appendErr), Detail: appendErr.Error()}
		}
		return appendResponse{ID: req.ID, OK: true, Entry: entryToWire(entry), Outcome: outcome}
	case "appendEntry":
		opened, err := daemon.open(ctx, req.Name)
		if err != nil {
			return errorResponse{ID: req.ID, Reason: reasonFor(err), Detail: err.Error()}
		}
		outcome, appendErr := opened.AppendEntry(ctx, req.Entry.canonical())
		if appendErr != nil {
			return errorResponse{ID: req.ID, Reason: reasonFor(appendErr), Detail: appendErr.Error()}
		}
		return appendEntryResponse{ID: req.ID, OK: true, Outcome: outcome}
	case "read":
		opened, err := daemon.open(ctx, req.Name)
		if err != nil {
			return errorResponse{ID: req.ID, Reason: reasonFor(err), Detail: err.Error()}
		}
		entries, cursor, readErr := opened.Read(ctx, journal.Cursor{Seq: req.Seq, Head: req.Head}, req.Max)
		if readErr != nil {
			return errorResponse{ID: req.ID, Reason: reasonFor(readErr), Detail: readErr.Error()}
		}
		wireEntries := make([]wireEntry, len(entries))
		for index, entry := range entries {
			wireEntries[index] = entryToWire(entry)
		}
		return readResponse{ID: req.ID, OK: true, Entries: wireEntries, Seq: cursor.Seq, Head: cursor.Head}
	case "claim":
		opened, err := daemon.openEffector(ctx, req.Name)
		if err != nil {
			return errorResponse{ID: req.ID, Reason: reasonFor(err), Detail: err.Error()}
		}
		claim, claimErr := opened.Claim(
			ctx,
			req.Digest,
			req.Owner,
			time.Duration(req.LeaseMS)*time.Millisecond,
		)
		if claimErr != nil {
			return errorResponse{ID: req.ID, Reason: reasonFor(claimErr), Detail: claimErr.Error()}
		}
		return claimResponse{ID: req.ID, OK: true, Fence: claim.Fence, ExpiryMS: claim.Expiry.UnixMilli()}
	case "commit":
		opened, err := daemon.openEffector(ctx, req.Name)
		if err != nil {
			return errorResponse{ID: req.ID, Reason: reasonFor(err), Detail: err.Error()}
		}
		first, commitErr := opened.Commit(ctx, effector.Claim{
			Digest: req.Digest,
			Fence:  req.Fence,
			Owner:  req.Owner,
		}, req.Result)
		if commitErr != nil {
			return errorResponse{ID: req.ID, Reason: reasonFor(commitErr), Detail: commitErr.Error()}
		}
		return commitResponse{ID: req.ID, OK: true, First: first}
	case "lookup":
		opened, err := daemon.openEffector(ctx, req.Name)
		if err != nil {
			return errorResponse{ID: req.ID, Reason: reasonFor(err), Detail: err.Error()}
		}
		state, outcome, lookupErr := opened.Lookup(ctx, req.Digest)
		if lookupErr != nil {
			return errorResponse{ID: req.ID, Reason: reasonFor(lookupErr), Detail: lookupErr.Error()}
		}
		return lookupResponse{
			ID: req.ID, OK: true, State: state, Fence: outcome.Fence, Result: outcome.Result,
		}
	default:
		return errorResponse{ID: req.ID, Reason: "unavailable", Detail: fmt.Sprintf("unknown operation %q", req.Op)}
	}
}

func run(storeDir string) error {
	options := &server.Options{
		ServerName: "p3b-journald",
		JetStream:  true,
		StoreDir:   storeDir,
		DontListen: true,
		NoLog:      true,
		NoSigs:     true,
	}
	natsServer, err := server.NewServer(options)
	if err != nil {
		return fmt.Errorf("create embedded nats-server: %w", err)
	}
	go natsServer.Start()
	if !natsServer.ReadyForConnections(10 * time.Second) {
		natsServer.Shutdown()
		natsServer.WaitForShutdown()
		return errors.New("embedded nats-server did not become ready")
	}
	defer func() {
		natsServer.Shutdown()
		natsServer.WaitForShutdown()
	}()

	connection, err := nats.Connect("", nats.InProcessServer(natsServer))
	if err != nil {
		return fmt.Errorf("connect to embedded nats-server: %w", err)
	}
	defer connection.Close()

	js, err := jetstream.New(connection)
	if err != nil {
		return fmt.Errorf("create JetStream context: %w", err)
	}

	writer := bufio.NewWriter(os.Stdout)
	encoder := json.NewEncoder(writer)
	if err := encoder.Encode(struct {
		Ready bool `json:"ready"`
	}{Ready: true}); err != nil {
		return fmt.Errorf("write ready response: %w", err)
	}
	if err := writer.Flush(); err != nil {
		return fmt.Errorf("flush ready response: %w", err)
	}

	daemon := &daemon{
		js:        js,
		journals:  make(map[string]*journal.Journal),
		effectors: make(map[string]*effector.Effector),
	}
	scanner := bufio.NewScanner(os.Stdin)
	scanner.Buffer(make([]byte, 64*1024), maximumLineBytes)
	ctx := context.Background()
	for scanner.Scan() {
		response := daemon.serve(ctx, scanner.Bytes())
		if err := encoder.Encode(response); err != nil {
			return fmt.Errorf("write response: %w", err)
		}
		if err := writer.Flush(); err != nil {
			return fmt.Errorf("flush response: %w", err)
		}
	}
	if err := scanner.Err(); err != nil {
		return fmt.Errorf("read request: %w", err)
	}
	return nil
}

func main() {
	storeDir := flag.String("store", "", "JetStream file storage directory")
	flag.Parse()
	if *storeDir == "" {
		fmt.Fprintln(os.Stderr, "journald: --store is required")
		os.Exit(2)
	}
	if err := run(*storeDir); err != nil {
		fmt.Fprintf(os.Stderr, "journald: %v\n", err)
		os.Exit(1)
	}
}
