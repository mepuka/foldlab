// Command plaitwall checks the TypeScript-emitted Plait envelope corpus with
// the independent Go RFC 8785 implementation.
package main

import (
	"bufio"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"os"

	"foldlab/canonical"
)

type provenance struct {
	Provenance string `json:"provenance"`
}

type row struct {
	Case     string          `json:"case"`
	Digest   string          `json:"digest"`
	Envelope json.RawMessage `json:"envelope"`
}

func main() {
	corpus := flag.String("corpus", "", "path to the generated envelope NDJSON corpus")
	flag.Parse()
	if err := run(*corpus); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}

func run(path string) error {
	if path == "" {
		return errors.New("--corpus is required")
	}
	file, err := os.Open(path)
	if err != nil {
		return fmt.Errorf("open corpus: %w", err)
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	scanner.Buffer(make([]byte, 64*1024), 8*1024*1024)
	if !scanner.Scan() {
		return errors.New("corpus is empty")
	}
	var header provenance
	if err := json.Unmarshal(scanner.Bytes(), &header); err != nil {
		return fmt.Errorf("decode provenance: %w", err)
	}
	if header.Provenance != "bun run generate:corpus" {
		return fmt.Errorf("unexpected provenance %q", header.Provenance)
	}

	count := 0
	for scanner.Scan() {
		var candidate row
		if err := json.Unmarshal(scanner.Bytes(), &candidate); err != nil {
			return fmt.Errorf("decode row %d: %w", count+1, err)
		}
		encoded, err := canonical.Canonicalize(candidate.Envelope)
		if err != nil {
			return fmt.Errorf("%s: canonicalize envelope: %w", candidate.Case, err)
		}
		derived := canonical.DigestHex(encoded)
		if candidate.Digest != derived {
			return fmt.Errorf(
				"%s: digest mismatch: got %s, want %s",
				candidate.Case,
				candidate.Digest,
				derived,
			)
		}
		count++
	}
	if err := scanner.Err(); err != nil {
		return fmt.Errorf("read corpus: %w", err)
	}
	if count == 0 {
		return errors.New("corpus carries no envelopes")
	}
	fmt.Printf("PLAIT WALL: PASS (%d envelopes)\n", count)
	return nil
}
