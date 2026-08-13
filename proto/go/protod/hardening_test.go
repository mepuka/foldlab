package protod

import (
	"bytes"
	"context"
	"strings"
	"testing"
)

func TestPowerDurableSetsPinnedServerSyncAlways(t *testing.T) {
	daemon, err := Acquire(context.Background(), Options{
		StoreDir: t.TempDir(), SyncMode: SyncPowerDurable,
	})
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(daemon.Release)
	if !daemon.server.JetStreamConfig().SyncAlways {
		t.Fatal("power-durable did not set server.Options.SyncAlways")
	}
}

func TestCrashDurableLeavesPinnedServerSyncAlwaysDisabled(t *testing.T) {
	daemon, err := Acquire(context.Background(), Options{
		StoreDir: t.TempDir(), SyncMode: SyncCrashDurable,
	})
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(daemon.Release)
	if daemon.server.JetStreamConfig().SyncAlways {
		t.Fatal("crash-durable unexpectedly set server.Options.SyncAlways")
	}
}

func TestNATSLogSinkCountsAndSurfacesIPQDrops(t *testing.T) {
	var output bytes.Buffer
	sink := newNATSLogSink(&output)
	sink.Warnf("JetStream API queue limit reached, dropping %d requests", 7)
	sink.Warnf("JetStream API queue limit reached, dropping %d requests", 5)
	if got := sink.droppedTotal(); got != 12 {
		t.Fatalf("drop total=%d, want 12", got)
	}
	logged := output.String()
	if !strings.Contains(logged, "ipq_drops_total=7") || !strings.Contains(logged, "ipq_drops_total=12") {
		t.Fatalf("drop totals are not visible in logs: %q", logged)
	}
}
