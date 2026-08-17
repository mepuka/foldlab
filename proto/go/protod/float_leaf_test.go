package protod

import (
	"encoding/json"
	"os"
	"path/filepath"
	"regexp"
	"slices"
	"strings"
	"testing"
)

func TestRemovedFloatLeafFillRefusesThroughUnknownKind(t *testing.T) {
	body, err := json.Marshal(map[string]any{
		"partial": map[string]any{"k": "hole"},
		"path":    []any{},
		"subtree": map[string]any{"k": "float"},
	})
	if err != nil {
		t.Fatal(err)
	}

	response, ok := (&Daemon{}).serveFill(body).(refusalReply)
	if !ok {
		t.Fatalf("float-leaf fill returned %T, want refusalReply", (&Daemon{}).serveFill(body))
	}
	refusal := response.Refusal
	if refusal.Kind != KindInvalidStructure {
		t.Fatalf("float-leaf fill refusal kind = %q, want %q", refusal.Kind, KindInvalidStructure)
	}
	if refusal.Law != "flb.type.v0: unknown kind refuses — the grammar grows under ticket 004, never by admission on faith" {
		t.Fatalf("float-leaf fill used a new refusal law: %q", refusal.Law)
	}
	if !slices.Equal(refusal.Path, []string{"partial", "k"}) {
		t.Fatalf("float-leaf fill refusal path = %v, want [partial k]", refusal.Path)
	}
	if refusal.Got != "float" {
		t.Fatalf("float-leaf fill refusal got = %#v, want float", refusal.Got)
	}
}

func TestRemovedFloatLeafIsNotAdmittedByProtocolValueCheck(t *testing.T) {
	refusal := (&Daemon{}).checkValue(
		map[string]any{"k": "float"},
		float64(1.5),
		[]string{"value"},
	)
	if refusal == nil || refusal.Kind != KindInvalidStructure {
		t.Fatalf("removed float leaf value check = %#v, want invalid-structure", refusal)
	}
	if !slices.Equal(refusal.Path, []string{"value"}) {
		t.Fatalf("removed float leaf value-check path = %v, want [value]", refusal.Path)
	}
}

func TestFloatLeafSourceGrepGuard(t *testing.T) {
	read := func(path string) string {
		t.Helper()
		content, err := os.ReadFile(filepath.Clean(path))
		if err != nil {
			t.Fatalf("read %s: %v", path, err)
		}
		return string(content)
	}

	spec := read(filepath.Join("..", "..", "SPEC.md"))
	start := strings.Index(spec, "## The authoring grammar")
	if start < 0 {
		t.Fatal("could not locate SPEC.md's authoring grammar section")
	}
	end := strings.Index(spec[start:], "## Skeleton")
	if end < 0 {
		t.Fatal("could not locate SPEC.md's authoring grammar section")
	}
	if strings.Contains(spec[start:start+end], `"float"`) {
		t.Fatal("SPEC.md's flb.type.v0 grammar reintroduced the float leaf")
	}

	guards := []struct {
		name      string
		path      string
		forbidden *regexp.Regexp
	}{
		{
			name:      "protocol value checker",
			path:      "value_check.go",
			forbidden: regexp.MustCompile(`case\s+"float"\s*:`),
		},
		{
			name:      "completion corpus alphabet",
			path:      "completion.go",
			forbidden: regexp.MustCompile(`leafCompletion\s*\(\s*"float"`),
		},
		{
			name:      "fixture corpus alphabet",
			path:      filepath.Join("..", "cmd", "wirefix", "main.go"),
			forbidden: regexp.MustCompile(`leaf-float|m\(\s*"k"\s*,\s*"float"`),
		},
	}
	for _, guard := range guards {
		if guard.forbidden.MatchString(read(guard.path)) {
			t.Errorf("%s reintroduced the float leaf in %s", guard.name, guard.path)
		}
	}
}
