package register_test

import (
	"bufio"
	"encoding/json"
	"errors"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/nats-io/nats-server/v2/server"
	"github.com/nats-io/nats.go"

	"foldlab/register"
)

type action struct {
	Kind    string `json:"kind"`
	Holder  string `json:"holder"`
	Token   uint64 `json:"token"`
	Outcome string `json:"outcome"`
}

type traceState struct {
	Fields     register.State  `json:"fields"`
	Index      int             `json:"index"`
	Transition json.RawMessage `json:"transition"`
}

type row struct {
	ID    string `json:"id"`
	Trace struct {
		States []traceState `json:"states"`
	} `json:"trace"`
	Attempt  action         `json:"attempt"`
	Verdict  string         `json:"verdict"`
	Law      string         `json:"law"`
	Observed register.State `json:"observed"`
}

func corpus(t *testing.T) []row {
	t.Helper()
	path := filepath.Join("..", "..", "packages", "plait", "fixtures", "register-traces.ndjson")
	f, err := os.Open(path)
	if err != nil {
		t.Fatal(err)
	}
	defer f.Close()
	scanner := bufio.NewScanner(f)
	if !scanner.Scan() {
		t.Fatal("missing provenance header")
	}
	var header struct {
		Provenance string `json:"provenance"`
		Rows       int    `json:"rows"`
	}
	if err := json.Unmarshal(scanner.Bytes(), &header); err != nil {
		t.Fatal(err)
	}
	if header.Rows != 15 {
		t.Fatalf("corpus count = %d, want 15", header.Rows)
	}
	var rows []row
	for scanner.Scan() {
		var r row
		if err := json.Unmarshal(scanner.Bytes(), &r); err != nil {
			t.Fatal(err)
		}
		rows = append(rows, r)
	}
	if err := scanner.Err(); err != nil {
		t.Fatal(err)
	}
	if len(rows) != header.Rows {
		t.Fatalf("decoded %d rows, want %d", len(rows), header.Rows)
	}
	return rows
}

func start(t *testing.T) (*register.Client, nats.JetStreamContext) {
	t.Helper()
	srv, err := server.NewServer(&server.Options{
		ServerName: "plait-register-test", JetStream: true, StoreDir: t.TempDir(),
		DontListen: true, NoLog: true, NoSigs: true,
	})
	if err != nil {
		t.Fatal(err)
	}
	go srv.Start()
	if !srv.ReadyForConnections(10 * time.Second) {
		t.Fatal("embedded NATS v2.14.4 did not become ready")
	}
	t.Cleanup(func() { srv.Shutdown(); srv.WaitForShutdown() })
	nc, err := nats.Connect("", nats.InProcessServer(srv))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(nc.Close)
	js, err := nc.JetStream()
	if err != nil {
		t.Fatal(err)
	}
	client, err := register.Open(nc)
	if err != nil {
		t.Fatal(err)
	}
	return client, js
}

func invoke(c *register.Client, work string, a action) (register.State, error) {
	switch a.Kind {
	case "grant":
		return c.Grant(work, a.Holder)
	case "renew":
		return c.Renew(work, a.Token)
	case "commit":
		return c.Commit(work, a.Token, a.Outcome)
	case "expire-steal":
		return c.ExpireSteal(work, a.Holder)
	case "observe":
		return c.Observe(work)
	default:
		return register.State{}, errors.New("unknown action " + a.Kind)
	}
}

func decodeTransition(t *testing.T, raw json.RawMessage) action {
	t.Helper()
	var a action
	if err := json.Unmarshal(raw, &a); err != nil {
		t.Fatal(err)
	}
	return a
}

func TestVeilCorpusReplayWall(t *testing.T) {
	rows := corpus(t)
	replayed := 0
	for _, r := range rows {
		r := r
		t.Run(r.ID, func(t *testing.T) {
			client, _ := start(t)
			const work = "0123456789abcdef"
			for _, step := range r.Trace.States[1:] {
				got, err := invoke(client, work, decodeTransition(t, step.Transition))
				if err != nil {
					t.Fatalf("prefix: %v", err)
				}
				if !statesEqual(got, step.Fields) {
					t.Fatalf("prefix state = %#v, want %#v", got, step.Fields)
				}
			}
			got, err := invoke(client, work, r.Attempt)
			if (err == nil) != (r.Verdict == "accepted") {
				t.Fatalf("verdict err=%v, want %s", err, r.Verdict)
			}
			if err != nil {
				var refusal *register.Refusal
				if !errors.As(err, &refusal) || refusal.Law != r.Law {
					t.Fatalf("refusal = %v, want law %q", err, r.Law)
				}
				got, err = client.Observe(work)
				if err != nil {
					t.Fatal(err)
				}
			}
			if !statesEqual(got, r.Observed) {
				t.Fatalf("observed = %#v, want %#v", got, r.Observed)
			}
			history, err := client.History(work)
			if err != nil && !errors.Is(err, nats.ErrKeyNotFound) {
				t.Fatal(err)
			}
			landed := 0
			for _, entry := range history {
				var value struct {
					Outcome *register.Outcome `json:"outcome"`
				}
				if err := json.Unmarshal(entry.Value(), &value); err != nil {
					t.Fatal(err)
				}
				if value.Outcome != nil {
					landed++
					if value.Outcome.Value == "zombie" {
						t.Fatal("zombie outcome landed")
					}
				}
			}
			if landed > 1 {
				t.Fatalf("landed outcomes = %d, want <= 1", landed)
			}
		})
		replayed++
	}
	if replayed != 15 {
		t.Fatalf("replayed %d rows, want 15", replayed)
	}
}

func statesEqual(a, b register.State) bool {
	ab, _ := json.Marshal(a)
	bb, _ := json.Marshal(b)
	return string(ab) == string(bb)
}

// requireWrongLastSequence asserts the frozen DEV-704 classification: every
// wrong-last-sequence refusal carries API code 10071, and the operation
// context picks the sentinel (Create matches ErrKeyExists; Update wraps
// ErrKeyRevisionMismatch while still matching ErrKeyExists).
func requireWrongLastSequence(t *testing.T, err error, sentinel error, context string) {
	t.Helper()
	if !errors.Is(err, sentinel) {
		t.Fatalf("%s error = %v, want %v", context, err, sentinel)
	}
	var apiErr *nats.APIError
	if !errors.As(err, &apiErr) {
		t.Fatalf("%s error = %v, want a JetStream APIError in the chain", context, err)
	}
	if apiErr.ErrorCode != nats.JSErrCodeStreamWrongLastSequence {
		t.Fatalf("%s API code = %d, want %d", context, apiErr.ErrorCode, nats.JSErrCodeStreamWrongLastSequence)
	}
}

func TestSubstrateCASProbes(t *testing.T) {
	_, js := start(t)
	kv, err := js.KeyValue(register.Bucket)
	if err != nil {
		t.Fatal(err)
	}
	first, err := kv.Create("probe", []byte("one"))
	if err != nil {
		t.Fatal(err)
	}
	_, err = kv.Create("probe", []byte("two"))
	if err == nil {
		t.Fatal("duplicate create succeeded")
	}
	requireWrongLastSequence(t, err, nats.ErrKeyExists, "duplicate create")
	second, err := kv.Update("probe", []byte("two"), first)
	if err != nil || second <= first {
		t.Fatalf("fresh update = (%d, %v), want larger token", second, err)
	}
	_, err = kv.Update("probe", []byte("zombie"), first)
	if err == nil {
		t.Fatal("stale update succeeded")
	}
	requireWrongLastSequence(t, err, nats.ErrKeyRevisionMismatch, "stale update")
}
