package journal_test

import (
	"context"
	"fmt"
	"testing"
	"time"

	"github.com/nats-io/nats-server/v2/server"
	"github.com/nats-io/nats.go"
	"github.com/nats-io/nats.go/jetstream"

	"foldlab/canonical"
	"foldlab/journal"
)

func benchmarkJournal(b *testing.B, syncAlways bool) (*journal.Journal, func()) {
	b.Helper()
	s, err := server.NewServer(&server.Options{
		ServerName: "flb-journal-bench",
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
	nc, err := nats.Connect("", nats.InProcessServer(s), nats.Name("foldlab/bench journal"))
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
	opened, err := journal.Open(context.Background(), js, "bench")
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

func BenchmarkJournalAppend(b *testing.B) {
	for _, mode := range []struct {
		name       string
		syncAlways bool
	}{{"crash-durable", false}, {"power-durable", true}} {
		b.Run(mode.name, func(b *testing.B) {
			opened, closeServer := benchmarkJournal(b, mode.syncAlways)
			defer closeServer()
			ctx := context.Background()
			b.ReportAllocs()
			b.ResetTimer()
			for i := 0; i < b.N; i++ {
				if _, _, err := opened.Append(ctx, fmt.Sprintf("payload-%d", i)); err != nil {
					b.Fatal(err)
				}
			}
		})
	}
}

func BenchmarkJournalRead(b *testing.B) {
	const corpusSize = 1000
	for _, mode := range []struct {
		name       string
		syncAlways bool
	}{{"crash-durable", false}, {"power-durable", true}} {
		b.Run(mode.name, func(b *testing.B) {
			opened, closeServer := benchmarkJournal(b, mode.syncAlways)
			defer closeServer()
			ctx := context.Background()
			for i := 0; i < corpusSize; i++ {
				if _, _, err := opened.Append(ctx, fmt.Sprintf("payload-%d", i)); err != nil {
					b.Fatal(err)
				}
			}
			from := journal.Cursor{Seq: -1, Head: canonical.Genesis}
			b.ReportAllocs()
			b.ResetTimer()
			for i := 0; i < b.N; i++ {
				entries, _, err := opened.Read(ctx, from, corpusSize)
				if err != nil || len(entries) != corpusSize {
					b.Fatalf("read %d entries: %v", len(entries), err)
				}
			}
			b.ReportMetric(float64(b.N*corpusSize)/b.Elapsed().Seconds(), "entries/s")
		})
	}
}
