//go:build !(js && wasm)

// Host stub so `go vet ./...` and `go build ./...` stay green on native
// platforms; the real program is main.go under js && wasm.
package main

import (
	"fmt"
	"os"
)

func main() {
	fmt.Fprintln(os.Stderr, "wasmwall: build with GOOS=js GOARCH=wasm (bun run build:wasm)")
	os.Exit(1)
}
