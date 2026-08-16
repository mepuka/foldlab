// Contract tests for the cutover grammar: the completion declaration
// decides the close outcome, the close declaration decides authority,
// creation refusals teach the new fields at their paths, the declared
// revision policy is the exact divergence point between refusing and
// absorbing a contributing seat's differing value, and the fence tie-break
// within the chosen seat is canonical byte order.
// Every admitting path ends in a daemon restart over the same store and
// asserts the freshly replayed session serves the identical fold.
package protod_test

import (
	"reflect"
	"strings"
	"testing"
)

func openProtocolSession(t *testing.T, h *harness, protocol string, bindings any) string {
	t.Helper()
	opened := h.request("flb.req.protocol.session.open", map[string]any{
		"protocol": protocol, "bindings": bindings,
	})
	if opened["ok"] != true {
		t.Fatalf("open: %v", opened)
	}
	return opened["session"].(string)
}

func bootstrapPairCompletion(t *testing.T, h *harness) string {
	t.Helper()
	created := h.create(map[string]any{"k": "string"})
	if created["ok"] != true {
		t.Fatalf("create string type: %v", created)
	}
	protocol := map[string]any{
		"scheme": "flb.protocol.v0", "name": "pair-completion", "seats": []any{"operator"},
		"holes": []any{
			map[string]any{"name": "alpha", "type": created["digest"], "seats": []any{"operator"}},
			map[string]any{"name": "beta", "type": created["digest"], "seats": []any{"operator"}},
		},
		"completion": []any{"alpha", "beta"}, "close": []any{"operator"}, "revision": "successor-round",
		"identity": "trusted-principals", "liveness": []any{"operator"},
	}
	result := h.request("flb.req.protocol.create", map[string]any{"protocol": protocol})
	if result["ok"] != true {
		t.Fatalf("create pair-completion protocol: %v", result)
	}
	return result["digest"].(string)
}

func bootstrapCloseAuthorityProtocol(t *testing.T, h *harness, name string, seats, closeSeats []any, holeSeat string) string {
	t.Helper()
	created := h.create(map[string]any{"k": "string"})
	if created["ok"] != true {
		t.Fatalf("create string type: %v", created)
	}
	protocol := map[string]any{
		"scheme": "flb.protocol.v0", "name": name, "seats": seats,
		"holes": []any{
			map[string]any{"name": "work", "type": created["digest"], "seats": []any{holeSeat}},
		},
		"completion": []any{"work"}, "close": closeSeats, "revision": "successor-round",
		"identity": "trusted-principals", "liveness": seats,
	}
	made := h.request("flb.req.protocol.create", map[string]any{"protocol": protocol})
	if made["ok"] != true {
		t.Fatalf("create %s protocol: %v", name, made)
	}
	return made["digest"].(string)
}

func TestCloseAuthorityFollowsTheDeclaration(t *testing.T) {
	t.Run("a declared non-operator close seat closes", func(t *testing.T) {
		store := t.TempDir()
		h, release := acquireStore(t, store)
		protocol := bootstrapCloseAuthorityProtocol(t, h, "coordinator-close", []any{"coordinator", "operator"}, []any{"coordinator"}, "coordinator")
		bindings := map[string]any{"coordinator": "coordinator-principal", "operator": "operator-principal"}
		session := openProtocolSession(t, h, protocol, bindings)
		mustFillProtocol(t, h, session, "coordinator-principal", "work", "ready")
		refused := h.refusal(h.request("flb.req.protocol.session.close", map[string]any{
			"session": session, "principal": "operator-principal",
		}), "seat-unauthorized")
		if law, _ := refused["law"].(string); law != "a close principal must hold one of the protocol's declared close seats" {
			t.Fatalf("close-authority law = %q", law)
		}
		if !reflect.DeepEqual(refused["path"], []any{"principal"}) {
			t.Fatalf("close-authority path = %v", refused["path"])
		}
		if !reflect.DeepEqual(refused["expected"], []any{"coordinator"}) {
			t.Fatalf("close-authority expected = %v", refused["expected"])
		}
		next, ok := refused["next"].([]any)
		if !ok || len(next) == 0 {
			t.Fatalf("close-authority refusal has no next hint: %v", refused)
		}
		hint, ok := next[0].(map[string]any)
		note, noteOK := hint["note"].(string)
		if !ok || !noteOK || !strings.Contains(note, "bindings") {
			t.Fatalf("close-authority refusal does not direct the caller to the bindings: %v", refused)
		}
		closed := mustCloseProtocol(t, h, session, "coordinator-principal")
		if closed["outcome"] != "completed" {
			t.Fatalf("declared coordinator close: %v", closed)
		}
		reopenEquivalence(t, store, h, release, session)
	})

	for _, closer := range []string{"coordinator", "operator"} {
		t.Run("an any-of declaration admits "+closer, func(t *testing.T) {
			store := t.TempDir()
			h, release := acquireStore(t, store)
			protocol := bootstrapCloseAuthorityProtocol(t, h, "either-seat-closes", []any{"coordinator", "operator"}, []any{"coordinator", "operator"}, "coordinator")
			bindings := map[string]any{"coordinator": "coordinator-principal", "operator": "operator-principal"}
			session := openProtocolSession(t, h, protocol, bindings)
			mustFillProtocol(t, h, session, "coordinator-principal", "work", "ready")
			closed := mustCloseProtocol(t, h, session, closer+"-principal")
			if closed["outcome"] != "completed" {
				t.Fatalf("declared %s close: %v", closer, closed)
			}
			reopenEquivalence(t, store, h, release, session)
		})
	}

	t.Run("the bootstrap operator declaration preserves its behavior", func(t *testing.T) {
		store := t.TempDir()
		h, release := acquireStore(t, store)
		protocol := bootstrapProtocol(t, h)
		session := openProtocolSession(t, h, protocol, readProtocolMoveFixture(t).Bindings)
		h.refusal(h.request("flb.req.protocol.session.close", map[string]any{
			"session": session, "principal": "coordinator-principal",
		}), "seat-unauthorized")
		closed := mustCloseProtocol(t, h, session, "operator-principal")
		if closed["outcome"] != "abandoned" {
			t.Fatalf("bootstrap close: %v", closed)
		}
		reopenEquivalence(t, store, h, release, session)
	})
}

func TestNoOperatorSeatProtocolCloses(t *testing.T) {
	store := t.TempDir()
	h, release := acquireStore(t, store)
	protocol := bootstrapCloseAuthorityProtocol(t, h, "operatorless", []any{"author", "reviewer"}, []any{"reviewer"}, "author")
	session := openProtocolSession(t, h, protocol, map[string]any{
		"author": "author-principal", "reviewer": "reviewer-principal",
	})
	mustFillProtocol(t, h, session, "author-principal", "work", "ready")
	closed := mustCloseProtocol(t, h, session, "reviewer-principal")
	if closed["outcome"] != "completed" {
		t.Fatalf("operatorless protocol close: %v", closed)
	}
	state := protocolState(t, h, session)
	if digest, ok := state["final_state_digest"].(string); !ok || len(digest) != 64 {
		t.Fatalf("operatorless close has no final state digest: %v", state)
	}
	reopenEquivalence(t, store, h, release, session)
}

func TestCloseRefusalPrecedenceIsClosedThenAuthority(t *testing.T) {
	store := t.TempDir()
	h, release := acquireStore(t, store)
	protocol := bootstrapProtocol(t, h)
	session := openProtocolSession(t, h, protocol, readProtocolMoveFixture(t).Bindings)
	mustCloseProtocol(t, h, session, "operator-principal")
	refused := h.refusal(h.request("flb.req.protocol.session.close", map[string]any{
		"session": session, "principal": "coordinator-principal",
	}), "session-closed")
	if refused["kind"] == "seat-unauthorized" {
		t.Fatalf("closed-session precedence leaked authority: %v", refused)
	}
	reopenEquivalence(t, store, h, release, session)
}

func TestCloseOutcomeFollowsTheCompletionDeclaration(t *testing.T) {
	operatorOnly := map[string]any{"operator": "operator-principal"}

	t.Run("a declared non-decision hole closes completed", func(t *testing.T) {
		store := t.TempDir()
		h, release := acquireStore(t, store)
		protocol := bootstrapReportCompletion(t, h)
		session := openProtocolSession(t, h, protocol, readProtocolMoveFixture(t).Bindings)
		mustFillProtocol(t, h, session, "builder-principal", "build_report", map[string]any{"commit": "abc", "gates": "green"})
		closed := mustCloseProtocol(t, h, session, "operator-principal")
		if closed["outcome"] != "completed" {
			t.Fatalf("a filled completion hole must close completed: %v", closed)
		}
		reopenEquivalence(t, store, h, release, session)
	})

	t.Run("an unfilled completion hole closes abandoned", func(t *testing.T) {
		store := t.TempDir()
		h, release := acquireStore(t, store)
		protocol := bootstrapReportCompletion(t, h)
		session := openProtocolSession(t, h, protocol, readProtocolMoveFixture(t).Bindings)
		closed := mustCloseProtocol(t, h, session, "operator-principal")
		if closed["outcome"] != "abandoned" {
			t.Fatalf("an unfilled completion hole must close abandoned: %v", closed)
		}
		reopenEquivalence(t, store, h, release, session)
	})

	t.Run("every declared hole must reach a terminal fill", func(t *testing.T) {
		store := t.TempDir()
		h, release := acquireStore(t, store)
		protocol := bootstrapPairCompletion(t, h)
		session := openProtocolSession(t, h, protocol, operatorOnly)
		mustFillProtocol(t, h, session, "operator-principal", "alpha", "done")
		closed := mustCloseProtocol(t, h, session, "operator-principal")
		if closed["outcome"] != "abandoned" {
			t.Fatalf("one unfilled declared hole must abandon the round: %v", closed)
		}
		reopenEquivalence(t, store, h, release, session)
	})

	t.Run("all declared holes filled closes completed", func(t *testing.T) {
		store := t.TempDir()
		h, release := acquireStore(t, store)
		protocol := bootstrapPairCompletion(t, h)
		session := openProtocolSession(t, h, protocol, operatorOnly)
		mustFillProtocol(t, h, session, "operator-principal", "alpha", "done")
		mustFillProtocol(t, h, session, "operator-principal", "beta", "done")
		closed := mustCloseProtocol(t, h, session, "operator-principal")
		if closed["outcome"] != "completed" {
			t.Fatalf("all declared holes filled must complete the round: %v", closed)
		}
		reopenEquivalence(t, store, h, release, session)
	})

	t.Run("a decided dispute satisfies the declaration", func(t *testing.T) {
		store := t.TempDir()
		h, release := acquireStore(t, store)
		protocol := bootstrapThreeSeatDecision(t, h)
		session := openProtocolSession(t, h, protocol, readProtocolMoveFixture(t).Bindings)
		mustFillProtocol(t, h, session, "coordinator-principal", "decision", "v")
		mustFillProtocol(t, h, session, "operator-principal", "decision", "w")
		closed := mustCloseProtocol(t, h, session, "operator-principal")
		if closed["outcome"] != "completed" {
			t.Fatalf("a fenced dispute ends decided and satisfies the declaration: %v", closed)
		}
		reopenEquivalence(t, store, h, release, session)
	})
}

func TestProtocolCreationRefusalsTeach(t *testing.T) {
	h := acquire(t)
	created := h.create(map[string]any{"k": "string"})
	if created["ok"] != true {
		t.Fatalf("create string type: %v", created)
	}
	valid := func() map[string]any {
		return map[string]any{
			"scheme": "flb.protocol.v0", "name": "teaching", "seats": []any{"coordinator", "operator"},
			"holes": []any{
				map[string]any{"name": "alpha", "type": created["digest"], "seats": []any{"operator"}},
				map[string]any{"name": "beta", "type": created["digest"], "seats": []any{"operator"}},
			},
			"completion": []any{"alpha", "beta"}, "close": []any{"coordinator", "operator"}, "revision": "successor-round",
			"identity": "trusted-principals", "liveness": []any{"coordinator", "operator"},
		}
	}
	// expected must TEACH: the describe surface brands the protocol body
	// opaque, so each refusal's expected is the only place a caller can
	// discover the lawful completion/close shapes or permitted revision values.
	revisionValues := []any{"successor-round", "absorb"}
	closeShape := "a non-empty, UTF-16-sorted, duplicate-free array of declared seat names whose bound principals may close the round (any-of)"
	rows := []struct {
		name           string
		mutate         func(map[string]any)
		path           []any
		expectContains []string
		expectEquals   any
	}{
		{"missing completion", func(p map[string]any) { delete(p, "completion") }, []any{"protocol", "completion"},
			[]string{"declared hole names", "UTF-16-sorted", "duplicate-free"}, nil},
		{"empty completion", func(p map[string]any) { p["completion"] = []any{} }, []any{"protocol", "completion"},
			[]string{"declared hole names", "UTF-16-sorted", "duplicate-free"}, nil},
		{"unknown completion name", func(p map[string]any) { p["completion"] = []any{"gamma"} }, []any{"protocol", "completion", "0"},
			[]string{"declared"}, nil},
		{"unsorted completion", func(p map[string]any) { p["completion"] = []any{"beta", "alpha"} }, []any{"protocol", "completion", "1"},
			[]string{"sorted by UTF-16"}, nil},
		{"duplicate completion name", func(p map[string]any) { p["completion"] = []any{"alpha", "alpha"} }, []any{"protocol", "completion", "1"},
			[]string{"without duplicates"}, nil},
		{"missing close", func(p map[string]any) { delete(p, "close") }, []any{"protocol", "close"},
			nil, closeShape},
		{"empty close", func(p map[string]any) { p["close"] = []any{} }, []any{"protocol", "close"},
			nil, closeShape},
		{"unknown close seat", func(p map[string]any) { p["close"] = []any{"ghost"} }, []any{"protocol", "close", "0"},
			nil, "a seat declared by this protocol"},
		{"unsorted close seats", func(p map[string]any) { p["close"] = []any{"operator", "coordinator"} }, []any{"protocol", "close", "1"},
			nil, "close seats sorted by UTF-16 code units without duplicates"},
		{"duplicate close seat", func(p map[string]any) { p["close"] = []any{"coordinator", "coordinator"} }, []any{"protocol", "close", "1"},
			nil, "close seats sorted by UTF-16 code units without duplicates"},
		{"missing revision", func(p map[string]any) { delete(p, "revision") }, []any{"protocol", "revision"},
			nil, revisionValues},
		{"unknown revision policy", func(p map[string]any) { p["revision"] = "latest-wins" }, []any{"protocol", "revision"},
			nil, revisionValues},
	}
	for _, row := range rows {
		t.Run(row.name, func(t *testing.T) {
			protocol := valid()
			row.mutate(protocol)
			refusal := h.refusal(h.request("flb.req.protocol.create", map[string]any{"protocol": protocol}), "invalid-structure")
			if law, _ := refusal["law"].(string); !strings.Contains(law, "flb.protocol.v0") {
				t.Fatalf("refusal law does not name the scheme: %v", refusal)
			}
			if !reflect.DeepEqual(refusal["path"], row.path) {
				t.Fatalf("refusal path = %v, want %v", refusal["path"], row.path)
			}
			if len(row.expectContains) > 0 {
				expected, _ := refusal["expected"].(string)
				for _, want := range row.expectContains {
					if !strings.Contains(expected, want) {
						t.Fatalf("refusal expected %q does not teach %q", expected, want)
					}
				}
			}
			if row.expectEquals != nil && !reflect.DeepEqual(refusal["expected"], row.expectEquals) {
				t.Fatalf("refusal expected = %v, want %v", refusal["expected"], row.expectEquals)
			}
			next, ok := refusal["next"].([]any)
			if !ok || len(next) == 0 {
				t.Fatalf("refusal teaches no next action: %v", refusal)
			}
			if note, _ := next[0].(map[string]any)["note"].(string); note == "" {
				t.Fatalf("the first next action names no repair: %v", next)
			}
		})
	}
	// Every refusal above is exactly the mutation's fault: the unmutated
	// value catalogs.
	if result := h.request("flb.req.protocol.create", map[string]any{"protocol": valid()}); result["ok"] != true {
		t.Fatalf("the valid teaching protocol must catalog: %v", result)
	}
}

// The same two-fill sequence under both declared policies: the second fill
// — a differing value from the seat that contributed the filled value — is
// the exact declared divergence point.
func TestRevisionPolicySuccessorRoundRefuses(t *testing.T) {
	store := t.TempDir()
	h, release := acquireStore(t, store)
	session := openTaskAcceptanceSession(t, h)
	mustFillProtocol(t, h, session, "coordinator-principal", "decision", map[string]any{"verdict": "revise"})
	before := protocolState(t, h, session)
	refused := h.refusal(fillProtocol(h, session, "coordinator-principal", "decision", map[string]any{"verdict": "reject"}), "invalid-structure")
	if expected, _ := refused["expected"].(string); !strings.Contains(expected, "no self-revision") {
		t.Fatalf("the refusal does not teach no-self-revision: %v", refused)
	}
	after := protocolState(t, h, session)
	if !reflect.DeepEqual(before, after) {
		t.Fatalf("a refused self-revision changed the served fold:\nbefore: %v\nafter:  %v", before, after)
	}
	reopenEquivalence(t, store, h, release, session)
}

func TestRevisionPolicyAbsorbIsTotal(t *testing.T) {
	store := t.TempDir()
	h, release := acquireStore(t, store)
	protocol := bootstrapAbsorbDecision(t, h)
	session := openProtocolSession(t, h, protocol, readProtocolMoveFixture(t).Bindings)
	mustFillProtocol(t, h, session, "coordinator-principal", "decision", map[string]any{"verdict": "revise"})
	mustFillProtocol(t, h, session, "coordinator-principal", "decision", map[string]any{"verdict": "reject"})
	state := protocolState(t, h, session)
	assertHoleSubset(t, state, map[string]map[string]any{
		"decision": {"state": "disputed", "candidates": []any{
			verdictCandidate("reject", "coordinator"),
			verdictCandidate("revise", "coordinator"),
		}},
	})
	// Fills stay total: any authorized seat, any conforming value, and the
	// declared fence still terminates the round.
	mustFillProtocol(t, h, session, "operator-principal", "decision", map[string]any{"verdict": "accept"})
	closed := mustCloseProtocol(t, h, session, "operator-principal")
	if closed["outcome"] != "completed" {
		t.Fatalf("an absorbed dispute must still fence and complete: %v", closed)
	}
	terminal := protocolState(t, h, session)
	assertHoleSubset(t, terminal, map[string]map[string]any{
		"decision": {"state": "decided", "value": map[string]any{"verdict": "accept"}},
	})
	reopenEquivalence(t, store, h, release, session)
}

func TestFenceTieBreakIsCanonicalWithinTheSeat(t *testing.T) {
	store := t.TempDir()
	h, release := acquireStore(t, store)
	protocol := bootstrapThreeSeatDecision(t, h)
	session := openProtocolSession(t, h, protocol, readProtocolMoveFixture(t).Bindings)
	mustFillProtocol(t, h, session, "operator-principal", "decision", "w")
	mustFillProtocol(t, h, session, "coordinator-principal", "decision", "v")
	mustFillProtocol(t, h, session, "operator-principal", "decision", "u")
	closed := mustCloseProtocol(t, h, session, "operator-principal")
	if closed["outcome"] != "completed" {
		t.Fatalf("close: %v", closed)
	}
	state := protocolState(t, h, session)
	// The fence names the operator seat first; within that seat's pairs the
	// smallest canonical value bytes win, so "u" beats "w" regardless of
	// arrival order.
	assertHoleSubset(t, state, map[string]map[string]any{
		"decision": {"state": "decided", "value": "u"},
	})
	reopenEquivalence(t, store, h, release, session)
}
