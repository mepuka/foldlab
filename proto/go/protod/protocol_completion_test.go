// Contract tests for the cutover grammar: the completion declaration
// decides the close outcome, creation refusals teach the new fields at
// their paths, the declared revision policy is the exact divergence point
// between refusing and absorbing a contributing seat's differing value,
// and the fence tie-break within the chosen seat is canonical byte order.
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
		"completion": []any{"alpha", "beta"}, "revision": "successor-round",
		"identity": "trusted-principals", "liveness": []any{"operator"},
	}
	result := h.request("flb.req.protocol.create", map[string]any{"protocol": protocol})
	if result["ok"] != true {
		t.Fatalf("create pair-completion protocol: %v", result)
	}
	return result["digest"].(string)
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
			"scheme": "flb.protocol.v0", "name": "teaching", "seats": []any{"operator"},
			"holes": []any{
				map[string]any{"name": "alpha", "type": created["digest"], "seats": []any{"operator"}},
				map[string]any{"name": "beta", "type": created["digest"], "seats": []any{"operator"}},
			},
			"completion": []any{"alpha", "beta"}, "revision": "successor-round",
			"identity": "trusted-principals", "liveness": []any{"operator"},
		}
	}
	// expected must TEACH: the describe surface brands the protocol body
	// opaque, so each refusal's expected is the only place a caller can
	// discover the lawful completion shape or the permitted revision values.
	revisionValues := []any{"successor-round", "absorb"}
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
