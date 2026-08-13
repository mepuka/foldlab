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

func TestAcquireRestrictsApplicationPublishToThePublicWrit(t *testing.T) {
	daemon, err := protod.Acquire(context.Background(), protod.Options{StoreDir: t.TempDir()})
	if err != nil {
		t.Fatalf("Acquire certified envelope: %v", err)
	}
	t.Cleanup(daemon.Release)

	permissionErrors := make(chan error, 3)
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
		subject string
		headers nats.Header
	}{
		{
			name:    "delete",
			subject: "$KV.E_protected.work." + strings.Repeat("a", 64),
			headers: nats.Header{"KV-Operation": []string{"DEL"}},
		},
		{name: "purge", subject: "$KV.E_protected.work." + strings.Repeat("a", 64), headers: nats.Header{
			"KV-Operation":      []string{"PURGE"},
			jetstream.MsgRollup: []string{jetstream.MsgRollupSubject},
		}},
		{name: "forged-reply", subject: "_INBOX.victim.forged"},
	} {
		msg := nats.NewMsg(operation.subject)
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

func TestApplicationConnectionsCannotEavesdropReplyOrJetStreamTraffic(t *testing.T) {
	daemon, err := protod.Acquire(context.Background(), protod.Options{StoreDir: t.TempDir()})
	if err != nil {
		t.Fatalf("Acquire certified envelope: %v", err)
	}
	t.Cleanup(daemon.Release)

	spy, err := nats.Connect(daemon.URL())
	if err != nil {
		t.Fatalf("connect spying application: %v", err)
	}
	t.Cleanup(spy.Close)
	spyInbox, err := spy.SubscribeSync("_INBOX.>")
	if err != nil {
		t.Fatalf("subscribe spying application to inbox wildcard: %v", err)
	}
	if err := spy.FlushTimeout(time.Second); err != nil {
		t.Fatalf("flush spying subscription: %v", err)
	}

	victim, err := nats.Connect(daemon.URL())
	if err != nil {
		t.Fatalf("connect victim application: %v", err)
	}
	t.Cleanup(victim.Close)
	reply, err := victim.Request(
		"flb.req.type.create",
		[]byte(`{"structure":{"k":"string"}}`),
		5*time.Second,
	)
	if err != nil {
		t.Fatalf("victim's own request/reply failed: %v", err)
	}
	if !strings.Contains(string(reply.Data), `"ok":true`) {
		t.Fatalf("victim received non-ok reply: %s", reply.Data)
	}
	reply, err = victim.Request(
		"flb.req.journal.read",
		[]byte(`{"journal":"catalog","from":{"seq":-1,"head":"0000000000000000000000000000000000000000000000000000000000000000"},"max":0}`),
		5*time.Second,
	)
	if err != nil {
		t.Fatalf("victim's own read request/reply failed: %v", err)
	}
	if !strings.Contains(string(reply.Data), `"ok":true`) {
		t.Fatalf("victim received non-ok read reply: %s", reply.Data)
	}

	var sawApplicationReply, sawJetStreamControl bool
	deadline := time.Now().Add(500 * time.Millisecond)
	for time.Now().Before(deadline) {
		message, nextErr := spyInbox.NextMsg(time.Until(deadline))
		if errors.Is(nextErr, nats.ErrTimeout) {
			break
		}
		if nextErr != nil {
			t.Fatalf("read spying inbox: %v", nextErr)
		}
		body := string(message.Data)
		if strings.Contains(body, `"ok":true`) &&
			(strings.Contains(body, `"created":true`) || strings.Contains(body, `"journal":"catalog"`)) {
			sawApplicationReply = true
		}
		if strings.Contains(body, "io.nats.jetstream.api") {
			sawJetStreamControl = true
		}
	}
	if sawApplicationReply || sawJetStreamControl {
		t.Fatalf(
			"application inbox wildcard eavesdropped traffic: application-reply=%t jetstream-control=%t",
			sawApplicationReply,
			sawJetStreamControl,
		)
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
