package protod_test

import (
	"encoding/json"
	"os"
	"reflect"
	"strings"
	"testing"
)

type protocolMove struct {
	Op        string `json:"op"`
	Principal string `json:"principal"`
	Hole      string `json:"hole"`
	Value     any    `json:"value"`
}

type protocolMoveVector struct {
	Name          string                    `json:"name"`
	Protocol      string                    `json:"protocol"`
	Setup         []protocolMove            `json:"setup"`
	Pre           map[string]map[string]any `json:"pre"`
	Move          protocolMove              `json:"move"`
	Expected      map[string]map[string]any `json:"expected"`
	Refusal       map[string]any            `json:"refusal"`
	Outcome       string                    `json:"outcome"`
	HeadUnchanged bool                      `json:"head_unchanged"`
}

type protocolMoveFixture struct {
	Provenance string               `json:"_provenance"`
	Version    string               `json:"version"`
	Bindings   map[string]string    `json:"bindings"`
	Vectors    []protocolMoveVector `json:"vectors"`
}

func readProtocolMoveFixture(t *testing.T) protocolMoveFixture {
	t.Helper()
	raw, err := os.ReadFile("../../wire/fixtures/protocol-moves.json")
	if err != nil {
		t.Fatal(err)
	}
	var fixture protocolMoveFixture
	if err := json.Unmarshal(raw, &fixture); err != nil {
		t.Fatal(err)
	}
	if fixture.Provenance == "" || fixture.Version != "flb.protocol.session.v0" {
		t.Fatalf("fixture lacks provenance/version: %#v", fixture)
	}
	return fixture
}

func bootstrapProtocol(t *testing.T, h *harness) string {
	t.Helper()
	types := map[string]any{
		"spec": map[string]any{
			"k": "struct", "fields": map[string]any{"title": map[string]any{"k": "string"}, "body_digest": map[string]any{"k": "string"}}, "optional": []any{},
		},
		"authorization": map[string]any{
			"k": "struct", "fields": map[string]any{"granted": map[string]any{"k": "bool"}, "note": map[string]any{"k": "string"}}, "optional": []any{"note"},
		},
		"build_report": map[string]any{
			"k": "struct", "fields": map[string]any{"commit": map[string]any{"k": "string"}, "gates": map[string]any{"k": "string"}, "notes": map[string]any{"k": "string"}}, "optional": []any{"notes"},
		},
		"review": map[string]any{
			"k": "struct", "fields": map[string]any{"findings": map[string]any{
				"k": "list", "of": map[string]any{"k": "struct", "fields": map[string]any{
					"title": map[string]any{"k": "string"}, "severity": map[string]any{"k": "string"}, "note": map[string]any{"k": "string"},
				}, "optional": []any{}},
			}}, "optional": []any{},
		},
		"decision": map[string]any{
			"k": "struct", "fields": map[string]any{
				"verdict": map[string]any{"k": "union", "of": []any{
					map[string]any{"k": "literal", "value": "accept"}, map[string]any{"k": "literal", "value": "revise"}, map[string]any{"k": "literal", "value": "reject"},
				}}, "note": map[string]any{"k": "string"},
			}, "optional": []any{"note"},
		},
	}
	digests := map[string]string{}
	for name, structure := range types {
		created := h.create(structure)
		if created["ok"] != true {
			t.Fatalf("create %s type: %v", name, created)
		}
		digests[name] = created["digest"].(string)
	}
	protocol := map[string]any{
		"scheme": "flb.protocol.v0", "name": "task-acceptance",
		"seats": []any{"operator", "coordinator", "builder"},
		"holes": []any{
			map[string]any{"name": "spec", "type": digests["spec"], "seats": []any{"coordinator"}},
			map[string]any{"name": "authorization", "type": digests["authorization"], "seats": []any{"operator"}},
			map[string]any{"name": "build_report", "type": digests["build_report"], "seats": []any{"builder"}},
			map[string]any{"name": "review", "type": digests["review"], "seats": []any{"coordinator"}},
			map[string]any{
				"name": "decision", "type": digests["decision"], "seats": []any{"coordinator", "operator"},
				"fence": map[string]any{"rule": "seat-authority", "order": []any{"operator", "coordinator"}},
			},
		},
		"completion": []any{"decision"}, "close": []any{"operator"}, "revision": "successor-round",
		"identity": "trusted-principals", "liveness": []any{"builder", "coordinator", "operator"},
	}
	created := h.request("flb.req.protocol.create", map[string]any{"protocol": protocol})
	if created["ok"] != true || created["scheme"] != "flb.protocol.v0" {
		t.Fatalf("create protocol: %v", created)
	}
	return created["digest"].(string)
}

func bootstrapReportProtocol(t *testing.T, h *harness, name, closeSeat string) string {
	t.Helper()
	reportType := h.create(map[string]any{
		"k": "struct", "fields": map[string]any{"commit": map[string]any{"k": "string"}, "gates": map[string]any{"k": "string"}}, "optional": []any{},
	})
	if reportType["ok"] != true {
		t.Fatalf("create report type: %v", reportType)
	}
	protocol := map[string]any{
		"scheme": "flb.protocol.v0", "name": name,
		"seats": []any{"operator", "coordinator", "builder"},
		"holes": []any{
			map[string]any{"name": "build_report", "type": reportType["digest"], "seats": []any{"builder"}},
		},
		"completion": []any{"build_report"}, "close": []any{closeSeat}, "revision": "successor-round",
		"identity": "trusted-principals", "liveness": []any{"builder", "coordinator", "operator"},
	}
	created := h.request("flb.req.protocol.create", map[string]any{"protocol": protocol})
	if created["ok"] != true {
		t.Fatalf("create %s protocol: %v", name, created)
	}
	return created["digest"].(string)
}

// bootstrapReportCompletion catalogs the fixture's "report-completion"
// variant: no hole is named decision anywhere, and the close outcome
// follows the declared build_report hole.
func bootstrapReportCompletion(t *testing.T, h *harness) string {
	t.Helper()
	return bootstrapReportProtocol(t, h, "report-completion", "operator")
}

// bootstrapCoordinatorClose changes only the close declaration from the
// report-completion control: the coordinator-bound principal closes.
func bootstrapCoordinatorClose(t *testing.T, h *harness) string {
	t.Helper()
	return bootstrapReportProtocol(t, h, "coordinator-close", "coordinator")
}

// bootstrapAbsorbDecision catalogs the fixture's "absorb-decision" variant:
// the task-acceptance decision hole under the absorb revision policy.
func bootstrapAbsorbDecision(t *testing.T, h *harness) string {
	t.Helper()
	verdictType := h.create(map[string]any{
		"k": "struct", "fields": map[string]any{
			"verdict": map[string]any{"k": "union", "of": []any{
				map[string]any{"k": "literal", "value": "accept"}, map[string]any{"k": "literal", "value": "revise"}, map[string]any{"k": "literal", "value": "reject"},
			}},
		}, "optional": []any{},
	})
	if verdictType["ok"] != true {
		t.Fatalf("create verdict type: %v", verdictType)
	}
	protocol := map[string]any{
		"scheme": "flb.protocol.v0", "name": "absorb-decision",
		"seats": []any{"operator", "coordinator", "builder"},
		"holes": []any{
			map[string]any{
				"name": "decision", "type": verdictType["digest"], "seats": []any{"coordinator", "operator"},
				"fence": map[string]any{"rule": "seat-authority", "order": []any{"operator", "coordinator"}},
			},
		},
		"completion": []any{"decision"}, "close": []any{"operator"}, "revision": "absorb",
		"identity": "trusted-principals", "liveness": []any{"builder", "coordinator", "operator"},
	}
	created := h.request("flb.req.protocol.create", map[string]any{"protocol": protocol})
	if created["ok"] != true {
		t.Fatalf("create absorb-decision protocol: %v", created)
	}
	return created["digest"].(string)
}

func bootstrapProtocolVariant(t *testing.T, h *harness, variant string) string {
	t.Helper()
	switch variant {
	case "", "task-acceptance":
		return bootstrapProtocol(t, h)
	case "report-completion":
		return bootstrapReportCompletion(t, h)
	case "absorb-decision":
		return bootstrapAbsorbDecision(t, h)
	case "coordinator-close":
		return bootstrapCoordinatorClose(t, h)
	default:
		t.Fatalf("fixture names an unknown protocol variant %q", variant)
		return ""
	}
}

func protocolState(t *testing.T, h *harness, session string) reply {
	t.Helper()
	state := h.request("flb.req.protocol.session.state", map[string]any{"session": session})
	if state["ok"] != true {
		t.Fatalf("state %s: %v", session, state)
	}
	return state
}

func performProtocolMove(h *harness, session string, move protocolMove) reply {
	if move.Op == "close" {
		return h.request("flb.req.protocol.session.close", map[string]any{"session": session, "principal": move.Principal})
	}
	return h.request("flb.req.protocol.session.fill", map[string]any{
		"session": session, "principal": move.Principal, "hole": move.Hole, "value": move.Value,
	})
}

func assertHoleSubset(t *testing.T, state reply, expected map[string]map[string]any) {
	t.Helper()
	holes, ok := state["holes"].(map[string]any)
	if !ok {
		t.Fatalf("holes are not an object: %v", state["holes"])
	}
	for name, fields := range expected {
		hole, ok := holes[name].(map[string]any)
		if !ok {
			t.Fatalf("hole %q is absent: %v", name, holes)
		}
		for field, want := range fields {
			if got := hole[field]; !reflect.DeepEqual(got, want) {
				t.Fatalf("hole %s.%s = %#v, want %#v (whole state: %v)", name, field, got, want, state)
			}
		}
	}
}

func TestProtocolMoveFixtureDrivesRealRuntime(t *testing.T) {
	fixture := readProtocolMoveFixture(t)
	fenceDigests := map[string]string{}
	for _, vector := range fixture.Vectors {
		t.Run(vector.Name, func(t *testing.T) {
			h := acquire(t)
			protocol := bootstrapProtocolVariant(t, h, vector.Protocol)
			opened := h.request("flb.req.protocol.session.open", map[string]any{
				"protocol": protocol, "bindings": fixture.Bindings,
			})
			if opened["ok"] != true {
				t.Fatalf("open: %v", opened)
			}
			session := opened["session"].(string)
			for _, setup := range vector.Setup {
				if result := performProtocolMove(h, session, setup); result["ok"] != true {
					t.Fatalf("setup %#v: %v", setup, result)
				}
			}
			before := protocolState(t, h, session)
			assertHoleSubset(t, before, vector.Pre)
			result := performProtocolMove(h, session, vector.Move)
			if vector.Refusal != nil {
				h.refusal(result, vector.Refusal["kind"].(string))
				return
			}
			if result["ok"] != true {
				t.Fatalf("move %#v: %v", vector.Move, result)
			}
			if vector.Outcome != "" && result["outcome"] != vector.Outcome {
				t.Fatalf("outcome = %v, want %s", result["outcome"], vector.Outcome)
			}
			if vector.HeadUnchanged && result["head"] != before["head"] {
				t.Fatalf("idempotent refill moved head: before=%v after=%v", before["head"], result["head"])
			}
			after := protocolState(t, h, session)
			assertHoleSubset(t, after, vector.Expected)
			if strings.HasPrefix(vector.Name, "fence-") {
				fenceDigests[vector.Name] = after["final_state_digest"].(string)
			}
		})
	}
	if fenceDigests["fence-coordinator-arrives-first"] != fenceDigests["fence-operator-arrives-first"] {
		t.Fatalf("arrival order moved final state identity: %v", fenceDigests)
	}
}

func TestProtocolCreationAndFillValidateAtTheBoundary(t *testing.T) {
	h := acquire(t)
	stringType := h.create(map[string]any{"k": "string"})["digest"].(string)
	badFence := map[string]any{
		"scheme": "flb.protocol.v0", "name": "bad", "seats": []any{"operator"},
		"holes": []any{map[string]any{
			"name": "decision", "type": stringType, "seats": []any{"operator"},
			"fence": map[string]any{"rule": "seat-authority", "order": []any{"operator"}},
		}},
		"completion": []any{"decision"}, "close": []any{"operator"}, "revision": "successor-round",
		"identity": "trusted-principals", "liveness": []any{"operator"},
	}
	h.refusal(h.request("flb.req.protocol.create", map[string]any{"protocol": badFence}), "invalid-structure")

	protocol := bootstrapProtocol(t, h)
	bindings := readProtocolMoveFixture(t).Bindings
	opened := h.request("flb.req.protocol.session.open", map[string]any{"protocol": protocol, "bindings": bindings})
	session := opened["session"].(string)
	h.refusal(h.request("flb.req.protocol.session.fill", map[string]any{
		"session": session, "principal": "builder-principal", "hole": "build_report",
		"value": map[string]any{"commit": "abc", "gates": false},
	}), "invalid-structure")
	cleanReview := h.request("flb.req.protocol.session.fill", map[string]any{
		"session": session, "principal": "coordinator-principal", "hole": "review",
		"value": map[string]any{"findings": []any{}},
	})
	if cleanReview["ok"] != true {
		t.Fatalf("empty findings is a legal clean review: %v", cleanReview)
	}
}

func TestProtocolFillPreservesALicensedNullValue(t *testing.T) {
	h := acquire(t)
	nullType := h.create(map[string]any{"k": "null"})["digest"].(string)
	protocol := map[string]any{
		"scheme": "flb.protocol.v0", "name": "null-decision", "seats": []any{"operator"},
		"holes":      []any{map[string]any{"name": "decision", "type": nullType, "seats": []any{"operator"}}},
		"completion": []any{"decision"}, "close": []any{"operator"}, "revision": "successor-round",
		"identity": "trusted-principals", "liveness": []any{"operator"},
	}
	created := h.request("flb.req.protocol.create", map[string]any{"protocol": protocol})
	opened := h.request("flb.req.protocol.session.open", map[string]any{
		"protocol": created["digest"], "bindings": map[string]any{"operator": "operator-principal"},
	})
	filled := h.request("flb.req.protocol.session.fill", map[string]any{
		"session": opened["session"], "principal": "operator-principal", "hole": "decision", "value": nil,
	})
	if filled["ok"] != true {
		t.Fatalf("licensed null fill: %v", filled)
	}
	hole := filled["hole_state"].(map[string]any)
	if _, present := hole["value"]; !present || hole["value"] != nil {
		t.Fatalf("filled null value lost presence: %v", hole)
	}
}

func TestProtocolCreationEnforcesSeatAndFenceLaws(t *testing.T) {
	h := acquire(t)
	typeDigest := h.create(map[string]any{"k": "string"})["digest"].(string)
	valid := func() map[string]any {
		return map[string]any{
			"scheme": "flb.protocol.v0", "name": "law-test",
			"seats": []any{"operator", "coordinator"},
			"holes": []any{map[string]any{
				"name": "decision", "type": typeDigest,
				"seats": []any{"operator", "coordinator"},
				"fence": map[string]any{"rule": "seat-authority", "order": []any{"operator", "coordinator"}},
			}},
			"completion": []any{"decision"}, "close": []any{"operator"}, "revision": "successor-round",
			"identity": "trusted-principals", "liveness": []any{"operator", "coordinator"},
		}
	}
	cases := map[string]func(map[string]any){
		"duplicate protocol seat": func(protocol map[string]any) { protocol["seats"] = []any{"operator", "operator"} },
		"hole seat outside protocol": func(protocol map[string]any) {
			protocol["holes"].([]any)[0].(map[string]any)["seats"] = []any{"operator", "builder"}
		},
		"multi-seat hole without fence": func(protocol map[string]any) {
			delete(protocol["holes"].([]any)[0].(map[string]any), "fence")
		},
		"fence order is not a permutation": func(protocol map[string]any) {
			protocol["holes"].([]any)[0].(map[string]any)["fence"].(map[string]any)["order"] = []any{"operator"}
		},
		"unknown hole type": func(protocol map[string]any) {
			protocol["holes"].([]any)[0].(map[string]any)["type"] = strings.Repeat("f", 64)
		},
	}
	for name, mutate := range cases {
		t.Run(name, func(t *testing.T) {
			protocol := valid()
			mutate(protocol)
			result := h.request("flb.req.protocol.create", map[string]any{"protocol": protocol})
			if name == "unknown hole type" {
				h.refusal(result, "unknown-ref")
			} else {
				h.refusal(result, "invalid-structure")
			}
		})
	}
}

func TestProtocolBindingsCloseAndPredecessorAreAuthoritative(t *testing.T) {
	h := acquire(t)
	protocol := bootstrapProtocol(t, h)
	bindings := readProtocolMoveFixture(t).Bindings

	h.refusal(h.request("flb.req.protocol.session.open", map[string]any{
		"protocol": protocol,
		"bindings": map[string]any{"operator": "operator-principal", "coordinator": "coordinator-principal"},
	}), "invalid-structure")
	extra := map[string]any{}
	for seat, principal := range bindings {
		extra[seat] = principal
	}
	extra["spectator"] = "spectator-principal"
	h.refusal(h.request("flb.req.protocol.session.open", map[string]any{
		"protocol": protocol, "bindings": extra,
	}), "invalid-structure")

	opened := h.request("flb.req.protocol.session.open", map[string]any{"protocol": protocol, "bindings": bindings})
	if opened["ok"] != true {
		t.Fatalf("open: %v", opened)
	}
	session := opened["session"].(string)
	h.refusal(h.request("flb.req.protocol.session.close", map[string]any{
		"session": session, "principal": "coordinator-principal",
	}), "seat-unauthorized")
	closed := h.request("flb.req.protocol.session.close", map[string]any{
		"session": session, "principal": "operator-principal",
	})
	if closed["ok"] != true || closed["outcome"] != "abandoned" {
		t.Fatalf("operator close: %v", closed)
	}
	h.refusal(h.request("flb.req.protocol.session.close", map[string]any{
		"session": session, "principal": "operator-principal",
	}), "session-closed")
	terminal := protocolState(t, h, session)
	stateDigest := terminal["final_state_digest"].(string)
	successor := h.request("flb.req.protocol.session.open", map[string]any{
		"protocol": protocol, "bindings": bindings,
		"predecessor": map[string]any{"session": session, "state_digest": stateDigest},
	})
	if successor["ok"] != true || successor["session"] == session {
		t.Fatalf("successor open: %v", successor)
	}
	successorState := protocolState(t, h, successor["session"].(string))
	if !reflect.DeepEqual(successorState["predecessor"], map[string]any{"session": session, "state_digest": stateDigest}) {
		t.Fatalf("successor predecessor = %v", successorState["predecessor"])
	}
}
