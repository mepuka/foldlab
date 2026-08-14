package protod

import (
	"context"
	"encoding/json"
	"fmt"
	"testing"

	"foldlab/canonical"
)

func TestCertifyCarriesTheCatalogSnapshotItCommittedUnder(t *testing.T) {
	daemon, err := Acquire(context.Background(), Options{
		StoreDir: t.TempDir(),
		Listen:   "127.0.0.1:0",
		SyncMode: SyncCrashDurable,
	})
	if err != nil {
		t.Fatalf("acquire daemon: %v", err)
	}
	t.Cleanup(daemon.Release)

	certificate, refusal, err := daemon.certify(
		context.Background(), []byte(`{"structure":{"k":"string"}}`))
	if err != nil || refusal != nil || certificate == nil {
		t.Fatalf("certify string: certificate=%+v refusal=%+v err=%v", certificate, refusal, err)
	}
	assertCertificateCatalogSnapshot(t, daemon, certificate, certificate.Fact.seq+1)

	if _, refusal, err := daemon.certify(
		context.Background(), []byte(`{"structure":{"k":"bool"}}`)); err != nil || refusal != nil {
		t.Fatalf("certify intervening bool: refusal=%+v err=%v", refusal, err)
	}
	converged, refusal, err := daemon.certify(
		context.Background(), []byte(`{"structure":{"k":"string"}}`))
	if err != nil || refusal != nil || converged == nil {
		t.Fatalf("converge string: certificate=%+v refusal=%+v err=%v", converged, refusal, err)
	}
	if converged.Created {
		t.Fatalf("duplicate create reported created:true: %+v", converged)
	}
	entries, _, err := daemon.catalog.journal.Read(
		context.Background(), journalGenesisCursor(), 0)
	if err != nil {
		t.Fatalf("read converged catalog: %v", err)
	}
	assertCertificateCatalogSnapshot(t, daemon, converged, entries[len(entries)-1].Seq)
}

func assertCertificateCatalogSnapshot(
	t *testing.T,
	daemon *Daemon,
	cert *certificate,
	expectedHeadSeq int64,
) {
	t.Helper()
	entries, _, err := daemon.catalog.journal.Read(
		context.Background(), journalGenesisCursor(), 0)
	if err != nil {
		t.Fatalf("read catalog: %v", err)
	}
	payloads := make([]string, len(entries))
	for index, entry := range entries {
		payloads[index] = entry.Payload
	}
	entryHeads, _, err := canonical.BuildChain(payloads)
	if err != nil {
		t.Fatalf("recompute catalog chain: %v", err)
	}
	if expectedHeadSeq < 0 || int(expectedHeadSeq) >= len(entryHeads) {
		t.Fatalf("expected head seq %d outside %d catalog entries", expectedHeadSeq, len(entryHeads))
	}
	if got, want := cert.CatalogHead, entryHeads[expectedHeadSeq]; got != want {
		t.Fatalf("certificate head %s, want recomputed head %s at seq %d", got, want, expectedHeadSeq)
	}
}

func TestConcurrentCreatesReturnTheirOwnCommitSnapshots(t *testing.T) {
	const createCount = 48

	daemon, err := Acquire(context.Background(), Options{
		StoreDir: t.TempDir(),
		Listen:   "127.0.0.1:0",
		SyncMode: SyncPowerDurable,
	})
	if err != nil {
		t.Fatalf("acquire daemon: %v", err)
	}
	t.Cleanup(daemon.Release)

	type result struct {
		reply createReply
		err   error
	}
	start := make(chan struct{})
	results := make(chan result, createCount)
	for index := range createCount {
		go func() {
			body, err := json.Marshal(createRequest{Structure: map[string]any{
				"k":    "brand",
				"name": fmt.Sprintf("snapshot-%02d", index),
				"of":   map[string]any{"k": "string"},
			}})
			if err != nil {
				results <- result{err: err}
				return
			}
			<-start
			value := daemon.serveCreate(context.Background(), body)
			reply, ok := value.(createReply)
			if !ok {
				results <- result{err: fmt.Errorf("create returned %T: %v", value, value)}
				return
			}
			results <- result{reply: reply}
		}()
	}
	close(start)

	replies := make([]createReply, 0, createCount)
	var firstErr error
	for range createCount {
		result := <-results
		if result.err != nil && firstErr == nil {
			firstErr = result.err
		}
		if result.err == nil {
			replies = append(replies, result.reply)
		}
	}
	if firstErr != nil {
		t.Fatal(firstErr)
	}

	entries, _, err := daemon.catalog.journal.Read(
		context.Background(), journalGenesisCursor(), 0)
	if err != nil {
		t.Fatalf("read catalog: %v", err)
	}
	payloads := make([]string, len(entries))
	for index, entry := range entries {
		payloads[index] = entry.Payload
	}
	entryHeads, _, err := canonical.BuildChain(payloads)
	if err != nil {
		t.Fatalf("recompute catalog chain: %v", err)
	}

	for _, reply := range replies {
		factIndex := int(reply.CatalogSeq)
		bridgeIndex := factIndex + 1
		if factIndex < 0 || bridgeIndex >= len(entries) {
			t.Fatalf("reply coordinates are outside the catalog: %+v entries=%d", reply, len(entries))
		}
		if got, want := reply.CatalogHead, entryHeads[bridgeIndex]; got != want {
			t.Fatalf("create %s paired fact seq %d with head %s, want its bridge head %s",
				reply.Digest, reply.CatalogSeq, got, want)
		}
		var fact map[string]any
		if err := json.Unmarshal([]byte(entries[factIndex].Payload), &fact); err != nil {
			t.Fatalf("decode fact at seq %d: %v", factIndex, err)
		}
		if fact["digest"] != reply.Digest {
			t.Fatalf("seq %d contains digest %v, reply names %s", factIndex, fact["digest"], reply.Digest)
		}
		var bridge map[string]any
		if err := json.Unmarshal([]byte(entries[bridgeIndex].Payload), &bridge); err != nil {
			t.Fatalf("decode bridge at seq %d: %v", bridgeIndex, err)
		}
		to, _ := bridge["to"].(map[string]any)
		if bridge["kind"] != schemeBridgeKind || to["digest"] != reply.Digest {
			t.Fatalf("seq %d is not the bridge for %s: %v", bridgeIndex, reply.Digest, bridge)
		}
	}
}
