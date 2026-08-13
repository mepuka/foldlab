package protod_test

import (
	"context"
	"errors"
	"strings"
	"testing"
	"time"

	"github.com/nats-io/nats.go"
	"github.com/nats-io/nats.go/jetstream"

	"foldlab/proto/protod"
)

func TestAcquireRefusesClusteredJetStream(t *testing.T) {
	daemon, err := protod.Acquire(context.Background(), protod.Options{
		StoreDir:           t.TempDir(),
		JetStreamClustered: true,
	})
	if daemon != nil {
		daemon.Release()
		t.Fatal("Acquire returned a daemon for clustered JetStream")
	}
	assertLifecycleRefusal(t, err, protod.AssumptionLinearizableReads, "clustered JetStream")
}

func TestAcquireRefusesReplicatedKeyValueBuckets(t *testing.T) {
	daemon, err := protod.Acquire(context.Background(), protod.Options{
		StoreDir:   t.TempDir(),
		KVReplicas: 3,
	})
	if daemon != nil {
		daemon.Release()
		t.Fatal("Acquire returned a daemon for R>1 KV buckets")
	}
	assertLifecycleRefusal(t, err, protod.AssumptionLinearizableReads, "R>1 KV buckets")
}

func TestAcquireRefusesInMemoryStorage(t *testing.T) {
	daemon, err := protod.Acquire(context.Background(), protod.Options{
		StoreDir:      t.TempDir(),
		MemoryStorage: true,
	})
	if daemon != nil {
		daemon.Release()
		t.Fatal("Acquire returned a daemon for in-memory storage")
	}
	assertLifecycleRefusal(t, err, protod.AssumptionTerminalImmutability, "in-memory storage")
}

func TestAcquireProtectsRegisterBucketsFromApplicationCredentials(t *testing.T) {
	daemon, err := protod.Acquire(context.Background(), protod.Options{StoreDir: t.TempDir()})
	if err != nil {
		t.Fatalf("Acquire certified envelope: %v", err)
	}
	t.Cleanup(daemon.Release)

	permissionErrors := make(chan error, 2)
	application, err := nats.Connect(daemon.URL(), nats.ErrorHandler(func(
		_ *nats.Conn,
		_ *nats.Subscription,
		err error,
	) {
		permissionErrors <- err
	}))
	if err != nil {
		t.Fatalf("connect application credential: %v", err)
	}
	t.Cleanup(application.Close)

	for _, operation := range []struct {
		name    string
		headers nats.Header
	}{
		{name: "delete", headers: nats.Header{"KV-Operation": []string{"DEL"}}},
		{name: "purge", headers: nats.Header{
			"KV-Operation":      []string{"PURGE"},
			jetstream.MsgRollup: []string{jetstream.MsgRollupSubject},
		}},
	} {
		msg := nats.NewMsg("$KV.E_protected.work." + strings.Repeat("a", 64))
		msg.Header = operation.headers
		if err := application.PublishMsg(msg); err != nil {
			t.Fatalf("application %s publish returned before authorization: %v", operation.name, err)
		}
		if err := application.FlushTimeout(time.Second); err != nil {
			t.Fatalf("flush application %s: %v", operation.name, err)
		}
		select {
		case permissionErr := <-permissionErrors:
			if !errors.Is(permissionErr, nats.ErrPermissionViolation) {
				t.Fatalf("application %s err=%v, want ErrPermissionViolation", operation.name, permissionErr)
			}
			if !strings.Contains(permissionErr.Error(), msg.Subject) {
				t.Fatalf("application %s refusal does not name %q: %v", operation.name, msg.Subject, permissionErr)
			}
		case <-time.After(10 * time.Second):
			t.Fatalf("application %s was not refused", operation.name)
		}
	}
}

func TestAcquireContextBoundsJournalHandlers(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	daemon, err := protod.Acquire(ctx, protod.Options{
		StoreDir:       t.TempDir(),
		RequestTimeout: time.Second,
	})
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(daemon.Release)

	client, err := nats.Connect(daemon.URL())
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(client.Close)
	cancel()
	_, err = client.Request(
		protod.SubjectJournalRead,
		[]byte(`{"journal":"catalog"}`),
		100*time.Millisecond,
	)
	if !errors.Is(err, nats.ErrTimeout) {
		t.Fatalf("journal request after daemon context cancellation = %v, want nats.ErrTimeout", err)
	}
}

func assertLifecycleRefusal(
	t *testing.T,
	err error,
	assumption protod.Assumption,
	configuration string,
) {
	t.Helper()
	if !errors.Is(err, protod.ErrOutsideCertifiedEnvelope) {
		t.Fatalf("Acquire err=%v, want ErrOutsideCertifiedEnvelope", err)
	}
	var lifecycleErr *protod.LifecycleError
	if !errors.As(err, &lifecycleErr) {
		t.Fatalf("Acquire err=%T %v, want *LifecycleError", err, err)
	}
	if lifecycleErr.Assumption != assumption {
		t.Fatalf("lifecycle assumption=%q, want %q", lifecycleErr.Assumption, assumption)
	}
	if lifecycleErr.Configuration != configuration {
		t.Fatalf("lifecycle configuration=%q, want %q", lifecycleErr.Configuration, configuration)
	}
	if !strings.Contains(err.Error(), string(assumption)) {
		t.Fatalf("typed lifecycle error does not name assumption %q: %v", assumption, err)
	}
}
