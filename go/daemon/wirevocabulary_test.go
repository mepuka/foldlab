package daemon

import (
	"bytes"
	"testing"
)

// The transcription module's own tests.
//
// The parity wall proves the two languages render one table and that every row
// re-derives from the pinned vendor source. What is left for the module's own
// suite is the property the wall depends on and cannot check about itself: that
// the rendering is a FUNCTION of the tables. A rendering that varied between
// two calls in one process would make byte-parity a coin toss, and a wall
// resting on a coin toss is a wall that goes green on some runs.

// TestRenderingIsDeterministic renders twice and demands the same bytes.
//
// Go's map iteration is deliberately randomised, so a rendering that let any map
// walk reach its output would differ between two calls often enough to be caught
// here and rarely enough to survive a single manual check. The same test covers
// the two other ways a rendering stops being a function of its inputs: a clock
// read and a locale-dependent comparison.
func TestRenderingIsDeterministic(t *testing.T) {
	first, err := WireVocabularyBytes(WireDigests)
	if err != nil {
		t.Fatalf("render the vocabulary: %v", err)
	}
	for attempt := range 32 {
		again, err := WireVocabularyBytes(WireDigests)
		if err != nil {
			t.Fatalf("render the vocabulary again: %v", err)
		}
		if !bytes.Equal(first, again) {
			t.Fatalf("rendering %d differs from the first: the rendering is not a function of the tables", attempt)
		}
	}
}

// TestCensusMatchesTheTables holds the declared census against the tables it
// counts.
//
// The wall's census arm compares the declared count with the RENDERED one; this
// compares it with the tables themselves. Two comparisons against two different
// derivations, so a row appended without its census line moving fails whichever
// of the two runs first.
func TestCensusMatchesTheTables(t *testing.T) {
	actual := map[string]int{
		"protocol-verbs":    len(ProtocolVerbs),
		"api-subjects":      len(APISubjects),
		"system-subjects":   len(SystemSubjects),
		"status-events":     len(StatusEvents),
		"lifecycle-entries": len(LifecycleEntries),
	}
	if len(WireCensus) != len(actual) {
		t.Fatalf("the census declares %d groups and the module carries %d", len(WireCensus), len(actual))
	}
	for _, declared := range WireCensus {
		carried, named := actual[declared.Group]
		if !named {
			t.Fatalf("the census declares the group %q, which the module does not carry", declared.Group)
		}
		if carried != declared.Rows {
			t.Fatalf("the census declares %d rows for %q and the table carries %d", declared.Rows, declared.Group, carried)
		}
	}
}

// TestEveryRowIsPinnedAndPlaced holds every row of every table to the closure
// the rendering is supposed to preserve.
//
// The wall checks the rendering; this checks the tables. A row that loses its
// region here would render an empty digest there, and the two failures name the
// same defect from the two ends it can be introduced at.
func TestEveryRowIsPinnedAndPlaced(t *testing.T) {
	check := func(what string, region WireRegion, shape WireShape, promotion string) {
		t.Helper()
		if region.Pin.Module == "" || region.Pin.Version == "" || region.File == "" {
			t.Fatalf("%s carries no pinned region", what)
		}
		if region.First < 1 || region.Last < region.First {
			t.Fatalf("%s carries the empty region %d-%d", what, region.First, region.Last)
		}
		if WireDigests[region.Key()] == "" {
			t.Fatalf("%s cites the region %s, which the digest table does not carry", what, region.Key())
		}
		switch shape {
		case JournalFact, CommitmentRegister:
			if promotion != "" {
				t.Fatalf("%s is not chatter and carries a promotion note; the note belongs to messages that decide nothing", what)
			}
		case EphemeralChatter:
			if promotion == "" {
				t.Fatalf("%s is chatter and carries no promotion note", what)
			}
		default:
			t.Fatalf("%s carries the wire shape %q, which is not one of the three", what, shape)
		}
	}
	for _, row := range ProtocolVerbs {
		check("the protocol verb "+row.Declaration, row.Region, row.Wire, row.Promotion)
	}
	for _, row := range APISubjects {
		check("the API subject "+row.Declaration, row.Region, row.Wire, row.Promotion)
	}
	for _, row := range SystemSubjects {
		check("the system subject "+row.Declaration, row.Region, row.Wire, row.Promotion)
	}
	for _, row := range StatusEvents {
		check("the status event "+row.Declaration, row.Region, row.Wire, row.Promotion)
		if row.Placement != "transition" && row.Placement != "observation" {
			t.Fatalf("the status event %s is placed %q, which is neither", row.Declaration, row.Placement)
		}
	}
	for _, row := range LifecycleEntries {
		check("the lifecycle entry "+row.Entry, row.Region, row.Wire, row.Promotion)
		if row.Signature == "" {
			t.Fatalf("the lifecycle entry %s carries no signature", row.Entry)
		}
	}
}

// TestDeclarationsAreUnique holds every table's row keys apart.
//
// The lookups the estate re-sources through are keyed by the vendor's own
// identifier. Two rows under one identifier would make those lookups return
// whichever came first, which is a way for a consumer to publish on a subject
// nobody chose.
func TestDeclarationsAreUnique(t *testing.T) {
	seen := func(what string, keys []string) {
		t.Helper()
		known := map[string]bool{}
		for _, key := range keys {
			if known[key] {
				t.Fatalf("the %s table carries %q twice", what, key)
			}
			known[key] = true
		}
	}
	verbs := make([]string, 0, len(ProtocolVerbs))
	for _, row := range ProtocolVerbs {
		verbs = append(verbs, row.Declaration)
	}
	seen("protocol verb", verbs)

	subjects := make([]string, 0, len(APISubjects))
	for _, row := range APISubjects {
		subjects = append(subjects, row.Declaration)
	}
	seen("API subject", subjects)

	events := make([]string, 0, len(SystemSubjects))
	for _, row := range SystemSubjects {
		events = append(events, row.Declaration)
	}
	seen("system subject", events)

	statuses := make([]string, 0, len(StatusEvents))
	for _, row := range StatusEvents {
		statuses = append(statuses, row.Declaration)
	}
	seen("status event", statuses)

	entries := make([]string, 0, len(LifecycleEntries))
	for _, row := range LifecycleEntries {
		entries = append(entries, row.Entry)
	}
	seen("lifecycle entry", entries)
}

// TestReSourcedConsumersReadTheTable holds the estate's own re-sourced spellings
// to the rows they now read from.
//
// These are the three places in this package that used to spell a wire word
// themselves. The test is not a restatement of the table: it checks that the
// consumer and the table agree, so a table row edited without its consumer
// following fails here rather than at a connection.
func TestReSourcedConsumersReadTheTable(t *testing.T) {
	if greetingOp != mustVerb("server.InfoProto").Word+" " {
		t.Fatalf("the greeting operation does not come from the protocol verb table")
	}
	if LameDuckEvent != mustStatusEvent("LDMStatus").Type {
		t.Fatalf("the lame-duck event name does not come from the status event table")
	}
	if GateReadyForConnections != mustLifecycleEntry("server.Server.ReadyForConnections").Name() {
		t.Fatalf("the readiness gate name does not come from the lifecycle table")
	}
}
