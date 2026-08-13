package protod

import (
	"context"
	"encoding/json"
	"reflect"
	"sync"
	"testing"

	"foldlab/canonical"
)

func TestSessionMutationsRequireTheOwnedPrincipalBeforeAppend(t *testing.T) {
	open := func(author string) (*Daemon, sessionStateReply) {
		daemon, err := Acquire(context.Background(), Options{StoreDir: t.TempDir(), SyncMode: SyncCrashDurable})
		if err != nil {
			t.Fatal(err)
		}
		t.Cleanup(daemon.Release)
		body, err := json.Marshal(map[string]any{
			"grammar": sessionGrammarDigest(), "author": author,
		})
		if err != nil {
			t.Fatal(err)
		}
		opened, ok := daemon.serveSessionOpen(context.Background(), body).(sessionStateReply)
		if !ok {
			t.Fatalf("open did not return state")
		}
		return daemon, opened
	}

	t.Run("missing principal refuses without append", func(t *testing.T) {
		daemon, opened := open("owner")
		move, _ := json.Marshal(map[string]any{
			"session": opened.Session, "expectedHead": opened.Head,
			"op": "unfill", "path": []any{},
		})
		response := daemon.serveSessionMove(context.Background(), move)
		refused, ok := response.(refusalReply)
		if !ok || refused.Refusal.Kind != KindMalformed {
			t.Fatalf("missing principal was not a malformed refusal: %#v", response)
		}
		stateBody, _ := json.Marshal(map[string]any{"session": opened.Session})
		state := daemon.serveSessionState(context.Background(), stateBody).(sessionStateReply)
		if state.Head != opened.Head || state.Step != opened.Step {
			t.Fatalf("missing-principal request appended: %#v", state)
		}
	})

	t.Run("incompatible principal refuses without append", func(t *testing.T) {
		daemon, opened := open("owner")
		move, _ := json.Marshal(map[string]any{
			"session": opened.Session, "expectedHead": opened.Head,
			"principal": "intruder", "op": "unfill", "path": []any{},
		})
		response := daemon.serveSessionMove(context.Background(), move)
		refused, ok := response.(refusalReply)
		if !ok || refused.Refusal.Kind != "session-principal" {
			t.Fatalf("incompatible principal was not refused: %#v", response)
		}
		stateBody, _ := json.Marshal(map[string]any{"session": opened.Session})
		state := daemon.serveSessionState(context.Background(), stateBody).(sessionStateReply)
		if state.Head != opened.Head || state.Step != opened.Step {
			t.Fatalf("incompatible-principal request appended: %#v", state)
		}
	})
}

func TestSessionExpectedHeadRaceAdmitsExactlyOneMove(t *testing.T) {
	daemon, err := Acquire(context.Background(), Options{StoreDir: t.TempDir(), SyncMode: SyncCrashDurable})
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(daemon.Release)
	body, err := json.Marshal(map[string]any{
		"grammar": sessionGrammarDigest(), "author": "race-agent",
	})
	if err != nil {
		t.Fatal(err)
	}
	opened, ok := daemon.serveSessionOpen(context.Background(), body).(sessionStateReply)
	if !ok {
		t.Fatalf("open did not return state")
	}

	start := make(chan struct{})
	replies := make(chan any, 2)
	var group sync.WaitGroup
	for _, kind := range []string{"string", "bool"} {
		group.Add(1)
		go func() {
			defer group.Done()
			<-start
			move, marshalErr := json.Marshal(map[string]any{
				"session": opened.Session, "expectedHead": opened.Head,
				"principal": "race-agent",
				"op":        "fill", "path": []any{}, "subtree": map[string]any{"k": kind},
			})
			if marshalErr != nil {
				replies <- marshalErr
				return
			}
			replies <- daemon.serveSessionMove(context.Background(), move)
		}()
	}
	close(start)
	group.Wait()
	close(replies)

	admitted := 0
	stale := 0
	for response := range replies {
		switch value := response.(type) {
		case sessionStateReply:
			admitted++
		case refusalReply:
			if value.Refusal.Kind != KindSessionStale {
				t.Fatalf("race loser refused as %s", value.Refusal.Kind)
			}
			stale++
		case error:
			t.Fatal(value)
		default:
			t.Fatalf("unexpected race reply %T", response)
		}
	}
	if admitted != 1 || stale != 1 {
		t.Fatalf("race results: admitted=%d stale=%d", admitted, stale)
	}
	stateBody, _ := json.Marshal(map[string]any{"session": opened.Session})
	state := daemon.serveSessionState(context.Background(), stateBody).(sessionStateReply)
	if state.Step != 1 {
		t.Fatalf("race appended %d moves, want exactly one", state.Step)
	}
}

type sessionFixture struct {
	Version       string `json:"version"`
	GrammarDigest string `json:"grammarDigest"`
	StateScheme   string `json:"stateScheme"`
	Session       string `json:"session"`
	Steps         []struct {
		Step        int             `json:"step"`
		Event       json.RawMessage `json:"event"`
		Canonical   string          `json:"canonical"`
		Head        string          `json:"head"`
		StateDigest string          `json:"stateDigest"`
	} `json:"steps"`
}

func TestSessionFixtureRederivesEveryPrefix(t *testing.T) {
	var fixture sessionFixture
	loadFixture(t, "sessions.json", &fixture)
	if fixture.Version != sessionVersion || fixture.GrammarDigest != sessionGrammarDigest() {
		t.Fatalf("session version/grammar drifted: %+v", fixture)
	}
	if fixture.StateScheme != sessionStateScheme {
		t.Fatalf("state scheme drifted: %s", fixture.StateScheme)
	}

	state := any(nil)
	principal := ""
	previous := genesis
	for index, step := range fixture.Steps {
		if step.Step != index {
			t.Fatalf("fixture step %d carries index %d", index, step.Step)
		}
		var event any
		if err := json.Unmarshal(step.Event, &event); err != nil {
			t.Fatalf("step %d event: %v", index, err)
		}
		bytes, err := canonicalBytes(event)
		if err != nil {
			t.Fatal(err)
		}
		if string(bytes) != step.Canonical {
			t.Fatalf("step %d canonical drift\n got %s\nwant %s", index, bytes, step.Canonical)
		}
		digest, err := canonical.EntryDigest(canonical.ChainEntry{
			Seq: int64(index), Prev: previous, Payload: step.Canonical,
		})
		if err != nil {
			t.Fatal(err)
		}
		if digest != step.Head {
			t.Fatalf("step %d head drift: got %s want %s", index, digest, step.Head)
		}
		previous = digest
		state, principal, err = applySessionEvent(state, principal, bytes)
		if err != nil {
			t.Fatalf("step %d does not fold (L1): %v", index, err)
		}
		stateDigest, err := sessionStateDigest(state)
		if err != nil {
			t.Fatal(err)
		}
		if stateDigest != step.StateDigest {
			t.Fatalf("step %d state drift: got %s want %s", index, stateDigest, step.StateDigest)
		}
	}
	openDigest := canonical.DigestHex([]byte(fixture.Steps[0].Canonical))
	if fixture.Session != sessionJournalPrefix+openDigest {
		t.Fatalf("session key is not the open event address: %s", fixture.Session)
	}
}

func TestSessionKernelWitnessFamilies(t *testing.T) {
	open := sessionEvent{
		Version: sessionVersion, Kind: "open", Grammar: sessionGrammarDigest(),
		Seed: map[string]any{"k": "hole"}, Author: "kernel", Retention: retentionTier("open"),
	}

	t.Run("fill then unfill is meaning identity but not chain identity", func(t *testing.T) {
		baseState, baseHead := foldSessionEvents(t, []sessionEvent{open})
		roundTripState, roundTripHead := foldSessionEvents(t, []sessionEvent{
			open,
			{Kind: "fill", Path: []string{}, Subtree: map[string]any{"k": "string"}, Retention: retentionTier("fill")},
			{Kind: "unfill", Path: []string{}, Retention: retentionTier("unfill")},
		})
		assertEqualStateDifferentHead(t, baseState, baseHead, roundTripState, roundTripHead)
	})

	t.Run("idempotent unfills inhabit the kernel", func(t *testing.T) {
		onceState, onceHead := foldSessionEvents(t, []sessionEvent{
			open, {Kind: "unfill", Path: []string{}, Retention: retentionTier("unfill")},
		})
		twiceState, twiceHead := foldSessionEvents(t, []sessionEvent{
			open,
			{Kind: "unfill", Path: []string{}, Retention: retentionTier("unfill")},
			{Kind: "unfill", Path: []string{}, Retention: retentionTier("unfill")},
		})
		assertEqualStateDifferentHead(t, onceState, onceHead, twiceState, twiceHead)
	})

	t.Run("refusals and reads are remembered only by the identity fold", func(t *testing.T) {
		baseState, baseHead := foldSessionEvents(t, []sessionEvent{open})
		traceState, traceHead := foldSessionEvents(t, []sessionEvent{
			open,
			{Kind: "refusal", Retention: retentionTier("refusal")},
			{Kind: "read", Retention: retentionTier("read")},
		})
		assertEqualStateDifferentHead(t, baseState, baseHead, traceState, traceHead)
	})
}

func TestSessionFrontierPurityAndMemoizingNegativeControl(t *testing.T) {
	stateA, _ := foldSessionEvents(t, []sessionEvent{{
		Version: sessionVersion, Kind: "open", Grammar: sessionGrammarDigest(),
		Seed: map[string]any{"k": "hole"}, Author: "a", Retention: retentionTier("open"),
	}})
	stateB, _ := foldSessionEvents(t, []sessionEvent{
		{
			Version: sessionVersion, Kind: "open", Grammar: sessionGrammarDigest(),
			Seed: map[string]any{"k": "hole"}, Author: "b", Retention: retentionTier("open"),
		},
		{Kind: "fill", Path: []string{}, Subtree: map[string]any{"k": "string"}, Retention: retentionTier("fill")},
		{Kind: "unfill", Path: []string{}, Retention: retentionTier("unfill")},
	})
	aWalk, refusal := walkPartial(stateA, []string{})
	if refusal != nil {
		t.Fatal(refusal)
	}
	bWalk, refusal := walkPartial(stateB, []string{})
	if refusal != nil {
		t.Fatal(refusal)
	}
	honestA := buildFrontierFromSnapshot(aWalk.holes, []string{})
	honestB := buildFrontierFromSnapshot(bWalk.holes, []string{})
	if !reflect.DeepEqual(honestA, honestB) {
		t.Fatalf("equal state at one catalog head produced history-sensitive frontiers")
	}

	// Directed negative control: the mutant remembers that history B tried
	// string and removes it. It MUST fail U4 on the equal-state pair above.
	mutantB := cloneFrontierWithoutKind(honestB, "string")
	if reflect.DeepEqual(honestA, mutantB) {
		t.Fatal("memoizing-frontier mutant survived the purity canary")
	}
}

func TestSessionRetentionMarksAndCompactionRefusal(t *testing.T) {
	events := []sessionEvent{
		{Kind: "open"}, {Kind: "fill"}, {Kind: "unfill"}, {Kind: "refusal"},
		{Kind: "utterance"}, {Kind: "proposal"}, {Kind: "adoption"}, {Kind: "commit"},
	}
	marks, refusal := sessionCompaction("flb_session_v0_test", events)
	want := []string{
		retentionIrreducible, retentionCompactible, retentionCompactible, retentionCompactible,
		retentionIrreducible, retentionIrreducible, retentionNeverDiscard, retentionNeverDiscard,
	}
	for index := range marks {
		if marks[index].Tier != want[index] {
			t.Fatalf("mark %d = %s, want %s", index, marks[index].Tier, want[index])
		}
	}
	if refusal.Kind != KindCompactionBlocked || refusal.Expected == nil {
		t.Fatalf("compaction did not refuse on the absent corpus seam: %+v", refusal)
	}
}

func TestSessionStateDigestNormalizesUnionPositions(t *testing.T) {
	left := map[string]any{"k": "union", "of": []any{
		map[string]any{"k": "string"}, map[string]any{"k": "bool"},
	}}
	right := map[string]any{"k": "union", "of": []any{
		map[string]any{"k": "bool"}, map[string]any{"k": "string"},
	}}
	leftDigest, err := sessionStateDigest(left)
	if err != nil {
		t.Fatal(err)
	}
	rightDigest, err := sessionStateDigest(right)
	if err != nil {
		t.Fatal(err)
	}
	if leftDigest != rightDigest {
		t.Fatalf("normalized equal states differ: %s != %s", leftDigest, rightDigest)
	}
}

func foldSessionEvents(t *testing.T, events []sessionEvent) (any, string) {
	t.Helper()
	state := any(nil)
	principal := ""
	previous := genesis
	for index, event := range events {
		if event.Kind == "fill" || event.Kind == "unfill" || event.Kind == "commit" {
			event.Principal = principal
		}
		payload, err := canonicalBytes(event)
		if err != nil {
			t.Fatal(err)
		}
		state, principal, err = applySessionEvent(state, principal, payload)
		if err != nil {
			t.Fatalf("prefix %d failed L1: %v", index, err)
		}
		previous, err = canonical.EntryDigest(canonical.ChainEntry{
			Seq: int64(index), Prev: previous, Payload: string(payload),
		})
		if err != nil {
			t.Fatal(err)
		}
	}
	return state, previous
}

func assertEqualStateDifferentHead(t *testing.T, left any, leftHead string, right any, rightHead string) {
	t.Helper()
	leftDigest, err := sessionStateDigest(left)
	if err != nil {
		t.Fatal(err)
	}
	rightDigest, err := sessionStateDigest(right)
	if err != nil {
		t.Fatal(err)
	}
	if leftDigest != rightDigest {
		t.Fatalf("kernel witnesses changed state: %s != %s", leftDigest, rightDigest)
	}
	if leftHead == rightHead {
		t.Fatal("kernel witness did not change the identity fold")
	}
}

func cloneFrontierWithoutKind(frontier []frontierEntry, kind string) []frontierEntry {
	mutant := make([]frontierEntry, len(frontier))
	for index, entry := range frontier {
		mutant[index] = entry
		mutant[index].Legal = nil
		for _, choice := range entry.Legal {
			if choice.Kind != kind {
				mutant[index].Legal = append(mutant[index].Legal, choice)
			}
		}
	}
	return mutant
}
