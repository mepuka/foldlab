// Contract tests for the post-D85 fill semantics on the wire: absorb into
// disputes, confirming refills, evidence receipts after close, the
// pair-newness journal rule, and the kept no-self-revision refusal. Every
// admitting-path test ends in a daemon restart over the same store and
// asserts the freshly replayed session serves the identical fold — a
// journaled event the replay validator refuses bricks the session here
// instead of hiding behind a warm cache.
package protod_test

import (
	"context"
	"fmt"
	"reflect"
	"sync"
	"testing"

	"github.com/nats-io/nats.go"

	"foldlab/proto/protod"
)

func acquireStore(t *testing.T, store string) (*harness, func()) {
	t.Helper()
	daemon, err := protod.Acquire(context.Background(), protod.Options{
		StoreDir: store,
		Listen:   "127.0.0.1:0",
		SyncMode: protod.SyncCrashDurable,
	})
	if err != nil {
		t.Fatalf("acquire daemon: %v", err)
	}
	conn, err := nats.Connect(daemon.URL(), nats.Name("foldlab-protod-test/0.0.0/absorb-client"))
	if err != nil {
		daemon.Release()
		t.Fatalf("connect plain client: %v", err)
	}
	var once sync.Once
	release := func() {
		once.Do(func() {
			conn.Close()
			daemon.Release()
		})
	}
	t.Cleanup(release)
	return &harness{t: t, conn: conn}, release
}

func reopenEquivalence(t *testing.T, store string, h *harness, release func(), session string) {
	t.Helper()
	served := protocolState(t, h, session)
	release()
	reopened, _ := acquireStore(t, store)
	replayed := protocolState(t, reopened, session)
	if !reflect.DeepEqual(served, replayed) {
		t.Fatalf("reopen equivalence failed:\nserved:   %v\nreplayed: %v", served, replayed)
	}
}

func fillProtocol(h *harness, session, principal, hole string, value any) reply {
	return h.request("flb.req.protocol.session.fill", map[string]any{
		"session": session, "principal": principal, "hole": hole, "value": value,
	})
}

func mustFillProtocol(t *testing.T, h *harness, session, principal, hole string, value any) reply {
	t.Helper()
	result := fillProtocol(h, session, principal, hole, value)
	if result["ok"] != true {
		t.Fatalf("fill %s %s = %v: %v", principal, hole, value, result)
	}
	return result
}

func mustCloseProtocol(t *testing.T, h *harness, session, principal string) reply {
	t.Helper()
	result := h.request("flb.req.protocol.session.close", map[string]any{"session": session, "principal": principal})
	if result["ok"] != true {
		t.Fatalf("close by %s: %v", principal, result)
	}
	return result
}

func openTaskAcceptanceSession(t *testing.T, h *harness) string {
	t.Helper()
	protocol := bootstrapProtocol(t, h)
	opened := h.request("flb.req.protocol.session.open", map[string]any{
		"protocol": protocol, "bindings": readProtocolMoveFixture(t).Bindings,
	})
	if opened["ok"] != true {
		t.Fatalf("open: %v", opened)
	}
	return opened["session"].(string)
}

func verdictCandidate(verdict, seat string) any {
	return map[string]any{"value": map[string]any{"verdict": verdict}, "seat": seat}
}

func TestAbsorbOnDisputedGrowsTheCandidateSet(t *testing.T) {
	store := t.TempDir()
	h, release := acquireStore(t, store)
	session := openTaskAcceptanceSession(t, h)
	mustFillProtocol(t, h, session, "coordinator-principal", "decision", map[string]any{"verdict": "revise"})
	mustFillProtocol(t, h, session, "operator-principal", "decision", map[string]any{"verdict": "accept"})

	absorbed := mustFillProtocol(t, h, session, "coordinator-principal", "decision", map[string]any{"verdict": "reject"})
	state := protocolState(t, h, session)
	if absorbed["head"] != state["head"] {
		t.Fatalf("absorb head %v is not the session head %v", absorbed["head"], state["head"])
	}
	assertHoleSubset(t, state, map[string]map[string]any{
		"decision": {"state": "disputed", "candidates": []any{
			verdictCandidate("reject", "coordinator"),
			verdictCandidate("revise", "coordinator"),
			verdictCandidate("accept", "operator"),
		}},
	})

	// Redelivering a journaled pair is the idempotent outcome: the whole
	// served fold, head included, is unchanged.
	redelivered := fillProtocol(h, session, "coordinator-principal", "decision", map[string]any{"verdict": "reject"})
	if redelivered["ok"] != true || redelivered["head"] != state["head"] {
		t.Fatalf("redelivered absorb moved the head: %v", redelivered)
	}
	after := protocolState(t, h, session)
	if !reflect.DeepEqual(state, after) {
		t.Fatalf("redelivery changed the served fold:\nbefore: %v\nafter:  %v", state, after)
	}
	reopenEquivalence(t, store, h, release, session)
}

func TestConfirmingRefillJournalsTheSecondSeat(t *testing.T) {
	store := t.TempDir()
	h, release := acquireStore(t, store)
	session := openTaskAcceptanceSession(t, h)
	mustFillProtocol(t, h, session, "coordinator-principal", "decision", map[string]any{"verdict": "accept"})
	before := protocolState(t, h, session)

	confirmed := mustFillProtocol(t, h, session, "operator-principal", "decision", map[string]any{"verdict": "accept"})
	if confirmed["head"] == before["head"] {
		t.Fatalf("a confirming refill from a new seat must journal its pair; head stayed %v", before["head"])
	}
	state := protocolState(t, h, session)
	assertHoleSubset(t, state, map[string]map[string]any{
		"decision": {"state": "filled", "value": map[string]any{"verdict": "accept"}, "candidates": []any{
			verdictCandidate("accept", "coordinator"),
			verdictCandidate("accept", "operator"),
		}},
	})

	// Pair-newness in both directions: either seat redelivering its own
	// journaled pair leaves the head unchanged.
	for _, principal := range []string{"coordinator-principal", "operator-principal"} {
		redelivered := mustFillProtocol(t, h, session, principal, "decision", map[string]any{"verdict": "accept"})
		if redelivered["head"] != state["head"] {
			t.Fatalf("redelivery by %s moved the head: %v", principal, redelivered)
		}
	}
	reopenEquivalence(t, store, h, release, session)
}

func TestEvidenceAppendOnDecidedKeepsTheClosedDigest(t *testing.T) {
	store := t.TempDir()
	h, release := acquireStore(t, store)
	session := openTaskAcceptanceSession(t, h)
	mustFillProtocol(t, h, session, "coordinator-principal", "decision", map[string]any{"verdict": "revise"})
	mustFillProtocol(t, h, session, "operator-principal", "decision", map[string]any{"verdict": "accept"})
	closed := mustCloseProtocol(t, h, session, "operator-principal")
	terminal := protocolState(t, h, session)

	receipt := mustFillProtocol(t, h, session, "coordinator-principal", "decision", map[string]any{"verdict": "reject"})
	if receipt["head"] == terminal["head"] {
		t.Fatal("an evidence receipt on a decided hole must journal its pair")
	}
	state := protocolState(t, h, session)
	if state["final_state_digest"] != terminal["final_state_digest"] {
		t.Fatalf("the receipt moved the final state digest: %v -> %v", terminal["final_state_digest"], state["final_state_digest"])
	}
	if state["outcome"] != closed["outcome"] || state["status"] != "closed" {
		t.Fatalf("the receipt disturbed the close outcome: %v", state)
	}
	assertHoleSubset(t, state, map[string]map[string]any{
		"decision": {"state": "decided", "value": map[string]any{"verdict": "accept"}, "candidates": []any{
			verdictCandidate("reject", "coordinator"),
			verdictCandidate("revise", "coordinator"),
			verdictCandidate("accept", "operator"),
		}},
	})

	redelivered := mustFillProtocol(t, h, session, "coordinator-principal", "decision", map[string]any{"verdict": "reject"})
	if redelivered["head"] != state["head"] {
		t.Fatalf("redelivered receipt moved the head: %v", redelivered)
	}
	reopenEquivalence(t, store, h, release, session)
}

func TestEvidenceAppendOnSealedKeepsTheClosedDigest(t *testing.T) {
	store := t.TempDir()
	h, release := acquireStore(t, store)
	session := openTaskAcceptanceSession(t, h)
	mustFillProtocol(t, h, session, "coordinator-principal", "decision", map[string]any{"verdict": "accept"})
	mustCloseProtocol(t, h, session, "operator-principal")
	terminal := protocolState(t, h, session)

	confirmed := mustFillProtocol(t, h, session, "operator-principal", "decision", map[string]any{"verdict": "accept"})
	if confirmed["head"] == terminal["head"] {
		t.Fatal("a confirming receipt on a sealed hole must journal its pair")
	}
	// After close there is no dispute to open and the seal is the meaning's
	// protection, so even the sealing seat's differing value lands as an
	// evidence receipt rather than a refusal.
	mustFillProtocol(t, h, session, "coordinator-principal", "decision", map[string]any{"verdict": "reject"})
	state := protocolState(t, h, session)
	if state["final_state_digest"] != terminal["final_state_digest"] {
		t.Fatalf("receipts moved the final state digest: %v -> %v", terminal["final_state_digest"], state["final_state_digest"])
	}
	assertHoleSubset(t, state, map[string]map[string]any{
		"decision": {"state": "filled", "value": map[string]any{"verdict": "accept"}, "sealed": true, "candidates": []any{
			verdictCandidate("accept", "coordinator"),
			verdictCandidate("reject", "coordinator"),
			verdictCandidate("accept", "operator"),
		}},
	})

	// Meaning that never existed cannot be created after close: a fill on an
	// unfilled hole still refuses.
	h.refusal(fillProtocol(h, session, "coordinator-principal", "spec", map[string]any{
		"title": "late", "body_digest": "d",
	}), "session-closed")
	reopenEquivalence(t, store, h, release, session)
}

func TestSelfRevisionRefusesOverMultiPairEvidence(t *testing.T) {
	store := t.TempDir()
	h, release := acquireStore(t, store)
	session := openTaskAcceptanceSession(t, h)
	mustFillProtocol(t, h, session, "coordinator-principal", "decision", map[string]any{"verdict": "accept"})
	mustFillProtocol(t, h, session, "operator-principal", "decision", map[string]any{"verdict": "accept"})
	before := protocolState(t, h, session)

	// Both seats contributed a pair for the filled value; a differing value
	// from either is a self-revision and must refuse — with two evidence
	// pairs this branch answered with silence before D85 landed here.
	for _, principal := range []string{"coordinator-principal", "operator-principal"} {
		h.refusal(fillProtocol(h, session, principal, "decision", map[string]any{"verdict": "revise"}), "invalid-structure")
	}
	after := protocolState(t, h, session)
	if !reflect.DeepEqual(before, after) {
		t.Fatalf("a refused self-revision changed the served fold:\nbefore: %v\nafter:  %v", before, after)
	}
	reopenEquivalence(t, store, h, release, session)
}

func bootstrapThreeSeatDecision(t *testing.T, h *harness) string {
	t.Helper()
	created := h.create(map[string]any{"k": "string"})
	if created["ok"] != true {
		t.Fatalf("create verdict type: %v", created)
	}
	protocol := map[string]any{
		"scheme": "flb.protocol.v0", "name": "three-seat-decision",
		"seats": []any{"operator", "coordinator", "builder"},
		"holes": []any{map[string]any{
			"name": "decision", "type": created["digest"],
			"seats": []any{"operator", "coordinator", "builder"},
			"fence": map[string]any{"rule": "seat-authority", "order": []any{"operator", "coordinator", "builder"}},
		}},
		"identity": "trusted-principals", "liveness": []any{"operator", "coordinator", "builder"},
	}
	result := h.request("flb.req.protocol.create", map[string]any{"protocol": protocol})
	if result["ok"] != true {
		t.Fatalf("create three-seat protocol: %v", result)
	}
	return result["digest"].(string)
}

func TestClashBuildsTheDisputeFromAllEvidencePairs(t *testing.T) {
	store := t.TempDir()
	h, release := acquireStore(t, store)
	protocol := bootstrapThreeSeatDecision(t, h)
	opened := h.request("flb.req.protocol.session.open", map[string]any{
		"protocol": protocol, "bindings": readProtocolMoveFixture(t).Bindings,
	})
	if opened["ok"] != true {
		t.Fatalf("open: %v", opened)
	}
	session := opened["session"].(string)
	mustFillProtocol(t, h, session, "coordinator-principal", "decision", "v")
	mustFillProtocol(t, h, session, "builder-principal", "decision", "v")

	// The clash arrives against two evidence pairs; the dispute must carry
	// every pair plus the offender, never a truncated two-candidate view.
	mustFillProtocol(t, h, session, "operator-principal", "decision", "w")
	state := protocolState(t, h, session)
	assertHoleSubset(t, state, map[string]map[string]any{
		"decision": {"state": "disputed", "candidates": []any{
			map[string]any{"value": "v", "seat": "builder"},
			map[string]any{"value": "v", "seat": "coordinator"},
			map[string]any{"value": "w", "seat": "operator"},
		}},
	})
	reopenEquivalence(t, store, h, release, session)
}

// TestThreeFillDigestEqualityAcrossAllOrderings extends the two-permutation
// fence assertion: the same three-seat fill set — a fill, its confirming
// refill, and a clash — reaches one final state digest under every arrival
// order, exercising confirm, multi-pair clash, and absorb along the way.
func TestThreeFillDigestEqualityAcrossAllOrderings(t *testing.T) {
	type move struct {
		principal string
		value     string
	}
	moves := []move{
		{"coordinator-principal", "v"},
		{"builder-principal", "v"},
		{"operator-principal", "w"},
	}
	orderings := [][]int{
		{0, 1, 2}, {0, 2, 1}, {1, 0, 2}, {1, 2, 0}, {2, 0, 1}, {2, 1, 0},
	}
	digests := make([]string, 0, len(orderings))
	for index, ordering := range orderings {
		t.Run(fmt.Sprintf("ordering-%d%d%d", ordering[0], ordering[1], ordering[2]), func(t *testing.T) {
			store := t.TempDir()
			h, release := acquireStore(t, store)
			protocol := bootstrapThreeSeatDecision(t, h)
			opened := h.request("flb.req.protocol.session.open", map[string]any{
				"protocol": protocol, "bindings": readProtocolMoveFixture(t).Bindings,
			})
			if opened["ok"] != true {
				t.Fatalf("open: %v", opened)
			}
			session := opened["session"].(string)
			for _, position := range ordering {
				mustFillProtocol(t, h, session, moves[position].principal, "decision", moves[position].value)
			}
			closed := mustCloseProtocol(t, h, session, "operator-principal")
			if closed["outcome"] != "completed" {
				t.Fatalf("three-fill close outcome: %v", closed)
			}
			state := protocolState(t, h, session)
			digests = append(digests, state["final_state_digest"].(string))
			reopenEquivalence(t, store, h, release, session)
		})
		if len(digests) != index+1 {
			t.Fatalf("ordering %v did not record a digest", ordering)
		}
	}
	for _, digest := range digests[1:] {
		if digest != digests[0] {
			t.Fatalf("arrival order moved the final state digest: %v", digests)
		}
	}
}

// TestFillValueOutsideCanonicalDomainRefuses drives the formerly silent
// no-reply comparison seam: a value the canonical encoding refuses (nesting
// past the identity depth bound) must be answered with a refusal, on an open
// hole and again on a filled one. Today the constrained request decode
// refuses it at the boundary as malformed; the fill path keeps its own
// canonical-domain refusal behind that boundary so the outcome stays a
// refusal, never silence, if the boundary ever widens.
func TestFillValueOutsideCanonicalDomainRefuses(t *testing.T) {
	store := t.TempDir()
	h, release := acquireStore(t, store)
	created := h.create(map[string]any{"k": "opaque"})
	if created["ok"] != true {
		t.Fatalf("create opaque type: %v", created)
	}
	protocol := map[string]any{
		"scheme": "flb.protocol.v0", "name": "opaque-decision", "seats": []any{"operator"},
		"holes":    []any{map[string]any{"name": "decision", "type": created["digest"], "seats": []any{"operator"}}},
		"identity": "trusted-principals", "liveness": []any{"operator"},
	}
	made := h.request("flb.req.protocol.create", map[string]any{"protocol": protocol})
	if made["ok"] != true {
		t.Fatalf("create protocol: %v", made)
	}
	opened := h.request("flb.req.protocol.session.open", map[string]any{
		"protocol": made["digest"], "bindings": map[string]any{"operator": "operator-principal"},
	})
	if opened["ok"] != true {
		t.Fatalf("open: %v", opened)
	}
	session := opened["session"].(string)

	var deep any = "leaf"
	for range 300 {
		deep = []any{deep}
	}
	h.refusal(fillProtocol(h, session, "operator-principal", "decision", deep), "malformed")
	mustFillProtocol(t, h, session, "operator-principal", "decision", "x")
	h.refusal(fillProtocol(h, session, "operator-principal", "decision", deep), "malformed")
	reopenEquivalence(t, store, h, release, session)
}
