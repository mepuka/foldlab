package substrate

import (
	"context"
	"errors"
	"fmt"
	"go/ast"
	"go/parser"
	"go/token"
	"io/fs"
	"path/filepath"
	"runtime"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/nats-io/nats-server/v2/server"
	"github.com/nats-io/nats.go"
	"github.com/nats-io/nats.go/jetstream"

	"foldlab/effector"
)

const assumptionTimeout = 30 * time.Second
const permissionRefusalTimeout = 10 * time.Second

func startSingleFileJetStream(t *testing.T) jetstream.JetStream {
	t.Helper()

	natsServer, err := server.NewServer(&server.Options{
		ServerName: "substrate-assumption-gate",
		JetStream:  true,
		StoreDir:   t.TempDir(),
		DontListen: true,
		NoSigs:     true,
	})
	if err != nil {
		t.Fatalf("new embedded server: %v", err)
	}
	go natsServer.Start()
	if !natsServer.ReadyForConnections(10 * time.Second) {
		natsServer.Shutdown()
		natsServer.WaitForShutdown()
		t.Fatal("embedded server not ready")
	}
	t.Cleanup(func() {
		natsServer.Shutdown()
		natsServer.WaitForShutdown()
	})

	conn, err := nats.Connect("", nats.InProcessServer(natsServer))
	if err != nil {
		t.Fatalf("connect in-process: %v", err)
	}
	t.Cleanup(conn.Close)

	js, err := jetstream.New(conn)
	if err != nil {
		t.Fatalf("create JetStream context: %v", err)
	}
	return js
}

func assumptionContext(t *testing.T) context.Context {
	t.Helper()
	ctx, cancel := context.WithTimeout(context.Background(), assumptionTimeout)
	t.Cleanup(cancel)
	return ctx
}

func createAssumptionBucket(t *testing.T, js jetstream.JetStream, name string) jetstream.KeyValue {
	t.Helper()
	kv, err := js.CreateKeyValue(assumptionContext(t), jetstream.KeyValueConfig{
		Bucket:   name,
		History:  1,
		Storage:  jetstream.FileStorage,
		Replicas: 1,
	})
	if err != nil {
		t.Fatalf("create assumption bucket %s: %v", name, err)
	}
	return kv
}

type permissionedJetStream struct {
	admin             jetstream.JetStream
	application       *nats.Conn
	applicationErrors <-chan error
}

func startPermissionedFileJetStream(t *testing.T) permissionedJetStream {
	t.Helper()

	natsServer, err := server.NewServer(&server.Options{
		ServerName: "substrate-terminal-permission-gate",
		JetStream:  true,
		StoreDir:   t.TempDir(),
		DontListen: true,
		NoSigs:     true,
		NoAuthUser: "application",
		Users: []*server.User{
			{Username: "admin", Password: "admin"},
			{
				Username: "application",
				Password: "application",
				Permissions: &server.Permissions{
					Publish: &server.SubjectPermission{Allow: []string{"flb.req.>", "flb.ing.>"}},
					Subscribe: &server.SubjectPermission{
						Allow: []string{"_INBOX.>"},
					},
				},
			},
		},
	})
	if err != nil {
		t.Fatalf("new permissioned embedded server: %v", err)
	}
	go natsServer.Start()
	if !natsServer.ReadyForConnections(10 * time.Second) {
		natsServer.Shutdown()
		natsServer.WaitForShutdown()
		t.Fatal("permissioned embedded server not ready")
	}
	t.Cleanup(func() {
		natsServer.Shutdown()
		natsServer.WaitForShutdown()
	})

	adminConn, err := nats.Connect(
		"",
		nats.InProcessServer(natsServer),
		nats.UserInfo("admin", "admin"),
	)
	if err != nil {
		t.Fatalf("connect admin credential: %v", err)
	}
	t.Cleanup(adminConn.Close)
	admin, err := jetstream.New(adminConn)
	if err != nil {
		t.Fatalf("create admin JetStream context: %v", err)
	}

	applicationErrors := make(chan error, 8)
	applicationConn, err := nats.Connect(
		"",
		nats.InProcessServer(natsServer),
		nats.UserInfo("application", "application"),
		nats.ErrorHandler(func(_ *nats.Conn, _ *nats.Subscription, err error) {
			applicationErrors <- err
		}),
	)
	if err != nil {
		t.Fatalf("connect application credential: %v", err)
	}
	t.Cleanup(applicationConn.Close)

	return permissionedJetStream{
		admin:             admin,
		application:       applicationConn,
		applicationErrors: applicationErrors,
	}
}

func TestAtomicCreateIfAbsent(t *testing.T) {
	const contenders = 32

	ctx := assumptionContext(t)
	kv := createAssumptionBucket(t, startSingleFileJetStream(t), "ASSUME_CREATE")
	start := make(chan struct{})
	type result struct {
		contender        int
		winnerRevision   uint64
		observedRevision uint64
		err              error
	}
	results := make(chan result, contenders)

	var workers sync.WaitGroup
	for contender := range contenders {
		workers.Add(1)
		go func() {
			defer workers.Done()
			<-start
			revision, err := kv.Create(ctx, "one-key", []byte(fmt.Sprintf("contender-%d", contender)))
			if err == nil {
				results <- result{contender: contender, winnerRevision: revision}
				return
			}
			if !errors.Is(err, jetstream.ErrKeyExists) {
				results <- result{contender: contender, err: err}
				return
			}
			entry, readErr := kv.Get(ctx, "one-key")
			if readErr != nil {
				results <- result{contender: contender, err: fmt.Errorf("read winner after losing create: %w", readErr)}
				return
			}
			results <- result{contender: contender, observedRevision: entry.Revision()}
		}()
	}
	close(start)
	workers.Wait()
	close(results)

	var winner *result
	losers := make([]result, 0, contenders-1)
	for got := range results {
		if got.err != nil {
			t.Fatalf("contender %d: %v", got.contender, got.err)
		}
		if got.winnerRevision != 0 {
			if winner != nil {
				t.Fatalf("creates had multiple winners: contenders %d and %d", winner.contender, got.contender)
			}
			copy := got
			winner = &copy
			continue
		}
		losers = append(losers, got)
	}
	if winner == nil {
		t.Fatal("concurrent creates had no winner")
	}
	if len(losers) != contenders-1 {
		t.Fatalf("concurrent creates had %d losers, want %d", len(losers), contenders-1)
	}
	for _, loser := range losers {
		if loser.observedRevision != winner.winnerRevision {
			t.Fatalf(
				"loser %d observed revision %d, want winner revision %d",
				loser.contender,
				loser.observedRevision,
				winner.winnerRevision,
			)
		}
	}
}

func TestRevisionCAS(t *testing.T) {
	ctx := assumptionContext(t)
	kv := createAssumptionBucket(t, startSingleFileJetStream(t), "ASSUME_CAS")

	createdRevision, err := kv.Create(ctx, "one-key", []byte("created"))
	if err != nil {
		t.Fatalf("create: %v", err)
	}
	updatedRevision, err := kv.Update(ctx, "one-key", []byte("updated"), createdRevision)
	if err != nil {
		t.Fatalf("update at current revision %d: %v", createdRevision, err)
	}
	if updatedRevision <= createdRevision {
		t.Fatalf("successful write did not move revision: create=%d update=%d", createdRevision, updatedRevision)
	}

	for attempt := range 16 {
		if revision, err := kv.Update(ctx, "one-key", []byte("stale"), createdRevision); !errors.Is(err, jetstream.ErrKeyRevisionMismatch) {
			t.Fatalf("stale CAS attempt %d: revision=%d err=%v, want ErrKeyRevisionMismatch", attempt, revision, err)
		}
	}

	start := make(chan struct{})
	type raceResult struct {
		revision uint64
		err      error
	}
	results := make(chan raceResult, 2)
	var racers sync.WaitGroup
	for contender := range 2 {
		racers.Add(1)
		go func() {
			defer racers.Done()
			<-start
			revision, err := kv.Update(
				ctx,
				"one-key",
				[]byte(fmt.Sprintf("racer-%d", contender)),
				updatedRevision,
			)
			results <- raceResult{revision: revision, err: err}
		}()
	}
	close(start)
	racers.Wait()
	close(results)

	winners := 0
	losers := 0
	var raceRevision uint64
	for got := range results {
		switch {
		case got.err == nil:
			winners++
			raceRevision = got.revision
		case errors.Is(got.err, jetstream.ErrKeyRevisionMismatch):
			losers++
		default:
			t.Fatalf("CAS race returned unexpected error: %v", got.err)
		}
	}
	if winners != 1 || losers != 1 {
		t.Fatalf("CAS race had %d winners and %d revision-mismatch losers, want exactly one each", winners, losers)
	}
	if raceRevision <= updatedRevision {
		t.Fatalf("race winner did not move revision: before=%d after=%d", updatedRevision, raceRevision)
	}
	entry, err := kv.Get(ctx, "one-key")
	if err != nil {
		t.Fatalf("read race winner: %v", err)
	}
	if entry.Revision() != raceRevision {
		t.Fatalf("latest revision=%d, want race winner revision=%d", entry.Revision(), raceRevision)
	}
}

func TestLinearizableReads(t *testing.T) {
	const (
		writers         = 8
		writesPerWriter = 64
	)

	ctx := assumptionContext(t)
	kv := createAssumptionBucket(t, startSingleFileJetStream(t), "ASSUME_READ")
	if _, err := kv.Create(ctx, "one-key", []byte("initial")); err != nil {
		t.Fatalf("create: %v", err)
	}

	start := make(chan struct{})
	failures := make(chan error, writers)
	var workers sync.WaitGroup
	for writer := range writers {
		workers.Add(1)
		go func() {
			defer workers.Done()
			<-start
			for write := range writesPerWriter {
				for {
					before, err := kv.Get(ctx, "one-key")
					if err != nil {
						failures <- fmt.Errorf("writer %d read before write %d: %w", writer, write, err)
						return
					}
					acknowledgedRevision, err := kv.Update(
						ctx,
						"one-key",
						[]byte(fmt.Sprintf("writer-%d-write-%d", writer, write)),
						before.Revision(),
					)
					if errors.Is(err, jetstream.ErrKeyRevisionMismatch) {
						continue
					}
					if err != nil {
						failures <- fmt.Errorf("writer %d write %d: %w", writer, write, err)
						return
					}

					after, err := kv.Get(ctx, "one-key")
					if err != nil {
						failures <- fmt.Errorf("writer %d read after acknowledged write %d: %w", writer, write, err)
						return
					}
					if after.Revision() < acknowledgedRevision {
						failures <- fmt.Errorf(
							"writer %d read revision %d after acknowledgement of revision %d",
							writer,
							after.Revision(),
							acknowledgedRevision,
						)
						return
					}
					break
				}
			}
		}()
	}
	close(start)
	workers.Wait()
	close(failures)

	for err := range failures {
		t.Error(err)
	}
}

func TestTerminalImmutability(t *testing.T) {
	assertNoDestructiveRegisterCallSites(t)
	harness := startPermissionedFileJetStream(t)
	cases := []struct {
		name       string
		digestByte string
		headers    nats.Header
		admin      func(context.Context, jetstream.KeyValue, string, uint64) error
	}{
		{
			name:       "delete",
			digestByte: "a",
			headers:    nats.Header{"KV-Operation": []string{"DEL"}},
			admin: func(ctx context.Context, kv jetstream.KeyValue, key string, revision uint64) error {
				return kv.Delete(ctx, key, jetstream.LastRevision(revision))
			},
		},
		{
			name:       "purge",
			digestByte: "b",
			headers: nats.Header{
				"KV-Operation":      []string{"PURGE"},
				jetstream.MsgRollup: []string{jetstream.MsgRollupSubject},
			},
			admin: func(ctx context.Context, kv jetstream.KeyValue, key string, revision uint64) error {
				return kv.Purge(ctx, key, jetstream.LastRevision(revision))
			},
		},
	}

	for _, tc := range cases {
		t.Run("application credential is refused "+tc.name, func(t *testing.T) {
			ctx := assumptionContext(t)
			digest := strings.Repeat(tc.digestByte, 64)
			name := "protected_" + tc.name
			e, err := effector.Open(ctx, harness.admin, name)
			if err != nil {
				t.Fatalf("open effector: %v", err)
			}
			claim, err := e.Claim(ctx, digest, "owner", time.Minute)
			if err != nil {
				t.Fatalf("claim: %v", err)
			}
			if first, err := e.Commit(ctx, claim, "result"); err != nil || !first {
				t.Fatalf("commit terminal outcome: first=%v err=%v", first, err)
			}

			kv, err := harness.admin.KeyValue(ctx, "E_"+name)
			if err != nil {
				t.Fatalf("open backing bucket: %v", err)
			}
			key := "work." + digest
			terminal, err := kv.Get(ctx, key)
			if err != nil {
				t.Fatalf("read terminal outcome: %v", err)
			}
			if !strings.Contains(string(terminal.Value()), `"tag":"done"`) {
				t.Fatalf("authority key does not hold Done: %s", terminal.Value())
			}

			msg := nats.NewMsg("$KV.E_" + name + "." + key)
			msg.Header = tc.headers
			msg.Header.Set(
				jetstream.ExpectedLastSubjSeqHeader,
				fmt.Sprintf("%d", terminal.Revision()),
			)
			if err := harness.application.PublishMsg(msg); err != nil {
				t.Fatalf("application publish returned before server authorization: %v", err)
			}
			if err := harness.application.FlushTimeout(time.Second); err != nil {
				t.Fatalf("flush application %s attempt: %v", tc.name, err)
			}
			select {
			case permissionErr := <-harness.applicationErrors:
				if !errors.Is(permissionErr, nats.ErrPermissionViolation) {
					t.Fatalf("application %s error=%v, want ErrPermissionViolation", tc.name, permissionErr)
				}
				if !strings.Contains(permissionErr.Error(), msg.Subject) {
					t.Fatalf("permission error does not name protected subject %q: %v", msg.Subject, permissionErr)
				}
			case <-time.After(permissionRefusalTimeout):
				t.Fatalf("application %s produced no permission refusal", tc.name)
			}

			state, outcome, err := e.Lookup(ctx, digest)
			if err != nil {
				t.Fatalf("lookup after refused application %s: %v", tc.name, err)
			}
			if state != effector.Committed || outcome.Result != "result" || outcome.Fence != claim.Fence {
				t.Fatalf("application %s moved Done: state=%s outcome=%+v", tc.name, state, outcome)
			}
		})

		t.Run("admin negative control "+tc.name+" succeeds", func(t *testing.T) {
			ctx := assumptionContext(t)
			digest := strings.Repeat(tc.digestByte, 64)
			name := "admin_" + tc.name
			e, err := effector.Open(ctx, harness.admin, name)
			if err != nil {
				t.Fatalf("open effector: %v", err)
			}
			claim, err := e.Claim(ctx, digest, "owner", time.Minute)
			if err != nil {
				t.Fatalf("claim: %v", err)
			}
			if first, err := e.Commit(ctx, claim, "result"); err != nil || !first {
				t.Fatalf("commit terminal outcome: first=%v err=%v", first, err)
			}
			kv, err := harness.admin.KeyValue(ctx, "E_"+name)
			if err != nil {
				t.Fatalf("open backing bucket: %v", err)
			}
			key := "work." + digest
			terminal, err := kv.Get(ctx, key)
			if err != nil {
				t.Fatalf("read terminal outcome: %v", err)
			}
			if err := tc.admin(ctx, kv, key, terminal.Revision()); err != nil {
				t.Fatalf("admin %s must succeed as negative control: %v", tc.name, err)
			}
			if _, err := kv.Get(ctx, key); !errors.Is(err, jetstream.ErrKeyNotFound) {
				t.Fatalf("admin %s result=%v, want ErrKeyNotFound", tc.name, err)
			}
			state, _, err := e.Lookup(ctx, digest)
			if err != nil || state != effector.Unclaimed {
				t.Fatalf("lookup after admin %s: state=%s err=%v, want Unclaimed", tc.name, state, err)
			}
			replacement, err := e.Claim(ctx, digest, "new-owner", time.Minute)
			if err != nil || replacement.Fence != 1 {
				t.Fatalf("replacement after admin %s: claim=%+v err=%v, want fence 1", tc.name, replacement, err)
			}
		})
	}
}

func assertNoDestructiveRegisterCallSites(t *testing.T) {
	t.Helper()
	_, file, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatal("locate substrate source")
	}
	repositoryRoot := filepath.Clean(filepath.Join(filepath.Dir(file), "..", ".."))
	directories := []string{
		filepath.Join(repositoryRoot, "go", "effector"),
		filepath.Join(repositoryRoot, "go", "daemon"),
		filepath.Join(repositoryRoot, "proto", "go", "protod"),
	}
	forbidden := map[string]struct{}{
		"Delete":         {},
		"Purge":          {},
		"PurgeDeletes":   {},
		"DeleteKeyValue": {},
		"DeleteStream":   {},
	}

	for _, directory := range directories {
		err := filepath.WalkDir(directory, func(path string, entry fs.DirEntry, walkErr error) error {
			if walkErr != nil {
				return walkErr
			}
			if entry.IsDir() || !strings.HasSuffix(entry.Name(), ".go") || strings.HasSuffix(entry.Name(), "_test.go") {
				return nil
			}

			positions := token.NewFileSet()
			file, err := parser.ParseFile(positions, path, nil, 0)
			if err != nil {
				return err
			}
			ast.Inspect(file, func(node ast.Node) bool {
				call, ok := node.(*ast.CallExpr)
				if !ok {
					return true
				}
				selector, ok := call.Fun.(*ast.SelectorExpr)
				if !ok {
					return true
				}
				if _, destructive := forbidden[selector.Sel.Name]; destructive {
					position := positions.Position(selector.Sel.Pos())
					t.Errorf(
						"destructive register call %s at %s:%d",
						selector.Sel.Name,
						position.Filename,
						position.Line,
					)
				}
				return true
			})
			return nil
		})
		if err != nil {
			t.Fatalf("scan production directory %s: %v", directory, err)
		}
	}
}
