package main

import (
	"encoding/hex"
	"errors"
	"fmt"
	"os"

	"foldlab/canonical"
)

func main() {
	if len(os.Args) != 3 {
		fmt.Fprintln(os.Stderr, "usage: go run ./canonical/probes/cg1-go <left-hex> <right-hex>")
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
