//go:build js && wasm

// Command wasmwall is the wasm face of the transform wall: the SAME Go
// source as go/stream, compiled to GOOS=js GOARCH=wasm, running inside Bun,
// reproducing the frozen fixture digest (test/wasm.wall.test.ts). Same Go
// source, three runtimes, one digest.
//
// The boundary is DATA, not FFI: one registered entry point taking a base64
// gzip transport frame of canonical events and returning one JSON string —
// output frame, kept count, and the output chain head. Nothing else crosses.
// Errors return as {"error": ...}; no exception ever crosses the boundary.
package main

import (
	"encoding/base64"
	"encoding/json"
	"syscall/js"

	"foldlab/stream"
)

type result struct {
	Head       string `json:"head"`
	Kept       int    `json:"kept"`
	GzipBase64 string `json:"gzipBase64"`
}

func fail(msg string) string {
	out, _ := json.Marshal(map[string]string{"error": msg})
	return string(out)
}

// run is the single boundary crossing: base64(gzip frames) in, JSON out.
// The pipeline is the fixture pin — Compose(RenameStream("z"),
// FilterKeyPrefix("a"), MapValueUpper()) seeded from StreamSeed("t").
func run(_ js.Value, args []js.Value) any {
	if len(args) != 1 || args[0].Type() != js.TypeString {
		return fail("wasmwall: want one base64 string argument")
	}
	frame, err := base64.StdEncoding.DecodeString(args[0].String())
	if err != nil {
		return fail("wasmwall: " + err.Error())
	}
	events, err := stream.GunzipEvents(frame)
	if err != nil {
		return fail("wasmwall: " + err.Error())
	}
	pipeline := stream.Compose(
		stream.RenameStream("z"), stream.FilterKeyPrefix("a"), stream.MapValueUpper(),
	)
	transformed := stream.Apply(pipeline, events)
	outFrame, err := stream.GzipEvents(transformed)
	if err != nil {
		return fail("wasmwall: " + err.Error())
	}
	out, err := json.Marshal(result{
		Head:       stream.HeadFrom(stream.StreamSeed("t"), transformed).Hex(),
		Kept:       len(transformed),
		GzipBase64: base64.StdEncoding.EncodeToString(outFrame),
	})
	if err != nil {
		return fail("wasmwall: " + err.Error())
	}
	return string(out)
}

func main() {
	js.Global().Set("foldlabWasmWall", js.FuncOf(run))
	select {} // stay resident; the registered func is the program
}
