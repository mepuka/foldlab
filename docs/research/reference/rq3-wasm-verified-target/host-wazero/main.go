// Command host-wazero runs the RQ-3 probes under wazero and prints a
// transcript designed to be diffed line-for-line against the Bun transcript.
//
// Subcommands:
//
//	identity  <dir>   probe.wasm through both wazero engines
//	features  <dir>   which post-2.0 proposals wazero accepts
//	wasi      <dir>   the WASI preview1 probes through wazero's built-in shim
//	imports   <file>  list the host import surface a module demands
//	conc      <dir>   concurrency patterns A/B/C (see README)
package main

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"os"
	"path/filepath"
	"runtime"
	"sort"
	"strings"
	"sync"

	"github.com/tetratelabs/wazero"
	"github.com/tetratelabs/wazero/api"
	"github.com/tetratelabs/wazero/experimental"
	"github.com/tetratelabs/wazero/imports/wasi_snapshot_preview1"
	"github.com/tetratelabs/wazero/sys"
)

func read(dir, f string) []byte {
	b, err := os.ReadFile(filepath.Join(dir, f))
	if err != nil {
		panic(err)
	}
	return b
}

func main() {
	if len(os.Args) < 3 {
		fmt.Fprintln(os.Stderr, "usage: host-wazero <identity|features|wasi|imports|conc> <dir-or-file>")
		os.Exit(2)
	}
	fmt.Printf("host=wazero goos=%s goarch=%s go=%s\n", runtime.GOOS, runtime.GOARCH, runtime.Version())
	switch os.Args[1] {
	case "identity":
		identity(os.Args[2])
	case "features":
		features(os.Args[2])
	case "wasi":
		wasiProbes(os.Args[2])
	case "imports":
		imports(os.Args[2])
	case "run":
		runOne(os.Args[2])
	case "conc":
		conc(os.Args[2])
	default:
		fmt.Fprintln(os.Stderr, "unknown subcommand", os.Args[1])
		os.Exit(2)
	}
}

// ------------------------------------------------------------------ identity

var f32Cases = []uint32{0x7fc00001, 0x7fa00000, 0xffc00001, 0x7fc00000}
var f64Cases = []uint64{0x7ff8000000000001, 0x7ff4000000000000, 0xfff8000000000001, 0x7ff8000000000000}

func identity(dir string) {
	src := read(dir, "probe.wasm")
	s := sha256.Sum256(src)
	fmt.Printf("artifact=probe.wasm sha256=%s\n", hex.EncodeToString(s[:]))
	ctx := context.Background()
	for _, e := range []struct {
		label string
		cfg   wazero.RuntimeConfig
	}{
		{"compiler", wazero.NewRuntimeConfigCompiler()},
		{"interpreter", wazero.NewRuntimeConfigInterpreter()},
	} {
		r := wazero.NewRuntimeWithConfig(ctx, e.cfg)
		c, err := r.CompileModule(ctx, src)
		if err != nil {
			panic(err)
		}
		var imps []string
		for _, f := range c.ImportedFunctions() {
			m, n, _ := f.Import()
			imps = append(imps, m+"."+n)
		}
		sort.Strings(imps)
		fmt.Printf("engine=%s imports=%v\n", e.label, imps)

		mod, err := r.InstantiateModule(ctx, c, wazero.NewModuleConfig())
		if err != nil {
			panic(err)
		}
		call := func(n string, args ...uint64) uint64 {
			res, err := mod.ExportedFunction(n).Call(ctx, args...)
			if err != nil {
				panic(err)
			}
			if len(res) == 0 {
				return 0
			}
			return res[0]
		}
		for _, b := range f32Cases {
			fmt.Printf("engine=%s nan_f32 in=0x%08x out=0x%08x\n", e.label, b, uint32(call("nan_f32", uint64(b))))
		}
		for _, b := range f64Cases {
			fmt.Printf("engine=%s nan_f64 in=0x%016x out=0x%016x\n", e.label, b, call("nan_f64", b))
		}
		fmt.Printf("engine=%s mem_grow(1)=%d\n", e.label, int32(uint32(call("mem_grow", 1))))
		fmt.Printf("engine=%s mem_grow(1)=%d\n", e.label, int32(uint32(call("mem_grow", 1))))
		fmt.Printf("engine=%s mem_grow(0)=%d\n", e.label, int32(uint32(call("mem_grow", 0))))

		mem := mod.ExportedMemory("mem")
		payload := make([]byte, 256)
		for i := range payload {
			payload[i] = byte(i)
		}
		mem.Write(0, payload)
		fmt.Printf("engine=%s checksum(0,256)=%d\n", e.label, uint32(call("checksum", 0, 256)))
		call("bump", 0, 256)
		after, _ := mem.Read(0, 256)
		d := sha256.Sum256(after)
		fmt.Printf("engine=%s bump_sha256=%s\n", e.label, hex.EncodeToString(d[:]))
		r.Close(ctx)
	}
}

// ------------------------------------------------------------------ features

func features(dir string) {
	ctx := context.Background()
	cfgs := []struct {
		label string
		f     api.CoreFeatures
	}{
		{"default(V2)", api.CoreFeaturesV2},
		{"+threads", api.CoreFeaturesV2 | experimental.CoreFeaturesThreads},
		{"+threads+tailcall+eh", api.CoreFeaturesV2 | experimental.CoreFeaturesThreads |
			experimental.CoreFeaturesTailCall | experimental.CoreFeaturesExceptionHandling},
	}
	for _, f := range []struct {
		file string
		run  bool
	}{
		{"feat_shared.wasm", true},
		{"feat_atomic.wasm", true},
		{"feat_tailcall.wasm", false}, // running it would tail-loop forever
	} {
		src := read(dir, f.file)
		for _, c := range cfgs {
			label := fmt.Sprintf("%s %s", f.file, c.label)
			r := wazero.NewRuntimeWithConfig(ctx, wazero.NewRuntimeConfig().WithCoreFeatures(c.f))
			if _, err := r.CompileModule(ctx, src); err != nil {
				fmt.Printf("%-42s COMPILE ERROR: %v\n", label, err)
				r.Close(ctx)
				continue
			}
			if !f.run {
				fmt.Printf("%-42s compile OK (not run)\n", label)
				r.Close(ctx)
				continue
			}
			mod, err := r.Instantiate(ctx, src)
			if err != nil {
				fmt.Printf("%-42s INSTANTIATE ERROR: %v\n", label, err)
				r.Close(ctx)
				continue
			}
			res, err := mod.ExportedFunction("probe").Call(ctx)
			if err != nil {
				fmt.Printf("%-42s CALL ERROR: %v\n", label, err)
			} else {
				fmt.Printf("%-42s OK probe=%d\n", label, res[0])
			}
			r.Close(ctx)
		}
		fmt.Println()
	}
}

// ---------------------------------------------------------------------- wasi

func wasiProbes(dir string) {
	for _, f := range []string{"wasi_min.wasm", "wasi_grow.wasm", "wasi_rand_ok.wasm", "wasi_rand_oob.wasm"} {
		src := read(dir, f)
		ctx := context.Background()
		r := wazero.NewRuntime(ctx)
		if _, err := wasi_snapshot_preview1.Instantiate(ctx, r); err != nil {
			panic(err)
		}
		_, err := r.InstantiateWithConfig(ctx, src,
			wazero.NewModuleConfig().WithStdout(os.Stdout).WithStderr(os.Stderr))
		switch e := err.(type) {
		case nil:
			fmt.Printf("%-20s ran to completion, exit=0\n", f)
		case *sys.ExitError:
			fmt.Printf("%-20s proc_exit code=%d\n", f, e.ExitCode())
		default:
			fmt.Printf("%-20s ERROR %v\n", f, err)
		}
		r.Close(ctx)
	}
}

// runOne runs a single WASI preview1 module by path through wazero's
// built-in shim, reporting the proc_exit code if there is one.
func runOne(file string) {
	src, err := os.ReadFile(file)
	if err != nil {
		panic(err)
	}
	s := sha256.Sum256(src)
	fmt.Printf("file=%s bytes=%d sha256=%s\n", filepath.Base(file), len(src), hex.EncodeToString(s[:]))
	ctx := context.Background()
	r := wazero.NewRuntime(ctx)
	defer r.Close(ctx)
	if _, err := wasi_snapshot_preview1.Instantiate(ctx, r); err != nil {
		panic(err)
	}
	_, err = r.InstantiateWithConfig(ctx, src,
		wazero.NewModuleConfig().WithStdout(os.Stdout).WithStderr(os.Stderr))
	switch e := err.(type) {
	case nil:
		fmt.Println("wazero: ran to completion, exit=0")
	case *sys.ExitError:
		fmt.Printf("wazero: proc_exit code=%d\n", e.ExitCode())
	default:
		fmt.Printf("wazero: ERROR %v\n", err)
	}
}

// ------------------------------------------------------------------- imports

func imports(file string) {
	src, err := os.ReadFile(file)
	if err != nil {
		panic(err)
	}
	ctx := context.Background()
	r := wazero.NewRuntime(ctx)
	defer r.Close(ctx)
	c, err := r.CompileModule(ctx, src)
	if err != nil {
		panic(err)
	}
	set := map[string]bool{}
	for _, f := range c.ImportedFunctions() {
		m, n, _ := f.Import()
		set[m+"."+n] = true
	}
	var names []string
	for k := range set {
		names = append(names, k)
	}
	sort.Strings(names)
	s := sha256.Sum256(src)
	fmt.Printf("file=%s bytes=%d sha256=%s imported_functions=%d\n",
		filepath.Base(file), len(src), hex.EncodeToString(s[:]), len(names))
	for _, n := range names {
		fmt.Println("  " + n)
	}
}

// ---------------------------------------------------------------- concurrency

const (
	goroutines = 8
	regionSize = 4096
	regionLen  = 256
	iterations = 200
)

func pattern(g, it int) []byte {
	b := make([]byte, regionLen)
	for k := range b {
		b[k] = byte((k + g*7 + it) & 0xff)
	}
	return b
}

func expectedSum(b []byte) uint32 {
	var s uint32
	for _, x := range b {
		s += uint32(x)
	}
	return s
}

// conc runs one of three call patterns. Pattern A is expected to be unsafe:
// wazero's api.Function documents "Call is not goroutine-safe". Passing
// "A" is what produces the crash transcript in transcripts/.
func conc(dir string) {
	sel := strings.ToUpper(os.Getenv("RQ3_CONC"))
	if sel == "" {
		sel = "BC" // A crashes the process; opt in explicitly
	}
	src := read(dir, "probe.wasm")
	ctx := context.Background()
	r := wazero.NewRuntime(ctx)
	defer r.Close(ctx)
	compiled, err := r.CompileModule(ctx, src)
	if err != nil {
		panic(err)
	}
	newInst := func(n string) api.Module {
		m, err := r.InstantiateModule(ctx, compiled, wazero.NewModuleConfig().WithName(n))
		if err != nil {
			panic(err)
		}
		return m
	}
	run := func(label string, get func(int) (api.Function, api.Memory), base func(int) uint32) {
		var mismatch, errs int64
		var mu sync.Mutex
		var wg sync.WaitGroup
		for g := 0; g < goroutines; g++ {
			wg.Add(1)
			go func(g int) {
				defer wg.Done()
				fn, mem := get(g)
				off := base(g)
				for it := 0; it < iterations; it++ {
					p := pattern(g, it)
					if !mem.Write(off, p) {
						mu.Lock()
						errs++
						mu.Unlock()
						return
					}
					res, err := fn.Call(ctx, uint64(off), uint64(regionLen))
					if err != nil {
						mu.Lock()
						errs++
						mu.Unlock()
						return
					}
					if uint32(res[0]) != expectedSum(p) {
						mu.Lock()
						mismatch++
						mu.Unlock()
					}
				}
			}(g)
		}
		wg.Wait()
		fmt.Printf("%-44s mismatches=%d errors=%d\n", label, mismatch, errs)
	}

	if strings.Contains(sel, "A") {
		in := newInst("A")
		fn := in.ExportedFunction("checksum")
		mem := in.ExportedMemory("mem")
		run("A shared instance + shared Function",
			func(int) (api.Function, api.Memory) { return fn, mem },
			func(g int) uint32 { return uint32(g * regionSize) })
	}
	if strings.Contains(sel, "B") {
		in := newInst("B")
		mem := in.ExportedMemory("mem")
		run("B shared instance + per-goroutine Function",
			func(int) (api.Function, api.Memory) { return in.ExportedFunction("checksum"), mem },
			func(g int) uint32 { return uint32(g * regionSize) })
	}
	if strings.Contains(sel, "C") {
		insts := make([]api.Module, goroutines)
		for g := range insts {
			insts[g] = newInst(fmt.Sprintf("C%d", g))
		}
		run("C instance per goroutine",
			func(g int) (api.Function, api.Memory) {
				return insts[g].ExportedFunction("checksum"), insts[g].ExportedMemory("mem")
			},
			func(int) uint32 { return 0 })
	}
}
