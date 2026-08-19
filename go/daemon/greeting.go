package daemon

import (
	"bytes"
	"errors"
	"fmt"
	"io"

	"foldlab/canonical"
)

// greetingOp is the pinned vendor's own protocol word for the block a server
// writes to a connection before anything else, READ FROM THE WIRE VOCABULARY
// rather than spelled again here.
//
// The row is reached by the vendor's own identifier for the declaration, so
// finding it costs no second statement of the word: the word travels out of the
// table and never into the query.
var greetingOp = mustVerb("server.InfoProto").Word + " "

// maxGreeting bounds the read so a connection that never terminates a line
// cannot grow the buffer without limit. The pinned server's client greeting is
// a few hundred bytes; the bound is generous by three orders of magnitude and
// is a refusal rather than a truncation.
const maxGreeting = 1 << 20

// parseGreeting reads one protocol greeting line into the JSON domain the fold
// speaks.
//
// The decode goes through the estate's canonical decoder rather than the
// standard library's, so the value the fold walks carries the same number
// domain the canonicalizer will re-emit — one decoder, one domain, no
// second-guessing about how an integer came back.
func parseGreeting(line []byte) (map[string]any, error) {
	if !bytes.HasPrefix(line, []byte(greetingOp)) {
		return nil, fmt.Errorf("the greeting does not open with the %q operation", greetingOp[:len(greetingOp)-1])
	}
	value, err := canonical.Decode(line[len(greetingOp):])
	if err != nil {
		return nil, fmt.Errorf("decode the greeting: %w", err)
	}
	greeting, ok := value.(map[string]any)
	if !ok {
		return nil, errors.New("the greeting does not carry a record")
	}
	return greeting, nil
}

// readGreetingFrom reads bytes until the first line terminator and parses what
// preceded it.
func readGreetingFrom(reader io.Reader) (map[string]any, error) {
	buffer := make([]byte, 0, 1024)
	chunk := make([]byte, 512)
	for {
		read, err := reader.Read(chunk)
		if read > 0 {
			buffer = append(buffer, chunk[:read]...)
			if index := indexCRLF(buffer); index >= 0 {
				return parseGreeting(buffer[:index])
			}
			if len(buffer) > maxGreeting {
				return nil, errors.New("the greeting exceeded its bound without terminating")
			}
		}
		if err != nil {
			return nil, fmt.Errorf("read the greeting: %w", err)
		}
	}
}

// indexCRLF reports where the first protocol line terminator sits, or -1.
func indexCRLF(buffer []byte) int { return bytes.Index(buffer, []byte("\r\n")) }

// hasGreetingOp reports whether one protocol line is a greeting.
func hasGreetingOp(line []byte) bool { return bytes.HasPrefix(line, []byte(greetingOp)) }
