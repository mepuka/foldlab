package substrate_test

import (
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"runtime"
	"sort"
	"strings"
	"testing"
)

type lawIndexEntry struct {
	law      string
	status   string
	evidence string
}

var lawID = regexp.MustCompile(`^[a-z][a-z0-9-]*/[A-Z]+[0-9]+$`)

func repoRoot(t *testing.T) string {
	t.Helper()
	_, file, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatal("locate laws-index test")
	}
	return filepath.Clean(filepath.Join(filepath.Dir(file), "..", ".."))
}

func parseLawIndex(t *testing.T, root string) []lawIndexEntry {
	t.Helper()
	raw, err := os.ReadFile(filepath.Join(root, "docs", "laws", "INDEX.md"))
	if err != nil {
		t.Fatalf("read laws index: %v", err)
	}
	var entries []lawIndexEntry
	for _, line := range strings.Split(string(raw), "\n") {
		if !strings.HasPrefix(line, "| `") {
			continue
		}
		cells := strings.Split(strings.Trim(line, "| \r"), " | ")
		if len(cells) != 4 {
			t.Fatalf("malformed laws-index row: %q", line)
		}
		entries = append(entries, lawIndexEntry{
			law:      strings.Trim(cells[0], "`"),
			status:   cells[1],
			evidence: strings.Trim(cells[3], "`"),
		})
	}
	return entries
}

func validateLawEvidence(root string, entry lawIndexEntry) error {
	if !lawID.MatchString(entry.law) {
		return fmt.Errorf("invalid namespaced law id %q", entry.law)
	}
	if entry.status != "checked" && !strings.HasPrefix(entry.status, "held (") {
		return fmt.Errorf("law %s has invalid status %q", entry.law, entry.status)
	}
	for _, raw := range strings.Split(entry.evidence, "; ") {
		path, marker, ok := strings.Cut(raw, "#")
		if !ok || path == "" || marker == "" {
			return fmt.Errorf("law %s has malformed evidence %q", entry.law, raw)
		}
		if strings.Contains(path, "..") || filepath.IsAbs(path) {
			return fmt.Errorf("law %s evidence escapes the repository: %q", entry.law, path)
		}
		if !strings.HasSuffix(path, "_test.go") && !strings.HasSuffix(path, ".test.ts") {
			return fmt.Errorf("law %s evidence is not an executable test file: %q", entry.law, path)
		}
		source, err := os.ReadFile(filepath.Join(root, filepath.FromSlash(path)))
		if err != nil {
			return fmt.Errorf("law %s evidence %q: %w", entry.law, path, err)
		}
		if !strings.Contains(string(source), marker) {
			return fmt.Errorf("law %s marker %q is absent from %s", entry.law, marker, path)
		}
	}
	return nil
}

func TestNamedLawsHaveExecutableEvidence(t *testing.T) {
	root := repoRoot(t)
	entries := parseLawIndex(t, root)
	want := []string{
		"proto/W1", "proto/W2", "proto/W3", "proto/W4", "proto/W5",
		"proto/W6", "proto/W7", "proto/W8", "proto/W9", "proto/W10",
		"concierge/C1", "concierge/C2", "concierge/C3", "concierge/C4", "concierge/C5",
		"entity/EC1", "entity/EC2", "entity/EC3", "entity/EC4",
		"effector/EL0", "effector/EL1", "effector/EL2", "effector/EL3", "effector/EL4",
		"effector/EL5", "effector/EL6", "effector/EL7", "effector/EL8", "effector/EL9", "effector/EL10",
		"effector/WL1", "effector/WL2", "effector/WL3", "effector/WL4",
	}
	got := make([]string, 0, len(entries))
	seen := make(map[string]struct{}, len(entries))
	for _, entry := range entries {
		if _, duplicate := seen[entry.law]; duplicate {
			t.Fatalf("law %s appears more than once", entry.law)
		}
		seen[entry.law] = struct{}{}
		got = append(got, entry.law)
		if err := validateLawEvidence(root, entry); err != nil {
			t.Fatal(err)
		}
	}
	sort.Strings(got)
	sort.Strings(want)
	if strings.Join(got, "\n") != strings.Join(want, "\n") {
		t.Fatalf("indexed law families moved:\n got %v\nwant %v", got, want)
	}
}

func TestLawsIndexGateRejectsAStaleMarker(t *testing.T) {
	err := validateLawEvidence(repoRoot(t), lawIndexEntry{
		law:      "effector/EL3",
		status:   "checked",
		evidence: "go/effector/effector_test.go#func TestDefinitelyMissing",
	})
	if err == nil || !strings.Contains(err.Error(), "marker") {
		t.Fatalf("stale-marker negative control did not refute the gate: %v", err)
	}
}
