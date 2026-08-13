package main

import (
	"encoding/hex"
	"errors"
	"fmt"
	"os"
	"strconv"

	"foldlab/canonical"
)

func main() {
	if len(os.Args) != 6 {
		fmt.Fprintln(os.Stderr, "usage: go run ./canonical/probes/cg1-go <left-hex> <right-hex> <invalid-seq-1> <invalid-seq-2> <valid-max-seq>")
		os.Exit(2)
	}
	left := decode(os.Args[1])
	right := decode(os.Args[2])
	_, leftErr := canonical.EntryDigest(canonical.ChainEntry{
		Seq:     0,
		Prev:    canonical.Genesis,
		Payload: string(left),
	})
	_, rightErr := canonical.EntryDigest(canonical.ChainEntry{
		Seq:     0,
		Prev:    canonical.Genesis,
		Payload: string(right),
	})
	leftField, leftRefused := invalidField(leftErr)
	rightField, rightRefused := invalidField(rightErr)
	fmt.Printf("go-invalid-%s-refused=%t field=%s\n", os.Args[1], leftRefused, leftField)
	fmt.Printf("go-invalid-%s-refused=%t field=%s\n", os.Args[2], rightRefused, rightField)
	if !leftRefused || !rightRefused {
		os.Exit(1)
	}

	for _, value := range os.Args[3:5] {
		seq := parseInt(value)
		_, err := canonical.EntryDigest(canonical.ChainEntry{
			Seq:     seq,
			Prev:    canonical.Genesis,
			Payload: "valid",
		})
		var invalid *canonical.InvalidSequenceError
		refused := errors.As(err, &invalid) && invalid.Seq == seq
		fmt.Printf("go-invalid-sequence-refused=%t seq=%d\n", refused, seq)
		if !refused {
			os.Exit(1)
		}
	}

	validMax := parseInt(os.Args[5])
	digest, err := canonical.EntryDigest(canonical.ChainEntry{
		Seq:     validMax,
		Prev:    canonical.Genesis,
		Payload: "valid",
	})
	if err != nil {
		fmt.Fprintf(os.Stderr, "valid max sequence %d: %v\n", validMax, err)
		os.Exit(1)
	}
	fmt.Printf("go-valid-max-sequence-digest=%s seq=%d\n", digest, validMax)
}

func invalidField(err error) (string, bool) {
	var invalid *canonical.InvalidUTF8Error
	if !errors.As(err, &invalid) {
		return "", false
	}
	return invalid.Field, true
}

func decode(value string) []byte {
	decoded, err := hex.DecodeString(value)
	if err != nil {
		fmt.Fprintf(os.Stderr, "decode %q: %v\n", value, err)
		os.Exit(2)
	}
	return decoded
}

func parseInt(value string) int {
	parsed, err := strconv.ParseInt(value, 10, 64)
	if err != nil || int64(int(parsed)) != parsed {
		fmt.Fprintf(os.Stderr, "parse int %q: %v\n", value, err)
		os.Exit(2)
	}
	return int(parsed)
}
