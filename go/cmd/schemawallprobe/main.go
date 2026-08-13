// Command schemawallprobe emits the small Go-origin corpus for the
// Effect Schema transport wall. The wall judges decoded values and heads,
// never gzip bytes; malformed text rows prove rejection without laundering.
package main

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"os"

	"foldlab/stream"
)

type corpusRow struct {
	Name        string  `json:"name"`
	Stream      string  `json:"stream"`
	Seq         uint64  `json:"seq"`
	PayloadText *string `json:"payloadText,omitempty"`
	FrameBase64 string  `json:"frameBase64"`
	Head        string  `json:"head"`
}

type inputRow struct {
	name        string
	payloadText *string
	payload     []byte
}

func textRow(name, text string) inputRow {
	return inputRow{name: name, payloadText: &text, payload: []byte(text)}
}

func main() {
	if err := run(); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}

func run() error {
	streamName := "schema-wall"
	inputs := []inputRow{
		textRow("utf8-snow", "snow=雪"),
		textRow("utf8-rocket", "rocket=🚀"),
		textRow("utf8-bom", "\ufeff"),
		textRow("utf8-empty", ""),
		{name: "invalid-ff", payload: []byte{0xff}},
		{name: "invalid-fe", payload: []byte{0xfe}},
	}

	rows := make([]corpusRow, 0, len(inputs))
	for _, input := range inputs {
		event := stream.Event{Stream: streamName, Seq: 1, Payload: input.payload}
		frame, err := stream.GzipEvents([]stream.Event{event})
		if err != nil {
			return fmt.Errorf("frame %s: %w", input.name, err)
		}
		head := stream.HeadFrom(stream.StreamSeed(streamName), []stream.Event{event})
		rows = append(rows, corpusRow{
			Name:        input.name,
			Stream:      streamName,
			Seq:         event.Seq,
			PayloadText: input.payloadText,
			FrameBase64: base64.StdEncoding.EncodeToString(frame),
			Head:        head.Hex(),
		})
	}
	if err := json.NewEncoder(os.Stdout).Encode(rows); err != nil {
		return fmt.Errorf("encode corpus: %w", err)
	}
	return nil
}
