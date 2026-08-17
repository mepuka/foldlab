package main

import (
	"bytes"
	"os"
	"path/filepath"
	"sort"
	"testing"
)

// The regeneration gate. `proto/AGENTS.md` and `docs/FREEZING.md` both state
// that the wirefix five "regenerate byte-identically from
// `go run ./cmd/wirefix -force`; a fixture without that property is not frozen,
// it is stranded" — and until this file, nothing ran that claim. The `-force`
// flag is an OVERWRITE guard, not a regeneration diff: it stops an accidental
// write, and says nothing about whether the committed bytes are still what the
// generator emits.
//
// So this is the house's no-hand-authored-model-verdicts law made mechanical
// for this family: run the generator into a clean directory and byte-compare.
// Drift is a FINDING — the committed bytes are the record of what the old
// behaviour was, and regenerating before reporting destroys it (FREEZING.md,
// the regeneration ritual, step 1).
//
// RUN THIS WITH -count=1. The fixtures live in proto/wire/, outside the
// proto/go module, and Go's test cache does not track files it cannot
// attribute to the module: plain `go test ./...` prints `ok (cached)` for this
// package even after a committed fixture has been mutated — measured, not
// assumed. `bun run gates` therefore carries a dedicated
// `proto/go — wire fixture regeneration` stage that passes -count=1, and that
// stage, not `go test ./...`, is where this claim is actually checked.

func committedFixtureDir() string {
	return filepath.Join("..", "..", "..", "wire", "fixtures")
}

func TestCommittedFixturesAreAFreshEmission(t *testing.T) {
	fresh := t.TempDir()
	if err := generate(fresh, true); err != nil {
		t.Fatalf("wirefix: %v", err)
	}

	for _, name := range fixtureNames() {
		emitted, err := os.ReadFile(filepath.Join(fresh, name))
		if err != nil {
			t.Fatalf("read regenerated %s: %v", name, err)
		}
		committed, err := os.ReadFile(filepath.Join(committedFixtureDir(), name))
		if err != nil {
			t.Fatalf("read committed %s: %v", name, err)
		}
		if bytes.Equal(emitted, committed) {
			continue
		}
		t.Errorf(
			"%s drifted: the committed bytes are not what cmd/wirefix emits today "+
				"(committed %d bytes, regenerated %d). This is a FINDING, not a fixture "+
				"to update: report it with the diff and stop. Regeneration is an operator "+
				"decision with a stated reason (docs/FREEZING.md).",
			name, len(committed), len(emitted))
		t.Errorf("%s: first difference at byte %d", name, firstDifference(committed, emitted))
	}
}

// A gate over a name list is only as complete as the list. This pins the list
// to what the generator actually wrote and to what is actually committed, so a
// sixth fixture cannot join the family and skip the diff.
func TestRegenerationGateCoversEveryFixtureTheGeneratorWrites(t *testing.T) {
	fresh := t.TempDir()
	if err := generate(fresh, true); err != nil {
		t.Fatalf("wirefix: %v", err)
	}

	written, err := os.ReadDir(fresh)
	if err != nil {
		t.Fatal(err)
	}
	emitted := make([]string, 0, len(written))
	for _, entry := range written {
		emitted = append(emitted, entry.Name())
	}
	declared := fixtureNames()
	sort.Strings(emitted)
	sorted := append([]string{}, declared...)
	sort.Strings(sorted)
	if len(emitted) != len(sorted) {
		t.Fatalf("the generator wrote %v; fixtureNames() declares %v", emitted, sorted)
	}
	for index := range sorted {
		if emitted[index] != sorted[index] {
			t.Fatalf("the generator wrote %v; fixtureNames() declares %v", emitted, sorted)
		}
	}

	for _, name := range declared {
		if _, err := os.Stat(filepath.Join(committedFixtureDir(), name)); err != nil {
			t.Errorf("%s is generated but not committed: %v", name, err)
		}
	}
}

// The overwrite guard is the other half of the freezing protocol and is easy to
// break while refactoring the generator: without -force, an existing fixture
// refuses to be written at all.
func TestOverwriteGuardRefusesWithoutForce(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "types.json")
	if err := os.WriteFile(path, []byte("{}\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	if err := writeFixture(dir, "types.json", []any{}, false); err == nil {
		t.Fatal("writeFixture overwrote an existing fixture without -force")
	}
	content, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	if string(content) != "{}\n" {
		t.Fatalf("the refused write still touched the file: %q", content)
	}
}

func firstDifference(left, right []byte) int {
	limit := len(left)
	if len(right) < limit {
		limit = len(right)
	}
	for index := 0; index < limit; index++ {
		if left[index] != right[index] {
			return index
		}
	}
	return limit
}
