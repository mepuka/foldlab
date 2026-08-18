// The format-2 corpus obligations.
//
// OBLIGATION TABLE (schema §11 check -> test):
//
//	 1- 6 byte level                    -> TestCorpusSatisfiesTheBothWaysLaw, TestByteLevelRefusals
//	 7- 9 header, format, group order   -> TestHeaderAndGroupOrder, TestUnknownFormatIsRefused
//	10    unknown groups skipped+logged -> TestUnrecognisedRecordGroupsAreSkippedAndLogged
//	11-12 counts, line count            -> TestHeaderCountsMatchTheRecordsRead
//	13-17 tables                        -> TestTables
//	18-22 vectors                       -> TestVectors
//	23-24 doc group                     -> TestDocGroup
//	25-27 canon group                   -> canonvectors_test.go
//	28-29 cross-record invariants       -> TestCrossRecordInvariants
//	30    provenance                    -> TestProvenance
//	33    the control arm               -> controls_test.go
//
// RUN WITH -count=1. Today the corpus under test is testdata/, inside this
// module, so the test cache tracks it. The one-line switch in kmconform.go
// points ConformanceCorpusPath at packages/plait/fixtures/, OUTSIDE this
// module, and Go's cache cannot see a mutation in a file it cannot attribute
// to the module root: plain `go test ./...` would print `ok (cached)` over a
// mutated corpus. The module's gate already passes -count=1 for exactly this
// reason (go/AGENTS.md).
package kmconform_test

import (
	"bytes"
	"errors"
	"os"
	"strings"
	"testing"

	"foldlab/kmconform"
)

func corpusBytes(t *testing.T) []byte {
	t.Helper()
	raw, err := os.ReadFile(kmconform.ConformanceCorpusPath)
	if err != nil {
		t.Fatalf("read the conformance corpus: %v", err)
	}
	return raw
}

func loadCorpus(t *testing.T) *kmconform.Corpus {
	t.Helper()
	corpus, err := kmconform.CheckBothWays(corpusBytes(t))
	if err != nil {
		t.Fatalf("the conformance corpus is not conformant: %v", err)
	}
	return corpus
}

// TestCorpusSatisfiesTheBothWaysLaw is the law itself, spelled out rather
// than delegated, because it is the one obligation the schema calls binding
// on every implementation: parse every line, rebuild every line from the
// DECODED fields, and require the file back byte for byte.
func TestCorpusSatisfiesTheBothWaysLaw(t *testing.T) {
	raw := corpusBytes(t)
	corpus, err := kmconform.ParseCorpus(raw)
	if err != nil {
		t.Fatalf("parse: %v", err)
	}
	emitted, err := corpus.Emit()
	if err != nil {
		t.Fatalf("re-emit: %v", err)
	}
	if !bytes.Equal(raw, emitted) {
		t.Fatalf("both-ways law broken: %d bytes in, %d bytes out, first difference at byte %d",
			len(raw), len(emitted), firstDifference(raw, emitted))
	}
	t.Logf("both-ways: %d bytes over %d lines, byte-identical", len(raw), corpus.Lines)
}

func TestByteLevelRefusals(t *testing.T) {
	raw := corpusBytes(t)
	for _, testCase := range []struct {
		name    string
		mutate  func([]byte) []byte
		expects string
	}{
		{"a CR byte", func(in []byte) []byte {
			return bytes.Replace(in, []byte("\n"), []byte("\r\n"), 1)
		}, "CR byte"},
		{"no final newline", func(in []byte) []byte {
			return in[:len(in)-1]
		}, "does not end with a newline"},
		{"a blank line", func(in []byte) []byte {
			return append(append([]byte{}, in...), '\n')
		}, "blank line"},
		{"a non-ASCII byte", func(in []byte) []byte {
			return bytes.Replace(in, []byte("schema"), []byte("sch\xc3\xa9ma"), 1)
		}, "non-ASCII"},
		{"an empty file", func([]byte) []byte { return nil }, "empty"},
	} {
		mutated := testCase.mutate(append([]byte{}, raw...))
		_, err := kmconform.ParseCorpus(mutated)
		if err == nil {
			t.Fatalf("%s was accepted, want a refusal", testCase.name)
		}
		if !strings.Contains(err.Error(), testCase.expects) {
			t.Fatalf("%s refused with %q, want the refusal to name %q", testCase.name, err, testCase.expects)
		}
	}
}

func TestHeaderAndGroupOrder(t *testing.T) {
	corpus := loadCorpus(t)
	if corpus.Header.Format != kmconform.SupportedFormat {
		t.Fatalf("header format is %d, want %d", corpus.Header.Format, kmconform.SupportedFormat)
	}
	// THE LINE COUNT IS DERIVED, NOT PINNED. Schema §2.1 says it outright: the
	// 117 of today is a measurement of today's corpus and not a constant of the
	// format, and the add-only rule lets a ninth group join without a format
	// bump. A literal breaks on that where the sum does not — and the ninth
	// group is now frozen, so this is not a hypothetical.
	declared := 0
	for _, count := range corpus.Header.Counts {
		declared += count.Value
	}
	if corpus.Lines != declared+1 {
		t.Fatalf("the corpus has %d lines; the header counts %d records, so a complete file has %d",
			corpus.Lines, declared, declared+1)
	}
	if len(corpus.Unknown) != 0 {
		t.Fatalf("the corpus carries %d unrecognised records: %s",
			len(corpus.Unknown), strings.Join(corpus.SkipLog(), "; "))
	}
	t.Logf("line count: %d lines = 1 header + %d counted records", corpus.Lines, declared)
}

func TestUnknownFormatIsRefused(t *testing.T) {
	// A consumer that meets an unknown grammar refuses, naming both formats.
	// It does not warn, and it does not read what it recognises: a partial
	// read of an unknown format is how a wrong table reaches production.
	mutated := bytes.Replace(corpusBytes(t), []byte(`"format":2,`), []byte(`"format":3,`), 1)
	_, err := kmconform.ParseCorpus(mutated)
	if err == nil {
		t.Fatal("format 3 was accepted")
	}
	var formatError *kmconform.FormatError
	if !errors.As(err, &formatError) {
		t.Fatalf("format 3 refused with %q, want a *FormatError", err)
	}
	if formatError.Found != 3 || formatError.Understood != kmconform.SupportedFormat {
		t.Fatalf("FormatError names found=%d understood=%d, want 3 and %d",
			formatError.Found, formatError.Understood, kmconform.SupportedFormat)
	}
	if !strings.Contains(err.Error(), "3") || !strings.Contains(err.Error(), "2") {
		t.Fatalf("the refusal must name both formats; it says %q", err)
	}
}

func TestUnrecognisedRecordGroupsAreSkippedAndLogged(t *testing.T) {
	// The add-only rule. A record type this consumer does not know, appended
	// after every group it does know, is skipped rather than fatal — and the
	// skip is reported, so the leniency is visible in a run's output rather
	// than silent.
	appended := append(append([]byte{}, corpusBytes(t)...),
		[]byte(`{"name":"future","record":"provenance"}`+"\n")...)
	corpus, err := kmconform.CheckBothWays(appended)
	if err != nil {
		t.Fatalf("an appended unknown record was fatal: %v", err)
	}
	if len(corpus.Unknown) != 1 {
		t.Fatalf("skipped %d records, want 1", len(corpus.Unknown))
	}
	log := corpus.SkipLog()
	if len(log) != 1 || !strings.Contains(log[0], "provenance") {
		t.Fatalf("skip log is %v, want one line naming the skipped record type", log)
	}

	// Add-only means APPENDED. A known record after an unknown one says the
	// producer inserted a group rather than adding one, and that reorders a
	// file whose group order is part of the grammar.
	interleaved := append(append([]byte{}, appended...),
		[]byte(`{"bytes":"{}","name":"empty-object","record":"canon","value":{}}`+"\n")...)
	if _, err := kmconform.ParseCorpus(interleaved); err == nil {
		t.Fatal("a known record following an unknown one was accepted")
	}
}

func TestHeaderCountsMatchTheRecordsRead(t *testing.T) {
	corpus := loadCorpus(t)
	// The eight structurally-fixed groups. Each of these counts is a fact
	// about the model — twelve kinds, five stages, the closed twenty-two —
	// so it is pinned as a literal and a change to one is a change to the
	// model rather than to this file.
	want := map[string]int{
		"kind": 12, "stage": 5, "refusal": 16, "type": 22,
		"encoding": 12, "admission": 17, "doc": 22, "canon": 10,
	}
	got := map[string]int{}
	for _, count := range corpus.Header.Counts {
		got[count.Group] = count.Value
	}
	for group, expected := range want {
		if got[group] != expected {
			t.Fatalf("counts.%s is %d, want %d", group, got[group], expected)
		}
	}
	// The key SET is deliberately not pinned. Schema §6 states the rule as a
	// MUST NOT: a consumer may not require the counts keys to be exactly the
	// ones it knows, because an add-only group brings a new key and a consumer
	// that demanded the old set would refuse a file it is supposed to skip
	// past. Every key here must instead agree with the records actually read,
	// which is what the parse already enforced for every key, known or not.
	for group, value := range got {
		if _, structural := want[group]; structural {
			continue
		}
		t.Logf("the header carries the counts key %q = %d, beyond the eight structural groups",
			group, value)
	}
	for group := range want {
		if _, present := got[group]; !present {
			t.Fatalf("the header counts omit %q", group)
		}
	}
}

func TestTables(t *testing.T) {
	corpus := loadCorpus(t)
	if len(corpus.Kinds) != 12 {
		t.Fatalf("%d kind records, want 12", len(corpus.Kinds))
	}
	if len(corpus.Stages) != 5 {
		t.Fatalf("%d stage records, want 5", len(corpus.Stages))
	}
	for index, row := range corpus.Kinds {
		if row.Rank != index {
			t.Fatalf("kind %q has rank %d at position %d; file order is rank order", row.Name, row.Rank, index)
		}
	}
	for index, row := range corpus.Stages {
		if row.Rank != index {
			t.Fatalf("stage %q has rank %d at position %d; file order is rank order", row.Name, row.Rank, index)
		}
	}
	if len(corpus.Refusals) != 16 {
		t.Fatalf("%d refusal records, want 16", len(corpus.Refusals))
	}
	machineApplicable := []string{}
	for _, row := range corpus.Refusals {
		if row.Law == "" || row.Repair == "" {
			t.Fatalf("refusal %q is missing a law or a repair; refusal parity is total", row.Reason)
		}
		if row.Applicability == "machine-applicable" {
			machineApplicable = append(machineApplicable, row.Reason)
		}
	}
	if got := strings.Join(machineApplicable, ","); got != "last-writer-wins,unverified-read,past-mutation,anchored-resolve" {
		t.Fatalf("the machine-applicable four are [%s]; the codemod catalog is a different set than expected", got)
	}
	if len(corpus.Types) != 22 {
		t.Fatalf("%d type records, want the closed 22", len(corpus.Types))
	}
	for _, row := range corpus.Types {
		if row.Form == "structure" {
			if len(row.Constructors) != 1 || row.Constructors[0].Name != "mk" {
				t.Fatalf("structure %s does not carry exactly one constructor named mk", row.Name)
			}
		}
	}
}

func TestVectors(t *testing.T) {
	corpus := loadCorpus(t)
	if len(corpus.Encodings) != 12 {
		t.Fatalf("%d encoding records, want the twelve named vectors", len(corpus.Encodings))
	}
	tags := map[int64]bool{}
	for _, row := range corpus.Encodings {
		if len(row.Act) == 0 {
			t.Fatalf("encoding vector %q carries an empty act", row.Name)
		}
		tags[row.Act[0].Int64()] = true
	}
	for tag := int64(0); tag < 8; tag++ {
		if !tags[tag] {
			t.Fatalf("no encoding vector carries generator tag %d; no generator may be unrepresented", tag)
		}
	}
	if len(corpus.Admissions) != 17 {
		t.Fatalf("%d admission records, want 17", len(corpus.Admissions))
	}
	admitted := 0
	for index, row := range corpus.Admissions {
		if row.Verdict == "admitted" {
			admitted++
			if index != 16 {
				t.Fatalf("the admitted row is at position %d, want last", index)
			}
			if len(row.Encoded) == 0 {
				t.Fatalf("the admitted row %q carries no encoding", row.Name)
			}
		}
	}
	// A suite of refusals alone cannot tell a correct door from one that
	// refuses everything. The seventeenth row is what makes the other sixteen
	// mean anything.
	if admitted != 1 {
		t.Fatalf("%d admitted rows, want exactly 1", admitted)
	}
}

func TestDocGroup(t *testing.T) {
	corpus := loadCorpus(t)
	position := map[string]int{}
	for index, row := range corpus.Types {
		position[row.Name] = index
	}
	previous := -1
	for _, row := range corpus.Docs {
		if row.Target != "type" {
			t.Fatalf("doc record %q has target %q, want \"type\"", row.Name, row.Target)
		}
		at, declared := position[row.Name]
		if !declared {
			t.Fatalf("doc record names %q, which is not a declared type", row.Name)
		}
		if at <= previous {
			t.Fatalf("doc record %q is out of order; the doc group follows type declaration order", row.Name)
		}
		previous = at
		if row.Doc == "" {
			t.Fatalf("doc record %q carries an empty docstring", row.Name)
		}
	}
	// A fact of today, not a rule: every closed-list type currently carries a
	// docstring. A future type without one makes this a subsequence check,
	// which the order assertion above already is.
	if len(corpus.Docs) != len(corpus.Types) {
		t.Fatalf("%d doc records for %d types; today every closed-list type carries a docstring",
			len(corpus.Docs), len(corpus.Types))
	}
}

func TestCrossRecordInvariants(t *testing.T) {
	corpus := loadCorpus(t)
	for index := 0; index < 16; index++ {
		if corpus.Admissions[index].Reason != corpus.Refusals[index].Reason {
			t.Fatalf("admission %d refuses with %q while refusal %d is %q; the kernel gate's control order and the RefusalReason declaration order have diverged",
				index, corpus.Admissions[index].Reason, index, corpus.Refusals[index].Reason)
		}
	}
	var lawful []string
	for _, row := range corpus.Encodings {
		if row.Name == "lawful-declare" || row.Name == "lawfulDeclareAct" {
			for _, number := range row.Act {
				lawful = append(lawful, number.String())
			}
		}
	}
	if lawful == nil {
		t.Fatal("no encoding vector is the lawful twin")
	}
	var encoded []string
	for _, number := range corpus.Admissions[16].Encoded {
		encoded = append(encoded, number.String())
	}
	if strings.Join(lawful, ",") != strings.Join(encoded, ",") {
		t.Fatalf("the admitted row encodes [%s] while the lawful vector encodes [%s]; these are two emissions of one fact",
			strings.Join(encoded, ","), strings.Join(lawful, ","))
	}
}

func TestProvenance(t *testing.T) {
	corpus := loadCorpus(t)
	if corpus.Header.Source != kmconform.ExpectedSource {
		t.Fatalf("header source is %q, want %q", corpus.Header.Source, kmconform.ExpectedSource)
	}
	if corpus.Header.Generator != kmconform.ExpectedGenerator {
		t.Fatalf("header generator is %q, want %q", corpus.Header.Generator, kmconform.ExpectedGenerator)
	}
}

func firstDifference(left, right []byte) int {
	limit := min(len(left), len(right))
	for index := 0; index < limit; index++ {
		if left[index] != right[index] {
			return index
		}
	}
	return limit
}
