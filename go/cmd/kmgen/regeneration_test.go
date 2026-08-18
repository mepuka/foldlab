// The regeneration gate (schema §11 check 32): any code generated FROM the
// artifact must itself regenerate byte-identically, and must be canonical for
// its language's formatter, so that a routine `gofmt -w` cannot silently
// change what the model said.
//
// A `DO NOT EDIT` banner is a request. This is the check.
//
// RUN WITH -count=1. Once kmconform.ConformanceCorpusPath points at
// packages/plait/fixtures/, the corpus lives outside this module and Go's
// test cache cannot attribute a change in it to the module root: plain
// `go test ./...` would print `ok (cached)` over a mutated corpus. The
// module's gate passes -count=1 for exactly this reason (go/AGENTS.md).
package main

import (
	"bytes"
	"go/format"
	"os"
	"path/filepath"
	"testing"
)

// moduleRoot is where `go run ./cmd/kmgen` is invoked from, reached from this
// package's own directory.
func moduleRoot() string { return filepath.Join("..", "..") }

func TestGeneratedTablesAreAFreshEmission(t *testing.T) {
	emitted, err := generate(corpusPathFrom(moduleRoot()))
	if err != nil {
		t.Fatalf("kmgen: %v", err)
	}
	target := generatedPathFrom(moduleRoot())
	committed, err := os.ReadFile(target)
	if err != nil {
		t.Fatalf("read the committed emission: %v", err)
	}
	if bytes.Equal(committed, emitted) {
		t.Logf("%s is a fresh emission (%d bytes)", generatedFile, len(emitted))
		return
	}
	t.Errorf(
		"%s drifted: the committed bytes are not what cmd/kmgen emits today (committed %d bytes, "+
			"regenerated %d). This is a FINDING, not a file to update: the committed bytes are the "+
			"record of what the old behaviour was, and regenerating before reporting destroys it.",
		generatedFile, len(committed), len(emitted))
	limit := min(len(committed), len(emitted))
	for index := 0; index < limit; index++ {
		if committed[index] != emitted[index] {
			t.Errorf("first difference at byte %d: committed %q, regenerated %q",
				index, window(committed, index), window(emitted, index))
			return
		}
	}
	t.Errorf("one emission is a prefix of the other, diverging at byte %d", limit)
}

func TestTheEmissionIsGofmtCanonical(t *testing.T) {
	// The generator runs format.Source over its own output, so this asserts
	// that the step actually happened rather than that gofmt is idempotent.
	emitted, err := generate(corpusPathFrom(moduleRoot()))
	if err != nil {
		t.Fatalf("kmgen: %v", err)
	}
	formatted, err := format.Source(emitted)
	if err != nil {
		t.Fatalf("the emission is not valid Go: %v", err)
	}
	if !bytes.Equal(emitted, formatted) {
		t.Fatalf("the emission is not gofmt-canonical: a routine format pass would change %d bytes into %d",
			len(emitted), len(formatted))
	}
}

func TestTheGeneratorIsDeterministic(t *testing.T) {
	// Two runs over one corpus, byte-compared. Map iteration order is the
	// usual way a generator becomes non-deterministic, and it fails here
	// rather than as an unexplained diff in someone's working tree.
	first, err := generate(corpusPathFrom(moduleRoot()))
	if err != nil {
		t.Fatalf("kmgen: %v", err)
	}
	second, err := generate(corpusPathFrom(moduleRoot()))
	if err != nil {
		t.Fatalf("kmgen: %v", err)
	}
	if !bytes.Equal(first, second) {
		t.Fatal("two runs of the generator over one corpus produced different bytes")
	}
}

func TestTheGeneratorRefusesAMalformedCorpus(t *testing.T) {
	// The generator is not more tolerant than the consumer it generates for.
	// A generator that read a broken artifact best-effort would compile the
	// defect into every downstream binary.
	broken := filepath.Join(t.TempDir(), "broken.ndjson")
	source, err := os.ReadFile(corpusPathFrom(moduleRoot()))
	if err != nil {
		t.Fatal(err)
	}
	mutated := bytes.Replace(source, []byte(`"format":2,`), []byte(`"format":9,`), 1)
	if bytes.Equal(source, mutated) {
		t.Fatal("the control mutation changed nothing")
	}
	if err := os.WriteFile(broken, mutated, 0o644); err != nil {
		t.Fatal(err)
	}
	if _, err := generate(broken); err == nil {
		t.Fatal("the generator accepted a corpus in an unknown format")
	}
}

func TestExportedIdentIsTotalOverTheCorpusNames(t *testing.T) {
	for _, testCase := range []struct{ wire, want string }{
		{"schema", "Schema"},
		{"clock-read", "ClockRead"},
		{"cross-sort-identifier", "CrossSortIdentifier"},
		{"lawful-declare", "LawfulDeclare"},
		{"trigger-head-advanced-past", "TriggerHeadAdvancedPast"},
	} {
		if got := exportedIdent(testCase.wire); got != testCase.want {
			t.Fatalf("exportedIdent(%q) = %q, want %q", testCase.wire, got, testCase.want)
		}
	}
}

func window(data []byte, at int) string {
	start := max(0, at-20)
	end := min(len(data), at+20)
	return string(data[start:end])
}
