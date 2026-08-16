// Negative controls for the protocol-session replay validator: every
// refusal branch of applyProtocolEvent and protocolFillStep has a table row
// asserting the exact error, so a validator error string with no row here
// is a review failure. Valid histories are driven through the real serve
// paths and read back from the stored journal — a corrupt row is one stored
// event away from bytes the daemon actually wrote. Two validator branches
// have no rows because no journal can reach them: a cataloged
// flb.protocol.v0 fact whose structure fails to decode or to canonicalize
// would have refused certification.
package protod

import (
	"bytes"
	"context"
	"encoding/json"
	"reflect"
	"strings"
	"testing"

	"foldlab/journal"
)

func stepDaemon(t *testing.T) *Daemon {
	t.Helper()
	daemon, err := Acquire(context.Background(), Options{StoreDir: t.TempDir(), SyncMode: SyncCrashDurable})
	if err != nil {
		t.Fatalf("acquire daemon: %v", err)
	}
	t.Cleanup(daemon.Release)
	return daemon
}

func stepCreateType(t *testing.T, d *Daemon, structure any) string {
	t.Helper()
	body, err := json.Marshal(map[string]any{"structure": structure})
	if err != nil {
		t.Fatal(err)
	}
	reply, ok := d.serveCreate(context.Background(), body).(createReply)
	if !ok || !reply.OK {
		t.Fatalf("create type: %#v", d.serveCreate(context.Background(), body))
	}
	return reply.Digest
}

func stepCreateProtocol(t *testing.T, d *Daemon, protocol map[string]any) string {
	t.Helper()
	body, err := json.Marshal(map[string]any{"protocol": protocol})
	if err != nil {
		t.Fatal(err)
	}
	reply, ok := d.serveProtocolCreate(context.Background(), body).(createReply)
	if !ok || !reply.OK {
		t.Fatalf("create protocol: %#v", d.serveProtocolCreate(context.Background(), body))
	}
	return reply.Digest
}

type stepMove struct {
	principal string
	hole      string
	value     any
	close     bool
}

type stepScenario struct {
	daemon  *Daemon
	session string
	events  []protocolSessionEvent
}

// stepRunScenario drives the serve paths so the journal holds only events
// the daemon wrote, then reads the stored history back as decoded events.
func stepRunScenario(t *testing.T, d *Daemon, protocol string, bindings map[string]string, moves []stepMove) stepScenario {
	t.Helper()
	ctx := context.Background()
	openBody, err := json.Marshal(map[string]any{"protocol": protocol, "bindings": bindings})
	if err != nil {
		t.Fatal(err)
	}
	opened, ok := d.serveProtocolSessionOpen(ctx, openBody).(protocolOpenReply)
	if !ok || !opened.OK {
		t.Fatalf("open: %#v", d.serveProtocolSessionOpen(ctx, openBody))
	}
	for _, move := range moves {
		if move.close {
			body, err := json.Marshal(map[string]any{"session": opened.Session, "principal": move.principal})
			if err != nil {
				t.Fatal(err)
			}
			reply, ok := d.serveProtocolSessionClose(ctx, body).(protocolCloseReply)
			if !ok || !reply.OK {
				t.Fatalf("close by %s: %#v", move.principal, d.serveProtocolSessionClose(ctx, body))
			}
			continue
		}
		body, err := json.Marshal(map[string]any{
			"session": opened.Session, "principal": move.principal, "hole": move.hole, "value": move.value,
		})
		if err != nil {
			t.Fatal(err)
		}
		reply, ok := d.serveProtocolSessionFill(ctx, body).(protocolFillReply)
		if !ok || !reply.OK {
			t.Fatalf("fill %s %s: %#v", move.principal, move.hole, d.serveProtocolSessionFill(ctx, body))
		}
	}
	stored, refusal, err := d.lookupProtocolSession(ctx, opened.Session)
	if err != nil || refusal != nil {
		t.Fatalf("lookup session: %v %v", err, refusal)
	}
	entries, _, err := stored.journal.Read(ctx, journal.Cursor{Seq: -1, Head: genesis}, 0)
	if err != nil {
		t.Fatal(err)
	}
	events := make([]protocolSessionEvent, len(entries))
	for index, entry := range entries {
		if err := json.Unmarshal([]byte(entry.Payload), &events[index]); err != nil {
			t.Fatal(err)
		}
	}
	return stepScenario{daemon: d, session: opened.Session, events: events}
}

// foldAt replays the first n stored events; the stored history is the
// positive control — a valid prefix must never refuse.
func (s stepScenario) foldAt(t *testing.T, n int) *protocolSessionFold {
	t.Helper()
	var fold *protocolSessionFold
	var err error
	for _, event := range s.events[:n] {
		fold, err = s.daemon.applyProtocolEvent(s.session, fold, event)
		if err != nil {
			t.Fatalf("valid stored prefix refused: %v", err)
		}
	}
	return fold
}

// nestedPastCanonicalDepth builds a value json.Marshal accepts but the
// RFC 8785 canonical encoding refuses at its nesting bound.
func nestedPastCanonicalDepth() any {
	var value any = "leaf"
	for range 300 {
		value = []any{value}
	}
	return value
}

func TestReplayValidatorRefusesEveryCorruption(t *testing.T) {
	d := stepDaemon(t)
	stringType := stepCreateType(t, d, map[string]any{"k": "string"})
	opaqueType := stepCreateType(t, d, map[string]any{"k": "opaque"})
	protocol := stepCreateProtocol(t, d, map[string]any{
		"scheme": "flb.protocol.v0", "name": "replay-roster",
		"seats": []any{"operator", "coordinator"},
		"holes": []any{
			map[string]any{
				"name": "decision", "type": stringType, "seats": []any{"coordinator", "operator"},
				"fence": map[string]any{"rule": "seat-authority", "order": []any{"operator", "coordinator"}},
			},
			map[string]any{"name": "notes", "type": stringType, "seats": []any{"coordinator"}},
			map[string]any{"name": "blob", "type": opaqueType, "seats": []any{"coordinator"}},
		},
		"identity": "trusted-principals", "liveness": []any{"coordinator", "operator"},
		"completion": []any{"decision"}, "close": []any{"operator"}, "revision": "successor-round",
	})

	// linear: open, one fill, close — every prefix is a lawful fold.
	linear := stepRunScenario(t, d, protocol,
		map[string]string{"operator": "op-a", "coordinator": "co-a"},
		[]stepMove{
			{principal: "co-a", hole: "decision", value: "v"},
			{principal: "op-a", close: true},
		})
	if len(linear.events) != 3 {
		t.Fatalf("linear scenario stored %d events, want 3", len(linear.events))
	}
	// disputed: open, clashing fills from two seats.
	disputed := stepRunScenario(t, d, protocol,
		map[string]string{"operator": "op-b", "coordinator": "co-b"},
		[]stepMove{
			{principal: "co-b", hole: "decision", value: "v"},
			{principal: "op-b", hole: "decision", value: "w"},
		})
	if len(disputed.events) != 3 {
		t.Fatalf("disputed scenario stored %d events, want 3", len(disputed.events))
	}
	// A protocol fact from before the completion declaration cannot be
	// created through the serve path anymore; inject one directly to prove
	// replay refuses it rather than closing vacuously completed.
	preCutoverCommit, refusal, err := d.catalog.commitValue(context.Background(), map[string]any{
		"scheme": protocolScheme, "name": "pre-cutover",
		"seats":    []any{"operator"},
		"holes":    []any{map[string]any{"name": "decision", "type": stringType, "seats": []any{"operator"}}},
		"identity": "trusted-principals", "liveness": []any{"operator"},
	}, protocolScheme, "", "sniff")
	if err != nil || refusal != nil {
		t.Fatalf("inject pre-cutover fact: %v %v", err, refusal)
	}
	preCutoverFact := preCutoverCommit.fact.Digest
	// A protocol fact from immediately before the close declaration carries
	// the already-required completion and revision declarations. Direct
	// injection proves the new hard cutover independently of the older row.
	closeLessCommit, refusal, err := d.catalog.commitValue(context.Background(), map[string]any{
		"scheme": protocolScheme, "name": "close-less",
		"seats":      []any{"operator"},
		"holes":      []any{map[string]any{"name": "decision", "type": stringType, "seats": []any{"operator"}}},
		"completion": []any{"decision"}, "revision": "successor-round",
		"identity": "trusted-principals", "liveness": []any{"operator"},
	}, protocolScheme, "", "sniff")
	if err != nil || refusal != nil {
		t.Fatalf("inject close-less fact: %v %v", err, refusal)
	}
	closeLessFact := closeLessCommit.fact.Digest

	fill := func(principal, seat, hole string, value any) protocolSessionEvent {
		return protocolSessionEvent{
			Kind: "fill", Principal: principal, Seat: seat, Hole: hole,
			Value: value, Retention: retentionCompactible,
		}
	}
	openWithVersion := func(version string) protocolSessionEvent {
		event := linear.events[0]
		event.Version = version
		return event
	}
	closeEvent := func(principal, outcome, digest string) protocolSessionEvent {
		return protocolSessionEvent{
			Kind: "close", Principal: principal, Outcome: outcome,
			FinalStateDigest: digest, Retention: retentionNeverDiscard,
		}
	}

	rows := []struct {
		name         string
		scenario     stepScenario
		fold         func(t *testing.T) *protocolSessionFold
		event        protocolSessionEvent
		want         string
		wantContains string
	}{
		{
			name: "repeated open", scenario: linear,
			fold:  func(t *testing.T) *protocolSessionFold { return linear.foldAt(t, 1) },
			event: linear.events[0],
			want:  "repeated protocol session open",
		},
		{
			name: "open with a missing version", scenario: linear,
			fold:  func(t *testing.T) *protocolSessionFold { return nil },
			event: openWithVersion(""),
			want:  "a journal written under an unknown session version refuses replay rather than misfolding",
		},
		{
			name: "open with an unknown session version", scenario: linear,
			fold:  func(t *testing.T) *protocolSessionFold { return nil },
			event: openWithVersion("flb.protocol.session.vX"),
			want:  "a journal written under an unknown session version refuses replay rather than misfolding",
		},
		{
			name: "open with a pre-cutover protocol fact", scenario: linear,
			fold: func(t *testing.T) *protocolSessionFold { return nil },
			event: func() protocolSessionEvent {
				event := linear.events[0]
				event.Protocol = preCutoverFact
				return event
			}(),
			wantContains: "does not satisfy the flb.protocol.v0 grammar",
		},
		{
			name: "open with a fact missing the close declaration", scenario: linear,
			fold: func(t *testing.T) *protocolSessionFold { return nil },
			event: func() protocolSessionEvent {
				event := linear.events[0]
				event.Protocol = closeLessFact
				return event
			}(),
			wantContains: "does not satisfy the flb.protocol.v0 grammar",
		},
		{
			name: "open with a protocol absent from the catalog", scenario: linear,
			fold: func(t *testing.T) *protocolSessionFold { return nil },
			event: func() protocolSessionEvent {
				event := linear.events[0]
				event.Protocol = strings.Repeat("f", 64)
				return event
			}(),
			want: "protocol session protocol is absent from catalog",
		},
		{
			name: "open with a non-protocol catalog fact", scenario: linear,
			fold: func(t *testing.T) *protocolSessionFold { return nil },
			event: func() protocolSessionEvent {
				event := linear.events[0]
				event.Protocol = stringType
				return event
			}(),
			want: `catalog fact scheme "flb.type.v1" is not "flb.protocol.v0"`,
		},
		{
			name: "open with corrupt stored bindings", scenario: linear,
			fold: func(t *testing.T) *protocolSessionFold { return nil },
			event: func() protocolSessionEvent {
				event := linear.events[0]
				event.Bindings = map[string]string{"operator": "op-a"}
				return event
			}(),
			want: "stored protocol session bindings are invalid",
		},
		{
			name: "fill before its open", scenario: linear,
			fold:  func(t *testing.T) *protocolSessionFold { return nil },
			event: linear.events[1],
			want:  "fill precedes its protocol session open",
		},
		{
			name: "fill on an undeclared hole", scenario: linear,
			fold:  func(t *testing.T) *protocolSessionFold { return linear.foldAt(t, 1) },
			event: fill("co-a", "coordinator", "ghost", "v"),
			want:  "stored fill does not carry its derived authorized seat",
		},
		{
			name: "fill by an unbound principal", scenario: linear,
			fold:  func(t *testing.T) *protocolSessionFold { return linear.foldAt(t, 1) },
			event: fill("intruder", "coordinator", "decision", "v"),
			want:  "stored fill does not carry its derived authorized seat",
		},
		{
			name: "fill with a mismatched derived seat", scenario: linear,
			fold:  func(t *testing.T) *protocolSessionFold { return linear.foldAt(t, 1) },
			event: fill("co-a", "operator", "decision", "v"),
			want:  "stored fill does not carry its derived authorized seat",
		},
		{
			name: "fill with a nonconforming value", scenario: linear,
			fold:  func(t *testing.T) *protocolSessionFold { return linear.foldAt(t, 1) },
			event: fill("co-a", "coordinator", "decision", float64(42)),
			want:  "stored fill value does not conform to its hole type",
		},
		{
			name: "fill value outside the canonical domain", scenario: linear,
			fold:  func(t *testing.T) *protocolSessionFold { return linear.foldAt(t, 1) },
			event: fill("co-a", "coordinator", "blob", nestedPastCanonicalDepth()),
			want:  "stored fill value has no canonical bytes",
		},
		{
			name: "stored duplicate evidence pair", scenario: linear,
			fold:  func(t *testing.T) *protocolSessionFold { return linear.foldAt(t, 2) },
			event: linear.events[1],
			want:  "stored fill repeats an already-journaled evidence pair",
		},
		{
			name: "stored self-revision", scenario: linear,
			fold:  func(t *testing.T) *protocolSessionFold { return linear.foldAt(t, 2) },
			event: fill("co-a", "coordinator", "decision", "x"),
			want:  "stored fill is a refused self-revision",
		},
		{
			name: "post-close fill on an unfilled hole", scenario: linear,
			fold:  func(t *testing.T) *protocolSessionFold { return linear.foldAt(t, 3) },
			event: fill("co-a", "coordinator", "notes", "n"),
			want:  "stored fill after close targets an unfilled hole",
		},
		{
			name: "fill on a stable hole state", scenario: linear,
			fold: func(t *testing.T) *protocolSessionFold {
				fold := linear.foldAt(t, 2)
				fold.Holes["decision"] = protocolHoleFold{State: "unfilled"}
				return fold
			},
			event: fill("co-a", "coordinator", "decision", "v"),
			want:  "stored fill targets a stable hole state",
		},
		{
			name: "retained candidate without canonical bytes", scenario: linear,
			fold: func(t *testing.T) *protocolSessionFold {
				fold := linear.foldAt(t, 2)
				hole := fold.Holes["decision"]
				hole.Candidates = []protocolCandidate{{Value: nestedPastCanonicalDepth(), Seat: "coordinator"}}
				fold.Holes["decision"] = hole
				return fold
			},
			event:        fill("co-a", "coordinator", "decision", "v"),
			wantContains: "nesting exceeds",
		},
		{
			name: "retained filled value without canonical bytes", scenario: linear,
			fold: func(t *testing.T) *protocolSessionFold {
				fold := linear.foldAt(t, 2)
				hole := fold.Holes["decision"]
				hole.Value = nestedPastCanonicalDepth()
				fold.Holes["decision"] = hole
				return fold
			},
			event:        fill("op-a", "operator", "decision", "w"),
			wantContains: "nesting exceeds",
		},
		{
			name: "close before its open", scenario: linear,
			fold:  func(t *testing.T) *protocolSessionFold { return nil },
			event: linear.events[2],
			want:  "stored close is unauthorized or repeated",
		},
		{
			name: "repeated close", scenario: linear,
			fold:  func(t *testing.T) *protocolSessionFold { return linear.foldAt(t, 3) },
			event: linear.events[2],
			want:  "stored close is unauthorized or repeated",
		},
		{
			name: "close by a principal outside the declared close seats", scenario: linear,
			fold:  func(t *testing.T) *protocolSessionFold { return linear.foldAt(t, 2) },
			event: closeEvent("co-a", linear.events[2].Outcome, linear.events[2].FinalStateDigest),
			want:  "stored close is unauthorized or repeated",
		},
		{
			name: "close with a mismatched outcome", scenario: linear,
			fold:  func(t *testing.T) *protocolSessionFold { return linear.foldAt(t, 2) },
			event: closeEvent("op-a", "abandoned", linear.events[2].FinalStateDigest),
			want:  "stored close outcome does not match the fold",
		},
		{
			name: "close with a mismatched final state digest", scenario: linear,
			fold:  func(t *testing.T) *protocolSessionFold { return linear.foldAt(t, 2) },
			event: closeEvent("op-a", "completed", strings.Repeat("0", 64)),
			want:  "stored close final state digest does not match the fold",
		},
		{
			name: "disputed hole with no fence-represented candidate", scenario: disputed,
			fold: func(t *testing.T) *protocolSessionFold {
				fold := disputed.foldAt(t, 3)
				hole := fold.Holes["decision"]
				for index := range hole.Candidates {
					hole.Candidates[index].Seat = "ghost"
				}
				fold.Holes["decision"] = hole
				return fold
			},
			event: closeEvent("op-b", "completed", strings.Repeat("0", 64)),
			want:  "stored disputed hole has no fence-represented candidate",
		},
		{
			name: "unknown event kind", scenario: linear,
			fold:  func(t *testing.T) *protocolSessionFold { return linear.foldAt(t, 1) },
			event: protocolSessionEvent{Kind: "corrupt", Retention: retentionCompactible},
			want:  `unknown protocol session event kind "corrupt"`,
		},
	}
	for _, row := range rows {
		t.Run(row.name, func(t *testing.T) {
			fold := row.fold(t)
			_, err := d.applyProtocolEvent(row.scenario.session, fold, row.event)
			if err == nil {
				t.Fatal("corrupt stored event folded cleanly")
			}
			if row.want != "" && err.Error() != row.want {
				t.Fatalf("error = %q, want %q", err.Error(), row.want)
			}
			if row.wantContains != "" && !strings.Contains(err.Error(), row.wantContains) {
				t.Fatalf("error = %q, want it to contain %q", err.Error(), row.wantContains)
			}
		})
	}
}

func stepCreateMinimalProtocol(t *testing.T, d *Daemon) string {
	t.Helper()
	stringType := stepCreateType(t, d, map[string]any{"k": "string"})
	return stepCreateProtocol(t, d, map[string]any{
		"scheme": "flb.protocol.v0", "name": "minimal",
		"seats":      []any{"operator"},
		"holes":      []any{map[string]any{"name": "outcome", "type": stringType, "seats": []any{"operator"}}},
		"completion": []any{"outcome"}, "close": []any{"operator"}, "revision": "successor-round",
		"identity": "trusted-principals", "liveness": []any{"operator"},
	})
}

func TestSessionDigestPreimageCarriesItsVersion(t *testing.T) {
	d := stepDaemon(t)
	protocol := stepCreateMinimalProtocol(t, d)
	scenario := stepRunScenario(t, d, protocol,
		map[string]string{"operator": "op-v"},
		[]stepMove{
			{principal: "op-v", hole: "outcome", value: "v"},
			{principal: "op-v", close: true},
		})
	fold := scenario.foldAt(t, 3)
	meaning := map[string]any{
		"v":        protocolSessionVersion,
		"protocol": fold.Protocol, "bindings": fold.Bindings, "holes": fold.Holes,
		"status": fold.Status, "outcome": fold.Outcome,
	}
	preimage, err := canonicalBytes(meaning)
	if err != nil {
		t.Fatal(err)
	}
	if want := (bytesSHA256V1{}).Derive(preimage); fold.FinalStateDigest != want {
		t.Fatalf("final state digest %s does not re-derive from the versioned preimage digest %s", fold.FinalStateDigest, want)
	}
	if !bytes.Contains(preimage, []byte(`"v":"flb.protocol.session.v0"`)) {
		t.Fatalf("digest preimage does not carry its version string: %s", preimage)
	}
	delete(meaning, "v")
	unversioned, err := canonicalBytes(meaning)
	if err != nil {
		t.Fatal(err)
	}
	if fold.FinalStateDigest == (bytesSHA256V1{}).Derive(unversioned) {
		t.Fatal("the version string is not load-bearing in the digest preimage")
	}
}

// The serve-side face of the replay grammar re-check: a cataloged
// pre-cutover fact refuses at session open as typed data — the CONTRACT.md
// sentence "refuses at session open and replay rather than folding" bound
// to the wire, not only to the validator.
func TestPreCutoverFactRefusesAtSessionOpen(t *testing.T) {
	d := stepDaemon(t)
	stringType := stepCreateType(t, d, map[string]any{"k": "string"})
	commit, refusal, err := d.catalog.commitValue(context.Background(), map[string]any{
		"scheme": protocolScheme, "name": "pre-cutover-open",
		"seats":      []any{"operator"},
		"holes":      []any{map[string]any{"name": "decision", "type": stringType, "seats": []any{"operator"}}},
		"completion": []any{"decision"}, "revision": "successor-round",
		"identity": "trusted-principals", "liveness": []any{"operator"},
	}, protocolScheme, "", "sniff")
	if err != nil || refusal != nil {
		t.Fatalf("inject pre-cutover fact: %v %v", err, refusal)
	}
	body, err := json.Marshal(map[string]any{
		"protocol": commit.fact.Digest, "bindings": map[string]any{"operator": "op"},
	})
	if err != nil {
		t.Fatal(err)
	}
	served := d.serveProtocolSessionOpen(context.Background(), body)
	refused, ok := served.(refusalReply)
	if !ok {
		t.Fatalf("open with a pre-cutover fact must refuse as data, got %#v", served)
	}
	if refused.Refusal.Kind != KindInvalidStructure {
		t.Fatalf("refusal kind = %q, want %q", refused.Refusal.Kind, KindInvalidStructure)
	}
	if !strings.Contains(refused.Refusal.Law, "flb.protocol.v0") {
		t.Fatalf("refusal law does not name the grammar: %q", refused.Refusal.Law)
	}
	if len(refused.Refusal.Next) == 0 || refused.Refusal.Next[0].Note == "" {
		t.Fatalf("refusal teaches no repair: %#v", refused.Refusal)
	}
}

// The crash window between journal creation and the open append leaves an
// empty session journal; every serve path answers silence for it — the
// substrate-corruption treatment until the content-addressed open is
// redelivered — never a process-crashing panic.
func TestEmptyProtocolSessionJournalServesSilence(t *testing.T) {
	d := stepDaemon(t)
	ctx := context.Background()
	name := protocolSessionJournalPrefix + strings.Repeat("0", 64)
	if _, err := d.openJournal(ctx, name); err != nil {
		t.Fatalf("create empty session journal: %v", err)
	}
	serves := []struct {
		subject string
		serve   func(context.Context, []byte) any
		body    map[string]any
	}{
		{"fill", d.serveProtocolSessionFill, map[string]any{"session": name, "principal": "p", "hole": "h", "value": "v"}},
		{"close", d.serveProtocolSessionClose, map[string]any{"session": name, "principal": "p"}},
		{"state", d.serveProtocolSessionState, map[string]any{"session": name}},
	}
	for _, row := range serves {
		body, err := json.Marshal(row.body)
		if err != nil {
			t.Fatal(err)
		}
		if served := row.serve(ctx, body); served != nil {
			t.Fatalf("%s over an open-less journal must stay silent, got %#v", row.subject, served)
		}
	}
}

// The transition owns no caller state: stepping a fill leaves the input
// fold untouched, so a harness may step several events from one snapshot
// without contaminating its baseline (the DEV-670 Tier-1 contract).
func TestTransitionLeavesItsInputFoldUntouched(t *testing.T) {
	d := stepDaemon(t)
	protocol := stepCreateMinimalProtocol(t, d)
	scenario := stepRunScenario(t, d, protocol,
		map[string]string{"operator": "op-p"},
		[]stepMove{{principal: "op-p", hole: "outcome", value: "v"}})
	snapshot := scenario.foldAt(t, 1)
	witness := scenario.foldAt(t, 1)
	first, err := protocolSessionTransition(snapshot, scenario.events[1])
	if err != nil {
		t.Fatal(err)
	}
	if !reflect.DeepEqual(snapshot, witness) {
		t.Fatalf("stepping a fill mutated the input fold:\nbefore: %#v\nafter:  %#v", witness, snapshot)
	}
	second, err := protocolSessionTransition(snapshot, scenario.events[1])
	if err != nil {
		t.Fatal(err)
	}
	if !reflect.DeepEqual(first, second) {
		t.Fatalf("two steps from one snapshot diverged:\nfirst:  %#v\nsecond: %#v", first, second)
	}
}

func TestUnknownSessionVersionRefusesReplay(t *testing.T) {
	d := stepDaemon(t)
	protocol := stepCreateMinimalProtocol(t, d)
	scenario := stepRunScenario(t, d, protocol, map[string]string{"operator": "op-u"}, nil)
	for _, version := range []string{"", "flb.protocol.session.vX"} {
		event := scenario.events[0]
		event.Version = version
		_, err := d.applyProtocolEvent(scenario.session, nil, event)
		want := "a journal written under an unknown session version refuses replay rather than misfolding"
		if err == nil || err.Error() != want {
			t.Fatalf("open under version %q folded with err=%v, want %q", version, err, want)
		}
	}
	if _, err := d.applyProtocolEvent(scenario.session, nil, scenario.events[0]); err != nil {
		t.Fatalf("the carried session version must fold: %v", err)
	}
}
