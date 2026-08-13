package main

import (
	"encoding/hex"
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
	leftDigest := canonical.EntryDigest(canonical.ChainEntry{
		Seq:     0,
		Prev:    canonical.Genesis,
		Payload: string(left),
	})
	rightDigest := canonical.EntryDigest(canonical.ChainEntry{
		Seq:     0,
		Prev:    canonical.Genesis,
		Payload: string(right),
	})
	fmt.Printf("go-invalid-%s=%s\n", os.Args[1], leftDigest)
	fmt.Printf("go-invalid-%s=%s\n", os.Args[2], rightDigest)
	fmt.Printf("go-collision=%t\n", leftDigest == rightDigest)
}

func decode(value string) []byte {
	decoded, err := hex.DecodeString(value)
	if err != nil {
		fmt.Fprintf(os.Stderr, "decode %q: %v\n", value, err)
		os.Exit(2)
	}
	return decoded
}
