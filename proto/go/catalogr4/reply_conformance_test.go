package catalogr4

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"
)

func TestReplyConformanceCorpusUsesTheGoDecoderAsItsOracle(t *testing.T) {
	data, err := os.ReadFile(filepath.Join("..", "..", "wire", "reply-conformance.json"))
	if err != nil {
		t.Fatal(err)
	}
	var corpus struct {
		Cases []struct {
			Name   string         `json:"name"`
			Kind   string         `json:"kind"`
			Accept bool           `json:"accept"`
			Value  map[string]any `json:"value"`
		} `json:"cases"`
	}
	if err := json.Unmarshal(data, &corpus); err != nil {
		t.Fatal(err)
	}
	if len(corpus.Cases) == 0 {
		t.Fatal("reply conformance corpus is empty")
	}
	for _, row := range corpus.Cases {
		t.Run(row.Name, func(t *testing.T) {
			var err error
			switch row.Kind {
			case "create":
				_, err = decodeCreateFact(row.Value)
			case "admit":
				err = decodeAdmitFact(row.Value, dataJournalName)
			case "refusal":
				_, err = decodeRefusalFact(row.Value)
			default:
				t.Fatalf("unknown corpus kind %q", row.Kind)
			}
			if got := err == nil; got != row.Accept {
				t.Fatalf("accepted = %t, want %t (error: %v)", got, row.Accept, err)
			}
		})
	}
}
