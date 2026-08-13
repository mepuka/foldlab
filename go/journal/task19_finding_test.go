//go:build task19finding

package journal_test

import (
	"errors"
	"testing"
	"time"

	"github.com/nats-io/nats.go"

	"foldlab/journal"
)

// TestTask19FindingBatchGetRequiresAllowDirect is intentionally red evidence
// for Task 19's conflicting requirements. At the pinned nats-server v2.14.4,
// batch get is served only by $JS.API.DIRECT.GET.<stream>, whose subscription
// exists only when StreamConfig.AllowDirect is true. The journal shape gate is
// simultaneously required to deny AllowDirect, leaving no admitted batch-get
// path. Addendum 1 accepted this finding and ratified bounded pipelining of the
// ordinary per-message management API instead.
func TestTask19FindingBatchGetRequiresAllowDirect(t *testing.T) {
	js := startJetStream(t)
	opened, err := journal.Open(ctx(t), js, "task19_batch")
	if err != nil {
		t.Fatalf("open conforming journal: %v", err)
	}
	mustAppend(t, opened, "one")
	mustAppend(t, opened, "two")

	inbox := nats.NewInbox()
	replies, err := js.Conn().SubscribeSync(inbox)
	if err != nil {
		t.Fatalf("subscribe batch reply inbox: %v", err)
	}
	t.Cleanup(func() { _ = replies.Unsubscribe() })
	if err := js.Conn().PublishRequest(
		"$JS.API.DIRECT.GET.J_task19_batch",
		inbox,
		[]byte(`{"seq":1,"batch":2}`),
	); err != nil {
		t.Fatalf("publish batch get: %v", err)
	}
	if err := js.Conn().Flush(); err != nil {
		t.Fatalf("flush batch get: %v", err)
	}

	_, err = replies.NextMsg(250 * time.Millisecond)
	if errors.Is(err, nats.ErrTimeout) || errors.Is(err, nats.ErrNoResponders) {
		t.Fatal("FINDING T19-1: conforming AllowDirect=false journal has no batch-get responder")
	}
	if err != nil {
		t.Fatalf("batch get response: %v", err)
	}
}
