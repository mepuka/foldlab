package effector_test

import (
	"context"
	"fmt"
	"testing"
	"time"

	"github.com/nats-io/nats-server/v2/server"
	"github.com/nats-io/nats.go"
	"github.com/nats-io/nats.go/jetstream"

	"foldlab/effector"
)

func benchmarkEffector(b *testing.B, syncAlways bool) (*effector.Effector, func()) {
	b.Helper()
	s, err := server.NewServer(&server.Options{
		ServerName: "flb-effector-bench",
		JetStream:  true,
		StoreDir:   b.TempDir(),
		DontListen: true,
		NoLog:      true,
		NoSigs:     true,
		SyncAlways: syncAlways,
	})
	if err != nil {
		b.Fatal(err)
	}
	go s.Start()
	if !s.ReadyForConnections(10 * time.Second) {
		s.Shutdown()
		b.Fatal("embedded nats-server did not become ready")
	}
	nc, err := nats.Connect("", nats.InProcessServer(s), nats.Name("foldlab/bench effector"))
	if err != nil {
		s.Shutdown()
		b.Fatal(err)
	}
	js, err := jetstream.New(nc)
	if err != nil {
		nc.Close()
		s.Shutdown()
		b.Fatal(err)
	}
	opened, err := effector.Open(context.Background(), js, "bench")
	if err != nil {
		nc.Close()
		s.Shutdown()
		b.Fatal(err)
	}
	return opened, func() {
		nc.Close()
		s.Shutdown()
		s.WaitForShutdown()
	}
}

func BenchmarkEffectorClaim(b *testing.B) {
	for _, mode := range []struct {
		name       string
		syncAlways bool
	}{{"crash-durable", false}, {"power-durable", true}} {
		b.Run(mode.name, func(b *testing.B) {
			opened, closeServer := benchmarkEffector(b, mode.syncAlways)
			defer closeServer()
			ctx := context.Background()
			b.ReportAllocs()
			b.ResetTimer()
			for i := 0; i < b.N; i++ {
				if _, err := opened.Claim(ctx, fmt.Sprintf("%064x", i+1), "bench", time.Minute); err != nil {
					b.Fatal(err)
				}
			}
		})
	}
}

func BenchmarkEffectorCommit(b *testing.B) {
	for _, mode := range []struct {
		name       string
		syncAlways bool
	}{{"crash-durable", false}, {"power-durable", true}} {
		b.Run(mode.name, func(b *testing.B) {
			opened, closeServer := benchmarkEffector(b, mode.syncAlways)
			defer closeServer()
			ctx := context.Background()
			b.ReportAllocs()
			for i := 0; i < b.N; i++ {
				b.StopTimer()
				claim, err := opened.Claim(ctx, fmt.Sprintf("%064x", i+1), "bench", time.Minute)
				b.StartTimer()
				if err != nil {
					b.Fatal(err)
				}
				if first, err := opened.Commit(ctx, claim, "done"); err != nil || !first {
					b.Fatalf("commit first=%v: %v", first, err)
				}
			}
		})
	}
}
