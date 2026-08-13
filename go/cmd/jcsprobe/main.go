// Command jcsprobe is the line-oriented Go endpoint for the Task 09
// differential wall. It reads base64 JSON bytes and reports constrained
// acceptance plus canonical bytes; stderr and nonzero exit mean harness fault.
package main

import (
	"bufio"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"os"

	"foldlab/canonical"
)

type request struct {
	Input string `json:"input"`
}

type response struct {
	Accepted  bool   `json:"accepted"`
	Canonical string `json:"canonical,omitempty"`
	Error     string `json:"error,omitempty"`
}

func main() {
	if err := run(); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}

func run() error {
	scanner := bufio.NewScanner(os.Stdin)
	scanner.Buffer(make([]byte, 64*1024), 8*1024*1024)
	writer := bufio.NewWriter(os.Stdout)
	encoder := json.NewEncoder(writer)
	for scanner.Scan() {
		var input request
		if err := json.Unmarshal(scanner.Bytes(), &input); err != nil {
			return fmt.Errorf("decode request: %w", err)
		}
		raw, err := base64.StdEncoding.DecodeString(input.Input)
		if err != nil {
			return fmt.Errorf("decode request input: %w", err)
		}
		value, err := canonical.Decode(raw)
		if err != nil {
			if err := encoder.Encode(response{Accepted: false}); err != nil {
				return fmt.Errorf("encode refusal: %w", err)
			}
			if err := writer.Flush(); err != nil {
				return fmt.Errorf("flush refusal: %w", err)
			}
			continue
		}
		encoded, err := canonical.CanonicalizeValue(value)
		if err != nil {
			if err := encoder.Encode(response{Accepted: true, Error: err.Error()}); err != nil {
				return fmt.Errorf("encode canonicalization error: %w", err)
			}
		} else if err := encoder.Encode(response{Accepted: true, Canonical: string(encoded)}); err != nil {
			return fmt.Errorf("encode reply: %w", err)
		}
		if err := writer.Flush(); err != nil {
			return fmt.Errorf("flush reply: %w", err)
		}
	}
	if err := scanner.Err(); err != nil {
		return fmt.Errorf("read request: %w", err)
	}
	return nil
}
