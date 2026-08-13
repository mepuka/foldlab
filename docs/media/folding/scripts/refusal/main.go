// Drives the "Refusal is a value" clip with a REAL refusal.
//
// Feeds ApplyMerge a source that repeats a sequence coordinate and prints the
// typed *stream.MergeDuplicateSequence it comes back with: its four fields and
// the exact string its Error() method formats. Nothing here writes the message
// by hand.
//
//	cd docs/media/folding/scripts/refusal && go run .
package main

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"runtime"

	"foldlab/stream"
)

// dataDir resolves docs/media/folding/data from this source file, so the
// driver writes to the same place whatever directory it is run from.
func dataDir() string {
	_, self, _, ok := runtime.Caller(0)
	if !ok {
		panic("cannot locate the driver source")
	}
	return filepath.Join(filepath.Dir(self), "..", "..", "data")
}

type refusal struct {
	Provenance     string   `json:"_provenance"`
	Language       string   `json:"language"`
	Tag            string   `json:"tag"`
	Source         string   `json:"source"`
	Seq            uint64   `json:"seq"`
	FirstIndex     int      `json:"firstIndex"`
	DuplicateIndex int      `json:"duplicateIndex"`
	Message        string   `json:"message"`
	Payloads       []string `json:"payloads"`
}

func main() {
	payloads := []string{"status=new", "qty=2", "status=paid", "qty=5"}
	events := []stream.Event{
		{Stream: "orders", Seq: 0, Payload: []byte(payloads[0])},
		{Stream: "orders", Seq: 1, Payload: []byte(payloads[1])},
		{Stream: "orders", Seq: 2, Payload: []byte(payloads[2])},
		{Stream: "orders", Seq: 1, Payload: []byte(payloads[3])},
	}
	fact := stream.MergeFact{Picks: []stream.Pick{
		{Stream: "orders", Seq: 0},
		{Stream: "orders", Seq: 1},
		{Stream: "orders", Seq: 2},
	}}

	_, err := stream.ApplyMerge(fact, map[string][]stream.Event{"orders": events})
	dup, ok := err.(*stream.MergeDuplicateSequence)
	if !ok {
		fmt.Fprintf(os.Stderr, "expected *stream.MergeDuplicateSequence, got %#v\n", err)
		os.Exit(1)
	}

	out := refusal{
		Provenance:     "cd docs/media/folding/scripts/refusal && go run .",
		Language:       "go",
		Tag:            "MergeDuplicateSequence",
		Source:         dup.Source,
		Seq:            dup.Seq,
		FirstIndex:     dup.FirstIndex,
		DuplicateIndex: dup.DuplicateIndex,
		Message:        dup.Error(),
		Payloads:       payloads,
	}

	encoded, err := json.MarshalIndent(out, "", "  ")
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
	if err := os.WriteFile(filepath.Join(dataDir(), "refusal-go.json"), append(encoded, '\n'), 0o644); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
	fmt.Println(string(encoded))
}
