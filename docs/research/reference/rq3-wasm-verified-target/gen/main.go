// Command gen emits every .wasm probe used by the RQ-3 report.
//
// Every module here is hand-encoded from the WebAssembly core specification's
// binary format. Nothing is vendored; there is no third-party code and no
// toolchain dependency beyond the Go compiler. That matters: the probes must
// be byte-reproducible from source on any machine that has Go, because the
// whole question under investigation is whether the same bytes behave the
// same way in two different hosts.
//
// Modules emitted:
//
//	probe.wasm          zero imports. NaN payload, memory.grow, and a pure
//	                    byte-in/byte-out function over linear memory.
//	feat_shared.wasm    memory declared `shared` (threads proposal)
//	feat_atomic.wasm    shared memory + i32.atomic.load (threads proposal)
//	feat_tailcall.wasm  return_call (tail-call proposal, wasm 3.0)
//	wasi_min.wasm       WASI preview1: fd_write(stdout, "hi\n")
//	wasi_grow.wasm      as above, after memory.grow(1)
//	wasi_rand_ok.wasm   proc_exit(random_get(buf=8, len=32))     -> errno 0
//	wasi_rand_oob.wasm  proc_exit(random_get(buf=2^30, len=32))  -> errno 21 EFAULT
//
// The wasi_rand pair is the sharp one: the process exit code IS the errno the
// host's WASI shim returned, so two hosts can be compared with no host-side
// instrumentation at all.
package main

import (
	"crypto/sha256"
	"encoding/binary"
	"encoding/hex"
	"fmt"
	"math"
	"os"
)

// ---------------------------------------------------------------- encoding

func uleb(n uint32) []byte {
	var out []byte
	for {
		b := byte(n & 0x7f)
		n >>= 7
		if n != 0 {
			b |= 0x80
		}
		out = append(out, b)
		if n == 0 {
			return out
		}
	}
}

// sleb encodes signed LEB128, which is what i32.const takes. Encoding a
// small positive value with the plain uleb encoder silently produces a
// NEGATIVE constant whenever bit 6 is set (0x40..0x7F): that mistake cost a
// wrong EFAULT reading in this very investigation before it was caught.
func sleb(v int32) []byte {
	var out []byte
	for {
		b := byte(v & 0x7f)
		v >>= 7
		done := (v == 0 && b&0x40 == 0) || (v == -1 && b&0x40 != 0)
		if !done {
			b |= 0x80
		}
		out = append(out, b)
		if done {
			return out
		}
	}
}

func vec(items [][]byte) []byte {
	out := uleb(uint32(len(items)))
	for _, it := range items {
		out = append(out, it...)
	}
	return out
}

func section(id byte, body []byte) []byte {
	out := []byte{id}
	out = append(out, uleb(uint32(len(body)))...)
	return append(out, body...)
}

func name(s string) []byte {
	out := uleb(uint32(len(s)))
	return append(out, []byte(s)...)
}

func code(locals []byte, instrs []byte) []byte {
	inner := append([]byte{}, locals...)
	inner = append(inner, instrs...)
	inner = append(inner, 0x0B) // end
	return append(uleb(uint32(len(inner))), inner...)
}

const (
	i32 = 0x7F
	i64 = 0x7E
)

func functype(params, results []byte) []byte {
	out := []byte{0x60}
	out = append(out, uleb(uint32(len(params)))...)
	out = append(out, params...)
	out = append(out, uleb(uint32(len(results)))...)
	return append(out, results...)
}

func export(n string, kind byte, idx uint32) []byte {
	out := name(n)
	out = append(out, kind)
	return append(out, uleb(idx)...)
}

func importFn(mod, fld string, typeidx uint32) []byte {
	out := name(mod)
	out = append(out, name(fld)...)
	out = append(out, 0x00)
	return append(out, uleb(typeidx)...)
}

func f32const(v float32) []byte {
	b := make([]byte, 4)
	binary.LittleEndian.PutUint32(b, math.Float32bits(v))
	return append([]byte{0x43}, b...)
}

func f64const(v float64) []byte {
	b := make([]byte, 8)
	binary.LittleEndian.PutUint64(b, math.Float64bits(v))
	return append([]byte{0x44}, b...)
}

func module(sections ...[]byte) []byte {
	out := []byte{0x00, 0x61, 0x73, 0x6D, 0x01, 0x00, 0x00, 0x00}
	for _, s := range sections {
		out = append(out, s...)
	}
	return out
}

// ---------------------------------------------------------------- probe.wasm

func buildProbe() []byte {
	typeSec := section(1, vec([][]byte{
		functype([]byte{i32}, []byte{i32}),      // 0
		functype([]byte{i64}, []byte{i64}),      // 1
		functype([]byte{i32, i32}, []byte{i32}), // 2
		functype([]byte{i32, i32}, []byte{}),    // 3
	}))
	funcSec := section(3, append(uleb(5), 0, 1, 0, 2, 3))
	memSec := section(5, append(uleb(1), 0x01, 1, 2)) // min 1, max 2
	expSec := section(7, vec([][]byte{
		export("mem", 0x02, 0),
		export("nan_f32", 0x00, 0),
		export("nan_f64", 0x00, 1),
		export("mem_grow", 0x00, 2),
		export("checksum", 0x00, 3),
		export("bump", 0x00, 4),
	}))

	noLocals := uleb(0)

	// nan_f32: f32.mul(f32.reinterpret_i32(bits), 1.0), bits back out.
	// 1.0 is not a NaN, so any NaN in the result came from the input, and
	// the spec's NaN-propagation rule is what decides the output payload.
	c0 := []byte{0x20, 0x00, 0xBE}
	c0 = append(c0, f32const(1.0)...)
	c0 = append(c0, 0x94, 0xBC)

	c1 := []byte{0x20, 0x00, 0xBF}
	c1 = append(c1, f64const(1.0)...)
	c1 = append(c1, 0xA2, 0xBD)

	c2 := []byte{0x20, 0x00, 0x40, 0x00} // local.get 0; memory.grow 0

	locAcc := []byte{0x01, 0x01, i32}
	c3 := []byte{
		0x02, 0x40, 0x03, 0x40, // block; loop
		0x20, 0x01, 0x45, 0x0D, 0x01, // if len==0 break
		0x20, 0x02, 0x20, 0x00, 0x2D, 0x00, 0x00, 0x6A, 0x21, 0x02, // acc += mem[ptr]
		0x20, 0x00, 0x41, 0x01, 0x6A, 0x21, 0x00, // ptr++
		0x20, 0x01, 0x41, 0x01, 0x6B, 0x21, 0x01, // len--
		0x0C, 0x00, 0x0B, 0x0B, // br 0; end loop; end block
		0x20, 0x02,
	}
	c4 := []byte{
		0x02, 0x40, 0x03, 0x40,
		0x20, 0x01, 0x45, 0x0D, 0x01,
		0x20, 0x00, 0x20, 0x00, 0x2D, 0x00, 0x00, 0x41, 0x01, 0x6A, 0x3A, 0x00, 0x00,
		0x20, 0x00, 0x41, 0x01, 0x6A, 0x21, 0x00,
		0x20, 0x01, 0x41, 0x01, 0x6B, 0x21, 0x01,
		0x0C, 0x00, 0x0B, 0x0B,
	}
	codeSec := section(10, vec([][]byte{
		code(noLocals, c0), code(noLocals, c1), code(noLocals, c2),
		code(locAcc, c3), code(noLocals, c4),
	}))
	return module(typeSec, funcSec, memSec, expSec, codeSec)
}

// ------------------------------------------------------------ feature probes

func buildFeature(kind string) []byte {
	typeSec := section(1, vec([][]byte{functype(nil, []byte{i32})}))
	funcSec := section(3, append(uleb(1), 0))
	var memSec []byte
	switch kind {
	case "shared", "atomic":
		memSec = section(5, append(uleb(1), 0x03, 1, 2)) // 0x03 = shared+max
	default:
		memSec = section(5, append(uleb(1), 0x01, 1, 2))
	}
	expSec := section(7, vec([][]byte{
		export("mem", 0x02, 0),
		export("probe", 0x00, 0),
	}))
	var instrs []byte
	switch kind {
	case "atomic":
		instrs = []byte{0x41, 0x00, 0xFE, 0x10, 0x02, 0x00} // i32.const 0; i32.atomic.load
	case "tailcall":
		// return_call 0 -- self tail call. NOTE: a host that ACCEPTS this
		// loops forever, so drivers must validate/compile it only.
		instrs = []byte{0x12, 0x00}
	default:
		instrs = []byte{0x41, 0x2A}
	}
	codeSec := section(10, vec([][]byte{code(uleb(0), instrs)}))
	return module(typeSec, funcSec, memSec, expSec, codeSec)
}

// ---------------------------------------------------------------- WASI probes

func buildWasiWrite(grow bool) []byte {
	typeSec := section(1, vec([][]byte{
		functype([]byte{i32, i32, i32, i32}, []byte{i32}), // fd_write
		functype([]byte{i32}, []byte{}),                   // proc_exit
		functype(nil, nil),                                // _start
	}))
	impSec := section(2, vec([][]byte{
		importFn("wasi_snapshot_preview1", "fd_write", 0),  // func 0
		importFn("wasi_snapshot_preview1", "proc_exit", 1), // func 1
	}))
	funcSec := section(3, append(uleb(1), 2))
	memSec := section(5, append(uleb(1), 0x01, 1, 2))
	expSec := section(7, vec([][]byte{
		export("memory", 0x02, 0),
		export("_start", 0x00, 2),
	}))
	var instrs []byte
	if grow {
		instrs = append(instrs, 0x41, 0x01, 0x40, 0x00, 0x1A) // memory.grow 1; drop
	}
	instrs = append(instrs,
		0x41, 0x01, // fd = 1 stdout
		0x41, 0x00, // iovs = 0
		0x41, 0x01, // iovs_len = 1
		0x41, 0x20, // nwritten = 32
		0x10, 0x00, // call fd_write
		0x1A, // drop
	)
	codeSec := section(10, vec([][]byte{code(uleb(0), instrs)}))
	data := []byte{8, 0, 0, 0, 3, 0, 0, 0, 'h', 'i', '\n'}
	seg := []byte{0x00, 0x41, 0x00, 0x0B}
	seg = append(seg, uleb(uint32(len(data)))...)
	seg = append(seg, data...)
	dataSec := section(11, vec([][]byte{seg}))
	return module(typeSec, impSec, funcSec, memSec, expSec, codeSec, dataSec)
}

func buildWasiRand(ptr int32) []byte {
	typeSec := section(1, vec([][]byte{
		functype([]byte{i32, i32}, []byte{i32}), // random_get
		functype([]byte{i32}, []byte{}),         // proc_exit
		functype(nil, nil),                      // _start
	}))
	impSec := section(2, vec([][]byte{
		importFn("wasi_snapshot_preview1", "proc_exit", 1),  // func 0
		importFn("wasi_snapshot_preview1", "random_get", 0), // func 1
	}))
	funcSec := section(3, append(uleb(1), 2))
	memSec := section(5, append(uleb(1), 0x01, 1, 2))
	expSec := section(7, vec([][]byte{
		export("memory", 0x02, 0),
		export("_start", 0x00, 2),
	}))
	instrs := []byte{0x41}
	instrs = append(instrs, sleb(ptr)...)
	instrs = append(instrs, 0x41)
	instrs = append(instrs, sleb(32)...)
	instrs = append(instrs, 0x10, 0x01, 0x10, 0x00) // random_get; proc_exit
	codeSec := section(10, vec([][]byte{code(uleb(0), instrs)}))
	return module(typeSec, impSec, funcSec, memSec, expSec, codeSec)
}

// -------------------------------------------------------------------- main

func main() {
	out := "."
	if len(os.Args) > 1 {
		out = os.Args[1]
	}
	if err := os.MkdirAll(out, 0o755); err != nil {
		panic(err)
	}
	items := []struct {
		file string
		body []byte
	}{
		{"probe.wasm", buildProbe()},
		{"feat_shared.wasm", buildFeature("shared")},
		{"feat_atomic.wasm", buildFeature("atomic")},
		{"feat_tailcall.wasm", buildFeature("tailcall")},
		{"wasi_min.wasm", buildWasiWrite(false)},
		{"wasi_grow.wasm", buildWasiWrite(true)},
		{"wasi_rand_ok.wasm", buildWasiRand(8)},
		{"wasi_rand_oob.wasm", buildWasiRand(1 << 30)},
	}
	for _, it := range items {
		p := out + string(os.PathSeparator) + it.file
		if err := os.WriteFile(p, it.body, 0o644); err != nil {
			panic(err)
		}
		s := sha256.Sum256(it.body)
		fmt.Printf("%-20s %5d bytes  sha256=%s\n", it.file, len(it.body), hex.EncodeToString(s[:]))
	}
}
